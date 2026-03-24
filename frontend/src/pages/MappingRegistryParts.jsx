import React, { useState, useCallback } from "react";

/* ── LocalStorage Hook ── */
function useLS(key, def) {
    const [d, setD] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; } });
    const save = useCallback(v => { setD(v); localStorage.setItem(key, JSON.stringify(v)); }, [key]);
    const reset = useCallback(() => save(def), []);
    return [d, save, reset];
}

/* ── Initial Data ── */
const DEF_PF = [
    { id: "meta", name: "Meta", color: "#1877F2", commission: 0, cycle: "Month2회", currency: "KRW", vat: 10, roas: 3.0, status: "active" },
    { id: "google", name: "Google", color: "#EA4335", commission: 0, cycle: "Month1회", currency: "KRW", vat: 10, roas: 3.0, status: "active" },
    { id: "tiktok", name: "TikTok", color: "#555555", commission: 0, cycle: "Month2회", currency: "USD", vat: 0, roas: 3.0, status: "active" },
    { id: "naver", name: "Naver", color: "#03C75A", commission: 2, cycle: "Month1회", currency: "KRW", vat: 10, roas: 3.0, status: "active" },
    { id: "coupang", name: "Coupang", color: "#E51937", commission: 3, cycle: "Month1회", currency: "KRW", vat: 10, roas: 3.0, status: "active" },
    { id: "shopee", name: "Shopee", color: "#EE4D2D", commission: 5, cycle: "격주", currency: "KRW", vat: 0, roas: 2.5, status: "active" },
];
const DEF_DED = [
    { id: "d01", pid: "coupang", cat: "Commission", name: "Coupang 판매Commission", pct: 10.8, payer: "SELLER", sp: 100, base: "revenue", note: "Average 10.8%" },
    { id: "d02", pid: "coupang", cat: "Commission", name: "로켓그로스 Commission", pct: 5.0, payer: "SELLER", sp: 100, base: "revenue", note: "위탁 Commission" },
    { id: "d03", pid: "coupang", cat: "정산공제", name: "정산공제(환불/반품)", pct: 5.2, payer: "SELLER", sp: 100, base: "revenue", note: "반품처리 포함" },
    { id: "d04", pid: "tiktok", cat: "Commission", name: "TikTok Shop Commission", pct: 3.0, payer: "SELLER", sp: 100, base: "revenue", note: "판매 Commission" },
    { id: "d05", pid: "tiktok", cat: "Pro모션", name: "TikTok Coupon 할인", pct: 8.0, payer: "SHARED", sp: 50, base: "revenue", note: "플50%/셀50%" },
    { id: "d06", pid: "tiktok", cat: "Tax", name: "원천징Count", pct: 3.3, payer: "SELLER", sp: 100, base: "revenue", note: "해외 원천세" },
    { id: "d07", pid: "naver", cat: "Commission", name: "Naver 판매Commission", pct: 2.0, payer: "SELLER", sp: 100, base: "revenue", note: "표준 Commission" },
    { id: "d08", pid: "naver", cat: "정산공제", name: "Naver페이 PaymentCommission", pct: 1.65, payer: "SELLER", sp: 100, base: "revenue", note: "NEP Commission" },
    { id: "d09", pid: "naver", cat: "Pro모션", name: "포인트 적립 지원", pct: 1.0, payer: "PLATFORM", sp: 0, base: "revenue", note: "Platform 전액부담" },
    { id: "d10", pid: "meta", cat: "Tax", name: "Meta VAT", pct: 10.0, payer: "SELLER", sp: 100, base: "spend", note: "Ad Spend 부가세" },
    { id: "d11", pid: "google", cat: "Tax", name: "Google VAT", pct: 10.0, payer: "SELLER", sp: 100, base: "spend", note: "Ad Spend 부가세" },
    { id: "d12", pid: "shopee", cat: "Commission", name: "Shopee 판매Commission", pct: 5.0, payer: "SELLER", sp: 100, base: "revenue", note: "Categoryper 3-8%" },
    { id: "d13", pid: "shopee", cat: "배송", name: "배송비 지원공제", pct: 2.0, payer: "SHARED", sp: 30, base: "revenue", note: "플70%/셀30%" },
];
/* sp = seller_share % (SHARED일 때 셀러 부담 Rate) */

