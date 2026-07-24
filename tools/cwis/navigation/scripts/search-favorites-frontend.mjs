#!/usr/bin/env node
/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST03 — Frontend Favorites Keyword Search.
 *
 * ST01 의 favorites-search-scope.json 을 입력으로 프런트엔드만 정적 검색한다.
 *
 * ★스크립트 언어 선택(명세 §47 "둘 중 하나만"): **.mjs 채택**.
 *   근거 = 저장소 프런트 툴링 표준이 `tools/*.mjs`(navigation_analyze·registry_build·e2e 등)이고,
 *   JS/JSX 를 다루는 데 Node 표준 모듈만으로 충분하며 신규 패키지가 필요 없다.
 *
 * ★안전 계약(명세 §44·§75~76):
 *   대상 소스를 **실행하지 않는다**(import/eval/vm 0). Frontend Build·Dev Server·테스트 미실행.
 *   네트워크·DB 접근 없음. 출력은 tools/cwis/navigation/output/ 하위로 강제.
 *
 * ★교차검증(명세 §7 vs 실측):
 *   resources/js · resources/ts · resources/views · client · web · src · templates · modules ·
 *   packages · plugins 는 **전부 부재**. 실제 프런트는 frontend/src(167 .js + 214 .jsx) + frontend/public.
 *   .ts/.tsx/.vue/.svelte/.twig/.blade.php 파일은 **0개** → 해당 파서를 만들지 않는다.
 *
 * ★ST02 교훈 승계:
 *   ① 한글은 \b 가 없다 → (?<![가-힣]) 로 낱말 경계 강제('월별표' 오탐 재발 방지)
 *   ② 한국어 '고정'은 본 저장소에서 대부분 "fixed"(고정 헤더/고정값) — 프런트에도 144회 출현
 *   ③ 컨텍스트 신호는 히트 주변에서만 평가(전역 검색 금지)
 *
 * 사용:
 *   node tools/cwis/navigation/scripts/search-favorites-frontend.mjs [--dry-run]
 *        [--scope=] [--output=] [--file-inventory-output=] [--component-output=]
 *        [--state-output=] [--api-output=] [--max-file-size=] [--fail-on-read-error-rate=]
 *
 * 종료코드: 0=정상, 1=읽기 실패율 초과, 2=설정/입력 오류.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST03';
const PROXIMITY = 14;
const MAX_MATCHED_TEXT = 300;
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
if (!fs.existsSync(path.join(ROOT, 'frontend'))) {
  console.error('[ST03] 프로젝트 루트 탐지 실패');
  process.exit(2);
}

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const h = argv.find(a => a === `--${n}` || a.startsWith(`--${n}=`));
  if (!h) return d;
  const eq = h.indexOf('=');
  return eq === -1 ? '1' : h.slice(eq + 1);
};
const OPT = {
  scope: arg('scope', 'tools/cwis/navigation/favorites-search-scope.json'),
  out: arg('output', 'tools/cwis/navigation/output/favorites-frontend-raw-results.json'),
  outFiles: arg('file-inventory-output', 'tools/cwis/navigation/output/favorites-frontend-file-inventory.json'),
  outComponents: arg('component-output', 'tools/cwis/navigation/output/favorites-frontend-component-inventory.json'),
  outState: arg('state-output', 'tools/cwis/navigation/output/favorites-frontend-state-inventory.json'),
  outApi: arg('api-output', 'tools/cwis/navigation/output/favorites-frontend-api-inventory.json'),
  maxFileSize: Number(arg('max-file-size', String(DEFAULT_MAX_FILE_SIZE))),
  failRate: Number(arg('fail-on-read-error-rate', '0.2')),
  dryRun: arg('dry-run', '') === '1',
};

/** 출력 경로 화이트리스트 */
const safeOut = (rel) => {
  const norm = rel.replace(/\\/g, '/');
  if (!norm.startsWith('tools/cwis/navigation/output/') || norm.includes('..') || /^[A-Za-z]:/.test(norm) || norm.startsWith('/')) {
    console.error(`[ST03] 허용되지 않는 출력 경로: ${rel}`);
    process.exit(2);
  }
  return path.join(ROOT, norm);
};

/* ── Scope ─────────────────────────────────────────────────────────────── */
const scopeAbs = path.join(ROOT, OPT.scope);
if (!fs.existsSync(scopeAbs)) { console.error(`[ST03] scope 파일 없음: ${OPT.scope}`); process.exit(2); }
let scope;
try { scope = JSON.parse(fs.readFileSync(scopeAbs, 'utf8')); }
catch (e) { console.error(`[ST03] scope JSON 파싱 실패: ${e.message}`); process.exit(2); }

