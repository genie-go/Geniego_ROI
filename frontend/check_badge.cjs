const fs = require('fs');

// Fix "인기" and "최고사양" badges in Pricing.jsx using existing pricingDetail.pro_badge and pricingDetail.ent_badge
// These are already set in getPlanDetail(t) so PLAN_DETAIL.pro.badge and PLAN_DETAIL.enterprise.badge should already be i18n'd.
// The hardcoded issue is in the plan cards rendering - check if badge comes from PLAN_DETAIL or hardcoded

let c = fs.readFileSync('src/pages/Pricing.jsx', 'utf8');

// Find badge usage
const lines = c.split('\n');
const badgeLines = lines.map((l, i) => ({i: i+1, l})).filter(({l}) => 
  l.includes('인기') || l.includes('최고사양') || l.includes('badge') || l.includes('Badge')
);
badgeLines.forEach(({i, l}) => console.log(i, ':', l.slice(0, 120)));
