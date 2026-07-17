# DSAR — Policy Conflict (§33)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_POLICY_CONFLICT`
conflict_id · authorization_request · **conflicting_policies · conflicting_effects · priority_comparison · scope_comparison · resolution_strategy · resolved_effect · severity** · detected_at · status · evidence

## Resolution Strategy (7)
**EXPLICIT_DENY_WINS**(기본) · HIGHEST_PRIORITY · MOST_SPECIFIC_SCOPE · **RESTRICTIVE_EFFECT_WINS** · REQUIRE_APPROVAL · MANUAL_REVIEW · **BLOCK**

## 규칙
- **★Production 에서 해결되지 않은 Critical Conflict 는 접근 차단**(§33 명시).
- 우선순위: **Explicit Deny → 높은 Priority → 구체적 Scope → 더 제한적인 Effect**.
- **Conflict 를 조용히 무시하고 Allow 금지** — 탐지 시 기록 + Warning/Error.
- **실측: 현행 Conflict 개념 자체가 부재**(단일 게이트 통과/차단) → 신설.
