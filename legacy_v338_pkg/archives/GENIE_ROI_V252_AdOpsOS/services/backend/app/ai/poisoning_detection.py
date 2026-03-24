from __future__ import annotations
from typing import List
import numpy as np

def detect_poisoned_updates(vectors: List[List[float]], threshold: float = 3.0):
    arr = np.array(vectors)
    mean = np.mean(arr, axis=0)
    std = np.std(arr, axis=0)
    safe = []
    for v in arr:
        z = np.abs((v - mean) / (std + 1e-6))
        if np.max(z) < threshold:
            safe.append(v.tolist())
    return safe
