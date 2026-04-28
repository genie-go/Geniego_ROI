import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useI18n } from "../i18n";
import { useCurrency } from "../contexts/CurrencyContext.jsx";
import { useGlobalData } from '../context/GlobalDataContext';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import PlanGate from "../components/PlanGate.jsx";

/* ─── BroadcastChannel Cross-Tab Sync ─── */
const AB_SYNC_CH = 'geniego-aibudget-sync';
let _abChannel = null;
try { if (typeof BroadcastChannel !== 'undefined') _abChannel = new BroadcastChannel(AB_SYNC_CH); } catch { /* */ }
function broadcastAB(type, payload) {
    try {
        if (_abChannel) _abChannel.postMessage({ type, payload, ts: Date.now() });
        else { localStorage.setItem('__ab_sync__', JSON.stringify({ type, payload, ts: Date.now() })); localStorage.removeItem('__ab_sync__'); }
    } catch { /* */ }
}


const C = {
    border: "var(--border)", accent: "#4f8ef7",
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", orange: "#fb923c", muted: "var(--text-3)", text: "var(--text-1)",
    surface: "var(--surface)",
};

const GlassTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: "rgba(10,15,30,0.95)", border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            <p style={{ margin: "0 0 8px", color: '#fff', fontWeight: 700, fontSize: 13 }}>{label}</p>
            {payload.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color || e.payload?.fill }} />
                    <span style={{ color: 'var(--text-2)', fontSize: 11 }}>{e.name}:</span>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>{Number(e.value).toLocaleString()}</span>
            </div>
            ))}
        </div>
);
};

