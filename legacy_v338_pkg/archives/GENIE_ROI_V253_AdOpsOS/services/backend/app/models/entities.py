from __future__ import annotations
import uuid, time
from sqlalchemy import String, Float, Integer, Text, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

def _uuid() -> str:
    return str(uuid.uuid4())

class Approval(Base):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String, index=True)
    job_type: Mapped[str] = mapped_column(String, index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, index=True, default="APPROVED")
    created_at: Mapped[float] = mapped_column(Float, default=lambda: time.time())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String, index=True)
    job_id: Mapped[str] = mapped_column(String, index=True)
    status: Mapped[str] = mapped_column(String, index=True)
    message: Mapped[str] = mapped_column(Text)
    meta_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[float] = mapped_column(Float, default=lambda: time.time())

class CampaignDailySnapshot(Base):
    __tablename__ = "campaign_daily_snapshots"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String, index=True)
    channel: Mapped[str] = mapped_column(String, index=True)  # google/meta/tiktok/naver/kakao
    account_id: Mapped[str] = mapped_column(String, index=True)
    campaign_id: Mapped[str] = mapped_column(String, index=True)
    day: Mapped[str] = mapped_column(String, index=True)  # YYYY-MM-DD
    spend: Mapped[float] = mapped_column(Float, default=0.0)
    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    conversions: Mapped[int] = mapped_column(Integer, default=0)
    roas: Mapped[float] = mapped_column(Float, default=0.0)

Index("idx_snapshots_tenant_day", CampaignDailySnapshot.tenant_id, CampaignDailySnapshot.day)
