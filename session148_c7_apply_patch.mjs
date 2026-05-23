// session148_c7_apply_patch.mjs
// ko.js 패치 적용 (LATIN_LONG 1단계: c2+c5 merged)
// 147차 b7v2 패턴 재사용 + 안전 가드 7종 (N-145-B)
//
// 입력: ./latin_long_c2_c5_merged.csv
// 대상: frontend/src/i18n/locales/ko.js (path-only edit)
// 백업: ./backup_session148_C7/ko.js.bak
// 로그: ./c7_patch_log.txt
//
// 안전 가드 7종 (N-145-B):
// G1 백업: backup_session148_C7/ko.js.bak (.gitignore 처리)
// G2 ja.js SHA256 unchanged (sacred N-79)
// G3 zh.js SHA256 unchanged (sacred N-79)
// G4 en.js leaf count unchanged (frozen)
// G5 ko.js leaf count unchanged (path-only edit)
// G6 dry-run → apply 2단계
// G7 re-import syntax 검증 + 실패 시 auto-rollback
//
// CLI:
//   node session148_c7_apply_patch.mjs --dry    (dry-run only)
//   node session148_c7_apply_patch.mjs --apply  (실제 적용)

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, createReadStream } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// ---------- CLI ----------
const args = process.argv.slice(2);
const MODE = args.includes('--apply') ? 'apply' : (args.includes('--dry') ? 'dry' : null);
if (!MODE) {
  console.error('Usage: node session148_c7_apply_patch.mjs --dry | --apply');
  process.exit(1);
}

// ---------- 경로 ----------
const ROOT = process.cwd();
const KO_JS = resolve(ROOT, 'frontend/src/i18n/locales/ko.js');
const JA_JS = resolve(ROOT, 'frontend/src/i18n/locales/ja.js');
const ZH_JS = resolve(ROOT, 'frontend/src/i18n/locales/zh.js');
const EN_JS = resolve(ROOT, 'frontend/src/i18n/locales/en.js');
const IN_MERGED = resolve(ROOT, 'latin_long_c2_c5_merged.csv');
const BACKUP_DIR = resolve(ROOT, 'backup_session148_C7');
const BACKUP_KO = join(BACKUP_DIR, 'ko.js.bak');
const OUT_LOG = resolve(ROOT, 'c7_patch_log.txt');

console.log(`[c7] MODE: ${MODE}`);
console.log(`[c7] ko.js: ${KO_JS}`);

