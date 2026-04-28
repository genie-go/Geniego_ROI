import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from "../i18n/index.js";
import { useCurrency } from "../contexts/CurrencyContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useAuth } from "../auth/AuthContext";
import { useSecurityGuard } from "../security/SecurityGuard.js";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import AIRecommendBanner from "../components/AIRecommendBanner.jsx";

/* ─── i18n keys with inline fallbacks ─── */
const T = {
  pageTitle: ['budgetTracker.pageTitle', 'Budget Tracker'],
  pageSub: ['budgetTracker.pageSub', 'Real-time ad budget consumption & optimization tracking'],
  tabOverview: ['budgetTracker.tabOverview', 'Overview'],
  tabAllocation: ['budgetTracker.tabAllocation', 'Allocation'],
  tabBurnRate: ['budgetTracker.tabBurnRate', 'Burn Rate'],
  tabAlerts: ['budgetTracker.tabAlerts', 'Alerts'],
  tabGuide: ['budgetTracker.tabGuide', 'Guide'],
  totalBudget: ['budgetTracker.totalBudget', 'Total Budget'],
  totalSpent: ['budgetTracker.totalSpent', 'Total Spent'],
  remaining: ['budgetTracker.remaining', 'Remaining'],
  burnRate: ['budgetTracker.burnRate', 'Daily Burn Rate'],
  utilization: ['budgetTracker.utilization', 'Utilization'],
  avgDaily: ['budgetTracker.avgDaily', 'Avg Daily Spend'],
  projectedEnd: ['budgetTracker.projectedEnd', 'Projected End Date'],
  daysLeft: ['budgetTracker.daysLeft', 'Days Left'],
  campaigns: ['budgetTracker.campaigns', 'Campaigns'],
  campaignName: ['budgetTracker.campaignName', 'Campaign Name'],
  budget: ['budgetTracker.budget', 'Budget'],
  spent: ['budgetTracker.spent', 'Spent'],
  status: ['budgetTracker.status', 'Status'],
  progress: ['budgetTracker.progress', 'Progress'],
  velocity: ['budgetTracker.velocity', 'Velocity'],
  onTrack: ['budgetTracker.onTrack', 'On Track'],
  overBudget: ['budgetTracker.overBudget', 'Over Budget'],
  underSpend: ['budgetTracker.underSpend', 'Under Spend'],
  noCampaigns: ['budgetTracker.noCampaigns', 'No campaigns found. Create a campaign in Campaign Manager to start tracking.'],
  channelAlloc: ['budgetTracker.channelAlloc', 'Channel Allocation'],
  channelAllocDesc: ['budgetTracker.channelAllocDesc', 'Budget distribution across advertising channels'],
  dailyTrend: ['budgetTracker.dailyTrend', 'Daily Spending Trend'],
  dailyTrendDesc: ['budgetTracker.dailyTrendDesc', 'Track daily spending and budget consumption velocity'],
  cumulative: ['budgetTracker.cumulative', 'Cumulative Spend'],
  daily: ['budgetTracker.daily', 'Daily Spend'],
  budgetLine: ['budgetTracker.budgetLine', 'Budget Line'],
  alertTitle: ['budgetTracker.alertTitle', 'Budget Alerts'],
  alertDesc: ['budgetTracker.alertDesc', 'Automated alerts based on budget thresholds and anomalies'],
  alertOver80: ['budgetTracker.alertOver80', 'Over 80% Budget Used'],
  alertOver100: ['budgetTracker.alertOver100', 'Budget Exceeded'],
  alertLowVelocity: ['budgetTracker.alertLowVelocity', 'Low Spending Velocity'],
  alertHighVelocity: ['budgetTracker.alertHighVelocity', 'High Spending Velocity'],
  noAlerts: ['budgetTracker.noAlerts', 'No alerts at this time. All campaigns are within budget.'],
  guideTitle: ['budgetTracker.guideTitle', 'Budget Tracker Guide'],
  guideSub: ['budgetTracker.guideSub', 'Learn how to optimize your advertising budget management'],
  guideStep1Title: ['budgetTracker.guideStep1Title', 'Set Budgets'],
  guideStep1Desc: ['budgetTracker.guideStep1Desc', 'Define monthly/campaign budgets in Campaign Manager'],
  guideStep2Title: ['budgetTracker.guideStep2Title', 'Monitor Spending'],
  guideStep2Desc: ['budgetTracker.guideStep2Desc', 'Track real-time spending velocity and burn rate'],
  guideStep3Title: ['budgetTracker.guideStep3Title', 'Set Alerts'],
  guideStep3Desc: ['budgetTracker.guideStep3Desc', 'Configure automated alerts for budget thresholds'],
  guideStep4Title: ['budgetTracker.guideStep4Title', 'Optimize'],
  guideStep4Desc: ['budgetTracker.guideStep4Desc', 'Reallocate budgets based on performance data'],
  guideStep5Title: ['budgetTracker.guideStep5Title', 'Analyze KPI Cards'],
  guideStep5Desc: ['budgetTracker.guideStep5Desc', 'Check the 6 KPI cards at the top of the Overview tab: Total Budget, Total Spent, Remaining, Utilization, Avg Daily Spend, and Days Left. Card colors indicate status — green is normal, orange is caution, red needs immediate action.'],
  guideStep6Title: ['budgetTracker.guideStep6Title', 'Check Channel Allocation'],
  guideStep6Desc: ['budgetTracker.guideStep6Desc', 'In the Allocation tab, use the pie chart to visualize budget distribution across channels. Compare spending ratios for Meta, Google, TikTok, etc.'],
  guideStep7Title: ['budgetTracker.guideStep7Title', 'Analyze Burn Rate Charts'],
  guideStep7Desc: ['budgetTracker.guideStep7Desc', 'In the Burn Rate tab, review the 21-day daily spend bar chart and cumulative spend vs budget line area chart. If cumulative spend crosses the budget line, you risk overspending.'],
  guideStep8Title: ['budgetTracker.guideStep8Title', 'Respond to Alerts'],
  guideStep8Desc: ['budgetTracker.guideStep8Desc', 'Check auto-detected budget warnings in the Alerts tab. 🚨 Red = budget exceeded (100%+), ⚠️ Orange = warning (80%+), 🐌 Blue = low spending detected.'],
  guideStep9Title: ['budgetTracker.guideStep9Title', 'Reallocate Budgets'],
  guideStep9Desc: ['budgetTracker.guideStep9Desc', 'Reduce budget for low-performing campaigns and reallocate to high-ROAS campaigns. Changes in Campaign Manager are reflected in Budget Tracker in real-time.'],
  guideStep10Title: ['budgetTracker.guideStep10Title', 'Regular Monitoring'],
  guideStep10Desc: ['budgetTracker.guideStep10Desc', 'Make checking Budget Tracker a daily morning habit. Watch the daily trends in Burn Rate to ensure spending follows your plan.'],
  guideBeginnerBadge: ['budgetTracker.guideBeginnerBadge', 'Beginner Guide'],
  guideTimeBadge: ['budgetTracker.guideTimeBadge', '5 min read'],
  guideLangBadge: ['budgetTracker.guideLangBadge', '12 Languages'],
  guideWhereToStart: ['budgetTracker.guideWhereToStart', 'Where do I start?'],
  guideWhereToStartDesc: ['budgetTracker.guideWhereToStartDesc', '1. Go to AI Marketing → Campaign Manager to create a campaign. 2. Set a budget — it auto-syncs to Budget Tracker. 3. Return to Budget Planner to see real-time status. 4. Use sub-tabs to analyze from different angles.'],
  guideStepsTitle: ['budgetTracker.guideStepsTitle', 'Step-by-Step Guide (10 Steps)'],
  guideTabsTitle: ['budgetTracker.guideTabsTitle', 'Tab-by-Tab Reference'],
  guideTabOverviewName: ['budgetTracker.guideTabOverviewName', '📊 Overview'],
  guideTabOverviewDesc: ['budgetTracker.guideTabOverviewDesc', 'View 6 KPI cards, campaign budget table, and projected end date at a glance.'],
  guideTabAllocationName: ['budgetTracker.guideTabAllocationName', '🥧 Allocation'],
  guideTabAllocationDesc: ['budgetTracker.guideTabAllocationDesc', 'Visualize channel budget distribution with pie chart.'],
  guideTabBurnRateName: ['budgetTracker.guideTabBurnRateName', '🔥 Burn Rate'],
  guideTabBurnRateDesc: ['budgetTracker.guideTabBurnRateDesc', '21-day daily spend bar chart and cumulative vs budget area chart.'],
  guideTabAlertsName: ['budgetTracker.guideTabAlertsName', '🔔 Alerts'],
  guideTabAlertsDesc: ['budgetTracker.guideTabAlertsDesc', 'Auto-alerts for 80%+ warning, 100%+ critical, low spending detection.'],
  guideTabGuideName: ['budgetTracker.guideTabGuideName', '📖 Guide'],
  guideTabGuideDesc: ['budgetTracker.guideTabGuideDesc', 'This comprehensive guide with 10 steps, tab reference, tips, and FAQ.'],
  guideTipsTitle: ['budgetTracker.guideTipsTitle', 'Expert Tips'],
  guideTip1: ['budgetTracker.guideTip1', 'When utilization exceeds 80%, immediately adjust budgets in Campaign Manager. Overspending drastically reduces ROAS.'],
  guideTip2: ['budgetTracker.guideTip2', 'A 40% spending decrease on weekends is normal. Weekend low-spend alerts can be safely ignored.'],
  guideTip3: ['budgetTracker.guideTip3', 'If cumulative spend stays below the budget line, consider allocating more to high-performing channels.'],
  guideTip4: ['budgetTracker.guideTip4', 'Allow 3 days for data accumulation after campaign launch. Do not judge overall burn rate from this initial period.'],
  guideTip5: ['budgetTracker.guideTip5', 'Create a Monday morning routine: review last week burn rate and reallocate weekly budgets as needed.'],
  guideFaqTitle: ['budgetTracker.guideFaqTitle', 'Frequently Asked Questions'],
  guideFaq1Q: ['budgetTracker.guideFaq1Q', 'No campaigns appear in Budget Tracker'],
  guideFaq1A: ['budgetTracker.guideFaq1A', 'You need to create campaigns first in Campaign Manager. Go to AI Marketing → Campaign Manager, create a new campaign with a budget, and it will auto-sync.'],
  guideFaq2Q: ['budgetTracker.guideFaq2Q', 'Utilization is 0% but spending is occurring'],
  guideFaq2A: ['budgetTracker.guideFaq2A', 'The campaign Budget field may not be set. Enter the budget amount in Campaign Manager and utilization will calculate correctly.'],
  guideFaq3Q: ['budgetTracker.guideFaq3Q', 'Too many alerts are firing'],
  guideFaq3A: ['budgetTracker.guideFaq3A', '80% warnings are a core budget management feature. If you get too many, consider increasing total budget or pausing low-efficiency campaigns.'],
  guideFaq4Q: ['budgetTracker.guideFaq4Q', 'Channel allocation chart only shows Other'],
  guideFaq4A: ['budgetTracker.guideFaq4A', 'Campaigns without assigned ad channels are classified as Other. Assign channels (Meta, Google, etc.) in Campaign Manager for accurate analysis.'],
  guideFaq5Q: ['budgetTracker.guideFaq5Q', 'Is data updated in real-time?'],
  guideFaq5A: ['budgetTracker.guideFaq5A', 'Yes, Budget Tracker syncs in real-time via GlobalDataContext. Changes in Campaign Manager are reflected instantly without page refresh.'],
  guideReadyTitle: ['budgetTracker.guideReadyTitle', 'Ready! Start tracking your budget'],
  guideReadyDesc: ['budgetTracker.guideReadyDesc', 'Click the Overview tab above to check campaign budget status. If no campaigns exist, create one in Campaign Manager first.'],
};

