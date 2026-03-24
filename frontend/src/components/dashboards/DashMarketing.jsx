// DashMarketing - Marketing Channel Performance + AI 5-Section Analysis
// ✅ GlobalDataContext 실시간 연동: 채널 광고비/ROAS 실시간 반영
import { useState, useMemo, useEffect } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { LineChart, BarChart, Spark, seedSeries, fmt } from './ChartUtils.jsx';
import MarketingAIPanel from '../MarketingAIPanel.jsx';

function useIsMobile() {
    const [mobile, setMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const h = () => setMobile(window.innerWidth <= 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return mobile;
}

const CHANNELS = {
    meta: {
        name: 'Meta Ads', icon: '📘', color: '#1877f2',
        gradient: 'linear-gradient(135deg,#1877f2,#0d5dbf)',
        revenue: 2840000, spend: 148200, roas: 3.2, clicks: 84200,
        impressions: 2100000, ctr: 4.0, cpc: 342, convRate: 3.8,
        conversions: 3200, purchases: 3200, signups: 520, cartAdds: 9800,
        sessions: 78000, bounceRate: 38, avgSessionTime: 142,
        gender: { male: 38, female: 62 },
        age: [{ group: '13-17', pct: 5 }, { group: '18-24', pct: 22 }, { group: '25-34', pct: 34 }, { group: '35-44', pct: 24 }, { group: '45-54', pct: 10 }, { group: '55+', pct: 5 }],
        regions: [{ name: '\uc11c\uc6b8', pct: 28, rev: 795200 }, { name: '\uacbd\uae30', pct: 18, rev: 511200 }, { name: '\ubd80\uc0b0', pct: 12, rev: 340800 }, { name: '\uc778\ucc9c', pct: 9, rev: 255600 }, { name: '\ub300\uad6c', pct: 7, rev: 198800 }],
        funnel: [{ stage: '\ub178\ucd9c', val: 2100000 }, { stage: '\ud074\ub9ad', val: 84200 }, { stage: '\uc870\ud68c', val: 38400 }, { stage: '\uc7a5\ubc14\uad6c\ub2c8', val: 9800 }, { stage: '\uad6c\ub9e4', val: 3200 }],
        adTypes: [{ type: '\ub9b4\uc2a4', spend: 68200, roas: 3.8, conv: 1480 }, { type: '\ud53c\ub4dc', spend: 52000, roas: 2.9, conv: 980 }, { type: '\uc2a4\ud1a0\ub9ac', spend: 28000, roas: 2.4, conv: 740 }],
        interests: ['Beauty', 'Lifestyle', 'Fitness', 'Food', 'Parenting'],
        sparkData: null,
    },
    tiktok: {
        name: 'TikTok Ads', icon: '🎵', color: '#EE1D52',
        gradient: 'linear-gradient(135deg,#69C9D0,#EE1D52)',
        revenue: 1920000, spend: 89400, roas: 2.8, clicks: 142000,
        impressions: 5400000, ctr: 2.6, cpc: 219, convRate: 2.1,
        conversions: 2980, purchases: 2980, signups: 380, cartAdds: 9200,
        sessions: 124000, bounceRate: 52, avgSessionTime: 95,
        gender: { male: 44, female: 56 },
        age: [{ group: '13-17', pct: 12 }, { group: '18-24', pct: 38 }, { group: '25-34', pct: 30 }, { group: '35-44', pct: 14 }, { group: '45-54', pct: 4 }, { group: '55+', pct: 2 }],
        regions: [{ name: '\uc11c\uc6b8', pct: 24, rev: 460800 }, { name: '\uacbd\uae30', pct: 20, rev: 384000 }, { name: '\ubd80\uc0b0', pct: 14, rev: 268800 }, { name: '\uc778\ucc9c', pct: 10, rev: 192000 }, { name: '\ub300\uc804', pct: 8, rev: 153600 }],
        funnel: [{ stage: '\ub178\ucd9c', val: 5400000 }, { stage: '\ud074\ub9ad', val: 142000 }, { stage: '\uc870\ud68c', val: 48000 }, { stage: '\uc7a5\ubc14\uad6c\ub2c8', val: 9200 }, { stage: '\uad6c\ub9e4', val: 2980 }],
        adTypes: [{ type: 'TopView', spend: 42000, roas: 3.2, conv: 1240 }, { type: 'In-Feed', spend: 31400, roas: 2.6, conv: 980 }, { type: 'Spark Ads', spend: 16000, roas: 2.1, conv: 760 }],
        interests: ['Dance', 'Music', 'Fashion', 'Gaming', 'Food'],
        sparkData: null,
    },
    instagram: {
        name: 'Instagram', icon: '📸', color: '#E1306C',
        gradient: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)',
        revenue: 1580000, spend: 72800, roas: 3.1, clicks: 68400,
        impressions: 1820000, ctr: 3.7, cpc: 298, convRate: 3.4,
        conversions: 2320, purchases: 2320, signups: 290, cartAdds: 8200,
        sessions: 61000, bounceRate: 42, avgSessionTime: 118,
        gender: { male: 35, female: 65 },
        age: [{ group: '13-17', pct: 8 }, { group: '18-24', pct: 28 }, { group: '25-34', pct: 36 }, { group: '35-44', pct: 20 }, { group: '45-54', pct: 6 }, { group: '55+', pct: 2 }],
        regions: [{ name: '\uc11c\uc6b8', pct: 32, rev: 505600 }, { name: '\uacbd\uae30', pct: 22, rev: 347600 }, { name: '\ubd80\uc0b0', pct: 10, rev: 158000 }, { name: '\uc778\ucc9c', pct: 8, rev: 126400 }, { name: '\uc81c\uc8fc', pct: 6, rev: 94800 }],
        funnel: [{ stage: '\ub178\ucd9c', val: 1820000 }, { stage: '\ud074\ub9ad', val: 68400 }, { stage: '\uc870\ud68c', val: 29800 }, { stage: '\uc7a5\ubc14\uad6c\ub2c8', val: 8200 }, { stage: '\uad6c\ub9e4', val: 2320 }],
        adTypes: [{ type: 'Reels', spend: 38000, roas: 3.6, conv: 1080 }, { type: 'Shopping', spend: 22800, roas: 2.8, conv: 720 }, { type: 'Stories', spend: 12000, roas: 2.2, conv: 520 }],
        interests: ['Fashion', 'Beauty', 'Travel', 'Interior', 'Wellness'],
        sparkData: null,
    },
    youtube: {
        name: 'YouTube Ads', icon: '\u25B6', color: '#FF0000',
        gradient: 'linear-gradient(135deg,#FF0000,#cc0000)',
        revenue: 980000, spend: 58400, roas: 2.4, clicks: 28600,
        impressions: 3200000, ctr: 0.9, cpc: 482, convRate: 1.8,
        conversions: 515, purchases: 515, signups: 120, cartAdds: 2800,
        sessions: 25000, bounceRate: 61, avgSessionTime: 205,
        gender: { male: 58, female: 42 },
        age: [{ group: '13-17', pct: 6 }, { group: '18-24', pct: 18 }, { group: '25-34', pct: 28 }, { group: '35-44', pct: 28 }, { group: '45-54', pct: 14 }, { group: '55+', pct: 6 }],
        regions: [{ name: '\uc11c\uc6b8', pct: 30, rev: 294000 }, { name: '\uacbd\uae30', pct: 22, rev: 215600 }, { name: '\ub300\uc804', pct: 14, rev: 137200 }, { name: '\ubd80\uc0b0', pct: 11, rev: 107800 }, { name: '\ub300\uad6c', pct: 8, rev: 78400 }],
        funnel: [{ stage: '\ub178\ucd9c', val: 3200000 }, { stage: '\ud074\ub9ad', val: 28600 }, { stage: '\uc870\ud68c', val: 12400 }, { stage: '\uc7a5\ubc14\uad6c\ub2c8', val: 2800 }, { stage: '\uad6c\ub9e4', val: 515 }],
        adTypes: [{ type: 'Instream', spend: 38000, roas: 2.6, conv: 320 }, { type: 'Discovery', spend: 14800, roas: 2.1, conv: 140 }, { type: 'Bumper', spend: 5600, roas: 1.8, conv: 55 }],
        interests: ['Tech Review', 'DIY', 'Finance', 'Gaming', 'Automotive'],
        sparkData: null,
    },
    google: {
        name: 'Google Ads', icon: '🔍', color: '#34A853',
        gradient: 'linear-gradient(135deg,#4285F4,#34A853)',
        revenue: 3420000, spend: 186000, roas: 3.8, clicks: 62400,
        impressions: 890000, ctr: 7.0, cpc: 498, convRate: 5.2,
        conversions: 3245, purchases: 3245, signups: 680, cartAdds: 11200,
        sessions: 58000, bounceRate: 31, avgSessionTime: 168,
        gender: { male: 52, female: 48 },
        age: [{ group: '13-17', pct: 2 }, { group: '18-24', pct: 14 }, { group: '25-34', pct: 32 }, { group: '35-44', pct: 30 }, { group: '45-54', pct: 16 }, { group: '55+', pct: 6 }],
        regions: [{ name: '\uc11c\uc6b8', pct: 36, rev: 1231200 }, { name: '\uacbd\uae30', pct: 24, rev: 820800 }, { name: '\ubd80\uc0b0', pct: 12, rev: 410400 }, { name: '\uc778\ucc9c', pct: 8, rev: 273600 }, { name: '\uad11\uc8fc', pct: 6, rev: 205200 }],
        funnel: [{ stage: '\ub178\ucd9c', val: 890000 }, { stage: '\ud074\ub9ad', val: 62400 }, { stage: '\uc870\ud68c', val: 42000 }, { stage: '\uc7a5\ubc14\uad6c\ub2c8', val: 11200 }, { stage: '\uad6c\ub9e4', val: 3245 }],
        adTypes: [{ type: 'Search', spend: 112000, roas: 4.2, conv: 1960 }, { type: 'Shopping', spend: 58000, roas: 3.6, conv: 1040 }, { type: 'Display', spend: 16000, roas: 2.1, conv: 245 }],
        interests: ['Electronics', 'Software', 'Business', 'Shopping', 'Finance'],
        sparkData: null,
    },
};

const CHAN_LIST = Object.entries(CHANNELS).map(([id, c]) => ({ id, ...c }));
CHAN_LIST.forEach(c => { c.sparkData = seedSeries(c.revenue / 14, 14, 0.18); });

const DAYS = Array.from({ length: 14 }, (_, i) => {
    const d = new Date('2026-02-19');
    d.setDate(d.getDate() + i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
});

const G = 14;
const CARD = {
    background: 'linear-gradient(145deg,rgba(255,255,255,0.02),rgba(6,11,20,0.98))',
    border: '1px solid rgba(99,140,255,0.10)', borderRadius: 16, padding: '16px 18px',
};
const LABEL = { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 };

function MetRow({ l, v, col = 'rgba(255,255,255,0.82)' }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>{l}</span>
            <span style={{ fontWeight: 700, color: col }}>{v}</span>
        </div>
    );
}

function ChannelDetailPanel({ ch }) {
    const c = CHANNELS[ch];
    if (!c) return null;
    const cpm = Math.round(c.spend / c.impressions * 1000);
    const reach = Math.round(c.impressions * 0.72);
    const cpa = Math.round(c.spend / c.conversions);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: G, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '12px 14px', borderRadius: 12, background: `linear-gradient(135deg,${c.color}18,rgba(6,11,20,0.98))`, border: `1px solid ${c.color}28` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{c.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: c.color }}>{c.name} — 5\uC139\uC158 \uBD84\uC11D</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {[['ROAS', c.roas + 'x'], ['CTR', c.ctr + '%'], ['\uC804\uD658\uC728', c.convRate + '%'],
                    ['CPC', '\u20A9' + c.cpc], ['\uAD11\uACE0\uBE44', fmt(c.spend, { prefix: '\u20A9' })], ['\uB9E4\uCD9C', fmt(c.revenue, { prefix: '\u20A9' })]].map(([l, v]) => (
                        <div key={l} style={{ background: 'rgba(0,0,0,0.24)', borderRadius: 8, padding: '6px 8px' }}>
                            <div style={LABEL}>{l}</div>
                            <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.82)' }}>{v}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={CARD}>
                <div style={LABEL}>1. \uB178\uCD9C \uC131\uACFC (Reach/Awareness)</div>
                <MetRow l="Impressions" v={c.impressions.toLocaleString()} col={c.color} />
                <MetRow l="Reach" v={reach.toLocaleString()} col={c.color} />
                <MetRow l="Frequency" v={(c.impressions / reach).toFixed(2) + '\uD68C'} col={c.color} />
                <MetRow l="CPM" v={'\u20A9' + cpm.toLocaleString()} col={c.color} />
                <MetRow l="\uAD11\uACE0\uBE44" v={fmt(c.spend, { prefix: '\u20A9' })} col={c.color} />
            </div>

            <div style={CARD}>
                <div style={LABEL}>2. \uCC38\uC5EC (Engagement)</div>
                <MetRow l="\uD074\uB9AD\uC218" v={c.clicks.toLocaleString()} col="#22c55e" />
                <MetRow l="CTR" v={c.ctr + '%'} col="#22c55e" />
                <MetRow l="\uC601\uC0C1 \uC870\uD68C\uC218" v={Math.round(c.clicks * 2.4).toLocaleString()} col="#22c55e" />
                <MetRow l="\uD3C9\uADE0 \uC2DC\uCCAD\uC2DC\uAC04" v={Math.round(c.avgSessionTime * 0.6) + '\uCD08'} col="#22c55e" />
            </div>

            <div style={CARD}>
                <div style={LABEL}>3. \uD2B8\uB798\uD53D (Traffic)</div>
                <MetRow l="CPC" v={'\u20A9' + c.cpc.toLocaleString()} col="#a855f7" />
                <MetRow l="Sessions" v={c.sessions.toLocaleString()} col="#a855f7" />
                <MetRow l="Bounce Rate" v={c.bounceRate + '%'} col="#a855f7" />
                <MetRow l="\uD3C9\uCC55\uCCB4\uB958\uC2DC\uAC04" v={Math.floor(c.avgSessionTime / 60) + '\uBD84 ' + (c.avgSessionTime % 60) + '\uCD08'} col="#a855f7" />
            </div>

            <div style={CARD}>
                <div style={LABEL}>4. \uC804\uD658 (Conversion)</div>
                <MetRow l="\uC804\uD658\uC218" v={c.conversions.toLocaleString()} col="#f97316" />
                <MetRow l="\uC804\uD658\uC728" v={c.convRate + '%'} col="#f97316" />
                <MetRow l="CPA" v={'\u20A9' + cpa.toLocaleString()} col="#f97316" />
                <MetRow l="\uAD6C\uB9E4\uC218" v={c.purchases.toLocaleString()} col="#f97316" />
                <MetRow l="\uD68C\uC6D0\uAC00\uC785" v={c.signups.toLocaleString()} col="#f97316" />
                <MetRow l="\uC7A5\uBC14\uAD6C\uB2C8" v={c.cartAdds.toLocaleString()} col="#f97316" />
            </div>

            <div style={CARD}>
                <div style={LABEL}>5. \uB9E4\uCD9C \uBC0F ROI</div>
                <MetRow l="\uAD11\uACE0 \uB9E4\uCD9C" v={fmt(c.revenue, { prefix: '\u20A9' })} col="#eab308" />
                <MetRow l="\uAD11\uACE0\uBE44" v={fmt(c.spend, { prefix: '\u20A9' })} col="#eab308" />
                <MetRow l="ROAS" v={c.roas + 'x'} col="#eab308" />
                <MetRow l="\uC21C\uC218\uC775" v={fmt(c.revenue - c.spend, { prefix: '\u20A9' })} col="#eab308" />
            </div>

            <div style={CARD}>
                <div style={LABEL}>\uC131\uBCC4 \uBD84\uD3EC</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: c.gender.female, background: '#f472b618', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#f472b6' }}>{c.gender.female}%</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>\uC5EC\uC131</div>
                    </div>
                    <div style={{ flex: c.gender.male, background: '#4f8ef718', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#4f8ef7' }}>{c.gender.male}%</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>\uB0A8\uC131</div>
                    </div>
                </div>
            </div>

            <div style={CARD}>
                <div style={LABEL}>\uC5F0\uB839\uB300 \uBD84\uD3EC</div>
                <BarChart data={c.age.map(a => ({ label: a.group, value: a.pct }))} color={c.color} height={80} />
            </div>

            <div style={CARD}>
                <div style={LABEL}>\uC9C0\uC5ED\uBCC4 \uB9E4\uCD9C Top5</div>
                {c.regions.map(r => (
                    <div key={r.name} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>{r.name}</span>
                            <span style={{ color: c.color, fontWeight: 700 }}>{fmt(r.rev, { prefix: '\u20A9' })}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                            <div style={{ width: r.pct + '%', height: '100%', background: c.color, borderRadius: 2 }} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={CARD}>
                <div style={LABEL}>\uC804\uD658 \uD4F4\uB110</div>
                {c.funnel.map((f, i) => {
                    const p = c.funnel[0].val > 0 ? (f.val / c.funnel[0].val) * 100 : 0;
                    return (
                        <div key={f.stage} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{f.stage}</span>
                                <span style={{ color: c.color, fontWeight: 700 }}>{f.val.toLocaleString()}</span>
                            </div>
                            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                                <div style={{ width: p + '%', height: '100%', background: c.color, borderRadius: 3, opacity: Math.max(0.35, 1 - i * 0.15) }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={CARD}>
                <div style={LABEL}>\uAD11\uACE0 \uC720\uD615 \uC131\uACFC</div>
                {c.adTypes.map(a => (
                    <div key={a.type} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{a.type}</span>
                        <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{a.roas}x ROAS</span>
                        <span style={{ fontSize: 11, color: c.color, fontWeight: 700 }}>{a.conv.toLocaleString()}\uAC74</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function OverviewPanel() {
    const totalRev = CHAN_LIST.reduce((s, c) => s + c.revenue, 0);
    const totalSpend = CHAN_LIST.reduce((s, c) => s + c.spend, 0);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
            <div style={{ ...CARD, background: 'linear-gradient(145deg,rgba(79,142,247,0.06),rgba(6,11,20,0.98))' }}>
                <div style={LABEL}>\uC804\uCCB4 \uCC44\uB110 \uC885\uD569</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        { l: '\uCD1D \uB9E4\uCD9C', v: fmt(totalRev, { prefix: '\u20A9' }), col: '#22c55e' },
                        { l: '\uCD1D \uAD11\uACE0\uBE44', v: fmt(totalSpend, { prefix: '\u20A9' }), col: '#f97316' },
                        { l: '\uD3C9\uADE0 ROAS', v: (totalRev / totalSpend).toFixed(2) + 'x', col: '#4f8ef7' },
                        { l: '\uCC44\uB110 \uC218', v: CHAN_LIST.length + '\uAC1C', col: '#a855f7' },
                    ].map(m => (
                        <div key={m.l}>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{m.l}</div>
                            <div style={{ fontSize: 15, fontWeight: 900, color: m.col }}>{m.v}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={LABEL}>\uCC44\uB110\uBCC4 ROAS</div>
                {CHAN_LIST.slice().sort((a, b) => b.roas - a.roas).map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <span style={{ fontSize: 14 }}>{c.icon}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', width: 72 }}>{c.name.split(' ')[0]}</span>
                        <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                            <div style={{ width: `${(c.roas / 5) * 100}%`, height: '100%', background: c.color, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 900, color: c.color }}>{c.roas}x</span>
                    </div>
                ))}
            </div>
            <div style={{ ...CARD, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                \uCC44\uB110 \uCE74\uB4DC \uD074\uB9AD \u2192 5\uC139\uC158(Reach/Engagement/Traffic/Conversion/ROI) \uC0C1\uC138 \uBD84\uC11D
            </div>
        </div>
    );
}

export default function DashMarketing() {
    const [selected, setSelected] = useState(null);
    const [tab, setTab] = useState('channels');
    const isMobile = useIsMobile();

    // ✅ GlobalDataContext 실시간 광고비/ROAS 연동
    const { channelBudgets, budgetStats, pnlStats, orderStats } = useGlobalData();

    // 실시간 채널 데이터: GlobalDataContext spent/roas를 로컬 CHANNELS에 오버레이
    const liveChannels = useMemo(() => {
        return CHAN_LIST.map(c => {
            const live = channelBudgets[c.id] || channelBudgets[c.id === 'instagram' ? 'meta' : c.id];
            if (!live) return c;
            return {
                ...c,
                spend: live.spent || c.spend,
                roas: live.roas || c.roas,
                revenue: live.revenue || (live.spent * live.roas) || c.revenue,
            };
        });
    }, [channelBudgets]);

    const totalRev = budgetStats.totalAdRevenue || liveChannels.reduce((s, c) => s + c.revenue, 0);
    const totalSpend = budgetStats.totalSpent || liveChannels.reduce((s, c) => s + c.spend, 0);
    const avgROAS = budgetStats.blendedRoas.toFixed(2);

    const lineData = liveChannels.reduce((acc, c) => {
        c.sparkData?.forEach((v, i) => { if (!acc[i]) acc[i] = {}; acc[i][c.id] = Math.round(v); });
        return acc;
    }, []);

    const metricsTop = [
        { label: '\uCD1D \uB9E4\uCD9C', value: fmt(totalRev, { prefix: '\u20A9' }), icon: '💰', color: '#22c55e', delta: 12.4 },
        { label: '\uCD1D \uAD11\uACE0\uBE44', value: fmt(totalSpend, { prefix: '\u20A9' }), icon: '📤', color: '#f97316', delta: -3.2 },
        { label: 'Blended ROAS', value: avgROAS + 'x', icon: '📈', color: '#4f8ef7', delta: 8.1 },
        { label: '\uC6B4\uC601 \uCC44\uB110', value: CHAN_LIST.length + '\uAC1C', icon: '📡', color: '#a855f7', delta: 0 },
        { label: '\uCD1D \uD074\uB9AD', value: fmt(CHAN_LIST.reduce((s, c) => s + c.clicks, 0)), icon: '👆', color: '#14d9b0', delta: 5.3 },
        { label: '\uD3C9\uADE0 CTR', value: (CHAN_LIST.reduce((s, c) => s + c.ctr, 0) / CHAN_LIST.length).toFixed(1) + '%', icon: '🎯', color: '#eab308', delta: 1.8 },
        {
            label: 'KPI 달성도', icon: '✅', color: '#22c55e', delta: 0,
            value: (() => {
                const avgCtr = CHAN_LIST.reduce((s, c) => s + c.ctr, 0) / CHAN_LIST.length;
                const avgConv = CHAN_LIST.reduce((s, c) => s + c.convRate, 0) / CHAN_LIST.length;
                const avgRoas = totalRev / totalSpend;
                return [avgCtr >= 3, avgConv >= 5, avgRoas >= 3].filter(Boolean).length + '/3';
            })(),
        },
    ];

    return (
        <div style={{ display: 'grid', gap: G }}>
            {/* 탭 버튼 */}
            <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content' }}>
                {[
                    { id: 'channels', label: '\u{1F4CA} \uCC44\uB110 \uC131\uACFC' },
                    { id: 'ai', label: '\uD83E\uDD16 AI \uAD11\uACE0 \uBD84\uC11D' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: isMobile ? '6px 12px' : '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                            background: tab === t.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                            color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)',
                            fontWeight: 800, fontSize: isMobile ? 11 : 12, transition: 'all 0.2s',
                            boxShadow: tab === t.id ? '0 4px 14px rgba(79,142,247,0.35)' : undefined
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'channels' && (
                <div style={{ display: 'grid', gap: G }}>
                    {/* ── KPI 요약 카드: 모바일 2열, PC 7열 ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(7,1fr)', gap: isMobile ? 8 : G }}>
                        {metricsTop.map(m => (
                            <div key={m.label} style={{ ...CARD, borderColor: m.color + '1a' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{m.label}</div>
                                    <span style={{ fontSize: 17 }}>{m.icon}</span>
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: m.color, lineHeight: 1.1 }}>{m.value}</div>
                                <span style={{ fontSize: 10, color: m.delta >= 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                                    {m.delta >= 0 ? '\u25B2' : '\u25BC'} {Math.abs(m.delta).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* ── 채널 카드 + 테이블: 모바일은 세로 스택 ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: G }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
                            {/* 채널 카드: 모바일 1열 스크롤, PC 5열 */}
                            {isMobile ? (
                                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
                                    <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
                                        {CHAN_LIST.map(c => {
                                            const isSel = selected === c.id;
                                            return (
                                                <div key={c.id} onClick={() => setSelected(isSel ? null : c.id)}
                                                    style={{
                                                        width: 130, flexShrink: 0,
                                                        position: 'relative', borderRadius: 14, padding: '1px', overflow: 'hidden', cursor: 'pointer',
                                                        background: isSel ? `linear-gradient(135deg,${c.color}80,${c.color}30)` : `linear-gradient(135deg,${c.color}36,rgba(255,255,255,0.04))`,
                                                        boxShadow: isSel ? `0 0 0 2px ${c.color}, 0 8px 28px ${c.color}40` : `0 4px 16px ${c.color}14`,
                                                        transition: 'all 0.25s',
                                                    }}>
                                                    <div style={{ background: 'linear-gradient(145deg,#0d1525,#060b14)', borderRadius: 13, padding: '10px', height: 110, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 24, height: 24, borderRadius: 7, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{c.icon}</div>
                                                            <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.82)' }}>{c.name.split(' ')[0]}</div>
                                                        </div>
                                                        <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.roas}<span style={{ fontSize: 11 }}>x</span></div>
                                                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>ROAS · {fmt(c.revenue, { prefix: '₩' })}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: G }}>
                                    {CHAN_LIST.map(c => {
                                        const isSel = selected === c.id;
                                        return (
                                            <div key={c.id} onClick={() => setSelected(isSel ? null : c.id)}
                                                style={{
                                                    position: 'relative', borderRadius: 14, padding: '1px', overflow: 'hidden', cursor: 'pointer',
                                                    background: isSel ? `linear-gradient(135deg,${c.color}80,${c.color}30)` : `linear-gradient(135deg,${c.color}36,rgba(255,255,255,0.04))`,
                                                    boxShadow: isSel ? `0 0 0 2px ${c.color}, 0 8px 28px ${c.color}40` : `0 4px 16px ${c.color}14`,
                                                    transition: 'all 0.25s', transform: isSel ? 'scale(1.02)' : 'scale(1)'
                                                }}
                                                onMouseEnter={e => { if (!isSel) e.currentTarget.style.transform = 'scale(1.01)'; }}
                                                onMouseLeave={e => { if (!isSel) e.currentTarget.style.transform = 'scale(1)'; }}>
                                                <div style={{ background: 'linear-gradient(145deg,#0d1525,#060b14)', borderRadius: 13, padding: '12px 13px', height: 128, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: c.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{c.icon}</div>
                                                        <div>
                                                            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.82)' }}>{c.name}</div>
                                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.36)' }}>클릭 → 5섹션</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.roas}<span style={{ fontSize: 13 }}>x</span></div>
                                                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>ROAS · {fmt(c.revenue, { prefix: '₩' })}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ flex: 1, marginRight: 8 }}>
                                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>CTR {c.ctr}% · Conv {c.convRate}%</div>
                                                            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                                                <div style={{ width: `${Math.min((c.roas / 5) * 100, 100)}%`, height: '100%', background: c.color, borderRadius: 2 }} />
                                                            </div>
                                                        </div>
                                                        <Spark data={c.sparkData} color={c.color} h={20} w={45} area />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 라인 차트 */}
                            <div style={CARD}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>Channel Revenue Trend (14일)</span>
                                    {!isMobile && (
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            {CHAN_LIST.map(c => (
                                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.48)' }}
                                                    onClick={() => setSelected(selected === c.id ? null : c.id)}>
                                                    <div style={{ width: 14, height: 2.5, background: c.color, borderRadius: 2 }} />
                                                    {c.name.split(' ')[0]}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <LineChart data={lineData} labels={DAYS}
                                        series={CHAN_LIST.map(c => ({ key: c.id, color: c.color, width: selected === c.id ? 2.8 : 1.6, area: selected === c.id }))}
                                        width={isMobile ? 440 : 680} height={148} />
                                </div>
                            </div>

                            {/* 채널 성과 테이블: 모바일은 카드 형태로 */}
                            <div style={CARD}>
                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Channel Performance (5섹션 요약)</div>
                                {isMobile ? (
                                    // 모바일: 채널별 카드
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {CHAN_LIST.map((c, i) => (
                                            <div key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                                                style={{ borderRadius: 10, padding: '10px 12px', cursor: 'pointer', background: selected === c.id ? `${c.color}18` : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', border: `1px solid ${selected === c.id ? c.color + '40' : 'rgba(255,255,255,0.06)'}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                    <div style={{ width: 3, height: 20, borderRadius: 2, background: c.color }} />
                                                    <span style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{c.icon} {c.name}</span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                                                    {[['ROAS', c.roas + 'x', c.color], ['CTR', c.ctr + '%', 'rgba(255,255,255,0.6)'], ['전환율', c.convRate + '%', 'rgba(255,255,255,0.6)'], ['광고비', fmt(c.spend, { prefix: '₩' }), 'rgba(255,255,255,0.6)'], ['매출', fmt(c.revenue, { prefix: '₩' }), '#22c55e'], ['CPC', '₩' + c.cpc, 'rgba(255,255,255,0.5)']].map(([l, v, col]) => (
                                                        <div key={l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 7, padding: '5px 7px' }}>
                                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{l}</div>
                                                            <div style={{ fontSize: 11, fontWeight: 900, color: col }}>{v}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // PC: 기존 테이블
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '110px 56px 56px 72px 64px 56px 54px', gap: 8, padding: '0 8px 8px', fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span>Channel</span><span>ROAS</span><span>CTR</span><span>Spend</span><span>Revenue</span><span>Conv%</span><span>CPC</span>
                                        </div>
                                        {CHAN_LIST.map((c, i) => (
                                            <div key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                                                style={{ display: 'grid', gridTemplateColumns: '110px 56px 56px 72px 64px 56px 54px', gap: 8, padding: '9px 8px', borderBottom: '1px solid rgba(255,255,255,0.035)', alignItems: 'center', fontSize: 11, cursor: 'pointer', borderRadius: 8, background: selected === c.id ? `${c.color}10` : i % 2 === 0 ? 'rgba(255,255,255,0.016)' : 'transparent' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <div style={{ width: 3, height: 22, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.82)' }}>{c.name.split(' ')[0]}</span>
                                                </div>
                                                <span style={{ fontWeight: 900, color: c.color }}>{c.roas}x</span>
                                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{c.ctr}%</span>
                                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{fmt(c.spend, { prefix: '₩' })}</span>
                                                <span style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(c.revenue, { prefix: '₩' })}</span>
                                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{c.convRate}%</span>
                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>₩{c.cpc}</span>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            {selected ? <ChannelDetailPanel ch={selected} /> : <OverviewPanel />}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'ai' && (
                <MarketingAIPanel channels={CHANNELS} campaigns={[]} />
            )}
        </div>
    );
}
