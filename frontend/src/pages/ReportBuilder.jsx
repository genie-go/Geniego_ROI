import React, { useState, useMemo } from "react";
import { useT } from '../i18n';

/* ─── utils ─────────────────────────────────────────────── */
const fmtM = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(Number(v).toFixed(0));

/* ─── Sample Report Data ─────────────────────────────────── */
const KPI_DATA = {
    revenue: 837000000, adSpend: 54700000, fees: 52400000,
    infCost: 18900000, netProfit: 91300000, orders: 7440, returns: 578,
    roas: 4.12, returnRate: 7.8,
};

const CAMPAIGN_DATA = [
    { name: "Meta Spring KR", channel: "Meta", spend: 12400000, revenue: 51800000, roas: 4.18, orders: 1820 },
    { name: "Google Brand KW", channel: "Google", spend: 5600000, revenue: 39200000, roas: 7.00, orders: 1120 },
    { name: "TikTok CPP Spring", channel: "TikTok", spend: 14200000, revenue: 28400000, roas: 2.00, orders: 890 },
    { name: "Naver SA Basic", channel: "Naver", spend: 4200000, revenue: 29400000, roas: 7.00, orders: 840 },
    { name: "Coupang DA", channel: "Coupang", spend: 9800000, revenue: 15680000, roas: 1.60, orders: 560 },
];

const CREATOR_DATA = [
    { name: "Tech Unboxing", tier: "Micro", views: 131000, orders: 342, revenue: 41040000, cost: 350000, roi: 117.3 },
    { name: "TechVibe", tier: "Macro", views: 1980000, orders: 890, revenue: 89000000, cost: 2225000, roi: 39.9 },
    { name: "Daily Gadget", tier: "Mid", views: 254000, orders: 218, revenue: 26160000, cost: 800000, roi: 32.7 },
];

const SKU_DATA = [
    { sku: "SKU-A1", name: "WH-1000XM5 Headphones", revenue: 547160000, orders: 4780, returnRate: 4.1, margin: 32.4 },
    { sku: "SKU-B2", name: "RGB Mechanical Keyboard", revenue: 171360000, orders: 1428, returnRate: 12.1, margin: 18.7 },
    { sku: "SKU-C3", name: "4K Webcam Pro", revenue: 89000000, orders: 890, returnRate: 19.8, margin: 11.2 },
    { sku: "SKU-D4", name: "USB-C 7-Port Hub", revenue: 56000000, orders: 672, returnRate: 20.2, margin: 8.9 },
];

