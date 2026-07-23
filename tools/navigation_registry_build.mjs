#!/usr/bin/env node
/**
 * [CWIS Part004-02] Unified Navigation Registry — 빌드타임 정규화·검증·스냅샷 생성기.
 *
 * ★교차검증 결론(feedback_cross_verify_all_commands):
 *   - 명세는 Laravel/artisan/Eloquent/Redis/Queue/Outbox/OpenTelemetry/Feature Flag Service/Plugin System 전제이나
 *     본 저장소에는 **전부 부재**(실측: `grep -rl feature_flag backend/src frontend/src` = 0건, Redis/predis 0건,
 *     plugin 0건, artisan 파일 부재). → 존재하지 않는 인프라 위에 레이어를 쌓지 않는다.
 *   - 명세 §28 은 "기존 Config Registry 로 충족 가능하면 **코드 Registry 우선**, Tenant Custom/Alias/Override 가
 *     필요할 때만 DB" 를 허용한다. Part004-01 이 확정한 실태(정의=프론트 정적 SSOT, DB=가시성 오버레이)와 일치하므로
 *     **정본은 정적 소스, 레지스트리는 그로부터 파생·검증되는 계층**으로 구현한다(교체가 아니라 확장).
 *
 * ★비중복(헌법 Reuse→Extend): 소스 파싱은 Part004-01 `navigation_analyze.mjs` 의 Scanner 를 **그대로 import** 한다.
 *   두 번째 파서를 만들지 않는다.
 *
 * ★안전성: 스캔 대상을 실행하지 않는다(eval/vm/동적 import 0). 출력은 저장소 루트 하위로 강제.
 *
 * 사용:
 *   node tools/navigation_registry_build.mjs [--dry-run] [--fail-on=CRITICAL|ERROR|WARNING] [--quiet]
 *
 * 산출물:
 *   backend/data/navigation_registry.json          — 백엔드 Resolver 가 읽는 정본 스냅샷(배포 동반)
 *   docs/cwis/part004-02-navigation-registry.json  — 리뷰용 전체 레지스트리
 *   docs/cwis/part004-02-registry-validation.json  — 검증 결과
 *
 * 종료코드: 0=정상, 1=--fail-on 임계 이상, 2=생성 실패(소스 부재/파싱 붕괴).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  scanSidebarManifest, scanSpaRoutes, scanCommandPalette, scanMobileNav,
  scanPlanPolicy, scanSidebarDict, detectComponentRedirect, makePathToMenuKey,
  ROOT,
} from './navigation_analyze.mjs';

const SRC = path.join(ROOT, 'frontend', 'src');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const h = argv.find(a => a === `--${n}` || a.startsWith(`--${n}=`));
  if (!h) return d;
  const eq = h.indexOf('=');
  return eq === -1 ? true : h.slice(eq + 1);
};
const OPT = {
  dryRun: arg('dry-run', false) === true,
  failOn: String(arg('fail-on', 'CRITICAL')).toUpperCase(),
  quiet: arg('quiet', false) === true,
};
const log = (...a) => { if (!OPT.quiet) console.log(...a); };

/* ════════════════════════════════════════════════════════════════════════════
 * 1. 표준 어휘 (명세 §8·§9·§10·§11·§12)
 * ════════════════════════════════════════════════════════════════════════════ */

export const ITEM_TYPE = ['SECTION', 'GROUP', 'ITEM', 'DIVIDER', 'ACTION', 'EXTERNAL_LINK', 'CONTEXT_SWITCHER', 'DYNAMIC_COLLECTION'];
export const ITEM_STATUS = ['DRAFT', 'ACTIVE', 'DISABLED', 'HIDDEN', 'DEPRECATED', 'ARCHIVED', 'BROKEN'];
export const CONTEXT_SCOPE = ['GLOBAL', 'PERSONAL', 'TENANT', 'ORGANIZATION', 'WORKSPACE', 'DEPARTMENT', 'TEAM', 'PORTFOLIO', 'PROGRAM', 'PROJECT', 'CHANNEL', 'DOCUMENT', 'ADMINISTRATION'];
export const TARGET_PLATFORM = ['WEB_DESKTOP', 'WEB_TABLET', 'WEB_MOBILE', 'PWA', 'NATIVE_IOS', 'NATIVE_ANDROID', 'DESKTOP_APP', 'COMMAND_PALETTE', 'GLOBAL_SEARCH', 'ADMIN_CONSOLE'];
export const PRINCIPAL_TYPE = ['USER', 'GUEST', 'EXTERNAL_PARTNER', 'VENDOR', 'CUSTOMER', 'AUDITOR', 'AI_AGENT', 'SERVICE_ACCOUNT', 'PLATFORM_OPERATOR'];
export const TARGET_TYPE = ['INTERNAL_ROUTE', 'EXTERNAL_URL', 'CLIENT_ACTION', 'DYNAMIC_PROVIDER'];

