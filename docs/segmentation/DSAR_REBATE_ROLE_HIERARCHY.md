# DSAR — Role Hierarchy (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
role_hierarchy_id·parent_role·child_role·hierarchy type·inheritance mode·permission/scope/condition/exclusion inheritance·valid_from/to·status·evidence.

**Hierarchy Type(7)**: SPECIALIZES · EXTENDS · READ_ONLY_VARIANT · REGIONAL_VARIANT · ENVIRONMENT_VARIANT · EXTERNAL_VARIANT · CUSTOM_VARIANT.

## 🔴 순환 차단
**Role Hierarchy 에 순환 관계가 존재하지 않도록 하라.**
→ Static Lint `Role Hierarchy Cycle`(§49) + Runtime `REBATE_ROLE_HIERARCHY_CYCLE`(§51).

## 실측
현행 Hierarchy = **선형 rank 2계통**(`index.php:554` roleRank 0~3 · `team_role` owner>manager>member) — **그래프가 아니다.**
**순환 위험은 현행엔 없으나 Hierarchy 도입 즉시 발생**한다. 즉 **이 Lint 는 신설과 동시에 필요**하다.

## 분류
**NOT_APPLICABLE → 신설** · 기존 rank 2계통은 **SPECIALIZES 로 표현 가능**(의미 보존).
