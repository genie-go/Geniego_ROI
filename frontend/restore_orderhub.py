import os
import re

path = 'D:/project/GeniegoROI/frontend/src/pages/OrderHub.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

idx_start = text.find('/* ??? Tab: Orders (fully i18n) ??? */')
idx_end = text.find('/* ???MAIN ??OrderHub Enterprise Edition ???*/')

if idx_start == -1 or idx_end == -1:
    print("Cannot find markers!")
    exit(1)

clean_code = """/* ??? Tab: Orders (fully i18n) ??? */
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
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7' }}>{o.id}</td>
                            <td><span style={{ fontSize:16, marginRight:6 }}>{ch(o.channel)?.icon}</span><span style={{ fontSize:11 }}>{ch(o.channel)?.name}</span></td>
                            <td><div style={{ fontSize:11, fontWeight:700 }}>{o.name}</div><div style={{ fontSize:9, color:'var(--text-3)' }}>SKU: {o.sku}</div></td>
                            <td style={{ textAlign:'center' }}>{o.qty}</td>
                            <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:11 }}>{fmt(o.total)}</td>
                            <td style={{ fontSize:11 }}>{o.buyer}</td>
                            <td><StatusBadge label={statusLabels[o.status] || o.status} cls={STATUS_CLS[o.status]} /></td>
                            <td>
                                <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                    {o.hasClaim && <span className="badge badge-red" style={{ fontSize:9 }}>{t('orderHub.badgeClaim')}</span>}
                                    {o.settled && <span className="badge badge-blue" style={{ fontSize:9 }}>{t('orderHub.badgeSettled')}</span>}
                                    {o.slaViolated && <span className="badge badge-yellow" style={{ fontSize:9 }}>{t('orderHub.badgeSlaDelay')}</span>}
                                    {o.tags?.map(tx => <span key={tx} className="badge" style={{ fontSize:9 }}>{tx}</span>)}
                                </div>
                            </td>
                            <td><button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={() => setDetail(o)}>{t('orderHub.btnDetail')}</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {totalPages > 1 && (
                <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:8 }}>
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setPage(i)} style={{ padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight: page === i ? 700 : 400, background: page === i ? 'rgba(79,142,247,0.2)' : 'transparent', color: page === i ? '#4f8ef7' : 'var(--text-3)' }}>{i + 1}</button>
                    ))}
                </div>
            )}
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                        <div style={{ fontWeight:900, fontSize:15, color:'#4f8ef7', fontFamily:'monospace' }}>{detail.id}</div>
                        <button className="btn-ghost" style={{ padding:'5px 10px' }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    {[[t('orderHub.labelChannel'),ch(detail.channel)?.name],[t('orderHub.labelBuyer'),detail.buyer],[t('orderHub.labelProduct'),detail.name],['SKU',detail.sku],[t('orderHub.labelQty'),detail.qty],[t('orderHub.labelTotal'),fmt(detail.total)],[t('orderHub.labelStatus'),statusLabels[detail.status]||detail.status],[t('orderHub.labelCarrier'),detail.carrier||'-'],[t('orderHub.labelTrackNo'),detail.trackingNo||'-'],[t('orderHub.labelOrderDate'),detail.orderedAt],[t('orderHub.labelWarehouse'),detail.wh]].map(([l,v]) => (
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(99,140,255,0.07)', fontSize:12 }}>
                            <span style={{ color:'var(--text-3)' }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
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
                            <td style={{ fontFamily:'monospace' }}>{fmt(s.grossSales)}</td>
                            <td style={{ fontFamily:'monospace', color:'#ef4444' }}>-{fmt(s.platformFee)}</td>
                            <td style={{ fontFamily:'monospace', color:'#22c55e', fontWeight:700 }}>{fmt(s.netPayout)}</td>
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
                            <td style={{ fontFamily:'monospace', color:'#4f8ef7' }}>{d.id}</td>
                            <td>{ch(d.ch).name}</td><td>{d.carrier}</td><td style={{ fontFamily:'monospace' }}>{d.trackingNo || `TRK-${d.id}`}</td>
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
                            <td style={{ fontFamily:'monospace', color:'#4f8ef7' }}>{c.id}</td>
                            <td style={{ fontFamily:'monospace' }}>{c.orderId}</td>
                            <td>{ch(c.channel).name}</td>
                            <td><StatusBadge label={claimTypeLabels[c.type] || c.type} cls="badge-purple" /></td>
                            <td><StatusBadge label={claimStatusLabels[c.status] || c.status} cls={CLAIM_CLS[c.status]} /></td>
                            <td style={{ fontSize:11 }}>{c.reason}</td>
                            <td style={{ fontFamily:'monospace', fontWeight:700 }}>{fmt(c.amount||0)}</td>
                            <td style={{ fontSize:11, color:'var(--text-3)' }}>{c.requestedAt?.substring(0,10)}</td>
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
    const intlOrders = (orders || []).filter(o => ['amazon_us','amazon_jp','lazada','shopee','zalando'].includes(o.ch));
    const stats = {
        total: intlOrders.length,
        totalRevenue: intlOrders.reduce((s,o)=>s+(o.total||0), 0),
        totalDuty: intlOrders.reduce((s,o)=>s+((o.total||0)*0.08), 0),
        ddp: intlOrders.filter(o=>o.incoterm==='DDP').length
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
                            <td style={{ fontFamily:'monospace', fontSize:10, color:'#4f8ef7' }}>{o.id}</td>
                            <td>{INTL_CHANNELS.find(c=>c.id===o.ch)?.icon||'🌐'} {INTL_CHANNELS.find(c=>c.id===o.ch)?.name||o.ch}</td>
                            <td>{COUNTRY_FLAG[o.country]||'🌐'} {o.country||'-'}</td>
                            <td style={{ fontSize:11 }}>{o.name}</td>
                            <td style={{ textAlign:'center' }}>{o.qty}</td>
                            <td style={{ fontFamily:'monospace', fontWeight:700, fontSize:11 }}>{fmt(o.total||0)}</td>
                            <td><StatusBadge label={o.status || t('orderHub.statusPaid')} cls={STATUS_CLS[o.status] || 'badge-blue'} /></td>
                            <td><button className="btn-ghost" style={{ fontSize:10, padding:'3px 8px' }} onClick={() => setDetail(o)}>{t('orderHub.intlDetailBtn')}</button></td>
                        </tr>
                    ))}
                    {intlOrders.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20 }}>{t('orderHub.intlNoData')}</td></tr>}
                </tbody>
            </table>
            {detail && (
                <Drawer onClose={() => setDetail(null)}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
                        <div style={{ fontWeight:900, fontSize:15, color:'#4f8ef7', fontFamily:'monospace' }}>{detail.id}</div>
                        <button className="btn-ghost" style={{ padding:'5px 10px' }} onClick={() => setDetail(null)}>✕</button>
                    </div>
                    {[[t('orderHub.labelChannel'), INTL_CHANNELS.find(c=>c.id===detail.ch)?.name||detail.ch],[t('orderHub.intlColCountry'),`${COUNTRY_FLAG[detail.country]||'🌐'} ${detail.country||'-'}`],[t('orderHub.labelBuyer'),detail.buyer],[t('orderHub.labelProduct'),detail.name],[t('orderHub.labelQty'),detail.qty],[t('orderHub.labelTotal'),fmt(detail.total||0)],['Incoterm',detail.incoterm||'-'],['HS Code',detail.hsCode||'-'],[t('orderHub.intlEstDuty'),fmt((detail.total||0)*0.08)],[t('orderHub.labelCarrier'),detail.carrier||'-'],[t('orderHub.labelTrackNo'),detail.trackingNo||'-'],[t('orderHub.labelOrderDate'),detail.at||'-']].map(([l,v]) => (
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(99,140,255,0.07)', fontSize:12 }}>
                            <span style={{ color:'var(--text-3)' }}>{l}</span><span style={{ fontWeight:600 }}>{v}</span>
                        </div>
                    ))}
                    <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(79,142,247,0.06)', borderRadius:10 }}>
                        <div style={{ fontWeight:700, fontSize:12, marginBottom:8 }}>{t('orderHub.intlShipGuide')}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)' }}>{detail.incoterm==='DDP'?t('orderHub.intlDdpDesc'):t('orderHub.intlDduDesc')}</div>
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
        <div style={{ display:"grid", gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
                {[
                    { l:t('orderHub.b2bKpiOrders'), v:`${b2bStats.total}${t('orderHub.b2bUnit')}`, c:'#4f8ef7' },
                    { l:t('orderHub.b2bKpiAmount'), v:fmt(b2bStats.totalAmount), c:'#22c55e' },
                    { l:t('orderHub.b2bKpiAvgQty'), v:`${b2bStats.avgQty}${t('orderHub.b2bUnitPcs')}`, c:'#a855f7' },
                ].map(({l,v,c}) => (
                    <div key={l} className="kpi-card" style={{ '--accent':c, padding:'12px 14px' }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color:c, fontSize:20 }}>{v}</div>
                    </div>
                ))}
            </div>
            <div>
                <div style={{ fontWeight:800, fontSize:14, color: "var(--text-1)", marginBottom:12 }}>{t('orderHub.b2bOrderListTitle')}</div>
                <div style={{ display:"grid", gap:8 }}>
                    {B2B_ORDERS.map(o => (
                        <div key={o.id} style={{ padding:"14px 16px", borderRadius:12, background: 'var(--surface)', border: '1px solid var(--border)', display:"flex", alignItems:"center", gap:16 }}>
                            <div style={{ flex:1 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                                    <span style={{ fontWeight:800, fontSize:12, color: "var(--text-1)" }}>{o.id}</span>
                                    <span style={{ fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700, background:"rgba(79,142,247,0.12)", color:"#4f8ef7", border:"1px solid rgba(79,142,247,0.25)" }}>{o.status}</span>
                                </div>
                                <div style={{ fontSize:11, color:"#94a3b8" }}>{o.buyer} · SKU {o.skus}{t('orderHub.b2bSku')} · {o.qty}{t('orderHub.b2bUnitPcs')}</div>
                            </div>
                            <div style={{ fontSize:14, fontWeight:800, color:"#22c55e" }}>{fmt(o.amount)}</div>
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
    const inp = (lbl, key, type='text') => (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, color:'var(--text-3)', fontWeight:600 }}>{lbl}</label>
            <input type={type} value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} style={{ padding:'7px 10px', borderRadius:8, background:'rgba(0,0,0,0.35)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize:12 }} />
        </div>
    );
    return (
        <div style={{ display:'grid', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                    <div style={{ fontWeight:800, fontSize:14 }}>{t('orderHub.routingEngineTitle')}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{t('orderHub.routingEngineDesc')}</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    <button onClick={simulate} style={{ padding:'7px 14px', background:'rgba(34,197,94,0.15)', border:'1px solid #22c55e', borderRadius:8, color:'#22c55e', fontWeight:700, cursor:'pointer', fontSize:12 }}>{t('orderHub.routingSimBtn')}</button>
                    <button onClick={() => setShowForm(p=>!p)} style={{ padding:'7px 16px', background:'linear-gradient(135deg,#4f8ef7,#6366f1)', border:'none', borderRadius:8, color: 'var(--text-1)', fontWeight:700, cursor:'pointer', fontSize:12 }}>{t('orderHub.routingAddBtn')}</button>
                </div>
            </div>
            {simResult && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                    {[
                        { l:t('orderHub.routingAllOrders'), v:simResult.total, c:'#4f8ef7' },
                        { l:t('orderHub.routingApplied'), v:simResult.matched, c:'#22c55e' },
                        { l:t('orderHub.routingApplyRate'), v:simResult.ratio+'%', c:'#a855f7' },
                        { l:t('orderHub.routingSavings'), v:simResult.savings, c:'#f59e0b' },
                    ].map(({ l, v, c }) => (
                        <div key={l} style={{ padding:'12px 16px', borderRadius:12, background:`${c}08`, border:`1px solid ${c}22`, textAlign:'center' }}>
                            <div style={{ fontSize:20, fontWeight:900, color:c }}>{v}</div>
                            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{l}</div>
                        </div>
                    ))}
                </div>
            )}
            {showForm && (
                <div style={{ padding:16, background:'rgba(79,142,247,0.07)', borderRadius:12, border:'1px solid rgba(79,142,247,0.2)' }}>
                    <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>{t('orderHub.routingNewRule')}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
                        {inp(t('orderHub.routingRuleLabel'), 'name')}
                        {inp(t('orderHub.routingCondLabel'), 'condition')}
                        {inp(t('orderHub.routingWhLabel'), 'targetWh')}
                        {inp(t('orderHub.routingPriority'), 'priority', 'number')}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:14 }}>
                        <button onClick={addRule} style={{ padding:'7px 18px', background:'linear-gradient(135deg,#22c55e,#16a34a)', border:'none', borderRadius:8, color: 'var(--text-1)', fontWeight:700, cursor:'pointer', fontSize:12 }}>{t('orderHub.routingRegister')}</button>
                        <button onClick={() => setShowForm(false)} style={{ padding:'7px 14px', background: 'var(--border)', border:'none', borderRadius:8, color:'var(--text-2)', cursor:'pointer', fontSize:12 }}>{t('orderHub.routingCancel')}</button>
                    </div>
                </div>
            )}
            <div style={{ display:'grid', gap:10 }}>
                {[...rules].sort((a,b)=>a.priority-b.priority).map(r => (
                    <div key={r.id} style={{ padding:'14px 18px', borderRadius:12, background:'rgba(0,0,0,0.25)', border: '1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, opacity: r.active ? 1 : 0.5 }}>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(79,142,247,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'#4f8ef7' }}>P{r.priority}</div>
                            <div>
                                <div style={{ fontWeight:700, fontSize:13 }}>{r.name}</div>
                                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{t('orderHub.routingCondition')}: {r.condition}</div>
                                <div style={{ fontSize:11, color:'#22c55e', marginTop:1 }}>→{r.targetWh}</div>
                            </div>
                        </div>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                            <div style={{ textAlign:'center' }}>
                                <div style={{ fontSize:18, fontWeight:900, color:'#4f8ef7' }}>{r.matched}</div>
                                <div style={{ fontSize:10, color:'var(--text-3)' }}>{t('orderHub.routingMatched')}</div>
                            </div>
                            <button onClick={() => toggleRule(r.id)} style={{ padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, background: r.active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)', color: r.active ? '#22c55e' : 'var(--text-3)' }}>
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

/* ? Guide Tab (9 languages) ? */
function GuideTab() {
    const { t } = useI18n();
    const STEPS = useMemo(() => [
        { icon: '📬', title: t('orderHub.guideStep1Title'), desc: t('orderHub.guideStep1Desc'), color: '#4f8ef7' },
        { icon: '📋', title: t('orderHub.guideStep2Title'), desc: t('orderHub.guideStep2Desc'), color: '#22c55e' },
        { icon: '🚚', title: t('orderHub.guideStep3Title'), desc: t('orderHub.guideStep3Desc'), color: '#a855f7' },
        { icon: '⚠️', title: t('orderHub.guideStep4Title'), desc: t('orderHub.guideStep4Desc'), color: '#eab308' },
        { icon: '💰', title: t('orderHub.guideStep5Title'), desc: t('orderHub.guideStep5Desc'), color: '#06b6d4' },
        { icon: '🌏', title: t('orderHub.guideStep6Title'), desc: t('orderHub.guideStep6Desc'), color: '#f97316' },
        { icon: '🏢', title: t('orderHub.guideStep7Title'), desc: t('orderHub.guideStep7Desc'), color: '#ec4899' },
        { icon: '🚦', title: t('orderHub.guideStep8Title'), desc: t('orderHub.guideStep8Desc'), color: '#14b8a6' },
    ], [t]);
    const TIPS = useMemo(() => [
        t('orderHub.guideTip1'), t('orderHub.guideTip2'), t('orderHub.guideTip3'),
        t('orderHub.guideTip4'), t('orderHub.guideTip5'),
    ], [t]);
    return (
        <div style={{ display: 'grid', gap: 20 }}>
            <div className="card card-glass" style={{ textAlign: 'center', padding: '28px 24px' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{t('orderHub.guideTitle')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 600, margin: '6px auto 0' }}>{t('orderHub.guideSub')}</div>
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 16 }}>📚 {t('orderHub.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gap: 14 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 14, padding: '16px 18px', borderRadius: 14, background: `${s.color}08`, border: `1px solid ${s.color}22`, alignItems: 'start' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, border: `1px solid ${s.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: `${s.color}20`, padding: '2px 8px', borderRadius: 20 }}>STEP {i + 1}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="card card-glass">
                <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 14 }}>💡 {t('orderHub.guideTipsTitle')}</div>
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

new_text = text[:idx_start] + clean_code + text[idx_end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("OrderHub.jsx fixed!")
