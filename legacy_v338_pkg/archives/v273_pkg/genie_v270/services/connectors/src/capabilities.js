module.exports = {
  meta: { supports_campaign_budget:false, supports_adset_budget:true,  supports_pause_resume:true, supports_bid_adjustment:true },
  instagram: { supports_campaign_budget:false, supports_adset_budget:true, supports_pause_resume:true, supports_bid_adjustment:true, alias_of:'meta' },
  google: { supports_campaign_budget:true,  supports_adset_budget:false, supports_pause_resume:true, supports_bid_adjustment:true },
  tiktok: { supports_campaign_budget:true,  supports_adset_budget:true,  supports_pause_resume:true, supports_bid_adjustment:true },
  naver: { supports_campaign_budget:true,  supports_adset_budget:false, supports_pause_resume:true, supports_bid_adjustment:true, supports_adgroup_budget:true },
  amazon_ads: { supports_campaign_budget:true, supports_adset_budget:false, supports_pause_resume:true, supports_bid_adjustment:true, kind:'ads' },
  shopify: { supports_campaign_budget:false, supports_adset_budget:false, supports_pause_resume:false, supports_bid_adjustment:false, kind:'commerce_data' },
  qoo10: { supports_campaign_budget:false, supports_adset_budget:false, supports_pause_resume:false, supports_bid_adjustment:false, kind:'commerce_data' },
  rakuten: { supports_campaign_budget:false, supports_adset_budget:false, supports_pause_resume:false, supports_bid_adjustment:false, kind:'commerce_data' },
  coupang: { supports_campaign_budget:true, supports_adset_budget:false, supports_pause_resume:true, supports_bid_adjustment:true, kind:'ads+commerce' },
  kakao: { supports_campaign_budget:true,  supports_adset_budget:false, supports_pause_resume:true, supports_bid_adjustment:false },
};
