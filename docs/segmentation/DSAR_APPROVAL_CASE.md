# DSAR — Approval Case (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §12** — 원문 나열 실측 **28 필드**.

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

## 1. 스펙 §12 `APPROVAL_CASE` 필수 필드 전사 — 원문 실측 **28개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §12**

> 🔴 **REQ 집계 26 ↔ 원문 실측 28 — 원문이 정본.**
> REQ `§7` 표의 *"§12 Approval Case 필드 = **26**"* 은 **원문 나열과 2건 어긋난다**(원문 나열 실측 = 28).
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**
>
> 🔴 **본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다.** 초판은 REQ 개수 26 에 맞춘 **항목명 날조**였고 —
> `case_id`·`case_type`·`case_key`·`title`·`description`·`priority`·`total_amount`·`amount_basis`·`item_count`·`due_at`·`idempotency_key`·`updated_at` 등은 **원문 §12 에 존재하지 않는다**.
> **개수가 맞아도 항목명이 날조면 그것이 351 사건이다.** 아래는 원문 나열 전사다.

**원문 §12 서술**: *"Approval Engine이 실제로 관리하는 최상위 실행 단위다."*
**§0 실측: 현행에 Case 개념 부재 — Request = Case 혼재** → **28 필드 전부 부재**가 §0 정합 판정이다.

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_case_id` | **부재** — §0 "APPROVAL_CASE 엔터티 grep 0" · **NOT_APPLICABLE(신설)** |
| 2 | `case_number` | **부재** — §0 Case 개념 부재 · **NOT_APPLICABLE(신설)** |
| 3 | `approval_request_id` | **부재(FK)** — §0 "Case 참조 컬럼 없음"(`action_request` Db.php:592-600) · **MIGRATION_REQUIRED** |
| 4 | `approval_request_version_id` | **부재** — §0 Case·Version 양축 부재 · **NOT_APPLICABLE(신설)** |
| 5 | `approval_domain_type` | **부재** — §0 Case 부재 · **NOT_APPLICABLE(신설)** |
| 6 | `workflow_definition_reference` | **부재** — §0-DOMAIN 실측: Workflow/State Machine/BPMN/Temporal/Camunda/Flowable/Zeebe/Step Functions **backend/src grep 0** · **NOT_APPLICABLE(신설 · `5-3-2` 범위)** |
| 7 | `workflow_version_reference` | **부재** — §0 동일(Workflow 엔진 전무) · **NOT_APPLICABLE(신설)** |
| 8 | `policy_reference` | **부분** — ※인접 실물 `action_request.policy_id`(Db.php:594) = Requirement 출처 유일 흔적 · **LEGACY_ADAPTER**. Case 행 단위로는 **부재** |
| 9 | `policy_version_reference` | **부재** — `policy_version` grep 0 · **NOT_APPLICABLE(신설)** |
| 10 | `tenant_id` | **부재(Case 행)** — Case 자체 부재. ※§0 `admin_growth_approval` 은 **tenant_id 없음**(AdminGrowth.php:142-149) · **MIGRATION_REQUIRED** |
| 11 | `workspace_id` | **부재** — Workspace 레지스트리 부재(실체 = `tenant_kv` WorkspaceState.php:59) · **NOT_APPLICABLE(신설)** |
| 12 | `organization_id` | **부재** — Organization 레지스트리 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 13 | `legal_entity_id` | **부재** — Legal Entity 레지스트리 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 14 | `environment` | **부재(Case 행)** — `Db::env()`(Db.php:46,57) = `demo`\|`production` **프로세스 전역**이며 **행 단위 컬럼 아님** · **LEGACY_ADAPTER** |
| 15 | `case_owner` | **부재** — §0 Case 부재 · **NOT_APPLICABLE(신설)** |
| 16 | `current_stage_reference` | **부재** — §0 Workflow 엔진 grep 0 · **NOT_APPLICABLE(신설 · `5-3-2` 범위)** |
| 17 | `current_step_reference` | **부재** — §0 동일 · **NOT_APPLICABLE(신설 · `5-3-2` 범위)** |
| 18 | `total_item_count` | **부재** — Item 개념 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 19 | `pending_item_count` | **부재** — 동일 · **NOT_APPLICABLE(신설)** |
| 20 | `approved_item_count` | **부재** — 동일 · **NOT_APPLICABLE(신설)** |
| 21 | `rejected_item_count` | **부재** — 동일 · **NOT_APPLICABLE(신설)** |
| 22 | `cancelled_item_count` | **부재** — 동일 · **NOT_APPLICABLE(신설)** |
| 23 | `overall_effect` | **부재** — §0 Case 단위 결과 집계 없음 · **NOT_APPLICABLE(신설)** |
| 24 | `opened_at` | **부재(Case 행)** — ※Request 행 `created_at` VARCHAR(32)(Db.php:599,635)는 존재 |
| 25 | `completed_at` | **부재** — §0 Case 부재 · **NOT_APPLICABLE(신설)** |
| 26 | `expires_at` | **부재** — `expires_at` grep 0 · **NOT_APPLICABLE(신설)** |
| 27 | `status` | **부재(Case 행)** — ※Request 행 `status` 는 존재(§27). **Case 단위 상태는 전면 부재** |
| 28 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: 원문 28 = **존재 0** + **부분 1**(8 `policy_reference`) + **부재 26** + **판정 유보 1**(28).

### 1-1. §4.2 위배 실측과의 정합

§0 은 `Catalog::approveQueue` 가 조건에 걸린 N건을 한 번에 승인하나 **그 N건을 하나의 Case로 식별할 id가 없다**(Catalog.php:2341-2364)고 기록한다 — 원문 필드 **1 `approval_case_id`** · **2 `case_number`** · **18~22 item_count 계열** 이 정확히 그 공백이다.

⇒ **무엇이 함께 승인됐는지 사후 재현 불가**. 원문 §12 전 28 필드가 부재라는 판정은 §0 과 **정합**(모순 0).

## 2. 규칙

**Case ≠ Request ≠ Business Resource**(§4.1·§4.2). Case는 **Request 묶음의 식별자**이지 업무 레코드가 아니다 — `catalog_writeback_job`을 Case로 승격하지 말 것(업무 리소스이므로 §4.1 위배). **NOT_APPLICABLE을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤). 본 세션 **코드변경 0** — 실 구현은 별도 승인 세션.
