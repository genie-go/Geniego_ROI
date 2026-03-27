import React, { useState, useEffect, useCallback, useRef } from "react";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

import { useT } from '../i18n/index.js';
/* ─── API Helper ─────────────────────────────────────────────────────────── */
const API = import.meta.env.VITE_API_BASE || '';
const apiFetch = async (path, opts = {}) => {
    const token = localStorage.getItem('genie_token') || sessionStorage.getItem('genie_token') || 'demo-token';
    const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) },
    });
    return res.json().catch(() => ({}));
};

/* ─── Channel 마스터 Definition ─────────────────────────────────────────────────────── */
const CHANNELS_MASTER = [
    {
        id: 'shopify', name: 'Shopify', icon: '🛒', color: '#96bf48', type: 'Global',
        fields: [{ key: 'shop_domain', label: 'Shop Domain', ph: 'mystore.myshopify.com' }, { key: 'access_token', label: 'Admin API Access Token', ph: 'shpat_xxxx', secret: true }]
    },
    {
        id: 'amazon', name: 'Amazon SP-API', icon: '📦', color: '#ff9900', type: 'Global',
        fields: [{ key: 'client_id', label: 'LWA Client ID', ph: 'amzn1.application-oa2-client...' }, { key: 'client_secret', label: 'Client Secret', ph: '...', secret: true }, { key: 'marketplace_id', label: 'Marketplace ID', ph: 'A1PA6795UKMFR9 (JP)' }]
    },
    {
        id: 'ebay', name: 'eBay', icon: '🔵', color: '#0064d2', type: 'Global',
        fields: [{ key: 'access_token', label: 'OAuth Access Token', ph: 'v^1.1#...', secret: true }]
    },
    {
        id: 'tiktok_shop', name: 'TikTok Shop', icon: '🎵', color: '#ff0050', type: 'Global',
        fields: [{ key: 'app_key', label: 'App Key', ph: '...' }, { key: 'app_secret', label: 'App Secret', ph: '...', secret: true }, { key: 'access_token', label: 'Access Token', ph: '...', secret: true }]
    },
    {
        id: 'rakuten', name: 'Rakuten', icon: '🇯🇵', color: '#bf0000', type: 'Japan',
        fields: [{ key: 'service_secret', label: 'Service Secret', ph: '...', secret: true }, { key: 'license_key', label: 'License Key', ph: '...' }]
    },
    {
        id: 'yahoo_jp', name: 'Yahoo! Japan Shopping', icon: '🟥', color: '#ff0033', type: 'Japan',
        fields: [{ key: 'seller_id', label: 'Seller ID', ph: '...' }, { key: 'api_key', label: 'API Key', ph: '...', secret: true }]
    },
    {
        id: 'line', name: 'LINE Shopping', icon: '💚', color: '#00b900', type: 'Japan',
        fields: [{ key: 'channel_access_token', label: 'Channel Access Token', ph: '...', secret: true }]
    },
    {
        id: 'coupang', name: 'Coupang Wing', icon: '🅒', color: '#00bae5', type: 'Domestic',
        fields: [{ key: 'access_key', label: 'Access Key', ph: '...' }, { key: 'secret_key', label: 'Secret Key', ph: '...', secret: true }, { key: 'vendor_id', label: 'Vendor ID', ph: 'A...' }]
    },
    {
        id: 'naver', name: 'Naver 스마트스토어', icon: '🟢', color: '#03c75a', type: 'Domestic',
        fields: [{ key: 'client_id', label: 'Client ID', ph: '...' }, { key: 'client_secret', label: 'Client Secret', ph: '...', secret: true }]
    },
    {
        id: '11st', name: '11Street', icon: '11', color: '#ff0000', type: 'Domestic',
        fields: [{ key: 'api_key', label: 'Open API Key', ph: '...', secret: true }]
    },
    {
        id: 'gmarket', name: 'Gmarket / 옥션', icon: 'G', color: '#eab308', type: 'Domestic',
        fields: [{ key: 'esm_id', label: 'ESM+ ID', ph: '...' }, { key: 'api_key', label: 'API Key', ph: '...', secret: true }]
    },
    {
        id: 'cafe24', name: 'Cafe24', icon: '☕', color: '#6366f1', type: 'Domestic',
        fields: [{ key: 'mall_id', label: 'Mall ID', ph: '...' }, { key: 'client_id', label: 'Client ID', ph: '...' }, { key: 'client_secret', label: 'Client Secret', ph: '...', secret: true }]
    },
    {
        id: 'lotteon', name: '롯데온', icon: 'L', color: '#ef4444', type: 'Domestic',
        fields: [{ key: 'api_key', label: 'API Key', ph: '...', secret: true }]
    },
];

