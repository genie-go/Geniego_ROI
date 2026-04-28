// COMPREHENSIVE CHECK: every locale file's wms object for critical inventory keys
const fs=require('fs'),path=require('path'),D=path.join(__dirname,'src/i18n/locales');
const LOCALES=['ko','en','ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','th','vi','id'];
const KEYS=['invColProduct','invColTotal','invColSafe','invColStatus','invColCost','invColValue','invColAdj','invColSku','invSearchPh','invTableTitle','invNoResult','invLowOnly','invAdjTitle','invAdjQty','invAdjApply','invAdjBtn','invOutOfStock','invLow','invNormal','csvImportBtn','exportCsvBtn','exportExcelBtn'];

console.log('Checking',KEYS.length,'keys across',LOCALES.length,'locales\n');

const missing = {};
LOCALES.forEach(l=>{
    const fp=path.join(D,l+'.js');
    const c=fs.readFileSync(fp,'utf8');
    const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
    const obj=eval('('+m[1]+')');
    const miss=[];
    KEYS.forEach(k=>{
        if(!obj.wms || obj.wms[k]===undefined){
            miss.push(k);
        }
    });
    if(miss.length>0){
        console.log(`❌ ${l}: MISSING ${miss.length} keys: ${miss.join(', ')}`);
        missing[l]=miss;
    } else {
        console.log(`✅ ${l}: ALL ${KEYS.length} keys present`);
    }
});

if(Object.keys(missing).length>0){
    console.log('\nMISSING KEYS SUMMARY:');
    Object.entries(missing).forEach(([l,keys])=>{
        console.log(`  ${l}: ${keys.join(', ')}`);
    });
}
