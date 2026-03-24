import React, { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

// Fallback helper — returns value if it's a non-empty string, else fallback
const tf = (val, fb) => (typeof val === 'string' && val ? val : fb);

/* ─── utils ─────────────────────────────────────────────── */
// currency formatting via useCurrency fmt()
const fmtM = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(Number(v).toFixed(0));
const pct = (n, d) => d ? (n / d * 100).toFixed(1) + "%" : "—";

/* ─── Sparkline SVG ─────────────────────────────────────── */
function Sparkline({ values, color = "#4f8ef7", h = 40, w = 120, threshold }) {
    if (!values || values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
    }).join(" ");
    const lastV = values[values.length - 1];
    const lastX = w;
    const lastY = h - ((lastV - min) / range) * h;
    const bad = threshold != null && lastV > threshold;
    const dotColor = bad ? "#ef4444" : color;
    return (
        <svg width={w} height={h} style={{ overflow: "visible" }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
            <circle cx={lastX} cy={lastY} r={3.5} fill={dotColor} />
            {bad && <circle cx={lastX} cy={lastY} r={7} fill="none" stroke="#ef4444" strokeWidth={1} strokeOpacity={0.4} />}
        </svg>
    );
}

/* ─── Insight Card ──────────────────────────────────────── */
function InsightCard({ icon, title, desc, bullets, severity = "info", action }) {
    const colors = { high: "#ef4444", mid: "#eab308", info: "#4f8ef7", good: "#22c55e" };
    const col = colors[severity] || colors.info;
    return (
        <div style={{
            padding: "16px 20px", borderRadius: 14, border: `1px solid ${col}25`,
            background: `${col}07`, borderLeft: `3px solid ${col}`,
        }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: col, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>{desc}</div>
                    {bullets && (
                        <div style={{ display: "grid", gap: 4 }}>
                            {bullets.map((b, i) => (
                                <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
                                    <span>→</span><span>{b}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {action && (
                        <button className="btn-primary" style={{
                            marginTop: 12, fontSize: 11, padding: "5px 14px",
                            background: `linear-gradient(135deg,${col},${col}aa)`,
                        }}>{action}</button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Trend Chart Row ───────────────────────────────────── */
function TrendRow({ label, values, color, unit = "", threshold, icon }) {
    if (!values || values.length === 0) return null;
    const last = values[values.length - 1];
    const prev = values[values.length - 2] ?? last;
    const delta = last - prev;
    const bad = threshold != null && last > threshold;
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "10px 0",
            borderBottom: "1px solid rgba(99,140,255,0.06)",
        }}>
            <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{icon}</span>
            <div style={{ width: 120, fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}>{label}</div>
            <Sparkline values={values} color={bad ? "#ef4444" : color} threshold={threshold} />
            <div style={{ minWidth: 70, textAlign: "right", fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: bad ? "#ef4444" : color }}>
                {typeof last === "number" ? last.toFixed(1) : last}{unit}
            </div>
            <div style={{
                fontSize: 10, fontWeight: 700, minWidth: 44, textAlign: "right",
                color: delta >= 0 ? (threshold != null ? "#ef4444" : "#22c55e") : "#22c55e",
            }}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(1)}{unit}
            </div>
        </div>
    );
}

/* ─── Chat Message ──────────────────────────────────────── */
function ChatMsg({ role, text, insight, loading }) {
    const isAI = role === "ai";
    return (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", justifyContent: isAI ? "flex-start" : "flex-end" }}>
            {isAI && (
                <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#4f8ef7,#a855f7)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                }}>🤖</div>
            )}
            <div style={{
                maxWidth: "75%", padding: "10px 14px", borderRadius: isAI ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                background: isAI ? "rgba(79,142,247,0.08)" : "rgba(99,140,255,0.15)",
                border: `1px solid ${isAI ? "rgba(79,142,247,0.15)" : "rgba(99,140,255,0.2)"}`,
                fontSize: 12, lineHeight: 1.6,
            }}>
                {loading ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center", color: "var(--text-3)" }}>
                        <span style={{ animation: "pulse 1s infinite" }}>●</span>
                        <span style={{ animation: "pulse 1s infinite 0.2s" }}>●</span>
                        <span style={{ animation: "pulse 1s infinite 0.4s" }}>●</span>
                        <span style={{ marginLeft: 6 }}>{t('aiInsightsPage.analyzing')}</span>
                    </div>
                ) : (
                    <>
                        <div style={{ color: "var(--text-1)" }}>{text}</div>
                        {insight?.bullets && (
                            <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                                {insight.bullets.map((b, i) => (
                                    <div key={i} style={{ display: "flex", gap: 6, color: "var(--text-2)" }}>
                                        <span>→</span><span>{b}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {insight?.recommendation && (
                            <div style={{
                                marginTop: 8, padding: "6px 10px", borderRadius: 8,
                                background: "rgba(79,142,247,0.07)", fontSize: 11, color: "#4f8ef7",
                                fontWeight: 600,
                            }}>
                                💡 {insight.recommendation}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Mock Trend Data ───────────────────────────────────── */
function genWeeks(n, base, noise) {
    const vals = [];
    let cur = base;
    for (let i = 0; i < n; i++) {
        cur += noise * (Math.random() * 2 - 1);
        vals.push(Math.max(0, parseFloat(cur.toFixed(2))));
    }
    return vals;
}

const N = 12;
const TREND_DATA = {
    pnl: {
        netProfit: genWeeks(N, 90000000, 8000000),
        adSpend: genWeeks(N, 55000000, 4000000),
        fees: genWeeks(N, 22000000, 2000000),
        infCost: genWeeks(N, 18000000, 1500000),
    },
    roas: {
        Meta: genWeeks(N, 4.2, 0.4),
        Google: genWeeks(N, 6.8, 0.3),
        TikTok: genWeeks(N, 2.1, 0.5),
        Naver: genWeeks(N, 7.1, 0.2),
        Coupang: genWeeks(N, 1.7, 0.3),
    },
    returns: {
        "SKU-A1": genWeeks(N, 4.1, 0.5),
        "SKU-B2": genWeeks(N, 12.1, 1.0),
        "SKU-C3": genWeeks(N, 19.8, 1.5),
        "SKU-D4": genWeeks(N, 20.2, 1.8),
    },
};

// MOCK_INSIGHTS are built inside the component using t()

/* ─── TAB: Insights Card ─────────────────────────────────── */
function InsightCardsTab() {
    const { t } = useI18n();
    return (
        <div style={{ display: "grid", gap: 14 }}>
            <InsightCard
                icon="📉" severity="high" title={t('aiInsightsPage.card1Title')}
                desc={t('aiInsightsPage.card1Desc')}
                bullets={[t('aiInsightsPage.card1B1'), t('aiInsightsPage.card1B2')]}
                action={t('aiInsightsPage.card1Action')}
            />
            <InsightCard
                icon="↩" severity="high" title={t('aiInsightsPage.card2Title')}
                desc={t('aiInsightsPage.card2Desc')}
                bullets={[t('aiInsightsPage.card2B1'), t('aiInsightsPage.card2B2')]}
                action={t('aiInsightsPage.card2Action')}
            />
            <InsightCard
                icon="🏷" severity="mid" title={t('aiInsightsPage.card3Title')}
                desc={t('aiInsightsPage.card3Desc')}
                bullets={[t('aiInsightsPage.card3B1'), t('aiInsightsPage.card3B2')]}
                action={t('aiInsightsPage.card3Action')}
            />
            <InsightCard
                icon="⭐" severity="good" title={t('aiInsightsPage.card4Title')}
                desc={t('aiInsightsPage.card4Desc')}
                bullets={[t('aiInsightsPage.card4B1'), t('aiInsightsPage.card4B2')]}
                action={t('aiInsightsPage.card4Action')}
            />
        </div>
    );
}

/* ─── TAB: Trend Chart ──────────────────────────────────── */
function TrendsTab() {
    const { t } = useI18n();
    const [metric, setMetric] = useState("roas");
    const tabs = [
        { id: "roas", label: t('aiInsightsPage.trendRoas') },
        { id: "returns", label: t('aiInsightsPage.trendReturns') },
        { id: "pnl", label: "P&L" },
    ];
    const roasColors = { Meta: "#4f8ef7", Google: "#22c55e", TikTok: "#f97316", Naver: "#a855f7", Coupang: "#ef4444" };
    const skuColors = { "SKU-A1": "#4f8ef7", "SKU-B2": "#a855f7", "SKU-C3": "#f97316", "SKU-D4": "#ef4444" };
    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setMetric(t.id)} style={{
                        padding: "5px 14px", borderRadius: 8, border: "1px solid",
                        borderColor: metric === t.id ? "#4f8ef7" : "var(--border)",
                        background: metric === t.id ? "rgba(79,142,247,0.12)" : "transparent",
                        color: metric === t.id ? "#4f8ef7" : "var(--text-3)", fontSize: 11, cursor: "pointer", fontWeight: 700,
                    }}>{t.label}</button>
                ))}
            </div>
            <div className="card card-glass" style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 12 }}>{t('aiInsightsPage.last12weeks')}</div>
                {metric === "roas" && Object.entries(TREND_DATA.roas).map(([ch, vals]) => (
                    <TrendRow key={ch} icon={ch === "Meta" ? "📘" : ch === "Google" ? "🔍" : ch === "TikTok" ? "📱" : ch === "Naver" ? "🟢" : "🟠"}
                        label={ch} values={vals} color={roasColors[ch]} unit="x" threshold={ch === "Coupang" || ch === "TikTok" ? 3.0 : undefined} />
                ))}
                {metric === "returns" && Object.entries(TREND_DATA.returns).map(([sku, vals]) => (
                    <TrendRow key={sku} icon="↩" label={sku} values={vals} color={skuColors[sku]} unit="%" threshold={12} />
                ))}
                {metric === "pnl" && (
                    <>
                        <TrendRow icon="💰" label="Net Profit" values={TREND_DATA.pnl.netProfit.map(v => Math.round(v / 1e6))} color="#22c55e" unit="M" />
                        <TrendRow icon="📣" label={t('aiInsightsPage.adSpend')} values={TREND_DATA.pnl.adSpend.map(v => Math.round(v / 1e6))} color="#f97316" unit="M" />
                        <TrendRow icon="🏪" label={t('aiInsightsPage.platformFee')} values={TREND_DATA.pnl.fees.map(v => Math.round(v / 1e6))} color="#ef4444" unit="M" />
                        <TrendRow icon="🤝" label={t('aiInsightsPage.influencerCost')} values={TREND_DATA.pnl.infCost.map(v => Math.round(v / 1e6))} color="#a855f7" unit="M" />
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── TAB: AI Chat 어시스턴트 ───────────────────────────── */
function AIAssistantTab() {
    const { t } = useI18n();
    const [messages, setMessages] = useState([]);
    useEffect(() => {
        setMessages([{ role: "ai", text: t('aiInsightsPage.aiGreeting'), insight: null }]);
    }, []); // eslint-disable-line
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [ctx, setCtx] = useState("pnl");
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const MARKETING_DATA = {
        platforms: [
            { id: "meta", name: "Meta Ads", spend: 148200, roas: 4.21, ctr: 2.84, cpc: 1.82, impressions: 4820000, clicks: 136800, conv: 1240 },
            { id: "tiktok", name: "TikTok Biz", spend: 89400, roas: 3.18, ctr: 3.91, cpc: 1.24, impressions: 7200000, clicks: 72100, conv: 820 },
            { id: "shopify", name: "Shopify", spend: 22100, roas: 7.24, ctr: 4.12, cpc: 0.91, impressions: 2100000, clicks: 24300, conv: 1560 },
            { id: "amazon", name: "Amazon Ads", spend: 63100, roas: 2.87, ctr: 0.84, cpc: 3.21, impressions: 1950000, clicks: 19640, conv: 1180 },
        ],
        total_spend: 322800,
        blended_roas: 3.84,
        total_conv: 4800,
    };

    const sendMessage = async (question, context) => {
        const q = question || input.trim();
        const c = context || ctx;
        if (!q) return;
        setInput("");
        setMessages(prev => [...prev, { role: "user", text: q }]);
        setLoading(true);
        setMessages(prev => [...prev, { role: "ai", text: "", loading: true }]);

        try {
            const token = localStorage.getItem("genie_auth_token") || "";
            const r = await fetch("/api/v422/ai/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    context: c,
                    question: q,
                    data: MARKETING_DATA,
                }),
            });
            const d = await r.json();

            if (d.ok) {
                setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = {
                        role: "ai",
                        text: d.summary,
                        insight: { bullets: d.bullets || [], recommendation: d.recommendation },
                        loading: false,
                        tokens: d.tokens_used,
                    };
                    return next;
                });
            } else {
                throw new Error(d.error || t('aiInsightsPage.analysisFailed'));
            }
        } catch (e) {
            setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = {
                    role: "ai",
                    text: `❌ ${t('aiInsightsPage.errorPrefix')}: ${e.message}`,
                    loading: false,
                };
                return next;
            });
        } finally {
            setLoading(false);
        }
    };

    const quickQuestions = [
        { ctx: "pnl", q: t('aiInsightsPage.qq1') },
        { ctx: "roas", q: t('aiInsightsPage.qq2') },
        { ctx: "returns", q: t('aiInsightsPage.qq3') },
        { ctx: "pnl", q: t('aiInsightsPage.qq4') },
    ];

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["pnl", "P&L"], ["roas", "ROAS"], ["returns", t('aiInsightsPage.returns')]].map(([k, l]) => (
                    <button key={k} onClick={() => setCtx(k)} style={{
                        padding: "4px 12px", borderRadius: 99, border: "1px solid",
                        borderColor: ctx === k ? "#4f8ef7" : "var(--border)",
                        background: ctx === k ? "rgba(79,142,247,0.12)" : "transparent",
                        color: ctx === k ? "#4f8ef7" : "var(--text-3)", fontSize: 11, cursor: "pointer", fontWeight: 700,
                    }}>{l}</button>
                ))}
                <span style={{ fontSize: 10, color: "var(--text-3)", display: "flex", alignItems: "center", marginLeft: 4 }}>{t('aiInsightsPage.selectContext')}</span>
            </div>

            {/* Quick Questions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {quickQuestions.map((qq, i) => (
                    <button key={i} onClick={() => sendMessage(qq.q, qq.ctx)} disabled={loading} style={{
                        padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)",
                        background: "rgba(99,140,255,0.04)", color: "var(--text-2)",
                        fontSize: 11, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
                    }}>{qq.q}</button>
                ))}
            </div>

            {/* Chat Area */}
            <div className="card card-glass" style={{
                minHeight: 320, maxHeight: 420, overflowY: "auto", padding: 16, display: "grid", gap: 12, alignContent: "start",
            }}>
                {messages.map((m, i) => <ChatMsg key={i} {...m} />)}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ display: "flex", gap: 8 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !loading && sendMessage()}
                    placeholder={t('aiInsightsPage.inputPlaceholder')}
                    disabled={loading}
                    style={{
                        flex: 1, padding: "9px 14px", borderRadius: 10, border: "1px solid var(--border)",
                        background: "var(--surface-2)", color: "var(--text-1)", fontSize: 12,
                        outline: "none",
                    }}
                />
                <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="btn-primary" style={{ padding: "9px 18px", fontSize: 12 }}>
                    {loading ? "⋯" : t('aiInsightsPage.send')}
                </button>
            </div>
        </div>
    );
}

/* ─── TAB: Analysis 이력 ─────────────────────────────────────── */
function HistoryTab() {
    const { t } = useI18n();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("genie_auth_token") || "";
            const r = await fetch("/api/v422/ai/analyses?limit=20", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const d = await r.json();
            setRows(d.analyses || []);
        } catch { setRows([]); } finally { setLoading(false); }
    }, []);

    useEffect(() => { const ac = new AbortController(); load(); return () => ac.abort(); }, [load]);

    const ctxColor = { marketing: "#4f8ef7", pnl: "#22c55e", roas: "#f97316", returns: "#ef4444" };

    return (
        <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t('aiInsightsPage.historyTitle')}</div>
                <button onClick={load} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer" }}>
                    {t('aiInsightsPage.refresh')}
                </button>
            </div>
            {loading ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>{t('aiInsightsPage.loading')}</div>
            ) : rows.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>{t('aiInsightsPage.noHistory')}</div>
            ) : rows.map(row => (
                <div key={row.id} style={{
                    padding: "14px 16px", borderRadius: 12,
                    border: `1px solid ${(ctxColor[row.context] || "#4f8ef7")}22`,
                    background: `${(ctxColor[row.context] || "#4f8ef7")}06`,
                    borderLeft: `3px solid ${ctxColor[row.context] || "#4f8ef7"}`,
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                            background: (ctxColor[row.context] || "#4f8ef7") + "22",
                            color: ctxColor[row.context] || "#4f8ef7",
                        }}>{row.context}</span>
                        <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                            {new Date(row.created_at).toLocaleString("ko-KR")} · 🎟 {row.tokens_used}tok
                        </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Q: {row.question}</div>
                    {row.status === "ok" ? (
                        <>
                            <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 6 }}>{row.summary}</div>
                            {row.bullets?.length > 0 && (
                                <div style={{ display: "grid", gap: 3, marginBottom: 6 }}>
                                    {row.bullets.map((b, i) => (
                                        <div key={i} style={{ fontSize: 11, color: "var(--text-3)", display: "flex", gap: 6 }}>
                                            <span>→</span><span>{b}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {row.recommendation && (
                                <div style={{
                                    fontSize: 11, padding: "5px 10px", borderRadius: 8,
                                    background: "rgba(79,142,247,0.07)", color: "#4f8ef7", fontWeight: 600
                                }}>
                                    💡 {row.recommendation}
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ fontSize: 11, color: "#ef4444" }}>❌ {row.error_msg}</div>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ─── MAIN ───────────────────────────────────────────────── */
export default function AIInsights() {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const [tab, setTab] = useState("cards");

    const TABS = [
        { id: "cards", label: `🔍 ${t('aiInsightsPage.tabCards')}`, desc: t('aiInsightsPage.tabCardsDesc') },
        { id: "trends", label: `📈 ${t('aiInsightsPage.tabTrends')}`, desc: t('aiInsightsPage.tabTrendsDesc') },
        { id: "chat", label: `🤖 ${t('aiInsightsPage.tabChat')}`, desc: t('aiInsightsPage.tabChatDesc') },
        { id: "history", label: `📋 ${t('aiInsightsPage.tabHistory')}`, desc: t('aiInsightsPage.tabHistoryDesc') },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(168,85,247,0.06),rgba(79,142,247,0.05))",
                borderColor: "rgba(168,85,247,0.15)",
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.22),rgba(79,142,247,0.15))" }}>🤖</div>
                    <div>
                        <div className="hero-title" style={{
                            background: "linear-gradient(135deg,#a855f7,#4f8ef7)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>{t('aiInsightsPage.heroTitle')}</div>
                        <div className="hero-desc">{t('aiInsightsPage.heroDesc')}</div>
                    </div>
                </div>
                <div style={{
                    display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap",
                }}>
                    {[
                        { label: t('aiInsightsPage.badge1'), color: "#ef4444" },
                        { label: t('aiInsightsPage.badge2'), color: "#f97316" },
                        { label: t('aiInsightsPage.badge3'), color: "#22c55e" },
                    ].map(({ label, color }) => (
                        <span key={label} style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                            background: color + "18", color, border: `1px solid ${color}33`,
                        }}>{label}</span>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                    {TABS.map(tabItem => (
                        <button key={tabItem.id} onClick={() => setTab(tabItem.id)} style={{
                            padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === tabItem.id ? "rgba(168,85,247,0.08)" : "transparent",
                            borderBottom: `2px solid ${tab === tabItem.id ? "#a855f7" : "transparent"}`, transition: "all 200ms",
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: tab === tabItem.id ? "var(--text-1)" : "var(--text-2)" }}>{tabItem.label}</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{tabItem.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
                {tab === "cards" && <InsightCardsTab />}
                {tab === "trends" && <TrendsTab />}
                {tab === "chat" && <AIAssistantTab />}
                {tab === "history" && <HistoryTab />}
            </div>
        </div>
    );
}
