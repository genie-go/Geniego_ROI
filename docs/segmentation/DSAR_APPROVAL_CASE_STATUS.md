# DSAR — Approval Case Status (§27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §27 "Approval Case 상태"** — 원문 나열 실측 **22종**.

## 0. 현행 실측 (file:line)

| 현행 상태값 | 실측 | 분류 |
|---|---|---|
| `action_request.status` | `Db.php:596` VARCHAR(50) — **CHECK/ENUM 없음**. 관측값 `pending`/`approved`/`rejected`/`executed`/`failed`/`approved_manual`(`Alerting.php:593,608-611`) | **MIGRATION_REQUIRED**(자유문자열) |
| `mapping_change_request.status` | `Db.php:631` `DEFAULT 'pending'` — `pending`→`approved`(`Mapping.php:287`)→`applied`(`:327`) | **VALIDATED_LEGACY**(3값 준-상태기계) |
| `admin_growth_approval.status` | `AdminGrowth.php:1321` — `pending`/`approved`/`rejected` **3값 화이트리스트 검증** | **VALIDATED_LEGACY** |
| `catalog_writeback_job.status` | `Catalog.php:2350,2355` — `pending_approval`→`queued` | **VALIDATED_LEGACY** |
| `FeedTemplate` 상태전이 | `FeedTemplate.php:248-285` — `draft→submitted→approved→published` **순차 강제·역행 차단·`must_approve_first` 409** | **CANONICAL_APPROVAL_STATUS**(★현행 유일한 명시적 상태전이 강제 · **승격·재사용**) |
| **Case** 단위 상태 | grep 0(Case 개념 부재) | **NOT_APPLICABLE(부재·grep 0 → 신설)** |

> **핵심**: 현행 상태는 전부 **Request 단위**다. Case 단위 상태(부분승인 집계·혼합 결과)는 **전면 부재**.

## 1. 스펙 §27 "Approval Case 상태" 전사 — 원문 실측 **22종**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §27 "Approval Case 상태"**

> ✅ **REQ 집계 22 ↔ 원문 실측 22 — 개수 일치.**
>
> 🔴 **그러나 본 절의 초판(`UNVERIFIED_TRANSCRIPTION`)은 폐기됐다 — 개수만 맞고 항목명이 전부 날조였다.**
> 초판 22종(`DRAFT`·`VALIDATING`·`PENDING`·`CHANGES_REQUESTED`·`PARTIALLY_REJECTED`·`EXECUTING`·`EXECUTED`·`EXECUTION_FAILED`·`RECONCILING`·`CLOSED` 등)은 **원문 §27 Case 상태에 존재하지 않는다.**
> 원문에만 있는 것: `CREATED`·`OPEN`·`ROUTING_PENDING`·`ASSIGNMENT_PENDING`·`IN_PROGRESS`·`WAITING_FOR_DECISION`·`PARTIALLY_COMPLETED`·`PAUSED`·`COMPLETED`·`BLOCKED`·`FAILED`·`UNKNOWN`.
> **★개수 일치는 정합의 증거가 아니다.** REQ 개수에 맞춰 22개를 지어내면 개수는 항상 맞는다 — 그것이 **289차 ② 351 사건의 정확한 메커니즘**이다.

**§0 실측: Case 단위 상태 grep 0(Case 개념 부재)** → **22종 전부 부재**가 §0 정합 판정이다. 아래 "현행 대응"은 §0 이 기록한 **Request 단위** 값과의 인접성만 표기한다(축 상이 — 승격 확정 아님).

| # | Case 상태 (원문) | 현행 존재 여부 — §0 실측 인용 |
|---|---|---|
| 1 | `CREATED` | **부재** — §0 "Case 단위 상태 grep 0" · **NOT_APPLICABLE(신설)** |
| 2 | `OPEN` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 3 | `ROUTING_PENDING` | **부재** — §0 동일. ※라우팅은 Workflow 축(`5-3-2` 범위) |
| 4 | `ASSIGNMENT_PENDING` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 5 | `IN_PROGRESS` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 6 | `WAITING_FOR_DECISION` | **부재(Case 축)** — ※인접(Request 축): `pending`(Db.php:631 DEFAULT · AdminGrowth.php:1321 화이트리스트) · **축 상이** |
| 7 | `PARTIALLY_COMPLETED` | **부재** — §0 "Case 단위 상태(부분승인 집계·혼합 결과)는 **전면 부재**" · **NOT_APPLICABLE(신설)** |
| 8 | `APPROVED` | **부재(Case 축)** — ※인접(Request 축): `approved`(Mapping.php:287 · AdminGrowth.php:1321) · **VALIDATED_LEGACY**(Request 단위) |
| 9 | `CONDITIONALLY_APPROVED` | **부재** — §0 Case 상태 grep 0 · **NOT_APPLICABLE(신설)** |
| 10 | `REJECTED` | **부재(Case 축)** — ※인접(Request 축): `rejected`(AdminGrowth.php:1321 3값 화이트리스트) · **축 상이** |
| 11 | `CHANGES_REQUIRED` | **부재** — §0 Case 상태 grep 0 · **NOT_APPLICABLE(신설)** |
| 12 | `RETURNED` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 13 | `PAUSED` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 14 | `WITHDRAWN` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 15 | `CANCELLED` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 16 | `EXPIRED` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 17 | `REOPENED` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** |
| 18 | `SUPERSEDED` | **부재** — §0 동일 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 19 | `COMPLETED` | **부재(Case 축)** — ※인접(Request/Job 축): `applied`(Mapping.php:327) · `queued`(Catalog.php:2355) · **축 상이** |
| 20 | `BLOCKED` | **부재** — §0 Case 상태 grep 0 · **NOT_APPLICABLE(신설)** |
| 21 | `FAILED` | **부재(Case 축)** — ※인접(Request 축): `failed`(Alerting.php:593,608-611 관측값) · **축 상이** |
| 22 | `UNKNOWN` | **부재** — §0 Case 상태 grep 0 · **NOT_APPLICABLE(신설)** |

> **§0 핵심 재확인**: *"현행 상태는 전부 **Request 단위**다. Case 단위 상태(부분승인 집계·혼합 결과)는 **전면 부재**."*
> ⇒ 위 "인접" 5건(6·8·10·19·21)은 **Request 축 값**이며 **Case 상태로 승격 확정한 것이 아니다**. 매핑 확정은 별도 승인 사항(여기서 확정하면 역산 — REQ §15).
> ※ `FeedTemplate.php:248-285`(**CANONICAL_APPROVAL_STATUS** · 현행 유일한 명시적 상태전이 강제)의 `draft→submitted→approved→published` 역시 **Request/문서 축**이며 원문 §27 Case 상태와 **직접 대응하지 않는다**.

## 2. 규칙

**§4.8 5구분 강제**: `WITHDRAWN`/`CANCELLED`/`REJECTED`/`EXPIRED`/`SUPERSEDED`는 **서로 다른 상태** — 현행처럼 `rejected` 하나로 뭉개지 말 것. **§4.7**: Authorization Deny(권한 없음·403)는 Case 상태가 **아니다**. 상태 전이 통제는 `FeedTemplate.php:248-285` 패턴을 **확장**(신설 금지·Golden Rule). 전이 목록 정본 = `DSAR_APPROVAL_ALLOWED_TRANSITIONS.md`(§29). **코드변경 0**.
