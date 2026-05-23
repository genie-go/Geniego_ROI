// 150차 S1: s140_step2_pv.csv 신규 93건 vs ko.js 실측 분석
// 각 path가 ko.js 에 존재하는지, ko_value가 한국어인지, 일본어 잔존인지 분류
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// === ko.js 로드 ===
const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_s1_tmp.mjs');
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

// === git diff 로부터 신규 93건 추출 ===
const diffOut = execSync('git diff HEAD -- s140_step2_pv.csv', { encoding: 'utf8' });
const newRows = [];
for (const line of diffOut.split('\n')) {
  if (!line.startsWith('+')) continue;
  if (line.startsWith('+++')) continue;
  const content = line.slice(1);
  // CSV 파싱 (단순 split)
  const fields = content.split(',');
  if (fields.length < 5) continue;
  const [path_, ja_value, ko_value, ja_type, ja_hangul] = fields;
  newRows.push({ path: path_, ja_value, ko_value, ja_type, ja_hangul });
}

console.log('Diff rows extracted:', newRows.length);

// === 각 row 분류 ===
const stats = {
  ko_translated: 0,           // ko.js에 한국어로 이미 번역됨
  ko_japanese_leak: 0,        // ko.js에 일본어 잔존
  ko_english_leak: 0,         // ko.js에 영문 잔존
  ko_missing: 0,              // ko.js에 키 없음
  ko_same_as_csv: 0,          // ko.js 값이 CSV ja_value와 동일
};
const samples = { ko_translated: [], ko_japanese_leak: [], ko_english_leak: [], ko_missing: [], ko_same_as_csv: [] };

for (const r of newRows) {
  const actual = get(ko, r.path);
  if (actual === undefined) {
    stats.ko_missing++;
    if (samples.ko_missing.length < 3) samples.ko_missing.push(r.path);
    continue;
  }
  if (typeof actual !== 'string') continue;
  // CSV의 ja_value 와 ko.js 값이 동일하면 "미번역 일본어 그대로"
  if (actual === r.ja_value) {
    stats.ko_same_as_csv++;
    if (samples.ko_same_as_csv.length < 5) samples.ko_same_as_csv.push({ path: r.path, val: actual });
    continue;
  }
  // 한국어 포함?
  const hasHangul = /[가-힯]/.test(actual);
  const hasKana = /[぀-ゟ゠-ヿ]/.test(actual);
  const hasCJK = /[一-鿿]/.test(actual);
  const hasAscii = /[A-Za-z]/.test(actual);

  if (hasHangul) {
    stats.ko_translated++;
    if (samples.ko_translated.length < 3) samples.ko_translated.push({ path: r.path, val: actual });
  } else if (hasKana || (hasCJK && !hasHangul)) {
    stats.ko_japanese_leak++;
    if (samples.ko_japanese_leak.length < 10) samples.ko_japanese_leak.push({ path: r.path, val: actual });
  } else if (hasAscii) {
    stats.ko_english_leak++;
    if (samples.ko_english_leak.length < 5) samples.ko_english_leak.push({ path: r.path, val: actual });
  }
}

console.log('\n=== Classification ===');
for (const [k, v] of Object.entries(stats)) console.log('  ' + k + ': ' + v);

console.log('\n=== Samples: ko_japanese_leak (CRITICAL) ===');
for (const s of samples.ko_japanese_leak) console.log('  ' + s.path + ' = ' + JSON.stringify(s.val));

console.log('\n=== Samples: ko_english_leak ===');
for (const s of samples.ko_english_leak) console.log('  ' + s.path + ' = ' + JSON.stringify(s.val));

console.log('\n=== Samples: ko_translated ===');
for (const s of samples.ko_translated) console.log('  ' + s.path + ' = ' + JSON.stringify(s.val));

console.log('\n=== Samples: ko_missing ===');
for (const s of samples.ko_missing) console.log('  ' + s);

console.log('\n=== Samples: ko_same_as_csv (placeholder echo) ===');
for (const s of samples.ko_same_as_csv) console.log('  ' + s.path + ' = ' + JSON.stringify(s.val));

// 전체 leak path 저장 (작업용)
fs.writeFileSync('session150_s1_japanese_leaks.csv',
  'path,ko_value\n' + samples.ko_japanese_leak.map(s => s.path + ',' + JSON.stringify(s.val).replace(/,/g, '\\,')).join('\n'),
  'utf8');
console.log('\nOutput: session150_s1_japanese_leaks.csv (sample only, top 10)');
