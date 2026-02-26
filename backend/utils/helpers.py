"""
Sijill Project - Utilitaires partagés
"""
import re
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional
from botocore.exceptions import ClientError

from config import r2_client, R2_BUCKET, PRESIGNED_URL_EXPIRY, PUBLIC_URL, JWT_SECRET, logger


def clean_title(title: str) -> str:
    """Remove redundant prefixes like 'Épisode 1 —', 'Cours 1:', etc."""
    if not title:
        return title
    title = re.sub(r'^[ÉE]pisode\s+\d+\s*[—:\-–]\s*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'^Cours\s+\d+\s*[—:\-–]\s*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'^Module\s+\d+\s*[—:\-–]\s*', '', title, flags=re.IGNORECASE)
    return title.strip()


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
        logger.error(f"Presigned URL error for '{file_key}': {e}")
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
        logger.error(f"Upload URL error for '{file_key}': {e}")
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


def hash_password(password: str) -> str:
    """Create a secure hash of the password using HMAC-SHA256."""
    return hmac.new(JWT_SECRET.encode(), password.encode(), hashlib.sha256).hexdigest()


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against its stored hash."""
    return hmac.compare_digest(hash_password(password), stored_hash)


def now_utc() -> datetime:
    """Return current UTC datetime."""
    return datetime.now(timezone.utc)


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict (remove _id)."""
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != '_id'}
    return result


def serialize_docs(docs: list) -> list:
    """Convert list of MongoDB documents to JSON-serializable list."""
    return [serialize_doc(d) for d in docs if d]
