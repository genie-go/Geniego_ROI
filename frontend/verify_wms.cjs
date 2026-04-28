// Final verification: check if ja.js still has the wms key conflict
const c=require('fs').readFileSync('src/i18n/locales/ja.js','utf8');
// Find exact "wms" keys (not wmsMenu, wmsHeroTitle, etc.)
const regex = /"wms":/g;
let m;
while(m=regex.exec(c)){
    const ctx=c.substring(m.index,m.index+60);
    console.log('pos '+m.index+': '+ctx);
}

// Also check: what does eval give us?
const em=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const obj=eval('('+em[1]+')');
console.log('\nwms type:',typeof obj.wms);
if(typeof obj.wms==='object'){
    console.log('wms keys:',Object.keys(obj.wms).length);
    console.log('invColProduct:',obj.wms.invColProduct);
    console.log('invSearchPh:',obj.wms.invSearchPh);
} else {
    console.log('wms value:',obj.wms);
}
console.log('wmsMenu:',obj.wmsMenu);
