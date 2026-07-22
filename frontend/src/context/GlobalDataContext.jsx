// GlobalDataContext.jsx — v16 (완전 체험형 데모 Sandbox + 채널운영 + 마케팅 통합)
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 데이터 흐름:                                                              │
// │  재고 ←→ WmsManager ←→ OmniChannel ←→ Orders                              │
// │  Orders → 정산(Channel수수료/Ad Spend 차감) → P&L                                 │
// │  Ad Spend(BudgetPlanner) → P&L.adSpend → 영업이익                           │
// │  정산데이터(Reconciliation/KrChannel) → P&L.settlement                    │
// │  All → Dashboard KPI / Alerts                                            │
// │                                                                           │
// │  [v16] 체험형 데모: SNS마케팅 + AI추천 + 채널별가격 + 일괄등록/수정         │
// └─────────────────────────────────────────────────────────────────────────┘
import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { guardProductionState } from '../security/ContaminationGuard.js';
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js';

// [276차] 미인증(로그인 화면) 상태에서 인증 필요 EP 를 호출해 401 을 만들지 않기 위한 게이트.
//   로그인 시 TenantScopedProviders 의 key(tenantKey) 가 'anon'→tenant 로 바뀌며 Provider 가
//   리마운트되므로, 여기서 early-return 해도 로그인 직후 모든 effect 가 다시 돈다.
const authToken = () => localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
// [225차 P2-3] 취소/반품 판정 공용 캐논(dashPeriod 와 단일 소스 공유, 백엔드 OrderHub 토큰 정합).
import { isCancelledStatus as _isCancelledCanon, isReturnStatus as _isReturnCanon } from '../components/dashboards/orderStatusCanon.js';
import { tGet, tSet, currentTenant } from '../utils/tenantStorage.js'; // 180차: 회원(테넌트) 격리 영속
import {
  DEMO_INVENTORY, DEMO_ORDERS, DEMO_INOUT, DEMO_BUDGETS,
  DEMO_SETTLEMENT, DEMO_CAMPAIGNS, DEMO_CRM_SEGMENTS,
  DEMO_POPUPS, DEMO_ALERTS, DEMO_EMAIL_CAMPAIGNS,
  DEMO_KAKAO_CAMPAIGNS, DEMO_CONNECTED_CHANNELS, DEMO_CHANNELS,
  DEMO_SNS_CAMPAIGNS, DEMO_AI_RECOMMENDATIONS, DEMO_CHANNEL_PRICES,
  DEMO_DAILY_TRENDS, DEMO_PRODUCTS, DEMO_CRM_CUSTOMER_HISTORY,
  DEMO_CREATORS, DEMO_UGC_REVIEWS, DEMO_CHANNEL_STATS, DEMO_NEG_KEYWORDS,
  DEMO_KAKAO_CAMPAIGNS_EXTRA, DEMO_CALENDAR_EVENTS,
} from '../data/demoSeedData.js';

const GlobalDataContext = createContext(null);

/* ════════════════════════════════════════════════
   🎪 Demo Mode Detection & localStorage Persistence
════════════════════════════════════════════════ */
// 데모 판별은 정본(utils/demoEnv) 단일 소스 사용 — 운영 오염 방지 엄격 격리
import { IS_DEMO as _isDemo } from '../utils/demoEnv.js';
import { applyAttribution } from '../utils/influencerAttribution.js'; // 인플루언서 귀속 자동 산출

const DEMO_LS_PREFIX = 'geniego_demo_';
const DEMO_SEED_VERSION = 'v19.0';  // ★ v19(271차): 데모 시드 15개국 현지화(로드시점 lang 기준) — 재방문자 한글 캐시 무효화해 현지어 시드 재적용. (v18: 단일소스 자동산출 일체화)

// ★ 시드 버전 체크: 새 시드 배포 시 이전 localStorage 자동 초기화
if (_isDemo && typeof window !== 'undefined') {
  try {
    const savedVer = localStorage.getItem(DEMO_LS_PREFIX + '_version');
    if (savedVer !== DEMO_SEED_VERSION) {
      console.log(`[DEMO] 시드 버전 변경 감지: ${savedVer} → ${DEMO_SEED_VERSION} — localStorage 초기화`);
      Object.keys(localStorage).filter(k => k.startsWith(DEMO_LS_PREFIX)).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(DEMO_LS_PREFIX + '_version', DEMO_SEED_VERSION);
    }
  } catch { /* ignore */ }
}

