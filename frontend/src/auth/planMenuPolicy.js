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
  // 홈 — 핵심 진입(무료 열람)
  "home||dashboard": "free",
  "home||rollup": "free",
  // 마케팅/광고/CRM/메신저 — 핵심 유료 진입 가치(최저 유료 등급부터)
  "marketing": "starter",
  // 커머스/물류/WMS/주문 — 운영 고급(상위 등급)
  "ops": "pro",
  // 분석 — 3플랜 모델(starter/pro/enterprise): 핵심 분석은 starter, 고급 데이터프로덕트는 pro
  "analytics||performance_hub": "starter",
  "analytics||report_builder": "starter",
  "analytics||pnl_analytics": "starter",
  "analytics||ai_insights": "starter",
  "analytics||data_product": "pro",
  // 자동화/룰엔진
  "automation||ai_rule_engine": "pro",
  "automation||approvals": "pro",
  "automation||writeback": "pro",
  "automation||onboarding": "free",
  // 데이터 연동
  "data||integration_hub": "pro",
  "data||data_schema": "pro",
  "data||data_trust": "pro",
  // 청구/정산 — 항상 접근(요금/구독 관리)
  "billing": "free",
  // 멤버/워크스페이스/지원 — 협업·지원(무료)
  "system||workspace": "free",
  "system||case_study": "free",
  "system||help_center": "free",
  "system||feedback": "free",
  "system||operations": "pro",
  "system||developer_hub": "enterprise",
  // 플랫폼 관리 — admin 전용
  "system||plan_pricing": "admin",
  "system||menu_tree": "admin",
  "system||db_admin": "admin",
  "system||pg_config": "admin",
  "system||admin": "admin",
  "system||user_management": "admin",
  "system||system_monitor": "admin",
});

/** 미정의 menuKey 의 fail-secure 기본 등급 (3플랜 모델 — pro 요구) */
const DEFAULT_MIN_PLAN = "pro";

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
