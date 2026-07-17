# DSAR — Automatic Deprovisioning (§35)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## Trigger (14)
Employment Terminated · Contractor Ended · Partner Contract Ended · Tenant Membership Removed · Workspace Membership Removed · Department Transfer · **Legal Entity Transfer** · **Group Membership Removed** · Role Expired · **Program Archived** · **Program Terminated** · Provider Account Removed · **Security Incident** · User Disabled.

## 계약
deprovisioning id·trigger·subject·affected assignments·**affected sessions**·**affected tokens**·affected provider bindings·detected_at·executed_at·grace period·status·errors·evidence.

## 🔴 규칙
**Security Incident·Employment End 는 기본적으로 즉시 회수한다.**

## 🔴 실측 — 부분 REAL
✅ **User Disabled → 즉시 세션 회수**: `EnterpriseAuth.php:400` `active===0 → DELETE FROM user_session`.
❌ 나머지 13 Trigger **부재**. 특히 **Group Membership Removed** 는 §28의 removal behavior 부재와 연결 → §48 Critical Gap.

> **1개 Trigger 가 REAL 이라는 사실이 중요하다.** 패턴이 이미 있으므로
> **나머지는 신설이 아니라 같은 패턴의 확장**이다(Golden Rule).

## 분류
`EnterpriseAuth.php:400` = **VALIDATED_LEGACY(패턴 정본·재사용 강제)** · Trigger 13 = **NOT_APPLICABLE → 확장**.
