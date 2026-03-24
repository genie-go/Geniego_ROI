from __future__ import annotations
from typing import List, Dict

def suggest_campaign_refactor(campaigns: List[Dict]) -> Dict:
    suggestions = []
    for c in campaigns:
        if c.get("roas", 0) < 1.5:
            suggestions.append({
                "campaign_id": c.get("campaign_id"),
                "action": "merge_or_pause",
                "reason": "Low ROAS detected"
            })
        if c.get("overlap_score", 0) > 0.7:
            suggestions.append({
                "campaign_id": c.get("campaign_id"),
                "action": "structure_cleanup",
                "reason": "High audience overlap"
            })
    return {"suggestions": suggestions}
