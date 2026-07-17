# DSAR — 기능 회귀 게이트 (§58)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)

## 보존 대상 (회귀 0 검증 대상)
menu_defaults · kr_fee_rule · free_coupons · catalog_writeback_job · auto_campaign(`/v423/auto-campaign/*`) · action_request(`/v410/action_requests`) · EmailMarketing·KakaoChannel 예약 · Attribution backfill · migrate.php·schema_migrations · ensureTables 73 핸들러 · audit_log 12 · baseline.json · GENIE_ENV·`Db::envLabel()`

## 본 블록의 회귀 위험 = 0 (실측 근거)
**코드 변경 0** — `git diff backend/ frontend/ tools/` 결과 없음(이번 세션 전 커밋 대비). 산출물은 **문서 전용**.
→ 기존 Program 검색 · 활성화 · Claim · Accrual · Settlement · Accounting · Reporting 기능 **회귀 0**(변경 자체가 없으므로).

## ★정직 표기 — 본 블록의 구현 수준
스펙 §1·§52 Step 19·§60 은 "Static Lint·Runtime Guard **구현**"을 요구하나, 본 블록 산출은 **계약 명세(문서)까지**이며 **실 코드·테이블·Lint 규칙·Guard 는 0건**이다. 이는 선행 Part 4-5-3-1-1~1-3 의 선례(전부 설계 명세·코드변경 0)와 비파괴 원칙을 따른 것이며, **"구축 완료"가 아니라 "계약 명세 확정"으로 읽어야 한다**. 실 구현 = **고객 Rebate 기능 도입 시 후속 승인 세션**.

## 실 구현 착수 시 게이트 (후속 승인 세션)
1. **CHANGE_GATE 5중 게이트**(10단계 pre-mod · Duplicate Prevention · Change Impact Analysis · Regression Prevention · Repeat-Modification Escalation).
2. **`npm run e2e`(smoke) 배포 전후 실행**(266차 정본) · `e2e:render` · route check · `php -l`.
3. **VALIDATED_LEGACY 재사용 확인**([DUPLICATE_IMPLEMENTATION_AUDIT](DSAR_REBATE_PROGRAM_LIFECYCLE_DUPLICATE_IMPLEMENTATION_AUDIT.md)) — 중복 프레임워크 신설 금지.
4. **Legacy Equivalence·Production Certification 은 Part 4-5-3-1-9** — 본 블록 범위 아님.
5. **배포는 사용자 명시 승인 후**(운영·데모 동반 · 메모리 `feedback_deploy_approval_mandatory`).
