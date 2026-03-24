// GlobalDataContext.jsx — v9 (커머스·물류 크로스 동기화 통합)
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ 데이터 흐름:                                                              │
// │  재고 ←→ WmsManager ←→ OmniChannel ←→ Orders                              │
// │  Orders → 정산(Channel수수료/Ad Spend 차감) → P&L                                 │
// │  Ad Spend(BudgetPlanner) → P&L.adSpend → 영업이익                           │
// │  정산데이터(Reconciliation/KrChannel) → P&L.settlement                    │
// │  All → Dashboard KPI / Alerts                                            │
// └─────────────────────────────────────────────────────────────────────────┘
import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';

const GlobalDataContext = createContext(null);

/* ════════════════════════════════════════════════
   초기 공유 데이터
════════════════════════════════════════════════ */

// 📦 재고 (WmsManager ↔ OmniChannel ↔ PnL ↔ Dashboard)
const INIT_INVENTORY = [
    { sku: 'EP-PRX-001', name: '무선 이어폰 Pro X', stock: { W001: 142, W002: 88, W003: 34 }, safeQty: 50, cost: 45000, price: 89000 },
    { sku: 'SW-SE-002', name: '스마트 워치 SE', stock: { W001: 56, W002: 0, W003: 22 }, safeQty: 20, cost: 95000, price: 189000 },
    { sku: 'UH-7C-003', name: 'USB-C 허브 7in1', stock: { W001: 320, W002: 145, W003: 0 }, safeQty: 30, cost: 25000, price: 49000 },
    { sku: 'TP-MF-004', name: '메모리폼 여행용 목베개', stock: { W001: 0, W002: 210, W003: 88 }, safeQty: 30, cost: 12000, price: 29000 },
    { sku: 'CL-LED-005', name: '캠핑 LED 랜턴 USB', stock: { W001: 88, W002: 34, W003: 12 }, safeQty: 30, cost: 18000, price: 38000 },
];

// 📋 Orders (OmniChannel → 재고차감 → 정산 → P&L)
const INIT_ORDERS = [
    { id: 'ORD-001', ch: 'coupang', sku: 'EP-PRX-001', name: '무선 이어폰 Pro X', buyer: '김철수', qty: 2, price: 89000, total: 178000, status: '배송중', wh: 'W001', at: '2026-03-09 10:22', fee: 8900, platformFeeRate: 0.05, adFee: 3560 },
    { id: 'ORD-002', ch: 'naver', sku: 'SW-SE-002', name: '스마트 워치 SE', buyer: '이영희', qty: 1, price: 189000, total: 189000, status: '발주Confirm', wh: 'W001', at: '2026-03-09 11:05', fee: 10395, platformFeeRate: 0.055, adFee: 5670 },
    { id: 'ORD-003', ch: 'amazon', sku: 'UH-7C-003', name: 'USB-C 허브 7in1', buyer: 'John S', qty: 3, price: 49000, total: 147000, status: '배송Done', wh: 'W002', at: '2026-03-09 03:18', fee: 21315, platformFeeRate: 0.145, adFee: 2940 },
    { id: 'ORD-004', ch: 'shopify', sku: 'CL-LED-005', name: '캠핑 LED 랜턴 USB', buyer: '田中花', qty: 1, price: 38000, total: 38000, status: 'Cancel요청', wh: 'W003', at: '2026-03-09 14:44', fee: 0, platformFeeRate: 0, adFee: 0 },
    { id: 'ORD-005', ch: 'gmarket', sku: 'EP-PRX-001', name: '무선 이어폰 Pro X', buyer: '박민준', qty: 1, price: 89000, total: 89000, status: '출고대기', wh: 'W001', at: '2026-03-09 09:50', fee: 8010, platformFeeRate: 0.09, adFee: 2670 },
    { id: 'ORD-006', ch: 'welfare', sku: 'CL-LED-005', name: '캠핑 LED 랜턴 USB', buyer: '홍길동', qty: 5, price: 38000, total: 190000, status: '배송중', wh: 'W002', at: '2026-03-09 08:30', fee: 0, platformFeeRate: 0, adFee: 0 },
];

