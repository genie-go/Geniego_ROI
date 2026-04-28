import { useAuth } from '../auth/AuthContext';
import AdStatusAnalysis from './AdStatusAnalysis.jsx';
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useI18n } from "../i18n/index.js";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Line, ComposedChart } from "recharts";
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { DEMO_DAILY_TRENDS } from '../data/demoSeedData.js';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
const AiDesignEngine = React.lazy(() => import('../components/AiDesignEngine.jsx'));

/* ─── BroadcastChannel Cross-Tab Sync ─── */
const MKT_SYNC_CH = 'geniego-marketing-sync';
let _mktChannel = null;
try { if (typeof BroadcastChannel !== 'undefined') _mktChannel = new BroadcastChannel(MKT_SYNC_CH); } catch { /* */ }
function broadcastMkt(type, payload) {
    try {
        if (_mktChannel) _mktChannel.postMessage({ type, payload, ts: Date.now() });
        else { localStorage.setItem('__mkt_sync__', JSON.stringify({ type, payload, ts: Date.now() })); localStorage.removeItem('__mkt_sync__'); }
    } catch { /* */ }
}

/* ─── Channel Fee Rates ─── */
const CHANNEL_FEES = {
    meta_ads: { name: 'Meta Ads', feeRate: 0.05, icon: '📘' },
    google_ads: { name: 'Google Ads', feeRate: 0.04, icon: '🔍' },
    tiktok_ads: { name: 'TikTok Ads', feeRate: 0.06, icon: '🎵' },
    naver_ads: { name: 'Naver Ads', feeRate: 0.035, icon: '🟢' },
    kakao: { name: 'Kakao Ads', feeRate: 0.03, icon: '💬' },
    instagram: { name: 'Instagram', feeRate: 0.05, icon: '📸' },
    coupang: { name: 'Coupang', feeRate: 0.10, icon: '🛒' },
    line: { name: 'LINE Ads', feeRate: 0.04, icon: '💚' },
};

const ALL_METRICS = [
  { id: 'impressions', label: 'Impressions', labelKey: 'marketing.metImpressions', color: '#4f8ef7' },
  { id: 'reach', label: 'Reach', labelKey: 'marketing.metReach', color: '#06b6d4' },
  { id: 'spend', label: 'Spend', labelKey: 'marketing.metSpend', color: '#f97316' },
  { id: 'clicks', label: 'Clicks', labelKey: 'marketing.metClicks', color: '#a855f7' },
  { id: 'ctr', label: 'CTR (%)', labelKey: 'marketing.metCtr', color: '#ec4899', isRate: true },
  { id: 'cpc', label: 'CPC', labelKey: 'marketing.metCpc', color: '#eab308', isCurrency: true },
  { id: 'cpm', label: 'CPM', labelKey: 'marketing.metCpm', color: '#8b5cf6', isCurrency: true },
  { id: 'conv', label: 'Conversions', labelKey: 'marketing.metConv', color: '#22c55e' },
  { id: 'roas', label: 'ROAS', labelKey: 'marketing.metRoas', color: '#14d9b0', isMultiplier: true }
];

