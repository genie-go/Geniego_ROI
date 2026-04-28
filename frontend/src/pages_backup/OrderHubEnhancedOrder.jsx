import React, { useState, useMemo, useCallback } from 'react';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ─── Constants (normalized keys — display labels from i18n) ─── */
const CHANNELS = [
    { id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48" },
    { id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900" },
    { id: "coupang", name: "Coupang", icon: "🇰🇷", color: "#00bae5" },
    { id: "naver", name: "Naver", icon: "🟢", color: "#03c75a" },
    { id: "11st", name: "11Street", icon: "🏬", color: "#ff0000" },
    { id: "tiktok", name: "TikTok Shop", icon: "🎵", color: "#ff0050" },
];
/* Normalized status keys — NEVER display these directly */
const ORDER_STATUS = ['paid','preparing','shipping','delivered','confirmed'];
const STATUS_I18N = { paid:'enhStatusPayment', preparing:'enhStatusPreparing', shipping:'enhStatusShipping', delivered:'enhStatusShipped', confirmed:'enhStatusConfirmed' };
const STATUS_CLS  = { paid:'badge-blue', preparing:'badge-yellow', shipping:'badge-purple', delivered:'badge-teal', confirmed:'badge-green' };
/* Normalized carrier keys */
const CARRIER_KEYS = ['CJ','Lotte','Hanjin','KoreaPost','Logen'];
const CARRIER_I18N = { CJ:'carrierCJ', Lotte:'carrierLotte', Hanjin:'carrierHanjin', KoreaPost:'carrierKoreaPost', Logen:'carrierLogen' };
const ch = id => CHANNELS.find(c => c.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };
/* Helpers */
function useStatusLabel() {
    const { t } = useI18n();
    return (key) => t(`orderHub.${STATUS_I18N[key] || key}`);
}
function useCarrierLabel() {
    const { t } = useI18n();
    return (key) => t(`orderHub.${CARRIER_I18N[key] || key}`);
}
/* Legacy status → normalized key mapper (for data from GlobalDataContext) */
const LEGACY_MAP = { 'PaymentDone':'paid','Product준Weight':'preparing','Shippingin progress':'shipping','ShippingDone':'delivered','구매확정':'confirmed','paid':'paid','preparing':'preparing','shipping':'shipping','delivered':'delivered','confirmed':'confirmed' };
const toNorm = s => LEGACY_MAP[s] || s;

function StatusBadge({ statusKey }) {
    const sl = useStatusLabel();
    const cls = STATUS_CLS[statusKey] || 'badge';
    return <span className={`badge ${cls}`} style={{ fontSize: 9 }}>{sl(statusKey)}</span>;
}

/* ─── Date Range Picker ─── */
function DateRangePicker({ dateFrom, dateTo, onFromChange, onToChange, onPreset }) {
    const { t } = useI18n();
    const presets = [
        { label: t('orderHub.enhDateToday'), key: 'today' },
        { label: t('orderHub.enhDate7d'), key: '7d' },
        { label: t('orderHub.enhDate30d'), key: '30d' },
        { label: t('orderHub.enhDateAll'), key: 'all' },
    ];
    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {presets.map(p => (
                <button key={p.key} onClick={() => onPreset(p.key)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.2)',
                    background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                }}>{p.label}</button>
            ))}
            <input type="date" value={dateFrom} onChange={e => onFromChange(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: '#e8f0ff', fontSize: 10 }} />
            <span style={{ color: 'var(--text-3)', fontSize: 10 }}>~</span>
            <input type="date" value={dateTo} onChange={e => onToChange(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: '#e8f0ff', fontSize: 10 }} />
    </div>
);
}

