import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getJsonAuth, requestJsonAuth } from "../services/apiClient.js";
import { useT } from "../i18n/index.js";
import { MEMBER_MENU, ADMIN_MENU, buildMenuKeyIndex } from "../layout/sidebarManifest.js";

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
    description: '소규모 팀 · 단일 채널 운영',
    features: ['판매 채널 3개', '창고(WMS) 1개', '마케팅 분석', '팀 멤버 2명', 'API 호출 월 10,000건', '이메일 지원 (48시간 내)'],
    limits: { warehouses: 1, channels: 3, users: 2 },
  },
  {
    plan_id: 'pro', name: 'Pro', display_order: 20, is_active: true, is_custom_quote: false, is_recommended: 1,
    description: '성장 브랜드 · 멀티채널 운영',
    features: ['무제한 판매 채널', '무제한 창고', 'AI 마케팅 인텔리전스', '인플루언서 평가', '상업 송장 자동 생성', '팀 멤버 10명', 'API 호출 월 500,000건', '우선 지원 (8시간 내)'],
    limits: { warehouses: -1, channels: -1, users: 10 },
  },
  {
    plan_id: 'enterprise', name: 'Enterprise', display_order: 30, is_active: true, is_custom_quote: true,
    description: '대규모 운영 · 맞춤 통합',
    features: ['Pro 플랜 전체 기능', '맞춤 AI 모델 학습', '전담 계정 매니저', '99.9% 가용성 SLA', '무제한 팀 멤버', '무제한 API 호출', '맞춤 통합 & 웹훅', '온프레미스 배포 옵션'],
    limits: { warehouses: -1, channels: -1, users: -1 },
  },
];

/** 기간 라벨 — 1/3/6/12/24/36 명칭 + 그 외 단순 N개월. admin 이 자유 추가/제거 가능 (1~60개월). */
const NAMED_PERIODS = { 1: '월간', 3: '분기', 6: '반기', 12: '연간', 24: '2년', 36: '3년' };

/**
 * menuKey → 한글 라벨 + 설명 매핑 (대메뉴/중메뉴 구분 보강).
 * 메뉴 접근 권한 트리에서 영문 monospace 키 대신 한글로 명확하게 표시.
 */
const MENU_KEY_LABEL = {
  // 홈
  'home||dashboard':              { title: '홈 - 대시보드',        desc: 'KPI 요약 + 채널별 실시간 매출/광고비/ROAS' },
  'home||rollup':                 { title: '홈 - 롤업 뷰',          desc: '판매·광고·재고 통합 실시간 모니터링' },
  // 통합 그룹 (다수 페이지 함께 제어)
  'marketing':                    { title: '마케팅 / 광고 / CRM 통합', desc: '자동마케팅·캠페인·여정·광고분석·CRM·카카오·이메일·SMS·인플루언서·UGC 등 17개 페이지 함께 제어' },
  'ops':                          { title: '커머스 / 물류 통합',     desc: '옴니채널·카탈로그·주문허브·WMS·가격최적화·공급망·반품 등 7개 페이지 함께 제어' },
  'billing':                      { title: '재무 / 결산 통합',       desc: '정산·대사·요금제·감사로그 등 4개 페이지 함께 제어' },
  // 인사이트
  'analytics||performance_hub':   { title: '인사이트 - 성과 허브',   desc: '광고 성과 8차원 분석 + 채널/캠페인 비교' },
  'analytics||report_builder':    { title: '인사이트 - 리포트 빌더', desc: '커스텀 리포트 + 자동 발송 스케줄' },
  'analytics||pnl_analytics':     { title: '인사이트 - 통합 손익(P&L)', desc: 'SKU·채널·캠페인·크리에이터별 실시간 손익 + 이상 감지' },
  'analytics||ai_insights':       { title: '인사이트 - AI 인사이트', desc: 'GPT 기반 자동 인사이트 + 액션 추천' },
  'analytics||data_product':      { title: '인사이트 - 데이터 프로덕트', desc: '데이터 마트 + 쿼리 워크스페이스' },
  // 자동화
  'automation||ai_rule_engine':   { title: '자동화 - AI 룰 엔진',    desc: '임계값 기반 자동 액션 + GPT 제안' },
  'automation||approvals':        { title: '자동화 - 승인 큐',       desc: 'AI 제안 검토 + 원클릭 승인/반려' },
  'automation||writeback':        { title: '자동화 - 채널 라이트백', desc: '룰 결과를 광고 플랫폼에 자동 반영' },
  'automation||onboarding':       { title: '자동화 - 온보딩',        desc: '신규 고객 가이드 + 초기 설정 자동화' },
  // 데이터
  'data||integration_hub':        { title: '데이터 - 연동 허브',     desc: 'OAuth 커넥터 + 30+ 채널 API 관리' },
  'data||data_schema':            { title: '데이터 - 데이터 스키마', desc: '표준 이벤트 매핑 + 스키마 거버넌스' },
  'data||data_trust':             { title: '데이터 - 데이터 신뢰',   desc: '품질 검증 + 변화 감지 + 리니지' },
  // 운영 & 지원
  'system||workspace':            { title: '시스템 - 워크스페이스',  desc: '팀 멤버 / 권한 / 알림 설정' },
  'system||operations':           { title: '시스템 - 오퍼레이션',    desc: '백그라운드 작업 / 실패 큐 모니터링' },
  'system||case_study':           { title: '시스템 - 케이스 스터디', desc: '벤치마크 + 베스트 프랙티스 라이브러리' },
  'system||help_center':          { title: '시스템 - 도움말 센터',   desc: 'FAQ + 가이드 + 영상 튜토리얼' },
  'system||feedback':             { title: '시스템 - 피드백',        desc: '버그 신고 + 기능 제안' },
  'system||developer_hub':        { title: '시스템 - 개발자 허브',   desc: 'API 키 + 웹훅 + Webhook 로그' },
  // 관리자 전용
  'system||admin':                { title: '관리자 - 플랫폼 환경',   desc: '운영 환경 / 시스템 설정 (admin 전용)' },
  'system||plan_pricing':         { title: '관리자 - 플랜·요금',     desc: '구독 플랜 / 기간별 가격 / 메뉴 권한 관리' },
  'system||menu_tree':            { title: '관리자 - 메뉴 트리',     desc: 'sidebar 메뉴 정의 / 가시성 / 권한 매핑' },
  'system||db_admin':             { title: '관리자 - DB 스키마',     desc: '테이블 / 마이그레이션 / 통계' },
  'system||pg_config':            { title: '관리자 - 결제 PG',       desc: 'Paddle 환경설정 / 구독 통계' },
};

