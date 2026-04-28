import crypto from "crypto";
import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { errResp, jsonFetch, normalizeInventoryRow, normalizeOrder, normalizeProduct, okResp, requireFields } from "./commerce_common.js";

/**
 * Coupang OpenAPI provider (V303).
 * - Auth: HMAC signature (access_key/secret_key).
 * - This repo includes a MOCK server for end-to-end testing (default base_url).
 *
 * Creds:
 *   access_key, secret_key, vendor_id
 *   base_url (optional) default: http://mock_korea_commerce_api:9300
 */
function cfg(creds: any) {
  const c = requireFields(creds, ["access_key","secret_key","vendor_id"], "coupang");
  return { ...c, base_url: c.base_url || "http://mock_korea_commerce_api:9300" };
}

function sign(secret: string, msg: string) {
  return crypto.createHmac("sha256", secret).update(msg).digest("hex");
}

function authHeaders(c: any, method: string, path: string, qs: string = "") {
  // Simplified signature contract for ; replace with Coupang spec for production.
  const ts = new Date().toISOString();
  const msg = [method.toUpperCase(), path, qs, ts].join("\n");
  const sig = sign(c.secret_key, msg);
  return {
    "X-CP-AccessKey": c.access_key,
    "X-CP-Timestamp": ts,
    "X-CP-Signature": sig,
    "Content-Type": "application/json",
  };
}

async function upsertProducts(p: ExecutePayload, c: any) {
  const products = (p.payload?.data?.products || []);
  const url = `${c.base_url}/api/coupang/products`;
  const r = await jsonFetch(url, { method:"POST", headers: authHeaders(c,"POST","/api/coupang/products"), body: JSON.stringify({ products }) });
  if (r.status >= 400) throw new Error(`coupang_products_failed:${r.status}`);
  const norm = (products || []).map(normalizeProduct);
  return okResp(p, "coupang", { products: norm }, { url, status: r.status });
}

async function updatePrices(p: ExecutePayload, c: any) {
  const prices = (p.payload?.data?.prices || []);
  // normalize as product-ish updates
  const url = `${c.base_url}/api/coupang/products`;
  const r = await jsonFetch(url, { method:"POST", headers: authHeaders(c,"POST","/api/coupang/products"), body: JSON.stringify({ products: prices }) });
  if (r.status >= 400) throw new Error(`coupang_prices_failed:${r.status}`);
  return okResp(p, "coupang", { prices }, { url, status: r.status });
}

async function fetchOrders(p: ExecutePayload, c: any) {
  const url = `${c.base_url}/api/coupang/orders`;
  const r = await jsonFetch(url, { method:"GET", headers: authHeaders(c,"GET","/api/coupang/orders") });
  if (r.status >= 400) throw new Error(`coupang_orders_failed:${r.status}`);
  const events = (r.json?.orders || []).map((e: any) => ({
    event_type: e.event_type || e.type || "created",
    occurred_at: e.occurred_at || e.ts || new Date().toISOString(),
    order: normalizeOrder(e.order || e),
  }));
  return okResp(p, "coupang", { orders: events.map((e: any)=>e.order), order_events: events }, { url, status: r.status });
}

async function syncInventory(p: ExecutePayload, c: any) {
  const inventory = (p.payload?.data?.inventory || []);
  const url = `${c.base_url}/api/coupang/inventory`;
  const r = await jsonFetch(url, { method:"POST", headers: authHeaders(c,"POST","/api/coupang/inventory"), body: JSON.stringify({ inventory }) });
  if (r.status >= 400) throw new Error(`coupang_inventory_failed:${r.status}`);
  const norm = inventory.map(normalizeInventoryRow);
  return okResp(p, "coupang", { inventory: norm }, { url, status: r.status });
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
      return errResp(p, "coupang", e?.message || String(e));
    }
  },
};