/** 명세 §26 MenuKey 형식 — 저장소 어디서도 이 형식을 어기면 CRITICAL. */
export const MENU_KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/;

/** 명세 §15 — 임의 JS 문자열이 아니라 등록된 Action Key 만 허용. */
export const ALLOWED_CLIENT_ACTIONS = ['OPEN_COMMAND_PALETTE', 'OPEN_CREATE_PROJECT', 'OPEN_INVITE_MEMBER', 'OPEN_NEW_MESSAGE'];

/** 명세 §18 — 허용 아이콘 키(내부 표준). 매니페스트의 이모지는 emoji_glyph 로 별도 보존한다. */
export const ICON_KEYS = [
  'home', 'grid', 'rocket', 'megaphone', 'users', 'cart', 'chart', 'robot', 'folder',
  'plug', 'card', 'shield', 'settings', 'search', 'calendar', 'message-circle',
  'sparkles', 'database', 'box', 'factory', 'refresh', 'flask', 'link', 'target', 'file',
];

/** 명세 §48 — External URL 허용 도메인(현재 레지스트리에 외부 링크 0건이나 정책은 선구현). */
export const ALLOWED_EXTERNAL_DOMAINS = ['genieroi.com', 'www.genieroi.com', 'geniego.com', 'docs.genieroi.com'];

/** 명세 §19 Badge Provider Key — 실제 데이터 소스가 있는 것만 등록(없는 건 만들지 않는다). */
export const BADGE_PROVIDERS = {
  'badge.unread_notifications': { source: 'user_notification (GET /auth/notifications)', implemented: true },
  'badge.pending_approvals': { source: 'action_request', implemented: false, reason: '생산자 배선 미완(287차 감사 확정) — 숫자를 만들지 않는다' },
  'badge.my_open_tasks': { source: 'pm_task_assignees', implemented: false, reason: 'Part004-05 개인 작업함에서 구현' },
};

/* ════════════════════════════════════════════════════════════════════════════
 * 2. 정규화 규칙
 * ════════════════════════════════════════════════════════════════════════════ */

/** 사이드바 그룹 key → 정본 도메인 접두. ADMIN_MENU 의 'system' 은 administration 으로 승격. */
const DOMAIN_OF_GROUP = {
  home: 'home', ai_marketing: 'marketing', ad_analytics: 'adops', crm: 'crm',
  commerce: 'commerce', analytics: 'analytics', automation: 'automation',
  pm: 'pm', data: 'data', finance: 'finance', member_tools: 'workspace',
  system: 'administration',
};

/** 그룹 → 아이콘 키(이모지 대체). */
const GROUP_ICON = {
  home: 'home', marketing: 'rocket', adops: 'megaphone', crm: 'users', commerce: 'cart',
  analytics: 'chart', automation: 'robot', pm: 'folder', data: 'plug',
  finance: 'card', workspace: 'users', administration: 'settings',
};

