import json
from sqlalchemy.orm import Session
from .models import OutboxEvent
from .kafka_pub import publish
from .config import settings

def emit_outbox(db: Session, tenant_id: str, kind: str, idempotency_key: str, payload: dict):
    ev = OutboxEvent(tenant_id=tenant_id, kind=kind, idempotency_key=idempotency_key, payload_json=json.dumps(payload), status="NEW")
    db.add(ev); db.commit()
    return ev

def publish_outbox(db: Session, tenant_id: str, limit: int = 100):
    rows = db.query(OutboxEvent).filter(OutboxEvent.tenant_id==tenant_id, OutboxEvent.status=="NEW").order_by(OutboxEvent.id.asc()).limit(limit).all()
    published = 0
    for r in rows:
        payload = json.loads(r.payload_json or "{}")
        publish(settings.kafka_topic, r.kind, tenant_id, r.idempotency_key, payload)
        r.status = "PUBLISHED"
        db.add(r); db.commit()
        published += 1
    return {"published": published}
