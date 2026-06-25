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
    return { ...p, revenue: rev, return_rate: p.orders>0?Math.round(p.returns/p.orders*1000)/10:0, aov: p.orders>0?Math.round(p.revenue/p.orders):0,
      cogs: cogs != null ? Math.round(cogs) : null, gross_profit: cogs != null ? Math.round(rev - cogs) : null, margin: (cogs != null && rev > 0) ? Math.round((rev - cogs) / rev * 1000) / 10 : null,
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
