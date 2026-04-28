from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class PricingInputs:
    arpa: float
    monthly_churn: float
    cac: float
    nrr: float
    customers0: int
    months: int

def simulate(inputs: PricingInputs) -> Dict[str, Any]:
    customers = float(inputs.customers0)
    arpa = float(inputs.arpa)
    churn = float(inputs.monthly_churn)
    nrr = float(inputs.nrr)
    cac = float(inputs.cac)

    rows: List[Dict[str, Any]] = []
    mrr = customers * arpa
    cum_cash = 0.0
    for m in range(1, inputs.months + 1):
        customers = max(0.0, customers * (1.0 - churn))
        # revenue retention/expansion
        mrr = (customers * arpa) * nrr
        # simple spend assumption: 15% of revenue on sales+marketing for growth; CAC recovers via payback
        sm_spend = mrr * 0.15
        # net cash proxy
        cum_cash += (mrr - sm_spend)
        rows.append({"month": m, "customers": round(customers,2), "mrr": round(mrr,2), "sm_spend": round(sm_spend,2), "cum_cash_proxy": round(cum_cash,2)})
    payback_months = (cac / arpa) if arpa > 0 else None
    return {
        "inputs": inputs.__dict__,
        "outputs": {
            "final_customers": round(customers,2),
            "final_mrr": round(mrr,2),
            "payback_months_proxy": round(payback_months,2) if payback_months else None,
            "cum_cash_proxy": round(cum_cash,2),
        },
        "timeline": rows,
        "notes": [
            "This is a strategy simulator (not GAAP). Replace with your real CAC, retention cohort curves, gross margin, and expansion assumptions.",
            "Use region multipliers for FX/ARPA uplift and churn differences when going global.",
        ]
    }
