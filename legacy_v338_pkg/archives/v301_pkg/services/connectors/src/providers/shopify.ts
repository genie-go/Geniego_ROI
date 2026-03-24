import { Provider, ProviderResult } from "../contracts";

type ShopifyCreds = {
  shop?: string; // e.g. my-shop.myshopify.com
  access_token?: string; // Admin API access token
  api_version?: string; // e.g. 2024-10
};

function mustCreds(creds: any): ShopifyCreds {
  const c = (creds || {}) as ShopifyCreds;
  return {
    shop: c.shop,
    access_token: c.access_token,
    api_version: c.api_version || "2024-10",
  };
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function shopifyRequest(creds: ShopifyCreds, method: string, path: string, body?: any) {
  if (!creds.shop || !creds.access_token) {
    throw new Error("missing_shopify_creds(shop, access_token)");
  }
  const url = `https://${creds.shop}/admin/api/${creds.api_version}${path}`;

  let lastErr: any = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const resp = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": creds.access_token,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (resp.status === 429 || (resp.status >= 500 && resp.status <= 599)) {
        const retryAfter = parseInt(resp.headers.get("retry-after") || "0", 10);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : 500 * (attempt + 1);
        await sleep(Math.min(waitMs, 8000));
        continue;
      }

      const text = await resp.text();
      const parsed = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : {};
      if (!resp.ok) {
        throw new Error(`shopify_http_${resp.status}: ${JSON.stringify(parsed).slice(0, 800)}`);
      }
      return parsed;
    } catch (e: any) {
      lastErr = e;
      await sleep(Math.min(500 * (attempt + 1), 5000));
    }
  }
  throw lastErr || new Error("shopify_request_failed");
}

export const shopify: Provider = {
  name: "shopify",
  actions: {
    // input.payload.data.products: [{sku,title,description,price,currency, product_id?}]
    upsert_products: async (_ctx, input) => {
      const creds = mustCreds((input as any)?.payload?.creds);
      const products = ((input as any)?.payload?.data?.products || []) as any[];
      const createdOrUpdated: any[] = [];
      for (const p of products) {
        const sku = (p.sku || "").toString();
        const title = (p.title || "").toString();
        const description = (p.description || "").toString();
        const price = (p.price ?? 0).toString();
        const productId = p.product_id;

        const productPayload: any = {
          product: {
            title: title || sku || "Untitled",
            body_html: description,
            variants: [
              {
                sku,
                price,
              },
            ],
          },
        };

        if (productId) {
          const out = await shopifyRequest(creds, "PUT", `/products/${productId}.json`, productPayload);
          createdOrUpdated.push(out?.product || out);
        } else {
          const out = await shopifyRequest(creds, "POST", `/products.json`, productPayload);
          createdOrUpdated.push(out?.product || out);
        }
      }
      return { ok: true, message: `[shopify] upsert_products ok (${createdOrUpdated.length})`, data: createdOrUpdated } as ProviderResult;
    },

    // input.payload.data.prices: [{variant_id, price}] (recommended)
    update_prices: async (_ctx, input) => {
      const creds = mustCreds((input as any)?.payload?.creds);
      const prices = ((input as any)?.payload?.data?.prices || []) as any[];
      let updated = 0;
      for (const it of prices) {
        const variantId = it.variant_id;
        const price = (it.price ?? "").toString();
        if (!variantId || price === "") continue;
        await shopifyRequest(creds, "PUT", `/variants/${variantId}.json`, { variant: { id: variantId, price } });
        updated++;
      }
      return { ok: true, message: `[shopify] update_prices ok (${updated})` } as ProviderResult;
    },

    // input.payload.data: {created_at_min?, limit?}
    fetch_orders: async (_ctx, input) => {
      const creds = mustCreds((input as any)?.payload?.creds);
      const d = ((input as any)?.payload?.data || {}) as any;
      const createdAtMin = d.created_at_min ? encodeURIComponent(d.created_at_min) : "";
      const limit = Math.min(parseInt(d.limit || "50", 10) || 50, 250);
      const qs = new URLSearchParams({ status: "any", limit: String(limit) });
      if (createdAtMin) qs.set("created_at_min", d.created_at_min);
      const out = await shopifyRequest(creds, "GET", `/orders.json?${qs.toString()}`);
      const orders = (out?.orders || []) as any[];
      const normalized = orders.map((o) => ({
        order_id: String(o.id),
        ordered_at: o.created_at,
        buyer_id: o.customer?.id ? String(o.customer.id) : "",
        total_amount: parseFloat(o.current_total_price || o.total_price || "0"),
        currency: o.currency || "USD",
        raw: o,
      }));
      return { ok: true, data: normalized, message: `[shopify] fetch_orders ok (${normalized.length})` } as ProviderResult;
    },

    // input.payload.data.inventory: [{inventory_item_id, location_id, available}] (recommended)
    sync_inventory: async (_ctx, input) => {
      const creds = mustCreds((input as any)?.payload?.creds);
      const inv = ((input as any)?.payload?.data?.inventory || []) as any[];
      let updated = 0;
      for (const it of inv) {
        const inventory_item_id = it.inventory_item_id;
        const location_id = it.location_id;
        const available = it.available;
        if (!inventory_item_id || !location_id || available === undefined) continue;
        await shopifyRequest(creds, "POST", `/inventory_levels/set.json`, {
          location_id,
          inventory_item_id,
          available,
        });
        updated++;
      }
      return { ok: true, message: `[shopify] sync_inventory ok (${updated})` } as ProviderResult;
    },
  },
};
