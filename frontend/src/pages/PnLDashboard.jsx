import React, { useState, useMemo } from "react";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── utils ─────────────────────────────────────────────────── */
// currency formatting via useCurrency fmt()
const fmtM = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(Number(v).toFixed(0));
const pct = (n, d) => d ? (n / d * 100).toFixed(1) + "%" : "—";
const r2 = v => Number(v).toFixed(2);
const fmtSign = v => (v >= 0 ? "+" : "") + fmtM(v);

/* ─── shared ─────────────────────────────────────────────────── */
const Chip = ({ label, color = "#4f8ef7" }) => (
    <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
        background: color + "18", color, border: `1px solid ${color}33`
    }}>{label}</span>
);

const KpiCard = ({ label, value, sub, color = "#4f8ef7", icon, alert }) => (
    <div className="card card-glass" style={{
        padding: "14px 16px",
        borderLeft: `3px solid ${alert ? "#ef4444" : color}`,
        boxShadow: alert ? "0 0 12px rgba(239,68,68,0.12)" : undefined
    }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 16, opacity: .8 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color: alert ? "#ef4444" : color, marginTop: 5 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: alert ? "#ef4444" : "var(--text-3)", marginTop: 2 }}>{sub}</div>}
    </div>
);

const MiniBar = ({ v, max, color = "#4f8ef7", h = 4 }) => (
    <div style={{ height: h, background: "rgba(255,255,255,0.05)", borderRadius: h, flex: 1 }}>
        <div style={{
            width: `${Math.min(100, Math.abs(v / max) * 100)}%`, height: "100%",
            background: color, borderRadius: h, transition: "width .4s"
        }} />
    </div>
);

/* ════════════════════════════════════════════════════════════════
   DATA MODEL — three domains unified
════════════════════════════════════════════════════════════════ */

// ─── AD domain ────────────────────────────────────────────────
const ADS = [
    { id: "meta_spring", channel: "Meta", campaign: "Spring KR", sku: "SKU-A1", spend: 12400000, revenue: 51800000, impressions: 4100000, clicks: 54000, orders: 1820, roas: 4.18, ctr: 0.0132, cvr: 0.034 },
    { id: "meta_pmax", channel: "Meta", campaign: "PMax", sku: "SKU-B2", spend: 8900000, revenue: 20470000, impressions: 2800000, clicks: 29000, orders: 620, roas: 2.30, ctr: 0.0104, cvr: 0.021 },
    { id: "google_brand", channel: "Google", campaign: "Brand KW", sku: "SKU-A1", spend: 5600000, revenue: 39200000, impressions: 1900000, clicks: 38000, orders: 1120, roas: 7.00, ctr: 0.0200, cvr: 0.029 },
    { id: "tiktok_cpp", channel: "TikTok", campaign: "CPP Spring", sku: "SKU-C3", spend: 14200000, revenue: 28400000, impressions: 9800000, clicks: 110000, orders: 890, roas: 2.00, ctr: 0.0112, cvr: 0.008 },
    { id: "naver_sa", channel: "Naver", campaign: "SA Basic", sku: "SKU-B2", spend: 4200000, revenue: 29400000, impressions: 1100000, clicks: 22000, orders: 840, roas: 7.00, ctr: 0.0200, cvr: 0.038 },
    { id: "coupang_da", channel: "Coupang", "campaign": "DA", sku: "SKU-D4", spend: 9800000, revenue: 15680000, impressions: 3200000, clicks: 45000, orders: 560, roas: 1.60, ctr: 0.0141, cvr: 0.012 },
];

// ─── MARKET domain ────────────────────────────────────────────
const ORDERS = [
    { id: "ch_coupang", channel: "Coupang", sku: "SKU-A1", orders: 2340, returns: 94, grossSales: 280800000, platformFee: 30688000, adFee: 28080000, netPayout: 210800000, couponDiscount: 8424000 },
    { id: "ch_naver", channel: "Naver", sku: "SKU-B2", orders: 1210, returns: 145, grossSales: 145200000, platformFee: 7986000, adFee: 14520000, netPayout: 112530000, couponDiscount: 14520000 },
    { id: "ch_meta", channel: "Meta", sku: "SKU-A1", orders: 2440, returns: 49, grossSales: 266360000, platformFee: 0, adFee: 21300000, netPayout: 234200000, couponDiscount: 4500000 },
    { id: "ch_tiktok", channel: "TikTok", sku: "SKU-C3", orders: 890, returns: 178, grossSales: 89000000, platformFee: 8900000, adFee: 14200000, netPayout: 52300000, couponDiscount: 26700000 },
    { id: "ch_11st", channel: "11Street", sku: "SKU-D4", orders: 560, returns: 112, grossSales: 56000000, platformFee: 5600000, adFee: 5040000, netPayout: 31200000, couponDiscount: 5600000 },
];

// ─── INFLUENCER domain ────────────────────────────────────────
const INFLUENCERS = [
    {
        id: "C001", name: "Tech Unboxing", tier: "Micro", sku: "SKU-A1", channel: "YouTube",
        views: 131000, clicks: 9800, couponUses: 87, couponDiscount: 4350000,
        contractFee: 350000, perfRevenue: 41040000, perfRate: 0.02, orders: 342,
        settlePaid: 350000 + 41040000 * 0.02, settleStatus: "partial"
    },
    {
        id: "C003", name: "TechVibe", tier: "Macro", sku: "SKU-C3", channel: "TikTok",
        views: 1980000, clicks: 96000, couponUses: 340, couponDiscount: 17000000,
        contractFee: 0, perfRevenue: 89000000, perfRate: 0.025, orders: 890,
        settlePaid: 89000000 * 0.025, settleStatus: "paid"
    },
    {
        id: "C002", name: "Daily Gadget", tier: "Mid", sku: "SKU-B2", channel: "Instagram",
        views: 254000, clicks: 12000, couponUses: 44, couponDiscount: 2200000,
        contractFee: 800000, perfRevenue: 26160000, perfRate: 0, orders: 218,
        settlePaid: 800000, settleStatus: "paid"
    },
    {
        id: "C005", name: "IT Tips Park", tier: "Micro", sku: "SKU-B2", channel: "YouTube",
        views: 890000, clicks: 8900, couponUses: 11, couponDiscount: 550000,
        contractFee: 200000, perfRevenue: 2800000, perfRate: 0.015, orders: 28,
        settlePaid: 200000 + 2800000 * 0.015 * 1.15, settleStatus: "overpaid"
    },
];