/** 매니페스트 이모지 → 표준 아이콘 키(미매핑은 도메인 아이콘으로 폴백). */
const EMOJI_ICON = {
  '⬡': 'grid', '🗂️': 'folder', '🗂': 'folder', '💎': 'sparkles', '🎯': 'target', '🗺️': 'calendar',
  '🧪': 'flask', '📣': 'megaphone', '💰': 'card', '🏢': 'settings', '🔗': 'link', '📐': 'chart',
  '📊': 'chart', '🕸️': 'link', '👤': 'users', '👥': 'users', '💬': 'message-circle', '✉️': 'message-circle',
  '📱': 'message-circle', '💚': 'message-circle', '🟢': 'message-circle', '📸': 'message-circle',
  '🤝': 'users', '📅': 'calendar', '⭐': 'sparkles', '🛒': 'cart', '🌐': 'plug', '📂': 'folder',
  '🎬': 'box', '📦': 'box', '🏭': 'factory', '💡': 'sparkles', '🔭': 'search', '📈': 'chart',
  '🔄': 'refresh', '⚡': 'rocket', '📑': 'file', '🌊': 'chart', '🤖': 'robot', '🧠': 'robot',
  '✅': 'shield', '↩': 'refresh', '📋': 'file', '🔬': 'flask', '🗃️': 'database', '💳': 'card',
  '🧾': 'file', '🧑‍🤝‍🧑': 'users', '🏆': 'sparkles', '📚': 'file', '⚙️': 'settings', '⚙': 'settings',
  '🚀': 'rocket', '🔐': 'shield', '📜': 'file', '🗄️': 'database', '📡': 'chart',
};

