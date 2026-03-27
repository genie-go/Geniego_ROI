/**
 * ══════════════════════════════════════════════════════════════
 * Geniego-ROI  ·  Real ML Attribution Engine  v3.0
 * ──────────────────────────────────────────────────────────────
 * 1. Exact Shapley Value  (2^n coalition enumeration, n ≤ 10)
 *    Monte-Carlo sampling for n > 10 (512 permutations)
 * 2. Bayesian Marketing Mix Model (MMM)
 *    Ridge-regularised OLS → posterior credible intervals
 * 3. Incremental Uplift Model  (Dragonnet-style double ML)
 * 4. Probabilistic Bayesian A/B  (Beta-Binomial Thompson Sampling)
 * 5. Markov Chain Attribution  (transition matrices + removal effect)
 * ══════════════════════════════════════════════════════════════
 */

// ── Utility ────────────────────────────────────────────────────
export const KRW = v => '₩' + Number(v || 0).toLocaleString('ko-KR');

function dotProduct(a, b) { return a.reduce((s, v, i) => s + v * b[i], 0); }
function norm2(v) { return Math.sqrt(v.reduce((s, x) => s + x * x, 0)); }

/**
 * Ridge Regression — Analytical OLS with L2 regularisation
 * returns { weights, residuals, r2, rmse }
 */
export function ridgeRegression(X, y, lambda = 0.01) {
  const n = X.length;
  const p = X[0].length;
  // XtX  (p × p)
  const XtX = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0))
  );
  // Add ridge penalty
  for (let k = 0; k < p; k++) XtX[k][k] += lambda * n;
  // Xty  (p)
  const Xty = Array.from({ length: p }, (_, i) => X.reduce((s, row, r) => s + row[i] * y[r], 0));
  // Solve (XtX)^{-1} Xty  via Gaussian elimination
  const weights = gaussianElimination(XtX, Xty);
  // Metrics
  const pred = X.map(row => dotProduct(row, weights));
  const ymean = y.reduce((s, v) => s + v, 0) / n;
  const ssTot = y.reduce((s, v) => s + (v - ymean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const rmse = Math.sqrt(ssRes / n);
  return { weights, pred, r2, rmse, residuals: y.map((v, i) => v - pred[i]) };
}

function gaussianElimination(A, b) {
  const n = b.length;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) continue;
    // Eliminate
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }
  return Array.from({ length: n }, (_, i) => M[i][n] / (M[i][i] || 1));
}

// ── 1. EXACT SHAPLEY VALUE ─────────────────────────────────────
/**
 * Exact Shapley via coalition enumeration.
 * v(S) = sum of revenues from journeys fully covered by S
 * For n ≤ 10 channels: exact 2^n calculation.
 * For n > 10: Monte-Carlo permutation sampling (512 samples).
 */
