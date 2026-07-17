# DSAR — Policy Condition (§24·25 Operator)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_POLICY_CONDITION`
policy_condition_id · policy_rule · **left_operand · operator · right_operand · data_type · null_behavior · stale_behavior · failure_effect** · evidence

## Operator (25)
EQUALS · NOT_EQUALS · IN · NOT_IN · CONTAINS · INTERSECTS · GREATER_THAN · GREATER_THAN_OR_EQUAL · LESS_THAN · LESS_THAN_OR_EQUAL · BETWEEN · EXISTS · NOT_EXISTS · MATCHES · **SAME_TENANT** · **SAME_WORKSPACE** · **SAME_LEGAL_ENTITY** · SAME_COUNTRY · **SAME_ENVIRONMENT** · WITHIN_SCOPE · WITHIN_TIME_WINDOW · **AUTH_LEVEL_AT_LEAST** · **RISK_BELOW** · **AMOUNT_BELOW** · **APPROVAL_PRESENT** · CUSTOM

## ★핵심 규칙
- **`null_behavior` · `stale_behavior` · `failure_effect` 필수 = 기본 DENY(fail-closed)** — 속성 부재/신선도 미달/평가 실패 시 허용 금지.
- **★현행 반례**: `team_role` 미설정 → **owner 로 fail-open**(AdminMenu.php:52-54) = 본 계약과 상충 → **5-2 판정**(MIGRATION_REQUIRED 후보 · **PM 코드 재증명 전 P0 단정 금지**).
- **Operator 화이트리스트 강제 · 임의 표현식/eval/raw SQL 금지** — **현행 정본**: RuleEngine 이 미등록 metric/op/action 을 **422 로 거부**(RuleEngine.php:120-121).
- 기존 DSL 정합: crm_segments **6 operator**(gte/lte/gt/lt/eq/ne·CRM.php:1571) 상위호환 — **DSL 난립 금지**(선행설계 R1 §0 계승).
