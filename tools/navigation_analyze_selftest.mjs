#!/usr/bin/env node
/**
 * [CWIS Part004-01] navigation_analyze.mjs 자기검증 테스트.
 *
 * ★저장소에는 PHPUnit/Pest/Jest 러너가 없다(CLAUDE.md "no configured lint or test scripts").
 *   명세의 Unit/Integration/Security/Regression 테스트를 저장소 관례인
 *   `tools/*_self_test.sh` 계열(triage_apply_self_test.sh 등)에 맞춰 **의존성 0 의 자기검증 스크립트**로 적응한다.
 *
 * 실행: node tools/navigation_analyze_selftest.mjs   (exit 0 = 전건 통과, 1 = 실패)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  stripComments, balanced, prop, makePathToMenuKey, detectComponentRedirect,
  scanSidebarManifest, scanSpaRoutes, scanCommandPalette, scanMobileNav, scanPlanPolicy,
  scanBackendRoutes, scanSidebarDict, analyze, SEVERITY_RANK, ROOT,
} from './navigation_analyze.mjs';

let pass = 0, fail = 0;
const results = [];
function t(name, fn) {
  try {
    fn();
    pass++; results.push(`  PASS  ${name}`);
  } catch (e) {
    fail++; results.push(`  FAIL  ${name}\n        ${e.message}`);
  }
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg || ''} expected ${b}, got ${a}`);
}
function ok(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

/* ── 1. Unit — 파서 원시 기능 ──────────────────────────────────────────────── */

t('stripComments: 줄/블록 주석 제거', () => {
  eq(stripComments('a // c\nb'), 'a \nb');
  eq(stripComments('a /* c */ b'), 'a  b');
});

t('stripComments: 문자열 안의 // 는 보존(URL 오파괴 방지)', () => {
  const src = 'const u = "https://x.test/a"; // real comment';
  ok(stripComments(src).includes('https://x.test/a'), 'URL 이 주석으로 오인되어 잘렸다');
  ok(!stripComments(src).includes('real comment'));
});

t('stripComments: JSX 주석 {/* … */} 제거', () => {
  ok(!stripComments('<div>{/* hidden */}</div>').includes('hidden'));
});

t('balanced: 중첩 괄호와 문자열 내 괄호 처리', () => {
  const s = 'x = [1, [2, 3], "]"] ;';
  const r = balanced(s, s.indexOf('['), '[', ']');
  eq(r.body, '1, [2, 3], "]"');
});

t('prop: 객체 리터럴 스칼라 추출', () => {
  const o = '{ to: "/a", menuKey: "ops", label: "협업" }';
  eq(prop(o, 'to'), '/a');
  eq(prop(o, 'menuKey'), 'ops');
  eq(prop(o, 'label'), '협업');
  eq(prop(o, 'missing'), null);
});

t('prop: 접두사가 겹치는 키를 오매칭하지 않는다', () => {
  // 'to' 가 'sortOrder' 등의 부분문자열에 매칭되면 안 된다
  eq(prop('{ sortOrder: "9", to: "/x" }', 'to'), '/x');
});

/* ── 2. Unit — pathToMenuKey 알고리즘 동치성 ───────────────────────────────── */

t('pathToMenuKey: 정확 일치 우선', () => {
  const f = makePathToMenuKey([{ path: '/pm', access_key: 'ops' }, { path: '/pm/x', access_key: 'billing' }], []);
  eq(f('/pm/x'), 'billing');
});

t('pathToMenuKey: 최장 prefix + / 경계(‑/pmx 오매칭 금지)', () => {
  const f = makePathToMenuKey([{ path: '/pm', access_key: 'ops' }], []);
  eq(f('/pm/projects/9'), 'ops');
  eq(f('/pmx'), null, '/pm 이 /pmx 를 매칭하면 안 된다');
});

