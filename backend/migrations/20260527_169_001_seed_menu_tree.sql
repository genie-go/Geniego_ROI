-- 169차 N-152-F F2/F3 sub-task: menu_tree initial seed
-- spec: docs/spec/n152f_consolidated_pm_track.md §4
--
-- sidebar (Sidebar.jsx MEMBER_MENU + ADMIN_MENU) 의 모든 unique menuKey 를
-- menu_tree row 로 등록. visibility 'visible' default 로 admin/user 토글 진입점 확보.
-- INSERT IGNORE 로 재실행 안전.
--
-- 169차 시점 26 unique menuKey:
--   home||* (2), marketing (1 shared), ops (1 shared), analytics||* (5),
--   automation||* (4), data||* (3), billing (1 shared), system||* (9)

INSERT IGNORE INTO menu_tree (id, parent_id, label_key, icon, route, menu_key, display_order, visibility) VALUES
-- home
('home||dashboard',          NULL, 'gNav.dashboardLabel',         '⬡',  '/dashboard',          'home||dashboard',          10, 'visible'),
('home||rollup',              NULL, 'gNav.rollupLabel',             '🗂️', '/rollup',             'home||rollup',              20, 'visible'),

-- marketing (shared menuKey — 광고/캠페인/CRM 통합 토글)
('marketing',                 NULL, 'gNav.aiMarketing',             '🚀', NULL,                  'marketing',                 30, 'visible'),

-- commerce / ops
('ops',                       NULL, 'gNav.commerceLabel',           '🛒', NULL,                  'ops',                       40, 'visible'),

-- analytics
('analytics||performance_hub', NULL, 'gNav.performanceHubLabel',    '📊', '/performance',        'analytics||performance_hub', 50, 'visible'),
('analytics||report_builder',  NULL, 'gNav.reportBuilderLabel',     '📋', '/report-builder',     'analytics||report_builder',  51, 'visible'),
('analytics||pnl_analytics',   NULL, 'gNav.pnlLabel',               '🌊', '/pnl',                'analytics||pnl_analytics',   52, 'visible'),
('analytics||ai_insights',     NULL, 'gNav.aiInsightsLabel',        '🤖', '/ai-insights',        'analytics||ai_insights',     53, 'visible'),
('analytics||data_product',    NULL, 'gNav.dataProductLabel',       '🗂️', '/data-product',       'analytics||data_product',    54, 'visible'),

-- automation
('automation||ai_rule_engine', NULL, 'gNav.aiRuleEngineLabel',      '🧠', '/ai-rule-engine',     'automation||ai_rule_engine', 60, 'visible'),
('automation||approvals',      NULL, 'gNav.approvalsLabel',         '✅', '/approvals',          'automation||approvals',      61, 'visible'),
('automation||writeback',      NULL, 'gNav.writebackLabel',         '↩',  '/writeback',          'automation||writeback',      62, 'visible'),
('automation||onboarding',     NULL, 'gNav.onboardingLabel',        '🗺️', '/onboarding',         'automation||onboarding',     63, 'visible'),

-- data
('data||integration_hub',     NULL, 'gNav.integrationHubLabel',    '🔗', '/integration-hub',    'data||integration_hub',     70, 'visible'),
('data||data_schema',         NULL, 'gNav.dataSchemaLabel',        '📋', '/data-schema',        'data||data_schema',         71, 'visible'),
('data||data_trust',          NULL, 'gNav.dataTrustLabel',         '🔬', '/data-trust',         'data||data_trust',          72, 'visible'),

-- billing (shared)
('billing',                   NULL, 'gNav.finance',                '💳', NULL,                  'billing',                   80, 'visible'),

-- system (member tools)
('system||workspace',         NULL, 'gNav.workspaceLabel',         '👥', '/workspace',          'system||workspace',         90, 'visible'),
('system||operations',        NULL, 'gNav.operationsLabel',        '⚡', '/operations',         'system||operations',        91, 'visible'),
('system||case_study',        NULL, 'gNav.caseStudyLabel',         '🏆', '/case-study',         'system||case_study',        92, 'visible'),
('system||help_center',       NULL, 'gNav.helpLabel',              '📚', '/help',               'system||help_center',       93, 'visible'),
('system||feedback',          NULL, 'gNav.feedbackLabel',          '💬', '/feedback',           'system||feedback',          94, 'visible'),
('system||developer_hub',     NULL, 'gNav.developerHubLabel',      '⚙️', '/developer-hub',      'system||developer_hub',     95, 'visible'),

-- system (admin only)
('system||admin',             NULL, 'gNav.platformEnvLabel',       '⚙',  '/admin',              'system||admin',             100, 'visible'),
('system||db_admin',          NULL, 'gNav.dbSchemaLabel',          '🗄️', '/db-admin',           'system||db_admin',          101, 'visible'),
('system||pg_config',         NULL, 'gNav.paymentPgLabel',         '💳', '/pg-config',          'system||pg_config',         102, 'visible');

-- @rollback
DELETE FROM menu_tree WHERE id IN (
  'home||dashboard','home||rollup','marketing','ops',
  'analytics||performance_hub','analytics||report_builder','analytics||pnl_analytics','analytics||ai_insights','analytics||data_product',
  'automation||ai_rule_engine','automation||approvals','automation||writeback','automation||onboarding',
  'data||integration_hub','data||data_schema','data||data_trust',
  'billing',
  'system||workspace','system||operations','system||case_study','system||help_center','system||feedback','system||developer_hub',
  'system||admin','system||db_admin','system||pg_config'
);
-- @end-rollback