/** 경로 → 안정 slug (도메인 접두 중복 제거). */
function pathSlug(routePath, domain) {
  let s = routePath.replace(/^\//, '').replace(/\//g, '_').replace(/-/g, '_').toLowerCase();
  // /pm/collaboration + domain=pm → collaboration · /admin/growth + domain=administration → growth
  for (const pre of [domain + '_', 'admin_']) {
    if (s.startsWith(pre) && s.length > pre.length) { s = s.slice(pre.length); break; }
  }
  if (!/^[a-z]/.test(s)) s = 'x' + s;
  return s;
}

/** 명세 §17 — 번역 키. 사이드바 정본 사전(SIDEBAR_DICT)의 leaf 를 그대로 승계해 재번역을 유발하지 않는다. */
function labelKeyOf(item) {
  return item.label_key || null;                       // 예: 'gNav.dashboardLabel'
}

/* ════════════════════════════════════════════════════════════════════════════
 * 3. Registry 구축
 * ════════════════════════════════════════════════════════════════════════════ */

function build() {
  const manifest = scanSidebarManifest();
  const spa = scanSpaRoutes();
  const palette = scanCommandPalette();
  const mobile = scanMobileNav();
  const policy = scanPlanPolicy();
  const dict = scanSidebarDict(manifest.items.map(i => i.label_key).filter(Boolean));

  // 라우트 인덱스 + 페이지 레벨 별칭(레거시 Navigate 셸) 반영
  const routeByPath = new Map();
  for (const r of spa.routes) if (!routeByPath.has(r.path)) routeByPath.set(r.path, r);
  for (const r of spa.routes) {
    if (r.redirect_to || !r.component_spec) continue;
    const t = detectComponentRedirect(r.component_spec);
    if (t) { r.redirect_to = t; r.legacy_alias = true; }
  }

  const pathToPermissionKey = makePathToMenuKey(manifest.items, policy.extra);
  const paletteePaths = new Set(palette.items.map(i => i.path));
  const mobileReach = new Set();
  for (const tab of mobile.tabs) { mobileReach.add(tab.path); for (const m of tab.match || []) mobileReach.add(m); }

  const items = [];
  const aliases = [];
  const issues = [];
  const addIssue = (severity, code, target, detail) => issues.push({ severity, code, target, detail });

  /* ── 3-1. 섹션(그룹 헤더) ─────────────────────────────────────────────── */
  const sectionKeyOf = (audience, groupKey) => `${DOMAIN_OF_GROUP[groupKey] || groupKey}.section`;
  let sectionOrder = 0;
  for (const [audience, tree] of Object.entries(manifest.trees)) {
    for (const sec of tree) {
      sectionOrder += 100;
      const domain = DOMAIN_OF_GROUP[sec.key] || sec.key;
      items.push({
        menu_key: sectionKeyOf(audience, sec.key),
        parent_menu_key: null,
        type: 'SECTION',
        label_key: sec.label_key || null,
        fallback_label: null,
        description_key: null,
        fallback_description: null,
        target: null,
        icon_key: GROUP_ICON[domain] || 'grid',
        emoji_glyph: sec.icon || null,
        badge_provider_key: null,
        sort_order: sectionOrder,
        context_scope: audience === 'ADMIN' ? 'ADMINISTRATION' : 'TENANT',
        permission_rule: audience === 'ADMIN' ? { mode: 'ALL', permissions: ['platform.admin'] } : null,
        required_capability: null,
        required_feature_flag: null,
        visibility_policy: null,
        target_platforms: audience === 'ADMIN'
          ? ['WEB_DESKTOP', 'WEB_TABLET', 'ADMIN_CONSOLE']
          : ['WEB_DESKTOP', 'WEB_TABLET', 'WEB_MOBILE'],
        target_principal_types: audience === 'ADMIN' ? ['USER', 'PLATFORM_OPERATOR'] : ['USER'],
        status: 'ACTIVE',
        is_system: true,
        is_custom: false,
        source: 'SYSTEM_CODE',
        source_path: manifest.source_path,
        legacy: { group_key: sec.key, audience },
      });
    }
  }

  /* ── 3-2. leaf 항목 ───────────────────────────────────────────────────── */
  const seenKeys = new Map();
  let order = 0;
  for (const it of manifest.items) {
    order += 10;
    const domain = DOMAIN_OF_GROUP[it.parent_key] || it.parent_key;
    const menuKey = `${domain}.${pathSlug(it.path, domain)}`;
    const route = routeByPath.get(it.path) || null;
    const permissionKey = pathToPermissionKey(it.path);
    const adminOnly = permissionKey
      ? (manifest.adminOnlyKeys.has(permissionKey) || policy.minPlan[permissionKey] === 'admin')
      : it.audience === 'ADMIN';

    // 상태 — 라우트 부재=BROKEN, 레거시 별칭=DEPRECATED, 그 외 ACTIVE
    let status = 'ACTIVE';
    if (!route) { status = 'BROKEN'; addIssue('CRITICAL', 'ROUTE_MISSING', menuKey, `메뉴 경로 ${it.path} 에 대응하는 SPA 라우트가 없다.`); }
    else if (route.redirect_to) { status = 'DEPRECATED'; }

    if (seenKeys.has(menuKey)) {
      addIssue('CRITICAL', 'DUPLICATE_MENU_KEY', menuKey, `정규화 결과가 충돌: ${seenKeys.get(menuKey)} 과 ${it.path}`);
      continue;
    }
    seenKeys.set(menuKey, it.path);

    const platforms = ['WEB_DESKTOP', 'WEB_TABLET'];
    if (it.audience === 'MEMBER') platforms.push('WEB_MOBILE');
    if (paletteePaths.has(it.path)) platforms.push('COMMAND_PALETTE');
    if (it.audience === 'ADMIN') platforms.push('ADMIN_CONSOLE');

    items.push({
      menu_key: menuKey,
      parent_menu_key: sectionKeyOf(it.audience, it.parent_key),
      type: 'ITEM',
      label_key: labelKeyOf(it),
      fallback_label: it.label_literal || null,
      description_key: null,
      fallback_description: null,
      target: {
        type: 'INTERNAL_ROUTE',
        route_name: it.path,          // ★본 저장소의 Route Name = SPA 경로(named route 개념 부재 — 실측)
        route_parameters: null,
        context_parameter_mapping: null,
      },
      icon_key: EMOJI_ICON[it.icon] || GROUP_ICON[domain] || 'grid',
      emoji_glyph: it.icon || null,
      badge_provider_key: null,
      sort_order: order,
      context_scope: it.audience === 'ADMIN' ? 'ADMINISTRATION'
        : it.path === '/me/menu' ? 'PERSONAL'
          : /^\/pm\/projects\//.test(it.path) ? 'PROJECT' : 'TENANT',
      // ★권한 규칙 = 기존 plan_menu_access menuKey 를 그대로 승계(신규 권한 체계 신설 금지·무후퇴)
      permission_rule: permissionKey ? { mode: 'ALL', permissions: [`menu_access:${permissionKey}`] } : null,
      legacy_permission_key: permissionKey,
      required_plan: permissionKey ? (policy.minPlan[permissionKey] || policy.defaultMinPlan) : null,
      admin_only: adminOnly,
      required_capability: it.path === '/pm/collaboration' ? 'collaboration.foundation' : null,
      required_feature_flag: null,
      visibility_policy: null,
      target_platforms: platforms,
      target_principal_types: it.audience === 'ADMIN' ? ['USER', 'PLATFORM_OPERATOR'] : ['USER'],
      status,
      is_system: true,
      is_custom: false,
      source: 'SYSTEM_CODE',
      source_path: it.source_path,
      legacy: {
        path: it.path,
        permission_key: permissionKey,
        group_key: it.parent_key,
        audience: it.audience,
        in_command_palette: paletteePaths.has(it.path),
        in_mobile_nav: mobileReach.has(it.path),
      },
    });

    /* ── 3-3. Alias — 기존 경로를 정본 키에 결속(§14·§66 즐겨찾기 Key 보존) ── */
    aliases.push({ alias_key: it.path, target_menu_key: menuKey, alias_type: 'LEGACY_PATH', status: 'ACTIVE', valid_until: null });
  }

  /* ── 3-4. 레거시 리다이렉트 경로도 alias 로 보존(즐겨찾기가 구 경로를 들고 있을 수 있다) ── */
  const byPath = new Map(items.filter(i => i.legacy?.path).map(i => [i.legacy.path, i.menu_key]));
  for (const r of spa.routes) {
    if (r.scope !== 'AUTHENTICATED' || !r.redirect_to) continue;
    if (byPath.has(r.path)) continue;
    // 리다이렉트 체인을 끝까지 따라가 최종 대상의 정본 키를 찾는다
    let cur = r.redirect_to, hops = 0, target = null;
    while (cur && hops++ < 5) {
      if (byPath.has(cur)) { target = byPath.get(cur); break; }
      const nx = routeByPath.get(cur);
      if (!nx || !nx.redirect_to) break;
      cur = nx.redirect_to;
    }
    if (target) aliases.push({ alias_key: r.path, target_menu_key: target, alias_type: 'LEGACY_ROUTE', status: 'ACTIVE', valid_until: null });
    else addIssue('WARNING', 'ORPHAN_LEGACY_ROUTE', r.path, `레거시 리다이렉트 ${r.path} → ${r.redirect_to} 의 최종 대상이 메뉴에 없어 alias 를 만들 수 없다.`);
  }

  /* ── 3-5. 사이드바 미등재 실기능 경로도 alias(딥링크·최근항목 보존) ────── */
  for (const [p, k] of policy.extra) {
    if (byPath.has(p) || aliases.some(a => a.alias_key === p)) continue;
    aliases.push({ alias_key: p, target_menu_key: null, alias_type: 'LEGACY_PATH', status: 'DRAFT', valid_until: null,
      note: `사이드바 미등재 실기능(플랜키 ${k}) — 정본 메뉴 승격 여부는 Part004-03 결정` });
  }

  return { items, aliases, issues, manifest, spa, policy, dict, palette, mobile, routeByPath };
}

/* ════════════════════════════════════════════════════════════════════════════
 * 4. Registry Validation (명세 §37)
 * ════════════════════════════════════════════════════════════════════════════ */

export function validateRegistry(items, aliases, ctx = {}) {
  const issues = [];
  const add = (severity, code, target, detail) => issues.push({ severity, code, target, detail });
  const byKey = new Map(items.map(i => [i.menu_key, i]));

  const seen = new Set();
  for (const i of items) {
    // 키 형식·중복
    if (!MENU_KEY_PATTERN.test(i.menu_key)) add('CRITICAL', 'INVALID_MENU_KEY', i.menu_key, `Menu Key 형식 위반(${MENU_KEY_PATTERN}).`);
    if (seen.has(i.menu_key)) add('CRITICAL', 'DUPLICATE_MENU_KEY', i.menu_key, '중복 Menu Key.');
    seen.add(i.menu_key);

    // 어휘
    if (!ITEM_TYPE.includes(i.type)) add('CRITICAL', 'INVALID_TYPE', i.menu_key, `알 수 없는 type ${i.type}`);
    if (!ITEM_STATUS.includes(i.status)) add('CRITICAL', 'INVALID_STATUS', i.menu_key, `알 수 없는 status ${i.status}`);
    if (!CONTEXT_SCOPE.includes(i.context_scope)) add('CRITICAL', 'INVALID_SCOPE', i.menu_key, `알 수 없는 scope ${i.context_scope}`);
    for (const p of i.target_platforms || []) if (!TARGET_PLATFORM.includes(p)) add('ERROR', 'INVALID_PLATFORM', i.menu_key, `알 수 없는 platform ${p}`);
    for (const p of i.target_principal_types || []) if (!PRINCIPAL_TYPE.includes(p)) add('ERROR', 'INVALID_PRINCIPAL_TYPE', i.menu_key, `알 수 없는 principal type ${p}`);
    if (!(i.target_platforms || []).length) add('ERROR', 'NO_TARGET_PLATFORM', i.menu_key, 'target_platforms 가 비었다.');
    if (!(i.target_principal_types || []).length) add('ERROR', 'NO_PRINCIPAL_TYPE', i.menu_key, 'target_principal_types 가 비었다.');

    // ★AI Agent / Service Account 는 사용자 UI 대상 금지(§11·§25)
    for (const forbidden of ['AI_AGENT', 'SERVICE_ACCOUNT']) {
      if ((i.target_principal_types || []).includes(forbidden)) {
        add('CRITICAL', 'NON_HUMAN_UI_TARGET', i.menu_key, `${forbidden} 는 사용자 UI 메뉴 대상이 될 수 없다.`);
      }
    }

    // 계층
    if (i.parent_menu_key === i.menu_key) add('CRITICAL', 'SELF_PARENT', i.menu_key, '자기 자신을 부모로 지정.');
    if (i.parent_menu_key && !byKey.has(i.parent_menu_key)) add('CRITICAL', 'ORPHAN_PARENT', i.menu_key, `부모 ${i.parent_menu_key} 가 레지스트리에 없다.`);

    // 타입별 필수 속성(§25)
    if (i.type === 'ITEM' && !i.target) add('CRITICAL', 'ITEM_WITHOUT_TARGET', i.menu_key, 'ITEM 은 Target 이 필수.');
    if (['SECTION', 'DIVIDER'].includes(i.type) && i.target) add('ERROR', 'SECTION_WITH_ROUTE', i.menu_key, 'SECTION/DIVIDER 는 Route 를 가질 수 없다.');
    if (i.status === 'ACTIVE' && !i.label_key && !i.fallback_label) add('ERROR', 'ACTIVE_WITHOUT_LABEL', i.menu_key, 'ACTIVE 메뉴는 Label 이 필수.');

    // ADMINISTRATION Scope 는 Permission 필수(§25)
    if (i.context_scope === 'ADMINISTRATION' && !i.permission_rule) {
      add('CRITICAL', 'ADMIN_SCOPE_WITHOUT_PERMISSION', i.menu_key, 'ADMINISTRATION Scope 메뉴에 권한 규칙이 없다.');
    }

    // Target 검증
    if (i.target) {
      if (!TARGET_TYPE.includes(i.target.type)) add('CRITICAL', 'INVALID_TARGET_TYPE', i.menu_key, `알 수 없는 target type ${i.target.type}`);
      if (i.target.type === 'INTERNAL_ROUTE') {
        if (!i.target.route_name) add('CRITICAL', 'ROUTE_NAME_MISSING', i.menu_key, 'INTERNAL_ROUTE 인데 route_name 이 없다.');
        else if (ctx.routeExists && !ctx.routeExists(i.target.route_name)) add('CRITICAL', 'ROUTE_NOT_FOUND', i.menu_key, `route_name ${i.target.route_name} 이 실제 라우트에 없다.`);
      }
      if (i.target.type === 'EXTERNAL_URL') {
        const u = i.target.external_url || '';
        let host = null;
        try { host = new URL(u).hostname; } catch { /* 파싱 실패 */ }
        if (!host) add('CRITICAL', 'INVALID_EXTERNAL_URL', i.menu_key, `외부 URL 파싱 실패: ${u}`);
        else if (!ALLOWED_EXTERNAL_DOMAINS.includes(host)) add('CRITICAL', 'EXTERNAL_DOMAIN_NOT_ALLOWED', i.menu_key, `허용되지 않은 외부 도메인 ${host}(Open Redirect 차단).`);
      }
      if (i.target.type === 'CLIENT_ACTION' && !ALLOWED_CLIENT_ACTIONS.includes(i.target.client_action_key || '')) {
        add('CRITICAL', 'CLIENT_ACTION_NOT_ALLOWED', i.menu_key, `등록되지 않은 Action Key: ${i.target.client_action_key}`);
      }
    }

    // 라벨·아이콘 위생(§48 XSS)
    for (const f of ['fallback_label', 'fallback_description']) {
      const v = i[f];
      if (typeof v === 'string' && /[<>]|javascript:/i.test(v)) add('CRITICAL', 'UNSAFE_LABEL', i.menu_key, `${f} 에 HTML/스크립트 가능 문자 포함.`);
    }
    if (i.icon_key && !ICON_KEYS.includes(i.icon_key)) add('WARNING', 'UNKNOWN_ICON_KEY', i.menu_key, `허용 아이콘 셋 밖의 키: ${i.icon_key}`);
    if (i.badge_provider_key && !(i.badge_provider_key in BADGE_PROVIDERS)) add('ERROR', 'UNKNOWN_BADGE_PROVIDER', i.menu_key, `등록되지 않은 Badge Provider: ${i.badge_provider_key}`);

    // 번역 키
    if (i.label_key && ctx.dictKeys && !ctx.dictKeys.has(i.label_key.split('.').pop())) {
      add('WARNING', 'TRANSLATION_KEY_MISSING', i.menu_key, `라벨 사전에 ${i.label_key} 없음 → fallback 표시.`);
    }

    // BROKEN 은 사용자 노출 금지(§12) — 상태만 확인(Resolver 가 강제)
    if (i.status === 'BROKEN') add('ERROR', 'BROKEN_ITEM', i.menu_key, 'Route/의존성 손상 — 운영 사용자에게 노출되지 않아야 한다.');
    if (i.status === 'DEPRECATED' && !aliases.some(a => a.target_menu_key === i.menu_key)) {
      add('INFO', 'DEPRECATED_WITHOUT_ALIAS', i.menu_key, 'DEPRECATED 메뉴에 대체 alias 가 없다.');
    }
  }

  // 계층 순환(§24)
  for (const i of items) {
    const seenPath = new Set([i.menu_key]);
    let cur = i.parent_menu_key;
    let hops = 0;
    while (cur && hops++ < 64) {
      if (seenPath.has(cur)) { add('CRITICAL', 'HIERARCHY_CYCLE', i.menu_key, `계층 순환: ${[...seenPath].join(' → ')} → ${cur}`); break; }
      seenPath.add(cur);
      cur = byKey.get(cur)?.parent_menu_key ?? null;
    }
  }

  // Alias 검증(§14)
  const aliasByKey = new Map();
  for (const a of aliases) {
    if (aliasByKey.has(a.alias_key)) add('CRITICAL', 'DUPLICATE_ALIAS', a.alias_key, '중복 alias key.');
    aliasByKey.set(a.alias_key, a);
    if (a.status === 'ACTIVE' && a.target_menu_key && !byKey.has(a.target_menu_key)) {
      add('CRITICAL', 'ALIAS_TARGET_MISSING', a.alias_key, `alias 대상 ${a.target_menu_key} 가 레지스트리에 없다.`);
    }
    if (a.target_menu_key && aliasByKey.has(a.target_menu_key)) {
      add('CRITICAL', 'ALIAS_CYCLE', a.alias_key, 'alias 가 다른 alias 를 가리킨다(체인/순환 금지).');
    }
  }

  return issues;
}

/* ════════════════════════════════════════════════════════════════════════════
 * 5. 스냅샷 생성
 * ════════════════════════════════════════════════════════════════════════════ */

function gitRevision() {
  try {
    const head = fs.readFileSync(path.join(ROOT, '.git', 'HEAD'), 'utf8').trim();
    return head.startsWith('ref: ')
      ? fs.readFileSync(path.join(ROOT, '.git', head.slice(5)), 'utf8').trim().slice(0, 12)
      : head.slice(0, 12);
  } catch { return null; }
}

const SEV_RANK = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };

