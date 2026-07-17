# DSAR — Conditional Assignment (§31)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 조건 예(9)
특정 Project 기간 · 특정 Contract 유효기간 · 특정 Program Active 기간 · 특정 Incident 처리 기간 · 특정 Country Launch 기간 · **특정 Financial Threshold 이하** · 특정 시간대 · **특정 인증 수준** · **특정 Device Trust**.

## 계약 — 필수
condition reference · condition version · **condition data source** · **failure behavior** · **stale data behavior** · reevaluation interval · evidence.

## 🔴 failure·stale behavior 가 핵심이다
**조건 데이터를 못 읽으면 어떻게 할 것인가**가 이 엔티티의 전부다.
5-1 §4.1 **Deny-by-default** + 5-2 원칙에 따라 **fail-closed 가 기본**이어야 한다.

> **Unknown ≠ Eligible.** 조건을 확인할 수 없으면 **허용이 아니라 거부**다.
> 06-A Part 3-2가 세운 **"Unknown ≠ Eligible · Fail-closed"** 와 동일 원칙.

## 실측
Conditional Assignment **부재**. ABAC Context(device/network/risk/session_age/amount) = 5-1 §50 **NOT_APPLICABLE(부재)**.
현행 Attribute REAL 4 = tenant_id · team_role · plan · MFA_state(5-1 §59 ⑭) — **시간대·Device Trust·Financial Threshold 전부 부재**.

## 분류
**NOT_APPLICABLE → 신설**.
