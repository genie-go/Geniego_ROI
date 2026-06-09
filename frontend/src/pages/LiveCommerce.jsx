// LiveCommerce.jsx — 라이브 커머스 허브 (208차 신설).
// "라이브 커머스 + OMS + WMS + 멀티송출 + 글로벌 마켓 + OCL 당일배송" 생태계 프론트.
//
// 탭: 🎥 방송 스튜디오 / 📡 실시간 대시보드 / 🛍️ 상품 편성 / 📅 방송 관리
//     / 🔌 채널 연동 / 🤖 AI 쇼호스트 / 🛒 구매하기(시청자) / 📖 이용 가이드
//
// 실시간 동기화 3계층:
//   ① 백엔드 SSE(/v425/live/stream): 채팅·구매·통계 서버 푸시(멀티 시청자) + 폴링 폴백
//   ② BroadcastChannel(GlobalDataContext.placeOrder): 구매 → 재고/주문/정산/CRM/대시보드
//      전 메뉴 즉시 반영(크로스탭)
//   ③ 데모/운영 격리(IS_DEMO): 데모=GlobalData 단일소스, 운영=백엔드 OMS 미러(channel_orders)
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { IS_DEMO } from '../utils/demoEnv.js';
import * as liveApi from '../services/liveApi.js';

