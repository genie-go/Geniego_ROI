# DSAR — Static Lint (§44·20종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 최소 Static Lint (20) — 전체 Certification 은 Part 4-5-3-1-7
1. Active Program 에 Active Version 없음 · 2. **동일 기간 다중 Active Version** · 3. Effective From 없는 Version · 4. **Immutable Hash 없는 Approved Version** · 5. **Version 없이 Program 변경** · 6. **Program Version 과 Rule Version 혼용** · 7. **Recorded Time 과 Effective Time 혼용** · 8. Approval Reference 없는 Activation · 9. **Rollback Plan 없는 Critical Change** · 10. **Impact Assessment 없는 Breaking Change** · 11. **In-flight Policy 없는 Termination·Migration** · 12. Historical Binding 없는 Transaction · 13. **Future Version 조기 적용** · 14. **Current Version 으로 과거 거래 덮어쓰기** · 15. **Hard Delete 기본 사용** · 16. **Migration Idempotency 누락** · 17. Migration Validation 누락 · 18. Source·Target Tenant 검증 누락 · 19. **Evidence 없는 Emergency Change** · 20. **기존 Version Registry 중복 생성**

## 재사용 가능한 현행 게이트
`.githooks/baseline.json` sacred SHA(의도적 변경만 통과·267차) · CHANGE_GATE 5중 게이트 · `npm run e2e` smoke(266차) · route check · php -l.

## 상태
**본 블록은 Lint 규칙의 계약 명세만**(코드 구현 0). 실 Lint 구현 = 고객 Rebate 기능 도입 시 후속 승인 세션 · 전체 Certification = **Part 4-5-3-1-7**.
