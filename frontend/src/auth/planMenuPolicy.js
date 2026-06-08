/**
 * planMenuPolicy.js — 플랜별 메뉴 접근 권한 정본(SSOT) · 181차 복구·초고도화
 *
 * 설계 원칙 (은행급 / 글로벌 SaaS):
 * 1. Fail-secure 기본값: 관리자(MenuAccessManager/PlanPricing)가 백엔드에 플랜별
 *    menuAccess 를 설정하기 전에도 "정본 기본 등급(MENU_MIN_PLAN)"으로 접근이
 *    실제 강제된다. (기존: 미설정 시 전체 허용 → 사실상 비활성 → 본 모듈로 해소)
 * 2. Admin override: 백엔드 plan_menu_access 설정이 있으면 그것이 우선(세밀 제어).
 * 3. Admin-only 격리: 플랫폼 관리 메뉴는 enterprise 도 접근 불가(admin 전용).
 * 4. Single source: 사이드바 manifest 의 menuKey 를 단일 출처로 사용.
 *
 * 사용처:
 * - AuthContext.hasMenuAccess: 사이드바 표시 + 라우트 가드 판정
 * - App MenuAccessGuard: URL 직접 접근(딥링크) 차단
 */
import { MEMBER_MENU, ADMIN_MENU, ADMIN_ONLY_MENU_KEYS } from "../layout/sidebarManifest.js";
import { planRank } from "./plans.js";

/**
 * 플랜별 메뉴 최소 등급 정본.
 * tier: free(0) < starter(1) < growth(2) < pro(3) < enterprise(4) < admin(5)
 * 다수 leaf 가 공유하는 coarse menuKey(marketing/ops/billing 등) 단위로 정의한다.
 * (세밀한 per-page 제어가 필요하면 관리자 menuAccess 로 override)
 */
export const MENU_MIN_PLAN = Object.freeze({
  // ── Free (평생 무료) — 사방넷(Sabangnet) 무료 모델 벤치마크 ────────────────
  //   "판매 채널 연동 + 상품/주문 동기화"를 무료로 제공해 진입장벽 제거(채널 N개 제한은
  //   limits.channels 로 강제). 경쟁사: 사방넷 무료, Shopify 무료체험, 채널톡 무료.
  "home||dashboard": "free",
  "home||rollup": "free",
  "commerce_channel": "free",          // 옴니채널/카탈로그/주문 — 채널 연동 핵심(3채널 무료)
  "data||integration_hub": "free",     // 채널 자격증명(API키) 등록 — 무료 진입의 핵심
  "analytics||performance_hub": "free",// 기본 성과 열람(읽기)
  "billing": "free",                   // 요금/구독/정산 — 항상 접근
  "automation||onboarding": "free",
  "system||workspace": "free",
  "system||case_study": "free",
  "system||help_center": "free",
  "system||feedback": "free",

  // ── Starter (마케팅 입문) — HubSpot Starter / 채널톡 / Mailchimp Standard ──
  //   마케팅·광고·CRM·메신저 코어 + 기본 손익/AI 인사이트.
  "marketing": "starter",              // 광고/CRM/이메일/카카오/캠페인 등
  "analytics||report_builder": "starter",
  "analytics||pnl_analytics": "starter",
  "analytics||ai_insights": "starter",

  // ── Pro (성장) — HubSpot Professional / Salesforce / Shopify Advanced ──────
  //   고급 운영(WMS/가격최적화/공급망/반품) + 자동화 + 데이터 연동·스키마 + 데이터프로덕트.
  "ops": "pro",                        // WMS/가격최적화/공급망/반품 (PM 포함)
  "analytics||data_product": "pro",
  "automation||ai_rule_engine": "pro",
  "automation||approvals": "pro",
  "automation||writeback": "pro",
  "data||data_schema": "pro",
  "data||data_trust": "pro",
  "system||operations": "pro",

  // ── Enterprise (대기업) — Salesforce Enterprise / 화이트라벨·API·개발자 ────
  "system||developer_hub": "enterprise",

  // ── 플랫폼 관리 — admin 전용(어떤 구독 플랜도 접근 불가) ───────────────────
  "system||plan_pricing": "admin",
  "system||menu_tree": "admin",
  "system||db_admin": "admin",
  "system||pg_config": "admin",
  "system||admin": "admin",
  "system||user_management": "admin",
  "system||system_monitor": "admin",
});

/** 미정의 menuKey 의 fail-secure 기본 등급 (pro 요구) */
const DEFAULT_MIN_PLAN = "pro";

