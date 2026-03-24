// ══════════════════════════════════════════════════════════════════════
//  🛒 커머스·정산 — Platform Intelligence with Drill-Down
//  플랫폼 클릭 → 구매자 성별/연령/지역/카테고리/결제수단 상세
// ✅ GlobalDataContext 실시간 연동: 주문/매출/정산 실시간 반영
// ══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { DonutChart, Spark, StackBar, seedSeries, fmt } from './ChartUtils.jsx';

const PLAT = {
    coupang: {
        n: '쿠팡', ico: '🛒', col: '#14d9b0', orders: 6840, rev: 520000, avgOrd: 76, ret: 1.8,
        gm: 46, gf: 54, age: [4, 18, 30, 28, 14, 6], reg: [['경기', 28], ['서울', 24], ['인천', 12], ['부산', 10], ['대구', 8]],
        cats: [['전자기기', 32], ['생활용품', 26], ['식품', 20], ['패션', 14], ['기타', 8]],
        pay: [['신용카드', 58], ['쿠페이', 32], ['계좌이체', 10]], peak: '21:00–23:00', mobile: 82
    },
    naver: {
        n: '네이버', ico: '🟠', col: '#22c55e', orders: 3200, rev: 280000, avgOrd: 87, ret: 2.4,
        gm: 42, gf: 58, age: [2, 14, 28, 34, 18, 4], reg: [['서울', 30], ['경기', 22], ['부산', 12], ['대전', 9], ['광주', 7]],
        cats: [['패션', 38], ['뷰티', 28], ['식품', 16], ['전자기기', 12], ['기타', 6]],
        pay: [['신용카드', 52], ['네이버페이', 38], ['계좌이체', 10]], peak: '12:00–14:00', mobile: 74
    },
    gmarket: {
        n: 'G마켓', ico: '🏪', col: '#4f8ef7', orders: 1840, rev: 142000, avgOrd: 77, ret: 3.1,
        gm: 50, gf: 50, age: [3, 16, 30, 30, 16, 5], reg: [['서울', 28], ['경기', 20], ['부산', 14], ['대구', 10], ['인천', 8]],
        cats: [['생활용품', 30], ['전자기기', 26], ['패션', 22], ['식품', 14], ['기타', 8]],
        pay: [['신용카드', 64], ['스마일페이', 26], ['계좌이체', 10]], peak: '19:00–21:00', mobile: 68
    },
    st11: {
        n: '11번가', ico: '🏬', col: '#f97316', orders: 1240, rev: 96000, avgOrd: 77, ret: 2.8,
        gm: 48, gf: 52, age: [4, 18, 28, 30, 15, 5], reg: [['서울', 26], ['경기', 22], ['부산', 13], ['인천', 10], ['대전', 8]],
        cats: [['전자기기', 34], ['생활용품', 24], ['패션', 22], ['식품', 12], ['기타', 8]],
        pay: [['신용카드', 60], ['SK페이', 28], ['계좌이체', 12]], peak: '20:00–22:00', mobile: 72
    },
    auction: {
        n: '옥션', ico: '⚡', col: '#a855f7', orders: 880, rev: 68000, avgOrd: 77, ret: 3.4,
        gm: 52, gf: 48, age: [3, 14, 26, 32, 20, 5], reg: [['서울', 24], ['경기', 20], ['부산', 16], ['대구', 12], ['인천', 9]],
        cats: [['전자기기', 36], ['생활용품', 26], ['패션', 18], ['스포츠', 12], ['기타', 8]],
        pay: [['신용카드', 62], ['옥션페이', 24], ['계좌이체', 14]], peak: '21:00–23:00', mobile: 66
    },
};
const PLIST = Object.entries(PLAT).map(([id, d]) => ({ id, ...d }));
const AGE_L = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];
const ORDERS = [
    { id: 'ORD-8821', ch: '쿠팡', prod: '노이즈캔슬링 헤드폰', amt: 89000, st: '배송중', sc: '#f97316', gnd: '여성', age: '25-34', reg: '서울' },
    { id: 'ORD-8820', ch: '네이버', prod: 'RGB 기계식 키보드', amt: 42000, st: '완료', sc: '#22c55e', gnd: '남성', age: '25-34', reg: '경기' },
    { id: 'ORD-8819', ch: '11번가', prod: 'USB-C 허브 Pro', amt: 58000, st: '접수', sc: '#4f8ef7', gnd: '남성', age: '35-44', reg: '부산' },
    { id: 'ORD-8818', ch: '쿠팡', prod: '게이밍 마우스 X', amt: 35000, st: '출고중', sc: '#a855f7', gnd: '남성', age: '18-24', reg: '경기' },
    { id: 'ORD-8817', ch: 'G마켓', prod: '무선충전패드 15W', amt: 28000, st: '취소', sc: '#ef4444', gnd: '여성', age: '35-44', reg: '인천' },
];
const G = 10;
const CARD = { background: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(13,21,37,0.9))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '13px 15px' };
const FLOW = [{ l: '접수', v: 4200, c: '#4f8ef7' }, { l: '출고중', v: 8100, c: '#a855f7' }, { l: '배송중', v: 4900, c: '#f97316' }, { l: '완료', v: 11400, c: '#22c55e' }];

