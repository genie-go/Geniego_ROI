import os, time, json, datetime, random
import requests

API_BASE = os.getenv("API_BASE", "http://gateway:8080")
TENANT_ID = os.getenv("TENANT_ID", "demo-tenant")
API_KEY = os.getenv("API_KEY", "")
INTERVAL_SECONDS = int(os.getenv("COLLECT_INTERVAL_SECONDS", "300"))

def post(path, payload):
    headers = {"Content-Type":"application/json", "X-Tenant-ID": TENANT_ID, "X-API-Key": API_KEY}
    r = requests.post(f"{API_BASE}{path}", headers=headers, data=json.dumps(payload), timeout=10)
    if r.status_code >= 300:
        raise RuntimeError(f"{path} {r.status_code} {r.text}")
    return r.json() if r.text else None

def generate_mock_ads_metrics(day: str):
    # Replace with real provider polling (Google Ads, Meta, Naver, Kakao) in production.
    providers = ["google_ads", "meta_ads", "naver_searchads"]
    rows = []
    for p in providers:
        spend = round(random.uniform(50, 500), 2)
        conv = int(spend / random.uniform(10, 60))
        rows.append({"provider": p, "campaign_id": f"{p}-CAMP-1", "spend": spend, "impressions": int(spend*200), "clicks": int(spend*8), "conversions": conv})
    return {"day": day, "rows": rows}

def generate_mock_conversions(day: str):
    events=[]
    for i in range(random.randint(3,12)):
        events.append({"occurred_at": f"{day}T{random.randint(0,23):02d}:{random.randint(0,59):02d}:00Z", "source":"checkout", "revenue": round(random.uniform(20, 200), 2)})
    return {"events": events}

def main():
    if not API_KEY:
        print("Collectors: API_KEY missing. Set API_KEY env var to a minted key with analyst/admin role.")
    while True:
        day = datetime.date.today().isoformat()
        try:
            post("/v1/roi/metrics/ads", generate_mock_ads_metrics(day))
            post("/v1/roi/conversions", generate_mock_conversions(day))
            print(f"[collectors] ingested mock metrics for {day}")
        except Exception as e:
            print(f"[collectors] error: {e}")
        time.sleep(INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
