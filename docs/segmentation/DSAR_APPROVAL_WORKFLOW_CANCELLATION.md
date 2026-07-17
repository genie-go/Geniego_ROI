# DSAR — Workflow Cancellation (§51)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §51 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 워크플로 인스턴스 취소 | **부재** — 인스턴스 개념 자체 없음(`workflow_*`/`flow_*`/`wf_*` grep 0) | `NOT_APPLICABLE` |
| 실행 중단 프리미티브 | `exit` 노드(JourneyBuilder 노드 13종 중) — **마케팅 여정 종료** | `KEEP_SEPARATE_WITH_REASON` |
| 취소 후 역분개 선례 | **OrderHub 수동취소 역분개**(268차 · OrderHub.php:495 · :1041-1050) — 운영자 수동 활성→취소/반품 전이 시 CRM LTV 역분개 + 채널/물리재고 복원 | `LEGACY_ADAPTER`(선례 인용) |
| Sub-workflow 전파 | **부재**(`sub_journey`/`call_activity` grep 0) | `NOT_APPLICABLE` |
| 외부 작업 취소 | 인접 액추에이터 = `AdAdapters::pause`(AdAdapters.php:264-275 · **킬스위치 면제 = 279차 D-P1 의도된 설계**) | `LEGACY_ADAPTER` |
| `compensation` | **`compensation` backend/src grep 0** | `NOT_APPLICABLE` |
| 취소 상태 게이트 | 인접 = `Mapping.php:238-294` 비-pending 409 | `LEGACY_ADAPTER`(공용 추출 대상) |

**★축 주의 — `exit` 노드는 취소가 아니라 정상 종료다.** JourneyBuilder 의 `exit` 는 **여정이 설계대로 끝나는 것**이고, §51 은 **진행 중인 것을 외부 의사로 중단**하는 것이다. 형태(실행 중단)가 닮았을 뿐 의미가 반대다 → 커버로 계산하면 역산.

**★두 번째 축 주의 — 이 스펙의 핵심은 "취소 시점에 따라 취소가 다른 일이 된다"는 것.** 원문이 5종을 **구분하라**고 명시한 이유는, `승인 전 단순 취소`(상태만 바꾸면 됨)와 `Financial Execution 후 취소`(돈이 이미 나감 → 보상 필요)가 **같은 `cancellation type` 아래 뭉개지면 후자가 조용히 전자처럼 처리**되기 때문이다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 15개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_cancellation_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재 | `NOT_APPLICABLE` |
| 3 | approval cancellation reference | 부재 — **승인 취소**(§) 와 **워크플로 취소**(§51)의 분리 참조 | `NOT_APPLICABLE` |
| 4 | cancellation type | 부재 — 아래 5종 구분축 | `NOT_APPLICABLE` |
| 5 | requested by | 부재 · 인접 위조불가 신원 = `Mapping::actorId`(289차 신설 · 미확인 null→403 fail-closed) | `LEGACY_ADAPTER`(공용 추출 대상) |
| 6 | reason | 부재 | `NOT_APPLICABLE` |
| 7 | active task handling | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 8 | active token handling | 부재 — Token 개념 전무 | `NOT_APPLICABLE` |
| 9 | sub-workflow propagation | 부재(grep 0) | `NOT_APPLICABLE` |
| 10 | external task handling | 부재(승인) · 인접 = `AdAdapters::pause`(AdAdapters.php:264) | `LEGACY_ADAPTER` |
| 11 | compensation reference | 부재(grep 0) · §52 와 짝 | `NOT_APPLICABLE` |
| 12 | effective at | 부재 | `NOT_APPLICABLE` |
| 13 | completed at | 부재 — **취소 요청 시각 ≠ 취소 완료 시각**(비동기 전파) | `NOT_APPLICABLE` |
| 14 | status | 부재(승인) · 전이 규칙 선언 0(`UPDATE ... SET status=` 155건/44파일 전부 인라인) | `NOT_APPLICABLE` |
| 15 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사.** 커버리지 = 부재 12 · 어댑터 3.

