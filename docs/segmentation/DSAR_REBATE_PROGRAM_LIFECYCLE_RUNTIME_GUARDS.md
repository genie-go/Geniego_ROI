# DSAR — Runtime Guard (§45·21종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 최소 Runtime Guard (21) — 전체 Certification 은 Part 4-5-3-1-7
Invalid Lifecycle Transition · **Unapproved Activation** · Multiple Active Version · Expired Version · **Future Version Early Use** · Wrong Program Version · **Cross-Tenant Version** · Wrong Environment · Suspended Program Transaction · **Emergency Disabled Program Transaction** · Terminated Program New Claim · Archived Program Mutation · Deleted Program Operation · Migration Scope Mismatch · **Migration Mapping Missing** · **Migration Financial Mismatch** · **Wrong Legal Entity Migration** · Rollback Window Expired · Provider Version Conflict · Critical Lifecycle Drift · Kill Switch 활성

## 재사용 가능한 현행 메커니즘
- `auth_tenant` row-level 격리(Cross-Tenant 차단) · **action_request 테넌트 소유 검증(IDOR 차단·208차 P0·Alerting.php:580-582)**.
- **Operator 화이트리스트 422 거부 패턴**(RuleEngine.php:120-121) = 미등록 값 거부 정본.
- **원자적 조건부 UPDATE + rowCount**(CouponRedeem.php:136) = 전이 원자화 정본.
- **Provider push 실패 시 상태 미변경·502**(AutoCampaign.php:602-609) = 발산 차단 정본.
- UNIQUE 선점(BillingMethod.php:151) · Idempotency Key.

## 상태
**계약 명세만**(코드 구현 0). 실 Guard 구현 = 후속 승인 세션.
