import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ── 3Tier Menu Tree ─────────────────────────────────────────────────── */
const MENU_TREE = [
    {
        key: "marketing", label: "📣 Marketing·Ads", children: [
            {
                key: "auto-marketing", label: "🚀 Marketing Auto화 AI", children: [
                    { key: "campaign", label: "Create Campaign/Management" }, { key: "channel-auto", label: "Channelper Auto화 Settings" }, { key: "budget-auto", label: "Budget Auto 최적화" },
                ]
            },
            {
                key: "marketing-intel", label: "🧠 Marketing 인텔리전스", children: [
                    { key: "keyword", label: "키워드 Analysis" }, { key: "competitor", label: "경쟁사 Analysis" }, { key: "trend", label: "트렌드 Analysis" },
                ]
            },
            {
                key: "campaign-mgr", label: "🎯 Campaign Management", children: [
                    { key: "creative", label: "크리에이티브 Management" }, { key: "ab-test", label: "A/B Test" }, { key: "ad-report", label: "Performance 리포트" },
                ]
            },
            { key: "content-cal", label: "📆 콘텐츠 캘린더", children: [] },
            { key: "budget-plan", label: "💰 Budget 플래너", children: [] },
            { key: "influencer", label: "🤝 인플루언서 Management", children: [] },
            { key: "attribution", label: "🔗 Conversion 기여도 Analysis", children: [] },
            { key: "channel-kpi", label: "📊 Channel KPI Management", children: [] },
        ]
    },
    {
        key: "commerce", label: "🛒 커머스·물류", children: [
            { key: "omni", label: "🌐 옴니Channel Management", children: [{ key: "channel-sync", label: "Channel Integration" }, { key: "inventory", label: "Stock Sync" }] },
            { key: "kr-channel", label: "🇰🇷 한국 Channel Management", children: [] },
            { key: "wms", label: "🏭 WMS Management", children: [{ key: "inbound", label: "입고 Management" }, { key: "outbound", label: "출고 Management" }, { key: "warehouse", label: "창고 Management" }] },
            { key: "order-hub", label: "📦 Orders 허브", children: [] }, { key: "catalog", label: "📂 카탈로그 Sync", children: [] },
            { key: "price-opt", label: "💡 Price Optimization", children: [] }, { key: "digital-shelf", label: "🛍 디지털 쉘프", children: [] }, { key: "amazon-risk", label: "🏪 아마존 리스크", children: [] },
        ]
    },
    {
        key: "analytics", label: "📊 Analysis·Performance", children: [
            { key: "performance", label: "📊 퍼포먼스 허브", children: [{ key: "roas", label: "ROAS Analysis" }, { key: "cpa", label: "CPA Analysis" }, { key: "ltv", label: "LTV Analysis" }] },
            { key: "pnl", label: "🌊 P&L Dashboard", children: [] }, { key: "rollup", label: "📈 롤업 Dashboard", children: [] },
            { key: "graph-score", label: "🕸 Graph 스코어링", children: [] },
            { key: "ai-insights", label: "🤖 AI 인사이트", children: [{ key: "anomaly", label: "Anomaly Detection" }, { key: "forecast", label: "Forecast Analysis" }] },
            { key: "report-builder", label: "📋 리포트 빌더", children: [{ key: "custom-report", label: "커스텀 리포트" }, { key: "schedule", label: "Auto Send" }] },
        ]
    },
    {
        key: "finance", label: "💳 정산·재무", children: [
            { key: "reconciliation", label: "💰 Revenue 정산", children: [] }, { key: "settlements", label: "📋 Settlement History", children: [] }, { key: "app-pricing", label: "💳 Pricing제 안내", children: [] },
        ]
    },
    {
        key: "automation", label: "🤖 Auto화·AI", children: [
            { key: "ai-rule", label: "🧠 AI 규칙 엔진", children: [{ key: "rule-create", label: "규칙 Create/Management" }, { key: "trigger", label: "Tree거 Settings" }] },
            { key: "ai-policy", label: "🤖 AI 정책 Management", children: [] }, { key: "alert", label: "🚨 Notification 정책", children: [] },
            { key: "action-presets", label: "🧰 Action 프리셋", children: [] }, { key: "approvals", label: "✅ 결재 Management", children: [] }, { key: "writeback", label: "↩ 라이트백", children: [] },
        ]
    },
    {
        key: "data", label: "🔌 데이터·Integration", children: [
            { key: "connectors", label: "🔌 커넥터 Management", children: [{ key: "oauth", label: "OAuth Connect" }, { key: "webhook", label: "웹훅 Settings" }] },
            { key: "api-keys", label: "🔑 API 키 Management", children: [] }, { key: "event-norm", label: "🔄 Event 정규화", children: [] },
            { key: "mapping-registry", label: "🧩 매핑 레지스Tree", children: [] }, { key: "data-product", label: "🗂 데이터 제품", children: [] },
        ]
    },
    {
        key: "system", label: "⚙ 시스템·Management", children: [
            { key: "system-monitor", label: "🖥️ 시스템 모니터", children: [] }, { key: "operations", label: "⚡ 운영 허브", children: [] },
            { key: "audit", label: "🧾 감사 로그", children: [] }, { key: "db-admin", label: "🗄 DB Management", children: [] }, { key: "help", label: "📚 Help", children: [] },
        ]
    },
];

