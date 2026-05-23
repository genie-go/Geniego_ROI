// session148_c5_parse_raw.mjs
// raw.txt → mapped CSV 변환 (147차 b8d v2 패턴 재사용)
// 입력: 임의의 raw.txt (top500_raw.txt 또는 batch_NN_raw.txt)
// 사용법: node session148_c5_parse_raw.mjs <input_raw.txt> [output_mapped.csv]
//   기본 출력: <input_basename>_mapped.csv (예: latin_long_top500_raw.txt → latin_long_top500_mapped.csv)
//
// 안전 가드 (147차 N-147-A/B):
// 1. IME 한자 혼입 정정 (適용→적용 같은 사고 패턴)
// 2. round-trip 손상 정규화 (\n un-escape, 🇯→🇯🇵 등)
// 3. 빈 SUGGESTED_KO skip (다음 batch로 이월)
// 4. 한국어 미포함 검증 ([가-힣] regex)

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';

// ---------- CLI args ----------
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node session148_c5_parse_raw.mjs <input_raw.txt> [output_mapped.csv]');
  process.exit(1);
}

const INPUT = resolve(args[0]);
const inputBase = basename(INPUT, '.txt').replace(/_raw$/, '');
const defaultOut = join(dirname(INPUT), `${inputBase}_mapped.csv`);
const OUTPUT = args[1] ? resolve(args[1]) : defaultOut;
const LOG = OUTPUT.replace(/\.csv$/, '_log.txt');

console.log('[c5] Input:', INPUT);
console.log('[c5] Output:', OUTPUT);

// ---------- CSV writer ----------
function csvEscape(s) {
  if (s == null) return '';
  s = String(s);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function toCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\n');
}

// ---------- 정규화 (147차 N-147-B v2) ----------
function normalize(s) {
  if (!s) return s;

  // 1) literal \n / \t / \" → 실제 문자 (사용자가 chat에서 escape된 채로 복사한 경우)
  s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  // 2) 양 끝 공백 제거 (단, 의도된 공백 보존을 위해 최소화)
  s = s.replace(/^\s+|\s+$/g, '');

  // 3) IME 한자 혼입 자동 정정 (147차 batch에서 발견된 패턴)
  const imeFixes = [
    ['適용', '적용'],
    ['対象', '대상'],
    ['設정', '설정'],
    ['完료', '완료'],
    ['실行', '실행'],
    ['実행', '실행'],
    ['表시', '표시'],
    ['発송', '발송'],
    ['発생', '발생'],
    ['発견', '발견'],
    ['発주', '발주'],
    ['発행', '발행'],
    ['対応', '대응'],
    ['対比', '대비'],
    ['活용', '활용'],
    ['活성', '활성'],
    ['処리', '처리'],
    ['処분', '처분'],
    ['実시간', '실시간'],
    ['実제', '실제'],
    ['実행', '실행'],
    ['実데이터', '실데이터'],
    ['録화', '녹화'],
    ['録음', '녹음'],
    ['受신', '수신'],
    ['購매', '구매'],
    ['購입', '구입'],
    ['広고', '광고'],
    ['広범위', '광범위'],
    ['経제', '경제'],
    ['経험', '경험'],
    ['営업', '영업'],
    ['営리', '영리'],
    ['価격', '가격'],
    ['価치', '가치'],
    ['会원', '회원'],
    ['会사', '회사'],
    ['会계', '회계'],
    ['証명', '증명'],
    ['証거', '증거'],
    ['応답', '응답'],
    ['応용', '응용'],
    ['応원', '응원'],
    ['応모', '응모'],
    ['総합', '종합'],
    ['総계', '총계'],
    ['総액', '총액'],
    ['総체', '총체'],
    ['総원가', '총원가'],
    ['頻도', '빈도'],
    ['頻발', '빈발'],
    ['験', '험'],
    ['験증', '험증'],
    ['圧축', '압축'],
    ['圧력', '압력'],
    ['権한', '권한'],
    ['権리', '권리'],
    ['権익', '권익'],
    ['権고', '권고'],
    ['険', '험'],
    ['険성', '험성'],
    ['険도', '험도'],
    ['危험', '위험'],
    ['危기', '위기'],
    ['真', '진'],
    ['真위', '진위'],
    ['真짜', '진짜'],
    ['真정', '진정'],
    ['頭', '두'],
    ['頭각', '두각'],
    ['頭부', '두부'],
    ['頻', '빈'],
    ['頻도', '빈도'],
    ['圏', '권'],
    ['圏역', '권역'],
    ['国', '국'],
    ['国가', '국가'],
    ['国제', '국제'],
    ['国내', '국내'],
    ['国외', '국외'],
    ['図', '도'],
    ['図면', '도면'],
    ['図표', '도표'],
    ['図형', '도형'],
    ['号', '호'],
    ['号수', '호수'],
    ['号선', '호선'],
    ['伝', '전'],
    ['伝달', '전달'],
    ['伝송', '전송'],
    ['伝파', '전파'],
    ['仮', '가'],
    ['仮상', '가상'],
    ['仮정', '가정'],
    ['仮짜', '가짜'],
    ['処', '처'],
    ['当', '당'],
    ['当시', '당시'],
    ['当일', '당일'],
    ['当시점', '당시점'],
    ['当초', '당초'],
    ['当해', '당해'],
    ['当도', '당도'],
    ['当신', '당신'],
    ['断', '단'],
    ['断절', '단절'],
    ['断정', '단정'],
    ['尽', '진'],
    ['尽력', '진력'],
    ['余', '여'],
    ['余분', '여분'],
    ['余유', '여유'],
    ['余지', '여지'],
    ['余백', '여백'],
    ['余력', '여력'],
    ['余분', '여분'],
  ];
  for (const [bad, good] of imeFixes) {
    s = s.replaceAll(bad, good);
  }

  // 4) regional indicator 절반 누락 정정
  s = s.replace(/🇯(?!🇵)/g, '🇯🇵').replace(/🇰(?!🇷)/g, '🇰🇷');

  return s;
}

