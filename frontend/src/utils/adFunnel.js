/* ─────────────────────────────────────────────────────────────────────────
   adFunnel.js — 광고 캠페인 "목적(objective) → 퍼널 단계" 분류 SSOT (현 차수 신설)

   목적: 그동안 대시보드 채널 성과의 "도달 및 인지/트래픽/전환" 섹션은 캠페인을 목적으로
   분류하지 않고 채널 전체 합산값을 단계 라벨에 그대로 진열했다(전환·트래픽 캠페인 노출까지
   "도달 및 인지"에 섞여 해석 왜곡). 본 모듈은 매체별 campaign objective 값을 표준 퍼널 단계로
   매핑하고, 단계별로 "전체 합산 기준" 재계산(CPM/빈도)을 제공한다.

   ★분류 기준 = 광고 플랫폼 API 의 campaign objective 값(캠페인명 키워드가 아님).
   ★단계(STAGE): awareness(도달·인지) | engagement(참여) | traffic(트래픽) | conversion(전환).
   ───────────────────────────────────────────────────────────────────────── */

export const STAGES = ['awareness', 'engagement', 'traffic', 'conversion'];

export const STAGE_LABEL_KEY = {
  awareness:  'funnel.awareness',   // 도달 및 인지
  engagement: 'funnel.engagement',  // 참여
  traffic:    'funnel.traffic',     // 트래픽
  conversion: 'funnel.conversion',  // 전환
  other:      'funnel.other',       // 기타
};

/**
 * 매체별 campaign objective 값 → 표준 퍼널 단계 매핑표.
 * 키는 대문자 정규화된 objective 문자열. 매체가 달라도 같은 의미면 같은 단계로 귀속.
 * (Meta 구버전 + ODAX 신버전, Google, TikTok, Naver, Kakao 목적값 포함)
 */
const OBJECTIVE_STAGE = {
  // ── Meta (구버전) ──
  REACH: 'awareness', BRAND_AWARENESS: 'awareness',
  VIDEO_VIEWS: 'engagement', POST_ENGAGEMENT: 'engagement', PAGE_LIKES: 'engagement', EVENT_RESPONSES: 'engagement', MESSAGES: 'engagement',
  LINK_CLICKS: 'traffic', TRAFFIC: 'traffic',
  CONVERSIONS: 'conversion', CATALOG_SALES: 'conversion', PRODUCT_CATALOG_SALES: 'conversion', STORE_VISITS: 'conversion',
  LEAD_GENERATION: 'conversion', APP_INSTALLS: 'conversion',
  // ── Meta (ODAX 신버전, OUTCOME_*) ──
  OUTCOME_AWARENESS: 'awareness', OUTCOME_ENGAGEMENT: 'engagement', OUTCOME_TRAFFIC: 'traffic',
  OUTCOME_LEADS: 'conversion', OUTCOME_SALES: 'conversion', OUTCOME_APP_PROMOTION: 'conversion',
  SALES: 'conversion', AWARENESS: 'awareness', ENGAGEMENT: 'engagement', LEADS: 'conversion',
  // ── Google Ads ──
  DISPLAY: 'awareness', VIDEO: 'awareness', DEMAND_GEN: 'awareness', DISCOVERY: 'awareness',
  SEARCH: 'traffic', WEBSITE_TRAFFIC: 'traffic',
  PERFORMANCE_MAX: 'conversion', PMAX: 'conversion', SHOPPING: 'conversion', SALES_GOOGLE: 'conversion',
  // ── TikTok Ads ──
  TRAFFIC_TIKTOK: 'traffic', VIDEO_VIEWS_TIKTOK: 'engagement', PRODUCT_SALES: 'conversion',
  RF_REACH: 'awareness', COMMUNITY_INTERACTION: 'engagement', WEB_CONVERSIONS: 'conversion',
  // ── Naver ──
  POWER_LINK: 'traffic', SHOPPING_SEARCH: 'conversion', BRAND_SEARCH: 'awareness', NAVER_DISPLAY: 'awareness',
  // ── 한글 목적 라벨(데모/국내 매체 폴백) ──
  '도달': 'awareness', '인지': 'awareness', '브랜드인지': 'awareness', '브랜드검색': 'awareness', '디스플레이': 'awareness',
  '조회': 'engagement', '참여': 'engagement', '동영상조회': 'engagement',
  '트래픽': 'traffic', '방문': 'traffic', '검색': 'traffic', '파워링크': 'traffic',
  '전환': 'conversion', '구매': 'conversion', '판매': 'conversion', '쇼핑검색': 'conversion', '리드': 'conversion',
};

