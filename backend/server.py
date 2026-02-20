from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, logging, hashlib, hmac, requests as http_requests
import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'hikmabyLM_secret')
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ─── Cloudflare R2 Config ────────────────────────────────────────────────────
R2_ACCOUNT_ID     = os.environ.get('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID  = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET_KEY     = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET         = os.environ.get('R2_BUCKET_NAME', 'hikma-audio')
R2_ENDPOINT_URL   = os.environ.get('R2_ENDPOINT_URL', f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com')

r2_client = None
if R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_KEY:
    try:
        r2_client = boto3.client(
            's3',
            endpoint_url=R2_ENDPOINT_URL,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_KEY,
            config=BotoConfig(
                signature_version='s3v4',
                retries={'max_attempts': 3, 'mode': 'standard'}
            ),
            region_name='auto',
        )
        logger_init = logging.getLogger(__name__)
        logger_init.info(f"R2 client initialized for bucket '{R2_BUCKET}'")
    except Exception as e:
        r2_client = None
        logging.getLogger(__name__).error(f"R2 init failed: {e}")

PRESIGNED_URL_EXPIRY = 3600  # 1 hour

def get_presigned_stream_url(file_key: str) -> Optional[str]:
    """Generate a presigned URL for streaming an audio file from R2."""
    if not r2_client or not file_key:
        return None
    try:
        url = r2_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': R2_BUCKET, 'Key': file_key},
            ExpiresIn=PRESIGNED_URL_EXPIRY,
        )
        return url
    except ClientError as e:
        logging.getLogger(__name__).error(f"Presigned URL error for '{file_key}': {e}")
        return None

def get_presigned_upload_url(file_key: str, content_type: str = 'audio/mpeg') -> Optional[str]:
    """Generate a presigned URL for uploading an audio file to R2."""
    if not r2_client or not file_key:
        return None
    try:
        url = r2_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': R2_BUCKET, 'Key': file_key, 'ContentType': content_type},
            ExpiresIn=3600,
        )
        return url
    except ClientError as e:
        logging.getLogger(__name__).error(f"Upload URL error for '{file_key}': {e}")
        return None

def resolve_audio_url(audio_doc: dict) -> str:
    """Return a streaming URL: R2 presigned if file_key exists, else fallback audio_url."""
    file_key = audio_doc.get('file_key')
    if file_key:
        presigned = get_presigned_stream_url(file_key)
        if presigned:
            return presigned
    return audio_doc.get('audio_url', '')

