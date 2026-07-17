# DSAR — Approval Item (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §15** — 원문 나열 실측 **24 필드**(REQ 집계 25 와 불일치 · §1 참조).

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

## 1. 스펙 §15 `APPROVAL_ITEM` 필수 필드 전사 — 원문 실측 **24개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §15**

> 🔴 **REQ 집계 25 ↔ 원문 실측 24 — 원문이 정본.**
> REQ `§7` 표의 *"§15 Approval Item 필드 = **25**"* 는 **원문 나열보다 1건 많다**(원문 나열 실측 = 24).
> ★**본 축은 REQ 가 원문보다 `과다` 집계한 사례**다(다른 축은 대부분 과소). **어느 방향이든 원문이 정본**이며 **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**
>
> 🔴 **본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다.** 초판은 REQ 개수 25 에 맞춘 **항목명 날조**였고 —
> `item_id`·`case_id`·`request_id`·`tenant_id`·`item_no`·`domain_type`·`title`·`fx_rate_at_request`·`scope_json`·`decision_id`·`processing_mode`·`requirement_id`·`snapshot_id`·`created_at`·`updated_at` 는 **원문 §15 에 존재하지 않는다**.
> 원문에만 있는 것: `approval_item_id`·`approval_case_id`·`item_number`·`item owner`·`current requirement count`·`current decision state`·`bundle_reference`·`evidence`.

**원문 §15 서술**: *"하나의 Approval Case 안에서 독립적으로 승인 가능한 항목이다."*
**§0 실측: ★Item(품목) 개념 전면 부재(grep 0) — 현행 승인은 전부 "단일 레코드 1건 승인"** → **24 필드 전부 부재**가 §0 정합 판정이다.

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_item_id` | **부재** — §0 "APPROVAL_ITEM grep 0" · **NOT_APPLICABLE(신설)** |
| 2 | `approval_case_id` | **부재(FK)** — §0 Case 개념 부재 · **NOT_APPLICABLE(신설)** |
| 3 | `item_number` | **부재** — §0 Item 부재 · **NOT_APPLICABLE(신설)** |
| 4 | `item_type` | **부재** — §0 Item Type 열거 grep 0 · **NOT_APPLICABLE(신설)** · 정본 = [`DSAR_APPROVAL_ITEM_TYPE.md`](DSAR_APPROVAL_ITEM_TYPE.md) |
| 5 | `resource_type` | **부재** — §9 실측: `resource_type` grep 0(타입은 **테이블 소속**으로만 암묵 표현) · **NOT_APPLICABLE(신설)** |
| 6 | `resource_id` | **부분** — ※인접 실물 `admin_growth_approval.ref_id`(AdminGrowth.php:144) = **단수 참조 1건** · **LEGACY_ADAPTER**. Item 행 단위로는 **부재** |
| 7 | `resource_version` | **부재** — §9 실측: `resource_version`/drift 탐지 grep 0 · §4.5 상충 · **NOT_APPLICABLE(신설)** |
| 8 | `requested_action` | **부재(명시 필드)** — §10 실측: `action_json` **블롭** 내부 · 스키마 없음 · **MIGRATION_REQUIRED** |
| 9 | `requested_amount` | **부재** — §10 실측: Action 의 금액축 **부재(grep 0)** · **NOT_APPLICABLE(신설)** |
| 10 | `currency` | **부재** — §10 실측 동일(통화 없음) · **NOT_APPLICABLE(신설)** |
| 11 | `quantity` | **부재** — §0 Item 부재 · **NOT_APPLICABLE(신설)** |
| 12 | `scope` | **부재** — §10 실측: 승인 범위 초과 차단 grep 0 · **NOT_APPLICABLE(신설)** |
| 13 | `legal_entity_id` | **부재** — Legal Entity 레지스트리 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 14 | `country` | ⚠️ **판정 유보** — §0 미열거. ※Geo.php:19 는 IP→국가 **탐지**(레지스트리 아님) |
| 15 | `environment` | **부재(Item 행)** — `Db::env()`(Db.php:46,57) **프로세스 전역** · 행 단위 컬럼 아님 · **LEGACY_ADAPTER** |
| 16 | `risk_reference` | **부재** — Risk 축 grep 0 · **NOT_APPLICABLE(신설)** |
| 17 | `policy_reference` | **부분** — ※인접 실물 `action_request.policy_id`(Db.php:594) · **LEGACY_ADAPTER**. Item 행 단위로는 **부재** |
| 18 | `parent_item_id` | **부재** — §0 Item 부재(계층 축 없음) · **NOT_APPLICABLE(신설)** |
| 19 | `bundle_reference` | **부재** — §0 Item 부재 · **NOT_APPLICABLE(신설)** · §16 `BUNDLE_DECISION` 축 |
| 20 | `item owner` | **부재** — §0 Item 부재 · **NOT_APPLICABLE(신설)** |
| 21 | `current requirement count` | **부재** — §17 실측: Requirement 발생 근거 grep 0 · **NOT_APPLICABLE(신설)** |
| 22 | `current decision state` | **부재** — §0 "부분승인(Partial Approval) grep 0" · **NOT_APPLICABLE(신설)** |
| 23 | `status` | **부재(Item 행)** — ※Request 행 `status` 는 존재(§27). **Item 독립 상태는 전면 부재** |
| 24 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: 원문 24 = **존재 0** + **부분 2**(6·17) + **부재 20** + **판정 유보 2**(14·24).

### 1-1. §4.2 위배 실측과의 정합

§0 은 스펙 §0 질문 **9**(하나의 요청에 여러 승인 항목) · **10**(항목별 결과 분기)에 대한 현행 답이 **전부 "불가"** 라고 기록한다.
원문 필드 **1 `approval_item_id`** · **3 `item_number`** · **22 `current decision state`** 가 정확히 그 공백이며, `catalog_writeback_job`(Catalog.php:2350-2357)은 N행 벌크 UPDATE 이나 **행별 승인/거부 분기 불가**(**MIGRATION_REQUIRED** · 가장 근접 → Item 후보)다.

⇒ 원문 §15 전 24 필드 부재 판정은 §0 *"Item 개념 전면 부재"* 와 **정합**(모순 0).

## 2. 규칙

**Item ≠ Business Resource**(§4.1) — `resource_id`는 **참조**이지 소유가 아니다. Item별 **독립 Decision**(§61)이 부분승인의 전제이며, Decision은 Append-only(§4.9). `catalog_writeback_job`을 Item으로 **승격**할 때 기존 벌크 경로(`Catalog.php:2341-2364`)는 **보존**하고 Item 경로를 **추가**(비파괴·Golden Rule = Extend·중복 신설 금지). **코드변경 0** — 실 구현은 별도 승인 세션.
