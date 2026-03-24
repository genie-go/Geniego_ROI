import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from '../i18n';import { useCurrency } from '../contexts/CurrencyContext.jsx';


// ── Helpers ─────────────────────────────────────────────
// Session Token Priority, if not exists Demo API 키 fallback
const DEMO_API_KEY = "genie_live_demo_key_00000000";
const getAuthToken = () => localStorage.getItem("genie_auth_token") || DEMO_API_KEY;
const API = (path) => fetch(path, { headers: { Authorization: `Bearer ${getAuthToken()}` } }).then((r) => r.json());

const fmt = {
    num: (v) => v?.toLocaleString("ko-KR") ?? "-",
    won: (v) => v == null ? "-" : "₩" + Math.round(v).toLocaleString("ko-KR"),
    pct: (v) => v == null ? "-" : v.toFixed(1) + "%",
    roas: (v) => v == null ? "-" : v.toFixed(2) + "x",
};

const PLATFORM_COLOR = { Meta: "#1877F2", Google: "#EA4335", TikTok: "#000", Naver: "#03C75A", Coupang: "#E51937", YouTube: "#FF0000", Instagram: "#C13584" };
const pcol = (p) => PLATFORM_COLOR[p] ?? "#888";

// ── Mini Bar Chart ───────────────────────────────────────
function MiniBar({ data, key1 = "revenue", key2 }) {
    const max = Math.max(...data.map((d) => d[key1] ?? 0));
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 40, width: "100%" }}>
            {data.slice(-28).map((d, i) => {
                const h = max > 0 ? ((d[key1] ?? 0) / max) * 38 : 2;
                return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                        <div style={{ width: "100%", background: "var(--accent, #6366f1)", borderRadius: 2, height: h }} title={`${d.date}: ${fmt.won(d[key1])}`} />
                    </div>
                );
            })}
        </div>
    );
}

