-- 172차 Task #22 초고도화: 메뉴 권한 ↔ 플랜 요금 자동 산출
-- 각 menuKey 의 USD 가치 (월간) 점수 정의. 플랜의 enabled 메뉴 weight 합 = 권장 월 요금.
-- category: core (필수, 모든 플랜) / standard (일반) / premium (Pro+) / enterprise (Enterprise only)
-- ai_premium: AI 기능 menuKey 에 추가 가중치 (%)

CREATE TABLE IF NOT EXISTS menu_value_score (
  menu_key        VARCHAR(255) PRIMARY KEY,
  weight_usd      DECIMAL(8,2) NOT NULL DEFAULT 0,
  category        ENUM('core','standard','premium','enterprise') NOT NULL DEFAULT 'standard',
  ai_premium_pct  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bundle_count    SMALLINT UNSIGNED NOT NULL DEFAULT 1,   -- 'marketing' 처럼 다수 페이지 묶음일 때 페이지 수 표기 (정보)
  description     VARCHAR(255) DEFAULT NULL,
  updated_by      VARCHAR(64) DEFAULT NULL,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_menu_value_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: 현재 운영 가격 ($49 / $149 / Enterprise) 정합되도록 가중치 배분
-- Starter (11 menus enabled) ≈ $49, Pro (21) ≈ $149, Enterprise (23) ≈ $249
INSERT INTO menu_value_score (menu_key, weight_usd, category, ai_premium_pct, bundle_count, description) VALUES
-- 홈 — core (모든 플랜 필수)
('home||dashboard',              5.00,  'core',       0,  1, '메인 대시보드 (필수)'),
('home||rollup',                 5.00,  'core',       0,  1, '롤업 뷰 (필수)'),

-- 마케팅 통합 (bundle 17 페이지) — premium, AI 가중치 큼
('marketing',                   45.00,  'premium',   25, 17, '자동마케팅·캠페인·여정·CRM·인플루언서 17 페이지 번들'),

-- 커머스 통합 (bundle 7 페이지) — standard
('ops',                         30.00,  'standard',   0,  7, '옴니채널·카탈로그·주문·WMS·가격 등 7 페이지 번들'),

-- 인사이트 — premium
('analytics||performance_hub',  15.00,  'premium',    0,  1, '광고 성과 8차원 분석'),
('analytics||report_builder',   10.00,  'standard',   0,  1, '커스텀 리포트 빌더'),
('analytics||pnl_analytics',    18.00,  'premium',    0,  1, 'SKU·채널 P&L'),
('analytics||ai_insights',      20.00,  'premium',   30,  1, 'GPT 기반 자동 인사이트'),
('analytics||data_product',     12.00,  'standard',   0,  1, '데이터 마트'),

-- 자동화 — premium
('automation||ai_rule_engine',  22.00,  'premium',   30,  1, 'AI 룰 엔진'),
('automation||approvals',        8.00,  'standard',   0,  1, '승인 큐'),
('automation||writeback',       10.00,  'standard',   0,  1, '채널 라이트백'),
('automation||onboarding',       5.00,  'core',       0,  1, '온보딩 가이드'),

-- 데이터 — standard
('data||integration_hub',       12.00,  'standard',   0,  1, 'OAuth 커넥터 허브'),
('data||data_schema',            8.00,  'standard',   0,  1, '스키마 거버넌스'),
('data||data_trust',            10.00,  'premium',    0,  1, '데이터 품질 검증'),

-- 재무 — standard
('billing',                     10.00,  'standard',   0,  4, '정산·대사·결제·감사로그 4 페이지 번들'),

-- 시스템 (member tools) — core
('system||workspace',            3.00,  'core',       0,  1, '팀/권한 관리'),
('system||operations',           3.00,  'core',       0,  1, '백그라운드 작업'),
('system||case_study',           2.00,  'standard',   0,  1, '벤치마크 라이브러리'),
('system||help_center',          1.00,  'core',       0,  1, '도움말'),
('system||feedback',             1.00,  'core',       0,  1, '피드백'),
('system||developer_hub',       15.00,  'enterprise', 0,  1, 'API 키 + 웹훅'),

-- 관리자 전용 — enterprise
('system||admin',               25.00,  'enterprise', 0,  1, '플랫폼 환경 설정 (admin)'),
('system||plan_pricing',        15.00,  'enterprise', 0,  1, '플랜·요금 관리 (admin)'),
('system||menu_tree',           10.00,  'enterprise', 0,  1, '메뉴 가시성 (admin)'),
('system||db_admin',            20.00,  'enterprise', 0,  1, 'DB 스키마 관리 (admin)'),
('system||pg_config',           15.00,  'enterprise', 0,  1, 'Paddle 결제 설정 (admin)');

-- @rollback
DROP TABLE IF EXISTS menu_value_score;
-- @end-rollback
