// ══════════════════════════════════════════════════════════════════════
//  🏠 통합현황 — Overview Dashboard (GlobalDataContext 실시간 연동)
//  • KPI 4열: Revenue / ROAS / Orders / Inventory — 실시간
//  • 알림 패널 — GlobalDataContext.alerts 연동
// ══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { Spark, DonutChart, seedSeries, fmt } from './ChartUtils.jsx';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';

const G = 10;
const C = { bg: 'linear-gradient(145deg,rgba(255,255,255,0.04),rgba(8,18,38,0.95))', br: '1px solid rgba(79,142,247,0.12)', r: 14, p: '13px 15px' };
function Card({ children, style = {} }) {
    return <div style={{ background: C.bg, border: C.br, borderRadius: C.r, padding: C.p, ...style }}>{children}</div>;
}
function Label({ s, uppercase = true, mb = 8, color = 'rgba(255,255,255,0.5)' }) {
    return <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: mb, textTransform: uppercase ? 'uppercase' : 'none', letterSpacing: 0.8 }}>{s}</div>;
}

// ─── 데이터 ────────────────────────────────────────────────────────────────
const DAYS = Array.from({ length: 14 }, (_, i) => { const d = new Date('2026-03-08'); d.setDate(d.getDate() - (13 - i)); return `${d.getMonth() + 1}/${d.getDate()}`; });

const KPIS = [
    { l: 'Total Revenue', v: '$1,240,560', raw: 1240560, d: 9.2, col: '#4f8ef7', ico: '💰', spark: seedSeries(1240, 14, 0.12) },
    { l: 'ROAS', v: '5.2×', raw: 5.2, d: 14.1, col: '#22c55e', ico: '📈', spark: seedSeries(5.2, 14, 0.08) },
    { l: 'Conversion Rate', v: '3.8%', raw: 3.8, d: -0.3, col: '#ec4899', ico: '🎯', spark: seedSeries(3.8, 14, 0.10) },
    { l: 'Orders', v: '32,450', raw: 32450, d: 7.4, col: '#a855f7', ico: '📦', spark: seedSeries(32450, 14, 0.11) },
];

const AGE_DATA = [
    { l: '20-22', v: 28 }, { l: '23-34', v: 42 }, { l: '12-34', v: 35 }, { l: '15-34', v: 48 }, { l: '9-54', v: 32 }, { l: '10-34', v: 38 }, { l: '1+', v: 22 },
];
const TOP_BUYERS = [
    { l: 'A', v: 62 }, { l: 'B', v: 45 }, { l: 'C', v: 38 }, { l: 'D', v: 55 }, { l: 'E', v: 41 }, { l: 'F', v: 30 }, { l: 'G', v: 52 },
];

const LISTING = { active: { now: 325, total: 440 }, errors: 12, pending: 8 };

const ALERTS = [
    { type: 'Trending', items: [{ n: 'AI Camera Pro', d: '+24% CTR' }, { n: 'Eco Headphones', d: '+18% Views' }, { n: 'Sport Watch X', d: '+31% AOV' }] },
    { type: 'Recent', items: [{ n: 'Budget Exceeded', d: 'Meta Ads +12%' }, { n: 'Stock Low', d: 'SKU-1022 <10' }, { n: 'New Review', d: '4.8★ Japan' }] },
    { type: 'Alert', items: [{ n: '⚠️ API Timeout', d: 'Rakuten 3.2s' }, { n: '🔴 Error Rate', d: 'Shopee 2.1%' }, { n: '⚡ Budget', d: 'Daily cap hit' }] },
];

const PRODUCTS = [
    { n: 'Smartwatch Pro', ico: '⌚', rev: 92400, col: '#4f8ef7' },
    { n: 'Running Shoes', ico: '👟', rev: 75320, col: '#22c55e' },
    { n: 'Wireless Earbuds', ico: '🎧', rev: 55750, col: '#ec4899' },
    { n: 'Smart Home Hub', ico: '🏠', rev: 69660, col: '#f97316' },
];

