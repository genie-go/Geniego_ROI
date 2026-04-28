from __future__ import annotations
from typing import List
import numpy as np
import random

def mask_vector(vec: List[float], seed: int) -> List[float]:
    random.seed(seed)
    noise = [random.uniform(-0.01, 0.01) for _ in vec]
    return list(np.array(vec) + np.array(noise))

def unmask_vector(vec: List[float], seed: int) -> List[float]:
    random.seed(seed)
    noise = [random.uniform(-0.01, 0.01) for _ in vec]
    return list(np.array(vec) - np.array(noise))

def secure_aggregate(masked_vectors: List[List[float]]) -> List[float]:
    return list(np.mean(np.array(masked_vectors), axis=0))
