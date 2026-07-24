import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { tGet, tSet, tRemove, tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리
import { useNavigate } from 'react-router-dom'; // [286차] 재고 클릭 → WMS 입고등록 이동
import { IS_DEMO } from '../utils/demoEnv'; // [259차] 하드코딩 파생재고(예약/안전) 운영 미노출 게이트
import { useGlobalData } from '../context/GlobalDataContext';
import { useConnectorSync } from '../context/ConnectorSyncContext';
import { useI18n } from '../i18n/index.js';
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import { CHANNEL_RATES, calcRecommendedPrice as calcRecPrice } from '../constants/channelRates.js';
import { postJson, getJsonAuth, requestJsonAuth } from '../services/apiClient.js'; // 192차: 상품 writeback/bulk-price 실배선 · [277차] 등록상품 로드·카테고리 매핑 서버 실배선
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

/**
 * [277차] 상품 전송(writeback)을 실제로 지원하는 채널 — 카테고리 매핑이 의미 있는 대상.
 *   백엔드 ChannelSync::pushProduct 의 case 목록 + Catalog::pushToChannel 이 자체 처리하는 shopify 와 1:1.
 *   광고·미디어 커넥터(youtube 등)를 매핑 대상으로 보여주면 사용자를 혼란시킨다.
 */
const PUBLISHABLE_CHANNELS_UI = new Set([
    'shopify', 'cafe24', 'coupang', 'naver', 'naver_smartstore', 'ebay', 'amazon', 'amazon_spapi',
    'tiktok', 'tiktok_shop', 'rakuten', '11st', 'st11', 'gmarket', 'auction', 'lotteon',
    'woocommerce', 'magento', 'shopee', 'lazada', 'walmart', 'qoo10', 'yahoo_jp', 'godomall', 'etsy',
]);

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

/* [현 차수 B2] 등록 언어 옵션 — 프론트 15개 로케일과 1:1. ko=원문(번역 불요). 채널 등록 언어 선택·다국어 저장에 사용. */
const LANG_OPTS = [
    { code: 'ko', label: '한국어(원문)' }, { code: 'en', label: 'English' }, { code: 'ja', label: '日本語' },
    { code: 'zh', label: '简体中文' }, { code: 'zh-TW', label: '繁體中文' }, { code: 'de', label: 'Deutsch' },
    { code: 'th', label: 'ไทย' }, { code: 'vi', label: 'Tiếng Việt' }, { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'ar', label: 'العربية' }, { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' },
    { code: 'hi', label: 'हिन्दी' }, { code: 'pt', label: 'Português' }, { code: 'ru', label: 'Русский' },
];
const ALL_TRANSLATE_LANGS = LANG_OPTS.filter(l => l.code !== 'ko').map(l => l.code);

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
    // [현 차수 P0] 상품별 개별 판매가 지정(키 `${chId}::${sku}`) — 채널 일괄가보다 우선.
    const [prodPrices, setProdPrices] = useState({});
    const [approved, setApproved] = useState(false);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    // [277차] 채널이 반환한 실제 결과(성공/실패 사유). 종전엔 console 로만 흘려 화면은 성공처럼 보였다.
    const [results, setResults] = useState([]);
    const [retrying, setRetrying] = useState('');
    // [현 차수 B2] 등록 언어 — 선택 언어의 번역본(po_product_i18n)으로 채널에 현지 등록. 'ko'=원문.
    const [regLang, setRegLang] = useState('ko');
    const [translating, setTranslating] = useState(false);
    const [transStatus, setTransStatus] = useState('');

    /**
     * [현 차수 B2] 선택 상품을 Claude 로 대상 언어들로 번역·저장(po_product_i18n).
     *   프록시 타임아웃 방지를 위해 요청당 언어를 배치(3개)로 나눠 상품×배치 단위로 순차 호출·진행률 표시.
     *   ko(원문)는 서버가 자동 보관하므로 제외. AI 키 미설정이면 서버가 정직하게 거절 → 사용자에 고지(fake-green 금지).
     */
    const runTranslate = async (targetLangs) => {
        const langs = (targetLangs || []).filter(l => l && l !== 'ko');
        if (!langs.length || !selProds.length) return;
        setTranslating(true);
        setTransStatus('');
        const CH = 3;
        const totalUnits = selProds.length * Math.ceil(langs.length / CH);
        let unit = 0, okCount = 0;
        const failLangs = new Set();
        for (const p of selProds) {
            for (let i = 0; i < langs.length; i += CH) {
                const chunk = langs.slice(i, i + CH);
                unit++;
                setTransStatus(t('catalogSync.translatingUnit', '번역 중')
                    + ` ${unit}/${totalUnits} · ${p.name} [${chunk.join(',')}]`);
                try {
                    const d = await postJson('/api/catalog/translate', { sku: p.sku, langs: chunk });
                    if (d && d.error === 'ai_not_configured') {
                        setTransStatus(d.message || t('catalogSync.aiNotConfigured', 'AI 번역 키가 설정되지 않았습니다. 연동 → AI 설정에서 키를 등록하세요.'));
                        setTranslating(false);
                        return;
                    }
                    if (d && Array.isArray(d.translated)) okCount += d.translated.length;
                    (d && Array.isArray(d.failed) ? d.failed : []).forEach(l => failLangs.add(l));
                } catch { chunk.forEach(l => failLangs.add(l)); }
            }
        }
        setTranslating(false);
        setTransStatus(t('catalogSync.translateDone', '번역 완료')
            + ` · ${t('catalogSync.translateSuccess', '성공')} ${okCount}`
            + (failLangs.size ? ` · ${t('catalogSync.translateRetry', '재시도 필요')}: ${[...failLangs].join(',')}` : ''));
    };

    /**
     * [277차] 카테고리 후보 선택 → 그 코드로 즉시 재전송.
     *   네이버 리프카테고리(5,011개)를 사용자가 손으로 찾는 것은 불가능하므로, 서버가 상품명 기반으로
     *   추린 후보를 눌러 바로 등록한다(선택 결과는 서버가 채널 카테고리 매핑에 학습 저장).
     */
    const retryWithCategory = async (r, code) => {
        const key = `${r.chId}:${r.sku}`;
        setRetrying(key);
        try {
            const prod = r.prod || {};
            const imgs = Array.isArray(prod.images) ? prod.images.filter(Boolean) : [];
            const d = await postJson(`/api/catalog/writeback/${encodeURIComponent(r.chId)}/${encodeURIComponent(r.sku)}`, {
                price: prod.price, name: prod.name, category: prod.category, inventory: prod.inventory, spec: prod.spec,
                detail_html: prod.detailHtml || '',
                image_url: (typeof prod.image === 'string' && /^(https?:|data:)/.test(prod.image)) ? prod.image : (imgs[0] || ''),
                images: imgs,
                brand: prod.brand || '',   // [286차] 브랜드 전송 누락 수정(handleApply 와 동일)
                ...(prod._meta || {}),
                category_code: code,
                lang: regLang,   // [현 차수 B2] 등록 언어(번역본 있으면 서버가 현지 콘텐츠로 치환)
                action: 'register',
            });
            setResults(prev => prev.map(x => (x.chId === r.chId && x.sku === r.sku)
                ? { ...x, ok: !!d.ok, status: d.status, error: d.error || null, suggestions: d.category_suggestions || [] }
                : x));
        } catch (e) {
            setResults(prev => prev.map(x => (x.chId === r.chId && x.sku === r.sku)
                ? { ...x, ok: false, status: 'network_error', error: e.message } : x));
        } finally {
            setRetrying('');
        }
    };

    const selProds = products.filter(p => selectedIds.has(p.id));
    const toggleCh = id => { const n = new Set(selChs); n.has(id) ? n.delete(id) : n.add(id); setSelChs(n); };

    // Product Cost Average (Select Product 기준)
    const avgCost = useMemo(() => {
        if (!selProds.length) return 0;
        const sum = selProds.reduce((s, p) => s + (p.productCost || p.purchaseCost || 0), 0);
        return Math.round(sum / selProds.length);
    }, [selProds]);

    // [현 차수 P0] 상품별 원가 — 종전엔 선택 상품 전체의 '평균원가'로 채널당 단일 추천가를 만들고
    //   전송 루프가 모든 상품에 그 값을 그대로 써서, 원가가 다른 상품 N개를 선택해도 전부 같은
    //   판매가로 등록됐다(대량등록 판매가 1개 결함). 이제 각 상품 자신의 원가로 산출한다.
    const costOf = useCallback(p => Number(p.productCost || p.purchaseCost || 0) || 0, []);

    // 채널×상품 판매가 맵 — 우선순위: 상품별 지정가 > 채널 일괄가 > 상품 원가 기반 추천가.
    //   원가가 없는 항목(재고/채널 유래)은 기존 판매가를 보존(0원 등록 방지).
    const priceMap = useMemo(() => {
        const res = {};
        selChsArr.forEach(chId => {
            const margin = margins[chId] ?? 30;
            const bySku = {};
            selProds.forEach(p => {
                const cost = costOf(p);
                const rec = cost > 0 ? calcRecommendedPrice(cost, chId, margin) : (Number(p.price) || 0);
                bySku[p.sku] = prodPrices[`${chId}::${p.sku}`] ?? customPrices[chId] ?? rec;
            });
            res[chId] = bySku;
        });
        return res;
    }, [selChsArr, selProds, margins, customPrices, prodPrices, costOf]);

    const handleApply = async () => {
        if (!selChs.size) return;
        // [277차] 재고/채널 유래 항목(_fallback)은 이미지·상세·고시가 없어 **신규 등록**이 불가능하다.
        //   다만 채널에 이미 존재하는 상품이면 서버가 PUT(수정) 경로로 보내 가격·재고 변경은 성공한다.
        //   그래서 전면 차단하지 않고, 신규 등록 액션일 때만 등록상품을 요구한다(서버는 어차피 정직하게 거부).
        const sendable = selProds;
        const hasFallback = selProds.some(p => p._fallback);
        if (hasFallback && action === 'register') {
            const ok = window.confirm(t('catalogSync.fallbackRegisterWarn',
                '선택 항목 중 재고·채널에서 불러온 상품이 있습니다. 이미지·상세·상품정보제공고시가 없어 신규 등록은 실패합니다.\n(채널에 이미 있는 상품이면 가격·재고 수정은 반영됩니다)\n\n계속하시겠습니까?'));
            if (!ok) return;
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
                            price: priceMap[chId]?.[prod.sku] ?? prod.price,   // [현 차수 P0] 상품별 판매가(종전=채널당 단일가)
                            name: prod.name,
                            category: prod.category,
                            inventory: prod.inventory,
                            spec: prod.spec,
                            detail_html: prod.detailHtml || '',
                            image_url: (typeof prod.image === 'string' && /^(https?:|data:)/.test(prod.image)) ? prod.image : (imgs[0] || ''),
                            images: imgs,
                            brand: prod.brand || '',   // [286차] ★브랜드 전송 누락 수정 — 종전엔 _meta 에만 의존했는데 brand 는 top-level(r.brand)이라 미전송 → 11번가 "브랜드명 필요" 재발. 명시 전송.
                            ...(prod._meta || {}),   // [277차] 고시·배송/반품·AS·원산지·유효일(채널 필수)
                            lang: regLang,   // [현 차수 B2] 등록 언어(번역본 있으면 서버가 현지 콘텐츠로 치환)
                            action,
                        });
                        // [277차] 서버는 이제 동기 실행 후 **채널의 진짜 결과**를 준다(done/failed/queued + error).
                        //   종전엔 성공 개수만 세어, 채널이 거부해도 사용자는 이유를 알 수 없었다(문제 반복의 근본).
                        results.push({ chId, sku: prod.sku, ok: !!d.ok, status: d.status, error: d.error || null,
                                       warning: d.warning || null, missing: d.missing || null,
                                       imagesUploaded: d.images_uploaded ?? null,
                                       suggestions: d.category_suggestions || [], prod });
                        if (!d.ok) hasError = true;
                    } catch (e) {
                        results.push({ chId, sku: prod.sku, ok: false, status: 'network_error', error: e.message });
                        hasError = true;
                    }
                }
            }

            // 결과 반영 (Success한 항목만 onApply로 전달)
            const successChannels = [...new Set(results.filter(r => r.ok).map(r => r.chId))];
            onApply(action, successChannels.length > 0 ? successChannels : [...selChs], priceMap);
            setDone(true);
            // [277차] ★실패를 console.warn 으로만 흘려 화면은 성공처럼 보였다 — 같은 문제가 반복 신고된 직접 원인.
            //   채널이 준 실제 사유를 사용자에게 그대로 보여준다(모달 유지 → 사용자가 읽고 조치 가능).
            setResults(results);
            if (hasError) {
                console.warn('[CatalogSync] 일부 Channel writeback Failed:', results.filter(r => !r.ok));
                return;   // 자동 닫기 하지 않는다
            }
            setTimeout(onClose, 1500);
        } catch (err) {
            console.error('[CatalogSync] writeback Error:', err);
            setResults([{ chId: '-', sku: '-', ok: false, status: 'error', error: err.message }]);
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
        fontSize: 11, fontWeight: 700,
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

                        {/* [현 차수 B2] 등록 언어 — 선택 언어의 AI 번역본으로 채널에 현지 등록. 번역본 없으면 원문으로 등록(무회귀). */}
                        {action === "register" && (
                            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.18)", marginBottom: 16 }}>
                                <div style={{ fontWeight: 700, fontSize: 11, color: "#7c3aed", marginBottom: 8 }}>
                                    🌐 {t('catalogSync.registerLanguage', '등록 언어')}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                                    {LANG_OPTS.map(l => (
                                        <button key={l.code} type="button" onClick={() => setRegLang(l.code)}
                                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                                                border: `1px solid ${regLang === l.code ? "#7c3aed" : "rgba(124,58,237,0.2)"}`,
                                                background: regLang === l.code ? "rgba(124,58,237,0.12)" : "#ffffff",
                                                color: regLang === l.code ? "#7c3aed" : "#6b7280", fontWeight: regLang === l.code ? 700 : 400 }}>
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                                {regLang !== 'ko' && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                        <button type="button" disabled={translating || !selProds.length} onClick={() => runTranslate([regLang])}
                                            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, border: "none", cursor: translating ? "default" : "pointer",
                                                background: translating ? "rgba(124,58,237,0.3)" : "#7c3aed", color: "#ffffff", fontWeight: 700 }}>
                                            {translating ? t('catalogSync.translating', '번역 중…') : `🤖 ${t('catalogSync.translateThisLang', '이 언어로 AI 번역')}`}
                                        </button>
                                        <button type="button" disabled={translating || !selProds.length} onClick={() => runTranslate(ALL_TRANSLATE_LANGS)}
                                            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 7, cursor: translating ? "default" : "pointer",
                                                border: "1px solid rgba(124,58,237,0.4)", background: "#ffffff", color: "#7c3aed", fontWeight: 700 }}>
                                            🌍 {t('catalogSync.translateAll15', '15개국 전체 번역')}
                                        </button>
                                        <span style={{ fontSize: 10, color: "#9ca3af" }}>
                                            {t('catalogSync.translateHint', '번역본이 없으면 원문(한국어)으로 등록됩니다')}
                                        </span>
                                    </div>
                                )}
                                {transStatus && (
                                    <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 8, fontWeight: 600 }}>{transStatus}</div>
                                )}
                            </div>
                        )}

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
                                            {rate && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>{t('catalogSync.channelCommissionInfo', { commission: (rate.commission * 100).toFixed(0), vat: (rate.vat * 100).toFixed(0), region: rate.region })}</div>}
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
                                        const recPrice = calcRecommendedPrice(avgCost, chId, margin); // 채널 일괄가 입력 placeholder(평균원가 기준)
                                        // [현 차수 P0] 상품별 가격 — 채널당 단일가가 아니라 선택 상품 각각의 원가로 산출된 값의 분포를 보여준다.
                                        const chPrices = selProds.map(p => priceMap[chId]?.[p.sku] || 0).filter(v => v > 0);
                                        const minP = chPrices.length ? Math.min(...chPrices) : 0;
                                        const maxP = chPrices.length ? Math.max(...chPrices) : 0;
                                        const multiPrice = chPrices.length > 1 && minP !== maxP;
                                        const finalPrice = chPrices.length ? Math.round(chPrices.reduce((a, b) => a + b, 0) / chPrices.length) : 0;
                                        const actualMargin = avgCost > 0 && finalPrice > 0 ? (((finalPrice - avgCost) / finalPrice - rate.commission - rate.vat) * 100).toFixed(1) : 0;
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
                                                    {multiPrice ? (
                                                        <div style={{ fontWeight: 700, fontSize: 12, color: customPrices[chId] ? "#f59e0b" : "#22c55e", fontFamily: "monospace" }}>
                                                            {fmtKRW(minP)} ~ {fmtKRW(maxP)}
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontWeight: 900, fontSize: 14, color: customPrices[chId] ? "#f59e0b" : "#22c55e", fontFamily: "monospace" }}>{fmtKRW(finalPrice)}</div>
                                                    )}
                                                    <div style={{ fontSize: 10, color: actualMargin > 0 ? "#22c55e" : "#ef4444", marginTop: 2 }}>
                                                        {t('catalogSync.actualMarginLabel')} {actualMargin}%{multiPrice ? ` · ${t('catalogSync.perProductAvg', '평균')}` : ''}
                                                    </div>
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

                        {/* [현 차수 P0] 상품별 판매가 — 종전엔 채널당 단일가만 지정 가능해, 원가가 다른 상품을
                            여러 개 선택해도 전부 같은 가격으로 등록됐다. 상품마다 개별 지정/확인이 가능해야 한다. */}
                        {selProds.length > 0 && selChsArr.length > 0 && (
                            <div style={{ marginBottom: 18 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a", marginBottom: 6 }}>
                                    🧾 {t('catalogSync.perProductPriceTitle', '상품별 판매가')} ({selProds.length})
                                </div>
                                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 8 }}>
                                    {t('catalogSync.perProductPriceDesc', '각 상품의 원가로 계산된 추천가입니다. 값을 입력하면 그 상품만 개별 지정됩니다(비우면 추천가/채널 일괄가 적용).')}
                                </div>
                                <div style={{ overflowX: "auto", border: "1px solid rgba(99,140,255,0.15)", borderRadius: 10 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                        <thead>
                                            <tr style={{ background: "rgba(99,140,255,0.05)" }}>
                                                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: "#6b7280", fontWeight: 700, whiteSpace: "nowrap" }}>{t('catalogSync.colProduct', '상품')}</th>
                                                <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 10, color: "#6b7280", fontWeight: 700, whiteSpace: "nowrap" }}>{t('catalogSync.productCostTotal')}</th>
                                                {selChsArr.map(chId => {
                                                    const ch = CHANNELS.find(c => c.id === chId) || { name: chId, color: "#4f8ef7", icon: "🔌" };
                                                    return (
                                                        <th key={chId} style={{ padding: "8px 10px", textAlign: "left", fontSize: 10, color: ch.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                                                            {ch.icon} {ch.name}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selProds.map(p => (
                                                <tr key={p.id} style={{ borderTop: "1px solid rgba(99,140,255,0.08)" }}>
                                                    <td style={{ padding: "8px 10px", maxWidth: 220 }}>
                                                        <div style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                                                        <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{p.sku}</div>
                                                    </td>
                                                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", color: costOf(p) > 0 ? "#f97316" : "#cbd5e1", fontWeight: 700, whiteSpace: "nowrap" }}>
                                                        {costOf(p) > 0 ? fmtKRW(costOf(p)) : '—'}
                                                    </td>
                                                    {selChsArr.map(chId => {
                                                        const key = `${chId}::${p.sku}`;
                                                        const eff = priceMap[chId]?.[p.sku] || 0;
                                                        return (
                                                            <td key={chId} style={{ padding: "6px 10px" }}>
                                                                <input
                                                                    type="number"
                                                                    placeholder={fmtKRW(eff)}
                                                                    value={prodPrices[key] ?? ""}
                                                                    onChange={e => {
                                                                        const v = e.target.value;
                                                                        setProdPrices(pp => v ? { ...pp, [key]: Number(v) } : (({ [key]: _, ...rest }) => rest)(pp));
                                                                    }}
                                                                    style={{ width: 110, padding: "5px 8px", borderRadius: 7, fontSize: 11, color: "#1f2937", background: "#ffffff", border: prodPrices[key] ? "1px solid #f59e0b" : "1px solid rgba(99,140,255,0.2)" }}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

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
                                    // [현 차수 P0] 상품별 판매가 합계 기준 — 종전엔 채널당 단일가 1건만 표기해
                                    //   여러 상품을 등록해도 한 상품치 손익만 보였다.
                                    const rows = selProds.map(p => ({ price: priceMap[chId]?.[p.sku] || 0, cost: costOf(p) }));
                                    const sumPrice = rows.reduce((s, x) => s + x.price, 0);
                                    const sumCost = rows.reduce((s, x) => s + x.cost, 0);
                                    const sumFee = Math.round(sumPrice * (rate.commission + rate.vat));
                                    const prices = rows.map(x => x.price).filter(v => v > 0);
                                    const minP = prices.length ? Math.min(...prices) : 0;
                                    const maxP = prices.length ? Math.max(...prices) : 0;
                                    const multiPrice = prices.length > 1 && minP !== maxP;
                                    const finalPrice = sumPrice;
                                    const profit = sumPrice - sumCost - sumFee;
                                    return (
                                        <div key={chId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, background: '#ffffff', border: '1px solid #e5e7eb' }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: 16 }}>{ch.icon}</span>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: ch.color }}>{ch.name}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.commissionTaxLabel')}</div>
                                                    <div style={{ fontSize: 11, color: "#ef4444", fontFamily: "monospace" }}>{fmtKRW(sumFee)}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.estProfitLabel')}</div>
                                                    <div style={{ fontSize: 11, color: profit > 0 ? "#22c55e" : "#ef4444", fontFamily: "monospace", fontWeight: 700 }}>{fmtKRW(profit)}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 10, color: "#6b7280" }}>{t('catalogSync.colSalePrice')}</div>
                                                    {multiPrice ? (
                                                        <>
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", fontFamily: "monospace" }}>{fmtKRW(minP)} ~ {fmtKRW(maxP)}</div>
                                                            <div style={{ fontSize: 10, color: "#94a3b8" }}>{t('catalogSync.sumLabel', '합계')} {fmtKRW(finalPrice)}</div>
                                                        </>
                                                    ) : (
                                                        <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b", fontFamily: "monospace" }}>{fmtKRW(finalPrice)}</div>
                                                    )}
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

                        {/* [277차] ★실패했는데 "등록 완료"가 함께 뜨던 오표기 수정 — 하나라도 실패하면 완료 배너를 띄우지 않는다. */}
                        {done && results.length > 0 && results.every(r => r.ok) ? (
                            <div style={{ textAlign: "center", padding: "14px", borderRadius: 10, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, fontSize: 14 }}>
                                {t('catalogSync.registerDoneMsg', { prodCount: selProds.length, chCount: selChsArr.length })}
                            </div>
                        ) : done && results.some(r => !r.ok) ? (
                            <div style={{ textAlign: "center", padding: "14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", color: "#dc2626", fontWeight: 700, fontSize: 14 }}>
                                {t('catalogSync.registerFailedMsg', '채널 등록에 실패했습니다 — 아래 채널 응답을 확인하세요')}
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

                        {/* [277차] 채널이 반환한 실제 결과 — 실패 사유를 그대로 노출(종전엔 console 로만 흘림). */}
                        {results.length > 0 && (
                            <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>
                                    {t('catalogSync.resultTitle', '채널 응답')}
                                </div>
                                <div style={{ maxHeight: 180, overflowY: "auto" }}>
                                    {results.map((r, i) => {
                                      // [289차] 고액(₩5M↑) 상품은 pending_approval 로 보류 — 즉시 등록(✅)이 아님을 명확히 표기.
                                      const held = r.status === 'pending_approval';
                                      return (
                                        <div key={i} style={{ fontSize: 11, padding: "6px 8px", borderRadius: 6, marginBottom: 4,
                                            background: held ? "rgba(245,158,11,0.10)" : (r.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)") }}>
                                            <span style={{ fontWeight: 700, color: held ? "#d97706" : (r.ok ? "#16a34a" : "#dc2626") }}>
                                                {held ? '⏳' : (r.ok ? '✅' : '❌')} {r.chId} · {r.sku}
                                            </span>
                                            <span style={{ color: held ? "#d97706" : "#64748b", marginLeft: 6, fontWeight: held ? 700 : 400 }}>
                                                {held ? t('catalogSync.wbPendingApproval', '승인 대기 (고액 ₩5M↑)') : r.status}
                                            </span>
                                            {r.error && <div style={{ color: "#b91c1c", marginTop: 2, wordBreak: "break-word" }}>{r.error}</div>}
                                            {/* [현 차수] 계약검사 누락 항목 — 채널이 한 번에 하나씩 알려주던 것을 전송 전에 전부 나열한다.
                                                한 줄로 뭉치면 무엇부터 채워야 할지 보이지 않아 왕복이 다시 늘어난다. */}
                                            {Array.isArray(r.missing) && r.missing.length > 0 && (
                                                <ul style={{ margin: "4px 0 0", paddingLeft: 16, color: "#b91c1c" }}>
                                                    {r.missing.map((m, k) => <li key={k} style={{ marginTop: 2 }}>{m}</li>)}
                                                </ul>
                                            )}
                                            {r.warning && <div style={{ color: "#b45309", marginTop: 2 }}>⚠️ {r.warning}</div>}
                                            {r.ok && r.imagesUploaded != null && (
                                                <div style={{ color: "#475569", marginTop: 2 }}>
                                                    {t('catalogSync.imagesUploaded', '이미지 {{n}}장 업로드됨').replace('{{n}}', r.imagesUploaded)}
                                                </div>
                                            )}
                                            {/* [277차] 카테고리 후보 — 클릭 시 그 코드로 즉시 재전송(수동 ID 입력 불가 대응) */}
                                            {!r.ok && r.suggestions && r.suggestions.length > 0 && (
                                                <div style={{ marginTop: 6 }}>
                                                    <div style={{ color: "#475569", marginBottom: 4 }}>
                                                        {t('catalogSync.pickCategory', '카테고리를 선택하면 바로 등록합니다')}
                                                    </div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                        {r.suggestions.map(s => (
                                                            <button key={s.code} disabled={!!retrying}
                                                                onClick={() => retryWithCategory(r, s.code)}
                                                                title={`${s.label} (${s.code})`}
                                                                style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid #cbd5e1",
                                                                    background: retrying === `${r.chId}:${r.sku}` ? "#e2e8f0" : "#fff",
                                                                    fontSize: 10, cursor: retrying ? "not-allowed" : "pointer", color: "#334155" }}>
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                      );
                                    })}
                                </div>
                                {results.some(r => !r.ok) && (
                                    <div style={{ textAlign: "right", marginTop: 8 }}>
                                        <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>
                                            {t('catalogSync.close')}
                                        </button>
                                    </div>
                                )}
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
                            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{m.desc}</div>
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
/**
 * [277차] 카테고리 확정 필요 패널.
 *   자동 매칭 임계(고확신)에 못 미쳐 카테고리가 정해지지 않은 리스팅만 모아 보여준다.
 *   자동 적용된 상품은 여기 나오지 않는다(확인 불필요). 후보 클릭 또는 직접 검색으로 확정하고 즉시 등록한다.
 *   ★네이버 리프카테고리는 5,011개 — 사용자가 ID 를 손으로 지정하는 것은 불가능하다.
 */
const PendingCategoryPanel = memo(function PendingCategoryPanel({ onDone }) {
    const { t } = useI18n();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState('');
    const [msg, setMsg] = useState({});           // { [key]: {ok, text} }
    const [searchFor, setSearchFor] = useState(null);  // 검색 모달 대상 item
    const [q, setQ] = useState('');
    const [found, setFound] = useState([]);
    const [searching, setSearching] = useState(false);
    // [현 차수 P1] 카테고리 자동조회 미지원 채널(11번가 등) — 서버가 manual_entry 를 주면 코드 직접 입력을 연다.
    //   종전엔 자동조회 실패를 "자격증명 확인"으로만 안내하고 대안 경로가 없어 등록이 원천 차단됐다.
    const [hint, setHint] = useState(null);          // { text, manual }
    const [manualCode, setManualCode] = useState('');

    // [285차] 브랜드 — 11번가 상품등록 필수. 서버가 확정 필요 목록과 함께 브랜드 선택지를 내려준다.
    const [brands, setBrands] = useState([]);
    const [newBrand, setNewBrand] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        getJsonAuth('/api/catalog/pending-categories')
            .then(d => { setItems(d.items || []); setBrands(d.brands || []); })
            .catch(() => { setItems([]); setBrands([]); })
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    // [285차] 상품에 브랜드 지정(전송 없이 저장만 — 카테고리까지 확정되면 그때 함께 전송된다).
    const assignBrand = async (it, brand) => {
        if (!brand) return;
        const key = `${it.channel}:${it.sku}`;
        setBusy(key); setMsg(m => ({ ...m, [key]: null }));
        try {
            const d = await postJson('/api/catalog/assign-brand', { channel: it.channel, sku: it.sku, brand });
            if (d.ok) {
                setItems(prev => prev.map(x => (x.channel === it.channel && x.sku === it.sku)
                    ? { ...x, brand, needs_brand: false } : x));
                setMsg(m => ({ ...m, [key]: { ok: true, text: t('catalogSync.pcBrandSaved', '브랜드 저장됨') } }));
            } else {
                setMsg(m => ({ ...m, [key]: { ok: false, text: d.error || 'failed' } }));
            }
        } catch (e) {
            setMsg(m => ({ ...m, [key]: { ok: false, text: e.message } }));
        } finally { setBusy(''); }
    };

    // [285차] 목록에 없는 브랜드를 즉시 추가하고 그 상품에 지정한다(브랜드 관리 탭으로 이동하지 않아도 되도록).
    const addBrandAndAssign = async (it, name) => {
        const nm = (name || '').trim();
        if (!nm) return;
        try {
            const d = await postJson('/api/catalog/brands', { name: nm });
            if (d.ok) {
                setBrands(prev => prev.includes(nm) ? prev : [...prev, nm].sort());
                setNewBrand('');
                await assignBrand(it, nm);
            }
        } catch { /* 아래 메시지로 사용자에게 노출됨 */ }
    };

    const assign = async (it, code, label) => {
        const key = `${it.channel}:${it.sku}`;
        setBusy(key); setMsg(m => ({ ...m, [key]: null }));
        try {
            const d = await postJson('/api/catalog/assign-category', {
                channel: it.channel, sku: it.sku, category_code: code, category_label: label || '', publish: true,
            });
            // [289차] 고액(₩5M↑) 상품은 pending_approval 로 보류 — "등록 완료" 오표기 방지 + 목록에서 지우지 않음(승인 대기 유지).
            const held = !!d.requires_approval || d.status === 'pending_approval';
            setMsg(m => ({ ...m, [key]: {
                ok: !!d.ok, pending: held,
                text: held ? t('catalogSync.pcPendingApproval', '고액(₩5M↑) 상품 — 승인 후 채널에 반영됩니다')
                           : (d.ok ? t('catalogSync.pcDone', '채널에 등록했습니다') : (d.error || d.status)),
            } }));
            if (d.ok && !held) { setItems(prev => prev.filter(x => !(x.channel === it.channel && x.sku === it.sku))); onDone && onDone(); }
        } catch (e) {
            setMsg(m => ({ ...m, [key]: { ok: false, text: e.message } }));
        } finally { setBusy(''); }
    };

    const doSearch = async (it, term) => {
        setSearching(true); setHint(null);
        try {
            const qs = new URLSearchParams({ channel: it.channel, ...(term ? { q: term } : {}) }).toString();
            const d = await getJsonAuth(`/api/catalog/channel-categories?${qs}`);
            setFound(d.ok ? (d.categories || []) : []);
            // 서버가 실패 사유를 구분해 준다: category_catalog_unsupported / credentials_required / category_fetch_failed
            if (!d.ok) setHint({ text: d.hint || d.error || '', manual: !!d.manual_entry });
        } catch (e) { setFound([]); setHint({ text: e.message, manual: true }); }
        finally { setSearching(false); }
    };

    if (!loading && items.length === 0) return null;   // 확정할 게 없으면 아예 표시하지 않는다

    return (
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#b45309" }}>
                    ⚠️ {t('catalogSync.pcTitle2', '카테고리·브랜드 확정 필요')} ({items.length})
                </div>
                <button onClick={load} disabled={loading} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 11, cursor: "pointer" }}>
                    {loading ? '…' : t('catalogSync.pcRefresh', '새로고침')}
                </button>
            </div>
            <div style={{ fontSize: 11, color: "#92400e", marginBottom: 10 }}>
                {t('catalogSync.pcHint', '자동으로 확실하게 매칭된 상품은 여기 나오지 않습니다. 아래 상품만 카테고리를 골라주세요.')}
            </div>

            {items.map(it => {
                const key = `${it.channel}:${it.sku}`;
                return (
                    <div key={key} style={{ background: "#fff", borderRadius: 8, padding: 10, marginBottom: 8, border: "1px solid #fde68a" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{it.name || it.sku}</span>
                            <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 10 }}>{it.channel} · {it.sku}</span>
                        </div>
                        {/* [285차] 브랜드 — 11번가 상품등록 필수. 없으면 카테고리를 골라도 등록이 거부된다. */}
                        {it.needs_brand !== undefined && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #fde68a", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: it.needs_brand ? "#b45309" : "#16a34a" }}>
                                    🏷️ {t('catalogSync.brand.fName', '브랜드')}{it.needs_brand ? ' *' : ''}
                                </span>
                                <select value={it.brand || ''} disabled={busy === key}
                                    onChange={e => assignBrand(it, e.target.value)}
                                    style={{ border: `1px solid ${it.needs_brand ? "#f59e0b" : "#cbd5e1"}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, minWidth: 150, background: "#fff" }}>
                                    <option value="">{t('catalogSync.brand.fPickPh', '브랜드 선택…')}</option>
                                    {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <input value={newBrand} onChange={e => setNewBrand(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') addBrandAndAssign(it, newBrand); }}
                                    placeholder={t('catalogSync.brand.fNewPh', '새 브랜드 입력')}
                                    style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 11, width: 130 }} />
                                <button onClick={() => addBrandAndAssign(it, newBrand)} disabled={!newBrand.trim() || busy === key}
                                    style={{ padding: "4px 9px", borderRadius: 6, border: "1px solid #16a34a", background: "#fff", color: "#16a34a", fontSize: 10, fontWeight: 700, cursor: newBrand.trim() ? "pointer" : "not-allowed" }}>
                                    ＋ {t('catalogSync.brand.assignBtn', '추가·지정')}
                                </button>
                            </div>
                        )}

                        {it.needs_category === false ? (
                            <div style={{ marginTop: 6, fontSize: 10, color: "#16a34a", fontWeight: 700 }}>
                                ✅ {t('catalogSync.pcCatDone', '카테고리 확정됨')}
                            </div>
                        ) : it.suggestions && it.suggestions.length > 0 ? (
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {it.suggestions.map(s => (
                                    <button key={s.code} disabled={!!busy} onClick={() => assign(it, s.code, s.label)}
                                        title={`${s.label} (${s.code}) · score ${s.score}`}
                                        style={{ padding: "4px 9px", borderRadius: 999, border: "1px solid #cbd5e1",
                                            background: busy === key ? "#e2e8f0" : "#fff", fontSize: 10,
                                            cursor: busy ? "not-allowed" : "pointer", color: "#334155" }}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div style={{ marginTop: 6, fontSize: 10, color: "#94a3b8" }}>
                                {t('catalogSync.pcNoSuggest', '추천 후보가 없습니다 — 직접 검색해 선택하세요')}
                            </div>
                        )}
                        <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                            {it.needs_category !== false && (
                                <button onClick={() => { setSearchFor(it); setQ(it.name || ''); setFound([]); doSearch(it, it.name || ''); }}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #4f8ef7", background: "#fff", color: "#4f8ef7", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                    🔍 {t('catalogSync.pcSearch', '카테고리 검색')}
                                </button>
                            )}
                            {msg[key] && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: msg[key].pending ? "#d97706" : (msg[key].ok ? "#16a34a" : "#dc2626") }}>
                                    {msg[key].pending ? '⏳' : (msg[key].ok ? '✅' : '❌')} {msg[key].text}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* 직접 검색 모달 — 후보가 없거나 마음에 들지 않을 때 */}
            {searchFor && (
                <div onClick={() => setSearchFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(560px,100%)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #eef2f7" }}>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>📂 {t('catalogSync.pcSearchTitle', '채널 카테고리 검색')}</div>
                            <div style={{ fontSize: 11, color: "#7c8fa8", marginTop: 3 }}>{searchFor.name || searchFor.sku} · {searchFor.channel}</div>
                        </div>
                        <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
                            <input value={q} onChange={e => setQ(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') doSearch(searchFor, q); }}
                                placeholder={t('catalogSync.pcSearchPh', '예: 건강식품, 니트, 이어폰')}
                                style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 12 }} />
                            <button onClick={() => doSearch(searchFor, q)} disabled={searching}
                                style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#4f8ef7", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                {searching ? '…' : t('catalogSync.pcSearchBtn', '검색')}
                            </button>
                        </div>
                        {/* [현 차수 P1] 자동조회 실패 사유 + 코드 직접 입력(미지원 채널이어도 등록이 막히지 않도록) */}
                        {hint && (
                            <div style={{ margin: "0 16px 10px", padding: "10px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)" }}>
                                <div style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>⚠️ {hint.text}</div>
                                {hint.manual && (
                                    <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                                        <input
                                            value={manualCode}
                                            onChange={e => setManualCode(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && manualCode.trim()) { const it = searchFor; setSearchFor(null); assign(it, manualCode.trim(), ''); setManualCode(''); } }}
                                            placeholder={t('catalogSync.pcManualPh', '카테고리 코드 직접 입력 (예: 11번가 dispCtgrNo)')}
                                            style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "monospace" }}
                                        />
                                        <button
                                            onClick={() => { if (!manualCode.trim()) return; const it = searchFor; setSearchFor(null); assign(it, manualCode.trim(), ''); setManualCode(''); }}
                                            disabled={!manualCode.trim()}
                                            style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: manualCode.trim() ? "#f59e0b" : "#e2e8f0", color: "#fff", fontSize: 12, fontWeight: 700, cursor: manualCode.trim() ? "pointer" : "default" }}>
                                            {t('catalogSync.pcManualApply', '이 코드로 등록')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 12px" }}>
                            {!searching && found.length === 0 && <div style={{ fontSize: 11, color: "#94a3b8", padding: 8 }}>{t('catalogSync.pcNoResult', '검색 결과가 없습니다')}</div>}
                            {found.map(c => (
                                <div key={c.code} onClick={() => { const it = searchFor; setSearchFor(null); assign(it, c.code, c.whole_name || c.name); }}
                                    style={{ padding: "9px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, borderBottom: "1px solid #f1f5f9" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <div style={{ color: "#0f172a", fontWeight: 600 }}>{c.whole_name || c.name}</div>
                                    <div style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 10 }}>{c.code}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: "10px 16px", borderTop: "1px solid #eef2f7", textAlign: "right" }}>
                            <button onClick={() => setSearchFor(null)} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>
                                {t('catalogSync.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

const CatalogTab = memo(function CatalogTab() {
    const { t, lang } = useI18n();
    const { updateCatalogChannelPrices, syncCatalogItem, addAlert, inventory, channelProductPrices } = useGlobalData();
    const { sanitize, secBanner } = useCatalogSecurity();
    const dynamicChannels = useDynamicChannels();
    const [products, setProducts] = useState(PRODUCTS_INIT);
    const [search, setSearch] = useState("");
    const [selCh, setSelCh] = useState("all");
    const [selSt, setSelSt] = useState("all");
    const [selLink, setSelLink] = useState("all");   // all | linked | unlinked
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

    // [285차] 브랜드 — 카탈로그 목록에서 바로 지정한다(11번가 상품등록 필수).
    //   상품 마스터(po_products)와 채널 리스팅(catalog_listing) 양쪽을 함께 갱신해야 전송 시 실제로 실린다.
    const [brandOptions, setBrandOptions] = useState([]);
    const [brandBusy, setBrandBusy] = useState('');
    const navigate = useNavigate();   // [286차] 재고 클릭 → WMS 입고등록 이동
    // [286차] ★재고는 입출고 원장에서 파생되는 running balance → 직접 인라인 수정 금지(원장과 발산 방지).
    //   목록에서 재고 클릭 시 WMS 입고등록 폼으로 이동(상품 프리필) → 창고·수량 선택해 입고 등록 → on_hand·이력에 정합 반영.
    const goInbound = useCallback((r) => {
        const q = new URLSearchParams({ tab: 'inout', sku: String(r.sku || ''), name: String(r.name || '') });
        navigate(`/wms-manager?${q.toString()}`);
    }, [navigate]);
    const loadBrands = useCallback(() => {
        getJsonAuth('/api/catalog/brands')
            .then(d => setBrandOptions((d?.items || []).map(b => b.name).filter(Boolean)))
            .catch(() => setBrandOptions([]));
    }, []);
    useEffect(() => { loadBrands(); }, [loadBrands]);

    // [286차] 11번가 상품정보제공고시 유형 정본(40종) 로드 — 고시 편집 UI 소비.
    const [noticeTypes, setNoticeTypes] = useState([]);
    const [noticeModal, setNoticeModal] = useState(null);   // 편집 대상 상품 행
    useEffect(() => {
        getJsonAuth('/api/catalog/st11-notice-types')
            .then(d => setNoticeTypes(Array.isArray(d?.types) ? d.types : []))
            .catch(() => setNoticeTypes([]));
    }, []);

    // [286차] 상품 고시 저장 — po_products(마스터)에 notice_json 영속(+_fallback 은 편입). 등록 시 _meta 로 11번가 전송.
    const saveProductNotice = useCallback(async (r, typeCode, items) => {
        const noticeJson = JSON.stringify({ type: typeCode, items });
        setBrandBusy(r.sku);
        try {
            if (r._fallback) {
                await postJson('/v420/price/products', {
                    sku: r.sku, product_name: r.name || r.sku, category: r.category || '',
                    base_price: Number(r.price) || 0, cost_price: Number(r.productCost) || Number(r.purchaseCost) || 0,
                    unit: (typeof r.unitType === 'string' && r.unitType) ? r.unitType : 'ea',
                    initial_stock: Number(r.inventory) || 0, notice_json: noticeJson,
                });
            } else {
                await requestJsonAuth(`/v420/price/products/${encodeURIComponent(r.sku)}`, 'PUT', { notice_json: noticeJson });
            }
            setProducts(prev => prev.map(p => p.sku === r.sku
                ? { ...p, _fallback: false, noticeType: typeCode, _meta: { ...(p._meta || {}), notice_json: noticeJson } }
                : p));
            setToast(t('catalogSync.notice.saved', '상품정보제공고시를 저장했습니다') + (r._fallback ? ` · ${t('catalogSync.brand.statMastered', '상품 마스터에 편입됨')}` : ''));
            setTimeout(() => setToast(null), 2500);
            setNoticeModal(null);
        } catch (e) {
            setToast(`❌ ${e.message}`);
            setTimeout(() => setToast(null), 3500);
        } finally { setBrandBusy(''); }
    }, [t]);

    // [286차] 목록에서 재고 직접 수정 — po_products(마스터) initial_stock 갱신(+updateProduct 가 reflectStockToWms 로 WMS 동기화).
    //   _fallback(재고/채널 유래)은 마스터 편입. 저장 후 등록/전송 시 optionAllQty 로 채널에 반영된다.
    const saveProductStock = useCallback(async (r, val) => {
        const qty = Math.max(0, Math.floor(Number(val)));
        if (!Number.isFinite(qty)) return;
        setBrandBusy(r.sku);
        try {
            if (r._fallback) {
                await postJson('/v420/price/products', {
                    sku: r.sku, product_name: r.name || r.sku, category: r.category || '',
                    base_price: Number(r.price) || 0, cost_price: Number(r.productCost) || Number(r.purchaseCost) || 0,
                    unit: (typeof r.unitType === 'string' && r.unitType) ? r.unitType : 'ea', initial_stock: qty,
                });
            } else {
                await requestJsonAuth(`/v420/price/products/${encodeURIComponent(r.sku)}`, 'PUT', { initial_stock: qty });
            }
            // [286차] ★재고관리(WMS) 정합 — on_hand 을 목표값으로 설정(현재값과의 델타를 StockAdj 원장으로 기록).
            //   po_products.initial_stock(등록 optionAllQty)·wms_stock.on_hand·입출고 이력이 모두 같은 값으로 일치한다.
            //   (신규 SKU 는 createProduct 가 이미 on_hand+INIT 원장 생성 → 여기선 delta=0 무해.)
            try { await postJson('/api/wms/set-stock', { sku: r.sku, qty, name: r.name || r.sku }); } catch { /* WMS 반영 실패는 상품재고 저장을 막지 않음(다음 동기화/실사로 수렴) */ }
            setProducts(prev => prev.map(p => p.sku === r.sku ? { ...p, inventory: qty, _fallback: false } : p));
            setToast(t('catalogSync.stock.saved', '재고를 수정했습니다') + ` — ${qty}`);
            setTimeout(() => setToast(null), 2200);
        } catch (e) {
            setToast(`❌ ${e.message}`);
            setTimeout(() => setToast(null), 3500);
        } finally { setBrandBusy(''); }
    }, [t]);

    const setProductBrand = useCallback(async (skus, brand) => {
        const list = (Array.isArray(skus) ? skus : [skus]).filter(Boolean);
        if (!list.length || !brand) return;
        setBrandBusy(list.join(','));
        try {
            // 목록에 없는 브랜드면 먼저 등록(정본 목록 유지).
            if (!brandOptions.includes(brand)) {
                await postJson('/api/catalog/brands', { name: brand });
                setBrandOptions(prev => prev.includes(brand) ? prev : [...prev, brand].sort());
            }
            // ①상품 마스터 ②전 채널 리스팅
            await Promise.all(list.map(sku => requestJsonAuth(`/v420/price/products/${encodeURIComponent(sku)}`, 'PUT', { brand })));
            await postJson('/api/catalog/assign-brand', { skus: list, brand });   // channel 생략 = 전 채널
            setProducts(prev => prev.map(p => list.includes(p.sku) ? { ...p, brand } : p));
            setToast(t('catalogSync.brand.statAssigned', '브랜드를 지정했습니다') + ` — ${brand} (${list.length})`);
            setTimeout(() => setToast(null), 2500);
        } catch (e) {
            setToast(`❌ ${e.message}`);
            setTimeout(() => setToast(null), 3500);
        } finally { setBrandBusy(''); }
    }, [brandOptions, t]);

    /**
     * [286차] 목록에서 상품 단위 브랜드 인라인 지정.
     *   ★버그: 캡처 항목은 재고/채널 수집(_fallback)이라 po_products·catalog_listing 어디에도 없어
     *     기존 setProductBrand 의 UPDATE 가 0행 → 브랜드가 저장될 곳이 없었다. 그래서 입력칸을 disabled 로
     *     막아 "클릭해도 무반응"이었다. 브랜드는 11번가 상품등록 필수값이므로 지정이 가능해야 한다.
     *   수정: _fallback 항목은 화면에 이미 있는 행 데이터로 상품 마스터(po_products)에 편입(비-아웃바운드·가역)
     *     → 브랜드가 영속되고 이후 11번가 등록 경로(catalog_listing.brand)가 값을 읽는다. 등록된 상품은 기존 경로.
     */
    const assignBrandInline = useCallback(async (r, brandRaw) => {
        const brand = (brandRaw || '').trim();
        // ★[286차 후속] r.brand 와 비교하지 않는다 — 입력칸 onChange 가 blur 이전에 이미 로컬 state(r.brand)를
        //   새 값으로 갱신하므로 여기서 비교하면 항상 같아져 early-return(저장이 안 됨). 변경 감지는 onBlur 의
        //   dataset.orig(포커스 시점 값) 비교가 담당한다. 여기서는 빈 값만 거른다.
        if (!brand) return;
        setBrandBusy(r.sku);
        setToast(null);
        try {
            // 목록에 없는 브랜드면 먼저 정본 목록에 등록(assign-brand 는 미등록 브랜드를 거부한다).
            if (!brandOptions.includes(brand)) {
                await postJson('/api/catalog/brands', { name: brand });
                setBrandOptions(prev => prev.includes(brand) ? prev : [...prev, brand].sort());
            }
            if (r._fallback) {
                // 재고/채널 유래 항목 → 상품 마스터 편입(브랜드 포함). 화면 표시 필드만 사용(날조 없음).
                await postJson('/v420/price/products', {
                    sku: r.sku,
                    product_name: r.name || r.sku,
                    category: r.category || '',
                    base_price: Number(r.price) || 0,
                    cost_price: Number(r.productCost) || Number(r.purchaseCost) || 0,
                    unit: (typeof r.unitType === 'string' && r.unitType) ? r.unitType : 'ea',
                    initial_stock: Number(r.inventory) || 0,
                    brand,
                });
            } else {
                await requestJsonAuth(`/v420/price/products/${encodeURIComponent(r.sku)}`, 'PUT', { brand });
            }
            // 이미 채널 리스팅이 있으면 거기에도 반영(없으면 무해한 0행). channel 생략 = 전 채널.
            await postJson('/api/catalog/assign-brand', { skus: [r.sku], brand });
            // 편입 후엔 등록상품이므로 _fallback 해제(다음 로드에서 po_products 로 다시 그려진다).
            setProducts(prev => prev.map(p => p.sku === r.sku ? { ...p, brand, _fallback: false } : p));
            setToast((t('catalogSync.brand.statAssigned', '브랜드를 지정했습니다') + ` — ${brand}`)
                + (r._fallback ? ` · ${t('catalogSync.brand.statMastered', '상품 마스터에 편입됨')}` : ''));
            setTimeout(() => setToast(null), 2500);
        } catch (e) {
            setToast(`❌ ${e.message}`);
            setTimeout(() => setToast(null), 3500);
        } finally { setBrandBusy(''); }
    }, [brandOptions, t]);

    /**
     * [277차] 수동 등록 상품(po_products)을 이 페이지에 노출 — 종전엔 inventory 시드만 읽어
     *   "상품등록에서 등록한 상품이 카탈로그 동기화에 안 보이고, 여기서 채널로 보낼 수도 없다".
     *   등록 상품이 있으면 그것을 SSOT 로 쓰고(이미지·상세·고시정보 보유), 없을 때만 기존 inventory 폴백.
     *   전송은 아래 handleApply 의 기존 writeback 경로를 그대로 탄다(신규 엔드포인트 0).
     */
    // [277차] 세 소스(등록상품·채널수집·재고)를 각자 도착하는 대로 setProducts 로 덮어쓰던 구조가
    //   "목록이 잠깐 보였다가 사라지는" 현상의 원인이었다(늦게 온 응답이 먼저 그린 목록을 통째로 교체).
    //   → 원본을 그대로 담아두고(poRows/chRows) 아래 한 곳에서만 병합해 그린다. 경쟁 자체를 없앤다.
    const [poRows, setPoRows] = useState(null);   // null = 로딩중
    const [chRows, setChRows] = useState(null);

    useEffect(() => {
        let alive = true;
        getJsonAuth(`/v420/price/products`)
            .then(d => { if (alive) setPoRows(d.products || []); })
            .catch(() => { if (alive) setPoRows([]); });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        let alive = true;
        getJsonAuth(`/api/channel-sync/products?limit=200`)
            .then(d => { if (alive) setChRows(d.products || []); })
            .catch(() => { if (alive) setChRows([]); });
        return () => { alive = false; };
    }, []);

    // [현 차수 B1] 등록채널(catalog_listing) 맵 — 채널 컬럼이 '수집'뿐 아니라 우리가 writeback 등록한
    //   채널까지 정확히 표시하도록. 수집 전이라도 등록됨을 반영(종전엔 '미연동' 오표시).
    const [registeredMap, setRegisteredMap] = useState(null);
    useEffect(() => {
        let alive = true;
        getJsonAuth('/api/catalog/registered')
            .then(d => { if (alive) setRegisteredMap(d.registered || {}); })
            .catch(() => { if (alive) setRegisteredMap({}); });
        return () => { alive = false; };
    }, []);

    const syncedImages = useMemo(() => {
        const m = {};
        (chRows || []).forEach(p => {
            const sku = String(p.sku || p.channel_product_id || '');
            const url = String(p.image_url || '');
            if (sku && url && !m[sku]) m[sku] = url;
        });
        return m;
    }, [chRows]);

    /**
     * 세 소스를 하나의 목록으로 병합한다.
     *   - 등록상품(po_products): 이미지·상세·고시정보 보유 → 신규 등록 가능(_registered)
     *   - 채널수집(channel_products): 실제로 채널에 올라가 있는 상품 → 연동 배지·수정 대상
     *   - 재고(inventory): 위 둘에 없는 항목만 보조 표시(_fallback)
     * SKU 가 키. 등록상품이 우선하고, 채널수집은 '어느 채널에 올라가 있는가'(channels)를 덧씌운다.
     */
    useEffect(() => {
        if (poRows === null || chRows === null) return;   // 두 소스가 모두 도착한 뒤 단 한 번 그린다
        const bySku = new Map();

        poRows.forEach((p, i) => {
            const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
            const stock = Number(p.initial_stock) || 0;
            const sku = String(p.sku || '');
            if (!sku) return;
            bySku.set(sku, {
                id: `POP-${String(i + 1).padStart(3, '0')}`,
                sku,
                name: p.product_name || sku,
                category: p.category || '',
                image: p.product_image || imgs[0] || '📦',
                price: Number(p.base_price) || Number(p.cost_price) || 0,
                // [277차 감사 P1] 존재한 적 없는 '정가'를 판매가×1.2 로 합성해 취소선으로 노출하던 날조 제거.
                //   po_products 에 compare_price 컬럼 자체가 없다(SSOT 부재) → 표시하지 않는다.
                comparePrice: 0,
                purchaseCost: Number(p.purchase_cost) || Number(p.cost_price) || 0,
                productCost: Number(p.cost_price) || 0,
                spec: p.spec || '',
                brand: p.brand || '',   // [285차] 11번가 상품등록 필수 — 목록에서 직접 지정한다.
                unitType: p.unit || 'ea',
                eaPerBox: String(p.qty_per_box || ''),
                boxPerPl: String(p.boxes_per_pallet || ''),
                inventory: stock,
                channels: [],
                channelPrices: channelProductPrices?.[sku] || {},
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
            });
        });

        // 채널에서 수집한 상품 — 등록상품에 없으면 목록에 추가(종전엔 아예 표시되지 않았다).
        chRows.forEach((r, i) => {
            const sku = String(r.sku || r.channel_product_id || '');
            const ch = String(r.channel || '');
            if (!sku) return;
            let row = bySku.get(sku);
            if (!row) {
                const inv = Number(r.inventory) || 0;
                row = {
                    id: `CHP-${String(i + 1).padStart(3, '0')}`,
                    sku,
                    name: r.name || sku,
                    category: r.category || '',
                    image: r.image_url || '📦',
                    price: Number(r.price) || 0,
                    comparePrice: 0,
                    purchaseCost: 0, productCost: 0,
                    spec: '', unitType: 'ea', eaPerBox: '', boxPerPl: '',
                    inventory: inv,
                    channels: [],
                    channelPrices: channelProductPrices?.[sku] || {},
                    status: inv <= 0 ? 'error' : inv < 30 ? 'warn' : 'ok',
                    lastSync: r.synced_at || '-',
                    delta: { price: false, stock: false, title: false },
                    detailHtml: r.detail_html || '',
                    images: [],
                    // 채널에만 있는 상품 — 우리 원장에 고시정보·상세가 없어 '신규 등록'은 불가(수정/중지는 가능).
                    _channelOnly: true, _fallback: true,
                };
                bySku.set(sku, row);
            }
            if (!row.image || row.image === '📦') row.image = r.image_url || row.image;
            if (ch && !row.channels.includes(ch)) row.channels.push(ch);
            if (r.synced_at && (row.lastSync === '-' || r.synced_at > row.lastSync)) row.lastSync = r.synced_at;
        });

        // 재고에만 있는 항목(등록도 채널연동도 안 된 상품) 보조 표시.
        (inventory || []).forEach((item, i) => {
            const sku = String(item.sku || '');
            if (!sku || bySku.has(sku)) return;
            const inv = Object.values(item.stock || {}).reduce((s, v) => s + (Number(v) || 0), 0);
            bySku.set(sku, {
                id: `CAT-${String(i + 1).padStart(3, '0')}`,
                sku,
                name: item.name,
                category: item.category || '',
                image: item.image || syncedImages[sku] || '📦',
                price: item.price || 0,
                // [277차] 존재한 적 없는 '정가'를 price×1.2 로 합성하지 않는다(감사 확정 P1 · 헌법: 날조 금지).
                comparePrice: 0,
                // [277차] 등록상품(po_products)이 아니라 재고 유래 항목 — 이미지·상세·고시·카테고리가 없어
                //   이대로 채널에 신규 등록하면 엉뚱한 값이 올라간다.
                _fallback: true,
                purchaseCost: item.cost || 0,
                productCost: item.cost || 0,
                spec: '', unitType: 'ea', eaPerBox: '24', boxPerPl: '40',
                inventory: inv,
                channels: [],
                channelPrices: channelProductPrices?.[sku] || {},
                // [현 차수] 죽은 status 필터 수정 — 전 상품 'ok' 하드코딩 → 실재고 기준 결정적 산출(경고/오류 필터 동작).
                status: inv <= 0 ? 'error' : inv < (item.safeQty || 30) ? 'warn' : 'ok',
                lastSync: '-',
                delta: { price: false, stock: false, title: false },
            });
        });

        // [현 차수 B1] 등록채널(catalog_listing) 병합 — 수집(channel_products)에 없어도 우리가 등록한 채널을
        //   채널 컬럼에 정확히 표시. 존재하는 상품행에만 덧씌운다(등록만 된 재고외 상품은 신설 안 함).
        if (registeredMap) {
            Object.entries(registeredMap).forEach(([sku, chans]) => {
                const row = bySku.get(String(sku));
                if (row && Array.isArray(chans)) {
                    if (!Array.isArray(row.channels)) row.channels = [];
                    chans.forEach(c => { const cc = String(c || ''); if (cc && !row.channels.includes(cc)) row.channels.push(cc); });
                }
            });
        }

        // ★서버 목록으로 '교체'하지 않고 '조정'한다. 이 effect 는 inventory/channelProductPrices 가 바뀔 때마다
        //   다시 도는데(엑셀 임포트 직후 syncCatalogItem 이 inventory 를 갱신한다), 통째로 교체하면
        //   ①임포트·수동추가한 행과 ②아직 채널에 반영 안 한 가격/재고 편집이 눈앞에서 사라진다.
        setProducts(prev => {
            const prevBySku = new Map(prev.map(r => [r.sku, r]));
            const out = [];
            bySku.forEach((row, sku) => {
                const old = prevBySku.get(sku);
                prevBySku.delete(sku);
                // 미저장 편집(delta)이 걸린 행은 사용자가 바꾼 값을 서버값으로 되돌리지 않는다.
                const dirty = old && (old.delta?.price || old.delta?.stock || old.delta?.title);
                out.push(dirty
                    ? { ...row, name: old.name, price: old.price, inventory: old.inventory, delta: old.delta, lastSync: old.lastSync }
                    : row);
            });
            // 세 소스 어디에도 없는 행 = 로컬 임포트/수동추가분. 서버에 아직 없을 뿐 유효하므로 보존한다.
            const locals = [];
            prevBySku.forEach(r => { if (r._local) locals.push(r); });
            return [...locals, ...out];
        });
    }, [poRows, chRows, registeredMap, inventory, channelProductPrices, syncedImages]);

    const showToast = (msg, color = "#22c55e") => {
        setToast({ msg, color });
        setTimeout(() => setToast(null), 3000);
    };

    const handleBulkRegister = async (action, channels, priceMap = {}) => {
        // 209차 P1: 채널 등록가 백엔드 영속 items 사전 수집(setProducts updater 부작용 회피).
        // [현 차수 P0] priceMap = { [channel]: { [sku]: price } } — 종전 { [channel]: price }(채널당 단일가)는
        //   선택 상품 전체에 같은 값을 영속시켜, 대량등록 시 상품별 판매가가 뭉개지던 결함의 전파 지점이었다.
        const priceOf = (ch, sku) => priceMap?.[ch]?.[sku];
        const persistItems = [];
        if (action === "register") {
            products.forEach(p => {
                if (!selected.has(p.id)) return;
                channels.forEach(ch => { const v = priceOf(ch, p.sku); if (v) persistItems.push({ channel: ch, sku: p.sku, price: v }); });
            });
        }
        setProducts(prev => prev.map(p => {
            if (!selected.has(p.id)) return p;
            const channelPrices = { ...(p.channelPrices || {}) };
            if (action === "register") {
                channels.forEach(ch => { const v = priceOf(ch, p.sku); if (v) channelPrices[ch] = v; });
            }
            const firstChPrice = channels.map(ch => priceOf(ch, p.sku)).find(v => v);

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
        // _local: 서버 3소스에 아직 없는 행 — 목록 재조정 시 보존 대상(없으면 다음 재조정에서 사라진다).
        setProducts(prev => [{ ...p, _local: true }, ...prev]);
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
                        _local: true,
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
                    _local: true,
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
        // [277차] 연동상태 필터 — channels 는 channel_products(채널 실원장)에서만 채워진다(추측 없음).
        if (selLink === "linked") rows = rows.filter(r => r.channels.length > 0);
        else if (selLink === "unlinked") rows = rows.filter(r => r.channels.length === 0);
        const k = sortKey;
        rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : -1) * sortDir);
        return rows;
    }, [products, search, selCh, selSt, selLink, sortKey, sortDir]);

    const paged = filtered.slice(page * PAGE, page * PAGE + PAGE);
    const totalPages = Math.ceil(filtered.length / PAGE);

    const toggleSort = k => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(1); } };
    const toggleSel = id => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
    const SortIco = ({ k }) => sortKey === k ? (sortDir > 0 ? " ▲" : " ▼") : " ·";

    return (
        <div style={{ display: "grid", gap: 14 }}>

            {/* [277차] 카테고리 확정 필요 — 자동 매칭이 고확신이 아니었던 상품만 노출(자동 적용분은 표시하지 않음). */}
            <PendingCategoryPanel onDone={() => { }} />

            {/* [237차] 서비스·플랜 등록 모드 — 온보딩에서 '서비스·구독·디지털'(bizModel=service) 선택한 사업자.
                무형 서비스/구독 사업자는 실물 상품 대신 '서비스/플랜(오퍼)'을 카탈로그 항목으로 등록한다. */}
            {(() => { try { const tk = localStorage.getItem('tenantId') || localStorage.getItem('demo_genie_user') || 'me'; return localStorage.getItem('genie_onb_bizmodel_' + tk) === 'service'; } catch { return false; } })() && (
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(99,102,241,0.08))", border: "1px solid rgba(245,158,11,0.4)" }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "#b45309" }}>🧩 {t('catalogSync.serviceMode', '서비스·플랜 등록 모드')}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 4, lineHeight: 1.6 }}>
                        {t('catalogSync.serviceModeDesc', '실물 상품이 없는 서비스·구독·디지털 사업자는 광고로 알릴 서비스/플랜(오퍼)을 아래 [등록]으로 추가하세요(상품명=서비스명, 가격=플랜가). 등록 후 채널 연동 → 결제 → 마케팅 자동화로 진행됩니다.')}
                    </div>
                    <a href="/auto-marketing" style={{ display: "inline-block", marginTop: 9, padding: "6px 14px", borderRadius: 8, background: "linear-gradient(135deg,#a855f7,#4f8ef7)", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🚀 {t('catalogSync.serviceToMarketing', '마케팅 자동화로 바로가기')} →</a>
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
                {/* [277차] 채널 연동/미연동 필터 — 어떤 상품이 아직 채널에 안 올라갔는지 한눈에 본다. */}
                <select aria-label={t('catalogSync.linkAll', '연동 전체')} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#1f2937", fontSize: 12, width: 130 }} value={selLink} onChange={e => { setSelLink(e.target.value); setPage(0); }}>
                    <option value="all">{t('catalogSync.linkAll', '연동 전체')}</option>
                    <option value="linked">{t('catalogSync.linkLinked', '연동됨')}</option>
                    <option value="unlinked">{t('catalogSync.linkUnlinked', '미연동')}</option>
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

            {/* [285차] 브랜드 자동완성 소스 — 목록 인라인 입력과 공유(정본 목록에서 고르거나 새로 입력). */}
            <datalist id="genie-catalog-brands">
                {brandOptions.map(b => <option key={b} value={b} />)}
            </datalist>

            {/* 일괄 Action 바 — Select 시 나타남 */}
            {selected.size > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", borderRadius: 12, background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.25)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#4f8ef7" }}>{t('catalogSync.selectedProducts').replace('{{n}}', selected.size)}</span>
                    <div style={{ flex: 1 }} />
                    {/* [285차] 선택 상품 브랜드 일괄 지정 — 11번가 상품등록 필수값을 한 번에 채운다. */}
                    <select value="" disabled={!!brandBusy}
                        onChange={e => {
                            const v = e.target.value;
                            if (!v) return;
                            const skus = products.filter(p => selected.has(p.id) && !p._fallback).map(p => p.sku);
                            setProductBrand(skus, v);
                            e.target.value = '';
                        }}
                        title={t('catalogSync.brand.bulkHint', '선택한 상품에 브랜드를 한 번에 지정합니다')}
                        style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, fontWeight: 700, color: "#334155", cursor: "pointer" }}>
                        <option value="">🏷️ {t('catalogSync.brand.bulkAssignBtn', '브랜드 일괄지정')}</option>
                        {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
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
                                    <span style={{ fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 10, background: statusColor(r.status) + "18", color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}33`, flexShrink: 0 }}>
                                        {t(r.status === "ok" ? 'catalogSync.statusNormal' : r.status === "warn" ? 'catalogSync.statusWarning' : 'catalogSync.statusError')}
                                    </span>
                                </div>
                                {/* 규격 + Unit + Category */}
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                    <span style={{ fontSize: 10, color: "#6b7280" }}>{r.category}</span>
                                    {r.spec && <span style={{ fontSize: 10, color: "#6b7280", opacity: 0.8 }}>| {r.spec}</span>}
                                    <span style={{ fontWeight: 700, padding: "2px 6px", borderRadius: 20, fontSize: 10, background: r.unitType === 'box' ? 'rgba(79,142,247,0.12)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)', color: r.unitType === 'box' ? '#4f8ef7' : r.unitType === 'pl' ? '#f59e0b' : '#22c55e', border: `1px solid ${r.unitType === 'box' ? 'rgba(79,142,247,0.3)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.2)'}` }}>{r.unit || 'ea'}</span>
                                </div>
                                {/* Price + Cost Price 그리드 */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)" }}>
                                        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.salePriceCol')}</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: r.delta?.price ? "#f97316" : "#1f2937" }}>{fmtKRW(r.price)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                                        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.colPurchaseCost')}</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "#a78bfa" }}>{fmtKRW(r.purchaseCost)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }}>
                                        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.colProductCost')}</div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: "#f97316" }}>{fmtKRW(r.productCost)}</div>
                                    </div>
                                    <div style={{ padding: "6px 8px", borderRadius: 8, background: margin >= 30 ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${marginColor}33` }}>
                                        <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 2 }}>{t('catalogSync.colMargin')}</div>
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
                                <th>{t('catalogSync.colBrand', '브랜드')}</th>
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
                                                <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 2 }}>
                                                    ⚠️ {t('catalogSync.fallbackItem', '재고·채널에서 불러온 항목 (전송 불가)')}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 11, color: "#374151" }}>{r.category}</td>
                                        {/* [285차] 브랜드 인라인 지정 — 11번가 상품등록 필수. 비어 있으면 눈에 띄게 경고한다. */}
                                        <td onClick={e => e.stopPropagation()} style={{ minWidth: 130 }}>
                                            <input list="genie-catalog-brands" value={r.brand || ''}
                                                disabled={brandBusy === r.sku}
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    setProducts(prev => prev.map(p => p.sku === r.sku ? { ...p, brand: v } : p));
                                                    // [286차] datalist 에서 기존 브랜드를 '선택'하면 즉시 자동 저장(선택=확정, blur 를 기다리지 않는다).
                                                    //   자유입력 신규 브랜드는 아직 목록에 없으므로 blur/Enter 에서 저장한다.
                                                    const vt = v.trim();
                                                    if (vt && brandOptions.includes(vt) && vt !== (e.currentTarget.dataset.orig || '')) {
                                                        e.currentTarget.dataset.orig = vt;   // blur 재저장(중복) 방지
                                                        assignBrandInline(r, vt);
                                                    }
                                                }}
                                                onFocus={e => { e.currentTarget.dataset.orig = e.currentTarget.value; }}
                                                onBlur={e => {
                                                    const v = e.currentTarget.value.trim();
                                                    if (v && v !== (e.currentTarget.dataset.orig || '')) assignBrandInline(r, v);
                                                }}
                                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                                placeholder={t('catalogSync.brand.fAssignPh', '브랜드 지정')}
                                                title={t('catalogSync.brand.assignHint2', '11번가 상품등록에 필수입니다. 목록에서 선택하면 즉시 저장되고, 새 브랜드는 입력 후 Enter·다른 곳 클릭 시 저장됩니다.')}
                                                style={{
                                                    width: 120, fontSize: 11, padding: "3px 6px", borderRadius: 6,
                                                    border: `1px solid ${(r.brand || '') ? "#e2e8f0" : "#f59e0b"}`,
                                                    background: (r.brand || '') ? "#fff" : "rgba(245,158,11,0.08)",
                                                }} />
                                            {/* [286차] 상품정보제공고시 편집 — 11번가 상품등록 필수. 미설정 시 '기타 재화·상세설명 참조'로 자동 처리되나, 여기서 유형·값을 직접 지정할 수 있다. */}
                                            <button type="button" onClick={e => { e.stopPropagation(); setNoticeModal(r); }}
                                                title={t('catalogSync.notice.editHint', '상품정보제공고시 편집(11번가 상품등록 필수 항목)')}
                                                style={{ marginTop: 4, fontSize: 10, padding: "2px 7px", borderRadius: 6, cursor: "pointer",
                                                    border: `1px solid ${(r.noticeType || r._meta?.notice_json) ? "#16a34a" : "#cbd5e1"}`,
                                                    background: (r.noticeType || r._meta?.notice_json) ? "rgba(34,197,94,0.08)" : "#fff",
                                                    color: (r.noticeType || r._meta?.notice_json) ? "#16a34a" : "#64748b" }}>
                                                📋 {t('catalogSync.notice.btn', '고시')}{(r.noticeType || r._meta?.notice_json) ? ' ✓' : ''}
                                            </button>
                                        </td>
                                        <td style={{ fontSize: 10, color: "#6b7280", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.spec || ""}>{r.spec || "-"}</td>
                                        <td style={{ fontSize: 11, color: "#374151", textAlign: "center" }}>
                                            <span style={{ fontWeight: 700, padding: "2px 7px", borderRadius: 20, fontSize: 10, background: r.unitType === 'box' ? 'rgba(79,142,247,0.12)' : r.unitType === 'pl' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)', color: r.unitType === 'box' ? '#4f8ef7' : r.unitType === 'pl' ? '#f59e0b' : '#22c55e', border: `1px solid ${r.unitType === "box" ? "rgba(79,142,247,0.3)" : r.unitType === "pl" ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.2)"}` }}>{r.unit || 'ea'}</span>
                                            {r.unitType === 'box' && r.eaPerBox > 1 && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>1Box={r.eaPerBox}ea</div>}
                                            {r.unitType === 'pl' && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{r.boxPerPl}Box/{r.eaPerBox}ea</div>}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: 12, color: r.delta?.price ? "#f97316" : "#1f2937" }}>
                                                {fmtKRW(r.price)} {r.delta?.price && <span style={{ fontSize: 10 }}>{t('catalogSync.change')}</span>}
                                            </div>
                                            {r.comparePrice > 0 && <div style={{ fontSize: 10, color: "#6b7280", textDecoration: "line-through" }}>{fmtKRW(r.comparePrice)}</div>}
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontSize: 11, color: "#a78bfa" }}>{fmtKRW(r.purchaseCost)}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#f97316" }}>{fmtKRW(r.productCost)}</td>
                                        <td style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: marginColor }}>{margin != null ? `${margin}%` : "-"}</td>
                                        {/* [286차] 재고 = 입출고 원장에서 파생되는 running balance(직접 인라인 수정 금지). 클릭 시 WMS 입고등록으로 이동(상품 프리필). */}
                                        <td onClick={e => { e.stopPropagation(); goInbound(r); }} style={{ minWidth: 96, cursor: "pointer" }}
                                            title={t('catalogSync.stock.inboundHint', '클릭 시 WMS 입고등록으로 이동 — 창고·수량을 선택해 입고 등록합니다(재고는 입출고 원장에서 산출).')}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <div style={{ width: 36, height: 4, background: '#eef2f7', borderRadius: 4, flexShrink: 0 }}>
                                                    <div style={{ width: `${Math.min(100, (Number(r.inventory) / 350) * 100)}%`, height: "100%", background: Number(r.inventory) < 20 ? "#ef4444" : Number(r.inventory) < 80 ? "#eab308" : "#22c55e", borderRadius: 4 }} />
                                                </div>
                                                <span style={{ fontSize: 10, fontFamily: "monospace", color: r.delta?.inventory ? "#f97316" : "#374151" }}>{fmtStock(r.inventory, r)}</span>
                                                <span style={{ fontSize: 10, color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.4)", borderRadius: 5, padding: "1px 5px", whiteSpace: "nowrap" }}>📦 {t('catalogSync.stock.inbound', '입고')}</span>
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
                                            <span style={{ fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 10, background: statusColor(r.status) + "18", color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}33` }}>
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
                {noticeModal && <ProductNoticeModal product={noticeModal} types={noticeTypes} busy={brandBusy === noticeModal.sku}
                    onSave={(typeCode, items) => saveProductNotice(noticeModal, typeCode, items)} onClose={() => setNoticeModal(null)} />}

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
// [286차] 상품정보제공고시 편집 모달 — 11번가 상품등록 필수. 고시유형(40종) 선택 + 항목값 입력(비우면 '상세설명 참조').
function ProductNoticeModal({ product: p, types, busy, onSave, onClose }) {
    const { t } = useI18n();
    const REF = t('catalogSync.notice.ref', '상세설명 참조');
    const initial = useMemo(() => {
        let type = p.noticeType || '';
        let items = {};
        const nj = p._meta?.notice_json || '';
        if (nj) {
            try { const d = JSON.parse(nj); if (d && d.type) type = String(d.type); if (d && d.items && typeof d.items === 'object') items = d.items; } catch { /* ignore */ }
        }
        return { type, items };
    }, [p]);
    const [typeCode, setTypeCode] = useState(initial.type || '');
    const [items, setItems] = useState(initial.items || {});
    const def = useMemo(() => types.find(x => String(x.code) === String(typeCode)) || null, [types, typeCode]);

    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    const fillAllRef = () => {
        if (!def) return;
        setItems(prev => { const nx = { ...prev }; def.items.forEach(it => { if (!String(nx[it.name] || '').trim()) nx[it.name] = REF; }); return nx; });
    };
    const save = () => {
        if (!def) return;
        const out = {};
        def.items.forEach(it => { const v = String(items[it.name] || '').trim(); out[it.name] = v || REF; });
        onSave(String(def.code), out);
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 210 }} />
            <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 480, maxWidth: "94vw", background: "#fff", borderLeft: "1px solid rgba(99,140,255,0.2)", zIndex: 211, overflowY: "auto", padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 14, color: "#1f2937" }}>📋 {t('catalogSync.notice.title', '상품정보제공고시')}</div>
                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{p.name}</div>
                    </div>
                    <button onClick={onClose} className="btn-ghost" style={{ padding: "5px 10px" }}>✕</button>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
                    {t('catalogSync.notice.desc', '전자상거래법 필수 항목입니다. 유형을 선택하고 값을 입력하세요. 비워두면 법이 허용하는 "상세설명 참조"로 전송됩니다.')}
                </div>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5 }}>{t('catalogSync.notice.type', '고시 유형')}</div>
                    <select value={typeCode} onChange={e => setTypeCode(e.target.value)} style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: "1px solid #cbd5e1", fontSize: 12, background: "#fff" }}>
                        <option value="">{t('catalogSync.notice.pickType', '유형 선택… (미선택 시 기타 재화)')}</option>
                        {types.map(ty => <option key={ty.code} value={ty.code}>{ty.name}</option>)}
                    </select>
                </div>
                {def && (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{t('catalogSync.notice.items', '항목값')}</div>
                            <button type="button" onClick={fillAllRef} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}>
                                {t('catalogSync.notice.fillRef', '전체 "상세설명 참조" 채우기')}
                            </button>
                        </div>
                        {def.items.map(it => (
                            <div key={it.code} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 3 }}>{it.name}</div>
                                <input value={items[it.name] || ''} onChange={e => setItems(prev => ({ ...prev, [it.name]: e.target.value }))}
                                    placeholder={REF} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11 }} />
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button type="button" disabled={busy || !def} onClick={save} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: def ? "#4f8ef7" : "#cbd5e1", color: "#fff", fontWeight: 700, fontSize: 12, cursor: def ? "pointer" : "default" }}>
                        {busy ? '…' : t('catalogSync.notice.save', '고시 저장')}
                    </button>
                    <button type="button" onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, cursor: "pointer" }}>
                        {t('common.cancel', '취소')}
                    </button>
                </div>
            </div>
        </>
    );
}

const ProductDetail = memo(function ProductDetail({ product: p, onClose }) {
    const { t } = useI18n();
    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);

    // [277차] 가격 변경 이력 — 백엔드는 catalog_listing upsert 시 old≠new 일 때 price_history 에 기록해 왔으나
    //   조회 UI 가 없어 확인할 수 없었다(GET /catalog/price-history 는 193차부터 존재·프론트 소비 0건).
    const [priceHist, setPriceHist] = useState([]);
    const [phLoading, setPhLoading] = useState(false);
    useEffect(() => {
        if (!p?.sku) return;
        let alive = true;
        setPhLoading(true);
        getJsonAuth(`/api/catalog/price-history?sku=${encodeURIComponent(p.sku)}`)
            .then(d => { if (alive) setPriceHist(d.history || []); })
            .catch(() => { if (alive) setPriceHist([]); })
            .finally(() => { if (alive) setPhLoading(false); });
        return () => { alive = false; };
    }, [p?.sku]);

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

                {/* [277차] 가격 변경 이력 — 채널별 old→new, 변경 출처(writeback/repricer/bulk), 시각 */}
                <div style={{ marginBottom: 18, padding: 12, borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                        💱 {t('catalogSync.priceHistoryTitle', '가격 변경 이력')}
                    </div>
                    {phLoading && <div style={{ fontSize: 11, color: "#7c8fa8" }}>…</div>}
                    {!phLoading && priceHist.length === 0 && (
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{t('catalogSync.priceHistoryEmpty', '가격 변경 이력이 없습니다')}</div>
                    )}
                    {!phLoading && priceHist.length > 0 && (
                        <div style={{ maxHeight: 160, overflowY: "auto" }}>
                            {priceHist.map((h, i) => {
                                const up = Number(h.new_price) > Number(h.old_price);
                                return (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, padding: "5px 0", borderBottom: "1px solid #eef2f7" }}>
                                        <span style={{ color: "#64748b" }}>{h.channel}</span>
                                        <span style={{ fontFamily: "monospace" }}>
                                            {fmtKRW(h.old_price)} <span style={{ color: up ? "#dc2626" : "#16a34a", fontWeight: 700 }}>{up ? '▲' : '▼'}</span> {fmtKRW(h.new_price)}
                                        </span>
                                        <span style={{ color: "#94a3b8", fontSize: 10 }}>{h.source} · {String(h.created_at).slice(0, 16).replace('T', ' ')}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                            <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 900, color: "#f97316" }}>{fmtKRW(p.productCost)}</span>
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
        try { tSet('geniego_sync_schedules', JSON.stringify(updated)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
        addAlert({ type: 'success', msg: t('catalogSync.alertScheduleSaved', { freq: FREQ_OPTIONS.find(f => f.id === freq)?.label, time }) });
    };
    const deleteSchedule = (id) => {
        const updated = schedules.filter(s => s.id !== id);
        setSchedules(updated);
        try { tSet('geniego_sync_schedules', JSON.stringify(updated)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
    };
    const toggleSchedule = (id) => {
        const updated = schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
        setSchedules(updated);
        try { tSet('geniego_sync_schedules', JSON.stringify(updated)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
    };

    return (
        <div style={{ background: "#ffffff", borderRadius: 14, border: '1px solid rgba(168,85,247,0.2)', padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                {t('catalogSync.scheduleTitle', '자동 동기화 스케줄')}
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>{schedules.filter(s => s.enabled).length} {t('catalogSync.activeLabel')}</span>
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
                            <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>{s.createdAt}</span>
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
                            <span style={{ fontSize: 14 }}>{c.icon}</span>
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
                            <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: 10 }}>{liveJob.type === "full" ? t('catalogSync.fullLabel') : t('catalogSync.incrementalLabel')}</span>
                            {dryRun && <span className="badge badge-yellow" style={{ marginLeft: 4, fontSize: 10 }}>DRY-RUN</span>}
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
                                                {c.connected && <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 4 }}>✅</span>}
                                                {c.autoAdded && <span style={{ fontSize: 10, color: '#a855f7', marginLeft: 4 }}>NEW</span>}
                                                {rateSource && <span style={{ fontSize: 10, color: '#4f8ef7', marginLeft: 4 }}>{rateSource.region}</span>}
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
                                            <td><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>{r.ok ? "✓" : "✗"}</span></td>
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
                                        <span style={{ fontWeight: 700, padding: "2px 10px", borderRadius: 20, fontSize: 10, color, background: color + "18", border: `1px solid ${color}33` }}>
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
                            <td style={{ padding: "8px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "#dbeafe", color: "#2563eb" }}>{j.type === "full" ? t('catalogSync.fullLabel') : t('catalogSync.incrementalLabel')}</span></td>
                            <td style={{ padding: "8px", fontSize: 11 }}>{j.channels.map(c => ch(c).icon).join(" ")}</td>
                            <td style={{ padding: "8px", fontSize: 10, color: "#6b7280" }}>{j.scope.join(", ")}</td>
                            <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11 }}>{j.done?.toLocaleString()} / {j.total?.toLocaleString()}</td>
                            <td style={{ padding: "8px", color: j.errors > 0 ? "#ef4444" : "#22c55e", fontFamily: "monospace", fontSize: 11 }}>{j.errors}</td>
                            <td style={{ padding: "8px", minWidth: 80 }}><ProgressBar pct={j.progress} color={j.status === "done" ? "#22c55e" : "#4f8ef7"} /></td>
                            <td style={{ padding: "8px" }}><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: j.status === "done" ? "#d1fae5" : j.status === "running" ? "#dbeafe" : "#fee2e2", color: j.status === "done" ? "#22c55e" : j.status === "running" ? "#2563eb" : "#ef4444" }}>{j.status === "done" ? t('catalogSync.done') : j.status === "running" ? t('catalogSync.runningStatus') : t('catalogSync.statusError')}</span></td>
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
/**
 * [277차 재작성] 채널 카테고리 매핑 — 서버 실배선 + 채널 카테고리 조회·선택.
 *
 * 종전 문제(가짜 기능): 이 탭은 매핑을 **localStorage 에만** 저장했고 서버 channel_category_map 과
 *   전혀 연결돼 있지 않았다. 여기서 매핑해도 채널 등록(writeback)에는 반영되지 않았다.
 *   게다가 채널 카테고리 코드를 사용자가 **직접 타이핑**해야 했는데, 네이버 리프카테고리는 5,011개다.
 *
 * 현재: GET/POST/DELETE /api/catalog/category-map 으로 서버에 영속하고,
 *   GET /api/catalog/channel-categories?channel=&q= 로 **채널의 실제 카테고리를 검색해 선택**한다.
 *   여기서 저장한 매핑은 resolveChannelCategory 가 즉시 사용한다(자동 매칭보다 우선).
 */
const CategoryMappingTab = memo(function CategoryMappingTab() {
    const { t } = useI18n();
    const dynamicChannels = useDynamicChannels();
    const { inventory } = useGlobalData();

    // 상품 전송이 가능한(=카테고리 코드가 필요한) 연동 채널만 대상으로 한다.
    const targetChs = useMemo(
        () => dynamicChannels.filter(c => c.connected && PUBLISHABLE_CHANNELS_UI.has(c.id)),
        [dynamicChannels]
    );
    const [channel, setChannel] = useState('');
    useEffect(() => { if (!channel && targetChs.length) setChannel(targetChs[0].id); }, [targetChs, channel]);

    const [rows, setRows] = useState([]);          // 서버 매핑
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    // 내 카테고리 후보 — 등록상품/재고에서 실제로 쓰이는 값(임의 목록이 아니라 실데이터)
    const [myCats, setMyCats] = useState([]);
    useEffect(() => {
        let alive = true;
        getJsonAuth('/v420/price/products')
            .then(d => {
                if (!alive) return;
                const fromProducts = (d.products || []).map(p => (p.category || '').trim()).filter(Boolean);
                const fromInv = (inventory || []).map(i => (i.category || '').trim()).filter(Boolean);
                setMyCats([...new Set([...fromProducts, ...fromInv])].sort());
            })
            .catch(() => {
                const fromInv = (inventory || []).map(i => (i.category || '').trim()).filter(Boolean);
                setMyCats([...new Set(fromInv)].sort());
            });
        return () => { alive = false; };
    }, [inventory]);

    const load = useCallback(() => {
        if (!channel) return;
        setLoading(true);
        getJsonAuth(`/api/catalog/category-map?channel=${encodeURIComponent(channel)}`)
            .then(r => setRows(r.mappings || []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [channel]);
    useEffect(() => { load(); }, [load]);

    // ── 채널 카테고리 선택 모달 ─────────────────────────────────────────────
    //   [현 차수] 11번가는 한 내 카테고리에 '기본카테고리' + '표시카테고리(dispCtgrNo)' 2개를 각각 지정한다.
    //   → 변경 다이얼로그가 두 슬롯을 갖고, 각 슬롯의 [선택]이 카테고리 검색을 열어 그 슬롯 값만 채운다. 저장은 함께.
    const dualCat = (channel === '11st' || channel === 'st11');
    const [pickFor, setPickFor] = useState(null);   // 편집 중인 내 카테고리(src) — null=닫힘
    const [slotBase, setSlotBase] = useState({ code: '', label: '' });      // 기본카테고리
    const [slotDisp, setSlotDisp] = useState({ code: '', label: '' });      // 표시카테고리
    const [activeSlot, setActiveSlot] = useState(null); // 'base' | 'disp' | null(두 슬롯 요약)
    const [q, setQ] = useState('');
    const [found, setFound] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searchErr, setSearchErr] = useState('');

    const search = useCallback(async (term) => {
        setSearching(true); setSearchErr('');
        try {
            const qs = new URLSearchParams({ channel, ...(term ? { q: term } : {}) }).toString();
            const d = await getJsonAuth(`/api/catalog/channel-categories?${qs}`);
            if (!d.ok) { setSearchErr(d.hint || d.error || t('catalogSync.cmFail', '카테고리를 불러오지 못했습니다')); setFound([]); }
            else setFound(d.categories || []);
        } catch (e) { setSearchErr(e.message); setFound([]); }
        finally { setSearching(false); }
    }, [channel, t]);

    const openPicker = (srcCategory) => {
        const m = rows.find(r => r.src_category === srcCategory) || {};
        setPickFor(srcCategory);
        setSlotDisp({ code: m.channel_code || '', label: m.channel_label || '' });
        setSlotBase({ code: m.base_code || '', label: m.base_label || '' });
        setActiveSlot(dualCat ? null : 'disp'); // 단일 채널은 바로 검색 열기(기존 UX)
        setQ(srcCategory); setFound([]); setSearchErr('');
        if (!dualCat) search(srcCategory);
    };

    // 슬롯의 [선택] — 그 슬롯의 카테고리 검색을 연다.
    const openSlotSearch = (slot) => { setActiveSlot(slot); setQ(pickFor || ''); setFound([]); setSearchErr(''); search(pickFor || ''); };

    // 검색 결과 클릭 — 활성 슬롯에 값 채우기. 단일 채널(비-11번가)은 즉시 저장(기존 동작).
    const pickResult = (c) => {
        const val = { code: c.code, label: c.whole_name || c.name || c.code };
        if (!dualCat) { saveMappingDual(pickFor, val, { code: '', label: '' }); setPickFor(null); return; }
        if (activeSlot === 'base') setSlotBase(val); else setSlotDisp(val);
        setActiveSlot(null); // 두 슬롯 요약으로 복귀
    };

    const saveMappingDual = async (srcCategory, disp, base) => {
        setMsg(null);
        if (!disp || !disp.code) { setMsg({ ok: false, text: t('catalogSync.cmNeedDisp', '표시카테고리를 선택하세요') }); return; }
        try {
            const d = await postJson('/api/catalog/category-map', {
                channel, src_category: srcCategory,
                channel_code: disp.code, channel_label: disp.label || '',
                base_code: base?.code || '', base_label: base?.label || '',
            });
            if (!d.ok) throw new Error(d.error || 'save failed');
            setMsg({ ok: true, text: t('catalogSync.cmSaved', '매핑을 저장했습니다') });
            setPickFor(null);
            load();
        } catch (e) {
            setMsg({ ok: false, text: e.message });
        }
    };

    const removeMapping = async (id) => {
        setMsg(null);
        try {
            await requestJsonAuth(`/api/catalog/category-map/${id}`, 'DELETE');
            load();
        } catch (e) { setMsg({ ok: false, text: e.message }); }
    };

    const mapOf = (src) => rows.find(r => r.src_category === src) || null;
    // 서버에 이미 매핑된 카테고리 중 내 상품 목록에 없는 것도 함께 보여준다(과거 매핑 확인·삭제).
    const allSrc = useMemo(
        () => [...new Set([...myCats, ...rows.map(r => r.src_category)])].sort(),
        [myCats, rows]
    );

    const cell = { padding: "8px 10px", fontSize: 11, borderBottom: "1px solid #f1f5f9" };

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.2)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>🗂 {t('catalogSync.cmTitle', '채널 카테고리 매핑')}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.6 }}>
                    {t('catalogSync.cmDesc', '내 상품 카테고리를 채널의 실제 카테고리에 연결합니다. 여기서 저장한 매핑은 채널 등록 시 즉시 사용되며, 자동 매칭보다 우선합니다.')}
                </div>
            </div>

            {targetChs.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: 12 }}>
                    {t('catalogSync.cmNoChannel', '상품 전송이 가능한 연동 채널이 없습니다 — 연동허브에서 채널을 먼저 연결하세요')}
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{t('catalogSync.cmChannel', '채널')}</span>
                        <select value={channel} onChange={e => setChannel(e.target.value)}
                            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}>
                            {targetChs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={load} disabled={loading}
                            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 11, cursor: "pointer" }}>
                            {loading ? '…' : t('catalogSync.cmRefresh', '새로고침')}
                        </button>
                        {msg && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: msg.ok ? "#16a34a" : "#dc2626" }}>
                                {msg.ok ? '✅' : '❌'} {msg.text}
                            </span>
                        )}
                    </div>

                    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    <th style={{ ...cell, textAlign: "left", fontWeight: 800 }}>{t('catalogSync.cmMyCategory', '내 카테고리')}</th>
                                    <th style={{ ...cell, textAlign: "left", fontWeight: 800 }}>{t('catalogSync.cmChannelCategory', '채널 카테고리')}</th>
                                    <th style={{ ...cell, textAlign: "right", fontWeight: 800, width: 160 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {allSrc.length === 0 && (
                                    <tr><td colSpan={3} style={{ ...cell, color: "#94a3b8" }}>
                                        {t('catalogSync.cmNoCategory', '상품에 매핑카테고리(내 카테고리)가 없습니다 — 상품등록에서 카테고리를 지정하세요')}
                                    </td></tr>
                                )}
                                {allSrc.filter(src => src !== '(기본)').map(src => {
                                    const m = mapOf(src);
                                    return (
                                        <tr key={src}>
                                            <td style={{ ...cell, fontWeight: 600, color: "#0f172a" }}>{src}</td>
                                            <td style={cell}>
                                                {m ? (
                                                    <div>
                                                        {/* [현 차수] 11번가는 기본+표시 2코드를 함께 표시 */}
                                                        {dualCat && (
                                                            <div style={{ marginBottom: 3 }}>
                                                                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{t('catalogSync.cmBaseCat', '기본카테고리')}: </span>
                                                                {m.base_code
                                                                    ? <span style={{ color: "#0f172a" }}>{m.base_label || m.base_code} <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 10 }}>({m.base_code})</span></span>
                                                                    : <span style={{ color: "#f59e0b" }}>{t('catalogSync.cmSlotUnset', '미선택')}</span>}
                                                            </div>
                                                        )}
                                                        <div>
                                                            {dualCat && <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{t('catalogSync.cmDispCat', '표시카테고리 (dispCtgrNo)')}: </span>}
                                                            <span style={{ color: "#0f172a" }}>{m.channel_label || '(라벨 없음)'}</span> <span style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 10 }}>({m.channel_code})</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "#f59e0b" }}>{t('catalogSync.cmUnmapped', '미매핑 — 자동 매칭에 의존')}</span>
                                                )}
                                            </td>
                                            <td style={{ ...cell, textAlign: "right" }}>
                                                <button onClick={() => openPicker(src)}
                                                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #4f8ef7", background: "#fff", color: "#4f8ef7", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                                    🔍 {m ? t('catalogSync.cmChange', '변경') : t('catalogSync.cmPick', '선택')}
                                                </button>
                                                {m && (
                                                    <button onClick={() => removeMapping(m.id)}
                                                        style={{ marginLeft: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 10, cursor: "pointer" }}>
                                                        {t('catalogSync.cmDelete', '삭제')}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* 채널 카테고리 검색·선택 모달 */}
            {pickFor !== null && (
                <div onClick={() => setPickFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(600px,100%)", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #eef2f7" }}>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>📂 {t('catalogSync.cmPickTitle', '채널 카테고리 선택')}</div>
                            <div style={{ fontSize: 11, color: "#7c8fa8", marginTop: 3 }}>
                                {t('catalogSync.cmMyCategory', '내 카테고리')}: <b>{pickFor}</b> · {targetChs.find(c => c.id === channel)?.name || channel}
                            </div>
                        </div>
                        {dualCat && activeSlot === null ? (
                            /* [현 차수] 11번가 — 기본카테고리 + 표시카테고리 두 슬롯을 하나의 매핑에 지정 */
                            <>
                                <div style={{ padding: "12px 16px" }}>
                                    {[['base', t('catalogSync.cmBaseCat', '기본카테고리'), slotBase],
                                      ['disp', t('catalogSync.cmDispCat', '표시카테고리 (dispCtgrNo)'), slotDisp]].map(([slot, label, val]) => (
                                        <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                            <div style={{ width: 150, fontSize: 12, fontWeight: 700, color: '#334155' }}>{label}</div>
                                            <div style={{ flex: 1, fontSize: 11 }}>
                                                {val.code
                                                    ? <div><div style={{ color: '#0f172a', fontWeight: 600 }}>{val.label}</div><div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }}>{val.code}</div></div>
                                                    : <span style={{ color: '#f59e0b' }}>{t('catalogSync.cmSlotUnset', '미선택')}</span>}
                                            </div>
                                            <button onClick={() => openSlotSearch(slot)}
                                                style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #4f8ef7", background: "#fff", color: "#4f8ef7", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: 'nowrap' }}>
                                                🔍 {t('catalogSync.cmPick', '선택')}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ padding: "10px 16px", borderTop: "1px solid #eef2f7", display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                    <button onClick={() => setPickFor(null)} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>{t('catalogSync.cmCancel', '취소')}</button>
                                    <button onClick={() => saveMappingDual(pickFor, slotDisp, slotBase)}
                                        style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#4f8ef7", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t('catalogSync.cmSaveBtn', '저장')}</button>
                                </div>
                            </>
                        ) : (
                            <>
                                {dualCat && (
                                    <div style={{ padding: "8px 16px 0" }}>
                                        <button onClick={() => setActiveSlot(null)} style={{ fontSize: 11, color: "#4f8ef7", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                                            ← {activeSlot === 'base' ? t('catalogSync.cmBaseCat', '기본카테고리') : t('catalogSync.cmDispCat', '표시카테고리 (dispCtgrNo)')} {t('catalogSync.cmPicking', '선택 중')}
                                        </button>
                                    </div>
                                )}
                                <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
                                    <input value={q} onChange={e => setQ(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') search(q); }}
                                        placeholder={t('catalogSync.cmSearchPh', '예: 건강식품, 니트, 이어폰')}
                                        style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontSize: 12 }} />
                                    <button onClick={() => search(q)} disabled={searching}
                                        style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#4f8ef7", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                        {searching ? '…' : t('catalogSync.cmSearchBtn', '검색')}
                                    </button>
                                </div>
                                <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 12px" }}>
                                    {searchErr && <div style={{ fontSize: 11, color: "#ef4444", padding: 8 }}>❌ {searchErr}</div>}
                                    {searching && <div style={{ fontSize: 11, color: "#7c8fa8", padding: 8 }}>{t('catalogSync.cmLoading', '카테고리를 불러오는 중… (최초 1회는 수천 건 수집으로 시간이 걸립니다)')}</div>}
                                    {!searching && !searchErr && found.length === 0 && (
                                        <div style={{ fontSize: 11, color: "#94a3b8", padding: 8 }}>{t('catalogSync.cmNoResult', '검색 결과가 없습니다')}</div>
                                    )}
                                    {found.map(c => (
                                        <div key={c.code} onClick={() => pickResult(c)}
                                            style={{ padding: "9px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, borderBottom: "1px solid #f1f5f9" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <div style={{ color: "#0f172a", fontWeight: 600 }}>{c.whole_name || c.name}</div>
                                            <div style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 10 }}>{c.code}</div>
                                        </div>
                                    ))}
                                </div>
                                {!dualCat && (
                                    <div style={{ padding: "10px 16px", borderTop: "1px solid #eef2f7", textAlign: "right" }}>
                                        <button onClick={() => setPickFor(null)} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>
                                            {t('catalogSync.close')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

/* ─── Tab: Usage Guide ─────────────────────────────────────────────────────── */
/**
 * [285차] 브랜드 관리 — 테넌트 브랜드 정본 목록.
 *   11번가 상품등록은 브랜드가 **필수**다(브랜드코드 미보유 시 <brand> 명 필수). 종전엔 브랜드가
 *   상품 폼 자유입력뿐이라 표기 흔들림(청정원/淸淨園/CJW)이 그대로 채널에 나갔고, 수집 상품은
 *   브랜드가 비어 등록이 영구 거부됐다. 여기서 정본을 관리하고 상품에서는 선택만 하게 한다.
 */
const BrandTab = memo(function BrandTab() {
    const { t } = useI18n();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [msg, setMsg] = useState(null);
    const [editId, setEditId] = useState(0);

    const load = useCallback(() => {
        setLoading(true);
        getJsonAuth('/api/catalog/brands')
            .then(d => setRows(d.items || []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => { load(); }, [load]);

    const save = async () => {
        const nm = name.trim();
        if (!nm) return;
        setMsg(null);
        try {
            const d = await postJson('/api/catalog/brands', { name: nm, code: code.trim(), ...(editId ? { id: editId } : {}) });
            if (d.ok) { setName(''); setCode(''); setEditId(0); load(); setMsg({ ok: true, text: t('catalogSync.brand.statSaved', '저장했습니다') }); }
            else setMsg({ ok: false, text: d.error || 'failed' });
        } catch (e) { setMsg({ ok: false, text: e.message }); }
    };

    const remove = async (r) => {
        setMsg(null);
        try {
            const d = await requestJsonAuth(`/api/catalog/brands/${r.id}`, 'DELETE');
            if (d.ok) { load(); setMsg({ ok: true, text: t('catalogSync.brand.statDeleted', '삭제했습니다') }); }
            else setMsg({ ok: false, text: d.error || 'failed' });
        } catch (e) { setMsg({ ok: false, text: e.message }); }
    };

    return (
        <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                🏷️ {t('catalogSync.brand.title', '브랜드 관리')}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, marginBottom: 14 }}>
                {t('catalogSync.brand.subtitle', '11번가 상품등록은 브랜드가 필수입니다. 여기에 등록한 브랜드를 상품정보에서 선택해 쓰세요.')}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
                <input value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') save(); }}
                    placeholder={t('catalogSync.brand.fNamePh', '브랜드명 (예: 청정원)')}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12, minWidth: 200 }} />
                <input value={code} onChange={e => setCode(e.target.value)}
                    placeholder={t('catalogSync.brand.fCodePh', '채널 브랜드코드 (선택)')}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12, minWidth: 180 }} />
                <button onClick={save} disabled={!name.trim()}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: name.trim() ? "#2563eb" : "#cbd5e1", color: "#fff", fontSize: 12, fontWeight: 700, cursor: name.trim() ? "pointer" : "not-allowed" }}>
                    {editId ? t('catalogSync.brand.updateBtn', '수정') : t('catalogSync.brand.addBtn', '＋ 추가')}
                </button>
                {editId > 0 && (
                    <button onClick={() => { setEditId(0); setName(''); setCode(''); }}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>
                        {t('catalogSync.brand.cancelBtn', '취소')}
                    </button>
                )}
                {msg && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: msg.ok ? "#16a34a" : "#dc2626" }}>
                        {msg.ok ? '✅' : '❌'} {msg.text}
                    </span>
                )}
            </div>

            {loading ? (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>…</div>
            ) : rows.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>
                    {t('catalogSync.brand.statEmpty', '등록된 브랜드가 없습니다 — 위에서 추가하세요')}
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", color: "#64748b", fontSize: 11 }}>
                                <th style={{ textAlign: "left", padding: "8px 10px" }}>{t('catalogSync.brand.fName', '브랜드명')}</th>
                                <th style={{ textAlign: "left", padding: "8px 10px" }}>{t('catalogSync.brand.fCode', '채널 브랜드코드')}</th>
                                <th style={{ textAlign: "right", padding: "8px 10px" }}>{t('catalogSync.brand.colUsed', '사용 상품')}</th>
                                <th style={{ textAlign: "right", padding: "8px 10px" }}>{t('catalogSync.brand.colAction', '관리')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#0f172a" }}>{r.name}</td>
                                    <td style={{ padding: "8px 10px", color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>{r.code || '—'}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "right", color: "#334155" }}>{r.used || 0}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                                        <button onClick={() => { setEditId(r.id); setName(r.name); setCode(r.code || ''); }}
                                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: 10, cursor: "pointer", marginRight: 6 }}>
                                            {t('catalogSync.brand.editBtn', '수정')}
                                        </button>
                                        <button onClick={() => remove(r)}
                                            title={r.used > 0 ? t('catalogSync.brand.errInUse', '사용 중인 브랜드는 삭제할 수 없습니다') : ''}
                                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", fontSize: 10, cursor: "pointer" }}>
                                            {t('catalogSync.brand.deleteBtn', '삭제')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
});

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
    const secTitle = { fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* 배너 + 배지 */}
            <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, border: "1px solid #fed7aa", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('catalogSync.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('catalogSync.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 700, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
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
                                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
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
            if (e.data?.type === 'PRODUCT_UPDATE' && e.data.source !== 'catalogSync') { /* 의도적 no-op — 타 소스 갱신은 이 탭에서 별도 처리 없음 */ }
        };
        return () => bc.close();
    }, []);

    const broadcastProducts = useCallback(() => {
        try {
            const bc = new BroadcastChannel(tChannelName('genie_product_sync'));
            bc.postMessage({ type: 'PRODUCT_UPDATE', source: 'catalogSync', ts: Date.now() });
            bc.close();
        } catch { /* BroadcastChannel 정리 실패 무시 */ }
    }, []);

    const TABS = useMemo(() => [
        { id: "catalog", label: `📚 ${t('catalogSync.tabCatalog')}` },
        { id: "sync", label: `🔄 ${t('catalogSync.tabSyncRun')}` },
        { id: "catmap", label: `🗂️ ${t('catalogSync.tabCategoryMapping')}` },
        { id: "brand", label: `🏷️ ${t('catalogSync.brand.tabLabel', '브랜드 관리')}` },
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
                    <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 700, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
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
                {tab === "brand" && <BrandTab />}
                {tab === "price" && <PriceSyncTab />}
                {tab === "inventory" && <InventorySyncTab />}
                {tab === "history" && <JobHistoryTab jobs={jobs} />}
                {tab === "guide" && <UsageGuideTab />}
            </div>
        </div>
    );
}

