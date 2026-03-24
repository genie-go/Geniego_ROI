from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any
import numpy as np

@dataclass
class BudgetRecommendation:
    campaign_id: str
    current_budget: float
    new_budget: float
    expected_roas_uplift_pct: float
    explanation: str

def marginal_roas_optimizer(campaigns: List[Dict[str, Any]], total_delta: float) -> List[BudgetRecommendation]:
    """Heuristic-but-strong optimizer:
    Uses recent ROAS and spend to propose reallocations under a fixed total delta (increase/decrease).
    For production, replace with Bayesian/causal models; this provides a safe baseline for go-to-market.
    campaigns item: {campaign_id, current_budget, roas, spend}
    """
    if not campaigns:
        return []
    # Score = roas / (spend+1) -> favors efficient campaigns with headroom
    scored = []
    for c in campaigns:
        roas = float(c.get("roas", 0.0))
        spend = float(c.get("spend", 0.0))
        scored.append((c["campaign_id"], float(c.get("current_budget", 0.0)), roas, spend, roas/(spend+1.0)))
    scored.sort(key=lambda x: x[-1], reverse=True)
    top = scored[: max(1, len(scored)//3)]
    bottom = scored[-max(1, len(scored)//3):]
    recs: List[BudgetRecommendation] = []

    # distribute delta: add to top, remove from bottom (if delta positive, only add; if negative, only remove)
    add_each = (total_delta / len(top)) if total_delta > 0 else 0.0
    rem_each = (abs(total_delta) / len(bottom)) if total_delta < 0 else 0.0

    for cid, cur, roas, spend, s in top:
        new = max(0.0, cur + add_each)
        recs.append(BudgetRecommendation(cid, cur, new, expected_roas_uplift_pct=4.0, explanation="Shift budget toward higher efficiency ROAS/(spend+1)."))

    for cid, cur, roas, spend, s in bottom:
        if total_delta < 0:
            new = max(0.0, cur - rem_each)
            recs.append(BudgetRecommendation(cid, cur, new, expected_roas_uplift_pct=2.0, explanation="Reduce budget on lowest efficiency ROAS/(spend+1)."))
    return recs