function collectAllKeys(tree) {
    const keys = [];
    tree.forEach(m => { keys.push(m.key); m.children.forEach(s => { keys.push(s.key); (s.children || []).forEach(l => keys.push(l.key)); }); });
    return keys;
}
const ALL_KEYS = collectAllKeys(MENU_TREE);

/* ── Account 티어 BasicValue (Account Count 직접 입력 가능) ───────────────────────── */
const TIER_PALETTES = ["#4f8ef7", "#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#22c55e"];

const makeDefaultTiers = () => [
    { id: 1, accounts: "1", unlimited: false, label: "1Account", monthly: "", quarterly: "", yearly: "", disc_m: "", disc_q: "", disc_y: "" },
    { id: 2, accounts: "5", unlimited: false, label: "5Account", monthly: "", quarterly: "", yearly: "", disc_m: "", disc_q: "", disc_y: "" },
    { id: 3, accounts: "10", unlimited: false, label: "10Account", monthly: "", quarterly: "", yearly: "", disc_m: "", disc_q: "", disc_y: "" },
    { id: 4, accounts: "30", unlimited: false, label: "30Account", monthly: "", quarterly: "", yearly: "", disc_m: "", disc_q: "", disc_y: "" },
    { id: 5, accounts: "", unlimited: true, label: "∞ Unlimited", monthly: "", quarterly: "", yearly: "", disc_m: "", disc_q: "", disc_y: "" },
];

// currency formatting via useCurrency fmt()
const calcFinal = (p, d) => p && Number(d) > 0 ? Math.round(Number(p) * (1 - Number(d) / 100)) : (p ? Number(p) : null);

const S = {
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px" },
    inp: { padding: "5px 7px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#e8eaf6", fontSize: 11, width: "100%", boxSizing: "border-box" },
    btn: (v = "p") => ({
        padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
        background: v === "p" ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : v === "d" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)",
        color: v === "d" ? "#ef4444" : "#fff",
    }),
    th: { fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, padding: "7px 10px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.07)", letterSpacing: 0.5 },
};

