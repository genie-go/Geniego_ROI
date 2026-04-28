import { Provider, ProviderResult } from "../contracts";

export const coupang: Provider = {
  name: "coupang",
  actions: {
    upsert_products: async (ctx, input) => {
      return { ok:true, message:`[coupang] upsert_products stub (implement channel API call)` } as ProviderResult;
    },
    update_prices: async (ctx, input) => {
      return { ok:true, message:`[coupang] update_prices stub` } as ProviderResult;
    },
    fetch_orders: async (ctx, input) => {
      return { ok:true, data: [], message:`[coupang] fetch_orders stub` } as ProviderResult;
    },
    sync_inventory: async (ctx, input) => {
      return { ok:true, message:`[coupang] sync_inventory stub` } as ProviderResult;
    },
  },
};
