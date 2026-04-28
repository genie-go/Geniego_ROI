# V254 Architecture

## Services
- **gateway** (Go): `/v254/workflows/run`, `/v254/executions/{id}`
- **ai** (Python/FastAPI): `/v254/ai/recommend`
- **connectors** (Node/Express): `/v254/connectors/{channel}/execute`, `/v254/connectors/{channel}/rollback`

## Control-plane vs data-plane
- Gateway is the control-plane: approval, policy, audit, outbox
- Connectors are the data-plane: interact with channel APIs (currently safe stub)

## Safety defaults
- `DRY_RUN=true`: connectors will *not* call external APIs
- `AUTO_EXECUTE=false`: even with high confidence, requires manual approval pathway in production

## Rollback strategy
1. Gateway stores a pre-change **snapshot** returned by connectors (or from last sync).
2. On partial failure, Gateway issues rollback calls for channels that succeeded or mutated state.
3. All actions are recorded in `audit_log`.

## Capability matrix
Connectors expose capabilities so the optimizer can generate a plan that each channel can execute.

## Next steps for real production
- Implement OAuth/token refresh & quota management per channel adapter
- Add circuit breaker + backoff + DLQ for connector calls
- Add shadow-mode experiments and lift evaluation pipeline
