import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSubtabPaintFix } from "../utils/subtabPaintFix";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx'; // [현 차수] 플랜별 탭 노출
import { tabAllowedByPlan } from '../auth/tabPlanPolicy.js';

/* ─── Security Engine ──────────────────── */
const SEC_PATTERNS = [
    { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
    { re: /on\w+\s*=/i, type: 'XSS' }, { re: /union\s+select/i, type: 'SQL_INJECT' },
    { re: /drop\s+table/i, type: 'SQL_INJECT' }, { re: /\.\.\//g, type: 'PATH_TRAVERSAL' },
];
const secCheck = (v = '') => { for (const p of SEC_PATTERNS) { if (p.re.test(v)) return p.type; } return null; };

function SecurityOverlay({ threats, onDismiss, t }) {
    if (!threats.length) return null;
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#1a0000,#2d0a0a)', border: '2px solid #ef4444', borderRadius: 20, padding: 32, maxWidth: 480, width: '90%', textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚨</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', marginBottom: 8 }}>{t('pnl.securityAlert')}</div>
                <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 20 }}>{t('pnl.securityDesc')}</div>
                {threats.map((th, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 11, color: '#fca5a5', textAlign: 'left' }}>
                        <strong style={{ color: '#ef4444' }}>[{th.type}]</strong> {th.value.slice(0, 60)}…
                </div>
                ))}
                <button onClick={onDismiss} style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                    ✕ {t('pnl.dismiss')}
                </button>
            </div>
        </div>
);
}

/* ─── Shared ──────────────────── */
const CARD = { borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' };
const INPUT = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1,#e8eaf0)', fontSize: 12, boxSizing: 'border-box' };
const BTN = (bg, color) => ({ padding: '7px 16px', borderRadius: 8, border: 'none', background: bg, color, cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' });
const ACCENT = '#4f8ef7';
const GREEN = '#22c55e';
const RED = '#ef4444';

const fmtM = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + "M" : Math.abs(v) >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(Number(v || 0).toFixed(0));
const pct = (n, d) => d ? (n / d * 100).toFixed(1) + "%" : "0.0%";
const r2 = v => isNaN(v) ? "0.00" : Number(v).toFixed(2);

/* ─── Channel Fee Rates ─── */
const CHANNEL_FEES = {
    coupang: 0.108, naver: 0.055, gmarket: 0.12, '11st': 0.10, auction: 0.12, wemakeprice: 0.12,
    tmon: 0.10, interpark: 0.10, ssg: 0.08, lotteon: 0.08, amazon: 0.15, shopify: 0.029,
    meta: 0, google: 0, tiktok: 0, kakao_moment: 0, naver_ads: 0, line: 0, whatsapp: 0,
};

/* ─── Integration Hub Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const channels = [];
        try {
            const keys = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]');
            if (Array.isArray(keys)) keys.forEach(k => { if (k.service) channels.push(k.service.toLowerCase()); });
        } catch { /* ignore */ }
        ['meta', 'google', 'tiktok', 'kakao_moment', 'naver', 'coupang', 'amazon', 'shopify',
         'gmarket', '11st', 'auction', 'wemakeprice', 'tmon', 'interpark', 'ssg', 'lotteon', 'line', 'whatsapp'
        ].forEach(ch => {
            try { if (localStorage.getItem(`geniego_channel_${ch}`)) channels.push(ch); } catch { /* ignore */ }
        });
        return [...new Set(channels)];
    }, []);
}

