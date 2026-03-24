from typing import List, Dict, Any
from .config import settings
from .roi import roi

def optimize(campaigns: List[Dict[str, Any]], lifts: Dict[int, float]) -> List[Dict[str, Any]]:
    total = float(settings.total_budget)
    max_shift = float(settings.max_shift_pct) / 100.0
    stop_loss = float(settings.stop_loss_roi)

    for c in campaigns:
        cur = float(c.get("daily_budget") or 0.0)
        if cur <= 0:
            spend = float(c.get("spend") or 0.0)
            cur = max(float(c.get("min_budget") or 10.0), spend / 30.0 if spend > 0 else float(c.get("min_budget") or 10.0))
        c["_cur"] = cur
        r = roi(float(c.get("spend") or 0.0), float(c.get("revenue") or 0.0))
        lift = float(lifts.get(int(c["id"]), 0.0))
        score = max(-1.0, r) * (1.0 + lift)
        if r <= stop_loss:
            score -= 5.0
        c["_roi"], c["_score"] = r, score

        min_b = float(c.get("min_budget") or 10.0)
        max_b = float(c.get("max_budget") or 50000.0)
        low = max(min_b, cur * (1.0 - max_shift))
        high = min(max_b, cur * (1.0 + max_shift))
        c["_low"], c["_high"] = low, high

    alloc = {int(c["id"]): c["_low"] for c in campaigns}
    remaining = max(0.0, total - sum(alloc.values()))
    ranked = sorted(campaigns, key=lambda x: x["_score"], reverse=True)
    for c in ranked:
        if remaining <= 0: break
        cid = int(c["id"])
        room = c["_high"] - alloc[cid]
        if room <= 0: continue
        add = min(room, remaining)
        alloc[cid] += add
        remaining -= add

    proposals = []
    for c in campaigns:
        cid = int(c["id"])
        proposals.append({
            "campaign_id": cid,
            "channel": c.get("channel"),
            "roi": c["_roi"],
            "score": round(float(c["_score"]), 4),
            "current_budget": round(float(c["_cur"]), 2),
            "new_budget": round(float(alloc[cid]), 2),
            "lift": float(lifts.get(cid, 0.0)),
            "bounds": {"low": round(float(c["_low"]),2), "high": round(float(c["_high"]),2)},
        })
    proposals.sort(key=lambda p: abs(p["new_budget"] - p["current_budget"]), reverse=True)
    return proposals
