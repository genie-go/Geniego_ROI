import { useI18n } from '../i18n';
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { IS_DEMO } from '../utils/demoEnv';
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import PlanGate from "../components/PlanGate.jsx";
import { useNavigate } from "react-router-dom";
import GuideWizard from '../components/GuideWizard.jsx'; // [237차] 인앱 순차 완료 위저드(필수등록 게이팅)
import { getJsonAuth as _gjaCrm } from '../services/apiClient.js';
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { crmApi } from "../services/crmApi.js"; // 191차 4단계: 운영 백엔드 실배선(/api/crm/*)
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리

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
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 26, flex: "0 0 auto" }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: color || C.accent, lineHeight: 1.15 }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
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
function SegmentsTab({ segments, onSave, onDelete, onSmartSeed, onRefresh }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", description: "", color: "#4f8ef7", rules: [] });
  const [msg, setMsg] = useState("");
  const [seeding, setSeeding] = useState(false);
  const smartSeed = async () => { setSeeding(true); try { await onSmartSeed?.(); } finally { setSeeding(false); } };
  const addRule = () => setForm(f => ({ ...f, rules: [...f.rules, { field: "ltv", op: "gte", value: "" }] }));
  const removeRule = (i) => setForm(f => { const r = [...f.rules]; r.splice(i, 1); return { ...f, rules: r }; });
  const updateRule = (i, k, v) => setForm(f => { const r = [...f.rules]; r[i] = { ...r[i], [k]: v }; return { ...f, rules: r }; });
  const save = async () => {
    await onSave(form); // 데모=로컬 append, 운영=crmApi.createSegment+reload
    setMsg(`✅ ${t('crm.btnSaving')}`);
    setForm({ name: "", description: "", color: "#4f8ef7", rules: [] });
    setTimeout(() => setMsg(""), 3000);
  };
  const crmSegments = segments;
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
                <option value="ltv">LTV</option><option value="frequency">{t('crm.segFreq', '구매횟수')}</option><option value="recency">{t('crm.segRecency', '최근구매 경과일')}</option><option value="rfm_score">RFM</option><option value="grade">{t('crm.colGrade', '등급')}</option>
              </select>
              <select value={rule.op} onChange={e => updateRule(i, "op", e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                <option value="gte">≥</option><option value="lte">≤</option><option value="gt">&gt;</option><option value="lt">&lt;</option><option value="eq">=</option>
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
        <button onClick={smartSeed} disabled={seeding} style={{ padding: "10px 14px", borderRadius: 10, border: "none", cursor: seeding ? "default" : "pointer", fontWeight: 800, fontSize: 13, background: seeding ? "#cbd5e1" : "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff" }}>
          {seeding ? "…" : "🧠 " + t('crm.smartSeed', '스마트 세그먼트 자동생성 (VIP·충성·신규·이탈위험·휴면)')}
        </button>
        {crmSegments.map(s => (
          <div key={s.id} style={{ background: C.card, borderRadius: 12, padding: "14px 18px", borderLeft: `4px solid ${s.color || "#4f8ef7"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ fontWeight: 700, fontSize: 11, color: C.muted, marginTop: 2 }} >{s.name}</div><div>{s.description}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ textAlign: "right", fontSize: 10, fontWeight: 800, color: C.muted }} ><div>{s.count}</div><div>{t('crm.segUnit')}</div></div>
                {onRefresh && <button onClick={() => onRefresh(s.id)} title={t('crm.segRefresh', '멤버십 재계산 (실데이터 기준 동기화)')} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 14 }}>🔄</button>}
                <button onClick={() => { if (window.confirm(t('crm.deleteConfirm', 'Delete?'))) onDelete(s.id); }} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
        {crmSegments.length === 0 && <div style={{ color: C.muted, textAlign: "center", padding: 24, fontSize: 13 }}>{t('crm.segEmpty')}</div>}
      </div>
    </div>
  );
}

/* [240차 약점③] 예측형 CDP 행 점수 — 운영은 백엔드 churn_prob/predicted_clv(단일소스·CRM.addPredictiveScores) 우선,
   데모(백엔드값 부재)는 recency/frequency 기반 표시용 근사(샌드박스 전용·운영 로직 무관·데이터 오염 0). */
function predRowScore(c) {
  if (c.churn_prob != null && c.predicted_clv != null) return { churn: Number(c.churn_prob), clv: Number(c.predicted_clv) };
  const freq = Number(c.purchase_count || 0);
  const daysSince = c.last_purchase ? Math.max(0, (Date.now() - new Date(c.last_purchase).getTime()) / 86400000) : 999;
  if (freq <= 0) return { churn: 0.5, clv: 0 };
  const churn = Math.min(0.99, daysSince / (freq >= 3 ? 120 : freq === 2 ? 100 : 180));
  const aov = c.ltv > 0 ? c.ltv / freq : 0;
  const clv = Math.round(aov * (1 - churn) * (freq >= 2 ? 1.5 : 0.5));
  return { churn: Math.round(churn * 1000) / 1000, clv };
}

/* ── Deliverability Tab — 메시징 빈도캡(Frequency Capping) + 발송시간 최적화(STO) ──
 *   [현 차수] 경쟁사 Braze/Klaviyo 정합. 서버 app_setting(테넌트 격리 skey 접두)에 저장.
 *   데모는 로컬 상태만(운영 격리). 운영은 /api/crm/comms-freq GET/PUT 실배선. */
function DeliverabilityTab({ t }) {
  const [cfg, setCfg] = React.useState({ cap: 4, window: 7, quiet_start: 21, quiet_end: 8, sto: false });
  const [loading, setLoading] = React.useState(!IS_DEMO);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    if (IS_DEMO) return; // 데모: 기본값 로컬 편집(운영 격리)
    let alive = true;
    (async () => {
      try {
        const r = await crmApi.getCommsFreq();
        if (alive && r?.config) setCfg(c => ({ ...c, ...r.config }));
      } catch (e) { /* 미설정/네트워크 → 기본값 유지 */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, isNaN(+v) ? lo : Math.round(+v)));
  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const onSave = async () => {
    setMsg(""); setSaving(true);
    const body = {
      cap: clamp(cfg.cap, 1, 50),
      window: clamp(cfg.window, 1, 90),
      quiet_start: clamp(cfg.quiet_start, 0, 23),
      quiet_end: clamp(cfg.quiet_end, 0, 23),
      sto: !!cfg.sto,
    };
    try {
      if (IS_DEMO) { setCfg(c => ({ ...c, ...body })); setMsg(t('crm.deliverSaved', '저장되었습니다 (데모)')); }
      else {
        const r = await crmApi.saveCommsFreq(body);
        if (r?.config) setCfg(c => ({ ...c, ...r.config }));
        setMsg(t('crm.deliverSaved', '저장되었습니다'));
      }
    } catch (e) { setMsg(t('crm.deliverSaveErr', '저장 실패: 권한 또는 네트워크를 확인하세요')); }
    finally { setSaving(false); }
  };

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", marginBottom: 16 };
  const labelSt = { fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 };
  const descSt = { fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 };
  const inputSt = { width: 110, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 13, fontWeight: 600 };

  if (loading) return <div style={{ padding: 24, color: C.muted, fontSize: 13 }}>{t('crm.loading', '불러오는 중...')}</div>;

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
        {t('crm.deliverIntro', '과발송을 차단해 스팸 신고·차단·발신자 평판 하락을 예방합니다. 이메일·카카오·SMS 발송에 공통 적용됩니다(경쟁사 Braze/Klaviyo 동급 제어).')}
      </div>

      {/* 빈도 상한(Frequency Capping) */}
      <div style={card}>
        <div style={labelSt}>📊 {t('crm.deliverFreqTitle', '발송 빈도 상한 (Frequency Capping)')}</div>
        <div style={descSt}>{t('crm.deliverFreqDesc', '지정한 기간 동안 한 고객에게 보낼 수 있는 최대 메시지 수입니다. 초과 시 자동 발송이 차단됩니다.')}</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverCap', '최대 발송 건수 (1~50)')}</div>
            <input type="number" min={1} max={50} value={cfg.cap} onChange={e => set('cap', e.target.value)} style={inputSt} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverWindow', '기간 (일, 1~90)')}</div>
            <input type="number" min={1} max={90} value={cfg.window} onChange={e => set('window', e.target.value)} style={inputSt} />
          </div>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, paddingBottom: 8 }}>
            {t('crm.deliverFreqSummary', '{cap}건 / {window}일', { cap: clamp(cfg.cap, 1, 50), window: clamp(cfg.window, 1, 90) })}
          </div>
        </div>
      </div>

      {/* 발송시간 최적화(STO) — 야간 차단 */}
      <div style={card}>
        <div style={labelSt}>🌙 {t('crm.deliverStoTitle', '발송시간 최적화 (STO) — 야간 차단')}</div>
        <div style={descSt}>{t('crm.deliverStoDesc', '활성화 시 지정한 야간 시간대(한국시간 기준)에는 메시지 발송이 차단됩니다. 수신자 경험과 도달률을 보호합니다.')}</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.text }}>
          <input type="checkbox" checked={!!cfg.sto} onChange={e => set('sto', e.target.checked)} style={{ width: 16, height: 16 }} />
          {t('crm.deliverStoEnable', '야간 발송 차단 사용')}
        </label>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", opacity: cfg.sto ? 1 : 0.45 }}>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverQuietStart', '차단 시작 (시, 0~23)')}</div>
            <input type="number" min={0} max={23} value={cfg.quiet_start} onChange={e => set('quiet_start', e.target.value)} disabled={!cfg.sto} style={inputSt} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>{t('crm.deliverQuietEnd', '차단 종료 (시, 0~23)')}</div>
            <input type="number" min={0} max={23} value={cfg.quiet_end} onChange={e => set('quiet_end', e.target.value)} disabled={!cfg.sto} style={inputSt} />
          </div>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 600, paddingBottom: 8 }}>
            {t('crm.deliverQuietSummary', '{start}시 ~ {end}시 차단', { start: clamp(cfg.quiet_start, 0, 23), end: clamp(cfg.quiet_end, 0, 23) })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onSave} disabled={saving} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 13, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? t('crm.saving', '저장 중...') : t('crm.deliverSave', '설정 저장')}
        </button>
        {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: C.green }}>{msg}</span>}
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
              {[t('crm.fName'), t('crm.colEmail'), "LTV", t('crm.colCnt'), t('crm.colLast'), t('crm.colGrade'), t('crm.colChurn', '이탈확률'), t('crm.colPredClv', '예측 CLV')].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.muted, fontWeight: 600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {derivedCustomers.slice(0, 50).map((c, i) => {
                const g = getRfmGrade(t)[c.grade] || getRfmGrade(t).normal;
                // [240차 약점③] 이탈확률·예측CLV — 운영=백엔드 churn_prob/predicted_clv(단일소스). 데모=표시용 근사(recency/freq 기반, 샌드박스 전용).
                const { churn, clv } = predRowScore(c);
                const churnColor = churn >= 0.6 ? '#ef4444' : churn >= 0.35 ? '#f59e0b' : '#22c55e';
                return (
                  <tr key={c.id || i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? "#f1f5f9" : "transparent" }}>
                    <td style={{ padding: "8px 14px", fontWeight: 600 }}>{c.name || "-"}</td>
                    <td style={{ padding: "8px 14px", color: C.muted }}>{c.email}</td>
                    <td style={{ padding: "8px 14px", color: C.green, fontWeight: 700 }}>{fmt(c.ltv)}</td>
                    <td style={{ padding: "8px 14px" }}>{c.purchase_count || 0} {t('crm.unitTimes')}</td>
                    <td style={{ padding: "8px 14px", color: C.muted, fontSize: 12 }}>{c.last_purchase || "-"}</td>
                    <td style={{ fontSize: 11, fontWeight: 700, background: `${g.color}22`, color: g.color, borderRadius: 6, padding: "3px 8px" }} ><span>{g.label}</span></td>
                    <td style={{ padding: "8px 14px", fontWeight: 700, color: churnColor }}>{churn != null ? Math.round(churn * 100) + '%' : '-'}</td>
                    <td style={{ padding: "8px 14px", color: '#8b5cf6', fontWeight: 700 }}>{clv != null ? fmt(clv) : '-'}</td>
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

/* ── Guide Tab (enterprise 패턴 — 183차 OrderHub/CatalogSync 정본 렌더러, NS=crm) ── */
function GuideTab() {
  const { t } = useI18n();
  const g = (k) => { const v = t('crm.' + k, ''); return (v && !String(v).includes('crm.')) ? v : ''; };
  const COLORS = ['#4f8ef7', '#22c55e', '#f59e0b', '#a855f7', '#6366f1', '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#e11d48', '#06b6d4', '#0ea5e9', '#f97316'];
  const ICONS = ['🔗', '👥', '🏅', '🤖', '🏷️', '📊', '✉️', '🛤️', '📥', '🔄', '📈', '🛡️', '📦', '🔔', '🚀'];
  const steps = [];
  for (let i = 1; i <= 15; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[i - 1], color: COLORS[(i - 1) % COLORS.length], n: i }); }
  const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
  const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
  const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
  const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
  const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* 배너 + 배지 */}
      <div style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.12),rgba(167,139,250,0.08))", borderRadius: 16, border: "1px solid rgba(79,142,247,0.3)", padding: "28px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('crm.guideTitle')}</div>
        <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('crm.guideSub')}</div>
        {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
        </div>}
      </div>
      {/* 이 가이드에서 배우는 내용 */}
      {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
      {/* 이용 대상 */}
      {g('guideAudienceTitle') ? <div style={card}><div style={secTitle}>👥 {g('guideAudienceTitle')}</div><div style={pre}>{g('guideAudienceDesc')}</div></div> : null}
      {/* 어디서 시작 */}
      {g('guideWhereToStart') ? <div style={card}><div style={secTitle}>🧭 {g('guideWhereToStart')}</div><div style={pre}>{g('guideWhereToStartDesc')}</div></div> : null}
      {/* 단계별 운영 가이드 */}
      {steps.length > 0 && <div style={card}>
        {g('guideStepsTitle') ? <div style={secTitle}>{g('guideStepsTitle')}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
              <div>
                {s.phase ? <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>}
      {/* 전문가 팁 */}
      {tips.length > 0 && (
        <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.25)" }}>
          <div style={secTitle}>💡 {t('crm.guideTipsTitle')}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#ffffff", border: "1px solid rgba(34,197,94,0.12)" }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, WebkitTextFillColor: '#374151' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* FAQ */}
      {faqs.length > 0 && (
        <div style={card}>
          <div style={secTitle}>❓ {g('guideFaqTitle') || t('crm.guideFaqTitle', '자주 묻는 질문')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faqs.map((f, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'rgba(241,245,249,0.6)', borderRadius: 10, border: '1px solid #eef2f7' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#4f8ef7', marginBottom: 5, WebkitTextFillColor: '#4f8ef7' }}>Q. {f.q}</div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>A. {f.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 보안 및 권한 */}
      {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }}><div style={secTitle}>🛡️ {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
      {/* 운영 권장 사항 */}
      {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🗓️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
      {/* 완료 CTA */}
      {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🎉</div>
        <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6, color: '#1e293b', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyTitle')}</div>
        <div style={{ fontSize: 13, color: '#374151', maxWidth: 640, margin: '8px auto 0', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>{g('guideReadyDesc')}</div>
      </div> : null}
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
      bcRef.current = new BroadcastChannel(tChannelName('geniego_crm'));
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

  /* ── 191차 4단계: 운영=백엔드(/api/crm/*) 실배선, 데모=주문이력 파생+로컬 유지 ── */
  const [opCustomers, setOpCustomers] = useState([]);
  const [opSegments, setOpSegments] = useState([]);
  const [opRfm, setOpRfm] = useState([]);
  const [opPanelActs, setOpPanelActs] = useState([]);
  const mapCust = (r) => ({ id: r.id, name: r.name || '', email: r.email || '', phone: r.phone || '-', grade: r.grade || 'normal', ltv: Number(r.ltv || 0), purchase_count: Number(r.purchase_count || 0), last_purchase: (r.last_purchase || '').slice(0, 10), tags: Array.isArray(r.tags) ? r.tags : [] });
  const reloadOpCustomers = useCallback(() => { crmApi.listCustomers().then(r => setOpCustomers((r.customers || []).map(mapCust))).catch(() => {}); }, []);
  const reloadOpSegments = useCallback(() => { crmApi.listSegments().then(r => setOpSegments((r.segments || []).map(s => ({ ...s, count: Number(s.member_count || 0) })))).catch(() => {}); }, []);
  const reloadOpRfm = useCallback(() => { crmApi.rfm().then(r => setOpRfm((r.customers || []).map(c => ({ id: c.id, name: c.name || '', email: c.email || '', phone: '-', grade: c.rfm_grade || 'normal', ltv: Number(c.monetary || 0), purchase_count: Number(c.frequency || 0), last_purchase: (c.last_purchase || '').slice(0, 10), churn_prob: c.churn_prob, predicted_clv: c.predicted_clv, tags: [] })))).catch(() => {}); }, []); // [240차 약점③] 예측형 CDP: 백엔드 churn_prob/predicted_clv(단일소스) 전달
  useEffect(() => { if (IS_DEMO) return; reloadOpCustomers(); reloadOpSegments(); reloadOpRfm(); }, [reloadOpCustomers, reloadOpSegments, reloadOpRfm]);

  const customers = useMemo(() => (
    IS_DEMO ? [...derivedCustomers, ...manualCustomers].sort((a, b) => b.ltv - a.ltv) : [...opCustomers].sort((a, b) => b.ltv - a.ltv)
  ), [derivedCustomers, manualCustomers, opCustomers]);
  const segments = IS_DEMO ? crmSegments : opSegments;
  const rfmList = IS_DEMO ? customers : opRfm;

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

  const saveCustomer = async () => {
    const tags = form.tags ? form.tags.split(",").map(tx => tx.trim()).filter(Boolean) : [];
    if (IS_DEMO) {
      setManualCustomers(prev => [{ ...form, id: form.email, ltv: 0, purchase_count: 0, tags }, ...prev]);
    } else {
      try { await crmApi.createCustomer({ email: form.email, name: form.name, phone: form.phone, grade: form.grade, tags }); reloadOpCustomers(); }
      catch (e) { addAlert?.({ type: 'error', msg: '고객 등록 실패: ' + (e?.message || '') }); return; }
    }
    setShowForm(false); setForm({ email: "", name: "", phone: "", grade: "normal", tags: "" });
    broadcastRefresh();
  };

  const deleteCustomer = async (id) => {
    if (IS_DEMO) { setManualCustomers(prev => prev.filter(c => c.id !== id)); }
    else { try { await crmApi.deleteCustomer(id); reloadOpCustomers(); reloadOpRfm(); } catch (e) { addAlert?.({ type: 'error', msg: '삭제 실패: ' + (e?.message || '') }); return; } }
    setSelectedCustomer(null);
    broadcastRefresh();
  };

  // 운영: 고객 선택 시 360°(getCustomer) 활동을 패널용으로 매핑(데모는 주문이력 사용)
  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    if (!IS_DEMO && c?.id != null) {
      setOpPanelActs([]);
      crmApi.getCustomer(c.id).then(r => {
        setOpPanelActs((r.activities || []).filter(a => a.type === 'purchase' || a.amount).map(a => ({ ch: a.channel || 'Web', total: Number(a.amount || 0), at: (a.created_at || '').slice(0, 16) })));
      }).catch(() => {});
    }
  };

  // 세그먼트 저장/삭제(데모=로컬, 운영=백엔드)
  const onSaveSegment = async (segForm) => {
    if (IS_DEMO) { setCrmSegments(prev => [...prev, { id: "seg_" + Date.now(), ...segForm, count: 0 }]); }
    else { try { await crmApi.createSegment(segForm); reloadOpSegments(); } catch (e) { addAlert?.({ type: 'error', msg: '세그먼트 생성 실패: ' + (e?.message || '') }); } }
  };
  const onDeleteSegment = async (id) => {
    if (IS_DEMO) { setCrmSegments(prev => prev.filter(s => s.id !== id)); }
    else { try { await crmApi.deleteSegment(id); reloadOpSegments(); } catch (e) { addAlert?.({ type: 'error', msg: '세그먼트 삭제 실패: ' + (e?.message || '') }); } }
  };
  // [240차 동기화] 세그먼트 멤버십 재계산 — member_count/멤버십은 생성·시드 시점 스냅샷이라 신규 구매 누적 시 stale.
  //   백엔드 refreshSegment(POST /crm/segments/{id}/refresh)가 존재했으나 프론트 호출처가 없어(고아) 사용자가
  //   재동기화할 수단이 없었다. 카드별 새로고침으로 멤버십·카운트를 실데이터 기준 재계산(캠페인 발송 대상 정합).
  const onRefreshSegment = async (id) => {
    if (IS_DEMO) { addAlert?.({ type: 'info', msg: '데모에서는 멤버십이 시뮬레이션됩니다.' }); return; }
    try { const r = await crmApi.refreshSegment(id); reloadOpSegments(); addAlert?.({ type: 'success', msg: `세그먼트 멤버십 재계산 완료 (${r?.member_count ?? '-'}명)` }); }
    catch (e) { addAlert?.({ type: 'error', msg: '세그먼트 새로고침 실패: ' + (e?.message || '') }); }
  };
  // [239차+ CDP] 표준 행동 세그먼트 원클릭 생성(VIP/충성/신규/이탈위험/휴면). 실 구매 데이터로 자동 멤버십.
  const onSmartSeed = async () => {
    try {
      const d = await crmApi.smartSeedSegments();
      if (IS_DEMO) reloadOpSegments?.(); else reloadOpSegments();
      addAlert?.({ type: 'success', msg: `스마트 세그먼트 ${(d?.created || []).length}개 생성 (이미 있으면 건너뜀)` });
    } catch (e) { addAlert?.({ type: 'error', msg: '스마트 세그먼트 생성 실패: ' + (e?.message || '') }); }
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
    { id: "deliverability", label: t('crm.tabDeliver', '딜리버러빌리티') },
    { id: "guide", label: t('crm.tabGuide') },
  ];

  // [237차] CRM 위저드 필수등록 게이팅 — 실제 상태 검증(미완 시 차단). null=시스템 자동확인.
  const crmChecks = useMemo(() => {
    const cnt = async (ep, keys) => { try { const r = await _gjaCrm(ep); for (const k of keys) { if (Array.isArray(r?.[k])) return r[k].length > 0; } return Array.isArray(r) ? r.length > 0 : false; } catch { return false; } };
    return [
      null,                                                                  // 0 로그인
      async () => cnt('/api/crm/customers', ['customers', 'items', 'rows', 'data']), // 1 ★고객 1명 이상 등록 필수
      async () => cnt('/api/crm/segments', ['segments', 'items', 'rows']),          // 2 ★세그먼트 1개 이상 필수
      null,                                                                  // 3 캠페인 메시지(자동)
      null,                                                                  // 4 발송·자동화(자동)
      null,                                                                  // 5 성과 분석(자동)
    ];
  }, []);

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
      <div className="page-hero" style={{ borderRadius: 16, background: '#f1f5f9', border: `1px solid ${C.border}`, padding: "13px 24px", marginBottom: 14 }}>
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
        <StatCard icon="🏷" label={t('crm.statSeg')} value={segments.length} color={C.yellow} />
      </div>

      {/* [현 차수] 특정상품 조회 — 전역 동기화. 선택 시 그 상품 매출·구매자·채널/국가별 인라인. */}
      <ProductSelectBar />
      <ProductMarketingPanel period="monthly" />

      {/* Tabs — [240차] page-subtabs: 스크롤 시 상단 고정(sticky), 아래 콘텐츠 스크롤 */}
      <div className="page-subtabs" style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(tOption => (
          <button key={tOption.id} onClick={() => setTab(tOption.id)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === tOption.id ? C.accent : C.card, color: tab === tOption.id ? "#fff" : C.muted, fontWeight: 700, fontSize: 13 }}>{tOption.label}</button>
        ))}
        {tab === "customers" && (
          <>
            <button onClick={handleExportCsv} style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>📥 {t('crm.exportCsv')}</button>
            <button onClick={() => setShowForm(f => !f)} data-onboard-cta="crm-customer" data-onboard-hint={t('crm.onboardHint', '여기서 첫 고객을 추가하세요')} style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 10, border: "none", background: C.green, color: '#ffffff', fontWeight: 700, cursor: "pointer", fontSize: 13 }}>+ {t('crm.btnRegister')}</button>
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
                {[t('crm.fName'), t('crm.colEmail'), t('crm.colPhone'), t('crm.colGrade'), t('crm.colLtv', 'LTV'), t('crm.colCnt'), t('crm.colLast'), ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pageCustomers.map((c, i) => {
                  const g = getRfmGrade(t)[c.grade] || getRfmGrade(t).normal;
                  return (
                    <tr key={c.id} onClick={() => selectCustomer(c)} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: i % 2 ? "#f1f5f9" : "transparent", transition: "background 0.15s" }}
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

      {tab === "segments" && <SegmentsTab segments={segments} onSave={onSaveSegment} onDelete={onDeleteSegment} onSmartSeed={onSmartSeed} onRefresh={onRefreshSegment} />}
      {tab === "rfm" && <RFMTab derivedCustomers={rfmList} />}
      {tab === "deliverability" && <DeliverabilityTab t={t} />}
      {tab === "ai_segments" && <AISegmentsTab navigate={navigate} derivedCustomers={customers} />}
      {tab === "guide" && (
        <>
          <div style={{ background: "var(--card-bg,#fff)", border: "1px solid var(--border,#e2e8f0)", borderRadius: 16, padding: "20px 22px", marginBottom: 16 }}>
            <GuideWizard guideKey="crm" checks={crmChecks} />
          </div>
          <GuideTab />
        </>
      )}

      <CustomerPanel
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        crmCustomerHistory={IS_DEMO ? crmCustomerHistory : (selectedCustomer ? { [selectedCustomer.id]: opPanelActs } : {})}
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
