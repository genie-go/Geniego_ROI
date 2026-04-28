from dataclasses import dataclass
from sqlalchemy.orm import Session
from .models import PolicyConfig
from .config import settings

@dataclass
class PolicyDecision:
    auto_approve: bool
    require_finance: bool
    reason: str

def _cfg(db: Session, tenant_id: str) -> PolicyConfig:
    row = db.query(PolicyConfig).filter(PolicyConfig.tenant_id==tenant_id).first()
    if row is None:
        row = PolicyConfig(
            tenant_id=tenant_id,
            auto_approve_max_abs=settings.policy_auto_approve_max_abs,
            auto_approve_max_pct=settings.policy_auto_approve_max_pct,
            require_finance_abs=settings.policy_require_finance_abs,
            require_finance_pct=settings.policy_require_finance_pct,
        )
        db.add(row); db.commit()
    return row

def decide(db: Session, tenant_id: str, current_budget: float, new_budget: float) -> PolicyDecision:
    c = _cfg(db, tenant_id)
    delta_abs = abs(new_budget - current_budget)
    delta_pct = 0.0 if current_budget <= 0 else (delta_abs / current_budget) * 100.0
    if delta_abs >= c.require_finance_abs or delta_pct >= c.require_finance_pct:
        return PolicyDecision(False, True, f"Requires finance: Δabs={delta_abs:.2f}, Δ%={delta_pct:.1f}%")
    if delta_abs <= c.auto_approve_max_abs and delta_pct <= c.auto_approve_max_pct:
        return PolicyDecision(True, False, f"Auto-approved: Δabs={delta_abs:.2f}, Δ%={delta_pct:.1f}%")
    return PolicyDecision(False, False, f"Manual approval: Δabs={delta_abs:.2f}, Δ%={delta_pct:.1f}%")
