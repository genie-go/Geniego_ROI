# Security & Safety Notes (V258)

- Default `DRY_RUN=true` prevents real ad budget/spend changes.
- Default `AUTO_EXECUTE=false` requires explicit approval.
- Ops endpoints require `X-Ops-Token`.
- Connectors are stubs by default; real adapters must implement:
  - OAuth/token refresh + signing (where required)
  - quota + retries + idempotency
  - snapshot-before-change + rollback
  - audit detail returns (entity IDs, from/to)
