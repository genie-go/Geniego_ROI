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
import {
  DEMO_INVENTORY, DEMO_ORDERS, DEMO_INOUT, DEMO_BUDGETS,
  DEMO_SETTLEMENT, DEMO_CAMPAIGNS, DEMO_CRM_SEGMENTS,
  DEMO_POPUPS, DEMO_ALERTS, DEMO_EMAIL_CAMPAIGNS,
  DEMO_KAKAO_CAMPAIGNS, DEMO_CONNECTED_CHANNELS, DEMO_CHANNELS,
  DEMO_SNS_CAMPAIGNS, DEMO_AI_RECOMMENDATIONS, DEMO_CHANNEL_PRICES,
  DEMO_DAILY_TRENDS, DEMO_PRODUCTS, DEMO_CRM_CUSTOMER_HISTORY,
  DEMO_CREATORS, DEMO_UGC_REVIEWS, DEMO_CHANNEL_STATS, DEMO_NEG_KEYWORDS,
  DEMO_KAKAO_CAMPAIGNS_EXTRA,
} from '../data/demoSeedData.js';

const GlobalDataContext = createContext(null);

/* ════════════════════════════════════════════════
   🎪 Demo Mode Detection & localStorage Persistence
════════════════════════════════════════════════ */
const _isDemo = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.includes('roidemo') || host.includes('demo') || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true');
  } catch { return false; }
})();

const DEMO_LS_PREFIX = 'geniego_demo_';
const DEMO_SEED_VERSION = 'v17.0';  // ★ v17: 인플루언서/UGC/채널통계/부정키워드 시드 추가

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

function broadcastUpdate(type, payload) {
    try {
        if (_broadcastChannel) {
            _broadcastChannel.postMessage({ type, payload, ts: Date.now() });
        } else {
            // Fallback: use localStorage events for cross-tab sync
            localStorage.setItem('__geniego_sync__', JSON.stringify({ type, payload, ts: Date.now() }));
            localStorage.removeItem('__geniego_sync__');
        }
    } catch { /* ignore broadcast errors */ }
}

/* ════════════════════════════════════════════════
   초기 공유 데이터 (데모 모드: 시드 데이터 / 운영 모드: 빈 배열)
════════════════════════════════════════════════ */

// 📦 재고 (WmsManager ↔ OmniChannel ↔ PnL ↔ Dashboard)
const INIT_INVENTORY = loadDemoState('inventory', DEMO_INVENTORY);

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

