import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell } from "recharts";

import { useT } from '../i18n/index.js';
const BUDGET_DATA = {
    monthly: [
        { channel: "Meta", allocated: 100000, spent: 85200, remaining: 14800, pace: "On Track" },
        { channel: "TikTok", allocated: 50000, spent: 52400, remaining: -2400, pace: "Overspend" },
        { channel: "Amazon", allocated: 80000, spent: 45000, remaining: 35000, pace: "Underspend" },
        { channel: "Shopify", allocated: 20000, spent: 18500, remaining: 1500, pace: "On Track" },
    ],
    quarterly: [
        { channel: "Meta", allocated: 300000, spent: 260000, remaining: 40000, pace: "On Track" },
        { channel: "TikTok", allocated: 150000, spent: 145000, remaining: 5000, pace: "On Track" },
        { channel: "Amazon", allocated: 240000, spent: 120000, remaining: 120000, pace: "Underspend" },
        { channel: "Shopify", allocated: 60000, spent: 58000, remaining: 2000, pace: "On Track" },
    ],
    yearly: [
        { channel: "Meta", allocated: 1200000, spent: 650000, remaining: 550000, pace: "On Track" },
        { channel: "TikTok", allocated: 600000, spent: 410000, remaining: 190000, pace: "On Track" },
        { channel: "Amazon", allocated: 960000, spent: 300000, remaining: 660000, pace: "Underspend" },
        { channel: "Shopify", allocated: 240000, spent: 180000, remaining: 60000, pace: "On Track" },
    ]
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "rgba(10, 15, 30, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                <p style={{ margin: "0 0 8px 0", color: "#fff", fontWeight: 700, fontSize: 13 }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "2px", background: entry.color }} />
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{entry.name}:</span>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 12 }}>₩{Number(entry.value).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function BudgetPlanner() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [period, setPeriod] = useState("monthly");

    const data = BUDGET_DATA[period];

    const aggregates = useMemo(() => {
        return data.reduce((acc, curr) => {
            acc.allocated += curr.allocated;
            acc.spent += curr.spent;
            acc.remaining += curr.remaining;
            return acc;
        }, { allocated: 0, spent: 0, remaining: 0 });
    }, [data]);

    const globalBurnRate = aggregates.allocated > 0 ? (aggregates.spent / aggregates.allocated) * 100 : 0;

    return (
        <div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.4s' }}>
            <div className="hero" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(45,212,191,0.05))', position: 'relative' }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: '#22c55e22', color: '#22c55e' }}>💰</div>
                    <div>
                        <div className="hero-title">{t('marketing.budgetTrackerTab') || "Unified Budget Tracker"}</div>
                        <div className="hero-desc">Monitor allocated budget vs actual spending across all channels. Replace your calendar with real-time spend pacing.</div>
                    </div>
                </div>
                
                <div style={{ position: 'absolute', right: 24, top: 24, display: 'flex', gap: 8, background: "rgba(9,15,30,0.8)", borderRadius: 12, padding: 4, border: "1px solid rgba(99,140,255,0.1)" }}>
                    {[{id: 'monthly', lbl: 'Monthly (월간)'}, {id: 'quarterly', lbl: 'Quarterly (분기)'}, {id: 'yearly', lbl: 'Yearly (연간)'}].map(p => (
                        <button key={p.id} onClick={() => setPeriod(p.id)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: period === p.id ? "linear-gradient(135deg,#22c55e,#10b981)" : "transparent", color: period === p.id ? "#fff" : "var(--text-3)", transition: "all 150ms" }}>
                            {p.lbl}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {[
                    { label: "Total Allocated", value: aggregates.allocated, color: "#4f8ef7" },
                    { label: "Total Spent", value: aggregates.spent, color: "#f97316" },
                    { label: "Total Remaining", value: aggregates.remaining, color: aggregates.remaining < 0 ? "#ef4444" : "#22c55e" }
                ].map((col, idx) => (
                    <div key={idx} className="card card-glass fade-up" style={{ padding: 24, borderTop: `2px solid ${col.color}`, animationDelay: `${idx*100}ms` }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 8 }}>{col.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{fmt(col.value, { prefix: '₩' })}</div>
                    </div>
                ))}
            </div>

            {/* Bar Chart Visualization */}
            <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: "300ms" }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📊 Budget Allocation vs Actual Spend by Channel</div>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="channel" stroke="rgba(255,255,255,0.3)" fontSize={12} fontWeight={700} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                            <Bar dataKey="allocated" name="Allocated Budget" fill="rgba(79,142,247,0.4)" radius={[4,4,0,0]} />
                            <Bar dataKey="spent" name="Actual Spend" radius={[4,4,0,0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.spent > entry.allocated ? '#ef4444' : '#f97316'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Data Table */}
            <div className="card card-glass fade-up" style={{ padding: 0, overflow: 'hidden', animationDelay: "400ms" }}>
                <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>📈 Detailed Channel Pacing</div>
                </div>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                    <thead style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <tr>
                            <th style={{ padding: '14px 20px', textAlign: 'left' }}>Target Channel</th>
                            <th style={{ textAlign: 'right' }}>Allocated Budget</th>
                            <th style={{ textAlign: 'right' }}>Real-time Spend</th>
                            <th style={{ textAlign: 'right' }}>Remaining Balance</th>
                            <th style={{ textAlign: 'right' }}>Burn Rate (%)</th>
                            <th style={{ paddingLeft: 40, textAlign: 'left' }}>Pacing Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(row => {
                            const burnPct = row.allocated > 0 ? (row.spent / row.allocated) * 100 : 0;
                            return (
                                <tr key={row.channel} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '14px 20px', fontWeight: 800 }}>{row.channel}</td>
                                    <td style={{ textAlign: 'right', color: '#4f8ef7', fontWeight: 700 }}>{fmt(row.allocated)}</td>
                                    <td style={{ textAlign: 'right', color: '#f97316', fontWeight: 700 }}>{fmt(row.spent)}</td>
                                    <td style={{ textAlign: 'right', color: row.remaining < 0 ? '#ef4444' : '#22c55e', fontWeight: 800 }}>{fmt(row.remaining)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                                            <span style={{ color: burnPct > 100 ? '#ef4444' : 'var(--text-1)', fontSize: 12 }}>{burnPct.toFixed(1)}%</span>
                                            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, burnPct)}%`, height: '100%', background: burnPct > 100 ? '#ef4444' : burnPct > 80 ? '#f97316' : '#22c55e' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ paddingLeft: 40 }}>
                                        <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: row.pace === 'On Track' ? 'rgba(34,197,94,0.1)' : row.pace === 'Overspend' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: row.pace === 'On Track' ? '#22c55e' : row.pace === 'Overspend' ? '#ef4444' : '#f59e0b' }}>
                                            {row.pace}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
