import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * CollaborationHome — 팀/부서 간 협업 워크스페이스(비즈니스 대면 재구성).
 *
 * ★재구성 배경: 종전 화면은 내부 Capability Registry(기능 키·CWIS Part 번호·테이블/클래스/API·개발 상태 메모)를
 *   전 회원에게 그대로 노출하는 "개발 스펙 추적판"이었다. 이를 유통·제조·대행사 등 다양한 기업의 부서/팀이
 *   실제로 협업하는 워크스페이스로 재구성한다. 내부 식별자·Part·테이블·클래스·API·개발메모는 UI 에 노출하지 않는다.
 *
 * 구성: (1) 내 워크스페이스(작업·기한·승인·멘션 — 전 구독플랜)  (2) 팀 협업(팀/부서·팀 간 협업 프로젝트)
 *       (3) 팀원 초대  (4) 관리자 전용 협업 기능 설정(비즈니스 언어 라벨만).
 */

// 작업 상태 점 / 활동 라벨(내부 값 → 비즈니스 표현).
const STATUS_DOT = { todo: '#94a3b8', in_progress: '#2563eb', review: '#d97706', blocked: '#dc2626', done: '#16a34a', cancelled: '#cbd5e1' };
const ACTION_LABEL = { create: '생성', update: '수정', delete: '삭제', restore: '복원', status_change: '상태 변경', assign: '배정', unassign: '배정 해제' };
const isOverdue = (d) => { try { return d && String(d).slice(0, 10) < new Date().toISOString().slice(0, 10); } catch { return false; } };

// 팀 아바타 색상(이름 해시 기반 · 업종 무관).
const TEAM_COLORS = ['#4f8ef7', '#7c3aed', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#db2777', '#65a30d'];
const teamColor = (s) => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 997; return TEAM_COLORS[h % TEAM_COLORS.length]; };

// ── 관리자 전용 협업 기능 설정 — 비즈니스 라벨만(내부 키/Part/테이블/API 미노출). ──
//   고객 대면 협업 기능만 노출. 인프라(foundation/security/realtime)·내부 메뉴 도구(navigation.*)·
//   미착수 세부는 화면에서 제외한다. label/desc 는 순수 비즈니스 언어.
const CAP_BIZ = {
  'collaboration.task':        { label: '업무·태스크', desc: '할 일을 만들고 담당자·기한을 지정해 진행 상황을 관리합니다', cat: '업무' },
  'collaboration.comment':     { label: '댓글', desc: '업무마다 의견을 남기고 대화합니다', cat: '업무' },
  'collaboration.mention':     { label: '멘션(@언급)', desc: '@이름으로 동료를 언급하면 알림이 전달됩니다', cat: '업무' },
  'collaboration.approval':    { label: '승인 워크플로', desc: '예산·발주 등 결재를 요청하고 승인/반려합니다', cat: '업무' },
  'collaboration.attachment':  { label: '파일 첨부', desc: '업무에 파일을 첨부해 공유합니다', cat: '업무' },
  'collaboration.activity':    { label: '활동 피드', desc: '팀의 최근 변경·활동을 한눈에 확인합니다', cat: '업무' },
  'collaboration.workspace':   { label: '워크스페이스', desc: '내 업무·활동·멘션·승인을 한 곳에 모아 봅니다', cat: '업무' },
  'collaboration.team':        { label: '팀·부서', desc: '팀·부서를 만들고 구성원을 배정합니다', cat: '조직' },
  'collaboration.member':      { label: '멤버', desc: '팀 구성원을 관리합니다', cat: '조직' },
  'collaboration.invitation':  { label: '팀원 초대', desc: '이메일로 팀원을 초대합니다', cat: '조직' },
  'collaboration.external':    { label: '외부 협업', desc: '게스트·파트너를 특정 프로젝트에만 초대합니다', cat: '조직' },
  'collaboration.access':      { label: '권한 관리', desc: '팀·역할별 접근 권한을 설정합니다', cat: '조직' },
  'collaboration.notification':{ label: '알림', desc: '중요한 변경을 실시간으로 알립니다', cat: '소통' },
};
// 준비 중(곧 제공) — 비즈니스 라벨만, 내부 사유·Part 미노출.
const CAP_COMING = {
  'collaboration.messaging': '팀 메시징', 'collaboration.channel': '협업 채널', 'collaboration.document': '문서·위키',
  'collaboration.meeting': '회의', 'collaboration.knowledge': '지식·검색', 'collaboration.ai': 'AI 협업',
};

