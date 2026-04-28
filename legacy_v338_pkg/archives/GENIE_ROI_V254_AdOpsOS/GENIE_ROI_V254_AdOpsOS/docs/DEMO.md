# Demo (curl)

## Run workflow
```bash
curl -s http://localhost:8080/v254/workflows/run \
  -H 'Content-Type: application/json' \
  -d '{
    "tenant_id":"demo",
    "actor":"ops@company",
    "channel":"meta",
    "objective":"roas",
    "current_budget":100000,
    "proposed_budget":112000,
    "currency":"KRW",
    "metadata":{"roas_trend":0.4,"cvr_trend":0.2,"recent_api_error_rate":0.01}
  }'
```

## Query execution
```bash
curl -s http://localhost:8080/v254/executions/<execution_id>
```

## Force fail (rollback test)
```bash
curl -s http://localhost:8080/v254/workflows/run \
  -H 'Content-Type: application/json' \
  -d '{
    "tenant_id":"demo",
    "actor":"ops@company",
    "channel":"meta",
    "objective":"roas",
    "current_budget":100000,
    "proposed_budget":110000,
    "currency":"KRW",
    "metadata":{"force_fail":true,"roas_trend":0.4}
  }'
```
