from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Dict, Any

from workers.job_queue import InMemoryJobQueue
from workers.job_types import UPDATE_CAMPAIGN_BUDGET

router = APIRouter(prefix="/v242", tags=["v242"])

# NOTE: For ZIP distribution we use in-memory queue.
# For SaaS: replace with Kafka/Redis queue + persistent approvals.
QUEUE = InMemoryJobQueue()


class BudgetChangeRequest(BaseModel):
    customer_id: str = Field(..., description="Google Ads customer ID (no dashes)")
    campaign_id: str = Field(..., description="Campaign ID")
    current_daily_budget: float = Field(..., description="Current daily budget in account currency units")
    new_daily_budget: float = Field(..., description="New daily budget in account currency units")


@router.get("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "version": "v242"}


@router.post("/execute/budget-change")
def execute_budget_change(req: BudgetChangeRequest) -> Dict[str, Any]:
    # In production: require approval token / RBAC permission.
    job = QUEUE.enqueue(
        UPDATE_CAMPAIGN_BUDGET,
        payload=req.model_dump(),
    )
    return {"queued": True, "job_id": job.job_id, "job_type": job.job_type, "payload": job.payload}


@router.get("/jobs")
def list_jobs() -> Dict[str, Any]:
    return {"jobs": [j.__dict__ for j in QUEUE.list_jobs()]}