/* ─── Status Step Bar ─── */
function StatusStepper({ current, onChangeStatus, orderId }) {
    const sl = useStatusLabel();
    const steps = ORDER_STATUS;
    const normCurrent = toNorm(current);
    const idx = steps.indexOf(normCurrent);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '16px 0' }}>
            {steps.map((s, i) => {
                const done = i <= idx; const active = i === idx;
                return (
                    <React.Fragment key={s}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 800,
                                background: done ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(255,255,255,0.06)',
                                color: done ? '#fff' : 'var(--text-3)',
                                border: active ? '2px solid #4f8ef7' : '2px solid transparent',
                                boxShadow: active ? '0 0 12px rgba(79,142,247,0.4)' : 'none',
                                cursor: i === idx + 1 ? 'pointer' : 'default',
                                transition: 'all 0.3s',
                            }} onClick={() => i === idx + 1 && onChangeStatus(orderId, steps[i])}>
                                {done ? '✓' : i + 1}
                            <div style={{ fontSize: 8, color: active ? '#4f8ef7' : 'var(--text-3)', marginTop: 4, textAlign: 'center', fontWeight: active ? 700 : 400 }}>{sl(s)}</div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 0.5, height: 2, background: i < idx ? '#4f8ef7' : 'rgba(255,255,255,0.08)', borderRadius: 1, transition: 'background 0.3s' }} />
                        )}
                    </React.Fragment>
                
                
                  </div>
);
         
   })}
    </div>
ine({ order }) {
    const { t } = useI18n();
    const sl = useStatusLabel();
    const normStatus = toNorm(order.status);
    const idx = ORDER_STATUS.indexOf(normStatus);
    const events = useMemo(() => {
        const evts = [{ status: t('orderHub.enhTimelineCreate'), at: order.orderedAt || order.at || '-', icon: '📝', color: '#4f8ef7' }];
        if (idx >= 0) evts.push({ status: sl('paid'), at: order.orderedAt || '-', icon: '💳', color: '#22c55e' });
        if (idx >= 1) evts.push({ status: sl('preparing'), at: '-', icon: '📦', color: '#eab308' });
        if (idx >= 2) evts.push({ status: sl('shipping'), at: '-', icon: '🚚', color: '#a855f7' });
        if (idx >= 3) evts.push({ status: sl('delivered'), at: '-', icon: '✅', color: '#14d9b0' });
        if (idx >= 4) evts.push({ status: sl('confirmed'), at: '-', icon: '🎉', color: '#22c55e' });
        return evts;
    }, [order, idx, sl, t]);

    return (
        <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(79,142,247,0.04)', borderRadius: 12, border: '1px solid rgba(79,142,247,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>{t('orderHub.enhTimelineTitle')}</div>
            {events.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${e.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{e.icon}</div>
                        {i < events.length - 1 && <div style={{ width: 2, height: 16, background: 'rgba(79,142,247,0.15)' }} />}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: e.color }}>{e.status}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{e.at}</div>
                </div>
            ))}
            </div>
        </div>
    </div>
);
}

/* ─── Tracking Info Form (in Drawer) ─── */
function TrackingForm({ orderId, onSubmit }) {
    const { t } = useI18n();
    const [carrier, setCarrier] = useState('');
    const [trackingNo, setTrackingNo] = useState('');
    return (
        <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(34,197,94,0.05)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>{t('orderHub.enhTrackingTitle')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={carrier} onChange={e => setCarrier(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }}>
                    <option value="">{t('orderHub.enhCarrierSelect')}</option>
                    {CARRIER_KEYS.map(c => <option key={c} value={c}>{t(`orderHub.${CARRIER_I18N[c]}`)}</option>)}
                </select>
                <input placeholder={t('orderHub.enhTrackingNo')} value={trackingNo} onChange={e => setTrackingNo(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
            <button onClick={() => { if (carrier && trackingNo) onSubmit(orderId, carrier, trackingNo); }}
                disabled={!carrier || !trackingNo}
                style={{ marginTop: 8, padding: '6px 18px', borderRadius: 8, border: 'none', cursor: carrier && trackingNo ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 11, background: carrier && trackingNo ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.06)', color: 'var(--text-1)' }}>
                {t('orderHub.enhTrackingSubmit')}
            </button>
        </div>
    </div>
);
}

/* ─── Drawer (reusable) ─── */
function Drawer({ children, onClose }) {
    React.useEffect(() => {
        const fn = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [onClose]);
    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 200 }} />
            <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 560, background: 'linear-gradient(180deg,var(--surface),#090f1e)', borderLeft: '1px solid rgba(99,140,255,0.2)', zIndex: 201, overflowY: 'auto', padding: 26, animation: 'slideIn 0.25s cubic-bezier(.4,0,.2,1)' }}>
                {children}
                <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        </>
    </div>
);
}