/* ─── Filter Panel ───────────────────────────────────────── */
function FilterPanel({ filters, setFilters, t }) {
    return (
        <div className="card card-glass" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>{t("reportBuilder.filterPanel")}</div>
            <div style={{ display: "grid", gap: 10 }}>
                <div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{t("reportBuilder.period")}</div>
                    <select value={filters.period} onChange={e => setFilters(f => ({ ...f, period: e.target.value }))}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-1)", fontSize: 11 }}>
                        <option value="7d">{t("reportBuilder.period7d")}</option>
                        <option value="30d">{t("reportBuilder.period30d")}</option>
                        <option value="90d">{t("reportBuilder.period90d")}</option>
                        <option value="q1">{t("reportBuilder.periodQ1")}</option>
                    </select>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{t("reportBuilder.channel")}</div>
                    {["Meta", "Google", "TikTok", "Naver", "Coupang"].map(ch => (
                        <label key={ch} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 4, cursor: "pointer" }}>
                            <input type="checkbox"
                                checked={filters.channels.includes(ch)}
                                onChange={e => setFilters(f => ({
                                    ...f,
                                    channels: e.target.checked ? [...f.channels, ch] : f.channels.filter(c => c !== ch)
                                }))}
                                style={{ accentColor: "#4f8ef7" }}
                            />
                            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{ch}</span>
                        </label>
                    ))}
                </div>
                <div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>SKU</div>
                    {SKU_DATA.map(s => (
                        <label key={s.sku} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 4, cursor: "pointer" }}>
                            <input type="checkbox"
                                checked={filters.skus.includes(s.sku)}
                                onChange={e => setFilters(f => ({
                                    ...f,
                                    skus: e.target.checked ? [...f.skus, s.sku] : f.skus.filter(k => k !== s.sku)
                                }))}
                                style={{ accentColor: "#4f8ef7" }}
                            />
                            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{s.sku}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Section Builder ────────────────────────────────────── */
function SectionBuilder({ selected, setSelected, sections, t }) {
    return (
        <div className="card card-glass" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>{t("reportBuilder.sectionSelect")}</div>
            <div style={{ display: "grid", gap: 6 }}>
                {sections.map(s => {
                    const on = selected.includes(s.id);
                    return (
                        <div
                            key={s.id}
                            onClick={() => setSelected(prev => on ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                            style={{
                                padding: "9px 12px", borderRadius: 9, border: "1px solid",
                                borderColor: on ? "#4f8ef7" : "var(--border)",
                                background: on ? "rgba(79,142,247,0.08)" : "var(--surface-2)",
                                cursor: "pointer", display: "flex", gap: 10, alignItems: "center", transition: "all 150ms",
                            }}
                        >
                            <span style={{ fontSize: 16 }}>{s.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: on ? "#4f8ef7" : "var(--text-1)" }}>{s.label}</div>
                                <div style={{ fontSize: 9, color: "var(--text-3)" }}>{s.desc}</div>
                            </div>
                            <div style={{
                                width: 18, height: 18, borderRadius: "50%", border: "2px solid",
                                borderColor: on ? "#4f8ef7" : "var(--border)",
                                background: on ? "#4f8ef7" : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                                {on && <span style={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>✓</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Preview Sections ───────────────────────────────────── */
function KpiSection({ filters, t }) {
    const periodLabel = {
        "7d": t("reportBuilder.period7d"),
        "30d": t("reportBuilder.period30d"),
        "90d": t("reportBuilder.period90d"),
        "q1": t("reportBuilder.periodQ1"),
    }[filters.period];
    const kpis = [
        { l: t("reportBuilder.kpiRevenue"),    v: "₩" + fmtM(KPI_DATA.revenue),    c: "#4f8ef7" },
        { l: t("reportBuilder.kpiAdSpend"),    v: "₩" + fmtM(KPI_DATA.adSpend),    c: "#f97316" },
        { l: t("reportBuilder.kpiNetProfit"),  v: "₩" + fmtM(KPI_DATA.netProfit),  c: "#22c55e" },
        { l: t("reportBuilder.kpiRoas"),       v: KPI_DATA.roas + "x",              c: "#eab308" },
        { l: t("reportBuilder.kpiOrders"),     v: KPI_DATA.orders.toLocaleString(), c: "#4f8ef7" },
        { l: t("reportBuilder.kpiReturnRate"), v: KPI_DATA.returnRate + "%",        c: "#ef4444" },
    ];
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "var(--text-2)" }}>{t("reportBuilder.kpiTitle")} — {periodLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {kpis.map(k => (
                    <div key={k.l} style={{ padding: "10px 12px", borderRadius: 8, background: k.c + "10", border: `1px solid ${k.c}22` }}>
                        <div style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 700 }}>{k.l}</div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: k.c, marginTop: 3 }}>{k.v}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PnLSection({ t }) {
    const items = [
        [t("reportBuilder.pnlRevenue"),     KPI_DATA.revenue,   "#4f8ef7"],
        [t("reportBuilder.pnlAdSpend"),    -KPI_DATA.adSpend,   "#f97316"],
        [t("reportBuilder.pnlFees"),       -KPI_DATA.fees,      "#ef4444"],
        [t("reportBuilder.pnlInfluencer"), -KPI_DATA.infCost,   "#a855f7"],
        [t("reportBuilder.pnlNetProfit"),   KPI_DATA.netProfit, "#22c55e"],
    ];
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "var(--text-2)" }}>🌊 P&L Waterfall</div>
            {items.map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(99,140,255,0.06)" }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{l}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11, color: c }}>
                        {v >= 0 ? "₩" : "-₩"}{fmtM(Math.abs(v))}
                    </span>
                </div>
            ))}
        </div>
    );
}

function CampaignSection({ filters, t }) {
    const rows = CAMPAIGN_DATA.filter(c => filters.channels.includes(c.channel));
    if (!rows.length) return <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t("reportBuilder.noChannelSelected")}</div>;
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "var(--text-2)" }}>{t("reportBuilder.campaignTitle")}</div>
            <table className="table" style={{ fontSize: 11 }}>
                <thead><tr>
                    <th>{t("reportBuilder.colCampaign")}</th>
                    <th>{t("reportBuilder.colChannel")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colAdSpend")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colRoas")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colOrders")}</th>
                </tr></thead>
                <tbody>{rows.map(r => (
                    <tr key={r.name}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{r.channel}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>₩{fmtM(r.spend)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: r.roas >= 3 ? "#22c55e" : "#ef4444" }}>{r.roas}x</td>
                        <td style={{ textAlign: "right" }}>{r.orders.toLocaleString()}</td>
                    </tr>
                ))}</tbody>
            </table>
        </div>
    );
}

function CreatorSection({ t }) {
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "var(--text-2)" }}>{t("reportBuilder.creatorTitle")}</div>
            <table className="table" style={{ fontSize: 11 }}>
                <thead><tr>
                    <th>{t("reportBuilder.colCreator")}</th>
                    <th>{t("reportBuilder.colTier")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colViews")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colRevenue")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colRoi")}</th>
                </tr></thead>
                <tbody>{CREATOR_DATA.map(r => (
                    <tr key={r.name}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{r.tier}</td>
                        <td style={{ textAlign: "right" }}>{(r.views / 1000).toFixed(0)}K</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>₩{fmtM(r.revenue)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: r.roi > 50 ? "#22c55e" : "#eab308" }}>{r.roi}x</td>
                    </tr>
                ))}</tbody>
            </table>
        </div>
    );
}

