import React, { useMemo } from 'react';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── Mini Sparkline (pure CSS bars) ─── */
function Sparkline({ data = [], color = '#4f8ef7', height = 40 }) {
    const max = Math.max(...data, 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
            {data.map((v, i) => (
                <div key={i} style={{
                    flex: 1, minWidth: 4, borderRadius: 2,
                    height: `${(v / max) * 100}%`,
                    background: `linear-gradient(180deg, ${color}, ${color}55)`,
                    transition: 'height 0.5s ease',
                    opacity: i === data.length - 1 ? 1 : 0.7,
                }} />
            ))}
    </div>
);
}

/* ─── Donut Chart (SVG) ─── */
function DonutChart({ segments = [], size = 120, thickness = 18 }) {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    const r = (size - thickness) / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {segments.map((seg, i) => {
                const pct = seg.value / total;
                const dash = circ * pct;
                const o = offset;
                offset += dash;
                return (
                    <circle key={i} cx={size / 2} cy={size / 2} r={r}
                        fill="none" stroke={seg.color} strokeWidth={thickness}
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeDashoffset={-o}
                        style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                );
            })}
            <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fill="#e8f0ff" fontSize={18} fontWeight={800}>{total}</text>
            <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fill="#4e6080" fontSize={9} fontWeight={600}>TOTAL</text>
        </svg>
    );
}

/* ─── SLA Gauge ─── */
function SlaGauge({ violations = 0, total = 1, label, violLabel }) {
    const compliance = total > 0 ? Math.max(0, ((total - violations) / total) * 100) : 100;
    const color = compliance >= 95 ? '#22c55e' : compliance >= 80 ? '#eab308' : '#ef4444';
    const r = 44, circ = 2 * Math.PI * r;
    return (
        <div style={{ textAlign: 'center' }}>
            <svg width={100} height={100} viewBox="0 0 100 100">
                <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
                <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
                    strokeDasharray={`${circ * compliance / 100} ${circ * (1 - compliance / 100)}`}
                    strokeLinecap="round" transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 1s ease' }} />
                <text x={50} y={46} textAnchor="middle" fill={color} fontSize={20} fontWeight={900}>{compliance.toFixed(0)}%</text>
                <text x={50} y={62} textAnchor="middle" fill="#4e6080" fontSize={8} fontWeight={600}>{label || 'SLA'}</text>
            </svg>
            {violations > 0 && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4 }}>⚠ {violations} {violLabel}</div>}
    </div>
);
}

