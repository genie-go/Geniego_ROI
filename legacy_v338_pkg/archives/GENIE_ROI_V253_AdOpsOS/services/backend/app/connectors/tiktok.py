from __future__ import annotations
import os
from typing import List, Dict, Any
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from .base import Campaign
from app.core.config import settings

class TikTokAdsConnector:
    channel = "tiktok"
    def __init__(self):
        self.mode = settings.auth_mode
        self.access_token = os.getenv("TIKTOK_ACCESS_TOKEN","")
        self.advertiser_id = os.getenv("TIKTOK_ADVERTISER_ID","")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    def list_campaigns(self, account_id: str) -> List[Campaign]:
        if self.mode != "real" or not self.access_token or not self.advertiser_id:
            return [Campaign(channel="tiktok", account_id=account_id, campaign_id="t1", name="Stub TikTok Campaign", status="ENABLE")]
        url = "https://business-api.tiktok.com/open_api/v1.3/campaign/get/"
        headers = {"Access-Token": self.access_token}
        params = {"advertiser_id": self.advertiser_id, "page_size": 50}
        with httpx.Client(timeout=20) as c:
            r = c.get(url, headers=headers, params=params)
            r.raise_for_status()
            data = (r.json().get("data") or {}).get("list", [])
        out = []
        for x in data:
            out.append(Campaign(channel="tiktok", account_id=account_id, campaign_id=str(x.get("campaign_id")), name=x.get("campaign_name",""), status=x.get("operation_status","")))
        return out

    def update_daily_budget(self, account_id: str, campaign_id: str, new_daily_budget: float) -> Dict[str, Any]:
        return {"ok": False, "message": "TikTok budget mutation template only. Implement mutate endpoint with client policy.", "meta": {}}
