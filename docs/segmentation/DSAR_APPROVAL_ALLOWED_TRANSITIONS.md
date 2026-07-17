# DSAR — Approval Request 허용 전이 (§29)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §29 — 원문 그대로 전사.
> **분모 정합**: REQ 집계 22 ↔ **원문 실측 22 — 개수 일치**.
> 🔴 **단, 289차 placeholder 표의 상태명은 원문과 전면 상이했다**(예: `VALIDATING`→원문 `VALIDATION_PENDING` · `CHANGES_REQUESTED`→원문 `CHANGES_REQUIRED` · `EXECUTING`/`EXECUTED`/`RECONCILING`/`CLOSED` = **원문 §29 에 없음**). **개수만 우연히 일치했을 뿐 내용은 자작이었다** — 원문으로 전면 교체함(§1).

## 0. 현행 실측 대조표 (file:line)

**★현행 유일한 상태 전이 강제 선례 = `FeedTemplate::transition`(`FeedTemplate.php:248-285`)**

```php
// FeedTemplate.php:248-285 — draft→submitted→approved→published 순차 강제(역행 차단)
if ((string)$r['status'] !== $from)
    return self::json($res, ['ok'=>false,'error'=>'invalid_state','status'=>$r['status']], 409);
```
→ `approveDraft` publish 시 미승인이면 **`must_approve_first` 409**. **이것이 재사용할 패턴이다(신설 금지).**

| 현행 | 전이 강제 여부 (실측) | 분류 |
|---|---|---|
| `FeedTemplate::transition/approveDraft` `FeedTemplate.php:248-285` | ✔ **from 상태 일치 검증 · 역행 차단 · 409** | **CANONICAL_APPROVAL_TRANSITION_GUARD**(★승격·재사용 원형) |
| `Mapping::approve` `Mapping.php:238-294` | ✔ **pending 아니면 409**(289차 신설 상태 게이트) | **VALIDATED_LEGACY**(부분 — 1개 전이만) |
| `Mapping::apply` `Mapping.php:296-327` | ✔ `status!=='approved'` 게이트(`:309`) | **VALIDATED_LEGACY** |
| `Alerting::decideAction` | ✘ `UPDATE ... SET status=?`(`Alerting.php:653`) **직접 덮어쓰기** | **MIGRATION_REQUIRED** |
| `admin_growth_approval` `AdminGrowth.php:142-149` | ✘ 전이 검증 0 | **MIGRATION_REQUIRED** |
| `catalog_writeback_job` `Catalog.php:2341-2364` | ✘ 전이 검증 0 | **MIGRATION_REQUIRED** |
| State Machine / BPMN / Temporal / Camunda / Flowable / Zeebe / Step Functions | **backend/src grep 0** | **NOT_APPLICABLE(신설)** |

> **판정: 전이 강제 = 6개 승인 경로 중 2개(FeedTemplate·Mapping)만.** 나머지는 **임의 상태 도약 가능**(예: `pending`→`executed` 직행 차단 수단 없음).

## 1. Request 기본 허용 전이 (22) — 원문 전사

> 스펙 §29 원문 도입부: **"최소 다음을 지원하라."** → 즉 이 22 는 **하한**이지 폐집합이 아니다(placeholder 표는 이를 "화이트리스트 22" 로 오독했음).

