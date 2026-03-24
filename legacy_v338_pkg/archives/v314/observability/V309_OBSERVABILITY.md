
# V309 Observability Pack

## Metrics (Prometheus)
- http_requests_total{route,code}
- job_items_total{provider,status}
- provider_rate_limit_wait_seconds_bucket
- token_refresh_failures_total
- inventory_inconsistency_total
- webhook_ingest_latency_seconds_bucket

## Tracing (OpenTelemetry)
- Trace per job execution
- Span per provider request
- Correlate via request_id / job_id

## Logging
- JSON structured logs
- Redaction for secrets/PII
- Tenant id + provider + correlation id in every log line

## Dashboards
- Platform overview
- Provider health
- Commerce jobs
- Ads control loop
- Webhooks health
