import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * CollaborationHome — CWIS Part001 협업 플랫폼 기반(적응 구현).
 *
 * 백엔드 GET /api/v425/pm/collaboration/{readiness,capabilities} 실소비(죽은 shell 아님).
 * ★정직 표기: PLANNED(미착수) capability 는 "준비 중"으로 명시 — 미구현을 '사용 가능'으로 위장하지 않음.
 * 관리자만 PARTIAL/ENABLED capability 를 테넌트별 활성/비활성 토글(백엔드가 admin·정직성·의존성 강제).
 */

const STATUS_META = {
  ENABLED:    { label: '사용 가능', color: '#16a34a', bg: 'rgba(22,163,74,0.10)', bd: 'rgba(22,163,74,0.30)' },
  PARTIAL:    { label: '부분 구현', color: '#d97706', bg: 'rgba(217,119,6,0.10)', bd: 'rgba(217,119,6,0.30)' },
  ANALYZING:  { label: '분석 중',   color: '#2563eb', bg: 'rgba(37,99,235,0.10)', bd: 'rgba(37,99,235,0.30)' },
  PLANNED:    { label: '준비 중',   color: '#64748b', bg: 'rgba(100,116,139,0.10)', bd: 'rgba(100,116,139,0.25)' },
  DISABLED:   { label: '비활성',    color: '#64748b', bg: 'rgba(100,116,139,0.10)', bd: 'rgba(100,116,139,0.25)' },
  DEPRECATED: { label: '지원 종료', color: '#64748b', bg: 'rgba(100,116,139,0.10)', bd: 'rgba(100,116,139,0.25)' },
  BLOCKED:    { label: '차단됨',    color: '#dc2626', bg: 'rgba(220,38,38,0.10)', bd: 'rgba(220,38,38,0.30)' },
};

