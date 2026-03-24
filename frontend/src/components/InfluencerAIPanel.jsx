// ══════════════════════════════════════════════════════════════════════
//  🤖 InfluencerAIPanel — 공용 Claude AI Analysis 패널
//  지역/연령/성별 참여 기여도 + 5섹션 성과 통합 Analysis
//  POST /v422/ai/influencer-eval 사용
// ══════════════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';

const API = '/api';
const GRADE_COL = { S: '#ffd700', A: '#4f8ef7', B: '#22c55e', C: '#f97316', D: '#f87171' };

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────
function ScoreBar({ label, v, max, col }) {
    return (
        <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                <span style={{ fontWeight: 800, color: col }}>{v}<span style={{ color: 'rgba(255,255,255,0.3)' }}>/{max}</span></span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <div style={{ width: `${(v / max) * 100}%`, height: '100%', background: `linear-gradient(90deg,${col},${col}88)`, borderRadius: 3, boxShadow: `0 0 5px ${col}55` }} />
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// props:
//   creators  : [{id,name,platform,...}]  — Analysis할 크리에이터 배열
//   selectedId: string                    — 현재 선택 크리에이터 id
//   style     : object                    — 컨테이너 스타일 오버라이드
// ══════════════════════════════════════════════════════════════════════
export default function InfluencerAIPanel({ creators = [], selectedId, style = {} }) {
    const [status, setStatus] = useState('idle'); // idle|loading|done|error
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState(null);
    const [meta, setMeta] = useState({ tokens: 0, model: '' });

    // Analysis 데이터 직렬화 (지역/연령/성별 + 5섹션 포함)
    const buildPayload = useCallback(() => ({
        data: creators.map(c => ({
            id: c.id,
            name: c.name,
            platform: c.platform || c.channel || '—',
            category: c.cat || c.category || c.genre || '—',
            // ─ 도달 ──────────────────────────────────────────
            followers: c.followers ?? c.follower_count ?? 0,
            impressions: c.impressions ?? 0,
            reach: c.reach ?? 0,
            views: c.views ?? c.total_views ?? 0,
            avg_impr_per_content: c.avgImprPerContent ?? Math.round((c.impressions ?? 0) / Math.max(c.contentCount ?? 1, 1)),
            // ─ 참여 ──────────────────────────────────────────
            likes: c.likes ?? c.total_likes ?? 0,
            comments: c.comments ?? c.total_comments ?? 0,
            saves: c.saves ?? 0,
            shares: c.shares ?? 0,
            link_clicks: c.linkClicks ?? c.link_clicks ?? 0,
            engagement_rate: c.engagementRate ?? c.engagement_rate ??
                +(((c.likes ?? 0) + (c.comments ?? 0) + (c.saves ?? 0) + (c.shares ?? 0)) /
                    Math.max(c.followers ?? c.follower_count ?? 1, 1) * 100).toFixed(2),
            // ─ 전환 ──────────────────────────────────────────
            purchases: c.purchases ?? c.orders ?? 0,
            revenue: c.revenue ?? c.gmv ?? 0,
            cvr: c.cvr ?? +(((c.purchases ?? 0) / Math.max(c.linkClicks ?? c.link_clicks ?? 1, 1)) * 100).toFixed(1),
            coupon_used: c.couponUsed ?? c.coupon_used ?? 0,
            website_visits: c.websiteVisits ?? 0,
            cart_adds: c.cartAdds ?? 0,
            signups: c.signups ?? 0,
            // ─ 브랜드 ─────────────────────────────────────────
            sentiment_pos: c.sentimentPos ?? c.sentiment_pos ?? 80,
            sentiment_neg: c.sentimentNeg ?? c.sentiment_neg ?? 8,
            brand_mentions: c.brandMentions ?? c.brand_mentions ?? 0,
            content_quality: c.contentQuality ?? c.content_quality ?? 4.0,
            messaging_score: c.messagingScore ?? c.messaging_score ?? 3.8,
            hashtags: c.hashtags ?? [],
            // ─ 품질 ──────────────────────────────────────────
            follower_growth_rate: c.growthRate ?? c.follower_growth_rate ?? 0,
            fake_follower_ratio: c.fakeFollowerRatio ?? c.fake_follower_ratio ?? 0,
            upload_frequency: c.uploadFreq ?? c.upload_frequency ?? 0,
            content_style: c.contentStyle ?? c.content_style ?? '—',
            brand_history: c.brandHistory ?? c.brand_history ?? [],
            // ─ 지역/연령/성별 참여 기여도 ─────────────────────
            demographics: {
                gender: {
                    male: c.demographics?.gender?.male ?? c.audienceMale ?? c.male_pct ?? 50,
                    female: c.demographics?.gender?.female ?? c.audienceFemale ?? c.female_pct ?? 50,
                },
                age: {
                    '10-19': c.demographics?.age?.['10-19'] ?? c.age1019 ?? 12,
                    '20-29': c.demographics?.age?.['20-29'] ?? c.age2029 ?? 32,
                    '30-39': c.demographics?.age?.['30-39'] ?? c.age3039 ?? 34,
                    '40-49': c.demographics?.age?.['40-49'] ?? c.age4049 ?? 15,
                    '50+': c.demographics?.age?.['50+'] ?? c.age50p ?? 7,
                },
                top_regions: c.demographics?.top_regions ?? c.topRegions ?? [
                    { region: '서울', pct: 38 }, { region: '경기', pct: 22 },
                    { region: '부산', pct: 14 }, { region: '인천', pct: 8 }, { region: '대구', pct: 6 },
                ],
                engagement_by_gender: {
                    male_er: c.demographics?.engagement_by_gender?.male_er ?? ((c.audienceMale ?? 50) * 0.032),
                    female_er: c.demographics?.engagement_by_gender?.female_er ?? ((c.audienceFemale ?? 50) * 0.038),
                },
                engagement_by_age: {
                    '10-19': c.demographics?.engagement_by_age?.['10-19'] ?? 5.4,
                    '20-29': c.demographics?.engagement_by_age?.['20-29'] ?? 4.8,
                    '30-39': c.demographics?.engagement_by_age?.['30-39'] ?? 3.2,
                    '40-49': c.demographics?.engagement_by_age?.['40-49'] ?? 2.1,
                    '50+': c.demographics?.engagement_by_age?.['50+'] ?? 1.4,
                },
                purchase_contribution: {
                    by_gender: {
                        male: c.demographics?.purchase_contribution?.by_gender?.male ?? 44,
                        female: c.demographics?.purchase_contribution?.by_gender?.female ?? 56,
                    },
                    by_age: {
                        '20-29': c.demographics?.purchase_contribution?.by_age?.['20-29'] ?? 35,
                        '30-39': c.demographics?.purchase_contribution?.by_age?.['30-39'] ?? 38,
                        '40-49': c.demographics?.purchase_contribution?.by_age?.['40-49'] ?? 18,
                        'other': c.demographics?.purchase_contribution?.by_age?.['other'] ?? 9,
                    },
                    by_region: {
                        '서울/경기': c.demographics?.purchase_contribution?.by_region?.['서울/경기'] ?? 58,
                        '부산/경남': c.demographics?.purchase_contribution?.by_region?.['부산/경남'] ?? 14,
                        '기타': c.demographics?.purchase_contribution?.by_region?.['기타'] ?? 28,
                    },
                },
            },
        })),
    }), [creators]);

    const runAnalysis = useCallback(async () => {
        setStatus('loading');
        setResult(null);
        try {
            const res = await fetch(`${API}/v422/ai/influencer-eval`, {
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
            const res = await fetch(`${API}/v422/ai/analyses?context=influencer_eval&limit=5`, { credentials: 'include' });
            const data = await res.json();
            setHistory(data.analyses || []);
        } catch { setHistory([]); }
    }, []);

    const curResult = result?.creators?.find(x => x.id === selectedId);
    const selCreator = creators.find(c => c.id === selectedId);
    const accentCol = selCreator?.col ?? selCreator?.color ?? '#4f8ef7';

    const CARD = { background: 'linear-gradient(145deg,rgba(255,255,255,0.03),rgba(8,18,38,0.95))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
            {/* ── Run 버튼 영역 ── */}
            <div style={{
                background: 'linear-gradient(145deg,rgba(79,142,247,0.1),rgba(8,18,38,0.97))',
                border: '1px solid rgba(79,142,247,0.25)', borderRadius: 13, padding: '14px 16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 26 }}>🤖</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#4f8ef7' }}>Claude AI 인플루언서 Analysis</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
                            {creators.length}명 크리에이터 × 지역·연령·성별·참여 기여도 + 5섹션 성과 종합 Analysis
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={runAnalysis} disabled={status === 'loading' || creators.length === 0}
                        style={{
                            flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            background: status === 'loading' ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#7c5cfc)',
                            color: '#fff', fontWeight: 800, fontSize: 11, transition: 'all 0.2s',
                            boxShadow: status !== 'loading' ? '0 4px 14px rgba(79,142,247,0.4)' : undefined
                        }}>
                        {status === 'loading' ? '⏳ AI Analysis 중... (15~30초)' : '🚀 AI Analysis Run'}
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
                        사용 토큰: {meta.tokens.toLocaleString()} · {meta.model}
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

            {/* ── All 포트폴리오 요약 ── */}
            {status === 'done' && result && (
                <>
                    <div style={CARD}>
                        <div style={{
                            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 8,
                            textTransform: 'uppercase', letterSpacing: 0.8
                        }}>📋 포트폴리오 AI 종합 결론</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.75 }}>
                            {result.overall_summary}
                        </div>
                        {(result.portfolio_insights || []).map((ins, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                                <span style={{ color: '#4f8ef7', flexShrink: 0 }}>▸</span>{ins}
                            </div>
                        ))}
                        {result.budget_optimization && (
                            <div style={{
                                marginTop: 10, padding: '8px 11px', borderRadius: 8,
                                background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)',
                                fontSize: 11, color: '#4f8ef7', fontWeight: 600
                            }}>
                                💡 Budget 최적화: {result.budget_optimization}
                            </div>
                        )}
                        {result.immediate_action && (
                            <div style={{
                                marginTop: 8, padding: '8px 11px', borderRadius: 8,
                                background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                                fontSize: 11, color: '#4ade80', fontWeight: 700
                            }}>
                                ⚡ 즉시 액션: {result.immediate_action}
                            </div>
                        )}
                    </div>

                    {/* ── 선택 크리에이터 상세 평가 ── */}
                    {curResult && selCreator && (
                        <div style={{
                            background: `linear-gradient(145deg,${accentCol}0a,rgba(8,18,38,0.97))`,
                            border: `1px solid ${accentCol}30`, borderRadius: 12, padding: '12px 14px'
                        }}>
                            {/* 헤더 */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: accentCol }}>{curResult.name || selCreator.name}</div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>
                                        {selCreator.platform || selCreator.channel} · {selCreator.cat || selCreator.category || selCreator.genre}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 30, fontWeight: 900, color: GRADE_COL[curResult.grade] || '#fff',
                                        textShadow: `0 0 16px ${GRADE_COL[curResult.grade]}55`
                                    }}>{curResult.grade}</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: accentCol }}>{curResult.score}점</div>
                                </div>
                            </div>

                            {/* 점수 브레이크다운 */}
                            <div style={{ marginBottom: 10 }}>
                                {Object.entries(curResult.breakdown || {}).map(([k, v]) => {
                                    const LBL = { roi_score: 'ROI 점수', conversion_score: '전환 효율', engagement_score: '참여율', content_quality_score: '콘텐츠', reliability_score: '신뢰도' };
                                    const MAX = { roi_score: 30, conversion_score: 25, engagement_score: 20, content_quality_score: 15, reliability_score: 10 };
                                    return <ScoreBar key={k} label={LBL[k] || k} v={v} max={MAX[k] || 30} col={accentCol} />;
                                })}
                            </div>

                            {/* 강점·약점 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                <div style={{ background: 'rgba(34,197,94,0.07)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(34,197,94,0.15)' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 5 }}>💪 강점</div>
                                    {(curResult.strengths || []).map((s, i) => (
                                        <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>• {s}</div>
                                    ))}
                                </div>
                                <div style={{ background: 'rgba(248,113,113,0.07)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(248,113,113,0.15)' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', marginBottom: 5 }}>⚠️ 약점</div>
                                    {(curResult.weaknesses || []).map((w, i) => (
                                        <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>• {w}</div>
                                    ))}
                                </div>
                            </div>

                            {/* 수수료 추천 */}
                            {curResult.fee_recommendation && (
                                <div style={{
                                    background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)',
                                    borderRadius: 9, padding: '10px 12px', marginBottom: 8
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#eab308', marginBottom: 6 }}>💰 수수료 추천</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                                        {[
                                            { l: '계약 유형', v: curResult.fee_recommendation.contract_type },
                                            { l: '성과 요율', v: `${((curResult.fee_recommendation.recommended_perf_rate ?? 0) * 100).toFixed(1)}%` },
                                            { l: '권장 단가', v: `${(curResult.fee_recommendation.recommended_flat_fee || 0).toLocaleString()}원` },
                                            { l: '예상 총액', v: `${(curResult.fee_recommendation.recommended_total_est || 0).toLocaleString()}원` },
                                        ].map(m => (
                                            <div key={m.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '5px 8px' }}>
                                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{m.l}</div>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: '#eab308' }}>{m.v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {curResult.fee_recommendation.fee_rationale && (
                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
                                            {curResult.fee_recommendation.fee_rationale}
                                        </div>
                                    )}
                                    {curResult.fee_recommendation.negotiation_tip && (
                                        <div style={{ fontSize: 10, color: '#eab308', marginTop: 4 }}>
                                            💡 {curResult.fee_recommendation.negotiation_tip}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AI 인사이트 + 계약 갱신 */}
                            {curResult.ai_insight && (
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 6 }}>
                                    🔍 {curResult.ai_insight}
                                </div>
                            )}
                            {curResult.renewal_recommendation && (
                                <div style={{
                                    padding: '7px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                    background: curResult.renewal_recommendation.includes('강력') ? 'rgba(34,197,94,0.12)' : 'rgba(250,204,21,0.1)',
                                    border: `1px solid ${curResult.renewal_recommendation.includes('강력') ? 'rgba(34,197,94,0.3)' : 'rgba(250,204,21,0.2)'}`,
                                    color: curResult.renewal_recommendation.includes('강력') ? '#4ade80' : '#eab308'
                                }}>
                                    📋 계약 갱신: {curResult.renewal_recommendation}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── All 랭킹 ── */}
                    {result.creators && result.creators.length > 0 && (
                        <div style={CARD}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 8,
                                textTransform: 'uppercase', letterSpacing: 0.8
                            }}>🏆 AI All 랭킹</div>
                            {[...result.creators].sort((a, b) => b.score - a.score).map((cr, i) => {
                                const cc = creators.find(x => x.id === cr.id) || {};
                                const cc_col = cc.col ?? cc.color ?? '#4f8ef7';
                                return (
                                    <div key={cr.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
                                    }}>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14 }}>{i + 1}</span>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: GRADE_COL[cr.grade] || '#fff', width: 18 }}>{cr.grade}</span>
                                        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{cr.name}</span>
                                        <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                                            <div style={{ width: `${cr.score}%`, height: '100%', background: cc_col, borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 900, color: cc_col, width: 34, textAlign: 'right' }}>{cr.score}점</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ── 이력 ── */}
            {history && (
                <div style={CARD}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', marginBottom: 8,
                        textTransform: 'uppercase', letterSpacing: 0.8
                    }}>📜 Analysis 이력 (최근 5건)</div>
                    {history.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>이력 None</div>}
                    {history.map(h => (
                        <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: '#4f8ef7', fontWeight: 700 }}>#{h.id}</span>
                                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10 }}>{(h.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{(h.summary || '').slice(0, 85)}…</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
