
# V309 Integration Test Harness

## Goals
- Contract tests for provider adapters (ads/commerce)
- Replayable fixtures
- Mock servers for providers to run CI without real credentials

## Suggested tools
- pytest + responses/vcrpy (python)
- k6 for load/perf
- Postman/newman for smoke tests

## Workflow
1) Spin up mock provider containers
2) Run adapter contract tests
3) Run end-to-end flows (orders sync -> events -> inventory reservations)
4) Run ads control dry-run then live (requires secrets in CI)
