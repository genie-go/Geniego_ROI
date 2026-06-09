import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useI18n } from '../i18n';
import { getJsonAuth, postJson } from '../services/apiClient.js';

/* ═══════════════════════════════════════════════════════════════
   AdChannelConnect — 광고 매체 자동집행 연동 (201차)
   ★ 목적: Meta/Google/TikTok/Naver/Coupang 쓰기(write) 자격증명을 매체별 안내 폼으로 등록.
     입력만 하면 마케팅 자동화(추천→집행→최적화)가 해당 매체에서 활성화되도록 정확한
     channel/key_name 으로 저장(백엔드 Connectors/AutoCampaign 이 읽는 키와 1:1 일치).
   ★ 격리: 자격증명은 테넌트 스코프(/v423/creds, channel_credential WHERE tenant_id)로 저장.
     값은 발급 시 마스킹 표시, 절대 타 계정 유입/노출 없음.
   ═══════════════════════════════════════════════════════════════ */

// channel = AutoCampaign connectorKey / Connectors::loadCred 채널값과 정확히 일치해야 함.
const PLATFORMS = [
  {
    id: 'meta_ads', name: 'Meta (Facebook · Instagram)', icon: '📘', color: '#1877f2',
    scope: 'ads_management',
    helpKey: 'helpMeta', help: 'Meta 비즈니스 관리자 → 시스템 사용자 → ads_management 권한 토큰 발급. 광고 계정 ID는 act_ 로 시작.',
    fields: [
      { k: 'access_token', labelKey: 'fAccessToken', label: '액세스 토큰', secret: true },
      { k: 'ad_account_id', labelKey: 'fAdAccountId', label: '광고 계정 ID (act_...)', secret: false },
    ],
  },
  {
    id: 'google_ads', name: 'Google Ads', icon: '🔍', color: '#4285f4',
    scope: 'adwords',
    helpKey: 'helpGoogle', help: 'Google Ads API 센터에서 개발자 토큰 + OAuth 액세스 토큰 + 고객 ID(10자리, 하이픈 제외).',
    fields: [
      { k: 'developer_token', labelKey: 'fDevToken', label: '개발자 토큰', secret: true },
      { k: 'access_token', labelKey: 'fAccessToken', label: '액세스 토큰', secret: true },
      { k: 'customer_id', labelKey: 'fCustomerId', label: '고객 ID (10자리)', secret: false },
    ],
  },
  {
    id: 'tiktok_business', name: 'TikTok Ads', icon: '🎵', color: '#ff0050',
    scope: 'advertiser write',
    helpKey: 'helpTiktok', help: 'TikTok for Business → 앱 승인 → 액세스 토큰 + 광고주 ID(advertiser_id).',
    fields: [
      { k: 'access_token', labelKey: 'fAccessToken', label: '액세스 토큰', secret: true },
      { k: 'advertiser_id', labelKey: 'fAdvertiserId', label: '광고주 ID', secret: false },
    ],
  },
  {
    id: 'naver_sa', name: 'Naver 검색광고', icon: '🟩', color: '#03c75a',
    scope: '',
    helpKey: 'helpNaver', help: '네이버 검색광고 → 도구 → API 사용 관리에서 API 키 + 비밀키 + 고객 ID(CUSTOMER_ID) 발급.',
    fields: [
      { k: 'api_key', labelKey: 'fApiKey', label: 'API 키', secret: true },
      { k: 'api_secret', labelKey: 'fApiSecret', label: '비밀키', secret: true },
      { k: 'customer_id', labelKey: 'fCustomerId', label: '고객 ID', secret: false },
    ],
  },
  {
    id: 'coupang', name: 'Coupang', icon: '🛍', color: '#ef4444',
    scope: '',
    helpKey: 'helpCoupang', help: '쿠팡 WING → 업체 정보 → Open API 키 관리에서 액세스 키 + 시크릿 키 + 벤더 ID.',
    fields: [
      { k: 'access_key', labelKey: 'fAccessKey', label: '액세스 키', secret: true },
      { k: 'secret_key', labelKey: 'fSecretKey', label: '시크릿 키', secret: true },
      { k: 'vendor_id', labelKey: 'fVendorId', label: '벤더 ID', secret: false },
    ],
  },
];

// 저장 직후 자동 동기화 매핑 — 광고 성과 ingest 브릿지(/v423/connectors/sync)의
// 단축 채널명. 자격증명을 등록하면 즉시 performance_metrics 적재가 트리거된다.
// naver_sa/coupang 은 성과 ingest 대상이 아니므로(별도 트랙) 제외.
const SYNC_CHANNEL = { meta_ads: 'meta', google_ads: 'google', tiktok_business: 'tiktok', naver_sa: 'naver' };

