import { Provider, ProviderResult } from "../contracts";

export const amazon_sp: Provider = {
  name: "amazon_selling_partner",
  actions: {
    upsert_products: async (ctx, input) => {
      return { ok:true, message:`[amazon_selling_partner] upsert_products stub (implement channel API call)` } as ProviderResult;
    },
    update_prices: async (ctx, input) => {
      return { ok:true, message:`[amazon_selling_partner] update_prices stub` } as ProviderResult;
    },
    fetch_orders: async (ctx, input) => {
      return { ok:true, data: [], message:`[amazon_selling_partner] fetch_orders stub` } as ProviderResult;
    },
    sync_inventory: async (ctx, input) => {
      return { ok:true, message:`[amazon_selling_partner] sync_inventory stub` } as ProviderResult;
    },
  },
};
