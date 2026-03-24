import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { buildQuery, errResp, isExpired, jsonFetch, normalizeClaim, normalizeInventoryRow, normalizeOrderV304, normalizeProduct, oauthRefresh, okResp, paginateOffset, requireFields } from "./commerce_common.js";

/**
 * Cafe24 Admin API provider (V304).
 * - Auth: OAuth2 bearer (access token), refresh token.
 * - Base URL: https://{mall_id}.cafe24api.com
 * - Pagination: limit/offset.
 * - Rate limit: leaky-bucket (429) handled by jsonFetch retries.
 *
 * Creds:
 *   mall_id, client_id, client_secret
 *   access_token (optional), refresh_token (optional), token_expires_at (optional)
 *   base_url (optional) - defaults to https://{mall_id}.cafe24api.com
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["mall_id","client_id","client_secret"], "cafe24");
  const base = c.base_url || `https://${c.mall_id}.cafe24api.com`;
  return { ...c, base_url: base };
}

function bearer(at: string) {
  return { "Authorization": `Bearer ${at}`, "Content-Type":"application/json" };
}

async function ensureToken(c: any) {
  if (!c.access_token || isExpired(c.token_expires_at)) {
    // NOTE: Cafe24 token endpoint is /api/v2/oauth/token (OAuth2). Exact body depends on grant type.
    // We keep a minimal JSON-based refresh helper; many deployments use x-www-form-urlencoded + Basic auth.
    const { token, evidence } = await oauthRefresh(c.base_url, "/api/v2/oauth/token", {
      grant_type: "refresh_token",
      refresh_token: c.refresh_token || "",
      client_id: c.client_id,
      client_secret: c.client_secret,
    });
    return { access_token: token.access_token, refresh_token: token.refresh_token, token_expires_at: token.expires_at, evidence, refreshed: true };
  }
  return { access_token: c.access_token, refresh_token: c.refresh_token, token_expires_at: c.token_expires_at, evidence: {}, refreshed: false };
}

async function upsertProducts(p: ExecutePayload, c: any, at: string) {
  const products = (p.payload?.data?.products || []);
  // Cafe24 product creation/update requires detailed schema; keeping safe pass-through.
  return okResp(p, "cafe24", { products: products.map(normalizeProduct) }, { note: "V304: product upsert scaffolded; map to /api/v2/admin/products with variants/inventories as needed." }, "partial_impl");
}

async function updatePrices(p: ExecutePayload, c: any, at: string) {
  const prices = (p.payload?.data?.prices || []);
  return okResp(p, "cafe24", { prices }, { note: "V304: price update scaffolded; map to products/variants pricing fields." }, "partial_impl");
}

async function fetchOrders(p: ExecutePayload, c: any, at: string) {
  const limit = Number(p.payload?.data?.limit ?? 100);
  const maxPages = Number(p.payload?.data?.max_pages ?? 20);

  // Orders list
  const ordersPath = "/api/v2/admin/orders";
  const ordersPaged = await paginateOffset<any>(async (l, offset) => {
    const qs = buildQuery({ limit: l, offset, start_date: p.payload?.data?.start_date, end_date: p.payload?.data?.end_date });
    const url = `${c.base_url}${ordersPath}?${qs}`;
    const r = await jsonFetch(url, { method:"GET", headers: bearer(at) });
    if (r.status >= 400) throw new Error(`cafe24_orders_failed:${r.status}`);
    const items = r.json?.orders || r.json?.data || [];
    return { items, raw: { url, status: r.status } };
  }, { limit, maxPages });

  const orders = ordersPaged.items.map(normalizeOrderV304);

  // Claims (cancel/return/exchange) are exposed in claim resources; exact paths vary by version.
  // We attempt the common pattern by checking known endpoints. If not available, we return evidence with warning.
  const claims: any[] = [];
  const claimEvents: any[] = [];
  const tried: any[] = [];

  async function tryClaimEndpoint(path: string, claimType: string) {
    const qs = buildQuery({ limit, offset: 0, start_date: p.payload?.data?.start_date, end_date: p.payload?.data?.end_date });
    const url = `${c.base_url}${path}?${qs}`;
    tried.push({ path, url });
    const r = await jsonFetch(url, { method:"GET", headers: bearer(at) }, 1);
    if (r.status >= 400) return;
    const items = (r.json?.claims || r.json?.returns || r.json?.exchanges || r.json?.cancellations || r.json?.data || []);
    for (const it of items) {
      const norm = normalizeClaim({ ...it, claimType });
      claims.push(norm);
      claimEvents.push({
        event_type: claimType === "cancel" ? "cancelled" : (claimType === "exchange" ? "exchanged" : "returned"),
        occurred_at: norm.occurred_at,
        order: { order_id: it.order_id || it.orderId || it.order_no || it.order?.order_id || it.order?.orderId, raw: it },
        claim: norm,
        claim_type: norm.claim_type,
        claim_status: norm.claim_status,
        reason_code: norm.reason_code,
        reason_text: norm.reason_text,
      });
    }
  }

  await tryClaimEndpoint("/api/v2/admin/orders/claims", "claim");   // some malls expose unified claims
  await tryClaimEndpoint("/api/v2/admin/orders/cancellations", "cancel");
  await tryClaimEndpoint("/api/v2/admin/orders/returns", "return");
  await tryClaimEndpoint("/api/v2/admin/orders/exchanges", "exchange");

  const orderEvents = orders.map((o: any) => ({ event_type: "created", occurred_at: o.ordered_at, order: o }));

  return okResp(
    p,
    "cafe24",
    { orders, order_events: [...orderEvents, ...claimEvents], claims },
    { pages: ordersPaged.pages, claims_tried: tried }
  );
}

async function syncInventory(p: ExecutePayload, c: any, at: string) {
  const inventory = (p.payload?.data?.inventory || []);
  // Cafe24 supports inventories resource; keep safe scaffold.
  return okResp(p, "cafe24", { inventory: inventory.map(normalizeInventoryRow) }, { note: "V304: inventory sync scaffolded; map to /api/v2/admin/products/{product_no}/inventories or variants/inventories." }, "partial_impl");
}

export const cafe24Adapter: ProviderAdapter = {
  provider: "cafe24",
  async execute(p: ExecutePayload) {
    try {
      const c = cfg(p.payload?.creds || {});
      const tok = await ensureToken(c);
      const at = tok.access_token;

      let resp;
      if (p.action_type === "upsert_products") resp = await upsertProducts(p,c,at);
      else if (p.action_type === "update_prices") resp = await updatePrices(p,c,at);
      else if (p.action_type === "fetch_orders") resp = await fetchOrders(p,c,at);
      else if (p.action_type === "sync_inventory") resp = await syncInventory(p,c,at);
      else resp = errResp(p, "cafe24", `unsupported_action:${p.action_type}`);

      // bubble up refreshed token for persistence
      if (tok.refreshed) {
        (resp as any).applied = (resp as any).applied || {};
        (resp as any).applied.tokens = {
          access_token: tok.access_token,
          refresh_token: tok.refresh_token,
          token_expires_at: tok.token_expires_at,
        };
        (resp as any).evidence = { ...(resp as any).evidence, token_refresh: tok.evidence };
      }
      return resp;
    } catch (e: any) {
      return errResp(p, "cafe24", e?.message || "cafe24_error");
    }
  },
};
