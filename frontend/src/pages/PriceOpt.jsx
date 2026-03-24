import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { useI18n } from "../i18n";
import { useGlobalData } from "../context/GlobalDataContext";
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const API = "/api";
const AUTH = (token) => ({
    Authorization: `Bearer ${token || localStorage.getItem("genie_auth_token") || ""}`,
});

const KRW = (v) =>
    v == null ? "—" : "₩" + Number(v).toLocaleString("ko-KR", { maximumFractionDigits: 0 });

const PCT = (v) => (v == null ? "—" : (Number(v) * 100).toFixed(1) + "%");

const CH_COLORS = {
    coupang: "#ef4444", naver: "#22c55e", "11st": "#f97316",
    gmarket: "#6366f1", kakaogift: "#fbbf24", lotteon: "#a855f7",
    auction: "#06b6d4", wemef: "#ec4899", tmon: "#14b8a6",
};
const chColor = (k) => CH_COLORS[k] || "#64748b";

const Badge = ({ label, color }) => (
    <span style={{
        background: color + "22", color, border: `1px solid ${color}55`,
        borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
    }}>{label}</span>
);

const Card = ({ children, style = {} }) => (
    <div className="card" style={style}>{children}</div>
);

const Stat = ({ label, value, color = "#e2e8f0", sub = null }) => (
    <Card>
        <div style={{ fontSize: 10, color: "#7c8fa8", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
        {sub && <div className="sub" style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>}
    </Card>
);

const ScoreBar = ({ value, max = 1, color = "#6366f1" }) => {
    const pct = Math.min(100, Math.round(((value || 0) / Math.max(max, 0.001)) * 100));
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, background: "#1c2842", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4 }} />
            </div>
            <span style={{ fontSize: 10, color, minWidth: 34, fontWeight: 700 }}>{pct}%</span>
        </div>
    );
};

