// 172차 PHASE 2-D 보강 — sidebar manifest + 서브탭 정의 → menu_tree 확장 INSERT 생성
// 사용: node docs/cc-tools/gen_menu_tree_extended_172.cjs > /tmp/menu_tree_extended.sql

const fs = require('fs');

// sidebarManifest.js 인라인 (require 가 ESM 으로 안 됨)
const MEMBER_MENU = [
  { key: 'home', icon: '⬡', labelKey: 'gNav.home', items: [
    { to: '/dashboard',  menuKey: 'home||dashboard' },
    { to: '/rollup',     menuKey: 'home||rollup' },
  ]},
  { key: 'ai_marketing', icon: '🚀', labelKey: 'gNav.aiMarketing', items: [
    { to: '/auto-marketing',   menuKey: 'marketing' },
    { to: '/campaign-manager', menuKey: 'marketing' },
    { to: '/journey-builder',  menuKey: 'marketing' },
  ]},
  { key: 'ad_analytics', icon: '📣', labelKey: 'gNav.adAnalytics', items: [
    { to: '/marketing',           menuKey: 'marketing' },
    { to: '/budget-tracker',      menuKey: 'marketing' },
    { to: '/account-performance', menuKey: 'marketing' },
    { to: '/attribution',         menuKey: 'marketing' },
    { to: '/channel-kpi',         menuKey: 'marketing' },
    { to: '/graph-score',         menuKey: 'marketing' },
  ]},
  { key: 'crm', icon: '👤', labelKey: 'gNav.crmLabel', items: [
    { to: '/crm',             menuKey: 'marketing' },
    { to: '/kakao-channel',   menuKey: 'marketing' },
    { to: '/email-marketing', menuKey: 'marketing' },
    { to: '/sms-marketing',   menuKey: 'marketing' },
    { to: '/influencer',      menuKey: 'marketing' },
    { to: '/content-calendar',menuKey: 'marketing' },
    { to: '/reviews-ugc',     menuKey: 'marketing' },
    { to: '/web-popup',       menuKey: 'marketing' },
  ]},
  { key: 'commerce', icon: '🛒', labelKey: 'gNav.commerceLabel', items: [
    { to: '/omni-channel',   menuKey: 'ops' },
    { to: '/catalog-sync',   menuKey: 'ops' },
    { to: '/order-hub',      menuKey: 'ops' },
    { to: '/wms-manager',    menuKey: 'ops' },
    { to: '/price-opt',      menuKey: 'ops' },
    { to: '/supply-chain',   menuKey: 'ops' },
    { to: '/returns-portal', menuKey: 'ops' },
  ]},
  { key: 'analytics', icon: '📊', labelKey: 'gNav.analytics', items: [
    { to: '/performance',    menuKey: 'analytics||performance_hub' },
    { to: '/report-builder', menuKey: 'analytics||report_builder' },
    { to: '/pnl',            menuKey: 'analytics||pnl_analytics' },
    { to: '/ai-insights',    menuKey: 'analytics||ai_insights' },
    { to: '/data-product',   menuKey: 'analytics||data_product' },
  ]},
  { key: 'automation', icon: '🤖', labelKey: 'gNav.automation', items: [
    { to: '/ai-rule-engine', menuKey: 'automation||ai_rule_engine' },
    { to: '/approvals',      menuKey: 'automation||approvals' },
    { to: '/writeback',      menuKey: 'automation||writeback' },
    { to: '/onboarding',     menuKey: 'automation||onboarding' },
  ]},
  { key: 'data', icon: '🔌', labelKey: 'gNav.data', items: [
    { to: '/integration-hub', menuKey: 'data||integration_hub' },
    { to: '/data-schema',     menuKey: 'data||data_schema' },
    { to: '/data-trust',      menuKey: 'data||data_trust' },
  ]},
  { key: 'finance', icon: '💳', labelKey: 'gNav.finance', items: [
    { to: '/settlements',    menuKey: 'billing' },
    { to: '/reconciliation', menuKey: 'billing' },
    { to: '/app-pricing',    menuKey: 'billing' },
    { to: '/audit',          menuKey: 'billing' },
  ]},
  { key: 'member_tools', icon: '👥', labelKey: 'gNav.memberTools', items: [
    { to: '/workspace',     menuKey: 'system||workspace' },
    { to: '/operations',    menuKey: 'system||operations' },
    { to: '/case-study',    menuKey: 'system||case_study' },
    { to: '/help',          menuKey: 'system||help_center' },
    { to: '/feedback',      menuKey: 'system||feedback' },
    { to: '/developer-hub', menuKey: 'system||developer_hub' },
  ]},
];
const ADMIN_MENU = [
  { key: 'system', icon: '🔧', labelKey: 'gNav.adminSystem', items: [
    { to: '/admin',              menuKey: 'system||admin' },
    { to: '/admin/plan-pricing', menuKey: 'system||plan_pricing' },
    { to: '/admin/menu-tree',    menuKey: 'system||menu_tree' },
    { to: '/db-admin',           menuKey: 'system||db_admin' },
    { to: '/pg-config',          menuKey: 'system||pg_config' },
  ]},
];
const SUB_TABS_BY_PATH = {
  '/admin/plan-pricing': [{id:'plan',label:'플랜 & 요금'},{id:'permissions',label:'메뉴 접근 권한'},{id:'coupons',label:'쿠폰 관리'}],
  '/db-admin': [{id:'overview',label:'데이터베이스 현황'},{id:'tables',label:'테이블 관리'},{id:'query',label:'쿼리 실행기'},{id:'backup',label:'백업/복구'}],
  '/performance': [{id:'overview',label:'개요'},{id:'channels',label:'채널별'},{id:'campaigns',label:'캠페인별'},{id:'funnel',label:'퍼널'}],
  '/pnl': [{id:'overall',label:'전체 손익'},{id:'by_sku',label:'SKU별'},{id:'by_channel',label:'채널별'},{id:'by_campaign',label:'캠페인별'}],
  '/integration-hub': [{id:'connectors',label:'커넥터'},{id:'mapping',label:'매핑'},{id:'logs',label:'실행 로그'}],
  '/ai-rule-engine': [{id:'rules',label:'룰 목록'},{id:'builder',label:'룰 빌더'},{id:'history',label:'실행 이력'}],
  '/developer-hub': [{id:'api_keys',label:'API 키'},{id:'webhooks',label:'웹훅'},{id:'logs',label:'웹훅 로그'}],
  '/audit': [{id:'recent',label:'최근 활동'},{id:'admin',label:'관리자 행동'},{id:'system',label:'시스템 이벤트'}],
  '/crm': [{id:'segments',label:'세그먼트'},{id:'cohort',label:'코호트'},{id:'journeys',label:'여정'},{id:'churn',label:'이탈 예측'}],
  '/auto-marketing': [{id:'overview',label:'개요'},{id:'rules',label:'자동화 룰'},{id:'history',label:'실행 이력'}],
  '/campaign-manager': [{id:'active',label:'진행중'},{id:'paused',label:'일시중지'},{id:'completed',label:'완료'}],
  '/wms-manager': [{id:'inventory',label:'재고 현황'},{id:'warehouses',label:'창고 관리'},{id:'transfers',label:'이동/조정'}],
  '/order-hub': [{id:'pending',label:'신규/대기'},{id:'shipping',label:'배송중'},{id:'completed',label:'완료'},{id:'returns',label:'반품'}],
  '/admin': [{id:'environment',label:'환경 설정'},{id:'accounts',label:'계정 관리'},{id:'audit',label:'감사 로그'},{id:'maintenance',label:'유지보수'}],
};

