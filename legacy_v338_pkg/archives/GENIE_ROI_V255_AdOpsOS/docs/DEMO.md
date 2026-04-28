## Run
```bash
cp .env.example .env
docker compose up --build
```

## Trigger a workflow
```bash
curl -s -X POST http://localhost:8080/v254/workflows/run \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id":"demo",
    "user_id":"alice",
    "objective":"maximize_roas",
    "budget_delta_limit_pct":20,
    "channels":["meta","google","naver"]
  }'
```

## Inspect an execution
```bash
curl -s http://localhost:8080/v254/executions/<execution_id>
```