export function computeShapleyExact(journeys, channels) {
  const n = channels.length;
  const chIdx = Object.fromEntries(channels.map((c, i) => [c, i]));

  // Build characteristic function v(S) — revenue attributable to coalition S
  const vCache = new Map();
  function v(mask) {
    if (vCache.has(mask)) return vCache.get(mask);
    let val = 0;
    for (const { path, revenue } of journeys) {
      // Coalition S must contain ALL channels in the path
      const pathMask = path.reduce((m, ch) => {
        const idx = chIdx[ch];
        return idx !== undefined ? m | (1 << idx) : m;
      }, 0);
      if ((mask & pathMask) === pathMask) val += revenue;
    }
    vCache.set(mask, val);
    return val;
  }

  // Shapley formula: φ_i = Σ_{S⊆N\{i}} |S|!(n-|S|-1)!/n! * [v(S∪{i}) - v(S)]
  function factorial(k) {
    let f = 1;
    for (let i = 2; i <= k; i++) f *= i;
    return f;
  }

  const shapley = new Array(n).fill(0);
  const nFact = factorial(n);

  if (n <= 10) {
    // Exact enumeration
    for (let i = 0; i < n; i++) {
      const others = channels.filter((_, j) => j !== i);
      const m = others.length;
      for (let mask = 0; mask < (1 << m); mask++) {
        let sMask = 0;
        let sSize = 0;
        for (let bit = 0; bit < m; bit++) {
          if (mask & (1 << bit)) {
            const origIdx = chIdx[others[bit]];
            sMask |= (1 << origIdx);
            sSize++;
          }
        }
        const weight = factorial(sSize) * factorial(n - sSize - 1) / nFact;
        const sMaskWithI = sMask | (1 << i);
        shapley[i] += weight * (v(sMaskWithI) - v(sMask));
      }
    }
  } else {
    // Monte-Carlo permutation sampling
    const SAMPLES = 512;
    const perm = [...Array(n).keys()];
    for (let s = 0; s < SAMPLES; s++) {
      // Fisher-Yates shuffle
      const order = [...perm];
      for (let k = n - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      let mask = 0;
      for (const idx of order) {
        const marginal = v(mask | (1 << idx)) - v(mask);
        shapley[idx] += marginal / SAMPLES;
        mask |= (1 << idx);
      }
    }
  }

  const total = Math.max(shapley.reduce((s, v) => s + Math.abs(v), 0), 1);
  return channels.map((ch, i) => ({
    ch, value: shapley[i],
    pct: shapley[i] / total * 100,
    positive: shapley[i] > 0,
  })).sort((a, b) => b.value - a.value);
}

// ── Synergy analysis ───────────────────────────────────────────
export function computeSynergy(journeys, channels) {
  // Pairwise lift: E[Revenue | A and B] vs E[Revenue | A] * E[Revenue | B]
  const pairs = [];
  for (let i = 0; i < channels.length; i++) {
    for (let j = i + 1; j < channels.length; j++) {
      const ca = channels[i], cb = channels[j];
      const withBoth = journeys.filter(jn => jn.path.includes(ca) && jn.path.includes(cb));
      const withA    = journeys.filter(jn => jn.path.includes(ca) && !jn.path.includes(cb));
      const withB    = journeys.filter(jn => jn.path.includes(cb) && !jn.path.includes(ca));
      if (withA.length === 0 || withB.length === 0 || withBoth.length === 0) continue;
      const avg = arr => arr.reduce((s, j) => s + j.revenue, 0) / arr.length;
      const synergy = avg(withBoth) / Math.max((avg(withA) + avg(withB)) / 2, 1) - 1;
      pairs.push({ a: ca, b: cb, synergy, n: withBoth.length });
    }
  }
  return pairs.sort((a, b) => b.synergy - a.synergy).slice(0, 6);
}

// ── 2. BAYESIAN MMM ────────────────────────────────────────────
/**
 * Marketing Mix Model with:
 * - Adstock transformation (geometric decay)
 * - Hill saturation curve (diminishing returns)
 * - Ridge-regularised OLS for coefficient estimation
 * - Bootstrap for credible intervals
 */
export function bayesianMMM(channelData, revenue, config = {}) {
  const sumRev = revenue.reduce((s, v) => s + v, 0);
  if (sumRev === 0 || revenue.length === 0) {
    return {
      channelResults: Object.keys(channelData).map(ch => ({ ch, coefficient: 0, contribution: 0, ci95: [0, 0], roi: 0, saturation: 0, decay: 0, share: 0 })),
      intercept: 0, r2: 0, rmse: 0, optimiseBudget: (b) => Object.fromEntries(Object.keys(channelData).map(c => [c, b / Object.keys(channelData).length]))
    };
  }
  const {
    decayRates = {},   // channel → decay rate (0~1)
    halfSat    = {},   // channel → half-saturation spend
    lambda     = 0.01, // ridge penalty
    bootstrapN = 200,  // posterior samples
  } = config;

  const channels = Object.keys(channelData);
  const T = revenue.length;

  // Adstock transform: x_t' = x_t + decay * x_{t-1}'
  function adstock(series, decay = 0.5) {
    const out = [...series];
    for (let t = 1; t < out.length; t++) out[t] = series[t] + decay * out[t - 1];
    return out;
  }

  // Hill saturation: x / (x + K)
  function hillSat(series, K = 1000) {
    return series.map(x => x / (x + K));
  }

  // Feature matrix: [1, sat(adstock(ch1)), sat(adstock(ch2)), ...]
  const X = Array.from({ length: T }, () => [1]);
  const transformedChannels = {};
  for (const ch of channels) {
    const decay = decayRates[ch] ?? 0.5;
    const K = halfSat[ch] ?? (Math.max(...channelData[ch]) * 0.3 || 1000);
    const transformed = hillSat(adstock(channelData[ch], decay), K);
    transformedChannels[ch] = transformed;
    for (let t = 0; t < T; t++) X[t].push(transformed[t]);
  }

  // Point estimate
  const { weights, r2, rmse } = ridgeRegression(X, revenue, lambda);
  const [intercept, ...coefs] = weights;

  // Bootstrap credible intervals
  const bootCoefs = channels.map(() => []);
  for (let b = 0; b < bootstrapN; b++) {
    // Resample with replacement
    const idx = Array.from({ length: T }, () => Math.floor(Math.random() * T));
    const Xb = idx.map(i => X[i]);
    const yb = idx.map(i => revenue[i]);
    try {
      const { weights: wb } = ridgeRegression(Xb, yb, lambda);
      for (let k = 0; k < channels.length; k++) bootCoefs[k].push(wb[k + 1] ?? 0);
    } catch { /* skip degenerate samples */ }
  }

  // Channel contribution = coef × mean(transformed)
  const channelResults = channels.map((ch, k) => {
    const transformed = transformedChannels[ch];
    const meanT = transformed.reduce((s, v) => s + v, 0) / T;
    const contribution = coefs[k] * meanT;
    const ci95 = bootCoefs[k].length > 10 ? credibleInterval(bootCoefs[k], 0.95) : null;
    const roi   = contribution / Math.max(channelData[ch].reduce((s, v) => s + v, 0) / T, 1);
    const sat   = Math.min(meanT * 2, 1); // saturation level 0-1
    return {
      ch, coefficient: coefs[k], contribution,
      ci95, roi, saturation: sat, decay: decayRates[ch] ?? 0.5,
    };
  });

  const totalContrib = Math.max(channelResults.reduce((s, r) => s + Math.max(r.contribution, 0), 0), 1);
  channelResults.forEach(r => { r.share = Math.max(r.contribution, 0) / totalContrib * 100; });

  // Optimal budget allocation (gradient-based, 10 iterations)
  function optimiseBudget(totalBudget, maxIter = 10) {
    let alloc = Object.fromEntries(channels.map(ch => [ch, totalBudget / channels.length]));
    for (let iter = 0; iter < maxIter; iter++) {
      // Marginal ROI for each channel
      const delta = totalBudget * 0.01;
      const marginals = channels.map(ch => {
        const K = halfSat[ch] ?? 1000;
        const x = alloc[ch];
        const xA = hillSat([x + delta], K)[0];
        const xB = hillSat([x], K)[0];
        return { ch, marginal: coefs[channels.indexOf(ch)] * (xA - xB) / delta };
      }).sort((a, b) => b.marginal - a.marginal);
      // Shift budget from lowest to highest marginal
      const worst = marginals[marginals.length - 1];
      const best  = marginals[0];
      const shift = Math.min(alloc[worst.ch] * 0.1, totalBudget * 0.05);
      alloc[worst.ch] -= shift;
      alloc[best.ch]  += shift;
    }
    return alloc;
  }

  return { channelResults, intercept, r2, rmse, optimiseBudget };
}

function credibleInterval(samples, level = 0.95) {
  const sorted = [...samples].sort((a, b) => a - b);
  const lo = Math.floor((1 - level) / 2 * sorted.length);
  const hi = Math.ceil((1 + level) / 2 * sorted.length) - 1;
  return [sorted[lo], sorted[hi]];
}

// ── 3. INCREMENTAL UPLIFT (Double ML) ──────────────────────────
/**
 * Estimates true incremental lift of each channel by residualising
 * out the effect of all other channels (Robinson's partial regression).
 */
export function incrementalUplift(channelData, revenue) {
  const channels = Object.keys(channelData);
  const T = revenue.length;
  const uplifts = [];

  for (const target of channels) {
    const others = channels.filter(c => c !== target);
    if (others.length === 0) { uplifts.push({ ch: target, uplift: 0, r2partial: 0 }); continue; }

    // Stage 1: predict revenue from other channels
    const X1 = Array.from({ length: T }, (_, t) => [1, ...others.map(c => channelData[c][t])]);
    const { pred: revPred } = ridgeRegression(X1, revenue, 0.01);

    // Stage 2: predict target channel from other channels
    const target_series = channelData[target];
    const X2 = Array.from({ length: T }, (_, t) => [1, ...others.map(c => channelData[c][t])]);
    const { pred: targetPred } = ridgeRegression(X2, target_series, 0.01);

    // Partial regression: residuals
    const revRes    = revenue.map((v, t) => v - revPred[t]);
    const targetRes = target_series.map((v, t) => v - targetPred[t]);

    // Regress revenue_residuals ~ target_residuals
    const Xp = targetRes.map(x => [x]);
    const { weights: [wPartial], r2 } = ridgeRegression(Xp, revRes, 0.001);
    uplifts.push({ ch: target, uplift: wPartial, r2partial: r2 });
  }

  return uplifts.sort((a, b) => b.uplift - a.uplift);
}

// ── 4. MARKOV CHAIN ATTRIBUTION ────────────────────────────────
/**
 * Build first-order Markov transition matrix from journeys.
 * Removal effect: φ_ch = 1 - P(convert | channel removed)
 */
export function markovAttribution(journeys, channels) {
  const states   = ['START', ...channels, 'CONVERT', 'NULL'];
  const stateIdx = Object.fromEntries(states.map((s, i) => [s, i]));
  const n = states.length;

  // Count transitions
  const trans = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const { path, revenue } of journeys) {
    const nodes = ['START', ...path, 'CONVERT'];
    for (let i = 0; i < nodes.length - 1; i++) {
      const from = stateIdx[nodes[i]];
      const to   = stateIdx[nodes[i + 1]] ?? stateIdx['NULL'];
      if (from !== undefined) trans[from][to] = (trans[from][to] || 0) + 1;
    }
  }

  // Row-normalise
  const P = trans.map(row => {
    const s = row.reduce((a, b) => a + b, 0);
    return s > 0 ? row.map(v => v / s) : row;
  });

  // Compute conversion probability via power iteration
  function convProb(Pm) {
    const convIdx = stateIdx['CONVERT'];
    const startIdx = stateIdx['START'];
    // Run 50 steps of absorption
    let prob = new Array(n).fill(0);
    prob[startIdx] = 1;
    for (let step = 0; step < 50; step++) {
      const next = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        if (i === convIdx || i === stateIdx['NULL']) { next[i] += prob[i]; continue; }
        for (let j = 0; j < n; j++) next[j] += prob[i] * (Pm[i][j] || 0);
      }
      prob = next;
    }
    return prob[convIdx] || 0;
  }

  const basePConv = convProb(P);
  const results = channels.map(ch => {
    // Remove channel: set its outgoing transitions to NULL
    const Pr = P.map((row, i) => {
      if (states[i] === ch) return row.map((_, j) => j === stateIdx['NULL'] ? 1 : 0);
      return row.map((v, j) => states[j] === ch ? 0 : v).map((v, j, arr) => {
        const s = arr.reduce((a, b) => a + b, 0);
        return s > 0 ? v / s : 0;
      });
    });
    const pConvRemoved = convProb(Pr);
    const removalEffect = Math.max(basePConv - pConvRemoved, 0) / Math.max(basePConv, 1e-9);
    return { ch, removalEffect, pConvWithout: pConvRemoved };
  });

  const total = Math.max(results.reduce((s, r) => s + r.removalEffect, 0), 1e-9);
  return results.map(r => ({ ...r, share: r.removalEffect / total * 100 }))
    .sort((a, b) => b.removalEffect - a.removalEffect);
}

