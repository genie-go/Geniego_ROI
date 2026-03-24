
# V241 Enterprise Upgrade Notes

## New in V241
- Budget Execution Layer (Real Execution Ready Structure)
- Multi-tenant SaaS Schema Blueprint
- RBAC Role Model (Admin / Operator / Viewer)
- Metering & Usage Billing Design
- Advanced Anomaly Framework (7/14/28 baseline logic blueprint)
- Enterprise Security Layer (OIDC, Vault, Token Rotation)
- Observability Stack Design (Prometheus + OpenTelemetry ready)

## Execution Model
Recommendation -> Approval -> Event Bus -> Worker Execution -> Audit Log

## SaaS Architecture
- API Layer (FastAPI)
- Event Layer (Kafka)
- Worker Cluster
- PostgreSQL (Tenant-aware schema)
- Redis (Cache + Locking)
- Object Storage (Snapshots)

## Monetization
- Per Ad Account pricing
- Per Managed Spend pricing
- AI Optimization Tier pricing
