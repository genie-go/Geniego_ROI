/**
 * Sidebar manifest — 172차 분리.
 *
 * Sidebar.jsx 내부 inline 정의였던 MEMBER_MENU / ADMIN_MENU / ADMIN_ONLY_MENU_KEYS 를
 * 별도 manifest 모듈로 분리. PlanPricing 의 "🔐 메뉴 접근 권한" 트리 뷰가
 * 동일 데이터를 SSOT 로 사용한다. Sidebar.jsx 는 본 모듈을 import 하여 변경 없음.
 *
 * 구조:
 *   MEMBER_MENU = [
 *     { key, icon, labelKey, items: [{ to, icon, labelKey, menuKey }, ...] },
 *     ...
 *   ]
 *
 * - menuKey: backend plan_menu_access.menu_key 매핑 키 (다수 leaf 가 동일 menuKey 공유 가능)
 * - to: SPA route
 * - labelKey: i18n 키 (ko.js 의 "gNav.*")
 */

export const ADMIN_ONLY_MENU_KEYS = new Set([
  "system||admin",
  "system||user_management",
  "system||db_admin",
  "system||pg_config",
  "system||system_monitor",
]);

export const MEMBER_MENU = [
  /* 홈 */
  {
    key: "home", icon: "⬡", labelKey: "gNav.home",
    items: [
      { to: "/dashboard",  icon: "⬡", labelKey: "gNav.dashboardLabel",    menuKey: "home||dashboard" },
      { to: "/rollup",     icon: "🗂️", labelKey: "gNav.rollupLabel",        menuKey: "home||rollup" },
    ],
  },
  /* AI 전략 & 캠페인 */
  {
    key: "ai_marketing", icon: "🚀", labelKey: "gNav.aiMarketing",
    items: [
      { to: "/auto-marketing",      icon: "💎", labelKey: "gNav.autoMarketingLabel",      menuKey: "marketing" },
      { to: "/campaign-manager",    icon: "🎯", labelKey: "gNav.campaignManagerLabel",    menuKey: "marketing" },
      { to: "/journey-builder",     icon: "🗺️", labelKey: "gNav.journeyBuilderLabel",     menuKey: "marketing" },
    ],
  },
  /* 광고 성과 분석 */
  {
    key: "ad_analytics", icon: "📣", labelKey: "gNav.adAnalytics",
    items: [
      { to: "/marketing",               icon: "📣", labelKey: "gNav.adPerformanceLabel",      menuKey: "marketing" },
      { to: "/budget-tracker",          icon: "💰", labelKey: "gNav.budgetTrackerLabel",      menuKey: "marketing" },
      { to: "/account-performance",     icon: "🏢", labelKey: "gNav.accountPerformanceLabel", menuKey: "marketing" },
      { to: "/attribution",             icon: "🔗", labelKey: "gNav.attributionLabel",        menuKey: "marketing" },
      { to: "/channel-kpi",             icon: "📊", labelKey: "gNav.channelKpiLabel",         menuKey: "marketing" },
      { to: "/graph-score",             icon: "🕸️", labelKey: "gNav.graphScoreLabel",         menuKey: "marketing" },
    ],
  },
  /* 고객 & 채널 (CRM/UGC 통합) */
  {
    key: "crm", icon: "👤", labelKey: "gNav.crmLabel",
    items: [
      { to: "/crm",             icon: "👥", labelKey: "gNav.crmMainLabel",         menuKey: "marketing" },
      { to: "/kakao-channel",   icon: "💬", labelKey: "gNav.kakaoChannelLabel",    menuKey: "marketing" },
      { to: "/email-marketing", icon: "✉️", labelKey: "gNav.emailMarketingLabel",  menuKey: "marketing" },
      { to: "/sms-marketing",   icon: "📱", labelKey: "gNav.smsMarketingLabel",    menuKey: "marketing" },
      { to: "/influencer",      icon: "🤝", labelKey: "gNav.influencerLabel",      menuKey: "marketing" },
      { to: "/content-calendar",icon: "📅", labelKey: "gNav.contentCalendarLabel", menuKey: "marketing" },
      { to: "/reviews-ugc",     icon: "⭐", labelKey: "gNav.reviewsUgcLabel",      menuKey: "marketing" },
      { to: "/web-popup",       icon: "🎯", labelKey: "gNav.webPopupLabel",        menuKey: "marketing" },
    ],
  },
  /* 커머스 & 물류 */
  {
    key: "commerce", icon: "🛒", labelKey: "gNav.commerceLabel",
    items: [
      { to: "/omni-channel",    icon: "🌐", labelKey: "gNav.omniChannelLabel",      menuKey: "ops" },
      { to: "/catalog-sync",    icon: "📂", labelKey: "gNav.catalogLabel",          menuKey: "ops" },
      { to: "/order-hub",       icon: "📦", labelKey: "gNav.orderHubLabel",         menuKey: "ops" },
      { to: "/wms-manager",     icon: "🏭", labelKey: "gNav.wmsLabel",              menuKey: "ops" },
      { to: "/price-opt",       icon: "💡", labelKey: "gNav.priceOptLabel",         menuKey: "ops" },
      { to: "/supply-chain",    icon: "🔭", labelKey: "gNav.supplyChainLabel",      menuKey: "ops" },
      { to: "/returns-portal",  icon: "🔄", labelKey: "gNav.returnsPortalLabel",    menuKey: "ops" },
    ],
  },
  /* 인사이트 & 리포트 */
  {
    key: "analytics", icon: "📊", labelKey: "gNav.analytics",
    items: [
      { to: "/performance",    icon: "📊", labelKey: "gNav.performanceHubLabel", menuKey: "analytics||performance_hub" },
      { to: "/report-builder", icon: "📋", labelKey: "gNav.reportBuilderLabel", menuKey: "analytics||report_builder" },
      { to: "/pnl",            icon: "🌊", labelKey: "gNav.pnlLabel",           menuKey: "analytics||pnl_analytics" },
      { to: "/ai-insights",    icon: "🤖", labelKey: "gNav.aiInsightsLabel",    menuKey: "analytics||ai_insights" },
      { to: "/data-product",   icon: "🗂️", labelKey: "gNav.dataProductLabel",   menuKey: "analytics||data_product" },
    ],
  },
  /* 자동화 & 알람 (통합) */
  {
    key: "automation", icon: "🤖", labelKey: "gNav.automation",
    items: [
      { to: "/ai-rule-engine",    icon: "🧠", labelKey: "gNav.aiRuleEngineLabel",    menuKey: "automation||ai_rule_engine" },
      { to: "/approvals",         icon: "✅", labelKey: "gNav.approvalsLabel",       menuKey: "automation||approvals" },
      { to: "/writeback",         icon: "↩", labelKey: "gNav.writebackLabel",       menuKey: "automation||writeback" },
      { to: "/onboarding",        icon: "🗺️", labelKey: "gNav.onboardingLabel",      menuKey: "automation||onboarding" },
    ],
  },
  /* 프로젝트 관리 (PM-Core) */
  {
    key: "pm", icon: "🗂️", labelKey: "gNav.pmGroup",
    items: [
      { to: "/pm", icon: "🗂️", labelKey: "gNav.pmOverviewLabel", menuKey: "ops" },
    ],
  },
  /* 데이터 & 연동 (통합) */
  {
    key: "data", icon: "🔌", labelKey: "gNav.data",
    items: [
      { to: "/integration-hub",  icon: "🔗", labelKey: "gNav.integrationHubLabel", menuKey: "data||integration_hub" },
      { to: "/data-schema",      icon: "📋", labelKey: "gNav.dataSchemaLabel",     menuKey: "data||data_schema" },
      { to: "/data-trust",       icon: "🔬", labelKey: "gNav.dataTrustLabel",      menuKey: "data||data_trust" },
    ],
  },
  /* 재무 & 결산 */
  {
    key: "finance", icon: "💳", labelKey: "gNav.finance",
    items: [
      { to: "/settlements",    icon: "📋", labelKey: "gNav.settlementsLabel",    menuKey: "billing" },
      { to: "/reconciliation", icon: "💰", labelKey: "gNav.reconciliationLabel", menuKey: "billing" },
      { to: "/app-pricing",    icon: "💳", labelKey: "gNav.pricingLabel",        menuKey: "billing" },
      { to: "/audit",          icon: "🧾", labelKey: "gNav.auditLogLabel",       menuKey: "billing" },
    ],
  },
  /* 운영 & 지원 (일반) */
  {
    key: "member_tools", icon: "👥", labelKey: "gNav.memberTools",
    items: [
      { to: "/team-members",    icon: "🧑‍🤝‍🧑", labelKey: "gNav.memberComposeLabel", menuKey: "system||workspace" },
      { to: "/workspace",       icon: "👥", labelKey: "gNav.workspaceLabel",     menuKey: "system||workspace" },
      { to: "/operations",      icon: "⚡", labelKey: "gNav.operationsLabel",    menuKey: "system||operations" },
      { to: "/case-study",      icon: "🏆", labelKey: "gNav.caseStudyLabel",     menuKey: "system||case_study" },
      { to: "/help",            icon: "📚", labelKey: "gNav.helpLabel",          menuKey: "system||help_center" },
      { to: "/feedback",        icon: "💬", labelKey: "gNav.feedbackLabel",      menuKey: "system||feedback" },
      { to: "/developer-hub",   icon: "⚙️", labelKey: "gNav.developerHubLabel", menuKey: "system||developer_hub" },
    ],
  },
];

