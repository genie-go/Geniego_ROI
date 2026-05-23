// session148_c7b_apply_patch_pathaware.mjs
// path-aware ko.js patcher (LATIN_LONG 1단계: c2+c5 merged 2,200 rows)
// 147차 b8e 패턴 + path-aware (object 수정 후 ns 블록별 raw 재직렬화)
//
// 핵심 차이 (vs c7):
// - c7: literal string-replace → 중복 영문 값에서 duplicate_pattern 실패
// - c7b: ko 객체 직접 수정 → ns 블록 단위로 정밀 직렬화 → 모든 경로 대응
//
// 안전 가드 7종 (N-145-B) 유지:
// G1 백업: backup_session148_C7B/ko.js.bak
// G2 ja.js SHA256 unchanged (sacred N-79)
// G3 zh.js SHA256 unchanged (sacred N-79)
// G4 en.js leaf count unchanged
// G5 ko.js leaf count unchanged (path-only edit)
// G6 dry-run → apply 2단계
// G7 re-import syntax 검증 + 실패 시 auto-rollback
//
// CLI:
//   node session148_c7b_apply_patch_pathaware.mjs --dry
//   node session148_c7b_apply_patch_pathaware.mjs --apply

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const MODE = args.includes('--apply') ? 'apply' : (args.includes('--dry') ? 'dry' : null);
if (!MODE) {
  console.error('Usage: node session148_c7b_apply_patch_pathaware.mjs --dry | --apply');
  process.exit(1);
}

const ROOT = process.cwd();
const KO_JS = resolve(ROOT, 'frontend/src/i18n/locales/ko.js');
const JA_JS = resolve(ROOT, 'frontend/src/i18n/locales/ja.js');
const ZH_JS = resolve(ROOT, 'frontend/src/i18n/locales/zh.js');
const EN_JS = resolve(ROOT, 'frontend/src/i18n/locales/en.js');
const IN_MERGED = resolve(ROOT, 'latin_long_c2_c5_merged.csv');
const BACKUP_DIR = resolve(ROOT, 'backup_session148_C7B');
const BACKUP_KO = join(BACKUP_DIR, 'ko.js.bak');
const OUT_LOG = resolve(ROOT, 'c7b_patch_log.txt');

console.log(`[c7b] MODE: ${MODE}`);

for (const p of [KO_JS, JA_JS, ZH_JS, EN_JS, IN_MERGED]) {
  if (!existsSync(p)) {
    console.error(`[c7b] FATAL: missing ${p}`);
    process.exit(1);
  }
}

// ---------- helpers ----------
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQ = false; i++; }
      } else { field += c; i++; }
    } else {
      if (c === '"') { inQ = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\r') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
        if (text[i] === '\n') i++;
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
      } else { field += c; i++; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function countLeaves(obj) {
  if (obj == null) return 0;
  if (typeof obj === 'string') return 1;
  let count = 0;
  if (Array.isArray(obj)) {
    for (const el of obj) count += countLeaves(el);
    return count;
  }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) count += countLeaves(v);
    return count;
  }
  return 0;
}

function getByPath(root, path) {
  const segs = path.split('.');
  let cur = root;
  for (const s of segs) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[s];
  }
  return cur;
}

function setByPath(root, path, value) {
  const segs = path.split('.');
  let cur = root;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur[segs[i]] == null || typeof cur[segs[i]] !== 'object') return false;
    cur = cur[segs[i]];
  }
  const last = segs[segs.length - 1];
  if (!(last in cur)) return false;
  cur[last] = value;
  return true;
}

// ---------- N-137 직렬화: unquoted ns root + indent=2 ----------
// JS-safe key (식별자 패턴 OR 숫자만): unquoted
// 그 외: 큰따옴표
function isValidIdentifier(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);
}

function quoteKey(key) {
  if (isValidIdentifier(key)) return key;
  return JSON.stringify(key);
}

// value 직렬화: string/array/object
function serializeValue(val, indent, depth) {
  if (val == null) return 'null';
  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const inner = val.map(v => indent.repeat(depth + 1) + serializeValue(v, indent, depth + 1)).join(',\n');
    return `[\n${inner}\n${indent.repeat(depth)}]`;
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    const inner = keys.map(k => {
      return indent.repeat(depth + 1) + quoteKey(k) + ': ' + serializeValue(val[k], indent, depth + 1);
    }).join(',\n');
    return `{\n${inner}\n${indent.repeat(depth)}}`;
  }
  return JSON.stringify(val);
}

