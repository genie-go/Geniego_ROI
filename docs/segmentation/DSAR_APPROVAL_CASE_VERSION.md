# DSAR — Approval Case Version (§14)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §14 = 15). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 (file:line)

**★Version 개념 전면 부재(승인 측·grep 0).** 현행 4개 승인 테이블 어디에도 version/revision 컬럼이 없다.

| 현행 | 실측 | 분류 |
|---|---|---|
| `action_request` | `Db.php:592-600` — version 컬럼 **없음**. `UPDATE ... SET approvals_json=?, status=?`(`Alerting.php:594`) **제자리 덮어쓰기** | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| `mapping_change_request` | `Db.php:623-636` — version 컬럼 **없음**. `UPDATE`(`Mapping.php:288`) 제자리 갱신 | **NOT_APPLICABLE** |
| `admin_growth_approval` | `AdminGrowth.php:142-149` — version 컬럼 **없음** | **NOT_APPLICABLE** |
| `catalog_writeback_job` | `Catalog.php:2355` — 상태만 갱신 | **NOT_APPLICABLE** |
| `FeedTemplate` | `FeedTemplate.php:248-285` — `draft/submitted/approved/published` 상태는 있으나 **버전 스냅샷 아님**(전이 후 이전 내용 복원 불가) | **MIGRATION_REQUIRED** |
| APPROVAL_CASE_VERSION | grep 0 | **NOT_APPLICABLE(부재 → 신설)** |

> **§4.4/§4.5 위배 실측**: 승인 후 원본이 바뀌어도 **승인 당시 상태를 되짚을 수단이 없다**. `approvals_json` 은 승인자 목록일 뿐 **내용 스냅샷이 아니다**.

## 1. CANONICAL_APPROVAL_CASE_VERSION 필드 (15)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `case_version_id` | PK |
| 2 | `case_id` | FK → APPROVAL_CASE |
| 3 | `tenant_id` | 격리 필수 |
| 4 | `version_no` | 단조증가 |
| 5 | `version_type` | 스펙 §8 Version Type(10) 재사용 |
| 6 | `status_at_version` | §27 |
| 7 | `content_hash` | 변경 탐지 |
| 8 | `snapshot_json` | **승인 당시 Case 전문 고정**(§4.4) |
| 9 | `item_count_at_version` | |
| 10 | `total_amount_at_version` | |
| 11 | `currency_at_version` | |
| 12 | `change_summary` | |
| 13 | `superseded_by_version_no` | §39 |
| 14 | `created_by` | |
| 15 | `created_at` | |

## 2. 규칙

**Append-only**(§4.9) — Version 행은 **UPDATE·DELETE 금지**. 현행의 제자리 덮어쓰기(`Alerting.php:594`·`Mapping.php:288`)를 **Version 생성으로 대체**하되, 기존 컬럼은 **보존**(비파괴·Golden Rule = Extend). Critical Field 변경 시 재승인 검토(§4.5) 판정 정본 = `DSAR_APPROVAL_CRITICAL_FIELD_CHANGE_POLICY.md`(§31). `snapshot_json`은 **Case 메타 스냅샷**이고 원본 업무 데이터 스냅샷은 `DSAR_APPROVAL_RESOURCE_SNAPSHOT.md`(§30) — **혼동·중복 신설 금지**. **코드변경 0**.
