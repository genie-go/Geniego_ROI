from __future__ import annotations
import json, time
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_ctx, require
from app.core.init_db import init_db
from app.models.entities import Approval, AuditLog, CampaignDailySnapshot
from app.models.outbox import OutboxEvent
from app.connectors import get_all_connectors
from app.ai.anomaly import roas_anomaly_isoforest
from app.ai.optimizer import marginal_roas_optimizer

router = APIRouter(prefix="/v244", tags=["v244"])
init_db()

@router.get("/connectors")
def connectors(ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    return {"tenant_id": tenant, "connectors": [c.channel for c in get_all_connectors()]}

@router.get("/campaigns/{channel}/{account_id}")
def list_campaigns(channel: str, account_id: str, ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    for c in get_all_connectors():
        if c.channel == channel:
            data = c.list_campaigns(account_id)
            return {"tenant_id": tenant, "channel": channel, "campaigns": [d.__dict__ for d in data]}
    return {"tenant_id": tenant, "channel": channel, "campaigns": []}

@router.post("/approvals")
def create_approval(body: Dict[str, Any], db: Session = Depends(get_db), ctx=Depends(get_ctx)):
    """Create an approval and enqueue an execution event (outbox).
    body:
      { job_type, payload }
    job_type examples:
      - UPDATE_DAILY_BUDGET
    payload examples:
      { channel, account_id, campaign_id, current_budget, new_budget }
    """
    tenant, role = ctx
    require(role, "approve")
    job_type = body.get("job_type","")
    payload = body.get("payload",{})
    a = Approval(tenant_id=tenant, job_type=job_type, payload_json=json.dumps(payload), status="APPROVED")
    db.add(a); db.commit()

    # Outbox event for worker
    event = {
        "tenant_id": tenant,
        "job_id": a.id,
        "job_type": job_type,
        "payload": payload,
        "created_at": time.time(),
    }
    o = OutboxEvent(tenant_id=tenant, topic="genie.outbox", payload_json=json.dumps(event), status="PENDING")
    db.add(o); db.commit()

    return {"approved": True, "job_id": a.id, "tenant_id": tenant, "outbox_event_id": o.id}

@router.get("/audit")
def audit(db: Session = Depends(get_db), ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    rows = db.query(AuditLog).filter(AuditLog.tenant_id==tenant).order_by(AuditLog.created_at.desc()).limit(200).all()
    return {"tenant_id": tenant, "logs": [{"id":r.id,"job_id":r.job_id,"status":r.status,"message":r.message,"created_at":r.created_at} for r in rows]}

@router.post("/ai/anomaly/roas")
def detect_roas_anomaly(body: Dict[str, Any], ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    roas = body.get("roas_series", [])
    res = roas_anomaly_isoforest(roas_series=[float(x) for x in roas])
    return {"tenant_id": tenant, "result": {"is_anomaly": res.is_anomaly, "score": res.score, "reason": res.reason}}

@router.post("/ai/optimize/budget")
def optimize_budget(body: Dict[str, Any], ctx=Depends(get_ctx)):
    tenant, role = ctx
    require(role, "view")
    campaigns = body.get("campaigns", [])
    total_delta = float(body.get("total_delta", 0.0))
    recs = marginal_roas_optimizer(campaigns, total_delta)
    return {"tenant_id": tenant, "recommendations": [r.__dict__ for r in recs]}
