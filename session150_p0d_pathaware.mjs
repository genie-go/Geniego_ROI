// 150차 P0d: brace-depth 기반 path-aware 삭제
// 각 line에 full path 추적 → D5 target path와 정확 매칭 → 삭제
// 안전 가드: G1 backup / G2 ja SHA / G3 zh SHA / G4 leaf count diff / G7 syntax check
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry';
const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const JA_PATH = 'frontend/src/i18n/locales/ja.js';
const ZH_PATH = 'frontend/src/i18n/locales/zh.js';
const BACKUP_DIR = 'backup_session150_P0d';
const SCOPE_CSV = 'session150_d5_corruption_candidates.csv';

const SACRED = {
  ja: 'd107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437',
  zh: '9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4',
};
function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
if (sha256(JA_PATH) !== SACRED.ja) { console.error('ABORT: ja.js SHA pre'); process.exit(2); }
if (sha256(ZH_PATH) !== SACRED.zh) { console.error('ABORT: zh.js SHA pre'); process.exit(2); }

// === Parse D5 CSV → target paths set ===
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
const targetPaths = new Map(); // path → expectedValue
for (let r = 1; r < csvRows.length; r++) {
  const row = csvRows[r];
  if (row.length < 2) continue;
  const p = row[ix.path];
  const v = row[ix.ko_value];
  if (!p || !/^pages\.marketingIntel\./.test(p)) continue;
  const mt = row[ix.missing_tokens] || '';
  const ds = row[ix.has_double_space] || '';
  if (!mt && ds !== 'true' && ds !== 'True') continue;
  targetPaths.set(p, v);
}
console.log('Mode:', MODE);
console.log('D5 target paths:', targetPaths.size);

// === Load ko.js + verify D5 paths exist with expected values ===
const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_p0d_tmp.mjs');
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
if (mismatched > 0) { console.error('ABORT: ' + mismatched + ' D5 paths stale'); process.exit(6); }
console.log('ko.js leaves pre:', leavesPre);
console.log('D5 paths verified ✓');

// === Brace-depth parser: each line → full path ===
// ko.js 구조: export default { "ns": { "key": "val", ... }, ... };
// Stateful scan: 현재 keyStack[depth] 추적. 각 line의 leaf entry는 keyStack.join('.') + lineKey.
const lines = src.split('\n');
const lineFullPath = new Array(lines.length).fill(null); // line index → full path (or null if not a leaf)
const lineKeyValue = new Array(lines.length).fill(null); // line index → { key, value }

const keyStack = []; // 현재 nesting 경로
let pendingKey = null; // "{" 가 다음 라인에 열릴 경우

// Key 패턴: "quoted" 또는 unquoted ASCII identifier (Korean key는 항상 quoted)
const KEY_PAT = '(?:"((?:[^"\\\\]|\\\\.)+)"|([_a-zA-Z$][\\w$]*))';

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  // 단일 라인 leaf: key: "value",
  const leafRe = new RegExp('^\\s*' + KEY_PAT + '\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"\\s*,?\\s*$');
  const leafM = line.match(leafRe);
  if (leafM) {
    const k = leafM[1] !== undefined ? leafM[1] : leafM[2];
    let v;
    try { v = JSON.parse('"' + leafM[3] + '"'); } catch { continue; }
    const fp = [...keyStack, k].join('.');
    lineFullPath[li] = fp;
    lineKeyValue[li] = { key: k, value: v };
    continue;
  }
  // 객체 열림: key: {
  const openRe = new RegExp('^\\s*' + KEY_PAT + '\\s*:\\s*\\{\\s*$');
  const openM = line.match(openRe);
  if (openM) {
    const k = openM[1] !== undefined ? openM[1] : openM[2];
    keyStack.push(k);
    continue;
  }
  // 객체 닫힘: }, or } or },
  const closeM = line.match(/^\s*\}\s*,?\s*;?\s*$/);
  if (closeM) {
    if (keyStack.length > 0) keyStack.pop();
    continue;
  }
  // 그 외 (open export default, blank, 주석): skip
}

// === Match D5 target paths to line indices ===
const pathToLineIdx = new Map();
for (let li = 0; li < lineFullPath.length; li++) {
  const fp = lineFullPath[li];
  if (fp && targetPaths.has(fp)) {
    if (pathToLineIdx.has(fp)) {
      console.error('ABORT: path ' + fp + ' matched multiple lines (' + pathToLineIdx.get(fp) + ',' + li + ')');
      process.exit(7);
    }
    // value도 확인
    const expected = targetPaths.get(fp);
    if (lineKeyValue[li].value !== expected) {
      console.error('ABORT: line ' + li + ' value mismatch for ' + fp);
      process.exit(8);
    }
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
if (unmatched > 0) { console.error('ABORT: ' + unmatched + ' targets unmatched in source lines'); process.exit(9); }
console.log('All ' + targetPaths.size + ' targets matched 1:1 to source lines ✓');

// 샘플
console.log('Sample line mappings (first 5):');
let cnt = 0;
for (const [p, li] of pathToLineIdx) {
  if (cnt++ >= 5) break;
  console.log('  L' + (li+1) + ' ' + p + ' = ' + JSON.stringify(lineKeyValue[li].value).slice(0, 50));
}

if (MODE === 'dry') {
  console.log('\n=== DRY RUN. ' + pathToLineIdx.size + ' lines would be deleted. Run with --apply. ===');
  process.exit(0);
}

// === G1: backup ===
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.copyFileSync(KO_PATH, path.join(BACKUP_DIR, 'ko.js.bak'));
console.log('Backup: ' + BACKUP_DIR + '/ko.js.bak');

// === Delete lines ===
const deleteSet = new Set(pathToLineIdx.values());
const out = [];
for (let li = 0; li < lines.length; li++) {
  if (!deleteSet.has(li)) out.push(lines[li]);
}
const newSrc = out.join('\n');

// === G7: syntax + leaf count ===
const verifyPath = path.resolve('.session150_p0d_verify.mjs');
fs.writeFileSync(verifyPath, newSrc, 'utf8');
try {
  const vmod = await import('file://' + verifyPath.replace(/\\/g, '/'));
  const leavesPost = countLeaves(vmod.default);
  fs.unlinkSync(verifyPath);
  const diff = leavesPre - leavesPost;
  console.log('Lines deleted:', deleteSet.size);
  console.log('Leaves post:', leavesPost);
  console.log('Leaf diff:', diff, '(expected ' + targetPaths.size + ')');
  if (diff !== targetPaths.size) { console.error('ABORT: leaf diff mismatch'); process.exit(10); }
} catch (e) {
  console.error('ABORT: syntax check failed:', e.message);
  try { fs.unlinkSync(verifyPath); } catch {}
  process.exit(11);
}

// === Write ===
fs.writeFileSync(KO_PATH, newSrc, 'utf8');

// === Sacred post ===
if (sha256(JA_PATH) !== SACRED.ja || sha256(ZH_PATH) !== SACRED.zh) {
  console.error('ABORT: sacred SHA changed. Rollback.');
  fs.copyFileSync(path.join(BACKUP_DIR, 'ko.js.bak'), KO_PATH);
  process.exit(12);
}

console.log('SUCCESS');
console.log('  ko.js size:', fs.statSync(KO_PATH).size, 'B');
console.log('  sacred SHA: unchanged ✓');