/* ─── Metric Aggregation Logic ─── */
const calcMetric = (campaigns, metricId) => {
    let sumSpend = 0, sumImps = 0, sumClicks = 0, sumConv = 0, sumReach = 0, sumRev = 0;
    
    campaigns.forEach(c => {
        const spent = c.spent || 0;
        const imps = c.impressions || 0;
        const cls = c.clicks || 0;
        const roas = c.roas || 0;
        const conv = c.conv || 0;
        const rch = c.reach || 0;

        sumSpend += spent;
        sumImps += imps;
        sumClicks += cls;
        sumConv += conv;
        sumReach += rch;
        sumRev += (spent * roas);
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

/* ─── Trend Data Generator (synced to selected date range + DEMO_DAILY_TRENDS) ─── */
const TREND_METRIC_MAP = {
    spend: 'adSpend', impressions: 'visitors', clicks: 'orders',
    conv: 'newCustomers', reach: 'returningCustomers', roas: 'roas',
    ctr: 'conversionRate', cpc: 'avgOrderValue', cpm: 'avgOrderValue',
};

const CORE_CHART_METRICS = ['spend', 'impressions', 'clicks', 'ctr', 'roas'];

/** Generate daily trend data for ALL requested metrics using existing campaign data pipeline */
const generateTrendData = (campaigns, startDate, endDate, metric1, metric2, isDemoMode) => {
    const data = [];
    const sTime = new Date(startDate).getTime();
    const eTime = new Date(endDate).getTime();
    const days = Math.max(1, Math.round((eTime - sTime) / 86400000) + 1);

    // Pre-compute totals for all core metrics from campaign data
    const metricTotals = {};
    const allMetricIds = new Set([metric1, metric2, ...CORE_CHART_METRICS]);
    allMetricIds.forEach(mId => { metricTotals[mId] = calcMetric(campaigns, mId); });

    const trendMap = {};
    if (isDemoMode && Array.isArray(DEMO_DAILY_TRENDS)) {
        DEMO_DAILY_TRENDS.forEach(tr => { trendMap[tr.date] = tr; });
    }
    const seed = (n) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;

    // Precompute trend sums for normalization
    const trendSums = {};
    if (isDemoMode) {
        allMetricIds.forEach(mId => {
            const tf = TREND_METRIC_MAP[mId] || 'revenue';
            trendSums[mId] = DEMO_DAILY_TRENDS.reduce((a, tr) => a + (tr[tf] || 0), 0) || 1;
        });
    }

    for (let i = 0; i < days; i++) {
        const d = new Date(sTime + i * 86400000);
        const dateStr = d.toISOString().slice(5, 10);
        const fullDate = d.toISOString().slice(0, 10);
        const dow = d.getDay();
        const tr = trendMap[fullDate];

        const point = { date: dateStr };

        allMetricIds.forEach(mId => {
            const total = metricTotals[mId];
            const tf = TREND_METRIC_MAP[mId] || 'revenue';
            const md = ALL_METRICS.find(m => m.id === mId);
            let val = 0;
            if (isDemoMode && tr) {
                val = total * ((tr[tf] || 0) / trendSums[mId]) * DEMO_DAILY_TRENDS.length;
            } else if (isDemoMode && !tr) {
                const wf = (dow === 0 || dow === 6) ? 0.65 + seed(i * 3 + mId.charCodeAt(0)) * 0.1 : 1.0;
                const wave = Math.sin(i * 0.45 + 1.2 + mId.charCodeAt(0) * 0.1) * 0.15;
                const noise = (seed(i * 7 + mId.charCodeAt(0) * 13) - 0.5) * 0.25;
                const ramp = 1 + (i / days) * 0.12;
                val = (total / days) * (1 + wave + noise) * wf * ramp;
            } else {
                // Production: If no real backend API provides points, generate a flat average line for now.
                val = total / days;
            }
            point[mId] = (md?.isRate || md?.isMultiplier) ? parseFloat(Math.max(0, val).toFixed(2)) : Math.round(Math.max(0, val));
        });

        data.push(point);
    }
    return data;
};

/* ─── Amazon-Style Landing Tab ────────────────────────────────────────── */
function AmazonOverviewTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { sharedCampaigns } = useGlobalData();
    
    // Default dates: dynamic based on current month
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    
    // Multi-slots for KPI cards
    const [slots, setSlots] = useState(['spend', 'impressions', 'clicks', 'ctr', 'roas']);
    const primaryMetricId = slots[0];
    const secondaryMetricId = slots[1];

    // 1. Strict Date Filtering
    const allValidCampaigns = useMemo(() => {
        const sTime = new Date(startDate).getTime();
        const eTime = new Date(endDate).getTime();
        const valid = sharedCampaigns.filter(c => {
            const cStart = new Date(c.startDate).getTime();
            const cEnd = new Date(c.endDate).getTime();
            return cStart <= eTime && cEnd >= sTime;
        }).map(c => {
            const cStart = new Date(c.startDate).getTime();
            const cEnd = new Date(c.endDate).getTime();
            const campDays = Math.max(1, (cEnd - cStart) / 86400000);
            const oStart = Math.max(sTime, cStart);
            const oEnd = Math.min(eTime, cEnd);
            const oDays = Math.max(0, (oEnd - oStart) / 86400000);
            const ratio = Math.min(1, oDays / campDays);
            return {
                ...c,
                spent: Math.round((c.spent || 0) * ratio),
                impressions: Math.round((c.impressions || 0) * ratio),
                clicks: Math.round((c.clicks || 0) * ratio),
                reach: Math.round((c.reach || 0) * ratio),
                conv: Math.round((c.conv || 0) * ratio),
            };
        });
        if (valid.length === 0) return [];
        return valid;
    }, [startDate, endDate, sharedCampaigns]);

    const { isDemoMode } = useAuth();
    // Trend chart dynamic data calculation synced to selected date range
    const chartData = useMemo(() => generateTrendData(allValidCampaigns, startDate, endDate, primaryMetricId, secondaryMetricId, isDemoMode), [allValidCampaigns, startDate, endDate, primaryMetricId, secondaryMetricId, isDemoMode]);
    
    const formatValue = (val, mDef) => {
        if (!mDef) return val;
        if (mDef.isRate) return val.toFixed(2) + "%";
        if (mDef.isMultiplier) return val.toFixed(2) + "x";
        if (mDef.isCurrency || mDef.id === 'spend') return fmt(val);
        return Number(val.toFixed(0)).toLocaleString();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn 0.5s" }}>

            {/* Amazon-Style Top Visualization Area — Date filter integrated at top */}
            <div className="card card-glass fade-up" style={{ padding: 24, paddingBottom: 0, animationDelay: "100ms" }}>
                {/* Header row: title + date pickers */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>
                            📅 {t('marketing.strictDateFilter', "Campaign Active Period (Strict Date Filter)")}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {t('marketing.strictDateDesc', "Ignores cache and fetches live operational data instantly.")}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                               style={{ background: "#f0f4ff", border: "2px solid #4f8ef7", borderRadius: 8, padding: "7px 12px", color: "#1a1a2e", outline: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }} />
                        <span style={{ color: "#94a3b8", fontWeight: 700 }}>~</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                               style={{ background: "#f0f4ff", border: "2px solid #4f8ef7", borderRadius: 8, padding: "7px 12px", color: "#1a1a2e", outline: "none", fontWeight: 700, fontSize: 12, cursor: "pointer" }} />
                    </div>
                </div>
                {/* 5 Dropdown KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
                    {slots.map((slotMetricId, slotIdx) => {
                        const mDef = ALL_METRICS.find(m => m.id === slotMetricId);
                        const val = calcMetric(allValidCampaigns, slotMetricId);
                        const isPrimary = slotIdx === 0;
                        const isSecondary = slotIdx === 1;
                        return (
                            <div key={slotIdx} style={{ padding: "16px", borderRadius: 12, background: isPrimary ? "rgba(79,142,247,0.08)" : isSecondary ? "rgba(249,115,22,0.08)" : "rgba(241,245,249,0.7))", border: isPrimary ? "1px solid rgba(79, 142, 247, 0.25)" : "1px solid rgba(0, 115, 22, 0, 0.06))", position: 'relative' }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <select value={slotMetricId} onChange={e => { const ns = [...slots]; ns[slotIdx] = e.target.value; setSlots(ns); }} style={{ background: "rgba(241,245,249,0.7)", border: '1px solid rgba(0,0,0,0.06))', borderRadius: 6, padding: "4px 8px", color: '#1e293b', fontSize: 11, fontWeight: 700, outline: "none", cursor: 'pointer', maxWidth: '100%', textOverflow: 'ellipsis' }}>
                                        {ALL_METRICS.map(opt => (<option key={opt.id} value={opt.id}>{t(opt.labelKey, opt.label)}</option>))}
                                    </select>
                                    {(isPrimary || isSecondary) && <div style={{ width: 12, height: 12, borderRadius: 2, background: isPrimary ? "#4f8ef7" : "#f97316", flexShrink: 0 }} />}
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 900, color: mDef.color }}>{formatValue(val, mDef)}</div>
                            </div>
                        );
                    })}
                </div>
                {/* 5-Metric ComposedChart */}
                <div style={{ width: '100%', borderTop: "1px dashed rgba(0,0,0,0.06))", paddingTop: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
                        {CORE_CHART_METRICS.map(mId => { const md = ALL_METRICS.find(m => m.id === mId); if (!md) return null; const al = mId === 'spend' ? '(Left)' : (mId === 'impressions' || mId === 'clicks') ? '(Right)' : '(%/x)'; return (<div key={mId} style={{ display: 'flex', alignItems: 'center', gap: 5, width: 10, height: 10, borderRadius: mId === 'ctr' || mId === 'roas' ? '50%' : 2, background: md.color, fontSize: 9, fontWeight: 400, color: '#94a3b8' }} ><div /><span>{t(md.labelKey, md.label)} <span>{al}</span></span></div>); })}
                    </div>
                    <div style={{ width: '100%', height: 420 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 60, left: 10, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.35}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="gradImpressions" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.25}/><stop offset="95%" stopColor="#4f8ef7" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.08)" vertical={false} />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickMargin={10} />
                                <YAxis yAxisId="spend" stroke="#f97316" fontSize={10} tickFormatter={v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v} />
                                <YAxis yAxisId="counts" orientation="right" stroke="#4f8ef7" fontSize={10} tickFormatter={v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v} />
                                <YAxis yAxisId="ratio" orientation="right" hide={true} domain={[0, 'auto']} />
                                <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06))', borderRadius: 10, color: '#1e293b', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} formatter={(value, name) => { const md = ALL_METRICS.find(m => t(m.labelKey, m.label) === name); if (md?.isRate) return [value.toFixed(2) + '%', name]; if (md?.isMultiplier) return [value.toFixed(2) + 'x', name]; if (md?.isCurrency || md?.id === 'spend') return [fmt(value), name]; return [Number(value).toLocaleString(), name]; }} />
                                <Area yAxisId="spend" type="monotone" name={t('marketing.metSpend', 'Spend')} dataKey="spend" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#gradSpend)" />
                                <Area yAxisId="counts" type="monotone" name={t('marketing.metImpressions', 'Impressions')} dataKey="impressions" stroke="#4f8ef7" strokeWidth={2} fillOpacity={1} fill="url(#gradImpressions)" />
                                <Line yAxisId="counts" type="monotone" name={t('marketing.metClicks', 'Clicks')} dataKey="clicks" stroke="#a855f7" strokeWidth={2.5} dot={false} />
                                <Line yAxisId="ratio" type="monotone" name={t('marketing.metCtr', 'CTR (%)')} dataKey="ctr" stroke="#ec4899" strokeWidth={2} dot={{ r: 2, fill: '#ec4899' }} strokeDasharray="5 3" />
                                <Line yAxisId="ratio" type="monotone" name={t('marketing.metRoas', 'ROAS')} dataKey="roas" stroke="#14d9b0" strokeWidth={2} dot={{ r: 2, fill: '#14d9b0' }} strokeDasharray="8 4" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            {/* Channel Fee Tracker */}
            <div className="card card-glass fade-up" style={{ padding: 20, animationDelay: '200ms' }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>💰 {t('marketing.channelFeeTitle')}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 14 }}>{t('marketing.channelFeeDesc')}</div>
                <ChannelFeeTracker campaigns={allValidCampaigns} />
            </div>
        </div>
    );
}

/* ─── Channel Fee Tracker Component ─── */
function ChannelFeeTracker({ campaigns }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { isConnected } = useConnectorSync();
    const feeData = useMemo(() => Object.entries(CHANNEL_FEES).filter(([id]) => isConnected(id)).map(([id, info]) => { const cs = campaigns.filter(c => (c.adChannels?.[0]?.id || '').includes(id.split('_')[0])).reduce((s, c) => s + (c.spent || 0), 0); return { ...info, id, spend: cs, fee: cs * info.feeRate }; }), [campaigns, isConnected]);
    const totalFee = feeData.reduce((s, d) => s + d.fee, 0);
    if (feeData.length === 0) return <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 }}>{t('marketing.noConnectedChannels')}</div>;
    return (<div><div style={{ display: 'flex', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginBottom: 6, padding: '8px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', justifyContent: 'flex-end', alignItems: 'center', fontSize: 12, fontWeight: 900, color: '#ef4444', marginTop: 2 }} >{feeData.map(ch => (<div key={ch.id}><div><span>{ch.icon} {ch.name}</span><span>{(ch.feeRate * 100).toFixed(1)}%</span></div><div>{t('marketing.metSpend')}: {fmt(ch.spend)}</div><div>{t('marketing.estimatedFee')}: {fmt(ch.fee)}</div></div>))}</div><div><span>{t('marketing.totalFee')}: {fmt(totalFee)}</span></div></div>);
}

