from sqlalchemy import String, Integer, Text, DateTime, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

class JobQueue(Base):
    __tablename__ = "job_queue"
    __table_args__ = (UniqueConstraint("tenant_id", "idempotency_key", name="uq_job_tenant_idempotency"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(128), index=True)
    kind: Mapped[str] = mapped_column(String(64))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="QUEUED")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
