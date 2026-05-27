-- 171차 P0 #1 — plan_menu_access default 매트릭스 seed (4 plan × 26 menu = 104 row)
-- @session 171차 ; @author cc ; @date 2026-05-27
--
-- 정책 정합 (PlanPricing.jsx SEED_PLANS features 배열 기반):
--   starter  $49/m : 채널/창고 1개씩, 마케팅 분석, 이메일 지원
--   pro      $149/m: 무제한 채널/창고, AI Marketing Intelligence, 우선 지원
--   enterprise custom : 전체 + 커스텀 AI + SLA + 전담 매니저
--   admin    : 플랫폼 관리자 (모든 메뉴 + admin section)
--
-- 매트릭스 (1=enabled, 0=disabled):
-- ┌──────────────────────────────────┬─────────┬─────┬────────────┬───────┐
-- │ menu_key                         │ starter │ pro │ enterprise │ admin │
-- ├──────────────────────────────────┼─────────┼─────┼────────────┼───────┤
-- │ home||dashboard                  │    1    │  1  │     1      │   1   │
-- │ home||rollup                     │    1    │  1  │     1      │   1   │
-- │ analytics||performance_hub       │    1    │  1  │     1      │   1   │
-- │ analytics||report_builder        │    0    │  1  │     1      │   1   │
-- │ analytics||pnl_analytics         │    0    │  1  │     1      │   1   │
-- │ analytics||ai_insights           │    0    │  1  │     1      │   1   │
-- │ analytics||data_product          │    0    │  1  │     1      │   1   │
-- │ automation||ai_rule_engine       │    0    │  1  │     1      │   1   │
-- │ automation||approvals            │    0    │  1  │     1      │   1   │
-- │ automation||writeback            │    0    │  1  │     1      │   1   │
-- │ automation||onboarding           │    1    │  1  │     1      │   1   │
-- │ data||integration_hub            │    1    │  1  │     1      │   1   │
-- │ data||data_schema                │    0    │  1  │     1      │   1   │
-- │ data||data_trust                 │    0    │  0  │     1      │   1   │
-- │ marketing (section)              │    0    │  1  │     1      │   1   │
-- │ ops (section)                    │    1    │  1  │     1      │   1   │
-- │ billing (section)                │    1    │  1  │     1      │   1   │
-- │ system||workspace                │    1    │  1  │     1      │   1   │
-- │ system||operations               │    0    │  1  │     1      │   1   │
-- │ system||case_study               │    1    │  1  │     1      │   1   │
-- │ system||help_center              │    1    │  1  │     1      │   1   │
-- │ system||feedback                 │    1    │  1  │     1      │   1   │
-- │ system||developer_hub            │    0    │  0  │     1      │   1   │
-- │ system||admin                    │    0    │  0  │     0      │   1   │
-- │ system||db_admin                 │    0    │  0  │     0      │   1   │
-- │ system||pg_config                │    0    │  0  │     0      │   1   │
-- └──────────────────────────────────┴─────────┴─────┴────────────┴───────┘
-- 집계: starter=12, pro=21, enterprise=23, admin=26

START TRANSACTION;

-- starter (12 enabled)
INSERT INTO plan_menu_access (plan_id, menu_key, enabled, updated_by) VALUES
('starter', 'home||dashboard', 1, '171_cc_seed'),
('starter', 'home||rollup', 1, '171_cc_seed'),
('starter', 'analytics||performance_hub', 1, '171_cc_seed'),
('starter', 'analytics||report_builder', 0, '171_cc_seed'),
('starter', 'analytics||pnl_analytics', 0, '171_cc_seed'),
('starter', 'analytics||ai_insights', 0, '171_cc_seed'),
('starter', 'analytics||data_product', 0, '171_cc_seed'),
('starter', 'automation||ai_rule_engine', 0, '171_cc_seed'),
('starter', 'automation||approvals', 0, '171_cc_seed'),
('starter', 'automation||writeback', 0, '171_cc_seed'),
('starter', 'automation||onboarding', 1, '171_cc_seed'),
('starter', 'data||integration_hub', 1, '171_cc_seed'),
('starter', 'data||data_schema', 0, '171_cc_seed'),
('starter', 'data||data_trust', 0, '171_cc_seed'),
('starter', 'marketing', 0, '171_cc_seed'),
('starter', 'ops', 1, '171_cc_seed'),
('starter', 'billing', 1, '171_cc_seed'),
('starter', 'system||workspace', 1, '171_cc_seed'),
('starter', 'system||operations', 0, '171_cc_seed'),
('starter', 'system||case_study', 1, '171_cc_seed'),
('starter', 'system||help_center', 1, '171_cc_seed'),
('starter', 'system||feedback', 1, '171_cc_seed'),
('starter', 'system||developer_hub', 0, '171_cc_seed'),
('starter', 'system||admin', 0, '171_cc_seed'),
('starter', 'system||db_admin', 0, '171_cc_seed'),
('starter', 'system||pg_config', 0, '171_cc_seed');

