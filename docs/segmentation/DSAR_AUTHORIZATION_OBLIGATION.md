# DSAR — Authorization Obligation (§30·17종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Obligation (17)
LOG_ACCESS · **LOG_SENSITIVE_ACCESS** · **MASK_FIELDS** · TOKENIZE_FIELDS · **LIMIT_ROWS** · **LIMIT_AMOUNT** · REDACT_EXPORT · REQUIRE_WATERMARK · REQUIRE_REASON · REQUIRE_TICKET · **REQUIRE_APPROVAL** · **REQUIRE_MFA** · REQUIRE_REAUTHENTICATION · REQUIRE_CUSTOMER_NOTICE · REQUIRE_POST_ACTION_REVIEW · **DISABLE_CACHE** · CUSTOM

## 규칙
- **Allow / Conditional Allow 시 Obligation 을 실제로 이행하지 않으면 그 Allow 는 무효** — Obligation 미이행 = 사실상 무단 접근.
- **MASK_FIELDS / TOKENIZE_FIELDS** 는 Field Access Profile 과 정합(§14) · **Field Masking Policy ↔ 실 반환 데이터 Reconciliation**(§41).
- **DISABLE_CACHE** — 고위험/단기 권한은 캐시 금지(§43 "Policy Cache 가 만료 권한 허용" 방지).
- REQUIRE_APPROVAL → **5-3** · REQUIRE_POST_ACTION_REVIEW → **5-5/5-7**(본 블록은 계약만).
