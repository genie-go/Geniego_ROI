// BudgetPlanner.jsx — Enterprise Channel Budget Planner v2.0
// ┌───────────────────────────────────────────────────────────────────┐
// │ Real-time sync:                                                    │
// │  GlobalDataContext channelBudgets → allocated / spent / remaining  │
// │  budgetStats → aggregate KPIs 자동 집계                           │
// │  sharedCampaigns → 캠페인별 Budget 배분 동기화                    │
// │  SecurityGuard → 입력 XSS 방어 + 해킹 감지                       │
// └───────────────────────────────────────────────────────────────────┘
import React, { useState, useMemo, useCallback } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useSecurityGuard, sanitizeInput } from '../security/SecurityGuard.js';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

/* ══════════════════════════════════════════════════
   Custom Tooltip
══════════════════════════════════════════════════ */
const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(10,15,30,0.95)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px', backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-1)', fontWeight: 700, fontSize: 13 }}>{label}</p>
            {payload.map((entry, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
                    <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{entry.name}:</span>
                    <span style={{ color: 'var(--text-1)', fontWeight: 800, fontSize: 12 }}>₩{Number(entry.value).toLocaleString()}</span>
            </div>
            ))}
        </div>
);
};

/* ══════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════ */
export default function BudgetPlanner() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { channelBudgets, budgetStats, sharedCampaigns, addAlert } = useGlobalData();

    // ── Security Guard ──
    const secCallback = useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]);
    useSecurityGuard({ addAlert: secCallback, enabled: true });

    // ── Period Filter ──
    const [period, setPeriod] = useState('monthly');
    const periodMultiplier = period === 'quarterly' ? 3 : period === 'yearly' ? 12 : 1;

    // ── Derive channel data from GlobalDataContext (real-time sync) ──
    const data = useMemo(() => {
        const entries = Object.entries(channelBudgets);
        if (entries.length === 0) {
            // Fallback from campaigns if channelBudgets is empty
            const channelMap = {};
            (sharedCampaigns || []).forEach(c => {
                const ch = c.channel || 'Other';
                if (!channelMap[ch]) channelMap[ch] = { allocated: 0, spent: 0 };
                const bgt = (c.budget && (typeof c.budget === 'string' ? parseInt(c.budget.replace(/[^0-9]/g, '')) : c.budget)) || ((c.spent || 0) * 1.5);
                channelMap[ch].allocated += bgt;
                channelMap[ch].spent += c.spent || 0;
            });
            return Object.entries(channelMap).map(([channel, v]) => ({
                channel,
                allocated: Math.round(v.allocated * periodMultiplier),
                spent: Math.round(v.spent * periodMultiplier),
                remaining: Math.round((v.allocated - v.spent) * periodMultiplier),
                pace: v.allocated > 0
                    ? v.spent / v.allocated > 1.05 ? 'Overspend'
                        : v.spent / v.allocated < 0.5 ? 'Underspend' : 'On Track'
                    : 'On Track',
            }));
        }
        return entries.map(([id, ch]) => ({
            channel: ch.name || id,
            allocated: Math.round((ch.budget || 0) * periodMultiplier),
            spent: Math.round((ch.spent || 0) * periodMultiplier),
            remaining: Math.round(((ch.budget || 0) - (ch.spent || 0)) * periodMultiplier),
            pace: ch.budget > 0
                ? ch.spent / ch.budget > 1.05 ? 'Overspend'
                    : ch.spent / ch.budget < 0.5 ? 'Underspend' : 'On Track'
                : 'On Track',
        }));
    }, [channelBudgets, sharedCampaigns, periodMultiplier]);

    // ── Aggregates ──
    const aggregates = useMemo(() =>
        data.reduce((acc, curr) => ({
            allocated: acc.allocated + curr.allocated,
            spent: acc.spent + curr.spent,
            remaining: acc.remaining + curr.remaining,
        }), { allocated: 0, spent: 0, remaining: 0 }),
    [data]);

    const globalBurnRate = aggregates.allocated > 0 ? (aggregates.spent / aggregates.allocated) * 100 : 0;

    // ── Period Labels (i18n) ──
    const periodButtons = useMemo(() => [
        { id: 'monthly', lbl: t('marketing.bgPeriodMonthly') || 'Monthly (월간)' },
        { id: 'quarterly', lbl: t('marketing.bgPeriodQuarterly') || 'Quarterly (분기)' },
        { id: 'yearly', lbl: t('marketing.bgPeriodYearly') || 'Yearly (연간)' },
    ], [t]);

    return (
        <div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.4s' }}>
            {/* Hero */}
            <div className="hero" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(45,212,191,0.05))', position: 'relative' }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: '#22c55e22', color: '#22c55e' }}>💰</div>
                    <div>
                        <div className="hero-title">{t('marketing.budgetTrackerTab') || 'Unified Budget Tracker'}</div>
                        <div className="hero-desc">{t('marketing.bgPlannerDesc') || 'Monitor allocated budget vs actual spending across all channels. Real-time spend pacing.'}</div>
                </div>

                <div style={{
                    position: 'absolute', right: 24, top: 24,
                    display: 'flex', gap: 8,
                    background: 'rgba(9,15,30,0.8)', borderRadius: 12, padding: 4,
                    border: '1px solid rgba(99,140,255,0.1)',
                }}>
                    {periodButtons.map(p => (
                        <button
                            key={p.id}
                            id={`planner-period-${p.id}`}
                            onClick={() => setPeriod(p.id)}
                            style={{
                                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700,
                                background: period === p.id ? 'linear-gradient(135deg,#22c55e,#10b981)' : 'transparent',
                                color: period === p.id ? '#fff' : 'var(--text-3)',
                                transition: 'all 150ms',
                            }}
                        >
                            {p.lbl}
                        </button>
                    ))}
            </div>

            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                    { label: t('marketing.bgPacingAllocated') || 'Total Allocated', value: aggregates.allocated, color: '#4f8ef7' },
                    { label: t('marketing.bgPacingSpent') || 'Total Spent', value: aggregates.spent, color: '#f97316' },
                    { label: t('marketing.bgPacingRemaining') || 'Total Remaining', value: aggregates.remaining, color: aggregates.remaining < 0 ? '#ef4444' : '#22c55e' },
                ].map((col, idx) => (
                    <div key={idx} className="card card-glass fade-up" style={{ padding: 24, borderTop: `2px solid ${col.color}`, animationDelay: `${idx * 100}ms` }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8 }}>{col.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1)' }}>{fmt(col.value, { prefix: '₩' })}</div>
                ))}

            {/* Bar Chart */}
            {data.length > 0 && (
                <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '300ms' }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📊 {t('marketing.bgPacingChart') || 'Budget Allocation vs Actual Spend by Channel'}</div>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="channel" stroke="rgba(255,255,255,0.3)" fontSize={12} fontWeight={700} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                                <RechartsTooltip content={<GlassTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                                <Bar dataKey="allocated" name={t('marketing.bgPacingAllocLabel') || 'Allocated Budget'} fill="rgba(79,142,247,0.4)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="spent" name={t('marketing.bgPacingSpentLabel') || 'Actual Spend'} radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.spent > entry.allocated ? '#ef4444' : '#f97316'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                </div>
            )}

            {/* Data Table */}
            <div className="card card-glass fade-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '400ms' }}>
                <div style={{ padding: '16px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>📈 {t('marketing.bgPacingTableTitle') || 'Detailed Channel Pacing'}</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0, whiteSpace: 'nowrap' }}>
                        <thead style={{ background: 'var(--surface)' }}>
                            <tr>
                                <th style={{ padding: '14px 20px', textAlign: 'left' }}>{t('marketing.bgPacingColChannel') || 'Target Channel'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColAlloc') || 'Allocated Budget'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColSpend') || 'Real-time Spend'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColRemaining') || 'Remaining Balance'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColBurn') || 'Burn Rate (%)'}</th>
                                <th style={{ paddingLeft: 40, textAlign: 'left' }}>{t('marketing.bgPacingColStatus') || 'Pacing Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>{t('marketing.noData') || 'No Data'}</td></tr>
                            )}
                            {data.map(row => {
                                const burnPct = row.allocated > 0 ? (row.spent / row.allocated) * 100 : 0;
                                return (
                                    <tr key={row.channel} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '14px 20px', fontWeight: 800 }}>{sanitizeInput(row.channel)}</td>
                                        <td style={{ textAlign: 'right', color: '#4f8ef7', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(row.allocated)}</td>
                                        <td style={{ textAlign: 'right', color: '#f97316', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(row.spent)}</td>
                                        <td style={{ textAlign: 'right', color: row.remaining < 0 ? '#ef4444' : '#22c55e', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(row.remaining)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                                                <span style={{ color: burnPct > 100 ? '#ef4444' : 'var(--text-1)', fontSize: 12, fontFamily: 'monospace' }}>{burnPct.toFixed(1)}%</span>
                                                <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                                    <div style={{ width: `${Math.min(100, burnPct)}%`, height: '100%', background: burnPct > 100 ? '#ef4444' : burnPct > 80 ? '#f97316' : '#22c55e', transition: 'width 0.6s ease' }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ paddingLeft: 40 }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                                background: row.pace === 'On Track' ? 'rgba(34,197,94,0.1)' : row.pace === 'Overspend' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                color: row.pace === 'On Track' ? '#22c55e' : row.pace === 'Overspend' ? '#ef4444' : '#f59e0b',
                                            }}>
                                                {row.pace === 'On Track' ? (t('marketing.bgPaceOnTrack') || 'ON TRACK')
                                                    : row.pace === 'Overspend' ? (t('marketing.bgPaceOverspend') || 'OVERSPEND')
                                                        : (t('marketing.bgPaceUnderspend') || 'UNDERSPEND')}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
