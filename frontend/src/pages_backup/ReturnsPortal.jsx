import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useI18n } from '../i18n/index.js';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ── API helpers ────────────────────────────────────────────── */
const API = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const AUTH = (t) => ({ Authorization: `Bearer ${t}` });
const POST_JSON = (tok) => ({ ...AUTH(tok), 'Content-Type': 'application/json' });

/* ── Security ───────────────────────────────────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' }, { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' }, { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
];
const secCheck = (v = '') => { for (const p of SEC_PATTERNS) { if (p.re.test(v)) return p.type; } return null; };
const sanitize = (v = '') => { if (secCheck(v)) return ''; return v; };

const STATUS_COLOR = { pending: '#f97316', inspecting: '#4f8ef7', approved: '#22c55e', rejected: '#ef4444', refunded: '#a855f7', restocked: '#06b6d4' };
const CH_COLORS = { coupang: '#ef4444', naver: '#22c55e', '11st': '#f97316', amazon: '#f97316', tiktok: '#a855f7', shopee: '#f97316' };
const STATUSES = ['pending', 'inspecting', 'approved', 'rejected', 'refunded', 'restocked'];

/* ══════════════════════════════════════════════════════════════
   Security Overlay
   ══════════════════════════════════════════════════════════════ */
function SecurityOverlay({ threats, onDismiss }) {
    const { t } = useI18n();
    if (!threats.length) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a0000,#2d0a0a)', border: '2px solid #ef4444', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>{t('returnsPortal.securityAlert')}</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 20 }}>{t('returnsPortal.securityDesc')}</div>
                {threats.map((th, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 11, color: '#fca5a5', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>[{th.type}]</strong> {th.value.slice(0, 60)}… — {th.time}
                </div>
                ))}
                <button onClick={onDismiss} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'var(--text-1)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    🔒 {t('returnsPortal.securityDismiss')}
                </button>
            </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Dashboard
   ══════════════════════════════════════════════════════════════ */
function DashboardTab({ returns, reload, token, t, fmt }) {
    const pending = returns.filter(r => ['pending', 'inspecting'].includes(r.status));
    const defective = returns.filter(r => r.defective == 1);

    const handleWms = async (ret) => {
        await fetch(`${API}/v420/returns/${ret.id}/wms-link`, { method: 'POST', headers: AUTH(token) });
        reload();
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="fade-up">
            <div className="card">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>⏳ {t('returnsPortal.pendingReturns')}</div>
                {pending.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('returnsPortal.noData')}</div>}
                {pending.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{r.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{r.return_id} · {r.channel} · {r.reason}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (STATUS_COLOR[r.status] || '#64748b') + '18', color: STATUS_COLOR[r.status] || '#64748b' }}>{t(`returnsPortal.status_${r.status}`)}</span>
                            {!r.wms_linked && <button style={{ fontSize: 9, padding: '2px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: 'var(--text-1)', fontWeight: 700 }} onClick={() => handleWms(r)}>{t('returnsPortal.wmsLink')}</button>}
                    </div>
                ))}
            <div className="card">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>⚠️ {t('returnsPortal.defectiveStock')}</div>
                {defective.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('returnsPortal.noData')}</div>}
                {defective.map(r => (
                    <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>{r.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{r.sku} · {r.reason} · {r.qty}{t('returnsPortal.pcs')}</div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>{t('returnsPortal.defectiveSeparated')}</span>
                    </div>
                ))}
                <div style={{ marginTop: 12, padding: '10px', background: 'rgba(239,68,68,0.06)', borderRadius: 8, fontSize: 11, color: 'var(--text-3)' }}>
                    {t('returnsPortal.defectiveNote')}
                                </div>
                            </div>
                        </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Returns List
   ══════════════════════════════════════════════════════════════ */
function ListTab({ returns, reload, token, t, fmt, onSecThreat }) {
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', sku: '', order_id: '', channel: '', qty: '1', reason: '', refund_amt: '', track_no: '', defective: '0' });
    const filtered = statusFilter === 'all' ? returns : returns.filter(r => r.status === statusFilter);

    const addReturn = async () => {
        if (!form.name) return;
        await fetch(`${API}/v420/returns`, { method: 'POST', headers: POST_JSON(token), body: JSON.stringify(form) });
        setForm({ name: '', sku: '', order_id: '', channel: '', qty: '1', reason: '', refund_amt: '', track_no: '', defective: '0' });
        setShowAdd(false); reload();
    };

    const delReturn = async (id) => {
        if (!confirm(t('returnsPortal.confirmDelete'))) return;
        await fetch(`${API}/v420/returns/${id}`, { method: 'DELETE', headers: AUTH(token) });
        reload();
    };

    const changeStatus = async (id, status) => {
        await fetch(`${API}/v420/returns/${id}/status`, { method: 'POST', headers: POST_JSON(token), body: JSON.stringify({ status }) });
        reload();
    };

    const handleWms = async (ret) => {
        await fetch(`${API}/v420/returns/${ret.id}/wms-link`, { method: 'POST', headers: AUTH(token) });
        reload();
    };

    const handleInput = (field) => (e) => {
        const v = e.target.value;
        const threat = secCheck(v);
        if (threat) { onSecThreat(threat, v); return; }
        setForm(f => ({ ...f, [field]: v }));
    };

    return (
        <div className="card fade-up">
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {['all', ...STATUSES].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        style={{ fontSize: 10, padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: statusFilter === s ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.06)', color: statusFilter === s ? '#fff' : 'var(--text-3)' }}>
                        {s === 'all' ? t('returnsPortal.all') : t(`returnsPortal.status_${s}`)}
                    </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>{filtered.length} {t('returnsPortal.items')}</span>
                <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '4px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#06b6d4,#4f8ef7)', color: 'var(--text-1)', fontWeight: 700, fontSize: 10 }}>
                    {showAdd ? '✕' : '➕'} {showAdd ? t('returnsPortal.cancel') : t('returnsPortal.addReturn')}
                </button>

            {showAdd && (
                <div style={{ padding: 14, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12, marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>➕ {t('returnsPortal.addReturn')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                        {[['name', t('returnsPortal.productName')], ['sku', t('returnsPortal.labelSku')], ['order_id', t('returnsPortal.orderId')], ['channel', t('returnsPortal.channel')], ['qty', t('returnsPortal.qty')], ['reason', t('returnsPortal.reason')], ['refund_amt', t('returnsPortal.refundAmt')], ['track_no', t('returnsPortal.trackNo')]].map(([k, lbl]) => (
                            <input key={k} placeholder={lbl} value={form[k]} onChange={handleInput(k)}
                                style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
                        ))}
                        <select value={form.defective} onChange={e => setForm(f => ({ ...f, defective: e.target.value }))}
                            style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }}>
                            <option value="0">{t('returnsPortal.normalProduct')}</option>
                            <option value="1">{t('returnsPortal.defectiveProduct')}</option>
                        </select>
                    <button onClick={addReturn} style={{ marginTop: 10, padding: '6px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>
                        ✅ {t('returnsPortal.register')}
                    </button>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                    {[t('returnsPortal.returnId'), t('returnsPortal.orderId'), t('returnsPortal.labelSku'), t('returnsPortal.productName'), t('returnsPortal.channel'), t('returnsPortal.qty'), t('returnsPortal.reason'), t('returnsPortal.reqDate'), t('returnsPortal.trackNo'), t('returnsPortal.refundAmt'), t('returnsPortal.status'), 'WMS', ''].map(h =>
                        <th key={h || 'act'} style={{ padding: '8px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                    )}
                </tr></thead>
                <tbody>
                    {filtered.length === 0 && <tr><td colSpan={13} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('returnsPortal.noData')}</td></tr>}
                    {filtered.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: r.defective == 1 ? 'rgba(239,68,68,0.03)' : '' }}>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#ef4444', padding: '8px 4px' }}>{r.return_id}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, padding: '8px 4px' }}>{(r.order_id || '').slice(-6)}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, padding: '8px 4px' }}>{(r.sku || '').slice(0, 10)}</td>
                            <td style={{ fontSize: 11, fontWeight: 600, padding: '8px 4px' }}>{r.name}</td>
                            <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: (CH_COLORS[r.channel] || '#64748b') + '18', color: CH_COLORS[r.channel] || '#64748b' }}>{r.channel}</span></td>
                            <td style={{ textAlign: 'center', padding: '8px 4px' }}>{r.qty}</td>
                            <td style={{ fontSize: 10, padding: '8px 4px' }}>{r.reason}</td>
                            <td style={{ fontSize: 10, color: 'var(--text-3)', padding: '8px 4px' }}>{r.req_date}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 8, padding: '8px 4px', color: r.track_no ? '#4f8ef7' : 'var(--text-3)' }}>{r.track_no || '—'}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, padding: '8px 4px', color: '#a855f7' }}>{fmt(r.refund_amt)}</td>
                            <td style={{ padding: '8px 4px' }}>
                                <select value={r.status} onChange={e => changeStatus(r.id, e.target.value)}
                                    style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, border: 'none', cursor: 'pointer', background: (STATUS_COLOR[r.status] || '#64748b') + '20', color: STATUS_COLOR[r.status] || '#64748b', fontWeight: 700 }}>
                                    {STATUSES.map(s => <option key={s} value={s}>{t(`returnsPortal.status_${s}`)}</option>)}
                                </select>
                            </td>
                            <td style={{ padding: '8px 4px' }}>{r.wms_linked == 1 ? <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700 }}>✅</span> : <button onClick={() => handleWms(r)} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontWeight: 700 }}>WMS↑</button>}</td>
                            <td style={{ padding: '4px' }}><button onClick={() => delReturn(r.id)} style={{ width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10 }}>✕</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Portal Settings
   ══════════════════════════════════════════════════════════════ */
