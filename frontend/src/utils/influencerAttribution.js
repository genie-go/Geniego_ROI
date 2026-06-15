// ══════════════════════════════════════════════════════════════════════
//  influencerAttribution.js — 인플루언서 귀속(Attribution) 엔진
//  ──────────────────────────────────────────────────────────────────────
//  목적: "이 인플루언서를 보고 실제로 얼마나 주문했는가"를 추정이 아닌
//        실제 주문 원장 매칭으로 산출한다.
//
//  핵심 원리(현실 마케팅과 동일):
//   - 인플루언서마다 고유 식별자(전용 쿠폰코드 / UTM source / 직접 링크)를 발급하고,
//     그 식별자가 찍힌 주문만 해당 인플루언서에 귀속(attribution)한다.
//   - 어필리에잇/화이트리스트 광고/전용쿠폰 협찬 → couponCode·utmSource로 직접 추적(tracked).
//   - 단순 홍보처럼 추적 식별자가 전혀 없는 경우 → 직접 귀속 불가(manual). 이때는
//     저장된 추정치(시드/사용자 입력)를 그대로 쓰되 method='manual'로 출처를 명시한다.
//
//  매출 캐논: 주문 원장과 동일하게 "취소 주문 제외, 반품 주문은 매출 포함"으로 집계
//  (GlobalDataContext.pnlStats / settlement 과 동일 기준). 취소 판정은 호출측에서
//  isCancelled 를 주입한다(순환참조 회피). 미주입 시 내부 폴백 토큰을 사용.
// ══════════════════════════════════════════════════════════════════════

export const ATTRIBUTION_VERSION = 1;

// 폴백 취소 토큰(주문 캐논과 동일 토큰 집합). 호출측이 isCancelled 를 주입하면 그쪽 우선.
const _FALLBACK_CANCELLED = new Set([
  'CancelDone', 'Cancel요청', 'cancelled', 'canceled', 'Canceled', 'CANCELLED', '주문취소', '취소완료',
]);
function _defaultIsCancelled(status) {
  return _FALLBACK_CANCELLED.has(String(status || ''));
}

/** 문자열 정규화(대소문자·공백 무시) — 쿠폰코드/UTM 매칭 안정화 */
function _norm(v) {
  return String(v == null ? '' : v).trim().toLowerCase();
}

/**
 * 한 주문이 어떤 식별자로 어느 인플루언서에 귀속되는지 판정.
 * 우선순위: 직접 influencerId > 쿠폰코드 > UTM source.
 * @returns {{ creatorId: string, signal: 'direct'|'coupon'|'utm' } | null}
 */
function matchOrderToCreator(order, index) {
  const a = (order && order.attribution) || {};
  // 1) 직접 식별자(링크/광고세트에 인플루언서 ID가 직접 박힌 경우)
  const direct = a.influencerId || a.creatorId;
  if (direct && index.byId.has(_norm(direct))) {
    return { creatorId: index.byId.get(_norm(direct)), signal: 'direct' };
  }
  // 2) 전용 쿠폰코드 (협찬·단순홍보에도 적용 가능한 가장 현실적 신호)
  const coupon = a.couponCode || order.couponCode;
  if (coupon && index.byCoupon.has(_norm(coupon))) {
    return { creatorId: index.byCoupon.get(_norm(coupon)), signal: 'coupon' };
  }
  // 3) UTM source (link-in-bio 등)
  const utm = a.utmSource || a.utm_source;
  if (utm && index.byUtm.has(_norm(utm))) {
    return { creatorId: index.byUtm.get(_norm(utm)), signal: 'utm' };
  }
  return null;
}

/** creators 배열로부터 매칭 인덱스(coupon/utm/id → creatorId) 구성 */
function buildIndex(creators) {
  const byId = new Map();
  const byCoupon = new Map();
  const byUtm = new Map();
  for (const c of creators || []) {
    if (!c || !c.id) continue;
    byId.set(_norm(c.id), c.id);
    const at = c.attribution || {};
    if (at.couponCode) byCoupon.set(_norm(at.couponCode), c.id);
    if (at.utmSource) byUtm.set(_norm(at.utmSource), c.id);
  }
  return { byId, byCoupon, byUtm };
}

/**
 * 주문 원장을 인플루언서별로 귀속 집계.
 * @param {Array} orders   주문 배열(각 항목에 attribution{couponCode|utmSource|influencerId} 또는 couponCode)
 * @param {Array} creators 크리에이터 배열(각 항목에 attribution{couponCode,utmSource})
 * @param {{ isCancelled?: (status:any)=>boolean }} [opts]
 * @returns {Map<string,{orders:number,revenue:number,signals:object,orderIds:string[]}>}
 */
