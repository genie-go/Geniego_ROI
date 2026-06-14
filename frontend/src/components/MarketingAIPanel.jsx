// ══════════════════════════════════════════════════════════════════════
//  📊 MarketingAIPanel — Claude AI 마케팅 Analysis 패널 (Enterprise Grade)
//  5섹션: 노출(Reach) / 참여(Engagement) / 트래픽(Traffic)
//        / 전환(Conversion) / Revenue·ROI
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/index.js';
import { secureFetch } from '../security/SecurityGuard.js';

const API = '/api';
const GRADE_COL = { S: '#ffd700', A: '#4f8ef7', B: '#22c55e', C: '#f97316', D: '#f87171' };

// [항목3·4] 패널 로컬 다국어 사전(ko/en 정본, 그 외 언어는 en 폴백 — 로케일 파일 미오염).
const AIM_FB = {
  ko: {
    title: 'AI 광고 성과 분석',
    syncedNote: '{ch}개 채널 × {camp}개 캠페인 실시간 동기화됨',
    liveSpend: '실시간 광고비', liveRevenue: '실시간 광고매출', liveRoas: '실시간 ROAS',
    guideToggle: '이 분석은 무엇인가요?',
    guidePurpose: '목적 — 연동된 전체 광고 채널의 성과를 종합 채점하고, 채널·예산 개선 액션을 추천합니다.',
    guideData: '분석 데이터 — 모든 광고 채널(Meta·Google·TikTok·Naver·Kakao 등)의 노출·클릭·전환·광고비·매출·ROAS 등 풀 퍼널 지표(선택 기간 기준).',
    guideRubric: '채점 기준 — ROAS(35) + CTR(25) + 전환(25) + CPC효율(15) = 100점. ROAS 5x↑·CTR 3%↑·CPC ₩1,000↓·예산소진 70~90%를 우수로 평가.',
    guideResult: '결과물 — 종합 점수·등급, 채널별 강점/약점, 예산 재배분 추천, 즉시 실행 액션.',
    engineAi: '🤖 Genie AI 심층 분석', engineRule: '⚙ 규칙 기반 자동 분석',
    runBtn: '🚀 마케팅 성과 AI 심층 분석 런칭', running: '⏳ AI가 마케팅 데이터를 분석 중입니다... (15~30s)',
    historyBtn: '📜 분석 이력',
    changeTitle: '📊 기간 대비 변화 & 이상 징후', anomalyTitle: '🚨 이상 징후',
    mRevenue: '매출', mOrders: '주문수', mAov: '객단가', mReturn: '반품률', mConv: '전환',
    vsPrev: '직전 {d}일 대비', noAnomaly: '✅ 직전 기간 대비 유의미한 이상 징후 없음', interpretation: '해석',
  },
  en: {
    title: 'AI Ad Performance Analysis',
    syncedNote: '{ch} channels × {camp} campaigns synced in real time',
    liveSpend: 'Live Ad Spend', liveRevenue: 'Live Ad Revenue', liveRoas: 'Live ROAS',
    guideToggle: 'What does this analyze?',
    guidePurpose: 'Purpose — Scores the performance of all connected ad channels and recommends channel & budget actions.',
    guideData: 'Data — Full-funnel metrics (impressions, clicks, conversions, spend, revenue, ROAS) of every ad channel (Meta, Google, TikTok, Naver, Kakao…) for the selected period.',
    guideRubric: 'Scoring — ROAS(35) + CTR(25) + Conversion(25) + CPC efficiency(15) = 100. ROAS 5x+, CTR 3%+, CPC ₩1,000-, budget pacing 70–90% rated as strong.',
    guideResult: 'Output — Overall score & grade, per-channel strengths/weaknesses, budget reallocation, immediate actions.',
    engineAi: '🤖 Genie AI deep analysis', engineRule: '⚙ Rule-based automatic analysis',
    runBtn: '🚀 Launch AI Marketing Deep Analysis', running: '⏳ AI is analyzing your marketing data... (15–30s)',
    historyBtn: '📜 Analysis history',
    changeTitle: '📊 Period-over-Period Change & Anomalies', anomalyTitle: '🚨 Anomalies',
    mRevenue: 'Revenue', mOrders: 'Orders', mAov: 'AOV', mReturn: 'Return rate', mConv: 'Conversions',
    vsPrev: 'vs previous {d} days', noAnomaly: '✅ No significant anomalies vs the previous period', interpretation: 'Interpretation',
  },
};

