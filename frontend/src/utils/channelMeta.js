/* ─────────────────────────────────────────────────────────────────────────
   channelMeta.js — 채널 표시 메타(이름/아이콘/색상) 단일 리졸버 (현 차수 신설)

   목적: 그동안 채널 메타가 컴포넌트마다 하드코딩 맵(DashChannelKPI CH_META_DEFS 6개,
   DashMarketing CHANNEL_META 9개, channelRates CHANNEL_RATES 등)으로 흩어져 있어,
   "신규로 추가된 채널"이 일부 화면에서 메타 부재로 누락(KPI 카드 미생성)되거나
   깨진 표시(undefined.icon)가 났다. 본 리졸버로 어떤 채널 ID 든 항상 표시 메타를
   반환(미등록 채널은 안전한 기본값 생성) → 신규 채널이 전 화면에 정상 노출된다.

   ★원칙: 소비처는 "데이터에 실제 존재하는 채널 키"(channelBudgets/orders의 ch)를
   순회하고, 표시 메타만 본 리졸버로 해석한다(하드코딩 목록을 순회 기준으로 쓰지 말 것).
   ───────────────────────────────────────────────────────────────────────── */

// 알려진 채널 표시 메타(광고/판매/국내·글로벌). 별칭 키도 포함해 silent break 방지.
const BASE = {
  // 광고
  meta:          { name: 'Meta Ads',      icon: '📘', color: '#1877f2' },
  meta_ads:      { name: 'Meta Ads',      icon: '📘', color: '#1877f2' },
  google:        { name: 'Google Ads',    icon: '🔍', color: '#22c55e' },
  google_ads:    { name: 'Google Ads',    icon: '🔍', color: '#22c55e' },
  tiktok:        { name: 'TikTok',        icon: '🎵', color: '#a855f7' },
  tiktok_business:{ name: 'TikTok Ads',   icon: '🎵', color: '#a855f7' },
  naver_sa:      { name: 'Naver SA',      icon: '🟢', color: '#14d9b0' },
  kakao_moment:  { name: 'Kakao Moment',  icon: '💬', color: '#eab308' },
  coupang_ads:   { name: 'Coupang Ads',   icon: '🟠', color: '#E31937' },
  line_ads:      { name: 'LINE Ads',      icon: '💚', color: '#06c755' },
  instagram:     { name: 'Instagram',     icon: '📸', color: '#a855f7' },
  youtube:       { name: 'YouTube',       icon: '▶️', color: '#ef4444' },
  twitter:       { name: 'X (Twitter)',   icon: '🐦', color: '#14d9b0' },
  // [240차] 커넥터 확장 — 신규 광고 데이터소스(performance_metrics 단축코드 정합).
  snapchat:      { name: 'Snapchat Ads',  icon: '👻', color: '#facc15' },
  snapchat_ads:  { name: 'Snapchat Ads',  icon: '👻', color: '#facc15' },
  amazon_ads:    { name: 'Amazon Ads',    icon: '🛒', color: '#FF9900' },
  microsoft_ads: { name: 'Microsoft Ads', icon: '🪟', color: '#00A4EF' },
  x_ads:         { name: 'X (Twitter) Ads', icon: '𝕏', color: '#1D9BF0' },
  linkedin:      { name: 'LinkedIn Ads',  icon: '💼', color: '#0a66c2' },
  linkedin_ads:  { name: 'LinkedIn Ads',  icon: '💼', color: '#0a66c2' },
  criteo:        { name: 'Criteo',        icon: '🟧', color: '#f47521' },
  pinterest:     { name: 'Pinterest Ads', icon: '📌', color: '#e60023' },
  pinterest_ads: { name: 'Pinterest Ads', icon: '📌', color: '#e60023' },
  // 판매(국내)
  naver:         { name: 'Naver',         icon: '🟢', color: '#22c55e' },
  naver_smartstore:{ name: 'Naver SmartStore', icon: '🟢', color: '#22c55e' },
  coupang:       { name: 'Coupang',       icon: '🛒', color: '#E31937' },
  '11st':        { name: '11번가',         icon: '🔟', color: '#f43f5e' },
  st11:          { name: '11번가',         icon: '🔟', color: '#f43f5e' },
  gmarket:       { name: 'G마켓',          icon: '🟩', color: '#22c55e' },
  auction:       { name: '옥션',           icon: '🅰️', color: '#ef4444' },
  lotteon:       { name: '롯데온',          icon: '🛍️', color: '#e11d48' },
  oliveyoung:    { name: '올리브영',        icon: '🌿', color: '#84cc16' },
  cafe24:        { name: 'Cafe24',        icon: '🏪', color: '#2563eb' },
  kakao:         { name: 'Kakao',         icon: '💬', color: '#eab308' },
  kakao_commerce:{ name: 'Kakao Commerce',icon: '💬', color: '#eab308' },
  wemakeprice:   { name: '위메프',          icon: '🟣', color: '#7c3aed' },
  tmon:          { name: '티몬',           icon: '🎫', color: '#f59e0b' },
  interpark:     { name: '인터파크',        icon: '🎭', color: '#ec4899' },
  // 판매(글로벌)
  amazon:        { name: 'Amazon',        icon: '📦', color: '#f97316' },
  amazon_spapi:  { name: 'Amazon',        icon: '📦', color: '#f97316' },
  shopify:       { name: 'Shopify',       icon: '🛍️', color: '#16a34a' },
  ebay:          { name: 'eBay',          icon: '🏷️', color: '#0ea5e9' },
  tiktok_shop:   { name: 'TikTok Shop',   icon: '🎵', color: '#a855f7' },
  rakuten:       { name: 'Rakuten',       icon: '🇯🇵', color: '#dc2626' },
  yahoo_jp:      { name: 'Yahoo! JP',     icon: '🅨', color: '#7c3aed' },
  line:          { name: 'LINE',          icon: '💚', color: '#22c55e' },
  qoo10:         { name: 'Qoo10',         icon: '🔟', color: '#ef4444' },
  shopee:        { name: 'Shopee',        icon: '🛒', color: '#f97316' },
  lazada:        { name: 'Lazada',        icon: '🛒', color: '#2563eb' },
  woocommerce:   { name: 'WooCommerce',   icon: '🟪', color: '#7c3aed' },
  zalando:       { name: 'Zalando',       icon: '👗', color: '#f97316' },
  own_mall:      { name: '자사몰',          icon: '🏠', color: '#64748b' },
  own:           { name: '자사몰',          icon: '🏠', color: '#64748b' },
};

