from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple
import re
from sqlalchemy.orm import Session
from .models import Campaign
from .observability import metric
from .baseline import snapshot_today, roas_anomalies

@dataclass
class Issue:
    code: str
    severity: str  # LOW/MEDIUM/HIGH
    message: str

def _roas(c: Campaign) -> float:
    if (c.spend or 0.0) <= 0.0:
        return 0.0
    return float(c.revenue or 0.0) / float(c.spend or 1.0)

def naming_rule_violations(campaigns: List[Campaign], regex: str) -> List[Issue]:
    pat = re.compile(regex)
    issues: List[Issue] = []
    for c in campaigns:
        if not pat.search(c.name or ""):
            issues.append(Issue("NAMING_RULE_VIOLATION","MEDIUM", f"Campaign {c.id} '{c.name}' violates naming rule"))
    return issues

def structure_score(campaigns: List[Campaign]) -> Tuple[int, List[Issue]]:
    """Rule-based campaign structure scoring (0-100).
    This is deterministic, explainable, and safe by default.
    """
    if not campaigns:
        return 0, [Issue("NO_CAMPAIGNS","HIGH","No campaigns found")]
    score = 100
    issues: List[Issue] = []

    # Penalize too many empty external IDs (indicates manual entries)
    missing_ext = sum(1 for c in campaigns if not (c.external_id or "").strip())
    if missing_ext:
        penalty = min(20, missing_ext * 2)
        score -= penalty
        issues.append(Issue("MISSING_EXTERNAL_ID","LOW", f"{missing_ext} campaigns missing external_id (penalty {penalty})"))

    # Penalize naming entropy: too many duplicates / too short
    short = sum(1 for c in campaigns if len((c.name or '').strip()) < 6)
    if short:
        penalty = min(15, short * 3)
        score -= penalty
        issues.append(Issue("SHORT_NAMES","MEDIUM", f"{short} campaigns have very short names (penalty {penalty})"))

    # Budget distribution risk
    budgets = [float(c.daily_budget or 0.0) for c in campaigns if c.active]
    total = sum(budgets) or 0.0
    if total > 0:
        top = sorted(budgets, reverse=True)[:max(1, int(len(budgets)*0.2))]
        share = sum(top) / total
        if share >= 0.7 and len(budgets) >= 5:
            score -= 10
            issues.append(Issue("BUDGET_CONCENTRATION","HIGH", f"Top 20% campaigns consume {share*100:.1f}% of daily budget"))

    # Underperformers share
    under = [c for c in campaigns if c.active and (c.spend or 0.0) > 0 and _roas(c) < 0.7]
    if len(under) / max(1, len([c for c in campaigns if c.active])) > 0.3:
        score -= 10
        issues.append(Issue("MANY_UNDERPERFORMERS","MEDIUM", f"{len(under)} active campaigns have low ROAS"))

    score = max(0, min(100, score))
    return score, issues

def detect_anomalies(campaigns: List[Campaign], *, target_roas: float = 1.0) -> List[Issue]:
    """Heuristic anomaly detection using current snapshot.
    In production you would use time-series baselines (7/14/28d) and robust stats.
    """
    issues: List[Issue] = []
    for c in campaigns:
        if not c.active:
            continue
        roas = _roas(c)
        if (c.spend or 0.0) > 0 and roas < target_roas * 0.6:
            issues.append(Issue("ROAS_DROP","HIGH", f"Campaign {c.id} ROAS {roas:.2f} below {target_roas*0.6:.2f}"))
        if (c.daily_budget or 0.0) > 0 and (c.spend or 0.0) > (c.daily_budget or 0.0) * 2:
            issues.append(Issue("SPEND_SPIKE","MEDIUM", f"Campaign {c.id} spend unusually high vs budget"))
    return issues

def evaluate_tenant(
    db: Session,
    *,
    tenant_id: str,
    channel: str | None = None,
    naming_regex: str | None = None,
    target_roas: float = 1.0
) -> Dict[str, Any]:
    q = db.query(Campaign).filter(Campaign.tenant_id==tenant_id)
    if channel:
        q = q.filter(Campaign.channel==channel)
    campaigns = q.all()

    # V240: persist daily snapshots + baseline anomaly detection
    anomalies = []
    try:
        snapshot_today(db, tenant_id)
        anomalies = roas_anomalies(db, tenant_id)
    except Exception:
        anomalies = []

    score, issues = structure_score(campaigns)
    if naming_regex:
        issues.extend(naming_rule_violations(campaigns, naming_regex))
    issues.extend(detect_anomalies(campaigns, target_roas=target_roas))
    # Convert baseline anomalies to issues
    for a in anomalies:
        issues.append(Issue(a.code, a.severity, a.message))

    metric("tenant_structure_score", score, {"tenant": tenant_id, "channel": channel or "all"})
    return {
        "tenant_id": tenant_id,
        "anomalies": [a.__dict__ for a in anomalies],
        "channel": channel or "all",
        "score": score,
        "issues": [i.__dict__ for i in issues],
        "campaign_count": len(campaigns),
    }
