# DSAR — Permission Candidate (§40)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_PERMISSION_CANDIDATE`
candidate_id · request_id · subject · **subject_roles** · resource · action · tenant · workspace · legal_entity · environment · program · provider_account · **candidate_permissions · candidate_policies · attribute_snapshot · scope_result · conflict_result · field_access_result · proposed_effect · confidence · manual_review_requirement** · evidence

## 목적
Decision 확정 전 **후보 Permission·Policy·Scope·Conflict·Field Access 를 한 객체로 수집** → 판정 근거 재현·디버깅·Access Review(5-7) 입력.

## 규칙
- **confidence 낮음 / manual_review_requirement=true → 자동 ALLOW 금지**.
- attribute_snapshot 은 **Decision 시점 고정**(현재 값으로 과거 재현 금지).
- Candidate 도 **Evidence 필수**.