/* ── 기술 스택 탐지(명세 §6) — 실제 설치된 것만 기록 ──────────────────── */
function detectStack() {
  const pkgPath = path.join(ROOT, 'frontend/package.json');
  const deps = {};
  if (fs.existsSync(pkgPath)) {
    const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    Object.assign(deps, p.dependencies || {}, p.devDependencies || {});
  }
  const has = (n) => (n in deps ? deps[n] : null);
  return {
    react: has('react'), react_dom: has('react-dom'), react_router: has('react-router-dom'),
    vue: has('vue'), svelte: has('svelte'), inertia: has('@inertiajs/inertia'),
    typescript: has('typescript'),
    state_management: {
      pinia: has('pinia'), vuex: has('vuex'), redux: has('redux'),
      '@reduxjs/toolkit': has('@reduxjs/toolkit'), zustand: has('zustand'),
      detected: 'React Context API (별도 상태 라이브러리 미설치 — 실측)',
    },
    query_library: {
      '@tanstack/react-query': has('@tanstack/react-query'), 'react-query': has('react-query'),
      '@apollo/client': has('@apollo/client'), swr: has('swr'),
      detected: null,
    },
    http_client: { axios: has('axios'), detected: 'fetch wrapper (frontend/src/services/apiClient.js)' },
    test_framework: { vitest: has('vitest'), jest: has('jest'), cypress: has('cypress'), playwright: has('@playwright/test'), detected: null },
    storybook: has('@storybook/react'),
    build: { vite: has('vite'), webpack: has('webpack') },
  };
}
const stack = detectStack();

/* ── 대상 파일 수집 ────────────────────────────────────────────────────── */
const FRONTEND_ROOT_CANDIDATES = [
  'frontend/src', 'frontend/public', 'resources/js', 'resources/ts', 'resources/views',
  'client', 'web', 'src', 'templates', 'modules', 'packages', 'plugins',
];
const EXT = ['js', 'jsx', 'ts', 'tsx', 'vue', 'svelte', 'html', 'twig'];
const excludeDirs = (scope.exclude_directories || []).map(d => d.replace(/\\/g, '/'));
/** noisy_paths(로케일)는 본 스캔에서 분리하고 별도 집계한다. */
const noisyPaths = (scope.noisy_paths || []).map(n => n.path.replace(/\\/g, '/'));

/**
 * ★생성물 경로(명세 §8 "Generated ... 기본 제외").
 * 근거를 함께 남긴다 — 추측이 아니라 생성기와 키워드 부재를 실측 확인했다.
 */
const GENERATED_PATHS = [
  {
    path: 'frontend/public/api_manuals',
    generator: 'tools/gen_api_manuals.mjs',
    evidence: '981개 정적 HTML(채널 API 발급 매뉴얼). 즐겨찾기 키워드 0건 실측 — 스캔 시 통계만 왜곡',
  },
];
const generatedFiles = [];

const searchRoots = [];
const skippedRoots = {};
for (const cand of FRONTEND_ROOT_CANDIDATES) {
  if (!(scope.include_directories || []).includes(cand)) { skippedRoots[cand] = 'scope include_directories 에 없음'; continue; }
  if (!fs.existsSync(path.join(ROOT, cand))) { skippedRoots[cand] = '디렉터리 부재'; continue; }
  searchRoots.push(cand);
}

const failures = [];
const largeFiles = [];
const symlinkSkipped = [];
const files = [];
const noisyFiles = [];

function collect(relRoot) {
  const walk = (absDir) => {
    let entries;
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch { failures.push({ file_path: path.relative(ROOT, absDir).replace(/\\/g, '/'), reason: 'PERMISSION_DENIED' }); return; }
    for (const e of entries) {
      const abs = path.join(absDir, e.name);
      const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
      if (excludeDirs.some(x => rel === x || rel.startsWith(x + '/'))) continue;
      if (e.isSymbolicLink()) {
        let real = null;
        try { real = fs.realpathSync(abs); } catch { /* dangling */ }
        if (!real || !real.startsWith(ROOT + path.sep)) { symlinkSkipped.push(rel); continue; }
      }
      if (e.isDirectory()) { walk(abs); continue; }
      if (!e.isFile() && !e.isSymbolicLink()) continue;
      const m = e.name.match(/\.([a-z0-9]+)$/i);
      const ext = m ? m[1].toLowerCase() : '';
      const isBlade = e.name.endsWith('.blade.php');
      if (!EXT.includes(ext) && !isBlade) continue;
      // Minified / SourceMap / Snapshot 기본 제외(§8)
      if (/\.min\.(js|css)$/.test(e.name) || e.name.endsWith('.map') || e.name.endsWith('.snap')) continue;
      let st;
      try { st = fs.statSync(abs); } catch { failures.push({ file_path: rel, reason: 'FILE_NOT_READABLE' }); continue; }
      if (st.size > OPT.maxFileSize) { largeFiles.push({ file_path: rel, size_bytes: st.size }); }
      if (GENERATED_PATHS.some(g => rel.startsWith(g.path + '/'))) { generatedFiles.push(rel); continue; }
      if (noisyPaths.some(x => rel.startsWith(x + '/'))) { noisyFiles.push(rel); continue; }
      files.push(rel);
    }
  };
  walk(path.join(ROOT, relRoot));
}
for (const r of searchRoots) collect(r);
files.sort();

