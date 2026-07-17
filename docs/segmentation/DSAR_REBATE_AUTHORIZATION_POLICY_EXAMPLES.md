# DSAR — Rebate Authorization Policy 예시 (§34)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

| Policy | 조건 | Effect |
|---|---|---|
| **Program 조회** | Tenant 일치 + Workspace Scope 포함 + Program Scope 포함 + `REBATE_PROGRAM_READ` | ALLOW |
| **Program 수정** | **Draft/Configuring 상태** + `REBATE_PROGRAM_UPDATE` + Tenant·Workspace Scope + **Production Version 직접 수정 금지** | ALLOW / DENY |
| **Funding 변경** | `REBATE_FUNDING_MANAGE` + **Program Legal Entity Scope 일치** + Financial Clearance + **변경 금액 ≤ 개인 Threshold** | ALLOW · **초과 시 REQUIRE_APPROVAL** |
| **Program 활성화** | `REBATE_PROGRAM_ACTIVATE` + **Version Approved** + **Activation Gate 23 통과**(1-4 §20) + **작성자≠활성화자 분리 Hook**(5-4) + **Production MFA** | CONDITIONAL_ALLOW |
| **Payout 조회** | `REBATE_PAYOUT_READ` + Financial Clearance + Tenant·Legal Entity Scope | **MASK_FIELDS**(Beneficiary PII 는 별도 Field Permission) |
| **Provider Credential 사용** | `REBATE_PROVIDER_CREDENTIAL_USE` + 지정 Provider Account Scope + **Production 은 Step-up Auth** | **REQUIRE_STEP_UP_AUTH** · **Secret 직접 조회 금지** |

## 규칙
- **Program 수정은 Lifecycle State 연동**(4-5-3-1-4: Draft/Configuring 만·Production Version 직접 수정 금지=§4.3 과거 덮어쓰기 금지 계승).
- **Program 활성화는 Activation Gate 23 전량 통과 필수**(1-4 §20) — **Approval 없는 Activation 차단**.
- **Funding Threshold 초과 = REQUIRE_APPROVAL**(§17 High/Critical 후보: Funding Party·Legal Entity 변경).
