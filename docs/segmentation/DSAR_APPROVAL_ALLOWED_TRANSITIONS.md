# DSAR — Approval Request 허용 전이 (§29)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §29 Request 허용 전이 = 22). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.
> ⚠️ 상태명은 §27 Request Status(25) 정본 확정 시 재대조 필요(`DSAR_APPROVAL_REQUEST_STATUS.md` 미작성).

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

## 1. CANONICAL 허용 전이 (22) — 화이트리스트

| # | From → To | 조건 |
|---|---|---|
| 1 | `DRAFT` → `SUBMITTED` | 요청자 제출 |
| 2 | `DRAFT` → `CANCELLED` | |
| 3 | `SUBMITTED` → `VALIDATING` | |
| 4 | `VALIDATING` → `VALIDATION_FAILED` | 요건 미충족(§17) |
| 5 | `VALIDATING` → `PENDING` | 요건 충족 |
| 6 | `VALIDATION_FAILED` → `DRAFT` | 보완 후 재제출 |
| 7 | `PENDING` → `IN_REVIEW` | |
| 8 | `PENDING` → `WITHDRAWN` | **요청자**만(§36) |
| 9 | `PENDING` → `EXPIRED` | 기한 만료 |
| 10 | `IN_REVIEW` → `APPROVED` | **정족수 충족**(`Mapping.php:288` 패턴) |
| 11 | `IN_REVIEW` → `CONDITIONALLY_APPROVED` | §25 |
| 12 | `IN_REVIEW` → `PARTIALLY_APPROVED` | §16 Item 일부 |
| 13 | `IN_REVIEW` → `REJECTED` | §4.7 — 권한 Deny 아님 |
| 14 | `IN_REVIEW` → `CHANGES_REQUESTED` | |
| 15 | `CHANGES_REQUESTED` → `DRAFT` | 보완 |
| 16 | `APPROVED` → `EXECUTING` | **Execution Binding**(§40) |
| 17 | `CONDITIONALLY_APPROVED` → `EXECUTING` | 조건 충족 후 |
| 18 | `EXECUTING` → `EXECUTED` | |
| 19 | `EXECUTING` → `EXECUTION_FAILED` | |
| 20 | `APPROVED` → `SUPERSEDED` | **Critical Field 변경**(§31) · 신 Version |
| 21 | `EXECUTED` → `RECONCILING` | §43 |
| 22 | `RECONCILING` → `CLOSED` | 종결 |

## 2. 규칙

- **화이트리스트 외 전이는 전부 `409 invalid_state`**(Deny-by-default). 위 표에 없으면 **금지**다.
- **역행 금지**: `APPROVED`→`PENDING`, `EXECUTED`→`APPROVED`, 종결상태(`CLOSED`/`WITHDRAWN`/`CANCELLED`/`EXPIRED`/`SUPERSEDED`)에서의 이탈 전이 **없음**.
- **`APPROVED`→`EXECUTED` 직행 금지** — 반드시 `EXECUTING` 경유(집행 실패 관측 가능성 확보). 현행 `Alerting.php:653` 은 이를 보장하지 않는다.
- **구현은 `FeedTemplate.php:248-285` 확장** — 별도 State Machine 라이브러리/엔진 도입 금지(중복 신설 금지 · Golden Rule = Extend).
- **모든 전이는 History INSERT 를 동반**(§28) — `UPDATE status` 단독 금지.
- **코드변경 0**.