const STATUS_STYLES = {
    ok: { label: '✓ Integration됨', color: '#22c55e' },
    connected: { label: '✓ Integration됨', color: '#22c55e' },
    error: { label: '⚠ Error', color: '#ef4444' },
    untested: { label: '● 미Test', color: '#eab308' },
    not_configured: { label: '○ 미Settings', color: '#666' },
    none: { label: '○ 미Settings', color: '#666' },
};

// currency formatting via useCurrency fmt()
const Tag = ({ label, color }) => (
    <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        background: color + '18', color, border: `1px solid ${color}33`
    }}>{label}</span>
);

/* ═══ Channelper 인증 Panel ════════════════════════════════════════════════════════ */
function ChannelAuthPanel({ ch, onSaved, isDemo }) {
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (isDemo) { alert('📌 Demo Mode: Channel 인증키 Save은 실사용 Account에서만 가능합니다.\n업그레이드 후 실제 Channel을 Integration하세요.'); return; }
        setLoading(true); setResult(null);
        try {
            // 메인 키 결정
            const mainField = ch.fields.find(f => f.secret) || ch.fields[0];
            const extras = {};
            ch.fields.forEach(f => { if (f.key !== mainField.key && form[f.key]) extras[f.key] = form[f.key]; });

            const data = await apiFetch('/api/channel-sync/credentials', {
                method: 'POST',
                body: JSON.stringify({
                    channel: ch.id, cred_type: 'api_key', label: ch.name,
                    key_name: mainField.key, key_value: form[mainField.key] || '',
                    ...extras,
                }),
            });
            setResult(data);
            if (data.ok && onSaved) onSaved(ch.id, data);
        } catch (e) {
            setResult({ ok: false, error: e.message });
        }
        setLoading(false);
    };

    const handleTest = async () => {
        if (isDemo) { alert('📌 Demo Mode: Connect Test는 실사용 Account에서 가능합니다.\n시뮬레이션 데이터로 Demo를 In Progress입니다.'); return; }
        setLoading(true); setResult(null);
        try {
            const extras = {};
            ch.fields.forEach(f => { if (form[f.key]) extras[f.key] = form[f.key]; });
            const data = await apiFetch(`/api/channel-sync/${ch.id}/test`, {
                method: 'POST',
                body: JSON.stringify({ ...extras, key_value: form[ch.fields[0]?.key] || '' }),
            });
            setResult(data);
        } catch (e) {
            setResult({ ok: false, error: e.message });
        }
        setLoading(false);
    };

    return (
        <div style={{
            padding: '16px 20px', marginTop: 8, borderRadius: 12, background: 'rgba(0,0,0,0.35)',
            border: `1px solid ${ch.color}22`, display: 'grid', gap: 10
        }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: ch.color, letterSpacing: 1, marginBottom: 2 }}>
                🔑 {ch.name} 인증 Info 입력
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                {ch.fields.map(f => (
                    <div key={f.key}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
                        <input
                            type={f.secret ? 'password' : 'text'}
                            placeholder={f.ph}
                            value={form[f.key] || ''}
                            onChange={e => set(f.key, e.target.value)}
                            style={{
                                width: '100%', padding: '7px 10px', borderRadius: 8,
                                border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)',
                                color: '#fff', fontSize: 12, boxSizing: 'border-box'
                            }}
                        />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleTest} disabled={loading}
                    style={{
                        padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.4)',
                        background: 'transparent', color: '#4f8ef7', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                    }}>
                    {loading ? '⏳' : '🔍 Connect Test'}
                </button>
                <button onClick={handleSave} disabled={loading}
                    style={{
                        padding: '7px 20px', borderRadius: 8, border: 'none',
                        background: `linear-gradient(135deg,${ch.color},#4f8ef7)`,
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                    }}>
                    {loading ? '⏳ Save in progress…' : '💾 Save + Sync Now'}
                </button>
            </div>
            {result && (
                <div style={{
                    padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.6,
                    background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${result.ok ? '#22c55e' : '#ef4444'}33`,
                    color: result.ok ? '#22c55e' : '#ef4444'
                }}>
                    {result.ok
                        ? `✓ ${result.message || result.note || `Integration Done — Product ${result.product_count ?? 0}개, Orders ${result.order_count ?? 0}건 Count집`}`
                        : `✗ ${result.message || result.error || 'Integration Failed'}`}
                </div>
            )}
        </div>
    );
}

/* ═══ TAB 1: Channel Integration Management ══════════════════════════════════════════════════ */
function ChannelTab({ channelStatus, onRefresh, plan, isDemo }) {
    const { fmt } = useCurrency();
    const [expanded, setExpanded] = useState({});
    const [syncing, setSyncing] = useState({});

    const toggle = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

    const syncNow = async (chId) => {
        setSyncing(s => ({ ...s, [chId]: true }));
        await apiFetch(`/api/channel-sync/${chId}/sync`, { method: 'POST' });
        onRefresh();
        setSyncing(s => ({ ...s, [chId]: false }));
    };

    const grouped = CHANNELS_MASTER.reduce((m, c) => {
        (m[c.type] || (m[c.type] = [])).push(c);
        return m;
    }, {});

    const statusMap = {};
    (channelStatus?.channels || []).forEach(c => { statusMap[c.id] = c; });

    const totalConnected = (channelStatus?.channels || []).filter(c => c.status === 'ok' || c.status === 'connected').length;

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            {/* KPI Card */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { l: 'All Channel', v: CHANNELS_MASTER.length, c: '#4f8ef7' },
                    { l: 'Integration Done', v: totalConnected, c: '#22c55e' },
                    { l: 'Count집 Product', v: (channelStatus?.totals?.products || 0).toLocaleString(), c: '#a855f7' },
                    { l: 'Count집 Orders', v: (channelStatus?.totals?.orders || 0).toLocaleString(), c: '#eab308' },
                ].map(k => (
                    <div key={k.l} style={{ padding: '14px 18px', borderRadius: 12, background: `${k.c}08`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{k.l}</div>
                    </div>
                ))}
            </div>

            {/* 플랜 배지 */}
            <div style={{
                padding: '9px 16px', borderRadius: 10, background: plan === 'pro' ? 'rgba(168,85,247,0.1)' : 'rgba(79,142,247,0.1)',
                border: `1px solid ${plan === 'pro' ? '#a855f7' : '#4f8ef7'}33`, fontSize: 12, color: 'var(--text-2)'
            }}>
                {plan === 'pro'
                    ? '🔑 Pro 모드: 실제 Channel API 호출 → Product/Orders 실Time Count집'
                    : '🎮 Demo Mode: 시뮬레이션 데이터 표시 (Pro Subscription 시 실 데이터 Integration)'}
            </div>

            {/* Channel 그룹per 표시 */}
            {Object.entries(grouped).map(([type, chs]) => (
                <div key={type} className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-1)', marginBottom: 14 }}>
                        🔌 {type} Channel
                    </div>
                    {chs.map(ch => {
                        const st = statusMap[ch.id] || {};
                        const statusKey = st.status || 'not_configured';
                        const sStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.none;
                        return (
                            <div key={ch.id} style={{ marginBottom: 10 }}>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 14,
                                    alignItems: 'center', padding: '12px 14px', borderRadius: 12,
                                    background: 'rgba(0,0,0,0.3)', border: `1px solid ${ch.color}22`
                                }}>
                                    {/* Icon */}
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 10, background: `${ch.color}18`,
                                        border: `1px solid ${ch.color}33`, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontWeight: 900, fontSize: 13, color: ch.color
                                    }}>
                                        {ch.icon}
                                    </div>
                                    {/* Name + Statistics */}
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{ch.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                                            Product {(st.product_count || 0).toLocaleString()} · Orders {(st.order_count || 0).toLocaleString()} · Revenue {fmt(st.revenue || 0)}
                                            {st.last_synced && ` · ${new Date(st.last_synced).toLocaleTimeString('ko-KR')} Sync`}
                                        </div>
                                    </div>
                                    {/* Status */}
                                    <Tag label={sStyle.label} color={sStyle.color} />
                                    {/* 지금 Sync Button */}
                                    {(statusKey === 'ok' || statusKey === 'connected') && (
                                        <button onClick={() => syncNow(ch.id)} disabled={syncing[ch.id]}
                                            style={{
                                                padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.4)',
                                                background: 'transparent', color: '#4f8ef7', fontSize: 11, cursor: 'pointer', fontWeight: 600
                                            }}>
                                            {syncing[ch.id] ? '⏳' : '🔄 Sync'}
                                        </button>
                                    )}
                                    {/* 펼치기 */}
                                    <button onClick={() => toggle(ch.id)}
                                        style={{
                                            padding: '5px 14px', borderRadius: 8, border: 'none',
                                            background: expanded[ch.id]
                                                ? `linear-gradient(135deg,${ch.color},#4f8ef7)`
                                                : 'rgba(255,255,255,0.06)',
                                            color: expanded[ch.id] ? '#fff' : 'var(--text-2)',
                                            fontSize: 11, fontWeight: 700, cursor: 'pointer'
                                        }}>
                                        {expanded[ch.id] ? '▲ Close' : '🔑 인증키 입력'}
                                    </button>
                                </div>
                                {expanded[ch.id] && (
                                    <ChannelAuthPanel ch={ch} isDemo={isDemo} onSaved={() => { toggle(ch.id); onRefresh(); }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

/* ═══ TAB 2: Count집 Product List ══════════════════════════════════════════════════ */
function ProductsTab({ plan }) {
    const { fmt } = useCurrency();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [channel, setChannel] = useState('');
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const data = await apiFetch(`/api/channel-sync/products?limit=100${channel ? '&channel=' + channel : ''}`);
        setProducts(data.products || []);
        setLoading(false);
    }, [channel]);

    useEffect(() => { load(); }, [load]);

    const filtered = products.filter(p =>
        !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').includes(search)
    );

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="input" style={{ flex: '1 1 200px' }} placeholder="Product Name·SKU Search…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ width: 160 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">All Channel</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-primary" onClick={load} style={{ padding: '7px 16px', fontSize: 12 }}>🔄 Refresh</button>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{filtered.length}개 Product</span>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>⏳ Loading…</div>
            ) : (
                <div className="card card-glass" style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Channel</th><th>ID</th><th>Product Name</th><th>SKU</th>
                                <th>Sale Price</th><th>Stock</th><th>Category</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === p.channel);
                                return (
                                    <tr key={p.id || i}>
                                        <td>
                                            {ch && <span style={{ fontSize: 13 }}>{ch.icon}</span>}
                                            <span style={{ fontSize: 10, color: ch?.color || '#4f8ef7', marginLeft: 4 }}>{ch?.name || p.channel}</span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{p.channel_product_id}</td>
                                        <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-3)' }}>{p.sku}</td>
                                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(p.price)}</td>
                                        <td style={{ color: p.inventory < 20 ? '#ef4444' : p.inventory < 80 ? '#eab308' : '#22c55e', fontWeight: 700 }}>{p.inventory}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.category || '—'}</td>
                                        <td><Tag label={p.status || 'active'} color={p.status === 'active' ? '#22c55e' : '#666'} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ═══ TAB 3: Count집 Orders List ══════════════════════════════════════════════════ */
function OrdersTab({ plan }) {
    const { fmt } = useCurrency();
    const { orders, setOrders, updateOrderStatus } = useGlobalData();
    const [loading, setLoading] = useState(true);
    const [channel, setChannel] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const STATUSES = ['발주Confirm', '출고Pending', '배송in progress', '배송Done', 'Cancel요청', '반품접Count'];
    const STATUS_COLOR = { '배송in progress': '#4f8ef7', '배송Done': '#22c55e', '발주Confirm': '#eab308', '출고Pending': '#a855f7', 'Cancel요청': '#ef4444', '반품접Count': '#f97316', '반품Done': '#a855f7' };

    const load = useCallback(async () => {
        setLoading(true);
        const qs = new URLSearchParams({ limit: '100' });
        if (channel) qs.set('channel', channel);
        if (statusFilter) qs.set('status', statusFilter);
        const data = await apiFetch(`/api/channel-sync/orders?${qs}`);
        setOrders(data.orders || []);
        setLoading(false);
    }, [channel, statusFilter]);

    useEffect(() => { load(); }, [load]);

    const { isDemo } = useAuth();
    // GlobalDataContext Integration — Orders Status Change 시 CRM/Dashboard에 반영
    const handleStatusUpdate = async (orderId, newStatus) => {
        if (isDemo) { alert('📌 Demo Mode: Orders Status Change은 실사용 Account에서만 가능합니다.'); return; }
        await apiFetch(`/api/channel-sync/webhooks/${channel || 'shopify'}`, {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId, status: newStatus, event: 'order_update' }),
        });
        if (updateOrderStatus) updateOrderStatus(orderId, { status: newStatus });
        load();
    };

    const summary = STATUSES.map(s => ({ s, cnt: orders.filter(o => o.status === s).length }));

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {/* Statusper Card */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {summary.map(({ s, cnt }) => (
                    <div key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                        style={{
                            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                            background: `${STATUS_COLOR[s] || '#666'}${statusFilter === s ? '20' : '08'}`,
                            border: `1px solid ${STATUS_COLOR[s] || '#666'}${statusFilter === s ? '55' : '22'}`
                        }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: STATUS_COLOR[s] || '#666' }}>{cnt}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" style={{ width: 160 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">All Channel</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-primary" onClick={load} style={{ padding: '7px 16px', fontSize: 12 }}>🔄 Refresh</button>
                <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>{orders.length} items</span>
            </div>

            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>⏳ Loading…</div> : (
                <div className="card card-glass" style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ minWidth: 900 }}>
                        <thead>
                            <tr>
                                <th>Channel</th><th>Orders번호</th><th>구매자</th><th>Product</th>
                                <th>Quantity</th><th>Amount</th><th>Status</th><th>택배사</th><th>Orders일시</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === o.channel);
                                const sc = STATUS_COLOR[o.status] || '#666';
                                return (
                                    <tr key={o.id || i}>
                                        <td>
                                            {ch && <span style={{ fontSize: 14 }}>{ch.icon}</span>}
                                            <span style={{ fontSize: 10, marginLeft: 4, color: ch?.color || '#4f8ef7' }}>{ch?.name || o.channel}</span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.channel_order_id}</td>
                                        <td style={{ fontSize: 12 }}>{o.buyer_name}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{o.product_name}</td>
                                        <td style={{ textAlign: 'center' }}>{o.qty}</td>
                                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(o.total_price)}</td>
                                        <td>
                                            <select onChange={e => handleStatusUpdate(o.channel_order_id, e.target.value)}
                                                value={o.status}
                                                style={{
                                                    padding: '3px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.4)',
                                                    border: `1px solid ${sc}44`, color: sc, fontSize: 11, cursor: 'pointer'
                                                }}>
                                                {STATUSES.map(s => <option key={s} value={s} style={{ color: '#fff' }}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{o.carrier || '—'}</td>
                                        <td style={{ fontSize: 10, color: 'var(--text-3)' }}>{o.ordered_at?.slice?.(0, 16) || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ═══ TAB 4: Stock 현황 ════════════════════════════════════════════════════════ */
function InventoryTab({ plan }) {
    const [inv, setInv] = useState([]);
    const [loading, setLoading] = useState(true);
    const [channel, setChannel] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const data = await apiFetch(`/api/channel-sync/inventory${channel ? '?channel=' + channel : ''}`);
        setInv(data.inventory || []);
        setLoading(false);
    }, [channel]);

    useEffect(() => { load(); }, [load]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" style={{ width: 180 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">All Channel</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-primary" onClick={load} style={{ padding: '7px 16px', fontSize: 12 }}>🔄 Refresh</button>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>⏳ Loading…</div> : (
                <div className="card card-glass" style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr><th>Channel</th><th>SKU</th><th>Product Name</th><th>가용Stock</th><th>예약Stock</th><th>창고</th><th>Sync</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {inv.map((r, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === r.channel);
                                const avail = r.available ?? 0;
                                const color = avail < 10 ? '#ef4444' : avail < 50 ? '#eab308' : '#22c55e';
                                return (
                                    <tr key={i}>
                                        <td>{ch && <><span style={{ fontSize: 13 }}>{ch.icon}</span> <span style={{ fontSize: 10, color: ch.color }}>{ch.name}</span></>}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{r.sku}</td>
                                        <td style={{ fontSize: 12 }}>{r.product_name}</td>
                                        <td style={{ fontWeight: 900, fontSize: 14, color, textAlign: 'center' }}>{avail}</td>
                                        <td style={{ textAlign: 'center', color: '#eab308' }}>{r.reserved ?? 0}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.warehouse || 'default'}</td>
                                        <td style={{ fontSize: 10, color: 'var(--text-3)' }}>{r.synced_at?.slice?.(0, 16) || '—'}</td>
                                        <td><Tag label={avail < 10 ? '부족' : '정상'} color={color} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ═══ TAB 5: Unified 현황 Dashboard ══════════════════════════════════════════════ */
function OverviewTab({ channelStatus }) {
    const { fmt } = useCurrency();
    const channels = channelStatus?.channels || [];
    const totalRev = channels.reduce((s, c) => s + (c.revenue || 0), 0);
    return (
        <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { l: 'Integration Channel Count', v: channels.filter(c => c.status === 'ok' || c.status === 'connected').length + '개', c: '#4f8ef7' },
                    { l: 'Count집 Product', v: (channelStatus?.totals?.products || 0).toLocaleString() + '개', c: '#22c55e' },
                    { l: 'Count집 Orders', v: (channelStatus?.totals?.orders || 0).toLocaleString() + '건', c: '#a855f7' },
                    { l: 'Total Revenue', v: fmt(channelStatus?.totals?.revenue || 0), c: '#eab308' },
                ].map(k => (
                    <div key={k.l} style={{ padding: '16px 20px', borderRadius: 14, background: `${k.c}08`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{k.l}</div>
                    </div>
                ))}
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-1)', marginBottom: 14 }}>📊 Channelper 종합 현황</div>
                <table className="table">
                    <thead>
                        <tr><th>Channel</th><th>Type</th><th>Status</th><th>Product</th><th>Orders</th><th>Revenue</th><th>Revenue 점유율</th></tr>
                    </thead>
                    <tbody>
                        {channels.sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map(c => {
                            const ch = CHANNELS_MASTER.find(m => m.id === c.id);
                            const share = totalRev > 0 ? ((c.revenue || 0) / totalRev * 100).toFixed(1) : 0;
                            const st = STATUS_STYLES[c.status] || STATUS_STYLES.none;
                            return (
                                <tr key={c.id}>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16 }}>{c.icon || ch?.icon || '🔌'}</span>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{c.name || ch?.name}</span>
                                    </td>
                                    <td><Tag label={c.type || 'Channel'} color="#6366f1" /></td>
                                    <td><Tag label={st.label} color={st.color} /></td>
                                    <td style={{ textAlign: 'center', color: '#4f8ef7', fontWeight: 700 }}>{(c.product_count || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{(c.order_count || 0).toLocaleString()}</td>
                                    <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(c.revenue || 0)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <div style={{ flex: 1, height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                                <div style={{ width: `${share}%`, height: '100%', background: c.color || '#4f8ef7', borderRadius: 5 }} />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: c.color || '#4f8ef7', minWidth: 36 }}>{share}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ═══ MAIN ════════════════════════════════════════════════════════════════════ */
const TABS = [
    { id: 'channels', label: '🔌 Channel Integration', desc: '[인증키 입력 → Sync Now]' },
    { id: 'products', label: '📦 Count집 Product', desc: '[Auto Register된 Product List]' },
    { id: 'orders', label: '📋 Count집 Orders', desc: '[구매·반품·배송 Unified]' },
    { id: 'inventory', label: '🏭 Stock 현황', desc: '[Channelper 실Time Stock]' },
    { id: 'overview', label: '📊 Unified 현황', desc: '[KPI Dashboard]' },
];

export default function OmniChannel() {
  const t = useT();
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { orderStats } = useGlobalData();
    const { isDemo } = useAuth();
    const [tab, setTab] = useState('channels');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStatus = useCallback(async () => {
        setLoading(true);
        const data = await apiFetch('/api/channel-sync/status');
        setStatus(data);
        setLoading(false);
    }, []);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    const plan = status?.plan || 'demo';

    return (
        <div style={{ display: 'grid', gap: 18, padding: 4 }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title grad-blue-purple">🌐 멀티Channel Unified 커머스 허브</div>
                        <div className="hero-desc">인증키 Register만으로 Product Auto Register · 구매/반품/배송 실Time Count집 · Stock Sync</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{CHANNELS_MASTER.length}개 Channel 지원</span>
                            <span className="badge badge-teal">Domestic·Global·Japan</span>
                            {plan === 'pro'
                                ? <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>⚡ Pro 실Integration</span>
                                : <span className="badge badge-purple">🎮 Free체험 Demo</span>}
                            <span className="badge" style={{ background: 'rgba(79,142,247,0.15)', color: '#60a5fa', border: '1px solid rgba(79,142,247,0.3)' }}>Orders {orderStats?.count || 0}건 Management in progress</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Unified Count집 Revenue</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#22c55e' }}>{fmt(status?.totals?.revenue || 0)}</div>
                        <button onClick={() => navigate('/wms-manager')} style={{ marginTop: 8, padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>창고 Stock Confirm →</button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{
                            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11,
                            background: tab === t.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                            color: tab === t.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms'
                        }}>
                        <div>{t.label}</div>
                        <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 1 }}>{t.desc}</div>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'channels' && <ChannelTab channelStatus={status} onRefresh={loadStatus} plan={plan} isDemo={isDemo} />}
            {tab === 'products' && <ProductsTab plan={plan} />}
            {tab === 'orders' && <OrdersTab plan={plan} />}
            {tab === 'inventory' && <InventoryTab plan={plan} />}
            {tab === 'overview' && <OverviewTab channelStatus={status} />}
        </div>
    );
}
