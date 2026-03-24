/**
 * AIPrediction.jsx — AI Forecast Analysis Hub v2
 * Actual API Integration: /api/customer-ai/* (Demo: 시뮬레이션, Paid: 실DB)
 * GlobalDataContext Integration: CRM 세그먼트 → Email/Kakao/웹Popup Auto Action
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useDemo from "../hooks/useDemo";
import { useGlobalData } from "../context/GlobalDataContext";
import DemoBanner from "../components/DemoBanner";
import PlanGate from "../components/PlanGate.jsx";
import { useI18n } from "../i18n/index.js";

const API = import.meta.env.VITE_API_BASE || "";
const C = {
    bg: "#070f1a", surface: "#0d1829", card: "#111e30",
    border: "rgba(99,102,241,0.15)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", orange: "#fb923c", muted: "rgba(255,255,255,0.42)", text: "#e8eaf0",
};

/* ─── API 호출 헬퍼 ─────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
    const token = localStorage.getItem("token") || "";
    const r = await fetch(`${API}${path}`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...opts,
    });
    return r.json();
}

/* ─── 로컬 시뮬레이션 폴백 ─────────────────────────────────── */
const DEMO_CUSTOMERS = (() => {
    const names = ["Ji-hyeon Kim", "Min Park", "Jin Lee", "Donghyeok Choi", "Aeryeon Jung", "Taeyoung Kang", "Chaewon Im", "Seungho Yoo", "Soyeon Bae", "Jihun Seo",
        "Yuki Tanaka", "田中花子", "Kenji Yamamoto", "Chen Wei", "Wang Fang"];
    return names.map((name, i) => {
        const churn = Math.floor(Math.random() * 90) + 5;
        const risk = churn >= 70 ? "high" : churn >= 40 ? "medium" : "low";
        const prob30 = Math.max(5, Math.min(97, 100 - churn + Math.floor(Math.random() * 20)));
        const days = Math.floor(Math.random() * 300) + 1;
        const purchases = Math.floor(Math.random() * 15);
        const ltv12 = purchases * Math.floor(Math.random() * 200000 + 50000);
        const grades = ["Champions", "Loyal", "General", "New", "Churn Risk", "Churned"];
        return {
            id: i + 1, email: `user${i + 1}@example.com`, name,
            grade: grades[Math.min(5, Math.floor(churn / 17))],
            churn_score: churn, risk_level: risk,
            purchase_prob_30d: prob30, purchase_prob_90d: Math.min(99, prob30 + 12),
            days_since_purchase: days, purchase_count: purchases, total_ltv: ltv12,
            ltv_3m: Math.round(ltv12 / 4), ltv_12m: ltv12, clv: ltv12 * 2,
            next_purchase_date: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10),
            recommended_action: { type: risk === "high" ? "winback_campaign" : "nurture_campaign", channel: risk === "high" ? "kakao+email" : "email", message: risk === "high" ? "Offer special return discount" : "Personalized Product Recommendation Email" },
        };
    }).sort((a, b) => b.churn_score - a.churn_score);
})();

