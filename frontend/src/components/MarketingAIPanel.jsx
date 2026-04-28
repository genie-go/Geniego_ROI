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
export default function MarketingAIPanel({ channels = {}, campaigns = [], style = {} }) {
    const { t } = useI18n();
    const [status, setStatus] = useState('idle'); // idle|loading|done|error
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState(null);
    const [meta, setMeta] = useState({ tokens: 0, model: '' });

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
            status: c.status,
            type: c.type,
            budget: c.budget,
            spent: c.spent,
            burn_rate: c.budget > 0 ? +(c.spent / c.budget * 100).toFixed(1) : 0,
            target_roas: c.kpi?.targetRoas ?? 0,
            actual_roas: c.kpi?.actualRoas ?? 0,
            target_conv: c.kpi?.targetConv ?? 0,
            actual_conv: c.kpi?.actualConv ?? 0,
            cpa: c.kpi?.actualCpa ?? 0,
            channels: Object.keys(c.channels || {}),
            period: `${c.startDate} ~ ${c.endDate}`,
        }));

        return { data: { channels: chArr, campaigns: campArr } };
    }, [channels, campaigns]);

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
                                AI Marketing Intelligence
                            </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                            {chCount}개 채널 × {campCount}개 캠페인 동기화 됨 (실시간 라이브)
                        </div>
                    </div>
                </div>

                {/* 실시간 동기화 상태 프리뷰 */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                    background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)',
                    marginBottom: 16
                }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Live Spend</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#f87171' }}>{realTimeSnap.spend.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Live Revenue</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#4ade80' }}>{realTimeSnap.rev.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase' }}>Live ROAS</div>
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
                        {status === 'loading' ? '⏳ AI가 마케팅 데이터를 분석 중입니다... (15~30s)' : '🚀 마케팅 성과 AI 심층 분석 런칭'}
                    </button>
                    <button onClick={loadHistory}
                        style={{
                            padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)',
                            background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
                        }}>
                        📜 분석 이력
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
                        <div style={{
                            fontSize: 12, fontWeight: 800, color: 'var(--text-3)',
                            textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12
                        }}>📋 마케팅 종합 AI 결론</div>
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
