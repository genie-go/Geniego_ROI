import os, time, json, datetime, random
import requests

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
INTERVAL_SECONDS = int(os.getenv("COLLECT_INTERVAL_SECONDS", "300"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() in ("1","true","yes","y")

def api(method, path, payload=None):
    headers = {"Content-Type":"application/json", "X-Tenant-ID": TENANT_ID}
    if API_KEY:
        headers["X-API-Key"] = API_KEY
    url = f"{API_BASE}{path}"
    r = requests.request(method, url, headers=headers, data=json.dumps(payload) if payload is not None else None, timeout=30)
    text = r.text.strip()
    data = json.loads(text) if text else None
    if r.status_code >= 300:
        raise RuntimeError(f"{method} {path} {r.status_code} {text}")
    return data

def today_iso():
    return datetime.date.today().isoformat()

class ProviderCollector:
    provider = "base"
    def fetch_ads_metrics(self, account, day: str):
        raise NotImplementedError

class GoogleAdsCollector(ProviderCollector):
    provider = "google_ads"
    def fetch_ads_metrics(self, account, day: str):
        # Real implementation would call Google Ads API reporting endpoints using OAuth2.
        # We keep a safe default: DRY_RUN generates plausible metrics.
        if DRY_RUN or account.get("config", {}).get("dry_run", True):
            spend = round(random.uniform(50, 500), 2)
            clicks = random.randint(30, 400)
            conv = random.randint(0, 40)
            return [{"date": day, "provider": "google_ads", "campaign_id": "demo_campaign", "spend": spend, "clicks": clicks, "conversions": conv}]
        # Example placeholder:
        # token = account["config"]["access_token"]
        # customer_id = account["config"]["customer_id"]
        # ... call google ads reporting endpoint ...
        return []

class MetaCollector(ProviderCollector):
    provider = "meta"
    def fetch_ads_metrics(self, account, day: str):
        if DRY_RUN or account.get("config", {}).get("dry_run", True):
            spend = round(random.uniform(30, 300), 2)
            clicks = random.randint(10, 250)
            conv = random.randint(0, 30)
            return [{"date": day, "provider": "meta", "campaign_id": "demo_adset", "spend": spend, "clicks": clicks, "conversions": conv}]
        # Placeholder for Meta Marketing API calls.
        return []


class NaverSearchCollector(ProviderCollector):
    provider = "naver_sa"
    def fetch_ads_metrics(self, account, day: str):
        # Naver Search Ads (SA) reporting collector (placeholder).
        # Real integration requires Naver SA API keys + signature. Keep DRY_RUN safe by default.
        if DRY_RUN or account.get("config", {}).get("dry_run", True):
            spend = round(random.uniform(20, 250), 2)
            clicks = random.randint(10, 220)
            conv = random.randint(0, 25)
            return [{"date": day, "provider": "naver_sa", "campaign_id": "demo_naver", "spend": spend, "clicks": clicks, "conversions": conv}]
        return []

class KakaoMomentCollector(ProviderCollector):
    provider = "kakao_moment"
    def fetch_ads_metrics(self, account, day: str):
        # Kakao Moment reporting collector (placeholder).
        # Real integration requires Kakao developers app + OAuth tokens/scopes.
        if DRY_RUN or account.get("config", {}).get("dry_run", True):
            spend = round(random.uniform(15, 200), 2)
            clicks = random.randint(5, 180)
            conv = random.randint(0, 20)
            return [{"date": day, "provider": "kakao_moment", "campaign_id": "demo_kakao", "spend": spend, "clicks": clicks, "conversions": conv}]
        return []

COLLECTORS = {
    "google_ads": GoogleAdsCollector(),
    "meta": MetaCollector(),
    "naver_sa": NaverSearchCollector(),
    "kakao_moment": KakaoMomentCollector(),
}

def collect_once():
    accounts = api("GET", "/v1/connectors/accounts") or []
    day = today_iso()
    rows = []
    for acc in accounts:
        provider = (acc.get("provider") or "").lower()
        coll = COLLECTORS.get(provider)
        if not coll:
            continue
        try:
            rows.extend(coll.fetch_ads_metrics({"provider": provider, "account_id": acc.get("account_id"), "config": {}}, day))
        except Exception as e:
            print("[collectors] provider error", provider, e, flush=True)

    if rows:
        api("POST", "/v1/roi/metrics/ads", {"rows": rows})
        print(f"[collectors] ingested {len(rows)} ads metrics rows", flush=True)
    else:
        print("[collectors] nothing to ingest", flush=True)

def main():
    print("[collectors] started", "DRY_RUN" if DRY_RUN else "LIVE", flush=True)
    while True:
        try:
            collect_once()
        except Exception as e:
            print("[collectors] error", e, flush=True)
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
