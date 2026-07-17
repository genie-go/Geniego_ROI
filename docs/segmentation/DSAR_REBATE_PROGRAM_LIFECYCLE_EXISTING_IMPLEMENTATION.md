# DSAR — 기존 구현 분류 (§50)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본: [CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## 분류 결과 (전부 실측 file:line 근거)

| 현행 구현 | 분류 | 근거 |
|---|---|---|
| menu_defaults(snapshot_data + version + baseline 캡처 + 복원) | **VALIDATED_LEGACY**(재사용) | AdminMenu.php:119-120 / 294-308 / 584 / 625 |
| catalog_writeback_job `status='superseded'`(판정 제외) | **VALIDATED_LEGACY** | Catalog.php:1188 / 1871-1873 / 1187 |
| auto_campaign kill-switch 정직성(push 실패 시 상태 미변경·502) | **VALIDATED_LEGACY**(Transition Enforcement 정본) | AutoCampaign.php:473 / 602-609 |
| migrate.php + schema_migrations + `-- @rollback` + `--dry-run` | **VALIDATED_LEGACY**(Migration 정본·중복 신설 금지) | bin/migrate.php:13 / 15 / 48 / 112 |
| **action_request 승인 워크플로**(decision/approvals_json/status·IDOR 차단) | **VALIDATED_LEGACY**(Approval 정본·**v2.1 신규 반영** — 초판 누락) | Alerting.php:545-546 / 578-582 / 608-611 |
| **EmailMarketing·KakaoChannel 예약 실행**(scheduled_at·큐·attempts·드레인 워커) | **VALIDATED_LEGACY**(SCHEDULED Activation 인접·**v2.1 신규 반영**) | EmailMarketing.php:57 / 83 / 101-103 |
| **Attribution::backfillOwnedTouches**(과거 터치 소급 생성·윈도 제한) | **VALIDATED_LEGACY**(Backfill 인접·**v2.1 정정** — 초판 "부재"는 오류) | Attribution.php:282 |
| free_coupons valid_until / usable_from(NULL=무기한) | **VALIDATED_LEGACY** | CouponRedeem.php:67-68 |
| audit_log 12파일(도메인별) | **KEEP_SEPARATE_WITH_REASON**(스키마·도메인 상이) | AdminGrowth.php:157 · AdminMenu.php:123 · Dsar.php:213 |
| ensureTables 73 핸들러(172차 이후 스키마 진화) | **KEEP_SEPARATE_WITH_REASON**(선언적 자가치유 · Migration 원장과 목적 상이) | 73 핸들러 |
| baseline.json sacred SHA | **VALIDATED_LEGACY**(Version Gate) | .githooks |
| **kr_fee_rule.effective_from** | **VALIDATED_LEGACY + ★MIGRATION_REQUIRED** — `:459` 가 거래일 무관 최신 요율로 과거 정산라인 재검증(as-of 아님) · **별도 승인 세션**(라이브 확인 필요 · FP 규약상 PM 코드 재증명 전 P0 단정 금지 · 본 세션 비파괴 미수정) | KrChannel.php:151 / 459 / 462 / 471 |
| Feature Flag Registry | **NOT_APPLICABLE(부재·grep 0)** | `feature_flag/featureFlag` 0 |
| Incident Registry / Postmortem | **NOT_APPLICABLE(부재·grep 0)** | `incident` 0 |
| Deployment Registry | **NOT_APPLICABLE(부재·grep 0)** | CI inert · 수동 pscp/plink |
| Migration Batch / Checkpoint / 금액 Validation / Dual Run / Shadow | **NOT_APPLICABLE(부재·grep 0)** | `migration_batch/batch_sequence` 0 |
| Contract / Provider / Rule / Claim / Accrual / Settlement Migration · Historical Program Mapping | **NOT_APPLICABLE(부재·grep 0 각각)** | 각 키워드 0 |
| Contract Version / Product Taxonomy Version / Customer Identity Version / Provider Account Version Registry | **NOT_APPLICABLE(부재·grep 0 각각)** | 스펙 §3 선행조건이나 실측 부재 |
| Program Clone / Program Revision | **오탐 확정(부재)** — `clone`=PHP object clone(ChannelSync.php:2200)·XML `cloneNode`(EnterpriseAuth.php:609) · `revision`=Klaviyo API 버전 헤더(Connectors.php:4670) | — |
| Rebate Program Status / Lifecycle / Version(rebate) | **NOT_APPLICABLE(부재·grep 0)** | `rebate` 전무 |

## 규칙
**VALIDATED_LEGACY 는 재사용 강제**(헌법 Golden Rule = Replace 가 아니라 Extend). **NOT_APPLICABLE 을 "있다고 가정"하고 배선 금지**(287차 action_request 생산자 전무한 죽은 스켈레톤 교훈).