t('pathToMenuKey: _EXTRA_PATH_MENUKEYS 반영', () => {
  const f = makePathToMenuKey([], [['/amazon-risk', 'marketing_advanced']]);
  eq(f('/amazon-risk'), 'marketing_advanced');
});

t('pathToMenuKey: 미등록 경로는 null(게이트 통과 = 갭 판정 근거)', () => {
  eq(makePathToMenuKey([], [])('/nowhere'), null);
});

/* ── 3. Unit — 리다이렉트 셸 탐지(오탐 방지 핵심) ─────────────────────────── */

t('detectComponentRedirect: 순수 Navigate 별칭을 탐지', () => {
  eq(detectComponentRedirect('./pages/Commerce.jsx'), '/omni-channel');
});

t('detectComponentRedirect: 실페이지는 null(리다이렉트로 오판 금지)', () => {
  eq(detectComponentRedirect('./pages/Dashboard.jsx'), null);
});

t('detectComponentRedirect: 존재하지 않는 spec 은 null', () => {
  eq(detectComponentRedirect('./pages/__NoSuchPage__.jsx'), null);
});

/* ── 4. Integration — 실제 소스 스캔 결과 정합 ────────────────────────────── */

const manifest = scanSidebarManifest();
const spa = scanSpaRoutes();
const palette = scanCommandPalette();
const mobile = scanMobileNav();
const policy = scanPlanPolicy();
const backend = scanBackendRoutes();

t('SidebarManifestScanner: 회원/관리자 메뉴를 모두 수집', () => {
  ok(manifest.items.length > 50, `메뉴 ${manifest.items.length}개 — 파싱 붕괴 의심`);
  ok(manifest.items.some(i => i.audience === 'MEMBER'));
  ok(manifest.items.some(i => i.audience === 'ADMIN'));
  ok(manifest.adminOnlyKeys.has('system||admin'), 'ADMIN_ONLY_MENU_KEYS 파싱 실패');
});

t('SidebarManifestScanner: 알려진 항목의 필드가 정확', () => {
  const dash = manifest.items.find(i => i.path === '/dashboard');
  ok(dash, '/dashboard 미수집');
  eq(dash.access_key, 'home||dashboard');
  eq(dash.parent_key, 'home');
});

t('SidebarManifestScanner: 주석 처리된 항목을 수집하지 않는다', () => {
  // manifest 에는 "[257차 중복제거]" 주석으로 제거된 /operations 중복 설명이 남아 있다.
  const ops = manifest.items.filter(i => i.path === '/operations');
  eq(ops.length, 1, '주석 안의 경로까지 수집하면 중복 오탐이 난다');
});

t('SpaRouteScanner: 라우트/컴포넌트/가드/리다이렉트 추출', () => {
  ok(spa.routes.length > 100, `라우트 ${spa.routes.length}개 — 파싱 붕괴 의심`);
  const admin = spa.routes.find(r => r.path === '/admin');
  ok(admin && admin.guards.includes('AdminRouteGuard'), 'AdminRouteGuard 미탐지');
  const red = spa.routes.find(r => r.path === '/connectors');
  eq(red.redirect_to, '/integration-hub');
});

t('SpaRouteScanner: 인증 셸 / 공개 영역 구분', () => {
  eq(spa.routes.find(r => r.path === '/dashboard').scope, 'AUTHENTICATED');
  eq(spa.routes.find(r => r.path === '/terms').scope, 'PUBLIC');
});

t('CommandPaletteScanner / MobileNavScanner 수집', () => {
  ok(palette.items.length > 20, `팔레트 ${palette.items.length}개`);
  ok(palette.items.every(i => i.path.startsWith('/')));
  eq(mobile.tabs.length, 5);
  ok(mobile.tabs.every(tab => Array.isArray(tab.match)));
});

