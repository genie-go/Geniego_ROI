import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

import { useT } from '../i18n/index.js';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
/* ─── Mock Data ────────────────────────────────────────── */
const META_DATA = [
    {
        id: "c1",
        account_team: "A팀_퍼포먼스",
        name: "Spring_KR_Brand_Awareness",
        objective: "Awareness",
        status: "active",
        allocated: 50000, spend: 38200, roas: 5.12, ctr: 3.2, cpm: 2.1, impressions: 900000, reach: 750000, clicks: 48200, conv: 320,
        adSets: [
            {
                id: "as1", name: "Seoul_Ages20-30", status: "active", spend: 20000, impressions: 500000, reach: 450000, clicks: 28000, conv: 200, roas: 5.6, ctr: 5.6,
                ads: [
                    { id: "a1", name: "Video_Influencer_A", status: "active", spend: 12000, impressions: 320000, clicks: 17000, conv: 120, roas: 6.2, ctr: 5.3 },
                    { id: "a2", name: "Carousel_ProductList", status: "active", spend: 8000, impressions: 180000, clicks: 11000, conv: 80, roas: 4.8, ctr: 6.1 }
                ]
            },
            {
                id: "as2", name: "Busan_Ages20-30", status: "active", spend: 18200, impressions: 400000, reach: 300000, clicks: 20200, conv: 120, roas: 4.6, ctr: 5.0,
                ads: [
                    { id: "a3", name: "Image_Static_B", status: "paused", spend: 18200, impressions: 400000, clicks: 20200, conv: 120, roas: 4.6, ctr: 5.0 }
                ]
            }
        ]
    },
    {
        id: "c2",
        account_team: "B팀_리타게팅",
        name: "Retargeting_Website_Traffic",
        objective: "Consideration",
        status: "active",
        allocated: 30000, spend: 28900, roas: 6.84, ctr: 5.3, cpm: 3.2, impressions: 600000, reach: 420000, clicks: 32100, conv: 410,
        adSets: [
            {
                id: "as3", name: "Cart_Abandoners_30D", status: "active", spend: 28900, impressions: 600000, reach: 420000, clicks: 32100, conv: 410, roas: 6.8, ctr: 5.3,
                ads: [
                    { id: "a4", name: "Dynamic_Catalog_C", status: "active", spend: 28900, impressions: 600000, clicks: 32100, conv: 410, roas: 6.8, ctr: 5.3 }
                ]
            }
        ]
    },
    {
        id: "c3",
        account_team: "C팀_세일즈",
        name: "Lookalike_Top10_Buyers",
        objective: "Conversion",
        status: "active",
        allocated: 35000, spend: 35800, roas: 8.45, ctr: 3.4, cpm: 4.1, impressions: 850000, reach: 680000, clicks: 29400, conv: 810,
        adSets: [
            {
                id: "as4", name: "LAL_HighValue_1%", status: "active", spend: 25000, impressions: 550000, reach: 450000, clicks: 20000, conv: 600, roas: 9.1, ctr: 3.6,
                ads: [
                    { id: "a5", name: "Video_Testimonial", status: "active", spend: 25000, impressions: 550000, clicks: 20000, conv: 600, roas: 9.1, ctr: 3.6 }
                ]
            },
            {
                id: "as5", name: "LAL_HighValue_3%", status: "active", spend: 10800, impressions: 300000, reach: 230000, clicks: 9400, conv: 210, roas: 6.2, ctr: 3.1,
                ads: [
                    { id: "a6", name: "Image_Promotional", status: "active", spend: 10800, impressions: 300000, clicks: 9400, conv: 210, roas: 6.2, ctr: 3.1 }
                ]
            }
        ]
    }
];

const generateTrendData = (days) => {
    return Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            awareness: Math.floor(6000 * (1 + Math.sin(i * 0.4) * 0.3)),
            consideration: Math.floor(4000 * (1 + Math.cos(i * 0.5) * 0.2)),
            conversion: Math.floor(9000 * (1 + Math.sin(i * 0.2) * 0.5)),
        };
    });
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "rgba(10, 15, 30, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                <p style={{ margin: "0 0 8px 0", color: "#fff", fontWeight: 700, fontSize: 13 }}>{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: entry.name.includes("Rev") ? "50%" : "2px", background: entry.color }} />
                        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{entry.name}:</span>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 12 }}>₩{Number(entry.value).toLocaleString()}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// -------------------------------------------------------------
