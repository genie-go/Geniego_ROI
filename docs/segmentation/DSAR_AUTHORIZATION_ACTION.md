# DSAR — Authorization Action (§11)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 실측 — ★현행 8동작이 Canonical Action 의 기반
`TeamPermissions::ACTIONS = ['view','create','update','delete','approve','export','execute','manage']`(**8종**·TeamPermissions.php:39) = **VALIDATED_LEGACY(재사용)**.
**★`approve` 와 `execute` 가 이미 분리**되어 있다 — §43 Critical("Financial Approval Permission 과 Execution Permission 결합") 방지의 **실 근거**.

## Entity `AUTHORIZATION_ACTION`
action_code · domain · **action_category · mutating 여부 · financial_impact · production_restricted · approval_required · step_up_required · audit_required** · version · status · evidence

## 규칙
- **Action 미등록 상태로 Authorization Check 금지**(`AUTHORIZATION_ACTION_NOT_REGISTERED`).
- **현행 8동작의 의미를 변경하지 말고 확장**(Golden Rule=Extend).
- 확장 목록 = [REBATE_AUTHORIZATION_ACTION_REGISTRY](DSAR_REBATE_AUTHORIZATION_ACTION_REGISTRY.md).
