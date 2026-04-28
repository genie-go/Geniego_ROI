import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { buildQuery, errResp, isExpired, jsonFetch, normalizeClaim, normalizeInventoryRow, normalizeOrderV304, normalizeProduct, oauthRefresh, okResp, requireFields } from "./commerce_common.js";

/**
 * Naver SmartStore connector (V304)
 *
 * NOTE: SmartStore "Commerce API" access and endpoints vary by partner program.
 * This adapter is implemented as a production-ready HTTP client shell:
 *  - OAuth refresh flow
 *  - Cursor/offset pagination helpers
 *  - Normalized order/claim shapes
 *
 * To fully productionize, set:
 *   creds.api_base   e.g. https://api.commerce.naver.com (example)
 *   creds.token_base e.g. https://nid.naver.com (example)
 *   creds.token_path e.g. /oauth2.0/token
 *
 * Creds:
 *   client_id, client_secret, refresh_token
 *   api_base, token_base, token_path
 *   access_token (optional), token_expires_at (optional)
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["client_id","client_secret","refresh_token","api_base","token_base","token_path"], "naver_smartstore");
  return { ...c };
}

function bearer(at: string) {
  return { "Authorization": `Bearer ${at}`, "Content-Type":"application/json" };
}

async function ensureToken(c: any) {
  if (!c.access_token || isExpired(c.token_expires_at)) {
    const { token, evidence } = await oauthRefresh(c.token_base, c.token_path, {
      grant_type: "refresh_token",
      refresh_token: c.refresh_token,
      client_id: c.client_id,
      client_secret: c.client_secret,
    });
    return { access_token: token.access_token, refresh_token: token.refresh_token || c.refresh_token, token_expires_at: token.expires_at, evidence, refreshed: true };
  }
  return { access_token: c.access_token, refresh_token: c.refresh_token, token_expires_at: c.token_expires_at, evidence: {}, refreshed: false };
}

export const naver_smartstoreAdapter: ProviderAdapter = {
  provider: "naver_smartstore",
  async execute(p: ExecutePayload) {
    try {
      const c = cfg(p.payload?.creds || {});
      const tok = await ensureToken(c);
      const at = tok.access_token;

      if (p.action_type === "upsert_products") {
        const products = (p.payload?.data?.products || []);
        const resp = okResp(p, "naver_smartstore", { products: products.map(normalizeProduct) }, { note: "V304: product upsert scaffolded; map to SmartStore product registration endpoints." }, "partial_impl");
        if (tok.refreshed) (resp as any).applied.tokens = { access_token: at, refresh_token: tok.refresh_token, token_expires_at: tok.token_expires_at };
        return resp;
      }

      if (p.action_type === "update_prices") {
        const prices = (p.payload?.data?.prices || []);
        const resp = okResp(p, "naver_smartstore", { prices }, { note: "V304: price update scaffolded." }, "partial_impl");
        if (tok.refreshed) (resp as any).applied.tokens = { access_token: at, refresh_token: tok.refresh_token, token_expires_at: tok.token_expires_at };
        return resp;
      }

      if (p.action_type === "fetch_orders") {
        // Generic order pull shell; actual paths must be supplied via payload or configured per tenant.
        const orders_path = p.payload?.data?.orders_path || "/orders";
        const qs = buildQuery({ from: p.payload?.data?.from, to: p.payload?.data?.to, status: p.payload?.data?.status, page: p.payload?.data?.page, size: p.payload?.data?.size });
        const url = `${c.api_base}${orders_path}${qs ? "?" + qs : ""}`;
        const r = await jsonFetch(url, { method:"GET", headers: bearer(at) }, 2);
        if (r.status >= 400) throw new Error(`naver_orders_failed:${r.status}`);
        const orders = (r.json?.orders || r.json?.data || []).map(normalizeOrderV304);

        // Claims shell
        const claims_path = p.payload?.data?.claims_path;
        const claims: any[] = [];
        const claimEvents: any[] = [];
        if (claims_path) {
          const cq = buildQuery({ from: p.payload?.data?.from, to: p.payload?.data?.to });
          const cu = `${c.api_base}${claims_path}${cq ? "?" + cq : ""}`;
          const cr = await jsonFetch(cu, { method:"GET", headers: bearer(at) }, 1);
          if (cr.status < 400) {
            for (const it of (cr.json?.claims || cr.json?.data || [])) {
              const norm = normalizeClaim(it);
              claims.push(norm);
              claimEvents.push({ event_type: norm.claim_type || "claim", occurred_at: norm.occurred_at, order: { order_id: it.orderId || it.order_id }, claim: norm });
            }
          }
        }

        const resp = okResp(p, "naver_smartstore", { orders, order_events: claimEvents, claims }, { orders_url: url, status: r.status });
        if (tok.refreshed) (resp as any).applied.tokens = { access_token: at, refresh_token: tok.refresh_token, token_expires_at: tok.token_expires_at };
        return resp;
      }

      if (p.action_type === "sync_inventory") {
        const inventory = (p.payload?.data?.inventory || []).map(normalizeInventoryRow);
        const resp = okResp(p, "naver_smartstore", { inventory }, { note: "V304: inventory sync scaffolded." }, "partial_impl");
        if (tok.refreshed) (resp as any).applied.tokens = { access_token: at, refresh_token: tok.refresh_token, token_expires_at: tok.token_expires_at };
        return resp;
      }

      return errResp(p, "naver_smartstore", `unsupported_action:${p.action_type}`);
    } catch (e: any) {
      return errResp(p, "naver_smartstore", e?.message || "naver_smartstore_error");
    }
  },
};
