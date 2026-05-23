// 150차 P2: batch raw_final.txt → ko.js 패치 자동 적용
// 입력: session150_e5_batch_NN_raw_final.txt
// G1~G7 + sacred SHA, path-aware (P1 framework 재사용)
// 사용법: node session150_p2_batch_apply.mjs <batch_file> [--apply]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const BATCH_FILE = args.find(a => !a.startsWith('--'));
const MODE = args.includes('--apply') ? 'apply' : 'dry';
if (!BATCH_FILE) { console.error('Usage: node session150_p2_batch_apply.mjs <batch_file> [--apply]'); process.exit(1); }

const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const JA_PATH = 'frontend/src/i18n/locales/ja.js';
const ZH_PATH = 'frontend/src/i18n/locales/zh.js';
const BACKUP_DIR = 'backup_session150_P2_' + path.basename(BATCH_FILE, '.txt');

const SACRED = {
  ja: 'd107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437',
  zh: '9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4',
};
function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
if (sha256(JA_PATH) !== SACRED.ja) { console.error('ABORT: ja.js SHA pre'); process.exit(2); }
if (sha256(ZH_PATH) !== SACRED.zh) { console.error('ABORT: zh.js SHA pre'); process.exit(2); }

// === Parse batch_NN_raw_final.txt ===
// 형식: # path: <p>\n# ko : <v>\n (빈 줄 구분)
const batchRaw = fs.readFileSync(BATCH_FILE, 'utf8');
const blocks = batchRaw.split(/\n\s*\n/).filter(b => b.trim());

const PATCHES = [];
for (const block of blocks) {
  const pMatch = block.match(/^\s*#\s*path:\s*(.+?)\s*$/m);
  const kMatch = block.match(/^\s*#\s*ko\s*:\s*(.*?)\s*$/m);
  if (!pMatch || !kMatch) continue;
  const pathStr = pMatch[1].trim();
  const koVal = kMatch[1];
  if (!koVal || !koVal.trim()) continue; // 빈 ko 는 skip
  PATCHES.push({ path: pathStr, korean: koVal });
}

console.log('Mode:', MODE);
console.log('Batch file:', BATCH_FILE);
console.log('Patches parsed:', PATCHES.length);

if (PATCHES.length === 0) { console.error('ABORT: no patches parsed'); process.exit(3); }

// === Load ko.js ===
const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_p2_tmp.mjs');
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
console.log('ko.js leaves pre:', leavesPre);

// === Verify all paths exist (현재 값을 expected 로) ===
for (const p of PATCHES) {
  const actual = get(ko, p.path);
  if (typeof actual !== 'string') {
    console.error('ABORT: path ' + p.path + ' is not a string (got ' + typeof actual + ')');
    process.exit(4);
  }
  p.expected = actual;
  // no-op check: 동일 값이면 skip 표시
  if (actual === p.korean) {
    p.skip = true;
  }
}
const actualPatches = PATCHES.filter(p => !p.skip);
const skipped = PATCHES.filter(p => p.skip);
console.log('All paths verified ✓');
console.log('Actual patches (value changes):', actualPatches.length);
console.log('Skipped (no-op, value already matches):', skipped.length);

// === Path-aware line scan ===
const lines = src.split('\n');
const KEY_PAT = '(?:"((?:[^"\\\\]|\\\\.)+)"|([_a-zA-Z$][\\w$]*))';
const leafRe = new RegExp('^(\\s*)' + KEY_PAT + '(\\s*:\\s*)"((?:[^"\\\\]|\\\\.)*)"(\\s*,?\\s*)$');
const openRe = new RegExp('^\\s*' + KEY_PAT + '\\s*:\\s*\\{\\s*$');
const closeRe = /^\s*\}\s*,?\s*;?\s*$/;

const keyStack = [];
const lineInfo = [];

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  const lm = line.match(leafRe);
  if (lm) {
    const k = lm[2] !== undefined ? lm[2] : lm[3];
    let v;
    try { v = JSON.parse('"' + lm[5] + '"'); } catch { lineInfo.push(null); continue; }
    const fp = [...keyStack, k].join('.');
    const keyStart = lm[1].length;
    const keyLen = (lm[2] !== undefined ? lm[2].length + 2 : lm[3].length);
    lineInfo.push({
      fp, value: v,
      indent: lm[1],
      keyRaw: line.slice(keyStart, keyStart + keyLen),
      mid: lm[4],
      suffix: lm[6],
    });
    continue;
  }
  const om = line.match(openRe);
  if (om) {
    const k = om[1] !== undefined ? om[1] : om[2];
    keyStack.push(k);
    lineInfo.push(null);
    continue;
  }
  if (closeRe.test(line)) {
    if (keyStack.length > 0) keyStack.pop();
    lineInfo.push(null);
    continue;
  }
  lineInfo.push(null);
}

