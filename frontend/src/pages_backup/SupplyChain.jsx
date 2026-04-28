import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useI18n } from '../i18n/index.js';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { CHANNEL_RATES, getChannelRate } from '../constants/channelRates.js';

/* ── API helpers ────────────────────────────────────────────── */
const API = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const AUTH = (t) => ({ Authorization: `Bearer ${t}` });
const POST_JSON = (tok) => ({ ...AUTH(tok), 'Content-Type': 'application/json' });

/* ── Security Engine ───────────────────────────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' },
    { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' },
    { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' },
    { re: /;\s*delete\s+from/i, type: 'SQL_INJECT' },
    { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
    { re: /eval\s*\(/i, type: 'CODE_INJECT' },
    { re: /document\.cookie/i, type: 'COOKIE_STEAL' },
];
const secCheck = (v = '') => {
    for (const p of SEC_PATTERNS) {
        if (p.re.test(v)) return p.type;
    }
    return null;
};
const sanitize = (v = '') => {
    const threat = secCheck(v);
    if (threat) { console.warn(`[SEC] ${threat} blocked`); return ''; }
    return v;
};

/* ══════════════════════════════════════════════════════════════
   Security Overlay — 해킹 시도 실시간 알림
   ══════════════════════════════════════════════════════════════ */
