# DSAR — Approval Request Status (§27)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — 실재 상태값 전수

| 상태값 | 실측 근거 | 소유 |
|---|---|---|
| `pending` | `mapping_change_request.status DEFAULT 'pending'`(Db.php:632) · Mapping.php:262 게이트 · AdminGrowth.php:147 DEFAULT | mapping · action · admin growth |
| `approved` | Mapping.php:288(`count>=required_approvals`) · Alerting.php:594(**1회 approve 즉시**) | mapping · action · agency |
| `rejected` | Alerting.php:594(`decision!=='approve'`) | action · admin growth |
| `executed` | Alerting.php `executeAction` 성공 시 | action |
| `failed` | Alerting.php:628~ (실집행 실패 · 287차 정직화) | action |
| `approved_manual` | Alerting.php:630(`$finalStatus='approved_manual'` — **자동집행 불가**) | action |
| `applied` | Mapping.php:296-327 `apply`(status!=='approved' 게이트 :309) | mapping |
| `pending_approval` | `catalog_writeback_job.status`(Catalog.php:2269~ · **실 SSOT**) | catalog |
| `revoked` | `agency_client_link`(AgencyPortal.php:80 · pending→approved→revoked) | agency |

**현행 상태 어휘 총계 = 9개**(테이블별 분산 · **공유 열거형 없음** · 전부 자유 VARCHAR).

| 스펙 요구 | 현행 실측 | Canonical 분류 |
|---|---|---|
| Request Status **25종** 통합 열거형 | **9개 · 4테이블 분산 · 상수 정의 grep 0**(문자열 리터럴 직접 비교) | **MIGRATION_REQUIRED** |
| 상태 전이 통제(State Machine) | **부재(grep 0)** — Workflow/State Machine/BPMN/Temporal/Camunda/Flowable/Zeebe/Step Functions **backend/src grep 0**. 유일한 전이 게이트 = Mapping.php:262(`!=='pending'` → 409) · :309(`!=='approved'` → apply 차단) | **NOT_APPLICABLE(신설)** · 게이트 2건만 **VALIDATED_LEGACY** |
| `status` **미독 집행** | `Alerting::executeAction` :612 에서 `status` SELECT 하나 **어디서도 읽지 않음** → pending/rejected 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) 실집행 = **승인 우회**. **단 `INSERT INTO action_request` grep 0 → 생산자 전무 → 도달 불가** | **★MIGRATION_REQUIRED** · 실피해 **VACUOUS**(P1) |
| `withdrawn` · `cancelled` · `expired` · `superseded` · `reopened` · `on_hold` · `escalated` · `partially_approved` 등 | **부재(grep 0)** | **NOT_APPLICABLE(부재 → 신설)** |
| 상태 이력(Status History) | **부재(grep 0)** — `status` **덮어쓰기**(Mapping.php:289 UPDATE · Alerting.php:595 UPDATE). 이전 상태 소실 | **NOT_APPLICABLE(신설)** · §4.9 Append-only 상충 |

## 1. 스펙 §27 "Approval Request 상태" 전사 — 원문 실측 **26종**

**전사 근거: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §27 "Approval Request 상태"**

> 🔴 **REQ 집계 25 ↔ 원문 실측 26 — 원문이 정본.**
> REQ `§7` 표의 *"§27 Request Status = **25**"* 는 **원문 나열과 1건 어긋난다**(원문 나열 실측 = 26).
> **숫자를 조용히 맞추지 않는다**(289차 ② 351 사건 재현 방지). **REQ 집계 정정은 별도 승인 사항.**

**현행 대응은 §0 의 실재 상태값 9개 전수에서만 인용**한다(신규 판정 생성 0).

