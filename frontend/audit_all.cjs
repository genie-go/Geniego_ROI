// Audit ALL locales for English-only WMS keys
const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'src/i18n/locales');
const locales=['ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','th','vi','id'];

// Get all English WMS keys from en.js as reference
const enC=fs.readFileSync(path.join(DIR,'en.js'),'utf8');
const enM=enC.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const enObj=eval('('+enM[1]+')');
const enWms=enObj.wms||{};
console.log('Total WMS keys in en.js:', Object.keys(enWms).length);

// Check each locale
const allEngKeys=new Set();
locales.forEach(l=>{
    const fp=path.join(DIR,l+'.js');
    const c=fs.readFileSync(fp,'utf8');
    const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
    const o=eval('('+m[1]+')');
    const w=o.wms||{};
    let engCount=0;
    Object.entries(w).forEach(([k,v])=>{
        if(typeof v==='string' && enWms[k]===v && v.length>2){
            engCount++;
            allEngKeys.add(k);
        }
    });
    console.log(l+': '+engCount+' keys still == en.js value');
});

console.log('\nUnion of untranslated keys across all locales:', allEngKeys.size);
// Print all untranslated keys
const sorted=[...allEngKeys].sort();
sorted.forEach(k=>console.log('  '+k));
