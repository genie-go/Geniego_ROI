import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from '../i18n';
import { getJsonAuth, postJson } from '../services/apiClient.js';
import { IS_DEMO } from '../utils/demoEnv';

/* ═══════════════════════════════════════════════════════════════════
   177차 §4.E TOP 1 본체 + U-177-A: ApiKeys.jsx 실제 ChannelCreds 관리 UI
   • Production: 실 backend /v423/creds + /v423/connectors wire-up
   • Demo: empty list + 시뮬레이션 fallback
   • 절대 cross-contaminate 금지 (운영 → demo 데이터 노출 X)
   ═══════════════════════════════════════════════════════════════════ */
const _IS_DEMO_ENV = IS_DEMO; // 180차: broad includes('demo') 제거 → demoEnv 정본 격리

/* 채널 마스터 — SmartConnect 와 동일 (단순화) */
const CHANNELS = [
  { key: 'meta_ads',         name: 'Meta Ads',          icon: '📘', color: '#1877F2', group: 'global_ad' },
  { key: 'google_ads',       name: 'Google Ads',        icon: '🔵', color: '#4285F4', group: 'global_ad' },
  { key: 'tiktok_business',  name: 'TikTok Business',   icon: '🎶', color: '#010101', group: 'global_ad' },
  { key: 'amazon_spapi',     name: 'Amazon SP-API',     icon: '📦', color: '#FF9900', group: 'global_commerce' },
  { key: 'shopify',          name: 'Shopify',           icon: '🛍', color: '#96BF48', group: 'global_commerce' },
  { key: 'rakuten',          name: 'Rakuten',           icon: '🛒', color: '#BF0000', group: 'global_commerce' },
  { key: 'qoo10',            name: 'Qoo10',             icon: '🟡', color: '#FF6B00', group: 'global_commerce' },
  { key: 'coupang',          name: 'Coupang Wing',      icon: '🛒', color: '#C02525', group: 'domestic' },
  { key: 'naver_smartstore', name: 'Naver Smart Store', icon: '🟢', color: '#03C75A', group: 'domestic' },
  { key: 'naver_sa',         name: 'Naver Search Ads',  icon: '🟩', color: '#03C75A', group: 'domestic' },
  { key: 'kakao_moment',     name: 'Kakao Moment',      icon: '💛', color: '#FEE500', group: 'domestic' },
  { key: 'st11',             name: '11Street',          icon: '🔶', color: '#FA3E2C', group: 'domestic' },
  { key: 'gmarket',          name: 'Gmarket',           icon: '🟡', color: '#0099CC', group: 'domestic' },
  { key: 'google_analytics', name: 'Google Analytics 4',icon: '📊', color: '#E37400', group: 'own_etc' },
  { key: 'slack',            name: 'Slack Webhook',     icon: '💬', color: '#4A154B', group: 'own_etc' },
];

const STATUS_COLORS = {
  ok:    { bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  fg: '#16a34a' },
  error: { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  fg: '#dc2626' },
  pending:{bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.25)', fg: '#ca8a04' },
  none:  { bg: 'rgba(148,163,184,0.10)',border: 'rgba(148,163,184,0.25)',fg: '#64748b' },
};