const AUDIENCE = [
    { sku: 'S30145', name: 'Advanced Comfort Orphin', amazon: 82, shopify: 68, shopee: 54, rakuten: 72 },
    { sku: 'S30148', name: 'Compact Dumper User', amazon: 46, shopify: 38, shopee: 72, rakuten: 30 },
    { sku: 'S30149', name: 'Universal Gentpo Nacer', amazon: 70, shopify: 52, shopee: 40, rakuten: 60 },
    { sku: 'S30150', name: 'Strange Category', amazon: 34, shopify: 58, shopee: 66, rakuten: 48 },
    { sku: 'S30152', name: 'Eco Pressure Pad', amazon: 88, shopify: 74, shopee: 62, rakuten: 80 },
    { sku: 'S30155', name: 'Sync Motion Tracker', amazon: 56, shopify: 42, shopee: 80, rakuten: 44 },
];
const CH_COLS = { amazon: '#f97316', shopify: '#22c55e', shopee: '#ec4899', rakuten: '#4f8ef7' };

// ─── 지도 대륙 (미니 맵용) ─────────────────────────────────────────────────
const LAND = ['M55,90 L152,68 L240,58 L280,80 L282,140 L276,200 L270,275 L240,322 L188,350 L132,332 L88,294 L60,232 L50,166 L52,120 Z', 'M338,28 L392,23 L420,44 L426,76 L404,92 L368,97 L338,80 L333,54 Z', 'M216,344 L310,312 L366,318 L382,370 L378,434 L354,484 L296,496 L250,482 L218,448 L206,400 Z', 'M430,90 L488,73 L534,70 L568,84 L570,108 L564,136 L548,162 L516,167 L482,164 L452,154 L435,132 L430,110 Z', 'M432,78 L460,71 L469,94 L464,120 L452,129 L437,119 L430,102 Z', 'M448,158 L580,152 L618,174 L622,214 L604,264 L566,364 L532,432 L494,442 L456,412 L430,344 L428,268 L440,218 Z', 'M560,150 L634,136 L665,148 L672,180 L654,214 L620,222 L592,220 L567,199 L557,174 Z', 'M568,44 L876,34 L908,64 L902,104 L874,130 L842,142 L804,150 L764,152 L732,130 L702,120 L663,104 L618,98 L572,102 L568,74 Z', 'M615,180 L672,176 L694,200 L699,266 L670,302 L632,284 L610,242 Z', 'M699,116 L804,110 L850,134 L856,170 L838,204 L804,222 L764,224 L722,219 L694,204 L686,180 Z', 'M696,294 L774,288 L794,310 L778,330 L744,326 L712,312 Z', 'M810,136 L830,138 L840,160 L832,182 L822,194 L810,190 L799,172 L802,150 Z', 'M793,160 L807,156 L811,170 L808,183 L798,186 L788,180 L786,168 Z', 'M736,336 L856,326 L882,354 L880,412 L848,446 L772,452 L732,424 L720,380 L730,352 Z'];
const MAP_PINS = [
    { cx: 168, cy: 210, col: '#4f8ef7', flag: '🇺🇸', n: 'USA', rev: '$1.10M' },
    { cx: 820, cy: 168, col: '#ec4899', flag: '🇯🇵', n: 'Japan', rev: '$620k' },
    { cx: 797, cy: 182, col: '#f97316', flag: '🇰🇷', n: 'SOE Korea', rev: '$88.8k' },
    { cx: 498, cy: 122, col: '#a855f7', flag: '🇩🇪', n: 'Germany', rev: '$310k' },
    { cx: 794, cy: 382, col: '#eab308', flag: '🇦🇺', n: 'Australia', rev: '$420k' },
];

