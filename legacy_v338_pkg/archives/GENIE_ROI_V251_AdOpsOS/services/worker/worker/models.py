from sqlalchemy import String, Integer, Float, Text, DateTime, func, UniqueConstraint
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

class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    channel: Mapped[str] = mapped_column(String(64))
    external_id: Mapped[str] = mapped_column(String(255), default="")
    daily_budget: Mapped[float] = mapped_column(Float, default=0.0)

class GoogleBudgetMapping(Base):
    __tablename__ = "google_budget_mappings"
    __table_args__ = (UniqueConstraint("tenant_id","campaign_id", name="uq_google_budget_map"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, index=True)
    budget_resource_name: Mapped[str] = mapped_column(String(255), nullable=False)

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, index=True)
    requested_budget: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING")

class SecretRef(Base):
    __tablename__ = "secret_refs"
    __table_args__ = (UniqueConstraint("tenant_id","provider", name="uq_secretref_tenant_provider"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    secret_json: Mapped[str] = mapped_column(Text, default="{}")