/* ─── Toast — 운영 UX 보조 (간단 inline) ───────────────────────── */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((type, msg) => {
    setToast({ type, msg, id: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);
  return { toast, show };
}

/* ─── Error Boundary — 잠재 결함 격리 ───────────────────────────── */
function ErrorFallback({ error, onRetry, t }) {
  return (
    <div role="alert" style={{
      padding: '40px 28px', textAlign: 'center', borderRadius: 16,
      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', margin: '20px 0'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#ef4444', marginBottom: 8 }}>
        {t('ak.errorTitle', 'An error occurred')}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', marginBottom: 16,
        padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)',
        fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 500, margin: '0 auto 16px'
      }}>{error?.message || 'Unknown error'}</div>
      <button onClick={onRetry} aria-label={t('ak.retry','Retry')} style={{
        padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12
      }}>🔄 {t('ak.retry','Retry')}</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════ */
export default function ApiKeys() {
  const { t } = useI18n();
  const { toast, show } = useToast();

  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    t('ak.tabOverview','Overview'),
    t('ak.tabActive','Active Keys'),
    t('ak.tabHistory','Rotation Log'),
    t('ak.tabSettings','Settings'),
    t('ak.tabGuide','이용 가이드'),
  ];

  /* state */
  const [creds, setCreds]       = useState([]);   // GET /v423/creds
  const [summary, setSummary]   = useState({});   // GET /v423/creds/summary
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(null); // channel object or null
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  /* 운영 - 실 backend load; demo - 빈 list */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      if (_IS_DEMO_ENV) {
        // 179차 — 데모 가상 자격증명(체험용, 운영 DB 무저장). 가상으로 API 연동된 상태로 표시해 실제처럼 체험.
        const _d = (h) => new Date(Date.now() - h * 3600000).toISOString();
        const DEMO_CREDS = [
          { id: 'demo-coupang',     channel: 'coupang',          cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(2) },
          { id: 'demo-naver',       channel: 'naver_smartstore', cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(3) },
          { id: 'demo-naversa',     channel: 'naver_sa',         cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(5) },
          { id: 'demo-meta',        channel: 'meta_ads',         cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(1) },
          { id: 'demo-google',      channel: 'google_ads',       cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(4) },
          { id: 'demo-tiktok',      channel: 'tiktok_business',  cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(8) },
          { id: 'demo-kakao',       channel: 'kakao_moment',     cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(6) },
          { id: 'demo-amazon',      channel: 'amazon_spapi',     cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(12) },
          { id: 'demo-ga4',         channel: 'google_analytics', cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(7) },
          { id: 'demo-sendgrid',    channel: 'sendgrid',         cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(9) },
          { id: 'demo-11st',        channel: 'st11',             cred_type: 'api_key', is_active: 1, test_status: 'error', last_tested_at: _d(20) },
        ];
        const DEMO_SUMMARY = {};
        DEMO_CREDS.forEach(c => { DEMO_SUMMARY[c.channel] = { keyCount: c.channel === 'meta_ads' ? 2 : 1, hasRequired: true, is_active: c.is_active, test_status: c.test_status }; });
        if (!cancelled) { setCreds(DEMO_CREDS); setSummary(DEMO_SUMMARY); setLoading(false); }
        return;
      }
      try {
        const [credsRes, sumRes] = await Promise.all([
          getJsonAuth('/v423/creds'),
          getJsonAuth('/v423/creds/summary'),
        ]);
        if (cancelled) return;
        setCreds(Array.isArray(credsRes?.creds) ? credsRes.creds : []);
        setSummary(sumRes?.channels || {});
      } catch (e) {
        if (!cancelled) setLoadError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadTick]);

  const reload = useCallback(() => setReloadTick(x => x + 1), []);

  /* KPI 집계 — 실 데이터 기반 */
  const kpis = useMemo(() => {
    const total   = creds.length;
    const active  = creds.filter(c => Number(c.is_active) === 1).length;
    const errored = creds.filter(c => c.test_status === 'error').length;
    const ok      = creds.filter(c => c.test_status === 'ok').length;
    return [
      { emoji: '🔑', label: t('ak.kpiTotal','Total Keys'),        val: total },
      { emoji: '✅', label: t('ak.kpiActive','Active'),            val: active },
      { emoji: '🟢', label: t('ak.kpiOk','Tested OK'),             val: ok },
      { emoji: '🔴', label: t('ak.kpiErrored','Failed Tests'),     val: errored },
    ];
  }, [creds, t]);

  /* ────────────────────────────── handlers */

  // POST /v423/creds — upsert
  const handleSaveCred = useCallback(async (form) => {
    if (_IS_DEMO_ENV) {
      show('info', t('ak.demoLocked','Demo mode — saving disabled'));
      return false;
    }
    try {
      const r = await postJson('/v423/creds', form);
      if (!r?.ok) throw new Error(r?.error || 'save failed');
      show('success', t('ak.saved','Credential saved'));
      reload();
      return true;
    } catch (e) {
      show('error', String(e?.message || e));
      return false;
    }
  }, [show, t, reload]);

  // DELETE /v423/creds/{id}
  const handleDelete = useCallback(async (id) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked','Demo mode — deletion disabled')); return; }
    if (!window.confirm(t('ak.confirmDelete','Delete this credential?'))) return;
    setDeletingId(id);
    try {
      const base = import.meta.env.VITE_API_BASE || '';
      const tok  = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
      const res = await fetch(`${base}/v423/creds/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tok}`, 'X-Tenant-ID': localStorage.getItem('tenantId') || '' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      show('success', t('ak.deleted','Credential deleted'));
      reload();
    } catch (e) {
      show('error', String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  }, [show, t, reload]);

  // POST /v423/creds/{id}/test
  const handleTest = useCallback(async (id) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked','Demo mode — test disabled')); return; }
    setTestingId(id);
    try {
      const r = await postJson(`/v423/creds/${id}/test`, {});
      const msg = r?.message || (r?.ok ? 'OK' : 'Failed');
      show(r?.ok ? 'success' : 'error', `[${r?.channel || '?'}] ${msg}`);
      reload();
    } catch (e) {
      show('error', String(e?.message || e));
    } finally {
      setTestingId(null);
    }
  }, [show, t, reload]);

  // POST /v423/connectors/{channel}/test — 채널 ping
  const handleChannelTest = useCallback(async (channelKey) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked','Demo mode — channel ping disabled')); return; }
    setTestingId(`ch_${channelKey}`);
    try {
      const r = await postJson(`/v423/connectors/${encodeURIComponent(channelKey)}/test`, {});
      show(r?.ok ? 'success' : 'error', `[${channelKey}] ${r?.message || (r?.ok ? 'OK' : 'Failed')}`);
      reload();
    } catch (e) {
      show('error', String(e?.message || e));
    } finally {
      setTestingId(null);
    }
  }, [show, t, reload]);

  // POST /v423/connectors/apply
  const handleApplySubmit = useCallback(async (channelKey, memberInfo) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked','Demo mode — apply disabled')); return false; }
    try {
      const r = await postJson('/v423/connectors/apply', {
        channel: channelKey,
        member_name:  memberInfo.name    || '',
        member_email: memberInfo.email   || '',
        business_number: memberInfo.businessNumber || '',
        phone:   memberInfo.phone   || '',
        company: memberInfo.company || '',
        requested_at: new Date().toISOString(),
      });
      if (!r?.ok) throw new Error(r?.error || 'apply failed');
      show('success', t('ak.applied', { ticket: r?.ticket_id || r?.ticketId || '', defaultValue: `Application submitted (ticket ${r?.ticket_id || r?.ticketId || ''})` }));
      setShowApplyModal(null);
      return true;
    } catch (e) {
      show('error', String(e?.message || e));
      return false;
    }
  }, [show, t]);

  /* ────────────────────────────── render */

  if (loadError) return <ErrorFallback error={{ message: loadError }} onRetry={reload} t={t} />;

  return (
    <div style={{ padding: 24, minHeight: '100%', color: 'var(--text-1, #1e293b)' }}>
      {/* Hero */}
      <div style={{
        borderRadius: 18, padding: '28px 32px', marginBottom: 22,
        background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))',
        border: '1px solid rgba(79,142,247,0.12)', backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }} aria-hidden>🔑</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{t('ak.heroTitle','API Key Manager')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3, #64748b)', marginTop: 2 }}>
                {t('ak.heroDesc','Manage all channel credentials, run ping tests, and apply for new keys')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={_IS_DEMO_ENV}
              aria-label={t('ak.addBtn','Add new credential')}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: _IS_DEMO_ENV ? 'not-allowed' : 'pointer',
                background: _IS_DEMO_ENV ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                color: '#fff', fontWeight: 700, fontSize: 12, opacity: _IS_DEMO_ENV ? 0.6 : 1
              }}>➕ {t('ak.addBtn','Add Key')}</button>
            <button onClick={reload} aria-label={t('ak.reload','Reload')} style={{
              padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.25)', cursor: 'pointer',
              background: 'rgba(79,142,247,0.05)', color: 'var(--text-2)', fontWeight: 600, fontSize: 12
            }}>🔄 {t('ak.reload','Reload')}</button>
          </div>
        </div>

        {_IS_DEMO_ENV && (
          <div role="status" style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)',
            fontSize: 11, color: '#ca8a04', fontWeight: 600
          }}>
            ⚠️ {t('ak.demoBanner','Demo mode — credentials are not persisted to production database')}
          </div>
        )}
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            borderRadius: 14, padding: '18px 20px',
            background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }} aria-hidden>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{loading ? '…' : k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div role="tablist" style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12,
        background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)'
      }}>
        {tabs.map((tab, i) => (
          <button key={i} role="tab" aria-selected={activeTab === i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
            background: activeTab === i ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
            color: activeTab === i ? '#fff' : 'var(--text-2)'
          }}>{tab}</button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 0 && (
        <OverviewTab
          channels={CHANNELS}
          summary={summary}
          creds={creds}
          loading={loading}
          onChannelTest={handleChannelTest}
          onApply={(ch) => setShowApplyModal(ch)}
          testingId={testingId}
          t={t}
        />
      )}
      {activeTab === 1 && (
        <ActiveKeysTab
          creds={creds}
          channels={CHANNELS}
          loading={loading}
          onTest={handleTest}
          onDelete={handleDelete}
          onAddClick={() => setShowAddModal(true)}
          testingId={testingId}
          deletingId={deletingId}
          t={t}
        />
      )}
      {activeTab === 2 && (<HistoryTab creds={creds} loading={loading} t={t} />)}
      {activeTab === 3 && (<SettingsTab t={t} />)}
      {activeTab === 4 && (() => {
        // 184차 #5: enterprise 패턴 렌더러(CRM/OmniChannel/PriceOpt/Kakao/Email/CampaignMgr/JourneyBuilder 정본 동일, NS=ak).
        const g = (k) => { const v = t('ak.' + k, ''); return (v && !String(v).includes('ak.')) ? v : ''; };
        const COLORS = ['#4f8ef7','#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48'];
        const ICONS = ['🔗','🪪','🔌','🔑','🧪','✅','🔄','📊','🛡️','📜','⚙️','🔐'];
        const steps = []; for (let i = 1; i <= 12; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[(i - 1) % ICONS.length], color: COLORS[(i - 1) % COLORS.length], n: i }); }
        const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
        const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
        const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
        const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
        const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
        const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
        return (
        <div style={{ display: 'grid', gap: 18, color: '#1e293b' }}>
          <div style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderRadius: 16, border: '1px solid #c7d2fe', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#1e293b', marginBottom: 6, letterSpacing: '-0.02em', WebkitTextFillColor: '#1e293b' }}>{t('ak.guideTitle')}</div>
            <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{t('ak.guideSub')}</div>
            {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
            </div>}
          </div>
          {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
          {steps.length > 0 && <div style={card}>
            {g('guideStepsTitle') ? <div style={secTitle}>🚀 {g('guideStepsTitle')}</div> : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {steps.map((s) => (
                <div key={s.n} style={{ padding: '16px 18px', borderRadius: 14, background: s.color + '08', border: '1px solid ' + s.color + '22', display: 'flex', gap: 14, alignItems: 'start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '15', border: '1px solid ' + s.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    {s.phase ? <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + '20', padding: '2px 8px', borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>}
          {tips.length > 0 && <div style={{ ...card, background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.25)' }}>
            <div style={secTitle}>💡 {t('ak.guideTipsTitle')}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {tips.map((tip, i) => (<div key={i} style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 12.5, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}><span style={{ color: '#22c55e', fontWeight: 900, WebkitTextFillColor: '#22c55e' }}>✓</span><span>{tip}</span></div>))}
            </div>
          </div>}
          {faqs.length > 0 && <div style={card}>
            <div style={secTitle}>❓ {t('ak.guideFaqTitle')}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {faqs.map((f, i) => (<div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: 10 }}><div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 4, WebkitTextFillColor: '#1e293b' }}>Q. {f.q}</div><div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.7, WebkitTextFillColor: '#475569' }}>{f.a}</div></div>))}
            </div>
          </div>}
          {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={secTitle}>🔒 {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
          {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🛠️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
          {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderRadius: 16, border: '1px solid #c7d2fe', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#1e293b', marginBottom: 8, WebkitTextFillColor: '#1e293b' }}>🎉 {g('guideReadyTitle')}</div>
            <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.8, fontWeight: 500, whiteSpace: 'pre-line', maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyDesc')}</div>
          </div> : null}
        </div>
        );
      })()}

      {/* Modals */}
      {showAddModal && (
        <AddCredModal channels={CHANNELS} onClose={() => setShowAddModal(false)} onSubmit={handleSaveCred} t={t} />
      )}
      {showApplyModal && (
        <ApplyModal channel={showApplyModal} onClose={() => setShowApplyModal(null)} onSubmit={handleApplySubmit} t={t} />
      )}

      {/* Toast */}
      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999, maxWidth: 360,
          padding: '12px 18px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(79,142,247,0.95)',
          color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 12px 36px rgba(0,0,0,0.3)'
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Overview — 채널별 등록 현황 + Quick actions
   ═══════════════════════════════════════════════════════════════════ */
function OverviewTab({ channels, summary, creds, loading, onChannelTest, onApply, testingId, t }) {
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading','Loading…')}</div>;
  }
  if (creds.length === 0 && Object.keys(summary).length === 0) {
    return (
      <div style={{
        padding: '48px 28px', textAlign: 'center', borderRadius: 16,
        background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)'
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>🔑</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t('ak.emptyTitle','No credentials registered yet')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {t('ak.emptyHint','Click "Add Key" above or apply for a new channel below')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {channels.map(ch => {
        const sum = summary[ch.key] || { keyCount: 0, hasRequired: false };
        const live = sum.hasRequired;
        const sc = STATUS_COLORS[live ? 'ok' : 'none'];
        const busy = testingId === `ch_${ch.key}`;
        return (
          <div key={ch.key} style={{
            borderRadius: 14, padding: 18,
            background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)',
            borderLeft: `3px solid ${ch.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }} aria-hidden>{ch.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{ch.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                  {t('ak.keyCount', { count: sum.keyCount, defaultValue: `${sum.keyCount} key(s)` })}
                </div>
              </div>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 20,
                background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, fontWeight: 700
              }}>{live ? t('ak.live','LIVE') : t('ak.empty','EMPTY')}</span>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onChannelTest(ch.key)} disabled={busy || !live} aria-label={t('ak.testBtn','Ping test')} style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: (busy || !live) ? 'not-allowed' : 'pointer',
                background: live ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(148,163,184,0.2)',
                color: live ? '#fff' : 'var(--text-3)', fontSize: 11, fontWeight: 700,
                opacity: busy ? 0.6 : 1
              }}>{busy ? `⏳ ${t('ak.testing','Testing…')}` : `🔌 ${t('ak.testBtn','Test')}`}</button>
              <button onClick={() => onApply(ch)} aria-label={t('ak.applyBtn','Apply for key')} style={{
                flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.25)',
                cursor: 'pointer', background: 'rgba(79,142,247,0.05)', color: 'var(--text-2)',
                fontSize: 11, fontWeight: 700
              }}>📝 {t('ak.applyBtn','Apply')}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Active Keys — creds table
   ═══════════════════════════════════════════════════════════════════ */
function ActiveKeysTab({ creds, channels, loading, onTest, onDelete, onAddClick, testingId, deletingId, t }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading','Loading…')}</div>;
  if (creds.length === 0) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center', borderRadius: 16, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>🔑</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t('ak.emptyTitle','No credentials registered yet')}</div>
        <button onClick={onAddClick} style={{
          marginTop: 14, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12
        }}>➕ {t('ak.addBtn','Add Key')}</button>
      </div>
    );
  }

  const chMap = Object.fromEntries(channels.map(c => [c.key, c]));

  return (
    <div style={{ borderRadius: 16, padding: 0, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(79,142,247,0.06)', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colChannel','Channel')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colKeyName','Key Name')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colValue','Value (masked)')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colStatus','Status')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colLastTest','Last Tested')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>{t('ak.colActions','Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {creds.map(c => {
            const ch = chMap[c.channel] || { name: c.channel, icon: '❓', color: '#94a3b8' };
            const sc = STATUS_COLORS[c.test_status || 'none'];
            const busyT = testingId === c.id;
            const busyD = deletingId === c.id;
            return (
              <tr key={c.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ marginRight: 6 }} aria-hidden>{ch.icon}</span>
                  <span style={{ fontWeight: 700 }}>{ch.name}</span>
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace' }}>{c.key_name}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--text-3)' }}>{c.key_value_masked || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, fontWeight: 700 }}>
                    {(c.test_status || t('ak.statusUntested','untested')).toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 11 }}>
                  {c.last_tested_at ? new Date(c.last_tested_at).toLocaleString() : '—'}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button onClick={() => onTest(c.id)} disabled={busyT} aria-label={t('ak.testBtn','Ping test')} style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: busyT ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 10, fontWeight: 700,
                    marginRight: 6, opacity: busyT ? 0.6 : 1
                  }}>{busyT ? '⏳' : '🔌'} {t('ak.testBtn','Test')}</button>
                  <button onClick={() => onDelete(c.id)} disabled={busyD} aria-label={t('ak.deleteBtn','Delete credential')} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                    cursor: busyD ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.06)', color: '#dc2626',
                    fontSize: 10, fontWeight: 700, opacity: busyD ? 0.6 : 1
                  }}>{busyD ? '⏳' : '🗑️'} {t('ak.deleteBtn','Delete')}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Rotation Log — last_tested_at 기반 simple history
   ═══════════════════════════════════════════════════════════════════ */
function HistoryTab({ creds, loading, t }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading','Loading…')}</div>;
  const tested = creds
    .filter(c => c.last_tested_at)
    .slice()
    .sort((a, b) => String(b.last_tested_at).localeCompare(String(a.last_tested_at)))
    .slice(0, 30);
  if (tested.length === 0) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center', borderRadius: 16, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>📜</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{t('ak.historyEmpty','No test history yet')}</div>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 16, padding: 18, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{t('ak.historyTitle','Recent Test History (top 30)')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tested.map(c => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(0,0,0,0.02)', fontSize: 11
          }}>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-3)', minWidth: 140 }}>
              {new Date(c.last_tested_at).toLocaleString()}
            </span>
            <span style={{ fontWeight: 700, flex: 1 }}>{c.channel}</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-3)' }}>{c.key_name}</span>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 6,
              background: STATUS_COLORS[c.test_status || 'none'].bg,
              color:      STATUS_COLORS[c.test_status || 'none'].fg, fontWeight: 700
            }}>{(c.test_status || 'untested').toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Settings — placeholder (별도 backend endpoint 미신설)
   ═══════════════════════════════════════════════════════════════════ */
function SettingsTab({ t }) {
  return (
    <div style={{ borderRadius: 16, padding: 28, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{t('ak.settingsTitle','Credential Settings')}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
        {t('ak.settingsDesc','Auto-rotation and notification policies for stored credentials')}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 12, lineHeight: 1.9 }}>
        <li>{t('ak.settingItem1','Auto-rotation scheduling — coming soon (backend endpoint pending)')}</li>
        <li>{t('ak.settingItem2','Expiry alerts — coming soon')}</li>
        <li>{t('ak.settingItem3','Usage analytics per key — coming soon')}</li>
        <li>{t('ak.settingItem4','Revoke & regenerate — coming soon')}</li>
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modal: Add Credential
   ═══════════════════════════════════════════════════════════════════ */
function AddCredModal({ channels, onClose, onSubmit, t }) {
  const [form, setForm] = useState({
    channel: channels[0]?.key || '', cred_type: 'api_key',
    label: '', key_name: '', key_value: '', note: ''
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.channel || !form.key_name) {
      alert(t('ak.requiredFields','Channel and key_name are required'));
      return;
    }
    setBusy(true);
    const ok = await onSubmit(form);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 520, width: '90%', padding: 28, borderRadius: 16,
        background: 'var(--card-bg, #fff)', border: '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>🔑 {t('ak.addModalTitle','Add Credential')}</div>

        <Field label={t('ak.fieldChannel','Channel')}>
          <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={fieldStyle}>
            {channels.map(c => <option key={c.key} value={c.key}>{c.icon} {c.name}</option>)}
          </select>
        </Field>

        <Field label={t('ak.fieldCredType','Type')}>
          <select value={form.cred_type} onChange={e => setForm({ ...form, cred_type: e.target.value })} style={fieldStyle}>
            <option value="api_key">api_key</option>
            <option value="oauth_token">oauth_token</option>
            <option value="hmac">hmac</option>
            <option value="webhook_url">webhook_url</option>
          </select>
        </Field>

        <Field label={t('ak.fieldLabel','Label (optional)')}>
          <input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={fieldStyle} />
        </Field>

        <Field label={t('ak.fieldKeyName','Key Name *')}>
          <input type="text" value={form.key_name} onChange={e => setForm({ ...form, key_name: e.target.value })} style={fieldStyle} placeholder="ACCESS_TOKEN" />
        </Field>

        <Field label={t('ak.fieldKeyValue','Key Value (stored as plain — masked on read)')}>
          <input type="password" value={form.key_value} onChange={e => setForm({ ...form, key_value: e.target.value })} style={fieldStyle} autoComplete="new-password" />
        </Field>

        <Field label={t('ak.fieldNote','Note (optional)')}>
          <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={fieldStyle} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, ...btnGhost }}>{t('ak.cancel','Cancel')}</button>
          <button onClick={submit} disabled={busy} style={{ flex: 1, ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? `⏳ ${t('ak.saving','Saving…')}` : `💾 ${t('ak.save','Save')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modal: Apply for new key
   ═══════════════════════════════════════════════════════════════════ */
function ApplyModal({ channel, onClose, onSubmit, t }) {
  const [info, setInfo] = useState({ name: '', email: '', businessNumber: '', phone: '', company: '' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!info.email) { alert(t('ak.emailRequired','Email is required')); return; }
    setBusy(true);
    await onSubmit(channel.key, info);
    setBusy(false);
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 480, width: '90%', padding: 28, borderRadius: 16,
        background: 'var(--card-bg, #fff)', border: '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 28 }} aria-hidden>{channel.icon}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{t('ak.applyModalTitle',{ ch: channel.name, defaultValue: `Apply for ${channel.name} key` })}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              {t('ak.applyModalSub','We will email the issued key within 1-3 business days')}
            </div>
          </div>
        </div>

        <Field label={t('ak.applyName','Name')}>
          <input type="text" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyEmail','Email *')}>
          <input type="email" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyCompany','Company')}>
          <input type="text" value={info.company} onChange={e => setInfo({ ...info, company: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyBiznum','Business Number')}>
          <input type="text" value={info.businessNumber} onChange={e => setInfo({ ...info, businessNumber: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyPhone','Phone')}>
          <input type="tel" value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} style={fieldStyle} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, ...btnGhost }}>{t('ak.cancel','Cancel')}</button>
          <button onClick={submit} disabled={busy} style={{ flex: 1, ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? `⏳ ${t('ak.applying','Submitting…')}` : `📝 ${t('ak.applySubmit','Submit')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
const fieldStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)', fontSize: 12,
  background: 'rgba(255,255,255,0.95)', color: 'var(--text-1)',
};
const btnPrimary = {
  padding: '10px 18px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12,
};
const btnGhost = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)',
  background: 'transparent', color: 'var(--text-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
};
