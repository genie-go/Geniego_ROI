from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any, Dict, List
import numpy as np

app = FastAPI(title="GENIE ROI AI Engine", version="V284")

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
    """Deterministic, explainable risk scoring (V283).

    NOTE: This is a lightweight baseline intended to be replaced by a learned model.
    It is deliberately deterministic to support auditability and reproducibility.
    """
    # Normalized signals (0..1)
    delta = float(req.payload.get("delta_pct", req.payload.get("budget_delta_pct", 0)) or 0)
    bulk = float(req.payload.get("bulk_count", 0) or 0)
    recipients = float(req.payload.get("recipient_count", 0) or 0)

    # Hard guards (these should be enforced by the gateway policy engine in production)
    hard_flags = []
    if abs(delta) >= 50: hard_flags.append("BUDGET_DELTA_EXTREME")
    if bulk >= 20000: hard_flags.append("CRM_BULK_EXTREME")
    if recipients >= 200000: hard_flags.append("EMAIL_RECIPIENTS_EXTREME")

    # Smooth scoring
    def clip01(x: float) -> float:
        return float(np.clip(x, 0.0, 1.0))

    s_delta = clip01(abs(delta) / 30.0)         # 30% change ~ high
    s_bulk = clip01(bulk / 5000.0)             # 5k updates ~ high
    s_rcpt = clip01(recipients / 50000.0)      # 50k recipients ~ high

    # Channel-aware weights
    ch = (req.channel or "").lower()
    w_delta, w_bulk, w_rcpt = 0.4, 0.3, 0.3
    if ch == "ads":   w_delta, w_bulk, w_rcpt = 0.65, 0.2, 0.15
    if ch == "crm":   w_delta, w_bulk, w_rcpt = 0.2, 0.65, 0.15
    if ch == "email": w_delta, w_bulk, w_rcpt = 0.2, 0.15, 0.65

    base = 0.08
    risk = clip01(base + w_delta*s_delta + w_bulk*s_bulk + w_rcpt*s_rcpt)

    flags = []
    if abs(delta) > 10: flags.append("BUDGET_DELTA_HIGH")
    if bulk > 1000: flags.append("CRM_BULK_HIGH")
    if recipients > 5000: flags.append("EMAIL_RECIPIENTS_HIGH")
    flags.extend(hard_flags)

    recommend = {
        "should_require_approval": risk >= 0.6 or len(hard_flags) > 0,
        "holdout_pct": 10 if risk < 0.4 else 20,
        "rate_limit_hint": "low" if risk < 0.4 else ("medium" if risk < 0.7 else "high"),
    }

    summary = f"risk={risk:.2f} (delta={delta:.1f}%, bulk={bulk:.0f}, recipients={recipients:.0f})"

    return RiskResp(risk_score=risk, flags=flags, summary=summary, recommend=recommend)
        risk_score=risk,
        flags=flags,
        summary="Heuristic risk scoring (scaffold). Replace with trained models + telemetry.",
        recommend=recommend
    )
