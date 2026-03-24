# V244 AI Model Governance (Go-to-market safe)

## Why this matters
Budget recommendations impact spend and can cause real financial loss.
We ship 'high-quality baseline models' + strong guardrails + approval workflow.

## Shipped in V244
- IsolationForest anomaly detection for ROAS series (robust baseline)
- Marginal ROAS heuristic optimizer (safe baseline)

## Upgrade path (V245+)
- Causal uplift models (Bayesian hierarchical / Double ML)
- Seasonality-aware forecasting (Prophet/ARIMA) where permitted
- Offline evaluation harness + shadow mode rollout
- Policy engine (risk appetite per tenant)