function SkuSection({ filters, t }) {
    const rows = SKU_DATA.filter(s => filters.skus.includes(s.sku));
    if (!rows.length) return <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t("reportBuilder.noSkuSelected")}</div>;
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "var(--text-2)" }}>{t("reportBuilder.skuTitle")}</div>
            <table className="table" style={{ fontSize: 11 }}>
                <thead><tr>
                    <th>{t("reportBuilder.colSku")}</th>
                    <th>{t("reportBuilder.colProductName")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colRevenue")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colMargin")}</th>
                    <th style={{ textAlign: "right" }}>{t("reportBuilder.colReturnRate")}</th>
                </tr></thead>
                <tbody>{rows.map(r => (
                    <tr key={r.sku}>
                        <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.sku}</td>
                        <td>{r.name}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>₩{fmtM(r.revenue)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: r.margin >= 20 ? "#22c55e" : r.margin >= 10 ? "#eab308" : "#ef4444" }}>{r.margin}%</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: r.returnRate > 12 ? "#ef4444" : "var(--text-2)" }}>{r.returnRate}%</td>
                    </tr>
                ))}</tbody>
            </table>
        </div>
    );
}

function AnomalySection({ t }) {
    const items = [
        { level: "high", msg: "TikTok CPP ROAS 2.0x — below threshold (3.0x)", detail: "Recommend pausing and replacing creative" },
        { level: "high", msg: "Coupang DA ROAS 1.6x — below break-even", detail: "Consider budget cut or campaign pause" },
        { level: "high", msg: "SKU-C3 return rate 19.8% — exceeds threshold (12%)", detail: "Improve product description and images" },
        { level: "mid", msg: "Coupon abuse detected — SKU-C3 coupon rate 30.1%", detail: "Reduce creator coupon limit" },
    ];
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "var(--text-2)" }}>{t("reportBuilder.anomalyTitle")}</div>
            {items.map((a, i) => (
                <div key={i} style={{
                    display: "flex", gap: 10, padding: "8px 0",
                    borderBottom: "1px solid rgba(99,140,255,0.06)",
                }}>
                    <span>{a.level === "high" ? "🔴" : "🟡"}</span>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700 }}>{a.msg}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>→ {a.detail}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── Preview Panel ──────────────────────────────────────── */
function PreviewPanel({ selected, filters, sections, t }) {
    const periodLabel = {
        "7d": t("reportBuilder.period7d"),
        "30d": t("reportBuilder.period30d"),
        "90d": t("reportBuilder.period90d"),
        "q1": t("reportBuilder.periodQ1"),
    }[filters.period];

    if (!selected.length) {
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12, color: "var(--text-3)" }}>
                <span style={{ fontSize: 40, opacity: 0.4 }}>📄</span>
                <div style={{ fontSize: 12 }}>{t("reportBuilder.selectToPreview")}</div>
            </div>
        );
    }
    return (
        <div style={{ display: "grid", gap: 20 }}>
            {/* Report Header */}
            <div style={{
                padding: "20px 24px", borderRadius: 12, background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.05))",
                border: "1px solid rgba(79,142,247,0.15)",
            }}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>{t("reportBuilder.reportTitle")}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>{periodLabel} · {t("reportBuilder.createdDate")}: 2026-03-04 · v422</div>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6 }}>
                    {t("reportBuilder.includedSections")}: {selected.map(s => sections.find(x => x.id === s)?.label).join(" · ")}
                </div>
            </div>

            {/* Sections */}
            {selected.includes("kpi")     && <div className="card card-glass" style={{ padding: 16 }}><KpiSection filters={filters} t={t} /></div>}
            {selected.includes("pnl")     && <div className="card card-glass" style={{ padding: 16 }}><PnLSection t={t} /></div>}
            {selected.includes("campaign")&& <div className="card card-glass" style={{ padding: 16 }}><CampaignSection filters={filters} t={t} /></div>}
            {selected.includes("creator") && <div className="card card-glass" style={{ padding: 16 }}><CreatorSection t={t} /></div>}
            {selected.includes("sku")     && <div className="card card-glass" style={{ padding: 16 }}><SkuSection filters={filters} t={t} /></div>}
            {selected.includes("anomaly") && <div className="card card-glass" style={{ padding: 16 }}><AnomalySection t={t} /></div>}
        </div>
    );
}

