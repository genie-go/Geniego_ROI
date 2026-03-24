from sqlalchemy import String, DateTime, Float, Integer, ForeignKey, Text, func, UniqueConstraint, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Campaign(Base):
    __tablename__ = "campaigns"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel: Mapped[str] = mapped_column(String(64), nullable=False)
    external_id: Mapped[str] = mapped_column(String(255), default="")
    spend: Mapped[float] = mapped_column(Float, default=0.0)
    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    daily_budget: Mapped[float] = mapped_column(Float, default=0.0)
    min_budget: Mapped[float] = mapped_column(Float, default=10.0)
    max_budget: Mapped[float] = mapped_column(Float, default=50000.0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class GoogleBudgetMapping(Base):
    __tablename__ = "google_budget_mappings"
    __table_args__ = (UniqueConstraint("tenant_id","campaign_id", name="uq_google_budget_map"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, index=True)
    budget_resource_name: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ExperimentResult(Base):
    __tablename__ = "experiment_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, index=True)
    lift: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, index=True)
    requested_budget: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    policy_reason: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    kind: Mapped[str] = mapped_column(String(64))
    idempotency_key: Mapped[str] = mapped_column(String(128), index=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="NEW")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class PolicyConfig(Base):
    __tablename__ = "policy_config"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_policy_tenant"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    auto_approve_max_abs: Mapped[float] = mapped_column(Float, default=200.0)
    auto_approve_max_pct: Mapped[float] = mapped_column(Float, default=10.0)
    require_finance_abs: Mapped[float] = mapped_column(Float, default=500.0)
    require_finance_pct: Mapped[float] = mapped_column(Float, default=25.0)

class SecretRef(Base):
    __tablename__ = "secret_refs"
    __table_args__ = (UniqueConstraint("tenant_id","provider", name="uq_secretref_tenant_provider"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    secret_json: Mapped[str] = mapped_column(Text, default="{}")

class OAuthState(Base):
    __tablename__ = "oauth_states"
    __table_args__ = (UniqueConstraint("tenant_id","provider","state", name="uq_oauth_state"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(128), index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

class DlqOffset(Base):
    __tablename__ = "dlq_offsets"
    __table_args__ = (UniqueConstraint("tenant_id","partition", name="uq_dlq_tenant_partition"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    partition: Mapped[int] = mapped_column(Integer, default=0)
    last_offset: Mapped[int] = mapped_column(Integer, default=0)

class TokenAuditLog(Base):
    __tablename__ = "token_audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    provider: Mapped[str] = mapped_column(String(32), index=True)
    result: Mapped[str] = mapped_column(String(32), index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CampaignDailySnapshot(Base):
    __tablename__ = "campaign_daily_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    day = Column(Date, index=True, nullable=False)
    campaign_id = Column(String, index=True, nullable=False)

    spend = Column(Float, default=0.0)
    revenue = Column(Float, default=0.0)
    conversions = Column(Float, default=0.0)
    roas = Column(Float, default=0.0)

    __table_args__ = (
        UniqueConstraint("tenant_id", "day", "campaign_id", name="uq_snapshot_day_campaign"),
    )
