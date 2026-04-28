from __future__ import annotations
from fastapi import APIRouter
from typing import Dict

from app.ai.execution_planner import build_safe_plan
from app.ai.kpi_forecasting_v2 import kpi_pack_forecast_v2
from app.ai.federated_learning_v2 import ModelUpdate, fedavg_secure

router = APIRouter(prefix="/v251", tags=["v251"])

@router.post("/execution/plan/budget")
def execution_plan(body: Dict):
    # body: {channel, account_id, payload, policy}
    channel = body.get("channel","google")
    account_id = body.get("account_id","acc")
    payload = body.get("payload", {})
    policy = body.get("policy", {"max_change_pct": 30})
    plan = build_safe_plan(channel, account_id, payload, policy)
    return {
        "plan": {
            "channel": plan.channel,
            "account_id": plan.account_id,
            "steps": [s.__dict__ for s in plan.steps],
            "safety": plan.safety,
        }
    }

@router.post("/ai/forecast/kpi/v2")
def forecast_kpis_v2(body: Dict):
    horizon = int(body.get("horizon_days", 7))
    start_weekday = int(body.get("start_weekday", 0))
    kpi = body.get("kpi", {})
    calendar = body.get("calendar", None)
    return {"horizon_days": horizon, "forecast": kpi_pack_forecast_v2(kpi, horizon_days=horizon, start_weekday=start_weekday, calendar=calendar)}

@router.post("/ai/federated/fedavg_secure")
def federated_fedavg_secure(body: Dict):
    updates = body.get("updates", [])
    dp_enabled = bool(body.get("dp_enabled", False))
    dp_sigma = float(body.get("dp_sigma", 0.01))
    parsed = [ModelUpdate(tenant_id=u["tenant_id"], weights=u["weights"], num_samples=int(u["num_samples"])) for u in updates]
    return fedavg_secure(parsed, dp_enabled=dp_enabled, dp_sigma=dp_sigma)
