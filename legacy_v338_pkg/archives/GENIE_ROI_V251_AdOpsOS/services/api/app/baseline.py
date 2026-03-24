from __future__ import annotations
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from .models import Campaign, CampaignDailySnapshot
from .observability import metric

@dataclass
class Anomaly:
    code: str
    severity: str  # LOW/MEDIUM/HIGH
    message: str
    campaign_id: str | None = None

def _safe_roas(revenue: float, spend: float) -> float:
    if spend <= 0:
        return 0.0
    return float(revenue) / float(spend)

def snapshot_today(db: Session, tenant_id: str, *, day: date | None = None) -> int:
    """Store today's metrics snapshot per campaign (idempotent by day/campaign)."""
    day = day or date.today()
    q = db.execute(select(Campaign).where(Campaign.tenant_id == tenant_id))
    campaigns = list(q.scalars().all())
    written = 0
    for c in campaigns:
        spend = float(c.spend or 0.0)
        revenue = float(c.revenue or 0.0)
        conv = float(c.conversions or 0.0)
        roas = _safe_roas(revenue, spend)
        snap = db.execute(
            select(CampaignDailySnapshot).where(
                CampaignDailySnapshot.tenant_id == tenant_id,
                CampaignDailySnapshot.day == day,
                CampaignDailySnapshot.campaign_id == c.id,
            )
        ).scalar_one_or_none()
        if snap is None:
            snap = CampaignDailySnapshot(
                tenant_id=tenant_id, day=day, campaign_id=c.id,
                spend=spend, revenue=revenue, conversions=conv, roas=roas
            )
            db.add(snap)
            written += 1
        else:
            # update to reflect latest
            snap.spend = spend
            snap.revenue = revenue
            snap.conversions = conv
            snap.roas = roas
    db.commit()
    metric("snapshots_written_total", written, {"tenant": tenant_id})
    return written

def roas_anomalies(db: Session, tenant_id: str, *, day: date | None = None, lookback_days: int = 14) -> List[Anomaly]:
    """Detect ROAS anomalies using a simple baseline:
    - Compare today's ROAS to trailing 7-day mean of previous days (excluding today).
    - Flag if drop >= 30% AND today's spend >= minimal threshold.
    """
    day = day or date.today()
    start = day - timedelta(days=lookback_days)
    # gather snapshots per campaign
    snaps = db.execute(
        select(CampaignDailySnapshot).where(
            CampaignDailySnapshot.tenant_id == tenant_id,
            CampaignDailySnapshot.day >= start,
            CampaignDailySnapshot.day <= day,
        )
    ).scalars().all()

    by_campaign: Dict[str, List[CampaignDailySnapshot]] = {}
    for s in snaps:
        by_campaign.setdefault(s.campaign_id, []).append(s)

    anomalies: List[Anomaly] = []
    for cid, rows in by_campaign.items():
        rows.sort(key=lambda r: r.day)
        today_rows = [r for r in rows if r.day == day]
        if not today_rows:
            continue
        t = today_rows[-1]
        if (t.spend or 0.0) < 10.0:
            continue  # ignore low-spend noise

        prev = [r for r in rows if r.day < day][-7:]
        if len(prev) < 3:
            continue
        mean = sum(float(r.roas or 0.0) for r in prev) / max(1, len(prev))
        if mean <= 0:
            continue
        drop = (mean - float(t.roas or 0.0)) / mean
        if drop >= 0.30:
            anomalies.append(Anomaly(
                code="ROAS_ANOMALY_DROP",
                severity="HIGH" if drop >= 0.5 else "MEDIUM",
                message=f"Campaign {cid} ROAS dropped {drop*100:.1f}% vs trailing mean ({mean:.2f} -> {float(t.roas or 0.0):.2f})",
                campaign_id=cid
            ))
    metric("roas_anomalies_total", len(anomalies), {"tenant": tenant_id})
    return anomalies