/**
 * Free 플랜 평생 무료 판매채널 수 제한 (사방넷 무료 모델 벤치마크).
 * commerce_channel/integration_hub 메뉴는 무료지만 등록 채널 수는 본 한도로 강제한다.
 * plan_config.limits.channels 로 플랜별 override 가능(무제한 = -1).
 */
export const FREE_CHANNEL_LIMIT = 3;

/** 플랜 등급(tier) 숫자 — 추천 누적 배분용. plans.js planRank 와 정합. */
export const PLAN_TIER_RANK = Object.freeze({
  free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4,
});

/** menuKey 가 플랫폼 관리(admin) 전용인지 */
export function isAdminOnlyMenu(menuKey) {
  if (!menuKey) return false;
  if (ADMIN_ONLY_MENU_KEYS.has(menuKey)) return true;
  return MENU_MIN_PLAN[menuKey] === "admin";
}

/** menuKey 의 정본 최소 요구 플랜 */
export function requiredPlanForMenu(menuKey) {
  if (!menuKey) return "free";
  return MENU_MIN_PLAN[menuKey] || DEFAULT_MIN_PLAN;
}

/**
 * 정본 등급 기준 접근 가능 여부 (관리자 설정 부재 시 fail-secure 폴백).
 * @param {string} userPlan
 * @param {string} menuKey
 */
export function menuAllowedByTier(userPlan, menuKey) {
  if (!menuKey) return true;
  return planRank(userPlan) >= planRank(requiredPlanForMenu(menuKey));
}

/**
 * 가격 기반 메뉴접근 추천 (181차 — 3플랜 starter/pro/enterprise).
 * 관리자가 등록한 플랜별 월 요금 차이에 비례해 누적(cumulative)으로 메뉴를 배분한다.
 * - 상위 플랜은 하위 플랜 메뉴를 모두 포함(가격이 높을수록 더 많은 메뉴).
 * - admin 전용 메뉴는 제외(어떤 구독 플랜도 접근 불가).
 * - enterprise 는 전체(비-admin) 보장. starter 는 최소 1개 이상.
 *
 * @param {{starter:number, pro:number, enterprise:number}} prices  월 요금(USD)
 * @param {string[]} menuKeys  대상 menuKey 목록(보통 DB 등록 키)
 * @returns {{starter:string[], pro:string[], enterprise:string[]}}
 */
/**
 * 전 플랜(Free 포함) 동적 메뉴접근 추천 — 경쟁사 벤치마크 + 가격순 tier 배분.
 *
 * 설계:
 *  1) 각 플랜에 tier 부여 — Free(또는 월요금 0) = 'free' 고정, 유료는 가격 오름차순으로
 *     starter→pro→enterprise 사다리. 알려진 등급 id(starter/pro/enterprise)는 자기 이름 tier 고정.
 *     초과 유료 플랜은 enterprise 로 수렴.
 *  2) 각 플랜은 자기 tier 이하 등급(MENU_MIN_PLAN)의 메뉴를 모두 제공(누적 단조 — 상위 ⊇ 하위).
 *  3) admin 전용 메뉴는 어떤 플랜에도 미포함.
 *
 * 플랜명을 admin 이 바꿔도 id 는 불변이므로 안전. 신규 플랜 id 도 가격순 tier 로 자동 배분.
 *
 * @param {Array<{id:string, price:number}>} planList  플랜 목록(1개월·1계정 월요금 USD)
 * @returns {{ tierOf: Record<string,string>, access: Record<string, Record<string, 1>> }}
 *   access[planId] = { [coarse menuKey]: 1 } — 허용 menuKey 집합
 */
