// session148_c1_extract_latin_long.mjs
// LATIN_LONG 3,797건 추출 (CSV-aware parser, BOM 처리)
// 입력: ./ko_self_pollution_workbook.csv (repo root)
// 출력: ./latin_long_workbook.csv (3,797 rows + header)
// 부가: ./latin_long_summary.txt (길이 분포, 샘플)

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INPUT = resolve('./ko_self_pollution_workbook.csv');
const OUT_CSV = resolve('./latin_long_workbook.csv');
const OUT_SUMMARY = resolve('./latin_long_summary.txt');

// ---------- CSV-aware parser (RFC 4180 호환) ----------
function parseCSV(text) {
  // BOM 제거
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (c === '\r') {
        // CRLF or CR alone
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
        if (text[i] === '\n') i++;
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }
  // 마지막 필드/행 처리
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---------- CSV-safe writer ----------
function csvEscape(s) {
  if (s == null) return '';
  s = String(s);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\n');
}

// ---------- 메인 ----------
console.log('[c1] Reading:', INPUT);
const text = readFileSync(INPUT, 'utf8');
const rows = parseCSV(text);
console.log(`[c1] Parsed rows: ${rows.length} (including header)`);

const header = rows[0];
console.log('[c1] Header:', header);

// 헤더 인덱스
const idx = {
  ns: header.indexOf('ns'),
  path: header.indexOf('path'),
  pollution_type: header.indexOf('pollution_type'),
  ko_value: header.indexOf('ko_value'),
  ja_value: header.indexOf('ja_value'),
  en_value: header.indexOf('en_value'),
  ko_length: header.indexOf('ko_length'),
  suggested_ko: header.indexOf('suggested_ko'),
};

for (const [k, v] of Object.entries(idx)) {
  if (v < 0) {
    console.error(`[c1] ERROR: Column "${k}" not found in header`);
    process.exit(1);
  }
}

// LATIN_LONG 필터
const latinLongRows = rows.slice(1).filter(r => r[idx.pollution_type] === 'LATIN_LONG');
console.log(`[c1] LATIN_LONG rows: ${latinLongRows.length}`);

// 길이 분포 분석
const lengthBuckets = {
  '1-10': 0,
  '11-20': 0,
  '21-50': 0,
  '51-100': 0,
  '101-200': 0,
  '201-500': 0,
  '500+': 0,
};

const uniqueKoValues = new Map(); // ko_value → count

for (const r of latinLongRows) {
  const len = parseInt(r[idx.ko_length], 10) || r[idx.ko_value].length;
  if (len <= 10) lengthBuckets['1-10']++;
  else if (len <= 20) lengthBuckets['11-20']++;
  else if (len <= 50) lengthBuckets['21-50']++;
  else if (len <= 100) lengthBuckets['51-100']++;
  else if (len <= 200) lengthBuckets['101-200']++;
  else if (len <= 500) lengthBuckets['201-500']++;
  else lengthBuckets['500+']++;

  const kv = r[idx.ko_value];
  uniqueKoValues.set(kv, (uniqueKoValues.get(kv) || 0) + 1);
}

// 출력 CSV
const outRows = [header, ...latinLongRows];
writeFileSync(OUT_CSV, toCSV(outRows), 'utf8');
console.log(`[c1] Wrote: ${OUT_CSV} (${latinLongRows.length} rows)`);

// 요약
const topFreq = [...uniqueKoValues.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30);

const summary = `# LATIN_LONG Extract Summary (session148 c1)

## Input
- File: ${INPUT}
- Total rows: ${rows.length - 1} (data) + 1 (header)

## LATIN_LONG count
- ${latinLongRows.length}

## Length distribution (ko_length column)
${Object.entries(lengthBuckets).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

## Unique ko_value count
- ${uniqueKoValues.size} unique values across ${latinLongRows.length} rows
- Duplication rate: ${((1 - uniqueKoValues.size / latinLongRows.length) * 100).toFixed(1)}%

## Top 30 most frequent ko_values (en.js polluted into ko.js)
${topFreq.map(([v, c], i) => `${String(i + 1).padStart(3)}. [${c}x] ${JSON.stringify(v).slice(0, 200)}`).join('\n')}

## Output
- ${OUT_CSV}
`;

writeFileSync(OUT_SUMMARY, summary, 'utf8');
console.log(`[c1] Wrote: ${OUT_SUMMARY}`);
console.log('[c1] DONE');
