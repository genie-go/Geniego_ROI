import { useI18n } from '../i18n';
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import PlanGate from "../components/PlanGate.jsx";
import { useNavigate } from "react-router-dom";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';

const C = {
  bg: "#f8fafc", surface: "#f1f5f9", card: "rgba(255,255,255,0.95)",
  border: "#e2e8f0", accent: "#4f8ef7",
  green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
  purple: "#a78bfa", muted: "#64748b", text: "#1e293b",
};

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
const getPriorityBadge = (t) => ({
  urgent: { label: t('crm.gUrgent'), color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  high: { label: t('crm.gRisk'), color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  medium: { label: t('crm.gNormal'), color: "#4f8ef7", bg: "rgba(79,142,247,0.12)" },
});

const getRfmGrade = (t) => ({
  champions: { label: t('crm.gChamp'), color: "#22c55e" },
  loyal: { label: t('crm.gLoyal'), color: "#4f8ef7" },
  at_risk: { label: t('crm.gRisk'), color: "#fbbf24" },
  lost: { label: t('crm.gLost'), color: "#f87171" },
  new: { label: t('crm.gNew'), color: "#a78bfa" },
  normal: { label: t('crm.gNormal'), color: "#64748b" },
});

/* ── Currency Formatting ────────────────────────────────────────────────────── */
function useCurrencyFmt() {
  try {
    const { currency, exchangeRates } = useGlobalData();
    const fmt = useCallback((krwAmount) => {
      if (!krwAmount && krwAmount !== 0) return '-';
      const cur = currency || 'KRW';
      const rate = exchangeRates?.[cur] || 1;
      const converted = krwAmount * rate;
      const symbols = { KRW: '₩', USD: '$', EUR: '€', JPY: '¥', CNY: '¥', GBP: '£', THB: '฿', VND: '₫', IDR: 'Rp' };
      const sym = symbols[cur] || cur + ' ';
      if (cur === 'KRW') return `${sym}${Math.round(converted).toLocaleString()}`;
      if (cur === 'JPY') return `${sym}${Math.round(converted).toLocaleString()}`;
      return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }, [currency, exchangeRates]);
    return fmt;
  } catch {
    return (v) => new Intl.NumberFormat(navigator.language || 'ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(Math.round(v || 0));
  }
}

/* ── CSV Export ──────────────────────────────────────────────────────────────── */
function downloadCsv(headers, rows, filename) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Connected Channels Badge ───────────────────────────────────────────────── */
function ConnectedChannelsBadge({ t }) {
  const sync = useConnectorSync();
  const navigate = useNavigate();
  const raw = sync?.connectedChannels || {};
  const connectedChannels = Array.isArray(raw) ? raw : Object.entries(raw).filter(([,v]) => v).map(([k]) => ({ key: k, platform: k }));
  if (!connectedChannels.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', fontSize: 11, marginBottom: 14 }}>
        <span>⚠️</span>
        <span style={{ color: '#eab308', fontWeight: 600 }}>{t('crm.noConnectedChannels')}</span>
        <button onClick={() => navigate('/integration-hub')} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, border: '1.5px solid #3b82f6', background: 'rgba(59,130,246,0.1)', color: '#1d4ed8', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>{t('crm.goIntegrationHub')}</button>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '6px 10px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 10, marginBottom: 14 }}>
      <span style={{ fontWeight: 700, color: '#22c55e', fontSize: 11 }}>🔗 {t('crm.connectedChannels')}:</span>
      {connectedChannels.map(ch => (
        <span key={ch.key || ch.platform} style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>{ch.platform || ch.key}</span>
      ))}
    </div>
  );
}

/* ── Security Lock Modal ───────────────────────────────────────────────────── */
function SecurityLockModal({ t, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, maxWidth: 380, textAlign: 'center', boxShadow: '0 24px 64px rgba(239,68,68,0.12)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: '#ef4444', marginBottom: 8 }}>{t('crm.secLockTitle')}</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>{t('crm.secLockDesc')}</div>
        <button onClick={onDismiss} style={{ padding: '9px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#ffffff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{t('crm.dismiss')}</button>
      </div>
    </div>
  );
}

/* ── StatCard ───────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 22px" }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || C.accent }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Customer Detail Panel ──────────────────────────────────────────────────── */
function CustomerPanel({ customer, onClose, onSendEmail, onSendKakao, onDelete, crmCustomerHistory }) {
  const { t } = useI18n();
  const fmt = useCurrencyFmt();
  if (!customer) return null;
  const grade = getRfmGrade(t)[customer.grade] || getRfmGrade(t).normal;
  const acts = crmCustomerHistory[customer.id] || [];
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 200, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{t('crm.titDetail')}</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: C.card, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${grade.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{customer.name?.[0] || "?"}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{customer.name || "-"}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{customer.email}</div>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, background: `${grade.color}22`, color: grade.color, borderRadius: 6, padding: "3px 8px" }}>{grade.label}</span>
          </div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              [t('crm.lblPhone'), customer.phone || "-"],
              ["💰 LTV", fmt(customer.ltv)],
              [t('crm.colCnt'), `${customer.purchase_count} ${t('crm.unitTimes')}`],
              ["🏷 Tags", (customer.tags || []).join(", ") || "-"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: C.surface, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, color: C.muted }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onSendEmail(customer)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: `${C.accent}22`, color: C.accent, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{t('crm.btnEmail')}</button>
          <button onClick={() => onSendKakao(customer)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#fee08b22", color: "#fbbf24", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{t('crm.btnKakao')}</button>
          <button onClick={() => { if(window.confirm(t('crm.deleteConfirm'))) onDelete(customer.id); }} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "rgba(248,113,113,0.12)", color: "#f87171", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{t('crm.deleteCustomer')}</button>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t('crm.lblAct')} ({acts.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {acts.slice(0, 10).map((a, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>💳</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t('crm.actPurchase')}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{a.ch || "Web"}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {a.total > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{fmt(a.total)}</div>}
                  <div style={{ fontSize: 10, color: C.muted }}>{a.at}</div>
                </div>
              </div>
            ))}
            {acts.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>{t('crm.actEmpty')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── AI Segments Tab ────────────────────────────────────────────────────────── */
function AISegmentsTab({ navigate, derivedCustomers }) {
  const { t } = useI18n();
  const fmt = useCurrencyFmt();
  const [expanded, setExpanded] = useState(null);
  const [actionMsg, setActionMsg] = useState({});

  const segments = useMemo(() => {
    if (!derivedCustomers.length) return [];
    const highVal = derivedCustomers.filter(c => c.ltv > 500000);
    const risk = derivedCustomers.filter(c => c.ltv > 0 && c.purchase_count === 1);
    const res = [];
    if (highVal.length > 0) {
      res.push({ id: "vip_upsell", name: t('crm.aiSegVip'), icon: "💎", color: "#a855f7", priority: "medium", count: highVal.length, predicted_revenue: highVal.length * 150000, reason: t('crm.aiSegVipReason'), ai_insight: t('crm.aiSegVipInsight') });
    }
    if (risk.length > 0) {
      res.push({ id: "churn_risk", name: t('crm.aiSegChurn'), icon: "⚠️", color: "#f87171", priority: "urgent", count: risk.length, predicted_revenue: risk.length * 50000, reason: t('crm.aiSegChurnReason'), ai_insight: t('crm.aiSegChurnInsight') });
    }
    return res;
  }, [derivedCustomers, t]);

  const triggerAction = (segId, action) => {
    const msgs = { email: t('crm.msgEmailDone'), kakao: t('crm.msgKakaoDone'), journey: t('crm.msgJourneyDone') };
    setActionMsg(p => ({ ...p, [segId + action]: msgs[action] }));
    setTimeout(() => setActionMsg(p => { const n = { ...p }; delete n[segId + action]; return n; }), 3000);
    if (action === "email") navigate("/email-marketing");
    else if (action === "kakao") navigate("/kakao-channel");
    else if (action === "journey") navigate("/journey-builder");
  };

  const totalPredicted = segments.reduce((s, x) => s + x.predicted_revenue, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { label: t('crm.aiSum1'), value: segments.length, icon: "🤖", color: C.accent },
          { label: t('crm.aiSum2'), value: segments.reduce((s, x) => s + x.count, 0).toLocaleString() + " " + t('crm.segUnit'), icon: "👥", color: C.green },
          { label: t('crm.aiSum3'), value: fmt(totalPredicted), icon: "💰", color: C.purple },
        ].map(({ label, value, icon, color }, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
      {segments.map(seg => {
        const pBadge = getPriorityBadge(t)[seg.priority];
        const isExp = expanded === seg.id;
        return (
          <div key={seg.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", borderLeft: `4px solid ${seg.color}` }}>
            <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setExpanded(isExp ? null : seg.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{seg.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{seg.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{seg.reason}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: seg.color }}>{seg.count.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{t('crm.segUnit')}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{fmt(seg.predicted_revenue)}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>{t('crm.aiSum3')}</div>
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{isExp ? "▲" : "▼"}</span>
              </div>
            </div>
            {isExp && (
              <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
                <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: `${seg.color}0d`, border: `1px solid ${seg.color}30`, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                  🤖 <strong>{t('crm.aiInsight')}</strong> {seg.ai_insight}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {[
                    { action: "email", label: t('crm.btnEmailMkt'), color: C.accent },
                    { action: "kakao", label: t('crm.aiBtnKakao'), color: "#c8a000" },
                    { action: "journey", label: t('crm.btnJourney'), color: C.purple },
                  ].map(({ action, label, color }) => (
                    <button key={action} onClick={() => triggerAction(seg.id, action)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${color}40`, background: `${color}15`, color, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{label}</button>
                  ))}
                  {Object.entries(actionMsg).filter(([k]) => k.startsWith(seg.id)).map(([k, msg]) => (
                    <span key={k} style={{ fontSize: 12, color: C.green, alignSelf: "center", fontWeight: 700 }}>{msg}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {segments.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>{t('crm.emptyCust')}</div>}
    </div>
  );
}

/* ── Segments Tab ───────────────────────────────────────────────────────────── */
function SegmentsTab({ crmSegments, setCrmSegments }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", description: "", color: "#4f8ef7", rules: [] });
  const [msg, setMsg] = useState("");
  const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, { field: "ltv", op: "gte", value: "" }] }));
  const removeRule = (i) => setForm(f => { const r = [...f.rules]; r.splice(i, 1); return { ...f, rules: r }; });
  const updateRule = (i, k, v) => setForm(f => { const r = [...f.rules]; r[i] = { ...r[i], [k]: v }; return { ...f, rules: r }; });
  const save = () => {
    setCrmSegments(prev => [...prev, { id: "seg_" + Date.now(), ...form, count: 0 }]);
    setMsg(`✅ ${t('crm.btnSaving')}`);
    setForm({ name: "", description: "", color: "#4f8ef7", rules: [] });
    setTimeout(() => setMsg(""), 3000);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{t('crm.segNew')}</div>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('crm.segName')} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, marginBottom: 10, boxSizing: "border-box" }} />
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('crm.segDesc')} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, marginBottom: 10, boxSizing: "border-box" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{t('crm.segColor')}</span>
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 36, height: 28, borderRadius: 6, border: "none", cursor: "pointer", background: "none" }} />
        </div>
        <div style={{ flex: 1, minHeight: 120 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>{t('crm.segCond')}</div>
          {form.rules.map((rule, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <select value={rule.field} onChange={e => updateRule(i, "field", e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                <option value="ltv">LTV</option><option value="rfm_f">Frequency</option>
              </select>
              <select value={rule.op} onChange={e => updateRule(i, "op", e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                <option value="gte">≥</option><option value="lte">≤</option>
              </select>
              <input value={rule.value} onChange={e => updateRule(i, "value", e.target.value)} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }} />
              <button onClick={() => removeRule(i)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          ))}
          <button onClick={addRule} style={{ fontSize: 12, color: C.accent, background: "none", border: `1px dashed ${C.accent}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>{t('crm.segAdd')}</button>
        </div>
        {msg && <div style={{ fontSize: 12, color: msg.startsWith("✅") ? C.green : C.red, marginBottom: 8 }}>{msg}</div>}
        <button onClick={save} disabled={!form.name} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: C.accent, color: '#ffffff', fontWeight: 700, cursor: "pointer" }}>{t('crm.segCreate')}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {crmSegments.map(s => (
          <div key={s.id} style={{ background: C.card, borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${s.color || "#4f8ef7"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ fontWeight: 700, fontSize: 11, color: C.muted, marginTop: 2 }} >{s.name}</div><div>{s.description}</div></div>
              <div style={{ textAlign: "right", fontSize: 10, fontWeight: 800, color: C.muted }} ><div>{s.count}</div><div>{t('crm.segUnit')}</div></div>
            </div>
          </div>
        ))}
        {crmSegments.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>{t('crm.segEmpty')}</div>}
      </div>
    </div>
  );
}

/* ── RFM Tab ────────────────────────────────────────────────────────────────── */
function RFMTab({ derivedCustomers }) {
  const { t } = useI18n();
  const fmt = useCurrencyFmt();
  const stats = useMemo(() => {
    const s = { champions: 0, loyal: 0, at_risk: 0, lost: 0, new: 0, normal: 0 };
    derivedCustomers.forEach(c => { if (c.grade && s[c.grade] !== undefined) s[c.grade]++; else s.normal++; });
    return s;
  }, [derivedCustomers]);
  const total = derivedCustomers.length || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {Object.entries(getRfmGrade(t)).filter(([k]) => k !== "normal").map(([key, { label, color }]) => {
          const pct = Math.round(((stats[key] || 0) / total) * 100);
          return (
            <div key={key} style={{ background: C.card, borderRadius: 12, padding: "16px", textAlign: "center", borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{stats[key] || 0}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{label}</div>
              <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s' }} />
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{pct}%</div>
            </div>
          );
        })}
      </div>
      <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{t('crm.rfmListTit')}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f1f5f9" }}>
              {[t('crm.fName'), t('crm.colEmail'), "LTV", t('crm.colCnt'), t('crm.colLast'), t('crm.colGrade')].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {derivedCustomers.slice(0, 50).map((c, i) => {
                const g = getRfmGrade(t)[c.grade] || getRfmGrade(t).normal;
                return (
                  <tr key={c.id || i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "#f1f5f9" : "transparent" }}>
                    <td style={{ padding: "8px 14px", fontWeight: 600 }}>{c.name || "-"}</td>
                    <td style={{ padding: "8px 14px", color: C.muted }}>{c.email}</td>
                    <td style={{ padding: "8px 14px", color: C.green, fontWeight: 700 }}>{fmt(c.ltv)}</td>
                    <td style={{ padding: "8px 14px" }}>{c.purchase_count || 0} {t('crm.unitTimes')}</td>
                    <td style={{ padding: "8px 14px", color: C.muted, fontSize: 12 }}>{c.last_purchase || "-"}</td>
                    <td style={{ fontSize: 11, fontWeight: 700, background: `${g.color}22`, color: g.color, borderRadius: 6, padding: "3px 8px" }} ><span>{g.label}</span></td>
                  </tr>
                );
              })}
              {derivedCustomers.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: C.muted }}>{t('crm.emptyCust')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Guide Tab ──────────────────────────────────────────────────────────────── */
function GuideTab() {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(167,139,250,0.08))', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 44 }}>👥</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('crm.guideTitle')}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, maxWidth: 700, margin: '6px auto 0', lineHeight: 1.7 }}>{t('crm.guideSub')}</div>
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('crm.guideStepsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
          {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a78bfa'},{n:'4️⃣',k:'guideStep4',c:'#f97316'},{n:'5️⃣',k:'guideStep5',c:'#06b6d4'},{n:'6️⃣',k:'guideStep6',c:'#f472b6'}].map((s,i) => (
            <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{s.n}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`crm.${s.k}Title`)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{t(`crm.${s.k}Desc`)}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('crm.guideTabsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          {[{icon:'👥',k:'guideCust',c:'#4f8ef7'},{icon:'🤖',k:'guideAi',c:'#a78bfa'},{icon:'🏷️',k:'guideSeg',c:'#22c55e'},{icon:'📊',k:'guideRfm',c:'#f97316'}].map((tb,i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`crm.${tb.k}Name`)}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.6 }}>{t(`crm.${tb.k}Desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('crm.guideTipsTitle')}</div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: C.muted, lineHeight: 2.2 }}>
          {[1,2,3,4,5].map(i => <li key={i}>{t(`crm.guideTip${i}`)}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN CRM CONTENT
   ══════════════════════════════════════════════════════════════════════════════ */
function CRMContent() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const fmt = useCurrencyFmt();

  /* ── GlobalDataContext + Security ── */
  const { crmCustomerHistory, crmSegments, setCrmSegments, addAlert, broadcastUpdate } = useGlobalData();
  const [secLocked, setSecLocked] = useState(false);
  useSecurityGuard({
    addAlert: useCallback((a) => {
      if (typeof addAlert === 'function') addAlert(a);
      if (a?.severity === 'critical') setSecLocked(true);
    }, [addAlert]),
    enabled: true,
  });

  /* ── BroadcastChannel ── */
  const bcRef = useRef(null);
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('geniego_crm');
      bcRef.current.onmessage = (ev) => { if (ev.data?.type === 'CRM_REFRESH') {} };
    } catch {}
    return () => { try { bcRef.current?.close(); } catch {} };
  }, []);
  const broadcastRefresh = useCallback(() => {
    try { bcRef.current?.postMessage({ type: 'CRM_REFRESH', ts: Date.now() }); } catch {}
    if (typeof broadcastUpdate === 'function') broadcastUpdate('crm', { refreshed: Date.now() });
  }, [broadcastUpdate]);

  /* ── Derived Customers ── */
  const derivedCustomers = useMemo(() => {
    return Object.entries(crmCustomerHistory).map(([key, hsts]) => {
      const totalLtv = hsts.reduce((sum, h) => sum + h.total, 0);
      const lastPurchase = hsts[0]?.at?.slice(0, 10);
      let grade = 'normal';
      if (totalLtv > 500000) grade = 'champions';
      else if (totalLtv > 200000) grade = 'loyal';
      else if (totalLtv > 0 && hsts.length === 1) grade = 'new';
      return { id: key, name: key, email: key.includes('@') ? key : `${key}@mail.example`, phone: "-", grade, ltv: totalLtv, purchase_count: hsts.length, last_purchase: lastPurchase, tags: [] };
    });
  }, [crmCustomerHistory]);

  const [manualCustomers, setManualCustomers] = useState([]);
  const customers = useMemo(() => [...derivedCustomers, ...manualCustomers].sort((a, b) => b.ltv - a.ltv), [derivedCustomers, manualCustomers]);

  const [tab, setTab] = useState("customers");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", phone: "", grade: "normal", tags: "" });
  const PER_PAGE = 20;

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PER_PAGE));
  const pageCustomers = filteredCustomers.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const saveCustomer = () => {
    const payload = { ...form, id: form.email, ltv: 0, purchase_count: 0, tags: form.tags ? form.tags.split(",").map(tx => tx.trim()) : [] };
    setManualCustomers(prev => [payload, ...prev]);
    setShowForm(false); setForm({ email: "", name: "", phone: "", grade: "normal", tags: "" });
    broadcastRefresh();
  };

  const deleteCustomer = (id) => {
    setManualCustomers(prev => prev.filter(c => c.id !== id));
    setSelectedCustomer(null);
    broadcastRefresh();
  };

  const handleExportCsv = () => {
    const headers = [t('crm.fName'), t('crm.colEmail'), t('crm.colPhone'), t('crm.colGrade'), 'LTV', t('crm.colCnt'), t('crm.colLast')];
    const rows = customers.map(c => [c.name, c.email, c.phone, c.grade, c.ltv, c.purchase_count, c.last_purchase || '']);
    downloadCsv(headers, rows, `crm_customers_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const TABS = [
    { id: "customers", label: t('crm.tabCust') },
    { id: "ai_segments", label: t('crm.tabAiSeg') },
    { id: "segments", label: t('crm.tabManSeg') },
    { id: "rfm", label: t('crm.tabRfm') },
    { id: "guide", label: t('crm.tabGuide') },
  ];

  const displayStats = {
    total: customers.length,
    active_30d: customers.filter(c => c.purchase_count > 0).length,
    total_ltv: customers.reduce((sum, c) => sum + c.ltv, 0),
  };

  return (
    <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
      {secLocked && <SecurityLockModal t={t} onDismiss={() => setSecLocked(false)} />}
      <AIRecommendBanner context="crm" />

      {/* Connected Channels */}
      <ConnectedChannelsBadge t={t} />

      {/* Live Sync Status */}
      <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', fontSize: 10, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
        {t('crm.liveSyncStatus')}
      </div>

      {/* Hero */}
      <div className="page-hero" style={{ borderRadius: 16, background: '#f1f5f9', border: `1px solid ${C.border}`, padding: "22px 28px", marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="section-title" style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{t('crm.pageTitle')}</div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{t('crm.pageSub')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={broadcastRefresh} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>🔄 {t('crm.syncNow')}</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon="👥" label={t('crm.statTot')} value={displayStats.total.toLocaleString()} color={C.accent} />
        <StatCard icon="🔥" label={t('crm.statAct')} value={displayStats.active_30d.toLocaleString()} color={C.green} />
        <StatCard icon="💰" label={t('crm.statLtv')} value={fmt(displayStats.total_ltv)} color="#38bdf8" />
        <StatCard icon="🏷" label={t('crm.statSeg')} value={crmSegments.length} color={C.yellow} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(tOption => (
          <button key={tOption.id} onClick={() => setTab(tOption.id)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === tOption.id ? C.accent : C.card, color: tab === tOption.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13 }}>{tOption.label}</button>
        ))}
        {tab === "customers" && (
          <>
            <button onClick={handleExportCsv} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📥 {t('crm.exportCsv')}</button>
            <button onClick={() => setShowForm(f => !f)} style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 10, border: "none", background: C.green, color: '#ffffff', fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ {t('crm.btnRegister')}</button>
          </>
        )}
      </div>

      {/* Customer Registration Form */}
      {showForm && tab === "customers" && (
        <div style={{ background: C.card, borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>{t('crm.formNew')}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[[t('crm.fEmail'), "email", "email@example.com"], [t('crm.fName'), "name", "John Doe"], [t('crm.fPhone'), "phone", "010-0000-0000"]].map(([label, key, placeholder]) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{label}</div>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('crm.fGrade')}</div>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                <option value="normal">{t('crm.fGradeGen')}</option>
                <option value="loyal">{t('crm.gLoyal')}</option>
                <option value="champions">{t('crm.gChamp')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={saveCustomer} disabled={!form.email} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: C.accent, color: '#ffffff', fontWeight: 700, cursor: "pointer" }}>{t('crm.btnSave')}</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 22px", borderRadius: 9, border: `1px solid ${C.border}`, background: "none", color: C.muted, cursor: "pointer" }}>{t('crm.btnCancel')}</button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      {tab === "customers" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('crm.fSearch')}
              style={{ flex: 1, padding: "9px 14px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.text }} />
          </div>
          <div style={{ background: C.card, borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#f1f5f9" }}>
                {[t('crm.fName'), t('crm.colEmail'), t('crm.colPhone'), t('crm.colGrade'), t('crm.colLtv') || 'LTV', t('crm.colCnt'), t('crm.colLast'), ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pageCustomers.map((c, i) => {
                  const g = getRfmGrade(t)[c.grade] || getRfmGrade(t).normal;
                  return (
                    <tr key={c.id} onClick={() => setSelectedCustomer(c)} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: i % 2 ? "#f1f5f9" : "transparent", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "#f1f5f9" : "transparent"}>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{c.name || "-"}</td>
                      <td style={{ padding: "10px 16px", color: C.muted }}>{c.email}</td>
                      <td style={{ padding: "10px 16px", color: C.muted }}>{c.phone || "-"}</td>
                      <td style={{ fontSize: 11, fontWeight: 700, background: `${g.color}22`, color: g.color, borderRadius: 6, padding: "3px 8px" }} ><span>{g.label}</span></td>
                      <td style={{ padding: "10px 16px", color: C.green, fontWeight: 700 }}>{fmt(c.ltv)}</td>
                      <td style={{ padding: "10px 16px" }}>{c.purchase_count || 0} {t('crm.unitTimes')}</td>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: C.muted }}>{c.last_purchase || "-"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 11, color: C.accent }} ><span>{t('crm.tDetail')}</span></td>
                    </tr>
                  );
                })}
                {customers.length === 0 && <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: C.muted }}>{t('crm.emptyCust')}</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: page <= 1 ? 'rgba(0,0,0,0.2)' : C.accent, cursor: page <= 1 ? 'default' : 'pointer', fontWeight: 700, fontSize: 12 }}>{t('crm.prev')}</button>
              <span style={{ fontSize: 12, color: C.muted }}>{t('crm.page')} {page} {t('crm.of')} {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: page >= totalPages ? 'rgba(0,0,0,0.2)' : C.accent, cursor: page >= totalPages ? 'default' : 'pointer', fontWeight: 700, fontSize: 12 }}>{t('crm.next')}</button>
            </div>
          )}
        </>
      )}

      {tab === "segments" && <SegmentsTab crmSegments={crmSegments} setCrmSegments={setCrmSegments} />}
      {tab === "rfm" && <RFMTab derivedCustomers={customers} />}
      {tab === "ai_segments" && <AISegmentsTab navigate={navigate} derivedCustomers={customers} />}
      {tab === "guide" && <GuideTab />}

      <CustomerPanel
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        crmCustomerHistory={crmCustomerHistory}
        onDelete={deleteCustomer}
        onSendEmail={c => navigate(`/email-marketing?prefill_email=${encodeURIComponent(c.email)}`)}
        onSendKakao={c => navigate(`/kakao-channel?prefill_phone=${encodeURIComponent(c.phone || "")}`)}
      />
    </div>
  );
}

export default function CRM() {
  return (
    <PlanGate feature="crm">
      <CRMContent />
    </PlanGate>
  );
}
