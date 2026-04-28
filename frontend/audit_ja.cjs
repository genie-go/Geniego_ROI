const c=require('fs').readFileSync('src/i18n/locales/ja.js','utf8');
const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const o=eval('('+m[1]+')');
const w=o.wms||{};
let engCount=0;
Object.entries(w).forEach(([k,v])=>{
    if(typeof v==='string' && /^[a-zA-Z0-9\s\.\,\-\/\(\)\:\_ #!?@+=*&%$"'{}[\]|<>~`^;]+$/.test(v) && v.length>2){
        engCount++;
        if(engCount<=60) console.log(k+'='+v.slice(0,80));
    }
});
console.log('\nTotal English-only WMS keys in ja.js:',engCount);
