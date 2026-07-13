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
  "system||sub_admin_mgmt",
  "system||db_admin",
  "system||pg_config",
  "system||system_monitor",
  "system||growth",
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
      { to: "/auto-marketing",      icon: "💎", labelKey: "gNav.autoMarketingLabel",      menuKey: "marketing_core" },
      { to: "/campaign-manager",    icon: "🎯", labelKey: "gNav.campaignManagerLabel",    menuKey: "marketing_core" },
      { to: "/journey-builder",     icon: "🗺️", labelKey: "gNav.journeyBuilderLabel",     menuKey: "marketing_advanced" },
      { to: "/onsite-cro",          icon: "🧪", labelKey: "gNav.onsiteCroLabel",          menuKey: "marketing_advanced" },
      { to: "/web-popup",           icon: "🎯", labelKey: "gNav.webPopupLabel",           menuKey: "marketing_advanced" }, // [246차 배치교정] CRM→온사이트 도구(사이트 전환)
    ],
  },
  /* 광고 성과 분석 */
  {
    key: "ad_analytics", icon: "📣", labelKey: "gNav.adAnalytics",
    items: [
      { to: "/marketing",               icon: "📣", labelKey: "gNav.adPerformanceLabel",      menuKey: "marketing_core" },
      { to: "/budget-tracker",          icon: "💰", labelKey: "gNav.budgetTrackerLabel",      menuKey: "marketing_advanced" },
      { to: "/account-performance",     icon: "🏢", labelKey: "gNav.accountPerformanceLabel", menuKey: "marketing_advanced" },
      { to: "/attribution",             icon: "🔗", labelKey: "gNav.attributionLabel",        menuKey: "marketing_advanced" },
      { to: "/marketing-mix",           icon: "📐", labelKey: "gNav.marketingMixLabel",      menuKey: "marketing_advanced" },
      { to: "/channel-kpi",             icon: "📊", labelKey: "gNav.channelKpiLabel",         menuKey: "marketing_advanced" },
      { to: "/graph-score",             icon: "🕸️", labelKey: "gNav.graphScoreLabel",         menuKey: "marketing_advanced" },
    ],
  },
  /* 고객 & 채널 (CRM/UGC 통합) */
  {
    key: "crm", icon: "👤", labelKey: "gNav.crmLabel",
    items: [
      { to: "/crm",             icon: "👥", labelKey: "gNav.crmMainLabel",         menuKey: "marketing_core" },
      { to: "/kakao-channel",   icon: "💬", labelKey: "gNav.kakaoChannelLabel",    menuKey: "marketing_core" },
      { to: "/email-marketing", icon: "✉️", labelKey: "gNav.emailMarketingLabel",  menuKey: "marketing_core" },
      { to: "/sms-marketing",   icon: "📱", labelKey: "gNav.smsMarketingLabel",    menuKey: "marketing_core" },
      { to: "/line-channel",    icon: "💚", labelKey: "gNav.lineChannelLabel",     menuKey: "marketing_advanced" },
      { to: "/whatsapp",        icon: "🟢", labelKey: "gNav.whatsappLabel",        menuKey: "marketing_advanced" },
      { to: "/instagram-dm",    icon: "📸", labelKey: "gNav.instagramDmLabel",     menuKey: "marketing_advanced" },
      { to: "/influencer",      icon: "🤝", labelKey: "gNav.influencerLabel",      menuKey: "marketing_advanced" },
      { to: "/content-calendar",icon: "📅", labelKey: "gNav.contentCalendarLabel", menuKey: "marketing_core" },
      { to: "/reviews-ugc",     icon: "⭐", labelKey: "gNav.reviewsUgcLabel",      menuKey: "marketing_core" },
    ],
  },
  /* 커머스 & 물류 */
  {
    key: "commerce", icon: "🛒", labelKey: "gNav.commerceLabel",
    items: [
      { to: "/omni-channel",    icon: "🌐", labelKey: "gNav.omniChannelLabel",      menuKey: "commerce_channel" },
      { to: "/catalog-sync",    icon: "📂", labelKey: "gNav.catalogLabel",          menuKey: "commerce_channel" },
      { to: "/live-commerce",   icon: "🎬", labelKey: "gNav.liveCommerceLabel",     menuKey: "commerce_live" },
      { to: "/order-hub",       icon: "📦", labelKey: "gNav.orderHubLabel",         menuKey: "commerce_channel" },
      { to: "/wms-manager",     icon: "🏭", labelKey: "gNav.wmsLabel",              menuKey: "ops" },
      { to: "/price-opt",       icon: "💡", labelKey: "gNav.priceOptLabel",         menuKey: "ops" },
      { to: "/supply-chain",    icon: "🔭", labelKey: "gNav.supplyChainLabel",      menuKey: "ops" },
      { to: "/demand-forecast", icon: "📈", labelKey: "gNav.demandForecastLabel",   menuKey: "ops" },
      { to: "/returns-portal",  icon: "🔄", labelKey: "gNav.returnsPortalLabel",    menuKey: "ops" },
      { to: "/operations",      icon: "⚡", labelKey: "gNav.operationsLabel",       menuKey: "system||operations" }, // [246차 배치교정] 멤버도구→커머스(쿠폰/프로모션=판매실행)
    ],
  },
  /* 인사이트 & 리포트 */
  {
    key: "analytics", icon: "📊", labelKey: "gNav.analytics",
    items: [
      { to: "/performance",    icon: "📊", labelKey: "gNav.performanceHubLabel", menuKey: "analytics||performance_hub" },
      // [240차] ReportBuilder 실구현 완료(차트·피벗·저장리포트·계산필드·P&L 머니경로 쿼리) → 사이드바 재노출(192차 숨김 해제).
      { to: "/report-builder", icon: "📑", labelKey: "gNav.reportBuilderLabel", menuKey: "analytics||report_builder" },
      { to: "/pnl",            icon: "🌊", labelKey: "gNav.pnlLabel",           menuKey: "analytics||pnl_analytics" },
      { to: "/ai-insights",    icon: "🤖", labelKey: "gNav.aiInsightsLabel",    menuKey: "analytics||ai_insights" },
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
      { to: "/pm",           icon: "🗂️", labelKey: "gNav.pmOverviewLabel",  menuKey: "ops" },
      { to: "/pm/portfolio", icon: "📁", labelKey: "gNav.pmPortfolioLabel", menuKey: "ops" },
      { to: "/pm/resources", icon: "👥", labelKey: "gNav.pmResourcesLabel", menuKey: "ops" },
    ],
  },
  /* 데이터 & 연동 (통합) */
  {
    key: "data", icon: "🔌", labelKey: "gNav.data",
    items: [
      { to: "/integration-hub",  icon: "🔗", labelKey: "gNav.integrationHubLabel", menuKey: "data||integration_hub" },
      { to: "/data-schema",      icon: "📋", labelKey: "gNav.dataSchemaLabel",     menuKey: "data||data_schema" },
      { to: "/data-trust",       icon: "🔬", labelKey: "gNav.dataTrustLabel",      menuKey: "data||data_trust" },
      // [281차 P2] 데이터 자산/소스 레지스트리(272차) — 라우트만 있고 진입점 전무해 도달불가였다.
      { to: "/data-assets",      icon: "🗃️", labelKey: "gNav.dataAssetsLabel",     menuKey: "data||data_schema" },
      { to: "/pixel-tracking",   icon: "🎯", labelKey: "gNav.pixelTracking", menuKey: "data||data_trust" },
      { to: "/data-product",     icon: "🗂️", labelKey: "gNav.dataProductLabel", menuKey: "analytics||data_product" }, // [246차 배치교정] 인사이트→데이터(데이터마트+SQL)
    ],
  },
  /* 재무 & 결산 */
  {
    key: "finance", icon: "💳", labelKey: "gNav.finance",
    items: [
      { to: "/settlements",    icon: "📋", labelKey: "gNav.settlementsLabel",    menuKey: "billing" },
      { to: "/reconciliation", icon: "💰", labelKey: "gNav.reconciliationLabel", menuKey: "billing" },
      { to: "/payment-methods",icon: "💳", labelKey: "gNav.paymentMethodsLabel", menuKey: "billing" },
      { to: "/app-pricing",    icon: "🧾", labelKey: "gNav.pricingLabel",        menuKey: "billing" },
    ],
  },
  /* 운영 & 지원 (일반) */
  {
    key: "member_tools", icon: "👥", labelKey: "gNav.memberTools",
    items: [
      { to: "/team-members",    icon: "🧑‍🤝‍🧑", labelKey: "gNav.memberComposeLabel", menuKey: "system||workspace" },
      { to: "/workspace",       icon: "👥", labelKey: "gNav.workspaceLabel",     menuKey: "system||workspace" },
      // [280차 P1] 대행사 접근 승인 진입점 — 종전엔 라우트만 있고 사이드바·링크가 전무해 클라이언트가
      //   승인 화면에 도달 불가 → 대행사 요청이 영원히 pending(대행사 멀티클라이언트 기능 end-to-end 사망).
      { to: "/agency-access",   icon: "🤝", labelKey: "gNav.agencyAccessLabel",  menuKey: "system||workspace" },
      // [257차 중복제거] /operations 는 246차 배치교정으로 커머스&물류 그룹(line 91)으로 이동됐으나 원본이
      //   본 그룹에 잔존해 사이드바에 같은 페이지 링크가 2번 노출됐다(동일 라우트·라벨·권한키). 커머스 그룹만 정본 유지.
      { to: "/case-study",      icon: "🏆", labelKey: "gNav.caseStudyLabel",     menuKey: "system||case_study" },
      { to: "/help",            icon: "📚", labelKey: "gNav.helpLabel",          menuKey: "system||help_center" },
      { to: "/feedback",        icon: "💬", labelKey: "gNav.feedbackLabel",      menuKey: "system||feedback" },
      { to: "/audit",           icon: "🧾", labelKey: "gNav.auditLogLabel",      menuKey: "billing" }, // [246차 배치교정] 재무→운영&지원(보안감사≠금융)
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
      { to: "/admin/growth",       icon: "🚀", labelKey: "gNav.growthCenterLabel", menuKey: "system||growth" },
      { to: "/admin/plan-pricing", icon: "💳", labelKey: "gNav.planPricingLabel",  menuKey: "system||plan_pricing" },
      { to: "/user-management",    icon: "👥", labelKey: "gNav.memberMgmtLabel",  menuKey: "system||user_management" },
      { to: "/admin/sub-admins",   icon: "👤", label: "하위 관리자 관리", labelKey: "gNav.subAdminMgmtLabel", menuKey: "system||sub_admin_mgmt" },
      // [281차 P2] 대행사 계정 발급(최고관리자) — 라우트만 있고 진입점 전무해 URL 직접입력 외 도달불가였다.
      { to: "/admin/agencies",     icon: "🤝", label: "대행사 계정 관리", labelKey: "gNav.agencyMgmtLabel", menuKey: "system||admin" },
      { to: "/admin/site-intro",   icon: "🏢", labelKey: "gNav.siteIntroLabel",   menuKey: "system||admin" },
      { to: "/admin/legal-docs",   icon: "📜", label: "법적 페이지", labelKey: "gNav.legalDocsLabel", menuKey: "system||admin" },
      { to: "/admin/menu-tree",    icon: "🗂", labelKey: "gNav.menuTreeLabel",     menuKey: "system||menu_tree" },
      { to: "/db-admin",           icon: "🗄️", labelKey: "gNav.dbSchemaLabel",     menuKey: "system||db_admin" },
      { to: "/pg-config",          icon: "💳", labelKey: "gNav.paymentPgLabel",    menuKey: "system||pg_config" },
      { to: "/system-monitor",     icon: "📡", labelKey: "gNav.systemMonitorLabel", menuKey: "system||system_monitor" },
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
