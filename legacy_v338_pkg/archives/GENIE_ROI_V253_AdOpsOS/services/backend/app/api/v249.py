from __future__ import annotations
from fastapi import APIRouter
from typing import Dict, List
from app.ai.rl_budget_optimizer import simulate_rl_step
from app.ai.campaign_refactor_engine import suggest_campaign_refactor

router = APIRouter(prefix="/v249", tags=["v249"])

@router.post("/ai/rl/budget")
def rl_budget(body: Dict):
    return simulate_rl_step()

@router.post("/ai/campaign/refactor")
def campaign_refactor(body: Dict):
    campaigns = body.get("campaigns", [])
    return suggest_campaign_refactor(campaigns)