/* ════════════════════════════════════════════════════════════════
   SKU AGGREGATION – join all three domains by SKU
════════════════════════════════════════════════════════════════ */
const SKUS = ["SKU-A1", "SKU-B2", "SKU-C3", "SKU-D4"];
const SKU_META = {
    "SKU-A1": { name: "WH-1000XM5 Headphones", price: 289000, color: "#4f8ef7" },
    "SKU-B2": { name: "RGB Mechanical Keyboard", price: 149000, color: "#a855f7" },
    "SKU-C3": { name: "4K Webcam Pro", price: 99000, color: "#f97316" },
    "SKU-D4": { name: "USB-C 7-Port Hub", price: 49000, color: "#22c55e" },
};

function buildSkuPnL(sku) {
    const ads = ADS.filter(a => a.sku === sku);
    const mkt = ORDERS.filter(o => o.sku === sku);
    const inf = INFLUENCERS.filter(i => i.sku === sku);

    const adSpend = ads.reduce((s, a) => s + a.spend, 0);
    const adRevenue = ads.reduce((s, a) => s + a.revenue, 0);
    const mktGross = mkt.reduce((s, o) => s + o.grossSales, 0);
    const mktFees = mkt.reduce((s, o) => s + o.platformFee, 0);
    const mktNet = mkt.reduce((s, o) => s + o.netPayout, 0);
    const mktReturns = mkt.reduce((s, o) => s + o.returns, 0);
    const mktOrders = mkt.reduce((s, o) => s + o.orders, 0);
    const mktCoupon = mkt.reduce((s, o) => s + o.couponDiscount, 0);
    const infCost = inf.reduce((s, i) => s + i.contractFee + i.perfRevenue * i.perfRate, 0);
    const infRevenue = inf.reduce((s, i) => s + i.perfRevenue, 0);
    const infCoupon = inf.reduce((s, i) => s + i.couponDiscount, 0);

    const totalRevenue = mktGross;
    const totalCost = adSpend + mktFees + infCost;
    const grossProfit = totalRevenue - mktFees - adSpend;
    const netProfit = mktNet - adSpend - infCost;
    const roas = adSpend > 0 ? adRevenue / adSpend : null;
    const returnRate = mktOrders > 0 ? mktReturns / mktOrders : 0;
    const couponRate = mktGross > 0 ? (mktCoupon + infCoupon) / mktGross : 0;
    const feeRate = mktGross > 0 ? mktFees / mktGross : 0;

    return {
        sku, adSpend, adRevenue, mktGross, mktFees, mktNet, mktReturns,
        mktOrders, mktCoupon, infCost, infRevenue, infCoupon, totalRevenue, totalCost,
        grossProfit, netProfit, roas, returnRate, couponRate, feeRate,
        ads, mkt, inf
    };
}

/* ════════════════════════════════════════════════════════════════
   ANOMALY DETECTION ENGINE
════════════════════════════════════════════════════════════════ */
const THRESHOLDS = { roas_min: 3.0, returnRate_max: 0.12, couponRate_max: 0.15, feeRate_max: 0.14 };

function detectAnomalies(skuPnL) {
    const anomalies = [];
    skuPnL.forEach(p => {
        const m = SKU_META[p.sku];
        if (p.roas && p.roas < THRESHOLDS.roas_min)
            anomalies.push({
                level: "high", sku: p.sku, name: m.name, type: "ROAS↓",
                msg: `ROAS ${r2(p.roas)}x — below threshold (${THRESHOLDS.roas_min}x)`,
                action: "budget", detail: `Reallocate ad budget or pause campaign`
            });
        if (p.returnRate > THRESHOLDS.returnRate_max)
            anomalies.push({
                level: "high", sku: p.sku, name: m.name, type: "Return Rate↑",
                msg: `Return rate ${pct(p.mktReturns, p.mktOrders)} — exceeds threshold (${(THRESHOLDS.returnRate_max * 100).toFixed(0)}%)`,
                action: "product", detail: `Improve product quality/description or pause sales`
            });
        if (p.couponRate > THRESHOLDS.couponRate_max)
            anomalies.push({
                level: "mid", sku: p.sku, name: m.name, type: "Coupon Abuse",
                msg: `Total coupon/discount ${pct(p.mktCoupon + p.infCoupon, p.mktGross)} — exceeds threshold (${(THRESHOLDS.couponRate_max * 100).toFixed(0)}%)`,
                action: "coupon", detail: `Reduce creator coupon limit or lower discount rate`
            });
        if (p.feeRate > THRESHOLDS.feeRate_max)
            anomalies.push({
                level: "mid", sku: p.sku, name: m.name, type: "Fee Deduction↑",
                msg: `Platform fee rate ${pct(p.mktFees, p.mktGross)} — exceeds threshold (${(THRESHOLDS.feeRate_max * 100).toFixed(0)}%)`,
                action: "market", detail: `Rebalance channel mix or negotiate fees`
            });
    });
    // Influencer anomalies
    INFLUENCERS.forEach(i => {
        const couponPerView = i.views > 0 ? i.couponUses / i.views : 0;
        if (couponPerView > 0.002 && i.couponUses > 100)
            anomalies.push({
                level: "mid", sku: i.sku, name: i.name, type: "Coupon Abuse",
                msg: `${i.name}: coupon/view ${(couponPerView * 1000).toFixed(1)}‰ — abnormal usage pattern`,
                action: "creator", detail: `Expire coupon codes or suspend issuance`
            });
        if (i.settleStatus === "overpaid")
            anomalies.push({
                level: "high", sku: i.sku, name: i.name, type: "Overpayment",
                msg: `${i.name}: overpayment vs contract detected`,
                action: "creator", detail: `Process clawback and review contract`
            });
    });
    // Ad-level ROAS drop
    ADS.filter(a => a.roas < THRESHOLDS.roas_min).forEach(a => {
        anomalies.push({
            level: a.roas < 2 ? "high" : "mid", sku: a.sku, name: a.campaign,
            type: "Campaign ROAS↓",
            msg: `[${a.channel}] ${a.campaign}: ROAS ${r2(a.roas)}x`,
            action: "budget", detail: `Pause and replace creative or cut budget`
        });
    });
    return anomalies.sort((a, b) => (a.level === "high" ? 0 : 1) - (b.level === "high" ? 0 : 1));
}

