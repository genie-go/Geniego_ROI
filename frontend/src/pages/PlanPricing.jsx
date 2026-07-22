import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { getJsonAuth, requestJsonAuth } from "../services/apiClient.js";
import { useT } from "../i18n/index.js";
import { localizeDeep as _dloc } from "../utils/demoUiLocalize.js"; // [271차] 백엔드 플랜/메뉴 표시데이터 15개국 현지화
import { MEMBER_MENU, ADMIN_MENU, buildMenuKeyIndex } from "../layout/sidebarManifest.js";
import { MENU_KEY_LABEL, SUB_TABS_BY_PATH } from "../layout/sidebarMenuLabels.js";
import SIDEBAR_DICT from "../layout/sidebarI18n.js"; // 186차: gNav.* 라벨 한글 해석 (하위메뉴 라벨)
import PlanServiceGuide from "../components/PlanServiceGuide.jsx"; // 186차: 플랜 제공서비스 상세 안내(초고도화)
import { recommendMenuAccess as recommendMenuAccessRealistic, recommendPlanPricing, RECOMMENDED_PERIOD_DISCOUNT } from "../auth/planMenuPolicy.js"; // 202차 전 플랜(Free포함) 경쟁사 벤치마크 추천 + 246차 가격추천
import { useAdminReadOnly } from "../auth/useAdminReadOnly.js"; // [231차 #17] 하위관리자 열람 전용 강제
import ReadOnlyBanner from "../components/ReadOnlyBanner.jsx";
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
  // [259차] 수신자(426·1562·AuthContext)는 tChannelName(테넌트 suffix) 채널을 구독 → 발신도 동일 채널로 통일(과거 raw SYNC_CHANNEL 발신이라 6개 발신처 전부 크로스탭 미수신이었음)
  try { new BroadcastChannel(tChannelName(SYNC_CHANNEL)).postMessage({ type: "menu_access_updated", ts: Date.now(), ...payload }); } catch { /* BroadcastChannel 미지원 환경 무시 */ }
  try { window.dispatchEvent(new CustomEvent("menu-access-saved", { detail: payload })); } catch { /* 이벤트 디스패치 실패 무시 */ }
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
// [현 차수] 4단계 구조: Starter(무료)/Growth/Pro/Enterprise. plan_id 는 불변(게이팅 안정),
//   표시명만 사용자 구성에 맞춤. 가격 0 = admin 이 직접 입력(구조 우선). 메뉴접근은 '요금 기반 추천' 버튼.
// ★246차 — Free(진입 moat) + Starter/Growth/Pro/Enterprise(4유료) 5티어. 가격=1계정 기준 추천값(admin 수정 가능).
//   메뉴 접근 차등은 planMenuPolicy.MENU_MIN_PLAN(Free/Starter/Growth/Pro/Enterprise)·recommendMenuAccess 정본.
const SEED_PLANS = [
  {
    // Free — 사방넷 무료 모델(진입장벽 제거). 채널 3개 무료.
    plan_id: 'free', name: 'Free', display_order: 5, is_active: true, is_custom_quote: false,
    description: '무료 진입 · 판매 채널 3개 연동',
    features: ['판매·마케팅 채널 3개 무료', '상품·주문·재고 동기화', '기본 성과 대시보드', '커뮤니티 지원'],
    limits: { channels: 3, orders_monthly: 500, products: 100, users: 1, suppliers: 3, logistics: 1, warehouses: 1, image_hosting_gb: 1 },
    price_usd: 0, price_annual_usd: 0,
  },
  {
    // Starter — 마케팅 입문(1계정 $49). 마케팅 코어(자동마케팅·캠페인·광고성과·CRM·이메일·카카오·SMS·콘텐츠·리뷰).
    plan_id: 'starter', name: 'Starter', display_order: 10, is_active: true, is_custom_quote: false,
    description: '마케팅 입문 · 1계정 $49 기준',
    features: ['판매·마케팅 채널 5개', '마케팅 자동화·캠페인', 'CRM·이메일·카카오·SMS', '콘텐츠 캘린더·리뷰', '계정 수 선택', '이메일 지원'],
    limits: { channels: 5, orders_monthly: 2000, products: 500, users: 1, suppliers: 5, logistics: 2, warehouses: 1, image_hosting_gb: 3 },
    price_usd: 49, price_annual_usd: 39,
  },
  {
    // Growth — 데이터 기반 성장(1계정 $149). +어트리뷰션·MMM·고급분석·전 메시징.
    plan_id: 'growth', name: 'Growth', display_order: 20, is_active: true, is_custom_quote: false,
    description: '데이터 기반 성장 · 1계정 $149 기준',
    features: ['판매·마케팅 채널 10개', '멀티터치 어트리뷰션·MMM(베이지안)', '리포트 빌더·P&L·AI 인사이트', '여정 빌더·온사이트 CRO·웹팝업', 'LINE/WhatsApp/IG·인플루언서', '계정 수 선택', '이메일 지원'],
    limits: { channels: 10, orders_monthly: 10000, products: 2000, users: 5, suppliers: 10, logistics: 3, warehouses: 2, image_hosting_gb: 10 },
    price_usd: 149, price_annual_usd: 119,
  },
  {
    // Pro — 풀 운영 자동화(1계정 $399). +WMS/가격최적화/공급망/라이브/자동화/데이터.
    plan_id: 'pro', name: 'Pro', display_order: 30, is_active: true, is_custom_quote: false, is_recommended: 1,
    description: '풀 운영 자동화 · 1계정 $399 기준',
    // [283차 R2 정정의 정정] '상업 송장 자동 생성'은 **실재 기능**이다 — WmsManager.jsx:1289 InvoiceTab
    //   (INCOTERMS 10종·HS코드·품목표·COMMERCIAL INVOICE 인쇄 출력). 클라이언트 생성이라 백엔드가 없을 뿐이며,
    //   283차가 "backend grep 0건"만 보고 허위로 오판해 삭제했던 것을 복구한다(263차 뷰스루 오판과 동일 클래스).
    features: ['무제한 판매 채널·창고(WMS)', '가격최적화·공급망·수요예측·반품', '라이브 커머스·AI 룰엔진·라이트백', '데이터 스키마/신뢰도·데이터프로덕트', 'AI 디자인·데이터 내보내기·국제 특송 상업 송장', '계정 수 선택', '우선 지원 (8시간 내)'],
    limits: { channels: -1, orders_monthly: 50000, products: 10000, users: -1, suppliers: -1, logistics: -1, warehouses: -1, image_hosting_gb: 49 },
    price_usd: 399, price_annual_usd: 319,
  },
  {
    plan_id: 'enterprise', name: 'Enterprise', display_order: 40, is_active: true, is_custom_quote: true,
    description: '대규모 운영 · 맞춤 통합 (1계정 $1,500~ / 별도견적)',
    // [283차 R2 정직성] '맞춤 AI 모델 학습' 제거(부재증명: custom_model|model_training|trainModel → backend 0건.
    //   CustomerAI 는 고정 모델의 성능 조회일 뿐 고객별 학습 경로 없음) → 실재하는 감사증적/SIEM 으로 교체.
    //   '99.9% SLA' → 99.5%(가동률 실측 부재 + 이용약관 제4조③ 99.5% 와 모순 → 약관값으로 통일).
    features: ['Pro 플랜 전체 기능', '개발자 허브(API/웹훅/데이터 익스포트)', 'SSO/SCIM·화이트라벨', 'SIEM 감사로그 연동·감사 증적 내보내기', '전담 계정 매니저·99.5% SLA', '계정 수 무제한', '맞춤 통합 & 웹훅'],
    limits: { channels: -1, orders_monthly: -1, products: -1, users: -1, suppliers: -1, logistics: -1, warehouses: -1, image_hosting_gb: -1 },
    price_usd: 1500, price_annual_usd: 1200,
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
  { icon: '🌐', titleKey: 'svcOmniTitle', title: '옴니채널 커머스',    descKey: 'svcOmniDesc', desc: '쿠팡·네이버·아마존·쇼피파이·틱톡샵 등 30+ 마켓을 하나의 허브로 연결. 주문·재고·배송을 표준화합니다.' },
  // [283차 정직성] '합배송 관리·국제 특송 상업 송장 자동 생성'은 코드 부재 → 실제 구현분(Wms.php LOT/FEFO·피킹/패킹, Logistics.php 배송추적)으로 정정. Landing.jsx f2d 와 문구 정합.
  { icon: '🏭', titleKey: 'svcWmsTitle', title: 'WMS 창고·물류',      descKey: 'svcWmsDesc', desc: '다중 창고 재고 추적, LOT·FEFO 관리, 피킹·패킹 워크플로, 운송사 배송추적 API 연동.' },
  { icon: '🤖', titleKey: 'svcAiMktTitle', title: 'AI 마케팅 인텔리전스', descKey: 'svcAiMktDesc', desc: '8차원 광고 기여도 분석, 인플루언서 캠페인, 쿠폰 흐름 종합 분석. AI 예산 추천과 실시간 승인.' },
  { icon: '🤝', titleKey: 'svcInfluTitle', title: '인플루언서 분석',    descKey: 'svcInfluDesc', desc: '도달률·참여율·전환율·ROI 평가. 자동 수수료 관리 + 실시간 캠페인 성과 추적.' },
  { icon: '📊', titleKey: 'svcPnlTitle', title: '통합 손익 분석',     descKey: 'svcPnlDesc', desc: 'SKU·채널·캠페인·크리에이터별 실시간 손익. ROAS 하락·반품 급증·쿠폰 이상 패턴 자동 감지.' },
  { icon: '💰', titleKey: 'svcSettleTitle', title: '정산·대사',           descKey: 'svcSettleDesc', desc: '모든 채널 정산 자동 대사. 채널 지급액과 예상 금액 간 불일치를 즉시 포착.' },
  { icon: '⚙️', titleKey: 'svcAutoTitle', title: 'AI 자동화 엔진',     descKey: 'svcAutoDesc', desc: '규칙 기반 + GPT 자동화 워크플로우. 임계값 설정 / AI 제안 / 원클릭 승인·오버라이드.' },
  { icon: '🔌', titleKey: 'svcConnTitle', title: '30+ 채널 커넥터',     descKey: 'svcConnDesc', desc: '국내(쿠팡·네이버·11번가) + 글로벌(아마존·메타·틱톡) 사전 구축 API + OAuth 인증 관리.' },
];
const NAMED_PERIOD_KEYS = { 1: 'periodMonthly', 3: 'periodQuarter', 6: 'periodHalf', 12: 'periodAnnual', 24: 'period2y', 36: 'period3y' };
function getPeriodLabel(m, t) {
  const nk = NAMED_PERIOD_KEYS[m];
  const named = nk ? t(`planPricing.${nk}`, NAMED_PERIODS[m]) : null;
  const mo = t('planPricing.monthsUnit', '개월');
  return named ? `${named} (${m}${mo})` : `${m}${mo}`;
}

function PlanPricing() {
  const t = useT();
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

  // [286차] Paddle 동기화 상태/재동기화 — 백엔드 자동 Product/Price 생성 파이프라인(plans-paddle-sync/status) UI 배선.
  //   종전엔 priceId 수동입력+외부 대시보드 수기생성 모델이라 백엔드 자동동기화와 미연결이었다.
  const [paddleStatus, setPaddleStatus] = useState(null); // { configured, env, plans:[{plan_id,paddle_product_id,price_id_monthly,price_id_annual,sync_status,sync_at,...}] }
  const [paddleSyncing, setPaddleSyncing] = useState(false);
  const [paddleMsg, setPaddleMsg] = useState('');
  const fetchPaddleStatus = useCallback(async () => {
    try { const d = await getJsonAuth('/v424/admin/plans-paddle-status'); setPaddleStatus(d && d.ok !== false ? d : null); }
    catch (e) { setPaddleStatus(null); }
  }, []);
  const runPaddleSync = useCallback(async (planId) => {
    setPaddleSyncing(true); setPaddleMsg('');
    try {
      const d = await requestJsonAuth('/v424/admin/plans-paddle-sync', 'POST', planId ? { plan_id: planId } : {});
      if (d && d.ok === false && d.reason === 'paddle_not_configured') setPaddleMsg('⚠ ' + (d.message || 'Paddle 자격증명(PADDLE_SECRET_KEY)이 아직 설정되지 않았습니다.'));
      else setPaddleMsg('✅ Paddle 동기화 완료 — Product/Price ID가 갱신되었습니다.');
      await fetchPaddleStatus();
    } catch (e) { setPaddleMsg('❌ 동기화 실패: ' + String(e?.message || e)); }
    finally { setPaddleSyncing(false); setTimeout(() => setPaddleMsg(''), 6000); }
  }, [fetchPaddleStatus]);

  const fetchPlans = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getJsonAuth('/v424/admin/plans');
      setPlans(Array.isArray(data?.plans) ? data.plans.map(p => _dloc(p)) : []); // [271차] 백엔드 플랜 표시데이터 현지화
      setAuthLost(false); authRetryRef.current = 0;
    } catch (e) {
      const msg = String(e?.message || e);
      const is401 = /HTTP 401|AUTH_REQUIRED|SESSION_EXPIRED|인증이 필요|세션이 만료/.test(msg);
      // [현 차수] 서버가 명시적으로 토큰 무효를 판정한 경우(SESSION_EXPIRED/AUTH_REQUIRED) =
      //   localStorage 에 남은 '죽은 토큰'. 이때는 토큰이 있어도 무한 '일시적 오류'로 가두지 말고
      //   재로그인(authLost) 으로 안내한다. (admin 이 만료 토큰으로 plan-pricing 에 영구 갇히던 버그 수정.)
      const sessionDead = /SESSION_EXPIRED|AUTH_REQUIRED|세션이 만료|인증이 필요/.test(msg);
      if (is401) {
        let tok = null; try { tok = localStorage.getItem('genie_token'); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
        if (sessionDead) {
          // 진짜 일시적(네트워크 순단)일 수도 있으니 1회만 재시도 후, 지속되면 재로그인 안내.
          if (authRetryRef.current < 1) { authRetryRef.current++; setTimeout(() => fetchPlans(), 700); return; }
          setAuthLost(true); setPlans([]); return;
        }
        // 그 외 401(코드 없는 순간 거부)은 토큰이 있으면 일시적으로 보고 자동 재시도(최대 4회).
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
      setMenus(Array.isArray(data?.menus) ? data.menus.map(mn => _dloc(mn)) : []); // [271차] 백엔드 메뉴명 현지화
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

  // [231차 #17] 하위관리자 '열람' 권한이면 읽기전용(쓰기 핸들러 early-return + 버튼 disable + 배너)
  const readOnly = useAdminReadOnly();
  const blockRO = () => { if (readOnly) { try { alert('열람 전용 권한입니다. 수정 권한은 최고관리자에게 요청하세요.'); } catch { /* 알림 표시 실패 무시 */ } return true; } return false; };

  /** 권장가 1m 적용 → 모든 기간 자동 산출 + plan_config sync (백엔드 transaction) */
  const applyRecommendedPrice = async (planId, roundTo = 'nearest-9') => {
    if (blockRO()) return;
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
    // [현 차수] 1계정(base) 포함 모든 티어 삭제 가능. 단 최소 1개 티어는 유지(가격 기준 보존, basePeriods 첫 티어 폴백).
    if (seatTiers.length <= 1) { alert('최소 1개의 계정수 티어는 유지해야 합니다'); return; }
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
  /** [현 차수] 계정수 티어 수정 — 계정수(count)를 변경. 해당 seat 의 모든 플랜 가격을 새 키로 이전. */
  const editSeatTier = (oldKey) => {
    const cur = seatTiers.find(t => t.key === oldKey);
    const input = window.prompt('계정수를 입력하세요 (숫자 또는 "무제한")', cur?.unlimited ? '무제한' : String(cur?.count ?? ''));
    if (input === null) return;
    const v = input.trim();
    let newKey, tier;
    if (/^(무제한|unlimited|∞)$/i.test(v)) { newKey = 'unlimited'; tier = { key: 'unlimited', label: '무제한', count: 0, unlimited: true }; }
    else { const n = Number(v); if (!Number.isFinite(n) || n < 1) { alert('계정수는 1 이상 숫자 또는 "무제한"'); return; } newKey = String(n); tier = { key: newKey, label: `${n}계정`, count: n, unlimited: false }; }
    if (newKey === oldKey) return;
    if (seatTiers.some(t => t.key === newKey)) { alert('이미 존재하는 계정수 티어입니다'); return; }
    setSeatTiers(prev => { const next = prev.map(t => t.key === oldKey ? tier : t); next.sort((a, b) => (a.unlimited ? 1 : b.unlimited ? -1 : a.count - b.count)); return next; });
    setPeriodPricing(prev => {
      const next = {};
      for (const [pid, seats] of Object.entries(prev)) {
        const ns = { ...seats };
        if (ns[oldKey] !== undefined) { ns[newKey] = ns[oldKey]; delete ns[oldKey]; }
        next[pid] = ns;
      }
      return next;
    });
  };

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { fetchPaddleStatus(); }, [fetchPaddleStatus]); // [286차] Paddle 동기화 상태 로드
  // 172차→179차: 메뉴 접근은 'plan' 탭의 플랜별 "제공 메뉴·기능" 편집기에서도 필요 → 항상 로드
  useEffect(() => { fetchMenuAccess(); }, [fetchMenuAccess]);
  // 'plan' 탭 표시 + 'permissions' 탭의 요금 기반 추천이 최신 1계정 가격을 쓰도록 둘 다 로드
  useEffect(() => { if (outerTab === 'plan' || outerTab === 'permissions') fetchPeriodPricing(); }, [outerTab, fetchPeriodPricing]);
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
    } catch { /* BroadcastChannel 미지원 환경 무시 */ }
    return () => { try { bc?.close(); } catch { /* BroadcastChannel 정리 실패 무시 */ } };
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
    if (blockRO()) return;
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

  /** [246차] 가격 일괄 추천 — 경쟁사 앵커 1계정 base × 계정수(seat) 배수 × 기간할인 + 1년=3개월 무료 쿠폰.
   *   전 플랜·전 seat·1/3/6/12개월 periodPricing 채움(검토 후 [플랜 탭 → 저장]). 전부 admin 수정 가능. */
  const recommendAllPricing = () => {
    const { matrix } = recommendPlanPricing();
    const tiers = (seatTiers.length ? seatTiers : DEFAULT_SEAT_TIERS);
    const PERIODS = [1, 3, 6, 12];
    setPeriodPricing(prev => {
      const next = { ...prev };
      for (const p of plans) {
        const pid = p.plan_id;
        const rec = matrix[pid];
        if (!rec) continue; // 알려진 플랜(free/starter/growth/pro/enterprise)만
        const seatMap = { ...(next[pid] || {}) };
        for (const tier of tiers) {
          const sk = tier.key;
          const seatRec = rec[sk] || rec['1']; // 커스텀 seat 키는 1계정 기준 폴백
          const pp = { ...(seatMap[sk] || {}) };
          for (const m of PERIODS) {
            const r = seatRec[m] || seatRec[1];
            if (!r) continue;
            const existing = pp[m] || {};
            pp[m] = { price_usd: r.list, discount_pct: RECOMMENDED_PERIOD_DISCOUNT[m] || 0, paddle_price_id: existing.paddle_price_id || '', is_active: true, bonus_months: r.bonusMonths };
          }
          seatMap[sk] = pp;
        }
        next[pid] = seatMap;
      }
      return next;
    });
    alert('경쟁사 벤치마크 추천가 채움 (1계정 base × 계정수 배수 × 기간할인 + 1년=3개월 무료 쿠폰). [플랜] 탭에서 검토·수정 후 [저장]하세요.');
  };

  const recommendMenuAccess = () => {
    // 202차 초고도화: 전 플랜(Free 포함)을 DB 등록 목록에서 동적으로 추천.
    //  · 경쟁사 벤치마크(사방넷 무료/HubSpot/Salesforce/Shopify) 기반 등급별 메뉴 차별화.
    //  · Free = 채널 연동·상품/주문(3채널 무료) + 기본 성과. 유료는 가격순 누적.
    //  · 플랜명을 바꿔도 plan_id 불변이라 안전. 신규 플랜도 가격순 자동 배분.
    const planList = (plans || [])
      .filter(p => p.plan_id && p.plan_id !== 'admin' && p.plan_id !== 'demo')
      .map(p => ({ id: p.plan_id, price: priceOf(p.plan_id) }));
    if (planList.length === 0) {
      alert('먼저 플랜을 등록해 주세요. 등록된 플랜·요금을 경쟁사 벤치마크와 비교해 메뉴 접근을 추천합니다.');
      return;
    }
    const { tierOf, access: rec } = recommendMenuAccessRealistic(planList);
    setAccess(prev => {
      const next = { ...prev };
      for (const planId of Object.keys(rec)) {
        const allowMenuKeys = Object.keys(rec[planId] || {});
        const planAcc = {};
        // 추천된 coarse menuKey + 그 하위메뉴(라우트)·서브탭 까지 cascade ON (계층 일관성)
        for (const mk of allowMenuKeys) for (const k of expandMenuKeyAllLevels(mk)) planAcc[k] = 1;
        next[planId] = planAcc; // 계정수 무관 — 플랜별 동일 적용
      }
      return next;
    });
    setAccessDirty(true);
    const lines = planList
      .map(p => {
        const cnt = Object.keys(rec[p.id] || {}).length;
        const nm = (plans.find(pl => pl.plan_id === p.id)?.name) || p.id;
        const tierTag = tierOf[p.id] ? ` [${tierOf[p.id]}]` : '';
        return `· ${nm}${tierTag} $${p.price}/월 → ${cnt}개 메뉴그룹`;
      })
      .join('\n');
    alert(
      `경쟁사 벤치마크 기반 메뉴접근 추천 적용됨 — 1개월·1계정 요금 기준 (검토 후 [저장])\n` +
      lines + `\n` +
      `(Free=채널연동·상품/주문 3채널 무료 · 상위 플랜은 하위 포함 · 대/중/하위/서브탭 토글 수정 가능)`
    );
  };

  // 246차: 접근권한에 따라 ‘당연히 체크’ — 아직 구성 안 된 플랜은 추천 접근(=MENU_MIN_PLAN 폴백과 동일)으로
  //   체크박스 기본 체크. ★1회만(언체크 후 자동 재채움 방지) · 이미 구성된 플랜은 보존(admin 설정 우선).
  //   menus.length = 메뉴접근 로드 완료 신호(fetchMenuAccess 가 menus+access 동시 set).
  const _prefilledRef = useRef(false);
  useEffect(() => {
    if (_prefilledRef.current) return;
    if (!plans.length || !menus.length) return;
    const planList = plans
      .filter(p => p.plan_id && p.plan_id !== 'admin' && p.plan_id !== 'demo')
      .map(p => ({ id: p.plan_id, price: priceOf(p.plan_id) }));
    if (!planList.length) return;
    let rec;
    try { rec = recommendMenuAccessRealistic(planList).access; } catch { return; }
    _prefilledRef.current = true;
    setAccess(prev => {
      const next = { ...prev };
      let changed = false;
      for (const planId of Object.keys(rec)) {
        const cur = next[planId] || {};
        if (Object.values(cur).some(Boolean)) continue; // 이미 구성됨 → admin 설정 우선 보존
        const planAcc = {};
        for (const mk of Object.keys(rec[planId] || {})) for (const k of expandMenuKeyAllLevels(mk)) planAcc[k] = 1;
        next[planId] = planAcc;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [plans, menus, expandMenuKeyAllLevels]);

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
      ? { ...p, features: [...(p.features || []), t('planPricing.newFeatureItem', '새 기능 항목')] } : p));
  };

  const removeFeature = (planIdx, fIdx) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, features: (p.features || []).filter((_, j) => j !== fIdx) } : p));
  };

  // [254차] 이미지 호스팅(GB) ↔ 상품수 자동 연동(5MB/상품·PlanLimits::MB_PER_PRODUCT 정합). 무제한 상품(-1)→무제한 이미지.
  const imageGbForProducts = (p) => (p == null || p === '' || isNaN(Number(p))) ? null : (Number(p) < 0 ? -1 : Math.ceil(Number(p) * 5 / 1024));

  const updateLimit = (planIdx, key, val) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== planIdx) return p;
      const limits = { ...(p.limits || {}), [key]: val === '' ? null : Number(val) };
      // 상품수 변경 시 이미지 호스팅 용량 자동 산출(상품수×5MB→GB). 이미지호스팅은 읽기전용 파생값이라 직접 입력 없음.
      if (key === 'products') limits.image_hosting_gb = imageGbForProducts(val);
      return { ...p, limits };
    }));
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
    if (blockRO()) return;
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
    if (blockRO()) return;
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
    if (blockRO()) return;
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
    if (blockRO()) return; // [266차] 하위관리자 열람전용 게이트(231차 패턴·누락 보강)
    const planId = window.prompt('새 플랜 ID (영문 소문자, 예: business)');
    if (!planId) return;
    const id = String(planId).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!id) { alert('유효한 plan ID 를 입력하세요 (영문/숫자)'); return; }
    if (plans.some(p => p.plan_id === id)) { alert(`'${id}' 플랜이 이미 존재합니다`); return; }
    const name = window.prompt('플랜 표시 이름 (예: Business)', id.charAt(0).toUpperCase() + id.slice(1)) || id;
    try {
      await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(id)}`, 'PUT', {
        name, description: '', price_usd: 0, price_annual_usd: 0,
        features: [], limits: { channels: -1, orders_monthly: -1, products: -1, users: -1, suppliers: -1, logistics: -1, warehouses: -1, image_hosting_gb: -1 },
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
    if (blockRO()) return; // [266차] 하위관리자 열람전용 게이트(누락 보강)
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
      } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
      window.location.href = '/login';
    };
    return (
      <div style={{ padding: '60px 24px', minHeight: '100%', color: 'var(--text-1)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{
          maxWidth: 460, width: '100%', textAlign: 'center', padding: '36px 32px', borderRadius: 16,
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.22)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{t('planPricing.reloginTitle', '관리자 재로그인이 필요합니다')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 22 }}>
            {t('planPricing.reloginExpired', '관리자 세션이 만료되었거나 로그인되지 않았습니다.')}<br />
            {t('planPricing.reloginGuidePre', '로그인 화면에서 ')}<strong>{t('planPricing.reloginGuideLogo', '로고를 클릭')}</strong>{t('planPricing.reloginGuidePost', ' → 접속 코드 입력 후 관리자 계정으로 다시 로그인해 주세요.')}
          </div>
          <button onClick={relogin} style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff',
            fontSize: 14, fontWeight: 800, cursor: 'pointer',
          }}>{t('planPricing.reloginBtn', '🔐 관리자 로그인으로 이동')}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '18px 24px', minHeight: '100%', color: 'var(--text-1)' }}>
      {readOnly && <ReadOnlyBanner />}
      <div style={{
        borderRadius: 14, padding: '16px 20px', marginBottom: 14,
        background: 'rgba(34,197,94,0.10)',
        border: '1px solid rgba(34,197,94,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>💳</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{t('planPricing.headerTitle', '플랜별 구독요금 설정')}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
                {t('planPricing.headerDescPre', 'USD 단일 · Paddle MoR · 카드 결제 전용 · 모든 요금 ')}<b>{t('planPricing.headerVatExcl', 'VAT 별도')}</b>{t('planPricing.headerDescPost', ' 입력(결제 시 부가세 자동 가산)')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* [286차] Paddle 재동기화 — 백엔드가 각 플랜의 Product/월·연 Price 를 API 로 자동 생성/갱신. */}
            <button onClick={() => runPaddleSync(null)} disabled={paddleSyncing} style={{
              padding: '10px 16px', borderRadius: 9, border: 'none',
              background: paddleSyncing ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: '#fff', fontSize: 14, fontWeight: 800, cursor: paddleSyncing ? 'wait' : 'pointer',
            }}>{paddleSyncing ? t('planPricing.paddleSyncing', '⏳ 동기화 중…') : t('planPricing.paddleResyncBtn', '🔁 Paddle 재동기화')}</button>
            <button onClick={() => window.open('https://vendors.paddle.com/products-v2', '_blank')} style={{
              padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>{t('planPricing.paddleDashboardBtn', '🔗 Paddle Dashboard')}</button>
            {plans.length === 0 && !loading && (
              <button onClick={seedDefaults} style={{
                padding: '10px 16px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}>{t('planPricing.seed3PlansBtn', '🌱 초기 3 플랜 등록')}</button>
            )}
            <button onClick={fetchPlans} style={{
              padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}>{t('planPricing.refreshBtn', '🔄 새로고침')}</button>
          </div>
        </div>
      </div>

      {/* [286차] Paddle 동기화 상태 패널 — 환경(sandbox/production)·구성여부·플랜별 Product/Price ID·동기화 상태·시각. */}
      <div style={{
        marginBottom: 18, padding: '14px 16px', borderRadius: 12,
        background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.20)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: paddleStatus && paddleStatus.plans && paddleStatus.plans.length ? 10 : 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>💳 {t('planPricing.paddleStatusTitle', 'Paddle 동기화 상태')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
            background: paddleStatus?.configured ? '#d1fae5' : '#fee2e2', color: paddleStatus?.configured ? '#059669' : '#dc2626',
            border: '1px solid ' + (paddleStatus?.configured ? '#6ee7b7' : '#fca5a5') }}>
            {paddleStatus?.configured ? t('planPricing.paddleConfigured', '✅ 자격증명 설정됨') : t('planPricing.paddleNotConfigured', '⚠ 자격증명 미설정(PADDLE_SECRET_KEY)')}
          </span>
          {paddleStatus?.env && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
              background: paddleStatus.env === 'production' ? '#dbeafe' : '#fef3c7', color: paddleStatus.env === 'production' ? '#2563eb' : '#b45309',
              border: '1px solid ' + (paddleStatus.env === 'production' ? '#93c5fd' : '#fcd34d') }}>
              {paddleStatus.env === 'production' ? t('planPricing.paddleEnvLive', 'LIVE (production)') : 'SANDBOX'}
            </span>
          )}
          {paddleMsg && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{paddleMsg}</span>}
        </div>
        {paddleStatus && Array.isArray(paddleStatus.plans) && paddleStatus.plans.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 12 }}>
              <thead><tr>
                <th>{t('planPricing.paddleColPlan', '플랜')}</th>
                <th>{t('planPricing.paddleColProduct', 'Product ID')}</th>
                <th>{t('planPricing.paddleColMonthly', '월 Price ID')}</th>
                <th>{t('planPricing.paddleColAnnual', '연 Price ID')}</th>
                <th style={{ textAlign: 'center' }}>{t('planPricing.paddleColStatus', '상태')}</th>
                <th style={{ textAlign: 'center' }}>{t('planPricing.paddleColAction', '작업')}</th>
              </tr></thead>
              <tbody>
                {paddleStatus.plans.filter(p => !p.is_custom_quote).map(p => {
                  const synced = p.sync_status === 'synced' && p.paddle_product_id;
                  return (
                    <tr key={p.plan_id}>
                      <td style={{ fontWeight: 700 }}>{p.name || p.plan_id}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: p.paddle_product_id ? 'var(--text-2)' : '#9ca3af' }}>{p.paddle_product_id || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: p.price_id_monthly ? 'var(--text-2)' : '#9ca3af' }}>{p.price_id_monthly || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: p.price_id_annual ? 'var(--text-2)' : '#9ca3af' }}>{p.price_id_annual || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: synced ? '#d1fae5' : '#f3f4f6', color: synced ? '#059669' : '#6b7280' }}>
                          {synced ? t('planPricing.paddleSynced', '동기화됨') : t('planPricing.paddleUnsynced', '미동기화')}
                        </span>
                        {p.sync_at && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{String(p.sync_at).slice(0, 16).replace('T', ' ')}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => runPaddleSync(p.plan_id)} disabled={paddleSyncing} style={{
                          padding: '4px 10px', borderRadius: 7, border: 'none', background: '#7c3aed', color: '#fff',
                          fontSize: 10, fontWeight: 700, cursor: paddleSyncing ? 'wait' : 'pointer',
                        }}>{t('planPricing.paddleSyncOne', '동기화')}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {(!paddleStatus?.configured) && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
            {t('planPricing.paddleHint', 'PADDLE_SECRET_KEY(운영 .env)를 등록하면 재동기화 시 각 플랜의 Paddle Product·월/연 Price 가 자동 생성됩니다. Dashboard 수기 생성 불필요.')}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.20)',
          color: '#f87171', fontSize: 13,
        }}>{t('planPricing.plansFetchFail', '⚠ 플랜 조회 실패 — ')}{error}</div>
      )}

      {/* 179차 — 관리자 설정 순서 가이드 (무엇을 먼저 할지 명확화) */}
      {outerTab === 'plan' && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 12, padding: '7px 12px', borderRadius: 9, flexWrap: 'wrap', alignItems: 'center',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap' }}>{t('planPricing.setupOrder', '📌 설정 순서')}</span>
          {[
            { n: '①', t: t('planPricing.step1SelectPlan', '플랜 선택 또는 ＋추가') },
            { n: '②', t: t('planPricing.step2SetPrice', '구독 요금 설정 (USD)') },
            { n: '③', t: t('planPricing.step3SelectMenus', '제공할 메뉴·기능 선택') },
            { n: '④', t: t('planPricing.step4Save', '💾 저장 → 즉시 반영') },
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
          { id: 'plan',    label: t('planPricing.tabPlan', '💰 플랜별 설정 (요금 + 제공 메뉴·기능 + 접근 권한)') },
          { id: 'addons',  label: t('planPricing.tabAddons', '📦 상품등록 추가팩 (종량)') },
          { id: 'coupons', label: t('planPricing.tabCoupons', '🎟️ 쿠폰 관리') },
        ].map(tb => {
          const active = outerTab === tb.id;
          return (
            <button key={tb.id} onClick={() => setOuterTab(tb.id)} style={{
              padding: '13px 24px', border: 'none',
              // 활성: 찐한 파랑 배경 + 노랑 텍스트 (최대 가시성, 172차 p4)
              background: active ? '#1e3a8a' : 'transparent',
              color: active ? '#fde047' : '#cbd5e1',
              fontSize: 14, fontWeight: active ? 900 : 600, cursor: 'pointer',
              borderBottom: active ? '3px solid #fde047' : '3px solid transparent',
              borderRadius: active ? '8px 8px 0 0' : 0,
              marginBottom: -1,
              transition: 'all 150ms',
            }}>{tb.label}</button>
          );
        })}
      </div>

      {outerTab === 'coupons' && <CouponAdminPanel plans={plans} />}

      {outerTab === 'addons' && <ProductAddonPackEditor />}

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
          {t('planPricing.plansLoading', '플랜 목록 로딩 중…')}
        </div>
      )}

      {outerTab === 'plan' && !loading && plans.length === 0 && !error && (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t('planPricing.noPlans', '등록된 플랜이 없습니다')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            {t('planPricing.noPlansHint', '상단 "초기 3 플랜 등록" 으로 Starter/Pro/Enterprise 기본값을 생성하세요')}
          </div>
        </div>
      )}

      {outerTab === 'plan' && !loading && plans.length > 0 && (
        <>
          {/* ① 플랜 선택 — 카드로 한눈에 (가격 + 제공 메뉴 수 + ⭐추천) + ＋추가 */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            {t('planPricing.selectPlanHeading', '① 플랜 선택')}
          </div>
          <div style={{
            display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap',
          }}>
            {plans.map((p, i) => {
              const sel = activePlanIdx === i;
              const onCount = Object.values(access[p.plan_id] || {}).filter(Boolean).length;
              const m1 = basePeriods(periodPricing[p.plan_id])?.[1]?.price_usd ?? p.price_usd;
              const priceLabel = p.is_custom_quote ? t('planPricing.customQuote', '맞춤 견적')
                : (m1 != null && m1 !== '' ? `$${m1}${t('planPricing.perMonthShort', '/월')}` : t('planPricing.notSet', '미설정'));
              return (
              <button key={p.plan_id} onClick={() => setActivePlanIdx(i)} style={{
                flex: '1 1 180px', minWidth: 180, padding: '14px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                textAlign: 'left',
                background: sel ? '#1e3a8a' : 'rgba(255,255,255,0.06)',
                color: sel ? '#fde047' : '#e2e8f0',
                boxShadow: sel ? '0 0 0 2px #fde047 inset' : '0 0 0 1px rgba(255,255,255,0.10) inset',
                transition: 'all 150ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: sel ? 900 : 800, color: sel ? '#fde047' : '#f1f5f9' }}>
                  {(p.is_recommended === true || p.is_recommended === 1) && <span style={{ fontSize: 12 }}>⭐</span>}
                  {p.name || p.plan_id}
                  {p.is_active === false && <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>{t('planPricing.inactiveTag', '(비활성)')}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6, color: sel ? '#fff' : '#cbd5e1' }}>{priceLabel}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: sel ? '#e0e7ff' : '#94a3b8' }}>{t('planPricing.providedMenus', '제공 메뉴')} {onCount}{t('planPricing.countUnit', '개')}</div>
              </button>
              );
            })}
            <button onClick={addNewPlan} style={{
              flex: '0 0 auto', minWidth: 120, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
              border: '1px dashed rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.06)',
              color: '#22c55e', fontSize: 14, fontWeight: 800,
            }}>{t('planPricing.addNewPlanBtn', '＋ 새 플랜 추가')}</button>
          </div>

          {plan && (<>
            {/* ②③ 플랜 정의 & 구독 요금 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18, alignItems: 'start',
            }}>
              {/* 좌측 — 플랜 정의 (가격 제외 / name/desc/features/limits/flags) */}
              <div style={{ ...cardStyle, padding: '22px 24px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
                  {t('planPricing.planDefHeading', '📋 플랜 정의')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <Field label="Plan ID (immutable)"><input value={plan.plan_id} disabled style={{ ...inputStyle, opacity: 0.6 }} /></Field>
                  <Field label={t('planPricing.nameLabel', '이름')}><input value={plan.name || ''} onChange={e => updateField(activePlanIdx, { name: e.target.value })} style={inputStyle} /></Field>
                </div>
                <Field label={t('planPricing.descLabel', '설명')}><textarea value={plan.description || ''} onChange={e => updateField(activePlanIdx, { description: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{t('planPricing.featureListLabel', '기능 목록')}</div>
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
                  }}>{t('planPricing.addFeatureBtn', '＋ 기능 추가')}</button>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{t('planPricing.limitsLabel', '제공 한도 (Limits) · -1 = 무제한')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                    {[
                      { key: 'channels',         label: t('planPricing.limitChannels', '판매채널(쇼핑몰) 수') },
                      { key: 'orders_monthly',   label: t('planPricing.limitOrders', '주문 수 (월)') },
                      { key: 'products',         label: t('planPricing.limitProducts', '상품 DB 수') },
                      { key: 'suppliers',        label: t('planPricing.limitSuppliers', '매입처 ID 수') },
                      { key: 'logistics',        label: t('planPricing.limitLogistics', '물류처 ID 수') },
                      { key: 'warehouses',       label: t('planPricing.limitWarehouses', '창고(WMS) 수') },
                    ].map(({ key, label }) => (
                      <Field key={key} label={label}>
                        <input type="number" value={plan.limits?.[key] ?? ''} onChange={e => updateLimit(activePlanIdx, key, e.target.value)} style={inputStyle} />
                      </Field>
                    ))}
                    {/* [254차] 이미지 호스팅(GB) — 상품수 변경 시 권장값 자동 채움(5MB/상품), 단 admin 자유 수정 가능. */}
                    <Field label={t('planPricing.limitImageHosting', '이미지 호스팅 (GB)')}>
                      <input type="number" value={plan.limits?.image_hosting_gb ?? ''} onChange={e => updateLimit(activePlanIdx, 'image_hosting_gb', e.target.value)} style={inputStyle} />
                      {(() => { const rec = imageGbForProducts(plan.limits?.products); if (rec == null) return null;
                        const recTxt = rec < 0 ? t('planPricing.unlimited', '무제한') : `${rec} GB`;
                        const cur = plan.limits?.image_hosting_gb;
                        const match = (cur === rec) || (cur == null && rec === 0);
                        return (
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>{t('planPricing.recommendPrefix', '권장:')} {recTxt} {t('planPricing.recommendImageFormula', '(상품수×5MB)')}</span>
                            {!match && <button type="button" onClick={() => updateLimit(activePlanIdx, 'image_hosting_gb', rec < 0 ? '-1' : String(rec))}
                              style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer' }}>{t('planPricing.applyRecommendBtn', '권장 적용')}</button>}
                          </div>
                        ); })()}
                    </Field>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6 }}>
                    {t('planPricing.limitInfo1', '💡 각 플랜이 제공하는 자원 한도입니다. ')}<b>-1</b>{t('planPricing.limitInfo2', ' = 무제한. ')}<b>{t('planPricing.limitInfoChannelBold', '판매채널(쇼핑몰) 수')}</b>{t('planPricing.limitInfo3', '는 연동 가능한 쇼핑몰 채널 개수(예: Free=3 → 3개 평생 무료, 사방넷 모델),')}
                    <b>{t('planPricing.limitInfoOrdersBold', '주문 수(월)')}</b>·<b>{t('planPricing.limitInfoProductsBold', '상품 DB')}</b>·<b>{t('planPricing.limitInfoImageBold', '이미지 호스팅(GB)')}</b>{t('planPricing.limitInfo4', ' 등은 플랜별 제공량. 언제든 수정 가능.')}
                    <br/><b>{t('planPricing.limitInfoSeatBold', '계정(사용자) 수')}</b>{t('planPricing.limitInfo5', '는 아래 ')}<b>{t('planPricing.limitInfoSeatPricingBold', '"계정수(seat)별 요금"')}</b>{t('planPricing.limitInfo6', '에서 계정수 티어로 관리합니다(추가·삭제 가능).')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_custom_quote || false} onChange={e => { const checked = e.target.checked; updateField(activePlanIdx, { is_custom_quote: checked }); if (!checked) autoGenDefaultPeriods(plan.plan_id); }} /> {t('planPricing.customQuoteEnterprise', '맞춤 견적 (Enterprise)')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_active !== false} onChange={e => updateField(activePlanIdx, { is_active: e.target.checked })} /> {t('planPricing.activeLabel', '활성')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_recommended === true || plan.is_recommended === 1} onChange={e => updateField(activePlanIdx, { is_recommended: e.target.checked ? 1 : 0 })} /> {t('planPricing.recommendedPlanLabel', '⭐ 추천 플랜')}
                  </label>
                </div>

                {/* 플랜 비활성화 (저장은 하단 통합 버튼으로 일원화) */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18, padding: '14px 0 0', borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', flex: 1 }}>
                    {t('planPricing.savePlanHintPre', '💡 정의·요금·제공 메뉴를 모두 설정한 뒤 아래 ')}<strong style={{ color: '#22c55e' }}>{t('planPricing.savePlanHintBold', '이 플랜 저장')}</strong>{t('planPricing.savePlanHintPost', ' 한 번으로 반영됩니다')}
                  </div>
                  <button onClick={() => archivePlan(plan)} style={{
                    padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.25)',
                    background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>{t('planPricing.deactivatePlanBtn', '플랜 비활성화')}</button>
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
                  editSeatTier={editSeatTier}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>{t('planPricing.livePreview', '실시간 미리보기')}</div>
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
                menuScores={Object.fromEntries((Array.isArray(menuPricingSync?.menuScores) ? menuPricingSync.menuScores : []).map(s => [s.menu_key, s]))/*[266차 계약불일치] 백엔드는 배열 반환·이 카드는 menuScores[mk] 키접근→맵 변환(catOf 항상 standard 붕괴 해소). 스코어에디터는 sync.menuScores 배열 직접사용이라 무영향*/}
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
                {t('planPricing.saveAllInfoPre', '④ 저장하면 ')}<strong>{t('planPricing.saveAllInfoBold1', '요금 · 제공 메뉴 · 기능')}</strong>{t('planPricing.saveAllInfoMid', '이 모든 사용자 sidebar 에 ')}<strong style={{ color: '#22c55e' }}>{t('planPricing.saveAllInfoBold2', '즉시 반영')}</strong>{t('planPricing.saveAllInfoPost', '됩니다 (회원가입·결제 가격과도 동기화)')}
              </span>
              <button onClick={() => savePlanFull(plan)} disabled={saving === plan.plan_id} style={{
                padding: '14px 32px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff',
                fontSize: 14, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap',
                opacity: saving === plan.plan_id ? 0.6 : 1,
              }}>{saving === plan.plan_id ? t('planPricing.saving', '저장 중…') : `💾 ${plan.name || t('planPricing.thisPlan', '이 플랜')} ${t('planPricing.saveWord', '저장')}`}</button>
            </div>
          </>)}
        </>
      )}

      {/* [현 차수] ④ 메뉴 접근 권한 — 플랜별 설정(요금·기능) 아래로 통합. 요금과 메뉴를 한 화면에서 비교·편집. */}
      {outerTab === 'plan' && !loading && plans.length > 0 && (
        <div style={{ marginTop: 30, paddingTop: 24, borderTop: '2px dashed rgba(255,255,255,0.14)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            {t('planPricing.menuAccessHeading', '④ 플랜별 메뉴 접근 권한 — 요금과 함께 한눈에 설정')}
          </div>
          <MenuAccessTree
            plans={plans} menus={menus} access={access}
            setMenuAccess={setMenuAccess} setMenuAccessBulk={setMenuAccessBulk}
            togglePlanAll={togglePlanAll}
            saveAllAccess={saveAllAccess} saving={saving === 'access'} dirty={accessDirty}
            recommendMenuAccess={recommendMenuAccess}
            recommendAllPricing={recommendAllPricing}
          />
        </div>
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
  if (isCustomQuote) return { tiers: ['core', 'standard', 'premium', 'enterprise'], labelKey: 'tierCustomAll', label: '맞춤 견적 — 전체 제공' };
  const p = Number(priceUsd);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (p < 30)   return { tiers: ['core'], labelKey: 'tierStarter', label: 'Starter급 — 핵심 기능' };
  if (p < 80)   return { tiers: ['core', 'standard'], labelKey: 'tierGrowth', label: 'Growth급 — 핵심 + 표준' };
  if (p < 200)  return { tiers: ['core', 'standard', 'premium'], labelKey: 'tierPro', label: 'Pro급 — 핵심 + 표준 + 프리미엄' };
  return { tiers: ['core', 'standard', 'premium', 'enterprise'], labelKey: 'tierEnterprise', label: 'Enterprise급 — 전체 기능' };
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
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t('planPricing.providedMenusHeading', '③ 이 플랜이 제공하는 메뉴 & 기능')}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>
            {t('planPricing.checkedOnlyPre', '체크한 항목만 ')}<strong style={{ color: 'var(--text-2)' }}>{plan.name || plan.plan_id}</strong>{t('planPricing.checkedOnlyMid', ' 사용자 sidebar 에 표시 · 현재 ')}<strong style={{ color: '#22c55e' }}>{totalOn}{t('planPricing.countUnit', '개')}</strong>{t('planPricing.checkedOnlyPost', ' 제공')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => togglePlanAll(plan.plan_id, true)} style={{
            padding: '9px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.12)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>{t('planPricing.allowAll', '✓ 전체 허용')}</button>
          <button onClick={() => togglePlanAll(plan.plan_id, false)} style={{
            padding: '9px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.10)', color: '#f87171',
            border: '1px solid rgba(248,113,113,0.3)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>{t('planPricing.clearAll', '✗ 전체 해제')}</button>
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
              {t('planPricing.enteredPricePre', '입력한 요금 ')}<strong style={{ color: '#fde047' }}>${monthlyPrice}{t('planPricing.perMonthShort', '/월')}</strong> → <strong>{t(`planPricing.${reco.labelKey}`, reco.label)}</strong>{t('planPricing.recommendMid', ' · 권장 ')}<strong style={{ color: '#22c55e' }}>{recommendedKeys.length}{t('planPricing.countUnit', '개')}</strong>{t('planPricing.recommendMenuSuffix', ' 메뉴')}
            </div>
            <button onClick={applyRecommend} style={{
              padding: '9px 18px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#eab308,#facc15)', color: '#1a1a1a',
              fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{t('planPricing.applyPriceRecommend', '요금 기준 추천 적용')}</button>
          </>
        ) : (
          <div style={{ flex: 1, fontSize: 13, color: 'var(--text-3)' }}>
            {t('planPricing.enterPriceHint', '② 구독 요금(USD)을 입력하면, 요금에 맞는 메뉴 구성을 자동으로 추천합니다.')}
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
                <button onClick={() => setMenuAccessBulk(plan.plan_id, keys, true)} title={t('planPricing.sectionAllowAll', '섹션 전체 허용')} style={{
                  padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.25)',
                  background: 'transparent', color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>＋</button>
                <button onClick={() => setMenuAccessBulk(plan.plan_id, keys, false)} title={t('planPricing.sectionClearAll', '섹션 전체 해제')} style={{
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
                    {recommended && !on && <span title={t('planPricing.priceRecommendedTip', '요금 기준 권장')} style={{ fontSize: 11 }}>💡</span>}
                    {g.items.length > 1 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{g.items.length}p</span>}
                    {!saveable && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('planPricing.readOnly', '읽기전용')}</span>}
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
  const t = useT();
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
          <div style={{ fontSize: 14, fontWeight: 800 }}>{plan.name || plan.plan_id} {t('planPricing.serviceDetailTitle', '플랜 — 제공 서비스 상세 (구독자 안내 미리보기)')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{t('planPricing.serviceDetailSubPre', '이 플랜 구독자가 받을 서비스 ')}{services.length}{t('planPricing.serviceDetailSubPost', '개 · 구버전식 상세 설명')}</div>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? t('planPricing.collapse', '▼ 접기') : t('planPricing.expand', '▶ 펼치기')}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          {featList.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 5 }}>{t('planPricing.coreBenefits', '✨ 핵심 혜택')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 6 }}>
                {featList.map((f, i) => (<div key={i} style={{ fontSize: 12, color: 'var(--text-1)', display: 'flex', gap: 6 }}><span style={{ color: '#22c55e' }}>✓</span><span>{f}</span></div>))}
              </div>
            </div>
          )}
          {services.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', marginBottom: 5 }}>{t('planPricing.availableServices', '🧩 이용 가능 서비스')} ({services.length})</div>
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
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>{t('planPricing.noServicesSelected', '아직 제공 서비스(메뉴 접근)가 선택되지 않았습니다. 위 ③ 또는 🔐 메뉴 접근 권한 탭에서 선택 후 저장하세요.')}</div>
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
  const t = useT();
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
          <div style={{ fontSize: 14, fontWeight: 800 }}>{t('planPricing.serviceGuideTitle', 'GeniegoROI 서비스 안내')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            {t('planPricing.serviceGuideSub', '올인원 커머스 AI 자동화 — 광고·상품·재고·주문·배송·분석·정산 A~Z 자동화')}
          </div>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? t('planPricing.collapse', '▼ 접기') : t('planPricing.expand', '▶ 펼치기')}</span>
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
                  <span style={{ fontSize: 14 }}>{f.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{t(`planPricing.${f.titleKey}`, f.title)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.45 }}>{t(`planPricing.${f.descKey}`, f.desc)}</div>
              </div>
            ))}
          </div>
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.6,
            background: 'rgba(253,224,71,0.08)', border: '1.5px solid #ca8a04',
            color: 'var(--text-1)',
          }}>
            <strong style={{ color: '#ca8a04', fontSize: 13 }}>{t('planPricing.menuAccessOpsTitle', '📋 플랜별 메뉴 접근 권한 운영 방식')}</strong>
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: '#ca8a04' }}>{t('planPricing.menuAccessTabBold', '🔐 메뉴 접근 권한')}</strong>{t('planPricing.menuAccessOpsDesc', ' 탭에서 플랜(Starter/Pro/Enterprise/Admin)별 8개 영역 세부 메뉴 자유 활성/비활성.')}
            </div>
            <div style={{ marginTop: 4 }}>
              {t('planPricing.treeLabel', '트리:')}&nbsp;
              <span style={{ color: '#4f46e5', fontWeight: 800 }}>{t('planPricing.treeMain', '대메뉴')}</span> →
              <span style={{ color: '#16a34a', fontWeight: 800, marginLeft: 4 }}>{t('planPricing.treeMid', '중메뉴')}</span> →
              <span style={{ color: '#d97706', fontWeight: 800, marginLeft: 4 }}>{t('planPricing.treeSub', '하위')}</span> →
              <span style={{ color: '#9333ea', fontWeight: 800, marginLeft: 4 }}>{t('planPricing.treeSubTab', '📑 서브탭')}</span>
              <span style={{ marginLeft: 6 }}>{t('planPricing.tree4Level', '4단계 개별 토글')}</span>
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
  const t = useT();
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
      try { new BroadcastChannel(tChannelName('geniego_menu_access_sync')).postMessage({ type: 'menu_access_updated', source: 'weight_edit', ts: Date.now() }); } catch { /* BroadcastChannel 미지원 환경 무시 */ }
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
          <div style={{ fontSize: 14, fontWeight: 800 }}>{t('planPricing.syncPanelTitle', '메뉴 권한 → 권장 요금 자동 산출')} <span style={{ fontSize: 11, color: '#9333ea', fontWeight: 700 }}>{t('planPricing.advanced', '초고도화')}</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            {t('planPricing.syncPanelDescPre', '각 메뉴의 가치 가중치 합 + AI premium → 플랜별 권장 월 요금. 전체 메뉴 가치 합 ')}${fmt(totalValue)}{t('planPricing.perMonthShort', '/월')}.
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); setEditMode(m => !m); }} style={{
          padding: '5px 12px', borderRadius: 6, border: 'none',
          background: editMode ? '#1e3a8a' : 'rgba(168,85,247,0.18)',
          color: editMode ? '#fde047' : '#9333ea', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          marginRight: 8,
        }}>{editMode ? t('planPricing.exitEditMode', '✓ 편집 모드 종료') : t('planPricing.editWeights', '💎 가중치 편집')}</button>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? t('planPricing.collapse', '▼ 접기') : t('planPricing.expand', '▶ 펼치기')}</span>
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
                <span style={{ fontSize: 13, fontWeight: 800, color: '#9333ea' }}>{t('planPricing.editWeightsTitle', '💎 메뉴 가치 가중치 편집')}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {t('planPricing.editWeightsDesc', '각 menuKey 의 weight_usd / category / AI premium 변경. 저장 즉시 권장가 재계산.')}
                </span>
                <div style={{ flex: 1 }} />
                <button onClick={saveScores} disabled={savingScores || Object.keys(editedScores).length === 0} style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none',
                  background: Object.keys(editedScores).length > 0 ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : 'rgba(255,255,255,0.06)',
                  color: Object.keys(editedScores).length > 0 ? '#fff' : 'var(--text-3)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  opacity: savingScores ? 0.6 : 1,
                }}>{savingScores ? t('planPricing.saving', '저장 중…') : `💾 ${t('planPricing.saveWord', '저장')} (${Object.keys(editedScores).length}${t('planPricing.countUnit', '개')})`}</button>
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
            <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>{t('planPricing.roundingPolicy', '라운딩 정책:')}</span>
            {[
              { id: 'integer',    label: t('planPricing.roundInteger', '정수 (예: $147)') },
              { id: 'nearest-10', label: t('planPricing.round10', '10단위 (예: $150)') },
              { id: 'nearest-9',  label: t('planPricing.round9', '9끝자리 (예: $149)') },
              { id: 'raw',        label: t('planPricing.roundRaw', '원본 (소수점)') },
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
                    {isCustom && <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: 'rgba(251,146,60,0.15)', color: '#d97706' }}>{t('planPricing.customTag', '맞춤')}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{t('planPricing.activeMenus', '활성 메뉴')} {p.enabledCount}{t('planPricing.countUnit', '개')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 8 }}>
                    {t('planPricing.currentLabel', '현재')} <strong style={{ color: 'var(--text-1)' }}>${fmt(p.currentMonthly)}</strong>{t('planPricing.perMonthShort', '/월')}
                  </div>
                  <div style={{
                    padding: '6px 10px', borderRadius: 6, marginBottom: 6,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.22)',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{t('planPricing.recommendedMonthly', '권장 월 요금')}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>${fmt(p.recommendedMonthly)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                      {t('planPricing.baseLabel', '기본')} ${fmt(p.baseSum)} + AI premium ${fmt(p.aiPremiumAdded)}
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
                      <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: 4 }}>{t('planPricing.vsCurrent', 'vs 현재')}</span>
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
                      {t('planPricing.tierSuggest', '💡 tier 분류 제안:')} <strong>{p.suggestedTier}</strong>
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
                        fontSize: 12, fontWeight: 700,
                        cursor: (applying === p.plan_id || p.delta === 0) ? 'default' : 'pointer',
                        opacity: applying === p.plan_id ? 0.6 : 1,
                      }}
                      title={`${t('planPricing.applyRecoTitlePre', '권장가 $')}${fmt(p.recommendedMonthly)}${t('planPricing.applyRecoTitlePost', ' 를 1m 가격에 적용 + 다른 기간 자동 산출')}`}
                    >
                      {applying === p.plan_id ? t('planPricing.applying', '적용 중…') : (p.delta === 0 ? t('planPricing.recoMatches', '✓ 권장가 일치') : t('planPricing.applyReco', '⚡ 권장가 적용'))}
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
            💡 <strong>{t('planPricing.howItWorksBold', '작동 원리')}</strong>{t('planPricing.howItWorks1', ': 각 메뉴의 USD 가치 (관리자 설정) + AI 가중치 합 = 권장 월 요금.')}
            <strong>{t('planPricing.menuAccessTabBold', '🔐 메뉴 접근 권한')}</strong>{t('planPricing.howItWorks2', ' 탭에서 메뉴를 추가/제거하면 권장가가 실시간 재계산됩니다.')}
            <strong>{t('planPricing.applyReco', '⚡ 권장가 적용')}</strong>{t('planPricing.howItWorks3', ' 버튼 클릭 시 1m 가격 → 다른 기간 (3/6/12개월) 자동 cascade (할인율 유지).')}
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
/* [251차] 상품등록 추가팩 가격 편집(admin SSOT) — GET/PUT /v424/admin/plan/product-addon-packs. */
function ProductAddonPackEditor() {
  const t = useT();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await getJsonAuth('/v424/admin/plan/product-addon-packs'); setPacks(Array.isArray(r?.packs) ? r.packs : []); }
    catch (e) { setMsg(t('planPricing.loadFail', '불러오기 실패: ') + (e?.message || e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const setField = (size, key, val) => setPacks(ps => ps.map(p => p.pack_size === size ? { ...p, [key]: val } : p));
  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const payload = packs.map(p => ({ pack_size: Number(p.pack_size), price_usd: Number(p.price_usd) || 0, is_active: Number(p.is_active) ? 1 : 0 }));
      const r = await requestJsonAuth('/v424/admin/plan/product-addon-packs', 'PUT', { packs: payload });
      if (r?.ok) { setMsg(t('planPricing.saved', '✅ 저장되었습니다.')); load(); } else setMsg(t('planPricing.saveFail', '저장 실패'));
    } catch (e) { setMsg(t('planPricing.saveFailColon', '저장 실패: ') + (e?.message || e)); } finally { setSaving(false); }
  };
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 };
  return (
    <div style={card}>
      <h3 style={{ marginTop: 0, color: 'var(--text-1,#e5e7eb)' }}>{t('planPricing.addonTitle', '📦 상품등록 추가팩 단가 (월 정기 · USD)')}</h3>
      <p style={{ fontSize: 13, color: 'var(--text-3,#94a3b8)', lineHeight: 1.6 }}>{t('planPricing.addonDescPre', '각 구독 플랜의 ')}<b>{t('planPricing.addonDescBold1', '기본 제공 상품등록 수')}</b>{t('planPricing.addonDescMid1', '(💰 플랜별 설정 탭)를 초과하면 구독회원이 구매하는 추가팩 가격입니다. 구매 시 ')}<b>{t('planPricing.addonDescBold2', '상품등록·광고디자인·이미지 호스팅 한도가 함께 확장')}</b>{t('planPricing.addonDescPost', '됩니다(상품 1건 ≈ 5MB). 기본 제공 수는 플랜별 설정에서, 추가팩 단가는 여기서 관리합니다.')}</p>
      {loading ? <div style={{ color: 'var(--text-3,#94a3b8)' }}>{t('planPricing.loading', '불러오는 중…')}</div> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', maxWidth: 580 }}>
            <thead><tr style={{ color: 'var(--text-3,#94a3b8)', fontSize: 12, textAlign: 'left' }}>
              <th style={{ padding: 8 }}>{t('planPricing.addonColPack', '추가팩(건)')}</th><th style={{ padding: 8 }}>{t('planPricing.addonColMonthly', '월 요금(USD)')}</th><th style={{ padding: 8 }}>{t('planPricing.addonColUnit', '건당 단가')}</th><th style={{ padding: 8 }}>{t('planPricing.activeLabel', '활성')}</th></tr></thead>
            <tbody>
              {packs.map(p => (
                <tr key={p.pack_size} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: 8, fontWeight: 800, color: 'var(--text-1,#e5e7eb)' }}>+{Number(p.pack_size).toLocaleString()}{t('planPricing.casesUnit', '건')}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ color: '#94a3b8' }}>$</span>
                    <input type="number" step="0.01" min="0" value={p.price_usd} onChange={e => setField(p.pack_size, 'price_usd', e.target.value)}
                      style={{ width: 92, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)', color: '#fff', marginLeft: 4 }} />
                  </td>
                  <td style={{ padding: 8, color: 'var(--text-3,#94a3b8)', fontSize: 12 }}>${(Number(p.price_usd) / Math.max(1, Number(p.pack_size))).toFixed(3)}</td>
                  <td style={{ padding: 8 }}>
                    <input type="checkbox" checked={!!Number(p.is_active)} onChange={e => setField(p.pack_size, 'is_active', e.target.checked ? 1 : 0)} />
                  </td>
                </tr>
              ))}
              {packs.length === 0 && <tr><td colSpan={4} style={{ padding: 12, color: 'var(--text-3,#94a3b8)' }}>{t('planPricing.noAddons', '추가팩이 없습니다.')}</td></tr>}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16 }}>
            <button onClick={save} disabled={saving} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? t('planPricing.saving', '저장 중…') : t('planPricing.savePriceBtn', '💾 가격 저장')}</button>
            {msg && <span style={{ fontSize: 13, fontWeight: 700, color: msg.startsWith('✅') ? '#22c55e' : '#f59e0b' }}>{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function CouponAdminPanel({ plans }) {
  const t = useT();
  // [266차 회귀수정] grantFreePlan 이 이 컴포넌트 소속인데 blockRO 는 PlanPricing 스코프라 ReferenceError(클릭 크래시)였다.
  //   CouponAdminPanel 자체 열람전용 게이트 정의(하위관리자 쓰기차단·231차 패턴 정합).
  const readOnly = useAdminReadOnly();
  const blockRO = () => { if (readOnly) { try { alert('열람 전용 권한입니다. 수정 권한은 최고관리자에게 요청하세요.'); } catch { /* 알림 표시 실패 무시 */ } return true; } return false; };
  const [data, setData] = useState(null); // { ok, rules, stats, recent }
  const [loading, setLoading] = useState(false);
  const [issueForm, setIssueForm] = useState({
    plan: 'starter', duration_days: 30, max_uses: 1, issued_to_email: '', note: '', quantity: 1,
  });
  const [issueResult, setIssueResult] = useState(null);
  const [listFilter, setListFilter] = useState({ status: 'all', q: '', from: '', to: '', period: 'all' });
  const [listRows, setListRows] = useState([]);
  const [listSummary, setListSummary] = useState(null); // [현 차수] 기간별 발급현황 요약
  // [현 차수] 회원 검색·선택 + 결재없이 무료 부여
  const [memberQ, setMemberQ] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [selMember, setSelMember] = useState(null);
  const [grantPlan, setGrantPlan] = useState('pro');
  const [grantMonths, setGrantMonths] = useState('0'); // 0=무기한
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantMsg, setGrantMsg] = useState(null);

  const searchMembers = useCallback(async (q) => {
    const term = (q ?? '').trim();
    if (term.length < 1) { setMemberResults([]); return; }
    setMemberSearching(true);
    try {
      const d = await getJsonAuth(`/v423/admin/users?q=${encodeURIComponent(term)}&limit=10`);
      setMemberResults(Array.isArray(d?.users) ? d.users : []);
    } catch (e) { setMemberResults([]); }
    finally { setMemberSearching(false); }
  }, []);

  const grantFreePlan = useCallback(async () => {
    if (blockRO()) return; // [266차] 하위관리자 열람전용 게이트(회원 플랜 직접 변경 방어·누락 보강)
    if (!selMember) return;
    setGrantBusy(true); setGrantMsg(null);
    try {
      const months = parseInt(grantMonths) || 0;
      const r = await requestJsonAuth(`/v423/admin/users/${selMember.id}/plan`, 'PATCH', { plan: grantPlan, months });
      if (r?.ok) {
        const dur = months > 0 ? `${months}${t('planPricing.monthsUnit', '개월')}` : t('planPricing.foreverLifetime', '무기한(평생)');
        setGrantMsg({ ok: true, text: `✅ ${selMember.email} → ${grantPlan} ${t('planPricing.grantDone', '무료 부여 완료')} (${dur}, ${t('planPricing.noPayment', '결제 없음')})` });
        // 선택 회원 정보 갱신
        setSelMember(m => m ? { ...m, plan: grantPlan } : m);
      } else { setGrantMsg({ ok: false, text: `❌ ${r?.error || t('planPricing.grantFail', '부여 실패')}` }); }
    } catch (e) { setGrantMsg({ ok: false, text: `❌ ${String(e?.message || e)}` }); }
    finally { setGrantBusy(false); }
  }, [selMember, grantPlan, grantMonths]);

  // [현 차수] 기간별 발급현황 — 빠른 기간 버튼(오늘/7일/30일/이번달/전체) → from/to 계산
  const applyPeriod = useCallback((p) => {
    const fmt = (d) => d.toISOString().slice(0, 10);
    const now = new Date();
    let from = '', to = '';
    if (p === 'today') { from = fmt(now); to = fmt(now); }
    else if (p === '7d') { const d = new Date(now); d.setDate(d.getDate() - 6); from = fmt(d); to = fmt(now); }
    else if (p === '30d') { const d = new Date(now); d.setDate(d.getDate() - 29); from = fmt(d); to = fmt(now); }
    else if (p === 'month') { from = fmt(new Date(now.getFullYear(), now.getMonth(), 1)); to = fmt(now); }
    setListFilter(f => ({ ...f, period: p, from, to }));
  }, []);

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
      const params = { status: listFilter.status, q: listFilter.q, limit: '300' };
      if (listFilter.from) params.from = listFilter.from;
      if (listFilter.to) params.to = listFilter.to;
      const q = new URLSearchParams(params);
      const d = await getJsonAuth(`/v424/admin/coupons/list?${q}`);
      setListRows(d?.coupons || []);
      setListSummary(d?.summary || null);
    } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ }
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

  if (loading && !data) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>{t('planPricing.couponLoading', '쿠폰 데이터 로딩 중…')}</div>;
  const rules = data?.rules || [];
  const stats = data?.stats || {};

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* ① 통계 카드 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
      }}>
        {[
          { label: t('planPricing.statTotalIssued', '전체 발급'), value: stats.total_coupons || 0, color: '#4f46e5' },
          { label: t('planPricing.statActiveUnused', '미사용 활성'), value: stats.active_coupons || 0, color: '#16a34a' },
          { label: t('planPricing.statRedeemed', '사용 완료'), value: stats.redeemed || 0, color: '#d97706' },
          { label: t('planPricing.statRevoked', '무효화'), value: stats.revoked || 0, color: '#dc2626' },
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
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>{t('planPricing.autoTriggerTitle', '📌 자동 발급 트리거 룰')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
          {t('planPricing.autoTriggerDesc', 'signup/upgrade/renewal 이벤트 발생 시 자동 발급. 각 룰 on/off + 플랜/기간 조정 가능.')}
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
                  {({ signup: t('planPricing.trigSignup', '🌱 가입'), upgrade: t('planPricing.trigUpgrade', '⬆️ 유료 전환'), renewal: t('planPricing.trigRenewal', '🔄 갱신'), term_3mo: t('planPricing.trigTerm3mo', '🎁 3개월 가입 보너스'), term_6mo: t('planPricing.trigTerm6mo', '🎁 6개월 가입 보너스'), term_12mo: t('planPricing.trigTerm12mo', '🎁 1년 가입 보너스') })[r.trigger_name] || ('🎟️ ' + r.trigger_name)}
                </span>
                <div style={{ flex: 1 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!r.is_active} onChange={e => updateRule(r.trigger_name, { is_active: e.target.checked ? 1 : 0 })} />
                  {r.is_active ? t('planPricing.activeLabel', '활성') : t('planPricing.inactiveLabel', '비활성')}
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{t('planPricing.planLabel', '플랜')}</div>
                  <select value={r.plan} onChange={e => updateRule(r.trigger_name, { plan: e.target.value })} style={inputS}>
                    {planOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{t('planPricing.durationDays', '기간 (일)')}</div>
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

      {/* [현 차수] 회원 검색·선택 + 결재없이 무료 부여 (쿠폰 redeem 불필요, 즉시 적용) */}
      <div style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 14, background: 'rgba(79,70,229,0.06)', border: '1.5px solid rgba(79,70,229,0.28)' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>{t('planPricing.grantTitle', '🎁 회원 직접 무료 부여 (결재 없이 즉시 적용)')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>{t('planPricing.grantDesc', '회원을 검색·선택한 뒤 구독 플랜을 결제 없이 무료로 부여합니다. 쿠폰 등록 절차 없이 즉시 반영됩니다. (체험 중인 회원은 체험 시작일 기준 산입)')}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input value={memberQ} onChange={e => setMemberQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchMembers(memberQ); } }}
            placeholder={t('planPricing.memberSearchPlaceholder', '회원 이메일 / 이름 / 회사 검색…')} style={{ ...inputS, flex: 1, minWidth: 220 }} />
          <button type="button" onClick={() => searchMembers(memberQ)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            {memberSearching ? t('planPricing.searching', '검색 중…') : t('planPricing.memberSearchBtn', '🔍 회원 검색')}
          </button>
        </div>
        {memberResults.length > 0 && !selMember && (
          <div style={{ display: 'grid', gap: 6, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
            {memberResults.map(m => (
              <button key={m.id} type="button" onClick={() => { setSelMember(m); setIssueForm(f => ({ ...f, issued_to_email: m.email })); setGrantMsg(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{m.name || t('planPricing.noName', '(이름없음)')}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{m.email}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>{m.plan}</span>
              </button>
            ))}
          </div>
        )}
        {memberResults.length === 0 && memberQ && !memberSearching && !selMember && (
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{t('planPricing.noSearchResults', '검색 결과가 없습니다.')}</div>
        )}
        {selMember && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#fff', border: '1px solid #c7d2fe' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{selMember.name}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{selMember.email}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>{t('planPricing.currentColon', '현재:')} {selMember.plan}</span>
              <button type="button" onClick={() => { setSelMember(null); setGrantMsg(null); }} style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>{t('planPricing.clearSelection', '✕ 선택 해제')}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.grantPlanLabel', '부여 플랜')}</div>
                <select value={grantPlan} onChange={e => setGrantPlan(e.target.value)} style={inputS}>
                  {planOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="free">{t('planPricing.freeConvertOption', 'free (무료회원 전환)')}</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.freePeriod', '무료 기간')}</div>
                <select value={grantMonths} onChange={e => setGrantMonths(e.target.value)} style={inputS}>
                  <option value="0">{t('planPricing.foreverLifetime', '무기한(평생)')}</option>
                  <option value="1">{t('planPricing.month1', '1개월')}</option>
                  <option value="3">{t('planPricing.month3', '3개월')}</option>
                  <option value="6">{t('planPricing.month6', '6개월')}</option>
                  <option value="12">{t('planPricing.month12', '12개월')}</option>
                </select>
              </div>
              <button type="button" onClick={grantFreePlan} disabled={grantBusy} style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: grantBusy ? '#cbd5e1' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 900, cursor: grantBusy ? 'default' : 'pointer', height: 38 }}>
                {grantBusy ? t('planPricing.processing', '처리 중…') : t('planPricing.grantFreeBtn', '🎁 결재없이 무료 부여')}
              </button>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('planPricing.grantOrHint', '또는 아래 쿠폰 발급에 이 회원 이메일이 자동 입력됩니다')}</span>
            </div>
            {grantMsg && <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: grantMsg.ok ? '#16a34a' : '#ef4444' }}>{grantMsg.text}</div>}
          </div>
        )}
      </div>

      {/* ③ 수동 발급 폼 */}
      <form onSubmit={handleIssue} style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'rgba(34,197,94,0.06)', border: '1.5px solid rgba(34,197,94,0.28)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>{t('planPricing.manualIssueTitle', '✨ 수동 쿠폰 발급 (admin 자율)')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
          {t('planPricing.manualIssueDesc', '플랜·무료 기간·발급 수량 자유 설정. 코드 자동 생성 (GENIE-XXXXXXXXXX).')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.planLabel', '플랜')}</div>
            <select value={issueForm.plan} onChange={e => setIssueForm(f => ({ ...f, plan: e.target.value }))} style={inputS}>
              {planOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.freePeriodDays', '무료 기간 (일)')}</div>
            <input type="number" min="1" max="365" value={issueForm.duration_days}
              onChange={e => setIssueForm(f => ({ ...f, duration_days: Number(e.target.value) || 1 }))}
              style={inputS} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.maxUses', '최대 사용 횟수')}</div>
            <input type="number" min="1" max="10000" value={issueForm.max_uses}
              onChange={e => setIssueForm(f => ({ ...f, max_uses: Number(e.target.value) || 1 }))}
              style={inputS} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.issueQuantity', '발급 수량')}</div>
            <input type="number" min="1" max="100" value={issueForm.quantity}
              onChange={e => setIssueForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))}
              style={inputS} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.targetEmail', '대상 이메일 (선택, 미입력 시 누구나 사용)')}</div>
            <input type="email" placeholder="user@example.com" value={issueForm.issued_to_email}
              onChange={e => setIssueForm(f => ({ ...f, issued_to_email: e.target.value }))} style={inputS} />
          </div>
          <div style={{ gridColumn: 'span 5' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, fontWeight: 700 }}>{t('planPricing.noteLabel', '메모 (admin 참고용)')}</div>
            <input type="text" placeholder={t('planPricing.notePlaceholder', '예: 4월 캠페인 / VIP 고객 / 데모 체험권')} value={issueForm.note}
              onChange={e => setIssueForm(f => ({ ...f, note: e.target.value }))} style={inputS} />
          </div>
          <button type="submit" style={{
            padding: '10px 14px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff',
            fontSize: 13, fontWeight: 900, cursor: 'pointer', height: 38,
          }}>{t('planPricing.issueBtn', '🎟️ 발급')}</button>
        </div>
        {issueResult && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 8,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
            fontSize: 12, color: 'var(--text-1)',
          }}>
            {t('planPricing.issueDone', '✅ 발급 완료 — ')}{issueResult.quantity}{t('planPricing.countUnit', '개')} × {issueResult.plan} {issueResult.duration}{t('planPricing.daysUnit', '일')} ·
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

      {/* ④ 발급 목록 — 기간별 발급현황·상태 */}
      <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{t('planPricing.couponListTitle', '📋 기간별 무료쿠폰 발급현황')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'all',      label: t('planPricing.filterAll', '전체') },
              { id: 'active',   label: t('planPricing.activeLabel', '활성') },
              { id: 'redeemed', label: t('planPricing.filterRedeemed', '사용됨') },
              { id: 'revoked',  label: t('planPricing.filterRevoked', '무효') },
            ].map(s => (
              <button key={s.id} type="button" onClick={() => setListFilter(f => ({ ...f, status: s.id }))} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                background: listFilter.status === s.id ? '#1e3a8a' : 'transparent',
                color: listFilter.status === s.id ? '#fde047' : 'var(--text-2)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>{s.label}</button>
            ))}
          </div>
          <input type="text" placeholder={t('planPricing.couponSearchPlaceholder', '코드/이메일/메모 검색…')} value={listFilter.q}
            onChange={e => setListFilter(f => ({ ...f, q: e.target.value }))}
            style={{ ...inputS, flex: 1, minWidth: 220, padding: '6px 10px', fontSize: 12 }} />
          <button onClick={fetchList} style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>{t('planPricing.refreshBtn', '🔄 새로고침')}</button>
        </div>

        {/* [현 차수] 기간 필터 + 발급현황 요약 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>{t('planPricing.periodLabel', '기간')}</span>
          {[
            { id: 'all', label: t('planPricing.filterAll', '전체') },
            { id: 'today', label: t('planPricing.periodToday', '오늘') },
            { id: '7d', label: t('planPricing.period7d', '최근 7일') },
            { id: '30d', label: t('planPricing.period30d', '최근 30일') },
            { id: 'month', label: t('planPricing.periodMonth', '이번 달') },
          ].map(p => (
            <button key={p.id} type="button" onClick={() => applyPeriod(p.id)} style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
              background: listFilter.period === p.id ? '#0f766e' : 'transparent',
              color: listFilter.period === p.id ? '#5eead4' : 'var(--text-2)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>{p.label}</button>
          ))}
          <input type="date" value={listFilter.from} onChange={e => setListFilter(f => ({ ...f, from: e.target.value, period: 'custom' }))}
            style={{ ...inputS, width: 140, padding: '5px 8px', fontSize: 11 }} />
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>~</span>
          <input type="date" value={listFilter.to} onChange={e => setListFilter(f => ({ ...f, to: e.target.value, period: 'custom' }))}
            style={{ ...inputS, width: 140, padding: '5px 8px', fontSize: 11 }} />
        </div>

        {listSummary && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { label: t('planPricing.sumIssued', '발급'), value: listSummary.total, c: '#4f46e5' },
              { label: t('planPricing.activeLabel', '활성'), value: listSummary.active, c: '#16a34a' },
              { label: t('planPricing.sumRedeemed', '사용완료'), value: listSummary.redeemed, c: '#d97706' },
              { label: t('planPricing.sumExpired', '만료'), value: listSummary.expired, c: '#64748b' },
              { label: t('planPricing.sumCancelled', '취소'), value: listSummary.revoked, c: '#dc2626' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: s.c + '18', border: '1px solid ' + s.c + '33' }}>
                <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: s.c }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
        {listRows.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, fontStyle: 'italic' }}>
            {t('planPricing.noCouponsMatch', '조건에 맞는 쿠폰 없음')}
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.colCode', '코드')}</th>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.planLabel', '플랜')}</th>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.periodLabel', '기간')}</th>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.colUse', '사용')}</th>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.colTarget', '대상')}</th>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.colStatus', '상태')}</th>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.colIssuedDate', '발급일')}</th>
                  <th style={{ padding: '8px 6px' }}>{t('planPricing.colAction', '액션')}</th>
                </tr>
              </thead>
              <tbody>
                {listRows.map(c => {
                  const status = c.is_revoked ? t('planPricing.filterRevoked', '무효') : (c.redeemed_at ? t('planPricing.filterRedeemed', '사용됨') : t('planPricing.activeLabel', '활성'));
                  const statusColor = c.is_revoked ? '#dc2626' : (c.redeemed_at ? '#d97706' : '#16a34a');
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 6px', fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                      <td style={{ padding: '6px 6px' }}>{c.plan}</td>
                      <td style={{ padding: '6px 6px' }}>{c.duration_days}{t('planPricing.daysUnit', '일')}</td>
                      <td style={{ padding: '6px 6px' }}>{c.use_count}/{c.max_uses}</td>
                      <td style={{ padding: '6px 6px', fontSize: 11 }}>{c.issued_to_email || t('planPricing.anyone', '누구나')}</td>
                      <td style={{ padding: '6px 6px' }}>
                        <span style={{ padding: '1px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: `${statusColor}1A`, color: statusColor }}>{status}</span>
                      </td>
                      <td style={{ padding: '6px 6px', fontSize: 10, color: 'var(--text-3)' }}>{c.created_at?.slice(0, 16)}</td>
                      <td style={{ padding: '6px 6px' }}>
                        {!c.is_revoked && (
                          <button onClick={() => revokeCoupon(c.code)} style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: 'rgba(248,113,113,0.10)', color: '#dc2626',
                            border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer',
                          }}>{t('planPricing.revokeBtn', '무효화')}</button>
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

function MenuAccessTree({ plans, menus, access, setMenuAccess, setMenuAccessBulk, togglePlanAll, saveAllAccess, saving, dirty, recommendMenuAccess, recommendAllPricing }) {
  const t = useT();
  // 186차 요청: 클릭 단계 펼침(아코디언) — 대메뉴 클릭→중메뉴, 중메뉴 클릭→하위메뉴, 하위메뉴 클릭→서브탭.
  const _allMenuKeys = () => { const s = new Set(); for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) for (const it of (sec.items || [])) if (it.menuKey) s.add(it.menuKey); return s; };
  const _allLeafRoutes = () => { const s = new Set(); for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) for (const it of (sec.items || [])) if (it.to) s.add(it.to); return s; };
  const _allSectionKeys = () => { const c = new Set(); for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) c.add(sec.key); return c; };
  // [현 차수] 기본 전체 펼침 — 대→중→하위→서브탭 전 계층을 한 화면에 단계적으로 표시(요청).
  //   각 계층 행의 ▼/▶ 로 개별 접기·펼치기 가능, 상단 "전체 접기" 로 일괄 접기.
  const [collapsed, setCollapsed] = useState(() => new Set());     // 비어있음 = 전 섹션 펼침
  const [expandMenu, setExpandMenu] = useState(_allMenuKeys);      // 전 중메뉴 펼침
  const [expandLeaf, setExpandLeaf] = useState(_allLeafRoutes);    // 전 하위메뉴 서브탭 펼침
  const expandAll = () => { setCollapsed(new Set()); setExpandMenu(_allMenuKeys()); setExpandLeaf(_allLeafRoutes()); };
  const collapseAll = () => { setCollapsed(_allSectionKeys()); setExpandMenu(new Set()); setExpandLeaf(new Set()); };
  const [filter, setFilter] = useState('');
  const sections = useMemo(() => [...MEMBER_MENU, ...ADMIN_MENU], []);
  // 186차: 매트릭스는 sidebar manifest(sections) 기준 렌더. menu_tree(DB) 비어도 plan_menu_access 는 menu_key 로 저장되므로 전체 토글 허용.
  // [263차 재발방지] 전체 menuKey 수 useMemo 를 early-return 앞으로 호이스팅(Rules of Hooks — return 뒤 훅 배치 원인제거). 부모가 plans.length>0 게이트라 현재 도달불가였으나 구조적 안정화.
  const totalMenuKeys = useMemo(() => { const s = new Set(); for (const sec of sections) for (const it of sec.items) if (it.menuKey) s.add(it.menuKey); return s.size; }, [sections]);

  if (!plans.length) {
    return (<div style={{ padding: 40, borderRadius: 14, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-3)', fontSize: 14 }}>{t('planPricing.noPlansTree', '플랜이 없습니다. 먼저 "💰 플랜별 설정" 탭에서 플랜을 등록하세요.')}</div>);
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
  // [현 차수] 대메뉴 클릭 = 그 아래 전체 계층(중메뉴→하위메뉴→서브탭)을 한 번에 펼침/접음 → 한눈에 계층 비교.
  const _secGroupKeys = (sec) => groupsOf(sec).map(g => g.menuKey);
  const _secLeafRoutes = (sec) => groupsOf(sec).flatMap(g => g.items.map(it => it.to).filter(Boolean));
  const toggleSection = (sec) => {
    const willExpand = collapsed.has(sec.key);
    setCollapsed(prev => { const n = new Set(prev); if (willExpand) n.delete(sec.key); else n.add(sec.key); return n; });
    const gkeys = _secGroupKeys(sec); const lkeys = _secLeafRoutes(sec);
    setExpandMenu(prev => { const n = new Set(prev); gkeys.forEach(k => willExpand ? n.add(k) : n.delete(k)); return n; });
    setExpandLeaf(prev => { const n = new Set(prev); lkeys.forEach(k => willExpand ? n.add(k) : n.delete(k)); return n; });
  };
  // 계층 키 헬퍼 — 하위메뉴(=라우트 it.to) / 서브탭(=it.to::st.id)
  const subKeysOfLeaf = (it) => (SUB_TABS_BY_PATH[it.to] || []).map(st => `${it.to}::${st.id}`);
  const keysOfGroup = (g) => { const ks = [g.menuKey]; for (const it of g.items) { if (it.to) ks.push(it.to); ks.push(...subKeysOfLeaf(it)); } return ks; };
  // 186차: 모든 중메뉴는 하위메뉴(페이지) 를 가지므로 항상 펼침 가능 (단일 페이지도 드릴다운 일관성)
  const groupHasChildren = (g) => (g.items && g.items.length > 0);
  // 전체 menuKey 수 (manifest 기준, 중복 제거) — totalMenuKeys 는 위(early-return 앞)로 호이스팅됨[263차]
  const planStats = plans.map(p => ({ on: Object.values(access[p.plan_id] || {}).filter(Boolean).length, total: totalMenuKeys }));
  const cellPad = { padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' };

  return (
    <div>
      {/* 헤더 + 액션 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{t('planPricing.treeHeaderTitle', '🔐 플랜별 메뉴 접근 권한 — 한눈에 비교·편집')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
            {t('planPricing.treeHeaderDescPre', '행 = 제공 서비스(메뉴), 열 = 플랜. 한 페이지에서 각 플랜이 어떤 서비스를 제공하는지 비교하며 체크박스로 선택하세요. 편집 후 ')}<strong>{t('planPricing.saveAllWord', '전체 저장')}</strong>.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {typeof recommendMenuAccess === 'function' && (
            <button onClick={recommendMenuAccess} disabled={saving} title={t('planPricing.recommendMenuTip', '플랜별 월 요금 차이에 비례해 AI가 메뉴 접근을 추천')} style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.45)', background: 'rgba(168,85,247,0.14)', color: '#6b21a8', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}>{t('planPricing.recommendMenuBtn', '🤖 요금 기반 추천')}</button>
          )}
          {typeof recommendAllPricing === 'function' && (
          <button onClick={recommendAllPricing} disabled={saving} title={t('planPricing.recommendPriceTip', '경쟁사 벤치마크 1계정 base × 계정수 배수 × 기간할인 + 1년=3개월 무료 쿠폰. 플랜 탭에서 저장.')} style={{ padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(22,163,74,0.45)', background: 'rgba(22,163,74,0.12)', color: '#15803d', fontSize: 14, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}>{t('planPricing.recommendPriceBtn', '💰 추천가 일괄 채움(계정수·기간)')}</button>
          )}
          <button onClick={saveAllAccess} disabled={saving || !dirty} style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: dirty ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'rgba(255,255,255,0.06)', color: dirty ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 800, cursor: dirty ? 'pointer' : 'default', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}>{saving ? t('planPricing.saving', '저장 중…') : (dirty ? t('planPricing.saveAllBtn', '💾 전체 저장') : t('planPricing.savedBtn', '✓ 저장됨'))}</button>
        </div>
      </div>

      {/* 검색 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder={t('planPricing.menuSearchPlaceholder', '🔍 메뉴 이름/경로/키 검색…')} style={{ flex: 1, minWidth: 200, boxSizing: 'border-box', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-1)', fontSize: 14 }} />
        <button onClick={expandAll} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(56,189,248,0.45)', background: 'rgba(56,189,248,0.14)', color: '#0369a1', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('planPricing.expandAllBtn', '📂 전체 펼치기')}</button>
        <button onClick={collapseAll} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t('planPricing.collapseAllBtn', '📁 전체 접기')}</button>
      </div>

      {/* 246차: 플랜별 ‘접근 가능 메뉴 상세 설명’ — 체크박스 상태에서 동적 파생.
          체크 해제 → 그 메뉴 설명이 해당 플랜에서 사라지고, 체크 추가 → 아주 상세한 설명이 즉시 생성된다. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 16 }}>
        {plans.map(p => {
          const acc = access[p.plan_id] || {};
          const items = Object.keys(MENU_KEY_LABEL).filter(mk => acc[mk]);
          return (
            <div key={p.plan_id} style={{ border: '1px solid rgba(148,163,184,0.3)', borderRadius: 12, padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                {p.name || p.plan_id} <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{t('planPricing.accessMenusCountPre', '· 접근 ')}{items.length}{t('planPricing.accessMenusCountPost', '개 메뉴')}</span>
              </div>
              {items.length === 0
                ? <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{t('planPricing.noAccessMenus', '접근 가능한 메뉴가 없습니다. (체크하면 상세 설명이 생성됩니다)')}</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(mk => (
                      <div key={mk} style={{ fontSize: 11.5, lineHeight: 1.55 }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>• {MENU_KEY_LABEL[mk].title}</div>
                        <div style={{ color: '#475569' }}>{MENU_KEY_LABEL[mk].desc}</div>
                      </div>
                    ))}
                  </div>}
            </div>
          );
        })}
      </div>

      {/* 비교 매트릭스 (메뉴 × 플랜) — 187차: id=genie-plan-pricing(어두운 셀 흰글자 override 앵커) + 패널 단색 다크 */}
      <div id="genie-plan-pricing" style={{ borderRadius: 14, border: '1px solid rgba(148,163,184,0.25)', overflow: 'auto', background: '#243044' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
          <thead>
            <tr style={{ background: '#eef2f7' }}>
              {/* 187차 — thead 는 글로벌 규칙이 th 배경을 밝게 강제 → 어두운 글자로(흰글자 금지). 본문 셀만 흰글자. */}
              <th style={{ ...cellPad, textAlign: 'left', position: 'sticky', left: 0, background: '#eef2f7', minWidth: 240, zIndex: 1, color: '#1e293b', fontWeight: 800 }}>{t('planPricing.providedServiceMenu', '제공 서비스 (메뉴)')}</th>
              {plans.map((p, i) => (
                <th key={p.plan_id} style={{ ...cellPad, textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{p.name || p.plan_id}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{planStats[i].on}/{planStats[i].total} {t('planPricing.activeShort', '활성')}</div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 4 }}>
                    <button onClick={() => togglePlanAll(p.plan_id, true)} title={t('planPricing.planAddAll', '이 플랜 전체 추가')} style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.12)', color: '#22c55e', cursor: 'pointer' }}>{t('planPricing.checkAll', '✓전체')}</button>
                    <button onClick={() => togglePlanAll(p.plan_id, false)} title={t('planPricing.planRemoveAll', '이 플랜 전체 제거')} style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer' }}>{t('planPricing.uncheckAll', '✗전체')}</button>
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
                    <td data-gp="onColor" style={{ ...cellPad, position: 'sticky', left: 0, background: '#3f5170', cursor: 'pointer', color: '#ffffff' }} onClick={() => toggleSection(section)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#e2e8f0', fontSize: 13, width: 14 }}>{isCol ? '▶' : '▼'}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#4f46e5', color: '#fff', whiteSpace: 'nowrap' }}>{t('planPricing.badgeMain', '대메뉴')}</span>
                        <span style={{ fontSize: 14 }}>{section.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#ffffff' }}>{sectionLabel}</span>
                        <span style={{ fontSize: 10.5, color: '#c7d2fe', marginLeft: 2 }}>{isCol ? t('planPricing.sectionExpandHint', '▶ 클릭하면 전체 계층(중·하위·서브탭) 펼침') : t('planPricing.sectionAllLevels', '▼ 전체 계층')}</span>
                      </div>
                    </td>
                    {plans.map(p => {
                      const onCnt = sectionKeys.filter(k => isOn(p.plan_id, k)).length;
                      const all = onCnt === sectionKeys.length && sectionKeys.length > 0;
                      return (
                        <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                          <input type="checkbox" checked={all} ref={el => { if (el) el.indeterminate = onCnt > 0 && !all; }} onChange={e => setMenuAccessBulk(p.plan_id, sectionKeys, e.target.checked)} title={t('planPricing.sectionToggleAll', '이 대메뉴(섹션) 전체 선택/해제')} style={{ width: 17, height: 17, cursor: 'pointer' }} />
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
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#7c3aed', color: '#fff', whiteSpace: 'nowrap', marginTop: 1 }}>{t('planPricing.badgeMid', '중메뉴')}</span>
                              <div>
                                <div onClick={hasChildren ? () => toggleExpandMenu(g.menuKey) : undefined} style={{ fontWeight: 700, color: '#ffffff', fontSize: 13, cursor: hasChildren ? 'pointer' : 'default' }}>{title}{hasChildren && <span style={{ fontSize: 10.5, color: '#c4b5fd', marginLeft: 6, fontWeight: 700 }}>{menuExp ? t('planPricing.collapseChildren', '▼ 하위 접기') : `▶ ${t('planPricing.subMenuWord', '하위메뉴')} ${g.items.length}${t('planPricing.countUnit', '개')}`}</span>}</div>
                                {desc && <div style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.45, marginTop: 2, maxWidth: 340 }}>{desc}</div>}
                              </div>
                            </div>
                          </td>
                          {plans.map(p => (
                            <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                              <input type="checkbox" checked={isOn(p.plan_id, g.menuKey)} onChange={e => setMenuAccessBulk(p.plan_id, gKeys, e.target.checked)} title={t('planPricing.midToggle', '중메뉴(+하위메뉴·서브탭) 선택/해제')} style={{ width: 17, height: 17, cursor: 'pointer' }} />
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
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#0891b2', color: '#fff', whiteSpace: 'nowrap' }}>{t('planPricing.badgeSub', '하위메뉴')}</span>
                                    <span onClick={subs.length > 0 ? () => toggleExpandLeaf(it.to) : undefined} style={{ fontSize: 12.5, color: '#ffffff', fontWeight: 600, cursor: subs.length > 0 ? 'pointer' : 'default' }}>{it.icon} {gNavLabel(it.labelKey) || t(it.labelKey, it.labelKey.split('.').pop())}{subs.length > 0 && <span style={{ color: '#fcd34d', marginLeft: 4, fontWeight: 700 }}>{leafExp ? t('planPricing.collapseSubTabs', '▼ 서브탭 접기') : `▶ ${t('planPricing.subTabWord', '서브탭')} ${subs.length}${t('planPricing.countUnit', '개')}`}</span>}</span>
                                  </div>
                                </td>
                                {plans.map(p => (
                                  <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                                    <input type="checkbox" checked={isOn(p.plan_id, it.to)} onChange={e => setMenuAccessBulk(p.plan_id, lKeys, e.target.checked)} title={t('planPricing.subToggle', '하위메뉴(+서브탭) 선택/해제')} style={{ width: 15, height: 15, cursor: 'pointer' }} />
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
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#d97706', color: '#fff', whiteSpace: 'nowrap' }}>{t('planPricing.badgeSubTab', '서브탭')}</span>
                                        <span style={{ fontSize: 12.5, color: '#ffffff', fontWeight: 600 }}>📑 {st.label || st.id}</span>
                                      </div>
                                    </td>
                                    {plans.map(p => (
                                      <td key={p.plan_id} style={{ ...cellPad, textAlign: 'center' }}>
                                        <input type="checkbox" checked={isOn(p.plan_id, sk)} onChange={e => setMenuAccess(p.plan_id, sk, e.target.checked)} title={t('planPricing.subTabToggle', '서브탭 선택/해제')} style={{ width: 14, height: 14, cursor: 'pointer' }} />
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
        {t('planPricing.treeFooter1', '💡 한 행(중메뉴) 토글 = 동일 menuKey 를 공유하는 모든 하위 페이지 일괄 노출/숨김. 섹션 헤더의 ')}<strong>n/m</strong>{t('planPricing.treeFooter2', ' 버튼으로 섹션 전체를 플랜별 일괄 토글. 편집 후 ')}<strong>{t('planPricing.saveAllBtn', '💾 전체 저장')}</strong>.
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
function PeriodPricingPanel({ plan, periodPricing, updatePeriodField, addPeriod, removePeriod, newPeriodInput, setNewPeriodInput, seatTiers = DEFAULT_SEAT_TIERS, addSeatTier, removeSeatTier, editSeatTier }) {
  const t = useT();
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
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase' }}>
          {t('planPricing.seatPeriodPricingHeading', '📅 계정수별 · 기간별 구독 가격')}
        </div>
        <div style={{ flex: 1 }} />
        {isCustom && (
          <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(251,146,60,0.15)', color: '#fb923c', fontSize: 11, fontWeight: 700 }}>
            {t('planPricing.customQuoteNoPrice', '맞춤 견적 — 가격 입력 불필요')}
          </span>
        )}
      </div>

      {/* 186차: 계정수(seat) 티어 선택 + 관리 — 같은 플랜이라도 계정수별 요금 책정 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{t('planPricing.seatCountLabel', '👥 계정수 (같은 플랜, 계정수별 요금)')}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {seatTiers.map(tier => {
            const on = tier.key === seat;
            return (
              <span key={tier.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <button onClick={() => setActiveSeat(tier.key)} style={{
                  padding: '6px 12px', borderRadius: '8px 0 0 8px',
                  border: on ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.12)', borderRight: 'none',
                  background: on ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.03)',
                  color: on ? '#c7d2fe' : 'var(--text-2)', fontSize: 12, fontWeight: on ? 800 : 600, cursor: 'pointer',
                }}>{tier.unlimited ? t('planPricing.seatUnlimited', '♾ 무제한') : `${tier.count}${t('planPricing.seatUnit', '계정')}`}</button>
                <button onClick={() => editSeatTier?.(tier.key)} title={t('planPricing.editSeatCount', '계정수 수정')} style={{
                  padding: '6px 7px', border: on ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.12)', borderLeft: 'none', borderRight: 'none',
                  background: 'rgba(99,102,241,0.10)', color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>✎</button>
                <button onClick={() => removeSeatTier?.(tier.key)} title={t('planPricing.deleteSeatTier', '이 계정수 티어 삭제 (최소 1개 유지)')} style={{
                  padding: '6px 8px', borderRadius: '0 8px 8px 0', border: on ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.12)', borderLeft: 'none',
                  background: 'rgba(248,113,113,0.12)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>×</button>
              </span>
            );
          })}
          {/* 계정수 추가 */}
          <form onSubmit={handleAddSeat} style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
            <input value={newSeatInput} onChange={e => setNewSeatInput(e.target.value)} placeholder={t('planPricing.seatOrUnlimited', '계정수 or 무제한')}
              style={{ ...inputS, width: 120, padding: '5px 8px' }} />
            <button type="submit" style={{
              padding: '6px 12px', borderRadius: 8, border: '1px dashed rgba(34,197,94,0.4)',
              background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>{t('planPricing.addSeatBtn', '＋ 계정수')}</button>
          </form>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
          {t('planPricing.editingNowPre', '현재 편집 중: ')}<strong style={{ color: '#c7d2fe' }}>{activeTier ? (activeTier.unlimited ? t('planPricing.unlimitedSeat', '무제한 계정') : `${activeTier.count}${t('planPricing.seatUnit', '계정')}`) : seat}</strong>{t('planPricing.editingNowPost', ' — 아래 기간별 요금은 이 계정수에만 적용됩니다.')}
        </div>
      </div>

      {/* 안내 */}
      <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 12, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>
        💡 <strong>{t('planPricing.monthlyFeeBold', '월간 요금 (1개월)')}</strong>{t('planPricing.ssotInfo1', ' 이 SSOT. 입력 즉시 모든 기간의 ')}<strong>{t('planPricing.baseAmountBold', '기본 결제액 = 개월수 × 월간요금')}</strong>{t('planPricing.ssotInfo2', ' 으로 실시간 산출됩니다. 각 기간 할인율(%) 은 admin 자유 설정 → 최종 결제액 자동 계산. 통화 USD 고정 (Paddle MoR).')}
      </div>

      {/* 기간 추가 폼 — Enterprise(맞춤견적) 도 활성 (172차 사용자 요청: 견적가 등록 가능) */}
      <form onSubmit={handleAddSubmit} style={{
        display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14,
        padding: '10px 12px', borderRadius: 8,
        background: isCustom ? 'rgba(168,85,247,0.06)' : 'rgba(34,197,94,0.04)',
        border: isCustom ? '1px dashed rgba(168,85,247,0.35)' : '1px dashed rgba(34,197,94,0.25)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
          ＋ {isCustom ? t('planPricing.registerQuote', '견적가 등록 (기간별)') : t('planPricing.addPeriod', '기간 추가')}
        </span>
        <input
          type="number" min="1" max="60"
          value={newPeriodInput}
          onChange={e => setNewPeriodInput(e.target.value)}
          placeholder={t('planPricing.monthsPlaceholder', '개월수 (1~60)')}
          style={{ ...inputS, width: 160 }}
        />
        <button type="submit" disabled={!newPeriodInput} style={{
          padding: '7px 16px', borderRadius: 7, border: 'none',
          background: newPeriodInput
            ? (isCustom ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#16a34a,#22c55e)')
            : 'rgba(255,255,255,0.06)',
          color: newPeriodInput ? '#fff' : '#94a3b8',
          fontSize: 13, fontWeight: 800, cursor: newPeriodInput ? 'pointer' : 'default',
        }}>＋ {isCustom ? t('planPricing.addQuote', '견적가 추가') : t('planPricing.addWord', '추가')}</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {isCustom
            ? t('planPricing.customQuoteHint', '맞춤 견적가를 기간별로 직접 입력하세요 (Paddle Checkout 또는 수동 결제 안내)')
            : t('planPricing.periodRecommendHint', '추천: 2, 9, 18, 24, 36개월 등 자유 설정')}
        </span>
      </form>

      {/* 기간 매트릭스 — Enterprise(맞춤견적) 도 admin 이 견적가/요금 입력 가능 (172차 사용자 요청) */}
      {sortedMonths.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic' }}>
          {isCustom ? t('planPricing.customPlanAddPeriod', '맞춤 견적 플랜 — 상단 [+ 기간 추가] 로 견적가 등록') : t('planPricing.noPeriods', '등록된 기간이 없습니다. 상단에서 기간을 추가하세요.')}
        </div>
      ) : (() => {
        // 172차: 월간 요금이 SSOT. 1m 가격 변경 시 모든 기간 기본 결제액 = months × monthly 실시간 갱신.
        const monthlyBase = Number(pp[1]?.price_usd) || 0; // 기준 월간 요금
        return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', textAlign: 'left' }}>
              <th style={{ padding: '8px 6px', width: '16%' }}>{t('planPricing.periodLabel', '기간')}</th>
              <th style={{ padding: '8px 6px', width: '13%' }}>{t('planPricing.colMonthlyFee', '월간 요금 $')}</th>
              <th style={{ padding: '8px 6px', width: '14%' }}>{t('planPricing.colBaseAmount', '기본 결제액 $')}<br/><span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{t('planPricing.colBaseFormula', '(개월 × 월간)')}</span></th>
              <th style={{ padding: '8px 6px', width: '9%' }}>{t('planPricing.colDiscount', '할인 %')}</th>
              <th style={{ padding: '8px 6px', width: '14%' }}>{t('planPricing.colFinalAmount', '최종 결제액 $')}</th>
              <th style={{ padding: '8px 6px', width: '20%' }}>Paddle priceId</th>
              <th style={{ padding: '8px 6px', width: '7%', textAlign: 'center' }}>{t('planPricing.activeLabel', '활성')}</th>
              <th style={{ padding: '8px 6px', width: '7%', textAlign: 'center' }}>{t('planPricing.removeCol', '제거')}</th>
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
                    {getPeriodLabel(months, t)}
                    {isBase && <span style={{ display: 'block', fontSize: 10, color: '#22c55e', fontWeight: 700, marginTop: 2 }}>{t('planPricing.ssotBase', 'SSOT 기준')}</span>}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    {isBase ? (
                      <input type="number" step="0.01" min="0" disabled={false /* 172차: Enterprise 도 admin 견적가 입력 가능 */}
                        value={cfg.price_usd ?? ''}
                        onChange={e => updatePeriodField(plan.plan_id, seat, 1, { price_usd: e.target.value === '' ? null : Number(e.target.value) })}
                        style={{ ...inputS, fontWeight: 700, color: '#22c55e' }}
                        placeholder={t('planPricing.baseMonthlyFee', '기준 월 요금')} />
                    ) : (
                      <span style={{ color: 'var(--text-3)', fontSize: 11 }}>${perMonthDisplay}{t('planPricing.perMonthShort', '/월')}</span>
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
                      title={isBase ? t('planPricing.baseNoDiscount', '기준 가격(1m)은 할인 없음') : `${months}${t('planPricing.monthsDiscountTitle', '개월 할인율 (%)')}`} />
                  </td>
                  <td style={{ padding: '8px 6px', color: '#22c55e', fontWeight: 800, fontSize: 13 }}>
                    {finalTotal != null ? `$${finalTotal.toFixed(2)}` : '—'}
                    {!isBase && discountPct > 0 && finalTotal != null && grossTotal != null && (
                      <span style={{ display: 'block', fontSize: 10, color: '#fb923c', fontWeight: 700 }}>
                        −${(grossTotal - finalTotal).toFixed(2)} {t('planPricing.saveWord2', '절약')}
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
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>{t('planPricing.baseTag', '기준')}</span>
                    ) : (
                      <button onClick={() => removePeriod(plan.plan_id, seat, months)} disabled={false /* 172차: Enterprise 도 admin 견적가 입력 가능 */} style={{
                        padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(248,113,113,0.10)', color: '#f87171',
                        border: '1px solid rgba(248,113,113,0.28)',
                        fontSize: 12, fontWeight: 700,
                        cursor: isCustom ? 'default' : 'pointer', opacity: isCustom ? 0.4 : 1,
                      }} title={t('planPricing.removePeriodTitle', '이 기간 제거 (저장 시 적용)')}>×</button>
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
  const t = useT();
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
          color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>⭐ MOST POPULAR</div>
      )}
      <div style={{ fontSize: 12, fontWeight: 700, color: isRecommended ? '#6366f1' : '#22c55e', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{plan.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 22, minHeight: 32 }}>{plan.description || '—'}</div>
      <div style={{ marginBottom: 18 }}>
        {isCustom ? (
          <span style={{ fontSize: 32, fontWeight: 900 }}>{t('planPricing.customQuote', '맞춤 견적')}</span>
        ) : (
          <>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-3)' }}>USD </span>
            <span style={{ fontSize: 44, fontWeight: 900 }}>${m1Price ?? '—'}</span>
            <span style={{ fontSize: 14, color: 'var(--text-3)', marginLeft: 4 }}>{t('planPricing.perMonthShort', '/월')}</span>
            {m12Price != null && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t('planPricing.annualBillingPre', '연간 결제 시 ')}${m12Price}{t('planPricing.perMonthShort', '/월')} ({t('planPricing.totalPrefix', '총 ')}${(m12Price * 12).toFixed(2)}{t('planPricing.perYearShort', '/년')})</div>
            )}
          </>
        )}
      </div>

      {/* 등록된 기간 옵션 요약 */}
      {!isCustom && sortedMonths.length > 0 && (
        <div style={{ marginBottom: 16, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{t('planPricing.subscriptionOptionsPre', '구독 옵션 (')}{sortedMonths.length}{t('planPricing.subscriptionOptionsPost', '개 기간)')}</div>
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
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{t('planPricing.paddleLegacySync', 'Paddle priceId (legacy 동기화)')}</div>
        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)' }}>
          M (1m): {m1PaddleId || t('planPricing.notSet', '미설정')}<br />
          A (12m): {m12PaddleId || t('planPricing.notSet', '미설정')}
        </div>
      </div>
    </div>
  );
}

export default PlanPricing;