// === Match each actualPatch to one source line ===
const patchLineMap = new Map();
for (let li = 0; li < lineInfo.length; li++) {
  const info = lineInfo[li];
  if (!info) continue;
  for (const p of actualPatches) {
    if (info.fp === p.path && info.value === p.expected) {
      if (patchLineMap.has(p.path)) {
        console.error('ABORT: duplicate line match for ' + p.path);
        process.exit(5);
      }
      patchLineMap.set(p.path, li);
    }
  }
}

let unmatched = 0;
for (const p of actualPatches) {
  if (!patchLineMap.has(p.path)) {
    unmatched++;
    if (unmatched <= 5) console.log('  UNMATCHED ' + p.path);
  }
}
if (unmatched > 0) { console.error('ABORT: ' + unmatched + ' unmatched'); process.exit(6); }
console.log('All ' + actualPatches.length + ' patches mapped 1:1 ✓');

// Sample
console.log('Sample mappings (first 5):');
let cnt = 0;
for (const p of actualPatches) {
  if (cnt++ >= 5) break;
  const li = patchLineMap.get(p.path);
  console.log('  L' + (li+1) + ' ' + p.path);
  console.log('    EN: ' + JSON.stringify(p.expected).slice(0, 80));
  console.log('    KO: ' + JSON.stringify(p.korean).slice(0, 80));
}
if (skipped.length > 0) {
  console.log('Skipped (no-op) sample:');
  for (const p of skipped.slice(0, 3)) console.log('  ' + p.path + ' = ' + JSON.stringify(p.korean).slice(0, 60));
}

if (MODE === 'dry') {
  console.log('\n=== DRY. ' + actualPatches.length + ' lines would be modified, ' + skipped.length + ' no-op skip. Run with --apply. ===');
  process.exit(0);
}

// === Backup ===
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.copyFileSync(KO_PATH, path.join(BACKUP_DIR, 'ko.js.bak'));
console.log('Backup: ' + BACKUP_DIR + '/ko.js.bak');

// === Apply ===
function jsonEscape(s) {
  return JSON.stringify(s).slice(1, -1);
}
const newLines = [...lines];
for (const p of actualPatches) {
  const li = patchLineMap.get(p.path);
  const info = lineInfo[li];
  newLines[li] = info.indent + info.keyRaw + info.mid + '"' + jsonEscape(p.korean) + '"' + info.suffix;
}
const newSrc = newLines.join('\n');

// === G7 syntax + leaf invariant ===
const verifyPath = path.resolve('.session150_p2_verify.mjs');
fs.writeFileSync(verifyPath, newSrc, 'utf8');
try {
  const vmod = await import('file://' + verifyPath.replace(/\\/g, '/'));
  const leavesPost = countLeaves(vmod.default);
  fs.unlinkSync(verifyPath);
  console.log('Leaves post:', leavesPost, '(expected ' + leavesPre + ', unchanged)');
  if (leavesPost !== leavesPre) { console.error('ABORT: leaf count changed'); process.exit(7); }
  for (const p of actualPatches) {
    if (get(vmod.default, p.path) !== p.korean) {
      console.error('ABORT: post-patch value mismatch for ' + p.path);
      process.exit(8);
    }
  }
  console.log('All patched values verified post ✓');
} catch (e) {
  console.error('ABORT: syntax check failed:', e.message);
  try { fs.unlinkSync(verifyPath); } catch {}
  process.exit(9);
}

// === Write ===
fs.writeFileSync(KO_PATH, newSrc, 'utf8');

// === Sacred post ===
if (sha256(JA_PATH) !== SACRED.ja || sha256(ZH_PATH) !== SACRED.zh) {
  console.error('ABORT: sacred SHA changed. Rollback.');
  fs.copyFileSync(path.join(BACKUP_DIR, 'ko.js.bak'), KO_PATH);
  process.exit(10);
}

console.log('SUCCESS');
console.log('  patches applied:', actualPatches.length);
console.log('  skipped (no-op):', skipped.length);
console.log('  ko.js size:', fs.statSync(KO_PATH).size, 'B');
console.log('  sacred SHA: unchanged ✓');
