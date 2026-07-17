# DSAR — Policy Version (§22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_POLICY_VERSION`
authorization_policy_version_id · policy_id · **version_number · previous_version · change_summary · rule_references · effective_from · effective_to · created_at · approved_at · activated_at · immutable_hash · rollback_version** · status · evidence

## ★핵심 규칙
- **현재 Policy 로 과거 Authorization Decision 의 근거를 덮어쓰지 마라**(§22 명시 · 4-5-3-1-4 §4.3/§38 Historical Binding 계승).
- **Approved Version = Immutable Hash 필수**(없으면 Lint 차단).
- **Policy Version 없는 Decision 금지**(§44 Lint · `AUTHORIZATION_POLICY_VERSION_INVALID`).
- **Unknown Policy Version 으로 Production 결정 = Critical Gap**(§43).
- Decision 에 **적용된 policy_versions 기록**(§29) → 사후 재현 가능(Vol4 Explainable).

## 실측
**부재(신설)**. 재사용 가능한 인접 = menu_defaults 스냅샷+version(1-4 §11 Version Component 정본) · `.githooks/baseline.json` sacred SHA(의도적 변경만 통과).
