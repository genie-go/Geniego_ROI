import { Provider, ProviderResult } from "../contracts";

export const qoo10: Provider = {
  name: "qoo10",
  actions: {
    upsert_products: async (ctx, input) => {
      return { ok:true, message:`[qoo10] upsert_products stub (implement channel API call)` } as ProviderResult;
    },
    update_prices: async (ctx, input) => {
      return { ok:true, message:`[qoo10] update_prices stub` } as ProviderResult;
    },
    fetch_orders: async (ctx, input) => {
      return { ok:true, data: [], message:`[qoo10] fetch_orders stub` } as ProviderResult;
    },
    sync_inventory: async (ctx, input) => {
      return { ok:true, message:`[qoo10] sync_inventory stub` } as ProviderResult;
    },
  },
};
