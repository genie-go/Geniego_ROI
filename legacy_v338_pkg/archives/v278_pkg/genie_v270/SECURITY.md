# Security & Safety Notes (V260)

- Default `DRY_RUN=true` prevents real ad budget/spend changes.
- Default `AUTO_EXECUTE=false` requires explicit approval.
- RBAC in V260 is demo-only (header based). Replace with real auth (OIDC/SAML).
- Ops endpoints require admin role + token.
- Admin UI accepts token via query param for demo. Do not do this in production.
- Real connectors must implement:
  - OAuth/token refresh + signing
  - quota + retries + idempotency
  - snapshot-before-change + rollback using `connector_snapshots`
  - detailed audit payloads
