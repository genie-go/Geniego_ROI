from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Optional
import math
import numpy as np

@dataclass
class Forecast:
    horizon_days: int
    forecast: List[float]
    method: str
    meta: Dict

def _weekday_indices(n: int, start_weekday: int) -> List[int]:
    # start_weekday: 0=Mon ... 6=Sun
    return [ (start_weekday + i) % 7 for i in range(n) ]

def seasonal_weekday_forecast(series: List[float], horizon_days: int = 7, start_weekday: int = 0) -> Forecast:
    """Seasonality-aware baseline:
    - Uses weekday averages (Mon..Sun) if enough data
    - Falls back to exponential smoothing
    """
    if len(series) < 14:  # need at least 2 weeks to learn weekday pattern
        return ses_forecast(series, horizon_days=horizon_days)
    # Estimate weekday means assuming series aligned to days ending 'today'
    # We'll assign weekdays backward; simplest: assume last point is start_weekday + (len-1).
    start = (start_weekday - (len(series)-1)) % 7
    buckets = {i: [] for i in range(7)}
    for i, v in enumerate(series):
        wd = (start + i) % 7
        buckets[wd].append(float(v))
    means = {wd: (sum(vals)/len(vals) if vals else float(np.mean(series))) for wd, vals in buckets.items()}
    idx = _weekday_indices(horizon_days, (start + len(series)) % 7)
    fc = [means[i] for i in idx]
    return Forecast(horizon_days=horizon_days, forecast=fc, method="WeekdaySeasonality", meta={"weekday_means": means})

def ses_forecast(series: List[float], alpha: float = 0.3, horizon_days: int = 7) -> Forecast:
    if not series:
        return Forecast(horizon_days=horizon_days, forecast=[0.0]*horizon_days, method="SES", meta={"alpha": alpha})
    s = float(series[0])
    for x in series[1:]:
        s = alpha * float(x) + (1 - alpha) * s
    return Forecast(horizon_days=horizon_days, forecast=[s]*horizon_days, method="SES", meta={"alpha": alpha})

def apply_calendar_effects(forecast: List[float], calendar: Optional[Dict[str, float]] = None) -> List[float]:
    """Apply optional calendar multipliers by weekday or named events.
    calendar example: {"weekday:5": 1.10, "weekday:6": 0.95}
    """
    if not calendar:
        return forecast
    out = []
    for i, v in enumerate(forecast):
        m = 1.0
        key = f"day:{i}"
        if key in calendar:
            m *= float(calendar[key])
        out.append(float(v) * m)
    return out

def kpi_pack_forecast_v2(kpi: Dict[str, List[float]], horizon_days: int = 7, start_weekday: int = 0, calendar: Optional[Dict[str, float]] = None) -> Dict:
    out = {}
    for name, series in kpi.items():
        base = seasonal_weekday_forecast(series, horizon_days=horizon_days, start_weekday=start_weekday)
        base.forecast = apply_calendar_effects(base.forecast, calendar=calendar)
        out[name] = base.__dict__
    return out