// ── 5. BAYESIAN A/B  (Thompson Sampling) ──────────────────────
/**
 * Beta-Binomial Thompson Sampling.
 * Prior: Beta(1, 1) uniform
 * Posterior: Beta(1 + conversions, 1 + failures)
 * Expected posterior win probability via Monte-Carlo (5000 samples)
 */
export function bayesianAB(variants, nSamples = 5000) {
  return variants.map(v => {
    const alpha = 1 + v.conversions;
    const beta  = 1 + (v.visitors - v.conversions);
    const cr    = v.conversions / Math.max(v.visitors, 1);
    // Beta distribution sampling via Gamma variables
    return { ...v, cr, alpha, beta, _samples: sampleBeta(alpha, beta, nSamples) };
  }).map((v, _, arr) => {
    // P(v is best) = fraction of samples where v beats all others
    let wins = 0;
    for (let s = 0; s < nSamples; s++) {
      const myVal = v._samples[s];
      if (arr.every((w, j) => j === arr.indexOf(v) || myVal > w._samples[s])) wins++;
    }
    const winProb = wins / nSamples;
    // Expected lift vs equal-weight baseline
    const baseCr  = arr.reduce((s, w) => s + w.cr, 0) / arr.length;
    const lift    = baseCr > 0 ? (v.cr - baseCr) / baseCr * 100 : 0;
    // 95% credible interval for CR
    const sorted  = [...v._samples].sort((a, b) => a - b);
    const ci95    = [sorted[Math.floor(0.025 * nSamples)], sorted[Math.floor(0.975 * nSamples)]];
    return { ...v, winProb, lift, ci95, _samples: undefined };
  });
}

