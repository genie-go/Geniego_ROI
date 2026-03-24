from __future__ import annotations
import os, time, json, uuid
from dataclasses import dataclass
from typing import Dict, Any, List

from app.ai.kpi_forecasting_v2 import kpi_pack_forecast_v2
from app.ai.optimizer import marginal_roas_optimizer
from app.ai.anomaly import roas_anomaly_isoforest

@dataclass
class PipelineResult:
    report_id: str
    summary: Dict[str, Any]
    artifacts: Dict[str, Any]

def run_pipeline(tenant_id: str, kpi: Dict[str, Any] | None = None) -> PipelineResult:
    """End-to-end orchestrator (safe default).
    - Forecast KPI
    - Detect ROAS anomaly
    - Recommend budget reallocations (no auto-execute here)
    - Produce an HTML report artifact
    """
    rid = str(uuid.uuid4())
    now = time.time()

    # Inputs
    kpi = kpi or {
        "spend": [100,120,140,160,180,200,190,210,220,205,215,230,240,235],
        "revenue": [160,170,200,240,260,300,280,320,330,310,325,340,360,355],
        "roas": [1.6,1.42,1.43,1.5,1.44,1.5,1.47,1.52,1.5,1.51,1.51,1.48,1.5,1.51],
    }

    forecast = kpi_pack_forecast_v2(kpi, horizon_days=7, start_weekday=0, calendar=None)
    anomaly = roas_anomaly_isoforest([float(x) for x in kpi.get("roas", [])])

    # Budget recommendations (demo input)
    campaigns = [
        {"campaign_id":"google:111", "current_budget":50000, "roas":2.4, "spend":200000},
        {"campaign_id":"google:222", "current_budget":30000, "roas":1.2, "spend":180000},
        {"campaign_id":"meta:adset:333", "current_budget":40000, "roas":1.9, "spend":150000},
    ]
    recs = marginal_roas_optimizer(campaigns, total_delta=0.0)  # neutral reallocation suggestion set

    summary = {
        "tenant_id": tenant_id,
        "timestamp": now,
        "anomaly": {"is_anomaly": anomaly.is_anomaly, "score": anomaly.score, "reason": anomaly.reason},
        "runtime": {
            "AUTO_EXECUTE": os.getenv("AUTO_EXECUTE","false"),
            "DRY_RUN": os.getenv("DRY_RUN","true"),
            "AUTH_MODE": os.getenv("AUTH_MODE","stub"),
        },
    }

    artifacts = {
        "kpi": kpi,
        "forecast": forecast,
        "budget_recommendations": [r.__dict__ for r in recs],
    }

    return PipelineResult(report_id=rid, summary=summary, artifacts=artifacts)
