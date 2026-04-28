import { ExecutePayload, ProviderResponse } from "../contracts.js";

export function nowIso() { return new Date().toISOString(); }

export function okResp(p: ExecutePayload, provider: string, applied?: any, evidence?: any, warning?: string): ProviderResponse {
  return {
    ok: true,
    provider,
    action_type: p.action_type,
    channel: p.channel,
    execution_id: p.execution_id,
    timestamp: nowIso(),
    applied: applied || {},
    evidence: evidence || {},
    warning,
  };
}

export function errResp(p: ExecutePayload, provider: string, error: string, evidence?: any): ProviderResponse {
  return {
    ok: false,
    provider,
    action_type: p.action_type,
    channel: p.channel,
    execution_id: p.execution_id,
    timestamp: nowIso(),
    error,
    evidence: evidence || {},
  };
}

export async function sleep(ms: number) { await new Promise((r) => setTimeout(r, ms)); }

export async function jsonFetch(url: string, init: RequestInit, retries = 4): Promise<{ status: number; headers: Headers; json: any; text: string; }> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, init);
      const text = await resp.text();
      const json = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : {};
      if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
        const ra = parseInt(resp.headers.get("retry-after") || "0", 10);
        const waitMs = ra > 0 ? ra * 1000 : Math.min(8000, 400 * (attempt + 1));
        await sleep(waitMs);
        continue;
      }
      return { status: resp.status, headers: resp.headers, json, text };
    } catch (e: any) {
      lastErr = e;
      await sleep(Math.min(5000, 400 * (attempt + 1)));
    }
  }
  throw lastErr || new Error("jsonFetch_failed");
}

export function requireFields(creds: any, fields: string[], provider: string) {
  const c = creds || {};
  const missing = fields.filter((f) => !c[f]);
  if (missing.length) throw new Error(`${provider}_missing_creds:${missing.join(",")}`);
  return c;
}

export type OAuthToken = { access_token: string; refresh_token?: string; expires_at?: string; expires_in?: number; token_type?: string; };

export function isExpired(expires_at?: string, skewSeconds = 60): boolean {
  if (!expires_at) return false;
  const t = Date.parse(expires_at);
  if (Number.isNaN(t)) return false;
  return (t - Date.now()) <= skewSeconds * 1000;
}

/**
 * Generic OAuth refresh helper.
 * Returns token and evidence; caller should persist new token via applied.tokens.
 */
export async function oauthRefresh(baseUrl: string, path: string, body: any): Promise<{ token: OAuthToken; evidence: any; }> {
  const url = `${baseUrl}${path}`;
  const r = await jsonFetch(url, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify(body) }, 2);
  if (r.status >= 400) throw new Error(`oauth_refresh_failed:${r.status}:${JSON.stringify(r.json)}`);
  const tok = r.json || {};
  const exp = tok.expires_in ? new Date(Date.now() + (Number(tok.expires_in) * 1000)).toISOString() : undefined;
  const token: OAuthToken = {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_in: tok.expires_in,
    expires_at: tok.expires_at || exp,
    token_type: tok.token_type || "bearer",
  };
  return { token, evidence: { url, status: r.status } };
}

export function normalizeProduct(p: any) {
  // minimal normalized schema: {sku,title,price,currency,images[],options[],shipping}
  const sku = p.sku || p.productNo || p.itemId || p.id;
  return {
    sku,
    title: p.title || p.name || p.productName || "",
    price: Number(p.price ?? p.salePrice ?? p.retailPrice ?? 0),
    currency: p.currency || "KRW",
    images: p.images || p.imageUrls || (p.image ? [p.image] : []),
    options: p.options || p.variants || [],
    shipping: p.shipping || p.delivery || {},
    raw: p,
  };
}

export function normalizeOrder(o: any) {
  return {
    order_id: o.order_id || o.orderId || o.id,
    status: o.status || o.orderStatus || "unknown",
    ordered_at: o.ordered_at || o.orderedAt || o.createdAt || nowIso(),
    buyer_id: o.buyer_id || o.buyerId || o.customerId || "",
    total_amount: Number(o.total_amount ?? o.totalAmount ?? o.paymentAmount ?? 0),
    currency: o.currency || "KRW",
    items: o.items || o.orderItems || [],
    raw: o,
  };
}

export function normalizeInventoryRow(r: any) {
  return { sku: r.sku || r.sellerSku || r.itemId || r.id, qty: Number(r.qty ?? r.quantity ?? r.stock ?? 0), raw: r };
}


export function buildQuery(params: Record<string, any>): string {
  const usp = new URLSearchParams();
  for (const [k,v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  return usp.toString();
}

export async function paginateOffset<T>(
  fetchPage: (limit: number, offset: number) => Promise<{ items: T[]; total?: number; raw?: any; }>,
  opts?: { limit?: number; maxPages?: number; }
): Promise<{ items: T[]; pages: number; }> {
  const limit = opts?.limit ?? 100;
  const maxPages = opts?.maxPages ?? 50;
  const out: T[] = [];
  let offset = 0;
  let pages = 0;
  while (pages < maxPages) {
    const r = await fetchPage(limit, offset);
    const items = r.items || [];
    out.push(...items);
    pages += 1;
    if (items.length < limit) break;
    offset += limit;
    if (r.total !== undefined && out.length >= r.total) break;
  }
  return { items: out, pages };
}

/** V304 richer normalized order schema (still preserves `raw`). */
export function normalizeOrderV304(o: any) {
  const base = normalizeOrder(o);
  return {
    ...base,
    shipment_box_id: o.shipmentBoxId || o.shipment_box_id,
    split_shipping: Boolean(o.splitShipping ?? o.split_shipping ?? false),
    receiver: o.receiver || {},
    shipments: o.shipments || o.delivery || [],
    claims: o.claims || o.returns || o.exchanges || [],
  };
}

export function normalizeClaim(c: any) {
  return {
    claim_id: c.claimId || c.receiptId || c.claim_code || c.id,
    claim_type: c.claimType || c.type || c.claim_type, // return|cancel|exchange
    claim_status: c.status || c.claimStatus || c.claim_status,
    reason_code: c.reasonCode || c.claim_reason_type || c.reason_code,
    reason_text: c.reason || c.claim_reason || c.reason_text,
    occurred_at: c.occurredAt || c.createdAt || c.created_at || nowIso(),
    raw: c,
  };
}
