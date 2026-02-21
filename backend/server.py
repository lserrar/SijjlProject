from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, logging, hashlib, hmac, requests as http_requests
import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

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

# ─── Stripe Config ───────────────────────────────────────────────────────────
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Default subscription plans (can be modified via admin panel)
DEFAULT_PLANS = {
    'monthly': {'name': 'Abonnement Mensuel', 'price': 9.99, 'duration_days': 30, 'type': 'subscription'},
    'annual': {'name': 'Abonnement Annuel', 'price': 89.99, 'duration_days': 365, 'type': 'subscription'},
}

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

# Only admin role is assignable via code — no API can grant admin
ADMIN_EMAILS = {'loubna.serrar@gmail.com'}

async def require_admin(request: Request) -> dict:
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Accès réservé aux administrateurs")
    return user

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
    progress: float
    position: Optional[float] = 0

class FavoriteRequest(BaseModel):
    content_id: str
    content_type: str

class LiveRegisterRequest(BaseModel):
    session_id: str

# ─── Cursus Models (was Thematiques) ─────────────────────────────────────────

class CursusCreate(BaseModel):
    name: str
    description: str = ""
    icon: str = "book-open"
    order: int = 0
    is_active: bool = False  # Default inactive for preparation

class CursusUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# ─── Module Models ───────────────────────────────────────────────────────────

class ModuleCreate(BaseModel):
    name: str
    description: str = ""
    course_id: str  # Link to course
    scholar_name: Optional[str] = None
    order: int = 0
    episode_count: int = 2  # Default: 1 short + 1 long
    is_active: bool = False  # Default inactive for preparation

class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    course_id: Optional[str] = None
    scholar_name: Optional[str] = None
    order: Optional[int] = None
    episode_count: Optional[int] = None
    is_active: Optional[bool] = None

# ─── Bulk Action Models ──────────────────────────────────────────────────────

class BulkToggleRequest(BaseModel):
    ids: List[str]
    is_active: bool

# ─── Audio Category Models ─────────────────────────────────────────────────────

class AudioCategoryCreate(BaseModel):
    name: str
    description: str = ""
    r2_folder: str  # Dossier R2 associé (ex: "hikma-audio/0. Conference/")
    icon: str = "headphones"  # Font Awesome icon name
    is_active: bool = True

class AudioCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    r2_folder: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class AudioCreate(BaseModel):
    title: str
    description: str = ""
    scholar_id: Optional[str] = None
    scholar_name: Optional[str] = None
    duration: int = 0
    audio_url: Optional[str] = ""
    file_key: Optional[str] = ""
    thumbnail: str = ""
    topic: str = ""
    type: str = "episode"  # episode, short, long
    category_id: Optional[str] = None  # Link to audio_categories collection
    module_id: Optional[str] = None  # Link to a module (NEW - replaces course_id)
    episode_number: Optional[int] = None
    is_active: bool = False

class AudioUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scholar_id: Optional[str] = None
    scholar_name: Optional[str] = None
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    topic: Optional[str] = None
    type: Optional[str] = None
    category_id: Optional[str] = None
    module_id: Optional[str] = None
    episode_number: Optional[int] = None
    is_active: Optional[bool] = None
    file_key: Optional[str] = None
    audio_url: Optional[str] = None

class ScholarCreate(BaseModel):
    name: str
    university: str
    bio: str
    photo: str = ""
    specializations: List[str] = []

class ScholarUpdate(BaseModel):
    name: Optional[str] = None
    university: Optional[str] = None
    bio: Optional[str] = None
    photo: Optional[str] = None
    specializations: Optional[List[str]] = None

class CourseCreate(BaseModel):
    title: str
    description: str
    topic: str
    level: str
    language: str = "Francais"
    scholar_id: str
    scholar_name: str
    thematique_id: Optional[str] = None
    duration: int = 0
    thumbnail: str = ""
    modules_count: int = 0
    tags: List[str] = []
    is_featured: bool = False  # Cours mis en avant sur la page d'accueil

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topic: Optional[str] = None
    level: Optional[str] = None
    language: Optional[str] = None
    scholar_id: Optional[str] = None
    scholar_name: Optional[str] = None
    thematique_id: Optional[str] = None
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    modules_count: Optional[int] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

# ─── Conference Models ─────────────────────────────────────────────────────────

class ConferenceCreate(BaseModel):
    title: str
    description: str
    speaker_name: str  # Peut être un professeur externe
    speaker_bio: str = ""
    thematique_id: Optional[str] = None  # Lien avec un cursus/thématique
    audio_url: str = ""
    video_url: str = ""
    thumbnail: str = ""
    duration: int = 0  # en minutes
    conference_date: Optional[str] = None  # Date de la conférence
    source: str = ""  # Source de la conférence (ex: "Colloque EPHE 2024")
    tags: List[str] = []
    is_public: bool = False  # Conférence gratuite ou payante

class ConferenceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    speaker_name: Optional[str] = None
    speaker_bio: Optional[str] = None
    thematique_id: Optional[str] = None
    audio_url: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[int] = None
    conference_date: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    is_active: Optional[bool] = None

# ─── Subscription & Payment Models ───────────────────────────────────────────

class PlanCreate(BaseModel):
    plan_id: str
    name: str
    price: float
    duration_days: int
    type: str = "subscription"  # subscription, course_purchase, cursus_purchase
    description: str = ""
    trial_days: int = 0  # Free trial period
    is_active: bool = True

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    trial_days: Optional[int] = None

class CheckoutRequest(BaseModel):
    plan_id: Optional[str] = None
    course_id: Optional[str] = None
    cursus_id: Optional[str] = None
    promo_code: Optional[str] = None
    origin_url: str

class PromoCodeCreate(BaseModel):
    code: str
    discount_percent: Optional[float] = None  # 0-100
    discount_amount: Optional[float] = None   # Fixed amount in EUR
    max_uses: Optional[int] = None
    start_date: Optional[str] = None   # When the promo code becomes valid
    expires_at: Optional[str] = None   # When the promo code expires
    applicable_plans: List[str] = []  # Empty = all plans
    description: str = ""
    is_active: bool = True

class PromoCodeUpdate(BaseModel):
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    max_uses: Optional[int] = None
    start_date: Optional[str] = None
    expires_at: Optional[str] = None
    applicable_plans: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class StartTrialRequest(BaseModel):
    plan_id: str

