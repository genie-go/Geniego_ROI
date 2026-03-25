import React, { useState, useEffect, useMemo } from "react";
import { useI18n } from "../i18n";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useAuth } from "../auth/AuthContext.jsx";


/* ─── Shared utils ────────────────────────────────────────────── */
const fmtKRW = v => v == null ? "—" : "₩" + Number(v).toLocaleString("ko-KR");
const fmtUSD = v => v == null ? "—" : "$" + Number(v).toLocaleString("en-US", { minimumFractionDigits: 0 });
const fmtM = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(v);
const pct = v => (Number(v) * 100).toFixed(1) + "%";
const round2 = v => Number(v).toFixed(2);

const EXCHANGE = { USD: 1330, JPY: 8.8, EUR: 1450, CNY: 183 };
const toKRW = (v, cur) => Math.round(v * (EXCHANGE[cur] || 1));

/* ─── Shared components ──────────────────────────────────────── */
function KpiCard({ label, value, sub, color = "#4f8ef7", icon }) {
    return (
        <div className="kpi-card" style={{ "--accent": color }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="kpi-label">{label}</div>
                {icon && <span style={{ fontSize: 20, opacity: .8 }}>{icon}</span>}
            </div>
            <div className="kpi-value" style={{ color, fontSize: 22, marginTop: 6 }}>{value}</div>
            {sub && <div className="kpi-sub" style={{ marginTop: 4, fontSize: 10 }}>{sub}</div>}
        </div>
    );
}

function MiniBar({ value, max, color = "#4f8ef7" }) {
    return (
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, width: "100%" }}>
            <div style={{
                width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", background: color, borderRadius: 4,
                transition: "width 0.5s cubic-bezier(.4,0,.2,1)"
            }} />
        </div>
    );
}

/* ─── Performance Tab ────────────────────────────────────────── */
const FUNNEL_STAGES = ["impressions", "clicks", "carts", "orders"];
const FUNNEL_LABELS = { impressions: "Impressions", clicks: "Clicks", carts: "Cart Adds", orders: "Purchases" };

