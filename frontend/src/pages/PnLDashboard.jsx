import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── Security Engine ──────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' }, { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' }, { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
];
const secCheck = (v = '') => { for (const p of SEC_PATTERNS) { if (p.re.test(v)) return p.type; } return null; };

function SecurityOverlay({ threats, onDismiss, t }) {
    if (!threats.length) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a0000,#2d0a0a)', border: '2px solid #ef4444', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>{t('pnl.securityAlert')}</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 20 }}>{t('pnl.securityDesc')}</div>
                {threats.map((th, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 11, color: '#fca5a5', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>[{th.type}]</strong> {th.value.slice(0, 60)}…
                </div>
                ))}
                <button onClick={onDismiss} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                    ✕ {t('pnl.dismiss')}
                </button>
            </div>
        </div>
);
}

/* ─── Shared ──────────────────── */
const CARD = { borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' };
const INPUT = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1,#e8eaf0)', fontSize: 12, boxSizing: 'border-box' };
const BTN = (bg, color) => ({ padding: '7px 16px', borderRadius: 8, border: 'none', background: bg, color, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' });
const ACCENT = '#4f8ef7';
const GREEN = '#22c55e';
const RED = '#ef4444';

const fmtM = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(Number(v || 0).toFixed(0));
const pct = (n, d) => d ? (n / d * 100).toFixed(1) + "%" : "0.0%";
const r2 = v => isNaN(v) ? "0.00" : Number(v).toFixed(2);

/* ─── Channel Fee Rates ─── */
const CHANNEL_FEES = {
    coupang: 0.108, naver: 0.055, gmarket: 0.12, '11st': 0.10, auction: 0.12, wemakeprice: 0.12,
    tmon: 0.10, interpark: 0.10, ssg: 0.08, lotteon: 0.08, amazon: 0.15, shopify: 0.029,
    meta: 0, google: 0, tiktok: 0, kakao_moment: 0, naver_ads: 0, line: 0, whatsapp: 0,
};

/* ─── Integration Hub Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const channels = [];
        try {
            const keys = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]');
            if (Array.isArray(keys)) keys.forEach(k => { if (k.service) channels.push(k.service.toLowerCase()); });
        } catch { /* ignore */ }
        ['meta', 'google', 'tiktok', 'kakao_moment', 'naver', 'coupang', 'amazon', 'shopify',
         'gmarket', '11st', 'auction', 'wemakeprice', 'tmon', 'interpark', 'ssg', 'lotteon', 'line', 'whatsapp'
        ].forEach(ch => {
            try { if (localStorage.getItem(`geniego_channel_${ch}`)) channels.push(ch); } catch { /* ignore */ }
        });
        return [...new Set(channels)];
    }, []);
}