export function recommendMenuAccess(planList) {
  const KNOWN = { free: 1, starter: 1, growth: 1, pro: 1, enterprise: 1 };
  const free = [];
  const paid = [];
  for (const p of (planList || [])) {
    const id = String(p?.id || "").trim();
    if (!id || id === "admin" || id === "demo") continue;
    const price = Math.max(0, Number(p?.price) || 0);
    if (id === "free" || price <= 0) free.push(id);
    else paid.push({ id, price });
  }
  // 가격 오름차순(동가 시 id) → 사다리 tier 부여
  paid.sort((a, b) => (a.price - b.price) || a.id.localeCompare(b.id));
  const ladder = ["starter", "pro", "enterprise"];
  const tierOf = {};
  free.forEach(id => { tierOf[id] = "free"; });
  paid.forEach((p, i) => { tierOf[p.id] = ladder[Math.min(i, ladder.length - 1)]; });
  // 알려진 등급 id 는 자기 이름 tier 로 고정(직관적 — Pro 플랜은 항상 pro tier)
  Object.keys(tierOf).forEach(id => { if (KNOWN[id] && id !== "free") tierOf[id] = id; });

  // 회원 메뉴의 coarse menuKey 전체(admin 전용 제외)
  const allKeys = [...new Set(
    MEMBER_MENU.flatMap(s => (s.items || []).map(it => it.menuKey).filter(Boolean))
  )].filter(k => !isAdminOnlyMenu(k));

  const access = {};
  for (const [planId, tier] of Object.entries(tierOf)) {
    const maxRank = PLAN_TIER_RANK[tier] ?? 0;
    const acc = {};
    for (const k of allKeys) {
      const req = requiredPlanForMenu(k);
      const reqRank = PLAN_TIER_RANK[req] ?? PLAN_TIER_RANK[DEFAULT_MIN_PLAN] ?? 3;
      if (reqRank <= maxRank) acc[k] = 1;
    }
    access[planId] = acc;
  }
  return { tierOf, access };
}

export function recommendMenuAccessByPrice(prices, menuKeys) {
  // 186차 재설계: 가격 비례 'count'가 아니라 **메뉴 등급(MENU_MIN_PLAN) tier 기반**으로 추천 →
  // 가격이 같거나 미등록이어도 플랜별로 항상 차별화(구버전식 tier 모델).
  //  · 플랜을 가격 오름차순으로 정렬 → 낮은가격=하위 tier(starter), 중간=pro, 최고가=enterprise
  //  · 동가/미등록은 플랜 id 순서(starter<pro<enterprise)로 tie-break
  //  · 각 플랜은 "자신의 tier 이하 등급" 메뉴를 모두 제공(누적 단조 — 상위 플랜 ⊇ 하위 플랜)
  const ADV = { free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 9 };
  const gateable = (menuKeys || []).filter(k => k && !isAdminOnlyMenu(k));
  const idOrder = { starter: 0, pro: 1, enterprise: 2 };
  const entries = [
    ['starter', Math.max(0, Number(prices?.starter) || 0)],
    ['pro', Math.max(0, Number(prices?.pro) || 0)],
    ['enterprise', Math.max(0, Number(prices?.enterprise) || 0)],
  ];
  // 가격 오름차순(동가 시 id 순서) → 순위별 tier 부여
  entries.sort((a, b) => (a[1] - b[1]) || (idOrder[a[0]] - idOrder[b[0]]));
  const tierByRank = ['starter', 'pro', 'enterprise'];
  const planTier = {};
  entries.forEach(([id], i) => { planTier[id] = tierByRank[i] || 'enterprise'; });
  const menusUpToTier = (tier) => {
    const maxRank = ADV[tier] ?? 1;
    return gateable.filter(k => (ADV[requiredPlanForMenu(k)] ?? ADV[DEFAULT_MIN_PLAN] ?? 3) <= maxRank);
  };
  return {
    starter: menusUpToTier(planTier.starter),
    pro: menusUpToTier(planTier.pro),
    enterprise: menusUpToTier(planTier.enterprise),
  };
}

/* ── path → menuKey 역인덱스 (라우트 딥링크 가드용) ── */
let _pathIndex = null;
function _buildPathIndex() {
  const idx = [];
  for (const section of [...MEMBER_MENU, ...ADMIN_MENU]) {
    for (const item of section.items) {
      if (item.to && item.menuKey) idx.push([item.to, item.menuKey]);
    }
  }
  // 긴 경로 우선 매칭을 위해 내림차순 정렬
  idx.sort((a, b) => b[0].length - a[0].length);
  return idx;
}

/**
 * 라우트 경로 → menuKey 매핑.
 * 정확 매칭 우선, 없으면 최장 prefix 매칭(동적 라우트 `/pm/projects/:id` 등 → `/pm`).
 * 미등록 라우트는 null (가드 통과).
 */
export function pathToMenuKey(pathname) {
  if (!pathname) return null;
  if (!_pathIndex) _pathIndex = _buildPathIndex();
  // 1) 정확 매칭
  for (const [p, k] of _pathIndex) if (p === pathname) return k;
  // 2) 최장 prefix (경계 '/' 보장 — '/pm' 이 '/pmx' 를 매칭하지 않도록)
  for (const [p, k] of _pathIndex) {
    if (pathname === p || pathname.startsWith(p + "/")) return k;
  }
  return null;
}
