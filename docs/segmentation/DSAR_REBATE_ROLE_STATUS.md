# DSAR — Role 상태 (§11)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 상태(11)
DRAFT · REVIEW_PENDING · APPROVAL_PENDING · ACTIVE · ACTIVE_WITH_WARNINGS · SUSPENDED · **DEPRECATED** · REPLACED · ARCHIVED · BLOCKED · UNKNOWN.

## 핵심 규칙
**Deprecated Role 은 신규 Assignment 를 차단하고 기존 Assignment Migration 계획을 요구한다.**

## 🔴 실측 — 혼동 금지
현행 **Role 상태 개념 부재**. `team.status`(active) · `api_key.is_active` 는 **Subject/Key 상태이지 Role 상태가 아니다.**
이를 Role 상태로 오독하면 **"있다고 믿는 것이 없다"**(06-A 관통 패턴)의 재생산이다.

## 분류
**NOT_APPLICABLE → 신설**.
