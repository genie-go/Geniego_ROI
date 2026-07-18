# DSAR — Approval Authority Reconciliation Status (§64)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §64(2581-2609) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §7 · 비교 축: [문서1 `DSAR_APPROVAL_AUTHORITY_RECONCILIATION.md`](DSAR_APPROVAL_AUTHORITY_RECONCILIATION.md)(§63) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모 = 측정기 정본 26**: `measure_spec_denominator.mjs --sec=64` 실측 **26**(불릿 26·번호 0). 🔴 착수 지시서는 "(=25)"로 기재했으나 **측정기·원문(2583-2608) 모두 26**이다 — 수기 계수 오류이며 **측정기가 정본**(육안 금지·측정기 존재 이유가 "몇 개인지 조용히 틀리는 것"을 막는 것). 본 문서는 **26**을 전사한다.

## 0. 현행 실측 (file:line)

| 대상 | 현행 | 판정 |
|---|---|---|
| **Authority Reconciliation Status** 열거형 | **부재**(grep 0) — 대사 결과를 담을 상태 축 자체가 없음. 대사 상태머신 전무(ⓑ §7) | `NOT_APPLICABLE`(대사 부재→신설) |
| 좌변 원천 상태(ERP/Finance/HRIS) | 🔴 ERP DOA / Finance Spreadsheet / HRIS Job Level = **존재조차 안 함**(`doa_matrix`·`job_grade_threshold` grep 0·ⓑ §1) → 해당 MISMATCH는 **비교 대상 부재** | `ABSENT` |
| 현행 승인 상태 어휘 — `action_request` | `approved\|rejected\|executed\|failed\|approved_manual`(`Alerting.php:628,644`) — **요청 상태**이지 **대사 결과 아님** | `KEEP_SEPARATE_WITH_REASON`(축 상이) |
| 현행 승인 상태 어휘 — `mapping_change_request` | `pending\|approved\|applied`(`Mapping.php:287,309,327`) | `KEEP_SEPARATE_WITH_REASON`(축 상이) |
| 대사 **미수행**과 **일치(MATCH)** 구분 값 | **부재** — 대사 자체가 없어 두 상태 미분화(Unknown ≠ Match) | `NOT_APPLICABLE` |

> **★축 혼합 금지**: Request Status(§8·상태축) · Case Status(§10) · **Reconciliation Status(§64)** 는 개수가 비슷해도 **서로 다른 것을 세는 독립 축**이다. 한 요청이 `approved`이면서 동시에 대사 결과가 `mismatch`일 수 있다 — 두 축은 동시에 성립하므로 한 컬럼에 뭉치면 표현 불가.

## 1. 원문 전사 + 판정 — **원문 26** (§64 상태 열거형)

