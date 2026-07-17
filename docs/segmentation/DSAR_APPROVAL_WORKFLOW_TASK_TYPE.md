# DSAR — Workflow Task Type (§22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §22 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

`APPROVAL_WORKFLOW_TASK_DEFINITION` 의 **Task Type** 축. 엔티티/필수 필드는 [DSAR_APPROVAL_WORKFLOW_TASK_DEFINITION.md](DSAR_APPROVAL_WORKFLOW_TASK_DEFINITION.md) 참조.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Task **타입 축** 선언 | **grep 0** — Task 개념 자체가 전무하므로 타입 축도 성립 불가 | `NOT_APPLICABLE`(부재 → 신설) |
| `journeys` 노드 13종(JourneyBuilder.php) | `trigger`·`email`·`kakao`·`sms`·`push`·`webhook`·`nba`·`decision`·`delay`(:527)·`wait`(:548)·`condition`(:600)·`split`(:610)·`exit`·`attr`·`goal` — **마케팅 여정** · **`approval` 만 결번**(grep 0 · `JourneyBuilderConstants.js` 양쪽) | `KEEP_SEPARATE_WITH_REASON` |
| 승인 실행 단위 | Task 가 아니라 **핸들러 메서드**(`Mapping::approve` Mapping.php:238-294) | `NOT_APPLICABLE` |

**★축 주의 — `journeys` 노드 13종을 원문 17종에 매핑 금지.** `email`/`sms`/`push` 가 `NOTIFICATION` 과, `decision` 이 `POLICY_EVALUATION` 과 형태상 닮았으나 **전부 마케팅 발송 도메인**이다(실행 컨텍스트 `crm_customers`/`journey_enrollments` · **`customer_id` 필수** :554). 승인 Task 커버로 계산하면 **역산**이다. **단 실행 프리미티브(원자적 claim :411-418 · 순회 멱등 :672 · 재폴링 :565-570)는 재사용 근거로 인용 가능**.

**★축 주의 2 — "노드 13종이 있다"와 "Task 타입 17종이 있다"는 다른 명제다.** JourneyBuilder 는 **레포 유일 실 Flow 실행 엔진**이며 `approval` 노드 하나만 결번이다. 그러나 §22가 요구하는 것은 **노드가 아니라 Task 정의**(입출력 계약·배정·권한·완료 정책을 가진 선언체)다. 노드는 **코드 분기**이고 Task 는 **데이터 선언**이다 — **축이 다르다**.

**★축 주의 3 — Review/Approval 미분화.** 현행에는 `REVIEW` 에 해당하는 **"결정권 없는 검토"** 개념이 없다. `Mapping::approve` 는 **모든 참여자가 정족수에 계수**된다 → `REVIEW` 를 도입하려면 **`actor_type` + 계수 제외 규칙**이 함께 필요하다.

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | APPROVAL | 인접 = `Mapping::approve`(Mapping.php:238-294) **레포 유일 REAL 승인**(5단 규율) — 단 **메서드이지 Task 타입 아님** · `journeys` `approval` 노드 **grep 0**(유일 결번) | `VALIDATED_LEGACY`(로직 공용 추출) + `NOT_APPLICABLE`(타입 축) |
| 2 | REVIEW | 부재 — **Review/Approval 미분화**(결정권 없는 검토 개념 0) | `NOT_APPLICABLE` |
| 3 | HUMAN | 부재 — Task/배정/클레임 개념 전무 | `NOT_APPLICABLE` |
| 4 | MANUAL | 부재 | `NOT_APPLICABLE` |
| 5 | SYSTEM | 부재 | `NOT_APPLICABLE` |
| 6 | SERVICE | 부재(타입) · 인접 실액추에이터 = `AdAdapters::pause`(Alerting.php:631)/`updateBudget`(:634) · Kill Switch `AdAdapters::executionEnabled`(:34-40 · **호출부 9곳 실배선 REAL**) | `LEGACY_ADAPTER`(집행 위임 · 신설 액추에이터 금지) |
| 7 | NOTIFICATION | 부재(승인) · 인접 **완비** = `notification_channel` SSOT(Alerting.php:911 · slack/generic webhook/email + `min_severity`) + **폴백 체인**(:471-497 · 282차 "알림 통지 죽음" 수정분). 🔴 **승인↔통지 배선만 0** | `LEGACY_ADAPTER` — **신설 금지·배선만** |
| 8 | DATA_VALIDATION | 부재(Task) · 인접 = `Mapping::apply` 전이 가드(:309) 등 **호출지점 인라인 검증** — 선언적 검증 Task 아님 | `NOT_APPLICABLE` |
| 9 | POLICY_EVALUATION | 부재(승인) · 인접 = `RuleEngine`(데이파팅 `withinAdSchedule` :376-377) · `journeys` `decision`/`condition`(:600) — **마케팅 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 10 | EVIDENCE_COLLECTION | 부재 · 인접 = `journey_node_logs`(:50,:69) **사후 감사로그**이지 수집 Task 아님 | `NOT_APPLICABLE` |
| 11 | RESOURCE_SNAPSHOT | 부재 — 스냅샷 개념 grep 0. 🔴 현행 승인은 **결정 시점 리소스 상태를 고정하지 않는다** → 승인 후 대상이 바뀌어도 검출 불가 | `NOT_APPLICABLE` |
| 12 | AUTHORIZATION_CHECK | 부재(Task) · 인접 = `Mapping::actorId`(289차 신설 · **위조불가 신원만** `apikey:{id}`/`user:{email}` · **미확인 null→403 fail-closed**) · 전역 RBAC 미들웨어(index.php:60-89). 🟠 **`actor_type` 부재 → `apikey:`/`user:` 동등 계수 → API 키 2개로 Maker-Checker 충족 가능** | `VALIDATED_LEGACY`(추출) + 🟠 결함 동반 |
| 13 | EXTERNAL_CALLBACK_WAIT | 부재(승인) · 인접 = Paddle HMAC(:1073) + **멱등**(`notification_id` UNIQUE · **`processed=1`일 때만 skip**) · 🔴 **tenant_id 없음**(:99) · `Webhooks.php:22-27` **opt-in**(미설정 벤더 수신 + `verified=false`) · `wait` event-mode 재폴링(:565-570) | `LEGACY_ADAPTER`(멱등 수신 선례 · 결함 승계 금지) |
| 14 | EXECUTION_BINDING | 부재 — 🔴 **정확히 여기가 `Alerting::executeAction` 결함 지점**: `:612` 가 `status` 를 SELECT 하고 **판독하지 않아** `pending`·`rejected` 도 실집행(승인↔집행 바인딩 **부재**) | `NOT_APPLICABLE`(신설 · 참조 구현 삼기 금지) |
| 15 | RECONCILIATION | 부재(승인) · 인접 = 정산/재고 대사 로직(커머스 도메인) | `NOT_APPLICABLE` |
| 16 | SUB_WORKFLOW | 부재 — `sub_journey`/`call_activity` 등 **grep 0** | `NOT_APPLICABLE` |
| 17 | CUSTOM_RESTRICTED | 부재 | `NOT_APPLICABLE` |

