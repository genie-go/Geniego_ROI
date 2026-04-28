import React, { useState, useCallback } from "react";
import { useT } from '../i18n/index.js';

/* ── LocalStorage Hook ── */
function useLS(key, def) {
    const [d, setD] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; } catch { return def; } });
    const save = useCallback(v => { setD(v); localStorage.setItem(key, JSON.stringify(v)); }, [key]);
    const reset = useCallback(() => { save(def); /* Purge legacy mock keys */ try { localStorage.removeItem('genie_pf'); localStorage.removeItem('genie_ded'); } catch {} }, [save, def]);
    return [d, save, reset];
}

/* ── Zero-Mock Initial Data ── */
const DEF_PF = [];
const DEF_DED = [];

/* ── Payer colors ── */
const PC = { SELLER: "#ef4444", PLATFORM: "#22c55e", SHARED: "#eab308" };
const genId = () => "d" + Date.now().toString(36);

const Badge = ({ label, color }) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "1a", color, border: `1px solid ${color}33` }}>{label}</span>
);
const iS = { padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(99,140,255,0.2)", background: "rgba(9,15,30,0.5)", color: 'var(--text-1)', fontSize: 11, width: "100%", boxSizing: "border-box" };

/* ── KPI Rollup (zero-mock: all zeros) ── */
const ROLLUP = {
    meta: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    google: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    tiktok: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    naver: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    coupang: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
    shopee: { rev: 0, spend: 0, orders: 0, return_rate: 0, cogs_pct: 0, settled_pct: 0 },
};

function calcKPI(pid, deds) {
    const R = ROLLUP[pid]; if (!R) return null;
    const rev = R.rev, spend = R.spend;
    let sellerDed = 0;
    deds.filter(d => d.pid === pid).forEach(d => {
        const base = d.base === "spend" ? spend : rev;
        const share = d.payer === "SELLER" ? 1 : d.payer === "PLATFORM" ? 0 : (d.sp / 100);
        sellerDed += base * (d.pct / 100) * share;
    });
    const cogs = rev * (R.cogs_pct / 100);
    const retLoss = R.orders * (R.return_rate / 100) * 7000;
    const gp = rev - sellerDed - cogs - retLoss - spend;
    const roas = spend > 0 ? rev / spend : 0;
    const margin = rev > 0 ? (gp / rev) * 100 : 0;
    return { roas, margin, gp, sellerDed, rev, spend };
}

/* ── Payer labels (i18n) ── */
function getPL(t) {
    return { SELLER: t('mr.dedSellerBurden'), PLATFORM: t('mr.dedPlatformBurden'), SHARED: t('mr.dedShared') };
}

/* ── Category labels (i18n) ── */
function getCats(t) {
    return [
        { key: "Commission", label: t('mr.dedCatCommission') },
        { key: "Settlement", label: t('mr.dedCatSettlement') },
        { key: "Tax", label: t('mr.dedCatTax') },
        { key: "Promotion", label: t('mr.dedCatPromotion') },
        { key: "Shipping", label: t('mr.dedCatShipping') },
    ];
}

/* ════ TAB 1: Platform Mapping ════ */
function PlatformTab({ pf, onSave, onPropose, navigate }) {
    const t = useT();
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState({});
    const COLS = [
        { k: "id", l: t('mr.pfColId'), w: 60 },
        { k: "name", l: t('mr.pfColPlatform'), w: 140 },
        { k: "commission", l: t('mr.pfColCommission'), w: 80 },
        { k: "cycle", l: t('mr.pfColCycle'), w: 80 },
        { k: "currency", l: t('mr.pfColCurrency'), w: 55 },
        { k: "vat", l: t('mr.pfColVat'), w: 55 },
        { k: "roas", l: t('mr.pfColRoas'), w: 75 },
        { k: "status", l: t('mr.pfColStatus'), w: 65 },
    ];
    const start = p => { setEditing(p.id); setDraft({ ...p }); };
    const commit = () => {
        const orig = pf.find(p => p.id === editing);
        onSave(pf.map(p => p.id === editing ? draft : p));
        onPropose({ type: "platform", action: "MODIFY", target: editing, before: orig, after: draft, comment: `${draft.name} ${t('mr.pfChangeValue')}` });
        setEditing(null);
    };

    if (pf.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "var(--text-1)" }}>{t('mr.pfEmptyTitle')}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>{t('mr.pfEmptyDesc')}</div>
                <button onClick={() => navigate('/integration-hub?tab=smart')} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#a855f7)", color: 'var(--text-1)', fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    🔌 {t('mr.pfGoHub')}
                </button>
    </div>
);
    }

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{t('mr.pfSubtitle')}</div>
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(99,102,241,0.1)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead><tr style={{ background: "rgba(9,15,30,0.6)" }}>
                        {COLS.map(c => <th key={c.k} style={{ padding: "8px 8px", color: "var(--text-3)", fontWeight: 700, textAlign: "left", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>{c.l}</th>)}
                        <th style={{ padding: "8px 8px", color: "var(--text-3)", fontWeight: 700, borderBottom: "1px solid rgba(99,102,241,0.1)" }}>{t('mr.pfColAction')}</th>
                    </tr></thead>
                    <tbody>
                        {pf.map((p, i) => editing === p.id ? (
                            <tr key={p.id} style={{ background: "rgba(99,102,241,0.05)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                                {COLS.map(c => <td key={c.k} style={{ padding: "7px 8px" }}>
                                    {c.k === "status" ? <select value={draft[c.k]} onChange={e => setDraft(d => ({ ...d, [c.k]: e.target.value }))} style={{ ...iS, width: 80 }}><option value="active">{t('mr.pfActive')}</option><option value="inactive">{t('mr.pfInactive')}</option></select>
                                        : <input value={draft[c.k] ?? ""} onChange={e => setDraft(d => ({ ...d, [c.k]: e.target.value }))} style={{ ...iS, width: c.w - 8 }} />}
                                </td>)}
                                <td style={{ padding: "7px 8px" }}><div style={{ display: "flex", gap: 4 }}>
                                    <button onClick={commit} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#22c55e", color: 'var(--text-1)', fontSize: 10, cursor: "pointer" }}>{t('mr.pfSavePropose')}</button>
                                    <button onClick={() => setEditing(null)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(99,102,241,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>{t('mr.pfCancel')}</button>
                                </div></td>
                            </tr>
                        ) : (
                            <tr key={p.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,0.02)", borderBottom: "1px solid rgba(99,102,241,0.05)" }}>
                                {COLS.map(c => <td key={c.k} style={{ padding: "7px 8px", color: c.k === "id" ? "var(--text-3)" : "var(--text-1)" }}>
                                    {c.k === "status" ? <span style={{ fontSize: 10, fontWeight: 700, color: p.status === "active" ? "#22c55e" : "#666" }}>{p.status === "active" ? t('mr.pfActive') : t('mr.pfInactive')}</span>
                                        : c.k === "commission" || c.k === "vat" ? <b>{p[c.k]}%</b>
                                            : c.k === "roas" ? <b>{p[c.k]}x</b>
                                                : p[c.k]}
                                </td>)}
                                <td style={{ padding: "7px 8px" }}>
                                    <button onClick={() => start(p)} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#6366f1", color: 'var(--text-1)', fontSize: 10, cursor: "pointer" }}>{t('mr.pfEdit')}</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
        </div>
    </div>
);
}

/* ════ TAB 2: Deduction Items ════ */
function DeductionTab({ deds, pf, onSave, onPropose }) {
    const t = useT();
    const PL = getPL(t);
    const CATS = getCats(t);
    const [fp, setFp] = useState("all");
    const [fpy, setFpy] = useState("all");
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState({});
    const [showAdd, setShowAdd] = useState(false);
    const [nr, setNr] = useState({ pid: pf[0]?.id || "", cat: "Commission", name: "", pct: 0, payer: "SELLER", sp: 100, base: "revenue", note: "" });

    const rows = deds.filter(d => (fp === "all" || d.pid === fp) && (fpy === "all" || d.payer === fpy));
    const commit = () => {
        const orig = deds.find(d => d.id === editing);
        onSave(deds.map(d => d.id === editing ? draft : d));
        onPropose({ type: "deduction", action: "MODIFY", target: editing, before: orig, after: draft, comment: `${draft.name} ${t('mr.dedChange')}` });
        setEditing(null);
    };
    const del = id => { if (window.confirm(t('mr.dedDeleteConfirm'))) { const d = deds.find(x => x.id === id); onSave(deds.filter(x => x.id !== id)); onPropose({ type: "deduction", action: "DELETE", target: id, before: d, after: null, comment: `${d.name} ${t('mr.dedDelete')}` }); } };
    const add = () => { if (!nr.name) return; onSave([...deds, { ...nr, id: genId() }]); setShowAdd(false); };
    const effSp = d => d.payer === "SELLER" ? 100 : d.payer === "PLATFORM" ? 0 : d.sp;

    return (
        <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[{ l: t('mr.dedSellerBurden'), n: deds.filter(d => d.payer === "SELLER").length, c: "#ef4444" },
                { l: t('mr.dedSharedRate'), n: deds.filter(d => d.payer === "SHARED").length, c: "#eab308" },
                { l: t('mr.dedPlatformBurden'), n: deds.filter(d => d.payer === "PLATFORM").length, c: "#22c55e" }
                ].map(({ l, n, c }) => (
                    <div key={l} className="card card-glass" style={{ padding: "12px 14px", borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: c, marginTop: 2 }}>{n}{t('mr.dedItems')}</div>
                ))}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select value={fp} onChange={e => setFp(e.target.value)} style={{ ...iS, width: 140 }}><option value="all">{t('mr.dedAllPlatform')}</option>{pf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <select value={fpy} onChange={e => setFpy(e.target.value)} style={{ ...iS, width: 120 }}><option value="all">{t('mr.dedAllPayer')}</option><option value="SELLER">{t('mr.dedSeller')}</option><option value="PLATFORM">{t('mr.dedPlatform')}</option><option value="SHARED">{t('mr.dedShared')}</option></select>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{rows.length}{t('mr.dedItems')}</span>
                <button onClick={() => setShowAdd(v => !v)} className="btn-primary" style={{ marginLeft: "auto", fontSize: 11, padding: "4px 14px" }}>{showAdd ? "✕" : t('mr.dedAdd')}</button>
            {showAdd && (
                <div style={{ padding: 14, borderRadius: 10, background: "rgba(99,102,241,0.05)", border: "1px dashed rgba(99,102,241,0.3)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 8 }}>
                        {[["pid", t('mr.dedColPlatform'), "sel_pf"], ["cat", t('mr.dedColCategory'), "sel_cat"], ["name", t('mr.dedColName'), "text"], ["pct", t('mr.dedColRate') + "%", "number"], ["payer", t('mr.kpiPayer'), "sel_pay"]].map(([k, l, tp]) => (
                            <div key={k}><div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>{l}</div>
                                {tp === "sel_pf" ? <select value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: e.target.value }))} style={iS}>{pf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                    : tp === "sel_cat" ? <select value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: e.target.value }))} style={iS}>{CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                                        : tp === "sel_pay" ? <select value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: e.target.value }))} style={iS}><option value="SELLER">{t('mr.dedSeller')}</option><option value="PLATFORM">{t('mr.dedPlatform')}</option><option value="SHARED">{t('mr.dedShared')}</option></select>
                                            : <input type={tp} step="0.1" value={nr[k]} onChange={e => setNr(r => ({ ...r, [k]: tp === "number" ? +e.target.value : e.target.value }))} style={iS} />}
                        ))}
                    {nr.payer === "SHARED" && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, color: "var(--text-3)", marginBottom: 2 }}>{t('mr.dedSellerShareDesc')}</div><input type="number" step="5" min="0" max="100" value={nr.sp} onChange={e => setNr(r => ({ ...r, sp: +e.target.value }))} style={{ ...iS, width: 120 }} /></div>}
                    <div style={{ display: "flex", gap: 8 }}><button onClick={add} className="btn-primary" style={{ fontSize: 11, padding: "4px 14px" }}>{t('mr.dedSave')}</button><button onClick={() => setShowAdd(false)} className="btn-ghost" style={{ fontSize: 11, padding: "4px 10px" }}>{t('mr.pfCancel')}</button></div>
            )}
            {rows.length === 0 && !showAdd ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>💸</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('mr.dedEmptyTitle')}</div>
                    <div style={{ fontSize: 11 }}>{t('mr.dedEmptyDesc')}</div>
            ) : rows.length > 0 && (
                <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(99,102,241,0.1)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead><tr style={{ background: "rgba(9,15,30,0.6)" }}>
                            {[t('mr.dedColPlatform'), t('mr.dedColCategory'), t('mr.dedColName'), t('mr.dedColRate'), t('mr.dedColPayer'), t('mr.dedColSellerPct'), t('mr.dedColBase'), t('mr.dedColNote'), t('mr.dedColAction')].map(h => (
                                <th key={h} style={{ padding: "8px 8px", color: "var(--text-3)", fontWeight: 700, textAlign: "left", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                            {rows.map((d, i) => {
                                const p = pf.find(x => x.id === d.pid);
                                return editing === d.id ? (
                                    <tr key={d.id} style={{ background: "rgba(99,102,241,0.05)", borderBottom: "1px solid rgba(99,102,241,0.1)" }}>
                                        <td style={{ padding: "7px 8px" }}><select value={draft.pid} onChange={e => setDraft(v => ({ ...v, pid: e.target.value }))} style={{ ...iS, width: 90 }}>{pf.map(p2 => <option key={p2.id} value={p2.id}>{p2.name}</option>)}</select></td>
                                        <td style={{ padding: "7px 8px" }}><select value={draft.cat} onChange={e => setDraft(v => ({ ...v, cat: e.target.value }))} style={{ ...iS, width: 80 }}>{CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></td>
                                        <td style={{ padding: "7px 8px" }}><input value={draft.name} onChange={e => setDraft(v => ({ ...v, name: e.target.value }))} style={{ ...iS, width: 130 }} /></td>
                                        <td style={{ padding: "7px 8px" }}><input type="number" step="0.1" value={draft.pct} onChange={e => setDraft(v => ({ ...v, pct: +e.target.value }))} style={{ ...iS, width: 55 }} /></td>
                                        <td style={{ padding: "7px 8px" }}><select value={draft.payer} onChange={e => setDraft(v => ({ ...v, payer: e.target.value }))} style={{ ...iS, width: 90 }}><option value="SELLER">{t('mr.dedSeller')}</option><option value="PLATFORM">{t('mr.dedPlatform')}</option><option value="SHARED">{t('mr.dedShared')}</option></select></td>
                                        <td style={{ padding: "7px 8px" }}>{draft.payer === "SHARED" ? <input type="number" step="5" min="0" max="100" value={draft.sp} onChange={e => setDraft(v => ({ ...v, sp: +e.target.value }))} style={{ ...iS, width: 60 }} /> : <span style={{ color: "var(--text-3)", fontSize: 10 }}>{effSp(draft)}%</span>}</td>
                                        <td style={{ padding: "7px 8px" }}><select value={draft.base} onChange={e => setDraft(v => ({ ...v, base: e.target.value }))} style={{ ...iS, width: 80 }}><option value="revenue">{t('mr.dedBaseTotalRevenue')}</option><option value="spend">{t('mr.dedBaseAdSpend')}</option></select></td>
                                        <td style={{ padding: "7px 8px" }}><input value={draft.note} onChange={e => setDraft(v => ({ ...v, note: e.target.value }))} style={{ ...iS, width: 130 }} /></td>
                                        <td style={{ padding: "7px 8px" }}><div style={{ display: "flex", gap: 4 }}><button onClick={commit} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#22c55e", color: 'var(--text-1)', fontSize: 10, cursor: "pointer" }}>{t('mr.pfSavePropose')}</button><button onClick={() => setEditing(null)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(99,102,241,0.2)", background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer" }}>{t('mr.pfCancel')}</button></div></td>
                                    </tr>
                                ) : (
                                    <tr key={d.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(99,102,241,0.02)", borderBottom: "1px solid rgba(99,102,241,0.05)" }}>
                                        <td style={{ padding: "7px 8px" }}><span style={{ fontWeight: 700, color: p?.color ?? "#888", fontSize: 11 }}>{p?.name ?? d.pid}</span></td>
                                        <td style={{ padding: "7px 8px" }}><Badge label={d.cat} color={"#6366f1"} /></td>
                                        <td style={{ padding: "7px 8px", fontWeight: 600 }}>{d.name}</td>
                                        <td style={{ padding: "7px 8px", fontWeight: 800, color: PC[d.payer] }}>{d.pct}%</td>
                                        <td style={{ padding: "7px 8px" }}><Badge label={PL[d.payer]} color={PC[d.payer]} /></td>
                                        <td style={{ padding: "7px 8px", fontWeight: 700, color: PC[d.payer] }}>{effSp(d)}%</td>
                                        <td style={{ padding: "7px 8px", color: "var(--text-3)" }}>{d.base === "spend" ? t('mr.dedBaseAdSpend') : t('mr.dedBaseTotalRevenue')}</td>
                                        <td style={{ padding: "7px 8px", color: "var(--text-3)", fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.note}</td>
                                        <td style={{ padding: "7px 8px" }}><div style={{ display: "flex", gap: 4 }}><button onClick={() => { setEditing(d.id); setDraft({ ...d }); }} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#6366f1", color: 'var(--text-1)', fontSize: 10, cursor: "pointer" }}>{t('mr.pfEdit')}</button><button onClick={() => del(d.id)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>{t('mr.dedDelete')}</button></div></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
            )}
                                    </div>
                                </div>
                </div>
            </div>
        </div>
    </div>
);
}

export { PlatformTab, DeductionTab, calcKPI, ROLLUP, DEF_PF, DEF_DED, Badge, iS, PC, getPL, getCats, useLS };
