import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { errResp, isExpired, jsonFetch, normalizeInventoryRow, normalizeOrder, normalizeProduct, oauthRefresh, okResp, requireFields } from "./commerce_common.js";

/**
 * Naver SmartStore provider (V303).
 * - Auth: OAuth2 bearer with refresh token flow.
 * - Default base_url points to included MOCK server for end-to-end tests.
 *
 * Creds (minimum):
 *   client_id, client_secret, access_token, refresh_token, token_expires_at
 *   base_url (optional) default: http://mock_korea_commerce_api:9300
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["client_id","client_secret"], "naver_smartstore");
  return { ...c, base_url: c.base_url || "http://mock_korea_commerce_api:9300" };
}

async function ensureToken(p: ExecutePayload, c: any) {
  // If token missing or expired, refresh using mock endpoint (replace with real Naver token endpoint in production)
  if (!c.access_token || isExpired(c.token_expires_at)) {
    const { token, evidence } = await oauthRefresh(c.base_url, "/oauth/naver/token", {
      client_id: c.client_id, client_secret: c.client_secret, refresh_token: c.refresh_token || "rt-demo"
    });
    return { access_token: token.access_token, refresh_token: token.refresh_token, token_expires_at: token.expires_at, evidence, refreshed: true };
  }
  return { access_token: c.access_token, refresh_token: c.refresh_token, token_expires_at: c.token_expires_at, evidence: {}, refreshed: false };
}

function bearer(at: string) {
  return { "Authorization": `Bearer ${at}`, "Content-Type":"application/json" };
}

async function upsertProducts(p: ExecutePayload, c: any, at: string) {
  const products = (p.payload?.data?.products || []);
  const url = `${c.base_url}/api/naver_smartstore/products`;
  const r = await jsonFetch(url, { method:"POST", headers: bearer(at), body: JSON.stringify({ products }) });
  if (r.status >= 400) throw new Error(`naver_products_failed:${r.status}`);
  return okResp(p, "naver_smartstore", { products: products.map(normalizeProduct) }, { url, status: r.status });
}

async function updatePrices(p: ExecutePayload, c: any, at: string) {
  const prices = (p.payload?.data?.prices || []);
  const url = `${c.base_url}/api/naver_smartstore/products`;
  const r = await jsonFetch(url, { method:"POST", headers: bearer(at), body: JSON.stringify({ products: prices }) });
  if (r.status >= 400) throw new Error(`naver_prices_failed:${r.status}`);
  return okResp(p, "naver_smartstore", { prices }, { url, status: r.status });
}

async function fetchOrders(p: ExecutePayload, c: any, at: string) {
  const url = `${c.base_url}/api/naver_smartstore/orders`;
  const r = await jsonFetch(url, { method:"GET", headers: bearer(at) });
  if (r.status >= 400) throw new Error(`naver_orders_failed:${r.status}`);
  const events = (r.json?.orders || []).map((e: any) => ({
    event_type: e.event_type || "created",
    occurred_at: e.occurred_at || new Date().toISOString(),
    order: normalizeOrder(e.order || e),
  }));
  return okResp(p, "naver_smartstore", { orders: events.map((e:any)=>e.order), order_events: events }, { url, status: r.status });
}

async function syncInventory(p: ExecutePayload, c: any, at: string) {
  const inventory = (p.payload?.data?.inventory || []);
  const url = `${c.base_url}/api/naver_smartstore/inventory`;
  const r = await jsonFetch(url, { method:"POST", headers: bearer(at), body: JSON.stringify({ inventory }) });
  if (r.status >= 400) throw new Error(`naver_inventory_failed:${r.status}`);
  return okResp(p, "naver_smartstore", { inventory: inventory.map(normalizeInventoryRow) }, { url, status: r.status });
}

export const naverSmartstoreAdapter: ProviderAdapter = {
  provider: "naver_smartstore",
  async execute(p: ExecutePayload) {
    try {
      const c = cfg(p.payload?.creds || {});
      const tok = await ensureToken(p,c);
      const at = tok.access_token;

      let resp;
      if (p.action_type === "upsert_products") resp = await upsertProducts(p,c,at);
      else if (p.action_type === "update_prices") resp = await updatePrices(p,c,at);
      else if (p.action_type === "fetch_orders") resp = await fetchOrders(p,c,at);
      else if (p.action_type === "sync_inventory") resp = await syncInventory(p,c,at);
      else return errResp(p, "naver_smartstore", `unsupported_action:${p.action_type}`);

      // Return tokens to persist if refreshed
      if (tok.refreshed) {
        resp.applied = resp.applied || {};
        resp.applied.tokens = { access_token: tok.access_token, refresh_token: tok.refresh_token, token_expires_at: tok.token_expires_at };
        resp.evidence = { ...(resp.evidence||{}), token_refresh: tok.evidence };
      }
      return resp;
    } catch (e: any) {
      return errResp(p, "naver_smartstore", e?.message || String(e));
    }
  },
};
