import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import { useI18n, useT } from '../i18n/index.js';
import {
  computeShapleyExact, computeSynergy,
  bayesianMMM, incrementalUplift, markovAttribution,
  bayesianAB,
  generateJourneys, generateTimeSeriesData,
  CH_COLORS, KRW,
} from '../lib/mlAttribution.js';
import { useSecurityGuard } from "../security/SecurityGuard.js";
import { useCurrency } from '../contexts/CurrencyContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

const fmt = v => new Intl.NumberFormat(navigator.language || 'ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(v || 0);
/* Dynamic currency formatter — updated by Attribution main via useCurrency */
let _currFmt = fmt;
const setFmt = (fn) => { if (typeof fn === 'function') _currFmt = fn; };
const fmtC = v => { try { return _currFmt(v); } catch { return fmt(v); } };

const Tag = memo(({ label, color = '#4f8ef7' }) => (
  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}33`, fontWeight: 700 }}>{label}</span>
));

const CH_LABELS = {
  'Meta Ads': 'Meta Ads', 'Naver Ads': 'Naver', 'Google Ads': 'Google',
  'TikTok': 'TikTok', 'Kakao': 'Kakao', 'Email': 'Email',
  'Organic': 'Organic', 'Instagram': 'Instagram', 'Direct': 'Direct',
};

/* ── seeded PRNG for deterministic demo data ── */
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

/* ── Demo data generators (populated from channelBudgets) ── */
function buildDemoJourneys(channelBudgets) {
  const rng = seededRandom(42);
  const CHANNELS_ATTR = ['Meta Ads','Naver Ads','Google Ads','TikTok','Kakao','Email','Organic','Instagram','Direct'];
  const budgetMap = {
    meta: 'Meta Ads', google: 'Google Ads', tiktok: 'TikTok',
    naver_sa: 'Naver Ads', kakao_moment: 'Kakao', coupang_ads: 'Meta Ads',
  };
  // weight channels by budget share
  const weights = {};
  CHANNELS_ATTR.forEach(ch => { weights[ch] = 1; });
  if (channelBudgets && typeof channelBudgets === 'object') {
    Object.entries(channelBudgets).forEach(([key, val]) => {
      const chName = budgetMap[key];
      if (chName && val?.revenue) weights[chName] = Math.max(weights[chName], val.revenue / 10000000);
    });
  }
  const totalW = Object.values(weights).reduce((s, v) => s + v, 0);
  const cdf = [];
  let acc = 0;
  CHANNELS_ATTR.forEach(ch => { acc += weights[ch] / totalW; cdf.push({ ch, p: acc }); });
  const pickCh = () => { const r = rng(); return (cdf.find(c => r <= c.p) || cdf[cdf.length - 1]).ch; };

  const journeys = [];
  for (let i = 0; i < 500; i++) {
    const pathLen = 1 + Math.floor(rng() * 4);
    const path = [];
    for (let j = 0; j < pathLen; j++) {
      const ch = pickCh();
      if (!path.includes(ch)) path.push(ch);
    }
    if (path.length === 0) path.push(pickCh());
    const revenue = Math.round((50000 + rng() * 450000) * (path.length * 0.6 + 0.4));
    journeys.push({ path, revenue });
  }
  return journeys;
}

function buildDemoTimeSeries(channelBudgets) {
  const rng = seededRandom(77);
  const T = 52;
  const channels = ['Meta Ads','Naver Ads','Google Ads','TikTok','Kakao','Email'];
  const baseSpends = {
    'Meta Ads': 4700000, 'Naver Ads': 2700000, 'Google Ads': 4700000,
    'TikTok': 4700000, 'Kakao': 2100000, 'Email': 500000,
  };
  if (channelBudgets) {
    const map = { meta: 'Meta Ads', google: 'Google Ads', tiktok: 'TikTok', naver_sa: 'Naver Ads', kakao_moment: 'Kakao' };
    Object.entries(channelBudgets).forEach(([k, v]) => {
      if (map[k] && v?.spent) baseSpends[map[k]] = Math.round(v.spent / 52);
    });
  }
  const spends = {};
  channels.forEach(ch => {
    const base = baseSpends[ch] || 1000000;
    spends[ch] = Array.from({ length: T }, (_, t) => {
      const seasonal = 1 + 0.15 * Math.sin(t / 52 * Math.PI * 2);
      return Math.round(base * seasonal * (0.8 + rng() * 0.4));
    });
  });
  const revenue = Array.from({ length: T }, (_, t) => {
    const totalSpend = channels.reduce((s, ch) => s + spends[ch][t], 0);
    const roas = 3.5 + rng() * 3;
    return Math.round(totalSpend * roas * (0.9 + rng() * 0.2));
  });
  return { spends, revenue };
}

function buildDemoAB() {
  return [
    { id: 'AB-001', name: 'Revitalift 랜딩페이지 A/B', variants: [
      { name: 'Control (기존)', visitors: 12450, conversions: 374 },
      { name: 'Variant A (영상 히어로)', visitors: 12380, conversions: 496 },
      { name: 'Variant B (리뷰 중심)', visitors: 12520, conversions: 438 },
    ]},
    { id: 'AB-002', name: 'Lancôme CTA 버튼 색상 테스트', variants: [
      { name: '골드 (#D4AF37)', visitors: 8200, conversions: 287 },
      { name: '블루 (#4f8ef7)', visitors: 8150, conversions: 342 },
    ]},
    { id: 'AB-003', name: 'NYX 모바일 체크아웃 흐름', variants: [
      { name: '1-Step 체크아웃', visitors: 15600, conversions: 702 },
      { name: '2-Step 체크아웃', visitors: 15450, conversions: 618 },
    ]},
  ];
}

function buildDemoLTV() {
  return [
    { channel: 'Meta Ads', customers: 4520, cac: 12400, ltv: 145000, ratio: 11.7, roas: 5.6 },
    { channel: 'Google Ads', customers: 3850, cac: 14200, ltv: 168000, ratio: 11.8, roas: 5.9 },
    { channel: 'Naver Ads', customers: 2840, cac: 8500, ltv: 92000, ratio: 10.8, roas: 3.4 },
    { channel: 'TikTok', customers: 5200, cac: 6800, ltv: 58000, ratio: 8.5, roas: 3.2 },
    { channel: 'Kakao', customers: 1920, cac: 9200, ltv: 78000, ratio: 8.5, roas: 3.0 },
    { channel: 'Email', customers: 3100, cac: 1200, ltv: 125000, ratio: 104.2, roas: 42.0 },
    { channel: 'Organic', customers: 6800, cac: 0, ltv: 62000, ratio: 999, roas: 999 },
    { channel: 'Instagram', customers: 2450, cac: 5400, ltv: 72000, ratio: 13.3, roas: 4.2 },
    { channel: 'Direct', customers: 1800, cac: 0, ltv: 95000, ratio: 999, roas: 999 },
  ];
}

function buildDemoAnomaly() {
  return [
    { ch: 'Meta Ads', status: 'ok', type: '정상', value: 5.6, baseline: 5.2, zscore: 0.8, desc: 'ROAS 안정 구간 — 목표 초과 달성 중', trend: [4.8,5.0,5.1,5.3,5.2,5.4,5.6] },
    { ch: 'Google Ads', status: 'ok', type: '정상', value: 5.9, baseline: 5.5, zscore: 0.6, desc: '검색 캠페인 효율 지속 양호', trend: [5.2,5.3,5.5,5.4,5.6,5.7,5.9] },
    { ch: 'TikTok', status: 'alert', type: 'ROAS 급등', value: 4.8, baseline: 3.2, zscore: 2.4, desc: '⚠ ROAS 급상승 감지 — NYX 챌린지 바이럴 효과 확인 필요', trend: [3.0,3.1,3.2,3.4,3.8,4.2,4.8] },
    { ch: 'Naver Ads', status: 'ok', type: '정상', value: 3.4, baseline: 3.3, zscore: 0.2, desc: '검색광고 효율 안정', trend: [3.2,3.3,3.3,3.4,3.3,3.4,3.4] },
    { ch: 'Kakao', status: 'warn', type: 'CTR 하락', value: 1.8, baseline: 2.5, zscore: -1.8, desc: '클릭률 감소 추세 — 소재 리프레시 권장', trend: [2.6,2.5,2.4,2.3,2.1,1.9,1.8] },
    { ch: 'Email', status: 'ok', type: '정상', value: 42.0, baseline: 38.0, zscore: 0.9, desc: '이메일 마케팅 안정적 고효율 유지', trend: [36,37,38,39,40,41,42] },
    { ch: 'Organic', status: 'ok', type: '정상', value: 12.5, baseline: 11.8, zscore: 0.5, desc: '오가닉 트래픽 꾸준히 성장 중', trend: [11.0,11.2,11.5,11.8,12.0,12.3,12.5] },
    { ch: 'Instagram', status: 'critical', type: 'CPM 급등', value: 18500, baseline: 8200, zscore: 3.1, desc: '🔴 CPM 급등 감지 — 경쟁 입찰 과열 가능성', trend: [8000,8500,9200,11000,14000,16500,18500] },
    { ch: 'Direct', status: 'info', type: '트래픽 증가', value: 15.2, baseline: 12.0, zscore: 1.2, desc: '직접 유입 증가 — 브랜드 인지도 상승 신호', trend: [11.5,12.0,12.5,13.0,13.8,14.5,15.2] },
  ];
}

function buildDemoModelCompare() {
  return {
    channels: ['Meta Ads','Naver Ads','Google Ads','TikTok','Kakao','Email','Organic','Instagram','Direct'],
    models: [
      { id: 'shapley', label: 'Shapley', color: '#4f8ef7', values: [22,14,20,15,8,6,5,7,3] },
      { id: 'mmm', label: 'MMM', color: '#a855f7', values: [25,12,22,13,7,5,6,6,4] },
      { id: 'markov', label: 'Markov', color: '#06b6d4', values: [20,15,18,16,9,7,4,8,3] },
      { id: 'last_touch', label: 'Last Touch', color: '#f59e0b', values: [28,10,24,12,6,4,3,9,4] },
      { id: 'linear', label: 'Linear', color: '#22c55e', values: [18,16,17,14,10,8,6,7,4] },
    ],
  };
}

function buildDemoCohorts() {
  return [
    { cohort: 'W01 (3/3~3/9)', size: 2840, retention: [100,68,52,41,35,30,27,24] },
    { cohort: 'W02 (3/10~3/16)', size: 3120, retention: [100,72,55,44,38,33,29,null] },
    { cohort: 'W03 (3/17~3/23)', size: 2950, retention: [100,70,53,42,36,31,null,null] },
    { cohort: 'W04 (3/24~3/30)', size: 3280, retention: [100,74,58,46,39,null,null,null] },
    { cohort: 'W05 (3/31~4/6)', size: 3450, retention: [100,76,60,48,null,null,null,null] },
    { cohort: 'W06 (4/7~4/13)', size: 3100, retention: [100,71,54,null,null,null,null,null] },
    { cohort: 'W07 (4/14~4/17)', size: 1820, retention: [100,69,null,null,null,null,null,null] },
  ];
}

/* ═══════════════════════════════════════════════════════════════════
   🛡️ ENVIRONMENT ISOLATION GUARD — Enterprise-grade demo/production split
   ───────────────────────────────────────────────────────────────────
   • Production (roi.genie-go.com): Empty arrays. Data ONLY from real APIs.
   • Demo (roidemo.genie-go.com):  Seeded with buildDemo*() for rich demo.
   • NEVER cross-contaminate. This is an absolute, non-negotiable rule.
   ═══════════════════════════════════════════════════════════════════ */
const _IS_DEMO_ENV = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host.includes('roidemo') || host.includes('demo') ||
           (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEMO_MODE === 'true');
  } catch { return false; }
})();

let _JOURNEYS = _IS_DEMO_ENV ? buildDemoJourneys(null) : [];
let TS_DATA   = _IS_DEMO_ENV ? buildDemoTimeSeries(null) : { spends: {}, revenue: [] };
let _DEMO_INITIALIZED = !_IS_DEMO_ENV; /* production: skip demo init forever */

/* ── 1. EXACT SHAPLEY TAB ───────────────────────────────────── */
const ShapleyTab = memo(function ShapleyTab() {
  const t = useT();
  const { lang } = useI18n();
  const [computing, setComputing] = useState(false);
  const [results, setResults] = useState(null);
  const [synergy, setSynergy] = useState(null);
  const [budget, setBudget] = useState({});

  const compute = useCallback(async () => {
    setComputing(true);
    await new Promise(r => setTimeout(r, 10));
    try {
      const chs = [...new Set(_JOURNEYS.flatMap(j => j.path))];
      const shapley = computeShapleyExact(_JOURNEYS, chs);
      const syn = computeSynergy(_JOURNEYS, chs);
      const totalBudget = 0;
      const rec = {};
      shapley.forEach(r => { rec[r.ch] = Math.round(r.pct / 100 * totalBudget); });
      setResults(shapley);
      setSynergy(syn);
      setBudget(rec);
    } finally { setComputing(false); }
  }, []);

  useEffect(() => { compute(); }, []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(79,142,247,0.07)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🧮 <strong style={{ color: '#4f8ef7' }}>{t('attrData.tabShapleyLabel', 'Exact Shapley')}</strong> — {t('attrData.explainShapley', '게임이론 기반 공정한 채널 기여도 산출.')}
      </div>
      {_JOURNEYS.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
          {t('attrData.noTimeSeriesData', '기여도 산출에 필요한 시계열 데이터가 없습니다.')}
        </div>
      ) : computing ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#4f8ef7', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          {t('attrData.shapleyInProgress', '2^n 정밀 Shapley 계산 in progress…')}
        </div>
      ) : results && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card card-glass">
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 16 }}>{t('attrData.shapleyTitle', '🎯 채널별 Exact Shapley 기여도')}</div>
            {results.filter(r => CH_COLORS[r.ch]).map(r => {
              const color = CH_COLORS[r.ch] || '#4f8ef7';
              const isTop = r === results[0];
              return (
                <div key={r.ch} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color, fontWeight: 800 }}>{CH_LABELS[r.ch] || r.ch}</span>
                      {isTop && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700, border: '1px solid rgba(34,197,94,0.3)' }}>👑 {t('attrData.topOne', '#1')}</span>}
                      {!r.positive && <Tag label={t('attrData.negativeCount', '음Count')} color="#ef4444" />}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtC(Math.abs(Math.round(r.value)))}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color, minWidth: 42, textAlign: 'right' }}>{r.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 8, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.abs(r.pct)}%`, height: '100%', background: r.positive ? `linear-gradient(90deg,${color},${color}88)` : 'rgba(239,68,68,0.5)', borderRadius: 8, transition: 'width 600ms' }} />
                  </div>
                </div>
              
);
            })}
          </div>
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <div className="card card-glass">
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{t('attrData.channelSynergy', '⚡ Channel 시너지 (Pairwise Lift)')}</div>
              {(synergy || []).slice(0, 5).map(s => (
                <div key={`${s.a}-${s.b}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface)' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                    <span style={{ color: CH_COLORS[s.b] || '#4f8ef7' }} >{CH_LABELS[s.a] || s.a}</span> + <span>{CH_LABELS[s.b] || s.b}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: s.synergy > 0 ? '#22c55e' : '#ef4444' }}>
                    {s.synergy > 0 ? '+' : ''}{(s.synergy * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="card card-glass">
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{t('attrData.shapleyBudgetRec', '💡 Shapley 기반 Budget 권고')}</div>
              {results.slice(0, 5).map(r => {
                const rec = r.pct > 25 ? { l: t('attrData.increase', '↑ 증액'), c: '#22c55e' } : r.pct > 15 ? { l: t('attrData.maintain', '→ 유지'), c: '#4f8ef7' } : { l: t('attrData.review', '↓ 검토'), c: '#f97316' };
                return (
                  <div key={r.ch} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: CH_COLORS[r.ch] || '#4f8ef7', fontWeight: 700 }}>{CH_LABELS[r.ch] || r.ch}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{fmtC(budget[r.ch] || 0)}</span>
                      <Tag label={rec.l} color={rec.c} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  

);
});

/* ── 2. BAYESIAN MMM TAB ─────────────────────────────────────── */
const MMMTab = memo(function MMMTab() {
  const t = useT();
  const [result, setResult] = useState(null);
  const [budget, setBudget] = useState({});
  const totalPct = Object.values(budget).reduce((s, v) => s + v, 0);

  useEffect(() => {
    if (TS_DATA.revenue.length === 0) return;
    setTimeout(() => {
      try {
        const channels = Object.keys(TS_DATA.spends);
        const mmmOut = bayesianMMM(TS_DATA.spends, TS_DATA.revenue, {
          decayRates: { 'Meta Ads': 0.6, 'Naver Ads': 0.5, 'Google Ads': 0.55, 'TikTok': 0.4, 'Kakao': 0.45, 'Email': 0.8 },
          halfSat: Object.fromEntries(channels.map(ch => [ch, TS_DATA.spends[ch].reduce((s, v) => s + v, 0) / 52 * 0.5])),
          bootstrapN: 200,
        });
        setResult(mmmOut);
      } catch (e) { console.error('MMM error', e); }
    }, 30);
  }, []);

  if (TS_DATA.revenue.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noTimeSeriesData', '기여도 산출에 필요한 시계열 데이터가 없습니다.')}
      </div>
    );
  }

  // Removed mock baseROAS and static decay data for production cleanly.
  const simResult = useMemo(() => {
    return Object.entries(budget).map(([ch, pct]) => {
      const spend = pct * 1_000_000 / 10;
      const roas = 0; // Production zero state
      const revenue = 0;
      return { ch, spend, revenue, roas, satPct: 0 };
    }).sort((a, b) => b.roas - a.roas);
  }, [budget]);

  const totalRev   = simResult.reduce((s, r) => s + r.revenue, 0);
  const totalSpend = simResult.reduce((s, r) => s + r.spend, 0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        📊 <strong style={{ color: '#a855f7' }}>{t('attrData.tabMmmLabel', 'Bayesian MMM')}</strong> — {t('attrData.explainMmm')}
        {result && <> Model R² = <strong style={{ color: '#22c55e' }}>{result.r2.toFixed(3)}</strong></>}
      </div>
      {result && (
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('attrData.mmmTitle', '📈 Bayesian MMM — 채널 기여도 (52주 시계열)')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[{ l: 'R²', v: result.r2.toFixed(3), c: '#22c55e' }, { l: 'RMSE', v: fmtC(Math.round(result.rmse)), c: '#4f8ef7' }, { l: 'Channel', v: result.channelResults.length, c: '#a855f7' }].map(k => (
              <div key={k.l} style={{ textAlign: 'center', padding: 10, borderRadius: 10, background: `${k.c}08`, border: `1px solid ${k.c}22` }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: k.c }}>{k.v}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k.l}</div>
              </div>
            ))}
          </div>
          {result.channelResults.sort((a, b) => b.share - a.share).map(r => {
            const color = CH_COLORS[r.ch] || '#4f8ef7';
            return (
              <div key={r.ch} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color, fontWeight: 800 }}>{CH_LABELS[r.ch] || r.ch}</span>
                    {r.saturation > 0.7 && <Tag label={`${t('attrData.saturation', '포화')} ${(r.saturation * 100).toFixed(0)}%`} color="#f97316" />}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color }}>{r.share.toFixed(1)}%</span>
                    {r.ci95 && <div style={{ fontSize: 9, color: 'var(--text-3)' }}>CI [{r.ci95[0].toFixed(2)}, {r.ci95[1].toFixed(2)}]</div>}
                  </div>
                </div>
                <div style={{ height: 7, borderRadius: 7, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: `${r.share}%`, height: '100%', background: `linear-gradient(90deg,${color},${color}66)`, borderRadius: 7, transition: 'width 500ms' }} />
                </div>
              </div>
            
);
          })}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 14 }}>🎛️ {t('attrData.budgetAdjust')} ({t('attrData.totalStr', 'Total:')} {totalPct}%)</div>
          {Object.entries(budget).map(([ch, pct]) => (
            <div key={ch} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: CH_COLORS[ch] || '#4f8ef7', fontWeight: 700 }}>{CH_LABELS[ch] || ch}</span>
                <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 700 }}>{pct}%</span>
              </div>
              <input type="range" min={0} max={60} value={pct}
                onChange={e => setBudget(b => ({ ...b, [ch]: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: CH_COLORS[ch] || '#4f8ef7', height: 4 }} />
            </div>
          ))}
        </div>
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 14 }}>{t('attrData.mmmSim', '📈 MMM 시뮬레이션 결과')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', padding: 10, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e' }}>{(totalRev / Math.max(totalSpend, 1)).toFixed(2)}x</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t("attrData.expectedBlendRoas") || "예상 블렌드 ROAS"}</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#4f8ef7' }}>{fmtC(Math.round(totalRev))}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t("attrData.expectedRev") || "예상 Revenue"}</div>
            </div>
          </div>
          {simResult.map(r => {
            const color = CH_COLORS[r.ch] || '#4f8ef7';
            return (
              <div key={r.ch} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color, fontWeight: 700 }}>{CH_LABELS[r.ch] || r.ch}</span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: r.roas > 5 ? '#22c55e' : r.roas > 3 ? '#4f8ef7' : '#f97316' }}>{r.roas.toFixed(1)}x ROAS</span>
                </div>
                <div style={{ height: 5, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(r.roas / 8 * 100, 100)}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 300ms' }} />
                </div>
                {r.satPct > 40 && <div style={{ fontSize: 9, color: '#f97316', marginTop: 2 }}>{t('attrData.saturationWarning', '⚠ 포화도 {{sat}}% — Add 효용 Decrease', {sat: Math.min(r.satPct, 95)})}</div>}
              </div>
            
            );
          })}
        </div>
      </div>
    </div>
  
);
});

/* ── 3. MARKOV + DOUBLE ML UPLIFT TAB ───────────────────────── */
const MarkovTab = memo(function MarkovTab() {
  const t = useT();
  const [computing, setComputing] = useState(false);
  const [markovRes, setMarkovRes] = useState(null);
  const [upliftRes, setUpliftRes] = useState(null);

  useEffect(() => {
    if (_JOURNEYS.length === 0) return;
    setComputing(true);
    setTimeout(() => {
      try {
        const channels = [...new Set(_JOURNEYS.flatMap(j => j.path))];
        setMarkovRes(markovAttribution(_JOURNEYS, channels));
        setUpliftRes(incrementalUplift(TS_DATA.spends, TS_DATA.revenue));
      } finally { setComputing(false); }
    }, 30);
  }, []);

  if (_JOURNEYS.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noJourneyData', '마르코프 체인 분석에 필요한 Customer 여정 데이터가 없습니다.')}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🔗 <strong style={{ color: '#06b6d4' }}>{t('attrData.tabMarkovLabel', 'Markov+Uplift')}</strong> — {t('attrData.explainMarkov')}
      </div>
      {computing && <div style={{ textAlign: 'center', padding: 40, color: '#06b6d4' }}>{t('attrData.markovInProgress', 'Markov Chain + Double ML 계산 in progress…')}</div>}
      {markovRes && !computing && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card card-glass">
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('attrData.markovTitle', '🔗 Markov Chain — 제거 효과 (Removal Effect)')}</div>
            {markovRes.filter(r => CH_COLORS[r.ch]).map(r => {
              const color = CH_COLORS[r.ch] || '#4f8ef7';
              return (
                <div key={r.ch} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color, fontWeight: 800 }}>{CH_LABELS[r.ch] || r.ch}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color }}>{r.share.toFixed(1)}%</span>
                      <div style={{ fontSize: 9, color: 'var(--text-3)' }}>removal: {(r.removalEffect * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div style={{ height: 7, borderRadius: 7, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${r.share}%`, height: '100%', background: `linear-gradient(90deg,${color},${color}66)`, borderRadius: 7, transition: 'width 600ms' }} />
                  </div>
                </div>
              
);
            })}
          </div>
          <div className="card card-glass">
            <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('attrData.upliftTitle', '📐 증분 모델 (Double ML Uplift)')}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 12 }}>{t('attrData.upliftSub', '로빈슨 편회귀 기반의 순수 증분 효과')}</div>
            {upliftRes && upliftRes.map(r => {
              const color = CH_COLORS[r.ch] || '#4f8ef7';
              const maxAbs = Math.max(...upliftRes.map(u => Math.abs(u.uplift)), 1);
              return (
                <div key={r.ch} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color, fontWeight: 800 }}>{CH_LABELS[r.ch] || r.ch}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: r.uplift > 0 ? '#22c55e' : '#ef4444' }}>{r.uplift > 0 ? '+' : ''}{r.uplift.toFixed(2)}</span>
                      <div style={{ fontSize: 9, color: 'var(--text-3)' }}>R²={r.r2partial.toFixed(3)}</div>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.abs(r.uplift) / maxAbs * 100}%`, height: '100%', background: r.uplift > 0 ? '#22c55e' : '#ef4444', borderRadius: 6, transition: 'width 500ms' }} />
                  </div>
                </div>
              
              );
            })}
          </div>
        </div>
      )}
    </div>
  
);
});

/* ── 4. MULTI-TOUCH ATTRIBUTION TAB ─────────────────────────── */
const AttributionTab = memo(function AttributionTab() {
  const t = useT();
  const [model, setModel] = useState('last');
  const MODELS = [
    { id: 'first', label: t('attrData.firstTouch') }, { id: 'last', label: t('attrData.lastTouch') },
    { id: 'linear', label: t('attrData.linear') }, { id: 'time_decay', label: t('attrData.timeDecay') }, { id: 'position', label: t('attrData.position') },
  ];

  if (_JOURNEYS.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noTimeSeriesData', '기여도 산출에 필요한 시계열 데이터가 없습니다.')}
      </div>
    );
  }

  function calcMTA(journeys, model) {
    const tp = {};
    const init = ch => { tp[ch] = tp[ch] || { channel: ch, conversions: 0, revenue: 0 }; };
    journeys.forEach(({ path, revenue }) => {
      if (!path.length) return;
      let w = {};
      if (model === 'first') w[path[0]] = 1;
      else if (model === 'last') w[path[path.length - 1]] = 1;
      else if (model === 'linear') path.forEach(c => { w[c] = (w[c] || 0) + 1 / path.length; });
      else if (model === 'time_decay') {
        const tot = path.reduce((s, _, i) => s + Math.pow(2, i), 0);
        path.forEach((c, i) => { w[c] = (w[c] || 0) + Math.pow(2, i) / tot; });
      } else {
        if (path.length === 1) w[path[0]] = 1;
        else { w[path[0]] = (w[path[0]] || 0) + 0.4; w[path[path.length - 1]] = (w[path[path.length - 1]] || 0) + 0.4; path.slice(1, -1).forEach(c => { w[c] = (w[c] || 0) + 0.2 / Math.max(path.length - 2, 1); }); }
      }
      Object.entries(w).forEach(([c, v]) => { init(c); tp[c].conversions += v; tp[c].revenue += revenue * v; });
    });
    return Object.values(tp).sort((a, b) => b.revenue - a.revenue);
  }
  const results  = useMemo(() => calcMTA(_JOURNEYS, model), [model]);
  const totalRev = results.reduce((s, r) => s + r.revenue, 0);
  const topPaths = useMemo(() => {
    const pm = {};
    _JOURNEYS.forEach(j => { const k = j.path.join(' → '); pm[k] = pm[k] || { path: k, count: 0, revenue: 0 }; pm[k].count++; pm[k].revenue += j.revenue; });
    return Object.values(pm).sort((a, b) => b.count - a.count).slice(0, 6);
  }, []);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MODELS.map(m => (
          <button key={m.id} onClick={() => setModel(m.id)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, transition: 'all 150ms', background: model === m.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'rgba(255,255,255,0.06)', color: model === m.id ? '#fff' : 'var(--text-2)' }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>📊 {t('attrData.channelContrib')}</div>
          {results.map(r => {
            const color = CH_COLORS[r.channel] || '#4f8ef7';
            const share = totalRev > 0 ? r.revenue / totalRev * 100 : 0;
            return (
              <div key={r.channel} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color, fontWeight: 700 }}>{CH_LABELS[r.channel] || r.channel}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{fmtC(Math.round(r.revenue))}</span>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: `${share}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 400ms' }} />
                </div>
                <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{share.toFixed(1)}%</div>
              </div>
            
            );
          })}
        </div>
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>🗺️ {t('attrData.topPaths')}</div>
          {topPaths.map(p => (
            <div key={p.path} style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--surface)' }}>
              <div style={{ fontSize: 10, marginBottom: 3 }}>
                {p.path.split(' → ').map((ch, j, arr) => (
                  <span key={j}><span style={{ color: 'var(--text-3)', fontWeight: 700, margin: '0 3px' }} >{CH_LABELS[ch] || ch}</span>{j < arr.length - 1 && <span>→</span>}</span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{p.count} items</span>
                <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{fmtC(p.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  
);
});

/* ── 5. BETA-BINOMIAL A/B TAB ───────────────────────────────── */
let _AB = _IS_DEMO_ENV ? buildDemoAB() : []; /* 🛡️ GUARD: demo only */

const BayesianABTab = memo(function BayesianABTab() {
  const t = useT();
  const [sel, setSel]         = useState(0);
  const [computing, setC]     = useState(false);
  const [analyzed, setAnalyzed] = useState(null);
  const test = _AB[sel];

  useEffect(() => {
    if (!test) return;
    setC(true);
    setTimeout(() => {
      try { setAnalyzed(bayesianAB(test.variants, 5000)); }
      finally { setC(false); }
    }, 20);
  }, [sel, test]);

  if (!test) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noAbData', '진행 중인 A/B 테스트 데이터가 없습니다.')}
      </div>
    );
  }

  const winIdx = analyzed ? analyzed.reduce((best, v, i) => v.winProb > analyzed[best].winProb ? i : best, 0) : 0;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🧪 <strong style={{ color: '#a855f7' }}>{t('attrData.tabAbLabel', 'Bayesian A/B')}</strong> — {t('attrData.explainAb')}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {_AB.map((testItem, i) => (
          <button key={testItem.id} onClick={() => setSel(i)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: i === sel ? 'linear-gradient(135deg,#4f8ef7,#a855f7)' : 'rgba(255,255,255,0.06)', color: i === sel ? '#fff' : 'var(--text-2)' }}>
            {testItem.name}
          </button>
        ))}
      </div>
      {computing && <div style={{ textAlign: 'center', padding: 40, color: '#a855f7' }}>{t('attrData.thompsonInProgress', 'Thompson Sampling (5,000회) Run in progress…')}</div>}
      {analyzed && !computing && (
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>{test.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 16 }}>{t('attrData.betaBinomial', 'Beta-Binomial · {{count}}명', {count: test.variants.reduce((s, v) => s + v.visitors, 0).toLocaleString()})}</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${test.variants.length},1fr)`, gap: 12 }}>
            {analyzed.map((v, i) => {
              const isW = i === winIdx;
              return (
                <div key={v.name} style={{ padding: 14, borderRadius: 14, background: isW ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.3)', border: `2px solid ${isW ? '#22c55e' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 900 }}>{v.name}</span>
                    {isW && <Tag label={t('attrData.winner', '🏆 승자')} color="#22c55e" />}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: 'var(--text-3)' }} ><div>{v.visitors.toLocaleString()}</div><div>{t('attrData.visitor', '방문자')}</div></div>
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: 'var(--text-3)' }} ><div>{v.conversions}</div><div>{t('attrData.conversion', 'Conversion')}</div></div>
                  </div>
                  {[
                    { l: 'Conv. Rate', v: `${(v.cr * 100).toFixed(2)}%`, c: '#eab308' },
                    { l: 'P(승리)', v: `${(v.winProb * 100).toFixed(1)}%`, c: isW ? '#22c55e' : 'var(--text-2)' },
                    { l: 'Lift', v: `${v.lift > 0 ? '+' : ''}${v.lift.toFixed(1)}%`, c: v.lift > 0 ? '#22c55e' : '#ef4444' },
                    { l: 'CI₉₅', v: `[${(v.ci95[0] * 100).toFixed(1)}, ${(v.ci95[1] * 100).toFixed(1)}]%`, c: 'var(--text-3)' },
                  ].map(k => (
                    <div key={k.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-3)' }}>{k.l}</span>
                      <span style={{ fontWeight: 700, color: k.c }}>{k.v}</span>
                    </div>
                  ))}
                  <div style={{ height: 7, borderRadius: 7, background: 'var(--border)', overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${v.winProb * 100}%`, height: '100%', background: isW ? '#22c55e' : '#4f8ef7', borderRadius: 7, transition: 'width 600ms' }} />
                  </div>
                </div>
              
              );
            })}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.07)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 12, color: 'var(--text-2)' }}>
            🤖 {t('attrData.abWinner', '<strong style={{ color: "#22c55e" }}>{{name}}</strong>이 <strong>{{prob}}%</strong> 확률로 최선.', {name: analyzed[winIdx]?.name, prob: (analyzed[winIdx]?.winProb * 100).toFixed(1)})}
            {analyzed[winIdx]?.winProb > 0.95 ? t('attrData.abDeploy', ' ✅ 즉시 배포 권장') : analyzed[winIdx]?.winProb > 0.8 ? t('attrData.abCollectMore', ' 🟡 데이터 추가 수집 권장') : t('attrData.abKeepRunning', ' ⏳ 실험 계속')}
          </div>
        </div>
      )}
    </div>
  );
});

/* ── 6. COHORT ──────────────────────────────────────────────── */
const CohortTab = memo(function CohortTab() {
  const t = useT();
  const weeks = ['W1','W2','W3','W4','W5','W6','W7','W8'];
  const cohorts = _COHORTS.length > 0 ? _COHORTS : [];

  if (_JOURNEYS.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noTimeSeriesData', '기여도 산출에 필요한 시계열 데이터가 없습니다.')}
      </div>
    );
  }

  return (
    <div className="card card-glass">
      <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 12 }}>{t('attrData.cohortTitle', '📅 주차별 구매 코호트 — 유지율(%)')}</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>{t('attrData.cohortHdr', '코호트')}</th><th>{t('attrData.sizeHdr', '규모')}</th>{weeks.map(w=><th key={w} style={{ minWidth:52 }}>{w}</th>)}</tr></thead>
          <tbody>
            {cohorts.map(c => (
              <tr key={c.cohort}>
                <td style={{ fontWeight:700, color:'#4f8ef7' }}>{c.cohort}</td>
                <td style={{ color:'var(--text-3)' }}>{c.size}</td>
                {c.retention.map((r,ri)=>{
                  if(r===null) return <td key={ri}/>;
                  const pct=Number(r);
                  return <td key={ri} style={{background:`rgba(${255-Math.floor(pct*2.5)},${Math.floor(pct*2.5)},50,0.2)`,fontWeight:ri===0?900:400,color:ri===0?'#22c55e':pct>50?'#4f8ef7':pct>25?'#eab308':'#ef4444',textAlign:'center'}}>{r}%</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

/* ── 7. LTV vs CAC ──────────────────────────────────────────── */
let _LTV = _IS_DEMO_ENV ? buildDemoLTV() : []; /* 🛡️ GUARD: demo only */
function LtvCacTab() {
  const t = useT();
  const totalCac = _LTV.reduce((s,r) => s+r.cac*r.customers,0);
  const totalLtv = _LTV.reduce((s,r) => s+r.ltv*r.customers,0);

  if (_JOURNEYS.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noTimeSeriesData', '기여도 산출에 필요한 시계열 데이터가 없습니다.')}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          {l:'Average LTV/CAC', v:(totalLtv/Math.max(totalCac,1)).toFixed(1)+'x', c:'#22c55e'},
          {l:t('attrData.totalCac', 'Total CAC 지출'), v:fmtC(totalCac), c:'#ef4444'},
          {l:t('attrData.totalLtv', 'Total LTV 합산'), v:fmtC(totalLtv), c:'#4f8ef7'},
          {l:'Marketing ROI', v:((totalLtv-totalCac)/totalCac*100).toFixed(0)+'%', c:'#a855f7'},
        ].map(k=>(
          <div key={k.l} style={{padding:14,borderRadius:12,background:`${k.c}08`,border:`1px solid ${k.c}22`,textAlign:'center'}}>
            <div style={{ fontSize:20, fontWeight:900, color:k.c }}>{k.v}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div className="card card-glass">
        <div style={{ fontWeight:900, fontSize:13, marginBottom:14 }}>{t('attrData.ltvcacTitle', '💰 채널별 LTV vs CAC')}</div>
        <table className="table">
          <thead><tr><th>{t('attrData.colChannel', 'Channel')}</th><th>CustomerCount</th><th>CAC</th><th>LTV</th><th>LTV/CAC</th><th>ROAS</th><th>{t("attrData.health", "건강도")}</th></tr></thead>
          <tbody>
            {_LTV.sort((a,b)=>b.ratio-a.ratio).map(r=>{
              const color=CH_COLORS[r.channel]||'#4f8ef7';
              const h=r.ratio>=10?{l:t('attrData.excellent', '탁월'),c:'#22c55e'}:r.ratio>=5?{l:t('attrData.good', '양호'),c:'#4f8ef7'}:r.ratio>=3?{l:t('attrData.normal', 'Normal'),c:'#eab308'}:{l:t('attrData.caution', '주의'),c:'#ef4444'};
              return (
                <tr key={r.channel}>
                  <td style={{ color, fontWeight:700 }}>{CH_LABELS[r.channel]||r.channel}</td>
                  <td style={{ textAlign:'center' }}>{r.customers}</td>
                  <td style={{ color:'#ef4444' }}>{fmtC(r.cac)}</td>
                  <td style={{ color:'#22c55e', fontWeight:700 }}>{fmtC(r.ltv)}</td>
                  <td style={{ fontWeight:900, fontSize:14, color:r.ratio>=10?'#22c55e':r.ratio>=5?'#4f8ef7':'#eab308' }}>{r.ratio.toFixed(1)}x</td>
                  <td style={{ color:'#a855f7', fontWeight:700 }}>{r.roas.toFixed(1)}x</td>
                  <td><Tag label={h.l} color={h.c}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 8. ANOMALY DETECTION TAB ───────────────────────────────── */
let ANOMALY_DATA = _IS_DEMO_ENV ? buildDemoAnomaly() : []; /* 🛡️ GUARD: demo only */
const ANOMALY_STATUS = { critical: { label: '🔴 위험', key: 'statusCrit', color: '#ef4444' }, alert: { label: '🟠 주의', key: 'statusAlert', color: '#f97316' }, warn: { label: '🟡 Warning', key: 'statusWarn', color: '#eab308' }, info: { label: '🔵 Info', key: 'statusInfo', color: '#4f8ef7' }, ok: { label: '🟢 정상', key: 'statusOk', color: '#22c55e' } };

function AnomalyMiniChart({ data, color, status }) {
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * h}`).join(' ');
  const lx = w, ly = h - ((data[data.length - 1] - mn) / rng) * h;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polygon points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill={color} />
      {status === 'critical' && <circle cx={lx} cy={ly} r={6} fill="none" stroke={color} strokeWidth={1} opacity={0.5}><animate attributeName="r" values="3;8;3" dur="1.5s" repeatCount="indefinite" /></circle>}
    </svg>
  );
}

