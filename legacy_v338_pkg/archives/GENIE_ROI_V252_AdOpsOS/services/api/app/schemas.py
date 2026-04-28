from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TenantCreate(BaseModel):
    id: str = Field(..., min_length=2, max_length=64)
    name: str

class TenantOut(BaseModel):
    id: str
    name: str

class CampaignCreate(BaseModel):
    name: str
    channel: str
    external_id: str = ""
    spend: float = 0
    revenue: float = 0
    daily_budget: float = 0
    min_budget: float = 10
    max_budget: float = 50000

class CampaignOut(CampaignCreate):
    id: int
    active: bool = True

class ExperimentCreate(BaseModel):
    campaign_id: int
    lift: float = 0.0
    confidence: float = 0.5

class PolicyUpdate(BaseModel):
    auto_approve_max_abs: float
    auto_approve_max_pct: float
    require_finance_abs: float
    require_finance_pct: float

class AutopilotIn(BaseModel):
    total_budget: Optional[float] = None

class GoogleMapUpsert(BaseModel):
    campaign_id: int
    budget_resource_name: str

class GoogleBulkMapIn(BaseModel):
    campaign_ids: Optional[List[int]] = None  # if None, uses all google campaigns of tenant
    dry_run: bool = False

class DlqRequeueIn(BaseModel):
    limit: int = 50
    dry_run: bool = True
    kind: Optional[str] = None
    error_contains: Optional[str] = None
    idempotency_prefix: Optional[str] = None

class InternalTokenMetric(BaseModel):
    tenant_id: str
    provider: str
    result: str
    message: str = ""

class ExternalCampaignIn(BaseModel):
    external_id: str
    name: str
    status: str = "ENABLED"
    daily_budget: float = 0.0
    spend_7d: float = 0.0
    revenue_7d: float = 0.0

class SyncRequest(BaseModel):
    provider: str = Field(..., description="google|meta|tiktok|naver|kakao")
    account_id: Optional[str] = None
    # If provided, runs in mock/stub mode (no real API calls)
    mock_campaigns: Optional[List[ExternalCampaignIn]] = None

class SyncResult(BaseModel):
    fetched: int
    created: int
    updated: int
    deactivated: int

class StrategyEvalIn(BaseModel):
    channel: Optional[str] = None
    naming_regex: Optional[str] = None
    target_roas: float = 1.0

class IssueOut(BaseModel):
    code: str
    severity: str
    message: str

class StrategyEvalOut(BaseModel):
    tenant_id: str
    channel: str
    score: int
    campaign_count: int
    issues: List[IssueOut]
    anomalies: List[Dict[str, Any]] = []

class RecommendationsIn(BaseModel):
    channel: Optional[str] = None
    total_budget: Optional[float] = None
    target_roas: float = 1.0

class RecommendationsOut(BaseModel):
    tenant_id: str
    channel: str
    budget_reallocation: List[dict]
    pause_candidates: List[dict]
