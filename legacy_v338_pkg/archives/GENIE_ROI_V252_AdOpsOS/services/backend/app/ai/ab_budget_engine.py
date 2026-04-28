from __future__ import annotations
import random
from typing import Dict, List

class ABBudgetExperiment:

    def __init__(self, base_budget: float, test_variation_pct: float = 10.0):
        self.base_budget = base_budget
        self.test_variation_pct = test_variation_pct

    def generate_variants(self) -> Dict[str, float]:
        delta = self.base_budget * (self.test_variation_pct / 100)
        return {
            "control": self.base_budget,
            "variant_up": self.base_budget + delta,
            "variant_down": max(0, self.base_budget - delta),
        }

    def select_winner(self, performance_data: Dict[str, float]) -> str:
        # performance_data: {"control": ROAS, "variant_up": ROAS, ...}
        return max(performance_data, key=performance_data.get)

def simulate_experiment(base_budget: float) -> Dict:
    engine = ABBudgetExperiment(base_budget)
    variants = engine.generate_variants()

    # Simulated ROAS performance (placeholder for real data)
    performance = {k: random.uniform(1.0, 4.0) for k in variants.keys()}
    winner = engine.select_winner(performance)

    return {
        "variants": variants,
        "performance": performance,
        "winner": winner
    }