// 💰 Channel 광고Budget (BudgetPlanner ↔ CampaignManager ↔ P&L)
const INIT_CHANNEL_BUDGETS = {
    meta: { name: 'Meta Ads', icon: '📘', color: '#1877f2', budget: 18000000, spent: 11200000, roas: 4.21, targetRoas: 4.2, revenue: 47152000 },
    google: { name: 'Google', icon: '🔍', color: '#34A853', budget: 15000000, spent: 9800000, roas: 3.8, targetRoas: 4.0, revenue: 37240000 },
    tiktok: { name: 'TikTok', icon: '🎵', color: '#EE1D52', budget: 12000000, spent: 7400000, roas: 3.18, targetRoas: 3.5, revenue: 23532000 },
    naver: { name: 'Naver', icon: '🟩', color: '#03c75a', budget: 9000000, spent: 6700000, roas: 4.9, targetRoas: 4.5, revenue: 32830000 },
    coupang: { name: 'Coupang', icon: '🛒', color: '#ef4444', budget: 6000000, spent: 4800000, roas: 5.2, targetRoas: 5.0, revenue: 24960000 },
    kakao: { name: 'Kakao', icon: '💛', color: '#fee500', budget: 5000000, spent: 3100000, roas: 3.4, targetRoas: 3.5, revenue: 10540000 },
};

// 📊 Channel별 정산 데이터 (Reconciliation/KrChannel → P&L 반영)
// 정산금액 = Revenue - 플랫폼수수료 - 쿠폰할인 - 반품처리비
const INIT_SETTLEMENT = [
    { channel: 'coupang', period: '2026-03', grossSales: 280800000, platformFee: 30688000, adFee: 28080000, couponDiscount: 8424000, returnFee: 5600000, netPayout: 208008000, orders: 2340, returns: 94, status: 'settled' },
    { channel: 'naver', period: '2026-03', grossSales: 145200000, platformFee: 7986000, adFee: 14520000, couponDiscount: 14520000, returnFee: 2900000, netPayout: 105274000, orders: 1210, returns: 145, status: 'settled' },
    { channel: 'gmarket', period: '2026-03', grossSales: 56000000, platformFee: 5600000, adFee: 5040000, couponDiscount: 5600000, returnFee: 1400000, netPayout: 38360000, orders: 560, returns: 112, status: 'pending' },
    { channel: 'amazon', period: '2026-03', grossSales: 89000000, platformFee: 8900000, adFee: 14200000, couponDiscount: 0, returnFee: 8900000, netPayout: 57000000, orders: 890, returns: 178, status: 'settled' },
    { channel: '11st', period: '2026-03', grossSales: 42000000, platformFee: 4620000, adFee: 3360000, couponDiscount: 2100000, returnFee: 2100000, netPayout: 29820000, orders: 420, returns: 84, status: 'pending' },
];

// 📥 입출고 이력
const INIT_INOUT = [
    { id: 'IO001', type: '입고', sku: 'EP-PRX-001', name: '무선 이어폰 Pro X', qty: 200, wh: 'W001', at: '2026-03-09 09:00', by: '구매팀' },
    { id: 'IO002', type: '출고', sku: 'UH-7C-003', name: 'USB-C 허브 7in1', qty: 30, wh: 'W001', at: '2026-03-09 10:30', by: '자동' },
    { id: 'IO003', type: '반품', sku: 'SW-SE-002', name: '스마트 워치 SE', qty: 2, wh: 'W001', at: '2026-03-09 14:20', by: 'CS팀' },
];

// 🔮 디지털 셀프 SoS 공유 데이터 (DigitalShelf → PriceOpt Integration)
const INIT_DIGITAL_SHELF = {
    bysku: {}, // { 'EP-PRX-001': { sos: 18.4, topRank: 3, competitorPrice: 82000, keyword: '무선이어폰' } }
    keywords: [],
    lastUpdated: null,
};

// 📋 공급 발주(PO) 목록 (DemandForecast → WMS 자동발주)
const INIT_SUPPLY_ORDERS = [
    { id: 'PO-001', sku: 'EP-PRX-001', name: '무선 이어폰 Pro X', qty: 300, supplier: '(주)테크서플라이', orderDate: '2026-03-10', eta: '2026-03-17', status: 'in_transit', unitCost: 45000, total: 13500000 },
    { id: 'PO-002', sku: 'SW-SE-002', name: '스마트 워치 SE', qty: 150, supplier: 'SmartTech Co.', orderDate: '2026-03-12', eta: '2026-03-20', status: 'confirmed', unitCost: 95000, total: 14250000 },
];

// 📊 캠페인-Orders 연결 맵 (CampaignManager → OrderHub ROAS)
const INIT_CAMPAIGN_ORDER_MAP = {}; // { campaignId: [orderId, ...] }

