from __future__ import annotations
from typing import Dict

def adjust_prediction(current_prediction: float, actual: float, lr: float = 0.1):
    error = actual - current_prediction
    updated = current_prediction + lr * error
    return {"old_prediction": current_prediction, "actual": actual, "updated_prediction": updated}