// 한 namespace (ns) 블록 직렬화: `<ns>: { ... }` (N-137)
function serializeNamespace(nsName, nsValue) {
  return `  ${quoteKey(nsName)}: ${serializeValue(nsValue, '  ', 1)}`;
}

// ---------- 캡처 baseline ----------
console.log('[c7b] G2/G3: capturing sacred SHA256...');
const sha_ja_before = sha256(JA_JS);
const sha_zh_before = sha256(ZH_JS);
console.log(`[c7b] ja.js SHA256: ${sha_ja_before.slice(0, 16)}...`);
console.log(`[c7b] zh.js SHA256: ${sha_zh_before.slice(0, 16)}...`);

// ---------- ko.js / en.js import ----------
console.log('[c7b] Loading ko.js...');
const koModule = await import(pathToFileURL(KO_JS).href);
const ko = koModule.default || koModule.ko || koModule;
const koLeavesBefore = countLeaves(ko);
console.log(`[c7b] G5: ko.js leaf count before: ${koLeavesBefore}`);

const enModule = await import(pathToFileURL(EN_JS).href);
const en = enModule.default || enModule.en || enModule;
const enLeaves = countLeaves(en);
console.log(`[c7b] G4: en.js leaf count: ${enLeaves}`);

// ---------- CSV 로드 ----------
const mergedRows = parseCSV(readFileSync(IN_MERGED, 'utf8'));
const header = mergedRows[0];
const data = mergedRows.slice(1).filter(r => r.length === header.length);
console.log(`[c7b] merged rows: ${data.length}`);

const idx = {
  ns: header.indexOf('ns'),
  path: header.indexOf('path'),
  ko_value: header.indexOf('ko_value'),
  suggested_ko: header.indexOf('suggested_ko'),
};

// ---------- dry-run: 패치 시뮬레이션 ----------
console.log('[c7b] dry-run: validating patches...');
const planned = [];
const skipped = [];
const valueChanged = [];
const noOps = [];
const touchedNs = new Set();

for (const r of data) {
  const ns = r[idx.ns];
  const path = r[idx.path];
  const expectedKo = r[idx.ko_value];
  const newKo = r[idx.suggested_ko];

  if (!newKo || newKo.trim() === '') {
    skipped.push({ ns, path, reason: 'empty suggested_ko' });
    continue;
  }

  const current = getByPath(ko, path);

  if (current === undefined) {
    skipped.push({ ns, path, reason: 'path not found' });
    continue;
  }
  if (typeof current !== 'string') {
    skipped.push({ ns, path, reason: `type mismatch (${typeof current})` });
    continue;
  }
  if (current !== expectedKo) {
    valueChanged.push({ ns, path, expected: expectedKo, actual: current });
    continue;
  }

  if (current === newKo) {
    // no-op (외래어 영문 유지)
    noOps.push({ ns, path, value: current });
    continue;
  }

  planned.push({ ns, path, old: current, new: newKo });
  touchedNs.add(ns);
}

console.log(`[c7b] planned (real changes): ${planned.length}`);
console.log(`[c7b] no-ops (외래어 유지): ${noOps.length}`);
console.log(`[c7b] skipped: ${skipped.length}`);
console.log(`[c7b] value_changed: ${valueChanged.length}`);
console.log(`[c7b] touched namespaces: ${touchedNs.size}`);