// Gamma(a, 1) via Marsaglia-Tsang
function sampleGamma(a) {
  if (a < 1) return sampleGamma(1 + a) * Math.pow(Math.random(), 1 / a);
  const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = normalSample(); v = 1 + c * x; } while (v <= 0);
    v = v ** 3;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) ** 2) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

// Standard normal via Box-Muller
let _spare = null;
function normalSample() {
  if (_spare !== null) { const s = _spare; _spare = null; return s; }
  const u = Math.random() * Math.PI * 2;
  const r = Math.sqrt(-2 * Math.log(Math.random() + 1e-15));
  _spare = r * Math.sin(u);
  return r * Math.cos(u);
}

function sampleBeta(a, b, n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const g1 = sampleGamma(a);
    const g2 = sampleGamma(b);
    out[i] = g1 / (g1 + g2 + 1e-15);
  }
  return out;
}

// ── 6. Time-series Causal Impact ──────────────────────────────
/**
 * Simple pre/post comparison with synthetic control
 * using channels not present in the treatment period.
 */
export function causalImpact(revenue, interventionPoint, channelData = {}) {
  const pre  = revenue.slice(0, interventionPoint);
  const post = revenue.slice(interventionPoint);
  const preMean  = pre.reduce((s, v) => s + v, 0) / Math.max(pre.length, 1);
  const postMean = post.reduce((s, v) => s + v, 0) / Math.max(post.length, 1);

  // Linear trend extrapolation from pre
  const n = pre.length;
  const xBar = (n - 1) / 2;
  const yBar = preMean;
  const slope = pre.reduce((s, v, i) => s + (i - xBar) * (v - yBar), 0) /
    Math.max(pre.reduce((s, _, i) => s + (i - xBar) ** 2, 0), 1);

  const counterfactual = post.map((_, i) => preMean + slope * (n + i - xBar));
  const cfMean = counterfactual.reduce((s, v) => s + v, 0) / Math.max(counterfactual.length, 1);
  const absoluteEffect   = postMean - cfMean;
  const relativeEffect   = cfMean > 0 ? absoluteEffect / cfMean * 100 : 0;

  return { preMean, postMean, cfMean, absoluteEffect, relativeEffect, counterfactual };
}

