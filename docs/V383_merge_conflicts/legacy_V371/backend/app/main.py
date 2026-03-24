from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text
from datetime import datetime, timedelta, timezone
import secrets
import json

from app.config.channel_profiles import deep_merge, validate_profiles_strict
from app.db.session import get_db, engine
from app.models import Base, Tenant, User, ApprovalRequest, ActionProposal, ConnectorStatus, DataSource, MarketingMetric, Insight, AttributionConfig, ChannelMappingConfig, Claim, Settlement, Review, DigitalShelfSnapshot, ContentComplianceIssue
from app.security.auth import hash_password, verify_password, create_access_token, decode_token
from app.attribution.engine import last_touch_attribution
from app.attribution.mta import compute_mta
from app.attribution.capi import send_meta_capi
from app.reports.pdf import generate_latest_report
from app.oauth.state import OAuthStateStore
from app.connectors.factory import get_connector
from app.connectors.token_store import ensure_status
from app.audit.logger import log_event
from app.jobs.queue import get_queue
from app.ingestion.writer import write_payload
from app.reviews.parser import normalize_reviews_from_csv, normalize_reviews_from_json
from app.analytics.search_share import compute_keyword_share
from app.policies.compliance import load_policy as load_compliance_policy, evaluate_listing
from rq import Retry
from app.api.v367 import router as v367_router
from app.core.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GENIE_ROI API", version="371.0.0")
app.include_router(v367_router)
security = HTTPBearer()
state_store = OAuthStateStore()

def require_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return decode_token(creds.credentials)
    except Exception:
        raise HTTPException(401, "Invalid token")

@app.get("/health")
def health():
    return {"ok": True, "version": "371.0.0"}

@app.post("/auth/register")
def register(body: dict, db: Session = Depends(get_db)):
    email = body.get("email"); password = body.get("password"); role = body.get("role","SELLER")
    tenant_name = body.get("tenant_name","Workspace")
    if not email or not password: raise HTTPException(400, "email/password required")
    if db.query(User).filter_by(email=email).first(): raise HTTPException(409, "email exists")
    t = Tenant(name=tenant_name); db.add(t); db.commit(); db.refresh(t)
    u = User(tenant_id=t.id, email=email, password_hash=hash_password(password), role=role); db.add(u); db.commit()
    for src in ["META","TIKTOK","AMAZON"]:
        ensure_status(db, t.id, src)

    # V371: optional demo seed (production code paths; demo is just a pre-populated tenant)
    if bool(body.get("demo", False)):
        try:
            from app.demo.seed import seed_demo_tenant
            seed_demo_tenant(db, t.id)
        except Exception as e:
            log_event(db, t.id, u.id, "DEMO_SEED_FAILED", {"error": str(e)}, source="DEMO", ok=False)
    return {"ok": True}


# -----------------------------
# V371: Demo + Ops Console UI (login required)
# -----------------------------

from app.ui.pages import router as ui_router
app.include_router(ui_router)


# -----------------------------
# V349: Data sources (Open-mall / Own-mall / Influencer / Reviews / Price / Inventory / Events)
# -----------------------------

