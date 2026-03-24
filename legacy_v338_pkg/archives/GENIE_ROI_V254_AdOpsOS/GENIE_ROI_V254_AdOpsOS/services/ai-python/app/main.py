from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
import math
import numpy as np

app = FastAPI(title="GENIE_ROI AI Service", version="v254")

class OptimizeRequest(BaseModel):
    tenant_id: str = "default"
    channel: str = Field(..., description="meta|google|tiktok|naver|kakao")
    objective: str = "roas"
    current_budget: float
    proposed_budget: float
    currency: str = "KRW"
    features: Optional[Dict[str, Any]] = None

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/forecast")
def forecast(payload: Dict[str, Any]):
    hist = payload.get("history", [])
    arr = np.array([x.get("kpi", 0.0) for x in hist], dtype=float) if hist else np.array([1.0])
    mu = float(arr.mean())
    sd = float(arr.std(ddof=1)) if arr.size > 1 else 0.1
    ci = 1.96 * sd / math.sqrt(max(arr.size, 1))
    return {"mean": mu, "ci95": [mu - ci, mu + ci], "n": int(arr.size)}

@app.post("/anomaly")
def anomaly(payload: Dict[str, Any]):
    series = payload.get("series", [])
    vals = np.array([x.get("value", 0.0) for x in series], dtype=float)
    if vals.size < 8:
        return {"anomalies": [], "note": "need >=8 points"}
    med = float(np.median(vals))
    mad = float(np.median(np.abs(vals - med))) + 1e-9
    robust_z = 0.6745 * (vals - med) / mad
    idx = np.where(np.abs(robust_z) >= 3.5)[0].tolist()
    return {"anomalies": [{"index": i, "value": float(vals[i]), "robust_z": float(robust_z[i])} for i in idx]}

@app.post("/optimize")
def optimize(req: OptimizeRequest):
    jump = 0.0
    if req.current_budget > 0:
        jump = abs(req.proposed_budget - req.current_budget) / req.current_budget

    feat = req.features or {}
    roas_trend = float(feat.get("roas_trend", 0.0))   # -1..+1
    cvr_trend  = float(feat.get("cvr_trend", 0.0))    # -1..+1
    error_rate = float(feat.get("recent_api_error_rate", 0.0))  # 0..1

    base = 0.70
    base += 0.10 * np.tanh(roas_trend)
    base += 0.05 * np.tanh(cvr_trend)
    base -= 0.25 * min(1.0, jump)
    base -= 0.30 * min(1.0, error_rate)

    confidence = float(np.clip(base, 0.0, 0.99))

    explanation = []
    if jump > 0.15:
        explanation.append("budget jump is large → confidence down")
    if roas_trend > 0.1:
        explanation.append("ROAS trend positive → confidence up")
    if cvr_trend > 0.1:
        explanation.append("CVR trend positive → confidence up")
    if error_rate > 0.05:
        explanation.append("publisher API error rate elevated → confidence down")

    risks = []
    if jump > 0.2:
        risks.append("Large budget change may cause delivery instability")
    if error_rate > 0.1:
        risks.append("Execution risk due to connector/API instability")

    return {
        "confidence": confidence,
        "recommended_budget": req.proposed_budget,
        "explain": explanation or ["insufficient signals; conservative confidence"],
        "risks": risks,
    }
