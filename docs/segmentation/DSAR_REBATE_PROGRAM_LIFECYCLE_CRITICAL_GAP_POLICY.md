# DSAR — Critical Gap 정책 (§43·19종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## Critical Gap (19) — 발생 시 Access Review 차단
1. Active Program 에 Active Version 없음 · 2. **동일 기간 여러 Active Version** · 3. **Approval 없이 Production Activation** · 4. **미래 Version 조기 적용** · 5. 만료 Version 신규 거래 적용 · 6. Terminated Program 신규 Claim 허용 · 7. **Emergency Disable 중 Accrual·Payout 지속** · 8. Program Version 없이 거래 생성 · 9. Funding Agreement Version 누락 · 10. **과거 거래를 현재 Version 으로 덮어쓰기** · 11. Migration Mapping 누락 · 12. **Cross-Tenant Migration** · 13. **Wrong Legal Entity Migration** · 14. **Migration 금액 불일치** · 15. Rollback 불가 상태에서 고위험 Cutover · 16. **Archive 후 Historical Lookup 불가** · 17. **Hard Delete 로 Audit History 손실** · 18. Provider·Internal Version Drift · 19. Pending Claim·Settlement 처리 정책 누락

## 규칙
**엔진 부재는 Gap 이 아니다** → `PROVIDER_LIMITATION` / `NOT_APPLICABLE`(NO_DATA·오탐 처리 금지). Critical 시 **Access Review 차단 + 자동 집행 중지**. Gap 은 **근거(Evidence) 와 함께** 기록.
