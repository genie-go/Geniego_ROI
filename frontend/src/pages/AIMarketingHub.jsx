import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useSecurityGuard } from '../security/SecurityGuard.js';
/* ────────── utils ────────── */
// currency formatting via useCurrency fmt()
const pct = v => (Number(v) * 100).toFixed(1) + '%';

const CH_ALLOC = { meta: 0.28, google: 0.22, naver: 0.18, coupang: 0.14, tiktok: 0.10, kakao: 0.08 };
const CH_NAME  = { meta: 'Meta Ads', google: 'Google', naver: 'Naver', coupang: 'Coupang', tiktok: 'TikTok', kakao: 'Kakao' };
const CH_ICON  = { meta: '📘', google: '🔍', naver: '🟢', coupang: '🛒', tiktok: '🎵', kakao: '💛' };
const CH_COLOR = { meta: '#1877f2', google: '#34A853', naver: '#03c75a', coupang: '#ef4444', tiktok: '#EE1D52', kakao: '#fbbf24' };
const STATUS_COLOR = { good: '#22c55e', bad: '#ef4444', info: '#4f8ef7', warn: '#eab308' };
const PRIO_COLOR   = { HIGH: '#ef4444', MEDIUM: '#eab308', LOW: '#22c55e' };

function Tag({ label, color = '#4f8ef7', size = 10 }) {
    const { fmt } = useCurrency();
    return <span style={{ fontSize: size, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: color + '18', color, border: `1px solid ${color}33` }}>{label}</span>;
}

/* ────────── ROI calculator ────────── */
function calcROI(adSpend, roas, avgMargin = 0.35) {
    if (!adSpend) return { revenue: 0, grossProfit: 0, netProfit: 0, roi: 0 };
    const revenue     = adSpend * roas;
    const grossProfit = revenue * avgMargin;
    const netProfit   = grossProfit - adSpend;
    const roi         = adSpend > 0 ? ((netProfit / adSpend) * 100) : 0;
    return { revenue, grossProfit, netProfit, roi };
}