/* ═══ Enhanced OrderTab ═══ */
export default function EnhancedOrderTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const sl = useStatusLabel();
    const cl = useCarrierLabel();
    const { orders, claimHistory, settlement, orderMemos, slaViolations, updateOrderStatus, confirmOrderToWms, setOrderMemo, placeOrder } = useGlobalData();
    const [search, setSearch] = useState('');
    const [selCh, setSelCh] = useState('all');
    const [selSt, setSelSt] = useState('all');
    const [page, setPage] = useState(0);
    const [detail, setDetail] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [bulkAction, setBulkAction] = useState(null);
    const [memoText, setMemoText] = useState('');
    const PAGE = 10;

    const handleDatePreset = useCallback((key) => {
        const now = new Date();
        const fmt = d => d.toISOString().slice(0, 10);
        if (key === 'today') { setDateFrom(fmt(now)); setDateTo(fmt(now)); }
        else if (key === '7d') { const d = new Date(now); d.setDate(d.getDate() - 7); setDateFrom(fmt(d)); setDateTo(fmt(now)); }
        else if (key === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); setDateFrom(fmt(d)); setDateTo(fmt(now)); }
        else { setDateFrom(''); setDateTo(''); }
    }, []);

    const memoizedOrders = useMemo(() => orders.map(o => {
        const memoTag = orderMemos[o.id] || { tags: [], memo: '' };
        const hasClaim = claimHistory.some(c => c.orderId === o.id);
        const settled = settlement.some(s => s.channel === o.ch && s.status === 'settled');
        return {
            id: o.id, channel: o.ch, sku: o.sku, name: o.name, qty: o.qty, price: o.price, total: o.total,
            buyer: o.buyer, status: o.status, carrier: o.carrier || null, trackingNo: o.trackingNo || null,
            orderedAt: o.at || '', hasClaim, settled, slaViolated: slaViolations?.includes?.(o.id) || false,
            tags: memoTag.tags || [], memo: memoTag.memo || '', wh: o.wh || 'W001',
        };
    }), [orders, claimHistory, settlement, orderMemos, slaViolations]);

    const filtered = useMemo(() => {
        let rows = memoizedOrders;
        if (search) rows = rows.filter(r => r.id.includes(search) || r.sku.includes(search) || r.buyer.includes(search) || r.name.includes(search));
        if (selCh !== 'all') rows = rows.filter(r => r.channel === selCh);
        if (selSt !== 'all') rows = rows.filter(r => r.status === selSt);
        if (dateFrom) rows = rows.filter(r => (r.orderedAt || '') >= dateFrom);
        if (dateTo) rows = rows.filter(r => (r.orderedAt || '').slice(0, 10) <= dateTo);
        return rows;
    }, [memoizedOrders, search, selCh, selSt, dateFrom, dateTo]);

    const paged = filtered.slice(page * PAGE, (page + 1) * PAGE);
    const totalPages = Math.ceil(filtered.length / PAGE);

    const kpis = useMemo(() => ({
        total: memoizedOrders.length,
        today: memoizedOrders.filter(o => o.orderedAt.includes(new Date().getFullYear().toString())).length,
        shipped: memoizedOrders.filter(o => { const ns = toNorm(o.status); return ns === 'shipping' || ns === 'delivered'; }).length,
        claims: memoizedOrders.filter(o => o.hasClaim).length,
        revenue: memoizedOrders.reduce((s, o) => s + o.total, 0),
    }), [memoizedOrders]);

    const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll = () => setSelected(prev => prev.size === paged.length ? new Set() : new Set(paged.map(o => o.id)));

    const handleBulkStatusChange = (newStatus) => {
        selected.forEach(id => updateOrderStatus(id, newStatus));
        setSelected(new Set());
        setBulkAction(null);
    };

    const handleBulkWmsConfirm = () => {
        selected.forEach(id => {
            const order = orders.find(o => o.id === id);
            if (order) { confirmOrderToWms(order); updateOrderStatus(id, 'shipping'); }
        });
        setSelected(new Set());
    };

    const handleStatusChange = (orderId, newStatus) => {
        updateOrderStatus(orderId, newStatus);
        if (newStatus === 'shipping') {
            const order = orders.find(o => o.id === orderId);
            if (order) confirmOrderToWms(order);
        }
        setDetail(prev => prev ? { ...prev, status: newStatus } : null);
    };

    const handleTrackingSubmit = (orderId, carrier, trackingNo) => {
        updateOrderStatus(orderId, { status: 'shipping', carrier, trackingNo });
        const order = orders.find(o => o.id === orderId);
        if (order) confirmOrderToWms({ ...order, carrier, trackingNo });
        setDetail(prev => prev ? { ...prev, status: 'shipping', carrier, trackingNo } : null);
    };

    const handleSaveMemo = (orderId) => {
        setOrderMemo(orderId, memoText, detail?.tags || []);
    };

    const downloadCSV = () => {
        const BOM = '\uFEFF';
        const esc = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
        const rows = (selected.size > 0 ? filtered.filter(o => selected.has(o.id)) : filtered);
        const hdr = [t('orderHub.colOrderNo'), t('orderHub.colChannel'), t('orderHub.colProduct'), 'SKU', t('orderHub.colQty'), t('orderHub.colTotal'), t('orderHub.colBuyer'), t('orderHub.colStatus'), t('orderHub.labelOrderDate')];
        const lines = [hdr.map(esc).join(','), ...rows.map(o => [o.id, o.channel, o.name, o.sku, o.qty, o.total, o.buyer, o.status, o.orderedAt].map(esc).join(','))];
        const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'orders_export.csv'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            {/* KPI Row */}
            <div className="grid4">
                {[
                    { l: t('orderHub.enhAllOrders'), v: kpis.total, c: '#4f8ef7' },
                    { l: t('orderHub.enhTodayNew'), v: kpis.today, c: '#22c55e' },
                    { l: t('orderHub.enhShipDone'), v: kpis.shipped, c: '#eab308' },
                    { l: t('orderHub.enhTotalSales'), v: fmt(kpis.revenue), c: '#a855f7' },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ '--accent': c, padding: '12px 14px' }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                ))}

            {/* Date Range */}
            <DateRangePicker dateFrom={dateFrom} dateTo={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} onPreset={handleDatePreset} />

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder={t('orderHub.enhSearchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ width: 140 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">{t('orderHub.enhAllChannel')}</option>
                    {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input" style={{ width: 140 }} value={selSt} onChange={e => setSelSt(e.target.value)}>
                    <option value="all">{t('orderHub.enhAllStatus')}</option>
                    {ORDER_STATUS.map(s => <option key={s} value={s}>{sl(s)}</option>)}
                </select>
                <button onClick={downloadCSV} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    {t('orderHub.enhCsvBtn')}
                </button>

            {/* Bulk Actions Bar */}
            {selected.size > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', animation: 'fadeIn 0.2s' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4f8ef7' }}>✅ {selected.size}{t('orderHub.enhSelected')}</span>
                    <div style={{ flex: 1 }} />
                    <select onChange={e => { if (e.target.value) handleBulkStatusChange(e.target.value); e.target.value = ''; }}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'var(--surface)', color: '#e8f0ff', fontSize: 10 }}>
                        <option value="">{t('orderHub.enhBulkStatus')}</option>
                        {ORDER_STATUS.map(s => <option key={s} value={s}>{sl(s)}</option>)}
                    </select>
                    <button onClick={handleBulkWmsConfirm} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{t('orderHub.enhBulkWms')}</button>
                    <button onClick={downloadCSV} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{t('orderHub.enhBulkCsv')}</button>
                    <button onClick={() => setSelected(new Set())} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>{t('orderHub.enhBulkClear')}</button>
            )}

            {/* Table */}
            <table className="table">
                <thead><tr>
                    <th style={{ width: 32 }}><input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} /></th>
                    <th>{t('orderHub.enhColOrder')}</th><th>{t('orderHub.enhColChannel')}</th><th>{t('orderHub.enhColProduct')}</th><th>{t('orderHub.enhColQty')}</th><th>{t('orderHub.enhColAmount')}</th><th>{t('orderHub.enhColBuyer')}</th><th>{t('orderHub.enhColStatus')}</th><th>{t('orderHub.enhColNote')}</th><th></th>
                </tr></thead>
                <tbody>
                    {paged.map(o => (
                        <tr key={o.id} style={{ background: selected.has(o.id) ? 'rgba(79,142,247,0.06)' : 'transparent' }}>
                            <td><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} /></td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.id}</td>
                            <td><span style={{ fontSize: 16, marginRight: 6 }}>{ch(o.channel)?.icon}</span><span style={{ fontSize: 11 }}>{ch(o.channel)?.name}</span></td>
                            <td><div style={{ fontSize: 11, fontWeight: 700 }}>{o.name}</div><div style={{ fontSize: 9, color: 'var(--text-3)' }}>SKU: {o.sku}</div></td>
                            <td style={{ textAlign: 'center' }}>{o.qty}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{fmt(o.total)}</td>
                            <td style={{ fontSize: 11 }}>{o.buyer}</td>
                            <td><StatusBadge statusKey={toNorm(o.status) || 'paid'} /></td>
                            <td>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {o.hasClaim && <span className="badge badge-red" style={{ fontSize: 9 }}>{t('orderHub.badgeClaim')}</span>}
                                    {o.settled && <span className="badge badge-blue" style={{ fontSize: 9 }}>{t('orderHub.badgeSettled')}</span>}
                                    {o.slaViolated && <span className="badge badge-yellow" style={{ fontSize: 9 }}>{t('orderHub.badgeSlaDelay')}</span>}
                                    {o.tags?.map(tx => <span key={tx} className="badge" style={{ fontSize: 9 }}>{tx}</span>)}
                            </td>
                            <td><button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => { setDetail(o); setMemoText(o.memo || ''); }}>{t('orderHub.enhDetail')}</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setPage(i)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: page === i ? 700 : 400, background: page === i ? 'rgba(79,142,247,0.2)' : 'transparent', color: page === i ? '#4f8ef7' : 'var(--text-3)' }}>{i + 1}</button>
                    ))}
            )}

            {/* Detail Drawer */}
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#4f8ef7', fontFamily: 'monospace' }}>{detail.id}</div>
                        <button className="btn-ghost" style={{ padding: '5px 10px' }} onClick={() => setDetail(null)}>✕</button>

                    {/* Status Stepper */}
                    <StatusStepper current={detail.status || 'paid'} onChangeStatus={handleStatusChange} orderId={detail.id} />

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                        {ORDER_STATUS.map((s, i) => {
                            const curIdx = ORDER_STATUS.indexOf(toNorm(detail.status));
                            if (i <= curIdx) return null;
                            return (
                                <button key={s} onClick={() => handleStatusChange(detail.id, s)}
                                    style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: i === curIdx + 1 ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(255,255,255,0.06)', color: 'var(--text-1)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                    → {sl(s)}
                                </button>
                            );
                        })}

                    {/* Detail Fields */}
                    {[[t('orderHub.labelChannel'), ch(detail.channel)?.name], [t('orderHub.labelBuyer'), detail.buyer], [t('orderHub.labelProduct'), detail.name], ['SKU', detail.sku], [t('orderHub.labelQty'), detail.qty], [t('orderHub.labelTotal'), fmt(detail.total)], [t('orderHub.labelStatus'), sl(toNorm(detail.status))], [t('orderHub.labelCarrier'), detail.carrier ? cl(detail.carrier) : '-'], [t('orderHub.labelTrackNo'), detail.trackingNo || '-'], [t('orderHub.labelOrderDate'), detail.orderedAt], [t('orderHub.labelWarehouse'), detail.wh]].map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(99,140,255,0.07)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-3)' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    ))}

                    {/* Tracking Form */}
                    {(!detail.carrier || !detail.trackingNo) && <TrackingForm orderId={detail.id} onSubmit={handleTrackingSubmit} />}

                    {/* Memo */}
                    <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(168,85,247,0.05)', borderRadius: 12, border: '1px solid rgba(168,85,247,0.15)' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{t('orderHub.enhMemoTitle')}</div>
                        <textarea value={memoText} onChange={e => setMemoText(e.target.value)} rows={3}
                            style={{ width: '100%', padding: 8, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: '#e8f0ff', fontSize: 11, resize: 'vertical' }} />
                        <button onClick={() => handleSaveMemo(detail.id)}
                            style={{ marginTop: 6, padding: '5px 14px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: 'var(--text-1)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{t('orderHub.enhMemoSave')}</button>

                    {/* Timeline */}
                    <OrderTimeline order={detail} />
                </Drawer>
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
);
}
