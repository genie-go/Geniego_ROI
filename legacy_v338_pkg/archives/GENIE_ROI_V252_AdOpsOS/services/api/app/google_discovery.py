"""Google Ads auto-discovery (GAQL).
V236: Vault-aware. If SecretRef contains vault_ref, API reads Vault to get access_token.
"""
import httpx
from typing import Dict, Any, Optional
from .config import settings
from .secrets import decrypt_local, vault_get

async def _vault_read_secret(vault_ref: str) -> dict | None:
    v = await vault_get(vault_ref)
    if not v:
        return None
    return v.get("data", {}).get("data", {}) or None

async def extract_access_token(secret_json: str) -> Optional[str]:
    obj = decrypt_local(secret_json or "{}")
    if "vault_ref" in obj:
        sec = await _vault_read_secret(obj["vault_ref"])
        return (sec or {}).get("access_token")
    return obj.get("access_token")

async def discover_budget_resource(access_token: str, campaign_id: int) -> Dict[str, Any]:
    if not settings.google_developer_token or not settings.google_customer_id:
        return {"ok": False, "error": "Missing GOOGLE_DEVELOPER_TOKEN/GOOGLE_CUSTOMER_ID"}
    url = f"https://googleads.googleapis.com/v16/customers/{settings.google_customer_id}/googleAds:search"
    headers = {"Authorization": f"Bearer {access_token}", "developer-token": settings.google_developer_token, "Content-Type": "application/json"}
    if settings.google_login_customer_id:
        headers["login-customer-id"] = settings.google_login_customer_id

    query = f"SELECT campaign.id, campaign.campaign_budget FROM campaign WHERE campaign.id = {int(campaign_id)}"
    body = {"query": query, "page_size": 50}
    async with httpx.AsyncClient(timeout=25.0) as client:
        r = await client.post(url, headers=headers, json=body)
        if r.status_code >= 400:
            return {"ok": False, "error": r.text[:800], "http_status": r.status_code}
        data = r.json()
        results = data.get("results", [])
        if not results:
            return {"ok": False, "error": "No results. Check campaign id/permissions."}
        item = results[0].get("campaign", {}) or {}
        # API may return either campaignBudget or campaign_budget, normalize
        budget = item.get("campaignBudget") or item.get("campaign_budget") or item.get("campaignBudget")
        return {"ok": True, "campaign_id": int(item.get("id") or campaign_id), "campaign_budget": budget}
