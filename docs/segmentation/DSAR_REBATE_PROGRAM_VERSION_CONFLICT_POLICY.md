# DSAR — Version 충돌 정책 (§13)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 차단 대상 (8)
1. **동일 Program 의 겹치는 Active Version**
2. **동일 Effective Time 에 2개 이상의 Current Version**
3. 종료일이 시작일보다 이전
4. Parent Version 과 Child Version 의 비호환 Scope
5. **Program Version 과 Funding Agreement Validity 불일치**(4-5-3-1-3)
6. **Program Version 과 Contract Validity 불일치**
7. Program Version 과 Currency Scope 불일치
8. **Program Version 과 Provider Account Environment 불일치**(Production + Sandbox 혼입)

## Error
`REBATE_PROGRAM_MULTIPLE_ACTIVE_VERSION` · `REBATE_PROGRAM_VERSION_OVERLAP` · `REBATE_PROGRAM_VERSION_GAP` · `REBATE_PROGRAM_ACTIVE_VERSION_MISSING`

## 규칙
Version Gap(어느 Version 도 유효하지 않은 구간)도 **Warning 이상**(무규칙 거래 발생 위험). 검출은 Static Lint + Runtime Guard **양면**.