/* ════════════════════════════════════════════════════════════════
   ACTION RECOMMENDATIONS
════════════════════════════════════════════════════════════════ */
function buildActions(skuPnL, anomalies) {
    const actions = [];
    const roasLow = ADS.filter(a => a.roas < THRESHOLDS.roas_min);
    const roasHigh = ADS.filter(a => a.roas >= 5.0);

    if (roasLow.length && roasHigh.length) {
        actions.push({
            priority: "P1", type: "budget", icon: "💸", color: "#4f8ef7",
            title: "Budget Reallocation",
            desc: `Cut budget from low-ROAS campaigns (${roasLow.map(a => a.campaign).join(", ")}) → move to high-ROAS campaigns (${roasHigh.map(a => a.campaign).slice(0, 2).join(", ")})`,
            impact: `Expected additional revenue +₩${fmtM(roasLow.reduce((s, a) => s + a.spend, 0) * 0.4 * 4.5)}`,
            detail: roasLow.map(a => `${a.campaign} ${fmt(a.spend)} → 40% budget cut recommended`),
        });
    }
    const highReturn = skuPnL.filter(p => p.returnRate > THRESHOLDS.returnRate_max);
    if (highReturn.length) {
        actions.push({
            priority: "P1", type: "product", icon: "📦", color: "#ef4444",
            title: "Product Operations Action",
            desc: `High return-rate SKUs (${highReturn.map(p => p.sku).join(", ")}) — improve descriptions/photos or pause`,
            impact: `Expected returns cost savings ₩${fmtM(highReturn.reduce((s, p) => s + p.mktReturns * 50000, 0))}`,
            detail: highReturn.map(p => `${p.sku} return rate ${pct(p.mktReturns, p.mktOrders)}`),
        });
    }
    if (INFLUENCERS.find(i => i.settleStatus === "overpaid")) {
        actions.push({
            priority: "P1", type: "creator", icon: "🤝", color: "#a855f7",
            title: "Creator Clawback / Contract Review",
            desc: "Overpaid creators — process immediate clawback and renegotiate contract terms",
            impact: "Clawback amount " + fmt(INFLUENCERS.filter(i => i.settleStatus === "overpaid")
                .reduce((s, i) => s + (i.settlePaid - (i.contractFee + i.perfRevenue * i.perfRate)), 0)),
            detail: INFLUENCERS.filter(i => i.settleStatus === "overpaid").map(i => `${i.name}: overpayment detected`),
        });
    }
    const couponAbuse = skuPnL.filter(p => p.couponRate > THRESHOLDS.couponRate_max);
    if (couponAbuse.length) {
        actions.push({
            priority: "P2", type: "coupon", icon: "🏷", color: "#eab308",
            title: "Coupon Limit Adjustment",
            desc: `Coupon-abused SKUs (${couponAbuse.map(p => p.sku).join(", ")}) — lower discount rate or stop coupon issuance`,
            impact: `Expected margin improvement +₩${fmtM(couponAbuse.reduce((s, p) => s + (p.mktCoupon + p.infCoupon) * 0.4, 0))}`,
            detail: couponAbuse.map(p => `${p.sku} coupon rate ${pct(p.mktCoupon + p.infCoupon, p.mktGross)}`),
        });
    }
    // Top-performing creator reinvestment
    const topInf = [...INFLUENCERS].sort((a, b) => b.perfRevenue / b.contractFee - a.perfRevenue / a.contractFee)[0];
    if (topInf) {
        actions.push({
            priority: "P2", type: "creator", icon: "⭐", color: "#22c55e",
            title: "Creator Additional Investment",
            desc: `${topInf.name} (top ROI) — increase budget and transition to long-term contract`,
            impact: `Expected additional revenue +₩${fmtM(topInf.perfRevenue * 0.5)}`,
            detail: [`Current contract fee ${fmt(topInf.contractFee)} → consider increase`],
        });
    }
    return actions;
}

