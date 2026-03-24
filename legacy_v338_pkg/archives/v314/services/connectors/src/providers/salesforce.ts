import { ExecutePayload, ProviderAdapter } from "../contracts.js";

export const salesforceAdapter: ProviderAdapter = {
  name: "salesforce",
  async execute(p: ExecutePayload) {
    return {
      ok: true,
      provider: "salesforce",
      channel: "crm",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { note: "skeleton adapter" },
      applied: { payload: p.payload },
      warning: "Skeleton adapter. Implement real provider calls."
    };
  },
};