const sections = [...MEMBER_MENU, ...ADMIN_MENU];
const rows = [];

// 1) 대메뉴 (section) — __section:<key>
let order = 1000;
for (const s of sections) {
  rows.push({
    id: `__section:${s.key}`,
    label_key: s.labelKey,
    icon: s.icon || '',
    route: '',
    menu_key: `__section:${s.key}`,
    display_order: order++,
  });
}

// 2) 하위 (leaf) — __leaf:<route>
order = 2000;
for (const s of sections) {
  for (const it of s.items) {
    rows.push({
      id: `__leaf:${it.to}`,
      label_key: it.labelKey || it.to,
      icon: it.icon || '',
      route: it.to || '',
      menu_key: `__leaf:${it.to}`,
      display_order: order++,
    });
  }
}

// 3) 서브탭 — __subtab:<route>::<id>
order = 3000;
for (const [route, subs] of Object.entries(SUB_TABS_BY_PATH)) {
  for (const st of subs) {
    rows.push({
      id: `__subtab:${route}::${st.id}`,
      label_key: st.label,
      icon: '📑',
      route: '',
      menu_key: `__subtab:${route}::${st.id}`,
      display_order: order++,
    });
  }
}

const esc = (s) => String(s == null ? '' : s).replace(/'/g, "''");
const sql = [
  '-- 172차 PHASE 2-D 보강 — 5계층 menu_tree 확장 INSERT',
  '-- 대메뉴 11 + 하위 leaf 53 + 서브탭 48 = 112 신규 row',
  '-- 모두 visibility=visible default. AdminMenuManager UI 에서 토글.',
  'INSERT IGNORE INTO menu_tree (id, parent_id, label_key, icon, route, menu_key, display_order, visibility) VALUES',
];
const values = rows.map(r =>
  `('${esc(r.id)}', NULL, '${esc(r.label_key)}', '${esc(r.icon)}', '${esc(r.route)}', '${esc(r.menu_key)}', ${r.display_order}, 'visible')`
);
sql.push(values.join(',\n'));
sql.push(';');

process.stdout.write(sql.join('\n') + '\n');
console.error(`Generated ${rows.length} rows.`);
