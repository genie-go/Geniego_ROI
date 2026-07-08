import React, { useState, useMemo, useEffect } from "react";
import { localizeDeep as _dloc } from "../utils/demoUiLocalize.js";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { tGetJSON, tSetJSON } from '../utils/tenantStorage.js';
import PushOptIn from '../components/PushOptIn.jsx'; // [246차 P3] 웹 푸시 opt-in(서버 VAPID 활성 시만 노출)

/* ═══════════════════════════════════════════════════════════════
   TeamWorkspace — 팀 워크스페이스 (Enterprise)
   ★ 격리(189차): 데모만 샘플. 운영은 테넌트 격리 실데이터/빈상태(가짜 0건 금지).
     태스크는 tenant 스코프 localStorage 에 저장 → 타 계정 유입 차단.
   ═══════════════════════════════════════════════════════════════ */

const DEMO_MEMBERS = [
  { id: 'm1', name: 'Jiwoo Han', role: 'owner', avatar: '🧑‍💼', online: true },
  { id: 'm2', name: 'Mina Park', role: 'manager', avatar: '👩‍💻', online: true },
  { id: 'm3', name: 'Tom Lee', role: 'member', avatar: '🧑‍🎨', online: false },
  { id: 'm4', name: 'Sora Kim', role: 'member', avatar: '👩‍🔬', online: true },
];
_dloc(DEMO_MEMBERS);
const DEMO_ACTIVITY = [
  { id: 'a1', who: 'Mina Park', action: 'actCampaign', ko: '캠페인을 생성했습니다', target: 'Spring Sale', at: '2h' },
  { id: 'a2', who: 'Tom Lee', action: 'actReport', ko: '리포트를 발행했습니다', target: 'P&L 2026-05', at: '5h' },
  { id: 'a3', who: 'Sora Kim', action: 'actComment', ko: '코멘트를 남겼습니다', target: 'TikTok ROAS', at: '1d' },
  { id: 'a4', who: 'Jiwoo Han', action: 'actApprove', ko: '예산을 승인했습니다', target: 'Budget +₩2M', at: '2d' },
];
_dloc(DEMO_ACTIVITY);
const ROLE_KO = { owner: '소유자', manager: '관리자', member: '멤버' };
_dloc(ROLE_KO);
const DEMO_TASKS = [
  { id: 't1', title: 'Q2 캠페인 예산 검토', assignee: 'Mina Park', done: false },
  { id: 't2', title: '신규 채널 연동 테스트', assignee: 'Tom Lee', done: false },
  { id: 't3', title: '월간 ROI 리포트 발송', assignee: 'Sora Kim', done: true },
];
_dloc(DEMO_TASKS);

