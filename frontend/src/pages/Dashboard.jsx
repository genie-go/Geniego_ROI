import { useAuth } from '../auth/AuthContext';

const IS_DEMO = () => typeof window !== 'undefined' && localStorage.getItem('genie_has_real_keys') !== '1';

// ─────────────────────────────────────────────────────────────────────────
//  Geniego-ROI  |  메인 Dashboard (Premium Visual Edition)
//  7개 Tab: Unified현황 / MarketingPerformance / ChannelKPI / 커머스정산 / Revenue현황 / AI인플루언서 / 시스템현황
// ─────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/index.js';
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import DashOverview from '../components/dashboards/DashOverview.jsx';
import DashMarketing from '../components/dashboards/DashMarketing.jsx';
import DashChannelKPI from '../components/dashboards/DashChannelKPI.jsx';
import DashCommerce from '../components/dashboards/DashCommerce.jsx';
import DashInfluencer from '../components/dashboards/DashInfluencer.jsx';
import DashSystem from '../components/dashboards/DashSystem.jsx';
import DashSalesGlobal from '../components/dashboards/DashSalesGlobal.jsx';

import { useT } from '../i18n/index.js';
/* ── Tab 정의 (i18n Apply은 Component 내에서 useMemo로) ─────────────────────── */
const DASHBOARD_DEFS = [
  { id: 'overview', icon: '🏠', color: '#4f8ef7', component: null },
  { id: 'marketing', icon: '📈', color: '#ec4899', component: DashMarketing },
  { id: 'channel', icon: '📡', color: '#22c55e', component: DashChannelKPI },
  { id: 'commerce', icon: '🛒', color: '#f97316', component: DashCommerce },
  { id: 'sales', icon: '🌍', color: '#14d9b0', component: DashSalesGlobal },
  { id: 'influencer', icon: '🤝', color: '#a855f7', component: DashInfluencer },
  { id: 'system', icon: '🖥️', color: '#14d9b0', component: DashSystem },
];

/* ── 공통 유틸 ───────────────────────────────────────────────────────────── */
function fmt(n, { prefix = '', suffix = '', digits = 1 } = {}) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return prefix + (n / 1e9).toFixed(digits) + 'B' + suffix;
  if (abs >= 1e6) return prefix + (n / 1e6).toFixed(digits) + 'M' + suffix;
  if (abs >= 1e3) return prefix + (n / 1e3).toFixed(digits) + 'K' + suffix;
  return prefix + Number(n).toFixed(digits) + suffix;
}
function seedSpark(base, len = 20, vol = 0.08) {
  return Array.from({ length: len }, (_, i) =>
    Math.abs(base) * (1 - vol + (Math.sin(i * 0.8 + base * 0.01) + 1) * vol)
  );
}

