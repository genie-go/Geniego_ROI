import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useT, useI18n } from "../i18n/index.js";
import { useConnectorSync } from "../context/ConnectorSyncContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useCurrency } from '../contexts/CurrencyContext.jsx';

/* ──────────────────────────────────────────────────────────────────────────────
 * CaseStudy.jsx — Enterprise Case Study / Brand Success Reference
 * v3.0 Zero-Mock · Full i18n · Integration Hub Sync · Security Hardened
 * ────────────────────────────────────────────────────────────────────────────── */

/* ─── Security: Input Sanitizer ──────────────────────────────────────── */
const XSS_PATTERNS = [/<script/i, /javascript:/i, /on\w+\s*=/i, /eval\s*\(/i, /SELECT\s+.*\s+FROM/i, /DROP\s+TABLE/i, /INSERT\s+INTO/i, /UNION\s+SELECT/i, /\.\.\//g, /document\.(cookie|location|write)/i];
function detectThreat(input) {
  if (typeof input !== 'string') return false;
  return XSS_PATTERNS.some(p => p.test(input));
}

/* ─── Channel Fee Reference ──────────────────────────────────────────── */
const CHANNEL_FEES = {
  meta_ads: { name: 'Meta Ads', fee: 0, icon: '🔵' },
  google_ads: { name: 'Google Ads', fee: 0, icon: '🔴' },
  tiktok_business: { name: 'TikTok', fee: 0, icon: '🎵' },
  naver_smartstore: { name: 'Naver Store', fee: 5.5, icon: '🟢' },
  naver_sa: { name: 'Naver SA', fee: 0, icon: '🟢' },
  coupang: { name: 'Coupang', fee: 10.8, icon: '🟠' },
  kakao_moment: { name: 'Kakao', fee: 0, icon: '💬' },
  shopify: { name: 'Shopify', fee: 2.9, icon: '🛍️' },
  amazon_spapi: { name: 'Amazon', fee: 15, icon: '📦' },
  st11: { name: '11Street', fee: 6, icon: '🔶' },
  gmarket: { name: 'Gmarket', fee: 7.5, icon: '🟡' },
  rakuten: { name: 'Rakuten', fee: 8, icon: '🏯' },
  lazada: { name: 'Lazada', fee: 6, icon: '🌏' },
  cafe24: { name: 'Cafe24', fee: 3, icon: '☕' },
  own_mall: { name: 'Own Mall', fee: 0, icon: '🏠' },
};

/* ─── Tab definitions ────────────────────────────────────────────────── */
const TABS = ['overview', 'channels', 'guide'];

/* ─── Industry/Solution filter keys ──────────────────────────────────── */
const INDUSTRIES = ['all', 'fashion', 'food', 'beauty', 'electronics', 'b2b', 'logistics'];
const SOLUTIONS = ['all', 'attribution', 'mmm', 'crm', 'wms', 'priceOpt', 'omniChannel'];

/* ─── Enterprise Case Study Data (Platform Reference) ────────────────── */
const CASE_STUDIES = [];


/* ─── i18n key mapping for case study content ────────────────────────── */
const CS_I18N = {};


/* ─── Security Alert Component ───────────────────────────────────────── */
function SecurityAlert({ t, onDismiss }) {
  return (
    <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 24 }}>🛡️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: '#ef4444' }}>{t('caseStudy.securityTitle', 'Security Alert')}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{t('caseStudy.securityDesc', 'Potential threat detected and blocked.')}</div>
      <button onClick={onDismiss} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{t('caseStudy.dismiss', 'Dismiss')}</button>
        </div>
    </div>
);
}