/* ─── Channel Colors ─── */
const CHANNEL_COLORS = {
  meta: { name: 'Meta Ads', color: '#4f8ef7', icon: '📘' },
  google: { name: 'Google Ads', color: '#ea4335', icon: '🔍' },
  tiktok: { name: 'TikTok Ads', color: '#010101', icon: '🎵' },
  naver: { name: 'Naver Ads', color: '#03cf5d', icon: '🟢' },
  kakao: { name: 'Kakao Ads', color: '#fee500', icon: '💬' },
  instagram: { name: 'Instagram', color: '#e4405f', icon: '📸' },
  other: { name: 'Other', color: '#94a3b8', icon: '📊' },
};
const PIE_COLORS = ['#4f8ef7', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#06b6d4'];

/* ─── Helper: translate with fallback ─── */
const useTr = () => {
  const { t } = useI18n();
  return useCallback((key) => {
    const def = T[key];
    if (!def) return key;
    return t(def[0], def[1]);
  }, [t]);
};

/* ─── Overview Tab ─── */
function OverviewTab({ campaigns, tr, fmt }) {
  const totalBudget = useMemo(() => campaigns.reduce((s, c) => s + (c.budget || c.spent || 0), 0), [campaigns]);
  const totalSpent = useMemo(() => campaigns.reduce((s, c) => s + (c.spent || 0), 0), [campaigns]);
  const remaining = totalBudget - totalSpent;
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget * 100) : 0;

  const avgDaily = useMemo(() => {
    if (campaigns.length === 0) return 0;
    const now = Date.now();
    let totalDays = 0;
    campaigns.forEach(c => {
      const start = new Date(c.startDate || c.createdAt || now).getTime();
      const days = Math.max(1, Math.ceil((now - start) / 86400000));
      totalDays += days;
    });
    return totalDays > 0 ? totalSpent / (totalDays / campaigns.length) : 0;
  }, [campaigns, totalSpent]);

  const daysLeft = avgDaily > 0 ? Math.ceil(remaining / avgDaily) : Infinity;
  const projectedEnd = daysLeft < Infinity && daysLeft > 0
    ? new Date(Date.now() + daysLeft * 86400000).toISOString().slice(0, 10)
    : '—';

  const getUtilColor = (pct) => pct > 100 ? '#ef4444' : pct > 80 ? '#f97316' : pct > 50 ? '#eab308' : '#22c55e';

  if (campaigns.length === 0) {
    return (
      <div className="card card-glass" style={{ padding: 60, textAlign: 'center', color: '#1e293b' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>{tr('noCampaigns')}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 0.4s' }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {[
          { label: tr('totalBudget'), value: fmt(totalBudget), color: '#4f8ef7', icon: '💰' },
          { label: tr('totalSpent'), value: fmt(totalSpent), color: '#f97316', icon: '🔥' },
          { label: tr('remaining'), value: fmt(remaining), color: remaining >= 0 ? '#22c55e' : '#ef4444', icon: '💵' },
          { label: tr('utilization'), value: `${utilization.toFixed(1)}%`, color: getUtilColor(utilization), icon: '📊' },
          { label: tr('avgDaily'), value: fmt(Math.round(avgDaily)), color: '#a855f7', icon: '📈' },
          { label: tr('daysLeft'), value: daysLeft < Infinity ? `${daysLeft}d` : '∞', color: daysLeft < 7 ? '#ef4444' : '#06b6d4', icon: '⏳' },
        ].map((kpi, i) => (
          <div key={i} className="card card-glass" style={{ padding: 18, borderLeft: `3px solid ${kpi.color}`, color: '#1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</span>
              <span style={{ fontSize: 18 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Campaign Budget Table */}
      <div className="card card-glass" style={{ padding: 0, overflow: 'hidden', color: '#1e293b' }}>
        <div style={{ padding: '16px 20px', fontWeight: 800, fontSize: 15, borderBottom: '1px solid rgba(0,0,0,0.06)', color: '#1e293b' }}>
          📋 {tr('campaigns')}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', margin: 0 }}>
            <thead style={{ background: 'rgba(241,245,249,0.7)' }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left' }}>{tr('campaignName')}</th>
                <th style={{ textAlign: 'right' }}>{tr('budget')}</th>
                <th style={{ textAlign: 'right' }}>{tr('spent')}</th>
                <th style={{ textAlign: 'right' }}>{tr('remaining')}</th>
                <th style={{ textAlign: 'center', minWidth: 140 }}>{tr('progress')}</th>
                <th style={{ textAlign: 'center', paddingRight: 16 }}>{tr('status')}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => {
                const bud = c.budget || c.spent || 1;
                const sp = c.spent || 0;
                const pct = Math.min(100, (sp / bud) * 100);
                const rem = bud - sp;
                const statusColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#22c55e';
                const statusText = pct >= 100 ? tr('overBudget') : pct >= 80 ? tr('onTrack') : tr('underSpend');
                return (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1e293b' }}>{c.name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#334155' }}>{fmt(bud)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#f97316' }}>{fmt(sp)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: rem >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(rem)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(99,140,255,0.08)' }}>
                          <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${statusColor}, ${statusColor}cc)`, transition: 'width 0.6s' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, minWidth: 38, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', paddingRight: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}30` }}>{statusText}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Projected End */}
      <div className="card card-glass" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, color: '#1e293b' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: '#1e293b' }}>📅 {tr('projectedEnd')}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{tr('avgDaily')}: {fmt(Math.round(avgDaily))}</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: daysLeft < 7 ? '#ef4444' : '#4f8ef7' }}>{projectedEnd}</div>
      </div>
    </div>
  );
}

/* ─── Allocation Tab ─── */
function AllocationTab({ campaigns, tr, fmt }) {
  const channelData = useMemo(() => {
    const map = {};
    campaigns.forEach(c => {
      const chId = c.adChannels?.[0]?.id?.split('_')?.[0] || 'other';
      const key = CHANNEL_COLORS[chId] ? chId : 'other';
      if (!map[key]) map[key] = { ...CHANNEL_COLORS[key], budget: 0, spent: 0 };
      map[key].budget += (c.budget || c.spent || 0);
      map[key].spent += (c.spent || 0);
    });
    return Object.entries(map).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.spent - a.spent);
  }, [campaigns]);

  const pieData = channelData.map(d => ({ name: d.name, value: d.spent }));
  const totalSpent = channelData.reduce((s, d) => s + d.spent, 0);

  if (campaigns.length === 0) {
    return <div className="card card-glass" style={{ padding: 60, textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>{tr('noCampaigns')}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 0.4s' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,1fr) 1fr', gap: 18 }}>
        {/* Pie Chart */}
        <div className="card card-glass" style={{ padding: 20, color: '#1e293b' }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: '#1e293b' }}>🥧 {tr('channelAlloc')}</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, color: '#1e293b', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="card card-glass" style={{ padding: 20, color: '#1e293b' }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: '#1e293b' }}>📊 {tr('channelAllocDesc')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {channelData.map((ch, i) => {
              const pct = totalSpent > 0 ? (ch.spent / totalSpent * 100) : 0;
              return (
                <div key={ch.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{ch.icon} {ch.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: PIE_COLORS[i % PIE_COLORS.length] }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(99,140,255,0.08)' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{tr('spent')}: {fmt(ch.spent)}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{tr('budget')}: {fmt(ch.budget)}</span>
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

/* ─── Burn Rate Tab ─── */
function BurnRateTab({ campaigns, tr, fmt }) {
  const { isDemoMode } = useAuth();
  const totalBudget = useMemo(() => campaigns.reduce((s, c) => s + (c.budget || c.spent || 0), 0), [campaigns]);
  const totalSpent = useMemo(() => campaigns.reduce((s, c) => s + (c.spent || 0), 0), [campaigns]);

  const trendData = useMemo(() => {
    const days = 21;
    const data = [];
    const seed = (n) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;
    let cumulative = 0;
    const dailyAvg = totalSpent / days;

    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      const dateStr = d.toISOString().slice(5, 10);
      const dow = d.getDay();
      const wf = (dow === 0 || dow === 6) ? 0.6 : 1.0;
      const noise = isDemoMode ? (seed(i * 7 + 3) - 0.5) * 0.4 : 0;
      const daily = Math.max(0, Math.round(dailyAvg * wf * (1 + noise)));
      cumulative += daily;
      data.push({ date: dateStr, daily, cumulative, budget: Math.round(totalBudget / days * (i + 1)) });
    }
    return data;
  }, [totalSpent, totalBudget, isDemoMode]);

  if (campaigns.length === 0) {
    return <div className="card card-glass" style={{ padding: 60, textAlign: 'center', fontSize: 14, color: '#94a3b8' }}>{tr('noCampaigns')}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 0.4s' }}>
      {/* Daily Trend Chart */}
      <div className="card card-glass" style={{ padding: 20, color: '#1e293b' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: '#1e293b' }}>📈 {tr('dailyTrend')}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>{tr('dailyTrendDesc')}</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 10, height: 10, borderRadius: 2, background: '#f97316', fontSize: 11, fontWeight: 700, color: '#f97316' }} ><div /><span>{tr('daily')}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 10, height: 10, borderRadius: '50%', background: '#4f8ef7', fontSize: 11, fontWeight: 700, color: '#4f8ef7' }} ><div /><span>{tr('cumulative')}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 10, height: 3, background: '#22c55e', fontSize: 11, fontWeight: 700, color: '#22c55e' }} ><div /><span>{tr('budgetLine')}</span></div>
        </div>
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="gradCumBudget" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3} /><stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.08)" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v} />
              <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, color: '#1e293b', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} formatter={(v) => fmt(v)} />
              <Bar dataKey="daily" fill="#f97316" radius={[4, 4, 0, 0]} opacity={0.85} name={tr('daily')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cumulative Area Chart */}
      <div className="card card-glass" style={{ padding: 20, color: '#1e293b' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: '#1e293b' }}>📊 {tr('cumulative')} vs {tr('budgetLine')}</div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.08)" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v} />
              <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, color: '#1e293b', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }} formatter={(v) => fmt(v)} />
              <Area type="monotone" dataKey="cumulative" stroke="#4f8ef7" strokeWidth={2.5} fill="url(#gradCumBudget)" name={tr('cumulative')} />
              <Area type="monotone" dataKey="budget" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 3" fill="none" name={tr('budgetLine')} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─── Alerts Tab ─── */
