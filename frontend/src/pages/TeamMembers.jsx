import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js'; // 181차 다국어
import { IS_DEMO } from '../utils/demoEnv';
import { tGetJSON, tSetJSON } from '../utils/tenantStorage.js';

/**
 * 멤버 구성원 — 팀/팀원 하위계정 관리 (180차 Phase2 · 181차 다국어).
 * ──────────────────────────────────────────────────────────────────────────
 * owner(본 계정)가 팀원 하위계정(ID/비번)을 등록·관리. 하위계정은 상위 owner 의
 * tenant_id 를 상속 → 동일 회원으로 인식되어 같은 데이터를 공유.
 *  - 운영: 백엔드 /auth/team/members (UserAuth) 연동.
 *  - 데모: 백엔드 없이 tenant 스코프 localStorage 로 시뮬레이션(체험용).
 *  - 권한: owner / manager 만 관리 가능.
 */

const API = import.meta.env.VITE_API_BASE || '';
const TOKEN_KEY = IS_DEMO ? 'demo_genie_token' : 'genie_token';
const DEMO_KEY = 'demo_team_members';

const ROLE_COLOR = { owner: '#7c3aed', manager: '#2563eb', member: '#0891b2' };

function authHeaders() {
  const t = localStorage.getItem(TOKEN_KEY) || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

/* ── 데모 시뮬레이션 (tenant 스코프 — 다른 체험자와 분리) ── */
function demoSeed() {
  return [
    { id: 'owner', email: 'owner@geniego.com', name: '대표 계정', team_role: 'owner', team_name: '본사', is_active: 1, created_at: '2026-01-02' },
    { id: 'tm_1', email: 'manager.kim@geniego.com', name: '김매니저', team_role: 'manager', team_name: '마케팅팀', is_active: 1, created_at: '2026-02-10' },
    { id: 'tm_2', email: 'staff.lee@geniego.com', name: '이담당', team_role: 'member', team_name: '마케팅팀', is_active: 1, created_at: '2026-03-05' },
    { id: 'tm_3', email: 'staff.park@geniego.com', name: '박담당', team_role: 'member', team_name: '커머스팀', is_active: 1, created_at: '2026-03-22' },
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

  const roleLabel = (r) => ({
    owner: t('teamMembers.roleOwner', 'Owner'),
    manager: t('teamMembers.roleManager', 'Manager'),
    member: t('teamMembers.roleMember', 'Member'),
  }[r] || r);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', team_role: 'member', team_name: '' });
  const [busy, setBusy] = useState(false);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(async () => {
    setLoading(true); setErr('');
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

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name) { flash(t('teamMembers.errRequired', 'Please enter email, password, and name.')); return; }
    if (form.password.length < 6) { flash(t('teamMembers.errPwLen', 'Password must be at least 6 characters.')); return; }
    setBusy(true);
    if (IS_DEMO) {
      const list = demoLoad();
      if (list.some(m => m.email.toLowerCase() === form.email.toLowerCase())) { flash(t('teamMembers.errDupEmail', 'This email is already registered.')); setBusy(false); return; }
      const next = [...list, { id: 'tm_' + Date.now(), email: form.email.toLowerCase(), name: form.name, team_role: form.team_role, team_name: form.team_name, is_active: 1, created_at: new Date().toISOString().slice(0, 10) }];
      demoSave(next); setMembers(next);
      setForm({ email: '', password: '', name: '', team_role: 'member', team_name: '' });
      flash(t('teamMembers.okCreatedDemo', '✅ Team member added (demo).')); setBusy(false); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      const d = await r.json();
      if (d.ok) { setForm({ email: '', password: '', name: '', team_role: 'member', team_name: '' }); flash(t('teamMembers.okCreated', '✅ Team member sub-account created.')); load(); }
      else flash('⚠ ' + (d.error || t('teamMembers.errCreate', 'Creation failed')));
    } catch (e) { flash(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
    setBusy(false);
  };

  const onToggleActive = async (m) => {
    if (m.team_role === 'owner') return;
    if (IS_DEMO) {
      const next = demoLoad().map(x => x.id === m.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x);
      demoSave(next); setMembers(next); flash(t('teamMembers.okStatusDemo', 'Status changed (demo)')); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_active: m.is_active ? 0 : 1 }) });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || t('teamMembers.errFail', 'Failed')));
    } catch (e) { flash(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
  };

  const onDelete = async (m) => {
    if (m.team_role === 'owner') return;
    if (!window.confirm(t('teamMembers.confirmDelete', "Deactivate (delete) the sub-account '{{name}} ({{email}})'?", { name: m.name, email: m.email }))) return;
    if (IS_DEMO) {
      const next = demoLoad().filter(x => x.id !== m.id);
      demoSave(next); setMembers(next); flash(t('teamMembers.okDeletedDemo', 'Deleted (demo)')); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || t('teamMembers.errFail', 'Failed')));
    } catch (e) { flash(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
  };

  const onRoleChange = async (m, role) => {
    if (m.team_role === 'owner') return;
    if (IS_DEMO) {
      const next = demoLoad().map(x => x.id === m.id ? { ...x, team_role: role } : x);
      demoSave(next); setMembers(next); flash(t('teamMembers.okRoleDemo', 'Role changed (demo)')); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ team_role: role }) });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || t('teamMembers.errFail', 'Failed')));
    } catch (e) { flash(t('teamMembers.errNetwork', 'Network error') + ': ' + e.message); }
  };

  const card = { background: 'var(--surface,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 14, padding: 20 };
  const input = { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border,#cbd5e1)', fontSize: 13, background: 'var(--bg,#fff)', color: 'var(--text-1,#1e293b)' };

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#1e293b)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 23, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>👥 {t('teamMembers.title', 'Team Members')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3,#64748b)', marginTop: 5 }}>
          {t('teamMembers.desc', 'Register and manage team and member sub-accounts. Sub-accounts are recognized as the same company (account) and share the same data, fully isolated from other company accounts.')}
          {IS_DEMO && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>· 🧪 {t('teamMembers.demoBadge', 'Demo (simulation)')}</span>}
        </div>
      </div>

      {/* 183차 Phase3: 읽기전용 멤버 안내 배너 */}
      {!canManage && (
        <div style={{ ...card, marginBottom: 18, borderColor: '#fde68a', background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔒</span>
          <span style={{ fontSize: 13, color: 'var(--text-2,#475569)', fontWeight: 600 }}>
            {t('teamMembers.readOnlyBanner', '읽기 전용 멤버 계정입니다 — 팀원 관리는 관리자(owner) 또는 매니저만 가능합니다.')}
          </span>
        </div>
      )}

      {/* 등록 폼 */}
      {canManage && (
        <form onSubmit={onCreate} style={{ ...card, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>➕ {t('teamMembers.formTitle', 'Register team member sub-account')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
            <input style={input} type="email" placeholder={t('teamMembers.phEmail', 'Email (login ID)')} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input style={input} type="password" placeholder={t('teamMembers.phPassword', 'Password (6+)')} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <input style={input} placeholder={t('teamMembers.phName', 'Name')} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={input} placeholder={t('teamMembers.phTeam', 'Team name (optional)')} value={form.team_name} onChange={e => setForm(f => ({ ...f, team_name: e.target.value }))} />
            <select style={input} value={form.team_role} onChange={e => setForm(f => ({ ...f, team_role: e.target.value }))}>
              <option value="member">{t('teamMembers.roleMember', 'Member')}</option>
              <option value="manager">{t('teamMembers.roleManager', 'Manager')}</option>
            </select>
          </div>
          <button type="submit" disabled={busy} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 9, border: 'none', background: busy ? '#94a3b8' : '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
            {busy ? t('teamMembers.processing', 'Processing…') : t('teamMembers.createAccount', 'Create sub-account')}
          </button>
        </form>
      )}

      {/* 구성원 목록 */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t('teamMembers.listTitle', 'Member list')} ({members.length})</div>
        {err && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>}
        {loading ? <div style={{ color: '#64748b', fontSize: 13 }}>{t('teamMembers.loading', 'Loading…')}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colName', 'Name')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colEmail', 'Email (ID)')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colTeam', 'Team')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colRole', 'Role')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colStatus', 'Status')}</th>
                  <th style={{ padding: '8px 10px' }}>{t('teamMembers.colJoined', 'Joined')}</th>
                  {canManage && <th style={{ padding: '8px 10px' }}>{t('teamMembers.colManage', 'Manage')}</th>}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border,#f1f5f9)', opacity: m.is_active ? 1 : 0.5 }}>
                    <td style={{ padding: '9px 10px', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '9px 10px', color: '#475569' }}>{m.email}</td>
                    <td style={{ padding: '9px 10px' }}>{m.team_name || '—'}</td>
                    <td style={{ padding: '9px 10px' }}>
                      {(canManage && m.team_role !== 'owner') ? (
                        <select value={m.team_role} onChange={e => onRoleChange(m, e.target.value)} style={{ ...input, padding: '4px 8px', fontSize: 12 }}>
                          <option value="member">{t('teamMembers.roleMember', 'Member')}</option>
                          <option value="manager">{t('teamMembers.roleManager', 'Manager')}</option>
                        </select>
                      ) : (
                        <span style={{ color: ROLE_COLOR[m.team_role] || '#475569', fontWeight: 700 }}>{roleLabel(m.team_role)}</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: m.is_active ? '#16a34a' : '#94a3b8' }}>{m.is_active ? '● ' + t('teamMembers.active', 'Active') : '○ ' + t('teamMembers.inactive', 'Inactive')}</span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#94a3b8' }}>{(m.created_at || '').slice(0, 10)}</td>
                    {canManage && (
                      <td style={{ padding: '9px 10px' }}>
                        {m.team_role === 'owner' ? <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span> : (
                          <span style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => onToggleActive(m)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: 'var(--text-2,#475569)' }}>{m.is_active ? t('teamMembers.deactivate', 'Deactivate') : t('teamMembers.activate', 'Activate')}</button>
                            <button onClick={() => onDelete(m)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #fecaca', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>{t('teamMembers.delete', 'Delete')}</button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!members.length && <tr><td colSpan={canManage ? 7 : 6} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>{t('teamMembers.empty', 'No members registered.')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '11px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>}
    </div>
  );
}
