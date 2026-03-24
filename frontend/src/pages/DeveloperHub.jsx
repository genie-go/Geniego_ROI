import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/* ── Plan Helper ─────────────────────────────────────────── */
const PLAN_RANK = { free: 0, demo: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 5 };
const isPaidPlan = (plan) => (PLAN_RANK[plan] ?? 0) >= 1;

/* ── Demo Banner ─────────────────────────────────────────── */
function DemoBanner({ onUpgrade }) {
    return (
        <div style={{ padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(168,85,247,0.1),rgba(79,142,247,0.08))', border: '1.5px solid rgba(168,85,247,0.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#a855f7' }}>🎭 Demo Simulation 모드</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    동일한 UI로 모든 Feature을 체험할 Count 있습니다.
                    실제 Pixel Integration·Save은 <strong style={{ color: '#a855f7' }}>Paid Plan</strong>에서 Activate됩니다.
                </div>
            </div>
            <button onClick={onUpgrade} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap' }}>
                🚀 Paid Upgrade Plan
            </button>
        </div>
    );
}

/* ── API 엔드포인트 List ──────────────────────────────── */
const API_ENDPOINTS = [
    { method: 'GET',    path: '/api/v423/inventory',             auth: true,  desc: 'Stock List Search',             params: 'page, limit, sku' },
    { method: 'POST',   path: '/api/v423/inventory',             auth: true,  desc: 'Stock Register·Edit',             params: 'sku, name, stock, safeQty' },
    { method: 'GET',    path: '/api/v423/orders',                auth: true,  desc: 'Orders List Search',             params: 'status, channel, from, to' },
    { method: 'GET',    path: '/api/v423/settlement',            auth: true,  desc: '정산 데이터 Search',           params: 'channel, from, to' },
    { method: 'GET',    path: '/api/v423/campaigns',             auth: true,  desc: 'Campaign List Search',           params: 'status, page, limit' },
    { method: 'POST',   path: '/api/v423/campaigns',             auth: true,  desc: 'Create Campaign',                params: 'name, budget, channels, period' },
    { method: 'GET',    path: '/api/v423/crm/segments',          auth: true,  desc: 'CRM 세그먼트 Search',          params: 'type' },
    { method: 'POST',   path: '/api/v423/pnl/report',            auth: true,  desc: 'P&L 리포트 Create',           params: 'from, to, channels' },
    { method: 'GET',    path: '/api/v423/channel-budgets',       auth: true,  desc: 'Channel Budget 현황',             params: 'none' },
    { method: 'POST',   path: '/api/v423/webhook/register',      auth: true,  desc: 'Webhook Register',              params: 'url, events, secret' },
    { method: 'GET',    path: '/api/v423/webhook/list',          auth: true,  desc: 'Register된 Webhook List',       params: 'none' },
    { method: 'DELETE', path: '/api/v423/webhook/{id}',          auth: true,  desc: 'Webhook Delete',              params: 'id (path)' },
    { method: 'GET',    path: '/api/v423/popups/active',         auth: false, desc: 'Active Event Popup Search',      params: 'none' },
    { method: 'GET',    path: '/api/v423/admin/popups',          auth: true,  desc: 'Popup Management List (Management자)',    params: 'page, limit' },
];

/* ── Webhook Event List ──────────────────────────────── */
const WEBHOOK_EVENTS = [
    { id: 'order.created',        label: 'Orders Create',          desc: '새 Orders 발생 시' },
    { id: 'order.status_changed', label: 'Orders Status Change',      desc: '배송·Cancel·반품 등 Status Change 시' },
    { id: 'inventory.low_stock',  label: 'Stock 부족',           desc: 'Stock가 안전Stock 이하일 때' },
    { id: 'campaign.approved',    label: 'Campaign Approval',          desc: 'Management자가 Campaign을 Approval할 때' },
    { id: 'campaign.executed',    label: 'Campaign Auto집행',      desc: 'AI Recommend Campaign Card Auto집행 시' },
    { id: 'settlement.completed', label: '정산 Done',            desc: '월per 정산 Completed 시' },
    { id: 'user.upgraded',        label: 'Upgrade Plan',      desc: 'Paid Plan Conversion 시' },
];

const METHOD_COLOR = { GET: '#22c55e', POST: '#4f8ef7', PUT: '#eab308', DELETE: '#ef4444', PATCH: '#a855f7' };

function EndpointRow({ ep }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', ':hover': { background: 'rgba(255,255,255,0.03)' } }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: `${METHOD_COLOR[ep.method]}18`, color: METHOD_COLOR[ep.method], minWidth: 46, textAlign: 'center', border: `1px solid ${METHOD_COLOR[ep.method]}33` }}>{ep.method}</span>
                <code style={{ flex: 1, fontSize: 11, color: 'var(--text-1)', fontFamily: 'monospace' }}>{ep.path}</code>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{ep.desc}</span>
                {ep.auth && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)' }}>🔐 Auth</span>}
                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
            </div>
            {open && (
                <div style={{ padding: '10px 14px 14px 74px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>파라미터: <span style={{ color: 'var(--text-2)', fontFamily: 'monospace' }}>{ep.params}</span></div>
                    {ep.auth && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>인증: <code style={{ color: '#4f8ef7', fontFamily: 'monospace', fontSize: 10 }}>Authorization: Bearer {'{token}'}</code></div>}
                </div>
            )}
        </div>
    );
}

function WebhookManager({ isPaid, onUpgrade }) {
    const [hooks, setHooks] = useState([
        { id: 1, url: 'https://example.com/webhook', events: ['order.created', 'inventory.low_stock'], active: true, created: '2026-03-01' },
    ]);
    const [adding, setAdding] = useState(false);
    const [newUrl, setNewUrl] = useState('');
    const [selEvents, setSelEvents] = useState([]);
    const [newSecret, setNewSecret] = useState('');
    const [saving, setSaving] = useState(false);
    const [simDone, setSimDone] = useState(false);

    const toggleEvent = (id) => setSelEvents(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]);

    const handleAdd = async () => {
        if (!newUrl || selEvents.length === 0) { alert('URL과 Event를 Select하세요.'); return; }
        setSaving(true);
        await new Promise(r => setTimeout(r, 1000));
        setSaving(false);
        if (isPaid) {
            setHooks(p => [...p, { id: Date.now(), url: newUrl, events: selEvents, active: true, created: new Date().toISOString().slice(0,10) }]);
        } else {
            setSimDone(true);
            setTimeout(() => setSimDone(false), 3000);
        }
        setAdding(false);
        setNewUrl(''); setSelEvents([]); setNewSecret('');
    };

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {!isPaid && <DemoBanner onUpgrade={onUpgrade} />}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>⚡ Webhook Management</div>
                <button onClick={() => setAdding(v => !v)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                    {adding ? 'Cancel' : '+ Webhook Add'}
                </button>
            </div>

            {simDone && <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, fontWeight: 700, color: '#22c55e' }}>✅ Demo Simulation: Webhook Register Success!</div>}

            {adding && (
                <div style={{ padding: 18, borderRadius: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ display: 'grid', gap: 10 }}>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Endpoint URL</div>
                            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://your-server.com/webhook"
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.3)', color: '#fff', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Secret (HMAC 서명용, Select)</div>
                            <input value={newSecret} onChange={e => setNewSecret(e.target.value)} placeholder="your-secret-key" type="password"
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.3)', color: '#fff', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 8 }}>Count신할 Event Select</div>
                            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                                {WEBHOOK_EVENTS.map(ev => (
                                    <button key={ev.id} onClick={() => toggleEvent(ev.id)} style={{ padding: '5px 12px', borderRadius: 99, border: `1px solid ${selEvents.includes(ev.id) ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, background: selEvents.includes(ev.id) ? 'rgba(99,102,241,0.15)' : 'transparent', color: selEvents.includes(ev.id) ? '#818cf8' : 'var(--text-3)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                        {ev.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleAdd} disabled={saving} style={{ padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff', fontWeight: 800, fontSize: 12, opacity: saving ? 0.7 : 1 }}>
                            {saving ? '⏳ Save in progress...' : isPaid ? '💾 Webhook Register' : '🎭 Demo Simulation Run'}
                        </button>
                    </div>
                </div>
            )}

            {hooks.map(h => (
                <div key={h.id} className="card card-glass" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                            <code style={{ fontSize: 12, color: '#4f8ef7', fontFamily: 'monospace' }}>{h.url}</code>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                                {h.events.map(ev => <span key={ev} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{ev}</span>)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{h.created}</span>
                            <span style={{ padding: '3px 10px', borderRadius: 99, background: h.active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: h.active ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 700, border: `1px solid ${h.active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                {h.active ? '● Active' : '✕ Inactive'}
                            </span>
                            <button onClick={() => setHooks(p => p.filter(x => x.id !== h.id))} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>Delete</button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── 메인 DeveloperHub ──────────────────────────────── */
export default function DeveloperHub() {
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const isPaid = isPaidPlan(user?.plan);
    const [tab, setTab] = useState('docs');
    const [copied, setCopied] = useState(false);
    const [methodFilter, setMethodFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    const BASE_URL = 'https://roi.genie-go.com';
    const filteredEps = useMemo(() => API_ENDPOINTS.filter(ep =>
        (methodFilter === 'ALL' || ep.method === methodFilter) &&
        (ep.path.includes(search) || ep.desc.includes(search))
    ), [methodFilter, search]);

    const handleCopyToken = () => {
        if (token) { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    };

    const handleDownloadPostman = () => {
        const collection = {
            info: { name: 'Geniego-ROI API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
            item: API_ENDPOINTS.map(ep => ({
                name: ep.desc,
                request: {
                    method: ep.method,
                    url: { raw: `${BASE_URL}${ep.path}`, host: [BASE_URL], path: ep.path.split('/').filter(Boolean) },
                    header: ep.auth ? [{ key: 'Authorization', value: 'Bearer {{token}}' }] : [],
                },
            })),
        };
        const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'Geniego-ROI-Postman.json';
        a.click();
    };

    const TABS = [
        { id: 'docs',    label: '📖 API 문서' },
        { id: 'webhook', label: '⚡ Webhook' },
        { id: 'apikey',  label: '🔑 API 인증' },
        { id: 'sdk',     label: '📦 SDK·Integration' },
    ];

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            {/* Header */}
            <div className="card card-glass" style={{ padding: '20px 24px', background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(79,142,247,0.06))', borderColor: 'rgba(99,102,241,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-1)', marginBottom: 4 }}>⚙️ Developer Hub (Developer Hub)</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Geniego-ROI API 문서, Webhook Management, SDK Integration 가이드</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            {['REST API v423', 'JSON', 'JWT Auth', 'Webhook', 'OpenAPI 3.0'].map(t => (
                                <span key={t} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 700 }}>{t}</span>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleDownloadPostman} style={{ padding: '10px 20px', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ef4444)', color: '#fff', fontWeight: 800, fontSize: 12 }}>
                        📦 Postman Collection Download
                    </button>
                </div>
            </div>

            {/* Tab */}
            <div className="card card-glass" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex' }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            flex: 1, padding: '13px 8px', border: 'none', cursor: 'pointer', textAlign: 'center',
                            background: tab === t.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                            borderBottom: `2px solid ${tab === t.id ? '#6366f1' : 'transparent'}`,
                            fontSize: 12, fontWeight: 800, color: tab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                        }}>{t.label}</button>
                    ))}
                </div>
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                {/* API 문서 Tab */}
                {tab === 'docs' && (
                    <div style={{ display: 'grid', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>📖 REST API 엔드포인트 List</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['ALL', 'GET', 'POST', 'DELETE'].map(m => (
                                    <button key={m} onClick={() => setMethodFilter(m)} style={{ padding: '5px 12px', borderRadius: 99, border: `1px solid ${methodFilter === m ? (METHOD_COLOR[m] || '#6366f1') : 'rgba(255,255,255,0.1)'}`, background: methodFilter === m ? (METHOD_COLOR[m] || '#6366f1') + '18' : 'transparent', color: methodFilter === m ? (METHOD_COLOR[m] || '#818cf8') : 'var(--text-3)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{m}</button>
                                ))}
                            </div>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="경로·Description Search..."
                                style={{ padding: '7px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, width: 160 }} />
                        </div>
                        {/* Base URL */}
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 8 }}>Base URL:</span>
                            <code style={{ fontSize: 12, color: '#4f8ef7', fontFamily: 'monospace' }}>{BASE_URL}</code>
                        </div>
                        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                            {filteredEps.map((ep, i) => <EndpointRow key={i} ep={ep} />)}
                        </div>
                    </div>
                )}

                {/* Webhook Tab */}
                {tab === 'webhook' && (
                    <WebhookManager isPaid={isPaid} onUpgrade={() => navigate('/app-pricing')} />
                )}

                {/* API 인증 Tab */}
                {tab === 'apikey' && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>🔑 API 인증 (JWT Bearer Token)</div>

                        <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#4f8ef7', marginBottom: 10 }}>인증 방식</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: 9, marginBottom: 10, color: '#a5b4fc', lineHeight: 1.8 }}>
                                <div style={{ color: 'var(--text-3)' }}>{`// 모든 인증 필요 API에 Header 포함`}</div>
                                <div>Authorization: Bearer <span style={{ color: '#22c55e' }}>{'{your-jwt-token}'}</span></div>
                                <br />
                                <div style={{ color: 'var(--text-3)' }}>{`// 로그인으로 토큰 Issue`}</div>
                                <div><span style={{ color: '#f97316' }}>POST</span> /api/auth/login</div>
                                <div>{`{ "email": "...", "password": "..." }`}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>현재 세션 토큰:</div>
                                <code style={{ flex: 1, fontSize: 10, color: '#4f8ef7', fontFamily: 'monospace', padding: '4px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {token ? token.slice(0, 40) + '...' : '로그인 필요'}
                                </code>
                                <button onClick={handleCopyToken} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    {copied ? '✅ Copy됨' : '📋 Copy'}
                                </button>
                            </div>
                        </div>

                        {/* Rate Limits */}
                        <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#eab308', marginBottom: 10 }}>⚡ Rate Limits</div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                {[
                                    { plan: 'Free·Demo', limit: '100 req/hr', color: '#94a3b8' },
                                    { plan: 'Starter', limit: '1,000 req/hr', color: '#4f8ef7' },
                                    { plan: 'Growth', limit: '5,000 req/hr', color: '#a855f7' },
                                    { plan: 'Pro / Enterprise', limit: 'Unlimited', color: '#22c55e' },
                                ].map(r => (
                                    <div key={r.plan} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <span style={{ color: r.color, fontWeight: 700 }}>{r.plan}</span>
                                        <span>{r.limit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* SDK Integration Tab */}
                {tab === 'sdk' && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>📦 SDK & 외부 Integration 가이드</div>

                        {[
                            {
                                title: 'JavaScript / Node.js',
                                icon: '🟨',
                                color: '#f97316',
                                code: `// npm install axios
const axios = require('axios');

const client = axios.create({
  baseURL: '${BASE_URL}/api',
  headers: { Authorization: \`Bearer \${TOKEN}\` }
});

// Orders Search
const orders = await client.get('/v423/orders', {
  params: { status: 'pending', limit: 50 }
});
console.log(orders.data);`
                            },
                            {
                                title: 'Python',
                                icon: '🐍',
                                color: '#3b82f6',
                                code: `import requests

BASE = '${BASE_URL}/api'
headers = {'Authorization': f'Bearer {TOKEN}'}

# Stock Search
r = requests.get(f'{BASE}/v423/inventory', headers=headers)
data = r.json()

# Create Campaign
r = requests.post(f'{BASE}/v423/campaigns',
    headers=headers,
    json={'name': 'Test', 'budget': 1000000, 'channels': ['meta']})`
                            },
                            {
                                title: 'Zapier (No-Code)',
                                icon: '⚡',
                                color: '#f97316',
                                code: `// Zapier에서 "Webhooks by Zapier" 사용
// 1. Trigger: 외부 Event Count신
// 2. Action: POST https://roi.genie-go.com/api/v423/campaigns
// Headers: Authorization: Bearer {your-token}
// Body (JSON):
{
  "name": "{{zapier_field}}",
  "budget": "{{amount}}",
  "channels": ["meta", "naver"]
}`
                            },
                        ].map(sdk => (
                            <div key={sdk.title} style={{ borderRadius: 12, border: `1px solid ${sdk.color}22`, overflow: 'hidden' }}>
                                <div style={{ padding: '10px 16px', background: `${sdk.color}08`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>{sdk.icon}</span>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: sdk.color }}>{sdk.title}</span>
                                </div>
                                <pre style={{ margin: 0, padding: '14px 16px', background: 'rgba(0,0,0,0.4)', color: '#a5b4fc', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.7, overflowX: 'auto' }}>
                                    {sdk.code}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