export default function AdChannelConnect() {
  const { t } = useI18n();
  const tr = (k, fb) => t(`adConn.${k}`, fb);
  const [creds, setCreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState({});     // { channel: { key_name: value } }
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({});         // { channel: {text,ok} }
  const [showGuide, setShowGuide] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getJsonAuth('/v423/creds');
      setCreds(Array.isArray(d?.credentials) ? d.credentials : (Array.isArray(d?.creds) ? d.creds : (Array.isArray(d) ? d : [])));
    } catch (e) { setCreds([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // channel+key_name 으로 기존 등록 여부 맵
  const credMap = useMemo(() => {
    const m = {};
    creds.forEach(c => { m[`${c.channel}::${c.key_name}`] = c; });
    return m;
  }, [creds]);

  const platformStatus = (p) => {
    const set = p.fields.filter(f => credMap[`${p.id}::${f.k}`]?.is_active);
    if (set.length === 0) return { state: 'none', label: tr('stNone', '미연결'), color: '#94a3b8' };
    if (set.length === p.fields.length) return { state: 'ok', label: tr('stConnected', '연결됨'), color: '#22c55e' };
    return { state: 'partial', label: tr('stPartial', '일부 입력'), color: '#f59e0b' };
  };

  const setField = (ch, k, v) => setForms(f => ({ ...f, [ch]: { ...(f[ch] || {}), [k]: v } }));

  const save = async (p) => {
    setBusy(p.id); setMsg(m => ({ ...m, [p.id]: null }));
    try {
      const f = forms[p.id] || {};
      let saved = 0;
      for (const fld of p.fields) {
        const val = (f[fld.k] || '').trim();
        if (!val) continue;                 // 입력한 필드만 저장(빈 값 미덮어씀)
        await postJson('/v423/creds', { channel: p.id, key_name: fld.k, key_value: val, label: p.name });
        saved++;
      }
      if (saved === 0) { setMsg(m => ({ ...m, [p.id]: { text: tr('noInput', '입력한 자격증명이 없습니다.'), ok: false } })); }
      else {
        setForms(f => ({ ...f, [p.id]: {} }));   // 저장 후 입력칸 비움(마스킹 표시는 목록 갱신으로)
        setMsg(m => ({ ...m, [p.id]: { text: `${saved}${tr('savedSuffix', '개 항목 저장 완료')}`, ok: true } }));
        await load();

        // 저장 직후 자동 동기화 — 자격증명만 등록하면 즉시 성과 데이터가 적재되도록 트리거.
        const syncCh = SYNC_CHANNEL[p.id];
        if (syncCh) {
          setMsg(m => ({ ...m, [p.id]: { text: tr('syncing', '연동 동기화 중...'), ok: true } }));
          try {
            const sr = await postJson('/v423/connectors/sync', { channels: syncCh });
            const info = sr?.channels?.[syncCh] || {};
            if (info.status === 'ok') {
              setMsg(m => ({ ...m, [p.id]: { text: `${saved}${tr('savedSuffix', '개 항목 저장 완료')} · ${tr('syncOk', '성과 동기화 완료')} (${info.rows ?? 0}${tr('rowsSuffix', '행')})`, ok: true } }));
            } else if (info.status === 'error') {
              // 저장은 성공, 라이브 fetch 만 실패(토큰 권한/유효성) — 정직하게 안내.
              setMsg(m => ({ ...m, [p.id]: { text: `${saved}${tr('savedSuffix', '개 항목 저장 완료')} · ${tr('syncFail', '동기화 대기(자격증명/권한 확인 필요)')}`, ok: true } }));
            } else {
              setMsg(m => ({ ...m, [p.id]: { text: `${saved}${tr('savedSuffix', '개 항목 저장 완료')}`, ok: true } }));
            }
          } catch (se) {
            // 동기화 실패는 저장 성공을 무효화하지 않음(다음 cron 주기에 재시도).
            setMsg(m => ({ ...m, [p.id]: { text: `${saved}${tr('savedSuffix', '개 항목 저장 완료')} · ${tr('syncRetry', '동기화는 곧 자동 재시도됩니다')}`, ok: true } }));
          }
        }
      }
    } catch (e) {
      setMsg(m => ({ ...m, [p.id]: { text: tr('saveFail', '저장 실패') + ': ' + (e?.message || ''), ok: false } }));
    } finally { setBusy(''); }
  };

  const test = async (p) => {
    setBusy(p.id + ':test');
    try {
      const r = await postJson(`/v423/connectors/${encodeURIComponent(p.id)}/test`, {});
      const ok = r?.ok !== false && (r?.live || r?.connected || r?.message);
      setMsg(m => ({ ...m, [p.id]: { text: (r?.message || (ok ? tr('testOk', '연결 정상') : tr('testFail', '연결 실패'))), ok } }));
    } catch (e) {
      setMsg(m => ({ ...m, [p.id]: { text: tr('testFail', '연결 실패') + ': ' + (e?.message || ''), ok: false } }));
    } finally { setBusy(''); }
  };

  const cardStyle = { borderRadius: 16, padding: 20, background: 'var(--surface, rgba(255,255,255,0.85))', border: '1px solid var(--border, rgba(0,0,0,0.07))' };
  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface2, var(--surface))', color: 'var(--text-1)', fontSize: 12.5, outline: 'none' };

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      {/* Hero */}
      <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.08),rgba(168,85,247,0.06))', borderColor: 'rgba(249,115,22,0.15)' }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(249,115,22,0.25),rgba(168,85,247,0.15))' }}>🔗</div>
          <div>
            {/* 206차: 인라인 linear-gradient 배경 제거 — 라이트테마 전역규칙(styles.css 3389)이 gradient 인라인을
                흰 카드박스+border로 강제 override해 padding 없는 좁은 박스가 제목을 아래로 자르던 문제. 일반 제목으로 통일. */}
            <div className="hero-title">{tr('heroTitle', '광고 매체 자동집행 연동')}</div>
            <div className="hero-desc">{tr('heroDesc', '광고 매체 쓰기 권한 자격증명을 등록하면 마케팅 자동화(추천→집행→실시간 최적화)가 해당 매체에서 활성화됩니다.')}</div>
          </div>
        </div>
      </div>

      {/* 안내 배너 */}
      <div style={{ ...cardStyle, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🔒 {tr('privacy', '자격증명은 로그인 계정(테넌트)에만 암호화 저장되며 다른 계정과 절대 공유되지 않습니다. 입력값은 저장 후 마스킹 표시됩니다.')}
        <br/>⚡ {tr('execNote', '※ 실제 광고 집행은 각 매체가 발급한 “쓰기(write) 권한” 토큰이 필요합니다(읽기 전용 토큰으로는 집행 불가).')}
      </div>

      {loading && <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-3)' }}>{tr('loading', '불러오는 중...')}</div>}

      {/* 매체별 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
        {PLATFORMS.map(p => {
          const st = platformStatus(p);
          const f = forms[p.id] || {};
          const m = msg[p.id];
          return (
            <div key={p.id} style={{ ...cardStyle, borderTop: `3px solid ${p.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{p.icon}</span>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)', flex: 1 }}>{p.name}</div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: st.color + '22', color: st.color, border: `1px solid ${st.color}44` }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 12 }}>
                💡 {tr(p.helpKey, p.help)}{p.scope ? ` · ${tr('scopeLabel', '필요 권한')}: ${p.scope}` : ''}
              </div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                {p.fields.map(fld => {
                  const existing = credMap[`${p.id}::${fld.k}`];
                  return (
                    <div key={fld.k}>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 3 }}>
                        {tr(fld.labelKey, fld.label)}
                        {existing?.is_active && <span style={{ color: '#22c55e', marginLeft: 6 }}>● {tr('stored', '저장됨')}{existing.key_value_masked ? ` (${existing.key_value_masked})` : ''}</span>}
                      </label>
                      <input
                        type={fld.secret ? 'password' : 'text'}
                        value={f[fld.k] || ''}
                        autoComplete="new-password"
                        onChange={e => setField(p.id, fld.k, e.target.value)}
                        placeholder={existing?.is_active ? tr('replacePh', '재입력 시 교체 (비워두면 유지)') : (tr(fld.labelKey, fld.label) + ' ' + tr('inputPh', '입력'))}
                        style={inputStyle}
                      />
                    </div>
                  );
                })}
              </div>
              {m && <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 10, color: m.ok ? '#16a34a' : '#dc2626' }}>{m.ok ? '✅ ' : '❌ '}{m.text}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => save(p)} disabled={busy === p.id}
                  className="btn-primary" style={{ flex: 1, fontSize: 12, padding: '8px 0', background: `linear-gradient(135deg,${p.color},#a855f7)` }}>
                  {busy === p.id ? tr('saving', '저장 중...') : `💾 ${tr('save', '저장')}`}
                </button>
                <button onClick={() => test(p)} disabled={busy === p.id + ':test' || st.state === 'none'}
                  className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px', opacity: st.state === 'none' ? 0.5 : 1 }}>
                  {busy === p.id + ':test' ? tr('testing', '테스트 중...') : `🔌 ${tr('test', '연결 테스트')}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Guide */}
      <div style={{ marginTop: 4 }}>
        <button onClick={() => setShowGuide(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto 12px', padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.06)', color: '#f97316', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          📖 {tr('guideTitle', '광고 매체 연동 이용 가이드')} {showGuide ? '▲' : '▼'}
        </button>
        {showGuide && (
          <div style={{ background: 'var(--surface2, rgba(255,255,255,0.6))', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 16, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>🔗</div>
              <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 6px', color: 'var(--text-1)' }}>{tr('guideTitle', '광고 매체 연동 이용 가이드')}</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>{tr('guideSub', '초보자도 이 순서대로 따라 하면 매체 자격증명을 등록하고 자동 집행을 켤 수 있습니다.')}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: 'linear-gradient(135deg,#f97316,#a855f7)', color: '#fff' }}>{i}</span>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-1)' }}>{tr(`guideStep${i}Title`, '')}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr(`guideStep${i}Desc`, '')}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>💡 {tr('guideTipTitle', '보안·집행 팁')}</div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr('guideTipDesc', '반드시 “쓰기(write) 권한” 토큰을 발급하세요. 자격증명은 테넌트에만 암호화 저장되며, 연결 테스트로 유효성을 확인한 뒤 마케팅 자동화 화면에서 캠페인을 시작하면 됩니다.')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
