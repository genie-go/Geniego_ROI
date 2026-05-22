// en_translation_workbook_final2.json → en.js 적용
// 사용법: node tools/session144_apply_en_workbook.mjs [--dry|--apply]

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const MODE       = process.argv.includes('--apply') ? 'apply' : 'dry';
const WORKBOOK   = 'en_translation_workbook_final2.json';
const EN_PATH    = 'frontend/src/i18n/locales/en.js';
const I18N_DIR   = 'frontend/src/i18n/locales';
const BACKUP_DIR = 'backup_session144_B3';

const POLLUTED = /[぀-ゟ゠-ヿ가-힯]/;

for (const f of [WORKBOOK, EN_PATH]) {
  if (!fs.existsSync(f)) { console.error(`ERROR: ${f} 없음`); process.exit(1); }
}

// --- helper: leaf path → value map ---
function leafMap(obj, prefix = '') {
  const out = new Map();
  for (const [k, v] of Object.entries(obj || {})) {
    const np = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const [p, val] of leafMap(v, np)) out.set(p, val);
    } else {
      out.set(np, v);
    }
  }
  return out;
}

// --- helper: find top-level ns block boundaries in raw text ---
function findNsBlock(raw, ns) {
  const pattern = new RegExp(`(?:^|\\n)(  )?"${ns}"\\s*:\\s*\\{`, 'g');
  let match;
  let best = null;
  while ((match = pattern.exec(raw)) !== null) {
    const indent = match[1] ? match[1].length : 0;
    if (best === null || indent < best.indent) {
      best = { index: match.index + match[0].indexOf('{'), indent };
    }
  }
  if (!best) return null;

  let depth = 0;
  let i = best.index;
  while (i < raw.length) {
    if (raw[i] === '{') depth++;
    else if (raw[i] === '}') {
      depth--;
      if (depth === 0) return { start: best.index, end: i };
    }
    i++;
  }
  return null;
}

