import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js'; // 181차 다국어
import { IS_DEMO } from '../utils/demoEnv';
import { tGetJSON, tSetJSON } from '../utils/tenantStorage.js';
import * as wmsApi from '../services/wmsApi.js'; // 212차 #5: 파트너(매입처/물류처/창고처) 계정
import { handlePlanLimit } from '../utils/planLimit.js';
import AvatarField from '../components/AvatarField.jsx'; // [231차 #3] 프로필 사진 등록·표시
import * as teamApi from '../services/teamApi.js'; // [231차 팀권한] 팀 엔터티/권한 매트릭스/데이터범위
import { MENU_CATALOG, ACTIONS, DATA_SCOPES, TEAM_TYPES, normActions, actionsCover } from '../services/teamApi.js';
import { getJsonAuth, putJson, postJsonAuth } from '../services/apiClient.js'; // [현 차수] 본인 보안 로그(세션 Bearer) · [245차 P2-3] SSO/SCIM
import { useGlobalData } from '../context/GlobalDataContext.jsx'; // [현 차수 보강3] 실시간 동기화(syncTick) 구독
import { SupplierPanel } from '../components/partners/PartnerPanels.jsx'; // [현 차수] 거래처(매입처) 통합 관리 — WMS에서 이관, 카테고리 사용자 확장형

/**
 * 팀·멤버·권한 관리 (180차 멤버구성원 → 231차 초엔터프라이즈 RBAC/ABAC 통합).
 * ──────────────────────────────────────────────────────────────────────────
 * 단일 화면 4탭: 팀원 / 팀 관리 / 권한 매트릭스 / 감사 로그 (+ 파트너 계정).
 *  - 팀원: owner 가 팀원 하위계정(ID/비번) 등록·역할·팀 배정. (/auth/team/members)
 *  - 팀 관리: 팀 추가/수정/유형/관리자 지정/비활성(archive)/복구/하드삭제. (/auth/team/teams)
 *  - 권한 매트릭스: 팀·멤버별 메뉴×8동작 권한 + 데이터 접근 범위. 팀관리자는 위임 상한 내에서만.
 *  - 감사 로그: 팀/권한 변경 이력.
 *  - 권한: owner/manager(=admin 우회). member 는 읽기전용 배너.
 */

const API = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = IS_DEMO ? 'demo_genie_token' : 'genie_token';
const DEMO_KEY = 'demo_team_members';

const ROLE_COLOR = { owner: '#7c3aed', manager: '#2563eb', member: '#0891b2' };
const STATUS_COLOR = { active: '#16a34a', disabled: '#f59e0b', archived: '#94a3b8' };

function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY) || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

/* ── 데모 시뮬레이션 (tenant 스코프 — 다른 체험자와 분리) ── */
function demoSeed() {
  return [
    { id: 'owner', email: 'owner@genieroi.com', name: '대표 계정', team_role: 'owner', team_name: '본사', team_id: null, is_active: 1, created_at: '2026-01-02' },
    { id: 'tm_1', email: 'manager.kim@genieroi.com', name: '김매니저', team_role: 'manager', team_name: '마케팅팀', team_id: 1, is_active: 1, created_at: '2026-02-10' },
    { id: 'tm_2', email: 'staff.lee@genieroi.com', name: '이담당', team_role: 'member', team_name: '마케팅팀', team_id: 1, is_active: 1, created_at: '2026-03-05' },
    { id: 'tm_3', email: 'staff.park@genieroi.com', name: '박담당', team_role: 'member', team_name: '커머스팀', team_id: 2, is_active: 1, created_at: '2026-03-22' },
  ];
}
function demoLoad() {
  const v = tGetJSON(DEMO_KEY, null);
  if (v && Array.isArray(v) && v.length) return v;
  const seed = demoSeed();
  tSetJSON(DEMO_KEY, seed);
  return seed;
}
function demoSave(list) { tSetJSON(DEMO_KEY, list); }

export default function TeamMembers() {
  const t = useT();
  const { user } = useAuth() || {};
  const callerRole = user?.team_role || 'owner';
  const canManage = IS_DEMO || ['owner', 'manager'].includes(callerRole) || user?.plan === 'admin';
  const isOwnerAdmin = IS_DEMO || callerRole === 'owner' || user?.plan === 'admin';

  const [tab, setTab] = useState('members');
  const [toast, setToast] = useState('');
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const TABS = [
    { id: 'members', label: t('teamMembers.tabMembers', '팀원'), icon: '🧑‍🤝‍🧑' },
    { id: 'teams', label: t('teamMembers.tabTeams', '팀 관리'), icon: '🏢' },
    { id: 'matrix', label: t('teamMembers.tabMatrix', '권한 매트릭스'), icon: '🔐' },
    { id: 'audit', label: t('teamMembers.tabAudit', '감사 로그'), icon: '🧾' },
    { id: 'memberlog', label: t('memberLog.tabLog', '로그 기록'), icon: '🛡️' },
    { id: 'partners', label: t('teamMembers.tabPartners', '파트너 계정'), icon: '🤝' },
    { id: 'vendors', label: t('teamMembers.tabVendors', '거래처'), icon: '🏭' },
    ...(isOwnerAdmin ? [{ id: 'sso', label: t('teamMembers.tabSso', 'SSO·SCIM'), icon: '🔑' }] : []), // [245차 P2-3] 엔터프라이즈 인증(owner/admin)
  ];

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#1e293b)', maxWidth: 1180, margin: '0 auto' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>👥 {t('teamMembers.title', '팀·멤버·권한 관리')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3,#64748b)', marginTop: 5 }}>
          {t('teamMembers.descV2', '팀을 구성하고 팀·팀원 단위로 메뉴·기능·데이터 접근 권한을 부여합니다. 하위계정은 동일 회원(테넌트)으로 격리되어 같은 데이터를 공유합니다.')}
          {IS_DEMO && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>· 🧪 {t('teamMembers.demoBadge', 'Demo (simulation)')}</span>}
        </div>
      </div>

      {!canManage && (
        <div style={{ marginBottom: 16, border: '1px solid #fde68a', background: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ fontSize: 13, color: 'var(--text-2,#475569)', fontWeight: 600 }}>
            {t('teamMembers.readOnlyBanner', '읽기 전용 멤버 계정입니다 — 팀·권한 관리는 관리자(owner) 또는 매니저만 가능합니다.')}
          </span>
        </div>
      )}

      {/* 탭 바 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
        {TABS.map(x => (
          <button key={x.id} onClick={() => setTab(x.id)} style={{
            padding: '9px 16px', border: 'none', borderBottom: tab === x.id ? '2px solid #4f46e5' : '2px solid transparent',
            background: 'transparent', cursor: 'pointer', fontSize: 13.5, fontWeight: tab === x.id ? 800 : 600,
            color: tab === x.id ? '#4f46e5' : 'var(--text-3,#64748b)',
          }}>{x.icon} {x.label}</button>
        ))}
      </div>

      {tab === 'members' && <MembersPanel t={t} canManage={canManage} flash={flash} />}
      {tab === 'teams' && <TeamsPanel t={t} canManage={isOwnerAdmin} flash={flash} />}
      {tab === 'matrix' && <MatrixPanel t={t} canManage={canManage} isOwnerAdmin={isOwnerAdmin} flash={flash} />}
      {tab === 'audit' && <AuditPanel t={t} flash={flash} />}
      {tab === 'memberlog' && <MemberLogPanel t={t} flash={flash} />}
      {/* [현 차수] WMS에서 이관 통합 — 파트너 계정 발급 + 거래처(매입처) 등록을 한 곳에서 관리(백엔드 SSOT 공유→WMS 운영과 동기화). */}
      {tab === 'partners' && (canManage ? <PartnerSection t={t} flash={flash} input={input} /> : <div style={{ fontSize: 13, color: '#94a3b8', padding: 20 }}>{t('teamMembers.partnersLocked', '파트너 계정 관리는 관리자(owner)·매니저만 가능합니다.')}</div>)}
      {tab === 'vendors' && (canManage ? <SupplierPanel /> : <div style={{ fontSize: 13, color: '#94a3b8', padding: 20 }}>{t('teamMembers.vendorsLocked', '거래처 관리는 관리자(owner)·매니저만 가능합니다.')}</div>)}
      {tab === 'sso' && (isOwnerAdmin ? <SSOPanel t={t} flash={flash} input={input} /> : <div style={{ fontSize: 13, color: '#94a3b8', padding: 20 }}>{t('teamMembers.ssoLocked', 'SSO/SCIM 설정은 관리자(owner)만 가능합니다.')}</div>)}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '11px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>}
    </div>
  );
}

