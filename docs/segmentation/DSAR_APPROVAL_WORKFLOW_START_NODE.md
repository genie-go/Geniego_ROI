# DSAR — Start Node (§13)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §13 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Start Node | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 현행 "시작" | 승인 요청 INSERT = 시작(`Mapping` proposals · `AdminGrowth::createApproval` AdminGrowth.php:1289-1297) — **노드 아님** | 축 다름 |
| 🔴 `action_request` 시작점 | **`INSERT INTO action_request` grep 0** → **생산자 전무**. 소비자(`decideAction`·`executeAction`)만 존재 | **VACUOUS** — 시작 없는 워크플로 |
| Mandatory Input 검증 | 부분 — `Mapping::approve` 는 신원 미확인 **403**(Mapping.php:36-53 fail-closed) · 그러나 **입력 스키마 검증은 부재** | `MIGRATION_REQUIRED` |
| 중복 시작 방지 | `AdminGrowth::createApproval`(AdminGrowth.php:1292) 동일 `ref_type/ref_id` pending 시 재사용 — **현행 유일한 승인측 중복 방지** | `LEGACY_ADAPTER` |
| Idempotency | `idempotency_key`·`Idempotency-Key` **grep 0** · 유사물 `dedup_key`+UNIQUE(Db.php:257-281) · `Paddle.php:343` `notification_id` UNIQUE | `MIGRATION_REQUIRED` |

**★원문 요구:** "모든 Workflow Version은 정확히 하나의 Primary Start Node를 가져야 한다." → **현행 검증 불가**(Version·Node 부재).

## 1. 원문 전사 + 판정

### 1.1 지원 Start Trigger — **원문 11종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL_REQUEST_ACCEPTED | 부재 — Request 수락 이벤트 없음(INSERT 가 곧 시작) | `NOT_APPLICABLE` |
| 2 | APPROVAL_CASE_CREATED | 부재 — Case 개념 전무 | `NOT_APPLICABLE` |
| 3 | MANUAL_START | 부재(노드축) · 유사 = 관리자 수동 승인 생성 | `LEGACY_ADAPTER` |
| 4 | API_START | 부재(노드축) · 유사 = `POST /v418/mappings/proposals`(routes.php:461 계열) | `LEGACY_ADAPTER` |
| 5 | EVENT_START | 부재 · 🔴 `action_request` 가 **이 자리에 있어야 할 생산자**이나 grep 0 | `NOT_APPLICABLE`(VACUOUS) |
| 6 | SCHEDULED_START | 부재(승인) · 인접 = SMS 예약 워커(286차) | `NOT_APPLICABLE` |
| 7 | MESSAGE_START | 부재 · 인접 = Paddle webhook(Paddle.php:343 멱등) | `LEGACY_ADAPTER` |
| 8 | SUB_WORKFLOW_START | 부재(grep 0) | `NOT_APPLICABLE` |
| 9 | MIGRATION_START | 부재 | `NOT_APPLICABLE` |
| 10 | REOPEN_START | 부재 — Reopen/Supersession 전무(§52 §4) | `NOT_APPLICABLE` |
| 11 | EMERGENCY_REFERENCE | 부재 — break-glass grep 0 | `NOT_APPLICABLE` |

**실측 개수: 11 / 11 전사.** 커버리지 = 부재 7 · 어댑터 4.

### 1.2 차단 항목 — **원문 4종**(“다음을 차단하라”)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Start Node 없음 | 검증 불가(Node 부재) · 🔴 **`action_request` 가 실질적으로 "Start 없는 워크플로"** — 생산자 grep 0 인데 소비자가 실집행 | `NOT_APPLICABLE`(신설 검증) |
| 2 | 명시적 Multi-start 정책 없이 여러 Start Node | 검증 불가 | `NOT_APPLICABLE` |
| 3 | 들어오는 Edge가 있는 Primary Start Node | 검증 불가(Edge 부재) | `NOT_APPLICABLE` |
| 4 | Mandatory Input 검증 없이 실행 시작 | 부분 — 신원 fail-closed(Mapping.php:36-53)는 REAL, **입력 스키마 검증 부재** | `MIGRATION_REQUIRED` |

**실측 개수: 4 / 4 전사.**

## 2. 규칙

- **Primary Start Node 는 정확히 하나** — 다중 시작은 **명시적 Multi-start 정책**이 있을 때만.
- 🔴 **Start Trigger 를 `action_request` 로 배선 금지.** 생산자 `INSERT` **grep 0** = **부재**다. 없는 생산자를 있다고 가정한 배선은 **287차 죽은 스켈레톤**이며, 배선하는 순간 `executeAction` 의 **승인 우회(§12·Alerting.php:612)가 즉시 활성 결함**이 된다 — **생산자 배선 전에 우회부터 고쳐야 한다**.
- `API_START` 는 **Idempotency 필수**(§4.6 at-least-once 전제). 신설 금지 — `dedup_key`+UNIQUE(Db.php:257-281)·`notification_id` UNIQUE(Paddle.php:343) **선례를 확장**하라.
- Mandatory Input 검증은 **시작 전** 수행 — 시작 후 검증은 §4.8(실패를 정상 완료로 처리 금지) 위반 경로를 만든다.
- 신원 확인은 `Mapping::actorId` **fail-closed**(미확인 → null → 403)를 정본으로 하라. 🔴 `Alerting::actor`(Alerting.php:33-36) **위조 가능**(클라이언트 헤더) — 참조 금지.