// Component: Meta Hierarchical Performance Dashboard + Team Budget Dashboard
// -------------------------------------------------------------
export default function AccountPerformance() {

    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { isDemo, token } = useAuth();
    
    const [expandedCampaigns, setExpandedCampaigns] = useState({});
    const [expandedAdSets, setExpandedAdSets] = useState({});
    const [activeTab, setActiveTab] = useState('dashboard');

    const toggleCampaign = (id) => setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
    const toggleAdSet = (id) => setExpandedAdSets(prev => ({ ...prev, [id]: !prev[id] }));

    const chartData = useMemo(() => generateTrendData(14), []);
    
    
    
    const { demoAdCampaigns } = useGlobalData();


    const ACTIVE_META_DATA = useMemo(() => {
        let mapped = [];
        if (demoAdCampaigns && demoAdCampaigns.length > 0) {
            mapped = demoAdCampaigns.map((c, idx) => {
                const teams = [t("marketing.teamA") || "A팀_퍼포먼스", t("marketing.teamB") || "B팀_리타게팅", t("marketing.teamC") || "C팀_세일즈", t("marketing.teamD") || "D팀_브랜딩"];
                
                // CRITICAL FIX: Base values must match the keys in objAggregates ('Awareness', 'Consideration', 'Conversion')
                let objective = "Awareness";
                if (c.name?.includes("보습") || c.name?.includes("Traffic")) objective = "Consideration";
                if (c.name?.includes("프로모션") || c.name?.includes("Conversion") || c.name?.includes("세일")) objective = "Conversion";
                
                let tIdx = idx % teams.length;
                return {
                    ...c,
                    account_team: teams[tIdx],
                    objective: objective,
                    roas: typeof c.roas === 'string' ? parseFloat(c.roas.replace(/[^0-9.]/g, '')) : c.roas,
                    spend: c.spend,
                    allocated: c.budget ? (typeof c.budget === 'string' ? parseFloat(c.budget.replace(/[^0-9.]/g, '')) : c.budget) : (c.spend * 1.5),
                    adSets: c.adsets || []
                };
            });
        }
        
        // Force mapped translation on UI only, keep data logic clean
        const txMetaData = META_DATA.map(m => ({
            ...m,
            account_team: m.account_team?.includes("A팀") ? (t("marketing.teamA") || "A팀_퍼포먼스") :
                          m.account_team?.includes("B팀") ? (t("marketing.teamB") || "B팀_리타게팅") :
                          m.account_team?.includes("C팀") ? (t("marketing.teamC") || "C팀_세일즈") : m.account_team,
            objective: m.objective
        }));
        return [...mapped, ...txMetaData];
    }, [demoAdCampaigns, t]);

    // Aggregates by Objective
    const objAggregates = useMemo(() => {
        const agg = { Awareness: { spend: 0, roas: 0, count: 0 }, Consideration: { spend: 0, roas: 0, count: 0 }, Conversion: { spend: 0, roas: 0, count: 0 } };
        ACTIVE_META_DATA.forEach(c => {
            if(agg[c.objective]) {
                agg[c.objective].spend += c.spend;
                agg[c.objective].roas += c.roas;
                agg[c.objective].count++;
            }
        });
        Object.keys(agg).forEach(k => {
            if(agg[k].count > 0) agg[k].roas = agg[k].roas / agg[k].count;
        });
        return agg;
    }, []);

    // Team Budget Aggregates (Like BudgetPlanner)
    const teamBudget = useMemo(() => {
        return ACTIVE_META_DATA.map(c => ({
            team: c.account_team,
            allocated: c.allocated,
            spent: c.spend,
            remaining: c.allocated - c.spend,
            pace: c.spend > c.allocated ? "Overspend" : "On Track"
        }));
    }, []);

    const StatusBadge = ({ status }) => (
        <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', background: status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: status === 'active' ? '#22c55e' : '#f59e0b', border: `1px solid ${status === 'active' ? '#22c55e' : '#f59e0b'}30`}}>
            {status}
        </span>
    );

    return (
        <div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.4s' }}>
            <div className="hero" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.1))', position: 'relative' }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: '#4f8ef722', color: '#4f8ef7' }}>📘</div>
                    <div>
                        <div className="hero-title">{t('accountPerf.pageTitle') || 'Account(Team) Performance Analytics'}</div>
                        <div className="hero-desc">{t('accountPerf.pageSub') || 'Team & Account efficiency and budget view'}</div>
                    </div>
                </div>
                <div style={{ position: 'absolute', right: 24, top: 24, display: 'flex', gap: 8, background: "rgba(9,15,30,0.8)", borderRadius: 12, padding: 4, border: "1px solid rgba(99,140,255,0.1)" }}>
                    <button onClick={() => setActiveTab('dashboard')} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: activeTab === 'dashboard' ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: activeTab === 'dashboard' ? "#fff" : "var(--text-3)", transition: "all 150ms" }}>
                        {t('acctPerf.tabDashboard') || 'Visual Dashboard'}
                    </button>
                    <button onClick={() => setActiveTab('drilldown')} style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: activeTab === 'drilldown' ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: activeTab === 'drilldown' ? "#fff" : "var(--text-3)", transition: "all 150ms" }}>
                        {t('acctPerf.tabDrilldown') || 'Hierarchy Drill-down'}
                    </button>
                </div>
            </div>

            {/* Visual Dashboard Tab (Includes Budget Bar Chart + Objective Areas) */}
            {activeTab === 'dashboard' && (
                <div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.3s' }}>
                    
                    {/* TEAM BUDGET CHART (Requested by user) */}
                    <div className="card card-glass fade-up" style={{ padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📊 {t('accountPerf.teamDashboard') || "Team/Account Budget Dashboard"}</div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={teamBudget} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="team" stroke="rgba(255,255,255,0.3)" fontSize={12} fontWeight={700} />
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                                    <Bar dataKey="allocated" name={t('budget.allocated') || "Allocated"} fill="rgba(79,142,247,0.4)" radius={[4,4,0,0]} />
                                    <Bar dataKey="spent" name={t('budget.spent') || "Spent"} radius={[4,4,0,0]}>
                                        {teamBudget.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.spent > entry.allocated ? '#ef4444' : '#f97316'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Objectives Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        {[
                            { title: t('acctPerf.objectiveAwareness') || 'Awareness', obj: objAggregates.Awareness, color: '#4f8ef7' },
                            { title: t('acctPerf.objectiveConsideration') || 'Consideration', obj: objAggregates.Consideration, color: '#a855f7' },
                            { title: t('acctPerf.objectiveConversion') || 'Conversion', obj: objAggregates.Conversion, color: '#22c55e' }
                        ].map((col, idx) => (
                            <div key={col.title} className="card card-glass fade-up" style={{ padding: 24, borderTop: `2px solid ${col.color}`, animationDelay: `${idx*100}ms` }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: col.color, marginBottom: 12 }}>{col.title}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('acctPerf.kpiSpend') || 'Spend Limit Achieved'}</div>
                                        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{fmt(col.obj.spend, { prefix: '₩' })}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Avg ROAS</div>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: col.color }}>{col.obj.roas.toFixed(2)}x</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Meta Specific Graph */}
                    <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: "200ms" }}>
                         <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📈 {t('acctPerf.revenueTracking') || 'Objective Based Revenue Tracking'}</div>
                         <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAware" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.4}/><stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                                        <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={11} tickMargin={10} />
                                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, marginTop: 10 }} />
                                    <Area type="monotone" name={t('acctPerf.convRev') || 'Conversion Rev'} dataKey="conversion" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
                                    <Area type="monotone" name={t('acctPerf.awareRev') || 'Awareness Rev'} dataKey="awareness" stroke="#4f8ef7" strokeWidth={3} fillOpacity={1} fill="url(#colorAware)" />
                                    <Area type="monotone" name={t('acctPerf.consRev') || 'Consideration Rev'} dataKey="consideration" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorCons)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Drilldown Tab */}
            {activeTab === 'drilldown' && (
                <div className="card card-glass fade-up" style={{ padding: 0, overflow: 'hidden', animation: 'fadeIn 0.3s' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#4f8ef7' }}>Campaign ➔ Ad Set ➔ Ad (Deep Performance Hierarchy)</div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Expand any row to drill down into corresponding micro-level metrics immediately, without page loads.</div>
                    </div>

                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.01)' }}>
                            <tr>
                                <th style={{ padding: '14px 24px', textAlign: 'left', minWidth: 260 }}>Structure Name</th>
                                <th style={{ textAlign: 'center' }}>Team</th>
                                <th style={{ textAlign: 'center' }}>Status</th>
                                <th style={{ textAlign: 'right' }}>Spend</th>
                                <th style={{ textAlign: 'right' }}>ROAS</th>
                                <th style={{ textAlign: 'right' }}>Impressions</th>
                                <th style={{ textAlign: 'right' }}>Clicks</th>
                                <th style={{ textAlign: 'right' }}>CTR</th>
                                <th style={{ textAlign: 'right', paddingRight: 24 }}>Conv</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ACTIVE_META_DATA.map(campaign => (
                                <React.Fragment key={campaign.id}>
                                    <tr onClick={() => toggleCampaign(campaign.id)} style={{ cursor: 'pointer', background: expandedCampaigns[campaign.id] ? 'rgba(79,142,247,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '16px 24px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 10, color: '#4f8ef7' }}>{expandedCampaigns[campaign.id] ? '▼' : '▶'}</span>
                                            📁 {campaign.name}
                                            <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginLeft: 6 }}>{campaign.objective}</span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-2)' }}>{campaign.account_team}</td>
                                        <td style={{ textAlign: 'center' }}><StatusBadge status={campaign.status} /></td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#f97316' }}>{fmt(campaign.spend)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: campaign.roas >= 4 ? '#22c55e' : '#4f8ef7' }}>{campaign.roas.toFixed(2)}x</td>
                                        <td style={{ textAlign: 'right' }}>{campaign.impressions.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}>{campaign.clicks.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{campaign.ctr.toFixed(2)}%</td>
                                        <td style={{ textAlign: 'right', color: '#22c55e', paddingRight: 24 }}>{campaign.conv.toLocaleString()}</td>
                                    </tr>

                                    {expandedCampaigns[campaign.id] && campaign.adSets.map(adSet => (
                                        <React.Fragment key={adSet.id}>
                                            <tr onClick={() => toggleAdSet(adSet.id)} style={{ cursor: 'pointer', background: expandedAdSets[adSet.id] ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <td colSpan={2} style={{ padding: '14px 24px 14px 48px', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 10, color: '#a855f7' }}>{expandedAdSets[adSet.id] ? '▼' : '▶'}</span>
                                                    📦 {adSet.name}
                                                </td>
                                                <td style={{ textAlign: 'center' }}><StatusBadge status={adSet.status} /></td>
                                                <td style={{ textAlign: 'right', color: '#f97316' }}>{fmt(adSet.spend)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: adSet.roas >= 4 ? '#22c55e' : '#eab308' }}>{adSet.roas.toFixed(2)}x</td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{adSet.impressions.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{adSet.clicks.toLocaleString()}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-3)' }}>{adSet.ctr.toFixed(2)}%</td>
                                                <td style={{ textAlign: 'right', color: '#22c55e', paddingRight: 24, opacity: 0.9 }}>{adSet.conv.toLocaleString()}</td>
                                            </tr>

                                            {expandedAdSets[adSet.id] && adSet.ads.map(ad => (
                                                <tr key={ad.id} style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <td colSpan={2} style={{ padding: '12px 24px 12px 76px', fontSize: 13, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        &bull; 🖼️ {ad.name}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}><StatusBadge status={ad.status} /></td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'rgba(249,115,22,0.8)' }}>{fmt(ad.spend)}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: ad.roas >= 4 ? '#22c55e' : '#ef4444' }}>{ad.roas.toFixed(2)}x</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-3)' }}>{ad.impressions.toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-3)' }}>{ad.clicks.toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-3)' }}>{ad.ctr.toFixed(2)}%</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'rgba(34,197,94,0.8)', paddingRight: 24 }}>{ad.conv.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
