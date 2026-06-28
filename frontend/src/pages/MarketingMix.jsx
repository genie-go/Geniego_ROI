import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/index.js';
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js';

/*
 * MarketingMix — ② 마케팅 믹스 모델(MMM) + 예측 예산 최적화.
 *   performance_metrics 기반 채널 반응곡선(애드스톡+포화) 적합 → 기여도·한계ROAS·포화 시각화
 *   + 총 일예산 입력 시 그리디 한계배분으로 최적 예산 배분 추천(예측 매출 리프트).
 */

const fmtKRW = (n) => '₩' + Math.round(Number(n) || 0).toLocaleString('ko-KR');
const CH_COLOR = ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
// 채널명은 라틴/브랜드 표기로 언어 중립화(전 언어 공통).
const chName = (c) => ({ meta_ads: 'Meta', google_ads: 'Google', tiktok_business: 'TikTok', naver_sa: 'Naver SA', kakao_moment: 'Kakao', coupang: 'Coupang', snapchat: 'Snapchat', snapchat_ads: 'Snapchat', linkedin: 'LinkedIn', linkedin_ads: 'LinkedIn', criteo: 'Criteo', pinterest: 'Pinterest', pinterest_ads: 'Pinterest' }[c] || c);

/* 반응곡선 SVG — revenue = beta*(1-exp(-x/kappa)), 현재 지점 마커 */
function ResponseCurve({ ch, color, w = 260, h = 110, nowLabel = 'now' }) {
  const beta = Number(ch.beta) || 0, kappa = Number(ch.kappa) || 1;
  const cur = Number(ch.current_daily_spend) || 0;
  const xMax = Math.max(cur * 2.6, kappa * 3, 1);
  const yMax = beta * (1 - Math.exp(-xMax / kappa)) || 1;
  const pad = 6;
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = (xMax * i) / 40;
    const y = beta * (1 - Math.exp(-x / kappa));
    const px = pad + (x / xMax) * (w - pad * 2);
    const py = h - pad - (y / yMax) * (h - pad * 2);
    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
  }
  const curPx = pad + (cur / xMax) * (w - pad * 2);
  const curPy = h - pad - (beta * (1 - Math.exp(-cur / kappa)) / yMax) * (h - pad * 2);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" />
      <line x1={curPx} y1={pad} x2={curPx} y2={h - pad} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={curPx} cy={curPy} r="4.5" fill={color} stroke="#fff" strokeWidth="1.5" />
      <text x={curPx + 6} y={curPy - 6} fontSize="9" fill="#64748b">{nowLabel}</text>
    </svg>
  );
}