// ── Tab: Summary ──────────────────────────────────────────────────────────────
function SummaryTab({ token }) {
    const { fmt } = useCurrency();
    const [data, setData] = useState(null);

    useEffect(() => {
        const ac = new AbortController();
        fetch(`${API}/v420/price/summary`, { headers: AUTH(token), signal: ac.signal })
            .then(r => r.json())
            .then(d => setData(d))
            .catch(() => { });
        return () => ac.abort();
    }, [token]);

    const reload = () => {
        setData(null);
        fetch(`${API}/v420/price/summary`, { headers: AUTH(token) })
            .then(r => r.json()).then(setData).catch(() => { });
    };

    if (!data) return <div className="sub" style={{ padding: 24 }}>Loading…</div>;

    return (
        <div>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
                <Stat label="Register Product" value={data.products} color="#6366f1" />
                <Stat label="Elasticity 데이터" value={data.elasticity_pts + "건"} color="#06b6d4" />
                <Stat label="최적가 이행" value={data.recommendations + "건"} color="#f97316" />
                <Stat label="Average 권장 마진" value={PCT(data.avg_margin)} color="#22c55e"
                    sub={data.avg_optimal_px ? "권장가 " + fmt(data.avg_optimal_px) : null} />
            </div>

            {/* Channel summary */}
            {data.by_channel?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Channelper 최적가 결과</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 10 }}>
                        {data.by_channel.map((ch, i) => (
                            <Card key={i} style={{ borderLeft: `3px solid ${chColor(ch.channel)}` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <Badge label={ch.channel} color={chColor(ch.channel)} />
                                    <span style={{ fontSize: 11, color: "#7c8fa8" }}>{ch.cnt} items</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>Average 권장가</div>
                                <div style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0" }}>{fmt(parseFloat(ch.avg_optimal))}</div>
                                <div style={{ marginTop: 6 }}>
                                    <ScoreBar value={parseFloat(ch.avg_margin)} max={0.6} color={chColor(ch.channel)} />
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent recommendations */}
            {data.recent?.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>최근 최적가 이력</div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #1c2842", color: "#7c8fa8" }}>
                                {["SKU", "Product Name", "Channel", "현재가", "권장가", "마진율"].map(h => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: h === "현재가" || h === "권장가" || h === "마진율" ? "right" : "left" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.recent.map((r, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                                    <td style={{ padding: "5px 8px", fontFamily: "monospace", color: "#6366f1" }}>{r.sku}</td>
                                    <td style={{ padding: "5px 8px" }}>{r.product_name || "—"}</td>
                                    <td style={{ padding: "5px 8px" }}><Badge label={r.channel} color={chColor(r.channel)} /></td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#94a3b8" }}>{fmt(r.current_price)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: "#22c55e" }}>{fmt(r.optimal_price)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#f97316" }}>{PCT(r.expected_margin)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!data.recommendations && (
                <div className="sub" style={{ textAlign: "center", padding: 24 }}>
                    최적가 계산 후 SKU를 Analysis하면 결과가 표시됩니다.
                </div>
            )}

            <button className="btn" onClick={reload} style={{ marginTop: 14 }}>↺ Refresh</button>
        </div>
    );
}

const PRICE_CATEGORIES = [
    "\uc804\uc790/\uc74c\ud5a5", "\uc804\uc790/\uc785\ub825\uc7a5\uce58", "\uc804\uc790/\uc8fc\ubcc0\uae30\uae30", "\uc804\uc790/\uce74\uba54\ub77c", "\uc804\uc790/\ucda9\uc804",
    "\ud328\uc158/\uc758\ub958", "\ud328\uc158/\uc7a1\ud654", "\ubdf0\ud2f0/\uc2a4\ud0a8\ucf00\uc5b4", "\ubdf0\ud2f0/\uba54\uc774\ud06c\uc5c5",
    "\uc2dd\ud488/\uac74\uac15\uc2dd\ud488", "\uc0dd\ud65c/\uc8fc\ubc29\uc6a9\ud488", "\uc2a4\ud3ec\uce20/\uc6b4\ub3d9\uc6a9\ud488", "\ub3c4\uc11c/\ubb38\uad6c", "\uc644\uad6c/\ucde8\ubbf8",
];

const PRICE_UNITS = ["\uac1c", "\ub300", "\ubcf8", "\uc138\ud2b8", "\ubc15\uc2a4", "\ud314\ub808\ud2b8", "kg", "L", "m"];

// ── Tab: Products ─────────────────────────────────────────────────────────────
function ProductsTab({ token }) {
    const { fmt } = useCurrency();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        sku: "", product_name: "", category: "", spec: "", unit: "\uac1c",
        cost_price: "", io_fee: "", storage_fee: "", work_fee: "", shipping_fee: "",
        target_margin: "0.30", base_price: "",
    });
    const [msg, setMsg] = useState("");

    const productCost = React.useMemo(() => {
        const vals = [form.cost_price, form.io_fee, form.storage_fee, form.work_fee, form.shipping_fee];
        if (vals.every(v => v === "" || v == null)) return null;
        return vals.reduce((s, v) => s + (parseFloat(v) || 0), 0);
    }, [form.cost_price, form.io_fee, form.storage_fee, form.work_fee, form.shipping_fee]);

    useEffect(() => {
        const ac = new AbortController();
        fetch(`${API}/v420/price/products`, { headers: AUTH(token), signal: ac.signal })
            .then(r => r.json())
            .then(d => setProducts(d.products || []))
            .catch(() => { });
        return () => ac.abort();
    }, [token]);

    const load = () =>
        fetch(`${API}/v420/price/products`, { headers: AUTH(token) })
            .then(r => r.json()).then(d => setProducts(d.products || [])).catch(() => { });

    const save = async () => {
        const r = await fetch(`${API}/v420/price/products`, {
            method: "POST",
            headers: { ...AUTH(token), "Content-Type": "application/json" },
            body: JSON.stringify({
                sku: form.sku,
                product_name: form.product_name,
                category: form.category,
                spec: form.spec,
                unit: form.unit,
                cost_price: productCost != null ? productCost : (parseFloat(form.cost_price) || 0),
                purchase_cost: parseFloat(form.cost_price) || 0,
                io_fee: parseFloat(form.io_fee) || 0,
                storage_fee: parseFloat(form.storage_fee) || 0,
                work_fee: parseFloat(form.work_fee) || 0,
                shipping_fee: parseFloat(form.shipping_fee) || 0,
                target_margin: parseFloat(form.target_margin) || 0.30,
                base_price: form.base_price ? parseFloat(form.base_price) : undefined,
            }),
        });
        const d = await r.json();
        setMsg(d.ok ? `\u2705 \ub4f1\ub85d\ub428: ${form.sku}` : `\u274c ${d.error || JSON.stringify(d)}`);
        load();
    };

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const inpStyle = {
        width: "100%", background: "#0f172a", border: "1px solid #1c2842",
        borderRadius: 6, color: "#e2e8f0", padding: "5px 8px", fontSize: 12, boxSizing: "border-box",
    };
    const lbl = (text) => (
        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{text}</label>
    );

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Form */}
            <div>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>\uc0c1\ud488 \ub4f1\ub85d / \uc218\uc815</h4>
                <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    {/* SKU / Product Name */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>{lbl("SKU *")}<input style={inpStyle} value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="SKU-001" /></div>
                        <div>{lbl("\uc0c1\ud488\uba85")}<input style={inpStyle} value={form.product_name} onChange={e => set("product_name", e.target.value)} placeholder="\uc0c1\ud488\uba85" /></div>
                    </div>
                    {/* Category */}
                    <div>{lbl("\uce74\ud14c\uace0\ub9ac")}<select style={inpStyle} value={form.category} onChange={e => set("category", e.target.value)}>
                        <option value="">\uce74\ud14c\uace0\ub9ac \uc120\ud0dd</option>
                        {PRICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                    {/* 규격 / Unit */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
                        <div>{lbl("\uaddc\uaca9 / Spec")}<input style={inpStyle} value={form.spec} onChange={e => set("spec", e.target.value)} placeholder="\uc608: 100x200x50mm, 1kg" /></div>
                        <div>{lbl("\ub2e8\uc704 / Unit")}<select style={inpStyle} value={form.unit} onChange={e => set("unit", e.target.value)}>
                            {PRICE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select></div>
                    </div>
                    {/* Cost Price 구성 */}
                    <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, marginBottom: 8 }}>\uc6d0\uac00 \uad6c\uc131</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div>{lbl("\ub9e4\uc785\uc6d0\uac00 (\u20a9)")}<input style={inpStyle} type="number" value={form.cost_price} onChange={e => set("cost_price", e.target.value)} placeholder="0" /></div>
                            <div>{lbl("\uc785\u00b7\ucd9c\uace0\ube44 (\u20a9)")}<input style={inpStyle} type="number" value={form.io_fee} onChange={e => set("io_fee", e.target.value)} placeholder="0" /></div>
                            <div>{lbl("\ubcf4\uad00\ube44 (\u20a9)")}<input style={inpStyle} type="number" value={form.storage_fee} onChange={e => set("storage_fee", e.target.value)} placeholder="0" /></div>
                            <div>{lbl("\uae30\ubcf8\uc791\uc5c5\ube44 (\u20a9)")}<input style={inpStyle} type="number" value={form.work_fee} onChange={e => set("work_fee", e.target.value)} placeholder="0" /></div>
                            <div>{lbl("\ubc30\uc1a1\ube44 (\u20a9)")}<input style={inpStyle} type="number" value={form.shipping_fee} onChange={e => set("shipping_fee", e.target.value)} placeholder="0" /></div>
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                <div style={{ background: "#0f172a", borderRadius: 6, padding: "6px 10px", border: "1px solid rgba(249,115,22,0.3)" }}>
                                    <div style={{ fontSize: 9, color: "#7c8fa8", marginBottom: 2 }}>\uc0c1\ud488\uc6d0\uac00 (\uc790\ub3d9\uacc4\uc0b0)</div>
                                    <div style={{ fontWeight: 800, fontSize: 15, color: "#f97316" }}>{productCost != null ? "\u20a9" + productCost.toLocaleString() : "\u2014"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 마진 / 기준가 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>{lbl("\ubaa9\ud45c \ub9c8\uc9c4\uc728 (0.30=30%)")}<input style={inpStyle} type="number" value={form.target_margin} onChange={e => set("target_margin", e.target.value)} placeholder="0.30" /></div>
                        <div>{lbl("\uae30\uc900 \ud310\ub9e4\uac00 (\uc120\ud0dd)")}<input style={inpStyle} type="number" value={form.base_price} onChange={e => set("base_price", e.target.value)} placeholder="65000" /></div>
                    </div>
                </div>
                <button className="btn" onClick={save} disabled={!form.sku} style={{ width: "100%" }}>+ \uc0c1\ud488 \uc800\uc7a5</button>
                {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith("\u2705") ? "#22c55e" : "#ef4444" }}>{msg}</div>}
            </div>

            {/* List */}
            <div>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>\ub4f1\ub85d\ub41c \uc0c1\ud488 ({products.length})</h4>
                {products.map((p, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: "#0f172a", borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontFamily: "monospace", color: "#6366f1", fontWeight: 700 }}>{p.sku}</span>
                            <span style={{ color: "#94a3b8", fontSize: 10 }}>{p.category || ""} {p.unit ? `· ${p.unit}` : ""}</span>
                        </div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.product_name}</div>
                        {p.spec && <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>\uaddc\uaca9: {p.spec}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, color: "#7c8fa8" }}>
                            <span>\uc6d0\uac00 <b style={{ color: "#f97316" }}>{fmt(p.cost_price)}</b></span>
                            <span>마진 <b style={{ color: "#22c55e" }}>{PCT(p.target_margin)}</b></span>
                            <span>기준가 <b style={{ color: "#e2e8f0" }}>{fmt(p.base_price)}</b></span>
                        </div>
                    </div>
                ))}
                {products.length === 0 && <div style={{ color: "#64748b", fontSize: 11, padding: 12 }}>Register된 Product이 없습니다.</div>}
            </div>
        </div>
    );
}


