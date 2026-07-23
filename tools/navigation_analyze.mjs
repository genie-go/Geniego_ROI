#!/usr/bin/env node
/**
 * [CWIS Part004-01] Navigation & UX Gap Analyzer — 내비게이션 전수 진단 기반.
 *
 * ★교차검증 결론(feedback_cross_verify_all_commands): 명세는 Laravel/artisan/Blade/Twig/Eloquent 전제이나
 *   본 저장소의 내비게이션은 **100% 프론트엔드 정적 정의**(sidebarManifest.js·App.jsx Route·CommandPalette·
 *   MobileBottomNav·planMenuPolicy)이고 백엔드는 `menu_tree`(AdminMenu.php) **가시성 오버레이**만 담당한다.
 *   따라서 `php artisan collaboration:navigation:analyze` 는 구현 불가·무의미 → 저장소 관례인
 *   `tools/check_*.mjs` CI 가드 계열(check_routes_registered.mjs·check_static_refs.mjs)로 적응한다.
 *
 * ★안전성(명세 §28·§42~46): 스캔 대상 파일을 **실행하지 않는다**(import/eval/vm 전무). 문자열 인식
 *   주석 제거 + 괄호 균형 파서만 사용. 출력 경로는 저장소 루트 하위로 강제(디렉터리 traversal 차단).
 *   보고서에는 경로·라벨·권한키만 기록(시크릿/토큰/환경변수/개인정보 미기록).
 *
 * 사용:
 *   node tools/navigation_analyze.mjs [--format=json|md|both] [--output=<dir>] [--fail-on=P0|P1|P2|none]
 *                                     [--check-routes] [--check-permissions] [--check-i18n] [--quiet]
 *   기본: --format=both --output=docs/cwis --fail-on=none (전 검사 수행)
 *
 * 종료코드: 0=임계 미만, 1=--fail-on 임계 이상 이슈 존재, 2=스캐너 자체 실패(소스 부재/파싱 불가).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'frontend', 'src');

/* ────────────────────────────────────────────────────────────────────────────
 * 0. 인자 파싱 + 경로 안전성
 * ──────────────────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const hit = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  const eq = hit.indexOf('=');
  return eq === -1 ? true : hit.slice(eq + 1);
};
const OPT = {
  format: String(arg('format', 'both')),
  output: String(arg('output', path.join('docs', 'cwis'))),
  failOn: String(arg('fail-on', 'none')).toUpperCase(),
  checkRoutes: arg('check-routes', true) !== false,
  checkPermissions: arg('check-permissions', true) !== false,
  checkI18n: arg('check-i18n', true) !== false,
  quiet: arg('quiet', false) === true,
  // 백엔드 관리자 API(GET /v425/pm/collaboration/navigation/analysis)가 읽는 스냅샷도 함께 갱신
  snapshot: arg('snapshot', false) === true,
};

/** 출력 경로 화이트리스트 — 저장소 루트 밖 쓰기 차단(명세 §44·§45). */
function safeOutputDir(rel) {
  const abs = path.resolve(ROOT, rel);
  const norm = abs.endsWith(path.sep) ? abs : abs + path.sep;
  if (!norm.startsWith(ROOT + path.sep)) {
    console.error(`[nav-analyze] 출력 경로가 저장소 루트를 벗어남(차단): ${rel}`);
    process.exit(2);
  }
  // symlink 우회 차단 — 이미 존재하면 실제 경로도 루트 하위여야 한다.
  if (fs.existsSync(abs)) {
    const real = fs.realpathSync(abs);
    if (!(real + path.sep).startsWith(fs.realpathSync(ROOT) + path.sep)) {
      console.error(`[nav-analyze] 출력 경로가 symlink 로 루트를 벗어남(차단): ${rel}`);
      process.exit(2);
    }
  }
  return abs;
}
const OUT_DIR = safeOutputDir(OPT.output);

const log = (...a) => { if (!OPT.quiet) console.log(...a); };

/* ────────────────────────────────────────────────────────────────────────────
 * 1. 소스 유틸 — 문자열 인식 주석 제거 / 괄호 균형 추출
 *    (정규식만으로 주석을 지우면 "http://" 나 정규식 리터럴을 깨뜨린다 → 문자 단위 스캐너 사용)
 * ──────────────────────────────────────────────────────────────────────────── */
function readSource(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`[nav-analyze] 필수 소스 부재: ${rel}`);
    process.exit(2);
  }
  return fs.readFileSync(abs, 'utf8');
}

/** JS/JSX 주석 제거(문자열·템플릿리터럴 보존). JSX `{/* *\/}` 도 블록주석이라 함께 제거된다. */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += c; i++;
      while (i < n) {
        if (src[i] === '\\') { out += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
        out += src[i];
        if (src[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** `start` 위치의 여는 괄호부터 짝이 맞는 닫는 괄호까지의 내부 문자열(문자열 리터럴 인식). */
function balanced(src, start, open, close) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < src.length) { if (src[i] === '\\') i++; else if (src[i] === q) break; i++; }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return { body: src.slice(start + 1, i), end: i }; }
  }
  return null;
}

