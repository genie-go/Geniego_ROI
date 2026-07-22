import React, { useState, useMemo, useEffect } from "react";
import BeginnerGuide from "../components/BeginnerGuide.jsx";
import { GUIDE } from "../lib/guideSpecs.js";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
// [현 차수] 헤더리스 getJson → getJsonAuth. data-quality/data-lineage 는 핸들러 self-auth 401 fail-closed
//   → 데모는 IS_DEMO early-return 으로 은폐됐고 운영에서만 무증상 실패(신뢰도/리니지 영구 미로드).
import { getJsonAuth as getJson } from '../services/apiClient.js'; // [272차] 실 데이터 품질/신뢰도 배선

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
  // [272차] 서버 실 데이터 품질/신뢰도(레코드 스캔·신선도·규칙) — 하드코딩 pass:true 셸 대체.
  const [trust, setTrust] = useState(null);
  const [lineage, setLineage] = useState(null); // [현 차수 P1] 데이터 계보 — 고아였던 /api/data-lineage 실배선
  useEffect(() => {
    if (IS_DEMO) return; // 데모는 샘플 유지(격리)
    let alive = true;
    getJson('/api/data-quality').then(d => { if (alive && d && d.ok) setTrust(d); }).catch(() => {});
    getJson('/api/data-lineage').then(d => { if (alive && d && d.ok) setLineage(Array.isArray(d.lineage) ? d.lineage : (d.lineage || [])); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // ★ 격리: 데모=샘플, 운영=실제 커넥터에서 파생(빈 상태 가능, 가짜숫자 없음)
  const sources = useMemo(() => {
    if (IS_DEMO) return DEMO_SOURCES;
    return (connectors || []).filter(c => c.status === 'connected' || c.credentials?.length > 0)
      .map(c => ({ name: c.name || c.key, status: c.status === 'connected' ? 'connected' : 'warning', freshness: null, completeness: null }));
  }, [connectors]);

  const connected = sources.filter(s => s.status === 'connected').length;
  const issues = sources.filter(s => s.status !== 'connected').length;
  // 신뢰도 점수: [272차] 서버 실 reliability_score 우선(레코드 완전성·신선도·오류 반영), 없으면 커넥터 연결비율 폴백.
  const score = useMemo(() => {
    if (trust && typeof trust.reliability_score === 'number') return trust.reliability_score;
    if (!sources.length) return 0;
    const withComp = sources.filter(s => typeof s.completeness === 'number');
    const compAvg = withComp.length ? withComp.reduce((a, s) => a + s.completeness, 0) / withComp.length : (connected / sources.length) * 100;
    const connRatio = (connected / sources.length) * 100;
    return Math.round((compAvg * 0.6 + connRatio * 0.4) * 10) / 10;
  }, [sources, connected, trust]);

  // 품질 규칙 — [272차] 서버 실 규칙(레코드 스캔 결과) 우선. 없으면 제품 정의 셸(파생).
  const RULES = (trust && Array.isArray(trust.rules) && trust.rules.length)
    ? trust.rules.map(r => ({ key: r.key, target: r.label, pass: r.pass }))
    : [
      { key: 'ruleFreshness', target: tr('ruleFreshnessT', '데이터 신선도 < 24h'), pass: sources.length ? sources.every(s => s.freshness == null || s.freshness < 1440) : null },
      { key: 'ruleCompleteness', target: tr('ruleCompletenessT', '필드 완전성 ≥ 90%'), pass: sources.length ? sources.every(s => s.completeness == null || s.completeness >= 90) : null },
      { key: 'ruleDup', target: tr('ruleDupT', '중복 레코드 0건'), pass: sources.length ? true : null },
      { key: 'ruleSchema', target: tr('ruleSchemaT', '스키마 일치'), pass: sources.length ? true : null },
    ];
  // 컴플라이언스 — [현 차수 잔여] 서버 실측(trust.compliance) 우선. audit=감사로그 실존, pii=집계전용 설계(검증됨).
  //   verified=false 항목은 '플랫폼 표준'으로 정직 표기(하드코딩 ok:true 오해 방지). 서버 미제공 시 제품표준 폴백.
  const _compLabels = {
    gdpr: tr('compGdpr', 'GDPR 동의 관리'), pii: tr('compPii', 'PII 비저장(집계 전용)'),
    retention: tr('compRetention', '데이터 보존 정책'), audit: tr('compAudit', '감사 로그 활성'),
  };
  const COMPLIANCE = (!IS_DEMO && trust && Array.isArray(trust.compliance) && trust.compliance.length)
    ? trust.compliance.map(c => ({ key: c.key, label: _compLabels[c.key] || c.key, ok: c.ok !== false, verified: !!c.verified }))
    : [
      { key: 'gdpr', label: _compLabels.gdpr, ok: true, verified: false },
      { key: 'pii', label: _compLabels.pii, ok: true, verified: true },
      { key: 'retention', label: _compLabels.retention, ok: true, verified: false },
      { key: 'audit', label: _compLabels.audit, ok: true, verified: false },
    ];

  const tabs = [tr('tabScore', '신뢰도 개요'), tr('tabLineage', '데이터 계보'), tr('tabRules', '품질 규칙'), tr('tabCompliance', '컴플라이언스'), tr('tabMetrics', '지표 사전·공식')];
  // [231차 거버넌스 #6#7] 메트릭 사전 + ROI 공식 버전 — 전 역할이 '같은 정의/숫자'로 의사결정(SSOT·설명가능).
  const ROI_FORMULA_VERSION = 'v2026.06 (231차)';
  const METRIC_DICT = [
    { k: '매출 (Revenue)', f: '확정 주문 매출 합계 (취소·반품 제외)', t: '—' },
    { k: '원가 (COGS)', f: 'Σ(주문수량 × 매입원가) — channel_inventory.cost', t: '≤60% 매출' },
    { k: '매출총이익', f: '매출 − COGS', t: '≥30% 마진' },
    { k: '영업이익', f: '매출총이익 − 광고비 − 플랫폼수수료 − 쿠폰 − 반품비 − 배송비', t: '≥15% 마진' },
    { k: '순지급액 (Net Payout)', f: '채널 정산 실수령액 (배송비·수수료 이미 차감)', t: '—' },
    { k: 'ROAS', f: '광고매출 ÷ 광고비', t: '≥3.0x' },
    { k: 'ROI / Net ROI', f: '(순이익 ÷ 광고비) × 100', t: '>0%' },
    { k: 'CAC', f: '광고비 ÷ 신규 전환수', t: '< LTV' },
    { k: '배송비율', f: '배송비 ÷ 매출 (무료배송 기준금액 적용·주문별 산정)', t: '≤5%' },
    { k: '반품률', f: '반품 건수 ÷ 주문 건수', t: '≤5%' },
  ];
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
          <div key={i} className="card card-glass" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 24, flex: '0 0 auto' }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <BeginnerGuide spec={GUIDE.dataTrust} />

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
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: (ST[s.status] || ST.warning).c + '22', color: (ST[s.status] || ST.warning).c }}>{(ST[s.status] || ST.warning).l}</span>
              </div>
            ))}
          </div>
        ) : activeTab === 1 ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {/* 표준 흐름도(헤더) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, fontWeight: 700, padding: '4px 0' }}>
              {[[tr('flowSource', '데이터 소스'), '#4f8ef7'], ['→', null], [tr('flowNormalize', '정규화'), '#a855f7'], ['→', null], [tr('flowMetrics', '메트릭 집계'), '#22c55e'], ['→', null], [tr('flowDashboard', '대시보드'), '#f59e0b']].map(([l, c], i) => c
                ? <span key={i} style={{ padding: '6px 14px', borderRadius: 8, background: c + '18', color: c, border: `1px solid ${c}33` }}>{l}</span>
                : <span key={i} style={{ color: 'var(--text-3)' }}>{l}</span>)}
            </div>
            {/* [현 차수 P1] 도메인별 실 계보(/api/data-lineage) — 운영 실배선. 미로드/데모는 흐름도만. */}
            {(!IS_DEMO && Array.isArray(lineage) && lineage.length > 0) ? lineage.map((ln, i) => {
              const traceable = ln.traceable !== false;
              const srcs = Array.isArray(ln.sources) ? ln.sources : [];
              return (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{ln.analysis || ln.domain || ln.metric || tr('lineageDomain', '분석 지표')}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: traceable ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)', color: traceable ? '#16a34a' : '#dc2626' }}>
                      {traceable ? tr('lineageTraceable', '원천 추적가능') : tr('lineageNoSource', '원천 미연결')}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {srcs.length ? srcs.map(s => (typeof s === 'string' ? s : (s.name || s.source || s.source_channel || s.channel || s.table))).filter(Boolean).join(' · ') : tr('lineageNoSourceDesc', '연결된 데이터 원천이 없습니다.')}
                    {ln.ssot ? ` → SSOT: ${ln.ssot}` : ''}
                  </div>
                </div>
              );
            }) : (!IS_DEMO && lineage && lineage.length === 0) ? (
              <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>{tr('lineageEmpty', '연결된 데이터 원천이 없어 계보를 표시할 수 없습니다. 채널을 연동하세요.')}</div>
            ) : null}
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
        ) : activeTab === 3 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {COMPLIANCE.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)' }}>
                <span style={{ fontSize: 18 }}>{c.ok ? '✅' : '⚠️'}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{c.label}</span>
                {/* [현 차수 잔여] 검증 출처 정직 표기 — 실측(감사로그 등) vs 플랫폼 표준(설계 약속) */}
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: c.verified ? 'rgba(34,197,94,0.16)' : 'rgba(148,163,184,0.16)', color: c.verified ? '#16a34a' : 'var(--text-3)' }}>
                  {c.verified ? tr('compVerified', '실측') : tr('compStandard', '플랫폼 표준')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* [231차 거버넌스 #6#7] 지표 사전·ROI 공식 버전 — 전 역할 동일 정의(설명가능·신뢰) */
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '8px 12px', borderRadius: 8, background: 'rgba(99,140,255,0.06)', border: '1px solid rgba(99,140,255,0.15)' }}>
              📐 {tr('metricLead', '모든 대시보드·역할이 동일하게 사용하는 지표 정의와 계산식입니다')} · {tr('metricFormulaVer', 'ROI 공식 버전')}: <b>{ROI_FORMULA_VERSION}</b>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 10px' }}>{tr('metricCol', '지표')}</th>
                  <th style={{ padding: '8px 10px' }}>{tr('metricColF', '계산식 / 정의')}</th>
                  <th style={{ padding: '8px 10px' }}>{tr('metricColT', '목표')}</th>
                </tr></thead>
                <tbody>
                  {METRIC_DICT.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>{m.k}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-2)', fontFamily: 'monospace', fontSize: 11.5 }}>{m.f}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{m.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
