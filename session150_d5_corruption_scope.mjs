// 150차 D5: txt_* 손상 범위 + 자동 복구 가능성 진단
// path (정상 영문) vs ko_value (손상) 비교
import fs from 'node:fs';
import path from 'node:path';

const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const OUT = 'session150_d5_corruption_candidates.csv';

const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_d5_tmp.mjs');
fs.writeFileSync(tmpPath, src, 'utf8');
const mod = await import('file://' + tmpPath.replace(/\\/g, '/'));
fs.unlinkSync(tmpPath);
const ko = mod.default;

const rows = [];

function walk(obj, pathArr) {
  if (obj == null) return;
  if (typeof obj === 'string') {
    const p = pathArr.join('.');
    const v = obj;
    // 손상 휴리스틱:
    // (1) path의 마지막 세그먼트에 영문이 있음
    // (2) ko_value가 해당 영문 일부를 누락 (suffix만 남거나, leading char 삭제 흔적)
    // (3) "Txt_  " (double space) 또는 trailing _NN 패턴
    const lastSeg = pathArr[pathArr.length - 1] || '';
    const hasDoubleSpace = / {2,}/.test(v);
    const hasTrailingNum = /_\d+$/.test(v);
    const hasTxtPrefix = /^Txt_/.test(v);
    // path에서 영문 토큰 추출 후 ko_value에 fullword 존재 여부 확인
    const pathTokens = (lastSeg.match(/[A-Z][a-z]+|[A-Z]+(?=[A-Z]|$)|[a-z]+/g) || []).filter(t => t.length >= 3);
    let missingTokens = [];
    for (const pt of pathTokens) {
      // ko_value에 전체 토큰이 (대소문자 무관) 나타나는지
      if (!new RegExp(pt, 'i').test(v)) {
        // 그러나 토큰의 suffix (첫글자 제거)는 나타나는지 → 손상 신호
        const suffix = pt.slice(1);
        if (suffix.length >= 2 && new RegExp(suffix, 'i').test(v)) {
          missingTokens.push(pt + '→' + suffix);
        }
      }
    }
    const corruptionSignal = missingTokens.length > 0 || (hasTxtPrefix && hasDoubleSpace);
    if (corruptionSignal) {
      rows.push({
        path: p,
        ko_value: v,
        path_last_seg: lastSeg,
        missing_tokens: missingTokens.join('|'),
        has_double_space: hasDoubleSpace,
        has_trailing_num: hasTrailingNum,
      });
    }
    return;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) walk(obj[k], [...pathArr, k]);
  }
}
walk(ko, []);

const esc = (s) => {
  s = String(s);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};
const header = 'path,ko_value,path_last_seg,missing_tokens,has_double_space,has_trailing_num';
const out = [header, ...rows.map(r => [r.path, r.ko_value, r.path_last_seg, r.missing_tokens, r.has_double_space, r.has_trailing_num].map(esc).join(','))].join('\n');
fs.writeFileSync(OUT, out, 'utf8');

console.log('Corruption candidates total:', rows.length);
// 네임스페이스 분포
const nsCount = {};
for (const r of rows) {
  const ns = r.path.split('.').slice(0, 3).join('.');
  nsCount[ns] = (nsCount[ns] || 0) + 1;
}
console.log('Top namespaces:');
for (const [ns, n] of Object.entries(nsCount).sort((a,b)=>b[1]-a[1]).slice(0, 10)) {
  console.log('  ' + ns + ': ' + n);
}
console.log('Output: ' + OUT);
