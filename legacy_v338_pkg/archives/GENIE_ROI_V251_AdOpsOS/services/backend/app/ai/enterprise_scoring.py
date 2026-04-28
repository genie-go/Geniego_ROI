from __future__ import annotations
from typing import Dict

def platform_maturity_score(tenant_metrics: Dict) -> Dict:
    score = 0
    if tenant_metrics.get("multi_channel_enabled"):
        score += 20
    if tenant_metrics.get("auto_execute_enabled"):
        score += 20
    if tenant_metrics.get("ai_usage"):
        score += 20
    if tenant_metrics.get("approval_workflow_active"):
        score += 20
    if tenant_metrics.get("audit_logs_count", 0) > 50:
        score += 20

    return {
        "maturity_score": score,
        "grade": "A" if score >= 80 else "B" if score >= 60 else "C"
    }
