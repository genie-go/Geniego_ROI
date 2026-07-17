# DSAR — Role Assignment 상태 (§26)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 상태(13)
REQUESTED · REVIEW_PENDING · APPROVAL_PENDING · SCHEDULED · **ACTIVE** · ACTIVE_WITH_WARNINGS · SUSPENDED · **EXPIRED** · REVOCATION_PENDING · **REVOKED** · REJECTED · SUPERSEDED · BLOCKED · UNKNOWN.

## 실측
현행 Assignment 상태 = **이진**(존재/부재). `api_key.is_active` + `expires_at` 조합이 **ACTIVE/EXPIRED 근사**.

## 🔴 EXPIRED ≠ REVOKED
- **EXPIRED** = 시간이 지나 자동 종료 — **예정된 것**
- **REVOKED** = 명시적으로 회수 — **사건이 있는 것**

**둘을 한 상태로 합치면 "왜 권한이 없어졌는가"를 감사에서 설명할 수 없다.**
§34 Revocation Type 12종이 이 구분 위에 선다.

## 분류
**NOT_APPLICABLE → 신설**.
