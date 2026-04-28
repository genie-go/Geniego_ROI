// BudgetTracker.jsx — Enterprise Budget Management Dashboard v2.0
// ┌──────────────────────────────────────────────────────────────────────┐
// │ Real-time sync:                                                       │
// │  GlobalDataContext sharedCampaigns → Budget / Spend / ROI 자동집계    │
// │  channelBudgets → Channel별 Budget Pacing 실시간 반영               │
// │  budgetStats / pnlStats → P&L 연동 실시간 동기화                    │
// │  SecurityGuard → 해킹 시도 감지 & 실시간 Notification               │
// └──────────────────────────────────────────────────────────────────────┘
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useSecurityGuard, sanitizeInput, detectXSS } from '../security/SecurityGuard.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell,
    PieChart, Pie, LineChart, Line, AreaChart, Area,
} from 'recharts';

/* ─── BroadcastChannel Cross-Tab Sync ─── */
const BUDGET_SYNC_CH = 'geniego-budget-sync';
let _budgetChannel = null;
try { if (typeof BroadcastChannel !== 'undefined') _budgetChannel = new BroadcastChannel(BUDGET_SYNC_CH); } catch { /* */ }
function broadcastBudget(type, payload) {
    try {
        if (_budgetChannel) _budgetChannel.postMessage({ type, payload, ts: Date.now() });
        else { localStorage.setItem('__budget_sync__', JSON.stringify({ type, payload, ts: Date.now() })); localStorage.removeItem('__budget_sync__'); }
    } catch { /* */ }
}


/* ══════════════════════════════════════════════════
   Constants
══════════════════════════════════════════════════ */
const CATEGORY_COLORS = ['#4f8ef7', '#06b6d4', '#f97316', '#a855f7', '#22c55e', '#f43f5e'];
const CHANNEL_GRADIENT_MAP = {
    Meta: '#4f8ef7', Google: '#f97316', TikTok: '#06b6d4', Naver: '#22c55e',
    Kakao: '#f59e0b', YouTube: '#ef4444', Amazon: '#a855f7', Shopify: '#14d9b0',
};

/* ══════════════════════════════════════════════════
   Custom Tooltip
══════════════════════════════════════════════════ */
const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(9,15,30,0.95)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 16px', backdropFilter: 'blur(20px)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>{label}</div>
            {payload.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: e.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{e.name}:</span>
                    <span style={{ color: 'var(--text-1)', fontWeight: 800, fontSize: 12 }}>{Number(e.value).toLocaleString()}</span>
            </div>
            ))}
        </div>
);
};

/* ══════════════════════════════════════════════════
   Sub-Tab Components
══════════════════════════════════════════════════ */

