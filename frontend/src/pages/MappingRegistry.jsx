import React, { useState, useCallback } from "react";
import { useT } from '../i18n/index.js';
import { PlatformTab, DeductionTab, calcKPI, ROLLUP, DEF_PF, DEF_DED, Badge, iS, PC, PL, useLS } from "./MappingRegistryParts.jsx";
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const fM = v => (v >= 0 ? "+" : "") + "\u20A9" + (Math.abs(v) / 1e6).toFixed(2) + "M";
const fP = v => (v >= 0 ? "+" : "") + v.toFixed(2) + "%";

/* ════ TAB 3: KPI Impact Simulation ════ */
function KpiImpactTab({ deds, pf }) {
    const { fmt } = useCurrency();
  const [pid, setPid] = useState("coupang");
  const [changes, setChanges] = useState([]); // {dedId, field, newVal}
  const [simDeds, setSimDeds] = useState(deds);

  const applyChange = (id, field, val) => {
  const t = useT();
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

  const delta = base && sim ? {
    roas: sim.roas - base.roas,
    margin: sim.margin - base.margin,
    gp: sim.gp - base.gp,
    ded: sim.sellerDed - base.sellerDed,
  } : null;

  /* 시뮬 Target Deduction 항목 */
  const pfDeds = deds.filter(d => d.pid === pid);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Platform Select */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Platform Select</div>
        <select value={pid} onChange={e => { setPid(e.target.value); setSimDeds(deds); setChanges([]); }} style={{ ...iS, width: 180 }}>
          {pf.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => { setSimDeds(deds); setChanges([]); }} className="btn-ghost" style={{ fontSize: 11, padding: "4px 12px", color: "#ef4444" }}>Reset</button>
      </div>

      {/* Before/After KPI Card */}
      {base && sim && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { l: "ROAS", bv: base.roas.toFixed(2) + "x", sv: sim.roas.toFixed(2) + "x", d: delta.roas, fmt: v => fP(v).replace("+", "▲ ").replace("-", "▼ ") },
            { l: "Gross Margin", bv: base.margin.toFixed(1) + "%", sv: sim.margin.toFixed(1) + "%", d: delta.margin, fmt: v => fP(v) },
            { l: "Gross Profit", bv: fM(base.gp), sv: fM(sim.gp), d: delta.gp, fmt: v => fM(v) },
            { l: t('auto.84k4q7', '셀러 Deduction Total'), bv: fM(base.sellerDed), sv: fM(sim.sellerDed), d: delta.ded, fmt: v => fM(v) },
          ].map(({ l, bv, sv, d, fmt }) => (
            <div key={l} className="card card-glass" style={{ padding: "12px 14px", borderLeft: `3px solid ${Math.abs(d) < 0.01 ? "#6366f1" : d > 0 ? "#22c55e" : "#ef4444"}` }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-3)", textDecoration: "line-through" }}>{bv}</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: "var(--text-1)" }}>{sv}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: Math.abs(d) < 0.01 ? "#888" : d > 0 ? "#22c55e" : "#ef4444" }}>
                {Math.abs(d) < 0.01 ? t('auto.tjlnpc', '변화 None') : fmt(d)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 재버킷팅 롤업 가정 Description */}
      <div className="card card-glass" style={{ padding: 14, borderLeft: "3px solid #6366f1" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "#6366f1", marginBottom: 6 }}>{t('auto.f3tz58', '📊 롤업 재버킷팅 가정')}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, fontSize: 11 }}>
          {pfR && [
            ["Total Revenue", "\u20A9" + (pfR.rev / 1e6).toFixed(1) + "M"],
            ["Ad Spend", "\u20A9" + (pfR.spend / 1e6).toFixed(1) + "M"],
            ["OrdersCount", pfR.orders + t('auto.zod9qg', '건')],
            [t('auto.z3ni05', '반품률'), pfR.return_rate + "%"],
            [t('auto.otk1of', 'Cost Price율'), pfR.cogs_pct + "%"],
            [t('auto.uysq8y', '정산Deduction율'), pfR.settled_pct + "%"],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "6px 8px", background: "rgba(99,102,241,0.06)", borderRadius: 6 }}>
              <div style={{ color: "var(--text-3)", fontSize: 10 }}>{k}</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8 }}>{t('auto.ovqe6l', '* Last 30 Days 실적 기준 재버킷팅 Simulation — Deduction 항목 Change 시 위 KPI에 미치는 영향 추정')}</div>
      </div>

      {/* Deduction 항목per 인라인 편집 */}
      <div className="card card-glass" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{plo?.name} Deduction 항목 — Impact 튜닝</div>
        {pfDeds.length === 0 ? <div style={{ color: "var(--text-3)", fontSize: 12 }}>{t('auto.no360s', '해당 Platform에 Register된 Deduction 항목 None')}</div> : (
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
                      {changed && <Badge label={t('auto.loj813', 'Change됨')} color="#6366f1" />}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{t('auto.f19x2e', '셀러 실부담:')}<b style={{ color: PC.SELLER }}>{sellerEff.toFixed(2)}%</b></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>Rate % <span style={{ color: "#6366f1" }}>(원본: {d.pct}%)</span></div>
                      <input type="range" min={0} max={30} step={0.1} value={sd.pct}
                        onChange={e => applyChange(d.id, "pct", e.target.value)}
                        style={{ width: "100%", accentColor: "#6366f1" }} />
                      <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: SD_C(sd.pct, d.pct) }}>{sd.pct}%</div>
                    </div>
                    {d.payer === "SHARED" && (
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>{t('auto.qoseh0', '셀러 부담 Rate')}<span style={{ color: "#6366f1" }}>(원본: {d.sp}%)</span></div>
                        <input type="range" min={0} max={100} step={5} value={sd.sp}
                          onChange={e => applyChange(d.id, "sp", e.target.value)}
                          style={{ width: "100%", accentColor: "#eab308" }} />
                        <div style={{ textAlign: "right", fontSize: 11, fontWeight: 700, color: "#eab308" }}>{sd.sp}%</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>{t('auto.iubu73', '부담자')}</div>
                      <select value={sd.payer} onChange={e => applyChange(d.id, "payer", e.target.value)} style={{ ...iS, width: "100%" }}>
                        <option value="SELLER">{t('auto.733kw6', '셀러 부담')}</option><option value="PLATFORM">{t('auto.aq6gvx', 'Platform 부담')}</option><option value="SHARED">{t('auto.99th7a', '분담')}</option>
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

function SD_C(v, orig) { return v < orig ? "#22c55e" : v > orig ? "#ef4444" : "var(--text-1)"; }

/* ════ TAB 4: Approval 큐 + 감사로그 ════ */
const STATUS_C = { PENDING: "#eab308", APPROVED_1: "#06b6d4", APPROVED: "#22c55e", APPLIED: "#6366f1", REJECTED: "#ef4444" };
const STATUS_L = { PENDING: "Pending", APPROVED_1: t('auto.radznv', '1차 Approval'), APPROVED: "Approval Done", APPLIED: t('auto.0r8dmc', 'Apply됨'), REJECTED: "Rejected" };

function ApprovalQueueTab({ queue, onAction }) {
  const [tab, setTab] = useState("pending");
  const pending = queue.filter(q => ["PENDING", "APPROVED_1"].includes(q.status));
  const completed = queue.filter(q => ["APPROVED", "APPLIED", "REJECTED"].includes(q.status));
  const shown = tab === "pending" ? pending : completed;

  const act = (id, action) => onAction(id, action);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          { l: "Pending", n: queue.filter(q => q.status === "PENDING").length, c: "#eab308" },
          { l: t('auto.l3r40l', '1차 Approval'), n: queue.filter(q => q.status === "APPROVED_1").length, c: "#06b6d4" },
          { l: t('auto.u34ti3', 'Apply됨'), n: queue.filter(q => q.status === "APPLIED").length, c: "#6366f1" },
          { l: "Rejected", n: queue.filter(q => q.status === "REJECTED").length, c: "#ef4444" },
        ].map(({ l, n, c }) => (
          <div key={l} className="card card-glass" style={{ padding: "12px 14px", borderLeft: `3px solid ${c}` }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{l}</div>
            <div style={{ fontWeight: 900, fontSize: 20, color: c, marginTop: 2 }}>{n}건</div>
          </div>
        ))}
      </div>

      {/* Tab Conversion */}
      <div style={{ display: "flex", gap: 1, background: "rgba(9,15,30,0.5)", borderRadius: 8, padding: 2, width: "fit-content" }}>
        {[["pending", "📋 Approval Pending" + (pending.length ? " (" + pending.length + ")" : "")], ["log", t('auto.6xy8um', '📜 감사 로그')]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            padding: "6px 18px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
            background: tab === v ? "#6366f1" : "transparent", color: tab === v ? "#fff" : "var(--text-3)", transition: "all 150ms"
          }}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 10 }}>
        {shown.length === 0 && <div style={{ color: "var(--text-3)", fontSize: 12, padding: 20, textAlign: "center" }}>{t('auto.ekm0q0', '항목 None')}</div>}
        {shown.map(q => (
          <div key={q.id} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${STATUS_C[q.status]}33`, background: `${STATUS_C[q.status]}08` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: STATUS_C[q.status] + "1a", color: STATUS_C[q.status], border: `1px solid ${STATUS_C[q.status]}33` }}>{STATUS_L[q.status]}</span>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{q.comment}</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{q.ts}</div>
            </div>
            {/* Before/After */}
            {q.before && q.after && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {["before", "after"].map(key => (
                  <div key={key} style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(9,15,30,0.4)", fontSize: 10 }}>
                    <div style={{ fontWeight: 700, color: key === "before" ? "#ef4444" : "#22c55e", marginBottom: 4 }}>{key === "before" ? t('auto.5f1eho', 'Change 전') : t('auto.yhtztt', 'Change 후')}</div>
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
            {/* 감사로그 타임라인 */}
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
            {/* Action Button */}
            {tab === "pending" && (
              <div style={{ display: "flex", gap: 8 }}>
                {q.status === "PENDING" && (
                  <button onClick={() => act(q.id, "APPROVE_1")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#06b6d4", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{t('auto.rcrtpa', '✓ 1차 Approval')}</button>
                )}
                {q.status === "APPROVED_1" && (
                  <button onClick={() => act(q.id, "APPROVE_2")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{t('auto.a9p92e', '✓✓ 최종 Approval')}</button>
                )}
                {q.status === "APPROVED" && (
                  <button onClick={() => act(q.id, "APPLY")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#6366f1", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>⚡ Apply</button>
                )}
                {["PENDING", "APPROVED_1"].includes(q.status) && (
                  <button onClick={() => act(q.id, "REJECT")} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>{t('auto.tkn3hj', '✗ 거부')}</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════ MAIN ════ */
const TABS = [
  { id: "platform", label: t('auto.ulyjf1', '🌐 Platform 매핑'), desc: t('auto.moe19u', '기준Value 레지스트리') },
  { id: "deduction", label: t('auto.24cui8', '💸 Deduction 항목'), desc: t('auto.0bknnh', '부담자 Rate 분해') },
  { id: "kpi", label: "📊 KPI Impact", desc: t('auto.sucyr0', '롤업 재버킷팅 시뮬') },
  { id: "queue", label: t('auto.j6wj63', '✅ Approval 큐'), desc: t('auto.bdj2mz', 'Notification→Approval→Apply→로그') },
];

function tsNow() { return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

export default function MappingRegistry() {
  const t = useT();
  const { fmt } = useCurrency();
  const [pf, savePf, resetPf] = useLS("genie_pf2", DEF_PF);
  const [deds, saveDeds, resetDeds] = useLS("genie_ded2", DEF_DED);
  const [queue, setQueue] = useState([]);
  const [tab, setTab] = useState("platform");
  const [flash, setFlash] = useState("");

  const propose = useCallback(change => {
    const entry = {
      id: genId2(),
      ...change,
      status: "PENDING",
      ts: tsNow(),
      log: [{ ts: tsNow(), actor: t('auto.7hc4ym', '현재User'), action: t('auto.7n36uc', 'Change 제안') }],
    };
    setQueue(q => [entry, ...q]);
    setFlash(t('auto.ep34v6', '✓ Approval 큐에 Register됨')); setTimeout(() => setFlash(""), 2000);
  }, []);

  const handleQueueAction = useCallback((id, action) => {
    setQueue(q => q.map(item => {
      if (item.id !== id) return item;
      const now = tsNow();
      const actorMap = { APPROVE_1: "OwnerA", APPROVE_2: t('auto.sexe5p', 'Team장B'), APPLY: t('auto.ucfpjb', '시스템'), REJECT: "OwnerA" };
      const statusMap = { APPROVE_1: "APPROVED_1", APPROVE_2: "APPROVED", APPLY: "APPLIED", REJECT: "REJECTED" };
      const msgMap = { APPROVE_1: t('auto.owi5s4', '1차 Approval'), APPROVE_2: t('auto.pgkojq', '최종 Approval'), APPLY: t('auto.rb8crt', '레지스트리 Apply Done'), REJECT: t('auto.t8guyt', '거부') };
      return { ...item, status: statusMap[action], log: [...item.log, { ts: now, actor: actorMap[action], action: msgMap[action] }] };
    }));
    if (action === "APPLY") setFlash(t('auto.yli3s7', '✓ Change 사항 Apply Done')); setTimeout(() => setFlash(""), 2000);
  }, []);

  const pendingCount = queue.filter(q => ["PENDING", "APPROVED_1"].includes(q.status)).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <div className="hero fade-up" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.07),rgba(168,85,247,0.05))", borderColor: "rgba(99,102,241,0.18)" }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.28),rgba(168,85,247,0.15))" }}>🗄️</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t('auto.hdmmtr', 'Mapping Registry 고도화')}</div>
            <div className="hero-desc">{t('auto.lnkmnv', '정적 dict → UI Management형 DB · Deduction 부담자 Rate 분해 · KPI Impact 시뮬 · 2-person Approval 큐 + 감사로그')}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          {[{ l: pf.length + "개 Platform", c: "#6366f1" }, { l: deds.length + "개 Deduction항목", c: "#a855f7" }, { l: t('auto.dxn4qk', '2단계 Approval 큐'), c: "#22c55e" }, { l: t('auto.udsxvq', '감사로그 Auto 기록'), c: "#06b6d4" }]
            .map(({ l, c }) => <Badge key={l} label={l} color={c} />)}
          {flash && <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>{flash}</span>}
          {pendingCount > 0 && <Badge label={`⚠ Approval Pending ${pendingCount}건`} color="#eab308" />}
          <button onClick={() => { resetPf(); resetDeds(); setQueue([]); }} className="btn-ghost" style={{ marginLeft: "auto", fontSize: 11, padding: "4px 12px", color: "#ef4444" }}>Reset</button>
        </div>
      </div>

      {/* Tab */}
      <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "14px 12px", border: "none", cursor: "pointer", textAlign: "left",
              background: tab === t.id ? "rgba(99,102,241,0.09)" : "transparent",
              borderBottom: `2px solid ${tab === t.id ? "#6366f1" : "transparent"}`, transition: "all 200ms", position: "relative"
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: tab === t.id ? "var(--text-1)" : "var(--text-2)" }}>{t.label}
                {t.id === "queue" && pendingCount > 0 && <span style={{ marginLeft: 6, fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "#ef4444", color: "#fff", fontWeight: 700 }}>{pendingCount}</span>}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
        {tab === "platform" && <PlatformTab pf={pf} onSave={savePf} onPropose={propose} />}
        {tab === "deduction" && <DeductionTab deds={deds} pf={pf} onSave={saveDeds} onPropose={propose} />}
        {tab === "kpi" && <KpiImpactTab deds={deds} pf={pf} />}
        {tab === "queue" && <ApprovalQueueTab queue={queue} onAction={handleQueueAction} />}
      </div>
    </div>
  );
}

function genId2() { return "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
