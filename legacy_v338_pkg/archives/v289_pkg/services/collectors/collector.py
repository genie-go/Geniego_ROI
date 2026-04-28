import os, time, json, datetime, random, hashlib
import requests
from typing import Any, Dict, Optional, Tuple

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
INTERVAL_SECONDS = int(os.getenv("COLLECT_INTERVAL_SECONDS", "300"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() in ("1","true","yes","y")

# Provider priority for lock-in loops (Global + KR)
PROVIDER_PRIORITY = ["google_ads", "meta_ads", "tiktok_ads", "amazon_ads", "naver_sa", "kakao_moment"]

DEFAULT_RATE_LIMITS = {
    "google_ads": {"rps": 8, "burst": 16, "max_retries": 6},
    "meta_ads": {"rps": 10, "burst": 20, "max_retries": 6},
    "tiktok_ads": {"rps": 8, "burst": 16, "max_retries": 6},
    "amazon_ads": {"rps": 6, "burst": 12, "max_retries": 6},
    "naver_sa": {"rps": 5, "burst": 10, "max_retries": 6},
    "kakao_moment": {"rps": 6, "burst": 12, "max_retries": 6},
}

def api(method: str, path: str, payload: Optional[dict]=None):
    headers = {"Content-Type":"application/json", "X-Tenant-ID": TENANT_ID}
    if API_KEY:
        headers["X-API-Key"] = API_KEY
    url = f"{API_BASE}{path}"
    r = requests.request(method, url, headers=headers, data=json.dumps(payload) if payload is not None else None, timeout=30)
    text = r.text.strip()
    data = json.loads(text) if text else None
    if r.status_code >= 300:
        raise RuntimeError(f"{method} {path} -> {r.status_code}: {text}")
    return data

def get_checkpoint(provider: str, account_id: str) -> Optional[str]:
    try:
        res = api("GET", f"/v1/collectors/checkpoints/{provider}/{account_id}")
        return res.get("cursor")
    except Exception:
        return None

def set_checkpoint(provider: str, account_id: str, cursor: str):
    api("POST", f"/v1/collectors/checkpoints/{provider}/{account_id}", {"cursor": cursor})

def get_rate_limits(provider: str) -> dict:
    try:
        res = api("GET", f"/v1/providers/rate_limits/{provider}")
        limits = res.get("limits") or {}
        base = dict(DEFAULT_RATE_LIMITS.get(provider, {"rps":5,"burst":10,"max_retries":6}))
        for k in list(base.keys()):
            if k in limits:
                base[k] = limits[k]
        for k, v in limits.items():
            base[k] = v
        return base
    except Exception:
        return DEFAULT_RATE_LIMITS.get(provider, {"rps":5,"burst":10,"max_retries":6})

class TokenBucket:
    def __init__(self, rps: float, burst: int):
        self.rps = max(float(rps), 0.1)
        self.capacity = max(int(burst), 1)
        self.tokens = float(self.capacity)
        self.last = time.time()

    def take(self, n: float=1.0):
        while True:
            now = time.time()
            elapsed = now - self.last
            self.last = now
            self.tokens = min(self.capacity, self.tokens + elapsed*self.rps)
            if self.tokens >= n:
                self.tokens -= n
                return
            need = (n - self.tokens) / self.rps
            time.sleep(min(max(need, 0.01), 1.0))

def backoff_sleep(attempt: int, base: float=0.5, cap: float=30.0):
    exp = min(cap, base * (2 ** attempt))
    time.sleep(random.random() * exp)

class ProviderClient:
    provider = "base"

    def __init__(self, auth: dict, rate_limits: dict):
        self.auth = auth or {}
        self.bucket = TokenBucket(rate_limits.get("rps",5), rate_limits.get("burst",10))
        self.max_retries = int(rate_limits.get("max_retries",6))

    # --- LIVE auth templates ---
    def oauth2_refresh(self, token_url: str, client_id: str, client_secret: str, refresh_token: str) -> str:
        self.bucket.take()
        resp = requests.post(token_url, data={
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
        }, timeout=30)
        if resp.status_code >= 300:
            raise RuntimeError(f"oauth_refresh_failed: {resp.status_code} {resp.text}")
        return resp.json().get("access_token")

    def signed_headers(self, method: str, path: str, timestamp_ms: int, body: str="") -> Dict[str,str]:
        # Signature template placeholder (e.g. Naver SA). Implement HMAC as required.
        return {}

    def fetch_metrics_incremental(self, account: dict, cursor: Optional[str]) -> Tuple[str, list]:
        raise NotImplementedError

class DryRunAdsClient(ProviderClient):
    def __init__(self, provider: str, auth: dict, rate_limits: dict):
        super().__init__(auth, rate_limits)
        self.provider = provider

    def fetch_metrics_incremental(self, account: dict, cursor: Optional[str]) -> Tuple[str, list]:
        seed = int(hashlib.sha256((self.provider + account["account_id"]).encode()).hexdigest(), 16) % 10_000
        random.seed(seed + int(time.time() // 3600))
        day = datetime.date.today().isoformat()
        rows = []
        for i in range(3):
            spend = round(random.random() * 200 + 20, 2)
            conv = int(spend / (random.random() * 40 + 10))
            rows.append({
                "provider": self.provider,
                "account_id": account["account_id"],
                "campaign_id": f"camp_{i}",
                "spend": spend,
                "impressions": int(spend * (random.random()*200 + 100)),
                "clicks": int(spend * (random.random()*3 + 1)),
                "conversions": conv,
            })
        return day, rows

class GoogleAdsClient(ProviderClient): provider="google_ads"
class MetaAdsClient(ProviderClient): provider="meta_ads"
class TikTokAdsClient(ProviderClient): provider="tiktok_ads"
class AmazonAdsClient(ProviderClient): provider="amazon_ads"
class NaverSAClient(ProviderClient): provider="naver_sa"
class KakaoMomentClient(ProviderClient): provider="kakao_moment"

LIVE_CLIENTS = {
    "google_ads": GoogleAdsClient,
    "meta_ads": MetaAdsClient,
    "tiktok_ads": TikTokAdsClient,
    "amazon_ads": AmazonAdsClient,
    "naver_sa": NaverSAClient,
    "kakao_moment": KakaoMomentClient,
}

def make_client(provider: str, auth: dict) -> ProviderClient:
    limits = get_rate_limits(provider)
    if DRY_RUN:
        return DryRunAdsClient(provider, auth, limits)

    cls = LIVE_CLIENTS.get(provider)
    if not cls:
        return DryRunAdsClient(provider, auth, limits)
    client = cls(auth, limits)

    # LIVE TEMPLATE: implement per-provider endpoints here.
    # To keep repo runnable out-of-the-box, we default to dry-run metrics even in LIVE mode
    # unless you set LIVE_IMPLEMENTED=true in auth_json.
    if not auth.get("LIVE_IMPLEMENTED", False):
        return DryRunAdsClient(provider, auth, limits)

    return client

def robust_collect(provider: str, account: dict):
    cursor = get_checkpoint(provider, account["account_id"])
    auth = account.get("auth") or {}
    client = make_client(provider, auth)

    attempt = 0
    while True:
        try:
            next_cursor, rows = client.fetch_metrics_incremental(account, cursor)
            day = datetime.date.today().isoformat()
            api("POST", "/v1/roi/metrics/ads", {"day": day, "rows": rows})
            if next_cursor:
                set_checkpoint(provider, account["account_id"], next_cursor)
            return
        except Exception as e:
            attempt += 1
            if attempt > getattr(client, "max_retries", 6):
                raise
            backoff_sleep(attempt)

def main():
    while True:
        try:
            accounts = api("GET", "/v1/connectors/accounts").get("items", [])
            by_provider: Dict[str, list] = {}
            for a in accounts:
                by_provider.setdefault(a.get("provider"), []).append(a)

            for provider in PROVIDER_PRIORITY:
                for account in by_provider.get(provider, []):
                    robust_collect(provider, account)

        except Exception as e:
            print(f"[collectors] error: {e}", flush=True)

        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
