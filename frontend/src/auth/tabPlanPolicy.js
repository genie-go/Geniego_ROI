/* [현 차수] ★페이지 내부 탭(sub-tab)의 구독플랜별 노출 정책 (중앙 SSOT).
 *  - 메뉴(페이지) 접근권한은 planMenuPolicy 가 담당. 이 파일은 "한 페이지 안에서 일부 탭만 상위 플랜"인
 *    고급 탭을 플랜별로 숨기기 위한 보수적 정책.
 *  - 미등록 탭은 '페이지 접근권한 상속'(=노출). 잘못 숨겨 유료회원 기능을 가리지 않도록 화이트리스트 방식.
 *  - 데모/관리자/Enterprise 는 항상 전체 노출(체험·관리·최상위 플랜 보장).
 */
import { PLAN_TIER_RANK } from './planMenuPolicy.js';

// `${pageKey}::${tabId}` → 최소 플랜. (명백히 고급/상위티어인 탭만 보수적으로 등록)
export const TAB_MIN_PLAN = Object.freeze({
  // 성과 허브(PerformanceHub) — 크리에이터 정산·SKU 수익성·코호트·ESG는 상위 분석(핵심 성과/정산/가이드는 전 플랜)
  'performance::creator': 'growth',
  'performance::sku_profit': 'pro',
  'performance::cohort': 'pro',
  'performance::esg': 'pro',
  // 손익(PnLDashboard) — 이상감지·예측은 상위 분석(개요/단위손익/실행계획/가이드는 전 플랜)
  'pnl::anomaly': 'growth',
  'pnl::forecast': 'pro',
  // 마케팅(Marketing) — AI 디자인 생성·크리에이티브 분석은 상위(개요/광고현황/비교/가이드는 전 플랜)
  'marketing::ai_design': 'pro',
  'marketing::creative': 'growth',
  // 여정 빌더(JourneyBuilder) — 실행로그·분석은 상위(빌더/목록/가이드는 전 플랜)
  'journey::analytics': 'growth',
  'journey::logs': 'pro',
  // 캠페인 관리(CampaignManager) — 성과분석·A/B테스트는 상위(개요/목록/가이드는 전 플랜)
  'campaign::analytics': 'growth',
  'campaign::abtest': 'pro',
  // 이메일 마케팅(EmailMarketing) — 성과분석·AI 크리에이티브는 상위(캠페인/템플릿/설정/가이드는 전 플랜)
  'email::analytics': 'growth',
  'email::creative': 'growth',
});

/** 탭 노출 허용 여부. 미등록 탭/플랜 미상이면 true(노출, fail-open=기존 동작 보존). */
export function tabAllowedByPlan(userPlan, pageKey, tabId) {
  const need = TAB_MIN_PLAN[`${pageKey}::${tabId}`];
  if (!need) return true; // 미지정 → 페이지 접근권한 상속(노출)
  const p = String(userPlan || '').toLowerCase();
  if (p === 'admin' || p === 'enterprise') return true; // 최상위/관리자 전체 허용
  const rank = PLAN_TIER_RANK[p];
  if (rank == null) return true; // 플랜 미상 → fail-open(노출)
  const min = PLAN_TIER_RANK[need] ?? 99;
  return rank >= min;
}
