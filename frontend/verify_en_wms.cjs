// verify_en_wms.cjs - en.js의 wms 섹션 구조 확인
// ES Module을 분석하기 위해 파일 내용 직접 파싱
const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src', 'i18n', 'locales', 'en.js');
const content = fs.readFileSync(enPath, 'utf8');

// wms 내부 확인
const hasInnerWms = content.match(/^\s{4}wms:\s*\{/m);
const hasOuterWms = content.match(/^en\.wms\s*=/m);

console.log('Inner wms (const en { wms: {...} }):', hasInnerWms ? 'YES' : 'NO');
console.log('Outer wms (en.wms = {...}):', hasOuterWms ? 'YES at line ' + (content.substring(0, content.indexOf('en.wms =')).split('\n').length) : 'NO');

// tabWarehouse 확인
const tabWarehouseMatch = content.match(/tabWarehouse:\s*"([^"]*)"/);
if (tabWarehouseMatch) {
  console.log('tabWarehouse value:', tabWarehouseMatch[1]);
} else {
  console.log('tabWarehouse: NOT FOUND in en.js');
}

// tabInventory 확인
const tabInventoryMatch = content.match(/tabInventory:\s*"([^"]*)"/);
if (tabInventoryMatch) {
  console.log('tabInventory value:', tabInventoryMatch[1]);
}

// wms 섹션 위치 확인
const wmsPos = content.indexOf('    wms: {');
if (wmsPos >= 0) {
  const lineNum = content.substring(0, wmsPos).split('\n').length;
  console.log('wms inner section at line:', lineNum);
  const wmsSample = content.substring(wmsPos, wmsPos + 200);
  console.log('Sample:', wmsSample.substring(0, 200));
}

// mobileNav 뒤에 wms가 오는지 확인  
const mobileNavMatch = content.match(/mobileNav:\s*\{[^}]*\},(\s*\n\s*)(.*)\n/);
if (mobileNavMatch) {
  console.log('\nAfter mobileNav:');
  console.log(JSON.stringify(mobileNavMatch[0].substring(0, 100)));
}

// en 객체 닫히는 위치 (첫 번째 }; )
const firstClose = content.indexOf('\n};\n');
if (firstClose >= 0) {
  const lineNum = content.substring(0, firstClose).split('\n').length;
  console.log('\nFirst }; at line:', lineNum);
  const around = content.substring(firstClose - 100, firstClose + 50);
  console.log('Context:', JSON.stringify(around));
}
