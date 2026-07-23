import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useGlobalData, isCancelledStatus } from '../context/GlobalDataContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useI18n } from '../i18n/index.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { useSecurityGuard, sanitizeInput, detectXSS } from '../security/SecurityGuard.js';
import ProductSelectBar from '../components/dashboards/ProductSelectBar.jsx';
import ProductMarketingPanel from '../components/dashboards/ProductMarketingPanel.jsx';
import PlanGate from '../components/PlanGate.jsx';
import { CHANNEL_RATES } from '../constants/channelRates.js';
import { loadChannelRegistry, registryBySyncKind } from '../services/channelRegistry.js';
// [237차] getJson(비인증)→getJsonAuth(세션 Bearer) 별칭. /api/channel-sync/* 는 세션 self-auth
//   (denyAnon)이라 비인증 getJson 호출 시 401 → 옴니채널 상품/주문/재고/상태 전부 빈데이터였음.
import { getJsonAuth as getJson, postJson } from '../services/apiClient.js';
import { IS_DEMO } from '../utils/demoEnv';
import { tChannelName } from '../utils/tenantStorage'; // [286차] 크로스탭 채널 테넌트 스코프(대행사/impersonation 타테넌트 탭 격리)
import PeriodFilterBar, { inPeriodAny } from '../components/common/PeriodFilterBar.jsx'; // [현 차수] 기간조회

/* 204차 동기화: 데모는 GlobalDataContext 단일소스(orders/inventory)에서 채널현황을 파생 —
   과거 5탭이 /api/channel-sync/* 를 호출해 데모서 빈값이었고, OrdersTab 은 전역 orders 를 []로 덮어써
   Dashboard/PnL/Performance 까지 오염시켰다. WMS(같은 inventory)와도 정합. 운영은 기존 API 경로 유지. */
function buildDemoOmniStatus(gd) {
    // [현 차수] 감사 P1: 취소주문 제외(정본 캐논)로 채널/총 매출 발산 차단. 기존 raw 전수 합산은 취소분 포함이라
    //   데모 체험자가 주문 취소 시 OmniChannel 매출만 대시보드/P&L/롤업 대비 과대(런타임 단일소스 동기화 위반).
    const allOrders = Array.isArray(gd?.orders) ? gd.orders : [];
    const orders = allOrders.filter(o => !isCancelledStatus(o.status, o.event_type)); // [228차 P1-2] event_type 정합
    const inventory = Array.isArray(gd?.inventory) ? gd.inventory : [];
    const byCh = {};
    orders.forEach(o => { const c = o.ch || o.channel || 'etc'; if (!byCh[c]) byCh[c] = { n: 0, rev: 0 }; byCh[c].n++; byCh[c].rev += Number(o.total || o.total_price || 0); });
    const prodByCh = {};
    inventory.forEach(p => (p.channels || []).forEach(c => { prodByCh[c] = (prodByCh[c] || 0) + 1; }));
    const ids = new Set([...Object.keys(byCh), ...Object.keys(prodByCh)]);
    const channels = [...ids].map(id => {
        const m = (typeof CHANNELS_MASTER !== 'undefined' ? CHANNELS_MASTER.find(x => x.id === id) : null) || {};
        return { id, name: m.name || id, icon: m.icon, color: m.color, status: 'ok', product_count: prodByCh[id] || 0, order_count: byCh[id]?.n || 0, revenue: Math.round(byCh[id]?.rev || 0) };
    });
    return {
        channels,
        totals: { products: inventory.length, orders: orders.length, revenue: Math.round(orders.reduce((s, o) => s + Number(o.total || o.total_price || 0), 0)) },
        plan: 'enterprise',
    };
}

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & API
══════════════════════════════════════════════════════════════════ */
const XSS_PATTERN = /(<script|javascript:|on\w+=|eval\(|document\.(cookie|domain)|window\.(location|open)|import\s*\()/i;

/* ── Channel Master (static reference data — no mock stats) ─── */
const CHANNELS_MASTER = [
    { id: 'shopify', name: 'Shopify', icon: '\uD83D\uDED2', color: '#96bf48', type: 'Global',
      fields: [{ key: 'shop_domain', label: 'Shop Domain', ph: 'mystore.myshopify.com' }, { key: 'access_token', label: 'Admin API Access Token', ph: 'shpat_xxxx', secret: true }] },
    { id: 'amazon', name: 'Amazon SP-API', icon: '\uD83D\uDCE6', color: '#ff9900', type: 'Global',
      fields: [{ key: 'client_id', label: 'LWA Client ID', ph: 'amzn1.application-oa2-client...' }, { key: 'client_secret', label: 'Client Secret', ph: '...', secret: true }, { key: 'marketplace_id', label: 'Marketplace ID', ph: 'A1PA6795UKMFR9' }] },
    { id: 'ebay', name: 'eBay', icon: '\uD83D\uDD35', color: '#0064d2', type: 'Global',
      fields: [{ key: 'access_token', label: 'OAuth Access Token', ph: 'v^1.1#...', secret: true }] },
    { id: 'tiktok_shop', name: 'TikTok Shop', icon: '\uD83C\uDFB5', color: '#ff0050', type: 'Global',
      fields: [{ key: 'app_key', label: 'App Key', ph: '...' }, { key: 'app_secret', label: 'App Secret', ph: '...', secret: true }, { key: 'access_token', label: 'Access Token', ph: '...', secret: true }] },
    { id: 'rakuten', name: 'Rakuten', icon: '\uD83C\uDDEF\uD83C\uDDF5', color: '#bf0000', type: 'Japan',
      fields: [{ key: 'service_secret', label: 'Service Secret', ph: '...', secret: true }, { key: 'license_key', label: 'License Key', ph: '...' }] },
    { id: 'yahoo_jp', name: 'Yahoo! Japan Shopping', icon: '\uD83D\uDFE5', color: '#ff0033', type: 'Japan',
      // [\uD604 \uCC28\uC218 \uAC10\uC0AC] \uBC31\uC5D4\uB4DC yahooJpFetch/Write \uB294 access_token(OAuth)+seller_id \uB97C \uC77D\uB294\uB370 \uD3FC\uC774 api_key \uB97C \uBC1B\uC544(\uBC31\uC5D4\uB4DC \uBBF8\uC0AC\uC6A9) \uD56D\uC0C1 \uC2E4\uD328\uD588\uB2E4. \uC2E4\uD0A4\uB85C \uC815\uC815.
      fields: [{ key: 'access_token', label: 'Access Token (OAuth)', ph: '...', secret: true }, { key: 'seller_id', label: 'Seller ID (\uC2A4\uD1A0\uC5B4 \uACC4\uC815)', ph: '...' }] },
    { id: 'line', name: 'LINE Shopping', icon: '\uD83D\uDC9A', color: '#00b900', type: 'Japan',
      fields: [{ key: 'channel_access_token', label: 'Channel Access Token', ph: '...', secret: true }] },
    { id: 'coupang', name: 'Coupang Wing', icon: '\uD83C\uDD52', color: '#00bae5', type: 'Domestic',
      fields: [{ key: 'access_key', label: 'Access Key', ph: '...' }, { key: 'secret_key', label: 'Secret Key', ph: '...', secret: true }, { key: 'vendor_id', label: 'Vendor ID', ph: 'A...' }] },
    { id: 'naver', name: 'Naver Smartstore', icon: '\uD83D\uDFE2', color: '#03c75a', type: 'Domestic',
      fields: [{ key: 'client_id', label: 'Client ID', ph: '...' }, { key: 'client_secret', label: 'Client Secret', ph: '...', secret: true }] },
    { id: '11st', name: '11Street', icon: '11', color: '#ff0000', type: 'Domestic',
      fields: [{ key: 'api_key', label: 'Open API Key', ph: '...', secret: true }] },
    { id: 'gmarket', name: 'Gmarket / Auction', icon: 'G', color: '#eab308', type: 'Domestic',
      fields: [{ key: 'esm_id', label: 'ESM+ ID', ph: '...' }, { key: 'api_key', label: 'API Key', ph: '...', secret: true }] },
    { id: 'cafe24', name: 'Cafe24', icon: '\u2615', color: '#6366f1', type: 'Domestic',
      // [\ud604 \ucc28\uc218 \uac10\uc0ac] \ubc31\uc5d4\ub4dc cafe24Fetch/Reviews \ub294 refresh_token(OAuth)\ub85c\ub9cc access_token \uc744 \ubc1c\uae09\ubc1b\ub294\ub370 \ud3fc\uc5d0 refresh_token \ud544\ub4dc\uac00 \uc5c6\uc5b4 \uc778\uc99d \ubd88\uac00\uc600\ub2e4. \ucd94\uac00.
      fields: [{ key: 'mall_id', label: 'Mall ID', ph: '...' }, { key: 'client_id', label: 'Client ID', ph: '...' }, { key: 'client_secret', label: 'Client Secret', ph: '...', secret: true }, { key: 'refresh_token', label: 'Refresh Token (OAuth \uc778\uc99d \ud6c4)', ph: '...', secret: true }] },
    { id: 'lotteon', name: 'Lotte ON', icon: 'L', color: '#ef4444', type: 'Domestic',
      fields: [{ key: 'api_key', label: 'API Key', ph: '...', secret: true }] },
];

const Tag = ({ label, color }) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        background: color + '18', color, border: `1px solid ${color}33` }}>{label}</span>
);

