const fs = require('fs');
const path = require('path');

// Multi-lang pricingDetail patches
// Each patch is inserted as top-level keys in the main const object

const buildPatch = (badgePopular, badgeTop, headlineGrowth, headlinePro, headlineEnt, taglineFree, taglineGrowth, taglinePro, taglineEnt) => `
  pricingDetail: {
    free_tagline:"${taglineFree}", free_headline:"Demo Experience Plan",
    free_desc:"Experience the full Geniego-ROI platform instantly upon signup.",
    free_s1:"Home Dashboard", free_s1i1:"KPI Widgets (Demo)", free_s1i2:"Quick Links", free_s1i3:"Onboarding Guide",
    free_s2:"My Team & Help", free_s2i2:"Video Tutorials", free_s2i3:"Release Notes",
    free_s3:"Subscription & Billing", free_s3i1:"View Current Plan", free_s3i2:"Upgrade Plan",
    free_l1:"No real-time data", free_l2:"No live channel integration", free_l3:"No save or download",
    growth_tagline:"${taglineGrowth}", growth_headline:"${headlineGrowth}",
    growth_desc:"Grow your revenue with domestic commerce channels and basic CRM automation.",
    growth_s1:"AI Marketing Automation (Core)", growth_s1i1:"AI Ad Creative Generation",
    growth_s1i2:"Campaign Setup·Manage·List·Report", growth_s1i3:"Content Calendar",
    growth_s1i4:"Budget Planner", growth_s1i5:"Alert Policy List & Logs",
    growth_s2:"Ad & Channel Analytics (Domestic)", growth_s2i1:"Ad Summary·Channel·Product Analysis",
    growth_s2i2:"ROAS Analysis", growth_s2i3:"Keyword Analysis",
    growth_s2i4:"Channel KPI (Impressions·CTR·CVR·CPA/CPC)", growth_s2i5:"ROAS Calculator",
    growth_s3:"Customer CRM (Basic)", growth_s3i1:"Customer DB·360° View·Tag Management",
    growth_s3i2:"RFM Analysis·Segment Builder·Message Send",
    growth_s3i3:"Email Campaign (Send·A/B·Performance·Schedule)",
    growth_s3i4:"Kakao Notification·FriendTalk·Stats",
    growth_s3i5:"SMS/LMS Campaign·Text Templates", growth_s3i6:"Exit Popup·Web Popup (Basic)",
    growth_s4:"Commerce & Logistics (Domestic)", growth_s4i1:"Coupang·Naver·Cafe24 Channel Integration",
    growth_s4i2:"Order Hub (All Orders·Claims·Returns·Shipping)",
    growth_s4i3:"Bulk Product Register·Catalog Sync·Price Rules",
    growth_s4i4:"Basic WMS (Stock·Alerts·Inbound·Outbound)",
    growth_s4i5:"Monthly Settlement·Shipping·Excel Export", growth_s4i6:"3PL Carrier List View",
    growth_s5:"Analytics & Performance", growth_s5i1:"Performance Summary·Channel·Product·Campaign",
    growth_s5i2:"P&L Overview", growth_s5i3:"AI Insight Feed", growth_s5i4:"Custom Report·Excel Export",
    growth_s6:"Settlement & Finance", growth_s6i1:"Settlement History·Channel·Excel",
    growth_s6i2:"Payment List·Excel", growth_s6i3:"Plan View·Billing History·Invoice",
    growth_s6i4:"License Activation·Status",
    growth_s7:"Channel & Data Integration (Domestic)",
    growth_s7i1:"Meta·Google·TikTok·Naver·Kakao Ad Integration",
    growth_s7i2:"Coupang Connector", growth_s7i3:"Currency Selection (KRW/USD/JPY/EUR Global)",
    growth_s8:"Team Management", growth_s8i1:"Team Member List·Invite",
    growth_s8i2:"My Activity History", growth_s8i3:"Support Ticket",
    growth_l1:"AI Forecast (Churn·LTV) — Pro+", growth_l2:"Customer Journey Builder — Pro+",
    growth_l3:"Global Channels (WhatsApp·LINE·DM) — Pro+",
    growth_l4:"AI Rule Engine — Pro+", growth_l5:"1st-Party Pixel·API Keys — Pro+",
    growth_l6:"SmartConnect ERP Integration — Pro+",
    pro_tagline:"${taglinePro}", pro_headline:"${headlinePro}", pro_badge:"${badgePopular}",
    pro_desc:"Growth All + AI Forecast·Journey Builder·Global Channels·Rule Engine·SmartConnect·1st-Party Pixel·Advanced BI.",
    pro_s1:"AI Forecast Engine (New)", pro_s1i1:"Churn·LTV·Purchase Probability Forecast",
    pro_s1i2:"Graph Scoring", pro_s1i3:"Next Best Action Recommendation",
    pro_s1i4:"Product Recommendation AI", pro_s1i5:"AI Ad Insights",
    pro_s1i6:"AI Segment (VIP·Churn Risk·Potential VIP Auto-classify)",
    pro_s2:"Customer Journey Builder (New)", pro_s2i1:"Journey Canvas (Drag&Drop)",
    pro_s2i2:"Trigger Setup·Action Node Management",
    pro_s2i3:"Journey Performance Stats Analysis", pro_s2i4:"A/B Test (Email·Popup)",
    pro_s3:"Global Channel All (New)", pro_s3i1:"Shopify·Amazon·LINE Ads Integration",
    pro_s3i2:"WhatsApp Broadcast·Automation",
    pro_s3i3:"Instagram DM·Facebook DM·DM Campaign",
    pro_s3i4:"LINE Message Campaign·Statistics", pro_s3i5:"Popup A/B Test·Trigger Setup",
    pro_s4:"Advanced WMS + Commerce Expansion",
    pro_s4i1:"Stock Adjustment·Location Mgmt·Barcode Integration",
    pro_s4i2:"Monthly Settlement Integration·Tax Invoice·Payment Approval",
    pro_s4i3:"3PL Add·Edit", pro_s4i4:"Collection Log Basic View",
    pro_s5:"AI Rule Engine & Automation (New)",
    pro_s5i1:"AI Policy Setup·Rule List·Test", pro_s5i2:"Alert Evaluation Model",
    pro_s5i3:"Action Preset Management", pro_s5i4:"Writeback Setup·Logs",
    pro_s5i5:"Approval Decision Automation",
    pro_s6:"Review & UGC Analytics (New)",
    pro_s6i1:"Channel Review Collection·Sentiment Analysis",
    pro_s6i2:"AI Auto-Reply Draft Generation",
    pro_s6i3:"UGC (Instagram·YouTube) Performance Analysis", pro_s6i4:"Keyword Analysis",
    pro_s7:"SmartConnect Hub (New)", pro_s7i1:"ERP·SCM·3PL Basic Integration Setup",
    pro_s7i2:"REST API / Webhook / SFTP Integration",
    pro_s7i3:"Field Mapping Setup", pro_s7i4:"Basic Sync Log View",
    pro_s8:"1st-Party Pixel + Data", pro_s8i1:"Pixel Code Install·Verification",
    pro_s8i2:"Real-time Event Stream View",
    pro_s8i3:"Attribution Analysis (Touch Model·ROAS)",
    pro_s8i4:"Event Collection·Data Schema·Mapping",
    pro_s8i5:"API Key·Webhook·OAuth Integration",
    pro_s9:"Advanced Analytics & BI", pro_s9i1:"Cohort Analysis",
    pro_s9i2:"P&L by Channel·Product·Trend",
    pro_s9i3:"Anomaly Detection·Competitor AI Analysis",
    pro_s9i4:"Influencer Performance View",
    pro_s10:"Real-time FX + Team Mgmt",
    pro_s10i1:"Real-time Exchange Rate (Global Currency)",
    pro_s10i2:"Team Activity Audit",
    pro_s10i3:"System Status·API Monitoring",
    pro_s10i4:"Batch Job Run·Reprocess",
    pro_l1:"Writeback Instant Rollback — Enterprise",
    pro_l2:"Amazon Policy·Review Mgmt — Enterprise",
    pro_l3:"Market Share·Trend AI — Enterprise",
    pro_l4:"Data Product SLA·Governance — Enterprise",
    pro_l5:"SmartConnect Partner API Bidirectional — Enterprise",
    pro_l6:"Influencer DB·Campaign Execution — Enterprise",
    pro_l7:"Audit Log Full Export — Enterprise",
    pro_l8:"Auto Report·Scheduled Send — Enterprise",
    pro_l9:"API Data Streaming Export — Enterprise",
    ent_tagline:"${taglineEnt}", ent_headline:"${headlineEnt}", ent_badge:"${badgeTop}",
    ent_desc:"Pro All + Instant Rollback·Amazon Policy·Market Share·Data Governance·SmartConnect Partner API·Influencer DB·Full Audit·Auto Reports.",
    ent_s1:"Writeback Instant Rollback (New)", ent_s1i1:"Writeback Setup·Logs",
    ent_s1i2:"Instant Rollback (Immediate Error Recovery)",
    ent_s1i3:"Multi-Brand Auto Execution", ent_s1i4:"Full Rollback History View",
    ent_s2:"Amazon Advanced Operations (New)", ent_s2i1:"Amazon Account Health Monitor",
    ent_s2i2:"Policy Compliance Management", ent_s2i3:"Full Review Monitoring",
    ent_s2i4:"Listing Quality Audit",
    ent_s3:"Market Intelligence (New)", ent_s3i1:"Market Share Analysis",
    ent_s3i2:"Competitor Ad Tracking (AI)", ent_s3i3:"Trend AI Forecast Model",
    ent_s3i4:"Channel Attribution All Models", ent_s3i5:"Conversion Path Analysis",
    ent_s4:"Data Product Governance (New)",
    ent_s4i1:"Data Product Schema·Quality Metrics",
    ent_s4i2:"SLA Management·Owner Assignment",
    ent_s4i3:"API-based Data Streaming Export",
    ent_s4i4:"Event Normalization Full Mgmt",
    ent_s4i5:"OAuth Partner Management", ent_s4i6:"Advanced Data Mapping",
    ent_s5:"SmartConnect Partner API (New)",
    ent_s5i1:"Partner-level Bidirectional Real-time Integration",
    ent_s5i2:"Full Real-time Sync Logs",
    ent_s5i3:"ERP·SCM·WMS Full Integration",
    ent_s5i4:"Custom Webhook Advanced Setup",
    ent_s6:"Advanced Marketing (New)",
    ent_s6i1:"Full Influencer DB·Campaign Execution·Settlement",
    ent_s6i2:"Kakao Bizboard (Large-scale Ads)",
    ent_s6i3:"WhatsApp Advanced Setup (Channel API)",
    ent_s6i4:"LINE Channel Advanced Setup",
    ent_s6i5:"AI Segment Advanced (Custom Criteria)",
    ent_s6i6:"Competitor Review Comparison Analysis",
    ent_s7:"Operations & Governance All (New)",
    ent_s7i1:"Ops Hub Alert Send (Admin Notice)",
    ent_s7i2:"3PL Delete·Contract Management",
    ent_s7i3:"Full Audit Log·CSV Export",
    ent_s7i4:"System Monitor Alert Setup",
    ent_s7i5:"Auto Report Generate·Scheduled Send",
    ent_s7i6:"Dashboard External Share·Embed",
    ent_s8:"Pro All Included + Unlimited",
    ent_s8i1:"All Pro Plan Features Included",
    ent_s8i2:"Unlimited Accounts·Users·Team Members",
    ent_s8i3:"Priority Support SLA",
    ent_s8i4:"Dedicated Onboarding Consulting·Annual Training",
    ent_s9:"Custom & Dedicated Services",
    ent_s9i1:"Custom Dashboard Configuration",
    ent_s9i2:"Dedicated Manager Assignment",
    ent_s9i3:"Annual Contract-based Custom Discount",
    ent_s9i4:"Custom Training·Workshop",
  },
  cmpRow: {
    r1:"Home Dashboard", r2:"AI Ad Creative & Campaign Mgmt",
    r3:"AI Forecast (Churn·LTV·Purchase Prob.)",
    r4:"Customer Journey Builder", r5:"AI Segment",
    r6:"Ad & Channel Analytics (ROAS·KPI)",
    r7:"Attribution Analysis (Touch Model)", r8:"Competitor AI Analysis",
    r9:"Customer CRM (Email/Kakao/SMS)",
    r10:"Review & UGC Analytics", r11:"Commerce Channels",
    r12:"WMS (Stock·In/Out)",
    r13:"3PL Management", r14:"Amazon Advanced Operations",
    r15:"Analytics & Performance (Cohort·P&L)",
    r16:"AI Rule Engine & Automation", r17:"SmartConnect (ERP·SCM)",
    r18:"1st-Party Pixel",
    r19:"Data Pipeline & API", r20:"Data Product Governance",
    r21:"BI Reports", r22:"Currency Selection (Global)",
    r23:"Influencer Management", r24:"Ops Hub (Batch·Reprocess)",
    r25:"Audit Log", r26:"Team Management (RBAC)",
    r27:"Account Count", r28:"Support Type",
  },
  cmpVal: {
    all:"All", basic:"Basic", realtime:"Real-time", domestic_core:"Domestic Core",
    domestic:"Domestic", dom_global:"Domestic+Global", market_share:"Market Share",
    basic_auto:"Basic Auto-classify", advanced_custom:"Advanced Custom",
    conv_path_all:"Conv. Path All", trend_forecast:"Trend Forecast",
    bizboard:"Bizboard", competitor_compare:"Competitor Compare",
    location_barcode:"Location & Barcode", list_view:"List View",
    contract:"Contract", policy_review:"Policy·Review·Listing",
    cohort_pl:"Cohort·P&L All", notification_basic:"Notification Basic",
    rule_writeback:"Rule Engine·Writeback", instant_rollback:"Instant Rollback",
    partner_api:"Partner API Bidirectional", install_analysis:"Install & Analysis",
    server_side:"Server-side", domestic_ads:"Domestic Ad Integration",
    schema_quality_view:"Schema·Quality View", owner_streaming:"Owner·Streaming",
    custom_excel:"Custom·Excel", anomaly_detect:"Anomaly Detection",
    auto_scheduled_share:"Auto·Scheduled·Share", manual:"Manual",
    realtime_rate:"Real-time Rate", perf_view:"Performance View",
    campaign_settle:"Campaign·Settlement", reprocess:"Reprocess",
    notification_send:"Notification Send", own_history:"Own History",
    list_invite:"List·Invite", activity_history:"Activity History",
    rbac_role:"RBAC Role Settings", unlimited:"Unlimited",
    chat_support:"Chat Support", dedicated_manager:"Dedicated Manager",
    dedicated_sla:"Dedicated + SLA",
  },`;