/* ════════════════════════════════════════════════════════════════
   TAB 1: Unified Overview
════════════════════════════════════════════════════════════════ */
function OverviewTab({ skuPnL, anomalies }) { 
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const totalGross = skuPnL.reduce((s, p) => s + p.mktGross, 0);
    const totalAdSpend = skuPnL.reduce((s, p) => s + p.adSpend, 0);
    const totalFees = skuPnL.reduce((s, p) => s + p.mktFees, 0);
    const totalInfCost = skuPnL.reduce((s, p) => s + p.infCost, 0);
    const totalNet = skuPnL.reduce((s, p) => s + p.mktNet, 0);
    const totalProfit = totalNet - totalAdSpend - totalInfCost;
    const totalOrders = skuPnL.reduce((s, p) => s + p.mktOrders, 0);
    const totalReturns = skuPnL.reduce((s, p) => s + p.mktReturns, 0);

    const sections = [
        { label: "📣 Ad Spend", value: fmt(totalAdSpend), sub: pct(totalAdSpend, totalGross) + " of Revenue", color: "#f97316" },
        { label: "🏪 Platform Fee", value: fmt(totalFees), sub: pct(totalFees, totalGross) + " of Revenue", color: "#ef4444" },
        { label: "🤝 Influencer Cost", value: fmt(totalInfCost), sub: pct(totalInfCost, totalGross) + " of Revenue", color: "#a855f7" },
    ];

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Main KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                <KpiCard label="{t('pnl.p_1')}" value={"\u20a9" + fmtM(totalGross)} color="#4f8ef7" icon="💰" />
                <KpiCard label="{t('pnl.p_2')}" value={"\u20a9" + fmtM(totalAdSpend)} color="#f97316" icon="📣" sub={pct(totalAdSpend, totalGross)} />
                <KpiCard label="{t('pnl.p_3')}" value={"\u20a9" + fmtM(totalFees)} color="#ef4444" icon="🏪" sub={pct(totalFees, totalGross)} />
                <KpiCard label="{t('pnl.p_14')}" value={"\u20a9" + fmtM(totalInfCost)} color="#a855f7" icon="🤝" />
                <KpiCard label="{t('pnl.p_5')}" value={"\u20a9" + fmtM(totalNet)} color="#22c55e" icon="✅" />
                <KpiCard label="{t('pnl.p_6')}" value={"\u20a9" + fmtM(totalProfit)} color={totalProfit >= 0 ? "#22c55e" : "#ef4444"} icon="📊"
                    sub={pct(totalProfit, totalGross) + " margin"} alert={totalProfit < 0} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                <KpiCard label="{t('pnl.p_7')}" value={totalOrders.toLocaleString() + " orders"} color="#4f8ef7" icon="🛒" />
                <KpiCard label="{t('pnl.p_8')}" value={totalReturns + " orders"} color={totalReturns / totalOrders > 0.12 ? "#ef4444" : "#eab308"}
                    icon="↩" sub={pct(totalReturns, totalOrders) + " return rate"}
                    alert={totalReturns / totalOrders > 0.12} />
                <KpiCard label="{t('pnl.p_9')}" value={anomalies.length + " items"} color="#ef4444" icon="⚠"
                    sub={anomalies.filter(a => a.level === "high").length + " immediate actions"} alert={anomalies.length > 0} />
                <KpiCard label="{t('pnl.p_10')}" value={r2(skuPnL.reduce((s, p) => s + p.adRevenue, 0) / totalAdSpend) + "x"}
                    color="#eab308" icon="📈" />
            </div>

            {/* Waterfall P&L */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>🌊 P&L Waterfall — 3-Domain Integrated</div>
                <div style={{ display: "grid", gap: 8 }}>
                    {[
                        ["{t('pnl.p_1')}", totalGross, "#4f8ef7", false],
                        ["(-) Ad Spend", -totalAdSpend, "#f97316", false],
                        ["(-) Platform Fee", -totalFees, "#ef4444", false],
                        ["(-) Influencer", -totalInfCost, "#a855f7", false],
                        ["= Net Profit", totalProfit, "#22c55e", true],
                    ].map(([l, v, col, bold]) => {
                        const max = totalGross;
                        return (
                            <div key={l} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{
                                    width: 160, fontSize: 11, fontWeight: bold ? 800 : 400,
                                    color: bold ? col : "var(--text-2)", flexShrink: 0
                                }}>{l}</div>
                                <MiniBar v={v} max={max} color={col} h={bold ? 8 : 5} />
                                <div style={{
                                    width: 100, textAlign: "right", fontFamily: "monospace",
                                    fontWeight: bold ? 800 : 700, fontSize: bold ? 13 : 11, color: col
                                }}>
                                    {v >= 0 ? "₩" + fmtM(v) : "-₩" + fmtM(-v)}
                                </div>
                                <div style={{ width: 60, textAlign: "right", fontSize: 10, color: "var(--text-3)" }}>
                                    {pct(Math.abs(v), totalGross)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Domain breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                {[
                    {
                        label: "📣 Ad Domain", icon: "📣", color: "#f97316",
                        rows: [["Total Ad Spend", fmt(totalAdSpend)], ["Contributed Revenue", fmt(skuPnL.reduce((s, p) => s + p.adRevenue, 0))],
                        ["{t('pnl.p_10')}", r2(skuPnL.reduce((s, p) => s + p.adRevenue, 0) / totalAdSpend) + "x"],
                        ["Campaigns", ADS.length + " active"]]
                    },
                    {
                        label: "🏪 Market Domain", icon: "🏪", color: "#ef4444",
                        rows: [["{t('pnl.p_7')}", totalOrders + " orders"], ["{t('pnl.p_8')}", totalReturns + " (" + pct(totalReturns, totalOrders) + ")"],
                        ["{t('pnl.p_3')}", fmt(totalFees)], ["{t('pnl.p_5')}", fmt(totalNet)]]
                    },
                    {
                        label: "🤝 Influencer", icon: "🤝", color: "#a855f7",
                        rows: [["Creators", INFLUENCERS.length + " people"], ["Contract Cost", fmt(totalInfCost)],
                        ["Contributed Revenue", fmt(INFLUENCERS.reduce((s, i) => s + i.perfRevenue, 0))],
                        ["Coupon Discount", fmt(INFLUENCERS.reduce((s, i) => s + i.couponDiscount, 0))]]
                    },
                ].map(d => (
                    <div key={d.label} className="card card-glass" style={{ padding: 16, borderLeft: `3px solid ${d.color}` }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>{d.label}</div>
                        {d.rows.map(([l, v]) => (
                            <div key={l} style={{
                                display: "flex", justifyContent: "space-between",
                                padding: "6px 0", borderBottom: "1px solid rgba(99,140,255,0.06)", fontSize: 11
                            }}>
                                <span style={{ color: "var(--text-3)" }}>{l}</span>
                                <span style={{ fontWeight: 700 }}>{v}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   TAB 2: Unit P&L
════════════════════════════════════════════════════════════════ */
function PnLTab({ skuPnL }) { 
    const { t } = useI18n();
    const [dim, setDim] = useState("sku"); // sku | channel | campaign | creator

    const rows = useMemo(() => {
        if (dim === "sku") return skuPnL.map(p => ({
            key: p.sku, label: SKU_META[p.sku].name, sub: p.sku, color: SKU_META[p.sku].color,
            revenue: p.mktGross, adCost: p.adSpend, fees: p.mktFees, infCost: p.infCost,
            netProfit: p.netProfit, returns: p.mktReturns, orders: p.mktOrders,
            roas: p.roas, returnRate: p.returnRate, couponRate: p.couponRate,
        }));
        if (dim === "channel") return ORDERS.map(o => {
            const ads = ADS.filter(a => a.channel === o.channel);
            const inf = INFLUENCERS.filter(i => i.channel === o.channel);
            const adCost = ads.reduce((s, a) => s + a.spend, 0);
            const infCost = inf.reduce((s, i) => s + i.contractFee + i.perfRevenue * i.perfRate, 0);
            return {
                key: o.id, label: o.channel, sub: o.sku, color: "#4f8ef7",
                revenue: o.grossSales, adCost, fees: o.platformFee, infCost,
                netProfit: o.netPayout - adCost - infCost, returns: o.returns, orders: o.orders,
                roas: adCost > 0 ? ads.reduce((s, a) => s + a.revenue, 0) / adCost : null,
                returnRate: o.returns / o.orders, couponRate: o.couponDiscount / o.grossSales
            };
        });
        if (dim === "campaign") return ADS.map(a => ({
            key: a.id, label: a.campaign, sub: a.channel + " · " + a.sku, color: "#4f8ef7",
            revenue: a.revenue, adCost: a.spend, fees: 0, infCost: 0,
            netProfit: a.revenue - a.spend, returns: "-", orders: a.orders,
            roas: a.roas, returnRate: null, couponRate: null,
        }));
        if (dim === "creator") return INFLUENCERS.map(i => {
            const cost = i.contractFee + i.perfRevenue * i.perfRate;
            return {
                key: i.id, label: i.name, sub: i.tier + " · " + i.channel, color: "#a855f7",
                revenue: i.perfRevenue, adCost: 0, fees: 0, infCost: cost,
                netProfit: i.perfRevenue - cost, returns: "-", orders: i.orders,
                roas: cost > 0 ? i.perfRevenue / cost : null,
                returnRate: null, couponRate: i.couponDiscount / i.perfRevenue
            };
        });
        return [];
    }, [dim]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 6 }}>
                {[["sku", "{t('pnl.p_15')}"], ["channel", "{t('pnl.p_16')}"], ["campaign", "{t('pnl.p_17')}"], ["creator", "{t('pnl.p_18')}"]].map(([k, l]) => (
                    <button key={k} onClick={() => setDim(k)} style={{
                        padding: "5px 14px", borderRadius: 8, border: "1px solid",
                        borderColor: dim === k ? "#4f8ef7" : "var(--border)",
                        background: dim === k ? "rgba(79,142,247,0.12)" : "transparent",
                        color: dim === k ? "#4f8ef7" : "var(--text-3)", fontSize: 11, cursor: "pointer", fontWeight: 700,
                    }}>{l}</button>
                ))}
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{dim === "sku" ? "SKU" : dim === "channel" ? "Channel" : dim === "campaign" ? "Campaign" : "Creator"}</th>
                                <th style={{ textAlign: "right" }}>Revenue</th>
                                <th style={{ textAlign: "right" }}>Ad Spend</th>
                                <th style={{ textAlign: "right" }}>Fee</th>
                                <th style={{ textAlign: "right" }}>Influencer</th>
                                <th style={{ textAlign: "right" }}>Net Profit</th>
                                <th style={{ textAlign: "right" }}>Margin</th>
                                <th style={{ textAlign: "right" }}>ROAS</th>
                                <th style={{ textAlign: "right" }}>Return Rate</th>
                                <th style={{ textAlign: "right" }}>Coupon Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const margin = r.revenue > 0 ? r.netProfit / r.revenue : 0;
                                const roasBad = r.roas && r.roas < THRESHOLDS.roas_min;
                                const retBad = r.returnRate && r.returnRate > THRESHOLDS.returnRate_max;
                                const coupBad = r.couponRate && r.couponRate > THRESHOLDS.couponRate_max;
                                return (
                                    <tr key={r.key}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{
                                                    width: 8, height: 8, borderRadius: "50%",
                                                    background: r.color, display: "inline-block", flexShrink: 0
                                                }} />
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{r.label}</div>
                                                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>{r.sub}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>₩{fmtM(r.revenue)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#f97316" }}>
                                            {r.adCost > 0 ? "₩" + fmtM(r.adCost) : "—"}
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#ef4444" }}>
                                            {r.fees > 0 ? "₩" + fmtM(r.fees) : "—"}
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "#a855f7" }}>
                                            {r.infCost > 0 ? "₩" + fmtM(r.infCost) : "—"}
                                        </td>
                                        <td style={{
                                            textAlign: "right", fontFamily: "monospace", fontWeight: 800,
                                            color: r.netProfit >= 0 ? "#22c55e" : "#ef4444"
                                        }}>
                                            {r.netProfit >= 0 ? "₩" : "-₩"}{fmtM(Math.abs(r.netProfit))}
                                        </td>
                                        <td style={{
                                            textAlign: "right", fontWeight: 700,
                                            color: margin >= 0.2 ? "#22c55e" : margin >= 0.1 ? "#eab308" : "#ef4444"
                                        }}>
                                            {pct(r.netProfit, r.revenue)}
                                        </td>
                                        <td style={{
                                            textAlign: "right", fontWeight: 800,
                                            color: roasBad ? "#ef4444" : r.roas && r.roas >= 5 ? "#22c55e" : "#eab308"
                                        }}>
                                            {r.roas ? r.roas.toFixed(2) + "x" : "—"}
                                        </td>
                                        <td style={{
                                            textAlign: "right", fontWeight: 700,
                                            color: retBad ? "#ef4444" : "var(--text-2)"
                                        }}>
                                            {r.returnRate != null ? pct(r.returnRate * 100, 100) + "*" : "—"}
                                        </td>
                                        <td style={{
                                            textAlign: "right", fontWeight: 700,
                                            color: coupBad ? "#eab308" : "var(--text-2)"
                                        }}>
                                            {r.couponRate != null ? pct(r.couponRate * 100, 100) + "*" : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 8 }}>* Color coding: 🔴 exceeds threshold · 🟡 caution · ✅ normal</div>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   TAB 3: Anomaly Detection
════════════════════════════════════════════════════════════════ */
const ANOM_COLOR = { "ROAS\u2193": "#ef4444", "Campaign ROAS\u2193": "#f97316", "Return Rate\u2191": "#a855f7", "Coupon Abuse": "#eab308", "Fee Deduction\u2191": "#06b6d4", "Overpayment": "#ec4899" };

function AnomalyTab({ anomalies }) { 
    const { t } = useI18n();
    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {["ROAS↓", "Return Rate↑", "Coupon Abuse", "Fee Deduction↑"].map(type => {
                    const cnt = anomalies.filter(a => a.type === type || a.type === type.replace("↓", "") + "↓").length +
                        (type === "ROAS↓" ? anomalies.filter(a => a.type === "Campaign ROAS↓").length : 0);
                    return (
                        <KpiCard key={type} label={type} value={cnt + " items"} color={ANOM_COLOR[type] || "#ef4444"}
                            icon={type === "ROAS↓" ? "📉" : type === "Return Rate↑" ? "↩" : type === "Coupon Abuse" ? "🏷" : "💸"}
                            alert={cnt > 0} />
                    );
                })}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
                {anomalies.map((a, i) => (
                    <div key={i} style={{
                        padding: "12px 18px", borderRadius: 12,
                        background: `rgba(${a.level === "high" ? "239,68,68" : "234,179,8"},0.06)`,
                        border: `1px solid rgba(${a.level === "high" ? "239,68,68" : "234,179,8"},0.2)`,
                        display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap"
                    }}>
                        <div style={{ fontSize: 20 }}>{a.level === "high" ? "🔴" : "🟡"}</div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                                <Chip label={a.type} color={ANOM_COLOR[a.type] || "#ef4444"} />
                                <Chip label={a.level === "high" ? "Immediate Action" : "Caution"} color={a.level === "high" ? "#ef4444" : "#eab308"} />
                                <Chip label={a.sku} color="#4f8ef7" />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 12 }}>{a.msg}</div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>→ {a.detail}</div>
                        </div>
                        <Chip label={a.action === "budget" ? "Budget Realloc" : a.action === "product" ? "Product Action" : a.action === "creator" ? "Creator" : a.action === "coupon" ? "Coupon Adjust" : "Channel Adjust"} color="#6366f1" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   TAB 4: Action Recommendations
════════════════════════════════════════════════════════════════ */
function ActionTab({ actions }) { 
    const { t } = useI18n();
    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{
                fontSize: 11, color: "var(--text-3)", padding: "8px 12px", borderRadius: 8,
                background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)"
            }}>
                💡 Auto-generated action plan based on anomaly detection results. Please review with your team before execution.
            </div>
            {actions.map((a, i) => (
                <div key={i} className="card card-glass" style={{ padding: 20, borderLeft: `3px solid ${a.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 22 }}>{a.icon}</span>
                            <div>
                                <div style={{ display: "flex", gap: 8, marginBottom: 3 }}>
                                    <Chip label={a.priority} color={a.priority === "P1" ? "#ef4444" : "#eab308"} />
                                    <Chip label={a.type === "budget" ? "Budget Realloc" : a.type === "product" ? "Product Ops" : a.type === "creator" ? "Creator" : a.type === "coupon" ? "Coupon Adjust" : "Market"} color={a.color} />
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 15 }}>{a.title}</div>
                            </div>
                        </div>
                        <div style={{
                            padding: "6px 14px", borderRadius: 8,
                            background: `${a.color}12`, border: `1px solid ${a.color}30`,
                            fontSize: 11, color: a.color, fontWeight: 700
                        }}>
                            {a.impact}
                        </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>{a.desc}</div>
                    <div style={{ display: "grid", gap: 5, marginBottom: 14 }}>
                        {a.detail.map((d, j) => (
                            <div key={j} style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-3)" }}>
                                <span>→</span><span>{d}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn-primary" style={{
                            fontSize: 11, padding: "6px 16px",
                            background: `linear-gradient(135deg,${a.color},${a.color}aa)`
                        }}>Execute Now</button>
                        <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }}>Later</button>
                        <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }}>Download Report</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   TAB 5: Forecast P&L Simulation
════════════════════════════════════════════════════════════════ */
function ForecastTab() { 
    const { t } = useI18n();
    const [growthRate, setGrowthRate] = React.useState(15);
    const [adRatio, setAdRatio] = React.useState(12);
    const [feeRatio, setFeeRatio] = React.useState(10);
    const [returnRatePct, setReturnRatePct] = React.useState(8);
    const [months, setMonths] = React.useState(6);

    const baseRevenue = 836760000;
    const forecastRows = Array.from({ length: months }, (_, i) => {
        const m = i + 1;
        const revenue = Math.round(baseRevenue * Math.pow(1 + growthRate / 100, m / 12));
        const adCost = Math.round(revenue * adRatio / 100);
        const fees = Math.round(revenue * feeRatio / 100);
        const returns = Math.round(revenue * returnRatePct / 100);
        const netProfit = revenue - adCost - fees - returns;
        const margin = (netProfit / revenue * 100).toFixed(1);
        return { m, revenue, adCost, fees, returns, netProfit, margin };
    });

    const totalForecastRevenue = forecastRows.reduce((s, r) => s + r.revenue, 0);
    const totalForecastProfit = forecastRows.reduce((s, r) => s + r.netProfit, 0);

    const slider = (label, val, set, min, max, unit = '%') => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-3)' }}>{label}</span>
                <strong style={{ color: '#4f8ef7' }}>{val}{unit}</strong>
            </div>
            <input type="range" min={min} max={max} value={val}
                onChange={e => set(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#4f8ef7' }} />
        </div>
    );

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>🔮 Forecast P&L Simulation</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Future P&L by growth rate, ad spend, fees, and return rate scenarios</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', display: 'grid', gap: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Parameter Settings</div>
                    {slider('Monthly Growth Rate', growthRate, setGrowthRate, 0, 50)}
                    {slider('Ad Spend Ratio', adRatio, setAdRatio, 5, 30)}
                    {slider('Platform Fee Rate', feeRatio, setFeeRatio, 5, 20)}
                    {slider('Return Rate', returnRatePct, setReturnRatePct, 2, 20)}
                    {slider('Forecast Period', months, setMonths, 3, 12, ' mo')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                        <div style={{ textAlign: 'center', padding: 10, background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Forecast Annual Revenue</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#22c55e' }}>₩{(totalForecastRevenue / 1e8).toFixed(1)}B</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 10, background: 'rgba(79,142,247,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Forecast Net Profit</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: totalForecastProfit > 0 ? '#4f8ef7' : '#ef4444' }}>₩{(totalForecastProfit / 1e8).toFixed(1)}B</div>
                        </div>
                    </div>
                </div>
                <div style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'rgba(79,142,247,0.08)' }}>
                                {['Month', 'Revenue', 'Ad Spend', 'Fee', 'Returns', 'Net Profit', 'Margin'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Month' ? 'left' : 'right', color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {forecastRows.map(r => (
                                <tr key={r.m} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>+{r.m}M</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#4f8ef7', fontWeight: 700 }}>₩{(r.revenue / 1e6).toFixed(1)}M</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#f97316' }}>₩{(r.adCost / 1e6).toFixed(1)}M</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#ef4444' }}>₩{(r.fees / 1e6).toFixed(1)}M</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#a855f7' }}>₩{(r.returns / 1e6).toFixed(1)}M</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: r.netProfit >= 0 ? '#22c55e' : '#ef4444' }}>₩{(r.netProfit / 1e6).toFixed(1)}M</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: Number(r.margin) >= 15 ? '#22c55e' : Number(r.margin) >= 8 ? '#f59e0b' : '#ef4444' }}>{r.margin}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════ */
const TABS = [
    { id: "overview", label: "🌊 Unified P&L", desc: "3-Domain Integrated Waterfall" },
    { id: "pnl", label: "📊 Unit P&L", desc: "SKU / Channel / Campaign / Creator" },
    { id: "anomaly", label: "⚠ Anomalies", desc: "ROAS↓ / Returns↑ / Coupon Abuse" },
    { id: "action", label: "🚀 Action Plan", desc: "Budget / Contract / Product Ops" },
    { id: "forecast", label: "🔮 Forecast P&L", desc: "Scenario-based Future Simulation" },
];

export default function PnLDashboard() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    // ✅ Real-time GlobalDataContext integration
    const { pnlStats, settlementStats, budgetStats, orderStats, inventory, lowStockCount, totalInventoryValue } = useGlobalData();

    const [tab, setTab] = useState("overview");

    // Local analysis data (for anomaly detection / action recommendations)
    const skuPnL = useMemo(() => SKUS.map(buildSkuPnL), []);
    const anomalies = useMemo(() => detectAnomalies(skuPnL), [skuPnL]);
    const actions = useMemo(() => buildActions(skuPnL, anomalies), [skuPnL, anomalies]);
    const highCount = anomalies.filter(a => a.level === "high").length;

    // ✅ Live unified P&L (GlobalDataContext)
    const live = {
        grossRevenue: pnlStats.revenue,
        adSpend: pnlStats.adSpend,
        platformFee: pnlStats.platformFee,
        couponDiscount: pnlStats.couponDiscount,
        returnFee: pnlStats.returnFee,
        cogs: pnlStats.cogs,
        grossProfit: pnlStats.grossProfit,
        operatingProfit: pnlStats.operatingProfit,
        netPayout: pnlStats.netPayout,
        pendingPayout: settlementStats.pendingAmount,
        roas: budgetStats.blendedRoas,
        totalOrders: orderStats.count + settlementStats.totalOrders,
        totalReturns: settlementStats.totalReturns,
        returnRate: settlementStats.returnRate,
        inventoryValue: totalInventoryValue,
        lowStock: lowStockCount,
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Header */}
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(239,68,68,0.06),rgba(79,142,247,0.05))",
                borderColor: "rgba(239,68,68,0.15)"
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(79,142,247,0.15))" }}>🌊</div>
                    <div>
                        <div className="hero-title" style={{
                            background: "linear-gradient(135deg,#ef4444,#4f8ef7)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                        }}>Unified P&L Dashboard</div>
                        <div className="hero-desc">
                            Ad Spend · Settlement · Inventory COGS · Influencer — Real-time Unified P&L · Anomaly Detection
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            <span className="badge" style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
                                🔴 Live · Revenue ₩{(live.grossRevenue / 1e6).toFixed(1)}M
                            </span>
                            <span className="badge" style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                                Ad Spend ₩{(live.adSpend / 1e6).toFixed(1)}M
                            </span>
                            <span className="badge" style={{ background: "rgba(79,142,247,0.12)", color: "#60a5fa", border: "1px solid rgba(79,142,247,0.25)" }}>
                                Settlement ₩{(live.netPayout / 1e6).toFixed(1)}M
                            </span>
                            {live.pendingPayout > 0 && (
                                <span className="badge" style={{ background: "rgba(234,179,8,0.12)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.25)" }}>
                                    Pending ₩{(live.pendingPayout / 1e6).toFixed(1)}M
                                </span>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            <button onClick={() => navigate('/budget-planner')} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>💰 Budget Mgmt →</button>
                            <button onClick={() => navigate('/wms')} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>🏭 Inventory →</button>
                            <button onClick={() => navigate('/kr-channel')} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>⚖️ Reconciliation →</button>
                            <button onClick={() => navigate('/omni-channel')} style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>📡 Channel Orders →</button>
                        </div>
                    </div>
                </div>

                {/* 실Time P&L Summary 행 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginTop: 16 }}>
                    {[
                        { label: "{t('pnl.p_1')}", v: live.grossRevenue, col: "#4f8ef7", icon: "💰" },
                        { label: "{t('pnl.p_2')}", v: -live.adSpend, col: "#f97316", icon: "📣" },
                        { label: "Platform Commission", v: -live.platformFee, col: "#ef4444", icon: "🏪" },
                        { label: "Stock Cost Price(COGS)", v: -live.cogs, col: "#a855f7", icon: "📦" },
                        { label: "정산 순지급", v: live.netPayout, col: "#22c55e", icon: "✅" },
                        {
                            label: "영업Profit", v: live.operatingProfit, col: live.operatingProfit >= 0 ? "#22c55e" : "#ef4444", icon: "📊",
                            sub: (live.grossRevenue > 0 ? (live.operatingProfit / live.grossRevenue * 100).toFixed(1) : 0) + "% 마진"
                        },
                    ].map(k => (
                        <KpiCard key={k.label} label={k.label} value={"₩" + fmtM(Math.abs(k.v))}
                            sub={k.sub || (k.v < 0 ? "Cost" : "Profit")} color={k.col} icon={k.icon}
                            alert={k.v < 0 && k.label !== "영업Profit"} />
                    ))}
                </div>

                {highCount > 0 && (
                    <div style={{
                        marginTop: 10, padding: "6px 14px", borderRadius: 8,
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                        fontSize: 11, color: "#ef4444", display: "inline-flex", gap: 6, alignItems: "center"
                    }}>
                        🔴 Immediate action required: {highCount} items — check the Anomalies tab
                    </div>
                )}
            </div>

            {/* Tab 네비게이션 */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === t.id ? "rgba(79,142,247,0.1)" : "transparent",
                            borderBottom: `2px solid ${tab === t.id ? "#4f8ef7" : "transparent"}`, transition: "all 200ms",
                            position: "relative",
                        }}>
                            {t.id === "anomaly" && highCount > 0 && (
                                <span style={{
                                    position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: "50%",
                                    background: "#ef4444", fontSize: 9, fontWeight: 900, color: "#fff",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                }}>{highCount}</span>
                            )}
                            <div style={{ fontSize: 13, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab 콘텐츠 */}
            <div className="card card-glass fade-up fade-up-2">
                {/* ✅ OverviewTab: 실Time P&L Waterfall Add */}
                {tab === "overview" && (
                    <div style={{ display: "grid", gap: 16 }}>
                        {/* 실Time Waterfall */}
                        <div className="card card-glass" style={{ padding: 20, background: "linear-gradient(135deg,rgba(34,197,94,0.04),rgba(79,142,247,0.03))", border: "1px solid rgba(34,197,94,0.15)" }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#4ade80" }}>🔴 실Time P&L Waterfall (GlobalDataContext Integration)</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 14 }}>Ad Spend 집행·Orders·정산·Stock Change이 즉시 반영됩니다</div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {[
                                    ["Total Revenue (정산기준)", live.grossRevenue, "#4f8ef7", false],
                                    ["(-) Stock Cost Price COGS", -live.cogs, "#a855f7", false],
                                    ["= RevenueTotalProfit", live.grossProfit, "#22c55e", false],
                                    ["(-) Ad Spend", -live.adSpend, "#f97316", false],
                                    ["(-) Platform Commission", -live.platformFee, "#ef4444", false],
                                    ["(-) Coupon 할인", -live.couponDiscount, "#eab308", false],
                                    ["(-) 반품 처리비", -live.returnFee, "#ec4899", false],
                                    ["= 영업Profit", live.operatingProfit, live.operatingProfit >= 0 ? "#22c55e" : "#ef4444", true],
                                ].map(([l, v, col, bold]) => {
                                    const max = live.grossRevenue || 1;
                                    return (
                                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 180, fontSize: 11, fontWeight: bold ? 800 : 400, color: bold ? col : "var(--text-2)", flexShrink: 0 }}>{l}</div>
                                            <MiniBar v={v} max={max} color={col} h={bold ? 8 : 5} />
                                            <div style={{ width: 110, textAlign: "right", fontFamily: "monospace", fontWeight: bold ? 800 : 700, fontSize: bold ? 13 : 11, color: col }}>
                                                {v >= 0 ? "₩" + fmtM(v) : "-₩" + fmtM(-v)}
                                            </div>
                                            <div style={{ width: 60, textAlign: "right", fontSize: 10, color: "var(--text-3)" }}>
                                                {pct(Math.abs(v), max)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* 기존 Overview (로컬 데이터 Analysis용) */}
                        <OverviewTab skuPnL={skuPnL} anomalies={anomalies} />
                    </div>
                )}
                {tab === "pnl" && <PnLTab skuPnL={skuPnL} />}
                {tab === "anomaly" && <AnomalyTab anomalies={anomalies} />}
                {tab === "action" && <ActionTab actions={actions} />}
                {tab === "forecast" && <ForecastTab />}
            </div>
        </div>
    );
}
