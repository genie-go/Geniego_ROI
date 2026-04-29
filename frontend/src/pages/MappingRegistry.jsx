import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from '../i18n/index.js';
import { DeductionTab, calcKPI, ROLLUP, DEF_PF, DEF_DED, Badge, iS, PC, getPL, getCats, useLS } from "./MappingRegistryParts.jsx";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import useSecurityMonitor from '../hooks/useSecurityMonitor.js';

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

/* ─── Cross-Tab Sync ─────────────────────────────────────────────── */
const SYNC_CH = 'geniego_mr_sync';
if (!window.__MR_TAB) window.__MR_TAB = Math.random().toString(36).slice(2);

function useMRSync() {
  const chRef = useRef(null);
  useEffect(() => {
    try { chRef.current = new BroadcastChannel(SYNC_CH); } catch { return; }
    return () => { try { chRef.current?.close(); } catch {} };
  }, []);
  const broadcast = useCallback((type, data) => {
    try { chRef.current?.postMessage({ type, data, ts: Date.now(), tab: window.__MR_TAB }); } catch {}
  }, []);
  const onMessage = useCallback((handler) => {
    if (!chRef.current) return () => {};
    const fn = (e) => { if (e.data?.tab !== window.__MR_TAB) handler(e.data); };
    chRef.current.addEventListener('message', fn);
    return () => chRef.current?.removeEventListener('message', fn);
  }, []);
  return { broadcast, onMessage };
}

/* ─── Currency formatter ──────────────────────────────────────────── */
const fM = v => (v >= 0 ? "+" : "") + (Math.abs(v) / 1e6).toFixed(2) + "M";
const fP = v => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";
function SD_C(v, orig) { return v < orig ? "#22c55e" : v > orig ? "#ef4444" : "var(--text-1)"; }

