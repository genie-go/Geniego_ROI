# DSAR — Approval Requirement Source (§18)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §18** — 원문 나열 실측 **Source Type 16**(REQ 일치) + **필드 10**(REQ 집계 9 와 불일치 · §2 참조).

## 0. 현행 실측 (file:line)

**★Requirement Source 전면 부재(grep 0) — "왜 이 승인이 필요한가"를 기록하는 구조가 없다.**

| 현행 | 실측 | 분류 |
|---|---|---|
| `required_approvals` **출처** | `Db.php:634` `DEFAULT 2` — **하드코딩 기본값**. *누가·어떤 정책으로* 2를 정했는지 **기록 없음** | **MIGRATION_REQUIRED**(값은 있으나 근거 부재) |
| `Alerting` 정족수 출처 | `Alerting.php:562` `=> 2` **소스코드 리터럴** — DB 컬럼조차 없음(`Db.php:592-600`) | **★MIGRATION_REQUIRED**(출처 = 코드 상수 = 테넌트별 조정 불가) |
| 자기승인·dedup 규칙 출처 | `Mapping.php:268-283` — **코드에 직접 내장**(정책 참조 없음) | **MIGRATION_REQUIRED** |
| 승인 요구를 **발생시킨** 정책 참조 | grep 0 | **NOT_APPLICABLE(부재·grep 0 → 신설)** |
| `PlanPolicy` | `PlanPolicy.php:12` **fail-open**(주석 자인) · `PlanPolicy.php:19-24` `const RANK` = **코드 상수** | **KEEP_SEPARATE_WITH_REASON**(플랜 게이트 = 인가·§4.7) + fail-open 주의 |
| Workflow Registry / BPMN / Temporal·Camunda·Flowable·Zeebe·Step Functions | **backend/src grep 0** | **NOT_APPLICABLE(부재 → 신설·`5-3-2` 범위)** |
| `JourneyBuilder` | `JourneyBuilder.php:35-60`(journeys/nodes/edges) = **마케팅 여정** · 승인 노드/게이트 **grep 0** | **KEEP_SEPARATE_WITH_REASON**(승인 엔진 아님 — **전용 금지**) |

> **§0 질문 7 무응답 확정**: 현행 승인 요건의 출처는 **전부 하드코딩(코드 상수·컬럼 DEFAULT)** 이며, **테넌트·정책·계약 어디에서도 유도되지 않는다.**

## 1. 스펙 §18 Source Type 전사 — 원문 실측 **16종**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §18 "Source Type"**

> ✅ **REQ 집계 16 ↔ 원문 실측 16 — 개수 일치.**
>
> 🔴 **본 절 초판(`UNVERIFIED_TRANSCRIPTION`)의 항목명 대부분은 원문과 어긋나 폐기됐다.**
> 초판 16종 중 **원문과 일치하는 것은 `CONTRACT`(초판 `CONTRACT_TERM`) 등 없음 — 사실상 0~1종**.
> 초판에만 있던 것: `POLICY`·`POLICY_VERSION`·`ROLE_DEFINITION`·`PROGRAM_RULE`·`CONTRACT_TERM`·`FUNDING_AGREEMENT`·`THRESHOLD_RULE`·`REGULATORY`·`TENANT_SETTING`·`WORKSPACE_SETTING`·`SYSTEM_DEFAULT`·`MANUAL_OVERRIDE`·`RISK_ASSESSMENT`·`PROVIDER_REQUIREMENT`·`ERP_REQUIREMENT`·`LEGAL_ENTITY_RULE`.
> 원문에만 있는 것: `AUTHORIZATION_POLICY`·`BUSINESS_POLICY`·`FINANCIAL_THRESHOLD`·`RISK_POLICY`·`CONTRACT`·`REGULATION`·`DATA_CLASSIFICATION`·`PROGRAM_LIFECYCLE`·`FUNDING_MODEL`·`CUSTOMER_CONFIGURATION`·`TENANT_CONFIGURATION`·`WORKFLOW_DEFINITION`·`MANUAL`·`INCIDENT`·`EMERGENCY_POLICY`·`CUSTOM`.
> ★**초판의 `SYSTEM_DEFAULT`(11)는 원문에 없다** — 따라서 §3 규칙의 *"`SYSTEM_DEFAULT`(11)는 현행 이관용 임시 유형"* 서술은 **원문 근거가 없는 289차 창작**이었다(아래 1-1 참조).

