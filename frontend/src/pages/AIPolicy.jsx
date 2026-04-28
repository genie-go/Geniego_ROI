import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

/* ═══════════════════════════════════════════════════
   SECURITY — Enterprise Superium v5.0
   14 Threat Patterns + Brute-Force Detection
   ═══════════════════════════════════════════════════ */
const THREAT_PATTERNS = [
  { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
  { re: /on\w+\s*=/i, type: 'XSS' }, { re: /eval\s*\(/i, type: 'XSS' },
  { re: /document\.(cookie|domain|location)/i, type: 'XSS' },
  { re: /union\s+select/i, type: 'SQL_INJECT' }, { re: /drop\s+table/i, type: 'SQL_INJECT' },
  { re: /;\s*delete\s+from/i, type: 'SQL_INJECT' }, { re: /or\s+1\s*=\s*1/i, type: 'SQL_INJECT' },
  { re: /__proto__/i, type: 'PROTO_POLLUTION' }, { re: /constructor\s*\[/i, type: 'PROTO_POLLUTION' },
  { re: /fetch\s*\(\s*['"]http/i, type: 'DATA_EXFIL' },
  { re: /Function\s*\(/i, type: 'CODE_INJECT' },
  { re: /window\.(open|location)/i, type: 'WINDOW_MANIP' },
];

function useSecurityGuard(addAlert) {
  const [locked, setLocked] = useState(null);
  const inputLog = useRef([]);
  useEffect(() => {
    const onInput = (e) => {
      const val = e.target?.value || '';
      if (val.length < 3) return;
      const now = Date.now();
      inputLog.current.push(now);
      inputLog.current = inputLog.current.filter(t => now - t < 3000);
      if (inputLog.current.length > 20) {
        setLocked('BRUTE_FORCE: Excessive input rate');
        try { addAlert?.({ type: 'error', msg: '[AIPolicy] Brute-force attack blocked' }); } catch (_) {}
        e.target.value = ''; e.preventDefault(); return;
      }
      for (const p of THREAT_PATTERNS) {
        if (p.re.test(val)) {
          setLocked(p.type + ': ' + val.slice(0, 60));
          try { addAlert?.({ type: 'error', msg: '[AIPolicy] ' + p.type + ' threat blocked: ' + val.slice(0, 30) }); } catch (_) {}
          e.target.value = ''; e.preventDefault(); return;
        }
      }
    };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, [addAlert]);
  return { locked, setLocked };
}

function SecurityOverlay({ reason, onUnlock, t }) {
  const [code, setCode] = useState('');
  if (!reason) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,5,20,0.95)', backdropFilter: 'blur(20px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>&#128737;&#65039;</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('aiPolicy.secTitle', 'Security Threat Detected')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.7 }}>{t('aiPolicy.secDesc', 'Suspicious activity detected. Module locked.')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === 'GENIE-UNLOCK-2026' && onUnlock()}
          placeholder={t('aiPolicy.secCode', 'Enter unlock code')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: '#fff', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === 'GENIE-UNLOCK-2026' && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>
          {t('aiPolicy.secUnlock', 'Unlock')}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Shared UI Components
   ═══════════════════════════════════════════════════ */
const Tag = ({ label, color = '#4f8ef7' }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: color + '1a', color, border: '1px solid ' + color + '33' }}>{label}</span>
);
const Kpi = ({ icon, label, value, color }) => (
  <div className="card card-glass" style={{ padding: '14px 16px', borderLeft: '3px solid ' + color }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{icon} {label}</div>
    <div style={{ fontWeight: 900, fontSize: 22, color, marginTop: 4 }}>{value}</div>
  </div>
);

/* ═══════════════════════════════════════════════════
   Live Data Sync Status Panel
   ═══════════════════════════════════════════════════ */
function SyncStatusPanel({ t }) {
  const { inventory, orders, channelBudgets, activeRules } = useGlobalData();
  const items = [
    { key: 'inv', label: t('aiPolicy.syncInventory', 'Inventory'), count: (inventory || []).length, color: '#22c55e' },
    { key: 'ord', label: t('aiPolicy.syncOrders', 'Orders'), count: (orders || []).length, color: '#f97316' },
    { key: 'bud', label: t('aiPolicy.syncBudgets', 'Budgets'), count: Object.keys(channelBudgets || {}).length, color: '#eab308' },
    { key: 'rul', label: t('aiPolicy.syncActiveRules', 'AI Rules'), count: (activeRules || []).length, color: '#6366f1' },
  ];
  return (
    <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(99,140,255,0.04)', border: '1px solid rgba(99,140,255,0.1)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{t('aiPolicy.liveSyncStatus', 'Live Data Sync Status')}</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {items.map(i => (
          <span key={i.key} style={{ fontSize: 11, color: 'var(--text-2)' }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: i.color, marginRight: 4 }} />
            {i.label}: <span style={{ fontWeight: 700, color: i.color }}>{i.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 1: Active Policies — Full CRUD + Sync
   ═══════════════════════════════════════════════════ */
function PoliciesTab({ isDemo }) {
  const { t } = useI18n();
  const { activeRules, addActiveRule, addAlert, rulesFired } = useGlobalData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', dimension: 'campaign', severity: 'medium', metric: '', operator: '>', threshold: '' });

  const policies = useMemo(() => {
    return (activeRules || []).filter(r =>
      r.origin === 'AIPolicy' || r.action?.toLowerCase().includes('policy') || r.type === 'policy'
    );
  }, [activeRules]);

  const firedCount = useMemo(() => {
    return (rulesFired || []).filter(f => f.origin === 'AIPolicy' || f.action?.toLowerCase().includes('policy')).length;
  }, [rulesFired]);

  const handleCreate = () => {
    if (!form.name.trim() || !form.metric.trim()) return;
    addActiveRule?.({
      name: form.name,
      condition: form.metric + ' ' + form.operator + ' ' + form.threshold,
      action: 'Policy: ' + form.severity,
      priority: form.severity === 'high' ? 'HIGH' : form.severity === 'low' ? 'LOW' : 'MEDIUM',
      origin: 'AIPolicy',
      dimension: form.dimension,
      severity: form.severity,
      status: 'active',
      type: 'policy',
      createdAt: new Date().toISOString(),
    });
    addAlert?.({ type: 'success', msg: t('aiPolicy.policyCreated', 'Policy created') + ': ' + form.name });
    setForm({ name: '', dimension: 'campaign', severity: 'medium', metric: '', operator: '>', threshold: '' });
    setShowForm(false);
  };

  const sevColors = { high: '#ef4444', medium: '#eab308', low: '#22c55e' };
  const inputSt = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: '#fff', fontSize: 12, outline: 'none' };
  const labelSt = { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <Kpi icon="📋" label={t('aiPolicy.totalPolicies', 'Total Policies')} value={policies.length} color="#4f8ef7" />
        <Kpi icon="🔴" label={t('aiPolicy.highSev', 'High Severity')} value={policies.filter(p => p.severity === 'high' || p.priority === 'HIGH').length} color="#ef4444" />
        <Kpi icon="🟡" label={t('aiPolicy.medSev', 'Medium')} value={policies.filter(p => p.severity === 'medium' || p.priority === 'MEDIUM').length} color="#eab308" />
        <Kpi icon="⚡" label={t('aiPolicy.firedTotal', 'Fired')} value={firedCount} color="#f97316" />
      </div>

      {/* Sync Status */}
      <SyncStatusPanel t={t} />

      {/* Title + Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{t('aiPolicy.policiesTitle', '🛡️ AI Guardrail Policies')}</div>
        {!isDemo && (
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: showForm ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: showForm ? '#ef4444' : '#fff' }}>{showForm ? '✕ ' + t('aiPolicy.cancel', 'Cancel') : '+ ' + t('aiPolicy.addPolicy', 'Add Policy')}</button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card card-glass" style={{ padding: 18, border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={labelSt}>{t('aiPolicy.policyName', 'Policy Name')}</div>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('aiPolicy.policyNamePh', 'e.g. ROAS Floor Policy')} style={inputSt} />
            </div>
            <div>
              <div style={labelSt}>{t('aiPolicy.dimension', 'Dimension')}</div>
              <select value={form.dimension} onChange={e => setForm(p => ({...p, dimension: e.target.value}))} style={inputSt}>
                <option value="campaign">{t('aiPolicy.dimCampaign', 'Campaign')}</option>
                <option value="sku">{t('aiPolicy.dimSku', 'SKU')}</option>
                <option value="creator">{t('aiPolicy.dimCreator', 'Creator')}</option>
                <option value="platform">{t('aiPolicy.dimPlatform', 'Platform')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={labelSt}>{t('aiPolicy.metric', 'Metric')}</div>
              <input value={form.metric} onChange={e => setForm(p => ({...p, metric: e.target.value}))} placeholder="ROAS, CPA, CTR..." style={inputSt} />
            </div>
            <div>
              <div style={labelSt}>{t('aiPolicy.operator', 'Op')}</div>
              <select value={form.operator} onChange={e => setForm(p => ({...p, operator: e.target.value}))} style={inputSt}>
                <option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&gt;=</option><option value="<=">&lt;=</option><option value="==">==</option>
              </select>
            </div>
            <div>
              <div style={labelSt}>{t('aiPolicy.threshold', 'Threshold')}</div>
              <input value={form.threshold} onChange={e => setForm(p => ({...p, threshold: e.target.value}))} placeholder="2.0" style={inputSt} />
            </div>
            <div>
              <div style={labelSt}>{t('aiPolicy.severity', 'Severity')}</div>
              <select value={form.severity} onChange={e => setForm(p => ({...p, severity: e.target.value}))} style={inputSt}>
                <option value="high">{t('aiPolicy.sevHigh', 'High')}</option>
                <option value="medium">{t('aiPolicy.sevMedium', 'Medium')}</option>
                <option value="low">{t('aiPolicy.sevLow', 'Low')}</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
            {t('aiPolicy.savePolicy', 'Save Policy')}
          </button>
        </div>
      )}

      {/* Policy List */}
      {policies.length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('aiPolicy.noPolicies', 'No AI Policies')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('aiPolicy.noPoliciesDesc', 'Create guardrail policies to enforce business rules on AI actions. Syncs with AI Rule Engine in real-time.')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {policies.map(p => (
            <div key={p.id} className="card card-glass" style={{ padding: '14px 18px', borderLeft: '3px solid ' + (sevColors[p.severity] || '#4f8ef7') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {t('aiPolicy.condition', 'Condition')}: <span style={{ color: '#a855f7', fontFamily: 'monospace' }}>{p.condition}</span>
                    {p.createdAt && <span style={{ marginLeft: 10, fontSize: 9, color: 'var(--text-3)' }}>{new Date(p.createdAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {p.dimension && <Tag label={p.dimension} color="#4f8ef7" />}
                  <Tag label={p.severity || 'medium'} color={sevColors[p.severity] || '#eab308'} />
                  <Tag label={p.origin || 'AIPolicy'} color="#a855f7" />
                  <span style={{ padding: '3px 12px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: p.status !== 'paused' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: p.status !== 'paused' ? '#22c55e' : '#ef4444' }}>{p.status !== 'paused' ? t('aiPolicy.active', 'Active') : t('aiPolicy.paused', 'Paused')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 2: Governance & Audit Log
   ═══════════════════════════════════════════════════ */
function GovernanceTab() {
  const { t } = useI18n();
  const { rulesFired, alerts } = useGlobalData();

  const policyEvents = useMemo(() => {
    return (rulesFired || []).filter(f =>
      f.action?.toLowerCase().includes('policy') || f.origin === 'AIPolicy'
    );
  }, [rulesFired]);

  const securityAlerts = useMemo(() => {
    return (alerts || []).filter(a => a.msg?.includes('AIPolicy') || a.msg?.includes('Policy') || a.msg?.includes('threat'));
  }, [alerts]);

  const allEvents = useMemo(() => {
    return [...securityAlerts.map(a => ({ ...a, _type: 'sec', _time: a.time || '', _label: a.msg || '' })),
            ...policyEvents.map(f => ({ ...f, _type: 'pol', _time: f.firedAt || '', _label: f.ruleName || f.action || '' }))]
      .sort((a, b) => (b._time || '').localeCompare(a._time || ''))
      .slice(0, 100);
  }, [securityAlerts, policyEvents]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <Kpi icon="⚡" label={t('aiPolicy.policyFired', 'Policy Events')} value={policyEvents.length} color="#f97316" />
        <Kpi icon="🛡️" label={t('aiPolicy.secEvents', 'Security Events')} value={securityAlerts.length} color="#ef4444" />
        <Kpi icon="📊" label={t('aiPolicy.totalAudit', 'Total Audit Logs')} value={allEvents.length} color="#4f8ef7" />
      </div>

      {allEvents.length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('aiPolicy.noGovernance', 'No Governance Logs')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('aiPolicy.noGovernanceDesc', 'Policy enforcement and security event logs appear here in real-time.')}</div>
        </div>
      ) : (
        <div className="card card-glass" style={{ padding: 0, overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
          {allEvents.map((item, i) => (
            <div key={item.id || i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(99,140,255,0.06)', alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: item._type === 'sec' ? '#ef4444' : '#f97316', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>{item._label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{item._time}</div>
              </div>
              <Tag label={item._type === 'sec' ? (item.type?.toUpperCase() || 'SECURITY') : (item.result || 'POLICY')} color={item._type === 'sec' ? '#ef4444' : '#f97316'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 3: AI Guardrail Configuration
   ═══════════════════════════════════════════════════ */
function ConfigTab() {
  const { t } = useI18n();
  const { addAlert } = useGlobalData();
  const [cfgState, setCfgState] = useState(() => {
    try { const s = localStorage.getItem('genie_ai_policy_cfg'); if (s) return JSON.parse(s); } catch (_) {}
    return { budget_cap: true, roas_floor: true, bid_limit: false, freq_cap: true, creative_filter: false, approval_gate: true };
  });

  const toggleConfig = (id) => {
    setCfgState(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('genie_ai_policy_cfg', JSON.stringify(updated)); } catch (_) {}
      addAlert?.({ type: 'info', msg: t('aiPolicy.cfgToggled', 'Config toggled') + ': ' + id });
      return updated;
    });
  };

  const configs = [
    { id: 'budget_cap', label: t('aiPolicy.cfgBudgetCap', 'Auto Budget Cap'), desc: t('aiPolicy.cfgBudgetDesc', 'Prevent AI from spending above the daily budget limit'), icon: '💰' },
    { id: 'roas_floor', label: t('aiPolicy.cfgRoasFloor', 'ROAS Floor Guard'), desc: t('aiPolicy.cfgRoasDesc', 'Block campaigns with ROAS below the minimum threshold'), icon: '📊' },
    { id: 'bid_limit', label: t('aiPolicy.cfgBidLimit', 'Bid Limit'), desc: t('aiPolicy.cfgBidDesc', 'Maximum CPC/CPM bid the AI is allowed to set'), icon: '🎯' },
    { id: 'freq_cap', label: t('aiPolicy.cfgFreqCap', 'Frequency Cap'), desc: t('aiPolicy.cfgFreqDesc', 'Limit ad impressions per user within a time window'), icon: '🔄' },
    { id: 'creative_filter', label: t('aiPolicy.cfgCreativeFilter', 'Creative Safety'), desc: t('aiPolicy.cfgCreativeDesc', 'Block unapproved or flagged ad creatives from auto-launch'), icon: '🖼️' },
    { id: 'approval_gate', label: t('aiPolicy.cfgApprovalGate', 'Approval Gate'), desc: t('aiPolicy.cfgApprovalDesc', 'Require human approval before AI-initiated changes above a threshold'), icon: '✅' },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('aiPolicy.configTitle', '⚙ AI Guardrail Configuration')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {configs.map(cfg => {
          const enabled = cfgState[cfg.id];
          return (
            <div key={cfg.id} className="card card-glass" style={{ padding: '16px 18px', borderLeft: '3px solid ' + (enabled ? '#22c55e' : '#666'), cursor: 'pointer', transition: 'all 200ms' }}
              onClick={() => toggleConfig(cfg.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{cfg.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{cfg.desc}</div>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700, flexShrink: 0, background: enabled ? 'rgba(34,197,94,0.15)' : 'rgba(102,102,102,0.15)', color: enabled ? '#22c55e' : '#666' }}>{enabled ? t('aiPolicy.enabled', 'Enabled') : t('aiPolicy.disabled', 'Disabled')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN — Enterprise Superium v5.0
   ═══════════════════════════════════════════════════ */
export default function AIPolicy() {
  const { t } = useI18n();
  const [tab, setTab] = useState('policies');
  const { addAlert, alerts, activeRules, rulesFired, inventory, orders, channelBudgets } = useGlobalData();
  const { isDemo } = useAuth();
  const bcRef = useRef(null);
  const { locked, setLocked } = useSecurityGuard(addAlert);

  // BroadcastChannel — cross-tab sync
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('genie_ai_policy_sync');
      bcRef.current.onmessage = (e) => {
        const { type } = e.data || {};
        if (type === 'policy_created') {
          addAlert?.({ type: 'info', msg: t('aiPolicy.crossTabSync', 'Policy synced from another tab') });
        } else if (type === 'config_changed') {
          addAlert?.({ type: 'info', msg: t('aiPolicy.crossTabConfig', 'Config updated from another tab') });
        }
      };
    } catch (_) {}
    return () => { try { bcRef.current?.close(); } catch (_) {} };
  }, []);

  const policyCount = useMemo(() => {
    return (activeRules || []).filter(r => r.origin === 'AIPolicy' || r.action?.toLowerCase().includes('policy') || r.type === 'policy').length;
  }, [activeRules]);

  const TABS = [
    { id: 'policies', icon: '🛡️', label: t('aiPolicy.tabPolicies', 'Policies'), desc: t('aiPolicy.tabPoliciesDesc', 'Guardrail management') },
    { id: 'governance', icon: '📋', label: t('aiPolicy.tabGovernance', 'Governance'), desc: t('aiPolicy.tabGovernanceDesc', 'Audit & event log') },
    { id: 'config', icon: '⚙', label: t('aiPolicy.tabConfig', 'Configuration'), desc: t('aiPolicy.tabConfigDesc', 'AI guardrail settings') },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />

      {/* Demo Banner */}
      {isDemo && (
        <div style={{ padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))', border: '1.5px solid rgba(99,102,241,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#8b5cf6' }}>{t('aiPolicy.demoBanner', '🎭 Demo Mode — AI Policy')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('aiPolicy.demoBannerDesc', 'View-only. Upgrade to manage policies.')}</div>
          </div>
          <button onClick={() => { window.location.href = '/pricing'; }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 12 }}>{t('aiPolicy.upgradeBtn', '💎 Pro Upgrade')}</button>
        </div>
      )}

      {/* Hero */}
      <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.07),rgba(139,92,246,0.05))', borderColor: 'rgba(99,102,241,0.18)' }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.28),rgba(139,92,246,0.18))' }}>🛡️</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)' }}>{t('aiPolicy.heroTitle', 'AI Policy')}</div>
            <div className="hero-desc">{t('aiPolicy.heroDesc', 'AI guardrail policies for automated campaign/budget/bid protection. Syncs with AI Rule Engine in real-time.')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { label: policyCount + ' ' + t('aiPolicy.badgePolicies', 'Policies'), color: '#6366f1' },
            { label: (activeRules || []).length + ' ' + t('aiPolicy.badgeRules', 'Rules Synced'), color: '#4f8ef7' },
            { label: t('aiPolicy.badgeRealtime', 'Real-time Sync'), color: '#22c55e' },
            { label: t('aiPolicy.badgeSecurity', 'Security Active'), color: '#14d9b0' },
          ].map(({ label, color }) => (
            <span key={label} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: color + '1a', color, border: '1px solid ' + color + '33' }}>{label}</span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + TABS.length + ',1fr)' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: '14px 12px', border: 'none', cursor: 'pointer', textAlign: 'left', background: tab === tb.id ? 'rgba(99,102,241,0.09)' : 'transparent', borderBottom: '2px solid ' + (tab === tb.id ? '#6366f1' : 'transparent'), transition: 'all 200ms' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.icon} {tb.label}</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{tb.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
        {tab === 'policies' && <PoliciesTab isDemo={isDemo} />}
        {tab === 'governance' && <GovernanceTab />}
        {tab === 'config' && <ConfigTab />}
      </div>
    </div>
  );
}

