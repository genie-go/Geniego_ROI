import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext';
import { useAuth } from '../auth/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';
import { CHANNEL_RATES } from '../constants/channelRates.js';
import apiClient from '../services/apiClient';

/* ??? CSV Download Util ???????????????????????????? */
function downloadCSV(filename, headers, rows) {
    const BOM = '\uFEFF';
    const escape = v => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
    const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ??? Constants ??? */
const DEFAULT_CHANNELS = [
    { id: "shopify", name: "Shopify", icon: "🛒", color: "#96bf48" },
    { id: "amazon", name: "Amazon", icon: "📦", color: "#ff9900" },
    { id: "coupang", name: "Coupang", icon: "🇰🇷", color: "#00bae5" },
    { id: "naver", name: "Naver", icon: "🟢", color: "#03c75a" },
    { id: "11st", name: "11Street", icon: "🏬", color: "#ff0000" },
    { id: "tiktok", name: "TikTok Shop", icon: "🎵", color: "#ff0050" },
];
const INTL_CHANNELS = [
    { id: "amazon_us", name: "Amazon US", icon: "🇺🇸", color: "#ff9900" },
    { id: "amazon_jp", name: "Amazon JP", icon: "🇯🇵", color: "#e74c3c" },
    { id: "lazada", name: "Lazada", icon: "🛒", color: "#0f146d" },
    { id: "shopee", name: "Shopee", icon: "🛍️", color: "#ee4d2d" },
    { id: "zalando", name: "Zalando", icon: "🇪🇺", color: "#ff6900" },
];
const SLA_HOURS = { coupang: 24, naver: 48, amazon: 48, shopify: 72, "11st": 48, tiktok: 48 };
/* Status keys are normalized English - display labels come from i18n */
const ORDER_STATUS_KEYS = ['paid', 'preparing', 'shipping', 'delivered', 'confirmed'];
const CLAIM_TYPE_KEYS = ['cancel', 'return', 'exchange', 'refund'];
const CLAIM_STATUS_KEYS = ['received', 'processing', 'done', 'rejected'];
const CARRIER_KEYS = ['cj', 'lotte', 'hanjin', 'koreapost', 'logen', 'dhl', 'fedex', 'ups', 'ems', 'yamato'];
const INTL_CARRIERS = ["DHL", "FedEx", "UPS", "EMS", "Yamato", "J&T Express"];
const COUNTRY_FLAG = { US: "🇺🇸", JP: "🇯🇵", SG: "🇸🇬", TH: "🇹🇭", ID: "🇮🇩", MY: "🇲🇾", PH: "🇵🇭", DE: "🇩🇪", FR: "🇫🇷", GB: "🇬🇧", AU: "🇦🇺", VN: "🇻🇳" };

/* ??? Helpers ??? */
const ch = id => DEFAULT_CHANNELS.find(c => c.id === id) || { name: id, icon: "🔌", color: "#4f8ef7" };

function StatusBadge({ label, cls }) {
    return <span className={`badge ${cls || 'badge'}`} style={{ fontSize: 9 }}>{label}</span>;
}
const STATUS_CLS = { paid: 'badge-blue', preparing: 'badge-yellow', shipping: 'badge-purple', delivered: 'badge-teal', confirmed: 'badge-green' };
const CLAIM_CLS = { received: 'badge-blue', processing: 'badge-yellow', done: 'badge-green', rejected: 'badge-red' };

/* ?? BroadcastChannel ??Cross-tab real-time sync ?? */
const BC_NAME = 'geniego_orderhub_sync';
function useCrossTabSync(onMessage) {
    const cbRef = useRef(onMessage);
    cbRef.current = onMessage;
    const bcRef = useRef(null);
    useEffect(() => {
        try {
            const bc = new BroadcastChannel(BC_NAME);
            bc.onmessage = (e) => cbRef.current?.(e.data);
            bcRef.current = bc;
            return () => bc.close();
        } catch { }
    }, []);
    const broadcast = useCallback((type, payload) => {
        try { bcRef.current?.postMessage({ type, payload, ts: Date.now() }); } catch { }
    }, []);
    return broadcast;
}

function ProgressBar({ pct, color = "#4f8ef7" }) {
    return (
        <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4 }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
        </div>
    );
}

function Drawer({ children, onClose }) {
    useEffect(() => {
        const fn = e => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [onClose]);
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 200 }} />
            <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 520, background: "#ffffff", borderLeft: "1px solid #e5e7eb", zIndex: 201, overflowY: "auto", padding: 26, animation: "slideIn 0.25s cubic-bezier(.4,0,.2,1)" }}>
                {children}
                <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            </div>
        </>
    );
}

/* ??? CRM Sync Button ??? */
function CrmSyncButton({ order }) {
    const { t } = useI18n();
    const [status, setStatus] = useState(null);
    const sync = async () => {
        setStatus('syncing');
        try {
            const custRes = await apiClient.postJson('/api/crm/customers', { email: order.buyer, name: order.buyer.split('@')[0], phone: '' });
            const customerId = custRes.customer?.id || custRes.id;
            if (!customerId) { setStatus('error'); return; }
            await apiClient.postJson(`/api/crm/customers/${customerId}/activities`, { type: 'purchase', channel: order.channel, amount: order.total, note: `${order.name} x${order.qty} | 주문번호: ${order.id}` });
            setStatus('done');
            setTimeout(() => setStatus(null), 3000);
        } catch { setStatus('error'); }
    };
    return (
        <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.18)", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>{t('orderHub.crmTitle')}</div>
            {status === 'done' && <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 8 }}>{t('orderHub.crmSyncDoneMsg')}</div>}
            {status === 'error' && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{t('orderHub.crmSyncFailMsg')}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={sync} disabled={status === 'syncing'} className="btn-primary" style={{ fontSize: 11, padding: "6px 16px", background: status === 'syncing' ? 'rgba(99,140,255,0.2)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)', cursor: status === 'syncing' ? 'not-allowed' : 'pointer' }}>
                    {status === 'syncing' ? t('orderHub.crmSyncingBtn') : t('orderHub.crmSyncBtn')}
                </button>
                <a href="/crm" style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--text-3)', textDecoration: 'none', padding: '6px 10px' }}>{t('orderHub.crmViewBtn')}</a>
            </div>
        </div>
    );
}

