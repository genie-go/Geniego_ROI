import { ExecutePayload, ProviderAdapter } from "../contracts.js";

export const metaAdapter: ProviderAdapter = {
  name: "meta",
  async execute(p: ExecutePayload) {
    // TODO: Implement provider API call.
    // - Validate credentials from env
    // - Map payload to provider request
    // - Optionally fetch BEFORE snapshot for rollback (ads/crm)
    // - Return evidence (ids), snapshot (before), applied (after)

    return {
      ok: true,
      provider: "meta",
      channel: "ads",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { provider: "meta", note: "stub execute" },
      snapshot: { before: 'stub' },
      applied: { payload: p.payload },
      warning: "Stub adapter. Wire real provider calls."
    };
  },
async rollback(p, snapshot) {
  return {
    ok: true,
    provider: "meta",
    channel: "ads",
    action_type: "ROLLBACK",
    execution_id: p.execution_id,
    timestamp: new Date().toISOString(),
    evidence: { note: "rollback stub", snapshot },
    applied: { reverted: true },
    warning: "Stub rollback. Implement real provider rollback."
  };
},

};