## 2. 원문 전사 + 판정 — 구분 대상 **원문 5종**

원문: **"다음을 구분하라."**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 승인 전 단순 취소 | 부재 · 인접 = `Mapping.php:238-294` 비-pending 409 상태 게이트(pending 단계 식별은 가능) | `LEGACY_ADAPTER` |
| 2 | 일부 Decision 후 취소 | 부재 — **부분 승인 상태 개념 없음**. 현행 정족수는 코드 리터럴(Mapping INSERT `2` :209)이라 "2명 중 1명 승인 후 취소" 를 표현할 축이 없음 | `NOT_APPLICABLE` |
| 3 | 외부 작업 실행 후 취소 | 부재 · 인접 액추에이터 = `AdAdapters::pause`/`updateBudget`(Alerting.php:631/:634) | `LEGACY_ADAPTER` |
| 4 | Financial Execution 후 취소 | 부재(승인) · 인접 선례 = OrderHub 수동취소 역분개(OrderHub.php:495 · :1041-1050) | `LEGACY_ADAPTER` |
| 5 | Compensation 필요 취소 | 부재(grep 0) · §52 Compensation Reference 로 위임 | `NOT_APPLICABLE` |

**실측 개수: 5 / 5 전사.** 커버리지 = 부재 2 · 어댑터 3.

## 3. 규칙

- 🔴 **5종을 하나의 취소 경로로 뭉개지 마라.** 원문이 `구분하라`고 명시한 축이다. `Financial Execution 후 취소`를 `승인 전 단순 취소`처럼 status 만 바꾸면 **돈은 나갔는데 기록만 취소**된다 = 가짜 취소.
- 🔴 **취소는 삭제가 아니다.** §52 원문 실측: *"Compensation은 원본 Event 삭제가 아니라 별도 보상 작업으로 처리한다."* 취소 시 원본 인스턴스/결정 이력을 지우면 감사 불가 → **`status` 전이 + 보상 작업 추가**.
- 🔴 **`completed at` 을 `effective at` 과 합치지 마라.** sub-workflow 전파·외부 작업 취소는 **비동기**다. 요청 즉시 `completed` 로 적으면 **전파 실패가 은폐**된다(가짜 녹색). 전파 미완이면 취소는 아직 `pending` 이다.
- `external task handling` 의 실집행은 **`AdAdapters` 에 위임**(자격증명 게이트·감사로그 내장) — 신설 액추에이터 금지.
  🔴 **`Alerting::executeAction`(Alerting.php:601-660)을 참조 구현으로 삼지 마라**: `:612` 가 `status` 를 SELECT 하고 **어디서도 판독하지 않아** `pending`·`rejected` 도 실집행된다(승인 우회). `INSERT INTO action_request` grep 0 → 생산자 전무 → 현재 `VACUOUS` 이나 **생산자 배선 시 즉시 활성 결함**.
- ✅ **`Financial Execution 후 취소` 의 참조 구현 = OrderHub 수동취소 역분개**(268차). 실측 규율 3가지를 그대로 승계하라:
  1. **자동 경로와 대칭**(OrderHub.php:495 — 수동 전이도 자동 폴링/웹훅과 동일 부수효과)
  2. **이중 보상 방지**(:1042 — `ingestClaims` 는 CRM 역분개만, 재고는 폴링 담당)
  3. **멱등으로 중복 보상 차단**(:1043 실측 — *"order_id 멱등이라 이후 채널 폴링 recordCrmRefund 와 중복돼도 이중역분개 없음"*)
- `sub-workflow propagation` 은 **Sub-workflow 자체가 부재**(§12 #22 `SUB_WORKFLOW` = `NOT_APPLICABLE`)하므로 **"있다고 가정하고 배선 금지"**. 전파 대상이 생기기 전까지 이 필드는 `CONTRACT_ONLY`.
