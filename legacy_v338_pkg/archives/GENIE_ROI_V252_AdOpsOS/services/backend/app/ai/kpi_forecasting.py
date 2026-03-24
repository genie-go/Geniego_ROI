from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict
import numpy as np

@dataclass
class Forecast:
    horizon_days: int
    forecast: List[float]
    method: str

def simple_exponential_smoothing(series: List[float], alpha: float = 0.3, horizon_days: int = 7) -> Forecast:
    if not series:
        return Forecast(horizon_days=horizon_days, forecast=[0.0]*horizon_days, method="SES")
    s = float(series[0])
    for x in series[1:]:
        s = alpha * float(x) + (1 - alpha) * s
    return Forecast(horizon_days=horizon_days, forecast=[s]*horizon_days, method=f"SES(alpha={alpha})")

def kpi_pack_forecast(kpi: Dict[str, List[float]], horizon_days: int = 7) -> Dict:
    out = {}
    for name, series in kpi.items():
        out[name] = simple_exponential_smoothing(series, horizon_days=horizon_days).__dict__
    return out
