import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from "recharts";
import { Link } from 'react-router-dom';

import { useT } from '../i18n/index.js';
// Aggregate Data








export default function BudgetTrackerDashboard() {
    
    const { t } = useI18n();
    const { isDemo, token } = useAuth();
    
    const [realBudget, setRealBudget] = useState({ totalAllocated: 0, totalSpent: 0, balance: 0, burnRate: 0, categories: [] });
    const [realMonthly, setRealMonthly] = useState([]);
    const [realSuppliers, setRealSuppliers] = useState([]);
    const [realTable, setRealTable] = useState([]);

    useEffect(() => {
        if (isDemo) return;
        fetch('/api/finance/budget', { headers: { Authorization: `Bearer ${token}`} })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    setRealBudget(data.budget || realBudget);
                    setRealMonthly(data.monthly || []);
                    setRealSuppliers(data.suppliers || []);
                    setRealTable(data.table || []);
                }
            }).catch(() => {});
    }, [isDemo, token]);

    
    
    
    const { demoAdCampaigns, demoDailyTrends, demoBudget, demoChannels } = useGlobalData();

    // ✅ Virtual Data Sync: Fall back to demo data if the user's real budget is 0 or empty.
    const useMock = isDemo || (!realBudget?.totalAllocated && demoBudget);
    
    const MONTHLY_DATA = useMock ? (demoDailyTrends || []).slice(0, 12).map(d => ({ period: d.date, actual: d.spend, budget: d.budget })) : realMonthly;
    const SUPPLIERS_DATA = useMock ? (demoChannels || []).map(c => ({ name: c.name, spent: c.spend })).sort((a,b) => b.spent - a.spent) : realSuppliers;
    
    // 🔥 i18n translate pie categories 
    const translateCat = (name) => {
        if(name.includes('Performance')) return t('marketing.catPerformance') || 'Performance (Meta/Google)';
        if(name.includes('Brand Awareness')) return t('marketing.catBrand') || 'Brand Awareness (YouTube)';
        if(name.includes('Retargeting')) return t('marketing.catRetargeting') || 'Retargeting (Kakao/Naver)';
        if(name.includes('Influencer')) return t('marketing.catInfluencer') || 'Influencer/UGC';
        return name;
    };
    
    const PIE_DATA = (useMock ? (demoBudget?.categories || []) : (realBudget?.categories || [])).map(c => ({
        ...c,
        name: translateCat(c.name)
    }));
    
    const TABLE_DATA = useMock ? (demoAdCampaigns || []).map(c => {
        const impr = c.impr || c.totalImpressions || 0;
        const click = c.clicks || c.totalClicks || 0;
        const bgt = typeof c.budget === 'string' ? (parseInt(c.budget.replace(/[^0-9]/g, '')) || 0) : (c.budget || 0);
        const spend = typeof c.spend !== 'undefined' ? c.spend : bgt;
        const roi = typeof c.roas !== 'undefined' ? String(c.roas).replace('%','') : (c.estimatedRoas || c.roi || 0);
        return { 
            campaign: c.name, impr, click, 
            ctr: impr ? ((click/impr)*100).toFixed(2) : 0, 
            budget: bgt, spend, 
            profit: bgt - spend > 0 ? bgt - spend : 0, 
            cpc: click ? Math.round(spend/click) : 0, 
            cpa: c.cpa || c.totalConversions || 0, 
            roi 
        };
    }) : realTable;

    const totalActual = useMock ? (demoBudget?.totalSpent || 0) : (realBudget?.totalSpent || 0);
    const totalBudget = useMock ? (demoBudget?.totalAllocated || 0) : (realBudget?.totalAllocated || 0);
    const totalProfit = useMock ? (demoBudget?.balance || 0) : (realBudget?.balance || 0);
    const achievementScore = useMock ? (demoBudget?.burnRate || 0) : (realBudget?.burnRate || 0);
    
    const { fmt } = useCurrency();
    const [periodMode, setPeriodMode] = useState("monthly");

                const yoyChange = 0.2;
    
    return (
        <div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.4s' }}>
            <div className="hero" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.05))', position: 'relative' }}>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: '#4f8ef722', color: '#4f8ef7' }}>💰</div>
                    <div>
                        <div className="hero-title">{t('marketing.budgetTrackTitle') || "예산 트래킹 대시보드"}</div>
                        <div className="hero-desc">
                            {t('marketing.budgetTrackSub') || "일자/월별 지출 추이 및 매체별 예산 소진율"} 
                            {" "}
                            {useMock ? (t('marketing.demoModeLabel') || '(Dr.Jart+ 데모 모드)') : (t('marketing.realModeLabel') || '(운영 데이터 모드)')}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 16 }}>
                <div className="card card-glass fade-up" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('marketing.bgSummaryBudget') || "총 예산"}</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#4f8ef7' }}>{fmt(totalBudget, { prefix: '₩' })}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('marketing.bgSummaryActual') || "총 지출금액"}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#f97316' }}>{fmt(totalActual, { prefix: '₩' })}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', marginBottom: 6 }}>{t('marketing.bgSummaryProfit') || "설정 예산 대비 남은 한도"}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#22c55e' }}>{fmt(totalProfit, { prefix: '₩' })}</div>
                    </div>
                </div>

                <div className="card card-glass fade-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animationDelay: '100ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 20 }}>{t('marketing.bgAchievePct') || "예산 달성율 (Budget Achievement)"}</div>
                    <div style={{ width: '100%', height: 200, position: 'relative' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={[{value: achievementScore}, {value: 100 - achievementScore}]} innerRadius={65} outerRadius={85} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                                    <Cell fill="#0ea5e9" />
                                    <Cell fill="rgba(255,255,255,0.05)" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{achievementScore}%</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('marketing.bgBurnRateLabel') || 'Burn Rate'}</div>
                        </div>
                    </div>
                </div>

                <div className="card card-glass fade-up" style={{ padding: '24px', animationDelay: '200ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 20 }}>{t('marketing.bgCategoryAlloc') || '카테고리 할당 (Category Allocation)'}</div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ width: '50%', height: 200 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={70} dataKey="value" stroke="none" labelLine={false} />
                                    <RechartsTooltip contentStyle={{ background: 'rgba(9,15,30,0.9)', border: 'none', borderRadius: 8, color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {PIE_DATA.map((d, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{width: 8, height: 8, borderRadius: '50%', background: d.color}}/> {d.name}</div>
                                        <div style={{ fontWeight: 800 }}>{d.value}%</div>
                                    </div>
                                    <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                                        <div style={{ width: `${d.value}%`, height: '100%', background: d.color, borderRadius: 2 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '300ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 20 }}>{t('marketing.bgKpiActualVsBudget') || "결과 대비 예산 추이 (Budget vs Actual)"}</div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="period" stroke="rgba(255,255,255,0.3)" fontSize={11} fontWeight={700} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(0)+'K' : v} />
                                <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: 'rgba(9,15,30,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                                <Bar dataKey="actual" name={t('marketing.bgBarActualSpend') || 'Actual Spend'} fill="#0ea5e9" radius={[4,4,0,0]} />
                                <Bar dataKey="budget" name={t('marketing.bgBarSetBudget') || 'Set Budget'} fill="#fb7185" radius={[4,4,0,0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: '400ms' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 20 }}>{t('marketing.bgKpiTopChan') || "최상위 매체별 브랜드 지출 요약"}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {SUPPLIERS_DATA.map((s, i) => {
                            const max = SUPPLIERS_DATA[0].spent;
                            const pct = (s.spent / max) * 100;
                            return (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                        <div style={{ color: '#fff', fontWeight: 600 }}>{s.name}</div>
                                        <div style={{ color: '#f59e0b', fontWeight: 800 }}>₩{fmt(s.spent)}</div>
                                    </div>
                                    <div style={{ width: '100%', height: 6, background: 'rgba(245,158,11,0.1)', borderRadius: 3 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: '#f59e0b', borderRadius: 3 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="card card-glass fade-up" style={{ padding: 0, animationDelay: '500ms', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>{t('marketing.bgTableCampaign') || "대분류 캠페인당 예산 대비 ROI 상세 추적"}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', whiteSpace: 'nowrap', margin: 0 }}>
                        <thead style={{ background: 'rgba(255,255,255,0.01)' }}>
                            <tr>
                                <th style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--text-3)' }}>{t("marketing.bgColCampSum") || "캠페인 요약"}</th>
                                <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColImpr') || "노출"}</th>
                                <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColCtr') || "CTR(%)"}</th>
                                <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColBudget') || "설정 예산"}</th>
                                <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColSpend') || "실제 지출"}</th>
                                <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColProfit') || "투자 대비 남은수익"}</th>
                                <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColCpc') || "CPC"}</th>
                                <th style={{ textAlign: 'right', color: 'var(--text-3)' }}>{t('marketing.bgColCpa') || "CPA"}</th>
                                <th style={{ paddingRight: 24, textAlign: 'right', color: '#14d9b0' }}>{t('marketing.bgColRoi') || "투자 수익률(ROI)"}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TABLE_DATA.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '12px 24px', fontWeight: 800, color: '#e2e8f0' }}>{row.campaign}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{(row.impr||0).toLocaleString()}</td>
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