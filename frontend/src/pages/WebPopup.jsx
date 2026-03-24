import React, { useState, useEffect, useCallback, useRef } from "react";
import { useI18n } from "../i18n/index.js";
import PlanGate from "../components/PlanGate.jsx";

const API = import.meta.env.VITE_API_BASE || '';

/* ─── Cookie helpers ─────────────────────────────────────────────────────── */
const setCookie = (name, value, days = 7) => {
    document.cookie = `${name}=${value};max-age=${days * 86400};path=/;SameSite=Lax`;
};
const getCookie = name => {
    return document.cookie.split(';').find(c => c.trim().startsWith(name + '='))?.split('=')[1] || null;
};

/* ─── Static demo data (using translation KEY references, not translated text) ─
   We store translation key suffixes so we can look them up with t() at render time.
   This means language switching always shows the correct language without resetting state.
*/
const DEMO_POPUP_DEFS = [
    { id: 1, nameKey: 'demo1Name', titleKey: 'demo1Title', bodyKey: 'demo1Body', ctaKey: 'demo1Cta',
      type: 'cart_abandon', trigger: 'exit_intent', delay_sec: 0, discount_pct: 10, is_active: true,
      views: 2847, clicks: 341, conversions: 89 },
    { id: 2, nameKey: 'demo2Name', titleKey: 'demo2Title', bodyKey: 'demo2Body', ctaKey: 'demo2Cta',
      type: 'time_delay', trigger: 'time', delay_sec: 30, discount_pct: 0, is_active: true,
      views: 1203, clicks: 198, conversions: 45 },
    { id: 3, nameKey: 'demo3Name', titleKey: 'demo3Title', bodyKey: 'demo3Body', ctaKey: 'demo3Cta',
      type: 'scroll_depth', trigger: 'scroll', delay_sec: 0, scroll_pct: 70, discount_pct: 15, is_active: false,
      views: 892, clicks: 124, conversions: 38 },
];

/* ─── Exit-Intent Detection Hook ────────────────────────────────────────── */
function useExitIntent({ enabled = true, threshold = 20, onTrigger }) {
    const triggered = useRef(false);
    const cooldown = useRef(false);
    const timer = useRef(null);

    useEffect(() => {
        if (!enabled) return;
        if (getCookie('g_popup_seen')) return;

        const handleMouseLeave = (e) => {
            if (cooldown.current || triggered.current) return;
            if (e.clientY <= threshold) {
                triggered.current = true;
                cooldown.current = true;
                onTrigger?.('exit_intent');
                setCookie('g_popup_seen', '1', 1);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && !triggered.current && !cooldown.current) {
                triggered.current = true;
                cooldown.current = true;
                onTrigger?.('tab_switch');
                setCookie('g_popup_seen', '1', 1);
            }
        };

        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timer.current) clearTimeout(timer.current);
        };
    }, [enabled, threshold, onTrigger]);
}