function SettingsTab({ token, t }) {
    const settingItems = [
        [t('returnsPortal.returnPeriod'), t('returnsPortal.returnPeriodVal')],
        [t('returnsPortal.freeReturnCriteria'), t('returnsPortal.freeReturnCriteriaVal')],
        [t('returnsPortal.shippingCostBearer'), t('returnsPortal.shippingCostBearerVal')],
        [t('returnsPortal.autoRefundCondition'), t('returnsPortal.autoRefundConditionVal')],
    ];
    const autoItems = [
        t('returnsPortal.autoClassify'), t('returnsPortal.autoWmsSync'),
        t('returnsPortal.autoRefund'), t('returnsPortal.autoDefectSeparate'), t('returnsPortal.autoSlackNotify'),
    ];
    return (
        <div className="card fade-up">
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>🔗 {t('returnsPortal.portalSettings')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ padding: '16px', background: 'rgba(79,142,247,0.06)', borderRadius: 12, border: '1px solid rgba(79,142,247,0.15)' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>📋 {t('returnsPortal.portalConfig')}</div>
                    {settingItems.map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                            <span style={{ color: 'var(--text-3)' }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
                    ))}
                <div style={{ padding: '16px', background: 'rgba(34,197,94,0.06)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.15)' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>⚡ {t('returnsPortal.automationSettings')}</div>
                    {autoItems.map(label => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                            <span>{label}</span>
                            <div style={{ width: 32, height: 18, borderRadius: 9, background: 'rgba(255,255,255,0.1)', position: 'relative' }}>
                                <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', top: 2, left: 2 }} />
                        </div>
                    ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Analytics
   ══════════════════════════════════════════════════════════════ */
function AnalyticsTab({ returns, t }) {
    const reasonDist = {};
    returns.forEach(r => { reasonDist[r.reason] = (reasonDist[r.reason] || 0) + 1; });
    const reasonArr = Object.entries(reasonDist).sort((a, b) => b[1] - a[1]);

    const channelDist = {};
    returns.forEach(r => { channelDist[r.channel] = (channelDist[r.channel] || 0) + 1; });
    const chArr = Object.entries(channelDist).sort((a, b) => b[1] - a[1]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="fade-up">
            <div className="card">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📊 {t('returnsPortal.reasonDistribution')}</div>
                {reasonArr.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('returnsPortal.noData')}</div>}
                {reasonArr.map(([reason, cnt]) => {
                    const pct = returns.length ? Math.round(cnt / returns.length * 100) : 0;
                    return (
                        <div key={reason} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span>{reason}</span><span style={{ fontWeight: 700, color: '#4f8ef7' }}>{cnt}{t('returnsPortal.items')} ({pct}%)</span>
                            <div style={{ height: 6, background: 'var(--border)', borderRadius: 4 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(135deg,#ef4444,#f97316)', borderRadius: 4 }} />
                                        </div>

  </div>
);
                })}
            <div className="card">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>📡 {t('returnsPortal.channelReturnRate')}</div>
                {chArr.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t
                        </div>
('returnsPortal.noData')}</div>}
                {chArr.map(([ch, cnt]) => {
                    const pct = returns.length ? Math.round(cnt / returns.length * 100) : 0;
                    return (
                        <div key={ch} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: CH_COLORS[ch] || '#64748b', fontWeight: 700 }}>{ch}</span><span>{cnt}{t('returnsPortal.items')} ({pct}%)</span>
                            <div style={{ height: 6, background: 'var(--border)', borderRadius: 4 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: CH_COLORS[ch] || '#64748b', borderRadius: 4, opacity: 0.8 }} />
                            </div>
                    
                      </div>
);
                })}
        </div>
    </div>
hipment (교환/재배송)
   ══════════════════════════════════════════════════════════════ */
function ExchangeTab({ token, returns, reload, t, fmt, onSecThreat }) {
    const [exchanges, setExchanges] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ returnId: '', type: 'exchange', newSku: '', reason: '', notes: '' });

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/v420/returns/exchanges`, { headers: AUTH(token) })
            .then(r => r.json()).then(d => setExchanges(d.exchanges || [])).catch(() => {});
    }, [token]);

    const createExchange = async () => {
        if (!form.returnId) return;
        await fetch(`${API}/v420/returns/exchanges`, { method: 'POST', headers: POST_JSON(token), body: JSON.stringify(form) });
        setForm({ returnId: '', type: 'exchange', newSku: '', reason: '', notes: '' }); setShowAdd(false);
        reload();
        fetch(`${API}/v420/returns/exchanges`, { headers: AUTH(token) }).then(r => r.json()).then(d => setExchanges(d.exchanges || [])).catch(() => {});
    };

    const handleInput = (f) => (e) => { const v = e.target.value; if (secCheck(v)) { onSecThreat(secCheck(v), v); return; } setForm(p => ({ ...p, [f]: v })); };
    const EX_STATUS = { pending: '#f97316', processing: '#4f8ef7', shipped: '#a855f7', completed: '#22c55e', cancelled: '#ef4444' };

    return (
        <div className="fade-up" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>🔄 {t('returnsPortal.tabExchange')}</div>
                <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '6px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#06b6d4,#4f8ef7)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>
                    {showAdd ? '✕' : '➕'} {showAdd ? t('returnsPortal.cancel') : t('returnsPortal.exCreate')}
                </button>
            {showAdd && (
                <div style={{ padding: 16, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                        <select value={form.returnId} onChange={e => setForm(f => ({ ...f, returnId: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }}>
                            <option value="">{t('returnsPortal.exSelectReturn')}</option>
                            {returns.map(r => <option key={r.id} value={r.return_id}>{r.return_id} — {r.name}</option>)}
                        </select>
                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }}>
                            <option value="exchange">{t('returnsPortal.exTypeExchange')}</option>
                            <option value="reship">{t('returnsPortal.exTypeReship')}</option>
                        </select>
                        {[['newSku', t('returnsPortal.exNewSku')], ['reason', t('returnsPortal.reason')], ['notes', t('returnsPortal.exNotes')]].map(([k, lbl]) => (
                            <input key={k} placeholder={lbl} value={form[k]} onChange={handleInput(k)} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
                        ))}
                    <button onClick={createExchange} style={{ marginTop: 10, padding: '6px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>✅ {t('returnsPortal.register')}</button>
            )}
            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                        {[t('returnsPortal.returnId'), t('returnsPortal.exType'), t('returnsPortal.exNewSku'), t('returnsPortal.reason'), t('returnsPortal.exNotes'), t('returnsPortal.status'), t('returnsPortal.reqDate')].map(h =>
                            <th key={h} style={{ padding: '8px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                        )}
                    </tr></thead>
                    <tbody>
                        {exchanges.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('returnsPortal.noData')}</td></tr>}
                        {exchanges.map((ex, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 4px', fontFamily: 'monospace', fontSize: 10, color: '#ef4444' }}>{ex.returnId}</td>
                                <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: ex.type === 'exchange' ? 'rgba(79,142,247,0.15)' : 'rgba(168,85,247,0.15)', color: ex.type === 'exchange' ? '#4f8ef7' : '#a855f7' }}>{ex.type === 'exchange' ? t('returnsPortal.exTypeExchange') : t('returnsPortal.exTypeReship')}</span></td>
                                <td style={{ padding: '8px 4px', fontFamily: 'monospace', fontSize: 10 }}>{ex.newSku || '—'}</td>
                                <td style={{ padding: '8px 4px', fontSize: 10 }}>{ex.reason}</td>
                                <td style={{ padding: '8px 4px', fontSize: 10, color: 'var(--text-3)' }}>{ex.notes || '—'}</td>
                                <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: (EX_STATUS[ex.status] || '#64748b') + '20', color: EX_STATUS[ex.status] || '#64748b' }}>{t(`returnsPortal.exStatus${(ex.status || 'pending').charAt(0).toUpperCase() + (ex.status || 'pending').slice(1)}`)}</span></td>
                                <td style={{ padding: '8px 4px', fontSize: 10, color: 'var(--text-3)' }}>{ex.createdAt || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Return Tracking (반품 물류 추적)
   ══════════════════════════════════════════════════════════════ */
function TrackingTab({ token, returns, t }) {
    const tracked = returns.filter(r => r.track_no);
    const STAGES = ['requested', 'pickup', 'transit', 'received', 'inspected'];

    return (
        <div className="fade-up" style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>🚚 {t('returnsPortal.tabTracking')}</div>
            {tracked.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('returnsPortal.noData')}</div>}
            {tracked.map(r => {
                const stageIdx = r.status === 'restocked' || r.status === 'refunded' ? 4 : r.status === 'approved' || r.status === 'rejected' ? 3 : r.status === 'inspecting' ? 2 : r.status === 'pending' ? 1 : 0;
                return (
                    <div key={r.id} className="card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 800 }}>{r.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{r.return_id} · {t('returnsPortal.trackNo')}: {r.track_no}</div>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: (STATUS_COLOR[r.status] || '#64748b') + '18', color: STATUS_COLOR[r.status] || '#64748b' }}>{t(`returnsPortal.status_${r.status}`)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                            {STAGES.map((stage, i) => {
                                const done = i <= stageIdx;
                                return (
                                    <React.Fragment key={stage}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 14, background: done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.08)', border: `2px solid ${done ? '#22c55e' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{done ? '✓' : (i + 1)}</div>
                                            <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4, color: done ? '#22c55e' : 'var(--text-3)', textAlign: 'center' }}>{t(`returnsPortal.trkStage_${stage}`)}</div>
                                        {i < STAGES.length - 1 && <div style={{ height: 2, flex: 0.5, background: done ? '#22c55e' : 'rgba(255,255,255,0.08)', margin: '0 2px', marginBottom: 20 }} />}
                                    </React.Fragment>
                                
                                
);
                            })}
                                    </div>

      </div>
    </div>
  </div>
);
            })}═══════════════════════════════════════════════ */
