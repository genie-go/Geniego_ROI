// en.js + ja.js 기존 값 참조 확인
// en_translation_workbook.json 의 74개 path 를 en/ja 에서 조회
// 출력: en_existing_check.json

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const I18N_DIR = 'frontend/src/i18n/locales';
const WORKBOOK = 'en_translation_workbook.json';

if (!fs.existsSync(WORKBOOK)) {
  console.error(`ERROR: ${WORKBOOK} 없음. translate 도구 먼저 실행하세요.`);
  process.exit(1);
}

const workbook = JSON.parse(fs.readFileSync(WORKBOOK, 'utf8'));

async function load(lang) {
  const mod = await import(pathToFileURL(path.resolve(I18N_DIR, `${lang}.js`)).href);
  return mod.default || mod;
}

function leafPaths(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const np = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) out.push(...leafPaths(v, np));
    else out.push([np, v]);
  }
  return out;
}

console.log('en.js / ja.js 로딩...');
const [en, ja] = await Promise.all([load('en'), load('ja')]);

const enLeafMap = new Map(leafPaths(en));
const jaLeafMap = new Map(leafPaths(ja));

// leaf key → [{path, value}] 인덱스 (en)
const enByLeaf = new Map();
for (const [p, v] of enLeafMap) {
  const leaf = p.split('.').pop();
  if (!enByLeaf.has(leaf)) enByLeaf.set(leaf, []);
  enByLeaf.get(leaf).push({ path: p, value: v });
}

const results = [];
let cntExact = 0, cntSimilar = 0, cntNone = 0;

for (const { path: wPath, ko_value } of workbook) {
  const leaf = wPath.split('.').pop();

  const exactEn = enLeafMap.has(wPath) ? enLeafMap.get(wPath) : null;
  const exactJa = jaLeafMap.has(wPath) ? jaLeafMap.get(wPath) : null;

  // similar: 같은 leaf key, 다른 ns
  const similar = (enByLeaf.get(leaf) || []).filter(e => e.path !== wPath);

  let suggestion_source = 'none';
  if (exactEn !== null) suggestion_source = 'exact';
  else if (similar.length > 0) suggestion_source = 'similar';

  if (suggestion_source === 'exact') cntExact++;
  else if (suggestion_source === 'similar') cntSimilar++;
  else cntNone++;

  results.push({
    path: wPath,
    ko_value,
    exact_en: exactEn,
    exact_ja: exactJa,
    similar_matches: similar.slice(0, 3),
    suggestion_source,
  });
}

fs.writeFileSync('en_existing_check.json', JSON.stringify(results, null, 2));

// 콘솔 표 출력
console.log(`\n${'path'.padEnd(42)} ${'ko_value'.padEnd(28)} ${'exact_en'.padEnd(28)} similar_path:value`);
console.log('-'.repeat(130));
for (const r of results) {
  const ko = String(r.ko_value).slice(0, 26);
  const en_ = r.exact_en !== null ? String(r.exact_en).slice(0, 26) : '—';
  const sim = r.similar_matches[0] ? `${r.similar_matches[0].path}: ${String(r.similar_matches[0].value).slice(0, 25)}` : '—';
  console.log(`${r.path.padEnd(42)} ${ko.padEnd(28)} ${en_.padEnd(28)} ${sim}`);
}

console.log(`\n--- 종합 통계 ---`);
console.log(`exact 매칭 (en 에 동일 path 존재): ${cntExact}건`);
console.log(`similar 매칭 (같은 leaf, 다른 ns) : ${cntSimilar}건`);
console.log(`매칭 없음                          : ${cntNone}건`);
console.log(`\n-> en_existing_check.json 저장 완료`);
