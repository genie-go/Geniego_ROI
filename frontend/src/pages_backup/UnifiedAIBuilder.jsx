import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '../context/GlobalDataContext';
import { useI18n } from '../i18n';
import { useSecurityGuard, sanitizeInput, detectXSS } from '../security/SecurityGuard';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

/* ── Channel Configuration ── */
const CHANNELS = [
    { id: 'meta', name: 'Meta Ads', icon: '📘', color: '#1877f2', cpm: 8000 },
    { id: 'google_search', name: 'Google Search', icon: '🔍', color: '#34A853', cpm: 12000 },
    { id: 'tiktok', name: 'TikTok Ads', icon: '🎵', color: '#ff0050', cpm: 5000 },
    { id: 'youtube', name: 'YouTube Video', icon: '▶', color: '#FF0000', cpm: 15000 },
    { id: 'influencer', name: 'Influencer / UGC', icon: '📸', color: '#14d9b0', cpm: 25000 },
];

const CATEGORY_MULTIPLIERS = {
    software: 1.25, travel: 1.20, beauty: 1.15, fashion: 1.10,
    food: 1.05, tech: 1.08, general: 1.0,
};


const GLOBAL_MARKETS = [
    { id: 'kr', label: '🇰🇷 Korea', currency: 'KRW', timezone: 'Asia/Seoul' },
    { id: 'jp', label: '🇯🇵 Japan', currency: 'JPY', timezone: 'Asia/Tokyo' },
    { id: 'us', label: '🇺🇸 USA', currency: 'USD', timezone: 'America/New_York' },
    { id: 'eu', label: '🇪🇺 Europe', currency: 'EUR', timezone: 'Europe/Berlin' },
    { id: 'sg', label: '🇸🇬 Singapore', currency: 'SGD', timezone: 'Asia/Singapore' },
    { id: 'vn', label: '🇻🇳 Vietnam', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' },
];

const OPTIMAL_SEND_HOURS = {
    meta: { weekday: '10:00-12:00', weekend: '14:00-16:00' },
    google_search: { weekday: '08:00-11:00', weekend: '09:00-13:00' },
    tiktok: { weekday: '18:00-21:00', weekend: '15:00-20:00' },
    youtube: { weekday: '17:00-20:00', weekend: '13:00-18:00' },
    influencer: { weekday: '12:00-14:00', weekend: '10:00-12:00' },
};

const HIGH_BUDGET_ALLOC = [
    { id: 'meta', pct: 0.35, roas: 4.2 },
    { id: 'google_search', pct: 0.25, roas: 5.5 },
    { id: 'tiktok', pct: 0.15, roas: 3.1 },
    { id: 'youtube', pct: 0.15, roas: 2.8 },
    { id: 'influencer', pct: 0.10, roas: 2.5 },
];

const LOW_BUDGET_ALLOC = [
    { id: 'meta', pct: 0.50, roas: 3.8 },
    { id: 'google_search', pct: 0.30, roas: 4.8 },
    { id: 'tiktok', pct: 0.20, roas: 3.5 },
];

const KRW = (v) => `₩${Number(v).toLocaleString()}`;
const MIN_BUDGET = 100000;
const HIGH_BUDGET_THRESHOLD = 50000000;

/* ── Styles ── */
const S = {
    wrapper: { maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 24, paddingBottom: 60 },
    header: { textAlign: 'center', padding: '30px 20px', background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.1))', borderBottom: '1px solid rgba(168,85,247,0.3)' },
    title: { fontSize: 28, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(135deg, #4f8ef7, #a855f7)' },
    heroDesc: { color: 'var(--text-3)', fontSize: 13, maxWidth: 600, margin: '0 auto', lineHeight: 1.6 },
    stepper: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, marginTop: 30 },
    stepCircle: (active, current) => ({
        width: 32, height: 32, borderRadius: '50%',
        background: active ? (current ? '#a855f7' : '#22c55e') : 'rgba(255,255,255,0.1)',
        color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 14,
        boxShadow: current ? '0 0 15px rgba(168,85,247,0.6)' : 'none',
    }),
    stepLabel: (active) => ({ fontSize: 11, fontWeight: 700, color: active ? '#fff' : 'var(--text-3)', marginTop: 8 }),
    stepLine: (active) => ({ width: 40, height: 2, background: active ? '#22c55e' : 'rgba(255,255,255,0.1)', marginTop: -20 }),
    budgetCard: { padding: 40, textAlign: 'center' },
    catBtn: (selected) => ({
        padding: '12px 20px', borderRadius: 12,
        border: `2px solid ${selected ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
        background: selected ? 'rgba(168,85,247,0.15)' : 'rgba(0,0,0,0.3)',
        color: selected ? '#fff' : 'var(--text-3)',
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
    }),
    input: { width: '100%', padding: '12px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid rgba(79,142,247,0.3)', color: 'var(--text-1)', fontSize: 14 },
    budgetInput: { width: '100%', padding: 16, borderRadius: 12, background: 'var(--surface)', border: '2px solid rgba(168,85,247,0.5)', color: '#a855f7', fontSize: 24, fontWeight: 900, textAlign: 'center' },
    primaryBtn: (disabled) => ({
        padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, #4f8ef7, #a855f7)',
        color: 'var(--text-1)', border: 'none', fontSize: 16, fontWeight: 900, cursor: 'pointer',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10,
        opacity: disabled ? 0.6 : 1, width: '100%',
    }),
    launchBtn: (disabled) => ({
        padding: '14px 28px', borderRadius: 12, border: 'none',
        background: 'linear-gradient(135deg, #22c55e, #10b981)', color: 'var(--text-1)',
        fontWeight: 900, fontSize: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
        opacity: disabled ? 0.6 : 1,
    }),
};

/* ── Component ── */
export default function UnifiedAIBuilder() {
    const { t } = useI18n();
    const navigate = useNavigate();
    const { addCampaign, addAlert } = useGlobalData();

    /* Security Guard — monitors XSS, brute-force, rate limits */
    useSecurityGuard({ addAlert, enabled: true });

    const [step, setStep] = useState(1);
    const [category, setCategory] = useState('');
    const [budgetInput, setBudgetInput] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMarkets, setSelectedMarkets] = useState(['kr']);
    const [showOptimalTime, setShowOptimalTime] = useState(false);
    const [strategy, setStrategy] = useState(null);

    const budget = useMemo(() => parseInt(String(budgetInput).replace(/[^0-9]/g, '')) || 0, [budgetInput]);
    const isValid = category && budget >= MIN_BUDGET;

    /* Categories — fully localized */
    const categories = useMemo(() => [
        { id: 'fashion', label: t('unified.catFashion') },
        { id: 'beauty', label: t('unified.catBeauty') },
        { id: 'food', label: t('unified.catFood') },
        { id: 'tech', label: t('unified.catTech') },
        { id: 'travel', label: t('unified.catTravel') },
        { id: 'software', label: t('unified.catSoftware') },
        { id: 'general', label: t('unified.catGeneral') },
    ], [t]);

    /* Step labels — fully localized */
    const steps = useMemo(() => [
        { num: 1, label: t('unified.step1') },
        { num: 2, label: t('unified.step2') },
        { num: 3, label: t('unified.step3') },
    ], [t]);

    /* ── Secure Input Handlers ── */
    const handleCampaignNameChange = useCallback((e) => {
        const raw = e.target.value;
        if (detectXSS(raw)) {
            addAlert?.({ type: 'error', msg: '🚨 Suspicious input detected and blocked.', channel: 'security' });
            return;
        }
        setCampaignName(sanitizeInput(raw));
    }, [addAlert]);

    const handleBudgetChange = useCallback((e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setBudgetInput(raw);
    }, []);

    /* ── AI Strategy Simulation ── */
    const runSimulation = useCallback(() => {
        if (!isValid || isProcessing) return;
        setIsProcessing(true);

        setTimeout(() => {
            const alloc = budget >= HIGH_BUDGET_THRESHOLD ? HIGH_BUDGET_ALLOC : LOW_BUDGET_ALLOC;
            const multiplier = CATEGORY_MULTIPLIERS[category] || 1.0;

            const enriched = alloc.map(a => {
                const base = CHANNELS.find(c => c.id === a.id);
                const amount = budget * a.pct;
                const clicks = Math.round((amount / base.cpm) * 1000 * 0.02);
                const conversions = Math.round(clicks * 0.03);
                return { ...base, ...a, amount, clicks, conversions, revenue: amount * a.roas };
            });

            const overallRoas = enriched.reduce((sum, item) => sum + (item.roas * item.pct), 0);

            setStrategy({
                allocations: enriched,
                overallRoas: (overallRoas * multiplier).toFixed(2),
                totalConversions: Math.round(enriched.reduce((s, i) => s + i.conversions, 0) * multiplier),
            });
            setIsProcessing(false);
            setStep(2);
        }, 1500);
    }, [budget, category, isValid, isProcessing]);

    /* ── Launch Campaign — synced to GlobalDataContext ── */
    const handleLaunch = useCallback(() => {
        if (isProcessing || !strategy) return;
        setIsProcessing(true);

        setTimeout(() => {
            const safeName = sanitizeInput(campaignName) || `AI-Campaign-${Date.now().toString(36)}`;
            const camp = {
                id: `CAMP-${Date.now()}`,
                name: safeName,
                status: 'active',
                type: 'Unified AI',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
                budget,
                spent: 0,
                channels: strategy.allocations.reduce((acc, curr) => { acc[curr.id] = curr.amount; return acc; }, {}),
                kpi: {
                    targetRoas: parseFloat(strategy.overallRoas),
                    actualRoas: null,
                    targetConv: strategy.totalConversions,
                    actualConv: 0,
                    targetCpa: 25000,
                },
                influencers: strategy.allocations.find(c => c.id === 'influencer') ? ['AI Auto-Match'] : [],
                manager: 'Geniego AI',
            };

            /* Sync to GlobalDataContext — propagates to Dashboard, CampaignManager, etc. */
            addCampaign(camp);

            const msg = (t('unified.alertSuccess') || 'Campaign launched successfully!')
                .replace('{camp}', safeName);
            addAlert({ type: 'success', msg, channel: 'system' });

            navigate('/campaign-manager');
        }, 2000);
    }, [isProcessing, strategy, campaignName, budget, addCampaign, addAlert, navigate, t]);

    /* ── Render: Step Header ── */
    const renderStepper = () => (
        <div className="card card-glass fade-up" style={S.header}>
            <h1 style={S.title}>{t('unified.mainTitle')}</h1>
            <p style={S.heroDesc}>{t('unified.heroDesc')}</p>
            <div style={S.stepper}>
                {steps.map((s, idx) => {
                    const active = step >= s.num;
                    const current = step === s.num;
                    return (
                        <React.Fragment key={s.num}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: active ? 1 : 0.4 }}>
                                <div style={S.stepCircle(active, current)}>
                                    {step > s.num ? '✓' : s.num}
                                <div style={S.stepLabel(active)}>{s.label}</div>
                            {idx < 2 && <div style={S.stepLine(active)} />}
                        </React.Fragment>
        </div>
    </div>
);
                })}
        </div>
    );

    /* ── Render: Step 1 — Budget & Category ── */
    const renderStep1 = () => (
        <div className="card card-glass fade-up" style={S.budgetCard}>
            <div style={{ marginBottom: 30 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>💰</div>
                <h2 style={{ fontSize: 20, color: 'var(--text-1)' }}>{t('unified.qBudget')}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>{t('unified.budgetSub')}</p>

            <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: 20, color: 'var(--text-1)', marginBottom: 16, textAlign: 'center' }}>
                    {t('unified.whichCategory')}
                </h2>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 30 }}>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setCategory(cat.id)} style={S.catBtn(category === cat.id)}>
                            {cat.label}
                        </button>
                    ))}
            </div>

            {/* Feature #6: Multi-Market Selection */}
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, color: 'var(--text-1)', marginBottom: 12, textAlign: 'center' }}>{t('unified.selectMarkets') || '🌍 Target Markets'}</h2>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {GLOBAL_MARKETS.map(m => (
                        <button key={m.id} onClick={() => setSelectedMarkets(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                            style={{ padding: '8px 14px', borderRadius: 10, border: `2px solid ${selectedMarkets.includes(m.id) ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, background: selectedMarkets.includes(m.id) ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.3)', color: selectedMarkets.includes(m.id) ? '#fff' : 'var(--text-3)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {m.label}
                        </button>
                    ))}
            </div>
            <div style={{ maxWidth: 400, margin: '0 auto', display: 'grid', gap: 20 }}>
                <div style={{ textAlign: 'left' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#4f8ef7', display: 'block', marginBottom: 6 }}>
                        {t('unified.campName')}
                    </label>
                    <input value={campaignName} onChange={handleCampaignNameChange} style={S.input} />
                <div style={{ textAlign: 'left' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', display: 'block', marginBottom: 6 }}>
                        {t('unified.budgetLabel')}
                    </label>
                    <input type="text" value={budget ? Number(budget).toLocaleString() : ''} onChange={handleBudgetChange} style={S.budgetInput} />
                {!isValid && <div style={{ fontSize: 11, color: '#ef4444' }}>{t('unified.budgetErr')}</div>}
                <button disabled={!isValid || isProcessing} onClick={runSimulation} style={S.primaryBtn(!isValid || isProcessing)}>
                    {isProcessing ? '⏳' : '🪄'}
                    {isProcessing ? t('unified.simulating') : t('unified.btnSimulate')}
                </button>
        </div>
    );

    /* ── Render: Step 2 — Strategy ── */
    const renderStep2 = () => strategy && (
        <div className="card card-glass fade-up" style={{ padding: '30px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 20, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>🤖 {t('unified.mixTitle')}</h2>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                        {t('unified.mixSub').replace('{amt}', KRW(budget))}
                    </p>
                <div style={{ display: 'flex', gap: 20 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{t('unified.estRoas')}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#22c55e' }}>{strategy.overallRoas}x</div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{t('unified.estConv')}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#4f8ef7' }}>{strategy.totalConversions.toLocaleString()}{t('unified.cases')}</div>
                </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 40 }}>
                <div style={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={strategy.allocations} dataKey="amount" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={2} stroke="none">
                                {strategy.allocations.map(entry => <Cell key={entry.id} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value) => KRW(value)} contentStyle={{ background: 'rgba(10,15,30,0.95)', border: '1px solid #334155', borderRadius: 8, color: 'var(--text-1)', fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                    {strategy.allocations.map(a => (
                        <div key={a.id} style={{ padding: '12px 16px', borderRadius: 10, background: `${a.color}15`, border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 22 }}>{a.icon}</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>
                                        {a.name} <span style={{ fontSize: 10, color: a.color, marginLeft: 6 }}>{(a.pct * 100).toFixed(0)}%</span>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('unified.expRoas')} {a.roas}x</div>
                            </div>
                            <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 15, color: a.color }}>{KRW(a.amount)}</div>
                    ))}
            </div>

            {/* Feature #3: AI Optimal Send Time */}
            <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#22c55e', marginBottom: 10 }}>📅 {t('unified.optimalTime') || 'AI Optimal Send Time'}</div>
                <div style={{ display: 'grid', gap: 6 }}>
                    {strategy?.allocations?.map(a => {
                        const times = OPTIMAL_SEND_HOURS[a.id];
                        return times ? (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 8px', borderRadius: 6, background: 'var(--surface)' }}>
                                <span style={{ color: a.color, fontWeight: 700 }}>{a.icon} {a.name}</span>
                                <span style={{ color: 'var(--text-2)' }}>
                                    {t('unified.weekday') || 'Weekday'}: {times.weekday} · {t('unified.weekend') || 'Weekend'}: {times.weekend}
                                </span>
                        ) : null;
                    })}
            </div>

            <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => setStep(1)} style={{ padding: '12px 20px', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700 }}>
                    {t('unified.btnRetry')}
                </button>
                <button onClick={() => setStep(3)} style={{ padding: '12px 24px', borderRadius: 8, background: '#22c55e', color: 'var(--text-1)', border: 'none', cursor: 'pointer', fontWeight: 800, display: 'flex', gap: 8, alignItems: 'center' }}>
                    {t('unified.btnNext')}
                </button>
        </div>
    );

    /* ── Render: Step 3 — Launch ── */
    const renderStep3 = () => strategy && (
        <div className="card card-glass fade-up" style={{ padding: 40, textAlign: 'center', border: '1px solid rgba(34,197,94,0.3)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>{t('unified.launchTitle')}</h2>
            <p style={{ color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                {t('unified.launchSub')}
            </p>

            <div style={{ margin: '30px auto', maxWidth: 350, padding: 20, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('unified.campName')}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)' }}>{campaignName}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('unified.payMethod')}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        💳 <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)' }}>{t('unified.corporateCard')}</span>
                </div>
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', margin: '15px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 700 }}>{t('unified.totalAmt')}</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>{KRW(budget)}</span>
            </div>

            {/* Feature #4: Campaign Clone & Template Save */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                <button onClick={() => { setCampaignName(campaignName + ' (Copy)'); setStep(1); }}
                    style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    🔄 {t('unified.cloneCampaign') || 'Clone Campaign'}
                </button>
                <button onClick={() => {
                    const templateData = { name: campaignName, category, budget, markets: selectedMarkets, strategy, savedAt: new Date().toISOString() };
                    const templates = JSON.parse(localStorage.getItem('g_campaign_templates') || '[]');
                    templates.push(templateData);
                    localStorage.setItem('g_campaign_templates', JSON.stringify(templates));
                    addAlert?.({ type: 'success', msg: '✅ Template saved!', channel: 'system' });
                }}
                    style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.3)', background: 'transparent', color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    💾 {t('unified.saveTemplate') || 'Save as Template'}
                </button>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setStep(2)} disabled={isProcessing} style={{ padding: '14px 24px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-1)', fontWeight: 700, cursor: 'pointer' }}>
                    {t('unified.btnReview')}
                </button>
                <button onClick={handleLaunch} disabled={isProcessing} style={S.launchBtn(isProcessing)}>
                    {isProcessing ? '⏳' : '🚀'}
                    {isProcessing ? t('unified.btnLaunching') : t('unified.btnLaunch')}
                </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
        <div style={{ margin: '0 auto', display: 'grid', gap: 24 }}>
            {renderStepper()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            </div>
        </div>
    </div>
);
}
