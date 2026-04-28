# Contract schemas (V258)

## Workflow run request
```json
{
  "tenant_id":"string",
  "user_id":"string",
  "objective":"maximize_roas|minimize_cac|...",
  "budget_delta_limit_pct": 20,
  "channels":["meta","google","naver"],
  "shadow_mode": true
}
```

## AI response
```json
{
  "confidence": 0.0,
  "explain": ["..."],
  "risks": ["..."],
  "actions": [{"type":"BUDGET_DELTA_PCT","value":5}],
  "meta": {}
}
```

## Connector execute request
```json
{
  "execution_id":"...",
  "channel":"meta",
  "actions":[{"type":"BUDGET_DELTA_PCT","value":5}],
  "dry_run": true
}
```
