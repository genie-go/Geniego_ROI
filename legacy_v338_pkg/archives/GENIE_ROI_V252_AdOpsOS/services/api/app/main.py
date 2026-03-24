from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from typing import Dict, Any
from .db import Base, engine, get_db
from .models import (
    Tenant, Campaign, ExperimentResult, ApprovalRequest, PolicyConfig, SecretRef, OAuthState,
    GoogleBudgetMapping, TokenAuditLog
)
from .schemas import (
    TenantCreate, TenantOut, CampaignCreate, CampaignOut, ExperimentCreate,
    PolicyUpdate, AutopilotIn, GoogleMapUpsert, GoogleBulkMapIn, DlqRequeueIn, InternalTokenMetric, SyncRequest, SyncResult, StrategyEvalIn, StrategyEvalOut, RecommendationsIn, RecommendationsOut
)
from .tenancy import require_tenant
from .config import settings
from .optimizer import optimize
from .policy import decide
from .outbox import emit_outbox, publish_outbox
from .observability import metrics_middleware, AUTO, TOKEN, metric
from .campaign_sync import fetch_and_sync
from .strategic import evaluate_tenant
from .ai import generate_recommendations
from .connectors.registry import list_connectors
from .providers.oauth import authorize_url, exchange_code
from .secrets import encrypt_local, vault_put
from .dlq import requeue_from_dlq
from .google_discovery import discover_budget_resource, extract_access_token
import json, secrets

Base.metadata.create_all(bind=engine)
app = FastAPI(title="GENIE_ROI V240 API", version="240")
app.middleware("http")(metrics_middleware)

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health():
    return {"ok": True, "version": "240", "execution_mode": settings.execution_mode, "auto_execute": settings.auto_execute, "kill_switch": settings.kill_switch}

@app.post("/v1/tenants", response_model=TenantOut)
def create_tenant(body: TenantCreate, db: Session = Depends(get_db)):
    ex = db.get(Tenant, body.id)
    if ex:
        return TenantOut(id=ex.id, name=ex.name)
    t = Tenant(id=body.id, name=body.name)
    db.add(t); db.commit()
    return TenantOut(id=t.id, name=t.name)