# ─── Auth Routes ────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(body: RegisterRequest):
    existing = await db.users.find_one({'email': body.email})
    if existing:
        raise HTTPException(400, "Email déjà utilisé")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    role = 'admin' if body.email in ADMIN_EMAILS else 'user'
    user_doc = {
        'user_id': user_id,
        'email': body.email,
        'name': body.name,
        'password_hash': hash_password(body.password),
        'picture': f"https://ui-avatars.com/api/?name={body.name.replace(' ','+')}&background=04D182&color=000&bold=true",
        'provider': 'email',
        'role': role,
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
        # Update name, picture, and ensure admin role if applicable
        update_data = {'name': name, 'picture': picture}
        if email in ADMIN_EMAILS:
            update_data['role'] = 'admin'
        await db.users.update_one({'user_id': user_id}, {'$set': update_data})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = 'admin' if email in ADMIN_EMAILS else 'user'
        await db.users.insert_one({
            'user_id': user_id, 'email': email, 'name': name, 'picture': picture,
            'provider': 'google', 'role': role, 'created_at': now, 'password_hash': None
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
async def get_courses(topic: Optional[str] = None, level: Optional[str] = None, scholar_id: Optional[str] = None, thematique_id: Optional[str] = None, cursus_id: Optional[str] = None):
    query: dict = {'is_active': {'$ne': False}}  # Only show active courses
    if topic:
        query['topic'] = topic
    if level:
        query['level'] = level
    if scholar_id:
        query['scholar_id'] = scholar_id
    # Support both old (thematique_id) and new (cursus_id) field names
    filter_id = cursus_id or thematique_id
    if filter_id:
        query['$or'] = [{'cursus_id': filter_id}, {'thematique_id': filter_id}]
    courses = await db.courses.find(query, {'_id': 0}).to_list(100)
    return courses

@api_router.get("/courses/featured")
async def get_featured_course():
    """Get the featured course for homepage highlight."""
    course = await db.courses.find_one({'is_featured': True, 'is_active': True}, {'_id': 0})
    return course

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str):
    c = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not c:
        raise HTTPException(404, "Cours non trouvé")
    return c

@api_router.get("/courses/{course_id}/suggestions")
async def get_course_suggestions(course_id: str):
    """Get 'Pour approfondir' suggestions based on course theme."""
    course = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not course:
        raise HTTPException(404, "Cours non trouvé")
    
    thematique_id = course.get('thematique_id')
    suggestions = {
        'conferences': [],
        'bibliographies': [],
        'related_courses': []
    }
    
    if thematique_id:
        # Get conferences on same theme
        suggestions['conferences'] = await db.conferences.find(
            {'thematique_id': thematique_id, 'is_active': True}, 
            {'_id': 0}
        ).to_list(5)
        
        # Get bibliographies on same theme
        suggestions['bibliographies'] = await db.bibliographies.find(
            {'thematique_id': thematique_id}, 
            {'_id': 0}
        ).to_list(5)
        
        # Get other courses on same theme (excluding current)
        suggestions['related_courses'] = await db.courses.find(
            {'thematique_id': thematique_id, 'id': {'$ne': course_id}, 'is_active': True}, 
            {'_id': 0}
        ).to_list(3)
    
    return suggestions

# ─── Conference Routes ─────────────────────────────────────────────────────────

@api_router.get("/conferences")
async def get_conferences(thematique_id: Optional[str] = None):
    """Get all conferences, optionally filtered by theme."""
    query: dict = {'is_active': True}
    if thematique_id:
        query['thematique_id'] = thematique_id
    conferences = await db.conferences.find(query, {'_id': 0}).to_list(100)
    return conferences

@api_router.get("/conferences/{conference_id}")
async def get_conference(conference_id: str):
    conf = await db.conferences.find_one({'id': conference_id}, {'_id': 0})
    if not conf:
        raise HTTPException(404, "Conférence non trouvée")
    return conf

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

# ─── Thematiques Routes ──────────────────────────────────────────────────────

@api_router.get("/thematiques")
async def get_thematiques():
    """Get all thematiques (cursus themes) ordered by position.
    First checks the new 'cursus' collection, falls back to 'thematiques' for backward compatibility.
    """
    # Try new cursus collection first
    cursus = await db.cursus.find({'is_active': {'$ne': False}}, {'_id': 0}).sort('order', 1).to_list(100)
    if cursus:
        # Add course count for each cursus
        for c in cursus:
            c['course_count'] = await db.courses.count_documents({
                '$or': [{'cursus_id': c['id']}, {'thematique_id': c['id']}],
                'is_active': {'$ne': False}
            })
        return cursus
    # Fall back to old thematiques collection
    thematiques = await db.thematiques.find({'is_active': {'$ne': False}}, {'_id': 0}).sort('order', 1).to_list(100)
    return thematiques

@api_router.get("/thematiques/{thematique_id}")
async def get_thematique(thematique_id: str):
    # Try new cursus collection first
    t = await db.cursus.find_one({'id': thematique_id}, {'_id': 0})
    if not t:
        # Fall back to old thematiques collection
        t = await db.thematiques.find_one({'id': thematique_id}, {'_id': 0})
    if not t:
        raise HTTPException(404, "Thématique non trouvée")
    return t

# ─── Bibliography Routes ─────────────────────────────────────────────────────

@api_router.get("/bibliographies")
async def get_bibliographies():
    """Get all bibliographies for the library tab."""
    biblio = await db.bibliographies.find({'is_active': {'$ne': False}}, {'_id': 0}).to_list(100)
    return biblio

@api_router.get("/bibliographies/{biblio_id}")
async def get_bibliography(biblio_id: str):
    b = await db.bibliographies.find_one({'id': biblio_id}, {'_id': 0})
    if not b:
        raise HTTPException(404, "Bibliographie non trouvée")
    return b

# ─── Masterclass Routes ──────────────────────────────────────────────────────

@api_router.get("/masterclasses")
async def get_masterclasses():
    """Get all masterclasses for the live tab."""
    masterclasses = await db.masterclasses.find({'is_active': {'$ne': False}}, {'_id': 0}).to_list(100)
    return masterclasses

@api_router.get("/masterclasses/{mc_id}")
async def get_masterclass(mc_id: str):
    mc = await db.masterclasses.find_one({'id': mc_id}, {'_id': 0})
    if not mc:
        raise HTTPException(404, "Masterclass non trouvée")
    return mc

@api_router.post("/masterclasses/{mc_id}/register")
async def register_masterclass(mc_id: str, request: Request):
    """Register current user for a masterclass."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    mc = await db.masterclasses.find_one({'id': mc_id})
    if not mc:
        raise HTTPException(404, "Masterclass non trouvée")
    # Check if already registered
    if user['user_id'] in mc.get('registered_users', []):
        raise HTTPException(400, "Déjà inscrit à cette masterclass")
    # Check capacity
    if mc.get('max_participants') and mc.get('current_participants', 0) >= mc['max_participants']:
        raise HTTPException(400, "Cette masterclass est complète")
    
    await db.masterclasses.update_one(
        {'id': mc_id},
        {'$addToSet': {'registered_users': user['user_id']}, '$inc': {'current_participants': 1}}
    )
    return {'message': 'Inscription confirmée', 'masterclass_id': mc_id}

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
    if daily_pick:
        daily_pick['stream_url'] = resolve_audio_url(daily_pick)

    # Hero: resolve stream URL if audio
    if hero and hero.get('content_type') == 'audio':
        hero['content']['stream_url'] = resolve_audio_url(hero['content'])

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

    # Courses - SKIP if custom courses exist (cursus-falsafa)
    if await db.courses.count_documents({}) == 0 and await db.thematiques.find_one({'id': 'cursus-falsafa'}) is None:
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
            {"id": "aud-001", "title": "La notion de Hikma dans la pensée islamique classique", "description": "Le concept de Hikma (sagesse) est au cœur de la tradition intellectuelle islamique. Cette conférence explore ses dimensions philosophiques, théologiques et spirituelles, de Platon à Ibn Rushd en passant par al-Farabi.", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "duration": 3420, "audio_url": AUDIO_URLS[0], "file_key": "podcasts/aud-001.mp3", "thumbnail": THUMBNAILS[0], "topic": "Philosophie islamique", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-002", "title": "Ibn Khaldoun et la sociologie avant la lettre", "description": "Le Prof. Benmakhlouf analyse les grandes intuitions sociologiques d'Ibn Khaldoun : la théorie de l'asabiyya, les cycles historiques, l'analyse économique. Un génie méconnu qui mérite d'être redécouvert.", "scholar_id": "sch-005", "scholar_name": "Prof. Ali Benmakhlouf", "duration": 2880, "audio_url": AUDIO_URLS[1], "file_key": "podcasts/aud-002.mp3", "thumbnail": THUMBNAILS[1], "topic": "Philosophie islamique", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-003", "title": "Al-Ghazali et le renouveau de la conscience spirituelle", "description": "Cette conférence magistrale explore comment al-Ghazali a réformé la spiritualité islamique en synthétisant philosophie grecque, théologie islamique et mystique soufie dans une vision cohérente et profonde.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "duration": 3960, "audio_url": AUDIO_URLS[2], "file_key": "lectures/aud-003.mp3", "thumbnail": THUMBNAILS[2], "topic": "Tasawwuf", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-004", "title": "Averroès et la transmission du savoir aristotélicien", "description": "Comment Averroès (Ibn Rushd) a-t-il sauvé et transmis la philosophie aristotélicienne à l'Europe médiévale ? Cette conférence retrace ce voyage intellectuel fascinant de Cordoue aux universités de Paris et d'Oxford.", "scholar_id": "sch-002", "scholar_name": "Dr. Leïla Bencherif", "duration": 2700, "audio_url": AUDIO_URLS[3], "file_key": "lectures/aud-004.mp3", "thumbnail": THUMBNAILS[3], "topic": "Philosophie islamique", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-005", "title": "L'éthique dans le Coran : une lecture philosophique", "description": "Le Prof. Al-Fassi propose une lecture philosophique des dimensions éthiques du Coran : la justice, la dignité humaine, la responsabilité morale. Une approche rigoureuse qui dialogue avec les grandes traditions éthiques occidentales.", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "duration": 3180, "audio_url": AUDIO_URLS[4], "file_key": "podcasts/aud-005.mp3", "thumbnail": THUMBNAILS[4], "topic": "Fiqh", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-006", "title": "Récitation de Sourate Al-Baqara — Sheikh Abdul Rahman Al-Sudais", "description": "La Sourate Al-Baqara, deuxième et plus longue sourate du Coran, dans une récitation émouvante du Sheikh Abdul Rahman Al-Sudais, Imam de la Grande Mosquée de La Mecque. Translittération et traduction française disponibles.", "scholar_id": "sch-001", "scholar_name": "Sheikh Abdul Rahman Al-Sudais", "duration": 5400, "audio_url": AUDIO_URLS[5], "file_key": "quran/aud-006.mp3", "thumbnail": THUMBNAILS[5], "topic": "Sciences coraniques", "type": "quran", "published_at": now.isoformat()},
            {"id": "aud-007", "title": "Le dialogue interreligieux dans la tradition islamique", "description": "Contrairement aux idées reçues, la tradition islamique a une riche histoire de dialogue avec les autres traditions abrahamiques. Cette conférence explore cette histoire trop méconnue, des penseurs médiévaux aux expériences contemporaines.", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "duration": 2520, "audio_url": AUDIO_URLS[0], "file_key": "podcasts/aud-007.mp3", "thumbnail": THUMBNAILS[6], "topic": "Histoire de l'Islam", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-008", "title": "Rumi et la poésie mystique : entre Orient et Occident", "description": "Jalal ad-Din Rumi est aujourd'hui l'un des poètes les plus lus dans le monde. Le Dr. Merah analyse la profondeur mystique de ses œuvres, du Masnavi au Divan de Shams, et leur résonance universelle.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "duration": 3300, "audio_url": AUDIO_URLS[1], "file_key": "lectures/aud-008.mp3", "thumbnail": THUMBNAILS[7], "topic": "Tasawwuf", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-009", "title": "Récitation des 30 Juz — Sheikh Mishary Rashid Al-Afasy", "description": "Récitation complète du Coran par le Sheikh Mishary Rashid Al-Afasy, l'une des voix les plus appréciées dans le monde islamique. Une expérience sonore d'une beauté saisissante, accompagnée de notes de contexte académiques.", "scholar_id": "sch-001", "scholar_name": "Sheikh Mishary Rashid Al-Afasy", "duration": 7200, "audio_url": AUDIO_URLS[2], "file_key": "quran/aud-009.mp3", "thumbnail": THUMBNAILS[0], "topic": "Sciences coraniques", "type": "quran", "published_at": now.isoformat()},
            {"id": "aud-010", "title": "Islam et modernité : une tension créatrice", "description": "Comment les penseurs musulmans contemporains abordent-ils la modernité ? Cette conférence examine les différentes approches intellectuelles — réformistes, traditionalistes, progressistes — face aux défis du monde contemporain.", "scholar_id": "sch-001", "scholar_name": "Prof. Mohammed Al-Fassi", "duration": 2940, "audio_url": AUDIO_URLS[3], "file_key": "podcasts/aud-010.mp3", "thumbnail": THUMBNAILS[1], "topic": "Fiqh", "type": "podcast", "published_at": now.isoformat()},
            {"id": "aud-011", "title": "Ibn Arabi et l'ontologie soufie : wahdat al-wujud", "description": "La doctrine de l'unité de l'être (wahdat al-wujud) d'Ibn Arabi est l'une des contributions les plus originales et les plus controversées de la pensée islamique. Le Dr. Merah en décode les subtilités philosophiques avec une clarté remarquable.", "scholar_id": "sch-004", "scholar_name": "Dr. Nadia Merah", "duration": 4020, "audio_url": AUDIO_URLS[4], "file_key": "lectures/aud-011.mp3", "thumbnail": THUMBNAILS[2], "topic": "Tasawwuf", "type": "lecture", "published_at": now.isoformat()},
            {"id": "aud-012", "title": "Al-Andalus : chroniques d'une civilisation perdue", "description": "Documentaire audio retraçant l'histoire de la civilisation andalouse : ses bibliothèques, ses astronomes, ses médecins, ses poètes. Une plongée dans un monde où musulmans, chrétiens et juifs ont coexisté et créé ensemble.", "scholar_id": "sch-003", "scholar_name": "Prof. Youssef El-Haddad", "duration": 5040, "audio_url": AUDIO_URLS[5], "file_key": "documentaries/aud-012.mp3", "thumbnail": THUMBNAILS[3], "topic": "Histoire de l'Islam", "type": "documentary", "published_at": now.isoformat()},
        ]
        await db.audios.insert_many(audios)
        logger.info("Audios seeded")
    else:
        # Migration: add file_key to existing audio documents that don't have it
        r2_file_keys = {
            "aud-001": "podcasts/aud-001.mp3",
            "aud-002": "podcasts/aud-002.mp3",
            "aud-003": "lectures/aud-003.mp3",
            "aud-004": "lectures/aud-004.mp3",
            "aud-005": "podcasts/aud-005.mp3",
            "aud-006": "quran/aud-006.mp3",
            "aud-007": "podcasts/aud-007.mp3",
            "aud-008": "lectures/aud-008.mp3",
            "aud-009": "quran/aud-009.mp3",
            "aud-010": "podcasts/aud-010.mp3",
            "aud-011": "lectures/aud-011.mp3",
            "aud-012": "documentaries/aud-012.mp3",
        }
        for audio_id, file_key in r2_file_keys.items():
            await db.audios.update_one(
                {'id': audio_id, 'file_key': {'$exists': False}},
                {'$set': {'file_key': file_key}}
            )
        logger.info("Audio file_key migration complete")

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

    # ─── Migrations ──────────────────────────────────────────────────────────

    # 1. Add is_active to all content docs
    await db.audios.update_many({'is_active': {'$exists': False}}, {'$set': {'is_active': True}})
    await db.courses.update_many({'is_active': {'$exists': False}}, {'$set': {'is_active': True}})
    await db.scholars.update_many({'is_active': {'$exists': False}}, {'$set': {'is_active': True}})

    # Check if custom cursus exists - skip demo seeding if so
    custom_cursus = await db.cursus.find_one({'id': 'cursus-falsafa'})
    if not custom_cursus:
        # Also check old thematiques collection for backward compatibility
        custom_cursus = await db.thematiques.find_one({'id': 'cursus-falsafa'})
    logger.info(f"DEBUG: Checking for cursus-falsafa, found: {custom_cursus is not None}")
    if custom_cursus:
        logger.info("Custom cursus 'cursus-falsafa' found - skipping all demo course/audio seeding")
        logger.info("Database seeding complete")
        return

    # 2. Set admin role for admin email
    result = await db.users.update_one(
        {'email': 'loubna.serrar@gmail.com'},
        {'$set': {'role': 'admin'}}
    )
    if result.modified_count > 0:
        logger.info("Admin role set for loubna.serrar@gmail.com")

    # 3. Add/Update Meryem Sebti
    meryem_data = {
        "id": "sch-006",
        "name": "Prof. Meryem Sebti",
        "university": "CNRS / EPHE (École Pratique des Hautes Études)",
        "bio": (
            "Directrice de recherche au CNRS et chargée de conférences invitée à l'EPHE, "
            "Meryem Sebti a principalement travaillé sur Avicenne, notamment sur sa doctrine "
            "de l'âme et sa prophétologie. Spécialiste de la philosophie arabe médiévale, "
            "elle est l'auteure de nombreux ouvrages de référence dont "
            "Avicenne – Prophétie et gouvernement du monde (Cerf, 2021), "
            "Noétique et théorie de la connaissance dans la philosophie arabe (Vrin, 2020), "
            "et Avicenne. L'âme humaine (PUF, 2000)."
        ),
        "photo": "https://customer-assets.emergentagent.com/job_057211bf-8567-4749-b2d1-1f73d9b86661/artifacts/6hhq4gdt_Cercle_Meriemv2.jpg",
        "specializations": ["Avicenne", "Noétique", "Prophétologie", "Philosophie arabe"],
        "content_count": 1,
        "is_active": True,
    }
    await db.scholars.update_one(
        {'id': 'sch-006'},
        {'$set': meryem_data},
        upsert=True
    )
    logger.info("Scholar Meryem Sebti added/updated")

    # 4. Add Henry Corbin
    corbin_data = {
        "id": "sch-007",
        "name": "Henry Corbin",
        "university": "EPHE / Université de Téhéran",
        "bio": (
            "Henry Corbin (1903-1978), philosophe, germaniste, iranologue, arabisant, étudiera avec acharnement "
            "les textes des écoles philosophiques de l'Iran du 12e au 19e siècle. Tout était à faire en ce domaine : "
            "établir les textes, les éditer, les traduire, les présenter. Il fera connaître les richesses de l'école "
            "d'Ispahan à l'Occident et à l'Orient. Ses ouvrages restent à nos jours l'une des plus grandes expositions "
            "du soufisme persan classique disponible pour un public occidental.\n\n"
            "Grâce à lui, l'Occident découvrira trois grandes figures : Sohravardî, le grand platonicien de Perse "
            "(L'Archange empourpré, 1976), Ibn 'Arabi, le grand maître (L'Imagination créatrice dans le soufisme "
            "d'Ibn 'Arabī 1958 ; 2e éd. 1977), et Mollā Sādrā Shīrāzī (Livre des pénétrations métaphysiques, 1964). "
            "Il laissera également deux grandes références majeures en philosophie islamique : Histoire de la "
            "philosophie islamique, et En Islam iranien (t. I et II, 1971 ; t. III et IV, 1973).\n\n"
            "La bibliographie complète, ainsi que de nombreuses ressources sont disponibles sur le site de "
            "l'association des amis de Corbin : https://www.amiscorbin.com/"
        ),
        "photo": "https://customer-assets.emergentagent.com/job_057211bf-8567-4749-b2d1-1f73d9b86661/artifacts/hxtabq8s_1973_HCorbine04d31.jpeg",
        "specializations": ["Philosophie iranienne", "Soufisme persan", "Sohravardî", "Ibn Arabi", "Mollā Sādrā"],
        "content_count": 14,
        "is_active": True,
    }
    await db.scholars.update_one(
        {'id': 'sch-007'},
        {'$set': corbin_data},
        upsert=True
    )
    logger.info("Scholar Henry Corbin added/updated")

    # Skip creating demo courses if our custom cursus exists
    if await db.thematiques.find_one({'id': 'cursus-falsafa'}):
        logger.info("Custom cursus found - skipping demo course seeding")
        logger.info("Database seeding complete")
        return

    # 5. Create Course for "Philosophie" folder (Meryem Sebti)
    philosophie_course = {
        "id": "crs-philo-sebti",
        "title": "Philosophie",
        "description": (
            "Cours de philosophie arabe et islamique par le Prof. Meryem Sebti. "
            "Ce cycle explore les grandes traditions philosophiques du monde arabo-musulman, "
            "avec un accent particulier sur Avicenne, la noétique et la prophétologie. "
            "Une plongée académique rigoureuse dans la pensée islamique médiévale."
        ),
        "topic": "Philosophie islamique",
        "level": "Intermédiaire",
        "language": "Français",
        "scholar_id": "sch-006",
        "scholar_name": "Prof. Meryem Sebti",
        "duration": 0,
        "thumbnail": "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80",
        "modules_count": 0,
        "tags": ["Philosophie", "Avicenne", "Noétique", "Philosophie arabe"],
        "type": "course",
        "r2_folder": "Philosophie",
        "published_at": now.isoformat(),
        "is_active": True,
    }
    await db.courses.update_one(
        {'id': 'crs-philo-sebti'},
        {'$set': philosophie_course},
        upsert=True
    )
    logger.info("Course 'Philosophie' (Meryem Sebti) created/updated")

    # 6. Create Course for "Henry Corbin" folder
    corbin_course = {
        "id": "crs-henry-corbin",
        "title": "Cycle Henry Corbin",
        "description": (
            "Cycle complet sur l'œuvre et la pensée de Henry Corbin, le grand iranologue et philosophe. "
            "Ce cours en 14 épisodes explore les thèmes majeurs de son travail : la philosophie iranienne, "
            "le soufisme persan, Sohravardî, Ibn 'Arabi et Mollā Sādrā. Un voyage intellectuel extraordinaire "
            "à travers l'une des plus grandes expositions du soufisme persan classique disponible en français."
        ),
        "topic": "Philosophie islamique",
        "level": "Avancé",
        "language": "Français",
        "scholar_id": "sch-007",
        "scholar_name": "Henry Corbin",
        "duration": 0,  # Will be calculated from episodes
        "thumbnail": "https://customer-assets.emergentagent.com/job_057211bf-8567-4749-b2d1-1f73d9b86661/artifacts/hxtabq8s_1973_HCorbine04d31.jpeg",
        "modules_count": 14,
        "tags": ["Henry Corbin", "Philosophie iranienne", "Soufisme", "Sohravardî", "Ibn Arabi"],
        "type": "course",
        "r2_folder": "Henry Corbin",
        "published_at": now.isoformat(),
        "is_active": True,
    }
    await db.courses.update_one(
        {'id': 'crs-henry-corbin'},
        {'$set': corbin_course},
        upsert=True
    )
    logger.info("Course 'Cycle Henry Corbin' created/updated")

    # 7. Create Audio entries for Henry Corbin episodes
    corbin_episodes = [
        {"ep": 1, "title": "Introduction à la pensée de Henry Corbin", "file_key": "Henry Corbin/Cycle_HCorbin_episode1.m4a", "duration": 420},
        {"ep": 2, "title": "Sohravardî et la philosophie de l'illumination", "file_key": "Henry Corbin/Cycle_HCorbin_episode2.m4a", "duration": 470},
        {"ep": 3, "title": "Le monde imaginal ('alam al-mithal)", "file_key": "Henry Corbin/Cycle_HCorbin_episode3.m4a", "duration": 470},
        {"ep": 4, "title": "Ibn 'Arabi : L'imagination créatrice", "file_key": "Henry Corbin/Cycle_HCorbin_episode4.m4a", "duration": 640},
        {"ep": 5, "title": "Mollā Sādrā Shīrāzī et les pénétrations métaphysiques", "file_key": "Henry Corbin/Cycle_HCorbin_episode5.m4a", "duration": 750},
        {"ep": 6, "title": "L'école d'Ispahan : contexte historique", "file_key": "Henry Corbin/Cycle_HCorbin_episode6.m4a", "duration": 1080},
        {"ep": 7, "title": "L'Archange empourpré : mystique de la lumière", "file_key": "Henry Corbin/Cycle_HCorbin_episode7.m4a", "duration": 2100},
        {"ep": 8, "title": "Soufisme persan et gnose islamique", "file_key": "Henry Corbin/Cycle_HCorbin_episode8.m4a", "duration": 2400},
        {"ep": 9, "title": "En Islam iranien : le shi'isme duodécimain", "file_key": "Henry Corbin/Cycle_HCorbin_episode9.m4a", "duration": 2280},
        {"ep": 10, "title": "La prophétologie et l'eschatologie", "file_key": "Henry Corbin/Cycle_HCorbin_episode10.m4a", "duration": 4800},
        {"ep": 11, "title": "L'herméneutique spirituelle du Coran", "file_key": "Henry Corbin/Cycle_HCorbin_episode11.m4a", "duration": 2940},
        {"ep": 12, "title": "Le temps cyclique et l'hiérohistoire", "file_key": "Henry Corbin/Cycle_HCorbin_episode12.m4a", "duration": 3990},
        {"ep": 13, "title": "Corbin et la phénoménologie religieuse", "file_key": "Henry Corbin/Cycle_HCorbin_episode13.m4a", "duration": 360},
        {"ep": 14, "title": "Conclusion : L'héritage de Henry Corbin", "file_key": "Henry Corbin/Cycle_HCorbin_episode14.m4a", "duration": 2094},
    ]

    for ep in corbin_episodes:
        audio_doc = {
            "id": f"aud-corbin-{ep['ep']:02d}",
            "title": f"Épisode {ep['ep']} — {ep['title']}",
            "description": f"Cycle Henry Corbin, épisode {ep['ep']}. {ep['title']}.",
            "scholar_id": "sch-007",
            "scholar_name": "Henry Corbin",
            "duration": ep['duration'],
            "audio_url": "",
            "file_key": ep['file_key'],
            "thumbnail": "https://customer-assets.emergentagent.com/job_057211bf-8567-4749-b2d1-1f73d9b86661/artifacts/hxtabq8s_1973_HCorbine04d31.jpeg",
            "topic": "Philosophie islamique",
            "type": "lecture",
            "course_id": "crs-henry-corbin",
            "episode_number": ep['ep'],
            "published_at": now.isoformat(),
            "is_active": True,
        }
        await db.audios.update_one(
            {'id': f"aud-corbin-{ep['ep']:02d}"},
            {'$set': audio_doc},
            upsert=True
        )
    logger.info("Henry Corbin audio episodes created/updated")

    # 8. Reassign existing Philosophie islamique courses to Meryem Sebti (except Corbin's)
    phil_update = await db.courses.update_many(
        {'topic': 'Philosophie islamique', 'scholar_id': {'$nin': ['sch-006', 'sch-007']}},
        {'$set': {'scholar_id': 'sch-006', 'scholar_name': 'Prof. Meryem Sebti'}}
    )
    if phil_update.modified_count > 0:
        logger.info(f"Reassigned {phil_update.modified_count} philosophy courses to Meryem Sebti")

    logger.info("Database seeding complete")

# ─── Admin Routes ─────────────────────────────────────────────────────────────

# Admin: Stats
@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    audios_total = await db.audios.count_documents({})
    audios_active = await db.audios.count_documents({'is_active': True})
    scholars_total = await db.scholars.count_documents({})
    courses_total = await db.courses.count_documents({})
    courses_active = await db.courses.count_documents({'is_active': True})
    users_total = await db.users.count_documents({})
    return {
        'audios': {'total': audios_total, 'active': audios_active},
        'scholars': {'total': scholars_total},
        'courses': {'total': courses_total, 'active': courses_active},
        'users': {'total': users_total},
    }

# Admin: Audio CRUD
@api_router.get("/admin/audios")
async def admin_list_audios(request: Request):
    await require_admin(request)
    audios = await db.audios.find({}, {'_id': 0}).to_list(500)
    for a in audios:
        a['stream_url'] = resolve_audio_url(a)
    return audios

@api_router.post("/admin/audios")
async def admin_create_audio(body: AudioCreate, request: Request):
    await require_admin(request)
    audio_id = f"aud-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    doc = {**body.model_dump(), 'id': audio_id, 'published_at': now.isoformat()}
    await db.audios.insert_one(doc)
    doc.pop('_id', None)
    doc['stream_url'] = resolve_audio_url(doc)
    return doc

@api_router.put("/admin/audios/{audio_id}")
async def admin_update_audio(audio_id: str, body: AudioUpdate, request: Request):
    await require_admin(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Aucune mise à jour fournie")
    result = await db.audios.update_one({'id': audio_id}, {'$set': update})
    if result.matched_count == 0:
        raise HTTPException(404, "Audio non trouvé")
    doc = await db.audios.find_one({'id': audio_id}, {'_id': 0})
    doc['stream_url'] = resolve_audio_url(doc)
    return doc

@api_router.delete("/admin/audios/{audio_id}")
async def admin_delete_audio(audio_id: str, request: Request):
    await require_admin(request)
    result = await db.audios.delete_one({'id': audio_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Audio non trouvé")
    return {'message': 'Audio supprimé'}

@api_router.patch("/admin/audios/{audio_id}/toggle")
async def admin_toggle_audio(audio_id: str, request: Request):
    await require_admin(request)
    doc = await db.audios.find_one({'id': audio_id})
    if not doc:
        raise HTTPException(404, "Audio non trouvé")
    new_status = not doc.get('is_active', True)
    await db.audios.update_one({'id': audio_id}, {'$set': {'is_active': new_status}})
    return {'id': audio_id, 'is_active': new_status}

# Admin: Scholar CRUD
@api_router.get("/admin/scholars")
async def admin_list_scholars(request: Request):
    await require_admin(request)
    scholars = await db.scholars.find({}, {'_id': 0}).to_list(100)
    return scholars

@api_router.post("/admin/scholars")
async def admin_create_scholar(body: ScholarCreate, request: Request):
    await require_admin(request)
    scholar_id = f"sch-{uuid.uuid4().hex[:6]}"
    doc = {**body.model_dump(), 'id': scholar_id, 'content_count': 0, 'is_active': True}
    await db.scholars.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put("/admin/scholars/{scholar_id}")
async def admin_update_scholar(scholar_id: str, body: ScholarUpdate, request: Request):
    await require_admin(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Aucune mise à jour fournie")
    result = await db.scholars.update_one({'id': scholar_id}, {'$set': update})
    if result.matched_count == 0:
        raise HTTPException(404, "Érudit non trouvé")
    doc = await db.scholars.find_one({'id': scholar_id}, {'_id': 0})
    return doc

@api_router.delete("/admin/scholars/{scholar_id}")
async def admin_delete_scholar(scholar_id: str, request: Request):
    await require_admin(request)
    result = await db.scholars.delete_one({'id': scholar_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Érudit non trouvé")
    return {'message': 'Érudit supprimé'}

# Admin: Course CRUD
@api_router.get("/admin/courses")
async def admin_list_courses(request: Request):
    await require_admin(request)
    courses = await db.courses.find({}, {'_id': 0}).to_list(200)
    # Count modules for each course
    for c in courses:
        c['module_count'] = await db.modules.count_documents({'course_id': c['id']})
    return courses

@api_router.post("/admin/courses")
async def admin_create_course(body: CourseCreate, request: Request):
    await require_admin(request)
    course_id = f"crs-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    doc = {**body.model_dump(), 'id': course_id, 'type': 'course', 'published_at': now.isoformat(), 'is_active': True}
    await db.courses.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put("/admin/courses/{course_id}")
async def admin_update_course(course_id: str, body: CourseUpdate, request: Request):
    await require_admin(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "Aucune mise à jour fournie")
    result = await db.courses.update_one({'id': course_id}, {'$set': update})
    if result.matched_count == 0:
        raise HTTPException(404, "Cours non trouvé")
    doc = await db.courses.find_one({'id': course_id}, {'_id': 0})
    return doc

@api_router.delete("/admin/courses/{course_id}")
async def admin_delete_course(course_id: str, request: Request):
    await require_admin(request)
    result = await db.courses.delete_one({'id': course_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Cours non trouvé")
    return {'message': 'Cours supprimé'}

@api_router.patch("/admin/courses/{course_id}/toggle")
async def admin_toggle_course(course_id: str, request: Request):
    await require_admin(request)
    doc = await db.courses.find_one({'id': course_id})
    if not doc:
        raise HTTPException(404, "Cours non trouvé")
    new_status = not doc.get('is_active', True)
    await db.courses.update_one({'id': course_id}, {'$set': {'is_active': new_status}})
    return {'id': course_id, 'is_active': new_status}

# ─── R2 Folder Sync for Courses ───────────────────────────────────────────────

class SyncR2FolderRequest(BaseModel):
    r2_folder: str  # e.g. "Philosophie" or "Henry Corbin"

@api_router.get("/admin/r2/folders")
async def list_r2_folders(request: Request):
    """List all folders (prefixes) in the R2 bucket."""
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    try:
        # List objects and extract unique folder prefixes
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, MaxKeys=1000)
        folders = set()
        for obj in response.get('Contents', []):
            key = obj['Key']
            if '/' in key:
                folder = key.split('/')[0]
                folders.add(folder)
        return {'folders': sorted(list(folders)), 'bucket': R2_BUCKET}
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.get("/admin/r2/folder/{folder_name}/files")
async def list_r2_folder_files(folder_name: str, request: Request):
    """List all audio files in a specific R2 folder."""
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    try:
        prefix = f"{folder_name}/"
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix, MaxKeys=500)
        files = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            size = obj['Size']
            if size > 0:  # Skip folder markers
                filename = key.replace(prefix, '')
                files.append({
                    'key': key,
                    'filename': filename,
                    'size': size,
                    'size_mb': round(size / (1024*1024), 1),
                })
        # Sort by filename to get proper episode order
        files.sort(key=lambda x: x['filename'])
        return {'folder': folder_name, 'files': files, 'count': len(files)}
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.post("/admin/courses/{course_id}/sync-r2")
async def sync_course_with_r2(course_id: str, body: SyncR2FolderRequest, request: Request):
    """
    Sync a course with an R2 folder: scan the folder and create audio episodes.
    Episodes are created based on files matching pattern: *_episode{N}.m4a or *_episode{N}.mp3
    """
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Get the course
    course = await db.courses.find_one({'id': course_id})
    if not course:
        raise HTTPException(404, "Cours non trouvé")
    
    r2_folder = body.r2_folder.strip()
    if not r2_folder:
        raise HTTPException(400, "Dossier R2 requis")
    
    try:
        # List files in the R2 folder
        prefix = f"{r2_folder}/"
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix, MaxKeys=500)
        
        files = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            size = obj['Size']
            if size > 0:
                filename = key.replace(prefix, '')
                # Extract episode number from filename (e.g., "Cycle_Philosophie_episode1.m4a" -> 1)
                import re
                match = re.search(r'episode(\d+)', filename, re.IGNORECASE)
                if match:
                    ep_num = int(match.group(1))
                    files.append({
                        'key': key,
                        'filename': filename,
                        'size': size,
                        'episode_number': ep_num,
                    })
        
        if not files:
            raise HTTPException(400, f"Aucun fichier d'épisode trouvé dans '{r2_folder}/'")
        
        # Sort by episode number
        files.sort(key=lambda x: x['episode_number'])
        
        # Create or update audio entries for each episode
        created = 0
        updated = 0
        now = datetime.now(timezone.utc)
        
        for f in files:
            audio_id = f"aud-{course_id.replace('crs-', '')}-{f['episode_number']:02d}"
            
            audio_doc = {
                'id': audio_id,
                'title': f"Épisode {f['episode_number']} — {course['title']}",
                'description': f"{course['title']}, épisode {f['episode_number']}.",
                'scholar_id': course.get('scholar_id', ''),
                'scholar_name': course.get('scholar_name', ''),
                'duration': 0,  # Unknown duration
                'audio_url': '',
                'file_key': f['key'],
                'thumbnail': course.get('thumbnail', ''),
                'topic': course.get('topic', ''),
                'type': 'lecture',
                'course_id': course_id,
                'episode_number': f['episode_number'],
                'published_at': now.isoformat(),
                'is_active': True,
            }
            
            result = await db.audios.update_one(
                {'id': audio_id},
                {'$set': audio_doc},
                upsert=True
            )
            
            if result.upserted_id:
                created += 1
            elif result.modified_count > 0:
                updated += 1
        
        # Update the course with r2_folder and modules_count
        await db.courses.update_one(
            {'id': course_id},
            {'$set': {
                'r2_folder': r2_folder,
                'modules_count': len(files),
            }}
        )
        
        return {
            'message': f"Synchronisation terminée pour '{r2_folder}'",
            'course_id': course_id,
            'r2_folder': r2_folder,
            'episodes_created': created,
            'episodes_updated': updated,
            'total_episodes': len(files),
        }
        
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.get("/admin/courses/{course_id}/episodes")
async def get_course_episodes(course_id: str, request: Request):
    """Get all audio episodes linked to a course."""
    await require_admin(request)
    episodes = await db.audios.find(
        {'course_id': course_id},
        {'_id': 0}
    ).sort('episode_number', 1).to_list(100)
    
    for ep in episodes:
        ep['stream_url'] = resolve_audio_url(ep)
    
    return {'course_id': course_id, 'episodes': episodes, 'count': len(episodes)}

# ─── Admin: Scholar Toggle ─────────────────────────────────────────────────────

@api_router.patch("/admin/scholars/{scholar_id}/toggle")
async def admin_toggle_scholar(scholar_id: str, request: Request):
    await require_admin(request)
    doc = await db.scholars.find_one({'id': scholar_id})
    if not doc:
        raise HTTPException(404, "Érudit non trouvé")
    new_status = not doc.get('is_active', True)
    await db.scholars.update_one({'id': scholar_id}, {'$set': {'is_active': new_status}})
    return {'id': scholar_id, 'is_active': new_status}

# ─── Admin: User Management ────────────────────────────────────────────────────

@api_router.get("/admin/users")
async def admin_list_users(request: Request):
    await require_admin(request)
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(500)
    return users

@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, request: Request):
    await require_admin(request)
    user = await db.users.find_one({'user_id': user_id}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")
    return user

@api_router.post("/admin/users/{user_id}/grant-access")
async def admin_grant_free_access(user_id: str, request: Request):
    """Grant free access to a user."""
    await require_admin(request)
    now = datetime.now(timezone.utc)
    result = await db.users.update_one(
        {'user_id': user_id},
        {'$set': {
            'free_access': True,
            'has_free_access': True,  # For backwards compatibility
            'free_access_granted_at': now.isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Utilisateur non trouvé")
    logger.info(f"Free access granted to user {user_id}")
    return {'message': 'Accès gratuit accordé', 'user_id': user_id}

@api_router.post("/admin/users/{user_id}/revoke-access")
async def admin_revoke_access(user_id: str, request: Request):
    """Revoke all access from a user (free access and subscription)."""
    await require_admin(request)
    result = await db.users.update_one(
        {'user_id': user_id},
        {
            '$set': {'free_access': False, 'has_free_access': False},
            '$unset': {'free_access_granted_at': '', 'subscription': '', 'trial': ''}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Utilisateur non trouvé")
    return {'message': 'Accès révoqué', 'user_id': user_id}

class ExtendSubscriptionRequest(BaseModel):
    days: int

class GrantSubscriptionRequest(BaseModel):
    plan_id: str  # monthly or annual

@api_router.post("/admin/users/{user_id}/extend-subscription")
async def admin_extend_subscription(user_id: str, body: ExtendSubscriptionRequest, request: Request):
    """Extend a user's subscription by a number of days."""
    await require_admin(request)
    user = await db.users.find_one({'user_id': user_id})
    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")
    
    now = datetime.now(timezone.utc)
    current_expires = None
    
    def parse_date(date_val):
        """Parse a date value to a timezone-aware datetime."""
        if date_val is None:
            return None
        if isinstance(date_val, datetime):
            if date_val.tzinfo is None:
                return date_val.replace(tzinfo=timezone.utc)
            return date_val
        if isinstance(date_val, str):
            try:
                dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except:
                return None
        return None
    
    # Check if user has an existing subscription or trial
    if user.get('subscription') and user['subscription'].get('expires_at'):
        current_expires = parse_date(user['subscription']['expires_at'])
    elif user.get('trial') and user['trial'].get('expires_at'):
        current_expires = parse_date(user['trial']['expires_at'])
    
    # Calculate new expiration date
    if current_expires and current_expires > now:
        # Extend from current expiration
        new_expires = current_expires + timedelta(days=body.days)
    else:
        # Start fresh from now
        new_expires = now + timedelta(days=body.days)
    
    # Update subscription
    await db.users.update_one(
        {'user_id': user_id},
        {'$set': {
            'subscription': {
                'plan_id': user.get('subscription', {}).get('plan_id', 'manual'),
                'expires_at': new_expires.isoformat(),
                'status': 'active',
                'extended_by_admin': True,
                'extended_at': now.isoformat()
            }
        }}
    )
    
    logger.info(f"Subscription extended for user {user_id} by {body.days} days until {new_expires.isoformat()}")
    return {
        'message': f'Abonnement prolongé de {body.days} jours',
        'user_id': user_id,
        'new_expires_at': new_expires.isoformat()
    }

@api_router.post("/admin/users/{user_id}/grant-subscription")
async def admin_grant_subscription(user_id: str, body: GrantSubscriptionRequest, request: Request):
    """Grant a subscription to a user (monthly or annual)."""
    await require_admin(request)
    user = await db.users.find_one({'user_id': user_id})
    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")
    
    now = datetime.now(timezone.utc)
    
    # Determine duration based on plan
    if body.plan_id == 'annual':
        days = 365
        plan_name = 'Annuel'
    else:  # monthly
        days = 30
        plan_name = 'Mensuel'
    
    expires_at = now + timedelta(days=days)
    
    # Update user with new subscription
    await db.users.update_one(
        {'user_id': user_id},
        {'$set': {
            'subscription': {
                'plan_id': body.plan_id,
                'plan_name': plan_name,
                'expires_at': expires_at.isoformat(),
                'status': 'active',
                'granted_by_admin': True,
                'granted_at': now.isoformat()
            }
        }}
    )
    
    logger.info(f"Subscription {body.plan_id} granted to user {user_id} until {expires_at.isoformat()}")
    return {
        'message': f'Abonnement {plan_name} accordé',
        'user_id': user_id,
        'expires_at': expires_at.isoformat()
    }

# ─── Admin: Thematiques CRUD ───────────────────────────────────────────────────

# ─── Admin: Cursus CRUD (was Thematiques) ──────────────────────────────────────

@api_router.get("/admin/cursus")
async def admin_list_cursus(request: Request):
    """List all cursus (was thematiques)."""
    await require_admin(request)
    cursus_list = await db.cursus.find({}, {'_id': 0}).sort('order', 1).to_list(100)
    # Count courses for each cursus
    for c in cursus_list:
        c['course_count'] = await db.courses.count_documents({'cursus_id': c['id']})
    return cursus_list

# Keep old endpoint for compatibility
@api_router.get("/admin/thematiques")
async def admin_list_thematiques_compat(request: Request):
    """Compatibility endpoint - redirects to cursus."""
    return await admin_list_cursus(request)

@api_router.get("/cursus")
async def public_list_cursus():
    """Public endpoint to list active cursus."""
    cursus_list = await db.cursus.find({'is_active': True}, {'_id': 0}).sort('order', 1).to_list(100)
    return cursus_list

@api_router.get("/thematiques")
async def public_list_thematiques_compat():
    """Compatibility endpoint."""
    return await public_list_cursus()

@api_router.post("/admin/cursus")
async def admin_create_cursus(body: CursusCreate, request: Request):
    await require_admin(request)
    cursus_id = f"cursus_{uuid.uuid4().hex[:8]}"
    last = await db.cursus.find_one(sort=[('order', -1)])
    next_order = (last.get('order', 0) + 1) if last else 1
    
    doc = {
        'id': cursus_id,
        'name': body.name,
        'description': body.description,
        'icon': body.icon,
        'order': body.order or next_order,
        'is_active': body.is_active,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.cursus.insert_one(doc)
    return {'message': 'Cursus créé', 'id': cursus_id, 'cursus': {k: v for k, v in doc.items() if k != '_id'}}

@api_router.put("/admin/cursus/{cursus_id}")
async def admin_update_cursus(cursus_id: str, body: CursusUpdate, request: Request):
    await require_admin(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        update['updated_at'] = datetime.now(timezone.utc).isoformat()
        result = await db.cursus.update_one({'id': cursus_id}, {'$set': update})
        if result.matched_count == 0:
            raise HTTPException(404, "Cursus non trouvé")
    return {'message': 'Cursus mis à jour', 'id': cursus_id}

@api_router.delete("/admin/cursus/{cursus_id}")
async def admin_delete_cursus(cursus_id: str, request: Request):
    await require_admin(request)
    # Check for linked courses
    course_count = await db.courses.count_documents({'cursus_id': cursus_id})
    if course_count > 0:
        raise HTTPException(400, f"Impossible de supprimer: {course_count} cours liés")
    result = await db.cursus.delete_one({'id': cursus_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Cursus non trouvé")
    return {'message': 'Cursus supprimé'}

@api_router.patch("/admin/cursus/{cursus_id}/toggle")
async def admin_toggle_cursus(cursus_id: str, request: Request):
    await require_admin(request)
    doc = await db.cursus.find_one({'id': cursus_id})
    if not doc:
        raise HTTPException(404, "Cursus non trouvé")
    new_status = not doc.get('is_active', False)
    await db.cursus.update_one({'id': cursus_id}, {'$set': {'is_active': new_status}})
    return {'id': cursus_id, 'is_active': new_status}

@api_router.post("/admin/cursus/bulk-toggle")
async def admin_bulk_toggle_cursus(body: BulkToggleRequest, request: Request):
    """Toggle multiple cursus at once."""
    await require_admin(request)
    result = await db.cursus.update_many(
        {'id': {'$in': body.ids}},
        {'$set': {'is_active': body.is_active, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'message': f'{result.modified_count} cursus mis à jour', 'is_active': body.is_active}

# ─── Admin: Modules CRUD ───────────────────────────────────────────────────────

@api_router.get("/admin/modules")
async def admin_list_modules(request: Request, course_id: Optional[str] = None):
    """List all modules, optionally filtered by course_id."""
    await require_admin(request)
    query = {}
    if course_id:
        query['course_id'] = course_id
    modules = await db.modules.find(query, {'_id': 0}).sort('order', 1).to_list(500)
    # Count episodes for each module
    for m in modules:
        m['episode_count_actual'] = await db.audios.count_documents({'module_id': m['id']})
    return modules

@api_router.get("/modules")
async def public_list_modules(course_id: Optional[str] = None):
    """Public endpoint to list active modules."""
    query = {'is_active': True}
    if course_id:
        query['course_id'] = course_id
    modules = await db.modules.find(query, {'_id': 0}).sort('order', 1).to_list(500)
    return modules

@api_router.post("/admin/modules")
async def admin_create_module(body: ModuleCreate, request: Request):
    await require_admin(request)
    module_id = f"mod_{uuid.uuid4().hex[:8]}"
    # Get max order for this course
    last = await db.modules.find_one({'course_id': body.course_id}, sort=[('order', -1)])
    next_order = (last.get('order', 0) + 1) if last else 1
    
    doc = {
        'id': module_id,
        'name': body.name,
        'description': body.description,
        'course_id': body.course_id,
        'scholar_name': body.scholar_name,
        'order': body.order or next_order,
        'episode_count': body.episode_count,
        'is_active': body.is_active,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.modules.insert_one(doc)
    return {'message': 'Module créé', 'id': module_id, 'module': {k: v for k, v in doc.items() if k != '_id'}}

@api_router.put("/admin/modules/{module_id}")
async def admin_update_module(module_id: str, body: ModuleUpdate, request: Request):
    await require_admin(request)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        update['updated_at'] = datetime.now(timezone.utc).isoformat()
        result = await db.modules.update_one({'id': module_id}, {'$set': update})
        if result.matched_count == 0:
            raise HTTPException(404, "Module non trouvé")
    return {'message': 'Module mis à jour', 'id': module_id}

@api_router.delete("/admin/modules/{module_id}")
async def admin_delete_module(module_id: str, request: Request):
    await require_admin(request)
    # Check for linked audios
    audio_count = await db.audios.count_documents({'module_id': module_id})
    if audio_count > 0:
        raise HTTPException(400, f"Impossible de supprimer: {audio_count} épisodes liés")
    result = await db.modules.delete_one({'id': module_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Module non trouvé")
    return {'message': 'Module supprimé'}

@api_router.patch("/admin/modules/{module_id}/toggle")
async def admin_toggle_module(module_id: str, request: Request):
    await require_admin(request)
    doc = await db.modules.find_one({'id': module_id})
    if not doc:
        raise HTTPException(404, "Module non trouvé")
    new_status = not doc.get('is_active', False)
    await db.modules.update_one({'id': module_id}, {'$set': {'is_active': new_status}})
    return {'id': module_id, 'is_active': new_status}

@api_router.post("/admin/modules/bulk-toggle")
async def admin_bulk_toggle_modules(body: BulkToggleRequest, request: Request):
    """Toggle multiple modules at once."""
    await require_admin(request)
    result = await db.modules.update_many(
        {'id': {'$in': body.ids}},
        {'$set': {'is_active': body.is_active, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'message': f'{result.modified_count} modules mis à jour', 'is_active': body.is_active}

# ─── Admin: Courses Bulk Actions ───────────────────────────────────────────────

@api_router.post("/admin/courses/bulk-toggle")
async def admin_bulk_toggle_courses(body: BulkToggleRequest, request: Request):
    """Toggle multiple courses at once."""
    await require_admin(request)
    result = await db.courses.update_many(
        {'id': {'$in': body.ids}},
        {'$set': {'is_active': body.is_active, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return {'message': f'{result.modified_count} cours mis à jour', 'is_active': body.is_active}

# ─── Admin: Bibliographies CRUD ────────────────────────────────────────────────

@api_router.get("/admin/bibliographies")
async def admin_list_bibliographies(request: Request):
    await require_admin(request)
    biblio = await db.bibliographies.find({}, {'_id': 0}).to_list(100)
    return biblio

@api_router.post("/admin/bibliographies")
async def admin_create_bibliography(request: Request):
    await require_admin(request)
    body = await request.json()
    biblio_id = f"biblio_{uuid.uuid4().hex[:8]}"
    doc = {
        'id': biblio_id,
        'title': body['title'],
        'thematique_id': body.get('thematique_id', ''),
        'content_fr': body.get('content_fr', ''),
        'content_en': body.get('content_en', ''),
        'is_active': True,
        'created_at': datetime.now(timezone.utc)
    }
    await db.bibliographies.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put("/admin/bibliographies/{biblio_id}")
async def admin_update_bibliography(biblio_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ['title', 'thematique_id', 'content_fr', 'content_en', 'is_active']}
    update['updated_at'] = datetime.now(timezone.utc)
    result = await db.bibliographies.update_one({'id': biblio_id}, {'$set': update})
    if result.matched_count == 0:
        raise HTTPException(404, "Bibliographie non trouvée")
    return {'message': 'Bibliographie mise à jour', 'id': biblio_id}

@api_router.delete("/admin/bibliographies/{biblio_id}")
async def admin_delete_bibliography(biblio_id: str, request: Request):
    await require_admin(request)
    result = await db.bibliographies.delete_one({'id': biblio_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Bibliographie non trouvée")
    return {'message': 'Bibliographie supprimée'}

# ─── Admin: Masterclasses CRUD ─────────────────────────────────────────────────

@api_router.get("/admin/masterclasses")
async def admin_list_masterclasses(request: Request):
    await require_admin(request)
    mcs = await db.masterclasses.find({}, {'_id': 0}).to_list(100)
    return mcs

@api_router.post("/admin/masterclasses")
async def admin_create_masterclass(request: Request):
    await require_admin(request)
    body = await request.json()
    mc_id = f"mc_{uuid.uuid4().hex[:8]}"
    doc = {
        'id': mc_id,
        'title': body['title'],
        'description': body.get('description', ''),
        'thematique_id': body.get('thematique_id', ''),
        'scholar_id': body.get('scholar_id', ''),
        'scholar_name': body.get('scholar_name', ''),
        'date': body.get('date'),
        'duration': body.get('duration', 60),
        'price': body.get('price', 0),
        'price_type': 'free' if body.get('price', 0) == 0 else 'paid',
        'max_participants': body.get('max_participants', 100),
        'current_participants': 0,
        'thumbnail': body.get('thumbnail', ''),
        'video_url': body.get('video_url', ''),
        'registered_users': [],
        'is_active': True,
        'created_at': datetime.now(timezone.utc)
    }
    await db.masterclasses.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put("/admin/masterclasses/{mc_id}")
async def admin_update_masterclass(mc_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    allowed = ['title', 'description', 'thematique_id', 'scholar_id', 'scholar_name', 'date', 
               'duration', 'price', 'max_participants', 'thumbnail', 'video_url', 'is_active']
    update = {k: v for k, v in body.items() if k in allowed}
    if 'price' in update:
        update['price_type'] = 'free' if update['price'] == 0 else 'paid'
    update['updated_at'] = datetime.now(timezone.utc)
    result = await db.masterclasses.update_one({'id': mc_id}, {'$set': update})
    if result.matched_count == 0:
        raise HTTPException(404, "Masterclass non trouvée")
    return {'message': 'Masterclass mise à jour', 'id': mc_id}

@api_router.delete("/admin/masterclasses/{mc_id}")
async def admin_delete_masterclass(mc_id: str, request: Request):
    await require_admin(request)
    result = await db.masterclasses.delete_one({'id': mc_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Masterclass non trouvée")
    return {'message': 'Masterclass supprimée'}

@api_router.patch("/admin/masterclasses/{mc_id}/toggle")
async def admin_toggle_masterclass(mc_id: str, request: Request):
    await require_admin(request)
    doc = await db.masterclasses.find_one({'id': mc_id})
    if not doc:
        raise HTTPException(404, "Masterclass non trouvée")
    new_status = not doc.get('is_active', True)
    await db.masterclasses.update_one({'id': mc_id}, {'$set': {'is_active': new_status}})
    return {'id': mc_id, 'is_active': new_status}

# ─── Admin: Audio Categories CRUD ─────────────────────────────────────────────

@api_router.get("/admin/audio-categories")
async def admin_list_audio_categories(request: Request):
    """List all audio categories."""
    await require_admin(request)
    categories = await db.audio_categories.find({}, {'_id': 0}).to_list(100)
    return categories

@api_router.get("/audio-categories")
async def public_list_audio_categories():
    """Public endpoint to list active audio categories."""
    categories = await db.audio_categories.find({'is_active': True}, {'_id': 0}).to_list(100)
    return categories

@api_router.post("/admin/audio-categories")
async def admin_create_audio_category(body: AudioCategoryCreate, request: Request):
    """Create a new audio category."""
    await require_admin(request)
    cat_id = f"cat_{uuid.uuid4().hex[:8]}"
    doc = {
        'id': cat_id,
        **body.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.audio_categories.insert_one(doc)
    logger.info(f"Audio category '{body.name}' created with id {cat_id}")
    return {'message': 'Catégorie créée', 'id': cat_id, 'category': {**doc, '_id': None}}

@api_router.put("/admin/audio-categories/{cat_id}")
async def admin_update_audio_category(cat_id: str, body: AudioCategoryUpdate, request: Request):
    """Update an audio category."""
    await require_admin(request)
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        result = await db.audio_categories.update_one({'id': cat_id}, {'$set': update_data})
        if result.matched_count == 0:
            raise HTTPException(404, "Catégorie non trouvée")
    doc = await db.audio_categories.find_one({'id': cat_id}, {'_id': 0})
    return {'message': 'Catégorie mise à jour', 'id': cat_id, 'category': doc}

@api_router.delete("/admin/audio-categories/{cat_id}")
async def admin_delete_audio_category(cat_id: str, request: Request):
    """Delete an audio category."""
    await require_admin(request)
    # Check if any audios use this category
    audios_count = await db.audios.count_documents({'category_id': cat_id})
    if audios_count > 0:
        raise HTTPException(400, f"Impossible de supprimer: {audios_count} audio(s) utilisent cette catégorie")
    result = await db.audio_categories.delete_one({'id': cat_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Catégorie non trouvée")
    return {'message': 'Catégorie supprimée'}

@api_router.patch("/admin/audio-categories/{cat_id}/toggle")
async def admin_toggle_audio_category(cat_id: str, request: Request):
    """Toggle audio category active status."""
    await require_admin(request)
    doc = await db.audio_categories.find_one({'id': cat_id})
    if not doc:
        raise HTTPException(404, "Catégorie non trouvée")
    new_status = not doc.get('is_active', True)
    await db.audio_categories.update_one({'id': cat_id}, {'$set': {'is_active': new_status}})
    return {'id': cat_id, 'is_active': new_status}

@api_router.get("/audios/by-category/{cat_id}")
async def get_audios_by_category(cat_id: str):
    """Get all audios in a specific category."""
    audios = await db.audios.find({'category_id': cat_id, 'is_active': True}, {'_id': 0}).to_list(100)
    for a in audios:
        a['stream_url'] = resolve_audio_url(a)
    return audios

# ─── Admin: Set Featured Course ─────────────────────────────────────────────────

@api_router.patch("/admin/courses/{course_id}/set-featured")
async def admin_set_featured_course(course_id: str, request: Request):
    """Set a course as the featured course (only one can be featured at a time)."""
    await require_admin(request)
    
    # First, unfeature all courses
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
    
    # Then feature the selected course
    result = await db.courses.update_one(
        {'id': course_id}, 
        {'$set': {'is_featured': True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Cours non trouvé")
    
    logger.info(f"Course {course_id} set as featured")
    return {'message': 'Cours mis en avant', 'id': course_id}

@api_router.delete("/admin/courses/featured")
async def admin_remove_featured_course(request: Request):
    """Remove the featured status from all courses."""
    await require_admin(request)
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
    return {'message': 'Aucun cours mis en avant'}

# ─── Admin Panel Web Routes ────────────────────────────────────────────────────

ADMIN_TEMPLATES_DIR = ROOT_DIR / 'admin_templates'

@api_router.get("/admin-panel/login", response_class=HTMLResponse)
async def admin_panel_login():
    """Admin panel login page."""
    template_path = ADMIN_TEMPLATES_DIR / 'login.html'
    if not template_path.exists():
        raise HTTPException(404, "Template login non trouvé")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

@api_router.get("/admin-panel/", response_class=HTMLResponse)
async def admin_panel_dashboard():
    """Admin panel dashboard page."""
    template_path = ADMIN_TEMPLATES_DIR / 'dashboard.html'
    if not template_path.exists():
        raise HTTPException(404, "Template dashboard non trouvé")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

@api_router.get("/admin-panel/scholars", response_class=HTMLResponse)
async def admin_panel_scholars():
    """Admin panel scholars page - redirect to professors."""
    template_path = ADMIN_TEMPLATES_DIR / 'professors.html'
    if not template_path.exists():
        raise HTTPException(404, "Template professors non trouve")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

@api_router.get("/admin-panel/professors", response_class=HTMLResponse)
async def admin_panel_professors():
    """Admin panel professors page."""
    template_path = ADMIN_TEMPLATES_DIR / 'professors.html'
    if not template_path.exists():
        raise HTTPException(404, "Template professors non trouve")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

@api_router.get("/admin-panel/courses", response_class=HTMLResponse)
async def admin_panel_courses():
    """Admin panel courses page."""
    template_path = ADMIN_TEMPLATES_DIR / 'courses.html'
    if not template_path.exists():
        raise HTTPException(404, "Template courses non trouvé")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

@api_router.get("/admin-panel/users", response_class=HTMLResponse)
async def admin_panel_users():
    """Admin panel users page."""
    template_path = ADMIN_TEMPLATES_DIR / 'users.html'
    if not template_path.exists():
        raise HTTPException(404, "Template users non trouvé")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

@api_router.get("/admin-panel/audios", response_class=HTMLResponse)
async def admin_panel_audios():
    """Admin panel audios page - redirect to scholars for now."""
    template_path = ADMIN_TEMPLATES_DIR / 'audios.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    # Fallback to dashboard
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/articles", response_class=HTMLResponse)
async def admin_panel_articles():
    """Admin panel articles page."""
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/thematiques", response_class=HTMLResponse)
async def admin_panel_thematiques():
    """Admin panel thematiques page - redirects to cursus."""
    template_path = ADMIN_TEMPLATES_DIR / 'cursus.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/cursus", response_class=HTMLResponse)
async def admin_panel_cursus():
    """Admin panel cursus page."""
    template_path = ADMIN_TEMPLATES_DIR / 'cursus.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/modules", response_class=HTMLResponse)
async def admin_panel_modules():
    """Admin panel modules page."""
    template_path = ADMIN_TEMPLATES_DIR / 'modules.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/bibliographies", response_class=HTMLResponse)
async def admin_panel_bibliographies():
    """Admin panel bibliographies page."""
    template_path = ADMIN_TEMPLATES_DIR / 'bibliographies.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/masterclasses", response_class=HTMLResponse)
async def admin_panel_masterclasses():
    """Admin panel masterclasses page."""
    template_path = ADMIN_TEMPLATES_DIR / 'masterclasses.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/audio-categories", response_class=HTMLResponse)
async def admin_panel_audio_categories():
    """Admin panel audio categories page."""
    template_path = ADMIN_TEMPLATES_DIR / 'audio-categories.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

@api_router.get("/admin-panel/r2", response_class=HTMLResponse)
async def admin_panel_r2():
    """Admin panel R2 storage page."""
    template_path = ADMIN_TEMPLATES_DIR / 'r2.html'
    if template_path.exists():
        return HTMLResponse(content=template_path.read_text(encoding='utf-8'))
    return HTMLResponse(content=(ADMIN_TEMPLATES_DIR / 'dashboard.html').read_text(encoding='utf-8'))

# ─── Payment & Subscription Routes ─────────────────────────────────────────────

async def check_user_access(user_id: str, content_type: str = None, content_id: str = None) -> dict:
    """Check if user has access to content (subscription, purchase, or trial)."""
    user = await db.users.find_one({'user_id': user_id}, {'_id': 0})
    if not user:
        return {'has_access': False, 'reason': 'user_not_found'}
    
    # Admin or free_access users have full access
    if user.get('role') == 'admin' or user.get('free_access'):
        return {'has_access': True, 'reason': 'admin_or_free'}
    
    now = datetime.now(timezone.utc)
    
    # Check active free trial
    trial = user.get('trial')
    if trial and trial.get('expires_at'):
        expires_at = trial['expires_at']
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expires_at > now:
            return {'has_access': True, 'reason': 'free_trial', 'expires_at': expires_at.isoformat()}
    
    # Check active subscription
    subscription = user.get('subscription')
    if subscription and subscription.get('expires_at'):
        expires_at = subscription['expires_at']
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expires_at > now:
            return {'has_access': True, 'reason': 'active_subscription', 'expires_at': expires_at.isoformat()}
    
    # Check specific content purchases
    if content_type and content_id:
        purchases = user.get('purchases', [])
        for purchase in purchases:
            if purchase.get('content_type') == content_type and purchase.get('content_id') == content_id:
                expires_at = purchase.get('expires_at')
                if isinstance(expires_at, str):
                    expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                if expires_at and expires_at > now:
                    return {'has_access': True, 'reason': 'content_purchase', 'expires_at': expires_at.isoformat()}
        
        # For courses, also check if parent cursus is purchased
        if content_type == 'course':
            course = await db.courses.find_one({'id': content_id}, {'thematique_id': 1})
            if course and course.get('thematique_id'):
                for purchase in purchases:
                    if purchase.get('content_type') == 'cursus' and purchase.get('content_id') == course['thematique_id']:
                        expires_at = purchase.get('expires_at')
                        if isinstance(expires_at, str):
                            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                        if expires_at and expires_at > now:
                            return {'has_access': True, 'reason': 'cursus_purchase', 'expires_at': expires_at.isoformat()}
    
    return {'has_access': False, 'reason': 'no_access'}

@api_router.get("/user/access")
async def get_user_access(request: Request, content_type: Optional[str] = None, content_id: Optional[str] = None):
    """Check user's access status."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    return await check_user_access(user['user_id'], content_type, content_id)

@api_router.delete("/user/delete-account")
async def delete_user_account(request: Request):
    """Delete the current user's account and all associated data."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    user_id = user['user_id']
    
    # Delete user data from various collections
    await db.user_favorites.delete_many({'user_id': user_id})
    await db.payment_transactions.delete_many({'user_id': user_id})
    
    # Delete the user account
    result = await db.users.delete_one({'user_id': user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(404, "Utilisateur non trouvé")
    
    logger.info(f"User account deleted: {user_id}")
    return {'message': 'Compte supprimé avec succès'}

@api_router.get("/plans")
async def get_plans():
    """Get all active subscription and purchase plans."""
    plans = await db.plans.find({'is_active': True}, {'_id': 0}).to_list(100)
    if not plans:
        # Return default plans if none configured
        return [
            {'plan_id': 'monthly', 'name': 'Abonnement Mensuel', 'price': 9.99, 'duration_days': 30, 'type': 'subscription', 'description': 'Acces illimite pendant 1 mois'},
            {'plan_id': 'annual', 'name': 'Abonnement Annuel', 'price': 89.99, 'duration_days': 365, 'type': 'subscription', 'description': 'Acces illimite pendant 1 an - Economisez 30%'},
        ]
    return plans

@api_router.post("/checkout/create")
async def create_checkout_session(body: CheckoutRequest, request: Request):
    """Create a Stripe checkout session for subscription or one-time purchase."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe non configure")
    
    # Determine what we're purchasing
    amount = 0.0
    product_name = ""
    metadata = {'user_id': user['user_id'], 'user_email': user.get('email', '')}
    duration_days = 0
    
    if body.plan_id:
        # Subscription plan
        plan = await db.plans.find_one({'plan_id': body.plan_id, 'is_active': True}, {'_id': 0})
        if not plan:
            # Check default plans
            if body.plan_id == 'monthly':
                plan = {'plan_id': 'monthly', 'name': 'Abonnement Mensuel', 'price': 9.99, 'duration_days': 30, 'type': 'subscription'}
            elif body.plan_id == 'annual':
                plan = {'plan_id': 'annual', 'name': 'Abonnement Annuel', 'price': 89.99, 'duration_days': 365, 'type': 'subscription'}
            else:
                raise HTTPException(404, "Plan non trouve")
        amount = float(plan['price'])
        product_name = plan['name']
        duration_days = plan.get('duration_days', 30)
        metadata['plan_id'] = body.plan_id
        metadata['purchase_type'] = 'subscription'
        metadata['duration_days'] = str(duration_days)
    
    elif body.course_id:
        # Course purchase (6 months access)
        course = await db.courses.find_one({'id': body.course_id}, {'_id': 0})
        if not course:
            raise HTTPException(404, "Cours non trouve")
        # Get course price from plans or use default
        course_plan = await db.plans.find_one({'plan_id': f'course_{body.course_id}'}, {'_id': 0})
        if course_plan:
            amount = float(course_plan['price'])
        else:
            amount = 19.99  # Default course price
        product_name = f"Cours: {course['title']}"
        duration_days = 180  # 6 months
        metadata['course_id'] = body.course_id
        metadata['purchase_type'] = 'course'
        metadata['duration_days'] = str(duration_days)
    
    elif body.cursus_id:
        # Cursus purchase (6 months access)
        cursus = await db.thematiques.find_one({'id': body.cursus_id}, {'_id': 0})
        if not cursus:
            raise HTTPException(404, "Cursus non trouve")
        # Get cursus price from plans or use default
        cursus_plan = await db.plans.find_one({'plan_id': f'cursus_{body.cursus_id}'}, {'_id': 0})
        if cursus_plan:
            amount = float(cursus_plan['price'])
        else:
            amount = 49.99  # Default cursus price
        product_name = f"Cursus: {cursus['name']}"
        duration_days = 180  # 6 months
        metadata['cursus_id'] = body.cursus_id
        metadata['purchase_type'] = 'cursus'
        metadata['duration_days'] = str(duration_days)
    
    else:
        raise HTTPException(400, "Veuillez specifier un plan, cours ou cursus")
    
    # Apply promo code if provided
    original_amount = amount
    promo_applied = None
    if body.promo_code:
        promo = await db.promo_codes.find_one({'code': body.promo_code.upper(), 'is_active': True}, {'_id': 0})
        if promo:
            # Validate promo code
            valid = True
            if promo.get('expires_at'):
                expires = promo['expires_at']
                if isinstance(expires, str):
                    expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
                if expires < datetime.now(timezone.utc):
                    valid = False
            if promo.get('max_uses') and promo.get('uses_count', 0) >= promo['max_uses']:
                valid = False
            applicable = promo.get('applicable_plans', [])
            if applicable and body.plan_id and body.plan_id not in applicable:
                valid = False
            
            if valid:
                if promo.get('discount_percent'):
                    discount = amount * (promo['discount_percent'] / 100)
                    amount = max(0, amount - discount)
                elif promo.get('discount_amount'):
                    amount = max(0, amount - promo['discount_amount'])
                
                promo_applied = promo['code']
                metadata['promo_code'] = promo['code']
                metadata['original_amount'] = str(original_amount)
                
                # Increment uses count
                await db.promo_codes.update_one({'code': promo['code']}, {'$inc': {'uses_count': 1}})
    
    # Build URLs
    success_url = f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/payment/cancel"
    
    # Create Stripe checkout session
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    try:
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store transaction
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
        await db.payment_transactions.insert_one({
            'transaction_id': transaction_id,
            'session_id': session.session_id,
            'user_id': user['user_id'],
            'user_email': user.get('email', ''),
            'amount': amount,
            'currency': 'eur',
            'product_name': product_name,
            'metadata': metadata,
            'status': 'pending',
            'payment_status': 'initiated',
            'created_at': datetime.now(timezone.utc)
        })
        
        return {'url': session.url, 'session_id': session.session_id}
    
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(500, f"Erreur de paiement: {str(e)}")

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Get checkout session status and update user access if paid."""
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe non configure")
    
    # Get transaction
    transaction = await db.payment_transactions.find_one({'session_id': session_id}, {'_id': 0})
    if not transaction:
        raise HTTPException(404, "Transaction non trouvee")
    
    # If already processed, return cached status
    if transaction.get('payment_status') == 'paid':
        return {
            'status': 'complete',
            'payment_status': 'paid',
            'amount_total': int(transaction['amount'] * 100),
            'currency': transaction['currency'],
            'metadata': transaction['metadata']
        }
    
    # Check with Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction
        await db.payment_transactions.update_one(
            {'session_id': session_id},
            {'$set': {'status': status.status, 'payment_status': status.payment_status, 'updated_at': datetime.now(timezone.utc)}}
        )
        
        # If paid, grant access
        if status.payment_status == 'paid' and transaction.get('payment_status') != 'paid':
            await grant_user_access(transaction)
        
        return {
            'status': status.status,
            'payment_status': status.payment_status,
            'amount_total': status.amount_total,
            'currency': status.currency,
            'metadata': status.metadata
        }
    
    except Exception as e:
        logger.error(f"Stripe status check error: {e}")
        raise HTTPException(500, f"Erreur: {str(e)}")

async def grant_user_access(transaction: dict):
    """Grant user access based on payment."""
    user_id = transaction['metadata'].get('user_id')
    if not user_id:
        return
    
    now = datetime.now(timezone.utc)
    duration_days = int(transaction['metadata'].get('duration_days', 30))
    expires_at = now + timedelta(days=duration_days)
    
    purchase_type = transaction['metadata'].get('purchase_type')
    
    if purchase_type == 'subscription':
        # Update subscription
        await db.users.update_one(
            {'user_id': user_id},
            {'$set': {
                'subscription': {
                    'plan_id': transaction['metadata'].get('plan_id'),
                    'started_at': now,
                    'expires_at': expires_at,
                    'transaction_id': transaction['transaction_id']
                }
            }}
        )
    
    elif purchase_type in ('course', 'cursus'):
        # Add to purchases
        content_type = purchase_type
        content_id = transaction['metadata'].get('course_id') or transaction['metadata'].get('cursus_id')
        
        purchase_record = {
            'content_type': content_type,
            'content_id': content_id,
            'purchased_at': now,
            'expires_at': expires_at,
            'transaction_id': transaction['transaction_id']
        }
        
        await db.users.update_one(
            {'user_id': user_id},
            {'$push': {'purchases': purchase_record}}
        )
    
    logger.info(f"Access granted to user {user_id}: {purchase_type}")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe non configure")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == 'paid':
            transaction = await db.payment_transactions.find_one({'session_id': webhook_response.session_id}, {'_id': 0})
            if transaction and transaction.get('payment_status') != 'paid':
                await db.payment_transactions.update_one(
                    {'session_id': webhook_response.session_id},
                    {'$set': {'status': 'complete', 'payment_status': 'paid', 'updated_at': datetime.now(timezone.utc)}}
                )
                await grant_user_access(transaction)
        
        return {'received': True}
    
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {'received': True, 'error': str(e)}

# ─── Admin: Plans CRUD ────────────────────────────────────────────────────────

@api_router.get("/admin/plans")
async def admin_get_plans(request: Request):
    """Get all plans (admin)."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    plans = await db.plans.find({}, {'_id': 0}).to_list(100)
    return plans

@api_router.post("/admin/plans")
async def admin_create_plan(plan: PlanCreate, request: Request):
    """Create a new plan."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    
    existing = await db.plans.find_one({'plan_id': plan.plan_id})
    if existing:
        raise HTTPException(400, "Ce plan existe deja")
    
    plan_doc = plan.model_dump()
    plan_doc['created_at'] = datetime.now(timezone.utc)
    await db.plans.insert_one(plan_doc)
    return {k: v for k, v in plan_doc.items() if k != '_id'}

@api_router.put("/admin/plans/{plan_id}")
async def admin_update_plan(plan_id: str, plan: PlanUpdate, request: Request):
    """Update a plan."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    
    updates = {k: v for k, v in plan.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Aucune modification")
    
    updates['updated_at'] = datetime.now(timezone.utc)
    result = await db.plans.update_one({'plan_id': plan_id}, {'$set': updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Plan non trouve")
    
    updated = await db.plans.find_one({'plan_id': plan_id}, {'_id': 0})
    return updated

@api_router.delete("/admin/plans/{plan_id}")
async def admin_delete_plan(plan_id: str, request: Request):
    """Delete a plan."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    
    result = await db.plans.delete_one({'plan_id': plan_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Plan non trouve")
    return {'message': 'Plan supprime'}

@api_router.get("/admin/transactions")
async def admin_get_transactions(request: Request, limit: int = 50):
    """Get recent transactions (admin)."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    transactions = await db.payment_transactions.find({}, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
    return transactions

@api_router.get("/admin-panel/pricing", response_class=HTMLResponse)
async def admin_panel_pricing():
    """Admin panel pricing management page."""
    template_path = ADMIN_TEMPLATES_DIR / 'pricing.html'
    if not template_path.exists():
        raise HTTPException(404, "Template pricing non trouve")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

# ─── Promo Codes & Free Trial ─────────────────────────────────────────────────

@api_router.post("/promo/validate")
async def validate_promo_code(code: str, plan_id: Optional[str] = None):
    """Validate a promo code and return discount info."""
    promo = await db.promo_codes.find_one({'code': code.upper(), 'is_active': True}, {'_id': 0})
    if not promo:
        raise HTTPException(404, "Code promo invalide")
    
    now = datetime.now(timezone.utc)
    
    # Check start date (if promo hasn't started yet)
    if promo.get('start_date'):
        start = promo['start_date']
        if isinstance(start, str):
            start = datetime.fromisoformat(start.replace('Z', '+00:00'))
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if start > now:
            raise HTTPException(400, "Code promo pas encore valide")
    
    # Check expiration
    if promo.get('expires_at'):
        expires = promo['expires_at']
        if isinstance(expires, str):
            expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < now:
            raise HTTPException(400, "Code promo expiré")
    
    # Check max uses
    if promo.get('max_uses') and promo.get('uses_count', 0) >= promo['max_uses']:
        raise HTTPException(400, "Code promo épuisé")
    
    # Check applicable plans
    applicable = promo.get('applicable_plans', [])
    if applicable and plan_id and plan_id not in applicable:
        raise HTTPException(400, "Code promo non applicable à ce plan")
    
    return {
        'valid': True,
        'code': promo['code'],
        'discount_percent': promo.get('discount_percent'),
        'discount_amount': promo.get('discount_amount'),
        'description': promo.get('description', ''),
        'start_date': promo.get('start_date'),
        'expires_at': promo.get('expires_at')
    }

@api_router.get("/admin/promo-codes")
async def admin_get_promo_codes(request: Request):
    """Get all promo codes (admin)."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    promos = await db.promo_codes.find({}, {'_id': 0}).to_list(100)
    return promos

@api_router.post("/admin/promo-codes")
async def admin_create_promo_code(promo: PromoCodeCreate, request: Request):
    """Create a new promo code."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    
    code = promo.code.upper().strip()
    existing = await db.promo_codes.find_one({'code': code})
    if existing:
        raise HTTPException(400, "Ce code existe deja")
    
    promo_doc = promo.model_dump()
    promo_doc['code'] = code
    promo_doc['uses_count'] = 0
    promo_doc['created_at'] = datetime.now(timezone.utc)
    
    await db.promo_codes.insert_one(promo_doc)
    return {k: v for k, v in promo_doc.items() if k != '_id'}

@api_router.put("/admin/promo-codes/{code}")
async def admin_update_promo_code(code: str, promo: PromoCodeUpdate, request: Request):
    """Update a promo code."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    
    updates = {k: v for k, v in promo.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Aucune modification")
    
    updates['updated_at'] = datetime.now(timezone.utc)
    result = await db.promo_codes.update_one({'code': code.upper()}, {'$set': updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Code promo non trouve")
    
    updated = await db.promo_codes.find_one({'code': code.upper()}, {'_id': 0})
    return updated

@api_router.delete("/admin/promo-codes/{code}")
async def admin_delete_promo_code(code: str, request: Request):
    """Delete a promo code."""
    user = await get_current_user(request)
    if not user or user.get('role') != 'admin':
        raise HTTPException(403, "Admin requis")
    
    result = await db.promo_codes.delete_one({'code': code.upper()})
    if result.deleted_count == 0:
        raise HTTPException(404, "Code promo non trouve")
    return {'message': 'Code promo supprime'}

@api_router.post("/trial/start")
async def start_free_trial(body: StartTrialRequest, request: Request):
    """Start a free trial for a subscription plan."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    # Check if user already had a trial
    user_doc = await db.users.find_one({'user_id': user['user_id']})
    if user_doc.get('had_trial'):
        raise HTTPException(400, "Vous avez déjà utilisé votre essai gratuit")
    
    # Special 3-day trial for new users
    if body.plan_id == 'trial_3days':
        trial_days = 3
    else:
        # Get plan with trial
        plan = await db.plans.find_one({'plan_id': body.plan_id, 'is_active': True}, {'_id': 0})
        if not plan:
            # Check default plans
            if body.plan_id == 'monthly':
                plan = {'plan_id': 'monthly', 'trial_days': 7}
            elif body.plan_id == 'annual':
                plan = {'plan_id': 'annual', 'trial_days': 14}
            else:
                raise HTTPException(404, "Plan non trouvé")
        
        trial_days = plan.get('trial_days', 7)
    
    if trial_days <= 0:
        raise HTTPException(400, "Ce plan n'offre pas d'essai gratuit")
    
    now = datetime.now(timezone.utc)
    trial_expires = now + timedelta(days=trial_days)
    
    # Grant trial access
    await db.users.update_one(
        {'user_id': user['user_id']},
        {'$set': {
            'had_trial': True,
            'trial': {
                'plan_id': body.plan_id,
                'started_at': now.isoformat(),
                'expires_at': trial_expires.isoformat()
            }
        }}
    )
    
    logger.info(f"Trial {trial_days} days started for user {user['user_id']} until {trial_expires.isoformat()}")
    
    return {
        'success': True,
        'trial_days': trial_days,
        'expires_at': trial_expires.isoformat(),
        'message': f'Essai gratuit de {trial_days} jours activé !'
    }

@api_router.get("/admin-panel/promos", response_class=HTMLResponse)
async def admin_panel_promos():
    """Admin panel promo codes management page."""
    template_path = ADMIN_TEMPLATES_DIR / 'promos.html'
    if not template_path.exists():
        raise HTTPException(404, "Template promos non trouve")
    return HTMLResponse(content=template_path.read_text(encoding='utf-8'))

# ─── Health Check ──────────────────────────────────────────────────────────────

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "HikmabyLM API"}

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
