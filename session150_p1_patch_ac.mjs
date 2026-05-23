// 150차 P1: A+C 3건 한국어 패치 (path-aware)
// G1 backup / G2 ja SHA / G3 zh SHA / G4 leaf count 불변 / G7 syntax check (auto-rollback)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry';
const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const JA_PATH = 'frontend/src/i18n/locales/ja.js';
const ZH_PATH = 'frontend/src/i18n/locales/zh.js';
const BACKUP_DIR = 'backup_session150_P1';

const SACRED = {
  ja: 'd107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437',
  zh: '9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4',
};
function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
if (sha256(JA_PATH) !== SACRED.ja) { console.error('ABORT: ja.js SHA pre'); process.exit(2); }
if (sha256(ZH_PATH) !== SACRED.zh) { console.error('ABORT: zh.js SHA pre'); process.exit(2); }

// === Patch table ===
const PATCHES = [
  { path: 'ruleEnginePage.dash.unitSecs', expected: 's', korean: '초' },
  { path: 'ruleEnginePage.marketing.upgradalDesc',
    expected: 'This is a powerful enterprise feature available in the paid plan.\nUpgrade to Pro now to experience all features without limits.',
    korean: '유료 플랜에서 제공되는 강력한 엔터프라이즈 기능입니다.\n지금 Pro로 업그레이드하여 모든 기능을 제한 없이 경험해 보세요.' },
  { path: 'marketing.g.upgradalDesc',
    expected: 'This is a powerful enterprise feature available in the paid plan.\nUpgrade to Pro now to experience all features without limits.',
    korean: '유료 플랜에서 제공되는 강력한 엔터프라이즈 기능입니다.\n지금 Pro로 업그레이드하여 모든 기능을 제한 없이 경험해 보세요.' },
];

console.log('Mode:', MODE);
console.log('Patches:', PATCHES.length);

// === Load + verify expected values ===
const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_p1_tmp.mjs');
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

for (const p of PATCHES) {
  const actual = get(ko, p.path);
  if (actual !== p.expected) {
    console.error('ABORT: path ' + p.path + ' value mismatch (expected ' + JSON.stringify(p.expected) + ', got ' + JSON.stringify(actual) + ')');
    process.exit(3);
  }
}
console.log('All ' + PATCHES.length + ' paths verified ✓');

// === Path-aware line scan (P0d parser 재사용) ===
const lines = src.split('\n');
const KEY_PAT = '(?:"((?:[^"\\\\]|\\\\.)+)"|([_a-zA-Z$][\\w$]*))';
const leafRe = new RegExp('^(\\s*)' + KEY_PAT + '(\\s*:\\s*)"((?:[^"\\\\]|\\\\.)*)"(\\s*,?\\s*)$');
const openRe = new RegExp('^\\s*' + KEY_PAT + '\\s*:\\s*\\{\\s*$');
const closeRe = /^\s*\}\s*,?\s*;?\s*$/;

const keyStack = [];
const lineInfo = []; // li → { fp, valueRaw, prefix, keyPart, midPart, suffixPart } or null

for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  const lm = line.match(leafRe);
  if (lm) {
    const k = lm[2] !== undefined ? lm[2] : lm[3];
    let v;
    try { v = JSON.parse('"' + lm[5] + '"'); } catch { lineInfo.push(null); continue; }
    const fp = [...keyStack, k].join('.');
    lineInfo.push({ fp, value: v, raw: lm[5], indent: lm[1], keyRaw: line.slice(lm[1].length, lm[1].length + (lm[2]!==undefined ? lm[2].length+2 : lm[3].length)), mid: lm[4], suffix: lm[6] });
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

// === Match each PATCH to one source line ===
const patchLineMap = new Map(); // path → lineIdx
for (let li = 0; li < lineInfo.length; li++) {
  const info = lineInfo[li];
  if (!info) continue;
  for (const p of PATCHES) {
    if (info.fp === p.path && info.value === p.expected) {
      if (patchLineMap.has(p.path)) {
        console.error('ABORT: duplicate match for ' + p.path);
        process.exit(4);
      }
      patchLineMap.set(p.path, li);
    }
  }
}

let unmatched = 0;
for (const p of PATCHES) {
  if (!patchLineMap.has(p.path)) {
    unmatched++;
    console.log('  UNMATCHED ' + p.path);
  }
}
if (unmatched > 0) { console.error('ABORT: ' + unmatched + ' unmatched'); process.exit(5); }
console.log('All patches mapped 1:1 to source lines ✓');
for (const [pth, li] of patchLineMap) console.log('  L' + (li+1) + ' ' + pth);

if (MODE === 'dry') {
  console.log('\n=== DRY. Run with --apply. ===');
  process.exit(0);
}

// === Backup ===
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.copyFileSync(KO_PATH, path.join(BACKUP_DIR, 'ko.js.bak'));
console.log('Backup: ' + BACKUP_DIR + '/ko.js.bak');

// === Apply: re-render each patched line ===
function jsonEscape(s) {
  return JSON.stringify(s).slice(1, -1); // strip outer quotes
}

const newLines = [...lines];
for (const p of PATCHES) {
  const li = patchLineMap.get(p.path);
  const info = lineInfo[li];
  // 원본 라인의 prefix/key/mid/suffix 보존하고 value만 교체
  const newLine = info.indent + info.keyRaw + info.mid + '"' + jsonEscape(p.korean) + '"' + info.suffix;
  newLines[li] = newLine;
}
const newSrc = newLines.join('\n');

// === G7 syntax + leaf count ===
const verifyPath = path.resolve('.session150_p1_verify.mjs');
fs.writeFileSync(verifyPath, newSrc, 'utf8');
try {
  const vmod = await import('file://' + verifyPath.replace(/\\/g, '/'));
  const leavesPost = countLeaves(vmod.default);
  fs.unlinkSync(verifyPath);
  console.log('Leaves post:', leavesPost, '(expected ' + leavesPre + ', unchanged)');
  if (leavesPost !== leavesPre) { console.error('ABORT: leaf count changed'); process.exit(6); }
  // 패치된 값 확인
  for (const p of PATCHES) {
    if (get(vmod.default, p.path) !== p.korean) {
      console.error('ABORT: post-patch value mismatch for ' + p.path);
      process.exit(7);
    }
  }
  console.log('All patched values verified post ✓');
} catch (e) {
  console.error('ABORT: syntax check failed:', e.message);
  try { fs.unlinkSync(verifyPath); } catch {}
  process.exit(8);
}

// === Write ===
fs.writeFileSync(KO_PATH, newSrc, 'utf8');

// === Sacred post ===
if (sha256(JA_PATH) !== SACRED.ja || sha256(ZH_PATH) !== SACRED.zh) {
  console.error('ABORT: sacred SHA changed. Rollback.');
  fs.copyFileSync(path.join(BACKUP_DIR, 'ko.js.bak'), KO_PATH);
  process.exit(9);
}

console.log('SUCCESS');
console.log('  ko.js size:', fs.statSync(KO_PATH).size, 'B');
console.log('  sacred SHA: unchanged ✓');
