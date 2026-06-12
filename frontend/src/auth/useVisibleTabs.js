import { useMemo } from 'react';
import { useAuth } from './AuthContext.jsx';
import { tabAllowedByPlan } from './tabPlanPolicy.js';

const _id = (t) => (t && (t.id ?? t.key)) ?? t;

/** [현 차수] 구독플랜별 탭 필터 훅 (fail-open: 미등록 탭·플랜미상·전부걸러짐 시 원본 노출 → 유료기능 가림 방지). */
export function useVisibleTabs(pageKey, tabs, idOf = _id) {
  const { user, isDemo, isAdmin } = useAuth();
  return useMemo(() => {
    if (!Array.isArray(tabs)) return tabs;
    if (isDemo || isAdmin) return tabs; // 데모/관리자 전체 노출
    const plan = (user && (user.plans || user.plan)) || 'free';
    const out = tabs.filter((tb) => tabAllowedByPlan(plan, pageKey, idOf(tb)));
    return out.length ? out : tabs; // 안전: 빈 탭바 방지
  }, [tabs, pageKey, user, isDemo, isAdmin]);
}
