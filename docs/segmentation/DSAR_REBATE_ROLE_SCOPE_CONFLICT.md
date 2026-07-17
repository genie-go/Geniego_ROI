# DSAR — Scope Conflict Resolution (§39)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 충돌 예(7)
Tenant 전체 Role + 특정 Legal Entity 제외 · Workspace Role + Program Direct Role · **Group Allow + Direct Deny** · Production Role + Sandbox-only Assignment · **Vendor Role + Internal Finance Role** · Country Include + Region Exclude · Role Hierarchy 상속 + Local Override.

## 🔴 Resolution 우선순위 (9단계 · 순서 고정)
1. **Cross-Tenant Deny**
2. **Environment Restriction**
3. **Explicit Deny·Exclusion**
4. **Legal Entity Restriction**
5. 가장 구체적인 Scope
6. **낮은 Financial Threshold**
7. 더 제한적인 Field Access
8. Manual Review
9. **Block**

> **1~4가 전부 "차단" 방향이고, 마지막이 Block 이다.**
> 즉 **충돌 시 기본 귀결은 거부**다 — Deny-by-default(5-1 §4.1)의 충돌 해소판.
> **애매하면 열어주는 순서는 어디에도 없다.**

## 계약
conflict id·subject·assignments·conflicting scopes·conflicting effects·resolution policy·**resolved scope**·resolved permissions·severity·status·evidence.

## 실측
Conflict 개념 **부재** — 5-1 §59 ㉛ = **Policy Conflict 0(개념 부재)**.
현행은 단일 role 문자열이라 **충돌이 발생할 구조가 아니다**. **다중 Assignment 도입 즉시 필요**해진다.

## 분류
**NOT_APPLICABLE → 신설**.