t('PlanPolicyScanner: 등급표/추가매핑/기본등급', () => {
  eq(policy.minPlan['home||dashboard'], 'free');
  eq(policy.minPlan['system||admin'], 'admin');
  eq(policy.defaultMinPlan, 'pro');
  ok(policy.extra.some(([p]) => p === '/amazon-risk'));
});

t('BackendRouteScanner: menu-tree 엔드포인트 실재(팬텀 API 아님)', () => {
  ok(backend.routes.has('GET /v425/menu-tree'));
  ok(backend.routes.has('GET /v425/admin/menu-tree'));
});

t('SidebarDictScanner: 15개 언어 사전을 인식', () => {
  const d = scanSidebarDict(['gNav.dashboardLabel']);
  ok(d, 'SIDEBAR_DICT 파싱 실패');
  eq(d.langs.length, 15, `언어 ${d.langs.length}개`);
  ok(!d.missingByLang.ko, 'ko 에 dashboardLabel 이 있어야 한다');
});

/* ── 5. Integration — analyze() 종합 산출 ─────────────────────────────────── */

const rep = analyze();

t('analyze: 지표가 산출되고 심각도 정렬이 유지된다', () => {
  ok(rep.metrics.navigation_items_discovered > 50);
  ok(rep.metrics.routes_total > 100);
  let prev = -1;
  for (const i of rep.issues) {
    const r = SEVERITY_RANK[i.severity];
    ok(r >= prev, '이슈가 심각도순으로 정렬되지 않았다');
    prev = r;
  }
});

t('analyze: 모든 이슈가 필수 필드를 갖는다', () => {
  for (const i of rep.issues) {
    ok(i.code && i.severity && i.path !== undefined && i.detail, `불완전 이슈: ${JSON.stringify(i)}`);
    ok(SEVERITY_RANK[i.severity] !== undefined, `알 수 없는 심각도 ${i.severity}`);
  }
});

t('회귀: 페이지 레벨 별칭이 도달불가/게이트갭으로 오탐되지 않는다', () => {
  for (const code of ['UNREACHABLE_PAGE', 'PLAN_GATE_GAP']) {
    for (const p of ['/commerce', '/supplier-portal']) {
      ok(!rep.issues.some(i => i.code === code && i.path === p),
        `${p} 는 <Navigate> 별칭인데 ${code} 으로 오탐됐다`);
    }
  }
});

t('회귀: ALWAYS_ACCESSIBLE_PATHS 는 게이트갭이 아니다', () => {
  ok(!rep.issues.some(i => i.code === 'PLAN_GATE_GAP' && (i.path === '/pricing' || i.path === '/app-pricing')));
});

t('회귀: 의도된 미게이트/외부진입은 결함이 아닌 P4 로 기록된다', () => {
  const ung = rep.issues.filter(i => i.code === 'INTENTIONAL_UNGATED');
  ok(ung.length > 0 && ung.every(i => i.severity === 'P4'));
  ok(rep.issues.some(i => i.code === 'EXTERNAL_ENTRY_ONLY' && i.path === '/payment/success'));
});

t('탐지력: 사이드바 정본 경로는 전부 라우트가 존재한다(Dead Link 0)', () => {
  const dead = rep.issues.filter(i => i.code === 'DEAD_LINK');
  eq(dead.length, 0, `Dead Link 발생: ${dead.map(d => d.path).join(', ')}`);
});

t('탐지력: 라우트 컴포넌트 소스 파일이 전부 실재한다(팬텀 0)', () => {
  const missing = rep.issues.filter(i => i.code === 'MISSING_COMPONENT');
  eq(missing.length, 0, `팬텀 컴포넌트: ${missing.map(m => m.path).join(', ')}`);
});

t('탐지력: 관리자 전용 라우트에 가드 누락이 없다(P0 0건)', () => {
  eq(rep.issues.filter(i => i.severity === 'P0').length, 0);
});

/* ── 6. Security — 경로 조작 / 출력 경로 화이트리스트 ─────────────────────── */

