import { ProviderAdapter } from "../contracts.js";
import { sesAdapter } from "./ses.js";
import { sendgridAdapter } from "./sendgrid.js";
import { hubspotAdapter } from "./hubspot.js";
import { salesforceAdapter } from "./salesforce.js";
import { googleAdsAdapter } from "./google_ads.js";
import { metaAdapter } from "./meta.js";
import { naverAdapter } from "./naver.js";
import { amazonAdsAdapter } from "./amazon_ads.js";

export const adapters: Record<string, ProviderAdapter> = {
  ses: sesAdapter,
  sendgrid: sendgridAdapter,
  hubspot: hubspotAdapter,
  salesforce: salesforceAdapter,
  google_ads: googleAdsAdapter,
  meta: metaAdapter,
  naver: naverAdapter,
  amazon_ads: amazonAdsAdapter,
};