function PlatDetail({ id }) {
    const p = PLAT[id];
    const mx = Math.max(...p.age);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', height: '100%' }}>
            <div style={{ ...CARD, background: `linear-gradient(145deg,${p.col}14,rgba(13,21,37,0.95))`, border: `1px solid ${p.col}28` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${p.col}22`, border: `1px solid ${p.col}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: `0 0 14px ${p.col}44` }}>{p.ico}</div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: p.col, textShadow: `0 0 14px ${p.col}55` }}>{p.n}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Platform Intelligence</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[{ l: '주문수', v: p.orders.toLocaleString() + '건', c: p.col }, { l: '총 매출', v: fmt(p.rev, { prefix: '₩' }), c: '#22c55e' }, { l: '평균주문', v: `₩${p.avgOrd}K`, c: '#4f8ef7' }, { l: '반품율', v: `${p.ret}%`, c: '#f97316' }, { l: '모바일', v: `${p.mobile}%`, c: '#a855f7' }, { l: '피크타임', v: p.peak.split('–')[0], c: '#ec4899' }].map(m => (
                        <div key={m.l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 }}>{m.l}</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: m.c }}>{m.v}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>⚥ 구매자 성별</div>
                {[{ l: '👨 남성', v: p.gm, c: '#4f8ef7' }, { l: '👩 여성', v: p.gf, c: '#f472b6' }].map(g => (
                    <div key={g.l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, flex: 1, color: 'rgba(255,255,255,0.55)' }}>{g.l}</span>
                        <div style={{ width: 110, height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                            <div style={{ width: `${g.v}%`, height: '100%', background: g.c, borderRadius: 4, boxShadow: `0 0 6px ${g.c}55` }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: g.c, width: 30, textAlign: 'right' }}>{g.v}%</span>
                    </div>
                ))}
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>📊 구매자 연령대</div>
                {p.age.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', width: 36, flexShrink: 0 }}>{AGE_L[i]}</span>
                        <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                            <div style={{ width: `${(v / mx) * 100}%`, height: '100%', background: `hsl(${200 + i * 30},70%,55%)`, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: `hsl(${200 + i * 30},70%,65%)`, width: 22, textAlign: 'right' }}>{v}%</span>
                    </div>
                ))}
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>📍 지역별 주문</div>
                {p.reg.map(([n, pct], i) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                        <span style={{ color: 'rgba(255,255,255,0.28)', width: 14 }}>{i + 1}</span>
                        <span style={{ flex: 1, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{n}</span>
                        <div style={{ width: 70, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${p.col},${p.col}77)`, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 800, color: p.col, width: 28 }}>{pct}%</span>
                    </div>
                ))}
            </div>
            <div style={CARD}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>🛍️ 카테고리 · 결제수단</div>
                {p.cats.slice(0, 3).map(([n, pct], i) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, fontSize: 11 }}>
                        <span style={{ flex: 1, color: 'rgba(255,255,255,0.65)' }}>{n}</span>
                        <div style={{ width: 60, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: `hsl(${180 + i * 40},70%,55%)`, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: `hsl(${180 + i * 40},70%,65%)`, width: 24 }}>{pct}%</span>
                    </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {p.pay.map(([n, pct], i) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 10 }}>
                            <span style={{ flex: 1, color: 'rgba(255,255,255,0.5)' }}>{['💳', '📱', '🏦'][i]} {n}</span>
                            <span style={{ fontWeight: 800, color: p.col }}>{pct}%</span>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>⏰ 피크 시간대: <span style={{ color: p.col, fontWeight: 700 }}>{p.peak}</span></div>
            </div>
        </div>
    );
}

export default function DashCommerce() {\n    const { t } = useI18n();
    const [sel, setSel] = useState(null);
    const [selOrd, setSelOrd] = useState(null);

    // ✅ GlobalDataContext 실시간 연동
    const { orderStats, settlementStats, pnlStats } = useGlobalData();

    // 실시간 데이터 우선, 로컬 fallback
    const totalRev = orderStats.totalRevenue || PLIST.reduce((s, p) => s + p.rev, 0);
    const totalOrd = orderStats.totalOrders || PLIST.reduce((s, p) => s + p.orders, 0);

    return (
        <div style={{ display: 'grid', gap: G }}>
            {/* ✅ 실시간 연동 상태 배지 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '6px 0' }}>
                <span style={{ fontSize: 10, background: 'rgba(20,217,176,0.12)', border: '1px solid rgba(20,217,176,0.3)', borderRadius: 20, padding: '3px 10px', color: '#14d9b0', fontWeight: 700 }}>
                    ● 실시간 · 총주문 {orderStats.totalOrders.toLocaleString()}건
                </span>
                <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 10px', color: '#22c55e', fontWeight: 700 }}>
                    💰 총매출 {fmt(orderStats.totalRevenue || totalRev, { prefix: '₩' })}
                </span>
                {settlementStats.totalNetPayout > 0 && (
                    <span style={{ fontSize: 10, background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 20, padding: '3px 10px', color: '#4f8ef7', fontWeight: 700 }}>
                        ✅ 정산완료 {fmt(settlementStats.totalNetPayout, { prefix: '₩' })}
                    </span>
                )}
                <span style={{ fontSize: 10, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 20, padding: '3px 10px', color: '#eab308', fontWeight: 700 }}>
                    📊 영업이익 {fmt(pnlStats.operatingProfit, { prefix: '₩' })}
                </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: G }}>
                {[{ ico: '📦', l: t('commerce.totalOrders'), v: totalOrd.toLocaleString() + '건', d: 6.2, col: '#4f8ef7', h: orderStats.totalOrders > 0 ? t('commerce.liveSync') : 'Today' }, { ico: '💰', l: t('commerce.grossRevenue'), v: fmt(totalRev, { prefix: '₩' }), d: 8.3, col: '#22c55e', h: t('commerce.settled') }, { ico: '↩️', l: t('commerce.returnRate'), v: '2.1%', d: -0.3, col: '#f97316', h: t('commerce.targetB3') }, { ico: '⚖️', l: t('commerce.reconRate'), v: '97.6%', d: 0.2, col: '#14d9b0', h: t('commerce.autoMatch') }].map(m => (
                    <div key={m.l} style={{ position: 'relative', borderRadius: 14, padding: '1px', overflow: 'hidden', background: `linear-gradient(135deg,${m.col}44,rgba(255,255,255,0.04))`, boxShadow: `0 4px 20px ${m.col}18` }}>
                        <div style={{ background: 'linear-gradient(145deg,#0d1525,#060b14)', borderRadius: 13, padding: '13px 16px', height: 90, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.36)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{m.l}</div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: m.col, lineHeight: 1.1, marginTop: 3, textShadow: `0 0 18px ${m.col}55` }}>{m.v}</div>
                                </div>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.col}18`, border: `1px solid ${m.col}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{m.ico}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: m.d >= 0 ? '#4ade80' : '#f87171', fontWeight: 800, background: m.d >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '1px 6px', borderRadius: 6 }}>{m.d >= 0 ? '▲' : '▼'} {Math.abs(m.d).toFixed(1)}%</span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)' }}>{m.h}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: G }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: G }}>
                        {PLIST.map(p => {
                            const isSel = sel === p.id;
                            return (
                                <div key={p.id} onClick={() => setSel(isSel ? null : p.id)} style={{ position: 'relative', borderRadius: 13, padding: '1px', overflow: 'hidden', cursor: 'pointer', background: isSel ? `linear-gradient(135deg,${p.col}70,${p.col}28)` : `linear-gradient(135deg,${p.col}35,rgba(255,255,255,0.04))`, boxShadow: isSel ? `0 0 0 2px ${p.col},0 8px 24px ${p.col}40` : `0 4px 14px ${p.col}12`, transform: isSel ? 'scale(1.03)' : 'scale(1)', transition: 'all 0.25s' }}>
                                    <div style={{ background: 'linear-gradient(145deg,#0d1525,#060b14)', borderRadius: 12, padding: '10px 12px', height: 108, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 18 }}>{p.ico}</span>
                                            <span style={{ fontSize: 9, fontWeight: 800, color: p.col, background: `${p.col}18`, padding: '1px 6px', borderRadius: 4 }}>{p.n}</span>
                                        </div>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: p.col, lineHeight: 1, textShadow: `0 0 16px ${p.col}55` }}>{p.orders.toLocaleString()}<span style={{ fontSize: 11 }}>건</span></div>
                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Rev · {fmt(p.rev, { prefix: '₩' })}</div>
                                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                            <div style={{ width: `${Math.min((p.orders / totalOrd) * 100 * 3.5, 100)}%`, height: '100%', background: `linear-gradient(90deg,${p.col},${p.col}77)`, borderRadius: 2 }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={CARD}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Order Pipeline</span>
                            <div style={{ display: 'flex', gap: 10 }}>{FLOW.map(s => <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}><div style={{ width: 7, height: 7, borderRadius: 2, background: s.c }} />{s.l}({s.v.toLocaleString()})</div>)}</div>
                        </div>
                        <StackBar segments={FLOW.map(s => ({ label: s.l, value: s.v, color: s.c }))} height={14} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 10 }}>
                            {FLOW.map(s => (
                                <div key={s.l} style={{ textAlign: 'center', padding: '8px', background: `${s.c}0d`, borderRadius: 8, border: `1px solid ${s.c}1a` }}>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: s.c, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 14px ${s.c}55` }}>{s.v.toLocaleString()}</div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.l}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={CARD}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 8 }}>📋 Recent Orders (클릭 → 구매자 정보)</div>
                        {ORDERS.map(o => (
                            <div key={o.id} onClick={() => setSelOrd(selOrd === o.id ? null : o.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, cursor: 'pointer', borderRadius: 7, background: selOrd === o.id ? 'rgba(79,142,247,0.06)' : 'transparent', flexWrap: selOrd === o.id ? 'wrap' : 'nowrap', transition: 'background 0.2s' }}>
                                <span style={{ color: '#4f8ef7', fontFamily: 'monospace', fontWeight: 700, width: 64, flexShrink: 0, fontSize: 10 }}>{o.id}</span>
                                <span style={{ color: 'rgba(255,255,255,0.45)', width: 42, flexShrink: 0 }}>{o.ch}</span>
                                <span style={{ flex: 1, color: 'rgba(255,255,255,0.72)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.prod}</span>
                                <span style={{ color: '#22c55e', fontWeight: 700, width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>₩{(o.amt / 1000).toFixed(0)}K</span>
                                <span style={{ background: `${o.sc}18`, color: o.sc, padding: '2px 7px', borderRadius: 8, fontSize: 10, fontWeight: 700, flexShrink: 0, border: `1px solid ${o.sc}28` }}>{o.st}</span>
                                {selOrd === o.id && <div style={{ width: '100%', display: 'flex', gap: 6, marginTop: 5, paddingLeft: 64 }}>
                                    {[{ l: t('commerce.gender'), v: o.gnd, c: '#4f8ef7' }, { l: t('commerce.age'), v: o.age, c: '#a855f7' }, { l: t('commerce.region'), v: '📍' + o.reg, c: '#22c55e' }].map(t => (
                                        <span key={t.l} style={{ fontSize: 10, background: `${t.c}14`, color: t.c, padding: '2px 8px', borderRadius: 6, border: `1px solid ${t.c}28`, fontWeight: 700 }}>{t.v}</span>
                                    ))}
                                </div>}
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    {sel ? <PlatDetail id={sel} /> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={CARD}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 10 }}>💰 플랫폼별 매출 비중</div>
                                <DonutChart data={PLIST.map(p => ({ name: p.n, value: p.rev, color: p.col }))} size={120} thickness={22} label="₩1.1M" sub="Total" />
                                <div style={{ marginTop: 10 }}>
                                    {PLIST.map(p => (
                                        <div key={p.id} onClick={() => setSel(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, marginBottom: 4, cursor: 'pointer', background: `${p.col}08`, border: `1px solid ${p.col}14`, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = `${p.col}18`} onMouseLeave={e => e.currentTarget.style.background = `${p.col}08`}>
                                            <span style={{ fontSize: 14 }}>{p.ico}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.78)' }}>{p.n}</div>
                                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>주문 {p.orders.toLocaleString()}건</div>
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: p.col, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.rev, { prefix: '₩' })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={CARD}>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>💡 플랫폼 카드 클릭 시<br /><span style={{ color: '#14d9b0' }}>구매자 성별·연령·지역·카테고리·결제수단</span> 상세 분석</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
