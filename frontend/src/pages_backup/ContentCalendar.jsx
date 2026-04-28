import React, { useState, useMemo, useCallback, useEffect } from "react";
import MarketingAIPanel from '../components/MarketingAIPanel.jsx';
import { useI18n } from '../i18n/index.js';
import { useGlobalData } from '../context/GlobalDataContext';
import { useSecurityGuard } from '../security/SecurityGuard.js';

/* ─── Tag badge ─── */
const Tag = ({ label, color = "#4f8ef7" }) => (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "18", color, border: `1px solid ${color}33`, whiteSpace: "nowrap" }}>{label}</span>
);

/* ─── Week Grid helper ─── */
function getWeeksInMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = [];
    let current = new Date(firstDay);
    current.setDate(current.getDate() - current.getDay());
    while (current <= lastDay) {
        const week = [];
        for (let i = 0; i < 7; i++) { week.push(new Date(current)); current.setDate(current.getDate() + 1); }
        weeks.push(week);
    }
    return weeks;
}

/* ─── Security Hook ─── */
function useContentCalendarSecurity(addAlert) {
    useSecurityGuard({
        addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]),
        enabled: true,
    });
}

/* ═══════════════════════════════════════════════
   TAB 1: Calendar View (i18n + real‑time data)
   ═══════════════════════════════════════════════ */
function MonthCalendar({ year, month, events, t }) {
    const weeks = getWeeksInMonth(year, month);
    const DAY_KEYS = ['daySun','dayMon','dayTue','dayWed','dayThu','dayFri','daySat'];
    const DAY_COLORS = ['#ef4444',null,null,null,null,null,'#4f8ef7'];
    const toStr = d => d.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    const evByDate = {};
    for (const e of events) { const dk = e.date?.slice(0,10); if (!dk) continue; if (!evByDate[dk]) evByDate[dk] = []; evByDate[dk].push(e); }

    const STATUS_COLORS = { draft: "#eab308", review: "#f97316", scheduled: "#4f8ef7", published: "#22c55e", cancelled: "#ef4444" };
    const PLAT_ICO = { instagram: "📸", youtube: "▶", tiktok: "🎵", blog: "📝", facebook: "📘", twitter: "🐦", linkedin: "💼", pinterest: "📌" };

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
                {DAY_KEYS.map((dk, i) => (
                    <div key={dk} style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: DAY_COLORS[i] || "var(--text-3)", padding: "4px 0" }}>
                        {t(`contentCal.${dk}`)}
                ))}
            {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
                    {week.map((day, di) => {
                        const ds = toStr(day);
                        const inMonth = day.getMonth() === month;
                        const dayEvents = evByDate[ds] || [];
                        const isToday = ds === todayStr;
                        return (
                            <div key={di} style={{
                                minHeight: 62, padding: "4px 5px", borderRadius: 6,
                                background: isToday ? "rgba(99,102,241,0.12)" : inMonth ? "rgba(9,15,30,0.5)" : "rgba(9,15,30,0.15)",
                                border: isToday ? "1.5px solid rgba(99,102,241,0.45)" : "1px solid rgba(99,140,255,0.06)",
                                opacity: inMonth ? 1 : 0.3, transition: "all .2s",
                            }}>
                                <div style={{ fontSize: 11, fontWeight: isToday ? 900 : 600, color: di === 0 ? "#ef4444" : di === 6 ? "#4f8ef7" : "var(--text-2)", marginBottom: 2 }}>
                                    {day.getDate()}{isToday && <span style={{ fontSize: 7, color: "#6366f1", marginLeft: 2, fontWeight: 900 }}>TODAY</span>}
                                {dayEvents.slice(0, 2).map((ev, ei) => {
                                    const sc = STATUS_COLORS[ev.status] || "#888";
                                    return (
                                        <div key={ei} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: sc + "15", color: sc, marginBottom: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                            {PLAT_ICO[ev.platform] || "📄"} {ev.title}
                                        </div>
                                    );
                                })}
                                {dayEvents.length > 2 && <div style={{ fontSize: 8, color: "var(--text-3)" }}>+{dayEvents.length - 2}</div>}
                            </div>
                        );
                    })}
            ))}
            </div>
        </div>