// ── Tab: Optimize ─────────────────────────────────────────────────────────────
function OptimizeTab({ token }) {
    const { fmt } = useCurrency();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ sku: "", channel: "*", current_price: "", inventory: "0" });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recent, setRecent] = useState([]);
    // [v11] CatalogSync 양방향 Sync
    const { updateCatalogChannelPrices, updateProductPrice } = useGlobalData();

    const loadRecent = useCallback((signal) =>
        fetch(`${API}/v420/price/recommendations`, { headers: AUTH(token), signal })
            .then(r => r.json())
            .then(d => setRecent(d.recommendations?.slice(0, 6) || []))
            .catch(() => { })
        , [token]);

    useEffect(() => {
        const ac = new AbortController();
        fetch(`${API}/v420/price/products`, { headers: AUTH(token), signal: ac.signal })
            .then(r => r.json())
            .then(d => {
                const prods = d.products || [];
                setProducts(prods);
                if (prods.length) setForm(f => ({ ...f, sku: prods[0].sku }));
            }).catch(() => { });
        loadRecent(ac.signal);
        return () => ac.abort();
    }, [token, loadRecent]);

    const run = async () => {
        setLoading(true);
        setResult(null);
        try {
            const r = await fetch(`${API}/v420/price/optimize`, {
                method: "POST",
                headers: { ...AUTH(token), "Content-Type": "application/json" },
                body: JSON.stringify({
                    sku: form.sku,
                    channel: form.channel || "*",
                    current_price: form.current_price ? parseFloat(form.current_price) : undefined,
                    inventory: parseInt(form.inventory) || 0,
                }),
            });
            const d = await r.json();
            setResult(d);
            loadRecent();
            // [v11] PriceOpt → CatalogSync → OrderHub 양방향 Sync
            if (d.sku && d.optimal_price) {
                const channelKey = form.channel === '*' ? 'all' : form.channel;
                updateCatalogChannelPrices?.(d.sku, { [channelKey]: d.optimal_price });
                updateProductPrice?.(d.sku, d.optimal_price, channelKey === 'all' ? null : channelKey);
            }
        } finally { setLoading(false); }
    };

    const CHANNELS = ["*", "coupang", "naver", "11st", "gmarket", "kakaogift", "lotteon"];

    return (
        <div>
            {/* Form */}
            <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>최적가 계산 파라미터</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>SKU</label>
                        <select value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                            style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                            {products.map(p => <option key={p.sku} value={p.sku}>{p.product_name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>Channel</label>
                        <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                            style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                            {CHANNELS.map(c => <option key={c} value={c}>{c === "*" ? "All (Unified)" : c}</option>)}
                        </select>
                    </div>
                    {[["current_price", "현재 Sale Price (₩)"], ["inventory", "Stock Quantity"]].map(([k, label]) => (
                        <div key={k}>
                            <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{label}</label>
                            <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                                style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
                        </div>
                    ))}
                </div>
                <button className="btn" onClick={run} disabled={loading || !form.sku} style={{ background: "#6366f1" }}>
                    {loading ? "⏳ 계산 in progress…" : "🧮 최적가 계산"}
                </button>
            </div>

            {/* Result */}
            {result && (
                <div className="card" style={{ marginBottom: 16, borderLeft: "3px solid #22c55e" }}>
                    <h4 style={{ marginTop: 0, fontSize: 13 }}>
                        결과: {result.sku} <span style={{ color: "#7c8fa8", fontWeight: 400 }}>({result.channel})</span>
                        {" "}<Badge label={result.algo} color="#6366f1" />
                        {result.r2 != null && <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>R²={result.r2}</span>}
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                        {[
                            { label: "현재 Sale Price", value: fmt(result.current_price), color: "#94a3b8" },
                            { label: "🏆 최적 권장가", value: fmt(result.optimal_price), color: "#22c55e" },
                            { label: "Cost Price", value: fmt(result.cost_price), color: "#64748b" },
                            { label: "Min Apply가", value: fmt(result.min_price), color: "#7c8fa8" },
                            { label: "예상 마진율", value: PCT(result.expected_margin), color: "#f97316" },
                            { label: "예상 판매량", value: result.expected_qty ? Math.round(result.expected_qty) + "개" : "—", color: "#06b6d4" },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ padding: "8px 10px", background: "#0f172a", borderRadius: 6 }}>
                                <div style={{ fontSize: 10, color: "#7c8fa8" }}>{label}</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                            </div>
                        ))}
                    </div>
                    {result.clearance_price && (
                        <div style={{ marginTop: 12, padding: "8px 12px", background: result.inventory < 30 ? "#1e1a2e" : "#12200f", borderRadius: 6, fontSize: 12 }}>
                            {result.inventory < 30
                                ? `📦 Stock 부족(${result.inventory}개) → 프리미엄 Price 제안: `
                                : `📦 Stock 과잉 (${result.inventory}개) → 클리어런스 Price 제안: `}
                            <strong style={{ color: result.inventory < 30 ? "#a855f7" : "#f97316", fontSize: 14 }}>
                                {fmt(result.clearance_price)}
                            </strong>
                        </div>
                    )}
                </div>
            )}

            {/* Recent */}
            {recent.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>최근 최적가 이력</div>
                    {recent.map((r, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "#0f172a", borderRadius: 6, marginBottom: 5, fontSize: 11, alignItems: "center" }}>
                            <span style={{ fontFamily: "monospace", color: "#6366f1" }}>{r.sku}</span>
                            <Badge label={r.channel} color={chColor(r.channel)} />
                            <span style={{ color: "#94a3b8" }}>{fmt(r.current_price)} →</span>
                            <span style={{ fontWeight: 800, color: "#22c55e" }}>{fmt(r.optimal_price)}</span>
                            <span style={{ color: "#f97316" }}>{PCT(r.expected_margin)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Tab: Scenario Simulator ───────────────────────────────────────────────────
function ScenarioTab({ token }) {
    const { fmt } = useCurrency();
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        sku: "", channel: "*",
        prices: "55000,60000,65000,70000,75000,80000",
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const ac = new AbortController();
        fetch(`${API}/v420/price/products`, { headers: AUTH(token), signal: ac.signal })
            .then(r => r.json())
            .then(d => {
                const prods = d.products || [];
                setProducts(prods);
                if (prods.length) setForm(f => ({ ...f, sku: prods[0].sku }));
            }).catch(() => { });
        return () => ac.abort();
    }, [token]);

    const run = async () => {
        setLoading(true);
        setResult(null);
        try {
            const prices = form.prices.split(",").map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
            if (!prices.length) {
                setResult({ error: "Price List을 올바르게 입력해 주세요. (쉼표로 구분)" });
                return;
            }
            const r = await fetch(`${API}/v420/price/simulate`, {
                method: "POST",
                headers: { ...AUTH(token), "Content-Type": "application/json" },
                body: JSON.stringify({ sku: form.sku, channel: form.channel || "*", prices }),
            });
            const d = await r.json();
            setResult(d);
        } catch (e) {
            setResult({ error: "시뮬레이션 요청 Failed: " + e.message });
        } finally { setLoading(false); }
    };

    const maxProfit = result?.scenarios?.length
        ? Math.max(...result.scenarios.map(s => s.profit || 0), 1)
        : 1;

    return (
        <div>
            <div className="card" style={{ marginBottom: 16 }}>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>Price 시나리오 시뮬레이터</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>SKU</label>
                        <select value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                            style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                            {products.map(p => <option key={p.sku} value={p.sku}>{p.product_name} ({p.sku})</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>Channel</label>
                        <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                            style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "5px 8px", fontSize: 12 }}>
                            {["*", "coupang", "naver", "11st", "gmarket"].map(c => <option key={c} value={c}>{c === "*" ? "All" : c}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>Test Price List (₩, 쉼표 구분)</label>
                    <input value={form.prices} onChange={e => setForm(f => ({ ...f, prices: e.target.value }))}
                        placeholder="55000,60000,65000,70000"
                        style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#94d9a2", padding: "6px 10px", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box" }} />
                </div>
                <button className="btn" onClick={run} disabled={loading || !form.sku} style={{ background: "#f97316" }}>
                    {loading ? "⏳ 계산 in progress…" : "🚀 시뮬레이션 Run"}
                </button>
            </div>

            {/* Error state */}
            {result?.error && (
                <div style={{ padding: "12px 16px", background: "#1e0f0f", borderRadius: 8, border: "1px solid #ef444433", color: "#ef4444", fontSize: 12, marginBottom: 12 }}>
                    ❌ {result.error}
                </div>
            )}

            {/* Results table */}
            {result?.scenarios && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                        시나리오 결과 — {result.sku} / {result.channel}
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #1c2842", color: "#7c8fa8" }}>
                                {["Price", "예상 판매량", "예상 Revenue", "예상 Profit", "마진율", "Profit 분포"].map(h => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: "right", fontWeight: 500 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {result.scenarios.map((s, i) => {
                                const isMax = s.profit === Math.max(...result.scenarios.map(x => x.profit || 0));
                                return (
                                    <tr key={i} style={{ borderBottom: "1px solid #0f172a", background: isMax ? "#0d2018" : "transparent" }}>
                                        <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: isMax ? 800 : 400, color: isMax ? "#22c55e" : "#e2e8f0" }}>{fmt(s.price)}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#06b6d4" }}>{s.qty_est != null ? Math.round(s.qty_est) + "개" : "—"}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(s.revenue)}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#22c55e", fontWeight: 700 }}>{fmt(s.profit)}</td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#f97316" }}>{PCT(s.margin)}</td>
                                        <td style={{ padding: "5px 8px", minWidth: 100 }}>
                                            <ScoreBar value={s.profit || 0} max={maxProfit} color={isMax ? "#22c55e" : "#6366f1"} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                        * Profit이 가장 높은 행이 강조 표시됩니다. 로그-선형 Elasticity 모델 기반 추정.
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Tab: Channel Mix ──────────────────────────────────────────────────────────
function ChannelMixTab({ token }) {
    const { fmt } = useCurrency();
    const [budget, setBudget] = useState("5000000");
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = useCallback((signal) =>
        fetch(`${API}/v420/channel-mix/results`, { headers: AUTH(token), signal })
            .then(r => r.json())
            .then(d => setHistory(d.results || []))
            .catch(() => { })
        , [token]);

    useEffect(() => {
        const ac = new AbortController();
        loadHistory(ac.signal);
        return () => ac.abort();
    }, [loadHistory]);

    const run = async () => {
        setLoading(true);
        setResult(null);
        try {
            const r = await fetch(`${API}/v420/channel-mix/simulate`, {
                method: "POST",
                headers: { ...AUTH(token), "Content-Type": "application/json" },
                body: JSON.stringify({ total_budget: parseFloat(budget) || 5000000 }),
            });
            const d = await r.json();
            setResult(d);
            loadHistory();
        } finally { setLoading(false); }
    };

    const maxReturn = result ? Math.max(...(result.allocations || []).map(a => a.expected_return || 0), 1) : 1;

    return (
        <div>
            <div className="card" style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>Total Budget (₩)</label>
                    <input type="number" value={budget} onChange={e => setBudget(e.target.value)}
                        style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <button className="btn" onClick={run} disabled={loading} style={{ background: "#a855f7", height: 36 }}>
                    {loading ? "⏳" : "🎯 Channel 믹스 최적화"}
                </button>
            </div>

            {result && (
                <div>
                    {/* KPI */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                        <Stat label="Total Budget" value={fmt(result.total_budget)} color="#6366f1" />
                        <Stat label="예상 Total Profit" value={fmt(result.total_return)} color="#22c55e" />
                        <Stat label="Unified ROI" value={result.blended_roi?.toFixed(2) + "x"} color="#f97316"
                            sub={`Profit ${fmt(result.total_profit)}`} />
                    </div>

                    {/* Allocation bars */}
                    <div style={{ marginBottom: 16 }}>
                        {result.allocations.map((a, i) => (
                            <div key={i} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <Badge label={a.channel} color={chColor(a.channel)} />
                                        <span style={{ fontSize: 11, color: "#94a3b8" }}>ROI {a.roi_per_won}x</span>
                                    </div>
                                    <div style={{ fontSize: 11, display: "flex", gap: 12 }}>
                                        <span style={{ color: "#7c8fa8" }}>{a.allocation_pct}%</span>
                                        <span>{fmt(a.spend)}</span>
                                        <span style={{ color: "#22c55e", fontWeight: 700 }}>→ {fmt(a.expected_return)}</span>
                                    </div>
                                </div>
                                <ScoreBar value={a.expected_return} max={maxReturn} color={chColor(a.channel)} />
                            </div>
                        ))}
                    </div>

                    {/* Allocation table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid #1c2842", color: "#7c8fa8" }}>
                                {["Channel", "ROI", "배분율", "집행Budget", "예상 Profit", "예상 Profit"].map(h => (
                                    <th key={h} style={{ padding: "5px 8px", textAlign: h === "Channel" ? "left" : "right" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {result.allocations.map((a, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #0f172a" }}>
                                    <td style={{ padding: "5px 8px" }}><Badge label={a.channel} color={chColor(a.channel)} /></td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#f97316", fontWeight: 700 }}>{a.roi_per_won}x</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{a.allocation_pct}%</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(a.spend)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#22c55e", fontWeight: 700 }}>{fmt(a.expected_return)}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#06b6d4" }}>{fmt(a.expected_profit)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {history.length > 0 && !result && (
                <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>과거 시뮬레이션</div>
                    {history.slice(0, 5).map((h, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: "#0f172a", borderRadius: 6, marginBottom: 6, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#7c8fa8" }}>#{h.id}</span>
                            <span>Budget <b>{fmt(h.total_budget)}</b></span>
                            <span>Profit <b style={{ color: "#22c55e" }}>{fmt(h.total_return)}</b></span>
                            <span style={{ color: "#f97316" }}>ROI {h.blended_roi?.toFixed(2)}x</span>
                            <span style={{ color: "#64748b", fontSize: 10 }}>{h.created_at?.slice(0, 16)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Tab: 경쟁가 모니터링 ─────────────────────────────────────────────────────
function CompetitorPriceTab({ inventory, digitalShelfData }) {
    const { fmt } = useCurrency();
    // currency formatting via useCurrency fmt()
    const competitorData = [
        { sku:'WH-1000XM5-01', name:'무선 헤드폰', ourPrice:89000, compA:86000, compB:91000, sosRank:3, alert:true },
        { sku:'KB-MXM-RGB-02', name:'RGB 키보드', ourPrice:149000, compA:155000, compB:148000, sosRank:1, alert:false },
        { sku:'HC-USB4-7P-01', name:'USB-C 허브', ourPrice:49000, compA:44900, compB:47000, sosRank:5, alert:true },
        { sku:'CAM-4K-PRO-01', name:'4K 웹캠', ourPrice:129000, compA:125000, compB:135000, sosRank:2, alert:false },
        { sku:'MS-ERG-BL-01', name:'에르고 마우스', ourPrice:69000, compA:69000, compB:72000, sosRank:4, alert:false },
        { sku:'CH-60W-GAN-01', name:'60W 급속충전기', ourPrice:39000, compA:36500, compB:38000, sosRank:7, alert:true },
    ];
    const alerts = competitorData.filter(d => d.alert);
    return (
        <div style={{ display:'grid', gap:14 }}>
            {alerts.length > 0 && (
                <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:12 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:'#ef4444', marginBottom:8 }}>⚠️ 최저가 위반 주의 ({alerts.length}종) — 경쟁사가 우리보다 낮음</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {alerts.map(a => (
                            <div key={a.sku} style={{ padding:'6px 12px', background:'rgba(239,68,68,0.1)', borderRadius:8 }}>
                                <span style={{ fontSize:11, fontWeight:700 }}>{a.name}</span>
                                <span style={{ fontSize:10, color:'#ef4444', marginLeft:8 }}>우리: {fmt(a.ourPrice)} / 경쟁A: {fmt(a.compA)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {['SKU','Product Name','우리 Price','경쟁사A','경쟁사B','SoS Rank','차이(A)','권장 조치'].map(h=><th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                    {competitorData.map(d => {
                        const diffA = d.ourPrice - d.compA;
                        return (
                            <tr key={d.sku} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)', background:d.alert?'rgba(239,68,68,0.03)':'' }}>
                                <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{d.sku}</td>
                                <td style={{ fontSize:11, fontWeight:600, padding:'8px 4px' }}>{d.name}</td>
                                <td style={{ fontFamily:'monospace', fontWeight:700, padding:'8px 4px' }}>{fmt(d.ourPrice)}</td>
                                <td style={{ fontFamily:'monospace', padding:'8px 4px', color:d.compA<d.ourPrice?'#ef4444':'#22c55e' }}>{fmt(d.compA)}</td>
                                <td style={{ fontFamily:'monospace', padding:'8px 4px', color:d.compB<d.ourPrice?'#ef4444':'#22c55e' }}>{fmt(d.compB)}</td>
                                <td style={{ textAlign:'center', padding:'8px 4px' }}><span style={{ fontWeight:700, color:d.sosRank<=3?'#22c55e':'#f97316' }}>#{d.sosRank}</span></td>
                                <td style={{ fontFamily:'monospace', padding:'8px 4px', color:diffA<0?'#ef4444':'#22c55e', fontWeight:700 }}>{diffA>0?'+':''}{fmt(diffA)}</td>
                                <td style={{ fontSize:10, padding:'8px 4px' }}>{d.alert?<span style={{ color:'#ef4444', fontWeight:700 }}>⬇ Price인하 검토</span>:<span style={{ color:'#22c55e' }}>✅ 유지</span>}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Tab: Pro모션 캘린더 ──────────────────────────────────────────────────────
function PriceCalendarTab({ priceCalendar, addPriceCalendarEvent }) {
    const { fmt } = useCurrency();
    // currency formatting via useCurrency fmt()
    const demoEvents = [
        { id:'PC-001', sku:'WH-1000XM5-01', name:'무선 헤드폰', channel:'coupang', startDate:'2026-03-20', endDate:'2026-03-22', promoPrice:79000, discountRate:11.2, reason:'Coupang 딜', status:'예정' },
        { id:'PC-002', sku:'KB-MXM-RGB-02', name:'RGB 키보드', channel:'naver', startDate:'2026-03-25', endDate:'2026-03-27', promoPrice:129000, discountRate:13.4, reason:'스피드 딜', status:'예정' },
        { id:'PC-003', sku:'HC-USB4-7P-01', name:'USB-C 허브', channel:'all', startDate:'2026-04-01', endDate:'2026-04-05', promoPrice:43900, discountRate:10.4, reason:'봄 Event', status:'초안' },
    ];
    const allEvents = [...demoEvents, ...priceCalendar];
    const [form, setForm] = React.useState({ sku:'', name:'', channel:'all', startDate:'', endDate:'', promoPrice:'', reason:'' });
    const [saved, setSaved] = React.useState(false);
    const CH_BADGE = { coupang:'#ef4444', naver:'#22c55e', '11st':'#f97316', all:'#4f8ef7' };
    return (
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[{l:'Register Event',v:allEvents.length,c:'#4f8ef7'},{l:'예정',v:allEvents.filter(e=>e.status==='예정').length,c:'#22c55e'},{l:'초안',v:allEvents.filter(e=>e.status==='초안').length,c:'#f97316'}].map(({l,v,c}) => (
                    <div key={l} style={{ background:'rgba(255,255,255,0.03)', borderRadius:12, padding:'12px', border:'1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{l}</div>
                        <div style={{ fontSize:24, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
                    </div>
                ))}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ borderBottom:'1px solid rgba(99,140,255,0.15)' }}>
                    {['SKU','Product','Channel','Start일','End Date','Pro모가','할인율','사유','Status'].map(h=><th key={h} style={{ padding:'8px 4px', textAlign:'left', fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                    {allEvents.map(e => (
                        <tr key={e.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7', padding:'8px 4px' }}>{e.sku}</td>
                            <td style={{ fontSize:11, padding:'8px 4px' }}>{e.name}</td>
                            <td style={{ padding:'8px 4px' }}><span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, background:(CH_BADGE[e.channel]||'#64748b')+'18', color:(CH_BADGE[e.channel]||'#64748b') }}>{e.channel}</span></td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{e.startDate}</td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{e.endDate}</td>
                            <td style={{ fontFamily:'monospace', fontWeight:700, padding:'8px 4px', color:'#f97316' }}>{fmt(e.promoPrice)}</td>
                            <td style={{ fontSize:11, padding:'8px 4px', color:'#22c55e' }}>{e.discountRate}%↓</td>
                            <td style={{ fontSize:10, padding:'8px 4px' }}>{e.reason}</td>
                            <td style={{ padding:'8px 4px' }}><span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, background:e.status==='예정'?'rgba(34,197,94,0.15)':'rgba(249,115,22,0.15)', color:e.status==='예정'?'#22c55e':'#f97316' }}>{e.status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ padding:'16px', background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', borderRadius:12 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>📅 Pro모션 Event Register</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {[['SKU','sku'],['Product Name','name'],['Channel','channel'],['Start일','startDate'],['End Date','endDate'],['Pro모가','promoPrice'],['사유','reason']].map(([lbl,key]) => (
                        <div key={key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                            <label style={{ fontSize:10, color:'var(--text-3)', fontWeight:600 }}>{lbl}</label>
                            <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                                style={{ padding:'7px 10px', borderRadius:8, background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', fontSize:12 }} />
                        </div>
                    ))}
                </div>
                {saved?<div style={{ marginTop:10, fontSize:11, color:'#22c55e' }}>✅ Pro모션 일정 Register Done</div>:(
                    <button style={{ marginTop:12, padding:'7px 20px', borderRadius:9, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#f97316,#ef4444)', color:'#fff', fontWeight:700, fontSize:12 }}
                        onClick={()=>{addPriceCalendarEvent(form);setSaved(true);setTimeout(()=>setSaved(false),2000);}}>📅 Register</button>
                )}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
    { id: "summary", label: "📊 Summary" },
    { id: "products", label: "📦 Product Register" },
    { id: "optimize", label: "🧮 최적가 계산" },
    { id: "scenario", label: "🚀 시나리오 시뮬" },
    { id: "mix", label: "🎯 Channel 믹스" },
    { id: "competitor", label: "🔍 경쟁가 모니터링" },
    { id: "calendar", label: "📅 Pro모션 캨린더" },
];

/* ── Dynamic Repricer Tab ────────────────────────────────────── */
function DynamicRepricerTab({ inventory = [], digitalShelfData = {} }) {
    const [rules, setRules] = React.useState([
        { id: 1, name: "최저가 +5% 유지", sku: "WH-1000XM5", channel: "Coupang", mode: "min_price", minMargin: 15, active: true, lastRun: "2분 전", changeCount: 8 },
        { id: 2, name: "ROAS 4x 이상 유지", sku: "KB-MXM-RGB", channel: "Naver", mode: "roas_target", targetRoas: 4.0, active: true, lastRun: "15분 전", changeCount: 3 },
        { id: 3, name: "Stock 50개 이하 → 5% 인상", sku: "HC-USB4-7P", channel: "All", mode: "inventory", threshold: 50, increaseRate: 5, active: false, lastRun: "1Time 전", changeCount: 1 },
    ]);
    const [history] = React.useState([
        { time: "11:18", sku: "WH-1000XM5", channel: "Coupang", prev: 89000, next: 91800, reason: "경쟁사 87,500 감지 → +5% 유지" },
        { time: "11:05", sku: "KB-MXM-RGB", channel: "Naver", prev: 149000, next: 145000, reason: "ROAS 3.8x → Goal치 복구 인하" },
        { time: "10:47", sku: "WH-1000XM5", channel: "11Street", prev: 91800, next: 91800, reason: "조건 충족 — Change None" },
        { time: "10:30", sku: "CAM-4K-PRO", channel: "Coupang", prev: 129000, next: 133000, reason: "Stock 42개(임계Value 이하) → 3% 인상" },
    ]);

    const MODE_LABEL = { min_price: "최저가 추적", roas_target: "ROAS Goal", inventory: "Stock Integration" };
    const MODE_COLOR = { min_price: "#4f8ef7", roas_target: "#22c55e", inventory: "#f97316" };

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Header KPI */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                    { l: "Active 규칙", v: rules.filter(r => r.active).length + "개", c: "#22c55e" },
                    { l: "Today Price Change", v: history.length + "건", c: "#4f8ef7" },
                    { l: "Average 마진 개선", v: "+2.4%", c: "#a855f7" },
                    { l: "DigitalShelf Integration", v: digitalShelfData?.sos ? "ON" : "실Time", c: "#f97316" },
                ].map(({ l, v, c }) => (
                    <div key={l} style={{ padding: "14px 16px", borderRadius: 12, background: `${c}0f`, border: `1px solid ${c}33` }}>
                        <div style={{ fontSize: 10, color: "#7c8fa8", fontWeight: 700, marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
                    </div>
                ))}
            </div>

            {/* Auto Price조정 규칙 List */}
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0", marginBottom: 12 }}>⚡ Price Auto조정 규칙</div>
                <div style={{ display: "grid", gap: 8 }}>
                    {rules.map(r => (
                        <div key={r.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: `1px solid ${r.active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 800, fontSize: 12, color: "#e2e8f0" }}>{r.name}</span>
                                    <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 99, fontWeight: 700, background: `${MODE_COLOR[r.mode]}18`, color: MODE_COLOR[r.mode], border: `1px solid ${MODE_COLOR[r.mode]}33` }}>{MODE_LABEL[r.mode]}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.sku} · {r.channel} · 마지막 Run {r.lastRun} · {r.changeCount}회 조정</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 10, color: r.active ? "#22c55e" : "#7c8fa8", fontWeight: 700 }}>{r.active ? "● Active" : "○ Inactive"}</span>
                                <button
                                    onClick={() => setRules(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))}
                                    style={{ padding: "4px 12px", borderRadius: 7, border: "none", background: r.active ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: r.active ? "#ef4444" : "#22c55e", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                                    {r.active ? "Stop" : "Activate"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Price Change 이력 */}
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0", marginBottom: 12 }}>📋 Price Change 이력 (Today)</div>
                <div style={{ display: "grid", gap: 0, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "60px 130px 80px 80px 80px 1fr", gap: 8, padding: "8px 14px", fontSize: 10, fontWeight: 700, color: "#7c8fa8", background: "rgba(255,255,255,0.02)" }}>
                        <span>Time</span><span>SKU</span><span>Channel</span><span>Previous가</span><span>Change가</span><span>사유</span>
                    </div>
                    {history.map((h, i) => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 130px 80px 80px 80px 1fr", gap: 8, padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 11, alignItems: "center" }}>
                            <span style={{ color: "#7c8fa8", fontFamily: "monospace" }}>{h.time}</span>
                            <span style={{ fontWeight: 700, color: "#e2e8f0" }}>{h.sku}</span>
                            <span style={{ color: "#94a3b8" }}>{h.channel}</span>
                            <span style={{ color: "#64748b", textDecoration: "line-through" }}>₩{h.prev.toLocaleString()}</span>
                            <span style={{ fontWeight: 800, color: h.next > h.prev ? "#ef4444" : "#22c55e" }}>₩{h.next.toLocaleString()}</span>
                            <span style={{ fontSize: 10, color: "#7c8fa8" }}>{h.reason}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ── PriceOpt 메인 Component ──────────────────────────────────── */
export default function PriceOpt() {
    const { fmt } = useCurrency();
    const [tab, setTab] = useState("summary");

    const { token } = useAuth();
    const { t } = useI18n();
    const { inventory, digitalShelfData, priceCalendar, addPriceCalendarEvent } = useGlobalData();

    const TABS_I18N = [
        { id: "summary",  label: t("priceOpt.tabSummary")  || "📊 Summary" },
        { id: "products", label: t("priceOpt.tabProducts") || "📦 Product" },
        { id: "optimize", label: t("priceOpt.tabOptimize") || "🧮 최적가" },
        { id: "scenario", label: t("priceOpt.tabScenario") || "🚀 시나리오" },
        { id: "mix",      label: t("priceOpt.tabMix")      || "🎯 Channel믹스" },
        { id: "repricer", label: "⚡ Dynamic Repricer" },
        { id: "competitor", label: "🔍 경쟁가" },
        { id: "calendar",   label: "📅 Pro모션 캘린더" },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 18 }}>{t("priceOpt.pageTitle")}</h2>
                <div className="sub">{t("priceOpt.pageSub")}</div>
            </div>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #1c2842", paddingBottom: 8, flexWrap: "wrap" }}>
                {TABS_I18N.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                        style={{
                            background: tab === tb.id ? "#1c2842" : "transparent",
                            border: "1px solid " + (tab === tb.id ? "#3b4d6e" : "transparent"),
                            color: tab === tb.id ? "#e2e8f0" : "#7c8fa8",
                            borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                        }}>
                        {tb.label}
                    </button>
                ))}
            </div>

            <div className="card">
                {tab === "summary"    && <SummaryTab token={token} />}
                {tab === "products"   && <ProductsTab token={token} />}
                {tab === "optimize"   && <OptimizeTab token={token} />}
                {tab === "scenario"   && <ScenarioTab token={token} />}
                {tab === "mix"        && <ChannelMixTab token={token} />}
                {tab === "repricer"   && <DynamicRepricerTab inventory={inventory} digitalShelfData={digitalShelfData} />}
                {tab === "competitor" && <CompetitorPriceTab inventory={inventory} digitalShelfData={digitalShelfData} />}
                {tab === "calendar"   && <PriceCalendarTab priceCalendar={priceCalendar} addPriceCalendarEvent={addPriceCalendarEvent} />}
            </div>
        </div>
    );
}
