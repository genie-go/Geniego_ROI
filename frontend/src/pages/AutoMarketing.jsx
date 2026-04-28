import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import CreativeStudioTab from "./CreativeStudioTab.jsx";
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';
import ApprovalModal from '../components/ApprovalModal.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ─── Constant ────────────────────────────────────────────────────────────────────── */
const PCT = (v) => v == null ? "—" : Number(v).toFixed(1) + "%";

// Constant BasicValue (label은 Component within t()로 오버라이드)
const PRODUCT_CATEGORIES_BASE = [
    { id: "beauty", icon: "💄", tagKeys: ["tag_skincare", "tag_makeup", "tag_perfume", "tag_haircare"] },
    { id: "fashion", icon: "👗", tagKeys: ["tag_womens", "tag_mens", "tag_outer", "tag_accessories"] },
    { id: "general", icon: "🛍", tagKeys: ["tag_kitchen", "tag_cleaning", "tag_interior", "tag_small"] },
    { id: "food", icon: "🥗", tagKeys: ["tag_health", "tag_processed", "tag_organic"] },
    { id: "electronics", icon: "📱", tagKeys: ["tag_phone_acc", "tag_appliance", "tag_computer"] },
    { id: "travel", icon: "✈️", tagKeys: ["tag_hotel", "tag_flight", "tag_tour", "tag_leisure"] },
    { id: "digital", icon: "💻", tagKeys: ["tag_app", "tag_saas", "tag_content", "tag_subscription"] },
    { id: "platform", icon: "🧩", tagKeys: ["tag_saas", "tag_b2b", "tag_api", "tag_enterprise"] },
    { id: "overseas_ship", icon: "🚢", tagKeys: ["tag_proxy_ship", "tag_overseas_delivery", "tag_customs"] },
    { id: "overseas_buy", icon: "🛒", tagKeys: ["tag_us_direct", "tag_jp_direct", "tag_cn_direct"] },
    { id: "sports", icon: "⚽", tagKeys: ["tag_fitness", "tag_outdoor", "tag_sportswear"] },
];

// Categoryper 최적 Ad Channel Recommend (AI Recommend 기준)
const CATEGORY_AD_RECOMMEND = {
    beauty:       ["meta", "instagram", "tiktok"],
    fashion:      ["instagram", "meta", "tiktok"],
    general:      ["naver", "coupang_ads", "google"],
    food:         ["naver", "kakao", "meta"],
    electronics:  ["google", "naver", "coupang_ads"],
    travel:       ["google", "meta", "instagram"],
    digital:      ["google", "meta", "tiktok"],
    platform:     ["google", "meta", "naver"],        // B2B SaaS → Search in progress심
    overseas_ship:["meta", "google", "naver"],
    overseas_buy: ["meta", "instagram", "google"],
    sports:       ["tiktok", "instagram", "meta"],
};

const AD_CHANNELS_BASE = [
    { id: "meta",         icon: "📘", color: "#1877f2", cpm: 8000,  minBudget: 100000, connectorKey: "meta_ads" },
    { id: "tiktok",       icon: "🎵", color: "#ff0050", cpm: 5000,  minBudget: 150000, connectorKey: "tiktok_business" },
    { id: "google",       icon: "🔍", color: "#4285f4", cpm: 10000, minBudget: 50000,  connectorKey: "google_ads" },
    { id: "naver",        icon: "🟩", color: "#03c75a", cpm: 7000,  minBudget: 100000, connectorKey: "naver_sa" },
    { id: "kakao",        icon: "💛", color: "#fee500", color2: "#3c1e1e", cpm: 6000, minBudget: 100000, connectorKey: "kakao_moment" },
    { id: "coupang_ads",  icon: "🛍", color: "#ef4444", cpm: 9000,  minBudget: 50000,  connectorKey: "coupang" },
    { id: "instagram",    icon: "📸", color: "#e1306c", cpm: 7500,  minBudget: 100000, connectorKey: "instagram" },
];

// ─────────────────────────────────────────────────────────────────
// Channelper Recommend 근거 데이터
// ─────────────────────────────────────────────────────────────────
const CHANNEL_EXPLAIN = {
    meta:        { icon: "📘", color: "#1877f2", strengthKey: "ch_explain_meta_strength",    whyKey: "ch_explain_meta_why",        kpi: ["CTR 1.5~3%","ROAS 3~8x"], tipKey: "ch_explain_meta_tip"        },
    tiktok:      { icon: "🎵", color: "#ff0050", strengthKey: "ch_explain_tiktok_strength",  whyKey: "ch_explain_tiktok_why",      kpi: ["CTR 2~5%","ROAS 2~5x"],   tipKey: "ch_explain_tiktok_tip"      },
    google:      { icon: "🔍", color: "#4285f4", strengthKey: "ch_explain_google_strength",  whyKey: "ch_explain_google_why",      kpi: ["CTR 3~8%","ROAS 4~10x"],  tipKey: "ch_explain_google_tip"      },
    naver:       { icon: "🟩", color: "#03c75a", strengthKey: "ch_explain_naver_strength",   whyKey: "ch_explain_naver_why",       kpi: ["CTR 2~6%","ROAS 3~7x"],   tipKey: "ch_explain_naver_tip"       },
    kakao:       { icon: "💛", color: "#f5a623", strengthKey: "ch_explain_kakao_strength",   whyKey: "ch_explain_kakao_why",       kpi: ["CTR 3~7%","ROAS 2~5x"],   tipKey: "ch_explain_kakao_tip"       },
    coupang_ads: { icon: "🛍", color: "#ef4444", strengthKey: "ch_explain_coupang_strength", whyKey: "ch_explain_coupang_why",     kpi: ["CTR 4~10%","ROAS 5~12x"], tipKey: "ch_explain_coupang_tip"     },
    instagram:   { icon: "📸", color: "#e1306c", strengthKey: "ch_explain_insta_strength",   whyKey: "ch_explain_insta_why",       kpi: ["CTR 1~3%","ROAS 2~6x"],   tipKey: "ch_explain_insta_tip"       },
};

// Categoryper Marketing 인사이트
const CATEGORY_EXPLAIN = {
    beauty:        { insightKey: "cat_explain_beauty"        },
    fashion:       { insightKey: "cat_explain_fashion"       },
    general:       { insightKey: "cat_explain_general"       },
    food:          { insightKey: "cat_explain_food"          },
    electronics:   { insightKey: "cat_explain_electronics"   },
    travel:        { insightKey: "cat_explain_travel"        },
    digital:       { insightKey: "cat_explain_digital"       },
    platform:      { insightKey: "cat_explain_platform"      },
    overseas_ship: { insightKey: "cat_explain_overseas_ship" },
    overseas_buy:  { insightKey: "cat_explain_overseas_buy"  },
    sports:        { insightKey: "cat_explain_sports"        },
};

