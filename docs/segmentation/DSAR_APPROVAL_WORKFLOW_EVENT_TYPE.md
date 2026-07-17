# DSAR — Workflow Event Type (§20)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §20 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

`APPROVAL_WORKFLOW_EVENT_DEFINITION` 의 **Event Type** 축. 엔티티/필수 필드는 [DSAR_APPROVAL_WORKFLOW_EVENT_DEFINITION.md](DSAR_APPROVAL_WORKFLOW_EVENT_DEFINITION.md) 참조.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 이벤트 **타입 축** 선언 | **grep 0** — 이벤트 타입을 열거·분기하는 지점 없음 | `NOT_APPLICABLE`(부재 → 신설) |
| `OpenPlatform::EVENTS` 화이트리스트(OpenPlatform.php:46-) | `order.created`·`order.cancelled`·`settlement.created` … = **커머스 도메인 아웃바운드 웹훅 코드** | `KEEP_SEPARATE_WITH_REASON` |
| `journeys` `wait` event-mode(JourneyBuilder.php:548·:554-556) | `purchase`/`email_open`/`email_click` **3종** · `eventOccurred`(:874-885)가 **cron 주기 SELECT 폴링** | `KEEP_SEPARATE_WITH_REASON` — 마케팅 도메인 |
| 승인 도메인 이벤트 | **0종** — 승인은 이벤트를 **발신하지 않는다**(`Mapping::approve` Mapping.php:238-294 는 DB UPDATE 후 종료) | `NOT_APPLICABLE` |

**★축 주의 — 현행 이벤트 코드 축 2벌은 모두 원문 21종과 도메인이 다르다.** `EVENTS`(커머스 웹훅)·`wait` event-mode(마케팅 3종) 어느 쪽도 **승인 라이프사이클 이벤트가 아니다**. 형태(이벤트 이름이 있고 분기한다)가 닮았다고 매핑하면 **갭이 정의상 소멸하는 역산**이다. 아래 21종은 **전부 승인 도메인 기준으로 대조**했다.

**★축 주의 2 — "발신 0"이 진짜 결번이다.** 21종 중 다수(`DECISION_RECORDED`·`TASK_*`)는 **대응 상태 변경 자체는 코드에 존재**한다. 그러나 **그 변경이 이벤트로 발신되지 않는다**(범용 dispatcher grep 0 · 내부는 전부 직접 static 호출). 즉 **"상태는 바뀌나 아무도 깨어나지 않는다"** — 이것이 §20의 결번이다. 상태 변경 코드가 있다고 커버로 계산 금지.

