import React, { useState, useCallback } from "react";
import { useT } from "../i18n/index.js";
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── Util ─────────────────────────────────────────────── */
// currency formatting via useCurrency fmt()
const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) + "%" : "—";
const scoreColor = s => s >= 80 ? "#22c55e" : s >= 60 ? "#4f8ef7" : s >= 40 ? "#eab308" : "#ef4444";
const gradeOf = s => s >= 90 ? "S" : s >= 75 ? "A" : s >= 60 ? "B" : s >= 45 ? "C" : "D";

function Bar({ pct: p, color, h = 5 }) {
    return (
        <div style={{ height: h, borderRadius: h, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, Math.max(0, p))}%`, height: "100%", background: color, borderRadius: h, transition: "width .6s" }} />
        </div>
    
    );
}

function ScoreBadge({ score, size = 44 }) {
    const col = scoreColor(score ?? 0);
    const r = 17; const circ = 2 * Math.PI * r;
    const dash = score != null ? (score / 100) * circ : 0;
    return (
        <svg width={size} height={size} viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
            {score != null && <circle cx="22" cy="22" r={r} fill="none" stroke={col} strokeWidth="4"
                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />}
            <text x="22" y="26" textAnchor="middle" fill={col} fontSize="10" fontWeight="900">{score ?? "—"}</text>
        </svg>
    );
}

function GradeBadge({ grade }) {
    const c = { S: "#fde047", A: "#22c55e", B: "#4f8ef7", C: "#eab308", D: "#ef4444" }[grade] || "#666";
    return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, fontWeight: 900, fontSize: 13, background: c + "18", border: `2px solid ${c}44`, color: c }}>{grade}</span>;
}

function Tag({ label, color }) {
    return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>;
}

function SectionTitle({ children }) {
    return <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12 }}>{children}</div>;
}

/* ═══════════════════════ DATA ═══════════════════════════ */
const FUNNEL = [];

const INF_FUNNEL = [];

const STD_KPIS = [
    { id: "roas", cat: "Profit성", name: "ROAS (AdProfit률)", desc: "Ad Spend 대비 Revenue", weight: 12, calc: (d) => d.orders * d.revenuePer / d.spend, format: v => v.toFixed(2) + "x", target: 3.5 },
    { id: "cvr", cat: "Conversion", name: "CVR (Conv. Rate)", desc: "Clicks → 구매 Conv. Rate", weight: 10, calc: (d) => (d.orders / d.clicks) * 100, format: v => v.toFixed(2) + "%", target: 8 },
    { id: "cpa", cat: "Cost", name: "CPA (건당 획득비)", desc: "구매 1건당 Ad Spend", weight: 9, calc: (d) => d.spend / d.orders, format: v => v.toFixed(0), target: 12000, invert: true },
    { id: "ctr", cat: "Impressions", name: "CTR (CTR)", desc: "Impressions 대비 CTR", weight: 8, calc: (d) => (d.clicks / d.imp) * 100, format: v => v.toFixed(3) + "%", target: 2 },
    { id: "cpm", cat: "Cost", name: "CPM (1000Impressions Cost)", desc: "Impressions 단가", weight: 6, calc: (d) => (d.spend / d.imp) * 1000, format: v => v.toFixed(0), target: 30000, invert: true },
    { id: "cpc", cat: "Cost", name: "CPC (Clicks당 Cost)", desc: "Clicks 단가", weight: 6, calc: (d) => d.spend / d.clicks, format: v => v.toFixed(0), target: 3000, invert: true },
    { id: "aov", cat: "Profit성", name: "AOV (Average Orders가)", desc: "Orders당 Average Amount", weight: 7, calc: (d) => d.revenuePer, format: v => v.toFixed(0), target: 80000 },
    { id: "cart_cvr", cat: "Conversion", name: "장바구니 Conv. Rate", desc: "장바구니 → 구매율", weight: 8, calc: (d) => (d.orders / d.cart) * 100, format: v => v.toFixed(1) + "%", target: 60 },
    { id: "new_cust", cat: "신규", name: "신규Customer Rate", desc: "All 구매 in progress 신규 Customer", weight: 7, calc: (d) => d.newCustomerPct, format: v => v + "%", target: 30 },
    { id: "mobile_cvr", cat: "디바이스", name: "모바일 Conversion Rate", desc: "모바일 기기 Conversion Weight", weight: 4, calc: (d) => d.mobileConvPct, format: v => v + "%", target: 55 },
    { id: "imp_quality", cat: "Impressions", name: "Impressions 품질 지Count", desc: "유효 Impressions Rate 추정", weight: 5, calc: (d) => (d.clicks / d.imp) * 100 * 20, format: v => Math.min(100, v).toFixed(0) + "점", target: 80 },
    { id: "budget_effic", cat: "Budget", name: "Budget 효율", desc: "지출 대비 Revenue / Budget", weight: 7, calc: (d) => Math.min(100, (d.orders * d.revenuePer / d.spend) * 25), format: v => v.toFixed(0) + "점", target: 80 },
    { id: "reach_effic", cat: "도달", name: "도달 효율", desc: "Clicks → Impressions 퀄리티", weight: 5, calc: (d) => (d.cart / d.clicks) * 100, format: v => v.toFixed(2) + "%", target: 10 },
    { id: "revenue_per_imp", cat: "Profit성", name: "Impressions당 Profit", desc: "인상당 기대 Revenue", weight: 5, calc: (d) => (d.orders * d.revenuePer / d.imp) * 1000, format: v => v.toFixed(1) + "/K", target: 0.5 },
    { id: "inf_roi", cat: "인플루언서", name: "인플루언서 ROI", desc: "인플루언서 투자 대비 Revenue", weight: 5, calc: (d) => d.inf_roi || 0, format: v => v + "x", target: 50 },
];

const CONTRIB_DIMENSIONS_KEYS = [
    { key: "channel", labelKey: "dimChannel", items: [] },
    { key: "content", labelKey: "dimContent", items: [] },
    { key: "tier", labelKey: "dimTier", items: [] },
    { key: "device", labelKey: "dimDevice", items: [] },
    { key: "time", labelKey: "dimTime", items: [] },
    { key: "customer", labelKey: "dimCustomer", items: [] },
    { key: "coupon", labelKey: "dimCoupon", items: [] },
    { key: "touchpoint", labelKey: "dimTouch", items: [] },
];

const INIT_RULES = [];

const INIT_RECS = [];

function fmt(n) {
    if (!Number.isFinite(n)) return "—";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
    return String(n);
}

/* ═══════════════════════ TAB 1 ═══════════════════════════ */
function FunnelTab({ t }) {
    const { fmt } = useCurrency();
    const [selected, setSelected] = useState(null);
    const total = { imp: FUNNEL.reduce((s, d) => s + d.imp, 0), clicks: FUNNEL.reduce((s, d) => s + d.clicks, 0), cart: FUNNEL.reduce((s, d) => s + d.cart, 0), orders: FUNNEL.reduce((s, d) => s + d.orders, 0), spend: FUNNEL.reduce((s, d) => s + d.spend, 0) };

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="card card-glass">
                <SectionTitle>{t("marketingIntel.funnelTotal")}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 14 }}>
                    {[
                        { label: t("marketingIntel.funnelImp"), value: fmt(total.imp), color: "#6366f1" },
                        { label: t("marketingIntel.funnelClicks"), value: fmt(total.clicks), color: "#4f8ef7" },
                        { label: t("marketingIntel.funnelCart"), value: fmt(total.cart), color: "#eab308" },
                        { label: t("marketingIntel.funnelOrders"), value: fmt(total.orders), color: "#22c55e" },
                        { label: t("marketingIntel.funnelSpend"), value: fmt(total.spend), color: "#ef4444" },
                    ].map(k => (
                        <div key={k.label} style={{ padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: `1px solid ${k.color}22` }}>
                            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{k.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: k.color, marginTop: 3 }}>{k.value}</div>
                        </div>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--text-3)" }}>
                    <span>{t("marketingIntel.ctr")} <strong style={{ color: "#4f8ef7" }}>{pct(total.clicks, total.imp)}</strong></span>
                    <span>·</span>
                    <span>{t("marketingIntel.cartRate")} <strong style={{ color: "#eab308" }}>{pct(total.cart, total.clicks)}</strong></span>
                    <span>·</span>
                    <span>{t("marketingIntel.finalCvr")} <strong style={{ color: "#22c55e" }}>{pct(total.orders, total.clicks)}</strong></span>
                </div>
            </div>

            <div className="card card-glass">
                <SectionTitle>{t("marketingIntel.channelDetail")}</SectionTitle>
                <div style={{ display: "grid", gap: 10 }}>
                    {FUNNEL.map(d => {
                        const cvr = (d.orders / d.clicks) * 100;
                        const ctr = (d.clicks / d.imp) * 100;
                        const cartCvr = (d.orders / d.cart) * 100;
                        return (
                            <div key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)}
                                style={{ padding: 14, borderRadius: 12, background: "rgba(0,0,0,0.25)", border: `1px solid ${d.color}${selected?.id === d.id ? "66" : "18"}`, cursor: "pointer", transition: "all 150ms" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                        <span style={{ fontSize: 18 }}>{d.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: d.color }}>{d.name}</div>
                                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{t("marketingIntel.adSpend")} {fmt(d.spend)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ color: "var(--text-3)" }}>CTR</div>
                                            <div style={{ fontWeight: 700, color: ctr >= 2 ? "#22c55e" : "#eab308" }}>{ctr.toFixed(2)}%</div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ color: "var(--text-3)" }}>{t("marketingIntel.cvr")}</div>
                                            <div style={{ fontWeight: 700, color: cvr >= 8 ? "#22c55e" : cvr >= 4 ? "#4f8ef7" : "#eab308" }}>{cvr.toFixed(2)}%</div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ color: "var(--text-3)" }}>{t("marketingIntel.cartToBuy")}</div>
                                            <div style={{ fontWeight: 700, color: cartCvr >= 60 ? "#22c55e" : "#eab308" }}>{cartCvr.toFixed(1)}%</div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ color: "var(--text-3)" }}>ROAS</div>
                                            <div style={{ fontWeight: 700, color: d.orders * d.revenuePer / d.spend >= 3.5 ? "#22c55e" : "#eab308" }}>{(d.orders * d.revenuePer / d.spend).toFixed(2)}x</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                                    {[
                                        { label: t("marketingIntel.funnelImp"), val: d.imp, max: total.imp },
                                        { label: t("marketingIntel.funnelClicks"), val: d.clicks, max: total.clicks },
                                        { label: t("marketingIntel.funnelCart"), val: d.cart, max: total.cart },
                                        { label: t("marketingIntel.funnelOrders"), val: d.orders, max: total.orders },
                                    ].map(f => (
                                        <div key={f.label}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)", marginBottom: 3 }}>
                                                <span>{f.label}</span><span style={{ color: d.color }}>{pct(f.val, f.max)}</span>
                                            </div>
                                            <Bar pct={(f.val / f.max) * 100} color={d.color} />
                                        </div>
                                    ))}
                                </div>
                                {selected?.id === d.id && (
                                    <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, borderTop: `1px solid ${d.color}22` }}>
                                        {[
                                            { label: t("marketingIntel.cpc"), value: fmt(Math.round(d.spend / d.clicks)) },
                                            { label: t("marketingIntel.cpo"), value: fmt(Math.round(d.spend / d.orders)) },
                                            { label: t("marketingIntel.aov"), value: fmt(d.revenuePer) },
                                            { label: t("marketingIntel.totalRevContrib"), value: fmt(d.orders * d.revenuePer) },
                                            { label: t("marketingIntel.newCustPct"), value: d.newCustomerPct + "%" },
                                            { label: t("marketingIntel.mobileCvr"), value: d.mobileConvPct + "%" },
                                        ].map(s => (
                                            <div key={s.label} style={{ padding: "8px 10px", background: 'var(--surface)', borderRadius: 8 }}>
                                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{s.label}</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: d.color, marginTop: 2 }}>{s.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card card-glass">
                <SectionTitle>{t("marketingIntel.infFunnel")}</SectionTitle>
                <div style={{ overflowX: "auto" }}>
                    <table className="table" style={{ minWidth: 700 }}>
                        <thead>
                            <tr>
                                <th>{t("marketingIntel.creator")}</th><th>{t("marketingIntel.scale")}</th><th>{t("marketingIntel.reach")}</th><th>{t("marketingIntel.clicks")}</th><th>{t("marketingIntel.purchase")}</th>
                                <th>{t("marketingIntel.convRate")}</th><th>{t("marketingIntel.investment")}</th><th>{t("marketingIntel.roi")}</th><th>{t("marketingIntel.verdict")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {INF_FUNNEL.map(d => {
                                const ok = d.roi > 50; const warn = d.roi > 25;
                                const col = ok ? "#22c55e" : warn ? "#eab308" : "#ef4444";
                                return (
                                    <tr key={d.name}>
                                        <td style={{ fontWeight: 700, color: d.color }}>{d.name}</td>
                                        <td><Tag label={d.tier} color={d.color} /></td>
                                        <td>{fmt(d.reach)}</td>
                                        <td>{fmt(d.clicks)}</td>
                                        <td>{d.orders.toLocaleString()}</td>
                                        <td style={{ color: d.conv >= 4 ? "#22c55e" : d.conv >= 2 ? "#eab308" : "#ef4444", fontWeight: 700 }}>{d.conv.toFixed(2)}%</td>
                                        <td>{fmt(d.spend)}</td>
                                        <td style={{ fontWeight: 800, color: col }}>{d.roi}x</td>
                                        <td><Tag label={ok ? t("marketingIntel.verdictGood") : warn ? t("marketingIntel.verdictOk") : t("marketingIntel.verdictBad")} color={col} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════ TAB 2 ═══════════════════════════ */
function KpiTab({ t }) {
    const [selDim, setSelDim] = useState("channel");
    const dim = CONTRIB_DIMENSIONS_KEYS.find(d => d.key === selDim);

    const channelScores = FUNNEL.map(d => {
        const scores = STD_KPIS.filter(k => k.id !== "inf_roi").map(k => {
            const raw = k.calc(d);
            let score = k.invert ? Math.max(0, 100 - (raw / k.target) * 50) : Math.min(100, (raw / k.target) * 100);
            score = Math.round(Math.max(0, Math.min(100, score)));
            return { ...k, raw, score };
        });
        const total = Math.round(scores.reduce((s, k) => s + k.score * (k.weight / 100), 0));
        return { ...d, kpiScores: scores, totalScore: total, grade: gradeOf(total) };
    });

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="card card-glass">
                <SectionTitle>{t("marketingIntel.kpiTotal")}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                    {channelScores.map(c => (
                        <div key={c.id} style={{ padding: 16, borderRadius: 14, background: `${c.color}08`, border: `1px solid ${c.color}22`, textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><ScoreBadge score={c.totalScore} size={56} /></div>
                            <div style={{ fontWeight: 800, color: c.color, fontSize: 13, marginBottom: 4 }}>{c.name}</div>
                            <GradeBadge grade={c.grade} />
                            <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                                {c.kpiScores.slice(0, 4).map(k => (
                                    <div key={k.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                                        <span style={{ color: "var(--text-3)" }}>{k.name.split(" ")[0]}</span>
                                        <span style={{ color: scoreColor(k.score), fontWeight: 700 }}>{k.score}점</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card card-glass">
                <SectionTitle>{t("marketingIntel.kpiTable")}</SectionTitle>
                <div style={{ overflowX: "auto" }}>
                    <table className="table" style={{ minWidth: 800 }}>
                        <thead>
                            <tr>
                                <th>{t("marketingIntel.kpiMetric")}</th><th>{t("marketingIntel.kpiCat")}</th><th>{t("marketingIntel.kpiWeight")}</th>
                                {FUNNEL.map(d => <th key={d.id} style={{ color: d.color }}>{d.name.split(" ")[0]}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {STD_KPIS.filter(k => k.id !== "inf_roi").map(k => (
                                <tr key={k.id}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: 12 }}>{k.name}</div>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{k.desc}</div>
                                    </td>
                                    <td><Tag label={k.cat} color="#6366f1" /></td>
                                    <td style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>{k.weight}%</td>
                                    {FUNNEL.map(d => {
                                        const raw = k.calc(d);
                                        let score = k.invert ? Math.max(0, 100 - (raw / k.target) * 50) : Math.min(100, (raw / k.target) * 100);
                                        score = Math.round(Math.max(0, Math.min(100, score)));
                                        return (
                                            <td key={d.id} style={{ color: scoreColor(score), fontWeight: 700 }}>
                                                <div>{k.format(raw)}</div>
                                                <div style={{ fontSize: 10 }}>{score}점</div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card card-glass">
                <SectionTitle>{t("marketingIntel.kpiContrib")}</SectionTitle>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    {CONTRIB_DIMENSIONS_KEYS.map(d => (
                        <button key={d.key} onClick={() => setSelDim(d.key)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: selDim === d.key ? "#4f8ef7" : "rgba(255,255,255,0.07)", color: selDim === d.key ? "#fff" : "var(--text-2)" }}>{t(`marketingIntel.${d.labelKey}`)}</button>
                    ))}
                </div>
                {dim && (
                    <div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>{t("marketingIntel.kpiContribSub", { dim: t(`marketingIntel.${dim.labelKey}`) })}</div>
                        <div style={{ display: "grid", gap: 8 }}>
                            {dim.items.map((item, i) => (
                                <div key={i}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                        <span style={{ fontWeight: 700, color: '#fff' }}>{item.name}</span>
                                        <span style={{ fontWeight: 800, color: item.color }}>{item.value}%</span>
                                    </div>
                                    <Bar pct={item.value} color={item.color} h={7} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════ TAB 3 ═══════════════════════════ */
function AITab({ t }) {
    const [recs, setRecs] = useState(INIT_RECS);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);

    const runAI = useCallback(async () => {
        setLoading(true);
        try {
            const payload = {
                channels: FUNNEL.map(d => ({ name: d.name, spend: d.spend, clicks: d.clicks, orders: d.orders, roas: (d.orders * d.revenuePer / d.spend).toFixed(2), cvr: ((d.orders / d.clicks) * 100).toFixed(2) })),
                influencers: INF_FUNNEL.map(d => ({ name: d.name, tier: d.tier, roi: d.roi, conv: d.conv })),
                contribution: CONTRIB_DIMENSIONS_KEYS.map(d => ({ dimension: d.key, breakdown: d.items })),
            };
            const resp = await fetch("/v422/ai/marketing-intelligence", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: payload }),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            if (json.ok && json.result?.recommendations) setRecs(json.result.recommendations);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="card card-glass" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px" }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{t("marketingIntel.aiEngine")}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t("marketingIntel.aiEngineDesc")}</div>
                </div>
                <button onClick={runAI} disabled={loading} style={{ padding: "8px 20px", borderRadius: 10, background: loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg,#6366f1,#4f8ef7)", border: "none", color: '#fff', fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{loading ? t("marketingIntel.analyzing") : t("marketingIntel.runAI")}</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
                {recs.map((rec, i) => (
                    <div key={rec.id} style={{ borderRadius: 14, border: `1px solid ${rec.color}25`, background: `${rec.color}06`, overflow: "hidden" }}>
                        <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
                            onClick={() => setExpanded(expanded === rec.id ? null : rec.id)}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>#{i + 1}</span>
                                    <Tag label={rec.category} color={rec.color} />
                                    <Tag label={t("marketingIntel.confLabel", { n: rec.confidence })} color={rec.confidence >= 85 ? "#22c55e" : rec.confidence >= 70 ? "#eab308" : "#ef4444"} />
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', marginBottom: 6 }}>{rec?.title}</div>
                                <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                                    <span style={{ color: rec.color }} >{t("marketingIntel.expRoas")} <strong>{rec.expectedROAS}</strong></span>
                                    <span style={{ color: "var(--text-2)" }} >{t("marketingIntel.effort")} <strong>{rec.effort}</strong></span>
                                </div>
                            </div>
                            <span style={{ fontSize: 12, color: "var(--text-3)", flexShrink: 0, marginLeft: 12 }}>{expanded === rec.id ? "▲" : "▼"}</span>
                        </div>
                        {expanded === rec.id && (
                            <div style={{ borderTop: `1px solid ${rec.color}18`, padding: "14px 18px", display: "grid", gap: 12 }}>
                                <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{t("marketingIntel.reasonLabel")} {rec.reason}</div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("marketingIntel.actionLabel")}</div>
                                    {rec.actions.map((a, j) => (
                                        <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6, fontSize: 12 }}>
                                            <span style={{ color: rec.color, fontWeight: 900, flexShrink: 0 }}>{j + 1}.</span>
                                            <span style={{ color: '#fff' }}>{a}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════ TAB 4 ═══════════════════════════ */
function AutoTab({ t }) {
    const [rules, setRules] = useState(INIT_RULES);
    const [log, setLog] = useState([]);

    const approve = useCallback((id) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, status: "approved" } : r));
        const rule = INIT_RULES.find(r => r.id === id);
        setLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `${t("marketingIntel.logApproved")} ${rule?.name}`, color: "#22c55e" }, ...prev.slice(0, 9)]);
    }, [t]);

    const reject = useCallback((id) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
        const rule = INIT_RULES.find(r => r.id === id);
        setLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `${t("marketingIntel.logRejected")} ${rule?.name}`, color: "#ef4444" }, ...prev.slice(0, 9)]);
    }, [t]);

    const execute = useCallback((id) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, status: "active" } : r));
        const rule = rules.find(r => r.id === id);
        setLog(prev => [{ time: new Date().toLocaleTimeString(), msg: `${t("marketingIntel.logExecuted")} ${rule?.name}`, color: "#4f8ef7" }, ...prev.slice(0, 9)]);
    }, [rules, t]);

    const statusCfg = {
        pending: { color: "#eab308", label: t("marketingIntel.statusPending") },
        approved: { color: "#4f8ef7", label: t("marketingIntel.statusApproved") },
        active: { color: "#22c55e", label: t("marketingIntel.statusActive") },
        rejected: { color: "#ef4444", label: t("marketingIntel.statusRejected") },
    };

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {Object.entries(statusCfg).map(([k, v]) => {
                    const cnt = rules.filter(r => r.status === k).length;
                    return (
                        <div key={k} style={{ padding: "12px 14px", borderRadius: 12, background: `${v.color}08`, border: `1px solid ${v.color}22`, textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: v.color }}>{cnt}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{v.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="card card-glass">
                <SectionTitle>{t("marketingIntel.autoRules")}</SectionTitle>
                <div style={{ display: "grid", gap: 10 }}>
                    {rules.map(r => {
                        const sc = statusCfg[r.status];
                        const riskCol = r.risk === "low" ? "#22c55e" : r.risk === "medium" ? "#eab308" : "#ef4444";
                        return (
                            <div key={r.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(0,0,0,0.25)", border: `1px solid ${sc.color}22` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                                            <Tag label={sc.label} color={sc.color} />
                                            <Tag label={r.channel} color="#6366f1" />
                                            <Tag label={`Risk도: ${r.risk}`} color={riskCol} />
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 4 }}>{r.name}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                                            <span>{t("marketingIntel.trigger")}: {r.trigger}</span>
                                            <span style={{ margin: "0 8px" }}>·</span>
                                            <span>{t("marketingIntel.action")}: {r.action}</span>
                                        </div>
                                        <div style={{ fontSize: 11, marginTop: 4 }}>
                                            <span style={{ color: "#22c55e" }}>{t("marketingIntel.effect")}: {r.savings}</span>
                                            <span style={{ margin: "0 8px", color: "var(--text-3)" }}>·</span>
                                            <span style={{ color: "#4f8ef7" }} >{t("marketingIntel.confidence")}: <strong>{r.confidence}%</strong></span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 }}>
                                        {r.status === "pending" && <>
                                            <button onClick={() => approve(r.id)} style={{ padding: "5px 12px", borderRadius: 8, background: "#22c55e22", border: "1px solid #22c55e44", color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t("marketingIntel.approve")}</button>
                                            <button onClick={() => reject(r.id)} style={{ padding: "5px 12px", borderRadius: 8, background: "#ef444422", border: "1px solid #ef444444", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t("marketingIntel.reject")}</button>
                                        </>}
                                        {r.status === "approved" && (
                                            <button onClick={() => execute(r.id)} style={{ padding: "5px 14px", borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", border: "none", color: '#fff', fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t("marketingIntel.execute")}</button>
                                        )}
                                        {r.status === "active" && <Tag label={t("marketingIntel.running")} color="#22c55e" />}
                                        {r.status === "rejected" && <Tag label={t("marketingIntel.rejected")} color="#ef4444" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {log.length > 0 && (
                <div className="card card-glass">
                    <SectionTitle>{t("marketingIntel.execLog")}</SectionTitle>
                    <div style={{ display: "grid", gap: 6 }}>
                        {log.map((l, i) => (
                            <div key={i} style={{ fontSize: 11, color: l.color, display: "flex", gap: 10 }}>
                                <span style={{ color: "var(--text-3)", minWidth: 60 }}>{l.time}</span>
                                <span>{l.msg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════ MAIN ═══════════════════════════ */
export default function MarketingIntelligence() {
    const { fmt } = useCurrency();
    const t = useT();
    const [tab, setTab] = useState("funnel");
    const totalSpend = FUNNEL.reduce((s, d) => s + d.spend, 0);
    const totalOrders = FUNNEL.reduce((s, d) => s + d.orders, 0);
    const totalRev = FUNNEL.reduce((s, d) => s + d.orders * d.revenuePer, 0);

    const TABS = [
        { id: "funnel", label: t("marketingIntel.tabFunnel"), desc: t("marketingIntel.tabFunnelDesc") },
        { id: "kpi", label: t("marketingIntel.tabKpi"), desc: t("marketingIntel.tabKpiDesc") },
        { id: "ai", label: t("marketingIntel.tabAi"), desc: t("marketingIntel.tabAiDesc") },
        { id: "auto", label: t("marketingIntel.tabAuto"), desc: t("marketingIntel.tabAutoDesc") },
    ];

    return (
        <div style={{ display: "grid", gap: 18, padding: 4 }}>
            <div className="hero fade-up">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div className="hero-title grad-blue-purple">{t("marketingIntel.pageTitle")}</div>
                        <div className="hero-desc">{t("marketingIntel.pageSub")}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <span className="badge badge-blue">{t("marketingIntel.badge4ch")}</span>
                            <span className="badge badge-purple">{t("marketingIntel.badge5inf")}</span>
                            <span className="badge badge-teal">{t("marketingIntel.badge20kpi")}</span>
                            <span className="badge" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>{t("marketingIntel.badgeAiRec", { n: INIT_RECS.length })}</span>
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t("marketingIntel.todayAdSpend")}</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: "#4f8ef7", letterSpacing: "-0.5px" }}>{fmt(totalSpend)}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                            {t("marketingIntel.summaryOrders", { n: totalOrders.toLocaleString(), rev: fmt(Math.round(totalRev)), roas: (totalRev / totalSpend).toFixed(2) })}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 6, padding: "6px", background: "rgba(0,0,0,0.25)", borderRadius: 14, flexWrap: "wrap" }}>
                {TABS.map(tab_item => (
                    <button key={tab_item.id} onClick={() => setTab(tab_item.id)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: tab === tab_item.id ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: tab === tab_item.id ? "#fff" : "var(--text-2)", transition: "all 150ms" }}>
                        <div>{tab_item.label}</div>
                        <div style={{ fontSize: 9, fontWeight: 400, color: tab === tab_item.id ? "rgba(255,255,255,0.7)" : "var(--text-3)", marginTop: 1 }}>{tab_item.desc}</div>
                    </button>
                ))}
            </div>

            {tab === "funnel" && <FunnelTab t={t} />}
            {tab === "kpi" && <KpiTab t={t} />}
            {tab === "ai" && <AITab t={t} />}
            {tab === "auto" && <AutoTab t={t} />}
        </div>
    );
}

import { useI18n } from '../i18n/index.js';