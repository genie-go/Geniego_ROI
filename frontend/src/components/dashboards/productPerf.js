// [현 차수] 상품 성과 SSOT — RollupDashboard '상품 성과' 탭과 ProductMarketingPanel(마케팅/채널 대시보드)이
//   공유하는 단일 소스. 채널→마켓국가 매핑·데모 파생·운영 페치를 한 곳에서 관리(중복 구현 금지).
//   ★광고 성과(ad/ad_attr)는 운영 백엔드 productPerformance 가 attribution_touch 기반으로 산출하는 것이 SSOT.
//   데모는 광고-상품 매핑 데이터가 없어 판매(매출/채널/국가)만 파생하고 광고 성과는 정직하게 비움.

export const PP_CHANNEL_COUNTRY = {
  coupang:'KR', naver:'KR', naver_smartstore:'KR', smartstore:'KR', '11st':'KR', st11:'KR', gmarket:'KR',
  auction:'KR', lotteon:'KR', ssg:'KR', kakao:'KR', kakaogift:'KR', cafe24:'KR', godomall:'KR', wemef:'KR', tmon:'KR',
  qoo10:'JP', yahoo_japan:'JP', yahoo_jp:'JP', rakuten:'JP', amazon_jp:'JP',
  amazon:'US', amazon_spapi:'US', ebay:'US', walmart:'US', etsy:'US',
  shopee:'SEA', lazada:'SEA', aliexpress:'CN',
};
export const ppCountry = (ch) => PP_CHANNEL_COUNTRY[String(ch || '').toLowerCase()] || 'ETC';
export const PP_COUNTRY_LABEL = { KR:'🇰🇷 국내', JP:'🇯🇵 일본', US:'🇺🇸 미국', SEA:'🌏 동남아', CN:'🇨🇳 중국', ETC:'🌐 기타' };

/** 데모/프론트 단일소스 파생: 주문(orders)에서 상품별 매출·판매량·채널별·국가별 집계(취소 제외). 광고 성과는 미산출(정직). */
export function deriveProductPerf(orders, costMap) {
  const prod = {};
  (orders || []).forEach(o => {
    const sku = o.sku || o.product_id || ''; if (!sku) return;
    const ev = String(o.event_type || o.eventType || 'order'); const st = String(o.status || '');
    if (/cancel|취소/i.test(ev) || /cancel|취소/i.test(st)) return;
    const isRet = /return|반품/i.test(ev) || /return|반품/i.test(st);
    const ch = o.channel || o.platform || ''; const country = ppCountry(ch);
    const qty = Number(o.qty ?? o.quantity ?? 1); const rev = Number(o.total_price ?? o.total ?? o.revenue ?? o.amount ?? 0);
    if (!prod[sku]) prod[sku] = { sku, name: o.product_name || o.name || o.product || sku, qty:0, revenue:0, orders:0, returns:0, byChannel:{}, byCountry:{}, byGender:{}, byAge:{} };
    const p = prod[sku]; p.qty+=qty; p.revenue+=rev; p.orders+=1; if(isRet)p.returns+=1;
    if(!p.byChannel[ch])p.byChannel[ch]={qty:0,revenue:0,orders:0}; p.byChannel[ch].qty+=qty; p.byChannel[ch].revenue+=rev; p.byChannel[ch].orders+=1;
    if(!p.byCountry[country])p.byCountry[country]={qty:0,revenue:0,orders:0}; p.byCountry[country].qty+=qty; p.byCountry[country].revenue+=rev; p.byCountry[country].orders+=1;
  });
  const list = Object.values(prod).map(p => {
    const cost = (costMap || {})[p.sku];
    const cogs = (cost != null && cost > 0) ? cost * p.qty : null;
    const rev = Math.round(p.revenue);
    const grossProfit = cogs != null ? Math.round(rev - cogs) : null;
    // [Phase1 순이익] 데모는 외부광고비·정산수수료 데이터가 없으므로 net=gross(수수료 미반영, 정직 표기 fees_source='none').
    //   운영은 백엔드(Rollup::productPerformance)가 ad_attr/ad·kr_settlement_line 으로 net_profit 을 실산출한다.
    return { ...p, revenue: rev, return_rate: p.orders>0?Math.round(p.returns/p.orders*1000)/10:0, aov: p.orders>0?Math.round(p.revenue/p.orders):0,
      cogs: cogs != null ? Math.round(cogs) : null, gross_profit: grossProfit, margin: (cogs != null && rev > 0) ? Math.round((rev - cogs) / rev * 1000) / 10 : null,
      ad_cost: 0, mkt_fees: 0, fees_source: 'none',
      net_profit: grossProfit, net_margin: (grossProfit != null && rev > 0) ? Math.round(grossProfit / rev * 1000) / 10 : null,
      top_channel: Object.entries(p.byChannel).sort((a,b)=>b[1].revenue-a[1].revenue)[0]?.[0]||'', top_country: Object.entries(p.byCountry).sort((a,b)=>b[1].revenue-a[1].revenue)[0]?.[0]||'' };
  });
  list.sort((a,b)=>b.revenue-a.revenue); list.forEach((p,i)=>p.rank=i+1);
  return { ok:true, products:list, channels:[...new Set(list.flatMap(p=>Object.keys(p.byChannel)))], countries:[...new Set(list.flatMap(p=>Object.keys(p.byCountry)))], count:list.length };
}

