# DSAR — Approval Requirement (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §17** — 원문 나열 실측 **26 필드**(REQ 집계 25 와 불일치 · §1 참조).

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

## 1. 스펙 §17 `APPROVAL_REQUIREMENT` 필수 필드 전사 — 원문 실측 **26개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §17**

> 🔴 **REQ 집계 25 ↔ 원문 실측 26 — 원문이 정본.**
> REQ `§7` 표의 *"§17 Approval Requirement 필드 = **25**"* 는 **원문 나열과 1건 어긋난다**(원문 나열 실측 = 26).
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**
>
> 🔴 **본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다.** 초판은 REQ 개수 25 에 맞춘 **항목명 날조**였고 —
> `requirement_id`·`case_id`·`request_id`·`item_id`·`tenant_id`·`requirement_source_id`·`domain_type`·`is_mandatory`·`required_approvals`·`required_role`·`required_scope`·`required_participant_type`·`threshold_amount`·`threshold_currency`·`condition_expr`·`evaluation_status`·`satisfied_at`·`satisfied_by_decision_id`·`waived_reason`·`policy_reference_id`·`evaluated_at`·`created_at`·`updated_at` 는 **원문 §17 에 존재하지 않는다**.
> ★특히 초판이 *"현행 `Db.php:634` 승격·재사용"* 으로 연결한 **`required_approvals` 는 원문 필드명이 아니다** — 원문은 `required approval count`·`minimum approval count`·`maximum rejection count` **3필드로 분해**한다.

**원문 §17 서술**: *"Approval Requirement는 승인 필요성을 나타낸다."*

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `approval_requirement_id` | **부재** — §0 "Requirement 발생 근거 grep 0" · **NOT_APPLICABLE(신설)** |
| 2 | `approval_case_id` | **부재(FK)** — Case 개념 부재 · **NOT_APPLICABLE(신설)** |
| 3 | `approval_item_id` | **부재(FK)** — Item 개념 부재 · **NOT_APPLICABLE(신설)** |
| 4 | `requirement_type` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** · 정본 = [`DSAR_APPROVAL_REQUIREMENT_TYPE.md`](DSAR_APPROVAL_REQUIREMENT_TYPE.md) |
| 5 | `source_type` | **부재** — §0 "Requirement 발생 근거(어떤 Policy·Role이 승인을 요구했나) **grep 0**" · **NOT_APPLICABLE(신설)** |
| 6 | `source_reference` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** · 정본 = [`DSAR_APPROVAL_REQUIREMENT_SOURCE.md`](DSAR_APPROVAL_REQUIREMENT_SOURCE.md) |
| 7 | `policy_reference` | **부분** — ※인접 실물 `action_request.policy_id`(Db.php:594) · **LEGACY_ADAPTER**. Requirement 행 단위로는 **부재** |
| 8 | `policy_version` | **부재** — `policy_version` grep 0 · §4.6 상충 · **NOT_APPLICABLE(신설)** |
| 9 | `required actor type` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 10 | `required role` | **부재(Requirement 축)** — ※인접: `TeamPermissions.php:39/41`. ※§0-DOMAIN 실측상 `'approve'` **검사 호출부 grep 0 = 고아** · **MIGRATION_REQUIRED** |
| 11 | `required scope` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 12 | `required organization` | **부재** — Organization 레지스트리 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 13 | `required legal entity` | **부재** — Legal Entity 레지스트리 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 14 | `required country` | ⚠️ **판정 유보** — §0 미열거 |
| 15 | `required environment` | **부재(Requirement 축)** — `Db::env()`(Db.php:46,57) **프로세스 전역** · **LEGACY_ADAPTER** |
| 16 | `required clearance` | ⚠️ **판정 유보** — §0 미열거 |
| 17 | `required approval count` | **존재(부분)** — ★§0 `mapping_change_request.required_approvals INT DEFAULT 2`(Db.php:634) · 판정 `Mapping.php:287` · **VALIDATED_LEGACY** + **MIGRATION_REQUIRED**(*왜* 2명인지·*어떤 정책*이 요구했는지 **기록 없음**). ※`action_request` 는 **컬럼 없음**(Alerting.php:562 **리터럴** = 표시용 장식) |
| 18 | `minimum approval count` | **부재** — §0 정족수는 **숫자 1개로 축약** · **MIGRATION_REQUIRED** |
| 19 | `maximum rejection count` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 20 | `decision mode` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 21 | `mandatory 여부` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 22 | `waivable 여부` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 23 | `valid_from` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 24 | `valid_to` | **부재** — §0 Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 25 | `status` | **부재(Requirement 행)** — ※Request 행 `status` 는 존재(§27) |
| 26 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: 원문 26 = **존재(부분) 2**(7·17) + **부재 21** + **판정 유보 3**(14·16·26).

### 1-1. ★`required_approvals` 1필드 → 원문 3필드 분해 (축 정정)

§0 은 현행 정족수가 **"필요성이 숫자 1개로 축약"** 됐다고 판정한다. 원문 전사는 그 판정을 **필드 수준에서 확증**한다:

| 현행 | 원문 대응 |
|---|---|
| `required_approvals INT DEFAULT 2`(Db.php:634) — **단일 컬럼** | **17 `required approval count`** 만 대응 |
| — | **18 `minimum approval count`** 부재 |
| — | **19 `maximum rejection count`** 부재 |
| — | **20 `decision mode`** 부재 |
| — | **5 `source_type`/6 `source_reference`/8 `policy_version`** 부재 = *왜 2명인지* 기록 없음 |

⇒ §0 질문 7(*"어떤 Policy와 Role이 승인 필요성을 발생시켰는가"*) **전 경로 무응답** 판정과 **정합**(모순 0).

## 2. 규칙

**§4.3 분리 강제**: Requirement는 *"2명의 finance role 승인이 필요하다"*(**필요성**), Decision은 *"홍길동이 승인했다"*(**결과**). 필드 19가 **유일한 연결점**이며, **Requirement 테이블에 결정 내용을 쓰지 말 것**(현행 `approvals_json` 혼재가 반례). **Requirement 미충족 시 fail-closed**(Unknown ≠ Satisfied) — `PlanPolicy.php:12` **fail-open을 Requirement 판정에 사용 금지**. 현행 `required_approvals`(`Db.php:634`)는 **삭제 아닌 승격**(비파괴·Golden Rule = Extend). **코드변경 0**.