// --- helper: escape value for JS string ---
function jsStr(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ja/zh byte 측정
function byteSize(p) { return fs.statSync(p).size; }

console.log(`MODE: ${MODE}\n`);

// ja/zh 사전 바이트
const jaPath = path.join(I18N_DIR, 'ja.js');
const zhPath = path.join(I18N_DIR, 'zh.js');
const jaBefore = byteSize(jaPath);
const zhBefore = byteSize(zhPath);
console.log(`[사전] ja.js: ${jaBefore} bytes`);
console.log(`[사전] zh.js: ${zhBefore} bytes`);

// en.js 로드
const enMod = await import(pathToFileURL(path.resolve(EN_PATH)).href);
const enObj = enMod.default || enMod;
const enLeaves = leafMap(enObj);
const enLeafCountBefore = enLeaves.size;
console.log(`[사전] en.js leaf: ${enLeafCountBefore}개\n`);

// 워크북 로드
const workbook = JSON.parse(fs.readFileSync(WORKBOOK, 'utf8'));

// 백업
if (MODE === 'apply') {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const langs = fs.readdirSync(I18N_DIR).filter(f => f.endsWith('.js'));
  for (const f of langs) fs.copyFileSync(path.join(I18N_DIR, f), path.join(BACKUP_DIR, f));
  console.log(`[백업] ${BACKUP_DIR}/ 에 ${langs.length}개 파일 저장\n`);
}

// en.js raw 읽기
let enRaw = fs.readFileSync(EN_PATH, 'utf8');

// 처리 분류
const toInsert = new Map(); // ns → [{key, value}]
const toReplace = [];       // {path, key, ns, oldVal, newVal}
let cntInsert = 0, cntReplace = 0, cntSkip = 0;

console.log('--- 키별 분류 ---');
for (const entry of workbook) {
  const { path: wPath, en_suggestion } = entry;
  const parts = wPath.split('.');
  const ns    = parts[0];
  const key   = parts.slice(1).join('.');

  const existing = enLeaves.get(wPath);

  if (existing !== undefined) {
    // (a) 이미 존재
    const existStr = String(existing);
    if (POLLUTED.test(existStr)) {
      console.log(`[REPLACE-POLLUTED] ${wPath}: "${existStr}" → "${en_suggestion}"`);
      toReplace.push({ path: wPath, key, ns, oldVal: existStr, newVal: en_suggestion });
      cntReplace++;
    } else if (existStr.trim() === '') {
      console.log(`[REPLACE-EMPTY] ${wPath}: "" → "${en_suggestion}"`);
      toReplace.push({ path: wPath, key, ns, oldVal: existStr, newVal: en_suggestion });
      cntReplace++;
    } else {
      console.log(`[SKIP]    ${wPath}: 이미 정상값 존재 ("${existStr.slice(0, 40)}")`);
      cntSkip++;
    }
  } else {
    // (b) 신규 삽입
    console.log(`[INSERT]  ${wPath}: "${en_suggestion}"`);
    if (!toInsert.has(ns)) toInsert.set(ns, []);
    toInsert.get(ns).push({ key, value: en_suggestion });
    cntInsert++;
  }
}

console.log(`\n분류 완료 — INSERT: ${cntInsert}, REPLACE: ${cntReplace}, SKIP: ${cntSkip}`);

if (MODE === 'dry') {
  console.log('\n※ --apply 로 실행하면 실제 적용됩니다.');
  process.exit(0);
}

// === APPLY ===

// (a) REPLACE
for (const { path: wPath, key, oldVal, newVal } of toReplace) {
  const leafKey = key.split('.').pop();
  const keyEsc  = leafKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let pattern;
  if (oldVal === '') {
    // 빈값 매칭: "key": "" 또는 'key': ''
    pattern = new RegExp(`(["'\`])${keyEsc}\\1\\s*:\\s*(["'\`])\\2`, 'g');
  } else {
    const valEsc = oldVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pattern = new RegExp(`(["'\`])${keyEsc}\\1\\s*:\\s*(["'\`])${valEsc}\\2`, 'g');
  }

  const matches = [...enRaw.matchAll(pattern)];
  if (matches.length !== 1) {
    console.warn(`[WARN] REPLACE skip (${matches.length}회 매칭): ${wPath}`);
    continue;
  }
  const m = matches[0];

  let replaced;
  if (oldVal === '') {
    // "role_": "" → "role_": "Demo"
    replaced = m[0].replace(/(:\s*["'`])(["'`])/, '$1' + newVal.replace(/"/g, '\\"') + '$2');
  } else {
    replaced = m[0].replace(oldVal, newVal);
  }
  enRaw = enRaw.slice(0, m.index) + replaced + enRaw.slice(m.index + m[0].length);
  console.log(`[OK-REPLACE] ${wPath}`);
}

// (b) INSERT: ns 블록에 삽입
for (const [ns, entries] of toInsert) {
  const block = findNsBlock(enRaw, ns);

  if (!block) {
    // ns 블록 없음 → export default 마지막 } 직전에 ns 블록 통째 생성
    console.log(`[NS-CREATE] "${ns}" 블록 신규 생성`);
    const nsBlock = `\n  "${ns}": {\n${entries.map(({ key, value }) => `    "${key}": "${jsStr(value)}"`).join(',\n')}\n  },`;
    const exportEnd = enRaw.lastIndexOf('\n}');
    if (exportEnd === -1) { console.error(`FATAL: export default 닫는 } 미발견`); process.exit(1); }
    enRaw = enRaw.slice(0, exportEnd) + nsBlock + enRaw.slice(exportEnd);
  } else {
    // ns 블록 있음 → 닫는 } 직전에 키들 삽입
    const closingIdx = block.end;
    const blockContent = enRaw.slice(block.start + 1, closingIdx).trimEnd();
    const needsLeadingComma = blockContent.length > 0 && !blockContent.endsWith(',');
    const newKeys = entries.map(({ key, value }) => `    "${key}": "${jsStr(value)}"`).join(',\n');
    const insertion = (needsLeadingComma ? ',\n' : '\n') + newKeys + '\n  ';
    enRaw = enRaw.slice(0, closingIdx) + insertion + enRaw.slice(closingIdx);
    console.log(`[OK-INSERT] "${ns}" 블록에 ${entries.length}키 삽입`);
  }
}

// 저장
const buf = Buffer.from(enRaw, 'utf8');
fs.writeFileSync(EN_PATH, buf);
console.log(`\n[저장] ${EN_PATH} 완료`);

// node --check
try {
  execSync(`node --check ${EN_PATH}`, { stdio: 'pipe' });
  console.log('[CHECK] SYNTAX OK');
} catch (e) {
  console.error(`FATAL: 문법 오류!\n${e.stderr?.toString()}`);
  process.exit(1);
}

// ja/zh byte 사후 확인
const jaAfter = byteSize(jaPath);
const zhAfter = byteSize(zhPath);
console.log('\n--- byte 무변경 확인 ---');
if (jaAfter !== jaBefore) { console.error(`FATAL: ja.js byte 변경! ${jaBefore}→${jaAfter}`); process.exit(1); }
if (zhAfter !== zhBefore) { console.error(`FATAL: zh.js byte 변경! ${zhBefore}→${zhAfter}`); process.exit(1); }
console.log(`ja.js: ${jaBefore}→${jaAfter} [OK]`);
console.log(`zh.js: ${zhBefore}→${zhAfter} [OK]`);

// leaf count 사후
const enMod2 = await import(pathToFileURL(path.resolve(EN_PATH)).href + '?v=' + Date.now());
const enObj2 = enMod2.default || enMod2;
const enLeafCountAfter = leafMap(enObj2).size;
console.log(`\n[leaf count] ${enLeafCountBefore} → ${enLeafCountAfter} (+${enLeafCountAfter - enLeafCountBefore}건)`);
console.log(`예상 증가: ~${cntInsert}건`);

console.log('\n--- 최종 요약 ---');
console.log(`INSERT : ${cntInsert}건`);
console.log(`REPLACE: ${cntReplace}건`);
console.log(`SKIP   : ${cntSkip}건`);
