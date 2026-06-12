/**
 * 데모 롤업 동기화 파생 (204차) — rollupDemoDerive.js
 *
 * ★원칙: 데모의 모든 메뉴 값은 단일 가상 소스(GlobalDataContext 시드)에서 동기화·파생되어야 하며,
 *   메뉴마다 임의로 하드코딩한 독립 값이면 안 된다.
 *   따라서 롤업(SKU/캠페인/크리에이터/플랫폼/요약)을 백엔드 합성이 아니라
 *   orders·channelBudgets·snsCampaigns·creators 에서 집계 → 대시보드·마케팅·P&L·인플루언서 메뉴와 정합.
 *
 *   - SKU      ← orders 를 sku 로 집계(매출=Σtotal, 주문=Σqty, 광고비=ΣadFee → ROAS, 반품률=상태)
 *   - 플랫폼   ← channelBudgets(광고 채널: 지출/매출/ROAS/노출/클릭) — 마케팅·예산 메뉴와 정합
 *   - 캠페인   ← snsCampaigns(지출·ROAS·전환) — 캠페인 매니저와 정합
 *   - 크리에이터← creators(매출·전환·팔로워·수수료) — 인플루언서 대시보드와 정합
 *   - 요약     ← 위 집계의 합 — 전 메뉴 합계 reconcile
 *
 *   series(스파크라인용 일별 추이)는 집계 total 을 결정적(비랜덤)으로 분배해 합계가 정확히 일치한다.
 */

const _CH_NAME = { naver: '네이버', coupang: '쿠팡', oliveyoung: '올리브영', '11st': '11번가', gmarket: 'G마켓', kakao: '카카오', amazon_jp: 'Amazon JP', meta: 'Meta', google: 'Google', tiktok: 'TikTok' };

