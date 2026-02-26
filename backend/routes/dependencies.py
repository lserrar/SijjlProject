# Shared dependencies for all routers
# This file contains database connections, utilities, and shared models

from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Request, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
import hashlib
import hmac
import logging

logger = logging.getLogger(__name__)

# ─── Database Connection ────────────────────────────────────────────────────

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "default_secret")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ─── Auth Utilities ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt."""
    salted = f"{password}_sijill_salt_2024"
    return hashlib.sha256(salted.encode()).hexdigest()


def create_jwt(payload: dict) -> str:
    """Create a simple JWT token."""
    import base64
    import json
    header = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').rstrip(b'=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=')
    message = header + b'.' + payload_b64
    signature = hmac.new(JWT_SECRET.encode(), message, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b'=')
    return (message + b'.' + sig_b64).decode()


def verify_jwt(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    import base64
    import json
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, payload_b64, sig_b64 = parts
        message = (header + '.' + payload_b64).encode()
        expected_sig = hmac.new(JWT_SECRET.encode(), message, hashlib.sha256).digest()
        
        # Decode signature
        sig_b64_padded = sig_b64 + '=' * (4 - len(sig_b64) % 4)
        actual_sig = base64.urlsafe_b64decode(sig_b64_padded)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        
        # Decode payload
        payload_b64_padded = payload_b64 + '=' * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64_padded))
        
        # Check expiration
        if payload.get('exp') and payload['exp'] < datetime.now(timezone.utc).timestamp():
            return None
        
        return payload
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
        return None


async def get_current_user(request: Request) -> Optional[dict]:
    """Extract and verify user from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    
    # Try Bearer token
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        payload = verify_jwt(token)
        if payload and 'user_id' in payload:
            user = await db.users.find_one({'user_id': payload['user_id']}, {'_id': 0, 'password_hash': 0})
            return user
    
    # Try cookie
    token = request.cookies.get('auth_token')
    if token:
        payload = verify_jwt(token)
        if payload and 'user_id' in payload:
            user = await db.users.find_one({'user_id': payload['user_id']}, {'_id': 0, 'password_hash': 0})
            return user
    
    return None


async def require_admin(request: Request) -> dict:
    """Require admin authentication."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(401, "Authentification requise")
    if user.get('role') != 'admin':
        raise HTTPException(403, "Accès administrateur requis")
    return user


# ─── Admin Emails ───────────────────────────────────────────────────────────

ADMIN_EMAILS = ['loubna.serrar@gmail.com', 'admin@sijill.com']