| # | Request 상태 (원문) | 현행 대응 — §0 실측 인용 |
|---|---|---|
| 1 | `DRAFT` | **부재** — §0 9개 어휘에 없음 |
| 2 | `SUBMITTED` | **부재** — §0 9개 어휘에 없음 |
| 3 | `VALIDATION_PENDING` | **부재** — §0 9개 어휘에 없음 |
| 4 | `VALIDATION_FAILED` | **부재** — §0 9개 어휘에 없음 |
| 5 | `ACCEPTED` | **부재** — §0 9개 어휘에 없음 |
| 6 | `CASE_CREATION_PENDING` | **부재** — §0 9개 어휘에 없음(Case 개념 자체 부재) |
| 7 | `IN_REVIEW` | **부재** — §0 9개 어휘에 없음 |
| 8 | `APPROVAL_PENDING` | **존재(근사)** — §0 `pending`(Db.php:632 DEFAULT · Mapping.php:262 게이트 · AdminGrowth.php:147 DEFAULT) · **VALIDATED_LEGACY** |
| 9 | `PARTIALLY_APPROVED` | **부재** — §0 명시 부재(grep 0) · **NOT_APPLICABLE(신설)** |
| 10 | `APPROVED` | **존재** — §0 `approved`(Mapping.php:288 정족수 · Alerting.php:594 **1회 approve 즉시**) · **VALIDATED_LEGACY**(Alerting 계통은 취약) |
| 11 | `CONDITIONALLY_APPROVED` | **부재** — §0 9개 어휘에 없음. ※인접: `approved_manual`(Alerting.php:630)은 **자동집행 불가** 표기이지 조건부 승인 아님(축 혼동 금지) |
| 12 | `REJECTED` | **존재** — §0 `rejected`(Alerting.php:594 `decision!=='approve'`) · **VALIDATED_LEGACY** |
| 13 | `CHANGES_REQUIRED` | **부재** — §0 9개 어휘에 없음 |
| 14 | `RETURNED` | **부재** — §0 9개 어휘에 없음 |
| 15 | `WITHDRAWAL_PENDING` | **부재** — §0 `withdrawn` 계열 grep 0 · **NOT_APPLICABLE(신설)** |
| 16 | `WITHDRAWN` | **부재** — §0 `withdrawn` grep 0 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 17 | `CANCELLATION_PENDING` | **부재** — §0 `cancelled` 계열 grep 0 · **NOT_APPLICABLE(신설)** |
| 18 | `CANCELLED` | **부재** — §0 `cancelled` grep 0 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 19 | `EXPIRED` | **부재** — §0 `expired` grep 0 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 20 | `REOPEN_PENDING` | **부재** — §0 `reopened` 계열 grep 0 · **NOT_APPLICABLE(신설)** |
| 21 | `REOPENED` | **부재** — §0 `reopened` grep 0 · **NOT_APPLICABLE(신설)** |
| 22 | `SUPERSEDED` | **부재** — §0 `superseded` grep 0 · **NOT_APPLICABLE(신설)** · §4.8 상충 |
| 23 | `COMPLETED` | **부재(명칭)** — ※§0 인접 종결값 `applied`(Mapping.php:296-327) · `executed`(Alerting `executeAction` 성공) · **매핑 확정은 별도 승인 사항** |
| 24 | `BLOCKED` | **부재** — §0 9개 어휘에 없음 |
| 25 | `FAILED` | **존재** — §0 `failed`(Alerting.php:628~ · 287차 정직화) · **VALIDATED_LEGACY** |
| 26 | `UNKNOWN` | **부재** — §0 9개 어휘에 없음 |

### 1-1. 역방향 — §0 실재 9개 중 §27 에 대응 없는 것

§0 실측 9개 어휘(`pending`·`approved`·`rejected`·`executed`·`failed`·`approved_manual`·`applied`·`pending_approval`·`revoked`) 중 **§27 Request 상태에 직접 대응하는 것은 4개**(8·10·12·25)뿐이다.

| 현행 값 | §27 대응 | 비고 |
|---|---|---|
| `executed` | **없음**(§27 은 승인 상태 · 집행 상태 아님) | 집행 축 = §40/§41(Execution Binding·Consumption) |
| `approved_manual` | **없음** | Alerting.php:630 — 자동집행 불가 표기 |
| `applied` | **없음** | Mapping.php:296-327 — 집행 축 |
| `pending_approval` | **없음**(≈`APPROVAL_PENDING` 이나 **Job 상태**) | Catalog.php:2269~ 실 SSOT |
| `revoked` | **없음** | AgencyPortal.php:80 — 위임 생명주기 |

> ⚠️ **위 대응 판단은 289차 관찰이며 스펙 원문 근거가 아니다.** 마이그레이션 매핑 확정은 별도 승인 사항 — 여기서 확정하면 역산(REQ §15).
> ※ §0 의 **9개는 추측이 아닌 실측 전수**이며, 부재 항목도 **개별 grep 0 확인분**이다.

## 2. 규칙

- **§4.8 준수**: Withdrawal·Cancellation·Rejection·Expiration·Supersession 을 **구분**하라. 현행은 5종이 전부 부재하거나 `rejected` 하나로 뭉개져 있다.
- **§4.9 Append-only**: 현행 `status` 덮어쓰기 → Status History 테이블로 이관. **기존 `status` 컬럼은 파괴 금지**(투영으로 유지 · 무후퇴).
- **집행 전 status 검증 강제**(Runtime Guard 후보) — `executeAction` 이 SELECT 한 값을 **읽게** 하는 것이 최소 수정. 단 **VACUOUS = 별도 승인 세션**(본 세션 비파괴).
- 자유 VARCHAR → Canonical 열거형 전환 시 **기존 9개 값 전부 매핑 보존**(무후퇴 · 마이그레이션 손실 금지).
