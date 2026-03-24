from __future__ import annotations
import os, json, time, hmac, hashlib, base64
from confluent_kafka import Consumer
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./genie_v244.db")
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC = os.getenv("KAFKA_TOPIC_OUTBOX", "genie.outbox")
GROUP = os.getenv("KAFKA_GROUP_ID", "genie-workers")

AUTO_EXECUTE = os.getenv("AUTO_EXECUTE","false").lower() in ("1","true","yes","y","on")
DRY_RUN = os.getenv("DRY_RUN","true").lower() in ("1","true","yes","y","on")
AUTH_MODE = os.getenv("AUTH_MODE","stub").lower()  # stub|real

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)

def _uuid_fallback() -> str:
    return f"audit-{int(time.time()*1000)}"

def log_audit(tenant_id: str, job_id: str, status: str, message: str, meta: dict):
    # Postgres has gen_random_uuid only if pgcrypto installed; keep portable.
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO audit_logs (id, tenant_id, job_id, status, message, meta_json, created_at)
            VALUES (:id, :tenant, :job, :st, :msg, :meta, :ts)
        """),
        {
            "id": _uuid_fallback(),
            "tenant": tenant_id,
            "job": job_id,
            "st": status,
            "msg": message,
            "meta": json.dumps(meta),
            "ts": time.time(),
        })

# -------- Channel executors (minimal, production-safe) --------
def exec_google(payload: dict) -> tuple[bool, str, dict]:
    # Uses google-ads SDK path via services/google_budget_executor.py in repo root legacy.
    # For SaaS, we keep this as an integration point; real execution requires AUTH_MODE=real and creds.
    try:
        from services.google_budget_executor import GoogleBudgetExecutor, BudgetUpdateRequest  # type: ignore
        customer_id = (payload.get("customer_id") or os.getenv("GOOGLE_ADS_CUSTOMER_ID","")).replace("-","")
        campaign_id = str(payload.get("campaign_id"))
        new_budget = float(payload.get("new_budget"))
        ex = GoogleBudgetExecutor()
        ok, msg, meta = ex.update_campaign_budget(BudgetUpdateRequest(customer_id=customer_id, campaign_id=campaign_id, new_daily_budget=new_budget))
        return ok, msg, meta
    except Exception as ex:
        return False, f"Google exec error: {ex}", {"payload": payload}

def exec_meta(payload: dict) -> tuple[bool, str, dict]:
    # Meta budgets are often at adset level; implement a "smart path":
    # - if target_level == "adset": attempt adset budget update
    # - else: return actionable guidance
    import httpx
    token = os.getenv("META_ACCESS_TOKEN","")
    ver = os.getenv("META_API_VERSION","v20.0")
    target_level = payload.get("target_level","campaign")  # campaign|adset
    obj_id = payload.get("object_id") or payload.get("campaign_id")
    new_budget = float(payload.get("new_budget"))
    if AUTH_MODE != "real" or not token or not obj_id:
        return True, "Meta simulated (stub or missing token)", {"payload": payload, "dry_run": True}
    if DRY_RUN:
        return True, "Meta DRY_RUN simulated", {"payload": payload, "dry_run": True}

    # NOTE: Meta expects budget in minor units (e.g., cents). Many accounts use daily_budget in cents.
    # We'll treat input as account currency units and convert to cents.
    cents = int(round(new_budget * 100))
    url = f"https://graph.facebook.com/{ver}/{obj_id}"
    params = {"access_token": token}
    data = {"daily_budget": str(cents)} if target_level == "adset" else {"daily_budget": str(cents)}
    # For campaign budget, fields may differ and require CBO; we try but log failures.
    try:
        with httpx.Client(timeout=20) as c:
            r = c.post(url, params=params, data=data)
            if r.status_code >= 400:
                return False, f"Meta mutation failed: {r.status_code} {r.text}", {"url": url, "level": target_level}
            return True, "Meta budget updated", {"response": r.json(), "level": target_level}
    except Exception as ex:
        return False, f"Meta exec error: {ex}", {"url": url, "level": target_level}

def exec_tiktok(payload: dict) -> tuple[bool, str, dict]:
    import httpx
    token = os.getenv("TIKTOK_ACCESS_TOKEN","")
    adv = os.getenv("TIKTOK_ADVERTISER_ID","")
    campaign_id = payload.get("campaign_id")
    new_budget = float(payload.get("new_budget"))
    if AUTH_MODE != "real" or not token or not adv or not campaign_id:
        return True, "TikTok simulated (stub or missing token)", {"payload": payload, "dry_run": True}
    if DRY_RUN:
        return True, "TikTok DRY_RUN simulated", {"payload": payload, "dry_run": True}

    # TikTok API expects budget in certain units; many endpoints use integer in currency units * 100? varies.
    # We provide a safe template; production should validate per account currency spec.
    url = "https://business-api.tiktok.com/open_api/v1.3/campaign/update/"
    headers = {"Access-Token": token, "Content-Type": "application/json"}
    body = {"advertiser_id": adv, "campaign_id": str(campaign_id), "budget": new_budget}
    try:
        with httpx.Client(timeout=20) as c:
            r = c.post(url, headers=headers, json=body)
            if r.status_code >= 400:
                return False, f"TikTok mutation failed: {r.status_code} {r.text}", {"url": url}
            return True, "TikTok budget update requested", {"response": r.json()}
    except Exception as ex:
        return False, f"TikTok exec error: {ex}", {"url": url}

def _naver_signature(timestamp: str, method: str, uri: str, secret_key: str) -> str:
    message = f"{timestamp}.{method}.{uri}".encode("utf-8")
    signing_key = secret_key.encode("utf-8")
    digest = hmac.new(signing_key, message, hashlib.sha256).digest()
    return base64.b64encode(digest).decode("utf-8")

def exec_naver(payload: dict) -> tuple[bool, str, dict]:
    # Naver SearchAd signed request template (requires customer access)
    import httpx
    api_key = os.getenv("NAVER_API_KEY","")
    secret = os.getenv("NAVER_SECRET_KEY","")
    customer = os.getenv("NAVER_CUSTOMER_ID","")
    campaign_id = payload.get("campaign_id")
    new_budget = payload.get("new_budget")
    if AUTH_MODE != "real" or not api_key or not secret or not customer or not campaign_id:
        return True, "Naver simulated (stub or missing keys)", {"payload": payload, "dry_run": True}
    if DRY_RUN:
        return True, "Naver DRY_RUN simulated", {"payload": payload, "dry_run": True}

    # Endpoint/URI is illustrative; adjust to actual Naver SearchAd endpoint for campaign update.
    base_url = "https://api.searchad.naver.com"
    uri = f"/ncc/campaigns/{campaign_id}"
    method = "PUT"
    ts = str(int(time.time() * 1000))
    sig = _naver_signature(ts, method, uri, secret)
    headers = {
        "X-Timestamp": ts,
        "X-API-KEY": api_key,
        "X-Customer": customer,
        "X-Signature": sig,
        "Content-Type": "application/json",
    }
    body = {"dailyBudget": new_budget}
    try:
        with httpx.Client(timeout=20) as c:
            r = c.put(base_url + uri, headers=headers, json=body)
            if r.status_code >= 400:
                return False, f"Naver mutation failed: {r.status_code} {r.text}", {"uri": uri}
            return True, "Naver budget updated", {"response": r.json()}
    except Exception as ex:
        return False, f"Naver exec error: {ex}", {"uri": uri}

def exec_kakao(payload: dict) -> tuple[bool, str, dict]:
    # Kakao Moment APIs vary by account policy; provide token-based template.
    import httpx
    token = os.getenv("KAKAO_ACCESS_TOKEN","")
    campaign_id = payload.get("campaign_id")
    new_budget = payload.get("new_budget")
    if AUTH_MODE != "real" or not token or not campaign_id:
        return True, "Kakao simulated (stub or missing token)", {"payload": payload, "dry_run": True}
    if DRY_RUN:
        return True, "Kakao DRY_RUN simulated", {"payload": payload, "dry_run": True}

    # Illustrative endpoint; adjust per Kakao Moment docs for campaign budget update.
    url = f"https://apis.moment.kakao.com/openapi/v1/campaigns/{campaign_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body = {"dailyBudget": new_budget}
    try:
        with httpx.Client(timeout=20) as c:
            r = c.patch(url, headers=headers, json=body)
            if r.status_code >= 400:
                return False, f"Kakao mutation failed: {r.status_code} {r.text}", {"url": url}
            return True, "Kakao budget update requested", {"response": r.json()}
    except Exception as ex:
        return False, f"Kakao exec error: {ex}", {"url": url}

def execute(job_type: str, payload: dict) -> tuple[bool, str, dict]:
    # Unified job type for multi-channel
    if job_type not in ("UPDATE_DAILY_BUDGET", "UPDATE_CAMPAIGN_BUDGET"):
        return False, "Unsupported job_type", {"job_type": job_type}

    channel = (payload.get("channel") or "google").lower()
    if channel == "google":
        return exec_google(payload)
    if channel == "meta":
        return exec_meta(payload)
    if channel == "tiktok":
        return exec_tiktok(payload)
    if channel == "naver":
        return exec_naver(payload)
    if channel == "kakao":
        return exec_kakao(payload)
    return False, "Unknown channel", {"channel": channel}

def main():
    c = Consumer({
        "bootstrap.servers": KAFKA_BOOTSTRAP,
        "group.id": GROUP,
        "auto.offset.reset": "earliest"
    })
    c.subscribe([TOPIC])
    print(f"Worker subscribed to {TOPIC} on {KAFKA_BOOTSTRAP}. AUTO_EXECUTE={AUTO_EXECUTE} DRY_RUN={DRY_RUN} AUTH_MODE={AUTH_MODE}")
    try:
        while True:
            msg = c.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                print("Kafka error:", msg.error())
                continue
            event = json.loads(msg.value().decode("utf-8"))
            tenant_id = event.get("tenant_id","demo")
            job_id = event.get("job_id","")
            job_type = event.get("job_type","")
            payload = event.get("payload", {})

            if not AUTO_EXECUTE:
                log_audit(tenant_id, job_id, "BLOCKED", "AUTO_EXECUTE disabled", {"job_type": job_type, "event": event})
                continue

            ok, message, meta = execute(job_type, payload)
            status = "SUCCEEDED" if ok else "FAILED"
            log_audit(tenant_id, job_id, status, message, meta)
    finally:
        c.close()

if __name__ == "__main__":
    main()
