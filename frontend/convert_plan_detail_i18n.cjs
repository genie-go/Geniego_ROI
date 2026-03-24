const fs = require('fs');

const filePath = 'src/pages/Pricing.jsx';
let c = fs.readFileSync(filePath, 'utf8');

// ────────────────────────────────────────────────────────────────────────────
// 1. Convert PLAN_DETAIL static constant → getPlanDetail(t) function
//    The function returns i18n-translated plan data using t() keys
// ────────────────────────────────────────────────────────────────────────────

const OLD_PLAN_DETAIL_START = `/* 플랜별 상세 서비스 설명 (대메뉴 기반) — v430 경쟁사 Analysis 기반 재설계 */
const PLAN_DETAIL = {`;

// Find the end of PLAN_DETAIL (}; after the enterprise block)
const planDetailStart = c.indexOf('/* 플랜별 상세 서비스 설명');
if (planDetailStart < 0) { console.log('❌ PLAN_DETAIL start not found'); process.exit(1); }

// Find the "};" that closes PLAN_DETAIL
let depth = 0;
let idx = c.indexOf('{', planDetailStart);
let planDetailEnd = -1;
for (let i = idx; i < c.length; i++) {
  if (c[i] === '{') depth++;
  else if (c[i] === '}') {
    depth--;
    if (depth === 0) {
      // Check if next non-whitespace is ';'
      let j = i + 1;
      while (j < c.length && (c[j] === '\r' || c[j] === '\n' || c[j] === ' ')) j++;
      if (c[j] === ';') {
        planDetailEnd = j + 1;
        break;
      }
    }
  }
}
console.log('PLAN_DETAIL block:', planDetailStart, '-', planDetailEnd);

// ────────────────────────────────────────────────────────────────────────────
// 2. Convert COMPARE_ROWS static constant → getCompareRows(t) function
// ────────────────────────────────────────────────────────────────────────────
const compareStart = c.indexOf('/* 플랜 비교 테이블 행');
if (compareStart < 0) { console.log('❌ COMPARE_ROWS start not found'); process.exit(1); }

const compareArrStart = c.indexOf('const COMPARE_ROWS = [', compareStart);
// Find "];
let compareEnd = -1;
{
  let depth2 = 0;
  let started = false;
  for (let i = compareArrStart; i < c.length; i++) {
    if (c[i] === '[') { depth2++; started = true; }
    else if (c[i] === ']') {
      depth2--;
      if (started && depth2 === 0) {
        let j = i + 1;
        while (j < c.length && (c[j] === '\r' || c[j] === '\n' || c[j] === ' ')) j++;
        if (c[j] === ';') { compareEnd = j + 1; break; }
      }
    }
  }
}
console.log('COMPARE_ROWS block:', compareStart, '-', compareEnd);

