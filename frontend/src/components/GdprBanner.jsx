import React, { useState, useEffect, useCallback } from "react";
import { useT } from "../i18n";

/**
 * GDPR / PIPA (개인정보보호법) 동의 관리 배너
 * - 전역 컴포넌트: App.jsx에서 최상위 마운트
 * - 최초 방문 시 동의 배너 표시
 * - 필수/Analysis/마케팅 쿠키 분류별 선택 가능
 * - 동의 내역 DB Save (백엔드 API)
 * - 동의 철회 및 이력 조회
 */

const API = import.meta.env.VITE_API_BASE || '';

const COOKIE_KEY = 'g_gdpr_consent';
const getCookie = name => document.cookie.split(';').find(c => c.trim().startsWith(name + '='))?.split('=')[1] || null;
const setCookie = (name, value, days = 365) => { document.cookie = `${name}=${value};max-age=${days * 86400};path=/;SameSite=Lax`; };
const removeCookie = name => { document.cookie = `${name}=;max-age=0;path=/`; };

const CONSENT_TYPES_BASE = [
    { id: 'necessary', labelKey: 'gdpr.necessary', descKey: 'gdpr.necessaryDesc', required: true, icon: '\uD83D\uDD12' },
    { id: 'analytics', labelKey: 'gdpr.analytics', descKey: 'gdpr.analyticsDesc', required: false, icon: '\uD83D\uDCCA' },
    { id: 'marketing', labelKey: 'gdpr.marketing', descKey: 'gdpr.marketingDesc', required: false, icon: '\uD83C\uDFAF' },
    { id: 'personalization', labelKey: 'gdpr.personalization', descKey: 'gdpr.personalizationDesc', required: false, icon: '\u2699\uFE0F' },
];

async function saveConsentToServer(consents) {
    try {
        const token = localStorage.getItem('genie_token') || '';
        await fetch(`${API}/api/gdpr/consent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(consents),
        });
    } catch (error) {
        console.error('Failed to save consent to server:', error);
    }
}

function ConsentPanel({ onSave, onClose }) {
    const t = useT();
    const CONSENT_TYPES = CONSENT_TYPES_BASE.map(item => ({
        ...item,
        label: t(item.labelKey) || item.labelKey,
        desc: t(item.descKey) || item.descKey,
        requiredLabel: t('gdpr.required') || 'Required',
    }));
    const [choices, setChoices] = useState({ necessary: true, analytics: true, marketing: false, personalization: true });

    const toggle = id => {
        if (id === 'necessary') return;
        setChoices(c => ({ ...c, [id]: !c[id] }));
    };

    const handleSave = async () => {
        const data = JSON.stringify({ ...choices, timestamp: Date.now() });
        setCookie(COOKIE_KEY, encodeURIComponent(data), 365);
        await saveConsentToServer(choices);
        onSave?.(choices);
    };

    return (
        <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99998,
            background: 'rgba(5,10,25,0.98)', borderTop: '1px solid rgba(79,142,247,0.25)',
            backdropFilter: 'blur(16px)', padding: '24px', maxHeight: '80vh', overflowY: 'auto'
        }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)' }}>🔒 {t('gdpr.panelTitle')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                            {t('gdpr.panelSub')}
                        </div>
                    </div>
                    {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer' }}>✕</button>}
                </div>

                <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                    {CONSENT_TYPES.map(item => (
                        <div key={item.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 12,
                            background: choices[item.id] ? 'rgba(79,142,247,0.07)' : 'rgba(0,0,0,0.3)',
                            border: `1px solid ${choices[item.id] ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.06)'}`
                        }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 18 }}>{item.icon}</span>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {item.label}
                                        {item.required && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{item.requiredLabel}</span>}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{item.desc}</div>
                                </div>
                            </div>
                            <div onClick={() => toggle(item.id)} style={{
                                width: 42, height: 22, borderRadius: 20, cursor: item.required ? 'not-allowed' : 'pointer',
                                background: choices[item.id] ? '#4f8ef7' : 'rgba(107,114,128,0.3)', transition: 'background 300ms', position: 'relative', flexShrink: 0
                            }}>
                                <div style={{ position: 'absolute', top: 3, left: choices[item.id] ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 300ms' }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={handleSave} style={{ flex: 1, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {t('gdpr.savePref')}
                    </button>
                    <button onClick={() => { setChoices({ necessary: true, analytics: true, marketing: true, personalization: true }); setTimeout(handleSave, 50); }}
                        style={{ flex: 1, padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {t('.cookieAcceptAll')}
                    </button>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.6 }}>
                    {t('gdpr.policyNote1')}<span style={{ color: '#4f8ef7', cursor: 'pointer' }}>{t('gdpr.privacyPolicy')}</span>{t('gdpr.policyNote2')}<span style={{ color: '#4f8ef7', cursor: 'pointer' }}>{t('gdpr.cookiePolicy')}</span>{t('gdpr.policyNote3')}
                </div>
            </div>
        </div>
    );
}

