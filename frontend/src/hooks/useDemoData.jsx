import { useAuth } from "../auth/AuthContext";

/**
 * useDemoData — 데모용 모크 데이터 공급 훅
 * (닥터자르트(Dr.Jart+) 급 뷰티/코스메틱 브랜드 전용 대규모 옴니채널 커머스 가상 데이터)
 */
export function useDemoData() {
  const { isDemo, isPro } = useAuth();
  return { isDemo, isPro };
}

/* ── 1. 고객 CRM 데이터 (피부타입, LTV, 구매횟수 중심) ── */
export const DEMO_CRM_CUSTOMERS = [];
export const DEMO_EMAIL_CAMPAIGNS = [];
export const DEMO_PIXEL_EVENTS = [];
export const DEMO_JOURNEYS = [];
export const DEMO_COMMERCE_KPI = {};
export const DEMO_AD_PERFORMANCE = [];
export const DEMO_WMS_INVENTORY = [];

/* ── 데모 UI 컴포넌트 ── */
export function DemoBanner() {
  return null;
}
