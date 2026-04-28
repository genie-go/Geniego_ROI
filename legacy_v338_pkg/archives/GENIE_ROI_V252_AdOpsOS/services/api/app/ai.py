from __future__ import annotations
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .models import Campaign
from .strategic import _roas
from .observability import metric

def recommend_budget_reallocation(
    campaigns: List[Campaign],
    *,
    total_budget: float | None = None,
    target_roas: float = 1.0,
) -> List[Dict[str, Any]]:
    """Explainable recommendation engine (safe heuristic).
    - Reallocate budget from bottom quartile ROAS campaigns to top quartile.
    - Does NOT apply changes automatically; only produces recommendations.
    """
    actives = [c for c in campaigns if c.active]
    if not actives:
        return []

    if total_budget is None:
        total_budget = sum(float(c.daily_budget or 0.0) for c in actives) or 0.0

    scored = [(c, _roas(c)) for c in actives]
    scored.sort(key=lambda x: x[1])
    n = len(scored)
    q = max(1, n // 4)
    bottom = scored[:q]
    top = scored[-q:]

    give = min(0.2, 0.05 * q)  # donate up to 20% collectively from bottom
    donate_total = sum(float(c.daily_budget or 0.0) for c,_ in bottom) * give
    if donate_total <= 0:
        return []

    per_top = donate_total / max(1, len(top))
    recs: List[Dict[str, Any]] = []

    for c,r in bottom:
        cut = float(c.daily_budget or 0.0) * give
        if cut <= 0:
            continue
        recs.append({
            "action": "DECREASE_BUDGET",
            "campaign_id": c.id,
            "campaign_name": c.name,
            "from": float(c.daily_budget or 0.0),
            "to": max(float(c.min_budget or 0.0), float(c.daily_budget or 0.0) - cut),
            "reason": f"Low ROAS ({r:.2f}) relative to target {target_roas:.2f}",
            "confidence": 0.65,
        })

    for c,r in top:
        inc = per_top
        recs.append({
            "action": "INCREASE_BUDGET",
            "campaign_id": c.id,
            "campaign_name": c.name,
            "from": float(c.daily_budget or 0.0),
            "to": min(float(c.max_budget or 0.0), float(c.daily_budget or 0.0) + inc),
            "reason": f"High ROAS ({r:.2f}) with headroom; reallocate budget",
            "confidence": 0.65,
        })

    return recs

def recommend_pause_candidates(
    campaigns: List[Campaign],
    *,
    target_roas: float = 1.0,
    min_spend: float = 100.0
) -> List[Dict[str, Any]]:
    recs: List[Dict[str, Any]] = []
    for c in campaigns:
        if not c.active:
            continue
        roas = _roas(c)
        if (c.spend or 0.0) >= min_spend and roas < target_roas * 0.6:
            recs.append({
                "action": "SUGGEST_PAUSE",
                "campaign_id": c.id,
                "campaign_name": c.name,
                "reason": f"Spend {c.spend:.2f} with low ROAS {roas:.2f} (< {target_roas*0.6:.2f})",
                "confidence": 0.70,
            })
    return recs

def generate_recommendations(db: Session, *, tenant_id: str, channel: str | None=None, total_budget: float|None=None, target_roas: float=1.0) -> Dict[str, Any]:
    q = db.query(Campaign).filter(Campaign.tenant_id==tenant_id)
    if channel:
        q = q.filter(Campaign.channel==channel)
    campaigns = q.all()
    budget = recommend_budget_reallocation(campaigns, total_budget=total_budget, target_roas=target_roas)
    pause = recommend_pause_candidates(campaigns, target_roas=target_roas)
    metric("ai_recommendations_total", len(budget)+len(pause), {"tenant": tenant_id, "channel": channel or "all"})
    return {"tenant_id": tenant_id, "channel": channel or "all", "budget_reallocation": budget, "pause_candidates": pause}