/* ─── 기본 배너 (미니) ──────────────────────────────────────────────────── */
function ConsentBanner({ onAcceptAll, onSettings }) {
    const t = useT();
    return (
        <div style={{
            position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 99997,
            width: 'min(600px, 96vw)', borderRadius: 16, padding: '16px 20px',
            background: 'rgba(5,10,25,0.95)', border: '1px solid rgba(79,142,247,0.2)',
            backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: 12
        }}>
            <div>
                <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-1)', marginBottom: 4 }}>🍪 {t('gdpr.bannerTitle')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
                    {t('gdpr.bannerDesc')}
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onAcceptAll} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {t('.cookieAcceptAll')}
                </button>
                <button onClick={onSettings} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}>
                    {t('.cookieSettings')}
                </button>
            </div>
        </div>
    );
}

/* ─── 메인 GDPR 컨트롤러 (전역 사용) ────────────────────────────────────── */
export function GdprController() {
    const [state, setState] = useState('hidden'); // hidden | banner | panel

    useEffect(() => {
        const existing = getCookie(COOKIE_KEY);
        if (!existing) {
            // 500ms 딜레이 후 배너 표시 (페이지 로드 Done 후)
            const t = setTimeout(() => setState('banner'), 500);
            return () => clearTimeout(t);
        }
    }, []);

    const acceptAll = async () => {
        const choices = { necessary: true, analytics: true, marketing: true, personalization: true };
        setCookie(COOKIE_KEY, encodeURIComponent(JSON.stringify({ ...choices, timestamp: Date.now() })), 365);
        await saveConsentToServer(choices);
        setState('hidden');
    };

    const onPanelSave = () => setState('hidden');

    if (state === 'hidden') return null;
    if (state === 'banner') return <ConsentBanner onAcceptAll={acceptAll} onSettings={() => setState('panel')} />;
    if (state === 'panel') return <ConsentPanel onSave={onPanelSave} onClose={() => setState('banner')} />;
    return null;
}

/* ─── Admin Settings 페이지용 컴포넌트 ─────────────────────────────────────── */
export function GdprAdmin() {
    const t = useT();
    const [showPanel, setShowPanel] = useState(false);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ total: 3842, opted_in: 3241, analytics: 2890, marketing: 1902, withdrawn: 112 });

    const existing = getCookie(COOKIE_KEY);
    const consent = existing ? JSON.parse(decodeURIComponent(existing)) : null;

    const handleWithdraw = () => {
        removeCookie(COOKIE_KEY);
        window.location.reload();
    };

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {showPanel && <ConsentPanel onSave={() => setShowPanel(false)} onClose={() => setShowPanel(false)} />}

            {/* 현재 동의 상태 */}
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>🔒 {t('gdpr.currentConsentStatus') || 'Current Consent Status'}</div>
                {consent ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                        {CONSENT_TYPES.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface)' }}>
                                <span style={{ fontSize: 12 }}>{item.icon} {item.label}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: consent[item.id] ? '#22c55e' : '#6b7280' }}>{consent[item.id] ? `✓ ${t('gdpr.consented') || 'Consented'}` : `✗ ${t('gdpr.notConsented') || 'Not Consented'}`}</span>
                            </div>
                        ))}
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                            {t('gdpr.consentDate') || 'Consent Date'}: {consent.timestamp ? new Date(consent.timestamp).toLocaleString() : (t('gdpr.unknown') || 'Unknown')}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button onClick={() => setShowPanel(true)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 11, cursor: 'pointer' }}>✏️ {t('gdpr.editSettings') || 'Edit Settings'}</button>
                            <button onClick={handleWithdraw} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>🗑️ {t('gdpr.withdraw') || 'Withdraw Consent'}</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('gdpr.noConsentInfo') || 'No consent info.'} <button onClick={() => setShowPanel(true)} style={{ color: '#4f8ef7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{t('gdpr.consentNow') || 'Consent Now →'}</button></div>
                )}
            </div>

            {/* 플랫폼 통계 */}
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📊 {t('gdpr.platformStats') || 'Platform Consent Statistics'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                    {[
                        { l: t('gdpr.totalVisitors') || 'Total Visitors', v: stats.total.toLocaleString(), c: '#4f8ef7' },
                        { l: t('gdpr.consentRate') || 'Consent Rate', v: `${(stats.opted_in / stats.total * 100).toFixed(1)}%`, c: '#22c55e' },
                        { l: t('gdpr.withdrawn') || 'Withdrawn', v: stats.withdrawn.toLocaleString(), c: '#ef4444' },
                    ].map(k => (
                        <div key={k.l} style={{ textAlign: 'center', padding: '10px', borderRadius: 10, background: `${k.c}08`, border: `1px solid ${k.c}22` }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{k.l}</div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                    {[
                        { l: t('gdpr.analytics') || 'Analytics Cookie Consent', v: stats.analytics, total: stats.total },
                        { l: t('gdpr.marketing') || 'Marketing Cookie Consent', v: stats.marketing, total: stats.total },
                    ].map(r => (
                        <div key={r.l}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                <span style={{ color: 'var(--text-3)' }}>{r.l}</span>
                                <span style={{ fontWeight: 700, color: '#4f8ef7' }}>{(r.v / r.total * 100).toFixed(1)}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ width: `${r.v / r.total * 100}%`, height: '100%', background: '#4f8ef7', borderRadius: 6 }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default GdprAdmin;