/* 플랫폼 Admin 전용 메뉴 */
export const ADMIN_MENU = [
  {
    key: "system",
    icon: "🔧",
    labelKey: "gNav.adminSystem",
    items: [
      { to: "/admin",              icon: "⚙",  labelKey: "gNav.platformEnvLabel",  menuKey: "system||admin" },
      { to: "/admin/plan-pricing", icon: "💳", labelKey: "gNav.planPricingLabel",  menuKey: "system||plan_pricing" },
      { to: "/admin/site-intro",   icon: "🏢", labelKey: "gNav.siteIntroLabel",   menuKey: "system||admin" },
      { to: "/admin/menu-tree",    icon: "🗂", labelKey: "gNav.menuTreeLabel",     menuKey: "system||menu_tree" },
      { to: "/db-admin",           icon: "🗄️", labelKey: "gNav.dbSchemaLabel",     menuKey: "system||db_admin" },
      { to: "/pg-config",          icon: "💳", labelKey: "gNav.paymentPgLabel",    menuKey: "system||pg_config" },
    ],
  },
];

/**
 * 헬퍼: 전체 manifest 에서 unique menuKey 집합 추출.
 * AdminPlans.menu_tree 와 정합 검증 용도 가능 (현재는 정보 제공).
 */
export function collectMenuKeys() {
  const set = new Set();
  for (const sec of [...MEMBER_MENU, ...ADMIN_MENU]) {
    for (const it of sec.items) {
      if (it.menuKey) set.add(it.menuKey);
    }
  }
  return set;
}

/**
 * 헬퍼: menuKey → [{ section, item }] 역인덱스.
 * PlanPricing 트리 뷰가 "이 menuKey 를 토글하면 어떤 leaf 들이 영향받는지" 안내할 때 사용.
 */
export function buildMenuKeyIndex() {
  const idx = new Map();
  for (const section of [...MEMBER_MENU, ...ADMIN_MENU]) {
    for (const item of section.items) {
      const k = item.menuKey;
      if (!k) continue;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push({ section, item });
    }
  }
  return idx;
}