| # | From → To |
|---|---|
| 1 | `DRAFT` → `SUBMITTED` |
| 2 | `SUBMITTED` → `VALIDATION_PENDING` |
| 3 | `VALIDATION_PENDING` → `VALIDATION_FAILED` |
| 4 | `VALIDATION_PENDING` → `ACCEPTED` |
| 5 | `ACCEPTED` → `CASE_CREATION_PENDING` |
| 6 | `CASE_CREATION_PENDING` → `IN_REVIEW` |
| 7 | `IN_REVIEW` → `APPROVAL_PENDING` |
| 8 | `APPROVAL_PENDING` → `PARTIALLY_APPROVED` |
| 9 | `APPROVAL_PENDING` → `APPROVED` |
| 10 | `APPROVAL_PENDING` → `CONDITIONALLY_APPROVED` |
| 11 | `APPROVAL_PENDING` → `REJECTED` |
| 12 | `APPROVAL_PENDING` → `CHANGES_REQUIRED` |
| 13 | `APPROVAL_PENDING` → `RETURNED` |
| 14 | `SUBMITTED`·`IN_REVIEW`·`APPROVAL_PENDING` → `WITHDRAWAL_PENDING` |
| 15 | `WITHDRAWAL_PENDING` → `WITHDRAWN` |
| 16 | `OPEN` 상태 계열 → `CANCELLATION_PENDING` |
| 17 | `CANCELLATION_PENDING` → `CANCELLED` |
| 18 | 유효기간 경과 → `EXPIRED` |
| 19 | `REJECTED`·`CHANGES_REQUIRED`·`RETURNED` → `REOPEN_PENDING` |
| 20 | `REOPEN_PENDING` → `REOPENED` |
| 21 | 기존 요청 → `SUPERSEDED` |
| 22 | `APPROVED`·`CONDITIONALLY_APPROVED` → `COMPLETED` |

### 1-1. 🔴 placeholder ↔ 원문 대조 — 자작 항목 폐기 기록 (무후퇴)

289차 placeholder 표는 **개수(22)만 REQ 와 맞췄을 뿐 상태명·전이 내용이 원문과 달랐다**. 주요 상이:

| placeholder(자작·폐기) | 원문 §29 | 성격 |
|---|---|---|
| `SUBMITTED`→`VALIDATING` | `SUBMITTED`→`VALIDATION_PENDING` | **상태명 오기** |
| `VALIDATING`→`PENDING` | `VALIDATION_PENDING`→`ACCEPTED` | 오기 + **`ACCEPTED`/`CASE_CREATION_PENDING` 단계 누락** |
| `IN_REVIEW`→`APPROVED` 직행 | `IN_REVIEW`→`APPROVAL_PENDING`→`APPROVED` | **중간 상태 누락** |
| `CHANGES_REQUESTED` | `CHANGES_REQUIRED` | 상태명 오기 |
| `PENDING`→`WITHDRAWN` 직행 | →`WITHDRAWAL_PENDING`→`WITHDRAWN` | **2단계 요구 누락** |
| `DRAFT`→`CANCELLED` 직행 | `OPEN` 계열→`CANCELLATION_PENDING`→`CANCELLED` | **2단계 요구 누락** |
| `EXECUTING`·`EXECUTED`·`EXECUTION_FAILED`·`RECONCILING`·`CLOSED` | **원문 §29 에 없음** | **자작 상태**(집행 축은 §40/§43 소관) |
| — | `REOPEN_PENDING`→`REOPENED`(§38) · `COMPLETED` | **원문에 있으나 placeholder 누락** |

⇒ **원문이 정본.** 위 자작 상태·전이는 본 문서의 요구 분모에서 **폐기**한다. 단 §0 현행 실측·판정은 **그대로 유효**(상태명과 무관한 코드 실측이므로).

## 2. 규칙

- **원문 22 는 하한(최소)** — 이를 만족하는 화이트리스트를 구성하고, **목록 외 전이는 `409 invalid_state`**(Deny-by-default). 확장은 가능하나 **축소 금지**(무후퇴).
- **역행 금지**: 종결상태(`WITHDRAWN`/`CANCELLED`/`EXPIRED`/`SUPERSEDED`/`COMPLETED`)에서의 이탈 전이 **없음**. `REJECTED`·`CHANGES_REQUIRED`·`RETURNED` 로부터의 복귀는 **`REOPEN_PENDING` 경유만**(원문 #19·#20) — 직접 되돌리기 아님.
- **`PENDING`류 → 종결 직행 금지** — 원문은 Withdrawal·Cancellation 모두 **`*_PENDING` 2단계**를 요구한다(#14~#17). 현행 `Alerting.php:653` 의 `UPDATE ... SET status=?` 직접 덮어쓰기는 이 2단계를 **원천 위반**한다.
- **구현은 `FeedTemplate.php:248-285` 확장** — 별도 State Machine 라이브러리/엔진 도입 금지(중복 신설 금지 · Golden Rule = Extend).
- **모든 전이는 History INSERT 를 동반**(§28) — `UPDATE status` 단독 금지.
- **코드변경 0**.
