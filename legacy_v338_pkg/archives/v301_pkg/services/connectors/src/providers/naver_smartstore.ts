import { Provider, ProviderResult } from "../contracts";

export const naver_smartstore: Provider = {
  name: "naver_smartstore",
  actions: {
    upsert_products: async (ctx, input) => {
      return { ok:true, message:`[naver_smartstore] upsert_products stub (implement channel API call)` } as ProviderResult;
    },
    update_prices: async (ctx, input) => {
      return { ok:true, message:`[naver_smartstore] update_prices stub` } as ProviderResult;
    },
    fetch_orders: async (ctx, input) => {
      return { ok:true, data: [], message:`[naver_smartstore] fetch_orders stub` } as ProviderResult;
    },
    sync_inventory: async (ctx, input) => {
      return { ok:true, message:`[naver_smartstore] sync_inventory stub` } as ProviderResult;
    },
  },
};
