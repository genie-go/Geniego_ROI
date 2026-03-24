// ═══════════════════════════════════════════════════════════
//  📊 ChannelKPI — Channel KPI Advanced Management Hub
//  8 tabs: Goals / Channel Roles / KPI Setup / SNS / Content / Community / Targets / Monitor·AI
// ═══════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const API = '/api';

/* ── Color Palette ─────────────────────────────────────── */
const C = {
    blue: '#4f8ef7', purple: '#a855f7', green: '#22c55e',
    orange: '#f97316', yellow: '#eab308', red: '#ef4444',
    teal: '#14d9b0', pink: '#f472b6',
};

/* ── Common Styles ─────────────────────────────────────── */
const CARD = {
    background: 'linear-gradient(145deg,rgba(255,255,255,0.02),rgba(6,11,20,0.98))',
    border: '1px solid rgba(99,140,255,0.10)', borderRadius: 14, padding: '16px 18px',
};
const LBL = { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 };
const SEC = { fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.82)', marginBottom: 14 };

/* ── Gauge Bar ─────────────────────────────────────────── */
function GaugeBar({ label, current, target, unit = '', color = C.blue, reverse = false }) {
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const ok = reverse ? current <= target : current >= target;
    const col = ok ? C.green : pct >= 70 ? C.orange : C.red;
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                <span style={{ fontWeight: 800, color: col }}>
                    {unit}{current.toLocaleString()} / Target {unit}{target.toLocaleString()}
                    <span style={{ marginLeft: 6, fontSize: 10, color: ok ? C.green : C.red }}>{ok ? '✓ Achieved' : `${pct.toFixed(0)}%`}</span>
                </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${col},${col}88)`, borderRadius: 3, transition: 'width 0.6s' }} />
            </div>
        </div>
    );
}

/* ── Metric Card ─────────────────────────────────────── */
function MetCard({ icon, label, value, sub, color }) {
    return (
        <div style={{ ...CARD, borderColor: color + '22' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={LBL}>{label}</span>
                <span style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Tab 1: Goal Setting
════════════════════════════════════════════════════════════ */
function GoalTab({ goals, setGoals }) {
    const GOAL_ITEMS = [
        { key: 'awareness', icon: '📣', label: 'Brand Awareness', desc: 'Reach, impressions, brand search volume', color: C.purple },
        { key: 'traffic', icon: '🌐', label: 'Website Traffic', desc: 'SEO, ad clicks, content-driven visits', color: C.blue },
        { key: 'conversion', icon: '🛒', label: 'Inquiries / Purchases', desc: 'Conv. rate, CPA, ROAS optimization', color: C.green },
    ];
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>🎯 Business Goal Setting</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {GOAL_ITEMS.map(g => (
                    <div key={g.key} onClick={() => setGoals(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                        style={{
                            ...CARD, borderColor: goals[g.key] ? g.color + '60' : 'rgba(99,140,255,0.1)', cursor: 'pointer',
                            background: goals[g.key] ? `linear-gradient(145deg,${g.color}12,rgba(6,11,20,0.98))` : CARD.background,
                            transform: goals[g.key] ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s'
                        }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: goals[g.key] ? g.color : 'rgba(255,255,255,0.7)', marginBottom: 6 }}>{g.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{g.desc}</div>
                        <div style={{
                            marginTop: 12, padding: '4px 10px', borderRadius: 20, width: 'fit-content',
                            background: goals[g.key] ? g.color : 'rgba(255,255,255,0.06)', color: goals[g.key] ? '#fff' : 'rgba(255,255,255,0.35)',
                            fontSize: 10, fontWeight: 800
                        }}>{goals[g.key] ? '✓ Selected' : 'Click to Select'}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ ...CARD, background: 'linear-gradient(145deg,rgba(79,142,247,0.06),rgba(6,11,20,0.98))' }}>
                <div style={LBL}>Selected Goals</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GOAL_ITEMS.filter(g => goals[g.key]).map(g => (
                        <span key={g.key} style={{ padding: '4px 12px', borderRadius: 20, background: g.color + '22', color: g.color, fontSize: 11, fontWeight: 700, border: `1px solid ${g.color}44` }}>
                            {g.icon} {g.label}
                        </span>
                    ))}
                    {!GOAL_ITEMS.some(g => goals[g.key]) && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Please select a goal</span>}
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Tab 2: Channel Role Definition
════════════════════════════════════════════════════════════ */
function ChannelRoleTab() {
    const ROLES = [
        {
            ch: '🔍 Search Ads', role: 'Capture high-intent users', kpis: ['CTR', 'CPC', 'Conv. Rate', 'CPA', 'ROAS'], color: C.blue,
            desc: 'Target users with clear purchase intent. Drive immediate conversions through keyword-based ads.'
        },
        {
            ch: '📣 SNS Ads', role: 'Brand awareness & reach', kpis: ['Reach', 'Engagement', 'CTR', 'Video Views'], color: C.pink,
            desc: 'Expose the brand to a broad audience. Build awareness and interest through visual content.'
        },
        {
            ch: '📝 Blog', role: 'Info & trust building', kpis: ['Page Views', 'Visitors', 'Avg. Time', 'Search Traffic'], color: C.green,
            desc: 'Strengthen SEO with in-depth content. Build trust through expertise and thought leadership.'
        },
        {
            ch: '💬 Community', role: 'Customer relationship', kpis: ['Post Views', 'Comments', 'Inquiries', 'New Members'], color: C.orange,
            desc: 'Ongoing communication with existing customers. Build loyal community and hub marketing.'
        },
    ];
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>📡 Channel Role Definition</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {ROLES.map(r => (
                    <div key={r.ch} style={{ ...CARD, borderColor: r.color + '30' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontSize: 15, fontWeight: 900, color: r.color }}>{r.ch}</div>
                            <span style={{ padding: '3px 10px', borderRadius: 20, background: r.color + '18', color: r.color, fontSize: 10, fontWeight: 800 }}>{r.role}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 10 }}>{r.desc}</div>
                        <div style={LBL}>Core KPIs</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {r.kpis.map(k => (
                                <span key={k} style={{ padding: '2px 9px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${r.color}40`, color: r.color, fontSize: 10, fontWeight: 700 }}>{k}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Tab 3: Channel KPI Setup (Search-centric)