const CHANNELS = [
    { id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48" },
    { id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900" },
    { id: "coupang", name: "Coupang", icon: "🇰🇷", color: "#00bae5" },
    { id: "naver", name: "Naver", icon: "🟢", color: "#03c75a" },
    { id: "11st", name: "11Street", icon: "🏬", color: "#ff0000" },
    { id: "tiktok", name: "TikTok Shop", icon: "🎵", color: "#ff0050" },
];

export default function OverviewTab() {
    const { t } = useI18n();
    const { orders, claimHistory, settlement, slaViolations, checkSlaViolations, pickingLists, packingSlips } = useGlobalData();
    const { fmt } = useCurrency();

    const stats = useMemo(() => {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const todayOrders = orders.filter(o => (o.at || '').includes(today));
        const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);

        // Daily trend (last 7 days simulated from order distribution)
        const daily = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now); d.setDate(d.getDate() - (6 - i));
            const key = d.toISOString().slice(0, 10);
            return orders.filter(o => (o.at || '').includes(key)).length;
        });

        // Channel breakdown
        const chMap = {};
        orders.forEach(o => { chMap[o.ch] = (chMap[o.ch] || 0) + (o.total || 0); });

        // Status breakdown
        const statusMap = {};
        orders.forEach(o => { statusMap[o.status || 'PaymentDone'] = (statusMap[o.status || 'PaymentDone'] || 0) + 1; });

        // Claim rate trend
        const claimRate = orders.length > 0 ? (claimHistory.length / orders.length * 100).toFixed(1) : '0';

        return { todayOrders: todayOrders.length, revenue, daily, chMap, statusMap, claimRate, totalOrders: orders.length };
    }, [orders, claimHistory]);

    const channelSegments = useMemo(() =>
        CHANNELS.map(c => ({ label: c.name, value: stats.chMap[c.id] || 0, color: c.color, icon: c.icon })).filter(s => s.value > 0),
        [stats.chMap]
    );

    const statusSegments = useMemo(() => {
        const colors = { PaymentDone: '#4f8ef7', 'Product준Weight': '#eab308', 'Shippingin progress': '#a855f7', ShippingDone: '#22c55e', '구매확정': '#14d9b0' };
        return Object.entries(stats.statusMap).map(([k, v]) => ({ label: k, value: v, color: colors[k] || '#64748b' }));
    }, [stats.statusMap]);

    const settleTotal = useMemo(() => settlement.reduce((s, r) => s + (r.netPayout || 0), 0), [settlement]);

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {/* ── Row 1: Core KPIs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {[
                    { l: t('orderHub.ovTotalOrders'), v: stats.totalOrders, c: '#4f8ef7', icon: '📋' },
                    { l: t('orderHub.ovTodayNew'), v: stats.todayOrders, c: '#22c55e', icon: '🆕' },
                    { l: t('orderHub.ovTotalSales'), v: fmt ? fmt(stats.revenue) : `₩${(stats.revenue / 1e6).toFixed(1)}M`, c: '#a855f7', icon: '💰' },
                    { l: t('orderHub.ovClaims'), v: claimHistory.length, c: '#ef4444', icon: '⚠' },
                    { l: t('orderHub.ovAccumSettle'), v: fmt ? fmt(settleTotal) : `₩${(settleTotal / 1e6).toFixed(1)}M`, c: '#f97316', icon: '💳' },
                ].map(({ l, v, c, icon }) => (
                    <div key={l} className="kpi-card card-hover" style={{ '--accent': c, padding: '16px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div className="kpi-label">{l}</div>
                                <div className="kpi-value" style={{ color: c, fontSize: 22 }}>{v}</div>
                            <div style={{ fontSize: 28, opacity: 0.3 }}>{icon}</div>
                    </div>
                ))}

            {/* ── Row 2: Charts ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
                {/* Daily Trend */}
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{t('orderHub.ovDailyTrend')}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 12 }}>{t('orderHub.ovDailyTrendSub')}</div>
                    <Sparkline data={stats.daily} color="#4f8ef7" height={80} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        {[t('orderHub.ovDaysAgo'), '', '', '', '', '', t('orderHub.ovToday')].map((d, i) => (
                            <span key={i} style={{ fontSize: 8, color: 'var(--text-3)' }}>{d}</span>
                        ))}
                </div>

                {/* Channel Revenue Donut */}
                <div className="card card-glass" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, alignSelf: 'flex-start' }}>{t('orderHub.ovChannelSales')}</div>
                    <DonutChart segments={channelSegments} size={110} thickness={16} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                        {channelSegments.map(s => (
                            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                                <span style={{ color: 'var(--text-2)' }}>{s.icon} {s.label}</span>
                        </div>
                        ))}
                </div>

                {/* SLA Gauge */}
                <div className="card card-glass" style={{ padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12, alignSelf: 'flex-start' }}>{t('orderHub.ovSlaTitle')}</div>
                    <SlaGauge violations={(slaViolations || []).length} total={stats.totalOrders || 1} label={t('orderHub.ovSlaRate')} violLabel={t('orderHub.ovSlaViolation')} />
                    <button onClick={checkSlaViolations} style={{
                        marginTop: 10, padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)',
                        background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', fontSize: 10, fontWeight: 700, cursor: 'pointer'
                    }}>{t('orderHub.ovSlaRun')}</button>
            </div>

            {/* ── Row 3: Status Breakdown + Recent Activity ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Order Status Distribution */}
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>{t('orderHub.ovStatusDist')}</div>
                    {statusSegments.map(seg => {
                        const pct = stats.totalOrders > 0 ? (seg.value / stats.totalOrders * 100) : 0;
                        return (
                            <div key={seg.label} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{seg.label}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: seg.color }}>{seg.value}{t('orderHub.ovUnit')} ({pct.toFixed(0)}%)</span>
                                <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3 }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${seg.color}, ${seg.color}88)`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                            </div>
                        
                        
                          </div>
      </div>
);
                    })}

                </div>

                {/* Quick Stats Cards */}
                <div className="card card-glass" style={{ padding: 18 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>{t('orderHub.ovOpsStatus')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { l: t('orderHub.ovPickingList'), v: pickingLists.length, c: '#4f8ef7', icon: '📋' },
                            { l: t('orderHub.ovPackingSlip'), v: packingSlips.length, c: '#22c55e', icon: '📦' },
                            { l: t('orderHub.ovClaimRate'), v: `${stats.claimRate}%`, c: parseFloat(stats.claimRate) > 5 ? '#ef4444' : '#22c55e', icon: '📉' },
                            { l: t('orderHub.ovActiveChannels'), v: CHANNELS.length, c: '#a855f7', icon: '🔌' },
                        ].map(({ l, v, c, icon }) => (
                            <div key={l} style={{ padding: '12px 14px', borderRadius: 10, background: `${c}08`, border: `1px solid ${c}22` }}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600 }}>{icon} {l}</div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: c, marginTop: 4 }}>{v}</div>
                        ))}
                                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
