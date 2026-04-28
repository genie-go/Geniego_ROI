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
    ['meta','google','tiktok','kakao_moment','naver','coupang','amazon','shopify','gmarket','11st','line','whatsapp','qoo10','rakuten','shopee','cafe24','salesforce','slack'].forEach(c => {
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
      if (inputLog.current.length > 20) { setLocked('BRUTE_FORCE'); try { addAlert?.({ type: 'error', msg: '[IntegrationHub] Brute-force blocked' }); } catch {} e.target.value = ''; return; }
      for (const p of THREAT_PATTERNS) { if (p.re.test(val)) { setLocked(p.type + ': ' + val.slice(0, 60)); try { addAlert?.({ type: 'error', msg: '[IntegrationHub] ' + p.type + ' blocked' }); } catch {} e.target.value = ''; return; } }
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
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('integrationHub.secTitle')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === 'GENIE-UNLOCK-2026' && onUnlock()}
          placeholder={t('integrationHub.secCode')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: 'var(--text-1)', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === 'GENIE-UNLOCK-2026' && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'var(--text-1)', fontWeight: 800, fontSize: 13 }}>{t('integrationHub.secUnlock')}</button>
        </div>
    </div>
);
}

/* ─── Shared UI ─── */
const Tag = ({ label, color = '#4f8ef7' }) => (
  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: color + '1a', color, border: '1px solid ' + color + '33' }}>{label}</span>
);

/* ═══════════════════════════════════════════════════
   CHANNELS CONFIG
   ═══════════════════════════════════════════════════ */