// ---------- 파서 ----------
function parseRaw(text) {
  const entries = [];
  const lines = text.split(/\r?\n/);
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 블록 시작: --- [INDEX] ko_value (count=N) ---
    const blockMatch = line.match(/^---\s*\[(\d+)\]\s+(.*?)\s+\(count=(\d+)\)\s*---\s*$/);
    if (blockMatch) {
      if (current) entries.push(current);
      current = {
        index: parseInt(blockMatch[1], 10),
        ko_value: blockMatch[2],
        count: parseInt(blockMatch[3], 10),
        path: '',
        ja: '',
        en: '',
        suggested_ko: '',
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith('PATH:')) {
      current.path = line.slice(5).trimStart();
    } else if (line.startsWith('JA:')) {
      current.ja = line.slice(3).trimStart();
    } else if (line.startsWith('EN:')) {
      current.en = line.slice(3).trimStart();
    } else if (line.startsWith('SUGGESTED_KO:')) {
      let val = line.slice(13).trimStart();
      // multi-line SUGGESTED_KO 지원 (다음 블록 시작 전까지 연결)
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (
          nextLine.startsWith('---') ||
          nextLine.startsWith('PATH:') ||
          nextLine.startsWith('JA:') ||
          nextLine.startsWith('EN:') ||
          nextLine.startsWith('SUGGESTED_KO:') ||
          nextLine.startsWith('#')
        ) break;
        if (nextLine.trim() === '') {
          // 빈 줄은 블록 종결 신호로 처리
          break;
        }
        val += '\n' + nextLine;
        j++;
      }
      i = j - 1;
      current.suggested_ko = val;
    }
  }

  if (current) entries.push(current);
  return entries;
}

// ---------- 메인 ----------
const text = readFileSync(INPUT, 'utf8');
const entries = parseRaw(text);
console.log(`[c5] Parsed entries: ${entries.length}`);

const mapped = [];
const skipped = [];
const warnings = [];

const HANGUL = /[가-힣]/;
const HIRAGANA_KATAKANA = /[\u3040-\u30FF]/;

for (const e of entries) {
  if (!e.suggested_ko || e.suggested_ko.trim() === '') {
    skipped.push({ ...e, reason: 'empty SUGGESTED_KO' });
    continue;
  }

  const normalized = normalize(e.suggested_ko);

  // 검증: 한국어 포함 여부 (외래어 영문 유지 케이스 제외 — count 알파벳 전체일 수 있음)
  if (!HANGUL.test(normalized)) {
    // 영문 그대로 유지한 경우는 OK (외래어), 단 ko_value와 동일한지 확인
    if (normalized === e.ko_value) {
      // 의도적 영문 유지 (외래어)
      warnings.push({ ...e, normalized, reason: 'kept as English (외래어 유지)' });
    } else {
      warnings.push({ ...e, normalized, reason: 'no Korean detected, not identical to ko_value' });
    }
  }

  // 검증: 일본어 잔존 (한자 외 가나)
  if (HIRAGANA_KATAKANA.test(normalized)) {
    warnings.push({ ...e, normalized, reason: 'hiragana/katakana detected (Japanese leak)' });
  }

  mapped.push({ ...e, normalized });
}

// CSV 출력 — c2 mapped 호환 포맷 (ns/path/pollution_type/ko_value/ja_value/en_value/ko_length/suggested_ko)
// 단, raw에는 ns/pollution_type/ko_length가 없으므로 partial 정보로 생성
const header = ['ko_value', 'count', 'path', 'ja_value', 'en_value', 'suggested_ko'];
const csvRows = [header];
for (const m of mapped) {
  csvRows.push([m.ko_value, String(m.count), m.path, m.ja, m.en, m.normalized]);
}
writeFileSync(OUTPUT, toCSV(csvRows), 'utf8');

// 로그
const log = `# session148 c5 Raw Parser Log

## Input
- File: ${INPUT}
- Total entries parsed: ${entries.length}

## Result
- Mapped (translated): ${mapped.length}
- Skipped (empty): ${skipped.length}
- Warnings: ${warnings.length}

## Output
- Mapped CSV: ${OUTPUT} (${mapped.length} rows + header)

## Skipped entries (empty SUGGESTED_KO)
${skipped.slice(0, 30).map(e => `  [${e.index}] ${JSON.stringify(e.ko_value).slice(0, 100)}`).join('\n')}
${skipped.length > 30 ? `  ... +${skipped.length - 30} more` : ''}

## Warnings (need review)
${warnings.slice(0, 30).map(w =>
  `  [${w.index}] ${w.reason}\n    ko_value: ${JSON.stringify(w.ko_value).slice(0, 100)}\n    suggested: ${JSON.stringify(w.normalized).slice(0, 100)}`
).join('\n\n')}
${warnings.length > 30 ? `\n  ... +${warnings.length - 30} more warnings` : ''}

## Normalization applied
- literal \\n → actual newline
- IME 한자 혼입 정정 (適용→적용 등 ~100 patterns)
- regional indicator 정정 (🇯→🇯🇵, 🇰→🇰🇷)
- 양 끝 공백 제거
`;
writeFileSync(LOG, log, 'utf8');

console.log('[c5] Mapped:', mapped.length);
console.log('[c5] Skipped:', skipped.length);
console.log('[c5] Warnings:', warnings.length);
console.log('[c5] DONE');
