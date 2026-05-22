// 12 lang vs ko 실제 missing leaf path 역측정
// - ko 의 모든 leaf path 추출
// - 12 lang 각각에서 부재한 path 카운트
// - top 30 ns 별 missing 분포 출력
// - 실제 missing total 출력

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LANGS_12 = ['en','es','fr','th','vi','id','de','zh-TW','ar','hi','pt','ru'];
const I18N_DIR = 'frontend/src/i18n/locales';

function leafPaths(obj, prefix = '') {
  const paths = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const np = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      paths.push(...leafPaths(v, np));
    } else {
      paths.push(np);
    }
  }
  return paths;
}

async function loadLocale(lang) {
  const filePath = path.resolve(I18N_DIR, `${lang}.js`);
  const mod = await import(pathToFileURL(filePath).href);
  return mod.default || mod;
}

console.log('ko.js 로딩 중...');
const ko = await loadLocale('ko');
const koPaths = new Set(leafPaths(ko));
console.log(`ko leaf paths: ${koPaths.size}`);

const resultByLang = {};
const missingNsCount = {}; // ns -> total missing across all langs

for (const lang of LANGS_12) {
  process.stdout.write(`  ${lang} 분석 중...`);
  const lObj = await loadLocale(lang);
  const lPaths = new Set(leafPaths(lObj));

  const missing = [];
  for (const p of koPaths) {
    if (!lPaths.has(p)) missing.push(p);
  }

  resultByLang[lang] = missing.length;

  for (const p of missing) {
    const ns = p.split('.')[0];
    missingNsCount[ns] = (missingNsCount[ns] || 0) + 1;
  }

  console.log(` missing: ${missing.length}`);
}

// top 30 ns 별 missing 분포
const top30 = Object.entries(missingNsCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

console.log('\n--- TOP 30 NS 별 missing (12 lang 합산) ---');
for (const [ns, cnt] of top30) {
  console.log(`  ${ns.padEnd(40)} ${cnt}`);
}

const grandTotal = Object.values(resultByLang).reduce((a, b) => a + b, 0);
console.log('\n--- BY LANG ---');
for (const [lang, cnt] of Object.entries(resultByLang)) {
  console.log(`  ${lang.padEnd(8)} ${cnt}`);
}
console.log(`\nGRAND TOTAL missing (12 lang 합산): ${grandTotal}`);
