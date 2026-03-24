from typing import Dict, Any
import httpx, urllib.parse
from ..config import settings

def authorize_url(provider: str, state: str) -> str:
    if provider == "google":
        q = {"client_id": settings.google_client_id,"redirect_uri": f"{settings.oauth_redirect_base}/google",
             "response_type":"code","scope": settings.google_scopes,"access_type":"offline","prompt":"consent","state": state}
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(q)
    if provider == "meta":
        q = {"client_id": settings.meta_client_id,"redirect_uri": f"{settings.oauth_redirect_base}/meta",
             "response_type":"code","scope": settings.meta_scopes,"state": state}
        return "https://www.facebook.com/v20.0/dialog/oauth?" + urllib.parse.urlencode(q)
    if provider == "tiktok":
        q = {"client_key": settings.tiktok_client_key,"redirect_uri": f"{settings.oauth_redirect_base}/tiktok",
             "response_type":"code","scope": settings.tiktok_scopes,"state": state}
        return "https://business-api.tiktok.com/portal/auth?" + urllib.parse.urlencode(q)
    raise ValueError("Unknown provider")

async def exchange_code(provider: str, code: str) -> Dict[str, Any]:
    if provider == "google":
        token_url = "https://oauth2.googleapis.com/token"
        data = {"code": code,"client_id": settings.google_client_id,"client_secret": settings.google_client_secret,
                "redirect_uri": f"{settings.oauth_redirect_base}/google","grant_type":"authorization_code"}
    elif provider == "meta":
        token_url = "https://graph.facebook.com/v20.0/oauth/access_token"
        data = {"client_id": settings.meta_client_id,"client_secret": settings.meta_client_secret,
                "redirect_uri": f"{settings.oauth_redirect_base}/meta","code": code}
    elif provider == "tiktok":
        token_url = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/"
        data = {"app_id": settings.tiktok_client_key,"secret": settings.tiktok_client_secret,"auth_code": code}
    else:
        raise ValueError("Unknown provider")
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(token_url, data=data)
        r.raise_for_status()
        return r.json()