// ── 미니 스파크라인 ──────────────────────────────────────────────────────
function Spark({ data = [], color = '#4f8ef7', h = 36, w = 90, area = false }) {
  if (data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`).join(' ');
  const lx = w, ly = h - ((data[data.length - 1] - mn) / rng) * h;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      {area && <polygon points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity={0.1} />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill={color} />
    </svg>
  );
}

// ── KPI Card (Overview용) ────────────────────────────────────────────────
function KpiCard({ label, value, sub, change, color, spark, icon }) {
    const { t } = useI18n();

  const up = change >= 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${color}25`,
      borderRadius: 14,
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top 컬러 바 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}44)`, borderRadius: '14px 14px 0 0' }} />
      {/* Background Icon */}
      <div style={{ position: 'absolute', right: 12, top: 12, fontSize: 28, opacity: 0.08 }}>{icon}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{sub}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
        <div>
          <span style={{ fontSize: 11, color: up ? '#4ade80' : '#f87171', fontWeight: 700 }}>
            {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 5 }}>{t('dash.vsYesterday')}</span>
        </div>
        <Spark data={spark} color={color} h={34} w={82} area />
      </div>
    </div>
  );
}

// ── Channel In Progress 행 ─────────────────────────────────────────────────────────
function ChannelBar({ name, rev, pct, color, icon, totalRev }) {
    const { t } = useI18n();

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
          <span>{icon}</span>{name}
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>₩{rev.toLocaleString()}K</span>
          <span style={{ fontSize: 11, color, fontWeight: 800, minWidth: 30, textAlign: 'right' }}>{((rev / totalRev) * 100).toFixed(0)}%</span>
        </div>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 4, transition: 'width 0.8s ease', position: 'relative' }}>
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
        </div>
      </div>
    </div>
  );
}

// ── Tab Select기 ────────────────────────────────────────────────────────────
function DashSelector({ active, onSelect, dashboards }) {
    const { t } = useI18n();

  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap',
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '8px 10px',
      backdropFilter: 'blur(8px)',
    }}>
      {dashboards.map(d => {
        const isActive = active === d.id;
        return (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            title={d.desc}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
              background: isActive ? d.color : 'transparent',
              color: isActive ? 'white' : 'rgba(255,255,255,0.45)',
              boxShadow: isActive ? `0 4px 20px ${d.color}50` : 'none',
              transform: isActive ? 'translateY(-1px)' : 'none',
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
          >
            <span style={{ fontSize: 15 }}>{d.icon}</span>
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Unified현황 Overview — Platform의 모든 핵심 Metric를 한눈에
   ═══════════════════════════════════════════════════════════════════════════ */
const CHANNELS = !IS_DEMO() ? [] : [
  { name: 'Meta Ads', rev: 2840, pct: 78, color: '#4f8ef7', icon: '📘' },
  { name: 'Google', rev: 3100, pct: 88, color: '#22c55e', icon: '🔍' },
  { name: 'TikTok', rev: 1920, pct: 62, color: '#a855f7', icon: '🎵' },
  { name: 'Coupang', rev: 2200, pct: 72, color: '#14d9b0', icon: '🛒' },
  { name: 'Naver', rev: 1800, pct: 68, color: '#f97316', icon: '🟠' },
  { name: 'Amazon', rev: 1780, pct: 59, color: '#eab308', icon: '📦' },
];

const SYSTEMS_STATUS = [
  { name: 'Backend API', status: 'ok', ms: 48 },
  { name: 'Attribution', status: 'ok', ms: 85 },
  { name: 'KR Channel Sync', status: 'ok', ms: 66 },
  { name: 'Price Opt Engine', status: 'ok', ms: 120 },
  { name: 'Graph Scoring', status: 'warn', ms: 210 },
  { name: 'Alert Engine', status: 'warn', ms: 340 },
];

const MODULES_NAV = [
  { icon: '🎯', label: 'Attribution', color: '#4f8ef7', to: '/attribution', kpi: 'Attribution Trust 91%' },
  { icon: '🕸️', label: 'Graph Score', color: '#a855f7', to: '/graph-score', kpi: '230 Nodes' },
  { icon: '🇰🇷', label: 'KR Channel', color: '#14d9b0', to: '/kr-channel', kpi: 'Match Rate 97.6%' },
  { icon: '💡', label: 'Price Opt', color: '#eab308', to: '/price-opt', kpi: 'Margin +8.4%' },
  { icon: '📣', label: 'Marketing', color: '#ec4899', to: '/marketing', kpi: 'ROAS 3.84x' },
  { icon: '🤝', label: 'Influencer', color: '#6366f1', to: '/influencer', kpi: '5 creators · ₩159.8M' },
  { icon: '💰', label: 'Reconcile', color: '#22c55e', to: '/reconciliation', kpi: 'Match Rate 97.6%' },
  { icon: '🚨', label: 'Alerts', color: '#ef4444', to: '/alert-policies', kpi: '3 Active' },
  { icon: '🤖', label: 'AI Policy', color: '#8b5cf6', to: '/ai-policy', kpi: '5 Proposals' },
];

const ACTIVITIES = !IS_DEMO() ? [] : [
  { dot: '#22c55e', text: 'v423 deployed — Settlement 5-tab live server applied', time: '2 min ago', icon: '✅' },
  { dot: '#4f8ef7', text: 'Meta campaign Spring_KR — ROAS 4.2x achieved', time: '8 min ago', icon: '📈' },
  { dot: '#14d9b0', text: 'Coupang settlement 1,240 records ingested', time: '15 min ago', icon: '💰' },
  { dot: '#eab308', text: 'TikTok ad set budget alert (92%)', time: '22 min ago', icon: '⚠️' },
  { dot: '#22c55e', text: 'Graph Scoring batch complete (230 nodes)', time: '34 min ago', icon: '🕸️' },
  { dot: '#4f8ef7', text: 'Amazon SP-API inventory sync', time: '58 min ago', icon: '📦' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   스마트 홈 Panel — 역할 기반 "Today 할 일" + Quick Win
   ═══════════════════════════════════════════════════════════════════════════ */
const ROLE_QUICK_STARTS = {
  marketer: [
    { icon: '🚨', label: 'Meta ROAS Alert', desc: 'ROAS 1.8x — Creative replacement recommended', color: '#ef4444', to: '/attribution' },
    { icon: '📣', label: 'AI Campaign Creation', desc: 'Optimal send time today: 7 PM', color: '#ec4899', to: '/auto-marketing' },
    { icon: '👥', label: 'VIP Segment', desc: '42 new VIP members auto-classified', color: '#a855f7', to: '/crm' },
  ],
  commerce: [
    { icon: '⚠️', label: 'Low Stock 12 Items', desc: 'Nintendo Switch + 11 others below safety stock', color: '#f97316', to: '/wms' },
    { icon: '📦', label: 'Unprocessed Orders 87', desc: 'Orders over 6 hours need processing', color: '#4f8ef7', to: '/order-hub' },
    { icon: '↩️', label: 'Returns Approval 23', desc: 'Pending return approval', color: '#14d9b0', to: '/returns-portal' },
  ],
  finance: [
    { icon: '💹', label: "Today's Net Profit", desc: '₩12.4M (+8.3% vs target)', color: '#22c55e', to: '/pnl-dashboard' },
    { icon: '💳', label: 'Settlement Mismatch 3', desc: 'Coupang ₩840K difference check needed', color: '#eab308', to: '/reconciliation' },
    { icon: '📄', label: 'Monthly Report', desc: 'This month report ready to generate', color: '#4f8ef7', to: '/report-builder' },
  ],
  ops: [
    { icon: '🚚', label: 'Shipping Delays 5', desc: 'CJ Logistics Gangseo-gu delay', color: '#ef4444', to: '/supply-chain' },
    { icon: '🌏', label: 'Customs Pending 2', desc: 'Japan→Korea clearance docs needed', color: '#f97316', to: '/asia-logistics' },
    { icon: '📦', label: 'Incoming Inspection', desc: '34 pallets due at 2 PM', color: '#4f8ef7', to: '/wms' },
  ],
  developer: [
    { icon: '🔴', label: 'DLQ Errors 3', desc: 'Payment webhook failure reprocessing needed', color: '#ef4444', to: '/system-monitor' },
    { icon: '🔑', label: 'API Key Expiring', desc: 'Shopify key expires in 7 days', color: '#f97316', to: '/api-keys' },
    { icon: '📊', label: 'New Event Schema', desc: 'checkout_v2 schema review pending', color: '#4f8ef7', to: '/data-schema' },
  ],
};

function SmartHomePanel({ navigate }) {
    const { t } = useI18n();

  const savedRole = (() => { try { return JSON.parse(localStorage.getItem('g_smart_onboarding') || '{}').role || null; } catch { return null; } })();
  const [role, setRole] = React.useState(savedRole);
  const [dismissed, setDismissed] = React.useState(() => { try { return localStorage.getItem('g_smarthome_dismissed') === '1'; } catch { return false; } });
  const roleItems = role ? (ROLE_QUICK_STARTS[role] || []) : [];
  const ROLE_META = { marketer: { label: 'Marketer', icon: '📣', color: '#ec4899' }, commerce: { label: 'Commerce', icon: '🛒', color: '#f97316' }, finance: { label: 'Finance/CEO', icon: '📊', color: '#22c55e' }, ops: { label: 'Operations', icon: '⚙️', color: '#a855f7' }, developer: { label: 'Developer', icon: '💻', color: '#14d9b0' } };
  const rm = role ? ROLE_META[role] : null;

  if (dismissed) return null;

  // No role selected → guide to onboarding
  if (!role) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', border: '1px solid rgba(79,142,247,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(79,142,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🚀</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{t('dash.selectRoleTitle')}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{t('dash.selectRoleDesc')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/onboarding')} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>{t('dash.selectRoleBtn')}</button>
          <button onClick={() => { setDismissed(true); localStorage.setItem('g_smarthome_dismissed', '1'); }} style={{ padding: '9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{rm?.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: rm?.color }}>{rm?.label} {t('dash.mode')}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t('dash.todayTasks')}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => navigate('/onboarding')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>{t('dash.changeRole')}</button>
          <button onClick={() => { setDismissed(true); localStorage.setItem('g_smarthome_dismissed', '1'); }} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>✕</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {roleItems.map((item, i) => (
          <button key={i} onClick={() => navigate(item.to)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: `${item.color}08`, border: `1px solid ${item.color}22`, cursor: 'pointer', textAlign: 'left', transition: 'all 180ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${item.color}18`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${item.color}08`; e.currentTarget.style.transform = 'none'; }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: item.color, marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewDash({ ticker }) {
    const { t } = useI18n();

  const navigate = useNavigate();
  const { fmt: fmtCurrency } = useCurrency();
  const base = useMemo(() => ({
    grossRev: 1_284_720 + Math.random() * 5000,
    adSpend: 312_800 + Math.random() * 2000,
    roas: 3.84 + Math.random() * 0.1,
    orders: 18_340 + Math.floor(Math.random() * 50),
    convRate: 3.84 + Math.random() * 0.2,
    avgOrder: 70120 + Math.random() * 2000,
  }), [ticker]); // eslint-disable-line

  const sp = useMemo(() => ({
    gross: seedSpark(base.grossRev, 22),
    spend: seedSpark(base.adSpend, 22),
    roas: seedSpark(base.roas * 100, 22, 0.05),
    orders: seedSpark(base.orders, 22),
    conv: seedSpark(base.convRate * 100, 22, 0.08),
    aov: seedSpark(base.avgOrder, 22, 0.04),
  }), [base]);

  const totalRev = CHANNELS.reduce((s, c) => s + c.rev, 0);
  const sysOk = SYSTEMS_STATUS.filter(s => s.status === 'ok').length;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* ── Smart Home Panel ─────────────────────────────────────────────── */}
      <SmartHomePanel navigate={navigate} />

      {/* ── Row 1: KPI 6 columns ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
        <KpiCard icon="💰" label={t("dashboard.grossRevenue")} value={fmtCurrency(base.grossRev, { compact: true })} sub={t("dashboard.grossRevSub")} change={8.3} color="#4f8ef7" spark={sp.gross} />
        <KpiCard icon="📢" label={t("dashboard.adSpend")} value={fmtCurrency(base.adSpend, { compact: true })} sub={t("dashboard.adSpendSub")} change={-2.4} color="#f97316" spark={sp.spend} />
        <KpiCard icon="📈" label={t("dashboard.netROAS")} value={base.roas.toFixed(2) + "x"} sub={t("dashboard.netROASSub")} change={12.8} color="#22c55e" spark={sp.roas} />
        <KpiCard icon="📦" label={t("dashboard.totalOrders")} value={base.orders.toLocaleString()} sub={t("dashboard.totalOrderSub")} change={6.2} color="#a855f7" spark={sp.orders} />
        <KpiCard icon="🎯" label={t("dashboard.convRateLbl")} value={base.convRate.toFixed(2) + "%"} sub={t("dashboard.convRateSub")} change={3.5} color="#ec4899" spark={sp.conv} />
        <KpiCard icon="🧾" label={t("dashboard.avgOrder")} value={fmtCurrency(base.avgOrder, { compact: true })} sub="AOV" change={1.9} color="#14d9b0" spark={sp.aov} />
      </div>

      {/* ── Row 2: Channel Mix(1.4fr) + Activity Feed(1fr) + System(0.8fr) ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: 12 }}>

        {/* Channel Revenue Mix */}
        <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{t('dash.channelMix')}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6 }}>₩{totalRev.toLocaleString()}K Total</div>
          </div>
          {CHANNELS.map(c => (
            <ChannelBar key={c.name} {...c} totalRev={totalRev} />
          ))}
        </div>

        {/* Live Activity Feed */}
        <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'rgba(255,255,255,0.85)' }}>{t('dash.liveActivity')}</div>
          {ACTIVITIES.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.025)', borderRadius: 8, borderLeft: `2px solid ${a.dot}` }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>{a.text}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* System Status */}
        <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{t('dash.sysStatus')}</div>
            <div style={{ fontSize: 10, background: sysOk === SYSTEMS_STATUS.length ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)', color: sysOk === SYSTEMS_STATUS.length ? '#4ade80' : '#fde047', border: `1px solid ${sysOk === SYSTEMS_STATUS.length ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`, padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
              {sysOk}/{SYSTEMS_STATUS.length} OK
            </div>
          </div>
          {SYSTEMS_STATUS.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', marginBottom: 6, borderRadius: 8,
              background: s.status === 'ok' ? 'rgba(34,197,94,0.05)' : 'rgba(234,179,8,0.06)',
              border: `1px solid ${s.status === 'ok' ? 'rgba(34,197,94,0.13)' : 'rgba(234,179,8,0.14)'}`,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.status === 'ok' ? '#22c55e' : '#eab308', flexShrink: 0, boxShadow: `0 0 5px ${s.status === 'ok' ? '#22c55e' : '#eab308'}` }} />
              <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: s.ms > 200 ? '#eab308' : '#22c55e', fontWeight: 700 }}>{s.ms}ms</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 3: Module Shortcuts Grid ──────────────────────────────────── */}
      <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{t('dash.moduleShortcuts')}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{t('dash.analyticsModules')}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 8 }}>
          {MODULES_NAV.map(m => (
            <button key={m.label} onClick={() => navigate(m.to)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '12px 6px', background: `${m.color}0d`, border: `1px solid ${m.color}22`,
                borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                textAlign: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${m.color}20`; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${m.color}25`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${m.color}0d`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.icon}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{t(`dash.${m.label.replace(/[^a-zA-Z]/g, '')}`)}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{m.kpi}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   메인 Component
   ───────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {

  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  // i18n 동적 Tab 정의
  const DASHBOARDS = useMemo(() => DASHBOARD_DEFS.map(d => ({
    ...d,
    label: t(`tabs.${d.id}`),
    desc: t(`tabs.${d.id}Desc`),
  })), [t]);

  const navigate = useNavigate();
  const location = useLocation();
  const [activeDash, setActiveDash] = useState(() => {
    const urlView = searchParams.get('view');
    if (urlView && DASHBOARD_DEFS.find(d => d.id === urlView)) return urlView;
    try { return localStorage.getItem('dashboard_view') || 'overview'; } catch { return 'overview'; }
  });
  const [ticker, setTicker] = useState(0);
  const [now, setNow] = useState(new Date());

  // 신규가입 Coupon 토스트 (navigate state의 couponAlert 취득)
  const [couponToast, setCouponToast] = useState(() => location.state?.couponAlert || null);
  useEffect(() => {
    if (couponToast) {
      const timer = setTimeout(() => setCouponToast(null), 8000);
      // state 제거 (브라우저 Back가기 시 재표시 방지)
      window.history.replaceState({}, '', location.pathname);
      return () => clearTimeout(timer);
    }
  }, [couponToast, location.pathname]);

  useEffect(() => {
    const id = setInterval(() => { setTicker(t => t + 1); setNow(new Date()); }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleSelect = useCallback((id) => {
    setActiveDash(id);
    try { localStorage.setItem('dashboard_view', id); } catch { }
  }, []);

  const currentDash = DASHBOARDS.find(d => d.id === activeDash);
  const DashComp = currentDash?.component;

  return (
    <div style={{ display: 'grid', gap: 12, padding: 4 }}>

      {/* ── Coupon Issue 토스트 Banner ────────────────────────────────── */}
      {couponToast && (
        <div style={{
          padding: '16px 20px', borderRadius: 14,
          background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(79,142,247,0.08))',
          border: '1.5px solid rgba(34,197,94,0.4)',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          animation: 'fadeIn 0.4s ease',
          boxShadow: '0 8px 32px rgba(34,197,94,0.15)',
        }}>
          <span style={{ fontSize: 28 }}>🎁</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: '#22c55e', marginBottom: 3 }}>
              Coupon 즐시 Issue Done!
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              {couponToast.message || `🎉 ${couponToast.plan} 플랜 ${couponToast.duration_days}일 이용권이 신규가입과 동시에 Apply되었습니다!`}
            </div>
            {couponToast.code && (
              <div style={{ fontSize: 11, color: '#f59e0b', fontFamily: 'monospace', marginTop: 4 }}>
                Coupon Code: <strong>{couponToast.code}</strong>
                {couponToast.expires_at && ` · Expired: ${new Date(couponToast.expires_at).toLocaleDateString('ko-KR')}`}
              </div>
            )}
          </div>
          <button onClick={() => setCouponToast(null)} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7,
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: '4px 10px', fontSize: 12,
          }}>✕</button>
        </div>
      )}

      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <div className="hero fade-up" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${currentDash?.color ?? '#4f8ef7'}44, ${currentDash?.color ?? '#4f8ef7'}18)`, border: `1px solid ${currentDash?.color ?? '#4f8ef7'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {currentDash?.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: currentDash?.color ?? '#4f8ef7', letterSpacing: '-0.3px', textShadow: `0 0 24px ${currentDash?.color ?? '#4f8ef7'}55` }}>
                {currentDash?.label}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>{currentDash?.desc}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', fontFamily: 'monospace' }}>
              {now.toLocaleTimeString()} · {ticker > 0 ? `${ticker * 5}s ago` : 'Live'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '4px 10px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Select기 ──────────────────────────────────────────────────── */}
      <DashSelector active={activeDash} onSelect={handleSelect} dashboards={DASHBOARDS} />

      {/* ── Dashboard 콘텐츠 ─────────────────────────────────────────────── */}
      <div className="fade-up">
        {activeDash === 'overview' && <OverviewDash ticker={ticker} />}
        {DashComp && <DashComp ticker={ticker} />}
      </div>
    </div>
  );
}