// ---------- DRY MODE ----------
if (MODE === 'dry') {
  const dryLog = `# session148 c7b DRY-RUN (path-aware)

## Input
- merged CSV: ${data.length} rows

## Classification
- Real changes (planned): ${planned.length}
- No-ops (외래어 영문 유지, same string): ${noOps.length}
- Skipped (empty/no-path/type/value-changed): ${skipped.length + valueChanged.length}

## Touched namespaces (${touchedNs.size})
${[...touchedNs].sort().slice(0, 30).join(', ')}${touchedNs.size > 30 ? ', ...' : ''}

## Pre-state baseline
- ko.js leaf count: ${koLeavesBefore}
- en.js leaf count: ${enLeaves}
- ja.js SHA256: ${sha_ja_before}
- zh.js SHA256: ${sha_zh_before}

## Sample planned (first 10 real changes)
${planned.slice(0, 10).map(p =>
  `  [${p.path}]\n    old: ${JSON.stringify(p.old).slice(0, 100)}\n    new: ${JSON.stringify(p.new).slice(0, 100)}`
).join('\n\n')}

## Sample no-ops (first 5)
${noOps.slice(0, 5).map(n => `  [${n.path}] ${JSON.stringify(n.value).slice(0, 80)}`).join('\n')}

## Skip reasons
${skipped.slice(0, 10).map(s => `  [${s.path}] ${s.reason}`).join('\n')}
`;
  writeFileSync(OUT_LOG, dryLog, 'utf8');
  console.log('[c7b] DRY-RUN complete. Log:', OUT_LOG);
  process.exit(0);
}

// ---------- APPLY MODE ----------
console.log('[c7b] APPLY mode: starting...');

// G1 backup
mkdirSync(BACKUP_DIR, { recursive: true });
copyFileSync(KO_JS, BACKUP_KO);
console.log(`[c7b] G1: backup → ${BACKUP_KO}`);

// 객체 수정 (in-memory)
let applied = 0;
let applyFailed = 0;
for (const p of planned) {
  const ok = setByPath(ko, p.path, p.new);
  if (ok) applied++;
  else applyFailed++;
}
console.log(`[c7b] object updates: ${applied} applied, ${applyFailed} failed`);

// ko.js raw 파일 로드 (ns 블록 재직렬화용)
const koRawOrig = readFileSync(KO_JS, 'utf8');

// ns 블록 경계 식별
// 패턴: `^  <nsKey>: {` ... `^  },?$` (top-level ns들은 indent=2)
// ko.js 구조: `export default { ns1: {...}, ns2: {...}, ... };` 또는 `const ko = {...}`
//
// 보수적 접근: ns 블록을 정확한 정규식으로 찾고, 해당 블록을 새 직렬화로 교체
// 단, ns 블록 내부의 중첩 {}는 brace counter로 추적

function findNsBlock(raw, nsName) {
  // 시작 위치 후보: `  ns: {`, `  "ns": {`, `  'ns': {`
  const variants = [
    `\n  ${nsName}: {`,
    `\n  "${nsName}": {`,
    `\n  '${nsName}': {`,
  ];
  for (const v of variants) {
    const start = raw.indexOf(v);
    if (start === -1) continue;
    // `{` 위치
    const braceStart = start + v.length - 1;
    // brace counter
    let depth = 1;
    let i = braceStart + 1;
    let inString = false;
    let stringChar = '';
    let escape = false;
    while (i < raw.length && depth > 0) {
      const c = raw[i];
      if (escape) { escape = false; i++; continue; }
      if (inString) {
        if (c === '\\') escape = true;
        else if (c === stringChar) inString = false;
        i++; continue;
      }
      if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; i++; continue; }
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    if (depth !== 0) return null;
    return {
      startLineStart: start + 1, // \n 다음 위치 (즉 indent 시작)
      braceStart,
      end: i, // `}` 다음 위치 (exclusive)
      keyVariant: v.trim(),
    };
  }
  return null;
}

// ns별로 블록 raw 교체
let currentRaw = koRawOrig;
let replaceOk = 0;
let replaceFail = 0;
const replaceLog = [];

// touchedNs를 raw 등장 위치 역순으로 정렬 (뒤에서 앞으로 치환 → 인덱스 안 깨짐)
const nsArray = [...touchedNs];
const nsWithPos = [];
for (const ns of nsArray) {
  const block = findNsBlock(currentRaw, ns);
  if (!block) {
    replaceFail++;
    replaceLog.push({ ns, reason: 'block not found' });
    continue;
  }
  nsWithPos.push({ ns, pos: block.startLineStart, block });
}
// 역순 정렬
nsWithPos.sort((a, b) => b.pos - a.pos);

