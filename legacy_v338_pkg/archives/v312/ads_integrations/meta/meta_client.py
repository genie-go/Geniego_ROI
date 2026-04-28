"""
Meta Marketing API Adapter (V308)
- Production-oriented HTTP client skeleton (retry, rate limit, idempotency keys)
- OAuth token refresh placeholders (no secrets included)
- Campaign lifecycle: create/update/pause, budget updates, insights pulls
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Optional, List
import time, random
import requests

class RateLimitError(Exception): ...
class AuthError(Exception): ...
class ApiError(Exception): ...

@dataclass
class MetaAuth:
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[int] = None

@dataclass
class MetaConfig:
    graph_base_url: str = "https://graph.facebook.com"
    api_version: str = "v20.0"  # adjust per Meta release
    timeout_s: int = 30
    max_retries: int = 5

class MetaClient:
    def __init__(self, auth: MetaAuth, cfg: MetaConfig):
        self.auth = auth
        self.cfg = cfg

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.auth.access_token}"}

    def _request(self, method: str, path: str, params: Optional[Dict[str, Any]]=None, json: Optional[Dict[str, Any]]=None) -> Dict[str, Any]:
        url = f"{self.cfg.graph_base_url}/{self.cfg.api_version}/{path.lstrip('/')}"
        for attempt in range(self.cfg.max_retries):
            r = requests.request(method, url, headers=self._headers(), params=params, json=json, timeout=self.cfg.timeout_s)
            if r.status_code in (401, 403):
                raise AuthError(r.text)
            if r.status_code == 429:
                # basic backoff; integrate with platform token-bucket in production
                sleep = min(60, (2 ** attempt) + random.random())
                time.sleep(sleep)
                continue
            if 500 <= r.status_code < 600:
                sleep = min(60, (2 ** attempt) + random.random())
                time.sleep(sleep)
                continue
            if not r.ok:
                raise ApiError(f"{r.status_code}: {r.text}")
            return r.json()
        raise RateLimitError("Meta API retries exhausted")

    # --- Campaign control ---
    def pause_campaign(self, campaign_id: str) -> Dict[str, Any]:
        return self._request("POST", f"{campaign_id}", json={"status": "PAUSED"})

    def activate_campaign(self, campaign_id: str) -> Dict[str, Any]:
        return self._request("POST", f"{campaign_id}", json={"status": "ACTIVE"})

    def update_budget(self, adset_id: str, daily_budget: int) -> Dict[str, Any]:
        return self._request("POST", f"{adset_id}", json={"daily_budget": daily_budget})

    # --- Reporting (insights) ---
    def fetch_insights(self, object_id: str, fields: List[str], time_range: Dict[str, str], level: str="ad") -> Dict[str, Any]:
        params = {
            "fields": ",".join(fields),
            "time_range": str(time_range).replace("'", '"'),
            "level": level,
        }
        return self._request("GET", f"{object_id}/insights", params=params)