// ── Trend Sparkline ──────────────────────────────────────
function Sparkline({ data, field, color = "#6366f1" }) {
    if (!data || data.length < 2) return null;
    const vals = data.map((d) => d[field] ?? 0);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    const W = 80, H = 30;
    const pts = vals.map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - min) / range) * H;
        return `${x},${y}`;
    });
    const trend = vals[vals.length - 1] - vals[0];
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <svg width={W} height={H} style={{ overflow: "visible" }}>
                <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" />
            </svg>
            <span style={{ fontSize: 10, color: trend >= 0 ? "#22c55e" : "#ef4444" }}>
                {trend >= 0 ? "▲" : "▼"}
            </span>
        </span>
    );
}

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
    return (
        <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${color ?? "#6366f1"}` }}>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

// ── Badge ────────────────────────────────────────────────
function Badge({ str }) {
    const colors = { warn: "#ef4444", info: "#6366f1", ok: "#22c55e" };
    const type = str?.type ?? "info";
    return (
        <span style={{ background: colors[type] + "22", color: colors[type], borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
            {str?.msg ?? str}
        </span>
    );
}

// ════════════════════════════════════════════════════════
// ── Tab: Summary ─────────────────────────────────────────
function SummaryTab({ period, n }) {
    const { t } = useI18n();
    const [data, setData] = useState(null);
    useEffect(() => {
        API(`/v423/rollup/summary?period=${period}&n=${n}`).then(setData).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{t('rollup.loading')}</div>;

    const kpi = data.kpi ?? {};
    const byPlatform = data.by_platform ?? {};
    const maxRev = Math.max(...Object.values(byPlatform));

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <KpiCard label={t('rollup.totalRevenue')} value={fmt.won(kpi.total_revenue)} color="#6366f1" />
                <KpiCard label={t('rollup.totalSpend')} value={fmt.won(kpi.total_spend)} color="#ef4444" />
                <KpiCard label={t('rollup.totalOrders')} value={fmt.num(kpi.total_orders)} color="#f59e0b" />
                <KpiCard label={t('rollup.avgRoas')} value={fmt.roas(kpi.avg_roas)} color="#22c55e" />
                <KpiCard label={t('rollup.revenuePerOrder')} value={fmt.won(kpi.revenue_per_order)} color="#06b6d4" />
            </div>

            {/* Platform Revenue Bar */}
            <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('rollup.platformRevenue')}</div>
                {Object.entries(byPlatform).sort((a, b) => b[1] - a[1]).map(([pf, rev]) => (
                    <div key={pf} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 70, fontSize: 12, color: pcol(pf), fontWeight: 700 }}>{pf}</div>
                        <div style={{ flex: 1, background: "#2a2a3e", borderRadius: 4, height: 20, overflow: "hidden" }}>
                            <div style={{ width: `${maxRev > 0 ? rev / maxRev * 100 : 0}%`, height: "100%", background: pcol(pf), borderRadius: 4, transition: "width 0.5s" }} />
                        </div>
                        <div style={{ width: 100, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{fmt.won(rev)}</div>
                    </div>
                ))}
            </div>

            {/* Top SKUs + Alerts */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
                <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('rollup.topSku')}</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #333" }}>
                                {["SKU", t('rollup.colProduct'), t('rollup.colRevenue'), t('rollup.colOrders'), "ROAS", t('rollup.colReturnRate')].map((h) => (
                                    <th key={h} style={{ padding: "4px 8px", textAlign: "right", color: "#888", fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(data.top_skus ?? []).map((s) => (
                                <tr key={s.sku_id} style={{ borderBottom: "1px solid #222" }}>
                                    <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 12 }}>{s.sku_id}</td>
                                    <td style={{ padding: "6px 8px" }}>{s.name}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt.won(s.revenue)}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt.num(s.orders)}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", color: (s.roas ?? 0) >= 3 ? "#22c55e" : "#ef4444" }}>{fmt.roas(s.roas)}</td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", color: (s.return_rate ?? 0) > 12 ? "#ef4444" : "#22c55e" }}>{fmt.pct(s.return_rate)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>⚠️ {t('rollup.alerts')}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(data.alerts ?? []).map((a, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <Badge str={a} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// ── Tab: SKU ─────────────────────────────────────────────
function SkuTab({ period, n }) {
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/v423/rollup/sku?period=${period}&n=${n}`).then((d) => {
            setData(d);
            if (d.rows?.[0]) setSelected(d.rows[0].sku_id);
        }).catch(console.error);
    }, [period, n]);

    const { t } = useI18n();
    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{t('rollup.loading')}</div>;

    const selRow = data.rows?.find((r) => r.sku_id === selected);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left: table */}
            <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('rollup.skuAgg')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #333" }}>
                            {["SKU", t('rollup.colProduct'), t('rollup.colTotalRevenue'), "ROAS", t('rollup.colReturnRate'), t('rollup.colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.sku_id}
                                onClick={() => setSelected(r.sku_id)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.sku_id ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", fontFamily: "monospace" }}>{r.sku_id}</td>
                                <td style={{ padding: "6px 6px", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fmt.won(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roas >= 3 ? "#22c55e" : "#ef4444" }}>{fmt.roas(r.avg_roas)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_return_rate > 12 ? "#ef4444" : "#22c55e" }}>{fmt.pct(r.avg_return_rate)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>
                                    <Sparkline data={r.series} field="revenue" color="#6366f1" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Right: series chart */}
            {selRow && (
                <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{selRow.sku_id} — {selRow.name}</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        {[[t('rollup.colPlatform'), selRow.platform], [t('rollup.unitPrice'), fmt.won(selRow.unit_price)], ["ROAS", fmt.roas(selRow.avg_roas)], [t('rollup.colReturnRate'), fmt.pct(selRow.avg_return_rate)]].map(([k, v]) => (
                            <span key={k} style={{ background: "#2a2a3e", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                                <span style={{ color: "#888" }}>{k}: </span><span style={{ fontWeight: 700 }}>{v}</span>
                            </span>
                        ))}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{t('rollup.revTrend')}</div>
                    <MiniBar data={selRow.series} key1="revenue" />
                    <div style={{ fontWeight: 600, fontSize: 13, margin: "14px 0 6px", color: "#aaa" }}>{t('rollup.roasTrend')}</div>
                    <MiniBar data={selRow.series.map(s => ({ ...s, revenue: s.roas * 1000000 }))} key1="revenue" />
                    <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{t('rollup.roasScale')}</div>

                    {/* mini table */}
                    <div style={{ marginTop: 16, maxHeight: 200, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #333", position: "sticky", top: 0, background: "#1e1e2e" }}>
                                    {[t('rollup.colDate'), t('rollup.colOrders'), t('rollup.colRevenue'), "ROAS", t('rollup.colReturnRate')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.num(s.orders)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.won(s.revenue)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roas >= 3 ? "#22c55e" : "#ef4444" }}>{fmt.roas(s.roas)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.return_rate > 12 ? "#ef4444" : "#22c55e" }}>{fmt.pct(s.return_rate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════
// ── Tab: Campaign ────────────────────────────────────────
function CampaignTab({ period, n }) {
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/v423/rollup/campaign?period=${period}&n=${n}`).then((d) => {
            setData(d); if (d.rows?.[0]) setSelected(d.rows[0].campaign_id);
        }).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{t('rollup.loading')}</div>;
    const selRow = data.rows?.find((r) => r.campaign_id === selected);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('rollup.campaignAgg')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #333" }}>
                            {[t('rollup.colCampaign'), t('rollup.colPlatform'), t('rollup.colTotalRevenue'), t('rollup.colTotalSpend'), "ROAS", t('rollup.colCpa'), t('rollup.colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.campaign_id} onClick={() => setSelected(r.campaign_id)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.campaign_id ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</td>
                                <td style={{ padding: "6px 6px", color: pcol(r.platform), fontWeight: 700 }}>{r.platform}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fmt.won(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: "#ef4444" }}>{fmt.won(r.total_spend)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roas >= 3 ? "#22c55e" : "#ef4444" }}>{fmt.roas(r.avg_roas)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fmt.won(r.avg_cpa)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selRow && (
                <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{selRow.name}</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        {[[t('rollup.colPlatform'), selRow.platform], ["ROAS", fmt.roas(selRow.avg_roas)], ["CPA", fmt.won(selRow.avg_cpa)], [t('rollup.colConversions'), fmt.num(selRow.total_conversions)]].map(([k, v]) => (
                            <span key={k} style={{ background: "#2a2a3e", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                                <span style={{ color: "#888" }}>{k}: </span><span style={{ fontWeight: 700 }}>{v}</span>
                            </span>
                        ))}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{t('rollup.revenueVsSpend')}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{t('rollup.colRevenue')}</div>
                            <MiniBar data={selRow.series} key1="revenue" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#ef4444", marginBottom: 4 }}>{t('rollup.colTotalSpend')}</div>
                            <MiniBar data={selRow.series} key1="spend" />
                        </div>
                    </div>
                    <div style={{ marginTop: 16, maxHeight: 200, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #333", position: "sticky", top: 0, background: "#1e1e2e" }}>
                                    {[t('rollup.colDate'), t('rollup.colImpressions'), t('rollup.colClicks'), t('rollup.colConversions'), "ROAS", t('rollup.colCpc')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.num(s.impressions)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.num(s.clicks)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.num(s.conversions)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roas >= 3 ? "#22c55e" : "#ef4444" }}>{fmt.roas(s.roas)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.won(s.cpc)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════
// ── Tab: Creator ─────────────────────────────────────────
function CreatorTab({ period, n }) {
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/v423/rollup/creator?period=${period}&n=${n}`).then((d) => {
            setData(d); if (d.rows?.[0]) setSelected(d.rows[0].creator_id);
        }).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{t('rollup.loading')}</div>;
    const selRow = data.rows?.find((r) => r.creator_id === selected);
    const TIER_COLOR = { Mega: "#a855f7", Macro: "#6366f1", Micro: "#06b6d4" };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('rollup.creatorAgg')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #333" }}>
                            {[t('rollup.colHandle'), t('rollup.colPlatform'), t('rollup.colTier'), t('rollup.colFollowers'), t('rollup.colTotalRevenue'), t('rollup.colRoi'), t('rollup.colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.creator_id} onClick={() => setSelected(r.creator_id)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.creator_id ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", fontFamily: "monospace", fontSize: 11 }}>{r.handle}</td>
                                <td style={{ padding: "6px 6px", color: pcol(r.platform), fontWeight: 700 }}>{r.platform}</td>
                                <td style={{ padding: "6px 6px" }}>
                                    <span style={{ background: TIER_COLOR[r.tier] + "22", color: TIER_COLOR[r.tier], borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>{r.tier}</span>
                                </td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{(r.followers / 10000).toFixed(1)}만</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fmt.won(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roi_pct >= 0 ? "#22c55e" : "#ef4444" }}>{fmt.pct(r.avg_roi_pct)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selRow && (
                <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{selRow.handle}</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                        {[["Platform", selRow.platform], ["티어", selRow.tier], ["팔로워", (selRow.followers / 10000).toFixed(1) + "만"],
                        ["회당 Commission", fmt.won(selRow.fee_per_post)], ["ROI", fmt.pct(selRow.avg_roi_pct)]].map(([k, v]) => (
                            <span key={k} style={{ background: "#2a2a3e", borderRadius: 6, padding: "3px 10px", fontSize: 12 }}>
                                <span style={{ color: "#888" }}>{k}: </span><span style={{ fontWeight: 700 }}>{v}</span>
                            </span>
                        ))}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{t('rollup.viewsVsRevenue')}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{t('rollup.colViews')}</div>
                            <MiniBar data={selRow.series} key1="views" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 4 }}>{t('rollup.colRevenue')}</div>
                            <MiniBar data={selRow.series} key1="revenue" />
                        </div>
                    </div>
                    <div style={{ marginTop: 16, maxHeight: 200, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #333", position: "sticky", top: 0, background: "#1e1e2e" }}>
                                    {[t('rollup.colDate'), t('rollup.colViews'), t('rollup.colClicks'), t('rollup.colConversions'), t('rollup.colCtr'), t('rollup.colCvr'), t('rollup.colRoiPct')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.num(s.views)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.num(s.clicks)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.num(s.conversions)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.pct(s.ctr)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.pct(s.cvr)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roi_pct >= 0 ? "#22c55e" : "#ef4444" }}>{fmt.pct(s.roi_pct)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════
// ── Tab: Platform ────────────────────────────────────────
function PlatformTab({ period, n }) {
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        API(`/v423/rollup/platform?period=${period}&n=${n}`).then((d) => {
            setData(d); if (d.rows?.[0]) setSelected(d.rows[0].platform);
        }).catch(console.error);
    }, [period, n]);

    if (!data) return <div style={{ color: "#aaa", padding: 32 }}>{t('rollup.loading')}</div>;
    const selRow = data.rows?.find((r) => r.platform === selected);

    const totalRev = data.rows?.reduce((s, r) => s + r.total_revenue, 0) ?? 1;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Platform donut-ish + table */}
            <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('rollup.platformAgg')}</div>
                {/* Stacked share bar */}
                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 20, marginBottom: 16 }}>
                    {(data.rows ?? []).map((r) => (
                        <div key={r.platform}
                            title={`${r.platform}: ${fmt.pct(r.total_revenue / totalRev * 100)}`}
                            style={{ width: `${r.total_revenue / totalRev * 100}%`, background: pcol(r.platform), transition: "width 0.5s" }} />
                    ))}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #333" }}>
                            {[t('rollup.colPlatform'), t('rollup.colTotalRevenue'), t('rollup.colShare'), t('rollup.colTotalSpend'), "ROAS", t('rollup.colTrend')].map((h) => (
                                <th key={h} style={{ padding: "4px 6px", color: "#888", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(data.rows ?? []).map((r) => (
                            <tr key={r.platform} onClick={() => setSelected(r.platform)}
                                style={{ borderBottom: "1px solid #222", cursor: "pointer", background: selected === r.platform ? "#6366f110" : "transparent" }}>
                                <td style={{ padding: "6px 6px", color: pcol(r.platform), fontWeight: 700 }}>{r.platform}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}>{fmt.won(r.total_revenue)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: "#888" }}>{fmt.pct(r.total_revenue / totalRev * 100)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: "#ef4444" }}>{fmt.won(r.total_spend)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right", color: r.avg_roas >= 3 ? "#22c55e" : "#ef4444" }}>{fmt.roas(r.avg_roas)}</td>
                                <td style={{ padding: "6px 6px", textAlign: "right" }}><Sparkline data={r.series} field="revenue" color={pcol(r.platform)} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selRow && (
                <div style={{ background: "var(--card-bg,#1e1e2e)", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: pcol(selRow.platform) }}>{selRow.platform} {t('rollup.platformDetail')}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                        <KpiCard label={t('rollup.totalRevenue')} value={fmt.won(selRow.total_revenue)} color={pcol(selRow.platform)} />
                        <KpiCard label="ROAS" value={fmt.roas(selRow.avg_roas)} color={selRow.avg_roas >= 3 ? "#22c55e" : "#ef4444"} />
                        <KpiCard label={t('rollup.totalOrders')} value={fmt.num(selRow.total_orders)} color="#f59e0b" />
                        <KpiCard label={t('rollup.totalSpend')} value={fmt.won(selRow.total_spend)} color="#ef4444" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#aaa" }}>{t('rollup.dailyRevenue')}</div>
                    <MiniBar data={selRow.series} key1="revenue" />
                    <div style={{ marginTop: 12, maxHeight: 170, overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #333", position: "sticky", top: 0, background: "#1e1e2e" }}>
                                    {[t('rollup.colDate'), t('rollup.colRevenue'), "ROAS", t('rollup.colCtr'), t('rollup.colCpc')].map(h => (
                                        <th key={h} style={{ padding: "3px 6px", color: "#666", textAlign: "right" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {selRow.series.slice().reverse().map((s, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #1a1a2e" }}>
                                        <td style={{ padding: "3px 6px", color: "#888" }}>{s.date}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.won(s.revenue)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right", color: s.roas >= 3 ? "#22c55e" : "#ef4444" }}>{fmt.roas(s.roas)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.pct(s.ctr)}</td>
                                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt.won(s.cpc)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════
// ── Tab: Segment (오디언스·Category·소재타입) ─────────────

const SEG_AUDIENCE = [
    { seg: "25-34 여성", grp: "오디언스", impr: 4812000, clicks: 96240, conv: 4812, revenue: 57744000, spend: 14436000, roas: 4.00, ctr: 2.0, cvr: 5.0 },
    { seg: "18-24 남성", grp: "오디언스", impr: 3204000, clicks: 51264, conv: 1538, revenue: 18456000, spend: 9612000, roas: 1.92, ctr: 1.6, cvr: 3.0 },
    { seg: "35-44 남성", grp: "오디언스", impr: 2107000, clicks: 52675, conv: 2634, revenue: 34242000, spend: 7374500, roas: 4.64, ctr: 2.5, cvr: 5.0 },
    { seg: "45+ 여성", grp: "오디언스", impr: 890000, clicks: 13350, conv: 334, revenue: 3006000, spend: 2225000, roas: 1.35, ctr: 1.5, cvr: 2.5 },
    { seg: "가전/디지털", grp: "Category", impr: 5200000, clicks: 104000, conv: 5200, revenue: 72800000, spend: 18200000, roas: 4.00, ctr: 2.0, cvr: 5.0 },
    { seg: "뷰티/헬스", grp: "Category", impr: 3100000, clicks: 46500, conv: 1395, revenue: 11160000, spend: 8060000, roas: 1.38, ctr: 1.5, cvr: 3.0 },
    { seg: "패션/의류", grp: "Category", impr: 2400000, clicks: 43200, conv: 2160, revenue: 25920000, spend: 7680000, roas: 3.38, ctr: 1.8, cvr: 5.0 },
    { seg: "식품/생활", grp: "Category", impr: 1600000, clicks: 22400, conv: 672, revenue: 5376000, spend: 4160000, roas: 1.29, ctr: 1.4, cvr: 3.0 },
    { seg: "Image Ad", grp: "소재타입", impr: 4600000, clicks: 69000, conv: 2760, revenue: 33120000, spend: 13340000, roas: 2.48, ctr: 1.5, cvr: 4.0 },
    { seg: "동영상 15s", grp: "소재타입", impr: 3800000, clicks: 76000, conv: 4560, revenue: 63840000, spend: 11400000, roas: 5.60, ctr: 2.0, cvr: 6.0 },
    { seg: "카루셀", grp: "소재타입", impr: 2100000, clicks: 46200, conv: 2310, revenue: 25410000, spend: 7350000, roas: 3.46, ctr: 2.2, cvr: 5.0 },
    { seg: "UGC 영상", grp: "소재타입", impr: 1700000, clicks: 40800, conv: 2856, revenue: 37128000, spend: 5270000, roas: 7.05, ctr: 2.4, cvr: 7.0 },
];

function SegmentTab() {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const segGroups = t('rollup.segGroups') || ["Audience", "Category", "Creative"];
    const [grp, setGrp] = useState(segGroups[0]);
    const [sortBy, setSortBy] = useState("roas");
    const [sortDir, setSortDir] = useState(-1);

    const groups = segGroups;
    const filtered = SEG_AUDIENCE.filter(r => r.grp === grp);
    const sorted = [...filtered].sort((a, b) => sortDir * ((b[sortBy] ?? 0) - (a[sortBy] ?? 0)));
    const maxRev = Math.max(...filtered.map(r => r.revenue));
    const maxRoas = Math.max(...filtered.map(r => r.roas));

    const handleSort = (col) => {
        if (sortBy === col) setSortDir(d => -d);
        else { setSortBy(col); setSortDir(-1); }
    };

    const roasColor = (v) => v >= 4 ? "#22c55e" : v >= 2.5 ? "#eab308" : "#ef4444";

    const cols = [
        { key: "seg", label: `${grp}` },
        { key: "impr", label: t('rollup.colImpressions'), fmt: v => (v / 1e6).toFixed(1) + "M" },
        { key: "clicks", label: t('rollup.colClicks'), fmt: v => (v / 1e3).toFixed(0) + "K" },
        { key: "ctr", label: "CTR%", fmt: v => v.toFixed(1) + "%" },
        { key: "conv", label: t('rollup.colConversions'), fmt: v => v.toLocaleString() },
        { key: "cvr", label: "CVR%", fmt: v => v.toFixed(1) + "%" },
        { key: "spend", label: t('rollup.colSpend'), fmt: v => "₩" + (v / 1e6).toFixed(1) + "M" },
        { key: "revenue", label: t('rollup.colRevenue'), fmt: v => "₩" + (v / 1e6).toFixed(1) + "M" },
        { key: "roas", label: "ROAS", fmt: v => v.toFixed(2) + "x" },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* 세그먼트 Type Select */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {groups.map((g, i) => (
                    <button key={g} onClick={() => setGrp(g)} style={{
                        padding: "6px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                        background: grp === g ? "#6366f1" : "#2a2a3e", color: grp === g ? "#fff" : "#aaa", transition: "all 0.2s",
                    }}>{i === 0 ? `👥 ${g}` : i === 1 ? `🏷 ${g}` : `🎨 ${g}`}</button>
                ))}
                <div style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>{t('rollup.sortHint')}</div>
            </div>

            {/* ROAS 히트맵 바 */}
            <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#aaa", marginBottom: 12 }}>📊 {t('rollup.segRoasChart')}</div>
                <div style={{ display: "grid", gap: 8 }}>
                    {sorted.map(r => (
                        <div key={r.seg} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 100, fontSize: 11, fontWeight: 600, color: "#ccc", flexShrink: 0 }}>{r.seg}</div>
                            <div style={{ flex: 1, background: "#2a2a3e", borderRadius: 4, height: 18, overflow: "hidden" }}>
                                <div style={{ width: `${(r.roas / maxRoas) * 100}%`, height: "100%", background: roasColor(r.roas), borderRadius: 4, transition: "width 0.5s" }} />
                            </div>
                            <div style={{ width: 55, textAlign: "right", fontSize: 12, fontWeight: 800, color: roasColor(r.roas) }}>{r.roas.toFixed(2)}x</div>
                            <div style={{ width: 70, textAlign: "right", fontSize: 11, color: "#888" }}>₩{(r.revenue / 1e6).toFixed(1)}M</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 데이터 Table */}
            <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20, overflowX: "auto" }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>{t('rollup.segDetail')} ({grp})</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid #333" }}>
                            {cols.map(c => (
                                <th key={c.key} onClick={() => c.key !== "seg" && handleSort(c.key)}
                                    style={{ padding: "6px 8px", color: sortBy === c.key ? "#6366f1" : "#888", textAlign: c.key === "seg" ? "left" : "right", fontWeight: 700, cursor: c.key !== "seg" ? "pointer" : "default", whiteSpace: "nowrap", userSelect: "none" }}>
                                    {c.label}{sortBy === c.key ? (sortDir < 0 ? " ▼" : " ▲") : ""}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((r, idx) => (
                            <tr key={r.seg} style={{ borderBottom: "1px solid #222", background: idx % 2 === 0 ? "transparent" : "rgba(99,102,241,0.03)" }}>
                                {cols.map(c => (
                                    <td key={c.key} style={{
                                        padding: "8px 8px", textAlign: c.key === "seg" ? "left" : "right",
                                        fontWeight: c.key === "roas" ? 800 : 500,
                                        color: c.key === "roas" ? roasColor(r.roas) : c.key === "spend" ? "#ef4444" : c.key === "revenue" ? "#22c55e" : "#ddd",
                                    }}>
                                        {c.fmt ? c.fmt(r[c.key]) : r[c.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 원인 Analysis 인사이트 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#22c55e", marginBottom: 10 }}>✅ {t('rollup.highEff')}</div>
                    {sorted.filter(r => r.roas >= 4).map(r => (
                        <div key={r.seg} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #2a2a3e", fontSize: 12 }}>
                            <span style={{ color: "#ccc" }}>{r.seg}</span>
                            <span style={{ color: "#22c55e", fontWeight: 700 }}>{r.roas.toFixed(2)}x</span>
                        </div>
                    ))}
                    {sorted.filter(r => r.roas >= 4).length === 0 && <div style={{ color: "#666", fontSize: 11 }}>{t('rollup.none')}</div>}
                </div>
                <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444", marginBottom: 10 }}>⚠️ {t('rollup.lowEff')}</div>
                    {sorted.filter(r => r.roas < 2.5).map(r => (
                        <div key={r.seg} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #2a2a3e", fontSize: 12 }}>
                            <span style={{ color: "#ccc" }}>{r.seg}</span>
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>{r.roas.toFixed(2)}x — ₩{(r.spend / 1e6).toFixed(1)}M {t('rollup.wasteEst')}</span>
                        </div>
                    ))}
                    {sorted.filter(r => r.roas < 2.5).length === 0 && <div style={{ color: "#666", fontSize: 11 }}>{t('rollup.allNormal')}</div>}
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// ── Tab: Risk Budget (P&L 기반 손실 추정) ────────────────

const RISK_DATA = [
    {
        platform: "TikTok", campaign: "TikTok CPP", budget: 12000000, spend: 11400000,
        revenue: 21660000, roas: 1.90,
        settle_deduction_pct: 18.5,   // 정산 Commission %
        return_rate: 8.2,              // 반품률 %
        return_cost_per_unit: 8500,
        avg_order_value: 120000,
        orders: 180,
        cost_of_goods_pct: 52,         // Cost Price율 %
        fx_exposure: 0,
        risk_threshold_roas: 3.0,
    },
    {
        platform: "Coupang", campaign: "Coupang DA", budget: 9000000, spend: 8640000,
        revenue: 18144000, roas: 2.10,
        settle_deduction_pct: 21.0,
        return_rate: 12.8,
        return_cost_per_unit: 6000,
        avg_order_value: 85000,
        orders: 213,
        cost_of_goods_pct: 55,
        fx_exposure: 0,
        risk_threshold_roas: 3.0,
    },
    {
        platform: "Meta", campaign: "Meta Advantage+", budget: 20000000, spend: 18400000,
        revenue: 82800000, roas: 4.50,
        settle_deduction_pct: 12.5,
        return_rate: 4.1,
        return_cost_per_unit: 7000,
        avg_order_value: 142000,
        orders: 583,
        cost_of_goods_pct: 48,
        fx_exposure: 5,
        risk_threshold_roas: 3.0,
    },
    {
        platform: "Google", campaign: "Google Brand KW", budget: 15000000, spend: 13500000,
        revenue: 94500000, roas: 7.00,
        settle_deduction_pct: 10.0,
        return_rate: 2.8,
        return_cost_per_unit: 6500,
        avg_order_value: 165000,
        orders: 573,
        cost_of_goods_pct: 46,
        fx_exposure: 0,
        risk_threshold_roas: 3.0,
    },
    {
        platform: "Naver", campaign: "Naver SA", budget: 14000000, spend: 12600000,
        revenue: 88200000, roas: 7.00,
        settle_deduction_pct: 11.0,
        return_rate: 3.2,
        return_cost_per_unit: 6000,
        avg_order_value: 155000,
        orders: 569,
        cost_of_goods_pct: 47,
        fx_exposure: 0,
        risk_threshold_roas: 3.0,
    },
];

function calcPnL(r) {
    const gross_revenue = r.revenue;
    const settle_deduction = gross_revenue * (r.settle_deduction_pct / 100);
    const net_revenue = gross_revenue - settle_deduction;
    const cogs = gross_revenue * (r.cost_of_goods_pct / 100);
    const return_loss = r.orders * (r.return_rate / 100) * r.return_cost_per_unit;
    const fx_loss = r.spend * (r.fx_exposure / 100);
    const gross_profit = net_revenue - cogs - return_loss - fx_loss - r.spend;
    const gross_margin = (gross_profit / gross_revenue) * 100;
    // 리스크: ROAS 기준 손실이면 Budget 대비 손실율
    const roas_gap = r.roas - r.risk_threshold_roas;
    const risk_loss_est = roas_gap < 0 ? Math.abs(roas_gap) * r.spend : 0;
    return { gross_revenue, settle_deduction, net_revenue, cogs, return_loss, fx_loss, gross_profit, gross_margin, risk_loss_est };
}

function RiskBudgetTab() {
    const { t } = useI18n();
    const [selected, setSelected] = useState("TikTok CPP");
    const [showDeduction, setShowDeduction] = useState(true);

    const selRow = RISK_DATA.find(r => r.campaign === selected);
    const pnl = selRow ? calcPnL(selRow) : null;

    const totalRiskLoss = RISK_DATA.reduce((s, r) => s + calcPnL(r).risk_loss_est, 0);
    const totalSettleDeduction = RISK_DATA.reduce((s, r) => s + calcPnL(r).settle_deduction, 0);
    const totalGrossProfit = RISK_DATA.reduce((s, r) => s + calcPnL(r).gross_profit, 0);
    const totalReturnLoss = RISK_DATA.reduce((s, r) => s + calcPnL(r).return_loss, 0);

    const riskLevel = (r) => {
        const p = calcPnL(r);
        if (r.roas < 2.5 || p.gross_profit < 0) return { label: t('rollup.riskStatus.danger'), color: "#ef4444" };
        if (r.roas < 3.0) return { label: t('rollup.riskStatus.caution'), color: "#eab308" };
        return { label: t('rollup.riskStatus.normal'), color: "#22c55e" };
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* All Summary KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                    { l: t('rollup.riskLossEst'), v: "₩" + (totalRiskLoss / 1e6).toFixed(1) + "M", c: "#ef4444", i: "🔴" },
                    { l: t('rollup.settleDeductSum'), v: "₩" + (totalSettleDeduction / 1e6).toFixed(1) + "M", c: "#f97316", i: "💸" },
                    { l: t('rollup.returnLossSum'), v: "₩" + (totalReturnLoss / 1e6).toFixed(1) + "M", c: "#eab308", i: "↩" },
                    { l: t('rollup.grossProfitTotal'), v: "₩" + (totalGrossProfit / 1e6).toFixed(1) + "M", c: totalGrossProfit >= 0 ? "#22c55e" : "#ef4444", i: "💰" },
                ].map(({ l, v, c, i }) => (
                    <div key={l} style={{ background: "#1e1e2e", borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${c}` }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{i} {l}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
                {/* Campaign 리스크 List */}
                <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20 }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Campaignper P&L 리스크</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {RISK_DATA.map(r => {
                            const p = calcPnL(r);
                            const rl = riskLevel(r);
                            return (
                                <div key={r.campaign} onClick={() => setSelected(r.campaign)}
                                    style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `1px solid ${selected === r.campaign ? "#6366f1" : "#2a2a3e"}`, background: selected === r.campaign ? "rgba(99,102,241,0.08)" : "rgba(42,42,62,0.5)", transition: "all 0.2s" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: pcol(r.platform) }}>{r.platform}</div>
                                            <div style={{ fontSize: 11, color: "#888" }}>{r.campaign}</div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: rl.color, background: rl.color + "18", padding: "2px 8px", borderRadius: 6 }}>{rl.label}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                                        <div style={{ color: "#888" }}>ROAS <span style={{ color: r.roas >= 3 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{r.roas.toFixed(2)}x</span></div>
                                        <div style={{ color: "#888" }}>정산공제 <span style={{ color: "#f97316", fontWeight: 700 }}>{r.settle_deduction_pct}%</span></div>
                                        <div style={{ color: "#888" }}>반품률 <span style={{ color: r.return_rate > 10 ? "#ef4444" : "#eab308", fontWeight: 700 }}>{r.return_rate}%</span></div>
                                    </div>
                                    {p.risk_loss_est > 0 && (
                                        <div style={{ marginTop: 6, fontSize: 11, color: "#ef4444", fontWeight: 700 }}>⚠ 손실 추정: ₩{(p.risk_loss_est / 1e6).toFixed(1)}M</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* P&L 상세 Analysis */}
                {pnl && selRow && (
                    <div style={{ background: "#1e1e2e", borderRadius: 12, padding: 20 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, color: pcol(selRow.platform) }}>{selRow.campaign} — P&L 손익 구조</div>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 16 }}>정산 공제 · Cost Price · 반품 · Ad Spend 차감 후 실질 Profit</div>

                        {/* 워터폴 Chart (CSS 기반) */}
                        <div style={{ display: "grid", gap: 0, marginBottom: 20 }}>
                            {[
                                { label: "Total Revenue", value: pnl.gross_revenue, color: "#6366f1", bar: true, positive: true },
                                { label: `정산 공제 (−${selRow.settle_deduction_pct}%)`, value: -pnl.settle_deduction, color: "#f97316", bar: true, positive: false },
                                { label: "순 Revenue", value: pnl.net_revenue, color: "#4f8ef7", bar: false, divider: true },
                                { label: `Cost Price (−${selRow.cost_of_goods_pct}%)`, value: -pnl.cogs, color: "#ef4444", bar: true, positive: false },
                                { label: `반품 손실 (반품률 ${selRow.return_rate}%)`, value: -pnl.return_loss, color: "#eab308", bar: true, positive: false },
                                { label: "Ad Spend", value: -selRow.spend, color: "#ef4444", bar: true, positive: false },
                                selRow.fx_exposure > 0 ? { label: `환율 리스크 (${selRow.fx_exposure}%)`, value: -pnl.fx_loss, color: "#a855f7", bar: true, positive: false } : null,
                            ].filter(Boolean).map(item => (
                                <div key={item.label} style={{ padding: "7px 0", borderBottom: item.divider ? "2px solid #333" : "1px solid #2a2a3e" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: item.bar ? 4 : 0 }}>
                                        <span style={{ fontSize: 12, color: item.divider ? "#fff" : "#ccc", fontWeight: item.divider ? 700 : 400 }}>{item.label}</span>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: item.value >= 0 ? "#22c55e" : "#ef4444", fontFamily: "monospace" }}>
                                            {item.value >= 0 ? "+" : "-"}₩{(Math.abs(item.value) / 1e6).toFixed(2)}M
                                        </span>
                                    </div>
                                    {item.bar && (
                                        <div style={{ height: 5, background: "#2a2a3e", borderRadius: 4, overflow: "hidden" }}>
                                            <div style={{ width: `${Math.min(100, (Math.abs(item.value) / pnl.gross_revenue) * 100)}%`, height: "100%", background: item.color, borderRadius: 4, transition: "width 0.5s" }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {/* 최종 Profit */}
                            <div style={{ padding: "12px 0 0" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>🎯 Gross Profit</span>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: pnl.gross_profit >= 0 ? "#22c55e" : "#ef4444", fontFamily: "monospace" }}>
                                        {pnl.gross_profit >= 0 ? "+" : ""}₩{(pnl.gross_profit / 1e6).toFixed(2)}M
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Gross Margin: <span style={{ color: pnl.gross_margin >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{pnl.gross_margin.toFixed(1)}%</span></div>
                            </div>
                        </div>

                        {/* 리스크 버짓 Alert */}
                        {pnl.risk_loss_est > 0 && (
                            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", marginBottom: 12 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#ef4444", marginBottom: 4 }}>{t('rollup.riskWarn')}</div>
                                <div style={{ fontSize: 11, color: "#ddd" }}>ROAS {selRow.roas.toFixed(2)}x ({selRow.risk_threshold_roas}x)</div>
                                <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, marginTop: 4 }}>₩{(pnl.risk_loss_est / 1e6).toFixed(2)}M</div>
                                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>₩{((selRow.spend - (pnl.gross_profit < 0 ? Math.abs(pnl.gross_profit) : 0)) / 1e6).toFixed(1)}M</div>
                            </div>
                        )}

                        {/* 주요 Count치 */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {[
                                [t('rollup.budgetRemaining'), "₩" + (selRow.budget / 1e6).toFixed(1) + "M", "#888"],
                                [t('rollup.colActSpend'), "₩" + (selRow.spend / 1e6).toFixed(1) + "M", "#ef4444"],
                                [t('rollup.settlePct'), selRow.settle_deduction_pct + "%", "#f97316"],
                                [t('rollup.returnPct'), selRow.return_rate + "%", selRow.return_rate > 10 ? "#ef4444" : "#eab308"],
                                [t('rollup.cogsPct'), selRow.cost_of_goods_pct + "%", "#a855f7"],
                                ["ROAS", selRow.roas.toFixed(2) + "x", selRow.roas >= 3 ? "#22c55e" : "#ef4444"],
                            ].map(([l, v, c]) => (
                                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: "#2a2a3e", borderRadius: 6, fontSize: 11 }}>
                                    <span style={{ color: "#888" }}>{l}</span>
                                    <span style={{ fontWeight: 700, color: c }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════
// ── Main Page ────────────────────────────────────────────
export default function RollupDashboard() {
    const { t } = useI18n();
    const [tab, setTab] = useState("summary");
    const TABS = [
        { id: "summary", label: `📊 ${t('rollup.tabSummary')}` },
        { id: "sku", label: `📦 SKU` },
        { id: "campaign", label: `📣 ${t('rollup.tabCampaign')}` },
        { id: "creator", label: `🎬 ${t('rollup.tabCreator')}` },
        { id: "platform", label: `🌐 ${t('rollup.tabPlatform')}` },
        { id: "segment", label: `🔬 ${t('rollup.tabSegment')}` },
        { id: "risk", label: `⚠️ ${t('rollup.tabRisk')}` },
    ];
    const [period, setPeriod] = useState("daily");
    const [n, setN] = useState(14);

    const tabStyle = (id) => ({
        padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
        background: tab === id ? "#6366f1" : "#2a2a3e",
        color: tab === id ? "#fff" : "#aaa",
        border: "none", transition: "all 0.2s",
    });

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>📈 {t('rollup.title')}</h2>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{t('rollup.subtitle')}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Period toggle */}
                    <div style={{ display: "flex", background: "#2a2a3e", borderRadius: 8, padding: 3, flexWrap: "wrap" }}>
                        {[["daily", t('rollup.periodDaily')], ["weekly", t('rollup.periodWeekly')], ["monthly", t('rollup.periodMonthly')], ["yearly", t('rollup.periodYearly')], ["seasonal", t('rollup.periodSeasonal')]].map(([val, lbl]) => (
                            <button key={val} onClick={() => {
                                setPeriod(val);
                                setN(val === "daily" ? 14 : val === "weekly" ? 8 : val === "monthly" ? 6 : val === "yearly" ? 3 : 4);
                            }}
                                style={{
                                    padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12,
                                    background: period === val ? "#6366f1" : "transparent", color: period === val ? "#fff" : "#aaa"
                                }}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                    {/* N selector */}
                    <select value={n} onChange={(e) => setN(Number(e.target.value))}
                        style={{ background: "#2a2a3e", border: "1px solid #444", borderRadius: 8, padding: "5px 10px", color: "#fff", fontSize: 12 }}>
                        {period === "daily"
                            ? [7, 14, 30, 60].map(v => <option key={v} value={v}>{v}일</option>)
                            : period === "weekly"
                                ? [4, 8, 12, 24].map(v => <option key={v} value={v}>{v}주</option>)
                                : period === "monthly"
                                    ? [3, 6, 12, 24].map(v => <option key={v} value={v}>{v}개월</option>)
                                    : period === "yearly"
                                        ? [2, 3, 5].map(v => <option key={v} value={v}>{v}년</option>)
                                        : [4, 6, 8].map(v => <option key={v} value={v}>{v}시즌(Quarter)</option>)}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TABS.map((tb) => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={tabStyle(tb.id)}>{tb.label}</button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === "summary" && <SummaryTab period={period} n={n} />}
            {tab === "sku" && <SkuTab period={period} n={n} />}
            {tab === "campaign" && <CampaignTab period={period} n={n} />}
            {tab === "creator" && <CreatorTab period={period} n={n} />}
            {tab === "platform" && <PlatformTab period={period} n={n} />}
            {tab === "segment" && <SegmentTab />}
            {tab === "risk" && <RiskBudgetTab />}
        </div>
    );
}
