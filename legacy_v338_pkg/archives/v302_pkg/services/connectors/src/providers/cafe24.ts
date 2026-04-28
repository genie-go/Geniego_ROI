import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { errResp, okResp, requireFields } from "./commerce_common.js";

/**
 * cafe24 connector — commercial-grade scaffold.
 * Auth: OAuth2 bearer (Cafe24 API).
 *
 * Required creds: mall_id, access_token
 * Provide a correct `base_url` for your region/sandbox if needed.
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["mall_id", "access_token"], "cafe24");
  return { ...c, base_url: c.base_url || c.baseUrl || "" };
}

export const cafe24Adapter: ProviderAdapter = {
  name: "cafe24",
  async execute(p: ExecutePayload) {
    try {
      const kind = p.payload.kind;
      const _creds = cfg(p.payload.creds);
      const _data = p.payload.data || {};

      // This repo ships an ops-ready queue/worker + credential storage + mapping points.
      // Channel-specific endpoints and compliance rules vary; finalize endpoints in this adapter.
      if (p.action_type === "fetch_orders") {
        return okResp(p, "cafe24", { orders: [] }, { kind, note: "implement real API calls + pagination" });
      }
      if (p.action_type === "sync_inventory") {
        return okResp(p, "cafe24", { successes: [], failures: [] }, { kind, note: "implement inventory sync" });
      }
      if (p.action_type === "upsert_products") {
        return okResp(p, "cafe24", { successes: [], failures: [] }, { kind, note: "implement product upsert" });
      }
      if (p.action_type === "update_prices") {
        return okResp(p, "cafe24", { successes: [], failures: [] }, { kind, note: "implement price update" });
      }
      return errResp(p, "cafe24", `unsupported_action:${p.action_type}`);
    } catch (e: any) {
      return errResp(p, "cafe24", e?.message || "error");
    }
  },
};