function Checkbox({ checked, indeterminate, onChange, size = 18 }) {
    return (
        <div onClick={onChange} style={{ width: size, height: size, borderRadius: size < 16 ? 4 : 6, flexShrink: 0, border: `2px solid ${checked || indeterminate ? "#4f8ef7" : "rgba(255,255,255,0.22)"}`, background: checked ? "#4f8ef7" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 150ms" }}>
            {checked && <span style={{ fontSize: size - 6, color: "#fff", fontWeight: 900, lineHeight: 1 }}>✓</span>}
            {!checked && indeterminate && <span style={{ width: size - 8, height: 2, background: "#4f8ef7", borderRadius: 1 }} />}
        </div>
    );
}

export default function TierPricingTab() {
    const { fmt } = useCurrency();
    const { token } = useAuth();
    const [viewMode, setViewMode] = useState("create");
    const [sel, setSel] = useState({});
    const [expanded, setExpanded] = useState({});
    const [pkgName, setPkgName] = useState("");
    const [tiers, setTiers] = useState(makeDefaultTiers());
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [packages, setPackages] = useState([]);
    const [pkgOpen, setPkgOpen] = useState({});

    /* ── 티어 필드 Update ────────────────────────────── */
    const setTierF = (id, field, value) => setTiers(ts => ts.map(t => t.id === id ? { ...t, [field]: value } : t));

    /* ── Account Count Change 핸들러 ────────────────────────────── */
    const setTierAccounts = (id, value, unlimited) => {
        setTiers(ts => ts.map(t => {
            if (t.id !== id) return t;
            const newUnlimited = unlimited !== undefined ? unlimited : t.unlimited;
            const newAccounts = newUnlimited ? "" : value;
            const newLabel = newUnlimited ? "∞ Unlimited" : (value ? `${value}Account` : "Account Count 입력");
            return { ...t, accounts: newAccounts, unlimited: newUnlimited, label: newLabel };
        }));
    };

    /* ── Tier Add/Delete ────────────────────────────────── */
    const addTier = () => {
        const newId = Math.max(...tiers.map(t => t.id)) + 1;
        setTiers(ts => [...ts, { id: newId, accounts: "", unlimited: false, label: "Account Count 입력", monthly: "", quarterly: "", yearly: "", disc_m: "", disc_q: "", disc_y: "" }]);
    };
    const removeTier = (id) => {
        if (tiers.length <= 1) return;
        setTiers(ts => ts.filter(t => t.id !== id));
    };

    const loadPackages = async () => {
        try {
            const r = await fetch("/api/auth/pricing/packages", { headers: { Authorization: `Bearer ${token}` } });
            const d = await r.json();
            if (d.ok) setPackages(d.packages || []);
        } catch (e) { }
    };
    useEffect(() => { loadPackages(); }, []);

    /* ── Tree 헬퍼 ─────────────────────────────────────── */
    const getDesc = node => { const k = [node.key]; (node.children || []).forEach(c => k.push(...getDesc(c))); return k; };
    const getLeaf = node => (!node.children || !node.children.length) ? [node.key] : node.children.flatMap(c => getLeaf(c));
    const toggleNode = node => { const d = getDesc(node); const on = d.some(k => sel[k]); setSel(s => { const n = { ...s }; d.forEach(k => { n[k] = !on; }); return n; }); };
    const isChk = node => { const l = getLeaf(node); return l.length > 0 && l.every(k => sel[k]); };
    const isInd = node => { const l = getLeaf(node); const on = l.filter(k => sel[k]).length; return on > 0 && on < l.length; };
    const isExp = key => expanded[key] !== false;
    const togExp = key => setExpanded(e => ({ ...e, [key]: !isExp(key) }));
    const togAll = () => { const allOn = ALL_KEYS.every(k => sel[k]); const n = {}; ALL_KEYS.forEach(k => { n[k] = !allOn; }); setSel(n); };
    const selKeys = ALL_KEYS.filter(k => sel[k]);
    const selCnt = selKeys.length;

    /* ── Register ──────────────────────────────────────────── */
    const save = async () => {
        if (!pkgName.trim()) { setMsg("❌ 패키지 Name을 입력해 주세요"); setTimeout(() => setMsg(""), 3000); return; }
        if (selCnt === 0) { setMsg("❌ Menu를 Min 1개 Select해 주세요"); setTimeout(() => setMsg(""), 3000); return; }
        const hasPrice = tiers.some(t => t.monthly || t.quarterly || t.yearly);
        if (!hasPrice) { setMsg("❌ Min 1개 Tier에 Pricing을 입력해 주세요"); setTimeout(() => setMsg(""), 3000); return; }
        setLoading(true);
        try {
            const body = {
                name: pkgName.trim(), menu_keys: selKeys, pricing_tiers: tiers,
                price_monthly: parseInt(tiers[0].monthly) || 0,
                price_quarterly: parseInt(tiers[0].quarterly) || 0,
                price_yearly: parseInt(tiers[0].yearly) || 0,
                discount_monthly: parseFloat(tiers[0].disc_m) || 0,
                discount_quarterly: parseFloat(tiers[0].disc_q) || 0,
                discount_yearly: parseFloat(tiers[0].disc_y) || 0,
            };
            const r = await fetch("/api/auth/pricing/packages", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const d = await r.json();
            if (d.ok) {
                setMsg("✅ 패키지 Register Done!");
                setPkgName(""); setSel({}); setTiers(makeDefaultTiers());
                loadPackages();
                setTimeout(() => { setMsg(""); setViewMode("list"); }, 1500);
            } else { setMsg("❌ " + d.error); setTimeout(() => setMsg(""), 4000); }
        } catch (e) { setMsg("❌ 네트워크 Error"); setTimeout(() => setMsg(""), 3000); }
        setLoading(false);
    };

    const delPkg = async (id, name) => {
        if (!confirm(`"${name}" 패키지를 Delete할까요?`)) return;
        await fetch(`/api/auth/pricing/packages/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        loadPackages();
    };

    /* ── Tree 렌더 ─────────────────────────────────────── */
    const renderTree = (nodes, depth = 0) => nodes.map(node => {
        const hasC = node.children && node.children.length > 0;
        const chk = isChk(node); const ind = !chk && isInd(node);
        const open = isExp(node.key);
        const pl = depth === 0 ? 0 : depth === 1 ? 26 : 48;
        return (
            <div key={node.key}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, padding: `${depth === 0 ? 9 : 6}px 12px ${depth === 0 ? 9 : 6}px ${12 + pl}px`, background: depth === 0 && (chk || ind) ? "rgba(79,142,247,0.06)" : "transparent", borderTop: depth === 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <Checkbox checked={chk} indeterminate={ind} onChange={() => toggleNode(node)} size={depth === 0 ? 18 : depth === 1 ? 16 : 14} />
                    <span onClick={() => hasC && togExp(node.key)} style={{ flex: 1, fontSize: depth === 0 ? 13 : depth === 1 ? 12 : 11, fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400, color: chk ? "#e8eaf6" : `rgba(255,255,255,${depth === 0 ? "0.85" : depth === 1 ? "0.7" : "0.5"})`, cursor: hasC ? "pointer" : "default", userSelect: "none" }}>{node.label}</span>
                    {chk && depth > 0 && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 5, background: "rgba(34,197,94,0.14)", color: "#22c55e" }}>✅</span>}
                    {hasC && <span onClick={() => togExp(node.key)} style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", transform: open ? "rotate(90deg)" : "none", transition: "200ms", cursor: "pointer" }}>▶</span>}
                </div>
                {hasC && open && <div style={{ borderLeft: "1px solid rgba(79,142,247,0.1)", marginLeft: 12 + pl + 8 }}>{renderTree(node.children, depth + 1)}</div>}
            </div>
        );
    });

    /* ── Pricing 입력 셀 ──────────────────────────────────── */
    const PriceCell = ({ val, discVal, onVal, onDisc }) => {
    const { fmt } = useCurrency();
        const fp = calcFinal(val, discVal);
        return (
            <td style={{ padding: "5px 5px", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "top", minWidth: 86 }}>
                <input type="number" placeholder="₩ Pricing" value={val} onChange={e => onVal(e.target.value)} style={{ ...S.inp, marginBottom: 3 }} />
                <input type="number" placeholder="할인%" min="0" max="99" value={discVal} onChange={e => onDisc(e.target.value)} style={{ ...S.inp }} />
                {fp && fp !== Number(val) && <div style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, marginTop: 2, textAlign: "center" }}>→ {fmt(fp)}</div>}
                {fp && fp === Number(val) && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2, textAlign: "center" }}>{fmt(fp)}</div>}
            </td>
        );
    };

    /* ── All 렌더 ─────────────────────────────────────── */
    return (
        <div>
            {/* Header */}
            <div style={{ ...S.card, background: "linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))", borderColor: "rgba(79,142,247,0.2)", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: "#4f8ef7", marginBottom: 4 }}>💳 SubscriptionPricing Management</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                            Menu Select → Account Count Tier Settings <strong style={{ color: "#4f8ef7" }}>(직접 입력 가능)</strong> → Pricing Register → 패키지 Register
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setViewMode("create")} style={{ ...S.btn(viewMode === "create" ? "p" : "g"), fontSize: 11, padding: "6px 14px" }}>➕ 패키지 Register</button>
                        <button onClick={() => { setViewMode("list"); loadPackages(); }} style={{ ...S.btn(viewMode === "list" ? "p" : "g"), fontSize: 11, padding: "6px 14px" }}>📋 Register List ({packages.length})</button>
                    </div>
                </div>
            </div>

            {/* Free Demo 안내 Banner */}
            <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(141,164,196,0.06)", border: "1px solid rgba(141,164,196,0.2)", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 22 }}>🆓</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, color: "#8da4c4", marginBottom: 3 }}>Free 플랜 — Free 회Cost Price입 시 Auto 부여</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Free 플랜은 per도 패키지 없이 All Demo 접근 Permission이 Auto으로 부여됩니다. 아래에서는 <strong style={{ color: "#4f8ef7" }}>Growth / Pro / Enterprise</strong> Paid 패키지만 Register하세요.</div>
              </div>
            </div>
            {viewMode === "create" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 540px", gap: 16, alignItems: "start" }}>

                    {/* 좌측: Menu Tree */}
                    <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>
                                📋 서비스 Menu Select
                                <span style={{ marginLeft: 8, fontSize: 11, color: "#4f8ef7" }}>{selCnt}개 Select</span>
                            </div>
                            <div style={{ display: "flex", gap: 5 }}>
                                <button onClick={togAll} style={{ ...S.btn("g"), fontSize: 10, padding: "3px 9px" }}>{ALL_KEYS.every(k => sel[k]) ? "All Disconnect" : "All Select"}</button>
                                <button onClick={() => setExpanded({})} style={{ ...S.btn("g"), fontSize: 10, padding: "3px 9px" }}>펼치기</button>
                                <button onClick={() => { const c = {}; MENU_TREE.forEach(m => { c[m.key] = false; m.children.forEach(s => { c[s.key] = false; }); }); setExpanded(c); }} style={{ ...S.btn("g"), fontSize: 10, padding: "3px 9px" }}>접기</button>
                            </div>
                        </div>
                        <div style={{ maxHeight: 540, overflowY: "auto" }}>{renderTree(MENU_TREE)}</div>
                    </div>

                    {/* 우측: 패키지 Settings */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* 패키지 Name */}
                        <div style={S.card}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 600, marginBottom: 5, textTransform: "uppercase" }}>Subscription 패키지 Name *</div>
                            <input style={{ ...S.inp, fontSize: 13, padding: "8px 12px" }} placeholder="예: Geniego-ROI Growth, Pro, Enterprise..." value={pkgName} onChange={e => setPkgName(e.target.value)} />
                        </div>

                        {/* Account Count × Pricing Table */}
                        <div style={{ ...S.card, overflowX: "auto" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                <div style={{ fontWeight: 700, fontSize: 12, color: "#e8eaf6" }}>
                                    👥 Account Countper Pricing Settings <span style={{ fontSize: 10, color: "#4f8ef7", fontWeight: 600 }}>(Account Count 직접 입력)</span>
                                </div>
                                <button onClick={addTier} style={{ ...S.btn("g"), fontSize: 10, padding: "4px 11px" }}>+ Tier Add</button>
                            </div>

                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
                                <thead>
                                    <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                                        <th style={{ ...S.th, textAlign: "left", width: 118, padding: "7px 8px" }}>Account Count</th>
                                        <th style={S.th}>Monthly <span style={{ opacity: 0.5 }}>(Pricing/할인%)</span></th>
                                        <th style={S.th}>Quarter <span style={{ opacity: 0.5 }}>(Pricing/할인%)</span></th>
                                        <th style={S.th}>Annual <span style={{ opacity: 0.5 }}>(Pricing/할인%)</span></th>
                                        <th style={{ ...S.th, width: 26 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tiers.map((t, i) => {
                                        const col = TIER_PALETTES[i % TIER_PALETTES.length];
                                        return (
                                            <tr key={t.id}>
                                                {/* Account Count 셀 - 직접 입력 또는 Unlimited Toggle */}
                                                <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: col + "22", color: col, fontWeight: 900, fontSize: 11, border: `1px solid ${col}44`, flexShrink: 0 }}>{i + 1}</span>
                                                        <div style={{ flex: 1 }}>
                                                            {t.unlimited ? (
                                                                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>∞ Unlimited</div>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    placeholder="Account Count"
                                                                    value={t.accounts}
                                                                    min="1"
                                                                    onChange={e => setTierAccounts(t.id, e.target.value, false)}
                                                                    style={{ ...S.inp, width: "60px", padding: "4px 6px", fontSize: 12, fontWeight: 700 }}
                                                                />
                                                            )}
                                                            {/* Unlimited Toggle */}
                                                            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginTop: 3 }}>
                                                                <input type="checkbox" checked={t.unlimited} onChange={e => setTierAccounts(t.id, "", e.target.checked)} style={{ width: 12, height: 12, accentColor: "#22c55e" }} />
                                                                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Unlimited</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* 월/Quarter/Annual Pricing 셀 */}
                                                <PriceCell val={t.monthly} discVal={t.disc_m} onVal={v => setTierF(t.id, "monthly", v)} onDisc={v => setTierF(t.id, "disc_m", v)} />
                                                <PriceCell val={t.quarterly} discVal={t.disc_q} onVal={v => setTierF(t.id, "quarterly", v)} onDisc={v => setTierF(t.id, "disc_q", v)} />
                                                <PriceCell val={t.yearly} discVal={t.disc_y} onVal={v => setTierF(t.id, "yearly", v)} onDisc={v => setTierF(t.id, "disc_y", v)} />
                                                {/* Delete */}
                                                <td style={{ padding: "6px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle", textAlign: "center" }}>
                                                    {tiers.length > 1 && (
                                                        <button onClick={() => removeTier(t.id)} style={{ padding: "3px 7px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.12)", color: "#ef4444", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>×</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div style={{ textAlign: "right", marginTop: 8 }}>
                                <button onClick={addTier} style={{ ...S.btn("g"), fontSize: 10, padding: "4px 12px" }}>+ Tier Add</button>
                            </div>
                        </div>

                        {/* Register Button */}
                        <div style={{ ...S.card, textAlign: "center" }}>
                            <button onClick={save} disabled={loading} style={{ ...S.btn("p"), width: "100%", padding: "11px 0", fontSize: 13, opacity: loading ? 0.7 : 1, marginBottom: 6 }}>
                                {loading ? "Register in progress…" : "💾 Subscription 패키지 Register"}
                            </button>
                            {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? "#22c55e" : "#ef4444", fontWeight: 700, marginTop: 4 }}>{msg}</div>}
                        </div>
                    </div>
                </div>

            ) : (
                /* ── Register List ── */
                <div>
                    {packages.length === 0 ? (
                        <div style={{ ...S.card, textAlign: "center", padding: "48px 20px" }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Register된 Subscription 패키지가 없습니다</div>
                            <button onClick={() => setViewMode("create")} style={{ ...S.btn("p"), marginTop: 14, fontSize: 12 }}>➕ 첫 패키지 Register</button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {packages.map((pkg, pi) => {
                                const menuKeys = (() => { try { return JSON.parse(pkg.menu_keys || "[]"); } catch { return []; } })();
                                const tierData = (() => { try { return JSON.parse(pkg.pricing_tiers || "null") || []; } catch { return []; } })();
                                const open = pkgOpen[pkg.id] !== false;
                                return (
                                    <div key={pkg.id} style={{ ...S.card, borderColor: "rgba(79,142,247,0.15)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: open ? 14 : 0 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff", flexShrink: 0 }}>{pi + 1}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 900, fontSize: 14, color: "#fff", marginBottom: 2 }}>{pkg.name}</div>
                                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                                                    Menu {menuKeys.length}개 · {tierData.length}Tier Account Pricing제
                                                    {pkg.price_monthly > 0 && <span style={{ marginLeft: 8, color: "#22c55e" }}>1Tier 월 ₩{Number(pkg.price_monthly).toLocaleString("ko-KR")}~</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button onClick={() => setPkgOpen(p => ({ ...p, [pkg.id]: !open }))} style={{ ...S.btn("g"), fontSize: 10, padding: "4px 10px" }}>{open ? "▲" : "▼"}</button>
                                                <button onClick={() => delPkg(pkg.id, pkg.name)} style={{ ...S.btn("d"), fontSize: 11, padding: "5px 12px" }}>🗑 Delete</button>
                                            </div>
                                        </div>

                                        {open && (
                                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                                                {tierData.length > 0 ? (
                                                    <div style={{ marginBottom: 14, overflowX: "auto" }}>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" }}>👥 Accountper Pricing</div>
                                                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                                                            <thead><tr>
                                                                {["Tier", "Account Count", "Monthly Pricing", "Quarter Pricing", "Annual Pricing"].map(h => (
                                                                    <th key={h} style={{ ...S.th, textAlign: "left", padding: "5px 8px" }}>{h}</th>
                                                                ))}
                                                            </tr></thead>
                                                            <tbody>
                                                                {tierData.map((t, ti) => {
                                                                    const col = TIER_PALETTES[ti % TIER_PALETTES.length];
                                                                    const showP = (p, d) => {
                                                                        if (!p) return <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>;
                                                                        const fp = calcFinal(p, d);
                                                                        return <span><span style={{ color: "rgba(255,255,255,0.5)" }}>₩{Number(p).toLocaleString("ko-KR")}</span>{fp && fp !== Number(p) ? <span style={{ color: "#22c55e", fontWeight: 700, marginLeft: 4 }}>→ ₩{Number(fp).toLocaleString("ko-KR")}</span> : null}</span>;
                                                                    };
                                                                    return (
                                                                        <tr key={ti}>
                                                                            <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                                                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: col + "22", color: col, fontWeight: 900, fontSize: 11 }}>{ti + 1}</span>
                                                                            </td>
                                                                            <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 11, color: col, fontWeight: 700 }}>
                                                                                {t.unlimited ? "∞ Unlimited" : (t.accounts ? `${t.accounts}Account` : t.label || "—")}
                                                                            </td>
                                                                            <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 11 }}>{showP(t.monthly, t.disc_m)}</td>
                                                                            <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 11 }}>{showP(t.quarterly, t.disc_q)}</td>
                                                                            <td style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 11 }}>{showP(t.yearly, t.disc_y)}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Accountper Pricing 미Settings</div>}
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase" }}>포함 Menu ({menuKeys.length})</div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 72, overflowY: "auto" }}>
                                                        {menuKeys.map(k => <span key={k} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 5, background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.18)" }}>{k}</span>)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