const PC = { SELLER: "#ef4444", PLATFORM: "#22c55e", SHARED: "#eab308" };
const PL = { SELLER: "셀러 부담", PLATFORM: "Platform 부담", SHARED: "분담" };
const genId = () => "d" + Date.now().toString(36);
const Badge = ({ label, color }) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "1a", color, border: `1px solid ${color}33` }}>{label}</span>
);
const iS = { padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "rgba(9,15,30,0.5)", color: "#fff", fontSize: 11, width: "100%" };

/* ── KPI 롤업 시뮬 데이터 ── */
const ROLLUP = {
    meta: { rev: 82800000, spend: 18400000, orders: 583, return_rate: 4.1, cogs_pct: 48, settled_pct: 12.5 },
    google: { rev: 94500000, spend: 13500000, orders: 573, return_rate: 2.8, cogs_pct: 46, settled_pct: 10.0 },
    tiktok: { rev: 21660000, spend: 11400000, orders: 180, return_rate: 8.2, cogs_pct: 52, settled_pct: 18.5 },
    naver: { rev: 88200000, spend: 12600000, orders: 569, return_rate: 3.2, cogs_pct: 47, settled_pct: 11.0 },
    coupang: { rev: 18144000, spend: 8640000, orders: 213, return_rate: 12.8, cogs_pct: 55, settled_pct: 21.0 },
    shopee: { rev: 9800000, spend: 2400000, orders: 98, return_rate: 6.0, cogs_pct: 50, settled_pct: 14.0 },
};

function calcKPI(pid, deds, revOverride, spendOverride) {
    const R = ROLLUP[pid]; if (!R) return null;
    const rev = revOverride ?? R.rev;
    const spend = spendOverride ?? R.spend;
    let sellerDed = 0;
    deds.filter(d => d.pid === pid).forEach(d => {
        const base = d.base === "spend" ? spend : rev;
        const share = d.payer === "SELLER" ? 1 : d.payer === "PLATFORM" ? 0 : (d.sp / 100);
        sellerDed += base * (d.pct / 100) * share;
    });
    const cogs = rev * (R.cogs_pct / 100);
    const retLoss = R.orders * (R.return_rate / 100) * 7000;
    const gp = rev - sellerDed - cogs - retLoss - spend;
    const roas = rev / spend;
    const margin = (gp / rev) * 100;
    return { roas, margin, gp, sellerDed, rev, spend };
}

