/* build:20260426-0852 */
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNotification } from "../context/NotificationContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useI18n } from "../i18n";

/* ══════════════════════════════════════════════════════════════════
   SECURITY — XSS/Injection guard
══════════════════════════════════════════════════════════════════ */
const XSS_PATTERN = /(<script|javascript:|on\w+=|eval\(|document\.(cookie|domain)|window\.(location|open))/i;

function useReviewsSecurity() {
    const { addAlert, isDemo } = useGlobalData();
    const [hackAlert, setHackAlert] = useState(null);
    useEffect(() => {
        const detectXSS = (e) => {
            const val = e.target?.value || "";
            if (XSS_PATTERN.test(val)) {
                e.target.value = "";
                e.preventDefault();
                const msg = `🛡️ XSS injection blocked on Reviews & UGC: ${val.slice(0, 40)}...`;
                setHackAlert(msg);
                addAlert?.({ type: "warn", msg });
            }
        };
        document.addEventListener("input", detectXSS, true);
        return () => document.removeEventListener("input", detectXSS, true);
    }, [addAlert]);
    return { alert: hackAlert, clearAlert: () => setHackAlert(null) };
}

/* ══════════════════════════════════════════════════════════════════
   AUTO-LOAD: API → GlobalDataContext real-time sync
══════════════════════════════════════════════════════════════════ */
function useReviewsDataSync() {
    const { syncUgcReviews, syncChannelStats, syncNegKeywords } = useGlobalData();
    const loaded = useRef(false);
    useEffect(() => {
        if (loaded.current) return;
        loaded.current = true;
        const BASE = import.meta.env.VITE_API_BASE || "";
        const token = localStorage.getItem("g_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        Promise.allSettled([
            fetch(`${BASE}/api/v423/reviews/list`, { headers }).then(r => r.ok ? r.json() : null),
            fetch(`${BASE}/api/v423/reviews/channel-stats`, { headers }).then(r => r.ok ? r.json() : null),
            fetch(`${BASE}/api/v423/reviews/neg-keywords`, { headers }).then(r => r.ok ? r.json() : null),
        ]).then(([reviewsRes, statsRes, kwRes]) => {
            if (reviewsRes.status === "fulfilled" && Array.isArray(reviewsRes.value)) syncUgcReviews(reviewsRes.value);
            if (statsRes.status === "fulfilled" && Array.isArray(statsRes.value)) syncChannelStats(statsRes.value);
            if (kwRes.status === "fulfilled" && Array.isArray(kwRes.value)) syncNegKeywords(kwRes.value);
        }).catch(() => {});
    }, [syncUgcReviews, syncChannelStats, syncNegKeywords]);
}

/* ══════════════════════════════════════════════════════════════════
   AI Reply Generator
══════════════════════════════════════════════════════════════════ */
function generateAiReply(review, t) {
    const product = review.product || "N/A";
    const category = review.category || "N/A";
    if (review.sentiment === "positive") {
        return t("reviews.aiReplyPositive", `Hello! 😊\n\nThank you so much for your wonderful review of ${product}! Your positive feedback means a great deal to our team.\n\nWe'll continue to deliver great products and service. Hope to see you again! 🙏`).replace("{{product}}", product);
    } else if (review.sentiment === "neutral") {
        return t("reviews.aiReplyNeutral", `Hello,\n\nThank you for using ${product}. We've noted your feedback regarding ${category}.\n\nWe've forwarded this to our team for improvement.`).replace("{{product}}", product).replace("{{category}}", category);
    } else {
        return t("reviews.aiReplyNegative", `Hello,\n\nWe sincerely apologize for the inconvenience with ${product}.\n\nA dedicated CS representative has been assigned and will contact you within 24 hours. 🙇`).replace("{{product}}", product).replace("{{category}}", category);
    }
}

/* ══════════════════════════════════════════════════════════════════
   Stars Component
══════════════════════════════════════════════════════════════════ */
const Stars = ({ n }) => {
    const count = Math.max(0, Math.min(5, n || 0));
    return <span style={{ color: "#fde047", letterSpacing: 1, fontSize: 12 }}>{"★".repeat(count)}{"☆".repeat(5 - count)}</span>;
};

/* ══════════════════════════════════════════════════════════════════
   Toast Component
══════════════════════════════════════════════════════════════════ */
function Toast({ message, onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t); }, [onClose]);
    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "rgba(34,197,94,0.95)", color: '#fff', padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>{message}</div>);
}

