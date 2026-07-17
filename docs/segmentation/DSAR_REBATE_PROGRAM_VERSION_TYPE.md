# DSAR — Version Type (§10b·12종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Version Type (12)
INITIAL · MINOR · MAJOR · PATCH · **CORRECTION**(과거 오류 수정·소급 가능·승인+영향목록+역분개 필수) · **AMENDMENT**(장래효 개정·계약 Amendment 연결) · EMERGENCY · MIGRATION · ROLLBACK · PROVIDER_SYNC · LEGACY_IMPORT · RESTORATION

## 규칙
**Amendment 와 Correction 을 구분**한다 — 개정을 정정으로 위장해 과거 소급 금지·정정을 개정으로 위장해 오류 은폐 금지. **정정도 원본 Version 덮어쓰기 금지**(새 Version + 역분개). EMERGENCY=선실행 가능하나 **사후 승인·Review Deadline·Audit 강제**.