-- pro (21 enabled)
INSERT INTO plan_menu_access (plan_id, menu_key, enabled, updated_by) VALUES
('pro', 'home||dashboard', 1, '171_cc_seed'),
('pro', 'home||rollup', 1, '171_cc_seed'),
('pro', 'analytics||performance_hub', 1, '171_cc_seed'),
('pro', 'analytics||report_builder', 1, '171_cc_seed'),
('pro', 'analytics||pnl_analytics', 1, '171_cc_seed'),
('pro', 'analytics||ai_insights', 1, '171_cc_seed'),
('pro', 'analytics||data_product', 1, '171_cc_seed'),
('pro', 'automation||ai_rule_engine', 1, '171_cc_seed'),
('pro', 'automation||approvals', 1, '171_cc_seed'),
('pro', 'automation||writeback', 1, '171_cc_seed'),
('pro', 'automation||onboarding', 1, '171_cc_seed'),
('pro', 'data||integration_hub', 1, '171_cc_seed'),
('pro', 'data||data_schema', 1, '171_cc_seed'),
('pro', 'data||data_trust', 0, '171_cc_seed'),
('pro', 'marketing', 1, '171_cc_seed'),
('pro', 'ops', 1, '171_cc_seed'),
('pro', 'billing', 1, '171_cc_seed'),
('pro', 'system||workspace', 1, '171_cc_seed'),
('pro', 'system||operations', 1, '171_cc_seed'),
('pro', 'system||case_study', 1, '171_cc_seed'),
('pro', 'system||help_center', 1, '171_cc_seed'),
('pro', 'system||feedback', 1, '171_cc_seed'),
('pro', 'system||developer_hub', 0, '171_cc_seed'),
('pro', 'system||admin', 0, '171_cc_seed'),
('pro', 'system||db_admin', 0, '171_cc_seed'),
('pro', 'system||pg_config', 0, '171_cc_seed');

-- enterprise (23 enabled — admin section 만 제외)
INSERT INTO plan_menu_access (plan_id, menu_key, enabled, updated_by) VALUES
('enterprise', 'home||dashboard', 1, '171_cc_seed'),
('enterprise', 'home||rollup', 1, '171_cc_seed'),
('enterprise', 'analytics||performance_hub', 1, '171_cc_seed'),
('enterprise', 'analytics||report_builder', 1, '171_cc_seed'),
('enterprise', 'analytics||pnl_analytics', 1, '171_cc_seed'),
('enterprise', 'analytics||ai_insights', 1, '171_cc_seed'),
('enterprise', 'analytics||data_product', 1, '171_cc_seed'),
('enterprise', 'automation||ai_rule_engine', 1, '171_cc_seed'),
('enterprise', 'automation||approvals', 1, '171_cc_seed'),
('enterprise', 'automation||writeback', 1, '171_cc_seed'),
('enterprise', 'automation||onboarding', 1, '171_cc_seed'),
('enterprise', 'data||integration_hub', 1, '171_cc_seed'),
('enterprise', 'data||data_schema', 1, '171_cc_seed'),
('enterprise', 'data||data_trust', 1, '171_cc_seed'),
('enterprise', 'marketing', 1, '171_cc_seed'),
('enterprise', 'ops', 1, '171_cc_seed'),
('enterprise', 'billing', 1, '171_cc_seed'),
('enterprise', 'system||workspace', 1, '171_cc_seed'),
('enterprise', 'system||operations', 1, '171_cc_seed'),
('enterprise', 'system||case_study', 1, '171_cc_seed'),
('enterprise', 'system||help_center', 1, '171_cc_seed'),
('enterprise', 'system||feedback', 1, '171_cc_seed'),
('enterprise', 'system||developer_hub', 1, '171_cc_seed'),
('enterprise', 'system||admin', 0, '171_cc_seed'),
('enterprise', 'system||db_admin', 0, '171_cc_seed'),
('enterprise', 'system||pg_config', 0, '171_cc_seed');

-- admin (26 enabled — 전체)
INSERT INTO plan_menu_access (plan_id, menu_key, enabled, updated_by) VALUES
('admin', 'home||dashboard', 1, '171_cc_seed'),
('admin', 'home||rollup', 1, '171_cc_seed'),
('admin', 'analytics||performance_hub', 1, '171_cc_seed'),
('admin', 'analytics||report_builder', 1, '171_cc_seed'),
('admin', 'analytics||pnl_analytics', 1, '171_cc_seed'),
('admin', 'analytics||ai_insights', 1, '171_cc_seed'),
('admin', 'analytics||data_product', 1, '171_cc_seed'),
('admin', 'automation||ai_rule_engine', 1, '171_cc_seed'),
('admin', 'automation||approvals', 1, '171_cc_seed'),
('admin', 'automation||writeback', 1, '171_cc_seed'),
('admin', 'automation||onboarding', 1, '171_cc_seed'),
('admin', 'data||integration_hub', 1, '171_cc_seed'),
('admin', 'data||data_schema', 1, '171_cc_seed'),
('admin', 'data||data_trust', 1, '171_cc_seed'),
('admin', 'marketing', 1, '171_cc_seed'),
('admin', 'ops', 1, '171_cc_seed'),
('admin', 'billing', 1, '171_cc_seed'),
('admin', 'system||workspace', 1, '171_cc_seed'),
('admin', 'system||operations', 1, '171_cc_seed'),
('admin', 'system||case_study', 1, '171_cc_seed'),
('admin', 'system||help_center', 1, '171_cc_seed'),
('admin', 'system||feedback', 1, '171_cc_seed'),
('admin', 'system||developer_hub', 1, '171_cc_seed'),
('admin', 'system||admin', 1, '171_cc_seed'),
('admin', 'system||db_admin', 1, '171_cc_seed'),
('admin', 'system||pg_config', 1, '171_cc_seed');

COMMIT;

-- 검증 쿼리:
-- SELECT plan_id, COUNT(*) AS total, SUM(enabled) AS enabled_cnt FROM plan_menu_access GROUP BY plan_id;
-- 예상: starter total=26 enabled=12, pro total=26 enabled=21, enterprise total=26 enabled=23, admin total=26 enabled=26