/** 객체 리터럴 텍스트에서 `key: "value"` 추출(단순 스칼라 전용). */
function prop(objText, key) {
  const re = new RegExp(`(?:^|[,{\\s])${key}\\s*:\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1`);
  const m = objText.match(re);
  return m ? m[2] : null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. NavigationSourceScanner 구현체
 *    (명세 §22.1 의 scan(): NavigationItemDefinition[] 계약을 JS 로 적응)
 * ──────────────────────────────────────────────────────────────────────────── */

/** 2-1. 사이드바 manifest — 데스크톱/관리자 메뉴 정본 */
function scanSidebarManifest() {
  const rel = 'frontend/src/layout/sidebarManifest.js';
  const src = stripComments(readSource(rel));
  const items = [];
  const trees = {};

  for (const [constName, audience] of [['MEMBER_MENU', 'MEMBER'], ['ADMIN_MENU', 'ADMIN']]) {
    const at = src.indexOf(`export const ${constName}`);
    if (at === -1) { console.error(`[nav-analyze] ${constName} 미발견 — manifest 구조 변경`); process.exit(2); }
    const arrStart = src.indexOf('[', at);
    const arr = balanced(src, arrStart, '[', ']');
    if (!arr) { console.error(`[nav-analyze] ${constName} 배열 파싱 실패`); process.exit(2); }
    const tree = [];
    // 섹션: `{ key: "...", ... items: [ ... ] }`
    let cursor = 0;
    while (true) {
      const kAt = arr.body.indexOf('key:', cursor);
      if (kAt === -1) break;
      const itemsAt = arr.body.indexOf('items:', kAt);
      if (itemsAt === -1) break;
      const secHead = arr.body.slice(kAt, itemsAt);
      const secKey = prop(secHead, 'key');
      const secLabelKey = prop(secHead, 'labelKey');
      const secIcon = prop(secHead, 'icon');
      const listStart = arr.body.indexOf('[', itemsAt);
      const list = balanced(arr.body, listStart, '[', ']');
      if (!list) break;
      const leaves = [];
      let c2 = 0;
      while (true) {
        const oAt = list.body.indexOf('{', c2);
        if (oAt === -1) break;
        const obj = balanced(list.body, oAt, '{', '}');
        if (!obj) break;
        const to = prop(obj.body, 'to');
        if (to) {
          const leaf = {
            menu_key: `${constName === 'ADMIN_MENU' ? 'admin' : 'member'}.${secKey}.${to}`,
            label_key: prop(obj.body, 'labelKey'),
            label_literal: prop(obj.body, 'label'),
            icon: prop(obj.body, 'icon'),
            parent_key: secKey,
            path: to,
            access_key: prop(obj.body, 'menuKey'),   // 백엔드 plan_menu_access 매핑 키
            source_type: 'JS_MANIFEST',
            source_path: rel,
            source_symbol: constName,
            audience,
          };
          items.push(leaf);
          leaves.push(leaf);
        }
        c2 = obj.end + 1;
      }
      tree.push({ key: secKey, label_key: secLabelKey, icon: secIcon, items: leaves.map(l => l.path) });
      cursor = list.end + 1;
    }
    trees[audience] = tree;
  }

  // ADMIN_ONLY_MENU_KEYS
  const aoAt = src.indexOf('ADMIN_ONLY_MENU_KEYS');
  const aoArr = aoAt === -1 ? null : balanced(src, src.indexOf('[', aoAt), '[', ']');
  const adminOnlyKeys = new Set(
    (aoArr ? [...aoArr.body.matchAll(/["']([^"']+)["']/g)].map(m => m[1]) : [])
  );

  return { items, trees, adminOnlyKeys, source_path: rel };
}

/** 2-2. SPA 라우트 — App.jsx (인증 셸 / 공개 영역 구분, 가드·리다이렉트·컴포넌트 추적) */
function scanSpaRoutes() {
  const rel = 'frontend/src/App.jsx';
  const raw = readSource(rel);
  const src = stripComments(raw);

  // lazy() + 정적 import 컴포넌트 → 파일 경로
  const components = new Map();
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']/g)) {
    components.set(m[1], { spec: m[2], lazy: true });
  }
  for (const m of src.matchAll(/^import\s+(\w+)\s+from\s+["']([^"']+)["']/gm)) {
    if (!components.has(m[1])) components.set(m[1], { spec: m[2], lazy: false });
  }

  // 인증 셸(<MenuAccessGuard>) 구간 오프셋 — 공개 라우트와 구분
  const guardOpen = src.indexOf('<MenuAccessGuard>');
  const guardClose = src.indexOf('</MenuAccessGuard>');

  const routes = [];
  for (const m of src.matchAll(/<Route\s/g)) {
    const start = m.index;
    const tagSlice = src.slice(start, start + 400);
    const pm = tagSlice.match(/path=\{?["']([^"']+)["']/);
    if (!pm) continue;
    const routePath = pm[1];
    const elAt = src.indexOf('element=', start);
    if (elAt === -1 || elAt - start > 400) continue;
    const braceAt = src.indexOf('{', elAt);
    const el = balanced(src, braceAt, '{', '}');
    const element = el ? el.body.trim() : '';

    const redirect = element.match(/<Navigate\s+to=["']([^"']+)["']/);
    const guards = [...element.matchAll(/<(\w*(?:Guard|Gate|RequireAuth)\w*)[\s>]/g)].map(g => g[1]);
    // 렌더 컴포넌트 = Navigate/가드가 아닌 첫 JSX 태그
    const tags = [...element.matchAll(/<([A-Z]\w*)/g)].map(t => t[1]);
    const componentName = tags.find(t => t !== 'Navigate' && !/Guard|Gate|RequireAuth/.test(t)) || null;

    const scope = (guardOpen !== -1 && start > guardOpen && start < guardClose) ? 'AUTHENTICATED' : 'PUBLIC';
    routes.push({
      path: routePath,
      scope,
      redirect_to: redirect ? redirect[1] : null,
      component: componentName,
      component_spec: componentName && components.has(componentName) ? components.get(componentName).spec : null,
      guards,
      dev_only: /import\.meta\.env\.DEV\s*&&/.test(src.slice(Math.max(0, start - 60), start)),
      source_type: 'REACT_ROUTER',
      source_path: rel,
      line: raw.slice(0, raw.indexOf(`path="${routePath}"`) + 1).split('\n').length,
    });
  }
  return { routes, components, source_path: rel };
}

/** 2-3. Command Palette (Ctrl+K) — 독립 하드코딩 명령 목록 */
function scanCommandPalette() {
  const rel = 'frontend/src/components/CommandPalette.jsx';
  const src = stripComments(readSource(rel));
  const at = src.indexOf('const COMMANDS');
  if (at === -1) return { items: [], source_path: rel };
  const arr = balanced(src, src.indexOf('[', at), '[', ']');
  const items = [];
  let c = 0;
  while (arr) {
    const oAt = arr.body.indexOf('{', c);
    if (oAt === -1) break;
    const obj = balanced(arr.body, oAt, '{', '}');
    if (!obj) break;
    const p = prop(obj.body, 'path');
    if (p) items.push({ id: prop(obj.body, 'id'), label_literal: prop(obj.body, 'label'), path: p, source_type: 'COMMAND_PALETTE', source_path: rel });
    c = obj.end + 1;
  }
  return { items, source_path: rel };
}

/** 2-4. 모바일 하단 탭 — to + match 프리픽스 */
function scanMobileNav() {
  const rel = 'frontend/src/components/MobileBottomNav.jsx';
  const src = stripComments(readSource(rel));
  const at = src.indexOf('const TAB_DEFS');
  if (at === -1) return { tabs: [], source_path: rel };
  const arr = balanced(src, src.indexOf('[', at), '[', ']');
  const tabs = [];
  let c = 0;
  while (arr) {
    const oAt = arr.body.indexOf('{', c);
    if (oAt === -1) break;
    const obj = balanced(arr.body, oAt, '{', '}');
    if (!obj) break;
    const to = prop(obj.body, 'to');
    if (to) {
      const mAt = obj.body.indexOf('match:');
      let match = [];
      if (mAt !== -1) {
        const mArr = balanced(obj.body, obj.body.indexOf('[', mAt), '[', ']');
        if (mArr) match = [...mArr.body.matchAll(/["']([^"']+)["']/g)].map(x => x[1]);
      }
      tabs.push({ path: to, label_key: prop(obj.body, 'labelKey'), match, source_type: 'MOBILE_TAB', source_path: rel });
    }
    c = obj.end + 1;
  }
  return { tabs, source_path: rel };
}

/** 2-5. 플랜 게이트 정책 — MENU_MIN_PLAN / _EXTRA_PATH_MENUKEYS */
function scanPlanPolicy() {
  const rel = 'frontend/src/auth/planMenuPolicy.js';
  const src = stripComments(readSource(rel));
  const minPlan = {};
  const mpAt = src.indexOf('MENU_MIN_PLAN = Object.freeze');
  if (mpAt !== -1) {
    const obj = balanced(src, src.indexOf('{', mpAt), '{', '}');
    if (obj) for (const m of obj.body.matchAll(/["']([^"']+)["']\s*:\s*["']([^"']+)["']/g)) minPlan[m[1]] = m[2];
  }
  const extra = [];
  const exAt = src.indexOf('_EXTRA_PATH_MENUKEYS');
  if (exAt !== -1) {
    const arr = balanced(src, src.indexOf('[', exAt), '[', ']');
    if (arr) for (const m of arr.body.matchAll(/\[\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\]/g)) extra.push([m[1], m[2]]);
  }
  const defMatch = src.match(/DEFAULT_MIN_PLAN\s*=\s*["']([^"']+)["']/);
  return { minPlan, extra, defaultMinPlan: defMatch ? defMatch[1] : 'pro', source_path: rel };
}

/** 2-6. 백엔드 라우트($custom) — 프론트가 부르는 menu-tree API 실재 확인용 */
function scanBackendRoutes() {
  const rel = 'backend/src/routes.php';
  const src = readSource(rel);
  const METHODS = 'GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD';
  const set = new Set();
  const re = new RegExp(`^\\s*'(${METHODS})\\s+(\\S+?)'\\s*=>`, 'gm');
  for (let m; (m = re.exec(src));) set.add(`${m[1]} ${m[2]}`);
  return { routes: set, source_path: rel };
}

/** 2-7. 앱 내부 링크 전수 — 메뉴 밖 진입점(도달가능성 판정의 반증 근거) */
function scanInAppLinks() {
  const links = new Map(); // path → Set(파일)
  const add = (p, f) => {
    if (!p.startsWith('/') || p.startsWith('//')) return;
    const clean = p.split('?')[0].split('#')[0];
    if (!clean || clean === '/') return;
    if (!links.has(clean)) links.set(clean, new Set());
    links.get(clean).add(f);
  };
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (['node_modules', 'i18n', 'locales_backup', 'data'].includes(e.name)) continue;
        walk(abs);
        continue;
      }
      if (!/\.(jsx?|mjs)$/.test(e.name)) continue;
      const relf = path.relative(ROOT, abs).replace(/\\/g, '/');
      // App.jsx 의 Route 정의·manifest 자체는 "링크"가 아니므로 제외
      if (relf.endsWith('src/App.jsx') || relf.endsWith('layout/sidebarManifest.js')) continue;
      const txt = stripComments(fs.readFileSync(abs, 'utf8'));
      for (const m of txt.matchAll(/\bto=\{?["'](\/[^"'`]*)["']/g)) add(m[1], relf);
      for (const m of txt.matchAll(/\bnavigate\(\s*["'](\/[^"'`]*)["']/g)) add(m[1], relf);
      for (const m of txt.matchAll(/\bhref=\{?["'](\/[^"'`]*)["']/g)) add(m[1], relf);
      for (const m of txt.matchAll(/location\.href\s*=\s*["'](\/[^"'`]*)["']/g)) add(m[1], relf);
    }
  };
  walk(SRC);
  return links;
}

/**
 * 2-8. 사이드바 라벨 사전 실재 확인.
 *
 * ★교차검증 결과: 사이드바 라벨은 `i18n/locales/*.js` 의 `gNav.*` 가 아니라
 *   `layout/sidebarI18n.js` 의 SIDEBAR_DICT[lang][leafKey] 에서 온다(Sidebar.jsx:406 navT).
 *   locale 파일을 대상으로 검사하면 전건 오탐이므로 정본 사전을 검사한다.
 */
function scanSidebarDict(labelKeys) {
  const rel = 'frontend/src/layout/sidebarI18n.js';
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  const src = fs.readFileSync(abs, 'utf8');
  const dAt = src.indexOf('{');
  const dict = balanced(src, dAt, '{', '}');
  if (!dict) return null;
  const langs = {};
  let c = 0;
  while (true) {
    const m = /["'](\w[\w-]*)["']\s*:\s*\{/g;
    m.lastIndex = c;
    const hit = m.exec(dict.body);
    if (!hit) break;
    const objStart = dict.body.indexOf('{', hit.index + hit[0].length - 1);
    const obj = balanced(dict.body, objStart, '{', '}');
    if (!obj) break;
    const keys = new Set([...obj.body.matchAll(/["']([\w.-]+)["']\s*:/g)].map(x => x[1]));
    langs[hit[1]] = keys;
    c = obj.end + 1;
  }
  const missingByLang = {};
  for (const [lang, keys] of Object.entries(langs)) {
    const miss = labelKeys.filter(k => !keys.has(k.split('.').pop()));
    if (miss.length) missingByLang[lang] = miss;
  }
  return { source_path: rel, langs: Object.keys(langs), missingByLang };
}

/**
 * 2-9. 페이지 레벨 리다이렉트 셸 탐지.
 *
 * ★실측 근거: `/commerce`(Commerce.jsx 2줄) · `/supplier-portal`(SupplierPortal.jsx 11줄) 은 App.jsx 에선
 *   정상 컴포넌트 라우트지만 컴포넌트 본문이 `<Navigate to=...>` 뿐인 레거시 별칭이다. 이를 모르면
 *   "도달불가 페이지"·"플랜게이트 갭"으로 오탐한다(오탐 금지 원칙).
 */
function detectComponentRedirect(spec) {
  if (!spec || !spec.startsWith('.')) return null;
  const base = path.resolve(SRC, spec);
  const file = [base, `${base}.jsx`, `${base}.js`].find(c => fs.existsSync(c) && fs.statSync(c).isFile());
  if (!file) return null;
  const body = stripComments(fs.readFileSync(file, 'utf8'));
  const nav = body.match(/<Navigate\s+to=["']([^"']+)["']/);
  if (!nav) return null;
  // 렌더되는 JSX 태그가 Navigate 뿐이어야 "순수 별칭"
  const tags = [...body.matchAll(/<([A-Z]\w*)/g)].map(t => t[1]);
  if (tags.some(t => t !== 'Navigate')) return null;
  return nav[1];
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. Checker — Route Integrity / Permission Consistency / Duplicate / Unreachable
 * ──────────────────────────────────────────────────────────────────────────── */

/** planMenuPolicy.pathToMenuKey 의 알고리즘을 그대로 재현(정확일치 → 최장 prefix, '/' 경계). */
function makePathToMenuKey(manifestItems, extra) {
  const idx = [];
  for (const it of manifestItems) if (it.path && it.access_key) idx.push([it.path, it.access_key]);
  for (const [p, k] of extra) idx.push([p, k]);
  idx.sort((a, b) => b[0].length - a[0].length);
  return (pathname) => {
    if (!pathname) return null;
    for (const [p, k] of idx) if (p === pathname) return k;
    for (const [p, k] of idx) if (pathname === p || pathname.startsWith(p + '/')) return k;
    return null;
  };
}

const SEVERITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };

/**
 * 플랜 게이트 미적용이 **의도된** 경로(계정·결제 스코프 — 모든 플랜이 도달해야 한다).
 * 새 항목 추가 시 반드시 근거 주석을 함께 남긴다(오탐 재발 방지).
 */
const INTENTIONAL_UNGATED = new Map([
  ['/payment/success', 'PG 결제 콜백 — 결제 직후 모든 플랜이 도달해야 한다(게이팅 시 결제 완료 화면 소실).'],
  ['/payment/fail', 'PG 결제 실패 콜백 — 위와 동일.'],
  ['/my-coupons', '보유 쿠폰/구독 혜택 — 과금 스코프(PlanGate 자체가 여기로 유도).'],
  ['/license', '라이선스 활성화 — 플랜 승급 경로 자체라 게이팅하면 잠금(deadlock).'],
  ['/me/menu', '개인 메뉴 표시 설정 — 계정 개인화 스코프(플랜 무관).'],
]);

/**
 * 앱 내부 링크가 없는 것이 **정상**인 외부 진입 전용 경로.
 * (PG 리다이렉트·외부 메일 링크 등 — 메뉴에 넣으면 오히려 오작동)
 */
const EXTERNAL_ENTRY = new Map([
  ['/payment/success', 'PG(결제사)가 리다이렉트하는 콜백 — 앱 내 링크가 없는 것이 정상.'],
  ['/payment/fail', 'PG 결제 실패 리다이렉트 콜백 — 위와 동일.'],
]);

function analyze() {
  const manifest = scanSidebarManifest();
  const spa = scanSpaRoutes();
  const palette = scanCommandPalette();
  const mobile = scanMobileNav();
  const policy = scanPlanPolicy();
  const backend = scanBackendRoutes();
  const inAppLinks = scanInAppLinks();

  const issues = [];
  const addIssue = (o) => issues.push(o);

  // ALWAYS_ACCESSIBLE_PATHS — MenuAccessGuard 최상단 통과 목록(플랜 게이트 미적용이 설계)
  const aapSrc = stripComments(readSource('frontend/src/App.jsx'));
  const aapAt = aapSrc.indexOf('ALWAYS_ACCESSIBLE_PATHS');
  const aapArr = aapAt === -1 ? null : balanced(aapSrc, aapSrc.indexOf('[', aapAt), '[', ']');
  const alwaysAccessible = new Set(aapArr ? [...aapArr.body.matchAll(/["']([^"']+)["']/g)].map(m => m[1]) : []);

  const routeByPath = new Map();
  for (const r of spa.routes) {
    if (!routeByPath.has(r.path)) routeByPath.set(r.path, r);
  }
  // 페이지 레벨 리다이렉트 셸(레거시 별칭) 병합 — App.jsx 만 봐서는 실페이지처럼 보인다.
  for (const r of spa.routes) {
    if (r.redirect_to || !r.component_spec) continue;
    const target = detectComponentRedirect(r.component_spec);
    if (target) { r.component_redirect_to = target; r.redirect_to = target; r.legacy_alias = true; }
  }
  const isRoute = (p) => routeByPath.has(p);
  const pathToMenuKey = makePathToMenuKey(manifest.items, policy.extra);

  /** 리다이렉트 체인 해소(루프 탐지 포함) */
  const resolveRedirect = (p, seen = new Set()) => {
    if (seen.has(p)) return { final: p, loop: true, chain: [...seen] };
    seen.add(p);
    const r = routeByPath.get(p);
    if (!r) return { final: p, missing: true, chain: [...seen] };
    if (r.redirect_to) return resolveRedirect(r.redirect_to, seen);
    return { final: p, chain: [...seen] };
  };

  /* ── C1. DEAD_LINK — 메뉴 항목의 경로에 라우트가 없다 ─────────────────── */
  const navSources = [
    ...manifest.items.map(i => ({ ...i, origin: `sidebar:${i.audience}` })),
    ...palette.items.map(i => ({ ...i, origin: 'command_palette' })),
    ...mobile.tabs.map(i => ({ ...i, origin: 'mobile_tab' })),
  ];
  for (const item of navSources) {
    if (!isRoute(item.path)) {
      addIssue({
        code: 'DEAD_LINK', severity: 'P1', path: item.path, origin: item.origin,
        source_path: item.source_path,
        detail: `메뉴/명령에는 존재하지만 App.jsx 에 라우트가 없다 → SPA catch-all(/*)로 대시보드 리다이렉트.`,
      });
    }
  }
  // 모바일 match 프리픽스의 팬텀 경로
  for (const tab of mobile.tabs) {
    for (const mp of tab.match || []) {
      if (!isRoute(mp)) {
        addIssue({
          code: 'STALE_MATCH_PREFIX', severity: 'P4', path: mp, origin: `mobile_tab:${tab.path}`,
          source_path: mobile.source_path,
          detail: `모바일 탭 활성화 판정(match)에 남은 폐기 경로 — 라우트 부재. 오탐 활성표시만 유발(기능 영향 없음).`,
        });
      }
    }
  }

  /* ── C2. BROKEN_REDIRECT / REDIRECT_LOOP ────────────────────────────────── */
  for (const r of spa.routes) {
    if (!r.redirect_to) continue;
    if (r.redirect_to.includes(':') || r.redirect_to.includes('?')) continue;
    const res = resolveRedirect(r.redirect_to);
    if (res.loop) {
      addIssue({ code: 'REDIRECT_LOOP', severity: 'P1', path: r.path, detail: `리다이렉트 순환: ${res.chain.join(' → ')}`, source_path: r.source_path });
    } else if (res.missing && !r.redirect_to.startsWith('/login')) {
      addIssue({ code: 'BROKEN_REDIRECT', severity: 'P2', path: r.path, detail: `리다이렉트 대상 라우트 부재: ${r.redirect_to}`, source_path: r.source_path });
    }
  }

  /* ── C3. MISSING_COMPONENT — lazy import 대상 파일 부재(팬텀 페이지) ───── */
  for (const [name, meta] of spa.components) {
    if (!meta.spec.startsWith('.')) continue;
    const base = path.resolve(SRC, meta.spec);
    const candidates = [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx')];
    if (!candidates.some(c => fs.existsSync(c))) {
      addIssue({ code: 'MISSING_COMPONENT', severity: 'P0', path: meta.spec, detail: `라우트 컴포넌트 ${name} 의 소스 파일이 없다(빌드 실패 또는 팬텀).`, source_path: spa.source_path });
    }
  }

  /* ── C4. PLAN_GATE_GAP — 실페이지인데 pathToMenuKey=null → MenuAccessGuard 무조건 통과 ── */
  const gateGaps = [];
  for (const r of spa.routes) {
    if (r.scope !== 'AUTHENTICATED') continue;
    if (r.redirect_to || !r.component) continue;
    if (r.path.includes('*') || r.path.includes(':')) continue;
    if (r.guards.length > 0) continue;              // AdminRouteGuard 등 별도 게이트 존재
    if (alwaysAccessible.has(r.path)) continue;     // MenuAccessGuard 설계상 전 플랜 통과
    const mk = pathToMenuKey(r.path);
    if (mk) continue;
    if (INTENTIONAL_UNGATED.has(r.path)) {
      addIssue({
        code: 'INTENTIONAL_UNGATED', severity: 'P4', path: r.path, component: r.component,
        source_path: r.source_path, line: r.line,
        detail: `게이트 미적용이 의도됨: ${INTENTIONAL_UNGATED.get(r.path)} (재감사 시 결함으로 재플래그 금지)`,
      });
      continue;
    }
    gateGaps.push(r.path);
    addIssue({
      code: 'PLAN_GATE_GAP', severity: 'P1', path: r.path, component: r.component,
      source_path: r.source_path, line: r.line,
      detail: `사이드바 미등재 + _EXTRA_PATH_MENUKEYS 미등록 → pathToMenuKey=null → MenuAccessGuard 무조건 통과. ` +
              `URL 직접입력으로 플랜 게이트 우회 가능(서버 테넌트 격리는 별도 유지).`,
    });
  }

  /* ── C5. UNGATED_ACCESS_KEY — manifest menuKey 가 MENU_MIN_PLAN 미정의 ─── */
  const accessKeys = new Set(manifest.items.map(i => i.access_key).filter(Boolean));
  for (const k of accessKeys) {
    if (!(k in policy.minPlan)) {
      addIssue({
        code: 'UNDECLARED_ACCESS_KEY', severity: 'P3', path: k, source_path: policy.source_path,
        detail: `사이드바가 쓰는 menuKey 가 MENU_MIN_PLAN 에 없다 → DEFAULT_MIN_PLAN(${policy.defaultMinPlan}) 폴백. ` +
                `fail-secure 라 보안 문제는 아니나 의도치 않은 상위플랜 게이팅 위험.`,
      });
    }
  }

  /* ── C6. ADMIN_EXPOSURE — 관리자 전용 경로의 가드 정합 ──────────────────── */
  for (const r of spa.routes) {
    if (r.scope !== 'AUTHENTICATED' || r.redirect_to || !r.component) continue;
    const mk = pathToMenuKey(r.path);
    const adminByKey = mk ? (manifest.adminOnlyKeys.has(mk) || policy.minPlan[mk] === 'admin') : false;
    const guarded = r.guards.some(g => /Admin/.test(g));
    if (adminByKey && !guarded) {
      addIssue({
        code: 'ADMIN_ROUTE_UNGUARDED', severity: 'P0', path: r.path, source_path: r.source_path, line: r.line,
        detail: `admin 전용 menuKey(${mk})인데 AdminRouteGuard 가 없다 → 일반 사용자가 UI 렌더 가능.`,
      });
    }
    if (guarded && !adminByKey && r.path.startsWith('/admin')) {
      addIssue({
        code: 'ADMIN_KEY_MISSING', severity: 'P3', path: r.path, source_path: r.source_path,
        detail: `/admin/* 라우트인데 menuKey 가 admin 등급이 아니다(${mk || 'null'}) → 게이트 이원화.`,
      });
    }
  }

  /* ── C7. UNREACHABLE — 실페이지인데 메뉴·앱내 링크 어디에도 없다 ──────── */
  const menuPaths = new Set(navSources.map(i => i.path));
  const unreachable = [];
  for (const r of spa.routes) {
    if (r.scope !== 'AUTHENTICATED' || r.redirect_to || !r.component) continue;
    if (r.path.includes('*') || r.path.includes(':')) continue;
    if (menuPaths.has(r.path)) continue;
    const linkedFrom = inAppLinks.get(r.path);
    if (EXTERNAL_ENTRY.has(r.path)) {
      addIssue({
        code: 'EXTERNAL_ENTRY_ONLY', severity: 'P4', path: r.path, component: r.component, source_path: r.source_path,
        detail: `외부 진입 전용(정상): ${EXTERNAL_ENTRY.get(r.path)} (재감사 시 도달불가로 재플래그 금지)`,
      });
      continue;
    }
    if (!linkedFrom || linkedFrom.size === 0) {
      unreachable.push(r.path);
      addIssue({
        code: 'UNREACHABLE_PAGE', severity: 'P2', path: r.path, component: r.component,
        source_path: r.source_path, line: r.line,
        detail: `메뉴(사이드바/팔레트/모바일)에도, 앱 내 링크(to/navigate/href)에도 없다 → URL 직접입력 외 도달 불가.`,
      });
    } else {
      addIssue({
        code: 'MENU_UNREACHABLE', severity: 'P4', path: r.path, component: r.component,
        source_path: r.source_path,
        detail: `메뉴 미등재(앱 내 링크로만 도달): ${[...linkedFrom].slice(0, 3).join(', ')}${linkedFrom.size > 3 ? ' 외' : ''}`,
      });
    }
  }

  /* ── C8. DUPLICATE — 동일 경로 중복 노출 / 동일 컴포넌트 다중 경로 ────── */
  const byPath = new Map();
  for (const i of manifest.items) {
    if (!byPath.has(i.path)) byPath.set(i.path, []);
    byPath.get(i.path).push(i);
  }
  for (const [p, list] of byPath) {
    if (list.length > 1) {
      addIssue({
        code: 'DUPLICATED_MENU', severity: 'P2', path: p, source_path: manifest.source_path,
        detail: `사이드바에 동일 경로가 ${list.length}회 등재(그룹: ${list.map(l => l.parent_key).join(', ')}) → 같은 페이지가 중복 노출.`,
      });
    }
  }
  const byComponent = new Map();
  for (const r of spa.routes) {
    if (!r.component || r.redirect_to) continue;
    if (!byComponent.has(r.component)) byComponent.set(r.component, []);
    byComponent.get(r.component).push(r.path);
  }
  for (const [c, paths] of byComponent) {
    if (paths.length > 1) {
      addIssue({
        code: 'DUPLICATED_ROUTE_TARGET', severity: 'P3', path: paths.join(' , '), source_path: spa.source_path,
        detail: `동일 컴포넌트 ${c} 가 서로 다른 ${paths.length}개 경로로 렌더 → canonical URL 부재(즐겨찾기/최근항목/분석 분산).`,
      });
    }
  }

  /* ── C9. 소스 간 드리프트 — 팔레트/모바일이 사이드바 정본과 어긋남 ──── */
  const sidebarMemberPaths = new Set(manifest.items.filter(i => i.audience === 'MEMBER').map(i => i.path));
  const paletteCovered = palette.items.filter(i => sidebarMemberPaths.has(i.path)).length;
  for (const c of palette.items) {
    const mk = pathToMenuKey(c.path);
    const adminOnly = mk ? (manifest.adminOnlyKeys.has(mk) || policy.minPlan[mk] === 'admin') : false;
    if (adminOnly) {
      addIssue({
        code: 'PALETTE_ADMIN_ENTRY', severity: 'P3', path: c.path, source_path: palette.source_path,
        detail: `Command Palette 에 admin 전용 명령(${mk}) 포함 — 런타임 hasMenuAccess 필터로 차단되지만 정의 자체가 admin 메뉴를 회원 팔레트에 섞는다.`,
      });
    }
  }
  addIssue({
    code: 'PALETTE_COVERAGE', severity: 'P3', path: '(command palette)', source_path: palette.source_path,
    detail: `팔레트 명령 ${palette.items.length}개 중 사이드바 정본과 일치 ${paletteCovered}개. ` +
            `사이드바 회원 메뉴 ${sidebarMemberPaths.size}개 대비 커버리지 ${(paletteCovered / sidebarMemberPaths.size * 100).toFixed(0)}% — ` +
            `팔레트가 manifest 를 참조하지 않고 하드코딩이라 메뉴 추가 시 자동 반영되지 않는다(구조적 드리프트).`,
  });

  /* ── C10. 모바일 커버리지 — 데스크톱 메뉴 대비 도달 불가 그룹 ─────────── */
  const mobileReach = new Set();
  for (const tab of mobile.tabs) { mobileReach.add(tab.path); for (const m of tab.match || []) mobileReach.add(m); }
  const mobileMissing = [...sidebarMemberPaths].filter(p => !mobileReach.has(p));
  if (mobileMissing.length) {
    addIssue({
      code: 'MOBILE_COVERAGE_GAP', severity: 'P3', path: `(${mobileMissing.length} paths)`, source_path: mobile.source_path,
      detail: `모바일 하단 탭의 to/match 어디에도 없는 회원 메뉴 ${mobileMissing.length}개: ${mobileMissing.slice(0, 12).join(', ')}${mobileMissing.length > 12 ? ' …' : ''}. ` +
              `(사이드바 자체는 모바일에서도 열리므로 완전 차단은 아니며, 하단 탭 활성표시/바로가기에서 누락된다.)`,
    });
  }
  // 모바일 탭에는 플랜/권한 필터가 전혀 없다
  const mobileSrc = stripComments(readSource('frontend/src/components/MobileBottomNav.jsx'));
  if (!/hasMenuAccess|pathToMenuKey|isVisible/.test(mobileSrc)) {
    addIssue({
      code: 'MOBILE_NO_PERMISSION_FILTER', severity: 'P2', path: '(mobile bottom nav)', source_path: mobile.source_path,
      detail: `모바일 하단 탭이 hasMenuAccess/pathToMenuKey 를 전혀 쓰지 않는다 → 플랜/역할과 무관하게 5개 탭 고정 노출. ` +
              `탭 진입 자체는 MenuAccessGuard 가 PlanGate 로 막지만, 사용자에겐 "쓸 수 없는 탭"이 계속 보인다(사이드바와 노출 규칙 불일치).`,
    });
  }

  /* ── C11. 사이드바 가시성 오버레이 ↔ 백엔드 API 실재 ────────────────── */
  if (OPT.checkRoutes) {
    for (const ep of ['GET /v425/menu-tree', 'GET /v425/admin/menu-tree']) {
      if (!backend.routes.has(ep)) {
        addIssue({
          code: 'PHANTOM_MENU_API', severity: 'P1', path: ep, source_path: backend.source_path,
          detail: `MenuVisibilityContext 가 호출하는 엔드포인트가 routes.php \$custom 에 없다 → nginx SPA 폴백으로 200 HTML 을 받아 무음 실패.`,
        });
      }
    }
  }

  /* ── C12. 사이드바 라벨 사전(SIDEBAR_DICT) 15개국 커버리지 ─────────────── */
  let dictReport = null;
  if (OPT.checkI18n) {
    const keys = [...new Set(manifest.items.map(i => i.label_key).filter(Boolean))];
    dictReport = scanSidebarDict(keys);
    if (dictReport) {
      for (const [lang, miss] of Object.entries(dictReport.missingByLang)) {
        addIssue({
          code: 'MISSING_SIDEBAR_LABEL', severity: 'P3', path: `SIDEBAR_DICT.${lang}`, source_path: dictReport.source_path,
          detail: `사이드바 라벨 사전에 ${miss.length}건 미등록 → 해당 언어에서 라벨이 키 말단 문자열(영문 식별자)로 폴백: ${miss.slice(0, 8).join(', ')}${miss.length > 8 ? ' …' : ''}`,
        });
      }
    }
  }

  /* ── C13. Context Navigation — 컨텍스트가 URL 에 실리는가 vs 암묵 상태인가 ── */
  const contextCarriers = {
    tenant: { in_url: false, storage: 'localStorage.tenantId', header: 'X-Tenant-ID (services/apiClient.js)', switcher: null },
    organization: { in_url: false, storage: null, note: '조직=tenant 로 매핑(CWIS Part002) — 별도 축 없음' },
    workspace: { in_url: false, storage: 'backend WorkspaceState(KV, tenant 스코프)', switcher: null },
    project: { in_url: true, storage: null, route_pattern: '/pm/projects/:id' },
  };
  const projectScopedRoutes = spa.routes.filter(r => /^\/pm\/projects\/:id/.test(r.path)).length;
  contextCarriers.project.route_count = projectScopedRoutes;

  if (!contextCarriers.tenant.in_url) {
    addIssue({
      code: 'CONTEXT_NOT_IN_URL', severity: 'P2', path: '(tenant context)', source_path: 'frontend/src/services/apiClient.js',
      detail: `테넌트 컨텍스트가 URL 이 아니라 localStorage.tenantId(디바이스 전역)에만 있다 → ` +
              `① 같은 브라우저 다른 탭에서 테넌트를 바꾸면 두 탭이 같은 컨텍스트를 공유(탭 간 충돌), ` +
              `② 공유된 딥링크가 수신자의 현재 테넌트로 해석된다(URL 자체는 테넌트 무자격). ` +
              `서버측 격리는 유지되므로 데이터 유출은 아니나, 화면이 조용히 다른 테넌트를 가리킬 수 있다.`,
    });
  }
  if (!contextCarriers.workspace.in_url) {
    addIssue({
      code: 'NO_WORKSPACE_CONTEXT', severity: 'P3', path: '(workspace context)', source_path: 'backend/src/Handlers/WorkspaceState.php',
      detail: `워크스페이스 전환 UI·URL 컨텍스트가 존재하지 않는다(워크스페이스=테넌트 단일 KV). ` +
              `Part004-03 Workspace Switcher 는 "기존 전환기 확장"이 아니라 신규 축 도입 — 도입 전 워크스페이스 1급 엔티티 여부 결정 필요.`,
    });
  }

  /* ── C14. 사용자 내비게이션 설정 저장소 인벤토리 ───────────────────────── */
  const prefStores = [
    { key: 'g_sidebar_favs', purpose: '사이드바 즐겨찾기', where: 'localStorage', tenant_scoped: false, file: 'frontend/src/layout/Sidebar.jsx' },
    { key: 'g_sidebar_recents', purpose: '최근 방문(경로만)', where: 'localStorage', tenant_scoped: false, file: 'frontend/src/layout/Sidebar.jsx' },
    { key: 'g_user_menu_visibility', purpose: '개인 메뉴 숨김', where: 'localStorage', tenant_scoped: false, file: 'frontend/src/context/MenuVisibilityContext.jsx' },
    { key: 'g_admin_menu_tree_cache', purpose: 'admin 메뉴 가시성 캐시(TTL 5분)', where: 'localStorage', tenant_scoped: false, file: 'frontend/src/context/MenuVisibilityContext.jsx' },
    { key: 'menu_tree', purpose: '전역 메뉴 가시성/필수역할/필수플랜', where: 'MySQL (AdminMenu.php)', tenant_scoped: false, file: 'backend/src/Handlers/AdminMenu.php' },
  ];
  addIssue({
    code: 'PREFS_DEVICE_LOCAL', severity: 'P3', path: '(user navigation preferences)', source_path: 'frontend/src/layout/Sidebar.jsx',
    detail: `즐겨찾기·최근항목·개인 메뉴 숨김이 전부 localStorage(디바이스 로컬)에만 있고 서버 영속이 없다 → ` +
            `기기/브라우저를 바꾸면 초기화되고 계정 간 이동도 안 된다. ` +
            `★단 tenantStorage.js 는 "UI 프리퍼런스는 디바이스 단위라 스코프 불요"를 명시적 설계로 문서화하고 있고 ` +
            `저장값이 경로 문자열뿐이라 **테넌트 격리 위반은 아니다**(결함 아님 — Part004-04 서버 영속 설계 시의 전제).`,
  });

  /* ── C15. 접근성(WCAG 2.2 AA) 정적 검사 — 내비게이션 한정 ────────────────
   *   ★정적으로 확정 가능한 것만 본다(대비비·스크린리더 실동작은 정적분석 불가 → 보고서에 한계 명시).
   */
  const a11ySources = {
    sidebar: 'frontend/src/layout/Sidebar.jsx',
    mobile: 'frontend/src/components/MobileBottomNav.jsx',
    palette: 'frontend/src/components/CommandPalette.jsx',
    app: 'frontend/src/App.jsx',
  };
  const a11y = {};
  for (const [k, rel] of Object.entries(a11ySources)) a11y[k] = stripComments(readSource(rel));

  // A11Y-1. Skip Link(WCAG 2.4.1 Bypass Blocks) — 저장소 전역 부재 여부
  const hasSkipLink = Object.values(a11y).some(s => /skip[-_]?(to|link|nav)/i.test(s));
  if (!hasSkipLink) {
    addIssue({
      code: 'A11Y_NO_SKIP_LINK', severity: 'P3', path: '(global)', source_path: a11ySources.app,
      detail: `Skip Link(본문 바로가기)가 없다 → 키보드 사용자가 매 페이지마다 사이드바 ${manifest.items.length}개 링크를 Tab 으로 통과해야 본문에 도달한다(WCAG 2.4.1 Bypass Blocks 미충족).`,
    });
  }

  // A11Y-2. 내비게이션 랜드마크(WCAG 1.3.1) — <nav> 또는 role="navigation"
  if (!/<nav[\s>]|role=["']navigation["']/.test(a11y.sidebar)) {
    addIssue({
      code: 'A11Y_NO_NAV_LANDMARK', severity: 'P3', path: '(desktop sidebar)', source_path: a11ySources.sidebar,
      detail: `데스크톱 사이드바가 <nav> 랜드마크도 role="navigation" 도 쓰지 않는다(div 구조) → 스크린리더의 랜드마크 점프로 주 내비게이션을 찾을 수 없다. ` +
              `(섹션 단위 aria-expanded/aria-controls/role="region" 은 이미 적용되어 있어 아코디언 자체는 양호. 모바일 하단 탭은 role="navigation" 보유.)`,
    });
  }

  // A11Y-3. 모달 다이얼로그 시맨틱 — Command Palette
  const paletteA11y = {
    dialog: /role=["']dialog["']/.test(a11y.palette),
    ariaModal: /aria-modal/.test(a11y.palette),
    label: /aria-label|aria-labelledby/.test(a11y.palette),
    escape: /['"]Escape['"]/.test(a11y.palette),
    arrowKeys: /ArrowDown/.test(a11y.palette),
    activedescendant: /aria-activedescendant/.test(a11y.palette),
  };
  const paletteMissing = Object.entries(paletteA11y).filter(([, v]) => !v).map(([k]) => k);
  if (paletteMissing.length) {
    addIssue({
      code: 'A11Y_DIALOG_SEMANTICS', severity: 'P3', path: '(command palette)', source_path: a11ySources.palette,
      detail: `Ctrl+K 팔레트가 오버레이 모달인데 다이얼로그 시맨틱이 누락: ${paletteMissing.join(', ')}. ` +
              `포커스 트랩도 없어 Tab 이 배경 페이지로 빠진다. (Escape/방향키 조작은 구현되어 있다: escape=${paletteA11y.escape}, arrowKeys=${paletteA11y.arrowKeys})`,
    });
  }

  // A11Y-4. 단축키 충돌 — 같은 조합을 두 컴포넌트가 각각 preventDefault
  const shortcutOwners = [];
  for (const [name, rel] of [['CommandPalette', a11ySources.palette], ['KeyboardShortcuts', 'frontend/src/components/KeyboardShortcuts.jsx']]) {
    const s = stripComments(readSource(rel));
    if (/(ctrlKey|metaKey)[\s\S]{0,80}?key\s*===\s*['"]k['"]/.test(s)) shortcutOwners.push(name);
  }
  if (shortcutOwners.length > 1) {
    addIssue({
      code: 'SHORTCUT_CONFLICT', severity: 'P3', path: 'Ctrl/Cmd+K', source_path: 'frontend/src/components/KeyboardShortcuts.jsx',
      detail: `Ctrl+K 를 ${shortcutOwners.join(' / ')} 가 각각 window 리스너로 가로채고 둘 다 preventDefault 한다 → 동작이 등록 순서에 의존. ` +
              `게다가 KeyboardShortcuts 가 포커스를 옮기려는 [data-search-input] 요소는 저장소에 존재하지 않는다(팬텀 타깃). 단축키 소유권 일원화 필요.`,
    });
  }

  // A11Y-5. 미장착 내비게이션 컴포넌트 — 정의는 있으나 어디에도 마운트되지 않음
  const mountedSomewhere = (componentName) => {
    let found = false;
    const walk = (dir) => {
      if (found) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (found) return;
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) { if (!['node_modules', 'i18n', 'locales_backup'].includes(e.name)) walk(abs); continue; }
        if (!/\.(jsx?|mjs)$/.test(e.name)) continue;
        if (path.basename(e.name, path.extname(e.name)) === componentName) continue; // 자기 자신 제외
        if (new RegExp(`\\b${componentName}\\b`).test(stripComments(fs.readFileSync(abs, 'utf8')))) found = true;
      }
    };
    walk(SRC);
    return found;
  };
  for (const comp of ['GlobalSearch']) {
    const file = path.join(SRC, 'components', `${comp}.jsx`);
    if (fs.existsSync(file) && !mountedSomewhere(comp)) {
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      const entries = (src.match(/\bto:\s*["']\//g) || []).length;
      addIssue({
        code: 'ORPHAN_NAV_COMPONENT', severity: 'P3', path: `components/${comp}.jsx`, source_path: `frontend/src/components/${comp}.jsx`,
        detail: `${comp} 컴포넌트가 어디에서도 import/마운트되지 않는다(사장된 코드). 내부에 ${entries}개 경로의 **네 번째 하드코딩 메뉴 인덱스**를 들고 있어 ` +
                `Part004-06(통합 검색) 착수 시 '신규 구현'이 아니라 '기존 자산 재활성화 또는 폐기' 판단이 먼저다.`,
      });
    }
  }

  /* ── 인벤토리 조립 ──────────────────────────────────────────────────────── */
  const statusOf = (item) => {
    if (!isRoute(item.path)) return 'DEAD_LINK';
    const r = routeByPath.get(item.path);
    if (r.redirect_to) return 'LEGACY';
    const mk = pathToMenuKey(item.path);
    if (mk && (manifest.adminOnlyKeys.has(mk) || policy.minPlan[mk] === 'admin')) return 'HIDDEN_BY_PERMISSION';
    return 'ACTIVE';
  };

  const inventory = manifest.items.map(i => {
    const r = routeByPath.get(i.path) || null;
    const mk = pathToMenuKey(i.path);
    return {
      menu_key: i.menu_key,
      label_key: i.label_key,
      label_literal: i.label_literal,
      parent_key: i.parent_key,
      audience: i.audience,
      icon: i.icon,
      path: i.path,
      route_exists: !!r,
      component: r?.component || null,
      component_spec: r?.component_spec || null,
      guards: r?.guards || [],
      redirect_to: r?.redirect_to || null,
      access_key: i.access_key,
      resolved_menu_key: mk,
      required_plan: mk ? (policy.minPlan[mk] || policy.defaultMinPlan) : null,
      admin_only: mk ? (manifest.adminOnlyKeys.has(mk) || policy.minPlan[mk] === 'admin') : false,
      tenant_scoped: true,          // 전 인증 라우트는 X-Tenant-ID 미들웨어 스코프(index.php)
      workspace_scoped: false,      // 워크스페이스 컨텍스트는 URL/라우트에 부재(Part004-03 대상)
      project_scoped: /^\/pm\/projects\//.test(i.path),
      in_command_palette: palette.items.some(c => c.path === i.path),
      in_mobile_nav: mobileReach.has(i.path),
      source_type: i.source_type,
      source_path: i.source_path,
      source_symbol: i.source_symbol,
      status: statusOf(i),
    };
  });

  const routeInventory = spa.routes.map(r => ({
    path: r.path,
    scope: r.scope,
    component: r.component,
    component_spec: r.component_spec,
    component_exists: r.component_spec ? [r.component_spec].some(s => {
      const b = path.resolve(SRC, s);
      return [b, `${b}.jsx`, `${b}.js`].some(c => fs.existsSync(c));
    }) : null,
    redirect_to: r.redirect_to,
    guards: r.guards,
    dev_only: r.dev_only,
    resolved_menu_key: pathToMenuKey(r.path),
    in_sidebar: menuPaths.has(r.path),
    in_app_links: inAppLinks.has(r.path) ? [...inAppLinks.get(r.path)] : [],
    line: r.line,
  }));

  issues.sort((a, b) => (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || a.code.localeCompare(b.code) || String(a.path).localeCompare(String(b.path)));

  const counts = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const i of issues) counts[i.severity]++;

  return {
    meta: {
      analyzer: 'tools/navigation_analyze.mjs',
      spec: 'CWIS Part004-01',
      generated_by: 'static analysis (no source execution)',
      sources: [manifest.source_path, spa.source_path, palette.source_path, mobile.source_path, policy.source_path, backend.source_path],
    },
    metrics: {
      navigation_items_discovered: manifest.items.length,
      sidebar_member_items: manifest.items.filter(i => i.audience === 'MEMBER').length,
      sidebar_admin_items: manifest.items.filter(i => i.audience === 'ADMIN').length,
      routes_total: spa.routes.length,
      routes_authenticated: spa.routes.filter(r => r.scope === 'AUTHENTICATED').length,
      routes_public: spa.routes.filter(r => r.scope === 'PUBLIC').length,
      routes_redirect: spa.routes.filter(r => r.redirect_to).length,
      command_palette_items: palette.items.length,
      mobile_tabs: mobile.tabs.length,
      navigation_dead_links_total: issues.filter(i => i.code === 'DEAD_LINK').length,
      navigation_duplicates_total: issues.filter(i => i.code.startsWith('DUPLICAT')).length,
      navigation_permission_mismatches_total: issues.filter(i => ['PLAN_GATE_GAP', 'ADMIN_ROUTE_UNGUARDED', 'ADMIN_KEY_MISSING', 'MOBILE_NO_PERMISSION_FILTER'].includes(i.code)).length,
      navigation_unreachable_total: issues.filter(i => i.code === 'UNREACHABLE_PAGE').length,
      issues_by_severity: counts,
    },
    trees: manifest.trees,
    inventory,
    routes: routeInventory,
    issues,
    context: contextCarriers,
    preference_stores: prefStores,
    sidebar_dict: dictReport,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. 리포트 생성
 * ──────────────────────────────────────────────────────────────────────────── */
function toMarkdown(rep) {
  const L = [];
  L.push('# CWIS Part004-01 — Navigation Analysis (자동 생성)');
  L.push('');
  L.push('> 생성기: `tools/navigation_analyze.mjs` — 정적 분석(소스 미실행). 수정 시 재실행으로 갱신.');
  L.push('');
  L.push('## 1. 지표');
  L.push('');
  L.push('| 항목 | 값 |');
  L.push('|---|---|');
  for (const [k, v] of Object.entries(rep.metrics)) {
    if (k === 'issues_by_severity') continue;
    L.push(`| ${k} | ${v} |`);
  }
  const c = rep.metrics.issues_by_severity;
  L.push(`| issues | P0=${c.P0} · P1=${c.P1} · P2=${c.P2} · P3=${c.P3} · P4=${c.P4} |`);
  L.push('');
  L.push('## 2. 메뉴 트리');
  for (const [aud, tree] of Object.entries(rep.trees)) {
    L.push('');
    L.push(`### ${aud}`);
    L.push('');
    for (const sec of tree) {
      L.push(`- **${sec.key}** (${sec.label_key})`);
      for (const p of sec.items) {
        const inv = rep.inventory.find(i => i.path === p && i.parent_key === sec.key);
        L.push(`  - \`${p}\` — ${inv?.label_key || ''} · plan=${inv?.required_plan || '-'} · status=${inv?.status}`);
      }
    }
  }
  L.push('');
  L.push('## 3. 이슈 (심각도순)');
  L.push('');
  L.push('| 심각도 | 코드 | 대상 | 내용 |');
  L.push('|---|---|---|---|');
  for (const i of rep.issues) {
    L.push(`| ${i.severity} | ${i.code} | \`${i.path}\` | ${i.detail.replace(/\|/g, '\\|')} |`);
  }
  L.push('');
  return L.join('\n');
}

function main() {
  const rep = analyze();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const write = (name, data) => {
    const abs = path.join(OUT_DIR, name);
    fs.writeFileSync(abs, data, 'utf8');
    log(`[nav-analyze] 생성: ${path.relative(ROOT, abs).replace(/\\/g, '/')}`);
  };

  if (OPT.format === 'json' || OPT.format === 'both') {
    write('part004-01-navigation-inventory.json', JSON.stringify({ meta: rep.meta, metrics: rep.metrics, trees: rep.trees, inventory: rep.inventory }, null, 2));
    write('part004-01-route-integrity.json', JSON.stringify({ meta: rep.meta, routes: rep.routes }, null, 2));
    write('part004-01-permission-visibility-gaps.json', JSON.stringify({
      meta: rep.meta,
      gaps: rep.issues.filter(i => ['PLAN_GATE_GAP', 'ADMIN_ROUTE_UNGUARDED', 'ADMIN_KEY_MISSING', 'MOBILE_NO_PERMISSION_FILTER', 'PALETTE_ADMIN_ENTRY', 'UNDECLARED_ACCESS_KEY'].includes(i.code)),
    }, null, 2));
    write('part004-01-issues.json', JSON.stringify({ meta: rep.meta, metrics: rep.metrics, issues: rep.issues }, null, 2));
    write('part004-01-context-and-preferences.json', JSON.stringify({ meta: rep.meta, context: rep.context, preference_stores: rep.preference_stores, sidebar_dict: rep.sidebar_dict }, null, 2));
  }
  if (OPT.format === 'md' || OPT.format === 'both') {
    write('part004-01-navigation-analysis.md', toMarkdown(rep));
  }

  if (OPT.snapshot) {
    // 백엔드가 배포와 함께 실어 나르는 읽기 전용 스냅샷(전체 인벤토리 제외 — 관리자 요약용).
    // ★소스 리비전은 git 명령 실행 없이 .git/HEAD 만 읽어 얻는다(자식 프로세스 미사용 원칙 유지).
    let rev = null;
    try {
      const head = fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim();
      rev = head.startsWith('ref: ')
        ? fs.readFileSync(path.join(ROOT, '.git', head.slice(5)), 'utf8').trim().slice(0, 12)
        : head.slice(0, 12);
    } catch { /* git 메타 부재(배포 tarball 등) — null 로 정직 표기 */ }
    const snapDir = safeOutputDir(path.join('backend', 'data'));
    fs.mkdirSync(snapDir, { recursive: true });
    const snapPath = path.join(snapDir, 'cwis_navigation_analysis.json');
    fs.writeFileSync(snapPath, JSON.stringify({
      generated_at: new Date().toISOString(),
      source_revision: rev,
      metrics: rep.metrics,
      context: rep.context,
      preference_stores: rep.preference_stores,
      issues: rep.issues,
    }, null, 2), 'utf8');
    log(`[nav-analyze] 생성: ${path.relative(ROOT, snapPath).replace(/\\/g, '/')}`);
  }

  const c = rep.metrics.issues_by_severity;
  log(`[nav-analyze] 메뉴 ${rep.metrics.navigation_items_discovered}개 · 라우트 ${rep.metrics.routes_total}개 · 이슈 P0=${c.P0} P1=${c.P1} P2=${c.P2} P3=${c.P3} P4=${c.P4}`);

  if (OPT.failOn !== 'NONE' && SEVERITY_RANK[OPT.failOn] !== undefined) {
    const bad = rep.issues.filter(i => SEVERITY_RANK[i.severity] <= SEVERITY_RANK[OPT.failOn]);
    if (bad.length) {
      console.error(`[nav-analyze] ${OPT.failOn} 이상 이슈 ${bad.length}건 — 실패 처리`);
      for (const b of bad.slice(0, 20)) console.error(`  ${b.severity} ${b.code} ${b.path}`);
      process.exit(1);
    }
  }
  process.exit(0);
}

/* 직접 실행 시에만 리포트를 생성한다(테스트가 import 할 때는 부작용 없음). */
const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();

export {
  stripComments, balanced, prop,
  scanSidebarManifest, scanSpaRoutes, scanCommandPalette, scanMobileNav, scanPlanPolicy,
  scanBackendRoutes, scanSidebarDict, detectComponentRedirect,
  makePathToMenuKey, analyze, safeOutputDir,
  SEVERITY_RANK, INTENTIONAL_UNGATED, EXTERNAL_ENTRY, ROOT,
};