/* ════ TAB 3: KPI Impact Simulation ════ */
function KpiImpactTab({ deds, pf }) {
  const t = useT();
  const { fmt } = useCurrency();
  const PL = getPL(t);
  const [pid, setPid] = useState(pf[0]?.id || "");
  const [simDeds, setSimDeds] = useState(deds);
  const [changes, setChanges] = useState([]);

  const applyChange = (id, field, val) => {
    const updated = simDeds.map(d => d.id === id ? { ...d, [field]: field === "pct" || field === "sp" ? +val : val } : d);
    setSimDeds(updated);
    setChanges(prev => {
      const ex = prev.find(c => c.dedId === id && c.field === field);
      return ex ? prev.map(c => c.dedId === id && c.field === field ? { ...c, newVal: val } : c) : [...prev, { dedId: id, field, newVal: val }];
    });
  };

  const base = calcKPI(pid, deds);
  const sim = calcKPI(pid, simDeds);
  const pfR = ROLLUP[pid];
  const plo = pf.find(p => p.id === pid);
  const delta = base && sim ? { roas: sim.roas - base.roas, margin: sim.margin - base.margin, gp: sim.gp - base.gp, ded: sim.sellerDed - base.sellerDed } : null;
  const pfDeds = deds.filter(d => d.pid === pid);

  if (pf.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "var(--text-3)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('mr.pfEmptyTitle')}</div>
        <div style={{ fontSize: 11 }}>{t('mr.pfEmptyDesc')}</div>
    </div>
);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{t('mr.kpiPlatformSelect')}</div>
        <select value={pid} onChange={e => { setPid(e.target.value); setSimDeds(deds); setChanges([]) }} style={{ ...S, width: 180 }}>
          {pf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => { setSimDeds(deds); setChanges([]); }} className="btn-ghost" style={{ fontSize: 11, padding: "4px 12px", color: "#ef4444" }}>{t('mr.kpiReset')}</button>
      </div>
      {base && sim && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { l: "ROAS", bv: base.roas.toFixed(2) + "x", sv: sim.roas.toFixed(2) + "x", d: delta.roas, fmtFn: v => fP(v).replace("+", "▲ ").replace("-", "▼ ") },
            { l: t('mr.kpiGrossMargin'), bv: base.margin.toFixed(1) + "%", sv: sim.margin.toFixed(1) + "%", d: delta.margin, fmtFn: v => fP(v) },
            { l: t('mr.kpiGrossProfit'), bv: fM(base.gp), sv: fM(sim.gp), d: delta.gp, fmtFn: v => fM(v) },
            { l: t('mr.kpiSellerDedTotal'), bv: fM(base.sellerDed), sv: fM(sim.sellerDed), d: delta.ded, fmtFn: v => fM(v) },
          ].map(({ l, bv, sv, d, fmtFn }) => (
            <div key={l} className="card card-glass" style={{ padding: "12px 14px", borderLeft: `3px solid ${Math.abs(d) < 0.01 ? "#6366f1" : d > 0 ? "#22c55e" : "#ef4444"}` }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-3)", textDecoration: "line-through" }}>{bv}</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{sv}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: Math.abs(d) < 0.01 ? "#888" : d > 0 ? "#22c55e" : "#ef4444" }}>
                {Math.abs(d) < 0.01 ? t('mr.kpiNoChange') : fmtFn(d)}
              </div>
            </div>
          ))}
        </div>
      )}
      {pfR && (
        <div className="card card-glass" style={{ padding: 14, borderLeft: "3px solid #6366f1" }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: "#6366f1", marginBottom: 6 }}>{t('mr.kpiRollupTitle')}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, fontSize: 11 }}>
            {[
              [t('mr.kpiTotalRevenue'), fmt((pfR.rev / 1e6).toFixed(1) + "M")],
              [t('mr.kpiAdSpend'), fmt((pfR.spend / 1e6).toFixed(1) + "M")],
              [t('mr.kpiOrderCount'), pfR.orders + t('mr.kpiOrderUnit')],
              [t('mr.kpiReturnRate'), pfR.return_rate + "%"],
              [t('mr.kpiCogsPct'), pfR.cogs_pct + "%"],
              [t('mr.kpiSettledPct'), pfR.settled_pct + "%"],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: "6px 8px", background: "rgba(99,102,241,0.06)", borderRadius: 6 }}>
                <div style={{ color: "var(--text-3)", fontSize: 10 }}>{k}</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{v}</div>
            </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>{t('mr.kpiRollupNote')}</div>
        </div>
      )}
      <div className="card card-glass" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{plo?.name} {t('mr.kpiDedTuning')}</div>
        {pfDeds.length === 0 ? <div style={{ color: "var(--text-3)", fontSize: 12 }}>{t('mr.kpiNoDedItems')}</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            {pfDeds.map(d => {
              const sd = simDeds.find(x => x.id === d.id) || d;
              const changed = changes.some(c => c.dedId === d.id);
              const sellerEff = sd.payer === "SELLER" ? sd.pct : sd.payer === "PLATFORM" ? 0 : sd.pct * (sd.sp / 100);
              return (
                <div key={d.id} style={{ padding: "10px 12px", borderRadius: 8, background: changed ? "rgba(99,102,241,0.07)" : "transparent", border: `1px solid ${changed ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.08)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge label={PL[d.payer]} color={PC[d.payer]} />
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{d.name}</span>
                      {changed && <Badge label={t('mr.kpiChanged')} color="#6366f1" />}
                    </div>
                    <div style={{ fontSize: 11, color: PC.SELLER }} >{t('mr.kpiSellerActual')}<b>{sellerEff.toFixed(2)}%</b></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#6366f1", marginBottom: 2 }} >Rate % <span>({t('mr.kpiRateOriginal')}: {d.pct}%)</span></div>
                      <input type="range" min={0} max={30} step={0.1} value={sd.pct} onChange={e => applyChange(d.id, "pct", e.target.value)} style={{ width: "100%", accentColor: "#6366f1" }} />
                      <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: SD_C(sd.pct, d.pct) }}>{sd.pct}%</div>
                    </div>
                    {d.payer === "SHARED" && (
                      <div>
                        <div style={{ fontSize: 10, color: "#6366f1", marginBottom: 2 }} >{t('mr.kpiSellerShare')} <span>({t('mr.kpiRateOriginal')}: {d.sp}%)</span></div>
                        <input type="range" min={0} max={100} step={5} value={sd.sp} onChange={e => applyChange(d.id, "sp", e.target.value)} style={{ width: "100%", accentColor: "#eab308" }} />
                        <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: "#eab308" }}>{sd.sp}%</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>{t('mr.kpiPayer')}</div>
                      <select value={sd.payer} onChange={e => applyChange(d.id, "payer", e.target.value)} style={{ ...iS, width: "100%" }}>
                        <option value="SELLER">{t('mr.dedSellerBurden')}</option><option value="PLATFORM">{t('mr.dedPlatformBurden')}</option><option value="SHARED">{t('mr.dedShared')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_C = { PENDING: "#eab308", APPROVED_1: "#06b6d4", APPROVED: "#22c55e", APPLIED: "#6366f1", REJECTED: "#ef4444" };

function ApprovalQueueTab({ queue, onAction }) {
  const t = useT();
  const STATUS_L = { PENDING: t('mr.apvPending'), APPROVED_1: t('mr.apvFirstApproval'), APPROVED: "Approved", APPLIED: t('mr.apvApplied'), REJECTED: t('mr.apvRejected') };
  const [tab, setTab] = useState("pending");
  const pending = queue.filter(q => ["PENDING", "APPROVED_1"].includes(q.status));
  const completed = queue.filter(q => ["APPROVED", "APPLIED", "REJECTED"].includes(q.status));
  const shown = tab === "pending" ? pending : completed;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { l: t('mr.apvPending'), n: queue.filter(q => q.status === "PENDING").length, c: "#eab308" },
          { l: t('mr.apvFirstApproval'), n: queue.filter(q => q.status === "APPROVED_1").length, c: "#06b6d4" },
          { l: t('mr.apvApplied'), n: queue.filter(q => q.status === "APPLIED").length, c: "#6366f1" },
          { l: t('mr.apvRejected'), n: queue.filter(q => q.status === "REJECTED").length, c: "#ef4444" },
        ].map(({ l, n, c }) => (
          <div key={l} className="card card-glass" style={{ padding: "12px 14px", borderLeft: `3px solid ${c}` }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: c, marginTop: 2 }}>{n}{t('mr.dedItems')}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 1, background: "rgba(9,15,30,0.5)", borderRadius: 8, padding: 2, width: "fit-content" }}>
        {[["pending", t('mr.apvTabPending') + (pending.length ? ` (${pending.length})` : "")], ["log", t('mr.apvTabLog')]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: "6px 18px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: tab === v ? "#6366f1" : "transparent", color: tab === v ? "#fff" : "var(--text-3)", transition: "all 150ms" }}>{l}</button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {shown.length === 0 && <div style={{ color: "var(--text-3)", fontSize: 12, padding: 20, textAlign: "center" }}>{t('mr.apvNoItems')}</div>}
        {shown.map(q => (
          <div key={q.id} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${STATUS_C[q.status]}33`, background: `${STATUS_C[q.status]}08` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: STATUS_C[q.status] + "1a", color: STATUS_C[q.status], border: `1px solid ${STATUS_C[q.status]}33` }}>{STATUS_L[q.status]}</span>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{q.comment}</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{q.ts}</div>
            </div>
            {q.before && q.after && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {["before", "after"].map(key => (
                  <div key={key} style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(9,15,30,0.4)", fontSize: 10 }}>
                    <div style={{ fontWeight: 700, color: key === "before" ? "#ef4444" : "#22c55e", marginBottom: 4 }}>{key === "before" ? t('mr.apvBefore') : t('mr.apvAfter')}</div>
                    {Object.entries(q[key]).filter(([k]) => !["id"].includes(k)).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                        <span style={{ color: "var(--text-3)" }}>{k}</span>
                        <span style={{ fontWeight: q.before[k] !== q.after[k] ? 700 : 400, color: q.before[k] !== q.after[k] ? key === "before" ? "#ef4444" : "#22c55e" : "var(--text-2)" }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
              {(q.log || []).map((l, i) => (
                <React.Fragment key={i}>
                  <div style={{ background: "rgba(99,102,241,0.1)", borderRadius: 6, padding: "3px 10px", fontSize: 10 }}>
                    <span style={{ color: "var(--text-3)" }}>{l.ts} </span>
                    <span style={{ fontWeight: 700, color: "#6366f1" }}>{l.actor}</span>
                    <span style={{ color: "var(--text-2)" }}> {l.action}</span>
                  </div>
                  {i < (q.log.length - 1) && <span style={{ color: "var(--text-3)", fontSize: 10 }}>→</span>}
                </React.Fragment>
              ))}
            </div>
            {tab === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                {q.status === "PENDING" && <button onClick={() => onAction(q.id, "APPROVE_1")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#06b6d4", color: '#fff', fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{t('mr.apvApprove1')}</button>}
                {q.status === "APPROVED_1" && <button onClick={() => onAction(q.id, "APPROVE_2")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#22c55e", color: '#fff', fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{t('mr.apvApproveFinal')}</button>}
                {q.status === "APPROVED" && <button onClick={() => onAction(q.id, "APPLY")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#6366f1", color: '#fff', fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{t('mr.apvApply')}</button>}
                {["PENDING", "APPROVED_1"].includes(q.status) && <button onClick={() => onAction(q.id, "REJECT")} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>{t('mr.apvReject')}</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════ MAIN ════ */
function tsNow() { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
function genId2() { return "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

export default function MappingRegistry() {
  const t = useT();
  const navigate = useNavigate();
  const { fmt } = useCurrency();
  const gd = useGlobalData();
  const { checkInput, checkRate, threats, locked } = useSecurityMonitor('mr');
  const { broadcast, onMessage } = useMRSync();

  const [pf] = useLS("genie_pf2", DEF_PF);
  const [deds, saveDeds, resetDeds] = useLS("genie_ded2", DEF_DED);
  const [queue, setQueue] = useState([]);
  const [tab, setTab] = useState("deduction");
  const [flash, setFlash] = useState("");

  // Purge legacy mock data on mount
  useEffect(() => {
    try {
      localStorage.removeItem('genie_pf');
      localStorage.removeItem('genie_ded');
    } catch {}
  }, []);

  // Cross-tab sync
  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === 'mr_ded_update') saveDeds(msg.data);
      if (msg.type === 'mr_tab_change') setTab(msg.data);
    });
  }, [onMessage, saveDeds]);

  const propose = useCallback(change => {
    const entry = {
      id: genId2(), ...change, status: "PENDING", ts: tsNow(),
      log: [{ ts: tsNow(), actor: t('mr.apvCurrentUser'), action: t('mr.apvProposed') }],
    };
    setQueue(q => [entry, ...q]);
    setFlash(t('mr.apvQueued')); setTimeout(() => setFlash(""), 2000);
  }, [t]);

  const handleQueueAction = useCallback((id, action) => {
    setQueue(q => q.map(item => {
      if (item.id !== id) return item;
      const now = tsNow();
      const actorMap = { APPROVE_1: "OwnerA", APPROVE_2: t('mr.apvTeamLead'), APPLY: t('mr.apvSystem'), REJECT: "OwnerA" };
      const statusMap = { APPROVE_1: "APPROVED_1", APPROVE_2: "APPROVED", APPLY: "APPLIED", REJECT: "REJECTED" };
      const msgMap = { APPROVE_1: t('mr.apv1stApproval'), APPROVE_2: t('mr.apvFinalApproval'), APPLY: t('mr.apvRegistryApplied'), REJECT: t('mr.apvRejection') };
      return { ...item, status: statusMap[action], log: [...item.log, { ts: now, actor: actorMap[action], action: msgMap[action] }] };
    }));
    if (action === "APPLY") { setFlash(t('mr.apvChangeApplied')); setTimeout(() => setFlash(""), 2000); }
  }, [t]);

  const pendingCount = queue.filter(q => ["PENDING", "APPROVED_1"].includes(q.status)).length;

  const TABS = [
    { id: "deduction", label: `💸 ${t('mr.tabDeduction')}`, desc: t('mr.tabDeductionDesc') },
    { id: "kpi", label: `📊 ${t('mr.tabKpi')}`, desc: t('mr.tabKpiDesc') },
    { id: "queue", label: `✅ ${t('mr.tabApproval')}`, desc: t('mr.tabApprovalDesc') },
  ];

  // Security lockdown
  if (locked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ padding: '48px 40px', borderRadius: 24, background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(220,38,38,0.03))', border: '2px solid rgba(239,68,68,0.3)', maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('mr.secLockTitle')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('mr.secLockDesc')}</div>
        </div>
    </div>
);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(168,85,247,0.05))", borderColor: "rgba(99,102,241,0.18)" }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.28),rgba(168,85,247,0.15))" }}>🗄️</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>{t('mr.heroTitle')}</div>
            <div className="hero-desc">{t('mr.heroDesc')}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          {[{ l: deds.length + t('mr.badgeDeductionCount'), c: "#a855f7" }, { l: t('mr.badge2StepApproval'), c: "#22c55e" }, { l: t('mr.badgeAuditAuto'), c: "#06b6d4" }]
            .map(({ l, c }) => <Badge key={l} label={l} color={c} />)}
          <button onClick={() => navigate('/integration-hub?tab=smart')} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>🔌 {t('mr.pfGoHub')}</button>
          {flash && <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>{flash}</span>}
          {pendingCount > 0 && <Badge label={`⚠ ${t('mr.approvalPending')} ${pendingCount}${t('mr.dedItems')}`} color="#eab308" />}
          <button onClick={() => { resetDeds(); setQueue([]); }} className="btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "4px 12px", color: "#ef4444" }}>{t('mr.resetAll')}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left",
              background: tab === tb.id ? "rgba(99,102,241,0.09)" : "transparent",
              borderBottom: `2px solid ${tab === tb.id ? "#6366f1" : "transparent"}`, transition: "all 200ms", position: "relative"
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: tab === tb.id ? "var(--text-1)" : "var(--text-2)" }}>
                {tb.label}
                {tb.id === "queue" && pendingCount > 0 && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "#ef4444", color: '#fff', fontWeight: 700 }}>{pendingCount}</span>}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{tb.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
        {tab === "deduction" && <DeductionTab deds={deds} pf={pf} onSave={(v) => { saveDeds(v); broadcast('mr_ded_update', v); }} onPropose={propose} />}
        {tab === "kpi" && <KpiImpactTab deds={deds} pf={pf} />}
        {tab === "queue" && <ApprovalQueueTab queue={queue} onAction={handleQueueAction} />}
      </div>
    </div>
  );
}
