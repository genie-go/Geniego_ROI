import React, { useState, useEffect, useCallback } from "react";
import PlanGate from "../components/PlanGate.jsx";

import { useI18n } from '../i18n';
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

/* Auth Panel */
function AuthPanel({ onSaved }) {
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
            <div style={{ fontWeight: 900, fontSize: 12, color: '#25D366', marginBottom: 12 }}>🔑 WhatsApp Business API Auth Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginBottom: 12 }}>
                {[
                    { k: 'phone_number_id', l: 'Phone Number ID', ph: '123456789012345' },
                    { k: 'access_token', l: 'Permanent Access Token', ph: 'EAA...', secret: true },
                    { k: 'business_id', l: 'Business Account ID (Select)', ph: '987654321' },
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
                    {loading ? '⏳ Connect in progress…' : ('💾 ' + t('wa.saveConnect','Save + Test Connection'))}
                </button>
            </div>
            {result && (
                <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? '#22c55e' : '#ef4444'}33`, color: result.ok ? '#22c55e' : '#ef4444' }}>
                    {result.ok ? `✓ ${result.message || 'Connect Success'}` : `✗ ${result.message || result.error}`}
                </div>
            )}
        </div>
    );
}

/* Send Panel */
function SendPanel({ templates }) {
    const [form, setForm] = useState({ to: '', template: '', body: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSend = async () => {
        setLoading(true); setResult(null);
        const data = await apiFetch('/api/whatsapp/send', { method: 'POST', body: JSON.stringify(form) });
        setResult(data);
        setLoading(false);
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
                {loading ? '⏳ Sending…' : '📤 Send'}
            </button>
            {result && (
                <div style={{ marginTop: 10, padding: '8px', borderRadius: 8, fontSize: 12, color: result.ok ? '#22c55e' : '#ef4444', background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                    {result.ok ? `✓ Send Done (ID: ${result.wa_message_id})` : `✗ ${result.error || 'Send Failed'}`}
                </div>
            )}
        </div>
    );
}

/* Broadcast Panel */
function BroadcastPanel({ templates }) {
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
                        <option value="">Select…</option>
                        {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                    {template && templates.find(t => t.name === template) && (
                        <div style={{ padding: '10px', borderRadius: 8, background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', fontSize: 11, color: 'var(--text-2)' }}>
                            {templates.find(t => t.name === template)?.components?.[0]?.text || t('wa.templateContent','Template Content')}
                        </div>
                    )}
                    <button onClick={handleBroadcast} disabled={loading || !template || !numbers.trim()}
                        style={{ marginTop: 14, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {loading ? `⏳ Sending…` : `📡 일괄 Send Start`}
                    </button>
                    {result && (
                        <div style={{ marginTop: 10, padding: '10px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                            ✓ Done: Success {result.sent}건 · Failed {result.failed}건
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
        setTemplates(t.templates || []);
        setMessages(m.messages || []);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const cfg = settings?.settings || {};
    const stats = settings?.stats || { sent: 0, delivered: 0, read: 0, failed: 0 };
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
                            <Tag label={status === 'connected' || status === 'ok' ? '✓ Connected' : status === '' ? '🎮 ' : t('wa.notConnected','Not Connected')} color={statusColor} />
                            {plan === 'pro' ? <Tag label="⚡ Pro 실Integration" color="#a855f7" /> : <Tag label="🎮  Mode" color="#4f8ef7" />}
                            <Tag label={`Send ${(stats.sent || 0).toLocaleString()}건`} color="#25D366" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[{ l: 'Send', v: stats.sent || 142, c: '#25D366' }, { l: 'Count신Confirm', v: stats.delivered || 138, c: '#4f8ef7' }, { l: 'Read', v: stats.read || 95, c: '#a855f7' }, { l: 'Failed', v: stats.failed || 4, c: '#ef4444' }].map(k => (
                            <div key={k.l} style={{ padding: '8px 14px', borderRadius: 10, background: `${k.c}10`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1, minWidth: 80, background: tab === t.id ? 'linear-gradient(135deg,#25D366,#128C7E)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 14 }}>
                    {(status === 'not_configured' || status === 'untested') && (
                        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.2)', fontSize: 12, color: 'var(--text-2)' }}>
                            💡 <strong style={{ color: '#25D366' }}>{t('wa.getStarted','Get Started:')}</strong> {t('wa.getStartedDesc','Enter Phone Number ID and Access Token from Meta Business Suite in Auth Settings.')}
                        </div>
                    )}
                    <div className="card card-glass">
                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📋 Approval된 템플릿 ({templates.length}개)</div>
                        <div style={{ display: 'grid', gap: 8 }}>
                            {templates.map(t => (
                                <div key={t.name} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: '#25D366' }}>{t.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t.components?.[0]?.text?.slice(0, 60) || '템플릿 내용'}...</div>
                                    </div>
                                    <Tag label={t.category || 'MARKETING'} color="#25D366" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {tab === 'send' && <SendPanel templates={templates} />}
            {tab === 'broadcast' && <BroadcastPanel templates={templates} />}
            {tab === 'templates' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('wa.messageTemplates','Message Templates')}</div>
                    <table className="table">
                        <thead><tr><th>Name</th><th>Language</th><th>Category</th><th>Status</th><th>{t('wa.contentPreview','Content Preview')}</th></tr></thead>
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
                        <thead><tr><th>{t('wa.recipientNo','Recipient')}</th><th>템플릿</th><th>Status</th><th>{t('wa.sendTime','Sent At')}</th></tr></thead>
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