const DEMO_SUMMARY = {
    total: DEMO_CUSTOMERS.length, mode: "demo",
    high_risk: DEMO_CUSTOMERS.filter(c => c.risk_level === "high").length,
    medium_risk: DEMO_CUSTOMERS.filter(c => c.risk_level === "medium").length,
    low_risk: DEMO_CUSTOMERS.filter(c => c.risk_level === "low").length,
    predicted_revenue_30d: 124000000,
};
const DEMO_LTV_SEGMENTS = [
    { tier: "diamond", label: "💎 Diamond", color: "#60a5fa", threshold: "₩1,000,000+", customer_count: 847, avg_ltv: 2840000, total_ltv: 2403480000, max_ltv: 8900000, action: "Provide exclusive VIP benefits" },
    { tier: "gold", label: "🥇 Gold", color: "#fbbf24", threshold: "₩500,000+", customer_count: 2341, avg_ltv: 720000, total_ltv: 1685520000, max_ltv: 990000, action: "Premium membership upgrade" },
    { tier: "silver", label: "🥈 Silver", color: "#94a3b8", threshold: "₩200,000+", customer_count: 4123, avg_ltv: 310000, total_ltv: 1278130000, max_ltv: 498000, action: "Gold upgrade incentive campaign" },
    { tier: "bronze", label: "🥉 Bronze", color: "#cd7c4b", threshold: "₩50,000+", customer_count: 3892, avg_ltv: 102000, total_ltv: 396984000, max_ltv: 198000, action: "Repurchase incentive email" },
    { tier: "new", label: "🌱 New", color: "#4ade80", threshold: "~₩50,000", customer_count: 1644, avg_ltv: 18000, total_ltv: 29592000, max_ltv: 49000, action: "Start onboarding journey series" },
];
const DEMO_MODEL_METRICS = {
    overall_score: 8.7, version: "v2.4.1",
    churn_prediction: { model: "RFM + Logistic Regression", accuracy: 87.3, auc_roc: 0.912, precision: 0.841, recall: 0.879, f1_score: 0.860, last_trained: new Date().toISOString().slice(0, 10), training_samples: 12847 },
    ltv_prediction: { model: "Gradient Boosting + Time Series", mape: 11.4, rmse: 42800, r2: 0.876, last_trained: new Date().toISOString().slice(0, 10), training_samples: 12847 },
    purchase_prob: { model: "Logistic Regression", accuracy: 82.1, auc_roc: 0.891, precision: 0.814, recall: 0.836, last_trained: new Date().toISOString().slice(0, 10), training_samples: 12847 },
    product_recommendation: { model: "Collaborative Filtering", hit_rate: 34.7, ndcg: 0.721, coverage: 78.3, last_trained: new Date().toISOString().slice(0, 10), training_samples: 88420 },
};

function GaugeBar({ value, max = 100, color, height = 6, label }) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {label && <div style={{ fontSize: 10, color: C.muted, width: 60, flexShrink: 0 }}>{label}</div>}
            <div style={{ flex: 1, height, background: "rgba(255,255,255,0.07)", borderRadius: height, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: height, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color, width: 34, textAlign: "right" }}>{value}{max !== 100 ? "" : "%"}</div>
        </div>
    );
}

/* ─── 도넛 Chart (구매확률) ───────────────────────────────── */
function DonutGauge({ value, color, size = 90, label }) {
    const r = 35, cx = 45, cy = 45;
    const circ = 2 * Math.PI * r;
    const fill = (value / 100) * circ;
    return (
        <div style={{ textAlign: "center" }}>
            <svg width={size} height={size} viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)" }}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
                    strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1.2s ease" }} />
            </svg>
            <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: -size * 0.6 }}>{value}%</div>
            {label && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{label}</div>}
        </div>
    );
}