## 1. 원문 전사 + 판정 — **원문 21종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REQUEST_SUBMITTED | 인접 상태변경 = `mapping_change_request` INSERT(Mapping.php:209) **REAL** · 🔴 **`INSERT INTO action_request` grep 0 = 생산자 전무(VACUOUS)** · **어느 쪽도 이벤트 발신 0** | `NOT_APPLICABLE`(발신 결번) |
| 2 | CASE_CREATED | 부재 — Case(승인 인스턴스) 개념 자체 없음 · 워크플로 정의/인스턴스 테이블(`workflow_*`/`flow_*`/`wf_*`) **grep 0** | `NOT_APPLICABLE` |
| 3 | TASK_CREATED | 부재 — Task 개념 전무(§22) | `NOT_APPLICABLE` |
| 4 | TASK_ASSIGNED | 부재 — 배정 개념 전무 | `NOT_APPLICABLE` |
| 5 | TASK_CLAIMED | 부재(승인) · 🔴**인접 실자산 = 레포 최고 성숙 축**: `Omnichannel::claimBatch`(:394-423 · stale lease 900s 회수 → `SELECT..FOR UPDATE SKIP LOCKED`+claim_id → 조건부 UPDATE 폴백) · `JourneyBuilder` 원자적 claim(:411-418) | `LEGACY_ADAPTER`(claim 프리미티브 재사용 · 이벤트 발신은 결번) |
| 6 | TASK_COMPLETED | 부재 | `NOT_APPLICABLE` |
| 7 | TASK_FAILED | 부재 · 인접 = `ad_delivery_dlq`(AdAdapters.php:1127) **레포 유일 DLQ 테이블**(나머지는 원 테이블 `status='failed'` 잔류) | `LEGACY_ADAPTER`(실패 적재만) |
| 8 | DECISION_RECORDED | 인접 상태변경 = `Mapping::approve`(Mapping.php:238-294) **REAL**(정족수·위조불가 신원·자기승인 차단·dedup·상태 게이트) · `AdminGrowth::approvalDecide`(:1322-1327) · `Alerting::decideAction` · **전부 이벤트 발신 0** | `NOT_APPLICABLE`(발신 결번 · 결정 로직은 §22에서 추출 재사용) |
| 9 | RESOURCE_CHANGED | 부재 — 리소스 스냅샷/변경 감지 개념 없음 | `NOT_APPLICABLE` |
| 10 | POLICY_CHANGED | 부재 | `NOT_APPLICABLE` |
| 11 | ROLE_CHANGED | 부재 — 🔴 **`actor_type` 부재**로 역할 축 자체가 미분화(`apikey:`/`user:` 동등 계수) | `NOT_APPLICABLE` |
| 12 | TIMER_FIRED | 부재 — 타이머 서비스·지연큐 부재. 실체 = **DB 컬럼 + cron 폴링**(§21) · 폴링은 **fire 이벤트를 만들지 않는다**(`resume_at <= now` 를 직접 판독 JourneyBuilder.php:529) | `NOT_APPLICABLE` |
| 13 | SIGNAL_RECEIVED | 부재(grep 0) | `NOT_APPLICABLE` |
| 14 | MESSAGE_RECEIVED | 부재(승인) · 인접 = Paddle webhook `notification_id` UNIQUE **멱등 수신**(**`processed=1`일 때만 skip · `processed=0`은 재처리 허용**·272차) · 🔴 `paddle_events` **tenant_id 없음**(:99) | `LEGACY_ADAPTER`(멱등 수신 선례 · 테넌트 결함은 승계 금지) |
| 15 | EXTERNAL_CALLBACK | 인접 = `Webhooks.php:22-27` 범용 인바운드 = **opt-in**(시크릿 미설정 벤더 수신 허용 + `verified=false`) | `KEEP_SEPARATE_WITH_REASON` — opt-in 계약은 승인에 부적격 |
| 16 | INCIDENT_OPENED | 부재(승인) · 인접 = `notification_channel` SSOT(Alerting.php:911 · `min_severity`) + 폴백 체인(:471-497) **완비** | `LEGACY_ADAPTER`(통지만 · 배선 0) |
| 17 | CANCELLATION_REQUESTED | 부재 | `NOT_APPLICABLE` |
| 18 | WITHDRAWAL_REQUESTED | 부재 | `NOT_APPLICABLE` |
| 19 | REOPEN_REQUESTED | 부재 · 🔴 인접 반례 = Paddle `processed=0` 재처리 허용(재개 의미이나 **승인 도메인 아님·이중 결정 위험**) | `NOT_APPLICABLE` |
| 20 | MIGRATION_REQUESTED | 부재 — 워크플로 정의 버전/마이그레이션 개념 전무 | `NOT_APPLICABLE` |
| 21 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 21 / 21 전사.** 커버리지 = 부재 17 · 어댑터 3 · 도메인분리 1.

## 2. 규칙

