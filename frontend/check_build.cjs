// Check the BUILT file for Japanese invColProduct within the wms namespace
const c=require('fs').readFileSync('dist/assets/vendor-locales-C1KigD_7.js','utf8');

// Find the ja locale's wms section  
// The ja module should have wmsHeroTitle:"WMS 倉庫統合管理"
const jaHeroIdx = c.indexOf('WMS \\u5009\\u5EAB\\u7D71\\u5408\\u7BA1\\u7406'); // WMS 倉庫統合管理 in unicode
const jaHeroIdx2 = c.indexOf('WMS 倉庫統合管理');
console.log('JA hero unicode escape:', jaHeroIdx);
console.log('JA hero direct:', jaHeroIdx2);

// Just search for the Japanese invColProduct value
const jaInv = c.indexOf('商品名');
console.log('商品名 at:', jaInv);
if(jaInv > -1) {
    console.log('Context:', c.substring(jaInv-50, jaInv+50));
}

// How is the wms namespace structured in the build?
// Find "invColProduct" near the Japanese section
let p = jaInv; 
if(p > -1) {
    // Find invColProduct near this position
    const nearby = c.indexOf('invColProduct', p-500);
    console.log('\ninvColProduct near 商品名 at:', nearby);
    if(nearby > -1) {
        console.log('Context:', c.substring(nearby-10, nearby+80));
    }
}