// 🚨 Notification
const INIT_ALERTS = [
    { id: 'a1', type: 'warn', msg: 'TikTok Budget 92% 소진 — 잔여 ₩800만', time: '22분 전', channel: 'tiktok', read: false },
    { id: 'a2', type: 'info', msg: 'Meta ROAS 4.21x 달성 (목표 4.2x)', time: '8분 전', channel: 'meta', read: false },
    { id: 'a3', type: 'success', msg: 'Coupang 정산 Done — 순지급 ₩208,008,000', time: '15분 전', channel: 'coupang', read: true },
    { id: 'a4', type: 'warn', msg: '스마트 워치 SE 재고 부족 (78개 < 안전재고 20개)', time: '30분 전', read: false },
    { id: 'a5', type: 'info', msg: 'G마켓 정산 Pending — ₩38,360,000', time: '1시간 전', channel: 'gmarket', read: true },
];

// 하단 CRM 세그먼트 초기 데이터
const INIT_CRM_SEGMENTS = [
    { id: 'seg_vip', name: 'VIP 구매자', condition: 'ltv > 1000000', count: 12, color: '#f59e0b', autoEmail: true, autoKakao: true },
    { id: 'seg_repurchase', name: '재구매 유망', condition: 'orders >= 3 AND last_30d', count: 18, color: '#22c55e', autoEmail: true, autoKakao: false },
    { id: 'seg_churn', name: '이탈 위험', condition: 'last_purchase > 90d', count: 7, color: '#ef4444', autoEmail: true, autoKakao: true },
    { id: 'seg_new', name: '신규 가입', condition: 'created_at < 30d', count: 9, color: '#4f8ef7', autoEmail: false, autoKakao: false },
];

// 이메일 캐름페인 Integration 상태
const INIT_EMAIL_CAMPAIGNS_LINKED = [
    { id: 'ec_001', name: '3월 봄 시즘 프로모션', status: 'sent', targetSegmentId: null, sent: 4821, open_rate: 38.4, click_rate: 12.7, revenue: 4820000 },
    { id: 'ec_002', name: 'VIP 고객 감사 이메일', status: 'sent', targetSegmentId: 'seg_vip', sent: 312, open_rate: 64.1, click_rate: 28.3, revenue: 2150000 },
    { id: 'ec_003', name: '이탈 고객 재Active화', status: 'scheduled', targetSegmentId: 'seg_churn', sent: 0, open_rate: 0, click_rate: 0, revenue: 0 },
];

// Kakao 캐름페인 Integration 상태
const INIT_KAKAO_CAMPAIGNS_LINKED = [
    { id: 'kc_001', name: 'Orders Done Notification톡', type: 'transactional', status: 'active', targetSegmentId: null, sent: 12483, open_rate: 91.2, click_rate: 34.7 },
    { id: 'kc_002', name: '배송 출발 안내', type: 'transactional', status: 'active', targetSegmentId: null, sent: 9201, open_rate: 88.4, click_rate: 22.1 },
    { id: 'kc_003', name: 'VIP 전용 특가 Notification', type: 'marketing', status: 'scheduled', targetSegmentId: 'seg_vip', sent: 0, open_rate: 0, click_rate: 0 },
];

// 💳 결제 카드 (Ad Spend 자동집행용)
const INIT_PAYMENT_CARDS = [];

