from __future__ import annotations
import json, time
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_ctx, require
from app.core.kafka import publish
from app.models.outbox import OutboxEvent

router = APIRouter(prefix="/v245", tags=["v245"])

@router.post("/outbox/publish")
def publish_pending_outbox(db: Session = Depends(get_db), ctx=Depends(get_ctx)):
    """Publishes pending outbox events to Kafka.
    In production this runs as a background scheduler/cron.
    """
    tenant, role = ctx
    require(role, "execute")
    rows = db.query(OutboxEvent).filter(OutboxEvent.tenant_id==tenant, OutboxEvent.status=="PENDING").order_by(OutboxEvent.created_at.asc()).limit(200).all()
    sent = 0
    for r in rows:
        try:
            payload = json.loads(r.payload_json)
            publish(r.topic, payload)
            r.status = "SENT"
            sent += 1
        except Exception:
            r.status = "FAILED"
    db.commit()
    return {"tenant_id": tenant, "sent": sent, "remaining_pending": db.query(OutboxEvent).filter(OutboxEvent.tenant_id==tenant, OutboxEvent.status=="PENDING").count()}
