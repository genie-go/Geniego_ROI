# DSAR — Legal Entity Role (§19)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 🔴 계약 — 필수 규칙
**Financial·Settlement·Payout·Accounting Role 은 Legal Entity Scope 를 필수로 가진다.**
**Legal Entity Scope 없는 고위험 Financial Role Assignment 를 차단하라.**

예: 한국 법인 Finance Reviewer · 일본 법인 Settlement Operator · 미국 법인 Payout Approver.

## 실측 — 부재
**Legal Entity Registry 부재(grep 0)** — 1-1 Part 4-5-1-1 판정과 동일. 현행은 **`tenant_id` row-level 만** 존재.

> **Tenant ≠ Legal Entity.** 한 Tenant 가 복수 법인을 가질 수 있고, 법인 간에는
> **금융 데이터가 법적으로 격리**돼야 한다. `tenant_id` 하나로는 이 경계를 표현할 수 없다.

## 🔴 Critical Gap 연결
**Legal Entity Scope 없는 Finance·Payout Role** = §48 Critical Gap · Static Lint(§49) · Runtime `REBATE_ROLE_LEGAL_ENTITY_SCOPE_MISMATCH`(§51).

**현재는 Rebate Financial Role 자체가 없으므로 이 Gap 은 잠재**다 — **Rebate 도입 시 Legal Entity Registry 가 선행돼야 한다.**

## 분류
**NOT_APPLICABLE → 신설**(Registry + Scope 강제 동시).