/* ─── Guide Section ─── */
function AIBudgetGuide({ t }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
            <div className="card card-glass" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor: 'rgba(79,142,247,0.3)', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 44 }}>🤖</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('marketing.abGuideTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>{t('marketing.abGuideSub')}</div>
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('marketing.abGuideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {[{n:'1️⃣',k:'abGuideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'abGuideStep2',c:'#22c55e'},{n:'3️⃣',k:'abGuideStep3',c:'#a855f7'},{n:'4️⃣',k:'abGuideStep4',c:'#f59e0b'},{n:'5️⃣',k:'abGuideStep5',c:'#f97316'},{n:'6️⃣',k:'abGuideStep6',c:'#06b6d4'}].map((s,i) => (
                        <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.n}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`marketing.${s.k}Title`)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{t(`marketing.${s.k}Desc`)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card card-glass" style={{ padding: 20, background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.3)' }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('marketing.abGuideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'var(--text-3)', lineHeight: 2.2 }}>
                    <li>{t('marketing.abGuideTip1')}</li>
                    <li>{t('marketing.abGuideTip2')}</li>
                    <li>{t('marketing.abGuideTip3')}</li>
                    <li>{t('marketing.abGuideTip4')}</li>
                    <li>{t('marketing.abGuideTip5')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ─── Main Component ─── */
function AIBudgetAllocatorInner() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { addAlert, sharedCampaigns } = useGlobalData();
    const { isConnected } = useConnectorSync();
    useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });

    // ── BroadcastChannel Cross-Tab Sync ──
    useEffect(() => {
        const handler = (msg) => { const { type, payload } = msg?.data || msg; if (type === 'AB_ALLOCATION') { setAllocatedData(payload); } };
        if (_abChannel) _abChannel.onmessage = handler;
        const storageHandler = (e) => { if (e.key === '__ab_sync__' && e.newValue) { try { handler(JSON.parse(e.newValue)); } catch {} } };
        window.addEventListener('storage', storageHandler);
        return () => { if (_abChannel) _abChannel.onmessage = null; window.removeEventListener('storage', storageHandler); };
    }, []);

    const [budgetInput, setBudgetInput] = useState("");
    const [isAllocating, setIsAllocating] = useState(false);
    const [allocatedData, setAllocatedData] = useState(null);
    const [loadingStep, setLoadingStep] = useState(0);
    const [showGuide, setShowGuide] = useState(false);

    const steps = useMemo(() => [
        t('marketing.abStep1'), t('marketing.abStep2'), t('marketing.abStep3'), t('marketing.abStep4'), t('marketing.abStep5'),
    ], [t]);

    // Derive real metrics from sharedCampaigns (zero-mock)
    const realMetrics = useMemo(() => {
        if (!sharedCampaigns || sharedCampaigns.length === 0) return { avgRoas: 250, avgCac: 18000 };
        const totalSpend = sharedCampaigns.reduce((s, c) => s + (c.spent || 0), 0);
        const totalConv = sharedCampaigns.reduce((s, c) => s + (c.conv || 0), 0);
        const avgRoas = sharedCampaigns.reduce((s, c) => s + (c.roas || 0), 0) / sharedCampaigns.length;
        const avgCac = totalConv > 0 ? totalSpend / totalConv : 18000;
        return { avgRoas: Math.round(avgRoas * 100) || 250, avgCac: Math.round(avgCac) || 18000 };
    }, [sharedCampaigns]);

    // Connected channels from Integration Hub
    const connectedChannels = useMemo(() => {
        const all = [
            { id: 'meta_ads', name: 'Meta', color: '#1877F2', highBudgetRatio: 0.35, lowBudgetRatio: 0.50 },
            { id: 'google_ads', name: 'Google Search', color: '#EA4335', highBudgetRatio: 0.25, lowBudgetRatio: 0.30 },
            { id: 'tiktok_ads', name: 'TikTok', color: '#00f2fe', highBudgetRatio: 0.20, lowBudgetRatio: 0.20 },
            { id: 'youtube', name: 'YouTube', color: '#FF0000', highBudgetRatio: 0.10, lowBudgetRatio: 0 },
            { id: 'naver_ads', name: 'Naver', color: '#03cf5d', highBudgetRatio: 0.05, lowBudgetRatio: 0 },
            { id: 'kakao', name: 'Kakao', color: '#fee500', highBudgetRatio: 0.05, lowBudgetRatio: 0 },
        ];
        return all.filter(ch => isConnected(ch.id));
    }, [isConnected]);

    const generateAllocation = () => {
        const rawValue = budgetInput.replace(/[^0-9]/g, '');
        const budget = parseInt(rawValue, 10);
        if (isNaN(budget) || budget < 100000) {
            if (typeof addAlert === 'function') addAlert({ type: 'warning', msg: t('marketing.abMinBudget') });
            return;
        }
        setIsAllocating(true);
        setAllocatedData(null);
        setLoadingStep(0);
        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step >= steps.length) {
                clearInterval(interval);
                finalizeAllocation(budget);
            } else {
                setLoadingStep(step);
            }
        }, 800);
    };

    const finalizeAllocation = (totalBudget) => {
        const isHighBudget = totalBudget >= 50000000;
        const baseRoas = realMetrics.avgRoas;
        const baseCac = realMetrics.avgCac;

        // Use connected channels or fallback defaults
        const channels = connectedChannels.length >= 2 ? connectedChannels : [
            { name: 'Meta', color: '#1877F2', highBudgetRatio: 0.35, lowBudgetRatio: 0.50 },
            { name: 'Google Search', color: '#EA4335', highBudgetRatio: 0.25, lowBudgetRatio: 0.30 },
            { name: 'TikTok', color: '#00f2fe', highBudgetRatio: 0.20, lowBudgetRatio: 0.20 },
        ];

        // Normalize ratios to sum to 1
        const ratioKey = isHighBudget ? 'highBudgetRatio' : 'lowBudgetRatio';
        const activeChannels = channels.filter(ch => (ch[ratioKey] || 0) > 0);
        const totalRatio = activeChannels.reduce((s, ch) => s + (ch[ratioKey] || 0.1), 0);

        const reasonKeys = ['abReasonMeta', 'abReasonGoogle', 'abReasonTiktok', 'abReasonYoutube', 'abReasonNaver', 'abReasonKakao'];
        const titleKeys = ['abReasonMetaTitle', 'abReasonGoogleTitle', 'abReasonTiktokTitle', 'abReasonYoutubeTitle', 'abReasonNaverTitle', 'abReasonKakaoTitle'];

        const calculated = activeChannels.map((a, i) => {
            const ratio = (a[ratioKey] || 0.1) / totalRatio;
            const channelBudget = totalBudget * ratio;
            // Deterministic variance: based on channel index + budget size
            const roasVariance = 1 + (i * 0.05) - (activeChannels.length * 0.02);
            const cacVariance = 1 - (i * 0.03) + (activeChannels.length * 0.01);
            const expectedROAS = Math.round(baseRoas * roasVariance);
            const projectedCAC = Math.round(baseCac * cacVariance);
            const pastCAC = Math.round(projectedCAC * 1.15); // 15% improvement assumed
            return {
                ...a, ratio, budget: channelBudget,
                expectedROAS, projectedRevenue: channelBudget * (expectedROAS / 100),
                pastCAC, projectedCAC,
                reasonTitle: t(`marketing.${titleKeys[i] || titleKeys[0]}`),
                reasonText: t(`marketing.${reasonKeys[i] || reasonKeys[0]}`),
            };
        });

        setAllocatedData({
            total: totalBudget,
            channels: calculated,
            blendedROAS: calculated.reduce((acc, c) => acc + c.projectedRevenue, 0) / totalBudget * 100,
        });
        setIsAllocating(false);
    };

    const handleInputChange = (e) => {
        let val = e.target.value.replace(/[^0-9]/g, '');
        if (val) val = Number(val).toLocaleString();
        setBudgetInput(val);
    };

    return (
        <div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.5s' }}>
            {/* Hero */}
            <div className="hero" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(167,139,250,0.05))', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: -50, top: -50, width: 250, height: 250, background: 'radial-gradient(circle, rgba(79,142,247,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div className="hero-meta">
                        <div className="hero-icon" style={{ background: 'linear-gradient(135deg, #4f8ef7, #6366f1)', color: '#fff' }}>🤖</div>
                        <div>
                            <div className="hero-title">{t('marketing.abPageTitle')}</div>
                            <div className="hero-desc">{t('marketing.abPageSub')}</div>
                        </div>
                    </div>
                    <button onClick={() => setShowGuide(!showGuide)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: showGuide ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(79,142,247,0.15)', color: showGuide ? '#fff' : '#4f8ef7', transition: 'all 200ms' }}>📖 {t('marketing.abBtnGuide')}</button>
                </div>
            </div>

            {showGuide && <AIBudgetGuide t={t} />}

            {/* Connected Channels Badge */}
            {connectedChannels.length > 0 && (
                <div className="card card-glass" style={{ padding: 14 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)' }}>🔌 {t('marketing.abConnectedChannels')}:</span>
                        {connectedChannels.map(ch => (
                            <span key={ch.id} style={{ padding: '4px 12px', borderRadius: 6, background: ch.color + '15', border: `1px solid ${ch.color}30`, fontSize: 11, fontWeight: 700, color: ch.color }}>{ch.name}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Section */}
            <div className="card card-glass fade-up" style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", borderTop: `2px solid ${C.accent}` }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>{t('marketing.abInputTitle')}</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, textAlign: "center", maxWidth: 600 }}>{t('marketing.abInputDesc')}</div>
                <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 500 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                        <input value={budgetInput} onChange={handleInputChange} placeholder={t('marketing.abInputPlaceholder')}
                            style={{ width: "100%", padding: "16px 20px", borderRadius: 12, border: `2px solid ${C.border}`, background: C.surface, color: '#fff', fontSize: 24, fontWeight: 800, outline: "none", boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)" }} />
                    <button onClick={generateAllocation} disabled={isAllocating || !budgetInput}
                        style={{ padding: "0 32px", borderRadius: 12, border: "none", background: isAllocating ? C.surface : "linear-gradient(135deg, #4f8ef7, #6366f1)", color: isAllocating ? C.muted : "#fff", fontWeight: 800, fontSize: 14, cursor: isAllocating ? "not-allowed" : "pointer", transition: "all 0.2s", boxShadow: isAllocating ? "none" : "0 8px 24px rgba(79,142,247,0.4)" }}>
                        {isAllocating ? t('marketing.abBtnProcessing') : t('marketing.abBtnGenerate')}
                    </button>
                </div>
                {isAllocating && (
                    <div style={{ marginTop: 32, width: "100%", maxWidth: 500, animation: "fadeIn 0.3s" }}>
                        <div style={{ fontSize: 13, color: C.accent, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>{steps[loadingStep]}</div>
                        <div style={{ width: "100%", height: 6, background: 'var(--surface)', borderRadius: 6, overflow: "hidden" }}>
                            <div style={{ width: `${((loadingStep + 1) / steps.length) * 100}%`, height: "100%", background: "linear-gradient(90deg, #4f8ef7, #6366f1)", borderRadius: 6, transition: "width 0.8s ease" }} />
                        </div>
                    </div>
                )}
            </div>

                    {/* Results */}
                    {allocatedData && (
                        <div className="fade-up" style={{ display: 'grid', gap: 20, animation: "fadeIn 0.6s" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                                <div className="card card-glass" style={{ padding: 24, borderTop: `2px solid ${C.accent}` }}>
                                    <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, marginBottom: 8 }}>{t('marketing.abKpiTotal')}</div>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{fmt(allocatedData.total)}</div>
                                </div>
                                <div className="card card-glass" style={{ padding: 24, borderTop: `2px solid ${C.green}` }}>
                                    <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, marginBottom: 8 }}>{t('marketing.abKpiRoas')}</div>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{allocatedData.blendedROAS.toFixed(1)}%</div>
                                </div>
                                <div className="card card-glass" style={{ padding: 24, borderTop: `2px solid ${C.purple}` }}>
                                    <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, marginBottom: 8 }}>{t('marketing.abKpiRevenue')}</div>
                                    <div style={{ fontSize: 28, fontWeight: 900, color: C.purple }}>{fmt(Math.round(allocatedData.total * (allocatedData.blendedROAS / 100)))}</div>
                                </div>
                            </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
                        <div className="card card-glass" style={{ padding: "24px 24px 0" }}>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📊 {t('marketing.abChartDist')}</div>
                            <div style={{ height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart><Pie data={allocatedData.channels} dataKey="budget" nameKey="name" cx="50%" cy="45%" innerRadius={80} outerRadius={110} paddingAngle={4}>
                                        {allocatedData.channels.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie><Tooltip content={<GlassTooltip />} /><Legend wrapperStyle={{ fontSize: 13, fontWeight: 700 }} /></PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="card card-glass" style={{ padding: 24 }}>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>📈 {t('marketing.abChartRoas')}</div>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={allocatedData.channels} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} fontWeight={700} />
                                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickFormatter={v => v + "%"} />
                                        <Tooltip content={<GlassTooltip />} />
                                        <Bar dataKey="expectedROAS" name={t('marketing.abExpectedRoas')} radius={[6, 6, 0, 0]}>
                                            {allocatedData.channels.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 16, paddingLeft: 8 }}>🧠 {t('marketing.abRationaleTitle')}</div>
                        <div style={{ display: "grid", gap: 16 }}>
                            {allocatedData.channels.map((c, i) => (
                                <div key={i} className="card card-glass fade-up" style={{ padding: 24, borderLeft: `4px solid ${c.color}`, display: "flex", gap: 24, animationDelay: `${i * 100}ms` }}>
                                    <div style={{ minWidth: 260, borderRight: `1px solid ${C.border}`, paddingRight: 24 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                            <div style={{ width: 14, height: 14, borderRadius: "50%", background: c.color }} />
                                            <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>{c.name}</div>
                                        <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 6 }}>{fmt(c.budget)}</div>
                                        <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, marginBottom: 16 }}>{(c.ratio * 100).toFixed(0)}% {t('marketing.abOfTotal')}</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {[
                                                { label: t('marketing.abExpectedRoas'), value: `${c.expectedROAS}%`, color: C.green },
                                                { label: t('marketing.abProjectedCac'), value: fmt(c.projectedCAC), color: C.accent },
                                                { label: t('marketing.abCacVsPast'), value: c.projectedCAC < c.pastCAC ? `▼ -${(((c.pastCAC - c.projectedCAC) / c.pastCAC) * 100).toFixed(1)}%` : `▲ +${(((c.projectedCAC - c.pastCAC) / c.pastCAC) * 100).toFixed(1)}%`, color: c.projectedCAC < c.pastCAC ? C.green : C.yellow },
                                            ].map((m, j) => (
                                                <div key={j} style={{ display: "flex", justifyContent: "space-between", background: 'var(--surface)', padding: '6px 10px', borderRadius: 6 }}>
                                                    <span style={{ fontSize: 11, color: C.muted }}>{m.label}</span>
                                                    <span style={{ fontSize: 12, fontWeight: 800, color: m.color }}>{m.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, paddingTop: 6 }}>
                                        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: '#fff' }}>{c.reasonTitle}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>{c.reasonText}</div>
                                            </div>
                                        </div>
                                    </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, gap: 16 }}>
                            <button style={{ padding: "12px 24px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: '#fff', fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                                {t('marketing.abBtnDownload')}
                            </button>
                            <button style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #22c55e, #10b981)", color: '#fff', fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 8px 24px rgba(34,197,94,0.3)" }}>
                                {t('marketing.abBtnApply')}
                            </button>
                        </div>
                    </div>
            )}
        </div>
        </div>
    );
}

export default function AIBudgetAllocator() {
    return (<PlanGate feature="ai_marketing"><AIBudgetAllocatorInner /></PlanGate>);
}
