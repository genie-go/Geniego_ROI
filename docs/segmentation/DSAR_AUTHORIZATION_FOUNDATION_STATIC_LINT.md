# DSAR — 최소 Static Lint (§44·17종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Lint (17) — 전체 Certification 은 5-8
Permission 없는 Action Handler · Resource Type 없는 Authorization Check · **Tenant Scope 없는 Rebate Permission** · Environment Scope 없는 Production Permission · **Role 이름으로 직접 권한 판정** · **UI 에서만 Permission Check** · **API Endpoint 의 Authorization Hook 누락** · Database RLS 필요 Resource 정책 누락 · **Explicit Deny 처리 누락** · **Deny-by-default 미적용** · **Wildcard Production Permission** · **Credential Secret Read Permission** · Field-level Sensitive 정책 누락 · **Subject·Resource Tenant 비교 누락** · **Policy Version 없는 Decision** · Evidence 없는 Manual Allow · **기존 Authorization Registry 중복 생성**

## 재사용 가능한 현행 CI 가드
- **`tools/guard_headerless_getjson.mjs`**(275차 — **헤더리스 getJson 401 회귀 2차 재발 → CI 가드로 클래스 제거**) = **인가 회귀 Lint 의 실 선례**.
- `npm run e2e` smoke(266차·계약키 가드) · route check · php -l · `.githooks/baseline.json` sacred SHA · CHANGE_GATE 5중 게이트.

## 상태
**계약 명세만 · 코드 구현 0**. 실 Lint 구현 = 후속 승인 세션 · 전체 Certification = **5-8**.
