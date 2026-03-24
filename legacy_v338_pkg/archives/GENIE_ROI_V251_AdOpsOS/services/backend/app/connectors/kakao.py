from __future__ import annotations
import os
from typing import List, Dict, Any
from .base import Campaign
from app.core.config import settings

class KakaoMomentConnector:
    channel = "kakao"
    def __init__(self):
        self.mode = settings.auth_mode
        self.access_token = os.getenv("KAKAO_ACCESS_TOKEN","")
        self.ad_account_id = os.getenv("KAKAO_AD_ACCOUNT_ID","")

    def list_campaigns(self, account_id: str) -> List[Campaign]:
        return [Campaign(channel="kakao", account_id=account_id, campaign_id="k1", name="Stub Kakao Campaign", status="ON")]

    def update_daily_budget(self, account_id: str, campaign_id: str, new_daily_budget: float) -> Dict[str, Any]:
        return {"ok": False, "message": "Kakao Moment integration blueprint included; implement per API policy.", "meta": {}}
