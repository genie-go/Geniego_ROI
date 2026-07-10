import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { tGet, tSet, tRemove, tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리
import { IS_DEMO } from '../utils/demoEnv'; // [259차] 하드코딩 파생재고(예약/안전) 운영 미노출 게이트
import { useGlobalData } from '../context/GlobalDataContext';
import { useConnectorSync } from '../context/ConnectorSyncContext';
import { useI18n } from '../i18n/index.js';
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import { CHANNEL_RATES, calcRecommendedPrice as calcRecPrice } from '../constants/channelRates.js';
import { postJson, getJsonAuth } from '../services/apiClient.js'; // 192차: 상품 writeback/bulk-price 실배선 · [277차] 등록상품 로드
import { loadWorkspace, saveWorkspace, wsEnabled } from '../services/workspaceState.js'; // [266차] 보조 설정탭 운영 영속

/* ── Enterprise Dynamic Locale Map (module-scope, shared) ─────── */
const LANG_LOCALE_MAP = {
    ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', 'zh-TW': 'zh-TW',
    de: 'de-DE', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ru: 'ru-RU',
    ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN', id: 'id-ID'
};

/* ── 모바일 감지 훅 ────────────────────────────── */
function useIsMobile(bp = 768) {
    const [m, setM] = useState(() => window.innerWidth <= bp);
    useEffect(() => {
        const h = () => setM(window.innerWidth <= bp);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [bp]);
    return m;
}

/* ═══ Enterprise Security Guard — XSS/Injection 실시간 차단 ═══ */
function useCatalogSecurity() {
    const { addAlert, isDemo } = useGlobalData();
    const { lang } = useI18n();
    const threatCountRef = useRef(0);
    const [secBanner, setSecBanner] = useState(null);

    const sanitize = useCallback((input) => {
        if (typeof input !== 'string') return input;
        const XSS_PATTERNS = [/<script/i, /javascript:/i, /on\w+\s*=/i, /eval\(/i, /document\./i, /window\./i, /innerHTML/i, /<iframe/i, /<object/i, /data:text\/html/i];
        const SQL_PATTERNS = [/('\s*(OR|AND)\s*')/i, /(;\s*DROP|;\s*DELETE|;\s*UPDATE|;\s*INSERT)/i, /(UNION\s+SELECT)/i, /(--)\s/];
        const allPatterns = [...XSS_PATTERNS, ...SQL_PATTERNS];
        for (const p of allPatterns) {
            if (p.test(input)) {
                threatCountRef.current += 1;
                const threat = { type: p.source.includes('script') || p.source.includes('javascript') ? 'XSS' : 'SQL_INJECTION', input: input.slice(0, 80), at: new Date().toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR', { hour12: false }), count: threatCountRef.current };
                setSecBanner(threat);
                if (addAlert) addAlert({ type: 'error', msg: `🛡️ [CatalogSync] ${threat.type} 공격 차단! (${threatCountRef.current}회) — 입력: "${input.slice(0, 40)}…"` });
                setTimeout(() => setSecBanner(null), 8000);
                return input.replace(/[<>"'&;()]/g, '');
            }
        }
        return input.replace(/[<>"']/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
    }, [addAlert, lang]);

    return { sanitize, secBanner };
}

/* ─── Helper: URL vs Emoji image detection ───────────────────────────── */
const isImageUrl = (v) => typeof v === 'string' && (v.startsWith('http') || v.startsWith('data:') || v.startsWith('/'));

/* ─── Constants (기본 채널 목록 — ConnectorSync 미사용 시 폴백) ───────────── */
const DEFAULT_CHANNELS = [
    // ── Domestic Channel ────────────────────────────────────────────────────────────
    { id: "coupang", name: "Coupang Wing", icon: "🇰🇷", color: "#00bae5" },
    { id: "naver", name: "Naver Smart Store", icon: "🟢", color: "#03c75a" },
    { id: "11st", name: "11Street", icon: "🏬", color: "#ff0000" },
    { id: "gmarket", name: "Gmarket", icon: "🛍️", color: "#e83e0b" },
    { id: "kakao_commerce", name: "Kakao Commerce", icon: "🟡", color: "#ffd400" },
    { id: "cafe24", name: "Cafe24", icon: "🏪", color: "#0068ff" },
    { id: "wemakeprice", name: "WeMakePrice", icon: "🔵", color: "#2d5bff" },
    { id: "interpark", name: "Interpark", icon: "🟠", color: "#ff7400" },
    { id: "lotteon", name: "Lotte ON", icon: "🏢", color: "#e60012" },
    { id: "own_mall", name: "Own Mall", icon: "🏠", color: "#6366f1" },
    // ── Global Channel ──────────────────────────────────────────────────────────
    { id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48" },
    { id: "amazon", name: "Amazon SP-API", icon: "📦", color: "#ff9900" },
    { id: "tiktok", name: "TikTok Shop", icon: "🎵", color: "#ff0050" },
    { id: "rakuten", name: "Rakuten", icon: "🇯🇵", color: "#bf0000" },
    { id: "lazada", name: "Lazada", icon: "🌏", color: "#0f146b" },
    { id: "qoo10", name: "Qoo10", icon: "🟪", color: "#9b249f" },
    { id: "zalando", name: "Zalando", icon: "🇩🇪", color: "#ff6900" },
];

/* ─── Integration Hub 연동 채널 동적 구성 훅 ──────────────────────────────── */
/* 연동허브(API Keys)에서 새 채널 API 키를 등록하면:
 * 1) DEFAULT_CHANNELS에 있는 채널 → connected: true 로 표시
 * 2) DEFAULT_CHANNELS에 없는 신규 채널 → 자동 생성되어 목록에 추가
 * → 카탈로그 동기화의 모든 탭(히어로, 채널등록, 가격규칙 등)에 즉시 반영 */
const CHANNEL_META_FALLBACK = {
    meta_ads: { name: "Meta Ads", icon: "📘", color: "#1877f2" },
    google_ads: { name: "Google Ads", icon: "📊", color: "#4285f4" },
    tiktok_business: { name: "TikTok Business", icon: "🎵", color: "#ff0050" },
    amazon_spapi: { name: "Amazon SP-API", icon: "📦", color: "#ff9900" },
    amazon_ads: { name: "Amazon Ads", icon: "📢", color: "#ff9900" },
    naver_smartstore: { name: "Naver SmartStore", icon: "🟢", color: "#03c75a" },
    naver_sa: { name: "Naver Search Ads", icon: "🔍", color: "#03c75a" },
    kakao_moment: { name: "Kakao Moment", icon: "💬", color: "#ffd400" },
    st11: { name: "11st", icon: "🏬", color: "#ff0000" },
    instagram: { name: "Instagram", icon: "📸", color: "#e1306c" },
    youtube: { name: "YouTube", icon: "▶️", color: "#ff0000" },
    google_analytics: { name: "Google Analytics", icon: "📈", color: "#e37400" },
    slack: { name: "Slack", icon: "💬", color: "#4a154b" },
    line: { name: "LINE", icon: "💚", color: "#06c755" },
    wechat: { name: "WeChat Store", icon: "🟢", color: "#07c160" },
    ebay: { name: "eBay", icon: "🏷️", color: "#e53238" },
    etsy: { name: "Etsy", icon: "🧡", color: "#f1641e" },
    walmart: { name: "Walmart", icon: "🏪", color: "#0071dc" },
    twitter_ads: { name: "X (Twitter) Ads", icon: "🐦", color: "#1da1f2" },
};

/**
 * [277차] ★채널 키 별칭 — 연동돼 있는데 "미연동"으로 표시되던 근본원인.
 *   DEFAULT_CHANNELS 는 짧은 키(naver·amazon·11st)를 쓰는데 실제 커넥터/자격증명 키는
 *   긴 키(naver_smartstore·amazon_spapi·st11)다. isConnected(ch.id) 가 항상 false 였고,
 *   동시에 긴 키가 "신규 채널"로 자동추가돼 같은 채널이 두 장 뜨는 중복까지 발생했다.
 *   백엔드 ChannelSync::normConnKey 의 별칭 규약과 정합.
 */
const CHANNEL_KEY_ALIASES = {
    naver: ["naver", "naver_smartstore"],
    amazon: ["amazon", "amazon_spapi"],
    tiktok: ["tiktok", "tiktok_shop", "tiktok_business"],
    "11st": ["11st", "st11"],
    gmarket: ["gmarket", "esm"],
    lotteon: ["lotteon"],
    coupang: ["coupang"],
    cafe24: ["cafe24"],
    shopify: ["shopify"],
    rakuten: ["rakuten"],
    lazada: ["lazada"],
    qoo10: ["qoo10"],
};
/** 위 별칭 중 canonical 이 아닌 키들 — "신규 채널 자동추가"에서 제외해 중복 카드를 막는다. */
const ALIASED_NON_CANONICAL = new Set(
    Object.entries(CHANNEL_KEY_ALIASES).flatMap(([canon, keys]) => keys.filter(k => k !== canon))
);

function useDynamicChannels() {
    const { connectedChannels, isConnected } = useConnectorSync();
    return useMemo(() => {
        const existingIds = new Set(DEFAULT_CHANNELS.map(c => c.id));

        // 1) 기존 채널에 연결 상태 표시(별칭 키 중 하나라도 연결이면 연결로 본다)
        const existing = DEFAULT_CHANNELS.map(ch => ({
            ...ch,
            connected: (CHANNEL_KEY_ALIASES[ch.id] || [ch.id]).some(k => isConnected(k)),
        }));

        // 2) ConnectorSync에 등록되었으나 DEFAULT_CHANNELS에 없는 신규 채널 자동 추가
        const newChannels = Object.entries(connectedChannels)
            .filter(([id, info]) => !existingIds.has(id) && !ALIASED_NON_CANONICAL.has(id) && info.connected)
            .map(([id]) => {
                const meta = CHANNEL_META_FALLBACK[id] || {
                    name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    icon: "🔌",
                    color: "#6366f1",
                };
                return { id, ...meta, connected: true, autoAdded: true };
            });

        return [...existing, ...newChannels];
    }, [connectedChannels, isConnected]);
}

// CHANNELS는 모듈 레벨에서 기본값으로 사용 (helper 함수용)
const CHANNELS = DEFAULT_CHANNELS;

/* ─── CHANNEL_RATES & calcRecommendedPrice → '../constants/channelRates.js' 에서 import (중앙 단일소스) ─── */
const calcRecommendedPrice = calcRecPrice;

const CATEGORIES = [
    { id: "", labelKey: "cat_all" },
    { id: "electronics/audio", labelKey: "cat_electronics_audio" },
    { id: "electronics/input", labelKey: "cat_electronics_input" },
    { id: "electronics/peripherals", labelKey: "cat_electronics_peripherals" },
    { id: "electronics/camera", labelKey: "cat_electronics_camera" },
    { id: "electronics/charging", labelKey: "cat_electronics_charging" },
    { id: "fashion/clothing", labelKey: "cat_fashion_clothing" },
    { id: "fashion/accessories", labelKey: "cat_fashion_accessories" },
    { id: "beauty/skincare", labelKey: "cat_beauty_skincare" },
    { id: "beauty/makeup", labelKey: "cat_beauty_makeup" },
    { id: "food/health", labelKey: "cat_food_health" },
    { id: "living/kitchen", labelKey: "cat_living_kitchen" },
    { id: "sports/equipment", labelKey: "cat_sports_equipment" },
    { id: "books/stationery", labelKey: "cat_books_stationery" },
    { id: "toys/hobbies", labelKey: "cat_toys_hobbies" },
];

const SYNC_SCOPES = [
    { id: "catalog", labelKey: "tabCatalog", descKey: "heroDesc", icon: "📚" },
    { id: "options", labelKey: "optionsVariants", descKey: "totalSkuCombo", icon: "🎨" },
    { id: "inventory", labelKey: "colStock", descKey: "stockStatus", icon: "📦" },
    { id: "price", labelKey: "colSalePrice", descKey: "channelPrice", icon: "💰" },
    { id: "images", labelKey: "productImage", descKey: "uploadImage", icon: "🖼" },
];

/* ─── Product Data — Zero Mock: empty init, populated from API/user registration ── */
const PRODUCTS_INIT = [];

/* ─── Sync Jobs — Zero Mock ── */
const MOCK_JOBS_INIT = [];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const ch = id => CHANNELS.find(c => c.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };
const _krwFmt = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const fmtKRW = n => n == null ? "-" : _krwFmt.format(n);
const fmtNum = n => n == null ? "-" : Number(n).toLocaleString();
const statusColor = s => s === "ok" ? "#22c55e" : s === "warn" ? "#eab308" : "#ef4444";
/* statusLabel now requires t function */

/* ─── Unit Types & Helpers ───────────────────────────────────────────────────── */
const UNIT_TYPES = [
    { id: "ea", labelKey: "unitEa", descKey: "unitEaDesc", icon: "1개", color: "#22c55e" },
    { id: "box", labelKey: "unitBox", descKey: "unitBoxDesc", icon: "📦", color: "#4f8ef7" },
    { id: "pl", labelKey: "unitPl", descKey: "unitPlDesc", icon: "📦📦", color: "#f59e0b" },
];

function toEa(qty, prod) {
    if (prod.unitType === "box") return qty * (parseInt(prod.eaPerBox) || 1);
    if (prod.unitType === "pl") return qty * (parseInt(prod.boxPerPl) || 1) * (parseInt(prod.eaPerBox) || 1);
    return qty;
}

function fmtStock(qty, prod) {
    if (prod.unitType === "box") {
        const eaPerBox = parseInt(prod.eaPerBox) || 1;
        return `${qty}Box (${(qty * eaPerBox).toLocaleString()}ea)`;
    }
    if (prod.unitType === "pl") {
        const b = parseInt(prod.boxPerPl) || 1;
        const e = parseInt(prod.eaPerBox) || 1;
        return `${qty}PL (${(qty * b)}Box / ${(qty * b * e).toLocaleString()}ea)`;
    }
    return `${Number(qty).toLocaleString()}ea`;
}

/* ─── Empty form state ───────────────────────────────────────────────────────── */
const EMPTY_FORM = {
    name: "", sku: "", category: "", image: null, imagePreview: null,
    spec: "", unitType: "ea", eaPerBox: "", boxPerPl: "",
    price: "", comparePrice: "",
    purchaseCost: "", ioFee: "", storageFee: "", workFee: "", shippingFee: "",
    inventory: "",
};


/* ─── Product Register → PriceOpt redirect (통합 완료) ─────────────────────── */
function navigateToPriceOptProducts() {
    // 가격 최적화 > 상품 등록 탭으로 이동
    window.location.href = '/price-opt?tab=products';
}

/* ─── [REMOVED] ProductRegisterModal — 가격 최적화 메뉴로 통합 완료 ─── */

const ProgressBar = memo(function ProgressBar({ pct, color = "#4f8ef7", animated = false }) {
    return (
        <div style={{ height: 5, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
                width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 4,
                transition: "width 0.4s ease",
                backgroundImage: animated ? `repeating-linear-gradient(90deg,transparent,transparent 8px,rgba(255,255,255,0.15) 8px,rgba(255,255,255,0.15) 16px)` : "none",
                backgroundSize: "32px",
                animation: animated ? "stripe 0.8s linear infinite" : "none"
            }} />
        </div>
    );
});

/* ───  Banner — Removed (no mock/demo mode) ──────────────────────────── */

/* ─── BulkRegisterModal (Sale Price Recommend + Management자 Approval 포함) ─────────────────── */
const BulkRegisterModal = memo(function BulkRegisterModal({ selectedIds, products, onClose, onApply, is }) {
    const { t } = useI18n();
    const dynamicChannels = useDynamicChannels();
    // 스텝: 0=Channel+ActionSelect, 1=RecommendSale PriceSettings, 2=Approval+Register
    const [step, setStep] = useState(0);
    const [selChs, setSelChs] = useState(new Set());
    const [action, setAction] = useState("register");
    // Channelper Profit율 (Basic 30%) — Management자가 조정 가능
    const [margins, setMargins] = useState(() => {
        const init = {};
        dynamicChannels.forEach(c => { init[c.id] = 30; });
        return init;
    });
    // Channelper 커스텀 Sale Price (Recommend가 override 가능)
    const selChsArr = useMemo(() => [...selChs].filter(id => dynamicChannels.some(c => c.id === id)), [selChs, dynamicChannels]);
    const [customPrices, setCustomPrices] = useState({});
    const [approved, setApproved] = useState(false);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);

    const selProds = products.filter(p => selectedIds.has(p.id));
    const toggleCh = id => { const n = new Set(selChs); n.has(id) ? n.delete(id) : n.add(id); setSelChs(n); };

    // Product Cost Average (Select Product 기준)
    const avgCost = useMemo(() => {
        if (!selProds.length) return 0;
        const sum = selProds.reduce((s, p) => s + (p.productCost || p.purchaseCost || 0), 0);
        return Math.round(sum / selProds.length);
    }, [selProds]);

    // Channelper Recommend가 계산
    const recPrices = useMemo(() => {
        const res = {};
        selChsArr.forEach(chId => {
            const rec = calcRecommendedPrice(avgCost, chId, margins[chId] ?? 30);
            res[chId] = customPrices[chId] ?? rec;
        });
        return res;
    }, [selChsArr, avgCost, margins, customPrices]);

    const handleApply = async () => {
        if (!selChs.size) return;
        // [277차] ★재고/채널 유래 항목(_fallback)은 이미지·상세·고시·카테고리가 없어, 전송하면 채널에
        //   빈 상세·0원·엉뚱한 값으로 등록된다("일괄등록하니 이미지가 안 올라가고 정보가 엉뚱하다"의 원인).
        //   등록상품(po_products)만 전송한다.
        const sendable = selProds.filter(p => !p._fallback);
        if (!sendable.length) {
            alert(t('catalogSync.needRegistered', '전송하려면 상품등록에서 등록한 상품을 선택하세요 — 재고·채널에서 불러온 항목은 이미지·상세·고시정보가 없어 채널에 등록할 수 없습니다'));
            return;
        }
        setRunning(true);

        try {

            // ── 192차: 실 백엔드 writeback (/api/catalog/writeback/{ch}/{sku}) — 테넌트격리 영속 ──
            //   (구 /v382/writeback/.../execute 는 191차에 제거된 dead-route 404였음)
            const results = [];
            let hasError = false;

            // Product×Channel 조합마다 writeback Run
            for (const chId of selChs) {
                for (const prod of sendable) {
                    try {
                        // [277차] 상세HTML·이미지 동봉 — 종전엔 name/price/inventory/spec 만 보내
                        //   채널에 이미지 없는 빈 상세로 등록됐다. 등록상품(po_products) 유래 항목만 값이 있다.
                        const imgs = Array.isArray(prod.images) ? prod.images.filter(Boolean) : [];
                        const d = await postJson(`/api/catalog/writeback/${encodeURIComponent(chId)}/${encodeURIComponent(prod.sku)}`, {
                            price: recPrices[chId] ?? prod.price,
                            name: prod.name,
                            category: prod.category,
                            inventory: prod.inventory,
                            spec: prod.spec,
                            detail_html: prod.detailHtml || '',
                            image_url: (typeof prod.image === 'string' && /^(https?:|data:)/.test(prod.image)) ? prod.image : (imgs[0] || ''),
                            images: imgs,
                            ...(prod._meta || {}),   // [277차] 고시·배송/반품·AS·원산지·유효일(채널 필수)
                            action,
                        });
                        results.push({ chId, sku: prod.sku, ok: !!d.ok, status: d.status });
                        if (!d.ok) hasError = true;
                    } catch {
                        results.push({ chId, sku: prod.sku, ok: false, status: 'network_error' });
                        hasError = true;
                    }
                }
            }

            // 결과 반영 (Success한 항목만 onApply로 전달)
            const successChannels = [...new Set(results.filter(r => r.ok).map(r => r.chId))];
            onApply(action, successChannels.length > 0 ? successChannels : [...selChs], recPrices);
            setDone(true);
            if (hasError) {
                console.warn('[CatalogSync] 일부 Channel writeback Failed:', results.filter(r => !r.ok));
            }
            setTimeout(onClose, 1500);
        } catch (err) {
            console.error('[CatalogSync] writeback Error:', err);
            // 에러 시 로컬 onApply 폴백
            onApply(action, [...selChs], recPrices);
            setDone(true);
            setTimeout(onClose, 1500);
        } finally {
            setRunning(false);
        }
    };

    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    const inputStyle = { width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "#ffffff", color: "#1f2937", fontSize: 12 };
    const stepDot = (n) => ({
        width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800,
        background: step >= n ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "rgba(99,140,255,0.12)",
        color: step >= n ? "#fff" : "#6b7280",
    });

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 400 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: step === 1 ? "min(96vw,860px)" : "min(92vw,580px)", maxHeight: "92vh", overflowY: "auto", background: "#ffffff", border: "1px solid rgba(99,140,255,0.25)", borderRadius: 18, zIndex: 401, padding: 28, transition: "width 0.25s ease" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{t('catalogSync.registerToChannel')}</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>

                {/* 스텝 인디케이터 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
                    {[t('catalogSync.selectChannelStep'), t('catalogSync.setPriceStep'), t('catalogSync.approveRegisterStep')].map((label, i) => (
                        <React.Fragment key={i}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={stepDot(i)}>{i + 1}</div>
                                <span style={{ fontSize: 11, fontWeight: step === i ? 700 : 400, color: step === i ? "#4f8ef7" : "#6b7280" }}>{label}</span>
                            </div>
                            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i ? "rgba(79,142,247,0.5)" : "rgba(99,140,255,0.1)", margin: "0 4px" }} />}
                        </React.Fragment>
                    ))}
                </div>


                {/* Select Product Summary (공통) */}
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#f97316" }}>{t('catalogSync.selectedProductCount', { n: selProds.length })} · {t('catalogSync.avgProductCost')} <span style={{ fontWeight: 700 }}>{fmtKRW(avgCost)}</span></div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {selProds.slice(0, 5).map(p => (
                            <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(79,142,247,0.12)", color: "#4f8ef7" }}>{p.name}</span>
                        ))}
                        {selProds.length > 5 && <span style={{ fontSize: 10, color: "#6b7280" }}>+{selProds.length - 5}</span>}
                    </div>
                </div>

                {/* ═══ STEP 0: Channel+Action Select ═══ */}
                {step === 0 && (
                    <>
                        {/* Action Select */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                            {[
                                { id: "register", label: t('catalogSync.registerToChannelAction'), desc: t('catalogSync.registerToChannelDesc'), color: "#22c55e" },
                                { id: "unregister", label: t('catalogSync.unregisterChannelAction'), desc: t('catalogSync.unregisterChannelDesc'), color: "#ef4444" },
                            ].map(a => (
                                <div key={a.id} onClick={() => setAction(a.id)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `2px solid ${action === a.id ? a.color : "rgba(99,140,255,0.12)"}`, background: action === a.id ? `${a.color}08` : "#ffffff" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: a.color }}>{a.label}</div>
                                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>{a.desc}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{t('catalogSync.targetChannel')}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                            {dynamicChannels.map(c => {
                                const rate = CHANNEL_RATES[c.id];
                                return (
                                    <label key={c.id} onClick={() => toggleCh(c.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `1px solid ${selChs.has(c.id) ? c.color + "60" : "rgba(99,140,255,0.12)"}`, background: selChs.has(c.id) ? `${c.color}08` : "#ffffff", transition: "all 150ms" }}>
                                        <input type="checkbox" checked={selChs.has(c.id)} onChange={() => { }} style={{ accentColor: c.color }} />
                                        <span style={{ fontSize: 18 }}>{c.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: selChs.has(c.id) ? c.color : "#1f2937" }}>{c.name}</div>
                                            {rate && <div style={{ fontSize: 9, color: "#6b7280", marginTop: 1 }}>{t('catalogSync.channelCommissionInfo', { commission: (rate.commission * 100).toFixed(0), vat: (rate.vat * 100).toFixed(0), region: rate.region })}</div>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 18 }}>
                            <button onClick={() => setSelChs(new Set(CHANNELS.map(c => c.id)))} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#6b7280", cursor: "pointer" }}>{t('catalogSync.selectAllBtn')}</button>
                            <button onClick={() => setSelChs(new Set())} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "#6b7280", cursor: "pointer" }}>{t('catalogSync.deselectAllBtn')}</button>
                            {selChs.size > 0 && <span style={{ fontSize: 11, color: "#4f8ef7", alignSelf: "center", marginLeft: 4 }}>{t('catalogSync.channelsSelected').replace('{{n}}', selChs.size)}</span>}
                        </div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "#e5e7eb", border: '1px solid #e5e7eb', color: "#374151", cursor: "pointer", fontSize: 12 }}>{t('catalogSync.cancelBtn')}</button>
                            <button
                                onClick={() => action === "register" ? setStep(1) : handleApply()}
                                disabled={!selChs.size}
                                style={{ padding: "9px 24px", borderRadius: 8, background: !selChs.size ? "rgba(79,142,247,0.2)" : action === "register" ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "linear-gradient(135deg,#ef4444,#f97316)", border: "none", color: '#1f2937', fontWeight: 700, cursor: selChs.size ? "pointer" : "default", fontSize: 12 }}>
                                {action === "register" ? t('catalogSync.nextSetPriceBtn') : t('catalogSync.productsUnregister', { n: selProds.length })}
                            </button>
                        </div>
                    </>
                )}

                {/* ═══ STEP 1: Channelper RecommendSet Price ═══ */}
                {step === 1 && (
                    <>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#f59e0b", marginBottom: 6 }}>{t('catalogSync.channelPriceRecommendTitle')}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 14 }}>
                            {t('catalogSync.channelPriceRecommendDesc')}<br />
                            <span style={{ color: "#4f8ef7" }}>{t('catalogSync.channelPriceAdjustDesc')}</span>
                        </div>

                        {/* Channelper Table */}
                        <div style={{ overflowX: "auto", marginBottom: 18 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(99,140,255,0.15)" }}>
                                        {[t('catalogSync.colChannels'), t('catalogSync.colRegionLabel'), t('catalogSync.colCommission'), t('catalogSync.colTax'), t('catalogSync.colMarginPct'), t('catalogSync.productCostTotal'), t('catalogSync.colRecommendedPrice'), t('catalogSync.colOverrideLabel')].map(h => (
                                            <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: "#6b7280", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selChsArr.map(chId => {
                                        const ch = CHANNELS.find(c => c.id === chId) || { name: chId, color: "#4f8ef7", icon: "🔌" };
                                        const rate = CHANNEL_RATES[chId] || { commission: 0.10, vat: 0.10, region: "Other" };
                                        const margin = margins[chId] ?? 30;
                                        const recPrice = calcRecommendedPrice(avgCost, chId, margin);
                                        const finalPrice = customPrices[chId] ?? recPrice;
                                        const actualMargin = avgCost > 0 ? (((finalPrice - avgCost) / finalPrice - rate.commission - rate.vat) * 100).toFixed(1) : 0;
                                        return (
                                            <tr key={chId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: customPrices[chId] ? "rgba(245,158,11,0.04)" : "" }}>
                                                <td style={{ padding: "10px 10px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ fontSize: 16 }}>{ch.icon}</span>
                                                        <span style={{ fontWeight: 600, color: ch.color, fontSize: 11 }}>{ch.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "10px 6px" }}>
                                                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 12, background: rate.region === "Domestic" ? "rgba(34,197,94,0.1)" : "rgba(79,142,247,0.1)", color: rate.region === "Domestic" ? "#22c55e" : "#4f8ef7" }}>{rate.region}</span>
                                                </td>
                                                <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "#ef4444" }}>{(rate.commission * 100).toFixed(0)}%</td>
                                                <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "#f97316" }}>{(rate.vat * 100).toFixed(0)}%</td>
                                                <td style={{ padding: "10px 6px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <input
                                                            type="range" min="5" max="80" step="1" value={margin}
                                                            onChange={e => { setMargins(m => ({ ...m, [chId]: Number(e.target.value) })); setCustomPrices(cp => { const n = { ...cp }; delete n[chId]; return n; }); }} style={{ width: 70, accentColor: ch.color }}
                                                        />
                                                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#22c55e", fontSize: 11, minWidth: 30 }}>{margin}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "10px 6px", fontFamily: "monospace", color: "#f97316", fontWeight: 700 }}>{fmtKRW(avgCost)}</td>
                                                <td style={{ padding: "10px 10px" }}>
                                                    <div style={{ fontWeight: 900, fontSize: 14, color: customPrices[chId] ? "#f59e0b" : "#22c55e", fontFamily: "monospace" }}>{fmtKRW(finalPrice)}</div>
                                                    <div style={{ fontSize: 9, color: actualMargin > 0 ? "#22c55e" : "#ef4444", marginTop: 2 }}>{t('catalogSync.actualMarginLabel')} {actualMargin}%</div>
                                                </td>
                                                <td style={{ padding: "10px 6px" }}>
                                                    <input
                                                        type="number"
                                                        placeholder={fmtKRW(recPrice)}
                                                        value={customPrices[chId] ?? ""}
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            setCustomPrices(cp => v ? { ...cp, [chId]: Number(v) } : (({ [chId]: _, ...rest }) => rest)(cp));
                                                        }} style={{ width: 110, padding: "5px 8px", borderRadius: 7, border: customPrices[chId] ? "1px solid #f59e0b" : "1px solid rgba(99,140,255,0.2)", background: "#ffffff", color: "#1f2937", fontSize: 12 }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary */}
                        <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 18, fontSize: 11, color: "#374151" }}>
                            💡 {t('catalogSync.priceFormulaDesc')}
                        </div>

                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button onClick={() => setStep(0)} style={{ padding: "9px 20px", borderRadius: 8, background: "#e5e7eb", border: '1px solid #e5e7eb', color: "#374151", cursor: "pointer", fontSize: 12 }}>{t('catalogSync.backBtn')}</button>
                            <button onClick={() => setStep(2)} style={{ padding: "9px 24px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#4f8ef7)", border: "none", color: '#ffffff', fontWeight: 700, cursor: "pointer", fontSize: 12 }}>{t('catalogSync.nextApproveBtn')}</button>
                        </div>
                    </>
                )}

                {/* ═══ STEP 2: Management자 Approve & Register Run ═══ */}
                {step === 2 && (
                    <>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#a855f7", marginBottom: 14 }}>{t('catalogSync.finalReviewTitle')}</div>

                        {/* Channelper 최종 Sale Price Summary */}
                        <div style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", marginBottom: 10 }}>{t('catalogSync.channelFinalSummary')}</div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {selChsArr.map(chId => {
                                    const ch = CHANNELS.find(c => c.id === chId) || { name: chId, icon: "🔌", color: "#4f8ef7" };
                                    const rate = CHANNEL_RATES[chId] || { commission: 0.10, vat: 0.10 };
                                    const finalPrice = recPrices[chId] ?? 0;
                                    const profit = finalPrice - avgCost - Math.round(finalPrice * (rate.commission + rate.vat));
                                    return (
                                        <div key={chId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, background: '#ffffff', border: '1px solid #e5e7eb' }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 16 }}>{ch.icon}</span>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: ch.color }}>{ch.name}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.commissionTaxLabel')}</div>
                                                    <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "monospace" }}>{fmtKRW(Math.round(finalPrice * (rate.commission + rate.vat)))}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.estProfitLabel')}</div>
                                                    <div style={{ fontSize: 11, color: profit > 0 ? "#22c55e" : "#ef4444", fontFamily: "monospace", fontWeight: 700 }}>{fmtKRW(profit)}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.colSalePrice')}</div>
                                                    <div style={{ fontSize: 15, fontWeight: 900, color: "#f59e0b", fontFamily: "monospace" }}>{fmtKRW(finalPrice)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Management자 Approval Checkbox */}
                        <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: approved ? "rgba(34,197,94,0.08)" : "rgba(99,140,255,0.05)", border: `1px solid ${approved ? "rgba(34,197,94,0.35)" : "rgba(99,140,255,0.2)"}`, cursor: "pointer", marginBottom: 18 }}>
                            <input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#22c55e", cursor: "pointer" }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: approved ? "#22c55e" : "#1f2937" }}>{t('catalogSync.managerApprovalText', { chCount: selChsArr.length, prodCount: selProds.length })}</div>
                                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{t('catalogSync.approvalNoteText')}</div>
                            </div>
                        </label>

                        {done ? (
                            <div style={{ textAlign: "center", padding: "14px", borderRadius: 10, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, fontSize: 14 }}>
                                {t('catalogSync.registerDoneMsg', { prodCount: selProds.length, chCount: selChsArr.length })}
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <button onClick={() => setStep(1)} style={{ padding: "9px 20px", borderRadius: 8, background: "#e5e7eb", border: '1px solid #e5e7eb', color: "#374151", cursor: "pointer", fontSize: 12 }}>{t('catalogSync.backBtn')}</button>
                                <button
                                    onClick={handleApply}
                                    disabled={!approved || running}
                                    style={{ padding: "9px 28px", borderRadius: 8, background: !approved || running ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg,#22c55e,#a855f7)", border: "none", color: '#1f2937', fontWeight: 700, cursor: approved && !running ? "pointer" : "default", fontSize: 13 }}
                                >
                                    {running ? t('catalogSync.registeringMsg') : t('catalogSync.registerRunMsg', { prodCount: selProds.length, chCount: selChsArr.length })}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
});

/* ─── BulkPriceModal ─────────────────────────────────── */
const BulkPriceModal = memo(function BulkPriceModal({ selectedIds, products, onClose, onApply, is }) {
    const { t } = useI18n();
    const dynamicChannels = useDynamicChannels();
    const [priceMode, setPriceMode] = useState("fixed"); // fixed | markup | discount
    const [value, setValue] = useState("");
    const [selChs, setSelChs] = useState(new Set(CHANNELS.map(c => c.id)));
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);

    const selProds = products.filter(p => selectedIds.has(p.id));
    const toggleCh = id => { const n = new Set(selChs); n.has(id) ? n.delete(id) : n.add(id); setSelChs(n); };

    const previewPrice = (basePrice) => {
        const v = parseFloat(value) || 0;
        if (priceMode === "fixed") return v;
        if (priceMode === "markup") return Math.round(basePrice * (1 + v / 100));
        if (priceMode === "discount") return Math.round(basePrice * (1 - v / 100));
        return basePrice;
    };

    const handleApply = async () => {
        if (!value) return;
        setRunning(true);
        // 192차: 실 백엔드 일괄 가격수정(/api/catalog/bulk-price) — 등록 리스팅 가격 영속(테넌트격리).
        //   (구 setTimeout 시뮬레이션 → 실제 반영 0 이던 결함 대체)
        try {
            const items = [];
            selProds.forEach(p => {
                const np = previewPrice(p.price);
                [...selChs].forEach(ch => items.push({ channel: ch, sku: p.sku, price: np }));
            });
            if (items.length) { try { await postJson('/api/catalog/bulk-price', { items }); } catch { /* 로컬 동기화는 계속 */ } }
        } finally {
            onApply(priceMode, parseFloat(value), [...selChs]);
            setRunning(false);
            setDone(true);
            setTimeout(onClose, 1200);
        }
    };

    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", zIndex: 400 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(92vw,580px)", maxHeight: "90vh", overflowY: "auto", background: "#ffffff", border: "1px solid rgba(99,140,255,0.25)", borderRadius: 16, zIndex: 401, padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{t('catalogSync.bulkPriceEdit')}</div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>


                {/* Select Product */}
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t('catalogSync.selectedProductCount', { n: selProds.length })}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {selProds.slice(0, 5).map(p => (
                            <span key={p.id} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(79,142,247,0.12)", color: "#4f8ef7", opacity: 0.7 }}>{p.name} <span style={{ fontWeight: 600 }}>{fmtKRW(p.price)}</span></span>
                        ))}
                        {selProds.length > 5 && <span style={{ fontSize: 10, color: "#6b7280" }}>+{selProds.length - 5}</span>}
                    </div>
                </div>

                {/* Price Edit 방식 */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#6b7280", marginBottom: 10 }}>{t('catalogSync.priceEditMethodTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[
                        { id: "fixed", label: t('catalogSync.fixedPriceLabel'), icon: "✏️", desc: t('catalogSync.fixedPriceDesc'), unit: "KRW" },
                        { id: "markup", label: t('catalogSync.markupLabel'), icon: "📈", desc: t('catalogSync.markupDesc'), unit: "%" },
                        { id: "discount", label: t('catalogSync.discountLabel'), icon: "🏷️", desc: t('catalogSync.discountDesc'), unit: "%" },
                    ].map(m => (
                        <div key={m.id} onClick={() => { setPriceMode(m.id); setValue(""); }} style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: `2px solid ${priceMode === m.id ? "#f59e0b" : "rgba(99,140,255,0.12)"}`, background: priceMode === m.id ? "rgba(245,158,11,0.06)" : "#ffffff", textAlign: "center" }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: priceMode === m.id ? "#f59e0b" : "#1f2937" }}>{m.label}</div>
                            <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>{m.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Value 입력 */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#6b7280" }}>
                            {priceMode === "fixed" ? "KRW" : "%"}
                        </span>
                        <input

                            type="number"
                            placeholder={priceMode === "fixed" ? t('catalogSync.fixedPricePh') : priceMode === "markup" ? t('catalogSync.markupPh') : t('catalogSync.discountPh')}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            style={{ paddingLeft: 28, fontSize: 14, fontWeight: 700 }}
                        />
                    </div>
                    {value && selProds.length > 0 && (
                        <div style={{ fontSize: 11, color: "#22c55e", whiteSpace: "nowrap" }}>
                            → {fmtKRW(previewPrice(selProds[0].price))}
                        </div>
                    )}
                </div>

                {/* Price 미리보기 */}
                {value && selProds.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{t('catalogSync.changePreview')}</div>
                        <div style={{ display: "grid", gap: 6, maxHeight: 180, overflowY: "auto" }}>
                            {selProds.map(p => {
                                const newPrice = previewPrice(p.price);
                                const diff = newPrice - p.price;
                                return (
                                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: '#ffffff', fontSize: 11 }}>
                                        <span style={{ color: "#374151" }}>{p.name}</span>
                                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                            <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{fmtKRW(p.price)}</span>
                                            <span style={{ color: "#6b7280" }}>→</span>
                                            <span style={{ color: newPrice > p.price ? "#22c55e" : newPrice < p.price ? "#ef4444" : "#1f2937", fontWeight: 700, fontFamily: "monospace" }}>{fmtKRW(newPrice)}</span>
                                            <span style={{ fontSize: 10, color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "#6b7280" }}>{diff > 0 ? "+" : ""}{diff.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Apply Channel */}
                <div style={{ fontWeight: 700, fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{t('catalogSync.applyChannel')}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {dynamicChannels.map(c => (
                        <button key={c.id} onClick={() => toggleCh(c.id)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: selChs.has(c.id) ? 700 : 400, border: `1px solid ${selChs.has(c.id) ? c.color + "80" : "rgba(99,140,255,0.15)"}`, background: selChs.has(c.id) ? `${c.color}15` : "transparent", color: selChs.has(c.id) ? c.color : "#6b7280", cursor: "pointer", transition: "all 150ms" }}>
                            {c.icon} {c.name}
                        </button>
                    ))}
                </div>

                {done ? (
                    <div style={{ textAlign: "center", padding: "12px", borderRadius: 10, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700 }}>
                        {t('catalogSync.priceEditDoneMsg')}
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, background: "#e5e7eb", border: '1px solid #e5e7eb', color: "#374151", cursor: "pointer", fontSize: 12 }}>{t('catalogSync.cancelBtn')}</button>
                        <button onClick={handleApply} disabled={!value || running} style={{ padding: "9px 24px", borderRadius: 8, background: running ? "rgba(245,158,11,0.4)" : "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", color: '#1f2937', fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                            {running ? t('catalogSync.processing') : t('catalogSync.priceEditApply').replace('{{n}}', selProds.length)}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
});

/* ─── Tab: Product 카탈로그 ─────────────────────────────────────────────────────────── */
const CatalogTab = memo(function CatalogTab() {
    const { t, lang } = useI18n();
    const { updateCatalogChannelPrices, syncCatalogItem, addAlert, inventory, channelProductPrices } = useGlobalData();
    const { sanitize, secBanner } = useCatalogSecurity();
    const dynamicChannels = useDynamicChannels();
    const [products, setProducts] = useState(PRODUCTS_INIT);
    const [search, setSearch] = useState("");
    const [selCh, setSelCh] = useState("all");
    const [selSt, setSelSt] = useState("all");
    const [sortKey, setSortKey] = useState("id");
    const [sortDir, setSortDir] = useState(1);
    const [selected, setSelected] = useState(new Set());
    const [detail, setDetail] = useState(null);
    const [page, setPage] = useState(0);
    const [showRegister, setShowRegister] = useState(false);
    const [showBulkRegister, setShowBulkRegister] = useState(false);
    const [showBulkPrice, setShowBulkPrice] = useState(false);
    const [toast, setToast] = useState(null);
    const isMobile = useIsMobile();
    const PAGE = 8;

    /**
     * [277차] 수동 등록 상품(po_products)을 이 페이지에 노출 — 종전엔 inventory 시드만 읽어
     *   "상품등록에서 등록한 상품이 카탈로그 동기화에 안 보이고, 여기서 채널로 보낼 수도 없다".
     *   등록 상품이 있으면 그것을 SSOT 로 쓰고(이미지·상세·고시정보 보유), 없을 때만 기존 inventory 폴백.
     *   전송은 아래 handleApply 의 기존 writeback 경로를 그대로 탄다(신규 엔드포인트 0).
     */
    useEffect(() => {
        let alive = true;
        getJsonAuth(`/v420/price/products`)
            .then(d => {
                if (!alive) return;
                const rows = d.products || [];
                if (!rows.length) return;   // 없으면 아래 inventory 폴백 effect 가 처리
                setProducts(rows.map((p, i) => {
                    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
                    const stock = Number(p.initial_stock) || 0;
                    return {
                        id: `POP-${String(i + 1).padStart(3, '0')}`,
                        sku: p.sku,
                        name: p.product_name || p.sku,
                        category: p.category || '',
                        image: p.product_image || imgs[0] || '📦',
                        price: Number(p.base_price) || Number(p.cost_price) || 0,
                        // [277차 감사 P1] 존재한 적 없는 '정가'를 판매가×1.2 로 합성해 취소선으로 노출하던 날조 제거.
                        //   po_products 에 compare_price 컬럼 자체가 없다(SSOT 부재) → 표시하지 않는다.
                        comparePrice: 0,
                        purchaseCost: Number(p.purchase_cost) || Number(p.cost_price) || 0,
                        productCost: Number(p.cost_price) || 0,
                        spec: p.spec || '',
                        unitType: p.unit || 'ea',
                        eaPerBox: String(p.qty_per_box || ''),
                        boxPerPl: String(p.boxes_per_pallet || ''),
                        inventory: stock,
                        channels: [],
                        channelPrices: channelProductPrices?.[p.sku] || {},
                        status: stock <= 0 ? 'error' : stock < 30 ? 'warn' : 'ok',
                        lastSync: '-',
                        delta: { price: false, stock: false, title: false },
                        // 채널 전송 시 함께 실어야 빈 상세로 등록되지 않는다.
                        detailHtml: p.detail_html || '',
                        images: imgs,
                        _registered: true,
                        // [277차] 채널 필수 메타 — 네이버는 상품정보제공고시·배송/반품·AS·원산지 없이 등록을 거부한다.
                        _meta: {
                            notice_category: p.notice_category || '', notice_json: p.notice_json || '',
                            as_phone: p.as_phone || '', as_guide: p.as_guide || '', origin: p.origin || '',
                            minor_purchase: p.minor_purchase || '', ship_fee_type: p.ship_fee_type || '',
                            ship_fee: p.ship_fee || 0, return_ship_fee: p.return_ship_fee || 0,
                            exchange_ship_fee: p.exchange_ship_fee || 0, return_courier: p.return_courier || '',
                            mfg_date: p.mfg_date || '', expiry_date: p.expiry_date || '',
                        },
                    };
                }));
            })
            .catch(() => { /* 폴백은 아래 effect 가 담당 */ });
        return () => { alive = false; };
    }, [channelProductPrices]);

    /**
     * [277차] 채널에서 수집한 상품 이미지 — channel_products.image_url 은 이미 저장돼 있는데(수집 정상)
     *   이 화면이 읽지 않아 "동기화해도 이미지를 못 가져온다"로 보였다. sku→image_url 맵으로 목록에 주입.
     */
    const [syncedImages, setSyncedImages] = useState({});
    useEffect(() => {
        let alive = true;
        getJsonAuth(`/api/channel-sync/products?limit=200`)
            .then(d => {
                if (!alive) return;
                const m = {};
                (d.products || []).forEach(p => {
                    const sku = String(p.sku || p.channel_product_id || '');
                    const url = String(p.image_url || '');
                    if (sku && url && !m[sku]) m[sku] = url;
                });
                setSyncedImages(m);
            })
            .catch(() => { if (alive) setSyncedImages({}); });
        return () => { alive = false; };
    }, []);

    // ★ Demo fallback: inventory 시드 데이터 → CatalogSync 상품 자동 로딩
    useEffect(() => {
        if (products.length === 0 && inventory && inventory.length > 0) {
            const mapped = inventory.map((item, i) => ({
                id: `CAT-${String(i + 1).padStart(3, '0')}`,
                sku: item.sku,
                name: item.name,
                category: item.category || 'beauty/skincare',
                image: item.image || syncedImages[String(item.sku)] || '📦',
                price: item.price || 0,
                // [277차] 존재한 적 없는 '정가'를 price×1.2 로 합성하지 않는다(감사 확정 P1 · 헌법: 날조 금지).
                comparePrice: 0,
                // [277차] 등록상품(po_products)이 아니라 재고/채널 유래 항목 — 이미지·상세·고시·카테고리가 없어
                //   이대로 채널에 전송하면 엉뚱한 값이 등록된다. 전송 대상에서 제외한다.
                _fallback: true,
                purchaseCost: item.cost || 0,
                productCost: item.cost || 0,
                spec: '',
                unitType: 'ea',
                eaPerBox: '24',
                boxPerPl: '40',
                inventory: Object.values(item.stock || {}).reduce((s, v) => s + v, 0),
                channels: item.channels || [],
                channelPrices: channelProductPrices?.[item.sku] || {},
                // [현 차수] 죽은 status 필터 수정 — 전 상품 'ok' 하드코딩 → 실재고 기준 결정적 산출(경고/오류 필터 동작).
                status: (() => { const inv = Object.values(item.stock || {}).reduce((s, v) => s + (Number(v) || 0), 0); return inv <= 0 ? 'error' : inv < (item.safeQty || 30) ? 'warn' : 'ok'; })(),
                lastSync: new Date().toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR', { hour12: false }),
                delta: { price: false, stock: false, title: false },
            }));
            setProducts(mapped);
        }
    }, [inventory, channelProductPrices]);

    const showToast = (msg, color = "#22c55e") => {
        setToast({ msg, color });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBulkRegister = async (action, channels, recPrices = {}) => {
        // 209차 P1: 채널 등록가 백엔드 영속 items 사전 수집(setProducts updater 부작용 회피).
        const persistItems = [];
        if (action === "register") {
            products.forEach(p => {
                if (!selected.has(p.id)) return;
                channels.forEach(ch => { if (recPrices[ch]) persistItems.push({ channel: ch, sku: p.sku, price: recPrices[ch] }); });
            });
        }
        setProducts(prev => prev.map(p => {
            if (!selected.has(p.id)) return p;
            const channelPrices = { ...(p.channelPrices || {}) };
            if (action === "register" && Object.keys(recPrices).length > 0) {
                channels.forEach(ch => { if (recPrices[ch]) channelPrices[ch] = recPrices[ch]; });
            }
            const firstChPrice = channels.map(ch => recPrices[ch]).find(v => v);

            // [v11] GlobalDataContext에 Channelper Sale Price Sync (OrderHub, PriceOpt에서 소비)
            if (action === "register" && Object.keys(channelPrices).length > 0) {
                updateCatalogChannelPrices(p.sku, channelPrices);
                // inventory Sync (sku, name, price, cost)
                syncCatalogItem({ sku: p.sku, name: p.name, price: firstChPrice || p.price, cost: p.productCost || p.purchaseCost || 0 });
            }

            return {
                ...p,
                channels: action === "register"
                    ? [...new Set([...p.channels, ...channels])]
                    : p.channels.filter(c => !channels.includes(c)),
                channelPrices,
                price: action === "register" && firstChPrice ? firstChPrice : p.price,
                lastSync: action === "register" ? "방금" : p.lastSync,
                delta: { ...p.delta, price: action === "register" },
                status: "ok",
            };
        }));
        // 209차 P1: handleApply 와 동일하게 /api/catalog/bulk-price 영속(로컬 client-state 소실 방지·테넌트격리).
        if (persistItems.length) { try { await postJson('/api/catalog/bulk-price', { items: persistItems }); } catch { /* 로컬 동기화는 계속 */ } }
        showToast(action === "register" ? t('catalogSync.registerDoneToast').replace('{{n}}', selected.size) : t('catalogSync.disconnectDoneToast').replace('{{n}}', selected.size));
        setSelected(new Set());
    };

    const handleBulkPrice = (mode, value, channels) => {
        setProducts(prev => prev.map(p => {
            if (!selected.has(p.id)) return p;
            let newPrice = p.price;
            if (mode === "fixed") newPrice = value;
            else if (mode === "markup") newPrice = Math.round(p.price * (1 + value / 100));
            else if (mode === "discount") newPrice = Math.round(p.price * (1 - value / 100));
            return { ...p, price: newPrice, delta: { ...p.delta, price: true }, lastSync: null };
        }));
        showToast(t('catalogSync.priceEditDoneToast').replace('{{n}}', selected.size), "#f59e0b");
        // ✅ [완전동기화] 일괄 가격 편집 → GlobalData inventory price 동기화
        setProducts(cur => {
            cur.filter(p => selected.has(p.id)).forEach(p => {
                syncCatalogItem({ sku: p.sku, name: p.name, price: p.price, cost: p.productCost || p.purchaseCost || 0 });
            });
            return cur;
        });
        addAlert({ type: 'info', msg: t('catalogSync.alertBulkPriceSync', { n: selected.size }) });
        setSelected(new Set());
    };

    const handleAddProduct = p => {
        setProducts(prev => [p, ...prev]);
        syncCatalogItem({
            sku: p.sku, name: p.name, price: p.price || 0,
            cost: p.productCost || p.purchaseCost || 0, safeQty: 30,
        });
        addAlert({ type: 'success', msg: t('catalogSync.alertNewProduct', { name: p.name }) });
    };

    /* ─── CSV Export ─── */
    const handleExportCSV = useCallback(() => {
        const headers = ['SKU', 'Name', 'Category', 'Price', 'Cost', 'Stock', 'Channels', 'Status'];
        const rows = products.map(p => [
            p.sku, `"${p.name}"`, p.category || '', p.price || 0, p.productCost || p.purchaseCost || 0,
            p.stock || 0, (p.channels || []).join(';'), p.status || 'ok'
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `catalog_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
        showToast(t('catalogSync.csvExportDone').replace('{{n}}', products.length), '#22c55e');
        addAlert({ type: 'success', msg: t('catalogSync.alertCsvExport', { n: products.length }) });
    }, [products, t, addAlert]);

    /* ─── CSV Import ─── */
    const csvInputRef = useRef(null);
    const handleImportCSV = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) { showToast(t('catalogSync.csvImportEmpty'), '#ef4444'); return; }
                const imported = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].match(/("[^"]*"|[^,]*)/g) || [];
                    const clean = cols.map(c => c.replace(/^"|"$/g, '').trim());
                    if (clean.length < 2 || !clean[0]) continue;
                    imported.push({
                        id: `P-IMP-${Date.now()}-${i}`,
                        sku: sanitize(clean[0]), name: sanitize(clean[1]),
                        category: clean[2] || '', price: Number(clean[3]) || 0,
                        productCost: Number(clean[4]) || 0, stock: Number(clean[5]) || 0,
                        channels: clean[6] ? clean[6].split(';').filter(Boolean) : [],
                        status: clean[7] || 'ok', channelPrices: {}, delta: {},
                        lastSync: null, unitType: 'ea', eaPerBox: 1, boxPerPl: 1,
                    });
                }
                if (imported.length === 0) { showToast(t('catalogSync.csvImportEmpty'), '#ef4444'); return; }
                setProducts(prev => [...imported, ...prev]);
                imported.forEach(p => syncCatalogItem({ sku: p.sku, name: p.name, price: p.price, cost: p.productCost, safeQty: 30 }));
                showToast(t('catalogSync.csvImportDone').replace('{{n}}', imported.length), '#22c55e');
                addAlert({ type: 'success', msg: t('catalogSync.alertCsvImport', { n: imported.length }) });
            } catch { showToast(t('catalogSync.csvImportError'), '#ef4444'); }
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    }, [sanitize, t, addAlert, syncCatalogItem]);

    /* ─── Excel (.xlsx) Import ─── */
    const xlsxInputRef = useRef(null);
    const handleImportExcel = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const XLSX = (await import('xlsx')).default || await import('xlsx');
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
            if (rows.length === 0) { showToast(t('catalogSync.excelImportEmpty'), '#ef4444'); return; }

            const COL_MAP = {
                'SKU': 'sku', 'sku': 'sku', '상품코드': 'sku', '품번': 'sku', 'Product Code': 'sku',
                'Name': 'name', 'name': 'name', '상품명': 'name', '제품명': 'name', 'Product Name': 'name',
                'Category': 'category', 'category': 'category', '카테고리': 'category', '분류': 'category',
                'Price': 'price', 'price': 'price', '판매가': 'price', '가격': 'price', 'Sale Price': 'price',
                'Cost': 'cost', 'cost': 'cost', '원가': 'cost', '매입가': 'cost', 'Product Cost': 'cost',
                'Stock': 'stock', 'stock': 'stock', '재고': 'stock', '수량': 'stock', 'Inventory': 'stock', 'Qty': 'stock',
                'Channels': 'channels', 'channels': 'channels', '판매채널': 'channels',
                'Status': 'status', 'status': 'status', '상태': 'status',
            };

            const imported = rows.map((row, i) => {
                const mapped = {};
                Object.entries(row).forEach(([col, val]) => {
                    const key = COL_MAP[col.trim()];
                    if (key) mapped[key] = val;
                });
                if (!mapped.sku && !mapped.name) return null;
                return {
                    id: `P-XLS-${Date.now()}-${i}`,
                    sku: sanitize(String(mapped.sku || `AUTO-${i + 1}`)),
                    name: sanitize(String(mapped.name || '')),
                    category: String(mapped.category || ''),
                    price: Number(mapped.price) || 0,
                    productCost: Number(mapped.cost) || 0,
                    stock: Number(mapped.stock) || 0,
                    channels: mapped.channels ? String(mapped.channels).split(/[;,]/).filter(Boolean) : [],
                    status: mapped.status || 'ok',
                    channelPrices: {}, delta: {},
                    lastSync: null, unitType: 'ea', eaPerBox: 1, boxPerPl: 1,
                };
            }).filter(Boolean);

            if (imported.length === 0) { showToast(t('catalogSync.excelImportEmpty'), '#ef4444'); return; }
            setProducts(prev => [...imported, ...prev]);
            imported.forEach(p => syncCatalogItem({ sku: p.sku, name: p.name, price: p.price, cost: p.productCost, safeQty: 30 }));
            showToast(t('catalogSync.excelImportDone').replace('{{n}}', imported.length), '#22c55e');
            addAlert({ type: 'success', msg: t('catalogSync.alertExcelImport', { n: imported.length }) });
        } catch (err) {
            console.error('Excel import error:', err);

            showToast(t('catalogSync.excelImportError'), '#ef4444');
        }
        e.target.value = '';
    }, [sanitize, t, addAlert, syncCatalogItem]);

    /* ─── Excel (.xlsx) Export ─── */
    const handleExportExcel = useCallback(async () => {
        try {
            const XLSX = (await import('xlsx')).default || await import('xlsx');
            const rows = products.map(p => ({
                SKU: p.sku, '상품명(Name)': p.name, 'Category': p.category || '',
                '판매가(Price)': p.price || 0, '원가(Cost)': p.productCost || p.purchaseCost || 0,
                '재고(Stock)': p.stock || 0, 'Channels': (p.channels || []).join(';'), 'Status': p.status || 'ok',
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 8 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Catalog');
            XLSX.writeFile(wb, `catalog_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showToast(t('catalogSync.excelExportDone').replace('{{n}}', products.length), '#22c55e');
            addAlert({ type: 'success', msg: t('catalogSync.alertExcelExport', { n: products.length }) });
        } catch (err) { showToast(t('catalogSync.excelImportError'), '#ef4444'); }
    }, [products, t, addAlert]);

    /* ─── Excel Template Download ─── */
    const handleDownloadTemplate = useCallback(async () => {
        try {
            const XLSX = (await import('xlsx')).default || await import('xlsx');
            const template = [
                { SKU: 'SAMPLE-001', '상품명(Name)': '샘플 상품 A', 'Category': 'electronics/audio', '판매가(Price)': 89000, '원가(Cost)': 45000, '재고(Stock)': 100, 'Channels': 'coupang;naver', 'Status': 'ok' },
                { SKU: 'SAMPLE-002', '상품명(Name)': '샘플 상품 B', 'Category': 'fashion/clothing', '판매가(Price)': 45000, '원가(Cost)': 18000, '재고(Stock)': 250, 'Channels': 'shopify;amazon', 'Status': 'ok' },
            ];
            const ws = XLSX.utils.json_to_sheet(template);
            ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 8 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Template');
            XLSX.writeFile(wb, 'catalog_bulk_template.xlsx');
            showToast(t('catalogSync.templateDownloaded'), '#4f8ef7');
        } catch { showToast('Template error', '#ef4444'); }
    }, [t]);

    const filtered = useMemo(() => {
        let rows = products;
        if (search) rows = rows.filter(r => r.name.includes(search) || r.sku.includes(search));
        if (selCh !== "all") rows = rows.filter(r => r.channels.includes(selCh));
        if (selSt !== "all") rows = rows.filter(r => r.status === selSt);
        const k = sortKey;
        rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : -1) * sortDir);
        return rows;
    }, [products, search, selCh, selSt, sortKey, sortDir]);

    const paged = filtered.slice(page * PAGE, page * PAGE + PAGE);
    const totalPages = Math.ceil(filtered.length / PAGE);

    const toggleSort = k => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(1); } };
    const toggleSel = id => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
    const SortIco = ({ k }) => sortKey === k ? (sortDir > 0 ? " ▲" : " ▼") : " ·";

    return (
        <div style={{ display: "grid", gap: 14 }}>

            {/* [237차] 서비스·플랜 등록 모드 — 온보딩에서 '서비스·구독·디지털'(bizModel=service) 선택한 사업자.
                무형 서비스/구독 사업자는 실물 상품 대신 '서비스/플랜(오퍼)'을 카탈로그 항목으로 등록한다. */}
            {(() => { try { const tk = localStorage.getItem('tenantId') || localStorage.getItem('demo_genie_user') || 'me'; return localStorage.getItem('genie_onb_bizmodel_' + tk) === 'service'; } catch { return false; } })() && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(99,102,241,0.08))", border: "1px solid rgba(245,158,11,0.4)" }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "#b45309" }}>🧩 {t('catalogSync.serviceMode', '서비스·플랜 등록 모드')}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.6 }}>
                        {t('catalogSync.serviceModeDesc', '실물 상품이 없는 서비스·구독·디지털 사업자는 광고로 알릴 서비스/플랜(오퍼)을 아래 [등록]으로 추가하세요(상품명=서비스명, 가격=플랜가). 등록 후 채널 연동 → 결제 → 마케팅 자동화로 진행됩니다.')}
                    </div>
                    <a href="/auto-marketing" style={{ display: "inline-block", marginTop: 9, padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#a855f7,#4f8ef7)", color: "#fff", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>🚀 {t('catalogSync.serviceToMarketing', '마케팅 자동화로 바로가기')} →</a>
                </div>
            )}

            {/* Security Alert Banner */}
            {secBanner && (
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🛡️</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444" }}>{t('catalogSync.statusError')}: {secBanner.type} Attack Blocked</div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{secBanner.at} — Threat #{secBanner.count}</div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 10, background: toast.color, color: "#ffffff", fontWeight: 700, fontSize: 13, zIndex: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                    {toast.msg}
                </div>
            )}

            {/* Filters + RegisterButton */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, flex: "1 1 180px" }} placeholder={t('catalogSync.searchPlaceholder')} value={search} onChange={e => { setSearch(sanitize(e.target.value)); setPage(0); }} />
                <select style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, width: 140 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">{t('catalogSync.allChannel')}</option>
                    {dynamicChannels.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}{c.connected ? ' ✅' : ''}</option>)}
                </select>
                <select style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, width: 110 }} value={selSt} onChange={e => setSelSt(e.target.value)}>
                    <option value="all">{t('catalogSync.allStatus')}</option>
                    <option value="ok">{t('catalogSync.statusNormal')}</option>
                    <option value="warn">{t('catalogSync.statusWarning')}</option>
                    <option value="error">{t('catalogSync.statusError')}</option>
                </select>
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#6b7280" }}>{t('catalogSync.productCount').replace('{{n}}', filtered.length)}</span>
                <button onClick={handleDownloadTemplate} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.3)", color: "#374151", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>📋 {t('catalogSync.excelTemplate')}</button>
                <button onClick={handleExportExcel} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#374151", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>📊 {t('catalogSync.excelExport')}</button>
                <button onClick={() => xlsxInputRef.current?.click()} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.3)", color: "#374151", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>📊 {t('catalogSync.excelImport')}</button>
                <input ref={xlsxInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel} />
                <button onClick={handleExportCSV} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#374151", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>📤 {t('catalogSync.csvExport')}</button>
                <button onClick={() => csvInputRef.current?.click()} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", color: "#374151", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>📥 {t('catalogSync.csvImport')}</button>
                <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
                <button onClick={navigateToPriceOptProducts} data-onboard-cta="catalog-product" data-onboard-hint={t('catalogSync.onboardAddHint','여기서 판매할 상품/서비스를 등록하세요')} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#a855f7)", border: "none", color: '#ffffff', fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>📦 {t('catalogSync.addProduct')} →</button>
            </div>

            {/* 일괄 Action 바 — Select 시 나타남 */}
            {selected.size > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", borderRadius: 12, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#4f8ef7" }}>{t('catalogSync.selectedProducts').replace('{{n}}', selected.size)}</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setShowBulkRegister(true)} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#4f8ef7)", border: "none", color: '#ffffff', fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        {t('catalogSync.bulkRegisterBtn')}
                    </button>
                    <button onClick={() => setShowBulkPrice(true)} style={{ padding: "7px 16px", borderRadius: 8, background: "linear-gradient(135deg,#f59e0b,#f97316)", border: "none", color: '#ffffff', fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        {t('catalogSync.bulkPriceEditBtn')}
                    </button>
                    <button onClick={() => setSelected(new Set())} style={{ padding: "7px 12px", borderRadius: 8, background: "#e5e7eb", border: '1px solid #e5e7eb', color: "#6b7280", fontSize: 11, cursor: "pointer" }}>{t('catalogSync.deselectAll')}</button>
                </div>
            )}

            {/* Table or Mobile Cards */}
            {isMobile ? (
                /* ── 모바일: Card형 List ── */
                <div style={{ display: "grid", gap: 10 }}>
                    {paged.map(r => {
                        const margin = r.price > 0 ? (((r.price - (r.productCost || 0)) / r.price) * 100).toFixed(1) : null;
                        const marginColor = margin == null ? "#6b7280" : margin >= 30 ? "#22c55e" : margin >= 10 ? "#eab308" : "#ef4444";
                        const isSelected = selected.has(r.id);
                        return (
                            <div key={r.id} className="card card-glass" style={{ padding: "12px 14px", border: isSelected ? "1px solid rgba(79,142,247,0.5)" : "1px solid rgba(99,140,255,0.12)" }}
                                onClick={() => setDetail(r)}>
                                {/* Header: 체크 + Image + Product Name + Status */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                    <div onClick={e => { e.stopPropagation(); toggleSel(r.id); }} style={{ flexShrink: 0 }}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleSel(r.id)} style={{ width: 14, height: 14 }} />
                                    </div>
                                    {r.image && isImageUrl(r.image)
                                        ? <img src={r.image} alt={r.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(79,142,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.image && !isImageUrl(r.image) ? r.image : '🖼'}</div>}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, wordBreak: "break-word" }}>{r.name}</div>
                                        <div style={{ fontSize: 10, color: "#4f8ef7", fontFamily: "monospace", marginTop: 2 }}>{r.id} · {r.sku}</div>
                                    </div>
                                    <span style={{ fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 9, background: statusColor(r.status) + "18", color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}33`, flexShrink: 0 }}>
                                        {t(r.status === "ok" ? 'catalogSync.statusNormal' : r.status === "warn" ? 'catalogSync.statusWarning' : 'catalogSync.statusError')}
                                    </span>
                                </div>
                                {/* 규격 + Unit + Category */}
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                    <span style={{ fontSize: 10, color: "#6b7280" }}>{r.category}</span>
                                    {r.spec && <span style={{ fontSize: 10, color: "#6b7280", opacity: 0.8 }}>| {r.spec}</span>}
                                    <span style={{ fontWeight: 700, padding: "2px 6px", borderRadius: 20, fontSize: 9, background: r.unitType === 'box' ? 'rgba(79,142,247,0.12)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)', color: r.unitType === 'box' ? '#4f8ef7' : r.unitType === 'pl' ? '#f59e0b' : '#22c55e', border: `1px solid ${r.unitType === 'box' ? 'rgba(79,142,247,0.3)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)'}` }}>{r.unit || 'ea'}</span>
                                </div>
                                {/* Price + Cost Price 그리드 */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)" }}>
                                        <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.salePriceCol')}</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: r.delta?.price ? "#f97316" : "#1f2937" }}>{fmtKRW(r.price)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                                        <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.colPurchaseCost')}</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "#a78bfa" }}>{fmtKRW(r.purchaseCost)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                                        <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.colProductCost')}</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "#f97316" }}>{fmtKRW(r.productCost)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: margin >= 30 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${marginColor}33` }}>
                                        <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.colMargin')}</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: marginColor }}>{margin != null ? `${margin}%` : "-"}</div>
                                    </div>
                                </div>
                                {/* Stock + Sync */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: 11, color: r.delta?.inventory ? "#f97316" : "#374151" }}>
                                        📦 <strong>{fmtStock(r.inventory, r)}</strong>
                                    </div>
                                    <div style={{ fontSize: 10, color: r.lastSync ? "#6b7280" : "#ef4444" }}>
                                        {r.lastSync ? `${r.lastSync}` : t('catalogSync.notSynced')}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── PC: 기존 Table ── */
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1100 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 32 }}><input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(paged.map(r => r.id)) : new Set())} /></th>
                                <th style={{ width: 60 }}>{t('catalogSync.colImage')}</th>
                                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("id")}>ID<SortIco k="id" /></th>
                                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>{t('catalogSync.colProductName')}<SortIco k="name" /></th>
                                <th>{t('catalogSync.colCategory')}</th>
                                <th>{t('catalogSync.colSpec')}</th>
                                <th>{t('catalogSync.colUnit')}</th>
                                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("price")}>{t('catalogSync.colSalePrice')}<SortIco k="price" /></th>
                                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("purchaseCost")}>{t('catalogSync.colPurchaseCost')}<SortIco k="purchaseCost" /></th>
                                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("productCost")}>{t('catalogSync.colProductCost')}<SortIco k="productCost" /></th>
                                <th>{t('catalogSync.colMargin')}</th>
                                <th style={{ cursor: "pointer" }} onClick={() => toggleSort("inventory")}>{t('catalogSync.colStock')}<SortIco k="inventory" /></th>
                                <th>{t('catalogSync.colChannels')}</th>
                                <th>{t('catalogSync.colSync')}</th>
                                <th>{t('catalogSync.colStatus')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map(r => {
                                const margin = r.price > 0 ? (((r.price - (r.productCost || 0)) / r.price) * 100).toFixed(1) : null;
                                const marginColor = margin == null ? "#6b7280" : margin >= 30 ? "#22c55e" : margin >= 10 ? "#eab308" : "#ef4444";
                                return (
                                    <tr key={r.id} onClick={() => setDetail(r)} style={{ cursor: "pointer" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.04)"}
                                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                                        <td onClick={e => { e.stopPropagation(); toggleSel(r.id); }}>
                                            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
                                        </td>
                                        <td>
                                            {r.image && isImageUrl(r.image)
                                                ? <img src={r.image} alt={r.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", border: "1px solid rgba(99,140,255,0.2)" }} onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }} />
                                                : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(79,142,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{r.image && !isImageUrl(r.image) ? r.image : '🖼'}</div>}
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{r.id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{r.name}</div>
                                            <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{r.sku}</div>
                                            {/* [277차] 등록상품이 아닌 항목은 채널 전송 대상이 아니다(이미지·상세·고시 부재). */}
                                            {r._fallback && (
                                                <div style={{ fontSize: 9, color: "#f59e0b", marginTop: 2 }}>
                                                    ⚠️ {t('catalogSync.fallbackItem', '재고·채널에서 불러온 항목 (전송 불가)')}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 11, color: "#374151" }}>{r.category}</td>
                                        <td style={{ fontSize: 10, color: "#6b7280", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.spec || ""}>{r.spec || "-"}</td>
                                        <td style={{ fontSize: 11, color: "#374151", textAlign: "center" }}>
                                            <span style={{ fontWeight: 700, padding: "2px 7px", borderRadius: 20, fontSize: 9, background: r.unitType === 'box' ? 'rgba(79,142,247,0.12)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)', color: r.unitType === 'box' ? '#4f8ef7' : r.unitType === 'pl' ? '#f59e0b' : '#22c55e', border: `1px solid ${r.unitType === "box" ? "rgba(79,142,247,0.3)" : r.unitType === "pl" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.2)"}` }}>{r.unit || 'ea'}</span>
                                            {r.unitType === 'box' && r.eaPerBox > 1 && <div style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>1Box={r.eaPerBox}ea</div>}
                                            {r.unitType === 'pl' && <div style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>{r.boxPerPl}Box/{r.eaPerBox}ea</div>}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: 12, color: r.delta?.price ? "#f97316" : "#1f2937" }}>
                                                {fmtKRW(r.price)} {r.delta?.price && <span style={{ fontSize: 9 }}>{t('catalogSync.change')}</span>}
                                            </div>
                                            {r.comparePrice > 0 && <div style={{ fontSize: 10, color: "#6b7280", textDecoration: "line-through" }}>{fmtKRW(r.comparePrice)}</div>}
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontSize: 11, color: "#a78bfa" }}>{fmtKRW(r.purchaseCost)}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#f97316" }}>{fmtKRW(r.productCost)}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: marginColor }}>{margin != null ? `${margin}%` : "-"}</td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <div style={{ width: 44, height: 4, background: '#ffffff', borderRadius: 4 }}>
                                                    <div style={{ width: `${Math.min(100, (r.inventory / 350) * 100)}%`, height: "100%", background: r.inventory < 20 ? "#ef4444" : r.inventory < 80 ? "#eab308" : "#22c55e", borderRadius: 4 }} />
                                                </div>
                                                <span style={{ fontSize: 10, fontFamily: "monospace", color: r.delta?.inventory ? "#f97316" : "#374151" }}>
                                                    {fmtStock(r.inventory, r)}{r.delta?.inventory && " ●"}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                                {r.channels.map(cid => {
                                                    const c = ch(cid);
                                                    return <span key={cid} title={c.name} style={{ fontSize: 13 }}>{c.icon}</span>;
                                                })}
                                                {r.channels.length === 0 && <span style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.notIntegrated')}</span>}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 11, color: r.lastSync ? "#6b7280" : "#ef4444" }}>
                                            {r.lastSync || t('catalogSync.notSynced')}
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 9, background: statusColor(r.status) + "18", color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}33` }}>
                                                {t(r.status === "ok" ? 'catalogSync.statusNormal' : r.status === "warn" ? 'catalogSync.statusWarning' : 'catalogSync.statusError')}
                                            </span>
                                        </td>
                                    </tr>

                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{page * PAGE + 1}–{Math.min((page + 1) * PAGE, filtered.length)} / {filtered.length}</span>
                <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t('catalogSync.prevPage')}</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                        <button key={i} className={`btn-ghost ${i === page ? "btn-primary" : ""}`} style={{ padding: "4px 8px", fontSize: 11, background: i === page ? "#4f8ef7" : "", color: i === page ? "#fff" : "" }} onClick={() => setPage(i)}>{i + 1}</button>
                    ))}
                    <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>{t('catalogSync.nextPage')}</button>
                </div>

                {/* Detail drawer */}
                {detail && <ProductDetail product={detail} onClose={() => setDetail(null)} />}

                {/* Register modal → PriceOpt 통합 완료 */}

                {/* Bulk Register modal */}
                {showBulkRegister && (
                    <BulkRegisterModal
                        selectedIds={selected}
                        products={products}
                        onClose={() => setShowBulkRegister(false)}
                        onApply={handleBulkRegister}
                    />
                )}

                {/* Bulk Price modal */}
                {showBulkPrice && (
                    <BulkPriceModal
                        selectedIds={selected}
                        products={products}
                        onClose={() => setShowBulkPrice(false)}
                        onApply={handleBulkPrice}
                    />
                )}
            </div>
        </div>
    );
});

/* ─── Product Detail Drawer ─────────────────────────────────────────────────── */
const ProductDetail = memo(function ProductDetail({ product: p, onClose }) {
    const { t } = useI18n();
    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    // [현 차수 P1] ★채널별 하드코딩 가격오프셋 제거 — 표시용 임의가(amazon+3000·coupang-2000·11st-1000)가
    //   260차에 실배선된 writeback payload 로 그대로 실채널 리스팅을 갱신·push 했다(사용자 미지정 임의가 유출).
    //   실 판매가(p.price) 를 사용한다. 채널별 최적가는 가격최적화(PriceOpt)에서 명시 산출·전파한다.
    const channelPrices = CHANNELS.filter(c => p.channels.includes(c.id)).map(c => ({
        ...c,
        price: p.price,
        stock: p.inventory,  // 197차: 채널별 재고 난수 조작 제거 — 실 재고 표시(가짜 변동 금지)
        lastSync: p.lastSync,
    }));

    // [현 차수 P2] 하드코딩 가짜 옵션(블랙/화이트·S~XL) 제거 — 실 상품 옵션이 있으면 사용, 없으면 미표시(허위 옵션 노출 차단).
    const options = (Array.isArray(p.options) && p.options.length) ? p.options : [
        // 폴백: 표시할 실 옵션이 없으면 빈 배열(아래 예시는 데모 전용 게이트).
        ...(IS_DEMO ? [{ name: t('catalogSync.optionColor'), values: ["블랙", "화이트", "네이비"] },
        { name: t('catalogSync.optionSize'), values: ["S", "M", "L", "XL"] }] : []),
    ];

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200, animation: "fadeIn 0.2s" }} />
            <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 500, background: "#ffffff", borderLeft: "1px solid rgba(99,140,255,0.2)", zIndex: 201, overflowY: "auto", padding: 26, animation: "slideIn 0.25s cubic-bezier(.4,0,.2,1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: "#1f2937" }}>{p.name}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7", marginTop: 2 }}>{p.sku}</div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>{p.category}</div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: "5px 10px" }}>✕</button>
                </div>

                {/* Product Image */}
                {p.image && (
                    <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16, marginBottom: 14, textAlign: "center" }}>
                        <img src={p.image} onError={e => { e.target.onerror = null; e.target.style.display = "none"; }} alt={p.name} style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 10, objectFit: "contain" }} />
                    </div>
                )}

                {/* Cost Price 구성 */}
                {(p.purchaseCost != null || p.productCost != null) && (
                    <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid rgba(249,115,22,0.2)", padding: 16, marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#f97316", marginBottom: 12 }}>{t('catalogSync.costBreakdown')}</div>
                        {[
                            [t('catalogSync.costPurchase'), p.purchaseCost, "#a78bfa"],
                            [t('catalogSync.costIO'), p.ioFee, "#60a5fa"],
                            [t('catalogSync.costStorage'), p.storageFee, "#34d399"],
                            [t('catalogSync.costHandling'), p.workFee, "#fbbf24"],
                            [t('catalogSync.costShipping'), p.shippingFee, "#f472b6"],
                        ].map(([label, val, color]) => val != null && (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                                <span style={{ fontSize: 11, color: "#374151" }}>{label}</span>
                                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color }}>{fmtKRW(val)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: "1px solid rgba(249,115,22,0.2)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{t('catalogSync.productCostTotal')}</span>
                            <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 900, color: "#f97316" }}>{fmtKRW(p.productCost)}</span>
                        </div>
                        {p.price > 0 && p.productCost != null && (
                            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "rgba(34,197,94,0.08)" }}>
                                <div style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.marginRate')}</div>
                                <div style={{ fontWeight: 900, fontSize: 16, color: "#22c55e", fontFamily: "monospace" }}>
                                    {(((p.price - p.productCost) / p.price) * 100).toFixed(1)}%
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Price by channel */}
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{t('catalogSync.channelPrice')}</div>
                    {channelPrices.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 16 }}>{c.icon}</span>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                            <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: c.color }}>{fmtKRW(c.price)}</span>
                            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.stockLabel')} {c.stock}</span>
                        </div>
                    ))}
                </div>

                {/* Options */}
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{t('catalogSync.optionsVariants')} ({p.variants})</div>
                    {options.map(o => (
                        <div key={o.name} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: "#374151", marginBottom: 5 }}>{o.name}</div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {o.values.map(v => <span key={v} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>{v}</span>)}
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: 10, fontSize: 11, color: "#6b7280" }}>{t('catalogSync.totalSkuCombo').replace('{{n}}', p.variants * 4)}</div>
                </div>

                {/* Inventory */}
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{t('catalogSync.stockStatus')}</div>
                    {[[t('catalogSync.availableStockLabel'), p.inventory, "#22c55e"], [t('catalogSync.reservedStockLabel'), IS_DEMO ? Math.floor(p.inventory * 0.15) : 0, "#eab308"], [t('catalogSync.safetyStockLabel'), IS_DEMO ? 20 : 0, "#4f8ef7"]].map(([l, v, c]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: "#374151" }}>{l}</span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: c, fontFamily: "monospace" }}>{v}</span>
                        </div>
                    ))}
                    <ProgressBar pct={(p.inventory / 350) * 100} color={p.inventory < 20 ? "#ef4444" : p.inventory < 80 ? "#eab308" : "#22c55e"} />
                </div>

                <button onClick={async (e) => {
                    // 260차: 죽은 버튼 실배선 — 이 상품을 등록 채널에 실제 writeback 동기화(기존 BulkRegister와 동일 엔드포인트)
                    const btn = e.currentTarget; const orig = btn.textContent;
                    btn.disabled = true; btn.textContent = t('catalogSync.syncing', '동기화 중…');
                    let ok = 0; const chs = (channelPrices || []);
                    for (const c of chs) {
                        try {
                            const d = await postJson(`/api/catalog/writeback/${encodeURIComponent(c.id)}/${encodeURIComponent(p.sku)}`,
                                { price: c.price ?? p.price, name: p.name, category: p.category, inventory: p.inventory, spec: p.spec, action: 'update' });
                            if (d && d.ok) ok++;
                        } catch { /* 채널 실패는 계속 */ }
                    }
                    btn.disabled = false; btn.textContent = orig;
                    alert(`${p.name}: ${ok}/${chs.length} ${t('catalogSync.syncRequested', '채널 동기화 요청 완료')}`);
                }} style={{ padding: "8px 16px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", width: "100%", marginBottom: 8 }}>{t('catalogSync.syncThisProduct')}</button>
                <button className="btn-ghost" style={{ width: "100%" }} onClick={onClose}>{t('catalogSync.close')}</button>
            </div>
            <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes stripe{from{background-position:0 0}to{background-position:32px 0}}`}</style>
        </>

    );
});

/* ─── SchedulePanel — 자동 동기화 스케줄 관리 ──────────────────────────────── */
const SchedulePanel = memo(function SchedulePanel({ t, addAlert }) {
    const { lang } = useI18n();
    const FREQ_OPTIONS = [
        { id: '30m', label: t('catalogSync.schedFreq30m', '30분마다') },
        { id: '1h', label: t('catalogSync.schedFreq1h', '1시간마다') },
        { id: '6h', label: t('catalogSync.schedFreq6h', '6시간마다') },
        { id: '12h', label: t('catalogSync.schedFreq12h', '12시간마다') },
        { id: '1d', label: t('catalogSync.schedFreqDaily', '매일') },
    ];
    const [schedules, setSchedules] = useState(() => {
        try { const s = tGet('geniego_sync_schedules'); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [freq, setFreq] = useState('6h');
    const [time, setTime] = useState('03:00');
    const [enabled, setEnabled] = useState(true);
    // [266차] 동기화 스케줄 운영 영속(테넌트 백엔드) — 기존 localStorage 병행.
    const wsRef = useRef(false);
    useEffect(() => { let a = true;
        if (wsEnabled) loadWorkspace('catalog_schedules').then(v => { if (a) { if (Array.isArray(v)) setSchedules(v); wsRef.current = true; } });
        else wsRef.current = true;
        return () => { a = false; };
    }, []); // eslint-disable-line
    useEffect(() => { if (wsEnabled && wsRef.current) saveWorkspace('catalog_schedules', schedules); }, [schedules]); // eslint-disable-line

    const saveSchedule = () => {
        const newSch = { id: `SCH-${Date.now()}`, freq, time, enabled, createdAt: new Date().toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR', { hour12: false }) };
        const updated = [...schedules, newSch];
        setSchedules(updated);
        try { tSet('geniego_sync_schedules', JSON.stringify(updated)); } catch { }
        addAlert({ type: 'success', msg: t('catalogSync.alertScheduleSaved', { freq: FREQ_OPTIONS.find(f => f.id === freq)?.label, time }) });
    };
    const deleteSchedule = (id) => {
        const updated = schedules.filter(s => s.id !== id);
        setSchedules(updated);
        try { tSet('geniego_sync_schedules', JSON.stringify(updated)); } catch { }
    };
    const toggleSchedule = (id) => {
        const updated = schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
        setSchedules(updated);
        try { tSet('geniego_sync_schedules', JSON.stringify(updated)); } catch { }
    };

    return (
        <div style={{ background: "#ffffff", borderRadius: 14, border: '1px solid rgba(168,85,247,0.2)', padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                {t('catalogSync.scheduleTitle', '자동 동기화 스케줄')}
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>{schedules.filter(s => s.enabled).length} {t('catalogSync.activeLabel')}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <select style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, width: 130 }} value={freq} onChange={e => setFreq(e.target.value)}>
                    {FREQ_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <input type="time" style={{ padding: '6px 10px', borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, width: 100 }} value={time} onChange={e => setTime(e.target.value)} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                    <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                    {t('catalogSync.schedEnabled', '활성화')}
                </label>
                <button onClick={saveSchedule} style={{ padding: '7px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#a855f7,#6366f1)', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                    {t('catalogSync.schedSaveBtn', '스케줄 저장')}
                </button>
            </div>
            {schedules.length > 0 && (
                <div style={{ display: 'grid', gap: 6 }}>
                    {schedules.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: s.enabled ? 'rgba(168,85,247,0.06)' : 'rgba(100,100,100,0.06)', border: `1px solid ${s.enabled ? 'rgba(168,85,247,0.2)' : 'rgba(100,100,100,0.15)'}`, opacity: s.enabled ? 1 : 0.5 }}>
                            <span style={{ fontSize: 14, cursor: 'pointer' }} onClick={() => toggleSchedule(s.id)}>{s.enabled ? '✅' : '⏸️'}</span>
                            <span style={{ fontWeight: 700, fontSize: 12, color: '#a855f7' }}>{FREQ_OPTIONS.find(f => f.id === s.freq)?.label}</span>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>@ {s.time}</span>
                            <span style={{ fontSize: 9, color: '#6b7280', marginLeft: 'auto' }}>{s.createdAt}</span>
                            <button onClick={() => deleteSchedule(s.id)} style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

/* ─── Tab: Sync Run ─────────────────────────────────────────────────────────── */
const SyncRunTab = memo(function SyncRunTab({ onJobCreated }) {
    const { t, lang } = useI18n();
    const { addAlert, isDemo } = useGlobalData();
    const dynamicChannels = useDynamicChannels();
    const [mode, setMode] = useState("incremental"); // full | incremental
    const [selChs, setSelChs] = useState(new Set(["shopify", "coupang"]));
    const [selScp, setSelScp] = useState(new Set(["inventory", "price"]));
    const [dryRun, setDryRun] = useState(false);
    const [running, setRunning] = useState(false);
    const [liveJob, setLiveJob] = useState(null);
    const intervalRef = useRef(null);

    const toggleCh = id => { const n = new Set(selChs); n.has(id) ? n.delete(id) : n.add(id); setSelChs(n); };
    const toggleScp = id => { const n = new Set(selScp); n.has(id) ? n.delete(id) : n.add(id); setSelScp(n); };

    const estimate = useMemo(() => {
        const base = mode === "full" ? 1800 : 200;
        const chMul = selChs.size || 1;
        const scpMul = selScp.size || 1;
        return Math.round(base * chMul * scpMul * 0.5);
    }, [mode, selChs, selScp]);

    const startSync = async () => {
        if (!selChs.size || !selScp.size) return;
        setRunning(true);
        const t0 = Date.now();
        const channels = [...selChs];
        const scope = [...selScp];

        // ── 데모(showcase): 진행률 애니메이션 시뮬레이션 ──────────────────────────
        if (isDemo) {
            const jobId = `JOB-${String(Math.floor(Math.random() * 9000) + 1000)}`;
            const job = { id: jobId, type: mode, scope, channels, status: "running", progress: 0, total: estimate, done: 0, errors: 0, startedAt: new Date().toLocaleTimeString(LANG_LOCALE_MAP[lang] || 'ko-KR'), duration: "—" };
            setLiveJob(job);
            let done = 0;
            intervalRef.current = setInterval(() => {
                const step = Math.floor(estimate * 0.04) + Math.floor(Math.random() * 20);
                done = Math.min(estimate, done + step);
                const prog = Math.round((done / estimate) * 100);
                const errors = Math.floor(done * 0.003);
                setLiveJob(j => ({ ...j, progress: prog, done, errors, duration: `${((Date.now() - t0) / 1000).toFixed(0)}s` }));
                if (done >= estimate) {
                    clearInterval(intervalRef.current);
                    setLiveJob(j => ({ ...j, status: "done", progress: 100, done: estimate }));
                    onJobCreated({ ...job, status: "done", progress: 100, done: estimate, duration: `${((Date.now() - t0) / 1000).toFixed(0)}s` });
                    setRunning(false);
                }
            }, 300);
            return;
        }

        // ── 운영: 채널별 실 동기화 API 호출. 가짜 진행률 없이 실측 결과(상품+주문 수)만 집계 ──
        const jobId = `JOB-${t0.toString().slice(-7)}`;
        const job = { id: jobId, type: mode, scope, channels, status: "running", progress: 0, total: channels.length, done: 0, errors: 0, startedAt: new Date().toLocaleTimeString(LANG_LOCALE_MAP[lang] || 'ko-KR'), duration: "—" };
        setLiveJob(job);
        let processed = 0, synced = 0, errors = 0, lastNote = null;
        for (const ch of channels) {
            try {
                const r = await postJson(`/api/channel-sync/${encodeURIComponent(ch)}/sync`, { scope, mode });
                if (r?.ok) synced += (Number(r.product_count) || 0) + (Number(r.order_count) || 0);
                else errors += 1;
                if (r?.note) lastNote = r.note;
            } catch (e) {
                errors += 1;
            }
            processed += 1;
            setLiveJob(j => ({ ...j, progress: Math.round((processed / channels.length) * 100), done: synced, errors, duration: `${((Date.now() - t0) / 1000).toFixed(0)}s` }));
        }
        const finalJob = { ...job, status: "done", progress: 100, done: synced, errors, duration: `${((Date.now() - t0) / 1000).toFixed(0)}s` };
        setLiveJob(finalJob);
        onJobCreated(finalJob);
        if (lastNote && addAlert) addAlert({ type: 'info', msg: `${t('catalogSync.syncRun', '동기화')}: ${lastNote}` });
        setRunning(false);
    };

    useEffect(() => () => clearInterval(intervalRef.current), []);

    const statusColor2 = s => s === "done" ? "#22c55e" : s === "running" ? "#4f8ef7" : "#eab308";

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Mode selector */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                    { k: "full", icon: "⬇", label: t('catalogSync.fullSync'), desc: t('catalogSync.fullSyncDesc'), time: "~20min" },
                    { k: "incremental", icon: "⚡", label: t('catalogSync.incrementalSync'), desc: t('catalogSync.incrementalSyncDesc'), time: "~1min" },
                ].map(m => (
                    <div key={m.k} onClick={() => setMode(m.k)} style={{ padding: "14px 16px", borderRadius: 12, cursor: "pointer", border: `2px solid ${mode === m.k ? "#4f8ef7" : "rgba(99,140,255,0.12)"}`, background: mode === m.k ? "rgba(79,142,247,0.06)" : "#ffffff", transition: "all 200ms" }}>
                        <div style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: mode === m.k ? "#4f8ef7" : "#1f2937" }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>{m.desc}</div>
                        <div style={{ marginTop: 8, fontSize: 10, color: mode === m.k ? "#4f8ef7" : "#6b7280", fontWeight: 700 }}>{t('catalogSync.estTime')}: {m.time}</div>
                    </div>
                ))}
            </div>

            {/* Channel & Scope */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{t('catalogSync.targetChannels')}</div>
                    {dynamicChannels.map(c => (
                        <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                            <input type="checkbox" checked={selChs.has(c.id)} onChange={() => toggleCh(c.id)} />
                            <span style={{ fontSize: 15 }}>{c.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                        </label>
                    ))}
                </div>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{t('catalogSync.syncScope')}</div>
                    {SYNC_SCOPES.map(s => (
                        <label key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                            <input type="checkbox" style={{ marginTop: 2 }} checked={selScp.has(s.id)} onChange={() => toggleScp(s.id)} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.icon} {t(`catalogSync.${s.labelKey}`)}</div>
                                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{t(`catalogSync.${s.descKey}`)}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Options & estimate */}
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}>
                    <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
                    <span>{t('catalogSync.dryRun')}</span>
                </label>
                <div style={{ marginLeft: "auto", fontSize: 11, color: "#6b7280" }}>
                    {t('catalogSync.estItemCountLabel')}: <b style={{ color: "#4f8ef7" }}>{estimate.toLocaleString()}</b>
                </div>
                <button style={{ padding: "8px 16px", borderRadius: 8, background: running ? "rgba(79,142,247,0.4)" : "linear-gradient(135deg,#4f8ef7,#a855f7)", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", minWidth: 140 }} onClick={startSync} disabled={running || !selChs.size || !selScp.size}>
                    {running ? t('catalogSync.syncing') : dryRun ? t('catalogSync.dryRunStartBtn') : t('catalogSync.syncStartBtn')}
                </button>
            </div>

            {/* Live progress */}
            {liveJob && (
                <div style={{ background: "#ffffff", borderRadius: 14, padding: 16, border: `1px solid ${statusColor2(liveJob.status)}33` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{liveJob.id}</span>
                            <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: 9 }}>{liveJob.type === "full" ? t('catalogSync.fullLabel') : t('catalogSync.incrementalLabel')}</span>
                            {dryRun && <span className="badge badge-yellow" style={{ marginLeft: 4, fontSize: 9 }}>DRY-RUN</span>}
                        </div>
                        <span style={{ fontSize: 11, color: statusColor2(liveJob.status), fontWeight: 700 }}>
                            {liveJob.status === "running" ? `⏳ ${liveJob.progress}%` : t('catalogSync.syncDoneLabel')}
                        </span>
                    </div>
                    <ProgressBar pct={liveJob.progress} color={statusColor2(liveJob.status)} />
                    <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 11, color: "#6b7280" }}>
                        <span>{t('catalogSync.processed')}: <b style={{ color: "#1f2937" }}>{liveJob.done.toLocaleString()} / {liveJob.total.toLocaleString()}</b></span>
                        <span>{t('catalogSync.errors')}: <b style={{ color: liveJob.errors > 0 ? "#ef4444" : "#22c55e" }}>{liveJob.errors}</b></span>
                        <span>{t('catalogSync.elapsed')}: <b style={{ color: "#1f2937" }}>{liveJob.duration}</b></span>
                    </div>
                    {liveJob.status === "running" && (
                        <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(79,142,247,0.05)", borderRadius: 8, fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>
                            [{new Date().toLocaleTimeString(LANG_LOCALE_MAP[lang] || 'ko-KR')}] [{liveJob.channels.join(",")}] {liveJob.scope.join("+")} {t('catalogSync.syncInProgress')}
                        </div>
                    )}
                </div>
            )}

            {/* ─── Scheduling UI ────────────────────────────────── */}
            <SchedulePanel t={t} addAlert={addAlert} />
        </div>
    );
});

/* ─── Tab: Price Sync ─────────────────────────────────────────────────────────── */
const PriceSyncTab = memo(function PriceSyncTab() {
    const { t } = useI18n();
    const dynamicChannels = useDynamicChannels();
    const [globalMarkup, setGlobalMarkup] = useState(0);
    const [rounding, setRounding] = useState("900");
    const [exchangeRate, setExchangeRate] = useState(1320);
    const [channelRules, setChannelRules] = useState(
        Object.fromEntries(dynamicChannels.map(c => {
            const rate = CHANNEL_RATES[c.id] || { commission: 0.10, vat: 0.00 };
            return [c.id, { enabled: true, markup: 0, minMargin: 15, commission: Math.round(rate.commission * 100), vat: Math.round(rate.vat * 100) }];
        }))
    );
    const [preview, setPreview] = useState(false);

    const updateRule = (cid, k, v) => setChannelRules(r => ({ ...r, [cid]: { ...r[cid], [k]: v } }));

    // [266차] 가격규칙 운영 영속(테넌트 백엔드) — 마운트 로드 + 변경 저장(데모=no-op).
    const wsRef = useRef(false);
    useEffect(() => { let a = true;
        if (wsEnabled) loadWorkspace('catalog_price_rules').then(v => { if (a) { if (v && typeof v === 'object') { if (v.globalMarkup != null) setGlobalMarkup(v.globalMarkup); if (v.rounding != null) setRounding(v.rounding); if (v.exchangeRate != null) setExchangeRate(v.exchangeRate); if (v.channelRules && typeof v.channelRules === 'object') setChannelRules(r => ({ ...r, ...v.channelRules })); } wsRef.current = true; } });
        else wsRef.current = true;
        return () => { a = false; };
    }, []); // eslint-disable-line
    useEffect(() => { if (wsEnabled && wsRef.current) saveWorkspace('catalog_price_rules', { globalMarkup, rounding, exchangeRate, channelRules }); }, [globalMarkup, rounding, exchangeRate, channelRules]); // eslint-disable-line

    // 신규 채널이 dynamicChannels에 추가되면 channelRules에도 자동 반영
    useEffect(() => {
        setChannelRules(prev => {
            let updated = { ...prev };
            let changed = false;
            dynamicChannels.forEach(c => {
                if (!updated[c.id]) {
                    const rate = CHANNEL_RATES[c.id] || { commission: 0.10, vat: 0.00 };
                    updated[c.id] = { enabled: true, markup: 0, minMargin: 15, commission: Math.round(rate.commission * 100), vat: Math.round(rate.vat * 100) };
                    changed = true;
                }
            });
            return changed ? updated : prev;
        });
    }, [dynamicChannels]);

    const samplePrices = useMemo(() => {
        const baseCost = 60000;
        return dynamicChannels.map(c => {
            const r = channelRules[c.id] || { enabled: true, markup: 0, minMargin: 15, commission: 10, vat: 0 };
            const commRate = (r.commission || 0) / 100;
            const vatRate = (r.vat || 0) / 100;
            // 추천 판매가: cost / (1 - commission - vat - margin)
            const targetMargin = (r.minMargin || 15) / 100;
            const denom = 1 - commRate - vatRate - targetMargin;
            const rawPrice = denom > 0 ? Math.ceil(baseCost / denom) : baseCost * 3;
            // 마크업 적용
            const marked = Math.round(rawPrice * (1 + (globalMarkup + (r.markup || 0)) / 100));
            // 라운딩 적용
            const rounded = rounding === "900" ? Math.ceil(marked / 1000) * 1000 - 100
                : rounding === "990" ? Math.ceil(marked / 1000) * 1000 - 10
                    : marked;
            // 실질 마진 계산: (판매가 - 수수료 - 세금 - 원가) / 판매가
            const commAmt = rounded * commRate;
            const vatAmt = rounded * vatRate;
            const netMargin = ((rounded - commAmt - vatAmt - baseCost) / rounded * 100).toFixed(1);
            return { ...c, baseCost, final: rounded, margin: netMargin, ok: parseFloat(netMargin) >= (r.minMargin || 15), commRate, vatRate, commAmt: Math.round(commAmt), vatAmt: Math.round(vatAmt) };
        });
    }, [globalMarkup, rounding, channelRules, dynamicChannels]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
            <div style={{ padding: "18px 24px 24px", flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gap: 16, alignContent: "start" }}>
                {/* Global settings */}
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{t('catalogSync.tabPriceRules')}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.globalMarkup')}</label>
                            <input style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12 }} type="number" value={globalMarkup} onChange={e => setGlobalMarkup(+e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.rounding')}</label>
                            <select style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12 }} value={rounding} onChange={e => setRounding(e.target.value)}>
                                <option value="none">None</option>
                                <option value="900">{t('catalogSync.rounding900')}</option>
                                <option value="990">{t('catalogSync.rounding990')}</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.exchangeRate')}</label>
                            <input style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12 }} type="number" value={exchangeRate} onChange={e => setExchangeRate(+e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Channel rules — 수수료/세금 자동 반영 */}
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{t('catalogSync.channelMarkup')}</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 12, lineHeight: 1.5 }}>
                        💡 {t('catalogSync.commissionAutoApplyDesc', '채널별 판매 수수료율과 세금은 CHANNEL_RATES 정책에서 자동 적용됩니다. 직접 수정도 가능합니다.')}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th>{t('catalogSync.colChannels')}</th>
                                    <th>{t('catalogSync.enabled')}</th>
                                    <th style={{ color: '#f59e0b' }}>{t('catalogSync.colCommission', '수수료(%)')}</th>
                                    <th style={{ color: '#6366f1' }}>{t('catalogSync.colVatTax', 'VAT/세금(%)')}</th>
                                    <th>{t('catalogSync.channelMarkup')}</th>
                                    <th>{t('catalogSync.minMargin')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dynamicChannels.map(c => {
                                    const r = channelRules[c.id] || { enabled: true, markup: 0, minMargin: 15, commission: 10, vat: 0 };
                                    const rateSource = CHANNEL_RATES[c.id];
                                    return (
                                        <tr key={c.id} style={{ opacity: r.enabled ? 1 : 0.4 }}>
                                            <td>
                                                <span style={{ fontSize: 14 }}>{c.icon}</span> {c.name}
                                                {c.connected && <span style={{ fontSize: 9, color: '#22c55e', marginLeft: 4 }}>✅</span>}
                                                {c.autoAdded && <span style={{ fontSize: 8, color: '#a855f7', marginLeft: 4 }}>NEW</span>}
                                                {rateSource && <span style={{ fontSize: 8, color: '#4f8ef7', marginLeft: 4 }}>{rateSource.region}</span>}
                                            </td>
                                            <td><input type="checkbox" checked={r.enabled} onChange={e => updateRule(c.id, "enabled", e.target.checked)} /></td>
                                            <td><input style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: '#f59e0b', fontSize: 12, width: 70, fontWeight: 700 }} type="number" value={r.commission} step="0.1" onChange={e => updateRule(c.id, "commission", +e.target.value)} /></td>
                                            <td><input style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: '#6366f1', fontSize: 12, width: 70, fontWeight: 700 }} type="number" value={r.vat} step="0.1" onChange={e => updateRule(c.id, "vat", +e.target.value)} /></td>
                                            <td><input style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, width: 70 }} type="number" value={r.markup} onChange={e => updateRule(c.id, "markup", +e.target.value)} /></td>
                                            <td><input style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, width: 70 }} type="number" value={r.minMargin} onChange={e => updateRule(c.id, "minMargin", +e.target.value)} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Price preview — 수수료/세금 반영된 실질 마진 */}
                <button style={{ padding: "8px 16px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", alignSelf: "flex-start" }} onClick={() => setPreview(p => !p)}>
                    {preview ? t('catalogSync.closePreview') : t('catalogSync.openPricePreview')}
                </button>
                {preview && (
                    <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                            {t('catalogSync.previewPrices')} <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>({t('catalogSync.baseCostLabel')} {fmtKRW(60000)})</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead><tr>
                                    <th>{t('catalogSync.colChannels')}</th>
                                    <th>{t('catalogSync.finalPrice')}</th>
                                    <th style={{ color: '#f59e0b' }}>{t('catalogSync.colCommission', '수수료')}</th>
                                    <th style={{ color: '#6366f1' }}>{t('catalogSync.colVatTax', 'VAT')}</th>
                                    <th>{t('catalogSync.marginResult')}</th>
                                    <th>{t('catalogSync.minMargin')}</th>
                                </tr></thead>
                                <tbody>
                                    {samplePrices.map(r => (
                                        <tr key={r.id}>
                                            <td>{r.icon} {r.name}</td>
                                            <td style={{ fontFamily: "monospace", fontWeight: 700, color: r.color }}>{fmtKRW(r.final)}</td>
                                            <td style={{ fontFamily: "monospace", color: '#f59e0b' }}>{fmtKRW(r.commAmt)} ({Math.round(r.commRate * 100)}%)</td>
                                            <td style={{ fontFamily: "monospace", color: '#6366f1' }}>{fmtKRW(r.vatAmt)} ({Math.round(r.vatRate * 100)}%)</td>
                                            <td style={{ fontFamily: "monospace", fontWeight: 700, color: r.ok ? "#22c55e" : "#ef4444" }}>{r.margin}%</td>
                                            <td><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>{r.ok ? "✓" : "✗"}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

/* ─── Tab: Stock Sync ─────────────────────────────────────────────────────────── */
const InventorySyncTab = memo(function InventorySyncTab() {
    const { t } = useI18n();
    const dynamicChannels = useDynamicChannels();
    const [threshold, setThreshold] = useState(20);
    const [reserve, setReserve] = useState(10);
    const [strategy, setStrategy] = useState("proportional");

    // [266차] 재고 동기화 설정 운영 영속.
    const wsRef = useRef(false);
    useEffect(() => { let a = true;
        if (wsEnabled) loadWorkspace('catalog_inventory').then(v => { if (a) { if (v && typeof v === 'object') { if (v.threshold != null) setThreshold(v.threshold); if (v.reserve != null) setReserve(v.reserve); if (v.strategy) setStrategy(v.strategy); } wsRef.current = true; } });
        else wsRef.current = true;
        return () => { a = false; };
    }, []); // eslint-disable-line
    useEffect(() => { if (wsEnabled && wsRef.current) saveWorkspace('catalog_inventory', { threshold, reserve, strategy }); }, [threshold, reserve, strategy]); // eslint-disable-line

    const lowStock = PRODUCTS_INIT.filter(p => p.inventory < 80).slice(0, 8);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.stockThreshold')}</label>
                    <input type="number" value={threshold} onChange={e => setThreshold(+e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, marginTop: 4 }} />
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>{t('catalogSync.thresholdDesc')}</div>
                </div>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.reserveQty')}</label>
                    <input type="number" value={reserve} onChange={e => setReserve(+e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, marginTop: 4 }} />
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>{t('catalogSync.reserveDesc')}</div>
                </div>
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                    <label style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t('catalogSync.strategyLabel')}</label>
                    <select value={strategy} onChange={e => setStrategy(e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, marginTop: 4 }}>
                        <option value="proportional">{t('catalogSync.strategyProportional')}</option>
                        <option value="priority">{t('catalogSync.strategyPriority')}</option>
                        <option value="equal">{t('catalogSync.strategyEqual')}</option>
                        <option value="manual">{t('catalogSync.strategyManual')}</option>
                    </select>
                </div>
            </div>
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#eab308", marginBottom: 12 }}>{t('catalogSync.lowStockAlertTitle', { n: lowStock.length })}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr><th>{t('catalogSync.colSkuHeader')}</th><th>{t('catalogSync.colProductNameHeader')}</th><th>{t('catalogSync.currentStock')}</th><th>{t('catalogSync.colStatusHeader')}</th><th>{t('catalogSync.afterDistribution')}</th></tr></thead>
                    <tbody>
                        {lowStock.map(p => {
                            const avail = Math.max(0, p.inventory - reserve);
                            const color = p.inventory <= threshold ? "#ef4444" : "#eab308";
                            return (
                                <tr key={p.id}>
                                    <td style={{ fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{p.sku}</td>
                                    <td style={{ fontSize: 12 }}>{p.name}</td>
                                    <td style={{ fontWeight: 700, color, fontFamily: "monospace" }}>{p.inventory}</td>
                                    <td>
                                        <span style={{ fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 9, color, background: color + "18", border: `1px solid ${color}33` }}>
                                            {p.inventory <= threshold ? t('catalogSync.nearOutOfStockLabel') : t('catalogSync.warningLabel')}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: 11 }}>
                                        {/* [현 차수] 죽은 strategy 선택자 수정 — 균등분배만 하던 것 → 전략별 실분배(비례/우선/균등/수동). */}
                                        {(() => {
                                            const n = p.channels.length || 1; let d;
                                            if (strategy === 'priority') { d = Array.from({ length: n }, (_, i) => i === 0 ? Math.floor(avail * 0.5) : Math.floor(avail * 0.5 / Math.max(1, n - 1))); }
                                            else if (strategy === 'proportional') { const w = Array.from({ length: n }, (_, i) => n - i), sw = w.reduce((a, b) => a + b, 0); d = w.map(x => Math.floor(avail * x / sw)); }
                                            else { d = Array.from({ length: n }, () => Math.floor(avail / n)); } // equal / manual
                                            return p.channels.map((cid, ci) => `${ch(cid).icon}${Math.max(0, d[ci] || 0)}`).join("  ");
                                        })()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

/* ─── Tab: Actions 이력 ─────────────────────────────────────────────────────────── */
const JobHistoryTab = memo(function JobHistoryTab({ jobs }) {
    const { t } = useI18n();
    return (
        <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.jobId')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.type')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.colChannels')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.scope')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.processed')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.errors')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.progress')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>Status</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.startTime')}</th>
                        <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280" }}>{t('catalogSync.duration')}</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.slice().reverse().map(j => (
                        <tr key={j.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11, color: "#4f8ef7" }}>{j.id}</td>
                            <td style={{ padding: "8px" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#dbeafe", color: "#2563eb" }}>{j.type === "full" ? t('catalogSync.fullLabel') : t('catalogSync.incrementalLabel')}</span></td>
                            <td style={{ padding: "8px", fontSize: 11 }}>{j.channels.map(c => ch(c).icon).join(" ")}</td>
                            <td style={{ padding: "8px", fontSize: 10, color: "#6b7280" }}>{j.scope.join(", ")}</td>
                            <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11 }}>{j.done?.toLocaleString()} / {j.total?.toLocaleString()}</td>
                            <td style={{ padding: "8px", color: j.errors > 0 ? "#ef4444" : "#22c55e", fontFamily: "monospace", fontSize: 11 }}>{j.errors}</td>
                            <td style={{ padding: "8px", minWidth: 80 }}><ProgressBar pct={j.progress} color={j.status === "done" ? "#22c55e" : "#4f8ef7"} /></td>
                            <td style={{ padding: "8px" }}><span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: j.status === "done" ? "#d1fae5" : j.status === "running" ? "#dbeafe" : "#fee2e2", color: j.status === "done" ? "#22c55e" : j.status === "running" ? "#2563eb" : "#ef4444" }}>{j.status === "done" ? t('catalogSync.done') : j.status === "running" ? t('catalogSync.runningStatus') : t('catalogSync.statusError')}</span></td>
                            <td style={{ padding: "8px", fontSize: 11, color: "#6b7280" }}>{j.startedAt}</td>
                            <td style={{ padding: "8px", fontSize: 11, color: "#6b7280" }}>{j.duration}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {jobs.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>{t('catalogSync.noHistory')}</div>}
        </div>
    );
});
/* ─── Tab: Category Mapping (Enterprise Grade — Custom CRUD + localStorage) ─ */
const CategoryMappingTab = memo(function CategoryMappingTab() {
    const { t } = useI18n();
    const dynamicChannels = useDynamicChannels();
    const connectedChs = useMemo(() => dynamicChannels.filter(c => c.connected).slice(0, 5).length > 0 ? dynamicChannels.filter(c => c.connected).slice(0, 5) : dynamicChannels.slice(0, 5), [dynamicChannels]);

    // Load custom categories from localStorage
    const [customCats, setCustomCats] = useState(() => {
        try { return JSON.parse(tGet('genie_catalog_custom_cats') || '[]'); } catch { return []; }
    });

    // Merge preset + custom categories
    const allCategories = useMemo(() => {
        const presets = CATEGORIES.filter(c => c.id).map(c => ({ ...c, isCustom: false }));
        const customs = customCats.map(c => ({ id: c.id, labelKey: null, label: c.label, isCustom: true }));
        return [...presets, ...customs];
    }, [customCats]);

    const [mappings, setMappings] = useState(() => {
        // Load saved mappings from localStorage
        try {
            const saved = JSON.parse(tGet('genie_catalog_mappings') || 'null');
            if (saved && Array.isArray(saved)) return saved;
        } catch { }
        return allCategories.map(c => ({
            internal: c.id,
            labelKey: c.labelKey,
            label: c.label || null,
            isCustom: c.isCustom || false,
            channels: Object.fromEntries(connectedChs.map(ch => [ch.id, ''])),
        }));
    });
    const [toast, setToast] = useState(null);
    const [newCatId, setNewCatId] = useState('');
    const [newCatLabel, setNewCatLabel] = useState('');

    // Persist mappings to localStorage on change
    useEffect(() => {
        tSet('genie_catalog_mappings', JSON.stringify(mappings));
    }, [mappings]);

    // Persist custom categories to localStorage
    useEffect(() => {
        tSet('genie_catalog_custom_cats', JSON.stringify(customCats));
    }, [customCats]);

    // BroadcastChannel: sync categories across tabs
    useEffect(() => {
        const bc = new BroadcastChannel(tChannelName('genie_catalog_sync'));
        bc.onmessage = (e) => {
            if (e.data?.type === 'CATEGORY_UPDATE') {
                setCustomCats(e.data.customCats || []);
                setMappings(e.data.mappings || []);
            }
        };
        return () => bc.close();
    }, []);

    // [266차] 카테고리 매핑 운영 영속(테넌트 백엔드) — 추가/삭제/저장 시 자동 동기(기존 localStorage 병행).
    const wsRef = useRef(false);
    useEffect(() => { let a = true;
        if (wsEnabled) loadWorkspace('catalog_category_map').then(v => { if (a) { if (v && typeof v === 'object') { if (Array.isArray(v.customCats)) setCustomCats(v.customCats); if (Array.isArray(v.mappings)) setMappings(v.mappings); } wsRef.current = true; } });
        else wsRef.current = true;
        return () => { a = false; };
    }, []); // eslint-disable-line
    useEffect(() => { if (wsEnabled && wsRef.current) saveWorkspace('catalog_category_map', { customCats, mappings }); }, [customCats, mappings]); // eslint-disable-line

    const broadcastUpdate = (newCustomCats, newMappings) => {
        try {
            const bc = new BroadcastChannel(tChannelName('genie_catalog_sync'));
            bc.postMessage({ type: 'CATEGORY_UPDATE', customCats: newCustomCats, mappings: newMappings });
            bc.close();
        } catch { }
    };

    const updateMapping = (catId, chId, value) => {
        setMappings(prev => prev.map(m =>
            m.internal === catId ? { ...m, channels: { ...m.channels, [chId]: value } } : m
        ));
    };

    const handleAddCategory = () => {
        if (!newCatId.trim() || !newCatLabel.trim()) return;
        if (allCategories.some(c => c.id === newCatId.trim())) return;
        const nc = { id: newCatId.trim(), label: newCatLabel.trim() };
        const updatedCats = [...customCats, nc];
        setCustomCats(updatedCats);
        const newMapping = { internal: nc.id, labelKey: null, label: nc.label, isCustom: true, channels: Object.fromEntries(connectedChs.map(ch => [ch.id, ''])) };
        setMappings(prev => [...prev, newMapping]);
        broadcastUpdate(updatedCats, [...mappings, newMapping]);
        setNewCatId(''); setNewCatLabel('');
        setToast(t('catalogSync.categoryAdded'));
        setTimeout(() => setToast(null), 3000);
    };

    const handleDeleteCategory = (catId) => {
        const updatedCats = customCats.filter(c => c.id !== catId);
        setCustomCats(updatedCats);
        const updatedMappings = mappings.filter(m => m.internal !== catId);
        setMappings(updatedMappings);
        broadcastUpdate(updatedCats, updatedMappings);
        setToast(t('catalogSync.categoryDeleted'));
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = () => {
        tSet('genie_catalog_mappings', JSON.stringify(mappings));
        broadcastUpdate(customCats, mappings);
        setToast(t('catalogSync.catMapSaved'));
        setTimeout(() => setToast(null), 3000);
    };

    const inputStyle = { width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#ffffff", color: "#1f2937", fontSize: 11 };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {toast && (
                <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 10, background: "#22c55e", color: "#fff", fontWeight: 700, fontSize: 13, zIndex: 500 }}>
                    {toast}
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1f2937" }}>{t('catalogSync.catMapTitle')}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{t('catalogSync.catMapDesc')}</div>
                </div>
                <button onClick={handleSave} style={{ padding: "8px 20px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    {t('catalogSync.save')}
                </button>
            </div>
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid rgba(99,140,255,0.15)", padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 16 }}>➕</span>
                <input style={{ ...inputStyle, flex: 1, maxWidth: 200 }} placeholder={t('catalogSync.addCategoryPh')} value={newCatId} onChange={e => setNewCatId(e.target.value)} />
                <input style={{ ...inputStyle, flex: 1, maxWidth: 250 }} placeholder={t('catalogSync.addCategoryLabelPh')} value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} />
                <button onClick={handleAddCategory} style={{ padding: "6px 14px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {t('catalogSync.addCustomCategory')}
                </button>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280", minWidth: 160 }}>{t('catalogSync.internalCategory')}</th>
                            {connectedChs.map(ch => (
                                <th key={ch.id} style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280", minWidth: 140 }}>
                                    <span style={{ fontSize: 14 }}>{ch.icon}</span> {ch.name} {ch.connected && <span style={{ fontSize: 8, color: "#22c55e" }}>✅</span>}
                                </th>
                            ))}
                            <th style={{ padding: "8px", textAlign: "left", fontSize: 10, color: "#6b7280", width: 80 }}>{t('catalogSync.mappingStatus')}</th>
                            <th style={{ width: 50 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {mappings.map(m => {
                            const mappedCount = Object.values(m.channels).filter(v => v).length;
                            const isMapped = mappedCount > 0;
                            const displayLabel = m.labelKey ? t(`catalogSync.${m.labelKey}`) : (m.label || m.internal);
                            return (
                                <tr key={m.internal} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "8px" }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, color: "#1f2937" }}>
                                            {displayLabel}
                                            {m.isCustom && <span style={{ fontSize: 8, marginLeft: 6, padding: "1px 5px", borderRadius: 4, background: "#dbeafe", color: "#2563eb" }}>{t('catalogSync.customCategoryLabel')}</span>}
                                        </div>
                                        <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{m.internal}</div>
                                    </td>
                                    {connectedChs.map(ch => (
                                        <td key={ch.id} style={{ padding: "8px" }}>
                                            <input

                                                style={inputStyle}
                                                placeholder={`${ch.name} categ...`}
                                                value={m.channels[ch.id] || ''}
                                                onChange={e => updateMapping(m.internal, ch.id, e.target.value)}
                                            />
                                        </td>
                                    ))}
                                    <td style={{ textAlign: "center" }}>
                                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                                            {isMapped ? `${t('catalogSync.mapped')} (${mappedCount})` : t('catalogSync.unmapped')}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        {m.isCustom && (
                                            <button onClick={() => handleDeleteCategory(m.internal)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 10, padding: "2px 6px" }} title={t('catalogSync.deleteCategory')}>
                                                🗑️
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

/* ─── Tab: Usage Guide ─────────────────────────────────────────────────────── */
const UsageGuideTab = memo(function UsageGuideTab() {
    const { t } = useI18n();
    const g = (k) => { const v = t('catalogSync.' + k, ''); return (v && !String(v).includes('catalogSync.')) ? v : ''; };
    const COLORS = ['#4f8ef7', '#22c55e', '#f59e0b', '#a855f7', '#6366f1', '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#e11d48', '#06b6d4', '#0ea5e9', '#f97316'];
    const ICONS = ['🔐', '🔗', '📚', '📝', '💰', '✅', '✏️', '⚙️', '🗂️', '🔄', '📋', '⏰', '🔔', '📊', '🚀'];
    const steps = [];
    for (let i = 1; i <= 15; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), icon: ICONS[i - 1], color: COLORS[(i - 1) % COLORS.length], n: i }); }
    const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
    const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
    const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
    const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
    const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* 배너 + 배지 */}
            <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, border: "1px solid #fed7aa", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('catalogSync.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('catalogSync.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
                </div>}
            </div>
            {/* 이용 대상 */}
            {g('guideAudienceTitle') ? <div style={card}><div style={secTitle}>👥 {g('guideAudienceTitle')}</div><div style={pre}>{g('guideAudienceDesc')}</div></div> : null}
            {/* 어디서 시작 */}
            {g('guideWhereToStart') ? <div style={card}><div style={secTitle}>🧭 {g('guideWhereToStart')}</div><div style={pre}>{g('guideWhereToStartDesc')}</div></div> : null}
            {/* 단계별 운영 가이드 */}
            <div style={card}>
                {g('guideStepsTitle') ? <div style={secTitle}>{g('guideStepsTitle')}</div> : null}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {steps.map((s) => (
                        <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* 전문가 팁 */}
            {tips.length > 0 && (
                <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.25)" }}>
                    <div style={secTitle}>💡 {t('catalogSync.guideTipsTitle')}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#ffffff", border: "1px solid rgba(34,197,94,0.12)" }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, WebkitTextFillColor: '#374151' }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* FAQ */}
            {faqs.length > 0 && (
                <div style={card}>
                    <div style={secTitle}>❓ {g('guideFaqTitle') || t('catalogSync.guideFaqTitle', '자주 묻는 질문')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {faqs.map((f, i) => (
                            <div key={i} style={{ padding: '12px 14px', background: 'rgba(241,245,249,0.6)', borderRadius: 10, border: '1px solid #eef2f7' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#4f8ef7', marginBottom: 5, WebkitTextFillColor: '#4f8ef7' }}>Q. {f.q}</div>
                                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>A. {f.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* 보안 및 권한 */}
            {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }}><div style={secTitle}>🛡️ {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
            {/* 운영 권장 사항 */}
            {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🗓️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
            {/* 완료 CTA */}
            {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6, color: '#1e293b', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyTitle')}</div>
                <div style={{ fontSize: 13, color: '#374151', maxWidth: 640, margin: '8px auto 0', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>{g('guideReadyDesc')}</div>
            </div> : null}
        </div>
    );
});

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function CatalogSync() {
    const { t } = useI18n();
    const { addAlert, inventory } = useGlobalData();
    const dynamicChannels = useDynamicChannels();
    const { connectedCount } = useConnectorSync();
    const { secBanner } = useCatalogSecurity();
    const [tab, setTab] = useState("catalog");
    const [jobs, setJobs] = useState([]);
    const addJob = useCallback(j => setJobs(prev => [...prev, j]), []);

    useEffect(() => {
        const bc = new BroadcastChannel(tChannelName('genie_product_sync'));
        bc.onmessage = (e) => {
            if (e.data?.type === 'PRODUCT_UPDATE' && e.data.source !== 'catalogSync') { }
        };
        return () => bc.close();
    }, []);

    const broadcastProducts = useCallback(() => {
        try {
            const bc = new BroadcastChannel(tChannelName('genie_product_sync'));
            bc.postMessage({ type: 'PRODUCT_UPDATE', source: 'catalogSync', ts: Date.now() });
            bc.close();
        } catch { }
    }, []);

    const TABS = useMemo(() => [
        { id: "catalog", label: `📚 ${t('catalogSync.tabCatalog')}` },
        { id: "sync", label: `🔄 ${t('catalogSync.tabSyncRun')}` },
        { id: "catmap", label: `🗂️ ${t('catalogSync.tabCategoryMapping')}` },
        { id: "price", label: `💰 ${t('catalogSync.tabPriceRules')}` },
        { id: "inventory", label: `📦 ${t('catalogSync.tabStockPolicy')}` },
        { id: "history", label: `📋 ${t('catalogSync.tabHistory')}` },
        { id: "guide", label: `📖 ${t('catalogSync.tabGuide')}` },
    ], [t]);

    const totalProducts = inventory?.length || PRODUCTS_INIT.length;
    const syncedProducts = (inventory?.length || PRODUCTS_INIT.length);
    const errorProducts = 0;
    const deltaProducts = 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
            <div style={{ padding: "18px 24px 0", flexShrink: 0 }}>
                {secBanner && (
                    <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 20 }}>🛡️</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#ef4444" }}>{t('catalogSync.securityBannerTitle')}</div>
                            <div style={{ fontSize: 11, color: "#374151" }}>{secBanner.type} — {secBanner.at} ({secBanner.count}회)</div>
                        </div>
                    </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, fontWeight: 700, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
                        🔗 {t('catalogSync.crossSyncActive')}
                    </span>
                </div>
                <div style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", borderRadius: 16, padding: "24px", border: "1px solid #bfdbfe", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#dbeafe,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "1px solid #bfdbfe" }}>🔄</div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: "#1e293b", textShadow: "0 1px 2px rgba(0,0,0,0.08)", WebkitTextFillColor: "#1e293b" }}>{t('catalogSync.heroTitle')}</div>
                            <div style={{ fontSize: 14, color: "#1e293b", marginTop: 4, fontWeight: 600, WebkitTextFillColor: "#1e293b" }}>{t('catalogSync.heroDesc')}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                        {dynamicChannels.map(c => (
                            <span key={c.id} style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: c.connected ? c.color + '18' : 'rgba(100,100,100,0.1)', color: c.connected ? c.color : '#6b7280', border: `1px solid ${c.connected ? c.color + '33' : 'rgba(100,100,100,0.2)'}`, opacity: c.connected ? 1 : 0.5 }}>
                                {c.icon} {c.name} {c.connected && '✅'}
                            </span>
                        ))}
                        {connectedCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>🔗 {connectedCount} {t('catalogSync.connectedLabel')}</span>}
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
                    {[
                        { l: t('catalogSync.kpiAllProducts'), v: totalProducts, c: "#4f8ef7" },
                        { l: t('catalogSync.kpiSyncDone'), v: syncedProducts, c: "#22c55e" },
                        { l: t('catalogSync.kpiChangeDetected'), v: deltaProducts, c: "#f97316" },
                        { l: t('catalogSync.kpiErrorProduct'), v: errorProducts, c: "#ef4444" },
                    ].map(({ l, v, c }, i) => (
                        <div key={i} style={{ padding: "10px 18px", borderRadius: 14, background: "#ffffff", border: "1px solid #e5e7eb", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{l}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div>
                            <ProgressBar pct={totalProducts > 0 ? (v / totalProducts) * 100 : 0} color={c} />
                        </div>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 4, padding: "5px", background: "#f1f5f9", borderRadius: 14, flexWrap: "wrap", marginBottom: 2 }}>
                    {TABS.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: tab === tb.id ? "#2563eb" : "#ffffff", color: tab === tb.id ? "#ffffff" : "#374151", transition: "all 150ms" }}>{tb.label}</button>
                    ))}
                </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
                {/* [현 차수] 특정상품 조회 — 전역 동기화. 선택 시 그 상품 매출·순이익·채널/국가별 인라인. */}
                <ProductSelectBar />
                <ProductMarketingPanel period="monthly" />
                {tab === "catalog" && <CatalogTab />}
                {tab === "sync" && <SyncRunTab onJobCreated={addJob} />}
                {tab === "catmap" && <CategoryMappingTab />}
                {tab === "price" && <PriceSyncTab />}
                {tab === "inventory" && <InventorySyncTab />}
                {tab === "history" && <JobHistoryTab jobs={jobs} />}
                {tab === "guide" && <UsageGuideTab />}
            </div>
        </div>
    );
}