// ────────────────────────────────────────────────────────────────────────────
// 3. New PLAN_DETAIL as function
// ────────────────────────────────────────────────────────────────────────────
const NEW_PLAN_DETAIL = `/* 플랜별 상세 서비스 설명 — i18n 완전 적용 버전 */
function getPlanDetail(t) {
  return {
  free: {
    emoji: "🆓", color: "#8da4c4",
    tagline: t("pricingDetail.free_tagline"),
    headline: t("pricingDetail.free_headline"),
    desc: t("pricingDetail.free_desc"),
    sections: [
      { icon: "🏠", label: t("pricingDetail.free_s1"), items: [t("pricingDetail.free_s1i1"), t("pricingDetail.free_s1i2"), t("pricingDetail.free_s1i3")] },
      { icon: "📚", label: t("pricingDetail.free_s2"), items: ["FAQ", t("pricingDetail.free_s2i2"), t("pricingDetail.free_s2i3")] },
      { icon: "💳", label: t("pricingDetail.free_s3"), items: [t("pricingDetail.free_s3i1"), t("pricingDetail.free_s3i2")] },
    ],
    limits: [t("pricingDetail.free_l1"), t("pricingDetail.free_l2"), t("pricingDetail.free_l3")],
  },
  growth: {
    emoji: "📈", color: "#4f8ef7",
    tagline: t("pricingDetail.growth_tagline"),
    headline: t("pricingDetail.growth_headline"),
    desc: t("pricingDetail.growth_desc"),
    sections: [
      { icon: "🚀", label: t("pricingDetail.growth_s1"), items: [t("pricingDetail.growth_s1i1"), t("pricingDetail.growth_s1i2"), t("pricingDetail.growth_s1i3"), t("pricingDetail.growth_s1i4"), t("pricingDetail.growth_s1i5")] },
      { icon: "📣", label: t("pricingDetail.growth_s2"), items: [t("pricingDetail.growth_s2i1"), t("pricingDetail.growth_s2i2"), t("pricingDetail.growth_s2i3"), t("pricingDetail.growth_s2i4"), t("pricingDetail.growth_s2i5")] },
      { icon: "👥", label: t("pricingDetail.growth_s3"), items: [t("pricingDetail.growth_s3i1"), t("pricingDetail.growth_s3i2"), t("pricingDetail.growth_s3i3"), t("pricingDetail.growth_s3i4"), t("pricingDetail.growth_s3i5"), t("pricingDetail.growth_s3i6")] },
      { icon: "🛒", label: t("pricingDetail.growth_s4"), items: [t("pricingDetail.growth_s4i1"), t("pricingDetail.growth_s4i2"), t("pricingDetail.growth_s4i3"), t("pricingDetail.growth_s4i4"), t("pricingDetail.growth_s4i5"), t("pricingDetail.growth_s4i6")] },
      { icon: "📊", label: t("pricingDetail.growth_s5"), items: [t("pricingDetail.growth_s5i1"), t("pricingDetail.growth_s5i2"), t("pricingDetail.growth_s5i3"), t("pricingDetail.growth_s5i4")] },
      { icon: "💳", label: t("pricingDetail.growth_s6"), items: [t("pricingDetail.growth_s6i1"), t("pricingDetail.growth_s6i2"), t("pricingDetail.growth_s6i3"), t("pricingDetail.growth_s6i4")] },
      { icon: "🔌", label: t("pricingDetail.growth_s7"), items: [t("pricingDetail.growth_s7i1"), t("pricingDetail.growth_s7i2"), t("pricingDetail.growth_s7i3")] },
      { icon: "👥", label: t("pricingDetail.growth_s8"), items: [t("pricingDetail.growth_s8i1"), t("pricingDetail.growth_s8i2"), t("pricingDetail.growth_s8i3")] },
    ],
    limits: [t("pricingDetail.growth_l1"), t("pricingDetail.growth_l2"), t("pricingDetail.growth_l3"), t("pricingDetail.growth_l4"), t("pricingDetail.growth_l5"), t("pricingDetail.growth_l6")],
  },
  pro: {
    emoji: "🚀", color: "#a855f7",
    tagline: t("pricingDetail.pro_tagline"),
    headline: t("pricingDetail.pro_headline"),
    badge: t("pricingDetail.pro_badge"),
    desc: t("pricingDetail.pro_desc"),
    sections: [
      { icon: "🧠", label: t("pricingDetail.pro_s1"), items: [t("pricingDetail.pro_s1i1"), t("pricingDetail.pro_s1i2"), t("pricingDetail.pro_s1i3"), t("pricingDetail.pro_s1i4"), t("pricingDetail.pro_s1i5"), t("pricingDetail.pro_s1i6")] },
      { icon: "🗺", label: t("pricingDetail.pro_s2"), items: [t("pricingDetail.pro_s2i1"), t("pricingDetail.pro_s2i2"), t("pricingDetail.pro_s2i3"), t("pricingDetail.pro_s2i4")] },
      { icon: "🌏", label: t("pricingDetail.pro_s3"), items: [t("pricingDetail.pro_s3i1"), t("pricingDetail.pro_s3i2"), t("pricingDetail.pro_s3i3"), t("pricingDetail.pro_s3i4"), t("pricingDetail.pro_s3i5")] },
      { icon: "🏭", label: t("pricingDetail.pro_s4"), items: [t("pricingDetail.pro_s4i1"), t("pricingDetail.pro_s4i2"), t("pricingDetail.pro_s4i3"), t("pricingDetail.pro_s4i4")] },
      { icon: "🤖", label: t("pricingDetail.pro_s5"), items: [t("pricingDetail.pro_s5i1"), t("pricingDetail.pro_s5i2"), t("pricingDetail.pro_s5i3"), t("pricingDetail.pro_s5i4"), t("pricingDetail.pro_s5i5")] },
      { icon: "⭐", label: t("pricingDetail.pro_s6"), items: [t("pricingDetail.pro_s6i1"), t("pricingDetail.pro_s6i2"), t("pricingDetail.pro_s6i3"), t("pricingDetail.pro_s6i4")] },
      { icon: "🤝", label: t("pricingDetail.pro_s7"), items: [t("pricingDetail.pro_s7i1"), t("pricingDetail.pro_s7i2"), t("pricingDetail.pro_s7i3"), t("pricingDetail.pro_s7i4")] },
      { icon: "🎯", label: t("pricingDetail.pro_s8"), items: [t("pricingDetail.pro_s8i1"), t("pricingDetail.pro_s8i2"), t("pricingDetail.pro_s8i3"), t("pricingDetail.pro_s8i4"), t("pricingDetail.pro_s8i5")] },
      { icon: "📊", label: t("pricingDetail.pro_s9"), items: [t("pricingDetail.pro_s9i1"), t("pricingDetail.pro_s9i2"), t("pricingDetail.pro_s9i3"), t("pricingDetail.pro_s9i4")] },
      { icon: "💱", label: t("pricingDetail.pro_s10"), items: [t("pricingDetail.pro_s10i1"), t("pricingDetail.pro_s10i2"), t("pricingDetail.pro_s10i3"), t("pricingDetail.pro_s10i4")] },
    ],
    limits: [t("pricingDetail.pro_l1"), t("pricingDetail.pro_l2"), t("pricingDetail.pro_l3"), t("pricingDetail.pro_l4"), t("pricingDetail.pro_l5"), t("pricingDetail.pro_l6"), t("pricingDetail.pro_l7"), t("pricingDetail.pro_l8"), t("pricingDetail.pro_l9")],
  },
  enterprise: {
    emoji: "🌐", color: "#f59e0b",
    tagline: t("pricingDetail.ent_tagline"),
    headline: t("pricingDetail.ent_headline"),
    badge: t("pricingDetail.ent_badge"),
    desc: t("pricingDetail.ent_desc"),
    sections: [
      { icon: "↩", label: t("pricingDetail.ent_s1"), items: [t("pricingDetail.ent_s1i1"), t("pricingDetail.ent_s1i2"), t("pricingDetail.ent_s1i3"), t("pricingDetail.ent_s1i4")] },
      { icon: "🌏", label: t("pricingDetail.ent_s2"), items: [t("pricingDetail.ent_s2i1"), t("pricingDetail.ent_s2i2"), t("pricingDetail.ent_s2i3"), t("pricingDetail.ent_s2i4")] },
      { icon: "📊", label: t("pricingDetail.ent_s3"), items: [t("pricingDetail.ent_s3i1"), t("pricingDetail.ent_s3i2"), t("pricingDetail.ent_s3i3"), t("pricingDetail.ent_s3i4"), t("pricingDetail.ent_s3i5")] },
      { icon: "🗂", label: t("pricingDetail.ent_s4"), items: [t("pricingDetail.ent_s4i1"), t("pricingDetail.ent_s4i2"), t("pricingDetail.ent_s4i3"), t("pricingDetail.ent_s4i4"), t("pricingDetail.ent_s4i5"), t("pricingDetail.ent_s4i6")] },
      { icon: "🤝", label: t("pricingDetail.ent_s5"), items: [t("pricingDetail.ent_s5i1"), t("pricingDetail.ent_s5i2"), t("pricingDetail.ent_s5i3"), t("pricingDetail.ent_s5i4")] },
      { icon: "💡", label: t("pricingDetail.ent_s6"), items: [t("pricingDetail.ent_s6i1"), t("pricingDetail.ent_s6i2"), t("pricingDetail.ent_s6i3"), t("pricingDetail.ent_s6i4"), t("pricingDetail.ent_s6i5"), t("pricingDetail.ent_s6i6")] },
      { icon: "⚡", label: t("pricingDetail.ent_s7"), items: [t("pricingDetail.ent_s7i1"), t("pricingDetail.ent_s7i2"), t("pricingDetail.ent_s7i3"), t("pricingDetail.ent_s7i4"), t("pricingDetail.ent_s7i5"), t("pricingDetail.ent_s7i6")] },
      { icon: "🚀", label: t("pricingDetail.ent_s8"), items: [t("pricingDetail.ent_s8i1"), t("pricingDetail.ent_s8i2"), t("pricingDetail.ent_s8i3"), t("pricingDetail.ent_s8i4")] },
      { icon: "💎", label: t("pricingDetail.ent_s9"), items: [t("pricingDetail.ent_s9i1"), t("pricingDetail.ent_s9i2"), t("pricingDetail.ent_s9i3"), t("pricingDetail.ent_s9i4")] },
    ],
    limits: [],
  },
  };
}`;

