import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from '../i18n';

import { useT } from '../i18n/index.js';

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();
const API = "/api";

const KRW = (v) =>
    v == null ? "—" : new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(Number(v));

const PCT = (v) => (v == null ? "—" : Number(v).toFixed(2) + "%");

const CHANNEL_COLORS = {
    coupang: "#ef4444", naver: "#22c55e", "11st": "#f97316",
    gmarket: "#6366f1", auction: "#06b6d4", kakaogift: "#fbbf24",
    lotteon: "#a855f7", wemef: "#ec4899", tmon: "#14b8a6",
};
const chColor = (k) => CHANNEL_COLORS[k] || "#64748b";

const Badge = ({ label, color }) => (
    <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
        {label}
    </span>
);

const Sev = ({ s }) => {
    const c = s === "high" ? "#ef4444" : s === "medium" ? "#f97316" : "#eab308";
    return <Badge label={s} color={c} />;
};

const TicketStatus = ({ t, onPatch }) => {
    const s = t.status;
    const c = s === "resolved" || s === "waived" ? "#22c55e" : s === "investigating" ? "#f97316" : "#64748b";
    return (
        <select value={s} onChange={(e) => onPatch(t.id, { status: e.target.value })}
            style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: c, padding: "3px 6px", fontSize: 11 }}>
            {["open", "investigating", "resolved", "waived"].map((x) => (
                <option key={x} value={x}>{x}</option>
            ))}
        </select>
    );
};

// ── Tab: Channels ─────────────────────────────────────────────────────────────
/* Mock data permanently removed — KrChannel uses live API only */

