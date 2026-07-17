# DSAR — Approval Requirement (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §17 필드 = 25). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 (file:line) — ★핵심: Requirement ≠ Decision (§4.3)

**승인 "필요성"(Requirement)과 승인 "결과"(Decision)는 다른 것이다.** 현행은 이 둘이 **숫자 하나로 뭉개져** 있거나 **아예 없다**.

| 현행 | Requirement 표현 | 실측 | 분류 |
|---|---|---|---|
| `mapping_change_request` | **`required_approvals INT DEFAULT 2`** — 현행 **유일한 정족수 컬럼** | `Db.php:634` · 판정 `Mapping.php:287` | **VALIDATED_LEGACY** + **MIGRATION_REQUIRED**(필요성이 **숫자 1개**로 축약 — *왜* 2명인지·*어떤 정책*이 요구했는지 **기록 없음**) |
| `action_request` | **required_approvals 컬럼 없음**(`Db.php:592-600`) | `Alerting.php:562` `=> 2` **리터럴**(표시용 장식) | **★MIGRATION_REQUIRED**(Requirement 부재 → 1회 approve = approved `:593`) |
| `admin_growth_approval` | 정족수 개념 없음 · **단일 결재**(`decided_by` 1명) | `AdminGrowth.php:142-149,1330` | **MIGRATION_REQUIRED** |
| `catalog_writeback_job` | 정족수 없음 · 조건 필터 벌크 | `Catalog.php:2350-2357` | **MIGRATION_REQUIRED** |
| Requirement **발생 근거**(어떤 Policy·Role이 승인을 요구했나) | grep 0 | — | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| `PlanPolicy` | `PlanPolicy.php:12` **fail-open**(주석 자인) | — | **★MIGRATION_REQUIRED**(Requirement 산출 근거로 쓰면 **요건 누락 시 통과**) |

> **§0 질문 7("어떤 Policy와 Role이 승인 필요성을 발생시켰는가")에 대한 현행 답 = 전 경로 무응답.**

## 1. CANONICAL_APPROVAL_REQUIREMENT 필드 (25)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `requirement_id` | PK |
| 2 | `case_id` | FK |
| 3 | `request_id` | FK |
| 4 | `item_id` | NULL 가능(Case 단위 요건) |
| 5 | `tenant_id` | 격리 필수 |
| 6 | `requirement_type` | §17 Type(20) |
| 7 | `requirement_source_id` | **FK → §18**(왜 필요한가) |
| 8 | `domain_type` | §6 |
| 9 | `is_mandatory` | |
| 10 | `required_approvals` | ★현행 `Db.php:634` **승격·재사용** |
| 11 | `required_role` | `TeamPermissions.php:39/41` 재사용 |
| 12 | `required_scope` | |
| 13 | `required_participant_type` | §19 |
| 14 | `threshold_amount` | 임계 로직 상세 = `5-3-5` |
| 15 | `threshold_currency` | |
| 16 | `condition_expr` | |
| 17 | `evaluation_status` | **PENDING/SATISFIED/UNSATISFIED/WAIVED** |
| 18 | `satisfied_at` | |
| 19 | `satisfied_by_decision_id` | **→ Decision 참조(결과)** |
| 20 | `waived_reason` | |
| 21 | `policy_reference_id` | §33 |
| 22 | `policy_version` | **승인 시점 고정**(§4.6) |
| 23 | `evaluated_at` | |
| 24 | `created_at` | |
| 25 | `updated_at` | |

## 2. 규칙

**§4.3 분리 강제**: Requirement는 *"2명의 finance role 승인이 필요하다"*(**필요성**), Decision은 *"홍길동이 승인했다"*(**결과**). 필드 19가 **유일한 연결점**이며, **Requirement 테이블에 결정 내용을 쓰지 말 것**(현행 `approvals_json` 혼재가 반례). **Requirement 미충족 시 fail-closed**(Unknown ≠ Satisfied) — `PlanPolicy.php:12` **fail-open을 Requirement 판정에 사용 금지**. 현행 `required_approvals`(`Db.php:634`)는 **삭제 아닌 승격**(비파괴·Golden Rule = Extend). **코드변경 0**.
