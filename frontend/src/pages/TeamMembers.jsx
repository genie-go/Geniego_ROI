import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { IS_DEMO } from '../utils/demoEnv';
import { tGetJSON, tSetJSON } from '../utils/tenantStorage.js';

/**
 * 멤버 구성원 — 팀/팀원 하위계정 관리 (180차 Phase2).
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

const ROLE_LABEL = { owner: '대표(Owner)', manager: '관리자(Manager)', member: '팀원(Member)' };
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
  const { user } = useAuth() || {};
  const callerRole = user?.team_role || 'owner';
  const canManage = IS_DEMO || ['owner', 'manager'].includes(callerRole) || user?.plan === 'admin';

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
      else setErr(d.error || '목록을 불러오지 못했습니다.');
    } catch (e) { setErr('네트워크 오류: ' + e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name) { flash('이메일·비밀번호·이름을 입력하세요.'); return; }
    if (form.password.length < 6) { flash('비밀번호는 6자 이상이어야 합니다.'); return; }
    setBusy(true);
    if (IS_DEMO) {
      const list = demoLoad();
      if (list.some(m => m.email.toLowerCase() === form.email.toLowerCase())) { flash('이미 등록된 이메일입니다.'); setBusy(false); return; }
      const next = [...list, { id: 'tm_' + Date.now(), email: form.email.toLowerCase(), name: form.name, team_role: form.team_role, team_name: form.team_name, is_active: 1, created_at: new Date().toISOString().slice(0, 10) }];
      demoSave(next); setMembers(next);
      setForm({ email: '', password: '', name: '', team_role: 'member', team_name: '' });
      flash('✅ 팀원이 추가되었습니다 (데모).'); setBusy(false); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
      const d = await r.json();
      if (d.ok) { setForm({ email: '', password: '', name: '', team_role: 'member', team_name: '' }); flash('✅ 팀원 하위계정이 생성되었습니다.'); load(); }
      else flash('⚠ ' + (d.error || '생성 실패'));
    } catch (e) { flash('네트워크 오류: ' + e.message); }
    setBusy(false);
  };

  const onToggleActive = async (m) => {
    if (m.team_role === 'owner') return;
    if (IS_DEMO) {
      const next = demoLoad().map(x => x.id === m.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x);
      demoSave(next); setMembers(next); flash('상태 변경됨 (데모)'); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_active: m.is_active ? 0 : 1 }) });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || '실패'));
    } catch (e) { flash('네트워크 오류: ' + e.message); }
  };

  const onDelete = async (m) => {
    if (m.team_role === 'owner') return;
    if (!window.confirm(`'${m.name}(${m.email})' 하위계정을 비활성(삭제)하시겠습니까?`)) return;
    if (IS_DEMO) {
      const next = demoLoad().filter(x => x.id !== m.id);
      demoSave(next); setMembers(next); flash('삭제됨 (데모)'); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || '실패'));
    } catch (e) { flash('네트워크 오류: ' + e.message); }
  };

  const onRoleChange = async (m, role) => {
    if (m.team_role === 'owner') return;
    if (IS_DEMO) {
      const next = demoLoad().map(x => x.id === m.id ? { ...x, team_role: role } : x);
      demoSave(next); setMembers(next); flash('역할 변경됨 (데모)'); return;
    }
    try {
      const r = await fetch(`${API}/auth/team/members/${m.id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ team_role: role }) });
      const d = await r.json(); d.ok ? load() : flash('⚠ ' + (d.error || '실패'));
    } catch (e) { flash('네트워크 오류: ' + e.message); }
  };

  const card = { background: 'var(--surface,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 14, padding: 20 };
  const input = { padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border,#cbd5e1)', fontSize: 13, background: 'var(--bg,#fff)', color: 'var(--text-1,#1e293b)' };

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#1e293b)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 23, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>👥 멤버 구성원</div>
        <div style={{ fontSize: 13, color: 'var(--text-3,#64748b)', marginTop: 5 }}>
          팀·팀원 하위계정을 등록·관리합니다. 하위계정은 <b>같은 회사(계정)</b>로 인식되어 동일한 데이터를 공유하며, 다른 회사 계정과는 완전히 분리됩니다.
          {IS_DEMO && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 700 }}>· 🧪 데모(시뮬레이션)</span>}
        </div>
      </div>

      {/* 등록 폼 */}
      {canManage && (
        <form onSubmit={onCreate} style={{ ...card, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>➕ 팀원 하위계정 등록</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
            <input style={input} type="email" placeholder="이메일 (로그인 ID)" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input style={input} type="password" placeholder="비밀번호 (6자+)" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <input style={input} placeholder="이름" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input style={input} placeholder="팀명 (선택)" value={form.team_name} onChange={e => setForm(f => ({ ...f, team_name: e.target.value }))} />
            <select style={input} value={form.team_role} onChange={e => setForm(f => ({ ...f, team_role: e.target.value }))}>
              <option value="member">팀원(Member)</option>
              <option value="manager">관리자(Manager)</option>
            </select>
          </div>
          <button type="submit" disabled={busy} style={{ marginTop: 12, padding: '10px 20px', borderRadius: 9, border: 'none', background: busy ? '#94a3b8' : '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: busy ? 'default' : 'pointer' }}>
            {busy ? '처리 중…' : '하위계정 생성'}
          </button>
        </form>
      )}

      {/* 구성원 목록 */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>구성원 목록 ({members.length})</div>
        {err && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>}
        {loading ? <div style={{ color: '#64748b', fontSize: 13 }}>불러오는 중…</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
                  <th style={{ padding: '8px 10px' }}>이름</th>
                  <th style={{ padding: '8px 10px' }}>이메일 (ID)</th>
                  <th style={{ padding: '8px 10px' }}>팀</th>
                  <th style={{ padding: '8px 10px' }}>역할</th>
                  <th style={{ padding: '8px 10px' }}>상태</th>
                  <th style={{ padding: '8px 10px' }}>가입일</th>
                  {canManage && <th style={{ padding: '8px 10px' }}>관리</th>}
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
                          <option value="member">팀원</option>
                          <option value="manager">관리자</option>
                        </select>
                      ) : (
                        <span style={{ color: ROLE_COLOR[m.team_role] || '#475569', fontWeight: 700 }}>{ROLE_LABEL[m.team_role] || m.team_role}</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: m.is_active ? '#16a34a' : '#94a3b8' }}>{m.is_active ? '● 활성' : '○ 비활성'}</span>
                    </td>
                    <td style={{ padding: '9px 10px', color: '#94a3b8' }}>{(m.created_at || '').slice(0, 10)}</td>
                    {canManage && (
                      <td style={{ padding: '9px 10px' }}>
                        {m.team_role === 'owner' ? <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span> : (
                          <span style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => onToggleActive(m)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer', color: 'var(--text-2,#475569)' }}>{m.is_active ? '비활성' : '활성'}</button>
                            <button onClick={() => onDelete(m)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid #fecaca', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}>삭제</button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!members.length && <tr><td colSpan={canManage ? 7 : 6} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>등록된 구성원이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '11px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>}
    </div>
  );
}