/* ─── Live Popup Overlay ────────────────────────────────────────────────── */
function LivePopupOverlay({ popup, onClose, onConvert }) {
    const { t } = useI18n();
    const [visible, setVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [converted, setConverted] = useState(false);
    const [countdown, setCountdown] = useState(600);

    useEffect(() => {
        setTimeout(() => setVisible(true), 50);
        const timer = setInterval(() => setCountdown(c => c <= 0 ? 0 : c - 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleConvert = () => {
        setConverted(true);
        setTimeout(() => { onConvert?.(); onClose?.(); }, 2000);
    };

    const mins = Math.floor(countdown / 60).toString().padStart(2, '0');
    const secs = (countdown % 60).toString().padStart(2, '0');

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', animation: 'fadeIn 300ms ease'
        }}>
            <div style={{
                position: 'relative', maxWidth: 460, width: '90vw', borderRadius: 20,
                background: 'linear-gradient(145deg,#0a1628,#111827)',
                border: '1px solid rgba(99,140,255,0.3)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '32px 28px', animation: 'slideUp 350ms cubic-bezier(0.34,1.56,0.64,1)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: '50%', border: 'none',
                    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>✕</button>

                {!converted ? (
                    <>
                        {popup.discount_pct > 0 && (
                            <div style={{
                                display: 'inline-block', padding: '4px 16px', borderRadius: 20, marginBottom: 16,
                                background: 'linear-gradient(135deg,#f97316,#ef4444)', fontSize: 12, fontWeight: 900, color: '#fff', letterSpacing: 1
                            }}>
                                🔥 {t('webPopup.limitedOffer')}
                            </div>
                        )}
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
                            {popup.titleKey ? t(`webPopup.${popup.titleKey}`) : popup.title}
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginBottom: 20, lineHeight: 1.6 }}>
                            {popup.bodyKey ? t(`webPopup.${popup.bodyKey}`) : popup.body}
                        </div>

                        {popup.discount_pct > 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', borderRadius: 14, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: 20 }}>
                                <div style={{ fontSize: 48, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>{popup.discount_pct}%</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{t('webPopup.instantDiscount')}</div>
                            </div>
                        )}

                        {countdown > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <span style={{ fontSize: 11, color: '#ef4444' }}>⏱ {t('webPopup.couponExpiry')}</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#ef4444', fontSize: 16 }}>{mins}:{secs}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('webPopup.emailPlaceholder')} type="email"
                                style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(99,140,255,0.25)', background: 'rgba(15,20,40,0.8)', color: '#fff', fontSize: 13 }} />
                            <button onClick={handleConvert}
                                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 14, whiteSpace: 'nowrap',
                                    background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', boxShadow: '0 4px 15px rgba(249,115,22,0.4)' }}>
                                {popup.ctaKey ? t(`webPopup.${popup.ctaKey}`) : popup.cta}
                            </button>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                            {t('webPopup.privacyNote')}
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e', marginBottom: 8 }}>{t('webPopup.couponApplied')}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t('webPopup.closingSoon')}</div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                @keyframes slideUp { from { transform:translateY(40px) scale(0.95);opacity:0 } to { transform:translateY(0) scale(1);opacity:1 } }
            `}</style>
        </div>
    );
}

/* ─── Popup Create/Edit Modal ─────────────────────────────────────────── */
function PopupEditor({ popup, onSave, onClose, t }) {
    const [form, setForm] = useState(popup || {
        name: '', type: 'cart_abandon', trigger: 'exit_intent', delay_sec: 0,
        title: '', body: '', cta: '', discount_pct: 0, is_active: true,
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ width: 'min(560px,95vw)', borderRadius: 18, background: '#0d1827', border: '1px solid rgba(99,140,255,0.2)', padding: '28px' }}>
                <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 20 }}>
                    {popup ? t('webPopup.editPopup') : t('webPopup.createPopup')}
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                    {[
                        { l: t('webPopup.popupName'), k: 'name', type: 'text', ph: t('webPopup.popupNamePh') },
                        { l: t('webPopup.title'), k: 'title', type: 'text', ph: t('webPopup.titlePh') },
                        { l: t('webPopup.ctaBtn'), k: 'cta', type: 'text', ph: t('webPopup.buyNow') },
                        { l: t('webPopup.discountPct'), k: 'discount_pct', type: 'number', ph: '0' },
                    ].map(f => (
                        <div key={f.k}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.l}</div>
                            <input type={f.type} value={form[f.k] || ''} placeholder={f.ph}
                                onChange={e => set(f.k, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                                className="input" />
                        </div>
                    ))}
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{t('webPopup.bodyContent')}</div>
                        <textarea value={form.body || ''} onChange={e => set('body', e.target.value)} rows={3} placeholder={t('webPopup.bodyPh')}
                            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('webPopup.triggerType')}</div>
                            <select value={form.trigger} onChange={e => set('trigger', e.target.value)} className="input">
                                {[
                                    { trigger: 'exit_intent', label: t('webPopup.triggerExit'), desc: t('webPopup.triggerExitDesc') },
                                    { trigger: 'time', label: t('webPopup.triggerTime'), desc: t('webPopup.triggerTimeDesc') },
                                    { trigger: 'scroll', label: t('webPopup.triggerScroll'), desc: t('webPopup.triggerScrollDesc') },
                                    { trigger: 'inactive', label: t('webPopup.triggerInactive'), desc: t('webPopup.triggerInactiveDesc') },
                                ].map(p => <option key={p.trigger} value={p.trigger}>{p.label} — {p.desc}</option>)}
                            </select>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('webPopup.delaySec')}</div>
                            <input type="number" value={form.delay_sec || 0} onChange={e => set('delay_sec', Number(e.target.value))} className="input" min={0} />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}>
                        {t('cancel')}
                    </button>
                    <button onClick={() => onSave(form)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══ MAIN COMPONENT ════════════════════════════════════════════════════════ */
function WebPopupInner() {
    const { t, lang } = useI18n();

    // ── Trigger types (re-computed on lang change via t()) ──────────────────
    const POPUP_TYPES = [
        { id: 'cart_abandon', label: t('webPopup.triggerExit'), icon: '🛒', trigger: 'exit_intent', desc: t('webPopup.triggerExitDesc') },
        { id: 'time_delay',   label: t('webPopup.triggerTime'), icon: '⏱', trigger: 'time', desc: t('webPopup.triggerTimeDesc') },
        { id: 'scroll_depth', label: t('webPopup.triggerScroll'), icon: '📜', trigger: 'scroll', desc: t('webPopup.triggerScrollDesc') },
        { id: 'inactivity',   label: t('webPopup.triggerInactive'), icon: '💤', trigger: 'inactive', desc: t('webPopup.triggerInactiveDesc') },
    ];

    const TABS = [
        { id: 'overview',  label: `📊 ${t('webPopup.tabOverview')}` },
        { id: 'popups',    label: `🎯 ${t('webPopup.tabManage')}` },
        { id: 'demo',      label: `🎬 ${t('webPopup.tabLive')}` },
        { id: 'ab',        label: `🧪 ${t('webPopup.tabAB')}` },
        { id: 'settings',  label: `⚙️ ${t('webPopup.tabSettings')}` },
    ];

    // ── State: use key-based popups so translation is always live ───────────
    // nameKey/titleKey/bodyKey/ctaKey are resolved to translated text at render time
    const [popups, setPopups] = useState(DEMO_POPUP_DEFS);
    const [tab, setTab] = useState('overview');
    const [editing, setEditing] = useState(null);
    const [previewPopup, setPreviewPopup] = useState(null);
    const [exitTriggerActive, setExitTriggerActive] = useState(false);
    const [showLivePopup, setShowLivePopup] = useState(false);
    const [liveConversions, setLiveConversions] = useState(89);

    useExitIntent({
        enabled: exitTriggerActive,
        onTrigger: () => setShowLivePopup(true),
    });

    // ── Helper: resolve popup display fields (respects current language) ────
    const resolve = (p) => ({
        ...p,
        name: p.nameKey ? t(`webPopup.${p.nameKey}`) : (p.name || ''),
        title: p.titleKey ? t(`webPopup.${p.titleKey}`) : (p.title || ''),
        body: p.bodyKey ? t(`webPopup.${p.bodyKey}`) : (p.body || ''),
        cta: p.ctaKey ? t(`webPopup.${p.ctaKey}`) : (p.cta || ''),
    });

    const totalViews = popups.reduce((s, p) => s + (p.views || 0), 0);
    const totalClicks = popups.reduce((s, p) => s + (p.clicks || 0), 0);
    const totalConversions = popups.reduce((s, p) => s + (p.conversions || 0), 0);
    const avgCtr = totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(1) : 0;
    const avgCvr = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(1) : 0;

    const toggleActive = (id) => setPopups(ps => ps.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p));

    const savePopup = (form) => {
        if (editing?.id) {
            setPopups(ps => ps.map(p => p.id === editing.id ? { ...p, ...form, nameKey: undefined, titleKey: undefined, bodyKey: undefined, ctaKey: undefined } : p));
        } else {
            setPopups(ps => [...ps, { ...form, id: Date.now(), views: 0, clicks: 0, conversions: 0 }]);
        }
        setEditing(null);
    };

    return (
        <div style={{ display: 'grid', gap: 18, padding: 4 }}>
            {showLivePopup && (
                <LivePopupOverlay
                    popup={popups[0]}
                    onClose={() => setShowLivePopup(false)}
                    onConvert={() => setLiveConversions(c => c + 1)}
                />
            )}
            {editing !== undefined && editing !== null && (
                <PopupEditor popup={editing === 'new' ? null : (editing.nameKey ? resolve(editing) : editing)} onSave={savePopup} onClose={() => setEditing(null)} t={t} />
            )}

            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title grad-blue-purple">🎯 {t('webPopup.heroTitle')}</div>
                        <div className="hero-desc">{t('webPopup.heroDesc')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{t('webPopup.badgeExit')}</span>
                            <span className="badge badge-purple">{t('webPopup.badgeLive')}</span>
                            <span className="badge badge-teal">{t('webPopup.badgeAB')}</span>
                            <span className="badge" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>{t('webPopup.badgeCvr')}</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[{ l: t('webPopup.statViews'), v: totalViews.toLocaleString(), c: '#4f8ef7' },
                          { l: 'CTR', v: `${avgCtr}%`, c: '#22c55e' },
                          { l: t('webPopup.statConv'), v: totalConversions.toLocaleString(), c: '#a855f7' },
                          { l: 'CVR', v: `${avgCvr}%`, c: '#f97316' }].map(k => (
                            <div key={k.l} style={{ padding: '8px 14px', borderRadius: 10, background: `${k.c}10`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14 }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                        padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1,
                        background: tab === tb.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                        color: tab === tb.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms'
                    }}>
                        {tb.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 16 }}>📊 {t('webPopup.popupPerf')}</div>
                        <table className="table">
                            <thead><tr>
                                <th>{t('webPopup.colName')}</th><th>{t('webPopup.colTrigger')}</th><th>{t('webPopup.colStatus')}</th>
                                <th>{t('webPopup.colViews')}</th><th>{t('webPopup.colClicks')}</th><th>{t('webPopup.colConv')}</th>
                                <th>CTR</th><th>CVR</th>
                            </tr></thead>
                            <tbody>
                                {popups.map(p => {
                                    const r = resolve(p);
                                    const ctr = (p.clicks / Math.max(p.views, 1) * 100).toFixed(1);
                                    const cvr = (p.conversions / Math.max(p.clicks, 1) * 100).toFixed(1);
                                    return (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 700 }}>{r.name}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{POPUP_TYPES.find(tp => tp.trigger === p.trigger)?.label || p.trigger}</td>
                                            <td onClick={() => toggleActive(p.id)} style={{ cursor: 'pointer' }}>
                                                <span style={{
                                                    padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                                    background: p.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                                                    color: p.is_active ? '#22c55e' : '#6b7280',
                                                    border: `1px solid ${p.is_active ? '#22c55e33' : '#6b728033'}`, cursor: 'pointer'
                                                }}>
                                                    {p.is_active ? `● ${t('webPopup.active')}` : `○ ${t('webPopup.inactive')}`}
                                                </span>
                                            </td>
                                            <td>{(p.views || 0).toLocaleString()}</td>
                                            <td>{(p.clicks || 0).toLocaleString()}</td>
                                            <td style={{ color: '#22c55e', fontWeight: 700 }}>{p.conversions || 0}</td>
                                            <td style={{ color: '#4f8ef7', fontWeight: 700 }}>{ctr}%</td>
                                            <td style={{ color: '#f97316', fontWeight: 700 }}>{cvr}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Popup Management Tab */}
            {tab === 'popups' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditing('new')} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            + {t('webPopup.createPopup')}
                        </button>
                    </div>
                    {popups.map(p => {
                        const r = resolve(p);
                        return (
                            <div key={p.id} className="card card-glass" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: 20 }}>{POPUP_TYPES.find(tp => tp.trigger === p.trigger)?.icon || '🎯'}</span>
                                        <span style={{ fontWeight: 900, fontSize: 14 }}>{r.name}</span>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                            background: p.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                                            color: p.is_active ? '#22c55e' : '#6b7280',
                                            border: `1px solid ${p.is_active ? '#22c55e33' : '#6b728033'}`
                                        }}>
                                            {p.is_active ? t('webPopup.active') : t('webPopup.inactive')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}><strong>"{r.title}"</strong></div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                        {r.body?.slice(0, 60)}… {p.discount_pct > 0 ? `| ${p.discount_pct}% ${t('webPopup.discount')}` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                        {[{ l: t('webPopup.colViews'), v: (p.views || 0).toLocaleString() },
                                          { l: t('webPopup.colClicks'), v: (p.clicks || 0).toLocaleString() },
                                          { l: t('webPopup.colConv'), v: (p.conversions || 0).toLocaleString() }].map(k => (
                                            <div key={k.l}><span style={{ color: 'var(--text-3)', fontSize: 10 }}>{k.l} </span><strong style={{ fontSize: 13 }}>{k.v}</strong></div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                                    <button onClick={() => setPreviewPopup(p)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                        🔍 {t('webPopup.preview')}
                                    </button>
                                    <button onClick={() => setEditing(p)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>
                                        ✏️ {t('edit')}
                                    </button>
                                    <button onClick={() => toggleActive(p.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: p.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: p.is_active ? '#ef4444' : '#22c55e', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                        {p.is_active ? t('webPopup.deactivate') : t('webPopup.activate')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Live Preview Tab */}
            {tab === 'demo' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>🎬 {t('webPopup.liveDemo')}</div>
                    <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)', marginBottom: 16, lineHeight: 1.8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f8ef7', marginBottom: 8 }}>🖱 {t('webPopup.howItWorks')}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            1. {t('webPopup.step1')}<br />
                            2. {t('webPopup.step2')}<br />
                            3. → {t('webPopup.step3')}<br />
                            4. {t('webPopup.step4')}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                        <button onClick={() => setExitTriggerActive(true)} disabled={exitTriggerActive}
                            style={{ padding: '10px 24px', borderRadius: 10, border: 'none',
                                background: exitTriggerActive ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                                color: exitTriggerActive ? '#22c55e' : '#fff', fontSize: 13, fontWeight: 700,
                                cursor: exitTriggerActive ? 'default' : 'pointer' }}>
                            {exitTriggerActive ? `⚡ ${t('webPopup.liveMoveUp')}` : `🚀 ${t('webPopup.startDetect')}`}
                        </button>
                        <button onClick={() => setShowLivePopup(true)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(249,115,22,0.3)', background: 'transparent', color: '#f97316', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            🔍 {t('webPopup.previewNow')}
                        </button>
                        {exitTriggerActive && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, animation: 'pulse 1s infinite' }}>● LIVE</span>}
                    </div>
                    <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', fontSize: 11, color: 'var(--text-3)' }}>
                        {t('webPopup.sessionConv')}: <strong style={{ color: '#22c55e', fontSize: 14 }}>{liveConversions}</strong>
                    </div>
                </div>
            )}

            {/* A/B Test Tab */}
            {tab === 'ab' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>🧪 {t('webPopup.abResult')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                            { name: `A: ${t('webPopup.abVariantA')}`, views: 1421, clicks: 206, bg: 'rgba(79,142,247,0.08)', color: '#4f8ef7' },
                            { name: `B: ${t('webPopup.abVariantB')}`, views: 1387, clicks: 280, bg: 'rgba(34,197,94,0.08)', color: '#22c55e', winner: true },
                        ].map(v => {
                            const ctr = (v.clicks / v.views * 100).toFixed(2);
                            return (
                                <div key={v.name} style={{ padding: '18px', borderRadius: 14, background: v.bg, border: `2px solid ${v.color}${v.winner ? '55' : '22'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{ fontWeight: 900, color: v.color }}>{v.name}</span>
                                        {v.winner && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>🏆 {t('webPopup.winner')}</span>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'center', marginBottom: 12 }}>
                                        <div><div style={{ fontSize: 20, fontWeight: 900, color: v.color }}>{v.views.toLocaleString()}</div><div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('webPopup.colViews')}</div></div>
                                        <div><div style={{ fontSize: 20, fontWeight: 900, color: v.color }}>{v.clicks}</div><div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('webPopup.colClicks')}</div></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                        <span style={{ color: 'var(--text-3)' }}>CTR</span>
                                        <span style={{ fontWeight: 900, color: v.color }}>{ctr}%</span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginTop: 8, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, Number(ctr) * 10)}%`, height: '100%', background: v.color, borderRadius: 6 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: 14, padding: '12px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: 'var(--text-2)' }}>
                        🤖 {t('webPopup.abInsight')}
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>⚙️ {t('webPopup.globalSettings')}</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            {[
                                { l: t('webPopup.settingExit'), desc: t('webPopup.settingExitDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingTab'), desc: t('webPopup.settingTabDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingInactive'), desc: t('webPopup.settingInactiveDesc'), active: false, color: '#6b7280' },
                                { l: t('webPopup.settingMobile'), desc: t('webPopup.settingMobileDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingCookie'), desc: t('webPopup.settingCookieDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingGdpr'), desc: t('webPopup.settingGdprDesc'), active: true, color: '#4f8ef7' },
                            ].map(s => (
                                <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.2)' }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>{s.l}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.desc}</div>
                                    </div>
                                    <div style={{ width: 34, height: 18, borderRadius: 20, background: s.active ? s.color : 'rgba(107,114,128,0.3)', transition: 'background 300ms', cursor: 'pointer', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 2, left: s.active ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 300ms' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {previewPopup && (
                <LivePopupOverlay popup={previewPopup} onClose={() => setPreviewPopup(null)} onConvert={() => setPreviewPopup(null)} />
            )}
        </div>
    );
}

export default function WebPopup() {
    return (
        <PlanGate feature="customer_ai">
            <WebPopupInner />
        </PlanGate>
    );
}