/* ??? Live Ingest Bar (??GlobalDataContext ) ??? */
function LiveIngestBar({ tab }) {
    const { t, lang } = useI18n();
    const { orders, claimHistory, settlement, isDemo } = useGlobalData();
    const prevCountRef = useRef({ o: 0, c: 0, s: 0 });
    const [feed, setFeed] = useState([]);

    /* ── Enterprise Dynamic Locale Map ────────────────────── */
    const LANG_LOCALE_MAP = {
        ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', 'zh-TW': 'zh-TW',
        de: 'de-DE', es: 'es-ES', fr: 'fr-FR', pt: 'pt-BR', ru: 'ru-RU',
        ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN', id: 'id-ID'
    };

    useEffect(() => {
        const prev = prevCountRef.current;
        const newEvents = [];
        const now = new Date().toLocaleTimeString(LANG_LOCALE_MAP[lang] || 'ko-KR', { hour12: false });
        if (orders.length > prev.o && prev.o > 0) {
            const latest = orders[orders.length - 1];
            newEvents.push({ id: Date.now(), ch: latest.ch || 'shopify', type: 'Orders', msg: `${latest.id} New`, ts: now });
        }
        if (claimHistory.length > prev.c && prev.c > 0) {
            const latest = claimHistory[claimHistory.length - 1];
            newEvents.push({ id: Date.now() + 1, ch: latest.channel || 'coupang', type: 'Claim', msg: `${latest.id} ${latest.type} 접수`, ts: now });
        }
        if (settlement.length > prev.s && prev.s > 0) {
            const latest = settlement[settlement.length - 1];
            newEvents.push({ id: Date.now() + 2, ch: latest.channel || 'naver', type: '정산', msg: `${latest.period || ""} 정산 데이터 갱신`, ts: now });
        }
        // Shipping status changes
        const shipped = orders.filter(o => o.status === 'Shippingin progress' || o.status === 'ShippingDone');
        if (shipped.length > 0 && prev.o > 0 && orders.length > prev.o) {
            const latest = shipped[shipped.length - 1];
            newEvents.push({ id: Date.now() + 3, ch: latest.ch || 'coupang', type: 'Shipping', msg: `${latest.id} ${latest.status}`, ts: now });
        }
        if (newEvents.length > 0) setFeed(f => [...newEvents, ...f].slice(0, 10));
        prevCountRef.current = { o: orders.length, c: claimHistory.length, s: settlement.length };
    }, [orders, claimHistory, settlement, lang]);

    const typeColor = t => ({ "Orders": "#4f8ef7", "Shipping": "#22c55e", "Claim": "#eab308", "Return": "#f97316", "정산": "#a855f7" })[t] || "#4f8ef7";

    return (
        <div style={{ padding: "6px 12px", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>{t('orderHub.liveFeedTitle')}</div>
                <span className="badge badge-green" style={{ fontSize: 9 }}><span className="dot dot-green" /> LIVE · {orders.length + claimHistory.length + settlement.length}{t('orderHub.liveFeedCount')}</span>
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, minHeight: 0 }}>
                {feed.map(f => (
                    <div key={f.id} style={{ flexShrink: 0, padding: "4px 8px", borderRadius: 8, background: "rgba(79,142,247,0.06)", border: `1px solid ${typeColor(f.type)}22`, animation: "fadeIn 0.3s" }}>
                        <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 2 }}>
                            <span style={{ fontSize: 11 }}>{ch(f.ch).icon}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: typeColor(f.type), padding: "1px 5px", background: typeColor(f.type) + "18", borderRadius: 4 }}>{f.type}</span>
                            <span style={{ fontSize: 9, color: "#6b7280" }}>{f.ts}</span>
                        </div>
                        <div style={{ fontSize: 10, color: "#374151", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.msg}</div>
                    </div>
                ))}
            </div>
            <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}`}</style>
        </div>
    );
}

/* === Tab: Overview (KPI Dashboard) === */
function OrderHubOverviewTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { orders, claimHistory, settlement } = useGlobalData();
    const totalRevenue = useMemo(() => orders.reduce((s, o) => s + (o.total || o.price * o.qty || 0), 0), [orders]);
    const totalFees = useMemo(() => settlement.reduce((s, r) => s + (r.platformFee || 0), 0), [settlement]);
    const claimRate = orders.length > 0 ? ((claimHistory.length / orders.length) * 100).toFixed(1) : '0.0';
    const shippedCount = orders.filter(o => o.status === 'shipping' || o.status === 'delivered').length;
    const deliveredCount = orders.filter(o => o.status === 'delivered').length;
    const channelCounts = useMemo(() => {
        const m = {};
        orders.forEach(o => { m[o.ch] = (m[o.ch] || 0) + 1; });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
    }, [orders]);

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {/* Top KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                    { l: t('orderHub.kpiAllOrders', '전체 주문'), v: orders.length, c: '#4f8ef7', icon: '📦' },
                    { l: t('orderHub.kpiTotalRevenue', '총 매출'), v: fmt(totalRevenue), c: '#22c55e', icon: '💰' },
                    { l: t('orderHub.kpiClaimRate', '클레임률'), v: `${claimRate}%`, c: '#ef4444', icon: '⚠️' },
                    { l: t('orderHub.kpiDelivered', '배송완료'), v: deliveredCount, c: '#a855f7', icon: '✅' },
                ].map(({ l, v, c, icon }) => (
                    <div key={l} style={{ background: `${c}08`, border: `1px solid ${c}22`, borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: c }}>{v}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{l}</div>
                    </div>
                ))}
            </div>
            {/* Processing Status Summary */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>📊 {t('orderHub.processingStatus', '처리 현황')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                    {[
                        { l: t('orderHub.statusPaid', '결제완료'), v: orders.filter(o => o.status === 'paid' || !o.status).length, c: '#eab308' },
                        { l: t('orderHub.statusPreparing', '준비중'), v: orders.filter(o => o.status === 'preparing').length, c: '#a855f7' },
                        { l: t('orderHub.statusShipping', '배송중'), v: shippedCount - deliveredCount, c: '#4f8ef7' },
                        { l: t('orderHub.statusDelivered', '배송완료'), v: deliveredCount, c: '#22c55e' },
                        { l: t('orderHub.kpiClaimCount', '클레임'), v: claimHistory.length, c: '#ef4444' },
                    ].map(({ l, v, c }) => (
                        <div key={l} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: `${c}08`, border: `1px solid ${c}15` }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
                            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{l}</div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Channel Revenue Breakdown */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>🏪 {t('orderHub.channelBreakdown', '채널별 주문 현황')}</div>
                {channelCounts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 30, color: '#6b7280', fontSize: 13 }}>{t('orderHub.noData', '데이터가 없습니다.')}</div>
                ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                        {channelCounts.map(([chId, cnt]) => {
                            const chInfo = ch(chId);
                            const pct = orders.length > 0 ? ((cnt / orders.length) * 100).toFixed(1) : 0;
                            return (
                                <div key={chId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: '#f9fafb' }}>
                                    <span style={{ fontSize: 16 }}>{chInfo.icon}</span>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: '#1e293b', flex: '0 0 90px' }}>{chInfo.name}</span>
                                    <div style={{ flex: 1, height: 6, borderRadius: 6, background: '#e5e7eb', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: '#4f8ef7', borderRadius: 6, transition: 'width 0.3s' }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4f8ef7', minWidth: 50, textAlign: 'right' }}>{cnt}건 ({pct}%)</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Settlement Summary */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>💳 {t('orderHub.settlementSummary', '정산 요약')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                        { l: t('orderHub.settleColGross', '총 매출'), v: fmt(totalRevenue), c: '#22c55e' },
                        { l: t('orderHub.settleColFee', '수수료'), v: fmt(totalFees), c: '#ef4444' },
                        { l: t('orderHub.settleColNet', '순정산'), v: fmt(totalRevenue - totalFees), c: '#4f8ef7' },
                    ].map(({ l, v, c }) => (
                        <div key={l} style={{ textAlign: 'center', padding: '14px 12px', borderRadius: 12, background: `${c}06`, border: `1px solid ${c}18` }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{l}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* === Tab: Orders (fully i18n) === */
function OrderTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { orders, claimHistory, settlement, orderMemos, slaViolations } = useGlobalData();
    const [search, setSearch] = useState("");
    const [selCh, setSelCh] = useState("all");
    const [selSt, setSelSt] = useState("all");
    const [page, setPage] = useState(0);
    const [detail, setDetail] = useState(null);
    const PAGE = 10;

    const statusLabels = useMemo(() => ({
        paid: t('orderHub.statusPaid'), preparing: t('orderHub.statusPreparing'),
        shipping: t('orderHub.statusShipping'), delivered: t('orderHub.statusDelivered'),
        confirmed: t('orderHub.statusConfirmed'),
    }), [t]);

    const memoizedOrders = useMemo(() => {
        return orders.map(o => {
            const memoTag = orderMemos[o.id] || { tags: [], memo: '' };
            const hasClaim = claimHistory.some(c => c.orderId === o.id);
            const settled = settlement.some(s => s.channel === o.ch && s.status === 'settled');
            return {
                id: o.id, channel: o.ch, sku: o.sku, name: o.name, qty: o.qty, price: o.price, total: o.total,
                buyer: o.buyer, status: o.status || 'paid', carrier: o.carrier || null, trackingNo: o.trackingNo || null,
                orderedAt: o.at || '', hasClaim, settled, settlementAmt: Math.round(o.total * 0.82),
                slaViolated: slaViolations?.includes(o.id) || false, slaDeadline: '-',
                tags: memoTag.tags || [], memo: memoTag.memo || '', wh: o.wh || 'W001'
            };
        });
    }, [orders, claimHistory, settlement, orderMemos, slaViolations]);

    const filtered = useMemo(() => {
        let rows = memoizedOrders;
        if (search) rows = rows.filter(r => r.id.includes(search) || r.sku.includes(search) || r.buyer.includes(search));
        if (selCh !== "all") rows = rows.filter(r => r.channel === selCh);
        if (selSt !== "all") rows = rows.filter(r => r.status === selSt);
        return rows;
    }, [memoizedOrders, search, selCh, selSt]);

    const paged = filtered.slice(page * PAGE, (page + 1) * PAGE);
    const totalPages = Math.ceil(filtered.length / PAGE);

    const kpis = useMemo(() => ({
        total: memoizedOrders.length,
        today: memoizedOrders.filter(o => o.orderedAt.includes(new Date().getFullYear().toString())).length,
        shipped: memoizedOrders.filter(o => o.status === 'shipping' || o.status === 'delivered').length,
        claims: memoizedOrders.filter(o => o.hasClaim).length,
        revenue: memoizedOrders.reduce((s, o) => s + o.total, 0),
    }), [memoizedOrders]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div className="grid4">
                {[
                    { l: t('orderHub.kpiAllOrders'), v: kpis.total, c: "#4f8ef7" },
                    { l: t('orderHub.kpiTodayNew'), v: kpis.today, c: "#22c55e" },
                    { l: t('orderHub.kpiShippedDone'), v: kpis.shipped, c: "#eab308" },
                    { l: t('orderHub.kpiClaimCount'), v: kpis.claims, c: "#ef4444" },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ '--accent': c, padding: '12px 14px' }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" style={{ flex: 1 }} placeholder={t('orderHub.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
                <select className="input" style={{ width: 140 }} value={selCh} onChange={e => setSelCh(e.target.value)}>
                    <option value="all">{t('orderHub.allChannels')}</option>
                    {DEFAULT_CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="input" style={{ width: 140 }} value={selSt} onChange={e => setSelSt(e.target.value)}>
                    <option value="all">{t('orderHub.allStatus')}</option>
                    {ORDER_STATUS_KEYS.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
            </div>
            <table className="table">
                <thead><tr><th>{t('orderHub.colOrderNo')}</th><th>{t('orderHub.colChannel')}</th><th>{t('orderHub.colProduct')}</th><th>{t('orderHub.colQty')}</th><th>{t('orderHub.colTotal')}</th><th>{t('orderHub.colBuyer')}</th><th>{t('orderHub.colStatus')}</th><th>{t('orderHub.colNote')}</th><th></th></tr></thead>
                <tbody>
                    {paged.map(o => (
                        <tr key={o.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.id}</td>
                            <td><span style={{ fontSize: 11, marginRight: 6 }} >{ch(o.channel)?.icon}</span><span>{ch(o.channel)?.name}</span></td>
                            <td><div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280' }} >{o.name}</div><div>SKU: {o.sku}</div></td>
                            <td style={{ textAlign: 'center' }}>{o.qty}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{fmt(o.total)}</td>
                            <td style={{ fontSize: 11 }}>{o.buyer}</td>
                            <td><StatusBadge label={statusLabels[o.status] || o.status} cls={STATUS_CLS[o.status]} /></td>
                            <td>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {o.hasClaim && <span className="badge badge-red" style={{ fontSize: 9 }}>{t('orderHub.badgeClaim')}</span>}
                                    {o.settled && <span className="badge badge-blue" style={{ fontSize: 9 }}>{t('orderHub.badgeSettled')}</span>}
                                    {o.slaViolated && <span className="badge badge-yellow" style={{ fontSize: 9 }}>{t('orderHub.badgeSlaDelay')}</span>}
                                    {o.tags?.map(tx => <span key={tx} className="badge" style={{ fontSize: 9 }}>{tx}</span>)}
                                </div>
                            </td>
                            <td><button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setDetail(o)}>{t('orderHub.btnDetail')}</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setPage(i)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: page === i ? 700 : 400, background: page === i ? 'rgba(79,142,247,0.2)' : 'transparent', color: page === i ? '#4f8ef7' : 'var(--text-3)' }}>{i + 1}</button>
                    ))}
                </div>
            )}
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#4f8ef7', fontFamily: 'monospace' }}>{detail.id}</div>
                        <button className="btn-ghost" style={{ padding: '5px 10px' }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    {[[t('orderHub.labelChannel'), ch(detail.channel)?.name], [t('orderHub.labelBuyer'), detail.buyer], [t('orderHub.labelProduct'), detail.name], ['SKU', detail.sku], [t('orderHub.labelQty'), detail.qty], [t('orderHub.labelTotal'), fmt(detail.total)], [t('orderHub.labelStatus'), statusLabels[detail.status] || detail.status], [t('orderHub.labelCarrier'), detail.carrier || '-'], [t('orderHub.labelTrackNo'), detail.trackingNo || '-'], [t('orderHub.labelOrderDate'), detail.orderedAt], [t('orderHub.labelWarehouse'), detail.wh]].map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(99,140,255,0.07)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 600 }} >{l}</span><span>{v}</span>
                        </div>
                    ))}
                    <CrmSyncButton order={detail} />
                </Drawer>
            )}
        </div>
    );
}

/* ? CollectSettingTab (enhanced) ? */
function CollectSettingTab() {
    const { t } = useI18n();
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div className="card card-glass" style={{ padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 12 }}>{t('orderHub.settingsTitle')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>{t('orderHub.settingsDesc')}</div>
                <div style={{ display: 'grid', gap: 12 }}>
                    {[
                        { l: t('orderHub.settingsAutoCollect'), desc: t('orderHub.settingsAutoCollectDesc'), color: '#4f8ef7' },
                        { l: t('orderHub.settingsSlaMonitor'), desc: t('orderHub.settingsSlaMonitorDesc'), color: '#22c55e' },
                        { l: t('orderHub.settingsNotification'), desc: t('orderHub.settingsNotifDesc'), color: '#a855f7' },
                    ].map(s => (
                        <div key={s.l} style={{ padding: '14px 16px', borderRadius: 12, background: `${s.color}08`, border: `1px solid ${s.color}22` }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.l}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ? SettlementTab ? */
function SettlementTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { settlement } = useGlobalData();
    const records = settlement || [];
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <table className="table">
                <thead><tr><th>{t('orderHub.settleColChannel')}</th><th>{t('orderHub.settleColPeriod')}</th><th>{t('orderHub.settleColGross')}</th><th>{t('orderHub.settleColFee')}</th><th>{t('orderHub.settleColNet')}</th><th>{t('orderHub.colStatus')}</th></tr></thead>
                <tbody>
                    {records.map(s => (
                        <tr key={s.id}>
                            <td>{ch(s.channel).icon} {ch(s.channel).name}</td><td>{s.period}</td>
                            <td style={{ fontFamily: 'monospace' }}>{fmt(s.grossSales)}</td>
                            <td style={{ fontFamily: 'monospace', color: '#ef4444' }}>-{fmt(s.platformFee)}</td>
                            <td style={{ fontFamily: 'monospace', color: '#22c55e', fontWeight: 700 }}>{fmt(s.netPayout)}</td>
                            <td><StatusBadge label={s.status === 'settled' ? t('orderHub.statusSettled') : t('orderHub.statusProcessing')} cls={s.status === 'settled' ? 'badge-green' : 'badge-yellow'} /></td>
                        </tr>
                    ))}
                    {records.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>{t('orderHub.noData')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

/* ? DeliveryTab ? */
function DeliveryTab() {
    const { t } = useI18n();
    const { orders } = useGlobalData();
    const deliveries = (orders || []).filter(o => o.carrier);
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <table className="table">
                <thead><tr><th>{t('orderHub.deliveryColOrderId')}</th><th>{t('orderHub.deliveryColChannel')}</th><th>{t('orderHub.deliveryColCarrier')}</th><th>{t('orderHub.deliveryColTrackNo')}</th><th>{t('orderHub.deliveryColStatus')}</th></tr></thead>
                <tbody>
                    {deliveries.map(d => (
                        <tr key={d.id}>
                            <td style={{ fontFamily: 'monospace', color: '#4f8ef7' }}>{d.id}</td>
                            <td>{ch(d.ch).name}</td><td>{d.carrier}</td><td style={{ fontFamily: 'monospace' }}>{d.trackingNo || `TRK-${d.id}`}</td>
                            <td><StatusBadge label={d.status || t('orderHub.statusShipping')} cls={STATUS_CLS[d.status] || 'badge-purple'} /></td>
                        </tr>
                    ))}
                    {deliveries.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>{t('orderHub.deliveryNoData')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

/* ? ClaimTab ? */
function ClaimTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { claimHistory } = useGlobalData();
    const claims = claimHistory || [];
    const claimTypeLabels = useMemo(() => ({ cancel: t('orderHub.claimCancel'), return: t('orderHub.claimReturn'), exchange: t('orderHub.claimExchange'), refund: t('orderHub.claimRefund') }), [t]);
    const claimStatusLabels = useMemo(() => ({ received: t('orderHub.claimStatusReceived'), processing: t('orderHub.claimStatusProcessing'), done: t('orderHub.claimStatusDone'), rejected: t('orderHub.claimStatusRejected') }), [t]);
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <table className="table">
                <thead><tr><th>{t('orderHub.claimColId')}</th><th>{t('orderHub.claimColOrderId')}</th><th>{t('orderHub.claimColChannel')}</th><th>{t('orderHub.claimColType')}</th><th>{t('orderHub.claimColStatus')}</th><th>{t('orderHub.claimColReason')}</th><th>{t('orderHub.claimColAmount')}</th><th>{t('orderHub.claimColReqDate')}</th></tr></thead>
                <tbody>
                    {claims.map(c => (
                        <tr key={c.id}>
                            <td style={{ fontFamily: 'monospace', color: '#4f8ef7' }}>{c.id}</td>
                            <td style={{ fontFamily: 'monospace' }}>{c.orderId}</td>
                            <td>{ch(c.channel).name}</td>
                            <td><StatusBadge label={claimTypeLabels[c.type] || c.type} cls="badge-purple" /></td>
                            <td><StatusBadge label={claimStatusLabels[c.status] || c.status} cls={CLAIM_CLS[c.status]} /></td>
                            <td style={{ fontSize: 11 }}>{c.reason}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmt(c.amount || 0)}</td>
                            <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.requestedAt?.substring(0, 10)}</td>
                        </tr>
                    ))}
                    {claims.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>{t('orderHub.claimNoData')}</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

/* ? IntlOrderTab ? */
function IntlOrderTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { orders } = useGlobalData();
    const [detail, setDetail] = useState(null);
    const intlOrders = (orders || []).filter(o => ['amazon_us', 'amazon_jp', 'lazada', 'shopee', 'zalando'].includes(o.ch));
    const stats = {
        total: intlOrders.length,
        totalRevenue: intlOrders.reduce((s, o) => s + (o.total || 0), 0),
        totalDuty: intlOrders.reduce((s, o) => s + ((o.total || 0) * 0.08), 0),
        ddp: intlOrders.filter(o => o.incoterm === 'DDP').length
    };
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                    { l: t('orderHub.intlKpiOrders'), v: stats.total, c: '#4f8ef7' },
                    { l: t('orderHub.intlKpiRevenue'), v: fmt(Math.round(stats.totalRevenue)), c: '#22c55e' },
                    { l: t('orderHub.intlKpiDuty'), v: fmt(Math.round(stats.totalDuty)), c: '#f97316' },
                    { l: t('orderHub.intlKpiDdp'), v: stats.ddp, c: '#a855f7' }
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ '--accent': c, padding: '12px 14px' }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                    </div>
                ))}
            </div>
            <table className="table">
                <thead><tr><th>{t('orderHub.enhColOrder')}</th><th>{t('orderHub.enhColChannel')}</th><th>{t('orderHub.intlColCountry')}</th><th>{t('orderHub.enhColProduct')}</th><th>{t('orderHub.enhColQty')}</th><th>{t('orderHub.enhColAmount')}</th><th>{t('orderHub.enhColStatus')}</th><th></th></tr></thead>
                <tbody>
                    {intlOrders.map(o => (
                        <tr key={o.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.id}</td>
                            <td>{INTL_CHANNELS.find(c => c.id === o.ch)?.icon || '🌐'} {INTL_CHANNELS.find(c => c.id === o.ch)?.name || o.ch}</td>
                            <td>{COUNTRY_FLAG[o.country] || '🌐'} {o.country || '-'}</td>
                            <td style={{ fontSize: 11 }}>{o.name}</td>
                            <td style={{ textAlign: 'center' }}>{o.qty}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{fmt(o.total || 0)}</td>
                            <td><StatusBadge label={o.status || t('orderHub.statusPaid')} cls={STATUS_CLS[o.status] || 'badge-blue'} /></td>
                            <td><button className="btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setDetail(o)}>{t('orderHub.intlDetailBtn')}</button></td>
                        </tr>
                    ))}
                    {intlOrders.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>{t('orderHub.intlNoData')}</td></tr>}
                </tbody>
            </table>
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: '#4f8ef7', fontFamily: 'monospace' }}>{detail.id}</div>
                        <button className="btn-ghost" style={{ padding: '5px 10px' }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    {[[t('orderHub.labelChannel'), INTL_CHANNELS.find(c => c.id === detail.ch)?.name || detail.ch], [t('orderHub.intlColCountry'), `${COUNTRY_FLAG[detail.country] || '🌐'} ${detail.country || '-'}`], [t('orderHub.labelBuyer'), detail.buyer], [t('orderHub.labelProduct'), detail.name], [t('orderHub.labelQty'), detail.qty], [t('orderHub.labelTotal'), fmt(detail.total || 0)], ['Incoterm', detail.incoterm || '-'], ['HS Code', detail.hsCode || '-'], [t('orderHub.intlEstDuty'), fmt((detail.total || 0) * 0.08)], [t('orderHub.labelCarrier'), detail.carrier || '-'], [t('orderHub.labelTrackNo'), detail.trackingNo || '-'], [t('orderHub.labelOrderDate'), detail.at || '-']].map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(99,140,255,0.07)', fontSize: 12 }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 600 }} >{l}</span><span>{v}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(79,142,247,0.06)', borderRadius: 10 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>{t('orderHub.intlShipGuide')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{detail.incoterm === 'DDP' ? t('orderHub.intlDdpDesc') : t('orderHub.intlDduDesc')}</div>
                    </div>
                </Drawer>
            )}
        </div>
    );
}

/* ? B2B Tab ? */
function B2BOrderTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { orders, orderMemos } = useGlobalData();
    const B2B_ORDERS = useMemo(() => orders.filter(o => (orderMemos[o.id]?.tags || []).includes('B2B')).map(o => ({
        id: o.id, buyer: o.buyer, skus: 1, qty: o.qty, amount: o.total, status: o.status, created: o.at
    })), [orders, orderMemos]);
    const b2bStats = useMemo(() => ({
        total: B2B_ORDERS.length,
        totalAmount: B2B_ORDERS.reduce((s, o) => s + o.amount, 0),
        avgQty: B2B_ORDERS.length > 0 ? Math.round(B2B_ORDERS.reduce((s, o) => s + o.qty, 0) / B2B_ORDERS.length) : 0,
    }), [B2B_ORDERS]);
    return (
        <div style={{ display: "grid", gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                    { l: t('orderHub.b2bKpiOrders'), v: `${b2bStats.total}${t('orderHub.b2bUnit')}`, c: '#4f8ef7' },
                    { l: t('orderHub.b2bKpiAmount'), v: fmt(b2bStats.totalAmount), c: '#22c55e' },
                    { l: t('orderHub.b2bKpiAvgQty'), v: `${b2bStats.avgQty}${t('orderHub.b2bUnitPcs')}`, c: '#a855f7' },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card" style={{ '--accent': c, padding: '12px 14px' }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c, fontSize: 20 }}>{v}</div>
                    </div>
                ))}
            </div>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 12 }}>{t('orderHub.b2bOrderListTitle')}</div>
                <div style={{ display: "grid", gap: 8 }}>
                    {B2B_ORDERS.map(o => (
                        <div key={o.id} style={{ padding: "14px 16px", borderRadius: 12, background: 'var(--surface)', border: '1px solid #e5e7eb', display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 800, fontSize: 12, color: '#1e293b' }}>{o.id}</span>
                                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, fontWeight: 700, background: "rgba(79,142,247,0.12)", color: "#4f8ef7", border: "1px solid rgba(79,142,247,0.25)" }}>{o.status}</span>
                                </div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{o.buyer} · SKU {o.skus}{t('orderHub.b2bSku')} · {o.qty}{t('orderHub.b2bUnitPcs')}</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>{fmt(o.amount)}</div>
                        </div>
                    ))}
                    {B2B_ORDERS.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 12 }}>{t('orderHub.noData')}</div>}
                </div>
            </div>
        </div>
    );
}

/* ? AutoRoutingTab ? */
function AutoRoutingTab() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const { orders } = useGlobalData();
    const [rules, setRules] = React.useState([]);
    const [showForm, setShowForm] = React.useState(false);
    const [form, setForm] = React.useState({ name: '', condition: '', targetWh: '', priority: 5 });
    const [simResult, setSimResult] = React.useState(null);
    const toggleRule = (id) => setRules(p => p.map(r => r.id === id ? { ...r, active: !r.active } : r));
    const simulate = () => {
        const total = orders.length;
        const matched = rules.filter(r => r.active).reduce((s, r) => s + r.matched, 0);
        setSimResult({ total, matched, ratio: total > 0 ? ((matched / total) * 100).toFixed(1) : '0', savings: fmt(matched * 800) });
    };
    const addRule = () => {
        if (!form.name) return;
        setRules(p => [{ ...form, id: `R${Date.now().toString(36).toUpperCase()}`, active: true, matched: 0, priority: Number(form.priority) }, ...p]);
        setForm({ name: '', condition: '', targetWh: '', priority: 5 });
        setShowForm(false);
    };
    const inp = (lbl, key, type = 'text') => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{lbl}</label>
            <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, background: '#f9fafb', border: '1px solid var(--border)', color: '#1e293b', fontSize: 12 }} />
        </div>
    );
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{t('orderHub.routingEngineTitle')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{t('orderHub.routingEngineDesc')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={simulate} style={{ padding: '7px 14px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: 8, color: '#22c55e', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>{t('orderHub.routingSimBtn')}</button>
                    <button onClick={() => setShowForm(p => !p)} style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', border: 'none', borderRadius: 8, color: '#1e293b', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>{t('orderHub.routingAddBtn')}</button>
                </div>
            </div>
            {simResult && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    {[
                        { l: t('orderHub.routingAllOrders'), v: simResult.total, c: '#4f8ef7' },
                        { l: t('orderHub.routingApplied'), v: simResult.matched, c: '#22c55e' },
                        { l: t('orderHub.routingApplyRate'), v: simResult.ratio + '%', c: '#a855f7' },
                        { l: t('orderHub.routingSavings'), v: simResult.savings, c: '#f59e0b' },
                    ].map(({ l, v, c }) => (
                        <div key={l} style={{ padding: '12px 16px', borderRadius: 12, background: `${c}08`, border: `1px solid ${c}22`, textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{l}</div>
                        </div>
                    ))}
                </div>
            )}
            {showForm && (
                <div style={{ padding: 16, background: 'rgba(79,142,247,0.07)', borderRadius: 12, border: '1px solid rgba(79,142,247,0.2)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{t('orderHub.routingNewRule')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                        {inp(t('orderHub.routingRuleLabel'), 'name')}
                        {inp(t('orderHub.routingCondLabel'), 'condition')}
                        {inp(t('orderHub.routingWhLabel'), 'targetWh')}
                        {inp(t('orderHub.routingPriority'), 'priority', 'number')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                        <button onClick={addRule} style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: 8, color: '#1e293b', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>{t('orderHub.routingRegister')}</button>
                        <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: '#e5e7eb', border: 'none', borderRadius: 8, color: '#374151', cursor: 'pointer', fontSize: 12 }}>{t('orderHub.routingCancel')}</button>
                    </div>
                </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
                {[...rules].sort((a, b) => a.priority - b.priority).map(r => (
                    <div key={r.id} style={{ padding: '14px 18px', borderRadius: 12, background: '#f9fafb', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, opacity: r.active ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(79,142,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#4f8ef7' }}>P{r.priority}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('orderHub.routingCondition')}: {r.condition}</div>
                                <div style={{ fontSize: 11, color: '#22c55e', marginTop: 1 }}>→{r.targetWh}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#4f8ef7' }}>{r.matched}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('orderHub.routingMatched')}</div>
                            </div>
                            <button onClick={() => toggleRule(r.id)} style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: r.active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)', color: r.active ? '#22c55e' : 'var(--text-3)' }}>
                                {r.active ? t('orderHub.routingActive') : t('orderHub.routingInactive')}
                            </button>
                        </div>
                    </div>
                ))}
                {rules.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 12 }}>{t('orderHub.routingNoRules')}</div>}
            </div>
        </div>
    );
}

/* === Guide Tab: 15-Step Enterprise Guide === */
function GuideTab() {
    const { t } = useI18n();
    const COLORS = ['#4f8ef7', '#22c55e', '#f59e0b', '#a855f7', '#6366f1', '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6', '#e11d48', '#06b6d4', '#0ea5e9', '#f97316'];
    const ICONS = ['📬', '📋', '🚚', '⚠️', '💰', '🌏', '🏢', '🚦', '⏰', '👥', '📦', '🔔', '📊', '🔐', '🚀'];
    const steps = [];
    for (let i = 1; i <= 15; i++) { const title = t('orderHub.guideStep' + i + 'Title', ''); if (title && !title.includes('orderHub.')) steps.push({ title, desc: t('orderHub.guideStep' + i + 'Desc', ''), icon: ICONS[i - 1], color: COLORS[i - 1] }); }
    const tips = [];
    for (let i = 1; i <= 10; i++) { const tip = t('orderHub.guideTip' + i, ''); if (tip && !tip.includes('orderHub.')) tips.push(tip); }

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, border: "1px solid #fed7aa", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('orderHub.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, fontWeight: 600, WebkitTextFillColor: "#1e293b" }}>{t('orderHub.guideSub')}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {steps.map((s, i) => (
                    <div key={i} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20 }}>STEP {i + 1}</span>
                                <span style={{ fontWeight: 800, fontSize: 14, color: s.color }}>{s.title}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.7 }}>{s.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
            {tips.length > 0 && (
                <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "20px" }}>
                    <div style={{ fontWeight: 900, fontSize: 15, color: "#1e293b", marginBottom: 14 }}>💡 {t('orderHub.guideTipsTitle')}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.1)" }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ???MAIN ??OrderHub Enterprise Edition ???*/
export default function OrderHub() {
    const { fmt } = useCurrency();
    const [tab, setTab] = useState("overview");
    const { t, lang } = useI18n();
    const { orders, claimHistory, settlement, addAlert, connectors } = useGlobalData();

    /* ?? ConnectorSyncContext ??Integration Hub channel awareness ?? */
    const { connectedChannels: csChannels, refresh: csRefresh } = useConnectorSync();

    /* ?? SecurityGuard ?? */
    const [hackAlert, setHackAlert] = useState(null);
    const secAddAlert = useCallback((a) => {
        if (typeof addAlert === 'function') addAlert(a);
        if (a.type === 'error' || String(a.msg).includes('XSS')) setHackAlert(a.msg);
    }, [addAlert]);
    useSecurityGuard({ addAlert: secAddAlert, enabled: true });

    /* ?? BroadcastChannel ??cross-tab sync ?? */
    const broadcast = useCrossTabSync(useCallback((msg) => {
        if (msg?.type === 'order_update' || msg?.type === 'channel_update') csRefresh?.();
    }, []));

    /* ?? Dynamic channels from Integration Hub ?? */
    const CHANNELS = useMemo(() => {
        const base = [...DEFAULT_CHANNELS];
        const hubIds = new Set(base.map(c => c.id));
        (connectors || []).filter(c => c.status === 'connected' || c.status === 'ok').forEach(c => {
            const cid = c.channel || c.id;
            if (!hubIds.has(cid)) {
                base.push({ id: cid, name: c.label || c.name || cid, icon: '🔌', color: '#4f8ef7' });
                hubIds.add(cid);
            }
        });
        if (csChannels && typeof csChannels === 'object') {
            Object.entries(csChannels).forEach(([chId, info]) => {
                if (info?.connected && !hubIds.has(chId)) {
                    base.push({ id: chId, name: chId, icon: '🔌', color: '#4f8ef7' });
                    hubIds.add(chId);
                }
            });
        }
        return base;
    }, [connectors, csChannels]);

    const kpis = useMemo(() => ({
        orders: orders.length, claims: claimHistory.length,
        deliveries: orders.filter(o => o.carrier).length, channels: CHANNELS.length,
    }), [orders, claimHistory, CHANNELS]);

    const TABS = useMemo(() => [
        { id: "overview", label: `📊 ${t("orderHub.tabOverview")}` },
        { id: "orders", label: `📋 ${t("orderHub.tabOrders")}` },
        { id: "claims", label: `⚠ ${t("orderHub.tabClaims")}` },
        { id: "delivery", label: `🚚 ${t("orderHub.tabDelivery")}` },
        { id: "settlement", label: `💰 ${t("orderHub.tabSettlement")}` },
        { id: "intl", label: `🌏 ${t("orderHub.tabIntl")}` },
        { id: "b2b", label: `🏢 ${t("orderHub.tabB2B")}` },
        { id: "settings", label: `⚙ ${t("orderHub.tabSettings")}` },
        { id: "routing", label: `🚦 ${t("orderHub.tabRouting")}` },
        { id: "guide", label: `📖 ${t("orderHub.tabGuide")}` },
    ], [t]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
            {/* ─── Fixed Header Zone (Hero + LiveFeed + KPI + SubTabs) ─── */}
            <div style={{ padding: '14px 24px 0', flexShrink: 0 }}>
                {/* Security Alert */}
                {hackAlert && (
                    <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span>⚠️ {hackAlert}</span>
                        <button onClick={() => setHackAlert(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    </div>
                )}
                {/* Hero Section — compact */}
                <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)', borderRadius: 14, padding: '14px 20px', border: '1px solid #bfdbfe', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#dbeafe,#d1fae5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '1px solid #bfdbfe' }}>📬</div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', WebkitTextFillColor: '#1e293b' }}>{t('orderHub.heroTitle')}</div>
                            <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginTop: 1 }}>{t('orderHub.heroDescI18n')}</div>
                        </div>
                    </div>
                </div>
                {/* Live Ingest Bar — compact */}
                <div style={{ marginBottom: 4 }}><LiveIngestBar tab={tab} /></div>
                {/* KPI Cards — compact */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 6 }}>
                    {[
                        { l: t('orderHub.kpiCollected'), v: kpis.orders, c: '#4f8ef7' },
                        { l: t('orderHub.kpiClaimRet'), v: kpis.claims, c: '#ef4444' },
                        { l: t('orderHub.kpiShipTrack'), v: kpis.deliveries, c: '#22c55e' },
                        { l: t('orderHub.kpiConnCh'), v: kpis.channels, c: '#a855f7' },
                    ].map(({ l, v, c }) => (
                        <div key={l} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{l}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div>
                        </div>
                    ))}
                </div>
                {/* Fixed Sub-tabs — OmniChannel-style pill bar */}
                <div style={{ display: 'flex', gap: 4, padding: '5px', background: '#f1f5f9', borderRadius: 14, flexWrap: 'wrap', marginBottom: 2 }}>
                    {TABS.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)}
                            style={{ padding: '7px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: tab === tb.id ? 800 : 500, fontSize: 11, background: tab === tb.id ? '#2563eb' : '#ffffff', color: tab === tb.id ? '#ffffff' : '#374151', transition: 'all 150ms', WebkitTextFillColor: tab === tb.id ? '#ffffff' : '#374151' }}>{tb.label}</button>
                    ))}
                </div>
            </div>
            {/* ─── Scrollable Content Zone ─── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
                {tab === "overview" && <OrderHubOverviewTab />}
                {tab === "orders" && <OrderTab />}
                {tab === "claims" && <ClaimTab />}
                {tab === "delivery" && <DeliveryTab />}
                {tab === "settlement" && <SettlementTab />}
                {tab === "intl" && <IntlOrderTab />}
                {tab === "b2b" && <B2BOrderTab />}
                {tab === "settings" && <CollectSettingTab />}
                {tab === "routing" && <AutoRoutingTab />}
                {tab === "guide" && <GuideTab />}
            </div>
        </div>
    );
}