function SecurityOverlay({ threats, onDismiss }) {
    const { t } = useI18n();
    if (threats.length === 0) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a0000,#2d0a0a)', border: '2px solid #ef4444', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>{t('supplyChain.securityAlert')}</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 20 }}>{t('supplyChain.securityDesc')}</div>
                {threats.map((th, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 11, color: '#fca5a5', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>[{th.type}]</strong> {th.value.slice(0, 60)}… — {th.time}
                </div>
                ))}
                <button onClick={onDismiss} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'var(--text-1)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    🔒 {t('supplyChain.securityDismiss')}
                </button>
            </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Supply Chain Timeline (Visibility)
   ══════════════════════════════════════════════════════════════ */
function TimelineTab({ token, lines, reload, onSecThreat }) {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const [selected, setSelected] = useState(null);
    const [addForm, setAddForm] = useState({ name: '', supplier: '', sku: '', leadTime: '14', risk: 'low', totalCost: '' });
    const [showAdd, setShowAdd] = useState(false);

    const addLine = async () => {
        if (!addForm.name) return;
        await fetch(`${API}/v420/supply/lines`, {
            method: 'POST', headers: POST_JSON(token),
            body: JSON.stringify(addForm)
        });
        setAddForm({ name: '', supplier: '', sku: '', leadTime: '14', risk: 'low', totalCost: '' });
        setShowAdd(false);
        reload();
    };

    const delLine = async (id) => {
        if (!confirm(t('supplyChain.confirmDelete'))) return;
        await fetch(`${API}/v420/supply/lines/${id}`, { method: 'DELETE', headers: AUTH(token) });
        reload();
    };

    const updateStage = async (lineId, stage) => {
        await fetch(`${API}/v420/supply/lines/${lineId}/stage`, {
            method: 'POST', headers: POST_JSON(token),
            body: JSON.stringify({ stage, done: 1 })
        });
        reload();
    };

    const handleInput = (field) => (e) => {
        const v = e.target.value;
        const threat = secCheck(v);
        if (threat) { onSecThreat(threat, v); return; }
        setAddForm(f => ({ ...f, [field]: v }));
    };

    return (
        <div style={{ display: 'grid', gap: 14 }} className="fade-up">
            {/* Add line button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAdd(!showAdd)}
                    style={{ padding: '6px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#06b6d4,#4f8ef7)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>
                    {showAdd ? '✕' : '➕'} {showAdd ? t('supplyChain.cancel') : t('supplyChain.addLine')}
                </button>

            {/* Add line form */}
            {showAdd && (
                <div style={{ padding: 16, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>➕ {t('supplyChain.addLine')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                        {[['name', t('supplyChain.productName')], ['supplier', t('supplyChain.supplier')], ['sku', t('supplyChain.labelSku')], ['leadTime', t('supplyChain.leadTime')], ['totalCost', t('supplyChain.totalPO')]].map(([k, lbl]) => (
                            <input key={k} placeholder={lbl} value={addForm[k]} onChange={handleInput(k)}
                                style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
                        ))}
                        <select value={addForm.risk} onChange={e => setAddForm(f => ({ ...f, risk: e.target.value }))}
                            style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }}>
                            <option value="low">{t('supplyChain.normal')}</option>
                            <option value="high">{t('supplyChain.highRisk')}</option>
                        </select>
                    <button onClick={addLine} style={{ marginTop: 10, padding: '6px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>
                        ✅ {t('supplyChain.register')}
                    </button>
            )}

            {lines.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('supplyChain.noData')}</div>}
            {lines.map(flow => (
                <div key={flow.id || flow.line_id} style={{ background: 'var(--surface)', border: `1px solid ${flow.risk === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: 16, cursor: 'pointer' }}
                    onClick={() => setSelected(selected === flow.line_id ? null : flow.line_id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 800 }}>{flow.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{flow.line_id} · {flow.supplier} · {t('supplyChain.leadTime')} {flow.leadTime}{t('supplyChain.days')}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: flow.risk === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: flow.risk === 'high' ? '#ef4444' : '#22c55e' }}>
                                {flow.risk === 'high' ? `⚠️ ${t('supplyChain.highRisk')}` : `✅ ${t('supplyChain.normal')}`}
                            </span>
                            <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>{fmt(flow.totalCost)}</span>
                            <button onClick={(e) => { e.stopPropagation(); delLine(flow.id); }}
                                style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                    {/* Stage timeline */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                        {(flow.stages || []).map((s, i) => {
                            const done = s.done === 1 || s.done === true;
                            return (
                                <React.Fragment key={s.stage}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                        <div onClick={(e) => { e.stopPropagation(); if (!done) updateStage(flow.id, s.stage); }}
                                            style={{ width: 28, height: 28, borderRadius: 14, background: done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.08)', border: `2px solid ${done ? '#22c55e' : 'rgba(255,255,255,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: done ? 'default' : 'pointer', transition: 'all 200ms' }}>
                                            {done ? '✓' : (i + 1)}
                                        <div style={{ fontSize: 9, fontWeight: 700, marginTop: 4, color: done ? '#22c55e' : 'var(--text-3)', textAlign: 'center' }}>{s.stage}</div>
                                        <div style={{ fontSize: 8, color: 'var(--text-3)', marginTop: 1, textAlign: 'center' }}>{s.stageDate || s.date || ''}</div>
                                    {i < (flow.stages || []).length - 1 && (
                                        <div style={{ height: 2, flex: 0.5, background: done ? '#22c55e' : 'rgba(255,255,255,0.08)', margin: '0 2px', marginBottom: 24 }} />
                                    )}
                                </React.Fragment>
                            
                            
                              </div>
);
         
               })}
                </div>
            ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
/* ══════════════════════════════════════════════════════════ */
function SuppliersTab({ token, suppliers, reload, onSecThreat }) {
    const { t } = useI18n();
    const [form, setForm] = useState({ name: '', country: '', category: '', leadTime: '', delayRate: '', contact: '' });

    const addSupplier = async () => {
        if (!form.name) return;
        await fetch(`${API}/v420/supply/suppliers`, {
            method: 'POST', headers: POST_JSON(token),
            body: JSON.stringify(form)
        });
        reload(); setForm({ name: '', country: '', category: '', leadTime: '', delayRate: '', contact: '' });
    };

    const delSupplier = async (id) => {
        if (!confirm(t('supplyChain.confirmDelete'))) return;
        await fetch(`${API}/v420/supply/suppliers/${id}`, { method: 'DELETE', headers: AUTH(token) });
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
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🏭 {t('supplyChain.tabSuppliers')}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                    {['ID', t('supplyChain.supplier'), t('supplyChain.country'), t('supplyChain.category'), t('supplyChain.leadTime'), t('supplyChain.delayRate'), t('supplyChain.orderCount'), t('supplyChain.reliability'), t('supplyChain.contact'), ''].map(h =>
                        <th key={h || 'act'} style={{ padding: '8px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                    )}
                </tr></thead>
                <tbody>
                    {suppliers.length === 0 && <tr><td colSpan={10} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('supplyChain.noData')}</td></tr>}
                    {suppliers.map(sp => (
                        <tr key={sp.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7', padding: '8px 4px' }}>{sp.sup_id}</td>
                            <td style={{ fontSize: 11, fontWeight: 700, padding: '8px 4px' }}>{sp.name}</td>
                            <td style={{ fontSize: 11, padding: '8px 4px' }}>{sp.country}</td>
                            <td style={{ fontSize: 11, padding: '8px 4px' }}>{sp.category}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, padding: '8px 4px', color: (sp.leadTime || 0) <= 14 ? '#22c55e' : '#f97316' }}>{sp.leadTime}{t('supplyChain.days')}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, padding: '8px 4px', color: (sp.delayRate || 0) >= 10 ? '#ef4444' : '#22c55e' }}>{sp.delayRate}%</td>
                            <td style={{ textAlign: 'center', padding: '8px 4px' }}>{sp.orderCount}</td>
                            <td style={{ padding: '8px 4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3 }}>
                                        <div style={{ width: `${sp.reliability}%`, height: '100%', background: (sp.reliability || 0) >= 95 ? '#22c55e' : (sp.reliability || 0) >= 85 ? '#f97316' : '#ef4444', borderRadius: 3 }} />
                                    <span style={{ fontSize: 10, fontWeight: 700, color: (sp.reliability || 0) >= 95 ? '#22c55e' : (sp.reliability || 0) >= 85 ? '#f97316' : '#ef4444', minWidth: 38 }}>{sp.reliability}%</span>
                            </td>
                            <td style={{ fontSize: 9, color: '#4f8ef7', padding: '8px 4px' }}>{sp.contact}</td>
                            <td style={{ padding: '4px' }}>
                                <button onClick={() => delSupplier(sp.id)} style={{ width: 20, height: 20, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 10 }}>✕</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Registration */}
            <div style={{ marginTop: 16, padding: 14, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>➕ {t('supplyChain.addSupplier')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[['name', t('supplyChain.supplier')], ['country', t('supplyChain.country')], ['category', t('supplyChain.category')], ['leadTime', t('supplyChain.leadTime')], ['delayRate', t('supplyChain.delayRate')], ['contact', t('supplyChain.contact')]].map(([k, lbl]) => (
                        <input key={k} placeholder={lbl} value={form[k]} onChange={handleInput(k)}
                            style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
                    ))}
                <button onClick={addSupplier} style={{ marginTop: 10, padding: '6px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#06b6d4,#4f8ef7)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>
                    ➕ {t('supplyChain.register')}
                </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Lead Time Analysis
   ══════════════════════════════════════════════════════════════ */
function LeadTimeTab({ lines }) {
    const { t } = useI18n();
    return (
        <div className="card fade-up">
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>⏱ {t('supplyChain.tabLeadTime')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                {lines.length === 0 && <div style={{ gridColumn: 'span 2', padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('supplyChain.noData')}</div>}
                {lines.map(flow => (
                    <div key={flow.line_id} style={{ padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 12 }}>{flow.name}</div>
                        {(flow.stages || []).map(s => (
                            <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: 3, background: (s.done === 1 || s.done === true) ? '#22c55e' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 10 }}>{s.stage}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.stageDate || s.date || ''}</div>
                                {(s.note && s.note !== '—') && <div style={{ fontSize: 8, color: '#4f8ef7', maxWidth: 100 }}>{s.note}</div>}
                        ))}
                        <div style={{ marginTop: 10, padding: '8px', background: 'rgba(79,142,247,0.08)', borderRadius: 8, fontSize: 10 }}>
                            {t('supplyChain.leadTime')}: <strong style={{ color: '#4f8ef7' }}>{flow.leadTime}{t('supplyChain.days')}</strong> · {t('supplyChain.delayRate')}: <strong style={{ color: (flow.delayRate || 0) > 10 ? '#ef4444' : '#22c55e' }}>{flow.delayRate}%</strong>
                    </div>
                ))}
                </div>
            </div>
        </div>
    </div>
);
}

/* ══════════════════════════════════════════════════════════════
   Tab: Risk Detection
   ══════════════════════════════════════════════════════════════ */
function RiskTab({ token, lines, riskRules, reload, onSecThreat }) {
    const { t } = useI18n();
    const highRisk = lines.filter(f => f.risk === 'high');
    const [ruleForm, setRuleForm] = useState({ rule: '', action: '' });
    const [showAddRule, setShowAddRule] = useState(false);

    const toggleRule = async (id) => {
        await fetch(`${API}/v420/supply/risk-rules/${id}/toggle`, { method: 'POST', headers: AUTH(token) });
        reload();
    };

    const addRule = async () => {
        if (!ruleForm.rule || !ruleForm.action) return;
        await fetch(`${API}/v420/supply/risk-rules`, {
            method: 'POST', headers: POST_JSON(token),
            body: JSON.stringify(ruleForm)
        });
        setRuleForm({ rule: '', action: '' }); setShowAddRule(false);
        reload();
    };

    const handleInput = (field) => (e) => {
        const v = e.target.value;
        const threat = secCheck(v);
        if (threat) { onSecThreat(threat, v); return; }
        setRuleForm(f => ({ ...f, [field]: v }));
    };

    return (
        <div style={{ display: 'grid', gap: 14 }} className="fade-up">
            {highRisk.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#22c55e', fontSize: 12 }}>✅ {t('supplyChain.noRisk')}</div>}
            {highRisk.map(flow => (
                <div key={flow.id} style={{ padding: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#ef4444', marginBottom: 8 }}>⚠️ {flow.name} — {t('supplyChain.supplyRisk')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 12 }}>{t('supplyChain.supplier')}: {flow.supplier} · {t('supplyChain.delayRate')}: {flow.delayRate}%</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f97316,#ef4444)', color: 'var(--text-1)', fontWeight: 700 }}>📧 {t('supplyChain.contactSupplier')}</button>
                        <button style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', fontWeight: 700 }}>🔄 {t('supplyChain.altSupplierSearch')}</button>
                        <button style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontWeight: 700 }}>🔔 {t('supplyChain.slackNotify')}</button>
                </div>
            ))}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>🛡️ {t('supplyChain.autoRiskRules')}</div>
                    <button onClick={() => setShowAddRule(!showAddRule)}
                        style={{ padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', fontWeight: 700, fontSize: 10 }}>
                        {showAddRule ? '✕' : '➕'} {t('supplyChain.addRule')}
                    </button>
                {showAddRule && (
                    <div style={{ padding: 12, background: 'rgba(79,142,247,0.06)', borderRadius: 10, marginBottom: 12, display: 'grid', gap: 8 }}>
                        <input placeholder={t('supplyChain.ruleName')} value={ruleForm.rule} onChange={handleInput('rule')}
                            style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
                        <input placeholder={t('supplyChain.ruleAction')} value={ruleForm.action} onChange={handleInput('action')}
                            style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
                        <button onClick={addRule} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11, justifySelf: 'start' }}>
                            ✅ {t('supplyChain.register')}
                        </button>
                )}
                {riskRules.length === 0 && !showAddRule && <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('supplyChain.noData')}</div>}
                {riskRules.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{r.rule}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>→ {r.action}</div>
                        <div onClick={() => toggleRule(r.id)} style={{ width: 32, height: 18, borderRadius: 9, background: (r.active === 1 || r.active === true) ? '#22c55e' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer' }}>
                            <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', top: 2, left: (r.active === 1 || r.active === true) ? 16 : 2, transition: 'left 150ms' }} />
                    </div>
                ))}
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
   Tab: Inventory Visibility (재고 가시성)
   ══════════════════════════════════════════════════════════════ */
function InventoryTab({ token, lines, suppliers, reload, onSecThreat }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [inv, setInv] = useState([]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/v420/supply/inventory`, { headers: AUTH(token) })
            .then(r => r.json()).then(d => setInv(d.inventory || [])).catch(() => {});
    }, [token]);

    const totalQty = inv.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const inTransit = inv.filter(i => i.status === 'transit').reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const atWarehouse = inv.filter(i => i.status === 'warehouse').reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const atSupplier = inv.filter(i => i.status === 'supplier').reduce((s, i) => s + (Number(i.qty) || 0), 0);

    const STATS = [
        { l: t('supplyChain.invTotal'), v: totalQty.toLocaleString(), c: '#4f8ef7', icon: '📦' },
        { l: t('supplyChain.invTransit'), v: inTransit.toLocaleString(), c: '#f97316', icon: '🚚' },
        { l: t('supplyChain.invWarehouse'), v: atWarehouse.toLocaleString(), c: '#22c55e', icon: '🏭' },
        { l: t('supplyChain.invSupplier'), v: atSupplier.toLocaleString(), c: '#a855f7', icon: '📋' },
    ];

    return (
        <div className="fade-up" style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {STATS.map(s => (
                    <div key={s.l} style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>{s.l}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: s.c, marginTop: 2 }}>{s.v}</div>
                ))}
            <div className="card">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>📦 {t('supplyChain.tabInventory')}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                        {[t('supplyChain.productName'), t('supplyChain.labelSku'), t('supplyChain.invQty'), t('supplyChain.invStatus'), t('supplyChain.invLocation'), t('supplyChain.invUpdated')].map(h =>
                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                        )}
                    </tr></thead>
                    <tbody>
                        {inv.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('supplyChain.noData')}</td></tr>}
                        {inv.map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 6px', fontWeight: 700, fontSize: 11 }}>{item.name}</td>
                                <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{item.sku}</td>
                                <td style={{ padding: '8px 6px', fontWeight: 700, textAlign: 'center' }}>{item.qty}</td>
                                <td style={{ padding: '8px 6px' }}>
                                    <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                                        background: item.status === 'warehouse' ? 'rgba(34,197,94,0.15)' : item.status === 'transit' ? 'rgba(249,115,22,0.15)' : 'rgba(168,85,247,0.15)',
                                        color: item.status === 'warehouse' ? '#22c55e' : item.status === 'transit' ? '#f97316' : '#a855f7'
                                    }}>{item.status === 'warehouse' ? t('supplyChain.invWarehouse') : item.status === 'transit' ? t('supplyChain.invTransit') : t('supplyChain.invSupplier')}</span>
                                </td>
                                <td style={{ padding: '8px 6px', fontSize: 10 }}>{item.location}</td>
                                <td style={{ padding: '8px 6px', fontSize: 10, color: 'var(--text-3)' }}>{item.updatedAt || '—'}</td>
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
   Tab: Purchase Order Management (발주 관리)
   ══════════════════════════════════════════════════════════════ */
function POManagementTab({ token, suppliers, reload, onSecThreat }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [orders, setOrders] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ supplierId: '', product: '', qty: '', unitCost: '', notes: '' });

    useEffect(() => {
        if (!token) return;
        fetch(`${API}/v420/supply/purchase-orders`, { headers: AUTH(token) })
            .then(r => r.json()).then(d => setOrders(d.orders || [])).catch(() => {});
    }, [token]);

    const createPO = async () => {
        if (!form.product || !form.qty) return;
        await fetch(`${API}/v420/supply/purchase-orders`, {
            method: 'POST', headers: POST_JSON(token),
            body: JSON.stringify({ ...form, status: 'draft', createdAt: new Date().toISOString().slice(0, 10) })
        });
        setForm({ supplierId: '', product: '', qty: '', unitCost: '', notes: '' });
        setShowAdd(false);
        reload();
        // Reload POs
        fetch(`${API}/v420/supply/purchase-orders`, { headers: AUTH(token) })
            .then(r => r.json()).then(d => setOrders(d.orders || [])).catch(() => {});
    };

    const handleInput = (field) => (e) => {
        const v = e.target.value;
        const threat = secCheck(v);
        if (threat) { onSecThreat(threat, v); return; }
        setForm(f => ({ ...f, [field]: v }));
    };

    const STATUS_COLORS = { draft: '#64748b', pending: '#f97316', approved: '#4f8ef7', shipped: '#a855f7', received: '#22c55e', cancelled: '#ef4444' };

    return (
        <div className="fade-up" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>📋 {t('supplyChain.tabPO')}</div>
                <button onClick={() => setShowAdd(!showAdd)}
                    style={{ padding: '6px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#06b6d4,#4f8ef7)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>
                    {showAdd ? '✕' : '➕'} {showAdd ? t('supplyChain.cancel') : t('supplyChain.poCreate')}
                </button>
            {showAdd && (
                <div style={{ padding: 16, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10 }}>➕ {t('supplyChain.poCreate')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                        <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
                            style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }}>
                            <option value="">{t('supplyChain.poSelectSupplier')}</option>
                            {suppliers.map(s => <option key={s.id} value={s.sup_id}>{s.name}</option>)}
                        </select>
                        {[['product', t('supplyChain.productName')], ['qty', t('supplyChain.invQty')], ['unitCost', t('supplyChain.poUnitCost')], ['notes', t('supplyChain.poNotes')]].map(([k, lbl]) => (
                            <input key={k} placeholder={lbl} value={form[k]} onChange={handleInput(k)}
                                style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 11 }} />
                        ))}
                    <button onClick={createPO} style={{ marginTop: 10, padding: '6px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'var(--text-1)', fontWeight: 700, fontSize: 11 }}>
                        ✅ {t('supplyChain.register')}
                    </button>
            )}
            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: '1px solid rgba(99,140,255,0.15)' }}>
                        {['PO#', t('supplyChain.supplier'), t('supplyChain.productName'), t('supplyChain.invQty'), t('supplyChain.poUnitCost'), t('supplyChain.poTotalCost'), t('supplyChain.poStatus'), t('supplyChain.poDate')].map(h =>
                            <th key={h} style={{ padding: '8px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                        )}
                    </tr></thead>
                    <tbody>
                        {orders.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>{t('supplyChain.noData')}</td></tr>}
                        {orders.map((po, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 4px', fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{po.poId || `PO-${String(i+1).padStart(4,'0')}`}</td>
                                <td style={{ padding: '8px 4px', fontWeight: 700, fontSize: 11 }}>{po.supplierName || po.supplierId}</td>
                                <td style={{ padding: '8px 4px', fontSize: 11 }}>{po.product}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>{po.qty}</td>
                                <td style={{ padding: '8px 4px' }}>{fmt(po.unitCost || 0)}</td>
                                <td style={{ padding: '8px 4px', fontWeight: 700, color: '#a855f7' }}>{fmt((po.qty || 0) * (po.unitCost || 0))}</td>
                                <td style={{ padding: '8px 4px' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: (STATUS_COLORS[po.status] || '#64748b') + '20', color: STATUS_COLORS[po.status] || '#64748b' }}>
                                        {t(`supplyChain.poStatus${(po.status || 'draft').charAt(0).toUpperCase() + (po.status || 'draft').slice(1)}`)}
                                    </span>
                                </td>
                                <td style={{ padding: '8px 4px', fontSize: 10, color: 'var(--text-3)' }}>{po.createdAt || '—'}</td>
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
   Tab: Landed Cost Calculator (원가 분석)
   ══════════════════════════════════════════════════════════════ */
function LandedCostTab({ onSecThreat }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [form, setForm] = useState({ productCost: '', shippingCost: '', customsDuty: '', insurance: '', handling: '', otherFees: '' });
    const [result, setResult] = useState(null);

    const handleInput = (field) => (e) => {
        const v = e.target.value;
        const threat = secCheck(v);
        if (threat) { onSecThreat(threat, v); return; }
        setForm(f => ({ ...f, [field]: v }));
    };

    const calculate = () => {
        const vals = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v) || 0]));
        const total = vals.productCost + vals.shippingCost + vals.customsDuty + vals.insurance + vals.handling + vals.otherFees;
        const costBreakdown = [
            { label: t('supplyChain.lcProductCost'), value: vals.productCost, pct: vals.productCost / total * 100, color: '#4f8ef7' },
            { label: t('supplyChain.lcShipping'), value: vals.shippingCost, pct: vals.shippingCost / total * 100, color: '#f97316' },
            { label: t('supplyChain.lcCustoms'), value: vals.customsDuty, pct: vals.customsDuty / total * 100, color: '#ef4444' },
            { label: t('supplyChain.lcInsurance'), value: vals.insurance, pct: vals.insurance / total * 100, color: '#a855f7' },
            { label: t('supplyChain.lcHandling'), value: vals.handling, pct: vals.handling / total * 100, color: '#22c55e' },
            { label: t('supplyChain.lcOther'), value: vals.otherFees, pct: vals.otherFees / total * 100, color: '#eab308' },
        ];
        setResult({ total, breakdown: costBreakdown });
    };

    const FIELDS = [
        ['productCost', t('supplyChain.lcProductCost')],
        ['shippingCost', t('supplyChain.lcShipping')],
        ['customsDuty', t('supplyChain.lcCustoms')],
        ['insurance', t('supplyChain.lcInsurance')],
        ['handling', t('supplyChain.lcHandling')],
        ['otherFees', t('supplyChain.lcOther')],
    ];

    return (
        <div className="fade-up" style={{ display: 'grid', gap: 16 }}>
            <div className="card">
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>🌍 {t('supplyChain.tabLandedCost')}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>{t('supplyChain.lcDesc')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {FIELDS.map(([k, lbl]) => (
                        <div key={k}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, marginBottom: 4 }}>{lbl}</div>
                            <input type="number" placeholder="0" value={form[k]} onChange={handleInput(k)}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 12, boxSizing: 'border-box' }} />
                    ))}
                <button onClick={calculate} style={{ marginTop: 14, padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#06b6d4,#4f8ef7)', color: 'var(--text-1)', fontWeight: 700, fontSize: 12 }}>
                    🧮 {t('supplyChain.lcCalculate')}
                </button>
            {result && (
                <div className="card">
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>📊 {t('supplyChain.lcResult')}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#4f8ef7', marginBottom: 16 }}>{fmt(result.total)}</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {result.breakdown.filter(b => b.value > 0).map(b => (
                            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 120, fontSize: 11, fontWeight: 700, color: b.color }}>{b.label}</div>
                                <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${b.pct}%`, height: '100%', background: b.color, borderRadius: 4, transition: 'width 300ms' }} />
                                <div style={{ width: 80, textAlign: 'right', fontSize: 11, fontWeight: 700 }}>{fmt(b.value)}</div>
                                <div style={{ width: 40, textAlign: 'right', fontSize: 10, color: 'var(--text-3)' }}>{b.pct.toFixed(1)}%</div>
                        ))})}
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
   Tab: Usage Guide (이용 가이드)
   ══════════════════════════════════════════════════════════════ */
function SCGuideTab() {
    const { t } = useI18n();
    const STEPS = Array.from({ length: 10 }, (_, i) => ({
        num: i + 1,
        title: t(`supplyChain.guideStep${i + 1}Title`),
        desc: t(`supplyChain.guideStep${i + 1}Desc`),
    }));
    const ICONS = ['🏭', '📦', '🔭', '⏱', '⚠️', '📋', '🌍', '🔄', '📊', '✅'];
    const COLORS = ['#6366f1', '#22c55e', '#4f8ef7', '#f97316', '#ef4444', '#a855f7', '#06b6d4', '#eab308', '#ec4899', '#14b8a6'];
    const TIPS = Array.from({ length: 5 }, (_, i) => t(`supplyChain.guideTip${i + 1}`));

    const TAB_REF = [
        { icon: '🔭', tab: t('supplyChain.tabTimeline'), desc: t('supplyChain.guideTabTimelineDesc'), color: '#4f8ef7' },
        { icon: '🏭', tab: t('supplyChain.tabSuppliers'), desc: t('supplyChain.guideTabSuppliersDesc'), color: '#22c55e' },
        { icon: '📦', tab: t('supplyChain.tabInventory'), desc: t('supplyChain.guideTabInventoryDesc'), color: '#f97316' },
        { icon: '📋', tab: t('supplyChain.tabPO'), desc: t('supplyChain.guideTabPODesc'), color: '#a855f7' },
        { icon: '⏱', tab: t('supplyChain.tabLeadTime'), desc: t('supplyChain.guideTabLeadTimeDesc'), color: '#06b6d4' },
        { icon: '⚠️', tab: t('supplyChain.tabRisk'), desc: t('supplyChain.guideTabRiskDesc'), color: '#ef4444' },
        { icon: '🌍', tab: t('supplyChain.tabLandedCost'), desc: t('supplyChain.guideTabLandedCostDesc'), color: '#eab308' },
        { icon: '📖', tab: t('supplyChain.tabGuide'), desc: t('supplyChain.guideTabGuideDesc'), color: '#64748b' },
    ];

    return (
        <div style={{ display: 'grid', gap: 24 }} className="fade-up">
            <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>📖 {t('supplyChain.guideTitle')}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{t('supplyChain.guideSub')}</div>
            <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginBottom: 14 }}>{t('supplyChain.guideStepsTitle')}</div>
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
                <div style={{ fontSize: 14, fontWeight: 800, color: '#eab308', marginBottom: 12 }}>💡 {t('supplyChain.guideTipsTitle')}</div>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {TIPS.map((tip, i) => (
                        <li key={i} style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8, marginBottom: 4 }}>
                            <span style={{ color: '#22c55e', fontWeight: 700 }}>{i + 1}.</span> {tip}
                        </li>
                    ))}
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
   Main Export — Enterprise Supply Chain
   ══════════════════════════════════════════════════════════════ */
export default function SupplyChain() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const globalData = useGlobalData?.() || {};
    const { token, addAlert } = globalData;
    const { connectedChannels = {}, connectedCount = 0 } = useConnectorSync?.() || {};
    const [activeTab, setActiveTab] = useState('visibility');
    const [lines, setLines] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [riskRules, setRiskRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [secThreats, setSecThreats] = useState([]);
    const pollRef = useRef(null);

    /* ── Security threat handler ── */
    const onSecThreat = useCallback((type, value) => {
        const threat = { type, value, time: new Date().toLocaleTimeString() };
        setSecThreats(prev => [threat, ...prev.slice(0, 9)]);
        addAlert?.({
            type: 'error',
            title: `🚨 [${type}] ${t('supplyChain.securityAlert')}`,
            message: `${t('supplyChain.securityDesc')}: ${value.slice(0, 40)}…`,
        });
    }, [addAlert, t]);

    /* ── Security monitoring — global input listener ── */
    useEffect(() => {
        const handler = (e) => {
            if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') {
                const threat = secCheck(e.target.value || '');
                if (threat) {
                    onSecThreat(threat, e.target.value);
                    e.target.value = '';
                }
            }
        };
        document.addEventListener('input', handler);
        return () => document.removeEventListener('input', handler);
    }, [onSecThreat]);

    /* ── Data fetch — real-time API sync ── */
    const reload = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        try {
            const [lRes, sRes, rRes] = await Promise.all([
                fetch(`${API}/v420/supply/lines`, { headers: AUTH(token) }).then(r => r.json()).catch(() => ({ lines: [] })),
                fetch(`${API}/v420/supply/suppliers`, { headers: AUTH(token) }).then(r => r.json()).catch(() => ({ suppliers: [] })),
                fetch(`${API}/v420/supply/risk-rules`, { headers: AUTH(token) }).then(r => r.json()).catch(() => ({ rules: [] })),
            ]);
            setLines(lRes.lines || []);
            setSuppliers(sRes.suppliers || []);
            setRiskRules(rRes.rules || []);
        } catch { /* silent */ }
        setLoading(false);
    }, [token]);

    /* ── Auto-polling for real-time sync (30s) ── */
    useEffect(() => {
        reload();
        pollRef.current = setInterval(reload, 30000);
        return () => clearInterval(pollRef.current);
    }, [reload]);

    /* ── Cross-tab sync via BroadcastChannel ── */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch1 = new BroadcastChannel('genie_supply_sync');
        const ch2 = new BroadcastChannel('genie_connector_sync');
        const ch3 = new BroadcastChannel('genie_product_sync');
        const handler = () => reload();
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED', 'CHANNEL_REMOVED'].includes(e.data?.type)) reload(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); };
    }, [reload]);

    const highRisk = lines.filter(f => f.risk === 'high');
    const avgLead = lines.length ? Math.round(lines.reduce((s, f) => s + (Number(f.leadTime) || 0), 0) / lines.length) : 0;
    const totalCost = lines.reduce((s, f) => s + (Number(f.totalCost) || 0), 0);

    const TABS = [
        ['visibility', `🔭 ${t('supplyChain.tabTimeline')}`],
        ['suppliers', `🏭 ${t('supplyChain.tabSuppliers')}`],
        ['inventory', `📦 ${t('supplyChain.tabInventory')}`],
        ['po', `📋 ${t('supplyChain.tabPO')}`],
        ['leadtime', `⏱ ${t('supplyChain.tabLeadTime')}`],
        ['risk', `⚠️ ${t('supplyChain.tabRisk')}`],
        ['landedcost', `🌍 ${t('supplyChain.tabLandedCost')}`],
        ['guide', `📖 ${t('supplyChain.tabGuide')}`],
    ];

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>{t('supplyChain.loading')}</div>;

    return (
<div style={{ display: 'grid', gap: 20, padding: 4 }}>
            {/* Security Overlay */}
            <SecurityOverlay threats={secThreats} onDismiss={() => setSecThreats([])} />

            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title" style={{ background: 'linear-gradient(135deg,#06b6d4,#4f8ef7,#a855f7)' }}>
                            🔭 {t('supplyChain.pageTitle')}
                        <div className="hero-desc">{t('supplyChain.pageSub')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{lines.length}{t('supplyChain.linesTracked')}</span>
                            {highRisk.length > 0 && <span className="badge badge-red">⚠️ {t('supplyChain.supplyRisk')} {highRisk.length}</span>}
                            <span className="badge badge-purple">{suppliers.length}{t('supplyChain.suppliersRegistered')}</span>
                        {/* Enterprise Badges */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 700 }}>
                                🔗 {connectedCount}{t('supplyChain.badgeChannelUnit', '개 채널 연동')}
                            </span>
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', fontWeight: 700 }}>
                                ✅ {t('supplyChain.badgeRealtimeSync')}
                            </span>
                            <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700 }}>
                                🛡️ {t('supplyChain.badgeSecurity')}
                            </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, minWidth: 220 }}>
                        {[
                            { l: t('supplyChain.trackingLines'), v: lines.length + t('supplyChain.countUnit'), c: '#4f8ef7' },
                            { l: t('supplyChain.riskLines'), v: highRisk.length + t('supplyChain.countUnit'), c: '#ef4444' },
                            { l: t('supplyChain.avgLeadTime'), v: avgLead + t('supplyChain.days'), c: '#f97316' },
                            { l: t('supplyChain.totalPO'), v: fmt(totalCost), c: '#a855f7' },
                        ].map(({ l, v, c }) => (
                            <div key={l} style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>{l}</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: c, marginTop: 3 }}>{v}</div>
                        ))}
                </div>

            {/* Warning Banner */}
            {highRisk.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, fontSize: 12 }} className="fade-up">
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ {t('supplyChain.riskDetected')}:</span>
                    {highRisk.map(f => (
                        <span key={f.id} style={{ marginLeft: 12, color: '#f97316' }}>
                            [{f.name}] {t('supplyChain.supplier')} {f.supplier} — {t('supplyChain.delayRate')} {f.delayRate}%
                        </span>
                    ))}
            )}

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 12, padding: 5, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10 }}>
                {TABS.map(([id, lbl]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        style={{ padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: activeTab === id ? 'linear-gradient(135deg,#06b6d4,#4f8ef7)' : 'transparent', color: activeTab === id ? '#fff' : 'var(--text-3)', transition: 'all 150ms' }}>
                        {lbl}
                    </button>
                ))}

            {activeTab === 'visibility' && <TimelineTab token={token} lines={lines} reload={reload} onSecThreat={onSecThreat} />}
            {activeTab === 'suppliers' && <SuppliersTab token={token} suppliers={suppliers} reload={reload} onSecThreat={onSecThreat} />}
            {activeTab === 'inventory' && <InventoryTab token={token} lines={lines} suppliers={suppliers} reload={reload} onSecThreat={onSecThreat} />}
            {activeTab === 'po' && <POManagementTab token={token} suppliers={suppliers} reload={reload} onSecThreat={onSecThreat} />}
            {activeTab === 'leadtime' && <LeadTimeTab lines={lines} />}
            {activeTab === 'risk' && <RiskTab token={token} lines={lines} riskRules={riskRules} reload={reload} onSecThreat={onSecThreat} />}
            {activeTab === 'landedcost' && <LandedCostTab onSecThreat={onSecThreat} />}
            {activeTab === 'guide' && <SCGuideTab />}
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

