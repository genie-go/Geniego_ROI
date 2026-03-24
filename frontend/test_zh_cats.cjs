// Test zh locale for marketing.cat_beauty access
const zh = require('./src/i18n/locales/zh.js');
const result = zh.default || zh;
console.log('zh.marketing exists:', !!result.marketing);
console.log('zh.marketing.cat_beauty:', result.marketing?.cat_beauty);
console.log('zh.marketing.aiHubTitle:', result.marketing?.aiHubTitle);
console.log('zh.banner exists:', !!result.banner);
console.log('zh.banner.mktLowRoas:', result.banner?.mktLowRoas?.slice(0,30));

// Also check the structure around cat_beauty
const fs = require('fs');
const c = fs.readFileSync('src/i18n/locales/zh.js', 'utf8');
// Find what object contains cat_beauty
const idx = c.indexOf('cat_beauty');
const contextStart = Math.max(0, idx - 200);
console.log('\n--- Context around cat_beauty ---');
console.log(c.slice(contextStart, idx+50));