export default function CollaborationHome() {
  const t = useT();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState('');

  const authFetch = useCallback((path, opts = {}) => fetch(`${base}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  }), [base, token]);

  // ── 내 워크스페이스(작업·활동·멘션·승인) — 전 구독플랜 ──
  const [hub, setHub] = useState(null);
  const [plan, setPlan] = useState(null);
  const loadHub = useCallback(async () => {
    if (!token) return;
    try {
      const r = await authFetch('/api/v425/pm/collaboration/hub');
      if (r.ok) { const j = await r.json(); setHub(j?.hub || null); setPlan(j?.plan || null); }
    } catch (_) { /* 실패 시 워크스페이스 숨김 */ }
  }, [authFetch, token]);
  useEffect(() => { if (token) loadHub(); }, [token, loadHub]);

  // ── 팀 협업(팀/부서·팀 간 협업 프로젝트) ──
  const [teamData, setTeamData] = useState(null);
  const loadTeams = useCallback(async () => {
    if (!token) return;
    try {
      const r = await authFetch('/api/v425/pm/collaboration/teams');
      if (r.ok) setTeamData(await r.json());
    } catch (_) { /* 실패 시 팀 섹션 숨김 */ }
  }, [authFetch, token]);
  useEffect(() => { if (token) loadTeams(); }, [token, loadTeams]);

  // ── 통합 승인함 결재(집행 SSOT=기존 승인 엔진) ──
  const [apprBusy, setApprBusy] = useState('');
  const decideApproval = useCallback(async (id, decision) => {
    setApprBusy(id + decision);
    try {
      const r = await authFetch(`/api/v423/approvals/${encodeURIComponent(id)}/decide`, { method: 'POST', body: JSON.stringify({ decision }) });
      if (r.ok) await loadHub();
      else { const j = await r.json().catch(() => ({})); setMsg(j?.detail || j?.error || `승인 처리 실패(HTTP ${r.status})`); }
    } catch (e) { setMsg(String(e?.message || e)); }
    finally { setApprBusy(''); }
  }, [authFetch, loadHub]);

  // ── 팀원 초대 ──
  const [invites, setInvites] = useState([]);
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('member');
  const [invScope, setInvScope] = useState('');
  const [invResult, setInvResult] = useState(null);
  const [invBusy, setInvBusy] = useState(false);
  const [grants, setGrants] = useState([]);
  const isExtRole = invRole === 'guest' || invRole === 'partner';
  const loadInvites = useCallback(async () => {
    try { const r = await authFetch('/api/v425/pm/collaboration/invitations'); if (r.ok) { const j = await r.json(); setInvites(Array.isArray(j?.invitations) ? j.invitations : []); } } catch (_) {}
    try { const r2 = await authFetch('/api/v425/pm/collaboration/access/grants'); if (r2.ok) { const j2 = await r2.json(); setGrants(Array.isArray(j2?.grants) ? j2.grants : []); } } catch (_) {}
  }, [authFetch]);
  useEffect(() => { if (token) loadInvites(); }, [token, loadInvites]);
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
  }, [authFetch, invEmail, invRole, invScope, loadInvites]);
  const revokeInvite = useCallback(async (pid) => {
    try { const r = await authFetch(`/api/v425/pm/collaboration/invitations/${encodeURIComponent(pid)}/revoke`, { method: 'POST' }); if (r.ok) await loadInvites(); } catch (_) {}
  }, [authFetch, loadInvites]);
  const revokeGrant = useCallback(async (pid) => {
    try { const r = await authFetch(`/api/v425/pm/collaboration/access/grants/${encodeURIComponent(pid)}/revoke`, { method: 'POST' }); if (r.ok) await loadInvites(); } catch (_) {}
  }, [authFetch, loadInvites]);

  // ── 관리자 전용 협업 기능 설정(비즈니스 라벨만) ──
  const [caps, setCaps] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const loadCaps = useCallback(async () => {
    if (!token) return;
    try { const r = await authFetch('/api/v425/pm/collaboration/capabilities'); if (r.ok) { const j = await r.json(); setCaps(Array.isArray(j?.capabilities) ? j.capabilities : []); } } catch (_) {}
  }, [authFetch, token]);
  const toggleCap = useCallback(async (key, enabled) => {
    setBusyKey(key); setMsg('');
    try {
      const r = await authFetch(`/api/v425/pm/collaboration/capabilities/${encodeURIComponent(key)}/${enabled ? 'disable' : 'enable'}`, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) setMsg(j?.message || j?.error || `변경 실패(HTTP ${r.status})`);
      else await loadCaps();
    } catch (e) { setMsg(String(e?.message || e)); }
    finally { setBusyKey(''); }
  }, [authFetch, loadCaps]);

  const capByKey = useMemo(() => { const m = {}; for (const c of caps) m[c.key] = c; return m; }, [caps]);
  const bizCaps = useMemo(() => Object.entries(CAP_BIZ).map(([key, meta]) => ({ key, ...meta, enabled: capByKey[key]?.enabled ?? true })), [capByKey]);
  const comingCaps = useMemo(() => Object.entries(CAP_COMING).map(([key, label]) => ({ key, label })), []);
  const teams = teamData?.teams || [];
  const crossTeam = teamData?.cross_team_projects || [];

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🤝 {t('collab.home.title', '협업')}</h1>
      </div>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        {t('collab.home.subtitle2', '부서·팀이 함께 일하는 공간입니다. 내 업무와 팀 간 협업을 한 곳에서 관리하세요.')}
      </p>

      {error && <div style={{ padding: 12, borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ padding: 12, borderRadius: 8, background: 'rgba(217,119,6,0.10)', color: '#b45309', fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      {/* ═══ 1. 내 워크스페이스 (전 구독플랜) ═══ */}
      {hub && (
        <section style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>🧑‍💻 {t('collab.ws.title', '내 워크스페이스')}</span>
            {plan && <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', padding: '3px 10px', borderRadius: 99, background: 'rgba(37,99,235,0.08)' }}>{t('collab.ws.plan', '내 플랜')}: {plan.name}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: 14 }}>
            {[
              [t('collab.ws.open', '진행 중 작업'), hub.tasks?.open_total ?? 0, '#2563eb'],
              [t('collab.ws.overdue', '기한 초과'), hub.tasks?.overdue ?? 0, (hub.tasks?.overdue > 0 ? '#dc2626' : '#16a34a')],
              [t('collab.ws.dueSoon', '임박(7일)'), hub.tasks?.due_soon ?? 0, (hub.tasks?.due_soon > 0 ? '#d97706' : '#16a34a')],
              [t('collab.ws.approvals', '승인 대기'), hub.approvals?.pending ?? 0, (hub.approvals?.pending > 0 ? '#7c3aed' : '#16a34a')],
              [t('collab.ws.projects', '활성 프로젝트'), hub.projects?.active ?? 0, '#334155'],
            ].map(([label, v, color]) => (
              <div key={label} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border,#e2e8f0)', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
            <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)' }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>📋 {t('collab.ws.myTasks', '작업 목록')}</div>
              {(hub.tasks?.items || []).length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('collab.ws.noTasks', '열린 작업이 없습니다.')}</div>}
              <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {(hub.tasks?.items || []).map(tk => (
                  <div key={tk.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: 'rgba(148,163,184,0.06)', fontSize: 12 }}>
                    <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: 99, background: STATUS_DOT[tk.status] || '#94a3b8' }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tk.title}</span>
                    {tk.project_name && <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{tk.project_name}</span>}
                    {tk.due_date && <span style={{ fontSize: 10, color: isOverdue(tk.due_date) ? '#dc2626' : '#64748b', flexShrink: 0 }}>{String(tk.due_date).slice(5, 10)}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)' }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>🔔 {t('collab.ws.activity', '최근 활동')}</div>
              <div style={{ display: 'grid', gap: 5, maxHeight: 130, overflowY: 'auto', marginBottom: 10 }}>
                {(hub.activity || []).length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('collab.ws.noActivity', '최근 활동이 없습니다.')}</div>}
                {(hub.activity || []).map((a, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: '#475569' }}>{ACTION_LABEL[a.action] || a.action}</span>
                    <span>{a.entity_type}</span>
                    <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>{a.created_at ? String(a.created_at).slice(5, 16).replace('T', ' ') : ''}</span>
                  </div>
                ))}
              </div>
              {(hub.mentions || []).length > 0 && (
                <>
                  <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6, color: '#7c3aed' }}>@ {t('collab.ws.mentions', '멘션')}</div>
                  <div style={{ display: 'grid', gap: 5, maxHeight: 110, overflowY: 'auto' }}>
                    {(hub.mentions || []).map(m => (
                      <div key={m.id} style={{ fontSize: 11, color: '#475569', padding: '5px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.05)' }}>
                        <b>{m.task_title || m.task_id}</b>: {m.excerpt}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {(hub.approvals?.items || []).length > 0 && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, border: '1px solid rgba(124,58,237,0.25)' }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10, color: '#7c3aed' }}>✅ {t('collab.ws.approvalInbox', '통합 승인함')} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({hub.approvals.pending})</span></div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(hub.approvals.items || []).map(ap => (
                  <div key={ap.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.05)', fontSize: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#7c3aed', flexShrink: 0 }}>#{ap.id}</span>
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>{ap.type}</span>
                    <span style={{ flex: 1, minWidth: 120, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ap.summary}</span>
                    <button onClick={() => decideApproval(ap.id, 'approve')} disabled={apprBusy === ap.id + 'approve'} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(22,163,74,0.4)', background: 'transparent', color: '#16a34a', flexShrink: 0 }}>{apprBusy === ap.id + 'approve' ? '…' : t('collab.ws.approve', '승인')}</button>
                    <button onClick={() => decideApproval(ap.id, 'reject')} disabled={apprBusy === ap.id + 'reject'} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(220,38,38,0.4)', background: 'transparent', color: '#dc2626', flexShrink: 0 }}>{apprBusy === ap.id + 'reject' ? '…' : t('collab.ws.reject', '반려')}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ 2. 팀 협업 (팀/부서 · 팀 간 협업 프로젝트) ═══ */}
      <section style={{ marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>🏢 {t('collab.team.title', '팀 협업')}</span>
          {teams.length > 0 && <span style={{ fontSize: 12, color: '#64748b' }}>{t('collab.team.count', '팀')} {teams.length}</span>}
          <a href="/team-members" style={{ marginLeft: 'auto', fontSize: 12, color: '#4f8ef7', textDecoration: 'none', fontWeight: 700 }}>{t('collab.team.manage', '멤버 구성원 관리')} →</a>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>
          {t('collab.team.desc', '제조·재고·마케팅·영업·재무 등 우리 회사의 팀입니다. 팀 전체 또는 일부 팀이 프로젝트로 함께 협업합니다.')}
        </p>

        {teams.length === 0 ? (
          <div style={{ padding: '16px 18px', borderRadius: 12, border: '1px dashed var(--border,#cbd5e1)', fontSize: 13, color: '#64748b' }}>
            {t('collab.team.empty', '아직 팀이 없습니다. [멤버 구성원 도구]에서 팀을 만들고 구성원을 배정하세요.')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
            {teams.map(tm => {
              const col = teamColor(tm.name);
              return (
                <div key={tm.id} style={{ padding: 14, borderRadius: 12, border: `1px solid ${tm.is_mine ? col + '66' : 'var(--border,#e2e8f0)'}`, background: tm.is_mine ? col + '08' : 'var(--card,#fff)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: col, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{String(tm.name).slice(0, 1)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tm.name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{t('collab.team.members', '멤버')} {tm.member_count}{tm.manager_name ? ` · ${t('collab.team.manager', '리더')} ${tm.manager_name}` : ''}</div>
                    </div>
                    {tm.is_mine && <span style={{ fontSize: 10, fontWeight: 700, color: col, flexShrink: 0 }}>{t('collab.team.mine', '내 팀')}</span>}
                  </div>
                  {tm.description && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{tm.description}</div>}
                  {(tm.members || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(tm.members || []).slice(0, 6).map((mb, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(148,163,184,0.12)', color: '#475569' }}>{mb.name || mb.email}</span>
                      ))}
                      {tm.member_count > 6 && <span style={{ fontSize: 10, color: '#94a3b8' }}>+{tm.member_count - 6}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 팀 간 협업 프로젝트 — 여러 팀이 함께 참여하는 프로젝트(실측) */}
        {crossTeam.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>🔗 {t('collab.team.cross', '팀 간 협업 프로젝트')}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {crossTeam.map(cp => (
                <div key={cp.project_id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.05)', fontSize: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, flex: 1, minWidth: 120 }}>{cp.name}</span>
                  <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, flexShrink: 0 }}>{t('collab.team.teamsInvolved', '참여 팀')} {cp.team_count}</span>
                  <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>{t('collab.team.membersInvolved', '참여자')} {cp.member_count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </section>

      {/* ═══ 3. 팀원 초대 ═══ */}
      <section style={{ marginBottom: 26, padding: 16, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)' }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>✉️ {t('collab.invite.title', '팀원 초대')}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{t('collab.invite.desc', '이메일로 팀원을 초대합니다. 초대 링크는 만료·1회성이며 관리자만 발급/철회할 수 있습니다.')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input type="email" placeholder={t('collab.invite.email', '초대할 이메일')} value={invEmail} onChange={e => setInvEmail(e.target.value)} style={{ flex: '1 1 200px', minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border,#cbd5e1)' }} />
          <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border,#cbd5e1)' }}>
            <option value="member">{t('collab.role.member', '멤버(내부)')}</option>
            <option value="manager">{t('collab.role.manager', '매니저(내부)')}</option>
            <option value="guest">{t('collab.role.guest', '게스트(외부)')}</option>
            <option value="partner">{t('collab.role.partner', '파트너(외부)')}</option>
          </select>
          {isExtRole && <input placeholder={t('collab.invite.scope', '프로젝트 ID(외부 접근 범위)')} value={invScope} onChange={e => setInvScope(e.target.value)} style={{ flex: '1 1 160px', minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid #f59e0b' }} />}
          <button onClick={createInvite} disabled={invBusy || !invEmail || (isExtRole && !invScope)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: invBusy || !invEmail ? 0.5 : 1 }}>{invBusy ? '…' : t('collab.invite.send', '초대 보내기')}</button>
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
        {grants.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309', marginBottom: 6 }}>🔑 {t('collab.grants.title', '외부 접근 권한(범위 한정·만료)')}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {grants.map(gr => (
                <div key={gr.public_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.06)', fontSize: 12 }}>
                  <span>{gr.principal_type} · {gr.scope_type}:{gr.scope_id} · {gr.revoked_at ? <span style={{ color: '#94a3b8' }}>철회됨</span> : <span style={{ color: '#16a34a' }}>유효</span>}{gr.valid_until ? ' · ~' + String(gr.valid_until).slice(0, 10) : ''}</span>
                  {!gr.revoked_at && <button onClick={() => revokeGrant(gr.public_id)} style={{ fontSize: 11, color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '2px 10px', background: 'transparent', cursor: 'pointer' }}>{t('collab.invite.revoke', '철회')}</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ 4. 관리자 전용 협업 기능 설정 (비즈니스 라벨만) ═══ */}
      <section style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border,#e2e8f0)' }}>
        <button onClick={() => { setSettingsOpen(o => !o); if (!caps.length) loadCaps(); }} aria-expanded={settingsOpen}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>⚙️ {t('collab.settings.title', '협업 기능 설정')}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('collab.settings.admin', '관리자')}</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{settingsOpen ? '▲' : '▼'}</span>
        </button>
        {settingsOpen && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{t('collab.settings.desc', '우리 회사에서 사용할 협업 기능을 켜고 끕니다.')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
              {bizCaps.map(c => (
                <div key={c.key} style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border,#e2e8f0)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{c.label}</span>
                    <button onClick={() => toggleCap(c.key, c.enabled)} disabled={busyKey === c.key}
                      style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 99, cursor: 'pointer',
                        border: `1px solid ${c.enabled ? 'rgba(22,163,74,0.4)' : 'rgba(148,163,184,0.4)'}`, background: 'transparent', color: c.enabled ? '#16a34a' : '#94a3b8' }}>
                      {busyKey === c.key ? '…' : (c.enabled ? t('collab.on', '켜짐') : t('collab.off', '꺼짐'))}
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
            {comingCaps.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>{t('collab.settings.coming', '곧 제공')}:</span>
                {comingCaps.map(c => <span key={c.key} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}>{c.label}</span>)}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
