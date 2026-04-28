import httpx
from typing import Dict, Any
from .config import settings

async def meta_set_budget(access_token: str, external_id: str, new_budget: float) -> Dict[str, Any]:
    url = f"https://graph.facebook.com/v20.0/{external_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    data = {"daily_budget": int(new_budget * 100)}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, headers=headers, data=data)
        r.raise_for_status()
        return r.json()

async def tiktok_set_budget(access_token: str, external_id: str, new_budget: float) -> Dict[str, Any]:
    url = "https://business-api.tiktok.com/open_api/v1.3/campaign/update/"
    headers = {"Access-Token": access_token}
    body = {"campaign_id": external_id, "budget": float(new_budget)}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post(url, headers=headers, json=body)
        r.raise_for_status()
        return r.json()

async def google_ads_mutate_budget(access_token: str, budget_resource_name: str, new_budget_micros: int) -> Dict[str, Any]:
    if not settings.google_developer_token or not settings.google_customer_id:
        return {"status": "MISSING_GOOGLE_ENV", "need": ["GOOGLE_DEVELOPER_TOKEN", "GOOGLE_CUSTOMER_ID"]}
    url = f"https://googleads.googleapis.com/v16/customers/{settings.google_customer_id}/googleAds:mutate"
    headers = {"Authorization": f"Bearer {access_token}", "developer-token": settings.google_developer_token, "Content-Type": "application/json"}
    if settings.google_login_customer_id:
        headers["login-customer-id"] = settings.google_login_customer_id
    body = {"mutate_operations": [{"campaign_budget_operation": {"update": {"resource_name": budget_resource_name, "amount_micros": new_budget_micros}, "update_mask": "amount_micros"}}]}
    async with httpx.AsyncClient(timeout=25.0) as client:
        r = await client.post(url, headers=headers, json=body)
        if r.status_code >= 400:
            return {"status": "GOOGLE_MUTATE_ERROR", "http_status": r.status_code, "detail": r.text[:800]}
        return r.json()