@app.get("/sources/list")
def list_sources(db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    rows = db.query(DataSource).filter_by(tenant_id=tenant_id).order_by(DataSource.id.desc()).all()
    return {"items": [{
        "id": r.id,
        "kind": r.kind,
        "platform": r.platform,
        "name": r.name,
        "enabled": r.enabled,
        "last_sync_at": r.last_sync_at.isoformat() if r.last_sync_at else None,
        "last_error": r.last_error,
        "config": r.config,
    } for r in rows]}


@app.post("/sources/create")
def create_source(body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    kind = str(body.get("kind", "OPEN_MALL")).upper()
    platform = str(body.get("platform", "DEMO")).upper()
    name = str(body.get("name", "")).strip() or f"{platform}"
    config = body.get("config") or {}

    # V358: enforce review endpoint allowlist at creation time (immediate 400/403)
    platform_lc = (platform or "").lower()
    if platform_lc in ("naver_reviews_official","coupang_reviews_official","amazon_reviews_official","official_api_reviews"):
        try:
            from app.reviews.endpoint_allowlist import AllowlistViolation, resolve_endpoint, validate_request
            allowlist = _get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json")
            # same injection logic as sync job (minimal)
            src = (config.get("source") or "").lower().strip()
            if not src:
                if platform_lc.startswith("naver_"):
                    src = "naver"
                elif platform_lc.startswith("coupang_"):
                    src = "coupang"
                elif platform_lc.startswith("amazon_"):
                    src = "amazon"
            endpoint_name = (config.get("endpoint_name") or config.get("endpoint") or "").strip() or ("product_review_feed" if src in ("naver","coupang") else "spapi_reviews")
            method, path_from_allowlist = resolve_endpoint(allowlist, src, endpoint_name)
            src_cfg = (allowlist.get("sources") or {}).get(src) or {}
            allowed_bases = [str(u).rstrip("/") for u in (src_cfg.get("allowed_base_urls") or [])]
            # --- V359: fully fixed enforcement
            # base_url can only be selected from allowlist; if missing/invalid, default to first.
            base_url = str(config.get("base_url") or "").rstrip("/")
            if base_url not in allowed_bases:
                base_url = (allowed_bases[0] if allowed_bases else base_url)
            # path/method are ALWAYS overwritten from allowlist (no custom path)
            path = path_from_allowlist
            sanitized_qp = validate_request(allowlist, src, method, base_url, "/" + path.lstrip("/"), endpoint_name=str(config.get("endpoint_name") or ""), query_params=(config.get("query_params") or config.get("params") or {}), require_approved=True)
            config["query_params"] = sanitized_qp
            config["params"] = sanitized_qp
            config["base_url"] = base_url
            config["path"] = path
            config["method"] = method
            config["endpoint_name"] = endpoint_name
            config["_review_source"] = src
            config["_review_endpoint_name"] = endpoint_name
        except AllowlistViolation as e:
            log_event(db, tenant_id, None, "REVIEW_ENDPOINT_BLOCKED", {"stage":"source_create","reason": str(e)}, source=platform, ok=False)
            raise HTTPException(getattr(e, "status_code", 403), str(e))
    ds = DataSource(tenant_id=tenant_id, kind=kind, platform=platform, name=name, config=config, enabled=bool(body.get("enabled", True)))
    db.add(ds); db.commit(); db.refresh(ds)
    log_event(db, tenant_id, None, "SOURCE_CREATED", {"ds_id": ds.id, "kind": kind, "platform": platform}, source=platform)
    return {"ok": True, "id": ds.id}


@app.post("/sources/{ds_id}/toggle")
def toggle_source(ds_id: int, body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    ds = db.query(DataSource).filter_by(id=ds_id, tenant_id=tenant_id).first()
    if not ds:
        raise HTTPException(404, "not found")
    ds.enabled = bool(body.get("enabled", not ds.enabled))
    db.commit()
    return {"ok": True, "enabled": ds.enabled}


@app.post("/sources/{ds_id}/sync")
def sync_source(ds_id: int, body: dict | None = None, db: Session = Depends(get_db), user=Depends(require_user)):
    """Trigger a background sync.

    This package ships with real collectors (Shopify, Amazon SP-API, Instagram Graph, Coupang, Naver SmartStore) plus a DEMO collector.
    Configure a DataSource(platform=...) and run /sources/{id}/sync.
    """
    tenant_id = int(user["tenant_id"])
    since = None
    if body and body.get("since"):
        since = str(body.get("since"))
    q = get_queue()
    retry = Retry(max=settings.rq_max_retries, interval=[settings.rq_retry_base_seconds*(2**i) for i in range(settings.rq_max_retries)])
    q.enqueue("app.jobs.sync.sync_datasource_job", tenant_id, ds_id, since, retry=retry)
    return {"ok": True, "enqueued": True, "ds_id": ds_id}


# -----------------------------
# V349: Analytics (Commerce Intelligence MVP)
# -----------------------------

from app.analytics.service import overview as _overview, top_products as _top_products
from app.analytics.experiments import create_experiment as _create_exp, evaluate_experiment as _eval_exp


@app.get("/analytics/overview")
def analytics_overview(days: int = 30, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    return {"ok": True, "data": _overview(db, tenant_id, days=days)}


@app.get("/analytics/top-products")
def analytics_top_products(days: int = 30, limit: int = 10, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    return {"ok": True, "items": _top_products(db, tenant_id, days=days, limit=limit)}

@app.post("/events/capi/track")
def capi_track(body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    """Server-side event forwarding to Meta Conversions API (CAPI).

    Requires a DataSource with platform="meta_capi" or provide pixel_id/access_token in request (not recommended).
    """
    tenant_id = int(user["tenant_id"])
    pixel_id = body.get("pixel_id")
    access_token = body.get("access_token")
    # Prefer stored config
    ds = db.query(DataSource).filter_by(tenant_id=tenant_id, platform="meta_capi").order_by(DataSource.id.desc()).first()
    if ds and ds.config:
        pixel_id = pixel_id or ds.config.get("pixel_id")
        access_token = access_token or ds.config.get("access_token")
    if not pixel_id or not access_token:
        raise HTTPException(400, "missing pixel_id/access_token (store them in a meta_capi datasource config)")
    event = body.get("event") or {}
    data = send_meta_capi(str(pixel_id), str(access_token), event)
    return {"ok": True, "data": data}

@app.get("/analytics/attribution-mta")
def analytics_attribution_mta(days: int = 30, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    return {"ok": True, "data": compute_mta(db, tenant_id, days=days)}

@app.post("/experiments/create")
def experiments_create(body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    exp = _create_exp(db, tenant_id, name=body.get("name","Experiment"), channel=body.get("channel",""), holdout_ratio=float(body.get("holdout_ratio",10.0)), config=body.get("config") or {})
    return {"ok": True, "experiment": {"id": exp.id, "name": exp.name, "channel": exp.channel, "holdout_ratio": exp.holdout_ratio}}

@app.get("/experiments/{exp_id}/evaluate")
def experiments_evaluate(exp_id: int, days: int = 30, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    return _eval_exp(db, tenant_id, exp_id, days=days)
@app.post("/auth/login")
def login(body: dict, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(email=body.get("email")).first()
    if not u or not verify_password(body.get("password",""), u.password_hash):
        raise HTTPException(401, "invalid credentials")
    return {"access_token": create_access_token(u.email, u.tenant_id, u.role), "role": u.role}

@app.get("/oauth/demo-authorize", response_class=HTMLResponse)
def oauth_demo_authorize(source: str, state: str, redirect_uri: str):
    html = f"""
    <html><head><title>OAuth Demo</title></head>
    <body style="font-family:Arial;padding:24px;">
      <h2>Simulated OAuth Authorize — {source}</h2>
      <p>Production will redirect to the real platform authorize screen.</p>
      <a href="{redirect_uri}?code=demo_code_{source}&state={state}"
         style="display:inline-block;padding:12px 16px;background:#4f46e5;color:white;border-radius:10px;text-decoration:none;">
         Approve & Redirect
      </a>
    </body></html>
    """
    return HTMLResponse(content=html)

@app.get("/oauth/{source}/start")
def oauth_start(source: str, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    src = source.upper()
    ensure_status(db, tenant_id, src)
    state = state_store.create_state(tenant_id, src)
    conn = get_connector(src, tenant_id, db)
    url = conn.authorize_url(state)
    log_event(db, tenant_id, None, "OAUTH_START", {"state": state}, source=src)
    return {"authorize_url": url, "state": state}

@app.get("/oauth/{source}/callback")
def oauth_callback(source: str, code: str, state: str, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    src = source.upper()
    _ = state_store.consume_state(state, src, tenant_id)
    conn = get_connector(src, tenant_id, db)
    conn.exchange_code_for_token(code)
    log_event(db, tenant_id, None, "OAUTH_SUCCESS", {"code": "received"}, source=src)
    return {"ok": True, "source": src}

@app.get("/connectors/status")
def connector_status(db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    rows = db.query(ConnectorStatus).filter_by(tenant_id=tenant_id).all()
    return {"items":[{"source": r.source, "needs_reauth": r.needs_reauth, "last_error": r.last_error} for r in rows]}

@app.post("/actions/propose_budget_shift")
def propose_budget_shift(body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    src = body.get("source","META").upper()
    level = str(body.get("level","CAMPAIGN")).upper()
    kind_map = {"ACCOUNT":"BUDGET_SHIFT_ACCOUNT","CAMPAIGN":"BUDGET_SHIFT_CAMPAIGN","ADGROUP":"BUDGET_SHIFT_ADGROUP"}
    action_kind = kind_map.get(level, "BUDGET_SHIFT_CAMPAIGN")
    idem = body.get("idempotency_key") or secrets.token_hex(16)
    body["idempotency_key"] = idem

    existing = db.query(ActionProposal).filter_by(tenant_id=tenant_id, idempotency_key=idem).first()
    if existing:
        return {"ok": True, "action_id": existing.id, "idempotency_key": idem, "deduped": True}

    ap = ActionProposal(tenant_id=tenant_id, kind=action_kind, payload=body, idempotency_key=idem)
    db.add(ap); db.commit(); db.refresh(ap)

    due = datetime.now(timezone.utc) + timedelta(minutes=180)
    ar = ApprovalRequest(tenant_id=tenant_id, kind=action_kind, stage="MANAGER", status="PENDING", sla_due_at=due, payload={"action_id": ap.id, "source": src})
    db.add(ar); db.commit()
    return {"ok": True, "action_id": ap.id, "approval_id": ar.id, "idempotency_key": idem}

@app.get("/approvals/list")
def list_approvals(limit: int = 200, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    rows = db.query(ApprovalRequest).filter_by(tenant_id=tenant_id).order_by(ApprovalRequest.id.desc()).limit(limit).all()
    return {"items":[{"id": r.id, "kind": r.kind, "stage": r.stage, "status": r.status, "sla_due_at": r.sla_due_at.isoformat(), "payload": r.payload} for r in rows]}

def enqueue_action(db: Session, tenant_id: int, action_id: int, source: str):
    q = get_queue()
    retry = Retry(max=settings.rq_max_retries, interval=[settings.rq_retry_base_seconds*(2**i) for i in range(settings.rq_max_retries)])
    q.enqueue("app.jobs.actions.execute_action_job", tenant_id, action_id, source, retry=retry)
    log_event(db, tenant_id, None, "ACTION_ENQUEUED", {"action_id": action_id, "queue": settings.rq_queue}, source=source)

@app.post("/approvals/{approval_id}/approve")
def approve(approval_id: int, db: Session = Depends(get_db), user=Depends(require_user)):
    tenant_id = int(user["tenant_id"])
    ar = db.query(ApprovalRequest).filter_by(id=approval_id, tenant_id=tenant_id).first()
    if not ar: raise HTTPException(404, "not found")
    if ar.status != "PENDING": return {"ok": True, "status": ar.status, "stage": ar.stage}

    if ar.stage == "MANAGER":
        ar.stage = "LEGAL"; db.commit()
        return {"ok": True, "stage": ar.stage, "status": ar.status}

    if ar.stage == "LEGAL":
        ar.stage = "DONE"; ar.status = "APPROVED"
        action_id = int(ar.payload.get("action_id", 0))
        src = str(ar.payload.get("source","META")).upper()
        db.commit()
        if action_id:
            enqueue_action(db, tenant_id, action_id, src)
        return {"ok": True, "stage": ar.stage, "status": ar.status}

    return {"ok": True, "stage": ar.stage, "status": ar.status}


# ---------------- V350: Config + Attribution + Reports ----------------

def _load_packaged_json(relpath: str) -> dict:
    from pathlib import Path
    import json
    p = Path(__file__).resolve().parents[1] / "resources" / "templates" / relpath
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))

@app.get("/config/channel-mappers")
def get_channel_mappers():
    return _load_packaged_json("v328/channel_mappers.json")

@app.get("/config/default-attribution")
def get_default_attribution():
    return _load_packaged_json("v328/default_attribution.json")

@app.get("/config/connectors-template")
def get_connectors_template():
    return _load_packaged_json("v328/connectors.json")



# ---------------- V357: Review feed + Official endpoint spec + Search Share ----------------

def _get_db_config(db: Session, tenant_id: int, name: str, default_relpath: str) -> dict:
    """ChannelMappingConfig(name=...)에 저장된 JSON을 우선, 없으면 패키지 내 템플릿을 사용."""
    default = _load_packaged_json(default_relpath) if default_relpath else {}
    obj = db.query(ChannelMappingConfig).filter_by(tenant_id=tenant_id, name=name).first()
    if obj and isinstance(obj.mapping_json, dict) and obj.mapping_json:
        return obj.mapping_json
    return default

def _set_db_config(db: Session, tenant_id: int, name: str, payload: dict) -> dict:
    obj = db.query(ChannelMappingConfig).filter_by(tenant_id=tenant_id, name=name).first()
    if not obj:
        obj = ChannelMappingConfig(tenant_id=tenant_id, name=name, mapping_json={})
        db.add(obj)
    obj.mapping_json = payload or {}
    db.commit()
    return obj.mapping_json

@app.get("/config/reviews/endpoints")
def get_review_endpoints(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V358: DB-backed review endpoint allowlist config (per-tenant)."""
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    return _get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json")

@app.get("/config/reviews/endpoints/draft")
def get_review_endpoints_draft(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V360: Draft allowlist config (not enforced until approved/published)."""
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    return _get_db_config(db, tenant_id, "review_endpoints_draft", "v357/review_endpoints.json")

@app.put("/config/reviews/endpoints/draft")
def put_review_endpoints_draft(payload: dict = Body(...), creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V360: Save draft allowlist config with strict validation (wildcard ban, param regex bounds)."""
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    from app.reviews.endpoint_allowlist import validate_allowlist_config
    from app.audit.logger import audit_log
    try:
        validate_allowlist_config(payload or {})
    except Exception as e:
        audit_log(db, tenant_id, "REVIEW_ENDPOINTS_CONFIG_REJECTED", {"error": str(e)})
        raise HTTPException(400, f"Invalid allowlist config: {e}")
    cfg = _set_db_config(db, tenant_id, "review_endpoints_draft", payload or {})
    audit_log(db, tenant_id, "REVIEW_ENDPOINTS_DRAFT_SAVED", {"count_sources": len((cfg or {}).get("sources", {}))})
    return cfg

@app.post("/config/reviews/endpoints/publish")
def publish_review_endpoints(payload: dict = Body(default={}), creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V361: Promote draft -> active (versioned). Endpoints reset to PENDING_REVIEW for 4-eyes."""
    p = decode_token(creds.credentials)
    role = (p.get("role") or "").lower()
    if role not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    actor = p.get("sub") or p.get("email") or "admin"

    from app.utils.json_diff import json_diff
    from app.models import ReviewEndpointConfigVersion
    from app.audit.logger import audit_log
    from app.reviews.endpoint_allowlist import validate_allowlist_config

    draft = _get_db_config(db, tenant_id, "review_endpoints_draft", "v357/review_endpoints.json")
    active = _get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json")

    # validate + normalize (adds approval defaults, schema checks)
    validate_allowlist_config(draft or {})

    # reset approvals to pending_review on publish
    for sname, sdata in (draft.get("sources") or {}).items():
        for ep in (sdata.get("endpoints") or []):
            ep["approval"] = {
                "state": "PENDING_REVIEW",
                "reviewed_by": "",
                "reviewed_at": None,
                "approved_by": "",
                "approved_at": None,
                "comment": ""
            }

    d = json_diff(active, draft)
    last = db.query(ReviewEndpointConfigVersion).filter_by(tenant_id=tenant_id).order_by(ReviewEndpointConfigVersion.id.desc()).first()
    base_id = int(last.id) if last else 0

    v = ReviewEndpointConfigVersion(
        tenant_id=tenant_id,
        actor=str(actor),
        action="publish",
        base_version_id=base_id,
        config_json=draft,
        diff_json=d,
    )
    db.add(v); db.commit()
    _set_db_config(db, tenant_id, "review_endpoints_active", draft)
    audit_log(db, tenant_id, "REVIEW_ENDPOINTS_PUBLISHED", {"version_id": v.id, "diff_count": d.get("count", 0)})
    return {"ok": True, "version_id": v.id, "diff": d}


@app.post("/config/reviews/endpoints/review-endpoint")
def review_single_endpoint(payload: dict = Body(...), creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V361: Stage 1 (Reviewer) in 4-eyes approval."""
    p = decode_token(creds.credentials)
    role = (p.get("role") or "").lower()
    if role not in ("admin","manager","reviewer"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    actor = p.get("sub") or p.get("email") or "reviewer"

    source = str((payload or {}).get("source") or "").strip().lower()
    endpoint_name = str((payload or {}).get("endpoint_name") or "").strip()
    decision = str((payload or {}).get("decision") or "reviewed").strip().lower()
    comment = str((payload or {}).get("comment") or "").strip()
    if decision not in ("reviewed","rejected"):
        raise HTTPException(400, "decision must be reviewed|rejected")

    cfg = _get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json")
    sdata = (cfg.get("sources") or {}).get(source)
    if not sdata:
        raise HTTPException(404, "source not found")

    found = False
    for ep in (sdata.get("endpoints") or []):
        if ep.get("name") == endpoint_name:
            appr = ep.get("approval") or {}
            appr["state"] = ("REVIEWED" if decision == "reviewed" else "REJECTED")
            appr["reviewed_by"] = str(actor)
            appr["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            appr["comment"] = comment
            # clear approval stage 2 on any reviewer change
            appr["approved_by"] = ""
            appr["approved_at"] = None
            ep["approval"] = appr
            found = True
            break
    if not found:
        raise HTTPException(404, "endpoint not found")

    _set_db_config(db, tenant_id, "review_endpoints_active", cfg)

    from app.models import ReviewEndpointConfigVersion
    from app.utils.json_diff import json_diff
    from app.audit.logger import audit_log
    last = db.query(ReviewEndpointConfigVersion).filter_by(tenant_id=tenant_id).order_by(ReviewEndpointConfigVersion.id.desc()).first()
    base_id = int(last.id) if last else 0
    d = json_diff(_get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json"), cfg)
    v = ReviewEndpointConfigVersion(tenant_id=tenant_id, actor=str(actor), action=f"review:{source}:{endpoint_name}:{decision}", base_version_id=base_id, config_json=cfg, diff_json=d)
    db.add(v); db.commit()
    audit_log(db, tenant_id, "REVIEW_ENDPOINT_REVIEWED", {"source": source, "endpoint": endpoint_name, "decision": decision, "version_id": v.id})
    return {"ok": True, "version_id": v.id}


@app.post("/config/reviews/endpoints/approve-endpoint")
def approve_single_endpoint(payload: dict = Body(...), creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V361: Stage 2 (Approver) in 4-eyes approval."""
    p = decode_token(creds.credentials)
    role = (p.get("role") or "").lower()
    if role not in ("admin","manager","approver"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    actor = p.get("sub") or p.get("email") or "approver"

    source = str((payload or {}).get("source") or "").strip().lower()
    endpoint_name = str((payload or {}).get("endpoint_name") or "").strip()
    decision = str((payload or {}).get("decision") or "approved").strip().lower()
    comment = str((payload or {}).get("comment") or "").strip()
    if decision not in ("approved","rejected"):
        raise HTTPException(400, "decision must be approved|rejected")

    cfg = _get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json")
    sdata = (cfg.get("sources") or {}).get(source)
    if not sdata:
        raise HTTPException(404, "source not found")

    found = False
    for ep in (sdata.get("endpoints") or []):
        if ep.get("name") == endpoint_name:
            appr = ep.get("approval") or {}
            state = str(appr.get("state") or "PENDING_REVIEW").upper()
            if state != "REVIEWED":
                raise HTTPException(409, f"Endpoint must be REVIEWED before approval (state={state})")
            reviewer = str(appr.get("reviewed_by") or "")
            if reviewer and reviewer == str(actor):
                raise HTTPException(409, "4-eyes violation: approver must be different from reviewer")
            appr["state"] = ("APPROVED" if decision == "approved" else "REJECTED")
            appr["approved_by"] = str(actor)
            appr["approved_at"] = datetime.now(timezone.utc).isoformat()
            if comment:
                appr["comment"] = (appr.get("comment") or "") + ("\n" if appr.get("comment") else "") + f"[approver] {comment}"
            ep["approval"] = appr
            found = True
            break
    if not found:
        raise HTTPException(404, "endpoint not found")

    _set_db_config(db, tenant_id, "review_endpoints_active", cfg)

    from app.models import ReviewEndpointConfigVersion
    from app.utils.json_diff import json_diff
    from app.audit.logger import audit_log
    last = db.query(ReviewEndpointConfigVersion).filter_by(tenant_id=tenant_id).order_by(ReviewEndpointConfigVersion.id.desc()).first()
    base_id = int(last.id) if last else 0
    d = json_diff(_get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json"), cfg)
    v = ReviewEndpointConfigVersion(tenant_id=tenant_id, actor=str(actor), action=f"approve:{source}:{endpoint_name}:{decision}", base_version_id=base_id, config_json=cfg, diff_json=d)
    db.add(v); db.commit()
    audit_log(db, tenant_id, "REVIEW_ENDPOINT_APPROVED", {"source": source, "endpoint": endpoint_name, "decision": decision, "version_id": v.id})
    return {"ok": True, "version_id": v.id}


@app@app.get("/config/reviews/endpoints/catalog")
def get_review_endpoints_catalog(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db), include_pending: bool = False):
    """UI/Connector-friendly catalog of approved endpoint keys."""
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    allowlist = _get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json")
    from app.reviews.endpoint_allowlist import list_endpoint_catalog
    return list_endpoint_catalog(allowlist, include_pending=include_pending)

@app.get("/admin/reviews/endpoints/ui", response_class=HTMLResponse)
def review_endpoints_admin_ui(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V361: Lightweight Admin UI
    - Approved endpoint selector (key-based)
    - History viewer + one-click rollback

    Note: In-browser fetch calls need a Bearer token; paste your token in the UI.
    """
    p = decode_token(creds.credentials)
    role = (p.get("role") or "").lower()
    if role not in ("admin", "manager", "reviewer", "approver"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)

    allowlist = _get_db_config(db, tenant_id, "review_endpoints_active", "v357/review_endpoints.json")
    from app.reviews.endpoint_allowlist import list_endpoint_catalog
    catalog = list_endpoint_catalog(allowlist, include_pending=True)

    catalog_json = json.dumps(catalog, ensure_ascii=False)

    html = """<!doctype html>
<html>
<head>
<meta charset='utf-8'/>
<title>Review Endpoints Admin (V361)</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;max-width:1080px}
  .card{border:1px solid #ddd;border-radius:12px;padding:16px;margin-bottom:16px}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  label{display:block;font-size:12px;color:#555;margin-bottom:6px}
  select,input{padding:8px;border-radius:10px;border:1px solid #ccc;min-width:260px}
  button{padding:10px 14px;border-radius:12px;border:1px solid #333;background:#111;color:#fff;cursor:pointer}
  button.secondary{background:#fff;color:#111}
  pre{background:#f7f7f7;border-radius:12px;padding:12px;overflow:auto}
  table{border-collapse:collapse;width:100%}
  th,td{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:13px}
  .small{color:#666;font-size:12px}
</style>
</head>
<body>
  <h2>Review Endpoint Governance (V361)</h2>

  <div class='card'>
    <h3>1) Token (for UI actions)</h3>
    <p class='small'>Browser fetch calls need a Bearer token. Paste the same token you used to access this page.</p>
    <div class='row'>
      <div style='flex:1;min-width:520px'>
        <label>Bearer token</label>
        <input id='token' placeholder='eyJhbGciOi...'/>
      </div>
    </div>
  </div>

  <div class='card'>
    <h3>2) Endpoint selector (key-based)</h3>
    <div class='row'>
      <div><label>Source</label><select id='src'></select></div>
      <div><label>Endpoint key</label><select id='ep'></select></div>
      <div><label>Base URL</label><select id='base'></select></div>
    </div>
    <div class='row' style='margin-top:12px'>
      <button id='copy'>Copy snippet</button>
      <button class='secondary' id='reviewBtn'>Mark REVIEWED</button>
      <button class='secondary' id='approveBtn'>Mark APPROVED</button>
    </div>
    <p class='small'>/sources/create overwrites method/path. Sync hardlocks to APPROVED keys only.</p>
    <pre id='snippet'></pre>
  </div>

  <div class='card'>
    <h3>3) Version history + one-click rollback</h3>
    <div class='row' style='margin-bottom:8px'>
      <button class='secondary' id='refreshHistory'>Refresh history</button>
    </div>
    <table>
      <thead><tr><th>ID</th><th>Time</th><th>Actor</th><th>Action</th><th>Diff</th><th>Rollback</th></tr></thead>
      <tbody id='hist'></tbody>
    </table>
  </div>

  <div class='card'>
    <h3>4) Catalog (debug)</h3>
    <pre id='cfg'></pre>
  </div>

<script>
  const catalog = __CATALOG_JSON__;
  const tokenEl = document.getElementById('token');
  const srcSel = document.getElementById('src');
  const epSel = document.getElementById('ep');
  const baseSel = document.getElementById('base');
  const snippet = document.getElementById('snippet');
  const cfg = document.getElementById('cfg');
  const histBody = document.getElementById('hist');

  cfg.textContent = JSON.stringify(catalog, null, 2);

  function headers() {
    const t = tokenEl.value.trim();
    const h = { 'Content-Type': 'application/json' };
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  function initSources() {
    srcSel.innerHTML = '';
    Object.keys(catalog.sources||{}).forEach(s=>{
      const o=document.createElement('option'); o.value=s; o.textContent=s; srcSel.appendChild(o);
    });
    refreshEndpoints();
  }

  function refreshEndpoints() {
    epSel.innerHTML = '';
    baseSel.innerHTML = '';
    const s = srcSel.value;
    const data = catalog.sources[s] || {};
    (data.allowed_base_urls||[]).forEach(u=>{
      const o=document.createElement('option'); o.value=u; o.textContent=u; baseSel.appendChild(o);
    });
    (data.endpoints||[]).forEach(e=>{
      const o=document.createElement('option');
      o.value=e.name;
      const st = e.status || (e.approval && e.approval.state) || 'UNKNOWN';
      o.textContent = `${e.name} [${st}] (${e.method} ${e.path})`;
      epSel.appendChild(o);
    });
    refreshSnippet();
  }

  function refreshSnippet() {
    const s = srcSel.value;
    const e = epSel.value;
    const b = baseSel.value;
    const platform = (s==='naver'?'naver_reviews_official':(s==='coupang'?'coupang_reviews_official':'amazon_reviews_official'));
    const body = {
      kind: 'REVIEWS',
      platform,
      name: `${s} reviews (official)`,
      config: { source: s, endpoint_name: e, base_url: b }
    };
    snippet.textContent = JSON.stringify(body, null, 2);
  }

  async function postJson(url, payload) {
    const res = await fetch(url, { method:'POST', headers: headers(), body: JSON.stringify(payload||{}) });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  async function getJson(url) {
    const res = await fetch(url, { headers: headers() });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt);
    return JSON.parse(txt);
  }

  document.getElementById('copy').onclick = async () => {
    await navigator.clipboard.writeText(snippet.textContent);
    alert('Copied!');
  };
  srcSel.onchange = refreshEndpoints;
  epSel.onchange = refreshSnippet;
  baseSel.onchange = refreshSnippet;

  document.getElementById('reviewBtn').onclick = async () => {
    const s=srcSel.value, e=epSel.value;
    await postJson('/config/reviews/endpoints/review-endpoint', { source:s, endpoint_name:e, decision:'reviewed', comment:'reviewed via UI' });
    alert('Marked REVIEWED.');
  };

  document.getElementById('approveBtn').onclick = async () => {
    const s=srcSel.value, e=epSel.value;
    await postJson('/config/reviews/endpoints/approve-endpoint', { source:s, endpoint_name:e, decision:'approved', comment:'approved via UI' });
    alert('Marked APPROVED.');
  };

  async function refreshHistory() {
    histBody.innerHTML = '';
    const items = (await getJson('/config/reviews/endpoints/history?limit=50')).items || [];
    items.forEach(it=>{
      const tr=document.createElement('tr');
      const diffCount = (it.diff && it.diff.count) ? it.diff.count : '';
      tr.innerHTML = `
        <td>${it.id}</td>
        <td>${it.created_at || ''}</td>
        <td>${it.actor || ''}</td>
        <td>${it.action || ''}</td>
        <td>${diffCount}</td>
        <td><button class='secondary'>Rollback</button></td>
      `;
      tr.querySelector('button').onclick = async () => {
        if (!confirm('Rollback to version ' + it.id + '?')) return;
        await postJson('/config/reviews/endpoints/rollback', { version_id: it.id });
        alert('Rolled back.');
      };
      histBody.appendChild(tr);
    });
  }

  document.getElementById('refreshHistory').onclick = refreshHistory;

  initSources();
  refreshHistory();
</script>
</body>
</html>"""

    html = html.replace("__CATALOG_JSON__", catalog_json)
    return HTMLResponse(html)

@app.put("/config/reviews/endpoints")
def put_review_endpoints(body: dict, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)

    from app.reviews.endpoint_allowlist import validate_allowlist_config, AllowlistViolation
    try:
        validate_allowlist_config(body)
    except AllowlistViolation as e:
        log_event(db, tenant_id, int(p.get("user_id") or 0) or None, "REVIEW_ENDPOINTS_CONFIG_REJECTED",
                  {"reason": str(e)}, source="reviews_endpoints", ok=False)
        raise HTTPException(getattr(e, "status_code", 400), str(e))

    prev = _get_db_config(db, tenant_id, "review_endpoints", "v357/review_endpoints.json")
    saved = _set_db_config(db, tenant_id, "review_endpoints", body)
    log_event(db, tenant_id, int(p.get("user_id") or 0) or None, "REVIEW_ENDPOINTS_CONFIG_UPDATED",
              {"prev_hash": secrets.token_hex(8), "sources": list((saved.get("sources") or {}).keys())},
              source="reviews_endpoints", ok=True)
    return saved

@app.get("/config/reviews/feed-samples")
def get_review_feed_samples():
    return _load_packaged_json("v357/review_feed_samples.json")

@app.get("/config/brand-mapping")
def get_brand_mapping(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    return _get_db_config(db, tenant_id, "brand_mapping", "v357/brand_mapping_rules.json")

@app.put("/config/brand-mapping")
def put_brand_mapping(body: dict, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    return _set_db_config(db, tenant_id, "brand_mapping", body)

@app.get("/config/campaign-policy")
def get_campaign_policy(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    return _get_db_config(db, tenant_id, "campaign_policy", "v357/campaign_policy.json")

@app.put("/config/campaign-policy")
def put_campaign_policy(body: dict, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    return _set_db_config(db, tenant_id, "campaign_policy", body)


@app.get("/config/channels/api-profiles")
def get_channel_api_profiles(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V365: Per-tenant official API scope + rate-limit + endpoint/mapping profiles for marketplace connectors."""
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    return _get_db_config(db, tenant_id, "channel_api_profiles", "v366/channel_api_profiles.json")

@app.put("/config/channels/api-profiles")
def put_channel_api_profiles(payload: dict = Body(...), creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    # basic validation: require channels dict
    if not isinstance(payload, dict) or not isinstance(payload.get("channels"), dict):
        raise HTTPException(400, "channels object required")
    return _set_db_config(db, tenant_id, "channel_api_profiles", payload or {})



@app.post("/admin/channels/api-profiles/apply")
def apply_channel_api_profiles_patch(patch: dict = Body(...), dry_run: bool = False, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """V366: Apply a patch (diff) onto current channel_api_profiles, validate fail-closed, and persist.
    This enables 'just fill exact values from official docs' without editing code.
    """
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    actor_user_id = int(p.get("user_id") or 0) if p.get("user_id") else None

    current = _get_db_config(db, tenant_id, "channel_api_profiles", "v366/channel_api_profiles.json")
    merged = deep_merge(current or {}, patch or {})
    ok, errs = validate_profiles_strict(merged)
    if not ok:
        from app.audit.logger import log_event
        log_event(db, tenant_id, actor_user_id, "CHANNEL_API_PROFILES_PATCH_REJECTED", {"errors": errs}, source="admin/api-profiles", ok=False)
        raise HTTPException(400, {"errors": errs})

    if dry_run:
        return {"ok": True, "dry_run": True, "merged": merged}

    out = _set_db_config(db, tenant_id, "channel_api_profiles", merged)
    from app.audit.logger import log_event
    log_event(db, tenant_id, actor_user_id, "CHANNEL_API_PROFILES_PATCH_APPLIED", {"patch": patch, "result_keys": list((merged.get("channels") or {}).keys())}, source="admin/api-profiles")
    return out


@app.get("/admin/channels/api-profiles/ui")
def channel_api_profiles_ui(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Simple admin UI to paste a JSON patch and apply (or dry-run)."""
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    html = """<!doctype html><html><head><meta charset='utf-8'><title>Channel API Profiles (V366)</title>
<style>body{font-family:system-ui;margin:20px}textarea{width:100%;height:240px}button{padding:10px 14px;margin-right:8px}</style></head>
<body>
<h2>Channel API Profiles Patch (V366)</h2>
<p>Paste a JSON patch. Use Dry-run first. Placeholders are blocked unless allow_placeholders=true (sandbox only).</p>
<textarea id="patch">{}</textarea><br/>
<button onclick="apply(true)">Dry-run</button><button onclick="apply(false)">Apply</button>
<pre id="out"></pre>
<script>
async function apply(dry){
  const token = localStorage.getItem('access_token') || '';
  const patch = JSON.parse(document.getElementById('patch').value || '{}');
  const res = await fetch('/admin/channels/api-profiles/apply?dry_run='+dry, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify(patch)});
  const txt = await res.text();
  document.getElementById('out').textContent = txt;
}
</script>
</body></html>"""
    return HTMLResponse(html)





@app.get("/config/reviews/feed-mapping")
def get_review_feed_mapping(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    return _get_db_config(db, tenant_id, "review_feed_mapping", "v357/review_feed_mapping.json")

@app.put("/config/reviews/feed-mapping")
def put_review_feed_mapping(body: dict, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin","manager"):
        raise HTTPException(403, "Forbidden")
    tenant_id = int(p.get("tenant_id") or 0)
    return _set_db_config(db, tenant_id, "review_feed_mapping", body)

@app.post("/reviews/ingest")
def ingest_reviews(body: dict, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """파트너/다운로드 리뷰 피드(CSV/JSON)를 업로드(텍스트)하면 내부 Review 스키마로 정규화 후 적재."""
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)

    fmt = (body.get("format") or "").lower().strip()
    data = body.get("data") or ""
    if fmt not in ("csv","json"):
        raise HTTPException(400, "format must be csv or json")
    if not data:
        raise HTTPException(400, "data is required (raw text)")

    mapping = _get_db_config(db, tenant_id, "review_feed_mapping", "v357/review_feed_mapping.json")
    channel_default = (mapping.get("channel_default") or "naver")

    if fmt == "csv":
        payload = normalize_reviews_from_csv(str(data), mapping, channel_default=channel_default)
    else:
        payload = normalize_reviews_from_json(str(data), mapping, channel_default=channel_default)

    written = write_payload(db, tenant_id, payload)
    db.commit()
    return {"ok": True, "written": written}

@app.post("/reviews/ingest-file")
async def ingest_reviews_file(file: UploadFile = File(...), fmt: str = "csv",
                              creds: HTTPAuthorizationCredentials = Depends(security),
                              db: Session = Depends(get_db)):
    """파일 업로드 버전. fmt=csv|json"""
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    raw = (await file.read()).decode("utf-8", errors="ignore")

    mapping = _get_db_config(db, tenant_id, "review_feed_mapping", "v357/review_feed_mapping.json")
    channel_default = (mapping.get("channel_default") or "naver")

    if (fmt or "").lower().strip() == "json":
        payload = normalize_reviews_from_json(raw, mapping, channel_default=channel_default)
    else:
        payload = normalize_reviews_from_csv(raw, mapping, channel_default=channel_default)

    written = write_payload(db, tenant_id, payload)
    db.commit()
    return {"ok": True, "written": written, "filename": file.filename}

@app.get("/analytics/search-share")
def analytics_search_share(start_day: str, end_day: str, remove_overlap: bool = True,
                           creds: HTTPAuthorizationCredentials = Depends(security),
                           db: Session = Depends(get_db)):
    """검색점유(키워드 단위) + 브랜드 매핑 + Paid/Organic 중복 제거."""
    p = decode_token(creds.credentials)
    tenant_id = int(p.get("tenant_id") or 0)
    return compute_keyword_share(db, tenant_id, start_day, end_day, remove_paid_organic_overlap=remove_overlap)

@app.get("/admin/source.zip")
def download_source_zip(creds: HTTPAuthorizationCredentials = Depends(security)):
    """현재 실행중인 소스 전체를 ZIP으로 다운로드 (운영 편의)."""
    p = decode_token(creds.credentials)
    if (p.get("role") or "") not in ("admin",):
        raise HTTPException(403, "Forbidden")

    # repo root: .../backend/app/main.py -> .../backend/.. (repo root)
    from pathlib import Path
    import zipfile
    import os
    import tempfile

    repo_root = Path(__file__).resolve().parents[2]  # backend/
    # zip output under /tmp
    tmpdir = Path(tempfile.gettempdir())
    out = tmpdir / "GENIE_ROI_SOURCE.zip"

    def _skip(path: Path) -> bool:
        rel = str(path.relative_to(repo_root))
        bad = ("__pycache__", ".git", ".venv", "node_modules", ".pytest_cache")
        return any(b in rel for b in bad)

    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for pth in repo_root.rglob("*"):
            if pth.is_dir():
                continue
            if _skip(pth):
                continue
            z.write(pth, arcname=str(pth.relative_to(repo_root)))

    return FileResponse(str(out), filename="GENIE_ROI_SOURCE.zip")
@app.get("/tenant/config")
def get_tenant_configs(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_token(creds.credentials)
    tenant_id = int(payload.get("tenant_id"))
    attr = db.query(AttributionConfig).filter(AttributionConfig.tenant_id==tenant_id).order_by(AttributionConfig.updated_at.desc()).first()
    cmap = db.query(ChannelMappingConfig).filter(ChannelMappingConfig.tenant_id==tenant_id).order_by(ChannelMappingConfig.updated_at.desc()).first()
    return {
        "attribution": attr.config_json if attr else {},
        "channel_mapping": cmap.mapping_json if cmap else {}
    }

@app.post("/tenant/config")
def set_tenant_configs(body: dict, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_token(creds.credentials)
    tenant_id = int(payload.get("tenant_id"))
    if "attribution" in body:
        db.add(AttributionConfig(tenant_id=tenant_id, name="default", config_json=body.get("attribution") or {}))
    if "channel_mapping" in body:
        db.add(ChannelMappingConfig(tenant_id=tenant_id, name="default", mapping_json=body.get("channel_mapping") or {}))
    db.commit()
    return {"ok": True}

@app.get("/analytics/attribution")
def get_attribution(days: int = 30, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_token(creds.credentials)
    tenant_id = int(payload.get("tenant_id"))
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    return last_touch_attribution(db, tenant_id, start, end)


@app.get("/analytics/ads/naver")
def naver_ads(level: str = "campaign", days: int = 30, limit: int = 50, creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_token(creds.credentials)
    tenant_id = int(payload.get("tenant_id"))
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    qs = db.query(MarketingMetric).filter(
        MarketingMetric.tenant_id==tenant_id,
        MarketingMetric.source=="naver_searchad",
    )
    # time filter on day string YYYY-MM-DD
    qs = qs.filter(MarketingMetric.day >= start.strftime("%Y-%m-%d"))
    if level not in ("campaign","adgroup","keyword"):
        level = "campaign"
    qs = qs.filter(MarketingMetric.level==level)

    # aggregate in python for portability (sqlite)
    rows = qs.all()
    agg = {}
    for r in rows:
        key = {
            "campaign": (r.campaign_id, r.campaign_name),
            "adgroup": (r.adgroup_id, r.adgroup_name, r.campaign_id, r.campaign_name),
            "keyword": (r.keyword_id, r.keyword_text, r.adgroup_id, r.adgroup_name, r.campaign_id, r.campaign_name),
        }[level]
        a = agg.get(key)
        if not a:
            a = {"impressions":0,"clicks":0,"purchases":0,"spend":0.0,"revenue":0.0}
            agg[key]=a
        a["impressions"] += int(r.impressions or 0)
        a["clicks"] += int(r.clicks or 0)
        a["purchases"] += int(r.purchases or 0)
        a["spend"] += float(r.spend or 0.0)
        a["revenue"] += float(r.revenue or 0.0)

    out = []
    for k,v in agg.items():
        if level=="campaign":
            cid,cname = k
            out.append({"campaign_id":cid,"campaign_name":cname, **v})
        elif level=="adgroup":
            aid,aname,cid,cname = k
            out.append({"adgroup_id":aid,"adgroup_name":aname,"campaign_id":cid,"campaign_name":cname, **v})
        else:
            kid,ktext,aid,aname,cid,cname = k
            out.append({"keyword_id":kid,"keyword_text":ktext,"adgroup_id":aid,"adgroup_name":aname,"campaign_id":cid,"campaign_name":cname, **v})
    out.sort(key=lambda x: x.get("spend",0), reverse=True)
    return {"level": level, "days": days, "items": out[:max(1, min(limit, 200))]}


@app.get("/reports/latest.pdf")
def latest_pdf_report(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_token(creds.credentials)
    tenant_id = int(payload.get("tenant_id"))
    data = generate_latest_report(db, tenant_id)
    return Response(content=data, media_type="application/pdf")

# --- V355: Reviews (official / legal sources) ingestion ---
@app.post("/reviews/import")
def import_reviews(body: dict, user=Depends(require_user), db: Session = Depends(get_db)):
    """Import reviews from merchant-provided exports or official partners (CSV->JSON on client side).
    Body: {"source":"naver_export", "reviews":[{sku, channel, rating, title, body, author, reviewed_at, raw}, ...]}
    """
    tenant_id = int(user["tenant_id"])
    payload = {"source": body.get("source") or "import", "reviews": body.get("reviews") or []}
    n = write_payload(db, tenant_id, payload)
    db.commit()
    return {"ok": True, "written": n}


# --- V356: Digital shelf compliance policy management ---
@app.get("/policies/digital-shelf-compliance")
def get_digital_shelf_policy(user=Depends(require_user)):
    """Return the current digital-shelf content compliance policy (YAML parsed to JSON)."""
    return {"ok": True, "policy": load_compliance_policy()}

@app.put("/policies/digital-shelf-compliance")
def update_digital_shelf_policy(body: dict, user=Depends(require_user)):
    """Update policy. Body: {"policy": {...}}. This writes backend/app/policies/digital_shelf_compliance.yaml.
    Note: in production, gate this with admin RBAC.
    """
    from app.policies.compliance import POLICY_PATH
    policy = body.get("policy")
    if not isinstance(policy, dict):
        raise HTTPException(status_code=400, detail="policy must be an object")
    import yaml
    POLICY_PATH.write_text(yaml.safe_dump(policy, sort_keys=False, allow_unicode=True), encoding="utf-8")
    return {"ok": True}


# --- V355: Digital shelf ingestion ---
@app.post("/digital-shelf/ingest")
def ingest_digital_shelf(body: dict, user=Depends(require_user), db: Session = Depends(get_db)):
    """Ingest digital-shelf snapshots from compliant sources (e.g., internal audits, 3rd-party feeds).
    Body: {"source":"audit", "digital_shelf":[{channel, keyword, brand, competitor, listing_id, url, position, price, in_stock, content_score, captured_at, raw}], "content_issues":[...]}
    """
    tenant_id = int(user["tenant_id"])
    # Auto-score content compliance using policy when content_score is missing/zero
    ds_items = body.get("digital_shelf") or []
    issues = body.get("content_issues") or []
    try:
        for it in ds_items:
            if not isinstance(it, dict):
                continue
            cs = it.get("content_score")
            if (cs is None or float(cs) == 0.0) and (it.get("raw") or {}).get("title"):
                res = evaluate_listing(it.get("channel") or "", it)
                it["content_score"] = float(res.score)
                lid = it.get("listing_id") or ""
                ch = it.get("channel") or ""
                for iss in res.issues:
                    issues.append({"channel": ch, "listing_id": lid, **iss})
    except Exception:
        pass
    payload = {
        "source": body.get("source") or "digital_shelf",
        "digital_shelf": ds_items,
        "content_issues": issues,
    }
    n = write_payload(db, tenant_id, payload)
    db.commit()
    return {"ok": True, "written": n}

# --- V355: Claims/settlements KPI ---
@app.get("/analytics/kpi/claims")
def claims_kpi(days: int = 30, user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    since = datetime.now(timezone.utc) - timedelta(days=days)
    total_claims = db.query(Claim).filter(Claim.tenant_id==tenant_id, Claim.occurred_at>=since).count()
    total_refund = db.query(Claim).filter(Claim.tenant_id==tenant_id, Claim.occurred_at>=since).with_entities(sql_text("COALESCE(SUM(amount),0)")).scalar()
    by_reason = db.execute(sql_text("""
        SELECT reason, COUNT(*) as cnt, COALESCE(SUM(amount),0) as amt
        FROM claims
        WHERE tenant_id=:tid AND occurred_at>=:since
        GROUP BY reason
        ORDER BY cnt DESC
        LIMIT 10
    """), {"tid": tenant_id, "since": since}).fetchall()
    return {
        "days": days,
        "claims": int(total_claims),
        "refund_amount": float(total_refund or 0.0),
        "top_reasons": [{"reason": r[0] or "", "count": int(r[1]), "amount": float(r[2] or 0.0)} for r in by_reason],
    }

@app.get("/analytics/kpi/settlements")
def settlements_kpi(days: int = 90, user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(sql_text("""
        SELECT channel,
               COUNT(*) as cnt,
               COALESCE(SUM(gross_sales),0) as gross,
               COALESCE(SUM(fees),0) as fees,
               COALESCE(SUM(net_payout),0) as net
        FROM settlements
        WHERE tenant_id=:tid AND created_at>=:since
        GROUP BY channel
        ORDER BY net DESC
    """), {"tid": tenant_id, "since": since}).fetchall()
    return {"days": days, "by_channel": [{"channel": r[0], "count": int(r[1]), "gross_sales": float(r[2]), "fees": float(r[3]), "net_payout": float(r[4])} for r in rows]}

# --- V355: Digital shelf analytics (search share, compliance, price, oos) ---
@app.get("/analytics/digital-shelf/overview")
def digital_shelf_overview(days: int = 30, channel: str = "", brand: str = "", user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    since = datetime.now(timezone.utc) - timedelta(days=days)
    q = "SELECT COUNT(*) as n, COALESCE(AVG(content_score),0) as cs, COALESCE(AVG(price),0) as p, COALESCE(SUM(CASE WHEN in_stock THEN 0 ELSE 1 END),0) as oos FROM digital_shelf_snapshots WHERE tenant_id=:tid AND captured_at>=:since"
    params={"tid": tenant_id, "since": since}
    if channel:
        q += " AND channel=:ch"; params["ch"]=channel
    if brand:
        q += " AND brand=:br"; params["br"]=brand
    row = db.execute(sql_text(q), params).fetchone()
    n, cs, avgp, oos = row
    return {"days": days, "samples": int(n), "avg_content_score": float(cs), "avg_price": float(avgp), "oos_rate": (float(oos)/float(n) if n else 0.0)}

@app.get("/analytics/digital-shelf/search-share")
def digital_shelf_share(keyword: str, top_k: int = 10, brand: str = "", channel: str = "", days: int = 30, user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    since = datetime.now(timezone.utc) - timedelta(days=days)
    params={"tid": tenant_id, "since": since, "kw": keyword, "k": top_k}
    q = """
      SELECT brand, COUNT(*) as cnt
      FROM digital_shelf_snapshots
      WHERE tenant_id=:tid AND captured_at>=:since AND keyword=:kw AND position>0 AND position<=:k
    """
    if channel:
        q += " AND channel=:ch"; params["ch"]=channel
    q += " GROUP BY brand ORDER BY cnt DESC"
    rows=db.execute(sql_text(q), params).fetchall()
    total=sum([r[1] for r in rows]) or 0
    shares=[{"brand": r[0] or "", "count": int(r[1]), "share": (float(r[1])/float(total) if total else 0.0)} for r in rows]
    if brand:
        mine = next((s for s in shares if s["brand"]==brand), {"brand": brand, "count":0, "share":0.0})
        return {"keyword": keyword, "top_k": top_k, "total_hits": int(total), "brand": mine, "distribution": shares[:10]}
    return {"keyword": keyword, "top_k": top_k, "total_hits": int(total), "distribution": shares[:10]}

# --- V356: Advanced search share (combine SearchAd + SERP snapshots) ---
@app.get("/analytics/digital-shelf/search-share-advanced")
def digital_shelf_share_advanced(keyword: str, top_k: int = 10, brand: str = "", channel: str = "naver", days: int = 30, alpha_paid: float = 0.5,
                                 user=Depends(require_user), db: Session = Depends(get_db)):
    """Compute advanced share-of-search by blending:
    - Organic SERP presence (DigitalShelfSnapshot positions)
    - Paid visibility (Naver SearchAd keyword-level impressions/clicks from MarketingMetric)

    alpha_paid: weight for paid component (0..1). Combined = alpha_paid*paid + (1-alpha_paid)*organic
    """
    tenant_id = int(user["tenant_id"])
    alpha_paid = max(0.0, min(1.0, float(alpha_paid)))

    # Organic component from internal SERP snapshots
    since_dt = datetime.now(timezone.utc) - timedelta(days=int(days))
    q = db.query(DigitalShelfSnapshot).filter(DigitalShelfSnapshot.tenant_id==tenant_id)
    q = q.filter(DigitalShelfSnapshot.keyword==keyword)
    if channel:
        q = q.filter(DigitalShelfSnapshot.channel==channel)
    snaps = q.filter(DigitalShelfSnapshot.captured_at >= since_dt).all()
    organic_total = 0
    organic_brand = 0
    # per capture timestamp: consider top_k positions
    # simple aggregation: count snapshots within top_k
    for s in snaps:
        if int(s.position or 0) <= int(top_k) and int(s.position or 0) > 0:
            organic_total += 1
            if brand and ((s.brand or "").lower() == brand.lower()):
                organic_brand += 1
    organic_share = (organic_brand / organic_total) if organic_total else 0.0

    # Paid component from SearchAd keyword-level metrics
    mq = db.query(MarketingMetric).filter(MarketingMetric.tenant_id==tenant_id)
    mq = mq.filter(MarketingMetric.source.in_(["NAVER_SEARCHAD","naver_searchad","NAVER_SEARCH","naver_search"]))
    mq = mq.filter(MarketingMetric.level=="keyword")
    mq = mq.filter(MarketingMetric.keyword_text==keyword)
    # (Optionally, filter brand via campaign/adgroup naming conventions if provided)
    metrics = mq.all()
    paid_impressions = sum(int(m.impressions or 0) for m in metrics)
    paid_clicks = sum(int(m.clicks or 0) for m in metrics)
    # brand-specific paid share: if brand provided, use campaign_name/adgroup_name contains brand
    paid_impressions_b = 0
    paid_clicks_b = 0
    if brand:
        for m in metrics:
            name = f"{m.campaign_name} {m.adgroup_name}".lower()
            if brand.lower() in name:
                paid_impressions_b += int(m.impressions or 0)
                paid_clicks_b += int(m.clicks or 0)
    else:
        paid_impressions_b = paid_impressions
        paid_clicks_b = paid_clicks

    paid_share_impr = (paid_impressions_b / paid_impressions) if paid_impressions else 0.0
    paid_share_clk = (paid_clicks_b / paid_clicks) if paid_clicks else 0.0
    # choose impression share as primary; clicks as secondary
    paid_share = paid_share_impr if paid_impressions else paid_share_clk

    combined = alpha_paid * paid_share + (1.0 - alpha_paid) * organic_share
    return {
        "ok": True,
        "keyword": keyword,
        "channel": channel,
        "brand": brand,
        "top_k": int(top_k),
        "days": int(days),
        "organic": {"share": organic_share, "samples": organic_total, "brand_samples": organic_brand},
        "paid": {"share": paid_share, "impressions_total": paid_impressions, "clicks_total": paid_clicks, "impressions_brand": paid_impressions_b, "clicks_brand": paid_clicks_b},
        "combined_share": combined,
        "alpha_paid": alpha_paid
    }


# --- V362: Retail Media Optimization (rule-based) ---
@app.get("/ads/optimize/rules")
def get_opt_rules(source: str = "retail_media", user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    from app.models import AdOptimizationRule
    rule = db.query(AdOptimizationRule).filter_by(tenant_id=tenant_id, source=source).order_by(AdOptimizationRule.id.desc()).first()
    return {"ok": True, "source": source, "rule": (rule.rule_json if rule else {}), "enabled": (bool(rule.enabled) if rule else True), "name": (rule.name if rule else "default")}

@app.put("/ads/optimize/rules")
def put_opt_rules(body: dict, source: str = "retail_media", user=Depends(require_admin), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    from app.models import AdOptimizationRule
    rule = AdOptimizationRule(
        tenant_id=tenant_id,
        source=source,
        name=str(body.get("name") or "default"),
        enabled=bool(body.get("enabled", True)),
        rule_json=body.get("rule") or {},
        created_by=str(user.get("email") or "admin"),
    )
    db.add(rule); db.commit()
    return {"ok": True, "id": rule.id}

@app.post("/ads/optimize/run")
def run_optimizer(source: str = "retail_media", user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    from app.ads.optimizer import optimize
    return optimize(db, tenant_id=tenant_id, source=source)



# --- V363: Optimization APPLY workflow (4-eyes + audit + rollback) ---
@app.post("/ads/optimize/plan/from-run")
def create_opt_plan_from_run(body: dict, source: str = "retail_media", user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    run_id = int((body or {}).get("run_id") or 0)
    if run_id <= 0:
        raise HTTPException(400, "run_id required")
    from app.ads.apply import build_plan_from_run
    plan = build_plan_from_run(db, tenant_id=tenant_id, source=source, run_id=run_id, actor=str(user.get("email") or "user"))
    return {"ok": True, "plan_id": plan.id, "status": plan.status}

@app.get("/ads/optimize/plan")
def get_opt_plan(plan_id: int, user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    from app.models import AdOptimizationPlan
    plan = db.query(AdOptimizationPlan).filter_by(tenant_id=tenant_id, id=plan_id).first()
    if not plan:
        raise HTTPException(404, "plan not found")
    return {"ok": True, "plan": {
        "id": plan.id, "source": plan.source, "run_id": plan.run_id, "status": plan.status,
        "plan_json": plan.plan_json,
        "created_by": plan.created_by, "created_at": plan.created_at,
        "reviewed_by": plan.reviewed_by, "reviewed_at": plan.reviewed_at,
        "approved_by": plan.approved_by, "approved_at": plan.approved_at,
        "applied_by": plan.applied_by, "applied_at": plan.applied_at,
        "apply_result": plan.apply_result_json,
        "rolled_back_by": plan.rolled_back_by, "rolled_back_at": plan.rolled_back_at,
        "rollback_result": plan.rollback_result_json,
    }}

@app.post("/ads/optimize/plan/review")
def review_opt_plan(body: dict, user=Depends(require_admin), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    plan_id = int((body or {}).get("plan_id") or 0)
    decision = str((body or {}).get("decision") or "reviewed").lower()
    comment = str((body or {}).get("comment") or "")
    if decision not in ("reviewed","rejected"):
        raise HTTPException(400, "decision must be reviewed|rejected")
    from app.models import AdOptimizationPlan
    from app.audit.logger import audit_log
    from datetime import datetime, timezone
    plan = db.query(AdOptimizationPlan).filter_by(tenant_id=tenant_id, id=plan_id).first()
    if not plan:
        raise HTTPException(404, "plan not found")
    actor = str(user.get("email") or "reviewer")
    if plan.created_by and plan.created_by == actor:
        raise HTTPException(400, "Reviewer must be different from creator (4-eyes)")
    if decision == "rejected":
        plan.status = "REJECTED"
        plan.rejected_by = actor
        plan.rejected_at = datetime.now(timezone.utc)
    else:
        plan.status = "REVIEWED"
        plan.reviewed_by = actor
        plan.reviewed_at = datetime.now(timezone.utc)
    plan.plan_json = dict(plan.plan_json or {})
    plan.plan_json["review_comment"] = comment
    db.commit()
    audit_log(db, tenant_id, "ADOPT_PLAN_REVIEWED", {"plan_id": plan.id, "decision": decision})
    return {"ok": True, "status": plan.status}

@app.post("/ads/optimize/plan/approve")
def approve_opt_plan(body: dict, user=Depends(require_admin), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    plan_id = int((body or {}).get("plan_id") or 0)
    decision = str((body or {}).get("decision") or "approved").lower()
    comment = str((body or {}).get("comment") or "")
    if decision not in ("approved","rejected"):
        raise HTTPException(400, "decision must be approved|rejected")
    from app.models import AdOptimizationPlan
    from app.audit.logger import audit_log
    from datetime import datetime, timezone
    plan = db.query(AdOptimizationPlan).filter_by(tenant_id=tenant_id, id=plan_id).first()
    if not plan:
        raise HTTPException(404, "plan not found")
    if plan.status not in ("REVIEWED",):
        raise HTTPException(400, "plan must be REVIEWED before approval")
    actor = str(user.get("email") or "approver")
    if plan.reviewed_by and plan.reviewed_by == actor:
        raise HTTPException(400, "Approver must be different from reviewer (4-eyes)")
    if decision == "rejected":
        plan.status = "REJECTED"
        plan.rejected_by = actor
        plan.rejected_at = datetime.now(timezone.utc)
    else:
        plan.status = "APPROVED"
        plan.approved_by = actor
        plan.approved_at = datetime.now(timezone.utc)
    plan.plan_json = dict(plan.plan_json or {})
    plan.plan_json["approve_comment"] = comment
    db.commit()
    audit_log(db, tenant_id, "ADOPT_PLAN_APPROVED", {"plan_id": plan.id, "decision": decision})
    return {"ok": True, "status": plan.status}

@app.post("/ads/optimize/plan/apply")
def apply_opt_plan(body: dict, user=Depends(require_admin), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    plan_id = int((body or {}).get("plan_id") or 0)
    dry_run = bool((body or {}).get("dry_run", True))
    from app.ads.apply import apply_plan
    try:
        plan = apply_plan(db, tenant_id=tenant_id, plan_id=plan_id, actor=str(user.get("email") or "admin"), dry_run=dry_run)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except Exception as e:
        raise HTTPException(400, str(e))
    return {"ok": True, "status": plan.status, "result": plan.apply_result_json}

@app.post("/ads/optimize/plan/rollback")
def rollback_opt_plan(body: dict, user=Depends(require_admin), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    plan_id = int((body or {}).get("plan_id") or 0)
    dry_run = bool((body or {}).get("dry_run", True))
    from app.ads.apply import rollback_plan
    try:
        plan = rollback_plan(db, tenant_id=tenant_id, plan_id=plan_id, actor=str(user.get("email") or "admin"), dry_run=dry_run)
    except Exception as e:
        raise HTTPException(400, str(e))
    return {"ok": True, "status": plan.status, "result": plan.rollback_result_json}

@app.get("/admin/ads/optimizer/ui", response_class=HTMLResponse)
def optimizer_admin_ui(user=Depends(require_admin), db: Session = Depends(get_db)):
    # Minimal admin UI for listing and one-click rollback/apply via API.
    return HTMLResponse(content="""
<!doctype html><html><head><meta charset="utf-8"/><title>Optimizer Apply (V363)</title>
<style>body{font-family:system-ui,Arial;margin:24px} input,button,select{padding:8px;margin:4px} .box{border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0}</style>
</head><body>
<h2>Ad Optimization Apply Workflow (V363)</h2>
<div class="box">
  <div>Create Plan from Run</div>
  <input id="run_id" placeholder="run_id" />
  <button onclick="createPlan()">Create</button>
  <div id="create_out"></div>
</div>

<div class="box">
  <div>Plan Actions</div>
  <input id="plan_id" placeholder="plan_id" />
  <button onclick="loadPlan()">Load</button>
  <button onclick="reviewPlan()">Review</button>
  <button onclick="approvePlan()">Approve</button>
  <button onclick="applyPlan()">Apply (dry-run)</button>
  <button onclick="rollbackPlan()">Rollback (dry-run)</button>
  <pre id="plan_out" style="white-space:pre-wrap"></pre>
</div>

<script>
async function api(path, method, body){
  const res = await fetch(path,{method, headers:{'Content-Type':'application/json','Authorization': localStorage.getItem('token')||''}, body: body?JSON.stringify(body):undefined});
  const t = await res.text(); try{return JSON.parse(t)}catch(e){return {raw:t,status:res.status}}
}
async function createPlan(){
  const run_id = parseInt(document.getElementById('run_id').value||'0');
  const out = await api('/ads/optimize/plan/from-run','POST',{run_id});
  document.getElementById('create_out').innerText = JSON.stringify(out,null,2);
}
async function loadPlan(){
  const plan_id = parseInt(document.getElementById('plan_id').value||'0');
  const out = await api('/ads/optimize/plan?plan_id='+plan_id,'GET');
  document.getElementById('plan_out').innerText = JSON.stringify(out,null,2);
}
async function reviewPlan(){
  const plan_id = parseInt(document.getElementById('plan_id').value||'0');
  const out = await api('/ads/optimize/plan/review','POST',{plan_id, decision:'reviewed'});
  await loadPlan();
}
async function approvePlan(){
  const plan_id = parseInt(document.getElementById('plan_id').value||'0');
  const out = await api('/ads/optimize/plan/approve','POST',{plan_id, decision:'approved'});
  await loadPlan();
}
async function applyPlan(){
  const plan_id = parseInt(document.getElementById('plan_id').value||'0');
  const out = await api('/ads/optimize/plan/apply','POST',{plan_id, dry_run:true});
  await loadPlan();
}
async function rollbackPlan(){
  const plan_id = parseInt(document.getElementById('plan_id').value||'0');
  const out = await api('/ads/optimize/plan/rollback','POST',{plan_id, dry_run:true});
  await loadPlan();
}
</script>
</body></html>
""")


# --- V362: UGC / Influencer revenue linkage (simple tracking-based attribution) ---
@app.post("/ugc/ingest")
def ugc_ingest(body: dict, user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    posts = body.get("posts") or []
    if not isinstance(posts, list):
        raise HTTPException(status_code=400, detail="posts must be a list")
    from app.ugc.service import ingest_posts
    return ingest_posts(db, tenant_id=tenant_id, posts=posts, actor=str(user.get("email") or "user"))

@app.get("/ugc/attribution/report")
def ugc_report(days: int = 30, user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    from app.ugc.service import attribution_report
    return attribution_report(db, tenant_id=tenant_id, days=int(days))



# --- V363: Pixel/CAPI event ingestion (optional) ---
@app.post("/events/ingest")
def ingest_pixel_events(body: dict, user=Depends(require_user), db: Session = Depends(get_db)):
    tenant_id = int(user["tenant_id"])
    events = (body or {}).get("events") or []
    source = str((body or {}).get("source") or "pixel")
    if not isinstance(events, list):
        raise HTTPException(400, "events must be a list")
    from app.events.ingest import ingest_events
    n = ingest_events(db, tenant_id=tenant_id, events=events, source=source)
    return {"ok": True, "ingested": n}

# ---------------- V368: Unified Mutation Standard + Marketplace Write + Governance ----------------

@app.post("/v368/mutations/propose")
def propose_mutation(body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    """Unified mutation proposer for META/TIKTOK/AMAZON/MARKETPLACE.

    body:
      {
        "source": "META|TIKTOK|AMAZON|MARKETPLACE",
        "kind": "BUDGET_SET|STATUS_SET|...|MP_PRODUCT_UPSERT|MP_FEED_SUBMIT",
        "payload": {...},
        "idempotency_key": "optional"
      }

    This creates:
      - ActionProposal (what to do)
      - ApprovalRequest (4-eyes: MANAGER -> LEGAL -> APPROVED)
    """
    tenant_id = int(user["tenant_id"])
    src = str(body.get("source") or "META").upper()
    kind = str(body.get("kind") or "").upper().strip()
    payload = dict(body.get("payload") or {})

    if not kind:
        raise HTTPException(400, "kind required")

    idem = body.get("idempotency_key") or secrets.token_hex(16)
    payload.setdefault("idempotency_key", idem)

    existing = db.query(ActionProposal).filter_by(tenant_id=tenant_id, idempotency_key=idem).first()
    if existing:
        return {"ok": True, "action_id": existing.id, "idempotency_key": idem, "deduped": True}

    ap = ActionProposal(tenant_id=tenant_id, kind=kind, payload={"source": src, **payload}, idempotency_key=idem)
    db.add(ap); db.commit(); db.refresh(ap)

    # Approval with SLA (default 3h)
    due = datetime.now(timezone.utc) + timedelta(minutes=int(body.get("sla_minutes") or 180))
    ar = ApprovalRequest(
        tenant_id=tenant_id,
        kind=kind,
        stage="MANAGER",
        status="PENDING",
        sla_due_at=due,
        payload={"action_id": ap.id, "source": src},
    )
    db.add(ar); db.commit(); db.refresh(ar)

    return {"ok": True, "action_id": ap.id, "approval_id": ar.id, "idempotency_key": idem}


@app.post("/v368/marketplace/product_upsert")
def marketplace_product_upsert(body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    """Convenience wrapper: propose MP_PRODUCT_UPSERT with hot-plug spec."""
    return propose_mutation({
        "source": "MARKETPLACE",
        "kind": "MP_PRODUCT_UPSERT",
        "payload": body,
        "idempotency_key": body.get("idempotency_key"),
    }, db=db, user=user)


@app.post("/v368/marketplace/feed_submit")
def marketplace_feed_submit(body: dict, db: Session = Depends(get_db), user=Depends(require_user)):
    """Convenience wrapper: propose MP_FEED_SUBMIT with hot-plug spec."""
    return propose_mutation({
        "source": "MARKETPLACE",
        "kind": "MP_FEED_SUBMIT",
        "payload": body,
        "idempotency_key": body.get("idempotency_key"),
    }, db=db, user=user)


@app.get("/v368/governance/templates")
def governance_templates():
    from app.governance.policy import load_templates
    return load_templates()


@app.post("/v368/governance/apply")
def governance_apply(body: dict):
    """Apply governance masking + show retention decision for a sample record.

    body:
      {
        "country": "KR|US|EU",
        "channel": "META|TIKTOK|AMAZON|...",
        "data_type": "order|review|marketing_metric|...",
        "record": {...}
      }
    """
    from app.governance.policy import load_templates, merge_policy, apply_masking, retention_days

    templates = load_templates()
    pol = merge_policy(templates, country=body.get("country"), channel=body.get("channel"))
    rec = body.get("record") or {}
    masked = apply_masking(rec, pol)

    dt = str(body.get("data_type") or "order")
    return {
        "ok": True,
        "effective_policy": pol,
        "retention_days": retention_days(pol, dt),
        "masked_record": masked,
    }
