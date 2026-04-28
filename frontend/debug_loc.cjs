const c=require('fs').readFileSync('src/i18n/locales/ja.js','utf8');
const m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/);
const obj=eval('('+m[1]+')');

// Check if invColProduct is in wms
console.log('wms.invColProduct:',obj.wms?.invColProduct);
console.log('wms.invColTotal:',obj.wms?.invColTotal);
console.log('wms.invColSafe:',obj.wms?.invColSafe);
console.log('wms.invColStatus:',obj.wms?.invColStatus);
console.log('wms.invColCost:',obj.wms?.invColCost);
console.log('wms.invColValue:',obj.wms?.invColValue);
console.log('wms.invColAdj:',obj.wms?.invColAdj);
console.log('wms.invSearchPh:',obj.wms?.invSearchPh);
console.log('wms.invTableTitle:',obj.wms?.invTableTitle);
console.log('wms.invNoResult:',obj.wms?.invNoResult);
console.log('wms.invLowOnly:',obj.wms?.invLowOnly);

// Check total wms keys
console.log('\nTotal wms keys:',Object.keys(obj.wms).length);
console.log('Keys containing "invCol":',Object.keys(obj.wms).filter(k=>k.startsWith('invCol')));
