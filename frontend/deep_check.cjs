// Deep analysis: how does Vite structure the ja module in vendor-locales?
const c=require('fs').readFileSync('dist/assets/vendor-locales-C1KigD_7.js','utf8');

// Find the Japanese module boundary
// Vite bundles ES modules - look for the ja locale's wms section
// The wms key "WMS 倉庫統合管理" is unique to ja
const jaHeroIdx = c.indexOf('WMS 倉庫統合管理');
console.log('JA hero at position:', jaHeroIdx);

// Search backward to find the wms object start for JA
const jaWmsStart = c.lastIndexOf('wms:{', jaHeroIdx);
console.log('JA wms:{ at:', jaWmsStart);
if(jaWmsStart > -1) {
    // What's before it?
    console.log('Before wms:{:', c.substring(jaWmsStart-100, jaWmsStart));
    // Scan forward from wms:{ to find invColProduct
    const invInWms = c.indexOf('invColProduct', jaWmsStart);
    console.log('\ninvColProduct relative to wms:{:', invInWms);
    if(invInWms > -1) {
        console.log('Value:', c.substring(invInWms, invInWms+50));
    }
    
    // Check: how far is invColProduct from the wms:{ start?
    console.log('Distance:', invInWms - jaWmsStart, 'chars');
}

// ALSO: Look for the module default export structure
// Vite uses `const X = {writebackPage:..., wms:{...}}` or similar
// Find what comes BEFORE the JA wms object
const jaModStart = c.lastIndexOf('const ', jaWmsStart);
if(jaModStart > -1 && jaModStart > jaWmsStart - 500) {
    console.log('\nModule start:', c.substring(jaModStart, jaModStart+100));
}

// CRITICAL: Is the JA locale object a FLAT dump or nested?
// If wms is nested inside the default export, invColProduct should be reachable via .wms.invColProduct
// Let's verify the structure by looking for the pattern
const exportDefault = c.lastIndexOf('export default', jaHeroIdx);
const exportBrace = c.lastIndexOf('export{', jaHeroIdx);
console.log('\nexport default at:', exportDefault);
console.log('export{ at:', exportBrace);
if(exportBrace > -1 && exportBrace > jaHeroIdx - 200000) {
    console.log('export{:', c.substring(exportBrace, exportBrace+200));
}