// ─── Budget Overview Tab ─────────────────────
function BudgetOverviewTab({ t, fmt, budget, categories, suppliers, monthlyTrend, securityStatus }) {
    const totalBudget = budget.totalAllocated || 0;
    const totalActual = budget.totalSpent || 0;
    const totalBalance = budget.balance || 0;
    const burnRate = budget.burnRate || 0;

    return (
        <div style={{ display: 'grid', gap: 20 }}>
            {/* Security Status Bar */}
            {securityStatus && (
                <div style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: securityStatus === 'safe' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${securityStatus === 'safe' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700,
                    color: securityStatus === 'safe' ? '#22c55e' : '#ef4444',
                }}>
                    {securityStatus === 'safe' ? '🛡️' : '🚨'} {t('marketing.bgSecurityStatus') || 'Security Monitor'}: {securityStatus === 'safe' ? (t('marketing.bgSecuritySafe') || 'All Systems Secure') : (t('marketing.bgSecurityAlert') || 'Threat Detected')}
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 16 }}>
                <div className="card card-glass fade-up" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('marketing.bgSummaryBudget') || 'Total Allocated Budget'}</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#4f8ef7' }}>{fmt(totalBudget, { prefix: '₩' })}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('marketing.bgSummaryActual') || 'Total Actual Spend'}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#f97316' }}>{fmt(totalActual, { prefix: '₩' })}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('marketing.bgSummaryProfit') || 'Remaining Balance'}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: totalBalance >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(totalBalance, { prefix: '₩' })}</div>
                    </div>
                </div>

                {/* Donut — Burn Rate */}
                <div className="card card-glass fade-up" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '100ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 20 }}>{t('marketing.bgAchievePct') || 'Achievement Rate'}</div>
                    <div style={{ width: '100%', height: 200, position: 'relative' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={[{ value: burnRate }, { value: 100 - Math.min(100, burnRate) }]} innerRadius={65} outerRadius={85} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                                    <Cell fill={burnRate > 90 ? '#ef4444' : burnRate > 70 ? '#f97316' : '#0ea5e9'} />
                                    <Cell fill="rgba(255,255,255,0.05)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-1)' }}>{burnRate}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('marketing.bgBurnRateLabel') || 'Burn Rate'}</div>
                        </div>
                    </div>
                </div>

                {/* Pie — Category Allocation */}
                <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '200ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 20 }}>{t('marketing.bgCategoryAlloc') || 'Category Allocation'}</div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ width: '50%', height: 200 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={categories} cx="50%" cy="50%" outerRadius={70} dataKey="value" stroke="none" labelLine={false}>
                                        {categories.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <RechartsTooltip content={<GlassTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {categories.map((d, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} /> {d.name}</div>
                                        <div style={{ fontWeight: 800 }}>{d.value}%</div>
                                    </div>
                                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                                        <div style={{ width: `${d.value}%`, height: '100%', background: d.color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Trend & Top Channels */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '300ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 20 }}>{t('marketing.bgKpiActualVsBudget') || 'Monthly Actual vs Budget'}</div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="period" stroke="rgba(255,255,255,0.3)" fontSize={11} fontWeight={700} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                                <RechartsTooltip content={<GlassTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                                <Bar dataKey="actual" name={t('marketing.bgBarActualSpend') || 'Actual Spend'} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="budget" name={t('marketing.bgBarSetBudget') || 'Budget'} fill="#fb7185" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                </div>

                </div>

                <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '400ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginBottom: 20 }}>{t('marketing.bgKpiTopChan') || 'Top Channels'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {suppliers.length === 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
                                {t('marketing.noData') || 'No Data'}
                            </div>
                        )}
                        {suppliers.map((s, i) => {
                            const max = suppliers[0]?.spent || 1;
                            const pct = max > 0 ? (s.spent / max) * 100 : 0;
                            return (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                        <div style={{ color: 'var(--text-1)', fontWeight: 600 }}>{sanitizeInput(s.name)}</div>
                                        <div style={{ color: '#f59e0b', fontWeight: 800 }}>₩{fmt(s.spent)}</div>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: 'rgba(245,158,11,0.1)', borderRadius: 3 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 3, transition: 'width 0.8s ease' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Channel Pacing Tab ──────────────────────────
function ChannelPacingTab({ t, fmt, channelBudgets }) {
    const channels = useMemo(() => {
        return Object.entries(channelBudgets).map(([id, ch]) => ({
            id,
            name: ch.name || id,
            allocated: ch.budget || 0,
            spent: ch.spent || 0,
            remaining: (ch.budget || 0) - (ch.spent || 0),
            roas: ch.roas || 0,
            burnPct: ch.budget > 0 ? ((ch.spent / ch.budget) * 100) : 0,
            pace: ch.budget > 0
                ? ch.spent / ch.budget > 1.05 ? 'overspend'
                    : ch.spent / ch.budget < 0.5 ? 'underspend'
                        : 'ontrack'
                : 'ontrack',
        }));
    }, [channelBudgets]);

    const aggregates = useMemo(() => channels.reduce((acc, ch) => ({
        allocated: acc.allocated + ch.allocated,
        spent: acc.spent + ch.spent,
        remaining: acc.remaining + ch.remaining,
    }), { allocated: 0, spent: 0, remaining: 0 }), [channels]);

    return (
        <div style={{ display: 'grid', gap: 20 }}>
            {/* Aggregate KPI Cards */}
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
            {channels.length > 0 && (
                <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '300ms' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 20 }}>📊 {t('marketing.bgPacingChart') || 'Budget Allocation vs Actual Spend by Channel'}</div>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={channels} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} fontWeight={700} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                                <RechartsTooltip content={<GlassTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                                <Bar dataKey="allocated" name={t('marketing.bgPacingAllocLabel') || 'Allocated'} fill="rgba(79,142,247,0.4)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="spent" name={t('marketing.bgPacingSpentLabel') || 'Actual Spend'} radius={[4, 4, 0, 0]}>
                                    {channels.map((entry, index) => (
                                        <Cell key={index} fill={entry.spent > entry.allocated ? '#ef4444' : '#f97316'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>)}

            {/* Detailed Table */}
            <div className="card card-glass fade-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '400ms' }}>
                <div style={{ padding: '16px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>📈 {t('marketing.bgPacingTableTitle') || 'Detailed Channel Pacing'}</div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0, whiteSpace: 'nowrap' }}>
                        <thead style={{ background: 'var(--surface)' }}>
                            <tr>
                                <th style={{ padding: '14px 20px', textAlign: 'left' }}>{t('marketing.bgPacingColChannel') || 'Channel'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColAlloc') || 'Allocated'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColSpend') || 'Spend'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColRemaining') || 'Remaining'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColBurn') || 'Burn Rate'}</th>
                                <th style={{ textAlign: 'right' }}>{t('marketing.bgPacingColRoas') || 'ROAS'}</th>
                                <th style={{ paddingLeft: 40, textAlign: 'left' }}>{t('marketing.bgPacingColStatus') || 'Status'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {channels.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>{t('marketing.noData') || 'No Data'}</td></tr>
                            )}
                            {channels.map(row => (
                                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '14px 20px', fontWeight: 800 }}>{sanitizeInput(row.name)}</td>
                                    <td style={{ textAlign: 'right', color: '#4f8ef7', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(row.allocated)}</td>
                                    <td style={{ textAlign: 'right', color: '#f97316', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(row.spent)}</td>
                                    <td style={{ textAlign: 'right', color: row.remaining < 0 ? '#ef4444' : '#22c55e', fontWeight: 800, fontFamily: 'monospace' }}>{fmt(row.remaining)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                                            <span style={{ color: row.burnPct > 100 ? '#ef4444' : 'var(--text-1)', fontSize: 12, fontFamily: 'monospace' }}>{row.burnPct.toFixed(1)}%</span>
                                            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, row.burnPct)}%`, height: '100%', background: row.burnPct > 100 ? '#ef4444' : row.burnPct > 80 ? '#f97316' : '#22c55e', transition: 'width 0.6s ease' }} />
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#14d9b0', fontFamily: 'monospace' }}>{row.roas ? `${row.roas}x` : '—'}</td>
                                    <td style={{ paddingLeft: 40 }}>
                                        <span style={{
                                            padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                            background: row.pace === 'ontrack' ? 'rgba(34,197,94,0.1)' : row.pace === 'overspend' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                            color: row.pace === 'ontrack' ? '#22c55e' : row.pace === 'overspend' ? '#ef4444' : '#f59e0b',
                                        }}>
                                            {row.pace === 'ontrack' ? (t('marketing.bgPaceOnTrack') || 'ON TRACK')
                                                : row.pace === 'overspend' ? (t('marketing.bgPaceOverspend') || 'OVERSPEND')
                                                    : (t('marketing.bgPaceUnderspend') || 'UNDERSPEND')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

// ─── Campaign Detail Tab ──────────────────────
function CampaignDetailTab({ t, fmt, tableData }) {
    return (
        <div className="card card-glass fade-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{t('marketing.bgTableCampaign') || 'Campaign Performance'}</span>
                <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>({tableData.length} {t('marketing.bgCampaignCount') || 'campaigns'})</span>
            <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', whiteSpace: 'nowrap', margin: 0 }}>
                    <thead style={{ background: 'var(--surface)' }}>
                        <tr>
                            <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--text-3)' }}>{t('marketing.bgColCampSum') || 'Campaign'}</th>
                            <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColImpr') || 'Impressions'}</th>
                            <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColCtr') || 'CTR'}</th>
                            <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColBudget') || 'Budget'}</th>
                            <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColSpend') || 'Spend'}</th>
                            <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColProfit') || 'Profit'}</th>
                            <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColCpc') || 'CPC'}</th>
                            <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColCpa') || 'CPA'}</th>
                            <th style={{ paddingRight: 24, textAlign: 'right', color: '#14d9b0' }}>{t('marketing.bgColRoi') || 'ROI'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>{t('marketing.noData') || 'No Data'}</td></tr>
                        )}
                        {tableData.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '12px 24px', fontWeight: 800, color: 'var(--text-1)' }}>{sanitizeInput(row.campaign)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{(row.impr || 0).toLocaleString()}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#4f8ef7' }}>{row.ctr}%</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#f87171' }}>₩{fmt(row.budget)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#fb923c' }}>₩{fmt(row.spend)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e', fontWeight: 800 }}>₩{fmt(row.profit)}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₩{row.cpc}</td>
                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{row.cpa}</td>
                                <td style={{ paddingRight: 24, textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#14d9b0' }}>{row.roi}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);
}

// ─── P&L Integration Tab ───────────────────────
function PnlIntegrationTab({ t, fmt, pnlStats, budgetStats }) {
    const pnlItems = useMemo(() => [
        { label: t('marketing.bgPnlRevenue') || 'Revenue', value: pnlStats.revenue, color: '#4f8ef7', icon: '💰' },
        { label: t('marketing.bgPnlCogs') || 'COGS', value: -pnlStats.cogs, color: '#f87171', icon: '📦' },
        { label: t('marketing.bgPnlGross') || 'Gross Profit', value: pnlStats.grossProfit, color: '#22c55e', icon: '📈' },
        { label: t('marketing.bgPnlAdSpend') || 'Ad Spend', value: -pnlStats.adSpend, color: '#f97316', icon: '📢' },
        { label: t('marketing.bgPnlPlatformFee') || 'Platform Fee', value: -pnlStats.platformFee, color: '#a855f7', icon: '🏪' },
        { label: t('marketing.bgPnlOperating') || 'Operating Profit', value: pnlStats.operatingProfit, color: pnlStats.operatingProfit >= 0 ? '#14d9b0' : '#ef4444', icon: '🏆' },
    ], [pnlStats, t]);

    return (
        <div style={{ display: 'grid', gap: 20 }}>
            {/* Waterfall KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {pnlItems.slice(0, 3).map((item, i) => (
                    <div key={i} className="card card-glass fade-up" style={{ padding: 24, borderLeft: `3px solid ${item.color}`, animationDelay: `${i * 80}ms` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 18 }}>{item.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)' }}>{item.label}</span>
                        <div style={{ fontSize: 24, fontWeight: 900, color: item.color }}>{fmt(Math.abs(item.value), { prefix: item.value < 0 ? '-₩' : '₩' })}</div>
                ))}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {pnlItems.slice(3).map((item, i) => (
                    <div key={i} className="card card-glass fade-up" style={{ padding: 24, borderLeft: `3px solid ${item.color}`, animationDelay: `${(i + 3) * 80}ms` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 18 }}>{item.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)' }}>{item.label}</span>
                        <div style={{ fontSize: 24, fontWeight: 900, color: item.color }}>{fmt(Math.abs(item.value), { prefix: item.value < 0 ? '-₩' : '₩' })}</div>
                ))}

            {/* Margin Summary Card */}
            <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '500ms' }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>📊 {t('marketing.bgPnlMarginSummary') || 'Margin & ROAS Summary'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[
                        { label: t('marketing.bgPnlMargin') || 'Operating Margin', value: `${pnlStats.margin}%`, color: Number(pnlStats.margin) >= 0 ? '#22c55e' : '#ef4444' },
                        { label: t('marketing.bgPnlNetMargin') || 'Net Margin', value: `${pnlStats.netMargin}%`, color: Number(pnlStats.netMargin) >= 0 ? '#14d9b0' : '#ef4444' },
                        { label: t('marketing.bgPnlBlendedRoas') || 'Blended ROAS', value: `${budgetStats.blendedRoas?.toFixed(2) || '0'}x`, color: '#f59e0b' },
                        { label: t('marketing.bgPnlAdRevenue') || 'Ad Revenue', value: fmt(budgetStats.totalAdRevenue || 0, { prefix: '₩' }), color: '#4f8ef7' },
                    ].map((m, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>{m.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: m.color }}>{m.value}</div>
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
    </div>
);
}

// ─── Budget Forecast Tab ─────────────────────────
function BudgetForecastTab({ t, fmt, budget, monthlyTrend }) {
    const totalBudget = budget.totalAllocated || 0;
    const totalSpent = budget.totalSpent || 0;
    const daysElapsed = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const dailyBurn = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const projectedMonthEnd = Math.round(dailyBurn * daysInMonth);
    const projectedOverUnder = totalBudget - projectedMonthEnd;
    const projectedBurnRate = totalBudget > 0 ? Math.round((projectedMonthEnd / totalBudget) * 100) : 0;

    const forecastData = useMemo(() => {
        const data = [];
        for (let d = 1; d <= daysInMonth; d++) {
            data.push({
                day: `${d}`,
                actual: d <= daysElapsed ? Math.round((totalSpent / daysElapsed) * d) : null,
                projected: Math.round(dailyBurn * d),
                budget: Math.round(totalBudget / daysInMonth * d),
            });
        }
        return data;
    }, [totalSpent, totalBudget, dailyBurn, daysElapsed, daysInMonth]);

    return (
        <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                    { label: t('marketing.bgForecastDaily'), value: fmt(dailyBurn), color: '#4f8ef7', icon: '📅' },
                    { label: t('marketing.bgForecastProjected'), value: fmt(projectedMonthEnd), color: '#f97316', icon: '📈' },
                    { label: t('marketing.bgForecastOverUnder'), value: fmt(Math.abs(projectedOverUnder)), color: projectedOverUnder >= 0 ? '#22c55e' : '#ef4444', icon: projectedOverUnder >= 0 ? '✅' : '⚠️' },
                    { label: t('marketing.bgForecastBurn'), value: `${projectedBurnRate}%`, color: projectedBurnRate > 100 ? '#ef4444' : '#14d9b0', icon: '🔥' },
                ].map((kpi, i) => (
                    <div key={i} className="card card-glass fade-up" style={{ padding: 24, borderTop: `2px solid ${kpi.color}`, animationDelay: `${i * 80}ms` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 18 }}>{kpi.icon}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-3)' }}>{kpi.label}</span>
                        <div style={{ fontSize: 24, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                ))}
            <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '300ms' }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>📈 {t('marketing.bgForecastChart')}</div>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3}/><stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}/></linearGradient>
                                <linearGradient id="gradProj" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="day" stroke="var(--text-3)" fontSize={10} />
                            <YAxis stroke="var(--text-3)" fontSize={11} tickFormatter={v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
                            <RechartsTooltip content={<GlassTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                            <Area type="monotone" dataKey="budget" name={t('marketing.bgForecastBudgetLine')} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                            <Area type="monotone" dataKey="actual" name={t('marketing.bgForecastActualLine')} stroke="#4f8ef7" strokeWidth={3} fill="url(#gradActual)" connectNulls={false} />
                            <Area type="monotone" dataKey="projected" name={t('marketing.bgForecastProjLine')} stroke="#f97316" strokeWidth={2} strokeDasharray="3 3" fill="url(#gradProj)" />
                        </AreaChart>
                    </ResponsiveContainer>
            </div>
            <div className="card card-glass" style={{ padding: 18, background: projectedOverUnder >= 0 ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', borderColor: projectedOverUnder >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: projectedOverUnder >= 0 ? '#22c55e' : '#ef4444', marginBottom: 6 }}>
                    {projectedOverUnder >= 0 ? '✅' : '⚠️'} {t('marketing.bgForecastSummary')}
                <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                    {projectedOverUnder >= 0 ? t('marketing.bgForecastUnder') : t('marketing.bgForecastOver')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

// ─── Budget Guide Tab ─────────────────────────
function BudgetGuideTab({ t }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card card-glass" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor: 'rgba(79,142,247,0.3)', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 44 }}>💰</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('marketing.bgGuideTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>{t('marketing.bgGuideSub')}</div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('marketing.bgGuideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {[{n:'1️⃣',k:'bgGuideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'bgGuideStep2',c:'#22c55e'},{n:'3️⃣',k:'bgGuideStep3',c:'#a855f7'},{n:'4️⃣',k:'bgGuideStep4',c:'#f59e0b'},{n:'5️⃣',k:'bgGuideStep5',c:'#f97316'},{n:'6️⃣',k:'bgGuideStep6',c:'#06b6d4'}].map((s,i) => (
                        <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.n}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`marketing.${s.k}Title`)}</span>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{t(`marketing.${s.k}Desc`)}</div>
                    ))}
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('marketing.bgGuideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                    {[{icon:'📊',k:'bgGuideTabOverview',c:'#4f8ef7'},{icon:'⏱',k:'bgGuideTabPacing',c:'#06b6d4'},{icon:'🎯',k:'bgGuideTabCampaigns',c:'#a855f7'},{icon:'💰',k:'bgGuideTabPnl',c:'#22c55e'},{icon:'📈',k:'bgGuideTabForecast',c:'#f97316'}].map((tb,i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`marketing.${tb.k}Name`)}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.6 }}>{t(`marketing.${tb.k}Desc`)}</div>
                        </div>
                    ))}
            </div>
            <div className="card card-glass" style={{ padding: 20, background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.3)' }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('marketing.bgGuideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'var(--text-3)', lineHeight: 2.2 }}>
                    <li>{t('marketing.bgGuideTip1')}</li>
                    <li>{t('marketing.bgGuideTip2')}</li>
                    <li>{t('marketing.bgGuideTip3')}</li>
                    <li>{t('marketing.bgGuideTip4')}</li>
                    <li>{t('marketing.bgGuideTip5')}</li>
                </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════ */
export default function BudgetTrackerDashboard() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { sharedCampaigns, channelBudgets, budgetStats, pnlStats, addAlert } = useGlobalData();

    // ── Security Guard Integration ──
    const [securityStatus, setSecurityStatus] = useState('safe');
    const securityCallback = useCallback((alert) => {
        if (typeof addAlert === 'function') addAlert(alert);
        if (alert?.type === 'critical' || alert?.type === 'error') {
            setSecurityStatus('threat');
            setTimeout(() => setSecurityStatus('safe'), 30000);
        }
    }, [addAlert]);
    useSecurityGuard({ addAlert: securityCallback, enabled: true });

    // ── BroadcastChannel Cross-Tab Sync ──
    useEffect(() => {
        const handler = (msg) => { const { type } = msg?.data || msg; if (type === 'BUDGET_UPDATE') {} };
        if (_budgetChannel) _budgetChannel.onmessage = handler;
        const storageHandler = (e) => { if (e.key === '__budget_sync__' && e.newValue) { try { handler(JSON.parse(e.newValue)); } catch {} } };
        window.addEventListener('storage', storageHandler);
        return () => { if (_budgetChannel) _budgetChannel.onmessage = null; window.removeEventListener('storage', storageHandler); };
    }, []);

    // ── Sub-Tab State ──
    const [activeTab, setActiveTab] = useState('overview');

    // ── Derived budget data from GlobalDataContext (real-time sync) ──
    const { budgetOverview, categories, suppliers, monthlyTrend, tableData } = useMemo(() => {
        let totalSpend = 0, totalAllocated = 0;
        const categoryBuckets = {};
        const channelSpend = {};

        if (sharedCampaigns?.length > 0) {
            sharedCampaigns.forEach(c => {
                const sp = c.spent || c.budget || 0;
                totalSpend += sp;
                const bgt = (c.budget && (typeof c.budget === 'string' ? parseInt(c.budget.replace(/[^0-9]/g, '')) : c.budget)) || (sp * 1.5);
                totalAllocated += bgt;

                // Category classification
                const sName = (c.name || '').toLowerCase();
                let cat;
                if (sName.includes('보습') || sName.includes('retarget') || sName.includes('naver') || sName.includes('kakao')) cat = 'retargeting';
                else if (sName.includes('influencer') || sName.includes('ugc') || sName.includes('셀럽')) cat = 'influencer';
                else if (sName.includes('youtube') || sName.includes('video') || sName.includes('brand')) cat = 'brand';
                else cat = 'performance';
                categoryBuckets[cat] = (categoryBuckets[cat] || 0) + sp;

                // Channel aggregation
                const ch = c.channel || (sName.includes('meta') ? 'Meta' : sName.includes('google') ? 'Google' : sName.includes('tiktok') ? 'TikTok' : 'Other');
                channelSpend[ch] = (channelSpend[ch] || 0) + sp;
            });
        }

        // Also merge channelBudgets data
        if (Object.keys(channelBudgets).length > 0) {
            Object.values(channelBudgets).forEach(ch => {
                totalAllocated = Math.max(totalAllocated, totalAllocated + (ch.budget || 0) - totalAllocated * 0.01);
            });
        }

        const balance = totalAllocated - totalSpend;
        const burnRate = totalAllocated > 0 ? Math.round((totalSpend / totalAllocated) * 100) : 0;

        // Category translation map
        const catTranslate = {
            performance: t('marketing.catPerformance') || 'Performance',
            brand: t('marketing.catBrand') || 'Brand Awareness',
            retargeting: t('marketing.catRetargeting') || 'Retargeting',
            influencer: t('marketing.catInfluencer') || 'Influencer/UGC',
        };

        const catArr = Object.entries(categoryBuckets).map(([key, val], i) => ({
            name: catTranslate[key] || key,
            value: totalSpend > 0 ? Math.round((val / totalSpend) * 100) : 0,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        })).filter(c => c.value > 0);

        if (catArr.length === 0) {
            catArr.push({ name: catTranslate.performance, value: 0, color: CATEGORY_COLORS[0] });
        }

        const supArr = Object.entries(channelSpend)
            .map(([name, spent]) => ({ name, spent }))
            .sort((a, b) => b.spent - a.spent);

        // Monthly trend (deterministic distribution from campaign data — no Math.random)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const currentMonth = new Date().getMonth();
        const trend = months.slice(0, Math.min(currentMonth + 1, 6)).map((m, i) => ({
            period: m,
            actual: Math.round(totalSpend * ((i + 1) / (currentMonth + 1))),
            budget: Math.round(totalAllocated / 12),
        }));

        const tblArr = (sharedCampaigns || []).map(c => {
            const bgt = (c.budget && (typeof c.budget === 'string' ? parseInt(c.budget.replace(/[^0-9]/g, '')) : c.budget)) || ((c.spent || 0) * 1.5);
            const sp = c.spent || 0;
            return {
                campaign: c.name || 'Unnamed',
                impr: c.impressions || 0,
                click: c.clicks || 0,
                ctr: c.ctr || (c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : 0),
                budget: bgt,
                spend: sp,
                profit: bgt - sp > 0 ? bgt - sp : 0,
                cpc: c.clicks ? Math.round(sp / c.clicks) : 0,
                cpa: c.cpa || 0,
                roi: c.roas ? String(c.roas).replace('%', '') : 0,
            };
        });

        return {
            budgetOverview: { totalAllocated, totalSpent: totalSpend, balance, burnRate },
            categories: catArr,
            suppliers: supArr,
            monthlyTrend: trend,
            tableData: tblArr,
        };
    }, [sharedCampaigns, channelBudgets, t]);

    // ── XSS Guard on URL at mount ──
    useEffect(() => {
        const url = decodeURIComponent(window.location.href);
        if (detectXSS(url)) {
            addAlert?.({ type: 'error', msg: '🚨 XSS injection attempt detected and blocked on Budget Tracker page' });
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [addAlert]);

    // ── Tab Definitions ──
    const tabs = useMemo(() => [
        { id: 'overview', label: `📊 ${t('marketing.bgTabOverview')}`, icon: '📊' },
        { id: 'pacing', label: `⏱ ${t('marketing.bgTabPacing')}`, icon: '⏱' },
        { id: 'campaigns', label: `🎯 ${t('marketing.bgTabCampaigns')}`, icon: '🎯' },
        { id: 'pnl', label: `💰 ${t('marketing.bgTabPnl')}`, icon: '💰' },
        { id: 'forecast', label: `📈 ${t('marketing.bgTabForecast')}`, icon: '📈' },
        { id: 'guide', label: `📖 ${t('marketing.bgTabGuide') || '이용 가이드'}`, icon: '📖' },
    ], [t]);

    return (
<div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.4s' }}>
            {/* Hero */}
            <div className="hero" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.05))', overflow: 'visible' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 2 }}>
                    <div className="hero-meta">
                        <div className="hero-icon" style={{ background: '#4f8ef722', color: '#4f8ef7' }}>💰</div>
                        <div>
                            <div className="hero-title">{t('marketing.budgetTrackTitle') || 'Budget Tracking Dashboard'}</div>
                            <div className="hero-desc">
                                {t('marketing.budgetTrackSub') || 'Real-time budget management and spend tracking across all channels'}
                                {' '}
                                {t('marketing.realModeLabel') || '🔴 LIVE'}
                        </div>

                    {/* Sub-Tab Selector */}
                    <div style={{
                        display: 'flex', gap: 4, flexShrink: 0,
                        background: 'rgba(9,15,30,0.8)', borderRadius: 12, padding: 4,
                        border: '1px solid rgba(99,140,255,0.1)',
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                id={`budget-tab-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    fontSize: 11, fontWeight: 700,
                                    background: activeTab === tab.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                                    color: activeTab === tab.id ? '#fff' : 'var(--text-3)',
                                    transition: 'all 200ms ease',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <BudgetOverviewTab
                    t={t} fmt={fmt}
                    budget={budgetOverview}
                    categories={categories}
                    suppliers={suppliers}
                    monthlyTrend={monthlyTrend}
                    securityStatus={securityStatus}
                />
            )}
            {activeTab === 'pacing' && (
                <ChannelPacingTab t={t} fmt={fmt} channelBudgets={channelBudgets} />
            )}
            {activeTab === 'campaigns' && (
                <CampaignDetailTab t={t} fmt={fmt} tableData={tableData} />
            )}
            {activeTab === 'pnl' && (
                <PnlIntegrationTab t={t} fmt={fmt} pnlStats={pnlStats} budgetStats={budgetStats} />
            )}
            {activeTab === 'forecast' && (
                <BudgetForecastTab t={t} fmt={fmt} budget={budgetOverview} monthlyTrend={monthlyTrend} />
            )}
            {activeTab === 'guide' && (
                <BudgetGuideTab t={t} />
            )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}