const CARD = {
    background: 'linear-gradient(145deg, rgba(10,20,40,0.85), rgba(4,10,22,0.95))',
    border: '1px solid rgba(79,142,247,0.2)',
    borderRadius: 16,
    padding: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    marginBottom: 16
};

// ── 서브 컴포넌트 ───────────────────────────────────────────────────────
function ScoreBar({ label, v, max, col }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontWeight: 700 }}>
                <span style={{ color: 'var(--text-2)', letterSpacing: 0.5 }}>{label}</span>
                <span style={{ fontWeight: 900, color: col }}>
                    {v}<span style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>/{max}</span>
                </span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                    width: `${Math.min((v / max) * 100, 100)}%`, height: '100%',
                    background: `linear-gradient(90deg, ${col}, ${col}dd)`, borderRadius: 3,
                    boxShadow: `0 0 10px ${col}88`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
export default function MarketingAIPanel({ channels = {}, campaigns = [], comparison = null, style = {} }) {
    const { t, lang } = useI18n();
    const tx = useCallback((k, vars) => {
        let s = (AIM_FB[lang] && AIM_FB[lang][k]) || AIM_FB.en[k] || AIM_FB.ko[k] || k;
        if (vars) for (const vk of Object.keys(vars)) s = s.replace(`{${vk}}`, vars[vk]);
        return s;
    }, [lang]);
    const [status, setStatus] = useState('idle'); // idle|loading|done|error
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState(null);
    const [meta, setMeta] = useState({ tokens: 0, model: '' });
    const [showGuide, setShowGuide] = useState(false);

    // ─ 5섹션 데이터직렬화 ────────────────────────────────────────────────
    const buildPayload = useCallback(() => {
        const chArr = Object.entries(channels).map(([key, ch]) => ({
            channel: ch.name || key,
            impressions: ch.impressions ?? 0,
            reach: ch.reach ?? Math.round((ch.impressions ?? 0) * 0.72),
            frequency: ch.frequency ?? +((ch.impressions ?? 1) / Math.max(ch.reach ?? 1, 1)).toFixed(2),
            cpm: ch.cpm ?? (ch.spend && ch.impressions ? Math.round(ch.spend / ch.impressions * 1000) : 0),
            ad_spend: ch.spend ?? 0,
            clicks: ch.clicks ?? 0,
            ctr: ch.ctr ?? (ch.clicks && ch.impressions ? +((ch.clicks / ch.impressions) * 100).toFixed(2) : 0),
            likes: ch.likes ?? 0,
            comments: ch.comments ?? 0,
            shares: ch.shares ?? 0,
            video_views: ch.videoViews ?? ch.video_views ?? 0,
            view_rate: ch.viewRate ?? ch.view_rate ?? 0,
            cpc: ch.cpc ?? (ch.spend && ch.clicks ? Math.round(ch.spend / Math.max(ch.clicks, 1)) : 0),
            landing_views: ch.landingViews ?? ch.clicks ?? 0,
            bounce_rate: ch.bounceRate ?? 45,
            sessions: ch.sessions ?? ch.clicks ?? 0,
            avg_session_time: ch.avgSessionTime ?? 120,
            conversions: ch.conversions ?? ch.conv ?? 0,
            conv_rate: ch.convRate ?? (ch.clicks && ch.conversions ? +((ch.conversions / ch.clicks) * 100).toFixed(2) : 0),
            cpa: ch.cpa ?? (ch.spend && ch.conversions ? Math.round(ch.spend / Math.max(ch.conversions, 1)) : 0),
            purchases: ch.purchases ?? ch.conversions ?? 0,
            signups: ch.signups ?? 0,
            cart_adds: ch.cartAdds ?? 0,
            revenue: ch.revenue ?? 0,
            roas: ch.roas ?? (ch.spend && ch.revenue ? +(ch.revenue / ch.spend).toFixed(2) : 0),
            ad_types: ch.adTypes ?? [],
            interests: ch.interests ?? [],
        }));

        const campArr = campaigns.map(c => ({
            id: c.id,
            name: c.name,
            channel: c.channel ?? '',
            objective: c.objective ?? '',
            status: c.status,
            type: c.type,
            budget: c.budget ?? 0,
            spent: c.spent ?? 0,
            revenue: c.revenue ?? 0,
            impressions: c.impressions ?? 0,
            clicks: c.clicks ?? 0,
            conversions: c.conversions ?? c.kpi?.actualConv ?? 0,
            burn_rate: c.budget > 0 ? +(c.spent / c.budget * 100).toFixed(1) : 0,
            target_roas: c.kpi?.targetRoas ?? 0,
            actual_roas: c.kpi?.actualRoas ?? (c.spent > 0 ? +((c.revenue ?? 0) / c.spent).toFixed(2) : 0),
            target_conv: c.kpi?.targetConv ?? 0,
            actual_conv: c.kpi?.actualConv ?? c.conversions ?? 0,
            cpa: c.kpi?.actualCpa ?? 0,
            channels: Object.keys(c.channels || {}),
            period: c.startDate ? `${c.startDate} ~ ${c.endDate}` : '',
        }));

        const payload = { channels: chArr, campaigns: campArr };
        if (comparison && comparison.current && comparison.previous) payload.comparison = comparison;
        return { data: payload };
    }, [channels, campaigns, comparison]);

    const runAnalysis = useCallback(async () => {
        setStatus('loading'); setResult(null);
        try {
            const payload = buildPayload();
            // Using secureFetch for enterprise security requirements
            const res = await secureFetch(`${API}/v422/ai/marketing-eval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || 'Analysis 실패');
            setResult(data.result);
            setMeta({ tokens: data.tokens_used, model: data.model });
            setStatus('done');
        } catch (e) {
            setStatus('error');
            setResult({ error: e.message || '서버 연결에 실패했습니다.' });
        }
    }, [buildPayload]);

    const loadHistory = useCallback(async () => {
        try {
            const r = await secureFetch(`${API}/v422/ai/analyses?context=marketing_eval&limit=5`, { credentials: 'include' });
            const d = await r.json();
            setHistory(d.analyses || []);
        } catch { setHistory([]); }
    }, []);

    const chCount = Object.keys(channels).length;
    const campCount = campaigns.length;

    // Real-time summary for enterprise display before analysis
    const realTimeSnap = useMemo(() => {
        let spend = 0, rev = 0, conv = 0;
        Object.values(channels).forEach(c => {
            spend += (c.spend || 0);
            rev += (c.revenue || 0);
            conv += (c.conversions || 0);
        });
        const r = spend > 0 ? (rev / spend).toFixed(2) : '0.00';
        return { spend, rev, conv, roas: r };
    }, [channels]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 10, ...style }}>
            {/* ── 상단 헤더 & 컨트롤 패널 ── */}
            <div style={CARD}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🤖</span>
                            <span style={{ background: 'linear-gradient(90deg, #fff, #4f8ef7)' }}>
                                {tx('title')}
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                            {tx('syncedNote', { ch: chCount, camp: campCount })}
                        </div>
                    </div>
                    <button onClick={() => setShowGuide(v => !v)}
                        style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        ❓ {tx('guideToggle')}
                    </button>
                </div>

                {/* [항목3] 분석 목적·데이터·기준·결과물 안내 */}
                {showGuide && (
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[['🎯', tx('guidePurpose')], ['📊', tx('guideData')], ['📐', tx('guideRubric')], ['📋', tx('guideResult')]].map(([ic, txt]) => (
                            <div key={txt} style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                                <span style={{ flexShrink: 0 }}>{ic}</span><span>{txt}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 실시간 동기화 상태 프리뷰 */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                    background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
                    marginBottom: 16
                }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>{tx('liveSpend')}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#f87171' }}>{realTimeSnap.spend.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>{tx('liveRevenue')}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>{realTimeSnap.rev.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>{tx('liveRoas')}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#4f8ef7' }}>{realTimeSnap.roas}x</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={runAnalysis} disabled={status === 'loading'}
                        style={{
                            flex: 1, padding: '12px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: status === 'loading' ? 'rgba(79,142,247,0.2)' : 'linear-gradient(135deg,#4f8ef7,#7c5cfc)',
                            color: 'var(--text-1)', fontWeight: 800, fontSize: 13, transition: 'all 0.3s ease',
                            boxShadow: status !== 'loading' ? '0 4px 20px rgba(79,142,247,0.5)' : undefined
                        }}>
                        {status === 'loading' ? tx('running') : tx('runBtn')}
                    </button>
                    <button onClick={loadHistory}
                        style={{
                            padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)',
                            background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
                        }}>
                        {tx('historyBtn')}
                    </button>
                </div>
                {meta.tokens > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>
                        Genie AI 엔진 완료 | 사용 토큰: {meta.tokens.toLocaleString()} | 모델: {meta.model}
                    </div>
                )}
            </div>

            {/* ── Error ── */}
            {status === 'error' && (
                <div style={{
                    padding: '16px 20px', borderRadius: 14, background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', gap: 12
                }}>
                    <div style={{ fontSize: 24 }}>🚨</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>Analysis Failed</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{result?.error?.slice(0,100)}... 접속이 원활하지 않습니다.</div>
                    </div>
                </div>
            )}

            {/* ── Analysis 결과 ── */}
            {status === 'done' && result && (
                <>
                    {/* All 요약 */}
                    <div style={CARD}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1.2 }}>📋 마케팅 종합 AI 결론</div>
                            <span style={{
                                fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                                background: (result.engine === 'rule-based') ? 'rgba(148,163,184,0.15)' : 'rgba(79,142,247,0.15)',
                                color: (result.engine === 'rule-based') ? '#94a3b8' : '#7eaefb',
                                border: `1px solid ${(result.engine === 'rule-based') ? 'rgba(148,163,184,0.3)' : 'rgba(79,142,247,0.3)'}`
                            }}>
                                {result.engine === 'rule-based' ? tx('engineRule') : tx('engineAi')}
                            </span>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.8, fontWeight: 500 }}>{result.summary}</div>
                        {result.top_insight && (
                            <div style={{
                                marginTop: 14, padding: '12px 16px', borderRadius: 10,
                                background: 'linear-gradient(90deg, rgba(79,142,247,0.15), rgba(79,142,247,0.05))',
                                borderLeft: '3px solid #4f8ef7',
                                fontSize: 13, color: '#7eaefb', fontWeight: 600
                            }}>
                                💡 인사이트 : <span style={{ color: 'var(--text-1)' }}>{result.top_insight}</span>
                            </div>
                        )}
                        {result.immediate_action && (
                            <div style={{
                                marginTop: 10, padding: '12px 16px', borderRadius: 10,
                                background: 'linear-gradient(90deg, rgba(74,222,128,0.12), rgba(74,222,128,0.04))',
                                borderLeft: '3px solid #4ade80',
                                fontSize: 13, color: '#4ade80', fontWeight: 700
                            }}>
                                ⚡ 즉시 액션 : <span style={{ color: 'var(--text-1)' }}>{result.immediate_action}</span>
                            </div>
                        )}
                    </div>

                    {/* [항목5] 기간 대비 변화 & 이상 징후 */}
                    {(result.change_analysis || (result.anomalies && result.anomalies.length > 0)) && (() => {
                        const ca = result.change_analysis || {};
                        const SEV = { high: '#f87171', mid: '#fbbf24', info: '#4ade80' };
                        const Delta = ({ label, v, pp }) => {
                            const up = v > 0, flat = v === 0 || v == null;
                            const col = flat ? 'var(--text-3)' : (up ? '#4ade80' : '#f87171');
                            return (
                                <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 8, padding: '8px 10px', flex: '1 1 90px' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' }}>{label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: col }}>
                                        {flat ? '—' : `${up ? '▲' : '▼'} ${Math.abs(v)}${pp ? '%p' : '%'}`}
                                    </div>
                                </div>
                            );
                        };
                        return (
                            <div style={CARD}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{tx('changeTitle')}</div>
                                {ca.period_days ? <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 10 }}>{tx('vsPrev', { d: ca.period_days })}</div> : null}
                                {result.change_analysis && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                                        <Delta label={tx('mRevenue')} v={ca.revenue_change_pct} />
                                        <Delta label={tx('mOrders')} v={ca.orders_change_pct} />
                                        <Delta label={tx('mAov')} v={ca.aov_change_pct} />
                                        {ca.conversions_change_pct != null && <Delta label={tx('mConv')} v={ca.conversions_change_pct} />}
                                        {ca.return_rate_change_pp != null && <Delta label={tx('mReturn')} v={ca.return_rate_change_pp} pp />}
                                    </div>
                                )}
                                {ca.interpretation && (
                                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.08)', borderLeft: '3px solid #4f8ef7', fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.6, marginBottom: (result.anomalies && result.anomalies.length) ? 12 : 0 }}>
                                        💡 {tx('interpretation')}: {ca.interpretation}
                                    </div>
                                )}
                                {result.anomalies && result.anomalies.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {result.anomalies.map((a, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: `${SEV[a.severity] || '#94a3b8'}14`, border: `1px solid ${SEV[a.severity] || '#94a3b8'}33` }}>
                                                <span style={{ fontSize: 10, fontWeight: 900, color: SEV[a.severity] || '#94a3b8', minWidth: 44 }}>{a.metric}</span>
                                                <span style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.45 }}>{a.note}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (result.change_analysis && (
                                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{tx('noAnomaly')}</div>
                                ))}
                            </div>
                        );
                    })()}

                    {/* 종합 점수 */}
                    {result.overall_score !== undefined && (
                        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 24 }}>
                            <div style={{ textAlign: 'center', minWidth: 90 }}>
                                <div style={{
                                    fontSize: 48, fontWeight: 900, lineHeight: 1,
                                    color: GRADE_COL[result.grade] || '#fff',
                                    textShadow: `0 0 24px ${GRADE_COL[result.grade]}66`
                                }}>
                                    {result.grade}
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: '#4f8ef7', marginTop: 4 }}>{result.overall_score}점</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>종합 평가</div>
                            </div>
                            <div style={{ flex: 1, paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
                                {(result.channels || []).map(ch => (
                                    <ScoreBar key={ch.name} label={ch.name}
                                        v={ch.score} max={100}
                                        col={ch.score >= 80 ? '#22c55e' : ch.score >= 60 ? '#f97316' : '#f87171'} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Channel별 상세 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                        {(result.channels || []).map(ch => (
                            <div key={ch.name} style={{ ...CARD, padding: '18px', borderTop: `3px solid ${GRADE_COL[ch.grade] || '#4f8ef7'}`, marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{ch.name}</div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface)', padding: '4px 10px', borderRadius: 20 }}>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: GRADE_COL[ch.grade] || '#fff' }}>{ch.grade}</span>
                                        <span style={{ fontSize: 14, fontWeight: 800, color: '#4f8ef7' }}>{ch.score}점</span>
                                    </div>
                                </div>
                                {/* 세부 점수 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                                    {Object.entries(ch.breakdown || {}).map(([k, v]) => {
                                        const LBL = { roas_score: 'ROAS', ctr_score: 'CTR', conversion_score: '전환효율', cpc_score: 'CPC효율' };
                                        const MAX = { roas_score: 35, ctr_score: 25, conversion_score: 25, cpc_score: 15 };
                                        const maxVal = MAX[k] || 35;
                                        return (
                                            <div key={k} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '8px 10px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase' }}>{LBL[k] || k}</span>
                                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#4f8ef7' }}>{v}</span>
                                                </div>
                                                <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2 }}>
                                                    <div style={{
                                                        width: `${Math.min((v / maxVal) * 100, 100)}%`, height: '100%',
                                                        background: '#4f8ef7', borderRadius: 2
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* 강점·개선 */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                    <div style={{ background: 'rgba(34,197,94,0.06)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(34,197,94,0.1)' }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: '#4ade80', marginBottom: 6 }}>▲ 강점</div>
                                        {(ch.strengths || []).map((s, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text-2)', margin: '3px 0', lineHeight: 1.4 }}>{s}</div>)}
                                    </div>
                                    <div style={{ background: 'rgba(248,113,113,0.06)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(248,113,113,0.1)' }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: '#f87171', marginBottom: 6 }}>▼ 개선</div>
                                        {(ch.weaknesses || []).map((w, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text-2)', margin: '3px 0', lineHeight: 1.4 }}>{w}</div>)}
                                    </div>
                                </div>
                                {ch.ai_recommendation && (
                                    <div style={{
                                        padding: '10px 12px', borderRadius: 8,
                                        background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)',
                                        fontSize: 12, color: '#7eaefb', fontWeight: 500
                                    }}>
                                        🎯 {ch.ai_recommendation}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Budget 재배분 추천 */}
                    {(result.budget_reallocation || []).length > 0 && (
                        <div style={CARD}>
                            <div style={{
                                fontSize: 12, fontWeight: 800, color: 'var(--text-3)',
                                marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1
                            }}>
                                💰 예산 최적화 추천
                            </div>
                            {result.budget_reallocation.map((r, i) => (
                                <div key={i} style={{ padding: '10px 0', borderBottom: i === result.budget_reallocation.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{r.channel}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', padding: '4px 10px', borderRadius: 20 }}>
                                            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{r.current_pct}%</span>
                                            <span style={{ color: 'var(--text-3)' }}>→</span>
                                            <span style={{ color: r.recommended_pct > r.current_pct ? '#4ade80' : '#f87171', fontWeight: 900, fontSize: 14 }}>
                                                {r.recommended_pct}%
                                            </span>
                                        </div>
                                    </div>
                                    {r.rationale && <div style={{ fontSize: 12, color: 'var(--text-3)', paddingLeft: 6, borderLeft: '2px solid rgba(255,255,255,0.1)' }}>{r.rationale}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── 이력 ── */}
            {history && (
                <div style={CARD}>
                    <div style={{
                        fontSize: 12, fontWeight: 800, color: 'var(--text-3)',
                        marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1
                    }}>📜 분석 이력 (최근 5건)</div>
                    {history.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>데이터가 없습니다</div>}
                    {history.map((h, i) => (
                        <div key={h.id} style={{ padding: '10px 0', borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--border)', fontSize: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: '#4f8ef7', fontWeight: 800 }}>Rep_{h.id}</span>
                                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{(h.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                            </div>
                            <div style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{(h.summary || '').slice(0, 100)}…</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
