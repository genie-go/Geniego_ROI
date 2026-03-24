from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any
import numpy as np
from sklearn.ensemble import IsolationForest

@dataclass
class AnomalyResult:
    is_anomaly: bool
    score: float
    reason: str

def roas_anomaly_isoforest(roas_series: List[float], contamination: float = 0.15) -> AnomalyResult:
    """Detects anomalies in ROAS series using IsolationForest.
    - Works with sparse/noisy data better than simple thresholding.
    - Returns anomaly decision for latest point.
    """
    if len(roas_series) < 10:
        return AnomalyResult(False, 0.0, "Not enough data for ML anomaly; need >= 10 points.")
    X = np.array(roas_series, dtype=float).reshape(-1, 1)
    model = IsolationForest(n_estimators=200, random_state=42, contamination=contamination)
    model.fit(X)
    scores = model.decision_function(X)  # higher is more normal
    pred = model.predict(X)  # -1 anomaly, 1 normal
    is_anom = pred[-1] == -1
    return AnomalyResult(bool(is_anom), float(scores[-1]), "IsolationForest on ROAS series")
