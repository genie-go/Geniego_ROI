// ══════════════════════════════════════════════════════════════════════════
//  🌍 매출현황 Dashboard — 지도 35% + 국가 상세 드릴다운 패널 65%
//  ✅ GlobalDataContext 실시간 연동
//  • 국가별 매출·비율·기여도 순위
//  • 국가 선택 → 채널/지역/성별/연령별 상세 분석
// ══════════════════════════════════════════════════════════════════════════
import { useState, useMemo } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useI18n } from '../../i18n/index.js';
import {
    ComposableMap, Geographies, Geography, Marker, ZoomableGroup,
} from 'react-simple-maps';
import { fmt } from './ChartUtils.jsx';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const G = 10;

// ─── 국가 데이터 ───────────────────────────────────────────────────────────
const COUNTRIES = {
    840: {
        name: 'USA', flag: '🇺🇸', col: '#4f8ef7', coords: [-95, 38],
        rev: 3100000, orders: 12450, growth: 8.3, aov: 249,
        channels: [
            { name: 'Amazon', rev: 1240000, pct: 40, col: '#f97316' },
            { name: 'Meta Ads', rev: 620000, pct: 20, col: '#4f8ef7' },
            { name: 'Google Ads', rev: 465000, pct: 15, col: '#22c55e' },
            { name: 'TikTok', rev: 310000, pct: 10, col: '#ec4899' },
            { name: 'Direct', rev: 465000, pct: 15, col: '#a855f7' },
        ],
        regions: [
            { name: 'California', rev: 840000, orders: 3240, pct: 27 },
            { name: 'New York', rev: 620000, orders: 2180, pct: 20 },
            { name: 'Texas', rev: 510000, orders: 1890, pct: 16 },
            { name: 'Florida', rev: 390000, orders: 1420, pct: 13 },
            { name: 'Other', rev: 740000, orders: 3720, pct: 24 },
        ],
        gender: { male: 55, female: 43, other: 2 },
        age: [
            { label: '18-24', pct: 18 }, { label: '25-34', pct: 28 },
            { label: '35-44', pct: 32 }, { label: '45-54', pct: 15 },
            { label: '55+', pct: 7 },
        ],
        topProducts: ['스마트워치', '무선이어폰', '태블릿', '노트북'],
    },
    392: {
        name: 'Japan', flag: '🇯🇵', col: '#ec4899', coords: [138, 36],
        rev: 1240000, orders: 4820, growth: 12.1, aov: 257,
        channels: [
            { name: '쿠팡', rev: 372000, pct: 30, col: '#f97316' },
            { name: 'Google Ads', rev: 310000, pct: 25, col: '#22c55e' },
            { name: 'Meta Ads', rev: 248000, pct: 20, col: '#4f8ef7' },
            { name: 'TikTok', rev: 186000, pct: 15, col: '#ec4899' },
            { name: 'Direct', rev: 124000, pct: 10, col: '#a855f7' },
        ],
        regions: [
            { name: 'Tokyo', rev: 680000, orders: 2640, pct: 55 },
            { name: 'Osaka', rev: 320000, orders: 1240, pct: 26 },
            { name: 'Nagoya', rev: 140000, orders: 540, pct: 11 },
            { name: 'Other', rev: 100000, orders: 400, pct: 8 },
        ],
        gender: { male: 46, female: 52, other: 2 },
        age: [
            { label: '18-24', pct: 12 }, { label: '25-34', pct: 34 },
            { label: '35-44', pct: 35 }, { label: '45-54', pct: 14 },
            { label: '55+', pct: 5 },
        ],
        topProducts: ['Running Shoes', '스마트워치', '이어폰', '뷰티'],
    },
    410: {
        name: 'Korea', flag: '🇰🇷', col: '#f97316', coords: [127.8, 35.9],
        rev: 890000, orders: 3200, growth: 6.4, aov: 278,
        channels: [
            { name: '네이버', rev: 311500, pct: 35, col: '#22c55e' },
            { name: '쿠팡', rev: 267000, pct: 30, col: '#f97316' },
            { name: 'Meta Ads', rev: 133500, pct: 15, col: '#4f8ef7' },
            { name: 'TikTok', rev: 89000, pct: 10, col: '#ec4899' },
            { name: 'Direct', rev: 89000, pct: 10, col: '#a855f7' },
        ],
        regions: [
            { name: 'Seoul', rev: 520000, orders: 1840, pct: 58 },
            { name: 'Busan', rev: 210000, orders: 760, pct: 24 },
            { name: 'Incheon', rev: 90000, orders: 320, pct: 10 },
            { name: 'Other', rev: 70000, orders: 280, pct: 8 },
        ],
        gender: { male: 47, female: 51, other: 2 },
        age: [
            { label: '18-24', pct: 10 }, { label: '25-34', pct: 35 },
            { label: '35-44', pct: 38 }, { label: '45-54', pct: 12 },
            { label: '55+', pct: 5 },
        ],
        topProducts: ['뷰티', 'K-푸드', '전자기기', '패션'],
    },
    156: {
        name: 'China', flag: '🇨🇳', col: '#22c55e', coords: [105, 35],
        rev: 2100000, orders: 8640, growth: 15.2, aov: 243,
        channels: [
            { name: 'Tmall', rev: 840000, pct: 40, col: '#f97316' },
            { name: 'JD.com', rev: 630000, pct: 30, col: '#ec4899' },
            { name: 'WeChat', rev: 420000, pct: 20, col: '#22c55e' },
            { name: 'TikTok', rev: 210000, pct: 10, col: '#4f8ef7' },
        ],
        regions: [
            { name: 'Shanghai', rev: 820000, orders: 3240, pct: 39 },
            { name: 'Beijing', rev: 680000, orders: 2640, pct: 32 },
            { name: 'Guangzhou', rev: 350000, orders: 1400, pct: 17 },
            { name: 'Other', rev: 250000, orders: 1360, pct: 12 },
        ],
        gender: { male: 52, female: 46, other: 2 },
        age: [
            { label: '18-24', pct: 11 }, { label: '25-34', pct: 36 },
            { label: '35-44', pct: 37 }, { label: '45-54', pct: 11 },
            { label: '55+', pct: 5 },
        ],
        topProducts: ['핸드백', '화장품', '전자제품', '의류'],
    },
    276: {
        name: 'Germany', flag: '🇩🇪', col: '#a855f7', coords: [10.4, 51.2],
        rev: 680000, orders: 2840, growth: 4.2, aov: 239,
        channels: [
            { name: 'Amazon EU', rev: 272000, pct: 40, col: '#f97316' },
            { name: 'Google Ads', rev: 204000, pct: 30, col: '#22c55e' },
            { name: 'Meta Ads', rev: 136000, pct: 20, col: '#4f8ef7' },
            { name: 'Direct', rev: 68000, pct: 10, col: '#a855f7' },
        ],
        regions: [
            { name: 'Berlin', rev: 280000, orders: 1120, pct: 41 },
            { name: 'Munich', rev: 240000, orders: 960, pct: 35 },
            { name: 'Hamburg', rev: 100000, orders: 440, pct: 15 },
            { name: 'Other', rev: 60000, orders: 320, pct: 9 },
        ],
        gender: { male: 49, female: 49, other: 2 },
        age: [
            { label: '18-24', pct: 14 }, { label: '25-34', pct: 32 },
            { label: '35-44', pct: 34 }, { label: '45-54', pct: 14 },
            { label: '55+', pct: 6 },
        ],
        topProducts: ['자동차부품', '전동공구', '스포츠', '가전'],
    },
    826: {
        name: 'UK', flag: '🇬🇧', col: '#14d9b0', coords: [-2, 54],
        rev: 540000, orders: 2160, growth: 3.8, aov: 250,
        channels: [
            { name: 'Amazon UK', rev: 216000, pct: 40, col: '#f97316' },
            { name: 'Google Ads', rev: 162000, pct: 30, col: '#22c55e' },
            { name: 'Meta Ads', rev: 108000, pct: 20, col: '#4f8ef7' },
            { name: 'Direct', rev: 54000, pct: 10, col: '#a855f7' },
        ],
        regions: [
            { name: 'London', rev: 320000, orders: 1280, pct: 59 },
            { name: 'Manchester', rev: 130000, orders: 520, pct: 24 },
            { name: 'Birmingham', rev: 60000, orders: 240, pct: 11 },
            { name: 'Other', rev: 30000, orders: 120, pct: 6 },
        ],
        gender: { male: 48, female: 50, other: 2 },
        age: [
            { label: '18-24', pct: 12 }, { label: '25-34', pct: 35 },
            { label: '35-44', pct: 34 }, { label: '45-54', pct: 13 },
            { label: '55+', pct: 6 },
        ],
        topProducts: ['패션의류', '스포츠용품', '디지털', '홈데코'],
    },
    36: {
        name: 'Australia', flag: '🇦🇺', col: '#eab308', coords: [133, -27],
        rev: 420000, orders: 1680, growth: 9.1, aov: 250,
        channels: [
            { name: 'Amazon AU', rev: 168000, pct: 40, col: '#f97316' },
            { name: 'Google Ads', rev: 126000, pct: 30, col: '#22c55e' },
            { name: 'Meta Ads', rev: 84000, pct: 20, col: '#4f8ef7' },
            { name: 'Direct', rev: 42000, pct: 10, col: '#a855f7' },
        ],
        regions: [
            { name: 'Sydney', rev: 210000, orders: 840, pct: 50 },
            { name: 'Melbourne', rev: 140000, orders: 560, pct: 33 },
            { name: 'Brisbane', rev: 50000, orders: 200, pct: 12 },
            { name: 'Other', rev: 20000, orders: 80, pct: 5 },
        ],
        gender: { male: 50, female: 48, other: 2 },
        age: [
            { label: '18-24', pct: 11 }, { label: '25-34', pct: 30 },
            { label: '35-44', pct: 38 }, { label: '45-54', pct: 15 },
            { label: '55+', pct: 6 },
        ],
        topProducts: ['아웃도어', '서핑용품', '스포츠', '뷰티'],
    },
};