export default function CollaborationHome() {
  const t = useT();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';
  const [readiness, setReadiness] = useState(null);
  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [msg, setMsg] = useState('');

  const authFetch = useCallback((path, opts = {}) => fetch(`${base}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }), [base, token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const [rRes, cRes] = await Promise.all([
        authFetch('/api/v425/pm/collaboration/readiness'),
        authFetch('/api/v425/pm/collaboration/capabilities'),
      ]);
      if (!rRes.ok || !cRes.ok) throw new Error(`HTTP ${rRes.status}/${cRes.status}`);
      const rJson = await rRes.json();
      const cJson = await cRes.json();
      setReadiness(rJson?.data || null);
      setCaps(Array.isArray(cJson?.capabilities) ? cJson.capabilities : []);
    } catch (e) { setError(String(e?.message || e)); }
    finally { setLoading(false); }
  }, [authFetch, token]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (cap) => {
    const action = cap.enabled ? 'disable' : 'enable';
    setBusyKey(cap.key); setMsg('');
    try {
      const res = await authFetch(`/api/v425/pm/collaboration/capabilities/${encodeURIComponent(cap.key)}/${action}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json?.ok) { setMsg(json?.message || json?.error || `실패(HTTP ${res.status})`); }
      else { await load(); }
    } catch (e) { setMsg(String(e?.message || e)); }
    finally { setBusyKey(''); }
  }, [authFetch, load]);

  // [CWIS Part002] 초대 관리(admin) — 백엔드가 권한 강제. 생성 시 accept_url/token 1회 노출.
  const [invites, setInvites] = useState([]);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('member');
  const [invScope, setInvScope] = useState(''); // [Part003] 외부(guest/partner) 프로젝트 스코프
  const [invResult, setInvResult] = useState(null);
  const [invBusy, setInvBusy] = useState(false);
  const [grants, setGrants] = useState([]);
  const isExtRole = invRole === 'guest' || invRole === 'partner';
  const loadInvites = useCallback(async () => {
    try { const r = await authFetch('/api/v425/pm/collaboration/invitations'); if (r.ok) { const j = await r.json(); setInvites(Array.isArray(j?.invitations) ? j.invitations : []); } } catch (_) { /* 권한 없으면 무시 */ }
    try { const r2 = await authFetch('/api/v425/pm/collaboration/access/grants'); if (r2.ok) { const j2 = await r2.json(); setGrants(Array.isArray(j2?.grants) ? j2.grants : []); } } catch (_) {}
  }, [authFetch]);
  useEffect(() => { if (token) loadInvites(); }, [token, loadInvites]);
  const revokeGrant = useCallback(async (pid) => {
    try { const r = await authFetch(`/api/v425/pm/collaboration/access/grants/${encodeURIComponent(pid)}/revoke`, { method: 'POST' }); if (r.ok) await loadInvites(); } catch (_) {}
  }, [authFetch, loadInvites]);
  const createInvite = useCallback(async () => {
    if (!invEmail) return; setInvBusy(true); setInvResult(null);
    try {
      const payload = { email: invEmail, membership_type: invRole };
      if (invRole === 'guest' || invRole === 'partner') payload.scope_id = invScope;
      const r = await authFetch('/api/v425/pm/collaboration/invitations', { method: 'POST', body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok || !j?.ok) setInvResult({ err: j?.error || `실패(HTTP ${r.status})` });
      else { setInvResult({ ok: true, url: j.accept_url, sent: j.email_sent }); setInvEmail(''); await loadInvites(); }
    } catch (e) { setInvResult({ err: String(e?.message || e) }); }
    finally { setInvBusy(false); }
  }, [authFetch, invEmail, invRole, loadInvites]);
  const revokeInvite = useCallback(async (pid) => {
    try { const r = await authFetch(`/api/v425/pm/collaboration/invitations/${encodeURIComponent(pid)}/revoke`, { method: 'POST' }); if (r.ok) await loadInvites(); } catch (_) {}
  }, [authFetch, loadInvites]);

  const grouped = useMemo(() => {
    const order = ['ENABLED', 'PARTIAL', 'ANALYZING', 'PLANNED', 'BLOCKED', 'DISABLED', 'DEPRECATED'];
    const g = {};
    for (const c of caps) { (g[c.status] = g[c.status] || []).push(c); }
    return order.filter(s => g[s]?.length).map(s => ({ status: s, items: g[s] }));
  }, [caps]);

  const score = readiness?.readiness_score ?? null;
  const scoreColor = score == null ? '#64748b' : score >= 60 ? '#16a34a' : score >= 30 ? '#d97706' : '#dc2626';

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🤝 {t('collab.home.title', '협업 홈')}</h1>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '2px 8px', borderRadius: 99, background: 'rgba(100,116,139,0.10)' }}>
          CWIS Part001 · Foundation
        </span>
      </div>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        {t('collab.home.subtitle', '프로젝트 관리 기반 협업 플랫폼. 각 기능의 실제 구현 상태와 준비도를 정직하게 표시합니다.')}
      </p>

      {error && <div style={{ padding: 12, borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>불러오기 오류: {error}</div>}
      {msg && <div style={{ padding: 12, borderRadius: 8, background: 'rgba(217,119,6,0.10)', color: '#b45309', fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      {/* Readiness */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 18, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score == null ? '—' : score}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t('collab.home.readiness', '협업 준비도')}/100</div>
        </div>
        {readiness && (
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', flex: 1 }}>
            {Object.entries(readiness.by_status || {}).filter(([, n]) => n > 0).map(([s, n]) => (
              <div key={s} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: STATUS_META[s]?.color || '#334155' }}>{n}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{STATUS_META[s]?.label || s}</div>
              </div>
            ))}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{readiness.enabled_for_tenant ?? 0}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{t('collab.home.enabled', '활성 기능')}</div>
            </div>
          </div>
        )}
      </div>

      {loading && <div style={{ color: '#64748b', fontSize: 13 }}>불러오는 중…</div>}

      {/* Capabilities grouped by status */}
      {grouped.map(({ status, items }) => (
        <div key={status} style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: STATUS_META[status]?.color || '#334155', padding: '3px 10px', borderRadius: 99, background: STATUS_META[status]?.bg, border: `1px solid ${STATUS_META[status]?.bd}` }}>
              {STATUS_META[status]?.label || status}
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{items.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
            {items.map(cap => {
              const meta = STATUS_META[cap.status] || {};
              const canToggle = cap.status === 'ENABLED' || cap.status === 'PARTIAL';
              return (
                <div key={cap.key} style={{ padding: 14, borderRadius: 10, border: `1px solid ${meta.bd || 'var(--border,#e2e8f0)'}`, background: 'var(--card,#fff)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{cap.name}</div>
                    {cap.enabled
                      ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a' }}>● {t('collab.on', '활성')}</span>
                      : <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>○ {t('collab.off', '비활성')}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, minHeight: 32 }}>{cap.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{cap.key} · Part{cap.implementation_part}</span>
                    {canToggle ? (
                      <button onClick={() => toggle(cap)} disabled={busyKey === cap.key}
                        style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                          border: `1px solid ${cap.enabled ? 'rgba(220,38,38,0.4)' : 'rgba(22,163,74,0.4)'}`,
                          background: 'transparent', color: cap.enabled ? '#dc2626' : '#16a34a', opacity: busyKey === cap.key ? 0.5 : 1 }}>
                        {busyKey === cap.key ? '…' : (cap.enabled ? t('collab.disable', '비활성화') : t('collab.enable', '활성화'))}
                      </button>
                    ) : (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{t('collab.comingSoon', '후속 Part 제공')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* [CWIS Part002] 팀원 초대 관리 */}
      <div style={{ marginTop: 8, padding: 16, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>✉️ {t('collab.invite.title', '팀원 초대')}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{t('collab.invite.desc', '이메일로 팀원을 초대합니다. 링크(토큰)는 만료·1회성이며 관리자만 발급/철회할 수 있습니다.')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input type="email" placeholder={t('collab.invite.email', '초대할 이메일')} value={invEmail} onChange={e => setInvEmail(e.target.value)}
            style={{ flex: '1 1 200px', minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border,#cbd5e1)' }} />
          <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border,#cbd5e1)' }}>
            <option value="member">{t('collab.role.member', '멤버(내부)')}</option>
            <option value="manager">{t('collab.role.manager', '매니저(내부)')}</option>
            <option value="guest">{t('collab.role.guest', '게스트(외부)')}</option>
            <option value="partner">{t('collab.role.partner', '파트너(외부)')}</option>
          </select>
          {isExtRole && (
            <input placeholder={t('collab.invite.scope', '프로젝트 ID(외부 접근 범위)')} value={invScope} onChange={e => setInvScope(e.target.value)}
              style={{ flex: '1 1 160px', minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid #f59e0b' }} />
          )}
          <button onClick={createInvite} disabled={invBusy || !invEmail || (isExtRole && !invScope)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: invBusy || !invEmail ? 0.5 : 1 }}>
            {invBusy ? '…' : t('collab.invite.send', '초대 보내기')}
          </button>
        </div>
        {invResult?.err && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{invResult.err}</div>}
        {invResult?.ok && (
          <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 8, wordBreak: 'break-all' }}>
            {t('collab.invite.created', '초대 생성됨')}{invResult.sent ? ' · ' + t('collab.invite.sent', '이메일 발송됨') : ' (' + t('collab.invite.manual', '이메일 미설정 — 아래 링크 수동 전달') + ')'}: <span style={{ color: '#334155' }}>{invResult.url}</span>
          </div>
        )}
        <div style={{ display: 'grid', gap: 6 }}>
          {invites.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('collab.invite.none', '초대 내역이 없습니다.')}</div>}
          {invites.map(iv => (
            <div key={iv.public_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(148,163,184,0.06)', fontSize: 12 }}>
              <span>{iv.email} · <b>{iv.membership_type}</b> · <span style={{ color: iv.status === 'ACCEPTED' ? '#16a34a' : iv.status === 'PENDING' ? '#d97706' : '#94a3b8' }}>{iv.status}</span>{iv.expires_at ? ' · ~' + String(iv.expires_at).slice(0, 10) : ''}</span>
              {iv.status === 'PENDING' && <button onClick={() => revokeInvite(iv.public_id)} style={{ fontSize: 11, color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '2px 10px', background: 'transparent', cursor: 'pointer' }}>{t('collab.invite.revoke', '철회')}</button>}
            </div>
          ))}
        </div>
        {/* [CWIS Part003] 외부 접근 그랜트(게스트/파트너 스코프) */}
        {grants.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309', marginBottom: 6 }}>🔑 {t('collab.grants.title', '외부 접근 그랜트(스코프 한정·만료)')}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {grants.map(gr => (
                <div key={gr.public_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', fontSize: 12 }}>
                  <span>{gr.principal_type} #{gr.principal_id} · {gr.scope_type}:{gr.scope_id} · {gr.revoked_at ? <span style={{ color: '#94a3b8' }}>철회됨</span> : <span style={{ color: '#16a34a' }}>유효</span>}{gr.valid_until ? ' · ~' + String(gr.valid_until).slice(0, 10) : ''}</span>
                  {!gr.revoked_at && <button onClick={() => revokeGrant(gr.public_id)} style={{ fontSize: 11, color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '2px 10px', background: 'transparent', cursor: 'pointer' }}>{t('collab.invite.revoke', '철회')}</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
