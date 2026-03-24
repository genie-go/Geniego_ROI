// Sidebar.jsx의 모든 labelKey 추출 후 ko.js와 대조
const fs = require('fs');

const sidebarPath = 'd:/project/GeniegoROI/frontend/src/layout/Sidebar.jsx';
const koPath = 'd:/project/GeniegoROI/frontend/src/i18n/locales/ko.js';

const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
const koContent = fs.readFileSync(koPath, 'utf8');

// Sidebar.jsx에서 labelKey: "menu.xxx" 추출
const labelKeyRegex = /labelKey:\s*"menu\.([^"]+)"/g;
let match;
const allKeys = new Set();

while ((match = labelKeyRegex.exec(sidebarContent)) !== null) {
  allKeys.add(match[1]);
}

console.log(`=== Sidebar.jsx labelKey 검사 ===`);
console.log(`총 ${allKeys.size}개 메뉴 키 발견\n`);

const missing = [];
const found = [];

allKeys.forEach(key => {
  // ko.js menu 섹션에서 해당 key 존재 확인
  // "key:" 또는 "key :" 패턴
  const pattern1 = new RegExp(`\\b${key}:\\s*"`, 'g');
  if (pattern1.test(koContent)) {
    found.push(key);
  } else {
    missing.push(key);
  }
});

console.log(`✅ ko.js 존재 (${found.length}개):`);
found.forEach(k => console.log('  menu.' + k));

console.log(`\n❌ ko.js 누락 (${missing.length}개) — 추가 필요:`);
missing.forEach(k => console.log('  menu.' + k));
