# DSAR — Role Version (§10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
rebate_role_version_id·rebate_role_id·version_number·previous_version·changed permissions/scopes/conditions/field profile/assignment policy·effective_from/to·approved_at·activated_at·**immutable hash**·migration policy·**affected assignments**·status·evidence.

## 원칙 (1-4 Versioning 정본 준수)
**Recorded ≠ Effective** · **as-of 강제**(`effective_from <= t < effective_to`) · **Approved Version Immutable Hash** · **동일 기간 다중 Active 금지** · **미래 Version 조기 적용 금지** · **Historical Binding**(현재 Version 으로 과거 재귀속 금지).

## 실측
Role Version **부재**. 5-1 §59 ⑰ = **Policy Version 0(부재)** 와 동일 계보.
**관련 관찰**: `KrChannel.php:459` = `ORDER BY effective_from DESC LIMIT 1`(**as-of 아님**) — 1-4가 `MIGRATION_REQUIRED` 로 인계한 동일 유형.

## 분류
**NOT_APPLICABLE → 신설** — 단 **1-4 Versioning 정본 재사용 · 중복 Version 프레임워크 신설 금지**.