// ────────────────────────────────────────────────────────────────────────────
// 4. New COMPARE_ROWS as function
// ────────────────────────────────────────────────────────────────────────────
const NEW_COMPARE_ROWS = `/* 플랜 비교 테이블 — i18n 완전 적용 */
function getCompareRows(t) {
  return [
  { label: t("cmpRow.r1"),  free: t("cmpVal.basic"), growth: "✓ "+t("cmpVal.realtime"), pro: "✓ "+t("cmpVal.all"), enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r2"),  free: "—", growth: "✓ "+t("cmpVal.domestic_core"), pro: "✓ All + A/B", enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r3"),  free: "—", growth: "—", pro: "✓", enterprise: "✓" },
  { label: t("cmpRow.r4"),  free: "—", growth: "—", pro: "✓", enterprise: "✓" },
  { label: t("cmpRow.r5"),  free: "—", growth: "—", pro: "✓ "+t("cmpVal.basic_auto"), enterprise: "✓ "+t("cmpVal.advanced_custom") },
  { label: t("cmpRow.r6"),  free: "—", growth: "✓ "+t("cmpVal.domestic"), pro: "✓ "+t("cmpVal.dom_global"), enterprise: "✓ + "+t("cmpVal.market_share") },
  { label: t("cmpRow.r7"),  free: "—", growth: "—", pro: "✓ Basic", enterprise: "✓ "+t("cmpVal.conv_path_all") },
  { label: t("cmpRow.r8"),  free: "—", growth: "—", pro: "✓ Basic", enterprise: "✓ + "+t("cmpVal.trend_forecast") },
  { label: t("cmpRow.r9"),  free: "—", growth: "✓ "+t("cmpVal.domestic"), pro: "✓ +WhatsApp/DM/LINE", enterprise: "✓ All + "+t("cmpVal.bizboard") },
  { label: t("cmpRow.r10"), free: "—", growth: "—", pro: "✓ AI+UGC", enterprise: "✓ + "+t("cmpVal.competitor_compare") },
  { label: t("cmpRow.r11"), free: "—", growth: "Coupang·Naver·Cafe24", pro: "✓ +Shopify·Amazon", enterprise: "✓ +Rakuten·Temu" },
  { label: t("cmpRow.r12"), free: "—", growth: "✓ Basic", pro: "✓ + "+t("cmpVal.location_barcode"), enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r13"), free: "—", growth: t("cmpVal.list_view"), pro: "✓ Add·Edit", enterprise: "✓ + Delete·"+t("cmpVal.contract") },
  { label: t("cmpRow.r14"), free: "—", growth: "—", pro: "—", enterprise: "✓ "+t("cmpVal.policy_review") },
  { label: t("cmpRow.r15"), free: "—", growth: "✓ Basic", pro: "✓ "+t("cmpVal.cohort_pl"), enterprise: "✓ "+t("cmpVal.all") },
  { label: t("cmpRow.r16"), free: "—", growth: t("cmpVal.notification_basic"), pro: "✓ "+t("cmpVal.rule_writeback"), enterprise: "✓ + "+t("cmpVal.instant_rollback") },
  { label: t("cmpRow.r17"), free: "—", growth: "—", pro: "✓ Basic", enterprise: "✓ "+t("cmpVal.partner_api") },
  { label: t("cmpRow.r18"), free: "—", growth: "—", pro: "✓ "+t("cmpVal.install_analysis"), enterprise: "✓ + "+t("cmpVal.server_side") },
  { label: t("cmpRow.r19"), free: "—", growth: t("cmpVal.domestic_ads"), pro: "✓ All + API·Pixel", enterprise: "✓ + Data Product" },
  { label: t("cmpRow.r20"), free: "—", growth: "—", pro: t("cmpVal.schema_quality_view"), enterprise: "✓ SLA·"+t("cmpVal.owner_streaming") },
  { label: t("cmpRow.r21"), free: "—", growth: "✓ "+t("cmpVal.custom_excel"), pro: "✓ + "+t("cmpVal.anomaly_detect"), enterprise: "✓ + "+t("cmpVal.auto_scheduled_share") },
  { label: t("cmpRow.r22"), free: "—", growth: "✓ "+t("cmpVal.manual"), pro: "✓ "+t("cmpVal.realtime_rate"), enterprise: "✓ "+t("cmpVal.realtime_rate") },
  { label: t("cmpRow.r23"), free: "—", growth: "—", pro: t("cmpVal.perf_view"), enterprise: "✓ DB·"+t("cmpVal.campaign_settle") },
  { label: t("cmpRow.r24"), free: "—", growth: "—", pro: "✓ Run·"+t("cmpVal.reprocess"), enterprise: "✓ + "+t("cmpVal.notification_send") },
  { label: t("cmpRow.r25"), free: "—", growth: t("cmpVal.own_history"), pro: t("cmpVal.own_history"), enterprise: "✓ All·Export" },
  { label: t("cmpRow.r26"), free: "—", growth: t("cmpVal.list_invite"), pro: "✓ + "+t("cmpVal.activity_history"), enterprise: "✓ "+t("cmpVal.rbac_role") },
  { label: t("cmpRow.r27"), free: "1", growth: "1~"+t("cmpVal.unlimited"), pro: "1~"+t("cmpVal.unlimited"), enterprise: t("cmpVal.unlimited") },
  { label: t("cmpRow.r28"), free: "FAQ", growth: t("cmpVal.chat_support"), pro: t("cmpVal.dedicated_manager"), enterprise: t("cmpVal.dedicated_sla") },
  ];
}`;

