from __future__ import annotations
import uuid, time
from sqlalchemy import String, Float, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

def _uuid() -> str:
    return str(uuid.uuid4())

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String, index=True)
    topic: Mapped[str] = mapped_column(String, index=True, default="genie.outbox")
    payload_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, index=True, default="PENDING")  # PENDING|SENT|FAILED
    created_at: Mapped[float] = mapped_column(Float, default=lambda: time.time())

Index("idx_outbox_tenant_status", OutboxEvent.tenant_id, OutboxEvent.status)
