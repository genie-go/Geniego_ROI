# DSAR — Approval Item Type (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §15 "Item Type"** — 원문 나열 실측 **14종**. ✅ REQ 집계 14 와 **개수 일치**.

## 0. 현행 실측 (file:line)

| 현행 유형 축 | 실측 | 분류 |
|---|---|---|
| `admin_growth_approval.ref_type` | `AdminGrowth.php:1335,1337` — `content` / `live_mode` / `campaign_launch`(`:1340` 주석) **3종** | **MIGRATION_REQUIRED**(Item Type 아님 = **Resource Type**에 가까움) |
| `action_request` action type | `Alerting.php:560` — `$action["type"] ?? $action["action_type"] ?? "writeback"` **JSON 자유값·화이트리스트 없음** | **MIGRATION_REQUIRED** |
| `catalog_writeback_job.operation` | `Catalog.php:2348,2351` — 요청 body의 자유 문자열로 필터 | **MIGRATION_REQUIRED** |
| `mapping_change_request` | `Db.php:623-636` — 유형 컬럼 **없음**(매핑 변경 단일 용도) | **NOT_APPLICABLE** |
| **REBATE_\*** | grep 0 — **승인 대상 엔티티 자체가 부재** | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| Item Type 열거 | grep 0(Item 부재) | **NOT_APPLICABLE(부재 → 신설)** |

> **주의**: 현행 `ref_type`/`operation`/`action_type`은 **Item Type이 아니라 Resource·Action 축**이다. 이를 Item Type으로 그대로 승격하면 **축 혼합**이 된다.

## 1. 스펙 §15 Item Type 전사 — 원문 실측 **14종**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §15 "Item Type"**

> ✅ **REQ 집계 14 ↔ 원문 실측 14 — 개수 일치.**
>
> 🔴 **그러나 본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다 — 개수만 맞고 항목명이 전부 날조였다.**
> 초판 14종(`FINANCIAL_AMOUNT`·`BUDGET_ALLOCATION`·`FUNDING_COMMITMENT`·`SETTLEMENT_LINE`(원문은 있음)·`PAYOUT_LINE`·`REFUND_LINE`·`RATE_CHANGE`·`CONFIG_CHANGE`·`DATA_CHANGE`·`CONTENT_PUBLISH`·`ACCESS_GRANT`·`EXECUTION_ACTION`·`LIFECYCLE_TRANSITION`) 중 **원문과 일치하는 것은 `CLAIM_LINE`·`SETTLEMENT_LINE` 2종뿐**이다.
> 원문에만 있는 것: `PROGRAM`·`PROGRAM_VERSION`·`FUNDING_ALLOCATION`·`BUDGET_LINE`·`CLAIM`·`ACCRUAL`·`PAYOUT`·`CONTRACT_CHANGE`·`MIGRATION_BATCH`·`ACCESS_ASSIGNMENT`·`EXPORT`·`CUSTOM`.
> **★개수 일치는 정합의 증거가 아니다** — REQ 개수에 맞춰 14개를 지어내면 개수는 항상 맞는다(289차 ② 351 사건의 메커니즘).

**§0 실측: Item Type 열거 grep 0(Item 부재)** → **14종 전부 부재**. §0 경고대로 현행 `ref_type`/`operation`/`action_type` 은 **Item Type 이 아니라 Resource·Action 축**이므로 대응으로 적지 않는다(축 혼합 금지).

| # | Item Type (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `PROGRAM` | **부재** — §0 "**REBATE_\*** grep 0 — 승인 대상 엔티티 자체가 부재" · **NOT_APPLICABLE(신설)** |
| 2 | `PROGRAM_VERSION` | **부재** — §0 동일(`REBATE_*` grep 0) · **NOT_APPLICABLE(신설)** |
| 3 | `FUNDING_ALLOCATION` | **부재** — §0 동일(`REBATE_*` grep 0) · **NOT_APPLICABLE(신설)** |
| 4 | `BUDGET_LINE` | **부재** — §0 Item Type 열거 grep 0 · **NOT_APPLICABLE(신설)** |
| 5 | `CLAIM` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 6 | `CLAIM_LINE` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 7 | `ACCRUAL` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 8 | `SETTLEMENT_LINE` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 9 | `PAYOUT` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 10 | `CONTRACT_CHANGE` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 11 | `MIGRATION_BATCH` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 12 | `ACCESS_ASSIGNMENT` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 13 | `EXPORT` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 14 | `CUSTOM` | **부재** — §0 동일(확장 슬롯) · **NOT_APPLICABLE(신설)** |

### 1-1. §0 실측 유형축 중 §15 Item Type 에 대응 없는 것

§0 은 현행 유형축 3건을 기록하되 **전부 Item Type 이 아니라고 판정**한다 — 원문 전사 후에도 그 판정은 유지된다.

| §0 실측 | §15 대응 | §0 판정 |
|---|---|---|
| `admin_growth_approval.ref_type` = `content`/`live_mode`/`campaign_launch`(AdminGrowth.php:1335,1337,1340) | **없음** | **MIGRATION_REQUIRED** — Item Type 아님 = **Resource Type 에 가까움** |
| `action_request` action type(Alerting.php:560 · JSON 자유값·화이트리스트 없음) | **없음** | **MIGRATION_REQUIRED** — **Action 축** |
| `catalog_writeback_job.operation`(Catalog.php:2348,2351 · 자유 문자열 필터) | **없음** | **MIGRATION_REQUIRED** — **Action 축** |

> ⚠️ **§0 경고 재확인**: 이들을 Item Type 으로 그대로 승격하면 **축 혼합**이다. 매핑 확정은 별도 승인 사항(확정 시 역산 — REQ §15).

## 2. 규칙

**Item Type ≠ Resource Type ≠ Action**(3축 분리) — 현행 `ref_type`(`AdminGrowth.php:1335`)을 Item Type으로 **직접 매핑 금지**. Type은 **화이트리스트 강제**(현행 `Alerting.php:560` JSON 자유값 = MIGRATION_REQUIRED 근거). Type 추가는 **Canonical 열거 확장**으로만 — 도메인별 Item Type 테이블 **복제 금지**(스펙 §5 단서: Domain Type·Resource Type으로 확장). **REBATE_\* 는 부재이므로 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤). **코드변경 0**.
