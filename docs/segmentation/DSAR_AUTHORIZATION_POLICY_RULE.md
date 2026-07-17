# DSAR — Policy Rule (§23)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_POLICY_RULE`
policy_rule_id · policy_version · **rule_name · rule_priority · subject_selector · resource_selector · action_selector · condition_references · effect · obligation_references · denial_reason_code** · valid_from/to · status · evidence

## 규칙
- **denial_reason_code 필수** — 거부 시 이유 설명 가능(§4.10 · Vol4 Explainable).
- rule_priority 는 Conflict 해소에 사용(§33 HIGHEST_PRIORITY).
- selector 는 **Canonical Reference**(문자열 자유입력 금지 · 4-5-3-1-5 §8 Operand 원칙 계승).
- **Effect = DENY 인 Rule 이 항상 우선**(§4.2 Explicit Deny).
