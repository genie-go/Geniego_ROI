// 150차 P3: s140 신규 93건 중 일본어 leak 21건 한국어 패치
// P1 framework 재사용 (path-aware + G1~G7 + sacred SHA)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry';
const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const JA_PATH = 'frontend/src/i18n/locales/ja.js';
const ZH_PATH = 'frontend/src/i18n/locales/zh.js';
const BACKUP_DIR = 'backup_session150_P3';

const SACRED = {
  ja: 'd107ff396e118bfa99f5d24b415fda4fe54ae875bb5fa44ced86d667126a1437',
  zh: '9ea2361a3cb31fa544a7682803602b1ca13f2b5c108332fdb15c09068c55cdb4',
};
function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
if (sha256(JA_PATH) !== SACRED.ja) { console.error('ABORT: ja.js SHA pre'); process.exit(2); }
if (sha256(ZH_PATH) !== SACRED.zh) { console.error('ABORT: zh.js SHA pre'); process.exit(2); }

const PATCHES = [
  { path: 'gAttr.itemsCount',                          expected: '{n} 件',         korean: '{n}개' },
  { path: 'gAttr.tabAnomalyLabel',                     expected: '🚨 異常検知',    korean: '🚨 이상 감지' },
  { path: 'gAttr.tabLtvDesc',                          expected: '顧客獲得単価',   korean: '고객 획득 비용' },
  { path: 'gAttr.tabShapleyDesc',                      expected: '2^n 精密計算',   korean: '2ⁿ 기반 정밀 계산' },
  { path: 'journeyBuilder.completed',                  expected: '完了',           korean: '완료' },
  { path: 'journeyBuilder.create',                     expected: '作成',           korean: '생성' },
  { path: 'journeyBuilder.edit',                       expected: '✏️ 編集',        korean: '✏️ 편집' },
  { path: 'journeyBuilder.entered',                    expected: '進入',           korean: '유입' },
  { path: 'journeyBuilder.launch',                     expected: '▶ 実行',         korean: '▶ 실행' },
  { path: 'journeyBuilder.nodeTypes.condition',        expected: '🔀 条件分岐',    korean: '🔀 조건 분기' },
  { path: 'journeyBuilder.nodeTypes.delay',            expected: '⏱ 待機',         korean: '⏱ 대기' },
  { path: 'journeyBuilder.nodeTypes.end',              expected: '🏁 終了',        korean: '🏁 종료' },
  { path: 'journeyBuilder.triggerTypes.birthday',      expected: '🎂 誕生日',      korean: '🎂 생일' },
  { path: 'journeyBuilder.triggerTypes.manual',        expected: '▶ 手動実行',     korean: '▶ 수동 실행' },
  { path: 'journeyBuilder.triggerTypes.purchase',      expected: '✅ 購入完了',    korean: '✅ 구매 완료' },
  { path: 'journeyBuilder.triggerTypes.signup',        expected: '🌱 新規登録',    korean: '🌱 회원 가입' },
  { path: 'lineChannel.openRate',                      expected: '開封率',         korean: '오픈율' },
  { path: 'lineChannel.pending',                       expected: '審査中',         korean: '심사 중' },
  { path: 'lineChannel.sentCount',                     expected: '配信数',         korean: '발송 건수' },
  { path: 'lineChannel.statusActive',                  expected: '配信中',         korean: '발송 중' },
  { path: 'lineChannel.tabSettings',                   expected: '⚙️ 設定',        korean: '⚙️ 설정' },
];

console.log('Mode:', MODE);
console.log('Patches:', PATCHES.length);

const src = fs.readFileSync(KO_PATH, 'utf8');
const tmpPath = path.resolve('.session150_p3_tmp.mjs');
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

// Verify
for (const p of PATCHES) {
  const actual = get(ko, p.path);
  if (actual !== p.expected) {
    console.error('ABORT: path ' + p.path + ' value mismatch');
    console.error('  expected: ' + JSON.stringify(p.expected));
    console.error('  got     : ' + JSON.stringify(actual));
    process.exit(3);
  }
}
console.log('All ' + PATCHES.length + ' paths verified ✓');

// Path-aware scan (P1 parser 동일)
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

const patchLineMap = new Map();
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
    if (unmatched <= 5) console.log('  UNMATCHED ' + p.path);
  }
}
if (unmatched > 0) { console.error('ABORT: ' + unmatched + ' unmatched'); process.exit(5); }
console.log('All ' + PATCHES.length + ' mapped 1:1 ✓');

console.log('Sample (first 5):');
let cnt = 0;
for (const p of PATCHES) {
  if (cnt++ >= 5) break;
  const li = patchLineMap.get(p.path);
  console.log('  L' + (li+1) + ' ' + p.path);
  console.log('    JA: ' + JSON.stringify(p.expected));
  console.log('    KO: ' + JSON.stringify(p.korean));
}

if (MODE === 'dry') {
  console.log('\n=== DRY. ' + PATCHES.length + ' lines would be modified. Run with --apply. ===');
  process.exit(0);
}

fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.copyFileSync(KO_PATH, path.join(BACKUP_DIR, 'ko.js.bak'));
console.log('Backup: ' + BACKUP_DIR + '/ko.js.bak');

function jsonEscape(s) {
  return JSON.stringify(s).slice(1, -1);
}
const newLines = [...lines];
for (const p of PATCHES) {
  const li = patchLineMap.get(p.path);
  const info = lineInfo[li];
  newLines[li] = info.indent + info.keyRaw + info.mid + '"' + jsonEscape(p.korean) + '"' + info.suffix;
}
const newSrc = newLines.join('\n');

const verifyPath = path.resolve('.session150_p3_verify.mjs');
fs.writeFileSync(verifyPath, newSrc, 'utf8');
try {
  const vmod = await import('file://' + verifyPath.replace(/\\/g, '/'));
  const leavesPost = countLeaves(vmod.default);
  fs.unlinkSync(verifyPath);
  console.log('Leaves post:', leavesPost, '(expected ' + leavesPre + ')');
  if (leavesPost !== leavesPre) { console.error('ABORT: leaf count'); process.exit(6); }
  for (const p of PATCHES) {
    if (get(vmod.default, p.path) !== p.korean) {
      console.error('ABORT: post-patch mismatch for ' + p.path);
      process.exit(7);
    }
  }
  console.log('All patched values verified post ✓');
} catch (e) {
  console.error('ABORT: syntax check:', e.message);
  try { fs.unlinkSync(verifyPath); } catch {}
  process.exit(8);
}

fs.writeFileSync(KO_PATH, newSrc, 'utf8');

if (sha256(JA_PATH) !== SACRED.ja || sha256(ZH_PATH) !== SACRED.zh) {
  console.error('ABORT: sacred SHA changed. Rollback.');
  fs.copyFileSync(path.join(BACKUP_DIR, 'ko.js.bak'), KO_PATH);
  process.exit(9);
}

console.log('SUCCESS');
console.log('  patches applied:', PATCHES.length);
console.log('  ko.js size:', fs.statSync(KO_PATH).size, 'B');
console.log('  sacred SHA: unchanged ✓');
