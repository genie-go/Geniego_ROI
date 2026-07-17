# DSAR — Approval Case Status (§27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §27 Case Status = 22). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 (file:line)

| 현행 상태값 | 실측 | 분류 |
|---|---|---|
| `action_request.status` | `Db.php:596` VARCHAR(50) — **CHECK/ENUM 없음**. 관측값 `pending`/`approved`/`rejected`/`executed`/`failed`/`approved_manual`(`Alerting.php:593,608-611`) | **MIGRATION_REQUIRED**(자유문자열) |
| `mapping_change_request.status` | `Db.php:631` `DEFAULT 'pending'` — `pending`→`approved`(`Mapping.php:287`)→`applied`(`:327`) | **VALIDATED_LEGACY**(3값 준-상태기계) |
| `admin_growth_approval.status` | `AdminGrowth.php:1321` — `pending`/`approved`/`rejected` **3값 화이트리스트 검증** | **VALIDATED_LEGACY** |
| `catalog_writeback_job.status` | `Catalog.php:2350,2355` — `pending_approval`→`queued` | **VALIDATED_LEGACY** |
| `FeedTemplate` 상태전이 | `FeedTemplate.php:248-285` — `draft→submitted→approved→published` **순차 강제·역행 차단·`must_approve_first` 409** | **CANONICAL_APPROVAL_STATUS**(★현행 유일한 명시적 상태전이 강제 · **승격·재사용**) |
| **Case** 단위 상태 | grep 0(Case 개념 부재) | **NOT_APPLICABLE(부재·grep 0 → 신설)** |

> **핵심**: 현행 상태는 전부 **Request 단위**다. Case 단위 상태(부분승인 집계·혼합 결과)는 **전면 부재**.

## 1. CANONICAL_APPROVAL_CASE_STATUS (22)

| # | 상태 | 의미 |
|---|---|---|
| 1 | `DRAFT` | 작성 중 |
| 2 | `SUBMITTED` | 제출됨 |
| 3 | `VALIDATING` | 요건 검증 중 |
| 4 | `VALIDATION_FAILED` | 요건 미충족 |
| 5 | `PENDING` | 승인 대기 |
| 6 | `IN_REVIEW` | 검토 중 |
| 7 | `PARTIALLY_APPROVED` | **Item 일부 승인**(§16) |
| 8 | `APPROVED` | 전건 승인 |
| 9 | `CONDITIONALLY_APPROVED` | 조건부(§25) |
| 10 | `CHANGES_REQUESTED` | 보완 요구 |
| 11 | `PARTIALLY_REJECTED` | 일부 거부 |
| 12 | `REJECTED` | 거부(§4.7 — Authorization Deny 아님) |
| 13 | `WITHDRAWN` | **요청자** 철회(§36) |
| 14 | `CANCELLED` | **관리자/시스템** 취소(§37) |
| 15 | `EXPIRED` | 기한 만료 |
| 16 | `SUPERSEDED` | 신 Version이 대체(§39) |
| 17 | `REOPENED` | 재개(§38) |
| 18 | `EXECUTING` | 집행 중 |
| 19 | `EXECUTED` | 집행 완료 |
| 20 | `EXECUTION_FAILED` | 집행 실패 |
| 21 | `RECONCILING` | 대사 중(§43) |
| 22 | `CLOSED` | 종결 |

## 2. 규칙

**§4.8 5구분 강제**: `WITHDRAWN`/`CANCELLED`/`REJECTED`/`EXPIRED`/`SUPERSEDED`는 **서로 다른 상태** — 현행처럼 `rejected` 하나로 뭉개지 말 것. **§4.7**: Authorization Deny(권한 없음·403)는 Case 상태가 **아니다**. 상태 전이 통제는 `FeedTemplate.php:248-285` 패턴을 **확장**(신설 금지·Golden Rule). 전이 목록 정본 = `DSAR_APPROVAL_ALLOWED_TRANSITIONS.md`(§29). **코드변경 0**.