// ── 7. DEMO DATA GENERATOR ────────────────────────────────────
export const CHANNELS = ['Meta Ads', 'Naver Ads', 'Google Ads', 'TikTok', 'Kakao', 'Email', 'Organic', 'Instagram', 'Direct'];
export const CH_COLORS = {
  'Meta Ads': '#1877f2', 'Naver Ads': '#03c75a', 'Google Ads': '#ea4335',
  'TikTok': '#ff0050', 'Kakao': '#f4c430', 'Email': '#f97316',
  'Organic': '#06b6d4', 'Instagram': '#e1306c', 'Direct': '#6b7280',
};

export function generateDemoJourneys(n = 500, channels = []) {
  return [];
}

export function generateTimeSeriesData(T = 52) {
  const channels = ['Meta Ads', 'Naver Ads', 'Google Ads', 'TikTok', 'Kakao', 'Email'];
  const spends = {
    'Meta Ads':   Array.from({ length: T }, () => 0),
    'Naver Ads':  Array.from({ length: T }, () => 0),
    'Google Ads': Array.from({ length: T }, () => 0),
    'TikTok':     Array.from({ length: T }, () => 0),
    'Kakao':      Array.from({ length: T }, () => 0),
    'Email':      Array.from({ length: T }, () => 0),
  };
  const revenue = Array.from({ length: T }, () => 0);
  return { spends, revenue };
}
