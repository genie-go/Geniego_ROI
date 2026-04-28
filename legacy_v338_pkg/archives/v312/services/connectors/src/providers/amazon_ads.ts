import { ExecutePayload, ProviderAdapter } from "../contracts.js";

export const amazon_adsAdapter: ProviderAdapter = {
  name: "amazon_ads",
  async execute(p: ExecutePayload) {
    return {
      ok: true,
      provider: "amazon_ads",
      channel: "ads",
      action_type: p.action_type,
      execution_id: p.execution_id,
      timestamp: new Date().toISOString(),
      evidence: { note: "skeleton adapter" },
      applied: { payload: p.payload },
      warning: "Skeleton adapter. Implement real provider calls."
    };
  },
};