// ───────────────────────────────────────────────────────────────────────────
// Budget 구간per Channel Recommend 함Count
// 반환: { channels: string[], tier: string, reason: string }
// ───────────────────────────────────────────────────────────────────────────
function getBudgetRecommend(budget, t) {
    if (!budget || budget <= 0) return null;
    if (budget < 200000) {
        return { channels: ["google", "coupang_ads"], tier: t('marketing.tier1'), reason: t('marketing.reason1') };
    }
    if (budget < 500000) {
        return { channels: ["google", "naver", "meta"], tier: t('marketing.tier2'), reason: t('marketing.reason2') };
    }
    if (budget < 1000000) {
        return { channels: ["meta", "instagram", "google", "naver", "kakao"], tier: t('marketing.tier3'), reason: t('marketing.reason3') };
    }
    if (budget < 3000000) {
        return { channels: ["meta", "instagram", "tiktok", "google", "naver"], tier: t('marketing.tier4'), reason: t('marketing.reason4') };
    }
    return { channels: ["meta", "instagram", "tiktok", "google", "naver", "kakao", "coupang_ads"], tier: t('marketing.tier5'), reason: t('marketing.reason5') };
}

const SALES_CHANNELS_BASE = [
    { id: "coupang", icon: "🛍", active: true, connectorKey: "coupang" },
    { id: "naver_smart", icon: "🟩", active: true, connectorKey: "naver_smartstore" },
    { id: "11st", icon: "🔴", active: false, connectorKey: "st11" },
    { id: "gmarket", icon: "🟣", active: true, connectorKey: "gmarket" },
    { id: "kakao_shop", icon: "💛", active: false, connectorKey: "kakao_moment" },
    { id: "tiktok_shop", icon: "🎵", active: true, connectorKey: "tiktok_business" },
];

/* ─── AI 전략 Create 헬퍼 ───────────────────────────────────────────────────────── */
function generateStrategy(budget, categoryIds, adChannelIds, PRODUCT_CATEGORIES_ARG, AD_CHANNELS_ARG) {
    if (!budget || !categoryIds.length || !adChannelIds.length) return null;
    const selected = AD_CHANNELS_ARG.filter(c => adChannelIds.includes(c.id));
    const eligible = selected.filter(c => budget >= c.minBudget);
    if (!eligible.length) return null;

    // Category 기반 가in progress치 산정
    const catLabels = PRODUCT_CATEGORIES_ARG.filter(c => categoryIds.includes(c.id)).map(c => c.label);
    const weights = eligible.map(ch => {
        let w = 1;
        catLabels.forEach(cat => { if ((ch.strength || []).some(s => cat.includes(s))) w += 1.5; });
        return { ch, w };
    });
    const totalW = weights.reduce((s, x) => s + x.w, 0) || 1;

    const allocations = weights.map(({ ch, w }) => {
        const alloc = Math.round((w / totalW) * budget / 10000) * 10000;
        const impressions = Math.round(alloc / ch.cpm * 1000);
        const clicks = Math.round(impressions * 0.035);
        const conversions = Math.round(clicks * 0.05);
        const roas = (conversions * 45000 / (alloc || 1)).toFixed(1);
        return { ch, alloc, impressions, clicks, conversions, roas };
    });

    const totalAlloc = allocations.reduce((s, a) => s + a.alloc, 0);
    if (totalAlloc < budget && allocations.length > 0) allocations[0].alloc += budget - totalAlloc;

    return {
        budget,
        allocations,
        totalImpressions: allocations.reduce((s, a) => s + a.impressions, 0),
        totalClicks: allocations.reduce((s, a) => s + a.clicks, 0),
        totalConversions: allocations.reduce((s, a) => s + a.conversions, 0),
        estimatedRoas: (allocations.reduce((s, a) => s + parseFloat(a.roas) * a.alloc, 0) / budget).toFixed(1),
    };
}

/* ─── Component ────────────────────────────────────────────────────────────────── */
let _idSeed = 1;
function mkId() { return `AM-${String(_idSeed++).padStart(4, "0")}-${Date.now().toString(36).slice(-4).toUpperCase()}`; }

/* ─── Cross-Tab Real-time Sync Channel Name ── */
const SYNC_CHANNEL = 'geniego-roi-global-sync';

