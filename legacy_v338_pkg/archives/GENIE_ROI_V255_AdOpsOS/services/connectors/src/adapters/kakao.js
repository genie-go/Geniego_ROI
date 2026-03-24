const CHANNEL = "kakao";

/**
 * Safe stub adapter:
 * - No external API calls are performed.
 * - Returns a deterministic-ish result for demos.
 * Implement real calls here, including:
 *  - auth/token refresh
 *  - quota handling
 *  - idempotency keys
 *  - snapshot capture before mutate
 *  - rollback restore
 */
function now() { return new Date().toISOString(); }

async function execute(payload) {
  return {
    ok: true,
    channel: CHANNEL,
    dry_run: !!payload.dry_run,
    execution_id: payload.execution_id,
    applied: payload.dry_run ? [] : ["(stub) would apply budget changes"],
    snapshot: { captured_at: now(), note: "(stub) snapshot" }
  };
}

async function rollback(payload) {
  return {
    ok: true,
    channel: CHANNEL,
    dry_run: !!payload.dry_run,
    execution_id: payload.execution_id,
    rolled_back: payload.dry_run ? [] : ["(stub) would rollback changes"],
    at: now()
  };
}

module.exports = { execute, rollback };
