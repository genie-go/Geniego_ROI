from __future__ import annotations
from fastapi import APIRouter
from typing import Dict, List

from app.ai.federated_learning import ModelUpdate, fedavg
from app.ai.kpi_forecasting import kpi_pack_forecast
from app.ai.competitor_intel import Competitor, score_competitors

router = APIRouter(prefix="/v250", tags=["v250"])

@router.post("/ai/federated/fedavg")
def federated_fedavg(body: Dict):
    updates = body.get("updates", [])
    parsed = [ModelUpdate(tenant_id=u["tenant_id"], weights=u["weights"], num_samples=int(u["num_samples"])) for u in updates]
    return fedavg(parsed)

@router.post("/ai/forecast/kpi")
def forecast_kpis(body: Dict):
    horizon = int(body.get("horizon_days", 7))
    kpi = body.get("kpi", {})
    return {"horizon_days": horizon, "forecast": kpi_pack_forecast(kpi, horizon_days=horizon)}

@router.post("/market/competitors/score")
def competitor_score(body: Dict):
    comps = body.get("competitors", [])
    parsed = [Competitor(name=c["name"], strengths=c.get("strengths", []), weaknesses=c.get("weaknesses", []), pricing_notes=c.get("pricing_notes","")) for c in comps]
    return score_competitors(parsed)