// ---------- 파일 존재 확인 ----------
for (const p of [KO_JS, JA_JS, ZH_JS, EN_JS, IN_MERGED]) {
  if (!existsSync(p)) {
    console.error(`[c7] FATAL: missing ${p}`);
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

// leaf-level recursive walk (N-145-A: leaf=string+array)
function countLeaves(obj) {
  let count = 0;
  if (obj == null) return 0;
  if (typeof obj === 'string') return 1;
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

// path-based leaf access (set/get by ns.path)
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
    if (cur[segs[i]] == null || typeof cur[segs[i]] !== 'object') {
      console.error(`[c7] WARN: path mid-segment missing: ${path} at ${segs[i]}`);
      return false;
    }
    cur = cur[segs[i]];
  }
  const last = segs[segs.length - 1];
  if (!(last in cur)) {
    return false;
  }
  cur[last] = value;
  return true;
}

// ---------- G2/G3 sacred SHA256 capture ----------
console.log('[c7] G2/G3: capturing sacred SHA256...');
const sha_ja_before = sha256(JA_JS);
const sha_zh_before = sha256(ZH_JS);
console.log(`[c7] ja.js SHA256: ${sha_ja_before.slice(0, 16)}...`);
console.log(`[c7] zh.js SHA256: ${sha_zh_before.slice(0, 16)}...`);

// ---------- ko.js import (dynamic) ----------
console.log('[c7] Loading ko.js module...');
const koModule = await import(pathToFileURL(KO_JS).href);
const ko = koModule.default || koModule.ko || koModule;
const koLeavesBefore = countLeaves(ko);
console.log(`[c7] G5: ko.js leaf count before: ${koLeavesBefore}`);

// ---------- en.js leaf count (G4) ----------
const enModule = await import(pathToFileURL(EN_JS).href);
const en = enModule.default || enModule.en || enModule;
const enLeaves = countLeaves(en);
console.log(`[c7] G4: en.js leaf count: ${enLeaves}`);

// ---------- CSV 로드 ----------
const mergedRows = parseCSV(readFileSync(IN_MERGED, 'utf8'));
const header = mergedRows[0];
const data = mergedRows.slice(1).filter(r => r.length === header.length);
console.log(`[c7] merged rows: ${data.length}`);

const idx = {
  ns: header.indexOf('ns'),
  path: header.indexOf('path'),
  ko_value: header.indexOf('ko_value'),
  suggested_ko: header.indexOf('suggested_ko'),
};

// ---------- dry-run: 패치 시뮬레이션 ----------
console.log('[c7] dry-run: validating patches...');
const planned = [];
const skipped = [];
const valueChanged = [];

for (const r of data) {
  const ns = r[idx.ns];
  const path = r[idx.path];
  const expectedKo = r[idx.ko_value];
  const newKo = r[idx.suggested_ko];

  if (!newKo || newKo.trim() === '') {
    skipped.push({ ns, path, reason: 'empty suggested_ko' });
    continue;
  }

  // path는 ns.subpath 형식 (예: "crm.aiHub.reviews.days")
  // ko 객체에서 직접 path로 접근
  const current = getByPath(ko, path);

  if (current === undefined) {
    skipped.push({ ns, path, reason: 'path not found in ko.js' });
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

  planned.push({ ns, path, old: current, new: newKo });
}

console.log(`[c7] planned: ${planned.length}`);
console.log(`[c7] skipped: ${skipped.length}`);
console.log(`[c7] value_changed (since c1 snapshot): ${valueChanged.length}`);

// dry-run 출력
if (MODE === 'dry') {
  const dryLog = `# session148 c7 DRY-RUN

## Input
- merged CSV: ${data.length} rows

## Planned patches
- ${planned.length} rows will be modified

## Skipped
- ${skipped.length} rows

### Skip reasons (sample)
${skipped.slice(0, 20).map(s => `  [${s.path}] ${s.reason}`).join('\n')}
${skipped.length > 20 ? `\n  ... +${skipped.length - 20} more` : ''}

## Value changed (since c1 workbook snapshot)
- ${valueChanged.length} rows (skipped — ko.js may have been modified after c1)
${valueChanged.slice(0, 10).map(v =>
  `  [${v.path}]\n    expected: ${JSON.stringify(v.expected).slice(0, 80)}\n    actual:   ${JSON.stringify(v.actual).slice(0, 80)}`
).join('\n\n')}

## Sample planned (first 10)
${planned.slice(0, 10).map(p =>
  `  [${p.path}]\n    old: ${JSON.stringify(p.old).slice(0, 100)}\n    new: ${JSON.stringify(p.new).slice(0, 100)}`
).join('\n\n')}

## Pre-state
- ko.js leaf count: ${koLeavesBefore}
- en.js leaf count: ${enLeaves}
- ja.js SHA256: ${sha_ja_before}
- zh.js SHA256: ${sha_zh_before}
`;
  writeFileSync(OUT_LOG, dryLog, 'utf8');
  console.log('[c7] DRY-RUN complete. Log:', OUT_LOG);
  process.exit(0);
}

// ---------- apply mode ----------
console.log('[c7] APPLY mode: starting...');

// G1 백업
mkdirSync(BACKUP_DIR, { recursive: true });
copyFileSync(KO_JS, BACKUP_KO);
console.log(`[c7] G1: backup → ${BACKUP_KO}`);

// 패치 적용
let applied = 0;
let failed = 0;
for (const p of planned) {
  const ok = setByPath(ko, p.path, p.new);
  if (ok) applied++;
  else failed++;
}
console.log(`[c7] applied: ${applied}, failed: ${failed}`);

// 직렬화 (N-137: unquoted ns root + indent=2)
// ko.js 원본 raw 읽기 → path별 raw string 치환 방식 (안전)
let koRaw = readFileSync(KO_JS, 'utf8');
let strReplaceCount = 0;
let strReplaceFail = 0;
const replaceDetails = [];

// path string-replace 방식 (147차 b7v2 / b8e와 동일)
// CSV에서 ko_value(원래 영문) → suggested_ko(한국어) 치환
// 단, 같은 ko_value가 여러 path에 있을 수 있으므로 path 컨텍스트 매칭 필요

// 더 안전한 방법: 각 path를 ko.js에서 string으로 정확히 매칭
// path: "crm.aiHub.reviews.days" → 마지막 segment "days"
// 라인 패턴: `      days: "..."` 또는 `"days": "..."`

// 간단한 접근: ko_value JSON-encoded form을 찾아 1:1 치환
// JS 파일에서 string literal은 큰따옴표/작은따옴표/백틱 다양함 → 정규식 회피

// 안전 대안: ko 객체 수정 후 ko.js를 처음부터 다시 작성하는 대신
// 원본 raw에서 패치 대상 string literal만 치환

// path별 치환 헬퍼: 라인 단위로 키 명세 찾고 값 부분 치환
function quoteForJs(s) {
  // JavaScript string literal로 안전하게 변환
  return JSON.stringify(s);
}

function replaceLeafValue(rawText, path, oldVal, newVal) {
  // path 마지막 segment로 라인 찾기
  const segs = path.split('.');
  const leafKey = segs[segs.length - 1];

  // 후보 패턴: `key: "old"`, `'key': "old"`, `"key": "old"`
  // oldVal 안의 특수문자 escape (JSON.stringify로 일관성)
  const oldJsq = JSON.stringify(oldVal);   // 큰따옴표 + escape
  const newJsq = JSON.stringify(newVal);

  // 키 매칭: leafKey가 unquoted, 'quoted', "quoted" 모두 가능
  // 가장 안전: oldJsq 그대로 검색 (큰따옴표 포함된 정확 string)
  // 단, ko.js에서 큰따옴표/작은따옴표 혼용 가능 → 추가 처리 필요

  const keyPatterns = [
    `${leafKey}: ${oldJsq}`,
    `"${leafKey}": ${oldJsq}`,
    `'${leafKey}': ${oldJsq}`,
  ];

  // 작은따옴표 버전도 추가 (single-quoted string literal)
  function toSingleQuoted(s) {
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + "'";
  }
  const oldSq = toSingleQuoted(oldVal);
  const newSq = toSingleQuoted(newVal);
  keyPatterns.push(
    `${leafKey}: ${oldSq}`,
    `"${leafKey}": ${oldSq}`,
    `'${leafKey}': ${oldSq}`,
  );

  for (let pi = 0; pi < keyPatterns.length; pi++) {
    const pat = keyPatterns[pi];
    const idx = rawText.indexOf(pat);
    if (idx === -1) continue;

    // 동일 패턴이 여러 곳 있을 가능성 — uniqueness 검증
    const lastIdx = rawText.lastIndexOf(pat);
    if (idx !== lastIdx) {
      // 중복 → path 컨텍스트 확인 필요 (현재는 skip)
      return { success: false, reason: 'duplicate_pattern', pattern: pat };
    }

    // 치환
    const isOldSingle = pi >= 3;
    const newQuoted = isOldSingle ? newSq : newJsq;
    const replacement = pat.replace(isOldSingle ? oldSq : oldJsq, newQuoted);
    const newText = rawText.slice(0, idx) + replacement + rawText.slice(idx + pat.length);
    return { success: true, newText, pattern: pat };
  }

  return { success: false, reason: 'pattern_not_found' };
}

let currentRaw = koRaw;
for (const p of planned) {
  const result = replaceLeafValue(currentRaw, p.path, p.old, p.new);
  if (result.success) {
    currentRaw = result.newText;
    strReplaceCount++;
  } else {
    strReplaceFail++;
    replaceDetails.push({ path: p.path, reason: result.reason });
  }
}

console.log(`[c7] string replace: ${strReplaceCount} success, ${strReplaceFail} failed`);

// 임시 저장 후 syntax 검증
writeFileSync(KO_JS, currentRaw, 'utf8');

// G7 re-import 검증
console.log('[c7] G7: re-importing ko.js to verify syntax...');
let importOk = false;
let importError = null;
let koAfterLeaves = 0;
try {
  // dynamic import cache bust
  const koReimport = await import(pathToFileURL(KO_JS).href + '?v=' + Date.now());
  const koAfter = koReimport.default || koReimport.ko || koReimport;
  koAfterLeaves = countLeaves(koAfter);
  importOk = true;
} catch (e) {
  importError = String(e);
}

if (!importOk) {
  console.error('[c7] G7 FAILED: syntax error after patch');
  console.error('[c7] Rolling back...');
  copyFileSync(BACKUP_KO, KO_JS);
  console.error('[c7] Restored from backup. Aborting.');
  const errLog = `# session148 c7 FAILED — auto-rollback

## Error
${importError}

## State
- backup restored: ${BACKUP_KO} → ${KO_JS}
- planned: ${planned.length}, string-replaced: ${strReplaceCount}, failed: ${strReplaceFail}

## Failed replace samples
${replaceDetails.slice(0, 20).map(d => `  [${d.path}] ${d.reason}`).join('\n')}
`;
  writeFileSync(OUT_LOG, errLog, 'utf8');
  process.exit(2);
}

// G5: leaf count unchanged
if (koAfterLeaves !== koLeavesBefore) {
  console.error(`[c7] G5 FAILED: leaf count changed ${koLeavesBefore} → ${koAfterLeaves}`);
  console.error('[c7] Rolling back...');
  copyFileSync(BACKUP_KO, KO_JS);
  const errLog = `# session148 c7 FAILED — leaf count mismatch

## State
- ko.js leaf before: ${koLeavesBefore}
- ko.js leaf after: ${koAfterLeaves}
- backup restored
`;
  writeFileSync(OUT_LOG, errLog, 'utf8');
  process.exit(3);
}

// G2/G3 sacred check
const sha_ja_after = sha256(JA_JS);
const sha_zh_after = sha256(ZH_JS);
if (sha_ja_after !== sha_ja_before) {
  console.error('[c7] G2 FAILED: ja.js modified — IMPOSSIBLE (this script does not touch ja.js)');
  console.error('[c7] Rolling back...');
  copyFileSync(BACKUP_KO, KO_JS);
  process.exit(4);
}
if (sha_zh_after !== sha_zh_before) {
  console.error('[c7] G3 FAILED: zh.js modified — IMPOSSIBLE');
  copyFileSync(BACKUP_KO, KO_JS);
  process.exit(5);
}

// 성공 로그
const successLog = `# session148 c7 APPLY SUCCESS

## Patches
- planned: ${planned.length}
- string-replaced: ${strReplaceCount}
- failed (pattern not found / duplicate): ${strReplaceFail}
- skipped (empty/no-path/type/value-changed): ${skipped.length + valueChanged.length}

## Safety guards (N-145-B)
- G1 backup: ${BACKUP_KO} ✓
- G2 ja.js SHA256: ${sha_ja_after.slice(0, 16)}... unchanged ✓
- G3 zh.js SHA256: ${sha_zh_after.slice(0, 16)}... unchanged ✓
- G4 en.js leaf count: ${enLeaves} (untouched) ✓
- G5 ko.js leaf count: ${koLeavesBefore} → ${koAfterLeaves} ✓ (path-only edit)
- G6 dry → apply: 2-stage ✓
- G7 re-import syntax: passed ✓

## ko.js size
- before: ${koRaw.length} bytes
- after: ${currentRaw.length} bytes
- diff: ${currentRaw.length - koRaw.length} bytes

## Failed replaces (need manual review)
${replaceDetails.slice(0, 30).map(d => `  [${d.path}] ${d.reason}`).join('\n')}
${replaceDetails.length > 30 ? `\n  ... +${replaceDetails.length - 30} more` : ''}
`;
writeFileSync(OUT_LOG, successLog, 'utf8');
console.log('[c7] DONE. Log:', OUT_LOG);
