from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os, time
import numpy as np

app = FastAPI(title="GENIE_ROI AI Service", version="257.0")

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

@app.post("/v257/ai/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
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
        "최근 기간 대비 효율 변화(샘플) 기반으로 조정 후보를 선정했습니다.",
        "채널 수가 많을수록 불확실성이 증가하므로 보수적으로 반영했습니다.",
        "승인/가드레일 정책(신뢰도/변동폭)으로 운영 리스크를 제한합니다.",
    ]
    risks = [
        "실제 채널 API 정책/예산 단위 차이로 실행 단계에서 변환이 필요합니다.",
        "어트리뷰션/태깅 품질이 낮으면 추천 정확도가 악화될 수 있습니다.",
        "Shadow-mode에서 uplift 검증 후 점진적으로 자동화를 확대하는 것을 권장합니다.",
    ]

    meta = {"shadow_mode": req.shadow_mode, "confidence_threshold": CONFIDENCE_THRESHOLD, "model": "v257_scaffold"}
    return RecommendResponse(confidence=confidence, explain=explain, risks=risks, actions=actions, meta=meta)