/* ────────── AI recommendation engine ────────── */
function generateRecommendations(inventory, orders, channelBudgets, settlement, crmSegments, pnlStats, t, fmt) {
    const recs = [];
    const avgMargin = pnlStats?.revenue > 0
        ? Math.max(0.15, (pnlStats.grossProfit || pnlStats.revenue * 0.35) / pnlStats.revenue)
        : 0.35;

    // ① Low ROAS channel → reallocate to high ROAS
    const chList = Object.entries(channelBudgets || {}).map(([id, v]) => ({ id, ...v }));
    const lowRoas  = chList.filter(c => c.roas < c.targetRoas).sort((a, b) => a.roas - b.roas);
    const highRoas = chList.filter(c => c.roas >= c.targetRoas).sort((a, b) => b.roas - a.roas);
    if (lowRoas.length && highRoas.length) {
        const low = lowRoas[0], high = highRoas[0];
        const shift = Math.round(low.spent * 0.3);
        const beforeROI = calcROI(low.spent, low.roas, avgMargin);
        const afterROI  = calcROI(shift, high.roas, avgMargin);
        recs.push({
            id: 'rec_roas_rebalance', type: 'budget_rebalance', priority: 'HIGH',
            title: `${low.name} → ${high.name} ${t('aiHub.recRebalanceTitle')}`,
            reason: `${low.name} ROAS ${low.roas}x (${t('aiHub.targetMissed')} ${low.targetRoas}x) · ${high.name} ROAS ${high.roas}x`,
            insight: `${t('aiHub.dataSource')}: ${low.name} ${fmt(low.spent)}, ROAS ${low.roas}x → ${t('aiHub.budgetShift')} 30%(${fmt(shift)}) ${t('aiHub.expectedProfit')} ${fmt(Math.round(afterROI.netProfit))} (ROI ${afterROI.roi.toFixed(1)}%)`,
            channels: [{ id: high.id, name: high.name, budget: shift, icon: CH_ICON[high.id] || '📈' }],
            budget: shift, estimatedRoas: high.roas,
            estimatedRevenue: Math.round(shift * high.roas),
            estimatedProfit: Math.round(afterROI.netProfit),
            estimatedROI: afterROI.roi,
            category: `📊 ${t('aiHub.catBudgetOpt')}`, color: '#4f8ef7',
            dataPoints: [
                { label: `${low.name} ROAS`, value: low.roas + 'x', status: 'bad' },
                { label: `${high.name} ROAS`, value: high.roas + 'x', status: 'good' },
                { label: t('aiHub.dpShiftBudget'), value: fmt(shift), status: 'info' },
                { label: t('aiHub.dpExpectedProfit'), value: fmt(Math.round(afterROI.netProfit)), status: 'good' },
                { label: t('aiHub.dpAdRoi'), value: afterROI.roi.toFixed(1) + '%', status: afterROI.roi > 0 ? 'good' : 'bad' },
            ],
        });
    }

    // ② Low stock SKU → pause ads
    const lowStock = (inventory || []).filter(p => {
        const total = Object.values(p.stock || {}).reduce((s, v) => s + v, 0);
        return total > 0 && total < p.safeQty * 1.5;
    });
    if (lowStock.length) {
        const sku = lowStock[0];
        const total = Object.values(sku.stock).reduce((s, v) => s + v, 0);
        const dailySales = Math.round(total / 5);
        const wastedAdBudget = Math.round(dailySales * sku.price * 0.08 * 5);
        recs.push({
            id: 'rec_lowstock_' + sku.sku, type: 'inventory_alert', priority: 'HIGH',
            title: `[${sku.name}] ${t('aiHub.recLowStockTitle')}`,
            reason: `${t('aiHub.stock')} ${total} (${t('aiHub.safeStock')} ${sku.safeQty}). ${t('aiHub.wastedBudget')} ${fmt(wastedAdBudget)}.`,
            insight: `${t('aiHub.dataSource')}: ${t('aiHub.unitPrice')} ${fmt(sku.price)} · ${t('aiHub.dailySales')} ${dailySales} ${t('aiHub.units')} · ${t('aiHub.adSaving')} ROI=${(wastedAdBudget / (dailySales * sku.price) * 100).toFixed(1)}%`,
            channels: [], budget: 0, estimatedRoas: 0, estimatedRevenue: 0,
            estimatedProfit: wastedAdBudget, estimatedROI: 100,
            category: `⚠️ ${t('aiHub.catInventoryRisk')}`, color: '#ef4444', actionType: 'pause',
            dataPoints: [
                { label: t('aiHub.dpCurrentStock'), value: total + t('aiHub.pcs'), status: 'bad' },
                { label: t('aiHub.dpSafeStock'), value: sku.safeQty + t('aiHub.pcs'), status: 'info' },
                { label: t('aiHub.dpAdSaving'), value: fmt(wastedAdBudget), status: 'good' },
                { label: t('aiHub.dpExpireIn'), value: t('aiHub.inDays5'), status: 'bad' },
            ],
        });
    }

    // ③ CRM VIP retargeting
    const vipSeg = (crmSegments || []).find(s => s.name.includes('VIP'));
    if (vipSeg) {
        const budget = vipSeg.count * 15000;
        const roi = calcROI(budget, 6.5, avgMargin);
        recs.push({
            id: 'rec_vip_retarget', type: 'crm_retarget', priority: 'MEDIUM',
            title: `VIP ${vipSeg.count}${t('aiHub.peopleUnit')} ${t('aiHub.recVipTitle')}`,
            reason: `${vipSeg.name} ${vipSeg.count}${t('aiHub.peopleUnit')} — ${t('aiHub.vipReason')}`,
            insight: `${t('aiHub.dataSource')}: ${t('aiHub.vipInsight')} ROI = ${roi.roi.toFixed(1)}% (${t('aiHub.netProfit')} ${fmt(Math.round(roi.netProfit))})`,
            channels: [
                { id: 'meta', name: 'Meta Ads', budget: Math.round(budget * 0.5), icon: '📘' },
                { id: 'kakao', name: 'Kakao', budget: Math.round(budget * 0.3), icon: '💛' },
                { id: 'google', name: 'Google', budget: Math.round(budget * 0.2), icon: '🔍' },
            ],
            budget, estimatedRoas: 6.5,
            estimatedRevenue: Math.round(roi.revenue),
            estimatedProfit: Math.round(roi.netProfit),
            estimatedROI: roi.roi,
            category: `👑 ${t('aiHub.catCrmRetarget')}`, color: '#f59e0b',
            dataPoints: [
                { label: t('aiHub.dpVipCount'), value: vipSeg.count + t('aiHub.peopleUnit'), status: 'good' },
                { label: t('aiHub.dpConvRate'), value: '15%', status: 'good' },
                { label: t('aiHub.dpEstRoas'), value: '6.5x', status: 'good' },
                { label: t('aiHub.dpExpectedProfit'), value: fmt(Math.round(roi.netProfit)), status: 'good' },
                { label: t('aiHub.dpAdRoi'), value: roi.roi.toFixed(1) + '%', status: 'good' },
            ],
        });
    }

    // ④ Settlement best channel boost
    const bestS = (settlement || [])
        .map(s => ({ ...s, margin: s.netPayout / Math.max(1, s.grossSales) }))
        .sort((a, b) => b.margin - a.margin)[0];
    if (bestS) {
        const addBudget = Math.round(bestS.grossSales * 0.05);
        const roi = calcROI(addBudget, 5.2, avgMargin);
        recs.push({
            id: 'rec_settlement_boost', type: 'channel_boost', priority: 'MEDIUM',
            title: `${bestS.channel.toUpperCase()} ${t('aiHub.recBoostTitle')}`,
            reason: `${t('aiHub.settlementMargin')} ${pct(bestS.margin)} — ${t('aiHub.boostReason')}`,
            insight: `${t('aiHub.dataSource')}: ${t('aiHub.netPayout')} ${fmt(bestS.netPayout)} / ${t('aiHub.revenue')} ${fmt(bestS.grossSales)} · ${t('aiHub.addBudget')} ${fmt(addBudget)} → ${t('aiHub.netProfit')} ${fmt(Math.round(roi.netProfit))}, ROI ${roi.roi.toFixed(1)}%`,
            channels: [{ id: bestS.channel, name: bestS.channel.toUpperCase(), budget: addBudget, icon: '📈' }],
            budget: addBudget, estimatedRoas: 5.2,
            estimatedRevenue: Math.round(roi.revenue),
            estimatedProfit: Math.round(roi.netProfit),
            estimatedROI: roi.roi,
            category: `💰 ${t('aiHub.catSettlement')}`, color: '#22c55e',
            dataPoints: [
                { label: t('aiHub.dpSettlementMargin'), value: pct(bestS.margin), status: 'good' },
                { label: t('aiHub.dpAddBudget'), value: fmt(addBudget), status: 'info' },
                { label: t('aiHub.dpExpectedProfit'), value: fmt(Math.round(roi.netProfit)), status: 'good' },
                { label: t('aiHub.dpAdRoi'), value: roi.roi.toFixed(1) + '%', status: roi.roi > 0 ? 'good' : 'bad' },
            ],
        });
    }

    // ⑤ New customer acquisition
    // Mock data removed completely for zero-state compliance.
    // We rely solely on dynamic recommendations based on production data.

    return recs.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === 'HIGH' ? -1 : 1;
        return (b.estimatedROI || 0) - (a.estimatedROI || 0);
    });
}

