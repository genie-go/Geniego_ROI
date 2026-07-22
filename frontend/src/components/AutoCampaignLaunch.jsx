import React, { useState, useEffect, useCallback } from 'react';
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';

/* 196차 Phase 2 — 광고 자동 실행 (캠페인 설정 + AI 디자인 연결 → 자동 캠페인 실행)
 * 전략(draft: 예산·채널·배분) + Phase1 적용 AI 디자인을 연결해 백엔드 auto_campaign 으로 실행.
 * 채널 API 자격증명 연결 시 즉시 집행(active), 미연결 채널은 '연결 대기'로 정직 표기. */

const API = '/api';
const TOKEN_KEY = IS_DEMO ? 'demo_genie_token' : 'genie_token';
const auth = () => {
  const t = localStorage.getItem(TOKEN_KEY) || localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
};
const CHLABEL = { tiktok: 'TikTok', meta: 'Meta', instagram: 'Instagram', kakao: 'Kakao', youtube: 'YouTube', google: 'Google', naver: 'Naver', coupang_ads: '쿠팡애즈', sms: 'SMS', email: 'Email' };
const fmt = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');
const card = { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 22 };

function DesignThumb({ d, selected, onToggle }) {
  const spec = d.design || {};
  const p = spec.palette || {};
  return (
    <button type="button" onClick={onToggle} style={{
      position: 'relative', width: 120, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', padding: 0,
      border: `2.5px solid ${selected ? '#22c55e' : 'rgba(0,0,0,0.1)'}`, background: 'transparent', textAlign: 'left',
    }}>
      <div style={{ height: 120, background: `linear-gradient(145deg, ${p.bg || '#0f172a'}, ${p.primary || '#4f8ef7'})`, padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: p.text || '#fff', lineHeight: 1.2 }}>{(spec.headline || '').slice(0, 16)}</div>
        <div style={{ display: 'inline-block', alignSelf: 'flex-start', padding: '3px 8px', borderRadius: 99, background: p.accent || '#22d3ee', color: p.bg || '#0f172a', fontSize: 10, fontWeight: 700 }}>{spec.cta || 'CTA'}</div>
      </div>
      <div style={{ padding: '5px 7px', background: '#fff' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{CHLABEL[spec.channel] || spec.channel} · {d.category || ''}</div>
      </div>
      {selected && <div style={{ position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: '50%', background: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
    </button>
  );
}

export default function AutoCampaignLaunch({ draft, category, campaignName, period, minRoas = 0, maxShare = 60 }) {
  const { t } = useI18n();
  const [designs, setDesigns] = useState([]);
  const [selDesigns, setSelDesigns] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [killBusy, setKillBusy] = useState(false);
  const [audBusy, setAudBusy] = useState('');     // 오디언스 동기화 중인 채널
  const [audLookalike, setAudLookalike] = useState(true);
  const [audMsg, setAudMsg] = useState(null);
  const [msg, setMsg] = useState(null);
  const [optResult, setOptResult] = useState({}); // campaignId -> { optimized, decisions, metrics, reason }
  const [optBusy, setOptBusy] = useState(null);    // campaignId being optimized
  const [abMode, setAbMode] = useState(true);      // 크리에이티브 자동 A/B 테스트(디자인 2+ 시)
  const [abTests, setAbTests] = useState({});      // campaignId -> [tests]
  // [283차 P0-1] ★랜딩 URL — 종전엔 프론트 3개 런치 경로 어디서도 landing_url 을 보내지 않아, 백엔드 어댑터의
  //   벤더 기본값(genieroi.com)이 6개 매체 광고에 그대로 실렸다(구독사 광고비가 우리 사이트로 랜딩).
  //   이제 백엔드는 랜딩이 없으면 fail-closed(광고 미생성)이므로, 여기서 반드시 받아서 전송한다.
  const [landingUrl, setLandingUrl] = useState('');

  const loadDesigns = useCallback(async () => {
    try {
      const r = await fetch(`${API}/v422/ai/ad-design/list`, { headers: auth() });
      const d = await r.json();
      if (d.ok && Array.isArray(d.designs)) {
        setDesigns(d.designs);
        setSelDesigns(d.designs.map(x => x.id)); // 기본 전체 선택
      }
    } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ }
  }, []);
  const loadCampaigns = useCallback(async () => {
    try {
      const r = await fetch(`${API}/v423/auto-campaign/list`, { headers: auth() });
      const d = await r.json();
      if (d.ok && Array.isArray(d.campaigns)) setCampaigns(d.campaigns);
    } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ }
  }, []);
  // 크리에이티브 A/B 테스트 상태(variant별 성과·승자) 로드.
  const loadAbStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/v423/auto-campaign/ab-status`, { headers: auth() });
      const d = await r.json();
      if (d.ok && Array.isArray(d.tests)) {
        const by = {};
        d.tests.forEach(tt => { (by[tt.campaign_id] = by[tt.campaign_id] || []).push(tt); });
        setAbTests(by);
      }
    } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ }
  }, []);
  useEffect(() => { loadDesigns(); loadCampaigns(); loadAbStatus(); }, [loadDesigns, loadCampaigns, loadAbStatus]);

  // Phase2: 실시간 갱신 — cron(optimize_cron) 자동 재배분/정지·A/B 승자선정 결과가 화면에 자동 반영되도록
  //   30초 폴링(탭 visible 시에만, 백그라운드 절전). 캠페인이 있을 때만 동작.
  useEffect(() => {
    let timer = null;
    const tick = () => { if (document.visibilityState === 'visible') { loadCampaigns(); loadAbStatus(); } };
    timer = setInterval(tick, 30000);
    return () => { if (timer) clearInterval(timer); };
  }, [loadCampaigns, loadAbStatus]);

  const toggleDesign = (id) => setSelDesigns(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const launch = async () => {
    if (!draft || !draft.allocations?.length) { setMsg({ t: 'err', m: t('autoCamp.needStrategy', '먼저 전략을 생성하세요.') }); return; }
    // [283차 P0-1] ★랜딩 URL 필수 — 미입력 상태로 집행하면 광고가 잘못된 목적지(벤더 사이트)로 나가거나 매체에서 거부된다.
    const land = (landingUrl || '').trim();
    if (!land) { setMsg({ t: 'err', m: t('autoCamp.needLanding', '광고 랜딩 URL을 입력하세요. 광고 클릭 시 이동할 내 사이트/상품 페이지 주소입니다(미입력 시 집행 불가).') }); return; }
    // [283차 P0-2] ★소재 필수 — 소재 미연결로 집행하면 백엔드 loadDesign 기본값('GenieGo')이 그대로 광고 카피로 게재된다.
    if (!selDesigns.length) { setMsg({ t: 'err', m: t('autoCamp.needDesign', '광고 소재를 1개 이상 선택하세요. 소재 없이 집행하면 기본 카피로 게재됩니다.') }); return; }
    setBusy(true); setMsg(null);
    try {
      const channels = draft.allocations.map(a => a.ch?.id).filter(Boolean);
      const allocations = draft.allocations.map(a => ({ channel: a.ch?.id, label: a.ch?.label, alloc: a.alloc, roas: a.roas }));
      const r = await fetch(`${API}/v423/auto-campaign/launch`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ name: campaignName || `${category || '통합'} ${t('autoCamp.autoSuffix', '자동 캠페인')}`, category: category || '', budget: draft.budget, period: period || 'monthly', channels, allocations, est_roas: draft.estimatedRoas, design_ids: selDesigns, ab_mode: abMode && selDesigns.length >= 2,
          landing_url: land,   // [283차 P0-1] 광고 클릭 목적지(6개 매체 페이로드에 실림)
          // [227차 P1] 사용자 가드레일 배선 — 옵티마이저가 실제 적용(min_roas/max_share).
          guardrails: { min_roas: Number(minRoas) || 0, max_share: (Number(maxShare) || 60) / 100 } }),
      });
      const d = await r.json();
      if (d.ok) { setMsg({ t: 'ok', m: d.message }); loadCampaigns(); loadAbStatus(); }
      else setMsg({ t: 'err', m: d.error || t('autoCamp.launchFail', '실행에 실패했습니다.') });
    } catch { setMsg({ t: 'err', m: t('autoCamp.serverErr', '서버 오류. 다시 시도하세요.') }); }
    setBusy(false);
  };

  const toggleStatus = async (c) => {
    const ns = c.status === 'active' ? 'paused' : 'active';
    // [227차 P0] 활성화=실 광고 게재 시작 → 백엔드 하드게이트(결제수단/킬스위치) 및 매체 push 결과를 표기.
    try {
      const r = await fetch(`${API}/v423/auto-campaign/status`, { method: 'POST', headers: auth(), body: JSON.stringify({ id: c.id, status: ns }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        if (d.error === 'billing_required') setMsg({ t: 'err', m: d.message || t('autoCamp.billingRequired', '광고를 활성화하려면 광고비 결제수단(카드)을 먼저 등록하세요. [재무·정산 > 결제수단]') });
        else if (d.error === 'execution_disabled') setMsg({ t: 'err', m: d.message || t('autoCamp.execDisabled', '집행이 비활성화되어 있습니다(관리자에게 문의).') });
        else setMsg({ t: 'err', m: d.message || d.error || t('autoCamp.statusFail', '상태 변경에 실패했습니다.') });
      } else if (ns === 'active') {
        const pushed = Array.isArray(d.pushed) ? d.pushed : [];
        const okN = pushed.filter(p => p.ok).length;
        setMsg({ t: 'ok', m: okN > 0
          ? `🚀 광고를 활성화했습니다 — ${okN}개 채널 게재 시작(실 광고비 집행).`
          : (pushed.length ? '활성화했습니다. 매체 반영은 자격증명/캠페인 상태를 확인하세요.' : '활성화했습니다(연결된 매체 캠페인이 없습니다).') });
      } else {
        setMsg({ t: 'ok', m: '광고를 일시정지했습니다(매체 게재 중단).' });
      }
      loadCampaigns();
    } catch { setMsg({ t: 'err', m: t('autoCamp.serverErr', '서버 오류. 다시 시도하세요.') }); }
  };

  // [227차] 긴급 킬스위치 — 본 테넌트 전 active 캠페인 즉시 일시정지(매체 게재 중단).
  const pauseAllNow = async () => {
    if (!window.confirm(t('autoCamp.killConfirm', '실행중인 모든 광고를 즉시 일시정지할까요? 매체 게재가 중단되어 광고비 집행이 멈춥니다.'))) return;
    setKillBusy(true); setMsg(null);
    try {
      const r = await fetch(`${API}/v423/auto-campaign/pause-all`, { method: 'POST', headers: auth() });
      const d = await r.json().catch(() => ({}));
      if (d.ok) setMsg({ t: 'ok', m: `🛑 ${d.paused || 0}개 캠페인을 긴급 정지했습니다(매체 ${d.pushed || 0}건 게재 중단).` });
      else setMsg({ t: 'err', m: d.error || t('autoCamp.killFail', '긴급 정지에 실패했습니다.') });
      loadCampaigns();
    } catch { setMsg({ t: 'err', m: t('autoCamp.serverErr', '서버 오류. 다시 시도하세요.') }); }
    setKillBusy(false);
  };

  // [227차] 오디언스/리타겟팅 매체 push — CRM 고객 해시 이메일을 Meta Custom Audience / Google Customer
  //   Match 로 업로드(+Meta Lookalike 확장). PII 안전(해시만 전송). 광고 타깃 정밀화·CAC 절감 레버.
  const syncAudience = async (channel) => {
    setAudBusy(channel); setAudMsg(null);
    try {
      const r = await fetch(`${API}/v421/connectors/audience/sync`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ channel, lookalike: channel === 'meta' ? audLookalike : false, country: 'KR' }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok) setAudMsg({ t: 'ok', m: `🎯 ${CHLABEL[channel] || channel}: ${d.note || '오디언스 업로드 완료'}${d.uploaded != null ? ` (${d.uploaded}건)` : ''}${d.lookalike_id ? ' · 룩어라이크 생성' : ''}` });
      else if (d.demo) setAudMsg({ t: 'err', m: d.note || '데모에서는 사용할 수 없습니다.' });
      else if (d.status === 'no_audience') setAudMsg({ t: 'err', m: d.note || '업로드할 고객 데이터가 없습니다(CRM 고객/구매 이메일 필요).' });
      else if (d.status === 'no_credentials') setAudMsg({ t: 'err', m: `${CHLABEL[channel] || channel} 광고 자격증명을 먼저 등록하세요.` });
      else setAudMsg({ t: 'err', m: d.error || d.note || '오디언스 업로드에 실패했습니다.' });
    } catch { setAudMsg({ t: 'err', m: t('autoCamp.serverErr', '서버 오류. 다시 시도하세요.') }); }
    setAudBusy('');
  };

  const optimize = async (c) => {
    setOptBusy(c.id);
    try {
      const r = await fetch(`${API}/v423/auto-campaign/optimize`, { method: 'POST', headers: auth(), body: JSON.stringify({ id: c.id }) });
      const d = await r.json();
      if (d.ok) { setOptResult(s => ({ ...s, [c.id]: d })); loadCampaigns(); }
      else setOptResult(s => ({ ...s, [c.id]: { optimized: false, reason: d.error || '최적화 실패' } }));
    } catch { setOptResult(s => ({ ...s, [c.id]: { optimized: false, reason: '서버 오류' } })); }
    setOptBusy(null);
  };

  const execChip = (st) => {
    const map = {
      active: { bg: 'rgba(34,197,94,0.12)', c: '#16a34a', label: t('autoCamp.execActive', '집행중') },
      pending_connection: { bg: 'rgba(245,158,11,0.12)', c: '#d97706', label: t('autoCamp.execPending', '연결 대기') },
    };
    const s = map[st] || map.pending_connection;
    return <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: s.bg, color: s.c }}>{s.label}</span>;
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* AI 디자인 연결 */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>🎨 {t('autoCamp.linkTitle', 'AI 디자인 연결')}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>
          {t('autoCamp.linkDesc', 'AI 디자인 스튜디오에서 적용한 광고 디자인을 이 캠페인에 연결합니다. 연결할 디자인을 선택하세요.')}
        </div>
        {designs.length === 0 ? (
          <div style={{ padding: '18px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            ⚠️ {t('autoCamp.noDesigns', '적용된 AI 디자인이 없습니다. 먼저 [크리에이티브 스튜디오 → 새로 만들기]에서 AI 광고 디자인을 생성하고 "적용하기" 하세요.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {designs.map(d => <DesignThumb key={d.id} d={d} selected={selDesigns.includes(d.id)} onToggle={() => toggleDesign(d.id)} />)}
          </div>
        )}
      </div>

      {/* [227차] 오디언스/리타겟팅 — CRM 고객을 매체 맞춤 오디언스로 업로드(해시) */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>🎯 {t('autoCamp.audTitle', '리타겟팅 오디언스')}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.6 }}>
          {t('autoCamp.audDesc', '내 CRM 고객·구매자를 매체 맞춤 오디언스로 업로드해 정밀 리타겟팅합니다. 이메일은 sha256 해시로만 전송되어 안전합니다(원문 미저장).')}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 10, fontSize: 12, color: '#0369a1', cursor: 'pointer' }}>
          <input type="checkbox" checked={audLookalike} onChange={e => setAudLookalike(e.target.checked)} />
          <span style={{ fontWeight: 700 }}>{t('autoCamp.audLookalike', 'Meta 룩어라이크(유사 타깃) 자동 확장')}</span>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => syncAudience('meta')} disabled={!!audBusy}
            style={{ padding: '9px 16px', borderRadius: 9, border: 'none', cursor: audBusy ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, background: audBusy === 'meta' ? 'rgba(24,119,242,0.4)' : 'rgba(24,119,242,0.1)', color: '#1877f2' }}>
            {audBusy === 'meta' ? `⏳ ${t('autoCamp.audUploading', '업로드 중…')}` : `📘 ${t('autoCamp.audMeta', 'Meta 오디언스 동기화')}`}
          </button>
          <button onClick={() => syncAudience('google')} disabled={!!audBusy}
            style={{ padding: '9px 16px', borderRadius: 9, border: 'none', cursor: audBusy ? 'wait' : 'pointer', fontSize: 12, fontWeight: 700, background: audBusy === 'google' ? 'rgba(66,133,244,0.4)' : 'rgba(66,133,244,0.1)', color: '#4285f4' }}>
            {audBusy === 'google' ? `⏳ ${t('autoCamp.audUploading', '업로드 중…')}` : `🔵 ${t('autoCamp.audGoogle', 'Google Customer Match')}`}
          </button>
        </div>
        {audMsg && <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 9, fontSize: 11.5, fontWeight: 600, lineHeight: 1.5, background: audMsg.t === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: audMsg.t === 'ok' ? '#16a34a' : '#dc2626' }}>{audMsg.m}</div>}
      </div>

      {/* 실행 요약 + 실행 버튼 */}
      {draft && draft.allocations?.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>🚀 {t('autoCamp.launchTitle', '광고 자동 실행')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(79,142,247,0.06)' }}><div style={{ fontSize: 10, color: '#64748b' }}>{t('autoCamp.budget', '예산')}</div><div style={{ fontSize: 16, fontWeight: 800, color: '#4f8ef7' }}>{fmt(draft.budget)}</div></div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.06)' }}><div style={{ fontSize: 10, color: '#64748b' }}>{t('autoCamp.estRoas', '예상 ROAS')}</div><div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e' }}>{draft.estimatedRoas}x</div></div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.06)' }}><div style={{ fontSize: 10, color: '#64748b' }}>{t('autoCamp.channels', '채널')}</div><div style={{ fontSize: 16, fontWeight: 800, color: '#a855f7' }}>{draft.allocations.length}</div></div>
            <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.06)' }}><div style={{ fontSize: 10, color: '#64748b' }}>{t('autoCamp.linkedDesigns', '연결 디자인')}</div><div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>{selDesigns.length}</div></div>
          </div>
          {selDesigns.length >= 2 && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)', cursor: 'pointer' }}>
              <input type="checkbox" checked={abMode} onChange={e => setAbMode(e.target.checked)} style={{ marginTop: 2 }} />
              <span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0369a1' }}>🧪 {t('autoCamp.abMode', '크리에이티브 자동 A/B 테스트')}</span>
                <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>
                  {t('autoCamp.abModeDesc', '선택한 디자인')} {selDesigns.length}{t('autoCamp.abModeDesc2', '개를 동시 집행 → variant별 성과 측정 → 통계 승자 자동 선정 → 예산 집중·패자 자동 정지(매시 자동)')}
                </span>
              </span>
            </label>
          )}
          {/* [283차 P0-1] 랜딩 URL — 광고 클릭 목적지. 미입력 시 집행 차단(백엔드도 fail-closed). */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 5 }}>
              🔗 {t('autoCamp.landingLabel', '광고 랜딩 URL')} <span style={{ color: '#dc2626' }}>*</span>
            </div>
            <input type="url" value={landingUrl} onChange={e => setLandingUrl(e.target.value)}
              placeholder={t('autoCamp.landingPh', 'https://내쇼핑몰.com/products/best')}
              style={{ width: '100%', padding: '11px 13px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', color: '#1e293b', background: '#f8fafc', border: `1px solid ${(landingUrl || '').trim() ? '#e2e8f0' : 'rgba(239,68,68,0.45)'}` }} />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 5, lineHeight: 1.5 }}>
              {t('autoCamp.landingDesc', '광고를 클릭한 고객이 이동할 내 사이트/상품 페이지 주소입니다. 미입력 시 광고가 생성되지 않습니다(잘못된 목적지로 광고비가 나가는 것을 차단).')}
            </div>
          </div>
          {!selDesigns.length && (
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 11.5, color: '#92400e', lineHeight: 1.55 }}>
              ⚠️ {t('autoCamp.needDesign', '광고 소재를 1개 이상 선택하세요. 소재 없이 집행하면 기본 카피로 게재됩니다.')}
            </div>
          )}
          <button onClick={launch} disabled={busy || !(landingUrl || '').trim() || !selDesigns.length}
            style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: busy ? 'wait' : (!(landingUrl || '').trim() || !selDesigns.length) ? 'not-allowed' : 'pointer', background: (busy || !(landingUrl || '').trim() || !selDesigns.length) ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 800, fontSize: 14 }}>
            {busy ? `⏳ ${t('autoCamp.launching', '실행 중…')}` : `🚀 ${t('autoCamp.launch', '광고 마케팅 자동 실행')}`}
          </button>
          {msg && <div style={{ marginTop: 10, padding: '10px 13px', borderRadius: 9, fontSize: 12, fontWeight: 600, background: msg.t === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: msg.t === 'ok' ? '#16a34a' : '#dc2626' }}>{msg.m}</div>}
        </div>
      )}

      {/* 실행중 캠페인 */}
      {campaigns.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#1e293b' }}>📡 {t('autoCamp.runningTitle', '실행중 자동 캠페인')} ({campaigns.length})</div>
            {campaigns.some(c => c.status === 'active') && (
              <button onClick={pauseAllNow} disabled={killBusy}
                style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)', cursor: killBusy ? 'wait' : 'pointer', fontSize: 11.5, fontWeight: 700, background: killBusy ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                {killBusy ? `⏳ ${t('autoCamp.killing', '정지 중…')}` : `🛑 ${t('autoCamp.killAll', '전체 긴급정지')}`}
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {campaigns.map(c => {
              const exec = c.exec_status || {};
              return (
                <div key={c.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(248,250,252,0.7)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{c.name}
                        <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: c.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.18)', color: c.status === 'active' ? '#16a34a' : '#64748b' }}>{c.status === 'active' ? `🟢 ${t('autoCamp.statusActive', '활성')}` : `⏸ ${t('autoCamp.statusPaused', '일시정지')}`}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{c.category} · {fmt(c.budget)} · ROAS {c.est_roas || '—'}x · {t('autoCamp.designs', '디자인')} {(c.design_ids || []).length}</div>
                    </div>
                    <button onClick={() => toggleStatus(c)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: c.status === 'active' ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)', color: c.status === 'active' ? '#d97706' : '#16a34a' }}>
                      {c.status === 'active' ? `⏸ ${t('autoCamp.pause', '일시정지')}` : `▶ ${t('autoCamp.resume', '재개')}`}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {(c.channels || []).map(ch => (
                      <span key={ch} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 7, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', fontSize: 11, fontWeight: 600, color: '#334155' }}>
                        {CHLABEL[ch] || ch} {execChip(exec[ch])}
                      </span>
                    ))}
                  </div>

                  {/* [227차] 라이브 실시간 성과 — 매체 집행 결과(performance_metrics, 매시 ingest·30초 폴링) */}
                  {c.live && (c.live.spend > 0 || c.live.impressions > 0) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, padding: '9px 12px', borderRadius: 9, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#16a34a', alignSelf: 'center' }}>📊 {t('autoCamp.liveTitle', '실시간 성과')}</span>
                      {[[t('autoCamp.liveSpend', '집행'), fmt(c.live.spend)], [t('autoCamp.liveRevenue', '매출'), fmt(c.live.revenue)], ['ROAS', `${c.live.roas}x`], [t('autoCamp.liveConv', '전환'), c.live.conversions], ['CTR', `${c.live.clicks > 0 && c.live.impressions > 0 ? (c.live.clicks / c.live.impressions * 100).toFixed(1) : '0.0'}%`]].map(([lb, v], i) => (
                        <span key={i} style={{ fontSize: 11 }}><span style={{ color: '#94a3b8', fontWeight: 600 }}>{lb} </span><span style={{ fontWeight: 800, color: lb === 'ROAS' ? (c.live.roas >= 1 ? '#16a34a' : '#dc2626') : '#1e293b' }}>{v}</span></span>
                      ))}
                    </div>
                  )}

                  {/* Phase3 — 실시간 최적화 */}
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>⚡ {t('autoCamp.optTitle', '실시간 효과 최적화')}</span>
                      <button onClick={() => optimize(c)} disabled={optBusy === c.id}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: optBusy === c.id ? 'wait' : 'pointer', fontSize: 11, fontWeight: 700, background: optBusy === c.id ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff' }}>
                        {optBusy === c.id ? `⏳ ${t('autoCamp.optimizing', '분석 중…')}` : `⚡ ${t('autoCamp.optimizeNow', '지금 최적화')}`}
                      </button>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>{t('autoCamp.optDesc', '최근 14일 성과(ROAS·CTR) 분석 → 최고 성과 채널로 예산 자동 재배분, 손해 채널 회수. (매시 자동 실행)')}</div>

                    {optResult[c.id] && (
                      optResult[c.id].optimized ? (
                        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                          {(optResult[c.id].decisions || []).length === 0 && (
                            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✅ {t('autoCamp.optNoChange', '현재 배분이 최적입니다. 변경 없음.')}</div>
                          )}
                          {(optResult[c.id].decisions || []).map((d, k) => (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '6px 10px', borderRadius: 8, background: d.action === 'pause' ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)' }}>
                              <span style={{ fontWeight: 800, color: d.action === 'pause' ? '#dc2626' : '#16a34a' }}>{d.action === 'pause' ? '⏸' : '▲'} {CHLABEL[d.channel] || d.channel}</span>
                              <span style={{ color: '#475569' }}>{d.reason}</span>
                              {d.action === 'realloc' && <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#334155' }}>{fmt(d.old)} → {fmt(d.new)}</span>}
                            </div>
                          ))}
                          {/* 채널별 성과 */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                            {Object.entries(optResult[c.id].metrics || {}).map(([ch, m]) => (
                              <span key={ch} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(79,142,247,0.07)', color: '#475569' }}>
                                {CHLABEL[ch] || ch}: ROAS {m.roas}x · CTR {m.ctr}%{!m.has_data ? ` (${t('autoCamp.noData', '데이터 없음')})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#d97706', padding: '8px 11px', borderRadius: 8, background: 'rgba(245,158,11,0.06)' }}>ℹ️ {optResult[c.id].reason}</div>
                      )
                    )}
                  </div>

                  {/* 크리에이티브 A/B 테스트 — variant별 성과·승자 */}
                  {(abTests[c.id] || []).length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0ea5e9' }}>🧪 {t('autoCamp.abTitle', '크리에이티브 A/B 테스트')}</div>
                      {(abTests[c.id] || []).map(tst => (
                        <div key={tst.id} style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
                            {CHLABEL[tst.channel] || tst.channel} · {tst.status === 'winner_selected' ? `🏆 ${t('autoCamp.abWinnerSel', '승자 선정 완료')}` : `⏳ ${t('autoCamp.abRunning', '테스트 진행중(통계 수집)')}`}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {(tst.variants || []).map(v => (
                              <span key={v.id} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 7, fontWeight: 600,
                                background: v.status === 'winner' ? 'rgba(34,197,94,0.14)' : (v.status === 'paused' ? 'rgba(239,68,68,0.08)' : 'rgba(14,165,233,0.08)'),
                                color: v.status === 'winner' ? '#16a34a' : (v.status === 'paused' ? '#dc2626' : '#0369a1') }}>
                                {v.status === 'winner' ? '🏆 ' : (v.status === 'paused' ? '⏸ ' : '')}{v.label} · ROAS {v.roas}x · {Number(v.impressions || 0).toLocaleString()} {t('autoCamp.imp', '노출')}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {Object.values(campaigns[0]?.exec_status || {}).includes('pending_connection') && (
            <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 9, fontSize: 11, lineHeight: 1.6, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', color: '#92400e' }}>
              ℹ️ {t('autoCamp.pendingNote', "'연결 대기' 채널은 해당 채널의 광고 API 자격증명을 [통합 허브]에서 연결하면 자동으로 집행이 시작됩니다.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
