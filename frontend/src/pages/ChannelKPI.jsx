// ══════════════════════════════
//  📊 ChannelKPI ??Channel KPI Advanced Management Hub
//  9 tabs: Goals / Channel Roles / KPI Setup / SNS / Content / Community / Targets / Monitor·AI / Guide
// ══════════════════════════════
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useT } from '../i18n/index.js';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

const API = '/api';

/* ── Color Palette ??????????????????????????????????????? */
const C = {
    blue: '#4f8ef7', purple: '#a855f7', green: '#22c55e',
    orange: '#f97316', yellow: '#eab308', red: '#ef4444',
    teal: '#14d9b0', pink: '#f472b6',
};

/* ── Common Styles (Arctic White safe) ???????????????? */
const CARD = {
    background: 'linear-gradient(145deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))',
    border: '1px solid rgba(99,140,255,0.15)', borderRadius: 14, padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};
const LBL = { fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 };
const SEC = { fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 14 };

/* ── Gauge Bar ─────────────────────────────────────── */
function GaugeBar({ label, current, target, unit = '', color = C.blue, reverse = false }) {
  const t = useT();
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const ok = reverse ? current <= target : current >= target;
    const col = ok ? C.green : pct >= 70 ? C.orange : C.red;
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>{label}</span>
                <span style={{ fontWeight: 800, color: col }}>
                    {unit}{current.toLocaleString()} / {t('channelKpiPage.targetLabel', 'Target')} {unit}{target.toLocaleString()}
                    <span style={{ marginLeft: 6, fontSize: 10, color: ok ? C.green : C.red }}>{ok ? t('channelKpiPage.achieved') : `${pct.toFixed(0)}%`}</span>
                </span>
            </div>
            <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${col},${col}88)`, borderRadius: 3, transition: 'width 0.6s' }} />
            </div>
        </div>
    
    );
}

/* ── Metric Card ??????????????????????????????????????? */
function MetCard({ icon, label, value, sub, color }) {
    return (
        <div style={{ ...CARD, borderColor: color + '22' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={LBL}>{label}</span>
                <span style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

/* ══════════════════════════════
   Tab 1: Goal Setting
══════════════════════════════ */
function GoalTab({ goals, setGoals }) {
  const t = useT();
    const GOAL_ITEMS = [
        { key: 'awareness', icon: '📣', label: t('channelKpiPage.brandAwareness'), desc: t('channelKpiPage.brandAwarenessDesc'), color: C.purple },
        { key: 'traffic', icon: '🌐', label: t('channelKpiPage.webTraffic'), desc: t('channelKpiPage.webTrafficDesc'), color: C.blue },
        { key: 'conversion', icon: '🛒', label: t('channelKpiPage.inquiriesPurchases'), desc: t('channelKpiPage.inquiriesPurchasesDesc'), color: C.green },
    ];
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.bizGoalSetting')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {GOAL_ITEMS.map(g => (
                    <div key={g.key} onClick={() => setGoals(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                        style={{
                            ...CARD, borderColor: goals[g.key] ? g.color + '60' : 'rgba(99,140,255,0.1)', cursor: 'pointer',
                            background: goals[g.key] ? `linear-gradient(145deg,${g.color}18,rgba(248,250,252,0.95))` : CARD.background,
                            transform: goals[g.key] ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s'
                        }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: goals[g.key] ? g.color : '#475569', marginBottom: 6 }}>{g.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{g.desc}</div>
                        <div style={{ marginTop: 12, padding: '4px 10px', borderRadius: 20, width: 'fit-content', background: goals[g.key] ? g.color : 'rgba(100,116,139,0.1)', color: goals[g.key] ? '#fff' : '#94a3b8', fontSize: 10, fontWeight: 800 }}>{goals[g.key] ? t('channelKpiPage.selected') : t('channelKpiPage.clickSelect')}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ ...CARD, background: 'linear-gradient(145deg,rgba(79,142,247,0.08),rgba(248,250,252,0.95))' }}>
                <div style={LBL}>{t('channelKpiPage.selectedGoals')}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GOAL_ITEMS.filter(g => goals[g.key]).map(g => (
                        <span key={g.key} style={{ padding: '4px 12px', borderRadius: 20, background: g.color + '22', color: g.color, fontSize: 11, fontWeight: 700, border: `1px solid ${g.color}44` }}>
                            {g.icon} {g.label}
                        </span>
                    ))}
                    {!GOAL_ITEMS.some(g => goals[g.key]) && <span style={{ fontSize: 11, color: '#94a3b8' }}>{t('channelKpiPage.pleaseSelectGoal')}</span>}
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════
   Tab 2: Channel Role Definition
══════════════════════════════ */
function ChannelRoleTab() {
  const t = useT();
    const ROLES = [
        {
            ch: `🔍 ${t('channelKpiPage.chSearchAds', 'Search Ads')}`, role: t('channelKpiPage.roleCaptureIntent'), kpis: [t('channelKpiPage.ctr', 'CTR'), t('channelKpiPage.cpc', 'CPC'), t('channelKpiPage.convRate', 'Conv. Rate'), t('channelKpiPage.cpa', 'CPA'), t('channelKpiPage.roas', 'ROAS')], color: C.blue,
            desc: t('channelKpiPage.descCaptureIntent')
        },
        {
            ch: `📣 ${t('channelKpiPage.chSnsAds', 'SNS Ads')}`, role: t('channelKpiPage.roleBrandReach'), kpis: [t('channelKpiPage.reach', 'Reach'), t('channelKpiPage.engagement', 'Engagement'), t('channelKpiPage.ctr', 'CTR'), t('channelKpiPage.videoViews', 'Video Views')], color: C.pink,
            desc: t('channelKpiPage.descBrandReach')
        },
        {
            ch: `📝 ${t('channelKpiPage.chBlog', 'Blog')}`, role: t('channelKpiPage.roleInfoTrust'), kpis: [t('channelKpiPage.pageViews'), t('channelKpiPage.visitors'), t('channelKpiPage.avgTime', 'Avg. Time'), t('channelKpiPage.searchTraffic')], color: C.green,
            desc: t('channelKpiPage.descInfoTrust')
        },
        {
            ch: `💬 ${t('channelKpiPage.chCommunity', 'Community')}`, role: t('channelKpiPage.roleCustRel'), kpis: [t('channelKpiPage.postViews'), t('channelKpiPage.comments'), t('channelKpiPage.inquiries'), t('channelKpiPage.newMembers')], color: C.orange,
            desc: t('channelKpiPage.descCustRel')
        },
    ];
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.channelRoleDef')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {ROLES.map(r => (
                    <div key={r.ch} style={{ ...CARD, borderColor: r.color + '30' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontSize: 15, fontWeight: 900, color: r.color }}>{r.ch}</div>
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: r.color + '18', color: r.color, fontSize: 10, fontWeight: 800 }}>{r.role}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>{r.desc}</div>
                        <div style={LBL}>{t('channelKpiPage.coreKpis')}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {r.kpis.map(k => (
                                <span key={k} style={{ padding: '2px 9px', borderRadius: 12, background: 'rgba(248,250,252,0.95)', border: `1px solid ${r.color}40`, color: r.color, fontSize: 10, fontWeight: 700 }}>{k}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════
   Tab 3: Channel KPI Setup (Search-centric)
══════════════════════════════ */
function KpiSetupTab({ kpiTargets, setKpiTargets }) {
  const t = useT();
    const FIELDS = [
        { key: 'ctr', label: t('channelKpiPage.lblCtrFull', 'CTR (Click-Through Rate)'), unit: '%', ph: '', hint: t('channelKpiPage.hintCtr') },
        { key: 'convRate', label: t('channelKpiPage.lblConvRate', 'Conv. Rate'), unit: '%', ph: '', hint: t('channelKpiPage.hintConvRate') },
        { key: 'cpa', label: t('channelKpiPage.lblCpaFull', 'CPA (Cost Per Acquisition)'), unit: 'currency', ph: '', hint: t('channelKpiPage.hintCpa') },
        { key: 'roas', label: t('channelKpiPage.lblRoasFull', 'ROAS (Return on Ad Spend)'), unit: '%', ph: '', hint: t('channelKpiPage.hintRoas') },
        { key: 'cpc', label: t('channelKpiPage.lblCpcFull', 'CPC (Cost Per Click)'), unit: 'currency', ph: '', hint: t('channelKpiPage.hintCpc') },
    ];
    const CHANNELS = [
        { id: 'Search Ads', label: t('channelKpiPage.chSearchAds', 'Search Ads') },
        { id: 'SNS Ads', label: t('channelKpiPage.chSnsAds', 'SNS Ads') },
        { id: 'Blog', label: t('channelKpiPage.chBlog', 'Blog') },
        { id: 'Community', label: t('channelKpiPage.chCommunity', 'Community') }
    ];
    const [selCh, setSelCh] = useState('Search Ads');

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.targetSetup')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
                {CHANNELS.map(ch => (
                    <button key={ch.id} onClick={() => setSelCh(ch.id)}
                        style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: selCh === ch.id ? '#4f8ef7' : 'rgba(100,116,139,0.08)', color: selCh === ch.id ? '#ffffff' : '#374151', transition: 'all 0.2s' }}>
                        {ch.label}
                    </button>
                ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {FIELDS.map(f => {
                    const k = `${selCh}_${f.key}`;
                    return (
                        <div key={f.key} style={CARD}>
                            <div style={LBL}>{f.label}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>{f.unit}</span>
                                <input value={kpiTargets[k] ?? ''} placeholder={f.ph}
                                    onChange={e => setKpiTargets(prev => ({ ...prev, [k]: e.target.value }))}
                                    style={{ flex: 1, background: 'rgba(248,250,252,0.95)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, color: '#1e293b', padding: '7px 10px', fontSize: 13, fontWeight: 700 }} />
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>{f.hint}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ══════════════════════════════
   Tab 4: SNS Ad KPI
══════════════════════════════ */
function SnsKpiTab({ globalChannels }) {
  const t = useT();
    const { fmt } = useCurrency();
    // Use actual global data instead of empty mock
    const SNS_DATA = useMemo(() => {
        return Object.values(globalChannels || {}).filter(c => c.spent > 0).map(c => ({
            ch: t('channelKpiPage.chName_' + c.id, c.name),
            reach: c.impressions || c.reach || 0,
            engagement: c.engagement || 0,
            ctr: c.impressions ? (c.clicks || 0) / c.impressions * 100 : 0,
            videoViews: c.videoViews || 0,
            color: c.color || C.blue
        }));
    }, [globalChannels, t]);

    const METRICS = [
        { key: 'reach', label: t('channelKpiPage.reach', 'Reach'), icon: '👁', color: C.blue, fmt: v => (v / 1000000).toFixed(1) + 'M' },
        { key: 'engagement', label: t('channelKpiPage.engagement', 'Engagement'), icon: '💬', color: C.green, fmt: v => (v / 1000).toFixed(0) + 'K' },
        { key: 'ctr', label: t('channelKpiPage.ctr', 'CTR'), icon: '🖱', color: C.orange, fmt: v => v.toFixed(1) + '%' },
        { key: 'videoViews', label: t('channelKpiPage.videoViews', 'Video Views'), icon: '▶', color: C.red, fmt: v => (v / 1000000).toFixed(1) + 'M' },
    ];
    
    if (SNS_DATA.length === 0) {
        return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>{t('channelKpiPage.noData', '데이터가 없습니다')}</div>;
    }

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.snsKpiOverview')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {METRICS.map(m => (
                    <MetCard key={m.key} icon={m.icon} label={m.label}
                        value={m.fmt(SNS_DATA.reduce((s, d) => s + (d[m.key] || 0), 0))}
                        sub={t('channelKpiPage.allChannels')} color={m.color} />
                ))}
            </div>
            <div style={CARD}>
                <div style={LBL}>{t('channelKpiPage.snsKpiByChannel')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4,1fr)', gap: 8, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                    <span>{t('channelKpiPage.channelCol', 'Channel')}</span><span>{t('channelKpiPage.reach', 'Reach')}</span><span>{t('channelKpiPage.engagement', 'Engagement')}</span><span>{t('channelKpiPage.ctr', 'CTR')}</span><span>{t('channelKpiPage.videoViews', 'Video Views')}</span>
                </div>
                {SNS_DATA.map(d => (
                    <div key={d.ch} style={{ display: 'grid', gridTemplateColumns: '120px repeat(4,1fr)', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ fontWeight: 800, color: d.color }}>{d.ch}</span>
                        <span style={{ color: C.blue }}>{(d.reach / 1000000).toFixed(1)}M</span>
                        <span style={{ color: C.green }}>{(d.engagement / 1000).toFixed(0)}K</span>
                        <span style={{ color: C.orange, fontWeight: 800 }}>{d.ctr}%</span>
                        <span style={{ color: C.red }}>{(d.videoViews / 1000000).toFixed(1)}M</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════
   Tab 5: Content Channel (Blog) KPI
══════════════════════════════ */
function ContentKpiTab({ globalOrderStats }) {
  const t = useT();
    // Using global stats instead of mock array completely
    const views = globalOrderStats?.contentViews || 0;
    const visitors = globalOrderStats?.contentVisitors || 0;
    const avgTime = globalOrderStats?.contentAvgTime || 0;
    const searchIn = globalOrderStats?.searchInflow || 0;
    
    if (!globalOrderStats || globalOrderStats.count === 0) {
        return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>{t('channelKpiPage.noData', '데이터가 없습니다')}</div>;
    }

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.contentKpi')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <MetCard icon="👁" label={t('channelKpiPage.pageViews')} value={(views / 1000).toFixed(0) + 'K'} sub={t('channelKpiPage.contentImpressions')} color={C.blue} />
                <MetCard icon="🧑" label={t('channelKpiPage.visitors')} value={(visitors / 1000).toFixed(0) + 'K'} sub={t('channelKpiPage.siteTraffic')} color={C.green} />
                <MetCard icon="⏱" label={t('channelKpiPage.avgTime')} value={Math.floor(avgTime / 60) + 'm ' + (avgTime % 60) + 's'} sub={t('channelKpiPage.contentEngage')} color={C.orange} />
                <MetCard icon="🔍" label={t('channelKpiPage.searchTraffic')} value={(searchIn / 1000).toFixed(0) + 'K'} sub={t('channelKpiPage.seoImpact')} color={C.purple} />
            </div>
            <div style={CARD}>
                <div style={LBL}>{t('channelKpiPage.monthlyTrend')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11, alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#64748b' }}>{t('channelKpiPage.currentMonth', 'This Month')}</span>
                    {[
                        [views, views * 1.5 || 10, C.blue, t('channelKpiPage.pageViews', 'Views')],
                        [visitors, visitors * 1.5 || 10, C.green, t('channelKpiPage.visitors', 'Visitors')],
                        [avgTime, avgTime * 1.5 || 240, C.orange, t('channelKpiPage.avgTime', 'Time(s)')],
                        [searchIn, searchIn * 1.5 || 10, C.purple, t('channelKpiPage.searchTraffic', 'Search')],
                    ].map(([v, max, col, lbl], j) => (
                        <div key={j}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                <span style={{ color: '#94a3b8', fontSize: 9 }}>{lbl}</span>
                                <span style={{ color: col, fontWeight: 700 }}>{v.toLocaleString()}</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2 }}>
                                <div style={{ width: `${(v / (max||1)) * 100}%`, height: '100%', background: col, borderRadius: 2 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    
    );
}

/* ══════════════════════════════
   Tab 6: Community / Cafe KPI
══════════════════════════════ */
function CommunityKpiTab({ globalOrderStats }) {
  const t = useT();
    const PLATFORMS = useMemo(() => {
        if (!globalOrderStats || (!globalOrderStats.communityData && globalOrderStats.count === 0)) return [];
        return [
            { name: t('channelKpiPage.naverCafe', 'Naver Cafe'), views: globalOrderStats.communityData?.naver?.views || 0, comments: globalOrderStats.communityData?.naver?.comments || 0, inquiries: globalOrderStats.communityData?.naver?.inquiries || 0, newMembers: globalOrderStats.communityData?.naver?.newMembers || 0, color: '#03c75a' },
            { name: t('channelKpiPage.kakaoGuild', 'Kakao Talk'), views: globalOrderStats.communityData?.kakao?.views || 0, comments: globalOrderStats.communityData?.kakao?.comments || 0, inquiries: globalOrderStats.communityData?.kakao?.inquiries || 0, newMembers: globalOrderStats.communityData?.kakao?.newMembers || 0, color: '#fee500' }
        ];
    }, [globalOrderStats, t]);

    const totals = PLATFORMS.reduce((acc, p) => ({
        views: acc.views + p.views, comments: acc.comments + p.comments,
        inquiries: acc.inquiries + p.inquiries, newMembers: acc.newMembers + p.newMembers,
    }), { views: 0, comments: 0, inquiries: 0, newMembers: 0 });

    if (PLATFORMS.length === 0) {
        return <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>{t('channelKpiPage.noData', '데이터가 없습니다')}</div>;
    }

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.communityKpi')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <MetCard icon="📰" label={t('channelKpiPage.postViews')} value={(totals.views / 1000).toFixed(0) + 'K'} sub={t('channelKpiPage.contentInterest')} color={C.blue} />
                <MetCard icon="💬" label={t('channelKpiPage.comments')} value={totals.comments.toLocaleString()} sub={t('channelKpiPage.communityAct')} color={C.green} />
                <MetCard icon="⏱" label={t('channelKpiPage.inquiries')} value={totals.inquiries.toLocaleString()} sub={t('channelKpiPage.interestConv')} color={C.orange} />
                <MetCard icon="👥" label={t('channelKpiPage.newMembers')} value={totals.newMembers.toLocaleString()} sub={t('channelKpiPage.communityGrowth')} color={C.purple} />
            </div>
            {PLATFORMS.map(p => (
                <div key={p.name} style={{ ...CARD, borderColor: p.color + '30' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: p.color, marginBottom: 12 }}>{p.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                        {[[t('channelKpiPage.postViews'), p.views, totals.views], [t('channelKpiPage.comments'), p.comments, totals.comments],
                        [t('channelKpiPage.inquiries'), p.inquiries, totals.inquiries], [t('channelKpiPage.newMembers'), p.newMembers, totals.newMembers]].map(([lbl, v, tot]) => (
                            <div key={lbl}>
                                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{lbl}</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: p.color }}>{v.toLocaleString()}</div>
                                <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, marginTop: 4 }}>
                                    <div style={{ width: `${(v / (tot||1)) * 100}%`, height: '100%', background: p.color, borderRadius: 2 }} />
                                </div>
                                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{((v / (tot||1)) * 100).toFixed(0)}% {t('channelKpiPage.share', 'share')}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    
    );
}

/* ══════════════════════════════
   Tab 7: KPI Target Figures & Achievement
══════════════════════════════ */
function KpiTargetTab({ kpiTargets, globalOrderStats, globalBudgetStats }) {
  const t = useT();
    const { symbol: csym } = useCurrency();
    // Using actual global stats instead of static zeros
    const ACTUALS = {
        ctr: globalBudgetStats?.totalSpent > 0 ? (globalOrderStats?.count / globalBudgetStats.totalSpent * 100000).toFixed(1) : 0, 
        convRate: globalOrderStats?.count > 0 ? (globalOrderStats.count / (globalBudgetStats.totalSpent > 0 ? globalBudgetStats.totalSpent : 1) * 100).toFixed(2) : 0, 
        cpa: globalOrderStats?.count > 0 ? (globalBudgetStats.totalSpent / globalOrderStats.count).toFixed(0) : 0, 
        roas: globalBudgetStats?.blendedRoas ? (globalBudgetStats.blendedRoas * 100).toFixed(0) : 0, 
        cpc: 0,
    };
    const DEFAULTS = { ctr: 0, convRate: 0, cpa: 0, roas: 0, cpc: 0 };
    const ITEMS = [
        { key: 'ctr', label: t('channelKpiPage.ctr', 'CTR'), unit: '%', desc: t('channelKpiPage.descCtr'), reverse: false },
        { key: 'convRate', label: t('channelKpiPage.convRate', 'Conv. Rate'), unit: '%', desc: t('channelKpiPage.descConvRate'), reverse: false },
        { key: 'cpa', label: t('channelKpiPage.cpa', 'CPA'), unit: 'currency', desc: t('channelKpiPage.descCpa'), reverse: true },
        { key: 'roas', label: t('channelKpiPage.roas', 'ROAS'), unit: '%', desc: t('channelKpiPage.descRoas'), reverse: false },
        { key: 'cpc', label: t('channelKpiPage.cpc', 'CPC'), unit: 'currency', desc: t('channelKpiPage.descCpc'), reverse: true },
    ];

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.targetVsActuals')}</div>
            <div style={{ ...CARD, background: 'linear-gradient(145deg,rgba(79,142,247,0.08),rgba(248,250,252,0.95))' }}>
                <div style={LBL}>{t('channelKpiPage.overallAchieve')}</div>
                {ITEMS.map(it => {
                    const tgt = parseFloat(kpiTargets[`Search Ads_${it.key}`] ?? DEFAULTS[it.key]);
                    const actual = ACTUALS[it.key];
                    return <GaugeBar key={it.key} label={it.label} current={actual} target={tgt} unit={it.unit === 'currency' ? csym : ''} reverse={it.reverse} />;
                })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
                {ITEMS.map(it => {
                    const tgt = parseFloat(kpiTargets[`Search Ads_${it.key}`] ?? DEFAULTS[it.key]);
                    const actual = ACTUALS[it.key];
                    const ok = it.reverse ? actual <= tgt : actual >= tgt;
                    return (
                        <div key={it.key} style={{ ...CARD, borderColor: (ok ? C.green : C.red) + '30', textAlign: 'center' }}>
                            <div style={LBL}>{it.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: ok ? C.green : C.orange }}>
                                {it.unit === 'currency' ? csym : ''}{actual.toLocaleString()}{it.unit === '%' ? '%' : ''}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{t('channelKpiPage.targetLabel','Target')} {it.unit === 'currency' ? csym : ''}{tgt.toLocaleString()}{it.unit === '%' ? '%' : ''}</div>
                            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: ok ? C.green : C.red }}>{ok ? t('channelKpiPage.achievedOk') : t('channelKpiPage.belowTarget')}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ══════════════════════════════
   Tab 8: Monitoring & Claude AI Analysis
══════════════════════════════ */
function MonitoringTab({ goals, kpiTargets }) {
  const t = useT();
    const [period, setPeriod] = useState('weekly');
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState(null);

    const QUESTIONS = [
        { id: 'efficiency', label: t('channelKpiPage.chkEff') },
        { id: 'costPerf', label: t('channelKpiPage.chkCostPerf') },
        { id: 'improve', label: t('channelKpiPage.chkImprove') },
    ];

    const runAI = useCallback(async () => {
        setStatus('loading'); setResult(null);
        const payload = {
            data: {
                goals,
                kpi_targets: kpiTargets,
                period,
                actuals: {
                    search: {},
                    sns: {},
                    blog: {},
                    community: {},
                },
            },
        };
        try {
            const res = await fetch(`${API}/v423/ai/channel-kpi-eval`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || 'AI analysis failed');
            setResult(data.result);
            setStatus('done');
        } catch (e) {
            setStatus('error');
            setResult({ error: e.message });
        }
    }, [goals, kpiTargets, period]);

    const loadHistory = useCallback(async () => {
        try {
            const r = await fetch(`${API}/v423/ai/analyses?context=channel_kpi_eval&limit=5`, { credentials: 'include' });
            const d = await r.json();
            setHistory(d.analyses || []);
        } catch { setHistory([]); }
    }, []);

    const WEEK_DATA = [];
    
    // Auto-load history on mount if not loaded
    React.useEffect(() => {
        if (!history && status === 'idle') loadHistory();
    }, [history, status, loadHistory]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>{t('channelKpiPage.monitorAi')}</div>

            {/* Period selection + AI run */}
            <div style={{ ...CARD, background: 'linear-gradient(145deg,rgba(79,142,247,0.10),rgba(248,250,252,0.95))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 26 }}>🤖</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: C.blue }}>{t('channelKpiPage.claudeAiTitle')}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{t('channelKpiPage.claudeAiDesc')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {['weekly', 'monthly'].map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: period === p ? C.blue : 'rgba(100,116,139,0.08)', color: period === p ? '#ffffff' : '#374151', transition: 'all 0.2s' }}>
                            {p === 'weekly' ? t('channelKpiPage.weeklyAi') : t('channelKpiPage.monthlyAi')}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={runAI} disabled={status === 'loading'}
                        style={{ flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', background: status === 'loading' ? 'rgba(79,142,247,0.3)' : '#4f8ef7', color: '#fff', fontWeight: 800, fontSize: 11, transition: 'all 0.2s' }}>
                        {status === 'loading' ? t('channelKpiPage.aiAnalyzing') : t('channelKpiPage.runAi')}
                    </button>
                    <button onClick={loadHistory}
                        style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.06)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                        {t('channelKpiPage.history', '📜 History')}
                    </button>
                </div>
            </div>

            {/* Error */}
            {status === 'error' && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#ef4444' }}>
                    ??{result?.error}
                </div>
            )}

            {/* AI Result */}
            {status === 'done' && result && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {result.summary && (
                        <div style={CARD}>
                            <div style={LBL}>{t('channelKpiPage.aiSummary')}</div>
                            <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.75 }}>{result.summary}</div>
                            {result.top_insight && (
                                <div style={{ marginTop: 8, padding: '8px 11px', borderRadius: 8, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 11, color: C.blue, fontWeight: 600 }}>
                                    {t('channelKpiPage.keyInsight', '💡 Key Insight:')} {result.top_insight}
                                </div>
                            )}
                            {result.immediate_action && (
                                <div style={{ marginTop: 6, padding: '8px 11px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, color: C.green, fontWeight: 700 }}>
                                    {t('channelKpiPage.immediateAction', '??Immediate Action:')} {result.immediate_action}
                                </div>
                            )}
                        </div>
                    )}
                    {(result.channels || []).map(ch => (
                        <div key={ch.name} style={{ ...CARD, borderColor: 'rgba(79,142,247,0.15)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>{ch.name}</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: ({ S: '#ffd700', A: C.blue, B: C.green, C: C.orange, D: C.red })[ch.grade] }}>{ch.grade}</span>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: C.blue }}>{ch.score} pts</span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                <div style={{ background: 'rgba(34,197,94,0.07)', borderRadius: 7, padding: '7px 9px', border: '1px solid rgba(34,197,94,0.14)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: C.green, marginBottom: 4 }}>{t('channelKpiPage.strengths')}</div>
                                    {(ch.strengths || []).map((s, i) => <div key={i} style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>??{s}</div>)}
                                </div>
                                <div style={{ background: 'rgba(239,68,68,0.07)', borderRadius: 7, padding: '7px 9px', border: '1px solid rgba(239,68,68,0.14)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: C.red, marginBottom: 4 }}>{t('channelKpiPage.weaknesses')}</div>
                                    {(ch.weaknesses || []).map((w, i) => <div key={i} style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>??{w}</div>)}
                                </div>
                            </div>
                            {ch.action && (
                                <div style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.15)', fontSize: 11, color: C.blue }}>
                                    ? {ch.action}
                                </div>
                            )}
                        </div>
                    ))}
                    {(result.improvements || []).length > 0 && (
                        <div style={CARD}>
                            <div style={LBL}>{t('channelKpiPage.improveRecs')}</div>
                            {result.improvements.map((imp, i) => (
                                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>#{i + 1} {imp.title}</div>
                                    {imp.detail && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{imp.detail}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Weekly Trend */}
            <div style={CARD}>
                <div style={LBL}>{t('channelKpiPage.weeklyAdTrend')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(3,1fr)', gap: 8, fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <span>{t('channelKpiPage.period', 'Period')}</span><span>{t('channelKpiPage.ctr', 'CTR')}</span><span>{t('channelKpiPage.convRate', 'Conv. Rate')}</span><span>{t('channelKpiPage.roas', 'ROAS')}</span>
                </div>
                {WEEK_DATA.length === 0 && <div style={{ fontSize: 11, textAlign: 'center', color: '#94a3b8', padding: '20px' }}>{t('channelKpiPage.noData', '데이터가 없습니다')}</div>}
                {WEEK_DATA.map(w => (
                    <div key={w.week} style={{ display: 'grid', gridTemplateColumns: '60px repeat(3,1fr)', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                        <span style={{ color: '#94a3b8', fontWeight: 700 }}>{w.week}</span>
                        <span style={{ color: w.ctr >= 3 ? C.green : C.orange, fontWeight: 700 }}>{w.ctr}%</span>
                        <span style={{ color: w.conv >= 5 ? C.green : C.orange, fontWeight: 700 }}>{w.conv}%</span>
                        <span style={{ color: w.roas >= 300 ? C.green : C.orange, fontWeight: 700 }}>{w.roas}%</span>
                    </div>
                ))}
            </div>

            {/* Analysis Checklist */}
            <div style={CARD}>
                <div style={LBL}>{t('channelKpiPage.checklist')}</div>
                {QUESTIONS.map(q => (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{q.label}</span>
                    </div>
                ))}
            </div>

            {/* History */}
            {history && (
                <div style={CARD}>
                    <div style={LBL}>{t('channelKpiPage.aiHistoryList')}</div>
                    {history.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>{t('channelKpiPage.noHistory')}</div>}
                    {history.map(h => (
                        <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: C.blue, fontWeight: 700 }}>#{h.id}</span>
                                <span style={{ color: '#94a3b8', fontSize: 10 }}>{(h.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                            </div>
                            <div style={{ color: '#94a3b8' }}>{(h.summary || '').slice(0, 85)}…</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════
   Main Component
══════════════════════════════ */


export default function ChannelKPI() {
  const t = useT();
    const TABS = [
    { id: 'goal', label: t('channelKpiPage.tabGoals') },
    { id: 'role', label: t('channelKpiPage.tabRoles') },
    { id: 'kpi', label: t('channelKpiPage.tabSetup') },
    { id: 'sns', label: t('channelKpiPage.tabSns') },
    { id: 'content', label: t('channelKpiPage.tabContent') },
    { id: 'community', label: t('channelKpiPage.tabCommunity') },
    { id: 'target', label: t('channelKpiPage.tabTargets') },
    { id: 'monitor', label: t('channelKpiPage.tabMonitor') },
    { id: 'guide', label: t('channelKpiPage.tabGuide') },
];

  const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { budgetStats, channelBudgets, pnlStats, orderStats, addAlert, isDemo } = useGlobalData();
    useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true, _src: 'ChannelKPI' });
    // ConnectorSync: auto-sync channels from Integration Hub
    try { useConnectorSync(); } catch(e) {}
    // BroadcastChannel: cross-tab real-time sync
    const bcRef = useRef(null);
    useEffect(() => {
        try {
            bcRef.current = new BroadcastChannel('geniego-channelkpi-sync');
            bcRef.current.onmessage = (ev) => {
                if (ev.data?.type === 'KPI_UPDATE' || ev.data?.type === 'CONNECTOR_UPDATE') {
                    window.dispatchEvent(new Event('geniego-refresh'));
                }
            };
        } catch(e) {}
        return () => { try { bcRef.current?.close(); } catch(e) {} };
    }, []);

    const [tab, setTab] = useState('goal');
    const [goals, setGoals] = useState({ awareness: true, traffic: true, conversion: false });
    const [kpiTargets, setKpiTargets] = useState({});

    return (
<div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1200, margin: '0 auto', width: '100%', height: 'calc(100vh - 54px)', overflow: 'hidden', color: '#1e293b', background: 'transparent' }}>
            {/* Header */}
            <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))', borderColor: 'rgba(79,142,247,0.2)' }}>
                <div className="hero-meta" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(168,85,247,0.15))' }}>📊</div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.2, color: '#1e293b', WebkitTextFillColor: '#1e293b' }}>
                                {t('channelKpiPage.pageTitle', 'Channel KPI Advanced Management')}
                            </div>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 5, lineHeight: 1.55 }}>{t('channelKpiPage.heroDesc')}</div>
                            {/* ??GlobalDataContext Real-time KPIs */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: 'rgba(37,99,235,0.10)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.25)', fontSize: 11, fontWeight: 600 }}>
                                    🔴 {t('channelKpiPage.badgeAdSpend', 'Ad Spend')} {fmt(budgetStats.totalSpent)}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: 'rgba(22,163,74,0.10)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)', fontSize: 11, fontWeight: 600 }}>
                                    {t('channelKpiPage.badgeBlendedRoas', 'Blended ROAS')} {budgetStats.blendedRoas.toFixed(2)}x
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', fontSize: 11, fontWeight: 600 }}>
                                    {t('channelKpiPage.badgeOrders', 'Orders')} {orderStats.count}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: 'rgba(234,88,12,0.10)', color: '#ea580c', border: '1px solid rgba(234,88,12,0.25)', fontSize: 11, fontWeight: 600 }}>
                                    {t('channelKpiPage.badgeOpProfit', 'Op. Profit')} {fmt(pnlStats.operatingProfit)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <button onClick={() => navigate('/pnl-dashboard')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>🌊 P&L →</button>
                                <button onClick={() => navigate('/budget-planner')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>💰 Budget →</button>
                                <button onClick={() => navigate('/omni-channel')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>📡 Channel Orders →</button>
                            </div>
                        </div>
                    </div>
                    {/* Channel ROAS Mini Panel */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, minWidth: 260 }}>
                        {Object.entries(channelBudgets).slice(0, 6).map(([id, ch]) => (
                            <div key={id} style={{ padding: '8px 10px', borderRadius: 10, background: `${ch.color}10`, border: `1px solid ${ch.color}30`, textAlign: 'center' }}>
                                <div style={{ fontSize: 14 }}>{ch.icon}</div>
                                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{ch.name}</div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: ch.roas >= ch.targetRoas ? '#16a34a' : '#dc2626' }}>
                                    {ch.roas.toFixed(1)}x
                                </div>
                                <div style={{ fontSize: 8, color: '#94a3b8' }}>Target {ch.targetRoas}x</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sub-Tabs (fixed) */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderRadius: 12, padding: 4, border: '1px solid rgba(99,140,255,0.12)', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {TABS.map(tb => {
                    const isActive = tab === tb.id;
                    return (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                        style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, flex: '1 1 auto', background: isActive ? '#4f8ef7' : 'transparent', color: isActive ? '#ffffff' : '#374151', transition: 'all 0.2s', boxShadow: isActive ? '0 4px 14px rgba(79,142,247,0.35)' : 'none', transform: isActive ? 'translateY(-1px)' : 'none' }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(79,142,247,0.08)'; e.currentTarget.style.color = '#111827'; } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; } }}
                    >
                        {tb.label}
                    </button>
                    );
                })}
            </div>

            {/* Tab Content (independent scroll) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
                {tab === 'goal' && <GoalTab goals={goals} setGoals={setGoals} />}
                {tab === 'role' && <ChannelRoleTab globalChannels={channelBudgets} />}
                {tab === 'kpi' && <KpiSetupTab kpiTargets={kpiTargets} setKpiTargets={setKpiTargets} globalChannels={channelBudgets} />}
                {tab === 'sns' && <SnsKpiTab globalChannels={channelBudgets} />}
                {tab === 'content' && <ContentKpiTab globalOrderStats={orderStats} />}
                {tab === 'community' && <CommunityKpiTab globalOrderStats={orderStats} />}
                {tab === 'target' && <KpiTargetTab kpiTargets={kpiTargets} globalOrderStats={orderStats} globalBudgetStats={budgetStats} globalChannels={channelBudgets} />}
                {tab === 'monitor' && <MonitoringTab goals={goals} kpiTargets={kpiTargets} />}
                {tab === 'guide' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s' }}>
                        <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.10),rgba(168,85,247,0.06))', border: '1px solid rgba(79,142,247,0.20)', borderRadius: 16, textAlign: 'center', padding: 32 }}>
                            <div style={{ fontSize: 44 }}>📊</div>
                            <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: '#1e40af' }}>{t('channelKpiPage.guideTitle')}</div>
                            <div style={{ fontSize: 13, color: '#334155', WebkitTextFillColor: '#334155', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('channelKpiPage.guideSub')}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1e40af' }}>{t('channelKpiPage.guideStepsTitle')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                                {[{n:'1️⃣',k:'guideStep1',c:'#2563eb'},{n:'2️⃣',k:'guideStep2',c:'#16a34a'},{n:'3️⃣',k:'guideStep3',c:'#7c3aed'},{n:'4️⃣',k:'guideStep4',c:'#d97706'},{n:'5️⃣',k:'guideStep5',c:'#ea580c'},{n:'6️⃣',k:'guideStep6',c:'#0891b2'}].map((s,i) => (
                                    <div key={i} style={{ background: s.c+'08', border: `1px solid ${s.c}22`, borderRadius: 12, padding: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ fontSize: 20 }}>{s.n}</span>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`channelKpiPage.${s.k}Title`)}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{t(`channelKpiPage.${s.k}Desc`)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1e40af' }}>{t('channelKpiPage.guideTabsTitle')}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                                {[{icon:'🎯',k:'guideGoal',c:'#2563eb'},{icon:'🔀',k:'guideRole',c:'#7c3aed'},{icon:'⚙️',k:'guideSetup',c:'#16a34a'},{icon:'📣',k:'guideSns',c:'#db2777'},{icon:'📝',k:'guideContent',c:'#ea580c'},{icon:'💬',k:'guideCommunity',c:'#ca8a04'},{icon:'🎯',k:'guideTarget',c:'#dc2626'},{icon:'🤖',k:'guideMonitor',c:'#0891b2'}].map((tb,i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(248,250,252,0.95)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`channelKpiPage.${tb.k}Name`)}</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, lineHeight: 1.6 }}>{t(`channelKpiPage.${tb.k}Desc`)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(22,163,74,0.04)', border: '1px solid rgba(22,163,74,0.20)', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: '#1e40af' }}>💡 {t('channelKpiPage.guideTipsTitle')}</div>
                            <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#64748b', lineHeight: 2.2 }}>
                                <li>{t('channelKpiPage.guideTip1')}</li>
                                <li>{t('channelKpiPage.guideTip2')}</li>
                                <li>{t('channelKpiPage.guideTip3')}</li>
                                <li>{t('channelKpiPage.guideTip4')}</li>
                                <li>{t('channelKpiPage.guideTip5')}</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>


    );
}
