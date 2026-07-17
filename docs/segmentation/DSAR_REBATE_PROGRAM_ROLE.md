# DSAR — Program Role (§24)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약
rebate program · **program version scope** · role · tenant · workspace · legal entity · environment · permitted actions · excluded actions · valid from/to · evidence.

## 🔴 규칙
**Program Role 은 Program 종료·Archive·Migration 시 재평가한다.**
→ §35 Automatic Deprovisioning Trigger: **Program Archived · Program Terminated**.
→ §47 Reconciliation: **PROGRAM_ROLE_STALE**.

## 실측
**Rebate Program 자체가 부재** — 1-6이 선행문서 미인용 **직접 재증명**: `rebate`·`scan-back`·`scanback`·`bill-back`·`billback`·`ship-and-debit`·`MDF`·`co-op`·`coop` **9/9 `backend/src/` 히트 0**.

→ **Program Role 은 Program Registry(1-1) 신설 후에만 성립**한다.

## 🔴 1-6 우선순위 판정 계승
**ABSENT 는 최대 Gap 이자 최하위 우선순위다** — **없는 기능은 오작동하지 않는다.**
Program Role 부재는 **고객이 Rebate 를 못 쓸 뿐**이고, 지금 운영 중인 무엇도 해치지 않는다.

## 분류
**NOT_APPLICABLE → 신설**(1-1 Program Master 선행).
