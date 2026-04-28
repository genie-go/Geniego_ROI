import os, time, json, datetime, random, hashlib
import requests

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
INTERVAL_SECONDS = int(os.getenv("COLLECT_INTERVAL_SECONDS", "300"))
DRY_RUN = os.getenv("DRY_RUN", "true").lower() in ("1","true","yes","y")

# Provider priority for KR/Global lock-in loops
PROVIDER_PRIORITY = ["google_ads", "meta_ads", "naver_sa", "kakao_moment"]

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

def main():
    collectors = build_collectors()
    while True:
        try:
            accounts = api("GET", "/v1/connectors/accounts")
            # group by provider and run in priority order
            by_provider = {}
            for a in accounts:
                by_provider.setdefault(a.get("provider"), []).append(a)

            for provider in PROVIDER_PRIORITY:
                if provider not in collectors: 
                    continue
                for account in by_provider.get(provider, []):
                    if DRY_RUN:
                        res = collectors[provider].collect(account)
                        print(f"[collect] provider={provider} account={account['account_id']} -> {res}")
                    else:
                        # Safe default: prevent accidental live calls unless explicitly implemented.
                        raise RuntimeError("DRY_RUN=false but live collectors not implemented in this scaffold. Implement OAuth + API calls per provider.")
        except Exception as e:
            print("[collectors] error:", e)

        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
