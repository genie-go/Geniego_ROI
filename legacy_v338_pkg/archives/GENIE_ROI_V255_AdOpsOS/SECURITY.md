# Security & Safety Notes

This repository is a **reference implementation**.

## Default safety settings
- `DRY_RUN=true`
- `AUTO_EXECUTE=false`
- Confidence gating via `CONFIDENCE_THRESHOLD`

## If you implement real channel API calls
- Store secrets in a vault (not in env files)
- Use least-privilege scopes
- Implement idempotency + retries + rate limiting
- Add allowlists for accounts/campaigns
- Add rollback + human approval for high-impact changes
