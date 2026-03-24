import React, { useState, useEffect } from "react";
import { useI18n } from '../i18n';

const API = "/api";

const NODE_COLORS = {
    influencer: "#a855f7",
    creative: "#06b6d4",
    sku: "#f97316",
    order: "#22c55e",
};

// Mock Data
const MOCK_SUMMARY = {
    node_counts: [
        { node_type: "influencer", cnt: 12 },
        { node_type: "creative", cnt: 38 },
        { node_type: "sku", cnt: 24 },
        { node_type: "order", cnt: 156 },
    ],
    total_edges: 247,
    top_influencers: [
        { id: "inf_jiyeon", edge_count: 18, total_weight: 8.4 },
        { id: "inf_minjun", edge_count: 14, total_weight: 6.9 },
        { id: "inf_soyeon", edge_count: 11, total_weight: 5.2 },
    ],
    top_creatives: [
        { id: "cre_summer25_a", edge_count: 22, total_weight: 9.1 },
        { id: "cre_collab_b", edge_count: 17, total_weight: 7.3 },
        { id: "cre_ugc_c", edge_count: 13, total_weight: 5.8 },
    ],
    top_skus: [
        { id: "WH-1000XM5", edge_count: 31, total_weight: 9.7 },
        { id: "KB-MXM-RGB", edge_count: 24, total_weight: 7.6 },
        { id: "HC-USB4-7P", edge_count: 19, total_weight: 6.1 },
    ],
};

const MOCK_NODES = [
    { id: 1, node_type: "influencer", node_id: "inf_jiyeon", label: "김지연" },
    { id: 2, node_type: "influencer", node_id: "inf_minjun", label: "박민준" },
    { id: 3, node_type: "creative", node_id: "cre_summer25_a", label: "Summer25 A" },
    { id: 4, node_type: "creative", node_id: "cre_collab_b", label: "Collaboration B" },
    { id: 5, node_type: "sku", node_id: "WH-1000XM5", label: "노이즈캔슬링 Headset" },
    { id: 6, node_type: "sku", node_id: "KB-MXM-RGB", label: "RGB 기계식 키보드" },
    { id: 7, node_type: "order", node_id: "ORD-20260304-001", label: "" },
    { id: 8, node_type: "order", node_id: "ORD-20260304-002", label: "" },
];

const MOCK_EDGES = [
    { src_type: "influencer", src_id: "inf_jiyeon", dst_type: "creative", dst_id: "cre_summer25_a", edge_weight: 1.8, edge_label: "promoted" },
    { src_type: "influencer", src_id: "inf_jiyeon", dst_type: "creative", dst_id: "cre_collab_b", edge_weight: 1.4, edge_label: "collab" },
    { src_type: "influencer", src_id: "inf_minjun", dst_type: "creative", dst_id: "cre_summer25_a", edge_weight: 1.2, edge_label: "promoted" },
    { src_type: "creative", src_id: "cre_summer25_a", dst_type: "sku", dst_id: "WH-1000XM5", edge_weight: 2.1, edge_label: "drove_sale" },
    { src_type: "creative", src_id: "cre_collab_b", dst_type: "sku", dst_id: "KB-MXM-RGB", edge_weight: 1.6, edge_label: "drove_sale" },
    { src_type: "sku", src_id: "WH-1000XM5", dst_type: "order", dst_id: "ORD-20260304-001", edge_weight: 1.0, edge_label: "purchased" },
    { src_type: "sku", src_id: "KB-MXM-RGB", dst_type: "order", dst_id: "ORD-20260304-002", edge_weight: 1.0, edge_label: "purchased" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
        {label}
    </span>
);

const ScoreBar = ({ value, max = 10 }) => {
    const pct = Math.min(100, Math.round((value / Math.max(max, 0.001)) * 100));
    const color = pct > 60 ? "#22c55e" : pct > 30 ? "#eab308" : "#f97316";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontWeight: 700, color, fontSize: 11, minWidth: 36 }}>{value?.toFixed(2)}</span>
        </div>
    );
};

