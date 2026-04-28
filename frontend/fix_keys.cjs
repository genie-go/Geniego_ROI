// MEGA FIX: Remove ALL top-level duplicate keys that exist inside wms namespace
// The problem: some keys like invColProduct exist both in wms:{} and at root level
// When eval() processes them, the later one wins, but the first one causes confusion
const fs=require('fs'),path=require('path'),D=path.join(__dirname,'src/i18n/locales');
const locales=['ja','zh','zh-TW','es','fr','de','pt','ru','ar','hi','th','vi','id','ko','en'];

// Keys that belong ONLY inside wms namespace
const WMS_KEYS=[
    'invColProduct','invColTotal','invColSafe','invColStatus','invColCost','invColValue','invColAdj',
    'invColSku','invSearchPh','invTableTitle','invNoResult','invLowOnly','invAdjTitle','invAdjQty',
    'invAdjApply','invAdjBtn','invOutOfStock','invLow','invNormal',
    'csvImportBtn','exportCsvBtn','exportExcelBtn','csvImportTitle','csvImportDesc',
    'csvRowsDetected','csvExecuteBtn','csvImportDone',
    'invColSKU','invColQuantity','invColWarehouse','invLastUpdate',
    // Add more wms-specific keys
    'wmsHeroTitle','wmsHeroDesc','wmsBadgeWh','wmsBadgeCarrier','wmsBadgeSku',
];

locales.forEach(l=>{
    const fp=path.join(D,l+'.js');
    const c=fs.readFileSync(fp,'utf8');
    const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
    const obj=eval('('+m[1]+')');
    
    // Find keys at root level that should only be in wms
    let cleaned=0;
    WMS_KEYS.forEach(k=>{
        if(obj[k]!==undefined && obj.wms && obj.wms[k]!==undefined){
            // Root level has same key as wms - remove from root
            delete obj[k];
            cleaned++;
        }
    });
    
    // Also check: ANY key at root level that starts with "inv" or "csv" or "wms" (lowercase) 
    // These are likely misplaced wms keys
    Object.keys(obj).forEach(k=>{
        if((k.startsWith('inv') || k.startsWith('csv') || k.startsWith('wms') || 
            k.startsWith('lot') || k.startsWith('pick') || k.startsWith('repl') ||
            k.startsWith('recv') || k.startsWith('audit') || k.startsWith('track') ||
            k.startsWith('invc') || k.startsWith('bdl') || k.startsWith('sup') ||
            k.startsWith('whAdd') || k.startsWith('whSave') || k.startsWith('whCancel')) 
            && typeof obj[k]==='string' && obj.wms){
            // This is a flat key that belongs in wms
            if(!obj.wms[k]) obj.wms[k]=obj[k]; // Move to wms if not there
            delete obj[k];
            cleaned++;
        }
    });
    
    if(cleaned>0){
        fs.writeFileSync(fp,'export default '+JSON.stringify(obj)+'\n');
        console.log(l+': cleaned '+cleaned+' misplaced keys');
    } else {
        console.log(l+': OK');
    }
});

// Verify
console.log('\n--- Verification ---');
locales.forEach(l=>{
    const fp=path.join(D,l+'.js');
    const c=fs.readFileSync(fp,'utf8');
    const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
    const obj=eval('('+m[1]+')');
    const rootInv=Object.keys(obj).filter(k=>k.startsWith('inv'));
    console.log(l+': wms keys='+Object.keys(obj.wms||{}).length+
        ', root inv keys='+rootInv.length+
        (rootInv.length>0?' ['+rootInv.join(',')+']':''));
});