/** localStorage에서 데이터 로드 (사용자 수정사항 영속) */
function loadDemoState(key, seedDefault) {
  if (!_isDemo) return Array.isArray(seedDefault) ? [] : (typeof seedDefault === 'object' ? {} : seedDefault);
  try {
    const saved = localStorage.getItem(DEMO_LS_PREFIX + key);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return seedDefault;
}

/** localStorage에 데이터 저장 (데모 모드에서만) */
function saveDemoState(key, data) {
  if (!_isDemo) return;
  try {
    localStorage.setItem(DEMO_LS_PREFIX + key, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

/* ════════════════════════════════════════════════
   [현 차수] ★런타임 단일소스 자동산출 — 주문(거래원장)=총매출 유일 소스.
   체험자가 주문을 추가/수정하면 정산(채널×월)·예산 기여매출이 즉시 재파생되어
   전 메뉴(대시보드/글로벌/커머스/롤업/정산/성과/P&L)가 동일 매출로 일체화 유지.
════════════════════════════════════════════════ */
// [225차 P2-3] 취소/반품 캐논을 공용 SSOT(orderStatusCanon)로 통합 — dashPeriod 와의 독립 복사본
//   드리프트(특히 refunded 분류 충돌) 제거. 내부 _isCancelled/_isReturn 은 공용 함수 별칭(동작 동일,
//   취소셋은 기존과 일치·반품셋은 백엔드 캐논으로 정합=refunded/환불완료 반품 인식). OmniChannel 등
//   페이지가 import 하던 isCancelledStatus 는 공용 함수를 재노출해 보존.
const _isCancelled = _isCancelledCanon;
const _isReturn = _isReturnCanon;
export const isCancelledStatus = _isCancelledCanon;

function _monthOf(o) {
  return o.month || (o.atISO ? String(o.atISO).slice(0, 7) : (o.at ? (() => { try { return new Date(o.at).toISOString().slice(0, 7); } catch { return ''; } })() : ''));
}
/** 주문 → 정산 재집계(채널×월). 기존 행의 status(정산완료 등)는 보존. */
function deriveSettlementFromOrders(orders, prev) {
  const active = (orders || []).filter(o => o && !_isCancelled(o.status, o.event_type));
  if (!active.length) return [];
  const months = [...new Set(active.map(_monthOf).filter(Boolean))].sort();
  const recent = months[months.length - 1];
  const prevStatus = {}; (prev || []).forEach(s => { if (s && s.id) prevStatus[s.id] = s.status; });
  // [현 차수] 신규 채널 동기화: 하드코딩 DEMO_CHANNELS 가 아니라 "실주문에 등장한 모든 채널"을 순회한다.
  //   → 신규 추가 판매채널(오픈마켓 등) 주문도 정산에 누락 없이 반영. 채널 메타/수수료율은 아래 우선순위로 해석.
  const chMeta = {}; DEMO_CHANNELS.forEach(c => { chMeta[c.id] = c; });
  const orderChannels = [...new Set(active.map(o => o.ch).filter(Boolean))];
  const rows = [];
  orderChannels.forEach(chId => {
    const meta = chMeta[chId] || { id: chId, name: chId };
    months.forEach(period => {
      const co = active.filter(o => o.ch === chId && _monthOf(o) === period);
      if (!co.length) return;
      const gross = co.reduce((s, o) => s + (Number(o.total) || 0), 0);
      // 수수료율: ①주문에 기록된 platformFeeRate 평균(채널 실제율) ②채널 기본(올리브영0.30/쿠팡0.108/기타0.055).
      const rateSamples = co.map(o => Number(o.platformFeeRate)).filter(r => r > 0);
      const feeRate = rateSamples.length
        ? (rateSamples.reduce((s, r) => s + r, 0) / rateSamples.length)
        : (chId === 'oliveyoung' ? 0.30 : chId === 'coupang' ? 0.108 : 0.055);
      const pfee = Math.round(gross * feeRate);
      // 반품: 실제 반품 상태 주문 건수(가짜 0.02 추정 제거). returnFee=반품 주문 매출의 2% 처리비.
      const returnedOrders = co.filter(o => _isReturn(o.status, o.event_type));
      const returnCnt = returnedOrders.length;
      const returnGross = returnedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const adFee = Math.round(gross * 0.02), returnFee = Math.round(returnGross * 0.02);
      const id = `STL-${chId}-${period}`;
      rows.push({
        id, channel: chId, channelName: meta.name || chId, period, grossSales: gross,
        platformFee: pfee, adFee, returnFee, couponDiscount: Math.round(gross * 0.01),
        netPayout: gross - pfee - adFee - returnFee, orders: co.length, returns: returnCnt,
        status: prevStatus[id] || (period === recent ? 'confirmed' : 'settled'),
      });
    });
  });
  return rows;
}
/** 주문 총매출 → 광고채널 기여매출 비례 재파생(spent/budget 보존, roas 재계산). */
function deriveBudgetRevenue(channelBudgets, orders) {
  const keys = Object.keys(channelBudgets || {});
  if (!keys.length) return channelBudgets;
  const active = (orders || []).filter(o => o && !_isCancelled(o.status, o.event_type));
  const totalRev = active.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const rawSum = keys.reduce((s, k) => s + (channelBudgets[k].revenue || 0), 0) || 1;
  const next = {};
  keys.forEach(k => {
    const b = channelBudgets[k];
    const rev = Math.round(totalRev * (b.revenue || 0) / rawSum);
    next[k] = { ...b, revenue: rev, roas: b.spent > 0 ? +(rev / b.spent).toFixed(2) : 0 };
  });
  return next;
}

/* ════════════════════════════════════════════════
   🔄 BroadcastChannel — Cross-Tab Real-time Sync v1.0
   When any tab updates shared state (inventory, orders, budgets, etc.),
   all other tabs receive the update instantly without page refresh.
════════════════════════════════════════════════ */
const BROADCAST_CHANNEL_NAME = 'geniego-roi-global-sync';
let _broadcastChannel = null;
try {
    if (typeof BroadcastChannel !== 'undefined') {
        _broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    }
} catch { /* BroadcastChannel not supported — fallback to localStorage events */ }

/* [현 차수] ★실시간 동시 동기화 전용 채널(genie_sync_v1) — 페이로드 없는 "갱신 신호"만 전파.
   기존 geniego-roi-global-sync(상태 페이로드 전파)와 별개 채널: 신호=서버 재fetch 트리거용.
   모듈 싱글톤(중복 생성 금지). 미지원 환경은 null → triggerSync 의 ① 로컬 tick 만 동작(무해). */
const REALTIME_SYNC_CHANNEL_NAME = 'genie_sync_v1';
let _realtimeSyncChannel = null;
try {
    if (typeof BroadcastChannel !== 'undefined') {
        _realtimeSyncChannel = new BroadcastChannel(REALTIME_SYNC_CHANNEL_NAME);
    }
} catch { /* BroadcastChannel not supported — local tick only */ }

function broadcastUpdate(type, payload) {
    try {
        // 180차 회원 격리: 메시지에 발신 tenant 태그 → 다른 회원 탭은 수신 무시(크로스탭 누출 차단)
        const tenant = currentTenant();
        if (_broadcastChannel) {
            _broadcastChannel.postMessage({ type, payload, tenant, ts: Date.now() });
        } else {
            // Fallback: use localStorage events for cross-tab sync
            localStorage.setItem('__geniego_sync__', JSON.stringify({ type, payload, tenant, ts: Date.now() }));
            localStorage.removeItem('__geniego_sync__');
        }
    } catch { /* ignore broadcast errors */ }
}

/* ════════════════════════════════════════════════
   초기 공유 데이터 (데모 모드: 시드 데이터 / 운영 모드: 빈 배열)
════════════════════════════════════════════════ */

// 📦 재고 (WmsManager ↔ OmniChannel ↔ PnL ↔ Dashboard)
const INIT_INVENTORY = loadDemoState('inventory', DEMO_INVENTORY);

/* [현 차수] 데이터품질(운영 COGS): 백엔드 channel_inventory 행(채널×SKU×창고)을 SKU 단위 inventory
   아이템으로 그룹핑한다. ★기존 로더는 `{ok,inventory:[...]}` 객체를 Array.isArray로만 검사해 항상
   미적용(운영 재고 미로드 → COGS 0)이었다. 원가(cost)·판매가(price)를 포함해 P&L COGS 계산이 동작한다. */
function buildInventoryFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  const bySku = {};
  for (const r of rows) {
    const sku = r && r.sku; if (!sku) continue;
    if (!bySku[sku]) bySku[sku] = { sku, name: r.product_name || sku, cost: 0, price: 0, safeQty: 30, status: 'active', stock: {}, channels: [] };
    const it = bySku[sku];
    const c = Number(r.cost) || 0, p = Number(r.price) || 0;
    if (c > 0) it.cost = c;
    if (p > 0) it.price = p;
    if (r.product_name) it.name = r.product_name;
    const wh = r.warehouse || 'default';
    it.stock[wh] = (it.stock[wh] || 0) + (Number(r.available) || 0);
    if (r.channel && r.channel !== 'catalog' && !it.channels.includes(r.channel)) it.channels.push(r.channel);
  }
  return Object.values(bySku);
}

// 📋 Orders (OmniChannel → 재고차감 → 정산 → P&L)
const INIT_ORDERS = loadDemoState('orders', DEMO_ORDERS);

// 💰 Channel 광고Budget (BudgetPlanner ↔ CampaignManager ↔ P&L)
const INIT_CHANNEL_BUDGETS = loadDemoState('budgets', DEMO_BUDGETS);

// 📊 Channel별 정산 데이터 (Reconciliation/KrChannel → P&L 반영)
const INIT_SETTLEMENT = loadDemoState('settlement', DEMO_SETTLEMENT);

// 📥 입출고 이력
const INIT_INOUT = loadDemoState('inout', DEMO_INOUT);

// 🔮 디지털 셀프 SoS 공유 데이터 (DigitalShelf → PriceOpt Integration)
const INIT_DIGITAL_SHELF = {};

// 📋 공급 발주(PO) 목록 (DemandForecast → WMS 자동발주)
const INIT_SUPPLY_ORDERS = [];

// 📊 캠페인-Orders 연결 맵 (CampaignManager → OrderHub ROAS)
const INIT_CAMPAIGN_ORDER_MAP = {}; // { campaignId: [orderId, ...] }

// 🚨 Notification
const INIT_ALERTS = loadDemoState('alerts', DEMO_ALERTS);

// 하단 CRM 세그먼트 초기 데이터
const INIT_CRM_SEGMENTS = loadDemoState('crm_segments', DEMO_CRM_SEGMENTS);

// 이메일 캐름페인 Integration 상태
const INIT_EMAIL_CAMPAIGNS_LINKED = loadDemoState('email_campaigns', DEMO_EMAIL_CAMPAIGNS);

// 이메일 템플릿 / 설정 (v12 NEW: localStorage → GlobalData 동기화)
const INIT_EMAIL_TEMPLATES = [];
const INIT_EMAIL_SETTINGS = { provider: 'mock' };

// Kakao 캠페인 Integration 상태 (179차: EXTRA 병합으로 6건 enrich — 신규 체험자 기준)
const INIT_KAKAO_CAMPAIGNS_LINKED = loadDemoState('kakao_campaigns', [...DEMO_KAKAO_CAMPAIGNS, ...DEMO_KAKAO_CAMPAIGNS_EXTRA]);

// 💳 결제 카드 (Ad Spend 자동집행용)
const INIT_PAYMENT_CARDS = [];

// 🤝 [v13 → v17] 인플루언서 크리에이터 데이터 (InfluencerUGC ↔ All 메뉴 동기화)
const INIT_CREATORS = loadDemoState('creators', DEMO_CREATORS);
const INIT_UGC_REVIEWS = loadDemoState('ugc_reviews', DEMO_UGC_REVIEWS);
const INIT_CHANNEL_STATS = loadDemoState('channel_stats', DEMO_CHANNEL_STATS);
const INIT_NEG_KEYWORDS = loadDemoState('neg_keywords', DEMO_NEG_KEYWORDS);

/* ════════════════════════════════════════════════
   실제 Provider Provider 시작
════════════════════════════════════════════════ */

// 🔥 DR.JART VIRTUAL MOCK DATA OVERRIDE
const drJartDailyTrends = _isDemo ? DEMO_DAILY_TRENDS : [];
const drJartChannels = _isDemo ? DEMO_CHANNELS : [];
const drJartBudget = {};
const INIT__AD_CAMPAIGNS = loadDemoState('ad_campaigns', DEMO_CAMPAIGNS);
const INIT_SNS_CAMPAIGNS = loadDemoState('sns_campaigns', DEMO_SNS_CAMPAIGNS);
const INIT_AI_RECOMMENDATIONS = loadDemoState('ai_recommendations', DEMO_AI_RECOMMENDATIONS);
const INIT_CHANNEL_PRICES = loadDemoState('channel_prices', DEMO_CHANNEL_PRICES);

export function GlobalDataProvider({ children }) {
    const [AdCamps, setAdCamps] = useState(INIT__AD_CAMPAIGNS);

    /* ── 핵심 공유 상태 ─────────────────────────── */
    const [inventory, setInventory] = useState(INIT_INVENTORY);
    const [orders, setOrders] = useState(_isDemo ? INIT_ORDERS : []);
    const [inOutHistory, setInOutHistory] = useState(INIT_INOUT);
    const [channelBudgets, setChannelBudgets] = useState(INIT_CHANNEL_BUDGETS);
    const [settlement, setSettlement] = useState(_isDemo ? INIT_SETTLEMENT : []);
    const [sharedCampaigns, setSharedCampaigns] = useState(loadDemoState('shared_campaigns', DEMO_CAMPAIGNS));
    const [alerts, setAlerts] = useState(INIT_ALERTS);
    const [dateRange, setDateRange] = useState({ from: null, to: null, label: 'This Month' });

    // 판매데이터 v4: CRM 새그먼트 / 이메일 캐다 / Kakao 캐다 (Global Integration)
    const [crmSegments, setCrmSegments] = useState(INIT_CRM_SEGMENTS);
    const [crmCustomerHistory, setCrmCustomerHistory] = useState(loadDemoState('crm_customer_history', DEMO_CRM_CUSTOMER_HISTORY)); // { name: [{orderId, items, at, total, ch}] }
    const [emailCampaignsLinked, setEmailCampaignsLinked] = useState(INIT_EMAIL_CAMPAIGNS_LINKED);
    const [kakaoCampaignsLinked, setKakaoCampaignsLinked] = useState(INIT_KAKAO_CAMPAIGNS_LINKED);
    const [emailTemplates, setEmailTemplates] = useState(INIT_EMAIL_TEMPLATES);           // [v12] 이메일 템플릿
    const [emailSettings, setEmailSettings] = useState(INIT_EMAIL_SETTINGS);               // [v12] 이메일 설정
    const [journeyTriggers, setJourneyTriggers] = useState([]); // Journey Builder 트리거 로그

    // [v5 NEW] AI 예측 Integration 상태 (AIPrediction ↔ CRM ↔ Email ↔ Kakao ↔ WebPopup)
    const [aiPredictions, setAiPredictions] = useState([]); // 고객별 AI 예측 결과
    const [aiModelMetrics, setAiModelMetrics] = useState(null); // ML 모델 성능
    const [webPopupCampaigns, setWebPopupCampaigns] = useState(loadDemoState('popups', DEMO_POPUPS)); // 웹팝업 캠페인 (WebPopup ↔ CRM Integration)

    // 💳 [v7] 광고 결제 카드
    const [paymentCards, setPaymentCards] = useState(INIT_PAYMENT_CARDS);

    // 🤖 [v8 NEW] AI 마케팅 자동화 통합 레이어
    const [activeRules, setActiveRules] = useState([]); // AIRuleEngine 승인 룰 목록
    const [rulesFired, setRulesFired] = useState([]);   // 룰 발동 이력 (Marketing 등에 표시)
    const [aiRecommendationLog, setAiRecommendationLog] = useState([]); // AIMarketingHub Run 로그
    const [journeyExecutions, setJourneyExecutions] = useState([]);     // JourneyBuilder Run 결과→Attribution 반영
    const [attributionData, setAttributionData] = useState([]);          // Attribution Channel별 기여 데이터
    const [abTestResults, setAbTestResults] = useState([]);             // A/B Test 결과 (CampaignManager 탭)

    // 🔗 [v9 NEW] 크로스 기능 동기화 상태
    const [pickingLists, setPickingLists] = useState([]);             // WMS 피킹리스트
    const [packingSlips, setPackingSlips] = useState([]);             // WMS 패킹슬립
    const [claimHistory, setClaimHistory] = useState(_isDemo ? loadDemoState('claimHistory', []) : []);  // 클레임/반품 이력
    // [현 차수] 운영 주문 통계 서버측 집계(limit 캡 과소집계 해소). 데모는 런타임 파생이라 null 유지.
    const [orderStatsServer, setOrderStatsServer] = useState(null);
    // [240차] 인플루언서 비용 P&L 편입 — 운영 실 정산(influencer_store settle.paid) 서버집계. 데모는 클라 creators 합산(_isDemo 가드). 목데이터 운영유입 0.
    const [influencerCostServer, setInfluencerCostServer] = useState(null);
    // [225차 P0-1] 운영 정산 통계 서버측 집계(settlements?limit=200 재집계 과소 해소). 데모는 null 유지.
    const [settlementStatsServer, setSettlementStatsServer] = useState(null);
    // [현 차수] ★P&L 서버 SSOT — 최종 손익 조립(gross/operating/net)을 서버(/v424/pnl)에서 단일소스로 산출.
    //   기존 클라 pnlStats 는 graceful fallback(server-first, client-fallback). 소스가 동일해 값 회귀 없음.
    //   데모는 런타임 단일소스 파생이라 null 유지(클라 계산 사용).
    const [pnlServer, setPnlServer] = useState(null);
    // [225차 P1-16] 운영 클레임(반품) 통계 서버집계(claims?limit=200 재집계 과소 해소). 데모는 null 유지.
    const [claimStatsServer, setClaimStatsServer] = useState(null);
    /* ════════════════════════════════════════════════
       [현 차수] ★실시간 동시 동기화 엔진 — syncTick
       어떤 값이 변경/등록되면(주문/정산/인플루언서/자격증명 등) triggerSync() 한 번으로
       ① 운영 서버 통계 fetch useEffect 들을 즉시 재실행(syncTick 의존) → 새로고침 없이 갱신
       ② BroadcastChannel('genie_sync_v1') 로 다른 탭에 전파 → 전 탭 동시 갱신(주식 시세처럼).
       ★무한루프 방지: triggerSync 자신은 syncTick 을 의존하지 않음(함수 정체성 고정).
       크로스탭 수신은 onmessage 에서 setSyncTick(n=>n+1) 만 호출(재broadcast 금지)로 echo 차단.
    ════════════════════════════════════════════════ */
    const [syncTick, setSyncTick] = useState(0);
    const triggerSync = useCallback(() => {
        // ① 로컬 재집계/재fetch 트리거(운영 서버 통계 useEffect 들이 syncTick 을 의존).
        setSyncTick(n => n + 1);
        // ② 크로스탭 전파(다른 탭이 즉시 갱신). 회원(테넌트) 격리 태그 동봉 → 타 회원 탭은 무시.
        try {
            if (_realtimeSyncChannel) {
                _realtimeSyncChannel.postMessage({ tenant: currentTenant(), ts: Date.now() });
            }
        } catch { /* ignore broadcast errors */ }
    }, []);
    const [digitalShelfData, setDigitalShelfData] = useState({});     // DigitalShelf SoS 데이터
    const [orderMemos, setOrderMemos] = useState({});                 // Orders별 메모
    const [slaViolations, setSlaViolations] = useState([]);           // SLA 위반 이력
    const [supplyOrders, setSupplyOrders] = useState([]);             // 자동 발주 목록
    const [lotManagement, setLotManagement] = useState([]);           // Lot/유통기한 관리
    const [priceCalendar, setPriceCalendar] = useState([]);           // 프로모션 가격 캘린더
    const [asiaLogisticsData, setAsiaLogisticsData] = useState({});   // 아시아 물류 허브 데이터
    const [sharedCalendarEvents, setSharedCalendarEvents] = useState(() => loadDemoState('calendar_events', DEMO_CALENDAR_EVENTS)); // 콘텐츠 캘린더 이벤트 (데모 시드)
    const [connectedChannels, setConnectedChannels] = useState(loadDemoState('connected_channels', DEMO_CONNECTED_CHANNELS));  // 연동 채널 목록

    // 🤝 [v13 NEW] 인플루언서 크리에이터 통합 상태
    const [creators, setCreators] = useState(INIT_CREATORS);
    const [ugcReviews, setUgcReviews] = useState(INIT_UGC_REVIEWS);
    const [channelStats, setChannelStats] = useState(INIT_CHANNEL_STATS);
    const [negKeywords, setNegKeywords] = useState(INIT_NEG_KEYWORDS);
    // [228차 R5] 제품 리뷰(ReviewsUGC)는 인플루언서(InfluencerUGC)의 ugcReviews/channelStats/negKeywords 와
    //   분리된 전용 상태를 사용한다 — 두 페이지가 같은 키를 공유하면 마지막 로드가 서로의 데이터를 덮어써
    //   교차 오염되던 문제 해소(R1~R4 백엔드 분리에 이어 프론트 상태도 분리). 시드는 동일(데모 일관성).
    const [reviewItems, setReviewItems] = useState(INIT_UGC_REVIEWS);
    const [reviewChannelStats, setReviewChannelStats] = useState(INIT_CHANNEL_STATS);
    const [reviewNegKeywords, setReviewNegKeywords] = useState(INIT_NEG_KEYWORDS);

    // 📱 [v16 NEW] SNS 마케팅 캠페인 통합 상태
    const [snsCampaigns, setSnsCampaigns] = useState(INIT_SNS_CAMPAIGNS);

    // 🤖 [v16 NEW] AI 추천 액션 카드
    const [aiRecommendations, setAiRecommendations] = useState(INIT_AI_RECOMMENDATIONS);

    // 💲 [v16 NEW] 채널별 상품 가격 매핑 (시드 기반)
    const [channelProductPrices, setChannelProductPrices] = useState(INIT_CHANNEL_PRICES);

    // 📡 [v11 NEW] Channel별 상품 판매가 맵 (CatalogSync ↔ OrderHub ↔ PriceOpt 동기화)
    // 구조: { [sku]: { [channelId]: recommendedPrice } }
    const [catalogChannelPrices, setCatalogChannelPrices] = useState(() => {
        try {
            // 180차: 테넌트 스코프 — 회원별 채널 판매가 분리(같은 플랜 타 회원 값 유입 차단)
            const saved = tGet('geniego_catalog_channel_prices');
            if (saved) return JSON.parse(saved);
        } catch { /* ignore */ }
        return {};
    });

    // 💰 [v10 NEW] 구독 Plan 요금 (Admin에서 Save → All PlanGate 동기화)
    const [planPricing, setPlanPricing] = useState(() => {
        try {
            const saved = localStorage.getItem('geniego_plan_pricing');
            if (saved) return JSON.parse(saved);
        } catch { /* ignore */ }
        return {
            growth:     { monthly: '₩49,000',  quarterly: '₩39,000/월',  yearly: '₩29,000/월',  name: '📈 Growth' },
            pro:        { monthly: '₩99,000',  quarterly: '₩79,000/월',  yearly: '₩59,000/월',  name: '🚀 Pro' },
            enterprise: { monthly: '₩299,000', quarterly: '₩249,000/월', yearly: '₩199,000/월', name: '🌐 Enterprise' },
        };
    });

    // [현 차수] Admin 가격 변경 → 인앱 PlanGate 실시간 반영. 기존엔 planPricing 이 localStorage 만 읽고
    //   updatePlanPricing sender 가 0건이라 영구 stale 이었다. 공개 가격 API(plan_period_pricing SSOT)로
    //   하이드레이션해 관리자가 /admin/plan-pricing 에서 바꾼 가격이 업그레이드 게이트에 반영되게 한다.
    useEffect(() => {
        let alive = true;
        getJsonAuth('/api/auth/pricing/public-plans')
            .then(d => {
                if (!alive || !d?.ok || !Array.isArray(d.plans)) return;
                const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
                const next = {};
                d.plans.forEach(p => {
                    const periods = Array.isArray(p.periods) ? p.periods : [];
                    const at = (m) => periods.find(x => Number(x.period_months) === m)?.price_usd;
                    const mo = at(1) ?? p.price_usd;
                    const qt = at(3);
                    const yr = at(12) ?? p.price_annual_usd;
                    if (mo == null && qt == null && yr == null) return;
                    next[p.id] = {
                        name: p.name,
                        ...(mo != null ? { monthly: fmt(mo) } : {}),
                        ...(qt != null ? { quarterly: fmt(qt) + '/월' } : {}),
                        ...(yr != null ? { yearly: fmt(yr) + '/월' } : {}),
                    };
                });
                if (Object.keys(next).length) setPlanPricing(prev => ({ ...prev, ...next }));
            })
            .catch(() => { /* 공개 API 실패 시 기본값 유지 */ });
        return () => { alive = false; };
    }, []);

    /* ════════════════════════════════════════════════
       🎪 [v15] Demo Sandbox — Auto-Save to localStorage
       사용자가 데이터를 변경할 때마다 자동 영속 저장.
       새로고침/재접속 시에도 사용자 수정사항 유지.
       ★ 초기 마운트 시에는 저장하지 않음 (무한루프 방지)
    ════════════════════════════════════════════════ */
    const _demoMounted = useRef(false);
    useEffect(() => { const t = setTimeout(() => { _demoMounted.current = true; }, 2000); return () => clearTimeout(t); }, []);
    const _saveDemoIfMounted = useCallback((key, data) => { if (_demoMounted.current) saveDemoState(key, data); }, []);
    useEffect(() => { _saveDemoIfMounted('inventory', inventory); }, [inventory, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('orders', orders); }, [orders, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('inout', inOutHistory); }, [inOutHistory, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('budgets', channelBudgets); }, [channelBudgets, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('settlement', settlement); }, [settlement, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('shared_campaigns', sharedCampaigns); }, [sharedCampaigns, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('crm_segments', crmSegments); }, [crmSegments, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('email_campaigns', emailCampaignsLinked); }, [emailCampaignsLinked, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('kakao_campaigns', kakaoCampaignsLinked); }, [kakaoCampaignsLinked, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('popups', webPopupCampaigns); }, [webPopupCampaigns, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('connected_channels', connectedChannels); }, [connectedChannels, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('ad_campaigns', AdCamps); }, [AdCamps, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('sns_campaigns', snsCampaigns); }, [snsCampaigns, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('ai_recommendations', aiRecommendations); }, [aiRecommendations, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('channel_prices', channelProductPrices); }, [channelProductPrices, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('crm_customer_history', crmCustomerHistory); }, [crmCustomerHistory, _saveDemoIfMounted]);
    useEffect(() => { _saveDemoIfMounted('alerts', alerts); }, [alerts, _saveDemoIfMounted]);
    // [261차 미영속 수정] calendar_events 는 init-load(loadDemoState:344)만 있고 save effect 가 없어
    //   ContentCalendar 에서 등록한 콘텐츠가 새로고침 시 소실됐다(형제 상태는 전부 영속). 동일 패턴으로 보강.
    useEffect(() => { _saveDemoIfMounted('calendar_events', sharedCalendarEvents); }, [sharedCalendarEvents, _saveDemoIfMounted]);

    // ── [A-3 NEW] 백엔드 재고 Integration: 앱 초기 로드 시 실서버에서 재고 pull ──
    // 토큰 있는 유료 User 전용; 데모는 시드 데이터 사용 (API 스킵)
    useEffect(() => {
        if (_isDemo) return; // ★ 데모 모드: 시드 데이터 유지, API 스킵
        const token = authToken();
        if (!token) return;
        const BASE = import.meta.env.VITE_API_BASE || '';
        fetch(`${BASE}/api/channel-sync/inventory`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(data => {
                // [현 차수] 백엔드는 {ok,inventory:[...]} 객체 반환 → rows 추출 후 SKU 그룹핑(원가 포함).
                const rows = Array.isArray(data) ? data : (data && Array.isArray(data.inventory) ? data.inventory : []);
                const built = buildInventoryFromRows(rows);
                if (built.length > 0) setInventory(built);
            })
            .catch(() => { /* Error 시 INIT_INVENTORY 유지 */ });
    }, [syncTick]); // [현 차수] 마운트 1회 + triggerSync 시 재고 즉시 재pull(자격증명/동기화 등록 반영)

    // ── [165차 PM Phase 2-B] OrderHub Aggregator API → orders / claimHistory / settlement
    //    spec: docs/spec/backend_orderhub_aggregator_165_v3.md §8 (v1 §7 동일 패턴)
    //    데모 모드: 시드 데이터 유지 (API 스킵). 운영 모드: /api/v424/orderhub/* 호출.
    useEffect(() => {
        if (_isDemo) return;
        if (!authToken()) return; // [276차] 로그인 화면 미인증 401 차단
        let cancelled = false;
        getJsonAuth('/api/v424/orderhub/orders?limit=200')
            .then(res => { if (!cancelled && res?.ok && Array.isArray(res.items)) setOrders(res.items); })
            .catch(() => { /* network/auth 실패 시 빈 배열 유지 */ });
        // [현 차수] 주문 통계 서버집계(전체 행, limit 무관) → orderStats 과소집계 해소.
        getJsonAuth('/api/v424/orderhub/orders/stats')
            .then(res => { if (!cancelled && res?.ok) setOrderStatsServer(res); })
            .catch(() => { /* 실패 시 클라 집계 폴백 */ });
        // [240차] 인플루언서 비용 P&L — 운영 실 정산 합계(미등록 시 0). 데모는 fetch 스킵(클라 creators 합산).
        // [현 차수] ★creators 변경 등에 미반응이던 stale 갭 해소 — syncTick 의존으로 triggerSync 시 즉시 재fetch.
        getJsonAuth('/api/v423/influencer/cost-summary')
            .then(res => { if (!cancelled && res?.ok) setInfluencerCostServer(res); })
            .catch(() => { /* 실패 시 0(영향 없음) */ });
        return () => { cancelled = true; };
    }, [syncTick]); // [현 차수] 마운트 1회 + triggerSync 즉시 재fetch(폴링은 별도 useEffect 보존)

    useEffect(() => {
        if (_isDemo) return;
        if (!authToken()) return; // [276차] 로그인 화면 미인증 401 차단
        let cancelled = false;
        getJsonAuth('/api/v424/orderhub/claims?limit=200')
            .then(res => { if (!cancelled && res?.ok && Array.isArray(res.items)) setClaimHistory(res.items); })
            .catch(() => { /* 빈 배열 유지 */ });
        // [225차 P1-16] 클레임 통계 서버집계(전체 행) → ReturnsPortal 반품 KPI 캡 과소 해소.
        getJsonAuth('/api/v424/orderhub/claims/stats')
            .then(res => { if (!cancelled && res?.ok) setClaimStatsServer(res); })
            .catch(() => { /* 클라 배열 폴백 */ });
        return () => { cancelled = true; };
    }, [syncTick]); // [현 차수] triggerSync 즉시 재fetch

    useEffect(() => {
        if (_isDemo) return;
        if (!authToken()) return; // [276차] 로그인 화면 미인증 401 차단
        let cancelled = false;
        getJsonAuth('/api/v424/orderhub/settlements?limit=200')
            .then(res => { if (!cancelled && res?.ok && Array.isArray(res.items)) setSettlement(res.items); })
            .catch(() => { /* 빈 배열 유지 */ });
        // [225차 P0-1] 정산 통계 서버집계(전체 행, limit 무관) → settlementStats 머니경로 과소 해소.
        getJsonAuth('/api/v424/orderhub/settlements/stats')
            .then(res => { if (!cancelled && res?.ok) setSettlementStatsServer(res); })
            .catch(() => { /* 실패 시 클라(200캡) 집계 폴백 */ });
        return () => { cancelled = true; };
    }, [syncTick]); // [현 차수] triggerSync 즉시 재fetch

    // ── [208차 동기화 P1] 운영 홈/성과 대시보드 실시간성: orders/settlement/inventory 30초 주기 폴링.
    //    기존엔 마운트 시 1회만 fetch → 신규 주문/정산 롤업이 새로고침 전까지 미반영이던 갭 해소.
    useEffect(() => {
        if (_isDemo) return;
        const token = authToken();
        if (!token) return;
        let cancelled = false;
        const BASE = import.meta.env.VITE_API_BASE || '';
        const poll = () => {
            // [현 차수] 운영 주문 하이드레이션 한도 200→1000(API clampLimit 최대) 상향: 200건 초과 테넌트의
            //   커머스/orderStats 과소집계 완화(대시보드 매출=정산기준이라 영향 없으나 주문기반 표시 정합 개선).
            getJsonAuth('/api/v424/orderhub/orders?limit=1000').then(r => { if (!cancelled && r?.ok && Array.isArray(r.items)) setOrders(r.items); }).catch(() => {});
            // [현 차수] 주문 통계 서버집계 갱신(1000건 초과 테넌트 정확 집계).
            getJsonAuth('/api/v424/orderhub/orders/stats').then(r => { if (!cancelled && r?.ok) setOrderStatsServer(r); }).catch(() => {});
            getJsonAuth('/api/v424/orderhub/settlements?limit=200').then(r => { if (!cancelled && r?.ok && Array.isArray(r.items)) setSettlement(r.items); }).catch(() => {});
            // [225차 P0-1] 정산 통계 서버집계 갱신(200건 초과 테넌트 정확 집계).
            getJsonAuth('/api/v424/orderhub/settlements/stats').then(r => { if (!cancelled && r?.ok) setSettlementStatsServer(r); }).catch(() => {});
            // [현 차수] ★P&L 서버 SSOT 하이드레이션 — 최종 손익 조립을 서버에서 받아 pnlStats 가 server-first 로 사용.
            //   실패/구버전 백엔드면 null 유지 → 클라 계산 폴백(무회귀).
            getJsonAuth('/api/v424/pnl').then(r => { if (!cancelled && r?.ok) setPnlServer(r); }).catch(() => {});
            fetch(`${BASE}/api/channel-sync/inventory`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null).then(d => {
                    if (cancelled || !d) return;
                    const rows = Array.isArray(d) ? d : (Array.isArray(d.inventory) ? d.inventory : []);
                    const built = buildInventoryFromRows(rows);
                    if (built.length > 0) setInventory(built);
                }).catch(() => {});
            // [현 차수] P0 운영 광고비/ROAS 하이드레이션: 그동안 운영에서 channelBudgets 가 끝까지 빈 객체라
            //   홈/마케팅/P&L 의 광고비·ROAS·예산이 0 으로 표시되던 결함. performance_metrics 집계(rollup platform
            //   = 광고채널별 spend/revenue/roas)를 channelBudgets 로 매핑해 budgetStats/pnlStats 에 반영.
            //   실데이터 0행이면 setChannelBudgets 미호출 → 빈 상태 유지(가짜값 주입 없음).
            getJsonAuth('/api/v423/rollup/platform?period=monthly&n=1').then(r => {
                if (cancelled || !r?.ok || !Array.isArray(r.rows) || !r.rows.length) return;
                const bud = {};
                r.rows.forEach(p => {
                    const key = String(p.platform || '').toLowerCase().trim();
                    if (!key) return;
                    const spent = Number(p.total_spend) || 0;
                    bud[key] = {
                        // [현 차수] 광고예산 뷰의 revenue=광고기여매출(total_ad_rev, ROAS 분자와 일관). 주문매출
                        //   (total_revenue)은 판매채널 매출이라 광고 ROAS 분자로 부적합(채널키 미스매치 ROAS=0 유발).
                        name: p.platform, spent, revenue: Number(p.total_ad_rev != null ? p.total_ad_rev : p.total_revenue) || 0,
                        roas: Number(p.avg_roas) || 0, budget: spent,
                        impressions: Number(p.total_impressions) || 0, clicks: Number(p.total_clicks) || 0,
                        // [227차 P0] 운영 conversions/CVR 배선(기존 미매핑→DashMarketing 운영 CVR stub-zero).
                        conversions: Number(p.total_conversions) || 0, convRate: Number(p.avg_cvr) || 0,
                        color: p.color || '#4f8ef7',
                    };
                });
                if (Object.keys(bud).length) setChannelBudgets(bud);
            }).catch(() => {});
            // [현 차수] 채널×objective 퍼널 집계 병합 → 채널 상세 패널이 목적별(도달인지/트래픽/전환) 분류.
            //   objective 미적재(라이브 동기화 전)면 빈 결과 → 패널 채널누적 폴백(정직). 운영 전용.
            getJsonAuth('/api/v424/connectors/campaign-funnel').then(r => {
                if (cancelled || !r?.ok || !r.channels || !Object.keys(r.channels).length) return;
                setChannelBudgets(prev => {
                    const next = { ...prev };
                    for (const [ch, camps] of Object.entries(r.channels)) {
                        const k = String(ch).toLowerCase();
                        if (next[k]) next[k] = { ...next[k], campaigns: camps };
                    }
                    return next;
                });
            }).catch(() => {});
        };
        poll(); // [정밀감사] 콜드마운트 즉시 1회 하이드레이션 — 기존엔 +30초 첫 폴링까지 광고비/ROAS가 0 표시.
        const iv = setInterval(poll, 30000); // 30초 주기(운영 전용)
        // [정밀감사 F] 자격증명 등록·동기화 직후 즉시 반영 — 30초 폴링 대기 없이 강제 refetch.
        //   ApiKeys/ConnectModal 저장 성공 시 window.dispatchEvent(new Event('genie:data-refresh')) 발행.
        const onRefresh = () => poll();
        window.addEventListener('genie:data-refresh', onRefresh);
        return () => { cancelled = true; clearInterval(iv); window.removeEventListener('genie:data-refresh', onRefresh); };
    }, []);

    // ── [DEMO v15] 데모 모드: 시드 데이터가 풍부하므로 Rollup API는 완전 삭제 처리 (운영 환경 오염 방지) ──

    /* ── [현 차수] P1-① 탭간 실시간 동기화: 송신부 없던 11개 도메인 broadcast 추가 ──
       echo 방지: 수신값(_bcRecv) 참조 동일 시 skip. 초기 마운트 broadcast 방지: _bcReady 가드.
       (ORDERS/INVENTORY/SETTLEMENT/ALERTS/BUDGETS 는 기존 명시 송신부 보유 → 제외, 중복 방지) */
    const _bcRecv = useRef({});
    const _bcReady = useRef(false);
    useEffect(() => { const id = setTimeout(() => { _bcReady.current = true; }, 0); return () => clearTimeout(id); }, []);
    const _bc = useCallback((type, val) => {
        if (_bcReady.current && _bcRecv.current[type] !== val) broadcastUpdate(type, val);
    }, []);
    // [현 차수 P2] ★INVENTORY 송신부 실제 부재 교정 — registerInOut/adjustStock 이 raw setInventory 만 호출해
    //   WMS 입출고/조정이 다른 탭(대시보드·주문)에 실시간 전파 안 됐다(수신부 case 'INVENTORY_UPDATE' 만 존재).
    //   echo 가드(_bcRecv)로 수신값 재전파 방지 — 중복/무한루프 없음.
    useEffect(() => { _bc('INVENTORY_UPDATE', inventory); }, [inventory, _bc]);
    useEffect(() => { _bc('CREATORS_UPDATE', creators); }, [creators, _bc]);
    useEffect(() => { _bc('CRM_UPDATE', crmSegments); }, [crmSegments, _bc]);
    useEffect(() => { _bc('CAMPAIGNS_UPDATE', sharedCampaigns); }, [sharedCampaigns, _bc]);
    useEffect(() => { _bc('PLAN_UPDATE', planPricing); }, [planPricing, _bc]);
    useEffect(() => { _bc('POPUPS_UPDATE', webPopupCampaigns); }, [webPopupCampaigns, _bc]);
    useEffect(() => { _bc('SNS_CAMPAIGNS_UPDATE', snsCampaigns); }, [snsCampaigns, _bc]);
    useEffect(() => { _bc('EMAIL_CAMPAIGNS_UPDATE', emailCampaignsLinked); }, [emailCampaignsLinked, _bc]);
    useEffect(() => { _bc('KAKAO_CAMPAIGNS_UPDATE', kakaoCampaignsLinked); }, [kakaoCampaignsLinked, _bc]);
    useEffect(() => { _bc('CHANNEL_PRICES_UPDATE', channelProductPrices); }, [channelProductPrices, _bc]);
    useEffect(() => { _bc('CONNECTED_CHANNELS_UPDATE', connectedChannels); }, [connectedChannels, _bc]);
    useEffect(() => { _bc('PAYMENT_CARDS_UPDATE', paymentCards); }, [paymentCards, _bc]);

    /* ── 🔄 BroadcastChannel Cross-Tab Listener ─────────────────── */
    useEffect(() => {
        const handleSync = (msg) => {
            const data = msg?.data || msg;
            // 180차 회원 격리: 다른 tenant(다른 회원 탭)의 브로드캐스트는 무시 → 데이터 유입 차단
            if (data && data.tenant && data.tenant !== currentTenant()) return;
            const { type, payload } = data;
            _bcRecv.current[type] = payload; // [현 차수] P1-① echo 방지: 수신 직후 값 추적
            switch (type) {
                case 'INVENTORY_UPDATE':  setInventory(payload); break;
                case 'ORDERS_UPDATE':     setOrders(payload); break;
                case 'BUDGETS_UPDATE':    setChannelBudgets(payload); break;
                case 'SETTLEMENT_UPDATE': setSettlement(payload); break;
                case 'ALERTS_UPDATE':     setAlerts(payload); break;
                case 'CAMPAIGNS_UPDATE':  setSharedCampaigns(payload); break;
                case 'CRM_UPDATE':        setCrmSegments(payload); break;
                case 'PLAN_UPDATE':       setPlanPricing(payload); break;
                case 'CREATORS_UPDATE':   setCreators(payload); break;
                case 'PAYMENT_CARDS_UPDATE': setPaymentCards(payload); break;
                case 'SNS_CAMPAIGNS_UPDATE': setSnsCampaigns(payload); break;
                case 'CHANNEL_PRICES_UPDATE': setChannelProductPrices(payload); break;
                case 'EMAIL_CAMPAIGNS_UPDATE': setEmailCampaignsLinked(payload); break;
                case 'KAKAO_CAMPAIGNS_UPDATE': setKakaoCampaignsLinked(payload); break;
                case 'POPUPS_UPDATE': setWebPopupCampaigns(payload); break;
                case 'CONNECTED_CHANNELS_UPDATE': setConnectedChannels(payload); break;
                default: break;
            }
        };

        // Primary: BroadcastChannel
        if (_broadcastChannel) {
            _broadcastChannel.onmessage = handleSync;
        }
        // Fallback: localStorage events
        const handleStorage = (e) => {
            if (e.key === '__geniego_sync__' && e.newValue) {
                try { handleSync(JSON.parse(e.newValue)); } catch { /* ignore */ }
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            if (_broadcastChannel) _broadcastChannel.onmessage = null;
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    /* ── 🔄 [현 차수] 실시간 동시 동기화 수신부(genie_sync_v1) ───────────────
       다른 탭에서 triggerSync() → postMessage 수신 시 setSyncTick 만 올려 로컬 서버 통계
       useEffect 들을 즉시 재실행(크로스탭 동시 갱신). ★재broadcast 금지(echo/무한루프 차단).
       회원(테넌트) 격리: 발신 tenant 가 현재 회원과 다르면 무시(타 회원 데이터 유입 차단). */
    useEffect(() => {
        if (!_realtimeSyncChannel) return; // 미지원 환경: 로컬 tick 만(무해)
        const onSignal = (msg) => {
            const data = msg?.data || msg;
            if (data && data.tenant && data.tenant !== currentTenant()) return;
            setSyncTick(n => n + 1); // 수신 탭 즉시 재fetch(재전파 안 함 → echo 없음)
        };
        _realtimeSyncChannel.addEventListener('message', onSignal);
        return () => { _realtimeSyncChannel.removeEventListener('message', onSignal); };
    }, []);

    /** 재고를 백엔드에 Save (유료 User 수동 조정 후 호출) */
    const syncInventoryToBackend = useCallback((inventoryList) => {
        if (_isDemo) return; // 절대 가상 데이터가 서버로 쓰여지지 않도록 강력 방어
        const token = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
        if (!token) return;
        const BASE = import.meta.env.VITE_API_BASE || '';
        fetch(`${BASE}/api/channel-sync/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(inventoryList),
        }).catch(() => { /* 로컬 상태는 이미 업데이트됨 */ });
    }, []);

    /**
     * [v11] CatalogSync Channel별 판매가 Save
     * CatalogSync.handleBulkRegister() → 여기 Save
     * OrderHub 신규Orders 모달, PriceOpt 가격 참조에서 소비
     * @param {string} sku
     * @param {Object} channelPrices  { channelId: price }
     */
    const updateCatalogChannelPrices = useCallback((sku, channelPrices) => {
        if (!sku) return;
        setCatalogChannelPrices(prev => {
            const updated = { ...prev, [sku]: { ...(prev[sku] || {}), ...channelPrices } };
            try { tSet('geniego_catalog_channel_prices', JSON.stringify(updated)); } catch { /* ignore */ } // 180차: 테넌트 스코프
            return updated;
        });
        // inventory.price도 첫 번째 Channel가격으로 대표 동기화 (setInventory 직접 사용해 순환참조 방지)
        const firstPrice = Object.values(channelPrices)[0];
        if (firstPrice != null) {
            setInventory(prev => prev.map(item =>
                item.sku === sku ? { ...item, price: firstPrice } : item
            ));
        }
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `📡 Channel가 동기화: [${sku}] ${Object.keys(channelPrices).length}개 Channel 판매가 등록`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    /**
     * [v11] SKU+Channel로 추천 판매가 조회
     * @returns {number|null}
     */
    const getCatalogChannelPrice = useCallback((sku, channelId) => {
        return catalogChannelPrices?.[sku]?.[channelId] ?? null;
    }, [catalogChannelPrices]);

    /** 어드민 Save → localStorage + 전역 상태 업데이트 */
    const updatePlanPricing = useCallback((newPricing) => {
        setPlanPricing(prev => {
            const merged = { ...prev, ...newPricing };
            try { localStorage.setItem('geniego_plan_pricing', JSON.stringify(merged)); } catch { /* ignore */ }
            return merged;
        });
    }, []);

    /* ── ID 생성 ─────────────────────────────────── */
    const seq = useRef(100);
    const mkId = (prefix = 'ID') => `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}-${(seq.current++).toString().padStart(3, '0')}`;


    /* ════════════════════════════════════════════════
       💳 결제 카드 Actions
    ════════════════════════════════════════════════ */
    const addPaymentCard = useCallback((card) => {
        const newCard = {
            id: `CARD-${Date.now().toString(36).toUpperCase()}`,
            ...card,
            isDefault: false,
            addedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
        };
        setPaymentCards(prev => {
            const updated = [...prev, newCard];
            // 첫 카드면 기본 카드로
            if (prev.length === 0) updated[0].isDefault = true;
            return updated;
        });
        return newCard;
    }, []);

    const removePaymentCard = useCallback((cardId) => {
        setPaymentCards(prev => {
            const next = prev.filter(c => c.id !== cardId);
            // Delete된 게 기본카드였으면 첫 번째 카드를 기본으로
            if (next.length > 0 && !next.find(c => c.isDefault)) next[0].isDefault = true;
            return next;
        });
    }, []);

    const setDefaultCard = useCallback((cardId) => {
        setPaymentCards(prev => prev.map(c => ({ ...c, isDefault: c.id === cardId })));
    }, []);

    const chargeCard = useCallback((cardId, amount, description) => {
        // 가상 결제 처리 (실제 PG Integration 시 API 호출)
        setPaymentCards(prev => prev.map(c =>
            c.id === cardId
                ? { ...c, totalCharged: (c.totalCharged || 0) + amount, lastCharged: new Date().toLocaleString('ko-KR', { hour12: false }), lastChargedDesc: description }
                : c
        ));
        return { ok: true, amount, cardId };
    }, []);

    /* ════════════════════════════════════════════════
       재고 Actions
    ════════════════════════════════════════════════ */
    const registerInOut = useCallback(({ type, sku, qty, whId, name, unit, memo, ref, reason, by }) => {
        const numQty = Number(qty);
        if (!numQty || !sku || !whId) return;
        const newRec = {
            id: mkId('IO'), type, sku, name: name || sku, qty: numQty, wh: whId,
            at: new Date().toLocaleString('ko-KR', { hour12: false }),
            by: by || 'User', unit: Number(unit || 0), memo, ref, reason,
        };
        setInOutHistory(prev => [newRec, ...prev]);

        setInventory(prev => prev.map(item => {
            if (item.sku !== sku) return item;
            const cur = item.stock[whId] ?? 0;
            let delta = 0;
            if (type === '입고' || type === '반품입고') delta = numQty;
            else if (type === '출고' || type === '반품출고' || type === '폐기') delta = -numQty;
            const newStock = { ...item.stock, [whId]: Math.max(0, cur + delta) };
            const total = Object.values(newStock).reduce((s, v) => s + v, 0);
            if (total <= item.safeQty && delta < 0) {
                setAlerts(prev => [
                    { id: mkId('AL'), type: 'warn', msg: `⚠️ [${item.name}] 재고부족! 총 ${total}개 (안전재고 ${item.safeQty}개)`, time: '방금', read: false },
                    ...prev.slice(0, 49)
                ]);
            }
            return { ...item, stock: newStock };
        }));
    }, []);

    const adjustStock = useCallback((sku, whId, newQty) => {
        setInventory(prev => prev.map(item =>
            item.sku === sku ? { ...item, stock: { ...item.stock, [whId]: Math.max(0, Number(newQty)) } } : item
        ));
        setAlerts(prev => [
            { id: mkId('AL'), type: 'info', msg: `🔧 재고 조정 Done: [${sku}] ${whId} → ${newQty}개`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    // ✅ [v6 NEW] PriceOpt ↔ inventory 동기화 — 가격 변경 시 inventory.price 자동 반영
    const updateProductPrice = useCallback((sku, newPrice, newCost) => {
        setInventory(prev => prev.map(item => {
            if (item.sku !== sku) return item;
            const updated = { ...item };
            if (newPrice != null) updated.price = Number(newPrice);
            if (newCost != null) updated.cost = Number(newCost);
            return updated;
        }));
        setAlerts(prev => [
            { id: mkId('AL'), type: 'info', msg: `💰 [${sku}] 가격 동기화 Done — 판매가 ₩${Number(newPrice || 0).toLocaleString()}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    // ✅ [v6 NEW] CatalogSync ↔ inventory 동기화 — 신규 상품 등록 시 inventory에 자동 Add
    const syncCatalogItem = useCallback(({ sku, name, price, cost, safeQty = 30 }) => {
        if (!sku || !name) return;
        setInventory(prev => {
            const exists = prev.find(i => i.sku === sku);
            if (exists) {
                // 이미 있으면 가격만 업데이트
                return prev.map(i => i.sku === sku ? {
                    ...i,
                    ...(price != null ? { price: Number(price) } : {}),
                    ...(cost != null ? { cost: Number(cost) } : {}),
                } : i);
            }
            // 신규 상품 Add
            const newItem = { sku, name, stock: { W001: 0, W002: 0, W003: 0 }, safeQty, cost: Number(cost || 0), price: Number(price || 0) };
            return [...prev, newItem];
        });
        // ── [227차 Tier2] COGS 영속: 셀러 원가/판매가를 백엔드 channel_inventory 에 저장 ──
        //   채널 동기화는 원가를 제공하지 않으므로, 카탈로그 동기화 시점의 cost 가 유일한 COGS 소스다.
        //   기존엔 로컬 state 만 갱신 → 서버측 P&L COGS(OrderHub::ordersStats 의 qty×cost 조인)가 0 이었다.
        //   이제 카탈로그→재고 동기화 SSOT 인 여기서 백엔드에 cost 를 영속한다(saveInventory 는 conflict 시
        //   available 을 건드리지 않아 재고 보존). 데모/토큰없음은 skip(가상 데이터 운영 유입 0).
        if (!_isDemo && (cost != null || price != null)) {
            try {
                const token = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
                if (token) {
                    const BASE = import.meta.env.VITE_API_BASE || '';
                    fetch(`${BASE}/api/channel-sync/inventory`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify([{ sku, name, cost: Number(cost || 0), price: Number(price || 0) }]),
                    }).catch(() => { /* 로컬 state 는 이미 갱신됨 */ });
                }
            } catch { /* ignore */ }
        }
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `📂 카탈로그 동기화: [${name}] inventory Integration Done`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, [_isDemo]);

    /* ════════════════════════════════════════════════
       Orders Actions  (판매 → 재고차감 → P&L)
    ════════════════════════════════════════════════ */
    const placeOrder = useCallback(({ ch, sku, name, buyer, qty, price, wh, fee = 0, platformFeeRate = 0, adFee = 0 }) => {
        const numQty = Number(qty);
        const numPrice = Number(price);
        const order = {
            id: mkId('ORD'), ch, sku, name, buyer, qty: numQty,
            price: numPrice, total: numQty * numPrice,
            status: '발주Confirm', wh, at: new Date().toLocaleString('ko-KR', { hour12: false }),
            fee: Number(fee), platformFeeRate: Number(platformFeeRate), adFee: Number(adFee),
        };
        setOrders(prev => {
            const next = [order, ...prev];
            broadcastUpdate('ORDERS_UPDATE', next);
            return next;
        });
        registerInOut({ type: '출고', sku, qty: numQty, whId: wh, name, by: `${ch} Orders` });
        // [v4] Orders → CRM 구매이력 자동 갱신
        setCrmCustomerHistory(prev => {
            const key = buyer || ch;
            const hist = prev[key] || [];
            return { ...prev, [key]: [{ orderId: order.id, sku, name, qty: numQty, total: numQty * numPrice, ch, at: order.at }, ...hist.slice(0, 49)] };
        });
        setAlerts(prev => {
            const next = [
                { id: mkId('AL'), type: 'success', msg: `🛒 [${ch}] 새 Orders: ${name} x${numQty} — ₩${(numQty * numPrice).toLocaleString()}`, time: '방금', read: false },
                ...prev.slice(0, 49)
            ];
            broadcastUpdate('ALERTS_UPDATE', next);
            return next;
        });
        // [현 차수] 운영: 주문 변경 → 서버 통계(주문/정산/클레임/인플루언서) 즉시 재fetch + 전 탭 동시 갱신.
        //   데모는 위 client state + broadcastUpdate 로 이미 동기화되므로 운영 경로에만 트리거.
        if (!_isDemo) triggerSync();
        return order;
    }, [registerInOut, triggerSync]);

    const updateOrderStatus = useCallback((id, newStatus) => {
        const statusVal = typeof newStatus === 'string' ? newStatus : newStatus?.status || newStatus;
        // ── 상태 변경 전 현재 Orders 정보 캡처 ─────────────────────────────
        let capturedOrder = null;
        setOrders(prev => {
            capturedOrder = prev.find(o => o.id === id) || null;
            const next = prev.map(o => {
                if (o.id !== id) return o;
                const carrier = typeof newStatus === 'object' ? newStatus.carrier : o.carrier;
                return { ...o, status: statusVal, ...(carrier ? { carrier } : {}) };
            });
            broadcastUpdate('ORDERS_UPDATE', next);
            return next;
        });

        // ── [A-1] 배송Done → WMS 출고 자동 기록 (재고 차감) ─────────────
        if (statusVal === '배송Done' || statusVal === 'Done') {
            setTimeout(() => {
                if (capturedOrder && capturedOrder.sku) {
                    registerInOut({
                        type: '출고',
                        sku: capturedOrder.sku,
                        qty: capturedOrder.qty,
                        whId: capturedOrder.wh || 'W001',
                        name: capturedOrder.name,
                        by: `${capturedOrder.ch || 'Channel'} 배송Done`,
                        reason: '출고확정',
                        ref: capturedOrder.id,
                    });
                }
            }, 0);
            setAlerts(prev => [
                { id: mkId('AL'), type: 'success', msg: `📦 배송Done 확정 — WMS 재고 자동 출고 처리됨 (Orders ${id})`, time: '방금', read: false },
                ...prev.slice(0, 49)
            ]);
        }

        // ── [A-2] 반품접수 → WMS 반품입고 + 정산 returnFee 자동 반영 ────
        if (statusVal === '반품접수' || statusVal === '반품Done') {
            setTimeout(() => {
                if (capturedOrder && capturedOrder.sku) {
                    // WMS 반품입고 자동 등록
                    registerInOut({
                        type: '반품입고',
                        sku: capturedOrder.sku,
                        qty: capturedOrder.qty,
                        whId: capturedOrder.wh || 'W001',
                        name: capturedOrder.name,
                        by: 'CS팀',
                        reason: '고객반품',
                        ref: capturedOrder.id,
                    });
                    // 정산 returnFee 자동 차감 (반품처리비 = Orders총액의 2%)
                    const ch = capturedOrder.ch;
                    const returnFeeAmt = Math.round((capturedOrder.total || 0) * 0.02);
                    const curPeriod = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
                    setSettlement(prev => prev.map(s =>
                        s.channel === ch && s.period === curPeriod
                            ? {
                                ...s,
                                returns: (s.returns || 0) + capturedOrder.qty,
                                returnFee: (s.returnFee || 0) + returnFeeAmt,
                                netPayout: (s.netPayout || 0) - returnFeeAmt,
                                grossSales: (s.grossSales || 0) - (capturedOrder.total || 0),
                              }
                            : s
                    ));
                }
            }, 0);
            setAlerts(prev => [
                { id: mkId('AL'), type: 'warn', msg: `↩ 반품接수 — WMS 입고 + 정산 returnFee 자동 Integration Done (Orders ${id})`, time: '방금', read: false },
                ...prev.slice(0, 49)
            ]);
        }

        // ── Cancel 처리 → 재고 복구 ─────────────────────────────────────────
        if (statusVal === 'CancelDone' || statusVal === 'Cancel') {
            setTimeout(() => {
                if (capturedOrder && capturedOrder.sku) {
                    registerInOut({ type: '반품입고', sku: capturedOrder.sku, qty: capturedOrder.qty, whId: capturedOrder.wh, name: capturedOrder.name, by: 'Cancel처리', reason: 'OrdersCancel' });
                }
            }, 0);
            setAlerts(prev => [
                { id: mkId('AL'), type: 'warn', msg: `↩ Orders Cancel — 재고 자동 복구 처리됨`, time: '방금', read: false },
                ...prev.slice(0, 49)
            ]);
        }
        // [현 차수] 운영: 주문 상태 변경(배송/반품/취소)은 정산·클레임 서버집계에 영향 → 즉시 재fetch + 전 탭 갱신.
        if (!_isDemo) triggerSync();
    }, [registerInOut, triggerSync]);

    /* ════════════════════════════════════════════════
       정산(Settlement) Actions  ✅ NEW
    ════════════════════════════════════════════════ */

    // 정산 데이터 업데이트 (Reconciliation, KrChannel Integration)
    const updateSettlement = useCallback((channel, data) => {
        setSettlement(prev => {
            let next;
            const idx = prev.findIndex(s => s.channel === channel && s.period === data.period);
            if (idx >= 0) {
                next = [...prev];
                next[idx] = { ...next[idx], ...data };
            } else {
                next = [{ channel, ...data, id: mkId('STL') }, ...prev];
            }
            broadcastUpdate('SETTLEMENT_UPDATE', next);
            return next;
        });
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `💳 [${channel}] 정산 업데이트 — 순지급 ₩${Number(data.netPayout || 0).toLocaleString()}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    // 정산 승인 처리
    const approveSettlement = useCallback((channel, period) => {
        setSettlement(prev => prev.map(s =>
            (s.channel === channel && s.period === period) ? { ...s, status: 'settled' } : s
        ));
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `✅ [${channel}] ${period} 정산 승인 Done`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    /* ════════════════════════════════════════════════
       Budget Actions  (Ad Spend → P&L 반영)
    ════════════════════════════════════════════════ */
    const useBudget = useCallback((channelId, amount) => {
        const numAmt = Number(amount);
        if (!numAmt || !channelId) return;
        setChannelBudgets(prev => {
            const ch = prev[channelId];
            if (!ch) return prev;
            const newSpent = ch.spent + numAmt;
            const spentPct = newSpent / ch.budget;
            if (spentPct >= 0.9 && ch.spent / ch.budget < 0.9) {
                setAlerts(ap => [
                    { id: mkId('AL'), type: 'warn', msg: `🚨 [${ch.name}] Budget ${(spentPct * 100).toFixed(0)}% 소진!`, time: '방금', channel: channelId, read: false },
                    ...ap.slice(0, 49)
                ]);
            }
            // ✅ Ad Spend 집행 → 해당 Channel 정산 adFee 반영
            setSettlement(prev => prev.map(s =>
                s.channel === channelId ? { ...s, adFee: (s.adFee || 0) + numAmt, netPayout: (s.netPayout || 0) - numAmt } : s
            ));
            // ✅ [G1 NEW] Ad Spend 집행 → Channel별 예상 Revenue & ROAS 자동 역산 (BudgetPlanner → ChannelKPI 동기화)
            const estimatedRevenue = Math.round(numAmt * (ch.roas || 3.5));
            const newRevenue = (ch.revenue || 0) + estimatedRevenue;
            const newRoas = newSpent > 0 ? parseFloat((newRevenue / newSpent).toFixed(2)) : ch.roas;
            setAlerts(ap => [
                { id: mkId('AL'), type: 'info', msg: `📊 [${ch.name}] Budget 집행 반영: ROAS ${ch.roas}x → ${newRoas}x (Revenue ₩${estimatedRevenue.toLocaleString()} 추정)`, time: '방금', read: false },
                ...ap.slice(0, 49)
            ]);
            return { ...prev, [channelId]: { ...ch, spent: newSpent, revenue: newRevenue, roas: newRoas } };
        });
    }, []);

    const setBudget = useCallback((channelId, newBudget) => {
        setChannelBudgets(prev => prev[channelId]
            ? { ...prev, [channelId]: { ...prev[channelId], budget: Number(newBudget) } }
            : prev
        );
    }, []);

    // Channel ROAS 업데이트 (ChannelKPI → P&L 반영)
    const updateChannelRoas = useCallback((channelId, roas) => {
        setChannelBudgets(prev => prev[channelId]
            ? { ...prev, [channelId]: { ...prev[channelId], roas: Number(roas) } }
            : prev
        );
    }, []);

    /* ════════════════════════════════════════════════
       캠페인 Actions
    ════════════════════════════════════════════════ */
    const addCampaign = useCallback((camp) => {
        setSharedCampaigns(prev => [{ ...camp, _source: 'auto-marketing', syncedAt: new Date().toISOString() }, ...prev]);
        setAlerts(prev => [
            { id: mkId('AL'), type: 'info', msg: `🚀 새 캠페인 승인 요청: ${camp.name}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    const updateCampaignStatus = useCallback((id, status) => {
        setSharedCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    }, []);

    const updateCampaign = useCallback((id, patch) => {
        setSharedCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c));
        setAlerts(prev => [
            { id: mkId('AL'), type: 'info', msg: `✏️ 캠페인 수정됨: ${patch.name || id}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    const deleteCampaign = useCallback((id) => {
        setSharedCampaigns(prev => {
            const target = prev.find(c => c.id === id);
            if (target) {
                setAlerts(ap => [
                    { id: mkId('AL'), type: 'warn', msg: `🗑️ 캠페인 삭제됨: ${target.name}`, time: '방금', read: false },
                    ...ap.slice(0, 49)
                ]);
            }
            return prev.filter(c => c.id !== id);
        });
    }, []);

    const duplicateCampaign = useCallback((id) => {
        setSharedCampaigns(prev => {
            const src = prev.find(c => c.id === id);
            if (!src) return prev;
            const dup = {
                ...src,
                id: mkId('CAMP'),
                name: src.name + ' (복제)',
                status: 'draft',
                spent: 0,
                impressions: 0,
                clicks: 0,
                conv: 0,
                roas: 0,
                createdAt: new Date().toISOString().slice(0, 10),
                _source: 'duplicated',
                syncedAt: new Date().toISOString(),
            };
            setAlerts(ap => [
                { id: mkId('AL'), type: 'success', msg: `📋 캠페인 복제됨: ${dup.name}`, time: '방금', read: false },
                ...ap.slice(0, 49)
            ]);
            return [dup, ...prev];
        });
    }, []);

    /* ════════════════════════════════════════════════
       Notification Actions
    ════════════════════════════════════════════════ */
    const addAlert = useCallback((alert) => {
        setAlerts(prev => [{ id: mkId('AL'), ...alert, time: '방금', read: false }, ...prev.slice(0, 49)]);
    }, []);
    const dismissAlert = useCallback((id) => setAlerts(prev => prev.filter(a => a.id !== id)), []);
    const markAlertRead = useCallback((id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a)), []);
    const markAllRead = useCallback(() => setAlerts(prev => prev.map(a => ({ ...a, read: true }))), []);

    /* ════════════════════════════════════════════════
       [v4] CRM ↔ 이메일 ↔ Kakao ↔ Journey 유기적 Integration
    ════════════════════════════════════════════════ */

    /** CRM 세그먼트 업데이트 */
    const updateCrmSegment = useCallback((segId, patch) => {
        setCrmSegments(prev => prev.map(s => s.id === segId ? { ...s, ...patch } : s));
    }, []);

    /** Orders → CRM 구매이력 갱신 (placeOrder에서 호출) */
    const recordPurchaseToCRM = useCallback((order) => {
        const key = order.buyer || order.ch;
        setCrmCustomerHistory(prev => {
            const hist = prev[key] || [];
            return { ...prev, [key]: [{ orderId: order.id, sku: order.sku, name: order.name, qty: order.qty, total: order.total, ch: order.ch, at: order.at }, ...hist.slice(0, 49)] };
        });
    }, []);

    /** CRM 세그먼트 → 이메일 캠페인 자동 생성 */
    const createEmailCampaignFromSegment = useCallback((segId, campaignName) => {
        setCrmSegments(prev => {
            const seg = prev.find(s => s.id === segId);
            if (!seg) return prev;
            const camp = { id: `EC-${Date.now()}`, name: campaignName || `${seg.name} 이메일 캠페인`, status: 'draft', targetSegmentId: segId, targetSegmentName: seg.name, estimatedReach: seg.count, sent: 0, open_rate: 0, click_rate: 0, revenue: 0, createdAt: new Date().toISOString() };
            setEmailCampaignsLinked(p => [camp, ...p]);
            setAlerts(p => [{ id: `AL-${Date.now()}`, type: 'success', msg: `📧 [이메일] '${seg.name}' 세그먼트 Integration 캠페인 생성: ${camp.name}`, time: '방금', read: false }, ...p.slice(0, 49)]);
            return prev;
        });
    }, []);

    /** CRM 세그먼트 → Kakao/LINE 캠페인 자동 생성 */
    const createKakaoCampaignFromSegment = useCallback((segId, campaignName) => {
        setCrmSegments(prev => {
            const seg = prev.find(s => s.id === segId);
            if (!seg) return prev;
            const camp = { id: `KC-${Date.now()}`, name: campaignName || `${seg.name} Kakao 캠페인`, type: 'marketing', status: 'draft', targetSegmentId: segId, targetSegmentName: seg.name, estimatedReach: seg.count, sent: 0, open_rate: 0, click_rate: 0, createdAt: new Date().toISOString() };
            setKakaoCampaignsLinked(p => [camp, ...p]);
            setAlerts(p => [{ id: `AL-${Date.now()}`, type: 'success', msg: `💬 [Kakao] '${seg.name}' 세그먼트 Integration 캠페인 생성: ${camp.name}`, time: '방금', read: false }, ...p.slice(0, 49)]);
            return prev;
        });
    }, []);

    /** 이메일/Kakao/LINE 캠페인 상태 업데이트 */
    const updateEmailCampaign = useCallback((id, patch) => {
        setEmailCampaignsLinked(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    }, []);

    /** [v12 NEW] 이메일 캠페인 신규 추가 */
    const addEmailCampaign = useCallback((campaign) => {
        setEmailCampaignsLinked(prev => [campaign, ...prev]);
        setAlerts(prev => [
            { id: `AL-${Date.now()}`, type: 'success', msg: `📧 이메일 캠페인 생성: ${campaign.name}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

    /** [v12 NEW] 이메일 템플릿 동기화 */
    const updateEmailTemplates = useCallback((templates) => {
        setEmailTemplates(templates);
    }, []);

    /** [v12 NEW] 이메일 설정 동기화 */
    const updateEmailSettings = useCallback((settings) => {
        setEmailSettings(settings);
    }, []);

    const updateKakaoCampaign = useCallback((id, patch) => {
        setKakaoCampaignsLinked(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    }, []);

    /** [179차] Kakao 캠페인 신규 추가 (KakaoChannel ↔ 전체 동기화) */
    const addKakaoCampaign = useCallback((campaign) => {
        const camp = { id: campaign.id || `KC-${Date.now()}`, type: 'alimtalk', status: 'draft', sent: 0, open_rate: 0, click_rate: 0, estimatedReach: 0, createdAt: new Date().toISOString(), ...campaign };
        setKakaoCampaignsLinked(prev => [camp, ...prev]);
        setAlerts(prev => [{ id: `AL-${Date.now()}`, type: 'success', msg: `💬 카카오 캠페인 생성: ${camp.name}`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        return camp;
    }, []);

    /** [179차] Kakao 캠페인 삭제 */
    const deleteKakaoCampaign = useCallback((id) => {
        setKakaoCampaignsLinked(prev => prev.filter(c => c.id !== id));
    }, []);

    /** Journey Builder 트리거 Run → 이메일/Kakao 상태 자동 갱신 */
    const triggerJourneyAction = useCallback((triggerType, payload) => {
        const log = { id: `JT-${Date.now()}`, type: triggerType, payload, at: new Date().toISOString() };
        setJourneyTriggers(prev => [log, ...prev.slice(0, 99)]);
        if (triggerType === 'email_send') {
            setEmailCampaignsLinked(prev => prev.map(c => c.id === payload.campaignId ? { ...c, status: 'sent', sent: (c.sent || 0) + (payload.count || 1) } : c));
            setAlerts(prev => [{ id: `AL-${Date.now()}`, type: 'info', msg: `📧 Journey 이메일 발송: ${payload.count || 1}명`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }
        if (triggerType === 'kakao_send') {
            setKakaoCampaignsLinked(prev => prev.map(c => c.id === payload.campaignId ? { ...c, status: 'sent', sent: (c.sent || 0) + (payload.count || 1) } : c));
            setAlerts(prev => [{ id: `AL-${Date.now()}`, type: 'info', msg: `💬 Journey Kakao 발송: ${payload.count || 1}명`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }
        if (triggerType === 'line_send') {
            setAlerts(prev => [{ id: `AL-${Date.now()}`, type: 'info', msg: `💚 Journey LINE 발송: ${payload.count || 1}명`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }
        if (triggerType === 'segment_update' && payload.segmentId) {
            setCrmSegments(prev => prev.map(s => s.id === payload.segmentId ? { ...s, count: payload.count ?? s.count } : s));
        }
        return log;
    }, []);

    /* ════════════════════════════════════════════════
       [v5 NEW] AI 예측 ↔ CRM ↔ 웹팝업 Integration Actions
    ════════════════════════════════════════════════ */

    /** AI 예측 결과 업데이트 (AIPrediction → GlobalContext 동기화) */
    const updateAIPredictions = useCallback((predictions, metrics) => {
        if (predictions) setAiPredictions(predictions);
        if (metrics) setAiModelMetrics(metrics);
    }, []);

    /** AI 이탈 위험 고객 → 이메일 + Kakao + 웹팝업 자동 생성 (원클릭 전Channel 대응) */
    const triggerAIAutoAction = useCallback((riskLevel = 'high', segmentId = 'seg_churn') => {
        const segName = riskLevel === 'high' ? '이탈 위험 고객' : '중간 위험 고객';
        const campName = `AI 자동 ${segName} ${new Date().toLocaleDateString('ko-KR')} 캠페인`;

        // 이메일 + Kakao 자동 생성
        setCrmSegments(prev => {
            const seg = prev.find(s => s.id === segmentId) || { id: segmentId, name: segName, count: 0 };
            // 이메일
            const emailCamp = { id: `EC-AI-${Date.now()}`, name: campName, status: 'draft', targetSegmentId: segmentId, targetSegmentName: segName, estimatedReach: seg.count, sent: 0, open_rate: 0, click_rate: 0, revenue: 0, createdAt: new Date().toISOString(), source: 'ai_auto' };
            setEmailCampaignsLinked(p => [emailCamp, ...p]);
            // Kakao
            const kakaoCamp = { id: `KC-AI-${Date.now()}`, name: campName, type: 'marketing', status: 'draft', targetSegmentId: segmentId, targetSegmentName: segName, estimatedReach: seg.count, sent: 0, open_rate: 0, click_rate: 0, createdAt: new Date().toISOString(), source: 'ai_auto' };
            setKakaoCampaignsLinked(p => [kakaoCamp, ...p]);
            // 웹팝업
            const popup = { id: `WP-AI-${Date.now()}`, name: `${segName} 재방문 쿠폰 팝업`, type: 'slide_in', targetSegmentId: segmentId, status: 'active', createdAt: new Date().toISOString(), source: 'ai_auto', impressions: 0, clicks: 0, conversions: 0 };
            setWebPopupCampaigns(p => [popup, ...p]);
            return prev;
        });

        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `🤖 AI 자동 대응: ${segName} → 이메일+Kakao+웹팝업 3Channel 캠페인 동시 생성`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);

        // Journey 트리거
        setJourneyTriggers(prev => [{ id: `JT-AI-${Date.now()}`, type: 'ai_auto_action', payload: { riskLevel, segmentId, segName }, at: new Date().toISOString() }, ...prev.slice(0, 99)]);
    }, []);

    /** 웹팝업 진행 상황 업데이트 (WebPopup ↔ GlobalContext Integration) */
    const updateWebPopupStats = useCallback((popupId, stats) => {
        setWebPopupCampaigns(prev => prev.map(p => p.id === popupId ? { ...p, ...stats } : p));
    }, []);

    /** [179차] 웹팝업 신규 추가 (WebPopup ↔ 전체 동기화) */
    const addWebPopup = useCallback((popup) => {
        const p = { id: popup.id || `WP-${Date.now()}`, type: 'center_modal', status: 'active', impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, createdAt: new Date().toISOString(), ...popup };
        setWebPopupCampaigns(prev => [p, ...prev]);
        setAlerts(prev => [{ id: `AL-${Date.now()}`, type: 'success', msg: `🎯 웹팝업 생성: ${p.name}`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        return p;
    }, []);

    /** [179차] 웹팝업 삭제 */
    const deleteWebPopup = useCallback((id) => {
        setWebPopupCampaigns(prev => prev.filter(p => p.id !== id));
    }, []);

    /* ════════════════════════════════════════════════
       [v8 NEW] AI 마케팅 자동화 통합 Actions
    ════════════════════════════════════════════════ */

    /** AIRuleEngine 룰 승인 → GlobalData 등록 (Marketing 페이지 등에서 표시) */
    const addActiveRule = useCallback((rule) => {
        const newRule = {
            id: rule.id || `RULE-${Date.now()}`,
            name: rule.name,
            condition: rule.condition,
            action: rule.action,
            priority: rule.priority || 'MEDIUM',
            approvedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
            fires: 0,
            prevented: 0,
            status: 'active',
            origin: rule.origin || 'AI 추천→승인',
        };
        setActiveRules(prev => [newRule, ...prev]);
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `🧠 AI 룰 등록: "${rule.name}" Active화됨`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
        return newRule;
    }, []);

    /** AIRuleEngine 룰 발동 → 발동 이력 기록 (Marketing 페이지 배너) */
    const fireRule = useCallback((ruleId, context) => {
        const rule = activeRules.find(r => r.id === ruleId);
        const fireName = rule?.name || ruleId;
        const fired = {
            id: mkId('FIRE'),
            ruleId,
            ruleName: fireName,
            context,
            firedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
            status: 'executed',
        };
        setRulesFired(prev => [fired, ...prev.slice(0, 99)]);
        setActiveRules(prev => prev.map(r => r.id === ruleId ? { ...r, fires: (r.fires || 0) + 1 } : r));
        setAlerts(prev => [
            { id: mkId('AL'), type: 'warn', msg: `⚡ 룰 자동 발동: "${fireName}" — ${context?.summary || '조건 충족'}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
        return fired;
    }, [activeRules]);

    /** AIMarketingHub 추천 Run → 로그 기록 + CampaignManager 자동 등록 */
    const executeAIRecommendation = useCallback((rec, budget, cardAlias) => {
        const log = {
            id: mkId('AIREC'),
            recId: rec?.id,
            title: rec?.title,
            type: rec?.type,
            budget,
            cardAlias,
            estimatedROI: rec.estimatedROI,
            estimatedRevenue: rec.estimatedRevenue,
            estimatedProfit: rec.estimatedProfit,
            channels: rec.channels,
            executedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
            status: 'executed',
        };
        setAiRecommendationLog(prev => [log, ...prev.slice(0, 99)]);

        // Budget 자동 집행 → channelBudgets 반영
        if (rec.channels?.length) {
            rec.channels.forEach(ch => {
                if (ch.id && ch.budget) {
                    setChannelBudgets(prev => {
                        const existing = prev[ch.id];
                        if (!existing) return prev;
                        return { ...prev, [ch.id]: { ...existing, spent: existing.spent + ch.budget } };
                    });
                }
            });
        }

        // CampaignManager 자동 캠페인 등록
        if (rec.type === 'budget_rebalance' || rec.type === 'acquisition' || rec.type === 'channel_boost') {
            const camp = {
                id: mkId('CAMP'),
                name: rec.title,
                status: 'active',
                type: rec.type,
                budget,
                channels: rec.channels,
                estimatedRoas: rec.estimatedRoas,
                estimatedRevenue: rec.estimatedRevenue,
                source: 'ai_hub',
                createdAt: new Date().toISOString(),
            };
            setSharedCampaigns(prev => [camp, ...prev]);
        }

        // Attribution 데이터 자동 업데이트
        if (rec.channels?.length && budget > 0) {
            setAttributionData(prev => [
                ...prev,
                ...rec.channels.map(ch => ({
                    id: mkId('ATTR'),
                    channel: ch.id,
                    channelName: ch.name,
                    spend: ch.budget,
                    estimatedRevenue: Math.round(ch.budget * (rec.estimatedRoas || 3)),
                    source: 'ai_recommendation',
                    date: new Date().toISOString(),
                }))
            ]);
        }

        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `🚀 AI 추천 자동 집행: ${rec.title} — ₩${budget.toLocaleString()} (${cardAlias || '카드'})`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
        return log;
    }, []);

    /** JourneyBuilder 여정 Run → Attribution에 자동 반영 */
    const recordJourneyExecution = useCallback((journey, stats) => {
        const exec = {
            id: mkId('JEXEC'),
            journeyId: journey.id,
            journeyName: journey.name,
            triggerType: journey.trigger_type,
            entered: stats.entered || 0,
            completed: stats.completed || 0,
            emailsSent: stats.emailsSent || 0,
            kakaoSent: stats.kakaoSent || 0,
            revenue: stats.revenue || 0,
            executedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
        };
        setJourneyExecutions(prev => [exec, ...prev.slice(0, 99)]);

        // Attribution에 Journey 성과 반영
        if (stats.revenue > 0) {
            setAttributionData(prev => [
                { id: mkId('ATTR'), channel: 'journey_email', channelName: 'Journey 이메일', spend: 0, estimatedRevenue: Math.round(stats.revenue * 0.4), source: 'journey', date: new Date().toISOString() },
                { id: mkId('ATTR'), channel: 'journey_kakao', channelName: 'Journey Kakao', spend: 0, estimatedRevenue: Math.round(stats.revenue * 0.6), source: 'journey', date: new Date().toISOString() },
                ...prev,
            ]);
        }

        setAlerts(prev => [
            { id: mkId('AL'), type: 'info', msg: `🗺️ Journey "${journey.name}" Run: 진입 ${stats.entered}명, Done ${stats.completed}명`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
        return exec;
    }, []);

    /** A/B Test 결과 등록 (EmailMarketing/Attribution → CampaignManager 표시) */
    const addAbTestResult = useCallback((test) => {
        const result = {
            id: test.id || mkId('AB'),
            name: test.name,
            winner: test.winner,
            confidence: test.confidence,
            pValue: test.pValue,
            variants: test.variants,
            source: test.source || 'email',
            completedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
        };
        setAbTestResults(prev => [result, ...prev.slice(0, 49)]);
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `🧪 A/B Test Done: "${test.name}" — ${test.winner?.toUpperCase()}안 승 (신뢰도 ${test.confidence}%)`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
        return result;
    }, []);

    /* ════════════════════════════════════════════════
       [v9 NEW] 크로스 기능 동기화 Actions
    ════════════════════════════════════════════════ */

    /** OrderHub Orders 확정 → WMS 자동 출고 등록 */
    const confirmOrderToWms = useCallback((order) => {
        if (!order?.id || !order?.sku) return;
        registerInOut({
            type: '출고',
            sku: order.sku,
            qty: order.qty,
            whId: order.wh || 'W001',
            name: order.name,
            by: `${order.ch || 'Channel'} Orders확정`,
            ref: order.id,
            memo: `Orders ${order.id} 자동출고`,
        });
        // 피킹 리스트 자동 생성
        const picking = {
            id: mkId('PK'), orderId: order.id, sku: order.sku, name: order.name,
            qty: order.qty, wh: order.wh || 'W001', status: 'pending',
            createdAt: new Date().toLocaleString('ko-KR', { hour12: false }),
        };
        setPickingLists(prev => [picking, ...prev.slice(0, 499)]);
        // 패킹 슬립 생성
        const packing = {
            id: mkId('PS'), orderId: order.id, buyer: order.buyer, sku: order.sku,
            name: order.name, qty: order.qty, price: order.price,
            createdAt: new Date().toLocaleString('ko-KR', { hour12: false }), printed: false,
        };
        setPackingSlips(prev => [packing, ...prev.slice(0, 499)]);
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `📦 [WMS] Orders ${order.id} → 자동출고 + 피킹리스트 생성`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, [registerInOut]);

    /**
     * [289차 후속 / MEA Part 063 · FIND-063-2 후속] 반품/클레임 상태 전이 — 화면 배선용 단일 진입점.
     *
     * 종전엔 백엔드 `POST /api/v424/orderhub/claims/status`(OrderHub::setClaimStatus, 라우팅 완료)가
     *   구현돼 있는데도 **프론트에서 호출하는 곳이 한 곳도 없어 반품 상태를 바꿀 수단이 없었다.**
     *   그 결과 `disposed`(폐기) 같은 상태는 화면·집계·15개국 라벨이 다 있어도 도달 불가였다.
     *
     * ★저장소 주의: 화면이 표시하는 반품은 메인 DB `orderhub_claims`(claimHistory)다.
     *   별도 SQLite 의 `returns` 테이블(ReturnsPortal.php)과는 **ID 체계가 다르므로**
     *   `/v420/returns/{id}/status` 로 보내면 매칭되지 않는다 — 반드시 claims 엔드포인트를 쓴다.
     * ★데모는 서버를 호출하지 않고 로컬 상태만 갱신(운영 데이터 오염 0).
     * @returns {Promise<boolean>} 성공 여부(실패 시 낙관적 갱신을 되돌린다)
     */
    const updateClaimStatus = useCallback(async (id, status) => {
        if (!id || !status) return false;
        let prevStatus;
        setClaimHistory(prev => prev.map(c => {
            if (c.id !== id) return c;
            prevStatus = c.status;
            return { ...c, status };
        }));
        if (_isDemo) return true;                       // 데모: 로컬 반영만
        try {
            const r = await postJsonAuth('/api/v424/orderhub/claims/status', { id, status });
            if (r?.ok) return true;
            throw new Error(r?.error || 'update_failed');
        } catch (e) {
            // ★실패를 성공으로 위장하지 않는다 — 원상복구 후 false 반환(호출측이 사용자에게 알린다).
            if (prevStatus !== undefined) {
                setClaimHistory(prev => prev.map(c => (c.id === id ? { ...c, status: prevStatus } : c)));
            }
            return false;
        }
    }, []);

    /** 클레임 처리Done → WMS 반품입고 자동 연결 */
    const registerClaimReturn = useCallback((claim) => {
        if (!claim?.orderId && !claim?.sku) return;
        const claimWithTs = { ...claim, processedAt: new Date().toLocaleString('ko-KR', { hour12: false }), id: claim.id || mkId('CLM') };
        setClaimHistory(prev => [claimWithTs, ...prev.slice(0, 499)]);
        if (claim.sku && claim.qty) {
            registerInOut({
                type: '반품입고',
                sku: claim.sku,
                qty: claim.qty,
                whId: claim.wh || 'W001',
                name: claim.name || claim.sku,
                by: 'CS팀 클레임처리',
                ref: claim.orderId,
                reason: claim.reason || '반품',
                memo: `클레임 ${claim.id} 자동반품입고`,
            });
            // 정산에서 반품비 차감
            if (claim.channel) {
                setSettlement(prev => prev.map(s =>
                    s.channel === claim.channel
                        ? { ...s, returnFee: (s.returnFee || 0) + (claim.returnFee || 3000), returns: (s.returns || 0) + 1, netPayout: (s.netPayout || 0) - (claim.returnFee || 3000) }
                        : s
                ));
            }
        }
        setAlerts(prev => [
            { id: mkId('AL'), type: 'info', msg: `↩ 클레임 처리Done → WMS 반품입고 자동등록 (${claim.sku})`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, [registerInOut]);

    /** DigitalShelf SoS 데이터 → GlobalContext 공유 (PriceOpt 등에서 소비) */
    const syncDigitalShelf = useCallback((data) => {
        setDigitalShelfData(prev => ({
            ...prev,
            ...data,
            lastUpdated: new Date().toISOString(),
        }));
    }, []);

    // [현 차수 감사] dead 코드 제거: linkOrderToCampaign·getCampaignRoas 는 Provider value 에 미export·무호출
    //   (실제 캠페인 ROAS 는 서버 monitorLive 집계 campaign.roas 사용). 로컬 campaignOrderMap 도 함께 제거.

    /** Orders 메모/태그 Add */
    const setOrderMemo = useCallback((orderId, memo, tags = []) => {
        setOrderMemos(prev => ({ ...prev, [orderId]: { memo, tags, updatedAt: new Date().toLocaleString('ko-KR', { hour12: false }) } }));
    }, []);

    /** SLA 위반 감지 (Orders 후 48h경과 미출고) */
    const checkSlaViolations = useCallback(() => {
        const now = Date.now();
        const violations = orders.filter(o => {
            if (!['발주Confirm', '출고대기'].includes(o.status)) return false;
            const ordered = new Date(o.at).getTime();
            return (now - ordered) > 48 * 3600 * 1000;
        });
        setSlaViolations(violations);
        if (violations.length > 0) {
            setAlerts(prev => [
                { id: mkId('AL'), type: 'warn', msg: `⏰ SLA 위반 ${violations.length}건 — 48시간 초과 미출고 Orders Confirm 필요`, time: '방금', read: false },
                ...prev.filter(a => !a.msg?.includes('SLA 위반')).slice(0, 49)
            ]);
        }
        return violations;
    }, [orders]);

    /** AI 룰 엔진 커머스 트리거 Confirm */
    const checkCommerceRuleTriggers = useCallback(() => {
        // 재고 부족 룰
        const lowStock = inventory.filter(item => Object.values(item.stock).reduce((a, b) => a + b, 0) <= item.safeQty);
        lowStock.forEach(item => {
            const ruleExists = activeRules.find(r => r.trigger === 'inventory_low' && r.skuFilter === item.sku);
            if (ruleExists) {
                fireRule(ruleExists.id, { summary: `[${item.name}] 재고 ${Object.values(item.stock).reduce((a, b) => a + b, 0)}개 ≤ 안전재고 ${item.safeQty}개` });
            }
        });
        // 클레임율 급등 룰
        const claimRateThreshold = activeRules.find(r => r.trigger === 'claim_rate_high');
        if (claimRateThreshold) {
            const rate = claimHistory.length / Math.max(1, orders.length);
            if (rate > (claimRateThreshold.threshold || 0.05)) {
                fireRule(claimRateThreshold.id, { summary: `클레임율 ${(rate * 100).toFixed(1)}% 초과` });
            }
        }
    }, [inventory, activeRules, claimHistory, orders, fireRule]);

    /** 공급 발주(PO) Add — Replenishment */
    const addSupplyOrder = useCallback((po) => {
        const newPO = {
            id: mkId('PO'), ...po,
            orderDate: new Date().toLocaleDateString('ko-KR'),
            status: 'draft',
            total: (Number(po.qty) || 0) * (Number(po.unitCost) || 0),
        };
        setSupplyOrders(prev => [newPO, ...prev]);
        setAlerts(prev => [
            { id: mkId('AL'), type: 'info', msg: `📋 발주서 생성: [${po.name}] ${po.qty}개 → ${po.supplier}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
        return newPO;
    }, []);

    /** 발주 상태 업데이트 → WMS 입고 자동 Integration */
    const updateSupplyOrderStatus = useCallback((poId, status) => {
        setSupplyOrders(prev => prev.map(po => po.id !== poId ? po : { ...po, status }));
        if (status === 'received') {
            const po = supplyOrders.find(p => p.id === poId);
            if (po) {
                registerInOut({ type: '입고', sku: po.sku, qty: po.qty, whId: 'W001', name: po.name, by: '구매팀', ref: po.id, memo: `PO ${po.id} 입고확정` });
                setAlerts(prev => [
                    { id: mkId('AL'), type: 'success', msg: `✅ 발주 ${po.id} 입고Done → WMS 재고 자동 반영`, time: '방금', read: false },
                    ...prev.slice(0, 49)
                ]);
            }
        }
    }, [supplyOrders, registerInOut]);

    /** Lot/유통기한 등록 */
    const registerLot = useCallback((lot) => {
        const newLot = {
            id: mkId('LOT'), ...lot,
            registeredAt: new Date().toLocaleString('ko-KR', { hour12: false }),
        };
        setLotManagement(prev => [newLot, ...prev]);
        const today = new Date();
        const expiry = new Date(lot.expiryDate);
        const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) {
            setAlerts(prev => [
                { id: mkId('AL'), type: 'warn', msg: `⚠️ [${lot.name}] Lot ${lot.lotNo} 유통기한 ${daysLeft}일 남음 (${lot.expiryDate})`, time: '방금', read: false },
                ...prev.slice(0, 49)
            ]);
        }
        return newLot;
    }, []);

    /** 가격 프로모션 캘린더 Add */
    const addPriceCalendarEvent = useCallback((event) => {
        const newEvent = { id: mkId('PCE'), ...event, createdAt: new Date().toISOString() };
        setPriceCalendar(prev => [...prev, newEvent].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)));
        return newEvent;
    }, []);

    /* ════════════════════════════════════════════════
       [v13 NEW] 인플루언서 크리에이터 Actions
    ════════════════════════════════════════════════ */

    /** 크리에이터 목록 전체 동기화 (API 조회 후 일괄 세팅) */
    const syncCreators = useCallback((list) => {
        if (Array.isArray(list) && guardProductionState('creators', list, setCreators)) setCreators(list);
    }, []);

    /** 크리에이터 개별 업데이트 (계약·정산·콘텐츠 변경 즉시 반영) */
    const updateCreator = useCallback((id, patch) => {
        setCreators(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
        // [현 차수] 운영: 크리에이터 변경 → influencer/cost-summary 즉시 재fetch(stale 갭 해소) + 전 탭 갱신.
        if (!_isDemo) triggerSync();
    }, [triggerSync]);

    /** UGC 리뷰 동기화 */
    const syncUgcReviews = useCallback((list) => {
        if (Array.isArray(list) && guardProductionState('ugcReviews', list, setUgcReviews)) setUgcReviews(list);
    }, []);

    /** 채널 통계 동기화 */
    const syncChannelStats = useCallback((list) => {
        if (Array.isArray(list) && guardProductionState('channelStats', list, setChannelStats)) setChannelStats(list);
    }, []);

    /** 부정 키워드 동기화 */
    const syncNegKeywords = useCallback((list) => {
        if (Array.isArray(list) && guardProductionState('negKeywords', list, setNegKeywords)) setNegKeywords(list);
    }, []);

    /* [228차 R5] 제품 리뷰 전용 동기화 — 인플루언서 상태와 분리(교차 오염 방지). */
    const syncProductReviews = useCallback((list) => {
        if (Array.isArray(list) && guardProductionState('reviewItems', list, setReviewItems)) setReviewItems(list);
    }, []);
    const syncReviewChannelStats = useCallback((list) => {
        if (Array.isArray(list) && guardProductionState('reviewChannelStats', list, setReviewChannelStats)) setReviewChannelStats(list);
    }, []);
    const syncReviewNegKeywords = useCallback((list) => {
        if (Array.isArray(list) && guardProductionState('reviewNegKeywords', list, setReviewNegKeywords)) setReviewNegKeywords(list);
    }, []);

    /* ════════════════════════════════════════════════
       파생 집계값 (useMemo — 자동반응형)
    ════════════════════════════════════════════════ */

    // 📦 재고 집계
    const totalInventoryValue = useMemo(() =>
        inventory.reduce((s, item) => s + Object.values(item.stock).reduce((a, b) => a + b, 0) * item.cost, 0),
        [inventory]
    );
    const totalInventoryQty = useMemo(() =>
        inventory.reduce((s, item) => s + Object.values(item.stock).reduce((a, b) => a + b, 0), 0),
        [inventory]
    );
    const lowStockCount = useMemo(() =>
        inventory.filter(item => Object.values(item.stock).reduce((a, b) => a + b, 0) <= item.safeQty).length,
        [inventory]
    );

    // 📋 Orders 집계
    const orderStats = useMemo(() => {
        const activeOrders = orders.filter(o => !_isCancelled(o.status, o.event_type));
        const totalFees = activeOrders.reduce((s, o) => s + (o.fee || 0), 0);
        const totalPlatformFees = activeOrders.reduce((s, o) => s + (o.total * (o.platformFeeRate || 0)), 0);
        // [현 차수] 운영 limit 캡 과소집계 해소: 서버 집계값(전체 행 SQL)이 있으면 count/revenue/버킷을 그것으로
        //   대체(주문 1000건 초과 테넌트 정확 집계). 클라 폴백(서버 미응답)은 기존 배열 집계 유지.
        //   데모는 런타임 단일소스 파생이라 orderStatsServer=null → 클라 집계 유지.
        const srv = (!_isDemo && orderStatsServer && orderStatsServer.ok) ? orderStatsServer : null;
        const count = srv ? Number(srv.count) || 0 : activeOrders.length;
        return {
            count,
            totalOrders: count,            // ✅ 별칭 Add — 컴포넌트 호환용
            revenue: srv ? (Number(srv.revenue) || 0) : activeOrders.reduce((s, o) => s + o.total, 0),
            totalFees,
            totalPlatformFees,
            pending: srv ? (Number(srv.pending) || 0) : orders.filter(o => o.status === '발주Confirm' || o.status === 'paid').length,
            shipping: srv ? (Number(srv.shipping) || 0) : orders.filter(o => ['출고대기','배송중','preparing','shipping'].includes(o.status)).length,
            done: srv ? (Number(srv.done) || 0) : orders.filter(o => ['배송Done','delivered','confirmed','Done'].includes(o.status)).length,
            cancelled: srv ? (Number(srv.cancelled) || 0) : orders.filter(o => _isCancelled(o.status, o.event_type)).length,
            // [현 차수] 반품 건수도 주문 원장에서 자동 파생(반품관리·반품률 정합). 운영=서버 returned 폴백.
            returned: srv ? (Number(srv.returned) || 0) : orders.filter(o => _isReturn(o.status, o.event_type)).length,
            // Content KPI — only populated in demo mode
            contentViews: _isDemo ? 245000 + count * 120 : 0,
            contentVisitors: _isDemo ? 82000 + count * 45 : 0,
            contentAvgTime: _isDemo ? 198 : 0,
            searchInflow: _isDemo ? 38000 + count * 20 : 0,
            // Community KPI — only populated in demo mode
            communityData: _isDemo ? {
                naver: { views: 128000, comments: 4520, inquiries: 890, newMembers: 1240 },
                kakao: { views: 86000, comments: 2870, inquiries: 650, newMembers: 780 },
            } : null,
        };
    }, [orders, orderStatsServer]);

    // 💰 Budget/Ad Spend 집계
    const budgetStats = useMemo(() => {
        const list = Object.values(channelBudgets);
        // [233차 감사 P1] 가짜 광고매출 제거 — revenue 없을 때 spent*roas 역산은 임의 숫자(seeded roas면 날조).
        //   귀속된 실 revenue 만 집계(E '광고기여매출 폴백 제거' 원칙 연장). 미귀속=0(blended ROAS 정직).
        const totalAdRevenue = list.reduce((s, c) => s + (Number(c.revenue) || 0), 0);
        return {
            totalBudget: list.reduce((s, c) => s + c.budget, 0),
            totalSpent: list.reduce((s, c) => s + c.spent, 0),
            remaining: list.reduce((s, c) => s + (c.budget - c.spent), 0),
            blendedRoas: list.reduce((s, c) => s + c.roas * c.spent, 0) / Math.max(1, list.reduce((s, c) => s + c.spent, 0)),
            totalAdRevenue,
        };
    }, [channelBudgets]);

    // 💳 정산 집계 (Reconciliation/KrChannel → P&L)
    const settlementStats = useMemo(() => {
        // [현 차수] 정산상태 캐논 통일: deriveSettlementFromOrders는 'confirmed'(최근)/'settled'(과거)를 생성하고
        //   백엔드는 'estimated'/'confirmed'/'settled'를 쓴다. 기존엔 pending을 status==='pending'로만 봐
        //   'confirmed'가 settled·pending 어디에도 안 잡혀 pendingAmount가 항상 0이었음 → 'settled' 외는 모두 정산대기.
        const settled = settlement.filter(s => s.status === 'settled');
        const pending = settlement.filter(s => s.status !== 'settled');
        // [225차 P0-1] 운영 정산 머니경로 과소집계 해소: 서버집계(전체 행 SQL)가 있으면 money 합계를
        //   그것으로 대체(정산행 200건 초과 테넌트 정확 집계). channels(목록 표시)는 200캡 배열 유지.
        //   데모는 런타임 단일소스 파생이라 settlementStatsServer=null → 클라(배열) 집계 유지.
        const srv = (!_isDemo && settlementStatsServer && settlementStatsServer.ok) ? settlementStatsServer : null;
        if (srv) {
            return {
                totalGross: Number(srv.totalGross) || 0,
                totalNetPayout: Number(srv.totalNetPayout) || 0,
                totalNetEst: Number(srv.totalNetEst) || 0,   // [281차 P2] estimated 정산 net — netProfit 배송비 estShare 정합
                totalPlatformFee: Number(srv.totalPlatformFee) || 0,
                totalAdFee: Number(srv.totalAdFee) || 0,
                totalCouponDiscount: Number(srv.totalCouponDiscount) || 0,
                totalReturnFee: Number(srv.totalReturnFee) || 0,
                totalShippingFee: Number(srv.totalShippingFee) || 0,
                settledAmount: Number(srv.settledAmount) || 0,
                pendingAmount: Number(srv.pendingAmount) || 0,
                totalOrders: Number(srv.totalOrders) || 0,
                totalReturns: Number(srv.totalReturns) || 0,
                returnRate: Number(srv.returnRate) || 0,
                channels: settlement,
            };
        }
        return {
            totalGross: settlement.reduce((s, r) => s + (r.grossSales || 0), 0),
            totalNetPayout: settlement.reduce((s, r) => s + (r.netPayout || 0), 0),
            totalPlatformFee: settlement.reduce((s, r) => s + (r.platformFee || 0), 0),
            totalAdFee: settlement.reduce((s, r) => s + (r.adFee || 0), 0),
            totalCouponDiscount: settlement.reduce((s, r) => s + (r.couponDiscount || 0), 0),
            totalReturnFee: settlement.reduce((s, r) => s + (r.returnFee || 0), 0),
            totalShippingFee: settlement.reduce((s, r) => s + (r.shippingFee || 0), 0), // 데모/클라 폴백: 정산행에 shippingFee 있으면 합산(없으면 0)
            settledAmount: settled.reduce((s, r) => s + (r.netPayout || 0), 0),
            pendingAmount: pending.reduce((s, r) => s + (r.netPayout || 0), 0),
            totalOrders: settlement.reduce((s, r) => s + (r.orders || 0), 0),
            totalReturns: settlement.reduce((s, r) => s + (r.returns || 0), 0),
            returnRate: settlement.reduce((s, r) => s + (r.orders || 0), 0) > 0
                ? settlement.reduce((s, r) => s + (r.returns || 0), 0) / settlement.reduce((s, r) => s + (r.orders || 0), 0)
                : 0,
            channels: settlement,
        };
    }, [settlement, settlementStatsServer]);

    // [현 차수] ★런타임 자동산출 엔진(데모 전용): 주문 변동 → 정산·예산기여매출 즉시 재파생.
    //   체험자가 주문을 등록/수정하면 정산(글로벌/P&L 소스)·성과(예산기여매출)가 주문에 동기화되어
    //   전 메뉴가 동일 총매출로 일체화 유지. 운영(!_isDemo)은 API 소스이므로 미적용.
    useEffect(() => {
        if (!_isDemo) return;
        setSettlement(prev => deriveSettlementFromOrders(orders, prev));
        setChannelBudgets(prev => deriveBudgetRevenue(prev, orders));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders]);

    // [현 차수] ★인플루언서 귀속(Attribution) 자동 산출: 주문 원장 변동 시, 전용 쿠폰/UTM 으로
    //   유입된 주문을 매칭해 tracked 크리에이터의 stats.orders/revenue 를 실측값으로 재산출한다.
    //   manual(추적 식별자 없음=단순 협찬) 크리에이터는 저장 추정치를 그대로 보존(method='manual' 명시).
    //   데모/운영 공통: 운영 creator 에 attribution 이 없으면 전부 manual 로 간주돼 무변경(안전).
    //   dep 에 creators.length 포함 → 운영 creators 비동기 로드(0→N) 직후 1회 적용. length 불변이라 무한루프 없음.
    useEffect(() => {
        setCreators(prev => applyAttribution(prev, orders, { isCancelled: _isCancelled }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, creators.length]);

    // 📊 통합 P&L (Orders+Ad Spend+정산+재고원가 자동집계) ✅ 모든 데이터 소스 통합
    const pnlStats = useMemo(() => {
        const activeOrders = orders.filter(o => !_isCancelled(o.status, o.event_type));

        // [현 차수] ★매출 단일소스 분기:
        //   - 데모: 주문(거래원장)이 유일 소스. 런타임 엔진이 정산을 주문에서 재파생하므로 글로벌/정산/P&L 이
        //     커머스/롤업과 항상 일치(체험자 주문 변동 즉시 전 메뉴 동기화).
        //   - 운영: 기존 동작 100% 보존(정산 우선). 정산은 채널×기간 집계라 가장 완전 → 운영은 반드시 정산
        //     우선 유지. 정산 미적재 시 폴백 매출도 서버집계(전체 행)로 전환해 limit 캡 과소집계를 해소.
        // [현 차수] 운영 매출 폴백도 서버집계(orderStats.revenue, 전체 행) 우선 → 정산 미적재 테넌트의
        //   limit 캡 과소집계 해소. 데모는 런타임 파생 주문합 그대로.
        const orderRevenue = (!_isDemo && orderStatsServer && orderStatsServer.ok)
            ? (Number(orderStatsServer.revenue) || 0)
            : activeOrders.reduce((s, o) => s + o.total, 0);
        const settlementRevenue = settlementStats.totalGross;
        const revenue = _isDemo ? orderRevenue : (settlementRevenue > 0 ? settlementRevenue : orderRevenue);

        // Revenue원가 (COGS): Orders된 SKU 원가 × 수량
        // [225차 P1-11] 운영 COGS 비대칭 해소: 매출은 서버집계인데 COGS 는 activeOrders(1000캡 배열)
        //   계산이라 1000건 초과 테넌트의 총이익/영업이익이 과대였다. 서버 COGS(전체 행 channel_inventory
        //   조인 집계)가 있으면 그것을 사용(null=인벤토리 미적재 등 → 클라 배열 폴백). 데모는 항상 배열.
        const srvCogs = (!_isDemo && orderStatsServer && orderStatsServer.ok && orderStatsServer.cogs != null)
            ? Number(orderStatsServer.cogs)
            : null;
        const cogs = (srvCogs != null && !Number.isNaN(srvCogs))
            ? srvCogs
            : activeOrders.reduce((s, o) => {
                const item = inventory.find(i => i.sku === o.sku);
                return s + (item ? item.cost * o.qty : 0);
            }, 0);
        // [233차 P2 정직] 원가 미등록 주문수량 — 서버 COGS(WAC)는 원가 등록 SKU 만 집계하므로, 미등록분이 있으면
        //   COGS 과소·이익 과대 착시가 생긴다. 그 규모를 그대로 노출해 사용자가 "원가 등록분 기준" 임을 인지하게 한다.
        const cogsUncostedUnits = (!_isDemo && orderStatsServer && orderStatsServer.ok)
            ? (Number(orderStatsServer.cogs_uncosted_units) || 0) : 0;

        // Ad Spend: BudgetPlanner spent 합계 (Channel별 Ad Spend 집행액)
        const adSpend = budgetStats.totalSpent;

        // 플랫폼 수수료: 정산 데이터 우선, 없으면 Orders 기준 추정
        const platformFee = settlementStats.totalPlatformFee > 0
            ? settlementStats.totalPlatformFee
            : activeOrders.reduce((s, o) => s + o.total * (o.platformFeeRate || 0), 0);

        // 쿠폰 할인
        const couponDiscount = settlementStats.totalCouponDiscount;

        // 반품 처리비
        const returnFee = settlementStats.totalReturnFee;

        // [231차] 배송비 — 채널별 정률+무료배송 기준금액(주문별 무료/유료 판정) 서버집계. 미설정 시 0(무후퇴).
        //   net_payout(정산 실수령액)엔 이미 배송비 차감 반영 → operatingProfit(gross 경로)에만 가산(netProfit 불변).
        const shippingCost = settlementStats.totalShippingFee || 0;

        // 정산 순지급액 (실제 받은 금액)
        const netPayout = settlementStats.totalNetPayout;

        // [240차] 인플루언서 비용 — 유일 누락 P&L 항목 보강(경쟁사 Triple Whale 정합). 실 지급액(settle.paid)만 반영.
        //   ★목데이터 운영유입 0: 데모는 클라 데모 creators(격리) 합산, 운영은 서버 실집계(미등록 시 0). _isDemo 가드.
        const influencerCost = _isDemo
            ? Math.round((Array.isArray(creators) ? creators : []).reduce((s, c) => s + (Number(c?.settle?.paid) || 0), 0))
            : Math.round(Number(influencerCostServer?.influencer_cost) || 0);

        // 손익 계산
        const grossProfit = revenue - cogs;                              // Revenue총이익 = Revenue - 원가
        // ★[279차 감사 C-P1] 쿠폰 이중차감 제거(서버 Pnl.php 와 정합). revenue(=SUM(total_price)=채널 결제금액)는
        //   쿠폰이 이미 빠진 post-coupon 값이고, netPayout(=gross-platform-returnFee)도 쿠폰을 별도로 빼지 않는다
        //   (coupon_discount 는 정보용). 여기서 couponDiscount 를 또 빼면 순이익이 쿠폰액만큼 과소였다.
        const operatingProfit = grossProfit - adSpend - platformFee - returnFee - shippingCost - influencerCost; // 영업이익(배송비·인플루언서 포함·쿠폰은 revenue에 이미 반영)
        // ★[279차 재감사] 배송비=판매자 실부담 → operatingProfit 과 정합되게 netProfit 에도 차감(추정 정산 net_payout 엔 배송비 미반영).
        // [281차 P2] ★배송비 estShare 정합 — 백엔드 Pnl.php:215 는 estimated 정산 비중(net_est/net)만큼만 배송비를
        //   차감한다(실 정산 net_payout 엔 배송비가 이미 net out 돼 이중차감 방지). 프론트 폴백도 동일 산식으로 맞춰
        //   server-first 실패 순간의 과도기 표시값 불일치를 제거. net_est 미제공(구백엔드) 시 estShare=1(전액=기존동작).
        const _netEst = settlementStats.totalNetEst || 0;
        const _estShare = netPayout > 0 ? Math.min(1, Math.max(0, _netEst / netPayout)) : 1;
        const _shipInNet = shippingCost * (settlementStats.totalNetEst != null ? _estShare : 1);
        const netProfit = netPayout > 0
            ? netPayout - cogs - adSpend - _shipInNet - influencerCost  // 정산 기준 순이익(배송비 estShare 반영·쿠폰은 이미 반영)
            : operatingProfit;

        // [현 차수] ★P&L 서버 SSOT server-first: 서버(/v424/pnl)가 동일 소스로 조립한 손익이 있으면 그것을 정본으로
        //   사용(최종 산식이 서버 단일소스로 승격). 소스가 프론트 컴포넌트 stats 와 동일해 값 회귀 없음.
        //   데모/서버부재/실패 시 위 클라 계산을 그대로 폴백(무회귀). roas·margin 포맷은 클라에서 재계산해 표기 일관.
        const srvPnl = (!_isDemo && pnlServer && pnlServer.ok) ? pnlServer : null;
        const f = srvPnl || { revenue, cogs, grossProfit, cogsUncostedUnits, adSpend, platformFee,
            couponDiscount, returnFee, shippingCost, influencerCost, operatingProfit, netProfit, netPayout };
        const R = Number(f.revenue) || 0;
        const AS = Number(f.adSpend) || 0;
        return {
            revenue: R, cogs: Number(f.cogs) || 0, grossProfit: Number(f.grossProfit) || 0,
            cogsUncostedUnits: Number(f.cogsUncostedUnits) || 0,
            adSpend: AS, platformFee: Number(f.platformFee) || 0, couponDiscount: Number(f.couponDiscount) || 0,
            returnFee: Number(f.returnFee) || 0, shippingCost: Number(f.shippingCost) || 0,
            influencerCost: Number(f.influencerCost) || 0,
            operatingProfit: Number(f.operatingProfit) || 0, netProfit: Number(f.netProfit) || 0,
            netPayout: Number(f.netPayout) || 0,
            margin: R > 0 ? (Number(f.operatingProfit) / R * 100).toFixed(1) : '0',
            netMargin: R > 0 ? (Number(f.netProfit) / R * 100).toFixed(1) : '0',
            roas: AS > 0 ? budgetStats.blendedRoas : 0,
            // [현 차수] 보고통화 환산 뷰(서버 제공, KRW base 불변). 소비측(선택 표기)용 — 미사용 시 무해.
            reporting: srvPnl ? srvPnl.reporting : null,
            byCurrency: srvPnl ? srvPnl.by_currency : null,
        };
    }, [orders, inventory, budgetStats, settlementStats, orderStats, orderStatsServer, creators, influencerCostServer, pnlServer]);

    // Notification 집계
    const unreadAlertCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);
    const activeCampaignCount = useMemo(() => sharedCampaigns.filter(c => c.status === 'active').length, [sharedCampaigns]);

    /* ════════════════════════════════════════════════
       🔄 Broadcast-Aware Setters (Cross-Tab Sync)
    ════════════════════════════════════════════════ */
    const setInventorySync = useCallback((arg) => {
        setInventory(prev => {
            const next = typeof arg === 'function' ? arg(prev) : arg;
            broadcastUpdate('INVENTORY_UPDATE', next);
            return next;
        });
    }, []);

    const setOrdersSync = useCallback((arg) => {
        setOrders(prev => {
            const next = typeof arg === 'function' ? arg(prev) : arg;
            broadcastUpdate('ORDERS_UPDATE', next);
            return next;
        });
    }, []);

    const setChannelBudgetsSync = useCallback((arg) => {
        setChannelBudgets(prev => {
            const next = typeof arg === 'function' ? arg(prev) : arg;
            broadcastUpdate('BUDGETS_UPDATE', next);
            return next;
        });
    }, []);

    const setAlertsSync = useCallback((arg) => {
        setAlerts(prev => {
            const next = typeof arg === 'function' ? arg(prev) : arg;
            broadcastUpdate('ALERTS_UPDATE', next);
            return next;
        });
    }, []);

    /* ════════════════════════════════════════════════
       Context Value
    ════════════════════════════════════════════════ */
    /** 🎪 [v15] 데모 초기화 — 모든 사용자 수정사항 삭제 → 시드 데이터 복원 */
    const resetDemoData = useCallback(() => {
        if (!_isDemo) return;
        const keys = Object.keys(localStorage).filter(k => k.startsWith(DEMO_LS_PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
        window.location.reload();
    }, []);

    const value = {
        // ── 🎪 데모 모드
        isDemo: _isDemo,
        resetDemoData,

        // ── 🔄 [현 차수] 실시간 동시 동기화 엔진
        //   어느 기능이든 값 변경/등록(주문/정산/인플루언서/자격증명 등) 후 triggerSync() 호출 →
        //   운영 서버 통계 즉시 재fetch + 전 탭 동시 갱신. syncTick 은 파생 재계산 hook 의존성용 노출.
        triggerSync, syncTick,

        // ── 재고 (broadcast-aware)
        inventory, setInventory: setInventorySync,
        inOutHistory,
        totalInventoryValue, totalInventoryQty, lowStockCount,
        registerInOut, adjustStock,
        updateProductPrice,  // [v6] PriceOpt ↔ inventory 동기화
        syncCatalogItem,     // [v6] CatalogSync ↔ inventory 동기화

        // ── Orders (판매)
        orders,
        orderStats,
        placeOrder, updateOrderStatus,

        // ── Budget (광고마케팅비)
        channelBudgets,
        budgetStats,
        useBudget, setBudget, updateChannelRoas,

        // ── 정산 (Settlement)
        settlement, settlementStats,
        updateSettlement, approveSettlement,

        // ── 통합 P&L
        pnlStats,

        // ── 자동화 캀페인
        sharedCampaigns,
        activeCampaignCount,
        addCampaign, updateCampaignStatus, updateCampaign, deleteCampaign, duplicateCampaign,

        // ── [v4] CRM ↔ 이메일 ↔ Kakao ↔ Journey Integration
        crmSegments, setCrmSegments, updateCrmSegment,
        crmCustomerHistory,
        recordPurchaseToCRM,
        emailCampaignsLinked, updateEmailCampaign, addEmailCampaign,
        createEmailCampaignFromSegment,
        kakaoCampaignsLinked, updateKakaoCampaign, addKakaoCampaign, deleteKakaoCampaign,
        createKakaoCampaignFromSegment,
        journeyTriggers, triggerJourneyAction,

        // ── [v12 NEW] 이메일 템플릿 · 설정 동기화
        emailTemplates, updateEmailTemplates,
        emailSettings, updateEmailSettings,

        // ── [v5 NEW] AI 예측 ↔ 전Channel Integration
        aiPredictions, aiModelMetrics, updateAIPredictions,
        triggerAIAutoAction,
        webPopupCampaigns, updateWebPopupStats, addWebPopup, deleteWebPopup,

        // ── [v7] 결제 카드
        paymentCards,
        addPaymentCard, removePaymentCard, setDefaultCard, chargeCard,

        // ── Notification
        alerts, unreadAlertCount,
        addAlert, dismissAlert, markAlertRead, markAllRead,

        // ── Filter
        dateRange, setDateRange,

        // ── [v8] AI 마케팅 자동화 통합 레이어
        activeRules, addActiveRule, fireRule,
        rulesFired,
        aiRecommendationLog, executeAIRecommendation,
        journeyExecutions, recordJourneyExecution,
        attributionData,
        abTestResults, addAbTestResult,

        // ── [v9 NEW] 크로스 기능 동기화
        supplyOrders, addSupplyOrder, updateSupplyOrderStatus,
        lotManagement, registerLot,
        priceCalendar, addPriceCalendarEvent,
        claimHistory, claimStatsServer, registerClaimReturn, updateClaimStatus, orderMemos, setOrderMemo, slaViolations,
        pickingLists, packingSlips,
        digitalShelfData,

        // ── [v10 NEW] 구독요금 동기화
        planPricing, updatePlanPricing,

        // ── [v11 NEW] Channel별 상품 판매가 동기화 (CatalogSync ↔ OrderHub ↔ PriceOpt)
        catalogChannelPrices,
        updateCatalogChannelPrices,
        syncInventoryToBackend,  // [A-3] 백엔드 재고 동기화

        // ── [v13 NEW] 인플루언서 크리에이터 통합 동기화
        creators, syncCreators, updateCreator,
        ugcReviews, syncUgcReviews,
        channelStats, syncChannelStats,
        negKeywords, syncNegKeywords,
        // [228차 R5] 제품 리뷰 전용(인플루언서와 분리)
        reviewItems, syncProductReviews,
        reviewChannelStats, syncReviewChannelStats,
        reviewNegKeywords, syncReviewNegKeywords,

        // ── [v14 NEW] 콘텐츠 캘린더 동기화
        sharedCalendarEvents, setSharedCalendarEvents,
        connectedChannels, setConnectedChannels,

        // ── [v16 NEW] SNS 마케팅 캠페인
        snsCampaigns,
        addSnsCampaign: useCallback((campaign) => {
            const newCamp = { id: mkId('SNS'), ...campaign, createdAt: new Date().toISOString() };
            setSnsCampaigns(prev => [newCamp, ...prev]);
            setAlerts(prev => [{ id: mkId('AL'), type: 'success', msg: `📱 SNS 콘텐츠 생성: ${campaign.name}`, time: '방금', read: false }, ...prev.slice(0, 49)]);
            return newCamp;
        }, []),
        updateSnsCampaign: useCallback((id, patch) => {
            setSnsCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
        }, []),

        // ── [v16 NEW] AI 추천 액션 카드
        aiRecommendations,
        applyAiRecommendation: useCallback((recId) => {
            setAiRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'applied', appliedAt: new Date().toISOString() } : r));
            const rec = aiRecommendations.find(r => r.id === recId);
            if (rec) {
                setAlerts(prev => [{ id: mkId('AL'), type: 'success', msg: `🤖 AI 추천 적용: ${rec.title} — 예상 매출 ₩${(rec.estimatedRevenue||0).toLocaleString()}`, time: '방금', read: false }, ...prev.slice(0, 49)]);
            }
        }, [aiRecommendations]),
        dismissAiRecommendation: useCallback((recId) => {
            setAiRecommendations(prev => prev.map(r => r.id === recId ? { ...r, status: 'dismissed' } : r));
        }, []),

        // ── [v16 NEW] 채널별 상품 가격 매핑
        channelProductPrices,
        updateChannelProductPrice: useCallback((sku, channelId, newPrice) => {
            setChannelProductPrices(prev => ({
                ...prev,
                [sku]: { ...(prev[sku] || {}), [channelId]: Number(newPrice) }
            }));
            setAlerts(prev => [{ id: mkId('AL'), type: 'info', msg: `💲 [${sku}] ${channelId} 채널 가격 → ₩${Number(newPrice).toLocaleString()}`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }, []),

        // ── [v16 NEW] 상품 일괄등록
        bulkRegisterProducts: useCallback((products) => {
            if (!Array.isArray(products) || products.length === 0) return;
            setInventory(prev => {
                const newItems = products.filter(p => !prev.find(i => i.sku === p.sku)).map(p => ({
                    sku: p.sku, name: p.name, price: Number(p.price || 0), cost: Number(p.cost || 0),
                    category: p.category || 'general', brand: p.brand || '',
                    safeQty: p.safeQty || 30, status: 'active',
                    stock: { W001: Number(p.stockW001 || 50), W002: Number(p.stockW002 || 30), W003: Number(p.stockW003 || 20) },
                    channels: p.channels || [], image: p.image || '📦',
                }));
                return [...prev, ...newItems];
            });
            // 채널별 가격도 자동 생성
            products.forEach(p => {
                if (p.channels?.length) {
                    const prices = {};
                    p.channels.forEach(ch => { prices[ch] = Number(p.price || 0); });
                    setChannelProductPrices(prev => ({ ...prev, [p.sku]: { ...(prev[p.sku] || {}), ...prices } }));
                }
            });
            setAlerts(prev => [{ id: mkId('AL'), type: 'success', msg: `📦 상품 일괄등록 완료: ${products.length}건 등록됨`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }, []),

        // ── [v16 NEW] 가격 일괄수정
        bulkUpdatePrices: useCallback((updates) => {
            // updates: [{ sku, price?, cost?, channelPrices?: { channelId: price } }]
            if (!Array.isArray(updates) || updates.length === 0) return;
            setInventory(prev => prev.map(item => {
                const u = updates.find(u => u.sku === item.sku);
                if (!u) return item;
                return { ...item, ...(u.price != null ? { price: Number(u.price) } : {}), ...(u.cost != null ? { cost: Number(u.cost) } : {}) };
            }));
            // 채널별 가격도 업데이트
            updates.forEach(u => {
                if (u.channelPrices) {
                    setChannelProductPrices(prev => ({ ...prev, [u.sku]: { ...(prev[u.sku] || {}), ...u.channelPrices } }));
                }
            });
            setAlerts(prev => [{ id: mkId('AL'), type: 'success', msg: `💰 가격 일괄수정 완료: ${updates.length}건 반영됨`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }, []),

        // ── [v16 NEW] 채널별 상품 선택 등록/해제
        assignProductsToChannel: useCallback((channelId, skuList) => {
            setInventory(prev => prev.map(item => {
                if (!skuList.includes(item.sku)) return item;
                const channels = item.channels || [];
                if (!channels.includes(channelId)) return { ...item, channels: [...channels, channelId] };
                return item;
            }));
            // connectedChannels 상품수 업데이트
            setConnectedChannels(prev => prev.map(ch => {
                if (ch.id !== channelId) return ch;
                return { ...ch, productCount: (ch.productCount || 0) + skuList.length };
            }));
            setAlerts(prev => [{ id: mkId('AL'), type: 'success', msg: `🔗 [${channelId}] 채널에 ${skuList.length}개 상품 등록됨`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }, []),
        removeProductsFromChannel: useCallback((channelId, skuList) => {
            setInventory(prev => prev.map(item => {
                if (!skuList.includes(item.sku)) return item;
                return { ...item, channels: (item.channels || []).filter(ch => ch !== channelId) };
            }));
            setConnectedChannels(prev => prev.map(ch => {
                if (ch.id !== channelId) return ch;
                return { ...ch, productCount: Math.max(0, (ch.productCount || 0) - skuList.length) };
            }));
            setAlerts(prev => [{ id: mkId('AL'), type: 'info', msg: `🔗 [${channelId}] 채널에서 ${skuList.length}개 상품 해제됨`, time: '방금', read: false }, ...prev.slice(0, 49)]);
        }, []),


        // ── [v2]  Mock Data
        AdCampaigns: AdCamps,
        DailyTrends: drJartDailyTrends,
        Budget: drJartBudget,
        Channels: drJartChannels,
        addAdCampaign: (c) => setAdCamps(p => [c, ...p]),
        setGlobalKpi: () => {},
        setAdBudget: () => {},
        
        getCatalogChannelPrice,
    };

    return (
        <GlobalDataContext.Provider value={value}>
            {children}
        </GlobalDataContext.Provider>
    );
}

export function useGlobalData() {
    const ctx = useContext(GlobalDataContext);
    if (!ctx) throw new Error('useGlobalData must be used within GlobalDataProvider');
    return ctx;
}