// Kakao 캐름페인 Integration 상태
const INIT_KAKAO_CAMPAIGNS_LINKED = loadDemoState('kakao_campaigns', DEMO_KAKAO_CAMPAIGNS);

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
    const [orders, setOrders] = useState(INIT_ORDERS);
    const [inOutHistory, setInOutHistory] = useState(INIT_INOUT);
    const [channelBudgets, setChannelBudgets] = useState(INIT_CHANNEL_BUDGETS);
    const [settlement, setSettlement] = useState(INIT_SETTLEMENT);
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
    const [claimHistory, setClaimHistory] = useState([]);             // 클레임/반품 이력
    const [digitalShelfData, setDigitalShelfData] = useState({});     // DigitalShelf SoS 데이터
    const [campaignOrderMap, setCampaignOrderMap] = useState({});     // 캠페인 ID → Orders 매핑
    const [orderMemos, setOrderMemos] = useState({});                 // Orders별 메모
    const [slaViolations, setSlaViolations] = useState([]);           // SLA 위반 이력
    const [supplyOrders, setSupplyOrders] = useState([]);             // 자동 발주 목록
    const [lotManagement, setLotManagement] = useState([]);           // Lot/유통기한 관리
    const [priceCalendar, setPriceCalendar] = useState([]);           // 프로모션 가격 캘린더
    const [asiaLogisticsData, setAsiaLogisticsData] = useState({});   // 아시아 물류 허브 데이터
    const [sharedCalendarEvents, setSharedCalendarEvents] = useState([]); // 콘텐츠 캘린더 이벤트
    const [connectedChannels, setConnectedChannels] = useState(loadDemoState('connected_channels', DEMO_CONNECTED_CHANNELS));  // 연동 채널 목록

    // 🤝 [v13 NEW] 인플루언서 크리에이터 통합 상태
    const [creators, setCreators] = useState(INIT_CREATORS);
    const [ugcReviews, setUgcReviews] = useState(INIT_UGC_REVIEWS);
    const [channelStats, setChannelStats] = useState(INIT_CHANNEL_STATS);
    const [negKeywords, setNegKeywords] = useState(INIT_NEG_KEYWORDS);

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
            const saved = localStorage.getItem('geniego_catalog_channel_prices');
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

    // ── [A-3 NEW] 백엔드 재고 Integration: 앱 초기 로드 시 실서버에서 재고 pull ──
    // 토큰 있는 유료 User 전용; 데모는 시드 데이터 사용 (API 스킵)
    useEffect(() => {
        if (_isDemo) return; // ★ 데모 모드: 시드 데이터 유지, API 스킵
        const token = localStorage.getItem('g_token');
        if (!token) return;
        const BASE = import.meta.env.VITE_API_BASE || '';
        fetch(`${BASE}/api/channel-sync/inventory`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setInventory(data);
                }
            })
            .catch(() => { /* Error 시 INIT_INVENTORY 유지 */ });
    }, []); // 한 번만 Run

    // ── [DEMO v15] 데모 모드: 시드 데이터가 풍부하므로 Rollup API는 완전 삭제 처리 (운영 환경 오염 방지) ──

    /* ── 🔄 BroadcastChannel Cross-Tab Listener ─────────────────── */
    useEffect(() => {
        const handleSync = (msg) => {
            const { type, payload } = msg?.data || msg;
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

    /** 재고를 백엔드에 Save (유료 User 수동 조정 후 호출) */
    const syncInventoryToBackend = useCallback((inventoryList) => {
        if (_isDemo) return; // 절대 가상 데이터가 서버로 쓰여지지 않도록 강력 방어
        const token = localStorage.getItem('g_token');
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
            try { localStorage.setItem('geniego_catalog_channel_prices', JSON.stringify(updated)); } catch { /* ignore */ }
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
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `📂 카탈로그 동기화: [${name}] inventory Integration Done`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
    }, []);

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
        return order;
    }, [registerInOut]);

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
    }, [registerInOut]);

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

    /** 캠페인 → Orders 연결 (ROAS 자동 산출용) */
    const linkOrderToCampaign = useCallback((campaignId, orderId) => {
        setCampaignOrderMap(prev => ({
            ...prev,
            [campaignId]: [...(prev[campaignId] || []), orderId],
        }));
    }, []);

    /** 캠페인별 ROAS 자동 계산 */
    const getCampaignRoas = useCallback((campaignId) => {
        const orderIds = campaignOrderMap[campaignId] || [];
        const revenue = orders
            .filter(o => orderIds.includes(o.id))
            .reduce((s, o) => s + o.total, 0);
        const camp = channelBudgets;
        const spend = Object.values(camp).find(c => c.campaignId === campaignId)?.spent || 0;
        return { revenue, spend, roas: spend > 0 ? (revenue / spend).toFixed(2) : '—' };
    }, [campaignOrderMap, orders, channelBudgets]);

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
    }, []);

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
        const activeOrders = orders.filter(o => o.status !== 'CancelDone' && o.status !== 'Cancel요청' && o.status !== 'cancelled');
        const totalFees = activeOrders.reduce((s, o) => s + (o.fee || 0), 0);
        const totalPlatformFees = activeOrders.reduce((s, o) => s + (o.total * (o.platformFeeRate || 0)), 0);
        const count = activeOrders.length;
        return {
            count,
            totalOrders: count,            // ✅ 별칭 Add — 컴포넌트 호환용
            revenue: activeOrders.reduce((s, o) => s + o.total, 0),
            totalFees,
            totalPlatformFees,
            pending: orders.filter(o => o.status === '발주Confirm' || o.status === 'paid').length,
            shipping: orders.filter(o => ['출고대기','배송중','preparing','shipping'].includes(o.status)).length,
            done: orders.filter(o => ['배송Done','delivered','confirmed','Done'].includes(o.status)).length,
            cancelled: orders.filter(o => ['Cancel요청','CancelDone','cancelled'].includes(o.status)).length,
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
    }, [orders]);

    // 💰 Budget/Ad Spend 집계
    const budgetStats = useMemo(() => {
        const list = Object.values(channelBudgets);
        const totalAdRevenue = list.reduce((s, c) => s + (c.revenue || c.spent * c.roas), 0);
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
        const settled = settlement.filter(s => s.status === 'settled');
        const pending = settlement.filter(s => s.status === 'pending');
        return {
            totalGross: settlement.reduce((s, r) => s + (r.grossSales || 0), 0),
            totalNetPayout: settlement.reduce((s, r) => s + (r.netPayout || 0), 0),
            totalPlatformFee: settlement.reduce((s, r) => s + (r.platformFee || 0), 0),
            totalAdFee: settlement.reduce((s, r) => s + (r.adFee || 0), 0),
            totalCouponDiscount: settlement.reduce((s, r) => s + (r.couponDiscount || 0), 0),
            totalReturnFee: settlement.reduce((s, r) => s + (r.returnFee || 0), 0),
            settledAmount: settled.reduce((s, r) => s + (r.netPayout || 0), 0),
            pendingAmount: pending.reduce((s, r) => s + (r.netPayout || 0), 0),
            totalOrders: settlement.reduce((s, r) => s + (r.orders || 0), 0),
            totalReturns: settlement.reduce((s, r) => s + (r.returns || 0), 0),
            returnRate: settlement.reduce((s, r) => s + (r.orders || 0), 0) > 0
                ? settlement.reduce((s, r) => s + (r.returns || 0), 0) / settlement.reduce((s, r) => s + (r.orders || 0), 0)
                : 0,
            channels: settlement,
        };
    }, [settlement]);

    // 📊 통합 P&L (Orders+Ad Spend+정산+재고원가 자동집계) ✅ 모든 데이터 소스 통합
    const pnlStats = useMemo(() => {
        const activeOrders = orders.filter(o => o.status !== 'CancelDone' && o.status !== 'Cancel요청');

        // Revenue: Orders 기반 (정산 데이터가 있으면 정산 기준 우선)
        const orderRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
        const settlementRevenue = settlementStats.totalGross;
        const revenue = settlementRevenue > 0 ? settlementRevenue : orderRevenue;

        // Revenue원가 (COGS): Orders된 SKU 원가 × 수량
        const cogs = activeOrders.reduce((s, o) => {
            const item = inventory.find(i => i.sku === o.sku);
            return s + (item ? item.cost * o.qty : 0);
        }, 0);

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

        // 정산 순지급액 (실제 받은 금액)
        const netPayout = settlementStats.totalNetPayout;

        // 손익 계산
        const grossProfit = revenue - cogs;                              // Revenue총이익 = Revenue - 원가
        const operatingProfit = grossProfit - adSpend - platformFee - couponDiscount - returnFee; // 영업이익
        const netProfit = netPayout > 0
            ? netPayout - cogs - adSpend                                // 정산 기준 순이익
            : operatingProfit;

        return {
            revenue, cogs, grossProfit,
            adSpend, platformFee, couponDiscount, returnFee,
            operatingProfit, netProfit, netPayout,
            margin: revenue > 0 ? (operatingProfit / revenue * 100).toFixed(1) : '0',
            netMargin: revenue > 0 ? (netProfit / revenue * 100).toFixed(1) : '0',
            roas: adSpend > 0 ? budgetStats.blendedRoas : 0,
        };
    }, [orders, inventory, budgetStats, settlementStats, orderStats]);

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
        kakaoCampaignsLinked, updateKakaoCampaign,
        createKakaoCampaignFromSegment,
        journeyTriggers, triggerJourneyAction,

        // ── [v12 NEW] 이메일 템플릿 · 설정 동기화
        emailTemplates, updateEmailTemplates,
        emailSettings, updateEmailSettings,

        // ── [v5 NEW] AI 예측 ↔ 전Channel Integration
        aiPredictions, aiModelMetrics, updateAIPredictions,
        triggerAIAutoAction,
        webPopupCampaigns, updateWebPopupStats,

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
        claimHistory, registerClaimReturn, orderMemos, setOrderMemo, slaViolations,
        pickingLists, packingSlips,
        digitalShelfData, campaignOrderMap,

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
