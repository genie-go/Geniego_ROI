# DSAR — Authorization Request (§28)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_REQUEST`
authorization_request_id · subject · resource · action · requested_scopes · authorization_context · **request_source · API_endpoint_reference · UI_feature_reference · service_reference** · requested_at · evaluation_deadline · status · evidence

## ★규칙 — UI·API 동일 Contract (§4.8)
- **UI 메뉴 숨김만으로 보호 금지** — API Gateway · Backend Service · Domain Service · **Database RLS** 가 **동일 Decision Contract** 사용.
- `UI_feature_reference` 와 `API_endpoint_reference` 를 **같은 Request 로 기록** → **UI_API_MISMATCH Reconciliation** 가능(§41).
- **★현행 위험**: PlanPolicy ↔ 프론트 `planMenuPolicy.js` **수동 동기화**(PlanPolicy.php:14) · **286차 rank 맵 붕괴로 드리프트 실현**(UserAuth.php:330) → 5-6 통합 대상.
- **API Endpoint 마다 Resource·Action·Tenant·Environment·Policy Hook 강제**(§44 Lint).