const NodeBadge = ({ type }) => <Badge label={type} color={NODE_COLORS[type] || "#64748b"} />;

async function apiFetch(path) {
    const r = await fetch(path, { headers: { Authorization: `Bearer genie_live_demo_key_00000000` } });
    if (!r.ok) throw new Error(r.status);
    return r.json();
}

// ── Tab: Summary ──────────────────────────────────────────────────────────────
function SummaryTab() {
    const [data, setData] = useState(null);
    const [isMock, setIsMock] = useState(false);

    const load = async () => {
        try {
            const d = await apiFetch(`${API}/v419/graph/summary`);
            setData(d); setIsMock(false);
        } catch {
            setData(MOCK_SUMMARY); setIsMock(true);
        }
    };
    useEffect(() => { load(); }, []);

    if (!data) return <div className="sub" style={{ padding: 24 }}>Loading…</div>;

    const maxInfW = Math.max(...(data.top_influencers || []).map(r => parseFloat(r.total_weight) || 0), 1);
    const maxCreW = Math.max(...(data.top_creatives || []).map(r => parseFloat(r.total_weight) || 0), 1);
    const maxSkuW = Math.max(...(data.top_skus || []).map(r => parseFloat(r.total_weight) || 0), 1);

    return (
        <div>
            {isMock && (
                <div style={{ marginBottom: 12, padding: "6px 12px", background: "rgba(234,179,8,0.07)", borderRadius: 8, border: "1px solid rgba(234,179,8,0.25)", fontSize: 11, color: "#eab308" }}>
                    🟡 MOCK — 백엔드에 데이터가 없어 샘플 데이터를 표시합니다
                </div>
            )}

            {/* Node counts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                {["influencer", "creative", "sku", "order"].map(t => {
                    const cnt = (data.node_counts || []).find(n => n.node_type === t);
                    return (
                        <div key={t} className="kpi-card" style={{ borderLeft: `3px solid ${NODE_COLORS[t]}`, "--accent": NODE_COLORS[t] }}>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2, fontWeight: 700 }}>{t.toUpperCase()}</div>
                            <div style={{ fontSize: 26, fontWeight: 800, color: NODE_COLORS[t] }}>{cnt?.cnt ?? 0}</div>
                            <div className="sub" style={{ fontSize: 10 }}>nodes</div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginBottom: 16, fontSize: 12, color: "var(--text-2)" }}>
                Total Edge: <b style={{ color: "var(--text-1)", fontSize: 16, fontWeight: 800 }}>{data.total_edges}</b>개
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                {[
                    { title: "🤝 Top 인플루언서", rows: data.top_influencers, maxW: maxInfW, type: "influencer" },
                    { title: "🎬 Top 크리에이티브", rows: data.top_creatives, maxW: maxCreW, type: "creative" },
                    { title: "📦 Top SKU (inbound)", rows: data.top_skus, maxW: maxSkuW, type: "sku" },
                ].map(({ title, rows, maxW, type }) => (
                    <div key={type} className="card" style={{ borderTop: `2px solid ${NODE_COLORS[type]}` }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12, color: NODE_COLORS[type] }}>{title}</div>
                        {(rows || []).map((r, i) => (
                            <div key={i} style={{ marginBottom: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                                    <span style={{ fontFamily: "monospace", color: NODE_COLORS[type], fontWeight: 600 }}>{r.id}</span>
                                    <span style={{ color: "var(--text-3)" }}>{r.edge_count}개</span>
                                </div>
                                <ScoreBar value={parseFloat(r.total_weight)} max={maxW} />
                            </div>
                        ))}
                        {!rows?.length && <div className="sub" style={{ fontSize: 11 }}>No data</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Tab: Add Node / Edge ──────────────────────────────────────────────────────
function AddDataTab({ onRefresh }) {
    const [nf, setNf] = useState({ node_type: "influencer", node_id: "", label: "" });
    const [ef, setEf] = useState({ src_type: "influencer", src_id: "", dst_type: "creative", dst_id: "", edge_weight: "1.0", edge_label: "" });
    const [msg, setMsg] = useState("");

    const types = ["influencer", "creative", "sku", "order"];

    const saveNode = async () => {
        try {
            const r = await fetch(`${API}/v419/graph/nodes`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer genie_live_demo_key_00000000" },
                body: JSON.stringify(nf),
            });
            const d = await r.json();
            setMsg(d.ok ? `✅ Node Register: ${nf.node_type}/${nf.node_id}` : `❌ ${d.error}`);
            onRefresh();
        } catch { setMsg("⚠️ 백엔드 None — demo 모드에서는 Save되지 않습니다."); }
    };

    const saveEdge = async () => {
        try {
            const r = await fetch(`${API}/v419/graph/edges`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer genie_live_demo_key_00000000" },
                body: JSON.stringify({ ...ef, edge_weight: parseFloat(ef.edge_weight) || 1.0 }),
            });
            const d = await r.json();
            setMsg(d.ok ? `✅ Edge Register: ${ef.src_type}/${ef.src_id} → ${ef.dst_type}/${ef.dst_id}` : `❌ ${d.error}`);
            onRefresh();
        } catch { setMsg("⚠️ 백엔드 None — demo 모드에서는 Save되지 않습니다."); }
    };

    const Sel = ({ label, val, setter }) => (
        <div>
            <label className="input-label">{label}</label>
            <select className="input" value={val} onChange={e => setter(e.target.value)}>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
        </div>
    );

    const Inp = ({ label, val, setter, ph }) => (
        <div>
            <label className="input-label">{label}</label>
            <input className="input" value={val} onChange={e => setter(e.target.value)} placeholder={ph} />
        </div>
    );

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="card card-glass">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔵 Node Register</div>
                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                    <Sel label="Node Type" val={nf.node_type} setter={v => setNf(f => ({ ...f, node_type: v }))} />
                    <Inp label="Node ID *" val={nf.node_id} setter={v => setNf(f => ({ ...f, node_id: v }))} ph="inf_123 / cre_abc / SKU-001" />
                    <Inp label="라벨" val={nf.label} setter={v => setNf(f => ({ ...f, label: v }))} ph="표시 Name" />
                </div>
                <button className="btn-primary" onClick={saveNode} disabled={!nf.node_id}>+ Node Register</button>
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔗 Edge Register (Connect)</div>
                <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Sel label="출발 Type" val={ef.src_type} setter={v => setEf(f => ({ ...f, src_type: v }))} />
                        <Sel label="도착 Type" val={ef.dst_type} setter={v => setEf(f => ({ ...f, dst_type: v }))} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Inp label="출발 ID *" val={ef.src_id} setter={v => setEf(f => ({ ...f, src_id: v }))} ph="inf_123" />
                        <Inp label="도착 ID *" val={ef.dst_id} setter={v => setEf(f => ({ ...f, dst_id: v }))} ph="cre_abc" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Inp label="가in progress치 (Basic 1.0)" val={ef.edge_weight} setter={v => setEf(f => ({ ...f, edge_weight: v }))} ph="1.0" />
                        <Inp label="라벨" val={ef.edge_label} setter={v => setEf(f => ({ ...f, edge_label: v }))} ph="promoted" />
                    </div>
                </div>
                <button className="btn-primary" onClick={saveEdge} disabled={!ef.src_id || !ef.dst_id}>🔗 Connect Register</button>
            </div>
            {msg && (
                <div style={{ gridColumn: "1/-1", padding: "8px 14px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, fontSize: 12, color: "#22c55e" }}>
                    {msg}
                </div>
            )}
        </div>
    );
}

// ── Tab: Influencer Score ─────────────────────────────────────────────────────
const MOCK_INF_RESULT = {
    influencer_id: "inf_jiyeon",
    graph_score: 0.843,
    skus_reached: ["WH-1000XM5", "KB-MXM-RGB"],
    orders_reached: ["ORD-20260304-001", "ORD-20260304-002", "ORD-20260303-011"],
    paths: [
        { influencer: "inf_jiyeon", creative: "cre_summer25_a", sku: "WH-1000XM5", order: "ORD-20260304-001", path_weight: 3.78 },
        { influencer: "inf_jiyeon", creative: "cre_collab_b", sku: "KB-MXM-RGB", order: "ORD-20260304-002", path_weight: 2.24 },
        { influencer: "inf_jiyeon", creative: "cre_summer25_a", sku: "WH-1000XM5", order: "ORD-20260303-011", path_weight: 1.89 },
    ],
};

function InfluencerScoreTab({ nodes }) {
    const influencers = nodes.filter(n => n.node_type === "influencer");
    const [sel, setSel] = useState("");
    const [result, setResult] = useState(null);
    const [isMock, setIsMock] = useState(false);
    const [loading, setLoading] = useState(false);

    const doFetch = async () => {
        const id = sel.trim();
        if (!id) return;
        setLoading(true);
        try {
            const r = await apiFetch(`${API}/v419/graph/score/influencer/${encodeURIComponent(id)}`);
            setResult(r); setIsMock(false);
        } catch {
            setResult({ ...MOCK_INF_RESULT, influencer_id: id }); setIsMock(true);
        } finally { setLoading(false); }
    };

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                    list="inf-list" className="input" placeholder="인플루언서 ID Select 또는 입력"
                    value={sel} onChange={e => setSel(e.target.value)} style={{ flex: 1 }} />
                <datalist id="inf-list">
                    {influencers.map(n => <option key={n.id} value={n.node_id}>{n.label}</option>)}
                    {MOCK_NODES.filter(n => n.node_type === "influencer").map(n => <option key={n.id} value={n.node_id}>{n.label}</option>)}
                </datalist>
                <button className="btn-primary" onClick={doFetch} disabled={loading || !sel}>{loading ? "⏳" : "🔍 Analysis"}</button>
            </div>
            {result && (
                <div>
                    {isMock && <div style={{ marginBottom: 10, padding: "5px 10px", background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 6, fontSize: 11, color: "#eab308" }}>🟡 MOCK 결과</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                        {[
                            { label: "Graph Score", value: (result.graph_score * 100).toFixed(1) + "%", color: "#a855f7" },
                            { label: "Connect된 SKU", value: result.skus_reached?.length ?? 0, color: "#f97316" },
                            { label: "Connect된 Orders", value: result.orders_reached?.length ?? 0, color: "#22c55e" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="kpi-card" style={{ borderLeft: `3px solid ${color}`, "--accent": color }}>
                                <div className="kpi-label">{label}</div>
                                <div className="kpi-value" style={{ color, fontSize: 22 }}>{value}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>🛤 기여 경로</div>
                    {result.paths?.length ? (
                        <table className="table">
                            <thead>
                                <tr>
                                    {["인플루언서", "크리에이티브", "SKU", "Orders", "경로 가in progress치"].map(h => <th key={h}>{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {result.paths.slice(0, 30).map((p, i) => (
                                    <tr key={i}>
                                        <td><NodeBadge type="influencer" /> {p.influencer}</td>
                                        <td style={{ fontFamily: "monospace", color: "#06b6d4" }}>{p.creative ?? "—"}</td>
                                        <td style={{ fontFamily: "monospace", color: "#f97316" }}>{p.sku ?? "—"}</td>
                                        <td style={{ fontFamily: "monospace", color: "#22c55e" }}>{p.order}</td>
                                        <td style={{ fontWeight: 700 }}>{p.path_weight}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <div className="sub" style={{ fontSize: 12 }}>Connect된 경로 None</div>}
                </div>
            )}
        </div>
    );
}

// ── Tab: SKU Score ────────────────────────────────────────────────────────────
const MOCK_SKU_RESULT = {
    sku_id: "WH-1000XM5",
    creatives_used: 3,
    orders_linked: 18,
    top_influencers: [
        { influencer_id: "inf_jiyeon", contribution_weight: 5.67 },
        { influencer_id: "inf_minjun", contribution_weight: 3.21 },
        { influencer_id: "inf_soyeon", contribution_weight: 2.08 },
    ],
};

function SkuScoreTab({ nodes }) {
    const skus = nodes.filter(n => n.node_type === "sku");
    const [sel, setSel] = useState("");
    const [result, setResult] = useState(null);
    const [isMock, setIsMock] = useState(false);
    const [loading, setLoading] = useState(false);

    const doFetch = async () => {
        const id = sel.trim();
        if (!id) return;
        setLoading(true);
        try {
            const r = await apiFetch(`${API}/v419/graph/score/sku/${encodeURIComponent(id)}`);
            setResult(r); setIsMock(false);
        } catch {
            setResult({ ...MOCK_SKU_RESULT, sku_id: id }); setIsMock(true);
        } finally { setLoading(false); }
    };

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input list="sku-list" className="input" placeholder="SKU ID Select 또는 입력"
                    value={sel} onChange={e => setSel(e.target.value)} style={{ flex: 1 }} />
                <datalist id="sku-list">
                    {skus.map(n => <option key={n.id} value={n.node_id}>{n.label}</option>)}
                    {MOCK_NODES.filter(n => n.node_type === "sku").map(n => <option key={n.id} value={n.node_id}>{n.label}</option>)}
                </datalist>
                <button className="btn-primary" onClick={doFetch} disabled={loading || !sel}>{loading ? "⏳" : "🔍 Analysis"}</button>
            </div>
            {result && (
                <div>
                    {isMock && <div style={{ marginBottom: 10, padding: "5px 10px", background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 6, fontSize: 11, color: "#eab308" }}>🟡 MOCK 결과</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                        <div className="kpi-card" style={{ borderLeft: "3px solid #06b6d4", "--accent": "#06b6d4" }}>
                            <div className="kpi-label">기여 크리에이티브</div>
                            <div className="kpi-value" style={{ color: "#06b6d4", fontSize: 22 }}>{result.creatives_used}</div>
                        </div>
                        <div className="kpi-card" style={{ borderLeft: "3px solid #22c55e", "--accent": "#22c55e" }}>
                            <div className="kpi-label">Connect Orders</div>
                            <div className="kpi-value" style={{ color: "#22c55e", fontSize: 22 }}>{result.orders_linked}</div>
                        </div>
                        <div className="kpi-card" style={{ borderLeft: "3px solid #a855f7", "--accent": "#a855f7" }}>
                            <div className="kpi-label">기여 인플루언서</div>
                            <div className="kpi-value" style={{ color: "#a855f7", fontSize: 22 }}>{result.top_influencers?.length ?? 0}</div>
                        </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>🏆 상위 기여 인플루언서</div>
                    {(result.top_influencers || []).map((inf, i) => (
                        <div key={i} className="stat-row">
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-3)", width: 20, textAlign: "center" }}>
                                    {["🥇", "🥈", "🥉"][i] || `${i + 1}`}
                                </span>
                                <span style={{ color: "#a855f7", fontFamily: "monospace", fontWeight: 600 }}>{inf.influencer_id}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 80, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ width: `${(inf.contribution_weight / 10) * 100}%`, height: "100%", background: "#a855f7", borderRadius: 4 }} />
                                </div>
                                <span style={{ fontWeight: 700, color: "#a855f7", fontSize: 12 }}>{inf.contribution_weight}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Tab: Graph Browser ────────────────────────────────────────────────────────
function GraphBrowserTab() {
    const [edges, setEdges] = useState([]);
    const [filter, setFilter] = useState("");
    const [isMock, setIsMock] = useState(false);

    const load = async () => {
        try {
            const d = await apiFetch(`${API}/v419/graph/edges`);
            setEdges(d.edges || []);
            setIsMock(false);
        } catch {
            setEdges(MOCK_EDGES);
            setIsMock(true);
        }
    };
    useEffect(() => { load(); }, []);

    const filteredEdges = filter
        ? edges.filter(e => e.src_id.includes(filter) || e.dst_id.includes(filter))
        : edges.slice(0, 100);

    return (
        <div>
            {isMock && <div style={{ marginBottom: 10, padding: "5px 10px", background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 6, fontSize: 11, color: "#eab308" }}>🟡 MOCK 데이터</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input className="input" placeholder="Node ID Filter" value={filter} onChange={e => setFilter(e.target.value)} style={{ flex: 1 }} />
                <button className="btn" onClick={load}>↺ Refresh</button>
            </div>
            <table className="table">
                <thead>
                    <tr>
                        <th>출발 Node</th><th style={{ textAlign: "center" }}>→</th>
                        <th>도착 Node</th><th style={{ textAlign: "right" }}>가in progress치</th><th>라벨</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredEdges.map((e, i) => (
                        <tr key={i}>
                            <td>
                                <NodeBadge type={e.src_type} />{" "}
                                <span style={{ fontFamily: "monospace", color: NODE_COLORS[e.src_type] }}>{e.src_id}</span>
                            </td>
                            <td style={{ textAlign: "center", color: "var(--text-3)" }}>→</td>
                            <td>
                                <NodeBadge type={e.dst_type} />{" "}
                                <span style={{ fontFamily: "monospace", color: NODE_COLORS[e.dst_type] }}>{e.dst_id}</span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>{parseFloat(e.edge_weight).toFixed(2)}</td>
                            <td style={{ color: "var(--text-3)" }}>{e.edge_label ?? ""}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!filteredEdges.length && <div className="sub" style={{ padding: 24, textAlign: "center" }}>Edge None — 위 Tab에서 Node/Edge를 Register하세요</div>}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
    { id: "summary", label: "📊 Summary" },
    { id: "add", label: "➕ 데이터 Register" },
    { id: "browser", label: "🕸 Graph 브라우저" },
    { id: "influencer", label: "🤝 인플루언서 Score" },
    { id: "sku", label: "📦 SKU Score" },
];

export default function GraphScore() {
    const [tab, setTab] = useState("summary");
    const [nodes, setNodes] = useState(MOCK_NODES);

    const loadNodes = async () => {
        try {
            const d = await apiFetch(`${API}/v419/graph/nodes`);
            setNodes(d.nodes || MOCK_NODES);
        } catch {
            setNodes(MOCK_NODES);
        }
    };
    useEffect(() => { loadNodes(); }, []);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(6,182,212,0.15))" }}>🕸</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            Graph Scoring
                        </div>
                        <div className="hero-desc">인플루언서 → 크리에이티브 → SKU → Orders Connect 그래Pro Channelper 기여도를 Analysis합니다</div>
                    </div>
                </div>
                {/* Legend */}
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                    {Object.entries(NODE_COLORS).map(([t, c]) => (
                        <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}88` }} />
                            <span style={{ color: "var(--text-2)" }}>{t}</span>
                        </div>
                    ))}
                    <div style={{ color: "var(--text-3)", fontSize: 11 }}>· 가in progress치 = 기여 강도</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="card card-glass fade-up fade-up-1">
                <div className="tabs" style={{ marginBottom: 20 }}>
                    {TABS.map(t => (
                        <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`}
                            onClick={() => setTab(t.id)}>{t.label}</button>
                    ))}
                </div>

                {tab === "summary" && <SummaryTab />}
                {tab === "add" && <AddDataTab onRefresh={loadNodes} />}
                {tab === "browser" && <GraphBrowserTab />}
                {tab === "influencer" && <InfluencerScoreTab nodes={nodes} />}
                {tab === "sku" && <SkuScoreTab nodes={nodes} />}
            </div>
        </div>
    );
}
