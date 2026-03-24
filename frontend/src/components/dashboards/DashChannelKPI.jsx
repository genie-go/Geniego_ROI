// ══════════════════════════════════════════════════════════════════════
//  📡 채널 KPI — Channel Intelligence with Drill-Down
//  채널 클릭 → 성별/연령/지역/전환퍼널/광고유형 우측 패널
// ✅ GlobalDataContext 실시간 연동: 소마/ROAS/주문 실시간 반영
// ══════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { LineChart, Spark, seedSeries, fmt } from './ChartUtils.jsx';

const CH = {
    meta: {
        name: 'Meta Ads', icon: '📘', color: '#1877f2', roas: 3.2, rev: 2840000, spend: 148200, ctr: 4.0, conv: 3.8, pct: 78,
        gender: { m: 38, f: 62 }, age: [5, 22, 34, 24, 10, 5], regions: [{ n: '서울', p: 28 }, { n: '경기', p: 18 }, { n: '부산', p: 12 }, { n: '인천', p: 9 }, { n: '대구', p: 7 }],
        funnel: [2100000, 84200, 38400, 9800, 3200], orders: 3200, cpc: 342
    },
    google: {
        name: 'Google Ads', icon: '🔍', color: '#22c55e', roas: 4.1, rev: 3100000, spend: 121800, ctr: 4.2, conv: 4.4, pct: 88,
        gender: { m: 54, f: 46 }, age: [3, 16, 30, 32, 14, 5], regions: [{ n: '서울', p: 30 }, { n: '경기', p: 20 }, { n: '부산', p: 11 }, { n: '인천', p: 8 }, { n: '대전', p: 7 }],
        funnel: [1800000, 75600, 34200, 10800, 4800], orders: 4800, cpc: 274
    },
    tiktok: {
        name: 'TikTok', icon: '🎵', color: '#a855f7', roas: 2.8, rev: 1920000, spend: 89400, ctr: 2.6, conv: 2.1, pct: 62,
        gender: { m: 44, f: 56 }, age: [12, 38, 30, 14, 4, 2], regions: [{ n: '서울', p: 24 }, { n: '경기', p: 20 }, { n: '부산', p: 14 }, { n: '인천', p: 10 }, { n: '대전', p: 8 }],
        funnel: [5400000, 142000, 48000, 9200, 2980], orders: 2980, cpc: 219
    },
    coupang: {
        name: 'Coupang', icon: '🛒', color: '#14d9b0', roas: 3.6, rev: 2200000, spend: 48000, ctr: 1.8, conv: 3.2, pct: 72,
        gender: { m: 46, f: 54 }, age: [4, 18, 32, 28, 13, 5], regions: [{ n: '경기', p: 28 }, { n: '서울', p: 24 }, { n: '인천', p: 12 }, { n: '부산', p: 10 }, { n: '대구', p: 8 }],
        funnel: [1200000, 21600, 9800, 4200, 2400], orders: 2400, cpc: 180
    },
    naver: {
        name: '네이버 쇼핑', icon: '🟠', color: '#f97316', roas: 3.4, rev: 1800000, spend: 55000, ctr: 2.1, conv: 3.0, pct: 68,
        gender: { m: 42, f: 58 }, age: [3, 14, 28, 32, 18, 5], regions: [{ n: '서울', p: 26 }, { n: '경기', p: 22 }, { n: '부산', p: 12 }, { n: '인천', p: 10 }, { n: '대구', p: 8 }],
        funnel: [857000, 18000, 8200, 3600, 2100], orders: 2100, cpc: 210
    },
    amazon: {
        name: 'Amazon', icon: '📦', color: '#eab308', roas: 2.9, rev: 1780000, spend: 63100, ctr: 2.6, conv: 2.4, pct: 59,
        gender: { m: 56, f: 44 }, age: [2, 12, 26, 34, 20, 6], regions: [{ n: '서울', p: 22 }, { n: '경기', p: 18 }, { n: '부산', p: 14 }, { n: '인천', p: 12 }, { n: '대구', p: 10 }],
        funnel: [685000, 17800, 7200, 2600, 1600], orders: 1600, cpc: 295
    },
};
const LIST = Object.entries(CH).map(([id, d]) => ({ id, ...d }));
const DAYS = Array.from({ length: 14 }, (_, i) => { const d = new Date('2026-03-07'); d.setDate(d.getDate() - (13 - i)); return `${d.getMonth() + 1}/${d.getDate()}`; });
const G = 10;
const P = { background: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(13,21,37,0.9))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '13px 15px' };
const AGE_L = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];
const FC = ['#4f8ef7', '#22c55e', '#a855f7', '#f97316', '#ec4899'];

