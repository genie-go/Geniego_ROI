import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { getJsonAuth, requestJsonAuth } from "../services/apiClient.js";
import { useT } from "../i18n/index.js";
import { MEMBER_MENU, ADMIN_MENU, buildMenuKeyIndex } from "../layout/sidebarManifest.js";
import { MENU_KEY_LABEL, SUB_TABS_BY_PATH } from "../layout/sidebarMenuLabels.js";
import SIDEBAR_DICT from "../layout/sidebarI18n.js"; // 186차: gNav.* 라벨 한글 해석 (하위메뉴 라벨)
import PlanServiceGuide from "../components/PlanServiceGuide.jsx"; // 186차: 플랜 제공서비스 상세 안내(초고도화)
import { recommendMenuAccessByPrice } from "../auth/planMenuPolicy.js"; // 181차 요금 기반 메뉴접근 추천
/** gNav.* labelKey → 한글 라벨 (sidebarI18n 우선) */
function gNavLabel(labelKey) {
  if (labelKey && labelKey.startsWith('gNav.')) { const d = SIDEBAR_DICT.ko || {}; const v = d[labelKey.slice(5)]; if (v) return v; }
  return null;
}

/**
 * 169차 P4 완벽 동기화 — admin 저장 후 user 측 sidebar 즉시 갱신.
 * BroadcastChannel + custom event 둘 다 발행 (cross-tab + same-tab).
 * AuthContext.loadMenuAccess listener 가 받음.
 */
const SYNC_CHANNEL = "geniego_menu_access_sync";
function publishMenuAccessSync(payload) {
  try { new BroadcastChannel(SYNC_CHANNEL).postMessage({ type: "menu_access_updated", ts: Date.now(), ...payload }); } catch {}
  try { window.dispatchEvent(new CustomEvent("menu-access-saved", { detail: payload })); } catch {}
}

/**
 * PlanPricing — admin 플랜별 구독요금 + 메뉴 권한 통합 관리 페이지.
 *
 * 168차 USD/Paddle 단일 정책:
 *  - 통화 USD 고정 / 카드 결제 전용 / Paddle MoR
 *
 * 172차 통합 설계 (기존 3탭 → 2탭):
 *  - 💰 플랜 & 요금 (단일 탭) — plan 정의 + 기간별 가격 매트릭스 통합
 *      좌측: 플랜 정의 (name/desc/features/limits/flags)
 *      우측: 기간별 구독 가격 (1~60개월 자유 추가/제거) + 미리보기
 *      단일 [💾 통합 저장] 버튼이 plan_config + plan_period_pricing 순차 PUT
 *      backend 가 저장 후 plan_config legacy 5컬럼 (price_usd/price_annual_usd/
 *      price_id_monthly/price_id_annual/discount_pct) 을 plan_period_pricing
 *      에서 자동 동기화 → plan_period_pricing 가 가격 SSOT
 *  - 🔐 메뉴 접근 권한 — sidebar manifest 기반 트리 (별개 탭, 변경 없음)
 *
 * Endpoint:
 *  - GET    /v424/admin/plans                       — plan 목록
 *  - PUT    /v424/admin/plans/{id}                  — plan 정의 UPSERT
 *  - DELETE /v424/admin/plans/{id}                  — soft delete (is_active=0)
 *  - GET    /v424/admin/plans-period-pricing        — 기간별 가격 매트릭스
 *  - PUT    /v424/admin/plans/{id}/period-pricing   — 기간 DELETE+INSERT + plan_config sync
 *  - GET    /v424/admin/plans-menu-access           — 메뉴 권한 매트릭스
 *  - PUT    /v424/admin/plans/{id}/menu-access      — 메뉴 권한 bulk UPSERT
 */

/**
 * SEED 기본 플랜 정의. 172차에서 가격은 SEED_PERIODS 가 SSOT — plan_config.price_usd 등은
 * backend 가 plan_period_pricing 에서 자동 동기화 (legacy 컬럼은 derived view).
 */
const SEED_PLANS = [
  {
    plan_id: 'starter', name: 'Starter', display_order: 10, is_active: true, is_custom_quote: false,
    description: '소규모 팀 · 계정 수 기반',
    features: ['무제한 판매 채널', '무제한 창고(WMS)', '마케팅 분석', '계정 수 선택 (1/10/무제한)', 'API 호출 월 10,000건', '이메일 지원 (48시간 내)'],
    limits: { warehouses: -1, channels: -1, users: -1 },
  },
  {
    plan_id: 'pro', name: 'Pro', display_order: 20, is_active: true, is_custom_quote: false, is_recommended: 1,
    description: '성장 브랜드 · 계정 수 기반',
    features: ['무제한 판매 채널', '무제한 창고', 'AI 마케팅 인텔리전스', '인플루언서 평가', '상업 송장 자동 생성', '계정 수 선택 (1/10/무제한)', 'API 호출 월 500,000건', '우선 지원 (8시간 내)'],
    limits: { warehouses: -1, channels: -1, users: -1 },
  },
  {
    plan_id: 'enterprise', name: 'Enterprise', display_order: 30, is_active: true, is_custom_quote: true,
    description: '대규모 운영 · 맞춤 통합',
    features: ['Pro 플랜 전체 기능', '무제한 판매 채널', '무제한 창고', '맞춤 AI 모델 학습', '전담 계정 매니저', '99.9% 가용성 SLA', '계정 수 무제한', '무제한 API 호출', '맞춤 통합 & 웹훅'],
    limits: { warehouses: -1, channels: -1, users: -1 },
  },
];

/** 기간 라벨 — 1/3/6/12/24/36 명칭 + 그 외 단순 N개월. admin 이 자유 추가/제거 가능 (1~60개월). */
const NAMED_PERIODS = { 1: '월간', 3: '분기', 6: '반기', 12: '연간', 24: '2년', 36: '3년' };

/** 186차: 기본 계정수(seat) 티어 — 1계정 / 10계정 / 무제한. admin 이 자유 추가/삭제/편집. */
const DEFAULT_SEAT_TIERS = [
  { key: '1',         label: '1계정',  count: 1,  unlimited: false },
  { key: '10',        label: '10계정', count: 10, unlimited: false },
  { key: 'unlimited', label: '무제한', count: 0,  unlimited: true },
];
const BASE_SEAT = '1'; // legacy 동기화 기준 seat (최소 계정수)
/** periodPricing[plan] 에서 base seat 의 기간맵 반환 (하위호환 — 미리보기/추천가용) */
function basePeriods(planPP) {
  if (!planPP || typeof planPP !== 'object') return {};
  if (planPP[BASE_SEAT]) return planPP[BASE_SEAT];
  const first = Object.keys(planPP)[0];
  return first ? (planPP[first] || {}) : {};
}

// MENU_KEY_LABEL + SUB_TABS_BY_PATH 는 ../layout/sidebarMenuLabels.js 에서 import (SSOT).
// AdminMenuManager 와 공유.

/** GeniegoROI 서비스 8개 핵심 기능 — Landing.jsx (f1~f8) 정합. 구버전 카피 참고. */
const SERVICE_FEATURES = [
  { icon: '🌐', title: '옴니채널 커머스',    desc: '쿠팡·네이버·아마존·쇼피파이·틱톡샵 등 30+ 마켓을 하나의 허브로 연결. 주문·재고·배송을 표준화합니다.' },
  { icon: '🏭', title: 'WMS 창고·물류',      desc: '다중 창고 재고 추적, 합배송 관리, 운송사 API 연동, 국제 특송 상업 송장 자동 생성.' },
  { icon: '🤖', title: 'AI 마케팅 인텔리전스', desc: '8차원 광고 기여도 분석, 인플루언서 캠페인, 쿠폰 흐름 종합 분석. AI 예산 추천과 실시간 승인.' },
  { icon: '🤝', title: '인플루언서 분석',    desc: '도달률·참여율·전환율·ROI 평가. 자동 수수료 관리 + 실시간 캠페인 성과 추적.' },
  { icon: '📊', title: '통합 손익 분석',     desc: 'SKU·채널·캠페인·크리에이터별 실시간 손익. ROAS 하락·반품 급증·쿠폰 이상 패턴 자동 감지.' },
  { icon: '💰', title: '정산·대사',           desc: '모든 채널 정산 자동 대사. 채널 지급액과 예상 금액 간 불일치를 즉시 포착.' },
  { icon: '⚙️', title: 'AI 자동화 엔진',     desc: '규칙 기반 + GPT 자동화 워크플로우. 임계값 설정 / AI 제안 / 원클릭 승인·오버라이드.' },
  { icon: '🔌', title: '30+ 채널 커넥터',     desc: '국내(쿠팡·네이버·11번가) + 글로벌(아마존·메타·틱톡) 사전 구축 API + OAuth 인증 관리.' },
];
function getPeriodLabel(m) {
  const named = NAMED_PERIODS[m];
  return named ? `${named} (${m}개월)` : `${m}개월`;
}

function PlanPricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  // 172차: 두 탭 (요금·상세 + 기간별) 단일 'plan' 탭으로 통합. 메뉴 접근 권한은 별개 유지.
  const [outerTab, setOuterTab] = useState('plan'); // plan | permissions
  const [menus, setMenus] = useState([]);
  const [access, setAccess] = useState({});
  const [accessDirty, setAccessDirty] = useState(false);
  // 기간별 가격 (admin 자유 추가/제거, 1~60개월) — backend plan_period_pricing 매핑
  const [periodPricing, setPeriodPricing] = useState({}); // 186차: { plan_id: { seat_tier: { months: { price_usd, discount_pct, paddle_price_id, is_active } } } }
  const [newPeriodInput, setNewPeriodInput] = useState(''); // "기간 추가" input 상태
  // 186차: 계정수(seat) 티어 — 전역(모든 플랜 공통), admin 자유 편집
  const [seatTiers, setSeatTiers] = useState(DEFAULT_SEAT_TIERS);
  // 172차 Task #22 초고도화 — 메뉴 권한 ↔ 가격 자동 산출
  const [menuPricingSync, setMenuPricingSync] = useState(null); // { menuScores, plans:[{plan_id, recommendedMonthly, currentMonthly, delta, suggestedTier, categoryBreakdown, ...}], totals }
  const [pricingSyncApplying, setPricingSyncApplying] = useState(null);
  // 186차: 관리자 세션 유실(401) 감지 → 재로그인 안내
  const [authLost, setAuthLost] = useState(false);
  // 187차: 일시적 401(세션은 유효한데 순간 거부)에 재로그인 강요하지 않도록 재시도 가드.
  const authRetryRef = useRef(0);

  const fetchPlans = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getJsonAuth('/v424/admin/plans');
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
      setAuthLost(false); authRetryRef.current = 0;
    } catch (e) {
      const msg = String(e?.message || e);
      const is401 = /HTTP 401|AUTH_REQUIRED|SESSION_EXPIRED|인증이 필요|세션이 만료/.test(msg);
      if (is401) {
        let tok = null; try { tok = localStorage.getItem('genie_token'); } catch {}
        // 187차: 토큰이 있으면 세션은 살아있을 가능성 → 일시적 401로 보고 자동 재시도(최대 4회).
        //   토큰 자체가 없을 때만(진짜 로그아웃) 재로그인 안내.
        if (tok && authRetryRef.current < 4) {
          authRetryRef.current++;
          setTimeout(() => fetchPlans(), 700);
          return; // 기존 plans 유지(화면 깜빡임/재로그인 방지)
        }
        if (!tok) { setAuthLost(true); setPlans([]); }
        else { setError('일시적 인증 오류 — 잠시 후 다시 시도해 주세요'); }
      } else { setError(msg); setPlans([]); }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMenuAccess = useCallback(async () => {
    try {
      const data = await getJsonAuth('/v424/admin/plans-menu-access');
      setMenus(Array.isArray(data?.menus) ? data.menus : []);
      setAccess(data?.access && typeof data.access === 'object' ? data.access : {});
      setAccessDirty(false);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, []);

  // [171차] 기간별 가격 조회
  const fetchPeriodPricing = useCallback(async () => {
    try {
      const data = await getJsonAuth('/v424/admin/plans-period-pricing');
      setPeriodPricing(data?.pricing && typeof data.pricing === 'object' ? data.pricing : {});
      // 186차: 전역 계정수 티어 — 첫 플랜 기준(모든 플랜 공통 관리). 없으면 기본 1/10/무제한.
      const stMap = data?.seatTiers && typeof data.seatTiers === 'object' ? data.seatTiers : {};
      const firstTiers = Object.values(stMap).find(arr => Array.isArray(arr) && arr.length);
      if (firstTiers) setSeatTiers(firstTiers);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, []);

  // 172차 Task #22 — 메뉴↔가격 sync 조회
  const fetchMenuPricingSync = useCallback(async () => {
    try {
      const data = await getJsonAuth('/v424/admin/menu-pricing-sync');
      setMenuPricingSync(data?.ok ? data : null);
    } catch (e) {
      // graceful — backend 가 미배포 상태일 수 있음
      console.warn('menu-pricing-sync fetch failed:', e?.message || e);
      setMenuPricingSync(null);
    }
  }, []);

  /** 권장가 1m 적용 → 모든 기간 자동 산출 + plan_config sync (백엔드 transaction) */
  const applyRecommendedPrice = async (planId, roundTo = 'nearest-9') => {
    setPricingSyncApplying(planId);
    try {
      const result = await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(planId)}/apply-recommended`, 'PUT', { roundTo });
      await Promise.all([fetchPlans(), fetchPeriodPricing(), fetchMenuPricingSync()]);
      publishMenuAccessSync({ plan_id: planId, source: 'apply_recommended', appliedPrice: result?.appliedPrice });
      alert(`권장가 적용 완료 — $${result?.appliedPrice}/월 (raw $${result?.recommendedRaw}, 라운딩: ${roundTo})`);
    } catch (e) {
      alert(`적용 실패: ${e?.message || e}`);
    } finally {
      setPricingSyncApplying(null);
    }
  };

  /**
   * 자동 추천 로직 — 동적 기간 지원 (1~60개월 자유).
   *  - 1m price_usd 변경 시 → 모든 기존 기간 price_usd 자동 재계산 (자기 자신 제외)
   *      price_usd[m] = price_usd[1] * (1 - discount_pct[m] / 100)
   *  - 특정 m 의 discount_pct 변경 시 → 그 m 의 price_usd 만 재계산
   *  - admin 이 임의 기간 price_usd 직접 입력 시 그 값 유지 (override)
   */
  const updatePeriodField = (planId, seat, months, patch) => {
    setPeriodPricing(prev => {
      const planSeats = { ...(prev[planId] || {}) };
      const planPP = { ...(planSeats[seat] || {}) };
      const cur = { ...(planPP[months] || {}) };
      const next = { ...cur, ...patch };
      planPP[months] = next;
      // 1m price_usd 변경 → 이 seat 의 모든 다른 기간 자동 산출
      if (months === 1 && patch.price_usd !== undefined) {
        const base = Number(next.price_usd) || 0;
        if (base > 0) {
          for (const p of Object.keys(planPP).map(Number)) {
            if (p === 1 || !Number.isFinite(p)) continue;
            const cfg = planPP[p] || {};
            const d = Number(cfg.discount_pct || 0);
            if (d >= 0 && d < 100) {
              planPP[p] = { ...cfg, price_usd: +(base * (1 - d / 100)).toFixed(2) };
            }
          }
        }
      }
      // 비-1m 기간의 discount_pct 변경 → 해당 기간 price_usd 재계산
      if (patch.discount_pct !== undefined && months !== 1) {
        const base = Number(planPP[1]?.price_usd) || 0;
        const d = Number(next.discount_pct || 0);
        if (base > 0 && d >= 0 && d < 100) {
          planPP[months] = { ...next, price_usd: +(base * (1 - d / 100)).toFixed(2) };
        }
      }
      planSeats[seat] = planPP;
      return { ...prev, [planId]: planSeats };
    });
  };

  /** 기간 추가 — admin 이 N개월 (1-60) 자유 입력 (해당 seat 티어에) */
  // 186차 요청: 기간 추가 한 번 → 모든 계정수(seat) 티어에 일괄 적용
  const addPeriod = (planId, _seat, months) => {
    const m = Number(months);
    if (!Number.isFinite(m) || m < 1 || m > 60) {
      alert('기간은 1~60개월 범위로 입력하세요');
      return;
    }
    const tiers = (seatTiers.length ? seatTiers : DEFAULT_SEAT_TIERS).map(t => t.key);
    const recommendedDiscount = { 3: 5, 6: 10, 12: 20, 24: 30, 36: 40 }[m]
      ?? Math.max(0, Math.min(30, (m - 1) * 2));
    setPeriodPricing(prev => {
      const planSeats = { ...(prev[planId] || {}) };
      const baseTier = planSeats[BASE_SEAT] || planSeats[tiers[0]] || {};
      if (baseTier[m]) { alert(`${m}개월은 이미 등록되어 있습니다`); return prev; }
      for (const seat of tiers) {
        const planPP = { ...(planSeats[seat] || {}) };
        if (!planPP[m]) {
          const base = Number(planPP[1]?.price_usd) || 0;
          planPP[m] = {
            price_usd: base > 0 ? +(base * (1 - recommendedDiscount / 100)).toFixed(2) : null,
            discount_pct: recommendedDiscount,
            paddle_price_id: '',
            is_active: true,
          };
        }
        planSeats[seat] = planPP;
      }
      return { ...prev, [planId]: planSeats };
    });
    setNewPeriodInput('');
  };

  /** 186차: 맞춤견적 해제 시 — 기간이 없으면 기본 기간(1/3/6/12개월)을 전 계정수에 자동 생성 (Starter/Pro 와 동일하게 요금 입력 가능) */
  const autoGenDefaultPeriods = (planId) => {
    const DEFAULT_GEN = [1, 3, 6, 12];
    setPeriodPricing(prev => {
      const planSeats = { ...(prev[planId] || {}) };
      const hasAny = Object.values(planSeats).some(sp => Object.keys(sp || {}).length > 0);
      if (hasAny) return prev; // 이미 등록된 기간이 있으면 보존
      const tiers = (seatTiers.length ? seatTiers : DEFAULT_SEAT_TIERS).map(t => t.key);
      for (const seat of tiers) {
        const pp = { ...(planSeats[seat] || {}) };
        for (const m of DEFAULT_GEN) {
          pp[m] = { price_usd: null, discount_pct: ({ 3: 5, 6: 10, 12: 20 }[m] || 0), paddle_price_id: '', is_active: true };
        }
        planSeats[seat] = pp;
      }
      return { ...prev, [planId]: planSeats };
    });
  };

  /** 기간 제거 — 모든 계정수 티어에서 일괄 제거 */
  const removePeriod = (planId, _seat, months) => {
    if (!window.confirm(`${months}개월 기간을 모든 계정수에서 제거하시겠습니까? (저장 시 적용)`)) return;
    setPeriodPricing(prev => {
      const planSeats = { ...(prev[planId] || {}) };
      for (const seat of Object.keys(planSeats)) {
        const planPP = { ...(planSeats[seat] || {}) };
        delete planPP[months];
        planSeats[seat] = planPP;
      }
      return { ...prev, [planId]: planSeats };
    });
  };

  /** 186차: 계정수 티어 추가 (전역) */
  const addSeatTier = (count, unlimited) => {
    setSeatTiers(prev => {
      const key = unlimited ? 'unlimited' : String(count);
      if (prev.some(t => t.key === key)) { alert('이미 존재하는 계정수 티어입니다'); return prev; }
      const tier = unlimited
        ? { key: 'unlimited', label: '무제한', count: 0, unlimited: true }
        : { key, label: `${count}계정`, count: Number(count), unlimited: false };
      const next = [...prev, tier];
      // 정렬: unlimited 는 항상 마지막, 나머지는 count 오름차순
      next.sort((a, b) => (a.unlimited ? 1 : b.unlimited ? -1 : a.count - b.count));
      return next;
    });
  };
  /** 186차: 계정수 티어 삭제 (전역) — 해당 seat 의 모든 플랜 가격도 제거 */
  const removeSeatTier = (key) => {
    if (key === BASE_SEAT) { alert('기준 계정수(1계정) 티어는 삭제할 수 없습니다'); return; }
    if (!window.confirm('이 계정수 티어를 삭제하시겠습니까? (저장 시 해당 계정수 가격도 제거)')) return;
    setSeatTiers(prev => prev.filter(t => t.key !== key));
    setPeriodPricing(prev => {
      const next = {};
      for (const [pid, seats] of Object.entries(prev)) {
        const ns = { ...seats }; delete ns[key]; next[pid] = ns;
      }
      return next;
    });
  };

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  // 172차→179차: 메뉴 접근은 'plan' 탭의 플랜별 "제공 메뉴·기능" 편집기에서도 필요 → 항상 로드
  useEffect(() => { fetchMenuAccess(); }, [fetchMenuAccess]);
  useEffect(() => { if (outerTab === 'plan') fetchPeriodPricing(); }, [outerTab, fetchPeriodPricing]);
  // 172차 Task #22 — sync 데이터는 양쪽 탭에서 필요 (가격 탭 표시 + 권한 탭 저장 후 갱신)
  useEffect(() => { fetchMenuPricingSync(); }, [fetchMenuPricingSync]);
  // 메뉴 권한이 저장되면 sync 데이터 즉시 refetch (BroadcastChannel 이벤트)
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel(tChannelName('geniego_menu_access_sync'));
      bc.onmessage = (ev) => {
        if (ev?.data?.type === 'menu_access_updated') fetchMenuPricingSync();
      };
    } catch {}
    return () => { try { bc?.close(); } catch {} };
  }, [fetchMenuPricingSync]);

  // 명시적 추가/제거 (선택 추가 / 선택 삭제 버튼 전용 — 토글이 아니라 의도된 값 설정)
  const setMenuAccess = (planId, menuKey, enabled) => {
    setAccess(prev => {
      const planAcc = { ...(prev[planId] || {}) };
      planAcc[menuKey] = enabled ? 1 : 0;
      return { ...prev, [planId]: planAcc };
    });
    setAccessDirty(true);
  };

  // 다수 menuKey 를 한 번에 enabled/disabled — 섹션 전체 추가/제거에 사용
  const setMenuAccessBulk = (planId, menuKeys, enabled) => {
    if (!menuKeys || !menuKeys.length) return;
    setAccess(prev => {
      const planAcc = { ...(prev[planId] || {}) };
      for (const k of menuKeys) planAcc[k] = enabled ? 1 : 0;
      return { ...prev, [planId]: planAcc };
    });
    setAccessDirty(true);
  };

  const togglePlanAll = (planId, value) => {
    setAccess(prev => {
      // 186차: menu_tree(비어있을 수 있음) 대신 sidebar manifest 전 계층 키 기준 전체 토글
      const planAcc = {};
      for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) for (const it of (sec.items || [])) {
        if (!it.menuKey) continue;
        planAcc[it.menuKey] = value ? 1 : 0;
        if (it.to) planAcc[it.to] = value ? 1 : 0;
        (SUB_TABS_BY_PATH[it.to] || []).forEach(st => { planAcc[`${it.to}::${st.id}`] = value ? 1 : 0; });
      }
      return { ...prev, [planId]: planAcc };
    });
    setAccessDirty(true);
  };

  const saveAllAccess = async () => {
    setSaving('access');
    try {
      for (const p of plans) {
        // 186차 sync 버그 수정: menu_tree(DB, 비어있을 수 있음)가 아닌 실제 선택 상태(access)를 저장.
        // → 요금 기반 추천/체크박스로 설정한 모든 키(대/중/하위/서브탭)가 그대로 반영됨.
        const acc = access[p.plan_id] || {};
        const menusForPlan = {};
        for (const key of Object.keys(acc)) menusForPlan[key] = acc[key] ? 1 : 0;
        await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(p.plan_id)}/menu-access`, 'PUT', { menus: menusForPlan });
      }
      await fetchMenuAccess();
      publishMenuAccessSync({ source: 'menu_access_bulk' });
      alert('메뉴 접근 권한 저장 완료 — 요금 기반 추천 포함 모든 user sidebar 자동 갱신');
    } catch (e) {
      alert(`저장 실패: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
  };

  /**
   * 181차 — 요금 기반 메뉴접근 추천.
   * 관리자가 등록한 플랜별 월 요금(starter/pro/enterprise) 차이에 비례해
   * AI(정본 등급 가중) 가 메뉴 접근 권한을 누적 배분하고, 토글에 채워준다.
   * (관리자는 채워진 토글을 자유 수정 후 [저장] 가능 — 즉시 적용 아님)
   */
  const priceOf = useCallback((planId) => {
    const pp = basePeriods(periodPricing[planId]); // 186차: base seat 기준
    // 1개월 기준가 우선, 없으면 최소 기간의 가격
    const m1 = pp[1]?.price_usd;
    if (m1 != null && m1 !== '') return Number(m1) || 0;
    const months = Object.keys(pp).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
    for (const mo of months) { const v = pp[mo]?.price_usd; if (v != null && v !== '') return Number(v) || 0; }
    return 0;
  }, [periodPricing]);

  // 186차: menuKey → 그 메뉴의 모든 계층 키(menuKey + 하위메뉴 라우트 + 서브탭) — 추천 cascade용
  const expandMenuKeyAllLevels = useCallback((mk) => {
    const keys = [mk];
    for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) for (const it of (sec.items || [])) {
      if (it.menuKey === mk) {
        if (it.to) keys.push(it.to);
        (SUB_TABS_BY_PATH[it.to] || []).forEach(st => keys.push(`${it.to}::${st.id}`));
      }
    }
    return keys;
  }, []);

  const recommendMenuAccess = () => {
    // 요청: 1개월 요금 + 1계정(base seat) 기준으로 플랜 비교 → 메뉴접근 추천. 계정수와 무관하게 플랜별 동일 적용.
    const prices = { starter: priceOf('starter'), pro: priceOf('pro'), enterprise: priceOf('enterprise') };
    if (!prices.starter && !prices.pro && !prices.enterprise) {
      alert('먼저 각 플랜의 1개월(월간) 구독 요금을 등록해 주세요.\n등록된 요금(1개월·1계정 기준)을 비교 평가해 메뉴 접근을 추천합니다.');
      return;
    }
    // 추천 대상 menuKey = 사이드바 manifest 의 회원 메뉴(MEMBER_MENU) — admin 전용 제외
    const memberMenuKeys = [...new Set(MEMBER_MENU.flatMap(s => (s.items || []).map(it => it.menuKey).filter(Boolean)))];
    const rec = recommendMenuAccessByPrice(prices, memberMenuKeys);
    setAccess(prev => {
      const next = { ...prev };
      for (const planId of ['starter', 'pro', 'enterprise']) {
        const allowMenuKeys = rec[planId] || [];
        const planAcc = {};
        // 추천된 menuKey + 그 하위메뉴·서브탭 까지 cascade ON (계층 일관성)
        for (const mk of allowMenuKeys) for (const k of expandMenuKeyAllLevels(mk)) planAcc[k] = 1;
        next[planId] = planAcc; // 계정수 무관 — 플랜별 동일 적용
      }
      return next;
    });
    setAccessDirty(true);
    alert(
      `요금 기반 메뉴접근 추천 적용됨 — 1개월·1계정 요금 기준 (검토 후 [저장])\n` +
      `· Starter $${prices.starter}/월 → ${rec.starter.length}개 메뉴\n` +
      `· Pro $${prices.pro}/월 → ${rec.pro.length}개 메뉴\n` +
      `· Enterprise $${prices.enterprise}/월 → ${rec.enterprise.length}개 메뉴\n` +
      `(상위 플랜은 하위 포함 · 계정수 무관 동일 적용 · 대/중/하위/서브탭 토글 수정 가능)`
    );
  };

  /**
   * updateField — 172차에서 plan_config 가격 필드는 plan_period_pricing 의 derived view 가 됨.
   * 본 함수는 plan_config 의 non-price 속성만 수정 (name/description/features/limits/flags/display_order).
   * 가격 자동 산출 로직은 updatePeriodField 가 담당.
   */
  const updateField = (idx, patch) => {
    setPlans(prev => prev.map((p, i) => (i !== idx ? p : { ...p, ...patch })));
  };

  const updateFeature = (planIdx, fIdx, value) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== planIdx) return p;
      const features = [...(p.features || [])];
      features[fIdx] = value;
      return { ...p, features };
    }));
  };

  const addFeature = (planIdx) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, features: [...(p.features || []), '새 기능 항목'] } : p));
  };

  const removeFeature = (planIdx, fIdx) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, features: (p.features || []).filter((_, j) => j !== fIdx) } : p));
  };

  const updateLimit = (planIdx, key, val) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, limits: { ...(p.limits || {}), [key]: val === '' ? null : Number(val) } } : p));
  };

  /**
   * savePlan — 172차 통합 저장.
   * 1) PUT /v424/admin/plans/{id}        — plan 정의 (name/desc/features/limits/flags)
   * 2) PUT /v424/admin/plans/{id}/period-pricing — 모든 기간 가격 (DELETE+INSERT, plan_config legacy 동기화)
   * 두 호출 모두 성공해야 alert. 중간 실패 시 명시. atomic 은 backend 측 transaction 으로 보장.
   */
  /** core — 플랜 정의 + 기간별 가격 PUT 2개만 (alert/fetch 없음, 호출자가 관리) */
  const _savePlanCore = async (plan) => {
    await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(plan.plan_id)}`, 'PUT', {
      name: plan.name,
      description: plan.description,
      price_usd: plan.price_usd ?? null,
      price_annual_usd: plan.price_annual_usd ?? null,
      price_id_monthly: plan.price_id_monthly ?? '',
      price_id_annual: plan.price_id_annual ?? '',
      discount_pct: plan.discount_pct ?? 20,
      features: plan.features || [],
      limits: plan.limits || {},
      display_order: plan.display_order || 0,
      is_active: plan.is_active !== false,
      is_custom_quote: !!plan.is_custom_quote,
      is_recommended: !!plan.is_recommended,
    });
    // 186차: seat 차원 payload — { seatPricing: { seat: { months: cfg } }, seatTiers: [...] }
    const planSeats = periodPricing[plan.plan_id] || {};
    const seatPricingPayload = {};
    for (const seat of Object.keys(planSeats)) {
      const ppForSeat = planSeats[seat] || {};
      const periodsPayload = {};
      for (const m of Object.keys(ppForSeat).map(Number).filter(Number.isFinite)) {
        const cfg = ppForSeat[m] || {};
        periodsPayload[m] = {
          price_usd: cfg.price_usd ?? null,
          discount_pct: cfg.discount_pct ?? 0,
          paddle_price_id: cfg.paddle_price_id ?? '',
          is_active: cfg.is_active !== false,
        };
      }
      if (Object.keys(periodsPayload).length) seatPricingPayload[seat] = periodsPayload;
    }
    await requestJsonAuth(
      `/v424/admin/plans/${encodeURIComponent(plan.plan_id)}/period-pricing`,
      'PUT', { seatPricing: seatPricingPayload, seatTiers },
    );
  };

  const savePlan = async (plan) => {
    if (!plan.plan_id) return;
    setSaving(plan.plan_id);
    try {
      await _savePlanCore(plan);
      await fetchPlans();
      await fetchPeriodPricing();
      publishMenuAccessSync({ plan_id: plan.plan_id, source: 'plan_save' });
      alert(`${plan.name} 저장 완료 (sidebar 자동 갱신)`);
    } catch (e) {
      alert(`저장 실패: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
  };

  /** 단일 플랜 메뉴 접근 저장 (플랜 중심 통합 워크스페이스 STEP3 전용) */
  const saveOnePlanAccess = async (planId) => {
    // 186차 sync 버그 수정: 빈 menu_tree 대신 실제 선택 상태(access)를 저장
    const acc = access[planId] || {};
    const menusForPlan = {};
    for (const key of Object.keys(acc)) menusForPlan[key] = acc[key] ? 1 : 0;
    await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(planId)}/menu-access`, 'PUT', { menus: menusForPlan });
  };

  /**
   * savePlanFull — 179차 플랜 중심 통합 저장.
   * 한 번의 [💾 이 플랜 저장] 으로 ① 플랜 정의 ② 기간별 가격 ③ 제공 메뉴·기능 권한을 모두 반영.
   * 모든 user sidebar 가 즉시 갱신되도록 동기화 이벤트 발행(게이팅 누락 방지 — item5).
   */
  const savePlanFull = async (plan) => {
    if (!plan?.plan_id) return;
    setSaving(plan.plan_id);
    try {
      await _savePlanCore(plan);          // 정의 + 기간별 가격
      await saveOnePlanAccess(plan.plan_id); // 제공 메뉴·기능
      await Promise.all([fetchPlans(), fetchPeriodPricing(), fetchMenuAccess()]);
      publishMenuAccessSync({ plan_id: plan.plan_id, source: 'plan_full_save' });
      alert(`✅ ${plan.name} 저장 완료 — 요금·제공 메뉴·기능이 모든 user sidebar 에 즉시 반영됩니다`);
    } catch (e) {
      alert(`저장 실패: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
  };

  /** 새 플랜 추가 — admin 이 plan_id/이름 입력 후 빈 플랜 생성 */
  const addNewPlan = async () => {
    const planId = window.prompt('새 플랜 ID (영문 소문자, 예: business)');
    if (!planId) return;
    const id = String(planId).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!id) { alert('유효한 plan ID 를 입력하세요 (영문/숫자)'); return; }
    if (plans.some(p => p.plan_id === id)) { alert(`'${id}' 플랜이 이미 존재합니다`); return; }
    const name = window.prompt('플랜 표시 이름 (예: Business)', id.charAt(0).toUpperCase() + id.slice(1)) || id;
    try {
      await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(id)}`, 'PUT', {
        name, description: '', price_usd: 0, price_annual_usd: 0,
        features: [], limits: { warehouses: -1, channels: -1, users: -1 },
        display_order: plans.length, is_active: true, is_custom_quote: false, is_recommended: false,
      });
      await fetchPlans();
      setActivePlanIdx(plans.length); // 새 플랜 선택
      publishMenuAccessSync({ plan_id: id, source: 'plan_add' });
      alert(`✅ '${name}' 플랜이 추가되었습니다. 이제 요금과 제공 메뉴·기능을 설정하세요.`);
    } catch (e) {
      alert(`플랜 추가 실패: ${e?.message || e}`);
    }
  };

  const seedDefaults = async () => {
    if (!window.confirm('초기 3 플랜 (Starter/Pro/Enterprise) 을 등록합니다. 진행할까요?')) return;
    for (const p of SEED_PLANS) {
      try {
        await requestJsonAuth(`/v424/admin/plans/${p.plan_id}`, 'PUT', p);
      } catch (e) { console.error('seed', p.plan_id, e); }
    }
    await fetchPlans();
    publishMenuAccessSync({ source: 'seed' });
    alert('초기 시드 완료 (sidebar 자동 갱신)');
  };

  const archivePlan = async (plan) => {
    if (!window.confirm(`${plan.name} 을 비활성화합니다. 진행할까요?`)) return;
    try {
      await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(plan.plan_id)}`, 'DELETE');
      await fetchPlans();
    } catch (e) {
      alert(`비활성화 실패: ${e?.message || e}`);
    }
  };

  const cardStyle = {
    borderRadius: 14, padding: '16px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  };
  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)', color: 'var(--text-1)',
    fontSize: 14, fontFamily: 'inherit',
  };

  const plan = plans[activePlanIdx];

  // 186차: 관리자 세션 유실 시 — raw 401 에러배너 대신 명확한 재로그인 안내
  if (authLost) {
    const relogin = () => {
      try {
        ['genie_token', 'demo_genie_token', 'genie_user', 'demo_genie_user'].forEach(k => localStorage.removeItem(k));
      } catch {}
      window.location.href = '/login';
    };
    return (
      <div style={{ padding: '60px 24px', minHeight: '100%', color: 'var(--text-1)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{
          maxWidth: 460, width: '100%', textAlign: 'center', padding: '36px 32px', borderRadius: 16,
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.22)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>관리자 재로그인이 필요합니다</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 22 }}>
            관리자 세션이 만료되었거나 로그인되지 않았습니다.<br />
            로그인 화면에서 <strong>로고를 클릭</strong> → 접속 코드 입력 후 관리자 계정으로 다시 로그인해 주세요.
          </div>
          <button onClick={relogin} style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff',
            fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}>🔐 관리자 로그인으로 이동</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '18px 24px', minHeight: '100%', color: 'var(--text-1)' }}>
      <div style={{
        borderRadius: 14, padding: '16px 20px', marginBottom: 14,
        background: 'rgba(34,197,94,0.10)',
        border: '1px solid rgba(34,197,94,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>💳</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>플랜별 구독요금 설정</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                USD 단일 · Paddle MoR · 카드 결제 전용
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.open('https://vendors.paddle.com/products-v2', '_blank')} style={{
              padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>🔗 Paddle Dashboard</button>
            {plans.length === 0 && !loading && (
              <button onClick={seedDefaults} style={{
                padding: '10px 16px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}>🌱 초기 3 플랜 등록</button>
            )}
            <button onClick={fetchPlans} style={{
              padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>🔄 새로고침</button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.20)',
          color: '#f87171', fontSize: 13,
        }}>⚠ 플랜 조회 실패 — {error}</div>
      )}

      {/* 179차 — 관리자 설정 순서 가이드 (무엇을 먼저 할지 명확화) */}
      {outerTab === 'plan' && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 12, padding: '7px 12px', borderRadius: 9, flexWrap: 'wrap', alignItems: 'center',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#93c5fd', whiteSpace: 'nowrap' }}>📌 설정 순서</span>
          {[
            { n: '①', t: '플랜 선택 또는 ＋추가' },
            { n: '②', t: '구독 요금 설정 (USD)' },
            { n: '③', t: '제공할 메뉴·기능 선택' },
            { n: '④', t: '💾 저장 → 즉시 반영' },
          ].map((s, i) => (
            <span key={i} style={{ fontSize: 12, color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 900, color: '#fde047' }}>{s.n}</span>{s.t}
              {i < 3 && <span style={{ color: '#64748b', margin: '0 1px' }}>→</span>}
            </span>
          ))}
        </div>
      )}

      {/* outer tab */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {[
          { id: 'plan',        label: '💰 플랜별 설정 (요금 + 제공 메뉴·기능)' },
          { id: 'permissions', label: '🔐 메뉴 접근 권한 (전 플랜 비교)' },
          { id: 'coupons',     label: '🎟️ 쿠폰 관리' },
        ].map(tb => {
          const active = outerTab === tb.id;
          return (
            <button key={tb.id} onClick={() => setOuterTab(tb.id)} style={{
              padding: '13px 24px', border: 'none',
              // 활성: 찐한 파랑 배경 + 노랑 텍스트 (최대 가시성, 172차 p4)
              background: active ? '#1e3a8a' : 'transparent',
              color: active ? '#fde047' : '#cbd5e1',
              fontSize: 15, fontWeight: active ? 900 : 600, cursor: 'pointer',
              borderBottom: active ? '3px solid #fde047' : '3px solid transparent',
              borderRadius: active ? '8px 8px 0 0' : 0,
              marginBottom: -1,
              transition: 'all 150ms',
            }}>{tb.label}</button>
          );
        })}
      </div>

      {outerTab === 'permissions' && (
        <MenuAccessTree
          plans={plans} menus={menus} access={access}
          setMenuAccess={setMenuAccess} setMenuAccessBulk={setMenuAccessBulk}
          togglePlanAll={togglePlanAll}
          saveAllAccess={saveAllAccess} saving={saving === 'access'} dirty={accessDirty}
          recommendMenuAccess={recommendMenuAccess}
        />
      )}

      {outerTab === 'coupons' && <CouponAdminPanel plans={plans} />}

      {outerTab === 'plan' && <ServiceDescriptionCard />}
      {outerTab === 'plan' && menuPricingSync && (
        <MenuPricingSyncPanel
          sync={menuPricingSync}
          onApply={applyRecommendedPrice}
          applying={pricingSyncApplying}
        />
      )}

      {outerTab === 'plan' && loading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
          플랜 목록 로딩 중…
        </div>
      )}

      {outerTab === 'plan' && !loading && plans.length === 0 && !error && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>등록된 플랜이 없습니다</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            상단 "초기 3 플랜 등록" 으로 Starter/Pro/Enterprise 기본값을 생성하세요
          </div>
        </div>
      )}

      {outerTab === 'plan' && !loading && plans.length > 0 && (
        <>
          {/* ① 플랜 선택 — 카드로 한눈에 (가격 + 제공 메뉴 수 + ⭐추천) + ＋추가 */}
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            ① 플랜 선택
          </div>
          <div style={{
            display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap',
          }}>
            {plans.map((p, i) => {
              const sel = activePlanIdx === i;
              const onCount = Object.values(access[p.plan_id] || {}).filter(Boolean).length;
              const m1 = basePeriods(periodPricing[p.plan_id])?.[1]?.price_usd ?? p.price_usd;
              const priceLabel = p.is_custom_quote ? '맞춤 견적'
                : (m1 != null && m1 !== '' ? `$${m1}/월` : '미설정');
              return (
              <button key={p.plan_id} onClick={() => setActivePlanIdx(i)} style={{
                flex: '1 1 180px', minWidth: 180, padding: '14px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                textAlign: 'left',
                background: sel ? '#1e3a8a' : 'rgba(255,255,255,0.06)',
                color: sel ? '#fde047' : '#e2e8f0',
                boxShadow: sel ? '0 0 0 2px #fde047 inset' : '0 0 0 1px rgba(255,255,255,0.10) inset',
                transition: 'all 150ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: sel ? 900 : 800, color: sel ? '#fde047' : '#f1f5f9' }}>
                  {(p.is_recommended === true || p.is_recommended === 1) && <span style={{ fontSize: 12 }}>⭐</span>}
                  {p.name || p.plan_id}
                  {p.is_active === false && <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>(비활성)</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6, color: sel ? '#fff' : '#cbd5e1' }}>{priceLabel}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: sel ? '#e0e7ff' : '#94a3b8' }}>제공 메뉴 {onCount}개</div>
              </button>
              );
            })}
            <button onClick={addNewPlan} style={{
              flex: '0 0 auto', minWidth: 120, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
              border: '1px dashed rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.06)',
              color: '#22c55e', fontSize: 14, fontWeight: 800,
            }}>＋ 새 플랜 추가</button>
          </div>

          {plan && (<>
            {/* ②③ 플랜 정의 & 구독 요금 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18, alignItems: 'start',
            }}>
              {/* 좌측 — 플랜 정의 (가격 제외 / name/desc/features/limits/flags) */}
              <div style={{ ...cardStyle, padding: '22px 24px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                  📋 플랜 정의
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <Field label="Plan ID (immutable)"><input value={plan.plan_id} disabled style={{ ...inputStyle, opacity: 0.6 }} /></Field>
                  <Field label="이름"><input value={plan.name || ''} onChange={e => updateField(activePlanIdx, { name: e.target.value })} style={inputStyle} /></Field>
                </div>
                <Field label="설명"><textarea value={plan.description || ''} onChange={e => updateField(activePlanIdx, { description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>기능 목록</div>
                  {(plan.features || []).map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input value={f} onChange={e => updateFeature(activePlanIdx, i, e.target.value)} style={inputStyle} />
                      <button onClick={() => removeFeature(activePlanIdx, i)} style={{
                        padding: '0 12px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)',
                        background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 13, cursor: 'pointer',
                      }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => addFeature(activePlanIdx)} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px dashed rgba(99,102,241,0.3)',
                    background: 'transparent', color: '#a5b4fc', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4,
                  }}>＋ 기능 추가</button>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>한도 (Limits) · -1 = 무제한</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {['warehouses', 'channels', 'users'].map(key => (
                      <Field key={key} label={key}>
                        <input type="number" value={plan.limits?.[key] ?? ''} onChange={e => updateLimit(activePlanIdx, key, e.target.value)} style={inputStyle} />
                      </Field>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_custom_quote || false} onChange={e => { const checked = e.target.checked; updateField(activePlanIdx, { is_custom_quote: checked }); if (!checked) autoGenDefaultPeriods(plan.plan_id); }} /> 맞춤 견적 (Enterprise)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_active !== false} onChange={e => updateField(activePlanIdx, { is_active: e.target.checked })} /> 활성
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_recommended === true || plan.is_recommended === 1} onChange={e => updateField(activePlanIdx, { is_recommended: e.target.checked ? 1 : 0 })} /> ⭐ 추천 플랜
                  </label>
                </div>

                {/* 플랜 비활성화 (저장은 하단 통합 버튼으로 일원화) */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18, padding: '14px 0 0', borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', flex: 1 }}>
                    💡 정의·요금·제공 메뉴를 모두 설정한 뒤 아래 <strong style={{ color: '#22c55e' }}>이 플랜 저장</strong> 한 번으로 반영됩니다
                  </div>
                  <button onClick={() => archivePlan(plan)} style={{
                    padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.25)',
                    background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>플랜 비활성화</button>
                </div>
              </div>

              {/* 우측 — 기간별 가격 매트릭스 + 미리보기 */}
              <div style={{ display: 'grid', gap: 16 }}>
                <PeriodPricingPanel
                  plan={plan}
                  periodPricing={periodPricing}
                  updatePeriodField={updatePeriodField}
                  addPeriod={addPeriod}
                  removePeriod={removePeriod}
                  newPeriodInput={newPeriodInput}
                  setNewPeriodInput={setNewPeriodInput}
                  seatTiers={seatTiers}
                  addSeatTier={addSeatTier}
                  removeSeatTier={removeSeatTier}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>실시간 미리보기</div>
                  <PreviewCard plan={plan} periods={basePeriods(periodPricing[plan.plan_id])} />
                </div>
              </div>
            </div>

            {/* ③ 이 플랜이 제공하는 메뉴 & 기능 (제공 서비스 범위) */}
            <div style={{ marginTop: 18 }}>
              <PlanMenuAccessEditor
                plan={plan}
                menus={menus}
                planAcc={access[plan.plan_id] || {}}
                setMenuAccess={setMenuAccess}
                setMenuAccessBulk={setMenuAccessBulk}
                togglePlanAll={togglePlanAll}
                menuScores={menuPricingSync?.menuScores || {}}
                monthlyPrice={basePeriods(periodPricing[plan.plan_id])?.[1]?.price_usd ?? plan.price_usd}
              />
            </div>

            {/* 186차 — 구독자에게 보일 '제공 서비스 상세 안내' (초고도화, 구버전 PLAN_RECOMMEND_REASON 기반) */}
            <div style={{ marginTop: 18 }}>
              <PlanServiceGuide planId={plan.plan_id} defaultOpen={false} />
            </div>
            {/* 실제 선택된 메뉴접근 기반 제공 서비스 (admin 설정 반영 미리보기) */}
            <div style={{ marginTop: 12 }}>
              <AdminPlanServiceDetail plan={plan} planAcc={access[plan.plan_id] || {}} />
            </div>

            {/* ④ 통합 저장 — 요금 + 제공 메뉴·기능 한 번에 */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 14, alignItems: 'center',
              marginTop: 18, padding: '16px 18px', borderRadius: 12,
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, minWidth: 200 }}>
                ④ 저장하면 <strong>요금 · 제공 메뉴 · 기능</strong>이 모든 사용자 sidebar 에 <strong style={{ color: '#22c55e' }}>즉시 반영</strong>됩니다 (회원가입·결제 가격과도 동기화)
              </span>
              <button onClick={() => savePlanFull(plan)} disabled={saving === plan.plan_id} style={{
                padding: '14px 32px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff',
                fontSize: 15, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
                opacity: saving === plan.plan_id ? 0.6 : 1,
              }}>{saving === plan.plan_id ? '저장 중…' : `💾 ${plan.name || '이 플랜'} 저장`}</button>
            </div>
          </>)}
        </>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

/**
 * 요금($/월) → 추천 메뉴 tier 매핑.
 * 관리자가 자율 입력한 월 요금에 따라 어떤 카테고리(core/standard/premium/enterprise)까지
 * 제공할지 자동 산출. 임계값은 구버전 요금표(Growth $49 / Pro $99 / Enterprise $299) 기준.
 */
function tiersForPrice(priceUsd, isCustomQuote) {
  if (isCustomQuote) return { tiers: ['core', 'standard', 'premium', 'enterprise'], label: '맞춤 견적 — 전체 제공' };
  const p = Number(priceUsd);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (p < 30)   return { tiers: ['core'], label: 'Starter급 — 핵심 기능' };
  if (p < 80)   return { tiers: ['core', 'standard'], label: 'Growth급 — 핵심 + 표준' };
  if (p < 200)  return { tiers: ['core', 'standard', 'premium'], label: 'Pro급 — 핵심 + 표준 + 프리미엄' };
  return { tiers: ['core', 'standard', 'premium', 'enterprise'], label: 'Enterprise급 — 전체 기능' };
}

/**
 * PlanMenuAccessEditor — 179차 플랜 중심 워크스페이스 STEP③.
 * 선택 플랜이 "어떤 메뉴·기능(서비스)을 제공하는지" 섹션별 체크리스트로 쉽게 설정.
 * + 관리자 입력 요금($/월) 기반 실시간 메뉴 자동추천 (카테고리 tier 매핑).
 * 기존 access 상태/핸들러 재사용 → 저장은 상위 savePlanFull 이 일괄 처리.
 */
function PlanMenuAccessEditor({ plan, menus, planAcc, setMenuAccess, setMenuAccessBulk, togglePlanAll, menuScores = {}, monthlyPrice }) {
  const t = useT();
  const sections = useMemo(() => [...MEMBER_MENU, ...ADMIN_MENU], []);
  // 186차: menu_tree(DB) 비어도 plan_menu_access 는 menu_key 로 저장 → menu_tree 비면 manifest 전체 키 허용
  const dbMenuKeys = useMemo(() => {
    if (menus.length) return new Set(menus.map(m => m.menu_key || m.id));
    const s = new Set();
    for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) for (const it of (sec.items || [])) if (it.menuKey) s.add(it.menuKey);
    return s;
  }, [menus]);
  const isOn = (mk) => !!planAcc[mk];
  const catOf = (mk) => menuScores[mk]?.category || 'standard'; // 미점수 메뉴는 standard 로 간주
  const sectionGroups = (section) => {
    const seen = new Map();
    for (const it of section.items || []) {
      if (!it.menuKey) continue;
      if (!seen.has(it.menuKey)) seen.set(it.menuKey, { menuKey: it.menuKey, items: [] });
      seen.get(it.menuKey).items.push(it);
    }
    return [...seen.values()];
  };
  const labelOf = (grp) => MENU_KEY_LABEL[grp.menuKey]?.title || t(grp.items[0]?.labelKey, grp.items[0]?.labelKey) || grp.menuKey;
  const totalOn = Object.values(planAcc).filter(Boolean).length;

  // 모든 저장가능 menuKey (manifest ∩ DB, dedup)
  const allKeys = useMemo(() => {
    const s = new Set();
    for (const sec of sections) for (const it of (sec.items || [])) {
      if (it.menuKey && dbMenuKeys.has(it.menuKey)) s.add(it.menuKey);
    }
    return [...s];
  }, [sections, dbMenuKeys]);

  // 요금 기반 추천 — 실시간 (monthlyPrice prop 변경 시 재계산)
  const reco = tiersForPrice(monthlyPrice, plan.is_custom_quote);
  const recommendedKeys = useMemo(() => {
    if (!reco) return null;
    const ts = new Set(reco.tiers);
    return allKeys.filter(k => ts.has(catOf(k)));
  }, [reco && reco.tiers.join(','), allKeys, menuScores]);
  const recoSet = useMemo(() => new Set(recommendedKeys || []), [recommendedKeys]);

  const applyRecommend = () => {
    if (!recommendedKeys) return;
    const recoArr = recommendedKeys;
    const offArr = allKeys.filter(k => !recoSet.has(k));
    setMenuAccessBulk(plan.plan_id, recoArr, true);
    setMenuAccessBulk(plan.plan_id, offArr, false);
  };

  return (
    <div style={{ borderRadius: 14, padding: '18px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase' }}>
            ③ 이 플랜이 제공하는 메뉴 &amp; 기능
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>
            체크한 항목만 <strong style={{ color: 'var(--text-2)' }}>{plan.name || plan.plan_id}</strong> 사용자 sidebar 에 표시 · 현재 <strong style={{ color: '#22c55e' }}>{totalOn}개</strong> 제공
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => togglePlanAll(plan.plan_id, true)} style={{
            padding: '9px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>✓ 전체 허용</button>
          <button onClick={() => togglePlanAll(plan.plan_id, false)} style={{
            padding: '9px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.10)', color: '#f87171',
            border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>✗ 전체 해제</button>
        </div>
      </div>

      {/* 요금 기반 실시간 추천 배너 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '12px 16px', borderRadius: 10, flexWrap: 'wrap',
        background: reco ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)',
        border: reco ? '1px solid rgba(250,204,21,0.25)' : '1px dashed rgba(255,255,255,0.12)',
      }}>
        <span style={{ fontSize: 18 }}>💡</span>
        {reco ? (
          <>
            <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: 'var(--text-2)' }}>
              입력한 요금 <strong style={{ color: '#fde047' }}>${monthlyPrice}/월</strong> → <strong>{reco.label}</strong> · 권장 <strong style={{ color: '#22c55e' }}>{recommendedKeys.length}개</strong> 메뉴
            </div>
            <button onClick={applyRecommend} style={{
              padding: '9px 18px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#eab308,#facc15)', color: '#1a1a1a',
              fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>요금 기준 추천 적용</button>
          </>
        ) : (
          <div style={{ flex: 1, fontSize: 13, color: 'var(--text-3)' }}>
            ② 구독 요금(USD)을 입력하면, 요금에 맞는 메뉴 구성을 자동으로 추천합니다.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {sections.map(section => {
          const groups = sectionGroups(section);
          if (!groups.length) return null;
          const keys = groups.filter(g => dbMenuKeys.has(g.menuKey)).map(g => g.menuKey);
          const onCnt = groups.filter(g => isOn(g.menuKey)).length;
          const sectionLabel = t(section.labelKey, section.labelKey.split('.').pop());
          return (
            <div key={section.key} style={{
              borderRadius: 10, padding: '12px 14px',
              background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14 }}>{section.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', flex: 1 }}>{sectionLabel}</span>
                <span style={{ fontSize: 11, color: onCnt === groups.length ? '#22c55e' : 'var(--text-3)', fontWeight: 700 }}>{onCnt}/{groups.length}</span>
                <button onClick={() => setMenuAccessBulk(plan.plan_id, keys, true)} title="섹션 전체 허용" style={{
                  padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.25)',
                  background: 'transparent', color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>＋</button>
                <button onClick={() => setMenuAccessBulk(plan.plan_id, keys, false)} title="섹션 전체 해제" style={{
                  padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.25)',
                  background: 'transparent', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>－</button>
              </div>
              {groups.map(g => {
                const on = isOn(g.menuKey);
                const saveable = dbMenuKeys.has(g.menuKey);
                const recommended = recoSet.has(g.menuKey);
                return (
                  <label key={g.menuKey} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7,
                    cursor: saveable ? 'pointer' : 'not-allowed', opacity: saveable ? 1 : 0.45,
                    background: on ? 'rgba(34,197,94,0.08)' : 'transparent',
                  }}>
                    <input type="checkbox" checked={on} disabled={!saveable}
                      onChange={e => setMenuAccess(plan.plan_id, g.menuKey, e.target.checked)} />
                    <span style={{ fontSize: 13, color: on ? 'var(--text-1)' : 'var(--text-2)', flex: 1 }}>{labelOf(g)}</span>
                    {recommended && !on && <span title="요금 기준 권장" style={{ fontSize: 11 }}>💡</span>}
                    {g.items.length > 1 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{g.items.length}p</span>}
                    {!saveable && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>읽기전용</span>}
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 186차 — AdminPlanServiceDetail
 * admin plan 탭에서 '이 플랜 구독자가 받을 제공 서비스 상세'를 미리보기(구버전 참고).
 * planAcc(메뉴 접근) → MENU_KEY_LABEL 설명 + plan.features.
 */
function AdminPlanServiceDetail({ plan, planAcc }) {
  const [open, setOpen] = useState(false);
  const services = [];
  const seen = new Set();
  for (const k of Object.keys(planAcc || {})) {
    if (!planAcc[k]) continue;
    const lbl = MENU_KEY_LABEL[k];
    if (lbl && lbl.title && !seen.has(lbl.title)) { seen.add(lbl.title); services.push(lbl); }
  }
  const featList = (plan.features || []).map(f => (typeof f === 'string' ? f : (f?.text || ''))).filter(Boolean);
  return (
    <div style={{ borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-1)' }}>
        <span style={{ fontSize: 18 }}>📖</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{plan.name || plan.plan_id} 플랜 — 제공 서비스 상세 (구독자 안내 미리보기)</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>이 플랜 구독자가 받을 서비스 {services.length}개 · 구버전식 상세 설명</div>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? '▼ 접기' : '▶ 펼치기'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {featList.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 5 }}>✨ 핵심 혜택</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 6 }}>
                {featList.map((f, i) => (<div key={i} style={{ fontSize: 12, color: 'var(--text-1)', display: 'flex', gap: 6 }}><span style={{ color: '#22c55e' }}>✓</span><span>{f}</span></div>))}
              </div>
            </div>
          )}
          {services.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 5 }}>🧩 이용 가능 서비스 ({services.length})</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 7, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {services.map((s, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{s.title}</div>
                    {s.desc && <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, marginTop: 2 }}>{s.desc}</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>아직 제공 서비스(메뉴 접근)가 선택되지 않았습니다. 위 ③ 또는 🔐 메뉴 접근 권한 탭에서 선택 후 저장하세요.</div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ServiceDescriptionCard — 구버전 Landing 카피 정합.
 * /admin/plan-pricing 진입 시 admin 이 GeniegoROI 가 제공하는 8개 핵심 기능을 한눈에 인지.
 * collapse 토글로 공간 절약.
 */
function ServiceDescriptionCard() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      marginBottom: 12, borderRadius: 12,
      background: 'rgba(99,102,241,0.08)',
      border: '1px solid rgba(99,102,241,0.22)',
      overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start',
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        color: 'var(--text-1)',
      }}>
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>GeniegoROI 서비스 안내</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            올인원 커머스 AI 자동화 — 광고·상품·재고·주문·배송·분석·정산 A~Z 자동화
          </div>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? '▼ 접기' : '▶ 펼치기'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8,
            marginBottom: 10,
          }}>
            {SERVICE_FEATURES.map((f, i) => (
              <div key={i} style={{
                padding: '8px 10px', borderRadius: 8,
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 15 }}>{f.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)' }}>{f.title}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.45 }}>{f.desc}</div>
              </div>
            ))}
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.6,
            background: 'rgba(253,224,71,0.08)', border: '1.5px solid #ca8a04',
            color: 'var(--text-1)',
          }}>
            <strong style={{ color: '#ca8a04', fontSize: 13 }}>📋 플랜별 메뉴 접근 권한 운영 방식</strong>
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: '#ca8a04' }}>🔐 메뉴 접근 권한</strong> 탭에서 플랜(Starter/Pro/Enterprise/Admin)별 8개 영역 세부 메뉴 자유 활성/비활성.
            </div>
            <div style={{ marginTop: 4 }}>
              트리:&nbsp;
              <span style={{ color: '#4f46e5', fontWeight: 800 }}>대메뉴</span> →
              <span style={{ color: '#16a34a', fontWeight: 800, marginLeft: 4 }}>중메뉴</span> →
              <span style={{ color: '#d97706', fontWeight: 800, marginLeft: 4 }}>하위</span> →
              <span style={{ color: '#9333ea', fontWeight: 800, marginLeft: 4 }}>📑 서브탭</span>
              <span style={{ marginLeft: 6 }}>4단계 개별 토글</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MenuAccessTree — 172차 신규.
 *
 * 한 플랜씩 편집하는 2-pane 트리 뷰. 좌측에 sidebar manifest (MEMBER_MENU + ADMIN_MENU) 전체를
 * 섹션 → menuKey 그룹 → leaf 페이지 (서브탭) 까지 모두 노출하여 admin 이 "어떤 메뉴가 포함
 * 되고 어떤 메뉴가 제외되는지" 명확히 식별할 수 있도록 한다. 모든 행에 ➕ 추가 / ➖ 제거 명시적
 * 버튼을 제공하여 토글 실수 회피.
 *
 * 우측 패널: 현재 선택된 menuKey 요약 + 영향받는 leaf 페이지 수 + 저장 액션.
 *
 * 다수 leaf 가 동일 menuKey 를 공유하는 경우 (예: marketing 17개 페이지) 그룹 헤더에 "🔗 17개
 * 페이지 함께 제어됨" 배지로 표시 → admin 이 한 번에 영향받는 범위를 인지.
 */
/**
 * MenuPricingSyncPanel — 172차 Task #22 초고도화 핵심 UI.
 *
 * 각 플랜의 메뉴 권한 → 권장 월 요금 자동 산출. admin 이 한 번 클릭으로 1m 가격 적용,
 * 다른 기간(3/6/12개월 등)은 backend 가 할인율 기반 자동 cascade.
 *
 * 표시:
 *   - 플랜별 현재 가격 vs 권장 가격 + delta + delta %
 *   - 카테고리 분류 breakdown (core / standard / premium / enterprise)
 *   - AI premium 가중치 분리 표시
 *   - tier 분류 자동 제안 (현재 plan_id 와 다르면 경고)
 *   - 라운딩 정책 선택 (정수 / 10단위 / 9끝자리 / 원본)
 *   - 적용 버튼 → 백엔드 PUT /plans/{id}/apply-recommended
 *   - BroadcastChannel 으로 메뉴 권한 탭에서 토글 시 즉시 갱신
 */
function MenuPricingSyncPanel({ sync, onApply, applying }) {
  const [roundTo, setRoundTo] = useState('nearest-9');
  const [open, setOpen] = useState(false); // 179차: 고급 자동추천 — 기본 접힘(혼란 감소)
  // 172차 P1-I — 가중치 편집 모드
  const [editMode, setEditMode] = useState(false);
  const [editedScores, setEditedScores] = useState({}); // { menu_key: { weight_usd, category, ai_premium_pct } }
  const [savingScores, setSavingScores] = useState(false);
  if (!sync?.plans) return null;
  const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalValue = sync.totals?.allMenusValue || 0;

  const updateScore = (menuKey, patch) => {
    setEditedScores(prev => ({ ...prev, [menuKey]: { ...(prev[menuKey] || {}), ...patch } }));
  };
  const saveScores = async () => {
    const dirty = Object.entries(editedScores).filter(([_, p]) => Object.keys(p).length > 0);
    if (dirty.length === 0) { alert('변경사항 없음'); return; }
    setSavingScores(true);
    try {
      // 기존 score 와 merge
      const scores = dirty.map(([menu_key, patch]) => {
        const orig = sync.menuScores.find(s => s.menu_key === menu_key) || {};
        return {
          menu_key,
          weight_usd:     patch.weight_usd     ?? orig.weight_usd     ?? 0,
          category:       patch.category       ?? orig.category       ?? 'standard',
          ai_premium_pct: patch.ai_premium_pct ?? orig.ai_premium_pct ?? 0,
          bundle_count:   orig.bundle_count    ?? 1,
          description:    orig.description     ?? '',
        };
      });
      await requestJsonAuth('/v424/admin/menu-value-score', 'PUT', { scores });
      setEditedScores({});
      setEditMode(false);
      // sync data refetch
      try { new BroadcastChannel(tChannelName('geniego_menu_access_sync')).postMessage({ type: 'menu_access_updated', source: 'weight_edit', ts: Date.now() }); } catch {}
      alert(`${dirty.length}개 가중치 저장 완료. 권장가 자동 재계산.`);
    } catch (e) { alert(`저장 실패: ${e?.message || e}`); }
    finally { setSavingScores(false); }
  };
  return (
    <div style={{
      marginBottom: 14, borderRadius: 12,
      background: 'rgba(168,85,247,0.06)', border: '1.5px solid rgba(168,85,247,0.28)',
      overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        color: 'var(--text-1)',
      }}>
        <span style={{ fontSize: 18 }}>📊</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>메뉴 권한 → 권장 요금 자동 산출 <span style={{ fontSize: 11, color: '#9333ea', fontWeight: 700 }}>초고도화</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            각 메뉴의 가치 가중치 합 + AI premium → 플랜별 권장 월 요금. 전체 메뉴 가치 합 ${fmt(totalValue)}/월.
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); setEditMode(m => !m); }} style={{
          padding: '5px 12px', borderRadius: 6, border: 'none',
          background: editMode ? '#1e3a8a' : 'rgba(168,85,247,0.18)',
          color: editMode ? '#fde047' : '#9333ea', fontSize: 11, fontWeight: 800, cursor: 'pointer',
          marginRight: 8,
        }}>{editMode ? '✓ 편집 모드 종료' : '💎 가중치 편집'}</button>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? '▼ 접기' : '▶ 펼치기'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          {/* 172차 P1-I — 가중치 편집 모드 */}
          {editMode && (
            <div style={{
              marginBottom: 12, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(168,85,247,0.05)', border: '1.5px solid rgba(168,85,247,0.28)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#9333ea' }}>💎 메뉴 가치 가중치 편집</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  각 menuKey 의 weight_usd / category / AI premium 변경. 저장 즉시 권장가 재계산.
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={saveScores} disabled={savingScores || Object.keys(editedScores).length === 0} style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none',
                  background: Object.keys(editedScores).length > 0 ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : 'rgba(255,255,255,0.06)',
                  color: Object.keys(editedScores).length > 0 ? '#fff' : 'var(--text-3)',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  opacity: savingScores ? 0.6 : 1,
                }}>{savingScores ? '저장 중…' : `💾 저장 (${Object.keys(editedScores).length}개)`}</button>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-3)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>menuKey</th>
                      <th style={{ padding: '6px 8px', width: 110 }}>weight $</th>
                      <th style={{ padding: '6px 8px', width: 130 }}>category</th>
                      <th style={{ padding: '6px 8px', width: 100 }}>AI premium %</th>
                      <th style={{ padding: '6px 8px' }}>description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sync.menuScores.map(s => {
                      const ed = editedScores[s.menu_key] || {};
                      const weight = ed.weight_usd ?? s.weight_usd;
                      const cat = ed.category ?? s.category;
                      const ai = ed.ai_premium_pct ?? s.ai_premium_pct;
                      const dirty = Object.keys(ed).length > 0;
                      return (
                        <tr key={s.menu_key} style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: dirty ? 'rgba(168,85,247,0.06)' : 'transparent',
                        }}>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10 }}>{s.menu_key}</td>
                          <td style={{ padding: '4px 6px' }}>
                            <input type="number" step="0.5" min="0" value={weight}
                              onChange={e => updateScore(s.menu_key, { weight_usd: Number(e.target.value) })}
                              style={{ width: 80, padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--text-1)', fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <select value={cat} onChange={e => updateScore(s.menu_key, { category: e.target.value })}
                              style={{ width: 110, padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--text-1)', fontSize: 11 }}>
                              <option value="core">core</option>
                              <option value="standard">standard</option>
                              <option value="premium">premium</option>
                              <option value="enterprise">enterprise</option>
                            </select>
                          </td>
                          <td style={{ padding: '4px 6px' }}>
                            <input type="number" step="5" min="0" max="100" value={ai}
                              onChange={e => updateScore(s.menu_key, { ai_premium_pct: Number(e.target.value) })}
                              style={{ width: 70, padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', color: 'var(--text-1)', fontSize: 11 }} />
                          </td>
                          <td style={{ padding: '4px 8px', color: 'var(--text-3)', fontSize: 10 }}>{s.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
            padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.06)',
            marginBottom: 10, fontSize: 12,
          }}>
            <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>라운딩 정책:</span>
            {[
              { id: 'integer',    label: '정수 (예: $147)' },
              { id: 'nearest-10', label: '10단위 (예: $150)' },
              { id: 'nearest-9',  label: '9끝자리 (예: $149)' },
              { id: 'raw',        label: '원본 (소수점)' },
            ].map(r => (
              <button key={r.id} onClick={() => setRoundTo(r.id)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: 'pointer',
                background: roundTo === r.id ? '#1e3a8a' : 'rgba(255,255,255,0.04)',
                color: roundTo === r.id ? '#fde047' : 'var(--text-2)',
                border: roundTo === r.id ? '1px solid #fde047' : '1px solid rgba(255,255,255,0.08)',
              }}>{r.label}</button>
            ))}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: `repeat(${Math.min(sync.plans.length, 4)}, 1fr)`, gap: 10,
          }}>
            {sync.plans.map(p => {
              const isCustom = p.is_custom_quote;
              const positive = p.delta >= 0;
              const tierMismatch = p.suggestedTier && p.plan_id !== p.suggestedTier
                && !(p.plan_id === 'admin' && p.suggestedTier === 'enterprise');
              return (
                <div key={p.plan_id} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.18)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{p.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{p.plan_id}</span>
                    {isCustom && <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700, background: 'rgba(251,146,60,0.15)', color: '#d97706' }}>맞춤</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>활성 메뉴 {p.enabledCount}개</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8 }}>
                    현재 <strong style={{ color: 'var(--text-1)' }}>${fmt(p.currentMonthly)}</strong>/월
                  </div>
                  <div style={{
                    padding: '6px 10px', borderRadius: 6, marginBottom: 6,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>권장 월 요금</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>${fmt(p.recommendedMonthly)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                      기본 ${fmt(p.baseSum)} + AI premium ${fmt(p.aiPremiumAdded)}
                    </div>
                  </div>
                  {/* delta */}
                  {!isCustom && (
                    <div style={{
                      fontSize: 11, fontWeight: 700, marginBottom: 6,
                      color: positive ? '#16a34a' : '#dc2626',
                    }}>
                      {positive ? '↑' : '↓'} ${fmt(Math.abs(p.delta))}
                      {p.deltaPct !== null && <span style={{ marginLeft: 4 }}>({positive ? '+' : ''}{p.deltaPct}%)</span>}
                      <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: 4 }}>vs 현재</span>
                    </div>
                  )}
                  {/* category breakdown bar */}
                  <div style={{ display: 'grid', gap: 2, marginBottom: 6, fontSize: 10 }}>
                    {[
                      { k: 'core',       label: 'Core',       color: '#94a3b8' },
                      { k: 'standard',   label: 'Standard',   color: '#4f46e5' },
                      { k: 'premium',    label: 'Premium',    color: '#16a34a' },
                      { k: 'enterprise', label: 'Enterprise', color: '#9333ea' },
                    ].map(cat => p.categoryBreakdown?.[cat.k] > 0 && (
                      <div key={cat.k} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color }} />
                        <span style={{ color: 'var(--text-3)', minWidth: 64 }}>{cat.label}</span>
                        <span style={{ color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 10 }}>
                          ${fmt(p.categoryBreakdown[cat.k])}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* tier 분류 제안 */}
                  {tierMismatch && (
                    <div style={{
                      fontSize: 10, padding: '4px 8px', borderRadius: 4,
                      background: 'rgba(251,146,60,0.10)', border: '1px solid rgba(251,146,60,0.25)',
                      color: '#d97706', marginBottom: 6,
                    }}>
                      💡 tier 분류 제안: <strong>{p.suggestedTier}</strong>
                    </div>
                  )}
                  {/* 적용 버튼 */}
                  {!isCustom && (
                    <button
                      onClick={() => onApply(p.plan_id, roundTo)}
                      disabled={applying === p.plan_id || p.delta === 0}
                      style={{
                        width: '100%', padding: '7px 12px', borderRadius: 7, border: 'none',
                        background: p.delta === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#7c3aed,#9333ea)',
                        color: p.delta === 0 ? 'var(--text-3)' : '#fff',
                        fontSize: 12, fontWeight: 800,
                        cursor: (applying === p.plan_id || p.delta === 0) ? 'default' : 'pointer',
                        opacity: applying === p.plan_id ? 0.6 : 1,
                      }}
                      title={`권장가 $${fmt(p.recommendedMonthly)} 를 1m 가격에 적용 + 다른 기간 자동 산출`}
                    >
                      {applying === p.plan_id ? '적용 중…' : (p.delta === 0 ? '✓ 권장가 일치' : '⚡ 권장가 적용')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6, fontSize: 11, lineHeight: 1.6,
            background: 'rgba(0,0,0,0.06)', color: 'var(--text-2)',
          }}>
            💡 <strong>작동 원리</strong>: 각 메뉴의 USD 가치 (관리자 설정) + AI 가중치 합 = 권장 월 요금.
            <strong>🔐 메뉴 접근 권한</strong> 탭에서 메뉴를 추가/제거하면 권장가가 실시간 재계산됩니다.
            <strong>⚡ 권장가 적용</strong> 버튼 클릭 시 1m 가격 → 다른 기간 (3/6/12개월) 자동 cascade (할인율 유지).
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CouponAdminPanel — 172차 P0-C 초고도화.
 *
 * Admin 자율 발행 + 트리거 룰 관리 + 발행 현황. 사용자 명시:
 * "admin 이 자율로 무료 구독 기간 설정 발행 가능".
 *
 * Sections:
 *  ① 트리거 룰 (signup/upgrade/renewal) — on/off + plan/duration 조정
 *  ② 수동 발급 폼 — plan + duration_days + max_uses + email(optional) + quantity (배치)
 *  ③ 발급 통계 + 카테고리 분류
 *  ④ 발급 목록 — 검색 + 상태 필터 + revoke
 */
function CouponAdminPanel({ plans }) {
  const [data, setData] = useState(null); // { ok, rules, stats, recent }
  const [loading, setLoading] = useState(false);
  const [issueForm, setIssueForm] = useState({
    plan: 'starter', duration_days: 30, max_uses: 1, issued_to_email: '', note: '', quantity: 1,
  });
  const [issueResult, setIssueResult] = useState(null);
  const [listFilter, setListFilter] = useState({ status: 'all', q: '' });
  const [listRows, setListRows] = useState([]);

  const planOptions = plans.length > 0
    ? plans.map(p => ({ id: p.plan_id, name: p.name }))
    : [{ id: 'starter', name: 'Starter' }, { id: 'pro', name: 'Pro' }, { id: 'enterprise', name: 'Enterprise' }];

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getJsonAuth('/v424/admin/coupons/overview');
      setData(d);
    } catch (e) {
      console.warn('coupon overview fail:', e?.message || e);
      setData(null);
    } finally { setLoading(false); }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      const q = new URLSearchParams({ status: listFilter.status, q: listFilter.q, limit: '100' });
      const d = await getJsonAuth(`/v424/admin/coupons/list?${q}`);
      setListRows(d?.coupons || []);
    } catch {}
  }, [listFilter]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchList(); }, [fetchList]);

  const updateRule = async (name, patch) => {
    try {
      await requestJsonAuth(`/v424/admin/coupons/rules/${name}`, 'PUT', patch);
      await fetchOverview();
    } catch (e) { alert(`룰 저장 실패: ${e?.message || e}`); }
  };

  const handleIssue = async (e) => {
    e?.preventDefault?.();
    try {
      const result = await requestJsonAuth('/v424/admin/coupons/issue', 'POST', issueForm);
      setIssueResult(result);
      await Promise.all([fetchOverview(), fetchList()]);
    } catch (e) { alert(`발급 실패: ${e?.message || e}`); }
  };

  const revokeCoupon = async (code) => {
    if (!window.confirm(`쿠폰 ${code} 을 무효화하시겠습니까?`)) return;
    try {
      await requestJsonAuth(`/v424/admin/coupons/${encodeURIComponent(code)}/revoke`, 'POST');
      await fetchList();
      await fetchOverview();
    } catch (e) { alert(`무효화 실패: ${e?.message || e}`); }
  };

  const inputS = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.18)',
    color: 'var(--text-1)', fontSize: 13, fontFamily: 'inherit',
  };

  if (loading && !data) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>쿠폰 데이터 로딩 중…</div>;
  const rules = data?.rules || [];
  const stats = data?.stats || {};

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* ① 통계 카드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
      }}>
        {[
          { label: '전체 발급', value: stats.total_coupons || 0, color: '#4f46e5' },
          { label: '미사용 활성', value: stats.active_coupons || 0, color: '#16a34a' },
          { label: '사용 완료', value: stats.redeemed || 0, color: '#d97706' },
          { label: '무효화', value: stats.revoked || 0, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '14px 16px', borderRadius: 10,
            background: `${s.color}10`, border: `1px solid ${s.color}33`,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ② 트리거 룰 카드 */}
      <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.22)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>📌 자동 발급 트리거 룰</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
          signup/upgrade/renewal 이벤트 발생 시 자동 발급. 각 룰 on/off + 플랜/기간 조정 가능.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {rules.map(r => (
            <div key={r.trigger_name} style={{
              padding: '12px 14px', borderRadius: 8,
              background: r.is_active ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${r.is_active ? 'rgba(34,197,94,0.32)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
                  {r.trigger_name === 'signup' ? '🌱 가입' : r.trigger_name === 'upgrade' ? '⬆️ 유료 전환' : '🔄 갱신'}
                </span>
                <div style={{ flex: 1 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!r.is_active} onChange={e => updateRule(r.trigger_name, { is_active: e.target.checked ? 1 : 0 })} />
                  {r.is_active ? '활성' : '비활성'}
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>플랜</div>
                  <select value={r.plan} onChange={e => updateRule(r.trigger_name, { plan: e.target.value })} style={inputS}>
                    {planOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>기간 (일)</div>
                  <input type="number" min="1" max="365" value={r.duration_days}
                    onChange={e => updateRule(r.trigger_name, { duration_days: Number(e.target.value) })}
                    style={inputS} />
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>{r.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ③ 수동 발급 폼 */}
      <form onSubmit={handleIssue} style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'rgba(34,197,94,0.06)', border: '1.5px solid rgba(34,197,94,0.28)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>✨ 수동 쿠폰 발급 (admin 자율)</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          플랜·무료 기간·발급 수량 자유 설정. 코드 자동 생성 (GENIE-XXXXXXXXXX).
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>플랜</div>
            <select value={issueForm.plan} onChange={e => setIssueForm(f => ({ ...f, plan: e.target.value }))} style={inputS}>
              {planOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>무료 기간 (일)</div>
            <input type="number" min="1" max="365" value={issueForm.duration_days}
              onChange={e => setIssueForm(f => ({ ...f, duration_days: Number(e.target.value) || 1 }))}
              style={inputS} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>최대 사용 횟수</div>
            <input type="number" min="1" max="10000" value={issueForm.max_uses}
              onChange={e => setIssueForm(f => ({ ...f, max_uses: Number(e.target.value) || 1 }))}
              style={inputS} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>발급 수량</div>
            <input type="number" min="1" max="100" value={issueForm.quantity}
              onChange={e => setIssueForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))}
              style={inputS} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>대상 이메일 (선택, 미입력 시 누구나 사용)</div>
            <input type="email" placeholder="user@example.com" value={issueForm.issued_to_email}
              onChange={e => setIssueForm(f => ({ ...f, issued_to_email: e.target.value }))} style={inputS} />
          </div>
          <div style={{ gridColumn: 'span 5' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>메모 (admin 참고용)</div>
            <input type="text" placeholder="예: 4월 캠페인 / VIP 고객 / 데모 체험권" value={issueForm.note}
              onChange={e => setIssueForm(f => ({ ...f, note: e.target.value }))} style={inputS} />
          </div>
          <button type="submit" style={{
            padding: '10px 14px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff',
            fontSize: 13, fontWeight: 900, cursor: 'pointer', height: 38,
          }}>🎟️ 발급</button>
        </div>
        {issueResult && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
            fontSize: 12, color: 'var(--text-1)',
          }}>
            ✅ 발급 완료 — {issueResult.quantity}개 × {issueResult.plan} {issueResult.duration}일 ·
            <strong style={{ marginLeft: 6, fontFamily: 'monospace', color: '#16a34a' }}>
              {issueResult.coupons?.map(c => c.code).join(', ')}
            </strong>
            <button type="button" onClick={() => setIssueResult(null)} style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 4, border: 'none',
              background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer',
            }}>✕</button>
          </div>
        )}
      </form>

      {/* ④ 발급 목록 */}
      <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>📋 발급 목록</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all',      label: '전체' },
              { id: 'active',   label: '활성' },
              { id: 'redeemed', label: '사용됨' },
              { id: 'revoked',  label: '무효' },
            ].map(s => (
              <button key={s.id} type="button" onClick={() => setListFilter(f => ({ ...f, status: s.id }))} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                background: listFilter.status === s.id ? '#1e3a8a' : 'transparent',
                color: listFilter.status === s.id ? '#fde047' : 'var(--text-2)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>{s.label}</button>
            ))}
          </div>
          <input type="text" placeholder="코드/이메일/메모 검색…" value={listFilter.q}
            onChange={e => setListFilter(f => ({ ...f, q: e.target.value }))}
            style={{ ...inputS, flex: 1, minWidth: 220, padding: '6px 10px', fontSize: 12 }} />
          <button onClick={fetchList} style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>🔄 새로고침</button>
        </div>
        {listRows.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
            조건에 맞는 쿠폰 없음
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>코드</th>
                  <th style={{ padding: '8px 6px' }}>플랜</th>
                  <th style={{ padding: '8px 6px' }}>기간</th>
                  <th style={{ padding: '8px 6px' }}>사용</th>
                  <th style={{ padding: '8px 6px' }}>대상</th>
                  <th style={{ padding: '8px 6px' }}>상태</th>
                  <th style={{ padding: '8px 6px' }}>발급일</th>
                  <th style={{ padding: '8px 6px' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {listRows.map(c => {
                  const status = c.is_revoked ? '무효' : (c.redeemed_at ? '사용됨' : '활성');
                  const statusColor = c.is_revoked ? '#dc2626' : (c.redeemed_at ? '#d97706' : '#16a34a');
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 6px', fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                      <td style={{ padding: '6px 6px' }}>{c.plan}</td>
                      <td style={{ padding: '6px 6px' }}>{c.duration_days}일</td>
                      <td style={{ padding: '6px 6px' }}>{c.use_count}/{c.max_uses}</td>
                      <td style={{ padding: '6px 6px', fontSize: 11 }}>{c.issued_to_email || '누구나'}</td>
                      <td style={{ padding: '6px 6px' }}>
                        <span style={{ padding: '1px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, background: `${statusColor}1A`, color: statusColor }}>{status}</span>
                      </td>
                      <td style={{ padding: '6px 6px', fontSize: 10, color: 'var(--text-3)' }}>{c.created_at?.slice(0, 16)}</td>
                      <td style={{ padding: '6px 6px' }}>
                        {!c.is_revoked && (
                          <button onClick={() => revokeCoupon(c.code)} style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: 'rgba(248,113,113,0.10)', color: '#dc2626',
                            border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer',
                          }}>무효화</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuAccessTree({ plans, menus, access, setMenuAccess, setMenuAccessBulk, togglePlanAll, saveAllAccess, saving, dirty, recommendMenuAccess }) {
  const t = useT();
  // 186차 요청: 클릭 단계 펼침(아코디언) — 대메뉴 클릭→중메뉴, 중메뉴 클릭→하위메뉴, 하위메뉴 클릭→서브탭.
  const _allMenuKeys = () => { const s = new Set(); for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) for (const it of (sec.items || [])) if (it.menuKey) s.add(it.menuKey); return s; };
  const _allLeafRoutes = () => { const s = new Set(); for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) for (const it of (sec.items || [])) if (it.to) s.add(it.to); return s; };
  const _allSectionKeys = () => { const c = new Set(); for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) c.add(sec.key); return c; };
  const [collapsed, setCollapsed] = useState(_allSectionKeys); // 기본: 대메뉴만 보임(중메뉴 접힘)
  const [expandMenu, setExpandMenu] = useState(() => new Set()); // 중메뉴 → 하위메뉴 (클릭 시 펼침)
  const [expandLeaf, setExpandLeaf] = useState(() => new Set()); // 하위메뉴 → 서브탭 (클릭 시 펼침)
  const expandAll = () => { setCollapsed(new Set()); setExpandMenu(_allMenuKeys()); setExpandLeaf(_allLeafRoutes()); };
  const collapseAll = () => { setCollapsed(_allSectionKeys()); setExpandMenu(new Set()); setExpandLeaf(new Set()); };
  const [filter, setFilter] = useState('');
  const sections = useMemo(() => [...MEMBER_MENU, ...ADMIN_MENU], []);
  // 186차: 매트릭스는 sidebar manifest(sections) 기준 렌더. menu_tree(DB) 비어도 plan_menu_access 는 menu_key 로 저장되므로 전체 토글 허용.

  if (!plans.length) {
    return (<div style={{ padding: 40, borderRadius: 14, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-3)', fontSize: 14 }}>플랜이 없습니다. 먼저 "💰 플랜별 설정" 탭에서 플랜을 등록하세요.</div>);
  }

  // section → unique menuKey groups (순서 보존)
  const groupsOf = (section) => {
    const seen = new Map(); const groups = [];
    for (const it of section.items) {
      if (!it.menuKey) continue;
      if (!seen.has(it.menuKey)) { const g = { menuKey: it.menuKey, items: [] }; seen.set(it.menuKey, g); groups.push(g); }
      seen.get(it.menuKey).items.push(it);
    }
    return groups;
  };
  const matchesFilter = (item) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    const label = (MENU_KEY_LABEL[item.menuKey]?.title || t(item.labelKey, item.labelKey) || '').toLowerCase();
    return label.includes(q) || (item.to || '').toLowerCase().includes(q) || (item.menuKey || '').toLowerCase().includes(q);
  };
  const isOn = (planId, mk) => !!(access[planId] || {})[mk];
  const toggleCollapse = (key) => setCollapsed(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleExpandMenu = (key) => setExpandMenu(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleExpandLeaf = (key) => setExpandLeaf(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  // 계층 키 헬퍼 — 하위메뉴(=라우트 it.to) / 서브탭(=it.to::st.id)
  const subKeysOfLeaf = (it) => (SUB_TABS_BY_PATH[it.to] || []).map(st => `${it.to}::${st.id}`);
  const keysOfGroup = (g) => { const ks = [g.menuKey]; for (const it of g.items) { if (it.to) ks.push(it.to); ks.push(...subKeysOfLeaf(it)); } return ks; };
  // 186차: 모든 중메뉴는 하위메뉴(페이지) 를 가지므로 항상 펼침 가능 (단일 페이지도 드릴다운 일관성)
  const groupHasChildren = (g) => (g.items && g.items.length > 0);
  // 전체 menuKey 수 (manifest 기준, 중복 제거)
  const totalMenuKeys = useMemo(() => { const s = new Set(); for (const sec of sections) for (const it of sec.items) if (it.menuKey) s.add(it.menuKey); return s.size; }, [sections]);
  const planStats = plans.map(p => ({ on: Object.values(access[p.plan_id] || {}).filter(Boolean).length, total: totalMenuKeys }));
  const cellPad = { padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' };

  return (
    <div>
      {/* 헤더 + 액션 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🔐 플랜별 메뉴 접근 권한 — 한눈에 비교·편집</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
            행 = 제공 서비스(메뉴), 열 = 플랜. 한 페이지에서 각 플랜이 어떤 서비스를 제공하는지 비교하며 체크박스로 선택하세요. 편집 후 <strong>전체 저장</strong>.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {typeof recommendMenuAccess === 'function' && (
            <button onClick={recommendMenuAccess} disabled={saving} title="플랜별 월 요금 차이에 비례해 AI가 메뉴 접근을 추천" style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.45)', background: 'rgba(168,85,247,0.14)', color: '#6b21a8', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}>🤖 요금 기반 추천</button>
          )}
          <button onClick={saveAllAccess} disabled={saving || !dirty} style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: dirty ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'rgba(255,255,255,0.06)', color: dirty ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 800, cursor: dirty ? 'pointer' : 'default', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}>{saving ? '저장 중…' : (dirty ? '💾 전체 저장' : '✓ 저장됨')}</button>
        </div>
      </div>

      {/* 검색 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="🔍 메뉴 이름/경로/키 검색…" style={{ flex: 1, minWidth: 200, boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-1)', fontSize: 14 }} />
        <button onClick={expandAll} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(56,189,248,0.45)', background: 'rgba(56,189,248,0.14)', color: '#0369a1', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>📂 전체 펼치기</button>
        <button onClick={collapseAll} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>📁 전체 접기</button>
      </div>

      {/* 비교 매트릭스 (메뉴 × 플랜) — 187차: id=genie-plan-pricing(어두운 셀 흰글자 override 앵커) + 패널 단색 다크 */}
      <div id="genie-plan-pricing" style={{ borderRadius: 14, border: '1px solid rgba(148,163,184,0.25)', overflow: 'auto', background: '#243044' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
          <thead>
            <tr style={{ background: '#eef2f7' }}>
              {/* 187차 — thead 는 글로벌 규칙이 th 배경을 밝게 강제 → 어두운 글자로(흰글자 금지). 본문 셀만 흰글자. */}
              <th style={{ ...cellPad, textAlign: 'left', position: 'sticky', left: 0, background: '#eef2f7', minWidth: 240, zIndex: 1, color: '#1e293b', fontWeight: 800 }}>제공 서비스 (메뉴)</th>
              {plans.map((p, i) => (
                <th key={p.plan_id} style={{ ...cellPad, textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{p.name || p.plan_id}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{planStats[i].on}/{planStats[i].total} 활성</div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 4 }}>
                    <button onClick={() => togglePlanAll(p.plan_id, true)} title="이 플랜 전체 추가" style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.12)', color: '#22c55e', cursor: 'pointer' }}>✓전체</button>
                    <button onClick={() => togglePlanAll(p.plan_id, false)} title="이 플랜 전체 제거" style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer' }}>✗전체</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map(section => {
              const groups = groupsOf(section).filter(g => g.items.some(matchesFilter));
              if (filter.trim() && groups.length === 0) return null;
              const isCol = collapsed.has(section.key);
              const sectionLabel = t(section.labelKey, section.labelKey.split('.').pop());
              const sectionKeys = groups.flatMap(keysOfGroup);
              return (
                <React.Fragment key={section.key}>
                  {/* 대메뉴(섹션) — 체크박스 = 섹션 전체(하위 모두 포함) */}
                  <tr style={{ background: 'rgba(99,102,241,0.10)' }}>
                    <td data-gp="onColor" style={{ ...cellPad, position: 'sticky', left: 0, background: '#3f5170', cursor: 'pointer', color: '#ffffff' }} onClick={() => toggleCollapse(section.key)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#e2e8f0', fontSize: 13, width: 14 }}>{isCol ? '▶' : '▼'}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#4f46e5', color: '#fff', whiteSpace: 'nowrap' }}>대메뉴</span>
                        <span style={{ fontSize: 15 }}>{section.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#ffffff' }}>{sectionLabel}</span>
                        <span style={{ fontSize: 10.5, color: '#c7d2fe', marginLeft: 2 }}>{isCol ? '▶ 클릭하면 중메뉴' : ''}</span>
                      </div>
                    </td>
                    {plans.map(p => {
                      const onCnt = sectionKeys.filter(k => isOn(p.plan_id, k)).length;
                      const all = onCnt === sectionKeys.length && sectionKeys.length > 0;
                      return (
                        <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                          <input type="checkbox" checked={all} ref={el => { if (el) el.indeterminate = onCnt > 0 && !all; }} onChange={e => setMenuAccessBulk(p.plan_id, sectionKeys, e.target.checked)} title="이 대메뉴(섹션) 전체 선택/해제" style={{ width: 17, height: 17, cursor: 'pointer' }} />
                        </td>
                      );
                    })}
                  </tr>
                  {!isCol && groups.map(g => {
                    const lbl = MENU_KEY_LABEL[g.menuKey];
                    const title = lbl?.title || t(g.items[0]?.labelKey, g.menuKey);
                    const desc = lbl?.desc;
                    const hasChildren = groupHasChildren(g);
                    const menuExp = expandMenu.has(g.menuKey);
                    const gKeys = keysOfGroup(g);
                    return (
                      <React.Fragment key={g.menuKey}>
                        {/* 중메뉴 — 체크박스 = 중메뉴 + 하위 전체 */}
                        <tr>
                          <td data-gp="onColor" style={{ ...cellPad, position: 'sticky', left: 0, background: '#39465c', paddingLeft: 26 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              {hasChildren
                                ? <span onClick={() => toggleExpandMenu(g.menuKey)} style={{ cursor: 'pointer', color: '#e2e8f0', fontSize: 12, width: 14, userSelect: 'none', marginTop: 1 }}>{menuExp ? '▼' : '▶'}</span>
                                : <span style={{ width: 14 }} />}
                              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#7c3aed', color: '#fff', whiteSpace: 'nowrap', marginTop: 1 }}>중메뉴</span>
                              <div>
                                <div onClick={hasChildren ? () => toggleExpandMenu(g.menuKey) : undefined} style={{ fontWeight: 700, color: '#ffffff', fontSize: 13, cursor: hasChildren ? 'pointer' : 'default' }}>{title}{hasChildren && <span style={{ fontSize: 10.5, color: '#c4b5fd', marginLeft: 6, fontWeight: 700 }}>{menuExp ? '▼ 하위 접기' : `▶ 하위메뉴 ${g.items.length}개`}</span>}</div>
                                {desc && <div style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.45, marginTop: 2, maxWidth: 340 }}>{desc}</div>}
                              </div>
                            </div>
                          </td>
                          {plans.map(p => (
                            <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                              <input type="checkbox" checked={isOn(p.plan_id, g.menuKey)} onChange={e => setMenuAccessBulk(p.plan_id, gKeys, e.target.checked)} title="중메뉴(+하위메뉴·서브탭) 선택/해제" style={{ width: 17, height: 17, cursor: 'pointer' }} />
                            </td>
                          ))}
                        </tr>
                        {/* 하위메뉴 (leaf 페이지) */}
                        {!isCol && menuExp && g.items.map(it => {
                          const subs = SUB_TABS_BY_PATH[it.to] || [];
                          const leafExp = expandLeaf.has(it.to);
                          const lKeys = [it.to, ...subKeysOfLeaf(it)];
                          return (
                            <React.Fragment key={it.to}>
                              <tr>
                                <td data-gp="onColor" style={{ ...cellPad, position: 'sticky', left: 0, background: '#313d52', paddingLeft: 52 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {subs.length > 0
                                      ? <span onClick={() => toggleExpandLeaf(it.to)} style={{ cursor: 'pointer', color: '#e2e8f0', fontSize: 12, width: 14, userSelect: 'none' }}>{leafExp ? '▼' : '▶'}</span>
                                      : <span style={{ width: 14 }} />}
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#0891b2', color: '#fff', whiteSpace: 'nowrap' }}>하위메뉴</span>
                                    <span onClick={subs.length > 0 ? () => toggleExpandLeaf(it.to) : undefined} style={{ fontSize: 12.5, color: '#ffffff', fontWeight: 600, cursor: subs.length > 0 ? 'pointer' : 'default' }}>{it.icon} {gNavLabel(it.labelKey) || t(it.labelKey, it.labelKey.split('.').pop())}{subs.length > 0 && <span style={{ color: '#fcd34d', marginLeft: 4, fontWeight: 700 }}>{leafExp ? '▼ 서브탭 접기' : `▶ 서브탭 ${subs.length}개`}</span>}</span>
                                  </div>
                                </td>
                                {plans.map(p => (
                                  <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                                    <input type="checkbox" checked={isOn(p.plan_id, it.to)} onChange={e => setMenuAccessBulk(p.plan_id, lKeys, e.target.checked)} title="하위메뉴(+서브탭) 선택/해제" style={{ width: 15, height: 15, cursor: 'pointer' }} />
                                  </td>
                                ))}
                              </tr>
                              {/* 서브탭 */}
                              {leafExp && subs.map(st => {
                                const sk = `${it.to}::${st.id}`;
                                return (
                                  <tr key={sk}>
                                    <td data-gp="onColor" style={{ ...cellPad, position: 'sticky', left: 0, background: '#2a3547', paddingLeft: 80 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 14 }} />
                                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#d97706', color: '#fff', whiteSpace: 'nowrap' }}>서브탭</span>
                                        <span style={{ fontSize: 12.5, color: '#ffffff', fontWeight: 600 }}>📑 {st.label || st.id}</span>
                                      </div>
                                    </td>
                                    {plans.map(p => (
                                      <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                                        <input type="checkbox" checked={isOn(p.plan_id, sk)} onChange={e => setMenuAccess(p.plan_id, sk, e.target.checked)} title="서브탭 선택/해제" style={{ width: 14, height: 14, cursor: 'pointer' }} />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.65 }}>
        💡 한 행(중메뉴) 토글 = 동일 menuKey 를 공유하는 모든 하위 페이지 일괄 노출/숨김. 섹션 헤더의 <strong>n/m</strong> 버튼으로 섹션 전체를 플랜별 일괄 토글. 편집 후 <strong>💾 전체 저장</strong>.
      </div>
    </div>
  );
}

/**
 * PeriodPricingPanel — 172차 신규 (단일 플랜용 + 동적 기간).
 *
 * 한 번에 한 플랜의 모든 구독 기간을 admin 이 자유롭게 관리:
 *   - 기본 4개 (1/3/6/12개월) seed, 임의 추가/제거 가능 (1~60개월)
 *   - 1개월 가격 → 다른 기간 자동 산출 (할인율 적용)
 *   - 각 기간별 가격/할인/PaddleID/활성 개별 편집
 *   - 맞춤 견적 (Enterprise) 플랜은 가격 입력 비활성
 */
function PeriodPricingPanel({ plan, periodPricing, updatePeriodField, addPeriod, removePeriod, newPeriodInput, setNewPeriodInput, seatTiers = DEFAULT_SEAT_TIERS, addSeatTier, removeSeatTier }) {
  const isCustom = plan.is_custom_quote;
  // 186차: 계정수(seat) 차원 — 활성 seat 티어 선택 후 해당 기간 가격 편집
  const [activeSeat, setActiveSeat] = useState(seatTiers[0]?.key || BASE_SEAT);
  const [newSeatInput, setNewSeatInput] = useState('');
  const seat = seatTiers.some(t => t.key === activeSeat) ? activeSeat : (seatTiers[0]?.key || BASE_SEAT);
  const planSeats = periodPricing[plan.plan_id] || {};
  const pp = planSeats[seat] || {};
  // 186차 요청: 기간(개월)은 전 계정수(seat) 공통 — 어느 seat 에 추가했든 모든 계정수 탭에 표시.
  // 전 seat 의 기간 합집합을 표시(가격만 seat 별 개별, 없으면 빈 입력).
  const sortedMonths = (() => {
    const s = new Set();
    for (const sk of Object.keys(planSeats)) for (const mk of Object.keys(planSeats[sk] || {})) { const n = Number(mk); if (Number.isFinite(n)) s.add(n); }
    return [...s].sort((a, b) => a - b);
  })();
  const activeTier = seatTiers.find(t => t.key === seat);

  const inputS = {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)', color: 'inherit', fontSize: 13, fontFamily: 'inherit',
  };

  const handleAddSubmit = (e) => {
    e?.preventDefault?.();
    if (!newPeriodInput) return;
    addPeriod(plan.plan_id, seat, newPeriodInput);
  };
  const handleAddSeat = (e) => {
    e?.preventDefault?.();
    const v = newSeatInput.trim();
    if (!v) return;
    if (/^(무제한|unlimited|∞)$/i.test(v)) { addSeatTier?.(0, true); }
    else { const n = Number(v); if (!Number.isFinite(n) || n < 1) { alert('계정수는 1 이상 숫자 또는 "무제한"'); return; } addSeatTier?.(n, false); }
    setNewSeatInput('');
  };

  return (
    <div style={{
      borderRadius: 14, padding: '18px 20px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase' }}>
          📅 계정수별 · 기간별 구독 가격
        </div>
        <div style={{ flex: 1 }} />
        {isCustom && (
          <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(251,146,60,0.15)', color: '#fb923c', fontSize: 11, fontWeight: 800 }}>
            맞춤 견적 — 가격 입력 불필요
          </span>
        )}
      </div>

      {/* 186차: 계정수(seat) 티어 선택 + 관리 — 같은 플랜이라도 계정수별 요금 책정 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>👥 계정수 (같은 플랜, 계정수별 요금)</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {seatTiers.map(t => {
            const on = t.key === seat;
            return (
              <span key={t.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <button onClick={() => setActiveSeat(t.key)} style={{
                  padding: '6px 12px', borderRadius: on ? '8px 0 0 8px' : 8,
                  border: on ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.12)',
                  borderRight: (on && t.key !== BASE_SEAT) ? 'none' : undefined,
                  background: on ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.03)',
                  color: on ? '#c7d2fe' : 'var(--text-2)', fontSize: 12, fontWeight: on ? 800 : 600, cursor: 'pointer',
                }}>{t.unlimited ? '♾ 무제한' : `${t.count}계정`}</button>
                {on && t.key !== BASE_SEAT && (
                  <button onClick={() => removeSeatTier?.(t.key)} title="이 계정수 티어 삭제" style={{
                    padding: '6px 8px', borderRadius: '0 8px 8px 0', border: '1px solid #6366f1', borderLeft: 'none',
                    background: 'rgba(248,113,113,0.12)', color: '#f87171', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  }}>×</button>
                )}
              </span>
            );
          })}
          {/* 계정수 추가 */}
          <form onSubmit={handleAddSeat} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
            <input value={newSeatInput} onChange={e => setNewSeatInput(e.target.value)} placeholder="계정수 or 무제한"
              style={{ ...inputS, width: 120, padding: '5px 8px' }} />
            <button type="submit" style={{
              padding: '6px 12px', borderRadius: 8, border: '1px dashed rgba(34,197,94,0.4)',
              background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}>＋ 계정수</button>
          </form>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          현재 편집 중: <strong style={{ color: '#c7d2fe' }}>{activeTier ? (activeTier.unlimited ? '무제한 계정' : `${activeTier.count}계정`) : seat}</strong> — 아래 기간별 요금은 이 계정수에만 적용됩니다.
        </div>
      </div>

      {/* 안내 */}
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
        💡 <strong>월간 요금 (1개월)</strong> 이 SSOT. 입력 즉시 모든 기간의 <strong>기본 결제액 = 개월수 × 월간요금</strong> 으로 실시간 산출됩니다. 각 기간 할인율(%) 은 admin 자유 설정 → 최종 결제액 자동 계산. 통화 USD 고정 (Paddle MoR).
      </div>

      {/* 기간 추가 폼 — Enterprise(맞춤견적) 도 활성 (172차 사용자 요청: 견적가 등록 가능) */}
      <form onSubmit={handleAddSubmit} style={{
        display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14,
        padding: '10px 12px', borderRadius: 8,
        background: isCustom ? 'rgba(168,85,247,0.06)' : 'rgba(34,197,94,0.04)',
        border: isCustom ? '1px dashed rgba(168,85,247,0.35)' : '1px dashed rgba(34,197,94,0.25)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
          ＋ {isCustom ? '견적가 등록 (기간별)' : '기간 추가'}
        </span>
        <input
          type="number" min="1" max="60"
          value={newPeriodInput}
          onChange={e => setNewPeriodInput(e.target.value)}
          placeholder="개월수 (1~60)"
          style={{ ...inputS, width: 160 }}
        />
        <button type="submit" disabled={!newPeriodInput} style={{
          padding: '7px 16px', borderRadius: 7, border: 'none',
          background: newPeriodInput
            ? (isCustom ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#16a34a,#22c55e)')
            : 'rgba(255,255,255,0.06)',
          color: newPeriodInput ? '#fff' : '#94a3b8',
          fontSize: 13, fontWeight: 800, cursor: newPeriodInput ? 'pointer' : 'default',
        }}>＋ {isCustom ? '견적가 추가' : '추가'}</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {isCustom
            ? '맞춤 견적가를 기간별로 직접 입력하세요 (Paddle Checkout 또는 수동 결제 안내)'
            : '추천: 2, 9, 18, 24, 36개월 등 자유 설정'}
        </span>
      </form>

      {/* 기간 매트릭스 — Enterprise(맞춤견적) 도 admin 이 견적가/요금 입력 가능 (172차 사용자 요청) */}
      {sortedMonths.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic' }}>
          {isCustom ? '맞춤 견적 플랜 — 상단 [+ 기간 추가] 로 견적가 등록' : '등록된 기간이 없습니다. 상단에서 기간을 추가하세요.'}
        </div>
      ) : (() => {
        // 172차: 월간 요금이 SSOT. 1m 가격 변경 시 모든 기간 기본 결제액 = months × monthly 실시간 갱신.
        const monthlyBase = Number(pp[1]?.price_usd) || 0; // 기준 월간 요금
        return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', textAlign: 'left' }}>
              <th style={{ padding: '8px 6px', width: '16%' }}>기간</th>
              <th style={{ padding: '8px 6px', width: '13%' }}>월간 요금 $</th>
              <th style={{ padding: '8px 6px', width: '14%' }}>기본 결제액 $<br/><span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>(개월 × 월간)</span></th>
              <th style={{ padding: '8px 6px', width: '9%' }}>할인 %</th>
              <th style={{ padding: '8px 6px', width: '14%' }}>최종 결제액 $</th>
              <th style={{ padding: '8px 6px', width: '20%' }}>Paddle priceId</th>
              <th style={{ padding: '8px 6px', width: '7%', textAlign: 'center' }}>활성</th>
              <th style={{ padding: '8px 6px', width: '7%', textAlign: 'center' }}>제거</th>
            </tr>
          </thead>
          <tbody>
            {sortedMonths.map(months => {
              const cfg = pp[months] || {};
              const isBase = months === 1;
              // 기본 결제액 = months × 월간 요금 (SSOT, 실시간 계산)
              const grossTotal = monthlyBase > 0 ? +(monthlyBase * months).toFixed(2) : null;
              // 최종 결제액 = 기본 결제액 × (1 - discount/100)  (할인 0 이면 = 기본)
              const discountPct = Number(cfg.discount_pct || 0);
              const finalTotal = grossTotal != null
                ? +(grossTotal * (1 - discountPct / 100)).toFixed(2)
                : (cfg.price_usd != null ? +(cfg.price_usd * months).toFixed(2) : null);
              // 1m 행은 월간 요금 input 활성. 다른 행은 월간 요금 readonly (1m 에서 결정됨).
              // 단, admin 이 비-1m 기간의 월요금을 직접 override 하고 싶으면 (예외 케이스) 편집 가능하게 둠.
              const perMonthDisplay = cfg.price_usd != null ? cfg.price_usd.toFixed(2) : '—';
              return (
                <tr key={months} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: isBase ? 'rgba(34,197,94,0.06)' : 'transparent',
                }}>
                  <td style={{ padding: '8px 6px', fontWeight: 700 }}>
                    {getPeriodLabel(months)}
                    {isBase && <span style={{ display: 'block', fontSize: 10, color: '#22c55e', fontWeight: 700, marginTop: 2 }}>SSOT 기준</span>}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    {isBase ? (
                      <input type="number" step="0.01" min="0" disabled={false /* 172차: Enterprise 도 admin 견적가 입력 가능 */}
                        value={cfg.price_usd ?? ''}
                        onChange={e => updatePeriodField(plan.plan_id, seat, 1, { price_usd: e.target.value === '' ? null : Number(e.target.value) })}
                        style={{ ...inputS, fontWeight: 700, color: '#22c55e' }}
                        placeholder="기준 월 요금" />
                    ) : (
                      <span style={{ color: 'var(--text-3)', fontSize: 11 }}>${perMonthDisplay}/월</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-2)' }}>
                    {grossTotal != null ? `$${grossTotal.toFixed(2)}` : '—'}
                    {!isBase && monthlyBase > 0 && (
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--text-3)' }}>
                        = {months} × ${monthlyBase.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <input type="number" step="1" min="0" max="80" disabled={isBase /* 172차: 1m 은 SSOT (할인 0%), 그 외 Enterprise 포함 활성 */}
                      value={cfg.discount_pct ?? 0}
                      onChange={e => updatePeriodField(plan.plan_id, seat, months, { discount_pct: e.target.value === '' ? 0 : Number(e.target.value) })}
                      style={{ ...inputS, opacity: isBase ? 0.4 : 1, textAlign: 'center' }}
                      title={isBase ? '기준 가격(1m)은 할인 없음' : `${months}개월 할인율 (%)`} />
                  </td>
                  <td style={{ padding: '8px 6px', color: '#22c55e', fontWeight: 800, fontSize: 13 }}>
                    {finalTotal != null ? `$${finalTotal.toFixed(2)}` : '—'}
                    {!isBase && discountPct > 0 && finalTotal != null && grossTotal != null && (
                      <span style={{ display: 'block', fontSize: 10, color: '#fb923c', fontWeight: 700 }}>
                        −${(grossTotal - finalTotal).toFixed(2)} 절약
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <input type="text" value={cfg.paddle_price_id ?? ''} placeholder="pri_xxxxxxxxxx"
                      onChange={e => updatePeriodField(plan.plan_id, seat, months, { paddle_price_id: e.target.value })}
                      style={inputS} />
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    <input type="checkbox" checked={cfg.is_active !== false}
                      onChange={e => updatePeriodField(plan.plan_id, seat, months, { is_active: e.target.checked })} />
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    {isBase ? (
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>기준</span>
                    ) : (
                      <button onClick={() => removePeriod(plan.plan_id, seat, months)} disabled={false /* 172차: Enterprise 도 admin 견적가 입력 가능 */} style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(248,113,113,0.10)', color: '#f87171',
                        border: '1px solid rgba(248,113,113,0.28)',
                        fontSize: 12, fontWeight: 700,
                        cursor: isCustom ? 'default' : 'pointer', opacity: isCustom ? 0.4 : 1,
                      }} title="이 기간 제거 (저장 시 적용)">×</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        );
      })()}
    </div>
  );
}

/**
 * PreviewCard — 172차에서 가격을 periods[1] (월) / periods[12] (연) 에서 우선 읽고,
 * 없으면 plan_config.price_usd 등 legacy 컬럼 사용 (backward compat).
 */
function PreviewCard({ plan, periods = {} }) {
  const isCustom = plan.is_custom_quote;
  const isRecommended = plan.is_recommended === true || plan.is_recommended === 1;
  const m1Price  = periods[1]?.price_usd  ?? plan.price_usd;
  const m12Price = periods[12]?.price_usd ?? plan.price_annual_usd;
  const m1PaddleId  = periods[1]?.paddle_price_id  || plan.price_id_monthly || '';
  const m12PaddleId = periods[12]?.paddle_price_id || plan.price_id_annual  || '';
  const sortedMonths = Object.keys(periods).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  return (
    <div style={{
      position: 'relative',
      padding: '32px 26px', borderRadius: 18,
      background: isRecommended
        ? 'rgba(99,102,241,0.16)'
        : 'rgba(34,197,94,0.10)',
      border: isRecommended ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(34,197,94,0.25)',
    }}>
      {isRecommended && (
        <div style={{
          position: 'absolute', top: -12, right: 16,
          padding: '4px 12px', borderRadius: 20,
          background: 'linear-gradient(135deg,#6366f1,#4f8ef7)',
          color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>⭐ MOST POPULAR</div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: isRecommended ? '#6366f1' : '#22c55e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{plan.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 22, minHeight: 32 }}>{plan.description || '—'}</div>
      <div style={{ marginBottom: 18 }}>
        {isCustom ? (
          <span style={{ fontSize: 32, fontWeight: 900 }}>맞춤 견적</span>
        ) : (
          <>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-3)' }}>USD </span>
            <span style={{ fontSize: 44, fontWeight: 900 }}>${m1Price ?? '—'}</span>
            <span style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 4 }}>/월</span>
            {m12Price != null && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>연간 결제 시 ${m12Price}/월 (총 ${(m12Price * 12).toFixed(2)}/년)</div>
            )}
          </>
        )}
      </div>

      {/* 등록된 기간 옵션 요약 */}
      {!isCustom && sortedMonths.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>구독 옵션 ({sortedMonths.length}개 기간)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sortedMonths.map(m => {
              const cfg = periods[m] || {};
              return (
                <span key={m} style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 11,
                  background: cfg.is_active === false ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.10)',
                  color: cfg.is_active === false ? '#94a3b8' : '#cbd5e1',
                  border: cfg.is_active === false ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(34,197,94,0.22)',
                  textDecoration: cfg.is_active === false ? 'line-through' : 'none',
                }}>
                  {m}m ${cfg.price_usd ?? '—'}
                  {cfg.discount_pct > 0 && <span style={{ color: '#fb923c', marginLeft: 4 }}>-{cfg.discount_pct}%</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {(plan.features || []).slice(0, 8).map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ color: '#22c55e' }}>✓</span>{f}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Paddle priceId (legacy 동기화)</div>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)' }}>
          M (1m): {m1PaddleId || '미설정'}<br />
          A (12m): {m12PaddleId || '미설정'}
        </div>
      </div>
    </div>
  );
}

export default PlanPricing;
