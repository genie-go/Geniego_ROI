import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { errResp, okResp, requireFields } from "./commerce_common.js";

/**
 * naver_smartstore connector — commercial-grade scaffold.
 * Auth: OAuth2 bearer (Naver Commerce/SmartStore APIs).
 *
 * Required creds: client_id, client_secret, access_token
 * Provide a correct `base_url` for your region/sandbox if needed.
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["client_id", "client_secret", "access_token"], "naver_smartstore");
  return { ...c, base_url: c.base_url || c.baseUrl || "" };
}

export const naver_smartstoreAdapter: ProviderAdapter = {
  name: "naver_smartstore",
  async execute(p: ExecutePayload) {
    try {
      const kind = p.payload.kind;
      const _creds = cfg(p.payload.creds);
      const _data = p.payload.data || {};

      // This repo ships an ops-ready queue/worker + credential storage + mapping points.
      // Channel-specific endpoints and compliance rules vary; finalize endpoints in this adapter.
      if (p.action_type === "fetch_orders") {
        return okResp(p, "naver_smartstore", { orders: [] }, { kind, note: "implement real API calls + pagination" });
      }
      if (p.action_type === "sync_inventory") {
        return okResp(p, "naver_smartstore", { successes: [], failures: [] }, { kind, note: "implement inventory sync" });
      }
      if (p.action_type === "upsert_products") {
        return okResp(p, "naver_smartstore", { successes: [], failures: [] }, { kind, note: "implement product upsert" });
      }
      if (p.action_type === "update_prices") {
        return okResp(p, "naver_smartstore", { successes: [], failures: [] }, { kind, note: "implement price update" });
      }
      return errResp(p, "naver_smartstore", `unsupported_action:${p.action_type}`);
    } catch (e: any) {
      return errResp(p, "naver_smartstore", e?.message || "error");
    }
  },
};
