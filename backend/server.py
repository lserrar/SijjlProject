from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, logging, hashlib, hmac, requests as http_requests, re
import asyncio
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

# ─── Utility: Clean title prefixes ───────────────────────────────────────────
def clean_title(title: str) -> str:
    """Remove redundant prefixes like 'Épisode 1 —', 'Cours 1:', etc."""
    if not title:
        return title
    # Remove "Épisode X —" or "Épisode X :" patterns
    title = re.sub(r'^[ÉE]pisode\s+\d+\s*[—:\-–]\s*', '', title, flags=re.IGNORECASE)
    # Remove "Cours X :" or "Cours X —" patterns
    title = re.sub(r'^Cours\s+\d+\s*[—:\-–]\s*', '', title, flags=re.IGNORECASE)
    # Remove "Module X —" patterns
    title = re.sub(r'^Module\s+\d+\s*[—:\-–]\s*', '', title, flags=re.IGNORECASE)
    return title.strip()

# ─── Cloudflare R2 Config ────────────────────────────────────────────────────
R2_ACCOUNT_ID     = os.environ.get('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID  = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET_KEY     = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET         = os.environ.get('R2_BUCKET_NAME', 'hikma-audio')
R2_ENDPOINT_URL   = os.environ.get('R2_ENDPOINT_URL', f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com')

r2_client = None
logger_r2 = logging.getLogger(__name__)
logger_r2.info(f"R2 config: ACCOUNT_ID={R2_ACCOUNT_ID[:10] if R2_ACCOUNT_ID else 'None'}..., ACCESS_KEY={R2_ACCESS_KEY_ID[:10] if R2_ACCESS_KEY_ID else 'None'}..., SECRET={'SET' if R2_SECRET_KEY else 'EMPTY'}, BUCKET={R2_BUCKET}")
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

# Public base URL for audio proxy (avoids R2 CORS issues)
PUBLIC_URL = os.environ.get('PUBLIC_URL', '')

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
    """Return a streaming URL: proxy via backend (avoids CORS) if possible, else presigned R2 URL."""
    file_key = audio_doc.get('file_key')
    audio_id = audio_doc.get('id', '')
    if file_key and audio_id and PUBLIC_URL:
        return f"{PUBLIC_URL}/api/audios/{audio_id}/stream"
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
    referral_code: Optional[str] = None  # Code de parrainage du parrain

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
    is_active: bool = False
    is_featured: bool = False
    hero_title: Optional[str] = None
    hero_description: Optional[str] = None

class CursusUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    hero_title: Optional[str] = None
    hero_description: Optional[str] = None

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
    is_featured: bool = False
    r2_folder: Optional[str] = None
    hero_title: Optional[str] = None
    hero_description: Optional[str] = None

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
    r2_folder: Optional[str] = None
    hero_title: Optional[str] = None
    hero_description: Optional[str] = None

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

class Top10UpdateRequest(BaseModel):
    course_ids: List[str]

# ─── Referral Models ─────────────────────────────────────────────────────────

class ApplyReferralRequest(BaseModel):
    referral_code: str

class GrantFreeMonthRequest(BaseModel):
    user_id: str
    months: int = 1
    reason: str = "admin_grant"

def generate_referral_code(user_id: str, name: str) -> str:
    """Generate a unique referral code based on user name and ID."""
    # Clean name: remove accents, spaces, keep first part
    import unicodedata
    clean_name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('ASCII')
    clean_name = clean_name.split()[0].upper()[:6] if clean_name else "USER"
    # Add unique suffix from user_id
    suffix = user_id[-4:].upper()
    return f"SIJILL-{clean_name}{suffix}"

# ─── Auth Routes ────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(body: RegisterRequest):
    existing = await db.users.find_one({'email': body.email})
    if existing:
        raise HTTPException(400, "Email déjà utilisé")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    role = 'admin' if body.email in ADMIN_EMAILS else 'user'
    
    # Generate unique referral code for this user
    referral_code = generate_referral_code(user_id, body.name)
    
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
        'favorites': [],
        # Referral fields
        'referral_code': referral_code,
        'referred_by': None,  # user_id of referrer
        'referral_count': 0,  # Number of successful referrals
        'free_months_earned': 0,  # Total free months earned from referrals
        'free_months_remaining': 0,  # Free months not yet used
        'subscription_end_date': None,  # When subscription/free access ends
    }
    
    # Process referral code if provided
    referrer_user = None
    if body.referral_code:
        referrer_user = await db.users.find_one({'referral_code': body.referral_code.upper()})
        if referrer_user:
            user_doc['referred_by'] = referrer_user['user_id']
            user_doc['free_months_remaining'] = 1  # 1 free month for new user (filleul)
            user_doc['subscription_end_date'] = now + timedelta(days=30)
            
            # Create referral record
            await db.referrals.insert_one({
                'id': f"ref_{uuid.uuid4().hex[:12]}",
                'referrer_id': referrer_user['user_id'],
                'referrer_name': referrer_user.get('name', ''),
                'referee_id': user_id,
                'referee_name': body.name,
                'referee_email': body.email,
                'status': 'pending',  # pending = waiting for referee to subscribe
                'referrer_rewarded': False,
                'created_at': now,
                'converted_at': None,  # When referee subscribes
            })
            logger.info(f"Referral created: {referrer_user['user_id']} -> {user_id}")
    
    await db.users.insert_one(user_doc)
    token = create_jwt({'user_id': user_id, 'exp': int((now + timedelta(days=7)).timestamp())})
    
    # Return user data (exclude sensitive fields)
    user_response = {k: v for k, v in user_doc.items() if k not in ('_id', 'password_hash')}
    if referrer_user:
        user_response['referrer_name'] = referrer_user.get('name', '')
    
    return {'token': token, 'user': user_response}

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
    # Clean titles
    for c in courses:
        if c.get('title'):
            c['title'] = clean_title(c['title'])
    return courses

@api_router.get("/courses/{course_id}/playlist")
async def get_course_playlist(course_id: str):
    """Return ordered list of audios for a course (only modules with an audio episode)."""
    modules = await db.modules.find(
        {'course_id': course_id, 'is_active': True}, {'_id': 0}
    ).sort('order', 1).to_list(200)

    playlist = []
    for mod in modules:
        audio = await db.audios.find_one({'module_id': mod['id']}, {'_id': 0})
        if audio:
            audio['stream_url'] = resolve_audio_url(audio)
            playlist.append({
                'module_id': mod['id'],
                'module_name': clean_title(mod.get('name', '')),
                'module_order': mod.get('order', 0),
                'audio_id': audio['id'],
                'audio_title': clean_title(audio.get('title', '')),
                'stream_url': audio.get('stream_url', ''),
                'thumbnail': audio.get('thumbnail', ''),
                'duration': audio.get('duration', 0),
            })
    return playlist

@api_router.get("/courses/featured")
async def get_featured_course():
    """Get the featured course for homepage highlight."""
    course = await db.courses.find_one({'is_featured': True, 'is_active': True}, {'_id': 0})
    if course and course.get('title'):
        course['title'] = clean_title(course['title'])
    return course

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str):
    c = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not c:
        raise HTTPException(404, "Cours non trouvé")
    if c.get('title'):
        c['title'] = clean_title(c['title'])
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
async def get_audios(topic: Optional[str] = None, audio_type: Optional[str] = None, scholar_id: Optional[str] = None, module_id: Optional[str] = None, course_id: Optional[str] = None):
    query: dict = {}
    if topic:
        query['topic'] = topic
    if audio_type:
        query['type'] = audio_type
    if scholar_id:
        query['scholar_id'] = scholar_id
    if module_id:
        query['module_id'] = module_id
    if course_id:
        query['course_id'] = course_id
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

    # Enrich with course + cursus data
    course = await db.courses.find_one({'id': a.get('course_id', '')}, {'_id': 0}) if a.get('course_id') else None
    if course:
        a['scholar_name'] = course.get('scholar_name', '')
        a['scholar_id'] = course.get('scholar_id', '')
        a['description'] = a.get('description') or course.get('description', '')
        a['course_title'] = course.get('title', '')
        a['total_episodes'] = course.get('modules_count', 0)

        # Enrich cursus color/letter
        CURSUS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
        CURSUS_COLORS = ['#04D182', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#C9A84C']
        cursus = await db.cursus.find_one({'id': course.get('cursus_id', '')}, {'_id': 0}) if course.get('cursus_id') else None
        if cursus:
            order = max(0, min(cursus.get('order', 1) - 1, len(CURSUS_LETTERS) - 1))
            a['cursus_id'] = cursus['id']
            a['cursus_name'] = cursus.get('name', '')
            a['cursus_letter'] = CURSUS_LETTERS[order]
            a['cursus_color'] = CURSUS_COLORS[order]
        else:
            a['cursus_letter'] = 'A'
            a['cursus_color'] = '#04D182'
    else:
        a['scholar_name'] = ''
        a['cursus_letter'] = 'A'
        a['cursus_color'] = '#04D182'

    return a

@api_router.get("/search")
async def search_content(q: str, limit: int = 20):
    """Search episodes and courses by keyword."""
    if not q or len(q.strip()) < 2:
        return {'audios': [], 'courses': [], 'total': 0}
    regex = {'$regex': q.strip(), '$options': 'i'}
    audios = await db.audios.find(
        {'$or': [{'title': regex}, {'scholar_name': regex}, {'description': regex}], 'is_active': True},
        {'_id': 0}
    ).limit(limit).to_list(limit)
    for a in audios:
        a['stream_url'] = resolve_audio_url(a)
    courses = await db.courses.find(
        {'$or': [{'title': regex}, {'scholar_name': regex}, {'description': regex}], 'is_active': True},
        {'_id': 0}
    ).limit(10).to_list(10)
    return {'audios': audios, 'courses': courses, 'total': len(audios) + len(courses)}


@api_router.post("/audios/{audio_id}/play")
async def track_play(audio_id: str):
    """Increment play count for an audio and its parent course."""
    await db.audios.update_one({'id': audio_id}, {'$inc': {'play_count': 1}})
    audio = await db.audios.find_one({'id': audio_id}, {'_id': 0, 'course_id': 1})
    if audio and audio.get('course_id'):
        await db.courses.update_one({'id': audio['course_id']}, {'$inc': {'play_count': 1}})
    return {'ok': True}


@api_router.get("/audios/{audio_id}/stream-url")
async def get_audio_stream_url(audio_id: str, request: Request):
    """Return a proxy streaming URL (avoids R2 CORS restrictions)."""
    a = await db.audios.find_one({'id': audio_id}, {'_id': 0})
    if not a:
        raise HTTPException(404, "Audio non trouvé")
    file_key = a.get('file_key')
    if file_key and r2_client:
        # Build the external base URL from forwarded headers (set by Cloudflare/ingress)
        scheme = request.headers.get('x-forwarded-proto', 'https')
        host = request.headers.get('x-forwarded-host') or request.headers.get('host', '')
        proxy_url = f"{scheme}://{host}/api/audios/{audio_id}/stream"
        return {
            'audio_id': audio_id,
            'stream_url': proxy_url,
            'file_key': file_key,
            'source': 'proxy',
            'expires_in': None,
        }
    # Fallback: presigned R2 URL if R2 unavailable
    stream_url = resolve_audio_url(a)
    return {
        'audio_id': audio_id,
        'stream_url': stream_url,
        'file_key': a.get('file_key'),
        'source': 'fallback',
        'expires_in': None,
    }

@api_router.api_route("/audios/{audio_id}/stream", methods=["GET", "HEAD"])
async def stream_audio(audio_id: str, request: Request):
    """Proxy the audio file from R2 to the client, supporting Range requests."""
    import httpx
    a = await db.audios.find_one({'id': audio_id}, {'_id': 0})
    if not a:
        raise HTTPException(404, "Audio non trouvé")
    file_key = a.get('file_key')
    if not file_key or not r2_client:
        # Fallback: redirect to audio_url if set
        fallback = a.get('audio_url')
        if fallback:
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=fallback)
        raise HTTPException(404, "Fichier audio non disponible")

    range_header = request.headers.get('Range')
    try:
        get_kwargs: dict = {'Bucket': R2_BUCKET, 'Key': file_key}
        if range_header:
            get_kwargs['Range'] = range_header

        resp = r2_client.get_object(**get_kwargs)
        content_type = resp.get('ContentType', 'audio/mp4')
        body = resp['Body'].read()

        headers: dict = {
            'Content-Type': content_type,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
        }
        if 'ContentLength' in resp:
            headers['Content-Length'] = str(resp['ContentLength'])
        if 'ContentRange' in resp:
            headers['Content-Range'] = resp['ContentRange']

        status_code = 206 if range_header else 200
        from fastapi.responses import Response
        return Response(content=body, status_code=status_code, headers=headers, media_type=content_type)
    except Exception as e:
        logging.getLogger(__name__).error(f"Stream error for {audio_id}: {e}")
        raise HTTPException(500, "Erreur de lecture du fichier audio")

@api_router.get("/images/{file_path:path}")
async def serve_image(file_path: str, request: Request):
    """Serve images from R2 bucket (supports both images/ and Prof/ folders)."""
    from fastapi.responses import Response
    
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Determine the correct R2 key based on the file path
    if file_path.startswith('Prof_') or file_path.startswith('Prof/'):
        # Professor photos in Prof/ folder
        file_key = f"Prof/{file_path.replace('Prof/', '')}"
    elif file_path.startswith('images/') or '/' in file_path:
        # Already has folder path
        file_key = file_path
    else:
        # Default to images/ folder
        file_key = f"images/{file_path}"
    
    logger.info(f"Serving image: key={file_key}")
    
    try:
        resp = r2_client.get_object(Bucket=R2_BUCKET, Key=file_key)
        content_type = resp.get('ContentType', 'image/jpeg')
        body = resp['Body'].read()
        
        return Response(
            content=body,
            media_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            }
        )
    except ClientError as e:
        logger.error(f"R2 error for key={file_key}: {e}")
        if e.response['Error']['Code'] == 'NoSuchKey':
            raise HTTPException(404, "Image non trouvée")
        raise HTTPException(500, f"Erreur R2: {str(e)}")

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
    """Get all cursus (themes) ordered by position."""
    # Use only the cursus collection
    cursus = await db.cursus.find({'is_active': {'$ne': False}}, {'_id': 0}).sort('order', 1).to_list(100)
    # Add course count for each cursus
    for c in cursus:
        c['course_count'] = await db.courses.count_documents({
            'cursus_id': c['id'],
            'is_active': {'$ne': False}
        })
    return cursus