export function deriveInfluencerAttribution(orders, creators, opts = {}) {
  const isCancelled = typeof opts.isCancelled === 'function' ? opts.isCancelled : _defaultIsCancelled;
  const index = buildIndex(creators);
  const out = new Map();

  for (const o of orders || []) {
    if (!o) continue;
    if (isCancelled(o.status)) continue;                 // 취소=매출/주문수 제외(주문 캐논 동일)
    const m = matchOrderToCreator(o, index);
    if (!m) continue;
    let agg = out.get(m.creatorId);
    if (!agg) { agg = { orders: 0, revenue: 0, signals: {}, orderIds: [] }; out.set(m.creatorId, agg); }
    agg.orders += 1;
    agg.revenue += Number(o.total) || 0;                 // 반품 주문도 매출 포함(취소만 제외)
    agg.signals[m.signal] = (agg.signals[m.signal] || 0) + 1;
    if (o.id) agg.orderIds.push(o.id);
  }
  return out;
}

/**
 * 추적(tracked) 가능한 크리에이터의 stats.orders/revenue 를 실제 귀속 산출값으로 대체하고,
 * 매칭 메타데이터를 부여한다. method='manual' 인 크리에이터는 저장값을 그대로 보존한다.
 *
 * - 다른 필드(contract/settle/content/identities…)는 절대 건드리지 않음 → 사용자 편집 보존.
 * - 추적 식별자가 있으나 매칭 주문이 0건이면 orders/revenue=0 으로 정직하게 반영(아직 발생 안 함).
 *
 * @param {Array} creators
 * @param {Array} orders
 * @param {{ isCancelled?: (status:any)=>boolean }} [opts]
 * @returns {Array} 새 creators 배열(불변 갱신)
 */
export function applyAttribution(creators, orders, opts = {}) {
  if (!Array.isArray(creators) || creators.length === 0) return creators;
  const agg = deriveInfluencerAttribution(orders, creators, opts);

  return creators.map((c) => {
    if (!c) return c;
    const at = c.attribution || {};
    const method = at.method || (at.couponCode || at.utmSource ? 'tracked' : 'manual');

    // 수동(추정) 크리에이터: 저장값 보존, 출처만 명시
    if (method !== 'tracked') {
      return { ...c, attribution: { ...at, method: 'manual', measured: false } };
    }

    // 추적 크리에이터: 실제 귀속 산출값으로 stats 대체
    const r = agg.get(c.id) || { orders: 0, revenue: 0, signals: {}, orderIds: [] };
    const dominantSignal = Object.keys(r.signals).sort((a, b) => r.signals[b] - r.signals[a])[0] || null;
    const prevStats = c.stats || {};
    return {
      ...c,
      stats: { ...prevStats, orders: r.orders, revenue: r.revenue },
      // 평탄 필드(DashInfluencer)도 동기화
      purchases: r.orders,
      revenue: r.revenue,
      attribution: {
        ...at,
        method: 'tracked',
        measured: true,
        matchedOrders: r.orders,
        matchedRevenue: r.revenue,
        signal: dominantSignal,          // 주된 매칭 신호(coupon/utm/direct)
        orderIds: r.orderIds,
      },
    };
  });
}

// ══════════════════════════════════════════════════════════════════════
//  활용 유형(Activation Type) — 인플루언서를 "어떻게" 활용했는가
//  ──────────────────────────────────────────────────────────────────────
//  유형마다 측정 방법과 비용 구조가 다르다:
//   - paid_amplification(원본영상 광고): 콘텐츠를 우리가 광고로 집행(화이트리스트) →
//       광고 플랫폼 전환 API 로 정밀 측정. 비용 = 미디어 집행비(adSpend) + 계약비.
//   - affiliate(어필리에잇): 성과형 계약 + 전용 추적링크/쿠폰 → 정밀 측정. 비용 = 성과 수수료.
//   - sponsored(협찬): 고정료/제품 제공. 전용 쿠폰 발급 시 정밀, 아니면 간접 추정.
//   - organic(단순 홍보/업로드): 추적 식별자 없음 → 매출 리프트·설문 등 간접 추정만 가능.
// ══════════════════════════════════════════════════════════════════════

export const ACTIVATION_META = {
  paid_amplification: { label: '원본영상 광고', color: '#6366f1', icon: '🎬', key: 'actPaidAmp' },
  affiliate:          { label: '어필리에이트',  color: '#22c55e', icon: '🔗', key: 'actAffiliate' },
  sponsored:          { label: '협찬',          color: '#a855f7', icon: '🎁', key: 'actSponsored' },
  organic:            { label: '단순 홍보',     color: '#94a3b8', icon: '📣', key: 'actOrganic' },
};

