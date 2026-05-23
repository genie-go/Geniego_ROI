// 150차 P0e: P0d가 놓친 손상 잔재 52건 삭제 (E3 분리분)
// scope: session150_e3_p0d_artifacts.csv 전체 (모두 pages.marketingIntel.* orphan 확정)
// 안전 가드: P0d와 동일 (G1~G7)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry';
const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const JA_PATH = 'frontend/src/i18n/locales/ja.js';
const ZH_PATH = 'frontend/src/i18n/locales/zh.js';
const BACKUP_DIR = 'backup_session150_P0e';
const SCOPE_CSV = 'session150_e3_p0d_artifacts.csv';

const SACRED = {
  ja: 'd107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437',
  zh: '9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4',
};
function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
if (sha256(JA_PATH) !== SACRED.ja) { console.error('ABORT: ja.js SHA pre'); process.exit(2); }
if (sha256(ZH_PATH) !== SACRED.zh) { console.error('ABORT: zh.js SHA pre'); process.exit(2); }

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

const csvRows = parseCSV(fs.readFileSync(SCOPE_CSV, 'utf8'));
const ix = Object.fromEntries(csvRows[0].map((h, i) => [h, i]));
const targetPaths = new Map();
for (let r = 1; r < csvRows.length; r++) {
  const row = csvRows[r];
  if (row.length < 2) continue;
  const p = row[ix.path];
  const v = row[ix.ko_value];
  if (!p || !/^pages\.marketingIntel\./.test(p)) continue;
  targetPaths.set(p, v);
}
console.log('Mode:', MODE);
console.log('Target paths (E3 P0d artifacts):', targetPaths.size);

const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_p0e_tmp.mjs');
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
function countLeaves(obj) {
  if (obj == null) return 0;
  if (typeof obj === 'string') return 1;
  if (typeof obj !== 'object') return 0;
  let n = 0;
  for (const k of Object.keys(obj)) n += countLeaves(obj[k]);
  return n;
}
const leavesPre = countLeaves(ko);
let mismatched = 0;
for (const [p, expected] of targetPaths) {
  if (get(ko, p) !== expected) {
    mismatched++;
    if (mismatched <= 3) console.log('  MISMATCH ' + p);
  }
}
if (mismatched > 0) { console.error('ABORT: ' + mismatched + ' paths stale'); process.exit(6); }
console.log('ko.js leaves pre:', leavesPre);
console.log('Targets verified ✓');

const lines = src.split('\n');
const KEY_PAT = '(?:"((?:[^"\\\\]|\\\\.)+)"|([_a-zA-Z$][\\w$]*))';
const leafRe = new RegExp('^\\s*' + KEY_PAT + '\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*,?\\s*$');
const openRe = new RegExp('^\\s*' + KEY_PAT + '\\s*:\\s*\\{\\s*$');
const closeRe = /^\s*\}\s*,?\s*;?\s*$/;

const keyStack = [];
const lineFullPath = new Array(lines.length).fill(null);
const lineValue = new Array(lines.length).fill(null);

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  const lm = line.match(leafRe);
  if (lm) {
    const k = lm[1] !== undefined ? lm[1] : lm[2];
    let v;
    try { v = JSON.parse('"' + lm[3] + '"'); } catch { continue; }
    lineFullPath[li] = [...keyStack, k].join('.');
    lineValue[li] = v;
    continue;
  }
  const om = line.match(openRe);
  if (om) {
    const k = om[1] !== undefined ? om[1] : om[2];
    keyStack.push(k);
    continue;
  }
  if (closeRe.test(line)) {
    if (keyStack.length > 0) keyStack.pop();
    continue;
  }
}

const pathToLineIdx = new Map();
for (let li = 0; li < lineFullPath.length; li++) {
  const fp = lineFullPath[li];
  if (fp && targetPaths.has(fp)) {
    if (pathToLineIdx.has(fp)) { console.error('ABORT: dup ' + fp); process.exit(7); }
    if (lineValue[li] !== targetPaths.get(fp)) { console.error('ABORT: value mismatch L' + (li+1)); process.exit(8); }
    pathToLineIdx.set(fp, li);
  }
}
let unmatched = 0;
for (const p of targetPaths.keys()) {
  if (!pathToLineIdx.has(p)) {
    unmatched++;
    if (unmatched <= 3) console.log('  UNMATCHED ' + p);
  }
}
if (unmatched > 0) { console.error('ABORT: ' + unmatched + ' unmatched'); process.exit(9); }
console.log('All ' + targetPaths.size + ' matched 1:1 ✓');

if (MODE === 'dry') {
  console.log('\n=== DRY. ' + pathToLineIdx.size + ' lines would be deleted. Run with --apply. ===');
  process.exit(0);
}

fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.copyFileSync(KO_PATH, path.join(BACKUP_DIR, 'ko.js.bak'));
console.log('Backup: ' + BACKUP_DIR + '/ko.js.bak');

const deleteSet = new Set(pathToLineIdx.values());
const out = [];
for (let li = 0; li < lines.length; li++) if (!deleteSet.has(li)) out.push(lines[li]);
const newSrc = out.join('\n');

const verifyPath = path.resolve('.session150_p0e_verify.mjs');
fs.writeFileSync(verifyPath, newSrc, 'utf8');
try {
  const vmod = await import('file://' + verifyPath.replace(/\\/g, '/'));
  const leavesPost = countLeaves(vmod.default);
  fs.unlinkSync(verifyPath);
  const diff = leavesPre - leavesPost;
  console.log('Lines deleted:', deleteSet.size, 'Leaf diff:', diff, '(expected ' + targetPaths.size + ')');
  if (diff !== targetPaths.size) { console.error('ABORT: leaf diff'); process.exit(10); }
} catch (e) {
  console.error('ABORT: syntax check:', e.message);
  try { fs.unlinkSync(verifyPath); } catch {}
  process.exit(11);
}

fs.writeFileSync(KO_PATH, newSrc, 'utf8');

if (sha256(JA_PATH) !== SACRED.ja || sha256(ZH_PATH) !== SACRED.zh) {
  console.error('ABORT: sacred changed');
  fs.copyFileSync(path.join(BACKUP_DIR, 'ko.js.bak'), KO_PATH);
  process.exit(12);
}

console.log('SUCCESS');
console.log('  ko.js size:', fs.statSync(KO_PATH).size, 'B');
console.log('  sacred SHA: unchanged ✓');
