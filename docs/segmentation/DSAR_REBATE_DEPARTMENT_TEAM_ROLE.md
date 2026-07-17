# DSAR — Department·Team Role (§18)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — 배정 단위(7)
Department · **Team** · Squad · Cost Center · Business Unit · Regional Office · Project Group.

## 🔴 실측
| 단위 | 실측 |
|---|---|
| **Team** | ✅ **REAL** — `team`(id·tenant_id·name·description·**team_type**·**manager_user_id**·status·created_by) `TeamPermissions.php:145/168` · `team_role` owner>manager>member :13/17 |
| Department · Squad · Cost Center · Regional Office · Project Group | ❌ **부재(grep 0)** |
| ~~Business Unit~~ | ⚠️ **오탐** — `business_unit_id` 는 **Trustpilot Business API 자격증명 필드**(`ChannelSync.php:2573-2577`)이지 조직 단위가 아니다 |

## 🔴 핵심 규칙 (§18)
**Group Membership 변경 시 Role Assignment 가 자동 갱신되도록 하되, 고위험 Role 은 Group Membership 만으로 즉시 부여하지 않고 승인 Hook 을 요구할 수 있어야 한다.**

> 이유: Group 은 **조직 편의로 바뀌는데** 고위험 권한은 **승인으로 바뀌어야 한다.**
> Group 하나 추가가 Payout 승인 권한을 낳으면 **조직 관리가 권한 관리를 우회**한다.

## 분류
`team`·`team_role` = **VALIDATED_LEGACY(재사용)** · 나머지 단위 = **NOT_APPLICABLE → 신설**.