/* ── Dry Run ───────────────────────────────────────────────────────────── */
if (OPT.dryRun) {
  console.log('[ST03 --dry-run]');
  console.log(`  검색 루트   : ${searchRoots.join(', ') || '(없음)'}`);
  console.log(`  제외된 후보 : ${JSON.stringify(skippedRoots)}`);
  console.log(`  noisy 분리  : ${noisyPaths.join(', ')} (${noisyFiles.length} 파일)`);
  console.log(`  생성물 제외 : ${GENERATED_PATHS.map(g=>g.path).join(", ")} (${generatedFiles.length} 파일)`);
  console.log(`  확장자      : ${EXT.join(', ')} (+ .blade.php)`);
  console.log(`  예상 파일 수: ${files.length}`);
  console.log(`  Framework   : React ${stack.react} / Vue ${stack.vue} / TS ${stack.typescript}`);
  console.log(`  Parser      : 정규식 기반(TS/Babel/Vue 파서 미설치 — 신규 설치 금지)`);
  console.log(`  검색 엔진   : Node 표준 모듈`);
  console.log(`  출력        : ${OPT.out}`);
  process.exit(0);
}

/* ── 검색 패턴 ─────────────────────────────────────────────────────────── */
const PATTERNS = [
  [/favou?rites?/i, 'favorite', 'PRIMARY'],
  [/bookmarks?/i, 'bookmark', 'PRIMARY'],
  [/\bstarred\b|\bunstar\b/i, 'starred', 'PRIMARY'],
  [/\bpinned\b|\bunpin\b|\bpinItem\b/i, 'pinned', 'PRIMARY'],
  [/saved[_ -]?items?/i, 'saved_item', 'PRIMARY'],
  [/(?<![가-힣])즐겨\s*찾기(?![가-힣])/u, '즐겨찾기', 'PRIMARY_KO'],
  [/(?<![가-힣])북마크(?![가-힣])/u, '북마크', 'PRIMARY_KO'],
  [/저장한 항목|저장된 항목/u, '저장한 항목', 'PRIMARY_KO'],
  [/(?<![가-힣])별표(?![가-힣])/u, '별표', 'PRIMARY_KO'],
  [/(?<![가-힣])고정(?![가-힣])|고정한|고정된/u, '고정', 'PRIMARY_KO'],
  // 컴포넌트/훅/스토어/액션 — 저장소 실제 심볼(ST01 known_repo_symbols) 포함
  [/(Favou?rite|Bookmark|Star|Pin|SavedItem)[A-Za-z0-9_]*(Button|Icon|List|Menu|Item|Panel|Card)/, 'component_pattern', 'COMPONENT'],
  [/\buseFavou?rites?\b|\buseBookmarks?\b|\busePinnedItems\b|\buseSavedItems\b|\buseRecentVisits\b/, 'hook_pattern', 'HOOK'],
  [/favou?riteStore|bookmarkStore|savedItemsStore|pinnedItemsStore/, 'store_pattern', 'STORE'],
  [/\btoggleFavou?rite\b|\baddFavou?rite\b|\bremoveFavou?rite\b|\btoggleFav\b|\baddBookmark\b|\bpinItem\b/, 'action_pattern', 'ACTION'],
  [/QuickAccessPanel/, 'QuickAccessPanel', 'COMPONENT'],
  [/g_sidebar_favs|g_sidebar_recents|g_user_menu_visibility|g_sidebar_ui_state/, 'storage_key', 'PREFERENCE'],
  [/\/favou?rites?\b|\/bookmarks?\b|\/saved-items\b|\/pinned-items\b|\/unfavou?rite\b|\/unbookmark\b/, 'endpoint', 'API'],
];

