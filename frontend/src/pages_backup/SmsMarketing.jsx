import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PlanGate from "../components/PlanGate.jsx";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useGlobalData } from '../context/GlobalDataContext';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { useT } from '../i18n/index.js';
import CreativeStudioTab from "./CreativeStudioTab.jsx";
const API = import.meta.env.VITE_API_BASE || '';
const apiFetch = async (path, opts = {}) => {
    const token = localStorage.getItem('genie_token') || "";
    const r = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) } });
    return r.json().catch(() => ({}));
};

/* ─── BroadcastChannel Real-time Sync ──────────────── */
const SMS_SYNC_CHANNEL = 'geniego-sms-sync';
let _smsBc = null;
try { if (typeof BroadcastChannel !== 'undefined') _smsBc = new BroadcastChannel(SMS_SYNC_CHANNEL); } catch {}
function broadcastSms(type, payload) {
    try { _smsBc?.postMessage({ type, payload, ts: Date.now() }); } catch {}
}

/* ─── Security Monitor (Anti-Hacking) ──────────────── */
const SEC_PATTERNS = [
    /<script/i, /javascript:/i, /on(error|load|click|mouse)=/i,
    /eval\s*\(/i, /document\.(cookie|write)/i,
    /union\s+(all\s+)?select/i, /drop\s+table/i, /;\s*delete\s+from/i,
    /\.\.\/\.\.\/\.\.\//i, /etc\/passwd/i, /base64_decode/i,
];
function useSmsSecurity(addAlert) {
    const threatCount = useRef(0);
    const reqLog = useRef({ count: 0, start: Date.now() });
    const checkInput = useCallback((value, source = 'sms_input') => {
        if (!value || typeof value !== 'string') return false;
        for (const pat of SEC_PATTERNS) {
            if (pat.test(value)) {
                threatCount.current++;
                if (typeof addAlert === 'function') {
                    addAlert({ type: 'warn', msg: `🛡️ [SMS Security] Blocked suspicious ${source}: ${value.slice(0, 40)}…` });
                }
                return true;
            }
        }
        return false;
    }, [addAlert]);
    const checkRate = useCallback(() => {
        const now = Date.now();
        if (now - reqLog.current.start > 10000) { reqLog.current = { count: 1, start: now }; return false; }
        reqLog.current.count++;
        if (reqLog.current.count > 30) {
            if (typeof addAlert === 'function') addAlert({ type: 'warn', msg: '🚨 [SMS Security] Rate limit exceeded — possible automated attack detected' });
            return true;
        }
        return false;
    }, [addAlert]);
    return { checkInput, checkRate, threatCount };
}

/* ─── Integration Hub Auto-Detect ──────────────────── */
function useIntegrationHubChannels() {
    const [ihubChannels, setIhubChannels] = useState([]);
    useEffect(() => {
        (async () => {
            try {
                const data = await apiFetch('/api/creds');
                if (data.ok && Array.isArray(data.creds)) {
                    const smsRelated = data.creds.filter(c =>
                        ['nhn_cloud', 'nhn', 'aligo', 'coolsms', 'twilio', 'vonage', 'messagebird'].includes(c.channel?.toLowerCase())
                    );
                    setIhubChannels(smsRelated);
                }
            } catch {}
        })();
    }, []);
    return ihubChannels;
}

const Tag = ({ label, color = '#4f8ef7' }) => (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}33`, fontWeight: 700 }}>{label}</span>
);

/* ─── Auth Settings Panel ──────────────────────────── */
function AuthPanel({ onSaved }) {
    const t = useT();
    const [form, setForm] = useState({ provider: 'nhn', app_key: '', secret_key: '', sender_no: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const PROVIDERS = useMemo(() => [
        { id: 'nhn', name: 'NHN Cloud bizMessage', desc: t('sms.providerNhnDesc'), color: '#4f8ef7' },
        { id: 'aligo', name: 'Aligo', desc: t('sms.providerAligoDesc'), color: '#22c55e' },
        { id: 'coolsms', name: 'CoolSMS', desc: t('sms.providerCoolDesc'), color: '#a855f7' },
    ], [t]);

    const handleSave = async () => {
        setLoading(true); setResult(null);
        const data = await apiFetch('/api/sms/settings', { method: 'POST', body: JSON.stringify(form) });
        setResult(data);
        if (data.ok && onSaved) onSaved();
        setLoading(false);
    };

    const prov = PROVIDERS.find(p => p.id === form.provider);
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setForm(f => ({ ...f, provider: p.id }))}
                        style={{
                            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 11, textAlign: 'left',
                            background: form.provider === p.id ? `${p.color}18` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${form.provider === p.id ? p.color : 'rgba(255,255,255,0.08)'}`,
                            color: form.provider === p.id ? p.color : 'var(--text-2)'
                        }}>
                        <div>{p.name}</div><div style={{ fontSize: 9, opacity: 0.7 }}>{p.desc}</div>
                    </button>
                ))}
            <div style={{ padding: '16px 20px', borderRadius: 14, background: `${prov?.color || '#4f8ef7'}06`, border: `1px solid ${prov?.color || '#4f8ef7'}22` }}>
                <div style={{ fontWeight: 900, fontSize: 12, color: prov?.color || '#4f8ef7', marginBottom: 12 }}>🔑 {prov?.name} {t('sms.apiKeySettings')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
                    {[
                        { k: 'app_key', l: 'App Key / App ID', ph: '...' },
                        { k: 'secret_key', l: 'Secret Key', ph: '...', secret: true },
                        { k: 'sender_no', l: t('sms.senderNumber'), ph: '01012345678' },
                    ].map(f => (
                        <div key={f.k}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.l}</div>
                            <input type={f.secret ? 'password' : 'text'} placeholder={f.ph} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${prov?.color || '#4f8ef7'}22`, background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                    ))}
                <button onClick={handleSave} disabled={loading}
                    style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${prov?.color || '#4f8ef7'},#6366f1)`, color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? `⏳ ${t('sms.connectTesting')}` : `💾 ${t('sms.saveAndTest')}`}
                </button>
                {result && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? '#22c55e' : '#ef4444'}33`, color: result.ok ? '#22c55e' : '#ef4444' }}>
                        {result.ok ? `✓ ${result.message || t('sms.connectSuccess')} ${result.balance ? '· ' + t('sms.balance') + ': ' + result.balance : ''}` : `✗ ${result.message || result.error}`}
                )}
                        </div>
        </div>
    </div>
);
}

/* ─── Compose Panel ─────────────────────────────────── */
function ComposePanel({ onSent }) {
    const t = useT();
    const [form, setForm] = useState({ to: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const msgType = form.message.length > 90 ? 'LMS' : 'SMS';
    const bytes = new Blob([form.message]).size;

    const handleSend = async () => {
        setLoading(true); setResult(null);
        const data = await apiFetch('/api/sms/send', { method: 'POST', body: JSON.stringify(form) });
        setResult(data);
        if (data.ok && onSent) onSent();
        setLoading(false);
    };

    return (
        <div className="card card-glass">
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>✏️ {t('sms.composeTitle')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'start' }}>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.recipientNumber')}</div>
                    <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} placeholder="01012345678" className="input" />
                    <div style={{ marginTop: 14, padding: '10px', borderRadius: 10, background: 'var(--surface)', fontSize: 11, lineHeight: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>{t('sms.type')}</span><Tag label={msgType} color={msgType === 'LMS' ? '#a855f7' : '#4f8ef7'} /></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>{t('sms.charCount')}</span><span style={{ color: '#eab308', fontWeight: 700 }}>{form.message.length}{t('sms.charUnit')}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>{t('sms.capacity')}</span><span>{bytes}bytes</span></div>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.messageContent')}</div>
                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder={t('sms.messagePlaceholder')} rows={6}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                            {msgType === 'SMS' ? t('sms.smsCostInfo') : t('sms.lmsCostInfo')}
                        <button onClick={handleSend} disabled={loading || !form.to || !form.message}
                            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {loading ? '⏳' : `📤 ${t('sms.send')}`}
                        </button>
                    {result && (
                        <div style={{ marginTop: 8, padding: '8px', borderRadius: 8, fontSize: 12, color: result.ok ? '#22c55e' : '#ef4444' }}>
                            {result.ok ? `✓ ${t('sms.sendComplete')} (${result.msg_id})` : `✗ ${result.error || t('sms.sendFailed')}`}
                    )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ─── Broadcast Panel ───────────────────────────────── */
function BroadcastPanel() {
    const t = useT();
    const [numbers, setNumbers] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleBroadcast = async () => {
        setLoading(true); setResult(null);
        const ns = numbers.split('\n').map(n => n.trim()).filter(Boolean);
        const data = await apiFetch('/api/sms/broadcast', { method: 'POST', body: JSON.stringify({ numbers: ns, message }) });
        setResult(data);
        setLoading(false);
    };

    return (
        <div className="card card-glass">
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📡 {t('sms.broadcastTitle')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.numberList')}</div>
                    <textarea value={numbers} onChange={e => setNumbers(e.target.value)} placeholder={'01012345678\n01098765432\n...'} rows={10}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 11, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{numbers.split('\n').filter(Boolean).length} {t('sms.numbersCount')}</div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.messageContent')}</div>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('sms.broadcastMsgPlaceholder')} rows={6}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{message.length}{t('sms.charUnit')} · {message.length > 90 ? 'LMS' : 'SMS'}</div>
                    <button onClick={handleBroadcast} disabled={loading || !numbers.trim() || !message.trim()}
                        style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {loading ? `⏳ ${t('sms.sending')}` : `📡 ${t('sms.startBroadcast')}`}
                    </button>
                    {result && (
                        <div style={{ marginTop: 10, padding: '10px', borderRadius: 8, fontSize: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', lineHeight: 1.7 }}>
                            ✓ {t('sms.done')}<br />{t('sms.success')}: {result.sent}{t('sms.countUnit')} · {t('sms.failed')}: {result.failed}{t('sms.countUnit')} · {t('sms.total')}: {result.total}{t('sms.countUnit')}
                    )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ─── Templates Panel (NEW) ─────────────────────────── */
const TEMPLATE_CATEGORIES = ['promotion', 'notification', 'authentication', 'transaction'];

function TemplatesPanel() {
    const t = useT();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ name: '', category: 'promotion', body: '', variables: '' });
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('all');

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        const data = await apiFetch('/api/sms/templates');
        setTemplates(data.templates || []);
        setLoading(false);
    }, []);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    const handleSave = async () => {
        const method = editId ? 'PUT' : 'POST';
        const path = editId ? `/api/sms/templates/${editId}` : '/api/sms/templates';
        await apiFetch(path, { method, body: JSON.stringify(form) });
        setShowForm(false); setEditId(null);
        setForm({ name: '', category: 'promotion', body: '', variables: '' });
        loadTemplates();
    };

    const handleDelete = async (id) => {
        await apiFetch(`/api/sms/templates/${id}`, { method: 'DELETE' });
        loadTemplates();
    };

    const handleEdit = (tpl) => {
        setForm({ name: tpl.name, category: tpl.category, body: tpl.body, variables: (tpl.variables || []).join(', ') });
        setEditId(tpl.id);
        setShowForm(true);
    };

    const filtered = useMemo(() => {
        let list = templates;
        if (filterCat !== 'all') list = list.filter(tp => tp.category === filterCat);
        if (search) list = list.filter(tp => tp.name.toLowerCase().includes(search.toLowerCase()) || tp.body.toLowerCase().includes(search.toLowerCase()));
        return list;
    }, [templates, filterCat, search]);

    const catColors = { promotion: '#f97316', notification: '#4f8ef7', authentication: '#22c55e', transaction: '#a855f7' };

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {/* Header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['all', ...TEMPLATE_CATEGORIES].map(c => (
                        <button key={c} onClick={() => setFilterCat(c)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${filterCat === c ? (catColors[c] || '#4f8ef7') : 'rgba(255,255,255,0.08)'}`, background: filterCat === c ? `${catColors[c] || '#4f8ef7'}15` : 'transparent', color: filterCat === c ? (catColors[c] || '#4f8ef7') : 'var(--text-3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            {c === 'all' ? t('sms.tplAll') : t(`sms.tplCat_${c}`)}
                        </button>
                    ))}
                <div style={{ display: 'flex', gap: 8 }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('sms.tplSearch')}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 11, width: 180 }} />
                    <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', category: 'promotion', body: '', variables: '' }); }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        + {t('sms.tplNew')}
                    </button>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="card card-glass" style={{ padding: 18, border: '1px solid rgba(79,142,247,0.3)' }}>
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 12, color: '#4f8ef7' }}>
                        {editId ? `✏️ ${t('sms.tplEdit')}` : `➕ ${t('sms.tplCreate')}`}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.tplName')}</div>
                            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('sms.tplNamePh')}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.tplCategory')}</div>
                            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }}>
                                {TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{t(`sms.tplCat_${c}`)}</option>)}
                            </select>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.tplBody')}</div>
                        <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder={t('sms.tplBodyPh')} rows={4}
                            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.tplVars')}</div>
                        <input value={form.variables} onChange={e => setForm(p => ({ ...p, variables: e.target.value }))} placeholder="#{name}, #{orderNo}"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                        <button onClick={() => { setShowForm(false); setEditId(null); }}
                            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}>
                            {t('sms.cancel')}
                        </button>
                        <button onClick={handleSave} disabled={!form.name || !form.body}
                            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            💾 {t('sms.save')}
                        </button>)}

            {/* Template List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>⏳ {t('sms.loading')}</div>
            ) : filtered.length === 0 ? (
                <div className="card card-glass" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{t('sms.tplEmpty')}</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                    {filtered.map(tpl => (
                        <div key={tpl.id} className="card card-glass" style={{ padding: 16, border: `1px solid ${catColors[tpl.category] || '#4f8ef7'}22` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 800, fontSize: 13, color: '#e8eaf0' }}>{tpl.name}</span>
                                <Tag label={t(`sms.tplCat_${tpl.category}`)} color={catColors[tpl.category] || '#4f8ef7'} />
                            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10, maxHeight: 60, overflow: 'hidden' }}>{tpl.body}</div>
                            {tpl.variables?.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {tpl.variables.map((v, i) => <Tag key={i} label={v} color="#06b6d4" />)}
                            )}
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button onClick={() => handleEdit(tpl)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✏️ {t('sms.edit')}</button>
                                <button onClick={() => handleDelete(tpl.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>🗑️ {t('sms.delete')}</button>
                        </div>
                    ))}
            )}
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
);
}

/* ─── Campaigns Panel (NEW) ─────────────────────────── */
const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sent', 'paused'];

function CampaignsPanel() {
    const t = useT();
    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', template_id: '', segment_id: '', scheduled_at: '', message: '' });
    const [filterStatus, setFilterStatus] = useState('all');

    const loadData = useCallback(async () => {
        setLoading(true);
        const [c, tp] = await Promise.all([
            apiFetch('/api/sms/campaigns'),
            apiFetch('/api/sms/templates'),
        ]);
        setCampaigns(c.campaigns || []);
        setTemplates(tp.templates || []);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreate = async () => {
        await apiFetch('/api/sms/campaigns', { method: 'POST', body: JSON.stringify(form) });
        setShowForm(false);
        setForm({ name: '', template_id: '', segment_id: '', scheduled_at: '', message: '' });
        loadData();
    };

    const handleAction = async (id, action) => {
        await apiFetch(`/api/sms/campaigns/${id}/${action}`, { method: 'POST' });
        loadData();
    };

    const statusColors = { draft: '#eab308', scheduled: '#4f8ef7', sent: '#22c55e', paused: '#a855f7', failed: '#ef4444' };

    const filtered = useMemo(() => {
        if (filterStatus === 'all') return campaigns;
        return campaigns.filter(c => c.status === filterStatus);
    }, [campaigns, filterStatus]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {/* Filter & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['all', ...CAMPAIGN_STATUSES].map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${filterStatus === s ? (statusColors[s] || '#4f8ef7') : 'rgba(255,255,255,0.08)'}`, background: filterStatus === s ? `${statusColors[s] || '#4f8ef7'}15` : 'transparent', color: filterStatus === s ? (statusColors[s] || '#4f8ef7') : 'var(--text-3)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            {s === 'all' ? t('sms.campAll') : t(`sms.campStatus_${s}`)}
                        </button>
                    ))}
                <button onClick={() => setShowForm(!showForm)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    + {t('sms.campNew')}
                </button>

            {/* Create Form */}
            {showForm && (
                <div className="card card-glass" style={{ padding: 18, border: '1px solid rgba(79,142,247,0.3)' }}>
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 12, color: '#4f8ef7' }}>🚀 {t('sms.campCreate')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.campName')}</div>
                            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('sms.campNamePh')}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.campTemplate')}</div>
                            <select value={form.template_id} onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }}>
                                <option value="">{t('sms.campSelectTpl')}</option>
                                {templates.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
                            </select>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.campSegment')}</div>
                            <input value={form.segment_id} onChange={e => setForm(p => ({ ...p, segment_id: e.target.value }))} placeholder={t('sms.campSegmentPh')}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.campSchedule')}</div>
                            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t('sms.campMessage')}</div>
                        <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder={t('sms.campMsgPh')} rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowForm(false)}
                            style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer' }}>
                            {t('sms.cancel')}
                        </button>
                        <button onClick={handleCreate} disabled={!form.name}
                            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            🚀 {t('sms.campCreateBtn')}
                        </button>)}

            {/* Campaign List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>⏳ {t('sms.loading')}</div>
            ) : filtered.length === 0 ? (
                <div className="card card-glass" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🚀</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 13 }}>{t('sms.campEmpty')}</div>
            ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                    {filtered.map(camp => (
                        <div key={camp.id} className="card card-glass" style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: '#e8eaf0' }}>{camp.name}</span>
                                    <Tag label={t(`sms.campStatus_${camp.status}`)} color={statusColors[camp.status] || '#666'} />
                                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-3)' }}>
                                    {camp.segment_name && <span>👥 {camp.segment_name}</span>}
                                    {camp.template_name && <span>📝 {camp.template_name}</span>}
                                    {camp.scheduled_at && <span>📅 {camp.scheduled_at.slice(0, 16)}</span>}
                                    {camp.sent_count != null && <span>📤 {camp.sent_count}{t('sms.countUnit')}</span>}
                                    {camp.success_rate != null && <span>✅ {camp.success_rate}%</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {camp.status === 'draft' && (
                                    <>
                                        <button onClick={() => handleAction(camp.id, 'schedule')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📅 {t('sms.campScheduleBtn')}</button>
                                        <button onClick={() => handleAction(camp.id, 'send')} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>📤 {t('sms.campSendNow')}</button>
                                    </>
                                )}
                                {camp.status === 'scheduled' && (
                                    <button onClick={() => handleAction(camp.id, 'pause')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(168,85,247,0.3)', background: 'transparent', color: '#a855f7', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>⏸️ {t('sms.campPause')}</button>
                                )}
                                {camp.status === 'paused' && (
                                    <button onClick={() => handleAction(camp.id, 'resume')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>▶️ {t('sms.campResume')}</button>
                                )}
                        </div>
                    ))}
            )}
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
);
}

/* ── Security Lock Modal ─── */
function SecurityLockModal({ t, onDismiss }) {
    return (
        <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <div style={{ background:'linear-gradient(135deg,#1a0a0a,#2a0a0a)',border:'1px solid rgba(239,68,68,0.5)',borderRadius:20,padding:32,maxWidth:380,textAlign:'center',boxShadow:'0 24px 64px rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize:48,marginBottom:12 }}>🛡️</div>
                <div style={{ fontWeight:900,fontSize:18,color:'#ef4444',marginBottom:8 }}>{t('sms.secLockTitle')}</div>
                <div style={{ fontSize:13,color: 'var(--text-3)',lineHeight:1.7,marginBottom:20 }}>{t('sms.secLockDesc')}</div>
                <button onClick={onDismiss} style={{ padding:'9px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#ef4444,#dc2626)',color: 'var(--text-1)',fontWeight:800,fontSize:13,cursor:'pointer' }}>{t('sms.dismiss')}</button>
        </div>
    </div>
);
}

/* ── CSV Export ─── */
function downloadSmsCsv(messages, t) {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = [t('sms.type'), t('sms.recipientNumber'), t('sms.content'), t('sms.status'), t('sms.sendTime')];
    const rows = messages.map(m => [m.msg_type||'SMS', m.recipient, (m.body||'').slice(0,200), m.status, (m.sent_at||'').slice(0,16)]);
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sms_history_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

/* ─── Guide Tab (i18n) ───────────────────────────────── */
function SmsGuideTab() {
    const t = useT();
    return (
        <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(167,139,250,0.08))', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 14, textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 44 }}>📱</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: '#e8eaf0' }}>{t('sms.guideTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('sms.guideSub')}</div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#e8eaf0' }}>{t('sms.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {[{n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a78bfa'},{n:'4️⃣',k:'guideStep4',c:'#f97316'},{n:'5️⃣',k:'guideStep5',c:'#06b6d4'},{n:'6️⃣',k:'guideStep6',c:'#f472b6'}].map((s,i) => (
                        <div key={i} style={{ background: s.c+'0a', border: '1px solid '+s.c+'25', borderRadius: 12, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.n}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`sms.${s.k}Title`)}</span>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{t(`sms.${s.k}Desc`)}</div>
                    ))}
            </div>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#e8eaf0' }}>{t('sms.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                    {[{icon:'✏️',k:'guideCompose',c:'#4f8ef7'},{icon:'📡',k:'guideBroadcast',c:'#a78bfa'},{icon:'📋',k:'guideTemplates',c:'#f97316'},{icon:'🚀',k:'guideCampaigns',c:'#06b6d4'},{icon:'📜',k:'guideHistory',c:'#22c55e'},{icon:'📊',k:'guideStats',c:'#f97316'},{icon:'🎨',k:'guideCreative',c:'#a855f7'},{icon:'⚙️',k:'guideAuth',c:'#06b6d4'}].map((tb,i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{tb.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`sms.${tb.k}Name`)}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t(`sms.${tb.k}Desc`)}</div>
                        </div>
                    ))}
            </div>
            <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: '#e8eaf0' }}>💡 {t('sms.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'var(--text-3)', lineHeight: 2.2 }}>
                    <li>{t('sms.guideTip1')}</li>
                    <li>{t('sms.guideTip2')}</li>
                    <li>{t('sms.guideTip3')}</li>
                    <li>{t('sms.guideTip4')}</li>
                    <li>{t('sms.guideTip5')}</li>
                </ul>
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

/* ─── Main Inner Component ──────────────────────────── */
function SmsMarketingInner() {
    const t = useT();
    const { fmt } = useCurrency();
    const [tab, setTab] = useState('compose');
    const [settings, setSettings] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [secLocked, setSecLocked] = useState(false);
    const { addAlert, crmSegments, triggerJourneyAction } = useGlobalData();
    const secAddAlert = useCallback((a) => {
        if (typeof addAlert === 'function') addAlert(a);
        if (a?.severity === 'critical') setSecLocked(true);
    }, [addAlert]);
    useSecurityGuard({ addAlert: secAddAlert, enabled: true });
    const { checkInput, checkRate } = useSmsSecurity(secAddAlert);
    const ihubChannels = useIntegrationHubChannels();

    const loadData = useCallback(async () => {
        if (checkRate()) return;
        setLoading(true);
        const [s, m] = await Promise.all([
            apiFetch('/api/sms/settings'),
            apiFetch('/api/sms/messages?limit=30'),
        ]);
        setSettings(s);
        setMessages(m.messages || []);
        broadcastSms('SMS_DATA_UPDATE', { stats: s?.stats, msgCount: (m.messages||[]).length });
        setLoading(false);
    }, [checkRate]);

    useEffect(() => { loadData(); }, [loadData]);

    /* Cross-tab real-time sync listener */
    useEffect(() => {
        if (!_smsBc) return;
        const handler = (e) => {
            if (e.data?.type === 'SMS_DATA_UPDATE') loadData();
            if (e.data?.type === 'SMS_SEND') loadData();
        };
        _smsBc.onmessage = handler;
        return () => { _smsBc.onmessage = null; };
    }, [loadData]);

    /* Auto-refresh every 30s for real-time sync */
    useEffect(() => {
        const iv = setInterval(loadData, 30000);
        return () => clearInterval(iv);
    }, [loadData]);

    const stats = settings?.stats || { sent: 0, delivered: 0, failed: 0 };
    const plan = settings?.plan || '';

    const TABS = useMemo(() => [
        { id: 'compose', label: `✏️ ${t('sms.tabCompose')}` },
        { id: 'broadcast', label: `📡 ${t('sms.tabBroadcast')}` },
        { id: 'templates', label: `📋 ${t('sms.tabTemplates')}` },
        { id: 'campaigns', label: `🚀 ${t('sms.tabCampaigns')}` },
        { id: 'history', label: `📜 ${t('sms.tabHistory')}` },
        { id: 'stats', label: `📊 ${t('sms.tabStats')}` },
        { id: 'creative', label: t('sms.tabCreative') || '🎨 Creative' },
        { id: 'settings', label: `⚙️ ${t('sms.tabSettings')}` },
        { id: 'guide', label: `📖 ${t('sms.tabGuide')}` },
    ], [t]);

    return (
        <div style={{ display: 'grid', gap: 18, padding: 4 }}>
            {secLocked && <SecurityLockModal t={t} onDismiss={() => setSecLocked(false)} />}

            {/* Live Sync Status */}
            <div style={{ padding:'6px 12px',borderRadius:8,background:'rgba(79,142,247,0.04)',border:'1px solid rgba(79,142,247,0.12)',fontSize:10,color:'#4f8ef7',fontWeight:600,display:'flex',alignItems:'center',gap:6 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
                {t('sms.liveSyncStatus')}

            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title grad-blue-purple">📱 {t('sms.heroTitle')}</div>
                        <div className="hero-desc">{t('sms.heroDesc')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <Tag label={`${t('sms.sent')} ${(stats.sent || 0).toLocaleString()}${t('sms.countUnit')}`} color="#4f8ef7" />
                            {ihubChannels.length > 0 && <Tag label={`🔗 ${ihubChannels.length} ${t('sms.ihubLinked')}`} color="#22c55e" />}
                            <Tag label="🛡️ Security Active" color="#06b6d4" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[{ l: t('sms.kpiSent'), v: stats.sent || 0, c: '#4f8ef7' }, { l: t('sms.kpiSuccess'), v: stats.delivered || 0, c: '#22c55e' }, { l: t('sms.kpiFailed'), v: stats.failed || 0, c: '#ef4444' }].map(k => (
                            <div key={k.l} style={{ padding: '8px 14px', borderRadius: 10, background: `${k.c}10`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k.l}</div>
                        ))}
                </div>

            {/* Integration Hub auto-detected channels */}
            {ihubChannels.length > 0 && (
                <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#22c55e' }}>🔗 {t('sms.ihubAutoDetect')}</span>
                    {ihubChannels.map((ch, i) => <Tag key={i} label={`${ch.channel} ${ch.test_status === 'ok' ? '✅' : '⏳'}`} color={ch.test_status === 'ok' ? '#22c55e' : '#eab308'} />)}
            )}

            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14, overflowX: 'auto' }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                        padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1, whiteSpace: 'nowrap',
                        background: tab === tb.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent', color: tab === tb.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms'
                    }}>
                        {tb.label}
                    </button>
                ))}

            {tab === 'compose' && <ComposePanel onSent={() => { loadData(); broadcastSms('SMS_SEND', {}); }} />}
            {tab === 'broadcast' && <BroadcastPanel />}
            {tab === 'templates' && <TemplatesPanel />}
            {tab === 'campaigns' && <CampaignsPanel />}
            {tab === 'history' && (
                <div className="card card-glass">
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                        <div style={{ fontWeight: 900, fontSize: 13 }}>📜 {t('sms.historyTitle')}</div>
                        {messages.length > 0 && (
                            <button onClick={() => downloadSmsCsv(messages, t)} style={{ padding:'5px 12px',borderRadius:8,border:'1px solid rgba(79,142,247,0.3)',background:'transparent',color:'#4f8ef7',fontSize:10,fontWeight:700,cursor:'pointer' }}>📥 {t('sms.exportCsv')}</button>
                        )}
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)', fontSize: 12 }}>{t('sms.noHistory')}</div>
                    ) : (
                    <table className="table">
                        <thead><tr><th>{t('sms.type')}</th><th>{t('sms.recipientNumber')}</th><th>{t('sms.content')}</th><th>{t('sms.status')}</th><th>{t('sms.sendTime')}</th></tr></thead>
                        <tbody>
                            {messages.map((m, i) => {
                                const sc = { delivered: '#22c55e', sent: '#4f8ef7', failed: '#ef4444', pending: '#eab308' }[m.status] || '#666';
                                return <tr key={i}>
                                    <td><Tag label={m.msg_type || 'SMS'} color={m.msg_type === 'LMS' ? '#a855f7' : '#4f8ef7'} /></td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.recipient}</td>
                                    <td style={{ fontSize: 11, color: 'var(--text-2)', maxWidth: 250 }}>{(m.body || '').slice(0, 50)}</td>
                                    <td><Tag label={m.status} color={sc} /></td>
                                    <td style={{ fontSize: 10, color: 'var(--text-3)' }}>{(m.sent_at || '').slice(0, 16)}</td>
                                </tr>;
                            })}
                        </tbody>
                    </table>
                    )}
            )}
            {tab === 'stats' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {[
                        { l: t('sms.statsSentThisMonth'), v: (stats.sent || 0).toLocaleString() + t('sms.countUnit'), c: '#4f8ef7' },
                        { l: t('sms.statsSuccessRate'), v: (stats.sent > 0 ? (stats.delivered / stats.sent * 100).toFixed(1) : '0.0') + '%', c: '#22c55e' },
                        { l: t('sms.statsBalance'), c: '#eab308', v: settings?.balance ? fmt(Number(settings.balance)) : fmt(0) }
                    ].map(k => (
                        <div key={k.l} style={{ padding: '20px', borderRadius: 14, background: `${k.c}08`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: k.c }}>{k.v}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{k.l}</div>
                    ))}
            )}
            {tab === 'creative' && <CreativeStudioTab sourcePage="sms-marketing" />}
            {tab === 'settings' && <AuthPanel onSaved={loadData} />}
            {tab === 'guide' && <SmsGuideTab />}
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

export default function SmsMarketing() {
    return (
<PlanGate feature="sms">
            <SmsMarketingInner />
        </PlanGate>
    );
}