function AlertsTab({ campaigns, tr, fmt }) {
  const alerts = useMemo(() => {
    const a = [];
    campaigns.forEach(c => {
      const bud = c.budget || c.spent || 1;
      const sp = c.spent || 0;
      const pct = (sp / bud) * 100;
      if (pct >= 100) a.push({ type: 'critical', label: tr('alertOver100'), campaign: c.name, pct, color: '#ef4444', icon: '🚨' });
      else if (pct >= 80) a.push({ type: 'warning', label: tr('alertOver80'), campaign: c.name, pct, color: '#f97316', icon: '⚠️' });
      if (pct < 30 && sp > 0) a.push({ type: 'info', label: tr('alertLowVelocity'), campaign: c.name, pct, color: '#06b6d4', icon: '🐌' });
    });
    return a.sort((x, y) => y.pct - x.pct);
  }, [campaigns, tr]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, animation: 'fadeIn 0.4s' }}>
      <div className="card card-glass" style={{ padding: 20, color: '#1e293b' }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, color: '#1e293b' }}>🔔 {tr('alertTitle')}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 18 }}>{tr('alertDesc')}</div>
        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{tr('noAlerts')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((al, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: al.color + '08', border: `1px solid ${al.color}25`, borderLeft: `4px solid ${al.color}` }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{al.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: al.color }}>{al.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{al.campaign} — {al.pct.toFixed(1)}% {tr('utilization')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Guide Tab (Comprehensive Beginner Manual) ─── */
function GuideTab({ tr }) {
  const steps = [
    { n: '1️⃣', k: 'guideStep1', c: '#4f8ef7', icon: '🎯' },
    { n: '2️⃣', k: 'guideStep2', c: '#22c55e', icon: '📊' },
    { n: '3️⃣', k: 'guideStep3', c: '#a855f7', icon: '🔔' },
    { n: '4️⃣', k: 'guideStep4', c: '#f59e0b', icon: '⚡' },
    { n: '5️⃣', k: 'guideStep5', c: '#ec4899', icon: '📈' },
    { n: '6️⃣', k: 'guideStep6', c: '#06b6d4', icon: '🥧' },
    { n: '7️⃣', k: 'guideStep7', c: '#84cc16', icon: '🔥' },
    { n: '8️⃣', k: 'guideStep8', c: '#f97316', icon: '🚨' },
    { n: '9️⃣', k: 'guideStep9', c: '#6366f1', icon: '💡' },
    { n: '🔟', k: 'guideStep10', c: '#14b8a6', icon: '🔄' },
  ];

  const tabRefs = [
    { k: 'guideTabOverview', c: '#4f8ef7', icon: '📊' },
    { k: 'guideTabAllocation', c: '#a855f7', icon: '🥧' },
    { k: 'guideTabBurnRate', c: '#f97316', icon: '🔥' },
    { k: 'guideTabAlerts', c: '#ef4444', icon: '🔔' },
    { k: 'guideTabGuide', c: '#06b6d4', icon: '📖' },
  ];

  const tips = [
    { k: 'guideTip1', icon: '💡' },
    { k: 'guideTip2', icon: '⚠️' },
    { k: 'guideTip3', icon: '📉' },
    { k: 'guideTip4', icon: '🎯' },
    { k: 'guideTip5', icon: '🔄' },
  ];

  const faqs = [
    { k: 'guideFaq1' },
    { k: 'guideFaq2' },
    { k: 'guideFaq3' },
    { k: 'guideFaq4' },
    { k: 'guideFaq5' },
  ];

  return (
    <div className="guide-section" style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s' }}>
      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 16, padding: '36px 24px', backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', textAlign: 'center', color: '#1e293b' }}>
        <div style={{ fontSize: 52 }}>💰</div>
        <div style={{ fontWeight: 900, fontSize: 24, marginTop: 10, color: '#1e293b' }}>{tr('guideTitle')}</div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 8, maxWidth: 640, margin: '8px auto 0', lineHeight: 1.8 }}>{tr('guideSub')}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#4f8ef7' }}>📋 {tr('guideBeginnerBadge')}</div>
          <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#22c55e' }}>⏱ {tr('guideTimeBadge')}</div>
          <div style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#a855f7' }}>🌍 {tr('guideLangBadge')}</div>
        </div>
      </div>

      {/* Where to Start */}
      <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', borderLeft: '4px solid #4f8ef7', color: '#1e293b' }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8, color: '#1e293b' }}>🚀 {tr('guideWhereToStart')}</div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>{tr('guideWhereToStartDesc')}</div>
      </div>

      {/* 10-Step Detailed Guide */}
      <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', color: '#1e293b' }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: '#1e293b' }}>📚 {tr('guideStepsTitle')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ background: s.c + '08', border: `1px solid ${s.c}20`, borderRadius: 12, padding: '16px 18px', borderLeft: `4px solid ${s.c}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: s.c }}>{s.n} {tr(`${s.k}Title`)}</span>
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, paddingLeft: 32 }}>{tr(`${s.k}Desc`)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab-by-Tab Reference */}
      <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', color: '#1e293b' }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: '#1e293b' }}>🗂 {tr('guideTabsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {tabRefs.map((t, i) => (
            <div key={i} style={{ background: t.c + '0a', border: `1px solid ${t.c}25`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: t.c }}>{tr(`${t.k}Name`)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>{tr(`${t.k}Desc`)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expert Tips */}
      <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', color: '#1e293b' }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 14, color: '#1e293b' }}>💡 {tr('guideTipsTitle')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>{tr(t.k)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', color: '#1e293b' }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 14, color: '#1e293b' }}>❓ {tr('guideFaqTitle')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.12)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Q. {tr(`${f.k}Q`)}</div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>A. {tr(`${f.k}A`)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <div style={{ textAlign: 'center', padding: 24, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(34,197,94,0.06))', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, backdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', color: '#1e293b' }}>
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6, color: '#1e293b' }}>🎉 {tr('guideReadyTitle')}</div>
        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, marginBottom: 14 }}>{tr('guideReadyDesc')}</div>
      </div>
    </div>
  );
}

