from __future__ import annotations
from fastapi import APIRouter
from typing import Dict
from app.ai.ab_budget_engine import simulate_experiment

router = APIRouter(prefix="/v248", tags=["v248"])

@router.post("/ai/experiment/budget")
def run_budget_experiment(body: Dict):
    base_budget = float(body.get("base_budget", 1000))
    result = simulate_experiment(base_budget)
    return result
