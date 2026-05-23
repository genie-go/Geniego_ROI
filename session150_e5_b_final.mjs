// 150차 E5: 합성 토큰 (X/Y, X&Y) 분할 후 화이트리스트 체크
// E4 + token.split(/[/&]/) 적용
import fs from 'node:fs';
import path from 'node:path';

const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const E4_PATH = 'session150_e4_b_reclassify_v3.mjs';

// E4 도구의 WHITELIST + preprocess + isIntentionalPattern + tokenize 재사용
// 다만 residual.filter 안에 합성 분할 로직 추가
// 빠른 구현: E4 스크립트 import 대신 inline 복제 + 분할만 보강

const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_e5_tmp.mjs');
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

// E4 WHITELIST 직접 로드 (스크립트에서 동적 추출)
const e4Src = fs.readFileSync(E4_PATH, 'utf8');
const wlMatch = e4Src.match(/const WHITELIST = new Set\(\[([\s\S]*?)\]\);/);
if (!wlMatch) throw new Error('Failed to extract WHITELIST from E4');
const WHITELIST = new Set(eval('[' + wlMatch[1] + ']'));

function isP0dArtifact(s) {
  if (/^Txt_/.test(s)) return true;
  if (/\b[a-z]_\d+$/.test(s.trim())) return true;
  return false;
}

function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuote = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuote = false; i++; continue; }
      field += c; i++;
    } else {
      if (c === '"') { inQuote = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      field += c; i++;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function preprocess(s) {
  return s
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[\w.-]+\.(com|net|org|io|co|kr|jp)\b/gi, ' ')
    .replace(/['"][A-Z_]{3,}['"]/g, ' ')
    .replace(/\bYYYY[-\/]MM[-\/]DD\b/gi, ' ')
    .replace(/\bHH[:.]mm(:ss)?\b/gi, ' ')
    .replace(/\b(Ctrl|Cmd|Alt|Shift)\+[A-Z0-9]\b/g, ' ');
}

function isIntentionalPattern(s) {
  const parenContent = s.match(/\([^)]+\)/g);
  if (parenContent && parenContent.length > 0) {
    if (parenContent.every(p => {
      const inner = p.slice(1, -1);
      const tokens = inner.match(/[A-Za-z][A-Za-z0-9+'.&/_-]*/g) || [];
      return tokens.every(t => WHITELIST.has(t) || WHITELIST.has(t.toUpperCase()) || /^[A-Z][a-z]+$/.test(t));
    })) return true;
  }
  if (/^Phase\s+[A-Z]\s*[—-]/.test(s)) return true;
  if (/^[A-Za-z][\w]+\s*\/\s*[A-Za-z][\w]+$/.test(s.trim())) return true;
  return false;
}

function tokenize(s) {
  const cleaned = preprocess(s);
  const raw = cleaned.match(/[A-Za-z][A-Za-z0-9'.&+/_-]*[A-Za-z0-9]|[A-Za-z]/g) || [];
  return raw.map(t => t.replace(/[_-]+$/, '').replace(/^[_-]+/, '')).filter(Boolean);
}

// === E5 신규: 합성 토큰 분할 후 화이트리스트 체크 ===
function isWhitelistedDeep(token) {
  // 단일 매칭
  if (WHITELIST.has(token)) return true;
  if (WHITELIST.has(token.toUpperCase())) return true;
  if (WHITELIST.has(token.toLowerCase())) return true;
  // 합성 분할 (/ 또는 &)
  if (/[/&]/.test(token)) {
    const parts = token.split(/[/&]/).filter(Boolean);
    if (parts.length >= 2 && parts.every(p =>
      WHITELIST.has(p) || WHITELIST.has(p.toUpperCase()) || WHITELIST.has(p.toLowerCase())
    )) return true;
  }
  return false;
}

const d1Rows = parseCSV(fs.readFileSync('session150_d1_residual_scan.csv', 'utf8'));
const ix = Object.fromEntries(d1Rows[0].map((h, i) => [h, i]));

let stale = 0, p0d = 0, intentional = 0, wl = 0;
const realLeaks = [];

for (let r = 1; r < d1Rows.length; r++) {
  const row = d1Rows[r];
  if (row.length < 5) continue;
  if (row[ix.category] !== 'B_MIXED_LOW_RATIO') continue;
  const p = row[ix.path];
  const v = row[ix.ko_value];

  if (get(ko, p) !== v) { stale++; continue; }
  if (isP0dArtifact(v)) { p0d++; continue; }
  if (isIntentionalPattern(v)) { intentional++; continue; }

  const tokens = tokenize(v);
  const residual = tokens.filter(t => {
    if (isWhitelistedDeep(t)) return false;
    if (t.length === 1) return false;
    if (/^[A-Z][0-9]+$/.test(t)) return false;
    if (/^[0-9.]+$/.test(t)) return false;
    if (t.length <= 2 && !/^[A-Z]+$/.test(t)) return false;
    return true;
  });
  if (residual.length === 0) { wl++; continue; }

  realLeaks.push({ path: p, ko_value: v, residual_tokens: residual.join('|') });
}

console.log('WHITELIST size:', WHITELIST.size);
console.log('Stale:', stale);
console.log('P0d artifact:', p0d);
console.log('Intentional:', intentional);
console.log('Whitelist (incl. split compound):', wl);
console.log('Real leaks v5 FINAL:', realLeaks.length);

const esc = (s) => {
  s = String(s);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};
fs.writeFileSync('session150_e5_final_leaks.csv',
  ['path,ko_value,residual_tokens', ...realLeaks.map(r => [r.path, r.ko_value, r.residual_tokens].map(esc).join(','))].join('\n'),
  'utf8');

const freq = {};
for (const r of realLeaks) for (const t of r.residual_tokens.split('|')) freq[t] = (freq[t] || 0) + 1;
const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
console.log('Top 30 tokens FINAL:');
for (const [t,n] of sorted.slice(0,30)) console.log('  ' + t + ': ' + n);

// Batch 분할 (30건)
const BATCH_SIZE = 30;
for (let b = 0; b < Math.ceil(realLeaks.length / BATCH_SIZE); b++) {
  const slice = realLeaks.slice(b * BATCH_SIZE, (b+1) * BATCH_SIZE);
  const fn = `session150_e5_batch_${String(b+1).padStart(2,'0')}_raw.txt`;
  const out = slice.map(r => `# path: ${r.path}\n# residual: ${r.residual_tokens}\n# en : ${r.ko_value}\n# ko : \n`).join('\n');
  fs.writeFileSync(fn, out, 'utf8');
  console.log('Batch ' + (b+1) + ': ' + slice.length + ' → ' + fn);
}
console.log('Output: session150_e5_final_leaks.csv');
