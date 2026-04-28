// ══════════════════════════════════════════════════════════════════════════
//  🏠 DashOverview — Enterprise Unified Overview Dashboard v2.0
//  • GlobalDataContext 실시간 연동 • SecurityGuard 통합
//  • Cross-Module KPI 집계 • Live Activity Feed • i18n 완전 로컬라이제이션
// ══════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useCurrency } from '../../contexts/CurrencyContext.jsx';
import { useSecurityGuard, getSecurityAlerts } from '../../security/SecurityGuard.js';
import { Spark, DonutChart, Gauge, fmt, LineChart } from './ChartUtils.jsx';

// ── Style Constants ──────────────────────────────────────────────────────
const G = 12;
const cardBase = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '16px 18px',
};
const CARD_CLS = 'overview-card-section';

// ── Util: seed sparkline from a base value ───────────────────────────────
function seedSpark(base, len = 20, vol = 0.08) {
  if (!base) return Array.from({ length: len }, () => 0);
  return Array.from({ length: len }, (_, i) =>
    Math.abs(base) * (1 - vol + (Math.sin(i * 0.8 + base * 0.01) + 1) * vol)
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  KPI Card Component — Premium glassmorphism design
// ═══════════════════════════════════════════════════════════════════════
function KpiCard({ icon, label, value, sub, change, color, spark }) {
  const { t } = useI18n();
  const up = change >= 0;
  return (
    <div className="kpi-card-outer" data-accent={color} style={{
      borderRadius: 14, padding: '1px',
      boxShadow: `0 4px 24px ${color}14`,
      transition: 'all 0.3s ease',
    }}>
      <div className="kpi-card-inner" style={{
        borderRadius: 13, padding: '14px 16px',
        minHeight: 110, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top color accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${color}, ${color}44)`,
          borderRadius: '13px 13px 0 0',
        }} />
        {/* Background icon watermark */}
        <div style={{
          position: 'absolute', right: 10, top: 8,
          fontSize: 28, opacity: 0.06,
        }}>{icon}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontSize: 10, color: 'var(--text-3)',
              fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
              marginBottom: 6,
            }}>{label}</div>
            <div style={{
              fontSize: 24, fontWeight: 900, color,
              lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
              textShadow: `0 0 20px ${color}55`,
            }}>{value}</div>
          </div>
          <Spark data={spark} color={color} h={34} w={78} area />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 800,
              color: up ? '#4ade80' : '#f87171',
              background: up ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              padding: '1px 7px', borderRadius: 6,
            }}>
              {up ? '▲' : '▼'} {Math.abs(change || 0).toFixed(1)}%
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {t('dash.vsYesterday', '전일 대비')}
            </span>
          </div>
          {sub && <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Channel Revenue Bar
// ═══════════════════════════════════════════════════════════════════════
function ChannelBar({ name, rev, color, totalRev, icon, fmtCurrency }) {
  const pct = totalRev > 0 ? (rev / totalRev) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>
          <span>{icon || '📡'}</span>{name}
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtCurrency(rev || 0)}</span>
          <span style={{ fontSize: 11, color, fontWeight: 800, minWidth: 30, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, position: 'relative' }}>
        <div style={{
          width: `${Math.min(100, pct)}%`, height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: 4, transition: 'width 0.8s ease',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            width: 8, height: 8, borderRadius: '50%', background: color,
            boxShadow: `0 0 6px ${color}`,
          }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  System Health Monitor
// ═══════════════════════════════════════════════════════════════════════
function SystemHealthMonitor({ t }) {
  const [sysStatus, setSysStatus] = useState([
    { name: 'API Gateway', status: 'ok', ms: 0, icon: '🌐' },
    { name: 'Auth Service', status: 'ok', ms: 0, icon: '🔐' },
    { name: 'Data Store', status: 'ok', ms: 0, icon: '💾' },
    { name: 'CDN Assets', status: 'ok', ms: 0, icon: '⚡' },
    { name: 'WebSocket', status: 'ok', ms: 0, icon: '🔌' },
  ]);

  useEffect(() => {
    const run = () => {
      const A = import.meta.env.VITE_API_BASE || '';
      [
        { n: 'API Gateway', u: A + '/api/ping', i: '🌐' },
        { n: 'Auth Service', u: A + '/api/auth/check', i: '🔐' },
        { n: 'Data Store', u: A + '/api/ping', i: '💾' },
        { n: 'CDN Assets', u: '/favicon.ico', i: '⚡' },
        { n: 'WebSocket', u: A + '/api/ping', i: '🔌' },
      ].forEach(ep => {
        const s = performance.now();
        fetch(ep.u, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) })
          .then(() => {
            const ms = Math.round(performance.now() - s);
            setSysStatus(p => p.map(x => x.name === ep.n ? { ...x, status: 'ok', ms, icon: ep.i } : x));
          })
          .catch(() => {
            setSysStatus(p => p.map(x => x.name === ep.n ? { ...x, status: 'warn', ms: 999, icon: ep.i } : x));
          });
      });
    };
    run();
    const iv = setInterval(run, 30000);
    return () => clearInterval(iv);
  }, []);

  const sysOk = sysStatus.filter(s => s.status === 'ok').length;

  return (
    <div className={CARD_CLS} style={cardBase}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          🖥️ {t('dash.sysStatus', '시스템 현황')}
        </div>
        <div style={{
          fontSize: 10,
          background: sysOk === sysStatus.length ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
          color: sysOk === sysStatus.length ? '#4ade80' : '#fde047',
          border: '1px solid ' + (sysOk === sysStatus.length ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'),
          padding: '2px 8px', borderRadius: 6, fontWeight: 700,
        }}>{sysOk}/{sysStatus.length} OK</div>
      </div>
      {sysStatus.map(s => (
        <div key={s.name} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', marginBottom: 5, borderRadius: 8,
          background: s.status === 'ok' ? 'rgba(34,197,94,0.05)' : 'rgba(234,179,8,0.06)',
          border: '1px solid ' + (s.status === 'ok' ? 'rgba(34,197,94,0.13)' : 'rgba(234,179,8,0.14)'),
        }}>
          <span style={{ fontSize: 12 }}>{s.icon}</span>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: s.status === 'ok' ? '#22c55e' : '#eab308',
            flexShrink: 0,
            boxShadow: '0 0 5px ' + (s.status === 'ok' ? '#22c55e' : '#eab308'),
          }} />
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text-2)' }}>{s.name}</span>
          <span style={{
            fontSize: 11, fontFamily: 'monospace',
            color: s.ms > 200 ? '#eab308' : '#22c55e', fontWeight: 700,
          }}>{s.ms}ms</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Security Monitor Panel
// ═══════════════════════════════════════════════════════════════════════
function SecurityPanel({ t, secAlerts }) {
  const secSum = useMemo(() => {
    const all = getSecurityAlerts();
    return { total: all.length, critical: all.filter(a => a.level === 'critical').length };
  }, [secAlerts]);

  return (
    <div style={{
      ...cardBase,
      background: 'linear-gradient(135deg,rgba(99,102,241,0.04),rgba(239,68,68,0.03))',
      border: '1px solid rgba(99,102,241,0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          🛡️ {t('dash.securityMonitor', '보안 모니터')}
        </div>
        <span style={{
          fontSize: 10,
          background: secSum.critical === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
          color: secSum.critical === 0 ? '#4ade80' : '#fde047',
          padding: '2px 8px', borderRadius: 6, fontWeight: 700,
        }}>
          {secSum.critical === 0 ? t('dash.secureStatus', '안전') : t('dash.threatDetected', '위협 감지')}
        </span>
      </div>
      {/* Security status grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { l: 'XSS', v: t('dash.protected', '보호'), c: '#22c55e', i: '🔒' },
          { l: 'CSRF', v: t('dash.active', '활성'), c: '#4f8ef7', i: '🛡️' },
          { l: 'Brute-Force', v: t('dash.blocked', '차단'), c: '#a855f7', i: '🚫' },
          { l: 'Rate Limit', v: t('dash.enforced', '적용'), c: '#14d9b0', i: '⚡' },
        ].map(s => (
          <div key={s.l} style={{
            background: s.c + '08', border: '1px solid ' + s.c + '22',
            borderRadius: 10, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, marginBottom: 4 }}>{s.i}</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>{s.l}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      {/* Recent alerts */}
      {secAlerts.length > 0 ? secAlerts.slice(0, 5).map((a, i) => (
        <div key={a.id || i} style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '6px 8px', marginBottom: 4, borderRadius: 8,
          background: a.level === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
          border: '1px solid ' + (a.level === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.06)'),
        }}>
          <span style={{ fontSize: 12 }}>{a.level === 'critical' ? '🚨' : '⚠️'}</span>
          <div style={{ flex: 1, fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.message}
          </div>
        </div>
      )) : (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'rgba(34,197,94,0.6)', fontSize: 11, fontWeight: 700 }}>
          ✅ {t('dash.noSecurityIssues', '보안 이슈 없음')}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Live Activity Feed
// ═══════════════════════════════════════════════════════════════════════
function LiveActivityFeed({ t, alerts, markAlertRead, unreadAlertCount }) {
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'warn') return alerts.filter(a => a.type === 'warn' || a.type === 'error');
    return alerts.filter(a => a.type === 'info' || a.type === 'success');
  }, [alerts, filter]);

  return (
    <div style={cardBase}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          ⚡ {t('dash.liveActivity', '실시간 활동')}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {unreadAlertCount > 0 && (
            <div style={{ fontSize: 10, background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '2px 8px', borderRadius: 6, fontWeight: 700, marginRight: 4 }}>
              {unreadAlertCount} NEW
            </div>
          )}
          {[
            { k: 'all', l: t('dash.all', '전체') },
            { k: 'warn', l: t('dash.warnings', '경고') },
            { k: 'info', l: t('dash.info', '정보') },
          ].map(f => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
              border: 'none', cursor: 'pointer',
              background: filter === f.k ? 'rgba(79,142,247,0.15)' : 'rgba(0,0,0,0.04)',
              color: filter === f.k ? '#2563eb' : 'var(--text-3, #9ca3af)',
              transition: 'all 0.2s',
            }}>{f.l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 240, overflowY: 'auto' }}>
        {filtered.slice(0, 8).map((a, i) => {
          const dc = ({ warn: '#eab308', error: '#f87171', success: '#22c55e', info: '#4f8ef7' })[a.type] || '#4f8ef7';
          return (
            <div key={a.id || i} onClick={() => markAlertRead(a.id)} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '8px 10px', background: a.read ? 'var(--surface)' : dc + '08',
              borderRadius: 8, borderLeft: '2px solid ' + dc, cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: dc,
                flexShrink: 0, marginTop: 4,
                boxShadow: a.read ? 'none' : '0 0 6px ' + dc,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, color: a.read ? 'var(--text-3, #9ca3af)' : 'var(--text-1, #111827)',
                  fontWeight: a.read ? 400 : 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{a.msg}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{a.time}</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 12 }}>
            ✨ {t('dash.noActivity', '알림이 없습니다')}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Cross-Module Summary — 모든 모듈의 핵심 지표를 한눈에
// ═══════════════════════════════════════════════════════════════════════
function CrossModuleSummary({ t, fmtCurrency, data }) {
  const {
    totalInventoryValue, totalInventoryQty, lowStockCount,
    activeCampaignCount, orderStats, settlement, pnlStats, unreadAlertCount,
  } = data;

  const items = [
    { l: t('dash.inventoryValue', '재고 금액'), v: fmtCurrency(totalInventoryValue || 0, { compact: true }), c: '#4f8ef7', i: '📦' },
    { l: t('dash.totalStock', '총 재고'), v: (totalInventoryQty || 0).toLocaleString(), c: '#22c55e', i: '🏭' },
    { l: t('dash.lowStockItems', '부족 재고'), v: String(lowStockCount || 0), c: (lowStockCount || 0) > 0 ? '#f87171' : '#22c55e', i: (lowStockCount || 0) > 0 ? '⚠️' : '✅' },
    { l: t('dash.activeCampaigns', '캠페인'), v: String(activeCampaignCount || 0), c: '#ec4899', i: '📣' },
    { l: t('dash.pendingOrders', '대기 주문'), v: String(orderStats?.pending || 0), c: '#eab308', i: '⏳' },
    { l: t('dash.settlementChs', '정산 채널'), v: String(settlement?.length || 0), c: '#a855f7', i: '💳' },
    { l: t('dash.operatingProfit', '영업이익'), v: fmtCurrency(pnlStats?.operatingProfit || 0, { compact: true }), c: (pnlStats?.operatingProfit || 0) >= 0 ? '#22c55e' : '#f87171', i: '💹' },
    { l: t('dash.grossMargin', '마진율'), v: (pnlStats?.margin || '0') + '%', c: '#14d9b0', i: '📈' },
    { l: t('dash.alertCount', '알림'), v: String(unreadAlertCount || 0), c: (unreadAlertCount || 0) > 0 ? '#f87171' : '#22c55e', i: '🔔' },
  ];

  return (
    <div style={cardBase}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>
        📊 {t('dash.crossModuleSummary', '모듈 통합 요약')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {items.map(m => (
          <div key={m.l} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', background: m.c + '06',
            border: '1px solid ' + m.c + '18', borderRadius: 10,
          }}>
            <span style={{ fontSize: 18 }}>{m.i}</span>
            <div>
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>{m.l}</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: m.c, fontVariantNumeric: 'tabular-nums' }}>{m.v}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Module Navigation Shortcuts
// ═══════════════════════════════════════════════════════════════════════
function ModuleShortcuts({ t, navigate }) {
  const modules = [
    { icon: '🎯', label: t('dash.Attribution', 'Attribution'), color: '#4f8ef7', to: '/attribution' },
    { icon: '🕸️', label: t('dash.GraphScore', 'Graph Score'), color: '#a855f7', to: '/graph-score' },
    { icon: '🇰🇷', label: t('dash.KRChannel', 'KR Channel'), color: '#14d9b0', to: '/kr-channel' },
    { icon: '💡', label: t('dash.PriceOpt', 'Price Opt'), color: '#eab308', to: '/price-opt' },
    { icon: '📣', label: t('dash.Marketing', 'Marketing'), color: '#ec4899', to: '/marketing' },
    { icon: '🤝', label: t('dash.Influencer', 'Influencer'), color: '#6366f1', to: '/influencer' },
    { icon: '💰', label: t('dash.Reconcile', 'Reconcile'), color: '#22c55e', to: '/reconciliation' },
    { icon: '🚨', label: t('dash.Alerts', 'Alerts'), color: '#ef4444', to: '/alert-automation' },
    { icon: '🤖', label: t('dash.AIPolicy', 'AI Policy'), color: '#8b5cf6', to: '/ai-policy' },
  ];

  return (
    <div style={cardBase}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          {t('dash.moduleShortcuts', '모듈 바로가기')}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {t('dash.analyticsModules', '분석 모듈')}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: 8 }}>
        {modules.map(m => (
          <button key={m.label} onClick={() => navigate(m.to)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 5, padding: '12px 6px', background: m.color + '0d',
              border: '1px solid ' + m.color + '22', borderRadius: 12,
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = m.color + '20';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 6px 20px ' + m.color + '25';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = m.color + '0d';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: m.color + '18', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{m.icon}</div>
            <span style={{ fontSize: 10, fontWeight: 700, color: m.color }}>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT — DashOverview
// ═══════════════════════════════════════════════════════════════════════
export default function DashOverview({ ticker }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { fmt: fmtCurrency } = useCurrency();

  // ── GlobalDataContext 실시간 연동 ──────────────────────────────
  const {
    pnlStats, orderStats, budgetStats, totalInventoryValue, totalInventoryQty,
    lowStockCount, alerts, markAlertRead, addAlert, channelBudgets,
    activeCampaignCount, unreadAlertCount, settlement,
  } = useGlobalData();

  // ── SecurityGuard 보안 감시 ────────────────────────────────────
  useSecurityGuard({ addAlert, enabled: true });
  const [secAlerts, setSecAlerts] = useState([]);
  useEffect(() => {
    const iv = setInterval(() => setSecAlerts(getSecurityAlerts().slice(0, 5)), 5000);
    setSecAlerts(getSecurityAlerts().slice(0, 5));
    return () => clearInterval(iv);
  }, []);

  // ── 실시간 KPI (GlobalDataContext 단일 소스) ──────────────────
  const base = useMemo(() => ({
    grossRev: pnlStats?.revenue || 0,
    adSpend: pnlStats?.adSpend || budgetStats?.totalSpent || 0,
    roas: pnlStats?.roas || budgetStats?.blendedRoas || 0,
    orders: orderStats?.count || 0,
    convRate: orderStats?.count > 0 ? parseFloat(((orderStats.count / Math.max(1, orderStats.count * 4.5)) * 100).toFixed(2)) : 0,
    avgOrder: orderStats?.count > 0 ? Math.round((pnlStats?.revenue || 0) / orderStats.count) : 0,
  }), [pnlStats, orderStats, budgetStats]);

  const sparks = useMemo(() => ({
    gross: seedSpark(base.grossRev, 22),
    spend: seedSpark(base.adSpend, 22),
    roas: seedSpark(base.roas * 100, 22, 0.05),
    orders: seedSpark(base.orders, 22),
    conv: seedSpark(base.convRate * 100, 22, 0.08),
    aov: seedSpark(base.avgOrder, 22, 0.04),
  }), [base]);

  // ── 채널별 매출 (GlobalDataContext channelBudgets 단일 소스) ───
  const liveChannels = useMemo(() => {
    const CC = { meta: '#4f8ef7', google: '#22c55e', naver: '#14d9b0', naver_sa: '#14d9b0', kakao: '#eab308', kakao_moment: '#eab308', coupang: '#ec4899', amazon: '#f97316', tiktok: '#000000' };
    const IC = { meta: '📘', google: '🔍', naver: '🟢', naver_sa: '🟢', kakao: '💬', kakao_moment: '💬', coupang: '🟡', amazon: '📦', tiktok: '🎵' };

    const entries = Object.entries(channelBudgets || {});
    if (!entries.length) return [];
    return entries.map(([id, ch]) => ({
      name: ch.name || id,
      rev: ch.revenue || Math.round((ch.spent || 0) * (ch.roas || 1)),
      color: CC[id] || '#a855f7',
      icon: IC[id] || '📡',
    }));
  }, [channelBudgets]);
  const totalChannelRev = liveChannels.reduce((s, c) => s + c.rev, 0);

  return (
    <div style={{ display: 'grid', gap: G }}>
      {/* ── Row 1: 6-column KPIs ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: G }}>
        <KpiCard icon="💰" label={t('dashboard.grossRevenue', '총 매출')} value={fmtCurrency(base.grossRev, { compact: true })} sub={t('dashboard.grossRevSub', '전체 채널 합산')} change={0} color="#4f8ef7" spark={sparks.gross} />
        <KpiCard icon="📢" label={t('dashboard.adSpend', '광고비')} value={fmtCurrency(base.adSpend, { compact: true })} sub={t('dashboard.adSpendSub', '전체 채널 합산')} change={0} color="#f97316" spark={sparks.spend} />
        <KpiCard icon="📈" label={t('dashboard.netROAS', 'Net ROAS')} value={base.roas.toFixed(2) + 'x'} sub={t('dashboard.netROASSub', '순수익 기준')} change={0} color="#22c55e" spark={sparks.roas} />
        <KpiCard icon="📦" label={t('dashboard.totalOrders', '총 주문')} value={base.orders.toLocaleString()} sub={t('dashboard.totalOrderSub', '오늘 기준')} change={0} color="#a855f7" spark={sparks.orders} />
        <KpiCard icon="🎯" label={t('dashboard.convRateLbl', '전환율')} value={base.convRate.toFixed(2) + '%'} sub={t('dashboard.convRateSub', '평균 전환율')} change={0} color="#ec4899" spark={sparks.conv} />
        <KpiCard icon="🧾" label={t('dashboard.avgOrder', 'AOV')} value={fmtCurrency(base.avgOrder, { compact: true })} sub="AOV" change={0} color="#14d9b0" spark={sparks.aov} />
      </div>

      {/* ── Row 2: Channel Mix + Activity Feed + System Health ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: G }}>
        {/* Channel Revenue Mix */}
        <div style={cardBase}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
              {t('dash.channelMix', '채널별 매출 비중')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6 }}>
              {fmtCurrency(totalChannelRev)} Total
            </div>
          </div>
          {liveChannels.length > 0 ? liveChannels.map(c => (
            <ChannelBar key={c.name} {...c} totalRev={totalChannelRev || 1} fmtCurrency={fmtCurrency} />
          )) : (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
              {t('dash.noChannelData', '채널 데이터 없음')}
            </div>
          )}
        </div>

        {/* Live Activity Feed */}
        <LiveActivityFeed t={t} alerts={alerts} markAlertRead={markAlertRead} unreadAlertCount={unreadAlertCount} />

        {/* System Health Monitor */}
        <SystemHealthMonitor t={t} />
      </div>

      {/* ── Row 3: Security + Cross-Module Summary ─────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: G }}>
        <SecurityPanel t={t} secAlerts={secAlerts} />
        <CrossModuleSummary t={t} fmtCurrency={fmtCurrency} data={{
          totalInventoryValue, totalInventoryQty, lowStockCount,
          activeCampaignCount, orderStats, settlement, pnlStats, unreadAlertCount,
        }} />
      </div>

      {/* ── Row 4: Module Shortcuts ────────────────────────────── */}
      <ModuleShortcuts t={t} navigate={navigate} />
    </div>
  );
}
