from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class PolicyResult:
    allowed: bool
    reason: str

def evaluate_budget_policy(payload: Dict[str, Any], tenant_policy: Dict[str, Any]) -> PolicyResult:
    max_pct = float(tenant_policy.get("max_change_pct", 30))
    current = float(payload.get("current_budget", 0))
    new = float(payload.get("new_budget", 0))

    if current > 0:
        pct = abs(new - current) / current * 100
        if pct > max_pct:
            return PolicyResult(False, f"Change {pct:.2f}% exceeds tenant limit {max_pct}%")
    return PolicyResult(True, "Policy OK")
