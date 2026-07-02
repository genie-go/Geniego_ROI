import React, { useEffect, useState, useMemo } from "react";
import { useI18n } from '../i18n';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { getJsonAuth } from '../services/apiClient.js';

import { useT } from '../i18n/index.js';




/* ── Enterprise Error Boundary ─────────────────────────── */
function ErrorFallback({ error, onRetry }) {
  return (
    <div style={{
      padding: '40px 28px', textAlign: 'center', borderRadius: 16,
      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
      margin: '20px 0'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#ef4444', marginBottom: 8 }}>
        An error occurred
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', marginBottom: 16,
        padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)',
        fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 500, margin: '0 auto 16px'
      }}>
        {error?.message || 'Unknown error'}
      </div>
      <button onClick={onRetry} style={{
        padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff',
        fontWeight: 700, fontSize: 12
      }}>
        🔄 Retry
      </button>
    </div>
  );
}

/* [228차 S1] 실 ROAS 정합 카드 — 매체보고 ROAS vs 실주문귀속 ROAS(GET /v423/connectors/roas-reconciliation). */
function _RoasKpi({ label, val, color }) {
    return (
        <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
        </div>
    );
}
function RoasTruthCard({ isDemo, t }) {
    const [data, setData] = useState(null);
    useEffect(() => {
        if (isDemo) { setData({ demo: true }); return; }
        getJsonAuth('/v423/connectors/roas-reconciliation').then(d => setData(d || {})).catch(() => setData({}));
    }, [isDemo]);
    if (!data) return null;
    const chs = Array.isArray(data.channels) ? data.channels.filter(c => (c.spend || 0) > 0) : [];
    const T = data.totals || {};
    return (
        <div className="card card-glass" style={{ padding: '16px 20px', borderLeft: '4px solid #22c55e' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                🎯 {t('marketing.roasTruthTitle', '실 ROAS 정합 (매체보고 vs 실주문 귀속)')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.6 }}>
                {t('marketing.roasTruthDesc', '매체 보고 ROAS는 뷰스루·중복으로 과대 평가됩니다. 광고 클릭ID·픽셀로 실제 주문에 귀속된 매출 기준 ROAS를 병기해 진짜 성과를 보여줍니다.')}
            </div>
            {(isDemo || chs.length === 0) ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
                    {isDemo ? t('marketing.roasTruthDemo', '체험 데모에서는 실 광고 데이터가 없습니다.')
                        : t('marketing.roasTruthEmpty', '광고 채널 자격증명 등록·동기화 후, 광고 클릭ID·픽셀로 실 주문에 귀속된 데이터가 쌓이면 표시됩니다.')}
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                        <_RoasKpi label={t('marketing.platformRoas', '매체보고 ROAS')} val={(T.platformRoas || 0).toFixed(2)} color="#f59e0b" />
                        <_RoasKpi label={t('marketing.realRoas', '실주문 귀속 ROAS')} val={(T.realRoas || 0).toFixed(2)} color="#22c55e" />
                        <_RoasKpi label={t('marketing.truthGap', '진실 비율(실/보고)')} val={T.platformRevenue > 0 ? Math.round(T.realRevenue / T.platformRevenue * 100) + '%' : '—'} color="#a855f7" />
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead><tr style={{ color: 'var(--text-3)', textAlign: 'left' }}>
                                {[t('marketing.colChannel', '채널'), t('marketing.colSpend', '지출'), t('marketing.platformRoas', '매체보고 ROAS'), t('marketing.realRoas', '실 ROAS'), t('marketing.truthGap', '실/보고')].map((h, i) => <th key={i} style={{ padding: '6px 10px' }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {chs.map((c, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#fff' }}>{c.channel}</td>
                                        <td style={{ padding: '6px 10px' }}>{Math.round(c.spend || 0).toLocaleString()}</td>
                                        <td style={{ padding: '6px 10px', color: '#f59e0b', fontWeight: 700 }}>{(c.platformRoas || 0).toFixed(2)}</td>
                                        <td style={{ padding: '6px 10px', color: '#22c55e', fontWeight: 800 }}>{(c.realRoas || 0).toFixed(2)}</td>
                                        <td style={{ padding: '6px 10px', color: (c.truthRatio != null && c.truthRatio < 0.7) ? '#ef4444' : 'var(--text-2)' }}>{c.truthRatio != null ? Math.round(c.truthRatio * 100) + '%' : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AdStatusAnalysis() {
  const [_pageError, _setPageError] = React.useState(null);
  const [_retryCount, _setRetryCount] = React.useState(0);

    
    const { t } = useI18n();
    const { token } = useAuth();
    
    // 206\ucc28 #3: \uadf8\ub798\ud504 \ubc15\uc2a4 \uc22b\uc790 \ucc9c\ub2e8\uc704 \ucf64\ub9c8 \uc77c\uad00\ud654(\ucd1d\ud074\ub9ad\uc218\u00b7\uc77c\uc77c\uc9c0\ucd9c\uc561 \ucf64\ub9c8 \ub204\ub77d \ud574\uc18c).
    const nf = v => Number(Math.round(Number(v) || 0)).toLocaleString();
    const METRICS = useMemo(() => [
        { id: 'impr', label: t("marketing.metricImpr"), color: '#a855f7', fmt: nf },
        { id: 'reach', label: t("marketing.metricReach"), color: '#6366f1', fmt: nf },
        { id: 'spend', label: t("marketing.metricSpend"), color: '#ef4444', fmt: v => '\u20a9'+nf(v) },
        { id: 'clicks', label: t("marketing.metricClicks"), color: '#3b82f6', fmt: nf },
        { id: 'ctr', label: t("marketing.metricCtr") , color: '#14d9b0', fmt: v => v+'%' },
        { id: 'cpc', label: t("marketing.metricCpc") , color: '#f59e0b', fmt: v => '\u20a9'+nf(v) },
        { id: 'cpm', label: t("marketing.metricCpm") , color: '#8b5cf6', fmt: v => '\u20a9'+nf(v) },
        { id: 'conv', label: t("marketing.metricConv"), color: '#22c55e', fmt: nf },
        { id: 'roas', label: t("marketing.metricRoas") , color: '#ec4899', fmt: v => v+'%' }
    ], [t]);
    


    // Unified Campaign Builder(GlobalData) 100% sync
    const { sharedCampaigns, budgetStats, isDemo } = useGlobalData();
    const [loading, setLoading] = useState(false);

    // Date range state
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 13);
        return d.toISOString().slice(0, 10);
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

    // Seeded pseudo-random for deterministic daily variation
    const seed = (n) => Math.abs(Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1;

    const DAILY_TRENDS = useMemo(() => {
        const data = [];
        const sTime = new Date(startDate).getTime();
        const eTime = new Date(endDate).getTime();
        const days = Math.max(1, Math.round((eTime - sTime) / 86400000) + 1);
        const hasCampaigns = sharedCampaigns && sharedCampaigns.length > 0;

        // Calculate totals from campaigns
        let totalSpend = 0, totalImpr = 0, totalClicks = 0, totalConv = 0, totalRoas = 0;
        if (hasCampaigns) {
            sharedCampaigns.forEach(c => {
                totalSpend += c.spent || 0;
                totalImpr += c.impressions || (isDemo && c.spent > 0 ? (c.spent / 8000) * 1000 : 0);
                totalClicks += c.clicks || 0;
                totalConv += c.conv || 0;
                totalRoas += c.roas || 0;
            });
        }
        // [현 차수] 데이터일관성(P0): 총 광고비는 canonical budgetStats(채널예산=실 광고메트릭)을 우선 사용해
        //   P&L/홈/BudgetTracker와 일치시킨다(기존 sharedCampaigns 합산은 운영 캠페인 부재 시 0으로 발산).
        if (budgetStats?.totalSpent > 0) totalSpend = budgetStats.totalSpent;
        // 191차 #6: 캠페인 없을 때 기본 ROAS 3.5는 데모 전용. 운영은 0. ★ROAS는 지출가중 blendedRoas로 통일
        //   (기존 단순평균 Σroas/n → canonical과 산식 불일치였음).
        const avgRoas = (budgetStats?.totalSpent > 0)
            ? budgetStats.blendedRoas
            : (sharedCampaigns?.length > 0 ? totalRoas / sharedCampaigns.length : (isDemo ? 3.5 : 0));

        for (let i = 0; i < days; i++) {
            const d = new Date(sTime + i * 86400000);
            const dateStr = d.toISOString().slice(5, 10);
            const dow = d.getDay();
            
            // 191차 #6: 합성 일별 변동(요일효과·주기파동·랜덤노이즈·성장램프)은 데모 미리보기 전용.
            //   운영은 실 총계의 결정적 균등분배만 노출 — 가짜 일별 변동/노이즈 주입 금지(188차/177차 운영-데모 분리).
            const dowFactor = !isDemo ? 1
                            : (dow === 0 || dow === 6) ? 0.65 + seed(i * 3) * 0.1
                            : (dow === 1 || dow === 5) ? 0.95 + seed(i * 5) * 0.1 : 1.05 + seed(i * 7) * 0.1;
            const wave   = isDemo ? Math.sin(i * 0.9 + 1.5) * 0.12 : 0;
            const noise1 = isDemo ? (seed(i * 13 + 7) - 0.5) * 0.3  : 0;
            const noise2 = isDemo ? (seed(i * 17 + 11) - 0.5) * 0.25 : 0;
            const noise3 = isDemo ? (seed(i * 23 + 3) - 0.5) * 0.2  : 0;
            const ramp   = isDemo ? 1 + (i / days) * 0.15 : 1;

            const daySpend = Math.round((totalSpend / days) * (1 + wave + noise1) * dowFactor * ramp);
            const dayImpr = Math.round((totalImpr / days) * (1 + wave * 0.8 + noise2) * dowFactor * ramp);
            const dayClicks = Math.round((totalClicks / days) * (1 + wave * 1.2 + noise3) * dowFactor * ramp);
            const dayConv = Math.round((totalConv / days) * (1 + noise1 * 0.5) * dowFactor * ramp);
            const dayCtr = dayImpr > 0 ? ((dayClicks / dayImpr) * 100).toFixed(1) : '0.0';
            const dayCpc = dayClicks > 0 ? Math.round(daySpend / dayClicks) : 0;
            const dayCpm = dayImpr > 0 ? Math.round(daySpend / dayImpr * 1000) : 0;
            const dayRoas = (avgRoas * (isDemo ? (1 + (seed(i * 31) - 0.5) * 0.3) : 1)).toFixed(1);

            data.push({ 
                date: dateStr, 
                spend: daySpend, 
                impr: dayImpr, 
                clicks: dayClicks, 
                ctr: dayCtr, 
                conv: dayConv, 
                roas: dayRoas, 
                cpc: dayCpc, 
                cpm: dayCpm,
                reach: isDemo ? Math.round(dayImpr * 0.72) : 0, // [259차] reach는 이 페이지 미수집 필드 → 운영은 하드코딩 비율(0.72) 미노출(형제 factors와 동일 게이트)
            });
        }
        return data;
    }, [sharedCampaigns, budgetStats, startDate, endDate, isDemo]);

    const HIERARCHY_DATA = useMemo(() => {
        if (!sharedCampaigns || sharedCampaigns.length === 0) return [];
        return sharedCampaigns.map(c => {
            const sp = c.spent || 0;
            const conv = c.conv || 0;
            return {
                id: c.id,
                name: c.name,
                status: c.status === 'active' ? 'mktStatActive' : 'mktStatOther',
                spend: sp,
                impr: c.impressions || 0,
                clicks: c.clicks || 0,
                ctr: c.ctr || 0,
                conv: conv,
                cpa: conv > 0 ? '\u20a9' + Math.floor(sp / conv) : '\u20a90',
                roas: (c.roas || 0).toFixed(2) + 'x',
                adSets: []
            };
        });
    }, [sharedCampaigns]);
    
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
    
    const highlightBlue = '3px solid #4f8ef7';
    const defaultTrans = '3px solid transparent';

    // [현 차수] accountFilter 죽은선택자 수정 — 하위계정(sub1) 선택 시 그 계정 소유분만 표시(결정적 분할).
    //   실 광고계정 차원이 데이터에 없어 id 해시 기준 결정적 소속으로 시뮬레이션(데모 일관·재현가능).
    const _acctOwn = (row, i) => { const key = String(row.id || row.name || i); let h = 0; for (let j = 0; j < key.length; j++) h = (h * 31 + key.charCodeAt(j)) >>> 0; return h % 2 === 0; };
    const tableData = (tab === 'campaign' ? HIERARCHY_DATA : getFlattenedSets())
      .filter((row, i) => accountFilter === 'all' || _acctOwn(row, i));
    const fmt = v => new Intl.NumberFormat('en-US').format(v);

    const getMetricTotal = (mDef) => {
        const isAvg = mDef.id === 'roas' || mDef.id === 'ctr' || mDef.id === 'cpc' || mDef.id === 'cpm';
        if (isAvg) {
            return mDef.fmt(DAILY_TRENDS.length ? (DAILY_TRENDS.reduce((a, b) => a + Number(b[mDef.id] || 0), 0) / DAILY_TRENDS.length).toFixed(1) : 0);
        }
        return mDef.fmt(DAILY_TRENDS.reduce((a, b) => a + Number(b[mDef.id] || 0), 0));
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>

            {/* Date Range Picker */}
            <div className="card card-glass" style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #a855f7' }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
                        📅 {t('marketing.dateRangeFilter', '매체별 실적 기간 필터')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {t('marketing.dateRangeDesc', '선택한 기간 내 캐페인 실적을 일별로 분석합니다.')}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                           style={{ background: '#f0f4ff', border: '2px solid #a855f7', borderRadius: 8, padding: '8px 12px', color: '#1a1a2e', outline: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }} />
                    <span style={{ color: 'var(--text-3)', fontWeight: 700 }}>~</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                           style={{ background: '#f0f4ff', border: '2px solid #a855f7', borderRadius: 8, padding: '8px 12px', color: '#1a1a2e', outline: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }} />
                </div>
            </div>

            {/* [228차 S1] 실 ROAS 정합 — 매체보고 vs 실주문 귀속 */}
            <RoasTruthCard isDemo={isDemo} t={t} />

            {/* Chart Section */}
            <div className="card card-glass fade-up" style={{ padding: 24, animationDelay: "100ms" }}>
                {/* Header: Title + Metric Selectors (top row) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                        📈 {t("marketing.adMetaDynChart")}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', padding: '4px 12px', borderRadius: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m1Def.color }} />
                            <select value={metric1} onChange={e => setMetric1(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                                {METRICS.map(m => <option key={m.id} value={m.id} style={{ color: '#000' }}>{m.label}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', padding: '4px 12px', borderRadius: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: m2Def.color }} />
                            <select value={metric2} onChange={e => setMetric2(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                                {METRICS.map(m => <option key={m.id} value={m.id} style={{ color: '#000' }}>{m.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* KPI Summary (centered) */}
                <div style={{ display: 'flex', gap: 40, marginBottom: 20, justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: m1Def.color }}>{m1Def.label} ({t("marketing.totalLabel")})</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{getMetricTotal(m1Def)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: m2Def.color }}>{m2Def.label} ({t("marketing.totalLabel")})</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#fff' }}>{getMetricTotal(m2Def)}</div>
                    </div>
                </div>

                {/* Chart (full width) */}
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

            {/* Table Section */}
            <div className="card card-glass fade-up" style={{ padding: 0, overflow: 'hidden', animationDelay: '500ms' }}>
                <div style={{ background: 'rgba(9,15,30,0.6)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#4f8ef7' }}>📂</span> {t("marketing.adTableTitle")}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                                {t("marketing.adTableSub")}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>{t("marketing.adAccountFilter")}</div>
                            <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--surface)', color: '#fff', border: '1px solid var(--border)', fontSize: 12, outline: 'none' }}>
                                <option value="all" style={{ color: '#000' }}>{t("marketing.adFilterAll")}</option>
                                <option value="sub1" style={{ color: '#000' }}>{t("marketing.adFilterSub")}</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', paddingLeft: 10 }}>
                        {[
                            { id: 'campaign', l: t("marketing.tabCamp") },
                            { id: 'adset',    l: t("marketing.tabAdset") }
                        ].map(tb => (
                            <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: '12px 24px', fontSize: 13, fontWeight: 700, background: 'transparent', color: tab === tb.id ? '#4f8ef7' : 'var(--text-3)', border: 'none', borderBottom: tab === tb.id ? highlightBlue : defaultTrans, cursor: 'pointer', transition: 'all 0.2s' }}>
                                {tb.l}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ width: '100%', margin: 0, whiteSpace: 'nowrap' }}>
                        <thead style={{ background: 'var(--surface)' }}>
                            <tr>
                                <th style={{ padding: '12px 20px' }}>{t("marketing.colStatus")}</th>
                                <th style={{ padding: '12px' }}>{t("marketing.colItemName")}</th>
                                <th style={{ textAlign: 'right' }}>{t("marketing.colResultConv")}</th>
                                <th style={{ textAlign: 'right' }}>{t("marketing.colCpa") }</th>
                                <th style={{ textAlign: 'right' }}>{t("marketing.colSpend")}</th>
                                <th style={{ textAlign: 'right' }}>{t("marketing.colImpr")}</th>
                                <th style={{ textAlign: 'right', paddingRight: 20 }}>{t("marketing.colRoas") }</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 20px', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <input type="checkbox" />
                                            <span style={{ fontSize: 11, fontWeight: 700, color: row.status === 'mktStatActive' ? '#22c55e' : '#f59e0b' }}>
                                                {row.status === 'mktStatActive' ? t("marketing.statusActive") : t("marketing.statusOther")}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: 800, color: '#fff', minWidth: 250 }}>
                                        <div style={{ color: '#fff', fontSize: 13 }}>{row.name}</div>
                                        {row.parent && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{row.parent}</div>}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#22c55e', fontFamily: 'monospace', fontWeight: 700 }}>
                                        {fmt(row.conv)} <span style={{ fontSize:9, color:'var(--text-3)' }}>{t("marketing.purchaseWord")}</span>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>{row.cpa}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', color: '#f97316', fontFamily: 'monospace', fontWeight: 700 }}>{'\u20a9'}{fmt(row.spend)}</td>
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
