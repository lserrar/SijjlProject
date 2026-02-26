"""
Sijill Project - Configuration centralisée
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import boto3
from botocore.config import Config as BotoConfig

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB Configuration
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'hikmabyLM_secret')

# Emergent Auth Configuration
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# Cloudflare R2 Configuration
R2_ACCOUNT_ID = os.environ.get('R2_ACCOUNT_ID', '')
R2_ACCESS_KEY_ID = os.environ.get('R2_ACCESS_KEY_ID', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_ACCESS_KEY', '')
R2_BUCKET = os.environ.get('R2_BUCKET_NAME', 'hikma-audio')
R2_ENDPOINT_URL = os.environ.get('R2_ENDPOINT_URL', f'https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com')
PRESIGNED_URL_EXPIRY = 3600  # 1 hour

# Initialize R2 client
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
        logger.info(f"R2 client initialized for bucket '{R2_BUCKET}'")
    except Exception as e:
        r2_client = None
        logger.error(f"R2 init failed: {e}")

# Public URL for proxying
PUBLIC_URL = os.environ.get('PUBLIC_URL', '')

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Default subscription plans
DEFAULT_PLANS = {
    'monthly': {'name': 'Abonnement Mensuel', 'price': 9.99, 'duration_days': 30, 'type': 'subscription'},
    'annual': {'name': 'Abonnement Annuel', 'price': 89.99, 'duration_days': 365, 'type': 'subscription'},
}

# Jinja2 Templates Directory
TEMPLATES_DIR = ROOT_DIR / 'admin_templates'
