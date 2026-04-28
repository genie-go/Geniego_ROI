# Adapter template (how to implement a real channel integration safely)

## Required functions
- `execute({execution_id, channel, actions, dry_run, cap})`
- `rollback({execution_id, channel, dry_run})`

## Safety checklist before enabling real calls
1) Idempotency
- Ensure the same `execution_id` won't apply changes twice.
- Keep a "snapshot before change" for rollback.

2) Quota + retries
- Handle 429 and transient failures with exponential backoff.

3) Policy translation
- Convert generic actions (e.g., BUDGET_DELTA_PCT) into channel-specific objects.

4) Auditability
- Return structured details: what entity IDs changed, from/to values.

5) DRY_RUN behavior
- When dry_run=true, never call external APIs. Only simulate and return plan.
