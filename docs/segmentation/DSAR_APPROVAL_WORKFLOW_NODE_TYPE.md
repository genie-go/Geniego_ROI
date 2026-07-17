# DSAR — Workflow Node Type (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §12 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 승인 노드 타입 | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| Gateway 계열 | `exclusive_gateway`·`inclusive_gateway` **backend/src grep 0** | `NOT_APPLICABLE` |
| Boundary 계열(Error/Timeout/Cancel) | **grep 0** | `NOT_APPLICABLE` |
| `journeys` 노드 10종 | `action·condition·delay·email·kakao·push·sms·split·wait·webhook`(JourneyBuilder.php) — **마케팅 여정** | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — 형태 유사 ≠ 의미 동일.** `journeys` 의 `condition`/`split`/`wait`/`delay` 는 원문의 `CONDITION_GATEWAY`/`EXCLUSIVE_GATEWAY`/`WAIT`/`TIMER` 와 **형태가 닮았으나 승인 도메인이 아니다**(마케팅 발송 분기). 이를 커버로 계산하면 **갭이 정의상 소멸하는 역산**이다 → 전부 `NOT_APPLICABLE` 로 판정한다.

## 1. 원문 전사 + 판정 — **원문 30종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | START | 부재(§13) | `NOT_APPLICABLE` |
| 2 | END | 부재(§14) | `NOT_APPLICABLE` |
| 3 | APPROVAL_TASK | 부재 — 승인은 노드가 아니라 **핸들러 메서드**(`Mapping::approve` Mapping.php:238-294) | `NOT_APPLICABLE` |
| 4 | REVIEW_TASK | 부재 — Review/Approval 미분화 | `NOT_APPLICABLE` |
| 5 | HUMAN_TASK | 부재 — Task/배정/클레임 개념 전무 | `NOT_APPLICABLE` |
| 6 | MANUAL_TASK | 부재 | `NOT_APPLICABLE` |
| 7 | SYSTEM_TASK | 부재 | `NOT_APPLICABLE` |
| 8 | SERVICE_TASK | 부재 · 인접 실액추에이터 = `AdAdapters::pause`(Alerting.php:631)/`updateBudget`(:634) | `LEGACY_ADAPTER`(집행 대상) |
| 9 | SCRIPT_TASK_RESTRICTED | 부재 | `NOT_APPLICABLE` |
| 10 | NOTIFICATION_TASK | 부재(승인) · 인접 발송 인프라 존재(SMS/Email) | `LEGACY_ADAPTER` |
| 11 | DECISION_GATEWAY | 부재(grep 0) | `NOT_APPLICABLE` |
| 12 | CONDITION_GATEWAY | 부재(grep 0) · `journeys` `condition` 은 **마케팅 분기** | `NOT_APPLICABLE` |
| 13 | EXCLUSIVE_GATEWAY | **grep 0** | `NOT_APPLICABLE` |
| 14 | INCLUSIVE_GATEWAY | **grep 0** | `NOT_APPLICABLE` |
| 15 | PARALLEL_GATEWAY_REFERENCE | 부재 | `NOT_APPLICABLE` |
| 16 | EVENT_GATEWAY | 부재 | `NOT_APPLICABLE` |
| 17 | TIMER | 부재(승인) · 인접 = SMS 예약 워커(286차) | `NOT_APPLICABLE` |
| 18 | WAIT | 부재(승인) | `NOT_APPLICABLE` |
| 19 | SIGNAL_CATCH | 부재 | `NOT_APPLICABLE` |
| 20 | MESSAGE_CATCH | 부재 · 인접 = Paddle webhook `notification_id` UNIQUE(Paddle.php:343) | `LEGACY_ADAPTER`(멱등 수신 선례) |
| 21 | MESSAGE_THROW | 부재 | `NOT_APPLICABLE` |
| 22 | SUB_WORKFLOW | 부재(grep 0) | `NOT_APPLICABLE` |
| 23 | COMPENSATION_REFERENCE | 부재 · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 24 | ERROR_BOUNDARY | 부재(grep 0) | `NOT_APPLICABLE` |
| 25 | TIMEOUT_BOUNDARY | 부재 | `NOT_APPLICABLE` |
| 26 | CANCEL_BOUNDARY | 부재 | `NOT_APPLICABLE` |
| 27 | MERGE | 부재 | `NOT_APPLICABLE` |
| 28 | FORK_REFERENCE | 부재 | `NOT_APPLICABLE` |
| 29 | JOIN_REFERENCE | 부재 | `NOT_APPLICABLE` |
| 30 | CUSTOM_RESTRICTED | 부재 | `NOT_APPLICABLE` |

**실측 개수: 30 / 30 전사.** 커버리지 = 부재 27 · 어댑터 3.

## 2. 규칙

- 🔴 **`journeys` 노드 10종을 원문 30종에 매핑 금지.** 형태 유사·도메인 상이 → 매핑은 역산이다.
- `SERVICE_TASK` 의 실집행은 **`AdAdapters` 에 위임**(자격증명 게이트·감사로그 내장) — 신설 액추에이터 금지.
  🔴 단 `Alerting::executeAction`(Alerting.php:601-660)을 **참조 구현으로 삼지 마라**: `:612` 에서 `status` 를 SELECT 하고도 **어디서도 판독하지 않아** `pending`·`rejected` 도 실집행된다(승인 우회). **`INSERT INTO action_request` grep 0 → 생산자 전무 → 현재 VACUOUS**이나, **생산자 배선 시 즉시 활성 결함**이다.
- `SCRIPT_TASK_RESTRICTED` 는 §16 **"Production 에서 Restricted Script Node 없음"** 과 짝이다 — 프로덕션 차단이 전제 없이는 무의미.
- `*_REFERENCE` 접미 노드(PARALLEL/COMPENSATION/FORK/JOIN)는 **참조 유형** — 해당 정의를 참조만 하고 **중복 정의 금지**.
- 🔴 27종 **"있다고 가정"하고 배선 금지**.
