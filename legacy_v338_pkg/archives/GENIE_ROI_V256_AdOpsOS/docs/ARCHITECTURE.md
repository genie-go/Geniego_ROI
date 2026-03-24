# V256 Architecture Notes

## Goals
- "Execution-grade" workflow: recommend -> approve -> execute -> verify -> (rollback on failure)
- Safe-by-default: DRY_RUN true, AUTO_EXECUTE false
- Deterministic execution with idempotency and auditability

## Flow
1) Gateway `/v256/workflows/run`
   - Validates request + policy guardrails
   - Calls AI service to get plan + confidence + explain + risks
   - Writes `executions` row + `audit_log` event
   - If AUTO_EXECUTE true and allowed: enqueue outbox task

2) Approve `/v256/executions/approve`
   - Records approval
   - Enqueues outbox task

3) Worker loop (inside gateway container)
   - Polls Postgres outbox rows
   - Pushes job to Redis queue
   - Executes with retry/backoff and dead-letter on exhaustion
   - Calls connectors `/execute` and on failure `/rollback`
   - Updates execution status + audit log

## Policy-as-code
- `policies/policy.yml` contains guardrails:
  - max daily budget change %
  - excluded campaigns/tags (placeholder)
  - channel enable/disable
  - confidence thresholds by objective

## Observability
- JSON logs everywhere
- Health endpoints: `/healthz` and `/readyz`
- Optional OpenTelemetry exporter via OTEL env vars
