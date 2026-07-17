# DSAR — Authorization Reconciliation (§41)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_RECONCILIATION`
reconciliation_id · subject · resource · action · **comparison_type · source_decision · canonical_decision · difference · severity** · detected_at · resolved_at · resolution · evidence

## 비교 대상 (17)
IdP Role ↔ Internal Role · Tenant Membership ↔ Subject Binding · Workspace Membership ↔ Scope · Organization Role ↔ Program Role · **Legal Entity Scope ↔ Resource Legal Entity** · Provider Permission ↔ Internal Permission · **OAuth Scope ↔ Internal Permission** · **UI Feature Access ↔ API Authorization** · API Gateway ↔ Service Decision · Service Decision ↔ **Database RLS** · **Policy Store Version ↔ Runtime Policy Version** · Subject Role Assignment ↔ Actual Access · **Revoked Role ↔ Active Session** · **Expired Assignment ↔ Cached Decision** · Production Permission ↔ Environment Scope · **Field Masking Policy ↔ Returned Data** · Audit Log ↔ Authorization Decision

## ★현행 실 위험 — UI_API_MISMATCH
**`PlanPolicy` ↔ 프론트 `planMenuPolicy.js` 수동 동기화** — 코드 주석 명시: "프론트 PLAN_TIER_RANK / MENU_MIN_PLAN 과 정합 유지(**변경 시 양쪽 동시 갱신**)"(PlanPolicy.php:14).
**드리프트 실현 이력**: **286차 rank 맵 붕괴**(starter=growth=pro=1 → `requirePro` 가 사실상 'starter+'·UserAuth.php:330) · **275차 헤더리스 getJson 401 회귀 2차 재발** → `tools/guard_headerless_getjson.mjs` CI 가드로 클래스 제거.
→ **자동 Reconciliation 필요**(수동 동기화 의존 = 재발). 실 구현 = **5-6**.