// ────────────────────────────────────────────────────────────────────────────
// 5. Apply replacement
// ────────────────────────────────────────────────────────────────────────────

// Replace PLAN_DETAIL block
const planDetailBlock = c.slice(planDetailStart, planDetailEnd);
c = c.replace(planDetailBlock, NEW_PLAN_DETAIL + '\n');
console.log('✅ Replaced PLAN_DETAIL with getPlanDetail(t)');

// Find new positions for COMPARE_ROWS after the replacement
const compareStart2 = c.indexOf('/* 플랜 비교 테이블 행');
const compareArrStart2 = c.indexOf('const COMPARE_ROWS = [', compareStart2);
let compareEnd2 = -1;
{
  let depth2 = 0;
  let started = false;
  for (let i = compareArrStart2; i < c.length; i++) {
    if (c[i] === '[') { depth2++; started = true; }
    else if (c[i] === ']') {
      depth2--;
      if (started && depth2 === 0) {
        let j = i + 1;
        while (j < c.length && (c[j] === '\r' || c[j] === '\n' || c[j] === ' ')) j++;
        if (c[j] === ';') { compareEnd2 = j + 1; break; }
      }
    }
  }
}
const compareBlock2 = c.slice(compareStart2, compareEnd2);
c = c.replace(compareBlock2, NEW_COMPARE_ROWS + '\n');
console.log('✅ Replaced COMPARE_ROWS with getCompareRows(t)');