function PerformanceTab() {
    const { t } = useI18n();
    const { hasMenuAccess, token } = useAuth();
    const [sort, setSort] = useState("revenue");
    const [team, setTeam] = useState("All");
    const [account, setAccount] = useState("All");
    const [summary, setSummary] = useState([]);

    const isMultiTeamAllowed = hasMenuAccess ? hasMenuAccess("analytics||multi_team_analysis") : true;

    useEffect(() => {
        const filters = {};
        if (team !== "All") filters.team = team;
        if (account !== "All") filters.account = account;
        
        const qs = new URLSearchParams(filters).toString();
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        fetch(`/api/v1/ad-performance/summary?${qs}`, { headers })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSummary(data);
                } else {
                    console.error("Expected array, got:", data);
                    setSummary([]);
                }
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setSummary([]);
            });
    }, [team, account, token]);

    const teams = ["All", "USA", "Japan", "Europe"];
    const accounts = useMemo(() => {
        if (team === "All") return ["All"];
        if (team === "USA") return ["All", "usa_meta_001", "usa_tiktok_002", "usa_amzn_003"];
        if (team === "Japan") return ["All", "japan_meta_001", "japan_tiktok_002", "japan_amzn_003"];
        if (team === "Europe") return ["All", "europe_meta_001", "europe_tiktok_002", "europe_amzn_003"];
        return ["All"];
    }, [team]);

    const CHANNELS_PERF = useMemo(() => {
        const channels = [
            { id: "meta", name: "Meta", icon: "📱", color: "#1877f2" },
            { id: "tiktok", name: "TikTok", icon: "🎵", color: "#ff0050" },
            { id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900" }
        ];
        if (!Array.isArray(summary)) return channels.map(ch => ({ ...ch, impressions: 0, clicks: 0, carts: 0, orders: 0, revenue: 0, adSpend: 0, ctr: 0, cvr: 0, roas: 0, acos: 0 }));

        return channels.map(ch => {
            const s = summary.find(i => i.channel?.toLowerCase() === ch.id) || {};
            const rev = Number(s.revenue || 0);
            const spend = Number(s.spend || 0);
            return {
                ...ch,
                impressions: Number(s.impressions || 0),
                clicks: Number(s.clicks || 0),
                carts: Math.round(Number(s.clicks || 0) * 0.15),
                orders: Number(s.conversions || 0),
                revenue: rev,
                adSpend: spend,
                ctr: s.impressions ? s.clicks / s.impressions : 0,
                cvr: s.clicks ? s.conversions / s.clicks : 0,
                roas: spend ? rev / spend : 0,
                acos: rev ? spend / rev : 0
            };
        });
    }, [summary]);


    const totals = useMemo(() => CHANNELS_PERF.reduce((acc, c) => ({
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        carts: acc.carts + c.carts,
        orders: acc.orders + c.orders,
        revenue: acc.revenue + c.revenue,
        adSpend: acc.adSpend + c.adSpend,
    }), { impressions: 0, clicks: 0, carts: 0, orders: 0, revenue: 0, adSpend: 0 }), [CHANNELS_PERF]);

    totals.roas = totals.adSpend ? totals.revenue / totals.adSpend : 0;
    totals.acos = totals.revenue ? totals.adSpend / totals.revenue : 0;

    const sorted = [...CHANNELS_PERF].sort((a, b) => b[sort] - a[sort]);

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div className="card card-glass" style={{ padding: "12px 20px", display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: isMultiTeamAllowed ? 1 : 0.5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t("performance.team")}:</span>
                    <select value={team} onChange={e => { setTeam(e.target.value); setAccount("All"); }} disabled={!isMultiTeamAllowed} style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6,
                        color: "var(--text-1)", fontSize: 11, padding: "4px 8px", cursor: isMultiTeamAllowed ? "pointer" : "not-allowed"
                    }}>
                        {teams.map(t_id => <option key={t_id} value={t_id}>{t_id === "All" ? t("performance.allTeams") : t_id}</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: isMultiTeamAllowed ? 1 : 0.5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>{t("performance.account")}:</span>
                    <select value={account} onChange={e => setAccount(e.target.value)} disabled={!isMultiTeamAllowed} style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 6,
                        color: "var(--text-1)", fontSize: 11, padding: "4px 8px", cursor: isMultiTeamAllowed ? "pointer" : "not-allowed"
                    }}>
                        {accounts.map(a_id => <option key={a_id} value={a_id}>{a_id === "All" ? t("performance.allAccounts") : a_id}</option>)}
                    </select>
                    {!isMultiTeamAllowed && <span style={{ fontSize: 10, color: "var(--accent)" }}>🔒 {t("demo.upgradeLabel")}</span>}
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
                <KpiCard label={t('performance.totalImpressions')} value={fmtM(totals.impressions)} color="#a855f7" icon="👁" sub={t('performance.teamSpecificTotal')} />
                <KpiCard label={t('performance.totalClicks')} value={fmtM(totals.clicks)} color="#4f8ef7" icon="🖱" sub={`CTR ${pct(totals.clicks / (totals.impressions || 1))}`} />
                <KpiCard label={t('performance.cartAdds')} value={fmtM(totals.carts)} color="#14d9b0" icon="🛒" sub={`Click→Cart ${pct(totals.carts / (totals.clicks || 1))}`} />
                <KpiCard label={t('performance.purchases')} value={fmtM(totals.orders)} color="#22c55e" icon="✅" sub={`CVR ${pct(totals.orders / (totals.clicks || 1))}`} />
                <KpiCard label={t('performance.totalRevenue')} value={"₩" + fmtM(totals.revenue)} color="#f97316" icon="💰" sub={t('performance.adAttributedRevenue')} />
                <KpiCard label={t('performance.roas')} value={round2(totals.roas) + "x"} color="#eab308" icon="📈"
                    sub={`ACOS ${pct(totals.acos)}`} />
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>{t('performance.conversionFunnel')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                    {FUNNEL_STAGES.map((stage, si) => {
                        const max = Math.max(...CHANNELS_PERF.map(c => c[stage]), 1);
                        return (
                            <div key={stage}>
                                <div style={{
                                    fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 8,
                                    textTransform: "uppercase", letterSpacing: "0.8px"
                                }}>{FUNNEL_LABELS[stage]}</div>
                                <div style={{ display: "grid", gap: 6 }}>
                                    {CHANNELS_PERF.map(ch => (
                                        <div key={ch.id}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                                <span style={{ fontSize: 10, color: "var(--text-2)" }}>{ch.icon} {ch.name}</span>
                                                <span style={{ fontSize: 10, fontFamily: "monospace", color: ch.color, fontWeight: 700 }}>
                                                    {fmtM(ch[stage])}
                                                </span>
                                            </div>
                                            <MiniBar value={ch[stage]} max={max} color={ch.color} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t('performance.channelPerfDetail')}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {[["revenue", "Revenue"], ["roas", "ROAS"], ["orders", "Orders"], ["acos", "ACOS"]].map(([k, l]) => (
                            <button key={k} onClick={() => setSort(k)} style={{
                                padding: "3px 10px", borderRadius: 6, border: "1px solid",
                                borderColor: sort === k ? "#4f8ef7" : "var(--border)",
                                background: sort === k ? "rgba(79,142,247,0.15)" : "transparent",
                                color: sort === k ? "#4f8ef7" : "var(--text-3)", fontSize: 10, cursor: "pointer", fontWeight: 700,
                            }}>{l}</button>
                        ))}
                    </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('performance.channel')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.impressions')}</th>
                                <th style={{ textAlign: "right" }}>Clicks (CTR)</th>
                                <th style={{ textAlign: "right" }}>{t('performance.cartAdds')}</th>
                                <th style={{ textAlign: "right" }}>Purchases (CVR)</th>
                                <th style={{ textAlign: "right" }}>{t('performance.revenue')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.adSpend')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.roas')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.acos')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(ch => (
                                <tr key={ch.id}>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, display: "inline-block" }} />
                                            <span style={{ fontWeight: 700 }}>{ch.icon} {ch.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmtM(ch.impressions)}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <div style={{ fontFamily: "monospace" }}>{fmtM(ch.clicks)}</div>
                                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>{pct(ch.ctr)}</div>
                                    </td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmtM(ch.carts)}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <div style={{ fontFamily: "monospace" }}>{fmtM(ch.orders)}</div>
                                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>{pct(ch.cvr)}</div>
                                    </td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#f97316" }}>{fmtM(ch.revenue)}</td>
                                    <td style={{ textAlign: "right", fontFamily: "monospace", color: "#ef4444" }}>{fmtM(ch.adSpend)}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <span style={{ fontWeight: 800, color: ch.roas >= 2 ? "#22c55e" : ch.roas >= 1 ? "#eab308" : "#ef4444" }}>
                                            {round2(ch.roas)}x
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "right" }}>
                                        <span style={{ fontWeight: 700, color: ch.acos <= 0.4 ? "#22c55e" : ch.acos <= 0.6 ? "#eab308" : "#ef4444" }}>
                                            {pct(ch.acos)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: "2px solid rgba(99,140,255,0.2)", background: "rgba(79,142,247,0.04)" }}>
                                <td style={{ fontWeight: 800, fontSize: 11 }}>{t('performance.totalAvg')}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.impressions)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.clicks)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.carts)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmtM(totals.orders)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#f97316" }}>{fmtM(totals.revenue)}</td>
                                <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#ef4444" }}>{fmtM(totals.adSpend)}</td>
                                <td style={{ textAlign: "right", fontWeight: 800, color: "#22c55e" }}>{round2(totals.roas)}x</td>
                                <td style={{ textAlign: "right", fontWeight: 800, color: "#22c55e" }}>{pct(totals.acos)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

function Trend({ v }) {
    const up = v > 0;
    return (
        <div style={{ fontSize: 9, color: up ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
            {up ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%
        </div>
    );
}


/* ═══════════════════════════════════════════════════════════════
   TAB 2: Settlement Dashboard (Settlement Dashboard)
═══════════════════════════════════════════════════════════════ */
const FX_RATES = [
    { cur: "USD", rate: 1330, prev: 1298, flag: "🇺🇸" },
    { cur: "JPY", rate: 8.8, prev: 9.1, flag: "🇯🇵" },
    { cur: "EUR", rate: 1450, prev: 1410, flag: "🇪🇺" },
    { cur: "CNY", rate: 183, prev: 179, flag: "🇨🇳" },
];

const SETTLE_CHANNELS = [
    {
        id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48", currency: "USD",
        grossSales: 158000, platformFee: 4740, adFee: 15800, paymentFee: 4582, refund: 6320, netPayout: 126558
    },
    {
        id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900", currency: "USD",
        grossSales: 224000, platformFee: 33600, adFee: 22400, paymentFee: 0, refund: 8960, netPayout: 159040
    },
    {
        id: "coupang", name: "Coupang", icon: "🇰🇷", color: "#00bae5", currency: "KRW",
        grossSales: 280800000, platformFee: 30688000, adFee: 28080000, paymentFee: 0, refund: 11232000, netPayout: 210800000
    },
    {
        id: "naver", name: "Naver", icon: "🟢", color: "#03c75a", currency: "KRW",
        grossSales: 145200000, platformFee: 7986000, adFee: 14520000, paymentFee: 4356000, refund: 5808000, netPayout: 112530000
    },
    {
        id: "tiktok", name: "TikTok", icon: "🎵", color: "#ff0050", currency: "USD",
        grossSales: 67000, platformFee: 8040, adFee: 25000, paymentFee: 2010, refund: 2680, netPayout: 29270
    },
    {
        id: "11st", name: "11Street", icon: "🏬", color: "#ff0000", currency: "KRW",
        grossSales: 56000000, platformFee: 5600000, adFee: 5040000, paymentFee: 1120000, refund: 2240000, netPayout: 42000000
    },
];

function SettlementTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [baseCur, setBaseCur] = useState("KRW");

    // Convert all to KRW for totals
    const toBase = (v, cur) => cur === "KRW" ? v : toKRW(v, cur);

    const totals = {
        grossSales: SETTLE_CHANNELS.reduce((s, c) => s + toBase(c.grossSales, c.currency), 0),
        platformFee: SETTLE_CHANNELS.reduce((s, c) => s + toBase(c.platformFee, c.currency), 0),
        adFee: SETTLE_CHANNELS.reduce((s, c) => s + toBase(c.adFee, c.currency), 0),
        paymentFee: SETTLE_CHANNELS.reduce((s, c) => s + toBase(c.paymentFee, c.currency), 0),
        refund: SETTLE_CHANNELS.reduce((s, c) => s + toBase(c.refund, c.currency), 0),
        netPayout: SETTLE_CHANNELS.reduce((s, c) => s + toBase(c.netPayout, c.currency), 0),
    };
    const netRate = totals.netPayout / totals.grossSales;
    const totalDeductions = totals.platformFee + totals.adFee + totals.paymentFee + totals.refund;

    // Deduction breakdown for pie-style display
    const deductions = [
        { label: "Platform Fee", value: totals.platformFee, color: "#ef4444" },
        { label: "Ad Spend", value: totals.adFee, color: "#f97316" },
        { label: "Payment Fee", value: totals.paymentFee, color: "#eab308" },
        { label: "Refund/Return", value: totals.refund, color: "#a855f7" },
    ];

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* FX Rates */}
            <div className="card card-glass" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>💱 Live FX Rates (base: KRW)</div>
                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>As of 2026-03-04 17:50</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {FX_RATES.map(fx => {
                        const chg = ((fx.rate - fx.prev) / fx.prev) * 100;
                        return (
                            <div key={fx.cur} style={{
                                padding: "10px 14px", borderRadius: 12,
                                background: "rgba(9,15,30,0.6)", border: "1px solid rgba(99,140,255,0.08)", textAlign: "center"
                            }}>
                                <div style={{ fontSize: 16, marginBottom: 4 }}>{fx.flag}</div>
                                <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-1)" }}>
                                    {fx.rate < 100 ? fx.rate.toFixed(1) : fx.rate.toLocaleString()}
                                </div>
                                <div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 3 }}>1 {fx.cur} = ₩{fx.rate < 100 ? fx.rate.toFixed(1) : fx.rate.toLocaleString()}</div>
                                <Trend v={chg} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label="Total Revenue (KRW)" value={"₩" + fmtM(totals.grossSales)} color="#4f8ef7" icon="💰" />
                <KpiCard label={t('performance.platformFee')} value={"₩" + fmtM(totals.platformFee)} color="#ef4444" icon="🏪"
                    sub={pct(totals.platformFee / totals.grossSales)} />
                <KpiCard label={t('performance.adSpend')} value={"₩" + fmtM(totals.adFee)} color="#f97316" icon="📣"
                    sub={pct(totals.adFee / totals.grossSales)} />
                <KpiCard label={t('performance.totalDeductions')} value={"₩" + fmtM(totalDeductions)} color="#a855f7" icon="📉"
                    sub={pct(totalDeductions / totals.grossSales)} />
                <KpiCard label={t('performance.netSettlement')} value={"₩" + fmtM(totals.netPayout)} color="#22c55e" icon="✅"
                    sub={`Effective rate ${pct(netRate)}`} />
            </div>

            {/* Deduction breakdown bar */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{t('performance.deductionBreakdown')}</div>
                <div style={{ display: "flex", height: 18, borderRadius: 9, overflow: "hidden", marginBottom: 14 }}>
                    {deductions.map((d, i) => (
                        <div key={d.label} style={{ flex: d.value, background: d.color, position: "relative" }}
                            title={`${d.label}: ₩${fmtM(d.value)}`} />
                    ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {deductions.map(d => (
                        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{d.label}</div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-1)" }}>₩{fmtM(d.value)}</div>
                                <div style={{ fontSize: 9, color: d.color }}>{pct(d.value / totals.grossSales)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Per-channel table */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{t('performance.settleByChannel')}</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('performance.channel')}</th>
                                <th style={{ textAlign: "center" }}>{t('performance.currency')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.grossSales')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.platformFee')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.adSpend')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.paymentFee')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.refundReturn')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.netPayout')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.krwEquiv')}</th>
                                <th style={{ textAlign: "right" }}>{t('performance.settleRate')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SETTLE_CHANNELS.map(ch => {
                                const kr = toBase(ch.netPayout, ch.currency);
                                const rate = ch.netPayout / ch.grossSales;
                                const fmt = v => ch.currency === "KRW" ? "₩" + fmtM(v) : "$" + fmtM(v);
                                return (
                                    <tr key={ch.id}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ch.color, display: "inline-block" }} />
                                                <span style={{ fontWeight: 700 }}>{ch.icon} {ch.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <span style={{
                                                fontFamily: "monospace", fontSize: 10, padding: "2px 6px", borderRadius: 4,
                                                background: "rgba(99,140,255,0.1)", border: "1px solid rgba(99,140,255,0.15)"
                                            }}>{ch.currency}</span>
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(ch.grossSales)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#ef4444" }}>{fmt(ch.platformFee)}<br />
                                            <span style={{ fontSize: 9, color: "var(--text-3)" }}>{pct(ch.platformFee / ch.grossSales)}</span>
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#f97316" }}>{fmt(ch.adFee)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#eab308" }}>{fmt(ch.paymentFee)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#a855f7" }}>{fmt(ch.refund)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 800, color: "#22c55e" }}>{fmt(ch.netPayout)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--text-2)" }}>₩{fmtM(kr)}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <span style={{ fontWeight: 700, color: rate >= 0.8 ? "#22c55e" : rate >= 0.7 ? "#eab308" : "#ef4444" }}>
                                                {pct(rate)}
                                            </span>
                                        </td>
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

/* ═══════════════════════════════════════════════════════════════
   TAB 3: Creator Settlement (Creator Settlement)
═══════════════════════════════════════════════════════════════ */
const CREATORS = [
    {
        id: "C001", handle: "@tech_unboxing_kr", name: "Tech Unboxing", platform: "youtube", tier: "Micro",
        contractRate: 350000, orders: 342, revenue: 41040000, attribution: 0.82, status: "active",
        rightsExpiry: "2026-09-01", contractEnd: "2026-12-31",
        content: [
            { title: "WH-1000XM5 Review", views: 89000, orders: 187, revenue: 22400000, attrib: 0.87 },
            { title: "RGB Keyboard Comparison", views: 42000, orders: 155, revenue: 18600000, attrib: 0.76 },
        ]
    },
    {
        id: "C002", handle: "@daily_gadget_life", name: "Daily Gadget", platform: "instagram", tier: "Mid",
        contractRate: 800000, orders: 218, revenue: 26160000, attribution: 0.71, status: "active",
        rightsExpiry: "2026-06-15", contractEnd: "2026-06-15",
        content: [
            { title: "4K Webcam Unboxing", views: 156000, orders: 130, revenue: 15600000, attrib: 0.74 },
            { title: "Home Office Setup", views: 98000, orders: 88, revenue: 10560000, attrib: 0.68 },
        ]
    },
    {
        id: "C003", handle: "@tiktok_techvibe", name: "TechVibe", platform: "tiktok", tier: "Macro",
        contractRate: 2000000, orders: 890, revenue: 89000000, attribution: 0.91, status: "active",
        rightsExpiry: "2025-12-31", contractEnd: "2026-08-31",
        content: [
            { title: "Noise-Cancel Headphone Challenge", views: 1200000, orders: 510, revenue: 51000000, attrib: 0.94 },
            { title: "USB Hub Tips", views: 780000, orders: 380, revenue: 38000000, attrib: 0.88 },
        ]
    },
    {
        id: "C004", handle: "@camgear_review", name: "CamGear Review", platform: "youtube", tier: "Nano",
        contractRate: 150000, orders: 67, revenue: 8690000, attribution: 0.63, status: "expired",
        rightsExpiry: "2026-02-28", contractEnd: "2026-03-31",
        content: [
            { title: "Budget Webcams Roundup", views: 31000, orders: 67, revenue: 8690000, attrib: 0.63 },
        ]
    },
];

const TIER_COLOR = { Nano: "#14d9b0", Micro: "#4f8ef7", Mid: "#a855f7", Macro: "#f97316" };
const PLATFORM_ICO = { youtube: "▶", instagram: "📸", tiktok: "🎵" };

const today = new Date("2026-03-04");
const daysLeft = d => Math.ceil((new Date(d) - today) / (1000 * 60 * 60 * 24));

function CreatorTab() {
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(null);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);

    const totPayout = CREATORS.reduce((s, c) => s + c.contractRate, 0);
    const totRevenue = CREATORS.reduce((s, c) => s + c.revenue, 0);
    const totOrders = CREATORS.reduce((s, c) => s + c.orders, 0);
    const avgAttrib = CREATORS.reduce((s, c) => s + c.attribution, 0) / CREATORS.length;
    const expiredSoon = CREATORS.filter(c => daysLeft(c.rightsExpiry) <= 90 && c.status !== "expired").length;

    const openSettle = c => { setSelected(c); setModal("settle"); };

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label={t('performance.totalCreators')} value={CREATORS.length + " people"} color="#4f8ef7" icon="👤" />
                <KpiCard label={t('performance.totalPayoutEst')} value={"₩" + fmtM(totPayout)} color="#a855f7" icon="💸" />
                <KpiCard label={t('performance.creatorRevenue')} value={"₩" + fmtM(totRevenue)} color="#f97316" icon="📊" />
                <KpiCard label={t('performance.avgAttribution')} value={pct(avgAttrib)} color="#22c55e" icon="🎯" />
                <KpiCard label={t('performance.rightsExpiringSoon')} value={expiredSoon + " items"} color={expiredSoon > 0 ? "#ef4444" : "#22c55e"} icon="⚠" sub={t('performance.within90Days')} />
            </div>

            {/* Rights expiry alerts */}
            {CREATORS.filter(c => daysLeft(c.rightsExpiry) <= 90).map(c => {
                const dl = daysLeft(c.rightsExpiry);
                const expired = dl < 0;
                return (
                    <div key={c.id} style={{
                        padding: "10px 16px", borderRadius: 10,
                        background: expired ? "rgba(239,68,68,0.08)" : "rgba(234,179,8,0.07)",
                        border: `1px solid ${expired ? "rgba(239,68,68,0.25)" : "rgba(234,179,8,0.2)"}`,
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 16 }}>{expired ? "🔴" : "🟡"}</span>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 12 }}>{c.name}</span>
                                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>{c.handle}</span>
                            </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, fontSize: 11, color: expired ? "#ef4444" : "#eab308" }}>
                                Content rights {expired ? "expired" : `expire in ${dl} days`}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--text-3)" }}>Expiry: {c.rightsExpiry}</div>
                        </div>
                        <button className="btn-primary" style={{
                            fontSize: 10, padding: "5px 12px",
                            background: expired ? "linear-gradient(135deg,#ef4444,#a855f7)" : "linear-gradient(135deg,#eab308,#f97316)"
                        }}>
                            {expired ? t('performance.requestRenewal') : t('performance.renewRights')}
                        </button>
                    </div>
                );
            })}

            {/* Creator cards */}
            <div style={{ display: "grid", gap: 14 }}>
                {CREATORS.map(c => {
                    const dl = daysLeft(c.rightsExpiry);
                    const expired = c.status === "expired" || dl < 0;
                    const roi = c.revenue / c.contractRate;
                    const tax = Math.round(c.contractRate * 0.033);
                    const net = c.contractRate - tax;

                    return (
                        <div key={c.id} className="card card-glass" style={{
                            borderLeft: `3px solid ${TIER_COLOR[c.tier]}`,
                            opacity: expired ? 0.75 : 1,
                        }}>
                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center",
                                        justifyContent: "center", fontSize: 20, background: `${TIER_COLOR[c.tier]}18`,
                                        border: `1px solid ${TIER_COLOR[c.tier]}33`
                                    }}>
                                        {PLATFORM_ICO[c.platform]}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</div>
                                        <div style={{ fontSize: 11, color: "#4f8ef7" }}>{c.handle}</div>
                                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                            <span style={{
                                                fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                                                background: `${TIER_COLOR[c.tier]}18`, color: TIER_COLOR[c.tier],
                                                border: `1px solid ${TIER_COLOR[c.tier]}33`
                                            }}>{c.tier}</span>
                                            <span style={{
                                                fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                                                background: expired ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                                                color: expired ? "#ef4444" : "#22c55e",
                                                border: `1px solid ${expired ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`
                                            }}>
                                                {expired ? t('performance.expired') : "Active"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    <button className="btn-ghost" style={{ fontSize: 10, padding: "4px 10px" }}
                                        onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                                        {expanded === c.id ? "▲ Collapse" : "▼ Content Attribution"}
                                    </button>
                                    <button className="btn-primary" style={{
                                        fontSize: 10, padding: "4px 12px",
                                        background: "linear-gradient(135deg,#a855f7,#ec4899)"
                                    }}
                                        onClick={() => openSettle(c)}>💰 {t('performance.settle')}</button>
                                </div>
                            </div>

                            {/* Metrics grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: expanded === c.id ? 14 : 0 }}>
                                {[
                                    [t('performance.contractFee'), "₩" + fmtM(c.contractRate), "#a855f7"],
                                    [t('performance.attributedOrders'), c.orders +  ' ' + t('performance.orders'), "#4f8ef7"],
                                    [t('performance.attributedRevenue'), "₩" + fmtM(c.revenue), "#f97316"],
                                    [t('performance.attribution'), pct(c.attribution), "#22c55e"],
                                    [t('performance.roi'), round2(roi) + "x", roi >= 50 ? "#22c55e" : "#eab308"],
                                    [t('performance.rightsExpiry'), expired ? t('performance.expired') : dl + " days", dl < 0 ? "#ef4444" : dl < 90 ? "#eab308" : "#22c55e"],
                                ].map(([l, v, col]) => (
                                    <div key={l} style={{ padding: "8px 10px", borderRadius: 10, background: "rgba(9,15,30,0.6)", textAlign: "center" }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700, marginBottom: 3 }}>{l}</div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: col }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Attribution progress */}
                            <div style={{ marginTop: expanded === c.id ? 0 : 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 10 }}>
                                    <span style={{ color: "var(--text-3)" }}>Content Attribution Rate</span>
                                    <span style={{ fontWeight: 700, color: "#22c55e" }}>{pct(c.attribution)}</span>
                                </div>
                                <MiniBar value={c.attribution} max={1} color={TIER_COLOR[c.tier]} />
                            </div>

                            {/* Content detail (expanded) */}
                            {expanded === c.id && (
                                <div style={{
                                    marginTop: 14, padding: "14px", borderRadius: 12, background: "rgba(9,15,30,0.5)",
                                    border: "1px solid rgba(99,140,255,0.08)"
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: "var(--text-2)" }}>
                                        📎 Content Attribution Breakdown
                                    </div>
                                    <table className="table" style={{ fontSize: 11 }}>
                                        <thead>
                                            <tr><th>{t('performance.content')}</th><th style={{ textAlign: "right" }}>{t('performance.views')}</th>
                                                <th style={{ textAlign: "right" }}>{t('performance.attributedOrders')}</th>
                                                <th style={{ textAlign: "right" }}>{t('performance.attributedRevenue')}</th>
                                                <th style={{ textAlign: "right" }}>{t('performance.attribution')}</th></tr>
                                        </thead>
                                        <tbody>
                                            {c.content.map((ct, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{ct.title}</td>
                                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmtM(ct.views)}</td>
                                                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>{ct.orders} orders</td>
                                                    <td style={{ textAlign: "right", fontFamily: "monospace", color: "#f97316", fontWeight: 700 }}>₩{fmtM(ct.revenue)}</td>
                                                    <td style={{ textAlign: "right" }}>
                                                        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                                                            <MiniBar value={ct.attrib} max={1} color={TIER_COLOR[c.tier]} />
                                                            <span style={{ fontWeight: 700, color: TIER_COLOR[c.tier], minWidth: 36 }}>{pct(ct.attrib)}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Settlement modal */}
            {modal === "settle" && selected && (
                <>
                    <div onClick={() => setModal(null)} style={{
                        position: "fixed", inset: 0,
                        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 300
                    }} />
                    <div style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        width: "min(540px,95vw)", background: "linear-gradient(180deg,#0d1525,#090f1e)",
                        border: "1px solid rgba(168,85,247,0.25)", borderRadius: 20, padding: 28, zIndex: 301,
                        boxShadow: "0 24px 64px rgba(0,0,0,0.7)", animation: "popIn 0.2s cubic-bezier(.4,0,.2,1)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>{t('performance.creatorSettlement')}</div>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 18 }}>✕</button>
                        </div>
                        {/* Creator info */}
                        <div style={{
                            padding: "10px 14px", borderRadius: 10, background: "rgba(168,85,247,0.06)",
                            border: "1px solid rgba(168,85,247,0.15)", marginBottom: 16
                        }}>
                            <div style={{ fontWeight: 700 }}>{selected.name} <span style={{ color: "#4f8ef7", fontWeight: 400, fontSize: 12 }}>{selected.handle}</span></div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{selected.tier} · {selected.platform} · Contract ends {selected.contractEnd}</div>
                        </div>
                        {/* Calculation */}
                        {[
                            ["Contract Amount", fmtKRW(selected.contractRate), "var(--text-1)"],
                            ["Business Income Tax (3.3%)", "- " + fmtKRW(Math.round(selected.contractRate * 0.033)), "#ef4444"],
                            ["Local Income Tax (0.33%)", "- " + fmtKRW(Math.round(selected.contractRate * 0.0033)), "#f97316"],
                        ].map(([l, v, c]) => (
                            <div key={l} style={{
                                display: "flex", justifyContent: "space-between", padding: "9px 0",
                                borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12
                            }}>
                                <span style={{ color: "var(--text-3)" }}>{l}</span>
                                <span style={{ fontWeight: 700, color: c }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14 }}>
                            <span style={{ fontWeight: 700 }}>Net Payout (incl. tax)</span>
                            <span style={{ fontWeight: 900, color: "#22c55e", fontSize: 18 }}>
                                {fmtKRW(selected.contractRate - Math.round(selected.contractRate * 0.033) - Math.round(selected.contractRate * 0.0033))}
                            </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                            <div><label className="input-label">{t('performance.bank')}</label>
                                <select className="input"><option>KakaoBank</option><option>TossBank</option><option>Shinhan</option><option>Kookmin</option></select></div>
                            <div><label className="input-label">{t('performance.accountNo')}</label>
                                <input className="input" defaultValue="1234-5678-9012" /></div>
                        </div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>{t('performance.cancel')}</button>
                            <button className="btn-primary" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}
                                onClick={() => setModal(null)}>{t('performance.completeSettlement')}</button>
                        </div>
                    </div>
                    <style>{`@keyframes popIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>
                </>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
const TABS = [
    { id: "performance", label: "📊 Performance", desc: "Impressions · Clicks · ROAS · ACOS" },
    { id: "settlement", label: "💳 Settlement", desc: "Fees · Ad Spend · FX" },
    { id: "creator", label: "🤝 Creator Settlement", desc: "Payout · Attribution · Rights" },
    { id: "sku_profit", label: "📈 SKU Profitability", desc: "Revenue · COGS · Ad Cost · P&L" },
];

/* ── SKU Profit성 Tab ───────────────────────────────────────────── */
function SKUProfitTab() {
    const { t } = useI18n();
    const [sortCol, setSortCol] = useState('margin_rate');
    const [sortDir, setSortDir] = useState('desc');

    const SKU_DATA = [
        { sku: 'WH-1000XM5', name: 'Wireless Noise-Cancelling Headphones', revenue: 214400000, cog: 89000000, logistics: 18200000, ad: 51000000, platform: 21440000, margin: 34760000 },
        { sku: 'KB-MXM-RGB', name: 'RGB Mechanical Keyboard',               revenue: 187200000, cog: 74800000, logistics: 15400000, ad: 42000000, platform: 18720000, margin: 36280000 },
        { sku: 'HC-USB4-7P', name: 'USB-C 7-Port Hub',                       revenue: 89000000,  cog: 29700000, logistics: 7800000,  ad: 22000000, platform: 8900000,  margin: 20600000 },
        { sku: 'CAM-4K-PRO', name: '4K Webcam Pro',                          revenue: 145200000, cog: 72600000, logistics: 11600000, ad: 34000000, platform: 14520000, margin: 12480000 },
        { sku: 'MS-ERG-BL',  name: 'Ergonomic Mouse',                        revenue: 56000000,  cog: 19600000, logistics: 5000000,  ad: 14000000, platform: 5600000,  margin: 11800000 },
        { sku: 'CH-60W-GAN', name: '60W GaN Fast Charger',                   revenue: 39000000,  cog: 11700000, logistics: 3500000,  ad: 9000000,  platform: 3900000,  margin: 10900000 },
    ].map(s => ({
        ...s,
        total_cost: s.cog + s.logistics + s.ad + s.platform,
        margin_rate: (s.margin / s.revenue),
    }));

    const sorted = [...SKU_DATA].sort((a, b) => sortDir === 'desc' ? b[sortCol] - a[sortCol] : a[sortCol] - b[sortCol]);
    const totalRevenue = SKU_DATA.reduce((s, x) => s + x.revenue, 0);
    const totalMargin  = SKU_DATA.reduce((s, x) => s + x.margin,  0);

    const handleSort = col => { if(sortCol===col) setSortDir(d=>d==='desc'?'asc':'desc'); else { setSortCol(col); setSortDir('desc'); } };
    const SortArrow = ({col}) => sortCol===col ? (sortDir==='desc'?'▼':'▲') : '';

    return (
        <div style={{ display:'grid', gap:18 }}>
            {/* KPI */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[
                    { l:'Total Revenue', v:'₩'+fmtM(totalRevenue), c:'#4f8ef7' },
                    { l:'Total Margin',  v:'₩'+fmtM(totalMargin),  c:'#22c55e' },
                    { l:'Avg Margin Rate', v:pct(totalMargin/totalRevenue), c:'#a855f7' },
                    { l:'Top Margin SKU', v:sorted[0]?.sku||'-', c:'#f97316' },
                ].map(({l,v,c})=>(
                    <KpiCard key={l} label={l} value={v} color={c} />
                ))}
            </div>

            {/* Channelper P&L Unified */}
            <div className="card card-glass" style={{padding:20}}>
                <div style={{fontWeight:800,fontSize:13,marginBottom:14}}>📊 SKU Profitability Detail (COGS · Logistics · Ad Cost · Margin)</div>
                <div style={{overflowX:'auto'}}>
                    <table className="table" style={{fontSize:11}}>
                        <thead>
                            <tr>
                                {[['sku','SKU'],['name','Product'],['revenue','Revenue'],['cog','COGS'],['logistics','Logistics'],['ad','Ad Spend'],['platform','Platform Fee'],['margin','Margin'],['margin_rate','Margin Rate']].map(([col,label])=>(
                                    <th key={col} onClick={()=>handleSort(col)} style={{cursor:'pointer',userSelect:'none',textAlign:col!=='name'?'right':'left'}}>{label} <span style={{color:'#4f8ef7'}}><SortArrow col={col}/></span></th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map(s=>(
                                <tr key={s.sku}>
                                    <td style={{fontFamily:'monospace',fontWeight:700,color:'#4f8ef7'}}>{s.sku}</td>
                                    <td style={{fontSize:11}}>{s.name}</td>
                                    <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:700}}>₩{fmtM(s.revenue)}</td>
                                    <td style={{textAlign:'right',fontFamily:'monospace',color:'#ef4444'}}>₩{fmtM(s.cog)}</td>
                                    <td style={{textAlign:'right',fontFamily:'monospace',color:'#f97316'}}>₩{fmtM(s.logistics)}</td>
                                    <td style={{textAlign:'right',fontFamily:'monospace',color:'#eab308'}}>₩{fmtM(s.ad)}</td>
                                    <td style={{textAlign:'right',fontFamily:'monospace',color:'#a855f7'}}>₩{fmtM(s.platform)}</td>
                                    <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:800,color:s.margin_rate>=0.2?'#22c55e':s.margin_rate>=0.1?'#eab308':'#ef4444'}}>₩{fmtM(s.margin)}</td>
                                    <td style={{textAlign:'right'}}>
                                        <span style={{fontWeight:800,color:s.margin_rate>=0.2?'#22c55e':s.margin_rate>=0.1?'#eab308':'#ef4444'}}>{pct(s.margin_rate)}</span>
                                        <div style={{marginTop:3,height:3,background:'#1e3a5f',borderRadius:2,overflow:'hidden'}}>
                                            <div style={{width:`${Math.min(100,s.margin_rate*200)}%`,height:'100%',background:s.margin_rate>=0.2?'#22c55e':s.margin_rate>=0.1?'#eab308':'#ef4444',borderRadius:2}} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{borderTop:'2px solid rgba(99,140,255,0.2)',background:'rgba(79,142,247,0.04)'}}>
                                <td colspan="2" style={{fontWeight:800,fontSize:11}}>Total</td>
                                <td style={{textAlign:'right',fontWeight:800,color:'#4f8ef7'}}>₩{fmtM(totalRevenue)}</td>
                                <td colspan="4"></td>
                                <td style={{textAlign:'right',fontWeight:900,color:'#22c55e',fontSize:13}}>₩{fmtM(totalMargin)}</td>
                                <td style={{textAlign:'right',fontWeight:900,color:'#22c55e'}}>{pct(totalMargin/totalRevenue)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}


/* ═══ 코호트 Analysis Tab ═══════════════════ */
const COHORT_DATA = [
    { month: '2026-01', newUsers: 1240, retained30: 820, retained60: 610, retained90: 480, revenue: 34500000 },
    { month: '2025-12', newUsers: 1180, retained30: 780, retained60: 580, retained90: 450, revenue: 31200000 },
    { month: '2025-11', newUsers: 980,  retained30: 650, retained60: 490, retained90: 380, revenue: 27800000 },
    { month: '2025-10', newUsers: 1050, retained30: 700, retained60: 530, retained90: 420, revenue: 29300000 },
];
function CohortTab() {
    const [view, setView] = useState('retention');
    const fmtPct = (a, b) => b === 0 ? '-' : (a / b * 100).toFixed(1) + '%';
    const fmtKRW = v => '₩' + Number(v).toLocaleString();
    const btnStyle = active => ({
        padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
        background: active ? 'linear-gradient(135deg,#a855f7,#6366f1)' : 'rgba(255,255,255,0.07)', color: active ? '#fff' : 'var(--text-2)'
    });
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>👥 Cohort Analysis</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Monthly Retention · LTV Forecast</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button style={btnStyle(view === 'retention')} onClick={() => setView('retention')}>Retention Rate</button>
                    <button style={btnStyle(view === 'revenue')} onClick={() => setView('revenue')}>Cohort Revenue</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {COHORT_DATA.slice(0, 4).map(c => (
                    <div key={c.month} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{c.month}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#a855f7' }}>{c.newUsers.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>New Users</div>
                    </div>
                ))}
            </div>

            <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: 'rgba(168,85,247,0.08)' }}>
                            {['Cohort(Mon)', 'New', 'D+30', 'D+60', 'D+90',
                                view === 'retention' ? '90일유지률' : 'LTVRevenue'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Cohort(Mon)' ? 'left' : 'center', color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {COHORT_DATA.map(c => (
                            <tr key={c.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{c.month}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>{c.newUsers.toLocaleString()}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{fmtPct(c.retained30, c.newUsers)}</span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <span style={{ color: '#4f8ef7', fontWeight: 700 }}>{fmtPct(c.retained60, c.newUsers)}</span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{fmtPct(c.retained90, c.newUsers)}</span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#a855f7' }}>
                                    {view === 'retention' ? fmtPct(c.retained90, c.newUsers) : fmtKRW(c.revenue)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                💡 <strong>Avg D+90 Retention</strong>: {(COHORT_DATA.reduce((s,c)=>s+c.retained90/c.newUsers,0)/COHORT_DATA.length*100).toFixed(1)}%
                &nbsp;· The most critical cohort is the <strong>Month-3 retention rate</strong>. We recommend Journey Builder automation to send targeted content at that interval.
            </div>
        </div>
    );
}

/* ═══ ESG 리포팅 Tab ═══════════════════ */
const ESG_DATA = {
    carbon: { label: 'Carbon Emissions', value: '124.3 tCO₂', target: '100 tCO₂', progress: 76, color: '#22c55e' },
    energy: { label: 'Energy Usage', value: '892 MWh', target: '750 MWh', progress: 84, color: '#4f8ef7' },
    packaging: { label: 'Recycled Packaging', value: '67%', target: '80%', progress: 67, color: '#f59e0b' },
    returnRate: { label: 'Return Recycling Rate', value: '82%', target: '90%', progress: 82, color: '#a855f7' },
};
const ESG_RATINGS = [
    { area: 'E — Environment', score: 72, color: '#22c55e', items: ['Certified packaging adoption (+15%)', 'Carbon offset credit purchase', 'Delivery route optimization'] },
    { area: 'S — Social', score: 81, color: '#4f8ef7', items: ['Diversity partner quota 40%', 'Fair trade certified products expansion', 'CS response rate 98.4%'] },
    { area: 'G — Governance', score: 88, color: '#a855f7', items: ['Data privacy policy compliance', 'GDPR/KISA unsubscribe automation', 'Quarterly sustainability report'] },
];
function ESGTab() {
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>🌿 ESG Reporting</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Environmental · Social · Governance Performance</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {ESG_RATINGS.map(r => (
                    <div key={r.area} style={{ padding: 16, borderRadius: 12, background: `${r.color}08`, border: `1px solid ${r.color}22` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{r.area}</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: r.color }}>{r.score}</div>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 10 }}>
                            <div style={{ width: `${r.score}%`, height: '100%', background: r.color, borderRadius: 4 }} />
                        </div>
                        {r.items.map(it => (
                            <div key={it} style={{ fontSize: 11, color: 'var(--text-2)', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>✓ {it}</div>
                        ))}
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {Object.values(ESG_DATA).map(d => (
                    <div key={d.label} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{d.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: d.color }}>{d.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Goal: {d.target}</div>
                        <div style={{ marginTop: 6, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                            <div style={{ width: `${d.progress}%`, height: '100%', background: d.color, borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 10, color: d.progress >= 80 ? '#22c55e' : '#f59e0b', marginTop: 4, fontWeight: 700 }}>
                            {d.progress}% 달성
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                🔎 Overall ESG Score: <strong style={{ color: '#22c55e', fontSize: 16 }}>80.3 / 100</strong>
                &nbsp;· Top priorities: Achieve 80% recycled packaging · Introduce ESG evaluation for partner suppliers
            </div>
        </div>
    );
}


export default function PerformanceHub() {
    const { t } = useI18n();
    const [tab, setTab] = useState("performance");
    const expiredSoon = CREATORS.filter(c => daysLeft(c.rightsExpiry) <= 90).length;
    const TABS = [
        { id: "performance",  label: "📊 Performance", desc: "Revenue · Clicks · ROAS" },
        { id: "settlement",   label: "💳 Settlement", desc: "Fees · Ad Cost · FX" },
        { id: "creator",      label: "🤝 Creator Settlement", desc: "Payout · Attribution" },
        { id: "sku_profit",   label: "📈 SKU Profitability", desc: "COGS · Ad Cost · P&L" },
        { id: "cohort",       label: "👥 Cohort", desc: "Retention · LTV" },
        { id: "esg",          label: "🌿 ESG", desc: "Environment · Social · Governance" },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(34,197,94,0.05))",
                borderColor: "rgba(168,85,247,0.15)"
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(249,115,22,0.15))" }}>📊</div>
                    <div>
                        <div className="hero-title" style={{
                            background: "linear-gradient(135deg,#a855f7,#22c55e)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                        }}>{t("performanceHub.pageTitle") || "Performance Hub"}</div>
                        <div className="hero-desc">
                            {t("performanceHub.pageSub") || "Performance · Settlement · Creator Analytics"}
                        </div>
                    </div>
                </div>
                {expiredSoon > 0 && (
                    <div style={{
                        marginTop: 12, padding: "6px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#ef4444", display: "inline-flex", gap: 6
                    }}>
                        🔴 콘텐츠 사용 권리 Expired 임박 {expiredSoon}건 — 즉시 Confirm 필요
                    </div>
                )}
            </div>

            {/* Tab nav */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "16px 14px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === t.id ? "rgba(168,85,247,0.1)" : "transparent",
                            borderBottom: `2px solid ${tab === t.id ? "#a855f7" : "transparent"}`,
                            transition: "all 200ms",
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="card card-glass fade-up fade-up-2">
                {tab === "performance" && <PerformanceTab />}
                {tab === "settlement"  && <SettlementTab />}
                {tab === "creator"     && <CreatorTab />}
                {tab === "sku_profit"  && <SKUProfitTab />}
                {tab === "cohort"      && <CohortTab />}
                {tab === "esg"         && <ESGTab />}
            </div>
        </div>
    );
}
