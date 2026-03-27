import React, { useEffect, useState, useMemo } from "react";
import { useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

import { useT } from '../i18n/index.js';
const MOCK_DATE = "2026.02.17 ~ 2026.03.18";


export default function AdStatusAnalysis() {
    
    const { t } = useI18n();
    const { isDemo, token } = useAuth();
    
    const METRICS = useMemo(() => [
        { id: 'impr', label: t("marketing.metricImpr"), color: '#a855f7', fmt: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v },
        { id: 'reach', label: t("marketing.metricReach"), color: '#6366f1', fmt: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v },
        { id: 'spend', label: t("marketing.metricSpend"), color: '#ef4444', fmt: v => '₩'+(v >= 1000 ? (v/1000).toFixed(0)+'K' : v) },
        { id: 'clicks', label: t("marketing.metricClicks"), color: '#3b82f6', fmt: v => v },
        { id: 'ctr', label: 'CTR (%)', color: '#14d9b0', fmt: v => v+'%' },
        { id: 'cpc', label: 'CPC', color: '#f59e0b', fmt: v => '₩'+v },
        { id: 'cpm', label: 'CPM', color: '#8b5cf6', fmt: v => '₩'+v },
        { id: 'conv', label: t("marketing.metricConv"), color: '#22c55e', fmt: v => v },
        { id: 'roas', label: 'ROAS (%)', color: '#ec4899', fmt: v => v+'%' }
    ], [t]);
    
    const GOAL_DATA = {
        awareness: { title: t("marketing.goalAware"), impr: '4,520,300', reach: '3,210,000', freq: 1.4, cpm: '₩1,850', cpr: '₩2,540', eff: 'Highly Efficient', spend: '₩8,362,555' },
        consideration: { title: t("marketing.goalCons"), impr: '2,150,000', reach: '1,450,000', clicks: '92,450', lp: '78,210', ctr: '4.3%', cpc: '₩310', cpm: '₩13,325', spend: '₩28,659,500' },
        conversion: { title: t("marketing.goalConv"), impr: '1,560,000', reach: '1,120,000', clicks: '58,200', ctr: '3.73%', cpc: '₩550', cpm: '₩20,512', conv: '4,285', cvr: '7.36%', cpa: '₩7,467', spend: '₩32,000,000' }
    };

    // 강제 분리 로직: 데모는 DEMO Data, 실제 사용자는 실 API Data (초기 빈 배열)
    const [realTrends, setRealTrends] = useState([]);
    const [realCampaigns, setRealCampaigns] = useState([]);
    const [loading, setLoading] = useState(!isDemo);

    useEffect(() => {
        if (isDemo) {
            setLoading(false);
            return;
        }
        // 실사용 시스템 API 연동 구현부
        fetch('/api/performance/meta-ads', { headers: { Authorization: `Bearer ${token}`} })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    setRealTrends(data.trends || []);
                    setRealCampaigns(data.campaigns || []);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isDemo, token]);

    const { demoAdCampaigns, demoDailyTrends, addDemoCampaign, setDemoGlobalKpi, setDemoBudget } = useGlobalData();

    const handleAddDemoCampaign = () => {
        if(!isDemo) return;
        const newCamp = {
            id: 'meta_c_' + Date.now(),
            name: t("marketing.demoNewCampPrefixOrigin") + new Date().toLocaleTimeString() + t("marketing.demoNewCampSuffixOrigin"),
            budget: '₩ 500,000,000',
            spend: 0,
            impr: 0,
            clicks: 0,
            cpa: '₩ 0',
            roas: '0.00%',
            status: 'mktStatActive',
            objective: 'Conversion',
            adsets: []
        };
        addDemoCampaign(newCamp);
        setDemoGlobalKpi(prev => ({ ...prev, totalSpend: prev.totalSpend + 500000000 }));
        setDemoBudget(prev => ({ ...prev, totalAllocated: prev.totalAllocated + 500000000, categories: prev.categories.map(c => c.name==='Social' ? {...c, value: c.value+500000000} : c) }));
        alert(t("marketing.demoAlertMsg"));
    };

    const DAILY_TRENDS = isDemo ? demoDailyTrends : realTrends;
    const HIERARCHY_DATA = isDemo ? demoAdCampaigns : realCampaigns;
    
    const [metric1, setMetric1] = useState('clicks');
    const [metric2, setMetric2] = useState('spend');
    const [tab, setTab] = useState('campaign');
    const [accountFilter, setAccountFilter] = useState('all');

    const m1Def = METRICS.find(m => m.id === metric1);
    const m2Def = METRICS.find(m => m.id === metric2);

    const getFlattenedSets = () => {
        const result = [];
        HIERARCHY_DATA.forEach(c => (c.adSets || c.adsets || []).forEach(s => result.push({ ...s, parent: c.name })));
        return result;
    };
    
    const borderLeftPurple = '2px solid #8b5cf6';
    const borderLeftBlue = '2px solid #3b82f6';
    const borderLeftGreen = '2px solid #22c55e';
    const highlightBlue = '3px solid #4f8ef7';
    const defaultTrans = '3px solid transparent';

    const tableData = tab === 'campaign' ? HIERARCHY_DATA : getFlattenedSets();
    const fmt = v => new Intl.NumberFormat('en-US').format(v);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            
            <div style={{ paddingBottom: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 24 }}>{t("marketing.adMetaDetailDesc")}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                    {t("marketing.adMetaDetailSub")}
                </div>
            </div>

            <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: "100ms" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>📈 {t("marketing.adMetaDynChart")}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m1Def.color }} />
                            <select value={metric1} onChange={e=>setMetric1(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                                {METRICS.map(m => <option key={m.id} value={m.id} style={{color: '#000'}}>{m.label}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m2Def.color }} />
                            <select value={metric2} onChange={e=>setMetric2(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                                {METRICS.map(m => <option key={m.id} value={m.id} style={{color: '#000'}}>{m.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: 40, marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: m1Def.color }}>{m1Def.label} ({t("marketing.totalLabel")})</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{m1Def.id === 'roas' || m1Def.id === 'ctr' ? m1Def.fmt(340) : m1Def.fmt(DAILY_TRENDS.reduce((a,b)=>a+Number(b[m1Def.id]), 0))}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: m2Def.color }}>{m2Def.label} ({t("marketing.totalLabel")})</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{m2Def.id === 'roas' || m2Def.id === 'ctr' ? m2Def.fmt(340) : m2Def.fmt(DAILY_TRENDS.reduce((a,b)=>a+Number(b[m2Def.id]), 0))}</div>
                    </div>
                </div>

                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={DAILY_TRENDS} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="color1" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={m1Def.color} stopOpacity={0.5}/>
                                    <stop offset="95%" stopColor={m1Def.color} stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="color2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={m2Def.color} stopOpacity={0.5}/>
                                    <stop offset="95%" stopColor={m2Def.color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="date" stroke="var(--text-3)" fontSize={11} tickMargin={10} />
                            <YAxis yAxisId="left" stroke={m1Def.color} fontSize={11} tickFormatter={m1Def.fmt} />
                            <YAxis yAxisId="right" orientation="right" stroke={m2Def.color} fontSize={11} tickFormatter={m2Def.fmt} />
                            <RechartsTooltip contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: '#fff' }} />
                            <Area yAxisId="left" type="monotone" name={m1Def.label} dataKey={m1Def.id} stroke={m1Def.color} strokeWidth={3} fillOpacity={1} fill="url(#color1)" />
                            <Area yAxisId="right" type="monotone" name={m2Def.label} dataKey={m2Def.id} stroke={m2Def.color} strokeWidth={3} fillOpacity={1} fill="url(#color2)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[GOAL_DATA.awareness, GOAL_DATA.consideration, GOAL_DATA.conversion].filter(Boolean).map((g, i) => (
                    <div key={i} className="card card-glass fade-up" style={{ padding: 24, animationDelay: (200 + i*100) + 'ms', borderTop: i===0 ? borderLeftPurple : i===1 ? borderLeftBlue : borderLeftGreen }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0', marginBottom: 16 }}>🎯 {g?.title}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-3)' }}>노출 (Impr)</span><span style={{ fontWeight: 700 }}>{g.impr}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-3)' }}>도달 (Reach)</span><span style={{ fontWeight: 700 }}>{g.reach}</span>
                            </div>
                            {g.freq && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-3)' }}>빈도</span><span style={{ fontWeight: 700 }}>{g.freq}</span></div>}
                            {g.clicks && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-3)' }}>클릭</span><span style={{ fontWeight: 700, color: '#3b82f6' }}>{g.clicks}</span></div>}
                            {g.ctr && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-3)' }}>CTR</span><span style={{ fontWeight: 700 }}>{g.ctr}</span></div>}
                            {g.cpc && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-3)' }}>CPC</span><span style={{ fontWeight: 700 }}>{g.cpc}</span></div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-3)' }}>CPM</span><span style={{ fontWeight: 700 }}>{g.cpm}</span>
                            </div>
                            {g.conv && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-3)' }}>전환 (Conv)</span><span style={{ fontWeight: 700, color: '#22c55e' }}>{g.conv}</span></div>}
                            {g.cpa && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text-3)' }}>CPA</span><span style={{ fontWeight: 700, color: '#f59e0b' }}>{g.cpa}</span></div>}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
                                <span style={{ color: 'var(--text-3)' }}>지출 비용 지표</span><span style={{ color: '#ef4444' }}>{g.spend}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card card-glass fade-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '500ms' }}>
                <div style={{ background: 'rgba(9,15,30,0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{color: '#4f8ef7'}}>📂</span> {t("marketing.adTableTitle")}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                                {t("marketing.adTableSub")}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>{t("marketing.adAccountFilter")}</div>
                            <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, outline: 'none' }}>
                                <option value="all" style={{color: '#000'}}>{t("marketing.adFilterAll")}</option>
                                <option value="sub1" style={{color: '#000'}}>{t("marketing.adFilterSub")}</option>
                            </select>
                {isDemo && (
                    <button onClick={handleAddDemoCampaign} style={{
                        padding: "8px 16px", borderRadius: "8px", border: "1px solid #7c3aed",
                        background: "rgba(124,58,237,0.1)", color: "#c4b5fd", fontWeight: "bold", fontSize: "12px", cursor: "pointer", marginLeft: "12px", transition: "all 0.2s"
                    }} onMouseOver={e => e.currentTarget.style.background = "rgba(124,58,237,0.3)"} onMouseOut={e => e.currentTarget.style.background = "rgba(124,58,237,0.1)"}>
                        {t("marketing.demoForceSyncBtn")}
                    </button>
                )}
    
                        </div>
                    </div>
                    <div style={{ display: 'flex', paddingLeft: 10 }}>
                        {[
                            { id: 'campaign', l: t("marketing.tabCamp") },
                            { id: 'adset',    l: t("marketing.tabAdset") }
                        ].map(tb => (
                            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                                padding: '12px 24px', fontSize: 13, fontWeight: 700, background: 'transparent',
                                color: tab === tb.id ? '#4f8ef7' : 'var(--text-3)', border: 'none',
                                borderBottom: tab === tb.id ? highlightBlue : defaultTrans,
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}>
                                {tb.l}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', margin: 0, whiteSpace: 'nowrap' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <tr>
                                <th style={{ padding: '12px 20px' }}>{t("marketing.colStatus")}</th>
                                <th style={{ padding: '12px' }}>{t("marketing.colItemName")}</th>
                                <th style={{ textAlign: 'right' }}>{t("marketing.colResultConv")}</th>
                                <th style={{ textAlign: 'right' }}>CPA</th>
                                <th style={{ textAlign: 'right' }}>{t("marketing.colSpend")}</th>
                                <th style={{ textAlign: 'right' }}>{t("marketing.colImpr")}</th>
                                <th style={{ textAlign: 'right', paddingRight: 20 }}>ROAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <input type="checkbox" />
                                            <span style={{ fontSize: 11, fontWeight: 700, color: row.status === 'mktStatActive' ? '#22c55e' : '#f59e0b' }}>
                                                {row.status === 'mktStatActive' ? t("marketing.statusActive") : t("marketing.statusOther")}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: 800, color: '#e2e8f0', minWidth: 250 }}>
                                        <div style={{ color: '#fff', fontSize: 13 }}>{row.name}</div>
                                        {row.parent && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{row.parent}</div>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#22c55e', fontFamily: 'monospace', fontWeight: 700 }}>
                                        {fmt(row.conv)} <span style={{fontSize:9, color:'var(--text-3)'}}>{t("marketing.purchaseWord")}</span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{row.cpa}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#f97316', fontFamily: 'monospace', fontWeight: 700 }}>₩{fmt(row.spend)}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(row.impr)}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', paddingRight: 20, color: '#14d9b0', fontWeight: 900 }}>{row.roas}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