export default function TeamWorkspace() {
  const { t } = useI18n();
  const tr = (k, fb) => t(`workspace.${k}`, fb);
  const [activeTab, setActiveTab] = useState(0);

  const members = useMemo(() => IS_DEMO ? DEMO_MEMBERS : [], []);
  const activity = useMemo(() => IS_DEMO ? DEMO_ACTIVITY : [], []);
  const [tasks, setTasks] = useState(() => IS_DEMO ? (tGetJSON('ws_tasks', DEMO_TASKS) || DEMO_TASKS) : (tGetJSON('ws_tasks', []) || []));
  const [newTask, setNewTask] = useState('');

  useEffect(() => { tSetJSON('ws_tasks', tasks); }, [tasks]);

  const addTask = () => {
    const v = newTask.trim();
    if (!v) return;
    setTasks(ts => [...ts, { id: 'tl' + Date.now(), title: v, assignee: '—', done: false }]);
    setNewTask('');
  };
  const toggleTask = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const delTask = (id) => setTasks(ts => ts.filter(t => t.id !== id));

  const [showGuide, setShowGuide] = useState(false);
  const tabs = [tr('tabActivity', '활동 피드'), tr('tabMembers', '구성원'), tr('tabTasks', '태스크')];
  const kpis = [
    { emoji: '👤', label: tr('kpiMembers', '구성원'), val: members.length },
    { emoji: '🟢', label: tr('kpiOnline', '접속 중'), val: members.filter(m => m.online).length },
    { emoji: '📋', label: tr('kpiTasks', '태스크'), val: tasks.length },
    { emoji: '✅', label: tr('kpiDone', '완료'), val: tasks.filter(t => t.done).length },
  ];
  const ROLE_C = { owner: '#f59e0b', manager: '#4f8ef7', member: '#22c55e' };

  const Empty = ({ msg }) => (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{msg}</div>
      {!IS_DEMO && <div style={{ fontSize: 11, marginTop: 6 }}>{tr('inviteHint', '구성원을 초대하면 협업이 시작됩니다')}</div>}
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', borderColor: 'rgba(79,142,247,0.15)' }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.25),rgba(99,102,241,0.15))' }}>👥</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#6366f1)' }}>{tr('heroTitle', '팀 워크스페이스')}</div>
            <div className="hero-desc">{tr('heroDesc', '팀원과 실시간으로 협업하고 업무를 관리하세요')}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} className="card card-glass" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 24, flex: '0 0 auto' }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <PushOptIn />

      <div className="card card-glass" style={{ padding: 8, display: 'flex', gap: 6 }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: '0 0 auto', height: 36, padding: '0 16px', borderRadius: 10, border: activeTab === i ? 'none' : '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: activeTab === i ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'var(--surface)', color: activeTab === i ? '#fff' : 'var(--text-2)' }}>{tab}</button>
        ))}
      </div>

      <div className="card card-glass" style={{ minHeight: 280 }}>
        {/* Activity */}
        {activeTab === 0 && (activity.length === 0 ? <Empty msg={tr('emptyActivity', '최근 활동이 없습니다')} /> : (
          <div style={{ display: 'grid', gap: 0 }}>
            {activity.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: 12, padding: '12px 4px', borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(79,142,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-1)' }}><b>{a.who}</b> {tr(a.action, a.ko)} · <span style={{ color: '#2563eb' }}>{a.target}</span></div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.at}</span>
              </div>
            ))}
          </div>
        ))}

        {/* Members */}
        {activeTab === 1 && (members.length === 0 ? <Empty msg={tr('emptyMembers', '등록된 구성원이 없습니다')} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 24, position: 'relative' }}>{m.avatar}<span style={{ position: 'absolute', right: -2, bottom: -2, width: 9, height: 9, borderRadius: '50%', background: m.online ? '#22c55e' : '#94a3b8', border: '2px solid var(--bg-card,#fff)' }} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ROLE_C[m.role] || 'var(--text-3)' }}>{tr('role_' + m.role, ROLE_KO[m.role] || m.role)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Tasks */}
        {activeTab === 2 && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} placeholder={tr('taskPlaceholder', '새 태스크 입력 후 Enter')} style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2, var(--surface))', color: 'var(--text-1)', fontSize: 12, outline: 'none' }} />
              <button onClick={addTask} className="btn-primary" style={{ height: 38, padding: '0 18px', fontSize: 12 }}>+ {tr('addTask', '추가')}</button>
            </div>
            {tasks.length === 0 ? <Empty msg={tr('emptyTasks', '등록된 태스크가 없습니다')} /> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {tasks.map(tk => (
                  <div key={tk.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={tk.done} onChange={() => toggleTask(tk.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)', textDecoration: tk.done ? 'line-through' : 'none', opacity: tk.done ? 0.5 : 1 }}>{tk.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tk.assignee}</span>
                    <button onClick={() => delTask(tk.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage Guide */}
      <div style={{ marginTop: 4 }}>
        <button onClick={() => setShowGuide(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto 12px', padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          📖 {tr('guideTitle', '팀 워크스페이스 이용 가이드')} {showGuide ? '▲' : '▼'}
        </button>
        {showGuide && (
          <div style={{ background: 'var(--surface2, rgba(255,255,255,0.025))', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 16, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>👥</div>
              <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 6px', color: 'var(--text-1)' }}>{tr('guideTitle', '팀 워크스페이스 이용 가이드')}</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>{tr('guideSub', '초보자도 이 가이드만 보면 팀 협업과 업무 관리를 바로 시작할 수 있습니다')}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>{i}</span>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-1)' }}>{tr(`guideStep${i}Title`, '')}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr(`guideStep${i}Desc`, '')}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>💡 {tr('guideTipTitle', '협업 팁')}</div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr('guideTipDesc', '태스크는 로그인한 계정(테넌트) 안에서만 공유·저장됩니다. 구성원을 초대해 역할(소유자/관리자/멤버)을 부여하면 권한에 맞게 협업할 수 있습니다.')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