export default function AutoMarketing() {

    const navigate = useNavigate();
    const { t } = useI18n();
    const { addCampaign, addAlert, isDemo } = useGlobalData();
    const { fmt } = useCurrency();
    const { isConnected, connectedChannels } = useConnectorSync();

    // 🔒 SecurityGuard — enterprise security monitoring (XSS·CSRF·Clickjack·Brute-force)
    const _secAlert = useCallback((a) => { if (typeof addAlert === 'function') addAlert({ ...a, _src: 'AutoMarketing' }); }, [addAlert]);
    useSecurityGuard({ addAlert: _secAlert, enabled: true });

    /* ── 🔄 Cross-Tab Real-time Sync: BroadcastChannel listener ── */
    /* 다른 탭/메뉴에서 캠페인·커넥터·예산 변경 시 즉시 반영 (새로고침 불필요) */
    const bcRef = useRef(null);
    useEffect(() => {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                bcRef.current = new BroadcastChannel(SYNC_CHANNEL);
                bcRef.current.onmessage = (e) => {
                    const { type } = e?.data || {};
                    // 캠페인 업데이트 → draft 초기화하여 최신 상태 반영
                    if (type === 'CAMPAIGNS_UPDATE') { setDraft(null); }
                    // 커넥터 상태 변경 → connectedChannels가 context에서 자동 반영
                };
            }
        } catch { /* BroadcastChannel not supported */ }
        return () => { try { bcRef.current?.close(); } catch {} };
    }, []);

    /* ── Scroll isolation: suppress App.jsx parent scroll ──────────────── */
    /* Sub-tabs stay fixed; only content area below scrolls independently */
    useEffect(() => {
        const appContent = document.querySelector('.app-content-area');
        const parent = appContent?.parentElement;
        if (parent) {
            const prevOF = parent.style.overflowY;
            parent.style.overflowY = 'hidden';
            return () => { parent.style.overflowY = prevOF; };
        }
    }, []);

    const [tab, setTab] = useState("setup");
    const [showResult, setShowResult] = useState(null); // detail modal
    const [approvalModal, setApprovalModal] = useState(null); // Campaign 제출 Approval Modal

    // Setup form state
    const [budget, setBudget] = useState(1000000);
    const [customBudget, setCustomBudget] = useState("");
    const [selCats, setSelCats] = useState([]);
    const [selAds, setSelAds] = useState(["meta", "tiktok", "naver"]);
    const [aiRecommended, setAiRecommended] = useState(false); // AI Recommend Channel 사용 in progress 표시
    const [campaignName, setCampaignName] = useState("");
    const [period, setPeriod] = useState("monthly");
    const [targetAudience, setTargetAudience] = useState("");
    const [generating, setGenerating] = useState(false);
    const [draft, setDraft] = useState(null);

    // 번역된 Constant들 (Language Change 시 Auto 갱신)
    const PRODUCT_CATEGORIES = useMemo(() => PRODUCT_CATEGORIES_BASE.map(c => ({
        ...c,
        label: t(`marketing.cat_${c.id}`),
        tags: c.tagKeys.map(k => t(`marketing.${k}`)),
    })), [t]);

    const AD_CHANNELS = useMemo(() => AD_CHANNELS_BASE.map(c => ({
        ...c,
        label: t(`marketing.ch_${c.id}`),
        strength: [],
        apiConnected: isConnected(c.connectorKey),
    })), [t, connectedChannels]);

    const SALES_CHANNELS = useMemo(() => SALES_CHANNELS_BASE.map(c => {
        const connected = isConnected(c.connectorKey);
        return {
            ...c,
            label: t(`marketing.sc_${c.id}`),
            // API Key가 있으면 자동으로 active, 없으면 기본값 유지
            active: connected || c.active,
            apiConnected: connected,
        };
    }), [t, connectedChannels]);

    const STATUS_CONFIG = useMemo(() => ({
        pending: { label: t("marketing.statusPending"), color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "⏳" },
        approved: { label: t("marketing.statusApproved"), color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: "✅" },
        active: { label: t("marketing.statusActive"), color: "#4f8ef7", bg: "rgba(79,142,247,0.12)", icon: "🟢" },
        paused: { label: t("marketing.statusPaused"), color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: "⏸" },
        rejected: { label: t("marketing.statusRejected"), color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "❌" },
    }), [t]);

    const activeSalesChannels = SALES_CHANNELS.filter(c => c.active);

    const effectiveBudget = customBudget ? parseInt(customBudget.replace(/,/g, '')) || 0 : budget;

    const strategy = useMemo(() => draft, [draft]);

    const handleAllocChange = (chId, newAmount) => {
        setDraft(prev => {
            if (!prev) return prev;
            const allocations = prev.allocations.map(a => {
                if (a.ch.id === chId) {
                    const alloc = newAmount;
                    const impressions = Math.round(alloc / a.ch.cpm * 1000);
                    const clicks = Math.round(impressions * 0.035);
                    const conversions = Math.round(clicks * 0.05);
                    const roas = (conversions * 45000 / (alloc || 1)).toFixed(1);
                    return { ...a, alloc, impressions, clicks, conversions, roas };
                }
                return a;
            });
            const newBudget = allocations.reduce((s, a) => s + a.alloc, 0);
            return {
                ...prev,
                budget: newBudget,
                allocations,
                totalImpressions: allocations.reduce((s, a) => s + a.impressions, 0),
                totalClicks: allocations.reduce((s, a) => s + a.clicks, 0),
                totalConversions: allocations.reduce((s, a) => s + a.conversions, 0),
                estimatedRoas: (allocations.reduce((s, a) => s + parseFloat(a.roas) * a.alloc, 0) / (newBudget || 1)).toFixed(1),
            };
        });
    };

    // ─────────────────────────────────────────────────────────────────────
    // 핵심 Recommend 엔진: 복Count Category + Budget 교차 Recommend
    // Priority: ① Category Recommend 포함 + Budget OK → ② Budget만 OK
    // ─────────────────────────────────────────────────────────────────────
    const computeRecommend = useCallback((cats, bgt) => {
        const budgetRec = getBudgetRecommend(bgt, t);
        const budgetAllowed = budgetRec ? new Set(budgetRec.channels) : new Set(AD_CHANNELS_BASE.map(c => c.id));

        // Categoryper 유니온 (Order: 더 많은 Category에서 Recommend된 Channel 우선)
        const scoreMap = {};
        cats.forEach(cid => {
            const catRec = CATEGORY_AD_RECOMMEND[cid] || [];
            catRec.forEach((ch, idx) => {
                // 앞 Rank일Count록 높은 점Count
                scoreMap[ch] = (scoreMap[ch] || 0) + (catRec.length - idx);
            });
        });

        // Budget Allow Channel로 Filter 후 점Count 순 Sort
        const affordable = AD_CHANNELS_BASE
            .filter(c => bgt >= c.minBudget)
            .map(c => c.id);

        // Category Recommend + Budget OK → 교집합 우선
        const crossRec = Object.entries(scoreMap)
            .filter(([ch]) => budgetAllowed.has(ch) && affordable.includes(ch))
            .sort((a, b) => b[1] - a[1])
            .map(([ch]) => ch);

        // 교집합이 너무 적으면 Budget 기반에서 보충
        const result = [...crossRec];
        if (result.length < 2 && budgetRec) {
            budgetRec.channels
                .filter(ch => affordable.includes(ch) && !result.includes(ch))
                .forEach(ch => result.push(ch));
        }
        // Min 1개는 Budget 범위 내 Channel 보장
        if (result.length === 0 && affordable.length > 0) {
            result.push(affordable[0]);
        }

        return {
            channels: result.length > 0 ? result : (budgetRec?.channels || ["google"]),
            budgetTier: budgetRec?.tier || "",
            reason: buildReason(cats, budgetRec, t),
        };
    }, [t]);

    const buildReason = (cats, budgetRec, t) => {
        const catNames = cats.slice(0, 3).map(id => {
            const found = PRODUCT_CATEGORIES_BASE.find(c => c.id === id);
            return found?.icon || "";
        }).join(" ");
        const budgetStr = budgetRec ? `${budgetRec.tier}` : "";
        return t('marketing.aiReasonDetail', { cats: catNames, budget: budgetStr });
    };

    // 마지막 AI Recommend Info (배지 표시용)
    const [lastRecommend, setLastRecommend] = React.useState(null);

    // Category Toggle → 즉시 Recommend 갱신
    const toggleCat = (id) => {
        setSelCats(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            if (next.length > 0 && aiRecommended !== false) {
                // AI Recommend 모드에서는 Category Change마다 Auto 재Recommend
                const rec = computeRecommend(next, effectiveBudget);
                setSelAds(rec.channels);
                setLastRecommend(rec);
                setAiRecommended(true);
            } else if (next.length === 0) {
                setAiRecommended(false);
                setLastRecommend(null);
            } else if (next.length === 1 && prev.length === 0) {
                // 첫 Category Select시 AI Recommend Auto Start
                const rec = computeRecommend(next, effectiveBudget);
                setSelAds(rec.channels);
                setLastRecommend(rec);
                setAiRecommended(true);
            }
            return next;
        });
    };

    // User Count동 Channel Change
    const toggleAd = (id) => {
        setAiRecommended(false);
        setLastRecommend(null);
        setSelAds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    };

    // Budget Change → AI Recommend 갱신 (Category가 Select된 경우)
    const handleBudgetChange = useCallback((newBudget) => {
        if (selCats.length > 0 && aiRecommended !== false) {
            const rec = computeRecommend(selCats, newBudget);
            setSelAds(rec.channels);
            setLastRecommend(rec);
            setAiRecommended(true);
        } else if (selCats.length === 0) {
            // Category 미Select 시 Budget만으로 Recommend
            const rec = getBudgetRecommend(newBudget, t);
            if (rec) {
                setSelAds(rec.channels);
                setLastRecommend({ ...rec, channels: rec.channels, reason: rec.reason });
                setAiRecommended(true);
            }
        }
    }, [selCats, aiRecommended, computeRecommend]);

    const handleGenerate = useCallback(async () => {
        if (!selCats.length || !selAds.length) { alert(t('marketing.alertSelectCatCh')); return; }
        setGenerating(true);
        try {
            await new Promise(r => setTimeout(r, 1500));
            const s = generateStrategy(effectiveBudget, selCats, selAds, PRODUCT_CATEGORIES, AD_CHANNELS);
            setDraft(s);
            setTab('preview');
        } catch(e) {
            console.error(e);
            alert(t('marketing.alertSimulateError'));
        } finally {
            setGenerating(false);
        }
    }, [selCats, selAds, effectiveBudget, PRODUCT_CATEGORIES, AD_CHANNELS, t]);


    /* ─── Campaign 제출 전 Management자 Approval Modal 표시 ─── */
    const handleSubmitApproval = () => {
        if (!strategy) return;
        const name = campaignName || `${PRODUCT_CATEGORIES.find(c => selCats[0] === c.id)?.label || 'Unified'} ${t('marketing.defaultCampSuffix')}`;
        const selectedChs = selAds.map(id => AD_CHANNELS.find(c => c.id === id)).filter(Boolean);

        setApprovalModal({
            title: t('marketing.approvalTitle'),
            subtitle: t('marketing.approvalSubtitle'),
            items: [
                { label: t('marketing.campaignNameLabel'), value: name, color: '#4f8ef7' },
                { label: t('marketing.budget'),     value: fmt(strategy.budget), color: '#a855f7' },
                { label: t('marketing.estRoas'), value: strategy.estimatedRoas + 'x', color: '#22c55e' },
                { label: t('marketing.channelSelect'), value: selectedChs.map(c => c.label).join(', '), color: '#f97316' },
            ],
            warnings: [
                t('marketing.approvalWarning1'),
                t('marketing.approvalWarning2'),
            ],
            requireNote: false,
            confirmText: Object.is(t('marketing.submitApprovalBtn'), 'marketing.submitApprovalBtn') ? '✅ 승인 및 제출' : t('marketing.submitApprovalBtn'),
            confirmColor: '#22c55e',
            onConfirm: () => {
                const newStatus = 'pending';
                const camp = {
                    id: mkId(), name, period, targetAudience, budget: strategy.budget,
                    categories: selCats.map(id => PRODUCT_CATEGORIES.find(c => c.id === id)),
                    adChannels: selAds.map(id => AD_CHANNELS.find(c => c.id === id)),
                    salesChannels: activeSalesChannels,
                    allocations: strategy.allocations,
                    estimatedRoas: strategy.estimatedRoas,
                    totalImpressions: strategy.totalImpressions,
                    totalClicks: strategy.totalClicks,
                    totalConversions: strategy.totalConversions,
                    status: newStatus, createdAt: new Date().toLocaleString('ko-KR'),
                    approvedAt: null,
                    approvedBy: null,
                };
                addCampaign(camp);
                addAlert({ type: 'info', msg: `${t('marketing.alertNewApproval')} ${name}`, channel: selAds[0] });
                setDraft(null);
                setCampaignName('');
                setApprovalModal(null);
                navigate('/campaign-manager');
            },
        });
    };


    const cardStyle = { background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 24, backdropFilter: "blur(16px)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" };
    const inp = { width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, color: "#1e293b", padding: "10px 14px", fontSize: 13, boxSizing: "border-box", transition: "border-color 200ms" };
    const lbl = (lb) => <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>{lb}</div>;

    const TABS = useMemo(() => [
        { id: "creative", label: t("marketing.autoTab1", "① 캠페인 설정"), icon: "🎨" },
        { id: "setup", label: t("marketing.autoTab2", "② 캠페인 설정"), icon: "⚙" },
        { id: "preview", label: t("marketing.autoTab3", "③ AI 전략 미리보기"), icon: "🤖" },
        { id: "guide", label: t("marketing.autoTab4", "📖 이용 가이드"), icon: "📖" },
    ], [t]);

    // Select된 AdChannel을 MarketingAIPanel 형식으로 변환
    const aiChannels = useMemo(() => {
        const result = {};
        if (selAds.length > 0) {
            selAds.forEach(adId => {
                const ch = AD_CHANNELS.find(c => c.id === adId);
                if (ch) {
                    const alloc = Math.round(effectiveBudget * 0.65 / selAds.length);
                    result[adId] = {
                        name: ch.label.split('(')[0].trim(),
                        spend: alloc,
                        impressions: Math.round(alloc / ch.cpm * 1000),
                        clicks: Math.round(alloc / ch.cpm * 1000 * 0.025),
                        ctr: 2.5, convRate: 3.2,
                        cpc: ch.cpm / 100,
                        conversions: Math.round(alloc / ch.cpm * 1000 * 0.025 * 0.032),
                        revenue: Math.round(alloc * 3.2),
                        roas: 0,
                    };
                }
            });
        }
        if (Object.keys(result).length === 0) {
            return {};
        }
        return result;
    }, [selAds, effectiveBudget]);


    return (
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1200, margin: '0 auto', width: '100%', height: 'calc(100vh - 54px)', /* topbar ~54px — viewport-level scroll constraint */
            overflow: 'hidden', /* prevent this wrapper itself from scrolling */
            color: 'var(--text-1, #1e293b)', background: 'transparent' }}>
            {/* 🔐 Campaign Approval Modal */}
            {approvalModal && (
                <ApprovalModal
                    {...approvalModal}
                    onCancel={() => setApprovalModal(null)}
                />
            )}

            {/* ══════ FIXED HEADER AREA (Hero + Sub-tabs) ══════ */}
            <div style={{ flexShrink: 0 }}>
                {/* ── Hero Header ── */}
                <div className="hero" style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border, rgba(99,140,255,0.1))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 300px' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #a855f7, #4f8ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 14px rgba(168,85,247,0.3)', flexShrink: 0 }}>🚀</div>
                            <div style={{ minWidth: 0 }}>
                                <div className="hero-title" style={{ fontSize: 19, fontWeight: 900, color: '#a855f7', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
                                    {t("marketing.autoTitle")}
                                </div>
                                <div className="hero-desc" style={{ fontSize: 11, color: 'var(--text-3, #64748b)', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t("marketing.autoSub")}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <button
                                onClick={() => navigate('/campaign-manager')}
                                style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.25)', cursor: 'pointer', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: 11, fontWeight: 700 }}
                            >{t("marketing.goCampaignMgr")}</button>
                            <button
                                onClick={() => navigate('/help')}
                                style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: 11, fontWeight: 600 }}
                            >{t("marketing.goHelp")}</button>
                        </div>
                    </div>
                </div>

                {/* ── Sub-Tab Navigation (fixed, always visible) ── */}
                <div className="sub-tab-nav" style={{ padding: '8px 14px', background: 'var(--bg, rgba(245,247,250,0.97))', borderBottom: '1px solid var(--border, rgba(99,140,255,0.1))', backdropFilter: 'blur(12px)' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'var(--surface, rgba(241,245,249,0.7))', border: '1px solid var(--border, rgba(99,140,255,0.1))', borderRadius: 12, padding: '6px 8px' }}>
                        {TABS.map(tb => {
                            const isActive = tab === tb.id;
                            const TAB_CLR = { creative: '#06b6d4', setup: '#a855f7', preview: '#4f8ef7', guide: '#6366f1' };
                            const clr = TAB_CLR[tb.id] || '#6366f1';
                            return (
                                <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                                    fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                                    background: isActive ? clr : 'transparent',
                                    color: isActive ? '#ffffff' : 'var(--text-2, #64748b)',
                                    boxShadow: isActive ? `0 3px 14px ${clr}40` : 'none',
                                    transform: isActive ? 'translateY(-1px)' : 'none' }}>
                                    {tb.icon} {tb.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══════ SCROLLABLE CONTENT AREA ══════ */}
            <div className="fade-up" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 8px 28px', display: 'grid', gap: 18 }}>

            {/* ══ TAB: GUIDE ═══════════════════════════════════════════════════ */}
            {tab === "guide" && (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    <div style={{ ...cardStyle, background:'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor:'rgba(79,142,247,0.3)', textAlign:'center', padding:32 }}>
                        <div style={{ fontSize:44 }}>🤖</div>
                        <div style={{ fontWeight:900, fontSize:22, marginTop:8, color:'#1e293b' }}>{t('marketing.guideTitle')}</div>
                        <div style={{ fontSize:13, color:'#64748b', marginTop:6, maxWidth:560, margin:'6px auto 0', lineHeight:1.7 }}>{t('marketing.guideSub')}</div>
                        <button onClick={() => setTab('setup')} style={{ marginTop:16, padding:'12px 28px', borderRadius:12, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#4f8ef7,#a855f7)', color: '#fff', fontWeight:800, fontSize:14 }}>{t('marketing.guideStartBtn')}</button>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:'#1e293b' }}>{t('marketing.guideStepsTitle')}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                            {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a855f7'},{n:'4️⃣',k:'guideStep4',c:'#f59e0b'},{n:'5️⃣',k:'guideStep5',c:'#f97316'},{n:'6️⃣',k:'guideStep6',c:'#06b6d4'}].map((s,i) => (
                                <div key={i} style={{ background:s.c+'0a', border:`1px solid ${s.c}25`, borderRadius:12, padding:16 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                                        <span style={{ fontSize:20 }}>{s.n}</span>
                                        <span style={{ fontWeight:700, fontSize:14, color:s.c }}>{t(`marketing.${s.k}Title`)}</span>
                                    </div>
                                    <div style={{ fontSize:12, color:'var(--text-3)', lineHeight:1.7 }}>{t(`marketing.${s.k}Desc`)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={cardStyle}>
                        <div style={{ fontWeight:800, fontSize:17, marginBottom:16, color:'#1e293b' }}>{t('marketing.guideTabsTitle')}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                            {[{icon:'🎨',k:'guideTabCreative',c:'#06b6d4'},{icon:'⚙',k:'guideTabSetup',c:'#a855f7'},{icon:'🤖',k:'guideTabPreview',c:'#4f8ef7'}].map((tb,i) => (
                                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 14px', background: 'var(--surface)', borderRadius:10, border:'1px solid rgba(99,140,255,0.08)' }}>
                                    <span style={{ fontSize:22, flexShrink:0 }}>{tb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:13, color:tb.c }}>{t(`marketing.${tb.k}Name`)}</div>
                                        <div style={{ fontSize:11, color:'#64748b', marginTop:3, lineHeight:1.6 }}>{t(`marketing.${tb.k}Desc`)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ ...cardStyle, background:'rgba(34,197,94,0.05)', borderColor:'rgba(34,197,94,0.3)' }}>
                        <div style={{ fontWeight:800, fontSize:17, marginBottom:12, color:'#1e293b' }}>💡 {t('marketing.guideTipsTitle')}</div>
                        <ul style={{ margin:0, padding:'0 0 0 18px', fontSize:13, color:'#64748b', lineHeight:2.2 }}>
                            <li>{t('marketing.guideTip1')}</li>
                            <li>{t('marketing.guideTip2')}</li>
                            <li>{t('marketing.guideTip3')}</li>
                            <li>{t('marketing.guideTip4')}</li>
                            <li>{t('marketing.guideTip5')}</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* ══ TAB: CREATIVE STUDIO ═════════════════════════════════════════════════ */}
            {tab === "creative" && (
                <>
                    {/* AIAd소재 → CampaignSettings Sync 안내 Banner */}
                    <div style={{ padding: "12px 18px", borderRadius: 12, marginBottom: 16, background: "linear-gradient(135deg,rgba(6,182,212,0.08),rgba(168,85,247,0.06))", border: "1px solid rgba(6,182,212,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#06b6d4", marginBottom: 3 }}>
                                🎨 {t('marketing.creativeAutoSync')}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
                                {t('marketing.creativeSyncDesc1')}<strong style={{ color: "#a855f7" }}>{t('marketing.creativeSyncBtn')}</strong>{t('marketing.creativeSyncDesc2')}
                                <strong style={{ color: "#4f8ef7" }}>{t('marketing.creativeSyncDesc3')}</strong>{t('marketing.creativeSyncDesc4')}
                            </div>
                        </div>
                        <button onClick={() => setTab("setup")} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#06b6d4,#a855f7)", color: '#fff', fontWeight: 800, fontSize: 11, whiteSpace: "nowrap" }}>⚙ {t('marketing.creativeGoSetup')}</button>
                    </div>
                    <CreativeStudioTab
                        sourcePage="auto-marketing"
                        onUseCampaign={(catId, chIds) => {
                            if (catId) setSelCats(prev => prev.includes(catId) ? prev : [...prev, catId]);
                            if (chIds) setSelAds(chIds);
                            setTab("setup");
                        }}
                    />
                </>
            )}

            {/* ══ TAB: SETUP ══════════════════════════════════════════════════════════ */}
            {tab === "setup" && (
                <div style={{ display: "grid", gap: 18 }}>
                    {/* AI Recommend 허브 안내 Banner */}
                    <div style={{ padding: "14px 18px", borderRadius: 12, background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(79,142,247,0.06))", border: "1px solid rgba(168,85,247,0.25)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7", marginBottom: 3 }}>
                                🤖 {t('marketing.aiHubTitle')}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
                                {t('marketing.aiHubDesc1')}<strong style={{ color: "#4f8ef7" }}>{t('marketing.aiHubDesc2')}</strong>{t('marketing.aiHubDesc3')}<br />
                                {t('marketing.aiHubDesc4')}
                            </div>
                        </div>
                        <button onClick={() => navigate('/campaign-manager')} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: "linear-gradient(135deg,#a855f7,#6366f1)", color: '#fff', fontWeight: 800, fontSize: 11 }}>🚀 {t('marketing.aiHubBtn')}</button>
                    </div>

                    {/* 월 Budget Settings */}
                    <div style={cardStyle}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#4f8ef7", marginBottom: 14 }}>{t("marketing.budgetSetup")}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                            {[300000, 500000, 1000000, 2000000, 3000000, 5000000, 10000000].map(v => (
                                <button key={v} onClick={() => { setBudget(v); setCustomBudget(""); handleBudgetChange(v); }} style={{ padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer", backgroundColor: effectiveBudget === v && !customBudget ? "#4f8ef7" : "rgba(79,142,247,0.08)", backgroundImage: effectiveBudget === v && !customBudget ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "none", color: effectiveBudget === v && !customBudget ? "#ffffff" : "#334155", border: effectiveBudget === v && !customBudget ? "2px solid #4f8ef7" : "1px solid rgba(99,140,255,0.2)", boxShadow: effectiveBudget === v && !customBudget ? "0 4px 14px rgba(79,142,247,0.35)" : "none" }}>
                                    {fmt(v)}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                {lbl(t("marketing.directInput"))}
                                <input style={inp} placeholder="1500000" value={customBudget}
                                    onChange={e => setCustomBudget(e.target.value.replace(/[^0-9]/g, ""))}
                                    onBlur={e => { const v = parseInt(e.target.value) || 0; if (v > 0) handleBudgetChange(v); }}
                                />
                            </div>
                            <div>
                                {lbl(t("marketing.campaignPeriod"))}
                                <select style={inp} value={period} onChange={e => setPeriod(e.target.value)}>
                                    <option value="monthly">{t("marketing.monthly")}</option>
                                    <option value="quarterly">{t("marketing.quarterly")}</option>
                                    <option value="halfyear">{t("marketing.halfyear")}</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.15)" }}>
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{t("marketing.setBudget")} </span>
                            <span style={{ fontWeight: 900, fontSize: 18, color: "#4f8ef7" }}>{fmt(effectiveBudget)}</span>
                            <span style={{ fontSize: 10, color: "var(--text-3)", marginLeft: 6 }}>{t("marketing.perMonth")}</span>
                        </div>
                    </div>

                    {/* Product Category */}
                    <div style={cardStyle}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#a855f7", marginBottom: 14 }}>{t("marketing.categorySelect")}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
                            {PRODUCT_CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => toggleCat(cat.id)} style={{
                                    padding: "12px 14px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                                    background: selCats.includes(cat.id) ? "rgba(168,85,247,0.12)" : "rgba(0,0,0,0.03)",
                                    border: `1px solid ${selCats.includes(cat.id) ? "rgba(168,85,247,0.5)" : "rgba(99,140,255,0.1)"}`,
                                    transition: "all 150ms" }}>
                                    <div style={{ fontSize: 20, marginBottom: 4 }}>{cat.icon}</div>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: selCats.includes(cat.id) ? "#a855f7" : "var(--text-1)" }}>{cat.label}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{cat.tags.slice(0, 2).join(" · ")}</div>
                                    {selCats.includes(cat.id) && <div style={{ fontSize: 10, color: "#a855f7", marginTop: 4, fontWeight: 700 }}>{t("marketing.selected")}</div>}
                                </button>
                            ))}
                        </div>
                    </div>


                    <div style={cardStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#22c55e" }}>{t("marketing.channelSelect")}</div>
                            {aiRecommended && (
                                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 99, background: "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(79,142,247,0.12))", border: "1px solid rgba(34,197,94,0.3)", fontSize: 10, fontWeight: 700, color: "#22c55e" }}>
                                    🤖 {t('marketing.aiRecommendBadge')}
                                </div>
                            )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10, marginBottom: 14 }}>
                            {AD_CHANNELS.map(ch => {
                                const budgetOk = effectiveBudget >= ch.minBudget;
                                const isRecommended = aiRecommended && (CATEGORY_AD_RECOMMEND[selCats[0]] || []).includes(ch.id);
                                const apiOk = ch.apiConnected;
                                return (
                                    <button key={ch.id} onClick={() => {
                                        if (!apiOk) {
                                            // API Key 미연동 → 연동허브로 이동하여 자동 발급 신청
                                            navigate(`/integration-hub?tab=keys&channel=${ch.connectorKey}&auto_request=1`);
                                            return;
                                        }
                                        if (budgetOk) toggleAd(ch.id); }} style={{ padding: "12px 14px", borderRadius: 10, cursor: (!apiOk || budgetOk) ? "pointer" : "not-allowed",
                                        textAlign: "left", opacity: budgetOk ? 1 : 0.45,
                                        background: selAds.includes(ch.id) ? `${ch.color}18` : "rgba(0,0,0,0.03)",
                                        border: `1px solid ${selAds.includes(ch.id) ? ch.color + "66" : !apiOk ? "rgba(245,158,11,0.35)" : "rgba(99,140,255,0.1)"}`,
                                        transition: "all 150ms",
                                        position: "relative" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                            <span style={{ fontSize: 18 }}>{ch.icon}</span>
                                            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                                                {/* API 연동 상태 뱃지 */}
                                                {apiOk ? (
                                                    <span style={{ fontSize: 8, color: "#22c55e", background: "rgba(34,197,94,0.12)", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>🔗 API {t('marketing.connStatusOk')}</span>
                                                ) : (
                                                    <span style={{ fontSize: 8, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}>🔑 {t('marketing.connStatusNeed')}</span>
                                                )}
                                                {isRecommended && <span style={{ fontSize: 8, color: "#22c55e", background: "rgba(34,197,94,0.12)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>AI</span>}
                                                {!budgetOk && apiOk && <span style={{ fontSize: 9, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: 4 }}>{t("marketing.minBudget")} {fmt(ch.minBudget)}</span>}
                                                {selAds.includes(ch.id) && <span style={{ fontSize: 10, color: ch.color, fontWeight: 700 }}>✓</span>}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: selAds.includes(ch.id) ? ch.color : "var(--text-1)" }}>{ch.label}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t('marketing.cpmApprox')}{fmt(ch.cpm)}{ch.strength.length ? ' · ' + ch.strength.join(", ") : ''}</div>
                                        {/* API 미연동 시 연동 안내 메시지 */}
                                        {!apiOk && (
                                            <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 6, background: "rgba(245,158,11,0.06)", border: "1px dashed rgba(245,158,11,0.25)", fontSize: 9, color: "#f59e0b", lineHeight: 1.5 }}>
                                                🔗 {t('marketing.connClickToSetup')}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══ AI Recommend 근거 상세 Description Panel ══ */}
                    {aiRecommended && selAds.length > 0 && (
                        <div style={{ borderRadius: 16, border: "1px solid rgba(99,140,255,0.2)", overflow: "hidden", background: "linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,245,255,0.98))" }}>
                            {/* Panel Header */}
                            <div style={{ padding: "14px 18px", background: "linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))", borderBottom: "1px solid rgba(99,140,255,0.15)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 20 }}>🤖</div>
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 13, color: "#4f8ef7" }}>
                                        {t("marketing.explainTitle")}
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                                        {lastRecommend?.reason || t("marketing.explainSub")}
                                    </div>
                                </div>
                                {lastRecommend?.budgetTier && (
                                    <div style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 99, background: "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(79,142,247,0.15))", border: "1px solid rgba(34,197,94,0.3)", fontSize: 11, fontWeight: 800, color: "#22c55e" }}>
                                        {lastRecommend.budgetTier}
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
                                {/* Category 인사이트 */}
                                {selCats.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", marginBottom: 8 }}>
                                            🏷 {t("marketing.explainCatInsight")}
                                        </div>
                                        <div style={{ display: "grid", gap: 6 }}>
                                            {selCats.map(cid => {
                                                const ex = CATEGORY_EXPLAIN[cid];
                                                const catBase = PRODUCT_CATEGORIES_BASE.find(c => c.id === cid);
                                                if (!ex) return null;
                                                return (
                                                    <div key={cid} style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", fontSize: 11, color: "var(--text-2)", lineHeight: 1.6 }}>
                                                        <span style={{ fontWeight: 700, color: "#a855f7", marginRight: 6 }}>
                                                            {catBase?.icon} {t(`marketing.cat_${cid}`)}
                                                        </span>
                                                        {t(`marketing.${ex.insightKey}`)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Channelper Recommend 근거 */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", marginBottom: 8 }}>
                                        📡 {t("marketing.explainChWhy")}
                                    </div>
                                    <div style={{ display: "grid", gap: 8 }}>
                                        {selAds.map(chId => {
                                            const ex = CHANNEL_EXPLAIN[chId];
                                            const chBase = AD_CHANNELS_BASE.find(c => c.id === chId);
                                            if (!ex || !chBase) return null;
                                            return (
                                                <div key={chId} style={{
                                                    borderRadius: 12, overflow: "hidden",
                                                    border: `1px solid ${ex.color}33`,
                                                    background: `${ex.color}08` }}>
                                                    {/* Channel Header */}
                                                    <div style={{
                                                        padding: "8px 14px",
                                                        background: `${ex.color}10`,
                                                        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                                                        borderBottom: `1px solid ${ex.color}22` }}>
                                                        <span style={{ fontSize: 16 }}>{ex.icon}</span>
                                                        <span style={{ fontWeight: 800, fontSize: 12, color: ex.color }}>
                                                            {t(`marketing.ch_${chId}`)}
                                                        </span>
                                                        <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
                                                            {ex.kpi.map(k => (
                                                                <span key={k} style={{
                                                                    fontSize: 9, fontWeight: 700, color: ex.color,
                                                                    background: `${ex.color}15`,
                                                                    padding: "2px 7px", borderRadius: 6 }}>{k}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* Recommend 이유 + 팁 */}
                                                    <div style={{ padding: "10px 14px", display: "grid", gap: 6 }}>
                                                        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
                                                            {t(`marketing.${ex.whyKey}`)}
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "6px 10px", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", fontSize: 10, color: "#f59e0b", lineHeight: 1.6 }}>
                                                            <span style={{ flexShrink: 0, marginTop: 1 }}>💡</span>
                                                            <span>{t(`marketing.${ex.tipKey}`)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 직접 Change 안내 */}
                                <div style={{ padding: "8px 14px", borderRadius: 10, fontSize: 10, background: "rgba(148,163,184,0.05)", border: "1px dashed rgba(148,163,184,0.2)", color: "var(--text-3)" }}>
                                    ℹ️ {t("marketing.explainEditNote")}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active 판매Channel */}
                    <div style={cardStyle}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#f97316", marginBottom: 10 }}>{t("marketing.salesChannels")}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>{t("marketing.salesChannelSub")}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {SALES_CHANNELS.map(ch => (
                                <div
                                    key={ch.id}
                                    onClick={() => {
                                        if (!ch.apiConnected) {
                                            navigate(`/integration-hub?tab=keys&channel=${ch.connectorKey}&auto_request=1`);
                                        }
}} style={{
                                        padding: "6px 14px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                                        background: ch.apiConnected ? "rgba(34,197,94,0.10)" : ch.active ? "rgba(245,158,11,0.08)" : "rgba(148,163,184,0.08)",
                                        border: `1px solid ${ch.apiConnected ? "rgba(34,197,94,0.3)" : ch.active ? "rgba(245,158,11,0.25)" : "rgba(148,163,184,0.2)"}`,
                                        color: ch.apiConnected ? "#22c55e" : ch.active ? "#f59e0b" : "var(--text-3)",
                                        cursor: ch.apiConnected ? "default" : "pointer",
                                        transition: "all 150ms" }}
                                >
                                    {ch.icon} {ch.label} {ch.apiConnected
                                        ? <span style={{ marginLeft: 4 }}>🔗 {t('marketing.connStatusOk')}</span>
                                        : ch.active
                                            ? <span style={{ marginLeft: 4 }}>🔑 {t('marketing.connStatusNeed')}</span>
                                            : t("marketing.inactive")
                                    }
                                </div>
                            ))}
                        </div>
                        {/* 미연동 채널 안내 */}
                        {SALES_CHANNELS.some(ch => !ch.apiConnected) && (
                            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.05)", border: "1px dashed rgba(245,158,11,0.2)", fontSize: 10, color: "#f59e0b", lineHeight: 1.6, display: "flex", alignItems: "center", gap: 8 }}>
                                <span>💡</span>
                                <span>{t('marketing.connSalesHint')}</span>
                                <button onClick={() => navigate('/integration-hub?tab=keys')} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", color: "#f59e0b", fontWeight: 700, fontSize: 10, cursor: "pointer", whiteSpace: "nowrap" }}>🔗 {t('marketing.goIntegrationHub')}</button>
                            </div>
                        )}
                    </div>

                    {/* Add Settings */}
                    <div style={cardStyle}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-2)", marginBottom: 14 }}>{t("marketing.campaignDetail2")}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                                {lbl(t("marketing.campaignNameLabel"))}
                                <input style={inp} placeholder={t("marketing.campaignNamePh")} value={campaignName} onChange={e => setCampaignName(e.target.value)} />
                            </div>
                            <div>
                                {lbl(t("marketing.targetLabel"))}
                                <input style={inp} placeholder={t("marketing.targetPh")} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* 전략 Create Button */}
                    <button onClick={handleGenerate} disabled={generating || !selCats.length || !selAds.length} style={{ padding: "16px 0", borderRadius: 12, border: "none", cursor: generating || !selCats.length || !selAds.length ? "not-allowed" : "pointer", background: generating || !selCats.length || !selAds.length ? "rgba(99,140,255,0.2)" : "linear-gradient(135deg,#4f8ef7,#a855f7,#f97316)", color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 0.5, opacity: !selCats.length || !selAds.length ? 0.5 : 1, boxShadow: generating ? "none" : "0 4px 20px rgba(79,142,247,0.3)", transition: "all 200ms" }}>
                        {generating ? t("marketing.generating") : t("marketing.generateBtn")}
                    </button>
                    {(!selCats.length || !selAds.length) && (
                        <div style={{ textAlign: "center", fontSize: 11, color: "#f59e0b" }}>
                            {t("marketing.needCatChannel")}
                        </div>
                    )}
                </div>
            )
            }

            {/* ══ TAB: PREVIEW ════════════════════════════════════════════════════════ */}
            {
                tab === "preview" && (
                    <div style={{ display: "grid", gap: 16 }}>
                        {!strategy ? (
                            <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                                <div style={{ color: "var(--text-3)", fontSize: 13 }}>{t("marketing.previewEmpty")}</div>
                                <button onClick={() => setTab("setup")} style={{ marginTop: 14, padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#a855f7)", border: "none", color: '#fff', fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                    {t("marketing.goSetup")}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* KPI Summary */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 12 }}>
                                    {[
                                        { label: t("marketing.kpiTotal"), value: fmt(strategy.budget), icon: "💰", color: "#4f8ef7" },
                                        { label: t("marketing.kpiImpressions"), value: strategy.totalImpressions.toLocaleString(), icon: "👁", color: "#a855f7" },
                                        { label: t("marketing.kpiClicks"), value: strategy.totalClicks.toLocaleString(), icon: "👆", color: "#22c55e" },
                                        { label: t("marketing.kpiConversions"), value: strategy.totalConversions, icon: "🛒", color: "#f97316" },
                                        { label: t("marketing.kpiRoas"), value: strategy.estimatedRoas + "x", icon: "📈", color: "#fbbf24" },
                                    ].map(({ label, value, icon, color }) => (
                                        <div key={label} style={{ ...cardStyle, textAlign: "center" }}>
                                            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                                            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{label}</div>
                                            <div style={{ fontWeight: 900, fontSize: 18, color }}>{value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Channelper 배분 */}
                                <div style={cardStyle}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 16 }}>{t("marketing.channelAlloc")}</div>
                                    {strategy.allocations.map(({ ch, alloc, impressions, clicks, conversions, roas }) => {
                                        const pct = ((alloc / strategy.budget) * 100).toFixed(1);
                                        return (
<div key={ch.id} style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(0,0,0,0.03)", border: `1px solid ${ch.color}33` }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 18 }}>{ch.icon}</span>
                                                        <span style={{ fontWeight: 700, fontSize: 12, color: ch.color }}>{ch.label}</span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 6, fontSize: 11, alignItems: "center" }}>
                                                        <input 
                                                            type="text" 
                                                            value={alloc === 0 ? '' : alloc.toLocaleString('ko-KR')}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                                                handleAllocChange(ch.id, val); }} style={{ width: 90, padding: "4px 8px", background: "#f1f5f9",
                                                                border: `1px solid ${ch.color}55`, borderRadius: 6, color: ch.color,
                                                                fontWeight: 800, textAlign: "right", fontSize: 11, outline: "none"
                                                            }}
                                                        />
                                                        <span style={{ color: "var(--text-3)" }}>({pct}%)</span>
                                                    </div>
                                                </div>
                                                {/* In Progress바 */}
                                                <div style={{ height: 5, background: 'var(--surface)', borderRadius: 4, marginBottom: 8 }}>
                                                    <div style={{ width: pct + "%", height: "100%", background: ch.color, borderRadius: 4, transition: "width 0.5s" }} />
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, fontSize: 10, color: "var(--text-3)" }}>
                                                    <span>{t("marketing.statImpressions")} <b style={{ color: "var(--text-2)" }}>{impressions.toLocaleString()}</b></span>
                                                    <span>{t("marketing.statClicks")} <b style={{ color: "var(--text-2)" }}>{clicks.toLocaleString()}</b></span>
                                                    <span>{t("marketing.statConversions")} <b style={{ color: "var(--text-2)" }}>{conversions}</b></span>
                                                    <span>ROAS <b style={{ color: "#22c55e" }}>{roas}x</b></span>
                                                </div>
                                            </div>
                                        
);
                                    })}
                                </div>

                                {/* Approval 요청 */}
                                <div style={{ ...cardStyle, borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.04)" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t("marketing.approvalTitle")}</div>
                                    <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
                                        {t("marketing.approvalSub")}
                                    </div>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <button onClick={handleSubmitApproval} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: '#fff', fontWeight: 900, fontSize: 13, boxShadow: "0 4px 14px rgba(34,197,94,0.3)" }}>
                                            {t("marketing.submitApproval")}
                                        </button>
                                        <button onClick={() => { setTab("setup"); setDraft(null); }} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontSize: 12, fontWeight: 700 }}>
                                            {t("marketing.resetBtn")}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )
            }


            {/* ══ Detail Modal ════════════════════════════════════════════════════════ */}
            {
                showResult && (
                    <>
                        <div onClick={() => setShowResult(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 400 }} />
                        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(94vw,680px)", maxHeight: "88vh", overflowY: "auto", background: "linear-gradient(180deg,rgba(255,255,255,0.98),#f0f5ff)", zIndex: 401, borderRadius: 18, border: "1px solid rgba(99,140,255,0.25)", padding: 28 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 16 }}>{showResult.name}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "monospace" }}>{showResult.id}</div>
                                </div>
                                <button onClick={() => setShowResult(null)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: t("marketing.budget"), value: fmt(showResult.budget), color: "#4f8ef7" },
                                    { label: t("marketing.period"), value: { monthly: t("marketing.period_monthly"), quarterly: t("marketing.period_quarterly"), halfyear: t("marketing.period_halfyear") }[showResult.period] || t("marketing.period_monthly"), color: "#a855f7" },
                                    { label: t("marketing.estRoas"), value: showResult.estimatedRoas + "x", color: "#22c55e" },
                                    { label: t("marketing.estConv"), value: showResult.totalConversions, color: "#f97316" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.03)" }}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{label}</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {showResult.allocations?.map(({ ch, alloc, impressions, clicks, conversions, roas }) => (
                                <div key={ch.id} style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.03)", border: `1px solid ${ch.color}33` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <span style={{ fontWeight: 700, fontSize: 11, color: ch.color }}>{ch.icon} {ch.label}</span>
                                        <span style={{ fontWeight: 800, color: ch.color }}>{fmt(alloc)}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, fontSize: 10, color: "var(--text-3)" }}>
                                        <span>{t("marketing.statImpressions")} {impressions?.toLocaleString()}</span>
                                        <span>{t("marketing.statClicks")} {clicks?.toLocaleString()}</span>
                                        <span>{t("marketing.statConversions")} {conversions}</span>
                                        <span style={{ color: "#22c55e" }}>ROAS {roas}x</span>
                                    </div>
                                </div>
                            ))}

                            {showResult.approvedAt && (
                                <div style={{ marginTop: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", fontSize: 11, color: "#22c55e" }}>
                                    ✅ {showResult.approvedBy} {t("marketing.approvedBy")} {showResult.approvedAt} {t("marketing.approvedAt")}
                                </div>
                            )}
                        </div>
                    </>
                )
            }
            {/* AI redirect Tab 제거됨 — CampaignManager에서 AI Analysis Unified */}
        </div>{/* end scrollable content */}
        </div>
                                        
);
}
