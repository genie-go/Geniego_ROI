import { ProviderAdapter } from "../contracts.js";
import { sesAdapter } from "./ses.js";
import { sendgridAdapter } from "./sendgrid.js";
import { hubspotAdapter } from "./hubspot.js";
import { googleAdsAdapter } from "./google_ads.js";
import { metaAdapter } from "./meta.js";
import { naverAdapter } from "./naver.js";
import { amazonAdsAdapter } from "./amazon_ads.js";
import { salesforceAdapter } from "./salesforce.js";
import { shopifyAdapter } from "./shopify.js";
import { coupangAdapter } from "./coupang.js";
import { naverSmartstoreAdapter } from "./naver_smartstore.js";
import { cafe24Adapter } from "./cafe24.js";
import { qoo10Adapter } from "./qoo10.js";
import { rakutenAdapter } from "./rakuten.js";
import { amazonSpAdapter } from "./amazon_sp.js";


export const adapters: Record<string, ProviderAdapter> = {
  ses: sesAdapter,
  sendgrid: sendgridAdapter,
  hubspot: hubspotAdapter,
  google_ads: googleAdsAdapter,
  // skeletons:
  meta: metaAdapter,
  naver: naverAdapter,
  amazon_ads: amazonAdsAdapter,
  salesforce: salesforceAdapter,
  // commerce (operational):
  shopify: shopifyAdapter,
  coupang: coupangAdapter,
  naver_smartstore: naverSmartstoreAdapter,
  cafe24: cafe24Adapter,
  qoo10: qoo10Adapter,
  rakuten: rakutenAdapter,
  amazon_sp: amazonSpAdapter,
};

/* AUTO-INSERT-PROVIDERS */

export * from './shopify';
export * from './qoo10';
export * from './rakuten';
export * from './coupang';
export * from './cafe24';
export * from './amazon_sp';
export * from './naver_smartstore';