import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * PMTaskBoard — N-152-F PM-Core skeleton (단독 spec §7.1 PMTaskBoard).
 *
 * Kanban 보드 — status 별 컬럼 (todo / in_progress / review / done / blocked).
 * 본 skeleton: 조회 + 컬럼 렌더 + 신규 task 생성. drag-drop / 인라인 edit 은 169차 본체.
 *
 * Backend:
 *  - GET /api/v425/pm/projects/{id}/tasks
 *  - POST /api/v425/pm/tasks
 *  - PATCH /api/v425/pm/tasks/{id}  (status 변경)
 */
const STATUS_COLUMNS = [
  { key: 'todo', labelKey: 'pm.status.todo', labelFb: '할 일', color: '#94a3b8' },
  { key: 'in_progress', labelKey: 'pm.status.in_progress', labelFb: '진행 중', color: '#3b82f6' },
  { key: 'review', labelKey: 'pm.status.review', labelFb: '검토', color: '#a855f7' },
  { key: 'done', labelKey: 'pm.status.done', labelFb: '완료', color: '#10b981' },
  { key: 'blocked', labelKey: 'pm.status.blocked', labelFb: '막힘', color: '#ef4444' },
];

const PRIORITY_COLOR = {
  low: '#94a3b8',
  normal: '#4f8ef7',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export default function PMTaskBoard() {
  const t = useT();
  const { id: projectId } = useParams();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/v425/pm/projects/${encodeURIComponent(projectId)}/tasks?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setTasks(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, projectId, base]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const onCreate = useCallback(async () => {
    const title = prompt(t('pm.board.newTaskPrompt', '새 작업 제목?'));
    if (!title) return;
    try {
      const res = await fetch(`${base}/api/v425/pm/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ project_id: projectId, title }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      await fetchTasks();
    } catch (e) {
      alert(`생성 실패: ${e.message}`);
    }
  }, [token, base, projectId, fetchTasks]);

  const onChangeStatus = useCallback(async (taskId, newStatus) => {
    try {
      const res = await fetch(`${base}/api/v425/pm/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchTasks();
    } catch (e) {
      alert(`status 변경 실패: ${e.message}`);
    }
  }, [token, base, fetchTasks]);

  const grouped = useMemo(() => {
    const m = {};
    for (const c of STATUS_COLUMNS) m[c.key] = [];
    for (const tk of tasks) {
      if (m[tk.status]) m[tk.status].push(tk);
    }
    return m;
  }, [tasks]);

  return (
    <div style={{ padding: 24, color: 'var(--text-1, #e5e7eb)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Link to={`/pm/projects/${encodeURIComponent(projectId)}`}
              style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', textDecoration: 'none' }}>
          ← {t('pm.board.back', '프로젝트')}
        </Link>
        <h3 style={{ margin: 0 }}>{t('pm.board.title', '작업 보드')}</h3>
        <button
          onClick={onCreate}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none',
                   background: 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                   color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          {t('pm.board.newTask', '+ 새 작업')}
        </button>
        <button
          onClick={fetchTasks}
          disabled={loading}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border, #334155)',
                   background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          {loading ? t('pm.common.loading', '로딩…') : t('pm.common.refresh', '새로고침')}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                      borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, minHeight: '60vh' }}>
        {STATUS_COLUMNS.map(col => (
          <div key={col.key} style={{ background: 'var(--bg-2, #0f172a)', borderRadius: 12,
                                       border: '1px solid var(--border, #1e293b)', padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: col.color }}>{t(col.labelKey, col.labelFb)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3, #94a3b8)' }}>{grouped[col.key].length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[col.key].map(task => (
                <TaskCard key={task.id} task={task} onChangeStatus={onChangeStatus} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, onChangeStatus, t }) {
  return (
    <div style={{ padding: 10, borderRadius: 8, background: 'var(--bg-1, #1e293b)',
                  border: '1px solid var(--border, #334155)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>
        {task.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
        <span style={{ padding: '1px 6px', borderRadius: 8, color: '#fff',
                        background: PRIORITY_COLOR[task.priority] || '#4f8ef7' }}>
          {task.priority}
        </span>
        {task.due_date && (
          <span style={{ color: 'var(--text-3, #94a3b8)' }}>📅 {task.due_date}</span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--text-3, #94a3b8)' }}>
          {task.progress_pct ? `${task.progress_pct}%` : ''}
        </span>
      </div>
      <select
        value={task.status}
        onChange={e => onChangeStatus(task.id, e.target.value)}
        style={{ marginTop: 8, width: '100%', padding: '3px 6px', fontSize: 10,
                 borderRadius: 4, background: 'var(--bg-2, #0f172a)',
                 color: 'inherit', border: '1px solid var(--border, #334155)' }}
      >
        {STATUS_COLUMNS.map(c => <option key={c.key} value={c.key}>{t(c.labelKey, c.labelFb)}</option>)}
      </select>
    </div>
  );
}