// ─── 서브 컴포넌트들 ──────────────────────────────────────────────────────
function KpiBlock({ k }) {
    return (
        <div style={{ borderRadius: 14, padding: '1px', background: `linear-gradient(135deg,${k.col}44,rgba(255,255,255,0.03))`, boxShadow: `0 4px 20px ${k.col}14`, flex: 1 }}>
            <div style={{ background: 'linear-gradient(145deg,#060e1e,#030810)', borderRadius: 13, padding: '13px 16px', height: 100, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.36)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{k.l}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: k.col, lineHeight: 1.15, marginTop: 4, textShadow: `0 0 20px ${k.col}55` }}>{k.v}</div>
                    </div>
                    <Spark data={k.spark} color={k.col} h={32} w={72} area />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: k.d >= 0 ? '#4ade80' : '#f87171', background: k.d >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', padding: '1px 7px', borderRadius: 6 }}>
                        {k.d >= 0 ? '▲' : '▼'} {Math.abs(k.d)}%
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>vs last month</span>
                </div>
            </div>
        </div>
    );
}

function GenderDonut() {
    return (
        <Card>
            <Label s="⚥ Gender Demographics" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Male donut */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width={68} height={68}>
                        <circle cx={34} cy={34} r={26} fill="none" stroke="rgba(79,142,247,0.12)" strokeWidth={10} />
                        <circle cx={34} cy={34} r={26} fill="none" stroke="#4f8ef7" strokeWidth={10}
                            strokeDasharray={`${2 * Math.PI * 26 * 0.50} ${2 * Math.PI * 26}`}
                            strokeLinecap="round" transform="rotate(-90 34 34)"
                            style={{ filter: 'drop-shadow(0 0 5px #4f8ef755)' }} />
                        <text x={34} y={38} textAnchor="middle" style={{ fontSize: 12, fontWeight: 900, fill: '#4f8ef7' }}>50%</text>
                    </svg>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <span style={{ fontSize: 20 }}>🧑</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Male</span>
                    </div>
                </div>
                {/* Female donut */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width={68} height={68}>
                        <circle cx={34} cy={34} r={26} fill="none" stroke="rgba(244,114,182,0.12)" strokeWidth={10} />
                        <circle cx={34} cy={34} r={26} fill="none" stroke="#f472b6" strokeWidth={10}
                            strokeDasharray={`${2 * Math.PI * 26 * 0.88} ${2 * Math.PI * 26}`}
                            strokeLinecap="round" transform="rotate(-90 34 34)"
                            style={{ filter: 'drop-shadow(0 0 5px #f472b655)' }} />
                        <text x={34} y={38} textAnchor="middle" style={{ fontSize: 12, fontWeight: 900, fill: '#f472b6' }}>88%</text>
                    </svg>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <span style={{ fontSize: 20 }}>👩</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Female</span>
                    </div>
                </div>
                {/* Stats */}
                <div style={{ flex: 1 }}>
                    {[{ l: 'Male viewers', v: '50%', c: '#4f8ef7' }, { l: 'Female buyers', v: '88%', c: '#f472b6' }, { l: 'Mixed audience', v: '62%', c: '#a855f7' }].map(s => (
                        <div key={s.l} style={{ marginBottom: 7 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>
                                <span>{s.l}</span><span style={{ color: s.c, fontWeight: 800 }}>{s.v}</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                <div style={{ width: s.v, height: '100%', background: s.c, borderRadius: 2, boxShadow: `0 0 5px ${s.c}66` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

function AgeChart() {
    const maxV = Math.max(...AGE_DATA.map(d => d.v));
    const H = 70, bW = 22;
    return (
        <div style={{ flex: 1 }}>
            <Label s="📊 Age Distribution" mb={6} />
            <svg width="100%" height={H + 24} viewBox={`0 0 ${AGE_DATA.length * (bW + 8) - 4} ${H + 24}`}>
                {AGE_DATA.map((d, i) => {
                    const bh = (d.v / maxV) * (H - 10);
                    const x = i * (bW + 8);
                    const col = `hsl(${200 + i * 20},75%,55%)`;
                    return (<g key={i}>
                        <rect x={x} y={H - 10 - bh} width={bW} height={bh} fill={col} rx={3} style={{ filter: `drop-shadow(0 0 3px ${col}66)` }} />
                        <text x={x + bW / 2} y={H - 14 - bh} textAnchor="middle" style={{ fontSize: 8, fill: `hsl(${200 + i * 20},75%,72%)`, fontWeight: 800 }}>{d.v}</text>
                        <text x={x + bW / 2} y={H + 10} textAnchor="middle" style={{ fontSize: 7.5, fill: 'rgba(255,255,255,0.35)' }}>{d.l}</text>
                    </g>);
                })}
            </svg>
        </div>
    );
}

function BuyersChart() {
    const maxV = Math.max(...TOP_BUYERS.map(d => d.v));
    const H = 70, bW = 20;
    const cols = ['#4f8ef7', '#22c55e', '#ec4899', '#f97316', '#a855f7', '#14d9b0', '#eab308'];
    return (
        <div style={{ flex: 1 }}>
            <Label s="🛍️ Top Buyers" mb={6} />
            <svg width="100%" height={H + 24} viewBox={`0 0 ${TOP_BUYERS.length * (bW + 8) - 4} ${H + 24}`}>
                {TOP_BUYERS.map((d, i) => {
                    const bh = (d.v / maxV) * (H - 10);
                    const x = i * (bW + 8);
                    return (<g key={i}>
                        <rect x={x} y={H - 10 - bh} width={bW} height={bh} fill={cols[i]} rx={3} style={{ filter: `drop-shadow(0 0 3px ${cols[i]}66)` }} />
                        <text x={x + bW / 2} y={H - 14 - bh} textAnchor="middle" style={{ fontSize: 8, fill: cols[i], fontWeight: 800 }}>{d.v}</text>
                        <text x={x + bW / 2} y={H + 10} textAnchor="middle" style={{ fontSize: 7.5, fill: 'rgba(255,255,255,0.35)' }}>{d.l}</text>
                    </g>);
                })}
            </svg>
        </div>
    );
}

function ListingStatus() {
    return (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Label s="📋 Listing Status" mb={0} />
                <span style={{ fontSize: 10, color: '#4f8ef7', cursor: 'pointer', fontWeight: 700 }}>Details ›</span>
            </div>
            {/* Active */}
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>Active Listings</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 24, fontWeight: 900, color: '#22c55e', textShadow: '0 0 12px #22c55e55' }}>{LISTING.active.now}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>/ {LISTING.active.total}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, marginBottom: 4 }}>● Live</div>
                    <div style={{ width: 60, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                        <div style={{ width: `${(LISTING.active.now / LISTING.active.total) * 100}%`, height: '100%', background: '#22c55e', borderRadius: 3, boxShadow: '0 0 5px #22c55e66' }} />
                    </div>
                </div>
            </div>
            {/* Errors */}
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>Listing Errors</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#f87171', textShadow: '0 0 12px #f8717155' }}>{LISTING.errors}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700, background: 'rgba(239,68,68,0.12)', padding: '1px 6px', borderRadius: 5 }}>WARN</span>
                </div>
            </div>
            {/* Pending */}
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>Pending Review</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24', textShadow: '0 0 12px #fbbf2455' }}>{LISTING.pending}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 16 }}>🟡</span>
                    <span style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, background: 'rgba(251,191,36,0.12)', padding: '1px 6px', borderRadius: 5 }}>PEND</span>
                </div>
            </div>
        </Card>
    );
}

// ✅ 실시간 AlertPanel — GlobalDataContext.alerts 연동
function AlertPanelLive({ alerts, onRead }) {
    const [tab, setTab] = useState(0);
    const tabs = ['전체', '경고', '정보'];
    const typeMap = { warn: '경고', info: '정보', success: '정보', error: '경고' };
    const colorMap = { warn: '#eab308', info: '#4f8ef7', success: '#22c55e', error: '#f87171' };

    const filtered = tab === 0 ? alerts
        : tab === 1 ? alerts.filter(a => a.type === 'warn' || a.type === 'error')
            : alerts.filter(a => a.type === 'info' || a.type === 'success');

    return (
        <Card style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Label s="⚡ 실시간 알림" mb={0} />
                <div style={{ display: 'flex', gap: 4 }}>
                    {tabs.map((t, i) => (
                        <button key={t} onClick={() => setTab(i)} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', background: tab === i ? 'rgba(79,142,247,0.3)' : 'rgba(255,255,255,0.06)', color: tab === i ? '#4f8ef7' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>{t}</button>
                    ))}
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 150, overflowY: 'auto' }}>
                {filtered.slice(0, 8).map(a => (
                    <div key={a.id} onClick={() => onRead(a.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: a.read ? 'rgba(255,255,255,0.015)' : `${colorMap[a.type] || '#4f8ef7'}10`, border: `1px solid ${a.read ? 'rgba(255,255,255,0.06)' : (colorMap[a.type] || '#4f8ef7') + '30'}`, cursor: 'pointer' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: colorMap[a.type] || '#4f8ef7', flexShrink: 0, opacity: a.read ? 0.3 : 1, boxShadow: `0 0 5px ${colorMap[a.type] || '#4f8ef7'}88` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: a.read ? 400 : 700, color: a.read ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.msg}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)' }}>{a.time}</div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>알림 없음</div>}
            </div>
        </Card>
    );
}

function AlertPanel() {
    const [tab, setTab] = useState(0);
    const tabs = ['Trending', 'Recent', 'Alerts'];
    return (
        <Card style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Label s="⚡ Market Intelligence" mb={0} />
                <div style={{ display: 'flex', gap: 4 }}>
                    {tabs.map((t, i) => (
                        <button key={t} onClick={() => setTab(i)} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', background: tab === i ? 'rgba(79,142,247,0.3)' : 'rgba(255,255,255,0.06)', color: tab === i ? '#4f8ef7' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>{t}</button>
                    ))}
                </div>
            </div>
            {ALERTS[tab].items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, marginBottom: 5, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: ['#22c55e', '#4f8ef7', '#f87171'][tab], flexShrink: 0, boxShadow: `0 0 5px ${['#22c55e', '#4f8ef7', '#f87171'][tab]}88` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.n}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>{item.d}</div>
                    </div>
                </div>
            ))}
        </Card>
    );
}

function MiniMap() {
    return (
        <div style={{ borderRadius: 12, overflow: 'hidden', background: '#060e22', border: '1px solid rgba(79,142,247,0.18)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(79,142,247,0.1)' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.88)' }}>🌍 Sales by Country</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)' }}>Click map for detail</span>
            </div>
            <svg viewBox="0 0 960 480" style={{ display: 'block', width: '100%' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                    <radialGradient id="mn-ocean" cx="40%" cy="38%" r="65%">
                        <stop offset="0%" stopColor="#0f2a50" />
                        <stop offset="100%" stopColor="#030c1c" />
                    </radialGradient>
                    <linearGradient id="mn-land" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e4535" />
                        <stop offset="100%" stopColor="#0e2a1e" />
                    </linearGradient>
                </defs>
                <rect width={960} height={480} fill="url(#mn-ocean)" />
                {/* Grid */}
                {[0, 30, 60, -30, -60].map(lat => (
                    <line key={lat} x1={0} y1={(90 - lat) / 180 * 480} x2={960} y2={(90 - lat) / 180 * 480}
                        stroke={lat === 0 ? "rgba(79,142,247,0.18)" : "rgba(79,142,247,0.06)"} strokeWidth={lat === 0 ? 0.7 : 0.4} />
                ))}
                {/* Continents */}
                {LAND.map((d, i) => <path key={i} d={d} fill="url(#mn-land)" stroke="rgba(100,200,140,0.18)" strokeWidth={0.7} />)}
                {/* Pins + Callouts */}
                {MAP_PINS.map((p) => {
                    const dir = p.cx > 500 ? 'left' : 'right';
                    const bw = 78, bh = 36, gap = 8, r = 7;
                    const px = dir === 'right' ? p.cx + r + gap : p.cx - r - gap - bw;
                    return (
                        <g key={p.n}>
                            <circle cx={p.cx} cy={p.cy} r={r * 2.2} fill={p.col} opacity={0.08} />
                            <circle cx={p.cx} cy={p.cy} r={r} fill={p.col} style={{ filter: `drop-shadow(0 0 4px ${p.col}88)` }} />
                            <circle cx={p.cx} cy={p.cy} r={r * 0.36} fill="rgba(255,255,255,0.85)" />
                            <line x1={p.cx + (dir === 'right' ? r : -r)} y1={p.cy} x2={dir === 'right' ? px : px + bw} y2={p.cy}
                                stroke={p.col} strokeWidth={0.7} strokeDasharray="3 3" opacity={0.6} />
                            <rect x={px} y={p.cy - bh / 2} width={bw} height={bh} rx={5}
                                fill="rgba(8,18,44,0.92)" stroke={p.col} strokeWidth={0.8} />
                            <text x={px + 6} y={p.cy - 5} style={{ fontSize: 9.5, fill: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>{p.flag} {p.n}</text>
                            <text x={px + 6} y={p.cy + 8} style={{ fontSize: 10.5, fill: p.col, fontWeight: 900 }}>{p.rev}</text>
                        </g>
                    );
                })}
                {/* Vignette */}
                <defs><radialGradient id="mn-vig" cx="50%" cy="50%" r="55%">
                    <stop offset="60%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,6,18,0.55)" />
                </radialGradient></defs>
                <rect width={960} height={480} fill="url(#mn-vig)" style={{ pointerEvents: 'none' }} />
            </svg>
        </div>
    );
}

function TopProducts() {
    const maxR = PRODUCTS[0].rev;
    return (
        <Card>
            <Label s="🏆 Top Products" />
            {PRODUCTS.map((p, i) => (
                <div key={p.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{p.ico}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.n}</div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 3 }}>
                            <div style={{ width: `${(p.rev / maxR) * 100}%`, height: '100%', background: `linear-gradient(90deg,${p.col},${p.col}77)`, borderRadius: 2, boxShadow: `0 0 5px ${p.col}55` }} />
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: p.col, fontVariantNumeric: 'tabular-nums' }}>${p.rev.toLocaleString()}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>›</div>
                    </div>
                </div>
            ))}
        </Card>
    );
}

function AudienceTable() {
    const [view, setView] = useState('viewers');
    const channels = ['amazon', 'shopify', 'shopee', 'rakuten'];
    const chIcons = { amazon: '📦', shopify: '🏪', shopee: '🛍️', rakuten: '🔴' };
    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Label s="🔍 Audience Insights" mb={0} />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {[{ k: 'viewers', l: 'Top Viewers', col: '#4f8ef7' }, { k: 'buyers', l: 'Top Buyers', col: '#22c55e' }].map(v => (
                        <button key={v.k} onClick={() => setView(v.k)} style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, border: `1px solid ${v.col}40`, background: view === v.k ? `${v.col}20` : 'transparent', color: view === v.k ? v.col : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}>
                            ● {v.l}
                        </button>
                    ))}
                </div>
            </div>
            {/* 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 120px 120px 120px 120px', gap: 8, padding: '0 6px 8px', fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span>SKU</span>
                <span>Product Name</span>
                {channels.map(ch => (
                    <span key={ch} style={{ display: 'flex', alignItems: 'center', gap: 3, color: CH_COLS[ch] }}>
                        {chIcons[ch]} {ch.charAt(0).toUpperCase() + ch.slice(1)}
                    </span>
                ))}
            </div>
            {/* 행 */}
            {AUDIENCE.map((row, i) => {
                const vals = view === 'viewers'
                    ? { amazon: row.amazon, shopify: row.shopify, shopee: row.shopee, rakuten: row.rakuten }
                    : { amazon: Math.round(row.amazon * 0.6), shopify: Math.round(row.shopify * 0.8), shopee: Math.round(row.shopee * 0.7), rakuten: Math.round(row.rakuten * 0.65) };
                return (
                    <div key={row.sku} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 120px 120px 120px 120px', gap: 8, padding: '8px 6px', borderBottom: '1px solid rgba(255,255,255,0.035)', alignItems: 'center', borderRadius: 7, background: i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{row.sku}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: `hsl(${200 + i * 30},75%,55%)`, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                        </div>
                        {channels.map(ch => (
                            <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: CH_COLS[ch], flexShrink: 0, boxShadow: `0 0 4px ${CH_COLS[ch]}88` }} />
                                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                                    <div style={{ width: `${vals[ch]}%`, height: '100%', background: `linear-gradient(90deg,${CH_COLS[ch]},${CH_COLS[ch]}77)`, borderRadius: 3, boxShadow: `0 0 4px ${CH_COLS[ch]}44` }} />
                                </div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: CH_COLS[ch], width: 22, textAlign: 'right' }}>{vals[ch]}%</span>
                            </div>
                        ))}
                    </div>
                );
            })}
        </Card>
    );
}