/* ─── 모델 성능 Card ──────────────────────────────────────── */
function ModelMetricsCard({ metrics }) {
    if (!metrics) return null;
    const cards = [
        { title: "🎯 Churn Forecast", m: metrics.churn_prediction, keys: [["Accuracy", "accuracy", "%"], ["AUC-ROC", "auc_roc", ""], ["F1 Score", "f1_score", ""]] },
        { title: "💰 LTV Forecast", m: metrics.ltv_prediction, keys: [["MAPE", "mape", "%"], ["R²", "r2", ""], ["RMSE", "rmse", "₩"]] },
        { title: "🛒 Purchase Probability", m: metrics.purchase_prob, keys: [["Accuracy", "accuracy", "%"], ["AUC-ROC", "auc_roc", ""], ["Precision", "precision", ""]] },
        { title: "📦 Product Recommend", m: metrics.product_recommendation, keys: [["Hit Rate", "hit_rate", "%"], ["NDCG", "ndcg", ""], ["Coverage", "coverage", "%"]] },
    ];
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {cards.map(({ title, m, keys }) => m && (
                <div key={title} style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{title}</div>
                    {keys.map(([label, key, unit]) => (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
                                {unit === "₩" ? `₩${Number(m[key] || 0).toLocaleString()}` : `${m[key] || "-"}${unit}`}
                            </span>
                        </div>
                    ))}
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                        Trained: {m.last_trained} · {(m.training_samples || 0).toLocaleString()} records
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── Customer 상세 Panel ──────────────────────────────────────── */
function CustomerDetailPanel({ customer, onClose, onAction }) {
    const { t } = useI18n();
    const [tab, setTab] = useState("overview");
    const [prodRecs, setProdRecs] = useState([]);
    const { createEmailCampaignFromSegment, createKakaoCampaignFromSegment, addAlert } = useGlobalData();
    const navigate = useNavigate();

    useEffect(() => {
        if (customer && tab === "recommend") {
            apiFetch(`/api/customer-ai/product-recommendations?customer_id=${customer.id}&limit=5`)
                .then(d => { if (d.ok) setProdRecs(d.recommendations || []); })
                .catch(() => { });
        }
    }, [customer, tab]);

    if (!customer) return null;
    const c = customer;
    const churnColor = c.churn_score >= 70 ? C.red : c.churn_score >= 40 ? C.yellow : C.green;
    const probColor = c.purchase_prob_30d >= 70 ? C.green : c.purchase_prob_30d >= 40 ? C.yellow : C.red;

    const handleAutoAction = async (actionType, channel) => {
        try {
            const r = await apiFetch("/api/customer-ai/auto-action", {
                method: "POST",
                body: JSON.stringify({ action_type: actionType, channel, risk_level: c.risk_level, segment_name: c.name, estimated_reach: 1 }),
            });
            if (r.ok) {
                addAlert({ type: "success", msg: `✅ Action completed for ${c.name}: ${r.message}` });
                onAction && onAction();
            }
        } catch (e) { }
    };

    return (
        <div style={{ position: "fixed", right: 0, top: 0, height: "100vh", width: 420, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 300, boxShadow: "-8px 0 40px rgba(0,0,0,0.4)", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>Customer AI Analysis Detail</div>
                <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* Customer Basic */}
            <div style={{ background: C.card, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{c.email}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[c.grade].map(g => (
                        <span key={g} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: churnColor + "22", color: churnColor, fontWeight: 700 }}>{g}</span>
                    ))}
                </div>
            </div>

            {/* Forecast 게이지 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: C.card, borderRadius: 12, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>30-day Purchase Prob.</div>
                    <DonutGauge value={c.purchase_prob_30d ?? 0} color={probColor} size={80} />
                </div>
                <div style={{ background: C.card, borderRadius: 12, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Churn Risk Score</div>
                    <DonutGauge value={c.churn_score ?? 0} color={churnColor} size={80} />
                </div>
            </div>

            {/* LTV */}
            <div style={{ background: C.card, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: C.purple }}>💰 LTV Forecast</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[["3개월", c.ltv_3m], ["12개월", c.ltv_12m], ["CLV", c.clv]].map(([label, val]) => (
                        <div key={label} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: C.muted }}>{label}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: C.purple }}>₩{Math.round((val || 0) / 10000)}K</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[["overview", "Overview"], ["recommend", "Recommendations"], ["action", "Action"]].map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: tab === k ? C.accent : "rgba(255,255,255,0.06)", color: tab === k ? "#fff" : C.muted, cursor: "pointer", fontSize: 12, fontWeight: tab === k ? 700 : 400 }}>{l}</button>
                ))}
            </div>

            {tab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                        ["Purchases", `${c.purchase_count || 0} times`],
                        ["Last Purchase", `${c.days_since_purchase || 0} days ago`],
                        ["Cumulative LTV", `₩${(c.total_ltv || 0).toLocaleString()}`],
                        ["90-day Purchase Prob.", `${c.purchase_prob_90d || 0}%`],
                        [t('aiPredict.col.nextPurchase'), c.next_purchase_date || "-"],
                    ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: C.card, borderRadius: 8 }}>
                            <span style={{ fontSize: 12, color: C.muted }}>{k}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</span>
                        </div>
                    ))}
                    {/* RFM 바 */}
                    <div style={{ background: C.card, borderRadius: 8, padding: 12, marginTop: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: C.accent }}>RFM Score</div>
                        <GaugeBar label="Recency" value={Math.max(0, 100 - (c.churn_score || 0))} color={C.accent} />
                        <div style={{ marginTop: 6 }}>
                            <GaugeBar label="Frequency" value={Math.min(100, (c.purchase_count || 0) * 10)} color={C.purple} />
                        </div>
                        <div style={{ marginTop: 6 }}>
                            <GaugeBar label="Amount" value={Math.min(100, Math.round((c.total_ltv || 0) / 20000))} color={C.green} />
                        </div>
                    </div>
                </div>
            )}

            {tab === "recommend" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(prodRecs.length ? prodRecs : (c.recommended_products || [])).map((p, i) => (
                        <div key={i} style={{ background: C.card, borderRadius: 10, padding: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                                <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>{p.affinity_score}점</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{p.category} · ₩{(p.price || 0).toLocaleString()}</div>
                            <GaugeBar value={p.affinity_score || 0} color={C.accent} height={4} />
                            {p.reason && <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{p.reason}</div>}
                        </div>
                    ))}
                </div>
            )}

            {tab === "action" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>AI Recommend Auto Action</div>
                    {[
                        { label: "📧 Email Create Campaign", action: c.risk_level === "high" ? "winback_campaign" : "nurture_campaign", channel: "email", color: C.accent },
                        { label: "💬 Kakao Notification톡 Send", action: "winback_campaign", channel: "kakao", color: C.yellow },
                        { label: "🎯 Web Popup Integration", action: "web_popup", channel: "web_popup", color: C.green },
                        { label: "🗺️ Add to Journey", action: "nurture_campaign", channel: "journey", color: C.purple, nav: "/journey-builder" },
                    ].map(({ label, action, channel, color, nav }) => (
                        <button key={label} onClick={() => nav ? navigate(nav) : handleAutoAction(action, channel)} style={{ padding: "11px 16px", borderRadius: 10, border: `1px solid ${color}33`, background: `${color}0d`, color, cursor: "pointer", fontWeight: 700, fontSize: 13, textAlign: "left" }}>
                            {label}
                        </button>
                    ))}
                    {c.recommended_action && (
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: `${churnColor}0d`, border: `1px solid ${churnColor}30`, fontSize: 12, color: churnColor, marginTop: 4 }}>
                            🤖 AI Recommend: {c.recommended_action.message} ({c.recommended_action.channel})
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── 메인 Component ────────────────────────────────────────── */
function AIPredictionInner() {
    const { isDemo } = useDemo();
    const { crmSegments, createEmailCampaignFromSegment, createKakaoCampaignFromSegment, addAlert, alerts } = useGlobalData();
    const navigate = useNavigate();
    const { t } = useI18n();

    const [activeTab, setActiveTab] = useState("customers");
    const [customers, setCustomers] = useState([]);
    const [summary, setSummary] = useState({});
    const [modelMetrics, setModelMetrics] = useState(null);
    const [ltvSegments, setLtvSegments] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [filterRisk, setFilterRisk] = useState("all");
    const [mode, setMode] = useState("demo");

    const loadData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [churnRes, modelRes, ltvRes] = await Promise.all([
                apiFetch("/api/customer-ai/churn-scores").catch(() => null),
                apiFetch("/api/customer-ai/model-performance").catch(() => null),
                apiFetch("/api/customer-ai/ltv-segments").catch(() => null),
            ]);
            // Customer Data: API Success 우선, Failed 시 로컬 폴백
            if (churnRes?.ok && churnRes.customers?.length) {
                setCustomers(churnRes.customers);
                setSummary(churnRes.summary || DEMO_SUMMARY);
                setMode(churnRes.mode || "demo");
            } else {
                setCustomers(DEMO_CUSTOMERS);
                setSummary(DEMO_SUMMARY);
                setMode("demo");
            }
            // 모델 성능: API Success 우선, Failed 시 로컬 폴백
            setModelMetrics(modelRes?.ok ? modelRes.metrics : DEMO_MODEL_METRICS);
            // LTV 세그먼트: API Success 우선, Failed 시 로컬 폴백
            setLtvSegments(ltvRes?.ok && ltvRes.segments?.length ? ltvRes.segments : DEMO_LTV_SEGMENTS);
        } catch (e) {
            // 완전한 네트워크 Failed → 로컬 시뮬레이션 폴백
            setCustomers(DEMO_CUSTOMERS);
            setSummary(DEMO_SUMMARY);
            setModelMetrics(DEMO_MODEL_METRICS);
            setLtvSegments(DEMO_LTV_SEGMENTS);
            setMode("demo");
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => { loadData(); }, [loadData]);

    // Auto Action Run (CRM 세그먼트 → Email + Kakao 동시 Create)
    const handleBulkAction = async (riskLevel) => {
        const segId = riskLevel === "high" ? "seg_churn" : "seg_repurchase";
        createEmailCampaignFromSegment(segId, `AI Auto Churned${riskLevel === "high" ? "" : "위험"}Customer Campaign`);
        createKakaoCampaignFromSegment(segId, `AI Auto Kakao Campaign`);
        addAlert({ type: "success", msg: `🤖 AI: ${riskLevel === "high" ? "Churn Risk" : "Medium Risk"} Customer Auto Create Campaign (Email + Kakao)` });
    };

    // Filter링
    const filtered = customers.filter(c => {
        const matchSearch = !search || c.name?.includes(search) || c.email?.includes(search);
        const matchRisk = filterRisk === "all" || c.risk_level === filterRisk;
        return matchSearch && matchRisk;
    });

    const riskColor = { high: C.red, medium: C.yellow, low: C.green };
    const riskLabel = { high: t("aiPredict.filterHigh"), medium: t("aiPredict.filterMed"), low: t("aiPredict.filterLow") };

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text, position: "relative" }}>
            {isDemo && <DemoBanner feature="AI Forecast Analysis" />}

            {/* Header */}
            <div style={{ background: `linear-gradient(135deg,${C.surface},#0a1828)`, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 28px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>🔮 AI Forecast Analysis Hub</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                            {t('aiPredict.pageSub')}
                            <span style={{ marginLeft: 12, padding: "2px 8px", borderRadius: 6, fontSize: 10, background: mode === "live" ? `${C.green}22` : `${C.yellow}22`, color: mode === "live" ? C.green : C.yellow, fontWeight: 700 }}>
                                {mode === "live" ? t('aiPredict.liveDB') : mode === "demo" ? t('aiPredict.demoSim') : "⚡ Simulation"}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => navigate("/crm")} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer", fontSize: 12 }}>→ CRM Integration</button>
                        <button onClick={loadData} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>🔄 Refresh</button>
                    </div>
                </div>
            </div>

            {/* KPI Aggregate */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
                {[
                    { icon: "👥", label: t('aiPredict.kpi.target'), value: summary.total ? `${(summary.total || 0).toLocaleString()} customers` : "Loading", color: C.text },
                    { icon: "⚠️", label: t('aiPredict.kpi.churnRisk'), value: `${(summary.high_risk || 0).toLocaleString()} customers`, color: C.red, sub: t('aiPredict.kpi.churnAction') },
                    { icon: "💎", label: t('aiPredict.kpi.highLtv'), value: `${(ltvSegments[0]?.customer_count || 847).toLocaleString()} customers`, color: C.purple, sub: t('aiPredict.kpi.highLtvSub') },
                    { icon: "💰", label: t('aiPredict.kpi.revenue'), value: summary.predicted_revenue_30d ? `₩${Math.round(summary.predicted_revenue_30d / 1000000)}M` : "₩124M", color: C.green, sub: t('aiPredict.kpi.revenueSub') },
                    { icon: "⚙️", label: t('aiPredict.kpi.mlAccuracy'), value: modelMetrics ? `${modelMetrics.churn_prediction?.accuracy || 87.3}%` : "87.3%", color: C.accent, sub: t('aiPredict.kpi.mlSub') },
                ].map(({ icon, label, value, color, sub }) => (
                    <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
                        <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginTop: 2 }}>{label}</div>
                        {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
                    </div>
                ))}
            </div>

            {/* Tab */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[["customers", "👤 Customer Forecast"], ["ltv", t('aiPredict.tab.ltv')], ["graph_score", t('aiPredict.tab.graph')], ["model", t('aiPredict.tab.model')], ["integration", t('aiPredict.tab.integration')]].map(([k, l]) => (
                    <button key={k} onClick={() => setActiveTab(k)} style={{ padding: "9px 20px", borderRadius: 10, border: `2px solid ${activeTab === k ? C.accent : C.border}`, background: activeTab === k ? `${C.accent}15` : "transparent", color: activeTab === k ? C.accent : C.muted, cursor: "pointer", fontWeight: activeTab === k ? 700 : 400, fontSize: 13 }}>{l}</button>
                ))}
            </div>


            {/* Loading */}
            {loading && (
                <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
                    <div>{t('aiPredict.loading')}</div>
                </div>
            )}

            {/* 에러 */}
            {!loading && error && (
                <div style={{ padding: "16px 20px", background: `${C.red}0d`, border: `1px solid ${C.red}30`, borderRadius: 12, color: C.red, marginBottom: 16 }}>
                    ⚠️ {error}
                    <button onClick={loadData} style={{ marginLeft: 16, padding: "4px 12px", borderRadius: 6, border: "none", background: C.red, color: "#fff", cursor: "pointer", fontSize: 12 }}>{t('aiPredict.retry')}</button>
                </div>
            )}

            {/* Customer Forecast Tab */}
            {!loading && activeTab === "customers" && (
                <div>
                    {/* Search·Filter + Action */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name·Email Search..." style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13 }} />
                        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13 }}>
                            <option value="all">{t('aiPredict.filterAll')}</option>
                            <option value="high">🔴 Churn Risk</option>
                            <option value="medium">🟡 Medium Risk</option>
                            <option value="low">🟢 Safe</option>
                        </select>
                        <button onClick={() => handleBulkAction("high")} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: `${C.red}22`, color: C.red, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{t('aiPredict.bulkAction')}</button>
                        <button onClick={() => navigate("/journey-builder")} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: `${C.purple}22`, color: C.purple, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>🗺️ Journey Integration</button>
                    </div>

                    {/* Table */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 110px 120px 140px 120px 110px 80px", padding: "10px 18px", background: "rgba(255,255,255,0.03)", fontSize: 10, color: C.muted, fontWeight: 700 }}>
                            {["Customer", "Grade", t('aiPredict.col.prob30'), t('aiPredict.col.churn'), t('aiPredict.col.ltv12'), t('aiPredict.col.nextPurchase'), "AI Recommend Channel", ""].map(h => <div key={h}>{h}</div>)}
                        </div>
                        {filtered.map((c, i) => {
                            const pColor = c.purchase_prob_30d >= 70 ? C.green : c.purchase_prob_30d >= 40 ? C.yellow : C.red;
                            const cColor = riskColor[c.risk_level] || C.muted;
                            return (
                                <div key={c.id || i} style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 110px 120px 140px 120px 110px 80px", padding: "12px 18px", borderTop: `1px solid ${C.border}`, alignItems: "center", transition: "background 0.15s", cursor: "default" }}
                                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                                        <div style={{ fontSize: 10, color: C.muted }}>{c.email}</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: cColor + "22", color: cColor, fontWeight: 700 }}>{c.grade}</span>
                                    </div>
                                    <div>
                                        <GaugeBar value={c.purchase_prob_30d || 0} color={pColor} height={5} />
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: cColor }}>{c.churn_score}%</span>
                                        {c.risk_level === "high" && <span style={{ fontSize: 9, color: C.red }}>▲</span>}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>₩{Math.round((c.ltv_12m || 0) / 10000)}만</div>
                                    <div style={{ fontSize: 11, color: C.muted }}>{c.next_purchase_date}</div>
                                    <div style={{ fontSize: 10, color: C.accent }}>{c.recommended_action?.channel || "-"}</div>
                                    <button onClick={() => setSelectedCustomer(c)} style={{ padding: "5px 10px", borderRadius: 7, border: "none", background: "rgba(79,142,247,0.12)", color: C.accent, cursor: "pointer", fontSize: 11 }}>{t('aiPredict.col.detail')}</button>
                                </div>
                            );
                        })}
                        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.muted }}>{t('aiPredict.noResults')}</div>}
                    </div>
                </div>
            )}

            {/* LTV 세그먼트 Tab */}
            {!loading && activeTab === "ltv" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
                    {ltvSegments.map(seg => (
                        <div key={seg.tier} style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, borderLeft: `4px solid ${seg.color}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: seg.color }}>{seg.label}</div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{seg.threshold}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: seg.color }}>{(seg.customer_count || 0).toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}> customers</span></div>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                                {[["Average LTV", `₩${((seg.avg_ltv || 0) / 10000).toFixed(0)}M`], ["Total LTV", `₩${((seg.total_ltv || 0) / 100000000).toFixed(1)}B`], ["Max LTV", `₩${((seg.max_ltv || 0) / 10000).toFixed(0)}M`]].map(([label, val]) => (
                                    <div key={label} style={{ textAlign: "center", background: C.surface, borderRadius: 8, padding: 8 }}>
                                        <div style={{ fontSize: 9, color: C.muted }}>{label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: "8px 12px", borderRadius: 8, background: `${seg.color}0d`, fontSize: 11, color: seg.color }}>
                                💡 {seg.action}
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                <button onClick={() => { createEmailCampaignFromSegment(`seg_${seg.tier}`, `${seg.label} Email Campaign`); addAlert({ type: "success", msg: `📧 ${seg.label} segment Email Campaign created` }); }} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: `${C.accent}15`, color: C.accent, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>📧 Email</button>
                                <button onClick={() => { createKakaoCampaignFromSegment(`seg_${seg.tier}`, `${seg.label} Kakao Campaign`); addAlert({ type: "success", msg: `💬 ${seg.label} Kakao Campaign created` }); }} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: `${C.yellow}15`, color: C.yellow, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>💬 Kakao</button>
                                <button onClick={() => navigate("/journey-builder")} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: `${C.purple}15`, color: C.purple, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>🗺️ Journey</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 모델 성능 Tab */}
            {!loading && activeTab === "model" && (
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div style={{ padding: "10px 18px", borderRadius: 12, background: `${C.green}15`, border: `1px solid ${C.green}30` }}>
                            <div style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>System Score</div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{modelMetrics?.overall_score || 8.7}<span style={{ fontSize: 14, color: C.muted }}>/10</span></div>
                        </div>
                        <div style={{ flex: 1, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
                            <div>Training Schedule: Daily 04:00 KST Auto-retrain</div>
                            <div>Model Version: {modelMetrics?.version || "v2.4.1"}</div>
                            <div>Last Trained: {modelMetrics?.churn_prediction?.last_trained || "2026-03-11"}</div>
                        </div>
                    </div>
                    <ModelMetricsCard metrics={modelMetrics} />
                </div>
            )}

            {/* Integration 현황 Tab */}
            {!loading && activeTab === "integration" && (
                <div>
                    <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 12, background: `${C.green}0d`, border: `1px solid ${C.green}25`, fontSize: 13, color: C.green }}>
                        ✅ AI Forecast system is fully integrated with all Marketing Channels
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                        {[
                            { icon: "👤", name: "Customer CRM", desc: "Real-time sync with 4 segments", status: true, path: "/crm", detail: [`${crmSegments.length} segments shared`, "Purchase history auto-updated", "RFM Score Sync"] },
                            { icon: "📧", name: "Email Marketing", desc: "A/B Test + Segment Integration", status: true, path: "/email-marketing", detail: ["Segment → Campaign auto-generated", "Content A/B Test", "Statistical significance analysis"] },
                            { icon: "💬", name: "Kakao Channel", desc: "Notification Auto Send", status: true, path: "/kakao-channel", detail: ["High-risk → Auto Notification", "Personalized Friend Talk", "Churn detection trigger"] },
                            { icon: "🗺️", name: "Journey Builder", desc: "Churn Forecast Automation", status: true, path: "/journey-builder", detail: ["Churn Risk → Auto journey enrollment", "Purchase prob.-based segmentation", "Multi-channel automation"] },
                            { icon: "🎯", name: "Web Popup", desc: "CRM Segment Targeting", status: true, path: "/web-popup", detail: ["Segment targeting popup", "Exit intent detection integration", "Personalized CTA"] },
                            { icon: "📦", name: "Stock·Orders", desc: "Demand Forecast → Inventory Integration", status: true, path: "/order-hub", detail: ["30-day demand forecast integration", "Pre-emptive low stock alert", "Auto order trigger"] },
                        ].map(({ icon, name, desc, status, path, detail }) => (
                            <div key={name} style={{ background: C.card, borderRadius: 14, padding: 18, border: `1px solid ${status ? C.green + "30" : C.border}`, cursor: "pointer" }} onClick={() => navigate(path)}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                                    <div style={{ fontSize: 22 }}>{icon}</div>
                                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: status ? `${C.green}15` : "rgba(255,255,255,0.06)", color: status ? C.green : C.muted, fontWeight: 700 }}>{status ? "● Integrated" : "○ Disconnected"}</span>
                                </div>
                                <div style={{ fontWeight: 700, marginBottom: 3 }}>{name}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>{desc}</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {detail.map(d => <div key={d} style={{ fontSize: 11, color: C.muted }}>• {d}</div>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Graph 스코어 Tab (GraphScore Unified) */}
            {!loading && activeTab === "graph_score" && (
                <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ padding: "14px 18px", borderRadius: 12, background: `${C.purple}0d`, border: `1px solid ${C.purple}30`, fontSize: 13 }}>
                        🕸️ <b style={{ color: C.purple }}>Graph Score</b> — Customer Network Analysis, Influencer Score, Purchase Influence Index
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                        {[
                            { l: "Network Nodes", v: "8,420", c: C.purple },
                            { l: "Avg. Connection Strength", v: "3.7", c: C.accent },
                            { l: "Influencer Customers", v: "143", c: C.yellow },
                            { l: "Viral Coefficient (K)", v: "1.24", c: C.green },
                        ].map(({ l, v, c }) => (
                            <div key={l} style={{ background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}`, textAlign: "center" }}>
                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{l}</div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: c }}>{v}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                        <div style={{ fontWeight: 700, marginBottom: 14 }}>🏆 Top 10 Influential Customers</div>
                        <div style={{ display: "grid", gap: 8 }}>
                            {["김민준 (Influencer Index 9.4)", "이Count연 (Influencer Index 8.9)", "박지훈 (Influencer Index 8.7)", "최예린 (Influencer Index 8.2)", "정태민 (Influencer Index 7.9)"].map((name, i) => (
                                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: C.surface }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: `${C.purple}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: C.purple }}>{i + 1}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
                                    </div>
                                    <button style={{ padding: "3px 10px", borderRadius: 6, border: "none", background: `${C.purple}15`, color: C.purple, fontSize: 10, cursor: "pointer", fontWeight: 700 }}>Analysis</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Customer 상세 Panel */}
            {selectedCustomer && (
                <CustomerDetailPanel
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onAction={() => setSelectedCustomer(null)}
                />
            )}
        </div>
    );
}

export default function AIPrediction() {
    return (
        <PlanGate feature="customer_ai">
            <AIPredictionInner />
        </PlanGate>
    );
}
