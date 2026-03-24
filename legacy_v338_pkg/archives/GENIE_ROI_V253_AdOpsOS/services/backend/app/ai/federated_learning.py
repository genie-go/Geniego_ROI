from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List
import numpy as np

@dataclass
class ModelUpdate:
    tenant_id: str
    weights: List[float]
    num_samples: int

def fedavg(updates: List[ModelUpdate]) -> Dict:
    """Federated Averaging (FedAvg) baseline.
    In production:
      - differential privacy / secure aggregation
      - client authentication and model validation
      - drift checks and rollback
    """
    if not updates:
        return {"ok": False, "message": "no updates"}
    total = sum(u.num_samples for u in updates)
    w = None
    for u in updates:
        vec = np.array(u.weights, dtype=float)
        coef = u.num_samples / total
        w = vec * coef if w is None else w + vec * coef
    return {"ok": True, "global_weights": w.tolist(), "num_clients": len(updates), "total_samples": total}