/* ─── Main Budget Tracker ─── */
export default function BudgetTracker() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const { sharedCampaigns, addAlert } = useGlobalData();
  const [tab, setTab] = useState('overview');
  const tr = useTr();

  /* ─ Hero ref for dynamic sticky offset (Dashboard pattern) ─ */
  const heroRef = React.useRef(null);
  const [heroHeight, setHeroHeight] = useState(82);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const measure = () => setHeroHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [tab]);

  /* ─ Date Range State ─ */
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(today);

  useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });

  const campaigns = useMemo(() => (sharedCampaigns || []).filter(c => c && c.name), [sharedCampaigns]);

  const TAB_CLR = { overview: '#4f8ef7', allocation: '#a855f7', burnrate: '#f97316', alerts: '#ef4444', guide: '#06b6d4' };

  const TABS = useMemo(() => [
    { id: 'overview', icon: '📊', label: tr('tabOverview') },
    { id: 'allocation', icon: '🥧', label: tr('tabAllocation') },
    { id: 'burnrate', icon: '🔥', label: tr('tabBurnRate') },
    { id: 'alerts', icon: '🔔', label: tr('tabAlerts') },
    { id: 'guide', icon: '📖', label: tr('tabGuide') },
  ], [tr]);

  /* ─ Date Input Style ─ */
  const dateInputStyle = {
    padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.25)',
    background: 'rgba(79,142,247,0.06)', color: '#1e293b', fontSize: 12, fontWeight: 600,
    outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
  };

  /* ── 기간선택이 필요한 탭만 표시 ── */
  const showDatePicker = tab !== 'guide';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      <AIRecommendBanner context="budget" />

      {/* ══════ Hero Header (flexShrink:0 — 고정) ══════ */}
      <div ref={heroRef} style={{ padding: '18px 24px', flexShrink: 0, background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(79,142,247,0.15), rgba(79,142,247,0.05))', border: '1px solid rgba(79,142,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💰</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#4f8ef7', letterSpacing: '-0.3px' }}>{tr('pageTitle')}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{tr('pageSub')}</div>
          </div>
          {/* ── Date Range Picker (Guide 탭에서는 숨김) ── */}
          {showDatePicker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>📅 {t('common.period', '기간')}</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={dateInputStyle} max={dateTo} />
              <span style={{ color: '#94a3b8', fontSize: 12 }}>~</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={dateInputStyle} min={dateFrom} max={today} />
            </div>
          )}
        </div>
      </div>

      {/* ══════ Sub-Tab Navigation (flexShrink:0 — 고정) ══════ */}
      <div style={{ flexShrink: 0, background: '#ffffff', padding: '4px 6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '8px 10px', maxWidth: 1400, margin: '0 auto' }}>
          {TABS.map(tb => {
            const active = tab === tb.id;
            const c = TAB_CLR[tb.id];
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                background: active ? c : 'transparent',
                color: active ? '#ffffff' : '#64748b',
                boxShadow: active ? `0 4px 20px ${c}40` : 'none',
                transform: active ? 'translateY(-1px)' : 'none' }}><span style={{ fontSize: 16 }}>{tb.icon}</span> {tb.label}</button>
            );
          })}
        </div>
      </div>

      {/* ══════ Scrollable Content Area (flex:1 독립 스크롤) ══════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {tab === 'overview' && <OverviewTab campaigns={campaigns} tr={tr} fmt={fmt} />}
          {tab === 'allocation' && <AllocationTab campaigns={campaigns} tr={tr} fmt={fmt} />}
          {tab === 'burnrate' && <BurnRateTab campaigns={campaigns} tr={tr} fmt={fmt} />}
          {tab === 'alerts' && <AlertsTab campaigns={campaigns} tr={tr} fmt={fmt} />}
          {tab === 'guide' && <GuideTab tr={tr} />}
        </div>
      </div>
    </div>
  );
}