**실측 개수: 17 / 17 전사.** 커버리지 = 부재 11 · 어댑터 3 · 확장 2 · 도메인분리 1.
※ #1 `APPROVAL` 은 **로직은 REAL(추출 대상) · 타입 축은 부재**로 **판정 2개 병기**. 개수는 17종 기준 1건으로 계수한다(임의 보정 없음).

## 2. 규칙

- 🔴 **`journeys` 노드 13종을 원문 17종에 매핑 금지.** 형태 유사·도메인 상이 → 매핑은 역산이다.
- **`APPROVAL` 은 신설 금지·위치 이동.** `Mapping.php:245-290` 5단 규율(**위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수**)을 **공용 트레이트/서비스로 추출**하라. 🔴 **재작성하면 289차 G-01이 닫은 우회로(익명 2회 = 정족수)를 다시 연다.** 🔴 **`EquivalenceProof` 선행 없이 통합 금지**(286차 rank 맵 붕괴 재현).
- 🔴 **Flow 엔진 신설 금지** → `JourneyBuilder` 에 **`approval` 노드 추가**(13종 중 유일 결번) + **`wait` event-mode 재폴링 패턴(:565-570) 재사용**. **단 enrollment 컨텍스트 일반화 선결**(`customer_id` 필수 :554 → 예산·가격·배포 등 **비-고객 승인 태울 수 없음** = 최대 설계 리스크).
- **`SERVICE` 집행은 `AdAdapters` 에 위임**(자격증명 게이트·감사로그 내장) — 신설 액추에이터 금지. **Kill Switch `AdAdapters::executionEnabled`(:34-40) 재사용 강제**.
  ※ 오탐 주의(재플래그 금지): `pause()` 킬스위치 면제 = **279차 D-P1 의도된 설계** · `ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**.
- 🔴 **`EXECUTION_BINDING` 이 §22의 최우선 결번이다.** `Alerting::executeAction`(:601-660)의 **죽은 `status` 읽기**(:612)가 정확히 이 바인딩의 부재를 증명한다. 현재 **VACUOUS**(`INSERT INTO action_request` grep 0 · 생산자 전무)이나 **생산자 배선 시 즉시 활성 결함**이다. **참조 구현 삼기 절대 금지** — 유일 회수 가치는 **액추에이터 배선(:620-650)** 뿐이다.
- **`NOTIFICATION` 신설 금지·배선만** — `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497) **완비**. ⚠️ 282차 트랩: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블 → **무발송**.
- 🟠 **`AUTHORIZATION_CHECK` 는 `actor_type` 도입과 짝으로만 실효.** `Mapping::actorId` 의 fail-closed 는 REAL 이나, **`apikey:`/`user:` 가 동등 계수**되어 **API 키 2개로 Maker-Checker 가 뚫린다**(스펙 §20 위배). `REVIEW`(결정권 없는 검토) 도입 시에도 **계수 제외 규칙**이 필요하다.
- 🔴 **`EXTERNAL_CALLBACK_WAIT` 어댑터 인용 시 결함 승계 금지**: Paddle `paddle_events` **tenant_id 부재**(:99) · `Webhooks.php:22-27` **opt-in = 미인증 수신 허용**. 승인 콜백은 **인증 필수 + tenant fail-closed**.
- **`RESOURCE_SNAPSHOT` 은 진짜 신설**(grep 0) — 현행 승인은 **결정 시점 상태를 고정하지 않아** 승인 후 대상 변경을 검출할 수 없다.
- **멱등은 `claimSendOnce`(JourneyBuilder.php:450·:679) 자연키 선점 마커 채택**(`idempotency_key` grep 0 = 5-3-2 결번).
- 🔴 11종 **"있다고 가정"하고 배선 금지**.