/* ─── Creative Analysis Tab (Zero-Mock) ─── */
function CreativeAnalysisTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { sharedCampaigns } = useGlobalData();
    const { isConnected } = useConnectorSync();

    const connectedChannels = useMemo(() => {
        const channels = [
            { id: 'meta_ads', name: 'Meta Ads', icon: '📘', color: '#4f8ef7' },
            { id: 'google_ads', name: 'Google Ads', icon: '🔍', color: '#ea4335' },
            { id: 'tiktok_ads', name: 'TikTok Ads', icon: '🎵', color: '#010101' },
            { id: 'naver_ads', name: 'Naver Ads', icon: '🟢', color: '#03cf5d' },
            { id: 'kakao', name: 'Kakao Ads', icon: '💬', color: '#fee500' },
        ];
        return channels.filter(ch => isConnected(ch.id));
    }, [isConnected]);

    const creativeData = useMemo(() => {
        if (!sharedCampaigns || sharedCampaigns.length === 0) return [];
        return sharedCampaigns.map(c => {
            const sp = c.spent || 0;
            const impr = c.impressions || 0;
            const clicks = c.clicks || 0;
            const conv = c.conv || 0;
            return {
                name: c.name,
                channel: c.adChannels?.[0]?.id || 'meta',
                spend: sp,
                impressions: impr,
                clicks: clicks,
                ctr: impr > 0 ? ((clicks / impr) * 100).toFixed(2) : '0.00',
                cvr: clicks > 0 ? ((conv / clicks) * 100).toFixed(2) : '0.00',
                roas: c.roas || 0,
                conv: conv,
            };
        });
    }, [sharedCampaigns]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-glass" style={{ padding: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>🔌 {t('marketing.connectedChannels')}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {connectedChannels.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{t('marketing.noConnectedChannels')}</div>
                    ) : connectedChannels.map(ch => (
                        <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: ch.color + '15', border: `1px solid ${ch.color}30` }}>
                            <span>{ch.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: ch.color }}>{ch.name}</span>
                            <span style={{ fontSize: 9, color: '#22c55e' }}>● {t('marketing.connected')}</span>
                        </div>
                    ))}
                </div>
            </div>
            {creativeData.length === 0 ? (
                <div className="card card-glass" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t('marketing.noCreativeData')}</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>{t('marketing.noCreativeDesc')}</div>
                </div>
            ) : (
                <>
                    <div className="card card-glass" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>🎨 {t('marketing.creativePerformance')}</div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={creativeData.slice(0, 8)} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,140,255,0.08)" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" />
                                    <YAxis stroke="#94a3b8" fontSize={11} />
                                    <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06))', borderRadius: 8, color: '#1e293b', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                    <Bar dataKey="clicks" fill="#4f8ef7" name={t('marketing.metClicks')} radius={[4,4,0,0]} />
                                    <Bar dataKey="conv" fill="#22c55e" name={t('marketing.metConv')} radius={[4,4,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="card card-glass" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 16, fontWeight: 800, fontSize: 14, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>📊 {t('marketing.creativeTable')}</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ width: '100%', margin: 0, whiteSpace: 'nowrap' }}>
                                <thead style={{ background: 'rgba(241,245,249,0.7)' }}>
                                    <tr>
                                        <th style={{ padding: '10px 16px' }}>{t('marketing.colCreativeName')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('marketing.metSpend')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('marketing.metImpressions')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('marketing.metClicks')}</th>
                                        <th style={{ textAlign: 'right' }}>CTR</th>
                                        <th style={{ textAlign: 'right' }}>CVR</th>
                                        <th style={{ textAlign: 'right', paddingRight: 16 }}>ROAS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {creativeData.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                            <td style={{ padding: '10px 16px', fontWeight: 700 }}>{row.name}</td>
                                            <td style={{ textAlign: 'right', color: '#f97316', fontFamily: 'monospace' }}>{fmt(row.spend)}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{row.impressions.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#4f8ef7' }}>{row.clicks.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#14d9b0' }}>{row.ctr}%</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#a855f7' }}>{row.cvr}%</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e', fontWeight: 900, paddingRight: 16 }}>{row.roas}x</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── Campaign Compare Tab (Zero-Mock) ─── */
function CampaignCompareTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { sharedCampaigns } = useGlobalData();
    const [selected, setSelected] = useState([]);

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
    };

    const selectedCampaigns = useMemo(() => sharedCampaigns.filter(c => selected.includes(c.id)), [selected, sharedCampaigns]);

    const radarData = useMemo(() => {
        if (selectedCampaigns.length === 0) return [];
        const maxSpend = Math.max(...selectedCampaigns.map(c => c.spent || 1));
        const maxImpr = Math.max(...selectedCampaigns.map(c => c.impressions || 1));
        const maxClicks = Math.max(...selectedCampaigns.map(c => c.clicks || 1));
        const metrics = [
            { metric: t('marketing.metSpend'), key: 'spend', max: maxSpend },
            { metric: t('marketing.metImpressions'), key: 'impr', max: maxImpr },
            { metric: t('marketing.metClicks'), key: 'clicks', max: maxClicks },
            { metric: 'ROAS', key: 'roas', max: 10 },
            { metric: 'CTR', key: 'ctr', max: 10 },
        ];
        return metrics.map(m => {
            const obj = { metric: m.metric };
            selectedCampaigns.forEach(c => {
                const v = m.key === 'spend' ? (c.spent || 0) : m.key === 'impr' ? (c.impressions || 0) : m.key === 'clicks' ? (c.clicks || 0) : m.key === 'roas' ? (c.roas || 0) : (c.ctr || 0);
                obj[c.id] = m.max > 0 ? (v / m.max * 100) : 0;
            });
            return obj;
        });
    }, [selectedCampaigns, t]);

    const COLORS = ['#4f8ef7', '#22c55e', '#f97316', '#a855f7'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-glass" style={{ padding: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>⚡ {t('marketing.selectCampaigns')}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>{t('marketing.selectCampaignsDesc')}</div>
                {sharedCampaigns.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, padding: 20, textAlign: 'center' }}>{t('marketing.noCampaigns')}</div>
                ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sharedCampaigns.map(c => {
                            const isSelected = selected.includes(c.id);
                            const idx = selected.indexOf(c.id);
                            return (
                                <button key={c.id} onClick={() => toggleSelect(c.id)} style={{
                                    padding: '8px 16px', borderRadius: 8, border: `1px solid ${isSelected ? COLORS[idx] : 'rgba(0,0,0,0.06))'}`,
                                    background: isSelected ? COLORS[idx] + '12' : 'transparent',
                                    color: isSelected ? COLORS[idx] : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{c.name}</button>
                            );
                        })}
                    </div>
                )}
            </div>
            {selectedCampaigns.length >= 2 && (
                <>
                    <div className="card card-glass" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>📡 {t('marketing.radarCompare')}</div>
                        <div style={{ width: '100%', height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                    <PolarGrid stroke="rgba(99,140,255,0.12)" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <PolarRadiusAxis tick={false} domain={[0, 100]} />
                                    {selectedCampaigns.map((c, i) => (
                                        <Radar key={c.id} name={c.name} dataKey={c.id} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                                    ))}
                                    <Legend wrapperStyle={{ fontSize: 11, color: '#1e293b' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="card card-glass" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 16, fontWeight: 800, fontSize: 14, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>📋 {t('marketing.kpiCompare')}</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ width: '100%', margin: 0, whiteSpace: 'nowrap' }}>
                                <thead style={{ background: 'rgba(241,245,249,0.7)' }}>
                                    <tr>
                                        <th style={{ padding: '10px 16px' }}>{t('marketing.colCreativeName')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('marketing.metSpend')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('marketing.metImpressions')}</th>
                                        <th style={{ textAlign: 'right' }}>{t('marketing.metClicks')}</th>
                                        <th style={{ textAlign: 'right' }}>CTR</th>
                                        <th style={{ textAlign: 'right' }}>ROAS</th>
                                        <th style={{ textAlign: 'right', paddingRight: 16 }}>{t('marketing.metConv')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedCampaigns.map((c, i) => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', borderLeft: `4px solid ${COLORS[i]}` }}>
                                            <td style={{ padding: '10px 16px', fontWeight: 800, color: COLORS[i] }}>{c.name}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#f97316' }}>{fmt(c.spent || 0)}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{(c.impressions || 0).toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#4f8ef7' }}>{(c.clicks || 0).toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#14d9b0' }}>{(c.ctr || 0).toFixed(2)}%</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e', fontWeight: 900 }}>{(c.roas || 0).toFixed(2)}x</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', paddingRight: 16 }}>{(c.conv || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
            {selectedCampaigns.length < 2 && selectedCampaigns.length > 0 && (
                <div className="card card-glass" style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    {t('marketing.selectAtLeast2')}
                </div>
            )}
        </div>
    );
}

/* ─── Marketing Guide Tab ─── */
function MarketingGuideTab() {
    const { t } = useI18n();
    const AI_GUIDE_STEPS = [
        {n:'1️⃣',k:'aiGuideStep1',c:'#4f8ef7',icon:'📱'},
        {n:'2️⃣',k:'aiGuideStep2',c:'#a855f7',icon:'🎨'},
        {n:'3️⃣',k:'aiGuideStep3',c:'#22c55e',icon:'✏️'},
        {n:'4️⃣',k:'aiGuideStep4',c:'#06b6d4',icon:'🎮'},
        {n:'5️⃣',k:'aiGuideStep5',c:'#f59e0b',icon:'📅'},
        {n:'6️⃣',k:'aiGuideStep6',c:'#ec4899',icon:'🚀'},
        {n:'7️⃣',k:'aiGuideStep7',c:'#f97316',icon:'👁️'},
        {n:'8️⃣',k:'aiGuideStep8',c:'#8b5cf6',icon:'💾'},
        {n:'9️⃣',k:'aiGuideStep9',c:'#ef4444',icon:'🔄'},
        {n:'🔟',k:'aiGuideStep10',c:'#10b981',icon:'📤'},
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* AI Design Guide Hero */}
            <div className="card card-glass" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor: 'rgba(79,142,247,0.3)', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 44 }}>🤖</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('marketing.aiGuideTitle', 'AI Design Creative Engine — Complete Guide')}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>{t('marketing.aiGuideSub', 'Step-by-step instructions from creative setup to multi-channel deployment')}</div>
            </div>
            {/* AI Design 10-Step Guide */}
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>🎯 {t('marketing.aiGuideStepsTitle', 'AI Design — Step-by-Step Workflow')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {AI_GUIDE_STEPS.map((s,i) => (
                        <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.n}</span>
                                <span style={{ fontSize: 16 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`marketing.${s.k}Title`)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{t(`marketing.${s.k}Desc`)}</div>
                        </div>
                    ))}
                </div>
            </div>
            {/* General Marketing Guide */}
            <div className="card card-glass" style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.04))', textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 38 }}>📣</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('marketing.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>{t('marketing.guideSub')}</div>
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('marketing.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a855f7'},{n:'4️⃣',k:'guideStep4',c:'#f59e0b'},{n:'5️⃣',k:'guideStep5',c:'#f97316'},{n:'6️⃣',k:'guideStep6',c:'#06b6d4'}].map((s,i) => (
                        <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.n}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`marketing.${s.k}Title`)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>{t(`marketing.${s.k}Desc`)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('marketing.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                    {[{icon:'📊',k:'guideTabOverview',c:'#4f8ef7'},{icon:'📂',k:'guideTabStatus',c:'#a855f7'},{icon:'🎨',k:'guideTabCreative',c:'#ec4899'},{icon:'⚡',k:'guideTabCompare',c:'#f59e0b'},{icon:'🤖',k:'guideTabAiDesign',c:'#6366f1'}].map((tb,i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(241,245,249,0.7)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`marketing.${tb.k}Name`)}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, lineHeight: 1.6 }}>{t(`marketing.${tb.k}Desc`)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card card-glass" style={{ padding: 20, background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.3)' }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('marketing.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#94a3b8', lineHeight: 2.2 }}>
                    <li>{t('marketing.guideTip1')}</li>
                    <li>{t('marketing.guideTip2')}</li>
                    <li>{t('marketing.guideTip3')}</li>
                    <li>{t('marketing.guideTip4')}</li>
                    <li>{t('marketing.guideTip5')}</li>
                    <li>{t('marketing.aiGuideTip1', 'Select the correct platform first — each platform has optimized dimensions for maximum ad performance.')}</li>
                    <li>{t('marketing.aiGuideTip2', 'Use the Event Period tab for time-limited campaigns — flash sales, seasonal promotions, and birthday events.')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ─── AI Design Generator Tab ─── */
function AiDesignTab() {
    const { t } = useI18n();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card card-glass" style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.10),rgba(79,142,247,0.06))', textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 40 }}>🤖</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>{t('marketing.tabAiDesign')}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {t('marketing.aiDesignSub', 'Enterprise AI Creative Engine · 14 Platforms · Multi-Channel Ads · Interactive Popups')}
                </div>
            </div>
            <React.Suspense fallback={<div className="card card-glass" style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>{ t('marketing.aiDesignLoading', 'Loading AI Engine...') }</div>}>
                <AiDesignEngine defaultPlatform="popup" />
            </React.Suspense>
        </div>
    );
}

/* --- Main Marketing (General Performance) --- */
export default function Marketing() {

  const { t } = useI18n();
  const { addAlert } = useGlobalData();
  const [tab, setTab] = useState("overview");

  // SecurityGuard
  useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });

  /* BroadcastChannel Cross-Tab Sync */
  useEffect(() => {
      const handler = (msg) => { const { type } = msg?.data || msg; if (type === 'MKT_TAB_CHANGE') {} };
      if (_mktChannel) _mktChannel.onmessage = handler;
      const storageHandler = (e) => { if (e.key === '__mkt_sync__' && e.newValue) { try { handler(JSON.parse(e.newValue)); } catch {} } };
      window.addEventListener('storage', storageHandler);
      return () => { if (_mktChannel) _mktChannel.onmessage = null; window.removeEventListener('storage', storageHandler); };
  }, []);

  const TABS = useMemo(() => [
    { id: "overview", icon: '📊', label: t("marketing.mktTabOverview", "Overview") },
    { id: "ad_status", icon: '📂', label: t("marketing.mktTabAdStatus", "Ad Status") },
    { id: "creative", icon: '🎨', label: t("marketing.mktTabCreative", "Creative") },
    { id: "compare", icon: '⚡', label: t("marketing.mktTabCompare", "Compare") },
    { id: "ai_design", icon: '🤖', label: t("marketing.mktTabAiDesign", "AI Design") },
    { id: "guide", icon: '📖', label: t("marketing.mktTabGuide", "Guide") },
  ], [t]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1200, margin: '0 auto', width: '100%', flex: 1, minHeight: 0, color: '#1e293b', background: 'transparent' }}>

      {/* ══════ FIXED HEADER AREA (Hero + Sub-tabs) ══════ */}
      <div style={{ flexShrink: 0 }}>
        <AIRecommendBanner context="marketing" />

        {/* ── Hero Header ── */}
        <div className="hero" style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 300px' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #4f8ef7, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 14px rgba(79,142,247,0.3)', flexShrink: 0 }}>📊</div>
              <div style={{ minWidth: 0 }}>
                <div className="hero-title" style={{ fontSize: 19, fontWeight: 900, color: '#4f8ef7', letterSpacing: '-0.3px', lineHeight: 1.3 }}>{t("marketing.pageTitle")}</div>
                <div className="hero-desc" style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t("marketing.pageSub")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sub-Tab Navigation (fixed, always visible) ── */}
        <div className="sub-tab-nav" style={{ padding: '8px 14px', background: 'rgba(245,247,250,0.97)', borderBottom: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '6px 8px' }}>
            {TABS.map(tb => {
              const active = tab === tb.id;
              return (
                <button key={tb.id} onClick={() => { setTab(tb.id); broadcastMkt('MKT_TAB_CHANGE', tb.id); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)', background: active ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent', color: active ? '#ffffff' : '#64748b', boxShadow: active ? '0 3px 14px rgba(79,142,247,0.3)' : 'none', transform: active ? 'translateY(-1px)' : 'none' }}><span>{tb.icon}</span> {tb.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══════ SCROLLABLE CONTENT AREA ══════ */}
      <div className="fade-up" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 8px 28px' }}>

      {tab === "overview" && <AmazonOverviewTab />}
      {tab === "ad_status" && <AdStatusAnalysis />}
      {tab === "creative" && <CreativeAnalysisTab />}
      {tab === "compare" && <CampaignCompareTab />}
      {tab === "ai_design" && <AiDesignTab />}
      {tab === "guide" && <MarketingGuideTab />}
      </div>{/* end scrollable content */}
    </div>
  );
}