/* ══════════════════════════════════════════════
   TAB 1: Dashboard (KPI + Channel + Keywords)
   ══════════════════════════════════════════════ */
function DashboardTab({ t, channelStats, negKeywords, ugcReviews, totalReviews, avgRating, negCount, repliedCount, escalatedCount, onBulkEscalate, onBulkReply }) {
    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-primary" style={{ fontSize: 11, padding: "6px 14px", background: "linear-gradient(135deg,#ef4444,#f97316)" }} onClick={onBulkEscalate}>
                    🚨 {t("reviews.bulkEscalate")}
                </button>
                <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }} onClick={onBulkReply}>
                    🤖 {t("reviews.bulkGenReply")}
                </button>
            </div>

            {/* KPIs */}
            <div className="grid4 fade-up">
                {[
                    { l: t("reviews.kpiTotal"), v: totalReviews.toLocaleString(), s: t("reviews.kpiTotalSub2"), c: "#4f8ef7" },
                    { l: t("reviews.kpiAvgRating"), v: "★ " + avgRating, s: t("reviews.kpiAvgRatingSub2"), c: "#fde047" },
                    { l: t("reviews.kpiNegative"), v: negCount + " " + t("reviews.unitItems"), s: escalatedCount > 0 ? t("reviews.escalationCount") + " " + escalatedCount + t("reviews.unitCount") : "⚠ " + t("reviews.kpiNegativeSub"), c: "#ef4444" },
                    { l: t("reviews.kpiAiReply"), v: repliedCount + " " + t("reviews.unitItems"), s: t("reviews.kpiAiReplySub") + " " + ugcReviews.length + t("reviews.unitCount") + " " + t("reviews.inProgress"), c: "#22c55e" },
                ].map(({ l, v, s, c }, i) => (
                    <div key={i} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 22 }}>{v}</div>
                        <div className="kpi-sub">{s}</div>
                    </div>
                ))}
            </div>

            {/* Channel + Keywords */}
            <div className="grid2 fade-up">
                <div className="card card-glass">
                    <div className="section-title" style={{ marginBottom: 14 }}>📊 {t("reviews.channelRatingTitle")}</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {channelStats.length === 0 && <div style={{ textAlign: "center", color: "#6b7280", padding: 20, fontSize: 12 }}>{t("reviews.noData")}</div>}
                        {channelStats.map(c => (
                            <div key={c.channel} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(241,245,249,0.8)", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)" }}>
                                <span style={{ fontSize: 18 }}>{c.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{c.channel}</div>
                                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#6b7280" }}>
                                        <span style={{ color: "#22c55e" }}>{t("reviews.positive")} {c.pos}%</span>
                                        <span style={{ color: "#ef4444" }}>{t("reviews.negative")} {c.neg}%</span>
                                        <span>{t("reviews.totalCount")} {(c.total || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={{ marginTop: 6, height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
                                        <div style={{ width: `${c.pos || 0}%`, height: "100%", background: "linear-gradient(90deg,#22c55e,#14d9b0)", borderRadius: 4 }} />
                                    </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: c.color || "#fde047" }}>★ {c.avg}</div>
                                    <div style={{ fontSize: 10, color: "#6b7280" }}>/5.0</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card card-glass">
                    <div className="section-title" style={{ marginBottom: 14 }}>⚠ {t("reviews.negKeywordsTitle")}</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {negKeywords.length === 0 && <div style={{ textAlign: "center", color: "#6b7280", padding: 20, fontSize: 12 }}>{t("reviews.noData")}</div>}
                        {negKeywords.map((k, i) => {
                            const maxCount = negKeywords[0]?.count || 1;
                            return (
                                <div key={k.word} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: i === 0 ? "rgba(239,68,68,0.06)" : "rgba(9,15,30,0.4)", borderRadius: 8, border: `1px solid ${i === 0 ? "rgba(239,68,68,0.2)" : "rgba(99,140,255,0.08)"}` }}>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: "#6b7280", width: 20, textAlign: "center" }}>{i + 1}</span>
                                    <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{k.word}</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ height: 4, width: 60, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
                                            <div style={{ width: `${(k.count / maxCount) * 100}%`, height: "100%", background: "#ef4444", borderRadius: 4 }} />
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: 13, width: 24 }}>{k.count}</span>
                                        <span style={{ fontSize: 11, color: (k.change || 0) > 0 ? "#ef4444" : "#22c55e", width: 30 }}>{(k.change || 0) > 0 ? "▲" + k.change : "▼" + Math.abs(k.change || 0)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(239,68,68,0.05)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
                        <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginBottom: 4 }}>🚨 {t("reviews.autoAlertActive")}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{t("reviews.autoAlertDesc")}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════ */
function ReviewCard({ r, replyState, escalateState, onGenReply, onCopyReply, onEscalate, t }) {
    const [showReply, setShowReply] = useState(false);
    const reply = replyState[r.id];
    const escalated = escalateState[r.id];
    return (
        <div style={{ padding: "14px 16px", background: r.sentiment === "negative" ? "rgba(239,68,68,0.04)" : "rgba(9,15,30,0.4)", borderRadius: 12, border: `1px solid ${r.sentiment === "negative" ? "rgba(239,68,68,0.18)" : "rgba(99,140,255,0.08)"}`, transition: "all 200ms" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`badge badge-${r.sentiment === "positive" ? "green" : r.sentiment === "neutral" ? "yellow" : "red"}`} style={{ fontSize: 10 }}>{t("reviews.sentiment_" + r.sentiment)}</span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{r.channel}</span>
                    <span className="badge" style={{ fontSize: 10 }}>{r.category}</span>
                    {escalated && <span className="badge badge-blue" style={{ fontSize: 9 }}>🎯 {t("reviews.csAssigned")}</span>}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Stars n={r.rating} />
                    <span style={{ fontSize: 10, color: "#6b7280" }}>{r.date}</span>
                </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>{r.product}</div>
            <div style={{ fontSize: 13, color: "#1f2937", lineHeight: 1.6, marginBottom: 10 }}>{r.text}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#6b7280", marginRight: 4 }}>👍 {r.helpful || 0} {t("reviews.foundHelpful")}</span>
                <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 10px", color: "#4f8ef7", borderColor: "rgba(79,142,247,0.3)" }} onClick={() => { onGenReply(r); setShowReply(true); }}>
                    {reply ? "✓ " + t("reviews.regenReply") : "🤖 " + t("reviews.draftReply")}
                </button>
                {r.sentiment === "negative" && (
                    <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 10px", color: escalated ? "#22c55e" : "#ef4444", borderColor: escalated ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }} onClick={() => onEscalate(r.id)}>
                        {escalated ? "✓ " + t("reviews.csAssigned") : "🚨 " + t("reviews.csEscalate")}
                    </button>
                )}
                {reply && <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 10px", marginLeft: "auto" }} onClick={() => setShowReply(v => !v)}>{showReply ? "▲ " + t("reviews.hideReply") : "▼ " + t("reviews.showReply")}</button>}
            </div>
            {reply && showReply && (
                <div style={{ marginTop: 12, padding: "12px 14px", background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7" }}>🤖 {t("reviews.aiGenerated")}</div>
                        <button className="btn-ghost" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => onCopyReply(reply)}>📋 {t("reviews.copy")}</button>
                    </div>
                    <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-line" }}>{reply}</div>
                    <div style={{ marginTop: 8, fontSize: 10, color: "#6b7280" }}>* {t("reviews.aiDisclaimer")}</div>
                </div>
            )}
        </div>
    );
}

function ReviewFeedTab({ t, ugcReviews, channelStats, replyState, escalateState, onGenReply, onCopyReply, onEscalate }) {
    const [channel, setChannel] = useState("all");
    const [sentiment, setSentiment] = useState("all");
    const [search, setSearch] = useState("");
    const filtered = useMemo(() => ugcReviews.filter(r => {
        if (channel !== "all" && r.channel !== channel) return false;
        if (sentiment !== "all" && r.sentiment !== sentiment) return false;
        if (search && !(r.text || "").includes(search) && !(r.product || "").includes(search)) return false;
        return true;
    }), [ugcReviews, channel, sentiment, search]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="section-header">
                <div className="section-title">💬 {t("reviews.feedTitle")}
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#6b7280", fontWeight: 400 }}>{t("reviews.feedSub")}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select className="input" style={{ width: 120, padding: "6px 10px", fontSize: 11 }} value={channel} onChange={e => setChannel(e.target.value)}>
                        <option value="all">{t("reviews.allChannel")}</option>
                        {channelStats.map(c => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
                    </select>
                    <select className="input" style={{ width: 100, padding: "6px 10px", fontSize: 11 }} value={sentiment} onChange={e => setSentiment(e.target.value)}>
                        <option value="all">{t("reviews.allSentiment")}</option>
                        <option value="positive">{t("reviews.filterPositive")}</option>
                        <option value="neutral">{t("reviews.filterNeutral")}</option>
                        <option value="negative">{t("reviews.filterNegative")}</option>
                    </select>
                    <input className="input" style={{ width: 160, padding: "6px 10px", fontSize: 11 }} placeholder={t("reviews.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
                {filtered.map(r => <ReviewCard key={r.id} r={r} replyState={replyState} escalateState={escalateState} onGenReply={onGenReply} onCopyReply={onCopyReply} onEscalate={onEscalate} t={t} />)}
                {filtered.length === 0 && <div style={{ textAlign: "center", color: "#6b7280", padding: 40, fontSize: 13 }}>📭 {t("reviews.noData")}</div>}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   TAB 3: Trend Analysis
   ══════════════════════════════════════════════ */
function TrendTab({ t, channelStats, ugcReviews }) {
    const sentimentBreakdown = useMemo(() => {
        const pos = ugcReviews.filter(r => r.sentiment === "positive").length;
        const neu = ugcReviews.filter(r => r.sentiment === "neutral").length;
        const neg = ugcReviews.filter(r => r.sentiment === "negative").length;
        const total = ugcReviews.length || 1;
        return { pos, neu, neg, total, posP: ((pos/total)*100).toFixed(1), neuP: ((neu/total)*100).toFixed(1), negP: ((neg/total)*100).toFixed(1) };
    }, [ugcReviews]);

    if (ugcReviews.length === 0) {
        return <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t("reviews.noTrendData")}</div>
            <div style={{ fontSize: 11 }}>{t("reviews.noTrendDataSub")}</div>
        </div>;
    }

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="section-title">📈 {t("reviews.trendTitle")}</div>
            <div className="grid3 fade-up">
                {[
                    { label: t("reviews.positive"), value: sentimentBreakdown.pos, pct: sentimentBreakdown.posP + "%", color: "#22c55e" },
                    { label: t("reviews.filterNeutral"), value: sentimentBreakdown.neu, pct: sentimentBreakdown.neuP + "%", color: "#eab308" },
                    { label: t("reviews.negative"), value: sentimentBreakdown.neg, pct: sentimentBreakdown.negP + "%", color: "#ef4444" },
                ].map((s, i) => (
                    <div key={i} style={{ padding: "16px 18px", borderRadius: 12, background: s.color + "08", border: `1px solid ${s.color}18` }}>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{s.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: s.color, marginTop: 2 }}>{s.pct}</div>
                    </div>
                ))}
            </div>
            {/* Sentiment bar */}
            <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(241,245,249,0.8)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{t("reviews.sentimentBar")}</div>
                <div style={{ height: 20, borderRadius: 10, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: sentimentBreakdown.posP + "%", background: "#22c55e", transition: "width .5s" }} />
                    <div style={{ width: sentimentBreakdown.neuP + "%", background: "#eab308", transition: "width .5s" }} />
                    <div style={{ width: sentimentBreakdown.negP + "%", background: "#ef4444", transition: "width .5s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#6b7280" }}>
                    <span style={{ color: "#22c55e" }}>😊 {sentimentBreakdown.posP}%</span>
                    <span style={{ color: "#eab308" }}>😐 {sentimentBreakdown.neuP}%</span>
                    <span style={{ color: "#ef4444" }}>😠 {sentimentBreakdown.negP}%</span>
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   TAB 4: Settings
   ══════════════════════════════════════════════ */
function SettingsTab({ t }) {
    const [aiTone, setAiTone] = useState("professional");
    const [autoEscalate, setAutoEscalate] = useState(true);
    const [slackWebhook, setSlackWebhook] = useState("");
    return (
        <div style={{ display: "grid", gap: 20, maxWidth: 600 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>⚙️ {t("reviews.settingsTitle")}</div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>{t("reviews.aiToneLabel")}</div>
                <select className="input" style={{ width: "100%", padding: "8px 12px", fontSize: 12 }} value={aiTone} onChange={e => setAiTone(e.target.value)}>
                    <option value="professional">{t("reviews.toneProfessional")}</option>
                    <option value="friendly">{t("reviews.toneFriendly")}</option>
                    <option value="formal">{t("reviews.toneFormal")}</option>
                </select>
            </div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>{t("reviews.autoEscalateLabel")}</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={autoEscalate} onChange={e => setAutoEscalate(e.target.checked)} />
                    <span style={{ fontSize: 12 }}>{t("reviews.autoEscalateDesc")}</span>
                </label>
            </div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>{t("reviews.slackWebhookLabel")}</div>
                <input className="input" style={{ width: "100%", padding: "8px 12px", fontSize: 12, boxSizing: "border-box" }} placeholder="https://hooks.slack.com/services/..." value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)} />
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{t("reviews.slackWebhookSub")}</div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════
   TAB 5: Guide (i18n 9-Language)
   ══════════════════════════════════════════════ */
function ReviewsGuideTab({ t }) {
    return (
        <div style={{ display: "grid", gap: 24, maxWidth: 820, margin: "0 auto", padding: "20px 0" }}>
            <div style={{ textAlign: "center", padding: "32px 20px", borderRadius: 16, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)" }}>
                <div style={{ fontSize: 40 }}>⭐</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: '#1f2937' }}>{t('reviews.guideTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('reviews.guideSub')}</div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, padding:20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1f2937' }}>{t('reviews.guideStepsTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                    {[{n:'1',k:'guideStep1',c:'#6366f1'},{n:'2',k:'guideStep2',c:'#22c55e'},{n:'3',k:'guideStep3',c:'#a855f7'},{n:'4',k:'guideStep4',c:'#f97316'},{n:'5',k:'guideStep5',c:'#06b6d4'},{n:'6',k:'guideStep6',c:'#f472b6'},{n:'7',k:'guideStep7',c:'#6366f1'},{n:'8',k:'guideStep8',c:'#22c55e'},{n:'9',k:'guideStep9',c:'#a855f7'},{n:'10',k:'guideStep10',c:'#f97316'},{n:'11',k:'guideStep11',c:'#06b6d4'},{n:'12',k:'guideStep12',c:'#f472b6'},{n:'13',k:'guideStep13',c:'#6366f1'},{n:'14',k:'guideStep14',c:'#22c55e'},{n:'15',k:'guideStep15',c:'#a855f7'}].map((s,i) => (
                        <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: s.c + '0a', border: `1px solid ${s.c}20` }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, fontSize:14, fontWeight:700, background:s.c, color:s.c, width:26, height:26, borderRadius:'50%', justifyContent:'center' }} ><span>{s.n}</span><span>{t(`reviews.${s.k}Title`)}</span></div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>{t(`reviews.${s.k}Desc`)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1f2937' }}>{t('reviews.guideTabsTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10 }}>
                    {[{icon:'📊',k:'guideDash',c:'#6366f1'},{icon:'💬',k:'guideFeed',c:'#22c55e'},{icon:'📈',k:'guideTrend',c:'#a855f7'},{icon:'⚙️',k:'guideSettings',c:'#f97316'},{icon:'📖',k:'guideGuide',c:'#f472b6'}].map((tb,i) => (
                        <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: tb.c + '08', border: `1px solid ${tb.c}15` }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: tb.c }}>{tb.icon} {t(`reviews.${tb.k}Name`)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{t(`reviews.${tb.k}Desc`)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: '#1f2937' }}>💡 {t('reviews.guideTipsTitle')}</div>
                <ul style={{ display: "grid", gap: 8, paddingLeft: 20, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                    <li>{t('reviews.guideTip1')}</li>
                    <li>{t('reviews.guideTip2')}</li>
                    <li>{t('reviews.guideTip3')}</li>
                    <li>{t('reviews.guideTip4')}</li>
                    <li>{t('reviews.guideTip5')}</li>
                    <li>{t('reviews.guideTip6')}</li>
                    <li>{t('reviews.guideTip7')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN: ReviewsUGC — Enterprise Tab Structure
══════════════════════════════════════════════════════════════════ */
export default function ReviewsUGC() {
    const { pushNotification } = useNotification();
    const { ugcReviews = [], channelStats = [], negKeywords = [], addAlert } = useGlobalData();
    const { t } = useI18n();
    const { alert: hackAlert, clearAlert: clearHack } = useReviewsSecurity();
    useReviewsDataSync();

    const [tab, setTab] = useState("dashboard");
    const [replyState, setReplyState] = useState({});
    const [escalateState, setEscalateState] = useState({});
    const [toast, setToast] = useState(null);

    const totalReviews = channelStats.reduce((s, c) => s + (c.total || 0), 0);
    const avgRating = totalReviews > 0 ? (channelStats.reduce((s, c) => s + (c.avg || 0) * (c.total || 0), 0) / totalReviews).toFixed(2) : "0.00";
    const negCount = ugcReviews.filter(r => r.sentiment === "negative").length;
    const repliedCount = Object.keys(replyState).length;
    const escalatedCount = Object.keys(escalateState).length;

    const handleGenReply = useCallback((r) => { setReplyState(prev => ({ ...prev, [r.id]: generateAiReply(r, t) })); setToast(t("reviews.draftGenerated")); }, [t]);
    const handleCopyReply = useCallback((text) => { navigator.clipboard.writeText(text).catch(() => {}); setToast(t("reviews.copied")); }, [t]);
    const handleEscalate = useCallback((id) => {
        setEscalateState(prev => ({ ...prev, [id]: true }));
        setToast(t("reviews.escalated"));
        pushNotification({ type: "review", title: t("reviews.escalationTitle"), body: t("reviews.escalationBody"), link: "/reviews-ugc" });
    }, [t, pushNotification]);
    const onBulkEscalate = useCallback(() => { ugcReviews.filter(r => r.sentiment === "negative").forEach(r => handleEscalate(r.id)); }, [ugcReviews, handleEscalate]);
    const onBulkReply = useCallback(() => { ugcReviews.forEach(r => handleGenReply(r)); }, [ugcReviews, handleGenReply]);

    const TABS = useMemo(() => [
        { id: "dashboard", label: `📊 ${t('reviews.tabDashboard')}` },
        { id: "feed", label: `💬 ${t('reviews.tabFeed')}` },
        { id: "trend", label: `📈 ${t('reviews.tabTrend')}` },
        { id: "settings", label: `⚙️ ${t('reviews.tabSettings')}` },
        { id: "guide", label: `📖 ${t('reviews.tabGuide')}` },
    ], [t]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Live Sync Status */}
            <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(20,217,176,0.04)', border:'1px solid rgba(20,217,176,0.12)', fontSize:10, color:'#14d9b0', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }} />
                {t('reviews.liveSyncMsg')}
            </div>
            {hackAlert && (
                <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 99999, background: "rgba(239,68,68,0.95)", backdropFilter: "blur(10px)", border: "1px solid #fca5a5", padding: "16px 24px", borderRadius: 12, color: '#fff', fontWeight: 900, fontSize: 13, boxShadow: "0 20px 40px rgba(220,38,38,0.4)", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 24 }}>🛡️</span><span>{hackAlert}</span>
                    <button onClick={clearHack} style={{ marginLeft: 20, background: "rgba(0,0,0,0.3)", border: "none", color: '#fff', padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>{t("reviews.close")}</button>
                </div>
            )}
            {toast && <Toast message={toast} onClose={() => setToast(null)} />}

            {/* Hero */}
            <div style={{ borderRadius:16, background:"rgba(255,255,255,0.95)", border:"1px solid rgba(0,0,0,0.08)", padding:"22px 28px", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ fontSize:28 }}>⭐</div>
                    <div>
                        <div style={{ fontWeight:900, fontSize:22, color:"#1f2937" }}>{t("reviews.heroTitle")}</div>
                        <div style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>{t("reviews.heroDesc")}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", gap:4, padding:5, background:"rgba(0,0,0,0.04)", borderRadius:14, overflowX:"auto", flexShrink:0, marginBottom:12 }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} className={tab===tb.id?"rv-active-tab":""} style={{ padding:"8px 14px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:11, flex:1, whiteSpace:"nowrap", background: tab===tb.id ? "#f97316" : "transparent", color: tab===tb.id ? "#ffffff" : "#4b5563", transition:"all 150ms" }}>{tb.label}</button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex:1, overflowY:"auto", paddingBottom:20 }}>
            <div style={{ background:"rgba(255,255,255,0.95)", border:"1px solid rgba(0,0,0,0.08)", borderRadius:14, padding:20 }}>
                {tab === "dashboard" && <DashboardTab t={t} channelStats={channelStats} negKeywords={negKeywords} ugcReviews={ugcReviews} totalReviews={totalReviews} avgRating={avgRating} negCount={negCount} repliedCount={repliedCount} escalatedCount={escalatedCount} onBulkEscalate={onBulkEscalate} onBulkReply={onBulkReply} />}
                {tab === "feed" && <ReviewFeedTab t={t} ugcReviews={ugcReviews} channelStats={channelStats} replyState={replyState} escalateState={escalateState} onGenReply={handleGenReply} onCopyReply={handleCopyReply} onEscalate={handleEscalate} />}
                {tab === "trend" && <TrendTab t={t} channelStats={channelStats} ugcReviews={ugcReviews} />}
                {tab === "settings" && <SettingsTab t={t} />}
                {tab === "guide" && <ReviewsGuideTab t={t} />}
            </div>
            </div>
        </div>
    );
}

