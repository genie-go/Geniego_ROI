import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n/index.js';

/**
 * PMProjectDetail — N-152-F PM-Core skeleton (단독 spec §7.1 PMProjectDetail).
 *
 * 프로젝트 헤더 + KPI + 탭 (Tasks / Gantt / Milestones / Activity).
 * 본 skeleton: 헤더 + KPI 호출 + 탭 네비게이션만. 각 탭 본문은 별도 페이지.
 *
 * Backend:
 *  - GET /api/v425/pm/projects/{id}
 *  - GET /api/v425/pm/projects/{id}/kpi
 */
export default function PMProjectDetail() {
  const t = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth() || {};
  const base = import.meta.env.VITE_API_BASE || '';

  const [project, setProject] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const [pRes, kRes] = await Promise.all([
        fetch(`${base}/api/v425/pm/projects/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${base}/api/v425/pm/projects/${encodeURIComponent(id)}/kpi`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!pRes.ok) throw new Error(`project HTTP ${pRes.status}`);
      const pJson = await pRes.json();
      setProject(pJson);
      if (kRes.ok) {
        const kJson = await kRes.json();
        setKpi(kJson);
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [token, id, base]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!id) {
    return <div style={{ padding: 32 }}>{t('pm.detail.idMissing', '프로젝트 ID 누락')}</div>;
  }

  return (
    <div style={{ padding: 24, color: 'var(--text-1, #e5e7eb)' }}>
      <div style={{ marginBottom: 8 }}>
        <Link to="/pm" style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', textDecoration: 'none' }}>
          ← {t('pm.detail.back', '프로젝트 목록')}
        </Link>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                      borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && !project && <div>{t('pm.common.loadingFull', '로딩 중…')}</div>}

      {project && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>{project.name}</h2>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12,
                            background: 'rgba(79,142,247,0.15)', color: '#4f8ef7' }}>
              {project.status}
            </span>
          </div>

          {project.description && (
            <div style={{ marginBottom: 20, color: 'var(--text-2, #cbd5e1)', lineHeight: 1.6 }}>
              {project.description}
            </div>
          )}

          {/* KPI tile */}
          {kpi && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
              <KpiTile label={t('pm.kpi.total', '전체')} value={kpi.total} color="#4f8ef7" />
              <KpiTile label={t('pm.kpi.done', '완료')} value={kpi.done} color="#a855f7" />
              <KpiTile label={t('pm.kpi.active', '진행')} value={kpi.active} color="#10b981" />
              <KpiTile label={t('pm.kpi.overdue', '지연')} value={kpi.overdue} color="#ef4444" />
              <KpiTile label={t('pm.kpi.completionPct', '완성도')}
                       value={`${kpi.completion_pct || 0}%`} color="#06b6d4" />
            </div>
          )}

          {/* 탭 */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border, #1e293b)', marginBottom: 16 }}>
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/board`} label={t('pm.tab.board', '보드')} />
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/tasks`} label={t('pm.tab.tasks', '작업')} />
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/gantt`} label={t('pm.tab.gantt', 'Gantt')} />
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/milestones`} label={t('pm.tab.milestones', '마일스톤')} />
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/raid`} label={t('pm.tab.raid', 'RAID')} />
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/evm`} label={t('pm.tab.evm', 'EVM')} />
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/activity`} label={t('pm.tab.activity', '활동')} />
            <TabLink to={`/pm/projects/${encodeURIComponent(id)}/settings`} label={t('pm.tab.settings', '설정')} />
          </div>

          <div style={{ padding: 32, textAlign: 'center', opacity: 0.6, fontSize: 13 }}>
            {t('pm.detail.placeholder', '위 탭을 선택하여 진입하세요.')}
          </div>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, color }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-2, #0f172a)',
                  border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 10, color: 'var(--text-3, #94a3b8)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function TabLink({ to, label }) {
  return (
    <Link
      to={to}
      style={{
        padding: '8px 16px', textDecoration: 'none', color: 'var(--text-2, #cbd5e1)',
        fontSize: 13, fontWeight: 600, borderBottom: '2px solid transparent',
      }}
    >
      {label}
    </Link>
  );
}