/* ════════════════════════════════════════════════
   실제 Provider Provider 시작
════════════════════════════════════════════════ */
export function GlobalDataProvider({ children }) {
    /* ── 핵심 공유 상태 ─────────────────────────── */
    const [inventory, setInventory] = useState(INIT_INVENTORY);
    const [orders, setOrders] = useState(INIT_ORDERS);
    const [inOutHistory, setInOutHistory] = useState(INIT_INOUT);
    const [channelBudgets, setChannelBudgets] = useState(INIT_CHANNEL_BUDGETS);
    const [settlement, setSettlement] = useState(INIT_SETTLEMENT);
    const [sharedCampaigns, setSharedCampaigns] = useState([]);
    const [alerts, setAlerts] = useState(INIT_ALERTS);
    const [dateRange, setDateRange] = useState({ from: null, to: null, label: 'This Month' });

    // 판매데이터 v4: CRM 새그먼트 / 이메일 캐다 / Kakao 캐다 (Global Integration)
    const [crmSegments, setCrmSegments] = useState(INIT_CRM_SEGMENTS);
    const [crmCustomerHistory, setCrmCustomerHistory] = useState({}); // { email: [{orderId, items, at}] }
    const [emailCampaignsLinked, setEmailCampaignsLinked] = useState(INIT_EMAIL_CAMPAIGNS_LINKED);
    const [kakaoCampaignsLinked, setKakaoCampaignsLinked] = useState(INIT_KAKAO_CAMPAIGNS_LINKED);
    const [journeyTriggers, setJourneyTriggers] = useState([]); // Journey Builder 트리거 로그

    // [v5 NEW] AI 예측 Integration 상태 (AIPrediction ↔ CRM ↔ Email ↔ Kakao ↔ WebPopup)
    const [aiPredictions, setAiPredictions] = useState([]); // 고객별 AI 예측 결과
    const [aiModelMetrics, setAiModelMetrics] = useState(null); // ML 모델 성능
    const [webPopupCampaigns, setWebPopupCampaigns] = useState([]); // 웹팝업 캠페인 (WebPopup ↔ CRM Integration)

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

    // ── [A-3 NEW] 백엔드 재고 Integration: 앱 초기 로드 시 실서버에서 재고 pull ──
    // 토큰 있는 유료 User 전용; 데모는 INIT_INVENTORY 그대로 사용
    useEffect(() => {
        const token = localStorage.getItem('g_token');
        if (!token) return; // 데모/미로그인 시 스킵
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

    /** 재고를 백엔드에 Save (유료 User 수동 조정 후 호출) */
    const syncInventoryToBackend = useCallback((inventoryList) => {
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
        setOrders(prev => [order, ...prev]);
        registerInOut({ type: '출고', sku, qty: numQty, whId: wh, name, by: `${ch} Orders` });
        // [v4] Orders → CRM 구매이력 자동 갱신
        setCrmCustomerHistory(prev => {
            const key = buyer || ch;
            const hist = prev[key] || [];
            return { ...prev, [key]: [{ orderId: order.id, sku, name, qty: numQty, total: numQty * numPrice, ch, at: order.at }, ...hist.slice(0, 49)] };
        });
        setAlerts(prev => [
            { id: mkId('AL'), type: 'success', msg: `🛒 [${ch}] 새 Orders: ${name} x${numQty} — ₩${(numQty * numPrice).toLocaleString()}`, time: '방금', read: false },
            ...prev.slice(0, 49)
        ]);
        return order;
    }, [registerInOut]);

    const updateOrderStatus = useCallback((id, newStatus) => {
        const statusVal = typeof newStatus === 'string' ? newStatus : newStatus?.status || newStatus;
        // ── 상태 변경 전 현재 Orders 정보 캡처 ─────────────────────────────
        let capturedOrder = null;
        setOrders(prev => {
            capturedOrder = prev.find(o => o.id === id) || null;
            return prev.map(o => {
                if (o.id !== id) return o;
                const carrier = typeof newStatus === 'object' ? newStatus.carrier : o.carrier;
                return { ...o, status: statusVal, ...(carrier ? { carrier } : {}) };
            });
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
            const idx = prev.findIndex(s => s.channel === channel && s.period === data.period);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...data };
                return updated;
            }
            return [{ channel, ...data, id: mkId('STL') }, ...prev];
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
            recId: rec.id,
            title: rec.title,
            type: rec.type,
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
        const activeOrders = orders.filter(o => o.status !== 'CancelDone' && o.status !== 'Cancel요청');
        const totalFees = activeOrders.reduce((s, o) => s + (o.fee || 0), 0);
        const totalPlatformFees = activeOrders.reduce((s, o) => s + (o.total * (o.platformFeeRate || 0)), 0);
        const count = activeOrders.length;
        return {
            count,
            totalOrders: count,            // ✅ 별칭 Add — 컴포넌트 호환용
            revenue: activeOrders.reduce((s, o) => s + o.total, 0),
            totalFees,
            totalPlatformFees,
            pending: orders.filter(o => o.status === '발주Confirm').length,
            shipping: orders.filter(o => o.status === '출고대기' || o.status === '배송중').length,
            done: orders.filter(o => o.status === '배송Done').length,
            cancelled: orders.filter(o => o.status === 'Cancel요청' || o.status === 'CancelDone').length,
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
       Context Value
    ════════════════════════════════════════════════ */
    const value = {
        // ── 재고
        inventory, setInventory,
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
        addCampaign, updateCampaignStatus,

        // ── [v4] CRM ↔ 이메일 ↔ Kakao ↔ Journey Integration
        crmSegments, setCrmSegments, updateCrmSegment,
        crmCustomerHistory,
        recordPurchaseToCRM,
        emailCampaignsLinked, updateEmailCampaign,
        createEmailCampaignFromSegment,
        kakaoCampaignsLinked, updateKakaoCampaign,
        createKakaoCampaignFromSegment,
        journeyTriggers, triggerJourneyAction,

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
