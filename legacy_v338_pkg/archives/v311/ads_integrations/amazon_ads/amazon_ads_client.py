"""
Amazon Ads API Adapter (V308)
- Async reports: request -> poll -> download
- Profile selection support
- Campaign control placeholders
NOTE: Amazon Ads requires OAuth + LWA tokens; secrets not included.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Optional
import time, random
import requests

class AmazonAdsError(Exception): ...
class AmazonAdsAuthError(Exception): ...

@dataclass
class AmazonAuth:
    access_token: str  # LWA access token
    token_expires_at: Optional[int] = None

@dataclass
class AmazonConfig:
    base_url: str = "https://advertising-api.amazon.com"
    timeout_s: int = 30
    max_retries: int = 5

class AmazonAdsClient:
    def __init__(self, auth: AmazonAuth, cfg: AmazonConfig, profile_id: str):
        self.auth = auth
        self.cfg = cfg
        self.profile_id = profile_id

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.auth.access_token}",
            "Amazon-Advertising-API-Scope": self.profile_id,
            "Content-Type": "application/json"
        }

    def _request(self, method: str, path: str, json: Optional[Dict[str, Any]]=None, params: Optional[Dict[str, Any]]=None) -> Any:
        url = f"{self.cfg.base_url}/{path.lstrip('/')}"
        for attempt in range(self.cfg.max_retries):
            r = requests.request(method, url, headers=self._headers(), json=json, params=params, timeout=self.cfg.timeout_s)
            if r.status_code in (401, 403):
                raise AmazonAdsAuthError(r.text)
            if r.status_code in (429,) or (500 <= r.status_code < 600):
                time.sleep(min(60, (2 ** attempt) + random.random()))
                continue
            if not r.ok:
                raise AmazonAdsError(f"{r.status_code}: {r.text}")
            try:
                return r.json()
            except Exception:
                return r.text

    def create_report(self, report_path: str, payload: Dict[str, Any]) -> Any:
        return self._request("POST", report_path, json=payload)

    def get_report(self, report_path: str, report_id: str) -> Any:
        return self._request("GET", f"{report_path}/{report_id}")
