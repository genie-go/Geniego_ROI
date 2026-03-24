import React, { useState, useMemo } from "react";
import { useI18n } from "../i18n/index.js";
import InfluencerDemographics, { DEFAULT_DEMOGRAPHICS } from '../components/InfluencerDemographics.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';


/* ─── utils ───────────────────────────────────────────────────────── */
// currency formatting via useCurrency fmt()
const fmtM = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(v);
const pct = v => (Number(v) * 100).toFixed(1) + "%";
const today = new Date("2026-03-04");
const daysLeft = d => Math.ceil((new Date(d) - today) / (864e5));

/* ─── shared components ──────────────────────────────────────────── */
const Tag = ({ label, color = "#4f8ef7", bg }) => (
    <span style={{
        fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
        background: bg || color + "18", color, border: `1px solid ${color}33`
    }}>{label}</span>
);

const Bar = ({ v, max = 1, color = "#4f8ef7", h = 4 }) => (
    <div style={{ height: h, background: "rgba(255,255,255,0.06)", borderRadius: h, width: "100%" }}>
        <div style={{ width: `${Math.min(100, (v / max) * 100)}%`, height: "100%", background: color, borderRadius: h, transition: "width .5s" }} />
    </div>
);

const KpiCard = ({ label, value, sub, color = "#4f8ef7", icon }) => (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${color}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 18, opacity: .7 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color, marginTop: 6 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{sub}</div>}
    </div>
);

/* ─── DATA ────────────────────────────────────────────────────────── */
const CREATORS = [
    {
        id: "C001", name: "Tech Unboxing",
        identities: [
            { type: "youtube", handle: "@tech_unboxing_kr", id: "UCabc123", email: "ub@gmail.com", verified: true },
            { type: "instagram", handle: "@tech.unboxing.kr", id: "inst_tu_kr", email: "ub@gmail.com", verified: true },
            { type: "tiktok", handle: "@techunboxing", id: "tt_7821", email: "ub_alt@naver.com", verified: false },
        ],
        duplicateFlag: false, tier: "Micro", country: "KR",
        contract: {
            type: "flat+perf", flatFee: 350000, perfRate: 0.02, perfBase: "revenue",
            rights: "commercial+resell", period: ["2025-06-01", "2026-12-31"],
            whitelist: true, whitelistExpiry: "2026-09-01", esign: "signed"
        },
        stats: { views: 131000, orders: 342, revenue: 41040000, adSpend: 350000 },
        content: [
            { id: "v1", title: "WH-1000XM5 Review", platform: "youtube", views: 89000, orders: 187, revenue: 22440000, engRate: 0.062 },
            { id: "v2", title: "RGB Keyboard Comparison", platform: "youtube", views: 42000, orders: 155, revenue: 18600000, engRate: 0.051 },
        ],
        settle: { due: 350000 + 41040000 * 0.02, paid: 350000, status: "partial", period: "2026-02", docs: ["contract_C001.pdf"] },
        demographics: {
            gender: { male: 72, female: 28 },
            age: { '10-19': 8, '20-29': 38, '30-39': 36, '40-49': 14, '50+': 4 },
            top_regions: [{ region: 'Seoul', pct: 42 }, { region: 'Gyeonggi', pct: 24 }, { region: 'Busan', pct: 12 }, { region: 'Daejeon', pct: 9 }, { region: 'Incheon', pct: 7 }],
            engagement_by_gender: { male_er: 6.2, female_er: 4.8 },
            engagement_by_age: { '10-19': 7.1, '20-29': 6.8, '30-39': 4.2, '40-49': 2.8, '50+': 1.2 },
            purchase_contribution: {
                by_gender: { male: 68, female: 32 },
                by_age: { '20-29': 42, '30-39': 36, '40-49': 14, 'other': 8 },
                by_region: { 'Seoul/Gyeonggi': 62, 'Busan/Gyeongnam': 16, 'Other': 22 },
            },
        },
    },
    {
        id: "C002", name: "Daily Gadget",
        identities: [
            { type: "instagram", handle: "@daily_gadget_life", id: "inst_dg", email: "dg@kakao.com", verified: true },
            { type: "youtube", handle: "@dailygadget", id: "UCdef456", email: "dg@kakao.com", verified: false },
        ],
        duplicateFlag: false, tier: "Mid", country: "KR",
        contract: {
            type: "flat", flatFee: 800000, perfRate: 0, perfBase: null,
            rights: "commercial", period: ["2025-09-01", "2026-06-15"],
            whitelist: true, whitelistExpiry: "2026-06-15", esign: "signed"
        },
        stats: { views: 254000, orders: 218, revenue: 26160000, adSpend: 800000 },
        content: [
            { id: "v3", title: "4K Webcam Unboxing", platform: "instagram", views: 156000, orders: 130, revenue: 15600000, engRate: 0.041 },
            { id: "v4", title: "Home Office Setup", platform: "instagram", views: 98000, orders: 88, revenue: 10560000, engRate: 0.035 },
        ],
        settle: { due: 800000, paid: 800000, status: "paid", period: "2026-01", docs: ["settle_C002_jan.pdf", "receipt_C002.pdf"] },
    },
    {
        id: "C003", name: "TechVibe",
        identities: [
            { type: "tiktok", handle: "@tiktok_techvibe", id: "tt_9901", email: "tv@naver.com", verified: true },
            { type: "instagram", handle: "@techvibe.official", id: "inst_tv", email: "tv@naver.com", verified: true },
            { type: "youtube", handle: "@TechVibeKR", id: "UCghi789", email: "tv_biz@gmail.com", verified: false },
        ],
        duplicateFlag: true, tier: "Macro", country: "KR",
        contract: {
            type: "perf", flatFee: 0, perfRate: 0.025, perfBase: "revenue",
            rights: "commercial+resell+exclusive", period: ["2025-01-01", "2026-08-31"],
            whitelist: true, whitelistExpiry: "2025-12-31", esign: "signed"
        },
        stats: { views: 1980000, orders: 890, revenue: 89000000, adSpend: 0 },
        content: [
            { id: "v5", title: "Noise-Cancelling Headphone Challenge", platform: "tiktok", views: 1200000, orders: 510, revenue: 51000000, engRate: 0.089 },
            { id: "v6", title: "USB Hub Tips", platform: "tiktok", views: 780000, orders: 380, revenue: 38000000, engRate: 0.071 },
        ],
        settle: { due: 89000000 * 0.025, paid: 89000000 * 0.025, status: "paid", period: "2026-02", docs: ["perf_settle_C003.pdf"] },
    },
    {
        id: "C004", name: "Beauty Tech Jina",
        identities: [
            { type: "instagram", handle: "@beautytech_jina", id: "inst_bj", email: "jina@gmail.com", verified: true },
            { type: "instagram", handle: "@jina.official", id: "inst_bj2", email: "jina2@gmail.com", verified: false },
        ],
        duplicateFlag: true, tier: "Nano", country: "KR",
        contract: {
            type: "flat", flatFee: 120000, perfRate: 0, perfBase: null,
            rights: "organic_only", period: ["2025-11-01", "2026-04-30"],
            whitelist: false, whitelistExpiry: null, esign: "pending"
        },
        stats: { views: 38000, orders: 12, revenue: 960000, adSpend: 120000 },
        content: [
            { id: "v7", title: "Beauty Device Unboxing", platform: "instagram", views: 38000, orders: 12, revenue: 960000, engRate: 0.093 },
        ],
        settle: { due: 120000, paid: 0, status: "unpaid", period: "2026-02", docs: [] },
    },
    {
        id: "C005", name: "IT Tips Haejin",
        identities: [
            { type: "youtube", handle: "@it_tips_hj", id: "UCjkl012", email: "hj@naver.com", verified: true },
        ],
        duplicateFlag: false, tier: "Micro", country: "KR",
        contract: {
            type: "flat+perf", flatFee: 200000, perfRate: 0.015, perfBase: "revenue",
            rights: "commercial", period: ["2025-10-01", "2026-09-30"],
            whitelist: false, whitelistExpiry: null, esign: "signed"
        },
        stats: { views: 890000, orders: 28, revenue: 2800000, adSpend: 200000 },
        content: [
            { id: "v8", title: "10 Keyboard Comparison Review", platform: "youtube", views: 540000, orders: 14, revenue: 1400000, engRate: 0.021 },
            { id: "v9", title: "Mouse Recommendation Video", platform: "youtube", views: 350000, orders: 14, revenue: 1400000, engRate: 0.019 },
        ],
        settle: { due: 200000 + 2800000 * 0.015, paid: 200000 + 2800000 * 0.015 * 1.15, status: "overpaid", period: "2026-02", docs: ["settle_C005.pdf"] },
    },
];

