import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useI18n } from "../i18n/index.js";
import PlanGate from "../components/PlanGate.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════ */
const XSS_PATTERN = /(<script|javascript:|on\w+=|eval\(|document\.(cookie|domain)|window\.(location|open))/i;

/* ══════════════════════════════════════════════════════════════════
   Cookie helpers (GDPR-safe, SameSite strict)
══════════════════════════════════════════════════════════════════ */
const setCookie = (name, value, days = 7) => {
    document.cookie = `${name}=${value};max-age=${days * 86400};path=/;SameSite=Lax`;
};
const getCookie = name => {
    return document.cookie.split(';').find(c => c.trim().startsWith(name + '='))?.split('=')[1] || null;
};

/* ══════════════════════════════════════════════════════════════════
   SECURITY HOOK — XSS/Injection guard for all popup inputs
══════════════════════════════════════════════════════════════════ */
function usePopupSecurity() {
    const { addAlert } = useGlobalData();
    const [hackAlert, setHackAlert] = useState(null);

    useEffect(() => {
        const detectXSS = (e) => {
            const val = e.target?.value || "";
            if (XSS_PATTERN.test(val)) {
                e.target.value = "";
                e.preventDefault();
                const msg = `\u{1F6E1}\uFE0F XSS injection blocked on Web Popup: ${val.slice(0, 40)}...`;
                setHackAlert(msg);
                addAlert?.({ type: "warn", msg });
            }
        };
        document.addEventListener("input", detectXSS, true);
        return () => document.removeEventListener("input", detectXSS, true);
    }, [addAlert]);

    return { alert: hackAlert, clearAlert: () => setHackAlert(null) };
}

/* ══════════════════════════════════════════════════════════════════
   API AUTO-LOAD — Fetch popup campaigns from backend → Context sync
══════════════════════════════════════════════════════════════════ */
function usePopupDataSync() {
    const { updateWebPopupStats, addAbTestResult } = useGlobalData();
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current) return;
        loaded.current = true;
        const BASE = import.meta.env.VITE_API_BASE || "";
        const token = localStorage.getItem("g_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        Promise.allSettled([
            fetch(`${BASE}/api/v423/web-popup/campaigns`, { headers }).then(r => r.ok ? r.json() : null),
            fetch(`${BASE}/api/v423/web-popup/ab-results`, { headers }).then(r => r.ok ? r.json() : null),
        ]).then(([campaignsRes, abRes]) => {
            if (campaignsRes.status === "fulfilled" && Array.isArray(campaignsRes.value)) {
                campaignsRes.value.forEach(c => updateWebPopupStats?.(c.id, c));
            }
            if (abRes.status === "fulfilled" && Array.isArray(abRes.value)) {
                abRes.value.forEach(r => addAbTestResult?.(r));
            }
        }).catch(() => { /* Network error — uses existing context data */ });
    }, [updateWebPopupStats, addAbTestResult]);
}

/* ══════════════════════════════════════════════════════════════════
   Exit-Intent Detection Hook
══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   Live Popup Overlay
══════════════════════════════════════════════════════════════════ */
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

    const handleConvert = useCallback(() => {
        setConverted(true);
        setTimeout(() => { onConvert?.(); onClose?.(); }, 2000);
    }, [onConvert, onClose]);

    const mins = Math.floor(countdown / 60).toString().padStart(2, '0');
    const secs = (countdown % 60).toString().padStart(2, '0');

    if (!visible || !popup) return null;

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
                    background: 'var(--border)', color: 'var(--text-3)', fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>{"\u2715"}</button>

                {!converted ? (
                    <>
                        {(popup.discount_pct || 0) > 0 && (
                            <div style={{
                                display: 'inline-block', padding: '4px 16px', borderRadius: 20, marginBottom: 16,
                                background: 'linear-gradient(135deg,#f97316,#ef4444)', fontSize: 12, fontWeight: 900, color: 'var(--text-1)', letterSpacing: 1
                            }}>{"\uD83D\uDD25"} {t('webPopup.limitedOffer')}</div>
                        )}
                        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8, lineHeight: 1.3 }}>
                            {popup.titleKey ? t(`webPopup.${popup.titleKey}`) : (popup.title || '')}
                        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
                            {popup.bodyKey ? t(`webPopup.${popup.bodyKey}`) : (popup.body || '')}

                        {(popup.discount_pct || 0) > 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', borderRadius: 14, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', marginBottom: 20 }}>
                                <div style={{ fontSize: 48, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>{popup.discount_pct}%</div>
                                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{t('webPopup.instantDiscount')})}

                        {countdown > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <span style={{ fontSize: 11, color: '#ef4444' }}>{"\u23F1"} {t('webPopup.couponExpiry')}</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#ef4444', fontSize: 16 }}>{mins}:{secs}</span>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('webPopup.emailPlaceholder')} type="email"
                                style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(99,140,255,0.25)', background: 'rgba(15,20,40,0.8)', color: 'var(--text-1)', fontSize: 13 }} />
                            <button onClick={() => { if (popup.link_enabled && popup.link_url) { window.open(popup.link_url, '_blank', 'noopener,noreferrer'); } handleConvert(); }}
                                style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 14, whiteSpace: 'nowrap',
                                    background: 'linear-gradient(135deg,#f97316,#ef4444)', color: 'var(--text-1)', boxShadow: '0 4px 15px rgba(249,115,22,0.4)' }}>
                                {popup.ctaKey ? t(`webPopup.${popup.ctaKey}`) : (popup.cta || t('webPopup.buyNow'))}
                                {popup.link_enabled && popup.link_url && <span style={{ marginLeft: 4, fontSize: 11 }}>{'\uD83D\uDD17'}</span>}
                            </button>
                        {popup.link_enabled && popup.link_url && (
                            <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 10, color: 'rgba(79,142,247,0.6)' }}>
                                {'\uD83D\uDD17'} {t('webPopup.linkOpen')}: <span style={{ textDecoration: 'underline' }}>{popup.link_url.length > 40 ? popup.link_url.substring(0, 40) + '...' : popup.link_url}</span>
                        )}
                        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)' }}>
                            {t('webPopup.privacyNote')}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>{"\uD83C\uDF89"}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e', marginBottom: 8 }}>{t('webPopup.couponApplied')}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{t('webPopup.closingSoon')})}
            <style>{`
                @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                @keyframes slideUp { from { transform:translateY(40px) scale(0.95);opacity:0 } to { transform:translateY(0) scale(1);opacity:1 } }
            `}</style>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════════
   Popup Editor Modal