export default function MarketingMix() {
  const { t, lang } = useI18n();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [window, setWin] = useState(90);
  const [budget, setBudget] = useState('');
  const [opt, setOpt] = useState(null);
  const [optBusy, setOptBusy] = useState(false);
  const [anom, setAnom] = useState(null); // [현 차수] 이상감지(SPC)
  const [bayes, setBayes] = useState(null); // [차기 P1] 정식 Bayesian MMM(MCMC) 사후분포
  const [insight, setInsight] = useState(null); // [현 차수] 자연어 AI 인사이트
  const [insightBusy, setInsightBusy] = useState(false);

  const runInsight = async () => {
    setInsightBusy(true); setInsight(null);
    try { setInsight(await postJsonAuth('/v422/ai/marketing-insight', { lang })); }
    catch (e) { setInsight({ ok: false, error: String(e?.message || e) }); }
    finally { setInsightBusy(false); }
  };

  const loadModel = useCallback(() => {
    setLoading(true);
    getJsonAuth(`/v424/mmm/model?window=${window}`).then(d => { setModel(d); setLoading(false); })
      .catch(() => { setModel(null); setLoading(false); });
    getJsonAuth(`/v424/anomaly/scan?window=${Math.min(window, 90)}`).then(d => setAnom(d)).catch(() => setAnom(null));
    getJsonAuth(`/v424/mmm/bayesian?window=${window}&method=mcmc`).then(d => setBayes(d)).catch(() => setBayes(null));
  }, [window]);
  useEffect(() => { loadModel(); }, [loadModel]);

  const channels = model?.channels || [];
  const curDailyTotal = useMemo(() => channels.reduce((a, c) => a + (Number(c.current_daily_spend) || 0), 0), [channels]);

  const runOptimize = async () => {
    setOptBusy(true); setOpt(null);
    try {
      const daily = budget ? Math.round(Number(String(budget).replace(/[^0-9]/g, ''))) : Math.round(curDailyTotal);
      const r = await postJsonAuth('/v424/mmm/optimize', { window, daily_budget: daily });
      setOpt(r);
    } catch (e) { setOpt({ ok: false, error: String(e?.message || e) }); }
    finally { setOptBusy(false); }
  };

  const card = { background: '#fff', border: '1px solid #e9eef5', borderRadius: 16, padding: 20, boxShadow: '0 4px 18px rgba(15,23,42,0.05)' };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 20px', color: '#0f172a', fontFamily: "'Pretendard','Inter',system-ui,sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
        <h1 style={{ fontSize: 23, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>📐 {t('mmm.title', '마케팅 믹스 모델 (MMM) · 예산 최적화')}</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {[30, 60, 90, 180].map(d => (
            <button key={d} onClick={() => setWin(d)} style={{ padding: '6px 12px', borderRadius: 8, border: window === d ? '2px solid #4f46e5' : '1px solid #e2e8f0', background: window === d ? 'rgba(79,70,229,0.1)' : '#fff', color: window === d ? '#4f46e5' : '#64748b', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{d}{t('mmm.daysUnit', '일')}</button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7, margin: '0 0 18px', maxWidth: 820 }}>
        {t('mmm.desc', '채널별 광고비-매출 반응곡선을 애드스톡(이월효과)·포화(한계효용 체감)로 적합해, 각 채널의 기여도·현재 한계ROAS·포화수준을 산출합니다. 총 예산을 입력하면 한계수익이 높은 채널로 최적 배분해 예측 매출을 극대화합니다.')}
      </p>

      {model?.demo && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: 12.5, marginBottom: 16, position: 'sticky', top: 0, zIndex: 20 }}>
          ⓘ {t('mmm.demoNote', '데모 환경 — 합성 곡선으로 기능을 체험합니다. 실제 운영에서는 수집된 성과 데이터로 적합됩니다.')}
        </div>
      )}

      {/* [현 차수] 이상 감지(SPC) — 실시간 경보 */}
      {anom && anom.ok && (anom.anomalies || []).length > 0 && (
        <div style={{ ...card, marginBottom: 18, borderColor: 'rgba(239,68,68,0.3)', background: 'linear-gradient(135deg,#fff7ed,#fef2f2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 15 }}>🚨 {t('mmm.anomTitle', '이상 감지 (SPC) · 실시간 경보')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', background: 'rgba(239,68,68,0.12)', padding: '3px 10px', borderRadius: 99 }}>{t('mmm.sevCritical', '심각')} {anom.summary?.critical || 0}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#d97706', background: 'rgba(245,158,11,0.12)', padding: '3px 10px', borderRadius: 99 }}>{t('mmm.sevWarning', '경고')} {anom.summary?.warning || 0}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {anom.anomalies.slice(0, 8).map((a, i) => {
              const sev = a.severity === 'critical';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 10, background: '#fff', border: '1px solid ' + (sev ? '#fecaca' : '#fed7aa') }}>
                  <span style={{ fontSize: 10.5, fontWeight: 900, color: '#fff', background: sev ? '#dc2626' : '#f59e0b', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{sev ? t('mmm.sevCritical', '심각') : t('mmm.sevWarning', '경고')}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, minWidth: 70 }}>{chName(a.channel)}</span>
                  <span style={{ fontSize: 12.5, color: '#334155' }}>
                    <b>{a.metric_label}</b> {a.direction} — {a.value}{a.unit} <span style={{ color: '#94a3b8' }}>(기준 {a.expected}{a.unit}, {a.sigma}σ)</span>
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>{a.date}</span>
                  <div style={{ width: '100%', fontSize: 11.5, color: '#b45309' }}>↳ {a.action}</div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 8 }}>🔬 {t('mmm.anomMethod', '방법: 채널별 ROAS·CPA·지출·CTR·CVR 시계열에 관리도(μ±σ) + Western Electric 규칙(±3σ/연속이탈) 적용. 정책 없이 통계적으로 급변·드리프트 자동 탐지.')}</div>
        </div>
      )}

      {/* [현 차수] 자연어 인사이트(AI 리포트) */}
      <div style={{ ...card, marginBottom: 18, background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)', border: '1px solid #ddd6fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>🤖 {t('mmm.aiTitle', 'AI 인사이트 리포트')}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{t('mmm.aiDesc', 'MMM·이상감지·성과 데이터를 종합해 경영진용 요약·원인·권장 액션을 자연어로 생성합니다.')}</div>
          </div>
          <button onClick={runInsight} disabled={insightBusy} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: insightBusy ? '#cbd5e1' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: insightBusy ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
            {insightBusy ? t('mmm.aiGenerating', '생성 중…') : `✨ ${t('mmm.aiGenerate', 'AI 리포트 생성')}`}
          </button>
        </div>
        {insight && insight.ok && insight.insight && (
          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #eef2f7' }}>
            <div style={{ fontSize: 13.5, color: '#1e293b', lineHeight: 1.8, fontWeight: 600 }}>{insight.insight.summary}</div>
            {Array.isArray(insight.insight.bullets) && insight.insight.bullets.length > 0 && (
              <ul style={{ margin: '12px 0 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
                {insight.insight.bullets.map((b, i) => <li key={i} style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>{b}</li>)}
              </ul>
            )}
            {insight.insight.recommendation && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12.5, color: '#166534' }}>
                <b>✅ {t('mmm.recActionLabel', '권장 액션')}:</b> {insight.insight.recommendation}
              </div>
            )}
            {Array.isArray(insight.insight.risks) && insight.insight.risks.length > 0 && (
              <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                {insight.insight.risks.map((r, i) => <div key={i} style={{ fontSize: 12, color: '#b91c1c' }}>⚠ {r}</div>)}
              </div>
            )}
            <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 10 }}>{insight.ai ? '🤖 ' + t('mmm.aiByClaude', 'Claude AI 생성') : 'ℹ ' + (insight.note || t('mmm.aiRuleBased', '규칙 기반 요약'))}</div>
          </div>
        )}
        {insight && !insight.ok && <div style={{ marginTop: 12, color: '#dc2626', fontSize: 12.5 }}>⚠ {insight.error}</div>}
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>{t('common.loading', '적합 중…')}</div>
      ) : channels.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: '#64748b', lineHeight: 1.8 }}>
          {model?.note || t('mmm.empty', '성과 데이터가 아직 충분하지 않습니다. 채널을 집행·수집하면 자동으로 반응곡선이 적합됩니다.')}
        </div>
      ) : (
        <>
          {/* 예산 최적화 패널 */}
          <div style={{ ...card, marginBottom: 18, background: 'linear-gradient(135deg,#eef2ff,#faf5ff)', border: '1px solid #ddd6fe' }}>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 12 }}>🎯 {t('mmm.optTitle', '예측 예산 최적화')}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>{t('mmm.dailyBudget', '총 일 예산 (원)')}</div>
                <input value={budget} onChange={e => setBudget(e.target.value.replace(/[^0-9]/g, ''))} placeholder={String(Math.round(curDailyTotal))}
                  style={{ width: 200, padding: '10px 14px', borderRadius: 10, border: '1px solid #c7d2fe', fontSize: 14, fontWeight: 700, background: '#fff', boxSizing: 'border-box' }} />
                <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>{t('mmm.curDaily', '현재 일 지출 합')}: {fmtKRW(curDailyTotal)}</div>
              </div>
              <button onClick={runOptimize} disabled={optBusy} style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: optBusy ? '#cbd5e1' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: optBusy ? 'default' : 'pointer', height: 42 }}>
                {optBusy ? t('mmm.optimizing', '최적화 중…') : `🚀 ${t('mmm.optimize', '최적 배분 계산')}`}
              </button>
            </div>
            {opt && opt.ok && opt.optimized && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
                  <div style={{ padding: '12px 18px', borderRadius: 12, background: '#fff', border: '1px solid #eef2f7' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{t('mmm.predCurrent', '현재 배분 예측 월매출')}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#64748b' }}>{fmtKRW(opt.pred_monthly_revenue_current)}</div>
                  </div>
                  <div style={{ padding: '12px 18px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>{t('mmm.predOpt', '최적 배분 예측 월매출')}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>{fmtKRW(opt.pred_monthly_revenue_optimized)}</div>
                  </div>
                  <div style={{ padding: '12px 18px', borderRadius: 12, background: opt.lift_pct >= 0 ? '#eef2ff' : '#fef2f2', border: '1px solid ' + (opt.lift_pct >= 0 ? '#c7d2fe' : '#fecaca') }}>
                    <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}>{t('mmm.lift', '예상 매출 개선')}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: opt.lift_pct >= 0 ? '#4f46e5' : '#dc2626' }}>{opt.lift_pct >= 0 ? '+' : ''}{opt.lift_pct}%</div>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: '#64748b', fontSize: 11, textAlign: 'right' }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>{t('mmm.channel', '채널')}</th>
                        <th style={{ padding: '6px 8px' }}>{t('mmm.current', '현재 일예산')}</th>
                        <th style={{ padding: '6px 8px' }}>{t('mmm.recommended', '추천 일예산')}</th>
                        <th style={{ padding: '6px 8px' }}>{t('mmm.change', '증감')}</th>
                        <th style={{ padding: '6px 8px' }}>{t('mmm.marginalRoas', '한계ROAS')}</th>
                        <th style={{ padding: '6px 8px' }}>{t('mmm.saturation', '포화')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opt.allocations.map((a, i) => (
                        <tr key={a.channel} style={{ borderTop: '1px solid #eef2f7', textAlign: 'right' }}>
                          <td style={{ textAlign: 'left', padding: '8px', fontWeight: 800 }}><span style={{ color: CH_COLOR[i % CH_COLOR.length] }}>●</span> {chName(a.channel)}</td>
                          <td style={{ padding: '8px', color: '#64748b' }}>{fmtKRW(a.current_daily)}</td>
                          <td style={{ padding: '8px', fontWeight: 800 }}>{fmtKRW(a.recommended_daily)}</td>
                          <td style={{ padding: '8px', fontWeight: 700, color: a.delta > 0 ? '#16a34a' : a.delta < 0 ? '#dc2626' : '#94a3b8' }}>{a.delta > 0 ? '▲' : a.delta < 0 ? '▼' : '–'} {fmtKRW(Math.abs(a.delta))}</td>
                          <td style={{ padding: '8px' }}>{a.marginal_roas}x</td>
                          <td style={{ padding: '8px' }}>{Math.round(a.saturation * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {opt && !opt.ok && <div style={{ marginTop: 10, color: '#dc2626', fontSize: 12.5 }}>⚠ {opt.error || opt.reason}</div>}
            {opt && opt.ok && !opt.optimized && <div style={{ marginTop: 10, color: '#64748b', fontSize: 12.5 }}>{opt.reason}</div>}
          </div>

          {/* [P4] Robyn식 모델 진단 — DECOMP.RSSD(지출↔효과 정합) + 지출가중 R² */}
          {model?.model_diagnostics?.decomp_rssd != null && (() => {
            const d = model.model_diagnostics;
            const gColor = { excellent: '#16a34a', good: '#0891b2', fair: '#d97706', poor: '#dc2626' }[d.grade] || '#64748b';
            const gLabel = { excellent: t('mmm.diagExcellent', '우수'), good: t('mmm.diagGood', '양호'), fair: t('mmm.diagFair', '보통'), poor: t('mmm.diagPoor', '주의') }[d.grade] || d.grade;
            return (
              <div style={{ background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.18)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>🧪 {t('mmm.diagTitle', '모델 적합 진단 (Robyn식)')}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: gColor + '1a', color: gColor }}>{gLabel}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 12 }}>
                    <span><b style={{ color: gColor }}>DECOMP.RSSD</b> {d.decomp_rssd}</span>
                    <span><b style={{ color: '#4f8ef7' }}>{t('mmm.diagAvgR2', '지출가중 R²')}</b> {d.avg_r2}</span>
                    {d.avg_nrmse != null && <span><b style={{ color: '#7c3aed' }}>NRMSE</b> {d.avg_nrmse}</span>}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 7, lineHeight: 1.6 }}>
                  {t('mmm.diagHint', 'DECOMP.RSSD는 채널 지출비중과 모델 효과비중의 거리입니다(낮을수록 지출↔효과 정합·과적합 위험↓). 거리가 큰 채널은 모델이 효과를 과대/과소 추정하는 신호입니다.')}
                </div>
                {Array.isArray(d.channels) && d.channels.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {d.channels.slice(0, 6).map((r, i) => (
                      <span key={i} style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}>
                        {r.channel}: {r.distance > 0 ? '▲' : r.distance < 0 ? '▼' : '＝'} {Math.abs(r.distance * 100).toFixed(1)}%p
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* 채널 반응곡선 카드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
            {channels.map((c, i) => {
              const color = CH_COLOR[i % CH_COLOR.length];
              return (
                <div key={c.channel} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 15 }}><span style={{ color }}>●</span> {chName(c.channel)}</div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 700 }}>{t('mmm.fit', '적합도')} R²={c.r2}</div>
                  </div>
                  <ResponseCurve ch={c} color={color} nowLabel={t('mmm.nowMarker', '현재')} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 10 }}>
                    {[
                      { l: t('mmm.contribShare', '기여 비중'), v: Math.round((c.contribution_share || 0) * 100) + '%' },
                      { l: t('mmm.currentRoas', '현재 ROAS'), v: c.current_roas + 'x' },
                      { l: t('mmm.marginalRoas', '한계 ROAS'), v: c.marginal_roas + 'x' },
                      { l: t('mmm.saturation', '포화 수준'), v: Math.round(c.saturation * 100) + '%' },
                    ].map(m => (
                      <div key={m.l} style={{ padding: '8px 10px', borderRadius: 10, background: '#f8fafc', border: '1px solid #eef2f7' }}>
                        <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>{m.l}</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, height: 6, borderRadius: 99, background: '#eef2f7', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(c.saturation * 100)}%`, height: '100%', background: c.saturation > 0.8 ? '#ef4444' : color }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 5 }}>
                    {c.saturation > 0.8 ? t('mmm.satHigh', '포화 — 추가 지출 효율 낮음') : c.saturation < 0.4 ? t('mmm.satLow', '여유 — 증액 시 효율 높음') : t('mmm.satMid', '적정 구간')}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 14 }}>🔬 {t('mmm.method', '방법: 채널별 일자 spend→revenue 데이터에 애드스톡(기하감쇠 λ)+포화(β·(1−exp(−x/κ))) 곡선을 최소제곱 적합. 한계ROAS=dRev/dSpend, 최적화=오목곡선 그리디 한계배분.')}</div>

          {/* [차기 P1] 정식 Bayesian MMM(MCMC) — 채널별 기여도 사후분포 95% 신뢰구간·신뢰도·수렴진단 */}
          {bayes && bayes.ok && Array.isArray(bayes.channels) && bayes.channels.length > 0 && (() => {
            const maxHi = Math.max(...bayes.channels.map(c => Number(c.ci_hi) || 0), 1);
            const gradeColor = (tr) => tr >= 0.7 ? '#16a34a' : tr >= 0.45 ? '#d97706' : '#dc2626';
            return (
              <div style={{ ...card, marginTop: 18, borderColor: '#ddd6fe', background: 'linear-gradient(135deg,#faf5ff,#eef2ff)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>🎲 {t('mmm.bayesTitle', '정식 Bayesian MMM — 기여도 사후분포 (95% 신뢰구간)')}</div>
                  {bayes.channels.some(c => c.inference === 'mcmc') && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#6d28d9', background: 'rgba(124,58,237,0.12)', padding: '3px 10px', borderRadius: 99 }}>MCMC · 2-chain</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.6 }}>{t('mmm.bayesDesc', '(β·κ·λ·σ) 전 파라미터를 Metropolis-Hastings MCMC로 결합 사후표본화해 곡선형태 불확실성까지 반영한 일 기여매출의 95% 신뢰구간·신뢰도(trust)·수렴진단(R̂)을 제공합니다.')}</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {bayes.channels.map((c, i) => {
                    const color = CH_COLOR[i % CH_COLOR.length];
                    const lo = Number(c.ci_lo) || 0, hi = Number(c.ci_hi) || 0, mean = Number(c.posterior_mean) || 0;
                    const loPct = (lo / maxHi) * 100, hiPct = (hi / maxHi) * 100, meanPct = (mean / maxHi) * 100;
                    return (
                      <div key={c.channel} style={{ padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #eef2f7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                          <div style={{ fontWeight: 800, fontSize: 13 }}><span style={{ color }}>●</span> {chName(c.channel)}</div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: gradeColor(c.trust) }}>{t('mmm.bayesTrust', '신뢰도')} {Math.round((c.trust || 0) * 100)}%</span>
                            {c.rhat != null && (
                              <span title={t('mmm.bayesRhatTip', '겔만-루빈 수렴진단 — 1.1 이하면 수렴')} style={{ fontSize: 10, fontWeight: 800, color: c.converged ? '#16a34a' : '#d97706', background: c.converged ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)', padding: '2px 7px', borderRadius: 99 }}>
                                R̂={c.rhat}{c.converged ? ' ✓' : ''}
                              </span>
                            )}
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{c.stability === 'high' ? t('mmm.bayesStable', '안정') : c.stability === 'medium' ? t('mmm.bayesMid', '보통') : t('mmm.bayesVolatile', '변동')}</span>
                          </div>
                        </div>
                        {/* 신뢰구간 막대: [ci_lo ─●(mean)─ ci_hi] */}
                        <div style={{ position: 'relative', height: 14, marginTop: 4 }}>
                          <div style={{ position: 'absolute', top: 6, left: `${loPct}%`, width: `${Math.max(0.5, hiPct - loPct)}%`, height: 4, borderRadius: 99, background: color, opacity: 0.35 }} />
                          <div style={{ position: 'absolute', top: 3, left: `calc(${meanPct}% - 4px)`, width: 8, height: 8, borderRadius: 99, background: color, border: '1.5px solid #fff', boxShadow: '0 0 0 1px ' + color }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>
                          <span>{fmtKRW(lo)}</span>
                          <span style={{ fontWeight: 800, color: '#475569' }}>{t('mmm.bayesMean', '사후평균')} {fmtKRW(mean)}/{t('mmm.daysUnit', '일')}</span>
                          <span>{fmtKRW(hi)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 10 }}>🔬 {bayes.method || t('mmm.bayesMethod', 'Metropolis-Hastings MCMC(2 체인, β·κ·λ·σ 결합사후, R̂ 수렴진단)')}</div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