/* ─── MAIN ───────────────────────────────────────────────── */
export default function ReportBuilder() {
    const t = useT();

    const SECTIONS = [
        { id: "kpi",      icon: "📊", label: t("reportBuilder.sectionKpi"),     desc: t("reportBuilder.sectionKpiDesc") },
        { id: "pnl",      icon: "🌊", label: t("reportBuilder.sectionPnl"),     desc: t("reportBuilder.sectionPnlDesc") },
        { id: "campaign", icon: "📣", label: t("reportBuilder.sectionCampaign"), desc: t("reportBuilder.sectionCampaignDesc") },
        { id: "creator",  icon: "🤝", label: t("reportBuilder.sectionCreator"), desc: t("reportBuilder.sectionCreatorDesc") },
        { id: "sku",      icon: "📦", label: t("reportBuilder.sectionSku"),     desc: t("reportBuilder.sectionSkuDesc") },
        { id: "anomaly",  icon: "⚠",  label: t("reportBuilder.sectionAnomaly"), desc: t("reportBuilder.sectionAnomalyDesc") },
    ];

    const [selected, setSelected] = useState(["kpi", "pnl", "campaign"]);
    const [filters, setFilters] = useState({
        period: "30d",
        channels: ["Meta", "Google", "TikTok", "Naver", "Coupang"],
        skus: ["SKU-A1", "SKU-B2", "SKU-C3", "SKU-D4"],
    });
    const [exported, setExported] = useState(null);

    const handleExport = (type) => {
        setExported(type);
        setTimeout(() => setExported(null), 2500);
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(79,142,247,0.06),rgba(34,197,94,0.04))",
                borderColor: "rgba(79,142,247,0.15)",
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.22),rgba(34,197,94,0.15))" }}>📋</div>
                    <div>
                        <div className="hero-title" style={{
                            background: "linear-gradient(135deg,#4f8ef7,#22c55e)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>{t("reportBuilder.pageTitle")}</div>
                        <div className="hero-desc">
                            {t("reportBuilder.pageDesc")}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => handleExport("CSV")} className="btn-primary" style={{ fontSize: 11, padding: "6px 16px" }}>
                        {t("reportBuilder.csvExport")}
                    </button>
                    <button onClick={() => handleExport("PDF")} className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }}>
                        {t("reportBuilder.pdfExport")}
                    </button>
                    {exported && (
                        <span style={{
                            fontSize: 11, padding: "6px 14px", borderRadius: 8,
                            background: "rgba(34,197,94,0.1)", color: "#22c55e",
                            border: "1px solid rgba(34,197,94,0.25)",
                        }}>✓ {exported} {t("reportBuilder.downloadReady")}</span>
                    )}
                </div>
            </div>

            {/* Layout */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, alignItems: "flex-start" }}>
                {/* Left Panel */}
                <div style={{ display: "grid", gap: 14 }}>
                    <SectionBuilder selected={selected} setSelected={setSelected} sections={SECTIONS} t={t} />
                    <FilterPanel filters={filters} setFilters={setFilters} t={t} />
                </div>
                {/* Right Preview */}
                <div className="card card-glass fade-up" style={{ padding: 24, minHeight: 500 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{t("reportBuilder.preview")}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>{selected.length}{t("reportBuilder.sectionsSelected")}</div>
                    </div>
                    <PreviewPanel selected={selected} filters={filters} sections={SECTIONS} t={t} />
                </div>
            </div>
        </div>
    );
}
