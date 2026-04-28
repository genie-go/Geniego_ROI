from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os, time
import numpy as np

app = FastAPI(title="GENIE_ROI AI Service", version="261.0")

CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.72"))

class RecommendRequest(BaseModel):
    tenant_id: str
    objective: str
    channels: List[str]
    budget_delta_limit_pct: float = Field(gt=0, le=100)
    shadow_mode: bool = True

class RecommendResponse(BaseModel):
    confidence: float
    explain: List[str]
    risks: List[str]
    actions: List[Dict[str, Any]]
    meta: Dict[str, Any]

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/v261/ai/recommend", response_model=RecommendResponse)
@app.post("/v262/ai/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    if not req.channels:
        raise HTTPException(status_code=400, detail="channels_required")

    rng = np.random.default_rng(int(time.time()) % 2**16)
    base = 0.70 + 0.15 * float(rng.random())
    if req.objective == "minimize_cac":
        base -= 0.02
    base -= max(0, (len(req.channels) - 2)) * 0.02
    confidence = float(np.clip(base, 0.55, 0.90))

    step = min(req.budget_delta_limit_pct, 10.0)
    actions = [
        {"type": "BUDGET_DELTA_PCT", "value": float(step)},
        {"type": "PAUSE_IF_CPA_ABOVE", "value": 999999},
    ]

    explain = [
        "추천은 운영 안전을 우선하는 scaffold 모델 출력입니다.",
        "confidence는 채널 수/목표에 따른 불확실성을 반영합니다.",
        "정책(guardrails)+승인 흐름으로 실행 리스크를 제한합니다.",
    ]
    risks = [
        "실제 성능은 고객 데이터/학습/검증(offline+shadow uplift)에 의해 결정됩니다.",
        "채널 API 정책/예산 단위 차이를 커넥터에서 변환해야 합니다.",
        "자동 실행은 shadow 검증 후 점진적으로 확대하는 것을 권장합니다.",
    ]

    meta = {
        "shadow_mode": req.shadow_mode,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "model": "v260_scaffold",
        "todo": "train + evaluate + calibrate confidence; enable segment-aware policies",
    }
    return RecommendResponse(confidence=confidence, explain=explain, risks=risks, actions=actions, meta=meta)