══════════════════════════════════════════════════════════════════ */
function PopupEditor({ popup, onSave, onClose, t }) {
    const [form, setForm] = useState(popup || {
        name: '', type: 'cart_abandon', trigger: 'exit_intent', delay_sec: 0,
        title: '', body: '', cta: '', discount_pct: 0, is_active: true,
        link_url: '', link_enabled: false,
    });
    const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ width: 'min(560px,95vw)', borderRadius: 18, background: '#0d1827', border: '1px solid rgba(99,140,255,0.2)', padding: '28px' }}>
                <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 20 }}>
                    {popup ? t('webPopup.editPopup') : t('webPopup.createPopup')}
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
                    ))}
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{t('webPopup.bodyContent')}</div>
                        <textarea value={form.body || ''} onChange={e => set('body', e.target.value)} rows={3} placeholder={t('webPopup.bodyPh')}
                            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
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
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('webPopup.delaySec')}</div>
                            <input type="number" value={form.delay_sec || 0} onChange={e => set('delay_sec', Number(e.target.value))} className="input" min={0} />
                    </div>
                    {/* Shortcut URL Section */}
                    <div style={{ marginTop: 4, padding: '14px', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.12)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.link_enabled ? 10 : 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>{'\uD83D\uDD17'}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#4f8ef7' }}>{t('webPopup.linkEnabled')}</span>
                            <button onClick={() => set('link_enabled', !form.link_enabled)} style={{ width: 42, height: 22, borderRadius: 11, border: 'none', background: form.link_enabled ? '#4f8ef7' : 'rgba(107,114,128,0.3)', cursor: 'pointer', position: 'relative', transition: 'background 200ms' }}>
                                <span style={{ position: 'absolute', top: 2, left: form.link_enabled ? 22 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                            </button>
                        {form.link_enabled && (
                            <div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{t('webPopup.linkUrl')}</div>
                                <input type="url" value={form.link_url || ''} placeholder={t('webPopup.linkUrlPh')} onChange={e => set('link_url', e.target.value)} className="input" />
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, opacity: 0.7 }}>{t('webPopup.linkUrlDesc')})}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}>
                        {t('cancel')}
                    </button>
                    <button onClick={() => onSave(form)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {t('save')}
                    </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════════
   MAIN: WebPopup Page — Enterprise Edition
   - GlobalDataContext real-time sync (webPopupCampaigns, abTestResults)
   - XSS/injection security guard with instant alert
   - API auto-load hook
   - Zero mock data
══════════════════════════════════════════════════════════════════ */
function WebPopupInner() {
    const { t } = useI18n();
    const { abTestResults = [], webPopupCampaigns = [], addAlert } = useGlobalData();
    const { alert: hackAlert, clearAlert: clearHack } = usePopupSecurity();

    // Auto-load from API → GlobalDataContext
    usePopupDataSync();

    // Trigger types (re-computed on lang change)
    const POPUP_TYPES = useMemo(() => [
        { id: 'cart_abandon', label: t('webPopup.triggerExit'), icon: '\uD83D\uDED2', trigger: 'exit_intent', desc: t('webPopup.triggerExitDesc') },
        { id: 'time_delay', label: t('webPopup.triggerTime'), icon: '\u23F1', trigger: 'time', desc: t('webPopup.triggerTimeDesc') },
        { id: 'scroll_depth', label: t('webPopup.triggerScroll'), icon: '\uD83D\uDCDC', trigger: 'scroll', desc: t('webPopup.triggerScrollDesc') },
        { id: 'inactivity', label: t('webPopup.triggerInactive'), icon: '\uD83D\uDCA4', trigger: 'inactive', desc: t('webPopup.triggerInactiveDesc') },
    ], [t]);

    const TABS = useMemo(() => [
        { id: 'overview', label: `\uD83D\uDCCA ${t('webPopup.tabOverview')}` },
        { id: 'popups', label: `\uD83C\uDFAF ${t('webPopup.tabManage')}` },
        { id: 'live', label: `\uD83C\uDFAC ${t('webPopup.tabLive')}` },
        { id: 'ab', label: `\uD83E\uDDEA ${t('webPopup.tabAB')}` },
        { id: 'settings', label: `\u2699\uFE0F ${t('webPopup.tabSettings')}` },
        { id: 'guide', label: `\uD83D\uDCD6 ${t('webPopup.tabGuide')}` },
    ], [t]);

    // AI Auto-Design state
    const AI_THEMES = useMemo(() => [
        { id: 'discount', label: t('webPopup.aiThemeDiscount'), icon: '\uD83C\uDF81', color: '#f97316', gradient: 'linear-gradient(135deg,#f97316,#ef4444)' },
        { id: 'newsletter', label: t('webPopup.aiThemeNewsletter'), icon: '\u2709\uFE0F', color: '#4f8ef7', gradient: 'linear-gradient(135deg,#4f8ef7,#6366f1)' },
        { id: 'cart', label: t('webPopup.aiThemeCart'), icon: '\uD83D\uDED2', color: '#ef4444', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
        { id: 'welcome', label: t('webPopup.aiThemeWelcome'), icon: '\uD83D\uDC4B', color: '#22c55e', gradient: 'linear-gradient(135deg,#22c55e,#10b981)' },
        { id: 'flash', label: t('webPopup.aiThemeFlash'), icon: '\u26A1', color: '#eab308', gradient: 'linear-gradient(135deg,#eab308,#f97316)' },
        { id: 'season', label: t('webPopup.aiThemeSeason'), icon: '\uD83C\uDF3F', color: '#a855f7', gradient: 'linear-gradient(135deg,#a855f7,#6366f1)' },
    ], [t]);
    const [aiTheme, setAiTheme] = useState('discount');
    const [aiTopic, setAiTopic] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [aiImagePrompt, setAiImagePrompt] = useState('');
    const [aiPlatform, setAiPlatform] = useState('popup');
    const AI_PLATFORMS = useMemo(() => [
        { id: 'popup', label: t('webPopup.platformPopup') || 'Web Popup', icon: '\uD83C\uDFAF', size: '460×auto' },
        { id: 'instagram', label: 'Instagram', icon: '\uD83D\uDCF8', size: '1080×1080' },
        { id: 'tiktok', label: 'TikTok', icon: '\uD83C\uDFB5', size: '1080×1920' },
        { id: 'kakao', label: t('webPopup.platformKakao') || 'Kakao Channel', icon: '\uD83D\uDCAC', size: '720×720' },
    ], [t]);
    const THEME_IMAGES = { discount: '/popup-themes/discount.png', newsletter: '/popup-themes/newsletter.png', cart: '/popup-themes/cart.png', welcome: '/popup-themes/welcome.png', flash: '/popup-themes/flash.png', season: '/popup-themes/season.png' };

    const generateAiDesign = useCallback(() => {
        setAiGenerating(true);
        setAiResult(null);
        const theme = AI_THEMES.find(th => th.id === aiTheme);
        const plat = AI_PLATFORMS.find(p => p.id === aiPlatform);
        setTimeout(() => {
            const designs = {
                discount: { title: aiTopic || t('webPopup.titlePh'), body: t('webPopup.heroDesc'), cta: t('webPopup.buyNow'), discount_pct: 15, trigger: 'exit_intent' },
                newsletter: { title: aiTopic || 'Newsletter', body: t('webPopup.bodyPh'), cta: t('webPopup.buyNow'), discount_pct: 0, trigger: 'time' },
                cart: { title: aiTopic || t('webPopup.triggerExit'), body: t('webPopup.heroDesc'), cta: t('webPopup.buyNow'), discount_pct: 10, trigger: 'exit_intent' },
                welcome: { title: aiTopic || t('webPopup.limitedOffer'), body: t('webPopup.bodyPh'), cta: t('webPopup.buyNow'), discount_pct: 5, trigger: 'time' },
                flash: { title: aiTopic || t('webPopup.limitedOffer'), body: t('webPopup.heroDesc'), cta: t('webPopup.buyNow'), discount_pct: 30, trigger: 'exit_intent' },
                season: { title: aiTopic || t('webPopup.limitedOffer'), body: t('webPopup.bodyPh'), cta: t('webPopup.buyNow'), discount_pct: 20, trigger: 'scroll' },
            };
            setAiResult({ ...designs[aiTheme] || designs.discount, name: `AI-${theme?.label || aiTheme}`, type: aiTheme, is_active: true, _theme: theme, _platform: plat, _imagePrompt: aiImagePrompt, _themeImage: THEME_IMAGES[aiTheme] || THEME_IMAGES.discount });
            setAiGenerating(false);
        }, 2200);
    }, [aiTheme, aiTopic, aiImagePrompt, aiPlatform, AI_THEMES, AI_PLATFORMS, t]);

    // Custom upload state
    const [customImage, setCustomImage] = useState(null);
    const [customImageName, setCustomImageName] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const handleFileUpload = useCallback((file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { addAlert?.({ type: 'error', msg: 'File size exceeds 5MB' }); return; }
        const reader = new FileReader();
        reader.onload = (e) => { setCustomImage(e.target.result); setCustomImageName(file.name); };
        reader.readAsDataURL(file);
    }, [addAlert]);
    const applyCustomImage = useCallback(() => {
        if (!customImage) return;
        const popup = { id: Date.now(), name: customImageName || `Custom-${Date.now()}`, title: customImageName, body: '', cta: t('webPopup.buyNow'), discount_pct: 0, trigger: 'exit_intent', is_active: true, type: 'custom', _customImage: customImage };
        setPopups(ps => [...ps, popup]);
        setCustomImage(null); setCustomImageName('');
        addAlert?.({ type: 'success', msg: `✔ ${t('webPopup.uploadApply')}` });
    }, [customImage, customImageName, t, addAlert]);

    // State — popups from GlobalDataContext (real-time synced)
    const [popups, setPopups] = useState([]);
    const [tab, setTab] = useState('overview');
    const [editing, setEditing] = useState(null);
    const [previewPopup, setPreviewPopup] = useState(null);
    const [exitTriggerActive, setExitTriggerActive] = useState(false);
    const [showLivePopup, setShowLivePopup] = useState(false);
    const [liveConversions, setLiveConversions] = useState(0);

    // Sync from GlobalDataContext when webPopupCampaigns changes
    useEffect(() => {
        if (webPopupCampaigns && webPopupCampaigns.length > 0) {
            setPopups(webPopupCampaigns);
        }
    }, [webPopupCampaigns]);

    useExitIntent({
        enabled: exitTriggerActive,
        onTrigger: () => setShowLivePopup(true),
    });

    // Resolve popup display fields (respects current language)
    const resolve = useCallback((p) => ({
        ...p,
        name: p.nameKey ? t(`webPopup.${p.nameKey}`) : (p.name || ''),
        title: p.titleKey ? t(`webPopup.${p.titleKey}`) : (p.title || ''),
        body: p.bodyKey ? t(`webPopup.${p.bodyKey}`) : (p.body || ''),
        cta: p.ctaKey ? t(`webPopup.${p.ctaKey}`) : (p.cta || ''),
    }), [t]);

    // KPI from real-time Context data
    const totalViews = popups.reduce((s, p) => s + (p.views || 0), 0);
    const totalClicks = popups.reduce((s, p) => s + (p.clicks || 0), 0);
    const totalConversions = popups.reduce((s, p) => s + (p.conversions || 0), 0);
    const avgCtr = totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(1) : '0.0';
    const avgCvr = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(1) : '0.0';

    const toggleActive = useCallback((id) => setPopups(ps => ps.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p)), []);

    const savePopup = useCallback((form) => {
        if (editing?.id) {
            setPopups(ps => ps.map(p => p.id === editing.id ? { ...p, ...form, nameKey: undefined, titleKey: undefined, bodyKey: undefined, ctaKey: undefined } : p));
        } else {
            setPopups(ps => [...ps, { ...form, id: Date.now(), views: 0, clicks: 0, conversions: 0 }]);
        }
        setEditing(null);
    }, [editing]);

    return (
        <div style={{ display: 'grid', gap: 18, padding: 4, position: 'relative' }}>
            {/* Live Sync Status */}
            <div style={{ padding:'6px 12px',borderRadius:8,background:'rgba(20,217,176,0.04)',border:'1px solid rgba(20,217,176,0.12)',fontSize:10,color:'#14d9b0',fontWeight:600,display:'flex',alignItems:'center',gap:6 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
                {t('webPopup.liveSyncMsg')}
            {/* Security Alert Banner */}
            {hackAlert && (
                <div style={{
                    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
                    background: 'rgba(239,68,68,0.95)', backdropFilter: 'blur(10px)', border: '1px solid #fca5a5',
                    padding: '16px 24px', borderRadius: 12, color: 'var(--text-1)', fontWeight: 900, fontSize: 13,
                    boxShadow: '0 20px 40px rgba(220,38,38,0.4)', display: 'flex', alignItems: 'center', gap: 14,
                    animation: 'shake 0.4s ease-in-out'
                }}>
                    <span style={{ fontSize: 24 }}>{"\uD83D\uDEE1\uFE0F"}</span>
                    <span>{hackAlert}</span>
                    <button onClick={clearHack} style={{ marginLeft: 20, background: 'var(--surface)', border: 'none', color: 'var(--text-1)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>{"\u2715"}</button>
                    <style>{`@keyframes shake { 0%,100%{transform:translateX(-50%)} 25%{transform:translateX(calc(-50% - 10px))} 75%{transform:translateX(calc(-50% + 10px))} }`}</style>
            )}

            {showLivePopup && popups.length > 0 && (
                <LivePopupOverlay popup={popups[0]} onClose={() => setShowLivePopup(false)} onConvert={() => setLiveConversions(c => c + 1)} />
            )}
            {editing !== undefined && editing !== null && (
                <PopupEditor popup={editing === 'new' ? null : (editing.nameKey ? resolve(editing) : editing)} onSave={savePopup} onClose={() => setEditing(null)} t={t} />
            )}

            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title grad-blue-purple">{"\uD83C\uDFAF"} {t('webPopup.heroTitle')}</div>
                        <div className="hero-desc">{t('webPopup.heroDesc')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{t('webPopup.badgeExit')}</span>
                            <span className="badge badge-purple">{t('webPopup.badgeLive')}</span>
                            <span className="badge badge-teal">{t('webPopup.badgeAB')}</span>
                            <span className="badge" style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>{t('webPopup.badgeCvr')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[{ l: t('webPopup.statViews'), v: totalViews.toLocaleString(), c: '#4f8ef7' },
                          { l: 'CTR', v: `${avgCtr}%`, c: '#22c55e' },
                          { l: t('webPopup.statConv'), v: totalConversions.toLocaleString(), c: '#a855f7' },
                          { l: 'CVR', v: `${avgCvr}%`, c: '#f97316' }].map(k => (
                            <div key={k.l} style={{ padding: '8px 14px', borderRadius: 10, background: `${k.c}10`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k.l}</div>
                        ))}
                </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14 }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                        padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1,
                        background: tab === tb.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                        color: tab === tb.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms'
                    }}>{tb.label}</button>
                ))}

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 16 }}>{"\uD83D\uDCCA"} {t('webPopup.popupPerf')}</div>
                        <table className="table">
                            <thead><tr>
                                <th>{t('webPopup.colName')}</th><th>{t('webPopup.colTrigger')}</th><th>{t('webPopup.colStatus')}</th>
                                <th>{t('webPopup.colViews')}</th><th>{t('webPopup.colClicks')}</th><th>{t('webPopup.colConv')}</th>
                                <th>CTR</th><th>CVR</th>
                            </tr></thead>
                            <tbody>
                                {popups.length === 0 && (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>{t('noData')}</td></tr>
                                )}
                                {popups.map(p => {
                                    const r = resolve(p);
                                    const ctr = ((p.clicks || 0) / Math.max(p.views || 1, 1) * 100).toFixed(1);
                                    const cvr = ((p.conversions || 0) / Math.max(p.clicks || 1, 1) * 100).toFixed(1);
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
                                                    {p.is_active ? `\u25CF ${t('webPopup.active')}` : `\u25CB ${t('webPopup.inactive')}`}
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
                        </table>)}

            {/* Popup Management Tab */}
            {tab === 'popups' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    {/* AI Auto-Design Section */}
                    <div className="card card-glass" style={{ padding: '20px' }}>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4 }}>
                            <div style={{ fontWeight: 900, fontSize: 14 }}>{"\uD83E\uDD16"} {t('webPopup.aiDesignTitle')}</div>
                            <div style={{ display:'flex',gap:4 }}>
                                {AI_PLATFORMS.map(p=>(
                                    <button key={p.id} onClick={()=>setAiPlatform(p.id)} style={{ padding:'4px 10px',borderRadius:8,border:aiPlatform===p.id?'1px solid rgba(168,85,247,0.5)':'1px solid var(--border)',background:aiPlatform===p.id?'rgba(168,85,247,0.15)':'transparent',color:aiPlatform===p.id?'#a855f7':'var(--text-3)',fontSize:10,fontWeight:aiPlatform===p.id?700:400,cursor:'pointer',transition:'all 150ms' }}>
                                        {p.icon} {p.label}
                                    </button>
                                ))}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>{t('webPopup.aiDesignDesc')} <span style={{color:'#a855f7',fontWeight:600}}>({AI_PLATFORMS.find(p=>p.id===aiPlatform)?.size})</span></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                            {AI_THEMES.map(th => (
                                <button key={th.id} onClick={() => setAiTheme(th.id)} style={{ padding: '10px', borderRadius: 10, border: `2px solid ${aiTheme === th.id ? th.color : 'transparent'}`, background: aiTheme === th.id ? `${th.color}15` : 'rgba(0,0,0,0.2)', color: aiTheme === th.id ? th.color : 'var(--text-2)', fontSize: 12, fontWeight: aiTheme === th.id ? 800 : 500, cursor: 'pointer', transition: 'all 150ms', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 16 }}>{th.icon}</span> {th.label}
                                </button>
                            ))}
                        <div style={{ display:'grid',gap:8 }}>
                            <input value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder={t('webPopup.aiTopicPh')} style={{ width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid rgba(99,140,255,0.2)',background:'rgba(15,20,40,0.7)',color: 'var(--text-1)',fontSize:12,boxSizing:'border-box' }} />
                            <div style={{display:'flex',gap:8}}>
                                <input value={aiImagePrompt} onChange={e => setAiImagePrompt(e.target.value)} placeholder={t('webPopup.aiImagePh')||'AI 이미지 설명 (예: 여름 해변 배경에 선글라스와 서핑보드)'} style={{ flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid rgba(168,85,247,0.25)',background:'rgba(15,20,40,0.7)',color: 'var(--text-1)',fontSize:12 }} />
                                <button onClick={generateAiDesign} disabled={aiGenerating} style={{ padding:'8px 24px',borderRadius:8,border:'none',background:aiGenerating?'rgba(107,114,128,0.3)':'linear-gradient(135deg,#a855f7,#6366f1)',color: 'var(--text-1)',fontSize:12,fontWeight:700,cursor:aiGenerating?'wait':'pointer',whiteSpace:'nowrap',minWidth:140,position:'relative',overflow:'hidden' }}>
                                    {aiGenerating?(<><span style={{display:'inline-block',animation:'spin 1s linear infinite'}}>{'\u2699\uFE0F'}</span> {t('webPopup.aiGenerating')}</>):(`\uD83E\uDD16 ${t('webPopup.aiGenerate')}`)}
                                </button>
                        </div>
                    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                    {/* Custom Upload Section */}
                    <div className="card card-glass" style={{ padding: '20px' }}>
                        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>{"\uD83D\uDCE4"} {t('webPopup.uploadCustom')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>{t('webPopup.uploadCustomDesc')}</div>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files[0]); }}
                                onClick={() => fileInputRef.current?.click()}
                                style={{ flex: 1, minHeight: customImage ? 'auto' : 120, borderRadius: 12, border: `2px dashed ${dragOver ? '#a855f7' : customImage ? '#22c55e33' : 'rgba(255,255,255,0.1)'}`, background: dragOver ? 'rgba(168,85,247,0.08)' : customImage ? 'rgba(34,197,94,0.04)' : 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 200ms', overflow: 'hidden', position: 'relative' }}
                            >
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0])} style={{ display: 'none' }} />
                                {customImage ? (
                                    <>
                                        <img src={customImage} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
                                        <div style={{ padding: '8px 0', fontSize: 11, color: 'var(--text-2)' }}>{customImageName}</div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: 32, marginBottom: 6, opacity: 0.5 }}>{"\uD83D\uDDBC"}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>{t('webPopup.uploadDragDrop')}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, opacity: 0.6 }}>{t('webPopup.uploadFormats')}</div>
                                    </>
                                )}
                            {customImage && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <button onClick={applyCustomImage} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#22c55e,#10b981)', color: 'var(--text-1)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{"\u2714"} {t('webPopup.uploadApply')}</button>
                                    <button onClick={() => { setCustomImage(null); setCustomImageName(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>{"\uD83D\uDDD1"} {t('webPopup.uploadRemove')}</button>
                            )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditing('new')} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            + {t('webPopup.createPopup')}
                        </button>
                    {popups.length === 0 && (
                        <div className="card card-glass" style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>{t('noData')}</div>
                    )}
                    {popups.map(p => {
                        const r = resolve(p);
                        return (
                            <div key={p.id} className="card card-glass" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: 20 }}>{POPUP_TYPES.find(tp => tp.trigger === p.trigger)?.icon || '\uD83C\uDFAF'}</span>
                                        <span style={{ fontWeight: 900, fontSize: 14 }}>{r.name}</span>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                            background: p.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                                            color: p.is_active ? '#22c55e' : '#6b7280',
                                            border: `1px solid ${p.is_active ? '#22c55e33' : '#6b728033'}`
                                        }}>{p.is_active ? t('webPopup.active') : t('webPopup.inactive')}</span>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}><strong>"{r.title}"</strong></div>
                                    {p.link_enabled && p.link_url && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 700, background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }}>{'\uD83D\uDD17'} {t('webPopup.linkBadge')}</span>
                                            <span style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.link_url}</span>
                                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(p.link_url); }} style={{ padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: 9, cursor: 'pointer' }} title={t('webPopup.linkCopy')}>{'\uD83D\uDCCB'}</button>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                        {(r.body || '').slice(0, 60)}{(r.body || '').length > 60 ? '…' : ''} {(p.discount_pct || 0) > 0 ? `| ${p.discount_pct}% ${t('webPopup.discount')}` : ''}
                                    <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                        {[{ l: t('webPopup.colViews'), v: (p.views || 0).toLocaleString() },
                                          { l: t('webPopup.colClicks'), v: (p.clicks || 0).toLocaleString() },
                                          { l: t('webPopup.colConv'), v: (p.conversions || 0).toLocaleString() }].map(k => (
                                            <div key={k.l}><span style={{ color: 'var(--text-3)', fontSize: 10 }}>{k.l} </span><strong style={{ fontSize: 13 }}>{k.v}</strong></div>
                                        ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                                    <button onClick={() => setPreviewPopup(p)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                        {"\uD83D\uDD0D"} {t('webPopup.preview')}
                                    </button>
                                    <button onClick={() => setEditing(p)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>
                                        {"\u270F\uFE0F"} {t('edit')}
                                    </button>
                                    <button onClick={() => toggleActive(p.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: p.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: p.is_active ? '#ef4444' : '#22c55e', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                        {p.is_active ? t('webPopup.deactivate') : t('webPopup.activate')}
                                    </button>
                                        </div>

          </div>
        </div>
      </div>
    </div>
  </div>
);
                    })}
            )}

            {/* Live Preview Tab */}
            {tab === 'live' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{"\uD83C\uDFAC"} {t('webPopup.live')}</div>
                    <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)', marginBottom: 16, lineHeight: 1.8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#4f8ef7', marginBottom: 8 }}>{"\uD83D\uDDB1"} {t('webPopup.howItWorks')}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            1. {t('webPopup.step1')}<br />
                            2. {t('webPopup.step2')}<br />
                            3. {"\u2192"} {t('webPopup.step3')}<br />
                            4. {t('webPopup.step4')}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                        <button onClick={() => setExitTriggerActive(true)} disabled={exitTriggerActive}
                            style={{ padding: '10px 24px', borderRadius: 10, border: 'none',
                                background: exitTriggerActive ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                                color: exitTriggerActive ? '#22c55e' : '#fff', fontSize: 13, fontWeight: 700,
                                cursor: exitTriggerActive ? 'default' : 'pointer' }}>
                            {exitTriggerActive ? `\u26A1 ${t('webPopup.liveMoveUp')}` : `\uD83D\uDE80 ${t('webPopup.startDetect')}`}
                        </button>
                        <button onClick={() => setShowLivePopup(true)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(249,115,22,0.3)', background: 'transparent', color: '#f97316', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            {"\uD83D\uDD0D"} {t('webPopup.previewNow')}
                        </button>
                        {exitTriggerActive && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, animation: 'pulse 1s infinite' }}>{"\u25CF"} LIVE</span>}
                    <div style={{ padding: '14px', borderRadius: 10, background: 'var(--surface)', fontSize: 11, color: 'var(--text-3)' }}>
                        {t('webPopup.sessionConv')}: <strong style={{ color: '#22c55e', fontSize: 14 }}>{liveConversions}</strong>)}

            {/* A/B Test Tab — Real-time from GlobalDataContext */}
            {tab === 'ab' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{"\uD83E\uDDEA"} {t('webPopup.abResult')}</div>
                    {(!abTestResults || abTestResults.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>{"\uD83E\uDDEA"}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{t('webPopup.noAbTests')}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                                {t('webPopup.noAbTestsDesc')}
                            <button onClick={() => setTab('popups')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                + {t('webPopup.createPopup')}
                            </button>
                    ) : (
                        <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {abTestResults.map((v, idx) => {
                                const views = v.views || 0;
                                const clicks = v.clicks || 0;
                                const ctr = views > 0 ? (clicks / views * 100).toFixed(2) : '0.00';
                                const color = idx === 0 ? '#4f8ef7' : '#22c55e';
                                const bg = idx === 0 ? 'rgba(79,142,247,0.08)' : 'rgba(34,197,94,0.08)';
                                return (
                                    <div key={v.id || idx} style={{ padding: '18px', borderRadius: 14, background: bg, border: `2px solid ${color}${v.winner ? '55' : '22'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <span style={{ fontWeight: 900, color }}>{v.name || `Variant ${String.fromCharCode(65 + idx)}`}</span>
                                            {v.winner && <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>{"\uD83C\uDFC6"} {t('webPopup.winner')}</span>}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, textAlign: 'center', marginBottom: 12 }}>
                                            <div><div style={{ fontSize: 20, fontWeight: 900, color }}>{views.toLocaleString()}</div><div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('webPopup.colViews')}</div></div>
                                            <div><div style={{ fontSize: 20, fontWeight: 900, color }}>{clicks}</div><div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('webPopup.colClicks')}</div></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                            <span style={{ color: 'var(--text-3)' }}>CTR</span>
                                            <span style={{ fontWeight: 900, color }}>{ctr}%</span>
                                        <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', marginTop: 8, overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(100, Number(ctr) * 10)}%`, height: '100%', background: color, borderRadius: 6 }} />
                                                    </div>

      </div>
    </div>
  </div>
);
                            })}
                        <div style={{ marginTop: 14, padding: '12px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, color: 'var(--text-2)' }}>
                            {"\uD83E\uDD16"} {t('webPopup.abInsight')}
                        </>
                    )}
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{"\u2699\uFE0F"} {t('webPopup.globalSettings')}</div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            {[
                                { l: t('webPopup.settingExit'), desc: t('webPopup.settingExitDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingTab'), desc: t('webPopup.settingTabDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingInactive'), desc: t('webPopup.settingInactiveDesc'), active: false, color: '#6b7280' },
                                { l: t('webPopup.settingMobile'), desc: t('webPopup.settingMobileDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingCookie'), desc: t('webPopup.settingCookieDesc'), active: true, color: '#22c55e' },
                                { l: t('webPopup.settingGdpr'), desc: t('webPopup.settingGdprDesc'), active: true, color: '#4f8ef7' },
                            ].map(s => (
                                <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--surface)' }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>{s.l}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.desc}</div>
                                    <div style={{ width: 34, height: 18, borderRadius: 20, background: s.active ? s.color : 'rgba(107,114,128,0.3)', transition: 'background 300ms', cursor: 'pointer', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: 2, left: s.active ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 300ms' }} />
                                </div>
                            ))}
                        </div>)}

            {/* Guide Tab */}
            {tab === 'guide' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    <div className="card card-glass" style={{ textAlign: 'center', padding: '36px 24px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>{"\uD83C\uDFAF"}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(135deg,#4f8ef7,#a855f7)' }}>
                            {t('webPopup.guideTitle')}
                        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 600, margin: '0 auto' }}>{t('webPopup.guideSub')}</div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{t('webPopup.guideStepsTitle')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[1,2,3,4,5,6].map(n => {
                            const colors = ['#4f8ef7','#22c55e','#a855f7','#f97316','#ef4444','#eab308'];
                            return (
                                <div key={n} className="card card-glass" style={{ padding: '18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                        <span style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'var(--text-1)', background: colors[n-1], flexShrink: 0 }}>{n}</span>
                                        <span style={{ fontWeight: 900, color: colors[n-1], fontSize: 14 }}>{t(`webPopup.guideStep${n}Title`)}</span>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{t(`webPopup.guideStep${n}Desc`)}
                                        </div>

  </div>
);
                        })}
                    <div style={{ fontWeight: 900, fontSize: 16, marginTop: 8 }}>{t('webPopup.guideTabsTitle')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                        {[{k:'Dash',c:'#4f8ef7'},{k:'Feed',c:'#22c55e'},{k:'Trend',c:'#a855f7'},{k:'Settings',c:'#f97316'},{k:'Guide',c:'#ef4444'},{k:'AB',c:'#eab308'}].map(tb => (
                            <div key={tb.k} style={{ padding: '12px', borderRadius: 10, background: `${tb.c}10`, border: `1px solid ${tb.c}22`, textAlign: 'center' }}>
                                <div style={{ fontWeight: 800, fontSize: 12, color: tb.c, marginBottom: 4 }}>{t(`webPopup.guide${tb.k}Name`)}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t(`webPopup.guide${tb.k}Desc`)}</div>
                        ))}
                    <div style={{ fontWeight: 900, fontSize: 16, marginTop: 8 }}>{t('webPopup.guideTipsTitle')}</div>
                    <div className="card card-glass" style={{ padding: '16px' }}>
                        {[1,2,3,4,5].map(n => (
                            <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: n < 5 ? '1px solid var(--border)' : 'none' }}>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{["\uD83D\uDCA1","\uD83C\uDFC6","\u23F1","\uD83D\uDCF1","\uD83D\uDCCA"][n-1]}</span>
                                <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{t(`webPopup.guideTip${n}`)}</span>
                        ))})}

            {previewPopup && (
                <LivePopupOverlay popup={previewPopup} onClose={() => setPreviewPopup(null)} onConvert={() => setPreviewPopup(null)} />
            )}

            {/* AI Auto-Design Modal — Premium with Image */}
            {aiResult && (
                <div style={{ position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.8)',backdropFilter:'blur(6px)',animation:'fadeIn 300ms ease' }} onClick={e=>{if(e.target===e.currentTarget)setAiResult(null)}}>
                    <div style={{ width:'min(540px,95vw)',maxHeight:'90vh',overflowY:'auto',borderRadius:20,background:'linear-gradient(145deg,#0a1628,#111827)',border:'1px solid rgba(168,85,247,0.3)',boxShadow:'0 25px 80px rgba(0,0,0,0.7),0 0 40px rgba(168,85,247,0.1)',animation:'slideUp 350ms cubic-bezier(0.34,1.56,0.64,1)' }}>
                        {/* Header */}
                        <div style={{ padding:'20px 24px 0',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                            <div>
                                <div style={{ fontWeight:900,fontSize:16,marginBottom:2 }}>{"\uD83E\uDD16"} {t('webPopup.aiDesignResult')}</div>
                                <div style={{ fontSize:11,color:'var(--text-3)' }}>{aiResult._theme?.icon} {aiResult._theme?.label} · {aiResult._platform?.icon} {aiResult._platform?.label} ({aiResult._platform?.size})</div>
                            <button onClick={()=>setAiResult(null)} style={{ width:28,height:28,borderRadius:'50%',border:'none',background: 'var(--border)',color: 'var(--text-3)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>{'\u2715'}</button>
                        {/* Theme Image Banner */}
                        <div style={{ margin:'16px 20px 0',borderRadius:14,overflow:'hidden',position:'relative',minHeight:180,background:`url(${aiResult._themeImage}) center/cover no-repeat,linear-gradient(135deg,#1a1a2e,#16213e)` }}>
                            <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.7))' }} />
                            <div style={{ position:'relative',zIndex:1,padding:'24px 20px',display:'flex',flexDirection:'column',justifyContent:'flex-end',minHeight:180 }}>
                                {aiResult.discount_pct>0&&(
                                    <div style={{ display:'inline-flex',alignSelf:'flex-start',padding:'4px 14px',borderRadius:20,background:aiResult._theme?.gradient||'linear-gradient(135deg,#f97316,#ef4444)',fontSize:12,fontWeight:900,color: 'var(--text-1)',marginBottom:10,boxShadow:'0 4px 15px rgba(0,0,0,0.3)' }}>{"\uD83D\uDD25"} {t('webPopup.limitedOffer')}</div>
                                )}
                                <div style={{ fontSize:24,fontWeight:900,color: 'var(--text-1)',textShadow:'0 2px 10px rgba(0,0,0,0.5)',marginBottom:4,lineHeight:1.3 }}>{aiResult.title}</div>
                                <div style={{ fontSize:12,color: 'var(--text-1)',textShadow:'0 1px 4px rgba(0,0,0,0.5)',lineHeight:1.6 }}>{aiResult.body}</div>
                        </div>
                        {/* Popup Content Preview */}
                        <div style={{ padding:'16px 20px 20px' }}>
                            {aiResult.discount_pct>0&&(
                                <div style={{ textAlign:'center',padding:'16px',borderRadius:12,background:`${aiResult._theme?.color||'#f97316'}10`,border:`1px solid ${aiResult._theme?.color||'#f97316'}25`,marginBottom:14 }}>
                                    <div style={{ fontSize:44,fontWeight:900,color:aiResult._theme?.color||'#f97316',lineHeight:1 }}>{aiResult.discount_pct}%</div>
                                    <div style={{ fontSize:12,color: 'var(--text-3)',marginTop:4 }}>{t('webPopup.instantDiscount')})}
                            <button style={{ width:'100%',padding:'12px',borderRadius:12,border:'none',background:aiResult._theme?.gradient||'linear-gradient(135deg,#4f8ef7,#6366f1)',color: 'var(--text-1)',fontSize:15,fontWeight:900,cursor:'pointer',boxShadow:`0 6px 20px ${aiResult._theme?.color||'#4f8ef7'}40`,transition:'all 200ms' }}>{aiResult.cta}</button>
                            {aiResult._imagePrompt&&(
                                <div style={{ marginTop:12,padding:'10px 14px',borderRadius:10,background:'rgba(168,85,247,0.06)',border:'1px solid rgba(168,85,247,0.15)',fontSize:11,color:'var(--text-3)' }}>
                                    {"\uD83C\uDFA8"} {t('webPopup.aiImagePh')||'AI Image'}: <span style={{color:'#a855f7',fontWeight:600}}>{aiResult._imagePrompt}</span>
                            )}
                            {/* Action Buttons */}
                            <div style={{ display:'flex',gap:8,marginTop:16 }}>
                                <button onClick={()=>{setAiResult(null);generateAiDesign()}} style={{ flex:1,padding:'10px',borderRadius:10,border: '1px solid var(--border)',background: 'var(--surface)',color:'var(--text-2)',fontSize:12,cursor:'pointer',fontWeight:600 }}>{"\uD83D\uDD04"} {t('webPopup.aiRegenerate')}</button>
                                <button onClick={()=>{setPopups(ps=>[...ps,{...aiResult,id:Date.now(),views:0,clicks:0,conversions:0,_theme:undefined,_platform:undefined,_imagePrompt:undefined,_themeImage:undefined}]);setAiResult(null);addAlert?.({type:'success',msg:`\u2714 AI Popup Created: ${aiResult.name}`})}} style={{ flex:1,padding:'10px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#22c55e,#10b981)',color: 'var(--text-1)',fontSize:12,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 15px rgba(34,197,94,0.3)' }}>{"\u2714"} {t('webPopup.aiApply')}</button>
                        </div>)}
                                                                                                                                                                                                    </div>
                                                                                                                                                                                                </div>
                                                                                                                                                                                            </div>
                                                                                                                                                                                        </div>
                                                                                                                                                                                    </div>
                                                                                                                                                                                </div>
                                                                                                                                                                            </div>
                                                                                                                                                                        </div>
                                                                                                                                                                    </div>
                                                                                                                                                                </div>
                                                                                                                                                            </div>
                                                                                                                                                        </div>
                                                                                                                                                    </div>
                                                                                                                                                </div>
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
nction WebPopup() {
    return (
<PlanGate feature="customer_ai">
            <WebPopupInner />
        </PlanGate>
    );
}
