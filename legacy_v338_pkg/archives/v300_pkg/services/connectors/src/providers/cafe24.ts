import { Provider, ProviderResult } from "../contracts";

export const cafe24: Provider = {
  name: "cafe24",
  actions: {
    upsert_products: async (ctx, input) => {
      return { ok:true, message:`[cafe24] upsert_products stub (implement channel API call)` } as ProviderResult;
    },
    update_prices: async (ctx, input) => {
      return { ok:true, message:`[cafe24] update_prices stub` } as ProviderResult;
    },
    fetch_orders: async (ctx, input) => {
      return { ok:true, data: [], message:`[cafe24] fetch_orders stub` } as ProviderResult;
    },
    sync_inventory: async (ctx, input) => {
      return { ok:true, message:`[cafe24] sync_inventory stub` } as ProviderResult;
    },
  },
};