const card = { background: 'var(--surface,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 14, padding: 20 };
const input = { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border,#cbd5e1)', fontSize: 13, background: 'var(--bg,#fff)', color: 'var(--text-1,#1e293b)' };

/* ═══════════════════ 팀원 패널 (기존 멤버 CRUD + 팀 배정) ═══════════════════ */
function MembersPanel({ t, canManage, flash }) {
  const roleLabel = (r) => ({ owner: t('teamMembers.roleOwner', 'Owner'), manager: t('teamMembers.roleManager', 'Manager'), member: t('teamMembers.roleMember', 'Member') }[r] || r);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', team_role: 'member', team_id: '', photo: '' });
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const filteredMembers = members.filter(m => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [m.name, m.email, m.team_name, m.team_role].some(v => String(v || '').toLowerCase().includes(q));
  });

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { const r = await teamApi.listTeams(); setTeams(r.teams || []); } catch { setTeams([]); }
    if (IS_DEMO) { setMembers(demoLoad()); setLoading(false); return; }
    try {
      const r = await fetch(`${API}/auth/team/members`, { headers: authHeaders() });
      const d = await r.json();
      if (d.ok) setMembers(d.members || []);
      else setErr(d.error || t('teamMembers.errLoad', 'Failed to load the list.'));
    } catch (e) { setErr(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
    setLoading(false);
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const teamName = (id) => (teams.find(x => String(x.id) === String(id)) || {}).name || '';

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name) { flash(t('teamMembers.errRequired', '이메일·비밀번호·이름을 입력하세요.')); return; }
    if (form.password.length < 6) { flash(t('teamMembers.errPwLen', '비밀번호는 6자 이상이어야 합니다.')); return; }
    setBusy(true);
    const tid = form.team_id ? Number(form.team_id) : null;
    if (IS_DEMO) {
      const list = demoLoad();
      if (list.some(m => m.email.toLowerCase() === form.email.toLowerCase())) { flash(t('teamMembers.errDupEmail', '이미 등록된 이메일입니다.')); setBusy(false); return; }
      const next = [...list, { id: 'tm_' + Date.now(), email: form.email.toLowerCase(), name: form.name, team_role: form.team_role, team_id: tid, team_name: teamName(tid), photo: form.photo || '', is_active: 1, created_at: new Date().toISOString().slice(0, 10) }];
      demoSave(next); setMembers(next);
      setForm({ email: '', password: '', name: '', team_role: 'member', team_id: '', photo: '' });
      flash(t('teamMembers.okCreatedDemo', '✅ 팀원이 추가되었습니다 (데모).')); setBusy(false); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...form, team_id: tid }) });
      const d = await r.json();
      if (d.ok) { setForm({ email: '', password: '', name: '', team_role: 'member', team_id: '', photo: '' }); flash(t('teamMembers.okCreated', '✅ 팀원 하위계정이 생성되었습니다.')); load(); }
      else flash('⚠ ' + (d.error || t('teamMembers.errCreate', '생성 실패')));
    } catch (e) { flash(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
    setBusy(false);
  };

  const patchMember = async (m, body, okMsg) => {
    if (IS_DEMO) {
      const next = demoLoad().map(x => x.id === m.id ? { ...x, ...body, ...(body.team_id !== undefined ? { team_name: teamName(body.team_id) } : {}) } : x);
      demoSave(next); setMembers(next); flash(okMsg); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || t('teamMembers.errFail', '실패')));
    } catch (e) { flash(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
  };
  const onToggleActive = (m) => { if (m.team_role === 'owner') return; patchMember(m, { is_active: m.is_active ? 0 : 1 }, t('teamMembers.okStatusDemo', '상태 변경됨')); };
  const onRoleChange = (m, role) => { if (m.team_role === 'owner') return; patchMember(m, { team_role: role }, t('teamMembers.okRoleDemo', '역할 변경됨')); };
  const onTeamChange = (m, tid) => { if (m.team_role === 'owner') return; patchMember(m, { team_id: tid ? Number(tid) : null }, t('teamMembers.okTeamChanged', '소속 팀 변경됨')); };
  const onDelete = async (m) => {
    if (m.team_role === 'owner') return;
    if (!window.confirm(t('teamMembers.confirmDelete', "하위계정 '{{name}} ({{email}})' 을(를) 비활성(삭제)하시겠습니까?", { name: m.name, email: m.email }))) return;
    if (IS_DEMO) { const next = demoLoad().filter(x => x.id !== m.id); demoSave(next); setMembers(next); flash(t('teamMembers.okDeletedDemo', '삭제됨')); return; }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || t('teamMembers.errFail', '실패')));
    } catch (e) { flash(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
  };

  const activeTeams = teams.filter(x => x.status === 'active' || !x.status);

  return (
    <>
      {canManage && (
        <form onSubmit={onCreate} style={{ ...card, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>➕ {t('teamMembers.formTitle', '팀원 하위계정 등록')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <AvatarField value={form.photo} name={form.name} size={56} editable onChange={(url) => setForm(f => ({ ...f, photo: url }))} />
            <span style={{ fontSize: 12, color: 'var(--text-3,#94a3b8)' }}>{t('teamMembers.photoHint', '프로필 사진 (선택) — 클릭하여 등록')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
            <input style={input} type="email" placeholder={t('teamMembers.phEmail', '이메일 (로그인 ID)')} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input style={input} type="password" placeholder={t('teamMembers.phPassword', '비밀번호 (6자+)')} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <input style={input} placeholder={t('teamMembers.phName', '이름')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <select style={input} value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
              <option value="">{t('teamMembers.phNoTeam', '소속 팀 (선택)')}</option>
              {activeTeams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
            <select style={input} value={form.team_role} onChange={e => setForm(f => ({ ...f, team_role: e.target.value }))}>
              <option value="member">{t('teamMembers.roleMember', 'Member')}</option>
              <option value="manager">{t('teamMembers.roleManager', 'Manager')}</option>
            </select>
          </div>
          <button type="submit" disabled={busy} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 9, border: 'none', background: busy ? '#94a3b8' : '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
            {busy ? t('teamMembers.processing', '처리 중…') : t('teamMembers.createAccount', '하위계정 생성')}
          </button>
        </form>
      )}

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{t('teamMembers.listTitle', '구성원 목록')} ({filteredMembers.length}{query ? `/${members.length}` : ''})</div>
          <input style={{ ...input, maxWidth: 240 }} placeholder={t('teamMembers.searchPh', '🔍 이름·이메일·팀 검색')} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {err && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>}
        {loading ? <div style={{ color: '#64748b', fontSize: 13 }}>{t('teamMembers.loading', '불러오는 중…')}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colPhoto', '사진')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colName', '이름')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colEmail', '이메일 (ID)')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colTeam', '팀')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colRole', '역할')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colStatus', '상태')}</th>
                  {canManage && <th style={{ padding: '8px 10px' }}>{t('teamMembers.colManage', '관리')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border,#f1f5f9)', opacity: m.is_active ? 1 : 0.5 }}>
                    <td style={{ padding: '6px 10px' }}><AvatarField value={m.photo} name={m.name} size={34} /></td>
                    <td style={{ padding: '9px 10px', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '9px 10px', color: '#475569' }}>{m.email}</td>
                    <td style={{ padding: '9px 10px' }}>
                      {(canManage && m.team_role !== 'owner') ? (
                        <select value={m.team_id || ''} onChange={e => onTeamChange(m, e.target.value)} style={{ ...input, padding: '4px 8px', fontSize: 12 }}>
                          <option value="">—</option>
                          {activeTeams.map(tm => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
                        </select>
                      ) : (m.team_name || '—')}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      {(canManage && m.team_role !== 'owner') ? (
                        <select value={m.team_role} onChange={e => onRoleChange(m, e.target.value)} style={{ ...input, padding: '4px 8px', fontSize: 12 }}>
                          <option value="member">{t('teamMembers.roleMember', 'Member')}</option>
                          <option value="manager">{t('teamMembers.roleManager', 'Manager')}</option>
                        </select>
                      ) : (<span style={{ color: ROLE_COLOR[m.team_role] || '#475569', fontWeight: 700 }}>{roleLabel(m.team_role)}</span>)}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: m.is_active ? '#16a34a' : '#94a3b8' }}>{m.is_active ? '● ' + t('teamMembers.active', '활성') : '○ ' + t('teamMembers.inactive', '비활성')}</span>
                    </td>
                    {canManage && (
                      <td style={{ padding: '9px 10px' }}>
                        {m.team_role === 'owner' ? <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span> : (
                          <span style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => onToggleActive(m)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: 'var(--text-2,#475569)' }}>{m.is_active ? t('teamMembers.deactivate', '비활성') : t('teamMembers.activate', '활성')}</button>
                            <button onClick={() => onDelete(m)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #fecaca', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>{t('teamMembers.delete', '삭제')}</button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!filteredMembers.length && <tr><td colSpan={canManage ? 7 : 6} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>{query ? t('teamMembers.noMatch', '검색 결과가 없습니다.') : t('teamMembers.empty', '등록된 구성원이 없습니다.')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </>
  );
}

/* ═══════════════════ 팀 관리 패널 ═══════════════════ */
const TYPE_LABEL = {
  internal_super: '계정 총관리', brand: '브랜드팀', marketing: '마케팅팀', marketing_global: '마케팅-글로벌', marketing_domestic: '마케팅-국내',
  sales: '영업팀', sales_global: '해외영업', sales_domestic: '국내영업', sales_enterprise: '대기업영업', sales_channel: '유통/총판영업',
  logistics: '물류팀', finance: '재무팀',
  partner_agency: '외부 대행사', partner_live: '라이브커머스 파트너', partner_supplier: '공급 파트너', partner_distribution: '유통 파트너', custom: '사용자 정의',
};
// 팀 유형 라벨 15개국 현지화(teamPartner.type_* — TYPE_LABEL=한글 폴백).
const typeLabel = (t, k) => t('teamPartner.type_' + k, TYPE_LABEL[k] || k);
function TeamsPanel({ t, canManage, flash }) {
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} (new) | team
  const blank = { name: '', team_type: 'custom', description: '', manager_user_id: '', status: 'active' };
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await teamApi.listTeams(); setTeams(r.teams || []); } catch (e) { flash('⚠ ' + e.message); setTeams([]); }
    // 관리자 후보 멤버
    if (IS_DEMO) setMembers(demoLoad());
    else { try { const r = await fetch(`${API}/auth/team/members`, { headers: authHeaders() }); const d = await r.json(); setMembers(d.ok ? (d.members || []) : []); } catch { setMembers([]); } }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const startNew = () => { setForm(blank); setEditing({}); };
  const startEdit = (tm) => { setForm({ name: tm.name, team_type: tm.team_type || 'custom', description: tm.description || '', manager_user_id: tm.manager_user_id || '', status: tm.status || 'active' }); setEditing(tm); };
  const save = async () => {
    if (!form.name.trim()) { flash(t('teamMembers.errTeamName', '팀 이름을 입력하세요.')); return; }
    setBusy(true);
    const payload = { name: form.name.trim(), team_type: form.team_type, description: form.description, manager_user_id: form.manager_user_id || null };
    try {
      if (editing && editing.id) { await teamApi.updateTeam(editing.id, { ...payload, status: form.status }); flash(t('teamMembers.okTeamSaved', '✅ 팀이 저장되었습니다.')); }
      else { await teamApi.createTeam(payload); flash(t('teamMembers.okTeamCreated', '✅ 팀이 생성되었습니다.')); }
      setEditing(null); load();
    } catch (e) { flash('⚠ ' + e.message); }
    setBusy(false);
  };
  const archive = async (tm) => {
    if (!window.confirm(t('teamMembers.confirmArchive', "팀 '{{name}}' 을(를) 비활성(보관)하시겠습니까? 소속 멤버 {{n}}명·권한 {{p}}건은 보존됩니다.", { name: tm.name, n: tm.member_count || 0, p: tm.permission_count || 0 }))) return;
    try { await teamApi.deleteTeam(tm.id); flash(t('teamMembers.okArchived', '팀이 보관 처리되었습니다.')); load(); } catch (e) { flash('⚠ ' + e.message); }
  };
  const restore = async (tm) => { try { await teamApi.restoreTeam(tm.id); flash(t('teamMembers.okRestored', '팀이 복구되었습니다.')); load(); } catch (e) { flash('⚠ ' + e.message); } };
  const hardDelete = async (tm) => {
    if (!window.confirm(t('teamMembers.confirmHardDelete', "⚠ 팀 '{{name}}' 을(를) 영구 삭제합니다. 소속 멤버 {{n}}명의 팀 배정이 해제되고 팀 권한 {{p}}건이 삭제됩니다. 되돌릴 수 없습니다. 계속하시겠습니까?", { name: tm.name, n: tm.member_count || 0, p: tm.permission_count || 0 }))) return;
    try { await teamApi.deleteTeam(tm.id, { hard: true }); flash(t('teamMembers.okHardDeleted', '팀이 영구 삭제되었습니다.')); load(); } catch (e) { flash('⚠ ' + e.message); }
  };

  const seedOrg = async () => {
    if (!window.confirm(t('teamMembers.confirmSeedOrg', '표준 조직 구조(브랜드/마케팅/영업/물류/재무 + 외부 파트너 4종)와 유형별 기본 권한을 일괄 생성하시겠습니까? 동명 팀은 건너뜁니다.'))) return;
    setBusy(true);
    try { const r = await teamApi.seedOrg(); flash(t('teamMembers.okSeedOrg', '✅ 표준 조직 구조 생성: {{c}}개 (건너뜀 {{s}})', { c: (r.created || []).length, s: (r.skipped || []).length })); load(); }
    catch (e) { flash('⚠ ' + e.message); }
    setBusy(false);
  };

  const mgrCandidates = members.filter(m => m.team_role !== 'member' || true); // 전 멤버(매니저 승격 가능)
  const statusLabel = (s) => ({ active: t('teamMembers.stActive', '활성'), disabled: t('teamMembers.stDisabled', '비활성'), archived: t('teamMembers.stArchived', '보관') }[s] || s);

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>🏢 {t('teamMembers.teamsTitle', '팀 목록')} ({teams.length})</div>
        {canManage && (
          <div style={{ display: 'flex', gap: 8 }}>
            {!teams.length && <button onClick={seedOrg} disabled={busy} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #c7d2fe', background: 'rgba(79,70,229,0.06)', color: '#4f46e5', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>🏗️ {t('teamMembers.seedOrg', '표준 조직 구조 생성')}</button>}
            <button onClick={startNew} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ {t('teamMembers.addTeam', '팀 추가')}</button>
          </div>
        )}
      </div>

      {editing && canManage && (
        <div style={{ border: '1px solid #c7d2fe', background: 'rgba(79,70,229,0.04)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>{editing.id ? t('teamMembers.editTeam', '팀 수정') : t('teamMembers.newTeam', '새 팀')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
            <input style={input} placeholder={t('teamMembers.phTeamName', '팀 이름')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <select style={input} value={form.team_type} onChange={e => setForm(f => ({ ...f, team_type: e.target.value }))}>
              {TEAM_TYPES.map(tp => <option key={tp} value={tp}>{typeLabel(t, tp)}</option>)}
            </select>
            <select style={input} value={form.manager_user_id} onChange={e => setForm(f => ({ ...f, manager_user_id: e.target.value }))}>
              <option value="">{t('teamMembers.phManager', '팀관리자 지정 (선택)')}</option>
              {mgrCandidates.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
            </select>
            {editing.id && (
              <select style={input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">{statusLabel('active')}</option>
                <option value="disabled">{statusLabel('disabled')}</option>
                <option value="archived">{statusLabel('archived')}</option>
              </select>
            )}
          </div>
          <textarea style={{ ...input, width: '100%', boxSizing: 'border-box', marginTop: 10, minHeight: 56, resize: 'vertical' }} placeholder={t('teamMembers.phTeamDesc', '팀 설명 (선택)')} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={busy} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: busy ? '#94a3b8' : '#16a34a', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>{busy ? t('teamMembers.processing', '처리 중…') : t('teamMembers.save', '저장')}</button>
            <button onClick={() => setEditing(null)} style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid #cbd5e1', background: 'transparent', color: 'var(--text-2,#475569)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{t('teamMembers.cancel', '취소')}</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: '#64748b', fontSize: 13 }}>{t('teamMembers.loading', '불러오는 중…')}</div> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {teams.map(tm => (
            <div key={tm.id} style={{ border: '1px solid var(--border,#e5e7eb)', borderRadius: 11, padding: '13px 16px', opacity: tm.status === 'archived' ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{tm.name}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#6366f118', color: '#6366f1' }}>{typeLabel(t, tm.team_type)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: (STATUS_COLOR[tm.status] || '#94a3b8') + '1a', color: STATUS_COLOR[tm.status] || '#94a3b8' }}>{statusLabel(tm.status)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3,#64748b)', marginTop: 4 }}>
                    {tm.description || '—'} · 👤 {t('teamMembers.colManager', '관리자')}: {tm.manager_name || '—'} · 👥 {tm.member_count || 0} · 🔐 {tm.permission_count || 0}
                  </div>
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => startEdit(tm)} style={btnGhost}>{t('teamMembers.edit', '수정')}</button>
                    {tm.status === 'archived'
                      ? <button onClick={() => restore(tm)} style={{ ...btnGhost, color: '#16a34a', borderColor: '#bbf7d0' }}>{t('teamMembers.restore', '복구')}</button>
                      : <button onClick={() => archive(tm)} style={{ ...btnGhost, color: '#f59e0b', borderColor: '#fde68a' }}>{t('teamMembers.archive', '비활성')}</button>}
                    <button onClick={() => hardDelete(tm)} style={{ ...btnGhost, color: '#ef4444', borderColor: '#fecaca' }}>{t('teamMembers.hardDelete', '영구삭제')}</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!teams.length && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('teamMembers.noTeams', '등록된 팀이 없습니다. ‘팀 추가’로 시작하세요.')}</div>}
        </div>
      )}
    </div>
  );
}
const btnGhost = { fontSize: 11.5, padding: '5px 11px', borderRadius: 7, border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: 'var(--text-2,#475569)', fontWeight: 600 };

/* ═══════════════════ 권한 매트릭스 패널 ═══════════════════ */
const GROUP_LABEL = { core: '핵심', marketing: '마케팅', commerce: '커머스', sales: '영업', ops: '운영·물류', finance: '재무', data: '데이터', partner: '파트너', admin: '관리' };
const ACTION_LABEL = { view: '조회', create: '생성', update: '수정', delete: '삭제', approve: '승인', export: '내보내기', execute: '실행', manage: '관리' };
function MatrixPanel({ t, canManage, isOwnerAdmin, flash }) {
  const [subjectType, setSubjectType] = useState('team'); // team | member
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [perms, setPerms] = useState({});           // menu_key -> [actions]
  const [scope, setScope] = useState({ scope_type: 'own', values: [] });
  const [assignable, setAssignable] = useState(null); // null=무제한, {} map
  const [effective, setEffective] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await teamApi.listTeams(); setTeams((r.teams || []).filter(x => x.status !== 'archived')); } catch { setTeams([]); }
      if (IS_DEMO) setMembers(demoLoad().filter(m => m.team_role !== 'owner'));
      else { try { const r = await fetch(`${API}/auth/team/members`, { headers: authHeaders() }); const d = await r.json(); setMembers((d.ok ? d.members : []).filter(m => m.team_role !== 'owner')); } catch { setMembers([]); } }
    })();
  }, []);

  const loadSubject = useCallback(async (type, id) => {
    if (!id) { setPerms({}); setScope({ scope_type: 'own', values: [] }); setAssignable(null); setEffective(null); return; }
    setLoading(true);
    try {
      if (type === 'team') {
        const d = await teamApi.getTeamPermissions(id);
        setPerms(d.menus || {}); setScope(d.scope || { scope_type: 'team', values: [] }); setAssignable(null); setEffective(null);
      } else {
        const d = await teamApi.getMemberPermissions(id);
        setPerms(d.explicit || {}); setScope(d.scope || { scope_type: 'own', values: [] });
        setAssignable(d.assignable === undefined ? null : d.assignable);
        setEffective(d.effective || null);
      }
    } catch (e) { flash('⚠ ' + e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { loadSubject(subjectType, subjectId); }, [subjectType, subjectId, loadSubject]);

  // 매트릭스가 팀이면 owner/admin 만 편집, 멤버면 owner/manager 편집(상한 내).
  const editable = subjectType === 'team' ? isOwnerAdmin : canManage;
  // 셀 활성 여부: 멤버 + manager(assignable!=null) 일 때 상한 초과 동작 비활성.
  const cellAllowed = (menu, action) => {
    if (subjectType === 'team') return true;          // 팀 권한은 owner 가 전권
    if (assignable === null) return true;             // owner/admin → 무제한
    return actionsCover(assignable[menu] || [], action);
  };

  const toggle = (menu, action) => {
    if (!editable || !cellAllowed(menu, action)) return;
    setPerms(prev => {
      const cur = new Set(prev[menu] || []);
      if (action === 'view') {
        if (cur.has('view')) return { ...prev, [menu]: [] };      // view 해제 → 전체 해제
        return { ...prev, [menu]: ['view'] };
      }
      if (cur.has(action)) cur.delete(action);
      else { cur.add(action); cur.add('view'); }                   // 동작 부여 시 view 자동
      const arr = normActions([...cur]);
      const next = { ...prev };
      if (arr.length) next[menu] = arr; else delete next[menu];
      return next;
    });
  };
  const toggleRowAll = (menu) => {
    if (!editable) return;
    setPerms(prev => {
      const allowed = ACTIONS.filter(a => cellAllowed(menu, a));
      const cur = prev[menu] || [];
      const full = allowed.every(a => cur.includes(a));
      const next = { ...prev };
      if (full) delete next[menu]; else next[menu] = normActions(allowed);
      return next;
    });
  };

  const save = async () => {
    if (!subjectId) { flash(t('teamPerms.errNoSubject', '대상을 먼저 선택하세요.')); return; }
    setBusy(true);
    try {
      const body = { menus: perms, scope };
      if (subjectType === 'team') await teamApi.putTeamPermissions(subjectId, body);
      else await teamApi.putMemberPermissions(subjectId, body);
      flash(t('teamPerms.okSaved', '✅ 권한이 저장되었습니다.'));
      loadSubject(subjectType, subjectId);
    } catch (e) { flash('⚠ ' + e.message); }
    setBusy(false);
  };

  const grouped = MENU_CATALOG.reduce((acc, m) => { (acc[m.group] = acc[m.group] || []).push(m); return acc; }, {});
  const effectiveMenus = effective ? Object.keys(effective.menus || {}) : Object.keys(perms);

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 4, border: '1px solid var(--border,#e5e7eb)', borderRadius: 9, padding: 3 }}>
          {['team', 'member'].map(ty => (
            <button key={ty} onClick={() => { setSubjectType(ty); setSubjectId(''); }} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: subjectType === ty ? '#4f46e5' : 'transparent', color: subjectType === ty ? '#fff' : 'var(--text-2,#475569)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
              {ty === 'team' ? t('teamPerms.subjTeam', '팀 권한') : t('teamPerms.subjMember', '팀원 권한')}
            </button>
          ))}
        </div>
        <select style={{ ...input, minWidth: 220 }} value={subjectId} onChange={e => setSubjectId(e.target.value)}>
          <option value="">{subjectType === 'team' ? t('teamPerms.pickTeam', '팀 선택…') : t('teamPerms.pickMember', '팀원 선택…')}</option>
          {(subjectType === 'team' ? teams : members).map(x => <option key={x.id} value={x.id}>{x.name}{subjectType === 'member' ? ` (${x.email})` : ''}</option>)}
        </select>
        {subjectType === 'member' && assignable !== null && <span style={{ fontSize: 11.5, color: '#f59e0b', fontWeight: 600 }}>ℹ️ {t('teamPerms.delegateNote', '팀관리자는 본인 권한 범위 내에서만 부여할 수 있습니다 (회색 = 부여 불가).')}</span>}
      </div>

      {!subjectId ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('teamPerms.selectPrompt', '대상을 선택하면 메뉴×동작 권한 매트릭스가 표시됩니다.')}</div>
      ) : loading ? <div style={{ color: '#64748b', fontSize: 13 }}>{t('teamMembers.loading', '불러오는 중…')}</div> : (
        <>
          {/* 데이터 접근 범위 */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, padding: '10px 14px', background: 'var(--bg,#f8fafc)', borderRadius: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>📊 {t('teamPerms.dataScope', '데이터 접근 범위')}:</span>
            <select style={{ ...input, padding: '6px 10px' }} disabled={!editable} value={scope.scope_type} onChange={e => setScope(s => ({ ...s, scope_type: e.target.value }))}>
              {DATA_SCOPES.map(ds => <option key={ds} value={ds}>{t('teamPerms.scope_' + ds, scopeLabel(ds))}</option>)}
            </select>
            {!['company', 'own'].includes(scope.scope_type) && (
              <input style={{ ...input, minWidth: 240, padding: '6px 10px' }} disabled={!editable} placeholder={t('teamPerms.scopeValuesPh', '대상 ID (쉼표 구분, 예: brand_a, brand_b)')}
                value={(scope.values || []).join(', ')} onChange={e => setScope(s => ({ ...s, values: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }))} />
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '2px solid var(--border,#e5e7eb)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', position: 'sticky', left: 0 }}>{t('teamPerms.colMenu', '메뉴')}</th>
                  {ACTIONS.map(a => <th key={a} style={{ padding: '8px 6px', textAlign: 'center', minWidth: 56 }}>{t('teamPerms.act_' + a, ACTION_LABEL[a])}</th>)}
                  {editable && <th style={{ padding: '8px 6px', textAlign: 'center' }}>{t('teamPerms.all', '전체')}</th>}
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([g, items]) => (
                  <React.Fragment key={g}>
                    <tr><td colSpan={ACTIONS.length + 2} style={{ padding: '8px 10px 3px', fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>{t('teamPerms.grp_' + g, GROUP_LABEL[g] || g)}</td></tr>
                    {items.map(m => (
                      <tr key={m.key} style={{ borderBottom: '1px solid var(--border,#f1f5f9)' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 600 }}>{m.ko}</td>
                        {ACTIONS.map(a => {
                          const on = (perms[m.key] || []).includes(a) || (a !== 'view' && (perms[m.key] || []).includes('manage'));
                          const allow = cellAllowed(m.key, a);
                          return (
                            <td key={a} style={{ padding: '5px 6px', textAlign: 'center' }}>
                              <input type="checkbox" checked={!!on} disabled={!editable || !allow}
                                onChange={() => toggle(m.key, a)}
                                style={{ width: 16, height: 16, cursor: editable && allow ? 'pointer' : 'not-allowed', accentColor: '#4f46e5', opacity: allow ? 1 : 0.3 }} />
                            </td>
                          );
                        })}
                        {editable && <td style={{ padding: '5px 6px', textAlign: 'center' }}><button onClick={() => toggleRowAll(m.key)} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>±</button></td>}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* 미리보기 + 저장 */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3,#64748b)', maxWidth: 620 }}>
              <b>👁 {t('teamPerms.preview', '접근 가능 메뉴 미리보기')}:</b>{' '}
              {effectiveMenus.length ? effectiveMenus.map(k => (MENU_CATALOG.find(m => m.key === k) || {}).ko || k).join(', ') : t('teamPerms.noAccess', '(없음)')}
            </div>
            {editable && <button onClick={save} disabled={busy} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: busy ? '#94a3b8' : '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>{busy ? t('teamMembers.processing', '처리 중…') : t('teamPerms.savePerms', '권한 저장')}</button>}
          </div>
        </>
      )}
    </div>
  );
}
/* ─── [245차 P2-3] 엔터프라이즈 SSO(OIDC/SAML) + SCIM 2.0 설정 패널 ─── */
function SSOPanel({ t, flash }) {
  const [cfg, setCfg] = useState(null);     // 폼 값
  const [sp, setSp] = useState({});         // SP(서비스공급자) URL 정보
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scimTok, setScimTok] = useState(null);
  const [groupRoles, setGroupRoles] = useState([]); // [282차 R3] IdP 그룹→역할 매핑(SCIM/SSO 그룹 기반 자동 역할부여)
  const [grSaving, setGrSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await getJsonAuth('/api/v430/sso/config');
      setSp(r?.sp || {});
      setCfg(r?.config || { protocol: 'oidc', enabled: 0, oidc_scopes: 'openid email profile', default_role: 'member', auto_provision: 1, scim_enabled: 0 });
    } catch (e) { setCfg({ protocol: 'oidc', enabled: 0, oidc_scopes: 'openid email profile', default_role: 'member', auto_provision: 1, scim_enabled: 0 }); }
    try { const g = await getJsonAuth('/api/v430/sso/group-roles'); setGroupRoles(Array.isArray(g?.mappings) ? g.mappings : []); } catch { setGroupRoles([]); }
    setLoaded(true);
  }, []);
  const saveGroupRoles = async () => {
    setGrSaving(true);
    try {
      const maps = groupRoles.map(m => ({ group_name: (m.group_name || '').trim(), role: m.role === 'manager' ? 'manager' : 'member' })).filter(m => m.group_name);
      const r = await putJson('/api/v430/sso/group-roles', { mappings: maps });
      if (r?.ok) flash(t('teamMembers.grSaved', 'IdP 그룹 역할 매핑이 저장되었습니다.')); else flash(r?.error || '저장 실패');
    } catch (e) { flash('저장 실패: ' + (e?.message || '')); } finally { setGrSaving(false); }
  };
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  const save = async () => {
    setSaving(true);
    try { const r = await putJson('/api/v430/sso/config', cfg); if (r?.ok) { flash(t('teamMembers.ssoSaved', 'SSO 설정이 저장되었습니다.')); load(); } else flash(r?.error || '저장 실패'); }
    catch (e) { flash('저장 실패: ' + (e?.message || '')); }
    setSaving(false);
  };
  const rotateScim = async () => {
    try { const r = await postJsonAuth('/api/v430/sso/scim-token', {}); if (r?.scim_token) { setScimTok(r.scim_token); load(); } else flash(r?.error || '발급 실패'); }
    catch (e) { flash('발급 실패: ' + (e?.message || '')); }
  };
  if (!loaded) return <div style={{ padding: 20, color: '#94a3b8' }}>⏳</div>;

  const card = { background: 'rgba(255,255,255,0.85)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 14, padding: 18, marginBottom: 14 };
  const inp = { width: '100%', padding: '8px 11px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 12.5, boxSizing: 'border-box', color: '#1e293b', background: '#fff' };
  const lbl = { fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, display: 'block' };
  const field = (k, label, type = 'text') => (
    <div style={{ marginBottom: 10 }}><label style={lbl}>{label}</label><input type={type} style={inp} value={cfg[k] || ''} onChange={e => set(k, e.target.value)} /></div>
  );
  const copyRow = (label, val) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11.5 }}>
      <span style={{ minWidth: 130, color: '#64748b', fontWeight: 600 }}>{label}</span>
      <code style={{ flex: 1, background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>{val || '—'}</code>
      <button onClick={() => { try { navigator.clipboard.writeText(val || ''); flash(t('teamMembers.copied', '복사됨')); } catch (e) {} }} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', fontSize: 11, cursor: 'pointer' }}>{t('teamMembers.copy', '복사')}</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 14, lineHeight: 1.7 }}>
        🔑 {t('teamMembers.ssoIntro', 'Okta·Azure AD·Google·Auth0 등 IdP와 SSO(OIDC/SAML)로 연결하고, SCIM 2.0으로 사용자 자동 프로비저닝/회수를 구성합니다. 자격증명 등록 후 활성화하면 즉시 적용됩니다.')}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>📍 {t('teamMembers.ssoSpInfo', 'IdP에 등록할 서비스 공급자(SP) 정보')}</div>
        {copyRow('OIDC Redirect URI', sp.oidc_redirect_uri)}
        {copyRow('SAML ACS URL', sp.acs_url)}
        {copyRow('SAML Metadata', sp.metadata_url)}
        {copyRow('SCIM Base URL', sp.scim_base_url)}
        {cfg.login_url && copyRow(t('teamMembers.ssoLoginUrl', 'SSO 로그인 URL'), cfg.login_url)}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={lbl}>{t('teamMembers.ssoProtocol', '프로토콜')}</label>
            <select style={{ ...inp, width: 140 }} value={cfg.protocol || 'oidc'} onChange={e => set('protocol', e.target.value)}>
              <option value="oidc">OIDC (권장)</option><option value="saml">SAML 2.0</option>
            </select>
          </div>
          <div><label style={lbl}>{t('teamMembers.ssoSlug', '로그인 슬러그')}</label><input style={{ ...inp, width: 160 }} value={cfg.slug || ''} onChange={e => set('slug', e.target.value)} placeholder="company" /></div>
          <div><label style={lbl}>{t('teamMembers.ssoDomain', '이메일 도메인')}</label><input style={{ ...inp, width: 180 }} value={cfg.domain || ''} onChange={e => set('domain', e.target.value)} placeholder="company.com" /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, marginTop: 16 }}>
            <input type="checkbox" checked={!!Number(cfg.enabled)} onChange={e => set('enabled', e.target.checked ? 1 : 0)} />{t('teamMembers.ssoEnable', 'SSO 활성화')}
          </label>
        </div>

        {cfg.protocol === 'saml' ? (
          <>
            {field('saml_idp_entity_id', 'IdP Entity ID')}
            {field('saml_idp_sso_url', 'IdP SSO URL')}
            <div style={{ marginBottom: 10 }}><label style={lbl}>IdP X.509 Certificate (PEM/base64)</label><textarea style={{ ...inp, minHeight: 80, fontFamily: 'monospace', fontSize: 11 }} value={cfg.saml_idp_cert || ''} onChange={e => set('saml_idp_cert', e.target.value)} placeholder="MIID... (저장 후 ••••로 마스킹)" /></div>
          </>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {field('oidc_issuer', 'Issuer')}
            {field('oidc_client_id', 'Client ID')}
            {field('oidc_client_secret', 'Client Secret', 'password')}
            {field('oidc_scopes', 'Scopes')}
            {field('oidc_authorize_url', 'Authorize URL')}
            {field('oidc_token_url', 'Token URL')}
            {field('oidc_jwks_url', 'JWKS URL')}
            {field('oidc_userinfo_url', 'UserInfo URL')}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 6 }}>
          {field('email_attr', t('teamMembers.ssoEmailAttr', '이메일 속성(SAML)'))}
          {field('name_attr', t('teamMembers.ssoNameAttr', '이름 속성(SAML)'))}
          <div style={{ marginBottom: 10 }}><label style={lbl}>{t('teamMembers.ssoDefaultRole', '기본 역할')}</label>
            <select style={inp} value={cfg.default_role || 'member'} onChange={e => set('default_role', e.target.value)}><option value="member">member</option><option value="manager">manager</option></select>
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, margin: '4px 0 12px' }}>
          <input type="checkbox" checked={!!Number(cfg.auto_provision ?? 1)} onChange={e => set('auto_provision', e.target.checked ? 1 : 0)} />{t('teamMembers.ssoAutoProvision', '자동 프로비저닝 (최초 로그인 시 사용자 자동 생성)')}
        </label>
        <button onClick={save} disabled={saving} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{saving ? '⏳' : '💾'} {t('teamMembers.ssoSave', 'SSO 설정 저장')}</button>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>🔄 SCIM 2.0 {t('teamMembers.ssoScimProvision', '자동 프로비저닝')}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{t('teamMembers.ssoScimDesc', 'IdP가 SCIM Base URL + 아래 토큰으로 사용자 생성/수정/비활성을 자동 동기화합니다.')} {cfg.scim_enabled ? <b style={{ color: '#16a34a' }}>● 활성</b> : <span style={{ color: '#94a3b8' }}>비활성</span>}</div>
          </div>
          <button onClick={rotateScim} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0ea5a3', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>🔑 {t('teamMembers.ssoScimRotate', 'SCIM 토큰 발급/재발급')}</button>
        </div>
        {scimTok && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: '#0f172a' }}>
            <div style={{ fontSize: 11, color: '#fca5a5', marginBottom: 6 }}>⚠️ {t('teamMembers.ssoScimWarn', '이 토큰은 다시 표시되지 않습니다. IdP의 SCIM 설정에 즉시 저장하세요.')}</div>
            <code style={{ fontSize: 12, color: '#e2e8f0', wordBreak: 'break-all' }}>{scimTok}</code>
          </div>
        )}
      </div>

      {/* [282차 R3] IdP 그룹 → 역할 매핑 — 백엔드(roleForGroups)는 완성돼 있으나 writer UI 부재로 end-to-end 불능이던 것 배선.
          Okta/Entra 등 IdP 그룹 소속에 따라 로그인 시 자동으로 역할(manager/member) 부여. 미매칭 그룹은 기본역할(default_role) 사용. */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>👥 {t('teamMembers.grTitle', 'IdP 그룹 → 역할 매핑')}</div>
        <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 12 }}>{t('teamMembers.grDesc', 'IdP(Okta·Entra 등) 그룹명과 부여할 역할을 지정하면, SSO/SCIM 로그인 시 그룹 소속에 따라 자동으로 역할이 부여됩니다. 매칭되는 그룹이 없으면 기본 역할이 적용됩니다.')}</div>
        {groupRoles.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input style={{ ...inp, flex: 1 }} placeholder={t('teamMembers.grGroupPh', 'IdP 그룹명 (예: geniego-managers)')} value={m.group_name || ''}
              onChange={e => setGroupRoles(a => a.map((x, j) => j === i ? { ...x, group_name: e.target.value } : x))} />
            <select style={{ ...inp, width: 130 }} value={m.role === 'manager' ? 'manager' : 'member'}
              onChange={e => setGroupRoles(a => a.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}>
              <option value="member">member</option><option value="manager">manager</option>
            </select>
            <button onClick={() => setGroupRoles(a => a.filter((_, j) => j !== i))} title={t('teamMembers.grRemove', '삭제')}
              style={{ padding: '7px 11px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button onClick={() => setGroupRoles(a => [...a, { group_name: '', role: 'member' }])}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px dashed #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>+ {t('teamMembers.grAdd', '그룹 매핑 추가')}</button>
          <button onClick={saveGroupRoles} disabled={grSaving}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#4f8ef7', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12, opacity: grSaving ? 0.6 : 1 }}>💾 {t('teamMembers.grSave', '매핑 저장')}</button>
        </div>
      </div>
    </div>
  );
}

function scopeLabel(ds) {
  return { company: '전체 회사', brand: '특정 브랜드', team: '특정 팀', campaign: '특정 캠페인', product: '특정 상품', channel: '특정 채널', warehouse: '특정 창고', partner: '특정 파트너', own: '본인 담당만' }[ds] || ds;
}

/* ═══════════════════ 감사 로그 패널 ═══════════════════ */
function AuditPanel({ t, flash }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => { setLoading(true); try { const d = await teamApi.getTeamAudit(); setLogs(d.logs || []); } catch (e) { flash('⚠ ' + e.message); } setLoading(false); })();
  }, []);
  const RISK_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#16a34a' };
  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🧾 {t('teamMembers.auditTitle', '팀·권한 변경 감사 로그')} ({logs.length})</div>
      {loading ? <div style={{ color: '#64748b', fontSize: 13 }}>{t('teamMembers.loading', '불러오는 중…')}</div> : !logs.length ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('teamMembers.noAudit', '기록된 감사 이벤트가 없습니다.')}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
              <th style={{ padding: '8px 10px' }}>{t('teamMembers.auditTime', '시각')}</th>
              <th style={{ padding: '8px 10px' }}>{t('teamMembers.auditActor', '행위자')}</th>
              <th style={{ padding: '8px 10px' }}>{t('teamMembers.auditAction', '동작')}</th>
              <th style={{ padding: '8px 10px' }}>{t('teamMembers.auditDetail', '상세')}</th>
              <th style={{ padding: '8px 10px' }}>{t('teamMembers.auditRisk', '위험도')}</th>
            </tr></thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border,#f1f5f9)' }}>
                  <td style={{ padding: '7px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{(l.at || '').replace('T', ' ').slice(0, 19)}</td>
                  <td style={{ padding: '7px 10px' }}>{l.actor || '—'}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 600 }}>{l.action}</td>
                  <td style={{ padding: '7px 10px', color: '#475569' }}>{l.detail}</td>
                  <td style={{ padding: '7px 10px' }}><span style={{ fontSize: 11, fontWeight: 700, color: RISK_COLOR[l.risk] || '#64748b' }}>{l.risk || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ 본인 보안 활동 로그 패널 (현 차수) ═══════════════════
 *  ★테넌트 격리: 백엔드 memberLogs 가 authedTenant(서버 도출)로만 스코프 조회.
 *  클라이언트는 어떤 tenant 파라미터도 보내지 않으므로 타 계정 로그 혼입이 구조적으로 불가.
 */
function MemberLogPanel({ t, flash }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  // [현 차수 보강3] 실시간 동기화 — syncTick 변경 시 재조회(append-only 로그 → 재조회만으로 충분).
  const { syncTick, triggerSync } = useGlobalData();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getJsonAuth('/api/v423/member-logs'); // 세션 Bearer · 테넌트 서버강제(본인 테넌트만)
      setLogs(Array.isArray(d?.logs) ? d.logs : []);
    } catch (e) { flash('⚠ ' + (e?.message || e)); setLogs([]); }
    setLoading(false);
  }, [flash]);
  useEffect(() => { load(); }, [load, syncTick]); // 마운트 + syncTick 변경 시 재조회
  const detailText = (det) => {
    if (!det || typeof det !== 'object') return '—';
    const parts = Object.entries(det).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    return parts.length ? parts.join(', ') : '—';
  };
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>🛡️ {t('memberLog.tabLog', '로그 기록')} ({logs.length})</div>
        <div style={{ flex: 1 }} />
        {/* [현 차수 보강3] 수동 새로고침(전 탭 동기화 트리거 겸용) */}
        <button onClick={() => { triggerSync(); load(); }} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #cbd5e1', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#fff', color: '#475569' }}>
          🔄 {t('memberLog.refresh', '새로고침')}
        </button>
      </div>
      {loading ? <div style={{ color: '#64748b', fontSize: 13 }}>{t('teamMembers.loading', '불러오는 중…')}</div> : !logs.length ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('memberLog.empty', '기록 없음')}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
              <th style={{ padding: '8px 10px' }}>{t('memberLog.time', '시각')}</th>
              <th style={{ padding: '8px 10px' }}>{t('memberLog.user', '사용자')}</th>
              <th style={{ padding: '8px 10px' }}>{t('memberLog.action', '동작')}</th>
              <th style={{ padding: '8px 10px' }}>{t('memberLog.ipAddr', 'IP')}</th>
              <th style={{ padding: '8px 10px' }}>{t('memberLog.detail', '상세')}</th>
            </tr></thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id || i} style={{ borderBottom: '1px solid var(--border,#f1f5f9)' }}>
                  <td style={{ padding: '7px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{(l.created_at || '').replace('T', ' ').slice(0, 19)}</td>
                  <td style={{ padding: '7px 10px' }}>{l.actor || '—'}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 600 }}>{l.action || '—'}</td>
                  <td style={{ padding: '7px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{l.ip_address || '—'}</td>
                  <td style={{ padding: '7px 10px', color: '#475569' }}>{detailText(l.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* 212차 #5: 파트너(매입처/물류처/창고처) 계정 — 멤버 구성원과 동일 화면에서 등록·관리. */
const PT_LABEL = { supplier: '매입처', logistics: '물류처', warehouse: '창고처' };
const ptLabel = (t, k) => t('teamPartner.pt' + (k ? k.charAt(0).toUpperCase() + k.slice(1) : ''), PT_LABEL[k] || k);
function PartnerSection({ t, flash, input }) {
  const [list, setList] = useState([]);
  const [sups, setSups] = useState([]); // [현 차수] 등록 거래처 datalist — "어떤 거래처" 선택해 계정 발급
  const [form, setForm] = useState({ partner_type: 'supplier', partner_name: '', login_id: '', password: '', photo: '' });
  const [busy, setBusy] = useState(false);
  const [pq, setPq] = useState('');
  const load = useCallback(async () => { try { const r = await wmsApi.listPartners(); setList(Array.isArray(r?.partners) ? r.partners : []); } catch { setList([]); } try { const s = await wmsApi.listSuppliers(); setSups(Array.isArray(s?.suppliers) ? s.suppliers : []); } catch {} }, []);
  useEffect(() => { load(); }, [load]);
  const filtered = list.filter(p => { const q = pq.trim().toLowerCase(); return !q || [p.partner_name, p.login_id, p.partner_type].some(v => String(v || '').toLowerCase().includes(q)); });
  const setPhoto = async (p, url) => { try { await wmsApi.updatePartner(p.id, { photo: url }); load(); } catch (e) { flash(String(e?.message || e)); } };
  const create = async () => {
    if (!form.partner_name || !form.login_id || form.password.length < 8) { flash(t('teamPartner.errRequired', '대상명·로그인 ID·8자 이상 비밀번호를 입력하세요.')); return; }
    setBusy(true);
    try { const r = await wmsApi.createPartner(form); if (r?.ok) { flash(t('teamPartner.okIssued', '파트너 계정이 발급되었습니다.')); setForm({ partner_type: 'supplier', partner_name: '', login_id: '', password: '', photo: '' }); load(); } else flash(r?.error || t('teamPartner.errIssue', '발급 실패')); }
    catch (e) { if (!handlePlanLimit(e)) flash(String(e?.message || e)); }
    setBusy(false);
  };
  const toggle = async (p) => { try { await wmsApi.updatePartner(p.id, { active: p.active ? 0 : 1 }); load(); } catch (e) { flash(String(e?.message || e)); } };
  const resetPw = async (p) => { const pw = window.prompt(t('teamPartner.promptNewPw', '새 비밀번호(8자 이상)')); if (!pw || pw.length < 8) return; try { await wmsApi.updatePartner(p.id, { password: pw }); flash(t('teamPartner.okPwReset', '비밀번호 재설정 완료')); } catch (e) { flash(String(e?.message || e)); } };
  const del = async (p) => { if (!window.confirm(t('teamPartner.confirmDelete', "'{name}' 파트너 계정을 삭제하시겠습니까?", { name: p.partner_name }).replace('{name}', p.partner_name))) return; try { await wmsApi.deletePartner(p.id); load(); } catch (e) { flash(String(e?.message || e)); } };
  const inp = input || { padding: '9px 11px', borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' };
  return (
    <div style={{ marginTop: 28, background: 'var(--card,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1,#0f172a)', marginBottom: 4 }}>🤝 {t('teamPartner.sectionTitle', '파트너 계정 (매입처 · 물류처 · 창고처)')}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3,#64748b)', marginBottom: 14 }}>{t('teamPartner.sectionDesc', '파트너에게 별도 로그인 ID를 발급합니다. 파트너는 /partner 포털로 접속해 공유된 본인 데이터(발주/출고/재고)만 등록·열람합니다. 발급 수는 구독 플랜 한도를 따릅니다.')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <AvatarField value={form.photo} name={form.partner_name} size={50} editable onChange={(url) => setForm(f => ({ ...f, photo: url }))} />
        <span style={{ fontSize: 12, color: 'var(--text-3,#94a3b8)' }}>{t('teamPartner.photoHint', '파트너 사진/로고 (선택) — 클릭하여 등록')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr)) auto', gap: 8, alignItems: 'end', marginBottom: 16 }}>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3,#64748b)' }}>{t('teamPartner.fieldType', '유형')}</label>
          <select value={form.partner_type} onChange={e => setForm(f => ({ ...f, partner_type: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}>
            <option value="supplier">{ptLabel(t, 'supplier')}</option><option value="logistics">{ptLabel(t, 'logistics')}</option><option value="warehouse">{ptLabel(t, 'warehouse')}</option>
          </select></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3,#64748b)' }}>{form.partner_type === 'warehouse' ? t('teamPartner.fieldWarehouseId', '창고 ID(번호)') : t('teamPartner.fieldTargetName', '대상명')}</label>
          <input value={form.partner_name} list="tm-sup-names" onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} placeholder={form.partner_type === 'supplier' ? t('teamPartner.phSupplier', '등록 거래처 선택/입력') : form.partner_type === 'logistics' ? t('teamPartner.phLogistics', '택배사명') : t('teamPartner.phWarehouse', '창고 ID')} />
          {form.partner_type === 'supplier' && <datalist id="tm-sup-names">{sups.map(s => <option key={s.id} value={s.name} />)}</datalist>}</div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3,#64748b)' }}>{t('teamPartner.fieldLoginId', '로그인 ID')}</label><input value={form.login_id} onChange={e => setForm(f => ({ ...f, login_id: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} placeholder="partner_id" /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3,#64748b)' }}>{t('teamPartner.fieldPassword', '비밀번호(8자+)')}</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} /></div>
        <button onClick={create} disabled={busy} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 800, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{t('teamPartner.issue', '발급')}</button>
      </div>
      {list.length > 0 && <input value={pq} onChange={e => setPq(e.target.value)} placeholder={'🔍 ' + t('teamPartner.searchPh', '파트너명·ID·유형 검색')} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />}
      <div style={{ display: 'grid', gap: 7 }}>
        {list.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('teamPartner.emptyList', '발급된 파트너 계정이 없습니다.')}</div>}
        {list.length > 0 && filtered.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('teamPartner.noMatch', '검색 결과가 없습니다.')}</div>}
        {filtered.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '9px 13px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', opacity: p.active ? 1 : 0.55 }}>
            <div style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AvatarField value={p.photo} name={p.partner_name} size={34} editable onChange={(url) => setPhoto(p, url)} />
              <span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#6366f118', color: '#6366f1' }}>{ptLabel(t, p.partner_type)}</span>
              <b style={{ marginLeft: 8 }}>{p.partner_name}</b><span style={{ color: '#64748b', marginLeft: 8 }}>ID: {p.login_id}</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => toggle(p)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: p.active ? '#ef4444' : '#16a34a' }}>{p.active ? t('teamPartner.deactivate', '비활성') : t('teamPartner.activate', '활성')}</button>
              <button onClick={() => resetPw(p)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: '#6366f1' }}>{t('teamPartner.resetPw', '비번재설정')}</button>
              <button onClick={() => del(p)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #fecaca', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>{t('teamPartner.del', '삭제')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
