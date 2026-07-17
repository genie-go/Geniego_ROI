# DSAR — In-flight Policy (§39)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_INFLIGHT_POLICY`
inflight_policy_id · program · **source_version · target_version · entity_type · handling_policy · cutoff_at · reevaluation_requirement · notification_requirement · accounting_impact** · status · evidence

## 대상 (10)
Pending Eligibility · Pending Claim · Submitted Claim · Approved Claim · Pending Accrual · Approved Accrual · Settlement Pending · Payout Pending · Dispute · Recovery

## 처리 정책 (9)
KEEP_SOURCE_VERSION · MOVE_TO_TARGET_VERSION · REEVALUATE · **GRANDFATHER** · CANCEL · COMPLETE_THEN_MIGRATE · MANUAL_REVIEW · SPLIT_BY_EFFECTIVE_DATE · CUSTOM

## 규칙
- **§4.7 Program 종료가 모든 업무 종료는 아니다** → **In-flight Policy 없는 Termination / Migration 금지**(Lint 차단).
- **진행 중 Claim 을 신버전 요율로 재계산 금지**(HISTORICAL_BINDING §4.10 정합) — 기본 KEEP_SOURCE_VERSION.
- **Terminal 전이가 in-flight 를 무단 폐기 금지**(CANCEL 은 명시 정책 + 통지 + 승인).
- 불리 변경 시 **GRANDFATHER + notification** 검토.
