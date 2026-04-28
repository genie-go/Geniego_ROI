/**
 * demoSeedData.js — 완전 체험형 데모 시드 데이터
 * L'Oréal Korea 글로벌 운영 시나리오 기반
 *
 * 이 파일은 데모 모드(VITE_DEMO_MODE=true)에서만 사용됩니다.
 * 운영(production)에서는 절대 import되지 않습니다.
 */

const NOW = new Date().toLocaleString('ko-KR', { hour12: false });
const TODAY = new Date().toISOString().slice(0, 10);
const ts = (daysAgo = 0, h = 10, m = 30) => {
  const d = new Date(Date.now() - daysAgo * 86400000);
  d.setHours(h, m, 0, 0);
  return d.toLocaleString('ko-KR', { hour12: false });
};
const isoDate = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

/* ═══════════════════════════════════════════════════════
   1. 상품(SKU) 시드 — 20개 (L'Oréal 포트폴리오)
═══════════════════════════════════════════════════════ */
/* ── Product Image Generator: SVG data URIs for guaranteed rendering ─── */
const _pi = (emoji, g1, g2) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${g1}"/><stop offset="100%" stop-color="${g2}"/></linearGradient></defs><rect width="120" height="120" rx="16" fill="url(#g)"/><text x="60" y="72" text-anchor="middle" font-size="52">${emoji}</text></svg>`)}`;

export const DEMO_PRODUCTS = [
  { sku: 'LOR-REV-001', name: "L'Oréal Revitalift Filler [HA] 세럼 30ml", price: 45000, cost: 12000, category: 'skincare', brand: "L'Oréal Paris", status: 'active', channels: ['naver','coupang','oliveyoung'], image: _pi('💧','#e0f2fe','#7dd3fc') },
  { sku: 'LOR-REV-002', name: "L'Oréal Revitalift Laser X3 크림 50ml", price: 58000, cost: 15000, category: 'skincare', brand: "L'Oréal Paris", status: 'active', channels: ['naver','coupang','kakao'], image: _pi('✨','#fef3c7','#fbbf24') },
  { sku: 'LOR-PAR-001', name: "L'Oréal True Match 파운데이션 #N4", price: 28000, cost: 7500, category: 'makeup', brand: "L'Oréal Paris", status: 'active', channels: ['naver','oliveyoung','11st'], image: _pi('🎨','#fce7f3','#f9a8d4') },
  { sku: 'LOR-PAR-002', name: "L'Oréal Lash Paradise 마스카라 블랙", price: 22000, cost: 5800, category: 'makeup', brand: "L'Oréal Paris", status: 'active', channels: ['coupang','oliveyoung','gmarket'], image: _pi('👁️','#ede9fe','#c4b5fd') },
  { sku: 'LOR-PAR-003', name: "L'Oréal Color Riche 립스틱 #297", price: 19000, cost: 4500, category: 'makeup', brand: "L'Oréal Paris", status: 'active', channels: ['naver','coupang','oliveyoung'], image: _pi('💄','#ffe4e6','#fda4af') },
  { sku: 'LOR-ELV-001', name: "L'Oréal Elvive 엑스트라 오일 샴푸 400ml", price: 15000, cost: 3800, category: 'haircare', brand: "L'Oréal Paris", status: 'active', channels: ['coupang','naver'], image: _pi('🧴','#dcfce7','#86efac') },
  { sku: 'LOR-ELV-002', name: "L'Oréal Elvive 토탈 리페어 5 컨디셔너 400ml", price: 15000, cost: 3800, category: 'haircare', brand: "L'Oréal Paris", status: 'active', channels: ['coupang','naver','11st'], image: _pi('💆','#d1fae5','#6ee7b7') },
  { sku: 'LOR-MEN-001', name: "L'Oréal Men Expert 하이드라 에너자이저 50ml", price: 32000, cost: 8500, category: 'mens', brand: "L'Oréal Paris", status: 'active', channels: ['coupang','naver','11st'], image: _pi('🧔','#dbeafe','#93c5fd') },
  { sku: 'LOR-UV-001',  name: "L'Oréal UV Perfect SPF50+ 선크림 50ml", price: 25000, cost: 6200, category: 'suncare', brand: "L'Oréal Paris", status: 'active', channels: ['oliveyoung','coupang','naver'], image: _pi('☀️','#fef9c3','#fde047') },
  { sku: 'LOR-AGE-001', name: "L'Oréal Age Perfect 골든 에이지 세럼 30ml", price: 65000, cost: 18000, category: 'skincare', brand: "L'Oréal Paris", status: 'active', channels: ['naver','oliveyoung'], image: _pi('🌟','#fff7ed','#fdba74') },
  { sku: 'KER-SIL-001', name: 'Kérastase Elixir Ultime 오일 100ml', price: 52000, cost: 22000, category: 'luxury_hair', brand: 'Kérastase', status: 'active', channels: ['naver','shopify_global'], image: _pi('💎','#f0f9ff','#67e8f9') },
  { sku: 'KER-RES-001', name: 'Kérastase Resistance 샴푸 250ml', price: 42000, cost: 18000, category: 'luxury_hair', brand: 'Kérastase', status: 'active', channels: ['naver','shopify_global'], image: _pi('🛡️','#ecfdf5','#34d399') },
  { sku: 'LAN-ABS-001', name: 'Lancôme Absolue 소프트 크림 60ml', price: 280000, cost: 85000, category: 'luxury_skin', brand: 'Lancôme', status: 'active', channels: ['naver','shopify_global','amazon_jp'], image: _pi('👑','#fdf4ff','#e879f9') },
  { sku: 'LAN-GEN-001', name: 'Lancôme Génifique 어드밴스드 세럼 50ml', price: 158000, cost: 42000, category: 'luxury_skin', brand: 'Lancôme', status: 'active', channels: ['naver','coupang','amazon_jp'], image: _pi('🧬','#f0fdfa','#5eead4') },
  { sku: 'LAN-TIN-001', name: 'Lancôme Teint Idole 파운데이션 #BO-02', price: 68000, cost: 19000, category: 'luxury_makeup', brand: 'Lancôme', status: 'active', channels: ['naver','oliveyoung'], image: _pi('🎭','#faf5ff','#d8b4fe') },
  { sku: 'YSL-RPC-001', name: 'YSL Rouge Pur Couture 립스틱 #01', price: 48000, cost: 14000, category: 'luxury_makeup', brand: 'YSL', status: 'active', channels: ['naver','shopify_global'], image: _pi('🌹','#fff1f2','#fca5a5') },
  { sku: 'VIC-MIN-001', name: 'Vichy Minéral 89 부스터 세럼 50ml', price: 38000, cost: 10000, category: 'derma', brand: 'Vichy', status: 'active', channels: ['oliveyoung','coupang'], image: _pi('💠','#eff6ff','#60a5fa') },
  { sku: 'LRP-EFF-001', name: 'La Roche-Posay Effaclar 듀오(+) 크림 40ml', price: 32000, cost: 8800, category: 'derma', brand: 'La Roche-Posay', status: 'active', channels: ['oliveyoung','coupang','naver'], image: _pi('🔬','#f0fdf4','#4ade80') },
  { sku: 'GAR-MIC-001', name: 'Garnier 미셀라 클렌징 워터 400ml', price: 12000, cost: 2800, category: 'cleansing', brand: 'Garnier', status: 'active', channels: ['coupang','11st','gmarket'], image: _pi('💧','#ecfeff','#22d3ee') },
  { sku: 'NYX-LIP-001', name: 'NYX Lip Lingerie XXL 립글로스 #16', price: 15000, cost: 3500, category: 'color_cosmetics', brand: 'NYX', status: 'active', channels: ['coupang','oliveyoung','11st'], image: _pi('💋','#fdf2f8','#f472b6') },
];

/* ═══════════════════════════════════════════════════════
   2. 재고(Inventory) — 3개 창고
═══════════════════════════════════════════════════════ */
export const DEMO_INVENTORY = DEMO_PRODUCTS.map(p => ({
  sku: p.sku,
  name: p.name,
  price: p.price,
  cost: p.cost,
  category: p.category,
  brand: p.brand,
  safeQty: p.price >= 100000 ? 15 : 30,
  stock: {
    W001: 50 + Math.floor(Math.random() * 200),  // 서울 본사 물류센터
    W002: 30 + Math.floor(Math.random() * 100),  // 부산 물류센터
    W003: 20 + Math.floor(Math.random() * 80),   // 인천 글로벌 허브
  },
  status: p.status,
  channels: p.channels,
  image: p.image,
}));

/* ═══════════════════════════════════════════════════════
   3. 가상 채널 — 8개 연동 완료
═══════════════════════════════════════════════════════ */
export const DEMO_CHANNELS = [
  { id: 'naver',       name: '네이버 스마트스토어', icon: '🟢', status: 'connected', products: 18, orders: 1247, lastSync: ts(0, 10, 15), revenue: 187500000, currency: 'KRW', color: '#2DB400' },
  { id: 'coupang',     name: '쿠팡 로켓배송',       icon: '🟠', status: 'connected', products: 16, orders: 2134, lastSync: ts(0, 9, 45),  revenue: 245800000, currency: 'KRW', color: '#E31937' },
  { id: 'oliveyoung',  name: '올리브영 온라인',     icon: '🟡', status: 'connected', products: 12, orders: 856,  lastSync: ts(0, 10, 0),  revenue: 98400000,  currency: 'KRW', color: '#A3C800' },
  { id: '11st',        name: '11번가',              icon: '🔴', status: 'connected', products: 8,  orders: 423,  lastSync: ts(0, 8, 30),  revenue: 56200000,  currency: 'KRW', color: '#FF0000' },
  { id: 'gmarket',     name: 'G마켓/옥션',          icon: '🟢', status: 'connected', products: 6,  orders: 312,  lastSync: ts(0, 7, 0),   revenue: 42100000,  currency: 'KRW', color: '#00C73C' },
  { id: 'kakao',       name: '카카오쇼핑',          icon: '💬', status: 'connected', products: 5,  orders: 187,  lastSync: ts(1, 23, 0),  revenue: 28700000,  currency: 'KRW', color: '#FEE500' },
  { id: 'amazon_jp',   name: 'Amazon Japan',        icon: '📦', status: 'connected', products: 4,  orders: 234,  lastSync: ts(0, 6, 0),   revenue: 18500000,  currency: 'JPY', color: '#FF9900' },
  { id: 'shopify_global', name: 'Shopify Global',  icon: '🛒', status: 'connected', products: 6,  orders: 156,  lastSync: ts(0, 5, 30),  revenue: 12400000,  currency: 'USD', color: '#96BF48' },
];

/* ═══════════════════════════════════════════════════════
   4. 주문(Orders) — 60건 (다양한 상태)
═══════════════════════════════════════════════════════ */
const ORDER_STATUSES = ['paid', 'preparing', 'shipping', 'delivered', 'delivered', 'delivered', 'confirmed', 'confirmed', 'confirmed'];
const BUYERS = ['김서연','이지우','박민준','최수아','정하윤','강도윤','조예린','윤시우','장서준','임지아','한유준','오서아','송지호','황수빈','전도현'];

export const DEMO_ORDERS = Array.from({ length: 60 }, (_, i) => {
  const p = DEMO_PRODUCTS[i % DEMO_PRODUCTS.length];
  const ch = DEMO_CHANNELS[i % DEMO_CHANNELS.length];
  const buyer = BUYERS[i % BUYERS.length];
  const qty = 1 + Math.floor(Math.random() * 4);
  const daysAgo = Math.floor(i / 4);
  const status = i < 5 ? 'paid' : i < 10 ? 'preparing' : i < 16 ? 'shipping' : i < 50 ? 'confirmed' : ORDER_STATUSES[i % ORDER_STATUSES.length];
  return {
    id: `ORD-${String(10000 + i).slice(1)}`,
    ch: ch.id,
    sku: p.sku,
    name: p.name,
    buyer: `${buyer} (${buyer}@demo.com)`,
    qty,
    price: p.price,
    total: qty * p.price,
    status,
    wh: i % 3 === 0 ? 'W002' : i % 5 === 0 ? 'W003' : 'W001',
    at: ts(daysAgo, 9 + (i % 12), (i * 7) % 60),
    fee: Math.round(qty * p.price * 0.03),
    platformFeeRate: ch.id === 'coupang' ? 0.108 : ch.id === 'oliveyoung' ? 0.30 : 0.055,
    adFee: Math.round(qty * p.price * 0.02),
    carrier: status === 'shipping' ? (i % 2 === 0 ? 'CJ대한통운' : '한진택배') : (status === 'delivered' || status === 'confirmed') ? (i % 3 === 0 ? '로젠택배' : 'CJ대한통운') : undefined,
    trackingNo: (status === 'shipping' || status === 'delivered' || status === 'confirmed') ? `TRK${String(900000 + i * 17)}` : undefined,
  };
});

/* ═══════════════════════════════════════════════════════
   5. 입출고 이력 — 40건
═══════════════════════════════════════════════════════ */
export const DEMO_INOUT = [];
for (let i = 0; i < 20; i++) {
  const p = DEMO_PRODUCTS[i % DEMO_PRODUCTS.length];
  DEMO_INOUT.push({
    id: `IO-IN-${String(1000 + i).slice(1)}`,
    type: '입고',
    sku: p.sku,
    name: p.name,
    qty: 50 + Math.floor(Math.random() * 150),
    wh: i % 3 === 0 ? 'W002' : i % 5 === 0 ? 'W003' : 'W001',
    at: ts(30 - i, 9, 0),
    by: '구매팀',
    unit: p.cost,
    memo: `정기 입고 #${i + 1}`,
    ref: `PO-${String(2000 + i).slice(1)}`,
  });
}
for (let i = 0; i < 15; i++) {
  const p = DEMO_PRODUCTS[i % DEMO_PRODUCTS.length];
  DEMO_INOUT.push({
    id: `IO-OUT-${String(1000 + i).slice(1)}`,
    type: '출고',
    sku: p.sku,
    name: p.name,
    qty: 5 + Math.floor(Math.random() * 20),
    wh: 'W001',
    at: ts(15 - i, 14, 30),
    by: '쿠팡 주문',
    unit: p.price,
    memo: `채널 출고`,
    ref: `ORD-${String(10000 + i * 3).slice(1)}`,
  });
}
for (let i = 0; i < 5; i++) {
  const p = DEMO_PRODUCTS[(i + 5) % DEMO_PRODUCTS.length];
  DEMO_INOUT.push({
    id: `IO-RET-${String(1000 + i).slice(1)}`,
    type: '반품입고',
    sku: p.sku,
    name: p.name,
    qty: 1 + Math.floor(Math.random() * 3),
    wh: 'W001',
    at: ts(7 - i, 11, 0),
    by: 'CS팀',
    unit: p.price,
    memo: '고객 반품',
    reason: i % 2 === 0 ? '단순변심' : '불량',
    ref: `ORD-${String(10020 + i).slice(1)}`,
  });
}

/* ═══════════════════════════════════════════════════════
   6. 채널 Budget — 5개 광고 채널
═══════════════════════════════════════════════════════ */
export const DEMO_BUDGETS = {
  meta:     { name: 'Meta Ads',     budget: 35000000, spent: 24500000, revenue: 138000000, roas: 5.6, targetRoas: 5.0, icon: '📘', color: '#4f8ef7', impressions: 18500000, clicks: 462500, reach: 12800000, engagement: 185000, videoViews: 4200000 },
  google:   { name: 'Google Ads',   budget: 35000000, spent: 24500000, revenue: 145100000, roas: 5.9, targetRoas: 5.0, icon: '🔍', color: '#22c55e', impressions: 22400000, clicks: 672000, reach: 15200000, engagement: 112000, videoViews: 1800000 },
  tiktok:   { name: 'TikTok Ads',   budget: 35000000, spent: 24500000, revenue: 78600000,  roas: 3.2, targetRoas: 3.0, icon: '🎵', color: '#000000', impressions: 42000000, clicks: 840000, reach: 28500000, engagement: 520000, videoViews: 18600000 },
  naver_sa: { name: 'Naver SA',     budget: 20000000, spent: 14200000, revenue: 48200000,  roas: 3.4, targetRoas: 3.0, icon: '🟢', color: '#14d9b0', impressions: 8900000, clicks: 267000, reach: 6200000, engagement: 78000, videoViews: 920000 },
  kakao_moment: { name: 'Kakao Moment', budget: 15000000, spent: 10800000, revenue: 32500000, roas: 3.0, targetRoas: 2.5, icon: '💬', color: '#eab308', impressions: 6800000, clicks: 170000, reach: 4500000, engagement: 95000, videoViews: 1400000 },
  coupang_ads:  { name: 'Coupang Ads',  budget: 12000000, spent: 8900000,  revenue: 44500000, roas: 5.0, targetRoas: 4.5, icon: '🟠', color: '#E31937', impressions: 5200000, clicks: 156000, reach: 3800000, engagement: 42000, videoViews: 280000 },
};

/* ═══════════════════════════════════════════════════════
   7. 정산(Settlement) — 채널별 3개월
═══════════════════════════════════════════════════════ */
export const DEMO_SETTLEMENT = DEMO_CHANNELS.slice(0, 6).flatMap(ch => {
  return ['2026-02', '2026-03', '2026-04'].map((period, pi) => {
    const gross = Math.round(ch.revenue * (0.28 + pi * 0.03) * (0.9 + Math.random() * 0.2));
    const pfee = Math.round(gross * (ch.id === 'oliveyoung' ? 0.30 : ch.id === 'coupang' ? 0.108 : 0.055));
    const adFee = Math.round(gross * 0.02);
    const returnFee = Math.round(gross * 0.015);
    const net = gross - pfee - adFee - returnFee;
    return {
      id: `STL-${ch.id}-${period}`,
      channel: ch.id,
      channelName: ch.name,
      period,
      grossSales: gross,
      platformFee: pfee,
      adFee,
      returnFee,
      couponDiscount: Math.round(gross * 0.01),
      netPayout: net,
      orders: Math.round(ch.orders * (0.28 + pi * 0.03)),
      returns: Math.round(ch.orders * 0.02),
      status: pi < 2 ? 'settled' : 'confirmed',
    };
  });
});

/* ═══════════════════════════════════════════════════════
   8. 캠페인 — 12건
═══════════════════════════════════════════════════════ */
export const DEMO_CAMPAIGNS = [
  { id: 'CAMP-001', name: "L'Oréal 2026 Summer UV", status: 'active', type: 'brand', budget: 15000000, spent: 9800000, impressions: 4250000, clicks: 127500, reach: 3100000, conv: 3825, roas: 4.2, channels: [{id:'meta',name:'Meta',budget:5000000},{id:'google',name:'Google',budget:5000000},{id:'tiktok',name:'TikTok',budget:5000000}], estimatedRoas: 4.2, source: 'auto-marketing', startDate: isoDate(30), endDate: isoDate(-15), createdAt: isoDate(14) },
  { id: 'CAMP-002', name: 'Revitalift 리뉴얼 캠페인', status: 'active', type: 'performance', budget: 8000000, spent: 6200000, impressions: 2890000, clicks: 98260, reach: 2150000, conv: 2946, roas: 5.5, channels: [{id:'meta',name:'Meta',budget:4000000},{id:'naver_sa',name:'Naver',budget:4000000}], estimatedRoas: 5.5, source: 'manual', startDate: isoDate(35), endDate: isoDate(-10), createdAt: isoDate(21) },
  { id: 'CAMP-003', name: 'Lancôme 럭셔리 타겟팅', status: 'active', type: 'acquisition', budget: 12000000, spent: 7500000, impressions: 1850000, clicks: 62900, reach: 1420000, conv: 1887, roas: 3.8, channels: [{id:'google',name:'Google',budget:6000000},{id:'meta',name:'Meta',budget:6000000}], estimatedRoas: 3.8, source: 'ai_hub', startDate: isoDate(20), endDate: isoDate(-10), createdAt: isoDate(7) },
  { id: 'CAMP-004', name: '올리브영 기획전 부스트', status: 'active', type: 'channel_boost', budget: 5000000, spent: 4100000, impressions: 1620000, clicks: 56700, reach: 1280000, conv: 2268, roas: 5.0, channels: [{id:'coupang_ads',name:'Coupang',budget:5000000}], estimatedRoas: 5.0, source: 'manual', startDate: isoDate(10), endDate: isoDate(-5), createdAt: isoDate(3) },
  { id: 'CAMP-005', name: 'Kérastase 리타겟팅', status: 'paused', type: 'retargeting', budget: 3000000, spent: 2100000, impressions: 980000, clicks: 34300, reach: 750000, conv: 1715, roas: 6.2, channels: [{id:'meta',name:'Meta',budget:2000000},{id:'google',name:'Google',budget:1000000}], estimatedRoas: 6.2, source: 'auto-marketing', startDate: isoDate(40), endDate: isoDate(5), createdAt: isoDate(28) },
  { id: 'CAMP-006', name: 'NYX 신제품 론칭', status: 'active', type: 'launch', budget: 7000000, spent: 5600000, impressions: 3200000, clicks: 112000, reach: 2650000, conv: 2240, roas: 3.0, channels: [{id:'tiktok',name:'TikTok',budget:4000000},{id:'meta',name:'Meta',budget:3000000}], estimatedRoas: 3.0, source: 'manual', startDate: isoDate(15), endDate: isoDate(-10), createdAt: isoDate(5) },
  { id: 'CAMP-007', name: 'Vichy 더마 전문가 캠페인', status: 'draft', type: 'brand', budget: 4000000, spent: 0, impressions: 0, clicks: 0, reach: 0, conv: 0, roas: 0, channels: [{id:'naver_sa',name:'Naver',budget:2000000},{id:'google',name:'Google',budget:2000000}], estimatedRoas: 3.5, source: 'ai_hub', startDate: isoDate(-2), endDate: isoDate(-30), createdAt: isoDate(1) },
  { id: 'CAMP-008', name: 'La Roche-Posay 여름 UV', status: 'ended', type: 'seasonal', budget: 6000000, spent: 5950000, impressions: 2750000, clicks: 93500, reach: 2100000, conv: 2805, roas: 4.8, channels: [{id:'meta',name:'Meta',budget:3000000},{id:'coupang_ads',name:'Coupang',budget:3000000}], estimatedRoas: 4.8, source: 'manual', startDate: isoDate(60), endDate: isoDate(15), createdAt: isoDate(45) },
  { id: 'CAMP-009', name: "L'Oréal Men 스포츠 타겟", status: 'active', type: 'acquisition', budget: 5000000, spent: 3800000, impressions: 2100000, clicks: 73500, reach: 1750000, conv: 1470, roas: 2.8, channels: [{id:'tiktok',name:'TikTok',budget:3000000},{id:'kakao_moment',name:'Kakao',budget:2000000}], estimatedRoas: 2.8, source: 'auto-marketing', startDate: isoDate(18), endDate: isoDate(-7), createdAt: isoDate(10) },
  { id: 'CAMP-010', name: 'Garnier 가성비 어필', status: 'active', type: 'performance', budget: 3000000, spent: 2400000, impressions: 1950000, clicks: 78000, reach: 1620000, conv: 3120, roas: 7.2, channels: [{id:'coupang_ads',name:'Coupang',budget:2000000},{id:'naver_sa',name:'Naver',budget:1000000}], estimatedRoas: 7.2, source: 'manual', startDate: isoDate(14), endDate: isoDate(-7), createdAt: isoDate(8) },
  { id: 'CAMP-011', name: 'Lancôme 모니터 셀럽 콜라보', status: 'draft', type: 'influencer', budget: 20000000, spent: 0, impressions: 0, clicks: 0, reach: 0, conv: 0, roas: 0, channels: [{id:'meta',name:'Meta',budget:10000000},{id:'tiktok',name:'TikTok',budget:10000000}], estimatedRoas: 4.0, source: 'ai_hub', startDate: isoDate(-3), endDate: isoDate(-30), createdAt: isoDate(0) },
  { id: 'CAMP-012', name: 'YSL 럭셔리 배너 캠페인', status: 'active', type: 'brand', budget: 8000000, spent: 5200000, impressions: 1450000, clicks: 50750, reach: 1100000, conv: 1522, roas: 3.5, channels: [{id:'google',name:'Google',budget:4000000},{id:'meta',name:'Meta',budget:4000000}], estimatedRoas: 3.5, source: 'manual', startDate: isoDate(25), endDate: isoDate(-7), createdAt: isoDate(12) },
];

/* ═══════════════════════════════════════════════════════
   9. CRM 세그먼트 — 6개
═══════════════════════════════════════════════════════ */
export const DEMO_CRM_SEGMENTS = [
  { id: 'seg-vip',     name: 'VIP 고객 (상위 5%)', count: 1247, description: '최근 90일 100만원 이상 구매', criteria: 'purchase >= 1000000', color: '#4f8ef7', avgOrderValue: 185000, avgOrderFreq: 3.2 },
  { id: 'seg-loyal',   name: '충성 고객', count: 3852, description: '3회 이상 재구매 고객', criteria: 'order_count >= 3', color: '#22c55e', avgOrderValue: 72000, avgOrderFreq: 2.1 },
  { id: 'seg-new',     name: '신규 가입자 (30일)', count: 2145, description: '최근 30일 내 가입 고객', criteria: 'signup_days <= 30', color: '#a855f7', avgOrderValue: 35000, avgOrderFreq: 0.8 },
  { id: 'seg-dormant', name: '휴면 고객 (90일+)', count: 4521, description: '90일 이상 미활동 고객', criteria: 'last_active_days >= 90', color: '#f59e0b', avgOrderValue: 0, avgOrderFreq: 0 },
  { id: 'seg-churn',   name: '이탈 위험 고객', count: 1873, description: 'AI 예측 이탈확률 70%+', criteria: 'churn_prob >= 0.7', color: '#ef4444', avgOrderValue: 42000, avgOrderFreq: 0.3 },
  { id: 'seg-luxury',  name: 'Luxury 고객', count: 892, description: 'Lancôme/YSL/Kérastase 구매 이력', criteria: 'brand in luxury', color: '#d946ef', avgOrderValue: 215000, avgOrderFreq: 1.8 },
];

/* ═══════════════════════════════════════════════════════
   10. 웹팝업 시드 — 6건
═══════════════════════════════════════════════════════ */
export const DEMO_POPUPS = [
  { id: 'WP-001', name: '🌸 봄 신상품 런칭 팝업', type: 'center_modal', status: 'active', targetPage: '/', startDate: isoDate(5), endDate: isoDate(-10), impressions: 12450, clicks: 1834, conversions: 247, ctr: 14.7, cvr: 13.5, title: "L'Oréal 봄 신상 런칭!", subtitle: '최대 30% 할인 + 무료배송', btnText: '지금 쇼핑하기', btnColor: '#4f8ef7', bgColor: '#0f172a', template: 'promo_banner', createdAt: isoDate(10) },
  { id: 'WP-002', name: '💎 Lancôme VIP 전용 할인', type: 'slide_in', status: 'active', targetPage: '/luxury', startDate: isoDate(3), endDate: isoDate(-7), impressions: 4520, clicks: 890, conversions: 134, ctr: 19.7, cvr: 15.1, title: 'VIP Only 시크릿 세일', subtitle: 'Lancôme & YSL 20% 추가 할인', btnText: 'VIP 혜택 보기', btnColor: '#d946ef', bgColor: '#1e1b4b', template: 'vip_exclusive', targetSegmentId: 'seg-vip', createdAt: isoDate(8) },
  { id: 'WP-003', name: '🛒 장바구니 이탈 방지', type: 'exit_intent', status: 'active', targetPage: '/cart', startDate: isoDate(14), endDate: isoDate(-30), impressions: 8900, clicks: 2310, conversions: 412, ctr: 25.9, cvr: 17.8, title: '잠깐! 놓치지 마세요', subtitle: '지금 결제하면 5,000원 즉시 할인', btnText: '할인 받고 결제하기', btnColor: '#22c55e', bgColor: '#0d1117', template: 'cart_abandon', createdAt: isoDate(20) },
  { id: 'WP-004', name: '📧 뉴스레터 구독 유도', type: 'bottom_bar', status: 'scheduled', targetPage: '/all', startDate: isoDate(-2), endDate: isoDate(-14), impressions: 0, clicks: 0, conversions: 0, ctr: 0, cvr: 0, title: '뷰티 트렌드를 먼저 만나세요', subtitle: '구독하면 첫 주문 10% 할인 쿠폰 증정', btnText: '무료 구독', btnColor: '#6366f1', bgColor: '#1e293b', template: 'newsletter', createdAt: isoDate(2) },
  { id: 'WP-005', name: '⏰ 타임세일 카운트다운', type: 'top_banner', status: 'ended', targetPage: '/', startDate: isoDate(20), endDate: isoDate(5), impressions: 34200, clicks: 5120, conversions: 823, ctr: 15.0, cvr: 16.1, title: '⏰ 48시간 한정 타임세일', subtitle: '인기 상품 최대 50% OFF', btnText: '타임세일 보기', btnColor: '#ef4444', bgColor: '#7f1d1d', template: 'flash_sale', createdAt: isoDate(25) },
  { id: 'WP-006', name: '🎁 첫 구매 쿠폰 팝업', type: 'center_modal', status: 'active', targetPage: '/', startDate: isoDate(30), endDate: isoDate(-60), impressions: 18700, clicks: 4250, conversions: 1120, ctr: 22.7, cvr: 26.4, title: '첫 구매 고객 특별 혜택', subtitle: '회원가입 즉시 15% 할인쿠폰 지급', btnText: '쿠폰 받기', btnColor: '#f59e0b', bgColor: '#1c1917', template: 'welcome', targetSegmentId: 'seg-new', createdAt: isoDate(35) },
];

/* ═══════════════════════════════════════════════════════
   11. 알림 시드 — 초기 알림 10건
═══════════════════════════════════════════════════════ */
export const DEMO_ALERTS = [
  { id: 'AL-SEED-001', type: 'success', msg: '🚀 데모 환경 초기화 완료 — Enterprise 전 기능 체험 가능', time: ts(0), read: false },
  { id: 'AL-SEED-002', type: 'info',    msg: '📦 쿠팡 신규 주문 12건 수신 — 자동 출고 처리 시작', time: ts(0, 9, 30), read: false },
  { id: 'AL-SEED-003', type: 'success', msg: '✅ Meta Ads 캠페인 ROAS 5.6x 달성 — 목표 초과!', time: ts(0, 8, 0), read: false },
  { id: 'AL-SEED-004', type: 'warn',    msg: '⚠️ [Garnier 미셀라 워터] 재고 부족 — 안전재고 이하', time: ts(1), read: false },
  { id: 'AL-SEED-005', type: 'info',    msg: '💳 2026-03 정산 완료 — 순지급액 ₩487,200,000', time: ts(2), read: true },
  { id: 'AL-SEED-006', type: 'success', msg: '🌐 8개 채널 동기화 정상 — 마지막 동기화: 10분 전', time: ts(0, 10, 5), read: true },
  { id: 'AL-SEED-007', type: 'info',    msg: '📊 AI 인사이트: TikTok 채널 ROAS 상승 추세 (3.2x → 3.5x)', time: ts(1, 14, 0), read: true },
  { id: 'AL-SEED-008', type: 'warn',    msg: '🔄 반품 접수 3건 — CS팀 확인 필요', time: ts(1, 11, 0), read: true },
  { id: 'AL-SEED-009', type: 'success', msg: '🎯 캠페인 "NYX 신제품 론칭" CTR 4.2% 달성', time: ts(2, 16, 0), read: true },
  { id: 'AL-SEED-010', type: 'info',    msg: '📋 발주서 PO-2003 입고 확정 — Revitalift 세럼 200개', time: ts(3, 9, 0), read: true },
];

/* ═══════════════════════════════════════════════════════
   12. 이메일 캠페인 시드
═══════════════════════════════════════════════════════ */
export const DEMO_EMAIL_CAMPAIGNS = [
  { id: 'EC-001', name: 'VIP 고객 시크릿 세일 안내', status: 'sent', targetSegmentId: 'seg-vip', targetSegmentName: 'VIP 고객', estimatedReach: 1247, sent: 1198, open_rate: 42.5, click_rate: 18.3, revenue: 28500000, createdAt: isoDate(7) },
  { id: 'EC-002', name: '봄 신상품 런칭 알림', status: 'sent', targetSegmentId: 'seg-loyal', targetSegmentName: '충성 고객', estimatedReach: 3852, sent: 3642, open_rate: 35.2, click_rate: 12.8, revenue: 15200000, createdAt: isoDate(5) },
  { id: 'EC-003', name: '이탈 위험 고객 재방문 유도', status: 'draft', targetSegmentId: 'seg-churn', targetSegmentName: '이탈 위험', estimatedReach: 1873, sent: 0, open_rate: 0, click_rate: 0, revenue: 0, source: 'ai_auto', createdAt: isoDate(1) },
  { id: 'EC-004', name: '신규가입 웰컴 시리즈 #1', status: 'active', targetSegmentId: 'seg-new', targetSegmentName: '신규 가입자', estimatedReach: 2145, sent: 890, open_rate: 52.1, click_rate: 22.4, revenue: 4800000, createdAt: isoDate(14) },
];

/* ═══════════════════════════════════════════════════════
   13. 카카오 캠페인 시드
═══════════════════════════════════════════════════════ */
export const DEMO_KAKAO_CAMPAIGNS = [
  { id: 'KC-001', name: 'VIP 전용 카카오 알림톡', type: 'alimtalk', status: 'sent', targetSegmentId: 'seg-vip', targetSegmentName: 'VIP 고객', estimatedReach: 1247, sent: 1180, open_rate: 68.5, click_rate: 24.2, createdAt: isoDate(5) },
  { id: 'KC-002', name: '봄 프로모션 친구톡', type: 'friendtalk', status: 'sent', targetSegmentId: 'seg-loyal', targetSegmentName: '충성 고객', estimatedReach: 3852, sent: 3500, open_rate: 55.3, click_rate: 15.7, createdAt: isoDate(3) },
];

/* ═══════════════════════════════════════════════════════
   14. 연동 채널(ConnectorSync용)
═══════════════════════════════════════════════════════ */
export const DEMO_CONNECTED_CHANNELS = DEMO_CHANNELS.map(ch => ({
  id: ch.id,
  name: ch.name,
  status: 'healthy',
  lastSync: ch.lastSync,
  productCount: ch.products,
  orderCount: ch.orders,
  revenue: ch.revenue,
  icon: ch.icon,
  color: ch.color,
}));

/* ═══════════════════════════════════════════════════════
   15. SNS 마케팅 캠페인/콘텐츠 — 10건
═══════════════════════════════════════════════════════ */
export const DEMO_SNS_CAMPAIGNS = [
  { id: 'SNS-001', platform: 'instagram', name: 'Revitalift 세럼 리뷰 릴스', type: 'reel', status: 'published', publishedAt: isoDate(2), reach: 245000, impressions: 412000, engagement: 18400, likes: 15200, comments: 1840, shares: 1360, clicks: 8920, conversions: 412, revenue: 18540000, linkedSku: 'LOR-REV-001', linkedCampaignId: 'CAMP-002', hashtags: '#로레알 #세럼추천 #스킨케어', thumbnail: '💧', engagementRate: 4.5, ctr: 2.17 },
  { id: 'SNS-002', platform: 'instagram', name: 'Lancôme Absolue 언박싱', type: 'carousel', status: 'published', publishedAt: isoDate(5), reach: 128000, impressions: 198000, engagement: 9200, likes: 7800, comments: 920, shares: 480, clicks: 4350, conversions: 187, revenue: 52360000, linkedSku: 'LAN-ABS-001', linkedCampaignId: 'CAMP-003', hashtags: '#랑콤 #럭셔리스킨케어', thumbnail: '👑', engagementRate: 4.6, ctr: 2.20 },
  { id: 'SNS-003', platform: 'tiktok', name: 'NYX 립 챌린지 #MyNYXLook', type: 'short_video', status: 'published', publishedAt: isoDate(3), reach: 520000, impressions: 890000, engagement: 42000, likes: 35000, comments: 4200, shares: 2800, clicks: 15200, conversions: 623, revenue: 9345000, linkedSku: 'NYX-LIP-001', linkedCampaignId: 'CAMP-006', hashtags: '#NYX #립챌린지 #MyNYXLook', thumbnail: '💋', engagementRate: 4.7, ctr: 1.71 },
  { id: 'SNS-004', platform: 'tiktok', name: 'Garnier 미셀라워터 ASMR', type: 'short_video', status: 'published', publishedAt: isoDate(7), reach: 380000, impressions: 645000, engagement: 28500, likes: 23000, comments: 3100, shares: 2400, clicks: 11200, conversions: 489, revenue: 5868000, linkedSku: 'GAR-MIC-001', linkedCampaignId: 'CAMP-010', hashtags: '#가르니에 #클렌징 #ASMR', thumbnail: '💧', engagementRate: 4.4, ctr: 1.74 },
  { id: 'SNS-005', platform: 'youtube', name: 'L\'Oréal 썸머 UV 풀 루틴', type: 'video', status: 'published', publishedAt: isoDate(10), reach: 89000, impressions: 142000, engagement: 5600, likes: 4200, comments: 890, shares: 510, clicks: 3200, conversions: 156, revenue: 3900000, linkedSku: 'LOR-UV-001', linkedCampaignId: 'CAMP-001', hashtags: '#자외선차단 #썸머루틴', thumbnail: '☀️', engagementRate: 3.9, ctr: 2.25 },
  { id: 'SNS-006', platform: 'instagram', name: 'YSL 루즈 퓨르 쿠튀르 스와치', type: 'story', status: 'published', publishedAt: isoDate(1), reach: 67000, impressions: 98000, engagement: 4100, likes: 3200, comments: 540, shares: 360, clicks: 2890, conversions: 98, revenue: 4704000, linkedSku: 'YSL-RPC-001', linkedCampaignId: 'CAMP-012', hashtags: '#YSL #립스틱스와치', thumbnail: '🌹', engagementRate: 4.2, ctr: 2.95 },
  { id: 'SNS-007', platform: 'facebook', name: 'Vichy Minéral 89 피부과학 인포', type: 'image', status: 'published', publishedAt: isoDate(4), reach: 42000, impressions: 68000, engagement: 2100, likes: 1600, comments: 320, shares: 180, clicks: 1850, conversions: 72, revenue: 2736000, linkedSku: 'VIC-MIN-001', linkedCampaignId: 'CAMP-007', hashtags: '#비쉬 #더마코스메틱', thumbnail: '💠', engagementRate: 3.1, ctr: 2.72 },
  { id: 'SNS-008', platform: 'tiktok', name: 'Kérastase 헤어케어 비포애프터', type: 'short_video', status: 'scheduled', publishedAt: isoDate(-2), reach: 0, impressions: 0, engagement: 0, likes: 0, comments: 0, shares: 0, clicks: 0, conversions: 0, revenue: 0, linkedSku: 'KER-SIL-001', linkedCampaignId: 'CAMP-005', hashtags: '#케라스타즈 #헤어케어', thumbnail: '💎', engagementRate: 0, ctr: 0 },
  { id: 'SNS-009', platform: 'instagram', name: 'La Roche-Posay 여드름 관리 가이드', type: 'carousel', status: 'draft', publishedAt: null, reach: 0, impressions: 0, engagement: 0, likes: 0, comments: 0, shares: 0, clicks: 0, conversions: 0, revenue: 0, linkedSku: 'LRP-EFF-001', hashtags: '#라로슈포제 #여드름케어', thumbnail: '🔬', engagementRate: 0, ctr: 0 },
  { id: 'SNS-010', platform: 'youtube', name: "L'Oréal Men Expert 그루밍 루틴", type: 'video', status: 'published', publishedAt: isoDate(6), reach: 56000, impressions: 92000, engagement: 3800, likes: 2900, comments: 520, shares: 380, clicks: 2100, conversions: 89, revenue: 2848000, linkedSku: 'LOR-MEN-001', linkedCampaignId: 'CAMP-009', hashtags: '#로레알맨 #남성그루밍', thumbnail: '🧔', engagementRate: 4.1, ctr: 2.28 },
];

/* ═══════════════════════════════════════════════════════
   16. AI 마케팅 추천 액션 카드 — 8건
═══════════════════════════════════════════════════════ */
export const DEMO_AI_RECOMMENDATIONS = [
  { id: 'AI-REC-001', title: 'TikTok 예산 30% 증액 추천', type: 'budget_rebalance', priority: 'HIGH', status: 'pending', description: 'TikTok 채널 ROAS가 3.2x → 3.8x로 상승 추세입니다. 예산을 30% 증액하면 월 ₩23.4M 추가 매출이 예상됩니다.', estimatedROI: 3.8, estimatedRevenue: 23400000, estimatedProfit: 16380000, confidence: 0.87, channels: [{id:'tiktok',name:'TikTok',budget:7500000}], linkedSkus: ['NYX-LIP-001','GAR-MIC-001'], suggestedBudget: 7500000, currentMetrics: { roas: 3.2, ctr: 2.1, cpc: 420 }, predictedMetrics: { roas: 3.8, ctr: 2.5, cpc: 380 }, createdAt: isoDate(0) },
  { id: 'AI-REC-002', title: 'Revitalift 리타겟팅 캠페인 생성', type: 'retargeting', priority: 'HIGH', status: 'pending', description: '장바구니 이탈 고객 2,340명 중 Revitalift 세럼 조회자가 68%입니다. 리타겟팅 캠페인으로 ₩15.2M 전환이 예상됩니다.', estimatedROI: 5.2, estimatedRevenue: 15200000, estimatedProfit: 12160000, confidence: 0.92, channels: [{id:'meta',name:'Meta',budget:2000000},{id:'google',name:'Google',budget:1000000}], linkedSkus: ['LOR-REV-001','LOR-REV-002'], suggestedBudget: 3000000, createdAt: isoDate(0) },
  { id: 'AI-REC-003', title: 'Lancôme VIP 전용 이메일 자동화', type: 'email_automation', priority: 'MEDIUM', status: 'pending', description: 'VIP 세그먼트 1,247명 대상 개인화 이메일 시리즈를 자동화하면 LTV가 18% 증가할 것으로 예측됩니다.', estimatedROI: 8.5, estimatedRevenue: 42500000, estimatedProfit: 38250000, confidence: 0.78, channels: [{id:'email',name:'이메일'}], linkedSkus: ['LAN-ABS-001','LAN-GEN-001'], suggestedBudget: 5000000, targetSegmentId: 'seg-vip', createdAt: isoDate(1) },
  { id: 'AI-REC-004', title: 'Naver SA 키워드 확장 제안', type: 'keyword_expansion', priority: 'MEDIUM', status: 'applied', description: '"선크림 추천", "자외선차단제 순위" 등 12개 신규 키워드를 추가하면 CTR 1.8% 향상이 예상됩니다.', estimatedROI: 4.2, estimatedRevenue: 8400000, estimatedProfit: 5880000, confidence: 0.84, channels: [{id:'naver_sa',name:'Naver SA',budget:2000000}], linkedSkus: ['LOR-UV-001'], suggestedBudget: 2000000, appliedAt: isoDate(2), createdAt: isoDate(3) },
  { id: 'AI-REC-005', title: '쿠팡 로켓딜 프로모션 최적화', type: 'channel_boost', priority: 'HIGH', status: 'pending', description: '쿠팡 Coupang Ads ROAS 5.0x로 최고 효율입니다. 로켓딜 카테고리 상위 노출 시 주문수 42% 증가 예상됩니다.', estimatedROI: 5.0, estimatedRevenue: 35000000, estimatedProfit: 24500000, confidence: 0.90, channels: [{id:'coupang_ads',name:'Coupang Ads',budget:5000000}], linkedSkus: ['LOR-PAR-002','GAR-MIC-001'], suggestedBudget: 5000000, createdAt: isoDate(0) },
  { id: 'AI-REC-006', title: '휴면 고객 리액티베이션', type: 'reactivation', priority: 'LOW', status: 'pending', description: '90일+ 휴면 고객 4,521명 중 AI 분석결과 32%가 할인 쿠폰에 반응할 확률이 높습니다.', estimatedROI: 2.8, estimatedRevenue: 12600000, estimatedProfit: 7560000, confidence: 0.68, channels: [{id:'email',name:'이메일'},{id:'kakao',name:'카카오'}], targetSegmentId: 'seg-dormant', suggestedBudget: 4500000, createdAt: isoDate(1) },
  { id: 'AI-REC-007', title: 'Instagram 인플루언서 콜라보', type: 'influencer', priority: 'MEDIUM', status: 'pending', description: '뷰티 인플루언서 3명과의 협업으로 Lancôme 제품 인지도 45% 향상 및 ₩18.7M 매출 예상됩니다.', estimatedROI: 3.5, estimatedRevenue: 18700000, estimatedProfit: 11220000, confidence: 0.75, channels: [{id:'meta',name:'Instagram'}], linkedSkus: ['LAN-ABS-001','LAN-TIN-001'], suggestedBudget: 5500000, createdAt: isoDate(0) },
  { id: 'AI-REC-008', title: '크로스셀 번들 프로모션', type: 'cross_sell', priority: 'MEDIUM', status: 'pending', description: 'Revitalift 세럼 구매자의 72%가 UV 선크림에도 관심을 보입니다. 번들 할인 시 AOV 35% 증가 예상됩니다.', estimatedROI: 4.8, estimatedRevenue: 14400000, estimatedProfit: 10080000, confidence: 0.82, linkedSkus: ['LOR-REV-001','LOR-UV-001'], suggestedBudget: 3000000, createdAt: isoDate(0) },
];

/* ═══════════════════════════════════════════════════════
   17. 채널별 상품 가격 매핑 — 전 상품 × 채널
═══════════════════════════════════════════════════════ */
export const DEMO_CHANNEL_PRICES = {};
DEMO_PRODUCTS.forEach(p => {
  const base = p.price;
  DEMO_CHANNEL_PRICES[p.sku] = {};
  if (p.channels.includes('naver'))        DEMO_CHANNEL_PRICES[p.sku].naver = base;
  if (p.channels.includes('coupang'))      DEMO_CHANNEL_PRICES[p.sku].coupang = Math.round(base * 0.95); // 쿠팡 최저가 전략
  if (p.channels.includes('oliveyoung'))   DEMO_CHANNEL_PRICES[p.sku].oliveyoung = Math.round(base * 1.05); // 올리브영 프리미엄
  if (p.channels.includes('11st'))         DEMO_CHANNEL_PRICES[p.sku]['11st'] = Math.round(base * 0.97);
  if (p.channels.includes('gmarket'))      DEMO_CHANNEL_PRICES[p.sku].gmarket = Math.round(base * 0.93);
  if (p.channels.includes('kakao'))        DEMO_CHANNEL_PRICES[p.sku].kakao = base;
  if (p.channels.includes('amazon_jp'))    DEMO_CHANNEL_PRICES[p.sku].amazon_jp = Math.round(base * 1.15); // JP 프리미엄
  if (p.channels.includes('shopify_global')) DEMO_CHANNEL_PRICES[p.sku].shopify_global = Math.round(base * 1.20); // 글로벌 프리미엄
});

/* ═══════════════════════════════════════════════════════
   18. 일별 매출 트렌드 — 30일분
═══════════════════════════════════════════════════════ */
export const DEMO_DAILY_TRENDS = Array.from({ length: 30 }, (_, i) => {
  const date = isoDate(29 - i);
  const dayOfWeek = new Date(date).getDay();
  const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
  const trendFactor = 1 + (i / 30) * 0.15; // 점진적 성장 트렌드
  const baseRevenue = 22000000;
  const baseOrders = 180;
  return {
    date,
    revenue: Math.round(baseRevenue * weekendFactor * trendFactor * (0.85 + Math.random() * 0.30)),
    orders: Math.round(baseOrders * weekendFactor * trendFactor * (0.85 + Math.random() * 0.30)),
    visitors: Math.round(12000 * weekendFactor * (0.9 + Math.random() * 0.2)),
    conversionRate: parseFloat((2.5 + Math.random() * 1.5).toFixed(2)),
    avgOrderValue: Math.round(42000 + Math.random() * 18000),
    adSpend: Math.round(3500000 * (0.8 + Math.random() * 0.4)),
    roas: parseFloat((3.2 + Math.random() * 2.8).toFixed(2)),
    newCustomers: Math.round(45 * weekendFactor * (0.8 + Math.random() * 0.4)),
    returningCustomers: Math.round(135 * weekendFactor * (0.85 + Math.random() * 0.3)),
    channelBreakdown: {
      naver: Math.round(5500000 * weekendFactor * trendFactor * (0.8 + Math.random() * 0.4)),
      coupang: Math.round(7200000 * weekendFactor * trendFactor * (0.8 + Math.random() * 0.4)),
      oliveyoung: Math.round(3000000 * weekendFactor * trendFactor * (0.8 + Math.random() * 0.4)),
      '11st': Math.round(1800000 * weekendFactor * trendFactor * (0.7 + Math.random() * 0.6)),
      gmarket: Math.round(1400000 * weekendFactor * trendFactor * (0.7 + Math.random() * 0.6)),
      kakao: Math.round(1000000 * weekendFactor * trendFactor * (0.7 + Math.random() * 0.6)),
      amazon_jp: Math.round(600000 * weekendFactor * trendFactor * (0.6 + Math.random() * 0.8)),
      shopify_global: Math.round(400000 * weekendFactor * trendFactor * (0.6 + Math.random() * 0.8)),
    },
  };
});

/* ═══════════════════════════════════════════════════════
   19. CRM 고객 구매 이력 — 20명
   format: { email: [{ orderId, items, at, total, ch }] }
═══════════════════════════════════════════════════════ */
export const DEMO_CRM_CUSTOMER_HISTORY = {
  '김서연': [
    { orderId: 'ORD-C001', items: ['Revitalift Filler 세럼','UV Perfect 선크림'], at: ts(2,14,20), total: 70000, ch: 'naver' },
    { orderId: 'ORD-C002', items: ['Revitalift Laser X3 크림'], at: ts(15,11,30), total: 58000, ch: 'coupang' },
    { orderId: 'ORD-C003', items: ['Age Perfect 골든 에이지 세럼'], at: ts(32,9,0), total: 65000, ch: 'naver' },
    { orderId: 'ORD-C004', items: ['Elvive 샴푸','Elvive 컨디셔너'], at: ts(45,16,0), total: 30000, ch: 'coupang' },
    { orderId: 'ORD-C005', items: ['Lancôme Génifique 세럼'], at: ts(60,13,0), total: 158000, ch: 'oliveyoung' },
  ],
  '이하은': [
    { orderId: 'ORD-C006', items: ['Lancôme Absolue 크림'], at: ts(1,10,30), total: 280000, ch: 'naver' },
    { orderId: 'ORD-C007', items: ['YSL Rouge Pur Couture 립스틱'], at: ts(8,15,0), total: 48000, ch: 'shopify_global' },
    { orderId: 'ORD-C008', items: ['Lancôme Teint Idole 파운데이션'], at: ts(20,11,0), total: 68000, ch: 'oliveyoung' },
    { orderId: 'ORD-C009', items: ['Kérastase Elixir Ultime 오일'], at: ts(35,14,0), total: 52000, ch: 'naver' },
  ],
  '박민지': [
    { orderId: 'ORD-C010', items: ['True Match 파운데이션','Color Riche 립스틱'], at: ts(3,12,0), total: 47000, ch: 'oliveyoung' },
    { orderId: 'ORD-C011', items: ['Lash Paradise 마스카라'], at: ts(18,16,30), total: 22000, ch: 'coupang' },
    { orderId: 'ORD-C012', items: ['NYX Lip Lingerie XXL'], at: ts(30,10,0), total: 15000, ch: '11st' },
  ],
  '정우진': [
    { orderId: 'ORD-C013', items: ['Men Expert 하이드라 에너자이저'], at: ts(5,9,0), total: 32000, ch: 'coupang' },
    { orderId: 'ORD-C014', items: ['Garnier 미셀라 클렌징 워터'], at: ts(22,14,0), total: 12000, ch: 'coupang' },
  ],
  '최수빈': [
    { orderId: 'ORD-C015', items: ['Vichy Minéral 89 부스터'], at: ts(4,11,30), total: 38000, ch: 'oliveyoung' },
    { orderId: 'ORD-C016', items: ['La Roche-Posay Effaclar 듀오'], at: ts(12,15,0), total: 32000, ch: 'oliveyoung' },
    { orderId: 'ORD-C017', items: ['UV Perfect 선크림'], at: ts(25,10,0), total: 25000, ch: 'coupang' },
  ],
  '한지우': [
    { orderId: 'ORD-C018', items: ['Lancôme Absolue 크림','Génifique 세럼'], at: ts(0,16,0), total: 438000, ch: 'naver' },
    { orderId: 'ORD-C019', items: ['YSL Rouge Pur Couture'], at: ts(7,13,0), total: 48000, ch: 'naver' },
    { orderId: 'ORD-C020', items: ['Kérastase Resistance 샴푸','Elixir Ultime 오일'], at: ts(14,11,0), total: 94000, ch: 'shopify_global' },
    { orderId: 'ORD-C021', items: ['Lancôme Teint Idole 파운데이션'], at: ts(28,10,0), total: 68000, ch: 'oliveyoung' },
    { orderId: 'ORD-C022', items: ['Age Perfect 세럼'], at: ts(42,9,0), total: 65000, ch: 'naver' },
    { orderId: 'ORD-C023', items: ['Revitalift Filler 세럼'], at: ts(55,14,0), total: 45000, ch: 'coupang' },
  ],
  '윤도현': [
    { orderId: 'ORD-C024', items: ['Men Expert 하이드라 에너자이저'], at: ts(6,10,0), total: 32000, ch: '11st' },
  ],
  '송예린': [
    { orderId: 'ORD-C025', items: ['Revitalift Laser X3 크림','Revitalift Filler 세럼'], at: ts(1,15,0), total: 103000, ch: 'naver' },
    { orderId: 'ORD-C026', items: ['UV Perfect 선크림'], at: ts(10,11,0), total: 25000, ch: 'oliveyoung' },
    { orderId: 'ORD-C027', items: ['Elvive 엑스트라 오일 샴푸'], at: ts(24,9,0), total: 15000, ch: 'coupang' },
  ],
  '조은서': [
    { orderId: 'ORD-C028', items: ['Lancôme Génifique 세럼'], at: ts(3,14,0), total: 158000, ch: 'amazon_jp' },
    { orderId: 'ORD-C029', items: ['Lancôme Absolue 크림'], at: ts(18,11,0), total: 280000, ch: 'naver' },
  ],
  '강현준': [
    { orderId: 'ORD-C030', items: ['Garnier 미셀라 워터','Men Expert'], at: ts(7,16,0), total: 44000, ch: 'gmarket' },
    { orderId: 'ORD-C031', items: ['Elvive 토탈 리페어 5'], at: ts(20,10,0), total: 15000, ch: 'coupang' },
  ],
  '임서아': [
    { orderId: 'ORD-C032', items: ['NYX Lip Lingerie XXL','Color Riche 립스틱'], at: ts(2,13,0), total: 34000, ch: 'oliveyoung' },
    { orderId: 'ORD-C033', items: ['True Match 파운데이션'], at: ts(9,15,0), total: 28000, ch: 'coupang' },
    { orderId: 'ORD-C034', items: ['Lash Paradise 마스카라'], at: ts(16,11,0), total: 22000, ch: 'oliveyoung' },
    { orderId: 'ORD-C035', items: ['Garnier 미셀라 워터'], at: ts(30,10,0), total: 12000, ch: '11st' },
  ],
  '오지훈': [
    { orderId: 'ORD-C036', items: ['Men Expert 하이드라 에너자이저','UV Perfect 선크림'], at: ts(4,10,0), total: 57000, ch: 'naver' },
    { orderId: 'ORD-C037', items: ['Elvive 엑스트라 오일 샴푸'], at: ts(15,14,0), total: 15000, ch: 'coupang' },
  ],
  '장다은': [
    { orderId: 'ORD-C038', items: ['Kérastase Elixir Ultime 오일'], at: ts(1,11,0), total: 52000, ch: 'naver' },
    { orderId: 'ORD-C039', items: ['Kérastase Resistance 샴푸'], at: ts(8,15,0), total: 42000, ch: 'shopify_global' },
    { orderId: 'ORD-C040', items: ['Lancôme Absolue 크림'], at: ts(21,10,0), total: 280000, ch: 'naver' },
  ],
  '배소윤': [
    { orderId: 'ORD-C041', items: ['Vichy Minéral 89 부스터','La Roche-Posay Effaclar'], at: ts(5,12,0), total: 70000, ch: 'oliveyoung' },
  ],
  '신태호': [
    { orderId: 'ORD-C042', items: ['Garnier 미셀라 워터'], at: ts(10,9,0), total: 12000, ch: 'gmarket' },
  ],
  '황지민': [
    { orderId: 'ORD-C043', items: ['Revitalift Filler 세럼','Revitalift Laser X3'], at: ts(0,11,0), total: 103000, ch: 'naver' },
    { orderId: 'ORD-C044', items: ['Age Perfect 세럼','UV Perfect 선크림'], at: ts(12,14,0), total: 90000, ch: 'coupang' },
    { orderId: 'ORD-C045', items: ['Lancôme Génifique 세럼'], at: ts(25,16,0), total: 158000, ch: 'naver' },
  ],
  '류시은': [
    { orderId: 'ORD-C046', items: ['YSL Rouge Pur Couture','Lancôme Teint Idole'], at: ts(2,14,0), total: 116000, ch: 'shopify_global' },
    { orderId: 'ORD-C047', items: ['Kérastase Elixir Ultime 오일'], at: ts(15,10,0), total: 52000, ch: 'naver' },
  ],
  '문재영': [
    { orderId: 'ORD-C048', items: ['Men Expert','Garnier 미셀라 워터','Elvive 샴푸'], at: ts(3,10,0), total: 59000, ch: 'coupang' },
    { orderId: 'ORD-C049', items: ['UV Perfect 선크림'], at: ts(17,15,0), total: 25000, ch: '11st' },
  ],
  '권나연': [
    { orderId: 'ORD-C050', items: ['True Match 파운데이션','Lash Paradise 마스카라','Color Riche 립스틱'], at: ts(1,13,0), total: 69000, ch: 'oliveyoung' },
    { orderId: 'ORD-C051', items: ['NYX Lip Lingerie XXL'], at: ts(8,11,0), total: 15000, ch: 'coupang' },
    { orderId: 'ORD-C052', items: ['Vichy Minéral 89 부스터'], at: ts(20,16,0), total: 38000, ch: 'oliveyoung' },
  ],
  '홍승현': [
    { orderId: 'ORD-C053', items: ['Lancôme Absolue 크림'], at: ts(6,11,0), total: 280000, ch: 'naver' },
    { orderId: 'ORD-C054', items: ['Lancôme Génifique 세럼'], at: ts(13,14,0), total: 158000, ch: 'amazon_jp' },
    { orderId: 'ORD-C055', items: ['YSL Rouge Pur Couture'], at: ts(22,10,0), total: 48000, ch: 'naver' },
    { orderId: 'ORD-C056', items: ['Kérastase Elixir Ultime 오일','Kérastase Resistance 샴푸'], at: ts(38,9,0), total: 94000, ch: 'shopify_global' },
  ],
};

