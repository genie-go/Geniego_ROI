# V260 Upgrade Plan — Converting weaknesses into strengths (implementation guide)

## 1) Real integrations (Meta + Naver) — make it a strength
Deliverables:
- OAuth/token refresh + secret management (vault/ssm)
- Quota handling (429) + retries with jitter
- Idempotency: execution_id becomes request dedupe key
- Snapshot-before-change in `connector_snapshots`
- Rollback uses snapshot to revert
- Contract tests per channel (golden files)

Where:
- `services/connectors/src/adapters/meta/`
- `services/connectors/src/adapters/naver/`

## 2) AI accuracy — make it a strength
Deliverables:
- Offline evaluation (backtests, calibration curves, confidence reliability)
- Online shadow-mode uplift measurement and gating
- Segment-aware policies (brand vs performance, SKU, geo)
- Human-in-the-loop overrides and feedback loop

## 3) Enterprise ops
Deliverables:
- Real auth (OIDC/SAML) replacing header RBAC
- Audit log export
- Alerting (DLQ, failure rate) + dashboards (Grafana)
- SLOs and incident playbooks
