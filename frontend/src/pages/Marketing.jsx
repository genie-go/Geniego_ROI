import { useAuth } from '../auth/AuthContext';
import AdStatusAnalysis from './AdStatusAnalysis.jsx';
import React, { useState, useMemo, useCallback } from "react";
import { useI18n } from "../i18n/index.js";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';

import { useT } from '../i18n/index.js';
/* ─── Mock Data for Ads with Dates ────────────────────────────────────────── */
// strict date filtering requirement
const PLATFORMS = [
  {
    id: "meta", name: "Meta Ads", icon: "📘", color: "#4f8ef7",
    campaigns: [
      { name: "Spring_KR_Brand", status: "active", spent: 38200, roas: 5.12, clicks: 48200, conv: 320, impressions: 900000, reach: 750000, startDate: "2026-03-01", endDate: "2026-04-30" },
      { name: "Retargeting_Q1", status: "active", spent: 28900, roas: 6.84, clicks: 32100, conv: 410, impressions: 600000, reach: 450000, startDate: "2026-01-01", endDate: "2026-03-31" },
      { name: "Lookalike_Top10", status: "active", spent: 35800, roas: 3.45, clicks: 29400, conv: 210, impressions: 850000, reach: 800000, startDate: "2026-02-15", endDate: "2026-05-15" },
      { name: "Winter_Sale", status: "deleted", spent: 50000, roas: 2.1, clicks: 15000, conv: 90, impressions: 300000, reach: 250000, startDate: "2025-11-01", endDate: "2025-12-31" },
      { name: "Cancelled_Ad", status: "cancelled", spent: 0, roas: 0, clicks: 0, conv: 0, impressions: 0, reach: 0, startDate: "2026-05-01", endDate: "2026-06-01" },
    ],
  },
  {
    id: "tiktok", name: "TikTok Biz", icon: "🎵", color: "#a855f7",
    campaigns: [
      { name: "UGC_Challenge_01", status: "active", spent: 33200, roas: 3.95, clicks: 38100, conv: 450, impressions: 3500000, reach: 2100000, startDate: "2026-03-05", endDate: "2026-04-15" },
      { name: "Creative_Test_v3", status: "active", spent: 22800, roas: 2.74, clicks: 19400, conv: 120, impressions: 2000000, reach: 1500000, startDate: "2026-02-01", endDate: "2026-03-20" },
      { name: "Past_Trends", status: "paused", spent: 15000, roas: 1.5, clicks: 8000, conv: 40, impressions: 1000000, reach: 800000, startDate: "2025-10-01", endDate: "2025-11-30" },
    ],
  },
  {
    id: "amazon", name: "Amazon Ads", icon: "📦", color: "#eab308",
    campaigns: [
      { name: "Sponsored_Products", status: "active", spent: 28900, roas: 3.10, clicks: 9800, conv: 640, impressions: 1000000, reach: 900000, startDate: "2026-01-10", endDate: "2026-12-31" },
      { name: "Sponsored_Brands", status: "active", spent: 19200, roas: 2.65, clicks: 6400, conv: 320, impressions: 600000, reach: 500000, startDate: "2026-02-01", endDate: "2026-06-30" },
      { name: "Holiday_Special", status: "deleted", spent: 40000, roas: 4.2, clicks: 12000, conv: 800, impressions: 1500000, reach: 1200000, startDate: "2025-12-01", endDate: "2025-12-25" },
    ],
  },
];

const ALL_METRICS = [
  { id: 'impressions', label: '노출 (Impressions)', labelKey: 'marketing.metImpressions', color: '#4f8ef7' },
  { id: 'reach', label: '도달 (Reach)', labelKey: 'marketing.metReach', color: '#06b6d4' },
  { id: 'spend', label: '지출 금액 (Spend)', labelKey: 'marketing.metSpend', color: '#f97316' },
  { id: 'clicks', label: '클릭 (Clicks)', labelKey: 'marketing.metClicks', color: '#a855f7' },
  { id: 'ctr', label: 'CTR (%)', labelKey: 'marketing.metCtr', color: '#ec4899', isRate: true },
  { id: 'cpc', label: 'CPC', labelKey: 'marketing.metCpc', color: '#eab308', isCurrency: true },
  { id: 'cpm', label: 'CPM', labelKey: 'marketing.metCpm', color: '#8b5cf6', isCurrency: true },
  { id: 'conv', label: '전환 (Conversions)', labelKey: 'marketing.metConv', color: '#22c55e' },
  { id: 'roas', label: 'ROAS', labelKey: 'marketing.metRoas', color: '#14d9b0', isMultiplier: true }
];