- 🔴 **`EVENTS` 화이트리스트(OpenPlatform.php:46) 및 `wait` event-mode 3종(JourneyBuilder.php:554-556)을 원문 21종에 매핑 금지.** 커머스 웹훅·마케팅 폴링이며 승인 도메인이 아니다.
- 🔴 **"상태 변경 코드가 있다 = 이벤트가 있다" 로 계산 금지.** `REQUEST_SUBMITTED`·`DECISION_RECORDED` 는 대응 UPDATE/INSERT 가 실재하나(Mapping.php:209·:238-294) **발신이 0**이다. §20의 결번은 **발신·구독 축**이지 상태 축이 아니다.
- **`TASK_CLAIMED` 는 신설 금지·재사용 강제.** `Omnichannel::claimBatch`(:394-423)가 **stale lease 회수 + SKIP LOCKED + 조건부 UPDATE 폴백**까지 갖춘 레포 최고 성숙 자산이다. 🔴 **다른 동시성 모델 도입 금지** — optimistic lock(`version`)·분산락·`GET_LOCK` 전부 **grep 0**이고 이는 **SQLite 폴백 호환이라는 명시적 설계 제약** 때문이다. 신설분은 **조건부 UPDATE + rowCount CAS**(확립 4곳: Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel:427-447)를 채택하라.
- **`TASK_FAILED` 적재는 `ad_delivery_dlq`(AdAdapters.php:1127) 축으로.** 5번째 실패 저장 방식 신설 금지.
  ★ **defer ≠ 실패 규율 승계**(Omnichannel:349,362 — quiet_hours/sto_defer 는 attempts 미증가) · ★ **honest pending 승계**(ChannelSync:6173·Catalog:1712 — 어댑터 부재 시 재시도 미소모).
- **`INCIDENT_OPENED` 통지는 신설 금지·배선만**(`Alerting::pushEvent` 재사용). 승인 이벤트↔통지 배선만 0이다.
- 🔴 **`MESSAGE_RECEIVED` 어댑터 인용 시 Paddle 결함 승계 금지**: `paddle_events` **tenant_id 부재**(:99) → 승인 이벤트는 **tenant 검증 fail-closed 필수**.
- 🔴 17종 **"있다고 가정"하고 배선 금지**.

---

## ★정정 — 통지 인프라 재사용 판정 (289차 9회차 · PM 직접 실측)

> **본 절은 상위 본문의 "통지 = 신설 금지·배선만" 판정을 정정한다.** 초판은 전사자 공통 규율 파일의 **`Alerting::dispatch` 재사용**을 인용했으나, 그 이름은 **실재하지 않는다**.

**① 팬텀 이름의 출처** — `function dispatch(` **grep 0**. `Alerting.php:472-474` **주석**에 *"종전 dispatch 는 …"* 로 남은 **역사적 명칭**(282차 수정으로 소멸)이며, 규율 파일이 이를 실 메서드로 오인해 인용했다. CLAUDE.md 기지 트랩(`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**)과 **동형**이다. → **주석을 API 근거로 삼지 마라.**

**② 실 진입점과 가시성** — `Alerting::pushEvent`(**:917**)만이 `public`이다. 폴백 체인(:471-497)을 품은 `dispatchNotifications`(**:445**)·`sendSlack`(:736)·`sendEmail`(:810)·`sendWebhook`(:937)은 **전부 `private`** → 승인 노드가 직접 부를 수 없다. **가시성 승격이 선결.**

**③ `pushEvent` 는 그대로 재사용 불가** (실측 3제약)
- **반환 `void` + 예외 삼킴**(:934 `catch { error_log }`) → **발송 실패가 무음**. 승인 통지는 감사 대상이므로 **결과 반환·감사 기록이 필수**.
- **`tenant === 'demo'` → no-op**(:919) → **데모 환경에서 승인 통지 검증 불가**(배포 전 E2E 사각).
- **`notification_channel` = `tenant_id` PRIMARY KEY = 테넌트당 1행**(:911-912) · `email_to` **단일 주소** · locale 한국어 하드코딩(:927) → **승인자 개인 통지(recipient resolution) 구조적 불가**.

**④ 정정된 판정** — "배선만"은 **Channel 축에만 참**이다. §29 실측 기준 **필수 10종 현행 충족 0**.
> ∴ 정확한 판정 = **`pushEvent` 배선 + 가시성 승격 + 발송결과 반환/감사 + recipient resolution 신설**.
> 🔴 **"완비 → 배선만"으로 닫으면 분모를 Channel 축으로 갈아끼우는 역산이다.**

**⑤ 보존되는 것**(재구현 금지) — `notification_channel` SSOT(:911) · 폴백 체인(:471-497 · 282차 "알림 통지 죽음" 수정분) · `min_severity` 게이트 · `Genie\Crypto` 자격 복호(`nDec` :915). ⚠️282차 트랩: 정책은 `slack.enabled`만 보고 URL은 다른 테이블 → **무발송**. **실발송 검증 필수.**
