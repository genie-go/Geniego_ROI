import httpx
from typing import Dict, Any
from .config import settings

async def refresh_google(refresh_token: str) -> Dict[str, Any]:
    if not settings.google_client_id or not settings.google_client_secret:
        return {"ok": False, "error": "Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET"}
    url = "https://oauth2.googleapis.com/token"
    data = {"client_id": settings.google_client_id,"client_secret": settings.google_client_secret,"refresh_token": refresh_token,"grant_type": "refresh_token"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, data=data)
        if r.status_code >= 400:
            return {"ok": False, "error": r.text[:800]}
        return {"ok": True, "raw": r.json()}

async def refresh_tiktok(refresh_token: str) -> Dict[str, Any]:
    if not settings.tiktok_client_key or not settings.tiktok_client_secret:
        return {"ok": False, "error": "Missing TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET"}
    url = "https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/"
    data = {"app_id": settings.tiktok_client_key, "secret": settings.tiktok_client_secret, "refresh_token": refresh_token}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, data=data)
        if r.status_code >= 400:
            return {"ok": False, "error": r.text[:800]}
        return {"ok": True, "raw": r.json()}

async def refresh_meta(current_token: str) -> Dict[str, Any]:
    if not settings.meta_client_id or not settings.meta_client_secret:
        return {"ok": False, "error": "Missing META_CLIENT_ID/META_CLIENT_SECRET"}
    url = "https://graph.facebook.com/v20.0/oauth/access_token"
    params = {"grant_type":"fb_exchange_token","client_id": settings.meta_client_id,"client_secret": settings.meta_client_secret,"fb_exchange_token": current_token}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(url, params=params)
        if r.status_code >= 400:
            return {"ok": False, "error": r.text[:800]}
        return {"ok": True, "raw": r.json()}
