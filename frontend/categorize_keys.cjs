// Extract all untranslated WMS keys with their English values
// Then generate JSON override files for each locale
const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'src/i18n/locales');

const enC=fs.readFileSync(path.join(DIR,'en.js'),'utf8');
const enM=enC.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const enObj=eval('('+enM[1]+')');
const enWms=enObj.wms||{};

const koC=fs.readFileSync(path.join(DIR,'ko.js'),'utf8');
const koM=koC.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const koObj=eval('('+koM[1]+')');
const koWms=koObj.wms||{};

// Print en->ko mapping for untranslated keys (only first 100 for analysis)
let count=0;
const untranslated={};
Object.entries(enWms).forEach(([k,v])=>{
    if(typeof v==='string' && v.length>2){
        untranslated[k]={en:v, ko:koWms[k]||v};
        count++;
    }
});

// Group by category
const cats={};
Object.entries(untranslated).forEach(([k,v])=>{
    const prefix=k.replace(/[A-Z][a-z].*$/,'').replace(/\d+$/,'');
    if(!cats[prefix])cats[prefix]=[];
    cats[prefix].push({key:k,...v});
});

console.log('=== Untranslated WMS keys by category ===');
Object.entries(cats).sort((a,b)=>b[1].length-a[1].length).forEach(([cat,items])=>{
    console.log(`\n--- ${cat} (${items.length} keys) ---`);
    items.slice(0,5).forEach(i=>console.log(`  ${i.key}: EN="${i.en.slice(0,50)}" KO="${(i.ko||'').slice(0,50)}"`));
    if(items.length>5) console.log(`  ... and ${items.length-5} more`);
});
