import { ProviderAdapter } from "../contracts.js";
import { sesAdapter } from "./ses.js";
import { sendgridAdapter } from "./sendgrid.js";
import { hubspotAdapter } from "./hubspot.js";
import { googleAdsAdapter } from "./google_ads.js";
import { metaAdapter } from "./meta.js";
import { naverAdapter } from "./naver.js";
import { amazonAdsAdapter } from "./amazon_ads.js";
import { salesforceAdapter } from "./salesforce.js";

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
};

/* AUTO-INSERT-PROVIDERS */

export * from './shopify';
export * from './qoo10';
export * from './rakuten';
export * from './coupang';
export * from './cafe24';
export * from './amazon_sp';
export * from './naver_smartstore';