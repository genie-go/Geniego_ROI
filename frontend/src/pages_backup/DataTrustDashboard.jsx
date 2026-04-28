import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import useSecurityMonitor from '../hooks/useSecurityMonitor.js';

/* ─── Cross-Tab Sync (shared channel) ──────────────────────────────── */
const SYNC_CH = 'geniego_dtrust_sync';
if (!window.__DT_TAB) window.__DT_TAB = Math.random().toString(36).slice(2);

function useCrossTabSync() {
  const chRef = useRef(null);
  useEffect(() => {
    try { chRef.current = new BroadcastChannel(SYNC_CH); } catch { return; }
    return () => { try { chRef.current?.close(); } catch {} };
  }, []);
  const broadcast = useCallback((type, data) => {
    try { chRef.current?.postMessage({ type, data, ts: Date.now(), tab: window.__DT_TAB }); } catch {}
  }, []);
  const onMessage = useCallback((handler) => {
    if (!chRef.current) return () => {};
    const fn = (e) => { if (e.data?.tab !== window.__DT_TAB) handler(e.data); };
    chRef.current.addEventListener('message', fn);
    return () => chRef.current?.removeEventListener('message', fn);
  }, []);
  return { broadcast, onMessage };
}

/* ─── Design Tokens ────────────────────────────────────────────────── */
const C = {
  bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
  border: "var(--border)", accent: '#4f8ef7',
  green: '#22c55e', red: '#f87171', yellow: '#fbbf24',
  purple: '#a78bfa', muted: "var(--text-3)", text: "var(--text-1)",
};
const CARD = { background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 };

