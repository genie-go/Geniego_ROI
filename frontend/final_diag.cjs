const c=require('fs').readFileSync('src/i18n/locales/ja.js','utf8');

// Parse properly
const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const obj=eval('('+m[1]+')');

// Check if wms.invColProduct exists in parsed object  
console.log('Parsed wms.invColProduct:', obj.wms?.invColProduct);

// NOW check: when we JSON.stringify and re-parse, is it still there?
const serialized = JSON.stringify(obj);
const reparsed = JSON.parse(serialized);
console.log('Re-parsed wms.invColProduct:', reparsed.wms?.invColProduct);
console.log('Re-parsed wms keys count:', Object.keys(reparsed.wms).length);

// Count all invCol keys in re-parsed wms
const invKeys = Object.keys(reparsed.wms).filter(k=>k.startsWith('inv'));
console.log('Re-parsed wms inv* keys:', invKeys);

// Check if the file content already went through JSON.stringify (no duplicate keys possible)
// Count occurrences of "wms" in the file
let count=0, p=0;
const search = '"wms"';
while(true){
    p = c.indexOf(search, p);
    if(p===-1) break;
    count++;
    p += search.length;
}
console.log('\nTotal "wms" occurrences in file:', count);

// Check for wmsHeroTitle in the wms object
console.log('wms.wmsHeroTitle:', reparsed.wms?.wmsHeroTitle);
// Check Thai file too
const thc=require('fs').readFileSync('src/i18n/locales/th.js','utf8');
const thm=thc.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const thObj=eval('('+thm[1]+')');
console.log('\nThai wms.wmsHeroTitle:', thObj.wms?.wmsHeroTitle);
console.log('Thai wms.invColProduct:', thObj.wms?.invColProduct);
const thSerialized = JSON.stringify(thObj);
const thReparsed = JSON.parse(thSerialized);
console.log('Thai re-parsed wms.invColProduct:', thReparsed.wms?.invColProduct);
console.log('Thai re-parsed wms keys:', Object.keys(thReparsed.wms).length);
