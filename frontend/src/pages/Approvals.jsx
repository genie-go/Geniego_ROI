import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ─── Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const ch = [];
        try { const k = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]'); if (Array.isArray(k)) k.forEach(x => { if (x.service) ch.push(x.service.toLowerCase()); }); } catch {}
        ['meta','google','tiktok','kakao_moment','naver','coupang','amazon','shopify','gmarket','11st','line','whatsapp'].forEach(c => {
            try { if (localStorage.getItem(`geniego_channel_${c}`)) ch.push(c); } catch {}
        });
        return [...new Set(ch)];
    }, []);
}

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
        try { addAlert?.({ type: 'error', msg: '[Approvals] Brute-force blocked' }); } catch (_) {}
        e.target.value = ''; e.preventDefault(); return;
      }
      for (const p of THREAT_PATTERNS) {
        if (p.re.test(val)) {
          setLocked(p.type + ': ' + val.slice(0, 60));
          try { addAlert?.({ type: 'error', msg: '[Approvals] ' + p.type + ' blocked' }); } catch (_) {}
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
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('approvalsPage.secTitle', 'Security Threat Detected')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.7 }}>{t('approvalsPage.secDesc', 'Suspicious activity detected.')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === 'GENIE-UNLOCK-2026' && onUnlock()}
          placeholder={t('approvalsPage.secCode', 'Enter unlock code')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: '#fff', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === 'GENIE-UNLOCK-2026' && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>
          {t('approvalsPage.secUnlock', 'Unlock')}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Shared UI
   ═══════════════════════════════════════════════════ */
const Kpi = ({ icon, label, value, color }) => (
  <div className="card card-glass" style={{ padding: '14px 16px', borderLeft: '3px solid ' + color }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{icon} {label}</div>
    <div style={{ fontWeight: 900, fontSize: 22, color, marginTop: 4 }}>{value}</div>
  </div>
);
const Tag = ({ label, color = '#4f8ef7' }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: color + '1a', color, border: '1px solid ' + color + '33' }}>{label}</span>
);

/* ═══════════════════════════════════════════════════
   Live Data Sync Status Panel
   ═══════════════════════════════════════════════════ */
