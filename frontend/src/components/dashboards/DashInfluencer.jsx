// ══════════════════════════════════════════════════════════════════════
//  🤝 AI·인플루언서 대시보드 — 5섹션 + 성과 리포트
//  1. 도달성과  2. 참여도  3. 전환(Conversion)
//  4. 브랜드영향력  5. 인플루언서 품질평가  6. 📊 성과 리포트
// ✅ GlobalDataContext 실시간 연동: 인플루언서 전환/매출이 P&L에 반영
// ══════════════════════════════════════════════════════════════════════
import { useState, useCallback, useMemo } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useI18n } from '../../i18n/index.js';
import { fmt } from './ChartUtils.jsx';

const API_BASE = '/api';

// ─── 크리에이터 통합 데이터셋 ────────────────────────────────────────────
const CREATORS = [
    {
        id: 'c1', name: '@stylebyerin', platform: 'Instagram', cat: '패션·뷰티', col: '#ec4899', badge: 'TOP',
        // 1. 도달성과
        followers: 524000, impressions: 2840000, reach: 1920000, views: 1580000, avgImprPerContent: 237000,
        contentReach: [
            { title: '봄 룩북 2025', views: 248000, impr: 310000, reach: 210000 },
            { title: '스킨케어 루틴', views: 182000, impr: 228000, reach: 156000 },
            { title: '코디 챌린지', views: 156000, impr: 195000, reach: 134000 },
            { title: '여름 무드', views: 138000, impr: 172000, reach: 118000 },
        ],
        // 2. 참여도
        likes: 48200, comments: 3840, saves: 12400, shares: 6800, linkClicks: 4200,
        contentEng: [
            { title: '봄 룩북 2025', likes: 12400, comments: 980, saves: 3200, shares: 1800 },
            { title: '스킨케어 루틴', likes: 9800, comments: 760, saves: 2800, shares: 1400 },
            { title: '코디 챌린지', likes: 8600, comments: 640, saves: 2200, shares: 1200 },
        ],
        // 3. 전환
        uniqueLinkClicks: 4200, websiteVisits: 3800, cartAdds: 1240, purchases: 620, signups: 284,
        couponUsed: 380, utmTraffic: 5200, revenue: 2840000,
        convFunnel: [4200, 3800, 1240, 620, 284],
        // 4. 브랜드영향력
        sentimentPos: 84, sentimentNeg: 7, sentimentNeu: 9,
        brandMentions: 1840, contentQuality: 4.7, messagingScore: 4.2,
        hashtags: ['#패션', '#뷰티', '#OOTD', '#봄코디', '#지니고'],
        keywords: ['Geniego', '공동구매', '브랜드', '패션', '뷰티'],
        // 5. 품질평가
        growthRate: 4.2, fakeFollowerRatio: 2.1, uploadFreq: 3.2, contentStyle: '패션·라이프스타일',
        brandHistory: ['Nike', 'LG전자', '올리브영', 'CJ제일제당'],
        qualityScore: 87, qualityDetail: { growth: 22, fake: 3, freq: 20, style: 18, brand: 24 },
    },
    {
        id: 'c2', name: '@techsavvykim', platform: 'YouTube', cat: '테크·IT', col: '#4f8ef7', badge: 'HOT',
        followers: 312000, impressions: 1940000, reach: 1420000, views: 2180000, avgImprPerContent: 485000,
        contentReach: [
            { title: 'M4 MacBook Pro', views: 384000, impr: 480000, reach: 348000 },
            { title: '갤럭시 vs 아이폰', views: 298000, impr: 372000, reach: 270000 },
            { title: '생산성 앱 추천', views: 216000, impr: 270000, reach: 196000 },
        ],
        likes: 38400, comments: 5120, saves: 6200, shares: 8400, linkClicks: 7800,
        contentEng: [
            { title: 'M4 MacBook Pro', likes: 9600, comments: 1280, saves: 1550, shares: 2100 },
            { title: '갤럭시 vs 아이폰', likes: 7600, comments: 960, saves: 1240, shares: 1680 },
            { title: '생산성 앱 추천', likes: 5600, comments: 704, saves: 920, shares: 1240 },
        ],
        uniqueLinkClicks: 7800, websiteVisits: 6200, cartAdds: 2840, purchases: 1240, signups: 680,
        couponUsed: 920, utmTraffic: 8400, revenue: 1920000,
        convFunnel: [7800, 6200, 2840, 1240, 680],
        sentimentPos: 78, sentimentNeg: 12, sentimentNeu: 10,
        brandMentions: 2480, contentQuality: 4.4, messagingScore: 3.9,
        hashtags: ['#테크', '#IT', '#유튜브', '#생산성', '#꿀템'],
        keywords: ['리뷰', '테크', '최신', '추천', '할인'],
        growthRate: 6.8, fakeFollowerRatio: 3.4, uploadFreq: 2.6, contentStyle: '리뷰·정보',
        brandHistory: ['삼성전자', 'LG전자', 'Microsoft', 'Logitech'],
        qualityScore: 82, qualityDetail: { growth: 25, fake: 5, freq: 18, style: 16, brand: 18 },
    },
    {
        id: 'c3', name: '@foodieminjun', platform: 'TikTok', cat: '푸드', col: '#f97316', badge: 'VIRAL',
        followers: 892000, impressions: 8420000, reach: 5840000, views: 12400000, avgImprPerContent: 1402000,
        contentReach: [
            { title: '라멘 챌린지', views: 1200000, impr: 1500000, reach: 1080000 },
            { title: '편의점 신상먹방', views: 894000, impr: 1117500, reach: 804600 },
            { title: '1만원 날 레스토랑', views: 742000, impr: 927500, reach: 667800 },
        ],
        likes: 124000, comments: 18400, saves: 48000, shares: 62000, linkClicks: 8400,
        contentEng: [
            { title: '라멘 챌린지', likes: 31000, comments: 4600, saves: 12000, shares: 15500 },
            { title: '편의점 신상먹방', likes: 22380, comments: 3404, saves: 8928, shares: 11532 },
        ],
        uniqueLinkClicks: 8400, websiteVisits: 7200, cartAdds: 2100, purchases: 840, signups: 480,
        couponUsed: 620, utmTraffic: 9800, revenue: 1580000,
        convFunnel: [8400, 7200, 2100, 840, 480],
        sentimentPos: 91, sentimentNeg: 4, sentimentNeu: 5,
        brandMentions: 4280, contentQuality: 4.2, messagingScore: 3.6,
        hashtags: ['#푸드', '#먹방', '#TikTok', '#바이럴', '#지니고맛집'],
        keywords: ['맛집', '먹방', '추천', '신상', '편의점'],
        growthRate: 12.4, fakeFollowerRatio: 5.2, uploadFreq: 5.8, contentStyle: '엔터테인먼트·바이럴',
        brandHistory: ['CJ제일제당', '농심', '오뚜기', '배달의민족'],
        qualityScore: 79, qualityDetail: { growth: 28, fake: 8, freq: 24, style: 14, brand: 5 },
    },
    {
        id: 'c4', name: '@fitnessbypark', platform: 'YouTube', cat: '헬스·운동', col: '#22c55e', badge: 'RISE',
        followers: 248000, impressions: 1280000, reach: 980000, views: 1640000, avgImprPerContent: 320000,
        contentReach: [
            { title: '30일 바디체인지', views: 428000, impr: 535000, reach: 385200 },
            { title: '집에서 하는 홈트', views: 312000, impr: 390000, reach: 280800 },
        ],
        likes: 28400, comments: 4200, saves: 14800, shares: 6800, linkClicks: 5200,
        contentEng: [
            { title: '30일 바디체인지', likes: 7100, comments: 1050, saves: 3700, shares: 1700 },
            { title: '집에서 하는 홈트', likes: 5176, comments: 766, saves: 2698, shares: 1240 },
        ],
        uniqueLinkClicks: 5200, websiteVisits: 4800, cartAdds: 2400, purchases: 1080, signups: 620,
        couponUsed: 840, utmTraffic: 6200, revenue: 980000,
        convFunnel: [5200, 4800, 2400, 1080, 620],
        sentimentPos: 88, sentimentNeg: 5, sentimentNeu: 7,
        brandMentions: 980, contentQuality: 4.5, messagingScore: 4.3,
        hashtags: ['#헬스', '#홈트', '#다이어트', '#운동', '#건강'],
        keywords: ['운동', '다이어트', '홈트', '건강', '단백질'],
        growthRate: 8.6, fakeFollowerRatio: 1.8, uploadFreq: 2.4, contentStyle: '교육·동기부여',
        brandHistory: ['나이키', 'Under Armour', 'MyProtein', '삼성헬스'],
        qualityScore: 91, qualityDetail: { growth: 26, fake: 2, freq: 16, style: 22, brand: 25 },
    },
    {
        id: 'c5', name: '@travelbychoi', platform: 'Instagram', cat: '여행·라이프', col: '#a855f7', badge: 'STEADY',
        followers: 418000, impressions: 1640000, reach: 1240000, views: 980000, avgImprPerContent: 205000,
        contentReach: [
            { title: '제주 숨은명소 10', views: 284000, impr: 355000, reach: 255600 },
            { title: '유럽 한달살기', views: 246000, impr: 307500, reach: 221400 },
        ],
        likes: 32000, comments: 2840, saves: 18400, shares: 4200, linkClicks: 2800,
        contentEng: [
            { title: '제주 숨은명소 10', likes: 8000, comments: 710, saves: 4600, shares: 1050 },
            { title: '유럽 한달살기', likes: 6888, comments: 610, saves: 3960, shares: 903 },
        ],
        uniqueLinkClicks: 2800, websiteVisits: 2400, cartAdds: 680, purchases: 280, signups: 180,
        couponUsed: 210, utmTraffic: 3200, revenue: 840000,
        convFunnel: [2800, 2400, 680, 280, 180],
        sentimentPos: 86, sentimentNeg: 6, sentimentNeu: 8,
        brandMentions: 720, contentQuality: 4.8, messagingScore: 4.6,
        hashtags: ['#여행', '#제주', '#유럽', '#라이프스타일', '#호캉스'],
        keywords: ['여행', '숨은명소', '호텔', '맛집', '추천'],
        growthRate: 3.8, fakeFollowerRatio: 2.6, uploadFreq: 2.0, contentStyle: '감성·라이프스타일',
        brandHistory: ['제주항공', '부킹닷컴', 'Samsung Pay', '롯데호텔'],
        qualityScore: 85, qualityDetail: { growth: 15, fake: 4, freq: 14, style: 28, brand: 24 },
    },
];

