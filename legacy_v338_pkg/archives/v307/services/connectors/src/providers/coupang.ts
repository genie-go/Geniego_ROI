import crypto from "crypto";
import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { buildQuery, errResp, jsonFetch, normalizeClaim, normalizeInventoryRow, normalizeOrderV304, normalizeProduct, okResp, requireFields } from "./commerce_common.js";

/**
 * Coupang OpenAPI provider (V304).
 *
 * Auth (per Coupang OpenAPI HMAC guide):
 *  - Authorization: "CEA algorithm=HmacSHA256, access-key=..., signed-date=yyMMdd'T'HHmmss'Z', signature=..."
 *  - signature = HMAC_SHA256(secretKey, signedDate + method + path + queryString)
 *  - Host: https://api-gateway.coupang.com
 *
 * Creds:
 *   access_key, secret_key, vendor_id
 *   base_url (optional) default: https://api-gateway.coupang.com
 *   requested_by (optional) default: vendor_id (some endpoints require X-Requested-By)
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["access_key","secret_key","vendor_id"], "coupang");
  return {
    ...c,
    base_url: c.base_url || "https://api-gateway.coupang.com",
    requested_by: c.requested_by || c.vendor_id,
  };
}

function signedDate(): string {
  // yyMMddTHHmmssZ in GMT
  const d = new Date();
  const yy = String(d.getUTCFullYear()).slice(-2);
  const MM = String(d.getUTCMonth() + 1).padStart(2,"0");
  const dd = String(d.getUTCDate()).padStart(2,"0");
  const hh = String(d.getUTCHours()).padStart(2,"0");
  const mm = String(d.getUTCMinutes()).padStart(2,"0");
  const ss = String(d.getUTCSeconds()).padStart(2,"0");
  return `${yy}${MM}${dd}T${hh}${mm}${ss}Z`;
}

function hmacHex(secret: string, msg: string) {
  return crypto.createHmac("sha256", secret).update(msg, "utf8").digest("hex");
}

function authHeaders(c: any, method: string, path: string, queryString: string) {
  const dt = signedDate();
  const msg = `${dt}${method.toUpperCase()}${path}${queryString || ""}`;
  const sig = hmacHex(c.secret_key, msg);
  const authorization = `CEA algorithm=HmacSHA256, access-key=${c.access_key}, signed-date=${dt}, signature=${sig}`;
  return {
    "Authorization": authorization,
    "Content-Type": "application/json;charset=UTF-8",
    "X-Requested-By": String(c.requested_by || ""),
  };
}

function defaultTimeframeISO(hoursBack = 6) {
  const to = new Date();
  const from = new Date(Date.now() - hoursBack * 3600 * 1000);
  // Coupang expects ISO-8601 with timezone; using +09:00 is common for KR. We accept UTC as well.
  return { from: from.toISOString(), to: to.toISOString() };
}

async function upsertProducts(p: ExecutePayload, c: any) {
  // NOTE: Coupang product registration APIs are extensive; V304 keeps V303 behavior but requires real endpoint mapping per SKU/product type.
  // We keep this as a "pass-through" to let teams implement mapping safely per category rules.
  const products = (p.payload?.data?.products || []);
  return okResp(p, "coupang", { products: (products || []).map(normalizeProduct) }, { note: "V304: product upsert is intentionally pass-through; implement per Coupang product APIs." }, "partial_impl");
}

async function updatePrices(p: ExecutePayload, c: any) {
  const prices = (p.payload?.data?.prices || []);
  return okResp(p, "coupang", { prices }, { note: "V304: price update requires seller-products modification API; scaffolded." }, "partial_impl");
}

async function fetchOrders(p: ExecutePayload, c: any) {
  const vendorId = c.vendor_id;
  const hoursBack = Number(p.payload?.data?.hours_back ?? 6);
  const tf = defaultTimeframeISO(hoursBack);

  // Ordersheets (supports splitShipping fields)
  const ordersPath = `/v2/providers/openapi/apis/api/v5/vendors/${vendorId}/ordersheets`;
  const ordersQs = buildQuery({
    createdAtFrom: p.payload?.data?.created_at_from || tf.from,
    createdAtTo: p.payload?.data?.created_at_to || tf.to,
    searchType: "timeFrame",
    status: p.payload?.data?.status || "ACCEPT", // ACCEPT|INSTRUCT|DEPARTURE|DELIVERING|FINAL_DELIVERY|NONE_TRACKING
  });
  const ordersUrl = `${c.base_url}${ordersPath}?${ordersQs}`;
  const ordersResp = await jsonFetch(ordersUrl, { method:"GET", headers: authHeaders(c,"GET",ordersPath,ordersQs) });
  if (ordersResp.status >= 400) throw new Error(`coupang_orders_failed:${ordersResp.status}`);

  const orders = (ordersResp.json?.data || ordersResp.json?.orders || []).map(normalizeOrderV304);

  // Claims are not included in ordersheets after completion; pull returns/cancels + exchanges separately.
  const claims: any[] = [];
  const claimEvents: any[] = [];

  // Return/Cancellation requests (v4)
  const rcPath = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/returnRequests`;
  const rcQs = buildQuery({
    createdAtFrom: p.payload?.data?.created_at_from || tf.from,
    createdAtTo: p.payload?.data?.created_at_to || tf.to,
    status: p.payload?.data?.return_status || undefined,
  });
  const rcUrl = `${c.base_url}${rcPath}?${rcQs}`;
  const rcResp = await jsonFetch(rcUrl, { method:"GET", headers: authHeaders(c,"GET",rcPath,rcQs) });
  if (rcResp.status < 400) {
    for (const r of (rcResp.json?.data || rcResp.json?.returnRequests || [])) {
      const norm = normalizeClaim({ ...r, claimType: (r.cancelType ? "cancel" : "return") });
      claims.push(norm);
      claimEvents.push({
        event_type: norm.claim_type === "cancel" ? "cancelled" : "returned",
        occurred_at: norm.occurred_at,
        order: { order_id: r.orderId || r.order_id || r.order?.orderId || r.orderId, raw: r.order || r },
        claim: norm,
        claim_type: norm.claim_type,
        claim_status: norm.claim_status,
        reason_code: norm.reason_code,
        reason_text: norm.reason_text,
      });
    }
  }

  // Exchange requests (v4)
  const exPath = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/exchangeRequests`;
  const exQs = buildQuery({
    createdAtFrom: p.payload?.data?.created_at_from || tf.from,
    createdAtTo: p.payload?.data?.created_at_to || tf.to,
  });
  const exUrl = `${c.base_url}${exPath}?${exQs}`;
  const exResp = await jsonFetch(exUrl, { method:"GET", headers: authHeaders(c,"GET",exPath,exQs) });
  if (exResp.status < 400) {
    for (const r of (exResp.json?.data || exResp.json?.exchangeRequests || [])) {
      const norm = normalizeClaim({ ...r, claimType: "exchange" });
      claims.push(norm);
      claimEvents.push({
        event_type: "exchanged",
        occurred_at: norm.occurred_at,
        order: { order_id: r.orderId || r.order_id || r.order?.orderId || r.orderId, raw: r.order || r },
        claim: norm,
        claim_type: norm.claim_type,
        claim_status: norm.claim_status,
        reason_code: norm.reason_code,
        reason_text: norm.reason_text,
      });
    }
  }

  // Also emit basic order events for reservation flows
  const orderEvents = orders.map((o: any) => ({
    event_type: "created",
    occurred_at: o.ordered_at,
    order: o,
    partial_shipment: Boolean(o.split_shipping),
  }));

  return okResp(
    p,
    "coupang",
    { orders, order_events: [...orderEvents, ...claimEvents], claims },
    { orders_url: ordersUrl, orders_status: ordersResp.status, claims: { rc_url: rcUrl, rc_status: rcResp.status, ex_url: exUrl, ex_status: exResp.status } }
  );
}

async function syncInventory(p: ExecutePayload, c: any) {
  // Inventory is not a single canonical endpoint in Coupang; depends on product type and fulfillment model.
  // Keep scaffold: accept inventory rows and return normalized payload for downstream sync.
  const inventory = (p.payload?.data?.inventory || []);
  return okResp(p, "coupang", { inventory: inventory.map(normalizeInventoryRow) }, { note: "V304: inventory sync requires seller-products stock update API; scaffolded." }, "partial_impl");
}

export const coupangAdapter: ProviderAdapter = {
  provider: "coupang",
  async execute(p: ExecutePayload) {
    try {
      const c = cfg(p.payload?.creds || {});
      if (p.action_type === "upsert_products") return await upsertProducts(p,c);
      if (p.action_type === "update_prices") return await updatePrices(p,c);
      if (p.action_type === "fetch_orders") return await fetchOrders(p,c);
      if (p.action_type === "sync_inventory") return await syncInventory(p,c);
      return errResp(p, "coupang", `unsupported_action:${p.action_type}`);
    } catch (e: any) {
      return errResp(p, "coupang", e?.message || "coupang_error");
    }
  },
};
