# DSAR — Approval Case (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §12 = 26). 스펙 원문 나열 텍스트는 **저장소 미영속** — 본 나열은 289차 수령분 기준 전개이며 **원문 대조 필요**(`UNVERIFIED_TRANSCRIPTION`).

## 0. 현행 실측 (file:line)

**★현행에 Case 개념 부재 — Request = Case 혼재.** 현행 4개 승인 테이블은 전부 "요청 1건 = 결재 1건 = 업무 1건"으로 뭉쳐 있어, 여러 요청을 묶는 상위 단위가 없다.

| 현행 | 실측 | 분류 |
|---|---|---|
| `action_request` | `Db.php:592-600` — `id, policy_id, tenant_id, status, action_json, approvals_json, created_at`. Case 참조 컬럼 없음 | **MIGRATION_REQUIRED**(Request로 강등·Case 신설) |
| `mapping_change_request` | `Db.php:623-636` — `+requested_by, approvals_json, required_approvals`. 건별 독립·묶음 없음 | **VALIDATED_LEGACY**(Request 정본) + Case 부재 |
| `admin_growth_approval` | `AdminGrowth.php:142-149` — **tenant_id 없음** · `ref_type/ref_id`로 업무 참조 | **MIGRATION_REQUIRED** |
| `catalog_writeback_job.status='pending_approval'` | `Catalog.php:2341-2364` — 벌크 전이. **묶음 id 없이 `WHERE` 조건으로만 집합 형성**(가장 Case에 근접하나 영속 실체 아님) | **MIGRATION_REQUIRED** |
| `catalog_writeback_approval` | `Catalog.php:86-94` — **고아**(읽는 코드 0·`:2269-2272` 자인) | **CONSOLIDATION_REQUIRED**(제거 대상) |
| APPROVAL_CASE 엔터티 | grep 0 | **NOT_APPLICABLE(부재·grep 0 → 신설)** |

> **§4.2 위배 실측**: `Catalog::approveQueue`는 조건에 걸린 N건을 한 번에 승인하나, 그 **N건을 하나의 Case로 식별할 id가 없다** → 무엇이 함께 승인됐는지 사후 재현 불가.

## 1. CANONICAL_APPROVAL_CASE 필드 (26)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `case_id` | PK |
| 2 | `tenant_id` | **필수**(현행 `admin_growth_approval` 결함 교정) |
| 3 | `workspace_id` | 현행 실체 = `tenant_kv`(`WorkspaceState.php:59`) |
| 4 | `organization_id` | 레지스트리 부재 → 신설 선행 |
| 5 | `legal_entity_id` | 레지스트리 부재 → 신설 선행 |
| 6 | `environment` | `Db::env()` `Db.php:46,57` = `demo`\|`production` |
| 7 | `domain_type` | 스펙 §6(31종) |
| 8 | `case_type` | |
| 9 | `case_key` | 업무 자연키 |
| 10 | `title` | |
| 11 | `description` | |
| 12 | `status` | 스펙 §27 Case Status(22) |
| 13 | `current_version_no` | §14 |
| 14 | `priority` | |
| 15 | `total_amount` | |
| 16 | `currency` | **단일 통화 강제**(§13 금지 4) |
| 17 | `amount_basis` | 합산 근거 |
| 18 | `item_count` | §15 |
| 19 | `requested_by` | Participant 참조 |
| 20 | `requested_at` | |
| 21 | `due_at` | (SLA 로직은 `5-3-6`) |
| 22 | `decided_at` | |
| 23 | `correlation_id` | §34 |
| 24 | `idempotency_key` | §35 |
| 25 | `created_at` | |
| 26 | `updated_at` | |

## 2. 규칙

**Case ≠ Request ≠ Business Resource**(§4.1·§4.2). Case는 **Request 묶음의 식별자**이지 업무 레코드가 아니다 — `catalog_writeback_job`을 Case로 승격하지 말 것(업무 리소스이므로 §4.1 위배). **NOT_APPLICABLE을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤). 본 세션 **코드변경 0** — 실 구현은 별도 승인 세션.
