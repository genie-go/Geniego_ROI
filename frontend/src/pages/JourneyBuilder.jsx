/**
 * JourneyBuilder — Enterprise-Grade Customer Journey Automation
 * ──────────────────────────────────────────────────────────────
 * Sub-tabs: 여정 빌더 | 여정 목록 | 실행 로그 | 분석
 * Layout: AutoMarketing pattern (maxWidth:1200, sticky header/tabs)
 * Data: GlobalDataContext (journeyTriggers, journeyExecutions,
 *        crmSegments, emailCampaignsLinked, kakaoCampaignsLinked)
 * i18n: 12-language + RTL support
 *
 * ✨ UI/UX Improvements (2026-05-01):
 * - Onboarding modal for first-time users
 * - EmptyState component with templates
 * - Enhanced user experience
 */
import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { useI18n } from '../i18n';

import { useGlobalData } from '../context/GlobalDataContext';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/ToastProvider';
import { _isDemo, LANG_LOCALE_MAP, K, FB, STS, TRIGGER_CFG, CH_COLORS, fmt, fmtW, CARD, INP, SEL, LBL, CONTENT_MIN } from './JourneyBuilderConstants';
import { DonutChart, HBarChart, Backdrop, FlowPreview } from './JourneyBuilderCharts';

export default function JourneyBuilder() {
    const { t, lang } = useI18n();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const {
        journeyTriggers = [], triggerJourneyAction,
        journeyExecutions = [], recordJourneyExecution,
        crmSegments = [], emailCampaignsLinked = [], kakaoCampaignsLinked = [],
    } = useGlobalData?.() || {};

    const [tab, setTab] = useState('builder');
    const [journeys, setJourneys] = useState(() => {
        try { const saved = localStorage.getItem('jb_journeys'); return saved ? JSON.parse(saved) : []; } catch { return []; }
    });
    const [showCreate, setShowCreate] = useState(false);
    const [editId, setEditId] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [detailId, setDetailId] = useState(null);
    const [form, setForm] = useState({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' });
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 768px)').matches);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const tr = useCallback(key => { const v = t(key); return v === key ? (FB[key] || key) : v; }, [t]);
    const stsLabel = s => ({ draft: tr(K.statusDraft), active: tr(K.statusActive), paused: tr(K.statusPaused), completed: tr(K.statusCompleted) }[s] || s);
    const trigLabel = s => ({ signup: tr(K.triggerSignup), purchase: tr(K.triggerPurchase), abandon: tr(K.triggerAbandon), churn: tr(K.triggerChurn), segment: tr(K.triggerSegment), manual: tr(K.triggerManual) }[s] || s);
    const delayLabel = s => ({ none: tr(K.delayNone), '1h': tr(K.delay1h), '1d': tr(K.delay1d), '3d': tr(K.delay3d), '7d': tr(K.delay7d) }[s] || s);

    const persist = useCallback(list => { try { localStorage.setItem('jb_journeys', JSON.stringify(list)); } catch { } }, []);

    useEffect(() => {
        const shown = localStorage.getItem('jb_onboarding_shown');
        if (!shown) setShowOnboarding(true);
    }, []);

    const TRIGGERS = [{ id: 'signup', label: tr(K.triggerSignup) }, { id: 'purchase', label: tr(K.triggerPurchase) }, { id: 'abandon', label: tr(K.triggerAbandon) }, { id: 'churn', label: tr(K.triggerChurn) }, { id: 'segment', label: tr(K.triggerSegment) }, { id: 'manual', label: tr(K.triggerManual) }];
    const CHANNELS = [{ id: 'email', label: tr(K.email), icon: '📧' }, { id: 'kakao', label: tr(K.kakao), icon: '💬' }, { id: 'sms', label: tr(K.sms), icon: '📱' }, { id: 'push', label: tr(K.push), icon: '🔔' }, { id: 'line', label: tr(K.line), icon: '💚' }];
    const DELAYS = [{ id: 'none', label: tr(K.delayNone) }, { id: '1h', label: tr(K.delay1h) }, { id: '1d', label: tr(K.delay1d) }, { id: '3d', label: tr(K.delay3d) }, { id: '7d', label: tr(K.delay7d) }];

    const TABS = [{ id: 'builder', label: tr(K.tabBuilder), icon: '🗺️' }, { id: 'list', label: tr(K.tabList), icon: '📋' }, { id: 'logs', label: tr(K.tabLogs), icon: '📜' }, { id: 'analytics', label: tr(K.tabAnalytics), icon: '📈' }, { id: 'guide', label: tr(K.tabGuide), icon: '📖' }];
    const TAB_CLR = { builder: '#4f8ef7', list: '#a855f7', logs: '#f97316', analytics: '#22c55e', guide: '#06b6d4' };

    /* ── Onboarding ───────────────────────────────────── */
    const handleOnboardingShowGuide = () => {
        localStorage.setItem('jb_onboarding_shown', '1');
        setShowOnboarding(false);
        setTab('guide');
        addToast('상세 가이드 탭으로 이동합니다.', 'info', 3000);
    };
    const handleOnboardingDontShow = () => {
        localStorage.setItem('jb_onboarding_shown', '1');
        setShowOnboarding(false);
    };
    const handleOnboardingStart = () => {
        localStorage.setItem('jb_onboarding_shown', '1');
        setShowOnboarding(false);
    };

    /* ── Actions ──────────────────────────────────────── */
    const handleSave = () => {
        if (!form.name.trim()) { addToast('경로 이름을 입력해주세요.', 'error', 5000); return; }
        const journey = {
            id: editId || `JRN-${Date.now()}`,
            name: form.name,
            trigger_type: form.trigger_type,
            trigger_label: trigLabel(form.trigger_type),
            segment: form.segment,
            channels: form.channels,
            delay: form.delay,
            delay_label: delayLabel(form.delay),
            status: 'draft',
            createdAt: editId ? (journeys.find(j => j.id === editId)?.createdAt || new Date().toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR')) : new Date().toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR'),
            executions: editId ? (journeys.find(j => j.id === editId)?.executions || 0) : 0,
            entered: editId ? (journeys.find(j => j.id === editId)?.entered || 0) : 0,
            completed: editId ? (journeys.find(j => j.id === editId)?.completed || 0) : 0,
        };
        const next = editId ? journeys.map(j => j.id === editId ? journey : j) : [journey, ...journeys];
        setJourneys(next);
        persist(next);
        setShowCreate(false);
        setEditId(null);
        setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' });
        addToast(editId ? '경로가 수정되었습니다.' : '새 경로가 생성되었습니다.', 'success', 3000);
    };

    const openEdit = j => {
        setEditId(j.id);
        setForm({ name: j.name, trigger_type: j.trigger_type, segment: j.segment || '', channels: j.channels || ['email'], delay: j.delay || 'none' });
        setShowCreate(true);
    };

    const handleDelete = id => {
        const next = journeys.filter(j => j.id !== id);
        setJourneys(next);
        persist(next);
        setDeleteId(null);
        setDetailId(null);
        addToast('경로가 삭제되었습니다.', 'success', 3000);
    };

    const handleDuplicate = j => {
        const copy = { ...j, id: `JRN-${Date.now()}`, name: `${j.name} ${tr(K.copyLabel)}`, status: 'draft', executions: 0, entered: 0, completed: 0, createdAt: new Date().toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR') };
        const next = [copy, ...journeys];
        setJourneys(next);
        persist(next);
        addToast('경로가 복제되었습니다.', 'success', 3000);
    };

    const handleRun = j => {
        const entered = Math.floor(Math.random() * 500) + 50;
        const completed = Math.floor(entered * (0.4 + Math.random() * 0.5));
        const emailsSent = j.channels.includes('email') ? Math.floor(entered * 0.9) : 0;
        const kakaoSent = j.channels.includes('kakao') ? Math.floor(entered * 0.85) : 0;
        const revenue = Math.floor(completed * (8000 + Math.random() * 30000));
        if (recordJourneyExecution) {
            recordJourneyExecution(j, { entered, completed, emailsSent, kakaoSent, revenue });
        }
        j.channels.forEach(ch => {
            if (triggerJourneyAction) {
                if (ch === 'email') triggerJourneyAction('email_send', { campaignId: `EC-JB-${Date.now()}`, count: emailsSent });
                if (ch === 'kakao') triggerJourneyAction('kakao_send', { campaignId: `KC-JB-${Date.now()}`, count: kakaoSent });
                if (ch === 'line') triggerJourneyAction('line_send', { count: Math.floor(entered * 0.7) });
            }
        });
        const next = journeys.map(x => x.id === j.id ? { ...x, status: 'active', executions: (x.executions || 0) + 1, entered: (x.entered || 0) + entered, completed: (x.completed || 0) + completed } : x);
        setJourneys(next);
        persist(next);
        addToast('경로 실행이 시작되었습니다.', 'success', 3000);
        setDetailId(null);
    };

    const toggleStatus = j => {
        const nextStatus = j.status === 'active' ? 'paused' : j.status === 'paused' ? 'active' : j.status;
        const next = journeys.map(x => x.id === j.id ? { ...x, status: nextStatus } : x);
        setJourneys(next);
        persist(next);
        addToast(nextStatus === 'paused' ? '경로가 일시 중지되었습니다.' : '경로가 재개되었습니다.', 'info', 3000);
    };

    /* ── Stats ────────────────────────────────────────── */
    const stats = useMemo(() => {
        const active = journeys.filter(j => j.status === 'active').length;
        const totalExec = journeyExecutions.length;
        const totalEntered = journeyExecutions.reduce((s, e) => s + (e.entered || 0), 0);
        const totalDone = journeyExecutions.reduce((s, e) => s + (e.completed || 0), 0);
        const avgRate = totalEntered > 0 ? Math.round((totalDone / totalEntered) * 100) : 0;
        const totalEmails = journeyExecutions.reduce((s, e) => s + (e.emailsSent || 0), 0);
        const totalKakao = journeyExecutions.reduce((s, e) => s + (e.kakaoSent || 0), 0);
        const totalRevenue = journeyExecutions.reduce((s, e) => s + (e.revenue || 0), 0);
        const byTrigger = {};
        journeys.forEach(j => { byTrigger[j.trigger_type] = (byTrigger[j.trigger_type] || 0) + 1; });
        const byChannel = {};
        journeys.forEach(j => { (j.channels || []).forEach(ch => { byChannel[ch] = (byChannel[ch] || 0) + 1; }); });
        const byStatus = {};
        journeys.forEach(j => { byStatus[j.status] = (byStatus[j.status] || 0) + 1; });
        return { total: journeys.length, active, totalExec, totalEntered, totalDone, avgRate, totalEmails, totalKakao, totalRevenue, byTrigger, byChannel, byStatus };
    }, [journeys, journeyExecutions]);

    const detail = useMemo(() => detailId ? journeys.find(j => j.id === detailId) : null, [detailId, journeys]);

    const ActBtn = ({ icon, label, color, onClick, small }) => (<button onClick={e => { e.stopPropagation(); onClick?.(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '4px 8px' : '6px 12px', borderRadius: 8, border: `1px solid ${color}30`, cursor: 'pointer', background: `${color}08`, color, fontSize: small ? 10 : 11, fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap' }} onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; }} onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; }}>{icon} {label}</button>);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: isMobile ? '100%' : 1200, margin: '0 auto', width: '100%', flex: 1, minHeight: 0, color: '#1e293b', background: 'transparent', padding: isMobile ? '0 8px' : '0' }}>

            {/* ── Onboarding Modal ── */}
            {showOnboarding && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: isMobile ? 18 : 32, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, marginBottom: 8 }}>{tr(K.onboardingWelcome)}</div>
                        <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, marginBottom: 8 }}>{tr(K.onboardingTitle)}</div>
                        <div style={{ fontSize: isMobile ? 12 : 14, color: '#666', marginBottom: 20 }}>{tr(K.onboardingDesc)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                            <div style={{ padding: '8px 12px', background: '#f5f7fa', borderRadius: 6, fontSize: 13 }}>{tr(K.onboardingStep1)}</div>
                            <div style={{ padding: '8px 12px', background: '#f5f7fa', borderRadius: 6, fontSize: 13 }}>{tr(K.onboardingStep2)}</div>
                            <div style={{ padding: '8px 12px', background: '#f5f7fa', borderRadius: 6, fontSize: 13 }}>{tr(K.onboardingStep3)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={handleOnboardingDontShow} style={{ padding: '8px 16px', border: '1px solid #ddd', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{tr(K.onboardingDontShow)}</button>
                            <button onClick={handleOnboardingShowGuide} style={{ padding: '8px 16px', border: '1px solid #ddd', background: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{tr(K.onboardingShowGuide)}</button>
                            <button onClick={handleOnboardingStart} style={{ padding: '8px 16px', border: 'none', background: '#4f8ef7', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{tr(K.onboardingStart)}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ FIXED HEADER AREA (Hero + Sub-tabs) ══════ */}
            <div style={{ flexShrink: 0 }}>
                {/* ── Hero Header ── */}
                <div className="hero" style={{ padding: isMobile ? '12px 12px 8px' : '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 300px' }}>
                            <div style={{ width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: 12, background: 'linear-gradient(135deg, #4f8ef7, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 17 : 20, boxShadow: '0 4px 14px rgba(79,142,247,0.3)', flexShrink: 0 }}>🗺️</div>
                            <div style={{ minWidth: 0 }}>
                                <div className="hero-title" style={{ fontSize: isMobile ? 16 : 19, fontWeight: 900, color: '#4f8ef7', letterSpacing: '-0.3px', lineHeight: 1.3 }}>{tr(K.title)}</div>
                                <div className="hero-desc" style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr(K.sub)}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <button onClick={() => navigate('/auto-marketing')} style={{ padding: isMobile ? '6px 10px' : '7px 14px', borderRadius: 10, border: '1px solid rgba(168,85,247,0.25)', cursor: 'pointer', background: 'rgba(168,85,247,0.06)', color: '#a855f7', fontSize: isMobile ? 10 : 11, fontWeight: 700 }}>🚀 {tr(K.goAutoMkt)}</button>
                            <button onClick={() => navigate('/crm')} style={{ padding: isMobile ? '6px 10px' : '7px 14px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.25)', cursor: 'pointer', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: isMobile ? 10 : 11, fontWeight: 700 }}>👥 {tr(K.goCRM)}</button>
                        </div>
                    </div>
                </div>

                {/* ── Sub-Tab Navigation (fixed, always visible) ── */}
                <div className="sub-tab-nav" style={{ padding: isMobile ? '6px 8px' : '8px 14px', background: 'rgba(245,247,250,0.97)', borderBottom: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'rgba(241,245,249,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '6px 8px' }}>
                        {TABS.map(tb => {
                            const active = tab === tb.id;
                            const c = TAB_CLR[tb.id];
                            return (
                                <button key={tb.id} onClick={() => setTab(tb.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)', background: active ? c : 'transparent', color: active ? '#ffffff' : '#64748b', boxShadow: active ? `0 3px 14px ${c}40` : 'none', transform: active ? 'translateY(-1px)' : 'none' }}>{tb.icon} {tb.label}</button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══════ SCROLLABLE CONTENT AREA ══════ */}
            <div className="fade-up" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '10px 4px 20px' : '16px 8px 28px' }}>

                {/* ══════ BUILDER ═══════════════════════════════ */}
                {tab === 'builder' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        {/* KPI Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                            {[
                                { label: tr(K.totalJourneys), value: stats.total, icon: '🗺️', color: '#4f8ef7' },
                                { label: tr(K.activeJourneys), value: stats.active, icon: '🟢', color: '#22c55e' },
                                { label: tr(K.totalExecutions), value: stats.totalExec, icon: '🚀', color: '#a855f7' },
                                { label: tr(K.avgCompletion), value: stats.avgRate + '%', icon: '📈', color: '#f97316' }
                            ].map(({ label, value, icon, color }) => (
                                <div key={label} className="kpi-card" style={{ '--accent': color }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div className="kpi-label">{label}</div>
                                        {icon && <span style={{ fontSize: 22, opacity: 0.85, lineHeight: 1 }}>{icon}</span>}
                                    </div>
                                    <div className="kpi-value" style={{ color, fontSize: 26, fontWeight: 900, marginTop: 2 }}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Create Button */}
                        <div style={CARD}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div><div style={{ fontWeight: 800, fontSize: 15, color: '#334155' }}>🗺️ {tr(K.tabBuilder)}</div><div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{tr(K.sub)}</div></div>
                                <button onClick={() => { setEditId(null); setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' }); setShowCreate(true); }} style={{ padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#06b6d4)', color: '#fff', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 16px rgba(79,142,247,0.3)' }}>+ {tr(K.createJourney)}</button>
                            </div>
                        </div>

                        {/* Recent Journeys Preview */}
                        {journeys.slice(0, 3).map(j => {
                            const cfg = STS[j.status] || STS.draft;
                            return (
                                <div key={j.id} style={{ ...CARD, cursor: 'pointer' }} onClick={() => setDetailId(j.id)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ fontSize: 20 }}>{TRIGGER_CFG[j.trigger_type]?.icon || '⚡'}</div>
                                            <div><div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{j.name}</div><div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{trigLabel(j.trigger_type)} → {(j.channels || []).map(c => c.toUpperCase()).join(', ')}</div></div>
                                        </div>
                                        <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>{cfg.icon} {stsLabel(j.status)}</span>
                                    </div>
                                    <FlowPreview journey={j} tr={tr} />
                                </div>
                            );
                        })}
                        {journeys.length === 0 && (
                            <EmptyState
                                onCreateClick={() => {
                                    setEditId(null);
                                    setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' });
                                    setShowCreate(true);
                                }}
                                onTemplateClick={(template) => {
                                    if (template) {
                                        setEditId(null);
                                        setForm({
                                            name: tr(template.nameKey),
                                            trigger_type: template.trigger,
                                            segment: '',
                                            channels: template.channels,
                                            delay: template.delay
                                        });
                                        setShowCreate(true);
                                    } else {
                                        setShowCreate(true);
                                    }
                                }}
                            />
                        )}
                    </div>
                )}

                {/* ══════ LIST ══════════════════════════════════ */}
                {tab === 'list' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        <div style={{ ...CARD, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#334155' }}>📋 {tr(K.tabList)} ({journeys.length})</div>
                            <button onClick={() => { setEditId(null); setForm({ name: '', trigger_type: 'signup', segment: '', channels: ['email'], delay: 'none' }); setShowCreate(true); }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 12 }}>+ {tr(K.createJourney)}</button>
                        </div>
                        {journeys.length === 0 ? (
                            <div style={{ ...CARD, textAlign: 'center', padding: '60px 20px', fontSize: 14, marginBottom: 12, color: '#94a3b8' }} ><div>📭</div><div>{tr(K.noData)}</div></div>
                        ) : (
                            <div style={{ ...CARD, padding: 0, overflow: isMobile ? 'visible' : 'hidden' }}>
                                {isMobile ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 8px' }}>
                                        {journeys.map(j => {
                                            const cfg = STS[j.status] || STS.draft;
                                            const tCfg = TRIGGER_CFG[j.trigger_type] || TRIGGER_CFG.manual;
                                            return (
                                                <div
                                                    key={j.id}
                                                    onClick={() => setDetailId(j.id)}
                                                    style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', minHeight: 44 }}
                                                    onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                                                    onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.name}</div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{j.createdAt}</div>
                                                        </div>
                                                        <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{cfg.icon} {stsLabel(j.status)}</div>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>{tCfg.icon} {trigLabel(j.trigger_type)}</div>
                                                    <div style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingBottom: 2 }}>
                                                        <div style={{ background: 'rgba(59,130,246,0.08)', padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0 }}><span style={{ color: '#94a3b8', fontSize: 11 }}>실행</span> <span style={{ color: '#3b82f6', fontWeight: 700, marginLeft: 4 }}>{j.executions || 0}</span></div>
                                                        <div style={{ background: 'rgba(168,85,247,0.08)', padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0 }}><span style={{ color: '#94a3b8', fontSize: 11 }}>입장</span> <span style={{ color: '#a855f7', fontWeight: 700, marginLeft: 4 }}>{j.entered || 0}</span></div>
                                                        <div style={{ background: 'rgba(16,185,129,0.08)', padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0 }}><span style={{ color: '#94a3b8', fontSize: 11 }}>완료</span> <span style={{ color: '#10b981', fontWeight: 700, marginLeft: 4 }}>{j.completed || 0}</span></div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                                                        <ActBtn icon="▶" label={tr(K.run)} color="#22c55e" onClick={() => handleRun(j)} small />
                                                        <ActBtn icon="✏️" label={tr(K.edit)} color="#4f8ef7" onClick={() => openEdit(j)} small />
                                                        <ActBtn icon="🗑️" label={tr(K.delete)} color="#ef4444" onClick={() => setDeleteId(j.id)} small />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 90px 100px 80px 80px 80px 140px', gap: 6, padding: '14px 20px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                            <span>{tr(K.journeyName)}</span><span>{tr(K.colStatus) || '상태'}</span><span>{tr(K.triggerType)}</span><span style={{ textAlign: 'right' }}>{tr(K.totalExecutions)}</span><span style={{ textAlign: 'right' }}>{tr(K.totalEntered)}</span><span style={{ textAlign: 'right' }}>{tr(K.totalCompleted)}</span><span style={{ textAlign: 'center' }}>{tr(K.edit)}</span>
                                        </div>
                                        {journeys.map(j => {
                                            const cfg = STS[j.status] || STS.draft;
                                            const tCfg = TRIGGER_CFG[j.trigger_type] || TRIGGER_CFG.manual;
                                            return (
                                                <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '2fr 90px 100px 80px 80px 80px 140px', gap: 6, padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.03)', alignItems: 'center', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <div onClick={() => setDetailId(j.id)} style={{ cursor: 'pointer' }}><div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{j.name}</div><div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{j.createdAt}</div></div>
                                                    <div><span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>{cfg.icon} {stsLabel(j.status)}</span></div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#334155', fontWeight: 600 }}><span>{tCfg.icon}</span><span>{trigLabel(j.trigger_type)}</span></div>
                                                    <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#4f8ef7' }}>{j.executions || 0}</div>
                                                    <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#a855f7' }}>{(j.entered || 0).toLocaleString()}</div>
                                                    <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#22c55e' }}>{(j.completed || 0).toLocaleString()}</div>
                                                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                                                        <ActBtn icon="▶" label={tr(K.run)} color="#22c55e" onClick={() => handleRun(j)} small />
                                                        <ActBtn icon="✏️" label={tr(K.edit)} color="#4f8ef7" onClick={() => openEdit(j)} small />
                                                        <ActBtn icon="🗑️" label={tr(K.delete)} color="#ef4444" onClick={() => setDeleteId(j.id)} small />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ══════ LOGS ═════════════════════════════════ */}
                {tab === 'logs' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        {/* Execution History */}
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#334155', marginBottom: 14 }}>🚀 {tr(K.executionHistory)} ({journeyExecutions.length})</div>
                            {journeyExecutions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, marginBottom: 8, color: '#94a3b8' }} ><div>📜</div><div>{tr(K.noLogs)}</div></div>
                            ) : (
                                <div style={{ display: 'grid', gap: 8 }}>{journeyExecutions.slice(0, 10).map(e => (
                                    <div key={e.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>🗺️ {e.journeyName}</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{e.executedAt}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, color: '#4f8ef7', fontWeight: 600 }}>{tr(K.logEntered)} {e.entered?.toLocaleString() || 0}</span>
                                            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>{tr(K.logCompleted)} {e.completed?.toLocaleString() || 0}</span>
                                            {e.emailsSent > 0 && <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 600 }}>📧 {e.emailsSent?.toLocaleString()}</span>}
                                            {e.kakaoSent > 0 && <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>💬 {e.kakaoSent?.toLocaleString()}</span>}
                                            {e.revenue > 0 && <span style={{ fontSize: 11, color: '#f97316', fontWeight: 800 }}>{fmtW(e.revenue)}</span>}
                                        </div>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                        {/* Trigger Logs */}
                        <div style={CARD}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#334155', marginBottom: 14 }}>⚡ {tr(K.recentLogs)} ({journeyTriggers.length})</div>
                            {journeyTriggers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, marginBottom: 8, color: '#94a3b8' }} ><div>📝</div><div>{tr(K.noLogs)}</div></div>
                            ) : (
                                <div style={{ display: 'grid', gap: 6 }}>{journeyTriggers.slice(0, 15).map(log => (
                                    <div key={log.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 14 }}>{log.type === 'email_send' ? '📧' : log.type === 'kakao_send' ? '💬' : log.type === 'line_send' ? '💚' : '⚡'}</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{log.type}</span>
                                        </div>
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(log.at).toLocaleString(LANG_LOCALE_MAP[lang] || 'ko-KR', { hour12: false })}</span>
                                    </div>
                                ))}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════ ANALYTICS ═════════════════════════════ */}
                {tab === 'analytics' && (
                    <div style={{ display: 'grid', gap: 14, minHeight: CONTENT_MIN, alignContent: 'start' }}>
                        {/* KPI Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            {[{ label: tr(K.totalEntered), value: stats.totalEntered.toLocaleString(), icon: '👣', color: '#4f8ef7' }, { label: tr(K.totalCompleted), value: stats.totalDone.toLocaleString(), icon: '✅', color: '#22c55e' }, { label: tr(K.totalEmails), value: stats.totalEmails.toLocaleString(), icon: '📧', color: '#a855f7' }, { label: tr(K.totalRevenue), value: fmt(stats.totalRevenue), icon: '💰', color: '#f97316' }].map(({ label, value, icon, color }) => (
                                <div key={label} style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
                                    <div><div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.03em' }}>{label}</div><div style={{ fontSize: 24, fontWeight: 900, color, marginTop: 2 }}>{value}</div></div>
                                </div>
                            ))}
                        </div>
                        {/* Charts */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>⚡ {tr(K.byTrigger)}</div>
                                <DonutChart data={Object.entries(stats.byTrigger).map(([k, v]) => ({ value: v, color: TRIGGER_CFG[k]?.color || '#94a3b8' })).length > 0 ? Object.entries(stats.byTrigger).map(([k, v]) => ({ value: v, color: TRIGGER_CFG[k]?.color || '#94a3b8' })) : [{ value: 1, color: '#e2e8f0' }]} centerLabel={tr(K.totalJourneys)} centerValue={stats.total} />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}>{Object.entries(stats.byTrigger).map(([tk, tv]) => (<div key={tk} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', fontWeight: 600 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: TRIGGER_CFG[tk]?.color || '#94a3b8' }} /><span>{trigLabel(tk)} ({tv})</span></div>))}</div>
                            </div>
                            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>📡 {tr(K.byChannel)}</div>
                                <DonutChart data={Object.entries(stats.byChannel).map(([k, v]) => ({ value: v, color: CH_COLORS[k] || '#94a3b8' })).length > 0 ? Object.entries(stats.byChannel).map(([k, v]) => ({ value: v, color: CH_COLORS[k] || '#94a3b8' })) : [{ value: 1, color: '#e2e8f0' }]} centerLabel={tr(K.channels)} centerValue={Object.keys(stats.byChannel).length} />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}>{Object.entries(stats.byChannel).map(([ck, cv]) => (<div key={ck} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b', fontWeight: 600 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: CH_COLORS[ck] || '#94a3b8' }} /><span>{ck.toUpperCase()} ({cv})</span></div>))}</div>
                            </div>
                            <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14, alignSelf: 'flex-start' }}>📊 {tr(K.completionRate)}</div>
                                <DonutChart data={stats.totalEntered > 0 ? [{ value: stats.totalDone, color: '#22c55e' }, { value: stats.totalEntered - stats.totalDone, color: '#e2e8f0' }] : [{ value: 1, color: '#e2e8f0' }]} centerLabel={tr(K.avgCompletion)} centerValue={stats.avgRate + '%'} />
                            </div>
                        </div>
                        {/* Performance Bars */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={CARD}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>🏅 {tr(K.completionRate)}</div>
                                {journeys.filter(j => j.entered > 0).length > 0 ? (
                                    <HBarChart items={journeys.filter(j => j.entered > 0).sort((a, b) => ((b.completed || 0) / b.entered) - ((a.completed || 0) / a.entered)).slice(0, 8).map(j => { const rate = Math.round(((j.completed || 0) / j.entered) * 100); return { label: j.name, value: rate, displayValue: rate + '%', color: rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444', colorEnd: rate >= 70 ? '#14d9b0' : rate >= 40 ? '#fbbf24' : '#f97316' }; })} maxValue={100} />
                                ) : <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(K.noData)}</div>}
                            </div>
                            <div style={CARD}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#334155', marginBottom: 14 }}>📧 {tr(K.totalEmails)} + 💬 {tr(K.totalKakao)}</div>
                                {journeyExecutions.length > 0 ? (
                                    <HBarChart items={journeyExecutions.slice(0, 8).map(e => ({ label: e.journeyName, value: (e.emailsSent || 0) + (e.kakaoSent || 0), displayValue: `${e.emailsSent || 0} + ${e.kakaoSent || 0}`, color: '#a855f7', colorEnd: '#4f8ef7' }))} />
                                ) : <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 30 }}>{tr(K.noLogs)}</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ TAB: GUIDE ════════════════════════════════════════ */}
                {tab === 'guide' && (
                    <div className="guide-section" style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: CONTENT_MIN, alignContent: 'start', color: '#1e293b' }}>
                        <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(6,182,212,0.08))', border: '1px solid rgba(79,142,247,0.3)', textAlign: 'center', padding: 32, color: '#1e293b' }}>
                            <div style={{ fontSize: 44 }}>🗺️</div>
                            <div style={{ fontWeight: 900, fontSize: 22, color: '#1e293b', marginTop: 8 }}>{tr(K.guideTitle)}</div>
                            <div className="guide-sub" style={{ fontSize: 13, color: '#475569', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>{tr(K.guideSub)}</div>
                            <button className="guide-cta" onClick={() => setTab('builder')} style={{ marginTop: 16, padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#06b6d4)', color: '#fff', fontWeight: 800, fontSize: 14 }}>{tr(K.guideStartBtn)}</button>
                        </div>
                        <div style={{ ...CARD, color: '#1e293b' }}>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', marginBottom: 16 }}>📚 {tr(K.guideStepsTitle)}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                                {[{ n: '1', k: 'guideStep1', c: '#4f8ef7' }, { n: '2', k: 'guideStep2', c: '#22c55e' }, { n: '3', k: 'guideStep3', c: '#a855f7' }, { n: '4', k: 'guideStep4', c: '#f59e0b' }, { n: '5', k: 'guideStep5', c: '#f97316' }, { n: '6', k: 'guideStep6', c: '#06b6d4' }, { n: '7', k: 'guideStep7', c: '#4f8ef7' }, { n: '8', k: 'guideStep8', c: '#22c55e' }, { n: '9', k: 'guideStep9', c: '#a855f7' }, { n: '10', k: 'guideStep10', c: '#f59e0b' }, { n: '11', k: 'guideStep11', c: '#f97316' }, { n: '12', k: 'guideStep12', c: '#06b6d4' }, { n: '13', k: 'guideStep13', c: '#4f8ef7' }, { n: '14', k: 'guideStep14', c: '#22c55e' }, { n: '15', k: 'guideStep15', c: '#a855f7' }, { n: '16', k: 'guideStep16', c: '#f59e0b' }, { n: '17', k: 'guideStep17', c: '#f97316' }, { n: '18', k: 'guideStep18', c: '#06b6d4' }, { n: '19', k: 'guideStep19', c: '#4f8ef7' }, { n: '20', k: 'guideStep20', c: '#22c55e' }].map((s, i) => (
                                    <div key={i} style={{ background: s.c + '0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16, color: '#1e293b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ width: 28, height: 28, borderRadius: 8, background: s.c, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{s.n}</span>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{tr(K[s.k + 'Title'])}</span>
                                        </div>
                                        <div className="guide-desc" style={{ fontSize: 12, color: '#475569', lineHeight: 1.7 }}>{tr(K[s.k + 'Desc'])}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ ...CARD, color: '#1e293b' }}>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', marginBottom: 16 }}>{tr(K.guideTabsTitle)}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
                                {[{ icon: '🗺️', k: 'guideTabBuilder', c: '#4f8ef7' }, { icon: '📋', k: 'guideTabList', c: '#a855f7' }, { icon: '📜', k: 'guideTabLogs', c: '#f97316' }, { icon: '📈', k: 'guideTabAnalytics', c: '#22c55e' }, { icon: '📖', k: 'guideTabGuide', c: '#06b6d4' }].map((tb, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', color: '#1e293b' }}>
                                        <span style={{ fontSize: 22, flexShrink: 0 }}>{tb.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: tb.c }}>{tr(K[tb.k + 'Name'])}</div>
                                            <div className="guide-desc" style={{ fontSize: 11, color: '#475569', marginTop: 3, lineHeight: 1.6 }}>{tr(K[tb.k + 'Desc'])}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ ...CARD, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', color: '#1e293b' }}>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', marginBottom: 12 }}>💡 {tr(K.guideTipsTitle)}</div>
                            <ul className="guide-tip-list" style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#475569', lineHeight: 2.2 }}>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip1)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip2)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip3)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip4)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip5)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip6)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip7)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip8)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip9)}</li>
                                <li style={{ color: '#475569' }}>{tr(K.guideTip10)}</li>
                            </ul>
                        </div>
                    </div>
                )}

            </div>{/* end scrollable content */}

            {/* ══ Detail Modal ═══════════════════════════════ */}
            {detail && (<Backdrop onClose={() => setDetailId(null)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div><div style={{ fontWeight: 900, fontSize: 18, color: '#1e293b' }}>{detail.name}</div><div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 4 }}>{detail.id}</div></div>
                    <button onClick={() => setDetailId(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ marginBottom: 16 }}><FlowPreview journey={detail} tr={tr} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
                    {[{ l: tr(K.triggerType), v: trigLabel(detail.trigger_type), c: TRIGGER_CFG[detail.trigger_type]?.color || '#4f8ef7' }, { l: tr(K.channels), v: (detail.channels || []).join(', ').toUpperCase(), c: '#a855f7' }, { l: tr(K.delayLabel), v: delayLabel(detail.delay), c: '#f59e0b' }, { l: tr(K.totalExecutions), v: detail.executions || 0, c: '#4f8ef7' }, { l: tr(K.totalEntered), v: (detail.entered || 0).toLocaleString(), c: '#06b6d4' }, { l: tr(K.totalCompleted), v: (detail.completed || 0).toLocaleString(), c: '#22c55e' }].map(({ l, v, c }) => (<div key={l} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.03)' }}><div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 18, fontWeight: 900, color: c, marginTop: 2 }}>{v}</div></div>))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => handleRun(detail)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#14d9b0)', color: '#fff', fontWeight: 800, fontSize: 13 }}>▶ {tr(K.run)}</button>
                    {(detail.status === 'active' || detail.status === 'paused') && <button onClick={() => { toggleStatus(detail); setDetailId(null); }} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: detail.status === 'active' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,#22c55e,#06b6d4)', color: '#fff', fontWeight: 700, fontSize: 12 }}>{detail.status === 'active' ? tr(K.pauseBtn) : tr(K.resumeBtn)}</button>}
                    <ActBtn icon="✏️" label={tr(K.edit)} color="#4f8ef7" onClick={() => { setDetailId(null); openEdit(detail); }} />
                    <ActBtn icon="📋" label={tr(K.duplicate)} color="#06b6d4" onClick={() => { handleDuplicate(detail); setDetailId(null); }} />
                    <ActBtn icon="🗑️" label={tr(K.delete)} color="#ef4444" onClick={() => { setDetailId(null); setDeleteId(detail.id); }} />
                    <button onClick={() => setDetailId(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(K.close)}</button>
                </div>
            </Backdrop>)}

            {/* ══ Create/Edit Modal ═════════════════════════ */}
            {showCreate && (<Backdrop onClose={() => { setShowCreate(false); setEditId(null); }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b', marginBottom: 20 }}>{editId ? '✏️' : '+'} {editId ? tr(K.edit) : tr(K.createJourney)}</div>
                <div style={{ display: 'grid', gap: 16 }}>
                    <div><label style={LBL}>{tr(K.journeyName)}</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={tr(K.createPlaceholder)} style={INP} /></div>
                    <div><label style={LBL}>{tr(K.triggerType)}</label><select value={form.trigger_type} onChange={e => setForm(p => ({ ...p, trigger_type: e.target.value }))} style={SEL}>{TRIGGERS.map(t => (<option key={t.id} value={t.id}>{t.label}</option>))}</select></div>
                    <div><label style={LBL}>{tr(K.targetSegment)}</label><select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))} style={SEL}><option value="">{tr(K.selectNone)}</option>{(crmSegments || []).map(s => (<option key={s.id} value={s.id}>{s.name} ({s.count?.toLocaleString()})</option>))}</select></div>
                    <div>
                        <label style={LBL}>{tr(K.channels)}</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {CHANNELS.map(ch => { const sel = form.channels.includes(ch.id); return (<button key={ch.id} onClick={() => setForm(p => ({ ...p, channels: sel ? p.channels.filter(x => x !== ch.id) : [...p.channels, ch.id] }))} style={{ padding: '8px 16px', borderRadius: 10, border: sel ? `2px solid ${CH_COLORS[ch.id]}` : '1px solid #e2e8f0', cursor: 'pointer', background: sel ? `${CH_COLORS[ch.id]}12` : '#f8fafc', color: sel ? CH_COLORS[ch.id] : '#64748b', fontWeight: 700, fontSize: 12 }}>{ch.icon} {ch.label}</button>); })}
                        </div>
                    </div>
                    <div><label style={LBL}>{tr(K.delayLabel)}</label><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{DELAYS.map(d => (<button key={d.id} onClick={() => setForm(p => ({ ...p, delay: d.id }))} style={{ padding: '7px 14px', borderRadius: 8, border: form.delay === d.id ? '2px solid #4f8ef7' : '1px solid #e2e8f0', cursor: 'pointer', background: form.delay === d.id ? 'rgba(79,142,247,0.08)' : '#f8fafc', color: form.delay === d.id ? '#4f8ef7' : '#64748b', fontWeight: 700, fontSize: 12 }}>{d.label}</button>))}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                    <button onClick={handleSave} disabled={!form.name.trim()} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: form.name.trim() ? 'pointer' : 'default', background: form.name.trim() ? 'linear-gradient(135deg,#4f8ef7,#06b6d4)' : '#e2e8f0', color: form.name.trim() ? '#fff' : '#94a3b8', fontWeight: 800, fontSize: 13 }}>💾 {tr(K.save)}</button>
                    <button onClick={() => { setShowCreate(false); setEditId(null); }} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(K.cancel)}</button>
                </div>
            </Backdrop>)}

            {/* ══ Delete Confirm ═════════════════════════════ */}
            {deleteId && (<Backdrop onClose={() => setDeleteId(null)}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b', marginBottom: 8 }}>{tr(K.confirmDelete)}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 24 }}>{journeys.find(j => j.id === deleteId)?.name || deleteId}</div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => handleDelete(deleteId)} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', fontWeight: 800, fontSize: 13 }}>🗑️ {tr(K.delete)}</button>
                        <button onClick={() => setDeleteId(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 12 }}>{tr(K.cancel)}</button>
                    </div>
                </div>
            </Backdrop>)}
        </div>
    );
}
