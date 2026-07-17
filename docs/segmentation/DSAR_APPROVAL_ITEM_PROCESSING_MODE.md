# DSAR — Approval Item 처리 방식 (§16)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 지원 10 + 차단 5 = 15 = REQ §7(스펙 §16). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

## 0. 현행 실측 (file:line)

| 현행 | 실측 | 분류 |
|---|---|---|
| 전건 일괄 승인 | `Catalog.php:2350-2357` — `WHERE tenant_id=? AND status='pending_approval'`(+옵션 필터) **벌크 UPDATE**. 행별 분기 **불가** | **MIGRATION_REQUIRED**(ALL_OR_NOTHING 유사·단 의도적 설계 아님) |
| 단건 승인 | `Alerting.php:593` · `AdminGrowth.php:1330` · `Mapping.php:287` — 1행 1결정 | **VALIDATED_LEGACY**(SINGLE) |
| 부분승인 | grep 0 | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| 정족수 | `Mapping.php:287` `count($approvals) >= (int)$r["required_approvals"]` — **유일한 실 정족수**(`required_approvals` 컬럼 `Db.php:634` DEFAULT 2) | **CANONICAL_APPROVAL_QUORUM**(승격·재사용) |
| `Alerting` 정족수 | `Alerting.php:562` `"required_approvals" => 2` **리터럴**(DB 컬럼 없음·`Db.php:592-600`) → `:593` **1회 approve = 즉시 approved**. 표시용 장식 | **★MIGRATION_REQUIRED**(UI_API_MISMATCH) |

> **★부분승인 판정**: Item이 부재(grep 0)하므로 부분승인은 **구현 이전에 표현 자체가 불가능**하다.

## 1. 지원 처리 방식 (10)

| # | 방식 | 설명 |
|---|---|---|
| 1 | `SINGLE` | 단일 Item(현행 3경로 대응) |
| 2 | `ALL_OR_NOTHING` | 전건 승인 또는 전건 거부(원자성) |
| 3 | `PARTIAL_APPROVAL` | Item별 승인/거부 분기(§61) |
| 4 | `PER_ITEM_INDEPENDENT` | Item별 완전 독립 Decision |
| 5 | `GROUPED_BY_TYPE` | Item Type 단위 묶음 결정 |
| 6 | `GROUPED_BY_SCOPE` | Scope 단위 묶음(`TeamPermissions.php:41`) |
| 7 | `THRESHOLD_SPLIT` | 금액 임계 기준 분할(상세 로직 = `5-3-5`) |
| 8 | `SEQUENTIAL_ITEM` | Item 순차 처리 |
| 9 | `BULK_FILTERED` | 조건 필터 일괄(현행 `Catalog::approveQueue` 대응 · **Case id 기록 필수**) |
| 10 | `CONDITIONAL_ITEM` | 조건부 승인(§25) |

## 2. 차단 처리 방식 (5)

| # | 차단 | 근거 |
|---|---|---|
| 1 | **승인자 신원 미기록 벌크 승인** | `Catalog.php:2341-2364` — `pending_approval→queued` 벌크 전이 시 **승인자 신원 미기록**(`decided_by` 없음) → **누가 승인했는지 재현 불가**(§20 질문 12 무응답) |
| 2 | **정족수 미충족 상태의 즉시 승인** | `Alerting.php:562` 리터럴 `required_approvals=2` vs `:593` **1회 approve → approved**. 표시와 집행이 불일치 → **가짜 정족수** |
| 3 | **Item 무시 Case 일괄 집행** | Item별 Decision 없이 Case 상태만으로 집행 시 §4.10(1승인 다집행) 위배 |
| 4 | **승인 범위 초과 Item 집행** | Amount·Currency·Action·Scope 초과 차단(§41) — 현행 대조 로직 grep 0 |
| 5 | **미승인 Item 집행** | `Alerting.php:612` status를 SELECT하나 **미판독** → pending/rejected도 실집행(**승인 우회**). 단 `INSERT INTO action_request` **grep 0 → 도달 불가(VACUOUS)** |

## 3. 규칙

차단 5는 **Runtime Guard 강제**(정본 = `DSAR_APPROVAL_FOUNDATION_RUNTIME_GUARDS.md` §47). **차단 5(`Alerting::executeAction`)는 VACUOUS** — 생산자 부재로 현재 도달 불가이므로 **P0 단정 금지**(287차 죽은 스켈레톤 교훈: 생산자 없는 경로를 실장애로 보고하지 말 것). 단 **생산자가 생기는 순간 실 취약점**이 되므로 Foundation 이관 시 status 판독 **필수**. `Mapping.php:287` 정족수 로직을 **재사용**(신설 금지·Golden Rule = Extend). **코드변경 0**.
