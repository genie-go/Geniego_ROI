# V257 Architecture

## Outbox reliability
- Postgres is the source of truth for outbox rows
- Worker polls due rows, pushes payload to Redis queue, executes, then updates DB
- Retry: exponential backoff, then DEAD + DLQ push after max retries

## Ops endpoints (token protected)
- POST `/v257/ops/policy/reload`
- GET  `/v257/ops/outbox`
- GET  `/v257/ops/dlq`

## Contracts
See `docs/CONTRACTS.md`.
