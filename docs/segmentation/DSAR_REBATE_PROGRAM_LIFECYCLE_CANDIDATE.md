# DSAR — Lifecycle Candidate (§42)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_LIFECYCLE_CANDIDATE`
candidate_id · request_id · rebate_program · **current_lifecycle · current_version · proposed_state · proposed_version · change_set · amendment · impact_assessment · approval_reference · effective_period · activation_reference · pause_suspension_reference · termination_reference · successor_program · migration_plan · inflight_policy · provider_version · reconciliation_result · risk_level · manual_review_requirement** · evidence

## 목적
Lifecycle 변경 **제안(Candidate)** 을 확정 전 단일 객체로 모아 **Impact·Approval·Reconciliation·Risk 를 한 번에 판정**한다. Candidate 승인 → Transition 실행.

## 규칙
- **risk_level = UNKNOWN 이면 BLOCKED 취급**(fail-closed).
- manual_review_requirement=true 인 Candidate 의 **자동 실행 금지**.
- Candidate 도 Evidence 필수(근거 없는 제안 금지).