const TABS_DEFS = [
    { id: 'reach', ico: '📡' },
    { id: 'engage', ico: '❤️' },
    { id: 'convert', ico: '💳' },
    { id: 'brand', ico: '🏷️' },
    { id: 'quality', ico: '⭐' },
    { id: 'report', ico: '📊' },
    { id: 'ai', ico: '🤖' },
];

// ─── 🤖 AI 분석 패널 (Claude API 연동) ────────────────────────────────────
const GRADE_COL = { S: '#ffd700', A: '#4f8ef7', B: '#22c55e', C: '#f97316', D: '#f87171' };

function PanelAI({ c }) {
    const [status, setStatus] = useState('idle'); // idle | loading | done | error
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState(null);
    const [tokensUsed, setTokens] = useState(0);
    const [model, setModel] = useState('');

    // 데이터 직렬화 (전체 5섹션)
    const buildPayload = () => ({
        data: CREATORS.map(cr => ({
            id: cr.id,
            name: cr.name,
            platform: cr.platform,
            category: cr.cat,
            // 도달
            followers: cr.followers,
            impressions: cr.impressions,
            reach: cr.reach,
            views: cr.views,
            avg_impr_per_content: cr.avgImprPerContent,
            // 참여
            likes: cr.likes,
            comments: cr.comments,
            saves: cr.saves,
            shares: cr.shares,
            link_clicks: cr.linkClicks,
            engagement_rate: +((cr.likes + cr.comments + cr.saves + cr.shares) / cr.followers * 100).toFixed(2),
            // 전환
            unique_link_clicks: cr.uniqueLinkClicks,
            website_visits: cr.websiteVisits,
            cart_adds: cr.cartAdds,
            purchases: cr.purchases,
            signups: cr.signups,
            coupon_used: cr.couponUsed,
            utm_traffic: cr.utmTraffic,
            revenue: cr.revenue,
            cvr: +((cr.purchases / cr.uniqueLinkClicks) * 100).toFixed(1),
            // 브랜드
            sentiment_pos: cr.sentimentPos,
            sentiment_neg: cr.sentimentNeg,
            brand_mentions: cr.brandMentions,
            content_quality: cr.contentQuality,
            messaging_score: cr.messagingScore,
            hashtags: cr.hashtags,
            // 품질
            follower_growth_rate: cr.growthRate,
            fake_follower_ratio: cr.fakeFollowerRatio,
            upload_frequency: cr.uploadFreq,
            content_style: cr.contentStyle,
            brand_history: cr.brandHistory,
            quality_score: Math.round((cr.qualityDetail.growth + cr.qualityDetail.fake +
                cr.qualityDetail.freq + cr.qualityDetail.style + cr.qualityDetail.brand) / 75 * 100),
        }))
    });

    const runAnalysis = useCallback(async () => {
        setStatus('loading');
        setResult(null);
        try {
            const res = await fetch(`${API_BASE}/v422/ai/influencer-eval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(buildPayload()),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || '분석 실패');
            setResult(data.result);
            setTokens(data.tokens_used);
            setModel(data.model);
            setStatus('done');
        } catch (e) {
            setStatus('error');
            setResult({ error: e.message });
        }
    }, []);

    const loadHistory = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/v422/ai/analyses?context=influencer_eval&limit=5`, {
                credentials: 'include',
            });
            const data = await res.json();
            setHistory(data.analyses || []);
        } catch { setHistory([]); }
    }, []);

    // 선택된 크리에이터 AI 결과
    const creatorResult = result?.creators?.find(x => x.id === c.id);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 분석 실행 버튼 */}
            <div style={{
                background: 'linear-gradient(145deg,rgba(79,142,247,0.1),rgba(8,18,38,0.97))',
                border: '1px solid rgba(79,142,247,0.25)', borderRadius: 13, padding: '14px 16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 28 }}>🤖</div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: '#4f8ef7' }}>Claude AI 인플루언서 분석 엔진</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                            5개 크리에이터 × 5섹션 전체 데이터를 Claude {model || 'claude-3-5-sonnet'}이 분석합니다
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={runAnalysis} disabled={status === 'loading'}
                        style={{
                            flex: 1, padding: '10px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            background: status === 'loading'
                                ? 'rgba(79,142,247,0.3)'
                                : 'linear-gradient(135deg,#4f8ef7,#7c5cfc)',
                            color: '#fff', fontWeight: 800, fontSize: 12,
                            boxShadow: status !== 'loading' ? '0 4px 15px rgba(79,142,247,0.4)' : undefined,
                            transition: 'all 0.2s', opacity: status === 'loading' ? 0.8 : 1
                        }}>
                        {status === 'loading' ? '⏳ Claude AI 분석 중... (15~30초)' : '🚀 AI 분석 실행'}
                    </button>
                    <button onClick={loadHistory}
                        style={{
                            padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
                            background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700
                        }}>📜 이력</button>
                </div>
                {tokensUsed > 0 && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                        사용 토큰: {tokensUsed.toLocaleString()} · 모델: {model}
                    </div>
                )}
            </div>

            {/* 오류 */}
            {status === 'error' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 12, color: '#f87171' }}>
                    ❌ {result?.error}
                </div>
            )}

            {/* 분석 결과: 전체 요약 */}
            {status === 'done' && result && (
                <>
                    <div style={{
                        background: 'linear-gradient(145deg,rgba(79,142,247,0.08),rgba(8,18,38,0.97))',
                        border: '1px solid rgba(79,142,247,0.2)', borderRadius: 12, padding: '12px 14px'
                    }}>
                        <div style={{
                            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8
                        }}>📋 포트폴리오 총평</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7 }}>
                            {result.overall_summary}
                        </div>
                        {result.portfolio_insights?.map((ins, i) => (
                            <div key={i} style={{ display: 'flex', gap: 7, marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                                <span style={{ color: '#4f8ef7', flexShrink: 0 }}>▸</span>
                                {ins}
                            </div>
                        ))}
                        {result.immediate_action && (
                            <div style={{
                                marginTop: 10, padding: '8px 12px', borderRadius: 8,
                                background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)',
                                fontSize: 12, color: '#4f8ef7', fontWeight: 700
                            }}>
                                ⚡ 즉시 액션: {result.immediate_action}
                            </div>
                        )}
                    </div>

                    {/* 선택된 크리에이터 AI 평가 */}
                    {creatorResult && (
                        <div style={{
                            background: `linear-gradient(145deg,${c.col}0a,rgba(8,18,38,0.97))`,
                            border: `1px solid ${c.col}30`, borderRadius: 12, padding: '12px 14px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: c.col }}>{c.name} AI 평가</div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{c.platform} · {c.cat}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 28, fontWeight: 900,
                                        color: GRADE_COL[creatorResult.grade] || '#fff',
                                        textShadow: `0 0 16px ${GRADE_COL[creatorResult.grade] || '#fff'}55`
                                    }}>
                                        {creatorResult.grade}</div>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: c.col }}>{creatorResult.score}점</div>
                                </div>
                            </div>
                            {/* 점수 브레이크다운 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 10 }}>
                                {Object.entries(creatorResult.breakdown || {}).map(([k, v]) => {
                                    const labels = { roi_score: 'ROI', conversion_score: '전환', engagement_score: '참여', content_quality_score: '콘텐츠', reliability_score: '신뢰도' };
                                    const max = { roi_score: 30, conversion_score: 25, engagement_score: 20, content_quality_score: 15, reliability_score: 10 };
                                    return (
                                        <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '6px 8px' }}>
                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{labels[k] || k}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                                    <div style={{ width: `${(v / (max[k] || 30)) * 100}%`, height: '100%', background: c.col, borderRadius: 3 }} />
                                                </div>
                                                <span style={{ fontSize: 11, fontWeight: 800, color: c.col }}>{v}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* 강점·약점 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                <div style={{ background: 'rgba(34,197,94,0.07)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(34,197,94,0.15)' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 5 }}>💪 강점</div>
                                    {(creatorResult.strengths || []).map((s, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>• {s}</div>)}
                                </div>
                                <div style={{ background: 'rgba(248,113,113,0.07)', borderRadius: 8, padding: '8px 10px', border: '1px solid rgba(248,113,113,0.15)' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', marginBottom: 5 }}>⚠️ 약점</div>
                                    {(creatorResult.weaknesses || []).map((w, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 3 }}>• {w}</div>)}
                                </div>
                            </div>
                            {/* 수수료 추천 */}
                            {creatorResult.fee_recommendation && (
                                <div style={{ background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 9, padding: '10px 12px', marginBottom: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#eab308', marginBottom: 6 }}>💰 수수료 추천</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        {[
                                            { l: '계약 유형', v: creatorResult.fee_recommendation.contract_type },
                                            { l: '성과 요율', v: `${(creatorResult.fee_recommendation.recommended_perf_rate * 100).toFixed(1)}%` },
                                            { l: '권장 고정 단가', v: (creatorResult.fee_recommendation.recommended_flat_fee || 0).toLocaleString() + '원' },
                                            { l: '예상 총액', v: (creatorResult.fee_recommendation.recommended_total_est || 0).toLocaleString() + '원' },
                                        ].map(m => (
                                            <div key={m.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '5px 8px' }}>
                                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{m.l}</div>
                                                <div style={{ fontSize: 12, fontWeight: 800, color: '#eab308' }}>{m.v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                                        {creatorResult.fee_recommendation.fee_rationale}
                                    </div>
                                    {creatorResult.fee_recommendation.negotiation_tip && (
                                        <div style={{ fontSize: 10, color: '#eab308', marginTop: 4 }}>
                                            💡 {creatorResult.fee_recommendation.negotiation_tip}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* AI 인사이트 + 계약 갱신 */}
                            {creatorResult.ai_insight && (
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 6 }}>
                                    🔍 {creatorResult.ai_insight}
                                </div>
                            )}
                            {creatorResult.renewal_recommendation && (
                                <div style={{
                                    padding: '7px 12px', borderRadius: 8,
                                    background: creatorResult.renewal_recommendation.includes('강력') ? 'rgba(34,197,94,0.12)' : 'rgba(250,204,21,0.1)',
                                    border: `1px solid ${creatorResult.renewal_recommendation.includes('강력') ? 'rgba(34,197,94,0.3)' : 'rgba(250,204,21,0.2)'}`,
                                    fontSize: 11, fontWeight: 700,
                                    color: creatorResult.renewal_recommendation.includes('강력') ? '#4ade80' : '#eab308'
                                }}>
                                    📋 계약 갱신: {creatorResult.renewal_recommendation}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 전체 크리에이터 랭킹 */}
                    {result.creators && (
                        <div style={{
                            background: 'linear-gradient(145deg,rgba(255,255,255,0.03),rgba(8,18,38,0.95))',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px'
                        }}>
                            <div style={{
                                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8
                            }}>🏆 AI 전체 랭킹</div>
                            {[...result.creators].sort((a, b) => b.score - a.score).map((cr, i) => {
                                const cc = CREATORS.find(x => x.id === cr.id) || {};
                                return (
                                    <div key={cr.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
                                    }}>
                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14 }}>{i + 1}</span>
                                        <span style={{ fontSize: 16, fontWeight: 900, color: GRADE_COL[cr.grade] || '#fff', width: 20 }}>{cr.grade}</span>
                                        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{cr.name}</span>
                                        <div style={{ width: 70, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                                            <div style={{ width: `${cr.score}%`, height: '100%', background: cc.col || '#4f8ef7', borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 900, color: cc.col || '#4f8ef7', width: 36, textAlign: 'right' }}>{cr.score}점</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* 이력 */}
            {history && (
                <div style={{
                    background: 'linear-gradient(145deg,rgba(255,255,255,0.03),rgba(8,18,38,0.95))',
                    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px'
                }}>
                    <div style={{
                        fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8
                    }}>📜 분석 이력 (최근 5건)</div>
                    {history.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>이력 없음</div>}
                    {history.map(h => (
                        <div key={h.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: '#4f8ef7', fontWeight: 700 }}>#{h.id}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{h.created_at?.slice(0, 16).replace('T', ' ')}</span>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{(h.summary || '').slice(0, 80)}…</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── 성과 리포트 패널 ────────────────────────────────────────────────────
function PanelReport({ c }) {
    const engRate = ((c.likes + c.comments + c.saves + c.shares) / c.followers * 100).toFixed(2);
    const cvr = ((c.purchases / c.uniqueLinkClicks) * 100).toFixed(1);
    const qScore = Math.round((c.qualityDetail.growth + c.qualityDetail.fake +
        c.qualityDetail.freq + c.qualityDetail.style + c.qualityDetail.brand) / 75 * 100);
    const SECTIONS = [
        {
            ico: '📡', title: '도달성과', col: '#4f8ef7', items: [
                { l: '팔로워', v: fmt(c.followers) },
                { l: '노출수', v: fmt(c.impressions) },
                { l: '도달수', v: fmt(c.reach) },
                { l: '조회수', v: fmt(c.views) },
                { l: '콘텐츠 평균 노출', v: fmt(c.avgImprPerContent) },
                { l: '도달률', v: `${((c.reach / c.impressions) * 100).toFixed(1)}%` },
            ]
        },
        {
            ico: '❤️', title: '참여도', col: '#ec4899', items: [
                { l: '좋아요', v: fmt(c.likes) },
                { l: '댓글', v: fmt(c.comments) },
                { l: '저장(Save)', v: fmt(c.saves) },
                { l: '공유(Share)', v: fmt(c.shares) },
                { l: '링크 클릭', v: fmt(c.linkClicks) },
                { l: '참여율(ER)', v: `${engRate}%`, highlight: true },
            ]
        },
        {
            ico: '💳', title: '전환(ROI)', col: '#22c55e', items: [
                { l: '링크 클릭', v: fmt(c.uniqueLinkClicks) },
                { l: '웹사이트 방문', v: fmt(c.websiteVisits) },
                { l: '장바구니', v: fmt(c.cartAdds) },
                { l: '구매 전환', v: fmt(c.purchases), highlight: true },
                { l: '신규 가입', v: fmt(c.signups) },
                { l: '쿠폰 사용', v: fmt(c.couponUsed) },
                { l: 'UTM 트래픽', v: fmt(c.utmTraffic) },
                { l: '발생 매출', v: fmt(c.revenue, { prefix: '₩' }), highlight: true },
                { l: 'CVR', v: `${cvr}%` },
            ]
        },
        {
            ico: '🏷️', title: '브랜드 영향력', col: '#a855f7', items: [
                { l: '긍정 댓글', v: `${c.sentimentPos}%` },
                { l: '부정 댓글', v: `${c.sentimentNeg}%` },
                { l: '브랜드 언급', v: fmt(c.brandMentions) },
                { l: '콘텐츠 퀄리티', v: `${c.contentQuality}/5` },
                { l: '메시지 전달력', v: `${c.messagingScore}/5` },
                { l: '사용 해시태그', v: `${c.hashtags.length}개` },
            ]
        },
        {
            ico: '⭐', title: '품질 평가', col: '#f97316', items: [
                { l: '팔로워 증가율', v: `+${c.growthRate}%/월` },
                { l: '가짜 팔로워', v: `${c.fakeFollowerRatio}%` },
                { l: '업로드 빈도', v: `${c.uploadFreq}회/주` },
                { l: '콘텐츠 스타일', v: c.contentStyle },
                { l: '협업 브랜드', v: `${c.brandHistory.length}곳` },
                { l: '종합 점수', v: `${qScore}점`, highlight: true },
            ]
        },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 헤더: 인플루언서 요약 */}
            <div style={{
                background: `linear-gradient(145deg,${c.col}14,rgba(8,18,38,0.97))`,
                border: `1px solid ${c.col}30`, borderRadius: 13, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14
            }}>
                <div style={{
                    width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg,${c.col},${c.col}66)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 900, color: '#fff',
                    boxShadow: `0 0 16px ${c.col}55`
                }}>
                    {c.name[1].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: 16, fontWeight: 900, color: c.col,
                        textShadow: `0 0 14px ${c.col}55`, marginBottom: 2
                    }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                        {P_ICO[c.platform]} {c.platform} · {c.cat}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>종합 품질</div>
                    <div style={{
                        fontSize: 28, fontWeight: 900, color: c.col,
                        textShadow: `0 0 16px ${c.col}55`
                    }}>{qScore}점</div>
                </div>
            </div>
            {/* 5개 섹션 요약 카드 */}
            {SECTIONS.map(sec => (
                <div key={sec.title} style={{
                    background: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(8,18,38,0.95))',
                    border: `1px solid ${sec.col}22`, borderRadius: 12, overflow: 'hidden'
                }}>
                    <div style={{
                        background: `${sec.col}14`, padding: '8px 14px',
                        borderBottom: `1px solid ${sec.col}22`, display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <span style={{ fontSize: 13 }}>{sec.ico}</span>
                        <span style={{
                            fontSize: 12, fontWeight: 800, color: sec.col,
                            textTransform: 'uppercase', letterSpacing: 0.8
                        }}>{sec.title}</span>
                    </div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px',
                        background: 'rgba(255,255,255,0.04)'
                    }}>
                        {sec.items.map(item => (
                            <div key={item.l} style={{
                                padding: '8px 12px',
                                background: item.highlight ? `${sec.col}08` : 'rgba(8,18,38,0.95)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{item.l}</span>
                                <span style={{
                                    fontSize: 12, fontWeight: 800,
                                    color: item.highlight ? sec.col : 'rgba(255,255,255,0.82)',
                                    fontVariantNumeric: 'tabular-nums'
                                }}>{item.v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
const G = 10;
const CARD = { background: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(8,18,38,0.95))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' };
const BADGE = { TOP: '#ffd700', HOT: '#f97316', VIRAL: '#ec4899', RISE: '#22c55e', STEADY: '#4f8ef7' };
const P_ICO = { Instagram: '📸', YouTube: '▶️', TikTok: '🎵' };

// ─── 서브 컴포넌트: 미니 바 ──────────────────────────────────────────────
function MiniBar({ v, max, col, h = 5 }) {
    return (
        <div style={{ flex: 1, height: h, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
            <div style={{ width: `${Math.min((v / max) * 100, 100)}%`, height: '100%', background: col, borderRadius: 3, boxShadow: `0 0 5px ${col}55` }} />
        </div>
    );
}
function MetaRow({ ico, l, v, col }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{ico}</span>
            <span style={{ flex: 1, color: 'rgba(255,255,255,0.55)' }}>{l}</span>
            <span style={{ fontWeight: 800, color: col || 'rgba(255,255,255,0.88)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
        </div>
    );
}

// ─── 섹션별 상세 패널 ─────────────────────────────────────────────────────
function PanelReach({ c }) {
    const maxV = Math.max(...c.contentReach.map(x => x.views));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>📡 주요 도달 지표</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        { l: '팔로워', ico: '👥', v: fmt(c.followers), col: c.col },
                        { l: '노출수', ico: '👁️', v: fmt(c.impressions), col: '#4f8ef7' },
                        { l: '도달수', ico: '📤', v: fmt(c.reach), col: '#22c55e' },
                        { l: '조회수', ico: '▶️', v: fmt(c.views), col: '#ec4899' },
                        { l: '콘텐츠 평균 노출', ico: '📊', v: fmt(c.avgImprPerContent), col: '#a855f7' },
                        { l: '도달률', ico: '📈', v: `${((c.reach / c.impressions) * 100).toFixed(1)}%`, col: '#f97316' },
                    ].map(m => (
                        <div key={m.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{m.ico} {m.l}</div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: m.col, marginTop: 2 }}>{m.v}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>📋 콘텐츠별 도달 확산</div>
                {c.contentReach.map(x => (
                    <div key={x.title} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                            <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{x.title}</span>
                            <span style={{ color: c.col, fontWeight: 800 }}>{fmt(x.views)} views</span>
                        </div>
                        {[{ l: '조회수', v: x.views, c: '#ec4899' }, { l: '노출', v: x.impr, c: '#4f8ef7' }, { l: '도달', v: x.reach, c: '#22c55e' }].map(row => (
                            <div key={row.l} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', width: 28 }}>{row.l}</span>
                                <MiniBar v={row.v} max={maxV} col={row.c} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: row.c, width: 52, textAlign: 'right' }}>{fmt(row.v)}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PanelEngage({ c }) {
    const engTotal = c.likes + c.comments + c.saves + c.shares;
    const engRate = ((engTotal / c.followers) * 100).toFixed(2);
    const maxE = Math.max(c.likes, c.comments, c.saves, c.shares);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...CARD, background: `linear-gradient(145deg,${c.col}0a,rgba(8,18,38,0.95))`, border: `1px solid ${c.col}25` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>❤️ 참여 핵심 공식</div>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>( 좋아요 + 댓글 + 공유 + 저장 ) ÷ 팔로워</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: c.col, textShadow: `0 0 20px ${c.col}55` }}>{engRate}%</div>
                    <div style={{ fontSize: 11, color: Number(engRate) >= 3 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{Number(engRate) >= 5 ? '🔥 매우 높음' : Number(engRate) >= 3 ? '✅ 양호' : '⚠️ 낮음'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {[
                        { ico: '❤️', l: '좋아요', v: c.likes, col: '#ec4899' },
                        { ico: '💬', l: '댓글', v: c.comments, col: '#4f8ef7' },
                        { ico: '🔖', l: '저장', v: c.saves, col: '#22c55e' },
                        { ico: '📤', l: '공유', v: c.shares, col: '#a855f7' },
                        { ico: '🔗', l: '링크 클릭', v: c.linkClicks, col: '#f97316' },
                    ].map(m => (
                        <div key={m.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '7px 10px' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{m.ico} {m.l}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontSize: 14, fontWeight: 900, color: m.col, flex: 1 }}>{fmt(m.v)}</span>
                                <MiniBar v={m.v} max={Math.max(c.likes, c.linkClicks)} col={m.col} h={4} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>📋 콘텐츠별 참여도</div>
                {c.contentEng.map(x => {
                    const tot = x.likes + x.comments + x.saves + x.shares;
                    return (
                        <div key={x.title} style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.025)', border: `1px solid ${c.col}14` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{x.title}</span>
                                <span style={{ fontSize: 11, fontWeight: 900, color: c.col }}>합계 {fmt(tot)}</span>
                            </div>
                            {[{ l: '❤️', v: x.likes, c: '#ec4899' }, { l: '💬', v: x.comments, c: '#4f8ef7' }, { l: '🔖', v: x.saves, c: '#22c55e' }, { l: '📤', v: x.shares, c: '#a855f7' }].map(r => (
                                <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                    <span style={{ fontSize: 10, width: 18 }}>{r.l}</span>
                                    <MiniBar v={r.v} max={x.likes} col={r.c} />
                                    <span style={{ fontSize: 9, fontWeight: 700, color: r.c, width: 42, textAlign: 'right' }}>{fmt(r.v)}</span>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PanelConvert({ c }) {
    const FTOP = ['링크 클릭', '웹사이트 방문', '장바구니', '구매', '가입'];
    const FICON = ['🔗', '🌐', '🛒', '💰', '👤'];
    const FCOL = ['#4f8ef7', '#22c55e', '#f97316', '#ec4899', '#a855f7'];
    const totalRev = c.revenue;
    const cvr = ((c.purchases / c.uniqueLinkClicks) * 100).toFixed(1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ ...CARD, background: `linear-gradient(145deg,#22c55e0a,rgba(8,18,38,0.95))`, border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>💳 ROI 매출 요약</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                    {[
                        { l: '총 매출', v: fmt(totalRev, { prefix: '₩' }), col: '#22c55e' },
                        { l: '최종 전환수', v: fmt(c.purchases), col: '#ec4899' },
                        { l: '전환율(CVR)', v: `${cvr}%`, col: '#f97316' },
                        { l: '쿠폰 사용', v: fmt(c.couponUsed), col: '#a855f7' },
                        { l: 'UTM 트래픽', v: fmt(c.utmTraffic), col: '#4f8ef7' },
                        { l: '신규 가입', v: fmt(c.signups), col: '#14d9b0' },
                    ].map(m => (
                        <div key={m.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{m.l}</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: m.col, marginTop: 2 }}>{m.v}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>📊 전환 퍼널</div>
                {c.convFunnel.map((v, i) => {
                    const pct = (v / c.convFunnel[0] * 100).toFixed(0);
                    return (
                        <div key={i} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                <span style={{ color: 'rgba(255,255,255,0.65)' }}>{FICON[i]} {FTOP[i]}</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{pct}%</span>
                                    <span style={{ fontWeight: 800, color: FCOL[i], fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</span>
                                </div>
                            </div>
                            <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${FCOL[i]},${FCOL[i]}88)`, borderRadius: 6, boxShadow: `0 0 6px ${FCOL[i]}44`, transition: 'width 0.5s' }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PanelBrand({ c }) {
    const totalComments = c.sentimentPos + c.sentimentNeg + c.sentimentNeu;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>💬 댓글 감성 분석</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    {[{ l: '긍정', v: c.sentimentPos, col: '#22c55e', ico: '😊' }, { l: '부정', v: c.sentimentNeg, col: '#f87171', ico: '😞' }, { l: '중립', v: c.sentimentNeu, col: '#94a3b8', ico: '😐' }].map(s => (
                        <div key={s.l} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px', textAlign: 'center', border: `1px solid ${s.col}22` }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.ico}</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: s.col }}>{s.v}%</div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{s.l}</div>
                        </div>
                    ))}
                </div>
                <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${c.sentimentPos}%`, background: '#22c55e', boxShadow: '0 0 5px #22c55e55' }} />
                    <div style={{ width: `${c.sentimentNeu}%`, background: '#94a3b8' }} />
                    <div style={{ width: `${c.sentimentNeg}%`, background: '#f87171' }} />
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>🏷️ 브랜드 적합성</div>
                {[
                    { l: '브랜드 언급량', v: fmt(c.brandMentions), bar: (c.brandMentions / 5000) * 100, col: '#4f8ef7' },
                    { l: '콘텐츠 퀄리티', v: `${c.contentQuality}/5`, bar: (c.contentQuality / 5) * 100, col: '#22c55e' },
                    { l: '메시지 전달력', v: `${c.messagingScore}/5`, bar: (c.messagingScore / 5) * 100, col: '#f97316' },
                ].map(m => (
                    <div key={m.l} style={{ marginBottom: 9 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{m.l}</span>
                            <span style={{ fontWeight: 800, color: m.col }}>{m.v}</span>
                        </div>
                        <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${m.bar}%`, height: '100%', background: `linear-gradient(90deg,${m.col},${m.col}88)`, borderRadius: 4 }} />
                        </div>
                    </div>
                ))}
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>🏷️ 사용 해시태그</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {c.hashtags.map(h => (
                        <span key={h} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: `${c.col}15`, border: `1px solid ${c.col}30`, color: c.col }}>{h}</span>
                    ))}
                </div>
                <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>🔑 브랜드 키워드 언급</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {c.keywords.map(k => (
                            <span key={k} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}>{k}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PanelQuality({ c }) {
    const CRITERIA = [
        { key: 'growth', l: '팔로워 증가율', v: `+${c.growthRate}%/월`, score: c.qualityDetail.growth, max: 30, ico: '📈', col: '#22c55e', sub: c.growthRate >= 5 ? '매우 높음' : c.growthRate >= 2 ? '양호' : '낮음' },
        { key: 'fake', l: '가짜 팔로워', v: `${c.fakeFollowerRatio}%`, score: Math.max(0, 10 - c.qualityDetail.fake), max: 10, ico: '🤖', col: '#f87171', sub: c.fakeFollowerRatio < 3 ? '✅ 안전' : c.fakeFollowerRatio < 7 ? '⚠️ 주의' : '🔴 위험' },
        { key: 'freq', l: '콘텐츠 업로드 빈도', v: `${c.uploadFreq}회/주`, score: c.qualityDetail.freq, max: 25, ico: '📅', col: '#4f8ef7', sub: `주 ${c.uploadFreq}회` },
        { key: 'style', l: '콘텐츠 스타일', v: c.contentStyle, score: c.qualityDetail.style, max: 25, ico: '🎨', col: '#a855f7', sub: '' },
        { key: 'brand', l: '타 브랜드 협업 이력', v: `${c.brandHistory.length}개`, score: c.qualityDetail.brand, max: 25, ico: '🤝', col: '#f97316', sub: '' },
    ];
    const total = CRITERIA.reduce((s, x) => s + x.score, 0);
    const maxTotal = CRITERIA.reduce((s, x) => s + x.max, 0);
    const pct = (total / maxTotal) * 100;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 종합 점수 */}
            <div style={{ ...CARD, background: `linear-gradient(145deg,${c.col}0a,rgba(8,18,38,0.97))`, border: `1px solid ${c.col}25` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                    <div style={{ position: 'relative', width: 70, height: 70 }}>
                        <svg viewBox="0 0 70 70" width={70} height={70}>
                            <circle cx={35} cy={35} r={28} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
                            <circle cx={35} cy={35} r={28} fill="none" stroke={c.col} strokeWidth={10}
                                strokeDasharray={`${2 * Math.PI * 28 * pct / 100} ${2 * Math.PI * 28}`}
                                strokeLinecap="round" transform="rotate(-90 35 35)"
                                style={{ filter: `drop-shadow(0 0 5px ${c.col}66)` }} />
                            <text x={35} y={39} textAnchor="middle" style={{ fontSize: 14, fontWeight: 900, fill: c.col }}>{total}</text>
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>⭐ 종합 품질 점수</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: c.col, textShadow: `0 0 15px ${c.col}55` }}>{pct.toFixed(0)}점</div>
                        <div style={{ fontSize: 11, color: pct >= 85 ? '#4ade80' : pct >= 70 ? '#eab308' : '#f87171', fontWeight: 700 }}>
                            {pct >= 85 ? '🏆 최우수 협업 파트너' : pct >= 70 ? '✅ 협업 권장' : '⚠️ 추가 검토 필요'}
                        </div>
                    </div>
                </div>
                {/* 레이더 바 */}
                {CRITERIA.map(cr => (
                    <div key={cr.key} style={{ marginBottom: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10 }}>
                            <span style={{ color: 'rgba(255,255,255,0.55)' }}>{cr.ico} {cr.l}</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {cr.sub && <span style={{ color: 'rgba(255,255,255,0.3)' }}>{cr.sub}</span>}
                                <span style={{ fontWeight: 800, color: cr.col }}>{cr.v}</span>
                            </div>
                        </div>
                        <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${(cr.score / cr.max) * 100}%`, height: '100%', background: `linear-gradient(90deg,${cr.col},${cr.col}77)`, borderRadius: 4, boxShadow: `0 0 5px ${cr.col}55` }} />
                        </div>
                    </div>
                ))}
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>🤝 타 브랜드 협업 이력</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {c.brandHistory.map(b => (
                        <span key={b} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>{b}</span>
                    ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>
                    ✅ 콘텐츠 스타일: <span style={{ color: c.col, fontWeight: 700 }}>{c.contentStyle}</span><br />
                    📅 업로드 주기: <span style={{ color: '#4f8ef7', fontWeight: 700 }}>주 {c.uploadFreq}회 평균</span>
                </div>
            </div>
        </div>
    );
}

const PANELS = { reach: PanelReach, engage: PanelEngage, convert: PanelConvert, brand: PanelBrand, quality: PanelQuality, report: PanelReport, ai: PanelAI };

// ══════════════════════════════════════════════════════════════════════
export default function DashInfluencer() {
    const { t } = useI18n();
    const [tab, setTab] = useState('reach');
    const [sel, setSel] = useState('c1');

    // i18n 동적 탭
    const TABS = useMemo(() => TABS_DEFS.map(d => ({
        ...d,
        label: t(`tabs.${d.id}`),
    })), [t]);

    // ✅ GlobalDataContext 실시간 연동
    const { pnlStats, orderStats, budgetStats } = useGlobalData();

    const cur = CREATORS.find(c => c.id === sel);
    const Panel = PANELS[tab];

    // 집계 KPI
    const totalRev = CREATORS.reduce((s, c) => s + c.revenue, 0);
    const totalFol = CREATORS.reduce((s, c) => s + c.followers, 0);
    const avgEng = (CREATORS.reduce((s, c) => s + ((c.likes + c.comments + c.saves + c.shares) / c.followers * 100), 0) / CREATORS.length).toFixed(1);
    const totalPurch = CREATORS.reduce((s, c) => s + c.purchases, 0);

    return (
        <div style={{ display: 'grid', gap: G }}>
            {/* ✅ GlobalDataContext 연동 상태 배지 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                <span style={{ fontSize: 10, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 20, padding: '3px 10px', color: '#a855f7', fontWeight: 700 }}>
                    ● 실시간 · 인플루언서 연동 활성
                </span>
                <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 10px', color: '#22c55e', fontWeight: 700 }}>
                    💰 주문 연결 {orderStats.totalOrders.toLocaleString()}건
                </span>
                <span style={{ fontSize: 10, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 20, padding: '3px 10px', color: '#eab308', fontWeight: 700 }}>
                    📊 P&L 영업이익 {fmt(pnlStats.operatingProfit, { prefix: '₩' })}
                </span>
                <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 20, padding: '3px 10px', color: '#f97316', fontWeight: 700 }}>
                    💸 광고비 누적 {fmt(budgetStats.totalSpent, { prefix: '₩' })}
                </span>
            </div>

            {/* ── KPI 요약 4열 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: G }}>
                {[
                    { ico: '👥', l: 'Total Followers', v: fmt(totalFol), d: 8.4, col: '#a855f7' },
                    { ico: '❤️', l: 'Avg Eng. Rate', v: `${avgEng}%`, d: 1.2, col: '#ec4899' },
                    { ico: '💰', l: 'Creator Revenue', v: fmt(totalRev, { prefix: '₩' }), d: 14.2, col: '#22c55e' },
                    { ico: '💳', l: 'Total Purchases', v: fmt(totalPurch), d: 9.8, col: '#f97316' },
                ].map(m => (
                    <div key={m.l} style={{ borderRadius: 14, padding: '1px', background: `linear-gradient(135deg,${m.col}44,rgba(255,255,255,0.04))`, boxShadow: `0 4px 20px ${m.col}18` }}>
                        <div style={{ background: 'linear-gradient(145deg,#060e1e,#030810)', borderRadius: 13, padding: '13px 16px', height: 90, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.36)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{m.l}</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: m.col, lineHeight: 1.1, marginTop: 3, textShadow: `0 0 18px ${m.col}55` }}>{m.v}</div>
                                </div>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.col}18`, border: `1px solid ${m.col}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{m.ico}</div>
                            </div>
                            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 800, background: 'rgba(74,222,128,0.1)', padding: '1px 6px', borderRadius: 6, alignSelf: 'flex-start' }}>▲ {m.d}%</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── 섹션 탭 ── */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 11, transition: 'all 0.2s',
                        background: tab === t.id ? 'linear-gradient(135deg,rgba(79,142,247,0.3),rgba(79,142,247,0.1))' : 'transparent',
                        color: tab === t.id ? '#4f8ef7' : 'rgba(255,255,255,0.45)',
                        boxShadow: tab === t.id ? '0 2px 12px rgba(79,142,247,0.2)' : undefined,
                        borderBottom: tab === t.id ? '2px solid #4f8ef7' : '2px solid transparent',
                    }}>
                        {t.ico} {t.label}
                    </button>
                ))}
            </div>

            {/* ── 좌: 크리에이터 목록 / 우: 상세 패널 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: G, alignItems: 'start' }}>

                {/* 크리에이터 카드 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {CREATORS.map(c => {
                        const isSel = sel === c.id;
                        const engR = ((c.likes + c.comments + c.saves + c.shares) / c.followers * 100).toFixed(1);
                        // 탭별 서브스탯
                        const tabStat = tab === 'reach' ? { l: '팔로워', v: fmt(c.followers) }
                            : tab === 'engage' ? { l: '참여율', v: `${engR}%` }
                                : tab === 'convert' ? { l: '매출', v: fmt(c.revenue, { prefix: '₩' }) }
                                    : tab === 'brand' ? { l: '긍정', v: `${c.sentimentPos}%` }
                                        : { l: '점수', v: `${Math.round((c.qualityDetail.growth + c.qualityDetail.fake + c.qualityDetail.freq + c.qualityDetail.style + c.qualityDetail.brand) / 75 * 100)}pt` };

                        return (
                            <div key={c.id} onClick={() => setSel(c.id)} style={{
                                position: 'relative', borderRadius: 13, padding: '1px', cursor: 'pointer',
                                background: isSel ? `linear-gradient(135deg,${c.col}70,${c.col}28)` : `linear-gradient(135deg,${c.col}35,rgba(255,255,255,0.04))`,
                                boxShadow: isSel ? `0 0 0 2px ${c.col},0 8px 24px ${c.col}40` : `0 4px 14px ${c.col}10`,
                                transform: isSel ? 'scale(1.01)' : 'scale(1)', transition: 'all 0.22s',
                            }}>
                                <div style={{ background: 'linear-gradient(145deg,#08121f,#040a12)', borderRadius: 12, padding: '11px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${c.col},${c.col}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: `0 0 10px ${c.col}55` }}>{c.name[1].toUpperCase()}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>{P_ICO[c.platform]} {c.platform} · {c.cat}</div>
                                        </div>
                                        <span style={{ fontSize: 9, fontWeight: 900, color: BADGE[c.badge], background: `${BADGE[c.badge]}18`, padding: '1px 6px', borderRadius: 5, border: `1px solid ${BADGE[c.badge]}30` }}>{c.badge}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
                                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '5px 6px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>팔로워</div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: c.col }}>{fmt(c.followers)}</div>
                                        </div>
                                        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '5px 6px', textAlign: 'center' }}>
                                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>참여율</div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#22c55e' }}>{engR}%</div>
                                        </div>
                                        <div style={{ background: `${c.col}0a`, borderRadius: 6, padding: '5px 6px', textAlign: 'center', border: `1px solid ${c.col}20` }}>
                                            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{tabStat.l}</div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: c.col }}>{tabStat.v}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 상세 패널 */}
                <div style={{ maxHeight: 580, overflowY: 'auto', paddingRight: 2 }}>
                    {cur && <Panel c={cur} />}
                </div>
            </div>
        </div>
    );
}