function buildChannels(t) {
  return [
    { key: 'meta', name: 'Meta Ads', cat: t('integrationHub.catAds'), desc: t('integrationHub.descMeta'), icon: '🔵', fee: '3-5%' },
    { key: 'google', name: 'Google Ads', cat: t('integrationHub.catAds'), desc: t('integrationHub.descGoogle'), icon: '🔴', fee: '2-4%' },
    { key: 'tiktok', name: 'TikTok Ads', cat: t('integrationHub.catAds'), desc: t('integrationHub.descTiktok'), icon: '🎵', fee: '3-6%' },
    { key: 'kakao_moment', name: 'Kakao Moment', cat: t('integrationHub.catAds'), desc: t('integrationHub.descKakao'), icon: '💬', fee: '2-3%' },
    { key: 'naver', name: 'Naver Ads', cat: t('integrationHub.catAds'), desc: t('integrationHub.descNaver'), icon: '🟢', fee: '2-4%' },
    { key: 'coupang', name: 'Coupang', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descCoupang'), icon: '🛒', fee: '10-15%' },
    { key: 'amazon', name: 'Amazon', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descAmazon'), icon: '📦', fee: '8-15%' },
    { key: 'shopify', name: 'Shopify', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descShopify'), icon: '🛍️', fee: '2.9%+30¢' },
    { key: 'cafe24', name: 'Cafe24', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descCafe24'), icon: '☕', fee: '0-3%' },
    { key: 'qoo10', name: 'Qoo10', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descQoo10'), icon: '🌏', fee: '10-12%' },
    { key: 'rakuten', name: 'Rakuten', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descRakuten'), icon: '🇯🇵', fee: '8-12%' },
    { key: 'shopee', name: 'Shopee', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descShopee'), icon: '🧡', fee: '5-8%' },
    { key: 'gmarket', name: 'Gmarket', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.descGmarket'), icon: '🏪', fee: '12-15%' },
    { key: '11st', name: '11번가', cat: t('integrationHub.catCommerce'), desc: t('integrationHub.desc11st'), icon: '🔶', fee: '12-15%' },
    { key: 'salesforce', name: 'Salesforce', cat: t('integrationHub.catCrm'), desc: t('integrationHub.descSalesforce'), icon: '☁️', fee: '-' },
    { key: 'slack', name: 'Slack', cat: t('integrationHub.catCollab'), desc: t('integrationHub.descSlack'), icon: '💬', fee: '-' },
    { key: 'line', name: 'LINE', cat: t('integrationHub.catCollab'), desc: t('integrationHub.descLine'), icon: '🟩', fee: '-' },
    { key: 'whatsapp', name: 'WhatsApp', cat: t('integrationHub.catCollab'), desc: t('integrationHub.descWhatsapp'), icon: '📱', fee: '-' },
  ];
}

/* ═══════════════════════════════════════════════════
   TAB 1: Channels
   ═══════════════════════════════════════════════════ */
function ChannelsTab({ t, channels, apiKeys, onRegister, onRemove, onRequestKey, requestingKeys, isDemo }) {
  const [filter, setFilter] = useState('all');
  const [apiInput, setApiInput] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showKeyFor, setShowKeyFor] = useState(null);
  const cats = ['all', ...new Set(channels.map(c => c.cat))];
  const filtered = filter === 'all' ? channels : channels.filter(c => c.cat === filter);

  const handleRegister = () => {
    if (!selectedChannel || !apiInput.trim()) return;
    onRegister(selectedChannel, apiInput.trim());
    setApiInput(''); setSelectedChannel(null);
  };

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
        {[{ label: t('integrationHub.totalChannels'), val: channels.length, color: '#4f8ef7', icon: '🔗' },
          { label: t('integrationHub.connected'), val: Object.keys(apiKeys).length, color: '#22c55e', icon: '✅' },
          { label: t('integrationHub.notConnected'), val: channels.length - Object.keys(apiKeys).length, color: '#f97316', icon: '⏳' },
          { label: t('integrationHub.autoLoaded'), val: Object.values(apiKeys).filter(v => v?.source === 'auto').length, color: '#a855f7', icon: '🤖' },
        ].map((s, i) => (
          <div key={i} className="card card-glass" style={{ padding: '12px 14px', textAlign: 'center', borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{s.label}</div>
        ))}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
            background: filter === c ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
            color: filter === c ? '#4f8ef7' : 'var(--text-2)',
          }}>{c === 'all' ? t('integrationHub.filterAll') : c}</button>
        ))}

      {/* API Key Registration */}
      <div className="card card-glass" style={{ padding: 16, border: '1px solid rgba(79,142,247,0.12)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🔑 {t('integrationHub.registerApiKey')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <select value={selectedChannel || ''} onChange={e => setSelectedChannel(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12, minWidth: 140 }}>
            <option value="">{t('integrationHub.selectChannel')}</option>
            {channels.filter(c => !apiKeys[c.key]).map(c => <option key={c.key} value={c.key}>{c.name} — {t('integrationHub.notConnected')}</option>)}
          </select>
          <input value={apiInput} onChange={e => setApiInput(e.target.value)} placeholder={t('integrationHub.apiKeyPlaceholder')} style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12, outline: 'none' }} />
          <button onClick={handleRegister} disabled={!selectedChannel || !apiInput.trim()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', opacity: (!selectedChannel || !apiInput.trim()) ? 0.5 : 1 }}>
            {t('integrationHub.btnRegister')}
          </button>
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>💡 {t('integrationHub.autoLoadHint')}</div>

      {/* Channel Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(ch => {
          const entry = apiKeys[ch.key];
          const isConnected = !!entry;
          const isRequesting = requestingKeys[ch.key];
          const maskedKey = entry?.key ? entry.key.substring(0, 6) + '••••' + entry.key.slice(-4) : '';
          return (
            <div key={ch.key} className="card card-glass" style={{ padding: '16px 18px', border: `1px solid ${isConnected ? 'rgba(34,197,94,0.25)' : 'rgba(99,140,255,0.08)'}`, transition: 'all 200ms' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{ch.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{ch.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{ch.cat}</div>
                </div>
                {isConnected ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {entry?.source === 'auto' && <Tag label={t('integrationHub.autoTag')} color="#a855f7" />}
                    <Tag label={t('integrationHub.connected')} color="#22c55e" />
                    <button onClick={() => onRemove(ch.key)} style={{ padding: '2px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 9, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>✕</button>
                ) : (
                  <Tag label={t('integrationHub.notConnected')} color="#666" />
                )}
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 8 }}>{ch.desc}</div>
              {ch.fee !== '-' && (
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6 }}>💰 {t('integrationHub.fee')}: <span style={{ fontWeight: 700, color: '#f97316' }}>{ch.fee}</span></div>
              )}
              {/* Connected: show key info */}
              {isConnected && (
                <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
                      🔑 {showKeyFor === ch.key ? entry.key : maskedKey}
                    <button onClick={() => setShowKeyFor(showKeyFor === ch.key ? null : ch.key)} style={{ fontSize: 9, border: 'none', background: 'transparent', color: '#4f8ef7', cursor: 'pointer', fontWeight: 600 }}>
                      {showKeyFor === ch.key ? t('integrationHub.hideKey') : t('integrationHub.showKey')}
                    </button>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>
                    {t('integrationHub.registeredAt')}: {new Date(entry.registered).toLocaleDateString()} {entry.source === 'auto' ? `(${t('integrationHub.autoLoaded')})` : ''}
                </div>
              )}
              {/* Not connected: request API key button */}
              {!isConnected && (
                <button onClick={() => onRequestKey(ch.key)} disabled={isRequesting}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${isRequesting ? '#a855f733' : '#4f8ef733'}`, background: isRequesting ? 'rgba(168,85,247,0.06)' : 'rgba(79,142,247,0.06)', color: isRequesting ? '#a855f7' : '#4f8ef7', cursor: isRequesting ? 'wait' : 'pointer', fontWeight: 700, fontSize: 11, transition: 'all 200ms' }}>
                  {isRequesting ? `⏳ ${t('integrationHub.requesting')}...` : `🔑 ${t('integrationHub.requestApiKey')}`}
                </button>
              )}
          
                        </div>
                      </div>
                    </div>
            </div>
);
        })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
/* ═══════════════════════════════════
   TAB 2: Settings
   ═══════════════════════════════════════════════════ */
function SettingsTab({ t }) {
  const { addAlert } = useGlobalData();
  const [cfg, setCfg] = useState(() => {
    try { const s = localStorage.getItem('genie_ih_cfg'); if (s) return JSON.parse(s); } catch {}
    return { auto_sync: true, webhook: false, rate_limit: true, audit_log: true, auto_retry: true, notify_disconnect: true };
  });
  const toggle = (id) => {
    setCfg(prev => {
      const u = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('genie_ih_cfg', JSON.stringify(u)); } catch {}
      addAlert?.({ type: 'info', msg: t('integrationHub.cfgChanged') + ': ' + id });
      return u;
    });
  };
  const configs = [
    { id: 'auto_sync', label: t('integrationHub.cfgAutoSync'), desc: t('integrationHub.cfgAutoSyncDesc'), icon: '🔄' },
    { id: 'webhook', label: t('integrationHub.cfgWebhook'), desc: t('integrationHub.cfgWebhookDesc'), icon: '🔔' },
    { id: 'rate_limit', label: t('integrationHub.cfgRateLimit'), desc: t('integrationHub.cfgRateLimitDesc'), icon: '⏱️' },
    { id: 'audit_log', label: t('integrationHub.cfgAuditLog'), desc: t('integrationHub.cfgAuditLogDesc'), icon: '📋' },
    { id: 'auto_retry', label: t('integrationHub.cfgAutoRetry'), desc: t('integrationHub.cfgAutoRetryDesc'), icon: '🔁' },
    { id: 'notify_disconnect', label: t('integrationHub.cfgNotifyDisconnect'), desc: t('integrationHub.cfgNotifyDisconnectDesc'), icon: '⚠️' },
  ];
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{t('integrationHub.settingsTitle')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        {configs.map(c => {
          const on = cfg[c.id];
          return (
            <div key={c.id} className="card card-glass" style={{ padding: '16px 18px', borderLeft: '3px solid ' + (on ? '#22c55e' : '#666'), cursor: 'pointer', transition: 'all 200ms' }} onClick={() => toggle(c.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 9, fontWeight: 700, background: on ? 'rgba(34,197,94,0.15)' : 'rgba(102,102,102,0.15)', color: on ? '#22c55e' : '#666' }}>{on ? t('integrationHub.enabled') : t('integrationHub.disabled')}</span>
            </div>
          
            </div>
);
        })}
        </div>
    </div>
/* ═══════════════════════════════════
   TAB 3: Usage Guide
   ═══════════════════════════════════════════════════ */
function GuideTab({ t }) {
  const CARD = { borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' };
  const steps = [
    { icon: '1️⃣', title: t('integrationHub.guideStep1Title'), desc: t('integrationHub.guideStep1Desc'), color: '#4f8ef7' },
    { icon: '2️⃣', title: t('integrationHub.guideStep2Title'), desc: t('integrationHub.guideStep2Desc'), color: '#22c55e' },
    { icon: '3️⃣', title: t('integrationHub.guideStep3Title'), desc: t('integrationHub.guideStep3Desc'), color: '#f97316' },
    { icon: '4️⃣', title: t('integrationHub.guideStep4Title'), desc: t('integrationHub.guideStep4Desc'), color: '#a855f7' },
    { icon: '5️⃣', title: t('integrationHub.guideStep5Title'), desc: t('integrationHub.guideStep5Desc'), color: '#ec4899' },
    { icon: '6️⃣', title: t('integrationHub.guideStep6Title'), desc: t('integrationHub.guideStep6Desc'), color: '#14d9b0' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', borderColor: '#4f8ef740', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 40 }}>🔗</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('integrationHub.guideTitle')}</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 520, margin: '6px auto 0' }}>{t('integrationHub.guideSub')}</div>
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('integrationHub.guideStepsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ background: s.color + '08', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16, transition: 'transform 150ms, border-color 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '55'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '25'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
          ))}
      </div>
      <div style={{ ...CARD, background: 'rgba(79,142,247,0.04)', borderColor: '#4f8ef730' }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('integrationHub.guideTipsTitle')}</div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
          <li>{t('integrationHub.guideTip1')}</li><li>{t('integrationHub.guideTip2')}</li><li>{t('integrationHub.guideTip3')}</li><li>{t('integrationHub.guideTip4')}</li><li>{t('integrationHub.guideTip5')}</li>
        </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ═══════════════════════════════════════════════════
   MAIN — Enterprise Superium v6.0
   ═══════════════════════════════════════════════════ */
export default function IntegrationHub() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const { isDemo } = useAuth();
  const { addAlert } = useGlobalData();
  const [tab, setTab] = useState('channels');
  const connectedChannels = useConnectedChannels();
  const { connectedCount = 0 } = useConnectorSync?.() || {};
  const [syncTick, setSyncTick] = useState(0);
  const { locked, setLocked } = useSecurityGuard(addAlert);

  // API Keys — auto-load from geniego_api_keys (global array) + geniego_api_keys_map
  const [apiKeys, setApiKeys] = useState(() => {
    const map = {};
    // 1. Load from map store
    try { const s = localStorage.getItem('geniego_api_keys_map'); if (s) Object.assign(map, JSON.parse(s)); } catch {}
    // 2. Auto-load from geniego_api_keys array (회원 프로필 기반)
    try {
      const arr = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]');
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          if (item.service && item.key && !map[item.service.toLowerCase()]) {
            map[item.service.toLowerCase()] = { key: item.key, registered: item.registered || new Date().toISOString(), source: 'auto' };
          }
        });
      }
    } catch {}
    // 3. Auto-load from geniego_channel_* flags
    ['meta','google','tiktok','kakao_moment','naver','coupang','amazon','shopify','gmarket','11st','line','whatsapp','qoo10','rakuten','shopee','cafe24','salesforce','slack'].forEach(ch => {
      try {
        const val = localStorage.getItem(`geniego_channel_${ch}`);
        if (val && !map[ch]) {
          map[ch] = { key: val === 'true' ? `AUTO_${ch.toUpperCase()}_${Date.now()}` : val, registered: new Date().toISOString(), source: 'auto' };
        }
      } catch {}
    });
    return map;
  });
  const [requestingKeys, setRequestingKeys] = useState({});

  const saveKeys = (keys) => {
    setApiKeys(keys);
    try { localStorage.setItem('geniego_api_keys_map', JSON.stringify(keys)); } catch {}
    // Bidirectional sync: update geniego_api_keys array
    try {
      const arr = Object.entries(keys).map(([service, data]) => ({ service, key: data.key, registered: data.registered, source: data.source || 'manual' }));
      localStorage.setItem('geniego_api_keys', JSON.stringify(arr));
    } catch {}
    // Sync channel flags
    for (const [ch, data] of Object.entries(keys)) {
      try { localStorage.setItem(`geniego_channel_${ch}`, data.key || 'true'); } catch {}
    }
  };

  const handleRegister = (channelKey, apiKey) => {
    if (isDemo) { addAlert?.({ type: 'warning', msg: t('integrationHub.demoGuard') }); return; }
    const updated = { ...apiKeys, [channelKey]: { key: apiKey, registered: new Date().toISOString(), source: 'manual' } };
    saveKeys(updated);
    try { new BroadcastChannel('genie_connector_sync').postMessage({ type: 'CHANNEL_REGISTERED', channel: channelKey, ts: Date.now() }); } catch {}
    addAlert?.({ type: 'success', msg: `[IntegrationHub] ${channelKey} ${t('integrationHub.registered')}` });
  };

  const handleRemove = (channelKey) => {
    if (isDemo) { addAlert?.({ type: 'warning', msg: t('integrationHub.demoGuard') }); return; }
    const updated = { ...apiKeys }; delete updated[channelKey];
    saveKeys(updated);
    try { localStorage.removeItem(`geniego_channel_${channelKey}`); } catch {}
    try { new BroadcastChannel('genie_connector_sync').postMessage({ type: 'CHANNEL_REMOVED', channel: channelKey, ts: Date.now() }); } catch {}
    addAlert?.({ type: 'info', msg: `[IntegrationHub] ${channelKey} ${t('integrationHub.removed')}` });
  };

  // API Key Request — 자동 발급 신청 시뮬레이션 (OAuth2 flow)
  const handleRequestKey = (channelKey) => {
    if (isDemo) { addAlert?.({ type: 'warning', msg: t('integrationHub.demoGuard') }); return; }
    setRequestingKeys(prev => ({ ...prev, [channelKey]: true }));
    addAlert?.({ type: 'info', msg: `[IntegrationHub] ${channelKey} ${t('integrationHub.requestSent')}` });
    // Simulate OAuth2 API key issuance (2~4s)
    const delay = 2000 + Math.random() * 2000;
    setTimeout(() => {
      const generatedKey = `gn_${channelKey}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      const updated = { ...apiKeys, [channelKey]: { key: generatedKey, registered: new Date().toISOString(), source: 'auto_issued' } };
      saveKeys(updated);
      setRequestingKeys(prev => { const n = { ...prev }; delete n[channelKey]; return n; });
      try { new BroadcastChannel('genie_connector_sync').postMessage({ type: 'CHANNEL_REGISTERED', channel: channelKey, ts: Date.now() }); } catch {}
      addAlert?.({ type: 'success', msg: `[IntegrationHub] ${channelKey} API Key ${t('integrationHub.autoIssued')}` });
    }, delay);
  };

  // BroadcastChannel 3-channel sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch1 = new BroadcastChannel('genie_connector_sync');
    const ch2 = new BroadcastChannel('genie_product_sync');
    const ch3 = new BroadcastChannel('genie_approval_sync');
    const handler = () => setSyncTick(p => p + 1);
    ch1.onmessage = handler; ch2.onmessage = handler; ch3.onmessage = handler;
    return () => { ch1.close(); ch2.close(); ch3.close(); };
  }, []);
  useEffect(() => {
    const id = setInterval(() => { setSyncTick(p => p + 1); }, 30000);
    return () => clearInterval(id);
  }, []);

  const channels = buildChannels(t);
  const regCount = Object.keys(apiKeys).length;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), registeredChannels: apiKeys, connectedChannels, totalChannels: channels.length }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `integration_hub_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const TABS = [
    { id: 'channels', icon: '🔗', label: t('integrationHub.tabChannels'), desc: t('integrationHub.tabChannelsDesc') },
    { id: 'settings', icon: '⚙', label: t('integrationHub.tabSettings'), desc: t('integrationHub.tabSettingsDesc') },
    { id: 'guide', icon: '📖', label: t('integrationHub.tabGuide'), desc: t('integrationHub.tabGuideDesc') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />
      <div style={{ flexShrink: 0, padding: '14px 16px 0', background: 'var(--surface-1, #070f1a)', zIndex: 10, borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
        {isDemo && (
          <div style={{ padding: '10px 16px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', border: '1.5px solid rgba(79,142,247,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#4f8ef7' }}>{t('integrationHub.demoBanner')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('integrationHub.demoBannerDesc')}</div>
            <button onClick={() => window.location.href='/pricing'} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>{t('integrationHub.upgradeBtn')}</button>
        )}

        <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.07),rgba(168,85,247,0.05))', borderColor: 'rgba(79,142,247,0.18)', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div className="hero-meta">
              <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.28),rgba(168,85,247,0.18))' }}>🔗</div>
              <div>
                <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#a855f7)' }}>{t('integrationHub.heroTitle')}</div>
                <div className="hero-desc">{t('integrationHub.heroDesc')}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: '#22c55e' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} /> {t('integrationHub.badgeRealtime')}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(20,217,176,0.08)', border: '1px solid rgba(20,217,176,0.15)', color: '#14d9b0' }}>
                🛡️ {t('integrationHub.badgeSecurity')}
              <button onClick={handleExport} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.08)', color: '#4f8ef7', cursor: 'pointer', fontWeight: 700, fontSize: 10 }}>📥 {t('integrationHub.export')}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#4f8ef71a', color: '#4f8ef7', border: '1px solid #4f8ef733' }}>{channels.length} {t('integrationHub.totalChannels')}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#22c55e1a', color: '#22c55e', border: '1px solid #22c55e33' }}>🔑 {regCount} {t('integrationHub.registered')}</span>
            {connectedChannels.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#a855f718', color: '#a855f7', border: '1px solid #a855f733' }}>🔗 {connectedChannels.length} {t('integrationHub.channelsLinked')}</span>}
        </div>

        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', padding: '4px 4px 0', borderRadius: '12px 12px 0 0', border: '1px solid rgba(99,140,255,0.06)', borderBottom: 'none' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, padding: '10px 6px', border: 'none', cursor: 'pointer', textAlign: 'center', borderRadius: '8px 8px 0 0',
              background: tab === tb.id ? 'rgba(79,142,247,0.08)' : 'transparent',
              borderBottom: `2px solid ${tab === tb.id ? '#4f8ef7' : 'transparent'}`, transition: 'all 200ms',
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.icon} {tb.label}</div>
              <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 2 }}>{tb.desc}</div>
            </button>
          ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
        {tab === 'channels' && <ChannelsTab t={t} channels={channels} apiKeys={apiKeys} onRegister={handleRegister} onRemove={handleRemove} onRequestKey={handleRequestKey} requestingKeys={requestingKeys} isDemo={isDemo} />}
        {tab === 'settings' && <SettingsTab t={t} />}
        {tab === 'guide' && <GuideTab t={t} />}
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
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