/**
 * (channel, objective) → 표준 퍼널 단계. 미등록 objective 는 'other'.
 * objective 가 비면 분류 불가 → 'other'(전체 합산엔 포함, 단계 박스엔 미포함).
 */
export function stageOf(objective, channel) {
  const key = String(objective || '').trim();
  if (key === '') return 'other';
  const up = key.toUpperCase();
  // 동명 충돌 회피: TikTok TRAFFIC/VIDEO_VIEWS 는 공용 키로 흡수됨(traffic/engagement 동일 의미라 무해).
  return OBJECTIVE_STAGE[up] || OBJECTIVE_STAGE[key] || 'other';
}

/** 캠페인 1건의 메트릭 안전 추출(필드명 편차 흡수). */
function pick(c) {
  return {
    objective:   c.objective ?? c.objective_type ?? c.obj ?? '',
    name:        c.name ?? c.campaign_name ?? '',
    impressions: Number(c.impressions ?? 0) || 0,
    reach:       Number(c.reach ?? 0) || 0,
    clicks:      Number(c.clicks ?? 0) || 0,
    spend:       Number(c.spend ?? c.cost ?? 0) || 0,
    conversions: Number(c.conversions ?? c.conv ?? 0) || 0,
    revenue:     Number(c.revenue ?? c.rev ?? 0) || 0,
  };
}

/** 단계별 합산 + 전체합산 기준 파생지표(CPM/빈도/CTR/CVR/CPC/CPA/ROAS) 계산. */
function rollup(list) {
  const s = { campaigns: [], objectives: new Set(), impressions: 0, reach: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 };
  for (const c of list) {
    s.impressions += c.impressions; s.reach += c.reach; s.clicks += c.clicks;
    s.spend += c.spend; s.conversions += c.conversions; s.revenue += c.revenue;
    s.campaigns.push({ name: c.name, objective: c.objective });
    if (c.objective) s.objectives.add(c.objective);
  }
  // ★전체 합산 기준 재계산(캠페인별 평균 아님).
  s.cpm  = s.impressions > 0 ? (s.spend / s.impressions) * 1000 : 0;               // 전체광고비/전체노출×1000
  s.frequency = s.reach > 0 ? s.impressions / s.reach : 0;                          // 전체노출/전체도달
  s.ctr  = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
  s.cvr  = s.clicks > 0 ? (s.conversions / s.clicks) * 100 : 0;
  s.cpc  = s.clicks > 0 ? s.spend / s.clicks : 0;
  s.cpa  = s.conversions > 0 ? s.spend / s.conversions : 0;
  s.roas = s.spend > 0 ? s.revenue / s.spend : 0;
  s.objectives = [...s.objectives];
  return s;
}

/**
 * 채널의 campaigns[] 를 단계별로 분류·합산.
 * @returns {{ byStage: {awareness,engagement,traffic,conversion,other}, total, hasData:boolean }}
 *   각 단계/total = rollup() 결과. hasData=campaigns 존재 여부(없으면 채널 누적 폴백 신호).
 */
export function classifyCampaigns(campaigns, channel) {
  const arr = Array.isArray(campaigns) ? campaigns.map(pick) : [];
  const groups = { awareness: [], engagement: [], traffic: [], conversion: [], other: [] };
  for (const c of arr) {
    const st = stageOf(c.objective, channel);
    (groups[st] || groups.other).push(c);
  }
  const byStage = {};
  for (const st of [...STAGES, 'other']) byStage[st] = rollup(groups[st]);
  return { byStage, total: rollup(arr), hasData: arr.length > 0 };
}