/* ─── Data Badge ───────────────────────────────────────────────────── */
export function DataBadge({ level = 'real', size = 'sm', t }) {
  const cfg = {
    real: { label: `● ${t?.('dt.liveData') || 'Live Data'}`, color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.3)' },
    estimated: { label: `~ ${t?.('dt.estimated') || 'Estimated'}`, color: '#eab308', bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.3)' },
    none: { label: `✕ ${t?.('dt.notConnected') || 'Not Connected'}`, color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)' },
  };
  const c = cfg[level] || cfg.none;
  const fs = size === 'xs' ? 9 : size === 'sm' ? 10 : 11;
  return (
    <span style={{ fontSize: fs, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

/* ─── Pixel platform mapping (DT → ConnectorSync key) ─────────────── */
const PIXEL_TO_CONNECTOR = {
  meta_pixel: 'meta_ads',
  google_gtag: 'google_ads',
  naver_pixel: 'naver_sa',
  tiktok_pixel: 'tiktok_business',
  kakao_pixel: 'kakao_moment',
};

/* ═══════════════════════════════════════════════════════════════════════
   Main Component — Data Trust Dashboard (Unified)
   ═══════════════════════════════════════════════════════════════════════ */
export default function DataTrustDashboard() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const gd = useGlobalData();

  // ★ ConnectorSync — single source of truth for connector status
  const cs = useConnectorSync();

  // ★ Shared security monitor (no more copy-paste)
  const { checkInput, checkRate, threats, locked } = useSecurityMonitor('dt');

  const { broadcast, onMessage } = useCrossTabSync();

  const [tab, setTab] = useState('overview');
  const [auditLog, setAuditLog] = useState([]);
  const [scoreHistory, setScoreHistory] = useState(() => {
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => ({ ts: now - (6 - i) * 86400000, score: 0 }));
  });

  // Cross-tab sync listener
  useEffect(() => {
    return onMessage((msg) => {
      if (msg.type === 'dt_tab_change') setTab(msg.data);
    });
  }, [onMessage]);

  // ★ Data sources — unified with ConnectorSyncContext + GlobalDataContext
  const DATA_SOURCES = useMemo(() => {
    const pixelConnected = (pxKey) => cs.isConnected(PIXEL_TO_CONNECTOR[pxKey]);
    return [
      { id: 'inventory', label: t('dt.srcInventory'), icon: '📦', level: gd?.inventory?.length ? 'real' : 'none', desc: t('dt.srcInventoryDesc'), source: gd?.inventory?.length ? 'API' : '' },
      { id: 'orders', label: t('dt.srcOrders'), icon: '📋', level: gd?.orders?.length ? 'real' : 'none', desc: t('dt.srcOrdersDesc'), source: gd?.orders?.length ? 'API' : '' },
      { id: 'ads_roas', label: t('dt.srcAdROAS'), icon: '📈', level: cs.isConnected('meta_ads') || cs.isConnected('google_ads') ? 'real' : gd?.channelBudgets?.length ? 'estimated' : 'none', desc: t('dt.srcAdROASDesc') },
      { id: 'conversion', label: t('dt.srcConversion'), icon: '🛒', level: pixelConnected('meta_pixel') || pixelConnected('google_gtag') ? 'real' : 'none', desc: t('dt.srcConversionDesc') },
      { id: 'crm', label: t('dt.srcCRM'), icon: '👥', level: 'estimated', desc: t('dt.srcCRMDesc') },
      { id: 'settlement', label: t('dt.srcSettlement'), icon: '🧾', level: gd?.settlements?.length ? 'real' : 'estimated', desc: t('dt.srcSettlementDesc'), source: gd?.settlements?.length ? 'API' : '' },
      { id: 'attribution', label: t('dt.srcAttribution'), icon: '🔗', level: pixelConnected('meta_pixel') ? 'real' : 'none', desc: t('dt.srcAttributionDesc') },
      { id: 'pnl', label: t('dt.srcPnL'), icon: '🌊', level: 'estimated', desc: t('dt.srcPnLDesc') },
    ];
  }, [t, gd, cs]);

  // ★ Pixel connectors — for trust score calculation (managed in IntegrationHub)
  const PIXEL_CONNECTORS = ['meta_ads', 'google_ads', 'naver_sa', 'tiktok_business', 'kakao_moment'];

  const realCount = DATA_SOURCES.filter(d => d.level === 'real').length;
  const estCount = DATA_SOURCES.filter(d => d.level === 'estimated').length;
  const noneCount = DATA_SOURCES.filter(d => d.level === 'none').length;
  const pixelConnectedCount = PIXEL_CONNECTORS.filter(c => cs.isConnected(c)).length;
  const trustScore = Math.round(((realCount + pixelConnectedCount * 1.5) / (DATA_SOURCES.length + PIXEL_CONNECTORS.length * 1.5)) * 100);

  // Update score history
  useEffect(() => {
    setScoreHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.score === trustScore) return prev;
      return [...prev.slice(-13), { ts: Date.now(), score: trustScore }];
    });
  }, [trustScore]);

  const addAuditEntry = useCallback((action, detail) => {
    setAuditLog(prev => [{ id: Date.now(), time: new Date().toISOString(), user: user?.email || 'system', action, detail }, ...prev.slice(0, 99)]);
  }, [user]);

  const TABS = [
    { id: 'overview', label: `📊 ${t('dt.tabOverview')}` },
    { id: 'quality', label: `🔬 ${t('dt.tabQuality')}` },
    { id: 'lineage', label: `🗺️ ${t('dt.tabLineage')}` },
    { id: 'history', label: `📈 ${t('dt.tabHistory')}` },
    { id: 'audit', label: `📝 ${t('dt.tabAudit')}` },
    { id: 'guide', label: `📖 ${t('dt.tabGuide')}` },
  ];

  // Security lockdown overlay
  if (locked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ padding: '48px 40px', borderRadius: 24, background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(220,38,38,0.03))', border: '2px solid rgba(239,68,68,0.3)', maxWidth: 480 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🛡️</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('dt.secLockTitle')}</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{t('dt.secLockDesc')}</div>
        </div>
    </div>
);

  return (
    <div style={{ display: 'grid', gap: 18, padding: '0 0 40px 0' }}>
      {/* ────── Header ────── */}
      <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))', borderColor: 'rgba(34,197,94,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: C.text, marginBottom: 4 }}>🔬 {t('dt.heroTitle')}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{t('dt.heroDesc')}</div>
          <div style={{ textAlign: 'center', padding: '14px 22px', borderRadius: 14, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{t('dt.trustScore')}</div>
            <div style={{ fontWeight: 900, fontSize: 32, color: trustScore > 60 ? '#22c55e' : trustScore > 40 ? '#eab308' : '#ef4444', lineHeight: 1 }}>{trustScore}</div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>/ 100</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 16 }}>
          {[
            { label: `✅ ${t('dt.liveData')}`, value: realCount, color: '#22c55e' },
            { label: `~ ${t('dt.estimated')}`, value: estCount, color: '#eab308' },
            { label: `✕ ${t('dt.notConnected')}`, value: noneCount, color: '#ef4444' },
            { label: `🔌 ${t('dt.tabPixel')}`, value: `${pixelConnectedCount}/${PIXEL_CONNECTORS.length}`, color: '#4f8ef7' },
          ].map(k => (
            <div key={k.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
          </div>
          ))}
      </div>

      {/* ────── Tab Bar ────── */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              flex: 1, padding: '13px 8px', border: 'none', cursor: 'pointer', textAlign: 'center',
              background: tab === tb.id ? 'rgba(99,102,241,0.08)' : 'transparent',
              borderBottom: `2px solid ${tab === tb.id ? '#6366f1' : 'transparent'}`,
              fontSize: 12, fontWeight: 800, color: tab === tb.id ? C.text : C.muted, transition: 'all 200ms',
            }}>{tb.label}</button>
          ))}
      </div>

      {/* ────── Tab Content ────── */}
      <div style={CARD}>
        {/* ═══ Overview Tab ═══ */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📦 {t('dt.sourceOverview')}</div>
            {DATA_SOURCES.map(ds => (
              <div key={ds.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{ds.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{ds.label}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{ds.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {ds.source && <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{ds.source}</span>}
                  <DataBadge level={ds.level} t={t} />
                  {ds.level === 'none' && (
                    <button onClick={() => navigate('/integration-hub?tab=smart')} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                      {t('dt.setupIntegration')} →
                    </button>
                  )}
              </div>
            ))}
            {/* Improvement Guide */}
            <div style={{ marginTop: 8, padding: '14px 18px', borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#4f8ef7', marginBottom: 8 }}>🎯 {t('dt.improveTitle')}</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {[
                  { icon: '1', text: t('dt.improveStep1'), btn: `${t('dt.tabPixel')} →`, action: '/integration-hub?tab=smart' },
                  { icon: '2', text: t('dt.improveStep2'), btn: `${t('dt.tabPixel')} →`, action: '/integration-hub?tab=smart' },
                  { icon: '3', text: t('dt.improveStep3'), btn: `API Settings →`, action: '/integration-hub?tab=keys' },
                ].map(g => (
                  <div key={g.icon} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: C.muted }}>
                    <span><strong style={{ color: '#4f8ef7' }}>{g.icon}.</strong> {g.text}</span>
                    <button onClick={() => navigate(g.action)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{g.btn}</button>
                </div>
                ))}
            </div>
        )}


        {/* ═══ Quality Standards Tab ═══ */}
        {tab === 'quality' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>🔬 {t('dt.qualityTitle')}</div>
            {[
              { level: 'real', title: t('dt.qualityLiveTitle'), color: '#22c55e', bg: 'rgba(34,197,94,0.06)', desc: t('dt.qualityLiveDesc'), examples: [t('dt.qualityLiveEx1'), t('dt.qualityLiveEx2'), t('dt.qualityLiveEx3'), t('dt.qualityLiveEx4')] },
              { level: 'estimated', title: t('dt.qualityEstTitle'), color: '#eab308', bg: 'rgba(234,179,8,0.06)', desc: t('dt.qualityEstDesc'), examples: [t('dt.qualityEstEx1'), t('dt.qualityEstEx2'), t('dt.qualityEstEx3'), t('dt.qualityEstEx4')] },
              { level: 'none', title: t('dt.qualityNoneTitle'), color: '#ef4444', bg: 'rgba(239,68,68,0.06)', desc: t('dt.qualityNoneDesc'), examples: [t('dt.qualityNoneEx1'), t('dt.qualityNoneEx2')] },
            ].map(q => (
              <div key={q.level} style={{ padding: '16px 18px', borderRadius: 12, background: q.bg, border: `1px solid ${q.color}22` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <DataBadge level={q.level} size="md" t={t} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: q.color }}>{q.title}</span>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>{q.desc}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {q.examples.map(ex => (
                    <span key={ex} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${q.color}12`, color: q.color, border: `1px solid ${q.color}22` }}>{ex}</span>
                  ))}
              </div>
            ))}
        )}

        {/* ═══ Lineage Map Tab ═══ */}
        {tab === 'lineage' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>🗺️ {t('dt.lineageTitle')}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{t('dt.lineageDesc')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, alignItems: 'center' }}>
              {/* Layer 1: Sources */}
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.accent, textAlign: 'center', marginBottom: 4 }}>{t('dt.lineageSources')}</div>
                {[
                  { icon: '📘', name: 'Meta CAPI', color: '#1877f2', key: 'meta_ads' },
                  { icon: '🔍', name: 'GA4', color: '#4285f4', key: 'google_ads' },
                  { icon: '🟩', name: 'Naver', color: '#03c75a', key: 'naver_sa' },
                  { icon: '📋', name: t('dt.srcOrders'), color: '#eab308' },
                  { icon: '📦', name: t('dt.srcInventory'), color: '#22c55e' },
                ].map(s => (
                  <div key={s.name} style={{ padding: '6px 8px', borderRadius: 8, background: `${s.color}10`, border: `1px solid ${s.key && cs.isConnected(s.key) ? s.color : s.color + '30'}`, fontSize: 10, fontWeight: 700, color: s.color, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', opacity: s.key && !cs.isConnected(s.key) ? 0.5 : 1 }}>
                    <span>{s.icon}</span> {s.name}
                ))}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => (<div key={i} style={{ fontSize: 14, color: C.muted, opacity: 0.6 }}>→</div>))}
              {/* Layer 2: Processing */}
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#a78bfa', textAlign: 'center', marginBottom: 4 }}>{t('dt.lineageProcessing')}</div>
                {[
                  { icon: '⚙️', name: t('dt.lineageValidation'), color: '#a78bfa' },
                  { icon: '🔄', name: t('dt.lineageNormalization'), color: '#8b5cf6' },
                  { icon: '🧮', name: t('dt.lineageAggregation'), color: '#7c3aed' },
                  { icon: '🛡️', name: t('dt.lineageSecCheck'), color: '#ef4444' },
                  { icon: '📊', name: t('dt.lineageScoring'), color: '#22c55e' },
                ].map(p => (
                  <div key={p.name} style={{ padding: '6px 8px', borderRadius: 8, background: `${p.color}10`, border: `1px solid ${p.color}30`, fontSize: 10, fontWeight: 700, color: p.color, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <span>{p.icon}</span> {p.name}
                ))}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {Array.from({ length: 5 }).map((_, i) => (<div key={i} style={{ fontSize: 14, color: C.muted, opacity: 0.6 }}>→</div>))}
              {/* Layer 3: Outputs */}
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', textAlign: 'center', marginBottom: 4 }}>{t('dt.lineageOutputs')}</div>
                {[
                  { icon: '📊', name: t('dt.lineageDashboard'), color: '#4f8ef7' },
                  { icon: '🎯', name: 'ROAS', color: '#22c55e' },
                  { icon: '🌊', name: 'P&L', color: '#eab308' },
                  { icon: '👥', name: 'CRM', color: '#a78bfa' },
                  { icon: '🔬', name: t('dt.trustScore'), color: '#22c55e' },
                ].map(o => (
                  <div key={o.name} style={{ padding: '6px 8px', borderRadius: 8, background: `${o.color}10`, border: `1px solid ${o.color}30`, fontSize: 10, fontWeight: 700, color: o.color, textAlign: 'center', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <span>{o.icon}</span> {o.name}
                </div>
                ))}
            </div>
            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.accent, marginBottom: 8 }}>📋 {t('dt.lineageSummary')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { value: realCount, label: t('dt.lineageRealSources'), color: '#22c55e', bg: 'rgba(34,197,94,0.06)' },
                  { value: estCount, label: t('dt.lineageEstSources'), color: '#eab308', bg: 'rgba(234,179,8,0.06)' },
                  { value: noneCount, label: t('dt.lineageNoneSources'), color: '#ef4444', bg: 'rgba(239,68,68,0.06)' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: 10, borderRadius: 8, background: s.bg }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
                </div>
                ))}
            </div>
        )}

        {/* ═══ History Chart Tab ═══ */}
        {tab === 'history' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>📈 {t('dt.historyTitle')}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{t('dt.historyDesc')}</div>
            <div style={{ padding: '20px 16px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180 }}>
                {scoreHistory.map((entry, i) => {
                  const h = Math.max(entry.score * 1.6, 4);
                  const col = entry.score > 60 ? '#22c55e' : entry.score > 40 ? '#eab308' : entry.score > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)';
                  const d = new Date(entry.ts);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: col }}>{entry.score}</div>
                      <div style={{ width: '100%', height: h, borderRadius: 6, background: `linear-gradient(180deg, ${col}, ${col}66)`, transition: 'height 0.5s ease' }} />
                      <div style={{ fontSize: 8, color: C.muted }}>{`${d.getMonth() + 1}/${d.getDate()}`}</div>
                  
                  
      </div>
);
                })}
        
      </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: t('dt.historyCurrentScore'), value: trustScore, color: trustScore > 60 ? '#22c55e' : trustScore > 40 ? '#eab308' : '#ef4444', bg: 'rgba(34,197,94,0.06)', bc: 'rgba(34,197,94,0.2)' },
                { label: t('dt.historyPeakScore'), value: Math.max(...scoreHistory.map(h => h.score)), color: '#4f8ef7', bg: 'rgba(79,142,247,0.06)', bc: 'rgba(79,142,247,0.2)' },
                { label: t('dt.historyDataPoints'), value: scoreHistory.length, color: '#a78bfa', bg: 'rgba(167,139,250,0.06)', bc: 'rgba(167,139,250,0.2)' },
              ].map(k => (
                <div key={k.label} style={{ flex: 1, padding: '16px 20px', borderRadius: 12, background: k.bg, border: `1px solid ${k.bc}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: k.color }}>{k.value}</div>
              </div>
              ))}
          </div>
        )}

        {/* ═══ Audit Log Tab ═══ */}
        {tab === 'audit' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>📝 {t('dt.auditTitle')}</div>
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 8 }}>{t('dt.auditBridgeTitle', '통합 감사 로그 센터')}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, maxWidth: 420, margin: '0 auto', marginBottom: 20 }}>{t('dt.auditBridgeDesc', '전체 시스템 이벤트·위험도 분류·타임라인 뷰를 포함한 감사 로그는 전용 모듈에서 확인하세요.')}</div>
              <button onClick={() => navigate('/audit')} style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', color: 'var(--text-1)', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 20px rgba(167,139,250,0.3)', transition: 'transform 0.15s', }}>
                🧾 {t('dt.auditBridgeBtn', '감사 로그 센터로 이동')} →
              </button>
          </div>
        )}

        {/* ═══ Guide Tab ═══ */}
        {tab === 'guide' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.05))', padding: '32px 28px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.12)', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔬</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, color: C.text }}>{t('dt.guideTitle')}</h2>
              <p style={{ color: C.muted, fontSize: 13 }}>{t('dt.guideSub')}</p>
            <div style={{ ...CARD, borderColor: 'rgba(34,197,94,0.15)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#22c55e' }}>📋 {t('dt.guideStepsTitle')}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{ padding: 16, borderRadius: 14, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, background: 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: 'var(--text-1)' }}>{i}</span>
                      <span style={{ fontWeight: 800, fontSize: 13, color: i<=2?'#22c55e':i<=4?'#4f8ef7':'#a78bfa' }}>{t(`dt.guideStep${i}Title`)}</span>
                    <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: 0 }}>{t(`dt.guideStep${i}Desc`)}</p>
                ))}
            </div>
            <div style={{ ...CARD, borderColor: 'rgba(79,142,247,0.15)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#4f8ef7' }}>🗂 {t('dt.guideRolesTitle')}</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[{k:'TrustScore',emoji:'🎯',c:'#22c55e'},{k:'Quality',emoji:'🔬',c:'#eab308'},{k:'Lineage',emoji:'🗺️',c:'#a78bfa'}].map(r => (
                  <div key={r.k} style={{ padding: '12px 16px', borderRadius: 12, background: `${r.c}08`, border: `1px solid ${r.c}22`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>{r.emoji}</span>
                    <span style={{ fontSize: 12, color: C.muted }}>{t(`dt.guideRole${r.k}`)}</span>
                </div>
                ))}
            </div>
            <div style={{ ...CARD, borderColor: 'rgba(34,197,94,0.15)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: '#22c55e' }}>💡 {t('dt.guideTipsTitle')}</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', fontSize: 12, color: C.muted, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: '#22c55e', fontWeight: 900 }}>Tip{i}</span> {t(`dt.guideTip${i}`)}
                </div>
                ))}
            </div>
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
                </div>
            </div>
        </div>
    </div>
