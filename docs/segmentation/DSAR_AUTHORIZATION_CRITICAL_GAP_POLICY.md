# DSAR — Critical Gap 정책 (§43·18종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Critical Gap (18)
**Cross-Tenant Program Access** · **Wrong Legal Entity Funding Access** · **Sandbox Role 의 Production 접근** · **UI 에서는 차단되지만 API 직접 호출 허용** · API Gateway ↔ Service Decision 불일치 · **Provider Credential Secret 노출** · **Revoked Role 로 기존 Session 접근 지속** · **Expired Assignment 로 접근 지속** · Payout·Bank Data 무단 조회 · **Financial Approval Permission 과 Execution Permission 결합** · 동일 사용자에게 모든 고위험 권한 집중 · 데이터 Masking Policy 미적용 · **Explicit Deny 무시** · **Unknown Policy Version 으로 Production 결정** · **Policy Cache 가 만료된 권한을 허용** · **Service Account 가 Human Login 가능** · **Cross-Environment Credential 사용** · **Authorization Decision Audit 누락**

## 규칙
- Critical 발생 시 **Access Review 차단 + 자동 집행 중지**.
- **"UI 차단인데 API 허용" 은 현행 구조적 위험** — 인가 판정 100+ 지점 분산(authedTenant 64 · plan gate 56/호출부 351 · master 5 · 미들웨어 1) · **275차 실현 사례**(헤더리스 getJson 401 회귀 2차 재발) → **5-6 통합 + CI 가드**(`tools/guard_headerless_getjson.mjs` 선례).
- **엔진 부재는 Gap 이 아니다** → NOT_APPLICABLE(NO_DATA/오탐 금지).
