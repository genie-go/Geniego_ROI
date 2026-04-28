# Meta adapter template (V260)

Implement here:
- OAuth (system user token) + refresh strategy
- Entity mapping: campaign/adset budgets
- Idempotency: map execution_id -> change set
- Snapshot-before-change: persist current budgets in `connector_snapshots`
- Rollback: revert to snapshot

Return structured audit detail:
- entity IDs changed
- from/to values
- request IDs
