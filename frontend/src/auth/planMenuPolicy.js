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
  const ADV_ORDER = { free: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 9 };
  const gateable = (menuKeys || []).filter(k => k && !isAdminOnlyMenu(k));
  // 기본 등급(고급도) 오름차순 — 기초 메뉴가 앞, 고급 메뉴가 뒤
  const ranked = [...gateable].sort(
    (a, b) => (ADV_ORDER[requiredPlanForMenu(a)] ?? 2) - (ADV_ORDER[requiredPlanForMenu(b)] ?? 2)
  );
  const N = ranked.length;
  const BASE = 0.25; // 최저 보장 비율 — 유료 플랜이 비지 않도록(빈 플랜 방지)
  const entries = [
    ['starter', Math.max(0, Number(prices?.starter) || 0)],
    ['pro', Math.max(0, Number(prices?.pro) || 0)],
    ['enterprise', Math.max(0, Number(prices?.enterprise) || 0)],
  ];
  const top = Math.max(...entries.map(([, v]) => v), 1); // 최고가 기준 정규화(0 방어)
  // 가격 오름차순 → 누적 단조 보장 (최고가 플랜 = 전체)
  const byPrice = [...entries].sort((a, b) => a[1] - b[1]);
  const countMap = {};
  let prev = 0;
  byPrice.forEach(([id, price], i) => {
    const isTop = i === byPrice.length - 1;
    const frac = isTop ? 1 : BASE + (1 - BASE) * (price / top);
    let cnt = N > 0 ? Math.min(N, Math.max(prev, Math.round(N * frac))) : 0;
    if (N > 0) cnt = Math.max(cnt, 1);
    countMap[id] = cnt;
    prev = cnt;
  });
  return {
    starter: ranked.slice(0, countMap.starter || 0),
    pro: ranked.slice(0, countMap.pro || 0),
    enterprise: ranked.slice(0, countMap.enterprise || 0),
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
