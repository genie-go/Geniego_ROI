import { ExecutePayload, ProviderAdapter } from "../contracts.js";

export const sesAdapter: ProviderAdapter = {
  name: "ses",
  async execute(p: ExecutePayload) {
    // TODO: Implement provider API call.
    // - Validate credentials from env
    // - Map payload to provider request
    // - Optionally fetch BEFORE snapshot for rollback (ads/crm)
    // - Return evidence (ids), snapshot (before), applied (after)

    return {
      ok: true,
      provider: "ses",
      channel: "email",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { provider: "ses", note: "stub execute" },

      applied: { payload: p.payload },
      warning: "Stub adapter. Wire real provider calls."
    };
  },

};
