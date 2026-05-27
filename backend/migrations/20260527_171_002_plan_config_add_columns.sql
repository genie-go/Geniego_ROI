-- 171차 — plan_config 컬럼 추가: is_recommended (추천 배지) + discount_pct (연간 할인율)
-- @session 171차 ; @author cc ; @date 2026-05-27
-- 정책: SEED_PLANS 정합 — starter $49→$39 (20%), pro $149→$119 (20%) = 20% 할인 표준

-- 컬럼 추가 (IF NOT EXISTS 미지원이므로 try/catch 패턴)
ALTER TABLE plan_config
  ADD COLUMN is_recommended TINYINT(1) NOT NULL DEFAULT 0 COMMENT '추천 플랜 (Most Popular 배지)',
  ADD COLUMN discount_pct TINYINT UNSIGNED NOT NULL DEFAULT 20 COMMENT '연간 할인율 (%, 자동 산출용)';

-- 기존 3 plan에 정책 적용
UPDATE plan_config SET
  is_recommended = 1,
  discount_pct = 20
WHERE plan_id = 'pro';

UPDATE plan_config SET
  is_recommended = 0,
  discount_pct = 20
WHERE plan_id = 'starter';

UPDATE plan_config SET
  is_recommended = 0,
  discount_pct = 0
WHERE plan_id = 'enterprise';

-- features_json 한글화 (SEED_PLANS 정합)
UPDATE plan_config SET features_json = JSON_ARRAY(
  '판매 채널 3개', '창고(WMS) 1개', '마케팅 분석', '팀 멤버 2명',
  'API 호출 월 10,000건', '이메일 지원 (48시간 내)'
) WHERE plan_id = 'starter';

UPDATE plan_config SET features_json = JSON_ARRAY(
  '무제한 판매 채널', '무제한 창고', 'AI 마케팅 인텔리전스',
  '인플루언서 평가', '상업 송장 자동 생성', '팀 멤버 10명',
  'API 호출 월 500,000건', '우선 지원 (8시간 내)'
) WHERE plan_id = 'pro';

UPDATE plan_config SET features_json = JSON_ARRAY(
  'Pro 플랜 전체 기능', '맞춤 AI 모델 학습', '전담 계정 매니저',
  '99.9% 가용성 SLA', '무제한 팀 멤버', '무제한 API 호출',
  '맞춤 통합 & 웹훅', '온프레미스 배포 옵션'
) WHERE plan_id = 'enterprise';

-- 검증 쿼리:
-- SELECT plan_id, name, price_usd, price_annual_usd, is_recommended, discount_pct, features_json FROM plan_config ORDER BY display_order;
