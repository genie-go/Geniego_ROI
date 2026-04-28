from __future__ import annotations
from app.core.db import engine, Base
from app.models.entities import Approval, AuditLog, CampaignDailySnapshot  # noqa: F401
from app.models.outbox import OutboxEvent  # noqa: F401

def init_db():
    Base.metadata.create_all(bind=engine)
