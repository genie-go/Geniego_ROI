import urllib.request
import re

path = 'D:/project/GeniegoROI/frontend/src/pages/OmniChannel.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('function ChannelAuthPanel({ ch, onSaved, isDemo, t }) {')
if idx != -1:
    clean_tail = """function ChannelAuthPanel({ ch, onSaved, isDemo, t }) {
    const [form, setForm] = React.useState({});
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState(null);
    const set = React.useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

    const handleSave = React.useCallback(async () => {
        if (isDemo) { alert(t('omniChannel.demoSaveMsg')); return; }
        for (const f of ch.fields) {
            // Simplified XSS validation for UI
            if (form[f.key] && form[f.key].includes('<script')) {
                setResult({ ok: false, error: `🛡️ ${t('omniChannel.xssBlocked')}` });
                return;
            }
        }
        setLoading(true); setResult(null);
        try {
            const mainField = ch.fields.find(f => f.secret) || ch.fields[0];
            const extras = {};
            ch.fields.forEach(f => { if (f.key !== mainField.key && form[f.key]) extras[f.key] = form[f.key]; });
            const data = await apiFetch('/api/channel-sync/credentials', {
                method: 'POST',
                body: JSON.stringify({ channel: ch.id, cred_type: 'api_key', label: ch.name,
                    key_name: mainField.key, key_value: form[mainField.key] || '', ...extras }),
            });
            setResult(data);
            if (data.ok && onSaved) onSaved(ch.id, data);
        } catch (e) { setResult({ ok: false, error: e.message }); }
        setLoading(false);
    }, [ch, form, isDemo, onSaved, t]);

    const handleTest = React.useCallback(async () => {
        if (isDemo) { alert(t('omniChannel.demoTestMsg')); return; }
        setLoading(true); setResult(null);
        try {
            const extras = {};
            ch.fields.forEach(f => { if (form[f.key]) extras[f.key] = form[f.key]; });
            const data = await apiFetch(`/api/channel-sync/${ch.id}/test`, {
                method: 'POST', body: JSON.stringify({ ...extras, key_value: form[ch.fields[0]?.key] || '' }),
            });
            setResult(data);
        } catch (e) { setResult({ ok: false, error: e.message }); }
        setLoading(false);
    }, [ch, form, isDemo, t]);

    return (
        <div style={{ padding: '16px 20px', marginTop: 8, borderRadius: 12, background: 'rgba(0,0,0,0.35)', border: `1px solid ${ch.color}22`, display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: ch.color, letterSpacing: 1, marginBottom: 2 }}>
                {"🔑"} {ch.name} — {t('omniChannel.authTitle')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                {ch.fields.map(f => (
                    <div key={f.key}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
                        <input type={f.secret ? 'password' : 'text'} placeholder={f.ph}
                            value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'rgba(15,20,40,0.7)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleTest} disabled={loading}
                    style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.4)', background: 'transparent', color: '#4f8ef7', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? '⏳' : `🔍 ${t('omniChannel.btnConnTest')}`}
                </button>
                <button onClick={handleSave} disabled={loading}
                    style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${ch.color},#4f8ef7)`, color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? `⏳ ${t('omniChannel.savingProgress')}` : `💾 ${t('omniChannel.btnSaveSync')}`}
                </button>
            </div>
            {result && (
                <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, background: result.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.ok ? '#22c55e' : '#ef4444'}33`, color: result.ok ? '#22c55e' : '#ef4444' }}>
                    {result.ok
                        ? `✓ ${result.message || t('omniChannel.integSuccess').replace('{{products}}', result.product_count ?? 0).replace('{{orders}}', result.order_count ?? 0)}`
                        : `✗ ${result.message || result.error || t('omniChannel.integFail')}`}
                </div>
            )}
        </div>
    );
}

function ChannelTab({ channelStatus, onRefresh, plan, isDemo, t, csIsConnected }) {
    const { fmt } = useCurrency();
    const [expanded, setExpanded] = React.useState({});
    const [syncing, setSyncing] = React.useState({});
    const toggle = React.useCallback(id => setExpanded(e => ({ ...e, [id]: !e[id] })), []);

    const syncNow = React.useCallback(async (chId) => {
        setSyncing(s => ({ ...s, [chId]: true }));
        await apiFetch(`/api/channel-sync/${chId}/sync`, { method: 'POST' });
        onRefresh();
        setSyncing(s => ({ ...s, [chId]: false }));
    }, [onRefresh]);

    const grouped = React.useMemo(() => CHANNELS_MASTER.reduce((m, c) => { (m[c.type] || (m[c.type] = [])).push(c); return m; }, {}), []);

    const statusMap = React.useMemo(() => {
        const m = {};
        (channelStatus?.channels || []).forEach(c => { m[c.id] = c; });
        return m;
    }, [channelStatus]);

    const totalConnected = React.useMemo(() => (channelStatus?.channels || []).filter(c => c.status === 'ok' || c.status === 'connected').length, [channelStatus]);

    const STATUS_STYLES = React.useMemo(() => ({
        ok: { label: `✓ ${t('omniChannel.statusIntegrated')}`, color: '#22c55e' },
        connected: { label: `✓ ${t('omniChannel.statusIntegrated')}`, color: '#22c55e' },
        error: { label: `⚠ ${t('omniChannel.statusError')}`, color: '#ef4444' },
        untested: { label: `● ${t('omniChannel.statusUntested')}`, color: '#eab308' },
        not_configured: { label: `○ ${t('omniChannel.statusNotConfig')}`, color: '#666' },
        none: { label: `○ ${t('omniChannel.statusNotConfig')}`, color: '#666' },
    }), [t]);

    const GROUP_LABELS = React.useMemo(() => ({
        Global: t('omniChannel.groupGlobal'),
        Japan: t('omniChannel.groupJapan'),
        Domestic: t('omniChannel.groupDomestic'),
    }), [t]);

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { l: t('omniChannel.kpiAllChannel'), v: CHANNELS_MASTER.length, c: '#4f8ef7' },
                    { l: t('omniChannel.kpiIntegDone'), v: totalConnected, c: '#22c55e' },
                    { l: t('omniChannel.kpiProducts'), v: (channelStatus?.totals?.products || 0).toLocaleString(), c: '#a855f7' },
                    { l: t('omniChannel.kpiOrders'), v: (channelStatus?.totals?.orders || 0).toLocaleString(), c: '#eab308' },
                ].map(k => (
                    <div key={k.l} style={{ padding: '14px 18px', borderRadius: 12, background: `${k.c}08`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{k.l}</div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '9px 16px', borderRadius: 10, background: plan === 'pro' ? 'rgba(168,85,247,0.1)' : 'rgba(79,142,247,0.1)', border: `1px solid ${plan === 'pro' ? '#a855f7' : '#4f8ef7'}33`, fontSize: 12, color: 'var(--text-2)' }}>
                {plan === 'pro' ? `🔑 ${t('omniChannel.planPro')}` : `🎮 ${t('omniChannel.planFree')}`}
            </div>

            {Object.entries(grouped).map(([type, chs]) => (
                <div key={type} className="card card-glass">
                    <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-1)', marginBottom: 14 }}>
                        {"🔌"} {GROUP_LABELS[type] || type}
                    </div>
                    {chs.map(ch => {
                        const st = statusMap[ch.id] || {};
                        const statusKey = st.status || 'not_configured';
                        const sStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.none;
                        return (
                            <div key={ch.id} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 14, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'var(--surface)', border: `1px solid ${ch.color}22` }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ch.color}18`, border: `1px solid ${ch.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: ch.color }}>{ch.icon}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{ch.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                                            {t('omniChannel.colProduct')} {(st.product_count || 0).toLocaleString()} · {t('omniChannel.colOrderNo')} {(st.order_count || 0).toLocaleString()} · {t('omniChannel.colRevenue')} {fmt(st.revenue || 0)}
                                        </div>
                                    </div>
                                    <Tag label={sStyle.label} color={sStyle.color} />
                                    {(statusKey === 'ok' || statusKey === 'connected') && (
                                        <button onClick={() => syncNow(ch.id)} disabled={syncing[ch.id]} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.4)', background: 'transparent', color: '#4f8ef7', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                            {syncing[ch.id] ? '⏳' : `🔄 ${t('omniChannel.btnSync')}`}
                                        </button>
                                    )}
                                    <button onClick={() => toggle(ch.id)} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: expanded[ch.id] ? `linear-gradient(135deg,${ch.color},#4f8ef7)` : 'rgba(255,255,255,0.06)', color: expanded[ch.id] ? '#fff' : 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                        {expanded[ch.id] ? `▲ ${t('omniChannel.btnClose')}` : `🔑 ${t('omniChannel.btnAuthKey')}`}
                                    </button>
                                </div>
                                {expanded[ch.id] && (
                                    <ChannelAuthPanel ch={ch} isDemo={isDemo} t={t} onSaved={() => { toggle(ch.id); onRefresh(); }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function ProductsTab({ t }) {
    const { fmt } = useCurrency();
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [channel, setChannel] = React.useState('');
    const [search, setSearch] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        const data = await apiFetch(`/api/channel-sync/products?limit=100${channel ? '&channel=' + channel : ''}`);
        setProducts(data.products || []);
        setLoading(false);
    }, [channel]);

    React.useEffect(() => { load(); }, [load]);

    const filtered = React.useMemo(() => products.filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').includes(search)), [products, search]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="input" style={{ flex: '1 1 200px' }} placeholder={t('omniChannel.searchPlaceholder')}
                    value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ width: 160 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">{t('omniChannel.allChannel')}</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-primary" onClick={load} style={{ padding: '7px 16px', fontSize: 12 }}>{"🔄"} {t('omniChannel.btnRefresh')}</button>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('omniChannel.productCount').replace('{{n}}', filtered.length)}</span>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>{"⏳"} {t('omniChannel.loading')}</div>
            ) : (
                <div className="card card-glass" style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead><tr>
                            <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colId')}</th><th>{t('omniChannel.colProductName')}</th><th>{t('omniChannel.colSku')}</th>
                            <th>{t('omniChannel.colSalePrice')}</th>
                            <th style={{ color: '#f59e0b' }}>{t('omniChannel.colCommission') || t('catalogSync.colCommission') || 'Commission'}</th>
                            <th style={{ color: '#6366f1' }}>{t('omniChannel.colVatTax') || t('catalogSync.colVatTax') || 'VAT'}</th>
                            <th>{t('omniChannel.colStock')}</th><th>{t('omniChannel.colCategory')}</th><th>{t('omniChannel.colStatus')}</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
                            {filtered.map((p, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === p.channel);
                                const rate = CHANNEL_RATES[p.channel] || { commission: 0.10, vat: 0.00 };
                                const commAmt = (p.price || 0) * rate.commission;
                                const vatAmt = (p.price || 0) * rate.vat;
                                return (
                                    <tr key={p.id || i}>
                                        <td>{ch && <span style={{ fontSize: 13 }}>{ch.icon}</span>}<span style={{ fontSize: 10, color: ch?.color || '#4f8ef7', marginLeft: 4 }}>{ch?.name || p.channel}</span></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{p.channel_product_id}</td>
                                        <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-3)' }}>{p.sku}</td>
                                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(p.price)}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#f59e0b' }}>{fmt(Math.round(commAmt))} <span style={{ fontSize: 9, opacity: 0.7 }}>({(rate.commission * 100).toFixed(0)}%)</span></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#6366f1' }}>{rate.vat > 0 ? `${fmt(Math.round(vatAmt))}` : '—'} <span style={{ fontSize: 9, opacity: 0.7 }}>({(rate.vat * 100).toFixed(0)}%)</span></td>
                                        <td style={{ color: p.inventory < 20 ? '#ef4444' : p.inventory < 80 ? '#eab308' : '#22c55e', fontWeight: 700 }}>{p.inventory}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.category || '—'}</td>
                                        <td><Tag label={p.status === 'active' ? t('omniChannel.statusActive') : (p.status || t('omniChannel.statusActive'))} color={p.status === 'active' ? '#22c55e' : '#666'} /></td>
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

function OrdersTab({ t }) {
    const { fmt } = useCurrency();
    const { orders, setOrders, updateOrderStatus, addAlert } = useGlobalData();
    const { isDemo } = useAuth();
    const [loading, setLoading] = React.useState(true);
    const [channel, setChannel] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('');

    const STATUS_KEYS = React.useMemo(() => ['statusConfirm','statusShipPending','statusShipping','statusDelivered','statusCancelReq','statusReturnRecv'], []);
    const STATUSES = React.useMemo(() => STATUS_KEYS.map(k => t(`omniChannel.${k}`)), [t, STATUS_KEYS]);
    const STATUS_COLORS = React.useMemo(() => {
        const colors = ['#eab308','#a855f7','#4f8ef7','#22c55e','#ef4444','#f97316'];
        const map = {};
        STATUSES.forEach((s, i) => { map[s] = colors[i]; });
        return map;
    }, [STATUSES]);

    const load = React.useCallback(async () => {
        setLoading(true);
        const qs = new URLSearchParams({ limit: '100' });
        if (channel) qs.set('channel', channel);
        if (statusFilter) qs.set('status', statusFilter);
        const data = await apiFetch(`/api/channel-sync/orders?${qs}`);
        setOrders(data.orders || []);
        setLoading(false);
    }, [channel, statusFilter, setOrders]);

    React.useEffect(() => { load(); }, [load]);

    const handleStatusUpdate = React.useCallback(async (orderId, newStatus) => {
        if (isDemo) { alert(t('omniChannel.demoStatusMsg')); return; }
        await apiFetch(`/api/channel-sync/webhooks/${channel || 'shopify'}`, { method: 'POST', body: JSON.stringify({ order_id: orderId, status: newStatus, event: 'order_update' }) });
        if (updateOrderStatus) updateOrderStatus(orderId, { status: newStatus });
        addAlert?.({ type: 'success', msg: `Order ${orderId} → ${newStatus}` });
        load();
    }, [isDemo, t, channel, updateOrderStatus, addAlert, load]);

    const summary = React.useMemo(() => STATUSES.map(s => ({ s, cnt: orders.filter(o => o.status === s).length })), [STATUSES, orders]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {summary.map(({ s, cnt }) => (
                    <div key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: `${STATUS_COLORS[s] || '#666'}${statusFilter === s ? '20' : '08'}`, border: `1px solid ${STATUS_COLORS[s] || '#666'}${statusFilter === s ? '55' : '22'}` }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: STATUS_COLORS[s] || '#666' }}>{cnt}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" style={{ width: 160 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">{t('omniChannel.allChannel')}</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-primary" onClick={load} style={{ padding: '7px 16px', fontSize: 12 }}>{"🔄"} {t('omniChannel.btnRefresh')}</button>
                <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>{t('omniChannel.items').replace('{{n}}', orders.length)}</span>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>{"⏳"} {t('omniChannel.loading')}</div> : (
                <div className="card card-glass" style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ minWidth: 900 }}>
                        <thead><tr>
                            <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colOrderNo')}</th><th>{t('omniChannel.colBuyer')}</th><th>{t('omniChannel.colProduct')}</th>
                            <th>{t('omniChannel.colQuantity')}</th><th>{t('omniChannel.colAmount')}</th><th>{t('omniChannel.colStatus')}</th><th>{t('omniChannel.colCarrier')}</th><th>{t('omniChannel.colOrderDate')}</th>
                        </tr></thead>
                        <tbody>
                            {orders.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
                            {orders.map((o, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === o.channel);
                                const sc = STATUS_COLORS[o.status] || '#666';
                                return (
                                    <tr key={o.id || i}>
                                        <td>{ch && <span style={{ fontSize: 14 }}>{ch.icon}</span>}<span style={{ fontSize: 10, marginLeft: 4, color: ch?.color || '#4f8ef7' }}>{ch?.name || o.channel}</span></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.channel_order_id}</td>
                                        <td style={{ fontSize: 12 }}>{o.buyer_name}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{o.product_name}</td>
                                        <td style={{ textAlign: 'center' }}>{o.qty}</td>
                                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(o.total_price)}</td>
                                        <td>
                                            <select onChange={e => handleStatusUpdate(o.channel_order_id, e.target.value)} value={o.status} style={{ padding: '3px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.4)', border: `1px solid ${sc}44`, color: sc, fontSize: 11, cursor: 'pointer' }}>
                                                {STATUSES.map(s => <option key={s} value={s} style={{ color: 'var(--text-1)' }}>{s}</option>)}
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

function InventoryTab({ t }) {
    const { inventory: ctxInventory } = useGlobalData();
    const [inv, setInv] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [channel, setChannel] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        const data = await apiFetch(`/api/channel-sync/inventory${channel ? '?channel=' + channel : ''}`);
        setInv(data.inventory || []);
        setLoading(false);
    }, [channel]);

    React.useEffect(() => { load(); }, [load]);

    const mergedInv = React.useMemo(() => {
        if (inv.length > 0) return inv;
        return ctxInventory || [];
    }, [inv, ctxInventory]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <select className="input" style={{ width: 180 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">{t('omniChannel.allChannel')}</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn-primary" onClick={load} style={{ padding: '7px 16px', fontSize: 12 }}>{"🔄"} {t('omniChannel.btnRefresh')}</button>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>{"⏳"} {t('omniChannel.loading')}</div> : (
                <div className="card card-glass" style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead><tr>
                            <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colSku')}</th><th>{t('omniChannel.colProductName')}</th>
                            <th>{t('omniChannel.colAvailStock')}</th><th>{t('omniChannel.colReserved')}</th><th>{t('omniChannel.colWarehouse')}</th>
                            <th>{t('omniChannel.colSync')}</th><th>{t('omniChannel.colStatus')}</th>
                        </tr></thead>
                        <tbody>
                            {mergedInv.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
                            {mergedInv.map((r, i) => {
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
                                        <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.warehouse || t('omniChannel.defaultWarehouse')}</td>
                                        <td style={{ fontSize: 10, color: 'var(--text-3)' }}>{r.synced_at?.slice?.(0, 16) || '—'}</td>
                                        <td><Tag label={avail < 10 ? t('omniChannel.stockLow') : t('omniChannel.stockNormal')} color={color} /></td>
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

function OverviewTab({ channelStatus, t }) {
    const { fmt } = useCurrency();
    const channels = React.useMemo(() => channelStatus?.channels || [], [channelStatus]);
    const totalRev = React.useMemo(() => channels.reduce((s, c) => s + (c.revenue || 0), 0), [channels]);

    const STATUS_STYLES = React.useMemo(() => ({
        ok: { label: `✓ ${t('omniChannel.statusIntegrated')}`, color: '#22c55e' },
        connected: { label: `✓ ${t('omniChannel.statusIntegrated')}`, color: '#22c55e' },
        error: { label: `⚠ ${t('omniChannel.statusError')}`, color: '#ef4444' },
        untested: { label: `● ${t('omniChannel.statusUntested')}`, color: '#eab308' },
        not_configured: { label: `○ ${t('omniChannel.statusNotConfig')}`, color: '#666' },
        none: { label: `○ ${t('omniChannel.statusNotConfig')}`, color: '#666' },
    }), [t]);

    const sortedChannels = React.useMemo(() => [...channels].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)), [channels]);

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { l: t('omniChannel.kpiIntegChannels'), v: channels.filter(c => c.status === 'ok' || c.status === 'connected').length, c: '#4f8ef7' },
                    { l: t('omniChannel.kpiTotalProducts'), v: (channelStatus?.totals?.products || 0).toLocaleString(), c: '#22c55e' },
                    { l: t('omniChannel.kpiTotalOrders'), v: (channelStatus?.totals?.orders || 0).toLocaleString(), c: '#a855f7' },
                    { l: t('omniChannel.kpiTotalRevenue'), v: fmt(channelStatus?.totals?.revenue || 0), c: '#eab308' },
                ].map(k => (
                    <div key={k.l} style={{ padding: '16px 20px', borderRadius: 14, background: `${k.c}08`, border: `1px solid ${k.c}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{k.l}</div>
                    </div>
                ))}
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--text-1)', marginBottom: 14 }}>{"📊"} {t('omniChannel.overviewTitle')}</div>
                <table className="table">
                    <thead><tr>
                        <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colType')}</th><th>{t('omniChannel.colStatus')}</th>
                        <th style={{ color: '#f59e0b' }}>{t('omniChannel.colCommission') || 'Commission'}</th>
                        <th>{t('omniChannel.colProduct')}</th><th>{t('omniChannel.colOrderNo')}</th><th>{t('omniChannel.colRevenue')}</th><th>{t('omniChannel.colRevenueShare')}</th>
                    </tr></thead>
                    <tbody>
                        {sortedChannels.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-3)', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
                        {sortedChannels.map(c => {
                            const ch = CHANNELS_MASTER.find(m => m.id === c.id);
                            const rate = CHANNEL_RATES[c.id] || { commission: 0.10, vat: 0.00, region: '—' };
                            const share = totalRev > 0 ? ((c.revenue || 0) / totalRev * 100).toFixed(1) : 0;
                            const st = STATUS_STYLES[c.status] || STATUS_STYLES.none;
                            return (
                                <tr key={c.id}>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16 }}>{c.icon || ch?.icon || '🔌'}</span>
                                        <span style={{ fontWeight: 700, fontSize: 12 }}>{c.name || ch?.name}</span>
                                    </td>
                                    <td><Tag label={c.type || t('omniChannel.colChannel')} color="#6366f1" /></td>
                                    <td><Tag label={st.label} color={st.color} /></td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>{(rate.commission * 100).toFixed(0)}% <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 400 }}>+VAT {(rate.vat * 100).toFixed(0)}%</span></td>
                                    <td style={{ textAlign: 'center', color: '#4f8ef7', fontWeight: 700 }}>{(c.product_count || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{(c.order_count || 0).toLocaleString()}</td>
                                    <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(c.revenue || 0)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <div style={{ flex: 1, height: 5, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
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

function GuideTab({ t }) {
    const STEPS = React.useMemo(() => [
        { icon: '🔌', title: t('omniChannel.guideStep1Title'), desc: t('omniChannel.guideStep1Desc'), color: '#4f8ef7' },
        { icon: '📦', title: t('omniChannel.guideStep2Title'), desc: t('omniChannel.guideStep2Desc'), color: '#22c55e' },
        { icon: '📋', title: t('omniChannel.guideStep3Title'), desc: t('omniChannel.guideStep3Desc'), color: '#a855f7' },
        { icon: '🏭', title: t('omniChannel.guideStep4Title'), desc: t('omniChannel.guideStep4Desc'), color: '#eab308' },
        { icon: '📊', title: t('omniChannel.guideStep5Title'), desc: t('omniChannel.guideStep5Desc'), color: '#06b6d4' },
        { icon: '🔗', title: t('omniChannel.guideStep6Title'), desc: t('omniChannel.guideStep6Desc'), color: '#f97316' },
    ], [t]);

    const TAB_INFO = React.useMemo(() => [
        { icon: '🔌', name: t('omniChannel.guideDashName'), desc: t('omniChannel.guideDashDesc'), color: '#4f8ef7' },
        { icon: '📦', name: t('omniChannel.guideFeedName'), desc: t('omniChannel.guideFeedDesc'), color: '#22c55e' },
        { icon: '📋', name: t('omniChannel.guideTrendName'), desc: t('omniChannel.guideTrendDesc'), color: '#a855f7' },
        { icon: '🏭', name: t('omniChannel.guideSettingsName'), desc: t('omniChannel.guideSettingsDesc'), color: '#eab308' },
        { icon: '📊', name: t('omniChannel.guideGuideName'), desc: t('omniChannel.guideGuideDesc'), color: '#06b6d4' },
    ], [t]);

    const TIPS = React.useMemo(() => [
        t('omniChannel.guideTip1'), t('omniChannel.guideTip2'), t('omniChannel.guideTip3'),
        t('omniChannel.guideTip4'), t('omniChannel.guideTip5'),
    ], [t]);

    return (
        <div style={{ display: 'grid', gap: 20 }}>
            <div className="card card-glass" style={{ textAlign: 'center', padding: '28px 24px' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{t('omniChannel.guideTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 600, margin: '6px auto 0' }}>{t('omniChannel.guideSub')}</div>
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 16 }}>🚀 {t('omniChannel.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gap: 14 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 14, padding: '16px 18px', borderRadius: 14, background: `${s.color}08`, border: `1px solid ${s.color}22`, alignItems: 'start' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                <span>{s.icon}</span>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: `${s.color}20`, padding: '2px 8px', borderRadius: 20 }}>{t('omniChannel.stepLabel')} {i + 1}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 16 }}>📑 {t('omniChannel.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
                    {TAB_INFO.map((tb, i) => (
                        <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: `${tb.color}08`, border: `1px solid ${tb.color}22`, textAlign: 'center' }}>
                            <div style={{ fontSize: 22, marginBottom: 6 }}>{tb.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-1)' }}>{tb.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{tb.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 14 }}>💡 {t('omniChannel.guideTipsTitle')}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    {TIPS.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.12)' }}>
                            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>✅</span>
                            <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

"""
    idx_end = text.find('function OmniChannelInner() {')
    if idx_end != -1:
        new_text = text[:idx] + clean_tail + text[idx_end:]
        with open('D:/project/GeniegoROI/frontend/src/pages/OmniChannel.jsx', 'w', encoding='utf-8') as f:
            f.write(new_text)
        print("OmniChannel middle replaced properly")
    else:
        print("end idx not found!")
else:
    print('idx not found')
