// 150차 S2: s140 신규 93건 정밀 분류 (S1 로직 버그 수정)
// 우선순위: Kana/CJK-only 체크가 ja_value 매칭보다 우선
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_s2_tmp.mjs');
fs.writeFileSync(tmpPath, src, 'utf8');
const mod = await import('file://' + tmpPath.replace(/\\/g, '/'));
fs.unlinkSync(tmpPath);
const ko = mod.default;

function get(obj, p) {
  const parts = p.split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

// 안전한 CSV 파싱 (RFC 4180 simplified)
function parseCSVLine(line) {
  const fields = [];
  let i = 0, field = '', inQuote = false;
  while (i < line.length) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i+1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuote = false; i++; continue; }
      field += c; i++;
    } else {
      if (c === '"') { inQuote = true; i++; continue; }
      if (c === ',') { fields.push(field); field = ''; i++; continue; }
      field += c; i++;
    }
  }
  fields.push(field);
  return fields;
}

const diffOut = execSync('git diff HEAD -- s140_step2_pv.csv', { encoding: 'utf8' });
const newRows = [];
for (const line of diffOut.split('\n')) {
  if (!line.startsWith('+')) continue;
  if (line.startsWith('+++')) continue;
  const content = line.slice(1);
  const fields = parseCSVLine(content);
  if (fields.length < 5) continue;
  newRows.push({
    path: fields[0],
    ja_value: fields[1],
    ko_value: fields[2],
    ja_type: fields[3],
    ja_hangul: fields[4],
  });
}

console.log('Diff rows extracted:', newRows.length);

// 분류 우선순위 재설계
const stats = {
  ko_japanese_leak: 0,        // Kana/한자만 + Hangul 없음 (실제 일본어 잔존)
  ko_translated: 0,           // Hangul 포함 (정상)
  ko_english_pure: 0,         // ASCII만 (영문 leak)
  ko_intentional_mixed: 0,    // Hangul + 영문 또는 Hangul + 한자 (의도된 혼합)
  ko_missing: 0,              // ko.js 에 없음
  ko_other: 0,                // 이모지/심볼만 등
};
const samples = {
  ko_japanese_leak: [],
  ko_english_pure: [],
  ko_missing: [],
  ko_intentional_mixed: [],
};

const leaks = [];

for (const r of newRows) {
  const actual = get(ko, r.path);
  if (actual === undefined) {
    stats.ko_missing++;
    if (samples.ko_missing.length < 5) samples.ko_missing.push(r.path);
    continue;
  }
  if (typeof actual !== 'string') continue;

  const hasHangul = /[가-힯]/.test(actual);
  const hasKana = /[぀-ゟ゠-ヿ]/.test(actual);
  const hasCJK = /[一-鿿]/.test(actual);
  const hasAscii = /[A-Za-z]/.test(actual);

  // 최우선: Hangul 없고 Kana 또는 CJK 있으면 → Japanese leak
  if (!hasHangul && (hasKana || hasCJK)) {
    stats.ko_japanese_leak++;
    leaks.push({ path: r.path, ko_value: actual, ja_value: r.ja_value });
    if (samples.ko_japanese_leak.length < 20) samples.ko_japanese_leak.push({ path: r.path, val: actual });
    continue;
  }

  // Hangul 있으면 정상 (영문 혼합도 한국어 표기로 인정)
  if (hasHangul) {
    if (hasAscii || hasCJK) {
      stats.ko_intentional_mixed++;
      if (samples.ko_intentional_mixed.length < 5) samples.ko_intentional_mixed.push({ path: r.path, val: actual });
    } else {
      stats.ko_translated++;
    }
    continue;
  }

  // Hangul 없고 ASCII만 (영문 leak)
  if (hasAscii && !hasKana && !hasCJK) {
    stats.ko_english_pure++;
    if (samples.ko_english_pure.length < 10) samples.ko_english_pure.push({ path: r.path, val: actual });
    continue;
  }

  // 그 외 (이모지/심볼만)
  stats.ko_other++;
}

console.log('\n=== Refined Classification ===');
for (const [k, v] of Object.entries(stats)) console.log('  ' + k + ': ' + v);

console.log('\n=== ko_japanese_leak FULL LIST (' + stats.ko_japanese_leak + ' items) ===');
for (const s of samples.ko_japanese_leak) console.log('  ' + s.path + ' = ' + JSON.stringify(s.val));

console.log('\n=== ko_english_pure (' + stats.ko_english_pure + ' items) ===');
for (const s of samples.ko_english_pure) console.log('  ' + s.path + ' = ' + JSON.stringify(s.val));

console.log('\n=== ko_intentional_mixed sample (' + stats.ko_intentional_mixed + ' items) ===');
for (const s of samples.ko_intentional_mixed) console.log('  ' + s.path + ' = ' + JSON.stringify(s.val));

console.log('\n=== ko_missing sample (' + stats.ko_missing + ' items) ===');
for (const s of samples.ko_missing) console.log('  ' + s);

// 전체 Japanese leak 저장 (S3 에서 한국어 번역 작업 입력)
const esc = (s) => {
  s = String(s);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};
fs.writeFileSync('session150_s2_japanese_leaks.csv',
  'path,ko_value,ja_value\n' + leaks.map(r => [r.path, r.ko_value, r.ja_value].map(esc).join(',')).join('\n'),
  'utf8');
console.log('\nFull Japanese leaks saved: session150_s2_japanese_leaks.csv (' + leaks.length + ' rows)');
