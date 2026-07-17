# DSAR — Scope Override (§37)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
override id·target assignment·scope dimension·original scope·override scope·**override effect**·reason·requested_by·approved_by·effective_from/to·**rollback reference**·status·evidence.

**Override Effect(7)**: RESTRICT · EXCLUDE · READ_ONLY · MASK_FIELDS · REDUCE_THRESHOLD · **TEMPORARY_EXTENSION** · BLOCK.

## 🔴 원칙 §4.7 — 축소는 허용, 확대는 차단
**하위 Scope 의 Override 는 상위 Permission 보다 더 제한적으로 만들 수 있다.**
**상위 권한보다 넓게 확대하려면 명시적 별도 Assignment 와 정책 검증이 필요하다.**

**`TEMPORARY_EXTENSION` 은 상위 정책 한계를 초과하지 않는 범위에서만 허용한다.**

> Override 7종 중 6종이 **제한 방향**이고 확대는 1종뿐이며 그마저 상한이 있다.
> **이 비대칭이 설계 의도다** — Override 는 조이는 도구이지 푸는 도구가 아니다.

## rollback reference 필수
Override 는 **되돌릴 수 있어야** 한다 — 1-9 `RollbackPlan`: **통합은 롤백 가능해야 착수**.

Static Lint: **Evidence 없는 Scope Override 차단**(§49).

## 실측
Override **부재**.

## 분류
**NOT_APPLICABLE → 신설**.
