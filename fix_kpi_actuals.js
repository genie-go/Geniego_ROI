const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/ChannelKPI.jsx', 'utf8');

c = c.replace(
  /ctr: 3.64, convRate: 3.8, cpa: 46200, roas: 312, cpc: 348/g,
  "ctr: 0, convRate: 0, cpa: 0, roas: 0, cpc: 0"
);

c = c.replace(
  /const DEFAULTS = \{ ctr: 3, convRate: 5, cpa: 50000, roas: 300, cpc: 1000 \};/g,
  "const DEFAULTS = { ctr: 0, convRate: 0, cpa: 0, roas: 0, cpc: 0 };"
);

c = c.replace(
  /search: \{ ctr: 0, convRate: 0, cpa: 0, roas: 0, cpc: 0, spend: 186000, revenue: 3420000 \}/g,
  "search: { ctr: 0, convRate: 0, cpa: 0, roas: 0, cpc: 0, spend: 0, revenue: 0 }"
);

c = c.replace(
  /sns: \{ reach: 12520000, engagement: 682000, ctr: 2.8, videoViews: 7440000, spend: 409800, revenue: 7320000 \}/g,
  "sns: { reach: 0, engagement: 0, ctr: 0, videoViews: 0, spend: 0, revenue: 0 }"
);

c = c.replace(
  /blog: \{ views: 168000, visitors: 112000, avgTime: 208, searchIn: 88000 \}/g,
  "blog: { views: 0, visitors: 0, avgTime: 0, searchIn: 0 }"
);

c = c.replace(
  /community: \{ views: 174600, comments: 2770, inquiries: 880, newMembers: 1080 \}/g,
  "community: { views: 0, comments: 0, inquiries: 0, newMembers: 0 }"
);

fs.writeFileSync('frontend/src/pages/ChannelKPI.jsx', c);
console.log('done');