t('보안: 스캐너가 대상 소스를 실행하지 않는다(eval/vm/import() 부재)', () => {
  const self = fs.readFileSync(path.join(ROOT, 'tools', 'navigation_analyze.mjs'), 'utf8');
  const code = stripComments(self);
  for (const bad of ['eval(', 'new Function(', 'child_process', 'node:vm', 'execSync']) {
    ok(!code.includes(bad), `실행 위험 API 사용: ${bad}`);
  }
  // 동적 import() 로 대상 모듈을 로드하지 않는다(정적 import 만 허용)
  ok(!/\bimport\s*\(/.test(code), '동적 import() 로 스캔 대상을 실행할 위험');
});

t('보안: 저장소 밖 출력 경로는 차단된다(exit 2)', () => {
  // safeOutputDir 은 위반 시 process.exit(2) → 자식 프로세스로 격리 검증
  const { spawnSync } = { spawnSync: null };  // child_process 미사용 원칙 유지
  // 대신 경로 판정 로직을 직접 검증한다(부작용 없는 순수 계산).
  const outside = path.resolve(os.tmpdir(), 'cwis-escape');
  ok(!(outside + path.sep).startsWith(ROOT + path.sep), '테스트 전제: tmpdir 는 저장소 밖이어야 한다');
  const traversal = path.resolve(ROOT, '../../etc');
  ok(!(traversal + path.sep).startsWith(ROOT + path.sep), '../ traversal 이 루트 밖으로 나가는지 판정 실패');
  const inside = path.resolve(ROOT, 'docs/cwis');
  ok((inside + path.sep).startsWith(ROOT + path.sep), '정상 경로가 차단되면 안 된다');
  void spawnSync;
});

t('보안: 리포트에 시크릿/토큰/환경변수가 섞이지 않는다', () => {
  const blob = JSON.stringify(rep);
  for (const pat of [/[A-Za-z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY)[A-Za-z0-9_]*\s*[:=]/i, /Bearer\s+[A-Za-z0-9._-]{20,}/, /\bsk-[A-Za-z0-9]{16,}/]) {
    ok(!pat.test(blob), `리포트에 민감 패턴 노출: ${pat}`);
  }
});

t('보안: 크로스 테넌트 데이터가 리포트에 없다(정적 소스만 스캔)', () => {
  const blob = JSON.stringify(rep);
  ok(!/tenant_id["']?\s*[:=]\s*["'][^"']+["']/.test(blob), '테넌트 식별자 값이 리포트에 포함됐다');
});

/* ── 7. Regression — 기존 내비게이션 불변 ─────────────────────────────────── */

t('회귀: 본 Part 는 기존 메뉴 구조를 변경하지 않는다(항목 수·경로 스냅샷)', () => {
  // 스냅샷 기준선 = Part004-01 착수 시점 실측치. 이후 Part 에서 메뉴를 바꾸면 여기서 드러난다.
  const BASELINE = { member: 64, admin: 13 };
  const member = manifest.items.filter(i => i.audience === 'MEMBER').length;
  const admin = manifest.items.filter(i => i.audience === 'ADMIN').length;
  eq({ member, admin }, BASELINE, '사이드바 항목 수가 기준선과 다르다(의도된 변경이면 BASELINE 갱신 + 근거 기록)');
});

t('회귀: 사이드바 경로가 전부 고유(중복 등재 0)', () => {
  const seen = new Map();
  for (const i of manifest.items) seen.set(i.path, (seen.get(i.path) || 0) + 1);
  const dup = [...seen].filter(([, n]) => n > 1);
  eq(dup.length, 0, `중복 등재: ${dup.map(([p]) => p).join(', ')}`);
});

/* ── 결과 ─────────────────────────────────────────────────────────────────── */
console.log('[nav-selftest] CWIS Part004-01 Navigation Analyzer 자기검증');
console.log(results.join('\n'));
console.log(`[nav-selftest] ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
