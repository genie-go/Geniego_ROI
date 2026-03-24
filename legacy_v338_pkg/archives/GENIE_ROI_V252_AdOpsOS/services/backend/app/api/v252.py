from __future__ import annotations
from fastapi import APIRouter
from typing import Dict, List

from app.ai.secure_aggregation import mask_vector, unmask_vector, secure_aggregate
from app.ai.poisoning_detection import detect_poisoned_updates
from app.ai.online_learning import adjust_prediction

router = APIRouter(prefix="/v252", tags=["v252"])

@router.post("/federated/secure-aggregate")
def federated_secure(body: Dict):
    vectors = body.get("vectors", [])
    seeds = body.get("seeds", [])
    masked = [mask_vector(v, seeds[i]) for i, v in enumerate(vectors)]
    safe = detect_poisoned_updates(masked)
    aggregated = secure_aggregate(safe)
    return {"aggregated": aggregated, "num_safe_updates": len(safe)}

@router.post("/ai/online-adjust")
def online_adjust(body: Dict):
    pred = float(body.get("prediction", 0))
    actual = float(body.get("actual", 0))
    return adjust_prediction(pred, actual)
