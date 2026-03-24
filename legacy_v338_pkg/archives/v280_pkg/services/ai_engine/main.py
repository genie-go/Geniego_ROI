from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import numpy as np

app = FastAPI(title="GENIE ROI AI Engine", version="V280")

class RiskReq(BaseModel):
    tenant_id: str
    channel: str
    action: str
    payload: Dict[str, Any] = Field(default_factory=dict)

class RiskResp(BaseModel):
    risk_score: float
    flags: List[str]
    summary: str
    recommend: Dict[str, Any]

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/v1/risk/score", response_model=RiskResp)
def score(req: RiskReq):
    # Scaffold heuristic:
    # - higher delta_pct and bulk size => higher risk
    delta = float(req.payload.get("delta_pct", 0) or 0)
    bulk = float(req.payload.get("bulk_count", 0) or 0)
    recipients = float(req.payload.get("recipient_count", 0) or 0)

    base = 0.1
    base += min(abs(delta) / 100.0, 1.0) * 0.5
    base += min(bulk / 5000.0, 1.0) * 0.3
    base += min(recipients / 100000.0, 1.0) * 0.4

    noise = float(np.clip(np.random.normal(0, 0.03), -0.05, 0.05))
    risk = float(np.clip(base + noise, 0.0, 1.0))

    flags = []
    if abs(delta) > 10: flags.append("BUDGET_DELTA_HIGH")
    if bulk > 1000: flags.append("CRM_BULK_HIGH")
    if recipients > 5000: flags.append("EMAIL_RECIPIENTS_HIGH")

    recommend = {}
    if "BUDGET_DELTA_HIGH" in flags:
        recommend["suggested_delta_pct"] = 5
    if "EMAIL_RECIPIENTS_HIGH" in flags:
        recommend["suggested_batching"] = True
        recommend["suggested_holdout_pct"] = 5

    summary = "Heuristic risk scoring (scaffold). Replace with trained models + telemetry."
    return RiskResp(risk_score=risk, flags=flags, summary=summary, recommend=recommend)

class SimReq(BaseModel):
    tenant_id: str
    scenario: Dict[str, Any]

@app.post("/v1/simulate")
def simulate(req: SimReq):
    # Basic "spend shock" / downside approximation scaffold
    spend = float(req.scenario.get("spend", 0) or 0)
    shock = float(req.scenario.get("shock_pct", 0) or 0) / 100.0
    expected = spend * (1 + shock)
    downside_risk = float(np.clip(abs(shock) * 0.7, 0, 1))
    return {
        "expected_spend": expected,
        "shock_pct": shock,
        "downside_risk": downside_risk,
        "note": "Scaffold simulation. Replace with causal/forecast models."
    }
