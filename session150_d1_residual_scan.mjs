// 150차 D1: ko.js 잔여 영문 leaf 진단
// 출력: session150_d1_residual_scan.csv (path, ko_value, length, latin_ratio, category)
import fs from 'node:fs';
import path from 'node:path';

const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const OUT_PATH = 'session150_d1_residual_scan.csv';

const src = fs.readFileSync(KO_PATH, 'utf8');

// ko.js 는 ESM default export. eval 우회용 동적 import
const tmpPath = path.resolve('.session150_d1_tmp.mjs');
fs.writeFileSync(tmpPath, src, 'utf8');
const mod = await import('file://' + tmpPath.replace(/\\/g, '/'));
fs.unlinkSync(tmpPath);
const ko = mod.default;

const rows = [];
function walk(obj, pathArr) {
  if (obj == null) return;
  if (typeof obj === 'string') {
    const v = obj;
    const len = v.length;
    // ASCII letter count (a-z A-Z)
    let latin = 0, total = 0;
    for (const ch of v) {
      const cc = ch.charCodeAt(0);
      if (cc > 32 && cc < 127) total++;
      if ((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122)) latin++;
    }
    const ratio = len > 0 ? latin / len : 0;
    // Has Hangul?
    const hasHangul = /[가-힯ᄀ-ᇿ㄰-㆏]/.test(v);
    // Classify
    let cat = null;
    const p = pathArr.join('.');
    const isAutoId = /\.(auto|operations)\./.test(p) || /\.[a-z0-9]{6}\./.test(p);
    if (isAutoId) cat = 'D_AUTO_ID';
    else if (len === 1 && /[A-Za-z0-9]/.test(v)) cat = 'A_LEN1_ASCII';
    else if (len >= 61 && latin >= 5 && !hasHangul) cat = 'C_LONG_LEAK';
    else if (len >= 2 && len <= 60 && ratio > 0 && ratio < 0.5 && latin >= 2 && hasHangul) cat = 'B_MIXED_LOW_RATIO';
    if (cat) {
      rows.push({ path: p, ko_value: v, length: len, latin_ratio: ratio.toFixed(3), category: cat });
    }
    return;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) walk(obj[k], [...pathArr, k]);
  }
}
walk(ko, []);

// CSV 직렬화 (RFC 4180)
const esc = (s) => {
  s = String(s);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};
const header = 'path,ko_value,length,latin_ratio,category';
const out = [header, ...rows.map(r => [r.path, r.ko_value, r.length, r.latin_ratio, r.category].map(esc).join(','))].join('\n');
fs.writeFileSync(OUT_PATH, out, 'utf8');

// 통계
const stats = {};
for (const r of rows) stats[r.category] = (stats[r.category] || 0) + 1;
console.log('Total residual leaves:', rows.length);
console.log('By category:');
for (const [k, v] of Object.entries(stats).sort()) console.log('  ' + k + ': ' + v);
console.log('Output: ' + OUT_PATH);
