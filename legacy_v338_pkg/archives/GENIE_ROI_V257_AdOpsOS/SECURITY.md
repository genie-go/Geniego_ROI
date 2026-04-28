# Security & Safety Notes (V257)

- Default `DRY_RUN=true` prevents real ad budget/spend changes.
- Default `AUTO_EXECUTE=false` requires explicit approval.
- Ops endpoints require `X-Ops-Token`.
- Connectors are stubs by default; implement real adapters only with:
  - OAuth/token refresh + signing (where required)
  - idempotency + snapshot/rollback
  - quota/rate-limit handling
  - audit logs + alerting
