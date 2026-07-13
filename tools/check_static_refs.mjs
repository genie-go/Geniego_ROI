#!/usr/bin/env node
/**
 * [280차] 팬텀 정적자산 참조 가드 — 코드가 로드/배포하는 루트 상대 정적파일이 실제로 존재하는지 검증.
 *
 * ★왜 필요한가: 280차에 `PixelTracking::getSnippet()` 이 고객사에 `<script src="{base}/pixel.js">` 를
 *   배포해 왔는데 pixel.js 가 디스크·git·라우트 어디에도 없었다(팬텀). nginx 가 SPA index.html 을
 *   200 text/html 로 돌려주는 바람에 404 조차 나지 않았고, 1st-party 픽셀 파이프라인 전체(CAPI 7종·
 *   어트리뷰션·CRM 동기화)가 데이터 0인 채로 조용히 죽어 있었다. 같은 메커니즘으로 DashOverview 의
 *   'CDN Assets' 헬스체크(/favicon.ico)도 영구 가짜-초록이었다.
 *
 * ★이 부류는 기존 게이트가 전부 놓친다: vite build 는 문자열이라 모르고, eslint 도 모르고,
 *   nginx SPA 폴백 때문에 런타임 404 도 안 난다. 정적 참조는 오직 이 검사로만 잡힌다.
 *
 * 검사 대상: 소스의 문자열 리터럴 중 루트 상대(`/…`) + 정적 확장자.
 *   실존 인정 위치 = frontend/public/<path>  (Vite publicDir → dist 루트로 복사되어 nginx 가 정적 서빙)
 *
 * 종료코드: 0=정상, 1=팬텀 발견(CI 차단).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'frontend', 'public');

const SCAN_DIRS = [
  path.join(ROOT, 'frontend', 'src'),
  path.join(ROOT, 'backend', 'src'),
];
const SCAN_EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.php']);
const STATIC_EXT = /\.(js|mjs|css|ico|png|jpg|jpeg|gif|svg|webp|json|html|txt|woff2?)$/i;

/** 정적 파일이 아니라 API/라우트인 접두 — 확장자가 붙어도 서버가 동적 생성한다. */
const DYNAMIC_PREFIXES = [
  '/api/', '/auth/', '/pixel/', '/crm/', '/email/', '/v3', '/v4',   // 백엔드 라우트(핸들러가 동적 생성)
  '/assets/',                                                        // vite 해시 번들(빌드 산출물)
];

/** 의도적으로 검사 제외. */
const IGNORE = [
  /^\/\//,            // 프로토콜 상대 URL
  /\/\.\.?\//,        // 파일시스템 상대경로 조각(__DIR__ . '/../data/x.json')
  /\*/,               // 글롭
];

const findings = [];

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'build', '.git'].includes(e.name)) continue;
      walk(p);
    } else if (SCAN_EXT.has(path.extname(e.name))) {
      scan(p);
    }
  }
}

function scan(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  // 루트 상대 정적 경로. 경로 앞은 ① 따옴표(리터럴 시작) 또는 ② `}`(보간 끝) 이어야 한다.
  //   ②가 핵심 — 실제 사고인 getSnippet 의 `s.src='{$baseUrl}/pixel.js?v=1'` 이 이 형태다.
  //   뒤에는 따옴표/? (쿼리스트링) 등이 온다. 쿼리스트링은 존재검사 전에 제거.
  const re = /(?:['"`]|\})(\/[A-Za-z0-9._/\-]+\.[A-Za-z0-9]{2,5})(?=[?'"`\s)]|$)/g;
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|#)/.test(line)) return;                 // 주석 줄 스킵
    // 문자열 '연결 조각'은 독립 경로가 아니다: `self::BASE . '/Accounts/'` · `. '/Messages.json'`.
    // 외부 URL 조립 줄도 우리 정적자산이 아니다.
    const isConcatFragment = /['"]\s*\.\s*$|\.\s*['"]\//.test(line) || /https?:\/\//.test(line);
    if (isConcatFragment) return;
    let m;
    while ((m = re.exec(line)) !== null) {
      const ref = m[1].split('?')[0];
      if (!STATIC_EXT.test(ref)) continue;
      if (IGNORE.some(rx => rx.test(ref))) continue;
      if (DYNAMIC_PREFIXES.some(p => ref.startsWith(p))) continue;
      if (!fs.existsSync(path.join(PUBLIC_DIR, ref))) {
        findings.push({ file: path.relative(ROOT, file), line: i + 1, ref });
      }
    }
  });
}

for (const d of SCAN_DIRS) walk(d);

if (findings.length) {
  console.error('[FAIL] 팬텀 정적자산 참조 — 코드가 로드하지만 frontend/public 에 파일이 없습니다.');
  console.error('       nginx SPA 폴백이 index.html(200 text/html)을 돌려주므로 404 조차 나지 않고');
  console.error('       기능이 조용히 죽습니다(280차 /pixel.js 사건). 파일을 추가하거나 참조를 고치세요.\n');
  for (const f of findings) console.error(`  ${f.file}:${f.line}  →  ${f.ref}`);
  process.exit(1);
}
console.log('[OK] 정적자산 참조 정합 — 팬텀 없음');