/**
 * 활용 유형 도출: 명시 필드(creator.activationType) 우선, 없으면 계약·광고권으로 추론.
 *  - whitelist(광고 집행권) 보유 → paid_amplification
 *  - 성과형 계약(perf) → affiliate
 *  - 고정/혼합 계약(flat/hybrid) → sponsored
 *  - 그 외 → organic
 */
export function deriveActivationType(creator) {
  const c = creator || {};
  if (c.activationType && ACTIVATION_META[c.activationType]) return c.activationType;
  const ct = c.contract || {};
  if (ct.whitelist) return 'paid_amplification';
  if (ct.type === 'perf') return 'affiliate';
  if (ct.type === 'flat' || ct.type === 'hybrid') return 'sponsored';
  return 'organic';
}

/**
 * 측정 가능성 등급: 활용 유형 + 실제 추적 식별자(쿠폰/UTM) 유무로 결정.
 *  - precise : 광고 전환 API 또는 전용 쿠폰/링크로 직접 귀속 가능
 *  - indirect: 추적 식별자 없음 → 매출 리프트·설문 등 간접 추정만
 * @returns {{ level:'precise'|'indirect', method:string, type:string }}
 */
export function measurability(creator) {
  const type = deriveActivationType(creator);
  const at = creator?.attribution || {};
  const tracked = (at.method || (at.couponCode || at.utmSource ? 'tracked' : 'manual')) === 'tracked';
  // 원본영상 광고/어필리에잇은 본질적으로 정밀(플랫폼 전환·성과링크). 협찬·단순홍보는 추적코드 유무에 의존.
  const level = (type === 'paid_amplification' || type === 'affiliate' || tracked) ? 'precise' : 'indirect';
  return { level, method: tracked ? 'tracked' : 'manual', type };
}

/** 인플루언서 비용 분해: 계약비(제작) vs 미디어 집행비(광고). "광고비"의 정의를 명확히 한다. */
export function costBreakdown(creator) {
  const c = creator || {};
  const ct = c.contract || {};
  const stats = c.stats || {};
  const revenue = Number(stats.revenue) || 0;
  const contractCost = (Number(ct.flatFee) || 0) + revenue * (Number(ct.perfRate) || 0); // 제작/계약비
  const mediaSpend = Number(stats.adSpend) || 0;                                          // 광고 집행비(원본영상 광고)
  const totalCost = contractCost + mediaSpend;
  return { contractCost, mediaSpend, totalCost, roi: totalCost > 0 ? revenue / totalCost : null };
}

// ══════════════════════════════════════════════════════════════════════
//  캠페인 목표(Objective) — "무엇을 성공으로 볼 것인가"
//  ──────────────────────────────────────────────────────────────────────
//  기업마다 인플루언서 활용 목표가 다르다. 같은 성과라도 목표에 따라 성공/실패 판정이 달라야 한다.
//   - awareness(인지도): 많은 사람에게 알려지는 것 → 도달·노출·참여가 성공(ROI 낮아도 무방).
//   - engagement(참여): 좋아요·댓글·공유·저장 등 상호작용이 성공.
//   - traffic(유입): 클릭·방문·조회로 트래픽을 만드는 것이 성공.
//   - conversion(전환·매출): 실제 주문·매출·ROI 가 성공(기존 ROI 등급 적용).
//  성과리포트·AI 점수의 "가중치"를 목표별로 바꿔, 목표에 맞는 성공 기준으로 평가한다.
// ══════════════════════════════════════════════════════════════════════

export const OBJECTIVE_META = {
  awareness:  { label: '인지도',    icon: '📡', color: '#06b6d4', key: 'objAwareness' },
  engagement: { label: '참여',      icon: '❤️', color: '#ec4899', key: 'objEngagement' },
  traffic:    { label: '유입',      icon: '🚪', color: '#f59e0b', key: 'objTraffic' },
  conversion: { label: '전환·매출', icon: '💳', color: '#22c55e', key: 'objConversion' },
};

// 목표별 평가 가중치(합=100). awareness 면 도달/참여·품질 비중↑, conversion 이면 ROI/전환 비중↑.
export const OBJECTIVE_WEIGHTS = {
  awareness:  { roi: 5,  conversion: 10, engagement: 35, quality: 30, reliability: 20 },
  engagement: { roi: 5,  conversion: 15, engagement: 45, quality: 20, reliability: 15 },
  traffic:    { roi: 15, conversion: 35, engagement: 25, quality: 15, reliability: 10 },
  conversion: { roi: 35, conversion: 30, engagement: 15, quality: 10, reliability: 10 },
};

/** 목표 도출: 명시 필드 우선, 없으면 활용 유형으로 기본값 추론. */
export function deriveObjective(creator) {
  const c = creator || {};
  if (c.objective && OBJECTIVE_META[c.objective]) return c.objective;
  const at = deriveActivationType(c);
  if (at === 'paid_amplification' || at === 'affiliate') return 'conversion';
  if (at === 'organic') return 'awareness';
  return 'engagement';
}