const ALL = Object.entries(COUNTRIES).map(([iso, d]) => ({ iso: Number(iso), ...d }));
const TOTAL = ALL.reduce((s, c) => s + c.rev, 0);
const MAX_R = Math.max(...ALL.map(c => c.rev));
const markerR = r => 7 + (r / MAX_R) * 18;

// ─── 지도 지오 스타일 ─────────────────────────────────────────────────────
const GEO_D = { fill: '#0e1f1a', stroke: 'rgba(80,200,140,0.2)', strokeWidth: 0.4, outline: 'none' };
const mkSaleGeo = (col, sel) => ({
    fill: sel ? col : col + 'bb',
    stroke: sel ? '#fff' : col,
    strokeWidth: sel ? 1.2 : 0.7,
    outline: 'none',
});

// ─── 바 컴포넌트 ──────────────────────────────────────────────────────────
function Bar({ pct, col, h = 6 }) {
    return (
        <div style={{ flex: 1, height: h, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
    );
}

// ─── 국가 랭킹 리스트 ─────────────────────────────────────────────────────
function CountryRankList({ sorted, selIso, onSelect }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sorted.map((c, i) => {
                const pct = ((c.rev / TOTAL) * 100).toFixed(1);
                const isSel = selIso === c.iso;
                return (
                    <div
                        key={c.iso}
                        onClick={() => onSelect(c.iso)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                            background: isSel ? `${c.col}18` : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isSel ? c.col + '55' : 'rgba(255,255,255,0.05)'}`,
                            transition: 'all 0.2s',
                        }}
                    >
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 14, fontWeight: 700 }}>{i + 1}</span>
                        <span style={{ fontSize: 16 }}>{c.flag}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? c.col : 'rgba(255,255,255,0.85)', marginBottom: 2 }}>{c.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Bar pct={parseFloat(pct)} col={c.col} h={4} />
                                <span style={{ fontSize: 10, color: c.col, fontWeight: 700, whiteSpace: 'nowrap' }}>{pct}%</span>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: isSel ? c.col : 'rgba(255,255,255,0.8)' }}>{fmt(c.rev, { prefix: '₩' })}</div>
                            <div style={{ fontSize: 9, color: c.growth >= 0 ? '#4ade80' : '#f87171', marginTop: 1 }}>
                                {c.growth >= 0 ? '▲' : '▼'} {Math.abs(c.growth)}%
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── 글로벌 요약 패널 (국가 미선택 시 우측 표시) ──────────────────────────
function GlobalSummaryPanel({ sorted, TOTAL, channelBudgets }) {
    const [activeTab, setActiveTab] = useState('channels');
    const { t } = useI18n();
    const avgGrowth = sorted.length ? (sorted.reduce((s, c) => s + c.growth, 0) / sorted.length).toFixed(1) : 0;
    const topGrowth = [...sorted].sort((a, b) => b.growth - a.growth).slice(0, 5);
    const botGrowth = [...sorted].sort((a, b) => a.growth - b.growth).slice(0, 3);
    const topRevCountry = sorted[0] || {};

    const channels = channelBudgets ? Object.entries(channelBudgets).map(([, v]) => ({
        name: v.name, col: v.color, icon: v.icon,
        rev: v.revenue || v.spent * v.roas, roas: v.roas,
        pct: Math.round((v.spent / Math.max(1, Object.values(channelBudgets).reduce((s, c) => s + c.spent, 0))) * 100),
    })).sort((a, b) => b.rev - a.rev) : [
        { name: 'Amazon/Coupang', col: '#f97316', icon: '🛒', rev: 3200000, roas: 5.2, pct: 38 },
        { name: 'Google Ads', col: '#22c55e', icon: '🔍', rev: 2270000, roas: 3.8, pct: 27 },
        { name: 'Meta Ads', col: '#4f8ef7', icon: '📘', rev: 1600000, roas: 4.2, pct: 19 },
        { name: 'TikTok', col: '#ec4899', icon: '🎵', rev: 840000, roas: 3.2, pct: 10 },
        { name: 'Direct', col: '#a855f7', icon: '🔗', rev: 505000, roas: 0, pct: 6 },
    ];

    const topProducts = [
        { name: '시카페어(Cicapair) 크림 50ml', icon: '🎧', rev: 1840000, orders: 6420, countries: 5, growth: 12.4 },
        { name: '세라마이딘(Ceramidin) 리퀴드 토너', icon: '⌚', rev: 1250000, orders: 3820, countries: 4, growth: 8.7 },
        { name: 'USB-C 허브 7in1', icon: '🔌', rev: 920000, orders: 8240, countries: 6, growth: 5.2 },
        { name: 'LED 캠핑 랜턴', icon: '💡', rev: 680000, orders: 4180, countries: 3, growth: 22.1 },
        { name: '메모리폼 목베개', icon: '🛏️', rev: 480000, orders: 5620, countries: 4, growth: -2.3 },
    ];

    const TABS = [
        { id: 'channels', label: t('tabs.channelPerf') },
        { id: 'growth', label: t('tabs.growthRate') },
        { id: 'products', label: t('tabs.popularProducts') },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 글로벌 KPI 카드 4개 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                    { ico: '💰', label: t('tabs.globalRevenue'), val: fmt(TOTAL, { prefix: '₩' }), col: '#22c55e' },
                    { ico: '📊', label: t('tabs.avgGrowth'), val: `+${avgGrowth}%`, col: '#4f8ef7' },
                    { ico: '🏆', label: t('tabs.topMarket'), val: (topRevCountry.flag || '') + ' ' + (topRevCountry.name || '-'), col: '#f97316' },
                    { ico: '🌍', label: t('tabs.activeCountries'), val: `${sorted.length}개국`, col: '#a855f7' },
                ].map(k => (
                    <div key={k.label} style={{ padding: '10px 12px', borderRadius: 10, background: `${k.col}10`, border: `1px solid ${k.col}30` }}>
                        <div style={{ fontSize: 17, marginBottom: 2 }}>{k.ico}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>{k.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: k.col }}>{k.val}</div>
                    </div>
                ))}
            </div>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        flex: 1, border: 'none', borderRadius: 6, padding: '6px 4px', cursor: 'pointer',
                        fontSize: 10, fontWeight: 700, transition: 'all 0.18s',
                        background: activeTab === t.id ? '#4f8ef7' : 'transparent',
                        color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.45)',
                    }}>{t.label}</button>
                ))}
            </div>

            {/* 채널 성과 탭 */}
            {activeTab === 'channels' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>채널별 매출·ROAS 성과</div>
                    {channels.map(ch => {
                        const chPct = TOTAL > 0 ? ((ch.rev / TOTAL) * 100).toFixed(1) : ch.pct;
                        return (
                            <div key={ch.name} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${ch.col}22` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 14 }}>{ch.icon || '📡'}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{ch.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        {ch.roas > 0 && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 12, background: 'rgba(34,197,94,0.12)', color: '#4ade80', fontWeight: 700 }}>ROAS {ch.roas.toFixed(1)}x</span>}
                                        <span style={{ fontSize: 12, fontWeight: 800, color: ch.col }}>{fmt(ch.rev, { prefix: '₩' })}</span>
                                    </div>
                                </div>
                                <Bar pct={parseFloat(chPct)} col={ch.col} h={5} />
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>점유율 {chPct}%</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 성장률 탭 */}
            {activeTab === 'growth' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ fontSize: 10, color: 'rgba(74,222,128,0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>🚀 고성장 시장 Top 5</div>
                    {topGrowth.map((c, i) => (
                        <div key={c.iso} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', width: 14 }}>#{i + 1}</span>
                            <span style={{ fontSize: 14 }}>{c.flag}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 3 }}>{c.name}</div>
                                <Bar pct={Math.min(100, c.growth * 4)} col='#4ade80' h={4} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 900, color: '#4ade80' }}>▲{c.growth}%</span>
                        </div>
                    ))}
                    <div style={{ fontSize: 10, color: 'rgba(248,113,113,0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>⚠️ 주의 시장 (저성장/역성장)</div>
                    {botGrowth.map(c => (
                        <div key={c.iso} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)' }}>
                            <span style={{ fontSize: 14 }}>{c.flag}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 3 }}>{c.name}</div>
                                <Bar pct={Math.min(100, Math.abs(c.growth) * 4)} col='#f87171' h={4} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 900, color: c.growth < 0 ? '#f87171' : '#94a3b8' }}>{c.growth >= 0 ? '▲' : '▼'}{Math.abs(c.growth)}%</span>
                        </div>
                    ))}
                </div>
            )}

            {/* 인기 상품 탭 */}
            {activeTab === 'products' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>글로벌 인기 상품 Top 5</div>
                    {topProducts.map((p, i) => (
                        <div key={p.name} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? '#f97316' : 'rgba(255,255,255,0.3)' }}>#{i + 1}</span>
                                    <span style={{ fontSize: 16 }}>{p.icon}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{p.name}</span>
                                </div>
                                <span style={{
                                    fontSize: 10, padding: '2px 7px', borderRadius: 12, fontWeight: 700,
                                    background: p.growth >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                                    color: p.growth >= 0 ? '#4ade80' : '#f87171'
                                }}>
                                    {p.growth >= 0 ? '▲' : '▼'}{Math.abs(p.growth)}%
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                                <span>💰 {fmt(p.rev, { prefix: '₩' })}</span>
                                <span>📦 {(p.orders || 0).toLocaleString()}건</span>
                                <span>🌍 {p.countries}개국</span>
                            </div>
                            <Bar pct={Math.round((p.rev / topProducts[0].rev) * 100)} col='#4f8ef7' h={3} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── 국가 상세 패널 ───────────────────────────────────────────────────────
function CountryDetail({ c }) {
    const [tab, setTab] = useState('overview');
    const { t } = useI18n();
    if (!c) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 340, gap: 12, color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ fontSize: 48 }}>🌍</span>
            <div style={{ fontSize: 13, fontWeight: 600 }}>국가를 선택하면 상세 분석이 표시됩니다</div>
            <div style={{ fontSize: 11 }}>지도 마커 또는 국가 목록에서 선택하세요</div>
        </div>
    );

    const pct = ((c.rev / TOTAL) * 100).toFixed(1);
    const TABS = [
        { id: 'overview', label: t('tabs.countryOverview') },
        { id: 'channel', label: t('tabs.countryChannel') },
        { id: 'region', label: t('tabs.countryRegion') },
        { id: 'demo', label: t('tabs.countryDemo') },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 헤더 */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: `linear-gradient(135deg,${c.col}15,rgba(0,0,0,0))`,
                border: `1px solid ${c.col}33`,
            }}>
                <span style={{ fontSize: 36 }}>{c.flag}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: c.col }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                        총매출 기여도 {pct}% · AOV ₩{c.aov.toLocaleString()}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: c.col }}>{fmt(c.rev, { prefix: '₩' })}</div>
                    <div style={{ fontSize: 11, color: '#4ade80', marginTop: 2 }}>▲ {c.growth}% 성장</div>
                </div>
            </div>

            {/* KPI 4열 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[
                    { label: '총매출', val: fmt(c.rev, { prefix: '₩' }), col: c.col },
                    { label: '주문수', val: c.orders.toLocaleString() + '건', col: '#4f8ef7' },
                    { label: '기여도', val: pct + '%', col: '#22c55e' },
                    { label: '성장률', val: '▲' + c.growth + '%', col: '#4ade80' },
                ].map(m => (
                    <div key={m.label} style={{ padding: '10px 12px', borderRadius: 10, background: `${m.col}0e`, border: `1px solid ${m.col}22` }}>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: m.col }}>{m.val}</div>
                    </div>
                ))}
            </div>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontWeight: 800, fontSize: 11, transition: 'all 0.2s',
                        background: tab === t.id ? `${c.col}22` : 'transparent',
                        color: tab === t.id ? c.col : 'rgba(255,255,255,0.45)',
                        borderBottom: tab === t.id ? `2px solid ${c.col}` : '2px solid transparent',
                    }}>{t.label}</button>
                ))}
            </div>

            {/* 탭 콘텐츠 */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 10 }}>
                    {/* 국가 개요 */}
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase' }}>🏆 주요 채널 (Top 3)</div>
                        {c.channels.slice(0, 3).map(ch => (
                            <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ch.col, flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{ch.name}</span>
                                <Bar pct={ch.pct} col={ch.col} h={5} />
                                <span style={{ fontSize: 11, color: ch.col, fontWeight: 700, width: 36, textAlign: 'right' }}>{ch.pct}%</span>
                                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 60, textAlign: 'right' }}>{fmt(ch.rev, { prefix: '₩' })}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase' }}>📦 인기 상품</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {c.topProducts.map((p, i) => (
                                <span key={p} style={{
                                    fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 700,
                                    background: `${c.col}18`, border: `1px solid ${c.col}33`, color: c.col,
                                }}>{i + 1}. {p}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'channel' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>📡 {c.name} 채널별 매출</div>
                    {c.channels.map(ch => (
                        <div key={ch.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ch.col }} />
                                    {ch.name}
                                </span>
                                <span style={{ display: 'flex', gap: 12 }}>
                                    <span style={{ color: ch.col, fontWeight: 800 }}>{ch.pct}%</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{fmt(ch.rev, { prefix: '₩' })}</span>
                                </span>
                            </div>
                            <Bar pct={ch.pct} col={ch.col} h={8} />
                        </div>
                    ))}
                </div>
            )}

            {tab === 'region' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>📍 지역별 매출</div>
                    {c.regions.map((r, i) => (
                        <div key={r.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>{i + 1}</span> {r.name}
                                </span>
                                <span style={{ display: 'flex', gap: 12 }}>
                                    <span style={{ color: `hsl(${120 + i * 30},65%,58%)`, fontWeight: 800 }}>{r.pct}%</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{r.orders.toLocaleString()}건</span>
                                    <span style={{ color: c.col, fontWeight: 700 }}>{fmt(r.rev, { prefix: '₩' })}</span>
                                </span>
                            </div>
                            <Bar pct={r.pct} col={`hsl(${120 + i * 30},65%,52%)`} h={7} />
                        </div>
                    ))}
                </div>
            )}

            {tab === 'demo' && (
                <div style={{ display: 'grid', gap: 10 }}>
                    {/* 성별 */}
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase' }}>👥 성별 구매 비율</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <Bar pct={c.gender.male} col='#4f8ef7' h={12} />
                            <Bar pct={c.gender.female} col='#ec4899' h={12} />
                            {c.gender.other > 0 && <Bar pct={c.gender.other} col='#a855f7' h={12} />}
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                            <span><span style={{ color: '#4f8ef7', fontWeight: 800 }}>남성 {c.gender.male}%</span></span>
                            <span><span style={{ color: '#ec4899', fontWeight: 800 }}>여성 {c.gender.female}%</span></span>
                            {c.gender.other > 0 && <span><span style={{ color: '#a855f7', fontWeight: 800 }}>기타 {c.gender.other}%</span></span>}
                        </div>
                    </div>
                    {/* 연령 */}
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase' }}>📊 연령대별 구매 비율</div>
                        {c.age.map((a, i) => {
                            const ageCol = `hsl(${200 + i * 30},70%,58%)`;
                            return (
                                <div key={a.label} style={{ marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{a.label}</span>
                                        <span style={{ color: ageCol, fontWeight: 800 }}>{a.pct}%</span>
                                    </div>
                                    <Bar pct={a.pct} col={ageCol} h={8} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function DashSalesGlobal() {
    const [selIso, setSelIso] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [center, setCenter] = useState([0, 20]);

    // ✅ GlobalDataContext 실시간 연동
    const { pnlStats, orderStats, channelBudgets } = useGlobalData();
    const { t } = useI18n();

    const sorted = useMemo(() => [...ALL].sort((a, b) => b.rev - a.rev), []);
    const selCountry = selIso ? COUNTRIES[selIso] : null;

    const handleMarker = (iso) => {
        const c = COUNTRIES[iso];
        if (!c) return;
        const isDesel = selIso === iso;
        setSelIso(isDesel ? null : iso);
        setCenter(c.coords);
        setZoom(isDesel ? 1 : 3);
        // NOTE: 국가 클릭은 지도·데이터 드릴다운만 수행하며 UI 언어를 변경하지 않습니다.
        // 언어 변경은 오직 상단 언어 선택 메뉴(Topbar)에서만 가능합니다.
    };

    return (
        <div style={{ display: 'grid', gap: G }}>
            {/* 전체 KPI 배지 행 */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, background: 'rgba(20,217,176,0.12)', border: '1px solid rgba(20,217,176,0.3)', borderRadius: 20, padding: '3px 10px', color: '#14d9b0', fontWeight: 700 }}>
                    ● 실시간 · 글로벌 {sorted.length}개국 매출현황
                </span>
                <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '3px 10px', color: '#22c55e', fontWeight: 700 }}>
                    💰 총글로벌매출 {fmt(TOTAL, { prefix: '₩' })}
                </span>
                <span style={{ fontSize: 10, background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 20, padding: '3px 10px', color: '#4f8ef7', fontWeight: 700 }}>
                    📦 총주문 {orderStats.totalOrders.toLocaleString()}건
                </span>
                <span style={{ fontSize: 10, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 20, padding: '3px 10px', color: '#eab308', fontWeight: 700 }}>
                    📊 영업이익 {fmt(pnlStats.operatingProfit, { prefix: '₩' })}
                </span>
            </div>

            {/* 메인 레이아웃: 지도 60% + 우측 패널 40% */}
            <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: G, alignItems: 'start' }}>

                {/* ── 좌: 지도 + 국가 목록 ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* 세계 지도 */}
                    <div style={{
                        borderRadius: 14, overflow: 'hidden',
                        background: 'linear-gradient(145deg,#040e1a,#030c14)',
                        border: '1px solid rgba(79,142,247,0.12)',
                        height: 540,
                    }}>
                        <ComposableMap
                            projection="geoNaturalEarth1"
                            style={{ width: '100%', height: '100%' }}
                            projectionConfig={{ scale: 175 }}
                        >
                            <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ zoom: z, coordinates: co }) => { setZoom(z); setCenter(co); }}>
                                <Geographies geography={GEO_URL}>
                                    {({ geographies }) => geographies.map(geo => {
                                        const iso = geo.id ? Number(geo.id) : null;
                                        const cData = iso ? COUNTRIES[iso] : null;
                                        const isSel = iso === selIso;
                                        return (
                                            <Geography
                                                key={geo.rsmKey}
                                                geography={geo}
                                                onClick={() => cData && handleMarker(iso)}
                                                style={{
                                                    default: cData ? mkSaleGeo(cData.col, isSel) : GEO_D,
                                                    hover: cData ? mkSaleGeo(cData.col + 'ee', isSel) : { ...GEO_D, fill: '#141f2e' },
                                                    pressed: cData ? mkSaleGeo(cData.col, true) : GEO_D,
                                                }}
                                            />
                                        );
                                    })}
                                </Geographies>
                                {ALL.map(c => (
                                    <Marker key={c.iso} coordinates={c.coords} onClick={() => handleMarker(c.iso)}>
                                        <circle
                                            r={markerR(c.rev)}
                                            fill={selIso === c.iso ? c.col : c.col + '88'}
                                            stroke={selIso === c.iso ? '#fff' : c.col}
                                            strokeWidth={selIso === c.iso ? 1.5 : 0.8}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <text textAnchor="middle" y={-markerR(c.rev) - 3} fontSize={7} fill="rgba(255,255,255,0.7)" style={{ pointerEvents: 'none' }}>
                                            {c.flag}
                                        </text>
                                    </Marker>
                                ))}
                            </ZoomableGroup>
                        </ComposableMap>
                    </div>

                    {/* 지도 하단 힌트 */}
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                        💡 지도 클릭 또는 아래 목록에서 국가 선택
                    </div>

                    {/* 국가 순위 리스트 */}
                    <div style={{
                        borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)', padding: '10px',
                        maxHeight: 190, overflowY: 'auto',
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            🏆 국가별 매출 기여도 순위
                        </div>
                        <CountryRankList sorted={sorted} selIso={selIso} onSelect={iso => handleMarker(iso)} />
                    </div>
                </div>

                {/* ── 우: 상세 분석 패널 ── */}
                <div style={{
                    borderRadius: 14, padding: '14px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(79,142,247,0.1)',
                    minHeight: 700, display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                    {selCountry ? (
                        <CountryDetail c={selCountry} />
                    ) : (
                        <GlobalSummaryPanel sorted={sorted} TOTAL={TOTAL} channelBudgets={channelBudgets} />
                    )}
                </div>
            </div>
        </div>
    );
}