const TIER_COLOR = { Nano: "#14d9b0", Micro: "#4f8ef7", Mid: "#a855f7", Macro: "#f97316" };
const PLAT_ICO = { youtube: "▶", instagram: "📸", tiktok: "🎵" };
const ESIGN_COL = { signed: "#22c55e", pending: "#eab308", rejected: "#ef4444" };

/* ── UGC Reviews 데이터 ─────────────────────────────────────── */
const MOCK_REVIEWS = [
    { id: 1, channel: "Amazon KR", product: "Noise-Cancelling Headphones XM5", rating: 5, sentiment: "positive", text: "Exceptional sound quality. Best noise cancelling!", category: "Sound Quality", date: "2026-03-03", helpful: 42 },
    { id: 2, channel: "Coupang", product: "RGB Mechanical Keyboard MX", rating: 4, sentiment: "positive", text: "Great typing feel and beautiful RGB. Fast delivery.", category: "Typing Feel", date: "2026-03-03", helpful: 28 },
    { id: 3, channel: "Naver", product: "USB4 7-Port Hub Pro", rating: 2, sentiment: "negative", text: "Screen flickering when connecting 4K monitor. Waiting for support.", category: "Compatibility", date: "2026-03-02", helpful: 15 },
    { id: 4, channel: "Amazon KR", product: "Gaming Mouse Pro X", rating: 3, sentiment: "neutral", text: "Good grip but DPI software is unstable.", category: "Software", date: "2026-03-02", helpful: 9 },
    { id: 5, channel: "Coupang", product: "Noise-Cancelling Headphones XM5", rating: 1, sentiment: "negative", text: "Package arrived damaged. Refund requested.", category: "Shipping", date: "2026-03-01", helpful: 31 },
    { id: 6, channel: "11st", product: "RGB Mechanical Keyboard MX", rating: 5, sentiment: "positive", text: "Perfect for office use. Just the right amount of noise.", category: "Noise Level", date: "2026-03-01", helpful: 19 },
    { id: 7, channel: "Amazon KR", product: "Portable Charger 20K", rating: 4, sentiment: "positive", text: "PD 45W support charges even laptops quickly.", category: "Performance", date: "2026-02-28", helpful: 37 },
    { id: 8, channel: "Naver", product: "Gaming Mouse Pro X", rating: 2, sentiment: "negative", text: "Click response started failing after 2 months. Possible durability issue.", category: "Durability", date: "2026-02-28", helpful: 22 },
];
const CHANNEL_STATS = [
    { channel: "Amazon KR", avg: 4.1, total: 2841, pos: 78, neg: 12, icon: "📦", color: "#eab308" },
    { channel: "Coupang", avg: 3.8, total: 5203, pos: 71, neg: 18, icon: "🏪", color: "#14d9b0" },
    { channel: "Naver", avg: 3.5, total: 1892, pos: 64, neg: 22, icon: "🔍", color: "#22c55e" },
    { channel: "11st", avg: 4.3, total: 987, pos: 82, neg: 9, icon: "🛒", color: "#4f8ef7" },
];
const NEG_KEYWORDS = [
    { word: "Shipping Delay", count: 43, change: +8 },
    { word: "Compatibility Issue", count: 31, change: +12 },
    { word: "Durability", count: 28, change: -3 },
    { word: "Software Bug", count: 19, change: +5 },
    { word: "Support Complaint", count: 14, change: -1 },
];
const SENTIMENT_COLOR = { positive: "#22c55e", neutral: "#eab308", negative: "#ef4444" };
const SENTIMENT_LABEL = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
function Stars({ n }) {
    return <span style={{ color: "#fde047", letterSpacing: 1, fontSize: 12 }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

/* ══════════════════════════════════════════════════════════════════
   TAB 1: Creator Identity Integration
══════════════════════════════════════════════════════════════════ */
function IdentityTab() {
    const [sel, setSel] = useState(null);
    const [merge, setMerge] = useState([]);

    const dups = CREATORS.filter(c => c.duplicateFlag);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label="Total Creators" value={CREATORS.length + "명"} color="#4f8ef7" icon="👤" />
                <KpiCard label="Duplicate Suspected" value={dups.length + "명"} color="#eab308" icon="⚠" sub="Multiple Email/Handle" />
                <KpiCard label="Unverified Channels" value={CREATORS.reduce((s, c) => s + c.identities.filter(i => !i.verified).length, 0) + "개"} color="#f97316" icon="🔓" />
                <KpiCard label="Connected Platforms" value={CREATORS.reduce((s, c) => s + c.identities.length, 0) + "개"} color="#22c55e" icon="🔗" />
            </div>

            {dups.length > 0 && (
                <div style={{
                    padding: "10px 16px", borderRadius: 10,
                    background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)",
                    fontSize: 11, color: "#eab308", display: "flex", gap: 8, alignItems: "center"
                }}>
                    ⚠ Duplicate/variant handle detected — <strong>{dups.map(d => d.name).join(", ")}</strong> Review Required
                </div>
            )}

            <div style={{ display: "grid", gap: 12 }}>
                {CREATORS.map(c => (
                    <div key={c.id} className="card card-glass" style={{
                        borderLeft: `3px solid ${TIER_COLOR[c.tier]}`,
                        outline: c.duplicateFlag ? "1px solid rgba(234,179,8,0.3)" : "none",
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>{c.name}</div>
                                <Tag label={c.tier} color={TIER_COLOR[c.tier]} />
                                {c.duplicateFlag && <Tag label="⚠ Duplicate Suspected" color="#eab308" />}
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 10px" }}
                                    onClick={() => setSel(sel === c.id ? null : c.id)}>
                                    {sel === c.id ? "▲ Collapse" : "▼ Channel Details"}
                                </button>
                                {c.duplicateFlag && (
                                    <button className="btn-primary" style={{
                                        fontSize: 10, padding: "3px 12px",
                                        background: "linear-gradient(135deg,#eab308,#f97316)"
                                    }}>🔗 Merge</button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
                            {c.identities.map((id, i) => (
                                <div key={i} style={{
                                    padding: "9px 12px", borderRadius: 10,
                                    background: "rgba(9,15,30,0.7)", border: `1px solid ${id.verified ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{PLAT_ICO[id.type]} {id.type.toUpperCase()}</span>
                                        <Tag label={id.verified ? "✓ Verified" : "Unverified"} color={id.verified ? "#22c55e" : "#ef4444"} />
                                    </div>
                                    <div style={{ fontSize: 11, color: "#4f8ef7", fontWeight: 700 }}>{id.handle}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>ID: {id.id}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{id.email}</div>
                                </div>
                            ))}
                        </div>

                        {sel === c.id && (
                            <div style={{
                                marginTop: 12, padding: 12, borderRadius: 10,
                                background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.1)"
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 6 }}>Unified Email List</div>
                                {[...new Set(c.identities.map(i => i.email))].map((em, i) => (
                                    <div key={i} style={{ fontSize: 11, padding: "4px 0", borderBottom: "1px solid rgba(99,140,255,0.06)" }}>{em}</div>
                                ))}
                                {[...new Set(c.identities.map(i => i.email))].length > 1 && (
                                    <div style={{ fontSize: 10, color: "#eab308", marginTop: 6 }}>
                                        ⚠ Multiple emails detected — please verify same person
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   TAB 2: Contract Management
══════════════════════════════════════════════════════════════════ */
function ContractTab() {
    const { fmt } = useCurrency();
    const [modal, setModal] = useState(null);

    const esignPending = CREATORS.filter(c => c.contract.esign === "pending").length;
    const wlExpiringSoon = CREATORS.filter(c => c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) <= 90 && daysLeft(c.contract.whitelistExpiry) >= 0).length;
    const wlExpired = CREATORS.filter(c => c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) < 0).length;

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label="Active Contracts" value={CREATORS.length + "건"} color="#22c55e" icon="📝" />
                <KpiCard label="e-Sign Pending" value={esignPending + "건"} color="#eab308" icon="✍" />
                <KpiCard label="Whitelist" value={CREATORS.filter(c => c.contract.whitelist).length + "명"} color="#4f8ef7" icon="📣" />
                <KpiCard label="Whitelist Expiring Soon" value={wlExpiringSoon + "건"} color="#f97316" icon="⏰" sub="Within 90 days" />
                <KpiCard label="Whitelist Expired" value={wlExpired + "건"} color="#ef4444" icon="🚫" />
            </div>

            {/* Alerts */}
            {CREATORS.filter(c => c.contract.esign === "pending").map(c => (
                <div key={c.id} style={{
                    padding: "9px 16px", borderRadius: 10,
                    background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)",
                    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11
                }}>
                    <span>✍ <strong>{c.name}</strong> — — e-Sign not completed yet (contract not effective)</span>
                    <button className="btn-primary" style={{
                        fontSize: 10, padding: "4px 12px",
                        background: "linear-gradient(135deg,#eab308,#f97316)"
                    }}>Resend Signature Request</button>
                </div>
            ))}
            {CREATORS.filter(c => c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) < 0).map(c => (
                <div key={c.id} style={{
                    padding: "9px 16px", borderRadius: 10,
                    background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
                    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11
                }}>
                    <span>🚫 <strong>{c.name}</strong> — Whitelist Expired ({c.contract.whitelistExpiry}) · Stop ad execution immediately</span>
                    <button className="btn-primary" style={{
                        fontSize: 10, padding: "4px 12px",
                        background: "linear-gradient(135deg,#ef4444,#a855f7)"
                    }}>Renew Rights</button>
                </div>
            ))}

            {/* Contract table */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📋 Contract List</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Creator</th>
                                <th>Contract Type</th>
                                <th style={{ textAlign: "right" }}>Fixed Fee</th>
                                <th style={{ textAlign: "right" }}>Performance Rate</th>
                                <th>Rights Scope</th>
                                <th>Contract Period</th>
                                <th>Whitelist</th>
                                <th style={{ textAlign: "center" }}>e-Sign</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {CREATORS.map(c => {
                                const ct = c.contract;
                                const dl = ct.whitelistExpiry ? daysLeft(ct.whitelistExpiry) : null;
                                const wlColor = dl === null ? "var(--text-3)" : dl < 0 ? "#ef4444" : dl < 90 ? "#eab308" : "#22c55e";
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{c.name}</div>
                                            <div style={{ fontSize: 9, color: "var(--text-3)" }}>{c.id}</div>
                                        </td>
                                        <td>
                                            <Tag label={ct.type === "flat" ? "Fixed" : ct.type === "perf" ? "Performance" : "Fixed+Performance"} color="#4f8ef7" />
                                        </td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(ct.flatFee)}</td>
                                        <td style={{ textAlign: "right", fontWeight: 700 }}>{ct.perfRate > 0 ? pct(ct.perfRate) : "—"}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                {ct.rights.split("+").map(r => <Tag key={r} label={r} color="#6366f1" />)}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 10 }}>
                                            <div>{ct.period[0]}</div>
                                            <div style={{ color: "var(--text-3)" }}>~ {ct.period[1]}</div>
                                        </td>
                                        <td>
                                            {ct.whitelist
                                                ? <div>
                                                    <Tag label="Allowed" color={wlColor} />
                                                    <div style={{ fontSize: 9, color: wlColor, marginTop: 2 }}>
                                                        {dl === null ? "—" : dl < 0 ? "Expired" : dl + " days left"}
                                                    </div>
                                                </div>
                                                : <Tag label="None" color="var(--text-3)" />}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <Tag label={ct.esign === "signed" ? "✓ Signed" : ct.esign === "pending" ? "⏳ Pending" : "✗ Rejected"}
                                                color={ESIGN_COL[ct.esign]} />
                                        </td>
                                        <td>
                                            <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 10px" }}
                                                onClick={() => setModal(c)}>Details</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Whitelist conversion window */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📣 Ad Conversion (Whitelisting) Window</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 14 }}>
                    Whitelist Allowed Period 내 Ad 집행 가능 Creator · Expired 전 적극 활용 권장
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                    {CREATORS.filter(c => c.contract.whitelist && c.contract.whitelistExpiry).map(c => {
                        const dl = daysLeft(c.contract.whitelistExpiry);
                        const expired = dl < 0;
                        const pctUsed = expired ? 100 : Math.max(0, 100 - (dl / 365) * 100);
                        const color = expired ? "#ef4444" : dl < 60 ? "#eab308" : "#22c55e";
                        return (
                            <div key={c.id}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                                    <span style={{ fontWeight: 700 }}>{c.name} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>{c.identities[0].handle}</span></span>
                                    <span style={{ color }}>
                                        {expired ? "Expired" : `${dl} days left · ${c.contract.whitelistExpiry} until`}
                                    </span>
                                </div>
                                <Bar v={pctUsed} max={100} color={expired ? "#ef4444" : color} h={6} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detail modal */}
            {modal && (
                <>
                    <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 300 }} />
                    <div style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        width: "min(560px,95vw)", background: "linear-gradient(180deg,#0d1525,#090f1e)",
                        border: "1px solid rgba(79,142,247,0.2)", borderRadius: 20, padding: 28, zIndex: 301,
                        boxShadow: "0 24px 64px rgba(0,0,0,0.7)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18, alignItems: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>📝 Contract Details — {modal.name}</div>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 20 }}>✕</button>
                        </div>
                        {[
                            ["Contract Type", modal.contract.type],
                            ["Fixed Fee", fmt(modal.contract.flatFee)],
                            ["Performance Rate", modal.contract.perfRate > 0 ? pct(modal.contract.perfRate) + " / " + modal.contract.perfBase : "None"],
                            ["Rights Scope", modal.contract.rights],
                            ["Contract Period", modal.contract.period.join(" ~ ")],
                            ["Whitelist", modal.contract.whitelist ? "Allowed" : "None"],
                            ["Whitelist Expired", modal.contract.whitelistExpiry || "—"],
                            ["e-Sign Status", modal.contract.esign],
                        ].map(([l, v]) => (
                            <div key={l} style={{
                                display: "flex", justifyContent: "space-between", padding: "8px 0",
                                borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12
                            }}>
                                <span style={{ color: "var(--text-3)" }}>{l}</span>
                                <span style={{ fontWeight: 700 }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>Close</button>
                            <button className="btn-primary">📄 Download Contract</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   TAB 3: Settlement Management + Auto Verification
══════════════════════════════════════════════════════════════════ */
function SettleTab() {
    const { fmt } = useCurrency();
    const [modal, setModal] = useState(null);

    const anomalies = CREATORS.filter(c =>
        c.settle.status === "overpaid" || c.settle.status === "unpaid" || c.settle.status === "partial"
    );

    const STATUS_LABEL = { paid: "Done", partial: "일부지급", unpaid: "Unpaid", overpaid: "과지급" };
    const STATUS_COLOR = { paid: "#22c55e", partial: "#eab308", unpaid: "#ef4444", overpaid: "#a855f7" };

    const calcDue = c => {
        const ct = c.contract;
        return ct.flatFee + (ct.perfRate > 0 ? c.stats.revenue * ct.perfRate : 0);
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                <KpiCard label="Total Payable" value={fmt(CREATORS.reduce((s, c) => s + calcDue(c), 0))} color="#4f8ef7" icon="💸" />
                <KpiCard label="Done" value={CREATORS.filter(c => c.settle.status === "paid").length + "건"} color="#22c55e" icon="✅" />
                <KpiCard label="Unpaid" value={CREATORS.filter(c => c.settle.status === "unpaid").length + "건"} color="#ef4444" icon="❌" />
                <KpiCard label="Overpayment Detected" value={CREATORS.filter(c => c.settle.status === "overpaid").length + "건"} color="#a855f7" icon="⚠" />
                <KpiCard label="Total Anomalies" value={anomalies.length + "건"} color="#f97316" icon="🔍" sub="Review Required" />
            </div>

            {/* Anomaly alerts */}
            {anomalies.map(c => {
                const due = calcDue(c);
                const diff = c.settle.paid - due;
                const isOver = diff > 0;
                return (
                    <div key={c.id} style={{
                        padding: "10px 16px", borderRadius: 10,
                        background: `rgba(${isOver ? "168,85,247" : "239,68,68"},0.07)`,
                        border: `1px solid rgba(${isOver ? "168,85,247" : "239,68,68"},0.22)`,
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
                    }}>
                        <div>
                            <span style={{ fontWeight: 700, fontSize: 12 }}>
                                {isOver ? "🟣 Overpaid" : "🔴 Unpaid/Partial"} — {c.name}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>
                                Per contract {fmt(due)} / Actual Paid {fmt(c.settle.paid)} /
                                Difference <span style={{ color: isOver ? "#a855f7" : "#ef4444", fontWeight: 700 }}>
                                    {isOver ? "+" : ""}{fmt(diff)}
                                </span>
                            </span>
                        </div>
                        <button className="btn-primary" style={{
                            fontSize: 10, padding: "4px 12px",
                            background: isOver ? "linear-gradient(135deg,#a855f7,#6366f1)" : "linear-gradient(135deg,#ef4444,#f97316)"
                        }}>
                            {isOver ? "Recover" : "Pay Remaining"}
                        </button>
                    </div>
                );
            })}

            {/* Settlement table */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📋 Settlement Details (Auto-verified)</div>
                <div style={{ overflowX: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Creator</th>
                                <th>Period</th>
                                <th style={{ textAlign: "right" }}>Per contract금</th>
                                <th style={{ textAlign: "right" }}>Actual Paid액</th>
                                <th style={{ textAlign: "right" }}>Difference (과/미)</th>
                                <th style={{ textAlign: "center" }}>Status</th>
                                <th>Documents</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {CREATORS.map(c => {
                                const due = calcDue(c);
                                const diff = c.settle.paid - due;
                                return (
                                    <tr key={c.id}>
                                        <td><div style={{ fontWeight: 700 }}>{c.name}</div></td>
                                        <td style={{ fontSize: 10 }}>{c.settle.period}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{fmt(due)}</td>
                                        <td style={{ textAlign: "right", fontFamily: "monospace" }}>{fmt(c.settle.paid)}</td>
                                        <td style={{
                                            textAlign: "right", fontFamily: "monospace",
                                            fontWeight: 700, color: diff > 0 ? "#a855f7" : diff < 0 ? "#ef4444" : "#22c55e"
                                        }}>
                                            {diff === 0 ? "Match" : diff > 0 ? "+" + fmt(diff) : fmt(diff)}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <Tag label={STATUS_LABEL[c.settle.status]} color={STATUS_COLOR[c.settle.status]} />
                                        </td>
                                        <td>
                                            {c.settle.docs.length === 0
                                                ? <span style={{ fontSize: 10, color: "#ef4444" }}>No docs</span>
                                                : c.settle.docs.map((d, i) => (
                                                    <div key={i} style={{ fontSize: 10, color: "#4f8ef7", cursor: "pointer" }}>📎 {d}</div>
                                                ))}
                                        </td>
                                        <td>
                                            <button className="btn-ghost" style={{ fontSize: 10, padding: "3px 10px" }}
                                                onClick={() => setModal(c)}>Statement</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Settlement modal */}
            {modal && (
                <>
                    <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 300 }} />
                    <div style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        width: "min(540px,95vw)", background: "linear-gradient(180deg,#0d1525,#090f1e)",
                        border: "1px solid rgba(168,85,247,0.2)", borderRadius: 20, padding: 28, zIndex: 301,
                        boxShadow: "0 24px 64px rgba(0,0,0,0.7)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>💰 Statement — {modal.name}</div>
                            <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 20 }}>✕</button>
                        </div>
                        {(() => {
                            const due = calcDue(modal);
                            const tax1 = Math.round(due * 0.033);
                            const tax2 = Math.round(due * 0.0033);
                            const net = due - tax1 - tax2;
                            return (
                                <>
                                    {[
                                        ["계약 Amount (Fixed)", fmt(modal.contract.flatFee), "var(--text-1)"],
                                        ["Performance Payment (" + pct(modal.contract.perfRate) + ")", fmt(modal.stats.revenue * modal.contract.perfRate), "var(--text-1)"],
                                        ["Contract Total", fmt(due), "#4f8ef7"],
                                        ["Business Income Tax (3.3%)", "- " + fmt(tax1), "#ef4444"],
                                        ["Local Income Tax (0.33%)", "- " + fmt(tax2), "#f97316"],
                                    ].map(([l, v, c]) => (
                                        <div key={l} style={{
                                            display: "flex", justifyContent: "space-between", padding: "8px 0",
                                            borderBottom: "1px solid rgba(99,140,255,0.07)", fontSize: 12
                                        }}>
                                            <span style={{ color: "var(--text-3)" }}>{l}</span>
                                            <span style={{ fontWeight: 700, color: c }}>{v}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontSize: 14 }}>
                                        <span style={{ fontWeight: 700 }}>Net Payable</span>
                                        <span style={{ fontWeight: 900, color: "#22c55e", fontSize: 18 }}>{fmt(net)}</span>
                                    </div>
                                    <div style={{
                                        fontSize: 10, color: modal.settle.status === "overpaid" ? "#a855f7" : modal.settle.status === "unpaid" ? "#ef4444" : "#22c55e",
                                        padding: "6px 10px", borderRadius: 6, background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)"
                                    }}>
                                        Actual Paid {fmt(modal.settle.paid)} · Contract: {fmt(due)} ·{" "}
                                        {modal.settle.status === "paid" ? "✓ Match" : modal.settle.status === "overpaid" ? "⚠ Overpaid" : "⚠ Unpaid/Partial지급"}
                                    </div>
                                </>
                            );
                        })()}
                        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-3)" }}>
                            Documents: {modal.settle.docs.length === 0 ? "None" : modal.settle.docs.join(", ")}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                            <button className="btn-ghost" onClick={() => setModal(null)}>Close</button>
                            <button className="btn-primary" style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)" }}>
                                📥 Statement Download
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   TAB 4: ROI Ranking + Content Reuse
══════════════════════════════════════════════════════════════════ */
function ROITab() {
    const allContent = CREATORS.flatMap(c =>
        c.content.map(ct => ({
            ...ct, creatorId: c.id, creatorName: c.name, tier: c.tier,
            whitelist: c.contract.whitelist,
            wlExpiry: c.contract.whitelistExpiry,
            roi: ct.revenue / (c.contract.flatFee / c.content.length + 1),
        }))
    );

    const sorted = [...allContent].sort((a, b) => b.roi - a.roi);
    const highViewsLowSales = allContent.filter(c => c.views >= 200000 && c.orders < 50).sort((a, b) => b.views - a.views);
    const reuseRecs = allContent
        .filter(c => c.engRate >= 0.05 && c.orders >= 50)
        .sort((a, b) => b.engRate - a.engRate)
        .slice(0, 4);

    const creatorROI = CREATORS.map(c => ({
        ...c,
        totalRevenue: c.stats.revenue,
        cost: calcCreatorCost(c),
        roi: c.stats.revenue / calcCreatorCost(c),
        viewPerOrder: c.stats.views / (c.stats.orders || 1),
    })).sort((a, b) => b.roi - a.roi);

    function calcCreatorCost(c) {
        return (c.contract.flatFee || 0) + c.stats.revenue * (c.contract.perfRate || 0);
    }

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Creator ROI leaderboard */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>🏆 Creator ROI 랭킹</div>
                <div style={{ display: "grid", gap: 10 }}>
                    {creatorROI.map((c, rank) => {
                        const color = TIER_COLOR[c.tier];
                        const highViewLowSale = c.stats.views >= 200000 && c.stats.orders < 50;
                        return (
                            <div key={c.id} style={{
                                padding: "12px 16px", borderRadius: 12,
                                background: "rgba(9,15,30,0.7)", border: `1px solid ${color}22`,
                                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
                            }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center",
                                    justifyContent: "center", fontWeight: 900, fontSize: 18,
                                    background: `${color}18`, color
                                }}>#{rank + 1}</div>
                                <div style={{ flex: 1, minWidth: 140 }}>
                                    <div style={{ fontWeight: 800, fontSize: 13 }}>{c.name}</div>
                                    <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                                        <Tag label={c.tier} color={color} />
                                        {highViewLowSale && <Tag label="👁 High View ↓Sales" color="#eab308" />}
                                    </div>
                                </div>
                                {[
                                    ["Total Views", fmtM(c.stats.views), "var(--text-2)"],
                                    ["Attributed Orders", c.stats.orders + "건", "#4f8ef7"],
                                    ["Attributed Revenue", "₩" + fmtM(c.stats.revenue), "#f97316"],
                                    ["Contract Cost", "₩" + fmtM(calcCreatorCost(c)), "#ef4444"],
                                    ["ROI", c.roi.toFixed(1) + "x", c.roi >= 50 ? "#22c55e" : c.roi >= 20 ? "#eab308" : "#ef4444"],
                                    ["View→Order", (c.stats.views / c.stats.orders).toFixed(0) + " views/order", "var(--text-3)"],
                                ].map(([l, v, col]) => (
                                    <div key={l} style={{ textAlign: "center", minWidth: 80 }}>
                                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>{l}</div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: col }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* High views, low sales anomaly */}
            {highViewsLowSales.length > 0 && (
                <div className="card card-glass" style={{ padding: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#eab308" }}>
                        👁 High Views / Low Sales Case Analysis
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                        Views 200K+ · Orders &lt;50 — Content optimization or landing page improvement needed
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {highViewsLowSales.map(ct => (
                            <div key={ct.id} style={{
                                padding: "10px 14px", borderRadius: 10,
                                background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)",
                                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{ct.title}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{PLAT_ICO[ct.platform]} {ct.platform} · {ct.creatorName}</div>
                                </div>
                                <div style={{ display: "flex", gap: 16 }}>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>Views</div>
                                        <div style={{ fontWeight: 800, color: "#4f8ef7" }}>{fmtM(ct.views)}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>Orders</div>
                                        <div style={{ fontWeight: 800, color: "#ef4444" }}>{ct.orders}건</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 10, color: "var(--text-3)" }}>Conv. Rate</div>
                                        <div style={{ fontWeight: 800, color: "#eab308" }}>{pct(ct.orders / ct.views)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content reuse recommendations */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    🔄 Content Reuse Best Candidates (Ads / Product Page)
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                    Engagement 5%↑ + Orders 50건↑ 콘텐츠 · Whitelist Status 포함
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {reuseRecs.map(ct => {
                        const c = CREATORS.find(x => x.id === ct.creatorId);
                        const wlOk = c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) > 0;
                        return (
                            <div key={ct.id} style={{
                                padding: "14px 16px", borderRadius: 12,
                                background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.1)"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{ct.title}</div>
                                    <Tag label={wlOk ? "📣 Ad Ready" : "🚫 Check Rights"} color={wlOk ? "#22c55e" : "#ef4444"} />
                                </div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 8 }}>
                                    {PLAT_ICO[ct.platform]} {ct.platform} · {ct.creatorName}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                                    {[["Engagement", pct(ct.engRate), "#a855f7"], ["Orders", ct.orders + "건", "#4f8ef7"], ["Revenue", "₩" + fmtM(ct.revenue), "#f97316"]].map(([l, v, col]) => (
                                        <div key={l} style={{ textAlign: "center", padding: "6px 0", borderRadius: 8, background: "rgba(9,15,30,0.6)" }}>
                                            <div style={{ fontSize: 9, color: "var(--text-3)" }}>{l}</div>
                                            <div style={{ fontWeight: 800, color: col, fontSize: 13 }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                                    <button className="btn-primary" style={{
                                        fontSize: 9, padding: "4px 10px", flex: 1,
                                        background: "linear-gradient(135deg,#6366f1,#a855f7)"
                                    }}>Ad Creative로 활용</button>
                                    <button className="btn-primary" style={{
                                        fontSize: 9, padding: "4px 10px", flex: 1,
                                        background: "linear-gradient(135deg,#14b8a6,#4f8ef7)"
                                    }}>Product Page 삽입</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════ */
const TABS = [
    { id: "identity", label: "🧑 Creator Unified", desc: "정체성·in progress복·Channel Unified" },
    { id: "contract", label: "📝 Contracts", desc: "단가·Performance·권리·e-Sign" },
    { id: "settle", label: "💰 Settlement", desc: "지급·검증·과Unpaid 탐지" },
    { id: "roi", label: "🏆 ROI 랭킹", desc: "기여Analysis·고Search저Revenue·재활용" },
    { id: "ugc", label: "⭐ UGC Reviews", desc: "리뷰·감성Analysis·이상징후" },
    { id: "ai_eval", label: "🤖 AI 평가 Analysis", desc: "점Count화·Commission Recommend·갱신 권고" },
];

/* ══════════════════════════════════════════════════════════════════
   TAB 5: UGC 리븷 — 리븷 모더레이션 + 감성 Analysis
══════════════════════════════════════════════════════════════════ */
function UGCTab() {
    const [channel, setChannel] = React.useState("all");
    const [sentiment, setSentiment] = React.useState("all");
    const [search, setSearch] = React.useState("");

    const filtered = React.useMemo(() => {
        return MOCK_REVIEWS.filter(r => {
            if (channel !== "all" && r.channel !== channel) return false;
            if (sentiment !== "all" && r.sentiment !== sentiment) return false;
            if (search && !r.text.includes(search) && !r.product.includes(search)) return false;
            return true;
        });
    }, [channel, sentiment, search]);

    const totalReviews = CHANNEL_STATS.reduce((s, c) => s + c.total, 0);
    const avgRating = (CHANNEL_STATS.reduce((s, c) => s + c.avg * c.total, 0) / totalReviews).toFixed(2);
    const negCount = MOCK_REVIEWS.filter(r => r.sentiment === "negative").length;
    const posRate = ((MOCK_REVIEWS.filter(r => r.sentiment === "positive").length / MOCK_REVIEWS.length) * 100).toFixed(1);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                <KpiCard label="All 리뷰" value={totalReviews.toLocaleString() + "건"} color="#4f8ef7" icon="💬" sub="4개 Channel 합산" />
                <KpiCard label="Average 평점" value={`★ ${avgRating}`} color="#fde047" icon="⭐" sub="전Channel 가in progressAverage" />
                <KpiCard label="부정 리뷰" value={negCount + "건"} color="#ef4444" icon="⚠" sub="즉시 대응 필요" />
                <KpiCard label="긍정 Rate" value={posRate + "%"} color="#22c55e" icon="👍" sub="전월比 +3.1%p" />
            </div>

            {/* Channel + Keywords */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📊 Channelper 평점 현황</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {CHANNEL_STATS.map(c => (
                            <div key={c.channel} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(9,15,30,0.5)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.08)" }}>
                                <span style={{ fontSize: 18 }}>{c.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{c.channel}</div>
                                    <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                                        <span style={{ color: "#22c55e" }}>긍정 {c.pos}%</span>
                                        <span style={{ color: "#ef4444" }}>부정 {c.neg}%</span>
                                        <span style={{ color: "var(--text-3)" }}>Total {c.total.toLocaleString()} items</span>
                                    </div>
                                    <Bar v={c.pos} max={100} color={c.color} h={3} />
                                </div>
                                <div style={{ textAlign: "right", minWidth: 40 }}>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: c.color }}>★ {c.avg}</div>
                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>/5.0</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>⚠ 부정 키워드 Top 5</div>
                    <div style={{ display: "grid", gap: 10 }}>
                        {NEG_KEYWORDS.map((k, i) => (
                            <div key={k.word} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: i === 0 ? "rgba(239,68,68,0.06)" : "rgba(9,15,30,0.4)", borderRadius: 8, border: `1px solid ${i === 0 ? "rgba(239,68,68,0.2)" : "rgba(99,140,255,0.08)"}` }}>
                                <span style={{ fontWeight: 900, color: "var(--text-3)", width: 18, textAlign: "center", fontSize: 12 }}>{i + 1}</span>
                                <div style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{k.word}</div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <div style={{ width: 60 }}><Bar v={k.count} max={43} color="#ef4444" h={4} /></div>
                                    <span style={{ fontWeight: 700, fontSize: 12, width: 24 }}>{k.count}</span>
                                    <span style={{ fontSize: 10, color: k.change > 0 ? "#ef4444" : "#22c55e", width: 32 }}>{k.change > 0 ? `▲${k.change}` : `▼${Math.abs(k.change)}`}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(239,68,68,0.05)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)", fontSize: 11 }}>
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>🚨 Auto Notification Active</span>
                        <span style={{ color: "var(--text-3)", marginLeft: 8 }}>부정 키워드 급증(+10건/일) → Slack #cs-alerts Auto 전송</span>
                    </div>
                </div>
            </div>

            {/* Review feed */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>💬 리뷰 피드</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <select className="input" style={{ width: 120, padding: "5px 10px", fontSize: 11 }} value={channel} onChange={e => setChannel(e.target.value)}>
                            <option value="all">All Channel</option>
                            {CHANNEL_STATS.map(c => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
                        </select>
                        <select className="input" style={{ width: 100, padding: "5px 10px", fontSize: 11 }} value={sentiment} onChange={e => setSentiment(e.target.value)}>
                            <option value="all">All 감성</option>
                            <option value="positive">긍정</option>
                            <option value="neutral">in progress립</option>
                            <option value="negative">부정</option>
                        </select>
                        <input className="input" style={{ width: 150, padding: "5px 10px", fontSize: 11 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                    {filtered.map(r => (
                        <div key={r.id} style={{ padding: "12px 14px", background: r.sentiment === "negative" ? "rgba(239,68,68,0.04)" : "rgba(9,15,30,0.4)", borderRadius: 10, border: `1px solid ${r.sentiment === "negative" ? "rgba(239,68,68,0.15)" : "rgba(99,140,255,0.08)"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <Tag label={SENTIMENT_LABEL[r.sentiment]} color={SENTIMENT_COLOR[r.sentiment]} />
                                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.channel}</span>
                                    <Tag label={r.category} color="#6366f1" />
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <Stars n={r.rating} />
                                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{r.date}</span>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{r.product}</div>
                            <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.6 }}>{r.text}</div>
                            <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                                <span style={{ fontSize: 11, color: "var(--text-3)" }}>👍 {r.helpful}명 도움됨</span>
                                {r.sentiment === "negative" && (
                                    <button className="btn-primary" style={{ fontSize: 9, padding: "2px 10px", background: "linear-gradient(135deg,#ef4444,#f97316)" }}>CS 대응</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div style={{ textAlign: "center", color: "var(--text-3)", padding: 32, fontSize: 13 }}>Search 결과 None</div>}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════
   TAB 6: AI 인플루언서 평가 Analysis
══════════════════════════════════════════════════════════════════ */
async function fetchInfluencerEval() {
    const data = {
        analysis_date: new Date().toISOString().slice(0, 10),
        creators: CREATORS.map(c => ({
            id: c.id,
            name: c.name,
            tier: c.tier,
            contract_type: c.contract.type,
            flat_fee: c.contract.flatFee,
            perf_rate: c.contract.perfRate,
            total_fee_paid: c.settle.paid,
            views: c.stats.views,
            orders: c.stats.orders,
            revenue: c.stats.revenue,
            ad_spend: c.stats.adSpend,
            roi: c.stats.adSpend > 0
                ? parseFloat((c.stats.revenue / c.stats.adSpend).toFixed(1))
                : null,
            conversion_rate: c.stats.views > 0
                ? parseFloat(((c.stats.orders / c.stats.views) * 100).toFixed(3))
                : 0,
            avg_eng_rate: parseFloat((c.content.reduce((s, v) => s + v.engRate, 0) / c.content.length).toFixed(3)),
            settle_status: c.settle.status,
            esign_status: c.contract.esign,
            content_count: c.content.length,
        })),
    };
    const resp = await fetch("/v422/ai/influencer-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || "AI 평가 Failed");
    return json.result;
}

function AIGauge({ score, size = 48 }) {
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#4f8ef7" : score >= 40 ? "#eab308" : "#ef4444";
    const r = 20, circ = 2 * Math.PI * r, dash = score != null ? (score / 100) * circ : 0;
    return (
        <svg width={size} height={size} viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
            {score != null && <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5"
                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" />}
            <text x="26" y="30" textAnchor="middle" fill={color} fontSize="11" fontWeight="900">{score ?? "—"}</text>
        </svg>
    );
}

function AIGrade({ grade }) {
    const colors = { S: "#fde047", A: "#22c55e", B: "#4f8ef7", C: "#eab308", D: "#ef4444" };
    const c = colors[grade] || "var(--text-3)";
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8, fontWeight: 900, fontSize: 14,
            background: c + "18", border: `2px solid ${c}44`, color: c
        }}>{grade}</span>
    );
}

function CreatorScoreModal({ creator, evalData, onClose }) {
    const result = (evalData?.creators || []).find(c => c.id === creator.id);
    if (!result) return null;
    const bd = result.breakdown || {};
    const contractCfg = { "flat+perf": "#4f8ef7", flat: "#22c55e", perf: "#a855f7" };
    const contractColor = contractCfg[result.fee_recommendation?.contract_type] || "#4f8ef7";
    const renewColor = { "강력 갱신": "#22c55e", "갱신 권장": "#4f8ef7", "조건부 갱신": "#eab308", "재Review Required": "#f97316", "End 권고": "#ef4444" };
    const rColor = renewColor[result.renewal_recommendation] || "var(--text-2)";

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 500 }} />
            <div style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                width: "min(700px,96vw)", maxHeight: "90vh", overflowY: "auto",
                background: "linear-gradient(160deg,#0d1525,#090f1e)",
                border: "1px solid rgba(99,102,241,0.3)", borderRadius: 22, padding: 28, zIndex: 501,
                boxShadow: "0 32px 80px rgba(0,0,0,0.85)"
            }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 10, color: "#a855f7", fontWeight: 700, marginBottom: 3 }}>🤖 AI 인플루언서 평가 Analysis</div>
                        <div style={{ fontWeight: 900, fontSize: 20 }}>{result.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{creator.tier} tier · {creator.id}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <AIGauge score={result.score} size={60} />
                        <AIGrade grade={result.grade} />
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 22 }}>✕</button>
                    </div>
                </div>

                {/* 항목per 점Count */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>📊 평가 항목per 점Count</div>
                    {[
                        { label: "ROI 투자Profit률", score: bd.roi_score, max: 30, actual: creator.stats.adSpend > 0 ? (creator.stats.revenue / creator.stats.adSpend).toFixed(1) + "x" : "—" },
                        { label: "Conversion 효율", score: bd.conversion_score, max: 25, actual: (creator.stats.orders / creator.stats.views * 100).toFixed(3) + "%" },
                        { label: "Engagement", score: bd.engagement_score, max: 20, actual: (creator.content.reduce((s, v) => s + v.engRate, 0) / creator.content.length * 100).toFixed(1) + "%" },
                        { label: "콘텐츠 품질", score: bd.content_quality_score, max: 15, actual: creator.content.length + "개 콘텐츠" },
                        { label: "신뢰도/계약 준Count", score: bd.reliability_score, max: 10, actual: creator.settle.status },
                    ].map(b => (
                        <div key={b.label} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                <span style={{ fontWeight: 600 }}>{b.label}</span>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <span style={{ color: "var(--text-3)" }}>실적: <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{b.actual}</span></span>
                                    <span style={{ fontWeight: 800, color: "#a855f7" }}>{b.score ?? 0}<span style={{ color: "var(--text-3)", fontWeight: 400 }}>/{b.max}</span></span>
                                </div>
                            </div>
                            <div style={{ height: 5, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <div style={{ width: `${b.score != null ? (b.score / b.max) * 100 : 0}%`, height: "100%", background: "#a855f7", borderRadius: 5, transition: "width .6s" }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* 강점/약점 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>✅ 강점</div>
                        {(result.strengths || []).map((s, i) => (
                            <div key={i} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, marginBottom: 4, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)", color: "#22c55e" }}>• {s}</div>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>⚠️ 개선 포인트</div>
                        {(result.weaknesses || []).map((w, i) => (
                            <div key={i} style={{ fontSize: 11, padding: "6px 10px", borderRadius: 8, marginBottom: 4, background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.15)", color: "#eab308" }}>• {w}</div>
                        ))}
                    </div>
                </div>

                {/* Commission Recommend */}
                {result.fee_recommendation && (
                    <div style={{ padding: "16px 18px", borderRadius: 14, background: `${contractColor}0d`, border: `1px solid ${contractColor}30`, marginBottom: 16 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: contractColor, marginBottom: 12 }}>💰 AI 적정 Commission Recommend</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                            {[
                                { l: "현재 지급액", v: "₩" + Number(result.fee_recommendation.current_fee || 0).toLocaleString() },
                                { l: "권장 Fixed Fee", v: "₩" + Number(result.fee_recommendation.recommended_flat_fee || 0).toLocaleString() },
                                { l: "권장 Performance Rate", v: ((result.fee_recommendation.recommended_perf_rate || 0) * 100).toFixed(1) + "%" },
                            ].map(({ l, v }) => (
                                <div key={l} style={{ textAlign: "center", padding: "10px 0", borderRadius: 10, background: "rgba(9,15,30,0.7)", border: "1px solid rgba(99,140,255,0.08)" }}>
                                    <div style={{ fontSize: 9, color: "var(--text-3)" }}>{l}</div>
                                    <div style={{ fontWeight: 800, fontSize: 13, color: contractColor, marginTop: 3 }}>{v}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 6 }}>
                            📋 Contract Type: <strong style={{ color: contractColor }}>{result.fee_recommendation.contract_type}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 6 }}>💡 {result.fee_recommendation.fee_rationale}</div>
                        {result.fee_recommendation.negotiation_tip && (
                            <div style={{ fontSize: 11, padding: "7px 12px", borderRadius: 8, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)", color: "#4f8ef7" }}>
                                🤝 협상 팁: {result.fee_recommendation.negotiation_tip}
                            </div>
                        )}
                    </div>
                )}

                {/* 계약 갱신 권고 */}
                {result.renewal_recommendation && (
                    <div style={{ padding: "12px 16px", borderRadius: 10, background: `rgba(255,255,255,0.03)`, border: `1px solid ${rColor}30`, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: rColor }}>📝 계약 갱신 권고: {result.renewal_recommendation}</div>
                    </div>
                )}

                {/* AI 인사이트 */}
                {result.ai_insight && (
                    <div style={{ padding: "12px 16px", borderRadius: 10, fontSize: 12, lineHeight: 1.7, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)", color: "#a855f7" }}>
                        🤖 {result.ai_insight}
                    </div>
                )}
            </div>
        </>
    );
}

function DemoSection() {
    const [demoSelId, setDemoSelId] = useState(CREATORS[0]?.id);
    const demoCreator = CREATORS.find(c => c.id === demoSelId) || CREATORS[0];
    const demoData = demoCreator?.demographics || DEFAULT_DEMOGRAPHICS;
    return (
        <div className="card card-glass" style={{ padding: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📊 지역·연령·성per 참여 기여도</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {CREATORS.map(c => (
                    <button key={c.id} onClick={() => setDemoSelId(c.id)}
                        style={{
                            padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)',
                            background: demoSelId === c.id ? 'rgba(168,85,247,0.15)' : 'transparent',
                            color: demoSelId === c.id ? '#a855f7' : 'rgba(255,255,255,0.55)',
                            cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.2s'
                        }}>
                        {c.name}
                    </button>
                ))}
            </div>
            <InfluencerDemographics data={demoData} col="#a855f7" />
        </div>
    );
}

function AIEvalTab() {
    const [evalResult, setEvalResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modalCreator, setModalCreator] = useState(null);

    const runEval = async () => {
        setLoading(true); setError(null);
        try {
            const r = await fetchInfluencerEval();
            setEvalResult(r);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const tierColor = { Nano: "#14d9b0", Micro: "#4f8ef7", Mid: "#a855f7", Macro: "#f97316" };
    const renewColor = { "강력 갱신": "#22c55e", "갱신 권장": "#4f8ef7", "조건부 갱신": "#eab308", "재Review Required": "#f97316", "End 권고": "#ef4444" };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Run Header */}
            <div style={{
                padding: "20px 24px", borderRadius: 16,
                background: "linear-gradient(135deg,rgba(168,85,247,0.12),rgba(99,102,241,0.08))",
                border: "1px solid rgba(168,85,247,0.2)",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
            }}>
                <div>
                    <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>🤖 AI 인플루언서 종합 평가</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>Claude Sonnet 3.5 기반 · ROI·Conversion·Engagement·Commission Recommend·계약 갱신 권고 + <strong style={{ color: '#a855f7' }}>지역·연령·성per 참여 기여도 Analysis</strong></div>
                </div>
                <button onClick={runEval} disabled={loading} style={{
                    padding: "10px 24px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
                    background: loading ? "rgba(168,85,247,0.3)" : "linear-gradient(135deg,#a855f7,#6366f1)",
                    color: "#fff", fontWeight: 800, fontSize: 13, opacity: loading ? 0.7 : 1,
                }}>
                    {loading ? "⏳ AI Analysis in progress..." : "🚀 AI 평가 Run"}
                </button>
            </div>

            {error && (
                <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontSize: 12 }}>
                    ❌ {error}
                </div>
            )}

            {loading && (
                <div className="card card-glass" style={{ padding: 40, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Claude AI가 Creator 데이터를 Analysis in progress입니다...</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{CREATORS.length}명 Creator · ROI Analysis · Commission 최적화 · 계약 갱신 검토</div>
                </div>
            )}

            {!loading && !evalResult && (
                <div className="card card-glass" style={{ padding: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📥 평가 대상 Creator</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                        {CREATORS.map(c => (
                            <div key={c.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(9,15,30,0.7)", border: `1px solid ${tierColor[c.tier] || "#4f8ef7"}25` }}>
                                <div style={{ fontWeight: 700, color: tierColor[c.tier], fontSize: 13 }}>{c.name}</div>
                                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{c.tier} · {c.contract.type}</div>
                                <div style={{ fontSize: 11, marginTop: 4 }}>Revenue {(c.stats.revenue / 1e6).toFixed(1)}M · {c.stats.orders}건</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)", marginTop: 14 }}>AI 평가 Run Button을 Clicks하여 Analysis을 Start하세요</div>
                </div>
            )}

            {!loading && evalResult && (
                <>
                    {/* All Summary */}
                    <div style={{ padding: "16px 20px", borderRadius: 14, background: "linear-gradient(135deg,rgba(168,85,247,0.08),rgba(99,102,241,0.06))", border: "1px solid rgba(168,85,247,0.2)" }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: "#a855f7" }}>📋 포트폴리오 종합 Analysis</div>
                        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{evalResult.overall_summary}</div>
                        {evalResult.immediate_action && (
                            <div style={{ marginTop: 10, fontSize: 11, padding: "8px 12px", borderRadius: 8, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)", color: "#4f8ef7" }}>
                                🎯 즉시 Run: {evalResult.immediate_action}
                            </div>
                        )}
                    </div>

                    {/* Demographics 참여 기여도 */}
                    {evalResult.creators && <DemoSection />}

                    {/* Creator 랭킹 */}
                    <div className="card card-glass" style={{ padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>🏆 Creator AI 평가 랭킹</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>행 Clicks 시 항목per 점Count·Commission Recommend·계약 갱신 권고 Details Search</div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Creator</th>
                                    <th style={{ textAlign: "center" }}>AI 점Count</th>
                                    <th style={{ textAlign: "center" }}>Grade</th>
                                    <th style={{ textAlign: "right" }}>ROI</th>
                                    <th style={{ textAlign: "right" }}>Conv. Rate</th>
                                    <th>계약 갱신 권고</th>
                                    <th>권장 Commission</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(evalResult.creators || [])
                                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                                    .map((cr, rank) => {
                                        const orig = CREATORS.find(c => c.id === cr.id);
                                        const fc = cr.fee_recommendation;
                                        const rColor = renewColor[cr.renewal_recommendation] || "var(--text-3)";
                                        const rankIcon = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank + 1}`;
                                        return (
                                            <tr key={cr.id} style={{ cursor: "pointer" }}
                                                onClick={() => setModalCreator(orig)}>
                                                <td style={{ fontWeight: 700 }}>{rankIcon}</td>
                                                <td>
                                                    <div style={{ fontWeight: 700 }}>{cr.name}</div>
                                                    <div style={{ fontSize: 10, color: "var(--text-3)" }}>{orig?.tier} · {cr.id}</div>
                                                </td>
                                                <td style={{ textAlign: "center" }}><AIGauge score={cr.score} size={36} /></td>
                                                <td style={{ textAlign: "center" }}><AIGrade grade={cr.grade} /></td>
                                                <td style={{ textAlign: "right", fontWeight: 700, color: cr.roi >= 50 ? "#22c55e" : cr.roi >= 10 ? "#4f8ef7" : "#eab308" }}>
                                                    {cr.roi != null ? cr.roi.toFixed(1) + "x" : "—"}
                                                </td>
                                                <td style={{ textAlign: "right" }}>{orig ? (orig.stats.orders / orig.stats.views * 100).toFixed(3) : "—"}%</td>
                                                <td><span style={{ fontSize: 11, fontWeight: 700, color: rColor }}>{cr.renewal_recommendation || "—"}</span></td>
                                                <td style={{ fontSize: 11 }}>
                                                    {fc ? (
                                                        <div>
                                                            <div style={{ color: "#4f8ef7", fontWeight: 700 }}>{fc.contract_type}</div>
                                                            <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                                                                {fc.recommended_flat_fee ? "₩" + Number(fc.recommended_flat_fee).toLocaleString() : ""}
                                                                {fc.recommended_perf_rate ? " + " + (fc.recommended_perf_rate * 100).toFixed(1) + "%" : ""}
                                                            </div>
                                                        </div>
                                                    ) : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    {/* 포트폴리오 인사이트 */}
                    {(evalResult.portfolio_insights || []).length > 0 && (
                        <div className="card card-glass" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>💡 포트폴리오 전략 인사이트</div>
                            <div style={{ display: "grid", gap: 8 }}>
                                {evalResult.portfolio_insights.map((ins, i) => (
                                    <div key={i} style={{ padding: "9px 13px", borderRadius: 9, fontSize: 12, lineHeight: 1.6, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)", color: "#4f8ef7" }}>
                                        💡 {ins}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Budget 최적화 */}
                    {evalResult.budget_optimization && (
                        <div style={{ padding: "14px 18px", borderRadius: 13, background: "linear-gradient(135deg,rgba(99,102,241,0.09),rgba(168,85,247,0.07))", border: "1px solid rgba(99,102,241,0.2)" }}>
                            <div style={{ fontWeight: 800, fontSize: 13, color: "#6366f1", marginBottom: 6 }}>💰 Budget 최적화 제안</div>
                            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{evalResult.budget_optimization}</div>
                        </div>
                    )}

                    <div style={{ textAlign: "center" }}>
                        <button onClick={runEval} disabled={loading} style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(168,85,247,0.3)", background: "transparent", color: "#a855f7", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>🔄 AI 재Analysis</button>
                    </div>
                </>
            )}

            {modalCreator && evalResult && (
                <CreatorScoreModal creator={modalCreator} evalData={evalResult} onClose={() => setModalCreator(null)} />
            )}
        </div>
    );
}

export default function InfluencerUGC() {
    const { fmt } = useCurrency();
    const [tab, setTab] = useState("identity");
    const anomalyCount = CREATORS.filter(c =>
        c.contract.esign === "pending" ||
        (c.contract.whitelist && daysLeft(c.contract.whitelistExpiry) < 0) ||
        c.settle.status === "overpaid" || c.settle.status === "unpaid"
    ).length;

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="hero fade-up" style={{
                background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(168,85,247,0.05))",
                borderColor: "rgba(99,102,241,0.15)"
            }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(168,85,247,0.15))" }}>🤝</div>
                    <div>
                        <div className="hero-title" style={{
                            background: "linear-gradient(135deg,#6366f1,#a855f7)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                        }}>Influencer & UGC Hub</div>
                        <div className="hero-desc">
                            Creator 정체성 Unified(in progress복/변형) · 계약(단가/Performance/권리/e-Sign) · 정산 Auto검증(과Unpaid) · ROI랭킹 · 콘텐츠 재활용 · <strong>UGC Reviews·감성Analysis</strong>
                        </div>
                    </div>
                </div>
                {anomalyCount > 0 && (
                    <div style={{
                        marginTop: 10, padding: "6px 14px", borderRadius: 8,
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                        fontSize: 11, color: "#ef4444", display: "inline-flex", gap: 6
                    }}>
                        🔴 즉시 Review Required {anomalyCount}건 — e-Sign Pending·Whitelist Expired·정산 이상
                    </div>
                )}
            </div>

            {/* 6Tab 네비게이션 */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)" }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: "13px 8px", border: "none", cursor: "pointer", textAlign: "left",
                            background: tab === t.id ? (t.id === "ai_eval" ? "rgba(168,85,247,0.1)" : "rgba(99,102,241,0.1)") : "transparent",
                            borderBottom: `2px solid ${tab === t.id ? (t.id === "ai_eval" ? "#a855f7" : "#6366f1") : "transparent"}`, transition: "all 200ms",
                            position: "relative"
                        }}>
                            {t.id === "settle" && anomalyCount > 0 && (
                                <span style={{ position: "absolute", top: 6, right: 6, width: 15, height: 15, borderRadius: "50%", background: "#ef4444", fontSize: 8, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{anomalyCount}</span>
                            )}
                            <div style={{ fontSize: 11, fontWeight: 800, color: tab === t.id ? (t.id === "ai_eval" ? "#a855f7" : "var(--text-1)") : "var(--text-2)" }}>{t.label}</div>
                            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="card card-glass fade-up fade-up-2">
                {tab === "identity" && <IdentityTab />}
                {tab === "contract" && <ContractTab />}
                {tab === "settle" && <SettleTab />}
                {tab === "roi" && <ROITab />}
                {tab === "ugc" && <UGCTab />}
                {tab === "ai_eval" && <AIEvalTab />}
            </div>
        </div>
    );
}
