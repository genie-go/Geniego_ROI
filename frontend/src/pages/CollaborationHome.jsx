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

  /* [CWIS Part004-01] 내비게이션 진단 — 신규 메뉴를 만들지 않고 협업 홈 안에 붙인다(중복 메뉴 금지). */
  const [nav, setNav] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const loadNav = useCallback(async () => {
    if (!token || nav) return;
    try {
      const r = await authFetch('/api/v425/pm/collaboration/navigation/analysis');
      if (!r.ok) { setNav({ available: false, reason: `http_${r.status}` }); return; }
      setNav(await r.json());
    } catch (e) { setNav({ available: false, reason: String(e?.message || e) }); }
  }, [authFetch, token, nav]);

  /* [CWIS Part004-02] 메뉴 레지스트리 — 레거시 사이드바는 그대로 두고 전환 안전성만 측정한다(무후퇴). */
  const [reg, setReg] = useState(null);
  const [shadow, setShadow] = useState(null);
  const [regOpen, setRegOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewPlan, setPreviewPlan] = useState('free');
  const loadRegistry = useCallback(async () => {
    if (!token || reg) return;
    try {
      const [rRes, sRes] = await Promise.all([
        authFetch('/api/v425/pm/navigation/registry'),
        authFetch('/api/v425/pm/navigation/shadow-compare'),
      ]);
      setReg(await rRes.json().catch(() => ({ available: false, reason: `http_${rRes.status}` })));
      setShadow(await sRes.json().catch(() => null));
    } catch (e) { setReg({ available: false, reason: String(e?.message || e) }); }
  }, [authFetch, token, reg]);
  const runPreview = useCallback(async (plan) => {
    setPreviewPlan(plan); setPreview(null);
    try {
      const r = await authFetch('/api/v425/pm/navigation/preview', {
        method: 'POST', body: JSON.stringify({ principal_type: 'USER', plan, platform: 'WEB_DESKTOP' }),
      });
      setPreview(await r.json().catch(() => null));
    } catch (e) { setPreview({ ok: false, error: String(e?.message || e) }); }
  }, [authFetch]);
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

      {/* [CWIS Part004-01] 내비게이션 진단 — 관리자만 200(백엔드 admin 게이트). 접기 기본, 열 때만 로드. */}
      <div style={{ marginTop: 20, padding: 18, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)' }}>
        <button
          onClick={() => { setNavOpen(o => !o); loadNav(); }}
          aria-expanded={navOpen}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <span style={{ fontSize: 14, fontWeight: 800 }}>🧭 {t('collab.nav.title', '내비게이션 진단')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '2px 8px', borderRadius: 99, background: 'rgba(100,116,139,0.10)' }}>CWIS Part004-01 · 관리자</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{navOpen ? '▲' : '▼'}</span>
        </button>

        {navOpen && (
          <div style={{ marginTop: 12 }}>
            {nav == null && <div style={{ fontSize: 12, color: '#64748b' }}>{t('collab.nav.loading', '불러오는 중…')}</div>}

            {nav && nav.available === false && (
              <div style={{ fontSize: 12, color: '#b45309', background: 'rgba(217,119,6,0.08)', padding: 10, borderRadius: 8 }}>
                {/* ★정직 미산출: 스냅샷이 없으면 0 이나 빈 목록으로 '정상'인 척하지 않는다. */}
                {t('collab.nav.unavailable', '진단 스냅샷이 없습니다')} — <code>{nav.reason || 'unknown'}</code>
                {nav.how_to_generate && <> · <code>{nav.how_to_generate}</code></>}
              </div>
            )}

            {nav && nav.available && (
              <>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 12 }}>
                  {[
                    ['메뉴 항목', nav.metrics?.navigation_items_discovered],
                    ['라우트', nav.metrics?.routes_total],
                    ['Dead Link', nav.metrics?.navigation_dead_links_total],
                    ['도달 불가', nav.metrics?.navigation_unreachable_total],
                    ['권한 불일치', nav.metrics?.navigation_permission_mismatches_total],
                    ['중복', nav.metrics?.navigation_duplicates_total],
                  ].map(([label, v]) => (
                    <div key={label} style={{ textAlign: 'center', minWidth: 84 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: v ? '#d97706' : '#16a34a' }}>{v ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  {t('collab.nav.generated', '생성')}: {nav.generated_at ? String(nav.generated_at).slice(0, 19).replace('T', ' ') : '—'}
                  {nav.source_revision ? ` · rev ${nav.source_revision}` : ''}
                </div>
                <div style={{ display: 'grid', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                  {(nav.issues || []).filter(i => i.severity === 'P0' || i.severity === 'P1' || i.severity === 'P2').map((i, idx) => (
                    <div key={`${i.code}-${i.path}-${idx}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 8, background: 'rgba(148,163,184,0.06)', fontSize: 12 }}>
                      <span style={{ fontWeight: 800, color: i.severity === 'P0' ? '#dc2626' : i.severity === 'P1' ? '#d97706' : '#2563eb', flexShrink: 0 }}>{i.severity}</span>
                      <span style={{ fontWeight: 700, flexShrink: 0 }}>{i.code}</span>
                      <code style={{ color: '#64748b', flexShrink: 0 }}>{i.path}</code>
                      <span style={{ color: '#475569' }}>{i.detail}</span>
                    </div>
                  ))}
                  {(nav.issues || []).filter(i => ['P0', 'P1', 'P2'].includes(i.severity)).length === 0 && (
                    <div style={{ fontSize: 12, color: '#16a34a' }}>{t('collab.nav.clean', 'P0~P2 이슈 없음')}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* [CWIS Part004-02] 통합 메뉴 레지스트리 — 관리자 전용(백엔드 admin 게이트). */}
      <div style={{ marginTop: 20, padding: 18, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)' }}>
        <button
          onClick={() => { setRegOpen(o => !o); loadRegistry(); }}
          aria-expanded={regOpen}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <span style={{ fontSize: 14, fontWeight: 800 }}>🗺️ {t('collab.registry.title', '메뉴 레지스트리')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', padding: '2px 8px', borderRadius: 99, background: 'rgba(100,116,139,0.10)' }}>CWIS Part004-02 · 관리자</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{regOpen ? '▲' : '▼'}</span>
        </button>

        {regOpen && (
          <div style={{ marginTop: 12 }}>
            {reg == null && <div style={{ fontSize: 12, color: '#64748b' }}>{t('collab.nav.loading', '불러오는 중…')}</div>}

            {reg && reg.ok === false && (
              <div style={{ fontSize: 12, color: '#b45309', background: 'rgba(217,119,6,0.08)', padding: 10, borderRadius: 8 }}>
                {t('collab.registry.unavailable', '레지스트리 스냅샷이 없습니다')} — <code>{reg.reason || 'unknown'}</code>
                {reg.how_to_generate && <> · <code>{reg.how_to_generate}</code></>}
              </div>
            )}

            {reg && reg.ok && (
              <>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 10 }}>
                  {[
                    ['메뉴 항목', reg.item_count],
                    ['Alias', reg.alias_count],
                    ['CRITICAL', reg.validation?.counts?.CRITICAL],
                    ['ERROR', reg.validation?.counts?.ERROR],
                    ['WARNING', reg.validation?.counts?.WARNING],
                  ].map(([label, v]) => (
                    <div key={label} style={{ textAlign: 'center', minWidth: 80 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: (label === 'CRITICAL' || label === 'ERROR') ? (v ? '#dc2626' : '#16a34a') : '#334155' }}>{v ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', minWidth: 110 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: reg.activatable ? '#16a34a' : '#dc2626' }}>
                      {reg.activatable ? '활성화 가능' : '활성화 차단'}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{reg.registry_version}</div>
                  </div>
                </div>

                {/* ★무후퇴 증거 — 레거시 사이드바와 레지스트리 결과의 플랜별 동일성 */}
                {shadow?.ok && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                      🛡️ {t('collab.registry.shadow', '전환 안전성(레거시 ↔ 레지스트리)')}{' '}
                      <span style={{ color: shadow.all_identical ? '#16a34a' : '#dc2626' }}>
                        {shadow.all_identical ? '전 플랜 동일' : '차이 발견'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {Object.entries(shadow.by_plan || {}).map(([plan, d]) => (
                        <div key={plan} style={{ display: 'flex', gap: 10, fontSize: 12, padding: '5px 10px', borderRadius: 6, background: 'rgba(148,163,184,0.06)' }}>
                          <b style={{ minWidth: 84 }}>{plan}</b>
                          <span style={{ color: '#64748b' }}>legacy {d.legacy_count} / registry {d.registry_count}</span>
                          <span style={{ marginLeft: 'auto', color: d.identical ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                            {d.identical ? 'IDENTICAL' : `누락 ${d.missing_in_registry.length} · 과다 ${d.extra_in_registry.length}`}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{shadow.note}</div>
                  </div>
                )}

                {/* 관리자 Preview — 실제 권한 변경 없음(계산만) */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800 }}>👁 {t('collab.registry.preview', '플랜별 메뉴 미리보기')}</span>
                  {['free', 'starter', 'growth', 'pro', 'enterprise', 'admin'].map(p => (
                    <button key={p} onClick={() => runPreview(p)}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                        border: `1px solid ${previewPlan === p ? 'rgba(37,99,235,0.5)' : 'rgba(148,163,184,0.4)'}`,
                        background: previewPlan === p ? 'rgba(37,99,235,0.08)' : 'transparent' }}>{p}</button>
                  ))}
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('collab.registry.previewNote', '계산만 수행 — 권한 변경·대행 로그인 없음')}</span>
                </div>
                {preview?.ok && (
                  <div style={{ fontSize: 12, color: '#475569', padding: '8px 10px', borderRadius: 8, background: 'rgba(148,163,184,0.06)' }}>
                    <b>{previewPlan}</b> · 노출 {preview.stats?.visible ?? '—'} / 전체 {preview.stats?.total ?? '—'}
                    {' · '}권한차단 {preview.stats?.permission ?? 0}
                    {' · '}플랫폼차단 {preview.stats?.platform ?? 0}
                    {' · '}빈섹션정리 {preview.stats?.pruned_empty ?? 0}
                    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(preview.items || []).map(sec => (
                        <span key={sec.menu_key} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>
                          {sec.menu_key} ({sec.children?.length || 0})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