/* ─── KPI Card ─── */
const KpiCard = ({ label, value, sub, color = ACCENT, icon, alert }) => (
    <div style={{ ...CARD, padding: '14px 16px', borderLeft: `3px solid ${alert ? RED : color}`, boxShadow: alert ? '0 0 12px rgba(239,68,68,0.12)' : undefined }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{label}</div>
            {icon && <span style={{ fontSize: 16, opacity: .8 }}>{icon}</span>}
        </div>
        <div style={{ fontWeight: 900, fontSize: 18, color: alert ? RED : color, marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: alert ? RED : 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
);

const MiniBar = ({ v, max, color = ACCENT, h = 4 }) => (
    <div style={{ height: h, background: 'var(--surface)', borderRadius: h, flex: 1 }}>
        <div style={{ width: `${Math.min(100, max ? Math.abs(v / max) * 100 : 0)}%`, height: '100%', background: color, borderRadius: h, transition: 'width .4s' }} />
    </div>
);

/* ═══════ TAB 0: Profit Health Score (231차 AI Profit OS — 측정→분석) ═══════ */
/* 순수 pnlStats 파생(스키마변경 0·무위험). 순이익 건강도를 Green/Yellow/Red 로 판정 + 개선 힌트. */
function HealthTab({ live, t, fmt }) {
    const rev = live.grossRevenue || 0;
    const pct = (n, d) => d > 0 ? (n / d * 100) : 0;
    // 각 지표: value(%) · 목표/경계 · status('good'|'warn'|'bad') · 가중치 · 개선 힌트
    const grossMargin = pct(live.grossProfit, rev);
    const opMargin = pct(live.operatingProfit, rev);
    const cogsRatio = pct(live.cogs, rev);
    const adRatio = pct(live.adSpend, rev);
    const shipRatio = pct(live.shippingCost, rev);
    const returnRatio = pct(live.returnFee, rev);
    const feeRatio = pct(live.platformFee, rev);
    const band = (v, good, warn, invert) => {
        // invert=false: 높을수록 좋음(마진). invert=true: 낮을수록 좋음(비용비율)
        if (!invert) return v >= good ? 'good' : v >= warn ? 'warn' : 'bad';
        return v <= good ? 'good' : v <= warn ? 'warn' : 'bad';
    };
    const METRICS = [
        { key: 'grossMargin', label: t('pnl.hsGrossMargin', '매출총이익률'), v: grossMargin, fmt: 'pct', target: '≥30%', status: band(grossMargin, 30, 18, false), w: 0.22, tip: t('pnl.hsTipGross', '원가(COGS)·플랫폼 수수료를 점검하세요.') },
        { key: 'opMargin', label: t('pnl.hsOpMargin', '영업이익률(배송비 포함)'), v: opMargin, fmt: 'pct', target: '≥15%', status: band(opMargin, 15, 7, false), w: 0.28, tip: t('pnl.hsTipOp', '광고비·배송비·반품비 중 과대 항목을 줄이세요.') },
        { key: 'cogs', label: t('pnl.hsCogs', '원가율(COGS)'), v: cogsRatio, fmt: 'pct', target: '≤60%', status: band(cogsRatio, 60, 72, true), w: 0.12, tip: t('pnl.hsTipCogs', '매입가 인하·고마진 SKU 비중 확대를 검토하세요.') },
        { key: 'ad', label: t('pnl.hsAd', '광고비율'), v: adRatio, fmt: 'pct', target: '≤30%', status: band(adRatio, 30, 45, true), w: 0.16, tip: t('pnl.hsTipAd', 'ROAS 낮은 채널 예산을 회수하세요(자동 마케팅).') },
        { key: 'ship', label: t('pnl.hsShip', '배송비율'), v: shipRatio, fmt: 'pct', target: '≤5%', status: band(shipRatio, 5, 9, true), w: 0.1, tip: t('pnl.hsTipShip', '무료배송 기준금액·택배사 단가를 조정하세요(연동허브).') },
        { key: 'ret', label: t('pnl.hsRet', '반품비율'), v: returnRatio, fmt: 'pct', target: '≤5%', status: band(returnRatio, 5, 10, true), w: 0.07, tip: t('pnl.hsTipRet', '반품 사유 상위 SKU를 점검하세요(반품 포털).') },
        { key: 'fee', label: t('pnl.hsFee', '플랫폼 수수료율'), v: feeRatio, fmt: 'pct', target: '≤12%', status: band(feeRatio, 12, 18, true), w: 0.05, tip: t('pnl.hsTipFee', '저수수료 채널 비중·정산 수수료 규칙을 점검하세요.') },
    ];
    const sc = { good: 100, warn: 60, bad: 20 };
    const score = Math.round(METRICS.reduce((s, m) => s + sc[m.status] * m.w, 0));
    const verdict = score >= 75 ? { c: '#22c55e', l: t('pnl.hsHealthy', '건강 (Healthy)'), e: '🟢' }
        : score >= 50 ? { c: '#eab308', l: t('pnl.hsCaution', '주의 (Caution)'), e: '🟡' }
        : { c: '#ef4444', l: t('pnl.hsCritical', '긴급 (Critical)'), e: '🔴' };
    const COL = { good: '#22c55e', warn: '#eab308', bad: '#ef4444' };
    const STL = { good: t('pnl.hsGood', '정상'), warn: t('pnl.hsWarn', '경계'), bad: t('pnl.hsBad', '위험') };
    const worst = METRICS.filter(m => m.status !== 'good').sort((a, b) => sc[a.status] - sc[b.status]);
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', borderColor: verdict.c + '55', background: verdict.c + '0d' }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `4px solid ${verdict.c}`, background: 'var(--card)' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: verdict.c, lineHeight: 1 }}>{score}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>/ 100</div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.hsTitle', '순이익 건강 점수')}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: verdict.c }}>{verdict.e} {verdict.l}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                        {t('pnl.hsSummary', '영업이익률')} <b style={{ color: verdict.c }}>{opMargin.toFixed(1)}%</b> · {t('pnl.hsSummaryOp', '순이익')} <b>{fmt(live.operatingProfit)}</b>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                {METRICS.map(m => (
                    <div key={m.key} style={{ ...CARD, padding: 14, borderLeft: `3px solid ${COL[m.status]}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 700 }}>{m.label}</span>
                            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: COL[m.status] + '22', color: COL[m.status] }}>{STL[m.status]}</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: COL[m.status], marginTop: 4 }}>{m.v.toFixed(1)}%</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.hsTarget', '목표')} {m.target}</div>
                    </div>
                ))}
            </div>

            {worst.length > 0 && (
                <div style={{ ...CARD }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>💡 {t('pnl.hsActions', '순이익 개선 우선순위')}</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {worst.map((m, i) => (
                            <div key={m.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5 }}>
                                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: COL[m.status], color: '#fff', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                                <div><b style={{ color: COL[m.status] }}>{m.label}</b> ({m.v.toFixed(1)}%) — <span style={{ color: 'var(--text-2)' }}>{m.tip}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ═══════ TAB 1: Overview ═══════ */
function OverviewTab({ live, t, fmt, dateRange }) {
    const max = live.grossRevenue || 1;
    const waterfallRows = [
        { label: t('pnl.wfRevenue'), v: live.grossRevenue, col: ACCENT },
        { label: t('pnl.wfCogs'), v: -live.cogs, col: '#a855f7' },
        { label: t('pnl.wfGrossProfit'), v: live.grossProfit, col: GREEN },
        { label: t('pnl.wfAdSpend'), v: -live.adSpend, col: '#f97316' },
        { label: t('pnl.wfPlatformFee'), v: -live.platformFee, col: RED },
        { label: t('pnl.wfCoupon'), v: -live.couponDiscount, col: '#eab308' },
        { label: t('pnl.wfReturnFee'), v: -live.returnFee, col: '#ec4899' },
        { label: t('pnl.wfShipping', '배송비'), v: -live.shippingCost, col: '#14b8a6' },
        { label: t('pnl.wfOperatingProfit'), v: live.operatingProfit, col: live.operatingProfit >= 0 ? GREEN : RED, bold: true },
    ];
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(34,197,94,0.04),rgba(79,142,247,0.03))', borderColor: 'rgba(34,197,94,0.15)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#4ade80' }}>🌊 {t('pnl.waterfallTitle')}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 14 }}>{t('pnl.waterfallDesc')}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    {waterfallRows.map(r => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 180, fontSize: 11, fontWeight: r.bold ? 800 : 400, color: r.bold ? r.col : 'var(--text-2)', flexShrink: 0 }}>{r.label}</div>
                            <MiniBar v={r.v} max={max} color={r.col} h={r.bold ? 8 : 5} />
                            <div style={{ width: 110, textAlign: 'right', fontFamily: 'monospace', fontWeight: r.bold ? 800 : 700, fontSize: r.bold ? 13 : 11, color: r.col }}>
                                {fmt(Math.abs(r.v))}
                            </div>
                            <div style={{ width: 60, textAlign: 'right', fontSize: 10, color: 'var(--text-3)' }}>{pct(Math.abs(r.v), max)}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                <KpiCard label={t('pnl.kpiRevenue')} value={fmt(live.grossRevenue)} color={ACCENT} icon="💰" />
                <KpiCard label={t('pnl.kpiAdSpend')} value={fmt(live.adSpend)} color="#f97316" icon="📣" sub={pct(live.adSpend, live.grossRevenue)} />
                <KpiCard label={t('pnl.kpiPlatformFee')} value={fmt(live.platformFee)} color={RED} icon="🏪" sub={pct(live.platformFee, live.grossRevenue)} />
                <KpiCard label={t('pnl.kpiCogs')} value={fmt(live.cogs)} color="#a855f7" icon="📦" />
                <KpiCard label={t('pnl.kpiShipping', '배송비')} value={fmt(live.shippingCost)} color="#14b8a6" icon="🚚" sub={pct(live.shippingCost, live.grossRevenue)} />
                <KpiCard label={t('pnl.kpiNetPayout')} value={fmt(live.netPayout)} color={GREEN} icon="✅" />
                <KpiCard label={t('pnl.kpiOperatingProfit')} value={fmt(live.operatingProfit)} color={live.operatingProfit >= 0 ? GREEN : RED} icon="📊"
                    sub={pct(live.operatingProfit, live.grossRevenue) + ' ' + t('pnl.margin')} alert={live.operatingProfit < 0} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                <KpiCard label={t('pnl.kpiOrders')} value={(live.totalOrders || 0).toLocaleString() + ' ' + t('pnl.unitOrders')} color={ACCENT} icon="🛒" />
                <KpiCard label={t('pnl.kpiReturns')} value={(live.totalReturns || 0) + ' ' + t('pnl.unitOrders')} color={live.returnRate > 0.12 ? RED : '#eab308'} icon="↩"
                    sub={pct(live.totalReturns, live.totalOrders) + ' ' + t('pnl.returnRate')} alert={live.returnRate > 0.12} />
                <KpiCard label={t('pnl.kpiAnomalies')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="✅" sub={t('pnl.noAnomalies')} />
                <KpiCard label={t('pnl.kpiRoas')} value={r2(live.roas || 0) + 'x'} color="#eab308" icon="📈" />
            </div>
        </div>
    );
}

/* ═══════ TAB 2: Unit P&L + Channel Breakdown ═══════ */
function PnlUnitTab({ live, t, fmt, connectedChannels }) {
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 14px', borderRadius: 8, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.1)' }}>
                ℹ️ {t('pnl.unitPnlDesc')}
            </div>
            {/* Total Summary Table */}
            <div style={CARD}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📊 {t('pnl.unitPnlTable')}</div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'rgba(79,142,247,0.08)' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colDimension')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colRevenue')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colAdSpend')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colFee')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colNetProfit')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colMargin')}</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>ROAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 700, fontSize: 12 }}>{t('pnl.totalSummary')}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: ACCENT }}>{fmt(live.grossRevenue)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#f97316' }}>{fmt(live.adSpend)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: RED }}>{fmt(live.platformFee)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: live.operatingProfit >= 0 ? GREEN : RED }}>{fmt(live.operatingProfit)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{pct(live.operatingProfit, live.grossRevenue)}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#eab308' }}>{r2(live.roas || 0)}x</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Channel Breakdown */}
            {connectedChannels.length > 0 && (
                <div style={CARD}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16 }}>📡 {t('pnl.channelBreakdownTitle')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>{t('pnl.channelBreakdownDesc')}</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr style={{ background: 'rgba(79,142,247,0.08)' }}>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colChannel')}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colFeeRate')}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colStatus')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {connectedChannels.map(ch => (
                                    <tr key={ch} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '8px 10px', fontWeight: 700, textTransform: 'capitalize' }}>{ch.replace(/_/g, ' ')}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#eab308', fontWeight: 700 }}>{CHANNEL_FEES[ch] ? (CHANNEL_FEES[ch] * 100).toFixed(1) + '%' : '—'}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: GREEN + '20', color: GREEN, fontWeight: 700 }}>{t('pnl.connected')}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.noDataNote')}</div>
        </div>
    );
}

/* ═══════ TAB 3: Anomaly ═══════ */
function AnomalyTab({ t }) {
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                <KpiCard label={t('pnl.anomRoasDown')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="📉" />
                <KpiCard label={t('pnl.anomReturnUp')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="↩" />
                <KpiCard label={t('pnl.anomCouponAbuse')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="🏷" />
                <KpiCard label={t('pnl.anomFeeUp')} value={'0 ' + t('pnl.unitItems')} color={GREEN} icon="💸" />
            </div>
            <div style={{ ...CARD, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('pnl.noAnomaliesDetected')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t('pnl.noAnomaliesDesc')}</div>
            </div>
        </div>
    );
}

/* ═══════ TAB 4: Action ═══════ */
function ActionTab({ t }) {
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '8px 12px', borderRadius: 8, background: 'rgba(99,140,255,0.04)', border: '1px solid rgba(99,140,255,0.1)' }}>
                💡 {t('pnl.actionDesc')}
            </div>
            <div style={{ ...CARD, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('pnl.noActions')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{t('pnl.noActionsDesc')}</div>
            </div>
        </div>
    );
}

/* 손익예측 월별 바차트(매출·순이익) — 무의존 반응형 SVG-less flex 바. */
function ForecastChart({ rows, fmt, t }) {
    const max = Math.max(1, ...rows.map(r => r.revenue));
    const hasData = rows.some(r => r.revenue > 0);
    const Legend = ({ color, label }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-3)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />{label}
        </span>
    );
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>📊 {t('pnl.forecastChartTitle', '월별 매출·순이익 추이')}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Legend color={ACCENT} label={t('pnl.colRevenue')} />
                    <Legend color={GREEN} label={t('pnl.colNetProfit')} />
                </div>
            </div>
            {!hasData ? (
                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                    {t('pnl.forecastChartEmpty', '채널 연동·매출 데이터가 들어오면 예측 그래프가 표시됩니다.')}
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, padding: '4px 0' }}>
                    {rows.map(r => {
                        const rev = (r.revenue / max) * 100;
                        const prof = (Math.max(0, r.netProfit) / max) * 100;
                        const mc = Number(r.margin) >= 15 ? GREEN : Number(r.margin) >= 8 ? '#f59e0b' : RED;
                        return (
                            <div key={r.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                <div style={{ width: '100%', height: 108, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
                                    <div title={`${t('pnl.colRevenue')} ${fmt(r.revenue)}`} style={{ width: '40%', maxWidth: 26, height: `${rev}%`, minHeight: r.revenue > 0 ? 3 : 0, background: `linear-gradient(180deg, ${ACCENT}, ${ACCENT}88)`, borderRadius: '4px 4px 0 0', transition: 'height 300ms' }} />
                                    <div title={`${t('pnl.colNetProfit')} ${fmt(r.netProfit)}`} style={{ width: '40%', maxWidth: 26, height: `${prof}%`, minHeight: r.netProfit > 0 ? 3 : 0, background: `linear-gradient(180deg, ${GREEN}, ${GREEN}88)`, borderRadius: '4px 4px 0 0', transition: 'height 300ms' }} />
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-2)', fontWeight: 700 }}>+{r.m}M</div>
                                <div style={{ fontSize: 9, color: mc, fontWeight: 700 }}>{r.margin}%</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ═══════ TAB 5: Forecast ═══════ */
function ForecastTab({ live, t, fmt }) {
    const [growthRate, setGrowthRate] = useState(15);
    const [adRatio, setAdRatio] = useState(12);
    const [feeRatio, setFeeRatio] = useState(10);
    const [returnRatePct, setReturnRatePct] = useState(8);
    const [months, setMonths] = useState(6);

    const baseRevenue = live.grossRevenue || 0;
    const forecastRows = Array.from({ length: months }, (_, i) => {
        const m = i + 1;
        const revenue = Math.round(baseRevenue * Math.pow(1 + growthRate / 100, m / 12));
        const adCost = Math.round(revenue * adRatio / 100);
        const fees = Math.round(revenue * feeRatio / 100);
        const returns = Math.round(revenue * returnRatePct / 100);
        const netProfit = revenue - adCost - fees - returns;
        const margin = revenue > 0 ? (netProfit / revenue * 100).toFixed(1) : "0.0";
        return { m, revenue, adCost, fees, returns, netProfit, margin };
    });
    const totalFR = forecastRows.reduce((s, r) => s + r.revenue, 0);
    const totalFP = forecastRows.reduce((s, r) => s + r.netProfit, 0);

    const slider = (labelKey, val, set, min, max, unit = '%') => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-3)' }}>{t(labelKey)}</span>
                <strong style={{ color: ACCENT }}>{val}{unit}</strong>
            </div>
            <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: ACCENT }} />
        </div>
    );

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>🔮 {t('pnl.forecastTitle')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{t('pnl.forecastDesc')}</div>
            </div>
            {/* 204차: 파라미터 박스 확대(좌)+월별추이 그래프를 파라미터 아래 배치, 표는 우측 — 그래프/숫자 박스 이탈 해소·균형 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 400px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
                {/* 좌: 파라미터 설정 + 누적 요약 + 월별 추이 그래프(파라미터 박스 아래) */}
                <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', display: 'grid', gap: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t('pnl.paramSettings')}</div>
                    {slider('pnl.paramGrowth', growthRate, setGrowthRate, 0, 50)}
                    {slider('pnl.paramAdRatio', adRatio, setAdRatio, 5, 30)}
                    {slider('pnl.paramFeeRate', feeRatio, setFeeRatio, 5, 20)}
                    {slider('pnl.paramReturnRate', returnRatePct, setReturnRatePct, 2, 20)}
                    {slider('pnl.paramPeriod', months, setMonths, 3, 12, 'M')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                        <div style={{ textAlign: 'center', padding: 12, background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastRevenue')}</div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: GREEN }}>{fmt(totalFR)}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 12, background: 'rgba(79,142,247,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastProfit')}</div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: totalFP > 0 ? ACCENT : RED }}>{fmt(totalFP)}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastAvgMargin', '예측 평균 마진율')}</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: totalFR > 0 && (totalFP / totalFR * 100) >= 8 ? GREEN : '#f59e0b' }}>{totalFR > 0 ? (totalFP / totalFR * 100).toFixed(1) : '0.0'}%</div>
                    </div>
                </div>

                    {/* 월별 매출·순이익 추이 그래프 — 파라미터 설정 박스 바로 아래 배치(균형) */}
                    <div style={{ ...CARD, padding: 18 }}>
                        <ForecastChart rows={forecastRows} fmt={fmt} t={t} />
                    </div>
                </div>

                {/* 우: 리스트(표) 박스 — 화면 폭의 다수 차지 */}
                <div style={{ ...CARD, padding: 18, overflow: 'auto' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📋 {t('pnl.forecastTableTitle', '월별 손익 예측 상세')}</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
                            <thead>
                                <tr style={{ background: 'rgba(79,142,247,0.1)' }}>
                                    {[t('pnl.colMonth'), t('pnl.colRevenue'), t('pnl.colAdSpend'), t('pnl.colFee'), t('pnl.colReturns'), t('pnl.colNetProfit'), t('pnl.colMargin')].map(h => (
                                        <th key={h} style={{ padding: '11px 14px', textAlign: h === t('pnl.colMonth') ? 'left' : 'right', color: 'var(--text-2)', fontWeight: 800, whiteSpace: 'nowrap', position: 'sticky', top: 0 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {forecastRows.map(r => (
                                    <tr key={r.m} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '11px 14px', fontWeight: 800 }}>+{r.m}M</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'right', color: ACCENT, fontWeight: 700 }}>{fmt(r.revenue)}</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#f97316' }}>{fmt(r.adCost)}</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'right', color: RED }}>{fmt(r.fees)}</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'right', color: '#a855f7' }}>{fmt(r.returns)}</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 800, color: r.netProfit >= 0 ? GREEN : RED }}>{fmt(r.netProfit)}</td>
                                        <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: Number(r.margin) >= 15 ? GREEN : Number(r.margin) >= 8 ? '#f59e0b' : RED }}>{r.margin}%</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: `2px solid ${ACCENT}40`, background: 'rgba(79,142,247,0.05)' }}>
                                    <td style={{ padding: '11px 14px', fontWeight: 900 }}>{t('pnl.forecastTotal', '합계')}</td>
                                    <td style={{ padding: '11px 14px', textAlign: 'right', color: ACCENT, fontWeight: 900 }}>{fmt(totalFR)}</td>
                                    <td style={{ padding: '11px 14px', textAlign: 'right', color: '#f97316', fontWeight: 700 }}>{fmt(forecastRows.reduce((s, r) => s + r.adCost, 0))}</td>
                                    <td style={{ padding: '11px 14px', textAlign: 'right', color: RED, fontWeight: 700 }}>{fmt(forecastRows.reduce((s, r) => s + r.fees, 0))}</td>
                                    <td style={{ padding: '11px 14px', textAlign: 'right', color: '#a855f7', fontWeight: 700 }}>{fmt(forecastRows.reduce((s, r) => s + r.returns, 0))}</td>
                                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 900, color: totalFP >= 0 ? GREEN : RED }}>{fmt(totalFP)}</td>
                                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 900, color: totalFR > 0 && (totalFP / totalFR * 100) >= 8 ? GREEN : '#f59e0b' }}>{totalFR > 0 ? (totalFP / totalFR * 100).toFixed(1) : '0.0'}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
            </div>
        </div>
    );
}

/* ═══════ TAB 6: Guide ═══════ */
function GuideTab({ t }) {
    const steps = [
        { icon: '1️⃣', title: t('pnl.guideStep1Title'), desc: t('pnl.guideStep1Desc'), color: ACCENT },
        { icon: '2️⃣', title: t('pnl.guideStep2Title'), desc: t('pnl.guideStep2Desc'), color: GREEN },
        { icon: '3️⃣', title: t('pnl.guideStep3Title'), desc: t('pnl.guideStep3Desc'), color: '#eab308' },
        { icon: '4️⃣', title: t('pnl.guideStep4Title'), desc: t('pnl.guideStep4Desc'), color: '#a855f7' },
        { icon: '5️⃣', title: t('pnl.guideStep5Title'), desc: t('pnl.guideStep5Desc'), color: '#f97316' },
        { icon: '6️⃣', title: t('pnl.guideStep6Title'), desc: t('pnl.guideStep6Desc'), color: '#06b6d4' },
    ];
    const sections = [
        { icon: '🌊', name: t('pnl.tabOverview'), desc: t('pnl.guideSecOverview') },
        { icon: '📊', name: t('pnl.tabUnitPnl'), desc: t('pnl.guideSecUnit') },
        { icon: '🚨', name: t('pnl.tabAnomaly'), desc: t('pnl.guideSecAnomaly') },
        { icon: '📋', name: t('pnl.tabAction'), desc: t('pnl.guideSecAction') },
        { icon: '🔮', name: t('pnl.tabForecast'), desc: t('pnl.guideSecForecast') },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(79,142,247,0.06))', borderColor: RED + '40', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>📋</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('pnl.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 500, margin: '6px auto 0' }}>{t('pnl.guideSub')}</div>
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('pnl.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ background: s.color + '08', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '25'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('pnl.guideTabsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {sections.map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 12 }}>{n.name}</div>
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{n.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ ...CARD, background: 'rgba(34,197,94,0.05)', borderColor: GREEN + '30' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('pnl.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
                    <li>{t('pnl.guideTip1')}</li>
                    <li>{t('pnl.guideTip2')}</li>
                    <li>{t('pnl.guideTip3')}</li>
                    <li>{t('pnl.guideTip4')}</li>
                    <li>{t('pnl.guideTip5')}</li>
                </ul>
            </div>
        </div>
    );
}

/* ═══════════ MAIN ═══════════ */
export default function PnLDashboard() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const { pnlStats, settlementStats, budgetStats, orderStats, totalInventoryValue, lowStockCount, addAlert, isDemo } = useGlobalData();
    const { user, isAdmin } = useAuth(); // [현 차수] 구독플랜별 탭 노출(데모/관리자/Enterprise 전체)
    const _plan = (user && (user.plans || user.plan)) || 'free';
    const _tabVisible = (id) => (isDemo || isAdmin) ? true : tabAllowedByPlan(_plan, 'pnl', id);

    const [tab, setTab] = useState('overview');
    useSubtabPaintFix(tab);
    const [threats, setThreats] = useState([]);
    const [syncTick, setSyncTick] = useState(0);
    const [dateRange, setDateRange] = useState('30d');
    const bcRef = useRef(null);
    const connectedChannels = useConnectedChannels();
    const { connectedCount = 0 } = useConnectorSync?.() || {};

    /* ── BroadcastChannel 3CH ── */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch1 = new BroadcastChannel(tChannelName('genie_pnl_sync'));
        const ch2 = new BroadcastChannel(tChannelName('genie_connector_sync'));
        const ch3 = new BroadcastChannel(tChannelName('genie_product_sync'));
        const handler = () => setSyncTick(p => p + 1);
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED','CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); };
    }, []);
    useEffect(() => {
        const id = setInterval(() => {
            setSyncTick(p => p + 1);
            try { bcRef.current?.postMessage({ type: 'PNL_UPDATE', ts: Date.now() }); } catch {}
        }, 30000);
        return () => clearInterval(id);
    }, []);

    /* ── Security ── */
    const safeguard = useCallback((value, fieldName) => {
        const threat = secCheck(value);
        if (threat) {
            setThreats(prev => [...prev, { type: threat, value, field: fieldName, time: new Date().toLocaleTimeString() }]);
            try { addAlert({ id: `sec_pnl_${Date.now()}`, type: 'security', severity: 'critical', title: `🚨 [P&L] ${threat}`, body: `"${fieldName}": ${value.slice(0, 50)}`, timestamp: new Date().toISOString(), read: false }); } catch {}
            return '';
        }
        return value;
    }, [addAlert]);

    /* ── Live Data ── */
    const live = {
        grossRevenue: pnlStats.revenue || 0, adSpend: pnlStats.adSpend || 0,
        platformFee: pnlStats.platformFee || 0, couponDiscount: pnlStats.couponDiscount || 0,
        returnFee: pnlStats.returnFee || 0, cogs: pnlStats.cogs || 0,
        shippingCost: pnlStats.shippingCost || 0,
        grossProfit: pnlStats.grossProfit || 0, operatingProfit: pnlStats.operatingProfit || 0,
        netPayout: pnlStats.netPayout || 0, pendingPayout: settlementStats.pendingAmount || 0,
        roas: budgetStats.blendedRoas || 0,
        // 209차: 기존 orderStats.count + settlementStats.totalOrders 는 동일 주문을 이중계산
        //   (정산 rollup orders_count 는 channel_orders 파생) → 2배 + 반품률 분모 과대 → 알림 억제.
        //   매출과 동일하게 either/or(정산 우선, 없으면 주문수).
        totalOrders: (settlementStats.totalOrders || 0) > 0 ? settlementStats.totalOrders : (orderStats.count || 0),
        totalReturns: settlementStats.totalReturns || 0, returnRate: settlementStats.returnRate || 0,
    };

    const TABS = [
        { id: 'health', icon: '🩺', labelKey: 'pnl.tabHealth', descKey: 'pnl.descHealth' },
        { id: 'overview', icon: '🌊', labelKey: 'pnl.tabOverview', descKey: 'pnl.descOverview' },
        { id: 'pnl', icon: '📊', labelKey: 'pnl.tabUnitPnl', descKey: 'pnl.descUnitPnl' },
        { id: 'anomaly', icon: '🚨', labelKey: 'pnl.tabAnomaly', descKey: 'pnl.descAnomaly' },
        { id: 'action', icon: '📋', labelKey: 'pnl.tabAction', descKey: 'pnl.descAction' },
        { id: 'forecast', icon: '🔮', labelKey: 'pnl.tabForecast', descKey: 'pnl.descForecast' },
        { id: 'guide', icon: '📖', labelKey: 'pnl.tabGuide', descKey: 'pnl.descGuide' },
    ];

    const DATE_RANGES = [
        { key: 'today', label: t('pnl.dateToday') },
        { key: '7d', label: t('pnl.date7d') },
        { key: '30d', label: t('pnl.date30d') },
        { key: '90d', label: t('pnl.date90d') },
        { key: 'custom', label: t('pnl.dateCustom') },
    ];

    const handleExport = (format) => {
        const data = { format, date: new Date().toISOString(), dateRange, live };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `pnl_report_${Date.now()}.${format === 'excel' ? 'json' : format}`; a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
            <SecurityOverlay threats={threats} onDismiss={() => setThreats([])} t={t} />

            {/* Header */}
            <div style={{ flexShrink: 0, padding: '14px 16px 0', background: 'var(--surface-1, #070f1a)', zIndex: 10, borderBottom: '1px solid rgba(99,140,255,0.06)' }}>
                <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(79,142,247,0.05))', borderColor: 'rgba(239,68,68,0.15)', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div className="hero-meta">
                            <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.2),rgba(79,142,247,0.15))' }}>🌊</div>
                            <div>
                                <div className="hero-title" style={{ background: 'linear-gradient(135deg,#ef4444,#4f8ef7)' }}>{t('pnl.pageTitle')}</div>
                                <div className="hero-desc">{t('pnl.pageDesc')}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', color: GREEN }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, animation: 'pulse 2s infinite' }} /> {t('pnl.realtimeSync')}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: threats.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)', border: `1px solid ${threats.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`, color: threats.length > 0 ? RED : GREEN }}>
                            {threats.length > 0 ? '🔴' : '🟢'} {threats.length > 0 ? `${threats.length} ${t('pnl.threats')}` : t('pnl.securityNormal')}
                        </div>
                    </div>
                </div>
                </div>
                
                {/* Toolbar: Date Range + Export + Badges */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>📅 {t('pnl.dateRange')}:</span>
                    {DATE_RANGES.map(d => (
                        <button key={d.key} onClick={() => setDateRange(d.key)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid', fontSize: 10, fontWeight: 700, cursor: 'pointer', borderColor: dateRange === d.key ? ACCENT : 'rgba(255,255,255,0.1)', background: dateRange === d.key ? 'rgba(79,142,247,0.15)' : 'transparent', color: dateRange === d.key ? ACCENT : '#888' }}>{d.label}</button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => handleExport('pdf')} style={BTN('rgba(239,68,68,0.12)', RED)}>📄 PDF</button>
                    <button onClick={() => handleExport('excel')} style={BTN('rgba(34,197,94,0.12)', GREEN)}>📊 Excel</button>
                </div>
                
                {/* Badge Row */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>🔴 {t('pnl.liveRevenue')} {fmt(live.grossRevenue)}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>{t('pnl.badgeAdSpend')} {fmt(live.adSpend)}</span>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(79,142,247,0.12)', color: '#60a5fa', border: '1px solid rgba(79,142,247,0.25)' }}>{t('pnl.badgeSettlement')} {fmt(live.netPayout)}</span>
                    {connectedChannels.length > 0 && (
                        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>🔗 {connectedChannels.length} {t('pnl.channelsConnected')}</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button onClick={() => navigate('/budget-planner')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>💰 {t('pnl.linkBudget')}</button>
                    <button onClick={() => navigate('/wms')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>🏭 {t('pnl.linkInventory')}</button>
                    <button onClick={() => navigate('/kr-channel')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>⚖️ {t('pnl.linkRecon')}</button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="gx-subtab-bar" style={{ display: 'flex', gap: 2, background: 'var(--surface)', padding: '4px 4px 0', borderRadius: '12px 12px 0 0', border: '1px solid rgba(99,140,255,0.06)', borderBottom: 'none' }}>
                {TABS.filter(tb => _tabVisible(tb.id)).map(tb => (
                    <button key={tb.id} className={tab === tb.id ? "gx-on" : ""} onClick={() => setTab(tb.id)} style={{
                        flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer', textAlign: 'center', borderRadius: '8px 8px 0 0',
                        background: tab === tb.id ? 'rgba(79,142,247,0.1)' : 'transparent',
                        borderBottom: `2px solid ${tab === tb.id ? ACCENT : 'transparent'}`, transition: 'all 200ms' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.icon} {t(tb.labelKey)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{t(tb.descKey)}</div>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
                {tab === 'health' && <HealthTab live={live} t={t} fmt={fmt} />}
                {tab === 'overview' && <OverviewTab live={live} t={t} fmt={fmt} dateRange={dateRange} />}
                {tab === 'pnl' && <PnlUnitTab live={live} t={t} fmt={fmt} connectedChannels={connectedChannels} />}
                {tab === 'anomaly' && <AnomalyTab t={t} />}
                {tab === 'action' && <ActionTab t={t} />}
                {tab === 'forecast' && <ForecastTab live={live} t={t} fmt={fmt} />}
                {tab === 'guide' && <GuideTab t={t} />}
            </div>

            <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
    );
}
