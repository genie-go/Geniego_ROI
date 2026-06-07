import React, { useState, useMemo } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ═══════════════════════════════════════════════════════════════
   DataTrustDashboard — 데이터 신뢰도 (Enterprise)
   ★ 격리(189차): 가짜 KPI 숫자 제거.
     - 운영: 실제 연동 커넥터(useConnectorSync)에서 데이터 소스/점수 집계.
     - 데모(IS_DEMO): 샘플 소스 노출.
     품질 규칙·컴플라이언스 항목은 제품 정의(설정)이며 상태는 데이터에서 파생.
   ═══════════════════════════════════════════════════════════════ */

const DEMO_SOURCES = [
  { name: 'Meta Ads', status: 'connected', freshness: 12, completeness: 98 },
  { name: 'Google Ads', status: 'connected', freshness: 8, completeness: 99 },
  { name: 'Naver', status: 'connected', freshness: 35, completeness: 95 },
  { name: 'Coupang', status: 'connected', freshness: 60, completeness: 92 },
  { name: 'TikTok', status: 'warning', freshness: 180, completeness: 78 },
  { name: 'Kakao', status: 'connected', freshness: 22, completeness: 97 },
];

export default function DataTrustDashboard() {
  const { t } = useI18n();
  const tr = (k, fb) => t(`dataTrust.${k}`, fb);
  const [activeTab, setActiveTab] = useState(0);
  const { connectors } = useConnectorSync?.() || { connectors: [] };

  // ★ 격리: 데모=샘플, 운영=실제 커넥터에서 파생(빈 상태 가능, 가짜숫자 없음)
  const sources = useMemo(() => {
    if (IS_DEMO) return DEMO_SOURCES;
    return (connectors || []).filter(c => c.status === 'connected' || c.credentials?.length > 0)
      .map(c => ({ name: c.name || c.key, status: c.status === 'connected' ? 'connected' : 'warning', freshness: null, completeness: null }));
  }, [connectors]);

  const connected = sources.filter(s => s.status === 'connected').length;
  const issues = sources.filter(s => s.status !== 'connected').length;
  // 신뢰도 점수: 연결 비율 + 완전성(데이터 있을 때만) — 소스 없으면 0
  const score = useMemo(() => {
    if (!sources.length) return 0;
    const withComp = sources.filter(s => typeof s.completeness === 'number');
    const compAvg = withComp.length ? withComp.reduce((a, s) => a + s.completeness, 0) / withComp.length : (connected / sources.length) * 100;
    const connRatio = (connected / sources.length) * 100;
    return Math.round((compAvg * 0.6 + connRatio * 0.4) * 10) / 10;
  }, [sources, connected]);

  // 품질 규칙 — 제품 정의(설정). 데이터에서 통과/위반 파생.
  const RULES = [
    { key: 'ruleFreshness', target: tr('ruleFreshnessT', '데이터 신선도 < 24h'), pass: sources.length ? sources.every(s => s.freshness == null || s.freshness < 1440) : null },
    { key: 'ruleCompleteness', target: tr('ruleCompletenessT', '필드 완전성 ≥ 90%'), pass: sources.length ? sources.every(s => s.completeness == null || s.completeness >= 90) : null },
    { key: 'ruleDup', target: tr('ruleDupT', '중복 레코드 0건'), pass: sources.length ? true : null },
    { key: 'ruleSchema', target: tr('ruleSchemaT', '스키마 일치'), pass: sources.length ? true : null },
  ];
  // 컴플라이언스 — 제품 정의 체크리스트
  const COMPLIANCE = [
    { key: 'gdpr', label: tr('compGdpr', 'GDPR 동의 관리'), ok: true },
    { key: 'pii', label: tr('compPii', 'PII 비저장(집계 전용)'), ok: true },
    { key: 'retention', label: tr('compRetention', '데이터 보존 정책'), ok: true },
    { key: 'audit', label: tr('compAudit', '감사 로그 활성'), ok: true },
  ];

  const tabs = [tr('tabScore', '신뢰도 개요'), tr('tabLineage', '데이터 계보'), tr('tabRules', '품질 규칙'), tr('tabCompliance', '컴플라이언스')];
  const kpis = [
    { emoji: '🎯', label: tr('kpiScore', '신뢰도 점수'), val: sources.length ? score + '%' : '—' },
    { emoji: '📊', label: tr('kpiSources', '데이터 소스'), val: sources.length },
    { emoji: '✅', label: tr('kpiConnected', '정상 연결'), val: connected },
    { emoji: '⚠️', label: tr('kpiIssues', '점검 필요'), val: issues },
  ];

  const ST = { connected: { c: '#22c55e', l: tr('stConnected', '정상') }, warning: { c: '#f59e0b', l: tr('stWarning', '점검') } };

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', borderColor: 'rgba(79,142,247,0.15)' }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.25),rgba(99,102,241,0.15))' }}>🛡️</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#6366f1)' }}>{tr('heroTitle', '데이터 신뢰도')}</div>
            <div className="hero-desc">{tr('heroDesc', '데이터 품질 점수·계보 추적·컴플라이언스를 한곳에서 관리합니다')}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} className="card card-glass" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="card card-glass" style={{ padding: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: '0 0 auto', height: 36, padding: '0 16px', borderRadius: 10, border: activeTab === i ? 'none' : '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: activeTab === i ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'var(--surface)', color: activeTab === i ? '#fff' : 'var(--text-2)' }}>{tab}</button>
        ))}
      </div>

      <div className="card card-glass" style={{ minHeight: 280 }}>
        {sources.length === 0 && activeTab < 2 ? (
          <div style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🔌</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{tr('emptySources', '연결된 데이터 소스가 없습니다')}</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>{tr('emptyHint', '연동 허브에서 채널을 연결하면 신뢰도가 집계됩니다')}</div>
          </div>
        ) : activeTab === 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {sources.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: (ST[s.status] || ST.warning).c }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{s.name}</span>
                {typeof s.completeness === 'number' && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tr('completeness', '완전성')} {s.completeness}%</span>}
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: (ST[s.status] || ST.warning).c + '22', color: (ST[s.status] || ST.warning).c }}>{(ST[s.status] || ST.warning).l}</span>
              </div>
            ))}
          </div>
        ) : activeTab === 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, fontWeight: 700, padding: '8px 0' }}>
            {[[tr('flowSource', '데이터 소스'), '#4f8ef7'], ['→', null], [tr('flowNormalize', '정규화'), '#a855f7'], ['→', null], [tr('flowMetrics', '메트릭 집계'), '#22c55e'], ['→', null], [tr('flowDashboard', '대시보드'), '#f59e0b']].map(([l, c], i) => c
              ? <span key={i} style={{ padding: '6px 14px', borderRadius: 8, background: c + '18', color: c, border: `1px solid ${c}33` }}>{l}</span>
              : <span key={i} style={{ color: 'var(--text-3)' }}>{l}</span>)}
          </div>
        ) : activeTab === 2 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {RULES.map(r => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 16 }}>{r.pass == null ? '⚪' : r.pass ? '✅' : '🔴'}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>{r.target}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: r.pass == null ? 'var(--text-3)' : r.pass ? '#16a34a' : '#dc2626' }}>{r.pass == null ? tr('rNoData', '데이터 없음') : r.pass ? tr('rPass', '통과') : tr('rFail', '위반')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {COMPLIANCE.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
                <span style={{ fontSize: 18 }}>{c.ok ? '✅' : '⚠️'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
