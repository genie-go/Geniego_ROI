# V253 Productized SaaS UI + Automation

## UI
- `/ui/index.html` : SaaS-grade lightweight SPA
- Real-time updates via SSE: `/v253/stream/events`
- KPI summary: `/v253/metrics/summary`
- Reports: `/v253/reports/latest` and `/v253/reports/{id}`

## One-click pipeline
- POST `/v253/workflows/run`
  - KPI forecast
  - anomaly check
  - budget recommendations
  - HTML report generation

## Pricing simulation
- POST `/v253/pricing/simulate`
  - ARPA, churn, CAC, NRR 기반으로 24개월 타임라인 생성

## Production tips
- Replace in-process event log with Redis pubsub or Kafka -> websocket gateway
- Replace synthetic KPI summary with DB aggregation from snapshots
