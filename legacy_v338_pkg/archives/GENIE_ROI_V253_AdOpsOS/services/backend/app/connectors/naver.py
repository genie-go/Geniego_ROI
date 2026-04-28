from __future__ import annotations
import os
from typing import List, Dict, Any
from .base import Campaign
from app.core.config import settings

class NaverSearchAdConnector:
    channel = "naver"
    def __init__(self):
        self.mode = settings.auth_mode
        self.api_key = os.getenv("NAVER_API_KEY","")
        self.secret_key = os.getenv("NAVER_SECRET_KEY","")
        self.customer_id = os.getenv("NAVER_CUSTOMER_ID","")

    def list_campaigns(self, account_id: str) -> List[Campaign]:
        # Naver SearchAd requires signed requests. We provide a stub + signing blueprint in docs.
        return [Campaign(channel="naver", account_id=account_id, campaign_id="n1", name="Stub Naver Campaign", status="ON")]

    def update_daily_budget(self, account_id: str, campaign_id: str, new_daily_budget: float) -> Dict[str, Any]:
        return {"ok": False, "message": "Naver budget mutation requires signed requests; see docs/MULTICHANNEL_REAL_INTEGRATION.md", "meta": {}}
