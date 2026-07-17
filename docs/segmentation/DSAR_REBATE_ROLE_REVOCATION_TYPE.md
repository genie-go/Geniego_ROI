# DSAR — Revocation Type (§34)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## Revocation Type (13)
USER_REQUEST · MANAGER_REQUEST · **ACCESS_REVIEW** · **EMPLOYMENT_END** · **CONTRACT_END** · **ORGANIZATION_TRANSFER** · ROLE_DEPRECATED · **POLICY_VIOLATION** · **SECURITY_INCIDENT** · INACTIVITY · **AUTOMATIC_EXPIRY** · DUPLICATE_ASSIGNMENT · OTHER.

## 🔴 Type 이 회수 속도를 결정한다
**SECURITY_INCIDENT·EMPLOYMENT_END → 즉시**(§35).
**ORGANIZATION_TRANSFER → 재평가**(§4.10: 조직 변경 시 기존 권한을 자동 유지하지 않는다).
**INACTIVITY → Review 경유**(오탐 시 정상 사용자를 끊는다 — 1-9 최우선 명령).

## 실측
현행 회수 사유 **미기록** — `EnterpriseAuth.php:400` 은 **회수는 하되 사유를 남기지 않는다**.
**ACCESS_REVIEW Type 은 Access Review 자체가 부재**(5-7 발견 · 1-9까지 미해소)이므로 **현재 성립 불가**.

## 분류
**NOT_APPLICABLE → 신설**.
