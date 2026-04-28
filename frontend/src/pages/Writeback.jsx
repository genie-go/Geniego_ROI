import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { getJsonAuth, postJson, postJsonAuth } from '../services/apiClient.js';

/* ─── Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const ch = [];
        try { const k = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]'); if (Array.isArray(k)) k.forEach(x => { if (x.service) ch.push(x.service.toLowerCase()); }); } catch {}
        ['meta','google','tiktok','kakao_moment','naver','coupang','amazon','shopify','gmarket','11st','line','whatsapp','qoo10','rakuten','shopee'].forEach(c => {
            try { if (localStorage.getItem(`geniego_channel_${c}`)) ch.push(c); } catch {}
        });
        return [...new Set(ch)];
    }, []);
}

/* ═══════════════════════════════════════════════════
   SECURITY — Enterprise Superium v5.0
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
        try { addAlert?.({ type: 'error', msg: '[Writeback] Brute-force blocked' }); } catch (_) {}
        e.target.value = ''; e.preventDefault(); return;
      }
      for (const p of THREAT_PATTERNS) {
        if (p.re.test(val)) {
          setLocked(p.type + ': ' + val.slice(0, 60));
          try { addAlert?.({ type: 'error', msg: '[Writeback] ' + p.type + ' blocked' }); } catch (_) {}
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
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('writebackPage.secTitle', 'Security Threat Detected')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.7 }}>{t('writebackPage.secDesc', 'Suspicious activity detected.')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === 'GENIE-UNLOCK-2026' && onUnlock()}
          placeholder={t('writebackPage.secCode', 'Enter unlock code')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: '#fff', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === 'GENIE-UNLOCK-2026' && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>
          {t('writebackPage.secUnlock', 'Unlock')}
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
    { key: 'inv', label: t('writebackPage.syncInventory', 'Inventory'), count: (inventory || []).length, color: '#22c55e' },
    { key: 'ord', label: t('writebackPage.syncOrders', 'Orders'), count: (orders || []).length, color: '#f97316' },
    { key: 'bud', label: t('writebackPage.syncBudgets', 'Budgets'), count: Object.keys(channelBudgets || {}).length, color: '#eab308' },
    { key: 'rul', label: t('writebackPage.syncRules', 'AI Rules'), count: (activeRules || []).length, color: '#6366f1' },
  ];
  return (
    <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(99,140,255,0.04)', border: '1px solid rgba(99,140,255,0.1)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{t('writebackPage.liveSyncStatus', 'Live Data Sync Status')}</div>
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
   TAB 1: Writeback Console — Product Push to Channel
   ═══════════════════════════════════════════════════ */
