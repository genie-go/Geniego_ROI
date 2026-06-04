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

export default function DeveloperHub() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [t('devHub.tabApiKeys', '🔑 API 키'), "API Reference", "SDKs", "Webhooks", "Sandbox"];
  const kpis = [{ "emoji": "📡", "label": "API Endpoints", "val": 86 }, { "emoji": "📦", "label": "SDKs", "val": 5 }, { "emoji": "📖", "label": "Docs Pages", "val": 120 }, { "emoji": "🔑", "label": "Sandbox Keys", "val": 3 }];

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
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>⚙️ Developer Hub</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>API documentation, SDKs, and developer tools</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            borderRadius: 14, padding: "18px 20px",
            background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)"
          }}>
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
      <div style={{
        borderRadius: 16, padding: "28px 32px", minHeight: 320,
        background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)"
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1, #1e293b)", marginBottom: 16 }}>{tabs[activeTab]}</div>

        {activeTab === 0 ? <ApiKeysPanel /> : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
              {["Interactive API explorer", "Code samples in 6 languages", "Webhook tester", "Rate limit dashboard"].map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                  borderRadius: 10, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.08)"
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 800
                  }}>✓</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1, #1e293b)" }}>{f}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 24, padding: "16px 20px", borderRadius: 12,
              background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))",
              border: "1px solid rgba(34,197,94,0.12)", display: "flex", alignItems: "center", gap: 10
            }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>System Operational</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
