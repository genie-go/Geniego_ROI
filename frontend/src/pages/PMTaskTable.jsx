import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * PMTaskTable — project 의 task 목록 테이블 뷰 (board 의 대안).
 * Backend: GET /api/v425/pm/projects/{id}/tasks (177차 enrich: assignees/comment/attachment/deps).
 * n152f PM-Core 잔여 4 page 중 1 (178차).
 *
 * board(칸반) 대비 장점: 정렬·필터·검색·일괄 스캔 — 운영 PM 의 daily triage 용.
 * 읽기 전용(이 페이지는 navigate 만). 쓰기는 PMTaskDetail / board 에서.
 */

const _IS_DEMO_ENV = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.includes('roidemo') || host.includes('demo') ||
           (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true');
  } catch { return false; }
})();

const STATUS_COLOR = {
  todo: '#64748b', in_progress: '#4f8ef7', review: '#a855f7',
  done: '#22c55e', blocked: '#ef4444', cancelled: '#94a3b8',
};
const PRIO_COLOR = { low: '#22c55e', normal: '#4f8ef7', high: '#f59e0b', urgent: '#ef4444' };
const PRIO_RANK = { urgent: 4, high: 3, normal: 2, low: 1 };

export default function PMTaskTable() {
  const t = useT();
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('position_idx');
  const [sortDir, setSortDir] = useState('asc');

  const fetchTasks = useCallback(async () => {
    if (!token || !projectId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        `${base}/api/v425/pm/projects/${encodeURIComponent(projectId)}/tasks?limit=500`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 404) throw new Error(t('pmExt.table.notFound', 'Project not found'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, projectId, base, t]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const kpi = useMemo(() => {
    const total = rows.length;
    const done = rows.filter(r => r.status === 'done').length;
    const blocked = rows.filter(r => r.status === 'blocked').length;
    const overdue = rows.filter(r => r.due_date && r.status !== 'done'
      && r.due_date < new Date().toISOString().slice(0, 10)).length;
    return { total, done, blocked, overdue };
  }, [rows]);

  const view = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(r => (r.title || '').toLowerCase().includes(q));
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === 'priority') { av = PRIO_RANK[av] || 0; bv = PRIO_RANK[bv] || 0; }
      if (sortKey === 'progress_pct' || sortKey === 'position_idx') { av = +av || 0; bv = +bv || 0; }
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [rows, statusFilter, query, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3,#94a3b8)' }}>
      {t('pmExt.table.loading', 'Loading tasks…')}
    </div>;
  }

  if (error) {
    return <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>
        ⚠️ {t('pmExt.table.error', 'Error')}: {error}
      </div>
      <button onClick={fetchTasks} style={btnPrimary}>{t('pmExt.table.retry', 'Retry')}</button>
    </div>;
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      {_IS_DEMO_ENV && <DemoBanner t={t} />}

      {/* Hero / 탭 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Link to={`/pm/projects/${encodeURIComponent(projectId)}`} style={crumb}>
          ← {t('pmExt.table.backToProject', 'Project')}
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, flex: 1 }}>📋 {t('pmExt.table.title', 'Tasks')}</h2>
        <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
          <Link to={`/pm/projects/${encodeURIComponent(projectId)}/board`} style={tabBtn}>{t('pm.tab.board', 'Board')}</Link>
          <Link to={`/pm/projects/${encodeURIComponent(projectId)}/gantt`} style={tabBtn}>{t('pm.tab.gantt', 'Gantt')}</Link>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KPI label={t('pmExt.table.kpiTotal', 'Total')} value={kpi.total} color="#4f8ef7" />
        <KPI label={t('pmExt.table.kpiDone', 'Done')} value={kpi.done} color="#22c55e" />
        <KPI label={t('pmExt.table.kpiBlocked', 'Blocked')} value={kpi.blocked} color="#ef4444" />
        <KPI label={t('pmExt.table.kpiOverdue', 'Overdue')} value={kpi.overdue} color="#f59e0b" />
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('pmExt.table.searchPlaceholder', 'Search title…')}
          aria-label={t('pmExt.table.searchPlaceholder', 'Search title…')}
          style={searchInput}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          aria-label={t('pmExt.table.filterStatus', 'Filter by status')}
          style={selectInput}
        >
          <option value="all">{t('pmExt.table.allStatus', 'All status')}</option>
          {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text-3,#94a3b8)' }}>
          {t('pmExt.table.showing', 'Showing')} {view.length}/{rows.length}
        </span>
      </div>

      {/* 테이블 / empty */}
      {view.length === 0 ? (
        <div style={emptyBox}>
          {rows.length === 0
            ? t('pmExt.table.empty', 'No tasks in this project yet.')
            : t('pmExt.table.emptyFiltered', 'No tasks match the current filter.')}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Th label={t('pmExt.table.colTitle', 'Title')} k="title" {...{ sortKey, sortDir, toggleSort }} />
                <Th label={t('pmExt.table.colStatus', 'Status')} k="status" {...{ sortKey, sortDir, toggleSort }} />
                <Th label={t('pmExt.table.colPriority', 'Priority')} k="priority" {...{ sortKey, sortDir, toggleSort }} />
                <Th label={t('pmExt.table.colProgress', 'Progress')} k="progress_pct" {...{ sortKey, sortDir, toggleSort }} />
                <Th label={t('pmExt.table.colDue', 'Due')} k="due_date" {...{ sortKey, sortDir, toggleSort }} />
                <th style={th}>{t('pmExt.table.colAssignees', 'Assignees')}</th>
                <th style={th}>{t('pmExt.table.colMeta', 'Meta')}</th>
              </tr>
            </thead>
            <tbody>
              {view.map(r => {
                const overdue = r.due_date && r.status !== 'done'
                  && r.due_date < new Date().toISOString().slice(0, 10);
                return (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/pm/tasks/${encodeURIComponent(r.id)}`)}
                    style={{ cursor: 'pointer', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    title={t('pmExt.table.openTask', 'Open task')}
                  >
                    <td style={{ ...td, fontWeight: 600 }}>{r.title}</td>
                    <td style={td}>
                      <span style={{ ...badge, background: (STATUS_COLOR[r.status] || '#64748b') + '22', color: STATUS_COLOR[r.status] || '#64748b' }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{ ...badge, background: (PRIO_COLOR[r.priority] || '#64748b') + '22', color: PRIO_COLOR[r.priority] || '#64748b' }}>
                        {r.priority}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 50, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                          <div style={{ width: `${r.progress_pct ?? 0}%`, height: '100%', borderRadius: 4, background: '#4f8ef7' }} />
                        </div>
                        <span style={{ fontFamily: 'monospace', minWidth: 32 }}>{r.progress_pct ?? 0}%</span>
                      </div>
                    </td>
                    <td style={{ ...td, fontFamily: 'monospace', color: overdue ? '#ef4444' : 'inherit', fontWeight: overdue ? 700 : 400 }}>
                      {r.due_date || '—'}
                    </td>
                    <td style={td}>{(r.assignees || []).length || '—'}</td>
                    <td style={{ ...td, color: 'var(--text-3,#94a3b8)' }}>
                      💬{r.comment_count ?? 0} · 📎{r.attachment_count ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, toggleSort }) {
  const active = sortKey === k;
  return (
    <th
      style={{ ...th, cursor: 'pointer', userSelect: 'none' }}
      onClick={() => toggleSort(k)}
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
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

function DemoBanner({ t }) {
  return (
    <div role="status" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10,
      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>
      ⚠️ {t('pmExt.demoBanner', 'Demo mode — data is read-only and not saved to production.')}
    </div>
  );
}

const th = { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-3,#94a3b8)', whiteSpace: 'nowrap' };
const td = { padding: '10px 14px', verticalAlign: 'middle' };
const badge = { fontSize: 10, padding: '3px 10px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' };
const crumb = { fontSize: 12, color: 'var(--text-3,#94a3b8)', textDecoration: 'none' };
const tabBtn = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'transparent', color: 'inherit', textDecoration: 'none', fontSize: 12, fontWeight: 600 };
const searchInput = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: 12, minWidth: 200 };
const selectInput = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: 12 };
const emptyBox = { padding: 48, textAlign: 'center', color: 'var(--text-3,#94a3b8)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.12)' };
const btnPrimary = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
