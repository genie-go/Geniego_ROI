# V244 SaaS Architecture (Production conversion)

## Stack
- Backend: FastAPI + SQLAlchemy + Postgres
- Event: Kafka (outbox topic)
- Worker: Kafka consumer, executes approved jobs
- Cache/Locks: Redis
- Observability: Prometheus / OTel instrumentation ready
- Frontend: minimal Express (replace with Next.js/React later)

## Tenant model
- Request headers X-Tenant-Id, X-Role used for demo
- Production: JWT (OIDC), tenant in token claims
- DB: tenant_id column enforced by query filters / RLS

## Deploy
`docker compose -f deploy/docker-compose.yml up --build`
- Frontend: http://localhost:3000
- Backend: http://localhost:8080 (Swagger at /docs)
- Backend UI: http://localhost:8080/dashboard
