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

## 1. 스펙 §27 Request Status 25종 전사 — **BLOCKED**

**분류: `BLOCKED_SPEC_TEXT_UNAVAILABLE`**

REQ 분모(§7 표)는 **"§27 Request Status = 25"** 라는 **개수만** 영속한다. **25종 항목명은 저장소에 없다**(REQ 외 grep 0).

**25종 추측 생성 금지** — REQ §16(요구 날조 0) · REQ §9(351 사건 = 근거 없는 숫자의 정본화 사고). **해제 조건**: 스펙 §27 원문 수령 → 전사표로 교체.

> ※ 위 §0 의 **9개는 추측이 아닌 실측 전수**이며, 부재 항목도 **개별 grep 0 확인분**이다(스펙이 요구할 항목의 예단 아님).

## 2. 규칙

- **§4.8 준수**: Withdrawal·Cancellation·Rejection·Expiration·Supersession 을 **구분**하라. 현행은 5종이 전부 부재하거나 `rejected` 하나로 뭉개져 있다.
- **§4.9 Append-only**: 현행 `status` 덮어쓰기 → Status History 테이블로 이관. **기존 `status` 컬럼은 파괴 금지**(투영으로 유지 · 무후퇴).
- **집행 전 status 검증 강제**(Runtime Guard 후보) — `executeAction` 이 SELECT 한 값을 **읽게** 하는 것이 최소 수정. 단 **VACUOUS = 별도 승인 세션**(본 세션 비파괴).
- 자유 VARCHAR → Canonical 열거형 전환 시 **기존 9개 값 전부 매핑 보존**(무후퇴 · 마이그레이션 손실 금지).
