
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Security helpers for GENIE_ROI V323

- Password hashing: PBKDF2-HMAC-SHA256
- Signed session cookies: HMAC-SHA256 over payload
- Role-based access helpers
"""
from __future__ import annotations
import base64, hashlib, hmac, json, os, secrets, time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

PBKDF2_ITERS_DEFAULT = 210_000

def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode('ascii').rstrip('=')

def _b64d(s: str) -> bytes:
    pad = '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + pad).encode('ascii'))

def hash_password(password: str, *, salt: Optional[bytes]=None, iters: int = PBKDF2_ITERS_DEFAULT) -> str:
    if salt is None:
        salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iters)
    return f"pbkdf2_sha256${iters}${_b64e(salt)}${_b64e(dk)}"

def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, dk_b64 = stored.split('$', 3)
        if algo != 'pbkdf2_sha256':
            return False
        iters_i = int(iters)
        salt = _b64d(salt_b64)
        dk = _b64d(dk_b64)
        test = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iters_i)
        return hmac.compare_digest(test, dk)
    except Exception:
        return False

def get_secret_key(workspace_secret_path: str) -> bytes:
    # priority: env var
    env = os.environ.get('GENIE_ROI_SECRET_KEY', '').strip()
    if env:
        return env.encode('utf-8')
    # file-based secret
    try:
        with open(workspace_secret_path, 'rb') as f:
            b = f.read().strip()
            if b:
                return b
    except Exception:
        pass
    b = secrets.token_bytes(32)
    try:
        with open(workspace_secret_path, 'wb') as f:
            f.write(b)
    except Exception:
        pass
    return b

def sign_payload(payload: dict, secret: bytes) -> str:
    raw = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    sig = hmac.new(secret, raw, hashlib.sha256).digest()
    return _b64e(raw) + '.' + _b64e(sig)

def verify_payload(token: str, secret: bytes) -> Optional[dict]:
    if not token or '.' not in token:
        return None
    p_b64, s_b64 = token.split('.', 1)
    try:
        raw = _b64d(p_b64)
        sig = _b64d(s_b64)
        exp = hmac.new(secret, raw, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, exp):
            return None
        payload = json.loads(raw.decode('utf-8'))
        return payload
    except Exception:
        return None

def new_session_token(username: str, *, ttl_seconds: int, secret: bytes) -> str:
    now = int(time.time())
    payload = {'u': username, 'iat': now, 'exp': now + ttl_seconds, 'nonce': secrets.token_hex(8)}
    return sign_payload(payload, secret)

def session_user(token: str, secret: bytes) -> Optional[Tuple[str, dict]]:
    payload = verify_payload(token, secret)
    if not payload:
        return None
    now = int(time.time())
    if int(payload.get('exp', 0)) < now:
        return None
    u = payload.get('u')
    if not u:
        return None
    return u, payload

ROLE_ORDER = {'viewer': 1, 'analyst': 2, 'manager': 3, 'admin': 4}

def role_at_least(user_role: str, required: str) -> bool:
    return ROLE_ORDER.get(user_role, 0) >= ROLE_ORDER.get(required, 0)

def mask_api_key(key: str) -> str:
    if not key:
        return ''
    if len(key) <= 8:
        return '*' * len(key)
    return key[:4] + '...' + key[-4:]

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode('utf-8')).hexdigest()
