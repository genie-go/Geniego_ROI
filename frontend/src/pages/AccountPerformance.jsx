/**
 * ┌──────────────────────────────────────────────────────────┐
 * │  AccountPerformance — Enterprise Light-Theme Module      │
 * │  ────────────────────────────────────────────────────────│
 * │  • CampaignManager-grade sticky header + sub-tabs       │
 * │  • Zero dark mode residue (light-first design)          │
 * │  • Full 12-language i18n (acctPerf namespace)           │
 * │  • GlobalDataContext real-time sync                     │
 * │  • SecurityGuard integration                            │
 * └──────────────────────────────────────────────────────────┘
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '../i18n';
import { tChannelName } from '../utils/tenantStorage.js';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import {
    AreaChart, Area, BarChart, Bar, Cell,
    XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useSecurityGuard, sanitizeInput } from '../security/SecurityGuard.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { IS_DEMO } from '../utils/demoEnv';

/* ─── BroadcastChannel Cross-Tab Sync ─── */
/* [현 차수] 기존 채널 'geniego-acctperf-sync' 는 전역 발신자 0건, 청취하던 'AP_REFRESH'/'__ap_sync__'
 *   도 발신자 0건, 그리고 수신 시 세팅하던 lastRefresh 는 어디서도 읽히지 않아 삼중으로 죽어 있었다.
 *   실발신자가 있는 공용 채널(genie_connector_sync — ApiKeys::publishConnectorSync)을 구독하고,
 *   lastRefresh 를 실제 재조회 트리거로 연결해 크로스탭 즉시반영을 복구한다. */
/*   ★모듈 레벨 생성 금지(tenantStorage.js:46) — tChannelName 은 테넌트 확정 후 effect 안에서만 호출한다.
 *   과거 모듈 레벨 `new BroadcastChannel('geniego-acctperf-sync')` 는 테넌트 스코프도 없었다. */
const AP_SYNC_CH = 'genie_connector_sync';

