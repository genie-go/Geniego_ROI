import { useAuth } from "../auth/AuthContext";

/**
 * useData — 데모용 모크 데이터 공급 훅
 * (닥터자르트(Dr.Jart+) 급 뷰티/코스메틱 브랜드 전용 대규모 옴니채널 커머스 가상 데이터)
 */
export function useData() {
  const { isDemo, isPro } = useAuth();
  return { isDemo, isPro };
}

/* ── 1. 고객 CRM 데이터 (피부타입, LTV, 구매횟수 중심) ── */
export const _CRM_CUSTOMERS = [];
export const _EMAIL_CAMPAIGNS = [];
export const _PIXEL_EVENTS = [];
export const _JOURNEYS = [];
export const _COMMERCE_KPI = {};
export const _AD_PERFORMANCE = [];
export const _WMS_INVENTORY = [];

/* ── 데모 UI 컴포넌트 ── */
export function Banner() {
  return null;
}
