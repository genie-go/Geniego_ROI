# V258 Architecture

## Core flow
1) `/v258/workflows/run`
- Validates guardrails
- Calls AI for plan
- Writes execution + audit
- Optionally enqueues outbox task

2) `/v258/executions/approve`
- Records approval + audit
- Enqueues outbox task

3) Worker
- Polls outbox due rows
- Pushes to Redis queue
- Executes connectors
- Retries with backoff; sends to DLQ after max retries

## Ops endpoints
- Policy reload (token)
- Outbox + DLQ inspection (token)
- Metrics snapshot (token)

## Shadow outcomes
- `/v258/shadow/events` to record outcome metrics
- `/v258/reports/lift/{id}` reads shadow_events and produces a placeholder uplift view