// Per language overrides
const LANG_OVERRIDES = {
  ko: ['인기', '최고사양', '마케팅 성장 플랜', 'AI 자동화 플랜', '전체 무제한 플랜',
       'Free로 시작, 플랫폼 탐색', '성장기 중소 셀러·브랜드', '전문 이커머스 브랜드·에이전시', '대형 이커머스·에이전시·그룹사'],
  en: ['Popular', 'Top Tier', 'Marketing Growth Plan', 'AI Automation Plan', 'Unlimited Everything Plan',
       'Start Free, Explore Platform', 'Growing SMB Sellers & Brands', 'Professional E-commerce Brands & Agencies', 'Large E-commerce·Agency·Group'],
  ja: ['人気', '最高仕様', 'マーケティング成長プラン', 'AI自動化プラン', '全て無制限プラン',
       '無料で始める、プラットフォーム探索', '成長期の中小セラー・ブランド', 'プロECブランド・エージェンシー', '大型EC・エージェンシー・グループ'],
  zh: ['热门', '顶级', '营销增长方案', 'AI自动化方案', '无限一切方案',
       '免费开始，探索平台', '成长型中小卖家·品牌', '专业电商品牌·代理商', '大型电商·代理商·集团'],
  de: ['Beliebt', 'Top-Tier', 'Marketing-Wachstumsplan', 'KI-Automatisierungsplan', 'Alles Unbegrenzt Plan',
       'Kostenlos starten, Plattform erkunden', 'Wachsende KMU-Verkäufer & Marken', 'Professionelle E-Commerce-Marken & Agenturen', 'Großes E-Commerce·Agentur·Konzern'],
  th: ['ยอดนิยม', 'สูงสุด', 'Marketing Growth Plan', 'AI Automation Plan', 'Unlimited Everything Plan',
       'Start Free, Explore Platform', 'Growing SMB Sellers & Brands', 'Professional E-commerce Brands', 'Large E-commerce·Agency·Group'],
  vi: ['Phổ biến', 'Cao cấp', 'Marketing Growth Plan', 'AI Automation Plan', 'Unlimited Everything Plan',
       'Start Free, Explore Platform', 'Growing SMB Sellers & Brands', 'Professional E-commerce Brands', 'Large E-commerce·Agency·Group'],
  id: ['Populer', 'Premium', 'Marketing Growth Plan', 'AI Automation Plan', 'Unlimited Everything Plan',
       'Start Free, Explore Platform', 'Growing SMB Sellers & Brands', 'Professional E-commerce Brands', 'Large E-commerce·Agency·Group'],
  'zh-TW': ['熱門', '頂級', '行銷成長方案', 'AI自動化方案', '無限一切方案',
             '免費開始，探索平台', '成長型中小賣家·品牌', '專業電商品牌·代理商', '大型電商·代理商·集團'],
};