@api_router.get("/thematiques/{thematique_id}")
async def get_thematique(thematique_id: str):
    t = await db.cursus.find_one({'id': thematique_id}, {'_id': 0})
    if not t:
        raise HTTPException(404, "Cursus non trouvé")
    return t

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

    # Pre-load all cursus for fast lookup
    CURSUS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
    CURSUS_COLORS = ['#04D182', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#C9A84C']
    all_cursus_list = await db.cursus.find({'is_active': True}, {'_id': 0}).sort('order', 1).to_list(20)
    cursus_map = {c['id']: c for c in all_cursus_list}

    def enrich_cursus(item: dict) -> dict:
        cid = item.get('cursus_id', '')
        c = cursus_map.get(cid, {})
        order = max(0, min(c.get('order', 1) - 1, len(CURSUS_LETTERS) - 1))
        item['cursus_name'] = c.get('name', '')
        item['cursus_letter'] = CURSUS_LETTERS[order]
        item['cursus_color'] = CURSUS_COLORS[order]
        # Clean title prefixes
        if item.get('title'):
            item['title'] = clean_title(item['title'])
        return item

    # 1. Featured hero: check highlight config first
    featured_hero = None
    
    # Get highlight configuration
    highlight_config = await db.config.find_one({'key': 'highlight_config'}, {'_id': 0})
    highlight_mode = highlight_config.get('mode', 'manual') if highlight_config else 'manual'
    logger.info(f"Highlight mode: {highlight_mode}")
    
    if highlight_mode == 'random':
        # Random mode: pick a random active course or cursus
        import random
        
        # Get all active courses and cursus
        active_courses = await db.courses.find({'is_active': True}, {'_id': 0}).to_list(100)
        active_cursus = await db.cursus.find({'is_active': True}, {'_id': 0}).to_list(50)
        logger.info(f"Random mode: {len(active_courses)} courses, {len(active_cursus)} cursus")
        
        # Combine and pick random
        all_items = []
        for c in active_courses:
            all_items.append(('course', c))
        for c in active_cursus:
            all_items.append(('cursus', c))
        
        if all_items:
            item_type, item = random.choice(all_items)
            logger.info(f"Random picked: {item_type} - {item.get('id')}")
            if item_type == 'cursus':
                order = max(0, min(item.get('order', 1) - 1, len(CURSUS_LETTERS) - 1))
                featured_hero = {
                    'id': item['id'],
                    'hero_type': 'cursus',
                    'title': item.get('hero_title') or item.get('name', ''),
                    'description': item.get('description', ''),
                    'cursus_id': item['id'],
                    'cursus_letter': CURSUS_LETTERS[order],
                    'cursus_color': CURSUS_COLORS[order],
                    'cursus_name': item.get('name', ''),
                }
            else:
                item = enrich_cursus(item)
                item['hero_type'] = 'course'
                if item.get('hero_title'):
                    item['title'] = item['hero_title']
                featured_hero = item
        else:
            logger.info("Random mode: No items found")
    else:
        # Manual mode: check for featured cursus first, then course
        featured_cursus_doc = await db.cursus.find_one({'is_featured': True, 'is_active': True}, {'_id': 0})
        if featured_cursus_doc:
            order = max(0, min(featured_cursus_doc.get('order', 1) - 1, len(CURSUS_LETTERS) - 1))
            featured_hero = {
                'id': featured_cursus_doc['id'],
                'hero_type': 'cursus',
                'title': featured_cursus_doc.get('hero_title') or featured_cursus_doc.get('name', ''),
                'description': featured_cursus_doc.get('description', ''),
                'cursus_id': featured_cursus_doc['id'],
                'cursus_letter': CURSUS_LETTERS[order],
                'cursus_color': CURSUS_COLORS[order],
                'cursus_name': featured_cursus_doc.get('name', ''),
            }
        else:
            featured_course = await db.courses.find_one({'is_featured': True, 'is_active': True}, {'_id': 0})
            if not featured_course:
                featured_course = await db.courses.find_one({'is_active': True}, {'_id': 0})
            if featured_course:
                featured_course = enrich_cursus(featured_course)
                featured_course['hero_type'] = 'course'
                if featured_course.get('hero_title'):
                    featured_course['title'] = featured_course['hero_title']
                featured_hero = featured_course

    # 2. Continue watching (last 3 in-progress audios)
    continue_watching = []
    if user_id:
        progress_items = await db.user_progress.find(
            {'user_id': user_id, 'content_type': 'audio', 'completed': {'$ne': True}, 'progress': {'$gt': 0.01}},
            {'_id': 0}
        ).sort('updated_at', -1).limit(3).to_list(3)
        for p in progress_items:
            audio = await db.audios.find_one({'id': p['content_id']}, {'_id': 0})
            if audio:
                audio['stream_url'] = resolve_audio_url(audio)
                if audio.get('course_id'):
                    course_info = await db.courses.find_one(
                        {'id': audio['course_id']}, {'_id': 0, 'title': 1, 'cursus_id': 1, 'id': 1}
                    )
                    if course_info:
                        audio['cursus_id'] = course_info.get('cursus_id', '')
                        audio = enrich_cursus(audio)
                continue_watching.append({
                    'audio': audio,
                    'progress': p.get('progress', 0),
                    'position': p.get('position', 0),
                })

    # 3. Recent episodes (last 8 audios, enriched with cursus)
    recent_audios_raw = await db.audios.find({'is_active': True}, {'_id': 0}).sort('published_at', -1).limit(8).to_list(8)
    recent_episodes = []
    for audio in recent_audios_raw:
        audio['stream_url'] = resolve_audio_url(audio)
        if audio.get('course_id'):
            course_info = await db.courses.find_one({'id': audio['course_id']}, {'_id': 0, 'cursus_id': 1})
            if course_info:
                audio['cursus_id'] = course_info.get('cursus_id', '')
        audio = enrich_cursus(audio)
        recent_episodes.append(audio)

    # 4. Recommendations (6 active courses, enriched with cursus)
    recommendations_raw = await db.courses.find({'is_active': True}, {'_id': 0}).limit(6).to_list(6)
    recommendations = [enrich_cursus(c) for c in recommendations_raw]

    # 5. Scholars
    scholars_list = await db.scholars.find({'is_active': True}, {'_id': 0}).to_list(10)

    # 6. Top 5 courses (admin config + auto fill by play_count), enriched with cursus
    top5_courses = []
    config = await db.config.find_one({'key': 'top10_courses'}, {'_id': 0})
    if config and config.get('course_ids'):
        for cid in config['course_ids'][:5]:
            c = await db.courses.find_one({'id': cid, 'is_active': True}, {'_id': 0})
            if c:
                top5_courses.append(enrich_cursus(c))
    if len(top5_courses) < 5:
        existing_ids = [c['id'] for c in top5_courses]
        extra = await db.courses.find(
            {'is_active': True, 'id': {'$nin': existing_ids}},
            {'_id': 0}
        ).sort('play_count', -1).limit(5 - len(top5_courses)).to_list(5)
        top5_courses.extend([enrich_cursus(c) for c in extra])

    return {
        'featured_hero': featured_hero,
        'featured_course': featured_hero,  # Keep for backwards compatibility
        'continue_watching': continue_watching,
        'recent_episodes': recent_episodes,
        'recommendations': recommendations,
        'scholars': scholars_list,
        'top5_courses': top5_courses,
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

# ─── User Referral Routes ─────────────────────────────────────────────────────

@api_router.get("/user/referral")
async def get_user_referral(request: Request):
    """Get user's referral code and stats."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    # Generate referral code if not exists
    if not user.get('referral_code'):
        referral_code = generate_referral_code(user['user_id'], user.get('name', 'User'))
        await db.users.update_one(
            {'user_id': user['user_id']},
            {'$set': {'referral_code': referral_code}}
        )
        user['referral_code'] = referral_code
    
    # Get referrals made by this user
    referrals = await db.referrals.find(
        {'referrer_id': user['user_id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(50)
    
    # Calculate stats
    total_referrals = len(referrals)
    converted_referrals = len([r for r in referrals if r.get('status') == 'converted'])
    pending_referrals = len([r for r in referrals if r.get('status') == 'pending'])
    
    return {
        'referral_code': user.get('referral_code'),
        'referral_count': user.get('referral_count', 0),
        'free_months_earned': user.get('free_months_earned', 0),
        'free_months_remaining': user.get('free_months_remaining', 0),
        'subscription_end_date': user.get('subscription_end_date'),
        'referred_by': user.get('referred_by'),
        'stats': {
            'total_referrals': total_referrals,
            'converted': converted_referrals,
            'pending': pending_referrals,
        },
        'referrals': referrals[:10],  # Last 10 referrals
    }

@api_router.get("/user/referrals")
async def get_user_referrals(request: Request):
    """Get detailed list of user's referrals (filleuls)."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    referrals = await db.referrals.find(
        {'referrer_id': user['user_id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    
    return {'referrals': referrals}

@api_router.post("/user/referral/validate")
async def validate_referral_code(body: ApplyReferralRequest):
    """Validate a referral code before registration."""
    code = body.referral_code.upper().strip()
    
    referrer = await db.users.find_one({'referral_code': code}, {'_id': 0, 'password_hash': 0})
    if not referrer:
        raise HTTPException(404, "Code de parrainage invalide")
    
    return {
        'valid': True,
        'referrer_name': referrer.get('name', 'Un membre Sijill'),
        'benefit': '1 mois gratuit pour vous et votre parrain'
    }

@api_router.post("/referrals/convert/{referee_id}")
async def convert_referral(referee_id: str, request: Request):
    """
    Called when a referred user (filleul) subscribes.
    Rewards the referrer (parrain) with 1 free month.
    """
    # This would typically be called by Stripe webhook or admin
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    # Find the referral
    referral = await db.referrals.find_one({'referee_id': referee_id, 'status': 'pending'})
    if not referral:
        raise HTTPException(404, "Parrainage non trouvé ou déjà converti")
    
    now = datetime.now(timezone.utc)
    
    # Update referral status
    await db.referrals.update_one(
        {'id': referral['id']},
        {'$set': {
            'status': 'converted',
            'converted_at': now,
            'referrer_rewarded': True,
        }}
    )
    
    # Reward the referrer with 1 free month
    referrer = await db.users.find_one({'user_id': referral['referrer_id']})
    if referrer:
        current_end = referrer.get('subscription_end_date') or now
        if current_end < now:
            current_end = now
        new_end = current_end + timedelta(days=30)
        
        await db.users.update_one(
            {'user_id': referral['referrer_id']},
            {
                '$inc': {
                    'referral_count': 1,
                    'free_months_earned': 1,
                    'free_months_remaining': 1,
                },
                '$set': {'subscription_end_date': new_end}
            }
        )
        logger.info(f"Referrer {referral['referrer_id']} rewarded with 1 free month")
    
    return {'message': 'Parrainage converti, parrain récompensé'}

# ─── User Notification Preferences ─────────────────────────────────────────────

@api_router.get("/user/notifications/preferences")
async def get_notification_preferences(request: Request):
    """Get user notification preferences."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    prefs = await db.notification_preferences.find_one(
        {'user_id': user['user_id']}, 
        {'_id': 0}
    )
    
    # Return defaults if no preferences saved yet
    if not prefs:
        return {
            'new_courses': True,
            'new_episodes': True,
            'weekly_digest': True,
            'subscription_expiry': True,
            'subscription_reminder': True,
            'promotions': False,
        }
    
    return {
        'new_courses': prefs.get('new_courses', True),
        'new_episodes': prefs.get('new_episodes', True),
        'weekly_digest': prefs.get('weekly_digest', True),
        'subscription_expiry': prefs.get('subscription_expiry', True),
        'subscription_reminder': prefs.get('subscription_reminder', True),
        'promotions': prefs.get('promotions', False),
    }

@api_router.put("/user/notifications/preferences")
async def update_notification_preferences(request: Request):
    """Update user notification preferences."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    body = await request.json()
    
    await db.notification_preferences.update_one(
        {'user_id': user['user_id']},
        {'$set': {
            'user_id': user['user_id'],
            'new_courses': body.get('new_courses', True),
            'new_episodes': body.get('new_episodes', True),
            'weekly_digest': body.get('weekly_digest', True),
            'subscription_expiry': body.get('subscription_expiry', True),
            'subscription_reminder': body.get('subscription_reminder', True),
            'promotions': body.get('promotions', False),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    
    return {'message': 'Préférences sauvegardées'}

# ─── User Stats & Library ─────────────────────────────────────────────────────

@api_router.get("/user/stats")
async def get_user_stats(request: Request):
    """Get user statistics for profile page."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    user_id = user['user_id']
    
    # Count favorites
    favorites_count = await db.user_favorites.count_documents({'user_id': user_id})
    
    # Get progress data and calculate stats
    progress_items = await db.user_progress.find({'user_id': user_id}, {'_id': 0}).to_list(500)
    
    courses_followed = set()
    total_listening_seconds = 0
    completed_count = 0
    
    for p in progress_items:
        if p.get('content_type') == 'audio':
            # Get audio to find its duration and course
            audio = await db.audios.find_one({'id': p.get('content_id')}, {'_id': 0, 'duration': 1, 'course_id': 1})
            if audio:
                duration = audio.get('duration', 0)  # in seconds
                progress_pct = p.get('progress', 0)
                total_listening_seconds += int(duration * progress_pct)
                
                if audio.get('course_id'):
                    courses_followed.add(audio['course_id'])
                
                if p.get('completed'):
                    completed_count += 1
    
    # Convert seconds to hours
    total_listening_hours = round(total_listening_seconds / 3600, 1)
    
    return {
        'courses_followed': len(courses_followed),
        'listening_hours': total_listening_hours,
        'favorites_count': favorites_count,
        'completed_count': completed_count,
        'in_progress_count': len([p for p in progress_items if not p.get('completed') and p.get('progress', 0) > 0.01]),
    }

@api_router.get("/user/library")
async def get_user_library(request: Request):
    """Get user library data (in-progress, favorites, completed)."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    
    user_id = user['user_id']
    CURSUS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
    CURSUS_COLORS = ['#04D182', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#C9A84C']
    
    # Pre-load cursus for enrichment
    all_cursus = await db.cursus.find({'is_active': True}, {'_id': 0}).sort('order', 1).to_list(20)
    cursus_map = {c['id']: c for c in all_cursus}
    
    def get_cursus_info(cursus_id: str):
        c = cursus_map.get(cursus_id, {})
        order = max(0, min(c.get('order', 1) - 1, len(CURSUS_LETTERS) - 1))
        return {
            'cursus_letter': CURSUS_LETTERS[order],
            'cursus_color': CURSUS_COLORS[order],
            'cursus_name': c.get('name', ''),
        }
    
    # Get progress items
    progress_items = await db.user_progress.find(
        {'user_id': user_id, 'content_type': 'audio'},
        {'_id': 0}
    ).sort('updated_at', -1).to_list(100)
    
    in_progress = []
    completed = []
    
    for p in progress_items:
        audio = await db.audios.find_one({'id': p.get('content_id')}, {'_id': 0})
        if not audio:
            continue
        
        # Get course info for cursus enrichment
        course = None
        if audio.get('course_id'):
            course = await db.courses.find_one({'id': audio['course_id']}, {'_id': 0, 'title': 1, 'cursus_id': 1})
        
        cursus_info = get_cursus_info(course.get('cursus_id', '') if course else '')
        duration_seconds = audio.get('duration', 0)
        duration_minutes = round(duration_seconds / 60)
        progress_pct = p.get('progress', 0)
        listened_minutes = round(duration_minutes * progress_pct)
        
        item = {
            'id': audio['id'],
            'title': clean_title(audio.get('title', '')),
            'cursus_letter': cursus_info['cursus_letter'],
            'cursus_color': cursus_info['cursus_color'],
            'cursus_name': cursus_info['cursus_name'],
            'course_title': clean_title(course.get('title', '') if course else ''),
            'episode_num': audio.get('episode_number', 1),
            'listened_minutes': listened_minutes,
            'total_minutes': duration_minutes,
            'progress': round(progress_pct * 100),
            'position': p.get('position', 0),
            'updated_at': p.get('updated_at', ''),
        }
        
        if p.get('completed'):
            completed.append(item)
        elif progress_pct > 0.01:
            in_progress.append(item)
    
    # Get favorites
    favs = await db.user_favorites.find({'user_id': user_id}, {'_id': 0}).sort('saved_at', -1).to_list(100)
    favorites = []
    
    for fav in favs:
        content_type = fav.get('content_type', 'audio')
        if content_type == 'audio':
            audio = await db.audios.find_one({'id': fav.get('content_id')}, {'_id': 0})
            if audio:
                course = None
                if audio.get('course_id'):
                    course = await db.courses.find_one({'id': audio['course_id']}, {'_id': 0, 'cursus_id': 1})
                
                cursus_info = get_cursus_info(course.get('cursus_id', '') if course else '')
                duration_minutes = round(audio.get('duration', 0) / 60)
                
                # Format saved_at as relative time
                saved_at = fav.get('saved_at')
                saved_date = 'Récemment'
                if saved_at:
                    if isinstance(saved_at, str):
                        saved_at = datetime.fromisoformat(saved_at.replace('Z', '+00:00'))
                    # Ensure saved_at is timezone-aware
                    if saved_at.tzinfo is None:
                        saved_at = saved_at.replace(tzinfo=timezone.utc)
                    days_ago = (datetime.now(timezone.utc) - saved_at).days
                    if days_ago == 0:
                        saved_date = "Aujourd'hui"
                    elif days_ago == 1:
                        saved_date = 'Hier'
                    elif days_ago < 7:
                        saved_date = f'Il y a {days_ago}j'
                    elif days_ago < 30:
                        weeks = days_ago // 7
                        saved_date = f'Il y a {weeks}s'
                    else:
                        saved_date = f'Il y a {days_ago // 30}m'
                
                favorites.append({
                    'id': audio['id'],
                    'title': clean_title(audio.get('title', '')),
                    'cursus_letter': cursus_info['cursus_letter'],
                    'cursus_color': cursus_info['cursus_color'],
                    'duration_minutes': duration_minutes,
                    'saved_date': saved_date,
                })
    
    # Calculate global progress
    total_progress = 0
    if in_progress or completed:
        all_items = in_progress + completed
        total_progress = round(sum(i['progress'] for i in all_items) / len(all_items)) if all_items else 0
    
    return {
        'in_progress': in_progress,
        'favorites': favorites,
        'completed': completed,
        'global_progress': total_progress,
    }

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
    
    # Migration: Set Meryem Sebti as default professor for all Cursus A courses
    sebti_update = await db.courses.update_many(
        {'$or': [{'cursus_id': 'cursus-falsafa'}, {'thematique_id': 'cursus-falsafa'}], 'scholar_id': {'$exists': False}},
        {'$set': {'scholar_id': 'sch-sebti', 'scholar_name': 'Meryem Sebti'}}
    )
    # Also update courses with "Divers auteurs"
    sebti_update2 = await db.courses.update_many(
        {'$or': [{'cursus_id': 'cursus-falsafa'}, {'thematique_id': 'cursus-falsafa'}], 'scholar_name': 'Divers auteurs'},
        {'$set': {'scholar_id': 'sch-sebti', 'scholar_name': 'Meryem Sebti'}}
    )
    if sebti_update.modified_count > 0 or sebti_update2.modified_count > 0:
        logger.info(f"Migration: Set Meryem Sebti as professor for Cursus A courses ({sebti_update.modified_count + sebti_update2.modified_count} updated)")
    
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

# Admin: Listening Statistics Dashboard
@api_router.get("/admin/listening-stats")
async def admin_listening_stats(request: Request, period: str = "all"):
    """Get detailed listening statistics by cursus, course, module, and professor."""
    await require_admin(request)
    
    # Calculate date filter based on period
    now = datetime.now(timezone.utc)
    date_filter = {}
    if period == "7days":
        date_filter = {"updated_at": {"$gte": now - timedelta(days=7)}}
    elif period == "month":
        date_filter = {"updated_at": {"$gte": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)}}
    elif period == "year":
        date_filter = {"updated_at": {"$gte": now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)}}
    # "all" = no filter
    
    # Get all progress data
    progress_query = {"content_type": "audio"}
    if date_filter:
        progress_query.update(date_filter)
    
    progress_items = await db.user_progress.find(progress_query, {"_id": 0}).to_list(10000)
    
    # Get all audios, courses, cursus, and scholars for reference
    audios = {a['id']: a for a in await db.audios.find({}, {"_id": 0}).to_list(1000)}
    courses = {c['id']: c for c in await db.courses.find({}, {"_id": 0}).to_list(100)}
    cursus_list = {c['id']: c for c in await db.thematiques.find({}, {"_id": 0}).to_list(50)}
    scholars = {s['id']: s for s in await db.scholars.find({}, {"_id": 0}).to_list(100)}
    
    # Aggregate stats
    stats_by_cursus = {}
    stats_by_course = {}
    stats_by_audio = {}
    stats_by_professor = {}
    daily_stats = {}
    
    total_listening_seconds = 0
    total_plays = 0
    
    for p in progress_items:
        audio_id = p.get('content_id')
        audio = audios.get(audio_id, {})
        if not audio:
            continue
        
        duration = audio.get('duration', 0)
        progress_pct = p.get('progress', 0)
        listening_seconds = int(duration * progress_pct)
        total_listening_seconds += listening_seconds
        total_plays += 1
        
        # Get related entities
        course_id = audio.get('course_id', '')
        course = courses.get(course_id, {})
        cursus_id = course.get('cursus_id', '')
        cursus = cursus_list.get(cursus_id, {})
        professor_id = audio.get('scholar_id', '') or course.get('scholar_id', '')
        professor = scholars.get(professor_id, {})
        
        # Aggregate by cursus
        if cursus_id:
            if cursus_id not in stats_by_cursus:
                stats_by_cursus[cursus_id] = {
                    'id': cursus_id,
                    'name': cursus.get('name', cursus_id),
                    'listening_seconds': 0,
                    'plays': 0
                }
            stats_by_cursus[cursus_id]['listening_seconds'] += listening_seconds
            stats_by_cursus[cursus_id]['plays'] += 1
        
        # Aggregate by course
        if course_id:
            if course_id not in stats_by_course:
                stats_by_course[course_id] = {
                    'id': course_id,
                    'title': course.get('title', course_id),
                    'cursus_name': cursus.get('name', ''),
                    'listening_seconds': 0,
                    'plays': 0
                }
            stats_by_course[course_id]['listening_seconds'] += listening_seconds
            stats_by_course[course_id]['plays'] += 1
        
        # Aggregate by audio (module/episode)
        if audio_id not in stats_by_audio:
            stats_by_audio[audio_id] = {
                'id': audio_id,
                'title': audio.get('title', audio_id),
                'course_title': course.get('title', ''),
                'listening_seconds': 0,
                'plays': 0
            }
        stats_by_audio[audio_id]['listening_seconds'] += listening_seconds
        stats_by_audio[audio_id]['plays'] += 1
        
        # Aggregate by professor
        if professor_id:
            if professor_id not in stats_by_professor:
                stats_by_professor[professor_id] = {
                    'id': professor_id,
                    'name': professor.get('name', professor_id),
                    'photo': professor.get('photo_url', ''),
                    'listening_seconds': 0,
                    'plays': 0
                }
            stats_by_professor[professor_id]['listening_seconds'] += listening_seconds
            stats_by_professor[professor_id]['plays'] += 1
        
        # Daily stats for chart
        updated_at = p.get('updated_at')
        if updated_at:
            if isinstance(updated_at, str):
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            day_key = updated_at.strftime('%Y-%m-%d')
            if day_key not in daily_stats:
                daily_stats[day_key] = {'date': day_key, 'listening_seconds': 0, 'plays': 0}
            daily_stats[day_key]['listening_seconds'] += listening_seconds
            daily_stats[day_key]['plays'] += 1
    
    # Sort and limit results
    cursus_sorted = sorted(stats_by_cursus.values(), key=lambda x: x['listening_seconds'], reverse=True)
    courses_sorted = sorted(stats_by_course.values(), key=lambda x: x['listening_seconds'], reverse=True)[:20]
    audios_sorted = sorted(stats_by_audio.values(), key=lambda x: x['listening_seconds'], reverse=True)[:20]
    professors_sorted = sorted(stats_by_professor.values(), key=lambda x: x['listening_seconds'], reverse=True)
    
    # Sort daily stats by date
    daily_sorted = sorted(daily_stats.values(), key=lambda x: x['date'])
    
    # Convert seconds to hours for display
    def to_hours(seconds):
        return round(seconds / 3600, 1)
    
    for item in cursus_sorted:
        item['listening_hours'] = to_hours(item['listening_seconds'])
    for item in courses_sorted:
        item['listening_hours'] = to_hours(item['listening_seconds'])
    for item in audios_sorted:
        item['listening_hours'] = to_hours(item['listening_seconds'])
    for item in professors_sorted:
        item['listening_hours'] = to_hours(item['listening_seconds'])
    for item in daily_sorted:
        item['listening_hours'] = to_hours(item['listening_seconds'])
    
    return {
        'period': period,
        'total': {
            'listening_hours': to_hours(total_listening_seconds),
            'listening_seconds': total_listening_seconds,
            'plays': total_plays,
            'unique_users': len(set(p.get('user_id') for p in progress_items))
        },
        'by_cursus': cursus_sorted,
        'by_course': courses_sorted,
        'by_audio': audios_sorted,
        'by_professor': professors_sorted,
        'daily': daily_sorted
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

# ─── Timeline Routes ───────────────────────────────────────────────────────────

@api_router.get("/timeline/{cursus_letter}")
async def get_timeline_html(cursus_letter: str):
    """Get timeline HTML content for a cursus (A, B, C, D, E)."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Normalize the cursus letter
    letter = cursus_letter.upper().strip()
    if letter not in ['A', 'B', 'C', 'D', 'E']:
        raise HTTPException(400, "Cursus invalide. Utilisez A, B, C, D ou E.")
    
    # Check if there's a manual assignment in the database
    # Get all entries for this cursus and sort by updated_at (most recent first)
    # Also prioritize files with 'map' in the name
    db_entries = await db.timeline_resources.find(
        {'cursus_letter': letter, 'type': 'timeline'}
    ).sort('updated_at', -1).to_list(10)
    
    r2_keys_to_try = []
    if db_entries:
        # Prioritize map files, otherwise use the most recently updated
        map_entry = next((e for e in db_entries if 'map' in e.get('filename', '').lower()), None)
        if map_entry and map_entry.get('filename'):
            r2_keys_to_try.append(f"Timeline/{map_entry['filename']}")
        # Add all other files as fallbacks
        for entry in db_entries:
            key = f"Timeline/{entry.get('filename', '')}"
            if key not in r2_keys_to_try:
                r2_keys_to_try.append(key)
    
    # Always add the default as last fallback
    default_key = f"Timeline/sijill_timeline_cursus_{letter.lower()}.html"
    if default_key not in r2_keys_to_try:
        r2_keys_to_try.append(default_key)
    
    # Try each key until we find one that works
    for r2_key in r2_keys_to_try:
        try:
            response = r2_client.get_object(Bucket=R2_BUCKET, Key=r2_key)
            html_content = response['Body'].read().decode('utf-8')
            return HTMLResponse(content=html_content, media_type="text/html")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code != 'NoSuchKey':
                raise HTTPException(500, f"Erreur R2: {str(e)}")
            # File not found, try next one
            continue
    
    # None of the files were found
    raise HTTPException(404, f"Timeline non trouvée pour le cursus {letter}")

@api_router.get("/timelines")
async def list_available_timelines():
    """List all available timeline files."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    try:
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='Timeline/', MaxKeys=100)
        timelines = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            if key.endswith('.html') and 'timeline' in key.lower():
                # Extract cursus letter from filename
                filename = key.split('/')[-1]
                # sijill_timeline_cursus_a.html -> A
                import re
                match = re.search(r'cursus_([a-e])\.html', filename.lower())
                if match:
                    letter = match.group(1).upper()
                    timelines.append({
                        'cursus_letter': letter,
                        'cursus_name': {
                            'A': 'La Falsafa — Philosophie islamique',
                            'B': 'Théologie et Droit',
                            'C': 'Sciences islamiques et traditions',
                            'D': 'Arts, Littérature et Sciences',
                            'E': 'Philosophies et spiritualités'
                        }.get(letter, f'Cursus {letter}'),
                        'r2_key': key,
                        'url': f'/api/timeline/{letter}'
                    })
        return {'timelines': sorted(timelines, key=lambda x: x['cursus_letter'])}
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.get("/timelines/cursus/{cursus_id}")
async def get_cursus_timelines(cursus_id: str):
    """Get all timelines for a specific cursus."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Map cursus_id to letter
    cursus_letter_map = {
        'cursus-falsafa': 'A',
        'cursus-theologie': 'B', 
        'cursus-sciences-islamiques': 'C',
        'cursus-arts': 'D',
        'cursus-spiritualites': 'E'
    }
    
    letter = cursus_letter_map.get(cursus_id, cursus_id.upper()[-1] if cursus_id else None)
    if not letter or letter not in ['A', 'B', 'C', 'D', 'E']:
        return {'timelines': [], 'count': 0}
    
    # Get all timeline entries from DB for this cursus
    db_entries = await db.timeline_resources.find(
        {'cursus_letter': letter, 'type': 'timeline'}
    ).to_list(20)
    
    timelines = []
    for entry in db_entries:
        filename = entry.get('filename', '')
        if not filename:
            continue
            
        # Check if file exists in R2
        r2_key = f"Timeline/{filename}"
        try:
            r2_client.head_object(Bucket=R2_BUCKET, Key=r2_key)
            file_exists = True
        except:
            file_exists = False
        
        if file_exists:
            timelines.append({
                'id': filename.replace('.html', '').lower().replace(' ', '-').replace('_', '-'),
                'filename': filename,
                'title': entry.get('title') or filename.replace('.html', '').replace('_', ' ').replace('sijill timeline ', '').title(),
                'cursus_letter': letter,
                'display_order': entry.get('display_order', 99),
                'url': f'/api/timeline/file/{filename}',
                'updated_at': entry.get('updated_at')
            })
    
    # Sort by display_order
    timelines.sort(key=lambda x: x.get('display_order', 99))
    
    return {'timelines': timelines, 'count': len(timelines)}

@api_router.get("/timeline/file/{filename}")
async def get_timeline_by_filename(filename: str):
    """Get timeline HTML by filename."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Sanitize filename
    if not filename.endswith('.html'):
        filename = f"{filename}.html"
    
    r2_key = f"Timeline/{filename}"
    
    try:
        response = r2_client.get_object(Bucket=R2_BUCKET, Key=r2_key)
        html_content = response['Body'].read().decode('utf-8')
        return HTMLResponse(content=html_content, media_type="text/html")
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'NoSuchKey':
            raise HTTPException(404, f"Timeline non trouvée: {filename}")
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.put("/admin/resources/timeline/{resource_id:path}")
async def update_timeline_resource(resource_id: str, request: Request):
    """Update timeline resource metadata (title, display_order, cursus_letter)."""
    await require_admin(request)
    
    body = await request.json()
    
    # Support both formats: filename.html or resource-id without extension
    filename = resource_id if resource_id.endswith('.html') else resource_id.replace('-', '_') + '.html'
    
    update_data = {
        'filename': filename,
        'type': 'timeline',
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    if 'title' in body:
        update_data['title'] = body['title']
    if 'display_order' in body:
        update_data['display_order'] = int(body['display_order']) if body['display_order'] else 0
    if 'cursus_letter' in body:
        cursus = body['cursus_letter'].upper().strip() if body['cursus_letter'] else None
        if cursus and cursus not in ['A', 'B', 'C', 'D', 'E']:
            raise HTTPException(400, "Cursus invalide. Utilisez A, B, C, D ou E.")
        update_data['cursus_letter'] = cursus
    
    result = await db.timeline_resources.update_one(
        {'filename': filename, 'type': 'timeline'},
        {'$set': update_data},
        upsert=True
    )
    
    return {
        'message': 'Timeline mise à jour',
        'resource_id': resource_id,
        'filename': filename,
        'modified': result.modified_count > 0 or result.upserted_id is not None
    }

# ─── Context Resources (Word Documents) ────────────────────────────────────────

@api_router.get("/resources/context")
async def list_context_resources():
    """List all context (Word) resources from the Timeline folder."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    try:
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='Timeline/', MaxKeys=200)
        resources = []
        
        for obj in response.get('Contents', []):
            key = obj['Key']
            filename = key.split('/')[-1]
            
            # Skip temp files and non-docx
            if filename.startswith('~$') or not filename.endswith('.docx'):
                continue
            
            # Parse filename: 
            # New format: sijill_{cursus}_{module}_{penseur}.docx (e.g., sijill_a_m01_traduction.docx)
            # Old format: Timeline_Module{N}_{Penseur}.docx
            import re
            
            # Try new format first: sijill_{cursus}_m{NN}_{penseur}.docx
            new_match = re.match(r'sijill_([a-e])_m(\d+)_(.+)\.docx', filename, re.IGNORECASE)
            # Try old format: Timeline_Module{N}_{Penseur}.docx
            old_match = re.match(r'Timeline_Module(\d+)_(.+)\.docx', filename)
            
            if new_match:
                cursus_letter = new_match.group(1).upper()
                module_num = int(new_match.group(2))
                subject_raw = new_match.group(3)
                # Clean up subject name: al-kindi -> Al Kindi
                subject = subject_raw.replace('-', ' ').replace('_', ' ').title()
                
                resource_id = filename.replace('.docx', '').lower().replace(' ', '-').replace('_', '-')
                
                # Check for custom data in DB
                db_entry = await db.context_resources.find_one({'resource_id': resource_id}, {'_id': 0})
                
                resource_data = {
                    'id': resource_id,
                    'filename': filename,
                    'r2_key': key,
                    'cursus_letter': cursus_letter,
                    'module_number': db_entry.get('module_number', module_num) if db_entry else module_num,
                    'subject': db_entry.get('subject', subject) if db_entry else subject,
                    'title': db_entry.get('title', f"{subject}") if db_entry else f"{subject}",
                    'description': db_entry.get('description', '') if db_entry else '',
                    'credits': db_entry.get('credits', '') if db_entry else '',
                    'size': obj['Size'],
                    'url': f'/api/resources/context/{filename.replace(".docx", "")}'
                }
                resources.append(resource_data)
            elif old_match:
                module_num = int(old_match.group(1))
                subject_raw = old_match.group(2)
                # Clean up subject name: Al-Kindi -> Al-Kindī, etc.
                subject = subject_raw.replace('_', ' ').replace('-', ' ')
                
                resource_id = filename.replace('.docx', '').lower().replace(' ', '-').replace('_', '-')
                
                # Check for custom data in DB
                db_entry = await db.context_resources.find_one({'resource_id': resource_id}, {'_id': 0})
                
                resource_data = {
                    'id': resource_id,
                    'filename': filename,
                    'r2_key': key,
                    'module_number': db_entry.get('module_number', module_num) if db_entry else module_num,
                    'subject': db_entry.get('subject', subject) if db_entry else subject,
                    'title': db_entry.get('title', f"Contexte historique : {subject}") if db_entry else f"Contexte historique : {subject}",
                    'description': db_entry.get('description', '') if db_entry else '',
                    'credits': db_entry.get('credits', '') if db_entry else '',
                    'size': obj['Size'],
                    'url': f'/api/resources/context/{filename.replace(".docx", "")}'
                }
                resources.append(resource_data)
        
        # Sort by module number then subject
        resources.sort(key=lambda x: (x['module_number'], x['subject']))
        return {'resources': resources, 'count': len(resources)}
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.get("/resources/context/{resource_id}")
async def get_context_resource(resource_id: str):
    """Get a specific context resource content (parsed from Word document)."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Find the matching file
    try:
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='Timeline/', MaxKeys=200)
        target_key = None
        
        for obj in response.get('Contents', []):
            key = obj['Key']
            filename = key.split('/')[-1]
            if filename.startswith('~$'):
                continue
            # Match by resource_id
            file_id = filename.replace('.docx', '').lower().replace(' ', '-').replace('_', '-')
            if file_id == resource_id.lower() or filename.replace('.docx', '') == resource_id:
                target_key = key
                break
        
        if not target_key:
            raise HTTPException(404, f"Ressource non trouvée: {resource_id}")
        
        # Download and parse the Word document
        response = r2_client.get_object(Bucket=R2_BUCKET, Key=target_key)
        docx_content = response['Body'].read()
        
        from docx import Document as DocxDocument
        from io import BytesIO as BytesIOClass
        doc = DocxDocument(BytesIOClass(docx_content))
        
        # Parse document content
        content_blocks = []
        current_section = None
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            style = para.style.name if para.style else 'Normal'
            
            # Detect headings and sections
            if 'Heading' in style or text.startswith('🏛') or text.startswith('🧠') or text.startswith('📅'):
                current_section = text
                content_blocks.append({
                    'type': 'heading',
                    'text': text,
                    'level': 1 if 'Heading 1' in style else 2
                })
            elif text.startswith('•') or text.startswith('-'):
                content_blocks.append({
                    'type': 'list_item',
                    'text': text.lstrip('•- '),
                    'section': current_section
                })
            else:
                content_blocks.append({
                    'type': 'paragraph',
                    'text': text,
                    'section': current_section
                })
        
        # Extract metadata from filename
        filename = target_key.split('/')[-1]
        import re
        
        # Try new format first: sijill_{cursus}_m{NN}_{penseur}.docx
        new_match = re.match(r'sijill_([a-e])_m(\d+)_(.+)\.docx', filename, re.IGNORECASE)
        # Try old format: Timeline_Module{N}_{Penseur}.docx
        old_match = re.match(r'Timeline_Module(\d+)_(.+)\.docx', filename)
        
        if new_match:
            cursus_letter = new_match.group(1).upper()
            module_num = int(new_match.group(2))
            subject_raw = new_match.group(3)
            subject = subject_raw.replace('-', ' ').replace('_', ' ').title()
        elif old_match:
            cursus_letter = 'A'  # Default to A for old format
            module_num = int(old_match.group(1))
            subject_raw = old_match.group(2)
            subject = subject_raw.replace('_', ' ').replace('-', ' ')
        else:
            cursus_letter = 'A'
            module_num = 0
            subject = filename.replace('.docx', '').replace('_', ' ').replace('-', ' ').title()
        
        return {
            'id': resource_id,
            'title': subject,
            'module_number': module_num,
            'subject': subject,
            'cursus_letter': cursus_letter,
            'r2_key': target_key,
            'content': content_blocks
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'NoSuchKey':
            raise HTTPException(404, f"Ressource non trouvée: {resource_id}")
        raise HTTPException(500, f"Erreur R2: {str(e)}")

# ─── Audio Resources (Conferences) ─────────────────────────────────────────────

@api_router.get("/resources/audio")
async def list_audio_resources():
    """List all audio resources (conferences) from the audio folder."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    import re
    
    try:
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='audio/', MaxKeys=200)
        resources = []
        
        for obj in response.get('Contents', []):
            key = obj['Key']
            filename = key.split('/')[-1]
            
            # Skip non-audio files
            if not any(filename.lower().endswith(ext) for ext in ['.mp3', '.m4a', '.wav', '.ogg', '.aac']):
                continue
            
            # Parse filename: Conf_Averroes_Brenet_module4.m4a
            # Format: Conf_{Subject}_{Speaker}_module{N}.ext
            match = re.match(r'Conf_([^_]+)_([^_]+)_module(\d+)\.(mp3|m4a|wav|ogg|aac)', filename, re.IGNORECASE)
            
            if match:
                subject = match.group(1).replace('-', ' ')
                speaker = match.group(2).replace('-', ' ')
                module_num = int(match.group(3))
                ext = match.group(4).lower()
            else:
                # Fallback: try to extract any useful info
                subject = filename.replace('_', ' ').rsplit('.', 1)[0]
                speaker = ''
                module_num = 0
                ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            
            resource_id = filename.rsplit('.', 1)[0].lower().replace(' ', '-').replace('_', '-')
            
            # Check for custom data in DB
            db_entry = await db.audio_resources.find_one({'resource_id': resource_id}, {'_id': 0})
            
            resource_data = {
                'id': resource_id,
                'filename': filename,
                'r2_key': key,
                'subject': db_entry.get('subject', subject) if db_entry else subject,
                'speaker': db_entry.get('speaker', speaker) if db_entry else speaker,
                'module_number': db_entry.get('module_number', module_num) if db_entry else module_num,
                'title': db_entry.get('title', f"Conférence : {subject}" + (f" par {speaker}" if speaker else "")) if db_entry else f"Conférence : {subject}" + (f" par {speaker}" if speaker else ""),
                'description': db_entry.get('description', '') if db_entry else '',
                'credits': db_entry.get('credits', '') if db_entry else '',
                'size': obj['Size'],
                'size_mb': round(obj['Size'] / (1024*1024), 1),
                'format': ext,
                'stream_url': f'/api/resources/audio/stream/{filename}'
            }
            resources.append(resource_data)
        
        # Sort by module number then subject
        resources.sort(key=lambda x: (x['module_number'], x['subject']))
        return {'resources': resources, 'count': len(resources)}
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.get("/resources/audio/stream/{filename}")
async def stream_audio_resource(filename: str, request: Request):
    """Stream an audio resource file from R2."""
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    r2_key = f"audio/{filename}"
    
    try:
        # Get file metadata first
        head = r2_client.head_object(Bucket=R2_BUCKET, Key=r2_key)
        file_size = head['ContentLength']
        content_type = head.get('ContentType', 'audio/mpeg')
        
        # Determine content type from extension
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        content_types = {
            'mp3': 'audio/mpeg',
            'm4a': 'audio/mp4',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',
            'aac': 'audio/aac'
        }
        content_type = content_types.get(ext, 'audio/mpeg')
        
        # Handle range requests for seeking
        range_header = request.headers.get('range')
        
        if range_header:
            # Parse range header
            import re
            range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if range_match:
                start = int(range_match.group(1))
                end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
                
                # Fetch partial content
                response = r2_client.get_object(
                    Bucket=R2_BUCKET, 
                    Key=r2_key,
                    Range=f'bytes={start}-{end}'
                )
                
                return Response(
                    content=response['Body'].read(),
                    status_code=206,
                    headers={
                        'Content-Type': content_type,
                        'Content-Range': f'bytes {start}-{end}/{file_size}',
                        'Accept-Ranges': 'bytes',
                        'Content-Length': str(end - start + 1)
                    }
                )
        
        # Full file request
        response = r2_client.get_object(Bucket=R2_BUCKET, Key=r2_key)
        
        return Response(
            content=response['Body'].read(),
            headers={
                'Content-Type': content_type,
                'Accept-Ranges': 'bytes',
                'Content-Length': str(file_size)
            }
        )
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'NoSuchKey':
            raise HTTPException(404, f"Fichier audio non trouvé: {filename}")
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.get("/admin/resources/timeline")
async def admin_list_timeline_resources(request: Request):
    """Admin: List all timeline resources (HTML + DOCX + Audio) for management."""
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    import re
    
    try:
        # Get Timeline folder files
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='Timeline/', MaxKeys=200)
        
        html_files = []
        docx_files = []
        
        for obj in response.get('Contents', []):
            key = obj['Key']
            filename = key.split('/')[-1]
            
            # Skip temp files
            if filename.startswith('~$'):
                continue
            
            file_info = {
                'key': key,
                'filename': filename,
                'size': obj['Size'],
                'size_kb': round(obj['Size'] / 1024, 1),
                'last_modified': obj['LastModified'].isoformat() if obj.get('LastModified') else None
            }
            
            if filename.endswith('.html'):
                # Parse cursus letter - support formats like:
                # sijill_timeline_cursus_a.html
                # sijill_timeline_cursus_a_map.html
                # cursus_a.html, etc.
                match = re.search(r'cursus_([a-e])(?:_[a-z]+)?\.html', filename.lower())
                if match:
                    file_info['cursus_letter'] = match.group(1).upper()
                file_info['type'] = 'timeline_html'
                
                # Check if we have a manual assignment in DB
                db_entry = await db.timeline_resources.find_one({'filename': filename, 'type': 'timeline'}, {'_id': 0})
                if db_entry:
                    if db_entry.get('cursus_letter'):
                        file_info['cursus_letter'] = db_entry['cursus_letter']
                        file_info['manual_assignment'] = True
                    if db_entry.get('title'):
                        file_info['title'] = db_entry['title']
                    file_info['display_order'] = db_entry.get('display_order', 99)
                else:
                    file_info['display_order'] = 99
                
                html_files.append(file_info)
            elif filename.endswith('.docx'):
                # Parse module and subject
                match = re.match(r'Timeline_Module(\d+)_(.+)\.docx', filename)
                if match:
                    file_info['module_number'] = int(match.group(1))
                    file_info['subject'] = match.group(2).replace('_', ' ').replace('-', ' ')
                    file_info['type'] = 'context_docx'
                    
                    # Check for custom data in DB
                    resource_id = filename.replace('.docx', '').lower().replace(' ', '-').replace('_', '-')
                    db_entry = await db.context_resources.find_one({'resource_id': resource_id}, {'_id': 0})
                    
                    if db_entry:
                        file_info['title'] = db_entry.get('title', '')
                        file_info['description'] = db_entry.get('description', '')
                        file_info['credits'] = db_entry.get('credits', '')
                        if db_entry.get('module_number'):
                            file_info['module_number'] = db_entry['module_number']
                        if db_entry.get('subject'):
                            file_info['subject'] = db_entry['subject']
                
                docx_files.append(file_info)
        
        # Get audio files from audio/ folder
        audio_response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='audio/', MaxKeys=200)
        audio_files = []
        
        for obj in audio_response.get('Contents', []):
            key = obj['Key']
            filename = key.split('/')[-1]
            
            # Skip non-audio files
            if not any(filename.lower().endswith(ext) for ext in ['.mp3', '.m4a', '.wav', '.ogg', '.aac']):
                continue
            
            resource_id = filename.rsplit('.', 1)[0].lower().replace(' ', '-').replace('_', '-')
            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            
            # Parse filename: Conf_Averroes_Brenet_module4.m4a
            match = re.match(r'Conf_([^_]+)_([^_]+)_module(\d+)\.(mp3|m4a|wav|ogg|aac)', filename, re.IGNORECASE)
            
            if match:
                subject = match.group(1).replace('-', ' ')
                speaker = match.group(2).replace('-', ' ')
                module_num = int(match.group(3))
            else:
                subject = filename.replace('_', ' ').rsplit('.', 1)[0]
                speaker = ''
                module_num = 0
            
            # Check for custom data in DB
            db_entry = await db.audio_resources.find_one({'resource_id': resource_id}, {'_id': 0})
            
            audio_info = {
                'id': resource_id,
                'filename': filename,
                'r2_key': key,
                'subject': db_entry.get('subject', subject) if db_entry else subject,
                'speaker': db_entry.get('speaker', speaker) if db_entry else speaker,
                'module_number': db_entry.get('module_number', module_num) if db_entry else module_num,
                'title': db_entry.get('title', f"Conférence : {subject}") if db_entry else f"Conférence : {subject}",
                'description': db_entry.get('description', '') if db_entry else '',
                'credits': db_entry.get('credits', '') if db_entry else '',
                'size': obj['Size'],
                'size_mb': round(obj['Size'] / (1024*1024), 1),
                'format': ext,
                'stream_url': f'/api/resources/audio/stream/{filename}'
            }
            audio_files.append(audio_info)
        
        # Sort
        html_files.sort(key=lambda x: x.get('cursus_letter', 'Z'))
        docx_files.sort(key=lambda x: (x.get('module_number', 99), x.get('subject', '')))
        audio_files.sort(key=lambda x: (x['module_number'], x['subject']))
        
        return {
            'timelines': html_files,
            'context_docs': docx_files,
            'audio_resources': audio_files,
            'total_timelines': len(html_files),
            'total_context_docs': len(docx_files),
            'total_audios': len(audio_files)
        }
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.post("/admin/resources/sync-timeline")
async def admin_sync_timeline_resources(request: Request):
    """Admin: Sync timeline resources to database for linking with courses/modules."""
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    import re
    
    try:
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='Timeline/', MaxKeys=200)
        
        synced_timelines = 0
        synced_contexts = 0
        
        for obj in response.get('Contents', []):
            key = obj['Key']
            filename = key.split('/')[-1]
            
            if filename.startswith('~$'):
                continue
            
            if filename.endswith('.html') and 'timeline' in filename.lower():
                # Sync timeline HTML - support various naming formats
                match = re.search(r'cursus_([a-e])(?:_[a-z]+)?\.html', filename.lower())
                letter = match.group(1).upper() if match else None
                
                # Check if manual assignment exists
                existing = await db.timeline_resources.find_one({'filename': filename, 'type': 'timeline'})
                if existing and existing.get('cursus_letter'):
                    letter = existing['cursus_letter']
                
                await db.timeline_resources.update_one(
                    {'filename': filename, 'type': 'timeline'},
                    {'$set': {
                        'type': 'timeline',
                        'cursus_letter': letter,
                        'r2_key': key,
                        'filename': filename,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
                synced_timelines += 1
                    
            elif filename.endswith('.docx'):
                # Sync context document
                match = re.match(r'Timeline_Module(\d+)_(.+)\.docx', filename)
                if match:
                    module_num = int(match.group(1))
                    subject = match.group(2).replace('_', ' ').replace('-', ' ')
                    resource_id = filename.replace('.docx', '').lower().replace(' ', '-').replace('_', '-')
                    
                    await db.timeline_resources.update_one(
                        {'type': 'context', 'resource_id': resource_id},
                        {'$set': {
                            'type': 'context',
                            'resource_id': resource_id,
                            'module_number': module_num,
                            'subject': subject,
                            'title': f"Contexte historique : {subject}",
                            'r2_key': key,
                            'filename': filename,
                            'updated_at': datetime.now(timezone.utc).isoformat()
                        }},
                        upsert=True
                    )
                    synced_contexts += 1
        
        return {
            'message': 'Synchronisation terminée',
            'synced_timelines': synced_timelines,
            'synced_contexts': synced_contexts
        }
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.patch("/admin/resources/timeline/{filename}/assign-cursus")
async def assign_timeline_cursus(filename: str, request: Request):
    """Manually assign a cursus letter to a timeline file."""
    await require_admin(request)
    
    body = await request.json()
    cursus_letter = body.get('cursus_letter', '').upper().strip()
    
    if cursus_letter and cursus_letter not in ['A', 'B', 'C', 'D', 'E']:
        raise HTTPException(400, "Cursus invalide. Utilisez A, B, C, D ou E.")
    
    # Update or create the timeline resource entry
    result = await db.timeline_resources.update_one(
        {'filename': filename, 'type': 'timeline'},
        {'$set': {
            'cursus_letter': cursus_letter if cursus_letter else None,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {
        'message': f'Cursus {"assigné: " + cursus_letter if cursus_letter else "retiré"} pour {filename}',
        'filename': filename,
        'cursus_letter': cursus_letter if cursus_letter else None
    }

@api_router.put("/admin/resources/audio/{resource_id}")
async def update_audio_resource(resource_id: str, request: Request):
    """Update audio resource metadata (title, description, credits, etc.)."""
    await require_admin(request)
    
    body = await request.json()
    
    update_data = {
        'resource_id': resource_id,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Allow updating these fields
    allowed_fields = ['title', 'description', 'credits', 'speaker', 'subject', 'module_number', 'cursus_id']
    for field in allowed_fields:
        if field in body:
            update_data[field] = body[field]
    
    result = await db.audio_resources.update_one(
        {'resource_id': resource_id},
        {'$set': update_data},
        upsert=True
    )
    
    return {
        'message': 'Audio mis à jour',
        'resource_id': resource_id,
        'updated_fields': [f for f in allowed_fields if f in body]
    }

@api_router.put("/admin/resources/context/{resource_id}")
async def update_context_resource(resource_id: str, request: Request):
    """Update context document metadata (title, description, credits, etc.)."""
    await require_admin(request)
    
    body = await request.json()
    
    update_data = {
        'resource_id': resource_id,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Allow updating these fields
    allowed_fields = ['title', 'description', 'credits', 'subject', 'module_number', 'cursus_id']
    for field in allowed_fields:
        if field in body:
            update_data[field] = body[field]
    
    result = await db.context_resources.update_one(
        {'resource_id': resource_id},
        {'$set': update_data},
        upsert=True
    )
    
    return {
        'message': 'Document mis à jour',
        'resource_id': resource_id,
        'updated_fields': [f for f in allowed_fields if f in body]
    }

@api_router.get("/admin/resources/audio/{resource_id}")
async def get_audio_resource_admin(resource_id: str, request: Request):
    """Get audio resource details for editing."""
    await require_admin(request)
    
    db_entry = await db.audio_resources.find_one({'resource_id': resource_id}, {'_id': 0})
    
    if not db_entry:
        return {
            'resource_id': resource_id,
            'title': '',
            'description': '',
            'credits': '',
            'speaker': '',
            'subject': '',
            'module_number': 0,
            'cursus_id': ''
        }
    
    return db_entry

@api_router.post("/admin/courses/{course_id}/sync-r2")
async def sync_course_with_r2(course_id: str, body: SyncR2FolderRequest, request: Request):
    """
    Sync a course with an R2 folder: scan the folder and create audio episodes.
    Accepts multiple file naming patterns: episode-01, episode01, ep01, 01.m4a, etc.
    """
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Get the course
    course = await db.courses.find_one({'id': course_id})
    if not course:
        raise HTTPException(404, "Cours non trouvé")
    
    r2_folder = body.r2_folder.strip().rstrip('/')
    if not r2_folder:
        raise HTTPException(400, "Dossier R2 requis")
    
    # Extract folder name for episode titles
    folder_name = r2_folder.split('/')[-1].replace('-', ' ').replace('_', ' ').title()
    
    try:
        # List files in the R2 folder
        prefix = f"{r2_folder}/"
        logger.info(f"Sync R2: Listing files in bucket={R2_BUCKET}, prefix={prefix}")
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix, MaxKeys=500)
        
        files = []
        contents = response.get('Contents', [])
        logger.info(f"Sync R2: Found {len(contents)} objects")
        
        for obj in contents:
            key = obj['Key']
            size = obj['Size']
            logger.info(f"Sync R2: Checking file: {key} (size={size})")
            if size > 0 and (key.endswith('.m4a') or key.endswith('.mp3') or key.endswith('.wav')):
                filename = key.replace(prefix, '')
                # Extract episode number from filename with multiple patterns
                import re
                # Try various patterns: episode-01, episode01, ep-01, ep01, 01.m4a, piste-01, etc.
                match = re.search(r'(?:episode|ep|piste)?[-_]?(\d+)', filename, re.IGNORECASE)
                logger.info(f"Sync R2: Filename={filename}, match={match.group(1) if match else 'None'}")
                if match:
                    ep_num = int(match.group(1))
                    files.append({
                        'key': key,
                        'filename': filename,
                        'size': size,
                        'episode_number': ep_num,
                    })
        
        logger.info(f"Sync R2: Final files count: {len(files)}")
        if not files:
            raise HTTPException(400, f"Aucun fichier audio trouvé dans '{r2_folder}/' (formats: .m4a, .mp3, .wav)")
        
        # Sort by episode number
        files.sort(key=lambda x: x['episode_number'])
        
        # Create or update audio entries for each episode
        created = 0
        updated = 0
        now = datetime.now(timezone.utc)
        
        for f in files:
            audio_id = f"aud-{course_id.replace('crs-', '')}-{f['episode_number']:02d}"
            
            # Check if audio already exists to preserve description and other custom fields
            existing_audio = await db.audios.find_one({'id': audio_id})
            
            # Use folder name for title: "Nom Dossier ep1" instead of "Épisode 1 — Cours Title"
            default_title = f"{folder_name} ep{f['episode_number']}"
            
            audio_doc = {
                'id': audio_id,
                'title': existing_audio.get('title') if existing_audio and existing_audio.get('title') and not existing_audio.get('title').startswith('Épisode') and not existing_audio.get('title').startswith('1.') else default_title,
                'description': existing_audio.get('description') if existing_audio and existing_audio.get('description') else '',
                'scholar_id': course.get('scholar_id', ''),
                'scholar_name': course.get('scholar_name', ''),
                'duration': existing_audio.get('duration', 0) if existing_audio else 0,
                'audio_url': '',
                'file_key': f['key'],
                'thumbnail': existing_audio.get('thumbnail') if existing_audio and existing_audio.get('thumbnail') else course.get('thumbnail', ''),
                'topic': existing_audio.get('topic') if existing_audio and existing_audio.get('topic') else course.get('topic', ''),
                'type': 'lecture',
                'course_id': course_id,
                'episode_number': f['episode_number'],
                'published_at': existing_audio.get('published_at') if existing_audio else now.isoformat(),
                'is_active': existing_audio.get('is_active', True) if existing_audio else True,
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

# Mapping R2 folders to course IDs
R2_TO_COURSE_MAPPING = {
    '01-mouvement-traduction': 'cours-traduction',
    '02-falsafa': 'cours-falsafa-grands',
    '03-post-avicennisme': 'cours-post-avicennisme',
    '04-falsafa-occident-musulman': 'cours-falsafa-occident',
    '05-renouveau-falsafa-persan': 'cours-falsafa-persan',
    '06-logique-arabe': 'cours-logique',
    '07-inclassables': 'cours-inclassables',
    '08-kalam': 'cours-kalam',
    '09-usul-al-fiqh': 'cours-fiqh',
    '10-doxographie': 'cours-doxographie',
    '11-transmission-coran': 'cours-coran',
    '12-transmission-hadith': 'cours-hadith',
    '13-historiographie': 'cours-historiographie',
    '14-autobiographies': 'cours-autobiographies',
    '15-histoire-art': 'cours-art',
    '16-poesie': 'cours-poesie',
    '18-sciences': 'cours-sciences',
    '19-kalam-chretien': 'cours-kalam-chretien',
    '20-mystique-islamique': 'cours-soufisme',
    '21-ismaelisme': 'cours-ismaelisme',
    '22-philosophie-juive': 'cours-philo-juive',
}

# ========== PROFESSOR PHOTO SYNC ==========
@api_router.post("/admin/sync-professor-photos")
async def sync_professor_photos(request: Request):
    """Sync professor photos from R2 Prof/ folder"""
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    try:
        # List all files in Prof/ folder
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='Prof/', MaxKeys=100)
        
        updated = 0
        for obj in response.get('Contents', []):
            key = obj['Key']
            filename = key.replace('Prof/', '')
            
            # Extract professor name from filename (e.g., Prof_MeryemSebti.jpg -> Meryem Sebti)
            if filename.startswith('Prof_'):
                name_part = filename.replace('Prof_', '').rsplit('.', 1)[0]
                # Handle special cases like "1973_HenriCorbin" -> "Henri Corbin"
                name_part = name_part.split('_')[-1] if '_' in name_part else name_part
                # Convert CamelCase to spaces
                import re
                name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name_part)
                
                # Find matching scholar
                scholar = await db.scholars.find_one({
                    'name': {'$regex': name.replace(' ', '.*'), '$options': 'i'}
                })
                
                if scholar:
                    # Update photo URL - use relative path for flexibility
                    photo_url = f"/api/images/{filename}"
                    await db.scholars.update_one(
                        {'id': scholar['id']},
                        {'$set': {'photo': photo_url, 'photo_key': key}}
                    )
                    logger.info(f"Updated photo for {scholar['name']}: {photo_url}")
                    updated += 1
                else:
                    logger.warning(f"No matching scholar found for: {name} (from {filename})")
        
        return {
            'message': 'Synchronisation des photos terminée',
            'photos_updated': updated
        }
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

# ========== BIBLIOGRAPHY SYNC ==========
@api_router.post("/admin/sync-bibliographies")
async def sync_bibliographies(request: Request):
    """
    Sync bibliography files (.docx) from R2 Biblio/ folder.
    Extracts text content and stores in database.
    """
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    try:
        from docx import Document
        from io import BytesIO
        
        # Mapping of cursus letters to cursus IDs (matching database)
        cursus_mapping = {
            'A': 'cursus-falsafa',           # A. La Falsafa et son héritage
            'B': 'cursus-theologie',          # B. Théologie et Droit
            'C': 'cursus-sciences-islamiques', # C. Sciences islamiques et transmission
            'D': 'cursus-arts',               # D. Arts, Littérature et Sciences
            'E': 'cursus-spiritualites',      # E. Philosophies et spiritualités connexes
        }
        
        # List all .docx files in Biblio/ folder
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix='Biblio/', MaxKeys=100)
        
        created = 0
        updated = 0
        
        for obj in response.get('Contents', []):
            key = obj['Key']
            if not key.endswith('.docx'):
                continue
            
            filename = key.replace('Biblio/', '')
            # Parse filename: Biblio_Module01_CursusA.docx
            import re
            match = re.match(r'Biblio_Module(\d+)_Cursus([A-E])\.docx', filename)
            if not match:
                logger.warning(f"Skipping unrecognized biblio file: {filename}")
                continue
            
            module_num = int(match.group(1))
            cursus_letter = match.group(2)
            cursus_id = cursus_mapping.get(cursus_letter)
            
            if not cursus_id:
                logger.warning(f"Unknown cursus letter: {cursus_letter}")
                continue
            
            # Download the .docx file
            try:
                file_response = r2_client.get_object(Bucket=R2_BUCKET, Key=key)
                docx_content = file_response['Body'].read()
                
                # Parse the Word document
                doc = Document(BytesIO(docx_content))
                
                # Extract text content with formatting
                content_parts = []
                for para in doc.paragraphs:
                    text = para.text.strip()
                    if text:
                        # Check if it's a heading (bold or larger)
                        is_heading = any(run.bold for run in para.runs if run.text.strip())
                        if is_heading:
                            content_parts.append(f"## {text}")
                        else:
                            content_parts.append(text)
                
                content = "\n\n".join(content_parts)
                
                # Find the course associated with this module
                course = await db.courses.find_one({
                    'cursus_id': cursus_id,
                    '$or': [
                        {'module_number': module_num},
                        {'title': {'$regex': f'Cours {module_num}\\b', '$options': 'i'}}
                    ]
                })
                
                course_id = course['id'] if course else None
                course_title = course['title'] if course else f"Module {module_num}"
                
                # Create/update bibliography entry
                biblio_id = f"biblio-{cursus_letter.lower()}-mod{module_num:02d}"
                
                biblio_doc = {
                    'id': biblio_id,
                    'title': f"Bibliographie - {course_title}",
                    'content': content,
                    'content_html': content.replace('\n\n## ', '\n\n<h3>').replace('## ', '<h3>').replace('\n\n', '</h3>\n\n<p>') + '</p>' if '## ' in content else f"<p>{content.replace(chr(10)+chr(10), '</p><p>')}</p>",
                    'cursus_id': cursus_id,
                    'cursus_letter': cursus_letter,
                    'course_id': course_id,
                    'module_number': module_num,
                    'file_key': key,
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                }
                
                result = await db.bibliographies.update_one(
                    {'id': biblio_id},
                    {'$set': biblio_doc},
                    upsert=True
                )
                
                if result.upserted_id:
                    created += 1
                else:
                    updated += 1
                    
                logger.info(f"Synced bibliography: {biblio_id} ({len(content)} chars)")
                
            except Exception as e:
                logger.error(f"Error processing {key}: {e}")
                continue
        
        return {
            'message': 'Synchronisation des bibliographies terminée',
            'bibliographies_created': created,
            'bibliographies_updated': updated,
            'total': created + updated
        }
        
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.get("/bibliographies")
async def list_bibliographies(cursus_id: str = None, course_id: str = None):
    """List bibliographies, optionally filtered by cursus or course."""
    query = {
        'content': {'$exists': True, '$ne': ''},  # Only new format with content
        'module_number': {'$exists': True}
    }
    if cursus_id:
        query['cursus_id'] = cursus_id
    if course_id:
        query['course_id'] = course_id
    
    biblios = await db.bibliographies.find(query, {'_id': 0}).sort('module_number', 1).to_list(100)
    return biblios

@api_router.get("/bibliographies/{biblio_id}")
async def get_bibliography(biblio_id: str):
    """Get a specific bibliography by ID."""
    biblio = await db.bibliographies.find_one({'id': biblio_id}, {'_id': 0})
    if not biblio:
        raise HTTPException(404, "Bibliographie non trouvée")
    return biblio

@api_router.post("/admin/sync-all-r2")
async def sync_all_r2_audio(request: Request):
    """
    Sync all audio files from R2 with database.
    Scans Audio/ folder and creates/updates audio entries based on structure.
    """
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    try:
        # List all files in Audio folder
        response = r2_client.list_objects_v2(Bucket=R2_BUCKET, Prefix="Audio/", MaxKeys=1000)
        
        stats = {
            'total_files': 0,
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': []
        }
        
        now = datetime.now(timezone.utc)
        
        for obj in response.get('Contents', []):
            key = obj['Key']
            size = obj['Size']
            
            if size == 0 or not (key.endswith('.m4a') or key.endswith('.mp3')):
                continue
            
            stats['total_files'] += 1
            
            # Parse path: Audio/cursus-X/cours-Y/[subfolder/]episode-N.m4a
            parts = key.split('/')
            if len(parts) < 4:
                stats['skipped'] += 1
                continue
            
            cursus_folder = parts[1]  # e.g., cursus-a-falsafa
            cours_folder = parts[2]   # e.g., 02-falsafa
            
            # Get course_id from mapping
            course_id = R2_TO_COURSE_MAPPING.get(cours_folder)
            if not course_id:
                stats['skipped'] += 1
                stats['errors'].append(f"No mapping for {cours_folder}")
                continue
            
            # Get course from DB
            course = await db.courses.find_one({'id': course_id}, {'_id': 0})
            if not course:
                stats['skipped'] += 1
                stats['errors'].append(f"Course not found: {course_id}")
                continue
            
            # Extract episode title from subfolder name if present
            # e.g., Audio/cursus-a-falsafa/02-falsafa/al-kindi/episode-01.m4a
            episode_title = ""
            episode_number = 1
            
            if len(parts) == 5:
                # Has subfolder (philosopher name)
                subfolder = parts[3]  # e.g., al-kindi
                episode_title = subfolder.replace('-', ' ').title()
                # Extract episode number from filename
                filename = parts[4]
                match = re.search(r'episode-?(\d+)', filename, re.IGNORECASE)
                if match:
                    episode_number = int(match.group(1))
            else:
                # No subfolder
                filename = parts[3]
                match = re.search(r'episode-?(\d+)', filename, re.IGNORECASE)
                if match:
                    episode_number = int(match.group(1))
            
            # Generate audio ID
            subfolder_slug = parts[3].replace(' ', '-').lower() if len(parts) == 5 else ''
            audio_id = f"aud_{course_id}-{subfolder_slug}-ep{episode_number:02d}" if subfolder_slug else f"aud_{course_id}-ep{episode_number:02d}"
            audio_id = re.sub(r'[^a-z0-9_-]', '', audio_id)
            
            # Build title
            if episode_title:
                title = episode_title
            else:
                title = clean_title(course.get('title', ''))
            
            audio_doc = {
                'id': audio_id,
                'title': title,
                'description': f"{title} — {clean_title(course.get('title', ''))}",
                'scholar_id': course.get('scholar_id', ''),
                'scholar_name': course.get('scholar_name', ''),
                'duration': 0,  # Will be updated when played
                'audio_url': '',
                'file_key': key,
                'thumbnail': course.get('thumbnail', ''),
                'topic': course.get('topic', ''),
                'type': 'lecture',
                'course_id': course_id,
                'cursus_id': course.get('cursus_id', course.get('thematique_id', '')),
                'episode_number': episode_number,
                'published_at': now.isoformat(),
                'is_active': True,
            }
            
            result = await db.audios.update_one(
                {'id': audio_id},
                {'$set': audio_doc},
                upsert=True
            )
            
            if result.upserted_id:
                stats['created'] += 1
            else:
                stats['updated'] += 1
        
        return {
            'message': 'Synchronisation R2 terminée',
            'stats': stats
        }
        
    except ClientError as e:
        raise HTTPException(500, f"Erreur R2: {str(e)}")

@api_router.post("/admin/update-professor-photos")
async def update_professor_photos(request: Request):
    """Update professor photos from R2 images folder."""
    await require_admin(request)
    if not r2_client:
        raise HTTPException(503, "R2 non configuré")
    
    # Mapping of R2 filenames to scholar IDs
    photo_mapping = {
        'Prof_MeryemSebti.jpg': 'sch-sebti',
        'Prof_ChristianJambet.png': 'sch-jambet',
        'Prof_EricGeoffroy.jpg': 'sch-geoffroy',
        'Prof_1973_HCorbin.jpeg': 'sch-corbin',
    }
    
    updated = []
    for filename, scholar_id in photo_mapping.items():
        r2_key = f"images/{filename}"
        photo_url = f"https://{R2_PUBLIC_URL}/{r2_key}" if R2_PUBLIC_URL else f"/api/audios/stream/{r2_key}"
        
        result = await db.scholars.update_one(
            {'id': scholar_id},
            {'$set': {'photo': photo_url}},
            upsert=False
        )
        
        if result.modified_count > 0:
            updated.append(scholar_id)
    
    return {
        'message': 'Photos des professeurs mises à jour',
        'updated': updated
    }

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


# ─── Admin: Top 10 Courses Management ─────────────────────────────────────────

@api_router.get("/admin/top10")
async def get_admin_top10(request: Request):
    """Get Top 10 config and auto-ranked courses by play_count."""
    await require_admin(request)
    config = await db.config.find_one({'key': 'top10_courses'}, {'_id': 0})
    manual_ids = config.get('course_ids', []) if config else []
    all_courses = await db.courses.find({'is_active': True}, {'_id': 0}).sort('play_count', -1).limit(20).to_list(20)
    return {
        'manual_ids': manual_ids,
        'all_courses': all_courses,
    }


@api_router.put("/admin/top10")
async def update_admin_top10(body: Top10UpdateRequest, request: Request):
    """Set the Top 10 courses manually."""
    await require_admin(request)
    await db.config.update_one(
        {'key': 'top10_courses'},
        {'$set': {
            'key': 'top10_courses',
            'course_ids': body.course_ids,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {'message': 'Top 10 mis à jour', 'course_ids': body.course_ids}

# ─── Admin: Highlight/Featured Management ──────────────────────────────────────

@api_router.get("/admin/highlight")
async def get_highlight_config(request: Request):
    """Get the current highlight configuration."""
    await require_admin(request)
    
    # Get highlight config
    config = await db.config.find_one({'key': 'highlight_config'}, {'_id': 0})
    if not config:
        config = {
            'key': 'highlight_config',
            'mode': 'manual',  # 'manual' or 'random'
        }
    
    # Get current featured course
    featured_course = await db.courses.find_one({'is_featured': True, 'is_active': True}, {'_id': 0, 'id': 1, 'title': 1})
    
    # Get current featured cursus
    featured_cursus = await db.cursus.find_one({'is_featured': True, 'is_active': True}, {'_id': 0, 'id': 1, 'name': 1})
    
    # Get all courses and cursus for selection
    all_courses = await db.courses.find({'is_active': True}, {'_id': 0, 'id': 1, 'title': 1, 'is_featured': 1}).to_list(100)
    all_cursus = await db.cursus.find({'is_active': True}, {'_id': 0, 'id': 1, 'name': 1, 'is_featured': 1}).to_list(50)
    
    return {
        'mode': config.get('mode', 'manual'),
        'featured_course': featured_course,
        'featured_cursus': featured_cursus,
        'all_courses': all_courses,
        'all_cursus': all_cursus
    }

@api_router.put("/admin/highlight/mode")
async def set_highlight_mode(request: Request):
    """Set highlight mode (manual or random)."""
    await require_admin(request)
    body = await request.json()
    mode = body.get('mode', 'manual')
    
    if mode not in ['manual', 'random']:
        raise HTTPException(400, "Mode invalide. Utilisez 'manual' ou 'random'.")
    
    await db.config.update_one(
        {'key': 'highlight_config'},
        {'$set': {
            'key': 'highlight_config',
            'mode': mode,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {'message': f'Mode highlight changé en: {mode}', 'mode': mode}

@api_router.patch("/admin/courses/{course_id}/set-featured")
async def set_course_featured(course_id: str, request: Request):
    """Set a course as featured (unfeaturing any previous)."""
    await require_admin(request)
    
    # First, unfeatured all courses and cursus
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
    await db.cursus.update_many({}, {'$set': {'is_featured': False}})
    
    # Set this course as featured
    result = await db.courses.update_one(
        {'id': course_id},
        {'$set': {'is_featured': True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Cours non trouvé")
    
    return {'message': f'Cours {course_id} mis en avant', 'course_id': course_id}

@api_router.patch("/admin/cursus/{cursus_id}/set-featured")
async def set_cursus_featured(cursus_id: str, request: Request):
    """Set a cursus as featured (unfeaturing any previous)."""
    await require_admin(request)
    
    # First, unfeatured all courses and cursus
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
    await db.cursus.update_many({}, {'$set': {'is_featured': False}})
    
    # Set this cursus as featured
    result = await db.cursus.update_one(
        {'id': cursus_id},
        {'$set': {'is_featured': True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Cursus non trouvé")
    
    return {'message': f'Cursus {cursus_id} mis en avant', 'cursus_id': cursus_id}

@api_router.delete("/admin/highlight/clear")
async def clear_featured(request: Request):
    """Clear all featured items."""
    await require_admin(request)
    
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
    await db.cursus.update_many({}, {'$set': {'is_featured': False}})
    
    return {'message': 'Highlight effacé'}

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

# ─── Admin: Referrals Management ───────────────────────────────────────────────

@api_router.get("/admin/referrals")
async def admin_list_referrals(request: Request):
    """List all referrals."""
    await require_admin(request)
    referrals = await db.referrals.find({}, {'_id': 0}).sort('created_at', -1).to_list(200)
    return referrals

@api_router.get("/admin/referrals/stats")
async def admin_referral_stats(request: Request):
    """Get referral statistics."""
    await require_admin(request)
    
    total_referrals = await db.referrals.count_documents({})
    converted_referrals = await db.referrals.count_documents({'status': 'converted'})
    pending_referrals = await db.referrals.count_documents({'status': 'pending'})
    
    # Top referrers
    pipeline = [
        {'$match': {'referral_count': {'$gt': 0}}},
        {'$sort': {'referral_count': -1}},
        {'$limit': 10},
        {'$project': {
            '_id': 0,
            'user_id': 1,
            'name': 1,
            'email': 1,
            'referral_count': 1,
            'free_months_earned': 1
        }}
    ]
    top_referrers = await db.users.aggregate(pipeline).to_list(10)
    
    return {
        'total_referrals': total_referrals,
        'converted': converted_referrals,
        'pending': pending_referrals,
        'conversion_rate': round(converted_referrals / total_referrals * 100, 1) if total_referrals > 0 else 0,
        'top_referrers': top_referrers
    }

@api_router.post("/admin/users/{user_id}/grant-free-months")
async def admin_grant_free_months(user_id: str, body: GrantFreeMonthRequest, request: Request):
    """Grant free months to a user (for professors, sponsors, etc.)."""
    await require_admin(request)
    
    user = await db.users.find_one({'user_id': user_id})
    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")
    
    now = datetime.now(timezone.utc)
    
    # Calculate new subscription end date
    current_end = user.get('subscription_end_date')
    if current_end:
        if isinstance(current_end, str):
            current_end = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
        if current_end.tzinfo is None:
            current_end = current_end.replace(tzinfo=timezone.utc)
    
    if not current_end or current_end < now:
        current_end = now
    
    new_end = current_end + timedelta(days=30 * body.months)
    
    # Update user
    await db.users.update_one(
        {'user_id': user_id},
        {
            '$inc': {'free_months_remaining': body.months},
            '$set': {
                'subscription_end_date': new_end,
                'subscription': {
                    'plan_id': 'free_grant',
                    'plan_name': f'{body.months} mois gratuit(s) - {body.reason}',
                    'expires_at': new_end.isoformat(),
                    'status': 'active',
                    'granted_by_admin': True,
                    'granted_at': now.isoformat(),
                    'reason': body.reason
                }
            }
        }
    )
    
    logger.info(f"Granted {body.months} free months to user {user_id} ({body.reason})")
    return {
        'message': f'{body.months} mois gratuit(s) accordé(s)',
        'user_id': user_id,
        'new_expires_at': new_end.isoformat(),
        'reason': body.reason
    }

@api_router.post("/admin/users/{user_id}/grant-lifetime")
async def admin_grant_lifetime(user_id: str, request: Request, reason: str = "professeur"):
    """Grant lifetime access to a user (for professors, sponsors, etc.)."""
    await require_admin(request)
    
    user = await db.users.find_one({'user_id': user_id})
    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")
    
    now = datetime.now(timezone.utc)
    lifetime_end = now + timedelta(days=365 * 100)  # 100 years
    
    # Update user with lifetime subscription
    await db.users.update_one(
        {'user_id': user_id},
        {'$set': {
            'subscription_end_date': lifetime_end,
            'subscription': {
                'plan_id': 'lifetime',
                'plan_name': f'Accès à vie - {reason}',
                'expires_at': lifetime_end.isoformat(),
                'status': 'active',
                'is_lifetime': True,
                'granted_by_admin': True,
                'granted_at': now.isoformat(),
                'reason': reason
            }
        }}
    )
    
    logger.info(f"Granted lifetime access to user {user_id} ({reason})")
    return {
        'message': f'Accès à vie accordé ({reason})',
        'user_id': user_id,
        'is_lifetime': True
    }

# ─── Admin: Settings Management ────────────────────────────────────────────────

class StripeSettingsRequest(BaseModel):
    api_key: str
    webhook_secret: Optional[str] = None

class PricingSettingsRequest(BaseModel):
    trial_days: int = 3
    monthly: float = 9.99
    annual: float = 89.99

class ReferralSettingsRequest(BaseModel):
    enabled: bool = True
    referrer_months: int = 1
    referee_months: int = 1

@api_router.get("/admin/settings")
async def admin_get_settings(request: Request):
    """Get all platform settings."""
    await require_admin(request)
    
    # Get settings from database or return defaults
    settings = await db.settings.find_one({'id': 'platform_settings'}, {'_id': 0})
    if not settings:
        settings = {
            'id': 'platform_settings',
            'stripe_configured': False,
            'pricing': {
                'trial_days': 3,
                'monthly': 9.99,
                'annual': 89.99
            },
            'referral': {
                'enabled': True,
                'referrer_months': 1,
                'referee_months': 1
            }
        }
    
    # Check if Stripe is configured from environment
    stripe_key = os.environ.get('STRIPE_API_KEY', '')
    if stripe_key and stripe_key.startswith('sk_'):
        settings['stripe_configured'] = True
        settings['stripe_key_last4'] = stripe_key[-4:]
        settings['stripe_mode'] = 'live' if 'live' in stripe_key else 'test'
    
    return settings

@api_router.post("/admin/settings/stripe")
async def admin_save_stripe_settings(body: StripeSettingsRequest, request: Request):
    """Save Stripe API configuration."""
    await require_admin(request)
    
    # Validate the key format
    if not body.api_key.startswith('sk_'):
        raise HTTPException(400, "La clé API doit commencer par sk_test_ ou sk_live_")
    
    # Update the .env file
    env_path = '/app/backend/.env'
    
    # Read current .env content
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Update or add STRIPE_API_KEY
    key_found = False
    new_lines = []
    for line in lines:
        if line.startswith('STRIPE_API_KEY='):
            new_lines.append(f'STRIPE_API_KEY={body.api_key}\n')
            key_found = True
        else:
            new_lines.append(line)
    
    if not key_found:
        new_lines.append(f'STRIPE_API_KEY={body.api_key}\n')
    
    # Add webhook secret if provided
    if body.webhook_secret:
        webhook_found = False
        final_lines = []
        for line in new_lines:
            if line.startswith('STRIPE_WEBHOOK_SECRET='):
                final_lines.append(f'STRIPE_WEBHOOK_SECRET={body.webhook_secret}\n')
                webhook_found = True
            else:
                final_lines.append(line)
        if not webhook_found:
            final_lines.append(f'STRIPE_WEBHOOK_SECRET={body.webhook_secret}\n')
        new_lines = final_lines
    
    # Write updated .env
    with open(env_path, 'w') as f:
        f.writelines(new_lines)
    
    # Update settings in database
    await db.settings.update_one(
        {'id': 'platform_settings'},
        {'$set': {
            'stripe_configured': True,
            'stripe_key_last4': body.api_key[-4:],
            'stripe_mode': 'live' if 'live' in body.api_key else 'test',
            'updated_at': datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    logger.info(f"Stripe API key updated (mode: {'live' if 'live' in body.api_key else 'test'})")
    return {'message': 'Configuration Stripe enregistrée', 'mode': 'live' if 'live' in body.api_key else 'test'}

@api_router.post("/admin/settings/pricing")
async def admin_save_pricing_settings(body: PricingSettingsRequest, request: Request):
    """Save pricing configuration."""
    await require_admin(request)
    
    await db.settings.update_one(
        {'id': 'platform_settings'},
        {'$set': {
            'pricing': {
                'trial_days': body.trial_days,
                'monthly': body.monthly,
                'annual': body.annual
            },
            'updated_at': datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    logger.info(f"Pricing updated: trial={body.trial_days}d, monthly={body.monthly}€, annual={body.annual}€")
    return {'message': 'Tarifs enregistrés'}

@api_router.post("/admin/settings/referral")
async def admin_save_referral_settings(body: ReferralSettingsRequest, request: Request):
    """Save referral system configuration."""
    await require_admin(request)
    
    await db.settings.update_one(
        {'id': 'platform_settings'},
        {'$set': {
            'referral': {
                'enabled': body.enabled,
                'referrer_months': body.referrer_months,
                'referee_months': body.referee_months
            },
            'updated_at': datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    logger.info(f"Referral settings updated: enabled={body.enabled}, referrer={body.referrer_months}m, referee={body.referee_months}m")
    return {'message': 'Configuration parrainage enregistrée'}

# ─── Admin Panel: Settings Page ────────────────────────────────────────────────

@api_router.get("/admin-panel/settings")
async def admin_panel_settings(request: Request):
    """Serve the settings admin page."""
    template_path = ADMIN_TEMPLATES_DIR / 'settings.html'
    with open(template_path, 'r') as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)

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

@api_router.post("/admin/thematiques")
async def admin_create_thematique_compat(body: CursusCreate, request: Request):
    """Compatibility endpoint for web admin panel."""
    return await admin_create_cursus(body, request)

@api_router.put("/admin/thematiques/{cursus_id}")
async def admin_update_thematique_compat(cursus_id: str, body: CursusUpdate, request: Request):
    """Compatibility endpoint for web admin panel — saves description to cursus."""
    return await admin_update_cursus(cursus_id, body, request)

@api_router.delete("/admin/thematiques/{cursus_id}")
async def admin_delete_thematique_compat(cursus_id: str, request: Request):
    """Compatibility endpoint for web admin panel."""
    return await admin_delete_cursus(cursus_id, request)

@api_router.get("/cursus")
async def public_list_cursus():
    """Public endpoint to list active cursus."""
    cursus_list = await db.cursus.find({'is_active': True}, {'_id': 0}).sort('order', 1).to_list(100)
    return cursus_list

@api_router.get("/cursus/{cursus_id}/scholars")
async def get_cursus_scholars(cursus_id: str):
    """Get all scholars teaching courses in a cursus."""
    # Find all courses in this cursus
    courses = await db.courses.find(
        {'$or': [{'cursus_id': cursus_id}, {'thematique_id': cursus_id}], 'is_active': {'$ne': False}},
        {'_id': 0, 'scholar_id': 1, 'scholar_name': 1, 'title': 1, 'id': 1}
    ).to_list(100)
    
    # Collect unique scholar IDs and their courses
    scholars_map = {}
    for c in courses:
        scholar_id = c.get('scholar_id')
        if scholar_id:
            if scholar_id not in scholars_map:
                scholars_map[scholar_id] = {
                    'id': scholar_id,
                    'name': c.get('scholar_name', ''),
                    'courses': []
                }
            scholars_map[scholar_id]['courses'].append({
                'id': c['id'],
                'title': clean_title(c.get('title', ''))
            })
    
    # Enrich with scholar details from scholars collection
    result = []
    for sid, data in scholars_map.items():
        scholar = await db.scholars.find_one({'id': sid}, {'_id': 0})
        if scholar:
            result.append({
                'id': sid,
                'name': scholar.get('name', data['name']),
                'title': scholar.get('title', ''),
                'bio': scholar.get('bio', ''),
                'photo': scholar.get('photo', ''),
                'courses_count': len(data['courses']),
                'courses': data['courses']
            })
        else:
            # Fallback if no scholar doc
            result.append({
                'id': sid,
                'name': data['name'],
                'title': '',
                'bio': '',
                'photo': '',
                'courses_count': len(data['courses']),
                'courses': data['courses']
            })
    
    return result

@api_router.get("/cursus/{cursus_id}/resources")
async def get_cursus_resources(cursus_id: str):
    """Get resources for a cursus (books, articles, links)."""
    # Check if there's a resources collection or field in cursus
    cursus = await db.cursus.find_one({'id': cursus_id}, {'_id': 0})
    if not cursus:
        raise HTTPException(404, "Cursus non trouvé")
    
    # For now, return empty list as resources are not yet implemented
    # This can be expanded later to include books, PDFs, external links
    resources = await db.resources.find({'cursus_id': cursus_id, 'is_active': True}, {'_id': 0}).to_list(50)
    return resources

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
    # Use exclude_unset to only update provided fields; allows explicit null to clear hero_title/hero_description
    raw = body.model_dump(exclude_unset=True)
    update = {}
    for k, v in raw.items():
        if v is not None:
            update[k] = v
        elif k in ('hero_title', 'hero_description'):
            # Allow explicit null to clear hero text
            update[k] = None
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

@api_router.post("/admin/bibliographies/standardize-titles")
async def admin_standardize_bibliography_titles(request: Request):
    """
    Uniformiser tous les titres des bibliographies au format :
    "Bibliographie - Cours XX : [Titre du Cours]"
    Corrige aussi les cursus_id et assigne les course_id correspondants.
    """
    await require_admin(request)
    import re
    
    # Correct cursus mapping (A-E letters to real cursus IDs)
    letter_to_cursus = {
        'A': 'cursus-falsafa',
        'B': 'cursus-theologie',
        'C': 'cursus-sciences-islamiques',
        'D': 'cursus-arts',
        'E': 'cursus-spiritualites',
    }
    
    # Fix old incorrect cursus mappings
    old_to_new_cursus = {
        'cursus-hermeneutique': 'cursus-theologie',
        'cursus-histoire': 'cursus-sciences-islamiques',
        'cursus-litterature': 'cursus-arts',
    }
    
    # Get all bibliographies with module_number
    biblios = await db.bibliographies.find({'module_number': {'$exists': True}}, {'_id': 0}).to_list(100)
    
    updated_count = 0
    
    for biblio in biblios:
        module_num = biblio.get('module_number')
        cursus_id = biblio.get('cursus_id')
        cursus_letter = biblio.get('cursus_letter', '')
        
        if not module_num:
            continue
        
        updates = {}
        
        # Fix cursus_id if it's using old incorrect mapping
        if cursus_id in old_to_new_cursus:
            cursus_id = old_to_new_cursus[cursus_id]
            updates['cursus_id'] = cursus_id
        elif cursus_letter and cursus_letter in letter_to_cursus:
            correct_cursus = letter_to_cursus[cursus_letter]
            if cursus_id != correct_cursus:
                cursus_id = correct_cursus
                updates['cursus_id'] = cursus_id
        
        # Find the corresponding course
        course = None
        course_title = None
        
        # Get all courses for this cursus
        cursus_courses = await db.courses.find({'cursus_id': cursus_id}).to_list(50)
        
        # Try to match by position in cursus (module 1 = first course, etc.)
        # Calculate position within this cursus based on letter
        if cursus_letter == 'A':
            position = module_num  # Modules 1-7
        elif cursus_letter == 'B':
            position = module_num - 7  # Modules 8-9 -> position 1-2
        elif cursus_letter == 'C':
            position = module_num - 9  # Modules 10-14 -> position 1-5
        elif cursus_letter == 'D':
            position = module_num - 14  # Modules 15-22 -> position 1-8
        elif cursus_letter == 'E':
            position = module_num - 22  # Modules 23-24 -> position 1-2
        else:
            position = module_num
        
        if cursus_courses and 1 <= position <= len(cursus_courses):
            course = cursus_courses[position - 1]
            course_title = course.get('title', '')
            updates['course_id'] = course['id']
        
        # Clean up course title - remove "Cours X : " prefix if present
        if course_title:
            course_title = re.sub(r'^Cours\s*\d+\s*:\s*', '', course_title)
            new_title = f"Bibliographie - Cours {module_num:02d} : {course_title}"
        else:
            new_title = f"Bibliographie - Cours {module_num:02d}"
        
        # Update title if different
        current_title = biblio.get('title', '')
        if current_title != new_title:
            updates['title'] = new_title
        
        # Apply updates if any
        if updates:
            await db.bibliographies.update_one(
                {'id': biblio['id']},
                {'$set': updates}
            )
            updated_count += 1
            logger.info(f"Updated biblio {biblio['id']}: {list(updates.keys())}")
    
    return {
        'message': 'Uniformisation des titres terminée',
        'updated': updated_count,
        'total_checked': len(biblios)
    }

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
    """Set a course as the featured hero (unfeatures all cursus and other courses)."""
    await require_admin(request)
    await db.cursus.update_many({}, {'$set': {'is_featured': False}})
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
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
    """Remove featured status from all courses."""
    await require_admin(request)
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
    return {'message': 'Aucun cours mis en avant'}

@api_router.patch("/admin/cursus/{cursus_id}/set-featured")
async def admin_set_featured_cursus(cursus_id: str, request: Request):
    """Set a cursus as the featured hero (unfeatures all courses and other cursus)."""
    await require_admin(request)
    await db.courses.update_many({}, {'$set': {'is_featured': False}})
    await db.cursus.update_many({}, {'$set': {'is_featured': False}})
    result = await db.cursus.update_one(
        {'id': cursus_id},
        {'$set': {'is_featured': True}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Cursus non trouvé")
    logger.info(f"Cursus {cursus_id} set as featured")
    return {'message': 'Cursus mis en avant', 'id': cursus_id}

@api_router.delete("/admin/cursus/featured")
async def admin_remove_featured_cursus(request: Request):
    """Remove featured status from all cursus."""
    await require_admin(request)
    await db.cursus.update_many({}, {'$set': {'is_featured': False}})
    return {'message': 'Aucun cursus mis en avant'}

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

@api_router.get("/admin-panel/listening-stats", response_class=HTMLResponse)
async def admin_panel_listening_stats():
    """Admin panel listening statistics page."""
    template_path = ADMIN_TEMPLATES_DIR / 'listening-stats.html'
    if not template_path.exists():
        raise HTTPException(404, "Template listening-stats non trouvé")
    # Load base template and inject content
    base_path = ADMIN_TEMPLATES_DIR / 'base.html'
    stats_content = template_path.read_text(encoding='utf-8')
    base_html = base_path.read_text(encoding='utf-8')
    # Simple template rendering - replace content block
    final_html = base_html.replace('<!-- Content will be loaded here -->', stats_content.replace('{% extends "base.html" %}', '').replace('{% block content %}', '').replace('{% endblock %}', ''))
    return HTMLResponse(content=final_html)

@api_router.get("/admin-panel/highlight", response_class=HTMLResponse)
async def admin_panel_highlight():
    """Admin panel highlight configuration page."""
    template_path = ADMIN_TEMPLATES_DIR / 'highlight.html'
    if not template_path.exists():
        raise HTTPException(404, "Template highlight non trouvé")
    # Load base template and inject content
    base_path = ADMIN_TEMPLATES_DIR / 'base.html'
    highlight_content = template_path.read_text(encoding='utf-8')
    base_html = base_path.read_text(encoding='utf-8')
    # Simple template rendering - replace content block
    final_html = base_html.replace('<!-- Content will be loaded here -->', highlight_content.replace('{% extends "base.html" %}', '').replace('{% block content %}', '').replace('{% endblock %}', ''))
    return HTMLResponse(content=final_html)

@api_router.get("/admin-panel/timeline-resources", response_class=HTMLResponse)
async def admin_panel_timeline_resources():
    """Admin panel timeline resources management page."""
    template_path = ADMIN_TEMPLATES_DIR / 'timeline-resources.html'
    if not template_path.exists():
        raise HTTPException(404, "Template timeline-resources non trouvé")
    # Load base template and inject content
    base_path = ADMIN_TEMPLATES_DIR / 'base.html'
    page_content = template_path.read_text(encoding='utf-8')
    base_html = base_path.read_text(encoding='utf-8')
    # Simple template rendering - replace content block
    final_html = base_html.replace('<!-- Content will be loaded here -->', page_content.replace('{% extends "base.html" %}', '').replace('{% block content %}', '').replace('{% endblock %}', ''))
    return HTMLResponse(content=final_html)

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

@api_router.get("/admin-panel/legal", response_class=HTMLResponse)
async def admin_panel_legal():
    """Admin panel legal pages editor."""
    template_path = ADMIN_TEMPLATES_DIR / 'legal.html'
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
    
    # Get current user to check for referral
    user = await db.users.find_one({'user_id': user_id})
    
    if purchase_type == 'subscription':
        # Update subscription and subscription_end_date
        await db.users.update_one(
            {'user_id': user_id},
            {'$set': {
                'subscription': {
                    'plan_id': transaction['metadata'].get('plan_id'),
                    'started_at': now,
                    'expires_at': expires_at,
                    'transaction_id': transaction['transaction_id'],
                    'status': 'active'
                },
                'subscription_end_date': expires_at
            }}
        )
        
        # Check if this user was referred and convert the referral
        if user and user.get('referred_by'):
            referrer_id = user['referred_by']
            
            # Find the pending referral
            referral = await db.referrals.find_one({
                'referrer_id': referrer_id,
                'referee_id': user_id,
                'status': 'pending'
            })
            
            if referral:
                # Update referral status
                await db.referrals.update_one(
                    {'id': referral['id']},
                    {'$set': {
                        'status': 'converted',
                        'converted_at': now,
                        'referrer_rewarded': True,
                    }}
                )
                
                # Reward the referrer with 1 free month
                referrer = await db.users.find_one({'user_id': referrer_id})
                if referrer:
                    current_end = referrer.get('subscription_end_date')
                    if current_end:
                        if isinstance(current_end, str):
                            current_end = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
                        if current_end.tzinfo is None:
                            current_end = current_end.replace(tzinfo=timezone.utc)
                    
                    if not current_end or current_end < now:
                        current_end = now
                    
                    new_end = current_end + timedelta(days=30)
                    
                    await db.users.update_one(
                        {'user_id': referrer_id},
                        {
                            '$inc': {
                                'referral_count': 1,
                                'free_months_earned': 1,
                            },
                            '$set': {'subscription_end_date': new_end}
                        }
                    )
                    logger.info(f"Referrer {referrer_id} rewarded with 1 free month for referral conversion")
    
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

# ─── Legal Pages API ──────────────────────────────────────────────────────────

DEFAULT_LEGAL = {
    "privacy": {
        "title": "Politique de confidentialité",
        "content": """**Dernière mise à jour : Février 2025**

## 1. Introduction

Sijill s'engage à protéger la confidentialité de vos données personnelles.

## 2. Données collectées

- Données d'identification : nom, prénom, adresse email
- Données d'utilisation : historique d'écoute, progression, favoris
- Données techniques : type d'appareil, système d'exploitation

## 3. Utilisation des données

Vos données sont utilisées pour personnaliser votre expérience d'apprentissage.

## 4. Vos droits

Conformément au RGPD, vous avez le droit d'accéder, rectifier et supprimer vos données.

## 5. Contact

Email : privacy@sijill.com"""
    },
    "terms": {
        "title": "Conditions d'utilisation",
        "content": """**Dernière mise à jour : Février 2025**

## 1. Acceptation des conditions

En utilisant l'application Sijill, vous acceptez les présentes conditions.

## 2. Description du service

Sijill est une plateforme d'apprentissage dédiée aux études islamiques.

## 3. Propriété intellectuelle

Tous les contenus sont protégés par le droit d'auteur.

## 4. Contact

Email : support@sijill.com"""
    }
}

@api_router.get("/legal/{page_type}")
async def get_legal_page(page_type: str):
    """Get legal page content (privacy or terms)"""
    if page_type not in ["privacy", "terms"]:
        raise HTTPException(400, "Invalid page type")
    
    # Try to get from database
    doc = await db.legal_pages.find_one({"type": page_type}, {"_id": 0})
    if doc:
        return {"title": doc.get("title", ""), "content": doc.get("content", "")}
    
    # Return default
    return DEFAULT_LEGAL.get(page_type, DEFAULT_LEGAL["privacy"])

@api_router.put("/admin/legal/{page_type}")
async def update_legal_page(page_type: str, request: Request):
    """Update legal page content (admin only)"""
    if page_type not in ["privacy", "terms"]:
        raise HTTPException(400, "Invalid page type")
    
    body = await request.json()
    title = body.get("title", "")
    content = body.get("content", "")
    
    await db.legal_pages.update_one(
        {"type": page_type},
        {"$set": {"type": page_type, "title": title, "content": content, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": f"Page '{page_type}' mise à jour"}

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