**§0 실측: ★Requirement Source 전면 부재(grep 0) — "왜 이 승인이 필요한가"를 기록하는 구조가 없다** → **16종 전부 부재**.

| # | Source Type (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `AUTHORIZATION_POLICY` | **부재** — §0 "승인 요구를 **발생시킨** 정책 참조 **grep 0**" · **NOT_APPLICABLE(신설)** |
| 2 | `BUSINESS_POLICY` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 3 | `FINANCIAL_THRESHOLD` | **부재** — §0 "금액 임계·통화·기한·Evidence 요건 **grep 0**"(§17 실측) · **NOT_APPLICABLE(신설 · 상세 = `5-3-5`)** |
| 4 | `RISK_POLICY` | **부재** — Risk 축 grep 0 · **NOT_APPLICABLE(신설 · 상세 = `5-3-5`)** |
| 5 | `CONTRACT` | **부재** — Contract 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 6 | `REGULATION` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 7 | `DATA_CLASSIFICATION` | **부재** — §9 실측 `data_classification` **판정 유보/부재** · **NOT_APPLICABLE(신설)** |
| 8 | `PROGRAM_LIFECYCLE` | **부재** — `REBATE_*` grep 0(Program 부재) · **NOT_APPLICABLE(전방호환)** |
| 9 | `FUNDING_MODEL` | **부재** — `REBATE_*` grep 0 · **NOT_APPLICABLE(전방호환)** |
| 10 | `CUSTOMER_CONFIGURATION` | **부재** — §0 "테넌트·정책·계약 어디에서도 유도되지 않는다" · **NOT_APPLICABLE(신설)** |
| 11 | `TENANT_CONFIGURATION` | **부재** — §0 동일. ※§0 판정: 현행 출처는 **전부 하드코딩**(`Db.php:634` DEFAULT · `Alerting.php:562` 리터럴) = **테넌트별 조정 불가** · **★MIGRATION_REQUIRED** |
| 12 | `WORKFLOW_DEFINITION` | **부재** — §0 "Workflow Registry / BPMN / Temporal·Camunda·Flowable·Zeebe·Step Functions **backend/src grep 0**" · **NOT_APPLICABLE(신설 · `5-3-2` 범위)** |
| 13 | `MANUAL` | **부재** — §0 Source 축 전면 부재 · **NOT_APPLICABLE(신설)** |
| 14 | `INCIDENT` | **부재** — Incident 레지스트리 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 15 | `EMERGENCY_POLICY` | **부재** — §0 동일 · **NOT_APPLICABLE(신설 · `5-3-9` 범위)** |
| 16 | `CUSTOM` | **부재** — §0 동일(확장 슬롯) · **NOT_APPLICABLE(신설)** |

### 1-1. ★`SYSTEM_DEFAULT` 정정 — 원문에 없는 유형이었다

초판은 `SYSTEM_DEFAULT` 를 두고 *"**현행 전 경로가 사실상 이것**"* 이라 적었다. **그 관찰(§0 실측)은 옳다** — 현행 요건 출처는 전부 하드코딩(`Alerting.php:562` 리터럴 · `Db.php:634` DEFAULT)이다.
**그러나 `SYSTEM_DEFAULT` 라는 Source Type 은 스펙 §18 에 존재하지 않는다.** 원문 16종 중 현행 하드코딩에 대응하는 유형은 **없다**.

> ⚠️ **이것은 "빠진 요구"가 아니라 "지어낸 요구"였다.** 분모에 없는 유형을 만들어 현행을 거기에 담으면, 현행이 **정의상 분류 완료**가 되어 갭이 사라진다 — **역산**(REQ §15).
> ⇒ 현행 하드코딩 출처의 Canonical 유형 배정은 **별도 승인 사항**이며, 여기서 확정하지 않는다.