function SyncStatusPanel({ t }) {
  const { inventory, orders, channelBudgets, activeRules } = useGlobalData();
  const items = [
    { key: 'inv', label: t('approvalsPage.syncInventory', 'Inventory'), count: (inventory || []).length, color: '#22c55e' },
    { key: 'ord', label: t('approvalsPage.syncOrders', 'Orders'), count: (orders || []).length, color: '#f97316' },
    { key: 'bud', label: t('approvalsPage.syncBudgets', 'Budgets'), count: Object.keys(channelBudgets || {}).length, color: '#eab308' },
    { key: 'rul', label: t('approvalsPage.syncRules', 'AI Rules'), count: (activeRules || []).length, color: '#6366f1' },
  ];
  return (
    <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(99,140,255,0.04)', border: '1px solid rgba(99,140,255,0.1)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{t('approvalsPage.liveSyncStatus', 'Live Data Sync Status')}</div>
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
   STATUS CONFIG
   ═══════════════════════════════════════════════════ */
const STATUS_CFG = {
  pending:  { color: '#eab308', icon: '⏳' },
  approved: { color: '#4f8ef7', icon: '✓' },
  executed: { color: '#22c55e', icon: '⚡' },
  rejected: { color: '#ef4444', icon: '✕' },
};

const ACTION_ICONS = {
  pause_campaign: '⏸', budget_cut: '📉', price_change: '💡',
  notify_slack: '🔔', budget_increase: '📈', policy_update: '🛡️',
  rule_change: '🤖', inventory_adjust: '📦',
};

/* ═══════════════════════════════════════════════════
   TAB 1: Approval Queue
   ═══════════════════════════════════════════════════ */
function QueueTab({ requests, onDecide, onExecute, busy, msg, isDemo, t }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const filtered = useMemo(() =>
    filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus)
  , [requests, filterStatus]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, executed: 0, rejected: 0 };
    requests.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [requests]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <Kpi icon="⏳" label={t('approvalsPage.statusPending', 'Pending')} value={counts.pending} color="#eab308" />
        <Kpi icon="✓" label={t('approvalsPage.statusApproved', 'Approved')} value={counts.approved} color="#4f8ef7" />
        <Kpi icon="⚡" label={t('approvalsPage.statusExecuted', 'Executed')} value={counts.executed} color="#22c55e" />
        <Kpi icon="✕" label={t('approvalsPage.statusRejected', 'Rejected')} value={counts.rejected} color="#ef4444" />
      </div>

      {/* Sync */}
      <SyncStatusPanel t={t} />

      {/* Header + Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{t('approvalsPage.requestList', '📋 Approval Queue')}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {msg && <span style={{ fontSize: 11, color: '#22c55e', alignSelf: 'center' }}>{msg}</span>}
          {['all', 'pending', 'approved', 'executed', 'rejected'].map(s => {
            const active = filterStatus === s;
            const label = s === 'all' ? t('approvalsPage.filterAll', 'All') : t('approvalsPage.status' + s.charAt(0).toUpperCase() + s.slice(1));
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: active ? 'rgba(34,197,94,0.15)' : 'rgba(99,140,255,0.06)', color: active ? '#22c55e' : 'var(--text-2)', transition: 'all 150ms' }}>{label}</button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('approvalsPage.noRequests', 'No Approval Requests')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('approvalsPage.noRequestsDesc', 'Approval requests from AI Rule Engine and AI Policy will appear here in real-time.')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map(r => {
            const sc = STATUS_CFG[r.status] || STATUS_CFG.pending;
            return (
              <div key={r.id} className="card card-glass" style={{ padding: '14px 18px', borderLeft: '3px solid ' + sc.color }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{ACTION_ICONS[r.action_type] || '⚙'}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name || (r.action_type || '').replace(/_/g, ' ').toUpperCase()}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                        {r.origin && <span>{r.origin} · </span>}
                        {r.condition && <span style={{ color: '#a855f7', fontFamily: 'monospace' }}>{r.condition} · </span>}
                        {r.createdAt && new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {r.priority && <Tag label={r.priority} color={r.priority === 'HIGH' ? '#ef4444' : r.priority === 'LOW' ? '#22c55e' : '#eab308'} />}
                    <Tag label={t('approvalsPage.status' + r.status.charAt(0).toUpperCase() + r.status.slice(1))} color={sc.color} />
                  </div>
                </div>
                {r.details && <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>{r.details}</div>}
                {r.status === 'pending' && !isDemo && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => onDecide(r.id, 'approve')} disabled={busy} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>
                      ✓ {t('approvalsPage.btnApprove', 'Approve')}
                    </button>
                    <button onClick={() => onDecide(r.id, 'reject')} disabled={busy} style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: 'transparent', color: '#ef4444' }}>
                      ✕ {t('approvalsPage.btnReject', 'Reject')}
                    </button>
                  </div>
                )}
                {r.status === 'approved' && !isDemo && (
                  <button onClick={() => onExecute(r.id)} disabled={busy} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: 'linear-gradient(135deg,#22c55e,#14d9b0)', color: '#fff' }}>
                    ⚡ {t('approvalsPage.btnExecute', 'Execute')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 2: Audit History — from GlobalDataContext
   ═══════════════════════════════════════════════════ */
function AuditTab({ t }) {
  const { rulesFired, alerts } = useGlobalData();

  const auditEvents = useMemo(() => {
    const approvalAlerts = (alerts || []).filter(a => a.msg?.includes('Approv') || a.msg?.includes('승인') || a.msg?.includes('approval'));
    const firedLogs = (rulesFired || []).filter(f => f.result === 'approved' || f.result === 'rejected' || f.result === 'executed');
    return [...approvalAlerts.map(a => ({ ...a, _type: 'alert', _time: a.time || '', _label: a.msg || '' })),
            ...firedLogs.map(f => ({ ...f, _type: 'rule', _time: f.firedAt || '', _label: f.ruleName || f.action || '' }))]
      .sort((a, b) => (b._time || '').localeCompare(a._time || ''))
      .slice(0, 100);
  }, [alerts, rulesFired]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <Kpi icon="📊" label={t('approvalsPage.totalAudit', 'Audit Count')} value={auditEvents.length} color="#4f8ef7" />
        <Kpi icon="✓" label={t('approvalsPage.auditApproved', 'Approved')} value={auditEvents.filter(e => e._label?.includes('approve') || e._label?.includes('승인')).length} color="#22c55e" />
        <Kpi icon="🛡️" label={t('approvalsPage.auditSecurity', 'Security')} value={auditEvents.filter(e => e.type === 'error').length} color="#ef4444" />
      </div>

      {auditEvents.length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📜</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('approvalsPage.noAudit', 'No Audit Logs')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('approvalsPage.noAuditDesc', 'Approval decisions and execution logs will appear here in real-time.')}</div>
        </div>
      ) : (
        <div className="card card-glass" style={{ padding: 0, overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
          {auditEvents.map((item, i) => (
            <div key={item.id || i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(99,140,255,0.06)', alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: item._type === 'alert' ? '#4f8ef7' : '#22c55e', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>{item._label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{item._time}</div>
              </div>
              <Tag label={item._type === 'alert' ? 'ALERT' : (item.result || 'LOG').toUpperCase()} color={item.type === 'error' ? '#ef4444' : '#4f8ef7'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 3: Settings
   ═══════════════════════════════════════════════════ */
function SettingsTab({ t }) {
  const { addAlert } = useGlobalData();
  const [cfg, setCfg] = useState(() => {
    try { const s = localStorage.getItem('genie_approval_cfg'); if (s) return JSON.parse(s); } catch (_) {}
    return { auto_approve_low: true, require_2fa: false, slack_notify: true, email_notify: true, execution_delay: false, audit_log: true };
  });

  const toggle = (id) => {
    setCfg(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('genie_approval_cfg', JSON.stringify(updated)); } catch (_) {}
      addAlert?.({ type: 'info', msg: t('approvalsPage.cfgChanged', 'Setting changed') + ': ' + id });
      return updated;
    });
  };

  const configs = [
    { id: 'auto_approve_low', label: t('approvalsPage.cfgAutoApprove', 'Auto-Approve Low Priority'), desc: t('approvalsPage.cfgAutoApproveDesc', 'Automatically approve low-priority requests'), icon: '🟢' },
    { id: 'require_2fa', label: t('approvalsPage.cfgRequire2fa', '2FA Verification'), desc: t('approvalsPage.cfgRequire2faDesc', 'Require two-factor auth for approvals'), icon: '🔐' },
    { id: 'slack_notify', label: t('approvalsPage.cfgSlackNotify', 'Slack Notifications'), desc: t('approvalsPage.cfgSlackNotifyDesc', 'Send approval alerts to Slack'), icon: '💬' },
    { id: 'email_notify', label: t('approvalsPage.cfgEmailNotify', 'Email Notifications'), desc: t('approvalsPage.cfgEmailNotifyDesc', 'Send email on pending approvals'), icon: '📧' },
    { id: 'execution_delay', label: t('approvalsPage.cfgExecDelay', 'Execution Delay'), desc: t('approvalsPage.cfgExecDelayDesc', 'Add 5-min delay before executing actions'), icon: '⏱️' },
    { id: 'audit_log', label: t('approvalsPage.cfgAuditLog', 'Audit Logging'), desc: t('approvalsPage.cfgAuditLogDesc', 'Log all approval decisions for compliance'), icon: '📋' },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('approvalsPage.settingsTitle', '⚙ Approval Settings')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {configs.map(c => {
          const on = cfg[c.id];
          return (
            <div key={c.id} className="card card-glass" style={{ padding: '16px 18px', borderLeft: '3px solid ' + (on ? '#22c55e' : '#666'), cursor: 'pointer', transition: 'all 200ms' }}
              onClick={() => toggle(c.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700, flexShrink: 0, background: on ? 'rgba(34,197,94,0.15)' : 'rgba(102,102,102,0.15)', color: on ? '#22c55e' : '#666' }}>{on ? t('approvalsPage.enabled', 'Enabled') : t('approvalsPage.disabled', 'Disabled')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 4: Usage Guide
   ═══════════════════════════════════════════════════ */
function GuideTab() {
    const { t } = useI18n();
    const CARD = { borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' };
    const steps = [
        { icon: '1️⃣', title: t('approvalsPage.guideStep1Title'), desc: t('approvalsPage.guideStep1Desc'), color: '#4f8ef7' },
        { icon: '2️⃣', title: t('approvalsPage.guideStep2Title'), desc: t('approvalsPage.guideStep2Desc'), color: '#22c55e' },
        { icon: '3️⃣', title: t('approvalsPage.guideStep3Title'), desc: t('approvalsPage.guideStep3Desc'), color: '#eab308' },
        { icon: '4️⃣', title: t('approvalsPage.guideStep4Title'), desc: t('approvalsPage.guideStep4Desc'), color: '#a855f7' },
        { icon: '5️⃣', title: t('approvalsPage.guideStep5Title'), desc: t('approvalsPage.guideStep5Desc'), color: '#f97316' },
        { icon: '6️⃣', title: t('approvalsPage.guideStep6Title'), desc: t('approvalsPage.guideStep6Desc'), color: '#06b6d4' },
    ];
    const sections = [
        { icon: '✅', name: t('approvalsPage.tabQueue'), desc: t('approvalsPage.guideSecQueue') },
        { icon: '📜', name: t('approvalsPage.tabAudit'), desc: t('approvalsPage.guideSecAudit') },
        { icon: '⚙', name: t('approvalsPage.tabSettings'), desc: t('approvalsPage.guideSecSettings') },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', borderColor: '#22c55e40', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('approvalsPage.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 520, margin: '6px auto 0' }}>{t('approvalsPage.guideSub')}</div>
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('approvalsPage.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ background: s.color + '08', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '25'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('approvalsPage.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {sections.map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div><div style={{ fontWeight: 700, fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }} >{n.name}</div><div>{n.desc}</div></div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ ...CARD, background: 'rgba(34,197,94,0.04)', borderColor: '#22c55e30' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('approvalsPage.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
                    <li>{t('approvalsPage.guideTip1')}</li><li>{t('approvalsPage.guideTip2')}</li><li>{t('approvalsPage.guideTip3')}</li><li>{t('approvalsPage.guideTip4')}</li><li>{t('approvalsPage.guideTip5')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN — Enterprise Superium v6.0
   ═══════════════════════════════════════════════════ */
export default function Approvals() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const { isDemo } = useAuth();
  const { addAlert, alerts, activeRules, rulesFired } = useGlobalData();
  const [tab, setTab] = useState('queue');
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const bcRef = useRef(null);
  const connectedChannels = useConnectedChannels();
  const { connectedCount = 0 } = useConnectorSync?.() || {};
  const [syncTick, setSyncTick] = useState(0);
  const { locked, setLocked } = useSecurityGuard(addAlert);

  // Sync: derive approval requests from activeRules that need approval
  useEffect(() => {
    const approvalItems = (activeRules || [])
      .filter(r => r.origin === 'AIPolicy' || r.action?.toLowerCase().includes('policy') || r.type === 'policy')
      .map(r => ({
        id: r.id,
        name: r.name,
        action_type: r.action?.includes('Policy') ? 'policy_update' : 'rule_change',
        status: r.approvalStatus || 'pending',
        priority: r.priority || 'MEDIUM',
        origin: r.origin || 'System',
        condition: r.condition,
        details: r.action,
        createdAt: r.createdAt,
      }));
    if (approvalItems.length > 0) setRequests(approvalItems);
  }, [activeRules]);

  // BroadcastChannel 3-ch + 30s polling
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch1 = new BroadcastChannel('genie_approval_sync');
    const ch2 = new BroadcastChannel('genie_connector_sync');
    const ch3 = new BroadcastChannel('genie_product_sync');
    const handler = () => setSyncTick(p => p + 1);
    ch1.onmessage = (e) => {
      handler();
      if (e.data?.type === 'decision_made') {
        addAlert?.({ type: 'info', msg: t('approvalsPage.crossTabSync') });
      }
    };
    ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED','CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
    ch3.onmessage = handler;
    return () => { ch1.close(); ch2.close(); ch3.close(); };
  }, []);
  useEffect(() => {
    const id = setInterval(() => { setSyncTick(p => p + 1); try { bcRef.current?.postMessage({ type: 'APPROVAL_UPDATE', ts: Date.now() }); } catch {} }, 30000);
    return () => clearInterval(id);
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), requests, auditAlerts: (alerts || []).filter(a => a.msg?.includes('Approv') || a.msg?.includes('승인')) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `approvals_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const decide = (id, decision) => {
    if (isDemo) { setMsg(t('approvalsPage.demoGuard')); return; }
    setBusy(true); setMsg('');
    setRequests(prev => prev.map(row => row.id === id ? { ...row, status: decision === 'approve' ? 'approved' : 'rejected' } : row));
    const statusLabel = decision === 'approve' ? t('approvalsPage.statusApproved') : t('approvalsPage.statusRejected');
    addAlert?.({ type: 'success', msg: `[Approvals] #${id} ${statusLabel}` });
    setMsg(`✓ #${id} ${statusLabel}`);
    try { bcRef.current?.postMessage({ type: 'decision_made', id, decision }); } catch (_) {}
    setBusy(false);
  };

  const execute = (id) => {
    if (isDemo) { setMsg(t('approvalsPage.demoGuard')); return; }
    setBusy(true); setMsg('');
    setRequests(prev => prev.map(row => row.id === id ? { ...row, status: 'executed' } : row));
    addAlert?.({ type: 'success', msg: `[Approvals] #${id} ${t('approvalsPage.executeDone')}` });
    setMsg(`✓ #${id} ${t('approvalsPage.executeDone')}`);
    setBusy(false);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const TABS = [
    { id: 'queue', icon: '✅', label: t('approvalsPage.tabQueue'), desc: t('approvalsPage.tabQueueDesc') },
    { id: 'audit', icon: '📜', label: t('approvalsPage.tabAudit'), desc: t('approvalsPage.tabAuditDesc') },
    { id: 'settings', icon: '⚙', label: t('approvalsPage.tabSettings'), desc: t('approvalsPage.tabSettingsDesc') },
    { id: 'guide', icon: '📖', label: t('approvalsPage.tabGuide'), desc: t('approvalsPage.tabGuideDesc') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />

      <div style={{ flexShrink: 0, padding: '14px 16px 0', background: 'var(--surface-1, #070f1a)', zIndex: 10, borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
        {isDemo && (
          <div style={{ padding: '10px 16px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', border: '1.5px solid rgba(34,197,94,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#22c55e' }}>{t('approvalsPage.demoBanner')}</div>
              <div style={{ fontSize: 10, color: '#22c55e' }} >{t('approvalsPage.demoBannerDesc')} <strong>{t('approvalsPage.demoBannerPaid')}</strong></div>
            </div>
            <button onClick={() => window.location.href='/pricing'} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: '#fff', fontWeight: 700, fontSize: 11 }}>{t('approvalsPage.upgradeBtn')}</button>
          </div>
        )}

        <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.07),rgba(79,142,247,0.05))', borderColor: 'rgba(34,197,94,0.18)', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div className="hero-meta">
              <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.28),rgba(79,142,247,0.18))' }}>✅</div>
              <div>
                <div className="hero-title" style={{ background: 'linear-gradient(135deg,#22c55e,#4f8ef7)' }}>{t('approvalsPage.heroTitle')}</div>
                <div className="hero-desc">{t('approvalsPage.heroDesc')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#22c55e' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} /> {t('approvalsPage.badgeRealtime')}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(20,217,176,0.08)', border: '1px solid rgba(20,217,176,0.15)', color: '#14d9b0' }}>
                🛡️ {t('approvalsPage.badgeSecurity')}
              </div>
              <button onClick={handleExport} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e', cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>📥 {t('approvalsPage.export')}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#eab3081a', color: '#eab308', border: '1px solid #eab30833' }}>{pendingCount} {t('approvalsPage.badgePending')}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#4f8ef71a', color: '#4f8ef7', border: '1px solid #4f8ef733' }}>{requests.length} {t('approvalsPage.badgeTotal')}</span>
            {connectedChannels.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#a855f718', color: '#a855f7', border: '1px solid #a855f733' }}>🔗 {connectedChannels.length} {t('approvalsPage.channelsLinked')}</span>}
            {isDemo && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#c084fc1a', color: '#c084fc', border: '1px solid #c084fc33' }}>{t('approvalsPage.badgeDemoMode')}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', padding: '4px 4px 0', borderRadius: '12px 12px 0 0', border: '1px solid rgba(99,140,255,0.06)', borderBottom: 'none' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', textAlign: 'center', borderRadius: '8px 8px 0 0',
              background: tab === tb.id ? 'rgba(34,197,94,0.08)' : 'transparent',
              borderBottom: `2px solid ${tab === tb.id ? '#22c55e' : 'transparent'}`, transition: 'all 200ms' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.icon} {tb.label}</div>
              <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 2 }}>{tb.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
        {tab === 'queue' && <QueueTab requests={requests} onDecide={decide} onExecute={execute} busy={busy} msg={msg} isDemo={isDemo} t={t} />}
        {tab === 'audit' && <AuditTab t={t} />}
        {tab === 'settings' && <SettingsTab t={t} />}
        {tab === 'guide' && <GuideTab />}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
    </div>
  );
}