/* ────────── Channel budget allocator ────────── */
function calcChannelAlloc(totalBudget, channelBudgets) {
    const chEntries = Object.entries(channelBudgets || {});
    if (!chEntries.length) return Object.entries(CH_ALLOC).map(([id, ratio]) => ({
        id, name: CH_NAME[id], icon: CH_ICON[id], color: CH_COLOR[id],
        budget: Math.round(totalBudget * ratio), ratio,
    }));
    const totalRoas = chEntries.reduce((s, [, v]) => s + v.roas, 0);
    return chEntries.map(([id, v]) => ({
        id, name: v.name, icon: v.icon || CH_ICON[id] || '📣', color: v.color || CH_COLOR[id] || '#6366f1',
        budget: Math.round(totalBudget * (v.roas / totalRoas)),
        ratio: v.roas / totalRoas, roas: v.roas,
    })).sort((a, b) => b.ratio - a.ratio);
}

/* ────────── Recommend Card ────────── */
function RecommendCard({ rec, onBudgetChange, onApprove, onExecute, approved, executing, executed, defaultCard, t }) {
    const { fmt } = useCurrency();
    const [budget, setBudget] = useState(rec.budget);
    const [editing, setEditing] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [showReason, setShowReason] = useState(false);

    const handleBudgetSave = () => {
        const v = parseInt(inputVal.replace(/[^0-9]/g, ''));
        if (!isNaN(v) && v >= 0) { setBudget(v); onBudgetChange(rec.id, v); }
        setEditing(false);
    };

    return (
        <div className="card card-glass" style={{ border: `1.5px solid ${approved ? rec.color + '55' : executed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`, padding: 20, transition: 'border 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        <Tag label={rec.category} color={rec.color} size={10} />
                        <Tag label={`${t('aiHub.priority')}: ${rec.priority}`} color={PRIO_COLOR[rec.priority]} size={9} />
                        {rec.estimatedROI > 0 && <Tag label={`ROI ${rec.estimatedROI.toFixed(0)}%`} color={rec.estimatedROI > 50 ? '#22c55e' : '#eab308'} size={9} />}
                        {executed && <Tag label={`✅ ${t('aiHub.executed')}`} color="#22c55e" size={9} />}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.4 }}>{rec?.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>{rec.reason}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {rec.estimatedRoas > 0 && <><div style={{ fontSize: 20, color: rec.color, fontWeight: 900 }} >{t('aiHub.estRoas')}</div><div>{rec.estimatedRoas}x</div></>}
                    {rec.estimatedProfit !== 0 && <div style={{ fontSize: 10, color: rec.estimatedProfit > 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                        {rec.estimatedProfit > 0 ? '+' : ''}{fmt(rec.estimatedProfit)} {t('aiHub.netProfit')}
                    </div>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(78px, 1fr))', gap: 8, marginBottom: 12 }}>
                {rec.dataPoints.map(dp => (
                    <div key={dp.label} style={{ padding: '7px 8px', borderRadius: 8, background: STATUS_COLOR[dp.status] + '0a', border: `1px solid ${STATUS_COLOR[dp.status]}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>{dp.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: STATUS_COLOR[dp.status] }}>{dp.value}</div>
                    </div>
                ))}
            </div>

            <button onClick={() => setShowReason(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#4f8ef7', padding: 0, marginBottom: showReason ? 8 : 10 }}>
                {showReason ? `▲ ${t('aiHub.hideReason')}` : `▼ ${t('aiHub.showReason')}`}
            </button>
            {showReason && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)', fontSize: 11, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 10 }}>
                    🤖 {rec.insight}
                </div>
            )}

            {rec.channels.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {rec.channels.map(ch => (
                        <div key={ch.id} style={{ padding: '5px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11 }}>
                            {ch.icon} {ch.name} <span style={{ fontWeight: 800, color: rec.color }}>{fmt(ch.budget)}</span>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('aiHub.execBudget')}</span>
                    {editing ? (
                        <input autoFocus type="number" value={inputVal} onChange={e => setInputVal(e.target.value)}
                            onBlur={handleBudgetSave} onKeyDown={e => { if (e.key === 'Enter') handleBudgetSave(); if (e.key === 'Escape') setEditing(false); }} style={{ width: 110, padding: '5px 8px', borderRadius: 7, background: 'rgba(0,0,0,0.4)', border: `1px solid ${rec.color}55`, color: '#fff', fontSize: 12 }} />
                    ) : (
                        <button onClick={() => { setEditing(true); setInputVal(String(budget)); }} style={{ padding: '5px 12px', borderRadius: 7, background: rec.color + '10', border: `1px dashed ${rec.color}44`, color: rec.color, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                            {fmt(budget)} ✏️
                        </button>
                    )}
                    {rec.estimatedRevenue > 0 && <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }} >→ {t('aiHub.revenue')} <span>{fmt(rec.estimatedRevenue)}</span></span>}
                </div>
                {defaultCard && (
                    <div style={{ fontSize: 10, color: 'var(--text-3)', padding: '3px 10px', borderRadius: 99, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
                        💳 {defaultCard.alias} {defaultCard.number?.slice(-6)}
                    </div>
                )}
                <div style={{ marginLeft: 'auto' }}>
                    {!executed ? (
                        approved ? (
                            <button onClick={() => onExecute(rec, budget)} disabled={executing}
                                style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: executing ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 12, background: executing ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: executing ? 'var(--text-3)' : '#fff', opacity: executing ? 0.7 : 1 }}>
                                {executing ? `⏳ ${t('aiHub.executing')}` : `🚀 ${t('aiHub.autoExec')}`}
                            </button>
                        ) : (
                            <button onClick={() => onApprove(rec.id)}
                                style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: `linear-gradient(135deg,${rec.color},${rec.color}cc)`, color: '#fff' }}>
                                ✅ {t('aiHub.approve')}
                            </button>
                        )
                    ) : (
                        <span style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11, fontWeight: 700, color: '#22c55e' }}>✅ {t('aiHub.execDone')}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ────────── Total Budget Panel ────────── */
function TotalBudgetPanel({ channelBudgets, onAllocate, t }) {
    const { fmt } = useCurrency();
    const [totalBudget, setTotalBudget] = useState(() => parseInt(sessionStorage.getItem('aihub_totalBudget') || '0') || '');
    const [editVal, setEditVal] = useState('');
    const [editing, setEditing] = useState(false);
    const [alloc, setAlloc] = useState(() => JSON.parse(sessionStorage.getItem('aihub_alloc') || 'null'));

    useEffect(() => {
        if (totalBudget) sessionStorage.setItem('aihub_totalBudget', totalBudget);
        if (alloc) sessionStorage.setItem('aihub_alloc', JSON.stringify(alloc));
    }, [totalBudget, alloc]);

    const handleCalc = () => {
        const v = parseInt(editVal.replace(/[^0-9]/g, ''));
        if (!v) return;
        setTotalBudget(v);
        setAlloc(calcChannelAlloc(v, channelBudgets));
        setEditing(false);
    };

    return (
        <div className="card card-glass" style={{ padding: 20, border: '1px solid rgba(168,85,247,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>💰 {t('aiHub.totalBudgetTitle')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('aiHub.totalBudgetSub')}</div>
                </div>
                {!editing ? (
                    <button onClick={() => { setEditing(true); setEditVal(totalBudget ? String(totalBudget) : ''); }} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {totalBudget ? `${fmt(totalBudget)} ${t('aiHub.edit')}` : `+ ${t('aiHub.enterBudget')}`}
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input autoFocus type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                            placeholder="50000000"
                            onKeyDown={e => { if (e.key === 'Enter') handleCalc(); if (e.key === 'Escape') setEditing(false); }} style={{ width: 160, padding: '8px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(168,85,247,0.4)', color: '#fff', fontSize: 13, fontWeight: 700 }} />
                        <button onClick={handleCalc} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#a855f7', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{t('aiHub.calcAlloc')}</button>
                        <button onClick={() => setEditing(false)} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>{t('cancel')}</button>
                    </div>
                )}
            </div>

            {alloc && (
                <>
                    <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                        {alloc.map(ch => (
                            <div key={ch.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                    <span style={{ color: ch.color || '#4f8ef7', fontWeight: 700 }}>{ch.icon} {ch.name}</span>
                                    <span>
                                        <span style={{ fontWeight: 800, color: ch.color || '#4f8ef7' }}>{fmt(ch.budget)}</span>
                                        <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>({(ch.ratio * 100).toFixed(0)}%)</span>
                                        {ch.roas && <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>ROAS {ch.roas}x</span>}
                                    </span>
                                </div>
                                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                                    <div style={{ width: (ch.ratio * 100) + '%', height: '100%', background: ch.color || '#4f8ef7', borderRadius: 3, transition: 'width 0.6s' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => onAllocate(totalBudget, alloc)}
                        style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                        ✅ {t('aiHub.applyAlloc')}
                    </button>
                </>
            )}
        </div>
    
    );
}

/* ────────── Execution Log ────────── */
function ExecutionLog({ logs, t }) {
    if (!logs.length) return null;
    return (
        <div className="card card-glass" style={{ padding: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>📋 {t('aiHub.execLog')}</div>
            <div style={{ display: 'grid', gap: 8 }}>
                {logs.map((log, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 14 }}>{log.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700 }}>{log.title}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{log.detail}</div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{log.time}</div>
                        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99,
                            background: log.status === t('aiHub.logDone') ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                            color: log.status === t('aiHub.logDone') ? '#22c55e' : '#eab308',
                            border: `1px solid ${log.status === t('aiHub.logDone') ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.25)'}`,
                            fontWeight: 700 }}>{log.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ────────── Main Component ────────── */
export default function AIMarketingHub() {
    const { fmt } = useCurrency();
    const { t } = useI18n();
    const navigate = useNavigate();
    const {isDemo, isPro, plan} = useAuth();
    const { inventory, orders, channelBudgets, settlement, crmSegments, pnlStats, paymentCards, chargeCard, sharedCampaigns,
        executeAIRecommendation, aiRecommendationLog, activeRules, rulesFired, addAlert } = useGlobalData();
    const [approved, setApproved] = useState(() => JSON.parse(sessionStorage.getItem('aihub_approved') || '{}'));
    const [executing, setExecuting] = useState({});
    const [executed, setExecuted] = useState(() => JSON.parse(sessionStorage.getItem('aihub_executed') || '{}'));
    const [budgets, setBudgets] = useState(() => JSON.parse(sessionStorage.getItem('aihub_budgets') || '{}'));
    const [logs, setLogs] = useState(() => JSON.parse(sessionStorage.getItem('aihub_logs') || '[]'));
    const [filter, setFilter] = useState('all');
    const [analysisStep, setAnalysisStep] = useState(0);

    // 🔒 SecurityGuard — enterprise security monitoring
    useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });

    useEffect(() => {
        sessionStorage.setItem('aihub_approved', JSON.stringify(approved));
        sessionStorage.setItem('aihub_executed', JSON.stringify(executed));
        sessionStorage.setItem('aihub_budgets', JSON.stringify(budgets));
        sessionStorage.setItem('aihub_logs', JSON.stringify(logs));
    }, [approved, executed, budgets, logs]);

    useEffect(() => {
        setAnalysisStep(1);
        const timer = setTimeout(() => setAnalysisStep(2), 1800);
        return () => clearTimeout(timer);
    }, []);

    const recommendations = useMemo(() =>
        generateRecommendations(inventory, orders, channelBudgets, settlement, crmSegments, pnlStats, t, fmt),
        [inventory, orders, channelBudgets, settlement, crmSegments, pnlStats, t, fmt]
    );

    const defaultCard = paymentCards.find(c => c.isDefault) || paymentCards[0];
    const avgMargin = pnlStats?.revenue > 0 ? Math.max(0.15, (pnlStats.grossProfit || pnlStats.revenue * 0.35) / pnlStats.revenue) : 0.35;

    const filtered = useMemo(() => {
        if (filter === 'all') return recommendations;
        if (filter === 'high') return recommendations.filter(r => r.priority === 'HIGH');
        if (filter === 'positive_roi') return recommendations.filter(r => r.estimatedROI > 50);
        if (filter === 'approved') return recommendations.filter(r => approved[r.id]);
        if (filter === 'executed') return recommendations.filter(r => executed[r.id]);
        return recommendations;
    }, [recommendations, filter, approved, executed]);

    const handleAllocate = useCallback((totalBudget, alloc) => {
        const updated = {};
        recommendations.forEach(rec => {
            if (rec.channels.length) {
                const total = rec.channels.reduce((s, c) => s + c.budget, 0);
                if (total > 0) {
                    const scale = Math.min(1, totalBudget * 0.3 / recommendations.filter(r => r.channels.length).length / Math.max(total, 1));
                    updated[rec.id] = Math.round(total * scale);
                }
            }
        });
        setBudgets(p => ({ ...p, ...updated }));
    }, [recommendations]);

    const handleApprove = useCallback((id) => {
        setApproved(p => ({ ...p, [id]: true }));
    }, []);

    const handleExecute = useCallback(async (rec, budget) => {
        const execBudget = budget ?? budgets[rec.id] ?? rec.budget;
        let card = defaultCard || paymentCards[0];
        
        if (isDemo && !card) {
            card = { id: '_card', alias: '기업공용 (Virtual)', limit: 999999999, totalCharged: 0 };
        } else if (!card) {
            alert(t('aiHub.noCardAlert'));
            navigate('/budget-planner');
            return;
        }

        if (card.limit > 0 && (card.totalCharged || 0) + execBudget > card.limit) {
            alert(`${t('aiHub.cardLimitAlert')} ${fmt(card.limit)}. ${t('aiHub.currentCharged')}: ${fmt(card.totalCharged || 0)}`);
            return;
        }

        setExecuting(p => ({ ...p, [rec.id]: true }));
        const now = new Date().toLocaleTimeString('ko-KR', { hour12: false });
        setLogs(p => [{
            icon: isDemo ? '🎭' : '💳',
            title: isDemo ? `[${t('aiHub.Mode')}] ${rec.title}` : `[${card.alias}] ${rec.title}`,
            detail: `${fmt(execBudget)} ${t('aiHub.autoExecDetail')} · ${t('aiHub.estRoi')} ${rec.estimatedROI?.toFixed(1)}% · ${t('aiHub.netProfit')} ${fmt(rec.estimatedProfit || 0)}`,
            time: now, status: t('aiHub.logInProgress'),
        }, ...p]);

        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

        if (!isDemo || paymentCards.length > 0) {
            chargeCard(card.id, execBudget, rec.title);
        }
        executeAIRecommendation(rec, execBudget, card.alias);

        setExecuting(p => ({ ...p, [rec.id]: false }));
        setExecuted(p => ({ ...p, [rec.id]: true }));
        setLogs(p => p.map((l, i) => i === 0 ? { ...l, status: t('aiHub.logDone') } : l));
    }, [isDemo, defaultCard, paymentCards, budgets, chargeCard, navigate, executeAIRecommendation, t, fmt]);

    const handleApproveAll = () => {
        const a = {};
        recommendations.forEach(r => { a[r.id] = true; });
        setApproved(a);
    };
    const handleExecuteAll = async () => {
        for (const rec of recommendations.filter(r => approved[r.id] && !executed[r.id])) {
            await handleExecute(rec, budgets[rec.id] ?? rec.budget);
        }
    };

    const approvedCount = Object.values(approved).filter(Boolean).length;
    const executedCount = Object.values(executed).filter(Boolean).length;
    const totalBudget   = recommendations.reduce((s, r) => s + (budgets[r.id] ?? r.budget), 0);
    const totalRevenue  = recommendations.reduce((s, r) => s + r.estimatedRevenue, 0);
    const totalProfit   = recommendations.reduce((s, r) => s + (r.estimatedProfit || 0), 0);
    const blendedROI    = totalBudget > 0 ? ((totalProfit / totalBudget) * 100).toFixed(1) : '0';

    const dataSources = [
        { icon: '📦', label: t('aiHub.dsInventory'), value: inventory.length + ' SKU', color: '#4f8ef7' },
        { icon: '📋', label: t('aiHub.dsOrders'), value: orders.length + t('aiHub.casesUnit'), color: '#22c55e' },
        { icon: '💰', label: t('aiHub.dsChannels'), value: Object.keys(channelBudgets || {}).length + t('aiHub.channelsUnit'), color: '#a855f7' },
        { icon: '🧾', label: t('aiHub.dsSettlement'), value: settlement.length + t('aiHub.casesUnit'), color: '#f97316' },
        { icon: '👥', label: 'CRM', value: (crmSegments || []).length + t('aiHub.segmentsUnit'), color: '#ec4899' },
        { icon: '💳', label: t('aiHub.dsCard'), value: paymentCards.length > 0 ? `${paymentCards.length}${t('aiHub.cardsUnit')}` : t('aiHub.noCard'), color: paymentCards.length > 0 ? '#22c55e' : '#ef4444' },
        { icon: '🧠', label: t('aiHub.dsActiveRules'), value: activeRules.length + t('aiHub.countUnit'), color: '#a855f7' },
        { icon: '⚡', label: t('aiHub.dsRulesFired'), value: rulesFired.length + t('aiHub.timesUnit'), color: '#eab308' },
    ];

    const FILTERS = [
        ['all', t('aiHub.filterAll')],
        ['high', `⚠️ HIGH`],
        ['positive_roi', `📈 ROI+50%`],
        ['approved', `✅ ${t('aiHub.filterApproved')}`],
        ['executed', `💳 ${t('aiHub.filterExecuted')}`],
    ];

    return (
<div style={{ display: 'grid', gap: 18, padding: 4 }}>
            {/*  mode banner */}
            {isDemo && (
                <div style={{ padding: '12px 18px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(168,85,247,0.1),rgba(79,142,247,0.06))', border: '1.5px solid rgba(168,85,247,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#c084fc' }}>🎭 {t('aiHub.Banner')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            {t('aiHub.Desc')} <strong style={{ color: '#c084fc' }}>{t('aiHub.NeedPaid')}</strong>
                        </div>
                    </div>
                    <button onClick={() => navigate('/pricing')} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#a855f7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12 }}>
                        💎 {t('aiHub.upgradeBtn')}
                    </button>
                </div>
            )}

            {/* Pending campaigns from AI strategy */}
            {sharedCampaigns && sharedCampaigns.filter(c => c.status === 'pending').length > 0 && (
                <div style={{ padding: '14px 20px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.06))', border: '1.5px solid rgba(245,158,11,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b' }}>
                            ⏳ {t('aiHub.pendingCampaigns', { n: sharedCampaigns.filter(c => c.status === 'pending').length })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t('aiHub.pendingDesc')}</div>
                    </div>
                    <button onClick={() => navigate('/campaign-manager?tab=overview')} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', fontWeight: 800, fontSize: 12 }}>
                        📣 {t('aiHub.viewCampaigns')} →
                    </button>
                </div>
            )}

            {/* Hero */}
            <div className="card card-glass" style={{ padding: '18px 22px', background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))' }}>
                <div style={{ fontWeight: 900, fontSize: 20, background: 'linear-gradient(135deg,#4f8ef7,#a855f7)' }}>
                    🤖 {t('aiHub.heroTitle')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, marginBottom: 10 }}>
                    {t('aiHub.heroSub')}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {dataSources.map(d => (
                        <span key={d.label} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: d.color + '18', color: d.color, border: `1px solid ${d.color}33` }}>
                            {d.icon} {d.label}: {d.value}
                        </span>
                    ))}
                    {paymentCards.length === 0 && (
                        <button onClick={() => navigate('/budget-planner')} style={{ fontSize: 10, padding: '3px 12px', borderRadius: 99, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>
                            💳 {t('aiHub.registerCard')} →
                        </button>
                    )}
                </div>
            </div>

            {analysisStep < 2 ? (
                <div className="card card-glass" style={{ padding: '44px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 42, marginBottom: 12 }}>🤖</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#6366f1', marginBottom: 8 }}>{t('aiHub.analyzing')}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {t('aiHub.analysisTags', { returnObjects: true }) || ['Inventory','Orders','ROAS','P&L','CRM','Settlement'].map((s, i) => (
                            <span key={i} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>⚙️ {s}</span>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* KPI */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                        {[
                            { label: t('aiHub.kpiRecommend'), value: recommendations.length + t('aiHub.casesUnit'), color: '#6366f1', icon: '🤖' },
                            { label: t('aiHub.kpiApproved'), value: approvedCount + t('aiHub.casesUnit'), color: '#4f8ef7', icon: '✅' },
                            { label: t('aiHub.kpiExecuted'), value: executedCount + t('aiHub.casesUnit'), color: '#22c55e', icon: '💳' },
                            { label: t('aiHub.kpiTotalBudget'), value: fmt(totalBudget), color: '#a855f7', icon: '💰' },
                            { label: t('aiHub.kpiEstRevenue'), value: fmt(totalRevenue), color: '#f97316', icon: '📈' },
                            { label: t('aiHub.kpiEstProfit'), value: fmt(totalProfit), color: totalProfit >= 0 ? '#22c55e' : '#ef4444', icon: '💹', sub: `ROI ${blendedROI}%` },
                        ].map(k => (
                            <div key={k.label} className="card card-glass" style={{ padding: '10px 12px', borderLeft: `3px solid ${k.color}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 700 }}>{k.label}</div>
                                    <span style={{ fontSize: 14 }}>{k.icon}</span>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: 13, color: k.color, marginTop: 4 }}>{k.value}</div>
                                {k.sub && <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>{k.sub}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Total Budget Allocator */}
                    <TotalBudgetPanel channelBudgets={channelBudgets} onAllocate={handleAllocate} t={t} />

                    {/* No card warning */}
                    {!defaultCard && !isDemo && (
                        <div style={{ padding: '12px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12, color: '#ef4444' }}>⚠️ {t('aiHub.noCardWarning')}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('aiHub.noCardDesc')}</div>
                            </div>
                            <button onClick={() => navigate('/budget-planner')} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                                💳 {t('aiHub.registerCard')} →
                            </button>
                        </div>
                    )}

                    {/* Bulk execution banner */}
                    {approvedCount > 0 && executedCount < approvedCount && (
                        <div style={{ padding: '14px 20px', borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#a5b4fc' }}>
                                    💳 {t('aiHub.bulkApproved', { n: approvedCount })} — {defaultCard ? t('aiHub.readyToExec', { card: defaultCard.alias }) : isDemo ? t('aiHub.readyToExec', { card: 'Virtual' }) : t('aiHub.needCard')}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                    {t('aiHub.totalExecBudget')} {fmt(recommendations.filter(r => approved[r.id]).reduce((s, r) => s + (budgets[r.id] ?? r.budget), 0))}
                                </div>
                            </div>
                            <button onClick={handleExecuteAll} disabled={!defaultCard && !isDemo}
                                style={{ padding: '9px 18px', borderRadius: 10, border: 'none', cursor: (defaultCard || isDemo) ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 12, background: (defaultCard || isDemo) ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.07)', color: (defaultCard || isDemo) ? '#fff' : 'var(--text-3)', opacity: (defaultCard || isDemo) ? 1 : 0.6 }}>
                                💳 {t('aiHub.bulkExec')}
                            </button>
                        </div>
                    )}

                    {/* Filter + Bulk approve */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {FILTERS.map(([v, l]) => (
                                <button key={v} onClick={() => setFilter(v)}
                                    style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)', background: filter === v ? '#6366f1' : 'transparent', color: filter === v ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                        <button onClick={handleApproveAll} style={{ padding: '7px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                            ✅ {t('aiHub.approveAll')}
                        </button>
                    </div>

                    {/* Recommendation cards */}
                    <div style={{ display: 'grid', gap: 14 }}>
                        {filtered.map(rec => (
                            <RecommendCard key={rec.id} rec={rec}
                                onBudgetChange={(id, v) => setBudgets(p => ({ ...p, [id]: v }))}
                                onApprove={handleApprove}
                                onExecute={handleExecute}
                                approved={!!approved[rec.id]}
                                executing={!!executing[rec.id]}
                                executed={!!executed[rec.id]}
                                defaultCard={defaultCard}
                                t={t}
                            />
                        ))}
                    </div>

                    {/* Execution log */}
                    <ExecutionLog logs={logs} t={t} />

                    {/* Post-execution integration banner */}
                    {executedCount > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                            <div className="card card-glass" style={{ padding: '12px 16px', cursor: 'pointer', border: '1px solid rgba(79,142,247,0.25)' }} onClick={() => navigate('/campaign-manager')}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>📣 {t('aiHub.campaignStatus')}</div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#4f8ef7', marginTop: 4 }}>{t('aiHub.autoRegistered', { n: sharedCampaigns.filter(c => c.source === 'ai_hub').length })} →</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('aiHub.checkInCampaignMgr')}</div>
                            </div>
                            <div className="card card-glass" style={{ padding: '12px 16px', cursor: 'pointer', border: '1px solid rgba(168,85,247,0.25)' }} onClick={() => navigate('/journey-builder')}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>🗺️ {t('aiHub.journeyAutomation')}</div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#a855f7', marginTop: 4 }}>{t('aiHub.journeyLink')} →</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('aiHub.journeyDesc')}</div>
                            </div>
                            <div className="card card-glass" style={{ padding: '12px 16px', cursor: 'pointer', border: '1px solid rgba(34,197,94,0.25)' }} onClick={() => navigate('/attribution')}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>📈 {t('aiHub.attribution')}</div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: '#22c55e', marginTop: 4 }}>{t('aiHub.attributionLink')} →</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('aiHub.attributionDesc')}</div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>


    );
}
