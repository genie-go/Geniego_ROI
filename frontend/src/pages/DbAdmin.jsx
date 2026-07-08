import React, { useState, useEffect, useCallback } from "react";
import { getJsonAuth } from "../services/apiClient.js";
import { useI18n } from "../i18n/index.js";

/**
 * DbAdmin — 데이터베이스 관리 admin 콘솔.
 *
 * 169차 P5 사용자 발견 issue (PgConfig) 연쇄 fix:
 *   이전 53L 버전이 hardcoded mock (DB 크기 2.4 GB, 테이블 48, 가동시간 99.97%) 였음.
 *   PgConfig 와 동일 정책: mock 절대 금지 + backend 실 통계 fetch + fail 시 "—".
 *
 * Endpoint: GET /v424/admin/db/stats
 *   - information_schema.TABLES (count + size sum) + SHOW STATUS Uptime/Threads
 *   - SQLite fallback (sqlite_master count + sqlite_version)
 */

const NA = '—';

function fmtUptime(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return NA;
  const days  = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  return `${days}d ${hours}h`;
}

function DbAdmin() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchStats = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getJsonAuth('/v424/admin/db/stats');
      setStats(data?.stats || null);
    } catch (e) {
      setError(String(e?.message || e));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const tabs = [
    t('dbAdmin.tabs.overview', '데이터베이스 현황'),
    t('dbAdmin.tabs.tableManage', '테이블 관리'),
    t('dbAdmin.tabs.queryRunner', '쿼리 실행기'),
    t('dbAdmin.tabs.backupRestore', '백업/복구'),
  ];

  const kpis = [
    { emoji: '💾', label: t('dbAdmin.kpi.dbSize', 'DB 크기'),
      val: loading ? NA : (Number.isFinite(stats?.size_mb) ? `${stats.size_mb.toFixed(1)} MB` : NA),
      sub: stats?.database || null },
    { emoji: '📊', label: t('dbAdmin.kpi.tableCount', '테이블 수'),
      val: loading ? NA : (Number.isFinite(stats?.tables) ? stats.tables : NA) },
    { emoji: '✅', label: t('dbAdmin.kpi.connectionStatus', '연결 상태'),
      val: loading ? NA : (stats ? t('dbAdmin.kpi.connectionOk', '정상 (live)') : '실패') },
    { emoji: '⏱️', label: '가동 시간',
      val: loading ? NA : fmtUptime(stats?.uptime_sec) },
    { emoji: '🔌', label: t('dbAdmin.kpi.activeConnections', '활성 연결'),
      val: loading ? NA : (Number.isFinite(stats?.connections) ? stats.connections : NA) },
    { emoji: '🏷', label: 'Driver / Version',
      val: stats ? `${stats.driver || NA} ${stats.version || ''}`.trim() : NA },
  ];

  const cardStyle = {
    borderRadius: 14, padding: '18px 20px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  };

  return (
    <div style={{ padding: 24, minHeight: '100%', color: 'var(--text-1)' }}>
      <div style={{
        borderRadius: 18, padding: '28px 32px', marginBottom: 22,
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.06))',
        border: '1px solid rgba(239,68,68,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }}>🗄️</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{t('dbAdmin.header.title', '데이터베이스 관리')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                {t('dbAdmin.header.subtitle', '관리자 전용 · DB 모니터링 (실 통계 / mock 절대 사용 금지)')}
              </div>
              <div style={{
                fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 4,
                padding: '2px 8px', borderRadius: 4,
                background: 'rgba(239,68,68,0.08)', display: 'inline-block',
              }}>{t('dbAdmin.header.kpiNotice', '⚠ 관리자 전용 · 모든 KPI 는 information_schema 실 데이터')}</div>
            </div>
          </div>
          <button onClick={fetchStats} disabled={loading} style={{
            padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)',
            fontSize: 12, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}>{loading ? '로딩…' : '🔄 새로고침'}</button>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.20)',
          color: '#f87171', fontSize: 12,
        }}>⚠ DB 통계 조회 실패 — {error}. KPI 가 "{NA}" 표시 (mock 절대 미사용).</div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 22,
      }}>
        {kpis.map((k, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
              {!loading && (
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(34,197,94,0.10)', color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.25)',
                }}>LIVE</span>
              )}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            {k.sub && (
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>{k.sub}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: activeTab === i ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'transparent',
            color: activeTab === i ? '#fff' : 'var(--text-2)',
          }}>{tab}</button>
        ))}
      </div>

      <div style={{
        borderRadius: 16, padding: '24px 28px', minHeight: 240,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        fontSize: 13, color: 'var(--text-3)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 12 }}>
          {tabs[activeTab]}
        </div>
        {activeTab === 0 && (
          <div>{t('dbAdmin.tabContent.overviewNote', '실 DB 통계는 상단 KPI 참조. 본 탭의 phpMyAdmin 통합 / table inspector / index 분석 등 상세 기능은 170차+ 트랙.')}</div>
        )}
        {activeTab > 0 && (
          <div>본 기능은 별도 구현 트랙입니다 (170차+). mock placeholder 의도적 미표시.</div>
        )}
      </div>
    </div>
  );
}

export default DbAdmin;
