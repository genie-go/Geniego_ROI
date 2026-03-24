import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { errResp, okResp, requireFields } from "./commerce_common.js";

/**
 * coupang connector — commercial-grade scaffold.
 * Auth: HMAC signature (Coupang Open API).
 *
 * Required creds: access_key, secret_key, vendor_id
 * Provide a correct `base_url` for your region/sandbox if needed.
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["access_key", "secret_key", "vendor_id"], "coupang");
  return { ...c, base_url: c.base_url || c.baseUrl || "" };
}

export const coupangAdapter: ProviderAdapter = {
  name: "coupang",
  async execute(p: ExecutePayload) {
    try {
      const kind = p.payload.kind;
      const _creds = cfg(p.payload.creds);
      const _data = p.payload.data || {};

      // This repo ships an ops-ready queue/worker + credential storage + mapping points.
      // Channel-specific endpoints and compliance rules vary; finalize endpoints in this adapter.
      if (p.action_type === "fetch_orders") {
        return okResp(p, "coupang", { orders: [] }, { kind, note: "implement real API calls + pagination" });
      }
      if (p.action_type === "sync_inventory") {
        return okResp(p, "coupang", { successes: [], failures: [] }, { kind, note: "implement inventory sync" });
      }
      if (p.action_type === "upsert_products") {
        return okResp(p, "coupang", { successes: [], failures: [] }, { kind, note: "implement product upsert" });
      }
      if (p.action_type === "update_prices") {
        return okResp(p, "coupang", { successes: [], failures: [] }, { kind, note: "implement price update" });
      }
      return errResp(p, "coupang", `unsupported_action:${p.action_type}`);
    } catch (e: any) {
      return errResp(p, "coupang", e?.message || "error");
    }
  },
};