function RefundStatusTab({ token, returns, t, fmt }) {
    const refundable = returns.filter(r => ['approved', 'refunded'].includes(r.status));
    const totalRefunded = refundable.filter(r => r.status === 'refunded').reduce((s, r) => s + (Number(r.refund_amt) || 0), 0);
    const totalPending = refundable.filter(r => r.status === 'approved').reduce((s, r) => s + (Number(r.refund_amt) || 0), 0);

    return (
        <div className="fade-up" style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>💳 {t('returnsPortal.tabRefundStatus')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                    { l: t('returnsPortal.rfCompleted'), v: fmt(totalRefunded), c: '#22c55e', icon: '✅' },
                    { l: t('returnsPortal.rfPending'), v: fmt(totalPending), c: '#f97316', icon: '⏳' },
                    { l: t('returnsPortal.rfTotal'), v: fmt(totalRefunded + totalPending), c: '#a855f7', icon: '💰' },
                ].map(s => (
                    <div key={s.l} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: `1px solid ${s.c}22` }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>{s.l}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: s.c, marginTop: 2 }}>{s.v}</div>
                ))}
            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                        {[t('returnsPortal.returnId'), t('returnsPortal.productName'), t('returnsPortal.channel'), t('returnsPortal.refundAmt'), t('returnsPortal.rfMethod'), t('returnsPortal.status')].map(h =>
                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                        )}
                    </tr></thead>
                    <tbody>
                        {refundable.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('returnsPortal.noData')}</td></tr>}
                        {refundable.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 10, color: '#ef4444' }}>{r.return_id}</td>
                                <td style={{ padding: '8px 6px', fontWeight: 700, fontSize: 11 }}>{r.name}</td>
                                <td style={{ padding: '8px 6px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: (CH_COLORS[r.channel] || '#64748b') + '18', color: CH_COLORS[r.channel] || '#64748b' }}>{r.channel}</span></td>
                                <td style={{ padding: '8px 6px', fontWeight: 700, color: '#a855f7' }}>{fmt(r.refund_amt)}</td>
                                <td style={{ padding: '8px 6px', fontSize: 10 }}>{t('returnsPortal.rfOriginalMethod')}</td>
                                <td style={{ padding: '8px 6px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: r.status === 'refunded' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)', color: r.status === 'refunded' ? '#22c55e' : '#f97316' }}>{r.status === 'refunded' ? t('returnsPortal.rfDone') : t('returnsPortal.rfWaiting')}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Usage Guide (이용 가이드)
   ══════════════════════════════════════════════════════════════ */
function RPGuideTab() {
    const { t } = useI18n();
    const STEPS = Array.from({ length: 10 }, (_, i) => ({ num: i + 1, title: t(`returnsPortal.guideStep${i + 1}Title`), desc: t(`returnsPortal.guideStep${i + 1}Desc`) }));
    const ICONS = ['📦', '🔍', '✅', '🚚', '💳', '🔄', '📊', '⚡', '🔒', '📖'];
    const COLORS = ['#ef4444', '#f97316', '#22c55e', '#4f8ef7', '#a855f7', '#06b6d4', '#ec4899', '#eab308', '#6366f1', '#14b8a6'];
    const TIPS = Array.from({ length: 5 }, (_, i) => t(`returnsPortal.guideTip${i + 1}`));

    const TAB_REF = [
        { icon: '📊', tab: t('returnsPortal.tabDashboard'), desc: t('returnsPortal.guideTabDashboardDesc'), color: '#4f8ef7' },
        { icon: '📋', tab: t('returnsPortal.tabList'), desc: t('returnsPortal.guideTabListDesc'), color: '#ef4444' },
        { icon: '🔄', tab: t('returnsPortal.tabExchange'), desc: t('returnsPortal.guideTabExchangeDesc'), color: '#06b6d4' },
        { icon: '🚚', tab: t('returnsPortal.tabTracking'), desc: t('returnsPortal.guideTabTrackingDesc'), color: '#f97316' },
        { icon: '💳', tab: t('returnsPortal.tabRefundStatus'), desc: t('returnsPortal.guideTabRefundDesc'), color: '#a855f7' },
        { icon: '🔗', tab: t('returnsPortal.tabSettings'), desc: t('returnsPortal.guideTabSettingsDesc'), color: '#22c55e' },
        { icon: '📈', tab: t('returnsPortal.tabAnalytics'), desc: t('returnsPortal.guideTabAnalyticsDesc'), color: '#ec4899' },
        { icon: '📖', tab: t('returnsPortal.tabGuide'), desc: t('returnsPortal.guideTabGuideDesc'), color: '#64748b' },
    ];

    return (
        <div style={{ display: 'grid', gap: 24 }} className="fade-up">
            <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>📖 {t('returnsPortal.guideTitle')}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{t('returnsPortal.guideSub')}</div>
            <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 14 }}>{t('returnsPortal.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, padding: '16px', borderRadius: 12, background: 'var(--surface)', border: `1px solid ${COLORS[i]}22`, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = COLORS[i] + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = COLORS[i] + '22'; }}>
                            <div style={{ fontSize: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: `${COLORS[i]}15` }}>{ICONS[i]}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: COLORS[i], marginBottom: 4 }}>{s.num}. {s.title}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{s.desc}</div>
                        </div>
                    ))}
            </div>
            <div style={{ padding: '20px 24px', borderRadius: 14, background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#eab308', marginBottom: 12 }}>💡 {t('returnsPortal.guideTipsTitle')}</div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {TIPS.map((tip, i) => <li key={i} style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8, marginBottom: 4 }}><span style={{ color: '#22c55e', fontWeight: 700 }}>{i + 1}.</span> {tip}</li>)}
                </ol>
            {/* Tab Reference Grid */}
            <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 14 }}>📑 Tab Reference</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                    {TAB_REF.map((tr, i) => (
                        <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', border: `1px solid ${tr.color}22`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 20, flexShrink: 0 }}>{tr.icon}</div>
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: tr.color, marginBottom: 3 }}>{tr.tab}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}>{tr.desc}</div>
                        </div>
                    ))}
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