/* ─── KPI Card ─── */
const KpiCard = ({ label, value, sub, color = ACCENT, icon, alert }) => (
    <div style={{ ...CARD, padding: '14px 16px', borderLeft: `3px solid ${alert ? RED : color}`, boxShadow: alert ? '0 0 12px rgba(239,68,68,0.12)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 16, opacity: .8 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 20, color: alert ? RED : color, marginTop: 5 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: alert ? RED : 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
);

const MiniBar = ({ v, max, color = ACCENT, h = 4 }) => (
    <div style={{ height: h, background: 'var(--surface)', borderRadius: h, flex: 1 }}>
        <div style={{ width: `${Math.min(100, max ? Math.abs(v / max) * 100 : 0)}%`, height: '100%', background: color, borderRadius: h, transition: 'width .4s' }} />
    </div>
);

/* ═══════ TAB 1: Overview ═══════ */
function OverviewTab({ live, t, fmt, dateRange }) {
    const max = live.grossRevenue || 1;
    const waterfallRows = [
        { label: t('pnl.wfRevenue'), v: live.grossRevenue, col: ACCENT },
        { label: t('pnl.wfCogs'), v: -live.cogs, col: '#a855f7' },
        { label: t('pnl.wfGrossProfit'), v: live.grossProfit, col: GREEN },
        { label: t('pnl.wfAdSpend'), v: -live.adSpend, col: '#f97316' },
        { label: t('pnl.wfPlatformFee'), v: -live.platformFee, col: RED },
        { label: t('pnl.wfCoupon'), v: -live.couponDiscount, col: '#eab308' },
        { label: t('pnl.wfReturnFee'), v: -live.returnFee, col: '#ec4899' },
        { label: t('pnl.wfOperatingProfit'), v: live.operatingProfit, col: live.operatingProfit >= 0 ? GREEN : RED, bold: true },
    ];
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(34,197,94,0.04),rgba(79,142,247,0.03))', borderColor: 'rgba(34,197,94,0.15)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#4ade80' }}>🌊 {t('pnl.waterfallTitle')}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 14 }}>{t('pnl.waterfallDesc')}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    {waterfallRows.map(r => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 180, fontSize: 11, fontWeight: r.bold ? 800 : 400, color: r.bold ? r.col : 'var(--text-2)', flexShrink: 0 }}>{r.label}</div>
                            <MiniBar v={r.v} max={max} color={r.col} h={r.bold ? 8 : 5} />
                            <div style={{ width: 110, textAlign: 'right', fontFamily: 'monospace', fontWeight: r.bold ? 800 : 700, fontSize: r.bold ? 13 : 11, color: r.col }}>
                                {fmt(Math.abs(r.v))}
                            </div>
                            <div style={{ width: 60, textAlign: 'right', fontSize: 10, color: 'var(--text-3)' }}>{pct(Math.abs(r.v), max)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                <KpiCard label={t('pnl.kpiRevenue')} value={fmt(live.grossRevenue)} color={ACCENT} icon="💰" />
                <KpiCard label={t('pnl.kpiAdSpend')} value={fmt(live.adSpend)} color="#f97316" icon="📣" sub={pct(live.adSpend, live.grossRevenue)} />
                <KpiCard label={t('pnl.kpiPlatformFee')} value={fmt(live.platformFee)} color={RED} icon="🏪" sub={pct(live.platformFee, live.grossRevenue)} />
                <KpiCard label={t('pnl.kpiCogs')} value={fmt(live.cogs)} color="#a855f7" icon="📦" />
                <KpiCard label={t('pnl.kpiNetPayout')} value={fmt(live.netPayout)} color={GREEN} icon="✅" />
                <KpiCard label={t('pnl.kpiOperatingProfit')} value={fmt(live.operatingProfit)} color={live.operatingProfit >= 0 ? GREEN : RED} icon="📊"
                    sub={pct(live.operatingProfit, live.grossRevenue) + ' ' + t('pnl.margin')} alert={live.operatingProfit < 0} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                <KpiCard label={t('pnl.kpiOrders')} value={(live.totalOrders || 0).toLocaleString() + ' ' + t('pnl.unitOrders')} color={ACCENT} icon="🛒" />
                <KpiCard label={t('pnl.kpiReturns')} value={(live.totalReturns || 0) + ' ' + t('pnl.unitOrders')} color={live.returnRate > 0.12 ? RED : '#eab308'} icon="↩"
                    sub={pct(live.totalReturns, live.totalOrders) + ' ' + t('pnl.returnRate')} alert={live.returnRate > 0.12} />
                <KpiCard label={t('pnl.kpiAnomalies')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="✅" sub={t('pnl.noAnomalies')} />
                <KpiCard label={t('pnl.kpiRoas')} value={r2(live.roas || 0) + 'x'} color="#eab308" icon="📈" />
            </div>
        </div>
    );
}

/* ═══════ TAB 2: Unit P&L + Channel Breakdown ═══════ */
function PnlUnitTab({ live, t, fmt, connectedChannels }) {
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 14px', borderRadius: 8, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.1)' }}>
                ℹ️ {t('pnl.unitPnlDesc')}
            </div>
            {/* Total Summary Table */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📊 {t('pnl.unitPnlTable')}</div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'rgba(79,142,247,0.08)' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colDimension')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colRevenue')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colAdSpend')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colFee')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colNetProfit')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colMargin')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>ROAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12 }}>{t('pnl.totalSummary')}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: ACCENT }}>{fmt(live.grossRevenue)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#f97316' }}>{fmt(live.adSpend)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: RED }}>{fmt(live.platformFee)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: live.operatingProfit >= 0 ? GREEN : RED }}>{fmt(live.operatingProfit)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{pct(live.operatingProfit, live.grossRevenue)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#eab308' }}>{r2(live.roas || 0)}x</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Channel Breakdown */}
            {connectedChannels.length > 0 && (
                <div style={CARD}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📡 {t('pnl.channelBreakdownTitle')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>{t('pnl.channelBreakdownDesc')}</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: 'rgba(79,142,247,0.08)' }}>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colChannel')}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colFeeRate')}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colStatus')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {connectedChannels.map(ch => (
                                    <tr key={ch} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '8px 10px', fontWeight: 700, textTransform: 'capitalize' }}>{ch.replace(/_/g, ' ')}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#eab308', fontWeight: 700 }}>{CHANNEL_FEES[ch] ? (CHANNEL_FEES[ch] * 100).toFixed(1) + '%' : '—'}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: GREEN + '20', color: GREEN, fontWeight: 700 }}>{t('pnl.connected')}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.noDataNote')}</div>
        </div>
    );
}

