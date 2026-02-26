# Apple Sign-In Service for Sijill Project

import jwt
import json
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


def get_apple_config():
    """Get Apple Sign-In configuration from environment."""
    return {
        'team_id': os.environ.get('APPLE_TEAM_ID', ''),
        'key_id': os.environ.get('APPLE_KEY_ID', ''),
        'service_id': os.environ.get('APPLE_SERVICE_ID', ''),
        'private_key': os.environ.get('APPLE_PRIVATE_KEY', ''),
        'redirect_uri': os.environ.get('APPLE_REDIRECT_URI', '')
    }


def is_apple_auth_configured() -> bool:
    """Check if Apple Sign-In is configured."""
    config = get_apple_config()
    return bool(config['team_id'] and config['key_id'] and config['service_id'] and config['private_key'])


def generate_apple_client_secret() -> str:
    """
    Generate a JWT client secret for Apple OAuth server communication.
    This secret proves our server's identity to Apple.
    """
    if not is_apple_auth_configured():
        raise ValueError("Apple Sign-In not configured")
    
    now = datetime.now(timezone.utc)
    
    headers = {
        "alg": "ES256",
        "kid": APPLE_KEY_ID,
        "typ": "JWT"
    }
    
    payload = {
        "iss": APPLE_TEAM_ID,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=5)).timestamp()),
        "aud": "https://appleid.apple.com",
        "sub": APPLE_SERVICE_ID
    }
    
    # The private key should be the full PEM content
    private_key = APPLE_PRIVATE_KEY.replace('\\n', '\n')
    
    client_secret = jwt.encode(
        payload,
        private_key,
        algorithm="ES256",
        headers=headers
    )
    
    return client_secret


async def exchange_apple_code_for_tokens(auth_code: str) -> Dict:
    """
    Exchange authorization code for access and identity tokens from Apple.
    
    Args:
        auth_code: The authorization code received from Apple's OAuth flow
        
    Returns:
        dict containing id_token, access_token, refresh_token, etc.
    """
    client_secret = generate_apple_client_secret()
    
    data = {
        "client_id": APPLE_SERVICE_ID,
        "client_secret": client_secret,
        "code": auth_code,
        "grant_type": "authorization_code",
        "redirect_uri": APPLE_REDIRECT_URI
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://appleid.apple.com/auth/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
    
    if response.status_code != 200:
        logger.error(f"Apple token exchange failed: {response.status_code} - {response.text}")
        raise ValueError(f"Token exchange failed: {response.text}")
    
    return response.json()


async def validate_apple_identity_token(id_token: str) -> Dict:
    """
    Validate Apple's identity token by verifying its signature with Apple's public keys.
    
    Args:
        id_token: The JWT identity token from Apple
        
    Returns:
        dict containing user info (sub, email, etc.)
    """
    # Fetch Apple's public keys
    async with httpx.AsyncClient() as client:
        response = await client.get("https://appleid.apple.com/auth/keys")
        keys_data = response.json()
    
    # Decode token header to get the key ID
    unverified_header = jwt.get_unverified_header(id_token)
    kid = unverified_header.get("kid")
    
    # Find the matching public key
    matching_key = None
    for key in keys_data.get("keys", []):
        if key.get("kid") == kid:
            matching_key = key
            break
    
    if not matching_key:
        raise ValueError("Unable to find matching Apple public key for token verification")
    
    # Convert JWK to PEM public key
    from jwt.algorithms import RSAAlgorithm
    public_key = RSAAlgorithm.from_jwk(json.dumps(matching_key))
    
    try:
        # Verify and decode the token
        decoded = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"],
            audience=APPLE_SERVICE_ID,
            issuer="https://appleid.apple.com"
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise ValueError("Apple identity token has expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid Apple identity token: {str(e)}")


def decode_apple_user_data(user_data: str) -> Dict:
    """
    Decode the user data sent by Apple on first authentication.
    Apple only sends user info (name, email) on the FIRST sign-in.
    
    Args:
        user_data: JSON string with user info from Apple
        
    Returns:
        dict with name and email info
    """
    if not user_data:
        return {}
    
    try:
        if isinstance(user_data, str):
            return json.loads(user_data)
        return user_data
    except json.JSONDecodeError:
        logger.warning(f"Failed to decode Apple user data: {user_data}")
        return {}


def get_apple_auth_url(state: Optional[str] = None) -> str:
    """
    Generate the Apple Sign-In authorization URL.
    
    Args:
        state: Optional state parameter for CSRF protection
        
    Returns:
        The full authorization URL to redirect users to
    """
    if not is_apple_auth_configured():
        raise ValueError("Apple Sign-In not configured")
    
    import urllib.parse
    
    params = {
        "client_id": APPLE_SERVICE_ID,
        "redirect_uri": APPLE_REDIRECT_URI,
        "response_type": "code id_token",
        "response_mode": "form_post",
        "scope": "name email",
    }
    
    if state:
        params["state"] = state
    
    query_string = urllib.parse.urlencode(params)
    return f"https://appleid.apple.com/auth/authorize?{query_string}"
