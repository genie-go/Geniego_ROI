import React, { useState, useEffect, useCallback } from "react";
import PlanGate from "../components/PlanGate.jsx";
import { useCurrency } from '../contexts/CurrencyContext.jsx';

import { useT } from '../i18n/index.js';
const API = import.meta.env.VITE_API_BASE || '';
const apiFetch = async (path, opts = {}) => {
    const token = localStorage.getItem('genie_token') || 'demo-token';
    const r = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) } });
    return r.json().catch(() => ({}));
};
// currency formatting via useCurrency fmt()
const Tag = ({ label, color = '#4f8ef7' }) => (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}33`, fontWeight: 700 }}>{label}</span>
);

const PROVIDERS = [
    { id: 'nhn', name: 'NHN Cloud bizMessage', desc: 'Domestic Max SMS API (KT/SK/LG Network)', color: '#4f8ef7' },
    { id: 'aligo', name: 'Aligo(Aligo)', desc: 'Small Scale/스타트업 적합', color: '#22c55e' },
    { id: 'coolsms', name: 'CoolSMS', desc: '개발자 친화적 API', color: '#a855f7' },
];

function AuthPanel({ onSaved }) {
    const [form, setForm] = useState({ provider: 'nhn', app_key: '', secret_key: '', sender_no: '' });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

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
            </div>
            <div style={{ padding: '16px 20px', borderRadius: 14, background: `${prov?.color || '#4f8ef7'}06`, border: `1px solid ${prov?.color || '#4f8ef7'}22` }}>
                <div style={{ fontWeight: 900, fontSize: 12, color: prov?.color || '#4f8ef7', marginBottom: 12 }}>🔑 {prov?.name} API 키 Settings</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
                    {[
                        { k: 'app_key', l: 'App Key / App ID', ph: '...' },
                        { k: 'secret_key', l: 'Secret Key', ph: '...', secret: true },
                        { k: 'sender_no', l: '발신번호 (사전 Register 필Count)', ph: '01012345678' },
                    ].map(f => (
                        <div key={f.k}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.l}</div>
                            <input type={f.secret ? 'password' : 'text'} placeholder={f.ph} value={form[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${prov?.color || '#4f8ef7'}22`, background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                    ))}
                </div>
                <button onClick={handleSave} disabled={loading}
                    style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${prov?.color || '#4f8ef7'},#6366f1)`, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? '⏳ Connect Test in progress…' : '💾 Save + Connect Test'}
                </button>
                {result && (
                    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 12, background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? '#22c55e' : '#ef4444'}33`, color: result.ok ? '#22c55e' : '#ef4444' }}>
                        {result.ok ? `✓ ${result.message || 'Connect Success'} ${result.balance ? '· 잔액: ' + result.balance + '원' : ''}` : `✗ ${result.message || result.error}`}
                    </div>
                )}
            </div>
        </div>
    );
}

function ComposePanel({ onSent }) {
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
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>✏️ SMS/LMS 작성</div>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'start' }}>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Count신 번호</div>
                    <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} placeholder="01012345678" className="input" />
                    <div style={{ marginTop: 14, padding: '10px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', fontSize: 11, lineHeight: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Type</span><Tag label={msgType} color={msgType === 'LMS' ? '#a855f7' : '#4f8ef7'} /></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>글자Count</span><span style={{ color: '#eab308', fontWeight: 700 }}>{form.message.length}자</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-3)' }}>Capacity</span><span>{bytes}bytes</span></div>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Message 내용 (90자 초과 Auto LMS Conversion)</div>
                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Message 입력…" rows={6}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                            {msgType === 'SMS' ? 'SMS: 90자 이하, 건당 약 10~20원' : 'LMS: 장문, 건당 약 50~60원'}
                        </div>
                        <button onClick={handleSend} disabled={loading || !form.to || !form.message}
                            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {loading ? '⏳' : '📤 Send'}
                        </button>
                    </div>
                    {result && (
                        <div style={{ marginTop: 8, padding: '8px', borderRadius: 8, fontSize: 12, color: result.ok ? '#22c55e' : '#ef4444' }}>
                            {result.ok ? `✓ Send Done (${result.msg_id})` : `✗ ${result.error || 'Send Failed'}`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function BroadcastPanel() {
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
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📡 일괄 Send (Max 500개)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Count신번호 List (줄바꿈 구분)</div>
                    <textarea value={numbers} onChange={e => setNumbers(e.target.value)} placeholder={'01012345678\n01098765432\n...'} rows={10}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 11, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{numbers.split('\n').filter(Boolean).length}개 번호</div>
                </div>
                <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Message 내용</div>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Send할 Message를 입력하세요..." rows={6}
                        style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: '#fff', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }} />
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{message.length}자 · {message.length > 90 ? 'LMS' : 'SMS'}</div>
                    <button onClick={handleBroadcast} disabled={loading || !numbers.trim() || !message.trim()}
                        style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        {loading ? '⏳ Sending…' : '📡 일괄 Send Start'}
                    </button>
                    {result && (
                        <div style={{ marginTop: 10, padding: '10px', borderRadius: 8, fontSize: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', lineHeight: 1.7 }}>
                            ✓ Done<br />Success: {result.sent}건 · Failed: {result.failed}건 · Total: {result.total}건
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const TABS = [
    { id: 'compose', label: '✏️ SMS 작성' },
    { id: 'broadcast', label: '📡 일괄 Send' },
    { id: 'history', label: '📜 Send History' },
    { id: 'stats', label: '📊 Statistics' },
    { id: 'settings', label: '⚙️ 인증 Settings' },
];

function SmsMarketingInner() {
    const [tab, setTab] = useState('compose');
    const [settings, setSettings] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [s, m] = await Promise.all([
            apiFetch('/api/sms/settings'),
            apiFetch('/api/sms/messages?limit=30'),
        ]);
        setSettings(s);
        setMessages(m.messages || []);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const stats = settings?.stats || { sent: 324, delivered: 318, failed: 6 };
    const plan = settings?.plan || 'demo';

    return (
        <div style={{ display: 'grid', gap: 18, padding: 4 }}>
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title grad-blue-purple">📱 SMS/LMS Marketing</div>
                        <div className="hero-desc">NHN Cloud bizMessage · KT/SK/LG Network · 인증키 Register 즉시 실Integration</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            {plan === 'pro' ? <Tag label="⚡ Pro 실Integration" color="#a855f7" /> : <Tag label="🎮 Demo Mode" color="#4f8ef7" />}
                            <Tag label={`Send ${(stats.sent || 0).toLocaleString()}건`} color="#4f8ef7" />
                            <Tag label="NHN Cloud bizMessage" color="#22c55e" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[{ l: 'Send', v: stats.sent || 324, c: '#4f8ef7' }, { l: 'Success', v: stats.delivered || 318, c: '#22c55e' }, { l: 'Failed', v: stats.failed || 6, c: '#ef4444' }].map(k => (
                            <div key={k.l} style={{ padding: '8px 14px', borderRadius: 10, background: `${k.c}10`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: k.c }}>{k.v}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, flex: 1,
                        background: tab === t.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms'
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'compose' && <ComposePanel onSent={loadData} />}
            {tab === 'broadcast' && <BroadcastPanel />}
            {tab === 'history' && (
                <div className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📜 Send History</div>
                    <table className="table">
                        <thead><tr><th>Type</th><th>Count신번호</th><th>내용</th><th>Status</th><th>SendTime</th></tr></thead>
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
                </div>
            )}
            {tab === 'stats' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {[{ l: 'This Month Send', v: (stats.sent || 324).toLocaleString() + '건', c: '#4f8ef7' }, { l: 'Send Success률', v: ((stats.delivered || 318) / Math.max(stats.sent || 324, 1) * 100).toFixed(1) + '%', c: '#22c55e' }, { l: 'Budget 잔여', c: '#eab308', v: '₩270,000' }].map(k => (
                        <div key={k.l} style={{ padding: '20px', borderRadius: 14, background: `${k.c}08`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: k.c }}>{k.v}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{k.l}</div>
                        </div>
                    ))}
                </div>
            )}
            {tab === 'settings' && <AuthPanel onSaved={loadData} />}
        </div>
    );
}

export default function SmsMarketing() {
  const t = useT();
    const { fmt } = useCurrency();
    return (
        <PlanGate feature="sms">
            <SmsMarketingInner />
        </PlanGate>
    );
}
