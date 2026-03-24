import React, { useState, useMemo, useCallback } from "react";
import CreativeStudio from "./CreativeStudio.jsx";
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';
import ApprovalModal from '../components/ApprovalModal.jsx';

/* ─── Constant ────────────────────────────────────────────────────────────────────── */
const KRW = (v) => v == null ? "—" : "₩" + Number(v).toLocaleString("ko-KR");
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
    { id: "meta",         icon: "📘", color: "#1877f2", cpm: 8000,  minBudget: 100000 },
    { id: "tiktok",       icon: "🎵", color: "#ff0050", cpm: 5000,  minBudget: 150000 },
    { id: "google",       icon: "🔍", color: "#4285f4", cpm: 10000, minBudget: 50000  },
    { id: "naver",        icon: "🟩", color: "#03c75a", cpm: 7000,  minBudget: 100000 },
    { id: "kakao",        icon: "💛", color: "#fee500", color2: "#3c1e1e", cpm: 6000, minBudget: 100000 },
    { id: "coupang_ads",  icon: "🛍", color: "#ef4444", cpm: 9000,  minBudget: 50000  },
    { id: "instagram",    icon: "📸", color: "#e1306c", cpm: 7500,  minBudget: 100000 },
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
function getBudgetRecommend(budget) {
    if (!budget || budget <= 0) return null;
    if (budget < 200000) {
        // 소액 Budget: minBudget 낮은 Channel만 (구글·Coupang 실속형)
        return { channels: ["google", "coupang_ads"], tier: "🪙 소액 실속", reason: "₩20만 미만 — Min Budget으로 Search·쇼핑 Ad 집in progress" };
    }
    if (budget < 500000) {
        // Basic Budget: 핵심 3Channel
        return { channels: ["google", "naver", "meta"], tier: "💚 Basic 성장", reason: "₩50만 미만 — Search·SNS 핵심 3Channel 균형 운용" };
    }
    if (budget < 1000000) {
        // in progress간 Budget: 5Channel 믹스
        return { channels: ["meta", "instagram", "google", "naver", "kakao"], tier: "🚀 성장 가속", reason: "₩100만 미만 — SNS+Search 5Channel 믹스 전략" };
    }
    if (budget < 3000000) {
        // 표준 Budget: 풀Channel (TikTok 포함)
        return { channels: ["meta", "instagram", "tiktok", "google", "naver"], tier: "⭐ 풀Channel 믹스", reason: "₩300만 미만 — TikTok 포함 동영상+Search+SNS 풀믹스" };
    }
    // 대Budget: 전Channel 운용
    return { channels: ["meta", "instagram", "tiktok", "google", "naver", "kakao", "coupang_ads"], tier: "🏆 전Channel 운용", reason: "₩300만+ — 모든 Channel 동시 운용, Channel간 시너지 극대화" };
}

const SALES_CHANNELS_BASE = [
    { id: "coupang", icon: "🛍", active: true },
    { id: "naver_smart", icon: "🟩", active: true },
    { id: "11st", icon: "🔴", active: false },
    { id: "gmarket", icon: "🟣", active: true },
    { id: "kakao_shop", icon: "💛", active: false },
    { id: "tiktok_shop", icon: "🎵", active: true },
];