for (const { ns, block } of nsWithPos) {
  // 새 직렬화 생성
  const newSer = serializeNamespace(ns, ko[ns]);
  // 기존 블록 교체
  const before = currentRaw.slice(0, block.startLineStart);
  const after = currentRaw.slice(block.end);
  currentRaw = before + newSer + after;
  replaceOk++;
}

console.log(`[c7b] ns block replacements: ${replaceOk} ok, ${replaceFail} failed`);

// 파일 저장 후 syntax 검증
writeFileSync(KO_JS, currentRaw, 'utf8');

// G7 re-import 검증
console.log('[c7b] G7: re-importing ko.js...');
let importOk = false;
let importError = null;
let koAfterLeaves = 0;
let koAfter = null;
try {
  const koReimport = await import(pathToFileURL(KO_JS).href + '?v=' + Date.now());
  koAfter = koReimport.default || koReimport.ko || koReimport;
  koAfterLeaves = countLeaves(koAfter);
  importOk = true;
} catch (e) {
  importError = String(e);
}

if (!importOk) {
  console.error('[c7b] G7 FAILED: syntax error');
  console.error(importError);
  copyFileSync(BACKUP_KO, KO_JS);
  const errLog = `# session148 c7b FAILED — auto-rollback

## Error
${importError}

## State
- backup restored: ${BACKUP_KO} → ${KO_JS}
- object updates: ${applied}/${planned.length}
- ns block replacements: ${replaceOk}/${nsWithPos.length}

## Failed ns blocks
${replaceLog.map(r => `  [${r.ns}] ${r.reason}`).join('\n')}
`;
  writeFileSync(OUT_LOG, errLog, 'utf8');
  process.exit(2);
}

// G5: leaf count unchanged
if (koAfterLeaves !== koLeavesBefore) {
  console.error(`[c7b] G5 FAILED: leaf count ${koLeavesBefore} → ${koAfterLeaves}`);
  copyFileSync(BACKUP_KO, KO_JS);
  writeFileSync(OUT_LOG, `# c7b FAILED: leaf count mismatch ${koLeavesBefore} → ${koAfterLeaves}\nbackup restored\n`, 'utf8');
  process.exit(3);
}

// G2/G3
const sha_ja_after = sha256(JA_JS);
const sha_zh_after = sha256(ZH_JS);
if (sha_ja_after !== sha_ja_before || sha_zh_after !== sha_zh_before) {
  console.error('[c7b] G2/G3 FAILED: sacred file modified');
  copyFileSync(BACKUP_KO, KO_JS);
  process.exit(4);
}

// 적용 검증: planned 중 실제 새 값이 ko 객체에 반영됐는지
let verifyApplied = 0;
let verifyFail = 0;
for (const p of planned) {
  const v = getByPath(koAfter, p.path);
  if (v === p.new) verifyApplied++;
  else verifyFail++;
}

const successLog = `# session148 c7b APPLY SUCCESS (path-aware)

## Patches
- planned (real changes): ${planned.length}
- object updates: ${applied}
- verify (re-imported ko.js has new values): ${verifyApplied} / ${planned.length}
- verify fail: ${verifyFail}
- no-ops (외래어 유지): ${noOps.length}
- skipped: ${skipped.length + valueChanged.length}

## NS block replacements
- ${replaceOk} / ${nsWithPos.length} namespaces re-serialized

## Safety guards (N-145-B)
- G1 backup: ${BACKUP_KO} ✓
- G2 ja.js SHA256: unchanged ✓
- G3 zh.js SHA256: unchanged ✓
- G4 en.js leaf count: ${enLeaves} (untouched) ✓
- G5 ko.js leaf count: ${koLeavesBefore} → ${koAfterLeaves} ✓
- G6 dry → apply: 2-stage ✓
- G7 re-import syntax: passed ✓

## ko.js file size
- before: ${koRawOrig.length} bytes
- after: ${currentRaw.length} bytes
- diff: ${currentRaw.length - koRawOrig.length} bytes

## Touched namespaces (${touchedNs.size})
${[...touchedNs].sort().join(', ')}

## Failed ns replacements (if any)
${replaceLog.map(r => `  [${r.ns}] ${r.reason}`).join('\n') || '(none)'}
`;
writeFileSync(OUT_LOG, successLog, 'utf8');
console.log('[c7b] DONE. Log:', OUT_LOG);