function ContentListTab({ events, t }) {
    const [filter, setFilter] = useState("all");
    const STATUS_LIST = ['draft','review','scheduled','published','cancelled'];
    const STATUS_COLORS = { draft: "#eab308", review: "#f97316", scheduled: "#4f8ef7", published: "#22c55e", cancelled: "#ef4444" };
    const PLAT_ICO = { instagram: "📸", youtube: "▶", tiktok: "🎵", blog: "📝", facebook: "📘", twitter: "🐦", linkedin: "💼", pinterest: "📌" };
    const filtered = events.filter(e => filter === "all" || e.status === filter).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <button onClick={() => setFilter("all")} style={{ padding: "4px 12px", borderRadius: 99, border: "1px solid var(--border)", background: filter === "all" ? "#4f8ef7" : "transparent", color: filter === "all" ? "#fff" : "var(--text-2)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                    {t('contentCal.filterAll')}
                </button>
                {STATUS_LIST.map(s => (
                    <button key={s} onClick={() => setFilter(s)} style={{ padding: "4px 12px", borderRadius: 99, border: `1px solid ${STATUS_COLORS[s]}33`, background: filter === s ? STATUS_COLORS[s] : "transparent", color: filter === s ? "#fff" : STATUS_COLORS[s], cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                        {t(`contentCal.st_${s}`)}
                    </button>
                ))}
            {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-3)", fontSize: 13 }}>
                    📭 {t('contentCal.noContent')}
            )}
            {filtered.map((ev, idx) => {
                const sc = STATUS_COLORS[ev.status] || "#888";
                return (
                    <div key={ev.id || idx} style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: `1px solid ${sc}18`, borderLeft: `3px solid ${sc}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, transition: "transform .15s", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{ev.title || t('contentCal.untitled')}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span>{PLAT_ICO[ev.platform] || "📄"} {ev.platform || '-'}</span>
                                {ev.creator && <span>👤 {ev.creator}</span>}
                                <span>📅 {ev.date || '-'}</span>
                                {ev.campaign && ev.campaign !== '—' && <span>🎯 {ev.campaign}</span>}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {ev.views > 0 && <Tag label={`👁 ${(ev.views / 1000).toFixed(0)}K`} color="#f97316" />}
                            <Tag label={t(`contentCal.st_${ev.status}`) || ev.status} color={sc} />
                        </div>
                    </div>
                );
            })}
            </div>
        </div>
    );
}
/* ═════
   TAB 3: AI Content Analysis (real‑time)
   ═══════════════════════════════════════════════ */
function AiContentTab({ t, channels }) {
    const channelData = useMemo(() => {
        if (!channels || Object.keys(channels).length === 0) return {};
        const result = {};
        Object.entries(channels).forEach(([key, ch]) => {
            result[key] = {
                name: ch.name || key,
                impressions: ch.impressions || 0,
                clicks: ch.clicks || 0,
                spend: ch.spend || 0,
                revenue: ch.revenue || 0,
                roas: ch.roas || 0,
                conversions: ch.conversions || 0,
                ctr: ch.ctr || 0,
                convRate: ch.convRate || 0,
                cpc: ch.cpc || 0,
            };
        });
        return result;
    }, [channels]);

    if (Object.keys(channelData).length === 0) {
        return (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t('contentCal.noChannelData')}</div>
                <div style={{ fontSize: 11 }}>{t('contentCal.noChannelDataSub')}</div>
            </div>
        );
    }

    return <MarketingAIPanel channels={channelData} campaigns={[]} />;
}

/* ═══════════════════════════════════════════════
   TAB 4: Content Registration Modal
   ═══════════════════════════════════════════════ */
function ContentRegisterModal({ onClose, onSave, t }) {
    const [form, setForm] = useState({ title: '', platform: 'instagram', date: new Date().toISOString().slice(0,10), status: 'draft', creator: '', campaign: '' });
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const PLATFORMS = ['instagram','youtube','tiktok','blog','facebook','twitter','linkedin','pinterest'];
    const STATUSES = ['draft','review','scheduled','published'];

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(6px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ width: 440, maxWidth: "92vw", background: "var(--card-bg, #0d1321)", borderRadius: 16, border: "1px solid rgba(99,140,255,0.15)", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
                <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>📝 {t('contentCal.registerTitle')}</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>✕</button>
                </div>
                {[
                    { label: t('contentCal.fieldTitle'), key: 'title', type: 'text' },
                    { label: t('contentCal.fieldCreator'), key: 'creator', type: 'text' },
                    { label: t('contentCal.fieldCampaign'), key: 'campaign', type: 'text' },
                    { label: t('contentCal.fieldDate'), key: 'date', type: 'date' },
                ].map(f => (
                    <div key={f.key} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 4 }}>{f.label}</div>
                        <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)", background: "rgba(9,15,30,0.6)", color: "var(--text-1)", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 4 }}>{t('contentCal.fieldPlatform')}</div>
                        <select value={form.platform} onChange={e => set('platform', e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)", background: "rgba(9,15,30,0.6)", color: "var(--text-1)", fontSize: 12, outline: "none" }}>
                            {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                        </select>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", marginBottom: 4 }}>{t('contentCal.fieldStatus')}</div>
                        <select value={form.status} onChange={e => set('status', e.target.value)}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(99,140,255,0.15)", background: "rgba(9,15,30,0.6)", color: "var(--text-1)", fontSize: 12, outline: "none" }}>
                            {STATUSES.map(s => <option key={s} value={s}>{t(`contentCal.st_${s}`)}</option>)}
                        </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                    <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                        {t('contentCal.btnCancel')}
                    </button>
                    <button onClick={() => { if (!form.title.trim()) return; onSave({ ...form, id: Date.now(), views: 0 }); onClose(); }}
                        style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#14d9b0,#4f8ef7)", color: 'var(--text-1)', cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                        {t('contentCal.btnSave')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   TAB 5: Guide (i18n 9‑Language)
   ═══════════════════════════════════════════════ */
function ContentCalGuideTab() {
    const { t } = useI18n();
    return (
        <div style={{ display: "grid", gap: 24, maxWidth: 820, margin: "0 auto", padding: "20px 0" }}>
            {/* Hero */}
            <div style={{ textAlign: "center", padding: "32px 20px", borderRadius: 16, background: "linear-gradient(135deg,rgba(20,217,176,0.08),rgba(79,142,247,0.08))", border: "1px solid rgba(79,142,247,0.12)" }}>
                <div style={{ fontSize: 40 }}>📅</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: '#e8eaf0' }}>{t('contentCal.guideTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('contentCal.guideSub')}</div>
            </div>
            {/* 6 Steps */}
            <div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#e8eaf0' }}>{t('contentCal.guideStepsTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                    {[
                        {n:'1️⃣',k:'guideStep1',c:'#6366f1'},
                        {n:'2️⃣',k:'guideStep2',c:'#22c55e'},
                        {n:'3️⃣',k:'guideStep3',c:'#a855f7'},
                        {n:'4️⃣',k:'guideStep4',c:'#f97316'},
                        {n:'5️⃣',k:'guideStep5',c:'#06b6d4'},
                        {n:'6️⃣',k:'guideStep6',c:'#f472b6'},
                    ].map((s,i) => (
                        <div key={i} style={{ padding: "14px 16px", borderRadius: 12, background: s.c + '0a', border: `1px solid ${s.c}20` }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: s.c }}>{s.n} {t(`contentCal.${s.k}Title`)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6 }}>{t(`contentCal.${s.k}Desc`)}</div>
                    ))}
            </div>
            {/* Tab Features */}
            <div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#e8eaf0' }}>{t('contentCal.guideTabsTitle')}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                    {[
                        {icon:'📅',k:'guideCal',c:'#6366f1'},
                        {icon:'📋',k:'guideList',c:'#22c55e'},
                        {icon:'🤖',k:'guideAi',c:'#a855f7'},
                        {icon:'📖',k:'guideGuide',c:'#f472b6'},
                    ].map((tb,i) => (
                        <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: tb.c + '08', border: `1px solid ${tb.c}15` }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: tb.c }}>{tb.icon} {t(`contentCal.${tb.k}Name`)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{t(`contentCal.${tb.k}Desc`)}</div>
                    ))}
            </div>
            {/* Tips */}
            <div>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: '#e8eaf0' }}>💡 {t('contentCal.guideTipsTitle')}</div>
                <ul style={{ display: "grid", gap: 8, paddingLeft: 20, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                    <li>{t('contentCal.guideTip1')}</li>
                    <li>{t('contentCal.guideTip2')}</li>
                    <li>{t('contentCal.guideTip3')}</li>
                    <li>{t('contentCal.guideTip4')}</li>
                    <li>{t('contentCal.guideTip5')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN: Content Calendar (Zero-Mock Enterprise)
   ═══════════════════════════════════════════════════ */
export default function ContentCalendar() {
    const { t } = useI18n();
    const { addAlert, sharedCalendarEvents, setSharedCalendarEvents, connectedChannels } = useGlobalData();
    useContentCalendarSecurity(addAlert);

    const [tab, setTab] = useState("calendar");
    const [showRegister, setShowRegister] = useState(false);

    /* Real-time date */
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());

    /* Calendar events from GlobalDataContext (zero-mock) */
    const calEvents = useMemo(() => {
        return Array.isArray(sharedCalendarEvents) ? sharedCalendarEvents : [];
    }, [sharedCalendarEvents]);

    /* Connected channel data from Integration Hub */
    const channelDataForAI = useMemo(() => {
        if (!connectedChannels || !Array.isArray(connectedChannels)) return {};
        const result = {};
        connectedChannels.forEach(ch => {
            if (ch.status === 'connected' && ch.category) {
                result[ch.platform || ch.name] = {
                    name: ch.name || ch.platform,
                    impressions: ch.metrics?.impressions || 0,
                    clicks: ch.metrics?.clicks || 0,
                    spend: ch.metrics?.spend || 0,
                    revenue: ch.metrics?.revenue || 0,
                    roas: ch.metrics?.roas || 0,
                    conversions: ch.metrics?.conversions || 0,
                    ctr: ch.metrics?.ctr || 0,
                    convRate: ch.metrics?.convRate || 0,
                    cpc: ch.metrics?.cpc || 0,
                };
            }
        });
        return result;
    }, [connectedChannels]);

    /* Status filter bar */
    const STATUS_COLORS = { draft: "#eab308", review: "#f97316", scheduled: "#4f8ef7", published: "#22c55e", cancelled: "#ef4444" };

    /* Month names via i18n */
    const MONTH_KEYS = ['monthJan','monthFeb','monthMar','monthApr','monthMay','monthJun','monthJul','monthAug','monthSep','monthOct','monthNov','monthDec'];

    /* Navigate month */
    const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else { setViewMonth(m => m - 1); } };
    const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else { setViewMonth(m => m + 1); } };

    /* Events for current month */
    const monthEvents = useMemo(() => {
        return calEvents.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);
            return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
        });
    }, [calEvents, viewYear, viewMonth]);

    /* Save new content */
    const handleSaveContent = useCallback((content) => {
        if (typeof setSharedCalendarEvents === 'function') {
            setSharedCalendarEvents(prev => [...(Array.isArray(prev) ? prev : []), content]);
        }
    }, [setSharedCalendarEvents]);

    /* Tabs */
    const TABS = useMemo(() => [
        { id: "calendar", label: `📅 ${t('contentCal.tabCalendar')}` },
        { id: "list", label: `📋 ${t('contentCal.tabList')}` },
        { id: "ai", label: `🤖 ${t('contentCal.tabAi')}` },
        { id: "guide", label: `📖 ${t('contentCal.tabGuide')}` },
    ], [t]);

    return (
<div style={{ display: "grid", gap: 16 }}>
            {/* Live Sync Status */}
            <div style={{ padding:'6px 12px',borderRadius:8,background:'rgba(20,217,176,0.04)',border:'1px solid rgba(20,217,176,0.12)',fontSize:10,color:'#14d9b0',fontWeight:600,display:'flex',alignItems:'center',gap:6 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
                {t('contentCal.liveSyncMsg')}
            </div>
            {/* Header */}
            <div className="card card-glass fade-up" style={{ padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 24 }}>📅</span> {t('contentCal.title')}
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{t('contentCal.subtitle')}</div>
                    <button onClick={() => setShowRegister(true)} className="btn-primary" style={{ background: "linear-gradient(135deg,#14d9b0,#4f8ef7)", fontSize: 12, padding: "8px 18px", borderRadius: 8, border: "none", color: 'var(--text-1)', cursor: "pointer", fontWeight: 700 }}>
                        + {t('contentCal.btnRegister')}
                    </button>
            </div>

            {/* Status Legend */}
            <div className="card card-glass fade-up fade-up-1" style={{ padding: "10px 16px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700 }}>{t('contentCal.statusLabel')}:</span>
                    {Object.entries(STATUS_COLORS).map(([k, c]) => <Tag key={k} label={t(`contentCal.st_${k}`)} color={c} />)}
            </div>

            {/* Tabs */}
            <div className="card card-glass fade-up fade-up-2" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${TABS.length},1fr)` }}>
                    {TABS.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                            padding: "13px 12px", border: "none", cursor: "pointer",
                            background: tab === tb.id ? "rgba(20,217,176,0.08)" : "transparent",
                            borderBottom: `2px solid ${tab === tb.id ? "#14d9b0" : "transparent"}`,
                            fontSize: 12, fontWeight: 800,
                            color: tab === tb.id ? "#14d9b0" : "var(--text-2)",
                            transition: "all .2s",
                        }}>{tb.label}</button>
                    ))}
            </div>

            {/* Calendar View */}
            {tab === "calendar" && (
                <div className="card card-glass fade-up fade-up-3" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <button onClick={prevMonth} className="btn-ghost" style={{ fontSize: 13, padding: "4px 12px", cursor: "pointer", borderRadius: 8 }}>← {t('contentCal.btnPrev')}</button>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{viewYear}{t('contentCal.yearSuffix')} {t(`contentCal.${MONTH_KEYS[viewMonth]}`)}</div>
                        <button onClick={nextMonth} className="btn-ghost" style={{ fontSize: 13, padding: "4px 12px", cursor: "pointer", borderRadius: 8 }}>{t('contentCal.btnNext')} →</button>
                    <MonthCalendar year={viewYear} month={viewMonth} events={monthEvents} t={t} />
                    {monthEvents.length === 0 && (
                        <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 12 }}>
                            📭 {t('contentCal.noEventsMonth')}
                    )}
            )}

            {/* List View */}
            {tab === "list" && (
                <div className="card card-glass fade-up fade-up-3" style={{ padding: 20 }}>
                    <ContentListTab events={calEvents} t={t} />
            )}

            {/* AI Analysis */}
            {tab === "ai" && (
                <div className="card card-glass fade-up fade-up-3" style={{ padding: 20 }}>
                    <AiContentTab t={t} channels={channelDataForAI} />
            )}

            {/* Guide */}
            {tab === "guide" && (
                <div className="card card-glass fade-up fade-up-3" style={{ padding: 20 }}>
                    <ContentCalGuideTab />
            )}

            {/* Register Modal */}
            {showRegister && <ContentRegisterModal onClose={() => setShowRegister(false)} onSave={handleSaveContent} t={t} />}
        </div>
    );
}
