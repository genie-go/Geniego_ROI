# GENIE ROI AdOps OS — V244 (Multi-channel + Advanced AI + SaaS-ready)

## Highlights
- SaaS-ready stack: **Postgres + Redis + Kafka + Backend + Worker + Frontend**
- Multi-channel connector framework (Google/Meta/TikTok/Naver/Kakao)
- Advanced AI baselines (IsolationForest anomaly + marginal optimizer)
- Governance: RBAC, tenant isolation, audit trail, dry-run, guardrails
- ZIP-friendly UI: `/dashboard` + Swagger `/docs`

## Run (Docker)
```bash
docker compose -f deploy/docker-compose.yml up --build
```
- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Dashboard: http://localhost:8080/dashboard
- Swagger: http://localhost:8080/docs
- Metrics: http://localhost:8080/metrics

## Try (API)
Headers:
- `X-Tenant-Id: demo`
- `X-Role: admin`

Examples:
```bash
curl -H "X-Tenant-Id: demo" -H "X-Role: viewer" http://localhost:8080/v244/connectors
curl -H "X-Tenant-Id: demo" -H "X-Role: viewer" http://localhost:8080/v244/campaigns/google/acc1
```

## Notes on "완전 실연동"
Google is real-mode capable via google-ads SDK.
Meta/TikTok include real-mode templates but budget mutation is policy/structure dependent.
Naver/Kakao provide signing blueprints and stubs pending account/API enablement.

See:
- docs/MULTICHANNEL_REAL_INTEGRATION.md
- docs/AI_MODEL_GOVERNANCE.md
- docs/SAAS_ARCHITECTURE_V244.md


## V245 Added
- Outbox publisher endpoint: `POST /v245/outbox/publish`
- Worker executes multi-channel `UPDATE_DAILY_BUDGET` from Kafka
- See `docs/V245_EXECUTION_GUIDE.md`


## V250 Added
- Federated learning (FedAvg) baseline API: POST /v250/ai/federated/fedavg
- KPI forecasting API: POST /v250/ai/forecast/kpi
- Competitor scoring API: POST /v250/market/competitors/score
- Governance docs + IPO financial model template


## V251 Added
- Execution plan API: POST /v251/execution/plan/budget
- KPI forecasting v2 (weekday seasonality + calendar): POST /v251/ai/forecast/kpi/v2
- Federated FedAvg with DP switch: POST /v251/ai/federated/fedavg_secure
- Playbooks in docs/