════════════════════════════════════════════════════════════ */
function KpiSetupTab({ kpiTargets, setKpiTargets }) {
    const FIELDS = [
        { key: 'ctr', label: 'CTR (Click-Through Rate)', unit: '%', ph: '3.0', hint: 'Target 3%+ recommended' },
        { key: 'convRate', label: 'Conv. Rate', unit: '%', ph: '5.0', hint: 'Target 5%+ recommended' },
        { key: 'cpa', label: 'CPA (Cost Per Acquisition)', unit: '₩', ph: '15000', hint: 'Lower is more efficient' },
        { key: 'roas', label: 'ROAS (Return on Ad Spend)', unit: '%', ph: '300', hint: 'Target 300%+' },
        { key: 'cpc', label: 'CPC (Cost Per Click)', unit: '₩', ph: '1000', hint: 'Lower is better' },
    ];
    const CHANNELS = ['Search Ads', 'SNS Ads', 'Blog', 'Community'];
    const [selCh, setSelCh] = useState('Search Ads');

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>⚙️ Channel KPI Target Setup</div>
            <div style={{ display: 'flex', gap: 8 }}>
                {CHANNELS.map(ch => (
                    <button key={ch} onClick={() => setSelCh(ch)}
                        style={{
                            padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                            background: selCh === ch ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(255,255,255,0.05)',
                            color: selCh === ch ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s'
                        }}>
                        {ch}
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
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{f.unit}</span>
                                <input value={kpiTargets[k] ?? ''} placeholder={f.ph}
                                    onChange={e => setKpiTargets(prev => ({ ...prev, [k]: e.target.value }))}
                                    style={{
                                        flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8, color: '#e2e8f0', padding: '7px 10px', fontSize: 13, fontWeight: 700
                                    }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>{f.hint}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Tab 4: SNS Ad KPI
════════════════════════════════════════════════════════════ */
function SnsKpiTab() {
    const { fmt } = useCurrency();
    const SNS_DATA = [
        { ch: '📘 Meta', reach: 2100000, engagement: 142000, ctr: 4.0, videoViews: 890000, color: '#1877f2' },
        { ch: '🎵 TikTok', reach: 5400000, engagement: 380000, ctr: 2.6, videoViews: 2800000, color: '#EE1D52' },
        { ch: '📸 Instagram', reach: 1820000, engagement: 98000, ctr: 3.7, videoViews: 650000, color: '#E1306C' },
        { ch: '▶ YouTube', reach: 3200000, engagement: 62000, ctr: 0.9, videoViews: 3100000, color: '#FF0000' },
    ];
    const METRICS = [
        { key: 'reach', label: 'Reach', icon: '👁', color: C.blue, fmt: v => (v / 1000000).toFixed(1) + 'M' },
        { key: 'engagement', label: 'Engagement', icon: '💬', color: C.green, fmt: v => (v / 1000).toFixed(0) + 'K' },
        { key: 'ctr', label: 'CTR', icon: '🖱', color: C.orange, fmt: v => v.toFixed(1) + '%' },
        { key: 'videoViews', label: 'Video Views', icon: '▶', color: C.red, fmt: v => (v / 1000000).toFixed(1) + 'M' },
    ];
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>📣 SNS Ad KPI Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {METRICS.map(m => (
                    <MetCard key={m.key} icon={m.icon} label={m.label}
                        value={m.fmt(SNS_DATA.reduce((s, d) => s + d[m.key], 0))}
                        sub="All channels combined" color={m.color} />
                ))}
            </div>
            <div style={CARD}>
                <div style={LBL}>SNS KPI by Channel</div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(4,1fr)', gap: 8, fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
                    <span>Channel</span><span>Reach</span><span>Engagement</span><span>CTR</span><span>Video Views</span>
                </div>
                {SNS_DATA.map(d => (
                    <div key={d.ch} style={{ display: 'grid', gridTemplateColumns: '120px repeat(4,1fr)', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', fontSize: 11 }}>
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

/* ════════════════════════════════════════════════════════════
   Tab 5: Content Channel (Blog) KPI
════════════════════════════════════════════════════════════ */
function ContentKpiTab() {
    const DATA = [
        { month: 'Jan', views: 128000, visitors: 84000, avgTime: 185, searchIn: 62000 },
        { month: 'Feb', views: 142000, visitors: 96000, avgTime: 192, searchIn: 71000 },
        { month: 'Mar', views: 168000, visitors: 112000, avgTime: 208, searchIn: 88000 },
    ];
    const latest = DATA[DATA.length - 1];
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>📝 Content Channel (Blog) KPI</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <MetCard icon="👁" label="Page Views" value={(latest.views / 1000).toFixed(0) + 'K'} sub="Content impressions" color={C.blue} />
                <MetCard icon="🧑" label="Visitors" value={(latest.visitors / 1000).toFixed(0) + 'K'} sub="Site traffic" color={C.green} />
                <MetCard icon="⏱" label="Avg. Time on Site" value={Math.floor(latest.avgTime / 60) + 'm ' + (latest.avgTime % 60) + 's'} sub="Content engagement" color={C.orange} />
                <MetCard icon="🔍" label="Search Traffic" value={(latest.searchIn / 1000).toFixed(0) + 'K'} sub="SEO impact" color={C.purple} />
            </div>
            <div style={CARD}>
                <div style={LBL}>Monthly Trend</div>
                {DATA.map((d, i) => (
                    <div key={d.month} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{d.month}</span>
                        {[
                            [d.views, 200000, C.blue, 'Views'],
                            [d.visitors, 130000, C.green, 'Visitors'],
                            [d.avgTime, 240, C.orange, 'Time(s)'],
                            [d.searchIn, 100000, C.purple, 'Search'],
                        ].map(([v, max, col, lbl], j) => (
                            <div key={j}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9 }}>{lbl}</span>
                                    <span style={{ color: col, fontWeight: 700 }}>{v.toLocaleString()}</span>
                                </div>
                                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                    <div style={{ width: `${(v / max) * 100}%`, height: '100%', background: col, borderRadius: 2 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Tab 6: Community / Cafe KPI
════════════════════════════════════════════════════════════ */
function CommunityKpiTab() {
    const PLATFORMS = [
        { name: 'Naver Cafe', views: 84200, comments: 1240, inquiries: 380, newMembers: 520, color: '#03c75a' },
        { name: 'KakaoTalk Channel', views: 62000, comments: 890, inquiries: 290, newMembers: 380, color: '#fbbf24' },
        { name: 'Own Community', views: 28400, comments: 640, inquiries: 210, newMembers: 180, color: C.blue },
    ];
    const totals = PLATFORMS.reduce((acc, p) => ({
        views: acc.views + p.views, comments: acc.comments + p.comments,
        inquiries: acc.inquiries + p.inquiries, newMembers: acc.newMembers + p.newMembers,
    }), { views: 0, comments: 0, inquiries: 0, newMembers: 0 });

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>💬 Community / Cafe KPI</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                <MetCard icon="📰" label="Post Views" value={(totals.views / 1000).toFixed(0) + 'K'} sub="Content interest" color={C.blue} />
                <MetCard icon="💬" label="Comments" value={totals.comments.toLocaleString()} sub="Community activity" color={C.green} />
                <MetCard icon="❓" label="Inquiries" value={totals.inquiries.toLocaleString()} sub="Interest conversion" color={C.orange} />
                <MetCard icon="👥" label="New Members" value={totals.newMembers.toLocaleString()} sub="Community growth" color={C.purple} />
            </div>
            {PLATFORMS.map(p => (
                <div key={p.name} style={{ ...CARD, borderColor: p.color + '30' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: p.color, marginBottom: 12 }}>{p.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                        {[['Post Views', p.views, totals.views], ['Comments', p.comments, totals.comments],
                        ['Inquiries', p.inquiries, totals.inquiries], ['New Members', p.newMembers, totals.newMembers]].map(([lbl, v, tot]) => (
                            <div key={lbl}>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{lbl}</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: p.color }}>{v.toLocaleString()}</div>
                                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4 }}>
                                    <div style={{ width: `${(v / tot) * 100}%`, height: '100%', background: p.color, borderRadius: 2 }} />
                                </div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{((v / tot) * 100).toFixed(0)}% share</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Tab 7: KPI Target Figures & Achievement
════════════════════════════════════════════════════════════ */
function KpiTargetTab({ kpiTargets }) {
    const ACTUALS = {
        ctr: 3.64, convRate: 3.8, cpa: 46200, roas: 312, cpc: 348,
    };
    const DEFAULTS = { ctr: 3, convRate: 5, cpa: 50000, roas: 300, cpc: 1000 };
    const ITEMS = [
        { key: 'ctr', label: 'CTR', unit: '%', desc: 'Ad click-through rate', reverse: false },
        { key: 'convRate', label: 'Conv. Rate', unit: '%', desc: 'Click → Purchase rate', reverse: false },
        { key: 'cpa', label: 'CPA', unit: '₩', desc: 'Cost per acquisition', reverse: true },
        { key: 'roas', label: 'ROAS', unit: '%', desc: 'Return on ad spend', reverse: false },
        { key: 'cpc', label: 'CPC', unit: '₩', desc: 'Cost per click', reverse: true },
    ];

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>🎯 KPI Target vs Actuals</div>
            <div style={{ ...CARD, background: 'linear-gradient(145deg,rgba(79,142,247,0.06),rgba(6,11,20,0.98))' }}>
                <div style={LBL}>Overall Channel Achievement</div>
                {ITEMS.map(it => {
                    const tgt = parseFloat(kpiTargets[`Search Ads_${it.key}`] ?? DEFAULTS[it.key]);
                    const actual = ACTUALS[it.key];
                    return <GaugeBar key={it.key} label={it.label} current={actual} target={tgt} unit={it.unit === '₩' ? '₩' : ''} reverse={it.reverse} />;
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
                                {it.unit === '₩' ? '₩' : ''}{actual.toLocaleString()}{it.unit === '%' ? '%' : ''}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Target {it.unit === '₩' ? '₩' : ''}{tgt.toLocaleString()}{it.unit === '%' ? '%' : ''}</div>
                            <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: ok ? C.green : C.red }}>{ok ? '✅ Achieved' : '⚠️ Below Target'}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Tab 8: Monitoring & Claude AI Analysis
════════════════════════════════════════════════════════════ */
function MonitoringTab({ goals, kpiTargets }) {
    const [period, setPeriod] = useState('weekly');
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState(null);

    const QUESTIONS = [
        { id: 'efficiency', label: 'Which channel is the most efficient?' },
        { id: 'costPerf', label: 'Cost vs. performance analysis' },
        { id: 'improve', label: 'Identify channels needing improvement' },
    ];

    const runAI = useCallback(async () => {
        setStatus('loading'); setResult(null);
        const payload = {
            data: {
                goals,
                kpi_targets: kpiTargets,
                period,
                actuals: {
                    search: { ctr: 3.64, convRate: 3.8, cpa: 46200, roas: 312, cpc: 348, spend: 186000, revenue: 3420000 },
                    sns: { reach: 12520000, engagement: 682000, ctr: 2.8, videoViews: 7440000, spend: 409800, revenue: 7320000 },
                    blog: { views: 168000, visitors: 112000, avgTime: 208, searchIn: 88000 },
                    community: { views: 174600, comments: 2770, inquiries: 880, newMembers: 1080 },
                },
            },
        };
        try {
            const res = await fetch(`${API}/v422/ai/channel-kpi-eval`, {
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
            const r = await fetch(`${API}/v422/ai/analyses?context=channel_kpi_eval&limit=5`, { credentials: 'include' });
            const d = await r.json();
            setHistory(d.analyses || []);
        } catch { setHistory([]); }
    }, []);

    const WEEK_DATA = [
        { week: 'Week 1', ctr: 3.2, conv: 4.1, roas: 280 },
        { week: 'Week 2', ctr: 3.5, conv: 4.4, roas: 295 },
        { week: 'Week 3', ctr: 3.7, conv: 3.9, roas: 308 },
        { week: 'Week 4', ctr: 3.64, conv: 3.8, roas: 312 },
    ];

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={SEC}>📈 KPI Monitoring & AI Analysis</div>

            {/* Period selection + AI run */}
            <div style={{ ...CARD, background: 'linear-gradient(145deg,rgba(79,142,247,0.08),rgba(6,11,20,0.98))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 26 }}>🤖</div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: C.blue }}>Claude AI Channel KPI Analysis</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>Comprehensive KPI achievement evaluation · Action improvements</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {['weekly', 'monthly'].map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                            style={{
                                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                background: period === p ? C.blue : 'rgba(255,255,255,0.05)',
                                color: period === p ? '#fff' : 'rgba(255,255,255,0.45)', transition: 'all 0.2s'
                            }}>
                            {p === 'weekly' ? '🗓 Weekly Analysis' : '📅 Monthly Review'}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={runAI} disabled={status === 'loading'}
                        style={{
                            flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            background: status === 'loading' ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                            color: '#fff', fontWeight: 800, fontSize: 11, transition: 'all 0.2s'
                        }}>
                        {status === 'loading' ? '⏳ Analyzing...' : '🚀 Run AI Channel KPI Analysis'}
                    </button>
                    <button onClick={loadHistory}
                        style={{
                            padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 11, fontWeight: 700
                        }}>
                        📜 History
                    </button>
                </div>
            </div>

            {/* Error */}
            {status === 'error' && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 12, color: '#ef4444' }}>
                    ❌ {result?.error}
                </div>
            )}

            {/* AI Result */}
            {status === 'done' && result && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {result.summary && (
                        <div style={CARD}>
                            <div style={LBL}>📋 AI Summary Analysis</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.75 }}>{result.summary}</div>
                            {result.top_insight && (
                                <div style={{ marginTop: 8, padding: '8px 11px', borderRadius: 8, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 11, color: C.blue, fontWeight: 600 }}>
                                    💡 Key Insight: {result.top_insight}
                                </div>
                            )}
                            {result.immediate_action && (
                                <div style={{ marginTop: 6, padding: '8px 11px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, color: C.green, fontWeight: 700 }}>
                                    ⚡ Immediate Action: {result.immediate_action}
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
                                    <div style={{ fontSize: 9, fontWeight: 700, color: C.green, marginBottom: 4 }}>✅ Strengths</div>
                                    {(ch.strengths || []).map((s, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>• {s}</div>)}
                                </div>
                                <div style={{ background: 'rgba(239,68,68,0.07)', borderRadius: 7, padding: '7px 9px', border: '1px solid rgba(239,68,68,0.14)' }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: C.red, marginBottom: 4 }}>⚠️ Improvements</div>
                                    {(ch.weaknesses || []).map((w, i) => <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>• {w}</div>)}
                                </div>
                            </div>
                            {ch.action && (
                                <div style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.15)', fontSize: 11, color: C.blue }}>
                                    🎯 {ch.action}
                                </div>
                            )}
                        </div>
                    ))}
                    {(result.improvements || []).length > 0 && (
                        <div style={CARD}>
                            <div style={LBL}>🔧 Improvement Recommendations</div>
                            {result.improvements.map((imp, i) => (
                                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>#{i + 1} {imp.title}</div>
                                    {imp.detail && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{imp.detail}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Weekly Trend */}
            <div style={CARD}>
                <div style={LBL}>📊 Weekly Ad Performance Trend (Search Ads)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(3,1fr)', gap: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span>Period</span><span>CTR</span><span>Conv. Rate</span><span>ROAS</span>
                </div>
                {WEEK_DATA.map(w => (
                    <div key={w.week} style={{ display: 'grid', gridTemplateColumns: '60px repeat(3,1fr)', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{w.week}</span>
                        <span style={{ color: w.ctr >= 3 ? C.green : C.orange, fontWeight: 700 }}>{w.ctr}%</span>
                        <span style={{ color: w.conv >= 5 ? C.green : C.orange, fontWeight: 700 }}>{w.conv}%</span>
                        <span style={{ color: w.roas >= 300 ? C.green : C.orange, fontWeight: 700 }}>{w.roas}%</span>
                    </div>
                ))}
            </div>

            {/* Analysis Checklist */}
            <div style={CARD}>
                <div style={LBL}>✅ Regular Analysis Checklist</div>
                {QUESTIONS.map(q => (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{q.label}</span>
                    </div>
                ))}
            </div>

            {/* History */}
            {history && (
                <div style={CARD}>
                    <div style={LBL}>📜 AI Analysis History</div>
                    {history.length === 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No history</div>}
                    {history.map(h => (
                        <div key={h.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: C.blue, fontWeight: 700 }}>#{h.id}</span>
                                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10 }}>{(h.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.5)' }}>{(h.summary || '').slice(0, 85)}…</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════════ */
const TABS = [
    { id: 'goal', label: '🎯 Goals' },
    { id: 'role', label: '📡 Channel Roles' },
    { id: 'kpi', label: '⚙️ KPI Setup' },
    { id: 'sns', label: '📣 SNS KPI' },
    { id: 'content', label: '📝 Content KPI' },
    { id: 'community', label: '💬 Community KPI' },
    { id: 'target', label: '🎯 KPI Targets' },
    { id: 'monitor', label: '📈 Monitor·AI' },
];

export default function ChannelKPI() {
  const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { budgetStats, channelBudgets, pnlStats, orderStats } = useGlobalData();

    const [tab, setTab] = useState('goal');
    const [goals, setGoals] = useState({ awareness: true, traffic: true, conversion: false });
    const [kpiTargets, setKpiTargets] = useState({});

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {/* Header */}
            <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))', borderColor: 'rgba(79,142,247,0.2)' }}>
                <div className="hero-meta" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(168,85,247,0.15))' }}>📊</div>
                        <div>
                            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Channel KPI Advanced Management
                            </div>
                            <div className="hero-desc">Measurable KPIs · Business goal alignment · Channel role matching · Periodic AI evaluation</div>
                            {/* ✅ GlobalDataContext Real-time KPIs */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                <span className="badge" style={{ background: 'rgba(79,142,247,0.12)', color: '#60a5fa', border: '1px solid rgba(79,142,247,0.25)' }}>
                                    🔴 Ad Spend ₩{(budgetStats.totalSpent / 1e6).toFixed(1)}M
                                </span>
                                <span className="badge" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                                    Blended ROAS {budgetStats.blendedRoas.toFixed(2)}x
                                </span>
                                <span className="badge" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>
                                    Orders {orderStats.count}
                                </span>
                                <span className="badge" style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}>
                                    Op. Profit ₩{(pnlStats.operatingProfit / 1e6).toFixed(1)}M
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                <button onClick={() => navigate('/pnl-dashboard')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>🌊 P&L →</button>
                                <button onClick={() => navigate('/budget-planner')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>💰 Budget →</button>
                                <button onClick={() => navigate('/omni-channel')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>📡 Channel Orders →</button>
                            </div>
                        </div>
                    </div>
                    {/* Channel ROAS Mini Panel */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, minWidth: 260 }}>
                        {Object.entries(channelBudgets).slice(0, 6).map(([id, ch]) => (
                            <div key={id} style={{ padding: '8px 10px', borderRadius: 10, background: `${ch.color}10`, border: `1px solid ${ch.color}30`, textAlign: 'center' }}>
                                <div style={{ fontSize: 14 }}>{ch.icon}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{ch.name}</div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: ch.roas >= ch.targetRoas ? '#22c55e' : '#ef4444' }}>
                                    {ch.roas.toFixed(1)}x
                                </div>
                                <div style={{ fontSize: 8, color: 'var(--text-3)' }}>Target {ch.targetRoas}x</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, flex: '1 1 auto',
                            background: tab === t.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                            color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)', transition: 'all 0.2s',
                            boxShadow: tab === t.id ? '0 4px 14px rgba(79,142,247,0.35)' : undefined
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div>
                {tab === 'goal' && <GoalTab goals={goals} setGoals={setGoals} />}
                {tab === 'role' && <ChannelRoleTab />}
                {tab === 'kpi' && <KpiSetupTab kpiTargets={kpiTargets} setKpiTargets={setKpiTargets} />}
                {tab === 'sns' && <SnsKpiTab />}
                {tab === 'content' && <ContentKpiTab />}
                {tab === 'community' && <CommunityKpiTab />}
                {tab === 'target' && <KpiTargetTab kpiTargets={kpiTargets} />}
                {tab === 'monitor' && <MonitoringTab goals={goals} kpiTargets={kpiTargets} />}
            </div>
        </div>
    );
}
