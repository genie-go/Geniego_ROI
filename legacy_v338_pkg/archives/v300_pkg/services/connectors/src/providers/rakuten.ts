import { Provider, ProviderResult } from "../contracts";

export const rakuten: Provider = {
  name: "rakuten",
  actions: {
    upsert_products: async (ctx, input) => {
      return { ok:true, message:`[rakuten] upsert_products stub (implement channel API call)` } as ProviderResult;
    },
    update_prices: async (ctx, input) => {
      return { ok:true, message:`[rakuten] update_prices stub` } as ProviderResult;
    },
    fetch_orders: async (ctx, input) => {
      return { ok:true, data: [], message:`[rakuten] fetch_orders stub` } as ProviderResult;
    },
    sync_inventory: async (ctx, input) => {
      return { ok:true, message:`[rakuten] sync_inventory stub` } as ProviderResult;
    },
  },
};
