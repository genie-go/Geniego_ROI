# Demo commands

## Run workflow
```bash
curl -s -X POST http://localhost:8080/v256/workflows/run \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-123" \
  -d '{
    "tenant_id":"demo",
    "user_id":"alice",
    "objective":"maximize_roas",
    "budget_delta_limit_pct":20,
    "channels":["meta","google","naver"],
    "shadow_mode": true
  }' | jq
```

## Approve
```bash
curl -s -X POST http://localhost:8080/v256/executions/approve \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"<EXEC_ID>","approver_id":"manager1"}' | jq
```

## Status
```bash
curl -s http://localhost:8080/v256/executions/<EXEC_ID> | jq
```

## Connector direct (stub)
```bash
curl -s -X POST http://localhost:3000/v256/connectors/execute \
  -H "Content-Type: application/json" \
  -d '{"execution_id":"x","channel":"meta","actions":[{"type":"BUDGET_DELTA_PCT","value":5}]}' | jq
```
