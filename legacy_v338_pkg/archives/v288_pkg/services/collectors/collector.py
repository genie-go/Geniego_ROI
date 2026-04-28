import os, time, json, datetime, random, hashlib
import requests

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
INTERVAL_SECONDS = int(os.getenv("COLLECT_INTERVAL_SECONDS", "300"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() in ("1","true","yes","y")

# Provider priority for KR/Global lock-in loops
PROVIDER_PRIORITY = ["google_ads", "meta_ads", "tiktok_ads", "naver_sa", "kakao_moment"]

def api(method, path, payload=None):
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

def get_checkpoint(provider, account_id):
    try:
        res = api("GET", f"/v1/collectors/checkpoints/{provider}/{account_id}")
        return res.get("cursor")
    except Exception:
        return None

def set_checkpoint(provider, account_id, cursor):
    api("POST", f"/v1/collectors/checkpoints/{provider}/{account_id}", {"cursor": cursor})

class BaseCollector:
    provider = "base"
    def collect(self, account):
        raise NotImplementedError

    def _emit_ads_metrics(self, day, rows):
        api("POST", "/v1/roi/metrics/ads", {"day": day, "rows": rows})

class DryRunAdsCollector(BaseCollector):
    def __init__(self, provider):
        self.provider = provider

    def collect(self, account):
        # Deterministic pseudo-metrics so dev/stage is stable
        seed = int(hashlib.sha256((self.provider + account["account_id"]).encode()).hexdigest(), 16) % 10_000
        random.seed(seed + int(time.time() // 3600))  # change hourly
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
                "impressions": int(spend * 100),
                "clicks": int(spend * 3),
                "conversions": conv
            })
        self._emit_ads_metrics(day, rows)
        # advance cursor checkpoint (simulated)
        cursor = str(int(time.time()))
        set_checkpoint(self.provider, account["account_id"], cursor)
        return {"day": day, "rows": len(rows), "cursor": cursor}

def build_collectors():
    # In production replace DryRunAdsCollector with real API-backed collectors.
    return {
        "google_ads": DryRunAdsCollector("google_ads"),
        "meta_ads": DryRunAdsCollector("meta_ads"),
        "naver_sa": DryRunAdsCollector("naver_sa"),
        "kakao_moment": DryRunAdsCollector("kakao_moment"),
    }

def with_backoff(fn, max_tries=5, base_sleep=1.0):
    for i in range(max_tries):
        try:
            return fn()
        except Exception as e:
            if i == max_tries - 1:
                raise
            sleep = base_sleep * (2 ** i)
            time.sleep(sleep)

def list_accounts():
    res = api("GET", "/v1/connectors/accounts")
    return res.get("items", [])

def collect_provider(provider, account_id, cursor):
    # DRY_RUN generates deterministic fake metrics; LIVE expects provider-specific auth_json in connector_accounts.
    today = datetime.date.today()
    date_str = today.strftime("%Y-%m-%d")
    # Basic deterministic seed
    seed = int(hashlib.sha256(f"{TENANT_ID}|{provider}|{account_id}|{date_str}".encode()).hexdigest()[:8], 16)
    rnd = random.Random(seed)

    rows = []
    # Note: these "rows" map to /v1/roi/metrics/ads ingest format used by gateway.
    for d in range(0, 1):
        spend = round(rnd.random() * 1000, 2)
        imps = int(rnd.random() * 200000)
        clicks = int(imps * (0.01 + rnd.random()*0.02))
        conv = int(clicks * (0.01 + rnd.random()*0.05))
        rows.append({
            "provider": provider,
            "account_id": account_id,
            "date": date_str,
            "spend": spend,
            "impressions": imps,
            "clicks": clicks,
            "conversions": conv,
        })

    if not rows:
        return cursor

    api("POST", "/v1/roi/metrics/ads", {"rows": rows})
    # advance cursor best-effort
    new_cursor = date_str
    api("POST", f"/v1/collectors/checkpoints/{provider}/{account_id}", {"cursor": new_cursor})
    return new_cursor


def main():
    print("V288 collectors started. DRY_RUN=%s" % DRY_RUN)
    while True:
        try:
            accounts = list_accounts()
            if not accounts:
                # fallback single demo account per provider
                accounts = [{"provider": p, "account_id": "demo"} for p in PROVIDER_PRIORITY]

            for p in PROVIDER_PRIORITY:
                for a in [x for x in accounts if x.get("provider")==p]:
                    account_id = a.get("account_id") or "demo"
                    cursor = get_checkpoint(p, account_id)
                    def run_one():
                        return collect_provider(p, account_id, cursor)
                    with_backoff(run_one, max_tries=4, base_sleep=1.0)
            time.sleep(INTERVAL_SECONDS)
        except Exception as e:
            print("collector loop error:", e)
            time.sleep(5)

if __name__ == "__main__":
    main()
