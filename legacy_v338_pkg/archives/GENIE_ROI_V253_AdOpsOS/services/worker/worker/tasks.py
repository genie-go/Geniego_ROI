import json, asyncio
from celery import shared_task
from sqlalchemy.orm import Session
import httpx
from .db import SessionLocal, Base, engine
from .models import JobQueue, Campaign, ApprovalRequest, SecretRef, GoogleBudgetMapping
from .config import settings
from .crypto import decrypt, encrypt
from .vault_client import vault_get, vault_put
from .provider_calls import meta_set_budget, tiktok_set_budget, google_ads_mutate_budget
from .token_refresh import refresh_google, refresh_tiktok, refresh_meta

Base.metadata.create_all(bind=engine)

async def _load_secret(db: Session, tenant_id: str, provider: str) -> dict:
    row = db.query(SecretRef).filter(SecretRef.tenant_id==tenant_id, SecretRef.provider==provider).first()
    if not row:
        return {}
    obj = decrypt(row.secret_json)
    if "vault_ref" in obj:
        v = await vault_get(obj["vault_ref"])
        if not v:
            return {}
        return v.get("data", {}).get("data", {}) or {}
    return obj

def _google_budget_resource(db: Session, tenant_id: str, campaign_id: int, fallback: str) -> str:
    row = db.query(GoogleBudgetMapping).filter(GoogleBudgetMapping.tenant_id==tenant_id, GoogleBudgetMapping.campaign_id==campaign_id).first()
    return row.budget_resource_name if row else fallback

async def _execute_budget(db: Session, tenant_id: str, payload: dict):
    approval_id = int(payload["approval_id"])
    campaign_id = int(payload["campaign_id"])
    new_budget = float(payload["new_budget"])

    appr = db.get(ApprovalRequest, approval_id)
    camp = db.get(Campaign, campaign_id)
    if not appr or appr.tenant_id != tenant_id: raise RuntimeError("Approval not found")
    if not camp or camp.tenant_id != tenant_id: raise RuntimeError("Campaign not found")
    if appr.status != "APPROVED": raise RuntimeError("Approval not APPROVED")
    if settings.kill_switch: raise RuntimeError("KILL_SWITCH enabled")

    mode = settings.execution_mode.upper()
    if mode == "DRY_RUN":
        camp.daily_budget = new_budget
        appr.status = "EXECUTED"
        db.add(camp); db.add(appr); db.commit()
        return {"mode": "DRY_RUN", "status": "SUCCEEDED"}

    provider = (camp.channel or "").lower()
    sec = await _load_secret(db, tenant_id, provider)
    access_token = sec.get("access_token", "")
    if not access_token:
        raise RuntimeError(f"Missing access_token for provider={provider}. Complete OAuth or store secrets.")

    if provider == "meta":
        ext = camp.external_id or str(campaign_id)
        res = await meta_set_budget(access_token, ext, new_budget)
    elif provider == "tiktok":
        ext = camp.external_id or str(campaign_id)
        res = await tiktok_set_budget(access_token, ext, new_budget)
    elif provider == "google":
        fallback = camp.external_id or ""
        budget_resource = _google_budget_resource(db, tenant_id, campaign_id, fallback)
        if not budget_resource:
            raise RuntimeError("Missing Google budget_resource_name. Set Google Mapping or campaign.external_id.")
        res = await google_ads_mutate_budget(access_token, budget_resource, int(new_budget * 1_000_000))
    else:
        raise RuntimeError("Unknown provider")

    camp.daily_budget = new_budget
    appr.status = "EXECUTED"
    db.add(camp); db.add(appr); db.commit()
    return {"mode": "LIVE", "status": "SUCCEEDED", "provider_result": res}

async def _report_metric(tenant_id: str, provider: str, result: str, message: str):
    url = f"{settings.api_base.rstrip('/')}/v1/internal/metrics/token_rotation"
    headers = {"X-Internal-Token": settings.internal_metrics_token, "Content-Type": "application/json"}
    body = {"tenant_id": tenant_id, "provider": provider, "result": result, "message": message[:800]}
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            await client.post(url, headers=headers, json=body)
        except Exception:
            pass

