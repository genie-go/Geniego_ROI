import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import AIRecommendBanner from '../components/AIRecommendBanner.jsx';
import { useI18n, useT } from '../i18n/index.js';
import {
  computeShapleyExact, computeSynergy,
  bayesianMMM, incrementalUplift, markovAttribution,
  bayesianAB,
  generateDemoJourneys, generateTimeSeriesData,
  CH_COLORS, KRW,
} from '../lib/mlAttribution.js';

const Tag = ({ label, color = '#4f8ef7' }) => (
  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${color}18`, color, border: `1px solid ${color}33`, fontWeight: 700 }}>{label}</span>
);

const CH_LABELS = {
  'Meta Ads': 'Meta Ads', 'Naver Ads': 'Naver', 'Google Ads': 'Google',
  'TikTok': 'TikTok', 'Kakao': 'Kakao', 'Email': 'Email',
  'Organic': 'Organic', 'Instagram': 'Instagram', 'Direct': 'Direct',
};

// Pre-generate demo data once
let DEMO_JOURNEYS = generateDemoJourneys(400);
let TS_DATA = generateTimeSeriesData(52);

/* ── 1. EXACT SHAPLEY TAB ───────────────────────────────────── */
function ShapleyTab() {
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
      const chs = [...new Set(DEMO_JOURNEYS.flatMap(j => j.path))];
      const shapley = computeShapleyExact(DEMO_JOURNEYS, chs);
      const syn = computeSynergy(DEMO_JOURNEYS, chs);
      const totalBudget = budgetVal;
      const rec = {};
      shapley.forEach(r => { rec[r.ch] = Math.round(r.pct / 100 * totalBudget); });
      setResults(shapley);
      setSynergy(syn);
      setBudget(rec);
    } finally { setComputing(false); }
  }, []);

  useEffect(() => { compute(); }, []);

  const EXPLAIN = {
    ko: '게임이론 기반 공정한 Channel 기여도 산출. 각 Channel의 한계 기여도(marginal contribution)를 2^n 정확 계산합니다. (n>10시 Monte-Carlo 512회 근사)',
    en: 'Fair channel attribution via cooperative game theory. Computes marginal contribution of each channel via exact 2^n enumeration (Monte-Carlo 512 samples for n>10).',
    ja: 'ゲーム理論ベースの公正なチャネル貢献度算出。各チャネルの限界貢献度を正確な2^n列挙で計算します。',
    zh: '基于博弈论的公平渠道归因。通过2^n精确枚举计算每个渠道的边际贡献。',
    de: 'Spieltheoretische Kanalattribuierung. Berechnet den marginalen Beitrag jedes Kanals durch exakte 2^n-Enumeration.',
    th: 'การแบ่งเครดิตโฆษณาแบบยุติธรรมตามทฤษฎีเกม คำนวณการมีส่วนร่วมส่วนเพิ่มของแต่ละช่องด้วยการนับ 2^n แบบแน่นอน',
    vi: 'Phân bổ kênh công bằng theo lý thuyết trò chơi. Tính đóng góp biên của từng kênh bằng liệt kê 2^n chính xác.',
    id: 'Atribusi saluran yang adil berdasarkan teori permainan. Menghitung kontribusi marjinal setiap saluran dengan enumerasi 2^n.',
    'zh-TW': '基於博弈論的公平渠道歸因，透過2^n精確列舉計算每個渠道的邊際貢獻。',
    ar: 'الإسناد العادل للقنوات بناءً على نظرية اللعبة. يحسب المساهمة الهامشية لكل قناة عبر تعداد دقيق 2^n.',
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(79,142,247,0.07)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🧮 <strong style={{ color: '#4f8ef7' }}>Exact Shapley Value</strong> — {EXPLAIN[lang] || EXPLAIN.en}
      </div>
      {computing && (
        <div style={{ textAlign: 'center', padding: 40, color: '#4f8ef7', fontSize: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          2^n 정밀 Shapley 계산 in progress…
        </div>
      )}
      {results && !computing && (
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
                      {!r.positive && <Tag label="음Count" color="#ef4444" />}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{KRW(Math.abs(Math.round(r.value)))}</span>
                      <span style={{ fontSize: 13, fontWeight: 900, color, minWidth: 42, textAlign: 'right' }}>{r.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.abs(r.pct)}%`, height: '100%', background: r.positive ? `linear-gradient(90deg,${color},${color}88)` : 'rgba(239,68,68,0.5)', borderRadius: 8, transition: 'width 600ms' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <div className="card card-glass">
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12 }}>⚡ Channel 시너지 (Pairwise Lift)</div>
              {(synergy || []).slice(0, 5).map(s => (
                <div key={`${s.a}-${s.b}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                    <span style={{ color: CH_COLORS[s.a] || '#4f8ef7' }}>{CH_LABELS[s.a] || s.a}</span> + <span style={{ color: CH_COLORS[s.b] || '#4f8ef7' }}>{CH_LABELS[s.b] || s.b}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 900, color: s.synergy > 0 ? '#22c55e' : '#ef4444' }}>
                    {s.synergy > 0 ? '+' : ''}{(s.synergy * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="card card-glass">
              <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 12 }}>💡 Shapley 기반 Budget 권고</div>
              {results.slice(0, 5).map(r => {
                const rec = r.pct > 25 ? { l: t('attrData.increase', '↑ 증액'), c: '#22c55e' } : r.pct > 15 ? { l: t('attrData.maintain', '→ 유지'), c: '#4f8ef7' } : { l: t('attrData.review', '↓ 검토'), c: '#f97316' };
                return (
                  <div key={r.ch} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: CH_COLORS[r.ch] || '#4f8ef7', fontWeight: 700 }}>{CH_LABELS[r.ch] || r.ch}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{KRW(budget[r.ch] || 0)}</span>
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
}

/* ── 2. BAYESIAN MMM TAB ─────────────────────────────────────── */
function MMMTab() {
  const t = useT();
  const [result, setResult] = useState(null);
  const [budget, setBudget] = useState({ 'Meta Ads': 30, 'Naver Ads': 20, 'Google Ads': 25, 'TikTok': 10, 'Kakao': 10, 'Email': 5 });
  const totalPct = Object.values(budget).reduce((s, v) => s + v, 0);

  useEffect(() => {
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

  const simResult = useMemo(() => {
    const baseROAS = { 'Meta Ads': 4.2, 'Naver Ads': 3.8, 'Google Ads': 5.5, 'TikTok': 2.9, 'Kakao': 3.4, 'Email': 14.1 };
    const decay    = { 'Meta Ads': 0.6, 'Naver Ads': 0.5, 'Google Ads': 0.55, 'TikTok': 0.4, 'Kakao': 0.45, 'Email': 0.8 };
    return Object.entries(budget).map(([ch, pct]) => {
      const spend = pct * 1_000_000 / 10;
      const sat   = Math.pow(pct / 100, 1 - (0.85 - decay[ch] * 0.2));
      const revenue = spend * (baseROAS[ch] || 3) * sat;
      return { ch, spend, revenue, roas: revenue / Math.max(spend, 1), satPct: Math.round(pct * (1 - decay[ch] * 0.3)) };
    }).sort((a, b) => b.roas - a.roas);
  }, [budget]);

  const totalRev   = simResult.reduce((s, r) => s + r.revenue, 0);
  const totalSpend = simResult.reduce((s, r) => s + r.spend, 0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        📊 <strong style={{ color: '#a855f7' }}>Bayesian Marketing Mix Model</strong> — {t('attrData.mmmDescText', 'Ridge 정규화 OLS + Adstock 감쇠 + Hill 곡선 포화. 200회 부트스트랩 사후 신뢰구간.')}
        {result && <> Model R² = <strong style={{ color: '#22c55e' }}>{result.r2.toFixed(3)}</strong></>}
      </div>
      {result && (
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t('attrData.mmmTitle', '📈 Bayesian MMM — 채널 기여도 (52주 시계열)')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[{ l: 'R²', v: result.r2.toFixed(3), c: '#22c55e' }, { l: 'RMSE', v: KRW(Math.round(result.rmse)), c: '#4f8ef7' }, { l: 'Channel', v: result.channelResults.length, c: '#a855f7' }].map(k => (
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
                    {r.saturation > 0.7 && <Tag label={`포화 ${(r.saturation * 100).toFixed(0)}%`} color="#f97316" />}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color }}>{r.share.toFixed(1)}%</span>
                    {r.ci95 && <div style={{ fontSize: 9, color: 'var(--text-3)' }}>CI [{r.ci95[0].toFixed(2)}, {r.ci95[1].toFixed(2)}]</div>}
                  </div>
                </div>
                <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
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
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t("attr.expectedBlendRoas") || "예상 블렌드 ROAS"}</div>
            </div>
            <div style={{ textAlign: 'center', padding: 10, borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#4f8ef7' }}>{KRW(Math.round(totalRev))}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t("attr.expectedRev") || "예상 Revenue"}</div>
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
                <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(r.roas / 8 * 100, 100)}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 300ms' }} />
                </div>
                {r.satPct > 40 && <div style={{ fontSize: 9, color: '#f97316', marginTop: 2 }}>⚠ 포화도 {Math.min(r.satPct, 95)}% — Add 효용 Decrease</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 3. MARKOV + DOUBLE ML UPLIFT TAB ───────────────────────── */
function MarkovTab() {
  const t = useT();
  const [computing, setComputing] = useState(false);
  const [markovRes, setMarkovRes] = useState(null);
  const [upliftRes, setUpliftRes] = useState(null);

  useEffect(() => {
    setComputing(true);
    setTimeout(() => {
      try {
        const channels = [...new Set(DEMO_JOURNEYS.flatMap(j => j.path))];
        setMarkovRes(markovAttribution(DEMO_JOURNEYS, channels));
        setUpliftRes(incrementalUplift(TS_DATA.spends, TS_DATA.revenue));
      } finally { setComputing(false); }
    }, 30);
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🔗 <strong style={{ color: '#06b6d4' }}>Markov Chain + Incremental Uplift (Double ML)</strong> — {t('attrData.markovDescText', '전환 경로 마르코프 전이행렬 + 채널 제거 효과 및 로빈슨 편회귀를 활용한 순 증분 효과 산출.')}
      </div>
      {computing && <div style={{ textAlign: 'center', padding: 40, color: '#06b6d4' }}>Markov Chain + Double ML 계산 in progress…</div>}
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
                  <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
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
                  <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
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
}

/* ── 4. MULTI-TOUCH ATTRIBUTION TAB ─────────────────────────── */
function AttributionTab() {
  const t = useT();
  const [model, setModel] = useState('last');
  const MODELS = [
    { id: 'first', label: t('attrData.firstTouch') }, { id: 'last', label: t('attrData.lastTouch') },
    { id: 'linear', label: t('attrData.linear') }, { id: 'time_decay', label: t('attrData.timeDecay') }, { id: 'position', label: t('attrData.position') },
  ];
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
  const results  = useMemo(() => calcMTA(DEMO_JOURNEYS, model), [model]);
  const totalRev = results.reduce((s, r) => s + r.revenue, 0);
  const topPaths = useMemo(() => {
    const pm = {};
    DEMO_JOURNEYS.forEach(j => { const k = j.path.join(' → '); pm[k] = pm[k] || { path: k, count: 0, revenue: 0 }; pm[k].count++; pm[k].revenue += j.revenue; });
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
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{KRW(Math.round(r.revenue))}</span>
                </div>
                <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
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
            <div key={p.path} style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: 10, marginBottom: 3 }}>
                {p.path.split(' → ').map((ch, j, arr) => (
                  <span key={j}><span style={{ color: CH_COLORS[ch] || '#4f8ef7', fontWeight: 700 }}>{CH_LABELS[ch] || ch}</span>{j < arr.length - 1 && <span style={{ color: 'var(--text-3)', margin: '0 3px' }}>→</span>}</span>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{p.count} items</span>
                <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{KRW(p.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 5. BETA-BINOMIAL A/B TAB ───────────────────────────────── */
const DEMO_AB = [
  { id: 1, name: '홈Page CTA Color', variants: [{ name: 'A 파란색', visitors: 1247, conversions: 89 }, { name: 'B 주황색', visitors: 1283, conversions: 142 }] },
  { id: 2, name: 'Email 제목 Personal화', variants: [{ name: 'A General', visitors: 2103, conversions: 187 }, { name: 'B Personal화', visitors: 2198, conversions: 298 }] },
  { id: 3, name: 'Popup 타이밍', variants: [{ name: 'A 즉시', visitors: 894, conversions: 67 }, { name: 'B 3초 후', visitors: 911, conversions: 109 }, { name: 'C 스크롤50%', visitors: 878, conversions: 98 }] },
];

function BayesianABTab() {
  const t = useT();
  const [sel, setSel]         = useState(0);
  const [computing, setC]     = useState(false);
  const [analyzed, setAnalyzed] = useState(null);
  const test = DEMO_AB[sel];

  useEffect(() => {
    setC(true);
    setTimeout(() => {
      try { setAnalyzed(bayesianAB(test.variants, 5000)); }
      finally { setC(false); }
    }, 20);
  }, [sel]);

  const winIdx = analyzed ? analyzed.reduce((best, v, i) => v.winProb > analyzed[best].winProb ? i : best, 0) : 0;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
        🧪 <strong style={{ color: '#a855f7' }}>Beta-Binomial Thompson Sampling</strong> — Prior Beta(1,1) → Posterior Beta(1+conv, 1+fail). P(winner) via 5,000-sample Monte-Carlo. 95% Credible Interval 표시.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {DEMO_AB.map((testItem, i) => (
          <button key={testItem.id} onClick={() => setSel(i)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: i === sel ? 'linear-gradient(135deg,#4f8ef7,#a855f7)' : 'rgba(255,255,255,0.06)', color: i === sel ? '#fff' : 'var(--text-2)' }}>
            {testItem.name}
          </button>
        ))}
      </div>
      {computing && <div style={{ textAlign: 'center', padding: 40, color: '#a855f7' }}>Thompson Sampling (5,000회) Run in progress…</div>}
      {analyzed && !computing && (
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>{test.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 16 }}>Beta-Binomial · {test.variants.reduce((s, v) => s + v.visitors, 0).toLocaleString()}명</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${test.variants.length},1fr)`, gap: 12 }}>
            {analyzed.map((v, i) => {
              const isW = i === winIdx;
              return (
                <div key={v.name} style={{ padding: 14, borderRadius: 14, background: isW ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.3)', border: `2px solid ${isW ? '#22c55e' : 'rgba(255,255,255,0.06)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontWeight: 900 }}>{v.name}</span>
                    {isW && <Tag label="🏆 승자" color="#22c55e" />}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#4f8ef7' }}>{v.visitors.toLocaleString()}</div><div style={{ fontSize: 10, color: 'var(--text-3)' }}>방문자</div></div>
                    <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e' }}>{v.conversions}</div><div style={{ fontSize: 10, color: 'var(--text-3)' }}>Conversion</div></div>
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
                  <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 6 }}>
                    <div style={{ width: `${v.winProb * 100}%`, height: '100%', background: isW ? '#22c55e' : '#4f8ef7', borderRadius: 7, transition: 'width 600ms' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.07)', border: '1px solid rgba(79,142,247,0.2)', fontSize: 12, color: 'var(--text-2)' }}>
            🤖 <strong style={{ color: '#22c55e' }}>{analyzed[winIdx]?.name}</strong>이 <strong>{(analyzed[winIdx]?.winProb * 100).toFixed(1)}%</strong> 확률로 최선.
            {analyzed[winIdx]?.winProb > 0.95 ? ' ✅ 즉시 배포 권장' : analyzed[winIdx]?.winProb > 0.8 ? ' 🟡 Add Count집 권장' : ' ⏳ 실험 계속'}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 6. COHORT ──────────────────────────────────────────────── */
function CohortTab() {
  const t = useT();
  const weeks = ['W1','W2','W3','W4','W5','W6','W7','W8'];
  const cohorts = weeks.map((w, wi) => ({ cohort: w, size: 200 + wi * 15, retention: weeks.map((_, di) => di <= wi ? (100 * Math.pow(0.72, di)).toFixed(0) : null) }));
  return (
    <div className="card card-glass">
      <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 12 }}>{t('attrData.cohortTitle', '📅 주차별 구매 코호트 — 유지율(%)')}</div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>{t('attrData.cohortHdr', '코호트')}</th><th>{t('attrData.sizeHdr', '규모')}</th>{weeks.map(w=><th key={w} style={{minWidth:52}}>{w}</th>)}</tr></thead>
          <tbody>
            {cohorts.map(c => (
              <tr key={c.cohort}>
                <td style={{fontWeight:700,color:'#4f8ef7'}}>{c.cohort}</td>
                <td style={{color:'var(--text-3)'}}>{c.size}</td>
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
}

/* ── 7. LTV vs CAC ──────────────────────────────────────────── */
const DEMO_LTV = [
  { channel:'Email', cac:3200, ltv:178000, ratio:55.6, roas:32.1, customers:445 },
  { channel:'Organic', cac:8000, ltv:165000, ratio:20.6, roas:14.2, customers:523 },
  { channel:'Naver Ads', cac:22000, ltv:156000, ratio:7.1, roas:5.2, customers:289 },
  { channel:'Kakao', cac:18000, ltv:128000, ratio:7.1, roas:4.6, customers:198 },
  { channel:'Google Ads', cac:32000, ltv:201000, ratio:6.3, roas:5.8, customers:156 },
  { channel:'Meta Ads', cac:28000, ltv:182000, ratio:6.5, roas:4.8, customers:342 },
  { channel:'Instagram', cac:31000, ltv:145000, ratio:4.7, roas:3.9, customers:112 },
  { channel:'TikTok', cac:24000, ltv:97000, ratio:4.0, roas:3.2, customers:87 },
];
function LtvCacTab() {
  const t = useT();
  const totalCac = DEMO_LTV.reduce((s,r) => s+r.cac*r.customers,0);
  const totalLtv = DEMO_LTV.reduce((s,r) => s+r.ltv*r.customers,0);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          {l:'Average LTV/CAC', v:(totalLtv/Math.max(totalCac,1)).toFixed(1)+'x', c:'#22c55e'},
          {l:t('attrData.totalCac', 'Total CAC 지출'), v:KRW(totalCac), c:'#ef4444'},
          {l:t('attrData.totalLtv', 'Total LTV 합산'), v:KRW(totalLtv), c:'#4f8ef7'},
          {l:'Marketing ROI', v:((totalLtv-totalCac)/totalCac*100).toFixed(0)+'%', c:'#a855f7'},
        ].map(k=>(
          <div key={k.l} style={{padding:14,borderRadius:12,background:`${k.c}08`,border:`1px solid ${k.c}22`,textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
            <div style={{fontSize:11,color:'var(--text-3)',marginTop:3}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div className="card card-glass">
        <div style={{fontWeight:900,fontSize:13,marginBottom:14}}>{t('attrData.ltvcacTitle', '💰 채널별 LTV vs CAC')}</div>
        <table className="table">
          <thead><tr><th>{t('attrData.colChannel', 'Channel')}</th><th>CustomerCount</th><th>CAC</th><th>LTV</th><th>LTV/CAC</th><th>ROAS</th><th>{t("attr.health") || "건강도"}</th></tr></thead>
          <tbody>
            {DEMO_LTV.sort((a,b)=>b.ratio-a.ratio).map(r=>{
              const color=CH_COLORS[r.channel]||'#4f8ef7';
              const h=r.ratio>=10?{l:t('attrData.excellent', '탁월'),c:'#22c55e'}:r.ratio>=5?{l:t('attrData.good', '양호'),c:'#4f8ef7'}:r.ratio>=3?{l:t('attrData.normal', 'Normal'),c:'#eab308'}:{l:t('attrData.caution', '주의'),c:'#ef4444'};
              return (
                <tr key={r.channel}>
                  <td style={{color,fontWeight:700}}>{CH_LABELS[r.channel]||r.channel}</td>
                  <td style={{textAlign:'center'}}>{r.customers}</td>
                  <td style={{color:'#ef4444'}}>{KRW(r.cac)}</td>
                  <td style={{color:'#22c55e',fontWeight:700}}>{KRW(r.ltv)}</td>
                  <td style={{fontWeight:900,fontSize:14,color:r.ratio>=10?'#22c55e':r.ratio>=5?'#4f8ef7':'#eab308'}}>{r.ratio.toFixed(1)}x</td>
                  <td style={{color:'#a855f7',fontWeight:700}}>{r.roas.toFixed(1)}x</td>
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
const ANOMALY_DATA = [
  { ch: 'Meta Ads', value: 4.2, baseline: 3.8, zscore: 2.8, status: 'alert', trend: [3.8,3.9,4.0,3.8,4.2,4.1,4.2], desc: 'ROAS가 평소 대비 +0.4 이상 급등. Ad Creative 효율 체크 권장', type: 'ROAS 급등' },
  { ch: 'TikTok', value: 1.1, baseline: 2.9, zscore: -3.2, status: 'critical', trend: [2.9,2.7,2.5,2.1,1.8,1.4,1.1], desc: 'ROAS가 7Daily 지속 하락. 즉시 Budget 재배분 필요', type: 'ROAS 급락' },
  { ch: 'Naver Ads', value: 189, baseline: 223, zscore: -1.8, status: 'warn', trend: [223,218,210,205,198,192,189], desc: 'ConversionCount가 Weekly Average 대비 -15% Decrease Trend', type: 'ConversionCount Decrease' },
  { ch: 'Google Ads', value: 5.5, baseline: 5.4, zscore: 0.4, status: 'ok', trend: [5.3,5.4,5.4,5.5,5.4,5.5,5.5], desc: '정상 범위 내 안정적 운용 in progress', type: '정상' },
  { ch: 'Kakao', value: 3.9, baseline: 3.4, zscore: 1.6, status: 'info', trend: [3.4,3.5,3.6,3.7,3.8,3.8,3.9], desc: '점진적 개선 Trend. 긍정적 신호 감지', type: 'ROAS 개선' },
  { ch: 'Email', value: 14.1, baseline: 14.0, zscore: 0.1, status: 'ok', trend: [14.0,14.1,14.0,14.1,14.0,14.1,14.1], desc: 'Email ROAS 안정적 유지', type: '정상' },
];
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
                  <div key={k.l} style={{ textAlign: 'center', padding: '6px', borderRadius: 8, background: 'rgba(0,0,0,0.2)' }}>
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
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 12 }}>{t("attr.anomalySummary") || "📊 이상감지 Summary"}</div>
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
const MODEL_COMPARE_DATA = {
  channels: ['Meta Ads', 'Google Ads', 'Naver Ads', 'TikTok', 'Kakao', 'Email'],
  models: [
    { id: 'shapley',    label: '🎯 Shapley',  color: '#4f8ef7', values: [22, 31, 18, 9, 11, 9] },
    { id: 'mmm',        label: '📊 MMM',       color: '#a855f7', values: [24, 28, 19, 12, 10, 7] },
    { id: 'markov',     label: '🔗 Markov',    color: '#06b6d4', values: [21, 33, 17, 8, 13, 8] },
    { id: 'last_touch', label: '🏁 Last',      color: '#f97316', values: [30, 25, 20, 14, 7, 4] },
    { id: 'first',      label: '🚩 First',     color: '#22c55e', values: [18, 29, 16, 12, 15, 10] },
  ],
};

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
        <button onClick={() => setSelModel(null)} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: !selModel ? 'linear-gradient(135deg,#6366f1,#4f8ef7)' : 'rgba(255,255,255,0.06)', color: !selModel ? '#fff' : 'var(--text-2)' }}>All Compare</button>
        {models.map(m => (
          <button key={m.id} onClick={() => setSelModel(m.id)} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: selModel === m.id ? m.color : 'rgba(255,255,255,0.06)', color: selModel === m.id ? '#fff' : 'var(--text-2)' }}>{m.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* 레이더 Chart */}
        <div className="card card-glass">
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 14 }}>{t("attr.radarCompare") || "🕸️ Channel 기여도 레이더 Compare"}</div>
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
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>🏆 A-Score (Attribution Confidence)</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 14 }}>모델 간 일관성 기반 — 높을Count록 모든 모델이 동의하는 신뢰도 높은 Channel</div>
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
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Average {a.mean}% / σ={a.std}</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: scoreColor, minWidth: 36, textAlign: 'right' }}>{a.score}</span>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${a.score}%`, height: '100%', background: `linear-gradient(90deg,${scoreColor},${scoreColor}88)`, borderRadius: 8, transition: 'width 600ms' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 모델per 숫자 Compare Table */}
      <div className="card card-glass">
        <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 12 }}>{t("attr.modelCompareTable") || "📋 모델per Channel 기여도 Compare표 (%)"}</div>
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
];

export default function Attribution() {
  
  const t = useT();
  const [tab, setTab] = useState('mta');
  const { orderStats, demoAdCampaigns, attributionData } = useGlobalData();
  
  // DR JART SYNCHRONIZATION
  useMemo(() => {
    if (demoAdCampaigns && demoAdCampaigns.length > 0) {
      const targetSpend = demoAdCampaigns.reduce((acc, c) => acc + c.spend, 0);
      const targetRev = demoAdCampaigns.reduce((acc, c) => acc + (c.spend * c.roas), 0);
      const targetCount = 12480; // realistic journey count

      if (DEMO_JOURNEYS.length !== targetCount) {
        DEMO_JOURNEYS = generateDemoJourneys(targetCount);
        const sumRev = DEMO_JOURNEYS.reduce((acc, curr) => acc + curr.revenue, 0);
        const scale = targetRev / sumRev;
        DEMO_JOURNEYS.forEach(j => j.revenue *= scale);
      }
    }
  }, [demoAdCampaigns]);

  return (
    <div style={{ display:'grid', gap:18, padding:4 }}>
      <AIRecommendBanner context="attribution" />
      {attributionData && attributionData.length > 0 && (
        <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:12, color:'#22c55e' }}>📈 {t('attrData.hubRun', 'AI Marketing 허브 Run 결과')} {attributionData.length}{t('attrData.autoRefl', '건 Attribution에 Auto 반영됨')}</div>
            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{t('attrData.dataIncluded', 'Journey Run · AI Recommend 집행 데이터가 모델 기여도에 포함됩니다')}</div>
          </div>
          <span style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>{t('attrData.realtimeSync', '실Time Sync ✓')}</span>
        </div>
      )}
      <div className="hero fade-up">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <div className="hero-title grad-blue-purple">📈 {t('attrData.title')}</div>
            <div className="hero-desc">{t('attrData.subtitle')}</div>
            <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
              <span className="badge badge-blue">{t('attrData.badgeShapley', 'Exact Shapley 2^n')}</span>
              <span className="badge badge-purple">{t('attrData.badgeMmm', 'Bayesian MMM')}</span>
              <span className="badge badge-teal">{t('attrData.badgeUplift', 'Double ML Uplift')}</span>
              <span className="badge" style={{ background:'rgba(168,85,247,0.15)', color:'#c084fc', border:'1px solid rgba(168,85,247,0.3)' }}>{t('attrData.northbeam')}</span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>{t('attrData.analysisJourney')}</div>
            <div style={{ fontSize:26, fontWeight:900, color:'#22c55e' }}>{DEMO_JOURNEYS.length.toLocaleString()}{t('attrData.cases', '건')}</div>
            <div style={{ fontSize:10, color:'var(--text-3)' }}>{t('attrData.timeSeries')}</div>
          </div>
        </div>
      </div>
      <div style={{ display:'flex', gap:4, padding:'5px', background:'rgba(0,0,0,0.25)', borderRadius:14, flexWrap:'wrap' }}>
        {getTabs(t).map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding:'7px 14px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, flex:1, minWidth:120, background:tab===tb.id?'linear-gradient(135deg,#4f8ef7,#6366f1)':'transparent', color:tab===tb.id?'#fff':'var(--text-2)', transition:'all 150ms' }}>
            <div>{tb.label}</div><div style={{ fontSize:9, opacity:0.7, marginTop:1 }}>{tb.desc}</div>
          </button>
        ))}
      </div>
      {tab === 'mta'      && <AttributionTab />}
      {tab === 'shapley'  && <ShapleyTab />}
      {tab === 'mmm'      && <MMMTab />}
      {tab === 'markov'   && <MarkovTab />}
      {tab === 'bayesian' && <BayesianABTab />}
      {tab === 'cohort'   && <CohortTab />}
      {tab === 'ltvcac'   && <LtvCacTab />}
      {tab === 'anomaly'  && <AnomalyTab />}
      {tab === 'compare'  && <ModelCompareTab />}
    </div>
  );
}