// 미등록 채널의 결정적 폴백 색상 팔레트(채널 ID 해시로 안정 선택).
const FALLBACK_COLORS = ['#4f8ef7', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14d9b0', '#eab308', '#ef4444', '#2563eb', '#84cc16'];
function hashIdx(s, mod) {
  let h = 0; const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}
/** 채널 ID → 보기 좋은 기본 이름(스네이크/하이픈 → Title Case). */
function prettify(id) {
  return String(id || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()).trim() || String(id || '');
}

/**
 * 어떤 채널 ID 든 표시 메타 반환. 미등록이면 안전한 기본값 생성(누락/깨짐 방지).
 * @param {string} id 채널 키
 * @param {object} [registry] 선택: 동적 레지스트리 맵 { [id]: {name,icon,color} } (백엔드 /v426/channels)
 * @returns {{id:string,name:string,icon:string,color:string,known:boolean}}
 */
export function channelMeta(id, registry) {
  const key = String(id || '').toLowerCase();
  const reg = registry && (registry[key] || registry[id]);
  const base = BASE[key];
  if (reg || base) {
    const m = { ...(base || {}), ...(reg || {}) };
    return { id, name: m.name || prettify(id), icon: m.icon || '📡', color: m.color || FALLBACK_COLORS[hashIdx(key, FALLBACK_COLORS.length)], known: true };
  }
  // 미등록 채널: 결정적 기본값(신규 채널도 즉시 표시 가능).
  return { id, name: prettify(id), icon: '📡', color: FALLBACK_COLORS[hashIdx(key, FALLBACK_COLORS.length)], known: false };
}

/**
 * 데이터에 등장하는 채널 키 집합(여러 소스 union) → 정렬된 ID 배열.
 * 신규 채널을 "데이터 주도"로 발견하기 위한 헬퍼(하드코딩 목록 순회 대체).
 */
export function unionChannelKeys(...sources) {
  const set = new Set();
  for (const src of sources) {
    if (!src) continue;
    if (Array.isArray(src)) src.forEach(k => k && set.add(String(k)));
    else if (typeof src === 'object') Object.keys(src).forEach(k => k && set.add(String(k)));
  }
  return [...set];
}