const getAuthToken = () => localStorage.getItem('genie_token') || localStorage.getItem('genie_auth_token') || '';
/** 운영 페치: 백엔드 attribution 기반 상품 성과(광고 ad/ad_attr 포함). 실패 시 빈 결과(정직). */
export async function fetchProductPerf(period = 'monthly', n = 0) {
  try {
    const res = await fetch(`/api/v423/rollup/product-performance?period=${period}&n=${n}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { ok: false, products: [] };
  }
}

/** 선택 상품 1건의 성과(데모=파생/운영=페치). 공용 진입점. */
export async function loadProductPerf({ isDemo, orders, costMap, period, n }) {
  return isDemo ? deriveProductPerf(orders, costMap) : await fetchProductPerf(period, n);
}

/** [Phase2] 데모용 채널×상품 매트릭스 파생 — 데모는 광고 집행데이터(ad_insight_agg)가 없으므로 주문(sku×channel)
 *   기준 판매·순이익 매트릭스를 산출(action='sales'=판매기준). 운영은 백엔드 /rollup/product-channel-matrix 가
 *   ad_insight_agg ⨯ 원가로 ROAS·순이익ROI·액션추천(increase/monitor/decrease)을 실산출한다. 셀 shape 호환. */
export function deriveChannelMatrix(orders, costMap) {
  const prod = {}; const chSeen = {};
  (orders || []).forEach(o => {
    const sku = o.sku || o.product_id || ''; if (!sku) return;
    const ev = String(o.event_type || 'order'), st = String(o.status || '');
    if (/cancel|취소/i.test(ev) || /cancel|취소/i.test(st)) return;
    const ch = o.channel || o.platform || 'own';
    const qty = Number(o.qty ?? o.quantity ?? 1); const rev = Number(o.total_price ?? o.total ?? o.revenue ?? o.amount ?? 0);
    if (!prod[sku]) prod[sku] = { sku, name: o.product_name || o.name || o.product || sku, cells: {}, total: { revenue: 0, net_profit: 0, orders: 0, roas: null } };
    const p = prod[sku]; if (!p.cells[ch]) p.cells[ch] = { revenue: 0, orders: 0, qty: 0 };
    p.cells[ch].revenue += rev; p.cells[ch].orders += 1; p.cells[ch].qty += qty;
    p.total.revenue += rev; p.total.orders += 1; chSeen[ch] = true;
  });
  const cost = costMap || {};
  const list = Object.values(prod).map(p => {
    let tnet = 0;
    Object.values(p.cells).forEach(c => {
      const cst = cost[p.sku]; const cogs = (cst != null && cst > 0) ? cst * c.qty : null;
      c.net_profit = cogs != null ? Math.round(c.revenue - cogs) : null;
      c.revenue = Math.round(c.revenue); c.action = 'sales'; c.roas = null; c.profit_roi = null;
      if (c.net_profit != null) tnet += c.net_profit;
    });
    p.total.revenue = Math.round(p.total.revenue); p.total.net_profit = tnet; p.recommend_channel = null;
    return p;
  });
  list.sort((a, b) => b.total.net_profit - a.total.net_profit);
  return { ok: true, channels: Object.keys(chSeen), benchmark: {}, products: list, count: list.length };
}
