# DSAR — Workflow Failure (§47)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §47 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 실패 **엔티티**(`workflow_failure` 테이블) | **grep 0** — 실패는 행이 아니라 **원 테이블의 `status='failed'` + 잘린 에러 문자열** | `NOT_APPLICABLE`(부재 → 신설) |
| 실패 표현 ① | `ad_delivery_dlq.status='failed'` + `last_error`(AdAdapters.php:1220,:1223-1224 · `mb_substr(...,0,500)`) | `LEGACY_ADAPTER` |
| 실패 표현 ② | `webhook_delivery.status='failed'` + `error`(OpenPlatform.php:465,:469-470 · `substr(...,0,250)`) + `http_code` | `LEGACY_ADAPTER` |
| 실패 표현 ③ | `omni_outbox` `mark(..., 'failed', ..., $r['error'] ?? 'failed', ...)`(Omnichannel.php:373) | `LEGACY_ADAPTER` |
| 실패 표현 ④ | `paddle_events.error`(Paddle.php:375,:463) — `processed=0` 유지 → **재처리 대상**(272차) | `VALIDATED_LEGACY` |
| **에러 코드 봉투** | ★`AdminGrowth::fail`(:181-184) = `code`+`detail`+`meta` · **승인 경로 `approvalDecide` 실배선**(:1322/:1326/:1327) | `VALIDATED_LEGACY`(공용 추출·확장) |
| 실패 **분류 체계**(failure type / error category) | **선언 0** — 분류는 문자열 리터럴로 산발(`no_customer`·`frequency_capped`·`no_channel_available` Omnichannel:348,:355,:369 / `query_failed` AdAdapters:1196) | `NOT_APPLICABLE` |
| `retryable 여부` | **컬럼 0** — 재시도 가능성은 **코드 분기로 암묵**(Omnichannel:367-369) | `NOT_APPLICABLE` |
| `attempt count` | 존재 = `attempts`(AdAdapters:1202 · OpenPlatform:464 · Omnichannel:366) | `VALIDATED_LEGACY` |
| ★**defer ≠ 실패** | Omnichannel.php:349-352(`quiet_hours_defer`)·:362-364(`sto_defer`) — **`attempts` 미증가**(283차 P1 주석 자인) | ★`VALIDATED_LEGACY`(규율 보존) |
| ★**honest pending** | ChannelSync.php:6173 · Catalog.php:1712 — 어댑터 부재 시 **재시도 미소모**(정직) | ★`VALIDATED_LEGACY`(규율 보존) |
| 🔴 **예외 삼킴** | `OpenPlatform::emit` :324-327 — 웹훅 발신 실패를 **완전 삼킴**(주문/정산 보호 의도) · AdAdapters:1196/:1210-1216/:1217/:1224 도 `catch (\Throwable $e) {}` **빈 catch** | ★§2 금지 참조 |
| 인시던트 연계 | **부재**(`incident_*` grep 0) · 인접 통지 = `Alerting::pushEvent` + `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497) | `LEGACY_ADAPTER`(배선만) |
| 🔴 **상태머신** | `UPDATE ... SET status=` **155건 / 44파일** · **전이 규칙 선언 0** · 전이 가드 **4곳뿐**(FeedTemplate::transition:248-285 · Mapping::apply:309 · Catalog::approveQueue:2341 · AdminGrowth::launch:1155) | `NOT_APPLICABLE` |

**★축 주의 — "실패 상태가 있다" ≠ "실패 엔티티가 있다".** 현행 4경로는 전부 **작업 행 자신의 status 를 `failed` 로 바꾸고 에러 문자열을 잘라 넣는다**(500자/250자). 원문이 요구하는 것은 **독립 실패 레코드**(타입·범주·영향·복구 권고·인시던트 참조)다. `status='failed'` 를 `workflow_failure` 커버로 계산하면 **역산**이다 → 엔티티 축은 `NOT_APPLICABLE`.

**★두 번째 함정 — 이 축의 최대 위험은 "실패를 과다 계수하는 것"이다.** 다른 축은 대개 "없는 걸 있다고" 세는 게 위험하지만, 여기서는 **정상 대기·정책 보류·미배선을 실패로 계수하는 것**이 위험하다. 레포는 이미 두 규율을 **의도적으로 확립**했다:
- **defer ≠ 실패**(Omnichannel:349,362 — `attempts` 미증가, 283차 P1)
- **honest pending**(ChannelSync:6173 · Catalog:1712 — 어댑터 부재는 재시도 미소모)

5-3-2가 `WORKFLOW_FAILURE` 를 도입하며 이 둘을 실패로 흡수하면 **283차·288차가 확립한 정직성 규율을 되돌리는 기능 후퇴**이며, **가짜 적색**(정상인데 실패로 보임)이 된다. 이는 288차가 잡은 **가짜 녹색의 거울상**이다.

## 1. 원문 전사 + 판정 — Failure Type **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | VALIDATION | 부재(분류) · 인접 = Paddle :337 `Missing notification_id` → 400 | `LEGACY_ADAPTER` |
| 2 | AUTHORIZATION | 부재(분류) · 인접 = `Mapping::actorId` 미확인 null → **403 fail-closed** | `LEGACY_ADAPTER` |
| 3 | ASSIGNMENT | **부재** — Task/배정/클레임 개념 전무 | `NOT_APPLICABLE` |
| 4 | TASK_EXECUTION | 부재(분류) · 인접 = 집행 실패 = `ad_delivery_dlq` 진입(AdAdapters:1219-1225) | `LEGACY_ADAPTER` |
| 5 | CONDITION_EVALUATION | **부재** — 조건 평가 실패 축 0 | `NOT_APPLICABLE` |
| 6 | EXTERNAL_SERVICE | 부재(분류) · 인접 = `webhook_delivery.http_code`+`error`(OpenPlatform:469-470) | `LEGACY_ADAPTER` |
| 7 | TIMEOUT | 부재(분류) · 인접 = `wait` event 타임아웃 분기(JourneyBuilder:562-565) — **마케팅 도메인, 실패가 아니라 정상 분기** | `KEEP_SEPARATE_WITH_REASON` |
| 8 | CONCURRENCY | **부재**(분류) · 인접 = 조건부 UPDATE+rowCount CAS 실패(JourneyBuilder:411 · Catalog:1683 · ChannelSync:6136-6153) — **선점 실패는 조용히 skip**, 실패로 기록 안 함 | `NOT_APPLICABLE` |
| 9 | IDEMPOTENCY | **부재** — `idempotency_key` grep 0 · 인접 = Paddle `processed=1` skip(:351-363) = **성공 경로**이지 실패 아님 | `NOT_APPLICABLE` |
| 10 | PERSISTENCE | 부재(분류) · 🔴 인접 = **빈 catch**(AdAdapters:1217,:1224 `catch (\Throwable $e) {}`) — DB 쓰기 실패가 **흔적 없이 사라짐** | `NOT_APPLICABLE` |
| 11 | EVENT_DELIVERY | 부재(분류) · 인접 = `webhook_delivery` 실패(OpenPlatform:465) · 🔴 `emit` 실패는 **삼킴**(:324-327) | `LEGACY_ADAPTER` |
| 12 | CALLBACK | 부재(분류) · 인접 = `paddle_events.error`(:375) | `LEGACY_ADAPTER` |
| 13 | POLICY_VERSION | **부재** — 정책 버전 개념 전무(정책이 코드 상수) | `NOT_APPLICABLE` |
| 14 | RESOURCE_VERSION | **부재** — 🔴 `optimistic lock(version)` **grep 0**(SQLite 폴백 호환 제약) | `NOT_APPLICABLE` |
| 15 | MIGRATION | **부재** — 인스턴스 마이그레이션 개념 0 | `NOT_APPLICABLE` |
| 16 | COMPENSATION | **부재** · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) — 승인 도메인 아님 | `NOT_APPLICABLE` |
| 17 | UNKNOWN | 부재(분류) · 인접 = `$r['error'] ?? 'failed'`(Omnichannel:373) 폴백 문자열 | `LEGACY_ADAPTER` |

**실측 개수: 17 / 17 전사.** 커버리지 = 부재 9 · 어댑터 7 · 도메인 상이 1. **선언된 분류 체계 = 0**(전부 호출 지점 문자열 리터럴).

## 1-2. 원문 전사 + 판정 — 필수 필드 **원문 20개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_failure_id | 부재 — 실패가 독립 행이 아님 | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재 · 인접 = 각 작업 테이블의 `id`(AdAdapters:1223 `WHERE id=?`) | `NOT_APPLICABLE` |
| 3 | workflow_execution_id | **부재** — 실행 회차 개념 0 | `NOT_APPLICABLE` |
| 4 | workflow_task_id | **부재** | `NOT_APPLICABLE` |
| 5 | workflow_node_id | 부재(승인) · 인접 = `journey_enrollments.current_node`(JourneyBuilder:568) | `NOT_APPLICABLE` |
| 6 | failure type | **부재**(선언) — 위 17종 대조 참조 | `NOT_APPLICABLE` |
| 7 | error code | 부재(실패 축) · ★인접 = `AdminGrowth::fail` `code`(:181-184) **승인 경로 실배선**(:1322/:1326/:1327) | `VALIDATED_LEGACY` |
| 8 | error category | **부재** — 범주 축 0 | `NOT_APPLICABLE` |
| 9 | retryable 여부 | **부재**(컬럼) — 코드 분기 암묵(Omnichannel:367-369) | `NOT_APPLICABLE` |
| 10 | attempt count | 존재 = `attempts`(AdAdapters:1202 `(int)$row['attempts'] + 1` · OpenPlatform:464 · Omnichannel:366) · ★**defer 시 미증가**(:351,:364) | `VALIDATED_LEGACY` |
| 11 | source system | 부재(실패 축) · 인접 = `ad_delivery_dlq.channel`(AdAdapters:1200) | `LEGACY_ADAPTER` |
| 12 | occurred_at | 부재(전용) · 인접 = `updated_at`(AdAdapters:1223-1224) — **갱신 시각**이지 발생 시각 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 13 | detected_at | **부재** — 발생/탐지 시각 **미분화** | `NOT_APPLICABLE` |
| 14 | impact | **부재** — 영향도 축 0 | `NOT_APPLICABLE` |
| 15 | affected approval case | **부재** | `NOT_APPLICABLE` |
| 16 | affected resource | 부재(실패 축) · 인접 = `campaign_id`/`camp_ext_id`(AdAdapters:1200,:1207) | `LEGACY_ADAPTER` |
| 17 | recovery recommendation | **부재** — 복구 권고 축 0 | `NOT_APPLICABLE` |
| 18 | incident reference | **부재** — `incident_*` grep 0 | `NOT_APPLICABLE` |
| 19 | status | 부재(실패 전용) · 인접 = 작업 행의 `status`(`pending`/`failed`/`done` AdAdapters:1217,:1220) — **실패 레코드의 status 아님** · 전이 규칙 선언 0 | `KEEP_SEPARATE_WITH_REASON` |
| 20 | evidence | **부재** · 인접 = `last_error` 500자 절단(AdAdapters:1223-1224) · `error` 250자 절단(OpenPlatform:469) — **잘린 문자열은 증거가 아니다** | `LEGACY_ADAPTER` |

**실측 개수: 20 / 20 전사**(목록 끝 `evidence` 포함 — 누락 없음). 커버리지 = 부재 13 · 어댑터 4 · 검증된 선례 2 · 도메인 상이 3(#12·#19 및 Failure Type 축의 TIMEOUT).

## 2. 규칙

- 🔴 **★`defer ≠ 실패` 규율 보존 강제.** Omnichannel.php:349-352 · :362-364 는 **`attempts` 를 증가시키지 않는다**(283차 P1). 승인 워크플로의 **정상 대기·정책 보류·방해금지 시간**을 `WORKFLOW_FAILURE` 로 계수하지 마라. `attempt count`(#10) 증가는 **진짜 실패에만**.
- 🔴 **★`honest pending` 규율 보존 강제.** ChannelSync.php:6173 · Catalog.php:1712 — **어댑터/자격증명 부재 = pending(정직)**, failed 아님·재시도 미소모. 승인 집행 어댑터 미배선을 실패로 기록하면 **가짜 적색**이다.
- ✅ **`error code` = 신설 금지·공용 추출.** `AdminGrowth::fail`(:181-184)의 `code`+`detail`+`meta` 봉투가 **승인 경로에 이미 실배선**(:1322/:1326/:1327)이다 → 확장. 🔴 **"에러 코드 체계 부재"는 오탐(재플래그 금지)** — 믿었다면 두 번째 봉투를 신설할 뻔했다.
- ✅ **`attempt count` 는 기존 `attempts` 회수** — 신설 카운터 금지(3경로 공통 컬럼명).
- 🔴 **예외 삼킴을 실패 기록의 대체물로 삼지 마라.** `OpenPlatform::emit`(:324-327)은 발신 실패를 **완전 삼키고**, AdAdapters 는 **빈 catch**(:1217,:1224)로 DB 쓰기 실패를 흔적 없이 버린다. **삼킴 = 실패가 없는 게 아니라 실패가 보이지 않는 것**이다. 승인 실패 기록은 **삼킴 금지**(fail-loud). 단 **기존 삼킴 경로를 이 세션에서 고치지 마라**(주문/정산 보호 의도 · 별도 세션).
- 🔴 **`RESOURCE_VERSION` 실패 타입을 위해 optimistic lock(`version`)을 도입하지 마라.** `version`·분산락·`GET_LOCK` **전부 grep 0**이며 **SQLite 폴백 호환이 명시적 설계 제약**이다. 다른 동시성 모델 도입 = **제약 위반**. `CONCURRENCY`/`RESOURCE_VERSION` 은 **조건부 UPDATE + rowCount CAS**(JourneyBuilder:411 · Catalog:1683 · ChannelSync:6136-6153) 위에서 표현하라.
- 🔴 **`CONCURRENCY` 실패를 현행 CAS 선점 실패에 매핑 금지.** 현행은 선점 실패를 **조용히 skip**(정상 경합)하지 실패로 기록하지 않는다. 이를 실패로 바꾸면 **정상 경합이 전부 실패로 기록**된다.
- 🔴 **`occurred_at`/`detected_at` 을 하나로 합치지 마라.** 현행은 `updated_at` 하나로 미분화지만, 원문은 **2필드 분리**를 요구한다(cron 폴링 주기 */5 때문에 **발생-탐지 지연이 구조적으로 최대 5분**이다 — 합치면 이 지연이 은폐된다).
- ✅ **`incident reference`·알림 = 통지 인프라 신설 금지·배선만** — `Alerting::pushEvent` + `notification_channel` SSOT(:911 `min_severity`) + 폴백 체인(:471-497) 재사용. ⚠️282차 트랩: 정책은 `slack.enabled`만 보고 URL은 다른 테이블 → **무발송**. 실발송 검증 필수.
- 🔴 **`Alerting::executeAction`(Alerting.php:601-660)을 참조 구현으로 삼지 마라** — `:612`가 `status`를 SELECT 하고 **어디서도 판독하지 않아** `pending`·`rejected`도 실집행된다(승인 우회). 현재 **VACUOUS**(`INSERT INTO action_request` grep 0 = 생산자 전무)이나 **생산자 배선 시 즉시 활성**. 미수정·별도 세션.
- 🔴 **17 Failure Type 중 9종, 20필드 중 13종을 "있다고 가정"하고 배선 금지.**

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