/* ───────────────── 멀티송출 & 연동 채널 레지스트리 ───────────────── */
const SNS_CHANNELS = [
  { id: 'youtube', name: 'YouTube Live', icon: '▶️', color: '#ff0000' },
  { id: 'tiktok', name: 'TikTok Shop & Live', icon: '🎵', color: '#000000' },
  { id: 'instagram', name: 'Instagram Live', icon: '📷', color: '#e1306c' },
  { id: 'facebook', name: 'Facebook Live', icon: '👍', color: '#1877f2' },
  { id: 'twitch', name: 'Twitch', icon: '🎮', color: '#9146ff' },
];
const INTEGRATION_GROUPS = [
  { key: 'sns_live', label: 'SNS 라이브 채널', icon: '📡', items: SNS_CHANNELS },
  { key: 'openmarket', label: '국내 오픈마켓', icon: '🛒', items: [
    { id: 'naver', name: '네이버 스마트스토어', icon: '🟢', color: '#03c75a' },
    { id: 'coupang', name: '쿠팡 마켓플레이스', icon: '🔵', color: '#00bae5' },
    { id: '11st', name: '11번가 셀러오피스', icon: '🔴', color: '#ff0000' },
    { id: 'gmarket', name: 'G마켓', icon: '🟠', color: '#e83e0b' },
    { id: 'auction', name: '옥션', icon: '🟡', color: '#ffcc00' },
  ]},
  { key: 'global', label: '글로벌 마켓플레이스', icon: '🌍', items: [
    { id: 'amazon', name: 'Amazon Seller Central', icon: '📦', color: '#ff9900' },
    { id: 'ebay', name: 'eBay Seller Hub', icon: '🛍️', color: '#e53238' },
    { id: 'etsy', name: 'Etsy', icon: '🧶', color: '#f1641e' },
    { id: 'walmart', name: 'Walmart Marketplace', icon: '🏪', color: '#0071dc' },
    { id: 'shopee', name: 'Shopee', icon: '🦐', color: '#ee4d2d' },
    { id: 'lazada', name: 'Lazada', icon: '🛒', color: '#0f146d' },
  ]},
  { key: 'd2c', label: '자사몰 플랫폼(D2C)', icon: '🏬', items: [
    { id: 'shopify', name: 'Shopify', icon: '🟩', color: '#96bf48' },
    { id: 'woocommerce', name: 'WooCommerce', icon: '🟣', color: '#96588a' },
    { id: 'magento', name: 'Magento (Adobe Commerce)', icon: '🟧', color: '#ee672f' },
    { id: 'cafe24', name: 'Cafe24', icon: '☕', color: '#0078ff' },
    { id: 'godomall', name: '고도몰', icon: '🏯', color: '#1c7ed6' },
  ]},
  { key: 'pg', label: '결제(PG) 연동', icon: '💳', items: [
    { id: 'inicis', name: 'KG이니시스', icon: '💳', color: '#1a73e8' },
    { id: 'toss', name: '토스페이먼츠', icon: '🔷', color: '#0064ff' },
    { id: 'kcp', name: 'NHN KCP', icon: '💠', color: '#00a0e9' },
    { id: 'kakaopay', name: '카카오페이', icon: '🟡', color: '#ffcd00' },
    { id: 'naverpay', name: '네이버페이', icon: '🟢', color: '#03c75a' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', color: '#003087' },
    { id: 'stripe', name: 'Stripe', icon: '💜', color: '#635bff' },
  ]},
  { key: 'logistics', label: '물류 및 배송 (OCL 당일배송)', icon: '🚚', items: [
    { id: 'cj', name: 'CJ대한통운', icon: '🚛', color: '#7a3a96' },
    { id: 'lotte', name: '롯데글로벌로지스', icon: '🚚', color: '#da291c' },
    { id: 'hanjin', name: '한진택배', icon: '📦', color: '#0067ac' },
    { id: 'logen', name: '로젠택배', icon: '🚐', color: '#f37021' },
    { id: 'ocl_sameday', name: 'OCL 당일배송 ★', icon: '⚡', color: '#16a34a' },
    { id: 'fulfillment', name: '풀필먼트(3PL)', icon: '🏭', color: '#0891b2' },
  ]},
  { key: 'crm', label: 'CRM 및 마케팅', icon: '🤝', items: [
    { id: 'hubspot', name: 'HubSpot', icon: '🟠', color: '#ff7a59' },
    { id: 'salesforce', name: 'Salesforce', icon: '☁️', color: '#00a1e0' },
    { id: 'mailchimp', name: 'Mailchimp', icon: '🐵', color: '#ffe01b' },
    { id: 'klaviyo', name: 'Klaviyo', icon: '📧', color: '#000000' },
  ]},
  { key: 'ai', label: 'AI 기능 연동', icon: '🤖', items: [
    { id: 'openai', name: 'OpenAI', icon: '🧠', color: '#10a37f' },
    { id: 'gemini', name: 'Google Gemini', icon: '✨', color: '#4285f4' },
    { id: 'claude', name: 'Anthropic Claude', icon: '🟤', color: '#d97757' },
  ]},
];
const ALL_CHANNEL_META = INTEGRATION_GROUPS.flatMap(g => g.items.map(it => ({ ...it, category: g.key })));
const channelMeta = (id) => ALL_CHANNEL_META.find(c => c.id === id) || { id, name: id, icon: '🔌', color: '#64748b' };

// 라이브 채널 id → 기존 자격증명 시스템(channel_credential) 채널 키. 연결상태 SSOT(ConnectorSync) 조회용.
const CREDS_KEY = {
  youtube: 'youtube', tiktok: 'tiktok_business', instagram: 'instagram', facebook: 'facebook', twitch: 'twitch',
  naver: 'naver_smartstore', coupang: 'coupang', '11st': 'st11', gmarket: 'gmarket', auction: 'auction',
  amazon: 'amazon_spapi', ebay: 'ebay', etsy: 'etsy', walmart: 'walmart', shopee: 'shopee', lazada: 'lazada',
  shopify: 'shopify', woocommerce: 'woocommerce', magento: 'magento', cafe24: 'cafe24', godomall: 'godomall',
};
// 그룹 → 등록을 담당하는 기존 메뉴(중복 신설 금지·SSOT 일관성). 라이브 커머스는 현황만 표시하고 등록은 여기로 라우팅.
const GROUP_TARGET = {
  sns_live:   { route: '/integration-hub', menu: '연동 허브', desc: '액세스 토큰 등록(멀티 송출)' },
  openmarket: { route: '/integration-hub', menu: '연동 허브', desc: '판매채널 자격증명 등록' },
  global:     { route: '/integration-hub', menu: '연동 허브', desc: '글로벌 마켓 자격증명 등록' },
  d2c:        { route: '/integration-hub', menu: '연동 허브', desc: '자사몰 API 자격증명 등록' },
  pg:         { route: '/pg-config',       menu: '게이트웨이 관리', desc: '결제(PG) 연동·정책 설정' },
  logistics:  { route: '/wms-manager',     menu: 'WMS 재고관리', desc: '택배사·OCL 당일배송 등록(Carriers 탭)' },
  crm:        { route: '/crm',             menu: 'CRM 대시보드', desc: '고객·마케팅 연동(기존 메뉴)' },
  ai:         { route: '/integration-hub', menu: '연동 허브', desc: 'AI 키 등록(쇼호스트·번역·생성)' },
};

/* ───────────────── 공통 UI ───────────────── */
const C = { card: '#ffffff', border: '#e5e7eb', text: '#1e293b', sub: '#64748b', accent: '#7c3aed', live: '#ef4444' };
function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, ...style }}>{children}</div>;
}
function Btn({ children, onClick, color = C.accent, small, ghost, disabled }) {
  return <button onClick={onClick} disabled={disabled} style={{
    padding: small ? '5px 12px' : '8px 18px', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700, fontSize: small ? 11 : 13, opacity: disabled ? 0.5 : 1,
    border: ghost ? `1px solid ${color}` : 'none', color: ghost ? color : '#fff',
    background: ghost ? 'transparent' : `linear-gradient(135deg,${color},${color}cc)`,
  }}>{children}</button>;
}
function Stat({ label, value, color = C.text, sub }) {
  return <Card style={{ flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 900, color, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{sub}</div>}
  </Card>;
}
function Pill({ on, children, onClick, color = C.accent }) {
  return <button onClick={onClick} style={{
    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
    border: `1px solid ${on ? color : C.border}`, background: on ? color + '18' : '#fff', color: on ? color : C.sub,
  }}>{children}</button>;
}

/* ───────────────── 실시간 스트림 훅 (SSE + 폴링 폴백) ───────────────── */
function useLiveStream(session, active) {
  const sid = session?.id;
  const isLive = session?.status === 'live';
  const [stats, setStats] = useState(null);
  const [chat, setChat] = useState([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);
  const pollRef = useRef(null);
  const sinceRef = useRef(0);
  const viewerKey = useRef('vk_' + Math.floor(performance.now()).toString(36) + (typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0].toString(36) : ''));

  const pushChat = useCallback((rows) => {
    if (!rows?.length) return;
    setChat(prev => {
      const seen = new Set(prev.map(r => r.id));
      const add = rows.filter(r => !seen.has(r.id));
      add.forEach(r => { if (r.id > sinceRef.current) sinceRef.current = r.id; });
      return [...prev, ...add].slice(-200);
    });
  }, []);

  // 세션 전환 시 초기화
  useEffect(() => { setChat([]); setStats(null); sinceRef.current = 0; }, [sid]);

  useEffect(() => {
    if (!sid || !active) return;
    let stopped = false;

    // SSE 시도
    const startSSE = () => {
      try {
        const es = new EventSource(liveApi.streamUrl(sid, sinceRef.current));
        esRef.current = es;
        es.addEventListener('ready', () => { if (!stopped) setConnected(true); });
        es.addEventListener('stats', (e) => { try { setStats(JSON.parse(e.data)); } catch {} });
        es.addEventListener('chat', (e) => { try { pushChat([JSON.parse(e.data)]); } catch {} });
        es.addEventListener('bye', () => { es.close(); if (!stopped) startSSE(); });
        es.onerror = () => { es.close(); esRef.current = null; setConnected(false); if (!stopped) startPoll(); };
      } catch { startPoll(); }
    };
    // 폴링 폴백
    const startPoll = () => {
      if (pollRef.current) return;
      const tick = async () => {
        try {
          const [s, c] = await Promise.all([liveApi.getStats(sid), liveApi.listChat(sid, sinceRef.current)]);
          if (stopped) return;
          if (s?.stats) setStats(s.stats);
          pushChat(c?.chat || []);
        } catch {}
      };
      tick();
      pollRef.current = setInterval(tick, 3000);
    };

    startSSE();
    // 시청자 presence heartbeat (라이브 중)
    let hb = null;
    if (isLive) {
      const beat = () => liveApi.heartbeat(sid, { viewer_key: viewerKey.current }).catch(() => {});
      beat();
      hb = setInterval(beat, 15000);
    }
    return () => {
      stopped = true;
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (hb) clearInterval(hb);
    };
  }, [sid, active, isLive, pushChat]);

  const sendLike = useCallback(() => { if (sid) liveApi.heartbeat(sid, { viewer_key: viewerKey.current, like: 1 }).catch(() => {}); }, [sid]);
  return { stats, chat, connected, sendLike, viewerKey: viewerKey.current };
}

/* ═══════════════════════ 메인 컴포넌트 ═══════════════════════ */
export default function LiveCommerce() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const gd = useGlobalData();
  const money = useCallback((n) => { try { return fmt ? fmt(Number(n || 0)) : '₩' + Number(n || 0).toLocaleString(); } catch { return '₩' + Number(n || 0).toLocaleString(); } }, [fmt]);

  const [tab, setTab] = useState('studio');
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const active = useMemo(() => sessions.find(s => s.id === activeId) || null, [sessions, activeId]);

  const reload = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const r = await liveApi.listSessions();
      const list = Array.isArray(r?.sessions) ? r.sessions : [];
      setSessions(list);
      setActiveId(prev => {
        if (prev && list.some(s => s.id === prev)) return prev;
        const live = list.find(s => s.status === 'live');
        return live ? live.id : (list[0]?.id ?? null);
      });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const TABS = [
    { id: 'studio', label: '🎥 ' + t('live.tabStudio', '방송 스튜디오') },
    { id: 'dashboard', label: '📡 ' + t('live.tabDashboard', '실시간 대시보드') },
    { id: 'lineup', label: '🛍️ ' + t('live.tabLineup', '상품 편성') },
    { id: 'sessions', label: '📅 ' + t('live.tabSessions', '방송 관리') },
    { id: 'integrations', label: '🔌 ' + t('live.tabIntegrations', '연동 현황') },
    { id: 'aihost', label: '🤖 ' + t('live.tabAiHost', 'AI 쇼호스트') },
    { id: 'buyer', label: '🛒 ' + t('live.tabBuyer', '구매하기(시청자)') },
    { id: 'guide', label: '📖 ' + t('live.tabGuide', '이용 가이드') },
  ];

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto', color: C.text }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>🎬 {t('live.title', '라이브 커머스')}</h1>
        {active?.status === 'live'
          ? <span style={{ background: C.live, color: '#fff', fontSize: 12, fontWeight: 800, padding: '3px 12px', borderRadius: 20, animation: 'pulse 1.5s infinite' }}>● LIVE</span>
          : <span style={{ background: '#f1f5f9', color: C.sub, fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>OFF AIR</span>}
        {IS_DEMO && <span style={{ background: '#ede9fe', color: C.accent, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>DEMO</span>}
      </div>
      <p style={{ color: C.sub, fontSize: 13, marginTop: 0 }}>{t('live.subtitle', '실시간 방송으로 판매·결제·물류·마케팅·분석을 하나로 연결하는 엔터프라이즈 라이브 커머스 허브')}</p>

      {/* 세션 선택 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 14px' }}>
        <span style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>{t('live.activeSession', '현재 방송')}:</span>
        <select value={activeId || ''} onChange={e => setActiveId(Number(e.target.value) || null)}
          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700 }}>
          {sessions.length === 0 && <option value="">{t('live.noSession', '방송 없음 — 방송 관리에서 생성')}</option>}
          {sessions.map(s => <option key={s.id} value={s.id}>{s.status === 'live' ? '🔴 ' : ''}{s.title}</option>)}
        </select>
        <Btn small ghost onClick={reload}>↻ {t('live.refresh', '새로고침')}</Btn>
      </div>

      {/* 탭 바 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: `2px solid ${C.border}`, marginBottom: 18 }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: '9px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === tb.id ? 800 : 600, color: tab === tb.id ? C.accent : C.sub,
            borderBottom: tab === tb.id ? `2px solid ${C.accent}` : '2px solid transparent', marginBottom: -2,
          }}>{tb.label}</button>
        ))}
      </div>

      {err && <Card style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c', marginBottom: 14 }}>⚠️ {err}</Card>}
      {loading && <Card style={{ textAlign: 'center', color: C.sub }}>{t('live.loading', '불러오는 중...')}</Card>}

      {!loading && (
        <>
          {tab === 'studio' && <StudioTab session={active} gd={gd} money={money} t={t} onChanged={reload} />}
          {tab === 'dashboard' && <DashboardTab session={active} money={money} t={t} />}
          {tab === 'lineup' && <LineupTab session={active} gd={gd} money={money} t={t} />}
          {tab === 'sessions' && <SessionsTab sessions={sessions} setActiveId={setActiveId} reload={reload} t={t} />}
          {tab === 'integrations' && <IntegrationsTab t={t} />}
          {tab === 'aihost' && <AiHostTab session={active} gd={gd} t={t} />}
          {tab === 'buyer' && <BuyerTab session={active} gd={gd} money={money} t={t} />}
          {tab === 'guide' && <GuideTab t={t} money={money} />}
        </>
      )}
      <style>{`@keyframes pulse{0%{opacity:1}50%{opacity:.45}100%{opacity:1}}`}</style>
    </div>
  );
}

/* ═══════════════ 탭 1: 방송 스튜디오 ═══════════════ */
const StudioTab = memo(function StudioTab({ session, gd, money, t, onChanged }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [products, setProducts] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [busy, setBusy] = useState(false);
  const { stats, chat, connected, viewerKey } = useLiveStream(session, true);
  const chatEndRef = useRef(null);

  const sid = session?.id;
  const isLive = session?.status === 'live';

  const loadProducts = useCallback(async () => {
    if (!sid) { setProducts([]); return; }
    try { const r = await liveApi.listProducts(sid); setProducts(r?.products || []); } catch {}
  }, [sid]);
  useEffect(() => { loadProducts(); }, [loadProducts, chat.length]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.length]);

  /* 카메라 연결 (getUserMedia) */
  const startCam = useCallback(async () => {
    setCamErr('');
    try {
      const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play().catch(() => {}); }
      setCamOn(true);
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter(d => d.kind === 'videoinput'));
    } catch (e) {
      setCamErr(t('live.camError', '카메라/마이크 접근이 거부되었거나 장치를 찾을 수 없습니다. 브라우저 권한을 확인하세요.') + ' (' + (e?.name || e) + ')');
      setCamOn(false);
    }
  }, [deviceId, t]);
  const stopCam = useCallback(() => {
    try { streamRef.current?.getTracks().forEach(tr => tr.stop()); } catch {}
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  }, []);
  useEffect(() => () => stopCam(), [stopCam]);

  const doGoLive = async () => {
    if (!sid) return;
    setBusy(true);
    try { if (!camOn) await startCam(); await liveApi.goLive(sid); try { await liveApi.multicast(sid, 'start'); } catch {} await onChanged(); } catch (e) { alert(String(e?.message || e)); } finally { setBusy(false); }
  };
  const doEnd = async () => {
    if (!sid) return;
    setBusy(true);
    try { try { await liveApi.multicast(sid, 'stop'); } catch {} await liveApi.endSession(sid); stopCam(); await onChanged(); } catch (e) { alert(String(e?.message || e)); } finally { setBusy(false); }
  };
  const feature = async (pid) => { try { await liveApi.featureProduct(pid); await loadProducts(); } catch (e) { alert(String(e?.message || e)); } };
  const sendChat = async () => {
    const msg = chatInput.trim(); if (!msg || !sid) return;
    setChatInput('');
    try { await liveApi.postChat(sid, { author: t('live.host', '호스트'), message: msg, kind: 'chat' }); } catch (e) { alert(String(e?.message || e)); }
  };

  if (!session) return <EmptySession t={t} />;
  const featured = products.find(p => p.featured) || products[0];
  const channels = session.channels || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(280px,1fr)', gap: 16 }}>
      {/* 좌: 카메라 + 제어 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ padding: 0, overflow: 'hidden', background: '#0b1020' }}>
          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0b1020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: camOn ? 'block' : 'none' }} />
            {!camOn && <div style={{ color: '#94a3b8', textAlign: 'center' }}>
              <div style={{ fontSize: 44 }}>📷</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{t('live.camOff', '카메라가 꺼져 있습니다')}</div>
            </div>}
            {isLive && <span style={{ position: 'absolute', top: 12, left: 12, background: C.live, color: '#fff', fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>● LIVE</span>}
            <span style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>👁 {stats?.viewers ?? 0}</span>
            {/* 현재 노출 상품 오버레이 */}
            {featured && <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28 }}>{featured.image || '🛍️'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featured.name}</div>
                <div style={{ fontSize: 12, color: C.live, fontWeight: 800 }}>{money(featured.special_price || featured.price)}
                  {Number(featured.special_price) > 0 && Number(featured.special_price) < Number(featured.price) && <span style={{ color: C.sub, textDecoration: 'line-through', fontWeight: 500, marginLeft: 6 }}>{money(featured.price)}</span>}</div>
              </div>
              <span style={{ fontSize: 11, color: C.sub }}>{t('live.stock', '재고')} {featured.stock}</span>
            </div>}
          </div>
        </Card>

        {/* 카메라/방송 제어 */}
        <Card>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {!camOn ? <Btn color="#0891b2" onClick={startCam}>📷 {t('live.connectCam', '카메라 연결')}</Btn>
              : <Btn color="#64748b" ghost onClick={stopCam}>⏹ {t('live.stopCam', '카메라 끄기')}</Btn>}
            {devices.length > 1 && <select value={deviceId} onChange={e => { setDeviceId(e.target.value); }} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }}>
              <option value="">{t('live.defaultCam', '기본 카메라')}</option>
              {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Camera'}</option>)}
            </select>}
            <div style={{ flex: 1 }} />
            {!isLive ? <Btn color={C.live} onClick={doGoLive} disabled={busy}>🔴 {t('live.goLive', '방송 시작')}</Btn>
              : <Btn color="#1e293b" onClick={doEnd} disabled={busy}>⏹ {t('live.endLive', '방송 종료')}</Btn>}
          </div>
          {camErr && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>{camErr}</div>}
          {/* 멀티송출 대상(RTMP) 관리 */}
          <MulticastManager session={session} live={isLive} t={t} />
        </Card>

        {/* 편성 상품 빠른 노출 */}
        <Card>
          <SecTitle>{t('live.lineupQuick', '편성 상품 — 클릭하여 현재 노출')}</SecTitle>
          {products.length === 0 ? <div style={{ color: C.sub, fontSize: 12 }}>{t('live.noProducts', '편성된 상품이 없습니다. [상품 편성] 탭에서 추가하세요.')}</div>
            : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {products.map(p => <button key={p.id} onClick={() => feature(p.id)} style={{
                padding: '6px 10px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700, textAlign: 'left',
                border: `1px solid ${p.featured ? C.accent : C.border}`, background: p.featured ? C.accent + '14' : '#fff', color: C.text }}>
                {p.image || '🛍️'} {p.name} <span style={{ color: C.live }}>{money(p.special_price || p.price)}</span>
                {p.featured && <span style={{ color: C.accent }}> 📌</span>}
              </button>)}
            </div>}
        </Card>
      </div>

      {/* 우: 실시간 채팅 + 통계 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Stat label={'👁 ' + t('live.viewers', '시청자')} value={stats?.viewers ?? 0} color="#0891b2" />
          <Stat label={'🛒 ' + t('live.orders', '주문')} value={stats?.orders ?? 0} color={C.accent} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Stat label={'💰 ' + t('live.revenue', '매출')} value={money(stats?.revenue || 0)} color="#16a34a" />
          <Stat label={'❤️ ' + t('live.likes', '좋아요')} value={stats?.likes ?? 0} color={C.live} />
        </div>
        <Card style={{ display: 'flex', flexDirection: 'column', padding: 0, height: 420 }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontWeight: 800, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            💬 {t('live.liveChat', '실시간 채팅')}
            <span style={{ fontSize: 10, color: connected ? '#16a34a' : C.sub }}>{connected ? '● ' + t('live.realtime', '실시간') : '○ ' + t('live.polling', '폴링')}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chat.length === 0 && <div style={{ color: C.sub, fontSize: 12, textAlign: 'center', marginTop: 20 }}>{t('live.chatEmpty', '아직 채팅이 없습니다')}</div>}
            {chat.map(m => <ChatLine key={m.id} m={m} money={money} />)}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 6, padding: 10, borderTop: `1px solid ${C.border}` }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder={t('live.chatPlaceholder', '메시지 입력...')} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
            <Btn small onClick={sendChat}>{t('live.send', '전송')}</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
});

/* 멀티 송출 대상(RTMP) 관리 — 208차 #1. 세션별 송출 대상 등록/활성화/상태. */
const MulticastManager = memo(function MulticastManager({ session, live, t }) {
  const sid = session?.id;
  const [dests, setDests] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ channel: 'youtube', rtmp_url: '', stream_key: '' });
  const load = useCallback(async () => { if (!sid) { setDests([]); return; } try { const r = await liveApi.listDestinations(sid); setDests(r?.destinations || []); } catch {} }, [sid]);
  useEffect(() => { load(); }, [load]);

  const presets = { youtube: 'rtmp://a.rtmp.youtube.com/live2', twitch: 'rtmp://live.twitch.tv/app', facebook: 'rtmps://live-api-s.facebook.com:443/rtmp', instagram: '', tiktok: '' };
  const save = async () => {
    if (!sid) return;
    try { await liveApi.saveDestination(sid, { ...form, label: (channelMeta(form.channel).name) }); setForm({ channel: 'youtube', rtmp_url: '', stream_key: '' }); setAdding(false); await load(); }
    catch (e) { alert(String(e?.message || e)); }
  };
  const toggle = async (d) => { try { await liveApi.toggleDestination(d.id); await load(); } catch (e) { alert(String(e?.message || e)); } };
  const del = async (id) => { try { await liveApi.deleteDestination(id); await load(); } catch (e) { alert(String(e?.message || e)); } };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>📡 {t('live.multicastDest', '멀티 송출 대상 (RTMP)')}</div>
        <Btn small ghost onClick={() => setAdding(a => !a)}>＋ {t('live.addDest', '대상 추가')}</Btn>
      </div>
      {dests.length === 0 && !adding && <div style={{ fontSize: 11, color: C.sub }}>{t('live.noDest', '등록된 송출 대상이 없습니다. YouTube/Twitch/Facebook 등의 RTMP URL과 스트림 키를 추가하세요.')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {dests.map(d => {
          const m = channelMeta(d.channel);
          return <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: `1px solid ${C.border}`, borderRadius: 8, background: d.enabled ? '#fff' : '#f8fafc' }}>
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{d.label || m.name}
                <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10, background: d.status === 'live' ? '#fee2e2' : '#f1f5f9', color: d.status === 'live' ? '#ef4444' : C.sub }}>{d.status === 'live' ? '● LIVE' : 'IDLE'}</span></div>
              <div style={{ fontSize: 10, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.rtmp_url || '(RTMP URL 미설정)'} · {d.hasKey ? '🔑 ' + d.stream_key : t('live.noKey', '키 없음')}</div>
            </div>
            <button onClick={() => toggle(d)} title={t('live.toggle', '활성/비활성')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>{d.enabled ? '🟢' : '⚪'}</button>
            <button onClick={() => del(d.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>
          </div>;
        })}
      </div>
      {adding && <div style={{ marginTop: 8, padding: 10, border: `1px dashed ${C.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SNS_CHANNELS.map(ch => <Pill key={ch.id} on={form.channel === ch.id} color={ch.color === '#000000' ? '#334155' : ch.color}
            onClick={() => setForm(f => ({ ...f, channel: ch.id, rtmp_url: f.rtmp_url || presets[ch.id] || '' }))}>{ch.icon} {ch.name}</Pill>)}
        </div>
        <input value={form.rtmp_url} onChange={e => setForm(f => ({ ...f, rtmp_url: e.target.value }))} placeholder="RTMP URL (rtmp://...)"
          style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12 }} />
        <input type="password" value={form.stream_key} onChange={e => setForm(f => ({ ...f, stream_key: e.target.value }))} placeholder={t('live.streamKey', '스트림 키')} autoComplete="new-password"
          style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn small onClick={save}>{t('live.save', '저장')}</Btn>
          <Btn small ghost color="#64748b" onClick={() => setAdding(false)}>{t('live.cancel', '취소')}</Btn>
        </div>
      </div>}
      <div style={{ fontSize: 10, color: C.sub, marginTop: 6 }}>
        {t('live.multicastDestHint', '방송 시작 시 활성(🟢) 대상이 LIVE로 전환됩니다. 실제 영상 송출은 미디어 서버(SRS/nginx-rtmp) 릴레이가 카메라 인제스트를 받아 각 RTMP로 팬아웃합니다. 스트림 키는 AES-256-GCM 암호화 저장됩니다.')}
      </div>
    </div>
  );
});

function ChatLine({ m, money }) {
  const isOrder = m.kind === 'order';
  const isSys = m.kind === 'system';
  return <div style={{ fontSize: 12, lineHeight: 1.4, color: isSys ? C.sub : C.text, background: isOrder ? '#ecfdf5' : 'transparent', borderRadius: 6, padding: isOrder ? '4px 8px' : 0 }}>
    {!isSys && <b style={{ color: C.accent }}>{m.author} </b>}
    <span>{m.message}</span>
    {isOrder && m.meta?.total != null && <b style={{ color: '#16a34a', marginLeft: 4 }}>{money(m.meta.total)}</b>}
  </div>;
}
function SecTitle({ children }) { return <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>{children}</div>; }
function EmptySession({ t }) { return <Card style={{ textAlign: 'center', color: C.sub, padding: 40 }}>{t('live.selectSession', '방송 세션을 선택하거나 [방송 관리] 탭에서 새 방송을 생성하세요.')}</Card>; }

/* ═══════════════ 탭 2: 실시간 대시보드 ═══════════════ */
const DashboardTab = memo(function DashboardTab({ session, money, t }) {
  const { stats } = useLiveStream(session, true);
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!session?.id) return;
    let on = true;
    const tick = () => liveApi.listOrders(session.id).then(r => { if (on) setOrders(r?.orders || []); }).catch(() => {});
    tick(); const iv = setInterval(tick, 4000);
    return () => { on = false; clearInterval(iv); };
  }, [session?.id]);
  if (!session) return <EmptySession t={t} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Stat label={'👁 ' + t('live.viewers', '시청자')} value={stats?.viewers ?? 0} color="#0891b2" sub={t('live.peak', '최고') + ' ' + (stats?.peak_viewers ?? 0)} />
        <Stat label={'🛒 ' + t('live.orders', '주문')} value={stats?.orders ?? 0} color={C.accent} sub={(stats?.units ?? 0) + ' ' + t('live.units', '개')} />
        <Stat label={'💰 ' + t('live.revenue', '매출')} value={money(stats?.revenue || 0)} color="#16a34a" />
        <Stat label={'🎯 ' + t('live.conversion', '전환율')} value={(stats?.conversion ?? 0) + '%'} color="#d97706" />
        <Stat label={'🧾 ' + t('live.aov', '객단가')} value={money(stats?.aov || 0)} color="#7c3aed" />
        <Stat label={'❤️ ' + t('live.likes', '좋아요')} value={stats?.likes ?? 0} color={C.live} sub={'💬 ' + (stats?.chat_count ?? 0)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
        <Card>
          <SecTitle>🏆 {t('live.topProducts', '실시간 인기 상품 TOP 5')}</SecTitle>
          {(stats?.top_products?.length) ? stats.top_products.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span><b style={{ color: C.accent }}>{i + 1}.</b> {p.name}</span>
              <span style={{ fontWeight: 700 }}>{money(p.rev)} <span style={{ color: C.sub, fontWeight: 500 }}>({p.units})</span></span>
            </div>
          )) : <div style={{ color: C.sub, fontSize: 12 }}>{t('live.noSalesYet', '아직 판매가 없습니다')}</div>}
        </Card>
        <Card>
          <SecTitle>🧾 {t('live.recentOrders', '최근 주문')}</SecTitle>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {orders.length ? orders.slice(0, 30).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <span>{o.buyer} · {o.name} ×{o.qty}</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>{money(o.total)}</span>
              </div>
            )) : <div style={{ color: C.sub, fontSize: 12 }}>{t('live.noSalesYet', '아직 판매가 없습니다')}</div>}
          </div>
        </Card>
      </div>
      <Card style={{ background: '#f8fafc', fontSize: 12, color: C.sub }}>
        🔗 {t('live.syncNote', '이 KPI는 커머스/주문허브/정산·P&L/CRM/홈 대시보드/성과 리포트에 실시간 동기화됩니다. 구매 발생 시 재고가 자동 차감되고 OMS에 주문이 적재됩니다.')}
      </Card>
    </div>
  );
});

/* ═══════════════ 탭 3: 상품 편성 ═══════════════ */
const LineupTab = memo(function LineupTab({ session, gd, money, t }) {
  const [products, setProducts] = useState([]);
  const [picking, setPicking] = useState(false);
  const inventory = gd?.inventory || [];
  const sid = session?.id;
  const reload = useCallback(async () => { if (!sid) return; try { const r = await liveApi.listProducts(sid); setProducts(r?.products || []); } catch {} }, [sid]);
  useEffect(() => { reload(); }, [reload]);

  const addFromInventory = async (item) => {
    if (!sid) return;
    const price = Number(item.price || 0);
    try {
      await liveApi.saveProduct(sid, { sku: item.sku, name: item.name, image: item.image || '🛍️', price, special_price: Math.round(price * 0.85), stock: invStock(item), display_order: products.length });
      await reload();
    } catch (e) { alert(String(e?.message || e)); }
  };
  const addBlank = async () => {
    const name = prompt(t('live.newProductName', '상품명을 입력하세요'));
    if (!name || !sid) return;
    try { await liveApi.saveProduct(sid, { name, price: 0, special_price: 0, stock: 0, display_order: products.length }); await reload(); } catch (e) { alert(String(e?.message || e)); }
  };
  const updateField = async (p, field, value) => {
    const body = { id: p.id, session_id: sid, sku: p.sku, name: p.name, image: p.image, price: p.price, special_price: p.special_price, stock: p.stock, display_order: p.display_order, [field]: value };
    try { await liveApi.saveProduct(sid, body); await reload(); } catch (e) { alert(String(e?.message || e)); }
  };
  const remove = async (pid) => { try { await liveApi.deleteProduct(pid); await reload(); } catch (e) { alert(String(e?.message || e)); } };

  if (!session) return <EmptySession t={t} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <SecTitle>🛍️ {t('live.lineup', '편성 상품')} ({products.length})</SecTitle>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small color="#0891b2" onClick={() => setPicking(p => !p)}>📦 {t('live.fromInventory', '재고에서 추가')}</Btn>
            <Btn small ghost onClick={addBlank}>＋ {t('live.addBlank', '직접 추가')}</Btn>
          </div>
        </div>
        {products.length === 0 ? <div style={{ color: C.sub, fontSize: 13 }}>{t('live.noProducts', '편성된 상품이 없습니다.')}</div>
          : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ color: C.sub, textAlign: 'left' }}>
              <th style={{ padding: 6 }}>{t('live.product', '상품')}</th><th style={{ padding: 6 }}>{t('live.price', '정가')}</th>
              <th style={{ padding: 6 }}>{t('live.specialPrice', '라이브 특가')}</th><th style={{ padding: 6 }}>{t('live.stock', '재고')}</th>
              <th style={{ padding: 6 }}>{t('live.sold', '판매')}</th><th></th>
            </tr></thead>
            <tbody>{products.map(p => (
              <tr key={p.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: 6, fontWeight: 700 }}>{p.image || '🛍️'} {p.name}{p.featured && ' 📌'}</td>
                <td style={{ padding: 6 }}><EditNum value={p.price} onSave={v => updateField(p, 'price', v)} /></td>
                <td style={{ padding: 6 }}><EditNum value={p.special_price} onSave={v => updateField(p, 'special_price', v)} color="#ef4444" /></td>
                <td style={{ padding: 6 }}><EditNum value={p.stock} onSave={v => updateField(p, 'stock', v)} /></td>
                <td style={{ padding: 6, color: '#16a34a', fontWeight: 700 }}>{p.sold || 0}</td>
                <td style={{ padding: 6 }}><button onClick={() => remove(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button></td>
              </tr>
            ))}</tbody>
          </table>}
      </Card>
      {picking && <Card>
        <SecTitle>📦 {t('live.selectFromInventory', '재고에서 선택 — 클릭하여 편성(자동 15% 특가)')}</SecTitle>
        {inventory.length === 0 ? <div style={{ color: C.sub, fontSize: 12 }}>{t('live.noInventory', '재고 데이터가 없습니다. WMS/카탈로그에서 상품을 등록하세요.')}</div>
          : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {inventory.slice(0, 60).map(item => (
              <button key={item.sku} onClick={() => addFromInventory(item)} style={{ padding: '6px 10px', borderRadius: 9, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 12, color: C.text }}>
                {item.image || '🛍️'} {item.name} <span style={{ color: C.sub }}>{money(item.price)}</span>
              </button>
            ))}
          </div>}
      </Card>}
    </div>
  );
});
function invStock(item) {
  if (item.stock && typeof item.stock === 'object') return Object.values(item.stock).reduce((s, v) => s + Number(v || 0), 0);
  return Number(item.stock || item.inventory || 0);
}
function EditNum({ value, onSave, color }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input type="number" value={v} onChange={e => setV(e.target.value)} onBlur={() => Number(v) !== Number(value) && onSave(Number(v))}
    style={{ width: 90, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, color: color || C.text, fontWeight: color ? 700 : 400 }} />;
}

/* ═══════════════ 탭 4: 방송 관리 ═══════════════ */
const SessionsTab = memo(function SessionsTab({ sessions, setActiveId, reload, t }) {
  const [form, setForm] = useState({ title: '', host: '', description: '', scheduled_at: '', channels: [] });
  const [editId, setEditId] = useState(null);
  const toggleCh = (id) => setForm(f => ({ ...f, channels: f.channels.includes(id) ? f.channels.filter(c => c !== id) : [...f.channels, id] }));
  const save = async () => {
    if (!form.title.trim()) { alert(t('live.titleRequired', '제목을 입력하세요')); return; }
    try {
      if (editId) await liveApi.updateSession(editId, form); else await liveApi.saveSession(form);
      setForm({ title: '', host: '', description: '', scheduled_at: '', channels: [] }); setEditId(null); await reload();
    } catch (e) { alert(String(e?.message || e)); }
  };
  const edit = (s) => { setEditId(s.id); setForm({ title: s.title, host: s.host || '', description: s.description || '', scheduled_at: s.scheduled_at || '', channels: s.channels || [] }); };
  const del = async (id) => { if (!confirm(t('live.confirmDelete', '이 방송을 삭제할까요? 편성·주문·채팅이 모두 삭제됩니다.'))) return; try { await liveApi.deleteSession(id); await reload(); } catch (e) { alert(String(e?.message || e)); } };
  const STATUS = { scheduled: { l: t('live.scheduled', '예약됨'), c: '#0891b2' }, live: { l: 'LIVE', c: '#ef4444' }, ended: { l: t('live.ended', '종료'), c: '#64748b' } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16 }}>
      <Card>
        <SecTitle>📅 {t('live.sessionList', '방송 목록')}</SecTitle>
        {sessions.length === 0 ? <div style={{ color: C.sub, fontSize: 13 }}>{t('live.noSessionYet', '생성된 방송이 없습니다. 우측에서 새 방송을 만드세요.')}</div>
          : sessions.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ background: (STATUS[s.status] || STATUS.ended).c + '18', color: (STATUS[s.status] || STATUS.ended).c, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, minWidth: 56, textAlign: 'center' }}>{(STATUS[s.status] || STATUS.ended).l}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: C.sub }}>{s.host || '—'} · {(s.channels || []).map(c => channelMeta(c).icon).join(' ') || t('live.noChannel', '송출채널 미지정')}{s.scheduled_at ? ' · ' + s.scheduled_at : ''}</div>
              </div>
              <Btn small ghost onClick={() => setActiveId(s.id)}>{t('live.select', '선택')}</Btn>
              <Btn small ghost color="#64748b" onClick={() => edit(s)}>✏️</Btn>
              <button onClick={() => del(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑</button>
            </div>
          ))}
      </Card>
      <Card>
        <SecTitle>{editId ? '✏️ ' + t('live.editSession', '방송 수정') : '＋ ' + t('live.newSession', '새 방송')}</SecTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Field label={t('live.sessionTitle', '방송 제목')} value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} />
          <Field label={t('live.host', '호스트/쇼호스트')} value={form.host} onChange={v => setForm(f => ({ ...f, host: v }))} />
          <Field label={t('live.scheduledAt', '예약 일시')} value={form.scheduled_at} onChange={v => setForm(f => ({ ...f, scheduled_at: v }))} placeholder="2026-06-15 20:00" />
          <Field label={t('live.description', '설명')} value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
          <div>
            <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, marginBottom: 6 }}>{t('live.multicast', '멀티 송출 채널')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SNS_CHANNELS.map(ch => <Pill key={ch.id} on={form.channels.includes(ch.id)} color={ch.color === '#000000' ? '#334155' : ch.color} onClick={() => toggleCh(ch.id)}>{ch.icon} {ch.name}</Pill>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn onClick={save}>{editId ? t('live.update', '수정') : t('live.create', '생성')}</Btn>
            {editId && <Btn ghost color="#64748b" onClick={() => { setEditId(null); setForm({ title: '', host: '', description: '', scheduled_at: '', channels: [] }); }}>{t('live.cancel', '취소')}</Btn>}
          </div>
        </div>
      </Card>
    </div>
  );
});
function Field({ label, value, onChange, placeholder }) {
  return <div>
    <label style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, marginTop: 3, boxSizing: 'border-box' }} />
  </div>;
}

/* ═══════════════ 탭 5: 연동 현황 (기존 메뉴 SSOT 소비 + 바로가기) ═══════════════ */
// 중복 신설 금지: 채널·결제·물류·CRM 자격증명은 기존 메뉴(연동 허브/광고 매체 연동/게이트웨이 관리/WMS/CRM)에서
// 단일 등록·관리한다. 본 탭은 그 단일 소스(ConnectorSync=/v423/creds/summary)의 연결 현황만 보여주고
// 등록은 해당 메뉴로 라우팅한다. → 전 메뉴 일관성 유지.
const IntegrationsTab = memo(function IntegrationsTab({ t }) {
  const navigate = useNavigate();
  const { isConnected } = useConnectorSync();
  const connOf = useCallback((id) => {
    const k = CREDS_KEY[id];
    try { return k ? !!isConnected?.(k) : false; } catch { return false; }
  }, [isConnected]);

  const total = Object.keys(CREDS_KEY).length;
  const connected = Object.keys(CREDS_KEY).filter(id => connOf(id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card style={{ background: 'linear-gradient(135deg,#faf5ff,#eff6ff)' }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>🔌 {t('live.connectStatus', '연동 현황')} — {t('live.salesChannels', '판매채널')} {connected}/{total} {t('live.connected', '연결됨')}</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 6, lineHeight: 1.6 }}>
          {t('live.consolidationHint', '채널·결제·물류·CRM 연동은 중복 운영하지 않고 기존 메뉴에서 단일 등록·관리합니다. 여기서는 연결 현황만 확인하고, 각 카드의 버튼으로 담당 메뉴에서 등록하세요. (자격증명은 AES-256-GCM 암호화 저장)')}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          <Btn small color="#6366f1" onClick={() => navigate('/integration-hub')}>🔗 {t('live.goIntegrationHub', '연동 허브')}</Btn>
          <Btn small ghost onClick={() => navigate('/ad-channels')}>📢 {t('live.goAdChannels', '광고 매체 연동')}</Btn>
          <Btn small ghost onClick={() => navigate('/wms-manager')}>🚚 {t('live.goWms', 'WMS(택배사)')}</Btn>
          <Btn small ghost onClick={() => navigate('/pg-config')}>💳 {t('live.goPg', '결제 게이트웨이')}</Btn>
          <Btn small ghost onClick={() => navigate('/crm')}>🤝 {t('live.goCrm', 'CRM')}</Btn>
        </div>
      </Card>
      {INTEGRATION_GROUPS.map(g => {
        const tgt = GROUP_TARGET[g.key] || GROUP_TARGET.sns_live;
        const hasStatus = g.items.some(ch => CREDS_KEY[ch.id]);
        return (
          <Card key={g.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <SecTitle>{g.icon} {t('live.group_' + g.key, g.label)}</SecTitle>
              <Btn small ghost color="#6366f1" onClick={() => navigate(tgt.route)}>{tgt.menu} {t('live.manageThere', '에서 등록')} →</Btn>
            </div>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 10 }}>{tgt.desc}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 10 }}>
              {g.items.map(ch => {
                const tracked = !!CREDS_KEY[ch.id];
                const on = tracked && connOf(ch.id);
                return <div key={ch.id} onClick={() => navigate(tgt.route)} style={{ cursor: 'pointer', border: `1px solid ${on ? '#86efac' : C.border}`, borderRadius: 10, padding: 12, background: on ? '#f0fdf4' : '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{ch.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</div>
                    <div style={{ fontSize: 10, color: on ? '#16a34a' : C.sub, fontWeight: 700 }}>
                      {!tracked ? '↗ ' + t('live.manageInMenu', '담당 메뉴에서 관리')
                        : on ? '● ' + t('live.connected', '연결됨')
                        : '○ ' + t('live.disconnected', '미연결')}
                    </div>
                  </div>
                </div>;
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
});

/* ═══════════════ 탭 6: AI 쇼호스트 ═══════════════ */
const AiHostTab = memo(function AiHostTab({ session, gd, t }) {
  const FEATURES = [
    { icon: '🎤', title: t('live.aiHost1', 'AI 쇼호스트'), desc: t('live.aiHost1d', 'AI 음성/아바타가 상품을 자동 소개하고 시청자 질문에 응답합니다.') },
    { icon: '🌐', title: t('live.aiHost2', '실시간 번역'), desc: t('live.aiHost2d', '방송 음성·자막을 15개 언어로 실시간 번역해 글로벌 동시 송출합니다.') },
    { icon: '📝', title: t('live.aiHost3', '자동 자막'), desc: t('live.aiHost3d', '음성을 인식해 자막을 자동 생성하고 다국어 캡션을 입힙니다.') },
    { icon: '✨', title: t('live.aiHost4', '상품 설명 생성'), desc: t('live.aiHost4d', '편성 상품의 셀링포인트·카피를 AI가 자동 작성합니다.') },
    { icon: '💬', title: t('live.aiHost5', 'FAQ 자동 응답'), desc: t('live.aiHost5d', '반복되는 질문(배송/사이즈/재고)에 AI가 즉시 채팅 응답합니다.') },
  ];
  const [gen, setGen] = useState('');
  const [genBusy, setGenBusy] = useState(false);
  const [prodName, setProdName] = useState('');

  const generate = async () => {
    const name = prodName.trim(); if (!name) return;
    setGenBusy(true); setGen('');
    try {
      // 서버 공용 Claude(/v422/ai) 활용 — 세션 토큰 게이트. 실패 시 로컬 템플릿 폴백.
      const base = import.meta.env.VITE_API_BASE || '';
      const token = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
      const res = await fetch(`${base}/api/v422/ai/campaign-search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ query: `라이브 커머스 방송용 "${name}" 상품의 매력적인 셀링포인트 3가지와 30초 소개 멘트를 작성해줘.` }),
      });
      if (res.ok) { const j = await res.json(); setGen(j?.answer || j?.result || j?.text || JSON.stringify(j).slice(0, 600)); }
      else throw new Error('ai_unavailable');
    } catch {
      setGen(`✨ ${prodName} — AI 셀링포인트(예시)\n\n1️⃣ 지금 라이브에서만 만나는 단독 특가\n2️⃣ ${prodName}의 핵심 장점을 30초 안에 어필\n3️⃣ 재고 한정 — 댓글로 바로 주문 가능!\n\n※ [연동 허브]에서 OpenAI/Gemini/Claude 키를 등록하면 실시간 고품질 생성이 활성화됩니다.`);
    } finally { setGenBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        {FEATURES.map((f, i) => (
          <Card key={i}>
            <div style={{ fontSize: 28 }}>{f.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>{f.desc}</div>
          </Card>
        ))}
      </div>
      <Card>
        <SecTitle>✨ {t('live.aiGen', 'AI 상품 설명 생성')}</SecTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={prodName} onChange={e => setProdName(e.target.value)} placeholder={t('live.aiGenPlaceholder', '상품명 입력 (예: 제주 감귤 5kg)')}
            style={{ flex: 1, minWidth: 220, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }} />
          <Btn color="#d97757" onClick={generate} disabled={genBusy}>{genBusy ? t('live.generating', '생성 중...') : t('live.generate', '생성')}</Btn>
        </div>
        {gen && <pre style={{ whiteSpace: 'pre-wrap', background: '#faf5ff', borderRadius: 10, padding: 14, marginTop: 12, fontSize: 13, lineHeight: 1.6, color: C.text, fontFamily: 'inherit' }}>{gen}</pre>}
      </Card>
    </div>
  );
});

/* ═══════════════ 탭 7: 구매하기 (시청자 뷰) ═══════════════ */
const BuyerTab = memo(function BuyerTab({ session, gd, money, t }) {
  const [products, setProducts] = useState([]);
  const [buyer, setBuyer] = useState(t('live.guest', '게스트') + Math.floor(Math.random() * 900 + 100));
  const [toast, setToast] = useState('');
  const { stats, chat, sendLike } = useLiveStream(session, true);
  const sid = session?.id;
  const reload = useCallback(async () => { if (!sid) return; try { const r = await liveApi.listProducts(sid); setProducts(r?.products || []); } catch {} }, [sid]);
  useEffect(() => { reload(); }, [reload, chat.length]);

  const buy = async (p, qty = 1) => {
    if (!sid) return;
    try {
      const r = await liveApi.placeOrder(sid, { product_id: p.id, qty, buyer });
      // 실시간 동기화 — 데모: GlobalData 단일소스 캐스케이드(재고/정산/CRM/대시보드 크로스탭 즉시반영).
      //   ★208차 검수(가상데이터 유입 차단): 운영에서는 client-only 가상주문 주입 금지 →
      //   백엔드가 channel_orders(OMS)로 영속화하고 reload()/SSE 가 라이브 화면을 갱신.
      if (IS_DEMO) {
        try { gd?.placeOrder?.({ ch: 'live', sku: p.sku || p.name, name: p.name, buyer, qty, price: Number(p.special_price || p.price || 0), wh: 'W001', platformFeeRate: 0 }); } catch {}
      }
      setToast(`✅ ${p.name} ${qty}${t('live.units', '개')} ${t('live.purchased', '구매 완료')} — ${money(r?.total || 0)}`);
      setTimeout(() => setToast(''), 2600);
      await reload();
    } catch (e) { setToast('⚠️ ' + String(e?.message || e)); setTimeout(() => setToast(''), 2600); }
  };
  const commentOrder = async (p) => {
    if (!sid) return;
    try { await liveApi.postChat(sid, { author: buyer, message: `${t('live.commentBuy', '구매')} ${p.name}!`, kind: 'chat' }); await buy(p, 1); } catch {}
  };

  if (!session) return <EmptySession t={t} />;
  const featured = products.find(p => p.featured) || products[0];
  return (
    <div style={{ maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card style={{ padding: 0, overflow: 'hidden', background: '#0b1020' }}>
        <div style={{ position: 'relative', aspectRatio: '9/14', maxHeight: 520, background: 'linear-gradient(160deg,#1e1b4b,#0b1020)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ background: session.status === 'live' ? '#ef4444' : '#64748b', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>{session.status === 'live' ? '● LIVE' : 'VOD'}</span>
            <span style={{ background: 'rgba(0,0,0,.5)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>👁 {stats?.viewers ?? 0}</span>
          </div>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 56 }}>{featured?.image || '🎬'}</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginTop: 6 }}>{session.title}</div>
          </div>
          {/* 실시간 채팅 오버레이 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 110, overflow: 'hidden' }}>
            {chat.slice(-5).map(m => <div key={m.id} style={{ fontSize: 11, color: '#e2e8f0' }}>
              {m.kind !== 'system' && <b style={{ color: '#c4b5fd' }}>{m.author} </b>}{m.message}</div>)}
          </div>
        </div>
      </Card>

      {featured && <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 34 }}>{featured.image || '🛍️'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{featured.name}</div>
          <div style={{ fontSize: 15, color: '#ef4444', fontWeight: 900 }}>{money(featured.special_price || featured.price)}
            {Number(featured.special_price) > 0 && Number(featured.special_price) < Number(featured.price) && <span style={{ color: C.sub, textDecoration: 'line-through', fontWeight: 500, fontSize: 12, marginLeft: 6 }}>{money(featured.price)}</span>}</div>
          <div style={{ fontSize: 11, color: C.sub }}>{t('live.stock', '재고')} {featured.stock} · {t('live.sold', '판매')} {featured.sold || 0}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Btn color="#ef4444" onClick={() => buy(featured)}>🛒 {t('live.buyNow', '구매하기')}</Btn>
          <Btn small ghost color="#ec4899" onClick={sendLike}>❤️ {t('live.like', '좋아요')}</Btn>
        </div>
      </Card>}

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.sub }}>{t('live.buyerName', '시청자명')}</span>
          <input value={buyer} onChange={e => setBuyer(e.target.value)} style={{ flex: 1, padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 12 }} />
        </div>
        <SecTitle>🛍️ {t('live.allProducts', '방송 상품 전체')}</SecTitle>
        {products.length === 0 ? <div style={{ color: C.sub, fontSize: 12 }}>{t('live.noProducts', '편성된 상품이 없습니다.')}</div>
          : products.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 22 }}>{p.image || '🛍️'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 800 }}>{money(p.special_price || p.price)}</div>
              </div>
              <Btn small color="#ef4444" onClick={() => buy(p)} disabled={Number(p.stock) <= 0}>{Number(p.stock) <= 0 ? t('live.soldOut', '품절') : t('live.buy', '구매')}</Btn>
              <Btn small ghost onClick={() => commentOrder(p)}>💬 {t('live.commentOrder', '댓글주문')}</Btn>
            </div>
          ))}
      </Card>
      {toast && <div style={{ position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '12px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, zIndex: 1000 }}>{toast}</div>}
    </div>
  );
});

/* ═══════════════ 탭 8: 이용 가이드 ═══════════════ */
const GuideTab = memo(function GuideTab({ t }) {
  const STEPS = [
    { n: 1, icon: '📅', title: t('live.guide1', '방송 생성'), desc: t('live.guide1d', '[방송 관리]에서 제목·호스트·예약일시를 입력하고 멀티 송출 채널(YouTube/TikTok/Instagram/Facebook/Twitch)을 선택합니다.') },
    { n: 2, icon: '🛍️', title: t('live.guide2', '상품 편성'), desc: t('live.guide2d', '[상품 편성]에서 WMS/카탈로그 재고를 불러와 라이브 특가·재고를 설정합니다. 재고는 판매 시 자동 차감됩니다.') },
    { n: 3, icon: '🔌', title: t('live.guide3', '채널·결제·물류 연동'), desc: t('live.guide3d', '[채널 연동]에서 오픈마켓·글로벌마켓·자사몰·PG(토스/카카오페이 등)·택배(CJ/한진/OCL 당일배송)·CRM·AI를 연결합니다. 자격증명은 암호화 저장됩니다.') },
    { n: 4, icon: '📷', title: t('live.guide4', '카메라 연결 & 방송 시작'), desc: t('live.guide4d', '[방송 스튜디오]에서 카메라를 연결하고 [방송 시작]을 누르면 라이브가 시작됩니다. 상품을 클릭해 화면에 노출합니다.') },
    { n: 5, icon: '🛒', title: t('live.guide5', '실시간 판매 & 댓글주문'), desc: t('live.guide5d', '시청자는 [구매하기]에서 즉시 구매하거나 댓글로 주문합니다. 주문은 OMS·WMS·정산·CRM·대시보드에 실시간 동기화됩니다.') },
    { n: 6, icon: '🚚', title: t('live.guide6', 'OCL 당일배송 처리'), desc: t('live.guide6d', '주문은 주문허브(OMS)로 모이고 WMS 피킹→OCL 당일배송 네트워크로 출고됩니다. 배송 상태가 자동 추적됩니다.') },
    { n: 7, icon: '📊', title: t('live.guide7', '실시간 분석 & 리포트'), desc: t('live.guide7d', '[실시간 대시보드]에서 시청자·매출·전환율·인기상품을 모니터링하고, 종료 후 성과 리포트로 정산까지 연결됩니다.') },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', color: '#fff' }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>🎬 {t('live.guideTitle', '라이브 커머스 — 판매·결제·물류·마케팅·분석을 잇는 생태계')}</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>{t('live.guideLead', 'Live Commerce Hub → 멀티 라이브 송출 → 상품·재고 통합 → 주문 통합(OMS) → WMS → 배송사 연동 → OCL 당일배송 → 고객 알림 → 매출 분석 BI')}</div>
      </Card>
      {STEPS.map(s => (
        <Card key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 30 }}>{s.icon}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}><span style={{ color: C.accent }}>STEP {s.n}.</span> {s.title}</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 4, lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        </Card>
      ))}
    </div>
  );
});
