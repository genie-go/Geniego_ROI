from __future__ import annotations

import os
from typing import Dict, Any, Tuple
import yaml

from .job_types import UPDATE_CAMPAIGN_BUDGET
from services.google_budget_executor import GoogleBudgetExecutor, BudgetUpdateRequest


def _load_guardrails() -> Dict[str, Any]:
    with open("config/risk_thresholds.yaml", "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data


def _env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None or v == "":
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


def execute_job(job_type: str, payload: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
    """Executes an approved job with guardrails. Returns (ok, message, meta)."""

    auto_execute = _env_bool("AUTO_EXECUTE", False)
    dry_run = _env_bool("DRY_RUN", True)
    auth_mode = os.getenv("AUTH_MODE", "stub").strip().lower()

    guardrails = _load_guardrails().get("budget_change", {})
    max_change_pct = float(guardrails.get("max_change_pct", 25))
    min_budget = float(guardrails.get("min_budget", 0))
    max_budget = float(guardrails.get("max_budget", 1e18))

    if job_type == UPDATE_CAMPAIGN_BUDGET:
        # Payload contract:
        # { customer_id, campaign_id, current_daily_budget, new_daily_budget }
        customer_id = str(payload.get("customer_id", "")).replace("-", "")
        campaign_id = str(payload.get("campaign_id", ""))
        cur = float(payload.get("current_daily_budget", 0))
        new = float(payload.get("new_daily_budget", 0))

        if not auto_execute:
            return False, "AUTO_EXECUTE is false (execution blocked)", {"job_type": job_type}

        if new < min_budget or new > max_budget:
            return False, "New budget violates min/max guardrails", {"new_daily_budget": new}

        # guardrail: pct change
        if cur > 0:
            pct = abs(new - cur) / cur * 100.0
            if pct > max_change_pct:
                return False, "Budget change exceeds max_change_pct guardrail", {"pct_change": pct, "max_change_pct": max_change_pct}

        # Execution path
        if dry_run or auth_mode != "real":
            return True, "DRY_RUN or non-real mode: simulated budget update", {
                "customer_id": customer_id,
                "campaign_id": campaign_id,
                "current_daily_budget": cur,
                "new_daily_budget": new,
                "dry_run": dry_run,
                "auth_mode": auth_mode,
            }

        executor = GoogleBudgetExecutor()
        ok, msg, meta = executor.update_campaign_budget(BudgetUpdateRequest(
            customer_id=customer_id,
            campaign_id=campaign_id,
            new_daily_budget=new,
        ))
        return ok, msg, meta

    return False, "Unknown job type", {"job_type": job_type}
