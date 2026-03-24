const capabilities = {
  meta: {
    supports_campaign_budget: false,
    supports_adset_budget: true,
    supports_bid_adjustment: true,
    supports_pause_resume: true
  },
  google: {
    supports_campaign_budget: true,
    supports_adset_budget: false,
    supports_bid_adjustment: true,
    supports_pause_resume: true
  },
  tiktok: {
    supports_campaign_budget: true,
    supports_adset_budget: true,
    supports_bid_adjustment: true,
    supports_pause_resume: true
  },
  naver: {
    supports_campaign_budget: true,
    supports_adset_budget: false,
    supports_bid_adjustment: false,
    supports_pause_resume: true
  },
  kakao: {
    supports_campaign_budget: true,
    supports_adset_budget: false,
    supports_bid_adjustment: false,
    supports_pause_resume: true
  }
};

module.exports = { capabilities };
