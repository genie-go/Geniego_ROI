# V250 Federated Learning Governance

## Why Federated Learning
- Cross-account learning without centralizing raw data
- Strong story for privacy & enterprise compliance

## Must-haves for production
- Secure aggregation (no single party sees client updates)
- Differential privacy
- Update validation & poisoning detection
- Model rollback + drift monitoring
- Tenant opt-in and tier gating (Enterprise only)

## Rollout plan
1) Shadow training (no production impact)
2) Human-reviewed recommendations
3) Gradual auto-execute with strict policies