const LOCALE_FILES = {
  ko: 'src/i18n/locales/ko.js',
  en: 'src/i18n/locales/en.js',
  ja: 'src/i18n/locales/ja.js',
  zh: 'src/i18n/locales/zh.js',
  de: 'src/i18n/locales/de.js',
  th: 'src/i18n/locales/th.js',
  vi: 'src/i18n/locales/vi.js',
  id: 'src/i18n/locales/id.js',
  'zh-TW': 'src/i18n/locales/zh-TW.js',
};

for (const [lang, fp] of Object.entries(LOCALE_FILES)) {
  if (!fs.existsSync(fp)) continue;
  let c = fs.readFileSync(fp, 'utf8');

  if (c.includes('pricingDetail:') || c.includes('pricingDetail :')) {
    console.log(`⏭ ${lang}: already has pricingDetail`);
    continue;
  }

  // Find the FIRST "};" that's at column 0 (not indented)
  // This closes the main const object
  const lines = c.split('\n');
  const mainCloseIdx = lines.findIndex(l => l === '};');
  
  if (mainCloseIdx < 0) {
    console.log(`⚠ ${lang}: no main }; found`);
    continue;
  }

  const overrides = LANG_OVERRIDES[lang] || LANG_OVERRIDES.en;
  const patch = buildPatch(...overrides);

  // Insert patch BEFORE the main closing };
  const newLines = [
    ...lines.slice(0, mainCloseIdx),
    patch,
    ...lines.slice(mainCloseIdx),
  ];
  
  const newContent = newLines.join('\n');
  fs.writeFileSync(fp, newContent, 'utf8');
  console.log(`✅ ${lang}: inserted at line ${mainCloseIdx}`);
}

console.log('\n✅ All done!');
