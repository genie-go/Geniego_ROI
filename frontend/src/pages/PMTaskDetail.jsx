import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * PMTaskDetail — 단일 task 의 enriched 정보 (assignees/counts/predecessors/successors).
 * Backend: GET /api/v425/pm/tasks/{id} (177차 enrich 적용).
 * 177차 §4.E TOP 6 / n152f PM-Core 6 page 누락 중 1 페이지.
 */
export default function PMTaskDetail() {
  const t = useT();
  const navigate = useNavigate();
  const { id: taskId } = useParams();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [task, setTask]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTask = useCallback(async () => {
    if (!token || !taskId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${base}/api/v425/pm/tasks/${encodeURIComponent(taskId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) throw new Error(t('pmExt.task.notFound', 'Task not found'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setTask(j);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, taskId, base, t]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  const STATUS_COLOR = {
    todo: '#64748b', in_progress: '#4f8ef7', review: '#a855f7',
    done: '#22c55e', blocked: '#ef4444', cancelled: '#94a3b8',
  };
  const PRIO_COLOR = { low: '#22c55e', normal: '#4f8ef7', high: '#f59e0b', urgent: '#ef4444' };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3,#94a3b8)' }}>
      {t('pmExt.task.loading', 'Loading…')}
    </div>;
  }

  if (error || !task) {
    return <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>
        ⚠️ {t('pmExt.task.error', 'Error')}: {error || t('pmExt.task.notFound', 'Task not found')}
      </div>
      <button onClick={fetchTask} style={btnPrimary}>{t('pmExt.task.retry', 'Retry')}</button>
    </div>;
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={btnGhost}>
          ← {t('pmExt.task.back', 'Back')}
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>{task.title}</h2>
        <span style={{ ...badge, background: STATUS_COLOR[task.status] + '22', color: STATUS_COLOR[task.status] }}>
          {task.status}
        </span>
        <span style={{ ...badge, background: PRIO_COLOR[task.priority] + '22', color: PRIO_COLOR[task.priority] }}>
          {task.priority}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KPI label={t('pmExt.task.progress', 'Progress')} value={`${task.progress_pct ?? 0}%`} color="#4f8ef7" />
        <KPI label={t('pmExt.task.comments', 'Comments')} value={task.comment_count ?? 0} color="#a855f7" />
        <KPI label={t('pmExt.task.attachments', 'Attachments')} value={task.attachment_count ?? 0} color="#f59e0b" />
        <KPI label={t('pmExt.task.assignees', 'Assignees')} value={(task.assignees || []).length} color="#22c55e" />
      </div>

      <Section title={t('pmExt.task.description', 'Description')}>
        <pre style={preBox}>{task.description || t('pmExt.task.noDesc', '(no description)')}</pre>
      </Section>

      <Section title={t('pmExt.task.dates', 'Schedule')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <Field label={t('pmExt.task.startDate', 'Start')}     value={task.start_date || '—'} />
          <Field label={t('pmExt.task.dueDate', 'Due')}         value={task.due_date   || '—'} />
          <Field label={t('pmExt.task.estHours', 'Estimate (h)')} value={task.estimate_hours || '—'} />
          <Field label={t('pmExt.task.actHours', 'Actual (h)')}   value={task.actual_hours   || '—'} />
        </div>
      </Section>

      <Section title={t('pmExt.task.predecessors', 'Predecessors')}>
        {(task.predecessors || []).length === 0 ? (
          <div style={{ color: 'var(--text-3,#94a3b8)', fontSize: 12 }}>{t('pmExt.task.noPredecessors', 'No predecessors')}</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {task.predecessors.map((d, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <code>{d.predecessor_id}</code> · <strong>{d.dep_type}</strong>
                {d.lag_days ? <span> (lag {d.lag_days}d)</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('pmExt.task.successors', 'Successors')}>
        {(task.successors || []).length === 0 ? (
          <div style={{ color: 'var(--text-3,#94a3b8)', fontSize: 12 }}>{t('pmExt.task.noSuccessors', 'No successors')}</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {task.successors.map((d, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <code>{d.successor_id}</code> · <strong>{d.dep_type}</strong>
                {d.lag_days ? <span> (lag {d.lag_days}d)</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function KPI({ label, value, color }) {
  return (
    <div style={{ padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3,#94a3b8)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 18, padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>{title}</div>
      {children}
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3,#94a3b8)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

const badge = { fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase' };
const preBox = { margin: 0, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.2)', fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 };
const btnPrimary = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
const btnGhost = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 };
