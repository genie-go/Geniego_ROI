# DSAR — Approval Item (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §15 필드 = 25). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 (file:line)

**★Item(품목) 개념 전면 부재(grep 0) — 현행 승인은 전부 "단일 레코드 1건 승인"이다.**

| 현행 | 실측 | 분류 |
|---|---|---|
| `action_request` | `Db.php:592-600` — 1행 = 1승인. `action_json` 안에 payload가 있으나 **행 단위 분해·개별 결정 불가** | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| `mapping_change_request` | `Db.php:623-636` — 1행 = `(platform, field, raw_value, canonical_value)` **단일 매핑 1건**. 다품목 구조 없음 | **NOT_APPLICABLE** |
| `admin_growth_approval` | `AdminGrowth.php:142-149` — `ref_type`/`ref_id` **단수 참조 1건** | **NOT_APPLICABLE** |
| `catalog_writeback_job` | `Catalog.php:2350-2357` — N행을 **벌크 UPDATE**하나 각 행은 **독립 job**이며 Item이 아님. 승인은 `WHERE` 조건 일괄이라 **행별 승인/거부 분기 불가** | **MIGRATION_REQUIRED**(가장 근접 → Item 후보) |
| 부분승인(Partial Approval) | grep 0 | **NOT_APPLICABLE(부재 → 신설)** |
| APPROVAL_ITEM | grep 0 | **NOT_APPLICABLE(부재 → 신설)** |

> **§4.2 위배 실측**: 스펙 §0 질문 9(하나의 요청에 여러 승인 항목)·10(항목별 결과 분기)에 대해 현행 답은 **전부 "불가"**다.

## 1. CANONICAL_APPROVAL_ITEM 필드 (25)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `item_id` | PK |
| 2 | `case_id` | FK → APPROVAL_CASE |
| 3 | `request_id` | FK → APPROVAL_REQUEST |
| 4 | `tenant_id` | 격리 필수 |
| 5 | `item_no` | Case 내 순번 |
| 6 | `item_type` | §15 Item Type(14) |
| 7 | `domain_type` | §6 |
| 8 | `resource_type` | §9 |
| 9 | `resource_id` | 업무 레코드 참조(**동일시 금지**·§4.1) |
| 10 | `resource_version` | Drift 탐지(§4.5) |
| 11 | `action` | §10 · `TeamPermissions::ACTIONS` 재사용(`TeamPermissions.php:39`) |
| 12 | `title` | |
| 13 | `amount` | |
| 14 | `currency` | **Item 단위 고정**(§13 금지 4) |
| 15 | `fx_rate_at_request` | `fxToKrw` `Connectors.php:1749` 환율 **시점 고정** |
| 16 | `quantity` | |
| 17 | `scope_json` | `TeamPermissions::DATA_SCOPES` 재사용(`:41`) |
| 18 | `status` | Item 독립 상태 |
| 19 | `decision_id` | **Item별 독립 Decision**(§22) |
| 20 | `processing_mode` | §16(10) |
| 21 | `requirement_id` | §17 |
| 22 | `snapshot_id` | §30 |
| 23 | `parent_item_id` | 계층 |
| 24 | `created_at` | |
| 25 | `updated_at` | |

## 2. 규칙

**Item ≠ Business Resource**(§4.1) — `resource_id`는 **참조**이지 소유가 아니다. Item별 **독립 Decision**(§61)이 부분승인의 전제이며, Decision은 Append-only(§4.9). `catalog_writeback_job`을 Item으로 **승격**할 때 기존 벌크 경로(`Catalog.php:2341-2364`)는 **보존**하고 Item 경로를 **추가**(비파괴·Golden Rule = Extend·중복 신설 금지). **코드변경 0** — 실 구현은 별도 승인 세션.