## 2. 스펙 §18 `APPROVAL_REQUIREMENT_SOURCE` 필수 필드 전사 — 원문 실측 **10개**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §18 "필수 필드"**

> 🔴 **REQ 집계 9 ↔ 원문 실측 10 — 원문이 정본.**
> REQ `§7` 표의 *"§18 Requirement Source 필드 = **9**"* 는 **원문 나열과 1건 어긋난다**(원문 나열 실측 = 10).
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**
>
> 🔴 **초판 9필드 중 원문과 일치하는 것은 `requirement_source_id`·`source_type` 2개뿐**이다.
> 초판에만 있던 것: `tenant_id`·`source_ref_id`·`source_version`·`source_expr`·`resolved_at`·`resolved_snapshot_json`·`created_at`.
> 원문에만 있는 것: `approval_requirement_id`·`source_id`·`source effective period`·`source condition`·`matched result`·`generated_at`·`evidence`.

| # | 필드 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `requirement_source_id` | **부재** — §0 "Requirement Source 전면 부재(grep 0)" · **NOT_APPLICABLE(신설)** |
| 2 | `approval_requirement_id` | **부재(FK)** — §17 실측: Requirement 축 부재 · **NOT_APPLICABLE(신설)** |
| 3 | `source_type` | **부재** — §0 Source 축 부재 · **NOT_APPLICABLE(신설)** |
| 4 | `source_id` | **부분** — ※인접 실물 `action_request.policy_id`(Db.php:594) = Requirement 출처 **유일 흔적** · **LEGACY_ADAPTER** |
| 5 | `source_version` | **부재** — `policy_version` grep 0 · §4.6 상충 · **NOT_APPLICABLE(신설)** |
| 6 | `source effective period` | **부재** — §0 Source 축 부재 · **NOT_APPLICABLE(신설)** |
| 7 | `source condition` | **부재** — §0 "자기승인·dedup 규칙 출처 = **코드에 직접 내장**(Mapping.php:268-283 · 정책 참조 없음)" · **MIGRATION_REQUIRED** |
| 8 | `matched result` | **부재** — §0 Source 축 부재 · **NOT_APPLICABLE(신설)** |
| 9 | `generated_at` | **부재** — §0 Source 축 부재 · **NOT_APPLICABLE(신설)** |
| 10 | `evidence` | ⚠️ **판정 유보** — §0 미열거(§50 Evidence 축) |

**전사 집계**: Source Type 16(**전부 부재**) + 필드 10(**존재 0 · 부분 1**(4) · **부재 8** · **판정 유보 1**(10)).

> **§0 질문 7 무응답 확정과 정합**: 현행 승인 요건의 출처는 **전부 하드코딩(코드 상수·컬럼 DEFAULT)** 이며, **테넌트·정책·계약 어디에서도 유도되지 않는다**(모순 0).

## 3. 규칙

**Source 없는 Requirement 금지** — 필요성의 근거가 없으면 §0 질문 7·§61(Requirement Source·Policy Version 보존)을 충족할 수 없다. ~~`SYSTEM_DEFAULT`(11)는 **현행 이관용 임시 유형**이며 신규 요건에 사용 금지.~~ 🔴 **정정(전사 후)**: `SYSTEM_DEFAULT` 는 **스펙 §18 원문에 존재하지 않는 유형**이었다(§1-1 참조) — 본 규칙은 **원문 근거 없음**. 현행 하드코딩 출처(`Alerting.php:562`·`Db.php:634`)의 Canonical 유형 배정은 **별도 승인 사항**이며, **원문 16종 밖의 유형을 만들어 담지 않는다**(요구 날조 0 · 역산 금지). **Workflow 엔진은 부재(grep 0)** — `JourneyBuilder`를 승인 워크플로로 **전용 금지**(마케팅 여정이며 승인 노드 없음 = 죽은 스켈레톤 배선 위험·287차). 워크플로 실행은 **본 블록 범위 밖**(`5-3-2`). **코드변경 0** — 실 구현은 별도 승인 세션.