/* ─── Metric Aggregation Logic ─── */
const calcMetric = (campaigns, metricId) => {
    let sumSpend = 0, sumImps = 0, sumClicks = 0, sumConv = 0, sumReach = 0, sumRev = 0;
    campaigns.forEach(c => {
        sumSpend += c.spent;
        sumImps += c.impressions;
        sumClicks += c.clicks;
        sumConv += c.conv;
        sumReach += c.reach;
        sumRev += (c.spent * c.roas);
    });

    switch(metricId) {
        case 'spend': return sumSpend;
        case 'impressions': return sumImps;
        case 'clicks': return sumClicks;
        case 'conv': return sumConv;
        case 'reach': return sumReach;
        case 'ctr': return sumImps > 0 ? (sumClicks / sumImps) * 100 : 0;
        case 'cpc': return sumClicks > 0 ? sumSpend / sumClicks : 0;
        case 'cpm': return sumImps > 0 ? (sumSpend / sumImps) * 1000 : 0;
        case 'roas': return sumSpend > 0 ? (sumRev / sumSpend) : 0;
        default: return 0;
    }
};

/* ─── Trend Data Generator ────────────────────────────────────────── */
// Mock dynamic chart data based on selected metrics
const generateTrendData = (days, metric1, metric2) => {
    return Array.from({ length: days }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        
        const getBase = (m) => {
             if(m==='spend') return 12000;
             if(m==='impressions') return 400000;
             if(m==='reach') return 250000;
             if(m==='clicks') return 8000;
             if(m==='conv') return 200;
             if(m==='ctr') return 3.5;
             if(m==='cpm') return 15;
             if(m==='cpc') return 1.5;
             if(m==='roas') return 3.2;
             return 1000;
        };

        const val1 = getBase(metric1) * (1 + Math.sin(i * 0.4) * 0.3 + (Math.random()*0.1 - 0.05));
        const val2 = getBase(metric2) * (1 + Math.cos(i * 0.5) * 0.4 + (Math.random()*0.1 - 0.05));
        
        return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            [metric1]: val1,
            [metric2]: val2,
        };
    });
};

