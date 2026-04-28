from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional
import numpy as np

@dataclass
class ModelUpdate:
    tenant_id: str
    weights: List[float]
    num_samples: int

def _add_dp_noise(vec: np.ndarray, sigma: float) -> np.ndarray:
    if sigma <= 0:
        return vec
    noise = np.random.normal(0.0, sigma, size=vec.shape)
    return vec + noise

def fedavg_secure(updates: List[ModelUpdate], dp_enabled: bool = False, dp_sigma: float = 0.01) -> Dict:
    """FedAvg baseline with optional Differential Privacy noise.
    NOTE: This is NOT true secure aggregation (which requires cryptographic protocol).
    This function is a practical stepping stone:
      - Server-side DP noise option
      - Validation hooks can be added for poisoning detection
    """
    if not updates:
        return {"ok": False, "message": "no updates"}
    total = sum(u.num_samples for u in updates)
    w = None
    for u in updates:
        vec = np.array(u.weights, dtype=float)
        coef = u.num_samples / total
        w = vec * coef if w is None else w + vec * coef
    w = _add_dp_noise(w, dp_sigma if dp_enabled else 0.0)
    return {
        "ok": True,
        "global_weights": w.tolist(),
        "num_clients": len(updates),
        "total_samples": total,
        "dp_enabled": bool(dp_enabled),
        "dp_sigma": float(dp_sigma) if dp_enabled else 0.0,
        "secure_aggregation": False,
        "note": "Use cryptographic secure aggregation in production; this adds DP noise only.",
    }
