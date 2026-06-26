import React, { useState, useEffect, useCallback } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';

const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리

const authToken = () => localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
const api = async (path, opts = {}) => {
  const r = await fetch('/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}`, ...(opts.headers || {}) },
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};

/* ─── 189차+ API 키 관리 패널 (세션 인증·소유자 전용) ─── */
function ApiKeysPanel() {
  const { t } = useI18n();
  const [keys, setKeys] = useState(null);   // null=미조회 | array
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("viewer");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState(null); // {api_key, warning} 1회 표시
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [forbidden, setForbidden] = useState(false);

  const showMsg = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 5000); };

  const load = useCallback(async () => {
    setLoading(true);
    const { status, data } = await api('/auth/api-keys');
    if (status === 403) { setForbidden(true); setKeys([]); }
    else if (data.ok) { setKeys(data.keys || []); setForbidden(false); }
    else setKeys([]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!name.trim()) { showMsg(t('devHub.keyNameRequired', '키 이름을 입력하세요.'), 'err'); return; }
    setBusy(true);
    const { data } = await api('/auth/api-keys', { method: 'POST', body: JSON.stringify({ name: name.trim(), role }) });
    if (data.ok) { setNewKey({ api_key: data.api_key, warning: data.warning }); setName(""); load(); }
    else showMsg(data.error || t('devHub.keyCreateFail', '키 생성에 실패했습니다.'), 'err');
    setBusy(false);
  };

  const handleRevoke = async (id) => {
    if (!window.confirm(t('devHub.keyRevokeConfirm', '이 키를 폐기하시겠습니까? 즉시 무효화됩니다.'))) return;
    const { data } = await api(`/auth/api-keys/${id}`, { method: 'DELETE' });
    if (data.ok) { showMsg(t('devHub.keyRevoked', '키가 폐기되었습니다.'), 'ok'); load(); }
    else showMsg(data.error || t('devHub.keyRevokeFail', '폐기에 실패했습니다.'), 'err');
  };

  const handleRotate = async (id) => {
    if (!window.confirm(t('devHub.keyRotateConfirm', '키를 회전하시겠습니까? 기존 키는 무효화되고 새 키가 발급됩니다.'))) return;
    const { data } = await api(`/auth/api-keys/${id}/rotate`, { method: 'POST', body: '{}' });
    if (data.ok) { setNewKey({ api_key: data.api_key, warning: data.warning }); load(); }
    else showMsg(data.error || t('devHub.keyRotateFail', '회전에 실패했습니다.'), 'err');
  };

  const card = { borderRadius: 12, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(0,0,0,0.07)", padding: 16 };
  const inp = { padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.12)", fontSize: 13, outline: "none", color: "#1e293b", background: "#fff" };
  const roleColors = { viewer: "#64748b", connector: "#0ea5a3", analyst: "#4f8ef7", admin: "#ef4444" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
        🔑 {t('devHub.keysGuide', '서버 간 연동(API)에 사용하는 키를 발급·회전·폐기합니다. 키는 발급 시 한 번만 표시되며 해시로만 저장됩니다. 계정 소유자(owner)만 관리할 수 있습니다.')}
      </div>

      {msg.text && (
        <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
          background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'ok' ? '#16a34a' : '#dc2626' }}>
          {msg.type === 'ok' ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}

      {/* 새 키 1회 표시 */}
      {newKey && (
        <div style={{ ...card, background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.3)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#b45309", marginBottom: 8 }}>⚠️ {newKey.warning || t('devHub.keyOnce', '이 키는 다시 표시되지 않습니다.')}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input readOnly value={newKey.api_key} onFocus={e => e.target.select()} style={{ ...inp, flex: 1, fontFamily: "monospace", fontSize: 12 }} />
            <button onClick={() => { try { navigator.clipboard.writeText(newKey.api_key); showMsg(t('devHub.copied', '복사되었습니다.'), 'ok'); } catch {} }}
              style={{ padding: "9px 14px", borderRadius: 9, border: "none", background: "#4f8ef7", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📋</button>
            <button onClick={() => setNewKey(null)} style={{ padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", color: "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}

      {forbidden ? (
        <div style={{ ...card, textAlign: "center", color: "#64748b", fontSize: 13 }}>
          🔒 {t('devHub.keysOwnerOnly', 'API 키 관리는 계정 소유자(owner)만 사용할 수 있습니다.')}
        </div>
      ) : (
        <>
          {/* 생성 폼 */}
          <div style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "2 1 200px", display: "grid", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>{t('devHub.keyName', '키 이름')}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t('devHub.keyNamePh', '예: 데이터 파이프라인 연동')} style={inp} />
            </div>
            <div style={{ flex: "1 1 120px", display: "grid", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>{t('devHub.keyRole', '역할')}</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                <option value="viewer">viewer (read)</option>
                <option value="connector">connector (ingest)</option>
                <option value="analyst">analyst (write)</option>
                <option value="admin">admin (full)</option>
              </select>
            </div>
            <button onClick={handleCreate} disabled={busy}
              style={{ padding: "10px 18px", borderRadius: 9, border: "none", cursor: busy ? "wait" : "pointer", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontWeight: 800, fontSize: 13 }}>
              {busy ? t('devHub.creating', '발급 중...') : `+ ${t('devHub.keyCreate', '키 발급')}`}
            </button>
          </div>

          {/* 193차 Sprint4 #6: API 사용량 대시보드(읽기전용·기존 last_used_at 클라이언트 집계) */}
          {Array.isArray(keys) && keys.length > 0 && (() => {
            const now = Date.now(), DAY = 86400000;
            const active = keys.filter(k => k.is_active);
            const used7 = active.filter(k => k.last_used_at && (now - new Date(k.last_used_at).getTime()) <= 7 * DAY);
            const never = active.filter(k => !k.last_used_at);
            const expSoon = active.filter(k => k.expires_at && (new Date(k.expires_at).getTime() - now) <= 30 * DAY && new Date(k.expires_at).getTime() >= now);
            const lastUsed = active.map(k => k.last_used_at).filter(Boolean).sort().pop();
            const totalCalls = keys.reduce((s, k) => s + (Number(k.use_count) || 0), 0);
            const cells = [
              ['🔑', t('devHub.uTotal', '전체 키'), keys.length, '#4f8ef7'],
              ['✅', t('devHub.uActive', '활성'), active.length, '#22c55e'],
              ['📡', t('devHub.uCalls', '총 호출수'), totalCalls.toLocaleString(), '#0ea5e9'],
              ['⚡', t('devHub.uUsed7', '최근 7일 사용'), used7.length, '#a855f7'],
              ['💤', t('devHub.uNever', '미사용'), never.length, '#94a3b8'],
              ['⏳', t('devHub.uExpiring', '30일 내 만료'), expSoon.length, expSoon.length ? '#f59e0b' : '#94a3b8'],
            ];
            return (
              <div style={{ ...card }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#475569', marginBottom: 10 }}>📊 {t('devHub.usageTitle', 'API 키 사용 현황')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 10 }}>
                  {cells.map(([ic, l, v, c]) => (
                    <div key={l} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: 'rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: 18 }}>{ic}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {lastUsed && <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 8 }}>{t('devHub.uLastActivity', '최근 API 활동')}: {String(lastUsed).slice(0, 16).replace('T', ' ')} UTC</div>}
              </div>
            );
          })()}

          {/* 키 목록 */}
          {loading && <div style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: 12 }}>{t('devHub.loading', '불러오는 중...')}</div>}
          {Array.isArray(keys) && keys.length === 0 && !loading && (
            <div style={{ ...card, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>{t('devHub.keyNone', '발급된 API 키가 없습니다.')}</div>
          )}
          {Array.isArray(keys) && keys.map(k => (
            <div key={k.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: k.is_active ? 1 : 0.5 }}>
              <div style={{ flex: "1 1 220px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#1e293b" }}>{k.name}</span>
                  <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 9, fontWeight: 800, background: `${roleColors[k.role] || '#64748b'}22`, color: roleColors[k.role] || '#64748b' }}>{k.role}</span>
                  {!k.is_active && <span style={{ padding: "1px 8px", borderRadius: 99, fontSize: 9, fontWeight: 800, background: "rgba(100,116,139,0.15)", color: "#64748b" }}>{t('devHub.keyRevokedTag', '폐기됨')}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, fontFamily: "monospace" }}>{k.key_prefix}…</div>
                <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 2 }}>
                  {t('devHub.keyCreatedAt', '발급')}: {(k.created_at || '').slice(0, 10)}
                  {k.last_used_at && <> · {t('devHub.keyLastUsed', '마지막 사용')}: {(k.last_used_at || '').slice(0, 10)}</>}
                  {k.expires_at && <> · {t('devHub.keyExpires', '만료')}: {(k.expires_at || '').slice(0, 10)}</>}
                  {' · '}{t('devHub.keyCalls', '호출')}: {(Number(k.use_count) || 0).toLocaleString()}{t('devHub.keyCallsUnit', '회')}
                </div>
              </div>
              {!!k.is_active && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleRotate(k.id)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(79,142,247,0.3)", background: "rgba(79,142,247,0.06)", color: "#4f8ef7", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>🔄 {t('devHub.keyRotate', '회전')}</button>
                  <button onClick={() => handleRevoke(k.id)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#dc2626", fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>🗑️ {t('devHub.keyRevoke', '폐기')}</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─── P1 신규: 아웃바운드 웹훅 실관리 패널 (세션 인증 /v429/webhooks/*) ───
   기존 정적 목업 탭을 실제 백엔드(OpenPlatform)에 연결해 구독 등록·테스트·전달로그까지 제공. */
function WebhooksPanel() {
  const { t } = useI18n();
  const [catalog, setCatalog] = useState(null);   // [{type,description,sample_payload}]
  const [endpoints, setEndpoints] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');
  const [sel, setSel] = useState({});             // {eventType:true}
  const [busy, setBusy] = useState(false);
  const [newSecret, setNewSecret] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 5000); };

  const loadCatalog = useCallback(async () => {
    const { data } = await api('/v429/webhooks/events');
    if (Array.isArray(data.events)) setCatalog(data.events); else setCatalog([]);
  }, []);
  const loadEndpoints = useCallback(async () => {
    const { data } = await api('/v429/webhooks/endpoints');
    setEndpoints(Array.isArray(data.endpoints) ? data.endpoints : []);
  }, []);
  const loadDeliveries = useCallback(async () => {
    const { data } = await api('/v429/webhooks/deliveries');
    setDeliveries(Array.isArray(data.deliveries) ? data.deliveries : []);
  }, []);
  useEffect(() => { loadCatalog(); loadEndpoints(); loadDeliveries(); }, [loadCatalog, loadEndpoints, loadDeliveries]);

  const toggleEv = (ev) => setSel(s => ({ ...s, [ev]: !s[ev] }));
  const selectedEvents = () => Object.keys(sel).filter(k => sel[k]);

  const handleCreate = async () => {
    const events = selectedEvents();
    if (!/^https:\/\//i.test(url.trim())) { showMsg(t('devHub.whUrlInvalid', 'URL은 https:// 로 시작해야 합니다.'), 'err'); return; }
    if (events.length === 0) { showMsg(t('devHub.whPickEvent', '구독할 이벤트를 1개 이상 선택하세요.'), 'err'); return; }
    setBusy(true);
    const { data } = await api('/v429/webhooks/endpoints', { method: 'POST', body: JSON.stringify({ url: url.trim(), events, description: desc.trim() }) });
    if (data.ok) { setNewSecret({ secret: data.secret, warning: data.warning }); setUrl(''); setDesc(''); setSel({}); loadEndpoints(); }
    else showMsg(data.error || t('devHub.whCreateFail', '등록에 실패했습니다.'), 'err');
    setBusy(false);
  };
  const handleTest = async (id) => {
    const { data } = await api(`/v429/webhooks/endpoints/${id}/test`, { method: 'POST', body: '{}' });
    if (data.ok) showMsg(t('devHub.whTestOk', '테스트 이벤트가 전달되었습니다.') + ` (HTTP ${data.http_code})`, 'ok');
    else showMsg(t('devHub.whTestFail', '전달 실패') + `: ${data.error || data.http_code || ''}`, 'err');
    loadDeliveries();
  };
  const handleToggle = async (ep) => {
    const { data } = await api(`/v429/webhooks/endpoints/${ep.id}`, { method: 'PUT', body: JSON.stringify({ is_active: ep.is_active ? 0 : 1 }) });
    if (data.ok) loadEndpoints(); else showMsg(data.error || t('devHub.whUpdateFail', '변경 실패'), 'err');
  };
  const handleDelete = async (id) => {
    if (!window.confirm(t('devHub.whDeleteConfirm', '이 웹훅 구독을 삭제하시겠습니까?'))) return;
    const { data } = await api(`/v429/webhooks/endpoints/${id}`, { method: 'DELETE' });
    if (data.ok) { showMsg(t('devHub.whDeleted', '삭제되었습니다.'), 'ok'); loadEndpoints(); } else showMsg(data.error || t('devHub.whDeleteFail', '삭제 실패'), 'err');
  };

  const card = { borderRadius: 12, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.07)', padding: 16 };
  const inp = { padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff' };
  const codeBox = { fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: '14px 16px', lineHeight: 1.6 };
  const statusColor = { delivered: '#16a34a', pending: '#64748b', retry: '#f59e0b', failed: '#dc2626', dropped: '#94a3b8' };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
        🪝 {t('devHub.webhookIntro', '이벤트 발생 시 등록한 URL로 서명된 POST 요청을 전송합니다. X-Genie-Signature 헤더(HMAC-SHA256)로 위변조를 검증하세요.')}
      </div>

      {msg.text && (
        <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
          background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: msg.type === 'ok' ? '#16a34a' : '#dc2626' }}>
          {msg.type === 'ok' ? '✅ ' : '❌ '}{msg.text}
        </div>
      )}

      {/* 시크릿 1회 표시 */}
      {newSecret && (
        <div style={{ ...card, background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.3)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309', marginBottom: 8 }}>⚠️ {newSecret.warning || t('devHub.whSecretOnce', '이 서명 시크릿은 다시 표시되지 않습니다.')}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input readOnly value={newSecret.secret} onFocus={e => e.target.select()} style={{ ...inp, flex: 1, fontFamily: 'monospace', fontSize: 12 }} />
            <button onClick={() => { try { navigator.clipboard.writeText(newSecret.secret); showMsg(t('devHub.copied', '복사되었습니다.'), 'ok'); } catch {} }}
              style={{ padding: '9px 14px', borderRadius: 9, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📋</button>
            <button onClick={() => setNewSecret(null)} style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {/* 등록 폼 */}
      <div style={{ ...card, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{t('devHub.whRegister', '웹훅 엔드포인트 등록')}</div>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/hooks/genie" style={inp} />
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('devHub.whDescPh', '설명(선택)')} style={inp} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>{t('devHub.whSubscribeEvents', '구독 이벤트')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(catalog || []).map(ev => (
              <label key={ev.type} title={ev.description} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, cursor: 'pointer',
                background: sel[ev.type] ? 'rgba(79,142,247,0.12)' : 'rgba(0,0,0,0.03)', border: `1px solid ${sel[ev.type] ? 'rgba(79,142,247,0.4)' : 'rgba(0,0,0,0.08)'}` }}>
                <input type="checkbox" checked={!!sel[ev.type]} onChange={() => toggleEv(ev.type)} style={{ cursor: 'pointer' }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#2563eb' }}>{ev.type}</span>
              </label>
            ))}
            {catalog && catalog.length === 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('devHub.whNoCatalog', '이벤트 카탈로그를 불러오지 못했습니다.')}</span>}
          </div>
        </div>
        <button onClick={handleCreate} disabled={busy}
          style={{ justifySelf: 'start', padding: '10px 18px', borderRadius: 9, border: 'none', cursor: busy ? 'wait' : 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 13 }}>
          {busy ? t('devHub.whRegistering', '등록 중...') : `+ ${t('devHub.whRegisterBtn', '구독 등록')}`}
        </button>
      </div>

      {/* 등록된 엔드포인트 목록 */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{t('devHub.whEndpoints', '등록된 엔드포인트')}</div>
        {endpoints === null && <div style={{ ...card, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('devHub.loading', '불러오는 중...')}</div>}
        {Array.isArray(endpoints) && endpoints.length === 0 && (
          <div style={{ ...card, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('devHub.whNone', '등록된 웹훅 구독이 없습니다.')}</div>
        )}
        {Array.isArray(endpoints) && endpoints.map(ep => (
          <div key={ep.id} style={{ ...card, display: 'grid', gap: 8, opacity: ep.is_active ? 1 : 0.55 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e293b', wordBreak: 'break-all', flex: '1 1 200px' }}>{ep.url}</span>
              <span style={{ padding: '1px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800, background: ep.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)', color: ep.is_active ? '#16a34a' : '#64748b' }}>
                {ep.is_active ? t('devHub.whActive', '활성') : t('devHub.whPaused', '일시중지')}
              </span>
              {ep.last_status && <span style={{ fontSize: 10, color: '#94a3b8' }}>{t('devHub.whLast', '최근')}: {ep.last_status}</span>}
              {Number(ep.failure_count) > 0 && <span style={{ fontSize: 10, color: '#dc2626' }}>{t('devHub.whFails', '실패')} {ep.failure_count}</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(ep.events || []).map(e => <span key={e} style={{ fontFamily: 'monospace', fontSize: 10, padding: '2px 8px', borderRadius: 14, background: 'rgba(79,142,247,0.08)', color: '#2563eb' }}>{e}</span>)}
            </div>
            {ep.secret_masked && <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>secret: {ep.secret_masked}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => handleTest(ep.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)', color: '#16a34a', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>🚀 {t('devHub.whTest', '테스트')}</button>
              <button onClick={() => handleToggle(ep)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>{ep.is_active ? `⏸ ${t('devHub.whPause', '중지')}` : `▶ ${t('devHub.whResume', '재개')}`}</button>
              <button onClick={() => handleDelete(ep.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>🗑️ {t('devHub.whDelete', '삭제')}</button>
            </div>
          </div>
        ))}
      </div>

      {/* 전달 로그 */}
      {deliveries.length > 0 && (
        <div style={{ ...card }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 10 }}>📜 {t('devHub.whDeliveries', '최근 전달 로그')}</div>
          <div style={{ display: 'grid', gap: 4 }}>
            {deliveries.slice(0, 15).map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', fontSize: 11, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', color: '#2563eb', flex: '1 1 140px' }}>{d.event_type}</span>
                <span style={{ fontWeight: 800, color: statusColor[d.status] || '#64748b' }}>{d.status}</span>
                {d.http_code > 0 && <span style={{ color: '#94a3b8' }}>HTTP {d.http_code}</span>}
                {Number(d.attempts) > 0 && <span style={{ color: '#94a3b8' }}>· {d.attempts}{t('devHub.whAttempts', '회 시도')}</span>}
                <span style={{ color: '#cbd5e1', marginLeft: 'auto' }}>{String(d.created_at || '').slice(0, 16).replace('T', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 서명 검증 예시 */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>{t('devHub.whVerifyTitle', '서명 검증 (수신 측)')}</div>
        <div style={codeBox}>{`// X-Genie-Signature: t=<ts>,v1=<hmac>\nconst [tPart, v1Part] = sigHeader.split(',');\nconst ts = tPart.split('=')[1], v1 = v1Part.split('=')[1];\nconst expected = crypto.createHmac('sha256', ENDPOINT_SECRET)\n  .update(ts + '.' + rawBody).digest('hex');\nif (expected === v1 && Date.now()/1000 - ts < 300) { /* valid */ }`}</div>
      </div>
    </div>
  );
}

/* ─── [245차 P1-1] DW/BI 데이터 익스포트 패널 (DataExport /v429/exports/*) ───
   SSOT(주문·광고지표·정산·어트리뷰션·KPI)를 BigQuery·Snowflake·Google Sheets·범용 HTTP로 자동 싱크.
   ★자격증명 등록 즉시 활성(configured) — 스케줄/수동 실행 시 자동 push. Funnel.io/Supermetrics 영역. */
const EXPORT_SECRET_FIELDS = ['secret', 'service_account_json', 'private_key'];
const EXPORT_TEXTAREA_FIELDS = ['service_account_json', 'private_key'];
function DataExportPanel() {
  const { t } = useI18n();
  const [meta, setMeta] = useState({ datasets: [], types: [] });
  const [dests, setDests] = useState(null);
  const [runs, setRuns] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'http', frequency: 'daily', period_days: 7, datasets: ['orders', 'ad_metrics'], config: {} });
  const [editId, setEditId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const showMsg = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 5000); };

  const loadMeta = useCallback(async () => { const { data } = await api('/v429/exports/datasets'); if (data.ok) setMeta({ datasets: data.datasets || [], types: data.types || [] }); }, []);
  const loadDests = useCallback(async () => { const { data } = await api('/v429/exports/destinations'); setDests(Array.isArray(data.destinations) ? data.destinations : []); }, []);
  const loadRuns = useCallback(async () => { const { data } = await api('/v429/exports/runs'); setRuns(Array.isArray(data.runs) ? data.runs : []); }, []);
  useEffect(() => { loadMeta(); loadDests(); loadRuns(); }, [loadMeta, loadDests, loadRuns]);

  const typeDef = meta.types.find(x => x.key === form.type) || { fields: [] };
  const reset = () => { setForm({ name: '', type: 'http', frequency: 'daily', period_days: 7, datasets: ['orders', 'ad_metrics'], config: {} }); setEditId(0); };
  const edit = (d) => { setEditId(d.id); setForm({ name: d.name, type: d.type, frequency: d.frequency, period_days: d.period_days, datasets: d.datasets || [], config: { ...d.config } }); };
  const toggleDs = (ds) => setForm(f => ({ ...f, datasets: f.datasets.includes(ds) ? f.datasets.filter(x => x !== ds) : [...f.datasets, ds] }));
  const setCfg = (k, v) => setForm(f => ({ ...f, config: { ...f.config, [k]: v } }));

  const save = async () => {
    if (!form.name.trim()) { showMsg(t('devHub.exNameReq', '이름을 입력하세요.'), 'err'); return; }
    setBusy(true);
    const path = editId ? `/v429/exports/destinations/${editId}` : '/v429/exports/destinations';
    const { data } = await api(path, { method: editId ? 'PUT' : 'POST', body: JSON.stringify(form) });
    if (data.ok) { showMsg(data.configured ? t('devHub.exSavedActive', '저장됨 — 자격증명 완비, 자동 싱크 활성') : t('devHub.exSavedPending', '저장됨 — 자격증명 입력 시 활성화'), 'ok'); reset(); loadDests(); }
    else showMsg(data.error || t('devHub.exSaveFail', '저장 실패'), 'err');
    setBusy(false);
  };
  const run = async (id) => { setBusy(true); const { data } = await api(`/v429/exports/destinations/${id}/run`, { method: 'POST', body: '{}' }); if (data.ok) showMsg(t('devHub.exRunOk', '익스포트 실행됨'), 'ok'); else showMsg((data.result && data.result.error) || data.error || t('devHub.exRunFail', '실행 실패'), 'err'); loadDests(); loadRuns(); setBusy(false); };
  const del = async (id) => { if (!window.confirm(t('devHub.exDelConfirm', '이 익스포트 대상을 삭제하시겠습니까?'))) return; const { data } = await api(`/v429/exports/destinations/${id}`, { method: 'DELETE' }); if (data.ok) { showMsg(t('devHub.exDeleted', '삭제되었습니다.'), 'ok'); loadDests(); } };

  const card = { borderRadius: 12, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.07)', padding: 16 };
  const inp = { padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', width: '100%', boxSizing: 'border-box' };
  const statusColor = { ok: '#16a34a', partial: '#f59e0b', failed: '#dc2626', unconfigured: '#94a3b8', skipped_demo: '#94a3b8' };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
        🗄️ {t('devHub.exportIntro', 'GeniegoROI 데이터(주문·광고지표·정산·어트리뷰션·KPI)를 BigQuery·Snowflake·Google Sheets·웨어하우스로 자동 싱크합니다. 자격증명만 등록하면 스케줄(또는 즉시 실행)에 따라 자동 전송됩니다.')}
      </div>
      {msg.text && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.type === 'ok' ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}

      {/* 대상 등록/수정 폼 */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 12 }}>{editId ? '✏️ ' + t('devHub.exEdit', '익스포트 대상 수정') : '➕ ' + t('devHub.exNew', '새 익스포트 대상')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input style={inp} placeholder={t('devHub.exName', '이름')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, config: {} }))}>
            {meta.types.map(tp => <option key={tp.key} value={tp.key}>{tp.label}</option>)}
          </select>
        </div>
        {typeDef.note && <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>ℹ️ {typeDef.note}</div>}
        {/* 타입별 설정 필드 */}
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {(typeDef.fields || []).map(fld => EXPORT_TEXTAREA_FIELDS.includes(fld)
            ? <textarea key={fld} style={{ ...inp, minHeight: 64, fontFamily: 'monospace', fontSize: 11 }} placeholder={fld + (EXPORT_SECRET_FIELDS.includes(fld) ? ' (비밀 — 저장 시 암호화)' : '')} value={form.config[fld] || ''} onChange={e => setCfg(fld, e.target.value)} />
            : <input key={fld} type={EXPORT_SECRET_FIELDS.includes(fld) ? 'password' : 'text'} style={inp} placeholder={fld + (fld === 'format' ? ' (json|ndjson)' : '')} value={form.config[fld] || ''} onChange={e => setCfg(fld, e.target.value)} />
          )}
        </div>
        {/* 데이터셋 선택 */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{t('devHub.exDatasets', '익스포트 데이터셋')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {meta.datasets.map(d => (
            <label key={d.key} title={d.desc} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: form.datasets.includes(d.key) ? 'rgba(79,142,247,0.1)' : '#fff' }}>
              <input type="checkbox" checked={form.datasets.includes(d.key)} onChange={() => toggleDs(d.key)} />{d.label}
            </label>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'center' }}>
          <select style={inp} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
            {['hourly', 'daily', 'weekly', 'monthly'].map(fr => <option key={fr} value={fr}>{t('devHub.exFreq_' + fr, fr)}</option>)}
          </select>
          <input type="number" style={inp} placeholder={t('devHub.exPeriod', '기간(일)')} value={form.period_days} onChange={e => setForm(f => ({ ...f, period_days: e.target.value }))} />
          <div style={{ display: 'flex', gap: 6 }}>
            {editId ? <button onClick={reset} style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', cursor: 'pointer', fontSize: 12 }}>{t('devHub.exCancel', '취소')}</button> : null}
            <button onClick={save} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{busy ? '⏳' : '💾'} {t('devHub.exSave', '저장')}</button>
          </div>
        </div>
      </div>

      {/* 등록된 대상 목록 */}
      <div style={{ display: 'grid', gap: 10 }}>
        {dests === null ? <div style={{ fontSize: 12, color: '#64748b' }}>⏳</div>
          : dests.length === 0 ? <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 20 }}>{t('devHub.exEmpty', '등록된 익스포트 대상이 없습니다.')}</div>
          : dests.map(d => (
            <div key={d.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{d.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: 'rgba(79,142,247,0.12)', color: '#4f8ef7' }}>{d.type}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: d.configured ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.15)', color: d.configured ? '#16a34a' : '#64748b' }}>{d.configured ? '● ' + t('devHub.exActive', '활성') : t('devHub.exPending', '자격증명 대기')}</span>
                  {d.last_status && <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[d.last_status] || '#64748b' }}>{d.last_status}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{(d.datasets || []).join(', ')} · {d.frequency} · {d.period_days}d{d.last_run_at ? ' · ' + d.last_run_at : ''}</div>
              </div>
              <button onClick={() => run(d.id)} disabled={busy || !d.configured} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: d.configured ? '#16a34a' : '#cbd5e1', color: '#fff', fontWeight: 700, fontSize: 11, cursor: d.configured ? 'pointer' : 'not-allowed' }}>▶ {t('devHub.exRun', '즉시 실행')}</button>
              <button onClick={() => edit(d)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: 11, cursor: 'pointer' }}>✏️</button>
              <button onClick={() => del(d.id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>🗑</button>
            </div>
          ))}
      </div>

      {/* 실행 로그 */}
      {runs.length > 0 && (
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 10 }}>📜 {t('devHub.exRuns', '최근 실행 로그')}</div>
          <div style={{ display: 'grid', gap: 5 }}>
            {runs.slice(0, 20).map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#475569' }}>
                <span style={{ fontWeight: 700, color: statusColor[r.status] || '#64748b', minWidth: 56 }}>{r.status}</span>
                <span style={{ fontFamily: 'monospace' }}>{r.dataset}</span>
                <span>{r.rows_exported} rows</span>
                {r.http_code ? <span style={{ color: '#94a3b8' }}>HTTP {r.http_code}</span> : null}
                {r.error ? <span style={{ color: '#dc2626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.error}>{r.error}</span> : null}
                <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>{r.finished_at}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── [245차 P3-6] 시스템 이벤트 알림 채널(Slack·범용웹훅·이메일) 설정 패널 ───
   이상감지 자동정지·킬스위치·예산소진 등 시스템 자율액션을 실시간 통지. 기존 alert_policy(임계치) 위 확장. */
function NotifyChannelsPanel() {
  const { t } = useI18n();
  const [c, setC] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const showMsg = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 5000); };
  const load = useCallback(async () => { const { data } = await api('/v431/alerts/channels'); setC(data?.channels || { min_severity: 'medium', enabled: 1 }); }, []);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setC(p => ({ ...p, [k]: v }));
  const save = async () => { setBusy(true); const { data } = await api('/v431/alerts/channels', { method: 'PUT', body: JSON.stringify(c) }); if (data?.ok) { showMsg(t('devHub.ntSaved', '저장되었습니다.')); load(); } else showMsg(data?.error || '저장 실패', 'err'); setBusy(false); };
  const test = async () => { setBusy(true); const { data } = await api('/v431/alerts/channels/test', { method: 'POST', body: '{}' }); showMsg(data?.ok ? t('devHub.ntTested', '테스트 알림을 발송했습니다(설정된 채널 확인).') : (data?.error || '발송 실패'), data?.ok ? 'ok' : 'err'); setBusy(false); };
  if (!c) return <div style={{ padding: 20, color: '#94a3b8' }}>⏳</div>;
  const inp = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', fontSize: 13, boxSizing: 'border-box', color: '#1e293b', background: '#fff' };
  const lbl = { fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 5, display: 'block' };
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 640 }}>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
        🔔 {t('devHub.notifyIntro', '이상감지 자동 정지·예산 소진·킬스위치 등 시스템 자율 액션과 임계치 알림을 Slack·웹훅(Teams/Discord/n8n)·이메일로 실시간 통지합니다.')}
      </div>
      {msg.text && <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: msg.type === 'ok' ? '#16a34a' : '#dc2626' }}>{msg.text}</div>}
      <div><label style={lbl}>Slack Incoming Webhook URL</label><input type="password" style={inp} value={c.slack_webhook || ''} onChange={e => set('slack_webhook', e.target.value)} placeholder="https://hooks.slack.com/services/... (저장 시 암호화)" /></div>
      <div><label style={lbl}>{t('devHub.ntGenericWebhook', '범용 웹훅 URL (Teams/Discord/n8n/커스텀)')}</label><input type="password" style={inp} value={c.generic_webhook || ''} onChange={e => set('generic_webhook', e.target.value)} placeholder="https://... (JSON POST + HMAC 서명)" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label style={lbl}>{t('devHub.ntWebhookSecret', '웹훅 HMAC 시크릿(선택)')}</label><input type="password" style={inp} value={c.webhook_secret || ''} onChange={e => set('webhook_secret', e.target.value)} /></div>
        <div><label style={lbl}>{t('devHub.ntEmail', '이메일 수신자(쉼표 구분)')}</label><input style={inp} value={c.email_to || ''} onChange={e => set('email_to', e.target.value)} placeholder="ops@company.com" /></div>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div><label style={lbl}>{t('devHub.ntMinSeverity', '최소 심각도')}</label>
          <select style={{ ...inp, width: 160 }} value={c.min_severity || 'medium'} onChange={e => set('min_severity', e.target.value)}>
            <option value="low">low (전체)</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginTop: 18 }}>
          <input type="checkbox" checked={!!Number(c.enabled)} onChange={e => set('enabled', e.target.checked ? 1 : 0)} />{t('devHub.ntEnable', '알림 활성화')}
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={save} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{busy ? '⏳' : '💾'} {t('devHub.ntSave', '저장')}</button>
        <button onClick={test} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>📨 {t('devHub.ntTest', '테스트 발송')}</button>
      </div>
    </div>
  );
}

/* ─── 실제 API 레퍼런스(문서) — 운영 routes.php 기준 대표 엔드포인트 ─── */
const API_REF = [
  { group: 'Auth', color: '#4f8ef7', items: [
    { m: 'POST',   p: '/auth/login',           dk: 'epLogin' },
    { m: 'GET',    p: '/auth/me',              dk: 'epMe' },
    { m: 'GET',    p: '/auth/api-keys',        dk: 'epKeysList' },
    { m: 'POST',   p: '/auth/api-keys',        dk: 'epKeysCreate' },
    { m: 'DELETE', p: '/auth/api-keys/{id}',   dk: 'epKeysRevoke' },
  ]},
  { group: 'Ingest', color: '#0ea5a3', items: [
    { m: 'POST', p: '/v423/connectors/sync',  dk: 'epSync' },
    { m: 'POST', p: '/v420/price/ingest',     dk: 'epPrice' },
  ]},
  { group: 'Analytics', color: '#a855f7', items: [
    { m: 'GET', p: '/v423/rollup/summary',    dk: 'epRollup' },
    { m: 'GET', p: '/v420/channel-mix',       dk: 'epChannelMix' },
    { m: 'POST', p: '/v422/ai/recommend',     dk: 'epAi' },
  ]},
];
const SDK_LIST = [
  { id: 'curl', name: 'cURL', icon: '🖥️', code: "curl -H \"Authorization: Bearer $API_KEY\" \\\n  https://roi.genie-go.com/api/v423/rollup/summary" },
  { id: 'js',   name: 'JavaScript', icon: '🟨', code: "const r = await fetch('/api/v423/rollup/summary', {\n  headers: { Authorization: `Bearer ${apiKey}` }\n});\nconst data = await r.json();" },
  { id: 'py',   name: 'Python', icon: '🐍', code: "import requests\nr = requests.get(\n  'https://roi.genie-go.com/api/v423/rollup/summary',\n  headers={'Authorization': f'Bearer {api_key}'})\nprint(r.json())" },
];
// P1: 실제 OpenPlatform 발신 이벤트(웹훅 카탈로그와 정합). KPI 카운트용 — 실관리 UI 는 /v429/webhooks/events 동적 로드.
const WEBHOOK_EVENTS = ['order.created', 'order.cancelled', 'settlement.created', 'conversion.recorded', 'attribution.computed'];

export default function DeveloperHub() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [keyCount, setKeyCount] = useState(null);
  const [copied, setCopied] = useState('');

  // 계정 동기화: 실제 발급된 API 키 수(소유자만 200, 그 외 403→0)
  useEffect(() => {
    api('/auth/api-keys').then(({ data }) => setKeyCount(Array.isArray(data.keys) ? data.keys.length : 0)).catch(() => setKeyCount(0));
  }, []);

  const endpointCount = API_REF.reduce((s, g) => s + g.items.length, 0);
  const tabs = [t('devHub.tabApiKeys', '🔑 API 키'), t('devHub.tabRef', 'API 레퍼런스'), t('devHub.tabSdk', 'SDK'), t('devHub.tabWebhook', '웹훅'), t('devHub.tabSandbox', '샌드박스'), t('devHub.tabExport', '데이터 익스포트'), t('devHub.tabNotify', '🔔 알림 채널')];
  const kpis = [
    { emoji: '📡', label: t('devHub.kpiEndpoints', '문서화 엔드포인트'), val: endpointCount },
    { emoji: '📦', label: t('devHub.kpiSdks', 'SDK 예제'), val: SDK_LIST.length },
    { emoji: '🪝', label: t('devHub.kpiWebhooks', '웹훅 이벤트'), val: WEBHOOK_EVENTS.length },
    { emoji: '🔑', label: t('devHub.kpiMyKeys', '내 API 키'), val: keyCount === null ? '…' : keyCount },
  ];

  const copy = (id, text) => { try { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 1500); } catch {} };
  const codeBox = { fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: '14px 16px', lineHeight: 1.6 };
  const methodColor = { GET: '#22c55e', POST: '#4f8ef7', PUT: '#eab308', PATCH: '#a855f7', DELETE: '#ef4444' };

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{
        borderRadius: 18, padding: "28px 32px", marginBottom: 22,
        background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))",
        border: "1px solid rgba(79,142,247,0.12)", backdropFilter: "blur(16px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>⚙️</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>⚙️ {t('devHub.heroTitle', '개발자 허브')}</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>{t('devHub.heroDesc', 'API 키 관리, 엔드포인트 레퍼런스, SDK·웹훅 연동을 한곳에서')}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "14px 20px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 26, flex: "0 0 auto" }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)", lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)", flexWrap: "wrap" }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 12, transition: "all 0.2s", whiteSpace: "nowrap",
            background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
            color: activeTab === i ? "#fff" : "var(--text-2, #475569)"
          }}>{tab}</button>
        ))}
      </div>
      <div style={{ borderRadius: 16, padding: "28px 32px", minHeight: 320, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1, #1e293b)", marginBottom: 16 }}>{tabs[activeTab]}</div>

        {activeTab === 0 && <ApiKeysPanel />}

        {/* TAB 1: API Reference */}
        {activeTab === 1 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              📡 {t('devHub.refIntro', '모든 요청은 Authorization: Bearer <API 키> 헤더가 필요합니다. 기준 URL은 https://roi.genie-go.com/api 입니다.')}
            </div>
            {API_REF.map(g => (
              <div key={g.group}>
                <div style={{ fontSize: 13, fontWeight: 800, color: g.color, marginBottom: 8 }}>{g.group}</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {g.items.map(ep => (
                    <div key={ep.p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, color: '#fff', background: methodColor[ep.m] || '#64748b', padding: '2px 7px', borderRadius: 5, minWidth: 50, textAlign: 'center' }}>{ep.m}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e293b' }}>{ep.p}</span>
                      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{t('devHub.' + ep.dk, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: SDKs */}
        {activeTab === 2 && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              📦 {t('devHub.sdkIntro', '아래 예제로 즉시 첫 호출을 시도할 수 있습니다. API 키는 “API 키” 탭에서 발급하세요.')}
            </div>
            {SDK_LIST.map(s => (
              <div key={s.id} style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#1e293b' }}>{s.name}</span>
                  <button onClick={() => copy(s.id, s.code)} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 7, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                    {copied === s.id ? `✓ ${t('devHub.copied', '복사됨')}` : t('devHub.copy', '복사')}
                  </button>
                </div>
                <div style={codeBox}>{s.code}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Webhooks — P1 실관리(OpenPlatform /v429/webhooks/*) */}
        {activeTab === 3 && <WebhooksPanel />}

        {/* TAB 5: Data Export — [245차 P1-1] DW/BI 익스포트(DataExport /v429/exports/*) */}
        {activeTab === 5 && <DataExportPanel />}

        {/* TAB 6: Notification Channels — [245차 P3-6] 시스템 이벤트 알림(Alerting /v431/alerts/channels) */}
        {activeTab === 6 && <NotifyChannelsPanel />}

        {/* TAB 4: Sandbox */}
        {activeTab === 4 && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              🧪 {t('devHub.sandboxIntro', '실데이터를 건드리지 않고 통합을 검증하세요. “API 키” 탭에서 viewer(read) 역할 키를 발급하면 안전하게 읽기 호출만 테스트할 수 있습니다.')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                ['1️⃣', t('devHub.sbStep1', 'viewer 역할로 API 키 발급')],
                ['2️⃣', t('devHub.sbStep2', 'SDK 탭의 예제로 첫 호출 실행')],
                ['3️⃣', t('devHub.sbStep3', '응답 200·데이터 형식 확인')],
                ['4️⃣', t('devHub.sbStep4', '운영 연동 시 analyst+ 키로 교체')],
              ].map(([n, txt]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.08)' }}>
                  <span style={{ fontSize: 18 }}>{n}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>{txt}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setActiveTab(0)} style={{ justifySelf: 'start', padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12 }}>
              🔑 {t('devHub.goIssueKey', 'API 키 발급하러 가기')}
            </button>
          </div>
        )}
      </div>

      {/* Usage Guide */}
      <DevHubGuide t={t} />
    </div>
  );
}

/* ─── 이용 가이드 ─── */
function DevHubGuide({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 18 }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto 12px', padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        📖 {t('devHub.guideTitle', '개발자 허브 이용 가이드')} {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 16, padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>⚙️</div>
            <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 6px', color: '#1e293b' }}>{t('devHub.guideTitle', '개발자 허브 이용 가이드')}</h2>
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{t('devHub.guideSub', '초보자도 이 가이드만 보면 API 키 발급부터 첫 연동·웹훅까지 따라할 수 있습니다')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>{i}</span>
                  <span style={{ fontWeight: 800, fontSize: 12, color: '#1e293b' }}>{t(`devHub.guideStep${i}Title`, '')}</span>
                </div>
                <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{t(`devHub.guideStep${i}Desc`, '')}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>💡 {t('devHub.guideTipTitle', '보안 팁')}</div>
            <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{t('devHub.guideTipDesc', 'API 키는 발급 시 한 번만 표시됩니다. 노출되면 즉시 폐기·회전하고, 최소 권한(viewer/connector)으로 발급하세요.')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
