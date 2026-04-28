import { Provider, ProviderResult } from "../contracts";

export const shopify: Provider = {
  name: "shopify",
  actions: {
    upsert_products: async (ctx, input) => {
      return { ok:true, message:`[shopify] upsert_products stub (implement channel API call)` } as ProviderResult;
    },
    update_prices: async (ctx, input) => {
      return { ok:true, message:`[shopify] update_prices stub` } as ProviderResult;
    },
    fetch_orders: async (ctx, input) => {
      return { ok:true, data: [], message:`[shopify] fetch_orders stub` } as ProviderResult;
    },
    sync_inventory: async (ctx, input) => {
      return { ok:true, message:`[shopify] sync_inventory stub` } as ProviderResult;
    },
  },
};