function ConsoleTab({ t, isDemo }) {
  const { addAlert } = useGlobalData();
  const [channel, setChannel] = useState('shopify');
  const [sku, setSku] = useState('');
  const [productText, setProductText] = useState('');
  const [policy, setPolicy] = useState(null);
  const [categorySuggestion, setCategorySuggestion] = useState(null);
  const [prepared, setPrepared] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const inputSt = { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: '#fff', fontSize: 12, outline: 'none' };
  const btnSt = (bg, col) => ({ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: bg, color: col, transition: 'all 150ms' });

  const demoGuard = () => { if (isDemo) { setErr(t('writebackPage.demoGuard', 'Demo mode — upgrade for writeback operations')); return true; } return false; };

  async function handlePrepare() {
    if (demoGuard()) return;
    if (!sku.trim()) { setErr(t('writebackPage.errNoSku', 'Please enter a SKU.')); return; }
    setLoading(true); setErr(null); setPolicy(null); setCategorySuggestion(null); setPrepared(null);
    try {
      const product = productText.trim() ? JSON.parse(productText) : { sku, title: '', price: 0, currency: 'KRW' };
      const pol = await postJson('/v401/writeback/policy_validate', { channel, product });
      setPolicy(pol);
      const cat = await postJson('/v401/writeback/category/suggest', { channel, product });
      setCategorySuggestion(cat);
      const data = await postJson(`/v382/writeback/${channel}/${sku}/prepare?operation=publish`, {});
      setPrepared(data);
      addAlert?.({ type: 'success', msg: `[Writeback] ${t('writebackPage.prepareSuccess', 'Prepare completed')}: ${channel}/${sku}` });
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  async function handleExecute() {
    if (demoGuard()) return;
    if (!sku.trim()) { setErr(t('writebackPage.errNoSku', 'Please enter a SKU.')); return; }
    setLoading(true); setErr(null);
    try {
      if (prepared?.requires_approval) {
        await postJson('/v382/approvals', { type: prepared.approval_type, channel, sku, payload: prepared.payload });
        setErr(t('writebackPage.approvalCreated', 'Approval required. Go to Approvals to approve.'));
        setLoading(false); return;
      }
      await postJson(`/v382/writeback/${channel}/${sku}/execute`, { idempotency_key: `${channel}:${sku}:publish`, operation: 'publish' });
      addAlert?.({ type: 'success', msg: `[Writeback] ${t('writebackPage.executeSuccess', 'Executed')}: ${channel}/${sku}` });
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  async function handlePreview() {
    if (demoGuard()) return;
    if (!productText.trim()) { setErr(t('writebackPage.errNoPayload', 'Enter product JSON first.')); return; }
    setLoading(true); setErr(null); setPreview(null);
    try {
      const product = JSON.parse(productText);
      const out = await postJsonAuth('/v398/writeback/preview', { channel, product });
      setPreview(out);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  const channels = [
    { id: 'shopify', label: 'Shopify' }, { id: 'amazon', label: 'Amazon' },
    { id: 'qoo10', label: 'Qoo10' }, { id: 'rakuten', label: 'Rakuten' },
    { id: 'shopee', label: 'Shopee' }, { id: 'coupang', label: 'Coupang' },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <SyncStatusPanel t={t} />

      {/* Controls */}
      <div className="card card-glass" style={{ padding: 16, border: '1px solid rgba(99,140,255,0.12)' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>{t('writebackPage.channel', 'Channel')}</div>
            <select value={channel} onChange={e => setChannel(e.target.value)} style={{ ...inputSt, minWidth: 120 }}>
              {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4 }}>SKU</div>
            <input value={sku} onChange={e => setSku(e.target.value)} placeholder={t('writebackPage.skuPlaceholder', 'Enter SKU')} style={{ ...inputSt, minWidth: 160 }} />
          </div>
          <button onClick={handlePrepare} disabled={loading} style={btnSt('linear-gradient(135deg,#4f8ef7,#6366f1)', '#fff')}>
            🔍 {t('writebackPage.btnPrepare', 'Prepare')}
          </button>
          <button onClick={handleExecute} disabled={loading} style={btnSt('linear-gradient(135deg,#22c55e,#14d9b0)', '#fff')}>
            ⚡ {t('writebackPage.btnExecute', 'Execute')}
          </button>
          <button onClick={handlePreview} disabled={loading} style={btnSt('rgba(99,140,255,0.12)', 'var(--text-1)')}>
            👁️ {t('writebackPage.btnPreview', 'Preview')}
          </button>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444' }}>
          ⚠ {err}
        </div>
      )}

      {/* Policy + Category Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card card-glass" style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🛡️ {t('writebackPage.policyValidate', 'Policy Validation')}</div>
          {policy ? (
            <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(policy, null, 2)}</pre>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('writebackPage.runPreparePolicy', 'Run Prepare to validate policy.')}</div>
          )}
        </div>
        <div className="card card-glass" style={{ padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📂 {t('writebackPage.categorySuggestion', 'Category Suggestion')}</div>
          {categorySuggestion ? (
            <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(categorySuggestion, null, 2)}</pre>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('writebackPage.runPrepareCategory', 'Run Prepare to get category suggestion.')}</div>
          )}
        </div>
      </div>

      {/* Prepare Result */}
      {prepared && (
        <div className="card card-glass" style={{ padding: '14px 16px', borderLeft: '3px solid #f97316' }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📋 {t('writebackPage.prepareResult', 'Prepare Result')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
            <b>{t('writebackPage.requiresApproval', 'Requires Approval')}:</b> {String(prepared.requires_approval)}
            {prepared.approval_type ? ` (${prepared.approval_type})` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
            <b>{t('writebackPage.policyFindings', 'Policy Findings')}:</b> {prepared.findings?.length || 0}
          </div>
          <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(prepared, null, 2)}</pre>
        </div>
      )}

      {/* Payload Editor */}
      <div className="card card-glass" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>📦 {t('writebackPage.payloadEditor', 'Payload Editor')}</div>
          <Tag label="JSON" color="#6366f1" />
          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('writebackPage.payloadEditorDesc', 'Enter product JSON and run Preview to validate before execution.')}</div>
        </div>
        <textarea value={productText} onChange={e => setProductText(e.target.value)} rows={8}
          placeholder={t('writebackPage.payloadPlaceholder', '{ "sku": "...", "title": "...", "price": 0 }')}
          style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(99,140,255,0.15)', background: 'var(--surface-2)', color: '#fff', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none' }} />
      </div>

      {/* Preview Result */}
      {preview && (
        <div className="card card-glass" style={{ padding: '14px 16px', borderLeft: '3px solid ' + (preview.validation?.ok ? '#22c55e' : '#ef4444') }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>👁️ {t('writebackPage.validationResult', 'Validation Result')}</div>
            <Tag label={preview.validation?.ok ? 'OK' : t('writebackPage.needsFix', 'Needs Fix')} color={preview.validation?.ok ? '#22c55e' : '#ef4444'} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('writebackPage.findings', 'Findings')}: {preview.validation?.findings?.length || 0}</span>
          </div>
          <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-2)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>{JSON.stringify(preview, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB 2: Job History
   ═══════════════════════════════════════════════════ */
function JobsTab({ t, isDemo }) {
  const { addAlert } = useGlobalData();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function loadJobs() {
    if (isDemo) return;
    setLoading(true); setErr(null);
    try {
      const data = await getJsonAuth('/v382/writeback/jobs');
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  const statusColors = { completed: '#22c55e', running: '#4f8ef7', failed: '#ef4444', pending: '#eab308', queued: '#a855f7' };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>📊 {t('writebackPage.jobHistory', 'Job History')}</div>
        <button onClick={loadJobs} disabled={loading} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>
          🔄 {t('writebackPage.btnRefreshJobs', 'Refresh Jobs')}
        </button>
      </div>

      {err && <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#ef4444' }}>⚠ {err}</div>}

      {jobs.length === 0 ? (
        <div className="card card-glass" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t('writebackPage.noJobs', 'No Writeback Jobs')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7 }}>{t('writebackPage.noJobsDesc', 'Execute a writeback operation to see job history. Jobs sync in real-time.')}</div>
        </div>
      ) : (
        <div className="card card-glass" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,140,255,0.12)' }}>
                  {['ID', t('writebackPage.colChannel', 'Channel'), 'SKU', t('writebackPage.colOp', 'Operation'), t('writebackPage.colStatus', 'Status'), t('writebackPage.colAttempt', 'Attempt'), t('writebackPage.colUpdated', 'Updated')].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-3)', fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((j, i) => (
                  <tr key={j.id || i} style={{ borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>#{j.id}</td>
                    <td style={{ padding: '10px 12px' }}><Tag label={j.channel} /></td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#fff' }}>{j.sku}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{j.operation}</td>
                    <td style={{ padding: '10px 12px' }}><Tag label={j.status} color={statusColors[j.status] || '#4f8ef7'} /></td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-2)' }}>{j.attempt}</td>
                    <td style={{ padding: '10px 12px', fontSize: 10, color: 'var(--text-3)' }}>{j.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    try { const s = localStorage.getItem('genie_writeback_cfg'); if (s) return JSON.parse(s); } catch (_) {}
    return { auto_retry: true, dry_run: false, approval_gate: true, webhook_notify: true, rate_limit: true, audit_log: true };
  });

  const toggle = (id) => {
    setCfg(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('genie_writeback_cfg', JSON.stringify(updated)); } catch (_) {}
      addAlert?.({ type: 'info', msg: t('writebackPage.cfgChanged', 'Setting changed') + ': ' + id });
      return updated;
    });
  };

  const configs = [
    { id: 'auto_retry', label: t('writebackPage.cfgAutoRetry', 'Auto Retry'), desc: t('writebackPage.cfgAutoRetryDesc', 'Automatically retry failed writeback jobs'), icon: '🔄' },
    { id: 'dry_run', label: t('writebackPage.cfgDryRun', 'Dry Run Mode'), desc: t('writebackPage.cfgDryRunDesc', 'Simulate writeback without actual channel API calls'), icon: '🧪' },
    { id: 'approval_gate', label: t('writebackPage.cfgApprovalGate', 'Approval Gate'), desc: t('writebackPage.cfgApprovalGateDesc', 'Require approval for high-risk writeback operations'), icon: '✅' },
    { id: 'webhook_notify', label: t('writebackPage.cfgWebhookNotify', 'Webhook Notification'), desc: t('writebackPage.cfgWebhookNotifyDesc', 'Send webhook on writeback completion or failure'), icon: '🔔' },
    { id: 'rate_limit', label: t('writebackPage.cfgRateLimit', 'Rate Limiting'), desc: t('writebackPage.cfgRateLimitDesc', 'Enforce API rate limits per channel'), icon: '⏱️' },
    { id: 'audit_log', label: t('writebackPage.cfgAuditLog', 'Audit Logging'), desc: t('writebackPage.cfgAuditLogDesc', 'Log all writeback operations for compliance'), icon: '📋' },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('writebackPage.settingsTitle', '⚙ Writeback Settings')}</div>
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
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700, flexShrink: 0, background: on ? 'rgba(34,197,94,0.15)' : 'rgba(102,102,102,0.15)', color: on ? '#22c55e' : '#666' }}>{on ? t('writebackPage.enabled', 'Enabled') : t('writebackPage.disabled', 'Disabled')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════════════
   TAB 4: Usage Guide
   ═══════════════════════════════════════════════════ */
function GuideTab() {
    const { t } = useI18n();
    const CARD = { borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' };
    const steps = [
        { icon: '1️⃣', title: t('writebackPage.guideStep1Title'), desc: t('writebackPage.guideStep1Desc'), color: '#4f8ef7' },
        { icon: '2️⃣', title: t('writebackPage.guideStep2Title'), desc: t('writebackPage.guideStep2Desc'), color: '#22c55e' },
        { icon: '3️⃣', title: t('writebackPage.guideStep3Title'), desc: t('writebackPage.guideStep3Desc'), color: '#eab308' },
        { icon: '4️⃣', title: t('writebackPage.guideStep4Title'), desc: t('writebackPage.guideStep4Desc'), color: '#a855f7' },
        { icon: '5️⃣', title: t('writebackPage.guideStep5Title'), desc: t('writebackPage.guideStep5Desc'), color: '#f97316' },
        { icon: '6️⃣', title: t('writebackPage.guideStep6Title'), desc: t('writebackPage.guideStep6Desc'), color: '#06b6d4' },
    ];
    const sections = [
        { icon: '↩', name: t('writebackPage.tabConsole'), desc: t('writebackPage.guideSecConsole') },
        { icon: '📊', name: t('writebackPage.tabJobs'), desc: t('writebackPage.guideSecJobs') },
        { icon: '⚙', name: t('writebackPage.tabSettings'), desc: t('writebackPage.guideSecSettings') },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', borderColor: '#4f8ef740', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>↩</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('writebackPage.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 520, margin: '6px auto 0' }}>{t('writebackPage.guideSub')}</div>
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('writebackPage.guideStepsTitle')}</div>
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
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('writebackPage.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {sections.map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div><div style={{ fontWeight: 700, fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }} >{n.name}</div><div>{n.desc}</div></div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ ...CARD, background: 'rgba(79,142,247,0.04)', borderColor: '#4f8ef730' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('writebackPage.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
                    <li>{t('writebackPage.guideTip1')}</li><li>{t('writebackPage.guideTip2')}</li><li>{t('writebackPage.guideTip3')}</li><li>{t('writebackPage.guideTip4')}</li><li>{t('writebackPage.guideTip5')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN — Enterprise Superium v6.0
   ═══════════════════════════════════════════════════ */
export default function Writeback() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const { isDemo } = useAuth();
  const { addAlert, inventory, orders, activeRules, alerts } = useGlobalData();
  const [tab, setTab] = useState('console');
  const bcRef = useRef(null);
  const connectedChannels = useConnectedChannels();
  const { connectedCount = 0 } = useConnectorSync?.() || {};
  const [syncTick, setSyncTick] = useState(0);
  const { locked, setLocked } = useSecurityGuard(addAlert);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch1 = new BroadcastChannel('genie_writeback_sync');
    const ch2 = new BroadcastChannel('genie_connector_sync');
    const ch3 = new BroadcastChannel('genie_product_sync');
    const handler = () => setSyncTick(p => p + 1);
    ch1.onmessage = (e) => {
      handler();
      if (e.data?.type === 'job_completed')
        addAlert?.({ type: 'info', msg: t('writebackPage.crossTabSync') });
    };
    ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED','CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
    ch3.onmessage = handler;
    return () => { ch1.close(); ch2.close(); ch3.close(); };
  }, []);
  useEffect(() => {
    const id = setInterval(() => { setSyncTick(p => p + 1); try { bcRef.current?.postMessage({ type: 'WB_UPDATE', ts: Date.now() }); } catch {} }, 30000);
    return () => clearInterval(id);
  }, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), connectedChannels, inventoryCount: (inventory||[]).length, alerts: (alerts||[]).filter(a => a.msg?.includes('Writeback')) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `writeback_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const chCount = connectedChannels.length || 6;

  const TABS = [
    { id: 'console', icon: '↩', label: t('writebackPage.tabConsole'), desc: t('writebackPage.tabConsoleDesc') },
    { id: 'jobs', icon: '📊', label: t('writebackPage.tabJobs'), desc: t('writebackPage.tabJobsDesc') },
    { id: 'settings', icon: '⚙', label: t('writebackPage.tabSettings'), desc: t('writebackPage.tabSettingsDesc') },
    { id: 'guide', icon: '📖', label: t('writebackPage.tabGuide'), desc: t('writebackPage.tabGuideDesc') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />

      <div style={{ flexShrink: 0, padding: '14px 16px 0', background: 'var(--surface-1, #070f1a)', zIndex: 10, borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
        {isDemo && (
          <div style={{ padding: '10px 16px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', border: '1.5px solid rgba(79,142,247,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#4f8ef7' }}>{t('writebackPage.demoBanner')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('writebackPage.demoBannerDesc')}</div>
            </div>
            <button onClick={() => window.location.href='/pricing'} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 11 }}>{t('writebackPage.upgradeBtn')}</button>
          </div>
        )}

        <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.07),rgba(99,102,241,0.05))', borderColor: 'rgba(79,142,247,0.18)', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div className="hero-meta">
              <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.28),rgba(99,102,241,0.18))' }}>↩</div>
              <div>
                <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#6366f1,#a855f7)' }}>{t('writebackPage.heroTitle')}</div>
                <div className="hero-desc">{t('writebackPage.heroDesc')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)', color: '#f97316' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', animation: 'pulse 2s infinite' }} /> {t('writebackPage.badgeRealtime')}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(20,217,176,0.08)', border: '1px solid rgba(20,217,176,0.15)', color: '#14d9b0' }}>
                🛡️ {t('writebackPage.badgeSecurity')}
              </div>
              <button onClick={handleExport} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.08)', color: '#4f8ef7', cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>📥 {t('writebackPage.export')}</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#4f8ef71a', color: '#4f8ef7', border: '1px solid #4f8ef733' }}>{chCount} {t('writebackPage.badgeChannels')}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#22c55e1a', color: '#22c55e', border: '1px solid #22c55e33' }}>{(inventory||[]).length} {t('writebackPage.badgeProducts')}</span>
            {connectedChannels.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#a855f718', color: '#a855f7', border: '1px solid #a855f733' }}>🔗 {connectedChannels.length} {t('writebackPage.channelsLinked')}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', padding: '4px 4px 0', borderRadius: '12px 12px 0 0', border: '1px solid rgba(99,140,255,0.06)', borderBottom: 'none' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', textAlign: 'center', borderRadius: '8px 8px 0 0',
              background: tab === tb.id ? 'rgba(79,142,247,0.08)' : 'transparent',
              borderBottom: `2px solid ${tab === tb.id ? '#4f8ef7' : 'transparent'}`, transition: 'all 200ms' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.icon} {tb.label}</div>
              <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 2 }}>{tb.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
        {tab === 'console' && <ConsoleTab t={t} isDemo={isDemo} />}
        {tab === 'jobs' && <JobsTab t={t} isDemo={isDemo} />}
        {tab === 'settings' && <SettingsTab t={t} />}
        {tab === 'guide' && <GuideTab />}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
    </div>
  );
}