/* ── CHANNEL_RATES → '../constants/channelRates.js' 에서 import (중앙 단일소스) ─── */

/* ══════════════════════════════════════════════════════════════════
   BROADCAST CHANNEL — Cross-tab real-time sync
══════════════════════════════════════════════════════════════════ */
const BC_NAME = 'geniego_omni_sync';
function useCrossTabSync(onMessage) {
    const cbRef = useRef(onMessage);
    cbRef.current = onMessage;
    const bcRef = useRef(null);

    useEffect(() => {
        try {
            const bc = new BroadcastChannel(tChannelName(BC_NAME));
            bc.onmessage = (e) => cbRef.current?.(e.data);
            bcRef.current = bc;
            return () => bc.close();
        } catch { /* Safari < 15.4 fallback: ignore */ }
    }, []);

    const broadcast = useCallback((type, payload) => {
        try { bcRef.current?.postMessage({ type, payload, ts: Date.now() }); } catch { /* 실패 무시(best-effort) */ }
    }, []);
    return broadcast;
}

/* ══════════════════════════════════════════════════════════════════
   Channel Auth Panel
══════════════════════════════════════════════════════════════════ */
function ChannelAuthPanel({ ch, onSaved, isDemo, t }) {
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
            const data = await postJson('/api/channel-sync/credentials', { channel: ch.id, cred_type: 'api_key', label: ch.name,
                    key_name: mainField.key, key_value: form[mainField.key] || '', ...extras });
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
            const data = await postJson(`/api/channel-sync/${ch.id}/test`, { ...extras, key_value: form[ch.fields[0]?.key] || '' });
            setResult(data);
        } catch (e) { setResult({ ok: false, error: e.message }); }
        setLoading(false);
    }, [ch, form, isDemo, t]);

    return (
        <div style={{ padding: '16px 20px', marginTop: 8, borderRadius: 12, background: '#f9fafb', border: `1px solid ${ch.color}22`, display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: ch.color, letterSpacing: 1, marginBottom: 2 }}>
                {"🔑"} {ch.name} — {t('omniChannel.authTitle')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                {ch.fields.map(f => (
                    <div key={f.key}>
                        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
                        <input type={f.secret ? 'password' : 'text'} placeholder={f.ph}
                            value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,140,255,0.2)', background: '#ffffff', color: '#1f2937', fontSize: 12, boxSizing: 'border-box' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleTest} disabled={loading}
                    style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.4)', background: 'transparent', color: '#4f8ef7', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? '⏳' : `🔍 ${t('omniChannel.btnConnTest')}`}
                </button>
                <button onClick={handleSave} disabled={loading}
                    style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg,${ch.color},#4f8ef7)`, color: '#1f2937', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? `⏳ ${t('omniChannel.savingProgress')}` : `💾 ${t('omniChannel.btnSaveSync')}`}
                </button>
            </div>
            {result && (() => {
                // [282차 A-P1] 응답 ok 는 항상 true(저장 성공)라 녹색 위장이 됐다. 실제 연동 성사(synced)와
                //   원인 note 를 반영해 정직 표기: synced=true 만 녹색, 그 외(자격증명 불완전/수집 0)는 경고색+원인.
                const ok = !!result.synced;
                const hue = ok ? '#22c55e' : '#f59e0b';
                return (
                    <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, background: `${hue}14`, border: `1px solid ${hue}33`, color: hue }}>
                        {ok
                            ? `✓ ${result.message || t('omniChannel.integSuccess').replace('{{products}}', result.product_count ?? 0).replace('{{orders}}', result.order_count ?? 0)}`
                            : `⚠ ${result.note || result.message || result.error || t('omniChannel.integFail')}`}
                    </div>
                );
            })()}
        </div>
    );
}