// n개 기간 라벨([현 차수] 로그인 시점 기준 — 고정 2026-03-05 제거, 실환경처럼 오늘 기준 추이)
function _dates(period, n) {
  const out = [];
  const _now = new Date();
  const base = new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate()));
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getTime());
    if (period === 'monthly') { d.setUTCMonth(d.getUTCMonth() - i); out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`); }
    else if (period === 'yearly') { out.push(String(base.getUTCFullYear() - i)); }
    else if (period === 'seasonal') { const tq = base.getUTCFullYear() * 4 + Math.floor(base.getUTCMonth() / 3) - i; out.push(`${Math.floor(tq / 4)}-Q${(tq % 4) + 1}`); }
    else if (period === 'weekly') { d.setUTCDate(d.getUTCDate() - i * 7); out.push(`${d.getUTCFullYear()}-W${String(_isoWeek(d)).padStart(2, '0')}`); }
    else { d.setUTCDate(d.getUTCDate() - i); out.push(d.toISOString().slice(0, 10)); }
  }
  return out;
}
function _isoWeek(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil((((t - ys) / 86400000) + 1) / 7);
}

// total 을 n개로 결정적 분배(합계=total). 비랜덤 → 재현 가능, 임의값 아님.
function _spread(total, n) {
  if (n <= 0) return [];
  const w = []; let sw = 0;
  for (let i = 0; i < n; i++) { const v = 1 + 0.32 * Math.sin(i * 0.9 + 0.4) + 0.16 * Math.cos(i * 0.5); w.push(v > 0.2 ? v : 0.2); sw += (v > 0.2 ? v : 0.2); }
  return w.map(v => (total * v) / sw);
}
function _round(x, p = 0) { const m = Math.pow(10, p); return Math.round((x + Number.EPSILON) * m) / m; }

const _RETURN_STATUS = new Set(['returned', 'cancelled', 'refunded', 'canceled']);
// [현 차수] 취소상태 캐논(GlobalDataContext 와 동일): 취소주문은 매출 집계에서 제외 → 롤업↔대시보드 일치.
const _CANCEL_STATUS = new Set(['CancelDone', 'Cancel요청', 'cancelled', 'canceled']);

// ── SKU: orders 집계 ────────────────────────────────────────────────────
function _skuRows(orders, dates) {
  const by = {};
  (orders || []).forEach(o => {
    const sku = o.sku; if (!sku) return;
    if (_CANCEL_STATUS.has(String(o.status || ''))) return; // 취소주문 매출 제외(대시보드 정합)
    if (!by[sku]) by[sku] = { name: o.name || sku, platform: _CH_NAME[o.ch] || o.ch || '', revenue: 0, orders: 0, spend: 0, returns: 0, units: 0, price: o.price || 0 };
    const r = by[sku];
    r.revenue += Number(o.total || 0);
    r.orders += Number(o.qty || 0);
    r.units += Number(o.qty || 0);
    r.spend += Number(o.adFee || 0);
    if (_RETURN_STATUS.has(String(o.status || ''))) r.returns += Number(o.qty || 0);
  });
  const n = dates.length;
  return Object.entries(by).map(([sku, r]) => {
    const revS = _spread(r.revenue, n), speS = _spread(r.spend, n), ordS = _spread(r.orders, n);
    const retRate = r.units > 0 ? _round(r.returns / r.units * 100, 1) : 0;
    const series = dates.map((d, i) => {
      const rev = _round(revS[i]), spe = _round(speS[i]);
      return { date: d, orders: Math.round(ordS[i]), revenue: rev, spend: spe, net_payout: _round(rev - spe), roas: spe > 0 ? _round(rev / spe, 2) : 0, return_rate: retRate };
    });
    return {
      sku_id: sku, name: r.name, platform: r.platform, unit_price: r.price,
      avg_roas: r.spend > 0 ? _round(r.revenue / r.spend, 2) : 0,
      total_revenue: _round(r.revenue), total_spend: _round(r.spend), total_orders: r.orders,
      avg_return_rate: retRate, series,
    };
  }).sort((a, b) => b.total_revenue - a.total_revenue);
}

// ── 플랫폼: channelBudgets(광고 채널) 집계 ────────────────────────────────
function _platformRows(channelBudgets, dates) {
  const n = dates.length;
  return Object.entries(channelBudgets || {}).map(([key, b]) => {
    const spend = Number(b.spent || 0), revenue = Number(b.revenue || 0), imp = Number(b.impressions || 0), clk = Number(b.clicks || 0);
    const speS = _spread(spend, n), revS = _spread(revenue, n), impS = _spread(imp, n), clkS = _spread(clk, n);
    const series = dates.map((d, i) => {
      const s = _round(speS[i]), rv = _round(revS[i]), im = Math.round(impS[i]), ck = Math.round(clkS[i]);
      return { date: d, spend: s, revenue: rv, orders: 0, impressions: im, clicks: ck, roas: s > 0 ? _round(rv / s, 2) : 0, ctr: im > 0 ? _round(ck / im * 100, 2) : 0, cpc: ck > 0 ? Math.round(s / ck) : 0 };
    });
    return {
      platform: b.name || _CH_NAME[key] || key, color: b.color || '#4f8ef7',
      total_spend: _round(spend), total_revenue: _round(revenue), total_orders: 0,
      total_impressions: imp, total_clicks: clk, avg_roas: spend > 0 ? _round(revenue / spend, 2) : 0, series,
    };
  }).sort((a, b) => b.total_revenue - a.total_revenue);
}

// ── 캠페인: snsCampaigns 집계 ─────────────────────────────────────────────
function _campaignRows(campaigns, dates) {
  const n = dates.length;
  return (campaigns || []).map(c => {
    const spend = Number(c.spent || 0);
    const revenue = Number(c.revenue != null ? c.revenue : spend * Number(c.roas || 0));
    const imp = Number(c.impressions || 0), clk = Number(c.clicks || 0), conv = Number(c.conv || 0);
    const platform = (c.channels && c.channels[0] && (c.channels[0].name || c.channels[0].id)) || c.type || '';
    const speS = _spread(spend, n), revS = _spread(revenue, n), impS = _spread(imp, n), clkS = _spread(clk, n), cvS = _spread(conv, n);
    const series = dates.map((d, i) => {
      const s = _round(speS[i]), rv = _round(revS[i]), im = Math.round(impS[i]), ck = Math.round(clkS[i]), cv = Math.round(cvS[i]);
      return { date: d, spend: s, impressions: im, clicks: ck, conversions: cv, revenue: rv, ctr: im > 0 ? _round(ck / im * 100, 2) : 0, cpc: ck > 0 ? Math.round(s / ck) : 0, cpa: cv > 0 ? Math.round(s / cv) : 0, roas: s > 0 ? _round(rv / s, 2) : 0 };
    });
    return {
      campaign_id: c.id, name: c.name, platform,
      total_spend: _round(spend), total_revenue: _round(revenue), total_conversions: conv,
      avg_roas: spend > 0 ? _round(revenue / spend, 2) : 0, avg_cpa: conv > 0 ? Math.round(spend / conv) : 0, series,
    };
  }).sort((a, b) => b.total_revenue - a.total_revenue);
}

// ── 크리에이터: creators 집계 ────────────────────────────────────────────
function _creatorRows(creators, dates, n) {
  const len = dates.length;
  return (creators || []).map(c => {
    const revenue = Number((c.stats && c.stats.revenue) != null ? c.stats.revenue : (c.revenue || 0));
    const conv = Number((c.stats && c.stats.orders) != null ? c.stats.orders : (c.purchases || 0));
    const views = Number((c.stats && c.stats.views) || 0);
    const fee = Number((c.contract && c.contract.flatFee) || c.fee_per_post || 0);
    const revS = _spread(revenue, len), cvS = _spread(conv, len), vwS = _spread(views, len);
    const series = dates.map((d, i) => {
      const rv = _round(revS[i]), cv = Math.round(cvS[i]), vw = Math.round(vwS[i]);
      const clk = Math.round(vw * 0.03);
      return { date: d, views: vw, clicks: clk, conversions: cv, revenue: rv, ctr: vw > 0 ? _round(clk / vw * 100, 2) : 0, cvr: clk > 0 ? _round(cv / clk * 100, 2) : 0, roi_pct: fee > 0 ? _round((rv - fee / len) / (fee / len) * 100, 1) : 0 };
    });
    return {
      creator_id: c.id, handle: c.handle || (c.identities && c.identities[0] && c.identities[0].handle) || c.name, platform: c.platform || (c.identities && c.identities[0] && c.identities[0].type) || '',
      tier: c.tier, followers: Number(c.followers || 0), fee_per_post: fee,
      total_revenue: _round(revenue), total_conversions: conv,
      avg_roi_pct: fee > 0 ? _round((revenue - fee) / fee * 100, 1) : 0,
      revenue_per_fee: fee > 0 ? _round(revenue / fee, 2) : 0, series,
    };
  }).sort((a, b) => b.avg_roi_pct - a.avg_roi_pct);
}

/**
 * 데모 롤업 파생 진입점. dimension: summary|sku|campaign|creator|platform
 * gd: { orders, channelBudgets, snsCampaigns, creators }
 */
export function deriveRollup(dimension, period, n, gd) {
  const dates = _dates(period, n);
  const base = { ok: true, version: 'demo-derived', dimension, period, n, dates };
  if (dimension === 'sku') return { ...base, rows: _skuRows(gd.orders, dates) };
  if (dimension === 'platform') return { ...base, rows: _platformRows(gd.channelBudgets, dates) };
  if (dimension === 'campaign') return { ...base, rows: _campaignRows(gd.snsCampaigns, dates) };
  if (dimension === 'creator') return { ...base, rows: _creatorRows(gd.creators, dates, n) };

  // summary — 전 차원 합으로 KPI/by_platform/top_skus/alerts 파생(전 메뉴 합계 reconcile)
  const skuRows = _skuRows(gd.orders, dates);
  const pfRows = _platformRows(gd.channelBudgets, dates);
  const totalRevenue = skuRows.reduce((s, r) => s + r.total_revenue, 0);          // 판매 매출(=대시보드/P&L)
  const totalOrders = skuRows.reduce((s, r) => s + r.total_orders, 0);
  const totalSpend = pfRows.reduce((s, r) => s + r.total_spend, 0);               // 광고 지출(=마케팅 메뉴)
  const byPlatform = {};
  pfRows.forEach(p => { byPlatform[p.platform] = p.total_revenue; });
  const topSkus = skuRows.slice(0, 8).map(s => ({ sku_id: s.sku_id, name: s.name, revenue: s.total_revenue, orders: s.total_orders, roas: s.avg_roas, return_rate: s.avg_return_rate }));
  const alerts = skuRows.filter(s => s.avg_return_rate >= 12).slice(0, 8).map(s => ({ type: 'warn', dimension: 'sku', id: s.sku_id, msg: `${s.name} 반품률 ${s.avg_return_rate}%` }));
  return {
    ...base,
    kpi: {
      total_revenue: _round(totalRevenue), total_spend: _round(totalSpend), total_orders: totalOrders,
      avg_roas: totalSpend > 0 ? _round(totalRevenue / totalSpend, 2) : 0,
      revenue_per_order: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    },
    by_platform: byPlatform, top_skus: topSkus, alerts,
  };
}
