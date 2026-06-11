import React, { useState, useEffect, useCallback } from "react";
import PlanGate from "../components/PlanGate.jsx";

import { useI18n } from '../i18n';
import { IS_DEMO } from '../utils/demoEnv.js';
const API = import.meta.env.VITE_API_BASE || '';
const apiFetch = async (path, opts = {}) => {
    const token = localStorage.getItem('genie_token') || "";
    const r = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) } });
    return r.json().catch(() => ({}));
};

const Tag = ({ label, color = '#4f8ef7' }) => (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}33`, fontWeight: 700 }}>{label}</span>
);

const STATUS_COLOR = { connected: '#22c55e', ok: '#22c55e', demo: '#4f8ef7', error: '#ef4444', untested: '#eab308' };

/* 184차 #3 — 데모 가상 시드(빈상태 방지). 운영(IS_DEMO=false)은 실 WhatsApp Business API 데이터만 사용. */
const DEMO_WA_TEMPLATES = [
    { name: 'order_confirmation', status: 'APPROVED', category: 'UTILITY',   language: 'ko', components: [{ type: 'BODY', text: '[{{1}}] 주문이 정상 접수되었습니다. 주문번호: {{2}}. 빠르게 준비해 발송해 드리겠습니다.' }] },
    { name: 'shipping_started',   status: 'APPROVED', category: 'UTILITY',   language: 'ko', components: [{ type: 'BODY', text: '주문하신 상품이 발송되었습니다. 송장번호 {{1}} 로 배송 조회가 가능합니다.' }] },
    { name: 'delivery_completed', status: 'APPROVED', category: 'UTILITY',   language: 'ko', components: [{ type: 'BODY', text: '상품이 안전하게 배송 완료되었습니다. 만족스러우셨다면 리뷰를 남겨주세요!' }] },
    { name: 'cart_reminder',      status: 'APPROVED', category: 'MARKETING', language: 'ko', components: [{ type: 'BODY', text: '장바구니에 담아두신 상품이 기다리고 있어요. 지금 주문하시면 무료배송 혜택을 드립니다.' }] },
    { name: 'restock_alert',      status: 'APPROVED', category: 'MARKETING', language: 'ko', components: [{ type: 'BODY', text: '품절되었던 {{1}} 상품이 재입고되었습니다. 인기 상품이니 서둘러 확인해 보세요.' }] },
    { name: 'vip_coupon',         status: 'PENDING',  category: 'MARKETING', language: 'ko', components: [{ type: 'BODY', text: 'VIP 고객님께 드리는 단독 15% 할인 쿠폰이 발급되었습니다. 유효기간: {{1}}.' }] },
];
const DEMO_WA_MESSAGES = [
    { recipient: '+821012345678', template_name: 'order_confirmation', status: 'read',      sent_at: '2026-05-31T14:22:00' },
    { recipient: '+821087654321', template_name: 'shipping_started',   status: 'delivered', sent_at: '2026-05-31T11:05:00' },
    { recipient: '+821055559999', template_name: 'cart_reminder',      status: 'read',      sent_at: '2026-05-30T18:40:00' },
    { recipient: '+821033334444', template_name: 'delivery_completed', status: 'delivered', sent_at: '2026-05-30T09:15:00' },
    { recipient: '+821022221111', template_name: 'restock_alert',      status: 'sent',      sent_at: '2026-05-29T20:02:00' },
    { recipient: '+821077778888', template_name: 'cart_reminder',      status: 'failed',    sent_at: '2026-05-29T16:30:00' },
];
const DEMO_WA_STATS = { sent: 1240, delivered: 1198, read: 1056, failed: 12 };

/* Auth Panel */
function AuthPanel({ onSaved }) {
    const { t } = useI18n(); // 크래시 수정: t 범위밖 ReferenceError 해소
    const [form, setForm] = useState({ phone_number_id: '', access_token: '', business_id: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSave = async () => {
        setLoading(true); setResult(null);
        const data = await apiFetch('/api/whatsapp/settings', { method: 'POST', body: JSON.stringify(form) });
        setResult(data);
        if (data.ok && onSaved) onSaved();
        setLoading(false);
    };

    return (
        <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(0,180,0,0.04)', border: '1px solid rgba(0,180,0,0.15)' }}>
            <div style={{ fontWeight: 900, fontSize: 12, color: '#25D366', marginBottom: 12 }}>🔑 {t('wa.authInfo','WhatsApp Business API Auth Info')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 12 }}>
                {[
                    { k: 'phone_number_id', l: t('wa.fieldPhoneId','Phone Number ID'), ph: '123456789012345' },
                    { k: 'access_token', l: t('wa.fieldAccessToken','Permanent Access Token'), ph: 'EAA...', secret: true },
                    { k: 'business_id', l: t('wa.fieldBusinessId','Business Account ID (Select)'), ph: '987654321' },
                ].map(f => (
                    <div key={f.k}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.l}</div>
                        <input type={f.secret ? 'password' : 'text'} placeholder={f.ph} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(37,211,102,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSave} disabled={loading}
                    style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? ('⏳ ' + t('wa.connecting','Connecting…')) : ('💾 ' + t('wa.saveConnect','Save + Test Connection'))}
                </button>
            </div>
            {result && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? '#22c55e' : '#ef4444'}33`, color: result.ok ? '#22c55e' : '#ef4444' }}>
                    {result.ok ? `✓ ${result.message || t('wa.connectSuccess','Connect Success')}` : `✗ ${result.message || result.error}`}
                </div>
            )}
        </div>
    );
}

