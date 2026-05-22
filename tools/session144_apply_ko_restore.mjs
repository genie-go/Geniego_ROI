// ko.js 일본어 오염 10개 키 한국어 복원
// 사용법: node tools/session144_apply_ko_restore.mjs [--dry|--apply]

import fs from 'node:fs';
import path from 'node:path';

const MODE = process.argv.includes('--apply') ? 'apply' : 'dry';
const KO_PATH = 'frontend/src/i18n/locales/ko.js';
const I18N_DIR = 'frontend/src/i18n/locales';
const BACKUP_DIR = 'backup_session144_B1fix';

// 교체 매핑: [path, ja값(검증용), ko값(교체값)]
const RESTORE_MAP = [
  ['reportBuilder.pageSub',       'カスタムレポート生成 · Excel/PDFダウンロード', '커스텀 리포트 생성 · Excel/PDF 다운로드'],
  ['reportBuilder.tabCreate',     '📝 レポート作成',                              '📝 리포트 작성'],
  ['reportBuilder.reportType',    'レポート種別',                                  '리포트 종류'],
  ['reportBuilder.channels',      'チャネル',                                      '채널'],
  ['reportBuilder.generateReport','📊 レポート生成',                               '📊 리포트 생성'],
  ['reportBuilder.noReports',     '保存済みレポートなし',                          '저장된 리포트 없음'],
  ['reportBuilder.previewTitle',  'レポートプレビュー',                            '리포트 미리보기'],
  ['reportBuilder.type_channel',  'チャネル実績',                                  '채널 실적'],
  ['reportBuilder.type_influencer','インフルエンサー',                              '인플루언서'],
  ['userMgmt.role_ModeStr',       'デモ',                                          '데모'],
];

const utf8 = new TextEncoder();
const dec = new TextDecoder('utf-8');

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

function byteSize(p) {
  return fs.statSync(p).size;
}

// --- 사전 검증 ---
console.log(`MODE: ${MODE}\n`);

// ja/zh byte 사전 측정
const jaPath = path.join(I18N_DIR, 'ja.js');
const zhPath = path.join(I18N_DIR, 'zh.js');
const jaBefore = byteSize(jaPath);
const zhBefore = byteSize(zhPath);
console.log(`[사전] ja.js: ${jaBefore} bytes`);
console.log(`[사전] zh.js: ${zhBefore} bytes`);

// ko.js 읽기
let koRaw = readUtf8(KO_PATH);

// 백업 (--apply 시에만)
if (MODE === 'apply') {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const langs = fs.readdirSync(I18N_DIR).filter(f => f.endsWith('.js'));
  for (const f of langs) {
    fs.copyFileSync(path.join(I18N_DIR, f), path.join(BACKUP_DIR, f));
  }
  console.log(`\n[백업] ${BACKUP_DIR}/ 에 ${langs.length}개 파일 저장 완료`);
}

// key-value 패턴으로 정확히 1회 매칭 시도
// 패턴: ("'`)<key>("'`)\s*:\s*("'`)<ja_value>("'`)
function tryKeyValueReplace(raw, key, jaVal, koVal) {
  const keyEsc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const valEsc = jaVal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(["'\`])${keyEsc}\\1\\s*:\\s*(["'\`])${valEsc}\\2`, 'g');
  const matches = [...raw.matchAll(pattern)];
  if (matches.length !== 1) return { result: null, count: matches.length };
  const m = matches[0];
  const replaced = raw.slice(0, m.index) +
    m[0].replace(jaVal, koVal) +
    raw.slice(m.index + m[0].length);
  return { result: replaced, count: 1 };
}

// 각 키 처리
console.log('\n--- 키별 처리 ---');
let applied = 0;
let skipped = 0;
const results = [];

for (const [keyPath, jaVal, koVal] of RESTORE_MAP) {
  const leafKey = keyPath.split('.').pop();

  // 1차: key-value 패턴 우선 시도 (더 정밀)
  const { result: kvResult, count: kvCount } = tryKeyValueReplace(koRaw, leafKey, jaVal, koVal);

  if (kvResult !== null) {
    // key-value 패턴 1회 매칭 성공
    if (MODE === 'dry') {
      console.log(`[DRY]  ${keyPath}: key-value 패턴 1회 매칭 → "${jaVal}" → "${koVal}"`);
    } else {
      koRaw = kvResult;
      console.log(`[OK]   ${keyPath}: key-value 패턴 교체 완료 → "${koVal}"`);
    }
    applied++;
    results.push({ keyPath, status: MODE === 'dry' ? 'would_apply' : 'applied', method: 'key-value', jaVal, koVal });
    continue;
  }

  // key-value 패턴 다중 매칭 → value 단독 시도
  const occurrences = koRaw.split(jaVal).length - 1;

  if (kvCount === 0 && occurrences === 0) {
    console.log(`[SKIP] ${keyPath}: 예상 일본어값 미발견 (이미 복원됐거나 값이 다름)`);
    skipped++;
    results.push({ keyPath, status: 'skip_not_found', jaVal });
    continue;
  }

  if (occurrences === 1) {
    // value 단독 1회 → 교체
    if (MODE === 'dry') {
      console.log(`[DRY]  ${keyPath}: value 단독 1회 매칭 → "${jaVal}" → "${koVal}"`);
    } else {
      koRaw = koRaw.replace(jaVal, koVal);
      console.log(`[OK]   ${keyPath}: value 단독 교체 완료 → "${koVal}"`);
    }
    applied++;
    results.push({ keyPath, status: MODE === 'dry' ? 'would_apply' : 'applied', method: 'value-only', jaVal, koVal });
    continue;
  }

  // 모두 실패
  console.log(`[SKIP] ${keyPath}: key-value 패턴 ${kvCount}회, value 단독 ${occurrences}회 — 안전하지 않아 skip`);
  skipped++;
  results.push({ keyPath, status: 'skip_multi', kvCount, occurrences, jaVal });
}

// --apply 시 파일 저장
if (MODE === 'apply') {
  const buf = Buffer.from(koRaw, 'utf8');
  fs.writeFileSync(KO_PATH, buf);
  console.log(`\n[저장] ${KO_PATH} 쓰기 완료`);
}

// ja/zh byte 사후 확인
const jaAfter = byteSize(jaPath);
const zhAfter = byteSize(zhPath);
console.log(`\n--- byte 무변경 확인 ---`);
if (jaAfter !== jaBefore) {
  console.error(`FATAL: ja.js byte 변경! ${jaBefore} → ${jaAfter}`);
  process.exit(1);
}
if (zhAfter !== zhBefore) {
  console.error(`FATAL: zh.js byte 변경! ${zhBefore} → ${zhAfter}`);
  process.exit(1);
}
console.log(`ja.js: ${jaBefore} → ${jaAfter} bytes [OK]`);
console.log(`zh.js: ${zhBefore} → ${zhAfter} bytes [OK]`);

// 최종 요약
console.log(`\n--- 결과 요약 ---`);
console.log(`MODE    : ${MODE}`);
console.log(`교체 대상: ${applied}건`);
console.log(`SKIP    : ${skipped}건`);
if (MODE === 'dry') {
  console.log('\n※ --apply 플래그로 실행하면 실제 교체됩니다.');
}