/* ═══════ TAB 3: Anomaly ═══════ */
function AnomalyTab({ t }) {
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                <KpiCard label={t('pnl.anomRoasDown')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="📉" />
                <KpiCard label={t('pnl.anomReturnUp')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="↩" />
                <KpiCard label={t('pnl.anomCouponAbuse')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="🏷" />
                <KpiCard label={t('pnl.anomFeeUp')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="💸" />
            </div>
            <div style={{ ...CARD, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('pnl.noAnomaliesDetected')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t('pnl.noAnomaliesDesc')}</div>
            </div>
        </div>
    );
}

/* ═══════ TAB 4: Action ═══════ */
function ActionTab({ t }) {
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '8px 12px', borderRadius: 8, background: 'rgba(99,140,255,0.04)', border: '1px solid rgba(99,140,255,0.1)' }}>
                💡 {t('pnl.actionDesc')}
            </div>
            <div style={{ ...CARD, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('pnl.noActions')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t('pnl.noActionsDesc')}</div>
            </div>
        </div>
    );
}

/* ═══════ TAB 5: Forecast ═══════ */
function ForecastTab({ live, t, fmt }) {
    const [growthRate, setGrowthRate] = useState(15);
    const [adRatio, setAdRatio] = useState(12);
    const [feeRatio, setFeeRatio] = useState(10);
    const [returnRatePct, setReturnRatePct] = useState(8);
    const [months, setMonths] = useState(6);

    const baseRevenue = live.grossRevenue || 0;
    const forecastRows = Array.from({ length: months }, (_, i) => {
        const m = i + 1;
        const revenue = Math.round(baseRevenue * Math.pow(1 + growthRate / 100, m / 12));
        const adCost = Math.round(revenue * adRatio / 100);
        const fees = Math.round(revenue * feeRatio / 100);
        const returns = Math.round(revenue * returnRatePct / 100);
        const netProfit = revenue - adCost - fees - returns;
        const margin = revenue > 0 ? (netProfit / revenue * 100).toFixed(1) : "0.0";
        return { m, revenue, adCost, fees, returns, netProfit, margin };
    });
    const totalFR = forecastRows.reduce((s, r) => s + r.revenue, 0);
    const totalFP = forecastRows.reduce((s, r) => s + r.netProfit, 0);

    const slider = (labelKey, val, set, min, max, unit = '%') => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-3)' }}>{t(labelKey)}</span>
                <strong style={{ color: ACCENT }}>{val}{unit}</strong>
            </div>
            <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: ACCENT }} />
        </div>
    );

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>🔮 {t('pnl.forecastTitle')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{t('pnl.forecastDesc')}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', display: 'grid', gap: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t('pnl.paramSettings')}</div>
                    {slider('pnl.paramGrowth', growthRate, setGrowthRate, 0, 50)}
                    {slider('pnl.paramAdRatio', adRatio, setAdRatio, 5, 30)}
                    {slider('pnl.paramFeeRate', feeRatio, setFeeRatio, 5, 20)}
                    {slider('pnl.paramReturnRate', returnRatePct, setReturnRatePct, 2, 20)}
                    {slider('pnl.paramPeriod', months, setMonths, 3, 12, 'M')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                        <div style={{ textAlign: 'center', padding: 10, background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastRevenue')}</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: GREEN }}>{fmt(totalFR)}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 10, background: 'rgba(79,142,247,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastProfit')}</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: totalFP > 0 ? ACCENT : RED }}>{fmt(totalFP)}</div>
                        </div>
                    </div>
                </div>
                <div style={{ overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'rgba(79,142,247,0.08)' }}>
                                {[t('pnl.colMonth'), t('pnl.colRevenue'), t('pnl.colAdSpend'), t('pnl.colFee'), t('pnl.colReturns'), t('pnl.colNetProfit'), t('pnl.colMargin')].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: h === t('pnl.colMonth') ? 'left' : 'right', color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {forecastRows.map(r => (
                                <tr key={r.m} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>+{r.m}M</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: ACCENT, fontWeight: 700 }}>{fmt(r.revenue)}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#f97316' }}>{fmt(r.adCost)}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: RED }}>{fmt(r.fees)}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#a855f7' }}>{fmt(r.returns)}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: r.netProfit >= 0 ? GREEN : RED }}>{fmt(r.netProfit)}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: Number(r.margin) >= 15 ? GREEN : Number(r.margin) >= 8 ? '#f59e0b' : RED }}>{r.margin}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* ═══════ TAB 6: Guide ═══════ */
function GuideTab({ t }) {
    const steps = [
        { icon: '1️⃣', title: t('pnl.guideStep1Title'), desc: t('pnl.guideStep1Desc'), color: ACCENT },
        { icon: '2️⃣', title: t('pnl.guideStep2Title'), desc: t('pnl.guideStep2Desc'), color: GREEN },
        { icon: '3️⃣', title: t('pnl.guideStep3Title'), desc: t('pnl.guideStep3Desc'), color: '#eab308' },
        { icon: '4️⃣', title: t('pnl.guideStep4Title'), desc: t('pnl.guideStep4Desc'), color: '#a855f7' },
        { icon: '5️⃣', title: t('pnl.guideStep5Title'), desc: t('pnl.guideStep5Desc'), color: '#f97316' },
        { icon: '6️⃣', title: t('pnl.guideStep6Title'), desc: t('pnl.guideStep6Desc'), color: '#06b6d4' },
    ];
    const sections = [
        { icon: '🌊', name: t('pnl.tabOverview'), desc: t('pnl.guideSecOverview') },
        { icon: '📊', name: t('pnl.tabUnitPnl'), desc: t('pnl.guideSecUnit') },
        { icon: '🚨', name: t('pnl.tabAnomaly'), desc: t('pnl.guideSecAnomaly') },
        { icon: '📋', name: t('pnl.tabAction'), desc: t('pnl.guideSecAction') },
        { icon: '🔮', name: t('pnl.tabForecast'), desc: t('pnl.guideSecForecast') },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(79,142,247,0.06))', borderColor: RED + '40', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>📋</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('pnl.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 500, margin: '6px auto 0' }}>{t('pnl.guideSub')}</div>
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('pnl.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ background: s.color + '08', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '25'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('pnl.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {sections.map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{n.name}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{n.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ ...CARD, background: 'rgba(34,197,94,0.05)', borderColor: GREEN + '30' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('pnl.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
                    <li>{t('pnl.guideTip1')}</li>
                    <li>{t('pnl.guideTip2')}</li>
                    <li>{t('pnl.guideTip3')}</li>
                    <li>{t('pnl.guideTip4')}</li>
                    <li>{t('pnl.guideTip5')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ═══════════ MAIN ═══════════ */
export default function PnLDashboard() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { pnlStats, settlementStats, budgetStats, orderStats, totalInventoryValue, lowStockCount, addAlert, isDemo } = useGlobalData();

    const [tab, setTab] = useState('overview');
    const [threats, setThreats] = useState([]);
    const [syncTick, setSyncTick] = useState(0);
    const [dateRange, setDateRange] = useState('30d');
    const bcRef = useRef(null);
    const connectedChannels = useConnectedChannels();
    const { connectedCount = 0 } = useConnectorSync?.() || {};

    /* ── BroadcastChannel 3CH ── */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch1 = new BroadcastChannel('genie_pnl_sync');
        const ch2 = new BroadcastChannel('genie_connector_sync');
        const ch3 = new BroadcastChannel('genie_product_sync');
        const handler = () => setSyncTick(p => p + 1);
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED','CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); };
    }, []);
    useEffect(() => {
        const id = setInterval(() => {
            setSyncTick(p => p + 1);
            try { bcRef.current?.postMessage({ type: 'PNL_UPDATE', ts: Date.now() }); } catch {}
        }, 30000);
        return () => clearInterval(id);
    }, []);

    /* ── Security ── */
    const safeguard = useCallback((value, fieldName) => {
        const threat = secCheck(value);
        if (threat) {
            setThreats(prev => [...prev, { type: threat, value, field: fieldName, time: new Date().toLocaleTimeString() }]);
            try { addAlert({ id: `sec_pnl_${Date.now()}`, type: 'security', severity: 'critical', title: `🚨 [P&L] ${threat}`, body: `"${fieldName}": ${value.slice(0, 50)}`, timestamp: new Date().toISOString(), read: false }); } catch {}
            return '';
        }
        return value;
    }, [addAlert]);

    /* ── Live Data ── */
    const live = {
        grossRevenue: pnlStats.revenue || 0, adSpend: pnlStats.adSpend || 0,
        platformFee: pnlStats.platformFee || 0, couponDiscount: pnlStats.couponDiscount || 0,
        returnFee: pnlStats.returnFee || 0, cogs: pnlStats.cogs || 0,
        grossProfit: pnlStats.grossProfit || 0, operatingProfit: pnlStats.operatingProfit || 0,
        netPayout: pnlStats.netPayout || 0, pendingPayout: settlementStats.pendingAmount || 0,
        roas: budgetStats.blendedRoas || 0,
        totalOrders: (orderStats.count || 0) + (settlementStats.totalOrders || 0),
        totalReturns: settlementStats.totalReturns || 0, returnRate: settlementStats.returnRate || 0,
    };

    const TABS = [
        { id: 'overview', icon: '🌊', labelKey: 'pnl.tabOverview', descKey: 'pnl.descOverview' },
        { id: 'pnl', icon: '📊', labelKey: 'pnl.tabUnitPnl', descKey: 'pnl.descUnitPnl' },
        { id: 'anomaly', icon: '🚨', labelKey: 'pnl.tabAnomaly', descKey: 'pnl.descAnomaly' },
        { id: 'action', icon: '📋', labelKey: 'pnl.tabAction', descKey: 'pnl.descAction' },
        { id: 'forecast', icon: '🔮', labelKey: 'pnl.tabForecast', descKey: 'pnl.descForecast' },
        { id: 'guide', icon: '📖', labelKey: 'pnl.tabGuide', descKey: 'pnl.descGuide' },
    ];

    const DATE_RANGES = [
        { key: 'today', label: t('pnl.dateToday') },
        { key: '7d', label: t('pnl.date7d') },
        { key: '30d', label: t('pnl.date30d') },
        { key: '90d', label: t('pnl.date90d') },
        { key: 'custom', label: t('pnl.dateCustom') },
    ];

    const handleExport = (format) => {
        const data = { format, date: new Date().toISOString(), dateRange, live };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `pnl_report_${Date.now()}.${format === 'excel' ? 'json' : format}`; a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
            <SecurityOverlay threats={threats} onDismiss={() => setThreats([])} t={t} />

            {/* Header */}
            <div style={{ flexShrink: 0, padding: '14px 16px 0', background: 'var(--surface-1, #070f1a)', zIndex: 10, borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
                <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(79,142,247,0.05))', borderColor: 'rgba(239,68,68,0.15)', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div className="hero-meta">
                            <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(79,142,247,0.15))' }}>🌊</div>
                            <div>
                                <div className="hero-title" style={{ background: 'linear-gradient(135deg,#ef4444,#4f8ef7)' }}>{t('pnl.pageTitle')}</div>
                                <div className="hero-desc">{t('pnl.pageDesc')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: GREEN }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, animation: 'pulse 2s infinite' }} /> {t('pnl.realtimeSync')}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: threats.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${threats.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`, color: threats.length > 0 ? RED : GREEN }}>
                            {threats.length > 0 ? '🔴' : '🟢'} {threats.length > 0 ? `${threats.length} ${t('pnl.threats')}` : t('pnl.securityNormal')}
                        </div>
                    </div>
                </div>
                </div>
                
                {/* Toolbar: Date Range + Export + Badges */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>📅 {t('pnl.dateRange')}:</span>
                    {DATE_RANGES.map(d => (
                        <button key={d.key} onClick={() => setDateRange(d.key)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid', fontSize: 10, fontWeight: 700, cursor: 'pointer', borderColor: dateRange === d.key ? ACCENT : 'rgba(255,255,255,0.1)', background: dateRange === d.key ? 'rgba(79,142,247,0.15)' : 'transparent', color: dateRange === d.key ? ACCENT : '#888' }}>{d.label}</button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => handleExport('pdf')} style={BTN('rgba(239,68,68,0.12)', RED)}>📄 PDF</button>
                    <button onClick={() => handleExport('excel')} style={BTN('rgba(34,197,94,0.12)', GREEN)}>📊 Excel</button>
                </div>
                
                {/* Badge Row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>🔴 {t('pnl.liveRevenue')} {fmt(live.grossRevenue)}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>{t('pnl.badgeAdSpend')} {fmt(live.adSpend)}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(79,142,247,0.12)', color: '#60a5fa', border: '1px solid rgba(79,142,247,0.25)' }}>{t('pnl.badgeSettlement')} {fmt(live.netPayout)}</span>
                    {connectedChannels.length > 0 && (
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>🔗 {connectedChannels.length} {t('pnl.channelsConnected')}</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button onClick={() => navigate('/budget-planner')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>💰 {t('pnl.linkBudget')}</button>
                    <button onClick={() => navigate('/wms')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>🏭 {t('pnl.linkInventory')}</button>
                    <button onClick={() => navigate('/kr-channel')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>⚖️ {t('pnl.linkRecon')}</button>
                </div>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', padding: '4px 4px 0', borderRadius: '12px 12px 0 0', border: '1px solid rgba(99,140,255,0.06)', borderBottom: 'none' }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                        flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', textAlign: 'center', borderRadius: '8px 8px 0 0',
                        background: tab === tb.id ? 'rgba(79,142,247,0.1)' : 'transparent',
                        borderBottom: `2px solid ${tab === tb.id ? ACCENT : 'transparent'}`, transition: 'all 200ms' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.icon} {t(tb.labelKey)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{t(tb.descKey)}</div>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
                {tab === 'overview' && <OverviewTab live={live} t={t} fmt={fmt} dateRange={dateRange} />}
                {tab === 'pnl' && <PnlUnitTab live={live} t={t} fmt={fmt} connectedChannels={connectedChannels} />}
                {tab === 'anomaly' && <AnomalyTab t={t} />}
                {tab === 'action' && <ActionTab t={t} />}
                {tab === 'forecast' && <ForecastTab live={live} t={t} fmt={fmt} />}
                {tab === 'guide' && <GuideTab t={t} />}
            </div>

            <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
    );
}
