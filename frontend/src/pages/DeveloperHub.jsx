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
const WEBHOOK_EVENTS = ['sync.completed', 'alert.triggered', 'report.exported', 'key.rotated', 'plan.changed'];

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
  const tabs = [t('devHub.tabApiKeys', '🔑 API 키'), t('devHub.tabRef', 'API 레퍼런스'), t('devHub.tabSdk', 'SDK'), t('devHub.tabWebhook', '웹훅'), t('devHub.tabSandbox', '샌드박스')];
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
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
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

        {/* TAB 3: Webhooks */}
        {activeTab === 3 && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
              🪝 {t('devHub.webhookIntro', '이벤트 발생 시 등록한 URL로 서명된 POST 요청을 전송합니다. X-Genie-Signature 헤더(HMAC-SHA256)로 위변조를 검증하세요.')}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8 }}>{t('devHub.webhookEvents', '지원 이벤트')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WEBHOOK_EVENTS.map(ev => (
                  <span key={ev} style={{ fontFamily: 'monospace', fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', color: '#2563eb' }}>{ev}</span>
                ))}
              </div>
            </div>
            <div style={codeBox}>{`POST {your_endpoint}\nX-Genie-Signature: sha256=...\nContent-Type: application/json\n\n{\n  "event": "sync.completed",\n  "tenant_id": "...",\n  "data": { ... }\n}`}</div>
          </div>
        )}

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
