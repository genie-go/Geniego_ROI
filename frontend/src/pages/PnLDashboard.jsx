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
import { getJsonAuth, postJsonAuth } from '../services/apiClient.js'; // [231차 OS#2] Root Cause: anomaly scan 보강(best-effort) / [H5] 보고통화 setter
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';

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
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>/ 100</div>
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
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: COL[m.status] + '22', color: COL[m.status] }}>{STL[m.status]}</span>
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
                                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: COL[m.status], color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
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
function OverviewTab({ live, pgSum, t, fmt, dateRange }) {
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
        // [240차] 인플루언서 비용 — 유일 누락 P&L 항목 보강. 실 지급액 있을 때만 표시(운영 실데이터/데모 격리).
        ...(live.influencerCost > 0 ? [{ label: t('pnl.wfInfluencer', '인플루언서 비용'), v: -live.influencerCost, col: '#a855f7' }] : []),
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
                <KpiCard label={t('pnl.kpiCogs')} value={fmt(live.cogs)} color="#a855f7" icon="📦"
                    sub={live.cogsUncostedUnits > 0 ? '⚠ ' + t('pnl.cogsUncosted', '원가 미등록') + ' ' + Number(live.cogsUncostedUnits).toLocaleString() : undefined}
                    alert={live.cogsUncostedUnits > 0} />
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

            {/* [정밀감사 C] PG 결제 정산(결제대행 수령액) — ★매출과 별도(현금 수령 기준). 데이터 있을 때만 표시. */}
            {pgSum && pgSum.count > 0 && (
                <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(99,102,241,0.05),rgba(79,142,247,0.03))', borderColor: 'rgba(99,102,241,0.18)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: '#818cf8' }}>💳 {t('pnl.pgTitle', '결제대행(PG) 정산')}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 12 }}>
                        {t('pnl.pgDesc', '결제대행(Stripe·Toss·PayPal 등)으로 실제 수령한 금액 — ★매출 합계와는 별도(판매 대금의 현금 수령 기준, 이중계산 방지).')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        <KpiCard label={t('pnl.pgGross', 'PG 결제총액')} value={fmt(pgSum.gross)} color="#818cf8" icon="💳" />
                        <KpiCard label={t('pnl.pgFee', 'PG 수수료')} value={fmt(pgSum.fee)} color={RED} icon="🏦" sub={pct(pgSum.fee, pgSum.gross)} />
                        <KpiCard label={t('pnl.pgNet', 'PG 실수령액')} value={fmt(pgSum.net)} color={GREEN} icon="✅" />
                        <KpiCard label={t('pnl.pgCount', 'PG 거래건수')} value={(pgSum.count || 0).toLocaleString() + ' ' + t('pnl.unitItems')} color={ACCENT} icon="🧾" />
                    </div>
                </div>
            )}
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
/* ═══════ TAB: Root Cause (231차 AI Profit OS #2 — 분석→처방) ═══════
   순이익 워터폴 분해(live=pnlStats, 무위험)로 '어느 비용이 순이익을 깎는가' 자동 진단 +
   채널별 이상점(AnomalyDetection scan, best-effort) 보강 + 권장조치를 기존 실행 페이지로 딥링크. */
