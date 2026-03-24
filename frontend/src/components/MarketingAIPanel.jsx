// ══════════════════════════════════════════════════════════════════════
//  📊 MarketingAIPanel — 공용 Claude AI 마케팅 Analysis 패널
//  5섹션: 노출(Reach) / 참여(Engagement) / 트래픽(Traffic)
//        / 전환(Conversion) / Revenue·ROI
//  POST /v422/ai/marketing-eval 사용
// ══════════════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';

const API = '/api';
const GRADE_COL = { S: '#ffd700', A: '#4f8ef7', B: '#22c55e', C: '#f97316', D: '#f87171' };

// ── 서브 컴포넌트 ───────────────────────────────────────────────────────
function ScoreBar({ label, v, max, col }) {
    return (
        <div style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <span style={{ fontWeight: 800, color: col }}>{v}<span style={{ color: 'rgba(255,255,255,0.28)' }}>/{max}</span></span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                <div style={{
                    width: `${Math.min((v / max) * 100, 100)}%`, height: '100%',
                    background: `linear-gradient(90deg,${col},${col}77)`, borderRadius: 3,
                    boxShadow: `0 0 6px ${col}44`
                }} />
            </div>
        </div>
    );
}

function MetricRow({ label, value, highlight, col = '#4f8ef7' }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
        }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
            <span style={{
                fontSize: 12, fontWeight: 800,
                color: highlight ? col : 'rgba(255,255,255,0.82)',
                fontVariantNumeric: 'tabular-nums'
            }}>{value}</span>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