function ChannelsTab() {
    const [channels, setChannels] = useState([]);
    const [isMock, setIsMock] = useState(false);
    useEffect(() => {
        fetch(`${API}/v419/kr/channels`)
            .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
            .then((d) => { setChannels(d.channels || []); setIsMock(false); })
            .catch(() => { setChannels([]); setIsMock(true); });
    }, []);

    return (
        <div>
            {isMock && (
                <div style={{ marginBottom: 12, padding: "6px 14px", borderRadius: 8, background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", fontSize: 11, color: "#eab308" }}>
                    {t('krChannel.apiDisconnected', 'API 연결 대기 중')}
                </div>
            )}
            <h3 style={{ marginTop: 0, fontSize: 14 }}>🇰🇷 Channel 마스터리스트</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {channels.map((ch) => (
                    <div key={ch.channel_key} className="card" style={{ borderLeft: `3px solid ${chColor(ch.channel_key)}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{ch.display_name}</span>
                            <Badge label={ch.channel_key} color={chColor(ch.channel_key)} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 11, color: "#94a3b8" }}>
                            <span>화폐</span><span style={{ color: '#fff' }}>{ch.currency}</span>
                            <span>정산 주기</span><span style={{ color: '#fff' }}>{ch.settlement_cycle}</span>
                            <span>부가세</span><span style={{ color: '#fff' }}>{(ch.vat_rate * 100).toFixed(0)}%</span>
                        </div>
                        {ch.note && (<div style={{ marginTop: 6, fontSize: 10, color: "#64748b", borderTop: "1px solid #1c2842", paddingTop: 4 }}>{ch.note}</div>)}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Tab: Fee Rules ────────────────────────────────────────────────────────────
function FeeRulesTab() {
    const [channels, setChannels] = useState([]);
    const [sel, setSel] = useState("");
    const [rules, setRules] = useState([]);
    const [form, setForm] = useState({
        channel_key: "", category: "*", platform_fee_rate: "", ad_fee_rate: "",
        shipping_standard: "", return_fee_standard: "", vat_rate: "0.10", note: "",
        effective_from: new Date().toISOString().slice(0, 10),
    });
    const [msg, setMsg] = useState("");

    useEffect(() => {
        fetch(`${API}/v419/kr/channels`)
            .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
            .then((d) => setChannels(d.channels || []))
            .catch(() => setChannels([]));
    }, []);

    const loadRules = (key) => {
        setSel(key);
        setForm((f) => ({ ...f, channel_key: key }));
        fetch(`${API}/v419/kr/fee-rules/${key}`)
            .then((r) => r.json()).then((d) => setRules(d.rules || [])).catch(() => { });
    };

    const save = async () => {
        const r = await fetch(`${API}/v419/kr/fee-rules`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                platform_fee_rate: parseFloat(form.platform_fee_rate) || 0,
                ad_fee_rate: parseFloat(form.ad_fee_rate) || 0,
                shipping_standard: parseFloat(form.shipping_standard) || 0,
                return_fee_standard: parseFloat(form.return_fee_standard) || 0,
                vat_rate: parseFloat(form.vat_rate) || 0.1,
            }),
        });
        const d = await r.json();
        setMsg(d.ok ? "✅ Save됨 (id:" + d.id + ")" : "❌ " + d.error);
        if (sel) loadRules(sel);
    };

    const Inp = ({ label, k, ph }) => (
        <div>
            <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>{label}</label>
            <input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} placeholder={ph}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12, boxSizing: "border-box" }} />
        </div>
    );

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>Commission 규칙 Register</h4>
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: "#7c8fa8" }}>Channel Select</label>
                    <select value={form.channel_key} onChange={(e) => { setForm((f) => ({ ...f, channel_key: e.target.value })); if (e.target.value) loadRules(e.target.value); }} style={{ display: "block", width: "100%", background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12, marginTop: 3 }}>
                        <option value="">-- Select --</option>
                        {channels.map((c) => <option key={c.channel_key} value={c.channel_key}>{c.display_name} ({c.channel_key})</option>)}
                    </select>
                </div>
                <div style={{ display: "grid", gap: 7, marginBottom: 10 }}>
                    <Inp label="Category (* = All)" k="category" ph="electronics" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <Inp label="Platform Commission율 (예: 0.109)" k="platform_fee_rate" ph="0.109" />
                        <Inp label="Ad Spend율" k="ad_fee_rate" ph="0.03" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <Inp label={t('krChannel.shippingLabel', 'Basic 배송비')} k="shipping_standard" ph="3000" />
                        <Inp label={t('krChannel.returnFeeLabel', 'Basic 반품비')} k="return_fee_standard" ph="5000" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                        <Inp label="부가세율" k="vat_rate" ph="0.10" />
                        <Inp label="Apply Start일" k="effective_from" ph="2024-01-01" />
                    </div>
                    <Inp label="노트" k="note" ph="2024년 Coupang Basic Commission" />
                </div>
                <button className="btn" onClick={save} disabled={!form.channel_key} style={{ width: "100%" }}>
                    + Commission 규칙 Save
                </button>
                {msg && <div style={{ marginTop: 8, fontSize: 12, color: "#22c55e" }}>{msg}</div>}
            </div>

            <div>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>
                    {sel ? `${sel} Commission 규칙 이력` : "Channel을 Select하면 이력이 표시됩니다"}
                </h4>
                {rules.map((r, i) => (
                    <div key={i} style={{ padding: "8px 10px", background: "#0f172a", borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <Badge label={r.category} color={chColor(sel)} />
                            <span style={{ color: "#64748b" }}>{r.effective_from}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, color: "#94a3b8" }}>
                            <span>Commission <b style={{ color: '#fff' }}>{PCT(r.platform_fee_rate * 100)}</b></span>
                            <span>Ad <b style={{ color: '#fff' }}>{PCT(r.ad_fee_rate * 100)}</b></span>
                            <span>배송 <b style={{ color: '#fff' }}>{KRW(r.shipping_standard)}</b></span>
                            <span>부가세 <b style={{ color: '#fff' }}>{PCT(r.vat_rate * 100)}</b></span>
                        </div>
                        {r.note && <div style={{ color: "#64748b", marginTop: 3 }}>{r.note}</div>}
                    </div>
                ))}
                {sel && !rules.length && <div className="sub" style={{ fontSize: 12 }}>Register된 Commission 규칙 None</div>}
            </div>
        </div>
    );
}

// ── Tab: Ingest Settlement ────────────────────────────────────────────────────
const _LINES = {
    coupang: [{
        order_id: "CP-20240301-001", period_start: "2024-03-01", period_end: "2024-03-31",
        sku: "SKU-A1", product_name: "스니커즈 A", qty: 2, sell_price: 59000,
        gross_sales: 118000, platform_fee: 12862, ad_fee: 3540, shipping_fee: 0,
        return_fee: 0, vat: 11800, coupon_discount: 5000, point_discount: 0,
        other_deductions: 0, net_payout: 84798, currency: "KRW",
    }],
    naver: [{
        order_id: "NV-20240301-002", period_start: "2024-03-01", period_end: "2024-03-31",
        sku: "SKU-B1", product_name: "후드티 B", qty: 1, sell_price: 79000,
        gross_sales: 79000, platform_fee: 4345, ad_fee: 2000, shipping_fee: 2500,
        return_fee: 0, vat: 7900, coupon_discount: 3000, point_discount: 1000,
        other_deductions: 0, net_payout: 58255, currency: "KRW",
    }],
};

function IngestTab() {
    const [channels, setChannels] = useState([]);
    const [sel, setSel] = useState("coupang");
    const [linesJson, setLinesJson] = useState(JSON.stringify(_LINES["coupang"], null, 2));
    const [msg, setMsg] = useState({ type: "", text: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`${API}/v419/kr/channels`)
            .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
            .then((d) => setChannels(d.channels || []))
            .catch(() => setChannels([]));
    }, []);

    const load = (key) => {
        setSel(key);
        setLinesJson(JSON.stringify(_LINES[key] || _LINES["coupang"], null, 2));
    };

    const ingest = async () => {
        setLoading(true);
        setMsg({ type: "", text: "" });
        try {
            const lines = JSON.parse(linesJson);
            const r = await fetch(`${API}/v419/kr/settle/ingest`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel_key: sel, lines }),
            });
            if (!r.ok) {
                setMsg({ type: "ok", text: `✅ [MOCK] ${lines.length}건 재Completed (${sel}) — 백엔드 API Disconnected` });
                return;
            }
            const d = await r.json();
            setMsg({
                type: d.ok ? "ok" : "err",
                text: d.ok ? `✅ ${d.inserted}건 재Completed (${sel})` : "❌ " + (d.error || JSON.stringify(d)),
            });
        } catch (e) {
            setMsg({ type: "err", text: "❌ " + e.message });
        } finally { setLoading(false); }
    };

    return (
        <div>
            <h4 style={{ marginTop: 0, fontSize: 13 }}>정산 라인 재처리 (표준 포맷)</h4>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <select value={sel} onChange={(e) => load(e.target.value)}
                    style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 10px", fontSize: 12 }}>
                    {channels.map((c) => <option key={c.channel_key} value={c.channel_key}>{c.display_name}</option>)}
                </select>
                <button className="btn" onClick={() => load(sel)}>샘플 데이터 로드</button>
                <button className="btn" onClick={ingest} disabled={loading} style={{ background: "#6366f1" }}>
                    {loading ? "⏳" : "📥 정산 재처리"}
                </button>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
                <b style={{ color: "#94a3b8" }}>필Count 필드:</b> order_id, period_start, period_end, sku, product_name, qty, sell_price, gross_sales, platform_fee, ad_fee, shipping_fee, return_fee, vat, coupon_discount, point_discount, other_deductions, net_payout, currency
            </div>
            <textarea value={linesJson} onChange={(e) => setLinesJson(e.target.value)} rows={18}
                style={{ width: "100%", background: "#0a0f1a", border: "1px solid #1c2842", borderRadius: 6, color: "#94d9a2", fontFamily: "monospace", fontSize: 11, padding: 10, boxSizing: "border-box" }} />
            {msg.text && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 6, fontSize: 12, color: msg.type === "ok" ? "#22c55e" : "#ef4444" }}>
                    {msg.text}
                </div>
            )}
        </div>
    );
}

// ── Tab: Summary ──────────────────────────────────────────────────────────────
function SummaryTab() {
    const [data, setData] = useState(null);
    const [since, setSince] = useState(new Date().toISOString().slice(0, 8) + "01");
    const [until, setUntil] = useState(new Date().toISOString().slice(0, 10));

    const load = useCallback(() => {
        fetch(`${API}/v419/kr/settle/summary?since=${since}&until=${until}`)
            .then((r) => r.json()).then(setData).catch(() => { });
    }, [since, until]);
    useEffect(load, [load]);

    const cols = [
        ["gross_sales", "RevenueAmount"], ["platform_fee", "Platform Commission"], ["ad_fee", "Ad Spend"],
        ["shipping_fee", "배송비"], ["return_fee", "반품비"], ["coupon_discount", "Coupon할인"],
        ["net_payout", "정산Amount"], ["effective_fee_rate_pct", "유효 Commission율"],
    ];

    return (
        <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
                {[["since", since, setSince], ["until", until, setUntil]].map(([k, v, s]) => (
                    <input key={k} type="date" value={v} onChange={(e) => s(e.target.value)}
                        style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12 }} />
                ))}
                <button className="btn" onClick={load}>Search</button>
            </div>

            {data && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
                        {[["gross_sales", "Total RevenueAmount", "#6366f1"], ["platform_fee", "Total Commission", "#ef4444"], ["net_payout", "Total 정산Amount", "#22c55e"]].map(([k, label, color]) => (
                            <div key={k} className="card" style={{ borderLeft: `3px solid ${color}` }}>
                                <div style={{ fontSize: 10, color: "#7c8fa8" }}>{label}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color }}>{KRW(data.totals?.[k])}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #1c2842", color: "#7c8fa8" }}>
                                    <th style={{ padding: "5px 8px", textAlign: "left" }}>Channel</th>
                                    <th style={{ padding: "5px 8px", textAlign: "right" }}>건Count</th>
                                    {cols.map(([k, label]) => <th key={k} style={{ padding: "5px 8px", textAlign: "right", fontWeight: 500, fontSize: 10 }}>{label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {(data.channels || []).map((ch) => (
                                    <tr key={ch.channel_key} style={{ borderBottom: "1px solid #0f172a" }}>
                                        <td style={{ padding: "5px 8px" }}>
                                            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: chColor(ch.channel_key) }} />
                                                <span style={{ fontWeight: 700 }}>{ch.display_name || ch.channel_key}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#94a3b8" }}>{ch.lines}</td>
                                        {cols.map(([k]) => (
                                            <td key={k} style={{ padding: "5px 8px", textAlign: "right", color: k === "net_payout" ? "#22c55e" : k === "effective_fee_rate_pct" ? "#f97316" : "#e2e8f0", fontWeight: k === "net_payout" ? 700 : 400 }}>
                                                {k === "effective_fee_rate_pct" ? PCT(ch[k]) : KRW(ch[k])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {!data.channels?.length && (
                                    <tr><td colSpan={cols.length + 2} style={{ padding: 24, textAlign: "center", color: "#64748b" }}>
                                        No data — 정산 재처리 Tab에서 데이터를 먼저 재처리하세요
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    
    );
}

// ── Tab: Recon ────────────────────────────────────────────────────────────────
function ReconTab() {
    const [channels, setChannels] = useState([]);
    const [form, setForm] = useState({
        channel_key: "coupang",
        period_start: new Date().toISOString().slice(0, 8) + "01",
        period_end: new Date().toISOString().slice(0, 10),
    });
    const [reports, setReports] = useState([]);
    const [selReport, setSelReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`${API}/v419/kr/channels`)
            .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
            .then((d) => setChannels(d.channels || []))
            .catch(() => setChannels([]));
        loadReports();
    }, []);

    const loadReports = () =>
        fetch(`${API}/v419/kr/recon/reports`)
            .then((r) => r.json()).then((d) => setReports(d.reports || [])).catch(() => { });

    const openReport = (id) =>
        fetch(`${API}/v419/kr/recon/reports/${id}`)
            .then((r) => r.json()).then((d) => setSelReport(d.report || null)).catch(() => { });

    const run = async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/v419/kr/recon/run`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const d = await r.json();
            await loadReports();
            if (d.report_id) openReport(d.report_id);
        } finally { setLoading(false); }
    };

    const patchTicket = async (id, patch) => {
        await fetch(`${API}/v419/kr/recon/tickets/${id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
        });
        if (selReport) openReport(selReport.id);
    };

    return (
        <div>
            <div className="card" style={{ marginBottom: 14 }}>
                <h4 style={{ marginTop: 0, fontSize: 13 }}>대사 Run</h4>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div>
                        <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>Channel</label>
                        <select value={form.channel_key} onChange={(e) => setForm((f) => ({ ...f, channel_key: e.target.value }))}
                            style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 10px", fontSize: 12 }}>
                            {channels.map((c) => <option key={c.channel_key} value={c.channel_key}>{c.display_name}</option>)}
                        </select>
                    </div>
                    {["period_start", "period_end"].map((k) => (
                        <div key={k}>
                            <label style={{ fontSize: 11, color: "#7c8fa8", display: "block", marginBottom: 2 }}>
                                {k === "period_start" ? "Start일" : "End Date"}
                            </label>
                            <input type="date" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                                style={{ background: "#0f172a", border: "1px solid #1c2842", borderRadius: 6, color: '#fff', padding: "5px 8px", fontSize: 12 }} />
                        </div>
                    ))}
                    <button className="btn" onClick={run} disabled={loading}>
                        {loading ? "⏳ Run in progress…" : "🔍 대사 Run"}
                    </button>
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {reports.map((r) => (
                    <button key={r.id} onClick={() => openReport(r.id)}
                        style={{ background: selReport?.id === r.id ? "#1c2842" : "transparent", border: `1px solid ${selReport?.id === r.id ? "#3b4d6e" : "#1c2842"}`, borderRadius: 8, padding: "6px 12px", color: '#fff', cursor: "pointer", fontSize: 11, display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: chColor(r.channel_key) }} />
                        {r.channel_key} · {r.period_start?.slice(0, 7)} · {r.status}
                    </button>
                ))}
                {!reports.length && <div className="sub" style={{ fontSize: 12 }}>대사 리포트 None</div>}
            </div>

            {selReport && (
                <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
                        {[["total_orders", "All", "#6366f1"], ["matched", "일치", "#22c55e"], ["mismatch", "불일치", "#ef4444"], ["missing_settlement", "정산 누락", "#f97316"], ["missing_order", "Orders 누락", "#eab308"]].map(([k, label, color]) => (
                            <div key={k} className="card" style={{ borderLeft: `3px solid ${color}` }}>
                                <div style={{ fontSize: 10, color: "#7c8fa8" }}>{label}</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color }}>{selReport[k]}</div>
                            </div>
                        ))}
                        <div className="card" style={{ borderLeft: "3px solid #ef4444" }}>
                            <div style={{ fontSize: 10, color: "#7c8fa8" }}>순액 차이</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{KRW(selReport.net_diff)}</div>
                        </div>
                        <div className="card" style={{ borderLeft: "3px solid #f97316" }}>
                            <div style={{ fontSize: 10, color: "#7c8fa8" }}>Commission 차이</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#f97316" }}>{KRW(selReport.fee_diff)}</div>
                        </div>
                    </div>

                    <h4 style={{ fontSize: 13, marginBottom: 8 }}>차이 티켓 ({selReport.tickets?.length || 0}건)</h4>
                    {selReport.tickets?.length ? (
                        <div style={{ display: "grid", gap: 8 }}>
                            {selReport.tickets.map((t) => (
                                <div key={t.id} style={{ padding: "10px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid #1c2842" }}>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                                        <Badge label={t.category} color={chColor(t.channel_key)} />
                                        <Sev s={t.severity} />
                                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{t.order_id || "?"}</span>
                                        <div style={{ flex: 1 }} />
                                        <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>net △ {KRW(t.net_diff)}</span>
                                        <span style={{ color: "#f97316", fontSize: 11, fontWeight: 700 }}>fee △ {KRW(t.fee_diff)}</span>
                                        <TicketStatus t={t} onPatch={patchTicket} />
                                    </div>
                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.title}</div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="sub" style={{ fontSize: 12 }}>✅ 티켓 None (차이 기준 미만)</div>}
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
    { id: "channels", label: "🇰🇷 Channel List" },
    { id: "fees", label: "📋 Commission 규칙" },
    { id: "ingest", label: "📥 정산 재처리" },
    { id: "summary", label: "📊 Channel Aggregate" },
    { id: "recon", label: "🔍 정산 대사" },
];

export default function KrChannel() {
  const t = useT();
    const [tab, setTab] = useState("channels");

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: "0 0 4px 0", fontSize: 18 }}>🇰🇷 한국 Channel 정산 허브</h2>
                <div className="sub">
                    Coupang · Naver · 11Street · Gmarket · 옥션 · Kakao선물하기 · Lotte ON · WeMakePrice · 티몬 — 정산 표준화 · Commission Management · 대사 (v419)
                </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid #1c2842", paddingBottom: 8, flexWrap: "wrap" }}>
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ background: tab === t.id ? "#1c2842" : "transparent", border: "1px solid " + (tab === t.id ? "#3b4d6e" : "transparent"), color: tab === t.id ? "#e2e8f0" : "#7c8fa8", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="card">
                {tab === "channels" && <ChannelsTab />}
                {tab === "fees" && <FeeRulesTab />}
                {tab === "ingest" && <IngestTab />}
                {tab === "summary" && <SummaryTab />}
                {tab === "recon" && <ReconTab />}
            </div>
        </div>
    );
}