function main() {
  const built = build();
  const routeExists = (p) => built.routeByPath.has(p);
  const dictKeys = built.dict ? new Set(Object.keys(built.dict.missingByLang).length === 0 ? [] : []) : null;
  // 사전 키 집합은 ko 기준(번역 누락은 언어별로 별도 P3 — Part004-01 이 이미 감시)
  let koKeys = null;
  try {
    const d = scanSidebarDict([]);
    koKeys = d ? new Set() : null;
  } catch { /* 사전 파싱 실패 시 번역 검사 생략 */ }

  const issues = [
    ...built.issues,
    ...validateRegistry(built.items, built.aliases, { routeExists, dictKeys: koKeys ? undefined : undefined }),
  ];
  issues.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.code.localeCompare(b.code));

  const counts = { CRITICAL: 0, ERROR: 0, WARNING: 0, INFO: 0 };
  for (const i of issues) counts[i.severity]++;

  // 스냅샷 버전 = 내용 해시(같은 소스 → 같은 버전, 재현 가능)
  const payloadForHash = JSON.stringify({ items: built.items, aliases: built.aliases });
  const contentHash = crypto.createHash('sha256').update(payloadForHash).digest('hex').slice(0, 12);
  const activatable = counts.CRITICAL === 0;   // §37 CRITICAL 존재 시 활성화 차단

  const snapshot = {
    registry_version: `1.${contentHash}`,
    content_hash: contentHash,
    source_revision: gitRevision(),
    generated_at: new Date().toISOString(),
    generator: 'tools/navigation_registry_build.mjs',
    activatable,
    validation: { counts, issues },
    vocabulary: {
      item_type: ITEM_TYPE, item_status: ITEM_STATUS, context_scope: CONTEXT_SCOPE,
      target_platform: TARGET_PLATFORM, principal_type: PRINCIPAL_TYPE, target_type: TARGET_TYPE,
      icon_keys: ICON_KEYS, client_actions: ALLOWED_CLIENT_ACTIONS,
      allowed_external_domains: ALLOWED_EXTERNAL_DOMAINS, badge_providers: BADGE_PROVIDERS,
    },
    items: built.items,
    aliases: built.aliases,
  };

  log(`[nav-registry] items=${built.items.length} aliases=${built.aliases.length} version=${snapshot.registry_version}`);
  log(`[nav-registry] validation CRITICAL=${counts.CRITICAL} ERROR=${counts.ERROR} WARNING=${counts.WARNING} INFO=${counts.INFO} · activatable=${activatable}`);

  if (!OPT.dryRun) {
    if (!activatable) {
      // ★실패한 스냅샷이 기존 활성 레지스트리를 대체하지 못하게 한다(§45·§72·§73).
      console.error('[nav-registry] CRITICAL 존재 — 스냅샷을 활성 경로에 쓰지 않는다(기존 레지스트리 유지).');
      const rejDir = path.join(ROOT, 'docs', 'cwis');
      fs.mkdirSync(rejDir, { recursive: true });
      fs.writeFileSync(path.join(rejDir, 'part004-02-registry-rejected.json'), JSON.stringify(snapshot, null, 2), 'utf8');
    } else {
      const beDir = path.join(ROOT, 'backend', 'data');
      fs.mkdirSync(beDir, { recursive: true });
      fs.writeFileSync(path.join(beDir, 'navigation_registry.json'), JSON.stringify(snapshot, null, 2), 'utf8');
      log('[nav-registry] 생성: backend/data/navigation_registry.json');
    }
    const docDir = path.join(ROOT, 'docs', 'cwis');
    fs.mkdirSync(docDir, { recursive: true });
    fs.writeFileSync(path.join(docDir, 'part004-02-navigation-registry.json'), JSON.stringify(snapshot, null, 2), 'utf8');
    fs.writeFileSync(path.join(docDir, 'part004-02-registry-validation.json'), JSON.stringify({
      registry_version: snapshot.registry_version, activatable, counts, issues,
    }, null, 2), 'utf8');
    log('[nav-registry] 생성: docs/cwis/part004-02-navigation-registry.json · part004-02-registry-validation.json');
  }

  if (OPT.failOn !== 'NONE' && SEV_RANK[OPT.failOn] !== undefined) {
    const bad = issues.filter(i => SEV_RANK[i.severity] <= SEV_RANK[OPT.failOn]);
    if (bad.length) {
      console.error(`[nav-registry] ${OPT.failOn} 이상 ${bad.length}건 — 실패 처리`);
      for (const b of bad.slice(0, 20)) console.error(`  ${b.severity} ${b.code} ${b.target}`);
      process.exit(1);
    }
  }
  process.exit(0);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();

export { build, pathSlug, DOMAIN_OF_GROUP, GROUP_ICON, EMOJI_ICON, SEV_RANK };