/* Send Panel */
function SendPanel({ templates, onSent }) {
    const { t } = useI18n(); // 크래시 수정: t 범위밖 ReferenceError 해소
    const [form, setForm] = useState({ to: '', template: '', body: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSend = async () => {
        setLoading(true); setResult(null);
        const data = await apiFetch('/api/whatsapp/send', { method: 'POST', body: JSON.stringify(form) });
        setResult(data);
        setLoading(false);
        // [현차수] 발송 직후 이력/통계 동기화(History·Overview stale 해소)
        if (data.ok && onSent) onSent();
    };

    return (
        <div className="card card-glass">
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('wa.tabSend','📤 Send')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('wa.sendTo','Recipient Number')}</div>
                    <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} placeholder="821012345678"
                        className="input" />
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('wa.selectTemplate','Select Template')}</div>
                    <select value={form.template} onChange={e => setForm(p => ({ ...p, template: e.target.value }))} className="input">
                        <option value="">{t('wa.directInput','Direct Input')}</option>
                        {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                </div>
            </div>
            {!form.template && (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('wa.messageContent','Message Content')}</div>
                    <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder={t('wa.messagePlaceholder','Enter your message...')}
                        rows={3} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
            )}
            <button onClick={handleSend} disabled={loading}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? ('⏳ ' + t('wa.sending','Sending…')) : ('📤 ' + t('wa.send','Send'))}
            </button>
            {result && (
                <div style={{ marginTop: 10, padding: '8px', borderRadius: 8, fontSize: 12, color: result.ok ? '#22c55e' : '#ef4444', background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                    {result.ok ? `✓ ${t('wa.sendDoneId','Send Done (ID: {{id}})').replace('{{id}}', result.wa_message_id)}` : `✗ ${result.error || t('wa.sendFailed','Send Failed')}`}
                </div>
            )}
        </div>
    );
}

