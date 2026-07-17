# DSAR — Production Authorization Policy (§36)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Production 최소 요구 (13)
활성 Subject · **Production Environment Scope** · 강화된 Authentication Assurance · **MFA** · 신뢰 가능한 Session · Risk Threshold 이하 · Sensitive Role 유효 · Time-bound Assignment Hook(5-5) · Approval Hook(5-3) · **Audit Logging** · No Critical Policy Conflict · No Incident Lockdown · No Kill Switch Conflict

## ★§4.6 Environment Isolation
- Production · Sandbox · Staging · QA · Test · Development · **Demo** 권한 **분리**.
- **Production 권한이 Sandbox 에 자동 상속되지 않으며, Sandbox 권한도 Production 에 적용되지 않는다.**
- **Sandbox Role / Credential 로 Production 작업 금지**(§43 Critical) · **Cross-Environment Credential 사용 금지**.

## 실측
- **Production/Sandbox 권한 분리 부재** — GENIE_ENV/IS_DEMO 는 **데이터 격리용**이지 권한 축이 아님 → **신설**.
- **★278차 트랩**: `Db::env()` 는 GENIE_ENV 부재 시 **데모에서도 production 반환** → **`Db::envLabel()` 사용**(환경 판정 오류 = 권한 오판 위험).
- MFA 는 **REAL**(mfa_policy·UserAuth) → 재사용.
