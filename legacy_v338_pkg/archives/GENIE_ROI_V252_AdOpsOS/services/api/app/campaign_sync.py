from __future__ import annotations
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from .models import Campaign
from .connectors.registry import get_connector
from .observability import metric

def _normalize_status(status: str) -> bool:
    s = (status or "").upper()
    return s not in {"PAUSED", "REMOVED", "DELETED", "DISABLED"}

def sync_external_campaigns(
    db: Session,
    *,
    tenant_id: str,
    provider: str,
    externals: List[Dict[str, Any]],
    channel_label: str | None = None,
) -> Tuple[int,int,int]:
    """Idempotent upsert: external campaigns -> internal Campaign rows.
    Returns (created, updated, deactivated).
    """
    created = updated = deactivated = 0
    channel = channel_label or provider.lower()

    # Build lookup of existing by external_id
    existing = db.query(Campaign).filter(Campaign.tenant_id==tenant_id, Campaign.channel==channel).all()
    by_ext = {c.external_id: c for c in existing if c.external_id}

    seen = set()
    for e in externals:
        ext_id = str(e.get("external_id") or e.get("id") or "").strip()
        if not ext_id:
            continue
        seen.add(ext_id)
        name = (e.get("name") or "").strip() or f"{channel}:{ext_id}"
        daily_budget = float(e.get("daily_budget") or 0.0)
        spend = float(e.get("spend_7d") or e.get("spend") or 0.0)
        revenue = float(e.get("revenue_7d") or e.get("revenue") or 0.0)
        active = _normalize_status(str(e.get("status") or "ENABLED"))

        if ext_id in by_ext:
            c = by_ext[ext_id]
            changed = False
            if c.name != name:
                c.name = name; changed=True
            if c.daily_budget != daily_budget:
                c.daily_budget = daily_budget; changed=True
            if c.spend != spend:
                c.spend = spend; changed=True
            if c.revenue != revenue:
                c.revenue = revenue; changed=True
            if c.active != active:
                c.active = active; changed=True
            if changed:
                updated += 1
        else:
            c = Campaign(
                tenant_id=tenant_id,
                name=name,
                channel=channel,
                external_id=ext_id,
                spend=spend,
                revenue=revenue,
                daily_budget=daily_budget,
                active=active,
            )
            db.add(c)
            created += 1

    # Deactivate internal campaigns that no longer exist externally (soft-delete behavior)
    for c in existing:
        if c.external_id and c.external_id not in seen and c.active:
            c.active = False
            deactivated += 1

    db.commit()
    metric("campaign_sync_created_total", created, {"tenant": tenant_id, "provider": provider})
    metric("campaign_sync_updated_total", updated, {"tenant": tenant_id, "provider": provider})
    metric("campaign_sync_deactivated_total", deactivated, {"tenant": tenant_id, "provider": provider})
    return created, updated, deactivated

async def fetch_and_sync(
    db: Session,
    *,
    tenant_id: str,
    provider: str,
    auth: Dict[str, Any],
    account_id: str | None = None
) -> Tuple[int,int,int,int]:
    """Fetch external campaign list via connector then sync into DB.
    Returns (fetched, created, updated, deactivated).
    """
    connector = get_connector(provider)
    campaigns = await connector.list_campaigns(tenant_id, auth, account_id=account_id)
    externals = [c.__dict__ for c in campaigns]
    created, updated, deactivated = sync_external_campaigns(
        db,
        tenant_id=tenant_id,
        provider=provider,
        externals=externals,
        channel_label=provider.lower(),
    )
    return len(externals), created, updated, deactivated