const CONTEXT_SIGNALS = {
  api_call_detected: /\bfetch\s*\(|apiClient|authFetch|httpClient|axios\.|useQuery|useMutation/,
  store_detected: /createContext|useContext|Provider|defineStore|createStore|createSlice|useReducer/,
  optimistic_update_detected: /optimistic|onMutate|previousData|setQueryData/i,
  rollback_detected: /rollback|revert|이전 상태|원상\s*복구|catch\s*\(/i,
  duplicate_click_guard_detected: /disabled\s*=|isPending|isSubmitting|busy|inFlight|switching/i,
  loading_state_detected: /loading|isLoading|pending|isPending|skeleton|spinner|불러오는 중/i,
  error_state_detected: /\berror\b|isError|catch\s*\(|다시 시도|실패/i,
  empty_state_detected: /empty|없습니다|no results|No results|length === 0|\.length\s*<\s*1/,
  accessibility_detected: /aria-|role=|tabIndex|sr-only|focus-visible|screen ?reader/i,
  aria_pressed_detected: /aria-pressed/,
  aria_label_detected: /aria-label/,
  keyboard_support_detected: /onKeyDown|onKeyUp|keydown|\bEscape\b|ArrowDown|ArrowUp/,
  mobile_support_detected: /isMobile|mobile|breakpoint|drawer|bottom-?sheet|touch|matchMedia|max-width/i,
  translation_detected: /\bt\(|useT\(|useI18n|i18n\.|labelKey/,
  frontend_permission_check_detected: /hasMenuAccess|canAccess|permission|subMenuAllowed|isAdmin/i,
  route_integration_detected: /navigate\(|<Link|<NavLink|router\.push|\bto=/,
  sidebar_integration_detected: /Sidebar|sidebarManifest|UnifiedSidebar|QuickAccessPanel/,
  navigation_integration_detected: /menu_key|menuKey|NavigationItem|NavigationRegistry|navigationRegistry/,
  preference_integration_detected: /localStorage|sessionStorage|UserPreference|userSettings|preference|tScopedKey|tGetJSON/i,
  storybook_detected: /\.stories\./,
  test_detected: /\.(test|spec)\.|describe\(|it\(|expect\(/,
  icon_detected: /Heroicons|lucide|FontAwesome|Tabler|Phosphor|<svg|⭐|★|📌/i,
  context_menu_detected: /ContextMenu|DropdownMenu|MenuItem|ActionMenu|OverflowMenu|KebabMenu/,
};

const FALSE_POSITIVE_RULES = [
  [/bookmarklet/i, 'JS_BOOKMARKLET'],
  [/rating|평점|별점|review|리뷰/i, 'RATING_STAR'],
  // ★한국어 '고정' = fixed. 프런트에도 144회 출현(고정 헤더/고정폭/position:fixed 설명)
  [/고정\s*(비|값|폭|길이|높이|소수|환율|단가|주기|간격|헤더|영역|IP|수수료|배송비|메뉴|탭)/u, 'KO_FIXED_VALUE'],
  [/(로|으로|를|은|는|이|가)?\s*고정(\)|\.|,|·|$| |됨|되어|하여|한다)/u, 'KO_FIXED_VALUE'],
  [/position\s*:\s*fixed|sticky/i, 'CSS_FIXED_POSITION'],
  [/^\s*(\*|\/\/|#)/, 'COMMENT_ONLY'],
];

/** 본 CWIS 작업이 만든 코드(자기참조) — 기존 구현 근거가 아니다. */
const SELF_REF = /^(tools\/cwis\/|frontend\/src\/(components\/(sidebar|context|breadcrumb)\/|context\/CollaborationContextProvider|services\/navigationRegistry))/;

const sensitivePatterns = scope.sensitive_patterns || [];
let maskCount = 0;
function mask(line) {
  let out = line;
  for (const p of sensitivePatterns) {
    const q = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${q}\\s*[=:]\\s*)(['"\`])(?:(?!\\2).){3,}\\2`, 'gi');
    const n = out.replace(re, '$1$2[REDACTED]$2');
    if (n !== out) { maskCount++; out = n; }
  }
  const b = out.replace(/(Bearer\s+)[A-Za-z0-9._-]{16,}/gi, '$1[REDACTED]');
  if (b !== out) { maskCount++; out = b; }
  if (/BEGIN (RSA )?PRIVATE KEY/.test(out)) { maskCount++; out = '[REDACTED PRIVATE KEY]'; }
  return out;
}

/* ── 심볼 추출 (정규식 — TS/Babel/Vue 파서 미설치, 신규 설치 금지) ─────── */
function extractSymbols(text) {
  const syms = [];
  const push = (name, type, idx) => {
    if (!name) return;
    syms.push({ name, type, line: text.slice(0, idx).split('\n').length });
  };
  for (const m of text.matchAll(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/g)) push(m[1], 'COMPONENT', m.index);
  for (const m of text.matchAll(/^\s*function\s+([A-Z][A-Za-z0-9_]*)\s*\(/gm)) push(m[1], 'COMPONENT', m.index);
  for (const m of text.matchAll(/^\s*(?:export\s+)?(?:const|let)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/gm)) push(m[1], 'COMPONENT', m.index);
  for (const m of text.matchAll(/^\s*(?:export\s+)?class\s+([A-Z][A-Za-z0-9_]*)/gm)) push(m[1], 'COMPONENT', m.index);
  for (const m of text.matchAll(/^\s*(?:export\s+)?function\s+(use[A-Z][A-Za-z0-9_]*)\s*\(/gm)) push(m[1], 'HOOK', m.index);
  for (const m of text.matchAll(/^\s*(?:export\s+)?(?:const|let)\s+(use[A-Z][A-Za-z0-9_]*)\s*=/gm)) push(m[1], 'HOOK', m.index);
  for (const m of text.matchAll(/^\s*(?:export\s+)?function\s+([a-z][A-Za-z0-9_]*)\s*\(/gm)) push(m[1], 'FUNCTION', m.index);
  for (const m of text.matchAll(/^\s*(?:export\s+)?(?:const|let)\s+([a-z][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|function)/gm)) push(m[1], 'FUNCTION', m.index);
  for (const m of text.matchAll(/(?:export\s+)?const\s+([A-Za-z0-9_]*Context)\s*=\s*createContext/g)) push(m[1], 'STORE', m.index);
  return syms;
}
const enclosing = (syms, line) => {
  let best = null;
  for (const s of syms) if (s.line <= line && (!best || s.line > best.line)) best = s;
  return best || { name: null, type: 'UNKNOWN', line: 0 };
};

/** API 엔드포인트 추출 — 동적이면 DYNAMIC + 축약 표현. */
function extractEndpoints(line) {
  const out = [];
  for (const m of line.matchAll(/['"`](\/(?:api\/)?[A-Za-z0-9._\-/{}:]*)['"`]/g)) {
    if (m[1].length > 1) out.push({ endpoint: m[1], confidence: 'HIGH' });
  }
  for (const m of line.matchAll(/`([^`]*\$\{[^}]*\}[^`]*)`/g)) {
    const expr = m[1].replace(/\$\{[^}]*\}/g, '${…}').slice(0, 80);
    if (expr.includes('/')) out.push({ endpoint: 'DYNAMIC', endpoint_expression: expr, confidence: 'LOW' });
  }
  return out;
}
const httpMethodOf = (win) => {
  const m = win.match(/method\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/i);
  if (m) return m[1].toUpperCase();
  if (/\.post\(|useMutation/.test(win)) return 'POST';
  if (/\.delete\(/.test(win)) return 'DELETE';
  if (/\bfetch\s*\(|\.get\(|useQuery/.test(win)) return 'GET';
  return 'UNKNOWN';
};

/* ── 검색 실행 ─────────────────────────────────────────────────────────── */
const results = [];
const fileAgg = new Map();
const componentAgg = new Map();
const stateAgg = new Map();
const apiAgg = [];
const seen = new Set();
let rawMatchCount = 0;
let idSeq = 0;
let apiSeq = 0;

const frameworkOf = (rel) => (rel.endsWith('.jsx') || rel.endsWith('.tsx') ? 'REACT'
  : rel.endsWith('.vue') ? 'VUE' : rel.endsWith('.svelte') ? 'SVELTE'
    : rel.endsWith('.blade.php') ? 'BLADE' : rel.endsWith('.twig') ? 'TWIG' : 'JAVASCRIPT');

const probableTypeOf = (rel) => {
  const r = rel.toLowerCase();
  if (r.includes('/pages/')) return 'PAGE';
  if (r.includes('/layout/')) return 'LAYOUT';
  if (r.includes('/components/')) return 'COMPONENT';
  if (r.includes('/context/') || r.includes('/contexts/')) return 'STORE';
  if (r.includes('/services/')) return 'API_CLIENT';
  if (r.includes('/hooks/')) return 'HOOK';
  if (r.includes('/utils/')) return 'UTILITY';
  if (r.includes('/i18n/')) return 'TEMPLATE';
  return 'UNKNOWN';
};

for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let content;
  try { content = fs.readFileSync(abs, 'utf8'); }
  catch { failures.push({ file_path: rel, reason: 'FILE_NOT_READABLE' }); continue; }
  if (content.includes(' ')) { failures.push({ file_path: rel, reason: 'INVALID_ENCODING' }); continue; }

  const lines = content.split(/\r\n|\r|\n/);
  const lineHits = new Map();
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    for (const [re, kw, grp] of PATTERNS) {
      const m = re.exec(text);
      if (!m) continue;
      rawMatchCount++;
      const ln = i + 1;
      if (!lineHits.has(ln)) lineHits.set(ln, { keywords: [], groups: [], column: (m.index ?? 0) + 1, text });
      const h = lineHits.get(ln);
      if (!h.keywords.includes(kw)) h.keywords.push(kw);
      if (!h.groups.includes(grp)) h.groups.push(grp);
    }
  }
  if (lineHits.size === 0) continue;

  const syms = extractSymbols(content);
  const fw = frameworkOf(rel);

  for (const [ln, hit] of [...lineHits.entries()].sort((a, b) => a[0] - b[0])) {
    const key = `${rel}:${ln}:${hit.column}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const from = Math.max(0, ln - 1 - PROXIMITY);
    const to = Math.min(lines.length - 1, ln - 1 + PROXIMITY);
    const win = lines.slice(from, to + 1).join('\n');
    const flags = {};
    for (const [f, re] of Object.entries(CONTEXT_SIGNALS)) flags[f] = re.test(win);

    let ignoreReason = null;
    for (const [re, reason] of FALSE_POSITIVE_RULES) { if (re.test(hit.text)) { ignoreReason = reason; break; } }
    const isSelfRef = SELF_REF.test(rel);
    if (isSelfRef && !ignoreReason) ignoreReason = 'CWIS_SELF_REFERENCE';

    const enc = enclosing(syms, ln);
    let matched = mask(hit.text.trim());
    if ([...matched].length > MAX_MATCHED_TEXT) matched = [...matched].slice(0, MAX_MATCHED_TEXT).join('') + '…';
    matched = matched.replace(/[\r\n\t]/g, (c) => ({ '\r': '\\r', '\n': '\\n', '\t': '\\t' }[c]));

    const classification = ignoreReason ? 'OBVIOUS_FALSE_POSITIVE'
      : hit.groups.some(g => ['COMPONENT', 'HOOK', 'STORE', 'ACTION'].includes(g)) ? 'POTENTIAL_FRONTEND_IMPLEMENTATION'
        : hit.groups.includes('PREFERENCE') || flags.preference_integration_detected ? 'POTENTIAL_FRONTEND_INFRASTRUCTURE'
          : ['BLADE', 'TWIG'].includes(fw) ? 'POTENTIAL_TEMPLATE_IMPLEMENTATION'
            : hit.groups.some(g => ['PRIMARY', 'PRIMARY_KO', 'API'].includes(g)) ? 'POTENTIAL_FRONTEND_IMPLEMENTATION'
              : 'UNKNOWN';

    results.push({
      result_id: `FAV-FE-${String(++idSeq).padStart(6, '0')}`,
      keyword: hit.keywords[0],
      matched_keywords: hit.keywords,
      matched_text: matched,
      file_path: rel,
      line_number: ln,
      column_number: hit.column,
      language: fw === 'REACT' ? 'JSX' : fw,
      framework: fw,
      layer: 'FRONTEND',
      classification,
      symbol_name: enc.name,
      symbol_type: enc.type,
      symbol_confidence: enc.name ? 'MEDIUM' : 'LOW',
      related_resource: null,
      api_call_detected: flags.api_call_detected ? 'YES' : 'UNKNOWN',
      store_detected: flags.store_detected ? 'YES' : 'UNKNOWN',
      optimistic_update_detected: flags.optimistic_update_detected ? 'YES' : 'UNKNOWN',
      rollback_detected: flags.rollback_detected ? 'YES' : 'UNKNOWN',
      duplicate_click_guard_detected: flags.duplicate_click_guard_detected ? 'YES' : 'UNKNOWN',
      loading_state_detected: flags.loading_state_detected,
      error_state_detected: flags.error_state_detected,
      empty_state_detected: flags.empty_state_detected,
      accessibility_detected: flags.accessibility_detected ? 'YES' : 'UNKNOWN',
      aria_pressed_detected: flags.aria_pressed_detected,
      aria_label_detected: flags.aria_label_detected,
      keyboard_support_detected: flags.keyboard_support_detected,
      mobile_support_detected: flags.mobile_support_detected ? 'YES' : 'UNKNOWN',
      translation_detected: flags.translation_detected,
      frontend_permission_check_detected: flags.frontend_permission_check_detected,
      route_integration_detected: flags.route_integration_detected,
      sidebar_integration_detected: flags.sidebar_integration_detected,
      navigation_integration_detected: flags.navigation_integration_detected,
      preference_integration_detected: flags.preference_integration_detected,
      context_menu_detected: flags.context_menu_detected,
      icon_detected: flags.icon_detected,
      storybook_detected: flags.storybook_detected,
      test_detected: flags.test_detected,
      self_reference: isSelfRef,
      possibly_generated: /generated|\.min\./i.test(rel),
      duplicate_group: enc.name ? `${rel}#${enc.name}` : null,
      ignore_reason: ignoreReason,
      notes: [],
    });

    /* 파일 집계 */
    if (!fileAgg.has(rel)) {
      fileAgg.set(rel, {
        file_path: rel, match_count: 0, keywords: [], symbols: [],
        framework: fw, probable_type: probableTypeOf(rel), priority: 'LOW',
        possibly_generated: /generated|\.min\./i.test(rel),
      });
    }
    const fa = fileAgg.get(rel);
    fa.match_count++;
    for (const k of hit.keywords) if (!fa.keywords.includes(k)) fa.keywords.push(k);
    if (enc.name && !fa.symbols.includes(enc.name)) fa.symbols.push(enc.name);

    /* Component / State 집계 — 심볼명이 즐겨찾기 관련이거나 실제 즐겨찾기 심볼일 때 */
    const favSym = enc.name && /favou?rite|bookmark|pinned|saved_?item|star|quickaccess|recentvisit/i.test(enc.name);
    if (favSym && !ignoreReason) {
      const ck = `${rel}#${enc.name}`;
      if (enc.type === 'HOOK' || enc.type === 'STORE') {
        if (!stateAgg.has(ck)) {
          stateAgg.set(ck, {
            name: enc.name, type: enc.type, framework: fw, file_path: rel, line_number: enc.line,
            query_library: stack.query_library.detected || 'NONE',
            endpoints: [], optimistic_update_detected: false, rollback_detected: false,
            cache_invalidation_detected: false, storage_type: null, storage_key: null,
            server_synced_detected: false, device_local_only: false,
            priority: 'HIGH', confidence: 'MEDIUM',
          });
        }
        const s = stateAgg.get(ck);
        s.optimistic_update_detected ||= flags.optimistic_update_detected;
        s.rollback_detected ||= flags.rollback_detected;
        if (/localStorage/.test(win)) { s.storage_type = 'localStorage'; s.device_local_only = true; }
        if (/sessionStorage/.test(win)) s.storage_type = 'sessionStorage';
        const skm = win.match(/localStorage\.(?:get|set)Item\(\s*['"]([^'"]+)['"]/);
        if (skm) s.storage_key = skm[1];
        if (flags.api_call_detected) s.server_synced_detected = true;
      } else {
        if (!componentAgg.has(ck)) {
          componentAgg.set(ck, {
            component_name: enc.name, component_type: enc.type === 'COMPONENT' ? 'COMPONENT' : enc.type,
            framework: fw, file_path: rel, line_number: enc.line, match_count: 0,
            props: [], events: [], api_call_detected: false, store_detected: false,
            accessibility_detected: false, mobile_support_detected: false,
            priority: 'HIGH', confidence: 'MEDIUM',
          });
        }
        const c = componentAgg.get(ck);
        c.match_count++;
        c.api_call_detected ||= flags.api_call_detected;
        c.store_detected ||= flags.store_detected;
        c.accessibility_detected ||= flags.accessibility_detected;
        c.mobile_support_detected ||= flags.mobile_support_detected;
        const pm = win.match(/function\s+\w+\s*\(\s*\{([^}]{0,300})\}/);
        if (pm) {
          for (const p of pm[1].split(',').map(x => x.trim().split(/[:=]/)[0].trim()).filter(Boolean)) {
            if (/^[A-Za-z_]\w*$/.test(p) && !c.props.includes(p)) c.props.push(p);
          }
        }
      }
    }

    /* API 호출 집계 — 즐겨찾기 엔드포인트가 실제로 있는가 */
    if (hit.groups.includes('API') && !ignoreReason) {
      for (const ep of extractEndpoints(hit.text)) {
        apiAgg.push({
          call_id: `FAV-FE-API-${String(++apiSeq).padStart(6, '0')}`,
          file_path: rel, line_number: ln,
          http_method: httpMethodOf(win),
          endpoint: ep.endpoint,
          ...(ep.endpoint_expression ? { endpoint_expression: ep.endpoint_expression } : {}),
          function_name: enc.name,
          request_fields: [], response_fields: [],
          authentication_detected: /Authorization|Bearer|authFetch|apiClient/.test(win),
          error_handling_detected: flags.error_state_detected,
          optimistic_update_consumer_detected: flags.optimistic_update_detected,
          confidence: ep.confidence,
        });
      }
    }
  }
}

/* ── Priority 판정(명세 §38) ───────────────────────────────────────────── */
for (const [rel, f] of fileAgg) {
  const rows = results.filter(r => r.file_path === rel);
  const allFalse = rows.length > 0 && rows.every(r => r.classification === 'OBVIOUS_FALSE_POSITIVE');
  const hasImpl = rows.some(r => r.classification === 'POTENTIAL_FRONTEND_IMPLEMENTATION');
  const hasInfra = rows.some(r => r.classification === 'POTENTIAL_FRONTEND_INFRASTRUCTURE');
  const hasDedicatedSymbol = rows.some(r => r.symbol_name && /favou?rite|bookmark|pinned|saved_?item|quickaccess|recentvisit/i.test(r.symbol_name));
  f.priority = allFalse ? 'IGNORE_CANDIDATE'
    : hasDedicatedSymbol ? 'HIGH'
      : (hasImpl && f.keywords.length > 1) ? 'HIGH'
        : (hasImpl || hasInfra) ? 'MEDIUM' : 'LOW';
}

/* ── 통계 ──────────────────────────────────────────────────────────────── */
const byClassification = {};
const byFramework = {};
const byPriority = { HIGH: 0, MEDIUM: 0, LOW: 0, IGNORE_CANDIDATE: 0 };
for (const r of results) {
  byClassification[r.classification] = (byClassification[r.classification] || 0) + 1;
  byFramework[r.framework] = (byFramework[r.framework] || 0) + 1;
}
for (const f of fileAgg.values()) byPriority[f.priority]++;

const signalCount = (f) => results.filter(r => r[f] === true || r[f] === 'YES').length;
const signalCounts = Object.fromEntries(Object.keys(CONTEXT_SIGNALS).map(k => [k, signalCount(k)]));

const totalTargets = files.length + failures.length;
const readErrorRate = totalTargets > 0 ? failures.length / totalTargets : 0;

let revision = null;
try {
  const head = fs.readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').trim();
  revision = head.startsWith('ref: ')
    ? fs.readFileSync(path.join(ROOT, '.git', head.slice(5)), 'utf8').trim().slice(0, 12)
    : head.slice(0, 12);
} catch { /* git 메타 부재 */ }

/* ── noisy(로케일) 별도 집계 — 본 결과에 섞지 않는다 ──────────────────── */
const noisySummary = { files: noisyFiles.length, matches: 0, note: 'scope.noisy_paths 분리 집계 — UI 라벨 사전이라 구현 근거가 아님' };
for (const rel of noisyFiles) {
  try {
    const txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const [re] of PATTERNS.slice(0, 10)) {
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      noisySummary.matches += (txt.match(g) || []).length;
    }
  } catch { /* skip */ }
}

const meta = {
  specification_id: SPEC_ID,
  source_revision: revision,
  generated_at: new Date().toISOString(),
  search_scope_file: OPT.scope,
  search_engine: 'Node 표준 모듈 (정규식 — TS/Babel/Vue 파서 미설치)',
  symbol_extraction: 'regex-based (confidence 기록) — 신규 NPM 패키지 설치 0',
  frontend_frameworks: stack,
  search_roots: searchRoots,
  skipped_root_candidates: skippedRoots,
  noisy_paths_excluded: noisyPaths,
  noisy_summary: noisySummary,
  generated_paths_excluded: GENERATED_PATHS,
  generated_files_excluded: generatedFiles.length,
  proximity_lines: PROXIMITY,
  files_scanned: files.length,
  files_failed: failures.length,
  read_error_rate: Number(readErrorRate.toFixed(4)),
  matches_raw: rawMatchCount,
  matches_deduplicated: results.length,
  unique_files_with_matches: fileAgg.size,
  unique_components: componentAgg.size,
  unique_state_units: stateAgg.size,
  unique_api_calls: apiAgg.length,
  sensitive_values_masked: maskCount,
  symlinks_skipped_outside_root: symlinkSkipped,
  large_files: largeFiles,
  failures,
  by_classification: byClassification,
  by_framework: byFramework,
  by_priority: byPriority,
  context_signal_counts: signalCounts,
};

/* ── 출력 ──────────────────────────────────────────────────────────────── */
const write = (rel, data) => {
  const abs = safeOut(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[ST03] 생성: ${rel}`);
};
write(OPT.out, { ...meta, results });
write(OPT.outFiles, { specification_id: SPEC_ID, generated_at: meta.generated_at, file_count: fileAgg.size, files: [...fileAgg.values()] });
write(OPT.outComponents, { specification_id: SPEC_ID, generated_at: meta.generated_at, component_count: componentAgg.size, components: [...componentAgg.values()] });
write(OPT.outState, { specification_id: SPEC_ID, generated_at: meta.generated_at, state_unit_count: stateAgg.size, state_units: [...stateAgg.values()] });
write(OPT.outApi, { specification_id: SPEC_ID, generated_at: meta.generated_at, api_call_count: apiAgg.length, api_calls: apiAgg });

console.log(`[ST03] 파일 ${files.length}개 스캔 · raw ${rawMatchCount} → dedup ${results.length} · 히트파일 ${fileAgg.size} · 컴포넌트 ${componentAgg.size} · 상태 ${stateAgg.size} · API ${apiAgg.length} · 마스킹 ${maskCount} · 실패 ${failures.length}(${(readErrorRate * 100).toFixed(1)}%)`);
process.exit(readErrorRate > OPT.failRate ? 1 : 0);
