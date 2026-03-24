// convert_outer_wms.cjs - outer en.wms = {...} 를 Object.assign(en.wms || {}, {...}) 로 변환
const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src', 'i18n', 'locales', 'en.js');
let content = fs.readFileSync(enPath, 'utf8');

// outer en.wms = { ... }; 블록 찾기  
// en.wms = {\n 로 시작하는 블록을 찾아서 Object.assign 방식으로 변환
const outerWmsRegex = /^(en\.wms\s*=\s*)\{([\s\S]*?)\};(\s*\n)/m;
const match = content.match(outerWmsRegex);

if (match) {
  const innerContent = match[2];
  const replacement = `en.wms = Object.assign(en.wms || {}, {${innerContent}});${match[3]}`;
  content = content.replace(outerWmsRegex, replacement);
  fs.writeFileSync(enPath, content, 'utf8');
  console.log('outer en.wms converted to Object.assign');
  
  // 검증
  const verified = fs.readFileSync(enPath, 'utf8');
  const hasAssign = verified.includes('en.wms = Object.assign(en.wms || {}, {');
  console.log('Conversion verified:', hasAssign ? 'SUCCESS' : 'FAILED');
} else {
  console.log('outer en.wms pattern not found');
  // 이미 Object.assign 방식인지 확인
  if (content.includes('en.wms = Object.assign(en.wms')) {
    console.log('Already using Object.assign');
  }
}
