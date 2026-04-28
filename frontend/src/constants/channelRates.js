/**
 * 채널별 수수료/세금 정책 — 중앙 단일 소스 (Single Source of Truth)
 * 
 * CatalogSync, OmniChannel, PriceOpt 등 모든 모듈에서 이 파일을 import합니다.
 * 수수료율 변경 시 이 파일 한 곳만 수정하면 전체 플랫폼에 즉시 반영됩니다.
 */

// commission: 채널 판매 수수료율 (0~1)
// vat: 해당 채널/국가의 부가세/GST율 (0~1)
// region: 지역 분류
// label: 표시명
export const CHANNEL_RATES = {
    // ── 국내 채널 ──
    coupang:        { commission: 0.11, vat: 0.10, label: "Coupang Wing",        region: "Domestic", icon: "🇰🇷" },
    naver:          { commission: 0.05, vat: 0.10, label: "Naver Smart Store",   region: "Domestic", icon: "🟢" },
    "11st":         { commission: 0.12, vat: 0.10, label: "11Street",            region: "Domestic", icon: "🏬" },
    gmarket:        { commission: 0.12, vat: 0.10, label: "Gmarket",             region: "Domestic", icon: "🛍️" },
    kakao_commerce: { commission: 0.10, vat: 0.10, label: "Kakao Commerce",      region: "Domestic", icon: "🟡" },
    cafe24:         { commission: 0.03, vat: 0.10, label: "Cafe24",              region: "Domestic", icon: "🏪" },
    wemakeprice:    { commission: 0.11, vat: 0.10, label: "WeMakePrice",         region: "Domestic", icon: "🔵" },
    interpark:      { commission: 0.09, vat: 0.10, label: "Interpark",           region: "Domestic", icon: "🟠" },
    lotteon:        { commission: 0.10, vat: 0.10, label: "Lotte ON",            region: "Domestic", icon: "🏢" },
    own_mall:       { commission: 0.00, vat: 0.10, label: "Own Mall",            region: "Domestic", icon: "🏠" },
    // ── 글로벌 채널 ──
    shopify:        { commission: 0.02, vat: 0.00, label: "Shopify",             region: "Global",   icon: "🛒" },
    amazon:         { commission: 0.15, vat: 0.00, label: "Amazon SP-API",       region: "Global",   icon: "📦" },
    ebay:           { commission: 0.13, vat: 0.00, label: "eBay",                region: "Global",   icon: "🏷️" },
    tiktok:         { commission: 0.08, vat: 0.00, label: "TikTok Shop",         region: "Global",   icon: "🎵" },
    tiktok_shop:    { commission: 0.08, vat: 0.00, label: "TikTok Shop",         region: "Global",   icon: "🎵" },
    // ── 일본 채널 ──
    rakuten:        { commission: 0.08, vat: 0.10, label: "Rakuten",             region: "Japan",    icon: "🇯🇵" },
    yahoo_jp:       { commission: 0.06, vat: 0.10, label: "Yahoo! Japan",        region: "Japan",    icon: "🟥" },
    line:           { commission: 0.05, vat: 0.10, label: "LINE Shopping",       region: "Japan",    icon: "💚" },
    // ── 동남아 / 유럽 ──
    lazada:         { commission: 0.04, vat: 0.07, label: "Lazada",              region: "SE Asia",  icon: "🌏" },
    qoo10:          { commission: 0.10, vat: 0.09, label: "Qoo10",               region: "Global",   icon: "🟪" },
    zalando:        { commission: 0.20, vat: 0.19, label: "Zalando",             region: "Europe",   icon: "🇩🇪" },
};

/** 추천 판매가 계산: cost / (1 - commission - vat - margin) */
export const calcRecommendedPrice = (productCost, channelId, marginRate = 30) => {
    const r = CHANNEL_RATES[channelId] || { commission: 0.10, vat: 0.00 };
    const denom = 1 - r.commission - r.vat - (marginRate / 100);
    if (denom <= 0) return productCost * 3;
    return Math.ceil(productCost / denom / 100) * 100;
};

/** 채널 수수료율 조회 (fallback: 10%, VAT 0%) */
export const getChannelRate = (channelId) => {
    return CHANNEL_RATES[channelId] || { commission: 0.10, vat: 0.00, label: channelId, region: "Unknown", icon: "🔌" };
};

export default CHANNEL_RATES;
