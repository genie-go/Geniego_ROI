# DSAR — Direct Role Assignment (§27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 사용 상황(6)
특정 사용자에게만 필요한 예외 권한 · Program 별 책임자 · Finance Approver · Auditor · Migration Operator · Incident Responder.

## 🔴 필수 요구(6)
**Business Justification** · Scope · **Validity** · Assigned By · **Approval Reference 또는 승인 Hook** · **Periodic Review**.

Static Lint: **Business Justification 없는 Direct Sensitive Assignment 차단**(§49).

## 🔴 왜 Direct 가 가장 위험한가
**Direct 는 조직 구조를 우회한다.** Group·부서·역할 체계를 거치지 않고 **한 사람에게 직접** 붙는다.
그래서 **조직이 바뀌어도 따라 사라지지 않는다** — §35 Deprovisioning 이 놓치는 1순위가 Direct 다.
**Justification 과 Validity 를 강제하는 이유가 이것**이다: 근거와 만료가 없으면 **영원히 남는다.**

## 실측
현행 Direct = **team_role 부여 · api_key 발급**. **Justification·Approval·Review 전부 부재.**

## 분류
**CONSOLIDATION_REQUIRED**(현행 Direct 에 근거·유효기간 축 추가) — **단 기존 부여 동작 보존**(1-9).