function AnomalyTab({ t, live, fmt, navigate }) {
    const [anoms, setAnoms] = useState(null); // null=loading, []=none/unavailable
    useEffect(() => {
        let on = true;
        getJsonAuth('/api/v424/anomaly/scan?window=60')
            .then(d => { if (on) setAnoms(Array.isArray(d?.anomalies) ? d.anomalies : []); })
            .catch(() => { if (on) setAnoms([]); });
        return () => { on = false; };
    }, []);
    const rev = (live && live.grossRevenue) || 0;
    // 순이익 차감 비용 드라이버(워터폴 항목). amount 큰 순 = 순이익 최대 잠식.
    const DRIVERS = [
        { key: 'cogs', label: t('pnl.rcCogs', '원가(COGS)'), amt: live.cogs || 0, to: '/price-opt', act: t('pnl.rcActCogs', '가격 최적화 · 매입가 점검'), warn: 0.6 },
        { key: 'ad', label: t('pnl.rcAd', '광고비'), amt: live.adSpend || 0, to: '/auto-marketing', act: t('pnl.rcActAd', 'ROAS 낮은 채널 예산 회수'), warn: 0.3 },
        { key: 'fee', label: t('pnl.rcFee', '플랫폼 수수료'), amt: live.platformFee || 0, to: '/settlements', act: t('pnl.rcActFee', '저수수료 채널·정산 규칙 점검'), warn: 0.15 },
        { key: 'ship', label: t('pnl.rcShip', '배송비'), amt: live.shippingCost || 0, to: '/integration-hub', act: t('pnl.rcActShip', '무료배송 기준·택배사 단가 조정'), warn: 0.05 },
        { key: 'ret', label: t('pnl.rcRet', '반품비'), amt: live.returnFee || 0, to: '/returns-portal', act: t('pnl.rcActRet', '반품 사유 상위 SKU 점검'), warn: 0.05 },
        { key: 'coupon', label: t('pnl.rcCoupon', '쿠폰 할인'), amt: live.couponDiscount || 0, to: '/my-coupons', act: t('pnl.rcActCoupon', '쿠폰 발급 한도·중복 점검'), warn: 0.08 },
    ].filter(d => d.amt > 0).sort((a, b) => b.amt - a.amt);
    const top = DRIVERS[0];
    return (
        <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ ...CARD, background: 'rgba(236,72,153,0.05)', borderColor: 'rgba(236,72,153,0.25)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700 }}>🔍 {t('pnl.rcTitle', '순이익 원인 분석 (Root Cause)')}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.6 }}>
                    {top
                        ? <>{t('pnl.rcLead', '현재 순이익을 가장 크게 잠식하는 항목은')} <b style={{ color: '#ec4899' }}>{top.label}</b> {t('pnl.rcLead2', '입니다')} ({fmt(top.amt)}, {rev > 0 ? (top.amt / rev * 100).toFixed(1) : '0'}% {t('pnl.rcOfRev', '매출 대비')}).</>
                        : t('pnl.rcNone', '비용 데이터가 들어오면 원인 분해가 표시됩니다.')}
                </div>
            </div>

            {DRIVERS.length > 0 && (
                <div style={{ ...CARD }}>
                    <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>📉 {t('pnl.rcDrivers', '순이익 잠식 항목 (큰 순)')}</div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {DRIVERS.map((d, i) => {
                            const ratio = rev > 0 ? d.amt / rev : 0;
                            const col = ratio >= d.warn ? '#ef4444' : ratio >= d.warn * 0.7 ? '#eab308' : '#64748b';
                            return (
                                <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 4px', borderBottom: '1px solid var(--border,#f1f5f9)' }}>
                                    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: col, color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                                    <div style={{ minWidth: 110, fontWeight: 700, fontSize: 12.5 }}>{d.label}</div>
                                    <MiniBar v={d.amt} max={DRIVERS[0].amt} color={col} />
                                    <div style={{ width: 96, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: col }}>{fmt(d.amt)}</div>
                                    <div style={{ width: 48, textAlign: 'right', fontSize: 10.5, color: 'var(--text-3)' }}>{(ratio * 100).toFixed(1)}%</div>
                                    <button onClick={() => navigate(d.to)} style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#a855f7,#4f8ef7)', color: '#fff' }}>{d.act} →</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{ ...CARD }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>🚨 {t('pnl.rcChannelAnom', '채널별 이상 신호')} {anoms && anoms.length > 0 ? `(${anoms.length})` : ''}</div>
                {anoms === null && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t('pnl.loading', '불러오는 중…')}</div>}
                {anoms && anoms.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>✅ {t('pnl.rcNoAnom', '통계적 이상 신호가 없습니다(또는 데이터 부족).')}</div>}
                {anoms && anoms.slice(0, 8).map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border,#f1f5f9)' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: a.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)', color: a.severity === 'critical' ? '#ef4444' : '#b45309' }}>{a.severity === 'critical' ? '긴급' : '경계'}</span>
                        <b>{a.channel}</b>
                        <span style={{ color: 'var(--text-2)' }}>{a.metric_label || a.metric} {(a.direction === '하락' || a.direction === 'down' || a.bad === 'down') ? '↓' : '↑'} {a.reason || a.message || ''}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════ TAB: Action (231차 OS#2) — 기존 승인 플로우(/approvals)로 연결 ═══════ */
function ActionTab({ t, navigate }) {
    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', padding: '8px 12px', borderRadius: 8, background: 'rgba(99,140,255,0.04)', border: '1px solid rgba(99,140,255,0.1)' }}>
                💡 {t('pnl.actionDesc')}
            </div>
            <div style={{ ...CARD, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t('pnl.actionHubTitle', '실행 승인 센터에서 관리하세요')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, marginBottom: 14 }}>{t('pnl.actionHubDesc', '원인 분석에서 도출된 조치는 승인 센터에서 승인·실행·추적됩니다(폐쇄 루프).')}</div>
                <button onClick={() => navigate('/approvals')} style={{ fontSize: 13, fontWeight: 800, padding: '9px 20px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>{t('pnl.actionGoApprovals', '실행 승인 센터 열기')} →</button>
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
                                <div style={{ fontSize: 10, color: mc, fontWeight: 700 }}>{r.margin}%</div>
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
    // [현 차수 P1] ★비율 초기값을 live(SSOT) 실비율에서 파생 — 기존 하드코딩(ad12·fee10·ret8, COGS 아예 없음)은
    //   같은 페이지 Overview 영업이익률과 3배 자기모순을 냈다. 특히 최대비용 COGS 누락이 순이익을 대폭 과대계상.
    const _gr = live.grossRevenue || 0;
    const _pct = (v) => (_gr > 0 ? Math.round((v || 0) / _gr * 1000) / 10 : 0);
    const [cogsRatio, setCogsRatio] = useState(() => _pct(live.cogs) || 45);
    const [adRatio, setAdRatio] = useState(() => _pct(live.adCost) || 12);
    const [feeRatio, setFeeRatio] = useState(() => _pct(live.fees ?? live.settlementFee) || 10);
    const [returnRatePct, setReturnRatePct] = useState(() => _pct(live.returnCost ?? live.returns) || 8);
    const [months, setMonths] = useState(6);
    // [231차 OS#3] What-if Scenario — 실제 워터폴(live) 기준 ±% 레버. 기본 0=baseline 동일(무서프라이즈).
    const [scRev, setScRev] = useState(0);   // 매출/판매량
    const [scAd, setScAd] = useState(0);     // 광고비
    const [scCogs, setScCogs] = useState(0); // 원가
    const [scShip, setScShip] = useState(0); // 배송비
    const [scRet, setScRet] = useState(0);   // 반품비

    const baseRevenue = live.grossRevenue || 0;
    const forecastRows = Array.from({ length: months }, (_, i) => {
        const m = i + 1;
        const revenue = Math.round(baseRevenue * Math.pow(1 + growthRate / 100, m / 12));
        const cogs = Math.round(revenue * cogsRatio / 100); // [현 차수 P1] 최대비용 원가 반영
        const adCost = Math.round(revenue * adRatio / 100);
        const fees = Math.round(revenue * feeRatio / 100);
        const returns = Math.round(revenue * returnRatePct / 100);
        const netProfit = revenue - cogs - adCost - fees - returns;
        const margin = revenue > 0 ? (netProfit / revenue * 100).toFixed(1) : "0.0";
        return { m, revenue, cogs, adCost, fees, returns, netProfit, margin };
    });
    const totalFR = forecastRows.reduce((s, r) => s + r.revenue, 0);
    const totalFP = forecastRows.reduce((s, r) => s + r.netProfit, 0);

    const slider = (labelKey, val, set, min, max, unit = '%', fb) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-3)' }}>{fb ? t(labelKey, fb) : t(labelKey)}</span>
                <strong style={{ color: ACCENT }}>{val}{unit}</strong>
            </div>
            <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: ACCENT }} />
        </div>
    );

    // [231차 OS#3] 시나리오 재계산 — 매출변동=판매량 변동 가정(변동비 비례) + 레버별 ±%.
    const bRev = live.grossRevenue || 0, vf = 1 + scRev / 100;
    const sc = {
        rev: bRev * vf,
        cogs: (live.cogs || 0) * vf * (1 + scCogs / 100),
        ad: (live.adSpend || 0) * (1 + scAd / 100),
        fee: (live.platformFee || 0) * vf,
        coupon: (live.couponDiscount || 0) * vf,
        ret: (live.returnFee || 0) * vf * (1 + scRet / 100),
        ship: (live.shippingCost || 0) * vf * (1 + scShip / 100),
        infl: (live.influencerCost || 0), // [현 차수 P2] 인플루언서비용 — 무변동에서 baseline 델타≠0 이던 원인
    };
    const scOp = sc.rev - sc.cogs - sc.ad - sc.fee - sc.coupon - sc.ret - sc.ship - sc.infl;
    const baseOp = live.operatingProfit || 0;
    const dOp = scOp - baseOp;
    const dPct = baseOp !== 0 ? (dOp / Math.abs(baseOp) * 100) : 0;
    const scMargin = sc.rev > 0 ? (scOp / sc.rev * 100) : 0;
    const dirty = scRev || scAd || scCogs || scShip || scRet;
    const scSlider = (label, val, set, min, max) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-3)' }}>{label}</span>
                <strong style={{ color: val > 0 ? RED : val < 0 ? GREEN : 'var(--text-2)' }}>{val > 0 ? '+' : ''}{val}%</strong>
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

            {/* [231차 OS#3] What-if Scenario Builder — 현재 순이익 기준 시나리오 영향 */}
            <div style={{ ...CARD, background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.25)' }}>
                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 2 }}>🧪 {t('pnl.whatifTitle', 'What-if 시나리오 (순이익 영향)')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>{t('pnl.whatifDesc', '현재 실적 기준으로 각 레버를 조정하면 순이익이 어떻게 변하는지 즉시 계산됩니다.')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(220px,300px)', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: 9 }}>
                        {scSlider(t('pnl.whatifRev', '매출/판매량'), scRev, setScRev, -30, 30)}
                        {scSlider(t('pnl.whatifAd', '광고비'), scAd, setScAd, -50, 50)}
                        {scSlider(t('pnl.whatifCogs', '원가(COGS)'), scCogs, setScCogs, -20, 20)}
                        {scSlider(t('pnl.whatifShip', '배송비'), scShip, setScShip, -40, 40)}
                        {scSlider(t('pnl.whatifRet', '반품비'), scRet, setScRet, -50, 50)}
                        {dirty ? <button onClick={() => { setScRev(0); setScAd(0); setScCogs(0); setScShip(0); setScRet(0); }} style={{ justifySelf: 'start', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, border: '1px solid var(--border,#cbd5e1)', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)' }}>{t('pnl.whatifReset', '초기화')}</button> : null}
                    </div>
                    <div style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: 'var(--card)', border: `2px solid ${dOp >= 0 ? GREEN : RED}` }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.whatifBase', '현재 순이익')}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>{fmt(baseOp)}</div>
                        <div style={{ fontSize: 20, margin: '4px 0', color: dOp >= 0 ? GREEN : RED }}>{dOp >= 0 ? '▲' : '▼'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.whatifScenario', '시나리오 순이익')}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: dOp >= 0 ? GREEN : RED }}>{fmt(scOp)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: dOp >= 0 ? GREEN : RED, marginTop: 4 }}>{dOp >= 0 ? '+' : ''}{fmt(dOp)} ({dOp >= 0 ? '+' : ''}{dPct.toFixed(1)}%)</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{t('pnl.whatifMargin', '시나리오 마진')} {scMargin.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            {/* 204차: 파라미터 박스 확대(좌)+월별추이 그래프를 파라미터 아래 배치, 표는 우측 — 그래프/숫자 박스 이탈 해소·균형 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 400px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
                {/* 좌: 파라미터 설정 + 누적 요약 + 월별 추이 그래프(파라미터 박스 아래) */}
                <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
                <div style={{ padding: 16, borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', display: 'grid', gap: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t('pnl.paramSettings')}</div>
                    {slider('pnl.paramGrowth', growthRate, setGrowthRate, 0, 50)}
                    {slider('pnl.paramCogsRatio', cogsRatio, setCogsRatio, 0, 90, '%', 'COGS %')}
                    {slider('pnl.paramAdRatio', adRatio, setAdRatio, 5, 30)}
                    {slider('pnl.paramFeeRate', feeRatio, setFeeRatio, 5, 20)}
                    {slider('pnl.paramReturnRate', returnRatePct, setReturnRatePct, 2, 20)}
                    {slider('pnl.paramPeriod', months, setMonths, 3, 12, 'M')}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                        <div style={{ textAlign: 'center', padding: 12, background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastRevenue')}</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: GREEN }}>{fmt(totalFR)}</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 12, background: 'rgba(79,142,247,0.08)', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastProfit')}</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: totalFP > 0 ? ACCENT : RED }}>{fmt(totalFP)}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('pnl.forecastAvgMargin', '예측 평균 마진율')}</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: totalFR > 0 && (totalFP / totalFR * 100) >= 8 ? GREEN : '#f59e0b' }}>{totalFR > 0 ? (totalFP / totalFR * 100).toFixed(1) : '0.0'}%</div>
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

/* ═══════ TAB: VAT Settlement + Reporting Currency (v424 서버 P&L 부가세 엔진) ═══════
   서버 SSOT(/api/v424/pnl/vat)에서 매출세액·매입세액·납부세액(환급)·과세기간을 노출하고,
   보고통화 지표(/api/v424/pnl → reporting / by_currency)로 KRW 기준 환산 표기를 명시.
   세션 셀프인증(getJsonAuth). 빈/제로 응답은 안내로 gracefully 처리(무위험·기존 P&L 뷰 불변). */
function VatTab({ t, fmt, isAdmin }) {
    const [vat, setVat] = useState(null);   // null=loading, 객체=데이터(빈 {} 포함)
    const [rep, setRep] = useState(null);   // reporting / by_currency
    const [err, setErr] = useState(false);
    const [savingCur, setSavingCur] = useState(false); // [H5] 보고통화 저장 중
    const loadRep = useCallback(() => {                 // [H5] 보고통화 setter 후 재조회
        return getJsonAuth('/api/v424/pnl')
            .then(d => { setRep(d && typeof d === 'object' ? d : {}); })
            .catch(() => { setRep({}); });
    }, []);
    useEffect(() => {
        let on = true;
        getJsonAuth('/api/v424/pnl/vat')
            .then(d => { if (on) setVat(d && typeof d === 'object' ? d : {}); })
            .catch(() => { if (on) { setVat({}); setErr(true); } });
        getJsonAuth('/api/v424/pnl')
            .then(d => { if (on) setRep(d && typeof d === 'object' ? d : {}); })
            .catch(() => { if (on) setRep({}); });
        return () => { on = false; };
    }, []);

    if (vat === null) {
        return <div style={{ ...CARD, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>{t('pnl.loading', '불러오는 중…')}</div>;
    }

    const num = (v) => Number(v || 0);
    const outputVat = num(vat.output_vat ?? vat.outputVat);
    const inputVat = num(vat.input_vat ?? vat.inputVat);
    const netVat = (vat.net_vat_payable ?? vat.netVatPayable) != null ? num(vat.net_vat_payable ?? vat.netVatPayable) : (outputVat - inputVat);
    const isRefund = netVat < 0;
    const taxablePeriod = vat.taxable_period || vat.taxablePeriod || '';
    const monthly = Array.isArray(vat.monthly) ? vat.monthly : (Array.isArray(vat.monthly_buckets) ? vat.monthly_buckets : []);
    const paddleMor = vat.paddle_mor || vat.paddleMor || null;
    const hasVat = outputVat !== 0 || inputVat !== 0 || monthly.length > 0;

    // 보고통화 지표(KRW base → reporting 환산). 내부 집계는 KRW SSOT 불변 — 본 패널만 환산 표기.
    const reporting = (rep && rep.reporting) || {};
    const repCurrency = reporting.currency || 'KRW';
    const rateKrwPerUnit = Number(reporting.fx_krw_per_unit || 0);
    const isConverted = !!repCurrency && repCurrency !== 'KRW'; // 비-KRW 보고통화일 때만 환산 뷰 노출
    // 보고통화 금액 포매터(통화코드 접미). fmt(KRW)와 구분해 별도 표기(앱 전역 KRW 표시는 불변).
    const fmtRep = (v) => `${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${repCurrency}`;
    const repRows = isConverted ? [
        { k: t('pnl.colRevenue', '매출'), v: reporting.revenue, base: rep && rep.revenue, color: ACCENT },
        { k: t('pnl.kpiCogs', '매출원가'), v: reporting.cogs, base: rep && rep.cogs, color: '#a855f7' },
        { k: t('pnl.kpiGrossProfit', '매출총이익'), v: reporting.grossProfit, base: rep && rep.grossProfit, color: GREEN },
        { k: t('pnl.kpiAdSpend', '광고비'), v: reporting.adSpend, base: rep && rep.adSpend, color: '#f97316' },
        { k: t('pnl.kpiOperatingProfit', '영업이익'), v: reporting.operatingProfit, base: rep && rep.operatingProfit, color: GREEN },
        { k: t('pnl.kpiNetProfit', '순이익'), v: reporting.netProfit, base: rep && rep.netProfit, color: GREEN },
    ] : [];
    const byCurrencyRaw = rep && rep.by_currency;
    const byCurrency = Array.isArray(byCurrencyRaw)
        ? byCurrencyRaw
        : (byCurrencyRaw && typeof byCurrencyRaw === 'object'
            ? Object.entries(byCurrencyRaw).map(([currency, v]) => (typeof v === 'object' && v ? { currency, ...v } : { currency, amount: v }))
            : []);

    // [H5] 보고통화 변경 → setter EP 영속 후 summary 재조회(환산 뷰 갱신). 내부 KRW 집계엔 무영향.
    const CUR_OPTS = ['KRW', 'USD', 'EUR', 'JPY', 'CNY', 'GBP', 'SGD', 'HKD', 'AUD', 'TWD', 'THB', 'VND'];
    const changeReportingCurrency = async (next) => {
        const cur = String(next || '').toUpperCase();
        if (!cur || cur === repCurrency || savingCur) return;
        setSavingCur(true);
        try {
            await postJsonAuth('/api/v424/pnl/reporting-currency', { currency: cur });
            await loadRep();
        } catch (e) { /* 실패 시 기존 보고통화 유지(무회귀) */ }
        finally { setSavingCur(false); }
    };

    const netCol = isRefund ? GREEN : RED;

    return (
        <div style={{ display: 'grid', gap: 16 }}>
            {/* 보고통화 지표 — 내부 집계는 KRW SSOT(불변), 본 패널만 보고통화로 환산 표기 */}
            <div style={{ ...CARD, display: 'grid', gap: 14, background: 'rgba(79,142,247,0.05)', borderColor: 'rgba(79,142,247,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20 }}>💱</span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.reporting.currency', '보고통화')}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT }}>{repCurrency}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
                            {isConverted
                                ? `${t('pnl.reporting.fxNote', 'KRW 기준 환산 표기')} · 1 ${repCurrency} ≈ ${rateKrwPerUnit ? rateKrwPerUnit.toLocaleString() : '—'} KRW`
                                : t('pnl.reporting.fxNote', 'KRW 기준 환산 표기')}
                        </div>
                    </div>
                    {/* [H5] 보고통화 선택 — setter EP 호출 후 재조회. 앱 전역 KRW 표시엔 무영향(본 패널 한정). */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>
                        {t('pnl.reporting.select', '보고통화 선택')}
                        <select
                            value={repCurrency}
                            disabled={savingCur || !rep}
                            onChange={(e) => changeReportingCurrency(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: savingCur ? 'wait' : 'pointer' }}>
                            {Array.from(new Set([repCurrency, ...CUR_OPTS])).map(cur => (
                                <option key={cur} value={cur}>{cur}</option>
                            ))}
                        </select>
                        {savingCur && <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{t('pnl.loading', '불러오는 중…')}</span>}
                    </label>
                    {byCurrency.length > 0 && (
                        <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-3)' }}>
                                        <th style={{ padding: '4px 10px', textAlign: 'left', fontWeight: 700 }}>{t('pnl.colChannel', '통화')}</th>
                                        <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 700 }}>{t('pnl.kpiAdSpend', '광고비')}</th>
                                        <th style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 700 }}>KRW</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byCurrency.map((c, i) => (
                                        <tr key={c.currency || i} style={{ borderTop: '1px solid var(--border)' }}>
                                            <td style={{ padding: '4px 10px', fontWeight: 700 }}>{c.currency || '—'}</td>
                                            <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace' }}>{Number(c.amount ?? c.adSpendKrw ?? 0).toLocaleString()}</td>
                                            <td style={{ padding: '4px 10px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-2)' }}>{fmt(Number(c.krwEquivalent ?? c.adSpendKrw ?? 0))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* [H5] 보고통화 환산 손익 — 비-KRW 보고통화일 때만. KRW base 병기(무회귀·본 패널 한정). */}
                {isConverted && repRows.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
                            🌐 {t('pnl.reporting.convertedTitle', '보고통화 환산 손익')} ({repCurrency}) · {t('pnl.reporting.baseNote', 'KRW 기준 병기')}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                            {repRows.map((r) => (
                                <div key={r.k} style={{ ...CARD, padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{r.k}</div>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: r.color, marginTop: 3, fontFamily: 'monospace' }}>{fmtRep(r.v)}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontFamily: 'monospace' }}>{fmt(Number(r.base || 0))}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* VAT Settlement */}
            <div style={{ ...CARD }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>🧾 {t('pnl.vat.title', '부가세 정산')}</div>
                    {taxablePeriod && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: 'rgba(79,142,247,0.12)', color: ACCENT }}>
                            {t('pnl.vat.taxablePeriod', '과세기간')}: {taxablePeriod}
                        </span>
                    )}
                </div>

                {err && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>⚠ {t('pnl.rcNone', '데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.')}</div>
                )}
                {!err && !hasVat && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                        {t('pnl.vat.taxablePeriod', '과세기간')} {taxablePeriod || '—'} · {t('pnl.forecastChartEmpty', '거래 데이터가 들어오면 부가세 정산 내역이 표시됩니다.')}
                    </div>
                )}

                {!err && hasVat && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginTop: 12 }}>
                        <KpiCard label={t('pnl.vat.outputVat', '매출세액')} value={fmt(outputVat)} color={ACCENT} icon="📤" />
                        <KpiCard label={t('pnl.vat.inputVat', '매입세액')} value={fmt(inputVat)} color="#a855f7" icon="📥" />
                        <KpiCard
                            label={isRefund ? t('pnl.vat.netPayable', '납부세액(환급)') + ' · ' + t('pnl.vat.taxablePeriod', '환급') : t('pnl.vat.netPayable', '납부세액(환급)')}
                            value={(isRefund ? '▲ ' : '') + fmt(Math.abs(netVat))}
                            color={netCol} icon={isRefund ? '💚' : '🏦'} />
                    </div>
                )}
            </div>

            {/* 월별 과세기간 버킷 */}
            {monthly.length > 0 && (
                <div style={{ ...CARD }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📆 {t('pnl.vat.taxablePeriod', '과세기간')} · {t('pnl.forecastChartTitle', '월별 내역')}</div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 480 }}>
                            <thead>
                                <tr style={{ background: 'rgba(79,142,247,0.08)' }}>
                                    <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.colMonth', '월')}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.vat.outputVat', '매출세액')}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.vat.inputVat', '매입세액')}</th>
                                    <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-3)', fontWeight: 700 }}>{t('pnl.vat.netPayable', '납부세액(환급)')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthly.map((m, i) => {
                                    const mo = num(m.output_vat ?? m.outputVat);
                                    const mi = num(m.input_vat ?? m.inputVat);
                                    const mn = (m.net_vat_payable ?? m.netVatPayable) != null ? num(m.net_vat_payable ?? m.netVatPayable) : (mo - mi);
                                    return (
                                        <tr key={m.month || m.period || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '8px 10px', fontWeight: 700 }}>{m.month || m.period || m.label || '—'}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: ACCENT }}>{fmt(mo)}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#a855f7' }}>{fmt(mi)}</td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: mn < 0 ? GREEN : RED }}>{fmt(mn)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 관리자 전용: Paddle MoR 송금 뷰 */}
            {isAdmin && paddleMor && (
                <div style={{ ...CARD, background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#818cf8' }}>🌐 Paddle MoR {t('pnl.vat.netPayable', '송금(Remittance)')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        {Object.entries(paddleMor).filter(([, v]) => typeof v !== 'object').map(([k, v]) => (
                            <div key={k} style={{ ...CARD, padding: '12px 14px' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{k}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)', marginTop: 3 }}>{typeof v === 'number' ? fmt(v) : String(v)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
    const { fmt, currency, convert } = useCurrency(); // [283차 P1] 내보내기에 표시통화·환산값 동봉
    const navigate = useNavigate();
    const { pnlStats, settlementStats, budgetStats, orderStats, orders, totalInventoryValue, lowStockCount, addAlert, isDemo } = useGlobalData();
    const { user, isAdmin } = useAuth(); // [현 차수] 구독플랜별 탭 노출(데모/관리자/Enterprise 전체)
    const _plan = (user && (user.plans || user.plan)) || 'free';
    const _tabVisible = (id) => (isDemo || isAdmin) ? true : tabAllowedByPlan(_plan, 'pnl', id);

    const [tab, setTab] = useState('overview');
    useSubtabPaintFix(tab);
    const [threats, setThreats] = useState([]);
    const [syncTick, setSyncTick] = useState(0);
    const [dateRange, setDateRange] = useState('30d');
    // [정밀감사 C] PG 결제 정산(결제대행 수령액) de-silo — 그동안 pg_settlement 이 PgConfig 페이지에만 보이고
    //   통합 P&L 엔 미노출이던 사일로 해소. ★매출에 합산하지 않음: PG gross 는 '판매 대금의 현금 수령'이지
    //   추가 매출이 아니며, 자사몰 주문이 channel_orders 에도 적재되면 이중계산되므로, 별도 '수령액' 라인으로만 표시.
    //   운영 전용·데이터 있을 때만(count>0).
    const [pgSum, setPgSum] = useState(null);
    useEffect(() => {
        if (isDemo) { setPgSum(null); return; }
        let cancelled = false;
        getJsonAuth('/api/v427/pg/settlements')
            .then(r => {
                // [266차 계약불일치·머니표면] 백엔드는 count/gross/fee/net 을 summary 하위로 반환(루트엔 ok/settlements/summary)
                //   → 루트 r.count 는 undefined 라 게이트 항상 false 로 PG정산 카드가 운영서 미표시였다. summary 우선.
                const sm = (r && r.summary && typeof r.summary === 'object') ? r.summary : (r || {});
                if (!cancelled && r && r.ok && (Number(sm.count) || 0) > 0) {
                    setPgSum({ count: Number(sm.count) || 0, gross: Number(sm.gross) || 0, fee: Number(sm.fee) || 0, net: Number(sm.net) || 0 });
                } else if (!cancelled) setPgSum(null);
            })
            .catch(() => { if (!cancelled) setPgSum(null); });
        return () => { cancelled = true; };
    }, [isDemo, syncTick]);
    const bcRef = useRef(null);
    const connectedChannels = useConnectedChannels();
    const { connectedCount = 0 } = useConnectorSync?.() || {};

    /* ── BroadcastChannel 3CH ── */
    useEffect(() => {
        if (typeof BroadcastChannel === 'undefined') return;
        const ch1 = new BroadcastChannel(tChannelName('genie_pnl_sync'));
        bcRef.current = ch1; // [259차] 크로스탭 하트비트 발신 채널 배선(과거 bcRef 미할당→postMessage 영구 no-op)
        const ch2 = new BroadcastChannel(tChannelName('genie_connector_sync'));
        const ch3 = new BroadcastChannel(tChannelName('genie_product_sync'));
        const handler = () => setSyncTick(p => p + 1);
        ch1.onmessage = handler;
        ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED','CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
        ch3.onmessage = handler;
        return () => { ch1.close(); ch2.close(); ch3.close(); bcRef.current = null; };
    }, []);
    useEffect(() => {
        const id = setInterval(() => {
            setSyncTick(p => p + 1);
            try { bcRef.current?.postMessage({ type: 'PNL_UPDATE', ts: Date.now() }); } catch { /* 실패 무시(best-effort) */ }
        }, 30000);
        return () => clearInterval(id);
    }, []);

    /* ── Security ── */
    const safeguard = useCallback((value, fieldName) => {
        const threat = secCheck(value);
        if (threat) {
            setThreats(prev => [...prev, { type: threat, value, field: fieldName, time: new Date().toLocaleTimeString() }]);
            try { addAlert({ id: `sec_pnl_${Date.now()}`, type: 'security', severity: 'critical', title: `🚨 [P&L] ${threat}`, body: `"${fieldName}": ${value.slice(0, 50)}`, timestamp: new Date().toISOString(), read: false }); } catch { /* 알림/감사 훅 실패 무시(best-effort) */ }
            return '';
        }
        return value;
    }, [addAlert]);

    /* ── [현 차수] 기간(dateRange) 실스코프 계수 — 죽은선택자 수정 ──
       버그: dateRange(today/7d/30d/90d) 선택이 live 어디에도 적용 안 됨(전체 누적 불변).
       수정: 주문 atISO(파싱가능 ISO) 기준 윈도우 내 매출비중을 계수로 → 금액라인 비례 스코프(대시보드 dashPeriod 동일 원칙).
       비율(ROAS·반품률)은 분자·분모 동률 스케일이라 보존. custom/90d≥데이터스팬이면 계수≈1(누적 보존). */
    const _drDays = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
    const periodFactor = useMemo(() => {
        const days = _drDays[dateRange]; if (!days) return 1; // custom/미지정 → 전체
        const cutoff = Date.now() - days * 86400000;
        const od = (o) => { const c = o.atISO || o.created_at || o.ordered_at || (o.month ? o.month + '-01' : null); if (!c) return null; const d = new Date(c); return isNaN(d.getTime()) ? null : d; };
        let tot = 0, win = 0;
        (orders || []).forEach(o => { if (/cancel|취소/i.test(String(o.status || ''))) return; const rev = Number(o.total ?? o.total_price ?? o.revenue ?? 0); tot += rev; const d = od(o); if (d && d.getTime() >= cutoff) win += rev; });
        return tot > 0 ? Math.min(1, win / tot) : 1;
    }, [orders, dateRange]);
    // [현 차수 P2] ★주문 '건수' 전용 기간계수 — 금액계수(매출가중)를 건수에 곱하면 고단가 주문이 많은 윈도우에서
    //   건수가 과대/과소됐다(50건인데 매출비중 0.3→1000×0.3=300). 건수는 윈도우 실건수 비율로 스코프.
    const periodOrderFactor = useMemo(() => {
        const days = _drDays[dateRange]; if (!days) return 1;
        const cutoff = Date.now() - days * 86400000;
        const od = (o) => { const c = o.atISO || o.created_at || o.ordered_at || (o.month ? o.month + '-01' : null); if (!c) return null; const d = new Date(c); return isNaN(d.getTime()) ? null : d; };
        let tot = 0, win = 0;
        (orders || []).forEach(o => { if (/cancel|취소/i.test(String(o.status || ''))) return; tot += 1; const d = od(o); if (d && d.getTime() >= cutoff) win += 1; });
        return tot > 0 ? Math.min(1, win / tot) : 1;
    }, [orders, dateRange]);

    /* ── Live Data ── */
    const live = (() => {
        const f = periodFactor;
        const sc = (v) => Math.round((Number(v) || 0) * f); // 금액·건수 비례 스코프
        return {
            grossRevenue: sc(pnlStats.revenue), adSpend: sc(pnlStats.adSpend),
            platformFee: sc(pnlStats.platformFee), couponDiscount: sc(pnlStats.couponDiscount),
            returnFee: sc(pnlStats.returnFee), cogs: sc(pnlStats.cogs),
            shippingCost: sc(pnlStats.shippingCost), influencerCost: sc(pnlStats.influencerCost), // [240차] 인플루언서 비용 P&L 라인

            grossProfit: sc(pnlStats.grossProfit), operatingProfit: sc(pnlStats.operatingProfit),
            netPayout: sc(pnlStats.netPayout), pendingPayout: sc(settlementStats.pendingAmount),
            roas: budgetStats.blendedRoas || 0, // 비율(전기간 집계 — 윈도우별 지출 데이터 부재로 재계산 불가)
            // [현 차수 P2] 주문/반품 건수는 '건수 계수'(periodOrderFactor)로 스코프 — 금액계수 곱하던 왜곡 수정.
            totalOrders: Math.round(((settlementStats.totalOrders || 0) > 0 ? settlementStats.totalOrders : (orderStats.count || 0)) * periodOrderFactor),
            totalReturns: Math.round((settlementStats.totalReturns || 0) * periodOrderFactor), returnRate: settlementStats.returnRate || 0, // 반품률=전기간 비율
            periodScoped: !!_drDays[dateRange], // [현 차수 P2] 기간뷰 여부(ROAS/반품률은 전기간 배지 표기용)
        };
    })();

    const TABS = [
        { id: 'health', icon: '🩺', labelKey: 'pnl.tabHealth', descKey: 'pnl.descHealth' },
        { id: 'overview', icon: '🌊', labelKey: 'pnl.tabOverview', descKey: 'pnl.descOverview' },
        { id: 'pnl', icon: '📊', labelKey: 'pnl.tabUnitPnl', descKey: 'pnl.descUnitPnl' },
        { id: 'anomaly', icon: '🚨', labelKey: 'pnl.tabAnomaly', descKey: 'pnl.descAnomaly' },
        { id: 'action', icon: '📋', labelKey: 'pnl.tabAction', descKey: 'pnl.descAction' },
        { id: 'vat', icon: '🧾', labelKey: 'pnl.vat.title', descKey: 'pnl.reporting.fxNote', labelFb: '부가세 정산', descFb: 'KRW 기준 환산 표기' },
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

    /* ── [283차 P1] P&L 내보내기 실구현 ─────────────────────────────────────────────
     * 종전 handleExport 는 손익 행이 아니라 {format,date,dateRange,live} 스냅샷 JSON 을 Blob 으로 만들어
     *   `.pdf` 확장자로 저장했다 → 어떤 뷰어에서도 열리지 않는 손상 파일(excel 은 확장자마저 .json).
     * 수정: ①실제 손익계산서 행을 산출(pnlRows) ②Excel = xlsx 실파일(커머스 페이지와 동일 패턴·중복 라이브러리 0)
     *       ③PDF = 브라우저 print-to-PDF(@media print + 인쇄 전용 표) — 가짜 포맷 버튼은 남기지 않는다.
     * 값 출처는 화면과 동일한 `live`(SSOT) 이므로 화면-파일 불일치가 원천적으로 없다.
     */
    const pnlRows = useMemo(() => {
        const R = (label, amount, kind = 'cost') => ({ label, amount: Number(amount) || 0, kind });
        return [
            R(t('pnl.exRevenue', '매출'), live.grossRevenue, 'revenue'),
            R(t('pnl.exCogs', '매출원가(COGS)'), -(live.cogs || 0)),
            R(t('pnl.exGrossProfit', '매출총이익'), live.grossProfit, 'subtotal'),
            R(t('pnl.exAdSpend', '광고비'), -(live.adSpend || 0)),
            R(t('pnl.exPlatformFee', '플랫폼 수수료'), -(live.platformFee || 0)),
            R(t('pnl.exCoupon', '쿠폰 할인'), -(live.couponDiscount || 0)),
            R(t('pnl.exReturnFee', '반품 비용'), -(live.returnFee || 0)),
            R(t('pnl.exShipping', '배송비'), -(live.shippingCost || 0)),
            R(t('pnl.exInfluencer', '인플루언서 비용'), -(live.influencerCost || 0)),
            R(t('pnl.exOperatingProfit', '영업이익'), live.operatingProfit, 'total'),
        ];
    }, [live, t]);

    // 참고지표(손익 행이 아닌 보조 KPI) — 별도 시트/섹션으로 분리해 손익합계를 오염시키지 않는다.
    const pnlKpis = useMemo(() => ([
        { label: 'ROAS', value: `${Number(live.roas || 0).toFixed(2)}x` },
        { label: t('pnl.exOrders', '주문 수'), value: String(live.totalOrders || 0) },
        { label: t('pnl.exReturns', '반품 수'), value: String(live.totalReturns || 0) },
        { label: t('pnl.exReturnRate', '반품률'), value: `${Number(live.returnRate || 0).toFixed(1)}%` },
        { label: t('pnl.exNetPayout', '정산 수령액'), value: fmt(live.netPayout) },
        { label: t('pnl.exPendingPayout', '미수 정산금'), value: fmt(live.pendingPayout) },
    ]), [live, t, fmt]);

    const exportMeta = () => {
        const rangeLabel = (DATE_RANGES.find(d => d.key === dateRange) || {}).label || dateRange;
        return { rangeLabel, generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') };
    };

    // Excel — xlsx 실파일(PriceOpt/CatalogSync/OrderHub 와 동일한 동적 import 패턴).
    const exportExcel = async () => {
        try {
            const mod = await import('xlsx');
            const XLSX = mod.default || mod;
            const { rangeLabel, generatedAt } = exportMeta();
            const code = currency?.code || 'KRW';
            const head = [t('pnl.exItem', '항목'), 'KRW', code, t('pnl.exType', '구분')];
            const body = pnlRows.map(r => [r.label, r.amount, Number(convert(r.amount).toFixed(2)), r.kind]);
            const aoa = [
                [t('pnl.exTitle', '손익계산서 (P&L)')],
                [t('pnl.exPeriod', '기간'), rangeLabel, t('pnl.exGenerated', '생성일시'), generatedAt],
                [],
                head, ...body,
                [],
                [t('pnl.exKpiSection', '참고 지표')],
                ...pnlKpis.map(k => [k.label, k.value]),
            ];
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'PnL');
            XLSX.writeFile(wb, `PnL_${dateRange}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (e) {
            // 정직: 실패를 조용히 삼키지 않는다(종전엔 손상 파일이 '성공'처럼 다운로드됐다).
            addAlert && addAlert({ type: 'error', message: t('pnl.exFailed', '내보내기에 실패했습니다') + ': ' + String(e?.message || e) });
        }
    };

    // PDF — 브라우저 print-to-PDF. 인쇄 전용 표(.pnl-print) 만 출력되도록 @media print 로 나머지를 숨긴다.
    const exportPdf = () => { if (typeof window !== 'undefined') window.print(); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
            <SecurityOverlay threats={threats} onDismiss={() => setThreats([])} t={t} />

            {/* [283차 P1] 인쇄(PDF) 전용 손익계산서 — 화면에서는 숨김(.pnl-print{display:none}), 인쇄 시에만 노출.
                position:fixed 로 조상(overflow:hidden·height:100vh)의 클리핑을 회피한다. 표가 짧아 1페이지에 수록된다. */}
            <style>{`
                .pnl-print { display: none; }
                @media print {
                    html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
                    body * { visibility: hidden !important; }
                    .pnl-print, .pnl-print * { visibility: visible !important; }
                    .pnl-print { display: block !important; position: fixed !important; left: 0; top: 0; width: 100%;
                                 background: #fff; color: #000; font-family: system-ui, sans-serif; }
                    .pnl-print table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
                    .pnl-print th, .pnl-print td { border: 1px solid #999; padding: 6px 10px; font-size: 12px; text-align: left; }
                    .pnl-print td.num { text-align: right; font-variant-numeric: tabular-nums; }
                    .pnl-print tr.sub td, .pnl-print tr.tot td { font-weight: 800; background: #f1f5f9; }
                    @page { size: A4 portrait; margin: 14mm; }
                }
            `}</style>
            <div className="pnl-print">
                <h2 style={{ margin: '0 0 4px' }}>{t('pnl.exTitle', '손익계산서 (P&L)')}</h2>
                <div style={{ fontSize: 11, marginBottom: 12 }}>
                    {t('pnl.exPeriod', '기간')}: {exportMeta().rangeLabel} · {t('pnl.exGenerated', '생성일시')}: {exportMeta().generatedAt}
                </div>
                <table>
                    <thead><tr>
                        <th>{t('pnl.exItem', '항목')}</th><th>KRW</th><th>{currency?.code || 'KRW'}</th>
                    </tr></thead>
                    <tbody>
                        {pnlRows.map(r => (
                            <tr key={r.label} className={r.kind === 'subtotal' ? 'sub' : r.kind === 'total' ? 'tot' : ''}>
                                <td>{r.label}</td>
                                <td className="num">{Math.round(r.amount).toLocaleString()}</td>
                                <td className="num">{Number(convert(r.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h3 style={{ margin: '0 0 6px', fontSize: 13 }}>{t('pnl.exKpiSection', '참고 지표')}</h3>
                <table>
                    <tbody>
                        {pnlKpis.map(k => (
                            <tr key={k.label}><td>{k.label}</td><td className="num">{k.value}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                    {/* [283차 P1] 실제 손익 데이터 내보내기 — PDF=브라우저 인쇄(print-to-PDF), Excel=xlsx 실파일. 가짜 포맷 버튼 없음. */}
                    <button onClick={exportPdf} title={t('pnl.exPdfHint', '브라우저 인쇄 창에서 "PDF로 저장"을 선택하세요')} style={BTN('rgba(239,68,68,0.12)', RED)}>📄 PDF</button>
                    <button onClick={exportExcel} style={BTN('rgba(34,197,94,0.12)', GREEN)}>📊 Excel</button>
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
                    <button onClick={() => navigate('/budget-tracker')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>💰 {t('pnl.linkBudget')}</button>
                    <button onClick={() => navigate('/wms-manager')} style={{ padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>🏭 {t('pnl.linkInventory')}</button>
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
                        <div style={{ fontSize: 12, fontWeight: 700, color: tab === tb.id ? 'var(--text-1)' : 'var(--text-2)' }}>{tb.icon} {t(tb.labelKey, tb.labelFb)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t(tb.descKey, tb.descFb)}</div>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
                {/* [현 차수] 특정상품 손익 조회 — 선택 시 그 상품의 매출·순이익·원가·채널/국가별을 인라인(주문 SSOT). 페이지 합계 P&L 은 전체 기준 유지. */}
                <div style={{ marginBottom: 16, display: 'grid', gap: 12 }}>
                    <ProductSelectBar />
                    <ProductMarketingPanel period="monthly" />
                </div>
                {tab === 'health' && <HealthTab live={live} t={t} fmt={fmt} />}
                {tab === 'overview' && <OverviewTab live={live} pgSum={pgSum} t={t} fmt={fmt} dateRange={dateRange} />}
                {tab === 'pnl' && <PnlUnitTab live={live} t={t} fmt={fmt} connectedChannels={connectedChannels} />}
                {tab === 'anomaly' && <AnomalyTab t={t} live={live} fmt={fmt} navigate={navigate} />}
                {tab === 'action' && <ActionTab t={t} navigate={navigate} />}
                {tab === 'vat' && <VatTab t={t} fmt={fmt} isAdmin={isAdmin} />}
                {tab === 'forecast' && <ForecastTab live={live} t={t} fmt={fmt} />}
                {tab === 'guide' && <GuideTab t={t} />}
            </div>

            <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        </div>
    );
}
