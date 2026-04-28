import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useI18n } from '../../i18n';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useSecurityGuard, getSecurityAlerts } from '../../security/SecurityGuard.js';
import { useCurrency } from '../../contexts/CurrencyContext.jsx';
import { LineChart, BarChart, Spark, DonutChart } from './ChartUtils.jsx';
import MarketingAIPanel from '../MarketingAIPanel.jsx';

/* ═══════════════════════════════════════════════════════════════════════════
   DashMarketing — 마케팅 퍼포먼스 엔터프라이즈 초고도화
   • GlobalDataContext 실시간 동기화 — 새로고침 없이 자동 업데이트
   • SecurityGuard 보안 모니터링 통합
   • 9개국어 다국어 완벽 지원
   • 쓰레기 소스(CHANNELS={}, CARD={}, LABEL={}) 완전 제거
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 반응형 훅 ──────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

/* ── 글래스모피즘 카드 스타일 ────────────────────────────────────────── */
const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '14px 16px',
  backdropFilter: 'blur(12px)',
};
const sectionTitle = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
};

/* ── MetRow — 라벨/값 행 ────────────────────────────────────────────── */
function MetRow({ l, v, col = 'var(--text-1, #111827)' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 11,
    }}>
      <span style={{ color: 'var(--text-3)' }}>{l}</span>
      <span style={{ fontWeight: 700, color: col }}>{v}</span>
    </div>
  );
}