// ────────────────────────────────────────────────────────────────────────────
// 6. Update all usages of PLAN_DETAIL → getPlanDetail(t) 
//    and COMPARE_ROWS → getCompareRows(t) inside components
// ────────────────────────────────────────────────────────────────────────────

// In PlanCard component: const detail = PLAN_DETAIL[plan.id] || {};
c = c.replace(
  '  const detail = PLAN_DETAIL[plan.id] || {};',
  '  const PLAN_DETAIL = getPlanDetail(t);\n  const detail = PLAN_DETAIL[plan.id] || {};'
);
console.log('✅ Updated PlanCard to use getPlanDetail(t)');

// In CompareTable: planIds.filter check and PLAN_DETAIL usage
c = c.replace(
  'function CompareTable({ plans }) {\n  const { t } = useTranslation();\n  const planIds',
  'function CompareTable({ plans }) {\n  const t = useT();\n  const PLAN_DETAIL = getPlanDetail(t);\n  const COMPARE_ROWS = getCompareRows(t);\n  const planIds'
);
// fix double useT in CompareTable if already there
c = c.replace(
  'function CompareTable({ plans }) {\n  const t = useT();\n  const t = useT();',
  'function CompareTable({ plans }) {\n  const t = useT();'
);
console.log('✅ Updated CompareTable to use getCompareRows(t) and getPlanDetail(t)');

// In main Pricing component: PLAN_DETAIL[user.plan] usage for currentPlanLabel
// Keep as is - we'll inject getPlanDetail in the main component too
const mainPricingFn = 'export default function Pricing() {\n  const { t } = useTranslation();\n  const [cycle';
const mainPricingFnFixed = 'export default function Pricing() {\n  const t = useT();\n  const [cycle';
if (c.includes(mainPricingFn)) {
  c = c.replace(mainPricingFn, mainPricingFnFixed);
  console.log('✅ Fixed main Pricing component useTranslation→useT');
}

// Add PLAN_DETAIL to main Pricing component after const t = useT();
c = c.replace(
  'export default function Pricing() {\n  const t = useT();\n  const [cycle, setCycle]',
  'export default function Pricing() {\n  const t = useT();\n  const PLAN_DETAIL = getPlanDetail(t);\n  const [cycle, setCycle]'
);
console.log('✅ Added PLAN_DETAIL to main Pricing component');

fs.writeFileSync(filePath, c, 'utf8');
console.log('\n✅ Pricing.jsx saved. Now need to add locale keys for pricingDetail and cmpRow/cmpVal.');