app = FastAPI(title="HikmabyLM API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Simple JWT (HS256 via hmac) ───────────────────────────────────────────

import base64, json as _json

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def create_jwt(payload: dict) -> str:
    header = _b64url(_json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body   = _b64url(_json.dumps(payload).encode())
    sig    = _b64url(hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"

def verify_jwt(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, body, sig = parts
        expected_sig = _b64url(hmac.new(JWT_SECRET.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected_sig):
            return None
        pad = len(body) % 4
        if pad:
            body += '=' * (4 - pad)
        payload = _json.loads(base64.urlsafe_b64decode(body))
        if payload.get('exp') and datetime.fromtimestamp(payload['exp'], tz=timezone.utc) < datetime.now(timezone.utc):
            return None
        return payload
    except Exception:
        return None

async def get_current_user(request: Request) -> Optional[dict]:
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    if not token:
        token = request.cookies.get('session_token', '')
    if not token:
        return None
    payload = verify_jwt(token)
    if not payload:
        return None
    user = await db.users.find_one({'user_id': payload.get('user_id')}, {'_id': 0})
    return user

def hash_password(pw: str) -> str:
    return hashlib.sha256((pw + JWT_SECRET).encode()).hexdigest()

# ─── Pydantic Models ────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleSessionRequest(BaseModel):
    session_id: str

class ProgressRequest(BaseModel):
    content_id: str
    content_type: str
    progress: float  # 0.0 to 1.0
    position: Optional[float] = 0

class FavoriteRequest(BaseModel):
    content_id: str
    content_type: str  # course | audio | article | film | book

class LiveRegisterRequest(BaseModel):
    session_id: str

# ─── Auth Routes ────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(body: RegisterRequest):
    existing = await db.users.find_one({'email': body.email})
    if existing:
        raise HTTPException(400, "Email déjà utilisé")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    user_doc = {
        'user_id': user_id,
        'email': body.email,
        'name': body.name,
        'password_hash': hash_password(body.password),
        'picture': f"https://ui-avatars.com/api/?name={body.name.replace(' ','+')}&background=04D182&color=000&bold=true",
        'provider': 'email',
        'created_at': now,
        'progress': {},
        'favorites': []
    }
    await db.users.insert_one(user_doc)
    token = create_jwt({'user_id': user_id, 'exp': int((now + timedelta(days=7)).timestamp())})
    return {'token': token, 'user': {k: v for k, v in user_doc.items() if k not in ('_id', 'password_hash')}}

@api_router.post("/auth/login")
async def login(body: LoginRequest):
    user = await db.users.find_one({'email': body.email}, {'_id': 0})
    if not user or user.get('password_hash') != hash_password(body.password):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    now = datetime.now(timezone.utc)
    token = create_jwt({'user_id': user['user_id'], 'exp': int((now + timedelta(days=7)).timestamp())})
    user.pop('password_hash', None)
    return {'token': token, 'user': user}

@api_router.post("/auth/google/exchange")
async def google_exchange(body: GoogleSessionRequest):
    try:
        resp = http_requests.get(EMERGENT_AUTH_URL, headers={'X-Session-ID': body.session_id}, timeout=10)
        if resp.status_code != 200:
            raise HTTPException(401, "Session Google invalide")
        data = resp.json()
    except Exception as e:
        raise HTTPException(500, f"Erreur d'authentification Google: {str(e)}")

    email = data.get('email')
    name  = data.get('name', email)
    picture = data.get('picture', '')
    now = datetime.now(timezone.utc)

    existing = await db.users.find_one({'email': email}, {'_id': 0})
    if existing:
        user_id = existing['user_id']
        await db.users.update_one({'user_id': user_id}, {'$set': {'name': name, 'picture': picture}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            'user_id': user_id, 'email': email, 'name': name, 'picture': picture,
            'provider': 'google', 'created_at': now, 'password_hash': None
        })

    token = create_jwt({'user_id': user_id, 'exp': int((now + timedelta(days=7)).timestamp())})
    user = await db.users.find_one({'user_id': user_id}, {'_id': 0, 'password_hash': 0})
    return {'token': token, 'user': user}

@api_router.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Non authentifié")
    user.pop('password_hash', None)
    return user

@api_router.post("/auth/logout")
async def logout():
    return {'message': 'Déconnexion réussie'}

# ─── Scholar Routes ─────────────────────────────────────────────────────────

@api_router.get("/scholars")
async def get_scholars():
    scholars = await db.scholars.find({}, {'_id': 0}).to_list(100)
    return scholars

@api_router.get("/scholars/{scholar_id}")
async def get_scholar(scholar_id: str):
    s = await db.scholars.find_one({'id': scholar_id}, {'_id': 0})
    if not s:
        raise HTTPException(404, "Érudit non trouvé")
    return s

# ─── Course Routes ──────────────────────────────────────────────────────────

@api_router.get("/courses")
async def get_courses(topic: Optional[str] = None, level: Optional[str] = None, scholar_id: Optional[str] = None):
    query: dict = {}
    if topic:
        query['topic'] = topic
    if level:
        query['level'] = level
    if scholar_id:
        query['scholar_id'] = scholar_id
    courses = await db.courses.find(query, {'_id': 0}).to_list(100)
    return courses

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str):
    c = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not c:
        raise HTTPException(404, "Cours non trouvé")
    return c

# ─── Audio Routes ───────────────────────────────────────────────────────────

@api_router.get("/audios")
async def get_audios(topic: Optional[str] = None, audio_type: Optional[str] = None, scholar_id: Optional[str] = None):
    query: dict = {}
    if topic:
        query['topic'] = topic
    if audio_type:
        query['type'] = audio_type
    if scholar_id:
        query['scholar_id'] = scholar_id
    audios = await db.audios.find(query, {'_id': 0}).to_list(100)
    # Attach resolved stream URL to each audio
    for a in audios:
        a['stream_url'] = resolve_audio_url(a)
    return audios

@api_router.get("/audios/{audio_id}")
async def get_audio(audio_id: str):
    a = await db.audios.find_one({'id': audio_id}, {'_id': 0})
    if not a:
        raise HTTPException(404, "Audio non trouvé")
    a['stream_url'] = resolve_audio_url(a)
    return a

@api_router.get("/audios/{audio_id}/stream-url")
async def get_audio_stream_url(audio_id: str):
    """Get a fresh presigned streaming URL for an audio file from R2."""
    a = await db.audios.find_one({'id': audio_id}, {'_id': 0})
    if not a:
        raise HTTPException(404, "Audio non trouvé")
    stream_url = resolve_audio_url(a)
    file_key = a.get('file_key')
    return {
        'audio_id': audio_id,
        'stream_url': stream_url,
        'file_key': file_key,
        'source': 'r2' if (r2_client and file_key) else 'fallback',
        'expires_in': PRESIGNED_URL_EXPIRY if (r2_client and file_key) else None,
    }

class UploadUrlRequest(BaseModel):
    file_key: str
    content_type: str = 'audio/mpeg'

@api_router.post("/r2/upload-url")
async def get_upload_url(body: UploadUrlRequest, request: Request):
    """Get a presigned upload URL for putting a new audio file into R2."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    upload_url = get_presigned_upload_url(body.file_key, body.content_type)
    if not upload_url:
        raise HTTPException(500, "Impossible de générer l'URL d'upload")
    return {
        'upload_url': upload_url,
        'file_key': body.file_key,
        'bucket': R2_BUCKET,
        'expires_in': 3600,
    }

@api_router.get("/r2/files")
async def list_r2_files(prefix: Optional[str] = None):
    """List files in the R2 bucket (optionally filtered by prefix)."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    try:
        kwargs: dict = {'Bucket': R2_BUCKET, 'MaxKeys': 200}
        if prefix:
            kwargs['Prefix'] = prefix
        response = r2_client.list_objects_v2(**kwargs)
        files = [
            {
                'key': obj['Key'],
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat(),
                'stream_url': get_presigned_stream_url(obj['Key']),
            }
            for obj in response.get('Contents', [])
        ]
        return {'files': files, 'count': len(files), 'bucket': R2_BUCKET}
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.put("/audios/{audio_id}/file-key")
async def update_audio_file_key(audio_id: str, request: Request):
    """Update the R2 file_key for an audio document."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    body = await request.json()
    file_key = body.get('file_key')
    if not file_key:
        raise HTTPException(400, "file_key requis")
    result = await db.audios.update_one({'id': audio_id}, {'$set': {'file_key': file_key}})
    if result.matched_count == 0:
        raise HTTPException(404, "Audio non trouvé")
    return {'message': 'file_key mis à jour', 'audio_id': audio_id, 'file_key': file_key}

# ─── Article Routes ─────────────────────────────────────────────────────────

@api_router.get("/articles")
async def get_articles(topic: Optional[str] = None):
    query = {'topic': topic} if topic else {}
    articles = await db.articles.find(query, {'_id': 0}).to_list(100)
    return articles

@api_router.get("/articles/{article_id}")
async def get_article(article_id: str):
    a = await db.articles.find_one({'id': article_id}, {'_id': 0})
    if not a:
        raise HTTPException(404, "Article non trouvé")
    return a

# ─── Live Session Routes ─────────────────────────────────────────────────────

@api_router.get("/live-sessions")
async def get_live_sessions():
    sessions = await db.live_sessions.find({}, {'_id': 0}).sort('date', 1).to_list(100)
    return sessions

@api_router.get("/live-sessions/{session_id}")
async def get_live_session(session_id: str):
    s = await db.live_sessions.find_one({'id': session_id}, {'_id': 0})
    if not s:
        raise HTTPException(404, "Session non trouvée")
    return s

@api_router.post("/live-sessions/{session_id}/register")
async def register_live_session(session_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    session = await db.live_sessions.find_one({'id': session_id})
    if not session:
        raise HTTPException(404, "Session non trouvée")
    await db.live_sessions.update_one(
        {'id': session_id},
        {'$addToSet': {'registered_users': user['user_id']}, '$inc': {'registered_count': 1}}
    )
    await db.users.update_one({'user_id': user['user_id']}, {'$addToSet': {'registered_sessions': session_id}})
    return {'message': 'Inscription confirmée'}

@api_router.delete("/live-sessions/{session_id}/register")
async def unregister_live_session(session_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    await db.live_sessions.update_one(
        {'id': session_id},
        {'$pull': {'registered_users': user['user_id']}, '$inc': {'registered_count': -1}}
    )
    await db.users.update_one({'user_id': user['user_id']}, {'$pull': {'registered_sessions': session_id}})
    return {'message': 'Désinscription effectuée'}

# ─── Home Route ──────────────────────────────────────────────────────────────

@api_router.get("/home")
async def get_home(request: Request):
    user = await get_current_user(request)
    user_id = user['user_id'] if user else None

    # Hero: last progress item
    hero = None
    if user_id:
        progress_item = await db.user_progress.find_one(
            {'user_id': user_id}, sort=[('updated_at', -1)], projection={'_id': 0}
        )
        if progress_item:
            ctype = progress_item.get('content_type', 'audio')
            coll = db.audios if ctype == 'audio' else db.courses
            content = await coll.find_one({'id': progress_item['content_id']}, {'_id': 0})
            if content:
                hero = {'content': content, 'progress': progress_item.get('progress', 0), 'content_type': ctype}

    if not hero:
        latest_audio = await db.audios.find_one({}, {'_id': 0}, sort=[('published_at', -1)])
        if latest_audio:
            hero = {'content': latest_audio, 'progress': 0.0, 'content_type': 'audio'}

    # Recommendations
    recommendations = await db.courses.find({}, {'_id': 0}).limit(4).to_list(4)
    rec_audios = await db.audios.find({'type': 'podcast'}, {'_id': 0}).limit(3).to_list(3)
    recommendations = recommendations + rec_audios

    # Featured scholar
    featured_scholar = await db.scholars.find_one({}, {'_id': 0})

    # Daily pick
    daily_pick = await db.audios.find_one({'type': 'quran'}, {'_id': 0})
    if not daily_pick:
        daily_pick = await db.audios.find_one({}, {'_id': 0})

    # Recent publications
    recent_articles = await db.articles.find({}, {'_id': 0}).limit(3).to_list(3)

    return {
        'hero': hero,
        'recommendations': recommendations,
        'featured_scholar': featured_scholar,
        'daily_pick': daily_pick,
        'recent_publications': recent_articles
    }

# ─── User Progress Routes ────────────────────────────────────────────────────

@api_router.get("/user/progress")
async def get_user_progress(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    items = await db.user_progress.find({'user_id': user['user_id']}, {'_id': 0}).to_list(500)
    return items

@api_router.post("/user/progress")
async def update_progress(body: ProgressRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    now = datetime.now(timezone.utc)
    await db.user_progress.update_one(
        {'user_id': user['user_id'], 'content_id': body.content_id},
        {'$set': {
            'user_id': user['user_id'],
            'content_id': body.content_id,
            'content_type': body.content_type,
            'progress': body.progress,
            'position': body.position,
            'updated_at': now,
            'completed': body.progress >= 0.95
        }},
        upsert=True
    )
    return {'message': 'Progression mise à jour'}

# ─── User Favorites Routes ───────────────────────────────────────────────────

@api_router.get("/user/favorites")
async def get_favorites(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    favs = await db.user_favorites.find({'user_id': user['user_id']}, {'_id': 0}).to_list(500)
    result = []
    for fav in favs:
        ctype = fav.get('content_type', 'audio')
        coll_map = {'course': db.courses, 'audio': db.audios, 'article': db.articles}
        coll = coll_map.get(ctype, db.audios)
        content = await coll.find_one({'id': fav['content_id']}, {'_id': 0})
        if content:
            result.append({'favorite': fav, 'content': content})
    return result

@api_router.post("/user/favorites")
async def add_favorite(body: FavoriteRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    existing = await db.user_favorites.find_one({'user_id': user['user_id'], 'content_id': body.content_id})
    if existing:
        return {'message': 'Déjà sauvegardé'}
    await db.user_favorites.insert_one({
        'user_id': user['user_id'],
        'content_id': body.content_id,
        'content_type': body.content_type,
        'saved_at': datetime.now(timezone.utc)
    })
    return {'message': 'Sauvegardé dans votre bibliothèque'}

@api_router.delete("/user/favorites/{content_type}/{content_id}")
async def remove_favorite(content_type: str, content_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    await db.user_favorites.delete_one({'user_id': user['user_id'], 'content_id': content_id})
    return {'message': 'Retiré de votre bibliothèque'}

# ─── Recommendations ─────────────────────────────────────────────────────────

@api_router.get("/recommendations")
async def get_recommendations():
    courses = await db.courses.find({}, {'_id': 0}).limit(6).to_list(6)
    audios = await db.audios.find({}, {'_id': 0}).limit(6).to_list(6)
    return {'courses': courses, 'audios': audios}

# ─── Seed Data ────────────────────────────────────────────────────────────────

THUMBNAILS = [
    "https://images.unsplash.com/photo-1648443524209-d65b2930a743?w=600&q=80",
    "https://images.unsplash.com/photo-1739477274868-86a943b6cd5b?w=600&q=80",
    "https://images.unsplash.com/photo-1739478469935-65b0ac94355c?w=600&q=80",
    "https://images.unsplash.com/photo-1648410794337-b4394bda870f?w=600&q=80",
    "https://images.pexels.com/photos/19893407/pexels-photo-19893407.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/28428586/pexels-photo-28428586.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80",
    "https://images.unsplash.com/photo-1580094423654-d5ec2e4a2454?w=600&q=80",
]

SCHOLAR_PHOTOS = [
    "https://images.unsplash.com/photo-1628070435838-19eb835ad70d?w=400&q=80",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
]

AUDIO_URLS = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
]

async def seed_data():
    now = datetime.now(timezone.utc)

    # Scholars
    if await db.scholars.count_documents({}) == 0:
        scholars = [
            {"id": "sch-001", "name": "Prof. Mohammed Al-Fassi", "university": "Université Paris I Panthéon-Sorbonne", "bio": "Spécialiste du droit islamique classique et contemporain, le Prof. Al-Fassi est l'auteur de nombreux ouvrages de référence sur le fiqh et ses applications modernes. Titulaire d'une chaire à la Sorbonne depuis 2008.", "photo": SCHOLAR_PHOTOS[0], "specializations": ["Fiqh", "Jurisprudence islamique", "Droit comparé"], "content_count": 12},
            {"id": "sch-002", "name": "Dr. Leïla Bencherif", "university": "EHESS Paris", "bio": "Directrice de recherche à l'EHESS, le Dr. Bencherif explore la philosophie islamique médiévale et ses résonances contemporaines. Ses travaux sur Ibn Rushd et al-Ghazali font autorité dans le monde académique francophone.", "photo": SCHOLAR_PHOTOS[1], "specializations": ["Philosophie islamique", "Métaphysique", "Kalam"], "content_count": 18},
            {"id": "sch-003", "name": "Prof. Youssef El-Haddad", "university": "Université Lumière Lyon II", "bio": "Historien spécialisé dans la civilisation islamique médiévale et les échanges culturels entre l'Islam et l'Europe. Ses recherches sur al-Andalus ont transformé notre compréhension de l'histoire méditerranéenne.", "photo": SCHOLAR_PHOTOS[2], "specializations": ["Histoire de l'Islam", "Al-Andalus", "Civilisation médiévale"], "content_count": 9},
            {"id": "sch-004", "name": "Dr. Nadia Merah", "university": "Sciences Po Paris", "bio": "Sociologue et islamologue, le Dr. Merah étudie les dimensions spirituelles de l'Islam soufie ainsi que leurs expressions contemporaines en Europe. Chercheuse associée au CERI depuis 2015.", "photo": SCHOLAR_PHOTOS[3], "specializations": ["Soufisme", "Spiritualité islamique", "Islam en Europe"], "content_count": 14},
            {"id": "sch-005", "name": "Prof. Ali Benmakhlouf", "university": "Université Paris-Est Créteil", "bio": "Philosophe et logicien, le Prof. Benmakhlouf est l'un des grands spécialistes français de la logique arabe et de la pensée d'Ibn Khaldoun. Membre de l'Institut de France et auteur d'une vingtaine d'ouvrages.", "photo": SCHOLAR_PHOTOS[4], "specializations": ["Logique arabe", "Philosophie analytique", "Ibn Khaldoun"], "content_count": 11},
        ]
        await db.scholars.insert_many(scholars)
        logger.info("Scholars seeded")

    # Courses
    if await db.courses.count_documents({}) == 0:
        courses = [
            {"id": "crs-001", "title": "Introduction à la philosophie d'Averroès (Ibn Rushd)", "description": "Ce cours fondamental explore la pensée du plus grand philosophe andalou, sa lecture d'Aristote et son influence decisive sur la philosophie européenne médiévale. Une plongée dans l'une des œuvres les plus importantes de la pensée humaine.", "topic": "Philosophie islamique", "level": "Débutant", "language": "Français", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "duration": 480, "thumbnail": THUMBNAILS[0], "modules_count": 8, "tags": ["Averroès", "Philosophie", "Andalousie", "Aristote"], "type": "course", "published_at": now.isoformat()},
            {"id": "crs-002", "title": "Le Soufisme : des origines aux temps modernes", "description": "Une exploration académique du soufisme, de ses origines au VIIIe siècle jusqu'à ses expressions contemporaines. Le cours aborde les grands maîtres spirituels comme Rumi, Ibn Arabi et al-Hallaj, ainsi que les confréries et leur rôle social.", "topic": "Tasawwuf", "level": "Intermédiaire", "language": "Français", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "duration": 720, "thumbnail": THUMBNAILS[1], "modules_count": 12, "tags": ["Soufisme", "Rumi", "Ibn Arabi", "Spiritualité"], "type": "course", "published_at": now.isoformat()},
            {"id": "crs-003", "title": "Fiqh contemporain : droit islamique et modernité", "description": "Ce cours avancé examine les défis posés au droit islamique classique par la modernité. Bioéthique, finance islamique, droit de la famille : le Prof. Al-Fassi analyse les grandes questions juridiques contemporaines avec une rigueur scientifique exemplaire.", "topic": "Fiqh", "level": "Avancé", "language": "Français", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "duration": 900, "thumbnail": THUMBNAILS[2], "modules_count": 15, "tags": ["Fiqh", "Droit", "Modernité", "Bioéthique"], "type": "course", "published_at": now.isoformat()},
            {"id": "crs-004", "title": "L'Islam en al-Andalus : 8 siècles de civilisation", "description": "De la conquête de 711 à la chute de Grenade en 1492, ce cours retrace l'histoire fascinante de la présence islamique en Espagne. Art, science, philosophie et convivencia : une civilisation d'une richesse exceptionnelle.", "topic": "Histoire de l'Islam", "level": "Débutant", "language": "Français", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "duration": 600, "thumbnail": THUMBNAILS[3], "modules_count": 10, "tags": ["Al-Andalus", "Histoire", "Civilisation", "Espagne"], "type": "course", "published_at": now.isoformat()},
            {"id": "crs-005", "title": "Al-Ghazali et la renaissance spirituelle en Islam", "description": "Étude approfondie de l'œuvre d'al-Ghazali, le Hujjat al-Islam. Son Ihya Ulum al-Din reste l'une des synthèses les plus accomplies entre philosophie, théologie et spiritualité dans l'histoire de la pensée islamique.", "topic": "Tasawwuf", "level": "Intermédiaire", "language": "Français", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "duration": 540, "thumbnail": THUMBNAILS[4], "modules_count": 9, "tags": ["Al-Ghazali", "Philosophie", "Théologie", "Spiritualité"], "type": "course", "published_at": now.isoformat()},
            {"id": "crs-006", "title": "Ibn Khaldoun : pionnier des sciences sociales", "description": "La Muqaddima d'Ibn Khaldoun est un monument de la pensée humaine. Ce cours analyse en profondeur ses théories sur l'histoire, la sociologie, l'économie et la politique, des idées qui anticipent de plusieurs siècles les sciences sociales modernes.", "topic": "Philosophie islamique", "level": "Intermédiaire", "language": "Français", "scholar_id": "sch-005", "scholar_name": "Prof. Ali Benmakhlouf", "duration": 660, "thumbnail": THUMBNAILS[5], "modules_count": 11, "tags": ["Ibn Khaldoun", "Sociologie", "Histoire", "Sciences sociales"], "type": "course", "published_at": now.isoformat()},
            {"id": "crs-007", "title": "Sciences coraniques : introduction à l'exégèse (Tafsir)", "description": "Introduction rigoureuse aux sciences coraniques : histoire de la compilation du Coran, méthodes d'exégèse classiques et contemporaines, herméneutique coranique. Un cours indispensable pour comprendre la tradition exégétique islamique.", "topic": "Sciences coraniques", "level": "Débutant", "language": "Français", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "duration": 420, "thumbnail": THUMBNAILS[6], "modules_count": 7, "tags": ["Coran", "Tafsir", "Exégèse", "Sciences islamiques"], "type": "course", "published_at": now.isoformat()},
            {"id": "crs-008", "title": "La théologie spéculative islamique (Kalam)", "description": "Le Kalam est la discipline théologique par excellence de l'Islam. Ce cours avancé explore les grandes écoles théologiques — Mu'tazila, Ash'ariyya, Maturidiyya — leurs méthodes et leurs débats fondateurs sur la nature de Dieu et de l'univers.", "topic": "Kalam", "level": "Avancé", "language": "Français", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "duration": 780, "thumbnail": THUMBNAILS[7], "modules_count": 13, "tags": ["Kalam", "Théologie", "Mu'tazila", "Ash'ariyya"], "type": "course", "published_at": now.isoformat()},
        ]
        await db.courses.insert_many(courses)
        logger.info("Courses seeded")

    # Audios
    if await db.audios.count_documents({}) == 0:
        audios = [
            {"id": "aud-001", "title": "La notion de Hikma dans la pensée islamique classique", "description": "Le concept de Hikma (sagesse) est au cœur de la tradition intellectuelle islamique. Cette conférence explore ses dimensions philosophiques, théologiques et spirituelles, de Platon à Ibn Rushd en passant par al-Farabi.", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "duration": 3420, "audio_url": AUDIO_URLS[0], "thumbnail": THUMBNAILS[0], "topic": "Philosophie islamique", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-002", "title": "Ibn Khaldoun et la sociologie avant la lettre", "description": "Le Prof. Benmakhlouf analyse les grandes intuitions sociologiques d'Ibn Khaldoun : la théorie de l'asabiyya, les cycles historiques, l'analyse économique. Un génie méconnu qui mérite d'être redécouvert.", "scholar_id": "sch-005", "scholar_name": "Prof. Ali Benmakhlouf", "duration": 2880, "audio_url": AUDIO_URLS[1], "thumbnail": THUMBNAILS[1], "topic": "Philosophie islamique", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-003", "title": "Al-Ghazali et le renouveau de la conscience spirituelle", "description": "Cette conférence magistrale explore comment al-Ghazali a réformé la spiritualité islamique en synthétisant philosophie grecque, théologie islamique et mystique soufie dans une vision cohérente et profonde.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "duration": 3960, "audio_url": AUDIO_URLS[2], "thumbnail": THUMBNAILS[2], "topic": "Tasawwuf", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-004", "title": "Averroès et la transmission du savoir aristotélicien", "description": "Comment Averroès (Ibn Rushd) a-t-il sauvé et transmis la philosophie aristotélicienne à l'Europe médiévale ? Cette conférence retrace ce voyage intellectuel fascinant de Cordoue aux universités de Paris et d'Oxford.", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "duration": 2700, "audio_url": AUDIO_URLS[3], "thumbnail": THUMBNAILS[3], "topic": "Philosophie islamique", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-005", "title": "L'éthique dans le Coran : une lecture philosophique", "description": "Le Prof. Al-Fassi propose une lecture philosophique des dimensions éthiques du Coran : la justice, la dignité humaine, la responsabilité morale. Une approche rigoureuse qui dialogue avec les grandes traditions éthiques occidentales.", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "duration": 3180, "audio_url": AUDIO_URLS[4], "thumbnail": THUMBNAILS[4], "topic": "Fiqh", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-006", "title": "Récitation de Sourate Al-Baqara — Sheikh Abdul Rahman Al-Sudais", "description": "La Sourate Al-Baqara, deuxième et plus longue sourate du Coran, dans une récitation émouvante du Sheikh Abdul Rahman Al-Sudais, Imam de la Grande Mosquée de La Mecque. Translittération et traduction française disponibles.", "scholar_id": "sch-001", "scholar_name": "Sheikh Abdul Rahman Al-Sudais", "duration": 5400, "audio_url": AUDIO_URLS[5], "thumbnail": THUMBNAILS[5], "topic": "Sciences coraniques", "type": "quran", "published_at": now.isoformat()},
            {"id": "aud-007", "title": "Le dialogue interreligieux dans la tradition islamique", "description": "Contrairement aux idées reçues, la tradition islamique a une riche histoire de dialogue avec les autres traditions abrahamiques. Cette conférence explore cette histoire trop méconnue, des penseurs médiévaux aux expériences contemporaines.", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "duration": 2520, "audio_url": AUDIO_URLS[0], "thumbnail": THUMBNAILS[6], "topic": "Histoire de l'Islam", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-008", "title": "Rumi et la poésie mystique : entre Orient et Occident", "description": "Jalal ad-Din Rumi est aujourd'hui l'un des poètes les plus lus dans le monde. Le Dr. Merah analyse la profondeur mystique de ses œuvres, du Masnavi au Divan de Shams, et leur résonance universelle.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "duration": 3300, "audio_url": AUDIO_URLS[1], "thumbnail": THUMBNAILS[7], "topic": "Tasawwuf", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-009", "title": "Récitation des 30 Juz — Sheikh Mishary Rashid Al-Afasy", "description": "Récitation complète du Coran par le Sheikh Mishary Rashid Al-Afasy, l'une des voix les plus appréciées dans le monde islamique. Une expérience sonore d'une beauté saisissante, accompagnée de notes de contexte académiques.", "scholar_id": "sch-001", "scholar_name": "Sheikh Mishary Rashid Al-Afasy", "duration": 7200, "audio_url": AUDIO_URLS[2], "thumbnail": THUMBNAILS[0], "topic": "Sciences coraniques", "type": "quran", "published_at": now.isoformat()},
            {"id": "aud-010", "title": "Islam et modernité : une tension créatrice", "description": "Comment les penseurs musulmans contemporains abordent-ils la modernité ? Cette conférence examine les différentes approches intellectuelles — réformistes, traditionalistes, progressistes — face aux défis du monde contemporain.", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "duration": 2940, "audio_url": AUDIO_URLS[3], "thumbnail": THUMBNAILS[1], "topic": "Fiqh", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-011", "title": "Ibn Arabi et l'ontologie soufie : wahdat al-wujud", "description": "La doctrine de l'unité de l'être (wahdat al-wujud) d'Ibn Arabi est l'une des contributions les plus originales et les plus controversées de la pensée islamique. Le Dr. Merah en décode les subtilités philosophiques avec une clarté remarquable.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "duration": 4020, "audio_url": AUDIO_URLS[4], "thumbnail": THUMBNAILS[2], "topic": "Tasawwuf", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-012", "title": "Al-Andalus : chroniques d'une civilisation perdue", "description": "Documentaire audio retraçant l'histoire de la civilisation andalouse : ses bibliothèques, ses astronomes, ses médecins, ses poètes. Une plongée dans un monde où musulmans, chrétiens et juifs ont coexisté et créé ensemble.", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "duration": 5040, "audio_url": AUDIO_URLS[5], "thumbnail": THUMBNAILS[3], "topic": "Histoire de l'Islam", "type": "documentary", "published_at": now.isoformat()},
        ]
        await db.audios.insert_many(audios)
        logger.info("Audios seeded")

    # Articles
    if await db.articles.count_documents({}) == 0:
        articles = [
            {"id": "art-001", "title": "L'humanisme islamique médiéval : de Bagdad à Oxford", "excerpt": "La Maison de la Sagesse de Bagdad a été le creuset d'une révolution intellectuelle sans précédent. Cet article retrace comment les savants musulmans ont préservé, enrichi et transmis le patrimoine grec à l'Europe.", "content": "La Maison de la Sagesse (Bayt al-Hikma) fondée sous le calife al-Ma'mun à Bagdad au IXe siècle représente l'un des moments les plus remarquables de l'histoire intellectuelle de l'humanité. Ce centre de traduction et de recherche a non seulement préservé les œuvres philosophiques et scientifiques de l'Antiquité, mais les a aussi enrichies d'apports originaux déterminants pour le développement des sciences modernes.\n\nLes traducteurs de Bagdad — Hunayn ibn Ishaq, Thabit ibn Qurra, al-Kindi et leurs contemporains — n'étaient pas de simples passeurs. Ils ont produit des synthèses originales, corrigé des erreurs de transmission, et enrichi considérablement les textes qu'ils traduisaient.\n\nAvicenne (Ibn Sina) a développé une philosophie naturelle qui a dominé la pensée européenne pendant quatre siècles. Averroès (Ibn Rushd) a produit des commentaires d'Aristote si influents qu'on l'appelait simplement 'Le Commentateur' dans les universités européennes. Al-Farabi a fondé la philosophie politique islamique tout en dialogue constant avec Platon et Aristote.\n\nCet héritage a voyagé de Bagdad à Cordoue, de Cordoue à Tolède, de Tolède à Paris et Oxford. Comprendre la philosophie médiévale européenne sans comprendre son substrat islamique, c'est se condamner à une incompréhension partielle de l'histoire des idées.", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "reading_time": 8, "thumbnail": THUMBNAILS[6], "topic": "Histoire de l'Islam", "published_at": now.isoformat(), "type": "article"},
            {"id": "art-002", "title": "Averroès et la transmission du savoir aristotélicien en Europe", "excerpt": "Comment Ibn Rushd a-t-il sauvé Aristote ? Retour sur l'un des transferts culturels les plus décisifs de l'histoire intellectuelle occidentale et islamique.", "content": "Quand on lit saint Thomas d'Aquin, Albert le Grand ou Roger Bacon, on lit aussi — souvent sans le savoir — Ibn Rushd. Ce philosophe cordouan du XIIe siècle, connu en Europe sous le nom d'Averroès, a produit des commentaires si systématiques et si pénétrants des œuvres d'Aristote qu'ils sont devenus pendant des siècles la référence incontournable pour quiconque voulait comprendre le Stagirite.\n\nNé à Cordoue en 1126, Ibn Rushd a grandi dans une famille de juristes et s'est formé à toutes les disciplines du savoir islamique classique : droit malékite, théologie, médecine, mathématiques, astronomie et philosophie. C'est dans ce dernier domaine qu'il a laissé sa marque la plus durable.\n\nSes trois séries de commentaires d'Aristote — courts, moyens et longs — couvrent pratiquement toute l'œuvre du philosophe grec. Ils ont été traduits en latin et en hébreu dès le XIIe siècle, diffusant la philosophie aristotélicienne dans les universités naissantes d'Europe.\n\nParadoxalement, Averroès est parfois mieux connu en Europe qu'dans le monde arabe et islamique, où sa postérité a été plus complexe. Son conflit avec al-Ghazali sur la philosophie et la religion, son exil à Marrakech sur ordre du calife almohade, tout cela a contribué à une réception ambivalente.", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "reading_time": 12, "thumbnail": THUMBNAILS[7], "topic": "Philosophie islamique", "published_at": now.isoformat(), "type": "article"},
            {"id": "art-003", "title": "Le soufisme comme voie spirituelle : tradition et contemporanéité", "excerpt": "Le soufisme est souvent réduit à ses expressions les plus pittoresques. Cet article propose une exploration rigoureuse de cette tradition spirituelle et de ses défis contemporains.", "content": "Le soufisme — ou tasawwuf — désigne la dimension spirituelle et mystique de l'Islam. Loin des clichés exotiques, c'est une tradition intellectuelle et spirituelle d'une grande richesse, qui a produit certaines des plus belles œuvres poétiques et philosophiques de l'humanité.\n\nLes origines du soufisme sont disputées. Certains historiens le voient comme un développement interne à l'Islam, réaction à la mondanisation progressive de la communauté après les premières générations. D'autres soulignent les influences néoplatoniciennes, chrétiennes et bouddhistes dans sa formation. La réalité est sans doute plus complexe et plus intéressante : le soufisme est une synthèse originale.\n\nLes grands maîtres soufis — al-Hallaj, al-Muhasibi, Junayd de Bagdad, Rabi'a al-Adawiyya, Ibn Arabi, Rumi — ont développé des doctrines et des pratiques d'une sophistication remarquable. La notion de fana (extinction du moi dans le divin), de mahabbah (amour divin), de kashf (dévoilement spirituel) constituent un vocabulaire conceptuel d'une grande précision.\n\nAujourd'hui, le soufisme connaît à la fois un renouveau d'intérêt académique et des défis inédits. Les confréries soufies (turuq) — Qadiriyya, Naqshbandiyya, Shadhiliyya, Tijaniyya — restent des forces spirituelles et sociales importantes dans de nombreux pays musulmans, tout en s'adaptant au monde contemporain.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "reading_time": 10, "thumbnail": THUMBNAILS[0], "topic": "Tasawwuf", "published_at": now.isoformat(), "type": "article"},
            {"id": "art-004", "title": "Islam et laïcité en France : enjeux académiques", "excerpt": "La question de l'Islam en France est souvent traitée dans la polémique. Cet article propose un regard académique sur les enjeux réels du vivre ensemble.", "content": "Le débat sur l'Islam en France souffre d'un déficit de rigueur analytique. Entre les discours alarmistes et les apologétiques naïfs, il manque souvent une approche rigoureusement empirique et conceptuellement précise.\n\nD'abord, quelques faits. L'Islam est la deuxième religion de France, avec une communauté estimée entre 5 et 6 millions de personnes. Cette communauté est extrêmement diverse : Marocains, Algériens, Tunisiens, Turcs, Africains subsahariens, convertis français — autant de pratiques, de courants théologiques et d'expériences sociales différents.\n\nLa laïcité française a une histoire complexe. Née dans le conflit avec l'Église catholique, elle s'est construite progressivement comme un principe de neutralité de l'État vis-à-vis des religions. Son application à l'Islam soulève des questions inédites — non parce que l'Islam serait incompatible avec la laïcité, mais parce que les conditions historiques et sociales sont différentes.\n\nLes chercheurs comme Olivier Roy, Gilles Kepel, Jocelyne Césari ont produit des travaux importants qui nuancent considérablement les discours politiques. Comprendre l'Islam en France nécessite de dépasser les catégories héritées du XIXe siècle et de se doter d'outils conceptuels adaptés à la réalité du XXIe siècle.", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "reading_time": 9, "thumbnail": THUMBNAILS[1], "topic": "Fiqh", "published_at": now.isoformat(), "type": "article"},
            {"id": "art-005", "title": "Al-Andalus : mythe ou réalité de la convivencia ?", "excerpt": "La coexistence harmonieuse de musulmans, chrétiens et juifs en al-Andalus est-elle un mythe ou une réalité historique ? Retour sur un débat historiographique majeur.", "content": "La convivencia andalouse est devenue un véritable mythe fondateur pour les promoteurs du dialogue interreligieux — et une cible privilégiée pour les révisionnistes qui voient dans cette idéalisation une naïveté dangereuse. La réalité historique est, comme souvent, plus nuancée et plus intéressante que les deux camps ne le prétendent.\n\nIl est indéniable que la péninsule ibérique sous domination islamique (711-1492) a connu des périodes remarquables de collaboration intellectuelle entre musulmans, chrétiens et juifs. L'école de traduction de Tolède au XIIe siècle, où des savants de trois religions travaillaient ensemble à la traduction des œuvres grecques et arabes en latin, en est l'exemple le plus célèbre.\n\nMaïmonide, le grand philosophe juif, a écrit en arabe et s'est nourri de la philosophie islamique. Les médecins de Cordoue soignaient sans distinction de religion. Les poètes arabes, hébreux et romans se répondaient et s'influençaient mutuellement.\n\nMais la convivencia n'était pas une utopie de tolérance parfaite. Il y avait des moments de violence, des politiques de dhimma discriminatoires, des conversions forcées — notamment sous les Almohades. L'historienne María Rosa Menocal a peut-être idéalisé cette période, mais ses détracteurs risquent de commettre l'erreur inverse en niant ses réalisations réelles.", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "reading_time": 11, "thumbnail": THUMBNAILS[2], "topic": "Histoire de l'Islam", "published_at": now.isoformat(), "type": "article"},
            {"id": "art-006", "title": "La logique dans la tradition islamique médiévale", "excerpt": "La logique aristotélicienne a connu un destin extraordinaire dans la civilisation islamique. Entre ceux qui la condamnaient et ceux qui la défendaient, un débat fondateur.", "content": "La réception de la logique aristotélicienne dans la pensée islamique médiévale est l'un des chapitres les plus fascinants de l'histoire des idées. Ce qui était initialement regardé avec méfiance — un outil de raisonnement développé par des penseurs grecs polythéistes — est devenu un instrument indispensable de la théologie, du droit et de la philosophie islamiques.\n\nAl-Farabi, le 'second maître' après Aristote, a été le premier à proposer une synthèse complète de la logique aristotélicienne adaptée au contexte islamique. Son Kitab al-Alfaz (Livre des termes) et ses commentaires des Analytiques ont posé les bases d'une tradition logique originale.\n\nAvicenne (Ibn Sina) a ensuite développé une logique proprement islamique, différant d'Aristote sur plusieurs points importants. Sa théorie des universaux, sa logique modale, son traitement du syllogisme ont enrichi considérablement la tradition aristotélicienne.\n\nLe Grand Débat a opposé les philosophes logiciens aux théologiens traditionnels, dont al-Ghazali. Dans son Incohérence des philosophes (Tahafut al-Falasifa), al-Ghazali attaque vigoureusement les prétentions des philosophes. Averroès lui répondra dans son Incohérence de l'incohérence, défendant la validité et la nécessité de la raison philosophique.", "scholar_id": "sch-005", "scholar_name": "Prof. Ali Benmakhlouf", "reading_time": 7, "thumbnail": THUMBNAILS[3], "topic": "Philosophie islamique", "published_at": now.isoformat(), "type": "article"},
        ]
        await db.articles.insert_many(articles)
        logger.info("Articles seeded")

    # Live Sessions
    if await db.live_sessions.count_documents({}) == 0:
        now_dt = datetime.now(timezone.utc)
        sessions = [
            {"id": "live-001", "title": "Masterclass : Introduction à la philosophie islamique", "description": "Le Dr. Bencherif vous invite à une masterclass exceptionnelle d'introduction à la philosophie islamique : ses grandes questions, ses grands penseurs, ses méthodes. Une session idéale pour les débutants et les curieux.", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "date": (now_dt + timedelta(days=7)).isoformat(), "duration": 90, "thumbnail": THUMBNAILS[0], "topic": "Philosophie islamique", "max_participants": 100, "registered_count": 47, "registered_users": []},
            {"id": "live-002", "title": "Séminaire : Islam et modernité en Europe — enjeux académiques", "description": "Une session interactive de débat académique autour des questions posées par la présence de l'Islam en Europe. Le Prof. Al-Fassi présentera ses recherches récentes et répondra aux questions du public.", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "date": (now_dt + timedelta(days=14)).isoformat(), "duration": 120, "thumbnail": THUMBNAILS[1], "topic": "Fiqh", "max_participants": 80, "registered_count": 32, "registered_users": []},
            {"id": "live-003", "title": "Lecture commentée de la Muqaddima d'Ibn Khaldoun", "description": "Rejoignez le Prof. Benmakhlouf pour une lecture commentée des passages clés de la Muqaddima. Ce texte fondateur des sciences sociales sera analysé dans sa profondeur et dans sa modernité étonnante.", "scholar_id": "sch-005", "scholar_name": "Prof. Ali Benmakhlouf", "date": (now_dt + timedelta(days=21)).isoformat(), "duration": 90, "thumbnail": THUMBNAILS[2], "topic": "Philosophie islamique", "max_participants": 60, "registered_count": 28, "registered_users": []},
            {"id": "live-004", "title": "Atelier : Poésie soufie et traduction — Rumi en français", "description": "Un atelier pratique autour de la traduction et de l'interprétation de la poésie soufie. Le Dr. Merah présentera différentes traductions de Rumi et analysera les enjeux de la traduction de la poésie mystique.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "date": (now_dt + timedelta(days=10)).isoformat(), "duration": 90, "thumbnail": THUMBNAILS[3], "topic": "Tasawwuf", "max_participants": 40, "registered_count": 38, "registered_users": []},
            {"id": "live-005", "title": "Table ronde : L'avenir des études islamiques en France", "description": "Nos cinq érudits se réunissent pour une table ronde exceptionnelle autour de l'avenir des études islamiques académiques en France. Perspectives, défis, opportunités : une conversation au sommet.", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "date": (now_dt + timedelta(days=30)).isoformat(), "duration": 150, "thumbnail": THUMBNAILS[4], "topic": "Histoire de l'Islam", "max_participants": 200, "registered_count": 89, "registered_users": []},
        ]
        await db.live_sessions.insert_many(sessions)
        logger.info("Live sessions seeded")

    logger.info("Database seeding complete")

# ─── App Setup ────────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await seed_data()

@app.on_event("shutdown")
async def shutdown():
    client.close()
