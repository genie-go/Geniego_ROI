import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BeginnerGuide from '../components/BeginnerGuide.jsx';
import { GUIDE } from '../lib/guideSpecs.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * PMOverview — N-152-F PM-Core skeleton (단독 spec §7.1 PMOverview).
 *
 * 프로젝트 카드 그리드 + KPI 집계 (전체 합산). 신규 프로젝트 생성.
 *
 * Backend: GET /api/v425/pm/projects, POST /api/v425/pm/projects
 */
export default function PMOverview() {
  const t = useT();
  const navigate = useNavigate();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${base}/api/v425/pm/projects?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setProjects(Array.isArray(json?.items) ? json.items : []);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, base]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const onCreate = useCallback(async () => {
    const name = prompt(t('pm.overview.newProjectPrompt', '새 프로젝트 이름?'));
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch(`${base}/api/v425/pm/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      await fetchList();
      if (j?.id) navigate(`/pm/projects/${encodeURIComponent(j.id)}`);
    } catch (e) {
      alert(`${t('pm.common.createFail', '생성 실패')}: ${e.message}`);
    } finally {
      setCreating(false);
    }
  }, [token, base, fetchList, navigate, t]);

  const totals = useMemo(() => {
    const total = projects.length;
    const planning = projects.filter(p => p.status === 'planning').length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    return { total, planning, active, completed };
  }, [projects]);

  return (
    <div style={{ padding: 24, color: 'var(--text-1, #e5e7eb)' }}>
      <div style={{ marginBottom: 16 }}><BeginnerGuide spec={GUIDE.pmOverview} /></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>{t('pm.overview.title', '프로젝트 관리')}</h2>
        <button
          onClick={onCreate}
          disabled={creating}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none',
                   background: 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                   color: '#fff', fontWeight: 700, cursor: 'pointer' }}
        >
          {creating ? t('pm.common.creating', '생성 중…') : t('pm.overview.newProject', '+ 새 프로젝트')}
        </button>
        <button
          onClick={fetchList}
          disabled={loading}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border, #334155)',
                   background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          {loading ? t('pm.common.loading', '로딩…') : t('pm.common.refresh', '새로고침')}
        </button>
      </div>

      {/* KPI tile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiTile label={t('pm.kpi.total', '전체')} value={totals.total} color="#4f8ef7" />
        <KpiTile label={t('pm.kpi.planning', '계획')} value={totals.planning} color="#94a3b8" />
        <KpiTile label={t('pm.kpi.active', '진행')} value={totals.active} color="#10b981" />
        <KpiTile label={t('pm.kpi.completed', '완료')} value={totals.completed} color="#a855f7" />
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                      borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', opacity: 0.7 }}>
          {t('pm.overview.empty', '프로젝트가 없습니다. 우측 상단에서 새 프로젝트를 생성하세요.')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} onClick={() => navigate(`/pm/projects/${encodeURIComponent(p.id)}`)} />
        ))}
      </div>
    </div>
  );
}

function KpiTile({ label, value, color }) {
  return (
    <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-2, #0f172a)',
                  border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 11, color: 'var(--text-3, #94a3b8)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

const STATUS_COLOR = {
  planning: '#94a3b8',
  active: '#10b981',
  on_hold: '#f59e0b',
  completed: '#a855f7',
  archived: '#475569',
};

function ProjectCard({ project, onClick }) {
  const color = STATUS_COLOR[project.status] || '#94a3b8';
  return (
    <div
      onClick={onClick}
      style={{
        padding: 16, borderRadius: 12, background: 'var(--bg-2, #0f172a)',
        border: '1px solid var(--border, #1e293b)', cursor: 'pointer', transition: 'all 200ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border, #1e293b)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12,
                        background: `${color}22`, color }}>
          {project.status}
        </span>
      </div>
      {project.description && (
        <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', marginBottom: 8,
                       maxHeight: 36, overflow: 'hidden' }}>
          {project.description}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-3, #94a3b8)' }}>
        {project.start_date && <span>📅 {project.start_date}</span>}
        {project.target_date && <span>🎯 {project.target_date}</span>}
      </div>
    </div>
  );
}
