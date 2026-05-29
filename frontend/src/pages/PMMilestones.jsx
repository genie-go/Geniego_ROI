import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';
import { usePmEventStream } from '../services/pmEventStream.js';

/**
 * PMMilestones — project 마일스톤 관리.
 * Backend: GET/POST /v425/pm/milestones, PATCH/DELETE /v425/pm/milestones/{id}.
 * n152f PM-Core 잔여 4 page 중 1 (178차).
 * U-177-A: 데모 모드는 write disabled + banner.
 */

const _IS_DEMO_ENV = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.includes('roidemo') || host.includes('demo') ||
           (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true');
  } catch { return false; }
})();

const STATUS_COLOR = { upcoming: '#4f8ef7', in_progress: '#f59e0b', achieved: '#22c55e', missed: '#ef4444' };
const STATUSES = ['upcoming', 'in_progress', 'achieved', 'missed'];

export default function PMMilestones() {
  const t = useT();
  const { id: projectId } = useParams();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', target_date: '', description: '' });
  const [saving, setSaving] = useState(false);

  const show = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const fetchRows = useCallback(async ({ silent = false } = {}) => {
    if (!token || !projectId) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${base}/api/v425/pm/milestones?project_id=${encodeURIComponent(projectId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      setRows(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, projectId, base]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // 라이브 SSE — milestone create/update/delete 이벤트 도착 시 목록 자동 갱신 (179차 라이브 확대)
  const liveEnabled = !error && !!token && !!projectId;
  const { status: liveStatus } = usePmEventStream(projectId, () => { fetchRows({ silent: true }); }, { enabled: liveEnabled });

  const today = new Date().toISOString().slice(0, 10);
  const kpi = useMemo(() => ({
    total: rows.length,
    achieved: rows.filter(r => r.status === 'achieved').length,
    upcoming: rows.filter(r => r.status === 'upcoming' || r.status === 'in_progress').length,
    overdue: rows.filter(r => r.status !== 'achieved' && r.target_date && r.target_date < today).length,
  }), [rows, today]);

  const createMilestone = async () => {
    if (_IS_DEMO_ENV) { show(t('pmExt.ms.demoLocked', 'Demo mode — creation disabled')); return; }
    if (!form.title.trim() || !form.target_date) { show(t('pmExt.ms.invalidInput', 'Title and target date required')); return; }
    setSaving(true);
    try {
      const res = await fetch(`${base}/api/v425/pm/milestones`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, ...form }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      show(t('pmExt.ms.created', 'Milestone created'));
      setForm({ title: '', target_date: '', description: '' });
      setShowForm(false);
      fetchRows();
    } catch (e) {
      show(`${t('pmExt.ms.error', 'Error')}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id, status) => {
    if (_IS_DEMO_ENV) { show(t('pmExt.ms.demoLocked', 'Demo mode — update disabled')); return; }
    try {
      const body = { status };
      if (status === 'achieved') body.achieved_at = today;
      const res = await fetch(`${base}/api/v425/pm/milestones/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(rs => rs.map(r => r.id === id ? { ...r, ...body } : r));
    } catch (e) {
      show(`${t('pmExt.ms.error', 'Error')}: ${e?.message || e}`);
    }
  };

  const remove = async (id) => {
    if (_IS_DEMO_ENV) { show(t('pmExt.ms.demoLocked', 'Demo mode — deletion disabled')); return; }
    if (typeof window !== 'undefined' && !window.confirm(t('pmExt.ms.confirmDelete', 'Delete this milestone?'))) return;
    try {
      const res = await fetch(`${base}/api/v425/pm/milestones/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(rs => rs.filter(r => r.id !== id));
      show(t('pmExt.ms.deleted', 'Milestone deleted'));
    } catch (e) {
      show(`${t('pmExt.ms.error', 'Error')}: ${e?.message || e}`);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3,#94a3b8)' }}>
      {t('pmExt.ms.loading', 'Loading milestones…')}
    </div>;
  }

  if (error) {
    return <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>
        ⚠️ {t('pmExt.ms.error', 'Error')}: {error}
      </div>
      <button onClick={fetchRows} style={btnPrimary}>{t('pmExt.ms.retry', 'Retry')}</button>
    </div>;
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1,#e5e7eb)' }}>
      {_IS_DEMO_ENV && <DemoBanner t={t} />}
      {toast && <div role="status" style={toastBox}>{toast}</div>}

      <div style={{ marginBottom: 8 }}>
        <Link to={`/pm/projects/${encodeURIComponent(projectId)}`} style={crumb}>
          ← {t('pmExt.ms.backToProject', 'Project')}
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, flex: 1 }}>🚩 {t('pmExt.ms.title', 'Milestones')}</h2>
        <LiveBadge status={liveStatus} t={t} />
        <button
          onClick={() => setShowForm(s => !s)}
          disabled={_IS_DEMO_ENV}
          style={{ ...btnPrimary, opacity: _IS_DEMO_ENV ? 0.5 : 1, cursor: _IS_DEMO_ENV ? 'not-allowed' : 'pointer' }}
        >
          + {t('pmExt.ms.add', 'Add milestone')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        <KPI label={t('pmExt.ms.kpiTotal', 'Total')} value={kpi.total} color="#4f8ef7" />
        <KPI label={t('pmExt.ms.kpiAchieved', 'Achieved')} value={kpi.achieved} color="#22c55e" />
        <KPI label={t('pmExt.ms.kpiUpcoming', 'Upcoming')} value={kpi.upcoming} color="#f59e0b" />
        <KPI label={t('pmExt.ms.kpiOverdue', 'Overdue')} value={kpi.overdue} color="#ef4444" />
      </div>

      {showForm && !_IS_DEMO_ENV && (
        <div style={formBox}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t('pmExt.ms.formTitle', 'Milestone title')}
              aria-label={t('pmExt.ms.formTitle', 'Milestone title')}
              style={input}
            />
            <input
              type="date"
              value={form.target_date}
              onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
              aria-label={t('pmExt.ms.formTargetDate', 'Target date')}
              style={input}
            />
          </div>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder={t('pmExt.ms.formDesc', 'Description (optional)')}
            aria-label={t('pmExt.ms.formDesc', 'Description (optional)')}
            style={{ ...input, width: '100%', minHeight: 60, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={createMilestone} disabled={saving} style={btnPrimary}>
              {saving ? t('pmExt.ms.saving', 'Saving…') : t('pmExt.ms.save', 'Save')}
            </button>
            <button onClick={() => setShowForm(false)} style={btnGhost}>{t('pmExt.ms.cancel', 'Cancel')}</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={emptyBox}>{t('pmExt.ms.empty', 'No milestones yet. Add the first one to track delivery checkpoints.')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => {
            const overdue = r.status !== 'achieved' && r.target_date && r.target_date < today;
            return (
              <div key={r.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.title}</div>
                    {r.description && <div style={{ fontSize: 12, color: 'var(--text-3,#94a3b8)' }}>{r.description}</div>}
                    <div style={{ fontSize: 11, color: overdue ? '#ef4444' : 'var(--text-3,#94a3b8)', marginTop: 6, fontFamily: 'monospace' }}>
                      🎯 {r.target_date || '—'}
                      {r.achieved_at && <span style={{ color: '#22c55e' }}> · ✅ {r.achieved_at}</span>}
                      {overdue && <span style={{ fontWeight: 700 }}> · {t('pmExt.ms.overdueTag', 'OVERDUE')}</span>}
                    </div>
                  </div>
                  <select
                    value={r.status}
                    onChange={e => setStatus(r.id, e.target.value)}
                    disabled={_IS_DEMO_ENV}
                    aria-label={t('pmExt.ms.statusLabel', 'Milestone status')}
                    style={{ ...selectInput, borderColor: (STATUS_COLOR[r.status] || '#334155') + '88', color: STATUS_COLOR[r.status] || 'inherit' }}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={_IS_DEMO_ENV}
                    aria-label={t('pmExt.ms.delete', 'Delete')}
                    style={{ ...btnGhost, color: '#ef4444', borderColor: '#ef444455', opacity: _IS_DEMO_ENV ? 0.4 : 1 }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
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

// 179차 — SSE 실시간 상태 배지. i18n 키는 178차 승인 pmExt.activity.* 재사용 (신규 키 없음).
function LiveBadge({ status, t }) {
  return (
    <span title={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
      color: status === 'open' ? '#22c55e' : 'var(--text-3,#94a3b8)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%',
        background: status === 'open' ? '#22c55e' : (status === 'reconnecting' ? '#f59e0b' : '#64748b') }} />
      {status === 'open' ? t('pmExt.activity.live', 'Live')
        : status === 'reconnecting' ? t('pmExt.activity.reconnecting', 'Reconnecting…')
        : t('pmExt.activity.offline', 'Offline')}
    </span>
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

const crumb = { fontSize: 12, color: 'var(--text-3,#94a3b8)', textDecoration: 'none' };
const card = { padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' };
const formBox = { padding: 18, borderRadius: 14, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.25)', marginBottom: 20 };
const emptyBox = { padding: 48, textAlign: 'center', color: 'var(--text-3,#94a3b8)', fontSize: 13, borderRadius: 14, border: '1px dashed rgba(255,255,255,0.12)' };
const input = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: 12 };
const selectInput = { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'rgba(255,255,255,0.03)', color: 'inherit', fontSize: 12, fontWeight: 600 };
const btnPrimary = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
const btnGhost = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border,#334155)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 12 };
const toastBox = { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: 10, background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.15)', color: '#e5e7eb', fontSize: 13, zIndex: 1000 };
