# V251 Federated Privacy Pack

## Included
- FedAvg + optional Differential Privacy (DP) noise switch
- API: POST /v251/ai/federated/fedavg_secure

## What it is / isn’t
- DP noise helps privacy, but **cryptographic secure aggregation** is not implemented in this baseline.
- Production path:
  - secure aggregation protocol
  - poisoning detection
  - model rollback/drift monitoring