/* ── 채널 상세 패널 (5-Section Analysis) ─────────────────────────────── */
function ChannelDetailPanel({ channel, t, currFmt }) {
  if (!channel) return null;
  const c = channel;
  const cpm = c.impressions > 0 ? Math.round(c.spend / c.impressions * 1000) : 0;
  const reach = Math.round((c.impressions || 0) * 0.72);
  const cpa = c.conversions > 0 ? Math.round(c.spend / c.conversions) : 0;
  const G = 14;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: G, maxHeight: '90vh', overflowY: 'auto' }}>
      {/* 채널 헤더 */}
      <div style={{ ...card, background: `linear-gradient(135deg,${c.color}18,rgba(6,11,20,0.98))`, border: `1px solid ${c.color}28` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: `linear-gradient(135deg,${c.color},${c.color}88)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>{c.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: c.color }}>
            {c.name} — {t('dash.fiveSectionAnalysis', '5-Section Analysis')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {[
            ['ROAS', (c.roas || 0).toFixed(2) + 'x'],
            ['CTR', (c.ctr || 0).toFixed(1) + '%'],
            [t('dash.convRate', 'Conv.'), (c.convRate || 0).toFixed(1) + '%'],
            [t('dash.cpc', 'CPC'), currFmt(c.cpc || 0)],
            [t('dash.adSpend', 'Spend'), currFmt(c.spend || 0)],
            [t('dash.rev', 'Rev'), currFmt(c.revenue || 0)],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(0,0,0,0.24)', borderRadius: 8, padding: '6px 8px' }}>
              <div style={sectionTitle}>{l}</div>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-1)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 1. Reach & Awareness */}
      <div style={card}>
        <div style={sectionTitle}>{t('dash.reachAwareness', '1. Reach & Awareness')}</div>
        <MetRow l={t('dash.impressions', 'Impressions')} v={(c.impressions || 0).toLocaleString()} col={c.color} />
        <MetRow l={t('dash.reach', 'Reach')} v={reach.toLocaleString()} col={c.color} />
        <MetRow l={t('dash.frequency', 'Frequency')} v={reach > 0 ? ((c.impressions || 0) / reach).toFixed(2) + 'x' : '0x'} col={c.color} />
        <MetRow l={t('dash.cpm', 'CPM')} v={currFmt(cpm)} col={c.color} />
        <MetRow l={t('dash.adSpend', 'Ad Spend')} v={currFmt(c.spend || 0)} col={c.color} />
      </div>

      {/* 2. Engagement */}
      <div style={card}>
        <div style={sectionTitle}>{t('dash.engagement2', '2. Engagement')}</div>
        <MetRow l={t('dash.clicks', 'Clicks')} v={(c.clicks || 0).toLocaleString()} col="#22c55e" />
        <MetRow l={t('dash.ctrLabel', 'CTR')} v={(c.ctr || 0).toFixed(1) + '%'} col="#22c55e" />
        <MetRow l={t('dash.videoViews', 'Video Views')} v={Math.round((c.clicks || 0) * 2.4).toLocaleString()} col="#22c55e" />
        <MetRow l={t('dash.avgViewTime', 'Avg View Time')} v={Math.round((c.avgSessionTime || 0) * 0.6) + 's'} col="#22c55e" />
      </div>

      {/* 3. Traffic */}
      <div style={card}>
        <div style={sectionTitle}>{t('dash.traffic2', '3. Traffic')}</div>
        <MetRow l={t('dash.cpc', 'CPC')} v={currFmt(c.cpc || 0)} col="#a855f7" />
        <MetRow l={t('dash.sessions', 'Sessions')} v={(c.sessions || 0).toLocaleString()} col="#a855f7" />
        <MetRow l={t('dash.bounceRate', 'Bounce Rate')} v={(c.bounceRate || 0).toFixed(1) + '%'} col="#a855f7" />
        <MetRow l={t('dash.avgDuration', 'Avg Duration')} v={
          Math.floor((c.avgSessionTime || 0) / 60) + 'm ' + ((c.avgSessionTime || 0) % 60) + 's'
        } col="#a855f7" />
      </div>

      {/* 4. Conversion */}
      <div style={card}>
        <div style={sectionTitle}>{t('dash.conv2', '4. Conversion')}</div>
        <MetRow l={t('dash.convCount', 'Conversions')} v={(c.conversions || 0).toLocaleString()} col="#f97316" />
        <MetRow l={t('dash.convRate', 'Conv. Rate')} v={(c.convRate || 0).toFixed(1) + '%'} col="#f97316" />
        <MetRow l={t('dash.cpa', 'CPA')} v={currFmt(cpa)} col="#f97316" />
        <MetRow l={t('dash.purchaseCount', 'Purchases')} v={(c.purchases || 0).toLocaleString()} col="#f97316" />
        <MetRow l={t('dash.signups', 'Signups')} v={(c.signups || 0).toLocaleString()} col="#f97316" />
        <MetRow l={t('dash.cartAdds', 'Cart Adds')} v={(c.cartAdds || 0).toLocaleString()} col="#f97316" />
      </div>

      {/* 5. Revenue & ROI */}
      <div style={card}>
        <div style={sectionTitle}>{t('dash.revRoi2', '5. Revenue & ROI')}</div>
        <MetRow l={t('dash.adRev', 'Ad Revenue')} v={currFmt(c.revenue || 0)} col="#eab308" />
        <MetRow l={t('dash.adSpend', 'Ad Spend')} v={currFmt(c.spend || 0)} col="#eab308" />
        <MetRow l="ROAS" v={(c.roas || 0).toFixed(2) + 'x'} col="#eab308" />
        <MetRow l={t('dash.netProfit', 'Net Profit')} v={currFmt((c.revenue || 0) - (c.spend || 0))} col="#eab308" />
      </div>
    </div>
  );
}

/* ── 채널 종합 요약 패널 ────────────────────────────────────────────── */
function SummaryPanel({ channels, totalRev, totalSpend, avgROAS, t, currFmt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* All Channel Summary */}
      <div style={{ ...card, background: 'linear-gradient(145deg,rgba(79,142,247,0.06),rgba(6,11,20,0.98))' }}>
        <div style={sectionTitle}>{t('dash.allChSummary', 'All Channel Summary')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { l: t('dash.totalRev', 'Total Revenue'), v: currFmt(totalRev), col: '#22c55e' },
            { l: t('dash.totalSpend', 'Total Spend'), v: currFmt(totalSpend), col: '#f97316' },
            { l: t('dash.avgRoas', 'Blended ROAS'), v: avgROAS + 'x', col: '#4f8ef7' },
            { l: t('dash.chCount', 'Active Channels'), v: channels.length, col: '#a855f7' },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>{m.l}</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: m.col }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ROAS Ranking */}
      <div style={card}>
        <div style={sectionTitle}>{t('dash.chRoas', 'ROAS by Channel')}</div>
        {channels.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
            {t('dash.noChannelData', 'No channel data available')}
          </div>
        ) : channels.slice().sort((a, b) => (b.roas || 0) - (a.roas || 0)).map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 14 }}>{c.icon}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', width: 72 }}>{c.name}</span>
            <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3 }}>
              <div style={{
                width: `${Math.min(((c.roas || 0) / 5) * 100, 100)}%`,
                height: '100%', background: c.color, borderRadius: 3,
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 900, color: c.color }}>{(c.roas || 0).toFixed(2)}x</span>
          </div>
        ))}
      </div>

      {/* Spend Distribution Donut */}
      {channels.length > 0 && (
        <div style={card}>
          <div style={sectionTitle}>{t('dash.spendDistribution', 'Spend Distribution')}</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <DonutChart
              data={channels.map(c => ({ value: c.spend || 0, color: c.color, label: c.name }))}
              size={120}
              thickness={20}
              label={currFmt(totalSpend)}
              sub={t('dash.totalSpend', 'Total')}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {channels.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                <span style={{ color: 'var(--text-3)' }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      <div style={{ ...card, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        {t('dash.clickChannelHint', 'Click a channel card → 5-section analysis')}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   메인 컴포넌트 — DashMarketing
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DashMarketing() {
  const { t } = useI18n();
  const { fmt: currencyFmt } = useCurrency();
  const currFmt = useCallback((n) => currencyFmt(n, { compact: true }), [currencyFmt]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('channels');
  const isMobile = useIsMobile();

  /* ── GlobalDataContext 실시간 연동 ─────────────────────────────────── */
  const {
    channelBudgets, budgetStats, pnlStats, orderStats,
    alerts, unreadAlertCount,
  } = useGlobalData();

  /* ── SecurityGuard 보안 모니터링 ─────────────────────────────────── */
  const secStatus = useSecurityGuard();

  /* ── 실시간 채널 데이터 구축 ──────────────────────────────────────── */
  const liveChannels = useMemo(() => {
    const entries = Object.entries(channelBudgets || {});
    if (entries.length === 0) return [];

    const CHANNEL_META = {
      naver:     { icon: '🟢', name: 'Naver',     color: '#22c55e' },
      meta:      { icon: '📘', name: 'Meta',      color: '#4f8ef7' },
      google:    { icon: '🔍', name: 'Google',    color: '#f97316' },
      kakao:     { icon: '💬', name: 'Kakao',     color: '#eab308' },
      tiktok:    { icon: '🎵', name: 'TikTok',    color: '#ec4899' },
      instagram: { icon: '📸', name: 'Instagram', color: '#a855f7' },
      youtube:   { icon: '▶️', name: 'YouTube',   color: '#ef4444' },
      twitter:   { icon: '🐦', name: 'X(Twitter)',color: '#14d9b0' },
      coupang:   { icon: '🟠', name: 'Coupang',   color: '#f59e0b' },
    };

    return entries.map(([id, data]) => {
      const meta = CHANNEL_META[id] || { icon: '📊', name: id, color: '#64748b' };
      const spent = data.spent || data.spend || 0;
      const revenue = data.revenue || (spent * (data.roas || 0)) || 0;
      const roas = data.roas || (spent > 0 ? revenue / spent : 0);
      return {
        id,
        icon: meta.icon,
        name: meta.name,
        color: meta.color,
        spend: spent,
        revenue,
        roas,
        clicks: data.clicks || 0,
        impressions: data.impressions || 0,
        ctr: data.ctr || (data.impressions > 0 ? ((data.clicks || 0) / data.impressions * 100) : 0),
        convRate: data.convRate || data.conversionRate || 0,
        conversions: data.conversions || 0,
        cpc: data.cpc || (data.clicks > 0 ? spent / data.clicks : 0),
        sessions: data.sessions || 0,
        bounceRate: data.bounceRate || 0,
        avgSessionTime: data.avgSessionTime || 0,
        purchases: data.purchases || 0,
        signups: data.signups || 0,
        cartAdds: data.cartAdds || 0,
        sparkData: data.sparkData || data.dailySpend || new Array(14).fill(0),
      };
    });
  }, [channelBudgets]);

  /* ── 종합 KPI (GlobalDataContext 우선, 채널 합산 fallback) ────────── */
  const totalRev = budgetStats?.totalAdRevenue || pnlStats?.revenue || liveChannels.reduce((s, c) => s + c.revenue, 0);
  const totalSpend = budgetStats?.totalSpent || pnlStats?.adSpend || liveChannels.reduce((s, c) => s + c.spend, 0);
  const avgROAS = totalSpend > 0
    ? (budgetStats?.blendedRoas || totalRev / totalSpend).toFixed(2)
    : '0.00';
  const totalClicks = liveChannels.reduce((s, c) => s + c.clicks, 0);
  const avgCTR = liveChannels.length > 0
    ? (liveChannels.reduce((s, c) => s + c.ctr, 0) / liveChannels.length).toFixed(1)
    : '0.0';
  const avgConvRate = liveChannels.length > 0
    ? (liveChannels.reduce((s, c) => s + c.convRate, 0) / liveChannels.length).toFixed(1)
    : '0.0';
  const totalOrders = orderStats?.count || 0;

  /* ── 날짜 라벨 (최근 14일) ──────────────────────────────────────── */
  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
  }, []);

  /* ── 트렌드 차트 데이터 ──────────────────────────────────────────── */
  const lineData = useMemo(() => {
    if (liveChannels.length === 0) return [];
    return Array.from({ length: 14 }, (_, i) => {
      const row = {};
      liveChannels.forEach(c => {
        row[c.id] = c.sparkData?.[i] || Math.round((c.spend / 14) * (0.8 + Math.sin(i * 0.5) * 0.2));
      });
      return row;
    });
  }, [liveChannels]);

  /* ── KPI 지표 카드 데이터 ─────────────────────────────────────────── */
  const metricsTop = useMemo(() => [
    { label: t('dash.totalRev', 'Total Revenue'), value: currFmt(totalRev), icon: '💰', color: '#22c55e', delta: pnlStats?.revenueChange || 0 },
    { label: t('dash.totalSpend', 'Total Spend'), value: currFmt(totalSpend), icon: '📤', color: '#f97316', delta: -(budgetStats?.spendChange || 0) },
    { label: t('dash.blendedRoas', 'Blended ROAS'), value: avgROAS + 'x', icon: '📈', color: '#4f8ef7', delta: budgetStats?.roasChange || 0 },
    { label: t('dash.activeCh', 'Active Channels'), value: liveChannels.length, icon: '📡', color: '#a855f7', delta: 0 },
    { label: t('dash.totalClicks', 'Total Clicks'), value: totalClicks.toLocaleString(), icon: '👆', color: '#14d9b0', delta: 0 },
    { label: t('dash.avgCtr', 'Avg CTR'), value: avgCTR + '%', icon: '🎯', color: '#eab308', delta: 0 },
    {
      label: t('marketing.kpiAchieve', 'KPI Achieve'),
      icon: '✅', color: '#22c55e', delta: 0,
      value: (() => {
        const ctrOk = parseFloat(avgCTR) >= 3;
        const convOk = parseFloat(avgConvRate) >= 5;
        const roasOk = parseFloat(avgROAS) >= 3;
        return [ctrOk, convOk, roasOk].filter(Boolean).length + '/3';
      })(),
    },
  ], [t, totalRev, totalSpend, avgROAS, liveChannels.length, totalClicks, avgCTR, avgConvRate, currFmt, pnlStats, budgetStats]);

  /* ── 보안 상태 ──────────────────────────────────────────────────── */
  const secAlerts = useMemo(() => {
    try { return getSecurityAlerts(); } catch { return []; }
  }, [secStatus]);

  const G = 14;

  return (
    <div style={{ display: 'grid', gap: G }}>
      {/* ── 보안 경고 배너 ─────────────────────────────────────────── */}
      {secAlerts.length > 0 && (
        <div style={{
          ...card, background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#f87171' }}>
              {t('dash.securityAlert', 'Security Alert')}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
              {secAlerts.length} {t('dash.threatsDetected', 'threats detected')} — {t('dash.reviewSecurity', 'Review security panel')}
            </div>
          </div>
        </div>
      )}

      {/* ── 탭 선택기 ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0, background: 'var(--surface)',
        borderRadius: 12, padding: 4,
        border: '1px solid var(--border)', width: 'fit-content',
      }}>
        {[
          { id: 'channels', label: t('dash.channelPerf', '📊 Channel Perf.') },
          { id: 'ai', label: t('dash.aiAdAnal', '🤖 AI Ad Analysis') },
        ].map(tabItem => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
            style={{
              padding: isMobile ? '6px 12px' : '8px 18px',
              borderRadius: 9, border: 'none', cursor: 'pointer',
              background: tab === tabItem.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
              color: tab === tabItem.id ? '#fff' : 'var(--text-3, #9ca3af)',
              fontWeight: 800, fontSize: isMobile ? 11 : 12, transition: 'all 0.2s',
              boxShadow: tab === tabItem.id ? '0 4px 14px rgba(79,142,247,0.35)' : undefined,
            }}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════ 채널 퍼포먼스 탭 ══════════════════════ */}
      {tab === 'channels' && (
        <div style={{ display: 'grid', gap: G }}>
          {/* ── KPI 상단 카드 그리드 ───────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(7,1fr)',
            gap: isMobile ? 8 : G,
          }}>
            {metricsTop.map(m => (
              <div key={m.label} style={{
                ...card, borderColor: m.color + '1a',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${m.color},${m.color}44)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)' }}>{m.label}</div>
                  <span style={{ fontSize: 17 }}>{m.icon}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: m.color, lineHeight: 1.1 }}>{m.value}</div>
                <span style={{ fontSize: 10, color: m.delta >= 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>
                  {m.delta >= 0 ? '▲' : '▼'} {Math.abs(m.delta).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          {/* ── 메인 그리드: 좌(채널카드+트렌드+테이블) / 우(상세/요약) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr',
            gap: G,
          }}>
            {/* 좌측 컬럼 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
              {/* 채널 카드 */}
              {liveChannels.length === 0 ? (
                <div style={{
                  ...card, textAlign: 'center', padding: 32,
                  color: 'var(--text-3)',
                }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📡</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t('dash.noChannelData', 'No channel data')}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>{t('dash.connectChannels', 'Connect ad channels to see performance data')}</div>
                </div>
              ) : isMobile ? (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
                    {liveChannels.map(c => {
                      const isSel = selected === c.id;
                      return (
                        <div key={c.id} onClick={() => setSelected(isSel ? null : c.id)}
                          style={{
                            width: 130, flexShrink: 0,
                            borderRadius: 14, padding: '1px', overflow: 'hidden', cursor: 'pointer',
                            background: isSel ? `linear-gradient(135deg,${c.color}80,${c.color}30)` : `linear-gradient(135deg,${c.color}36,rgba(255,255,255,0.04))`,
                            boxShadow: isSel ? `0 0 0 2px ${c.color}, 0 8px 28px ${c.color}40` : `0 4px 16px ${c.color}14`,
                            transition: 'all 0.25s',
                          }}>
                          <div style={{
                            background: 'var(--bg-card, rgba(255,255,255,0.95))',
                            borderRadius: 13, padding: 10, height: 110,
                            boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: 7,
                                background: `linear-gradient(135deg,${c.color},${c.color}88)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                              }}>{c.icon}</div>
                              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-1)' }}>{c.name}</div>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: c.color }}>
                              {(c.roas || 0).toFixed(2)}<span style={{ fontSize: 11 }}>x</span>
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-3)' }}>
                              ROAS · {currFmt(c.revenue)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(5, liveChannels.length)},1fr)`, gap: G }}>
                  {liveChannels.map(c => {
                    const isSel = selected === c.id;
                    return (
                      <div key={c.id} onClick={() => setSelected(isSel ? null : c.id)}
                        style={{
                          borderRadius: 14, padding: '1px', overflow: 'hidden', cursor: 'pointer',
                          background: isSel
                            ? `linear-gradient(135deg,${c.color}80,${c.color}30)`
                            : `linear-gradient(135deg,${c.color}36,rgba(255,255,255,0.04))`,
                          boxShadow: isSel ? `0 0 0 2px ${c.color}, 0 8px 28px ${c.color}40` : `0 4px 16px ${c.color}14`,
                          transition: 'all 0.25s',
                          transform: isSel ? 'scale(1.02)' : 'scale(1)',
                        }}
                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.transform = 'scale(1.01)'; }}
                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.transform = 'scale(1)'; }}>
                        <div style={{
                          background: 'var(--bg-card, rgba(255,255,255,0.95))',
                          borderRadius: 13, padding: '12px 13px', height: 128,
                          boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 8, fontSize: 14,
                              background: `linear-gradient(135deg,${c.color},${c.color}88)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{c.icon}</div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-1)' }}>{c.name}</div>
                              <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{t('dash.clickForAnalysis', 'Click → 5-Section')}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>
                            {(c.roas || 0).toFixed(2)}<span style={{ fontSize: 13 }}>x</span>
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-3)' }}>
                            ROAS · {currFmt(c.revenue)}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, marginRight: 8 }}>
                              <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3 }}>
                                CTR {(c.ctr || 0).toFixed(1)}% · Conv {(c.convRate || 0).toFixed(1)}%
                              </div>
                              <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
                                <div style={{
                                  width: `${Math.min(((c.roas || 0) / 5) * 100, 100)}%`,
                                  height: '100%', background: c.color, borderRadius: 2,
                                }} />
                              </div>
                            </div>
                            <Spark data={c.sparkData} color={c.color} h={20} w={45} area />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 채널 트렌드 차트 */}
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{t('dash.chTrend', 'Channel Trend')}</span>
                  {!isMobile && liveChannels.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {liveChannels.map(c => (
                        <div key={c.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, cursor: 'pointer', color: 'var(--text-3)' }}
                          onClick={() => setSelected(selected === c.id ? null : c.id)}>
                          <div style={{ width: 14, height: 2.5, background: c.color, borderRadius: 2 }} />
                          {c.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {lineData.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <LineChart
                      data={lineData}
                      labels={days}
                      series={liveChannels.map(c => ({
                        key: c.id, color: c.color,
                        width: selected === c.id ? 2.8 : 1.6,
                        area: selected === c.id,
                      }))}
                      width={isMobile ? 440 : 680}
                      height={148}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-3)', fontSize: 11 }}>
                    {t('dash.noTrendData', 'No trend data available')}
                  </div>
                )}
              </div>

              {/* 채널 성과 테이블 */}
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                  {t('dash.chPerfSumm', 'Channel Performance Summary')}
                </div>
                {liveChannels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)', fontSize: 11 }}>
                    {t('dash.noChannelData', 'No channel data')}
                  </div>
                ) : isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {liveChannels.map((c, i) => (
                      <div key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                        style={{
                          borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                          background: selected === c.id ? `${c.color}18` : i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                          border: `1px solid ${selected === c.id ? c.color + '40' : 'rgba(0,0,0,0.06)'}`,
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 3, height: 20, borderRadius: 2, background: c.color }} />
                          <span style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{c.icon} {c.name}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                          {[
                            ['ROAS', (c.roas || 0).toFixed(2) + 'x', c.color],
                            ['CTR', (c.ctr || 0).toFixed(1) + '%', 'var(--text-2, #4b5563)'],
                            [t('dash.convRate', 'Conv.'), (c.convRate || 0).toFixed(1) + '%', 'var(--text-2, #4b5563)'],
                            [t('dash.adSpend', 'Spend'), currFmt(c.spend), 'var(--text-2, #4b5563)'],
                            [t('dash.rev', 'Rev'), currFmt(c.revenue), '#22c55e'],
                            [t('dash.cpc', 'CPC'), currFmt(c.cpc), 'var(--text-2, #4b5563)'],
                          ].map(([l, v, col]) => (
                            <div key={l} style={{ background: 'var(--surface)', borderRadius: 7, padding: '5px 7px' }}>
                              <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>{l}</div>
                              <div style={{ fontSize: 11, fontWeight: 900, color: col }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '110px 56px 56px 72px 64px 56px 54px',
                      gap: 8, padding: '0 8px 8px', fontSize: 10,
                      color: 'var(--text-3)', fontWeight: 700,
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span>{t('dash.chName', 'Channel')}</span>
                      <span>ROAS</span>
                      <span>{t('dash.ctr', 'CTR')}</span>
                      <span>{t('dash.spendBudget', 'Spend')}</span>
                      <span>{t('dash.rev', 'Revenue')}</span>
                      <span>{t('dash.convRate', 'Conv.')}</span>
                      <span>{t('dash.cpc', 'CPC')}</span>
                    </div>
                    {liveChannels.map((c, i) => (
                      <div key={c.id}
                        onClick={() => setSelected(selected === c.id ? null : c.id)}
                        style={{
                          display: 'grid', gridTemplateColumns: '110px 56px 56px 72px 64px 56px 54px',
                          gap: 8, padding: '9px 8px', alignItems: 'center', fontSize: 11,
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer', borderRadius: 8,
                          background: selected === c.id ? `${c.color}10` : i % 2 === 0 ? 'rgba(0,0,0,0.016)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${c.color}12`}
                        onMouseLeave={e => e.currentTarget.style.background = selected === c.id ? `${c.color}10` : i % 2 === 0 ? 'rgba(0,0,0,0.016)' : 'transparent'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 3, height: 22, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{c.name}</span>
                        </div>
                        <span style={{ fontWeight: 900, color: c.color }}>{(c.roas || 0).toFixed(2)}x</span>
                        <span style={{ color: 'var(--text-2)' }}>{(c.ctr || 0).toFixed(1)}%</span>
                        <span style={{ color: 'var(--text-2)' }}>{currFmt(c.spend)}</span>
                        <span style={{ color: '#22c55e', fontWeight: 700 }}>{currFmt(c.revenue)}</span>
                        <span style={{ color: 'var(--text-2)' }}>{(c.convRate || 0).toFixed(1)}%</span>
                        <span style={{ color: 'var(--text-3)' }}>{currFmt(c.cpc)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* 우측 컬럼: 상세/요약 */}
            <div>
              {selected && liveChannels.find(c => c.id === selected)
                ? <ChannelDetailPanel channel={liveChannels.find(c => c.id === selected)} t={t} currFmt={currFmt} />
                : <SummaryPanel channels={liveChannels} totalRev={totalRev} totalSpend={totalSpend} avgROAS={avgROAS} t={t} currFmt={currFmt} />
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ AI 분석 탭 ═══════════════════════════ */}
      {tab === 'ai' && (
        <MarketingAIPanel
          channels={liveChannels.reduce((acc, c) => { acc[c.id] = c; return acc; }, {})}
          campaigns={[]}
        />
      )}
    </div>
  );
}