// ══════════════════════════════════════════════════════════════════════
export default function DashOverview() {
    // ✅ GlobalDataContext 실시간 데이터 연동
    const { pnlStats, orderStats, budgetStats, totalInventoryValue, totalInventoryQty, lowStockCount, alerts, markAlertRead } = useGlobalData();

    // 실시간 KPI 데이터 (GlobalDataContext 값 우선, 아직 주문이 적으면 seed값과 합산)
    const seedRevenue = 1240560;
    const seedOrders = 32450;
    const KPIS_LIVE = [
        {
            l: 'Total Revenue', col: '#4f8ef7', ico: '💰', spark: seedSeries(1240, 14, 0.12),
            v: '₩' + ((seedRevenue + pnlStats.revenue) / 10000).toFixed(0) + '만',
            d: 9.2,
        },
        {
            l: 'Blended ROAS', col: '#22c55e', ico: '📈', spark: seedSeries(5.2, 14, 0.08),
            v: budgetStats.blendedRoas.toFixed(2) + '×',
            d: 14.1,
        },
        {
            l: 'Orders (실시간)', col: '#a855f7', ico: '📦', spark: seedSeries(32450, 14, 0.11),
            v: (seedOrders + orderStats.count).toLocaleString(),
            d: 7.4,
        },
        {
            l: '재고 자산가치', col: '#ec4899', ico: '🏭', spark: seedSeries(3.8, 14, 0.10),
            v: '₩' + (totalInventoryValue / 10000).toFixed(0) + '만',
            d: lowStockCount > 0 ? -lowStockCount : 2.1,
        },
    ];

    return (
        <div style={{ display: 'grid', gap: G }}>

            {/* ── Row 1: KPI 4열 + Alert 패널 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1.1fr', gap: G, alignItems: 'stretch' }}>
                {KPIS_LIVE.map(k => <KpiBlock key={k.l} k={k} />)}
                {/* ✅ 실시간 알림 패널 */}
                <AlertPanelLive alerts={alerts} onRead={markAlertRead} />
            </div>

            {/* ── Row 2: Demographics + Charts + Listing + 우측 패널 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.4fr 1.4fr', gap: G, alignItems: 'start' }}>
                <GenderDonut />
                <Card style={{ display: 'flex', gap: 14 }}>
                    <AgeChart />
                    <BuyersChart />
                </Card>
                <ListingStatus />
                {/* 우측 패널 (지도 + Top Products) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
                    <MiniMap />
                    <TopProducts />
                </div>
            </div>

            {/* ── Row 3: Audience Insights 채널별 표 ── */}
            <AudienceTable />

        </div>
    );
}