/* ─── Enterprise Light Card Style ─── */
const CARD = {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

/* ─── Tab Colors ─── */
const TAB_CLR = { dashboard: '#4f8ef7', drilldown: '#a855f7', guide: '#06b6d4' };

/* ─── Glassmorphic Tooltip (light-compatible) ─── */
const GlassTooltip = ({ active, payload, label, currFmt }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
            <p style={{ margin: '0 0 6px', color: '#1e293b', fontWeight: 700, fontSize: 12, letterSpacing: 0.3 }}>{label}</p>
            {payload.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                    <span style={{ color: '#64748b', fontSize: 11 }}>{e.name}:</span>
                    <span style={{ color: '#1e293b', fontWeight: 700, fontSize: 12 }}>{currFmt ? currFmt(e.value) : Number(e.value).toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
};

/* ─── Status Badge ─── */
const StatusBadge = ({ status, t }) => {
    const isActive = status === 'active';
    return (
        <span style={{
            padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 0.5,
            background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
            color: isActive ? '#16a34a' : '#d97706',
            border: `1px solid ${isActive ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
            {isActive ? (t?.('acctPerf.statusActive', 'Active') || 'Active') : (status || '—')}
        </span>
    );
};

/* ─── Spend Sparkline ─── */
const SpendSpark = ({ value, max }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pct > 90 ? '#ef4444' : pct > 70 ? '#f97316' : '#4f8ef7', borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function AccountPerformance() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { token } = useAuth();

    /* ─ State ─ */
    const [expandedCampaigns, setExpandedCampaigns] = useState({});
    const [expandedAdSets, setExpandedAdSets] = useState({});
    const [activeTab, setActiveTab] = useState('dashboard');
    const [realCampaigns, setRealCampaigns] = useState([]);
    const [lastRefresh, setLastRefresh] = useState(Date.now());

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
    }, [activeTab]);

    /* ─ Date Range State ─ */
    const today = new Date().toISOString().slice(0, 10);
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(today);

    /* ─ Date Input Style ─ */
    const dateInputStyle = {
        padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.25)',
        background: 'rgba(79,142,247,0.06)', color: '#1e293b', fontSize: 12, fontWeight: 600,
        outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
    };

    /* ─ Toggles ─ */
    const toggleCampaign = useCallback((id) => setExpandedCampaigns(p => ({ ...p, [id]: !p[id] })), []);
    const toggleAdSet = useCallback((id) => setExpandedAdSets(p => ({ ...p, [id]: !p[id] })), []);

    /* ─ SecurityGuard ─ */
    const securityCallback = useCallback((alert) => {}, []);
    useSecurityGuard({ addAlert: securityCallback, enabled: true });

    /* ─ ConnectorSync ─ */
    const { isConnected } = useConnectorSync();

    /* ─ BroadcastChannel ─ */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        let ch = null;
        try {
            ch = new BroadcastChannel(tChannelName(AP_SYNC_CH));
            ch.onmessage = (msg) => {
                const type = msg?.data?.type;
                if (type === 'CHANNEL_REGISTERED' || type === 'CHANNEL_REMOVED') setLastRefresh(Date.now());
            };
        } catch { /* BroadcastChannel 미지원 환경 무음 */ }
        return () => { try { ch?.close(); } catch { /* BroadcastChannel 정리 실패 무시 */ } };
    }, []);

    /* ─ API Fetch ─ */
    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        fetch('/api/performance/meta-ads', {
            headers: { Authorization: `Bearer ${token}`, 'X-Request-Module': 'AccountPerformance' },
            signal: controller.signal
        })
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(data => { if (data?.ok) { setRealCampaigns(data.campaigns || []); setLastRefresh(Date.now()); } })
            .catch(() => {});
        return () => controller.abort();
        // [현 차수] lastRefresh 를 의존성에 편입 — 크로스탭 자격증명 변경 시 실제 재조회(기존엔 setter 만
        //   존재하고 읽는 곳이 없어 동기화가 무동작이었다).
    }, [token, lastRefresh]);

    /* ─ Real-Time Sync ─ */
    const { sharedCampaigns } = useGlobalData();

    /* ─ Demo 캠페인: 단일소스 sharedCampaigns(DEMO_CAMPAIGNS)에서 adset/ad 트리 파생 ─
       204차 동기화: 과거 독립 하드코딩 DEMO_META_CAMPAIGNS(CampaignManager 와 다른 캠페인·Math.random)를 제거.
       캠페인을 채널별 adset 으로 분할(예산 비례 spend/imp/clicks/conv), adset 당 1 ad. history 는 결정적(비랜덤).
       → 광고성과 메뉴가 캠페인 관리 메뉴와 동일 캠페인·수치로 정합. */
    const DEMO_META_CAMPAIGNS = useMemo(() => {
        const src = (sharedCampaigns || []).filter(c => Number(c.spent || c.spend || 0) > 0);
        const wave = (i) => 1 + 0.22 * Math.sin(i * 0.8 + 0.3);
        return src.slice(0, 6).map((c, ci) => {
            const spend = Number(c.spent || c.spend || 0);
            const roas = Number(c.roas || 0);
            const revenue = Number(c.revenue != null ? c.revenue : spend * roas);
            const impressions = Number(c.impressions || 0);
            const clicks = Number(c.clicks || 0);
            const conv = Number(c.conv || c.conversions || 0);
            const budget = Number(c.budget || spend); // [현 차수] 임의계수(spend*1.3) 폴백 제거 — 실 예산 부재 시 실지출=배정(정직). 백엔드 AdPerformance 와 대칭.
            const chans = (Array.isArray(c.channels) && c.channels.length) ? c.channels : [{ id: 'meta', name: 'Meta', budget: spend }];
            const totB = chans.reduce((s, ch) => s + Number(ch.budget || 1), 0) || 1;
            const adsets = chans.slice(0, 3).map((ch, ai) => {
                const w = Number(ch.budget || 1) / totB;
                const aSpend = Math.round(spend * w), aImp = Math.round(impressions * w), aClk = Math.round(clicks * w), aConv = Math.round(conv * w);
                return {
                    id: `as-${ci + 1}${ai}`, name: `${ch.name || ch.id} — ${ai === 0 ? '핵심 타겟' : '확장 타겟'}`, status: 'active',
                    spend: aSpend, roas, impressions: aImp, clicks: aClk, ctr: aImp > 0 ? +(aClk / aImp * 100).toFixed(2) : 0, conv: aConv,
                    ads: [{ id: `ad-${ci + 1}${ai}0`, name: `${c.name} — ${ch.name || ch.id} 소재`, status: 'active', spend: aSpend, roas, impressions: aImp, clicks: aClk, ctr: aImp > 0 ? +(aClk / aImp * 100).toFixed(2) : 0, conv: aConv }],
                };
            });
            return {
                id: c.id || `mc-${ci + 1}`, name: c.name, status: c.status || 'active',
                account_team: ['Korea Team', 'Japan Team', 'USA Team', 'Europe Team'][ci % 4],
                // 206차 #4: 캠페인 type → 마케팅 퍼널 objective(인지/고려/전환) 매핑.
                //   기존 objective=c.type(brand/performance 등)가 Awareness/Consideration/Conversion 3버킷과
                //   미매칭 → 시각화 대시보드 카드·목표기반 차트가 전부 빈값이던 문제 해소.
                objective: ({ brand:'Awareness', seasonal:'Awareness', influencer:'Awareness', launch:'Awareness',
                    acquisition:'Consideration', channel_boost:'Consideration', discovery:'Consideration',
                    performance:'Conversion', retargeting:'Conversion', conversion:'Conversion' }[c.type]) || 'Conversion',
                spend, roas, revenue, impressions, clicks, ctr: impressions > 0 ? +(clicks / impressions * 100).toFixed(2) : 0, conv, budget,
                adsets,
                history: Array.from({ length: 14 }, (_, i) => ({ date: new Date(Date.now() - i * 864e5).toISOString().slice(5, 10), spend: Math.round(spend / 14 * wave(i)) })),
            };
        });
    }, [sharedCampaigns]);

    /* ─ Demo Mode Detection (180차: demoEnv 정본 격리, broad includes('demo')·__DEMO_MODE__ 제거) ─ */
    const isDemoMode = IS_DEMO;

    const currentCampaigns = useMemo(() => {
        if (sharedCampaigns?.length > 0 && sharedCampaigns.some(c => c.adsets || c.adSets)) return sharedCampaigns;
        if (realCampaigns?.length > 0) return realCampaigns;
        // Only show demo fallback data in demo environment — NEVER in production
        if (isDemoMode) return DEMO_META_CAMPAIGNS;
        return [];
    }, [sharedCampaigns, realCampaigns, DEMO_META_CAMPAIGNS, isDemoMode]);

    /* ─ Normalized Data ─ */
    // [현 차수] 죽은 dateFrom/dateTo 선택자 수정 — 광고 데이터 일자 부재 → 30일 기준 런레이트 비례 스코프(비율 보존).
    const periodFactor = useMemo(() => {
        const wd = Math.max(1, Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1);
        return Math.min(1, Math.max(0.02, wd / 30));
    }, [dateFrom, dateTo]);
    const ACTIVE_META_DATA = useMemo(() => {
        if (!currentCampaigns.length) return [];
        const f = periodFactor;
        return currentCampaigns.map(c => {
            const teamName = c.account_team || c.team || t('acctPerf.defaultTeam', 'Operations');
            const objective = c.objective || 'Conversion';
            const cSpend = (c.spend || c.spent || c.budget || 0) * f;
            const alct = (c.budget ? (typeof c.budget === 'string' ? parseFloat(c.budget.replace(/[^0-9.]/g, '')) : c.budget) : (c.spend || c.spent || 0)) * f;
            const roasVal = typeof c.roas === 'string' ? parseFloat(c.roas.replace(/[^0-9.]/g, '')) : (c.roas || 0);
            return {
                ...c, account_team: sanitizeInput(teamName), objective, roas: roasVal,
                spend: Math.round(cSpend), allocated: Math.round(alct), impressions: Math.round((c.impressions || 0) * f), clicks: Math.round((c.clicks || 0) * f),
                ctr: c.ctr || 0, conv: Math.round((c.conv || 0) * f), adSets: c.adsets || c.adSets || []
            };
        });
    }, [currentCampaigns, t, periodFactor]);

    const maxSpend = useMemo(() => Math.max(...ACTIVE_META_DATA.map(c => c.spend), 1), [ACTIVE_META_DATA]);

    /* ─ Chart Data ─ [현 차수] 그래프도 dateFrom/dateTo 에 반응(윈도우 길이 + 크기). 실 history 우선,
        없으면(데모) 기간계수 적용된 ACTIVE_META_DATA 의 objective 총액을 윈도우 일수만큼 결정적 분배(합계≈총액). */
    const chartData = useMemo(() => {
        const end = new Date(dateTo); const sTime = new Date(dateFrom).getTime();
        const windowDays = Math.min(60, Math.max(1, Math.round((end.getTime() - sTime) / 864e5) + 1));
        const real = []; let hasHistory = false;
        for (let i = windowDays - 1; i >= 0; i--) {
            const dStr = new Date(end.getTime() - i * 864e5).toISOString().slice(5, 10);
            let aw = 0, cons = 0, cv = 0;
            currentCampaigns.forEach(c => {
                if (c.history && Array.isArray(c.history)) {
                    hasHistory = true;
                    const dayData = c.history.find(h => h.date === dStr);
                    if (dayData) {
                        if (c.objective === 'Awareness') aw += dayData.spend || 0;
                        if (c.objective === 'Consideration') cons += dayData.spend || 0;
                        if (c.objective === 'Conversion') cv += dayData.spend || 0;
                    }
                }
            });
            real.push({ date: dStr, awareness: Math.floor(aw), consideration: Math.floor(cons), conversion: Math.floor(cv) });
        }
        if (hasHistory) return real;
        // [정밀감사] 실 일별 history 부재 시 합성 추이는 데모 전용 — 운영은 가짜 일별 모양을 그리지 않고
        //   빈 배열 반환(239차 DashChannelKPI/DashMarketing IS_DEMO?sin:1 게이트와 동일 클래스 정합).
        //   운영에서 차트는 "일별 추이 데이터 없음"으로 정직 표시(총합 KPI는 별도 실값 유지).
        if (!isDemoMode) return [];
        // 데모 합성 — objective별 (기간 스코프된) 총액을 윈도우 일수에 결정적 분배
        const tot = { Awareness: 0, Consideration: 0, Conversion: 0 };
        ACTIVE_META_DATA.forEach(c => { if (tot[c.objective] != null) tot[c.objective] += c.spend; });
        if (tot.Awareness + tot.Consideration + tot.Conversion <= 0) return [];
        const w = []; let sw = 0;
        for (let i = 0; i < windowDays; i++) { const v = 1 + 0.3 * Math.sin(i * 0.7 + 0.4); w.push(v); sw += v; }
        return Array.from({ length: windowDays }, (_, i) => ({
            date: new Date(end.getTime() - (windowDays - 1 - i) * 864e5).toISOString().slice(5, 10),
            awareness: Math.round(tot.Awareness * w[i] / sw),
            consideration: Math.round(tot.Consideration * w[i] / sw),
            conversion: Math.round(tot.Conversion * w[i] / sw),
        }));
    }, [currentCampaigns, ACTIVE_META_DATA, dateFrom, dateTo]);

    /* ─ Objective Aggregates ─ */
    const objAggregates = useMemo(() => {
        const agg = { Awareness: { spend: 0, roas: 0, count: 0 }, Consideration: { spend: 0, roas: 0, count: 0 }, Conversion: { spend: 0, roas: 0, count: 0 } };
        // [227차 감사 P2] objective별 ROAS = 지출가중(Σroas×spend/Σspend) — 단순평균은 소액·고ROAS 캠페인이
        //   과대반영돼 왜곡(191차 AdStatusAnalysis blendedRoas 패턴 정합).
        ACTIVE_META_DATA.forEach(c => { if (agg[c.objective]) { agg[c.objective].spend += c.spend; agg[c.objective].roas += c.roas * c.spend; agg[c.objective].count++; } });
        Object.keys(agg).forEach(k => { agg[k].roas = agg[k].spend > 0 ? agg[k].roas / agg[k].spend : 0; });
        return agg;
    }, [ACTIVE_META_DATA]);

    /* ─ Team Budget ─ */
    const teamBudget = useMemo(() => {
        if (!ACTIVE_META_DATA.length) return [];
        const map = {};
        ACTIVE_META_DATA.forEach(c => {
            const tn = c.account_team;
            if (!map[tn]) map[tn] = { team: tn, allocated: 0, spent: 0 };
            map[tn].allocated += c.allocated;
            map[tn].spent += c.spend;
        });
        return Object.values(map).map(c => ({ ...c, remaining: c.allocated - c.spent }));
    }, [ACTIVE_META_DATA]);

    /* ─ AI Insights ─ */
    const aiInsights = useMemo(() => {
        if (!ACTIVE_META_DATA.length) return [];
        const insights = [];
        const teams = {};
        ACTIVE_META_DATA.forEach(c => {
            const tn = c.account_team;
            if (!teams[tn]) teams[tn] = { spend: 0, rev: 0, conv: 0, count: 0 };
            // [현 차수 P1] 팀 ROAS는 지출가중(Σ매출/Σ지출)이어야 — 단순평균은 소액 고ROAS 캠페인이 팀 평균을
            //   끌어올려 저효율 팀에 '예산 증액' 오추천을 냈다(objAggregates 는 이미 지출가중, aiInsights만 잔존).
            teams[tn].spend += (c.spend || 0); teams[tn].rev += (c.roas || 0) * (c.spend || 0); teams[tn].conv += c.conv; teams[tn].count++;
        });
        Object.entries(teams).forEach(([team, data]) => {
            const avgRoas = data.spend > 0 ? data.rev / data.spend : 0;
            if (avgRoas >= 4) insights.push({ team, type: 'success', message: `${team}: ROAS ${avgRoas.toFixed(1)}x — ${t('acctPerf.aiInsightHigh', 'Top performer. Budget increase recommended.')}` });
            else if (avgRoas > 0 && avgRoas < 2) insights.push({ team, type: 'warning', message: `${team}: ROAS ${avgRoas.toFixed(1)}x — ${t('acctPerf.aiInsightLow', 'Low efficiency. Creative refresh needed.')}` });
        });
        return insights;
    }, [ACTIVE_META_DATA, t]);

    const TABS = useMemo(() => [
        { id: 'dashboard', label: t('acctPerf.tabDashboard', 'Dashboard'), icon: '📊' },
        { id: 'drilldown', label: t('acctPerf.tabDrilldown', 'Drilldown'), icon: '🌳' },
        { id: 'guide', label: t('acctPerf.tabGuide', 'Guide'), icon: '📖' },
    ], [t]);

    const CONTENT_MIN = 'calc(100vh - 145px)';
    const showDatePicker = activeTab !== 'guide';

    /* ═══ RENDER ═══ */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', width: '100%' }}>

            {/* ── Sticky Hero Header (Dashboard pattern) ── */}
            <div ref={heroRef} style={{ padding: '18px 22px', position: 'sticky', top: 0, zIndex: 30, background: 'var(--bg, #ffffff)', borderBottom: '1px solid var(--border, #e5e7eb)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(79,142,247,0.15), rgba(79,142,247,0.05))', border: '1px solid rgba(79,142,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📘</div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#4f8ef7', letterSpacing: '-0.3px' }}>{t('acctPerf.pageTitle', 'Account Performance')}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3, #9ca3af)', marginTop: 2 }}>{t('acctPerf.pageSub', 'Team/Account Budget Dashboard · Meta Ads Hierarchy')}</div>
                        </div>
                    </div>
                    {/* ── Date Range Picker (hidden on Guide tab) ── */}
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

            {/* ── Sticky Sub-Tabs (Dashboard pattern: top = heroHeight) ── */}
            <div style={{ position: 'sticky', top: heroHeight, zIndex: 29, background: 'var(--bg, #ffffff)', padding: '4px 4px 0', borderBottom: '1px solid var(--border, #e5e7eb)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--surface, rgba(255,255,255,0.95))', border: '1px solid var(--border, #e5e7eb)', borderRadius: 14, padding: '8px 10px' }}>
                    {TABS.map(tb => {
                        const active = activeTab === tb.id;
                        const c = TAB_CLR[tb.id];
                        return (
                            <button key={tb.id} onClick={() => setActiveTab(tb.id)} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700,
                                transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                                background: active ? c : 'transparent',
                                color: active ? '#ffffff' : 'var(--text-2, #4b5563)',
                                boxShadow: active ? `0 4px 20px ${c}40` : 'none',
                                transform: active ? 'translateY(-1px)' : 'none' }}><span style={{ fontSize: 14 }}>{tb.icon}</span> {tb.label}</button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Content (independent scroll) ── */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '20px 22px 60px' }}>

            {/* ══ DASHBOARD TAB ══ */}
            {activeTab === 'dashboard' && (
                <div style={{ display: 'grid', gap: 16, minHeight: CONTENT_MIN, alignContent: 'start' }}>

                    {/* Team Budget Chart */}
                    <div style={{ ...CARD, padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, color: '#1e293b' }}>📊 {t('acctPerf.teamDashboard', 'Team/Account Budget Dashboard')}</div>
                        {teamBudget.length > 0 ? (
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={teamBudget} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                        <XAxis dataKey="team" stroke="#94a3b8" fontSize={12} fontWeight={700} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                                        <RechartsTooltip content={<GlassTooltip currFmt={fmt} />} />
                                        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10, color: '#334155' }} />
                                        <Bar dataKey="allocated" name={t('acctPerf.budgetAllocated', 'Budget Allocated')} fill="rgba(79,142,247,0.6)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                        <Bar dataKey="spent" name={t('acctPerf.budgetSpent', 'Budget Spent')} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                            {teamBudget.map((entry, i) => (
                                                <Cell key={`cell-${i}`} fill={entry.spent > entry.allocated ? '#ef4444' : '#f97316'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('acctPerf.noData', 'No data available.')}</div>
                        )}
                    </div>

                    {/* Objectives Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {[
                            { title: t('acctPerf.objectiveAwareness', 'Awareness'), obj: objAggregates.Awareness, color: '#4f8ef7' },
                            { title: t('acctPerf.objectiveConsideration', 'Consideration'), obj: objAggregates.Consideration, color: '#a855f7' },
                            { title: t('acctPerf.objectiveConversion', 'Conversion'), obj: objAggregates.Conversion, color: '#22c55e' }
                        ].map((col, idx) => (
                            <div key={idx} style={{ ...CARD, padding: 24, borderTop: `3px solid ${col.color}` }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: col.color, marginBottom: 12 }}>{col.title}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('acctPerf.kpiSpend', 'Total Spend')}</div>
                                        <div style={{ fontSize: 24, fontWeight: 900, color: '#1e293b' }}>{fmt(col.obj.spend)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('acctPerf.avgRoas', 'Avg ROAS')}</div>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: col.color }}>{col.obj.count > 0 ? col.obj.roas.toFixed(2) : '0.00'}x</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Revenue Tracking Chart */}
                    <div style={{ ...CARD, padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, color: '#1e293b' }}>📈 {t('acctPerf.revenueTracking', 'Objective-Based Revenue Tracking')}</div>
                        {chartData.length > 0 ? (
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="apColorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                                            <linearGradient id="apColorAware" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3} /><stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} /></linearGradient>
                                            <linearGradient id="apColorCons" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickMargin={10} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v} />
                                        <RechartsTooltip content={<GlassTooltip currFmt={fmt} />} />
                                        <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, marginTop: 10, color: '#334155' }} />
                                        <Area type="monotone" name={t('acctPerf.convRev', 'Conversion Revenue')} dataKey="conversion" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#apColorConv)" isAnimationActive={false} />
                                        <Area type="monotone" name={t('acctPerf.awareRev', 'Awareness Revenue')} dataKey="awareness" stroke="#4f8ef7" strokeWidth={3} fillOpacity={1} fill="url(#apColorAware)" isAnimationActive={false} />
                                        <Area type="monotone" name={t('acctPerf.consRev', 'Consideration Revenue')} dataKey="consideration" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#apColorCons)" isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{t('acctPerf.noData', 'No data available.')}</div>
                        )}
                    </div>

                    {/* AI Strategic Insights */}
                    {aiInsights.length > 0 && (
                        <div style={{ ...CARD, padding: 24 }}>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: '#1e293b' }}>💡 {t('acctPerf.aiInsightTitle', 'AI Strategic Insights')}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>{t('acctPerf.aiInsightDesc', 'Team-level strategy analysis aligned to objectives')}</div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                {aiInsights.map((ins, i) => (
                                    <div key={i} style={{ padding: '10px 16px', borderRadius: 8, background: ins.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${ins.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`, fontSize: 12, color: ins.type === 'success' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                                        {ins.type === 'success' ? '✅' : '⚠️'} {ins.message}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══ DRILLDOWN TAB ══ */}
            {activeTab === 'drilldown' && (
                <div style={{ ...CARD, padding: 0, overflow: 'hidden', minHeight: CONTENT_MIN }}>
                    <div style={{ background: 'rgba(240,245,255,0.6)', padding: '16px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#4f8ef7' }}>{t('acctPerf.hierarchyTitle', 'Campaign → Ad Set → Ad (Hierarchy Analysis)')}</div>
                        <div style={{ fontSize: 11, color: '#7a90ad', marginTop: 4 }}>{t('acctPerf.hierarchyDesc', 'Click a row to drill down to micro-level metrics.')}</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', margin: 0, minWidth: 1050, fontSize: 13 }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ padding: '14px 16px 14px 24px', textAlign: 'left', minWidth: 260, fontSize: 12, fontWeight: 700, color: '#64748b' }}>{t('acctPerf.colStruct', 'Structure')}</th>
                                    <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b' }}>{t('acctPerf.colTeam', 'Team')}</th>
                                    <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#64748b' }}>{t('acctPerf.colStatus', 'Status')}</th>
                                    <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 110 }}>{t('acctPerf.colSpend', 'Spend')}</th>
                                    <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 70 }}>{t('acctPerf.colRoas', 'ROAS')}</th>
                                    <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 100 }}>{t('acctPerf.colImpr', 'Impressions')}</th>
                                    <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 80 }}>{t('acctPerf.colClicks', 'Clicks')}</th>
                                    <th style={{ padding: '14px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 60 }}>{t('acctPerf.colCtr', 'CTR(%)')}</th>
                                    <th style={{ padding: '14px 24px 14px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 70 }}>{t('acctPerf.colConv', 'Conversions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ACTIVE_META_DATA.length === 0 ? (
                                    <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{t('acctPerf.noData', 'No data available.')}</td></tr>
                                ) : ACTIVE_META_DATA.map(campaign => (
                                    <React.Fragment key={campaign.id}>
                                        <tr onClick={() => toggleCampaign(campaign.id)} style={{ cursor: 'pointer', background: expandedCampaigns[campaign.id] ? 'rgba(79,142,247,0.06)' : '#fff', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '12px 24px', fontWeight: 700, fontSize: 13, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 10, color: '#4f8ef7', transition: 'transform 0.2s', transform: expandedCampaigns[campaign.id] ? 'rotate(90deg)' : 'none' }}>▶</span>
                                                📁 {campaign.name}
                                                <span style={{ fontSize: 10, padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, marginLeft: 6, color: '#64748b' }}>{campaign.objective}</span>
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: 11, color: '#64748b', padding: '14px 12px' }}>{campaign.account_team}</td>
                                            <td style={{ textAlign: 'center', padding: '14px 12px' }}><StatusBadge status={campaign.status} t={t} /></td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#ea580c', padding: '14px 12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                                    {fmt(campaign.spend)}
                                                    <SpendSpark value={campaign.spend} max={maxSpend} />
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: campaign.roas >= 4 ? '#16a34a' : '#4f8ef7', padding: '14px 12px' }}>{campaign.roas.toFixed(2)}x</td>
                                            <td style={{ textAlign: 'right', color: '#334155', padding: '14px 12px' }}>{campaign.impressions.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', color: '#334155', padding: '14px 12px' }}>{campaign.clicks.toLocaleString()}</td>
                                            <td style={{ textAlign: 'right', color: '#64748b', padding: '14px 12px' }}>{campaign.ctr.toFixed(2)}%</td>
                                            <td style={{ textAlign: 'right', color: '#16a34a', padding: '14px 24px 14px 12px' }}>{campaign.conv.toLocaleString()}</td>
                                        </tr>

                                        {expandedCampaigns[campaign.id] && campaign.adSets.map(adSet => (
                                            <React.Fragment key={adSet.id}>
                                                <tr onClick={() => toggleAdSet(adSet.id)} style={{ cursor: 'pointer', background: expandedAdSets[adSet.id] ? 'rgba(168,85,247,0.06)' : '#fafbff', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                                    <td colSpan={2} style={{ padding: '14px 24px 14px 48px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ fontSize: 10, color: '#a855f7', transition: 'transform 0.2s', transform: expandedAdSets[adSet.id] ? 'rotate(90deg)' : 'none' }}>▶</span>
                                                        📦 {adSet.name}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}><StatusBadge status={adSet.status} t={t} /></td>
                                                    <td style={{ textAlign: 'right', color: '#ea580c', padding: '14px 12px' }}>{fmt(adSet.spend || 0)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: (adSet.roas || 0) >= 4 ? '#16a34a' : '#d97706', padding: '14px 12px' }}>{(adSet.roas || 0).toFixed(2)}x</td>
                                                    <td style={{ textAlign: 'right', color: '#64748b', padding: '14px 12px' }}>{(adSet.impressions || 0).toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', color: '#64748b', padding: '14px 12px' }}>{(adSet.clicks || 0).toLocaleString()}</td>
                                                    <td style={{ textAlign: 'right', color: '#94a3b8', padding: '14px 12px' }}>{(adSet.ctr || 0).toFixed(2)}%</td>
                                                    <td style={{ textAlign: 'right', color: '#16a34a', padding: '14px 24px 14px 12px', opacity: 0.9 }}>{(adSet.conv || 0).toLocaleString()}</td>
                                                </tr>

                                                {expandedAdSets[adSet.id] && adSet.ads && adSet.ads.map(ad => (
                                                    <tr key={ad.id} style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                                        <td colSpan={2} style={{ padding: '12px 24px 12px 76px', fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            &bull; 🖼️ {ad.name}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}><StatusBadge status={ad.status} t={t} /></td>
                                                        <td style={{ textAlign: 'right', fontSize: 12, color: '#ea580c', padding: '12px 12px' }}>{fmt(ad.spend || 0)}</td>
                                                        <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: (ad.roas || 0) >= 4 ? '#16a34a' : '#ef4444', padding: '12px 12px' }}>{(ad.roas || 0).toFixed(2)}x</td>
                                                        <td style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', padding: '12px 12px' }}>{(ad.impressions || 0).toLocaleString()}</td>
                                                        <td style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', padding: '12px 12px' }}>{(ad.clicks || 0).toLocaleString()}</td>
                                                        <td style={{ textAlign: 'right', fontSize: 12, color: '#94a3b8', padding: '12px 12px' }}>{(ad.ctr || 0).toFixed(2)}%</td>
                                                        <td style={{ textAlign: 'right', fontSize: 12, color: '#16a34a', padding: '12px 24px 12px 12px' }}>{(ad.conv || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══ GUIDE TAB ══ */}
            {activeTab === 'guide' && (
                <div className="guide-section" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: CONTENT_MIN }}>
                    {/* Hero */}
                    <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.05))', textAlign: 'center', padding: 32 }}>
                        <div style={{ fontSize: 44 }}>📘</div>
                        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: '#1e293b' }}>{t('acctPerf.guideTitle', 'Account Performance Guide')}</div>
                        <div style={{ fontSize: 13, color: '#7a90ad', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>{t('acctPerf.guideSub', 'Learn how to leverage team-level budget tracking and campaign hierarchy analysis.')}</div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                            {[{icon:'📋',k:'guideBeginnerBadge',fb:'Beginner Guide'},{icon:'⏱',k:'guideTimeBadge',fb:'5 min read'},{icon:'🌐',k:'guideLangBadge',fb:'12 Languages'}].map((b,i)=>(
                                <span key={i} style={{ padding:'6px 14px', borderRadius:20, background:'rgba(255,255,255,0.95)', border:'1px solid rgba(0,0,0,0.08)', fontSize:12, fontWeight:600, color:'#4f8ef7', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>{b.icon} {t(`acctPerf.${b.k}`,b.fb)}</span>
                            ))}
                        </div>
                    </div>

                    {/* Where to Start */}
                    <div style={{ ...CARD, padding: 24, borderLeft: '4px solid #4f8ef7' }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10, color: '#1e293b' }}>🚀 {t('acctPerf.guideWhereToStart', 'Where do I start?')}</div>
                        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>{t('acctPerf.guideWhereToStartDesc', '1. Navigate to Ad Analysis → Account Performance. 2. Check the team budget chart. 3. Click campaigns in Drilldown for details. 4. Review AI Insights.')}</div>
                    </div>

                    {/* 10 Steps */}
                    <div style={{ ...CARD, padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20, color: '#1e293b' }}>📖 {t('acctPerf.guideStepsTitle', 'Step-by-Step Guide (10 Steps)')}</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            {[
                                { n: 1, e: '🎯', c: '#4f8ef7' }, { n: 2, e: '📊', c: '#22c55e' },
                                { n: 3, e: '📈', c: '#a855f7' }, { n: 4, e: '🌳', c: '#f59e0b' },
                                { n: 5, e: '💡', c: '#f97316' }, { n: 6, e: '🔄', c: '#06b6d4' },
                                { n: 7, e: '🏆', c: '#4f8ef7' }, { n: 8, e: '📉', c: '#a855f7' },
                                { n: 9, e: '💰', c: '#22c55e' }, { n: 10, e: '📅', c: '#f59e0b' },
                            ].map((s) => (
                                <div key={s.n} style={{ padding: '14px 18px', borderRadius: 12, borderLeft: `4px solid ${s.c}`, background: `${s.c}06` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: s.c, color: '#fff', fontSize: 12, fontWeight: 700 }}>{s.n}</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: s.c }}>{t(`acctPerf.guideStep${s.n}Title`, `Step ${s.n}`)}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, marginLeft: 36 }}>{t(`acctPerf.guideStep${s.n}Desc`, '')}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tab Reference */}
                    <div style={{ ...CARD, padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: '#1e293b' }}>🗂 {t('acctPerf.guideTabsTitle', 'Tab Reference')}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
                            {[
                                { icon: '📊', c: '#4f8ef7', name: t('acctPerf.guideTabDashboardName', 'Dashboard'), desc: t('acctPerf.guideTabDashboardDesc', 'Team budgets, objective KPIs, and revenue charts.') },
                                { icon: '🌳', c: '#a855f7', name: t('acctPerf.guideTabDrilldownName', 'Drilldown'), desc: t('acctPerf.guideTabDrilldownDesc', 'Campaign → Ad Set → Ad hierarchy analysis.') },
                            ].map((tb, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid rgba(0,0,0,0.04)' }}>
                                    <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{tb.name}</div>
                                        <div style={{ fontSize: 10, color: '#7a90ad', marginTop: 2, lineHeight: 1.6 }}>{tb.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pro Tips */}
                    <div style={{ ...CARD, padding: 24, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)' }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12, color: '#1e293b' }}>💡 {t('acctPerf.guideTipsTitle', 'Pro Tips')}</div>
                        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#64748b', lineHeight: 2.2 }}>
                            {[1,2,3,4,5].map(n => <li key={n}>{t(`acctPerf.guideTip${n}`, '')}</li>)}
                        </ul>
                    </div>

                    {/* FAQ */}
                    <div style={{ ...CARD, padding: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: '#1e293b' }}>❓ {t('acctPerf.guideFaqTitle', 'FAQ')}</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            {[1,2,3,4,5].map(n => (
                                <div key={n} style={{ padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid rgba(0,0,0,0.04)' }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#4f8ef7', marginBottom: 4 }}>Q. {t(`acctPerf.guideFaq${n}Q`, '')}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>A. {t(`acctPerf.guideFaq${n}A`, '')}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Ready CTA */}
                    <div style={{ ...CARD, padding: 24, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(34,197,94,0.06))', textAlign: 'center', border: '1px solid rgba(79,142,247,0.15)' }}>
                        <div style={{ fontSize: 30 }}>🚀</div>
                        <div style={{ fontWeight: 900, fontSize: 18, marginTop: 8, color: '#1e293b' }}>{t('acctPerf.guideReadyTitle', 'Ready! Start analyzing')}</div>
                        <div style={{ fontSize: 13, color: '#7a90ad', marginTop: 6 }}>{t('acctPerf.guideReadyDesc', 'Click the Dashboard tab to review team budget status.')}</div>
                        <button onClick={() => setActiveTab('dashboard')} style={{ marginTop: 16, padding: '10px 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,142,247,0.3)' }}>
                            {t('acctPerf.tabDashboard', 'Dashboard')} →
                        </button>
                    </div>
                </div>
            )}

            </div>
        </div>
    );
}