@shared_task(name="tasks.execute_event")
def execute_event(tenant_id: str, idempotency_key: str):
    with SessionLocal() as db:
        job = db.query(JobQueue).filter(JobQueue.tenant_id==tenant_id, JobQueue.idempotency_key==idempotency_key).first()
        if not job:
            return {"ok": False, "reason": "job_not_found"}
        if job.status in ("SUCCEEDED","RUNNING"):
            return {"ok": True, "status": job.status}

        job.status = "RUNNING"
        db.add(job); db.commit()
        try:
            payload = json.loads(job.payload_json or "{}")
            if job.kind == "budget.execute":
                result = asyncio.run(_execute_budget(db, tenant_id, payload))
            else:
                result = {"status": "IGNORED", "kind": job.kind}
            job.status = "SUCCEEDED"
            db.add(job); db.commit()
            return {"ok": True, "job_id": job.id, "result": result}
        except Exception as e:
            job.attempts += 1
            job.last_error = str(e)[:2000]
            job.status = "FAILED" if job.attempts >= settings.retry_max else "QUEUED"
            db.add(job); db.commit()
            return {"ok": False, "job_id": job.id, "status": job.status, "error": job.last_error}

@shared_task(name="tasks.rotate_tokens")
def rotate_tokens():
    results = []
    with SessionLocal() as db:
        refs = db.query(SecretRef).all()
        for r in refs:
            tenant_id = r.tenant_id
            provider = r.provider
            try:
                obj = decrypt(r.secret_json)
                use_vault = "vault_ref" in obj
                sec = asyncio.run(_load_secret(db, tenant_id, provider))
                refresh_token = sec.get("refresh_token") or ""
                if not refresh_token:
                    results.append({"tenant": tenant_id, "provider": provider, "rotated": False, "reason": "no_refresh_token"})
                    asyncio.run(_report_metric(tenant_id, provider, "skip", "no_refresh_token"))
                    continue

                if provider == "google":
                    out = asyncio.run(refresh_google(refresh_token))
                    raw = out.get("raw", {})
                    new_access = raw.get("access_token") if out.get("ok") else None
                elif provider == "tiktok":
                    out = asyncio.run(refresh_tiktok(refresh_token))
                    raw = out.get("raw", {})
                    new_access = (raw.get("data", {}) or {}).get("access_token") or raw.get("access_token") if out.get("ok") else None
                elif provider == "meta":
                    out = asyncio.run(refresh_meta(refresh_token))
                    raw = out.get("raw", {})
                    new_access = raw.get("access_token") if out.get("ok") else None
                else:
                    results.append({"tenant": tenant_id, "provider": provider, "rotated": False, "reason": "unknown_provider"})
                    asyncio.run(_report_metric(tenant_id, provider, "fail", "unknown_provider"))
                    continue

                if not out.get("ok") or not new_access:
                    msg = out.get("error","refresh_failed")
                    results.append({"tenant": tenant_id, "provider": provider, "rotated": False, "reason": msg})
                    asyncio.run(_report_metric(tenant_id, provider, "fail", msg))
                    continue

                sec["access_token"] = new_access
                sec["raw_refresh"] = raw

                if use_vault:
                    ok = asyncio.run(vault_put(obj["vault_ref"], sec))
                    results.append({"tenant": tenant_id, "provider": provider, "rotated": ok, "store": "vault"})
                else:
                    r.secret_json = encrypt(sec)
                    db.add(r); db.commit()
                    results.append({"tenant": tenant_id, "provider": provider, "rotated": True, "store": "db"})

                asyncio.run(_report_metric(tenant_id, provider, "ok", "rotated"))
            except Exception as e:
                msg = str(e)[:200]
                results.append({"tenant": r.tenant_id, "provider": r.provider, "rotated": False, "reason": msg})
                asyncio.run(_report_metric(r.tenant_id, r.provider, "fail", msg))
    return {"ok": True, "results": results}
