// session147_b2_extract_japanese.mjs  (v2: E drive + frontend path)
// ko.js JAPANESE 오염 추출 + ja.js 동일 path 값 매칭 → 검수 워크북
// 원칙: N-79 (ja/zh frozen), N-145-A (recursive walk), N-145-D (재정렬 방지)
// 출력: japanese_pollution_workbook.csv (BOM, Excel 호환)

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.env.GENIEGO_ROOT || 'E:/project/GeniegoROI/frontend';
const KO_PATH = path.join(ROOT, 'src/i18n/locales/ko.js');
const JA_PATH = path.join(ROOT, 'src/i18n/locales/ja.js');
const OUT_CSV = path.join(ROOT, 'japanese_pollution_workbook.csv');

// ───── 일본어 감지 ─────
const HIRAGANA = /[\u3040-\u309F]/;
const KATAKANA = /[\u30A0-\u30FF]/;
const JP_PUNCT = /[\u3001\u3002\uFF5E\u30FB]/;
const isJapanese = (s) =>
  typeof s === 'string' && (HIRAGANA.test(s) || KATAKANA.test(s) || JP_PUNCT.test(s));

// ───── recursive walk (N-145-A) ─────
function walk(node, prefix, out) {
  if (node === null || node === undefined) return;
  if (typeof node === 'string') {
    out.push({ path: prefix, value: node, type: 'string' });
    return;
  }
  if (Array.isArray(node)) {
    if (node.every((x) => typeof x === 'string')) {
      out.push({ path: prefix, value: JSON.stringify(node), type: 'array' });
      return;
    }
    node.forEach((item, i) => walk(item, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const next = prefix ? `${prefix}.${k}` : k;
      walk(v, next, out);
    }
  }
}

async function loadLocale(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`locale file not found: ${filePath}`);
  }
  const url = pathToFileURL(filePath).href + `?t=${Date.now()}`;
  const mod = await import(url);
  return mod.default ?? mod;
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

(async () => {
  console.log(`[B2] ROOT       : ${ROOT}`);
  console.log(`[B2] KO_PATH    : ${KO_PATH}`);
  console.log(`[B2] JA_PATH    : ${JA_PATH}`);
  console.log('[B2] loading ko.js ...');
  const ko = await loadLocale(KO_PATH);
  console.log('[B2] loading ja.js ...');
  const ja = await loadLocale(JA_PATH);

  const koLeaves = [];
  const jaLeaves = [];
  walk(ko, '', koLeaves);
  walk(ja, '', jaLeaves);

  const jaMap = new Map(jaLeaves.map((x) => [x.path, x.value]));
  const polluted = koLeaves.filter((x) => isJapanese(x.value));

  const nsStat = {};
  for (const row of polluted) {
    const ns = row.path.split('.')[0] || '_root_';
    nsStat[ns] = (nsStat[ns] || 0) + 1;
  }

  const header = ['path', 'ko_current', 'ja_value', 'proposed_ko', 'ns', 'type'].join(',');
  const lines = [header];
  for (const row of polluted) {
    const ns = row.path.split('.')[0] || '_root_';
    const jaVal = jaMap.has(row.path) ? jaMap.get(row.path) : '';
    lines.push(
      [
        csvCell(row.path),
        csvCell(row.value),
        csvCell(jaVal),
        '',
        csvCell(ns),
        csvCell(row.type),
      ].join(','),
    );
  }

  fs.writeFileSync(OUT_CSV, '\uFEFF' + lines.join('\n'), 'utf8');

  console.log('\n========== 147 B2 SUMMARY ==========');
  console.log(`ko total leaves      : ${koLeaves.length}`);
  console.log(`ja total leaves      : ${jaLeaves.length}`);
  console.log(`JAPANESE polluted    : ${polluted.length}`);
  console.log(`  └ ja.js matched    : ${polluted.filter((r) => jaMap.has(r.path)).length}`);
  console.log(`  └ ja.js missing    : ${polluted.filter((r) => !jaMap.has(r.path)).length}`);
  console.log('\nTop NS:');
  Object.entries(nsStat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([ns, n]) => console.log(`  ${ns.padEnd(28)} ${n}`));
  console.log(`\n[OUT] ${OUT_CSV}`);
  console.log('====================================');
})();
