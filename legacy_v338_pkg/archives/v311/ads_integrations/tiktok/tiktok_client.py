"""
TikTok Ads API Adapter (V308)
- OAuth2 token handling placeholders
- Reporting: async report task create + poll + download
- Campaign control: status/budget/bid updates
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Optional
import time, random
import requests

class TikTokApiError(Exception): ...
class TikTokAuthError(Exception): ...

@dataclass
class TikTokAuth:
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[int] = None

@dataclass
class TikTokConfig:
    base_url: str = "https://business-api.tiktok.com/open_api/v1.3"
    timeout_s: int = 30
    max_retries: int = 5

class TikTokClient:
    def __init__(self, auth: TikTokAuth, cfg: TikTokConfig):
        self.auth = auth
        self.cfg = cfg

    def _headers(self) -> Dict[str, str]:
        return {"Access-Token": self.auth.access_token, "Content-Type": "application/json"}

    def _request(self, method: str, path: str, json: Optional[Dict[str, Any]]=None) -> Dict[str, Any]:
        url = f"{self.cfg.base_url}/{path.lstrip('/')}"
        for attempt in range(self.cfg.max_retries):
            r = requests.request(method, url, headers=self._headers(), json=json, timeout=self.cfg.timeout_s)
            if r.status_code in (401, 403):
                raise TikTokAuthError(r.text)
            if r.status_code in (429,) or (500 <= r.status_code < 600):
                time.sleep(min(60, (2 ** attempt) + random.random()))
                continue
            if not r.ok:
                raise TikTokApiError(f"{r.status_code}: {r.text}")
            return r.json()
        raise TikTokApiError("Retries exhausted")

    def pause_campaign(self, advertiser_id: str, campaign_id: str) -> Dict[str, Any]:
        return self._request("POST", "campaign/update/", json={"advertiser_id": advertiser_id, "campaign_id": campaign_id, "operation_status": "DISABLE"})

    def update_budget(self, advertiser_id: str, campaign_id: str, budget: float) -> Dict[str, Any]:
        return self._request("POST", "campaign/update/", json={"advertiser_id": advertiser_id, "campaign_id": campaign_id, "budget": budget})

    def create_report_task(self, advertiser_id: str, report_type: str, dimensions: list, metrics: list, start_date: str, end_date: str) -> Dict[str, Any]:
        return self._request("POST", "report/integrated/get/", json={
            "advertiser_id": advertiser_id,
            "report_type": report_type,
            "dimensions": dimensions,
            "metrics": metrics,
            "start_date": start_date,
            "end_date": end_date
        })
