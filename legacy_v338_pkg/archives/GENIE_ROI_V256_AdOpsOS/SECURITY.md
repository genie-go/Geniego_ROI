# Security & Safety Notes (V256)

- Default `DRY_RUN=true` prevents real ad budget changes.
- Default `AUTO_EXECUTE=false` requires explicit approval.
- No API tokens are stored in this repo. Use a secret manager in production.
- Implement real channel adapters carefully:
  - OAuth / token refresh
  - request signing (Naver/Kakao)
  - rate limiting + retries + idempotency
  - snapshot before change + rollback
  - audit logs + alerts