/* ════ TAB 1: Platform 매핑 ════ */
function PlatformTab({ pf, onSave, onPropose }) {
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState({});
    const COLS = [
        { k: "id", l: "ID", w: 60 }, { k: "name", l: "Platform", w: 140 }, { k: "commission", l: "Commission%", w: 80 },
        { k: "cycle", l: "정산주기", w: 80 }, { k: "currency", l: "Currency", w: 55 }, { k: "vat", l: "VAT%", w: 55 },
        { k: "roas", l: "기준ROAS", w: 75 }, { k: "status", l: "Status", w: 65 },
    ];
    const start = p => { setEditing(p.id); setDraft({ ...p }); };
    const commit = () => {
        const orig = pf.find(p => p.id === editing);
        onSave(pf.map(p => p.id === editing ? draft : p));
        onPropose({ type: "platform", action: "MODIFY", target: editing, before: orig, after: draft, comment: `${draft.name} 기준Value Change` });
        setEditing(null);
    };
    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>Platform 매핑 레지스트리 — Change 시 Auto으로 Approval 큐 Register</div>
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(99,102,241,0.1)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead><tr style={{ background: "rgba(9,15,30,0.6)" }}>
                        {COLS.map(c => <th key={c.k} style={{ padding: "8px 8px", color: "var(--text-3)", fontWeight: 700, textAlign: "left", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>{c.l}</th>)}
                        <th style={{ padding: "8px 8px", color: "var(--text-3)", fontWeight: 700, borderBottom: "1px solid rgba(99,102,241,0.1)" }}>Action</th>
                    </tr></thead>
                    <tbody>
                        {pf.map((p, i) => editing === p.id ? (
                            <tr key={p.id} style={{ background: "rgba(99,102,241,0.05)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                                {COLS.map(c => <td key={c.k} style={{ padding: "7px 8px" }}>
                                    {c.k === "status" ? <select value={draft[c.k]} onChange={e => setDraft(d => ({ ...d, [c.k]: e.target.value }))} style={{ ...iS, width: 80 }}><option value="active">Active</option><option value="inactive">Inactive</option></select>
                                        : <input value={draft[c.k] ?? ""} onChange={e => setDraft(d => ({ ...d, [c.k]: e.target.value }))} style={{ ...iS, width: c.w - 8 }} />}
                                </td>)}
                                <td style={{ padding: "7px 8px" }}><div style={{ display: "flex", gap: 4 }}>
                                    <button onClick={commit} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#22c55e", color: "#fff", fontSize: 10, cursor: "pointer" }}>Save+제안</button>
                                    <button onClick={() => setEditing(null)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(99,102,241,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>Cancel</button>
                                </div></td>
                            </tr>
                        ) : (
                            <tr key={p.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,0.02)", borderBottom: "1px solid rgba(99,102,241,0.05)" }}>
                                {COLS.map(c => <td key={c.k} style={{ padding: "7px 8px", color: c.k === "id" ? "var(--text-3)" : "var(--text-1)" }}>
                                    {c.k === "status" ? <span style={{ fontSize: 10, fontWeight: 700, color: p.status === "active" ? "#22c55e" : "#666" }}>{p.status === "active" ? "● Active" : "○ Inactive"}</span>
                                        : c.k === "commission" || c.k === "vat" ? <b>{p[c.k]}%</b>
                                            : c.k === "roas" ? <b>{p[c.k]}x</b>
                                                : p[c.k]}
                                </td>)}
                                <td style={{ padding: "7px 8px" }}>
                                    <button onClick={() => start(p)} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#6366f1", color: "#fff", fontSize: 10, cursor: "pointer" }}>Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ════ TAB 2: 공제 항목 ════ */
function DeductionTab({ deds, pf, onSave, onPropose }) {
    const [fp, setFp] = useState("all");
    const [fpy, setFpy] = useState("all");
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [nr, setNr] = useState({ pid: "coupang", cat: "Commission", name: "", pct: 0, payer: "SELLER", sp: 100, base: "revenue", note: "" });

    const rows = deds.filter(d => (fp === "all" || d.pid === fp) && (fpy === "all" || d.payer === fpy));
    const commit = () => {
        const orig = deds.find(d => d.id === editing);
        onSave(deds.map(d => d.id === editing ? draft : d));
        onPropose({ type: "deduction", action: "MODIFY", target: editing, before: orig, after: draft, comment: `${draft.name} 공제항목 Change` });
        setEditing(null);
    };
    const del = id => { if (window.confirm("Delete?")) { const d = deds.find(x => x.id === id); onSave(deds.filter(x => x.id !== id)); onPropose({ type: "deduction", action: "DELETE", target: id, before: d, after: null, comment: `${d.name} Delete` }); } };
    const add = () => { if (!nr.name) return; onSave([...deds, { ...nr, id: genId() }]); setShowAdd(false); };

    const effSp = d => d.payer === "SELLER" ? 100 : d.payer === "PLATFORM" ? 0 : d.sp;

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[{ l: "셀러 부담", n: deds.filter(d => d.payer === "SELLER").length, c: "#ef4444" },
                { l: "분담 (가in progressRate)", n: deds.filter(d => d.payer === "SHARED").length, c: "#eab308" },
                { l: "Platform 부담", n: deds.filter(d => d.payer === "PLATFORM").length, c: "#22c55e" }
                ].map(({ l, n, c }) => (
                    <div key={l} className="card card-glass" style={{ padding: "12px 14px", borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: c, marginTop: 2 }}>{n}건</div>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select value={fp} onChange={e => setFp(e.target.value)} style={{ ...iS, width: 140 }}><option value="all">AllPlatform</option>{pf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <select value={fpy} onChange={e => setFpy(e.target.value)} style={{ ...iS, width: 120 }}><option value="all">All부담자</option><option value="SELLER">셀러</option><option value="PLATFORM">Platform</option><option value="SHARED">분담</option></select>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{rows.length} items</span>
                <button onClick={() => setShowAdd(v => !v)} className="btn-primary" style={{ marginLeft: "auto", fontSize: 11, padding: "4px 14px" }}>{showAdd ? "✕" : "+Add"}</button>
            </div>
            {showAdd && (
                <div style={{ padding: 14, borderRadius: 10, background: "rgba(99,102,241,0.05)", border: "1px dashed rgba(99,102,241,0.3)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 8 }}>
                        {[["pid", "Platform", "sel_pf"], ["cat", "Category", "sel_cat"], ["name", "항목명", "text"], ["pct", "Rate%", "number"], ["payer", "부담자", "sel_pay"]].map(([k, l, t]) => (
                            <div key={k}><div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>{l}</div>
                                {t === "sel_pf" ? <select value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: e.target.value }))} style={iS}>{pf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                    : t === "sel_cat" ? <select value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: e.target.value }))} style={iS}>{["Commission", "정산공제", "Tax", "Pro모션", "배송"].map(c => <option key={c}>{c}</option>)}</select>
                                        : t === "sel_pay" ? <select value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: e.target.value }))} style={iS}><option value="SELLER">셀러</option><option value="PLATFORM">Platform</option><option value="SHARED">분담</option></select>
                                            : <input type={t} step="0.1" value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: t === "number" ? +e.target.value : e.target.value }))} style={iS} />}
                            </div>
                        ))}
                    </div>
                    {nr.payer === "SHARED" && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>셀러 부담 Rate % (ex: 50 = 셀러50% Platform50%)</div><input type="number" step="5" min="0" max="100" value={nr.sp} onChange={e => setNr(r => ({ ...r, sp: +e.target.value }))} style={{ ...iS, width: 120 }} /></div>}
                    <div style={{ display: "flex", gap: 8 }}><button onClick={add} className="btn-primary" style={{ fontSize: 11, padding: "4px 14px" }}>Save</button><button onClick={() => setShowAdd(false)} className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>Cancel</button></div>
                </div>
            )}
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(99,102,241,0.1)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead><tr style={{ background: "rgba(9,15,30,0.6)" }}>
                        {["Platform", "Category", "항목명", "Rate", "부담자", "셀러부담%", "Apply기준", "비고", "Action"].map(h => (
                            <th key={h} style={{ padding: "8px 8px", color: "var(--text-3)", fontWeight: 700, textAlign: "left", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>
                        {rows.map((d, i) => {
                            const p = pf.find(x => x.id === d.pid);
                            return editing === d.id ? (
                                <tr key={d.id} style={{ background: "rgba(99,102,241,0.05)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                                    <td style={{ padding: "7px 8px" }}><select value={draft.pid} onChange={e => setDraft(v => ({ ...v, pid: e.target.value }))} style={{ ...iS, width: 90 }}>{pf.map(p2 => <option key={p2.id} value={p2.id}>{p2.name}</option>)}</select></td>
                                    <td style={{ padding: "7px 8px" }}><select value={draft.cat} onChange={e => setDraft(v => ({ ...v, cat: e.target.value }))} style={{ ...iS, width: 80 }}>{["Commission", "정산공제", "Tax", "Pro모션", "배송"].map(c => <option key={c}>{c}</option>)}</select></td>
                                    <td style={{ padding: "7px 8px" }}><input value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} style={{ ...iS, width: 130 }} /></td>
                                    <td style={{ padding: "7px 8px" }}><input type="number" step="0.1" value={draft.pct} onChange={e => setDraft(v => ({ ...v, pct: +e.target.value }))} style={{ ...iS, width: 55 }} /></td>
                                    <td style={{ padding: "7px 8px" }}><select value={draft.payer} onChange={e => setDraft(v => ({ ...v, payer: e.target.value }))} style={{ ...iS, width: 90 }}><option value="SELLER">셀러</option><option value="PLATFORM">Platform</option><option value="SHARED">분담</option></select></td>
                                    <td style={{ padding: "7px 8px" }}>{draft.payer === "SHARED" ? <input type="number" step="5" min="0" max="100" value={draft.sp} onChange={e => setDraft(v => ({ ...v, sp: +e.target.value }))} style={{ ...iS, width: 60 }} /> : <span style={{ color: "var(--text-3)", fontSize: 10 }}>{effSp(draft)}%</span>}</td>
                                    <td style={{ padding: "7px 8px" }}><select value={draft.base} onChange={e => setDraft(v => ({ ...v, base: e.target.value }))} style={{ ...iS, width: 80 }}><option value="revenue">TotalRevenue</option><option value="spend">Ad Spend</option></select></td>
                                    <td style={{ padding: "7px 8px" }}><input value={draft.note} onChange={e => setDraft(v => ({ ...v, note: e.target.value }))} style={{ ...iS, width: 130 }} /></td>
                                    <td style={{ padding: "7px 8px" }}><div style={{ display: "flex", gap: 4 }}><button onClick={commit} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#22c55e", color: "#fff", fontSize: 10, cursor: "pointer" }}>Save+제안</button><button onClick={() => setEditing(null)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(99,102,241,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>Cancel</button></div></td>
                                </tr>
                            ) : (
                                <tr key={d.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,0.02)", borderBottom: "1px solid rgba(99,102,241,0.05)" }}>
                                    <td style={{ padding: "7px 8px" }}><span style={{ fontWeight: 700, color: p?.color ?? "#888", fontSize: 11 }}>{p?.name ?? d.pid}</span></td>
                                    <td style={{ padding: "7px 8px" }}><Badge label={d.cat} color={"#6366f1"} /></td>
                                    <td style={{ padding: "7px 8px", fontWeight: 600 }}>{d.name}</td>
                                    <td style={{ padding: "7px 8px", fontWeight: 800, color: PC[d.payer] }}>{d.pct}%</td>
                                    <td style={{ padding: "7px 8px" }}><Badge label={PL[d.payer]} color={PC[d.payer]} /></td>
                                    <td style={{ padding: "7px 8px", fontWeight: 700, color: PC[d.payer] }}>{effSp(d)}%</td>
                                    <td style={{ padding: "7px 8px", color: "var(--text-3)" }}>{d.base === "spend" ? "Ad Spend" : "TotalRevenue"}</td>
                                    <td style={{ padding: "7px 8px", color: "var(--text-3)", fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.note}</td>
                                    <td style={{ padding: "7px 8px" }}><div style={{ display: "flex", gap: 4 }}><button onClick={() => { setEditing(d.id); setDraft({ ...d }); }} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#6366f1", color: "#fff", fontSize: 10, cursor: "pointer" }}>Edit</button><button onClick={() => del(d.id)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>Delete</button></div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export { PlatformTab, DeductionTab, calcKPI, ROLLUP, DEF_PF, DEF_DED, Badge, iS, PC, PL, useLS };