/**
 * 페이지별 서브탭 정의 — `/route` → [{ id, label }].
 * 페이지 내부 탭을 4단계로 노출해 admin 이 인지 가능. 권한 토글 시 `<route>::<id>` 형식으로
 * plan_menu_access 에 저장 (페이지 컴포넌트가 향후 단계적으로 본 권한 체크 반영).
 * 알려진 핵심 페이지만 정의 — 미정의 페이지는 sub-tab 없이 leaf 만 노출.
 */
const SUB_TABS_BY_PATH = {
  '/admin/plan-pricing': [
    { id: 'plan',        label: '플랜 & 요금' },
    { id: 'permissions', label: '메뉴 접근 권한' },
  ],
  '/db-admin': [
    { id: 'overview', label: '데이터베이스 현황' },
    { id: 'tables',   label: '테이블 관리' },
    { id: 'query',    label: '쿼리 실행기' },
    { id: 'backup',   label: '백업/복구' },
  ],
  '/performance': [
    { id: 'overview',  label: '개요' },
    { id: 'channels',  label: '채널별' },
    { id: 'campaigns', label: '캠페인별' },
    { id: 'funnel',    label: '퍼널' },
  ],
  '/pnl': [
    { id: 'overall',  label: '전체 손익' },
    { id: 'by_sku',   label: 'SKU별' },
    { id: 'by_channel', label: '채널별' },
    { id: 'by_campaign', label: '캠페인별' },
  ],
  '/integration-hub': [
    { id: 'connectors', label: '커넥터' },
    { id: 'mapping',    label: '매핑' },
    { id: 'logs',       label: '실행 로그' },
  ],
  '/ai-rule-engine': [
    { id: 'rules',   label: '룰 목록' },
    { id: 'builder', label: '룰 빌더' },
    { id: 'history', label: '실행 이력' },
  ],
  '/developer-hub': [
    { id: 'api_keys', label: 'API 키' },
    { id: 'webhooks', label: '웹훅' },
    { id: 'logs',     label: '웹훅 로그' },
  ],
  '/audit': [
    { id: 'recent',  label: '최근 활동' },
    { id: 'admin',   label: '관리자 행동' },
    { id: 'system',  label: '시스템 이벤트' },
  ],
  '/crm': [
    { id: 'segments', label: '세그먼트' },
    { id: 'cohort',   label: '코호트' },
    { id: 'journeys', label: '여정' },
    { id: 'churn',    label: '이탈 예측' },
  ],
  '/auto-marketing': [
    { id: 'overview', label: '개요' },
    { id: 'rules',    label: '자동화 룰' },
    { id: 'history',  label: '실행 이력' },
  ],
  '/campaign-manager': [
    { id: 'active',    label: '진행중' },
    { id: 'paused',    label: '일시중지' },
    { id: 'completed', label: '완료' },
  ],
  '/wms-manager': [
    { id: 'inventory', label: '재고 현황' },
    { id: 'warehouses', label: '창고 관리' },
    { id: 'transfers', label: '이동/조정' },
  ],
  '/order-hub': [
    { id: 'pending',   label: '신규/대기' },
    { id: 'shipping',  label: '배송중' },
    { id: 'completed', label: '완료' },
    { id: 'returns',   label: '반품' },
  ],
  '/admin': [
    { id: 'environment', label: '환경 설정' },
    { id: 'accounts',    label: '계정 관리' },
    { id: 'audit',       label: '감사 로그' },
    { id: 'maintenance', label: '유지보수' },
  ],
};

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
  const [periodPricing, setPeriodPricing] = useState({}); // { plan_id: { months: { price_usd, discount_pct, paddle_price_id, is_active } } }
  const [newPeriodInput, setNewPeriodInput] = useState(''); // "기간 추가" input 상태
  // 172차 Task #22 초고도화 — 메뉴 권한 ↔ 가격 자동 산출
  const [menuPricingSync, setMenuPricingSync] = useState(null); // { menuScores, plans:[{plan_id, recommendedMonthly, currentMonthly, delta, suggestedTier, categoryBreakdown, ...}], totals }
  const [pricingSyncApplying, setPricingSyncApplying] = useState(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getJsonAuth('/v424/admin/plans');
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
    } catch (e) {
      setError(String(e?.message || e));
      setPlans([]);
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
  const updatePeriodField = (planId, months, patch) => {
    setPeriodPricing(prev => {
      const planPP = { ...(prev[planId] || {}) };
      const cur = { ...(planPP[months] || {}) };
      const next = { ...cur, ...patch };
      planPP[months] = next;
      // 1m price_usd 변경 → 모든 다른 기간 자동 산출
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
      return { ...prev, [planId]: planPP };
    });
  };

  /** 기간 추가 — admin 이 N개월 (1-60) 자유 입력 */
  const addPeriod = (planId, months) => {
    const m = Number(months);
    if (!Number.isFinite(m) || m < 1 || m > 60) {
      alert('기간은 1~60개월 범위로 입력하세요');
      return;
    }
    setPeriodPricing(prev => {
      const planPP = { ...(prev[planId] || {}) };
      if (planPP[m]) {
        alert(`${m}개월은 이미 등록되어 있습니다`);
        return prev;
      }
      // 1m 가격이 있으면 자동 산출, 없으면 빈 값
      const base = Number(planPP[1]?.price_usd) || 0;
      // 추천 할인율: 3/6/12/24/36 명시값, 그 외는 단순 (m-1)*1.5% 비율 (0~30 clamp)
      const recommendedDiscount = { 3: 5, 6: 10, 12: 20, 24: 30, 36: 40 }[m]
        ?? Math.max(0, Math.min(30, (m - 1) * 2));
      planPP[m] = {
        price_usd: base > 0 ? +(base * (1 - recommendedDiscount / 100)).toFixed(2) : null,
        discount_pct: recommendedDiscount,
        paddle_price_id: '',
        is_active: true,
      };
      return { ...prev, [planId]: planPP };
    });
    setNewPeriodInput('');
  };

  /** 기간 제거 */
  const removePeriod = (planId, months) => {
    if (!window.confirm(`${months}개월 기간을 제거하시겠습니까? (저장 시 적용)`)) return;
    setPeriodPricing(prev => {
      const planPP = { ...(prev[planId] || {}) };
      delete planPP[months];
      return { ...prev, [planId]: planPP };
    });
  };

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { if (outerTab === 'permissions') fetchMenuAccess(); }, [outerTab, fetchMenuAccess]);
  useEffect(() => { if (outerTab === 'plan') fetchPeriodPricing(); }, [outerTab, fetchPeriodPricing]);
  // 172차 Task #22 — sync 데이터는 양쪽 탭에서 필요 (가격 탭 표시 + 권한 탭 저장 후 갱신)
  useEffect(() => { fetchMenuPricingSync(); }, [fetchMenuPricingSync]);
  // 메뉴 권한이 저장되면 sync 데이터 즉시 refetch (BroadcastChannel 이벤트)
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('geniego_menu_access_sync');
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
      const planAcc = {};
      menus.forEach(m => { planAcc[m.menu_key || m.id] = value ? 1 : 0; });
      return { ...prev, [planId]: planAcc };
    });
    setAccessDirty(true);
  };

  const saveAllAccess = async () => {
    setSaving('access');
    try {
      for (const p of plans) {
        const menusForPlan = {};
        menus.forEach(m => {
          const key = m.menu_key || m.id;
          menusForPlan[key] = access[p.plan_id]?.[key] ? 1 : 0;
        });
        await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(p.plan_id)}/menu-access`, 'PUT', { menus: menusForPlan });
      }
      await fetchMenuAccess();
      publishMenuAccessSync({ source: 'menu_access_bulk' });
      alert('메뉴 접근 권한 저장 완료 — 모든 user sidebar 자동 갱신');
    } catch (e) {
      alert(`저장 실패: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
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
  const savePlan = async (plan) => {
    if (!plan.plan_id) return;
    setSaving(plan.plan_id);
    try {
      // 1) plan 정의 저장 (가격 필드는 backend 가 step 2 후 plan_period_pricing 으로 덮어쓰지만,
      //    is_recommended/is_active/is_custom_quote 등 정책 필드는 본 단계에서 확정)
      await requestJsonAuth(`/v424/admin/plans/${encodeURIComponent(plan.plan_id)}`, 'PUT', {
        name: plan.name,
        description: plan.description,
        // 172차: Enterprise(맞춤견적) 도 admin 견적가 입력 가능 (NULL 강제 제거)
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

      // 2) 기간별 가격 저장 — 172차: Enterprise 도 admin 견적가 등록 가능
      const ppForPlan = periodPricing[plan.plan_id] || {};
      const periodsPayload = {};
      for (const m of Object.keys(ppForPlan).map(Number).filter(Number.isFinite)) {
        const cfg = ppForPlan[m] || {};
        periodsPayload[m] = {
          price_usd: cfg.price_usd ?? null,
          discount_pct: cfg.discount_pct ?? 0,
          paddle_price_id: cfg.paddle_price_id ?? '',
          is_active: cfg.is_active !== false,
        };
      }
      await requestJsonAuth(
        `/v424/admin/plans/${encodeURIComponent(plan.plan_id)}/period-pricing`,
        'PUT', { periods: periodsPayload },
      );

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

      {/* outer tab: plan | permissions */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {[
          { id: 'plan',        label: '💰 플랜 & 요금 (정의 + 기간별 가격 통합)' },
          { id: 'permissions', label: '🔐 메뉴 접근 권한' },
          { id: 'coupons',     label: '🎟️ 쿠폰 관리' },
        ].map(tb => {
          const active = outerTab === tb.id;
          return (
            <button key={tb.id} onClick={() => setOuterTab(tb.id)} style={{
              padding: '13px 24px', border: 'none',
              // 활성: 찐한 파랑 배경 + 노랑 텍스트 (최대 가시성, 172차 p4)
              background: active ? '#1e3a8a' : 'transparent',
              color: active ? '#fde047' : 'var(--text-3)',
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
          {/* 플랜 선택 탭 — 172차 p4 선명 컬러 */}
          <div style={{
            display: 'flex', gap: 6, marginBottom: 16, padding: 5, borderRadius: 12,
            background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {plans.map((p, i) => {
              const sel = activePlanIdx === i;
              return (
              <button key={p.plan_id} onClick={() => setActivePlanIdx(i)} style={{
                flex: 1, padding: '12px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: sel ? 900 : 700, fontSize: 14,
                // 활성: 찐한 파랑 + 선명 노랑 텍스트, 비활성: 어두운 배경 + 밝은 텍스트
                background: sel ? '#1e3a8a' : 'rgba(255,255,255,0.04)',
                color: sel ? '#fde047' : 'var(--text-2)',
                boxShadow: sel ? '0 0 0 2px #fde047 inset' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 150ms',
              }}>
                {(p.is_recommended === true || p.is_recommended === 1) && <span style={{ fontSize: 11 }}>⭐</span>}
                {p.name || p.plan_id}
              </button>
              );
            })}
          </div>

          {plan && (
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
                    <input type="checkbox" checked={plan.is_custom_quote || false} onChange={e => updateField(activePlanIdx, { is_custom_quote: e.target.checked })} /> 맞춤 견적 (Enterprise)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_active !== false} onChange={e => updateField(activePlanIdx, { is_active: e.target.checked })} /> 활성
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)' }}>
                    <input type="checkbox" checked={plan.is_recommended === true || plan.is_recommended === 1} onChange={e => updateField(activePlanIdx, { is_recommended: e.target.checked ? 1 : 0 })} /> ⭐ 추천 플랜
                  </label>
                </div>

                {/* 통합 저장 + 비활성화 */}
                <div style={{ display: 'flex', gap: 10, marginTop: 18, padding: '14px 0 0', borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', flex: '0 1 auto' }}>
                    💡 저장 시 플랜 정의 + 모든 기간별 가격이 함께 반영됩니다
                  </div>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => archivePlan(plan)} style={{
                    padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(248,113,113,0.25)',
                    background: 'rgba(248,113,113,0.06)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>비활성화</button>
                  <button onClick={() => savePlan(plan)} disabled={saving === plan.plan_id} style={{
                    padding: '10px 24px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg,#16a34a,#22c55e)',
                    color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    opacity: saving === plan.plan_id ? 0.6 : 1,
                  }}>{saving === plan.plan_id ? '저장 중…' : '💾 통합 저장 (플랜 + 기간별 가격)'}</button>
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
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>실시간 미리보기</div>
                  <PreviewCard plan={plan} periods={periodPricing[plan.plan_id] || {}} />
                </div>
              </div>
            </div>
          )}
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
  const [open, setOpen] = useState(true);
  if (!sync?.plans) return null;
  const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalValue = sync.totals?.allMenusValue || 0;
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
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{open ? '▼ 접기' : '▶ 펼치기'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
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

function MenuAccessTree({ plans, menus, access, setMenuAccess, setMenuAccessBulk, togglePlanAll, saveAllAccess, saving, dirty }) {
  const t = useT();
  const [activePlanIdx, setActivePlanIdx] = useState(0);
  const [collapsed, setCollapsed] = useState(() => new Set()); // 섹션 collapse 상태
  const [filter, setFilter] = useState(''); // leaf 검색 필터

  // SSOT: sidebar manifest. menu_tree DB row (menus) 와 교집합 검증.
  const sections = useMemo(() => [...MEMBER_MENU, ...ADMIN_MENU], []);
  const menuKeyIndex = useMemo(() => buildMenuKeyIndex(), []);
  // backend menu_tree 에 등록된 menu_key 집합 — 저장 가능 여부 판정 (manifest 만 있고 DB 미등록인 키는 read-only)
  const dbMenuKeys = useMemo(() => new Set(menus.map(m => m.menu_key || m.id)), [menus]);

  if (!plans.length) {
    return (
      <div style={{
        padding: 40, borderRadius: 14, textAlign: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        color: 'var(--text-3)', fontSize: 14,
      }}>플랜이 없습니다. 먼저 "요금·상세" 탭에서 플랜을 등록하세요.</div>
    );
  }
  if (!menus.length) {
    return (
      <div style={{
        padding: 40, borderRadius: 14, textAlign: 'center',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        color: 'var(--text-3)', fontSize: 14,
      }}>menu_tree 가 비어 있습니다. 169차 P1 seed migration 적용 필요.</div>
    );
  }

  const activePlan = plans[activePlanIdx] || plans[0];
  const planAcc = access[activePlan.plan_id] || {};
  const isOn = (mk) => !!planAcc[mk];

  // 섹션 단위 메타: 섹션 내 unique menuKey 들, 활성화 갯수, 전체 갯수
  const sectionMeta = (section) => {
    const groups = []; // [{ menuKey, items: [item, ...] }] — 순서 보존
    const seen = new Map();
    for (const it of section.items) {
      if (!it.menuKey) continue;
      if (!seen.has(it.menuKey)) {
        const grp = { menuKey: it.menuKey, items: [] };
        seen.set(it.menuKey, grp);
        groups.push(grp);
      }
      seen.get(it.menuKey).items.push(it);
    }
    const totalKeys = groups.length;
    const onKeys = groups.filter(g => isOn(g.menuKey)).length;
    return { groups, totalKeys, onKeys };
  };

  const toggleCollapse = (key) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // 검색어 일치 — i18n 라벨 + 경로 + menuKey 모두 매칭
  const matchesFilter = (item) => {
    if (!filter.trim()) return true;
    const q = filter.trim().toLowerCase();
    const label = (t(item.labelKey, item.labelKey) || '').toLowerCase();
    return label.includes(q) || (item.to || '').toLowerCase().includes(q) || (item.menuKey || '').toLowerCase().includes(q);
  };

  // 우측 패널용 — 현재 활성 menuKey 목록 + 영향 페이지 갯수
  const enabledKeys = Object.keys(planAcc).filter(k => planAcc[k]);
  const totalLeafImpact = enabledKeys.reduce((sum, k) => sum + (menuKeyIndex.get(k)?.length || 0), 0);

  // 전 플랜 통계 (플랜 선택 탭 배지용)
  const planStats = plans.map(p => {
    const acc = access[p.plan_id] || {};
    const onCount = Object.values(acc).filter(Boolean).length;
    return { onCount, total: dbMenuKeys.size };
  });

  return (
    <div>
      {/* 헤더: 안내 + 전체 저장 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6 }}>
          각 플랜의 사용자가 사이드바에서 볼 수 있는 메뉴를 결정합니다. 트리 구조: <strong>대메뉴(섹션) → 중메뉴(통합 그룹) → 하위 페이지 → 페이지 내 서브탭</strong>. ➕ <strong style={{ color:'#22c55e' }}>추가</strong> / ➖ <strong style={{ color:'#f87171' }}>제거</strong> 로 명시적 편집 후 우측 <strong>전체 저장</strong>.
        </div>
        <button onClick={saveAllAccess} disabled={saving || !dirty} style={{
          padding: '11px 26px', borderRadius: 10, border: 'none',
          background: dirty ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'rgba(255,255,255,0.06)',
          color: dirty ? '#fff' : '#94a3b8',
          fontSize: 14, fontWeight: 800, cursor: dirty ? 'pointer' : 'default',
          opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap',
        }}>{saving ? '저장 중…' : (dirty ? '💾 전체 저장 (모든 플랜)' : '✓ 저장됨')}</button>
      </div>

      {/* 플랜 선택 탭 — 한 플랜씩 편집 */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 14, padding: 5, borderRadius: 12,
        background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap',
      }}>
        {plans.map((p, i) => {
          const sel = activePlanIdx === i;
          return (
          <button key={p.plan_id} onClick={() => setActivePlanIdx(i)} style={{
            flex: 1, minWidth: 160, padding: '12px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontWeight: sel ? 900 : 700, fontSize: 14,
            // 172차 p4 — 찐한 파랑 + 노랑 텍스트, 미선택은 어두운 회색 + 밝은 텍스트
            background: sel ? '#1e3a8a' : 'rgba(255,255,255,0.04)',
            color: sel ? '#fde047' : 'var(--text-2)',
            boxShadow: sel ? '0 0 0 2px #fde047 inset' : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            transition: 'all 150ms',
          }}>
            <span>{p.name || p.plan_id}</span>
            <span style={{ fontSize: 12, opacity: sel ? 0.9 : 0.7 }}>
              {planStats[i].onCount} / {planStats[i].total} 활성
            </span>
          </button>
          );
        })}
      </div>

      {/* 검색 + 활성 플랜 컨트롤 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text" value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="🔍 메뉴 이름/경로/키 검색…"
          style={{
            flex: 1, minWidth: 240, padding: '10px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)',
            color: 'var(--text-1)', fontSize: 14,
          }}
        />
        <button onClick={() => togglePlanAll(activePlan.plan_id, true)} style={{
          padding: '10px 16px', borderRadius: 8,
          background: 'rgba(34,197,94,0.12)', color: '#22c55e',
          border: '1px solid rgba(34,197,94,0.3)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>✓ {activePlan.name} 전체 추가</button>
        <button onClick={() => togglePlanAll(activePlan.plan_id, false)} style={{
          padding: '10px 16px', borderRadius: 8,
          background: 'rgba(248,113,113,0.10)', color: '#f87171',
          border: '1px solid rgba(248,113,113,0.3)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>✗ {activePlan.name} 전체 제거</button>
      </div>

      {/* 2-pane 본체 — 좌: 트리, 우: 선택 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* 좌측 — 전체 메뉴 트리 (대메뉴 → 중메뉴 → 하위 페이지 → 서브탭, 4단계) */}
        <div style={{
          borderRadius: 14, padding: '16px 20px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            전체 메뉴 트리 — {activePlan.name}
          </div>
          {sections.map(section => {
            const meta = sectionMeta(section);
            const visibleGroups = meta.groups.filter(g => g.items.some(matchesFilter));
            if (filter.trim() && visibleGroups.length === 0) return null;
            const isCollapsed = collapsed.has(section.key);
            const allOn = meta.onKeys === meta.totalKeys && meta.totalKeys > 0;
            const allOff = meta.onKeys === 0;
            const sectionLabel = t(section.labelKey, section.labelKey.split('.').pop());
            return (
              <div key={section.key} style={{
                marginBottom: 12, borderRadius: 10,
                background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.04)',
              }}>
                {/* 대메뉴 헤더 (Level 1) — collapse + 섹션 일괄 토글 */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                  cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  flexWrap: 'wrap',
                }} onClick={() => toggleCollapse(section.key)}>
                  <span style={{ width: 12, color: 'var(--text-3)', fontSize: 12 }}>{isCollapsed ? '▶' : '▼'}</span>
                  <span style={{ fontSize: 16 }}>{section.icon}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800,
                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', letterSpacing: 0.5,
                  }}>대메뉴</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{sectionLabel}</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                    background: allOn ? 'rgba(34,197,94,0.18)' : (allOff ? 'rgba(248,113,113,0.10)' : 'rgba(251,146,60,0.18)'),
                    color: allOn ? '#22c55e' : (allOff ? '#f87171' : '#fb923c'),
                  }}>
                    {allOn ? '전체 포함' : (allOff ? '전체 제외' : `부분 ${meta.onKeys}/${meta.totalKeys}`)}
                  </span>
                  <div style={{ flex: 1 }} />
                  <button onClick={e => { e.stopPropagation(); setMenuAccessBulk(activePlan.plan_id, meta.groups.map(g => g.menuKey), true); }} style={{
                    padding: '5px 12px', borderRadius: 6,
                    background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.28)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>➕ 섹션 추가</button>
                  <button onClick={e => { e.stopPropagation(); setMenuAccessBulk(activePlan.plan_id, meta.groups.map(g => g.menuKey), false); }} style={{
                    padding: '5px 12px', borderRadius: 6,
                    background: 'rgba(248,113,113,0.10)', color: '#f87171',
                    border: '1px solid rgba(248,113,113,0.28)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}>➖ 섹션 제거</button>
                </div>

                {/* 중메뉴 (Level 2 — menuKey 그룹) */}
                {!isCollapsed && (
                  <div style={{ padding: '8px 12px 12px 30px' }}>
                    {visibleGroups.map(group => {
                      const on = isOn(group.menuKey);
                      const inDb = dbMenuKeys.has(group.menuKey);
                      const items = group.items.filter(matchesFilter);
                      const shareCount = group.items.length;
                      const groupLabel = MENU_KEY_LABEL[group.menuKey];
                      return (
                        <div key={group.menuKey} style={{
                          marginTop: 10, padding: '10px 12px', borderRadius: 8,
                          background: on ? 'rgba(34,197,94,0.05)' : 'rgba(248,113,113,0.03)',
                          border: `1px solid ${on ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.05)'}`,
                          opacity: inDb ? 1 : 0.55,
                        }}>
                          {/* 중메뉴 헤더 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 16, color: on ? '#22c55e' : '#f87171', width: 18, textAlign: 'center',
                            }}>{on ? '✓' : '✗'}</span>
                            <span style={{
                              padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 800,
                              background: 'rgba(34,197,94,0.15)', color: '#22c55e', letterSpacing: 0.5,
                            }}>중메뉴</span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
                              {groupLabel?.title || group.menuKey}
                            </span>
                            <code style={{
                              fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)',
                              padding: '1px 5px', borderRadius: 3, background: 'rgba(0,0,0,0.3)',
                            }}>{group.menuKey}</code>
                            {shareCount > 1 && (
                              <span style={{
                                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                                background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                              }}>🔗 {shareCount}개 페이지 함께 제어</span>
                            )}
                            {!inDb && (
                              <span style={{
                                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 800,
                                background: 'rgba(251,146,60,0.15)', color: '#fb923c',
                              }}>⚠ menu_tree 미등록</span>
                            )}
                            <div style={{ flex: 1 }} />
                            <button
                              onClick={() => setMenuAccess(activePlan.plan_id, group.menuKey, true)}
                              disabled={!inDb || on}
                              style={{
                                padding: '5px 12px', borderRadius: 6,
                                background: on ? 'rgba(255,255,255,0.04)' : 'rgba(34,197,94,0.15)',
                                color: on ? '#94a3b8' : '#22c55e',
                                border: `1px solid ${on ? 'rgba(255,255,255,0.06)' : 'rgba(34,197,94,0.32)'}`,
                                fontSize: 13, fontWeight: 700, cursor: (!inDb || on) ? 'default' : 'pointer',
                                opacity: (!inDb || on) ? 0.55 : 1,
                              }}
                              title="이 메뉴(및 연결된 모든 페이지)를 플랜에 추가"
                            >➕ 추가</button>
                            <button
                              onClick={() => setMenuAccess(activePlan.plan_id, group.menuKey, false)}
                              disabled={!inDb || !on}
                              style={{
                                padding: '5px 12px', borderRadius: 6,
                                background: !on ? 'rgba(255,255,255,0.04)' : 'rgba(248,113,113,0.12)',
                                color: !on ? '#94a3b8' : '#f87171',
                                border: `1px solid ${!on ? 'rgba(255,255,255,0.06)' : 'rgba(248,113,113,0.32)'}`,
                                fontSize: 13, fontWeight: 700, cursor: (!inDb || !on) ? 'default' : 'pointer',
                                opacity: (!inDb || !on) ? 0.55 : 1,
                              }}
                              title="이 메뉴(및 연결된 모든 페이지)를 플랜에서 제거"
                            >➖ 제거</button>
                          </div>
                          {groupLabel?.desc && (
                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 26, marginBottom: 8, lineHeight: 1.6 }}>
                              {groupLabel.desc}
                            </div>
                          )}
                          {/* 하위메뉴 (Level 3 — leaf 페이지) + 서브탭 (Level 4) */}
                          <div style={{ display: 'grid', gap: 4, paddingLeft: 26 }}>
                            {items.map(it => {
                              const leafLabel = t(it.labelKey, it.labelKey.split('.').pop());
                              const subTabs = SUB_TABS_BY_PATH[it.to] || [];
                              return (
                                <div key={it.to} style={{
                                  padding: '6px 8px', borderRadius: 6,
                                  background: 'rgba(0,0,0,0.15)',
                                  border: '1px solid rgba(255,255,255,0.03)',
                                }}>
                                  {/* 하위메뉴 (leaf 페이지) */}
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                                    color: on ? '#cbd5e1' : '#94a3b8',
                                  }}>
                                    <span style={{ width: 14, textAlign: 'center', opacity: 0.6 }}>{it.icon}</span>
                                    <span style={{
                                      padding: '1px 6px', borderRadius: 6, fontSize: 10, fontWeight: 800,
                                      background: 'rgba(251,191,36,0.15)', color: '#fbbf24', letterSpacing: 0.3,
                                    }}>하위</span>
                                    <span style={{ minWidth: 140, fontWeight: 700 }}>{leafLabel}</span>
                                    <code style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{it.to}</code>
                                    {subTabs.length > 0 && (
                                      <span style={{
                                        padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                        background: 'rgba(168,85,247,0.12)', color: '#c084fc',
                                      }}>📑 서브탭 {subTabs.length}</span>
                                    )}
                                  </div>
                                  {/* 서브탭 (Level 4) — 페이지 내부 탭 개별 토글 */}
                                  {subTabs.length > 0 && (
                                    <div style={{
                                      marginTop: 6, paddingLeft: 22, display: 'flex', flexWrap: 'wrap', gap: 6,
                                    }}>
                                      {subTabs.map(st => {
                                        const subKey = `${it.to}::${st.id}`; // sub-tab access key
                                        const subOn = !!planAcc[subKey];
                                        return (
                                          <button
                                            key={st.id}
                                            onClick={() => setMenuAccess(activePlan.plan_id, subKey, !subOn)}
                                            style={{
                                              padding: '4px 10px', borderRadius: 14, fontSize: 12, fontWeight: 700,
                                              border: subOn ? '1px solid rgba(168,85,247,0.45)' : '1px solid rgba(255,255,255,0.08)',
                                              background: subOn ? 'rgba(168,85,247,0.18)' : 'rgba(0,0,0,0.25)',
                                              color: subOn ? '#c084fc' : '#94a3b8',
                                              cursor: 'pointer',
                                              display: 'inline-flex', alignItems: 'center', gap: 4,
                                            }}
                                            title={`${st.label} (${subKey})`}
                                          >
                                            <span>{subOn ? '✓' : '○'}</span>
                                            <span>{st.label}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 우측 — 선택 요약 */}
        <div style={{
          position: 'sticky', top: 16, borderRadius: 14, padding: '20px 22px',
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.22)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#a5b4fc', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            선택 요약 — {activePlan.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#22c55e' }}>{enabledKeys.length}</span>
            <span style={{ fontSize: 14, color: 'var(--text-3)' }}>/ {dbMenuKeys.size} 메뉴 활성</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 16 }}>
            영향받는 페이지 <strong style={{ color: 'var(--text-2)' }}>{totalLeafImpact}개</strong>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, marginBottom: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-3)' }}>
            ✓ 포함된 메뉴 ({enabledKeys.length})
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'grid', gap: 5 }}>
            {enabledKeys.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0', fontStyle: 'italic' }}>
                선택된 메뉴 없음
              </div>
            )}
            {enabledKeys.map(k => {
              const leafs = menuKeyIndex.get(k) || [];
              // sub-tab 키 (xxx::yyy 형식) 와 일반 menuKey 분리
              const isSubTab = k.includes('::');
              const koLabel = MENU_KEY_LABEL[k]?.title;
              return (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 6,
                  background: isSubTab ? 'rgba(168,85,247,0.06)' : 'rgba(34,197,94,0.06)',
                  fontSize: 13,
                }}>
                  <span style={{ color: isSubTab ? '#c084fc' : '#22c55e' }}>{isSubTab ? '📑' : '✓'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {koLabel || k}
                    </div>
                    {(koLabel || leafs.length > 1) && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {k}{leafs.length > 1 && ` · ${leafs.length}개 페이지`}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setMenuAccess(activePlan.plan_id, k, false)} style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 12,
                    background: 'rgba(248,113,113,0.10)', color: '#f87171',
                    border: '1px solid rgba(248,113,113,0.25)', cursor: 'pointer',
                  }} title="제거">×</button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.65 }}>
            💡 <strong>중메뉴 토글</strong> = 동일 menuKey 를 공유하는 모든 하위 페이지가 일괄 노출/숨김.<br/>
            예: <code style={{ color: 'var(--text-2)' }}>marketing</code> 1개 토글 → 자동마케팅·CRM·캠페인 등 17개 페이지 동시 제어.<br/>
            <strong style={{ color: '#c084fc' }}>📑 서브탭</strong> 은 페이지 내 개별 탭 권한 (향후 단계 적용 예정).
          </div>
        </div>
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
function PeriodPricingPanel({ plan, periodPricing, updatePeriodField, addPeriod, removePeriod, newPeriodInput, setNewPeriodInput }) {
  const isCustom = plan.is_custom_quote;
  const pp = periodPricing[plan.plan_id] || {};
  const sortedMonths = Object.keys(pp).map(Number).filter(Number.isFinite).sort((a, b) => a - b);

  const inputS = {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)', color: 'inherit', fontSize: 13, fontFamily: 'inherit',
  };

  const handleAddSubmit = (e) => {
    e?.preventDefault?.();
    if (!newPeriodInput) return;
    addPeriod(plan.plan_id, newPeriodInput);
  };

  return (
    <div style={{
      borderRadius: 14, padding: '18px 20px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase' }}>
          📅 기간별 구독 가격
        </div>
        <div style={{ flex: 1 }} />
        {isCustom && (
          <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(251,146,60,0.15)', color: '#fb923c', fontSize: 11, fontWeight: 800 }}>
            맞춤 견적 — 가격 입력 불필요
          </span>
        )}
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
                        onChange={e => updatePeriodField(plan.plan_id, 1, { price_usd: e.target.value === '' ? null : Number(e.target.value) })}
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
                      onChange={e => updatePeriodField(plan.plan_id, months, { discount_pct: e.target.value === '' ? 0 : Number(e.target.value) })}
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
                      onChange={e => updatePeriodField(plan.plan_id, months, { paddle_price_id: e.target.value })}
                      style={inputS} />
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    <input type="checkbox" checked={cfg.is_active !== false}
                      onChange={e => updatePeriodField(plan.plan_id, months, { is_active: e.target.checked })} />
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                    {isBase ? (
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>기준</span>
                    ) : (
                      <button onClick={() => removePeriod(plan.plan_id, months)} disabled={false /* 172차: Enterprise 도 admin 견적가 입력 가능 */} style={{
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