function AnomalyTab() {
  const t = useT();
  const alertCount = ANOMALY_DATA.filter(d => d.status === 'critical' || d.status === 'alert').length;
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? ANOMALY_DATA : ANOMALY_DATA.filter(d => d.status === filter || (filter === 'issue' && ['critical','alert','warn'].includes(d.status)));

  if (_JOURNEYS.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noTimeSeriesData', '기여도 산출에 필요한 시계열 데이터가 없습니다.')}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: alertCount > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.07)', border: `1px solid ${alertCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🚨 <strong style={{ color: alertCount > 0 ? '#ef4444' : '#22c55e' }}>{t('attrData.anomalyHeadDesc', '실시간 이상감지 (Anomaly Detection)')}</strong> — {t('attrData.anomalyBodyText', 'Z-score 기반 채널 타당성 모니터링. |z| > 2.0 시 자동 알림, 7일 이동 평균 트렌드 분석.')}
        {alertCount > 0 && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700, fontSize: 11 }}>{alertCount}{t('attrData.alertCountSuffix', '건 주의 필요')}</span>}
      </div>

      {/* Filter Button */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['all','All'], ['issue',t('attrData.filterIssue', '이슈만')], ['ok',t('attrData.filterOk', '정상')]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: filter === v ? 'linear-gradient(135deg,#ef4444,#f97316)' : 'rgba(255,255,255,0.06)', color: filter === v ? '#fff' : 'var(--text-2)' }}>{l}</button>
        ))}
      </div>

      {/* Channelper 이상감지 Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {filtered.map(d => {
          const st = ANOMALY_STATUS[d.status];
          const color = st.color;
          const isIssue = ['critical','alert','warn'].includes(d.status);
          return (
            <div key={d.ch} className="card card-glass" style={{ border: `1px solid ${color}30`, background: isIssue ? `${color}05` : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: CH_COLORS[d.ch] || '#4f8ef7' }}>{CH_LABELS[d.ch] || d.ch}</span>
                    <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: `${color}15`, color, border: `1px solid ${color}30`, fontWeight: 700 }}>{st.key ? t('attrData.' + st.key, st.label) : st.label}</span>
                    <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{d.type === '정상' ? t('attrData.filterOk', '정상') : (d.type === 'ROAS 급등' ? t('attrData.roasSurge', 'ROAS 급등') : d.type)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6, maxWidth: 240 }}>{d.desc}</div>
                </div>
                <AnomalyMiniChart data={d.trend} color={color} status={d.status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                {[
                  { l: t('attrData.currVal', '현재Value'), v: d.value.toFixed(1), c: color },
                  { l: t('attrData.baseline', '기준선'), v: d.baseline.toFixed(1), c: 'var(--text-3)' },
                  { l: 'Z-score', v: (d.zscore > 0 ? '+' : '') + d.zscore.toFixed(2), c: Math.abs(d.zscore) > 2 ? '#ef4444' : Math.abs(d.zscore) > 1.5 ? '#eab308' : '#22c55e' },
                ].map(k => (
                  <div key={k.l} style={{ textAlign: 'center', padding: '6px', borderRadius: 8, background: 'var(--surface)' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: k.c }}>{k.v}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{k.l}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="card card-glass">
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 12 }}>{t("attrData.anomalySummary", "📊 이상감지 Summary")}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
          {['critical','alert','warn','info','ok'].map(s => {
            const st = ANOMALY_STATUS[s];
            const count = ANOMALY_DATA.filter(d => d.status === s).length;
            return (
              <div key={s} style={{ textAlign: 'center', padding: '10px 8px', borderRadius: 10, background: `${st.color}08`, border: `1px solid ${st.color}20` }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: st.color }}>{count}</div>
                <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{st.key ? t('attrData.' + st.key, st.label) : st.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 9. MODEL COMPARE RADAR + A-SCORE TAB ───────────────────── */
let MODEL_COMPARE_DATA = _IS_DEMO_ENV ? buildDemoModelCompare() : { channels: [], models: [] }; /* 🛡️ GUARD: demo only */
let _COHORTS = _IS_DEMO_ENV ? buildDemoCohorts() : []; /* 🛡️ GUARD: demo only */

function RadarChart({ data, channels, colors, size = 220 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const n = channels.length;
  const getPoint = (val, idx, maxVal = 35) => {
    const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
    const ratio = (val / maxVal) * r;
    return { x: cx + ratio * Math.cos(angle), y: cy + ratio * Math.sin(angle) };
  };
  const axisPoints = channels.map((_, i) => getPoint(35, i));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map(ratio => (
        <polygon key={ratio} points={axisPoints.map(p => `${cx + (p.x - cx) * ratio},${cy + (p.y - cy) * ratio}`).join(' ')} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      ))}
      {/* Axes */}
      {axisPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      ))}
      {/* Channel labels */}
      {channels.map((ch, i) => {
        const p = getPoint(42, i);
        return <text key={ch} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="rgba(255,255,255,0.55)" fontWeight={600}>{CH_LABELS[ch] || ch}</text>;
      })}
      {/* Model polygons */}
      {data.map((model, mi) => (
        <polygon key={model.id} points={model.values.map((v, i) => { const p = getPoint(v, i); return `${p.x},${p.y}`; }).join(' ')} fill={model.color} fillOpacity={0.08 + mi * 0.01} stroke={model.color} strokeWidth={1.5} strokeOpacity={0.8} />
      ))}
    </svg>
  );
}

function ModelCompareTab() {
  const t = useT();
  const { channels, models } = MODEL_COMPARE_DATA;
  const [selModel, setSelModel] = useState(null); // null = all

  if (_JOURNEYS.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
        {t('attrData.noTimeSeriesData', '기여도 산출에 필요한 시계열 데이터가 없습니다.')}
      </div>
    );
  }

  // A-Score = 모델 간 표준편차가 낮을Count록 높은 점Count (일관성 기반)
  const aScores = channels.map((ch, ci) => {
    const vals = models.map(m => m.values[ci]);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length);
    const score = Math.max(0, Math.min(100, Math.round(100 - std * 4)));
    return { ch, mean: mean.toFixed(1), std: std.toFixed(1), score };
  }).sort((a, b) => b.score - a.score);

  const displayModels = selModel ? models.filter(m => m.id === selModel) : models;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🕸️ <strong style={{ color: '#6366f1' }}>A-Score</strong> — {t('attrData.compareDescText', '5가지 주요 어트리뷰션 모델 기여도를 레이더 차트로 비교하고, 결과 일치도를 기반으로 신뢰도(A-Score)를 산정합니다.')}
      </div>

      {/* 모델 Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setSelModel(null)} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: !selModel ? 'linear-gradient(135deg,#6366f1,#4f8ef7)' : 'rgba(255,255,255,0.06)', color: !selModel ? '#fff' : 'var(--text-2)' }}>{t('attrData.allCompare', 'All Compare')}</button>
        {models.map(m => (
          <button key={m.id} onClick={() => setSelModel(m.id)} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: selModel === m.id ? m.color : 'rgba(255,255,255,0.06)', color: selModel === m.id ? '#fff' : 'var(--text-2)' }}>{m.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 레이더 Chart */}
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t("attrData.radarCompare", "🕸️ Channel 기여도 레이더 Compare")}</div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <RadarChart data={displayModels} channels={channels} size={240} />
          </div>
          {/* 범례 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {displayModels.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                <div style={{ width: 10, height: 3, borderRadius: 2, background: m.color }} />
                <span style={{ color: m.color, fontWeight: 700 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* A-Score */}
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>🏆 {t('attrData.ascoreTitle', 'A-Score (Attribution Confidence)')}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 14 }}>{t('attrData.aScoreSub', '모델 간 일관성 기반 — 높을수록 모든 모델이 동의하는 신뢰도 높은 Channel')}</div>
          {aScores.map((a, i) => {
            const color = CH_COLORS[a.ch] || '#4f8ef7';
            const scoreColor = a.score >= 80 ? '#22c55e' : a.score >= 60 ? '#4f8ef7' : a.score >= 40 ? '#eab308' : '#ef4444';
            return (
              <div key={a.ch} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i === 0 && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 700 }}>👑 {t('attrData.highest', '최고')}</span>}
                    <span style={{ fontSize: 12, fontWeight: 900, color }}>{CH_LABELS[a.ch] || a.ch}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('attrData.average', 'Average')} {a.mean}% / σ={a.std}</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: scoreColor, minWidth: 36, textAlign: 'right' }}>{a.score}</span>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: `${a.score}%`, height: '100%', background: `linear-gradient(90deg,${scoreColor},${scoreColor}88)`, borderRadius: 8, transition: 'width 600ms' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 모델per 숫자 Compare Table */}
      <div className="card card-glass">
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 12 }}>{t("attrData.modelCompareTable", "📋 모델per Channel 기여도 Compare표 (%)")}</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('attrData.colChannel', 'Channel')}</th>
                {models.map(m => <th key={m.id} style={{ color: m.color }}>{m.label}</th>)}
                <th style={{ color: '#6366f1' }}>A-Score</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch, ci) => {
                const vals = models.map(m => m.values[ci]);
                const max = Math.max(...vals), min = Math.min(...vals);
                const ascore = aScores.find(a => a.ch === ch);
                return (
                  <tr key={ch}>
                    <td style={{ color: CH_COLORS[ch] || '#4f8ef7', fontWeight: 700 }}>{CH_LABELS[ch] || ch}</td>
                    {vals.map((v, mi) => (
                      <td key={mi} style={{ textAlign: 'center', fontWeight: v === max ? 900 : 400, color: v === max ? '#22c55e' : v === min ? '#ef4444' : 'var(--text-2)' }}>{v}%</td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 900, color: ascore?.score >= 80 ? '#22c55e' : ascore?.score >= 60 ? '#4f8ef7' : '#eab308' }}>{ascore?.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN ────────────────────────────────────────────────────── */
/* ── 10. GUIDE TAB ──────────────────────────────────────────── */
function GuideTab() {
  const t = useT();
  const [openFaq, setOpenFaq] = useState(null);
  const STEPS = [
    {n:'1️⃣',k:'guideStep1',c:'#4f8ef7'},{n:'2️⃣',k:'guideStep2',c:'#22c55e'},{n:'3️⃣',k:'guideStep3',c:'#a855f7'},
    {n:'4️⃣',k:'guideStep4',c:'#f59e0b'},{n:'5️⃣',k:'guideStep5',c:'#06b6d4'},{n:'6️⃣',k:'guideStep6',c:'#f97316'},
    {n:'7️⃣',k:'guideStep7',c:'#ec4899'},{n:'8️⃣',k:'guideStep8',c:'#ef4444'},{n:'9️⃣',k:'guideStep9',c:'#6366f1'},
    {n:'🔟',k:'guideStep10',c:'#14b8a6'},{n:'1️⃣1️⃣',k:'guideStep11',c:'#8b5cf6'},{n:'1️⃣2️⃣',k:'guideStep12',c:'#0ea5e9'},
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s' }}>
      {/* Hero */}
      <div className="card card-glass" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.12),rgba(168,85,247,0.08))', borderColor: 'rgba(79,142,247,0.3)', textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 44 }}>📈</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8 }}>{t('attrData.guideTitle')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 600, margin: '6px auto 0', lineHeight: 1.7 }}>{t('attrData.guideSub')}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <span className="badge badge-blue">{t('attrData.guideBeginnerBadge')}</span>
          <span className="badge badge-purple">{t('attrData.guideTimeBadge')}</span>
          <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>{t('attrData.guideLangBadge')}</span>
        </div>
      </div>

      {/* Where to Start */}
      <div className="card card-glass" style={{ padding: 20, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.25)' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: '#4f8ef7' }}>🚀 {t('attrData.guideWhereToStart')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 2.0, whiteSpace: 'pre-line' }}>{t('attrData.guideWhereToStartDesc')}</div>
      </div>

      {/* Steps 1-12 */}
      <div className="card card-glass" style={{ padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('attrData.guideStepsTitle')} (12)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
          {STEPS.map((s,i) => (
            <div key={i} style={{ background: s.c+'0a', border: `1px solid ${s.c}25`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{s.n}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: s.c }}>{t(`attrData.${s.k}Title`)}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>{t(`attrData.${s.k}Desc`)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Reference */}
      <div className="card card-glass" style={{ padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>{t('attrData.guideTabsTitle')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {[{icon:'📊',k:'guideMta',c:'#4f8ef7'},{icon:'🧮',k:'guideShapley',c:'#22c55e'},{icon:'📈',k:'guideMmm',c:'#a855f7'},{icon:'🔗',k:'guideMarkov',c:'#06b6d4'},{icon:'🧪',k:'guideAb',c:'#f59e0b'},{icon:'📅',k:'guideCohort',c:'#f97316'},{icon:'💰',k:'guideLtv',c:'#ef4444'},{icon:'🚨',k:'guideAnomaly',c:'#dc2626'},{icon:'🕸️',k:'guideCompare',c:'#6366f1'}].map((tb,i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid rgba(99,140,255,0.08)' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{tb.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: tb.c }}>{t(`attrData.${tb.k}Name`)}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.6 }}>{t(`attrData.${tb.k}Desc`)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Tips */}
      <div className="card card-glass" style={{ padding: 20, background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.3)' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>💡 {t('attrData.guideTipsTitle')}</div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: 'var(--text-3)', lineHeight: 2.2 }}>
          <li>{t('attrData.guideTip1')}</li>
          <li>{t('attrData.guideTip2')}</li>
          <li>{t('attrData.guideTip3')}</li>
          <li>{t('attrData.guideTip4')}</li>
          <li>{t('attrData.guideTip5')}</li>
        </ul>
      </div>

      {/* FAQ */}
      <div className="card card-glass" style={{ padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>❓ {t('attrData.guideFaqTitle')}</div>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ marginBottom: 8, borderRadius: 10, border: '1px solid rgba(99,140,255,0.1)', overflow: 'hidden' }}>
            <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: openFaq === i ? 'rgba(79,142,247,0.06)' : 'transparent', transition: 'background 150ms' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{t(`attrData.guideFaq${i}Q`)}</span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▼</span>
            </div>
            {openFaq === i && (
              <div style={{ padding: '0 16px 14px', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.8 }}>{t(`attrData.guideFaq${i}A`)}</div>
            )}
          </div>
        ))}
      </div>

      {/* Ready CTA */}
      <div className="card card-glass" style={{ padding: 24, background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(79,142,247,0.06))', borderColor: 'rgba(34,197,94,0.3)', textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🎯</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8, color: '#22c55e' }}>{t('attrData.guideReadyTitle')}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>{t('attrData.guideReadyDesc')}</div>
      </div>
    </div>
  );
}

const getTabs = (t) => [
  { id:'mta',      label:t('attrData.tabMtaLabel'),  desc:t('attrData.tabMtaDesc') },
  { id:'shapley',  label:t('attrData.tabShapleyLabel'), desc:t('attrData.tabShapleyDesc') },
  { id:'mmm',      label:t('attrData.tabMmmLabel'),  desc:t('attrData.tabMmmDesc') },
  { id:'markov',   label:t('attrData.tabMarkovLabel'), desc:t('attrData.tabMarkovDesc') },
  { id:'bayesian', label:t('attrData.tabAbLabel'),  desc:t('attrData.tabAbDesc') },
  { id:'cohort',   label:t('attrData.tabCohortLabel'),    desc:t('attrData.tabCohortDesc') },
  { id:'ltvcac',   label:t('attrData.tabLtvLabel'),    desc:t('attrData.tabLtvDesc') },
  { id:'anomaly',  label:t('attrData.tabAnomalyLabel'),       desc:t('attrData.tabAnomalyDesc') },
  { id:'compare',  label:t('attrData.tabCompareLabel'),      desc:t('attrData.tabCompareDesc') },
  { id:'guide',    label:t('attrData.tabGuideLabel'),   desc:t('attrData.tabGuideDesc') },
];

export default function Attribution() {
  
  const t = useT();
  const { lang } = useI18n();
  const [tab, setTab] = useState('mta');
  const [dataReady, setDataReady] = useState(_JOURNEYS.length > 0);
  const { orderStats, AdCampaigns, attributionData, addAlert, channelBudgets } = useGlobalData();
  const { formatCurrency } = useCurrency();
  useEffect(() => { setFmt(formatCurrency); }, [formatCurrency]);
  useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });

  /* ── Scroll isolation: suppress parent scrollbar, let Attribution own its scroll ── */
  useEffect(() => {
    const appContent = document.querySelector('.app-content-area');
    const parent = appContent?.parentElement;
    if (parent) {
      const prevOF = parent.style.overflowY;
      parent.style.overflowY = 'hidden';
      return () => { parent.style.overflowY = prevOF; };
    }
  }, []);

  /* ── Real-time data sync via GlobalDataContext ── */
  useEffect(() => {
    let changed = false;
    if (attributionData && attributionData.length > 0) {
      _JOURNEYS = attributionData.filter(d => d && d.path);
      changed = true;
    }
    if (AdCampaigns && AdCampaigns.length > 0) {
      const spends = {};
      AdCampaigns.forEach(c => {
        if (c.channel && c.weeklySpend) {
          spends[c.channel] = c.weeklySpend;
        }
      });
      if (Object.keys(spends).length > 0) {
        TS_DATA = { spends, revenue: AdCampaigns[0]?.weeklyRevenue || [] };
        changed = true;
      }
    }
    /* ── Demo ONLY fallback: upgrade with channelBudgets-based data ── */
    /* 🛡️ GUARD: This block ONLY executes in demo environment */
    if (_IS_DEMO_ENV && !_DEMO_INITIALIZED && channelBudgets && Object.keys(channelBudgets).length > 0) {
      _JOURNEYS = buildDemoJourneys(channelBudgets);
      TS_DATA = buildDemoTimeSeries(channelBudgets);
      _DEMO_INITIALIZED = true;
      changed = true;
    }
    if (changed || !dataReady) setDataReady(true);
  }, [AdCampaigns, attributionData, channelBudgets]);

  const isRTL = lang === 'ar';

  const TAB_COLORS = {
    mta: '#4f8ef7', shapley: '#22c55e', mmm: '#a855f7', markov: '#06b6d4',
    bayesian: '#f59e0b', cohort: '#f97316', ltvcac: '#ef4444', anomaly: '#dc2626',
    compare: '#6366f1', guide: '#8b5cf6',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', color: 'var(--text-1, #1e293b)', direction: isRTL ? 'rtl' : 'ltr', height: 'calc(100vh - 54px)', overflow: 'hidden', background: 'var(--bg, #f5f7fa)' }}>
      {/* ═══ STICKY SUB-TAB MENU (never scrolls away) ═══ */}
      <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg, #f5f7fa)' }}>
        <div style={{ padding: '8px 16px', background: 'var(--bg, #f5f7fa)', borderBottom: '2px solid var(--border, #e2e8f0)' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '6px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {getTabs(t).map(tb => {
              const isActive = tab === tb.id;
              const clr = TAB_COLORS[tb.id] || '#6366f1';
              return (
                <button key={tb.id} onClick={() => setTab(tb.id)}
                  style={{
                    padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 11, flex: 1, minWidth: 90,
                    transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
                    background: isActive ? clr : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-2, #475569)',
                    boxShadow: isActive ? `0 3px 16px ${clr}45` : 'none',
                    transform: isActive ? 'translateY(-1px)' : 'none' }}>
                  <div>{tb.label}</div>
                  <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{tb.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ SCROLLABLE CONTENT (scrolls beneath sub-tab boundary) ═══ */}
      <div className="fade-up" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 0 }}>
        {/* Hero */}
        <div className="hero" style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border, #e2e8f0)', background: 'var(--surface, #ffffff)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="hero-title" style={{ fontSize: 20, fontWeight: 900, color: TAB_COLORS[tab], letterSpacing: '-0.3px' }}>📈 {t('attrData.title', '어트리뷰션')}</div>
              <div className="hero-desc" style={{ fontSize: 11, color: 'var(--text-3, #64748b)', marginTop: 2 }}>{t('attrData.subtitle')}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-blue">{t('attrData.badgeShapley')}</span>
                <span className="badge badge-purple">{t('attrData.badgeMmm')}</span>
                <span className="badge badge-teal">{t('attrData.badgeUplift')}</span>
                <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>{t('attrData.northbeam')}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3, #64748b)' }}>{t('attrData.analysisJourney')}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#22c55e' }}>{_JOURNEYS.length.toLocaleString()}{t('attrData.cases', '건')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3, #64748b)' }}>{t('attrData.timeSeries')}</div>
            </div>
          </div>
        </div>

        <AIRecommendBanner context="attribution" />

        {attributionData && attributionData.length > 0 && (
          <div style={{ padding: '10px 16px', margin: '0 14px 0', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#22c55e' }}>📈 {t('attrData.hubRun', 'AI Marketing 허브 Run 결과')} {attributionData.length}{t('attrData.autoRefl', '건 Attribution에 Auto 반영됨')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{t('attrData.dataIncluded', 'Journey Run · AI Recommend 집행 데이터가 모델 기여도에 포함됩니다')}</div>
            </div>
            <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>{t('attrData.realtimeSync', '실시간 Sync ✓')}</span>
          </div>
        )}

        {/* Tab content */}
        <div style={{ padding: '16px 14px 28px' }}>
          {tab === 'mta'      && <AttributionTab />}
          {tab === 'shapley'  && <ShapleyTab />}
          {tab === 'mmm'      && <MMMTab />}
          {tab === 'markov'   && <MarkovTab />}
          {tab === 'bayesian' && <BayesianABTab />}
          {tab === 'cohort'   && <CohortTab />}
          {tab === 'ltvcac'   && <LtvCacTab />}
          {tab === 'anomaly'  && <AnomalyTab />}
          {tab === 'compare'  && <ModelCompareTab />}
          {tab === 'guide'    && <GuideTab />}
        </div>
      </div>
    </div>
  );
}