// 212차 #4: 레지스트리 SSOT — 마스터와 동일 채널의 별칭(ID 불일치) 키. 중복 카드 방지용 스킵셋.
const REG_COMMERCE_ALIAS = new Set(['naver_smartstore', 'st11', 'auction']); // master: naver / 11st / gmarket(Auction 통합)

function ChannelTab({ channelStatus, onRefresh, plan, isDemo, t, csIsConnected }) {
    const { fmt } = useCurrency();
    const [expanded, setExpanded] = React.useState({});
    const [syncing, setSyncing] = React.useState({});
    // 212차 #4: 하드코딩 CHANNELS_MASTER 베이스 + 레지스트리 커머스 신규채널 additive merge(admin 추가 채널 동적 노출).
    const [channelsMaster, setChannelsMaster] = React.useState(CHANNELS_MASTER);
    React.useEffect(() => {
        loadChannelRegistry().then((reg) => {
            const have = new Set(CHANNELS_MASTER.map(c => c.id));
            const extra = registryBySyncKind(reg, 'commerce')
                .filter(c => !have.has(c.channel_key) && !REG_COMMERCE_ALIAS.has(c.channel_key))
                .map(c => ({
                    id: c.channel_key, name: c.name, icon: c.icon || '🔗', color: c.color || '#6366f1',
                    type: 'Marketplace',
                    fields: (c.fields || []).map(f => ({ key: f.k, label: f.label, ph: '...', secret: f.secret !== false })),
                }));
            if (extra.length) setChannelsMaster([...CHANNELS_MASTER, ...extra]);
        });
    }, []);
    const toggle = React.useCallback(id => setExpanded(e => ({ ...e, [id]: !e[id] })), []);

    const syncNow = React.useCallback(async (chId) => {
        setSyncing(s => ({ ...s, [chId]: true }));
        await postJson(`/api/channel-sync/${chId}/sync`, {});
        onRefresh();
        setSyncing(s => ({ ...s, [chId]: false }));
    }, [onRefresh]);

    const grouped = React.useMemo(() => channelsMaster.reduce((m, c) => { (m[c.type] || (m[c.type] = [])).push(c); return m; }, {}), [channelsMaster]);

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
        Marketplace: t('omniChannel.groupMarketplace', '마켓플레이스'),
    }), [t]);

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                    { l: t('omniChannel.kpiAllChannel'), v: channelsMaster.length, c: '#4f8ef7' },
                    { l: t('omniChannel.kpiIntegDone'), v: totalConnected, c: '#22c55e' },
                    { l: t('omniChannel.kpiProducts'), v: (channelStatus?.totals?.products || 0).toLocaleString(), c: '#a855f7' },
                    { l: t('omniChannel.kpiOrders'), v: (channelStatus?.totals?.orders || 0).toLocaleString(), c: '#eab308' },
                ].map(k => (
                    <div key={k.l} style={{ padding: '10px 18px', borderRadius: 12, background: `${k.c}08`, border: `1px solid ${k.c}22`, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{k.l}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '9px 16px', borderRadius: 10, background: plan === 'pro' ? 'rgba(168,85,247,0.1)' : 'rgba(79,142,247,0.1)', border: `1px solid ${plan === 'pro' ? '#a855f7' : '#4f8ef7'}33`, fontSize: 12, color: '#374151' }}>
                {plan === 'pro' ? `🔑 ${t('omniChannel.planPro')}` : `🎮 ${t('omniChannel.planFree')}`}
            </div>

            {Object.entries(grouped).map(([type, chs]) => (
                <div key={type} style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, color: '#1f2937', marginBottom: 14 }}>
                        {"🔌"} {GROUP_LABELS[type] || type}
                    </div>
                    {chs.map(ch => {
                        const st = statusMap[ch.id] || {};
                        const statusKey = st.status || 'not_configured';
                        const sStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.none;
                        return (
                            <div key={ch.id} style={{ marginBottom: 10 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: 14, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: '#ffffff', border: `1px solid ${ch.color}22` }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${ch.color}18`, border: `1px solid ${ch.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: ch.color }}>{ch.icon}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{ch.name}</div>
                                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                                            {t('omniChannel.colProduct')} {(st.product_count || 0).toLocaleString()} · {t('omniChannel.colOrderNo')} {(st.order_count || 0).toLocaleString()} · {t('omniChannel.colRevenue')} {fmt(st.revenue || 0)}
                                            {/* [263차 Track C] 동기화 관측성 — 마지막 동기화 경과/오류 배지(263차 백엔드가 비-commerce 채널도 stamp). */}
                                            {st.last_synced && (() => { const mins = Math.max(0, Math.round((Date.now() - new Date(st.last_synced).getTime()) / 60000)); const ago = mins < 60 ? `${mins}분 전` : mins < 1440 ? `${Math.round(mins / 60)}시간 전` : `${Math.round(mins / 1440)}일 전`; return <span style={{ marginLeft: 8, color: st.sync_status === 'error' ? '#ef4444' : '#16a34a', fontWeight: 700 }} title={`${t('omniChannel.colLastSync', '마지막 동기화')}: ${st.last_synced}`}>{st.sync_status === 'error' ? `⚠ ${t('omniChannel.syncError', '동기화 오류')}` : `🕒 ${ago}`}</span>; })()}
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
    const { inventory: ctxInv } = useGlobalData();
    const [products, setProducts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [channel, setChannel] = React.useState('');
    const [search, setSearch] = React.useState('');

    const load = React.useCallback(async () => {
        // 204차 동기화: 데모는 inventory(단일소스) 상품×채널 파생(API 미호출). 운영은 API.
        if (IS_DEMO) {
            const rows = [];
            (Array.isArray(ctxInv) ? ctxInv : []).forEach(p => {
                const total = p.stock ? Object.values(p.stock).reduce((s, v) => s + Number(v || 0), 0) : Number(p.qty ?? 0);
                const chans = (p.channels && p.channels.length) ? p.channels : ['naver'];
                chans.forEach(c => rows.push({ id: `${c}-${p.sku}`, channel: c, channel_product_id: `${String(c).toUpperCase()}-${p.sku}`, name: p.name, sku: p.sku, price: p.price, inventory: Math.round(total / chans.length), category: p.category, status: p.status || 'active' }));
            });
            setProducts(channel ? rows.filter(r => r.channel === channel) : rows);
            setLoading(false); return;
        }
        setLoading(true);
        try {
            const data = await getJson(`/api/channel-sync/products?limit=100${channel ? '&channel=' + channel : ''}`);
            setProducts(data.products || []);
        } catch (e) {
            console.warn('[OmniChannel] products load failed', e);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [channel, ctxInv]);

    React.useEffect(() => { load(); }, [load]);

    const filtered = React.useMemo(() => products.filter(p => !search || (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').includes(search)), [products, search]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, background: "#fff", color: "#1f2937", boxSizing: "border-box", flex: '1 1 200px' }} placeholder={t('omniChannel.searchPlaceholder')}
                    value={search} onChange={e => setSearch(e.target.value)} />
                <select style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, background: "#fff", color: "#1f2937", boxSizing: "border-box", width: 160 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">{t('omniChannel.allChannel')}</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button style={{ padding: '7px 16px', borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={load}>{"🔄"} {t('omniChannel.btnRefresh')}</button>
                <span style={{ fontSize: 11, color: '#6b7280' }}>{t('omniChannel.productCount').replace('{{n}}', filtered.length)}</span>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>{"⏳"} {t('omniChannel.loading')}</div>
            ) : (
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, overflowX: 'auto' }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr>
                            <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colId')}</th><th>{t('omniChannel.colProductName')}</th><th>{t('omniChannel.colSku')}</th>
                            <th>{t('omniChannel.colSalePrice')}</th>
                            <th style={{ color: '#f59e0b' }}>{t('omniChannel.colCommission') || t('catalogSync.colCommission', 'Commission')}</th>
                            <th style={{ color: '#6366f1' }}>{t('omniChannel.colVatTax') || t('catalogSync.colVatTax', 'VAT')}</th>
                            <th>{t('omniChannel.colStock')}</th><th>{t('omniChannel.colCategory')}</th><th>{t('omniChannel.colStatus')}</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
                            {filtered.map((p, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === p.channel);
                                const rate = CHANNEL_RATES[p.channel] || { commission: 0.10, vat: 0.00 };
                                const commAmt = (p.price || 0) * rate.commission;
                                const vatAmt = (p.price || 0) * rate.vat;
                                return (
                                    <tr key={p.id || i}>
                                        <td>{ch && <span style={{ fontSize: 13, color: ch?.color || '#4f8ef7', marginLeft: 4 }}>{ch.icon}</span>} <span>{ch?.name || p.channel}</span></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{p.channel_product_id}</td>
                                        <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280' }}>{p.sku}</td>
                                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(p.price)}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#f59e0b' }}>{fmt(Math.round(commAmt))} <span style={{ fontSize: 10, opacity: 0.7 }}>({(rate.commission * 100).toFixed(0)}%)</span></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#6366f1' }}>{rate.vat > 0 ? `${fmt(Math.round(vatAmt))}` : '—'} <span style={{ fontSize: 10, opacity: 0.7 }}>({(rate.vat * 100).toFixed(0)}%)</span></td>
                                        <td style={{ color: p.inventory < 20 ? '#ef4444' : p.inventory < 80 ? '#eab308' : '#22c55e', fontWeight: 700 }}>{p.inventory}</td>
                                        <td style={{ fontSize: 11, color: '#6b7280' }}>{p.category || '—'}</td>
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
    const [period, setPeriod] = React.useState({ preset: 'all' }); // [현 차수] 기간조회

    const STATUS_KEYS = React.useMemo(() => ['statusConfirm','statusShipPending','statusShipping','statusDelivered','statusCancelReq','statusReturnRecv'], []);
    // [280차 P1] ★status 값은 반드시 백엔드가 인식하는 캐논 토큰이어야 한다(OrderHub CANCEL_TOKENS/RETURN_TOKENS).
    //   종전엔 드롭다운 value 가 현지화 라벨(예: de "Stornierungsanfrage")이라, ko/en 외 10~13개 언어 운영자가
    //   취소/반품 처리하면 setOrderStatus 가 claimType=null 로 판정 → 매출/정산에 계속 포함(과대) + CRM 역분개·
    //   재고복원·returnFee claim 전부 미발생. OrderTab 은 이미 캐논 토큰을 전송(안전) — OmniChannel 만 결함이었다.
    //   value=캐논 토큰, 표시=현지화 라벨로 분리한다.
    const STATUS_CANON = React.useMemo(() => ({
        statusConfirm: 'confirmed', statusShipPending: 'paid', statusShipping: 'shipping',
        statusDelivered: 'delivered', statusCancelReq: '취소요청', statusReturnRecv: '반품접수',
    }), []);
    const STATUS_OPTIONS = React.useMemo(
        () => STATUS_KEYS.map(k => ({ value: STATUS_CANON[k], label: t(`omniChannel.${k}`) })),
        [t, STATUS_KEYS, STATUS_CANON]);
    const STATUS_COLORS = React.useMemo(() => {
        const colors = ['#eab308','#a855f7','#4f8ef7','#22c55e','#ef4444','#f97316'];
        const map = {};
        STATUS_OPTIONS.forEach((o, i) => { map[o.value] = colors[i]; });
        return map;
    }, [STATUS_OPTIONS]);
    // 하위호환: 데모 시드/필터가 참조하는 라벨 배열(표시용).
    const STATUSES = React.useMemo(() => STATUS_OPTIONS.map(o => o.label), [STATUS_OPTIONS]);

    const load = React.useCallback(async () => {
        // 204차 P0: 데모는 전역 orders(DEMO_ORDERS)를 절대 setOrders([])로 덮어쓰지 않는다(타 메뉴 오염 차단).
        //   글로벌 orders 를 표시형으로 매핑만 한다. 운영만 API 호출.
        if (IS_DEMO) { setLoading(false); return; }
        setLoading(true);
        const qs = new URLSearchParams({ limit: '100' });
        if (channel) qs.set('channel', channel);
        if (statusFilter) qs.set('status', statusFilter);
        try {
            const data = await getJson(`/api/channel-sync/orders?${qs}`);
            setOrders(data.orders || []);
        } catch (e) {
            console.warn('[OmniChannel] orders load failed', e);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [channel, statusFilter, setOrders]);

    React.useEffect(() => { load(); }, [load]);

    // 데모: 전역 orders(DEMO_ORDERS) → OmniChannel 표시 스키마로 매핑(상태=현지화 라벨, 채널/상태 필터 적용). 운영=API orders.
    // [281차 회귀수정] 데모 주문 status 를 캐논 value 로 매핑(STATUS_OPTIONS[i].value) — 라벨 매핑이면 캐논 기반
    //   필터·요약·색상과 불일치. STATUS_KEYS 순서: confirm/shipPending/shipping/delivered/cancelReq/returnRecv.
    const _DEMO_ST = React.useMemo(() => {
        const v = STATUS_OPTIONS.map(o => o.value);
        return { paid: v[1], confirmed: v[0], preparing: v[1], shipping: v[2], delivered: v[3], cancelled: v[4], canceled: v[4], returned: v[5] };
    }, [STATUS_OPTIONS]);
    const displayOrders = React.useMemo(() => {
        // [현 차수] 기간조회 — 수집 주문을 선택 기간으로 정확 필터(원본 atISO 기준, ko-KR at 폴백).
        const inP = (o) => inPeriodAny(o, period, ['atISO', 'ordered_at', 'created_at', 'at']);
        if (!IS_DEMO) return (Array.isArray(orders) ? orders : []).filter(inP);
        return (Array.isArray(orders) ? orders : []).filter(inP).map(o => ({
            id: o.id, channel: o.ch || o.channel, channel_order_id: o.id, buyer_name: String(o.buyer || '').split(' ')[0] || o.buyer,
            product_name: o.name || o.product_name, qty: o.qty, total_price: o.total ?? o.total_price,
            status: _DEMO_ST[o.status] || STATUS_OPTIONS[0].value, carrier: o.carrier, ordered_at: o.atISO || o.at || o.ordered_at,
        })).filter(o => (!channel || o.channel === channel) && (!statusFilter || o.status === statusFilter));
    }, [orders, channel, statusFilter, _DEMO_ST, STATUS_OPTIONS, period]);

    const handleStatusUpdate = React.useCallback(async (orderId, newStatus) => {
        if (isDemo) { alert(t('omniChannel.demoStatusMsg')); return; }
        // [279차 감사 E-P1] 종전엔 미검증 웹훅 수신 엔드포인트(/channel-sync/webhooks/{ch}, X-Webhook-Token 필수)로
        //   보내 서버가 아무것도 쓰지 않는데(fail-secure) 무조건 성공표기 → load() 재조회 시 원상복구(무음 no-op)였다.
        //   인증된 상태변경 SSOT(OrderHub::setOrderStatus)로 전송하고 응답 확인 후에만 낙관적 갱신·토스트.
        try {
            const r = await postJson('/api/v424/orderhub/orders/status', { id: orderId, status: newStatus });
            if (r && r.ok === false) {
                addAlert?.({ type: 'error', msg: r.message || r.error || t('omniChannel.statusFail', '상태 변경 실패') });
                return;
            }
            if (updateOrderStatus) updateOrderStatus(orderId, { status: newStatus });
            addAlert?.({ type: 'success', msg: `Order ${orderId} → ${newStatus}` });
            load();
        } catch (e) {
            addAlert?.({ type: 'error', msg: (e && e.message) || t('omniChannel.statusFail', '상태 변경 실패') });
        }
    }, [isDemo, t, updateOrderStatus, addAlert, load]);

    // [281차 회귀수정] ★C-P1(status 캐논토큰화)의 부작용 교정 — STATUS_COLORS·필터는 캐논 value 키인데
    //   summary 가 라벨(STATUSES) 기반이라 STATUS_COLORS[라벨]=undefined(카드색 전부 회색)·statusFilter(라벨)와
    //   운영 o.status(캐논)가 불일치했다. summary 를 캐논 value 기반으로 통일(카드 표시는 label).
    const summary = React.useMemo(
        () => STATUS_OPTIONS.map(({ value, label }) => ({ s: value, label, cnt: displayOrders.filter(o => o.status === value).length })),
        [STATUS_OPTIONS, displayOrders]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {summary.map(({ s, label, cnt }) => (
                    <div key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)} style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: `${STATUS_COLORS[s] || '#666'}${statusFilter === s ? '20' : '08'}`, border: `1px solid ${STATUS_COLORS[s] || '#666'}${statusFilter === s ? '55' : '22'}` }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: STATUS_COLORS[s] || '#666' }}>{cnt}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>{label}</div>
                    </div>
                ))}
            </div>
            <div style={{ marginBottom: 8 }}><PeriodFilterBar value={period} onChange={setPeriod} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, background: "#fff", color: "#1f2937", boxSizing: "border-box", width: 160 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">{t('omniChannel.allChannel')}</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button style={{ padding: '7px 16px', borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={load}>{"🔄"} {t('omniChannel.btnRefresh')}</button>
                <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>{t('omniChannel.items').replace('{{n}}', displayOrders.length)}</span>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>{"⏳"} {t('omniChannel.loading')}</div> : (
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, overflowX: 'auto' }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                        <thead><tr>
                            <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colOrderNo')}</th><th>{t('omniChannel.colBuyer')}</th><th>{t('omniChannel.colProduct')}</th>
                            <th>{t('omniChannel.colQuantity')}</th><th>{t('omniChannel.colAmount')}</th><th>{t('omniChannel.colStatus')}</th><th>{t('omniChannel.colCarrier')}</th><th>{t('omniChannel.colOrderDate')}</th>
                        </tr></thead>
                        <tbody>
                            {displayOrders.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
                            {displayOrders.map((o, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === o.channel);
                                const sc = STATUS_COLORS[o.status] || '#666';
                                return (
                                    <tr key={o.id || i}>
                                        <td>{ch && <span style={{ fontSize: 14, color: ch?.color || '#4f8ef7', marginLeft: 4 }}>{ch.icon}</span>} <span>{ch?.name || o.channel}</span></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{o.channel_order_id}</td>
                                        <td style={{ fontSize: 12 }}>{o.buyer_name}</td>
                                        <td style={{ fontSize: 12, color: '#374151' }}>{o.product_name}</td>
                                        <td style={{ textAlign: 'center' }}>{o.qty}</td>
                                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(o.total_price)}</td>
                                        <td>
                                            <select onChange={e => handleStatusUpdate(o.channel_order_id, e.target.value)} value={o.status} style={{ padding: '3px 6px', borderRadius: 6, background: '#f3f4f6', border: `1px solid ${sc}44`, color: sc, fontSize: 11, cursor: 'pointer' }}>
                                                {/* [280차 P1] value=캐논 토큰(백엔드 인식), 표시=현지화 라벨. 현재 status 가
                                                    옵션에 없으면(freeform/데모 라벨) 그 값을 첫 옵션으로 노출해 선택 표시 유지. */}
                                                {!STATUS_OPTIONS.some(op => op.value === o.status) && o.status && (
                                                    <option value={o.status} style={{ color: '#1f2937' }}>{o.status}</option>
                                                )}
                                                {STATUS_OPTIONS.map(op => <option key={op.value} value={op.value} style={{ color: '#1f2937' }}>{op.label}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ fontSize: 11, color: '#6b7280' }}>{o.carrier || '—'}</td>
                                        <td style={{ fontSize: 10, color: '#6b7280' }}>{o.ordered_at?.slice?.(0, 16) || '—'}</td>
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
        if (IS_DEMO) { setLoading(false); return; } // 데모: ctxInventory 단일소스 사용(API 미호출)
        setLoading(true);
        try {
            const data = await getJson(`/api/channel-sync/inventory${channel ? '?channel=' + channel : ''}`);
            setInv(data.inventory || []);
        } catch (e) {
            console.warn('[OmniChannel] inventory load failed', e);
            setInv([]);
        } finally {
            setLoading(false);
        }
    }, [channel]);

    React.useEffect(() => { load(); }, [load]);

    // 204차 동기화: 데모는 ctxInventory(GlobalData=WMS와 동일 소스)를 omni 스키마로 매핑.
    //   available=Σstock(WMS 합계와 정합), product_name=name, channel=대표채널. 운영은 API inventory.
    const mergedInv = React.useMemo(() => {
        if (!IS_DEMO) return inv.length > 0 ? inv : (ctxInventory || []);
        const rows = (ctxInventory || []).map(p => {
            const total = p.stock ? Object.values(p.stock).reduce((s, v) => s + Number(v || 0), 0) : Number(p.qty ?? p.available ?? 0);
            return { channel: (p.channels && p.channels[0]) || 'naver', sku: p.sku, product_name: p.name, available: total, reserved: p.safeQty || 0, warehouse: 'W001', synced_at: null, status: p.status };
        });
        return channel ? rows.filter(r => r.channel === channel) : rows;
    }, [inv, ctxInventory, channel]);

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, background: "#fff", color: "#1f2937", boxSizing: "border-box", width: 180 }} value={channel} onChange={e => setChannel(e.target.value)}>
                    <option value="">{t('omniChannel.allChannel')}</option>
                    {CHANNELS_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button style={{ padding: '7px 16px', borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} onClick={load}>{"🔄"} {t('omniChannel.btnRefresh')}</button>
            </div>
            {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>{"⏳"} {t('omniChannel.loading')}</div> : (
                <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20, overflowX: 'auto' }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr>
                            <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colSku')}</th><th>{t('omniChannel.colProductName')}</th>
                            <th>{t('omniChannel.colAvailStock')}</th><th>{t('omniChannel.colReserved')}</th><th>{t('omniChannel.colWarehouse')}</th>
                            <th>{t('omniChannel.colSync')}</th><th>{t('omniChannel.colStatus')}</th>
                        </tr></thead>
                        <tbody>
                            {mergedInv.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
                            {mergedInv.map((r, i) => {
                                const ch = CHANNELS_MASTER.find(c => c.id === r.channel);
                                const avail = r.available ?? 0;
                                const color = avail < 10 ? '#ef4444' : avail < 50 ? '#eab308' : '#22c55e';
                                return (
                                    <tr key={i}>
                                        <td>{ch && <><span style={{ fontSize: 13, color: ch.color }}>{ch.icon}</span> <span>{ch.name}</span></>}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#4f8ef7' }}>{r.sku}</td>
                                        <td style={{ fontSize: 12 }}>{r.product_name}</td>
                                        <td style={{ fontWeight: 900, fontSize: 14, color, textAlign: 'center' }}>{avail}</td>
                                        <td style={{ textAlign: 'center', color: '#eab308' }}>{r.reserved ?? 0}</td>
                                        <td style={{ fontSize: 11, color: '#6b7280' }}>{r.warehouse || t('omniChannel.defaultWarehouse')}</td>
                                        <td style={{ fontSize: 10, color: '#6b7280' }}>{r.synced_at?.slice?.(0, 16) || '—'}</td>
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
                    <div key={k.l} style={{ padding: '11px 20px', borderRadius: 14, background: `${k.c}08`, border: `1px solid ${k.c}22`, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{k.l}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: '#1f2937', marginBottom: 14 }}>{"📊"} {t('omniChannel.overviewTitle')}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr>
                        <th>{t('omniChannel.colChannel')}</th><th>{t('omniChannel.colType')}</th><th>{t('omniChannel.colStatus')}</th>
                        <th style={{ color: '#f59e0b' }}>{t('omniChannel.colCommission', 'Commission')}</th>
                        <th>{t('omniChannel.colProduct')}</th><th>{t('omniChannel.colOrderNo')}</th><th>{t('omniChannel.colRevenue')}</th><th>{t('omniChannel.colRevenueShare')}</th>
                    </tr></thead>
                    <tbody>
                        {sortedChannels.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>{t('omniChannel.noData')}</td></tr>}
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
                                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>{(rate.commission * 100).toFixed(0)}% <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 400 }}>+VAT {(rate.vat * 100).toFixed(0)}%</span></td>
                                    <td style={{ textAlign: 'center', color: '#4f8ef7', fontWeight: 700 }}>{(c.product_count || 0).toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>{(c.order_count || 0).toLocaleString()}</td>
                                    <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(c.revenue || 0)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <div style={{ flex: 1, height: 5, borderRadius: 5, background: '#e5e7eb', overflow: 'hidden' }}>
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
    // 184차 #5: enterprise 패턴 렌더러(CRM/OrderHub 정본 동일, NS=omniChannel). g(k) 조건부 렌더.
    const g = (k) => { const v = t('omniChannel.' + k, ''); return (v && !String(v).includes('omniChannel.')) ? v : ''; };
    const COLORS = ['#4f8ef7','#22c55e','#f59e0b','#a855f7','#6366f1','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48','#06b6d4','#0ea5e9','#f97316'];
    const ICONS = ['🔌','🔑','🧪','🔄','📊','📑','⚡','♻️','🛠️','📈','🛡️','➕','📦','🔔','🚀'];
    const steps = [];
    for (let i = 1; i <= 15; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[i - 1], color: COLORS[(i - 1) % COLORS.length], n: i }); }
    const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
    const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
    const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
    const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
    const secTitle = { fontWeight: 900, fontSize: 14, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
    const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, border: "1px solid #fed7aa", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1e293b", marginBottom: 6, letterSpacing: "-0.02em", WebkitTextFillColor: "#1e293b" }}>{t('omniChannel.guideTitle')}</div>
                <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: "#1e293b" }}>{t('omniChannel.guideSub')}</div>
                {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
                    {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 700, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
                </div>}
            </div>
            {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
            {g('guideAudienceTitle') ? <div style={card}><div style={secTitle}>👥 {g('guideAudienceTitle')}</div><div style={pre}>{g('guideAudienceDesc')}</div></div> : null}
            {steps.length > 0 && <div style={card}>
                {g('guideStepsTitle') ? <div style={secTitle}>🚀 {g('guideStepsTitle')}</div> : null}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {steps.map((s) => (
                        <div key={s.n} style={{ padding: "16px 18px", borderRadius: 14, background: s.color + "08", border: "1px solid " + s.color + "22", display: "flex", gap: 14, alignItems: "start" }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + "15", border: "1px solid " + s.color + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                            <div>
                                {s.phase ? <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.color + "20", padding: "2px 8px", borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                                </div>
                                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>}
            {tips.length > 0 && (
                <div style={{ ...card, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.25)" }}>
                    <div style={secTitle}>💡 {t('omniChannel.guideTipsTitle')}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                        {tips.map((tip, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#ffffff", border: "1px solid rgba(34,197,94,0.12)" }}>
                                <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                                <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, WebkitTextFillColor: '#374151' }}>{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {faqs.length > 0 && (
                <div style={card}>
                    <div style={secTitle}>❓ {g('guideFaqTitle') || t('omniChannel.guideFaqTitle', '자주 묻는 질문')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {faqs.map((f, i) => (
                            <div key={i} style={{ padding: '12px 14px', background: 'rgba(241,245,249,0.6)', borderRadius: 10, border: '1px solid #eef2f7' }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#4f8ef7', marginBottom: 5, WebkitTextFillColor: '#4f8ef7' }}>Q. {f.q}</div>
                                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>A. {f.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }}><div style={secTitle}>🛡️ {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
            {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🗓️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
            {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 32 }}>🎉</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6, color: '#1e293b', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyTitle')}</div>
                <div style={{ fontSize: 13, color: '#374151', maxWidth: 640, margin: '8px auto 0', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}>{g('guideReadyDesc')}</div>
            </div> : null}
        </div>
    );
}

function OmniChannelInner() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const navigate = useNavigate();
    const globalData = useGlobalData();
    const { orderStats, addAlert } = globalData;
    // [276차] ★무한 렌더루프 근본수정: `globalData.connectors || []` 는 connectors 가 falsy 일 때 매 렌더
    //   새 [] 리터럴을 만들어 hubChannels(useMemo)→loadStatus(useCallback)→useEffect 를 매 렌더 재실행,
    //   /api/channel-sync/status 를 초당 수백~수천회 호출(nginx 429). useMemo 로 참조 안정화.
    const connectors = useMemo(() => globalData.connectors || [], [globalData.connectors]);
    const { isDemo } = useAuth();

    /* ── ConnectorSyncContext — Integration Hub channel awareness ── */
    const {
        connectedChannels: csChannels,
        connectedCount: csCount,
        isConnected: csIsConnected,
        refresh: csRefresh,
    } = useConnectorSync();

    /* ── SecurityGuard — Enterprise XSS/CSRF/DevTools/Rate-limit ── */
    const [hackAlert, setHackAlert] = useState(null);
    const secAddAlert = useCallback((a) => {
        if (typeof addAlert === 'function') addAlert(a);
        if (a.type === 'error' || a.type === 'critical' || String(a.msg).includes('XSS') || String(a.msg).includes('injection')) {
            setHackAlert(a.msg);
        }
    }, [addAlert]);
    useSecurityGuard({ addAlert: secAddAlert, enabled: true });
    const clearAlert = useCallback(() => setHackAlert(null), []);

    /* ── BroadcastChannel — cross-tab real-time sync ── */
    const broadcast = useCrossTabSync(useCallback((msg) => {
        if (msg?.type === 'channel_update' || msg?.type === 'credential_saved') {
            loadStatus();
            csRefresh?.();
        }
    }, []));

    const [tab, setTab] = useState('channels');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    /* ── Integration Hub Auto-Sync (GlobalDataContext + ConnectorSyncContext) ── */
    const hubChannels = useMemo(() => {
        const fromGlobal = (connectors || []).filter(c => c.status === 'connected' || c.status === 'ok')
            .map(c => ({ id: c.channel || c.id, name: c.label || c.name, status: 'connected' }));
        // Merge ConnectorSyncContext channels that GlobalDataContext may miss
        if (csChannels && typeof csChannels === 'object') {
            Object.entries(csChannels).forEach(([chId, info]) => {
                if (info?.connected && !fromGlobal.find(g => g.id === chId)) {
                    const master = CHANNELS_MASTER.find(m => m.id === chId);
                    fromGlobal.push({ id: chId, name: master?.name || chId, status: 'connected' });
                }
            });
        }
        return fromGlobal;
    }, [connectors, csChannels]);

    const TABS = useMemo(() => [
        { id: 'channels', label: `🔌 ${t('omniChannel.tabChannels')}`, desc: t('omniChannel.tabChannelsDesc') },
        { id: 'products', label: `📦 ${t('omniChannel.tabProducts')}`, desc: t('omniChannel.tabProductsDesc') },
        { id: 'orders', label: `📋 ${t('omniChannel.tabOrders')}`, desc: t('omniChannel.tabOrdersDesc') },
        { id: 'inventory', label: `🏭 ${t('omniChannel.tabInventory')}`, desc: t('omniChannel.tabInventoryDesc') },
        { id: 'overview', label: `📊 ${t('omniChannel.tabOverview')}`, desc: t('omniChannel.tabOverviewDesc') },
        { id: 'guide', label: `📖 ${t('omniChannel.tabGuide')}`, desc: t('omniChannel.tabGuideDesc') },
    ], [t]);

    const loadStatus = useCallback(async () => {
        setLoading(true);
        if (IS_DEMO) { setStatus(buildDemoOmniStatus(globalData)); setLoading(false); return; } // 데모: 단일소스 파생(API 미호출)
        const data = await getJson('/api/channel-sync/status');
        /* Merge Integration Hub connectors into channel status */
        if (hubChannels.length > 0 && data?.channels) {
            hubChannels.forEach(hc => {
                const existing = data.channels.find(c => c.id === hc.id);
                if (!existing) data.channels.push({ ...hc, product_count: 0, order_count: 0, revenue: 0 });
            });
        }
        setStatus(data);
        setLoading(false);
        // [현 차수] globalData.orders 의존성 추가: 주문 변동(데모 placeOrder/운영 폴링) 시 채널별 매출/주문 표 재계산
        //   (기존 [hubChannels]만이라 주문 변동 후 정체). 데모=buildDemoOmniStatus 재파생, 운영=status 재조회.
    }, [hubChannels, globalData.orders]);

    // [276차] effect 를 loadStatus 의 identity 대신 안정 원시값(hubChannels 수·주문 수)에만 반응하도록 분리 —
    //   상위 참조(csChannels 등) 가 불안정해도 API 폭주 재발 방지. 최신 loadStatus 는 ref 로 호출.
    const loadStatusRef = useRef(loadStatus);
    loadStatusRef.current = loadStatus;
    useEffect(() => { loadStatusRef.current(); }, [hubChannels.length, globalData.orders?.length]);

    const plan = status?.plan || '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
          {/* Fixed header zone */}
          <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
            {/* Security Alert */}
            {hackAlert && (
              <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:99999, background:'rgba(239,68,68,0.95)', backdropFilter:'blur(10px)', border:'1px solid #fca5a5', padding:'16px 24px', borderRadius:12, color:'#fff', fontWeight:900, fontSize:13, boxShadow:'0 20px 40px rgba(220,38,38,0.4)', display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize: 24 }}>🛡️</span><span>{hackAlert}</span>
                <button onClick={clearAlert} style={{ marginLeft:20, background:'#fff', border:'none', color:'#1f2937', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontWeight:700 }}>✕</button>
              </div>
            )}
            {/* Hero */}
            <div style={{ background:'linear-gradient(135deg,#eff6ff,#f0f9ff)', borderRadius:16, padding:'13px 24px', border:'1px solid #bfdbfe', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#2563eb' }}>🌐 {t('omniChannel.heroTitle')}</div>
                  <div style={{ fontSize:13, color:'#374151', marginTop:4 }}>{t('omniChannel.heroDesc')}</div>
                  <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#dbeafe', color:'#2563eb', border:'1px solid #93c5fd' }}>{t('omniChannel.badgeChannelCount').replace('{{n}}',CHANNELS_MASTER.length)}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#d1fae5', color:'#059669', border:'1px solid #6ee7b7' }}>{t('omniChannel.badgeRegion')}</span>
                    {plan==='pro'
                      ?<span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#ede9fe', color:'#7c3aed', border:'1px solid #c4b5fd' }}>⚡ {t('omniChannel.badgeProInteg')}</span>
                      :<span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#ede9fe', color:'#7c3aed', border:'1px solid #c4b5fd' }}>🎮 {t('omniChannel.badgeFree')}</span>}
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#dbeafe', color:'#3b82f6', border:'1px solid #93c5fd' }}>{t('omniChannel.badgeOrderMgmt').replace('{{n}}',orderStats?.count||0)}</span>
                    {hubChannels.length>0&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:20, background:'#d1fae5', color:'#22c55e', border:'1px solid #86efac' }}>🔗 {t('omniChannel.autoSyncActive')} ({hubChannels.length})</span>}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'#6b7280' }}>{t('omniChannel.unifiedRevenue')}</div>
                  <div style={{ fontSize:26, fontWeight:900, color:'#22c55e' }}>{fmt(status?.totals?.revenue||0)}</div>
                  <button onClick={()=>navigate('/wms-manager')} style={{ marginTop:8, padding:'5px 12px', borderRadius:8, border:'1px solid #d1d5db', background:'#fff', color:'#6b7280', fontSize:10, cursor:'pointer' }}>{t('omniChannel.warehouseStock')}</button>
                </div>
              </div>
            </div>
            {/* Live Sync */}
            {isDemo&&<div style={{ fontSize:11, color:'#ef4444', marginBottom:6, fontWeight:700 }}>🔒 {t('omniChannel.demoIsolation','Demo environment — data isolated from production')}</div>}
            <div style={{ fontSize:11, color:'#22c55e', marginBottom:10 }}>● {t('omniChannel.liveSyncMsg')}</div>
            {/* Fixed Sub-tabs */}
            <div className="page-subtabs" style={{ display:'flex', gap:4, padding:'5px', background:'#f1f5f9', borderRadius:14, flexWrap:'wrap', marginBottom:12 }}>
              {TABS.map(tb=>(
                <button key={tb.id} onClick={()=>setTab(tb.id)}
                  style={{ padding:'8px 14px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, background:tab===tb.id?'#2563eb':'#ffffff', color:tab===tb.id?'#ffffff':'#374151', transition:'all 150ms' }}>
                  <div>{tb.label}</div>
                  <div style={{ fontSize:10, fontWeight:400, opacity:0.7, marginTop:1 }}>{tb.desc}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Scrollable content */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px' }}>
            {/* [현 차수] 특정상품 채널 조회 — 선택 시 그 상품 매출·주문·채널/국가별을 인라인(주문 SSOT). 아래 채널/주문/재고는 전체 기준. */}
            <div style={{ marginBottom: 16, display: 'grid', gap: 12 }}>
              <ProductSelectBar />
              <ProductMarketingPanel period="monthly" />
            </div>
            {tab==='channels'&&<ChannelTab channelStatus={status} onRefresh={()=>{loadStatus();broadcast('channel_update',{});}} plan={plan} isDemo={isDemo} t={t} csIsConnected={csIsConnected}/>}
            {tab==='products'&&<ProductsTab t={t}/>}
            {tab==='orders'&&<OrdersTab t={t}/>}
            {tab==='inventory'&&<InventoryTab t={t}/>}
            {tab==='overview'&&<OverviewTab channelStatus={status} t={t}/>}
            {tab==='guide'&&<GuideTab t={t}/>}
          </div>
        </div>
    );
}

export default function OmniChannel() {
    return (
        <PlanGate feature="omni_channel">
            <OmniChannelInner />
        </PlanGate>
    );
}