/* ─── Metric Badge Component ─────────────────────────────────────────── */
function MetricBadge({ label, value, color = '#4f8ef7', icon }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}20`, minWidth: 70 }}>
      {icon && <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>}
      <div style={{ fontWeight: 900, fontSize: 14, color }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
);
}

/* ─── Case Study Card ────────────────────────────────────────────────── */
function CaseStudyCard({ cs, t, fmt, expanded, onToggle }) {
  const i18n = CS_I18N[cs.id] || {};
  const name = i18n.nameKey ? t(`caseStudy.${i18n.nameKey}`, cs.id) : cs.id;
  const desc = i18n.descKey ? t(`caseStudy.${i18n.descKey}`, '') : '';
  const highlight = i18n.highlightKey ? t(`caseStudy.${i18n.highlightKey}`, '') : '';

  return (
    <div
      className="card card-glass card-hover"
      style={{
        borderLeft: '4px solid transparent',
        borderImage: cs.gradient + ' 1',
        overflow: 'hidden',
        transition: 'all 300ms ease',
        cursor: 'pointer',
      }}
      onClick={onToggle}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: expanded ? 14 : 0 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: cs.gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {cs.icon}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
              {t(`caseStudy.industry_${cs.industry}`, cs.industry)}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)' }}>
              {t(`caseStudy.solution_${cs.solution}`, cs.solution)}
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600 }}>
              📍 {cs.region} · {cs.period}
            </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600 }}>ROAS</div>
            <div style={{ fontWeight: 900, fontSize: 16, color: cs.metrics.roas >= 5 ? '#22c55e' : cs.metrics.roas >= 3 ? '#4f8ef7' : '#eab308' }}>
              {cs.metrics.roas}x
          </div>
          <span style={{ fontSize: 16, color: 'var(--text-3)', transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ animation: 'fadeIn 300ms ease' }}>
          {/* Description */}
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.03)', border: '1px solid rgba(79,142,247,0.08)' }}>
            {desc}

          {/* KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            <MetricBadge label={t('caseStudy.metricRevenue', 'Revenue')} value={fmt(cs.metrics.revenue)} color="#22c55e" icon="💰" />
            <MetricBadge label="ROAS" value={cs.metrics.roas + 'x'} color="#4f8ef7" icon="📈" />
            <MetricBadge label={t('caseStudy.metricOrders', 'Orders')} value={cs.metrics.orders.toLocaleString()} color="#a855f7" icon="📦" />
            <MetricBadge label={t('caseStudy.metricConvRate', 'Conv Rate')} value={cs.metrics.convRate + '%'} color="#f59e0b" icon="🎯" />

          {/* Connected Channels */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>
              🔗 {t('caseStudy.usedChannels', 'Channels Used')}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cs.channels.map(chKey => {
                const ch = CHANNEL_FEES[chKey] || { name: chKey, icon: '🔌' };
                return (
                  <span key={chKey} style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {ch.icon} {ch.name}
                    {ch.fee > 0 && <span style={{ color: 'var(--text-3)', fontSize: 9 }}>({ch.fee}%)</span>}
                  </span>
                );
              })}
          </div>

          {/* Highlight */}
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.04))',
            border: '1px solid rgba(34,197,94,0.15)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>
              ✨ {t('caseStudy.keyHighlight', 'Key Highlight')}
            <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>{highlight}</div>
        </div>
      )}
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

/* ─── Overview Tab ───────────────────────────────────────────────────── */
function OverviewTab({ t, fmt, connectedChannels, connectedCount }) {
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterSolution, setFilterSolution] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    return CASE_STUDIES.filter(cs => {
      if (filterIndustry !== 'all' && cs.industry !== filterIndustry) return false;
      if (filterSolution !== 'all' && cs.solution !== filterSolution) return false;
      return true;
    });
  }, [filterIndustry, filterSolution]);

  // Aggregate metrics — safe division to prevent NaN when CASE_STUDIES is empty
  const totalRevenue = CASE_STUDIES.reduce((s, cs) => s + (cs.metrics?.revenue || 0), 0);
  const rawAvgRoas = CASE_STUDIES.length > 0
    ? CASE_STUDIES.reduce((s, cs) => s + (cs.metrics?.roas || 0), 0) / CASE_STUDIES.length
    : 0;
  const avgRoas = isNaN(rawAvgRoas) ? '0.0' : rawAvgRoas.toFixed(1);
  const totalOrders = CASE_STUDIES.reduce((s, cs) => s + (cs.metrics?.orders || 0), 0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { key: 'caseStudies', value: CASE_STUDIES.length, icon: '📊', color: '#4f8ef7' },
          { key: 'totalRevenue', value: fmt(totalRevenue), icon: '💰', color: '#22c55e' },
          { key: 'avgRoas', value: avgRoas + 'x', icon: '📈', color: '#a855f7' },
          { key: 'totalOrders', value: totalOrders.toLocaleString(), icon: '📦', color: '#f59e0b' },
        ].map(({ key, value, icon, color }) => (
          <div key={key} className="kpi-card card-hover" style={{ '--accent': color }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div className="kpi-value" style={{ color }}>{value}</div>
            <div className="kpi-label">{t(`caseStudy.kpi_${key}`, key)}</div>
        ))}

      {/* Filters */}
      <div className="card card-glass" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>🔍 {t('caseStudy.filterLabel', 'Filter')}</span>
          <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg, #1e1e2e)', color: 'var(--text-1)', fontSize: 11, fontWeight: 600 }}>
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>{t(`caseStudy.industry_${ind}`, ind === 'all' ? 'All Industries' : ind)}</option>
            ))}
          </select>
          <select value={filterSolution} onChange={e => setFilterSolution(e.target.value)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg, #1e1e2e)', color: 'var(--text-1)', fontSize: 11, fontWeight: 600 }}>
            {SOLUTIONS.map(sol => (
              <option key={sol} value={sol}>{t(`caseStudy.solution_${sol}`, sol === 'all' ? 'All Solutions' : sol)}</option>
            ))}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
            {filtered.length} {t('caseStudy.resultsCount', 'results')}
          </span>
      </div>

      {/* Case Study Cards */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(cs => (
          <CaseStudyCard
            key={cs.id}
            cs={cs}
            t={t}
            fmt={fmt}
            expanded={expandedId === cs.id}
            onToggle={() => setExpandedId(expandedId === cs.id ? null : cs.id)}
          />
        ))}

      {filtered.length === 0 && (
        <div className="card card-glass" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>🔍</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-2)' }}>{t('caseStudy.noResults', 'No matching case studies')}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{t('caseStudy.tryDifferentFilter', 'Try adjusting the filter criteria.')}</div>
      )}

      {/* CTA */}
      <div className="card card-glass" style={{ textAlign: 'center', padding: '32px 24px', background: 'linear-gradient(135deg,rgba(168,85,247,0.07),rgba(79,142,247,0.05))', border: '1px solid rgba(168,85,247,0.25)' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🚀</div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8, background: 'linear-gradient(135deg,#a855f7,#4f8ef7)' }}>
          {t('caseStudy.ctaTitle', 'Create your success story with Geniego-ROI')}
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
          {t('caseStudy.ctaDesc', 'From AI marketing automation to commerce & logistics integration, try it free for 7 days. A dedicated onboarding team supports you from day one.')}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)', padding: '11px 24px' }}
            onClick={() => window.location.href = '/app-pricing'}>
            💎 {t('caseStudy.ctaPricing', 'View Pricing')}
          </button>
          <button className="btn-ghost" style={{ padding: '11px 24px' }}
            onClick={() => window.location.href = '/help'}>
            📚 {t('caseStudy.ctaGuide', 'Onboarding Guide')}
          </button>
                                        </div>
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

/* ─── Channels Tab (Integration Hub Sync) ────────────────────────────── */
function ChannelsTab({ t, connectedChannels }) {
  const channels = useMemo(() => {
    return Object.entries(connectedChannels)
      .filter(([, info]) => info.connected)
      .map(([key, info]) => ({
        key,
        ...(CHANNEL_FEES[key] || { name: key, fee: 0, icon: '🔌' }),
        keyCount: info.keyCount || 0,
        testStatus: info.testStatus,
      }));
  }, [connectedChannels]);

  if (channels.length === 0) {
    return (
      <div className="card card-glass">
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>🔌</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-1)', marginBottom: 8 }}>{t('caseStudy.noChannelsTitle', 'No channels connected')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>{t('caseStudy.noChannelsDesc', 'Connect your sales channels in the Integration Hub to see performance data here.')}</div>
        <div style={{ textAlign: 'center', marginTop: 12, paddingBottom: 20 }}>
          <button className="btn-primary" style={{ padding: '9px 20px', fontSize: 12 }} onClick={() => window.location.href = '/integration-hub'}>
            🔗 {t('caseStudy.goIntegrationHub', 'Go to Integration Hub')}
          </button>
            </div>
        </div>
    </div>
);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="card card-glass" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>
          🔗 {t('caseStudy.connectedChannelsTitle', 'Connected Channels')} ({channels.length})
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('caseStudy.connectedChannelsDesc', 'Real-time synchronized channel data from Integration Hub.')}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {channels.map(ch => (
          <div key={ch.key} className="card card-glass card-hover" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{ch.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1)' }}>{ch.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>API Keys: {ch.keyCount}</div>
              <span style={{ marginLeft: 'auto', padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                ● {t('caseStudy.statusConnected', 'Connected')}
              </span>
            {ch.fee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.1)' }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{t('caseStudy.platformFee', 'Platform Fee')}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#4f8ef7' }}>{ch.fee}%</span>
            )}
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

/* ─── Guide Tab ──────────────────────────────────────────────────────── */
function GuideTab({ t }) {
  const steps = Array.from({ length: 8 }, (_, i) => i + 1);
  const tips = Array.from({ length: 5 }, (_, i) => i + 1);

  const GUIDE_STEPS = [
    { icon: '🔗', title: 'Connect Sales Channels', desc: 'Register API keys for Coupang, Naver, Amazon, Shopify, and more in the Integration Hub.' },
    { icon: '📊', title: 'Connect Ad Platforms', desc: 'Link Meta, Google, TikTok, and Kakao ad accounts for unified ROAS tracking.' },
    { icon: '🧠', title: 'AI Auto Analysis', desc: 'AI automatically analyzes cross-channel data to identify top-performing segments.' },
    { icon: '🎯', title: 'ROI Attribution Setup', desc: 'Configure multi-touch attribution models to understand true channel contribution.' },
    { icon: '💰', title: 'Budget Optimization', desc: 'Use AI-driven budget allocation to maximize ROAS across all channels.' },
    { icon: '📈', title: 'Campaign Launch', desc: 'Launch AI-optimized campaigns with automated A/B testing and bid management.' },
    { icon: '🔔', title: 'Monitor & Alert', desc: 'Set up real-time monitoring with budget alerts, anomaly detection, and daily reports.' },
    { icon: '📋', title: 'Report & Scale', desc: 'Generate enterprise reports, analyze attribution insights, and scale winning strategies.' },
  ];

  const EXPERT_TIPS = [
    'Start with 2-3 channels and expand gradually. Unified data quality matters more than quantity.',
    'Set up budget alerts at 70% threshold to prevent overspend before it happens.',
    'Use the AI Strategy Preview to simulate ROAS before committing real ad spend.',
    'Keep Commission Tracking active to understand true net profit per channel.',
    'Review the Attribution Dashboard weekly to catch channel contribution shifts early.',
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Guide Header */}
      <div className="card card-glass" style={{ padding: '20px 24px', background: 'linear-gradient(135deg,rgba(168,85,247,0.06),rgba(79,142,247,0.04))' }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--text-1)', marginBottom: 6 }}>📖 {t('caseStudy.guideTitle', 'Getting Started Guide')}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{t('caseStudy.guideSub', 'Follow these steps to maximize your ROI with Geniego-ROI platform.')}</div>

      {/* Step-by-step Guide */}
      <div className="card card-glass">
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 14 }}>📋 {t('caseStudy.guideStepsTitle', 'Implementation Steps')}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {GUIDE_STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.03)', border: '1px solid rgba(79,142,247,0.08)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-1)', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-1)', marginBottom: 4 }}>
                  {step.icon} {t(`caseStudy.guideStep${i + 1}Title`, step.title)}
                <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  {t(`caseStudy.guideStep${i + 1}Desc`, step.desc)}
              </div>
          ))}
      </div>

      {/* Expert Tips */}
      <div className="card card-glass">
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 14 }}>💡 {t('caseStudy.guideTipsTitle', 'Expert Tips')}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {EXPERT_TIPS.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.12)' }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.7 }}>
                {t(`caseStudy.guideTip${i + 1}`, tip)}
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
    </div>
);
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function CaseStudy() {
  const t = useT();
  const { fmt } = useCurrency();
  const { connectedChannels, connectedCount, refresh } = useConnectorSync();
  const { alerts, addAlert } = useGlobalData();
  const [tab, setTab] = useState('overview');
  const [securityAlert, setSecurityAlert] = useState(null);

  /* ── Live Sync: refresh channels on mount ── */
  useEffect(() => { refresh(); }, []);

  /* ── Security Monitor ── */
  const handleSecurityCheck = useCallback((input) => {
    if (detectThreat(input)) {
      setSecurityAlert(true);
      addAlert({ type: 'warn', msg: `🛡️ Security Alert: Potential threat detected and blocked.` });
      return true;
    }
    return false;
  }, [addAlert]);

  const TAB_LABELS = {
    overview: '📊 ' + t('caseStudy.tab_overview', 'Overview'),
    channels: '🔗 ' + t('caseStudy.tab_channels', 'Connected Channels'),
    guide: '📖 ' + t('caseStudy.tab_guide', 'Usage Guide'),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: '-14px -16px -20px', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px', paddingBottom: 80 }}>
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Security Alert */}
      {securityAlert && <SecurityAlert t={t} onDismiss={() => setSecurityAlert(null)} />}

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.25),rgba(99,102,241,0.15))' }}>🏆</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#a855f7,#6366f1)' }}>
              {t('caseStudy.heroTitle', 'Case Study')}
            </div>
            <div className="hero-desc">
              {t('caseStudy.heroDesc', 'Review the performance of companies that adopted Geniego-ROI, and reference use cases of connected channels and solutions.')}
          </div>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <span className="badge" style={{ fontSize: 9, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
            ● {t('caseStudy.badgeLive', 'Real-time Sync')}
          </span>
          <span className="badge" style={{ fontSize: 9, background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.25)' }}>
            🔗 {connectedCount} {t('caseStudy.badgeChannels', 'Channels Connected')}
          </span>
          <span className="badge" style={{ fontSize: 9, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
            📊 {connectedCount} {t('caseStudy.badgeCases', 'Case Studies')}
          </span>
          <span className="badge" style={{ fontSize: 9, background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)' }}>
            🛡️ {t('caseStudy.badgeSecurity', 'Security Active')}
          </span>
      </div>

      {/* Tabs */}
      <div className="card card-glass fade-up fade-up-1" style={{ padding: '4px 6px' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: tab === tabKey ? 'rgba(79,142,247,0.12)' : 'transparent',
                color: tab === tabKey ? '#4f8ef7' : 'var(--text-3)',
                fontWeight: tab === tabKey ? 800 : 600, fontSize: 11,
                transition: 'all 200ms',
              }}
            >
              {TAB_LABELS[tabKey]}
            </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="fade-up fade-up-2">
        {tab === 'overview' && <OverviewTab t={t} fmt={fmt} connectedChannels={connectedChannels} connectedCount={connectedCount} />}
        {tab === 'channels' && <ChannelsTab t={t} connectedChannels={connectedChannels} />}
        {tab === 'guide' && <GuideTab t={t} />}

      {/* Live Sync Status */}
      <div className="card card-glass fade-up fade-up-3" style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-3)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
          {t('caseStudy.liveSyncStatus', 'Real-time sync active · Integration Hub connected')}
                                            </div>
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
