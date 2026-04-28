from cryptography.fernet import Fernet
from .config import settings
import json

def _fernet():
    if not settings.master_fernet_key:
        return None
    return Fernet(settings.master_fernet_key.encode("utf-8"))

def decrypt(blob: str) -> dict:
    f = _fernet()
    if not f:
        return json.loads(blob or "{}")
    raw = f.decrypt(blob.encode("utf-8"))
    return json.loads(raw.decode("utf-8"))

def encrypt(obj: dict) -> str:
    raw = json.dumps(obj).encode("utf-8")
    f = _fernet()
    if not f:
        return raw.decode("utf-8")
    return f.encrypt(raw).decode("utf-8")
