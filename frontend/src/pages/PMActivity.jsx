import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';
import { usePmEventStream } from '../services/pmEventStream.js';

/**
 * PMActivity — PM 감사 로그 (audit trail) 피드.
 * Backend: GET /v425/pm/audit (admin 게이트). entity_type/action 필터.
 * n152f PM-Core 잔여 4 page 중 1 (178차). 읽기 전용.
 * 비-admin 은 403 → 안내 메시지 (권한 부족 graceful).
 */

const ACTION_COLOR = { create: '#22c55e', update: '#4f8ef7', delete: '#ef4444' };
const ACTION_ICON = { create: '➕', update: '✏️', delete: '🗑️' };
const ENTITY_ICON = { project: '📁', task: '📋', milestone: '🚩', dependency: '🔗', comment: '💬', attachment: '📎' };

export default function PMActivity() {
  const t = useT();
  const { id: projectId } = useParams();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchRows = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null); setForbidden(false);
    try {
      const res = await fetch(`${base}/api/v425/pm/audit?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403 || res.status === 401) { setForbidden(true); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, base]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // 라이브 SSE — 신규 audit 이벤트 도착 시 목록 자동 갱신 (forbidden/error 상태에서는 비활성)
  const liveEnabled = !forbidden && !error && !!token;
  const { status: liveStatus } = usePmEventStream(projectId, () => { fetchRows({ silent: true }); }, { enabled: liveEnabled });

  const view = useMemo(() => rows.filter(r =>
    (entityFilter === 'all' || r.entity_type === entityFilter) &&
    (actionFilter === 'all' || r.action === actionFilter)
  ), [rows, entityFilter, actionFilter]);

  const entityTypes = useMemo(() => [...new Set(rows.map(r => r.entity_type).filter(Boolean))], [rows]);

  const fmtDiff = (row) => {
    const diff = row?.diff_json ?? row?.diff;
    if (!diff) return null;
    try {
      const obj = typeof diff === 'string' ? JSON.parse(diff) : diff;
      const keys = Object.keys(obj || {});
      if (!keys.length) return null;
      return keys.slice(0, 4).map(k => `${k}`).join(', ') + (keys.length > 4 ? '…' : '');
    } catch { return typeof diff === 'string' ? diff.slice(0, 60) : null; }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3,#94a3b8)' }}>
      {t('pmExt.activity.loading', 'Loading activity…')}
    </div>;
  }

  if (forbidden) {
    return (
      <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
        <div style={{ marginBottom: 12 }}>
          <Link to={`/pm/projects/${encodeURIComponent(projectId)}`} style={crumb}>← {t('pmExt.activity.backToProject', 'Project')}</Link>
        </div>
        <div role="status" style={{ padding: 48, textAlign: 'center', borderRadius: 14, border: '1px dashed rgba(255,255,255,0.12)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('pmExt.activity.forbiddenTitle', 'Admin access required')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3,#94a3b8)' }}>
            {t('pmExt.activity.forbiddenDesc', 'The audit trail is visible to workspace administrators only.')}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>
        ⚠️ {t('pmExt.activity.error', 'Error')}: {error}
      </div>
      <button onClick={fetchRows} style={btnPrimary}>{t('pmExt.activity.retry', 'Retry')}</button>
    </div>;
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      <div style={{ marginBottom: 8 }}>
        <Link to={`/pm/projects/${encodeURIComponent(projectId)}`} style={crumb}>
          ← {t('pmExt.activity.backToProject', 'Project')}
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, flex: 1 }}>📜 {t('pmExt.activity.title', 'Activity log')}</h2>
        <span title={liveStatus} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
          color: liveStatus === 'open' ? '#22c55e' : 'var(--text-3,#94a3b8)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%',
            background: liveStatus === 'open' ? '#22c55e' : (liveStatus === 'reconnecting' ? '#f59e0b' : '#64748b') }} />
          {liveStatus === 'open' ? t('pmExt.activity.live', 'Live')
            : liveStatus === 'reconnecting' ? t('pmExt.activity.reconnecting', 'Reconnecting…')
            : t('pmExt.activity.offline', 'Offline')}
        </span>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
          aria-label={t('pmExt.activity.filterEntity', 'Filter by entity')} style={selectInput}>
          <option value="all">{t('pmExt.activity.allEntities', 'All entities')}</option>
          {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          aria-label={t('pmExt.activity.filterAction', 'Filter by action')} style={selectInput}>
          <option value="all">{t('pmExt.activity.allActions', 'All actions')}</option>
          {['create', 'update', 'delete'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3,#94a3b8)', marginBottom: 14 }}>
        {t('pmExt.activity.scopeNote', 'Workspace-wide PM audit trail (most recent 200 events).')} · {view.length}/{rows.length}
      </div>

      {view.length === 0 ? (
        <div style={emptyBox}>
          {rows.length === 0
            ? t('pmExt.activity.empty', 'No activity recorded yet.')
            : t('pmExt.activity.emptyFiltered', 'No events match the current filter.')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {view.map((r, i) => (
            <div key={r.id || i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{ENTITY_ICON[r.entity_type] || '•'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: ACTION_COLOR[r.action] || 'inherit', fontWeight: 700 }}>
                    {ACTION_ICON[r.action] || ''} {r.action}
                  </span>
                  {' '}<span style={{ color: 'var(--text-3,#94a3b8)' }}>{r.entity_type}</span>
                  {' '}<code style={{ fontSize: 11 }}>{r.entity_id}</code>
                </div>
                {fmtDiff(r) && (
                  <div style={{ fontSize: 11, color: 'var(--text-3,#94a3b8)', marginTop: 2 }}>
                    {t('pmExt.activity.changed', 'changed')}: {fmtDiff(r)}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-3,#94a3b8)', marginTop: 4, fontFamily: 'monospace' }}>
                  {r.actor_user_id || r.actor_api_key || t('pmExt.activity.system', 'system')}
                  {r.created_at && <span> · {r.created_at}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const crumb = { fontSize: 12, color: 'var(--text-3,#94a3b8)', textDecoration: 'none' };
const emptyBox = { padding: 48, textAlign: 'center', color: 'var(--text-3,#94a3b8)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.12)' };
const selectInput = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: 12 };
const btnPrimary = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
