from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class Competitor:
    name: str
    strengths: List[str]
    weaknesses: List[str]
    pricing_notes: str = ""

def score_competitors(comps: List[Competitor]) -> Dict:
    # Simple scoring: more weaknesses -> higher opportunity
    scored = []
    for c in comps:
        score = max(0, 10 + len(c.weaknesses) - len(c.strengths))
        scored.append({"name": c.name, "opportunity_score": score, "notes": c.pricing_notes})
    scored.sort(key=lambda x: x["opportunity_score"], reverse=True)
    return {"ranked": scored}