/* ─── AI 전략 Create 헬퍼 ───────────────────────────────────────────────────────── */
function generateStrategy(budget, categoryIds, adChannelIds) {
    if (!budget || !categoryIds.length || !adChannelIds.length) return null;
    const selected = AD_CHANNELS.filter(c => adChannelIds.includes(c.id));
    const eligible = selected.filter(c => budget >= c.minBudget);
    if (!eligible.length) return null;

    // Category 기반 가in progress치 산정
    const catLabels = PRODUCT_CATEGORIES.filter(c => categoryIds.includes(c.id)).map(c => c.label);
    const weights = eligible.map(ch => {
        let w = 1;
        catLabels.forEach(cat => { if (ch.strength.some(s => cat.includes(s))) w += 1.5; });
        return { ch, w };
    });
    const totalW = weights.reduce((s, x) => s + x.w, 0);

    const allocations = weights.map(({ ch, w }) => {
        const alloc = Math.round((w / totalW) * budget / 10000) * 10000;
        const impressions = Math.round(alloc / ch.cpm * 1000);
        const clicks = Math.round(impressions * (0.02 + Math.random() * 0.03));
        const conversions = Math.round(clicks * (0.03 + Math.random() * 0.04));
        const roas = (conversions * 45000 / alloc).toFixed(1);
        return { ch, alloc, impressions, clicks, conversions, roas };
    });

    const totalAlloc = allocations.reduce((s, a) => s + a.alloc, 0);
    if (totalAlloc < budget) allocations[0].alloc += budget - totalAlloc;

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

export default function AutoMarketing() {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { addCampaign, addAlert } = useGlobalData();
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
    })), [t]);

    const SALES_CHANNELS = useMemo(() => SALES_CHANNELS_BASE.map(c => ({
        ...c,
        label: t(`marketing.sc_${c.id}`),
    })), [t]);

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

    // ─────────────────────────────────────────────────────────────────────
    // 핵심 Recommend 엔진: 복Count Category + Budget 교차 Recommend
    // Priority: ① Category Recommend 포함 + Budget OK → ② Budget만 OK
    // ─────────────────────────────────────────────────────────────────────
    const computeRecommend = useCallback((cats, bgt) => {
        const budgetRec = getBudgetRecommend(bgt);
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
            reason: buildReason(cats, budgetRec),
        };
    }, []);

    const buildReason = (cats, budgetRec) => {
        const catNames = cats.slice(0, 3).map(id => {
            const found = PRODUCT_CATEGORIES_BASE.find(c => c.id === id);
            return found?.icon || "";
        }).join(" ");
        const budgetStr = budgetRec ? `${budgetRec.tier}` : "";
        return `${catNames} Category + ${budgetStr} 기반 AI Recommend`;
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
            const rec = getBudgetRecommend(newBudget);
            if (rec) {
                setSelAds(rec.channels);
                setLastRecommend({ ...rec, channels: rec.channels, reason: rec.reason });
                setAiRecommended(true);
            }
        }
    }, [selCats, aiRecommended, computeRecommend]);

    const handleGenerate = useCallback(async () => {
        if (!selCats.length || !selAds.length) { alert('Category와 Ad Channel을 Select해주세요.'); return; }
        setGenerating(true);
        await new Promise(r => setTimeout(r, 1500));
        const s = generateStrategy(effectiveBudget, selCats, selAds);
        setDraft(s);
        setGenerating(false);
        setTab('preview');
    }, [selCats, selAds, effectiveBudget]);


    /* ─── Campaign 제출 전 Management자 Approval Modal 표시 ─── */
    const handleSubmitApproval = () => {
        if (!strategy) return;
        const name = campaignName || `${PRODUCT_CATEGORIES.find(c => selCats[0] === c.id)?.label || 'Unified'} Marketing Campaign`;
        const selectedChs = selAds.map(id => AD_CHANNELS.find(c => c.id === id)).filter(Boolean);

        setApprovalModal({
            title: t('marketing.approvalTitle') || 'Auto Marketing Campaign Approval 요청',
            subtitle: '📋 아래 Campaign 내용을 검토하고 Approval 후 제출해 주세요.',
            items: [
                { label: 'Campaign명', value: name, color: '#4f8ef7' },
                { label: 'Budget',     value: KRW(effectiveBudget), color: '#a855f7' },
                { label: '예상 ROAS', value: strategy.estimatedRoas + 'x', color: '#22c55e' },
                { label: 'Ad Channel', value: selectedChs.map(c => c.label).join(', '), color: '#f97316' },
            ],
            warnings: [
                'Approval 요청 후 Campaign Management Page에서 Activate됩니다.',
                'Budget 집행은 Management자 최종 Activate 시 Start됩니다.',
            ],
            requireNote: false,
            confirmText: t('marketing.submitApproval') || '✅ Approval 후 제출',
            confirmColor: '#22c55e',
            onConfirm: () => {
                const camp = {
                    id: mkId(), name, period, targetAudience, budget: effectiveBudget,
                    categories: selCats.map(id => PRODUCT_CATEGORIES.find(c => c.id === id)),
                    adChannels: selAds.map(id => AD_CHANNELS.find(c => c.id === id)),
                    salesChannels: activeSalesChannels,
                    allocations: strategy.allocations,
                    estimatedRoas: strategy.estimatedRoas,
                    totalImpressions: strategy.totalImpressions,
                    totalClicks: strategy.totalClicks,
                    totalConversions: strategy.totalConversions,
                    status: 'pending', createdAt: new Date().toLocaleString('ko-KR'),
                    approvedAt: null, approvedBy: null,
                };
                addCampaign(camp);
                addAlert({ type: 'info', msg: `새 Campaign Approval 요청: ${name}`, channel: selAds[0] });
                setDraft(null);
                setCampaignName('');
                setApprovalModal(null);
                navigate('/campaign-manager');
            },
        });
    };


    const cardStyle = { background: "var(--card)", border: "1px solid rgba(99,140,255,0.12)", borderRadius: 14, padding: 20 };
    const inp = { width: "100%", background: "rgba(15,20,40,0.7)", border: "1px solid rgba(99,140,255,0.2)", borderRadius: 8, color: "var(--text-1)", padding: "8px 12px", fontSize: 12, boxSizing: "border-box" };
    const lbl = (t) => <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginBottom: 5 }}>{t}</div>;

    const TABS = useMemo(() => [
        { id: "creative", label: t("marketing.tabCreative"), icon: "🎨" },
        { id: "setup", label: t("marketing.tabSetup"), icon: "⚙" },
        { id: "preview", label: t("marketing.tabPreview"), icon: "🤖" },
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
                        roas: 3.2,
                    };
                }
            });
        }
        if (Object.keys(result).length === 0) {
            return {
                meta: { name: 'Meta Ads', spend: 400000, impressions: 50000, clicks: 1250, ctr: 2.5, conversions: 40, revenue: 1280000, roas: 3.2, cpc: 320, convRate: 3.2 },
                tiktok: { name: 'TikTok', spend: 350000, impressions: 70000, clicks: 1750, ctr: 2.5, conversions: 35, revenue: 980000, roas: 2.8, cpc: 200, convRate: 2.0 },
                naver: { name: 'Naver', spend: 250000, impressions: 35714, clicks: 893, ctr: 2.5, conversions: 29, revenue: 725000, roas: 2.9, cpc: 280, convRate: 3.2 },
            };
        }
        return result;
    }, [selAds, effectiveBudget]);




    return (
        <div style={{ display: "grid", gap: 18, maxWidth: 1100 }}>
            {/* 🔐 Campaign Approval Modal */}
            {approvalModal && (
                <ApprovalModal
                    {...approvalModal}
                    onCancel={() => setApprovalModal(null)}
                />
            )}
            {/* Header */}
            <div style={{ ...cardStyle, background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.08))", borderColor: "rgba(79,142,247,0.2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: "var(--text-1)", marginBottom: 4 }}>
                            {t("marketing.autoTitle")}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                            {t("marketing.autoSub")}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <button
                            onClick={() => navigate('/campaign-manager')}
                            style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(79,142,247,0.3)", cursor: "pointer", background: "rgba(79,142,247,0.08)", color: "#4f8ef7", fontSize: 11, fontWeight: 700 }}
                        >{t("marketing.goCampaignMgr")}</button>
                        <button
                            onClick={() => navigate('/help')}
                            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.15)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontSize: 11, fontWeight: 600 }}
                        >{t("marketing.goHelp")}</button>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 6, borderBottom: "1px solid rgba(99,140,255,0.1)", paddingBottom: 10 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: tab === t.id ? "linear-gradient(135deg,#4f8ef7,#a855f7)" : "transparent",
                        color: tab === t.id ? "#fff" : "var(--text-3)",
                        border: tab === t.id ? "none" : "1px solid rgba(99,140,255,0.15)",
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ══ TAB: GUIDE ═══════════════════════════════════════════════════ */}
            {tab === "guide" && (
                <MarketingGuide onStart={() => setTab("setup")} />
            )}

            {/* ══ TAB: CREATIVE STUDIO ═════════════════════════════════════════════════ */}
            {tab === "creative" && (
                <>
                    {/* AIAd소재 → CampaignSettings Sync 안내 Banner */}
                    <div style={{
                        padding: "12px 18px", borderRadius: 12, marginBottom: 16,
                        background: "linear-gradient(135deg,rgba(6,182,212,0.08),rgba(168,85,247,0.06))",
                        border: "1px solid rgba(6,182,212,0.3)",
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
                    }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#06b6d4", marginBottom: 3 }}>
                                🎨 {t('marketing.creativeAutoSync')}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
                                {t('marketing.creativeSyncDesc1')}<strong style={{ color: "#a855f7" }}>"{t('marketing.creativeSyncBtn')}"</strong>{t('marketing.creativeSyncDesc2')}
                                <strong style={{ color: "#4f8ef7" }}>{t('marketing.creativeSyncDesc3')}</strong>{t('marketing.creativeSyncDesc4')}
                            </div>
                        </div>
                        <button onClick={() => setTab("setup")} style={{
                            padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                            background: "linear-gradient(135deg,#06b6d4,#a855f7)", color: "#fff", fontWeight: 800, fontSize: 11,
                            whiteSpace: "nowrap",
                        }}>⚙ {t('marketing.creativeGoSetup')}</button>
                    </div>
                    <CreativeStudio
                        selectedCategories={selCats}
                        onUseCampaign={(catId, chIds) => {
                            setSelCats(prev => prev.includes(catId) ? prev : [...prev, catId]);
                            setSelAds(chIds);
                            setTab("setup");
                        }}
                    />
                </>
            )}

            {/* ══ TAB: SETUP ══════════════════════════════════════════════════════════ */}
            {tab === "setup" && (
                <div style={{ display: "grid", gap: 18 }}>
                    {/* AI Recommend 허브 안내 Banner */}
                    <div style={{
                        padding: "14px 18px", borderRadius: 12,
                        background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(79,142,247,0.06))",
                        border: "1px solid rgba(168,85,247,0.25)",
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
                    }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#a855f7", marginBottom: 3 }}>
                                🤖 {t('marketing.aiHubTitle')}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
                                {t('marketing.aiHubDesc1')}<strong style={{ color: "#4f8ef7" }}>{t('marketing.aiHubDesc2')}</strong>{t('marketing.aiHubDesc3')}<br />
                                {t('marketing.aiHubDesc4')}
                            </div>
                        </div>
                        <button onClick={() => navigate('/campaign-manager')} style={{
                            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                            background: "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 11
                        }}>🚀 {t('marketing.aiHubBtn')}</button>
                    </div>

                    {/* 월 Budget Settings */}
                    <div style={cardStyle}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#4f8ef7", marginBottom: 14 }}>{t("marketing.budgetSetup")}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                            {[300000, 500000, 1000000, 2000000, 3000000, 5000000, 10000000].map(v => (
                                <button key={v} onClick={() => { setBudget(v); setCustomBudget(""); handleBudgetChange(v); }} style={{
                                    padding: "8px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                    background: effectiveBudget === v && !customBudget ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "rgba(79,142,247,0.08)",
                                    color: effectiveBudget === v && !customBudget ? "#fff" : "var(--text-2)",
                                    border: effectiveBudget === v && !customBudget ? "none" : "1px solid rgba(99,140,255,0.15)",
                                }}>
                                    {KRW(v)}
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
                            <span style={{ fontWeight: 900, fontSize: 18, color: "#4f8ef7" }}>{KRW(effectiveBudget)}</span>
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
                                    background: selCats.includes(cat.id) ? "rgba(168,85,247,0.12)" : "rgba(15,20,40,0.5)",
                                    border: `1px solid ${selCats.includes(cat.id) ? "rgba(168,85,247,0.5)" : "rgba(99,140,255,0.1)"}`,
                                    transition: "all 150ms",
                                }}>
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
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 5,
                                    padding: "3px 10px", borderRadius: 99,
                                    background: "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(79,142,247,0.12))",
                                    border: "1px solid rgba(34,197,94,0.3)", fontSize: 10, fontWeight: 700, color: "#22c55e",
                                }}>
                                    🤖 {t('marketing.aiRecommendBadge')}
                                </div>
                            )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 10, marginBottom: 14 }}>
                            {AD_CHANNELS.map(ch => {
                                const budgetOk = effectiveBudget >= ch.minBudget;
                                const isRecommended = aiRecommended && (CATEGORY_AD_RECOMMEND[selCats[0]] || []).includes(ch.id);
                                return (
                                    <button key={ch.id} onClick={() => budgetOk && toggleAd(ch.id)} style={{
                                        padding: "12px 14px", borderRadius: 10, cursor: budgetOk ? "pointer" : "not-allowed",
                                        textAlign: "left", opacity: budgetOk ? 1 : 0.45,
                                        background: selAds.includes(ch.id) ? `${ch.color}18` : "rgba(15,20,40,0.5)",
                                        border: `1px solid ${selAds.includes(ch.id) ? ch.color + "66" : "rgba(99,140,255,0.1)"}`,
                                        transition: "all 150ms",
                                        position: "relative",
                                    }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                            <span style={{ fontSize: 18 }}>{ch.icon}</span>
                                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                {isRecommended && <span style={{ fontSize: 8, color: "#22c55e", background: "rgba(34,197,94,0.12)", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>AI Recommend</span>}
                                                {!budgetOk && <span style={{ fontSize: 9, color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: 4 }}>{t("marketing.minBudget")} {KRW(ch.minBudget)}</span>}
                                                {selAds.includes(ch.id) && <span style={{ fontSize: 10, color: ch.color, fontWeight: 700 }}>✓</span>}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: selAds.includes(ch.id) ? ch.color : "var(--text-1)" }}>{ch.label}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t('demo.cpmApprox')}{KRW(ch.cpm)}{ch.strength.length ? ' · ' + ch.strength.join(", ") : ''}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ══ AI Recommend 근거 상세 Description Panel ══ */}
                    {aiRecommended && selAds.length > 0 && (
                        <div style={{
                            borderRadius: 16,
                            border: "1px solid rgba(99,140,255,0.2)",
                            overflow: "hidden",
                            background: "linear-gradient(135deg,rgba(15,20,40,0.95),rgba(20,25,50,0.98))",
                        }}>
                            {/* Panel Header */}
                            <div style={{
                                padding: "14px 18px",
                                background: "linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))",
                                borderBottom: "1px solid rgba(99,140,255,0.15)",
                                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                            }}>
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
                                    <div style={{
                                        marginLeft: "auto", padding: "4px 12px", borderRadius: 99,
                                        background: "linear-gradient(135deg,rgba(34,197,94,0.15),rgba(79,142,247,0.15))",
                                        border: "1px solid rgba(34,197,94,0.3)", fontSize: 11, fontWeight: 800, color: "#22c55e",
                                    }}>
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
                                                    <div key={cid} style={{
                                                        padding: "8px 12px", borderRadius: 10,
                                                        background: "rgba(168,85,247,0.06)",
                                                        border: "1px solid rgba(168,85,247,0.15)",
                                                        fontSize: 11, color: "var(--text-2)", lineHeight: 1.6,
                                                    }}>
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
                                                    background: `${ex.color}08`,
                                                }}>
                                                    {/* Channel Header */}
                                                    <div style={{
                                                        padding: "8px 14px",
                                                        background: `${ex.color}10`,
                                                        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                                                        borderBottom: `1px solid ${ex.color}22`,
                                                    }}>
                                                        <span style={{ fontSize: 16 }}>{ex.icon}</span>
                                                        <span style={{ fontWeight: 800, fontSize: 12, color: ex.color }}>
                                                            {t(`marketing.ch_${chId}`)}
                                                        </span>
                                                        <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
                                                            {ex.kpi.map(k => (
                                                                <span key={k} style={{
                                                                    fontSize: 9, fontWeight: 700, color: ex.color,
                                                                    background: `${ex.color}15`,
                                                                    padding: "2px 7px", borderRadius: 6,
                                                                }}>{k}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* Recommend 이유 + 팁 */}
                                                    <div style={{ padding: "10px 14px", display: "grid", gap: 6 }}>
                                                        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.7 }}>
                                                            {t(`marketing.${ex.whyKey}`)}
                                                        </div>
                                                        <div style={{
                                                            display: "flex", alignItems: "flex-start", gap: 6,
                                                            padding: "6px 10px", borderRadius: 8,
                                                            background: "rgba(245,158,11,0.06)",
                                                            border: "1px solid rgba(245,158,11,0.2)",
                                                            fontSize: 10, color: "#f59e0b", lineHeight: 1.6,
                                                        }}>
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
                                <div style={{
                                    padding: "8px 14px", borderRadius: 10, fontSize: 10,
                                    background: "rgba(148,163,184,0.05)",
                                    border: "1px dashed rgba(148,163,184,0.2)", color: "var(--text-3)",
                                }}>
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
                                <div key={ch.id} style={{
                                    padding: "6px 14px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                                    background: ch.active ? "rgba(34,197,94,0.10)" : "rgba(148,163,184,0.08)",
                                    border: `1px solid ${ch.active ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.2)"}`,
                                    color: ch.active ? "#22c55e" : "var(--text-3)",
                                }}>
                                    {ch.icon} {ch.label} {ch.active ? t("marketing.active") : t("marketing.inactive")}
                                </div>
                            ))}
                        </div>
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
                    <button onClick={handleGenerate} disabled={generating || !selCats.length || !selAds.length} style={{
                        padding: "16px 0", borderRadius: 12, border: "none", cursor: generating || !selCats.length || !selAds.length ? "not-allowed" : "pointer",
                        background: generating || !selCats.length || !selAds.length ? "rgba(99,140,255,0.2)" : "linear-gradient(135deg,#4f8ef7,#a855f7,#f97316)",
                        color: "#fff", fontWeight: 900, fontSize: 15, letterSpacing: 0.5,
                        opacity: !selCats.length || !selAds.length ? 0.5 : 1,
                        boxShadow: generating ? "none" : "0 4px 20px rgba(79,142,247,0.3)",
                        transition: "all 200ms",
                    }}>
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
                                <button onClick={() => setTab("setup")} style={{ marginTop: 14, padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#a855f7)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                    {t("marketing.goSetup")}
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* KPI Summary */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px,1fr))", gap: 12 }}>
                                    {[
                                        { label: t("marketing.kpiTotal"), value: KRW(strategy.budget), icon: "💰", color: "#4f8ef7" },
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
                                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)", marginBottom: 16 }}>{t("marketing.channelAlloc")}</div>
                                    {strategy.allocations.map(({ ch, alloc, impressions, clicks, conversions, roas }) => {
                                        const pct = ((alloc / strategy.budget) * 100).toFixed(1);
                                        return (
                                            <div key={ch.id} style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(15,20,40,0.5)", border: `1px solid ${ch.color}33` }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 18 }}>{ch.icon}</span>
                                                        <span style={{ fontWeight: 700, fontSize: 12, color: ch.color }}>{ch.label}</span>
                                                    </div>
                                                    <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                                                        <span style={{ color: ch.color, fontWeight: 800 }}>{KRW(alloc)}</span>
                                                        <span style={{ color: "var(--text-3)" }}>({pct}%)</span>
                                                    </div>
                                                </div>
                                                {/* In Progress바 */}
                                                <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 4, marginBottom: 8 }}>
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
                                        <button onClick={handleSubmitApproval} style={{
                                            flex: 1, padding: "12px 0", borderRadius: 10, border: "none", cursor: "pointer",
                                            background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 900, fontSize: 13,
                                            boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
                                        }}>
                                            {t("marketing.submitApproval")}
                                        </button>
                                        <button onClick={() => { setTab("setup"); setDraft(null); }} style={{
                                            padding: "12px 20px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", cursor: "pointer",
                                            background: "transparent", color: "var(--text-3)", fontSize: 12, fontWeight: 700,
                                        }}>
                                            {t("marketing.resetBtn")}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )
            }

            {/* ══ TAB: CAMPAIGNS → CampaignManagement로 Move Banner (in progress복 제거됨) ══ */}
            {
                false && (
                    <div style={{ display: "grid", gap: 14 }}>
                        {campaigns.length === 0 ? (
                            <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}>
                                <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
                                <div style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 16 }}>{t("marketing.noCampaign")}</div>
                                <button onClick={() => setTab("setup")} style={{ padding: "10px 24px", borderRadius: 9, background: "linear-gradient(135deg,#4f8ef7,#a855f7)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                    {t("marketing.createCampaign")}
                                </button>
                            </div>
                        ) : campaigns.map(camp => {
                            const st = STATUS_CONFIG[camp.status];
                            return (
                                <div key={camp.id} style={{ ...cardStyle, borderLeft: `3px solid ${st.color}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 900, fontSize: 14, color: "var(--text-1)", marginBottom: 3 }}>{camp.name}</div>
                                            <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "monospace" }}>{camp.id} · {t("marketing.createdAt")} {camp.createdAt}</div>
                                        </div>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.color}44` }}>
                                                {st.icon} {st.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 개요 */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
                                        {[
                                            { label: t("marketing.budget"), value: KRW(camp.budget), color: "#4f8ef7" },
                                            { label: t("marketing.kpiRoas"), value: camp.estimatedRoas + "x", color: "#22c55e" },
                                            { label: t("marketing.kpiImpressions"), value: camp.totalImpressions?.toLocaleString(), color: "#a855f7" },
                                            { label: t("marketing.kpiConversions"), value: camp.totalConversions, color: "#f97316" },
                                        ].map(({ label, value, color }) => (
                                            <div key={label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(15,20,40,0.5)" }}>
                                                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{label}</div>
                                                <div style={{ fontWeight: 800, fontSize: 13, color }}>{value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Channel Tag */}
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                                        {camp.categories?.map(cat => (
                                            <span key={cat.id} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>
                                                {cat.icon} {cat.label}
                                            </span>
                                        ))}
                                        {camp.adChannels?.map(ch => (
                                            <span key={ch.id} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: ch.color + "18", color: ch.color, border: `1px solid ${ch.color}44` }}>
                                                {ch.icon} {ch.label}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Action Button */}
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {camp.status === "pending" && (
                                            <>
                                                <button onClick={() => handleApprove(camp.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontWeight: 700, fontSize: 11 }}>{t("marketing.approved")}</button>
                                                <button onClick={() => handleReject(camp.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", background: "transparent", color: "#ef4444", fontWeight: 700, fontSize: 11 }}>{t("marketing.reject")}</button>
                                            </>
                                        )}
                                        {camp.status === "approved" && (
                                            <button onClick={() => handleActivate(camp.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 700, fontSize: 11 }}>{t("marketing.activate")}</button>
                                        )}
                                        {camp.status === "active" && (
                                            <button onClick={() => handlePause(camp.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontWeight: 700, fontSize: 11 }}>{t("marketing.pause")}</button>
                                        )}
                                        {camp.status === "paused" && (
                                            <button onClick={() => handleActivate(camp.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(79,142,247,0.2)", color: "#4f8ef7", fontWeight: 700, fontSize: 11 }}>{t("marketing.resume")}</button>
                                        )}
                                        <button onClick={() => setShowResult(camp)} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", cursor: "pointer", background: "transparent", color: "var(--text-3)", fontWeight: 700, fontSize: 11 }}>{t("marketing.viewDetail")}</button>
                                    </div>
                                </div>
                            );
                        })}
                        <button onClick={() => { setTab("setup"); setDraft(null); }} style={{
                            padding: "10px 0", borderRadius: 10, border: "1px dashed rgba(99,140,255,0.2)", cursor: "pointer",
                            background: "transparent", color: "var(--text-3)", fontSize: 12, fontWeight: 600,
                        }}>
                            {t("marketing.addCampaign")}
                        </button>
                    </div>
                )
            }

            {/* ══ Detail Modal ════════════════════════════════════════════════════════ */}
            {
                showResult && (
                    <>
                        <div onClick={() => setShowResult(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", zIndex: 400 }} />
                        <div style={{
                            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                            width: "min(94vw,680px)", maxHeight: "88vh", overflowY: "auto",
                            background: "linear-gradient(180deg,#0d1525,#090f1e)", zIndex: 401,
                            borderRadius: 18, border: "1px solid rgba(99,140,255,0.25)", padding: 28,
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontWeight: 900, fontSize: 16 }}>{showResult.name}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "monospace" }}>{showResult.id}</div>
                                </div>
                                <button onClick={() => setShowResult(null)} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 18, cursor: "pointer" }}>✕</button>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                                {[
                                    { label: t("marketing.budget"), value: KRW(showResult.budget), color: "#4f8ef7" },
                                    { label: t("marketing.period"), value: { monthly: t("marketing.period_monthly"), quarterly: t("marketing.period_quarterly"), halfyear: t("marketing.period_halfyear") }[showResult.period] || t("marketing.period_monthly"), color: "#a855f7" },
                                    { label: t("marketing.estRoas"), value: showResult.estimatedRoas + "x", color: "#22c55e" },
                                    { label: t("marketing.estConv"), value: showResult.totalConversions, color: "#f97316" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(15,20,40,0.7)" }}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{label}</div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {showResult.allocations?.map(({ ch, alloc, impressions, clicks, conversions, roas }) => (
                                <div key={ch.id} style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(15,20,40,0.5)", border: `1px solid ${ch.color}33` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <span style={{ fontWeight: 700, fontSize: 11, color: ch.color }}>{ch.icon} {ch.label}</span>
                                        <span style={{ fontWeight: 800, color: ch.color }}>{KRW(alloc)}</span>
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
        </div>
    );
}