function DetailPanel({ ch }) {
    const c = CH[ch];
    const maxAge = Math.max(...c.age);
    const maxFun = c.funnel[0];
    const fLabels = ['노출', '클릭', '상품조회', '장바구니', '구매'];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: '100%' }}>
            {/* 헤더 */}
            <div style={{ ...P, background: `linear-gradient(145deg,${c.color}14,rgba(13,21,37,0.95))`, border: `1px solid ${c.color}28` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.color}22`, border: `1px solid ${c.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: `0 0 16px ${c.color}44` }}>{c.icon}</div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: c.color, textShadow: `0 0 14px ${c.color}55` }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Channel Intelligence Report</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[{ l: 'ROAS', v: `${c.roas}×`, col: c.color }, { l: 'Revenue', v: fmt(c.rev, { prefix: '₩' }), col: '#22c55e' }, { l: 'Spend', v: fmt(c.spend, { prefix: '₩' }), col: '#f97316' }, { l: 'CTR', v: `${c.ctr}%`, col: '#a855f7' }, { l: 'Conv.', v: `${c.conv}%`, col: '#ec4899' }, { l: 'CPC', v: `₩${c.cpc}`, col: '#14d9b0' }].map(m => (
                        <div key={m.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{m.l}</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: m.col }}>{m.v}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 성별 */}
            <div style={P}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>⚥ 성별 분포</div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {[{ l: '👨 남성', v: c.gender.m, col: '#4f8ef7' }, { l: '👩 여성', v: c.gender.f, col: '#f472b6' }].map(g => (
                        <div key={g.l} style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{g.l}</span>
                                <span style={{ fontWeight: 800, color: g.col }}>{g.v}%</span>
                            </div>
                            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                                <div style={{ width: `${g.v}%`, height: '100%', background: g.col, borderRadius: 4, boxShadow: `0 0 8px ${g.col}66` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 연령 */}
            <div style={P}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>📊 연령대 분포</div>
                {c.age.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 38, flexShrink: 0 }}>{AGE_L[i]}</span>
                        <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${(v / maxAge) * 100}%`, height: '100%', background: `hsl(${200 + i * 30},70%,55%)`, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: `hsl(${200 + i * 30},70%,65%)`, width: 24, textAlign: 'right' }}>{v}%</span>
                    </div>
                ))}
            </div>

            {/* 지역 */}
            <div style={P}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>📍 Top 지역</div>
                {c.regions.map((r, i) => (
                    <div key={r.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)', width: 14, fontWeight: 800 }}>{i + 1}</span>
                        <span style={{ flex: 1, color: 'rgba(255,255,255,0.78)', fontWeight: 600 }}>{r.n}</span>
                        <div style={{ width: 70, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                            <div style={{ width: `${r.p}%`, height: '100%', background: `linear-gradient(90deg,${c.color},${c.color}77)`, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 800, color: c.color, width: 28 }}>{r.p}%</span>
                    </div>
                ))}
            </div>

            {/* 전환 퍼널 */}
            <div style={P}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>⚡ Conversion Funnel</div>
                {c.funnel.map((v, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>
                            <span>{fLabels[i]}</span>
                            <span style={{ fontWeight: 700, color: FC[i] }}>{v.toLocaleString()}</span>
                        </div>
                        <div style={{ height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${(v / maxFun) * 100}%`, height: '100%', background: `linear-gradient(90deg,${FC[i]},${FC[i]}88)`, borderRadius: 4, boxShadow: `0 0 5px ${FC[i]}44` }} />
                        </div>
                        {i > 0 && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textAlign: 'right', marginTop: 1 }}>
                            ↓ {(((c.funnel[i - 1] - v) / c.funnel[i - 1]) * 100).toFixed(1)}% 이탈
                        </div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DashChannelKPI() {
    const [sel, setSel] = useState(null);

    // ✅ GlobalDataContext 실시간 연동
    const { channelBudgets, budgetStats, pnlStats, orderStats } = useGlobalData();

    // 채널 ROAS/광고비를 GlobalDataContext 데이터로 오버레이
    const liveList = useMemo(() => {
        return LIST.map(c => {
            const live = channelBudgets[c.id];
            if (!live) return c;
            return {
                ...c,
                roas: live.roas || c.roas,
                spend: live.spent || c.spend,
                rev: (live.spent * live.roas) || c.rev,
            };
        });
    }, [channelBudgets]);

    const lineData = DAYS.map((d, i) => ({ d, ...Object.fromEntries(liveList.map(c => [c.id, seedSeries(c.rev / 1000, 14, 0.15)[i]])) }));
    const G = 10;
    return (
        <div style={{ display: 'grid', gap: G }}>
            {/* ✅ 실시간 KPI 모니터 배지 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0' }}>
                <span style={{ fontSize: 10, background: 'rgba(20,217,176,0.12)', border: '1px solid rgba(20,217,176,0.3)', borderRadius: 20, padding: '3px 10px', color: '#14d9b0', fontWeight: 700 }}>
                    ● 실시간 · 블렌디드 ROAS {budgetStats.blendedRoas.toFixed(2)}x
                </span>
                <span style={{ fontSize: 10, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 20, padding: '3px 10px', color: '#f97316', fontWeight: 700 }}>
                    💸 얭방고비 {fmt(budgetStats.totalSpent, { prefix: '₩' })}
                </span>
                <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 10px', color: '#22c55e', fontWeight: 700 }}>
                    📦 주문 {orderStats.totalOrders.toLocaleString()}건
                </span>
                <span style={{ fontSize: 10, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 20, padding: '3px 10px', color: '#eab308', fontWeight: 700 }}>
                    📊 영업이익 {fmt(pnlStats.operatingProfit, { prefix: '₩' })}
                </span>
            </div>
            {/* ── Row 1: 채널 scorecard 6열 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: G }}>
                {LIST.map(c => {
                    const isSel = sel === c.id;
                    return (
                        <div key={c.id} onClick={() => setSel(isSel ? null : c.id)} style={{
                            position: 'relative', borderRadius: 14, padding: '1px', overflow: 'hidden', cursor: 'pointer',
                            background: isSel ? `linear-gradient(135deg,${c.color}70,${c.color}28)` : `linear-gradient(135deg,${c.color}40,rgba(255,255,255,0.04))`,
                            boxShadow: isSel ? `0 0 0 2px ${c.color}, 0 8px 24px ${c.color}40` : `0 4px 16px ${c.color}14`,
                            transform: isSel ? 'scale(1.03)' : 'scale(1)', transition: 'all 0.25s'
                        }}>
                            <div style={{ background: 'linear-gradient(145deg,#0d1525,#060b14)', borderRadius: 13, padding: '10px 12px', height: 104, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{c.icon} {c.name.split(' ')[0]}</span>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: c.pct >= 80 ? '#4ade80' : c.pct >= 65 ? '#fde047' : '#f87171', background: c.pct >= 80 ? 'rgba(74,222,128,0.12)' : 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 5 }}>{c.pct}%</span>
                                </div>
                                <div style={{ fontSize: 26, fontWeight: 900, color: c.color, lineHeight: 1, textShadow: `0 0 18px ${c.color}60` }}>{c.roas}<span style={{ fontSize: 13 }}>×</span></div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>ROAS · {fmt(c.rev, { prefix: '₩' })}</div>
                                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <div style={{ width: `${c.pct}%`, height: '100%', background: `linear-gradient(90deg,${c.color},${c.color}77)`, borderRadius: 3, boxShadow: `0 0 7px ${c.color}55` }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Row 2: 트렌드/테이블(좌) + 드릴다운(우) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: G }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
                    {/* 트렌드 */}
                    <div style={P}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Channel Revenue Trend (14일, K₩)</span>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {LIST.map(c => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }} onClick={() => setSel(sel === c.id ? null : c.id)}>
                                        <div style={{ width: 12, height: 2.5, background: c.color, borderRadius: 2, boxShadow: `0 0 5px ${c.color}88` }} />
                                        {c.name.split(' ')[0]}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <LineChart data={lineData} labels={DAYS} series={LIST.map(c => ({ key: c.id, color: c.color, width: sel === c.id ? 2.8 : 1.6, area: sel === c.id }))} width={660} height={142} />
                    </div>
                    {/* 상세 테이블 */}
                    <div style={P}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 10 }}>📋 Channel Performance Dashboard</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 52px 1fr 64px 42px 50px 60px', gap: 8, padding: '0 6px 8px', fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span>Channel</span><span>ROAS</span><span>Achievement</span><span>Spend</span><span>CTR</span><span>Conv.</span><span>Trend</span>
                        </div>
                        {LIST.map((c, i) => (
                            <div key={c.id} onClick={() => setSel(sel === c.id ? null : c.id)}
                                style={{ display: 'grid', gridTemplateColumns: '100px 52px 1fr 64px 42px 50px 60px', gap: 8, padding: '9px 6px', borderBottom: '1px solid rgba(255,255,255,0.035)', alignItems: 'center', fontSize: 11, cursor: 'pointer', borderRadius: 8, background: sel === c.id ? `${c.color}0e` : i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent', transition: 'background 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 3, height: 20, borderRadius: 2, background: c.color, flexShrink: 0, boxShadow: `0 0 6px ${c.color}66` }} />
                                    <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{c.name}</span>
                                </div>
                                <span style={{ fontSize: 15, fontWeight: 900, color: c.color, textShadow: `0 0 10px ${c.color}55` }}>{c.roas}×</span>
                                <div>
                                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 3 }}>
                                        <div style={{ width: `${c.pct}%`, height: '100%', background: `linear-gradient(90deg,${c.pct >= 80 ? '#22c55e' : c.pct >= 65 ? '#eab308' : '#ef4444'},rgba(255,255,255,0.3))`, borderRadius: 3 }} />
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: c.pct >= 80 ? '#4ade80' : c.pct >= 65 ? '#fde047' : '#f87171' }}>{c.pct}%</span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.spend, { prefix: '₩' })}</span>
                                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{c.ctr}%</span>
                                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{c.conv}%</span>
                                <Spark data={seedSeries(c.rev / 1000, 12, 0.14)} color={c.color} h={22} w={58} area />
                            </div>
                        ))}
                    </div>
                </div>
                {/* 우측 패널 */}
                <div>
                    {sel ? <DetailPanel ch={sel} />
                        : (
                            <div style={{ ...P, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 4 }}>Channel Intelligence</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
                                    채널 카드 또는 테이블에서<br /><span style={{ color: '#4f8ef7' }}>채널명을 클릭</span>하면<br />해당 채널의 상세 분석이 표시됩니다:<br />
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>• 성별/연령 분포<br />• 지역별 전환 현황<br />• 전환 퍼널 분석</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                    {LIST.map(c => (
                                        <div key={c.id} onClick={() => setSel(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: `${c.color}0a`, border: `1px solid ${c.color}18`, cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = `${c.color}18`} onMouseLeave={e => e.currentTarget.style.background = `${c.color}0a`}>
                                            <span style={{ fontSize: 18 }}>{c.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{c.name}</div>
                                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>ROAS {c.roas}× · 달성률 {c.pct}%</div>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 900, color: c.color }}>{fmt(c.rev, { prefix: '₩' })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}
