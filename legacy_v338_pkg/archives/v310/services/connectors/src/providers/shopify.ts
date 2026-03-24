import { ExecutePayload, ProviderAdapter } from "../contracts.js";
import { errResp, jsonFetch, okResp, requireFields } from "./commerce_common.js";

function base(creds: any) {
  const c = requireFields(creds, ["shop", "access_token"], "shopify");
  const ver = c.api_version || "2024-10";
  return { ...c, api_version: ver, baseUrl: `https://${c.shop}/admin/api/${ver}` };
}

async function req(creds: any, method: string, path: string, body?: any) {
  const c = base(creds);
  const url = `${c.baseUrl}${path}`;
  const out = await jsonFetch(url, {
    method,
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": c.access_token },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (out.status < 200 || out.status >= 300) {
    throw new Error(`shopify_http_${out.status}:${JSON.stringify(out.json).slice(0, 800)}`);
  }
  return out.json;
}

function mapProduct(p: any) {
  const sku = String(p.sku || "").trim();
  const title = p.title || sku;
  const body_html = p.description || "";
  const price = String(p.price ?? "0");
  return { sku, title, body_html, price };
}

export const shopifyAdapter: ProviderAdapter = {
  name: "shopify",
  async execute(p: ExecutePayload) {
    try {
      const kind = p.payload.kind;
      const creds = p.payload.creds;
      const data = p.payload.data || {};

      if (p.action_type === "upsert_products") {
        const products = (data.products || []) as any[];
        const applied: any = { successes: [], failures: [] };
        for (const raw of products) {
          const mp = mapProduct(raw);
          if (!mp.sku) continue;
          try {
            if (raw.product_id) {
              await req(creds, "PUT", `/products/${raw.product_id}.json`, { product: { title: mp.title, body_html: mp.body_html } });
              applied.successes.push({ sku: mp.sku, product_id: raw.product_id, action: "updated" });
            } else {
              const created = await req(creds, "POST", `/products.json`, { product: { title: mp.title, body_html: mp.body_html, variants: [{ sku: mp.sku, price: mp.price }] } });
              applied.successes.push({ sku: mp.sku, product_id: created?.product?.id, action: "created" });
            }
          } catch (e: any) {
            applied.failures.push({ sku: mp.sku, error: e?.message || "error" });
          }
        }
        return okResp(p, "shopify", applied, { kind });
      }

      if (p.action_type === "fetch_orders") {
        const since = data.since || "";
        const qp = since ? `?status=any&updated_at_min=${encodeURIComponent(since)}` : `?status=any&limit=50`;
        const out = await req(creds, "GET", `/orders.json${qp}`);
        const orders = (out?.orders || []).map((o: any) => ({
          order_id: String(o.id),
          ordered_at: o.created_at,
          buyer_id: o?.customer?.id ? String(o.customer.id) : "",
          total_amount: parseFloat(o?.total_price || "0"),
          currency: o?.currency || "USD",
          raw: o,
        }));
        return okResp(p, "shopify", { orders }, { kind });
      }

      if (p.action_type === "sync_inventory") {
        const items = (data.inventory || []) as any[];
        const applied: any = { successes: [], failures: [] };
        for (const it of items) {
          try {
            const inventory_item_id = it.inventory_item_id;
            const location_id = it.location_id;
            const available = Number(it.on_hand ?? 0);
            if (!inventory_item_id || !location_id) {
              applied.failures.push({ sku: it.sku, error: "missing inventory_item_id/location_id" });
              continue;
            }
            await req(creds, "POST", `/inventory_levels/set.json`, { location_id, inventory_item_id, available });
            applied.successes.push({ sku: it.sku, available });
          } catch (e: any) {
            applied.failures.push({ sku: it.sku, error: e?.message || "error" });
          }
        }
        return okResp(p, "shopify", applied, { kind });
      }

      if (p.action_type === "update_prices") {
        const prices = (data.prices || []) as any[];
        const applied: any = { successes: [], failures: [] };
        for (const pr of prices) {
          try {
            const variant_id = pr.variant_id;
            const price = String(pr.price ?? "0");
            if (!variant_id) { applied.failures.push({ sku: pr.sku, error: "missing variant_id" }); continue; }
            await req(creds, "PUT", `/variants/${variant_id}.json`, { variant: { id: variant_id, price } });
            applied.successes.push({ sku: pr.sku, variant_id, price });
          } catch (e: any) {
            applied.failures.push({ sku: pr.sku, error: e?.message || "error" });
          }
        }
        return okResp(p, "shopify", applied, { kind });
      }

      return errResp(p, "shopify", `unsupported_action:${p.action_type}`);
    } catch (e: any) {
      return errResp(p, "shopify", e?.message || "error");
    }
  },
};