/* ══════════════════════════════════════════════════════════════
   Main Export — Enterprise Returns Portal
   ══════════════════════════════════════════════════════════════ */
export default function ReturnsPortal() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const globalData = useGlobalData?.() || {};
    const { token, addAlert } = globalData;
    const { connectedChannels = {}, connectedCount = 0 } = useConnectorSync?.() || {};
    const [activeTab, setActiveTab] = useState('dashboard');
    const [returns, setReturns] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, defective: 0, totalRefund: 0, wmsLinked: 0, refundRate: 0 });
    const [loading, setLoading] = useState(true);
    const [secThreats, setSecThreats] = useState([]);
    const [portalLink] = useState('https://returns.genie-go.com/rp/aBc3Xy');
    const [linkCopied, setLinkCopied] = useState(false);
    const pollRef = useRef(null);

    const onSecThreat = useCallback((type, value) => {
        const threat = { type, value, time: new Date().toLocaleTimeString() };
        setSecThreats(prev => [threat, ...prev.slice(0, 9)]);
        addAlert?.({ type: 'error', title: `🚨 [${type}] ${t('returnsPortal.securityAlert')}`, message: value.slice(0, 40) });
    }, [addAlert, t]);

    useEffect(() => {
        const handler = (e) => {
            if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') {
                const threat = secCheck(e.target.value || '');
                if (threat) { onSecThreat(threat, e.target.value); e.target.value = ''; }
            }
        };
        document.addEventListener('input', handler);
        return () => document.removeEventListener('input', handler);
    }, [onSecThreat]);

    const reload = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        try {
            const [lRes, sRes] = await Promise.all([
                fetch(`${API}/v420/returns/list`, { headers: AUTH(token) }).then(r => r.json()).catch(() => ({ returns: [] })),
                fetch(`${API}/v420/returns/summary`, { headers: AUTH(token) }).then(r => r.json()).catch(() => ({})),
            ]);
            setReturns(lRes.returns || []);
            setStats(s => ({ ...s, ...sRes }));
        } catch { /* silent */ }
        setLoading(false);
    }, [token]);

    useEffect(() => { reload(); pollRef.current = setInterval(reload, 30000); return () => clearInterval(pollRef.current); }, [reload]);
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch1 = new BroadcastChannel('genie_returns_sync');
        const ch2 = new BroadcastChannel('genie_connector_sync');
        const ch3 = new BroadcastChannel('genie_product_sync');
        const handler = () => reload();
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED', 'CHANNEL_REMOVED'].includes(e.data?.type)) reload(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); };
    }, [reload]);

    const copyLink = () => { navigator.clipboard?.writeText(portalLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); };

    const TABS = [
        ['dashboard', `📊 ${t('returnsPortal.tabDashboard')}`],
        ['list', `📋 ${t('returnsPortal.tabList')}`],
        ['exchange', `🔄 ${t('returnsPortal.tabExchange')}`],
        ['tracking', `🚚 ${t('returnsPortal.tabTracking')}`],
        ['refundstatus', `💳 ${t('returnsPortal.tabRefundStatus')}`],
        ['portal', `🔗 ${t('returnsPortal.tabSettings')}`],
        ['analytics', `📈 ${t('returnsPortal.tabAnalytics')}`],
        ['guide', `📖 ${t('returnsPortal.tabGuide')}`],
    ];

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>{t('returnsPortal.loading')}</div>;

    return (
<div style={{ display: 'grid', gap: 20, padding: 4 }}>
            <SecurityOverlay threats={secThreats} onDismiss={() => setSecThreats([])} />

            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#ef4444,#f97316,#eab308)' }}>
                            🔄 {t('returnsPortal.pageTitle')}
                        <div className="hero-desc">{t('returnsPortal.pageSub')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-red">⏳ {t('returnsPortal.pendingLabel')} {stats.pending}{t('returnsPortal.items')}</span>
                            <span className="badge badge-orange" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>{t('returnsPortal.total')} {stats.total}{t('returnsPortal.items')}</span>
                            <span className="badge badge-green">{t('returnsPortal.wmsIntegration')} {stats.wmsLinked}/{stats.total}</span>
                            <span className="badge badge-purple">{t('returnsPortal.refundRateLabel')} {stats.refundRate}%</span>
                        {/* Enterprise Badges */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 700 }}>
                                🔗 {connectedCount}{t('returnsPortal.badgeChannelUnit', '개 채널 연동')}
                            </span>
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', fontWeight: 700 }}>
                                ✅ {t('returnsPortal.badgeRealtimeSync')}
                            </span>
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700 }}>
                                🛡️ {t('returnsPortal.badgeSecurity')}
                            </span>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 12, minWidth: 280 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, marginBottom: 6 }}>🔗 {t('returnsPortal.consumerReturnLink')}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#4f8ef7', marginBottom: 8, wordBreak: 'break-all' }}>{portalLink}</div>
                        <button style={{ fontSize: 10, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: linkCopied ? '#22c55e' : 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: 'var(--text-1)', fontWeight: 700 }} onClick={copyLink}>
                            {linkCopied ? `✅ ${t('returnsPortal.copied')}` : `📋 ${t('returnsPortal.copyLink')}`}
                        </button>
                </div>

            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }} className="fade-up fade-up-1">
                {[
                    { l: t('returnsPortal.allReturns'), v: stats.total + t('returnsPortal.items'), c: '#4f8ef7' },
                    { l: t('returnsPortal.pendingLabel'), v: stats.pending + t('returnsPortal.items'), c: '#f97316' },
                    { l: t('returnsPortal.defective'), v: stats.defective + t('returnsPortal.items'), c: '#ef4444' },
                    { l: t('returnsPortal.totalRefundAmt'), v: fmt(stats.totalRefund), c: '#a855f7' },
                    { l: t('returnsPortal.wmsIntegration'), v: stats.wmsLinked + '/' + stats.total, c: '#22c55e' },
                ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: 'var(--surface)', border: `1px solid ${c}22`, borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c, marginTop: 4 }}>{v}</div>
                ))}

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 5, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10 }}>
                {TABS.map(([id, lbl]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: activeTab === id ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'transparent', color: activeTab === id ? '#fff' : 'var(--text-3)', transition: 'all 150ms' }}>
                        {lbl}
                    </button>
                ))}

            {activeTab === 'dashboard' && <DashboardTab returns={returns} reload={reload} token={token} t={t} fmt={fmt} />}
            {activeTab === 'list' && <ListTab returns={returns} reload={reload} token={token} t={t} fmt={fmt} onSecThreat={onSecThreat} />}
            {activeTab === 'exchange' && <ExchangeTab token={token} returns={returns} reload={reload} t={t} fmt={fmt} onSecThreat={onSecThreat} />}
            {activeTab === 'tracking' && <TrackingTab token={token} returns={returns} t={t} />}
            {activeTab === 'refundstatus' && <RefundStatusTab token={token} returns={returns} t={t} fmt={fmt} />}
            {activeTab === 'portal' && <SettingsTab token={token} t={t} />}
            {activeTab === 'analytics' && <AnalyticsTab returns={returns} t={t} />}
            {activeTab === 'guide' && <RPGuideTab />}
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
