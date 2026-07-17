# DSAR — Lifecycle State (§7·36종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.1
> 통합 정본(개요·실측 요약): [`CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md`](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md) · [`CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md) · ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md)
> **실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션. 본 문서=계약 명세.**

## State (36)
DISCOVERED · REGISTERED · DRAFT · CONFIGURING · VALIDATION_PENDING · VALIDATION_FAILED · REVIEW_PENDING · APPROVAL_PENDING · APPROVED · SCHEDULED · ACTIVATING · **ACTIVE** · ACTIVE_WITH_WARNINGS · PAUSING · PAUSED · RESUMING · SUSPENDING · SUSPENDED · **EMERGENCY_DISABLED** · EXPIRING · EXPIRED · TERMINATING · TERMINATED · SUPERSEDED · MIGRATION_PENDING · MIGRATING · MIGRATED · ARCHIVING · ARCHIVED · DELETION_PENDING · DELETED · RESTORATION_PENDING · RESTORED · BLOCKED · FAILED · UNKNOWN

## 실측 대비
| Canonical | 현행 인접 | 근거 |
|---|---|---|
| ACTIVE / PAUSED | auto_campaign `status: active\|paused` | AutoCampaign.php:490/504 |
| SCHEDULED | EmailMarketing `scheduled_at`+`status 'draft'`+예약 큐 | EmailMarketing.php:57/83/101 |
| SUPERSEDED | catalog_writeback_job `status='superseded'` | Catalog.php:1188 |
| EXPIRED | free_coupons `valid_until`(NULL=무기한) | CouponRedeem.php:67 |
| 나머지 32종 | **부재→신설** | — |

## 규칙
**State=Canonical Enum**. **§4.2 Provider 문자열 그대로 저장 금지**(Mapping+Confidence). Terminal(TERMINATED/DELETED) 재전이 금지. UNKNOWN=fail-closed(자동 지급/집행 금지).