//  메인 컴포넌트
//  props:
//    channels  : { [key]: channelObject }   — Channel별 성과 데이터
//    campaigns : campaignArray              — 캠페인 목록 (optional)
//    style     : object
// ══════════════════════════════════════════════════════════════════════
export default function MarketingAIPanel({ channels = {}, campaigns = [], style = {} }) {
    const [status, setStatus] = useState('idle'); // idle|loading|done|error
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState(null);
    const [meta, setMeta] = useState({ tokens: 0, model: '' });

    // ─ 5섹션 데이터직렬화 ────────────────────────────────────────────────
    const buildPayload = useCallback(() => {
        const chArr = Object.entries(channels).map(([key, ch]) => ({
            channel: ch.name || key,
            // 1️⃣ 노출 성과 (Reach/Awareness)
            impressions: ch.impressions ?? 0,
            reach: ch.reach ?? Math.round((ch.impressions ?? 0) * 0.72),
            frequency: ch.frequency ?? +((ch.impressions ?? 1) / Math.max(ch.reach ?? 1, 1)).toFixed(2),
            cpm: ch.cpm ?? (ch.spend && ch.impressions ? Math.round(ch.spend / ch.impressions * 1000) : 0),
            ad_spend: ch.spend ?? 0,
            // 2️⃣ 참여 (Engagement)
            clicks: ch.clicks ?? 0,
            ctr: ch.ctr ?? (ch.clicks && ch.impressions ? +((ch.clicks / ch.impressions) * 100).toFixed(2) : 0),
            likes: ch.likes ?? 0,
            comments: ch.comments ?? 0,
            shares: ch.shares ?? 0,
            video_views: ch.videoViews ?? ch.video_views ?? 0,
            view_rate: ch.viewRate ?? ch.view_rate ?? 0,
            // 3️⃣ 트래픽 (Traffic)
            cpc: ch.cpc ?? (ch.spend && ch.clicks ? Math.round(ch.spend / Math.max(ch.clicks, 1)) : 0),
            landing_views: ch.landingViews ?? ch.clicks ?? 0,
            bounce_rate: ch.bounceRate ?? 45,
            sessions: ch.sessions ?? ch.clicks ?? 0,
            avg_session_time: ch.avgSessionTime ?? 120,
            // 4️⃣ 전환 (Conversion)
            conversions: ch.conversions ?? ch.conv ?? 0,
            conv_rate: ch.convRate ?? (ch.clicks && ch.conversions ? +((ch.conversions / ch.clicks) * 100).toFixed(2) : 0),
            cpa: ch.cpa ?? (ch.spend && ch.conversions ? Math.round(ch.spend / Math.max(ch.conversions, 1)) : 0),
            purchases: ch.purchases ?? ch.conversions ?? 0,
            signups: ch.signups ?? 0,
            cart_adds: ch.cartAdds ?? 0,
            // 5️⃣ Revenue·ROI
            revenue: ch.revenue ?? 0,
            roas: ch.roas ?? (ch.spend && ch.revenue ? +(ch.revenue / ch.spend).toFixed(2) : 0),
            // Channel 메타
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
            const res = await fetch(`${API}/v422/ai/marketing-eval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(buildPayload()),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || 'Analysis 실패');
            setResult(data.result);
            setMeta({ tokens: data.tokens_used, model: data.model });
            setStatus('done');
        } catch (e) {
            setStatus('error');
            setResult({ error: e.message });
        }
    }, [buildPayload]);

    const loadHistory = useCallback(async () => {
        try {
            const r = await fetch(`${API}/v422/ai/analyses?context=marketing_eval&limit=5`, { credentials: 'include' });
            const d = await r.json();
            setHistory(d.analyses || []);
        } catch { setHistory([]); }
    }, []);

    const CARD = {
        background: 'linear-gradient(145deg,rgba(255,255,255,0.03),rgba(8,18,38,0.95))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '12px 14px',
    };

    const chCount = Object.keys(channels).length;
    const campCount = campaigns.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>

            {/* ── Run 영역 ── */}
            <div style={{
                background: 'linear-gradient(145deg,rgba(79,142,247,0.1),rgba(8,18,38,0.97))',
                border: '1px solid rgba(79,142,247,0.25)', borderRadius: 13, padding: '14px 16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 26 }}>🤖</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#4f8ef7' }}>Claude AI 마케팅 광고 Analysis</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
                            {chCount}개 Channel × {campCount}개 캠페인 · 5섹션(노출·참여·트래픽·전환·ROI) 종합 평가
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={runAnalysis} disabled={status === 'loading'}
                        style={{
                            flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            background: status === 'loading' ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#7c5cfc)',
                            color: '#fff', fontWeight: 800, fontSize: 11, transition: 'all 0.2s',
                            boxShadow: status !== 'loading' ? '0 4px 14px rgba(79,142,247,0.4)' : undefined
                        }}>
                        {status === 'loading' ? '⏳ AI Analysis 중... (15~30초)' : '🚀 AI 마케팅 Analysis Run'}
                    </button>
                    <button onClick={loadHistory}
                        style={{
                            padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 11, fontWeight: 700
                        }}>
                        📜 이력
                    </button>
                </div>
                {meta.tokens > 0 && (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 6 }}>
                        토큰: {meta.tokens.toLocaleString()} · 모델: {meta.model}
                    </div>
                )}
            </div>

            {/* ── Error ── */}
            {status === 'error' && (
                <div style={{
                    padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.1)',
                    border: '1px solid rgba(248,113,113,0.3)', fontSize: 12, color: '#f87171'
                }}>
                    ❌ {result?.error}
                </div>
            )}

            {/* ── Analysis 결과 ── */}
            {status === 'done' && result && (
                <>
                    {/* All 요약 */}
                    <div style={CARD}>
                        <div style={{
                            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8
                        }}>📋 마케팅 종합 AI 결론</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75 }}>{result.summary}</div>
                        {result.top_insight && (
                            <div style={{
                                marginTop: 8, padding: '8px 11px', borderRadius: 8,
                                background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)',
                                fontSize: 11, color: '#4f8ef7', fontWeight: 600
                            }}>
                                💡 핵심 인사이트: {result.top_insight}
                            </div>
                        )}
                        {result.immediate_action && (
                            <div style={{
                                marginTop: 6, padding: '8px 11px', borderRadius: 8,
                                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                                fontSize: 11, color: '#4ade80', fontWeight: 700
                            }}>
                                ⚡ 즉시 액션: {result.immediate_action}
                            </div>
                        )}
                    </div>

                    {/* 종합 점수 */}
                    {result.overall_score !== undefined && (
                        <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ textAlign: 'center', minWidth: 70 }}>
                                <div style={{
                                    fontSize: 36, fontWeight: 900,
                                    color: GRADE_COL[result.grade] || '#fff',
                                    textShadow: `0 0 18px ${GRADE_COL[result.grade]}55`
                                }}>
                                    {result.grade}
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 900, color: '#4f8ef7' }}>{result.overall_score}점</div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>종합 평가</div>
                            </div>
                            <div style={{ flex: 1 }}>
                                {/* Channel별 점수 */}
                                {(result.channels || []).map(ch => (
                                    <ScoreBar key={ch.name} label={ch.name}
                                        v={ch.score} max={100}
                                        col={ch.score >= 80 ? '#22c55e' : ch.score >= 60 ? '#f97316' : '#f87171'} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Channel별 상세 */}
                    {(result.channels || []).map(ch => (
                        <div key={ch.name} style={{ ...CARD, border: '1px solid rgba(79,142,247,0.15)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#4f8ef7' }}>{ch.name}</div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: GRADE_COL[ch.grade] || '#fff' }}>{ch.grade}</span>
                                    <span style={{ fontSize: 16, fontWeight: 900, color: '#4f8ef7' }}>{ch.score}점</span>
                                </div>
                            </div>
                            {/* 세부 점수 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 10 }}>
                                {Object.entries(ch.breakdown || {}).map(([k, v]) => {
                                    const LBL = { roas_score: 'ROAS', ctr_score: 'CTR', conversion_score: '전환', cpc_score: 'CPC' };
                                    const MAX = { roas_score: 35, ctr_score: 25, conversion_score: 25, cpc_score: 15 };
                                    return (
                                        <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '6px 8px' }}>
                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{LBL[k] || k}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                                    <div style={{
                                                        width: `${(v / (MAX[k] || 35)) * 100}%`, height: '100%',
                                                        background: '#4f8ef7', borderRadius: 2
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: 10, fontWeight: 800, color: '#4f8ef7' }}>{v}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* 강점·개선 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <div style={{ background: 'rgba(34,197,94,0.07)', borderRadius: 7, padding: '7px 9px', border: '1px solid rgba(34,197,94,0.14)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>✅ 강점</div>
                                    {(ch.strengths || []).map((s, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>• {s}</div>)}
                                </div>
                                <div style={{ background: 'rgba(248,113,113,0.07)', borderRadius: 7, padding: '7px 9px', border: '1px solid rgba(248,113,113,0.14)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>⚠️ 개선</div>
                                    {(ch.weaknesses || []).map((w, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>• {w}</div>)}
                                </div>
                            </div>
                            {ch.ai_recommendation && (
                                <div style={{
                                    padding: '7px 10px', borderRadius: 7,
                                    background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.15)',
                                    fontSize: 11, color: '#4f8ef7'
                                }}>
                                    🎯 {ch.ai_recommendation}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Budget 재배분 추천 */}
                    {(result.budget_reallocation || []).length > 0 && (
                        <div style={CARD}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                                marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8
                            }}>
                                💰 AI Budget 재배분 추천
                            </div>
                            {result.budget_reallocation.map((r, i) => (
                                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{r.channel}</span>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                                            <span style={{ color: '#94a3b8' }}>{r.current_pct}%</span>
                                            {' → '}
                                            <span style={{ color: r.recommended_pct > r.current_pct ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                                                {r.recommended_pct}%
                                            </span>
                                        </span>
                                    </div>
                                    {r.rationale && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{r.rationale}</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 캠페인별 평가 */}
                    {(result.campaigns || []).length > 0 && (
                        <div style={CARD}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                                marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8
                            }}>
                                📣 캠페인별 AI 평가
                            </div>
                            {result.campaigns.map((camp, i) => (
                                <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{camp.name}</span>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, fontWeight: 900, color: GRADE_COL[camp.grade] || '#fff' }}>{camp.grade}</span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#4f8ef7' }}>{camp.score}점</span>
                                        </div>
                                    </div>
                                    {camp.ai_insight && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>🔍 {camp.ai_insight}</div>}
                                    {camp.action && (
                                        <div style={{ fontSize: 10, color: '#4f8ef7', fontWeight: 700 }}>→ {camp.action}</div>
                                    )}
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
                        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                        marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8
                    }}>📜 Analysis 이력</div>
                    {history.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>이력 None</div>}
                    {history.map(h => (
                        <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: '#4f8ef7', fontWeight: 700 }}>#{h.id}</span>
                                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10 }}>{(h.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.5)' }}>{(h.summary || '').slice(0, 85)}…</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
