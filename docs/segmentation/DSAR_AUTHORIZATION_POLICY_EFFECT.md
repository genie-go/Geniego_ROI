# DSAR — Policy Effect (§23)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Effect (8)
ALLOW · **DENY** · CONDITIONAL_ALLOW · **REQUIRE_APPROVAL** · **REQUIRE_STEP_UP_AUTH** · **MASK_FIELDS** · RESTRICT_EXPORT · MANUAL_REVIEW

## 규칙
- **§4.2 Explicit Deny 우선** — Allow 와 Deny 충돌 시 **DENY**. Break Glass·Emergency Exception 은 **5-5 전용 정책으로만** 제한적 허용.
- CONDITIONAL_ALLOW 는 반드시 **Obligation 동반**(§30).
- REQUIRE_APPROVAL → 승인 워크플로 = **5-3**(본 블록은 Effect 계약만).
- REQUIRE_STEP_UP_AUTH → **Production Credential 사용·고위험 Action**(§34·§36).
- MANUAL_REVIEW 는 **자동 해소 금지**.
