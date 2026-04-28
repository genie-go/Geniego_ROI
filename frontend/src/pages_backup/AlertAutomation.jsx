import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

/* ============================================================
   SECURITY ENGINE
   ============================================================ */
const THREAT_PATTERNS = [
  { re: /<script/i, type: 'XSS', sev: 'critical' },
  { re: /javascript:/i, type: 'XSS', sev: 'critical' },
  { re: /on\w+\s*=/i, type: 'XSS', sev: 'critical' },
  { re: /eval\s*\(/i, type: 'XSS', sev: 'critical' },
  { re: /document\.(cookie|domain)/i, type: 'XSS', sev: 'critical' },
  { re: /window\.(location|open)/i, type: 'XSS', sev: 'high' },
  { re: /union\s+select/i, type: 'SQL_INJECT', sev: 'critical' },
  { re: /drop\s+table/i, type: 'SQL_INJECT', sev: 'critical' },
  { re: /;\s*delete\s+from/i, type: 'SQL_INJECT', sev: 'critical' },
  { re: /'\s*or\s+'1'\s*=\s*'1/i, type: 'SQL_INJECT', sev: 'critical' },
  { re: /__proto__/i, type: 'PROTO_POLLUTION', sev: 'high' },
  { re: /\.constructor\s*\(/i, type: 'PROTO_POLLUTION', sev: 'high' },
  { re: /fetch\s*\(\s*['"]http/i, type: 'DATA_EXFIL', sev: 'high' },
  { re: /import\s*\(/i, type: 'CODE_INJECT', sev: 'high' },
];

function useSecurityGuard(addAlert) {
  const [locked, setLocked] = useState(null);
  const threatLog = useRef([]);
  const rateRef = useRef({ count: 0, ts: Date.now() });

  const report = useCallback((reason, sev) => {
    const entry = { reason, sev, at: new Date().toLocaleString('ko-KR', { hour12: false }) };
    threatLog.current = [entry, ...threatLog.current.slice(0, 99)];
    if (sev === 'critical' && !locked) setLocked(reason);
    try { addAlert?.({ type: 'error', msg: '[AlertAuto] ' + reason }); } catch (_) {}
  }, [locked, addAlert]);

  useEffect(() => {
    const onInput = (e) => {
      const val = e.target?.value || '';
      if (val.length < 3) return;
      for (const p of THREAT_PATTERNS) {
        if (p.re.test(val)) {
          report(p.type + ': ' + val.slice(0, 50), p.sev);
          e.target.value = ''; e.preventDefault(); return;
        }
      }
      const now = Date.now();
      if (now - rateRef.current.ts < 3000) {
        rateRef.current.count++;
        if (rateRef.current.count > 20) {
          report('Brute-force / Bot Activity', 'critical');
          rateRef.current = { count: 0, ts: now };
        }
      } else { rateRef.current = { count: 1, ts: now }; }
    };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, [report]);

  return { locked, setLocked, threatLog: threatLog.current };
}

function SecurityOverlay({ reason, onUnlock, t }) {
  const [code, setCode] = useState('');
  if (!reason) return null;
  const UNLOCK = 'GENIE-UNLOCK-2026';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,5,20,0.95)', backdropFilter: 'blur(20px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>&#128737;&#65039;</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('alertAuto.secTitle', 'Security Threat Detected')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.7 }}>{t('alertAuto.secDesc', 'Hacking attempt detected. Admin unlock required.')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20 }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === UNLOCK && onUnlock()}
          placeholder={t('alertAuto.secCode', 'Enter unlock code')}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: 'var(--text-1)', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === UNLOCK && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'var(--text-1)', fontWeight: 800, fontSize: 13 }}>
          {t('alertAuto.secUnlock', 'Unlock')}
        </button>
        </div>
    </div>
);
}

/* ============================================================
   SHARED UI
   ============================================================ */
const Tag = ({ label, color = '#4f8ef7' }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: color + '1a', color, border: '1px solid ' + color + '33' }}>{label}</span>
);
const Kpi = ({ icon, label, value, color }) => (
  <div className="card card-glass" style={{ padding: '14px 16px', borderLeft: '3px solid ' + color }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{icon} {label}</div>
    <div style={{ fontWeight: 900, fontSize: 22, color, marginTop: 4 }}>{value}</div>
  </div>
);

/* ============================================================
   TAB 1 - RULES (syncs with GlobalData.activeRules + addActiveRule)
   ============================================================ */
function RulesTab({ isDemo }) {
  const { t } = useI18n();
  const { activeRules, addActiveRule, rulesFired, addAlert, inventory, orders, channelBudgets } = useGlobalData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', condition: '', channel: 'Slack', threshold: '', priority: 'MEDIUM' });

  // Merged rules: GlobalData activeRules that are alert-type
  const alertRules = useMemo(() => {
    return (activeRules || []).filter(r =>
      r.action?.toLowerCase().includes('alert') ||
      r.action?.toLowerCase().includes('notify') ||
      r.action?.toLowerCase().includes('slack') ||
      r.action?.toLowerCase().includes('email') ||
      r.action?.toLowerCase().includes('kakao') ||
      r.origin === 'AlertAutomation'
    );
  }, [activeRules]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    // Push to GlobalDataContext => syncs across all modules (AI Rule Engine, Dashboard)
    addActiveRule?.({
      name: form.name,
      condition: form.condition || 'threshold: ' + form.threshold,
      action: 'Alert -> ' + form.channel,
      priority: form.priority,
      origin: 'AlertAutomation',
    });
    addAlert?.({ type: 'success', msg: t('alertAuto.ruleCreated', 'Alert rule created') + ': ' + form.name });
    setForm({ name: '', condition: '', channel: 'Slack', threshold: '', priority: 'MEDIUM' });
    setShowForm(false);
  };

  // Live data summary for KPI
  const totalFires = alertRules.reduce((s, r) => s + (r.fires || 0), 0);
  const activeCount = alertRules.filter(r => r.status === 'active').length;
  const firedRecent = (rulesFired || []).filter(f => alertRules.some(r => r.id === f.ruleId)).length;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <Kpi icon="📋" label={t('alertAuto.totalRules', 'Total Rules')} value={alertRules.length} color="#4f8ef7" />
        <Kpi icon="✅" label={t('alertAuto.activeCount', 'Active')} value={activeCount} color="#22c55e" />
        <Kpi icon="🔔" label={t('alertAuto.totalFired', 'Total Fired')} value={totalFires} color="#ef4444" />
        <Kpi icon="⚡" label={t('alertAuto.recentFires', 'Recent Fires')} value={firedRecent} color="#f97316" />

      {/* Live Data Sync Panel */}
      <div className="card card-glass" style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>{t('alertAuto.liveSyncStatus', 'Live Data Sync Status')}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { l: t('alertAuto.syncInventory', 'Inventory'), v: (inventory || []).length, c: '#4f8ef7' },
            { l: t('alertAuto.syncOrders', 'Orders'), v: (orders || []).length, c: '#22c55e' },
            { l: t('alertAuto.syncBudgets', 'Budgets'), v: Object.keys(channelBudgets || {}).length, c: '#a855f7' },
            { l: t('alertAuto.syncActiveRules', 'AI Rules'), v: (activeRules || []).length, c: '#f97316' },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.v > 0 ? s.c : '#666' }} />
              <span style={{ color: 'var(--text-2)' }}>{s.l}:</span>
              <span style={{ fontWeight: 700, color: s.c }}>{s.v}</span>
          </div>
          ))}
      </div>

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{t('alertAuto.rulesTitle', 'Automation Alert Rules')}</div>
        {!isDemo && (
          <button onClick={() => setShowForm(!showForm)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
            background: showForm ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#eab308,#f97316)',
            color: showForm ? '#ef4444' : '#000',
          }}>{showForm ? '✕ ' + t('alertAuto.cancel', 'Cancel') : '+ ' + t('alertAuto.addRule', 'Add Rule')}</button>
        )}

      {/* Add Rule Form */}
      {showForm && (
        <div className="card card-glass" style={{ padding: 18, border: '1px solid rgba(234,179,8,0.3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.ruleName', 'Rule Name')}</div>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder={t('alertAuto.ruleNamePh', 'e.g. ROAS Alert')}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12, outline: 'none' }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.condition', 'Condition')}</div>
              <input value={form.condition} onChange={e => setForm(p => ({...p, condition: e.target.value}))} placeholder={t('alertAuto.conditionPh', 'e.g. ROAS < 2.0')}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12, outline: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.channel', 'Channel')}</div>
              <select value={form.channel} onChange={e => setForm(p => ({...p, channel: e.target.value}))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12, outline: 'none' }}>
                <option value="Slack">Slack</option><option value="Teams">Teams</option><option value="Email">Email</option>
                <option value="Kakao">Kakao</option><option value="LINE">LINE</option><option value="SMS">SMS</option>
              </select>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.threshold', 'Threshold')}</div>
              <input value={form.threshold} onChange={e => setForm(p => ({...p, threshold: e.target.value}))} placeholder={t('alertAuto.thresholdPh', 'e.g. 50')}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12, outline: 'none' }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.priority', 'Priority')}</div>
              <select value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12, outline: 'none' }}>
                <option value="HIGH">HIGH</option><option value="MEDIUM">MEDIUM</option><option value="LOW">LOW</option>
              </select>
          </div>
          <button onClick={handleSave} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, background: 'linear-gradient(135deg,#22c55e,#14b8a6)', color: 'var(--text-1)' }}>
            {t('alertAuto.saveRule', 'Save Rule')}
          </button>
      )}

      {/* Rule List */}
      {alertRules.length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('alertAuto.noRules', 'No Alert Rules')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('alertAuto.noRulesDesc', 'Rules created here sync with AI Rule Engine in real-time.')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {alertRules.map(r => (
            <div key={r.id} className="card card-glass" style={{ padding: '14px 18px', borderLeft: '3px solid ' + (r.status === 'active' ? '#22c55e' : '#666') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {t('alertAuto.condLabel', 'Condition')}: <span style={{ color: '#ef4444', fontFamily: 'monospace' }}>{r.condition}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Tag label={r.action || '-'} color="#4f8ef7" />
                  {r.priority && <Tag label={r.priority} color={r.priority === 'HIGH' ? '#ef4444' : r.priority === 'LOW' ? '#22c55e' : '#eab308'} />}
                  <Tag label={r.origin || '-'} color="#a855f7" />
                  <span style={{ padding: '3px 12px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                    background: r.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                    color: r.status === 'active' ? '#22c55e' : '#ef4444',
                  }}>{r.status === 'active' ? t('alertAuto.active', 'Active') : t('alertAuto.paused', 'Paused')}</span>
              </div>
          ))}
      )}
                                                                </div>
                                                            </div>
                                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ============================================================
   TAB 2 - ALERT HISTORY (GlobalData.alerts + dismiss/read)
   ============================================================ */
function HistoryTab() {
  const { t } = useI18n();
  const { alerts, dismissAlert, markAlertRead, markAllRead } = useGlobalData();
  const typeColors = { success: '#22c55e', warn: '#eab308', error: '#ef4444', info: '#4f8ef7' };
  const unread = (alerts || []).filter(a => !a.read).length;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <Kpi icon="📊" label={t('alertAuto.totalAlerts', 'Total Alerts')} value={(alerts || []).length} color="#4f8ef7" />
        <Kpi icon="✅" label={t('alertAuto.successAlerts', 'Success')} value={(alerts || []).filter(a => a.type === 'success').length} color="#22c55e" />
        <Kpi icon="⚠️" label={t('alertAuto.warnAlerts', 'Warnings')} value={(alerts || []).filter(a => a.type === 'warn').length} color="#eab308" />
        <Kpi icon="❌" label={t('alertAuto.errorAlerts', 'Errors')} value={(alerts || []).filter(a => a.type === 'error').length} color="#ef4444" />

      {unread > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{unread} {t('alertAuto.unreadCount', 'unread')}</span>
          <button onClick={() => markAllRead?.()} style={{ padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
            {t('alertAuto.markAllRead', 'Mark all read')}
          </button>
      )}

      {(alerts || []).length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('alertAuto.noAlerts', 'No Alert History')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('alertAuto.noAlertsDesc', 'System alerts from all modules will appear here.')}</div>
      ) : (
        <div className="card card-glass" style={{ padding: 0, overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
          {(alerts || []).map((a, i) => (
            <div key={a.id || i} style={{
              display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(99,140,255,0.06)',
              alignItems: 'flex-start', background: a.read ? 'transparent' : 'rgba(79,142,247,0.03)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: typeColors[a.type] || '#4f8ef7', marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, fontWeight: a.read ? 400 : 600 }}>{a.msg}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{a.time}</div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: (typeColors[a.type] || '#4f8ef7') + '1a', color: typeColors[a.type] || '#4f8ef7' }}>
                  {a.type?.toUpperCase()}
                </span>
                {!a.read && (
                  <button onClick={() => markAlertRead?.(a.id)} title="Mark read" style={{ padding: '2px 6px', borderRadius: 4, border: 'none', background: 'rgba(99,140,255,0.1)', color: '#4f8ef7', fontSize: 9, cursor: 'pointer' }}>&#10003;</button>
                )}
                <button onClick={() => dismissAlert?.(a.id)} title="Dismiss" style={{ padding: '2px 6px', borderRadius: 4, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 9, cursor: 'pointer' }}>&#10005;</button>
            </div>
          ))}
      )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>
);
}

/* ============================================================
   TAB 3 - RULES FIRED LOG (GlobalData.rulesFired)
   ============================================================ */
function FiredTab() {
  const { t } = useI18n();
  const { rulesFired } = useGlobalData();

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <Kpi icon="⚡" label={t('alertAuto.firedTotal', 'Rules Fired')} value={(rulesFired || []).length} color="#f97316" />

      {(rulesFired || []).length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('alertAuto.noFired', 'No Rules Fired Yet')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('alertAuto.noFiredDesc', 'Rule execution logs from AI Rule Engine will appear here in real-time.')}</div>
      ) : (
        <div className="card card-glass" style={{ padding: 0, overflow: 'hidden', maxHeight: 500, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(9,15,30,0.5)', fontSize: 10, color: 'var(--text-3)' }}>
                {[t('alertAuto.colRule','Rule'), t('alertAuto.colAction','Action'), t('alertAuto.colTime','Time'), t('alertAuto.colResult','Result')].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rulesFired || []).slice(0, 50).map((f, i) => (
                <tr key={f.id || i} style={{ borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
                  <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 12 }}>{f.ruleName || f.ruleId}</td>
                  <td style={{ padding: '11px 12px' }}><Tag label={f.action || '-'} color="#f97316" /></td>
                  <td style={{ padding: '11px 12px', fontSize: 10, fontFamily: 'monospace', color: 'var(--text-3)' }}>{f.firedAt}</td>
                  <td style={{ padding: '11px 12px' }}><Tag label={f.result || 'OK'} color={f.result === 'ERROR' ? '#ef4444' : '#22c55e'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
      )}
            </div>
        </div>
    </div>
);
}

/* ============================================================
   TAB 4 - SETTINGS (Channel Config + Schedule)
   ============================================================ */
function SettingsTab() {
  const { t } = useI18n();
  const channels = [
    { id: 'slack', name: 'Slack', icon: '\uD83D\uDCAC', color: '#4A154B' },
    { id: 'teams', name: 'Microsoft Teams', icon: '\uD83D\uDC65', color: '#6264A7' },
    { id: 'email', name: 'Email (SMTP)', icon: '\uD83D\uDCE7', color: '#4f8ef7' },
    { id: 'kakao', name: 'Kakao', icon: '\uD83D\uDC9B', color: '#FEE500' },
    { id: 'line', name: 'LINE', icon: '\uD83D\uDC9A', color: '#00B900' },
    { id: 'sms', name: 'SMS', icon: '\uD83D\uDCF1', color: '#a855f7' },
    { id: 'webhook', name: 'Custom Webhook', icon: '\uD83D\uDD17', color: '#f97316' },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('alertAuto.channelConfig', 'Notification Channel Configuration')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {channels.map(ch => (
          <div key={ch.id} className="card card-glass" style={{ padding: '16px 18px', borderLeft: '3px solid ' + ch.color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>{ch.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{ch.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('alertAuto.notConnected', 'Not Connected')}</div>
              </div>
              <button style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)' }}>
                {t('alertAuto.connect', 'Connect')}
              </button>
          </div>
        ))}
      <div className="card card-glass" style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{t('alertAuto.scheduleConfig', 'Alert Schedule')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.activeHours', 'Active Hours')}</div><div style={{ fontSize: 12, fontWeight: 600 }}>09:00 - 22:00</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.frequency', 'Max Frequency')}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{t('alertAuto.freqValue', '10 per hour')}</div></div>
          <div><div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('alertAuto.cooldown', 'Cooldown')}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{t('alertAuto.cooldownValue', '5 minutes')}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ============================================================
   MAIN - 4 TABS + BroadcastChannel cross-tab sync
   ============================================================ */
export default function AlertAutomation() {
  const { t } = useI18n();
  const [tab, setTab] = useState('rules');
  const { addAlert, alerts, activeRules, rulesFired, inventory, orders } = useGlobalData();
  const { isDemo } = useAuth();
  const bcRef = useRef(null);
  const { locked, setLocked } = useSecurityGuard(addAlert);

  // BroadcastChannel: cross-tab real-time sync
  useEffect(() => {
    try {
      bcRef.current = new BroadcastChannel('genie_alert_auto_sync');
      bcRef.current.onmessage = (e) => {
        const d = e.data;
        if (d?.type === 'alert_rule_added') {
          addAlert?.({ type: 'info', msg: t('alertAuto.crossTabSync', 'Rule synced from another tab') + ': ' + (d.name || '') });
        }
        if (d?.type === 'rule_fired') {
          addAlert?.({ type: 'warn', msg: t('alertAuto.crossTabFire', 'Rule fired in another tab') + ': ' + (d.ruleName || '') });
        }
      };
    } catch (_) {}
    return () => { try { bcRef.current?.close(); } catch (_) {} };
  }, []);

  const unreadCount = (alerts || []).filter(a => !a.read).length;

  const TABS = [
    { id: 'rules', label: t('alertAuto.tabRules', 'Alert Rules'), desc: t('alertAuto.tabRulesDesc', 'Rule management & sync') },
    { id: 'history', label: t('alertAuto.tabHistory', 'Alert History') + (unreadCount > 0 ? ' (' + unreadCount + ')' : ''), desc: t('alertAuto.tabHistoryDesc', 'Real-time alert logs') },
    { id: 'fired', label: t('alertAuto.tabFired', 'Rules Fired'), desc: t('alertAuto.tabFiredDesc', 'Execution log') },
    { id: 'settings', label: t('alertAuto.tabSettings', 'Settings'), desc: t('alertAuto.tabSettingsDesc', 'Channel configuration') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
    <div style={{ display: 'grid', gap: 16 }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />

      {isDemo && (
        <div style={{ padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(245,158,11,0.06))', border: '1.5px solid rgba(239,68,68,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#f97316' }}>{t('alertAuto.demoBanner', 'Demo Mode')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('alertAuto.demoBannerDesc', 'View-only. Upgrade to manage rules.')}</div>
          <button onClick={() => window.location.href='/pricing'} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#f97316)', color: 'var(--text-1)', fontWeight: 700, fontSize: 12 }}>{t('alertAuto.upgradeBtn', 'Pro Upgrade')}</button>
      )}

      {/* Hero */}
      <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.07),rgba(245,158,11,0.05))', borderColor: 'rgba(239,68,68,0.18)' }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.28),rgba(245,158,11,0.18))' }}>🔔</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#ef4444,#f97316,#eab308)' }}>{t('alertAuto.heroTitle', 'Alert Automation')}</div>
            <div className="hero-desc">{t('alertAuto.heroDesc', 'Real-time alert rules linked to Slack/Teams/Email/Kakao.')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { label: (alerts || []).length + ' ' + t('alertAuto.badgeAlerts', 'Alerts'), color: '#ef4444' },
            { label: (activeRules || []).length + ' ' + t('alertAuto.badgeRulesSync', 'Rules Synced'), color: '#4f8ef7' },
            { label: t('alertAuto.badgeRealtime', 'Real-time Sync'), color: '#22c55e' },
            { label: t('alertAuto.badgeSecurity', 'Security Active'), color: '#14d9b0' },
          ].map(({ label, color }) => (
            <span key={label} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: color + '1a', color, border: '1px solid ' + color + '33' }}>{label}</span>
          ))}
      </div>

      {/* Tab Nav */}
      <div className="card card-glass fade-up fade-up-1" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + TABS.length + ',1fr)' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: '14px 12px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: tab === tb.id ? 'rgba(239,68,68,0.09)' : 'transparent',
              borderBottom: '2px solid ' + (tab === tb.id ? '#ef4444' : 'transparent'), transition: 'all 200ms',
            }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.label}</div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{tb.desc}</div>
            </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="card card-glass fade-up fade-up-2" style={{ padding: 20 }}>
        {tab === 'rules' && <RulesTab isDemo={isDemo} />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'fired' && <FiredTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
      </div>
);
}
