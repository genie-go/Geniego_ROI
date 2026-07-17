# DSAR — Attribute Value (§20)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_ATTRIBUTE_VALUE`
attribute_value_id · attribute_id · subject/resource/context reference · value · value_type · **source · source_timestamp · freshness · confidence** · effective_from/to · evidence

## ★규칙 — Stale Attribute 금지
**Stale Attribute 를 이용한 고위험 Authorization Decision 금지**(§20 명시).
- 헌법 Vol3 **Trust READY** 정합(신뢰도 미달 데이터는 자동화/AI 제외).
- 현행 정본 패턴 재사용: PriceOpt **`comp_max_age_hours`**(데이터 신선도 임계·PriceOpt.php:128) — **신선도 초과 시 계산/판정 금지**.
- **freshness 미달 시 `AUTHORIZATION_ATTRIBUTE_STALE_WARNING` → 고위험 Action 은 DENY 또는 REQUIRE_STEP_UP_AUTH**.
- Decision 시점 **Attribute Snapshot** 보존(현재 값으로 과거 Decision 근거 덮어쓰기 금지·4-5-3-1-4 §38 정합).
