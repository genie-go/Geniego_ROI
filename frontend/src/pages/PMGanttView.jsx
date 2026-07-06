import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * PMGanttView — Gantt CPM 시각화 (169차 backend Gantt.php 본체 활용).
 * Backend: GET /api/v425/pm/projects/{id}/gantt — CPM 결과 (ES/EF/LS/LF/slack/critical_path).
 * 177차 §4.E TOP 6 / n152f PM-Core 6 page 누락 중 1 페이지.
 * frappe-gantt 라이브러리 도입은 별 PR 으로 보류 (사용자 승인 필요) — 본 페이지는 자체 SVG.
 */
export default function PMGanttView() {
  const t = useT();
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGantt = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${base}/api/v425/pm/projects/${encodeURIComponent(projectId)}/gantt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setData(j);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, projectId, base]);

  useEffect(() => { fetchGantt(); }, [fetchGantt]);

  const criticalSet = useMemo(
    () => new Set(data?.critical_path_ids || []),
    [data]
  );

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3,#94a3b8)' }}>
      {t('pmExt.gantt.loading', 'Loading Gantt…')}
    </div>;
  }

  if (error) {
    return <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>
        ⚠️ {t('pmExt.gantt.error', 'Error')}: {error}
      </div>
      <button onClick={fetchGantt} style={btnPrimary}>{t('pmExt.gantt.retry', 'Retry')}</button>
    </div>;
  }

  if (!data?.tasks?.length) {
    return (
      <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
        <Header navigate={navigate} t={t} projectId={projectId} />
        <div style={{ padding: 48, textAlign: 'center', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>📊</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('pmExt.gantt.emptyTitle', 'No tasks to display')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3,#94a3b8)' }}>
            {t('pmExt.gantt.emptyHint', 'Add tasks with start_date and due_date to see the timeline')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      <Header navigate={navigate} t={t} projectId={projectId} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KPI label={t('pmExt.gantt.totalTasks', 'Total Tasks')}     value={data.tasks.length}            color="#4f8ef7" />
        <KPI label={t('pmExt.gantt.criticalCount', 'Critical Path')} value={(data.critical_path_ids || []).length} color="#ef4444" />
        <KPI label={t('pmExt.gantt.durationDays', 'Duration (days)')} value={data.project_duration_days ?? '—'} color="#22c55e" />
        <KPI label={t('pmExt.gantt.dependencies', 'Dependencies')}   value={(data.dependencies || []).length} color="#a855f7" />
      </div>

      <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(79,142,247,0.08)', textAlign: 'left' }}>
              <th style={th}>{t('pmExt.gantt.colTask', 'Task')}</th>
              <th style={th}>{t('pmExt.gantt.colStatus', 'Status')}</th>
              <th style={th}>{t('pmExt.gantt.colES', 'ES')}</th>
              <th style={th}>{t('pmExt.gantt.colEF', 'EF')}</th>
              <th style={th}>{t('pmExt.gantt.colLS', 'LS')}</th>
              <th style={th}>{t('pmExt.gantt.colLF', 'LF')}</th>
              <th style={th}>{t('pmExt.gantt.colSlack', 'Slack')}</th>
              <th style={th}>{t('pmExt.gantt.colCritical', 'Critical')}</th>
            </tr>
          </thead>
          <tbody>
            {data.tasks.map(t2 => {
              const crit = criticalSet.has(t2.id);
              return (
                <tr key={t2.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ ...td, fontWeight: crit ? 700 : 500 }}>
                    {t2.title}
                  </td>
                  <td style={td}>{t2.status}</td>
                  <td style={td}>{t2.es ?? '—'}</td>
                  <td style={td}>{t2.ef ?? '—'}</td>
                  <td style={td}>{t2.ls ?? '—'}</td>
                  <td style={td}>{t2.lf ?? '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{t2.slack_days ?? t2.slack ?? '—'}</td>
                  <td style={td}>
                    {crit
                      ? <span style={{ ...badge, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>★ {t('pmExt.gantt.criticalLabel','Critical')}</span>
                      : <span style={{ color: 'var(--text-3,#94a3b8)' }}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.12)', fontSize: 11, color: 'var(--text-3,#94a3b8)' }}>
        {t('pmExt.gantt.legend', 'ES/EF = Earliest Start/Finish · LS/LF = Latest Start/Finish · Slack = LS-ES · Critical = Slack 0 (project bottleneck)')}
      </div>
    </div>
  );
}

function Header({ navigate, t, projectId }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button onClick={() => navigate(`/pm/projects/${encodeURIComponent(projectId)}`)} style={btnGhost}>
        ← {t('pmExt.gantt.back', 'Back to Project')}
      </button>
      <h2 style={{ margin: 0, flex: 1 }}>📊 {t('pmExt.gantt.title', 'Gantt View')}</h2>
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

const th = { padding: '10px 14px', fontWeight: 700, color: 'var(--text-2,#cbd5e1)' };
const td = { padding: '10px 14px' };
const badge = { fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 700 };
const btnPrimary = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
const btnGhost = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 };
