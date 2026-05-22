// ns 별 실제 missing path 추출 + ko_value 수집
// 사용법: node tools/session144_extract_ns_missing.mjs reportBuilder userMgmt
// 출력: ns_missing_{ns}.json

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const LANGS_12 = ['en','es','fr','th','vi','id','de','zh-TW','ar','hi','pt','ru'];
const I18N_DIR = 'frontend/src/i18n/locales';
const TARGET_NS = process.argv.slice(2);

if (TARGET_NS.length === 0) {
  console.error('사용법: node tools/session144_extract_ns_missing.mjs <ns1> [ns2] ...');
  process.exit(1);
}

function leafPaths(obj, prefix = '') {
  const paths = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const np = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      paths.push(...leafPaths(v, np));
    } else {
      paths.push([np, v]);
    }
  }
  return paths;
}

async function load(lang) {
  const mod = await import(pathToFileURL(path.resolve(I18N_DIR, `${lang}.js`)).href);
  return mod.default || mod;
}

// 13 lang 파일 존재 확인
for (const lang of ['ko', ...LANGS_12]) {
  if (!fs.existsSync(path.join(I18N_DIR, `${lang}.js`))) {
    console.error(`ERROR: ${lang}.js 없음`);
    process.exit(1);
  }
}

console.log('ko.js 로딩...');
const ko = await load('ko');

for (const ns of TARGET_NS) {
  if (!(ns in ko)) {
    console.error(`ERROR: ko.js 에 '${ns}' ns 없음`);
    continue;
  }

  const nsObj = ko[ns];
  // ko 의 ns 내 leaf path 전체 (prefix 없이 ns. 붙임)
  const koLeaves = leafPaths(nsObj, ns); // [[fullPath, value], ...]
  const koLeafMap = Object.fromEntries(koLeaves); // path -> ko_value
  const koStringCount = koLeaves.filter(([, v]) => typeof v === 'string').length;

  console.log(`\n=== NS: ${ns} ===`);
  console.log(`  ko leaf 총 ${koLeaves.length}개 (string: ${koStringCount}, string 비율: ${(koStringCount/koLeaves.length*100).toFixed(1)}%)`);

  const result = { ns, langs: {} };

  for (const lang of LANGS_12) {
    process.stdout.write(`  ${lang} 분석 중...`);
    const lObj = await load(lang);
    const lLeaves = leafPaths(lObj[ns] || {}, ns);
    const lPathSet = new Set(lLeaves.map(([p]) => p));

    const missing = koLeaves
      .filter(([p, v]) => typeof v === 'string' && !lPathSet.has(p))
      .map(([p, v]) => ({ path: p, ko_value: v }));

    result.langs[lang] = missing;
    console.log(` missing: ${missing.length}건`);
  }

  const outFile = `ns_missing_${ns}.json`;
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`  -> ${outFile} 저장 완료`);

  // sample 5개 출력 (en 기준)
  const sample = result.langs['en']?.slice(0, 5) || [];
  if (sample.length > 0) {
    console.log(`\n  [${ns}] en 기준 sample 5개:`);
    console.log(`  ${'path'.padEnd(50)} ko_value`);
    console.log(`  ${'-'.repeat(80)}`);
    for (const { path: p, ko_value } of sample) {
      const val = String(ko_value).slice(0, 40);
      console.log(`  ${p.padEnd(50)} ${val}`);
    }
  }
}

console.log('\n완료.');
