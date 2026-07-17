# DSAR — Authorization Evidence (§48)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_EVIDENCE`
evidence_id · authorization_request · authorization_decision · subject_reference · resource_reference · action · **role_references · permission_references · policy_references · policy_versions · attribute_snapshot_reference · scope_snapshot_reference · context_reference · matched_rules · denied_rules · obligations** · effective_at · evaluated_at · **result_hash · lineage · audit_reference**

## ★저장 금지 (강행)
**Token · Password · Credential Secret · Bank Account 원문 · 불필요한 개인정보 저장 금지**(§48 명시 · 헌법 No-PII · 메모리 `feedback_credentials_handling`).
→ **Reference + hash 만**.

## 규칙
**Evidence 없는 Manual Allow 금지**(§44 Lint) · lineage 로 **"왜 이 Decision 이었는가" 재현 가능**(§4.10 · Vol4 Explainable) · attribute/scope snapshot 은 **Decision 시점 고정**.
