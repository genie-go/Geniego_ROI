# DSAR — Program Termination (§25·10 Type)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Entity `REBATE_PROGRAM_TERMINATION`
termination_id · rebate_program_id · **termination_type · reason · contract_termination_reference · requested_at · approved_at · terminated_at · effective_at · new_transaction_policy · pending_claim_policy · pending_accrual_policy · settlement_policy · payout_policy · recovery_policy · data_retention_policy · successor_program** · status · evidence

## Termination Type (10)
NORMAL · EARLY · CONTRACTUAL · PROVIDER_INITIATED · CUSTOMER_INITIATED · REGULATORY · FINANCIAL · SECURITY · EMERGENCY · OTHER

## 규칙
- **Termination 은 의사결정에 의한 종료**(Expiration=자연 만료와 구별).
- **§4.7 종료가 모든 업무 종료는 아니다** — **In-flight Policy 없는 Termination 금지**(Lint 차단 · INFLIGHT_POLICY 연결).
- **Terminated Program 신규 Claim 허용 = Critical Gap**.
- **종료를 이유로 승인된 권리·회계 기록 임의 삭제 금지** · data_retention_policy 필수(법정 보존).
