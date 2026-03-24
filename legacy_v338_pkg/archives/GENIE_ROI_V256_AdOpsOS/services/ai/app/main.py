from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import os, time, random
import numpy as np

app = FastAPI(title="GENIE_ROI AI Service", version="256.0")

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

@app.post("/v256/ai/recommend", response_model=RecommendResponse)
def recommend(req: RecommendRequest):
    # V256: "production-safe" heuristics + uncertainty outputs
    # NOTE: This is a scaffold. Replace with real models + validation + shadow lift measurement.

    rng = np.random.default_rng(int(time.time()) % 2**16)
    base = 0.70 + 0.15 * float(rng.random())  # 0.70~0.85
    # Slightly adjust by objective
    if req.objective == "minimize_cac":
        base -= 0.02
    # Penalize too many channels (higher uncertainty)
    base -= max(0, (len(req.channels) - 2)) * 0.02
    confidence = float(np.clip(base, 0.55, 0.90))

    # Actions: bounded by budget_delta_limit_pct
    step = min(req.budget_delta_limit_pct, 10.0)
    actions = [
        {"type": "BUDGET_DELTA_PCT", "value": float(step)},
        {"type": "PAUSE_IF_CPA_ABOVE", "value": 999999},  # placeholder guard
    ]

    explain = [
        "최근 7일 대비 전환 효율 변화(샘플) 기반으로 예산 조정 후보를 선정했습니다.",
        "채널 간 분산(uncertainty)을 고려해 보수적으로 증액 폭을 제한했습니다.",
        f"신뢰도(confidence)는 불확실성(채널 수/목표)에 따라 조정되었습니다.",
    ]
    risks = [
        "실제 채널 API 정책/예산 단위 차이로 실행 단계에서 변환이 필요합니다.",
        "데이터 품질(태깅/어트리뷰션)에 따라 추천 품질이 크게 변동됩니다.",
        "Shadow-mode 검증 없이 즉시 자동 실행을 권장하지 않습니다.",
    ]

    meta = {
        "shadow_mode": req.shadow_mode,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "model": "v256_scaffold",
        "notes": "Replace with trained models + offline/online evaluation.",
    }
    return RecommendResponse(
        confidence=confidence, explain=explain, risks=risks, actions=actions, meta=meta
    )