/* Broadcast Panel */
function BroadcastPanel({ templates, onSent }) {
    const { t } = useI18n(); // 크래시 수정: t 범위밖 ReferenceError 해소
    const [numbers, setNumbers] = useState('');
    const [template, setTemplate] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleBroadcast = async () => {
        setLoading(true); setResult(null);
        const ns = numbers.split('\n').map(n => n.trim()).filter(Boolean);
        const data = await apiFetch('/api/whatsapp/broadcast', { method: 'POST', body: JSON.stringify({ numbers: ns, template }) });
        setResult(data);
        setLoading(false);
        // [현차수] 일괄발송 직후 이력/통계 동기화(History·Overview stale 해소)
        if (data.ok && onSent) onSent();
    };

    return (
        <div className="card card-glass">
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('wa.broadcast','📡 Broadcast')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('wa.numberList','Number List (newline separated, max 200)')}</div>
                    <textarea value={numbers} onChange={e => setNumbers(e.target.value)} placeholder={'821012345678\n821087654321\n...'} rows={8}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 11, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{numbers.split('\n').filter(Boolean).length} {t('wa.numberCount','numbers')}</div>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('wa.template','Template')}</div>
                    <select value={template} onChange={e => setTemplate(e.target.value)} className="input" style={{ marginBottom: 10 }}>
                        <option value="">{t('wa.selectPlaceholder','Select…')}</option>
                        {templates.map(tpl => <option key={tpl.name} value={tpl.name}>{tpl.name}</option>)}
                    </select>
                    {template && templates.find(t => t.name === template) && (
                        <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', fontSize: 11, color: 'var(--text-2)' }}>
                            {templates.find(t => t.name === template)?.components?.[0]?.text || t('wa.templateContent','Template Content')}
                        </div>
                    )}
                    <button onClick={handleBroadcast} disabled={loading || !template || !numbers.trim()}
                        style={{ marginTop: 14, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {loading ? ('⏳ ' + t('wa.sending','Sending…')) : ('📡 ' + t('wa.broadcastStart','Start Broadcast'))}
                    </button>
                    {result && (
                        <div style={{ marginTop: 10, padding: '10px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                            ✓ {t('wa.broadcastResult','Done: Success {{sent}} · Failed {{failed}}').replace('{{sent}}', result.sent).replace('{{failed}}', result.failed)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function WhatsApp() {
  const { t } = useI18n();
    const TABS = [
      { id: 'overview', label: t('wa.tabOverview', '📊 Overview') },
      { id: 'send', label: t('wa.tabSend', '📤 Send') },
      { id: 'broadcast', label: t('wa.tabBroadcast', '📡 Broadcast') },
      { id: 'templates', label: t('wa.tabTemplates', '📋 Templates') },
      { id: 'history', label: t('wa.tabHistory', '📜 History') },
      { id: 'settings', label: t('wa.tabSettings', '⚙️ Auth Settings') },
    ];
    const [tab, setTab] = useState('overview');
    const [settings, setSettings] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [s, t, m] = await Promise.all([
            apiFetch('/api/whatsapp/settings'),
            apiFetch('/api/whatsapp/templates'),
            apiFetch('/api/whatsapp/messages?limit=30'),
        ]);
        setSettings(s);
        setTemplates((t.templates && t.templates.length) ? t.templates : (IS_DEMO ? DEMO_WA_TEMPLATES : []));
        setMessages((m.messages && m.messages.length) ? m.messages : (IS_DEMO ? DEMO_WA_MESSAGES : []));
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const cfg = settings?.settings || {};
    const stats = settings?.stats || (IS_DEMO ? DEMO_WA_STATS : { sent: 0, delivered: 0, read: 0, failed: 0 });
    const plan = settings?.plan || '';
    const status = cfg.test_status || 'not_configured';
    const statusColor = STATUS_COLOR[status] || '#666';

    return (
        <PlanGate feature="whatsapp">
        <div style={{ display: 'grid', gap: 18, padding: 4 }}>
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 32 }}>💬</span>
                            <span className="hero-title" style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                                WhatsApp Business
                            </span>
                        </div>
                        <div className="hero-desc">{t('wa.heroDesc', 'Instant integration · Template messaging · Broadcast · Send history')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <Tag label={status === 'connected' || status === 'ok' ? ('✓ ' + t('wa.connected','Connected')) : status === '' ? '🎮 ' : t('wa.notConnected','Not Connected')} color={statusColor} />
                            {plan === 'pro' ? <Tag label={'⚡ ' + t('wa.proIntegration','Pro Live Integration')} color="#a855f7" /> : <Tag label={'🎮 ' + t('wa.demoMode','Demo Mode')} color="#4f8ef7" />}
                            <Tag label={t('wa.sendCount','Sent {{count}}').replace('{{count}}', (stats.sent || 0).toLocaleString())} color="#25D366" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {/* 206차: 통계 폴백 IS_DEMO 게이트 — 운영(미연동)은 0(목데이터 유입 차단), 데모만 시드 */}
                        {[{ l: t('wa.kpiSend','Send'), v: stats.sent || (IS_DEMO ? 142 : 0), c: '#25D366' }, { l: t('wa.kpiDelivered','Delivered'), v: stats.delivered || (IS_DEMO ? 138 : 0), c: '#4f8ef7' }, { l: t('wa.kpiRead','Read'), v: stats.read || (IS_DEMO ? 95 : 0), c: '#a855f7' }, { l: t('wa.kpiFailed','Failed'), v: stats.failed || (IS_DEMO ? 4 : 0), c: '#ef4444' }].map(k => (
                            <div key={k.l} style={{ padding: '5px 12px', borderRadius: 10, background: `${k.c}10`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: k.c }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'rgba(0,0,0,0.25)', borderRadius: 12, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1, minWidth: 80, background: tab === t.id ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    {(status === 'not_configured' || status === 'untested') && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', fontSize: 12, color: 'var(--text-2)' }}>
                            💡 <strong style={{ color: '#25D366' }}>{t('wa.getStarted','Get Started:')}</strong> {t('wa.getStartedDesc','Enter Phone Number ID and Access Token from Meta Business Suite in Auth Settings.')}
                        </div>
                    )}
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📋 {t('wa.approvedTemplatesTitle','Approved Templates ({{count}})').replace('{{count}}', templates.length)}</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {templates.map(tpl => (
                                <div key={tpl.name} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: '#25D366' }}>{tpl.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{tpl.components?.[0]?.text?.slice(0, 60) || t('wa.templateContent','Template Content')}...</div>
                                    </div>
                                    <Tag label={tpl.category || 'MARKETING'} color="#25D366" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {tab === 'send' && <SendPanel templates={templates} onSent={loadData} />}
            {tab === 'broadcast' && <BroadcastPanel templates={templates} onSent={loadData} />}
            {tab === 'templates' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('wa.messageTemplates','Message Templates')}</div>
                    <table className="table">
                        <thead><tr><th>{t("whatsappPage.name", "이름")}</th><th>{t("whatsappPage.language", "언어")}</th><th>{t("whatsappPage.category", "카테고리")}</th><th>{t('wa.colStatus','Status')}</th><th>{t('wa.contentPreview','Content Preview')}</th></tr></thead>
                        <tbody>
                            {templates.map(t => (
                                <tr key={t.name}>
                                    <td style={{ fontWeight: 700, color: '#25D366' }}>{t.name}</td>
                                    <td>{t.language}</td>
                                    <td><Tag label={t.category} color="#4f8ef7" /></td>
                                    <td><Tag label={t.status} color={t.status === 'APPROVED' ? '#22c55e' : '#eab308'} /></td>
                                    <td style={{ fontSize: 11, color: 'var(--text-3)', maxWidth: 300 }}>{t.components?.[0]?.text || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {tab === 'history' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('wa.sendHistory','Send History')}</div>
                    <table className="table">
                        <thead><tr><th>{t('wa.recipientNo','Recipient')}</th><th>{t('wa.colTemplate','Template')}</th><th>{t('wa.colStatus','Status')}</th><th>{t('wa.sendTime','Sent At')}</th></tr></thead>
                        <tbody>
                            {messages.map((m, i) => {
                                const sc = { sent: '#4f8ef7', delivered: '#22c55e', read: '#a855f7', failed: '#ef4444' }[m.status] || '#666';
                                return (
                                    <tr key={i}>
                                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.recipient}</td>
                                        <td style={{ fontSize: 11, color: '#25D366' }}>{m.template_name || '—'}</td>
                                        <td><Tag label={m.status} color={sc} /></td>
                                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.sent_at?.slice(0, 16) || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {tab === 'settings' && <AuthPanel onSaved={loadData} />}
        </div>
        </PlanGate>
    );
}