/* ─── Amazon-Style Landing Tab ────────────────────────────────────────── */
function AmazonOverviewTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    
    // Default dates: March 2026 (current active month)
    const [startDate, setStartDate] = useState("2026-03-01");
    const [endDate, setEndDate] = useState("2026-03-31");
    
    // Multi-slots for KPI cards
    const [slots, setSlots] = useState(['spend', 'impressions', 'clicks', 'ctr', 'roas']);
    
    // We will plot slot 0 (Left Axis) and slot 1 (Right Axis) on the chart
    const primaryMetricId = slots[0];
    const secondaryMetricId = slots[1];

    // 1. Strict Date Filtering
    const filteredPlatforms = useMemo(() => {
        const sTime = new Date(startDate).getTime();
        const eTime = new Date(endDate).getTime();
        
        return PLATFORMS.map(p => {
            const validCampaigns = p.campaigns.filter(c => {
                const cStart = new Date(c.startDate).getTime();
                const cEnd = new Date(c.endDate).getTime();
                // Overlap condition: adStart <= filterEnd AND adEnd >= filterStart
                // Only campaigns that ACTUALLY ran during this period!
                return cStart <= eTime && cEnd >= sTime;
            });
            return { ...p, campaigns: validCampaigns };
        }).filter(p => p.campaigns.length > 0);
    }, [startDate, endDate]);

    const allValidCampaigns = useMemo(() => {
        return filteredPlatforms.flatMap(p => p.campaigns);
    }, [filteredPlatforms]);

    // Trend chart dynamic data calculation based on primary & secondary
    const chartData = useMemo(() => generateTrendData(14, primaryMetricId, secondaryMetricId), [primaryMetricId, secondaryMetricId]);
    const m1Def = ALL_METRICS.find(m => m.id === primaryMetricId);
    const m2Def = ALL_METRICS.find(m => m.id === secondaryMetricId);

    const formatValue = (val, mDef) => {
        if (!mDef) return val;
        if (mDef.isRate) return val.toFixed(2) + "%";
        if (mDef.isMultiplier) return val.toFixed(2) + "x";
        if (mDef.isCurrency || mDef.id === 'spend') return fmt(val, { prefix: "₩" });
        return Number(val.toFixed(0)).toLocaleString();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.5s" }}>
            
            {/* Top Date Filter - The core logic strictly filters out dead ads */}
            <div className="card card-glass" style={{ padding: "16px 22px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", borderLeft: "4px solid #22c55e" }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-1)", marginBottom: 4 }}>
                        {t('marketing.strictDateFilter') || "📅 캠페인 집행 기간 (Strict Date Filter)"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {t('marketing.strictDateDesc') || "해당 기간 내에 실제로 라이브된 이력이 있는 광고만 선별하여 데이터 오염을 방지합니다."}
                    </div>
                </div>
                
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                           style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 12px", color: "#fff", outline: "none" }} />
                    <span style={{ color: "var(--text-3)" }}>~</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                           style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 12px", color: "#fff", outline: "none" }} />
                </div>
            </div>

            {/* Amazon-Style Top Visualization Area */}
            <div className="card card-glass fade-up" style={{ padding: 24, paddingBottom: 0, animationDelay: "100ms" }}>
                
                {/* 5 Dropdown KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
                    {slots.map((slotMetricId, slotIdx) => {
                        const mDef = ALL_METRICS.find(m => m.id === slotMetricId);
                        const val = calcMetric(allValidCampaigns, slotMetricId);
                        const isPrimary = slotIdx === 0;
                        const isSecondary = slotIdx === 1;
                        
                        return (
                            <div key={slotIdx} style={{
                                padding: "16px", borderRadius: 12, 
                                background: isPrimary ? "rgba(79,142,247,0.1)" : isSecondary ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.02)",
                                border: isPrimary ? "1px solid #4f8ef7" : isSecondary ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.05)",
                                position: 'relative'
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <select 
                                        value={slotMetricId} 
                                        onChange={e => {
                                            const newSlots = [...slots];
                                            newSlots[slotIdx] = e.target.value;
                                            setSlots(newSlots);
                                        }}
                                        style={{ 
                                            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, 
                                            padding: "4px 8px", color: "#fff", fontSize: 11, fontWeight: 700, outline: "none",
                                            cursor: 'pointer', maxWidth: '100%', textOverflow: 'ellipsis'
                                        }}
                                    >
                                        {ALL_METRICS.map(opt => (
                                            <option key={opt.id} value={opt.id}>{t(opt.labelKey) || opt.label}</option>
                                        ))}
                                    </select>
                                    
                                    {(isPrimary || isSecondary) && (
                                        <div style={{ width: 12, height: 12, borderRadius: 2, background: isPrimary ? "#4f8ef7" : "#f97316", flexShrink: 0 }} 
                                             title={isPrimary ? "Primary Axis Object" : "Secondary Axis Object"} />
                                    )}
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: mDef.color }}>
                                    {formatValue(val, mDef)}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* THE GRAPH ITSELF - At the very top right under KPI Cards */}
                <div style={{ width: '100%', height: 380, borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: 20 }}>
                     <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                         <div style={{ fontSize: 13, fontWeight: 800, color: m1Def.color }}>● {t(m1Def.labelKey) || m1Def.label} (Left Axis)</div>
                         <div style={{ fontSize: 13, fontWeight: 800, color: m2Def.color }}>● {t(m2Def.labelKey) || m2Def.label} (Right Axis)</div>
                     </div>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={m1Def.color} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={m1Def.color} stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={m2Def.color} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={m2Def.color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={11} tickMargin={10} />
                            <YAxis yAxisId="left" stroke={m1Def.color} fontSize={11} tickFormatter={v => v>=1000 ? (v/1000).toFixed(0)+'K' : v} />
                            <YAxis yAxisId="right" orientation="right" stroke={m2Def.color} fontSize={11} tickFormatter={v => v>=1000 ? (v/1000).toFixed(0)+'K' : v} />
                            
                            <RechartsTooltip contentStyle={{ background: "rgba(10,15,30,0.9)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: '#fff' }} />
                            
                            <Area yAxisId="left" type="monotone" name={t(m1Def.labelKey) || m1Def.label} dataKey={m1Def.id} stroke={m1Def.color} strokeWidth={3} fillOpacity={1} fill="url(#colorPrimary)" />
                            <Area yAxisId="right" type="monotone" name={t(m2Def.labelKey) || m2Def.label} dataKey={m2Def.id} stroke={m2Def.color} strokeWidth={3} fillOpacity={1} fill="url(#colorSecondary)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            
            
            
        </div>
    );
}


/* ─── Main Marketing (General Performance) ──────────────────────────────────────────────────────── */
export default function Marketing() {

  const { t } = useI18n();
  const [tab, setTab] = useState("overview");

  const TABS = useMemo(() => [
    { id: "overview", label: t("marketing.tabOverview") || "성과 현황 오버뷰" },
    { id: "ad_status", label: t("marketing.mktHierTitle") || "세부 광고 성과 현황 (분석)" },
    { id: "evaluation", label: t("marketing.tabAiEval") || "AI 평가 결과" }
  ], [t]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <AIRecommendBanner context="marketing" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{t("marketing.pageTitle") || "통합 마케팅 성과 대시보드"}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            {t("marketing.pageSub") || "실시간 라이브 데이터를 필터링하고 모든 채널의 통합된 KPI 추세를 확인하세요."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, background: "rgba(9,15,30,0.8)", borderRadius: 12, padding: 4, border: "1px solid rgba(99,140,255,0.1)" }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: tab === tb.id ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent",
              color: tab === tb.id ? "#fff" : "var(--text-3)", transition: "all 150ms",
            }}>{tb.label}</button>
          ))}
        </div>
      </div>

      {tab === "overview" && <AmazonOverviewTab />}
      {tab === "ad_status" && <AdStatusAnalysis />}
      {tab === "evaluation" && (
          <div style={{ padding: 40, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
              <h2 style={{ color: '#4f8ef7' }}>{t('marketing.aiEvalPlaceholderTitle') || '🤖 AI Evaluation Placeholder'}</h2>
              <p style={{ color: 'var(--text-3)' }}>{t('marketing.aiEvalPlaceholderDesc') || 'AI 평가 결과는 이전 버전에 존재하였으나 통합 대시보드 구조에 맞춰 리팩토링 중입니다.'}</p>
          </div>
      )}
    </div>
  );
}
