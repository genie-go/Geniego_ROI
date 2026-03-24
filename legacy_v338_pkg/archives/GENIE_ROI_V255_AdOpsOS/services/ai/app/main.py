from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os, math, random, time

app = FastAPI(title="GENIE_ROI V254 AI", version="v254")

class RecommendRequest(BaseModel):
    tenant_id: str
    objective: str
    channels: List[str]
    budget_delta_limit_pct: float = Field(default=20, ge=0, le=100)

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/v254/ai/recommend")
def recommend(req: RecommendRequest) -> Dict[str, Any]:
    # NOTE: This is a safe reference implementation.
    # Replace with production forecasting + anomaly + constrained optimization.
    random.seed(hash((req.tenant_id, req.objective, tuple(req.channels))) % (2**32))
    base = 0.70 + (0.06 if req.objective.lower().startswith("max") else 0.02)
    confidence = clamp(base + random.uniform(-0.05, 0.12), 0.05, 0.95)

    actions = []
    for ch in req.channels:
        # produce a bounded budget delta
        delta = clamp(random.uniform(-req.budget_delta_limit_pct, req.budget_delta_limit_pct), -req.budget_delta_limit_pct, req.budget_delta_limit_pct)
        actions.append({
            "channel": ch,
            "action": "ADJUST_BUDGET",
            "delta_pct": round(delta, 2),
            "scope": "CAMPAIGN_OR_ADSET",
        })

    explain = {
        "summary": "Recommendations are generated with a safety-first confidence gate and bounded deltas.",
        "signals": [
            {"name": "roas_trend", "direction": "up", "strength": round(random.uniform(0.4, 0.9), 2)},
            {"name": "cvr_trend", "direction": random.choice(["up","flat","down"]), "strength": round(random.uniform(0.3, 0.8), 2)},
            {"name": "spend_pacing", "direction": random.choice(["under","ontrack","over"]), "strength": round(random.uniform(0.3, 0.8), 2)},
        ],
        "guardrails": {
            "budget_delta_limit_pct": req.budget_delta_limit_pct,
            "requires_review_below_confidence": float(os.getenv("CONFIDENCE_THRESHOLD", "0.72")),
        }
    }

    risks = []
    if confidence < float(os.getenv("CONFIDENCE_THRESHOLD", "0.72")):
        risks.append({"level": "medium", "reason": "confidence_below_threshold", "mitigation": "require_human_review"})
    risks.append({"level": "low", "reason": "channel_api_quota", "mitigation": "rate_limit_and_retry"})
    plan = {"actions": actions}

    return {
        "confidence": round(confidence, 3),
        "explain": explain,
        "risks": risks,
        "plan": plan,
    }
