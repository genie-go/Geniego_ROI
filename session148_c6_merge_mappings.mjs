// session148_c6_merge_mappings.mjs
// LATIN_LONG mappings 병합 (auto + top500) + unmapped tail 분리
// 입력:
//   ./latin_long_auto_mapped.csv (c2: 258 rows, 사전 자동 매핑)
//   ./latin_long_top500_raw_final_mapped.csv (c5: 500 rows, 검수자 번역)
//   ./latin_long_workbook.csv (c1: 3,798 base — 패치 대상 식별용)
// 출력:
//   ./latin_long_c2_c5_merged.csv (병합본, 패치 1단계 입력)
//   ./latin_long_c6_unmapped.csv (c4 batch 처리 대상)
//   ./latin_long_c6_log.txt
//
// 병합 로직:
// 1. (auto_mapped) ko_value → suggested_ko 매핑 dict 구축
// 2. (top500_mapped) ko_value → suggested_ko 매핑 dict 추가 (중복 시 top500 우선)
// 3. (workbook 3,798) 각 row 순회 → dict hit 시 merged.csv, miss 시 unmapped.csv
//
// 정합성 검증: merged + unmapped = 3,798

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const IN_AUTO = resolve('./latin_long_auto_mapped.csv');
const IN_TOP500 = resolve('./latin_long_top500_raw_final_mapped.csv');
const IN_WORKBOOK = resolve('./latin_long_workbook.csv');
const OUT_MERGED = resolve('./latin_long_c2_c5_merged.csv');
const OUT_UNMAPPED = resolve('./latin_long_c6_unmapped.csv');
const OUT_LOG = resolve('./latin_long_c6_log.txt');

// ---------- CSV parser (RFC 4180) ----------
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQ = false; i++; }
      } else { field += c; i++; }
    } else {
      if (c === '"') { inQ = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\r') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
        if (text[i] === '\n') i++;
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
      } else { field += c; i++; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvEscape(s) {
  if (s == null) return '';
  s = String(s);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function toCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\n') + '\n';
}

// ---------- 메인 ----------
console.log('[c6] Loading auto_mapped:', IN_AUTO);
const autoRows = parseCSV(readFileSync(IN_AUTO, 'utf8'));
const autoHeader = autoRows[0];
const autoData = autoRows.slice(1).filter(r => r.length === autoHeader.length);
console.log(`[c6] auto_mapped: ${autoData.length} rows`);

console.log('[c6] Loading top500_mapped:', IN_TOP500);
const topRows = parseCSV(readFileSync(IN_TOP500, 'utf8'));
const topHeader = topRows[0];
const topData = topRows.slice(1).filter(r => r.length === topHeader.length);
console.log(`[c6] top500_mapped: ${topData.length} rows`);

console.log('[c6] Loading workbook:', IN_WORKBOOK);
const wbRows = parseCSV(readFileSync(IN_WORKBOOK, 'utf8'));
const wbHeader = wbRows[0];
const wbData = wbRows.slice(1).filter(r => r.length === wbHeader.length);
console.log(`[c6] workbook (base): ${wbData.length} rows`);

// 헤더 인덱스 (workbook 기준 — 8 columns: ns, path, pollution_type, ko_value, ja_value, en_value, ko_length, suggested_ko)
const wbIdx = {
  ns: wbHeader.indexOf('ns'),
  path: wbHeader.indexOf('path'),
  pollution_type: wbHeader.indexOf('pollution_type'),
  ko_value: wbHeader.indexOf('ko_value'),
  ja_value: wbHeader.indexOf('ja_value'),
  en_value: wbHeader.indexOf('en_value'),
  ko_length: wbHeader.indexOf('ko_length'),
  suggested_ko: wbHeader.indexOf('suggested_ko'),
};

// auto_mapped 사전 (ko_value → suggested_ko)
// auto는 workbook과 동일 헤더 (8 columns)
const autoIdxKo = autoHeader.indexOf('ko_value');
const autoIdxSk = autoHeader.indexOf('suggested_ko');
const dictAuto = new Map();
for (const r of autoData) {
  const ko = r[autoIdxKo];
  const sk = r[autoIdxSk];
  if (ko && sk) dictAuto.set(ko, sk);
}
console.log(`[c6] auto dict: ${dictAuto.size} unique entries`);

// top500_mapped 사전 (ko_value → suggested_ko)
// top500은 c5 헤더 (6 columns: ko_value, count, path, ja_value, en_value, suggested_ko)
const topIdxKo = topHeader.indexOf('ko_value');
const topIdxSk = topHeader.indexOf('suggested_ko');
const dictTop = new Map();
for (const r of topData) {
  const ko = r[topIdxKo];
  const sk = r[topIdxSk];
  if (ko && sk) dictTop.set(ko, sk);
}
console.log(`[c6] top500 dict: ${dictTop.size} unique entries`);

// 통합 사전 (top500이 auto를 override — 검수자 번역 우선)
const dictMerged = new Map(dictAuto);
let overrides = 0;
for (const [k, v] of dictTop) {
  if (dictMerged.has(k) && dictMerged.get(k) !== v) overrides++;
  dictMerged.set(k, v);
}
console.log(`[c6] merged dict: ${dictMerged.size} unique entries (${overrides} overrides)`);

// workbook 순회 → merged / unmapped 분리
const merged = [];
const unmapped = [];
for (const r of wbData) {
  const ko = r[wbIdx.ko_value];
  const sk = dictMerged.get(ko);
  if (sk) {
    const newRow = [...r];
    newRow[wbIdx.suggested_ko] = sk;
    merged.push(newRow);
  } else {
    unmapped.push(r);
  }
}

// 정합성 검증
console.log(`[c6] merged: ${merged.length}, unmapped: ${unmapped.length}, total: ${merged.length + unmapped.length} (expected ${wbData.length})`);
if (merged.length + unmapped.length !== wbData.length) {
  console.error('[c6] FATAL: row count mismatch');
  process.exit(1);
}

// 출력
writeFileSync(OUT_MERGED, toCSV([wbHeader, ...merged]), 'utf8');
writeFileSync(OUT_UNMAPPED, toCSV([wbHeader, ...unmapped]), 'utf8');

// 로그
const log = `# session148 c6 Merge Log

## Inputs
- auto_mapped (c2): ${autoData.length} rows → ${dictAuto.size} unique entries
- top500_mapped (c5): ${topData.length} rows → ${dictTop.size} unique entries
- workbook (c1 base): ${wbData.length} rows

## Merge
- Merged dict: ${dictMerged.size} unique entries
- Top500 overrides auto: ${overrides}

## Result (vs workbook ${wbData.length})
- Merged (suggested_ko filled): ${merged.length} rows (${((merged.length / wbData.length) * 100).toFixed(1)}%)
- Unmapped (need c4 batch processing): ${unmapped.length} rows
- Total: ${merged.length + unmapped.length} ✓

## Outputs
- ${OUT_MERGED} (${merged.length} rows + header) — patch input
- ${OUT_UNMAPPED} (${unmapped.length} rows + header) — c4 batch tail
`;
writeFileSync(OUT_LOG, log, 'utf8');

console.log('[c6] DONE');