/**
 * 목표 기반 성과 점수(0~100). 각 지표를 0~1 로 정규화한 뒤 목표별 가중치로 합산한다.
 * → "이 인플루언서가 '그 목표 기준'으로 얼마나 성공했는가"를 한 숫자로 표현. AI 판정과 일관.
 */
export function computePerformanceScore(creator, objective) {
  const c = creator || {};
  const obj = objective || deriveObjective(c);
  const w = OBJECTIVE_WEIGHTS[obj] || OBJECTIVE_WEIGHTS.conversion;
  const s = c.stats || {};
  const cb = costBreakdown(c);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const stStatus = (c.settle && c.settle.status) || '';
  const norm = {
    roi: clamp((cb.roi || 0) / 10),                                           // ROI 10배=만점
    conversion: clamp((s.views > 0 ? s.orders / s.views : 0) / 0.01),         // 전환율 1%=만점
    engagement: clamp((Number(s.engagement) || 0) / 0.08),                    // 참여율 8%=만점
    quality: clamp(((c.content && c.content.length) || 0) / 5),               // 콘텐츠 5건=만점
    reliability: stStatus === 'paid' ? 1 : stStatus === 'overpaid' ? 0.7 : stStatus === 'partial' ? 0.5 : 0,
  };
  let score = 0;
  for (const k of Object.keys(w)) score += (norm[k] || 0) * w[k];
  return { objective: obj, score: Math.round(score), breakdown: norm, weights: w };
}

// ══════════════════════════════════════════════════════════════════════
//  채널별(메타·틱톡·유튜브) 성과 집계
//  ──────────────────────────────────────────────────────────────────────
//  인플루언서는 채널마다 강점이 다르다(메타에서 유명 / 틱톡에서 유명 / 유튜브에서 유명).
//  콘텐츠(content[].platform) 기준으로 채널별 성과를 분리 집계한다.
//   - views/engagement/conversion 은 채널 고유 신호로 정확.
//   - orders/revenue 는 콘텐츠 단위 값 합산(채널 단위 정밀 귀속은 UTM 채널 태그 도입 시 고도화 가능).
// ══════════════════════════════════════════════════════════════════════

export const PLATFORM_META = {
  youtube:   { label: 'YouTube',   icon: '▶',  color: '#FF0000' },
  instagram: { label: 'Instagram', icon: '📸', color: '#E1306C' }, // 메타(Instagram)
  tiktok:    { label: 'TikTok',    icon: '🎵', color: '#00C2BB' },
};

/** 채널별 성과 롤업. @returns {Array} 채널별 {platform,label,icon,color,creators,contents,views,orders,revenue,avgEng,convRate} */
export function channelBreakdown(creators) {
  const acc = {};
  for (const c of creators || []) {
    for (const ct of (c.content || [])) {
      const p = ct.platform;
      if (!p) continue;
      if (!acc[p]) acc[p] = { platform: p, creatorIds: new Set(), contents: 0, views: 0, orders: 0, revenue: 0, engSum: 0 };
      const a = acc[p];
      a.creatorIds.add(c.id);
      a.contents += 1;
      a.views += Number(ct.views) || 0;
      a.orders += Number(ct.orders) || 0;
      a.revenue += Number(ct.revenue) || 0;
      a.engSum += Number(ct.engRate) || 0;
    }
  }
  return Object.values(acc).map((a) => {
    const meta = PLATFORM_META[a.platform] || { label: a.platform, icon: '🌐', color: '#4f8ef7' };
    return {
      platform: a.platform, label: meta.label, icon: meta.icon, color: meta.color,
      creators: a.creatorIds.size, contents: a.contents,
      views: a.views, orders: a.orders, revenue: a.revenue,
      avgEng: a.contents > 0 ? a.engSum / a.contents : 0,
      convRate: a.views > 0 ? a.orders / a.views : 0,
    };
  }).sort((x, y) => y.revenue - x.revenue);
}

/** UI 표기용: 측정 방식 메타(라벨/색/아이콘). i18n 라벨은 호출측에서 t() 처리 권장. */
export function attributionBadge(creator) {
  const at = (creator && creator.attribution) || {};
  const method = at.method || (at.couponCode || at.utmSource ? 'tracked' : 'manual');
  if (method === 'tracked') {
    const sig = at.signal || (at.couponCode ? 'coupon' : at.utmSource ? 'utm' : 'direct');
    return { method: 'tracked', signal: sig, color: '#22c55e', icon: '🎯', key: 'attrTracked' };
  }
  return { method: 'manual', signal: null, color: '#94a3b8', icon: '✍️', key: 'attrManual' };
}