@app.post("/v1/campaigns", response_model=CampaignOut)
def create_campaign(body: CampaignCreate, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    c = Campaign(tenant_id=tenant_id, active=True, **body.model_dump())
    db.add(c); db.commit()
    return CampaignOut(id=c.id, active=c.active, **body.model_dump())

@app.get("/v1/campaigns", response_model=list[CampaignOut])
def list_campaigns(tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    rows = db.query(Campaign).filter(Campaign.tenant_id==tenant_id).order_by(Campaign.id.desc()).all()
    return [CampaignOut(id=r.id, name=r.name, channel=r.channel, external_id=r.external_id, spend=r.spend, revenue=r.revenue,
                        daily_budget=r.daily_budget, min_budget=r.min_budget, max_budget=r.max_budget, active=r.active) for r in rows]

@app.post("/v1/experiments")
def upsert_experiment(body: ExperimentCreate, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    e = ExperimentResult(tenant_id=tenant_id, campaign_id=body.campaign_id, lift=body.lift, confidence=body.confidence)
    db.add(e); db.commit()
    return {"ok": True, "id": e.id}

@app.get("/v1/policy", response_model=PolicyUpdate)
def get_policy(tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    row = db.query(PolicyConfig).filter(PolicyConfig.tenant_id==tenant_id).first()
    if row is None:
        row = PolicyConfig(tenant_id=tenant_id,
            auto_approve_max_abs=settings.policy_auto_approve_max_abs,
            auto_approve_max_pct=settings.policy_auto_approve_max_pct,
            require_finance_abs=settings.policy_require_finance_abs,
            require_finance_pct=settings.policy_require_finance_pct,
        )
        db.add(row); db.commit()
    return PolicyUpdate(
        auto_approve_max_abs=row.auto_approve_max_abs,
        auto_approve_max_pct=row.auto_approve_max_pct,
        require_finance_abs=row.require_finance_abs,
        require_finance_pct=row.require_finance_pct,
    )

@app.post("/v1/policy", response_model=PolicyUpdate)
def set_policy(body: PolicyUpdate, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    row = db.query(PolicyConfig).filter(PolicyConfig.tenant_id==tenant_id).first()
    if row is None:
        row = PolicyConfig(tenant_id=tenant_id)
    row.auto_approve_max_abs = body.auto_approve_max_abs
    row.auto_approve_max_pct = body.auto_approve_max_pct
    row.require_finance_abs = body.require_finance_abs
    row.require_finance_pct = body.require_finance_pct
    db.add(row); db.commit()
    return body

@app.post("/v1/google/mapping")
def upsert_google_map(body: GoogleMapUpsert, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    row = db.query(GoogleBudgetMapping).filter(GoogleBudgetMapping.tenant_id==tenant_id, GoogleBudgetMapping.campaign_id==body.campaign_id).first()
    if row is None:
        row = GoogleBudgetMapping(tenant_id=tenant_id, campaign_id=body.campaign_id, budget_resource_name=body.budget_resource_name)
    else:
        row.budget_resource_name = body.budget_resource_name
    db.add(row); db.commit()
    return {"ok": True, "campaign_id": body.campaign_id, "budget_resource_name": body.budget_resource_name}

@app.get("/v1/google/mapping")
def list_google_map(tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    rows = db.query(GoogleBudgetMapping).filter(GoogleBudgetMapping.tenant_id==tenant_id).order_by(GoogleBudgetMapping.campaign_id.asc()).all()
    return [{"campaign_id": r.campaign_id, "budget_resource_name": r.budget_resource_name} for r in rows]

@app.get("/v1/google/discover_budget")
async def discover_google_budget(campaign_id: int, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    sec = db.query(SecretRef).filter(SecretRef.tenant_id==tenant_id, SecretRef.provider=="google").first()
    if not sec:
        raise HTTPException(status_code=400, detail="No google secret. Complete OAuth first.")
    token = await extract_access_token(sec.secret_json)
    if not token:
        raise HTTPException(status_code=400, detail="Cannot load access_token. Check Vault/MASTER_FERNET_KEY settings.")
    return await discover_budget_resource(token, campaign_id)

@app.post("/v1/google/discover_and_map_bulk")
async def discover_and_map_bulk(body: GoogleBulkMapIn, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    sec = db.query(SecretRef).filter(SecretRef.tenant_id==tenant_id, SecretRef.provider=="google").first()
    if not sec:
        raise HTTPException(status_code=400, detail="No google secret. Complete OAuth first.")
    token = await extract_access_token(sec.secret_json)
    if not token:
        raise HTTPException(status_code=400, detail="Cannot load access_token. Check Vault/MASTER_FERNET_KEY settings.")
    # Determine campaign ids
    q = db.query(Campaign).filter(Campaign.tenant_id==tenant_id, Campaign.active==True, Campaign.channel=="google")
    if body.campaign_ids:
        q = q.filter(Campaign.id.in_(body.campaign_ids))
    camps = q.order_by(Campaign.id.asc()).all()
    if not camps:
        return {"ok": True, "mapped": 0, "errors": [], "details": []}

    mapped = 0
    details = []
    errors = []
    for c in camps:
        try:
            out = await discover_budget_resource(token, int(c.id))
            if not out.get("ok"):
                errors.append({"campaign_id": c.id, "error": out.get("error")})
                continue
            budget = out.get("campaign_budget")
            if not budget:
                errors.append({"campaign_id": c.id, "error": "No campaign_budget in response"})
                continue
            details.append({"campaign_id": c.id, "budget_resource_name": budget})
            if body.dry_run:
                continue
            row = db.query(GoogleBudgetMapping).filter(GoogleBudgetMapping.tenant_id==tenant_id, GoogleBudgetMapping.campaign_id==c.id).first()
            if row is None:
                row = GoogleBudgetMapping(tenant_id=tenant_id, campaign_id=c.id, budget_resource_name=budget)
            else:
                row.budget_resource_name = budget
            db.add(row); db.commit()
            mapped += 1
        except Exception as e:
            errors.append({"campaign_id": c.id, "error": str(e)[:300]})
    return {"ok": True, "mapped": mapped, "dry_run": body.dry_run, "details": details[:50], "errors": errors[:50]}

@app.get("/v1/oauth/authorize/{provider}")
def oauth_authorize(provider: str, tenant_id: str, db: Session = Depends(get_db)):
    state = secrets.token_urlsafe(24)
    st = OAuthState(tenant_id=tenant_id, provider=provider, state=state)
    db.add(st); db.commit()
    return {"url": authorize_url(provider, state), "state": state}

@app.get("/v1/oauth/callback/{provider}")
async def oauth_callback(provider: str, tenant_id: str, code: str, state: str, db: Session = Depends(get_db)):
    st = db.query(OAuthState).filter(OAuthState.tenant_id==tenant_id, OAuthState.provider==provider, OAuthState.state==state).first()
    if not st:
        raise HTTPException(status_code=400, detail="Invalid state")
    tok = await exchange_code(provider, code)
    access_token = tok.get("access_token") or tok.get("data", {}).get("access_token") or ""
    refresh_token = tok.get("refresh_token") or tok.get("data", {}).get("refresh_token") or ""
    expires_in = tok.get("expires_in") or tok.get("data", {}).get("expires_in") or 0
    secret_obj = {"access_token": access_token, "refresh_token": refresh_token, "raw": tok, "expires_in": expires_in}

    vault_path = f"{settings.vault_path.rstrip('/')}/{tenant_id}/{provider}"
    stored_in_vault = await vault_put(vault_path, secret_obj)
    if stored_in_vault:
        blob = encrypt_local({"vault_ref": vault_path})
    else:
        blob = encrypt_local(secret_obj)

    row = db.query(SecretRef).filter(SecretRef.tenant_id==tenant_id, SecretRef.provider==provider).first()
    if row is None:
        row = SecretRef(tenant_id=tenant_id, provider=provider, secret_json=blob)
    else:
        row.secret_json = blob
    db.add(row); db.commit()
    return {"ok": True, "provider": provider, "stored_in_vault": stored_in_vault}

@app.post("/v1/outbox/publish")
def publish(tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    return publish_outbox(db, tenant_id)

@app.post("/v1/autopilot/run")
def autopilot_run(body, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    body = AutopilotIn.model_validate(body or {})
    AUTO.labels(tenant=tenant_id).inc()
    camps = db.query(Campaign).filter(Campaign.tenant_id==tenant_id, Campaign.active==True).all()
    if not camps:
        raise HTTPException(status_code=400, detail="No active campaigns")

    lifts = {}
    for c in camps:
        row = db.query(ExperimentResult).filter(ExperimentResult.tenant_id==tenant_id, ExperimentResult.campaign_id==c.id).order_by(ExperimentResult.id.desc()).first()
        if row:
            lifts[c.id] = float(row.lift) * float(row.confidence)

    if body.total_budget is not None:
        settings.total_budget = float(body.total_budget)

    proposals = optimize([{"id": c.id, "channel": c.channel, "spend": c.spend, "revenue": c.revenue,
                           "daily_budget": c.daily_budget, "min_budget": c.min_budget, "max_budget": c.max_budget} for c in camps], lifts)

    actions = []
    for p in proposals[:5]:
        c = db.get(Campaign, int(p["campaign_id"]))
        if not c: continue
        decision = decide(db, tenant_id, float(c.daily_budget or p["current_budget"]), float(p["new_budget"]))
        status = "PENDING"
        if decision.auto_approve and settings.auto_execute:
            status = "APPROVED"
        a = ApprovalRequest(tenant_id=tenant_id, campaign_id=c.id, requested_budget=float(p["new_budget"]),
                            status=status, policy_reason=decision.reason, notes=json.dumps(p, ensure_ascii=False))
        db.add(a); db.commit()
        if a.status == "APPROVED" and settings.auto_execute:
            idem = f"exec:{tenant_id}:{a.id}"
            emit_outbox(db, tenant_id, "budget.execute", idem, {"approval_id": a.id, "campaign_id": c.id, "new_budget": float(p["new_budget"])})
            actions.append({"approval_id": a.id, "auto": True, "idempotency_key": idem, "policy": decision.reason})
        else:
            actions.append({"approval_id": a.id, "auto": False, "policy": decision.reason})
    return {"ok": True, "proposals": proposals[:5], "actions": actions}

@app.post("/v1/dlq/requeue")
def dlq_requeue(body: DlqRequeueIn, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    return requeue_from_dlq(db, tenant_id, limit=body.limit, dry_run=body.dry_run, kind=body.kind, error_contains=body.error_contains, idempotency_prefix=body.idempotency_prefix)

@app.get("/v1/audit/token")
def token_audit(tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(TokenAuditLog).filter(TokenAuditLog.tenant_id==tenant_id).order_by(TokenAuditLog.id.desc()).limit(limit).all()
    return [{"provider": r.provider, "result": r.result, "message": (r.message or "")[:500], "created_at": str(r.created_at)} for r in rows]

# -----------------------------
# V239: AdOps OS endpoints
# -----------------------------

@app.get("/v239/connectors")
def v239_connectors():
    return {"connectors": list_connectors()}

@app.post("/v239/campaigns/sync", response_model=SyncResult)
async def v239_campaign_sync(body: SyncRequest, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    # In this packaged version, connectors default to SAFE stub mode unless you provide real credentials via SecretRef/Vault.
    auth: Dict[str, Any] = {}
    if body.mock_campaigns:
        auth["mock_campaigns"] = [c.model_dump() for c in body.mock_campaigns]
    fetched, created, updated, deactivated = await fetch_and_sync(db, tenant_id=tenant_id, provider=body.provider, auth=auth, account_id=body.account_id)
    return SyncResult(fetched=fetched, created=created, updated=updated, deactivated=deactivated)

@app.post("/v239/strategy/evaluate", response_model=StrategyEvalOut)
def v239_strategy_eval(body: StrategyEvalIn, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    out = evaluate_tenant(db, tenant_id=tenant_id, channel=body.channel, naming_regex=body.naming_regex, target_roas=body.target_roas)
    return out

@app.post("/v239/ai/recommendations", response_model=RecommendationsOut)
def v239_ai_recs(body: RecommendationsIn, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    out = generate_recommendations(db, tenant_id=tenant_id, channel=body.channel, total_budget=body.total_budget, target_roas=body.target_roas)
    return out

@app.post("/v1/internal/metrics/token_rotation")
def internal_token_rotation(body: InternalTokenMetric, SyncRequest, SyncResult, StrategyEvalIn, StrategyEvalOut, RecommendationsIn, RecommendationsOut, x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"), db: Session = Depends(get_db)):
    if x_internal_token != settings.internal_metrics_token:
        raise HTTPException(status_code=403, detail="Forbidden")
    TOKEN.labels(tenant=body.tenant_id, provider=body.provider, result=body.result).inc()
    log = TokenAuditLog(tenant_id=body.tenant_id, provider=body.provider, result=body.result, message=body.message)
    db.add(log); db.commit()
    return {"ok": True}


# ---- V240 route aliases (backward compatible with V239) ----
@app.get("/v240/connectors")
def v240_list_connectors():
    return list_connectors()

@app.post("/v240/campaigns/sync", response_model=SyncResult)
def v240_sync(body: SyncRequest, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    return fetch_and_sync(db, tenant_id=tenant_id, provider=body.provider, auth=body.auth, account_id=body.account_id)

@app.post("/v240/strategy/evaluate", response_model=StrategyEvalOut)
def v240_strategy(body: StrategyEvalIn, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    return evaluate_tenant(db, tenant_id=tenant_id, channel=body.channel, naming_regex=body.naming_regex, target_roas=body.target_roas)

@app.post("/v240/ai/recommendations", response_model=RecommendationsOut)
def v240_ai(body: RecommendationsIn, tenant_id: str = Depends(require_tenant), db: Session = Depends(get_db)):
    return generate_recommendations(db, tenant_id=tenant_id, channel=body.channel, total_budget=body.total_budget, target_roas=body.target_roas)