| # | 상태(원문) | 대응 비교 대상(§63) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|---|
| 1 | MATCH | (전체 일치) | 대사 상태머신 부재 → 일치를 산출할 대사 없음 | `NOT_APPLICABLE` |
| 2 | ERP_DOA_MISMATCH | #1 ERP DOA Matrix | 🔴 좌변 ERP DOA Matrix **존재조차 안 함**(`doa_matrix` grep 0·ⓑ §1) — 비교 대상 부재 | `ABSENT` |
| 3 | FINANCE_MATRIX_MISMATCH | #2 Finance Spreadsheet | 🔴 좌변 Finance Spreadsheet 부재(`authority_matrix` grep 0·ⓑ §1) — 비교 대상 부재 | `ABSENT` |
| 4 | JOB_LEVEL_BINDING_MISMATCH | #3 HRIS Job Level | 🔴 좌변 HRIS Job Level 부재(`job_grade_threshold`·`position_threshold` 0·ⓑ §1) — 비교 대상 부재 | `ABSENT` |
| 5 | ROLE_AUTHORITY_MISMATCH | #4 Role Assignment | Role Authority 축 부재·매핑 0(ⓑ §3.2) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 6 | POSITION_AUTHORITY_MISMATCH | #5 Position Incumbent | Position Authority 전무(ⓑ §1) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 7 | ORGANIZATION_AUTHORITY_MISMATCH | #6 Organization Owner | Organization Authority 부재(ⓑ §3) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 8 | LEGAL_ENTITY_AUTHORITY_MISMATCH | #7 Legal Entity Officer | Legal Entity 엔티티 0(ⓑ §1) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 9 | COST_CENTER_AUTHORITY_MISMATCH | #8 Cost Center Owner | `cost_center_limit` grep 0(ⓑ §1) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 10 | BUDGET_AUTHORITY_MISMATCH | #9 Budget Owner | `budget_limit` 0(ⓑ §1) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 11 | PROGRAM_AUTHORITY_MISMATCH | #10 Program Owner | `program_limit` grep 0(ⓑ §1) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 12 | CHAIN_LEVEL_AUTHORITY_MISMATCH | #11 Approval Chain Level | Chain Level 부재·`required_approvals`=상수 2(ⓑ §1) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 13 | PARTICIPANT_AUTHORITY_MISMATCH | #12 Resolved Participant | 후보/Resolution 전 ABSENT(ⓑ §6) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 14 | TASK_ASSIGNEE_AUTHORITY_MISMATCH | #13 Task Assignee | Task/Resolution 축 부재(ⓑ §6) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 15 | CLAIM_ACTOR_AUTHORITY_MISMATCH | #14 Claim Actor | Actor Auth Snapshot ABSENT(ⓑ §5) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 16 | DECISION_ACTOR_AUTHORITY_MISMATCH | #15 Decision Actor | 동일 — 승인시점 권한 미보존(ⓑ §5) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 17 | DECISION_AMOUNT_LIMIT_MISMATCH | #16 Decision Amount vs Limit | Authority Limit 부재·high_value 미집행(ⓑ §4) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 18 | DECISION_CURRENCY_MISMATCH | #17 Decision Currency | currency scope 0(ⓑ §4) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 19 | DECISION_EFFECTIVE_DATE_MISMATCH | #18 Decision Date vs Effective Period | 승인/권한 effective dating 없음(ⓑ §5·§57) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 20 | CUMULATIVE_LIMIT_MISMATCH | #19 Cumulative Usage vs Limit | 인접 `AutoCampaign:843-889` 누적차감 실재(ⓑ §4)이나 **마케팅·대사 상태 아님** | `NOT_APPLICABLE` |
| 21 | MATRIX_VERSION_SNAPSHOT_MISMATCH | #20 Current Matrix Version vs Case Snapshot | Matrix Version·Case Snapshot 양변 부재(ⓑ §5) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 22 | FUTURE_CHANGE_SCHEDULING_MISMATCH | #21 Future Version vs Scheduled Activation | Future-Dated ABSENT(ⓑ §5·§58) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 23 | EXTERNAL_THRESHOLD_MISMATCH | #22 External BPM Threshold | External BPM 부재(`BPMN` grep 0) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 24 | OVERRIDE_REFERENCE_MISMATCH | #23 Manual Override vs Exception Reference | Exception Reference·Override 축 부재(ⓑ §6) → 대사 상태 미성립 | `NOT_APPLICABLE` |
| 25 | MANUAL_REVIEW | (수동 검토 회부) | 대사 처리 경로 부재 | `NOT_APPLICABLE` |
| 26 | BLOCKED | (대조 차단) | 대사 처리 경로 부재 | `NOT_APPLICABLE` |

🔴 **26/26 미충족** — **23 `NOT_APPLICABLE` + 3 `ABSENT`**(#2 ERP_DOA · #3 FINANCE_MATRIX · #4 JOB_LEVEL: 좌변 비교 대상이 존재조차 안 함). 열거형 자체가 없다(grep 0). 커버 0/26.

**실측 개수: 26 / 26 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 23 · `ABSENT` 3.

> **★§64 는 §63 의 결과 축이다** — 26종 중 #2~#24(23종)는 §63 비교 대상 23종과 **1:1 대응**하고, #1 MATCH·#25 MANUAL_REVIEW·#26 BLOCKED 는 **대사 사건의 처리 경로**다. 즉 §64 는 독립 열거가 아니라 §63 의 산출 상태다.
>
> **★"미수행" 상태값의 부재**: 원문 26종에 **Unknown / NOT_RECONCILED 에 해당하는 값이 없다**. 아래 §2 Fail-closed 는 **원문 명시 요구가 아니라 저장소 원칙에서 도출한 설계 판단**임을 명시한다(원문에 없는 것을 원문 요구로 승격 금지).

## 2. 규칙

- **현행 승인 상태 어휘(§8/§10)를 Reconciliation Status 로 전용 금지** — 축이 다르다(`approved`/`applied`/`executed`=요청 상태 · MISMATCH=대사 결과). 끼워 넣으면 두 축이 영구히 뒤엉킨다.
- **Fail-closed 기본값**: 대사 결과가 없는 건은 **Unknown**이며 Unknown 을 MATCH(통과)로 취급하지 않는다 — 대사한 적 없음을 "일치"로 표시하면 **가짜녹색**(288차 systemic 교훈 · Part 3-2 "Unknown ≠ Eligible" 선례와 동형).
- **ERP_DOA / FINANCE_MATRIX / JOB_LEVEL MISMATCH 를 "탐지 가능"으로 세지 마라** — 좌변(ERP/Finance/HRIS)이 **존재조차 안 하므로**(ⓑ §1) 이 3종은 상태를 산출할 원천이 없다. 수집 경로가 확정되기 전 이 배지를 UI 에 노출하면 빈 대사를 통과로 위장하는 것이다.
- **Mismatch 는 해소돼도 삭제되지 않는다(append-only)** — 불일치가 있었다는 사실이 §65 Critical Gap 의 분자다. `AgencyPortal.php:304`,`:381` in-place 소거(ⓑ §5) 복제 금지.
- **분모는 측정기 정본 26** — 수기 "25" 재기재 금지. 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
