# DSAR — Decision Effect (§29·9종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Final Effect (9)
ALLOW · **DENY** · CONDITIONAL_ALLOW · **REQUIRE_APPROVAL** · **REQUIRE_STEP_UP_AUTH** · **MASK_FIELDS** · RESTRICT_EXPORT · MANUAL_REVIEW · **ERROR**

## 규칙
- **ERROR = DENY 취급(fail-closed)** — 평가 실패를 허용으로 처리 금지.
- CONDITIONAL_ALLOW / MASK_FIELDS / RESTRICT_EXPORT 는 **Obligation 동반 필수**(§30).
- REQUIRE_APPROVAL → **5-3** · REQUIRE_STEP_UP_AUTH → MFA/재인증 · MANUAL_REVIEW 는 **자동 해소 금지**.
- **Effect 를 실 평가 없이 ALLOW 로 기록 금지**(가짜 판정 — 287/288차 fake-looks-real 클래스 정합).
