from __future__ import annotations
import os
from typing import List, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from .base import Campaign
from app.core.config import settings

class MetaAdsConnector:
    channel = "meta"
    def __init__(self):
        self.mode = settings.auth_mode
        self.access_token = os.getenv("META_ACCESS_TOKEN","")
        self.api_version = os.getenv("META_API_VERSION","v20.0")
        self.ad_account_id = os.getenv("META_AD_ACCOUNT_ID","")  # format: act_<id>

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    def list_campaigns(self, account_id: str) -> List[Campaign]:
        if self.mode != "real" or not self.access_token or not self.ad_account_id:
            return [Campaign(channel="meta", account_id=account_id, campaign_id="m1", name="Stub Meta Campaign", status="ACTIVE", daily_budget=None)]
        url = f"https://graph.facebook.com/{self.api_version}/{self.ad_account_id}/campaigns"
        params = {"access_token": self.access_token, "fields": "id,name,status"}
        with httpx.Client(timeout=20) as c:
            r = c.get(url, params=params)
            r.raise_for_status()
            data = r.json().get("data", [])
        return [Campaign(channel="meta", account_id=account_id, campaign_id=x["id"], name=x.get("name",""), status=x.get("status","")) for x in data]

    def update_daily_budget(self, account_id: str, campaign_id: str, new_daily_budget: float) -> Dict[str, Any]:
        # NOTE: Meta budgets are usually at adset level; campaign budget requires CBO and specific fields.
        # This method is provided as a real-mode template and will likely need adaptation per customer's setup.
        return {"ok": False, "message": "Meta budget mutation is account-structure dependent (often adset). Implement per client policy.", "meta": {}}
