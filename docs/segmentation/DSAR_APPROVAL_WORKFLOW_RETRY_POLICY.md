# DSAR — Workflow Retry Policy (§46)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §46 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 재시도 **정책 엔티티**(`retry_policy` 테이블·정책명·적용 대상) | **grep 0** — 정책은 **전부 호출 지점 하드코딩 상수** | `NOT_APPLICABLE`(부재 → 신설) |
| 🔴 **백오프 3공식 병존** | 아래 3행 — **단일 규율 없음** | ★§2 통일 대상 |
| ① `AdAdapters::retryDeliveryDlq` | AdAdapters.php:1187 `maxAttempts = 5` · **:1221 `(int)min(86400, 600 * (2 ** $attempts))`** = 지수 백오프 **24h 캡** · :1220 `$attempts >= $maxAttempts ? 'failed' : 'pending'` · :1193 `next_retry_at <= ?` 게이트 | ★**신설분 채택 권고 공식** |
| ② `OpenPlatform` 웹훅 배달 | OpenPlatform.php:466-471 — **`min(60, (int)pow(2, $attempts))` 분**(최대 ~60분) · :464 `$attempts >= self::MAX_ATTEMPTS` → `failed`, 아니면 `retry` | `KEEP_SEPARATE_WITH_REASON`(존치·신규 미채택) |
| ③ `Omnichannel` outbox | Omnichannel.php:370 `$att < 3` → `queued` 재시도 · 🔴 **백오프 없음**(즉시 다음 cron) · :373 소진 시 `failed` | `KEEP_SEPARATE_WITH_REASON` |
| **jitter** | **grep 0** — 3공식 전부 지터 없음(동시 실패 시 **thundering herd** 노출) | `NOT_APPLICABLE` |
| retryable / non-retryable **에러 코드 분류** | **선언 0** — 재시도 여부는 코드 분기로 암묵 결정(예: Omnichannel:367-369 `unavailable` → 재시도 무의미 판정) | `NOT_APPLICABLE` |
| ★**defer ≠ 실패** | Omnichannel.php:349-352 `quiet_hours_defer` · :362-364 `sto_defer` — **`attempts` 미증가**로 재큐(283차 P1 · "3회 재시도 소진 방지" 자인) | ★`VALIDATED_LEGACY`(규율 보존) |
| ★**honest pending** | ChannelSync.php:6173 · Catalog.php:1712 — 어댑터 부재 시 **재시도 미소모** | ★`VALIDATED_LEGACY`(규율 보존) |
| 에러 봉투(code+detail+meta) | `AdminGrowth::fail`(:181-184) — 승인 경로 `approvalDecide` **실배선**(:1322/:1326/:1327) | `VALIDATED_LEGACY`(공용 추출·확장) |
| timeout | 정책 축 부재 · 인접 = HTTP 클라이언트 개별 설정 | `NOT_APPLICABLE` |
| alert threshold | **부재**(재시도 임계 통지 0) · 인접 통지 인프라 = `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497) | `LEGACY_ADAPTER`(배선만) |
| dead letter behavior | **DLQ 테이블 = `ad_delivery_dlq` 1개뿐**(AdAdapters.php:1127) · 나머지는 원 테이블 `status='failed'` 잔류(§48) | `NOT_APPLICABLE` |
| 외부 Idempotency 확인 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 — "재시도 코드가 있다" ≠ "재시도 정책이 있다".** 현행 3경로는 **재시도를 수행하는 능력**은 REAL이지만, 원문이 요구하는 것은 **선언된 정책 엔티티**(이름·적용 대상·에러 코드 분류·DLQ 행동·임계)다. 정책은 **어디에도 선언되어 있지 않고 전부 호출 지점 리터럴**(:1187 `5` · :1221 `600`/`86400` · :467 `60` · :370 `3`)이다. "3공식이 존재하니 정책 있음"으로 계산하면 **역산**이다 → 정책 축은 `NOT_APPLICABLE`, **공식은 재사용 자산으로만 인용**한다.

**★두 번째 함정 — 3공식은 "다양성"이 아니라 결함이다.** 같은 리포 안에서 동일한 실패가 채널에 따라 **24시간 뒤 / 60분 뒤 / 즉시** 재시도된다. 5-3-2가 **4번째 공식**을 만들면 결함을 확대하는 것이다. → **`AdAdapters.php:1221` 공식(`min(86400, 600 * 2^n)`, maxAttempts 5) 채택 강제.**

## 1. 원문 전사 + 판정 — Backoff Strategy **원문 5종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | FIXED | **부재** — 고정 지연 경로 0 | `NOT_APPLICABLE` |
| 2 | LINEAR | **부재** | `NOT_APPLICABLE` |
| 3 | EXPONENTIAL | 존재(3경로 전부 지수 계열) — ① AdAdapters:1221 `600*2^n` 캡 86400 · ② OpenPlatform:467 `2^n`분 캡 60 · 🔴 ③ Omnichannel:370 은 **백오프 없음**(지수 아님) | `VALIDATED_LEGACY`(①만 채택) |
| 4 | EXPONENTIAL_WITH_JITTER | **부재** — `jitter` grep 0 | `NOT_APPLICABLE` |
| 5 | CUSTOM | **부재**(정책 축 자체가 없으므로 커스텀도 없음) | `NOT_APPLICABLE` |

**실측 개수: 5 / 5 전사.** 커버리지 = 부재 4 · 검증된 선례 1(EXPONENTIAL, 단 3공식 중 1개만).

## 1-2. 원문 전사 + 판정 — 필수 필드 **원문 16개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | retry_policy_id | 부재 — 정책이 행이 아님 | `NOT_APPLICABLE` |
| 2 | policy name | 부재 | `NOT_APPLICABLE` |
| 3 | applicable task types | **부재** — 적용 대상은 **어느 파일에 코드가 있느냐**로 암묵 결정(3공식 병존의 근본 원인) | `NOT_APPLICABLE` |
| 4 | maximum attempts | 부재(선언) · 인접 = 리터럴 3종 — AdAdapters:1187 `5` · OpenPlatform:464 `self::MAX_ATTEMPTS` · Omnichannel:370 `3` | `LEGACY_ADAPTER`(값 회수) |
| 5 | initial delay | **부재**(선언) · 인접 = AdAdapters:1221 `600` 이 `n=0`에서 초기 지연으로 **암묵 기능** | `NOT_APPLICABLE` |
| 6 | backoff strategy | **부재**(선언) · 실제는 3공식 병존 | `NOT_APPLICABLE` |
| 7 | backoff multiplier | **부재**(선언) · 인접 = `2` 리터럴(AdAdapters:1221 `2 ** $attempts` · OpenPlatform:467 `pow(2,$attempts)`) | `NOT_APPLICABLE` |
| 8 | maximum delay | **부재**(선언) · 인접 = 캡 리터럴 — AdAdapters:1221 `86400` · OpenPlatform:467 `60`(분) · Omnichannel **캡 없음** | `LEGACY_ADAPTER`(값 회수) |
| 9 | jitter 여부 | **부재** — grep 0 | `NOT_APPLICABLE` |
| 10 | retryable error codes | **부재** — 선언 0 | `NOT_APPLICABLE` |
| 11 | non-retryable error codes | **부재**(선언) · 인접 원리 = Omnichannel:367-369 `unavailable` → `skipped`(재시도 무의미 판정, **정직**) | `LEGACY_ADAPTER`(원리만) |
| 12 | timeout | **부재**(정책 축) | `NOT_APPLICABLE` |
| 13 | dead letter behavior | **부재**(선언) · 인접 = `ad_delivery_dlq` 단일 DLQ(AdAdapters.php:1127) · 나머지 경로는 `status='failed'` 잔류(§48) | `NOT_APPLICABLE` |
| 14 | alert threshold | **부재** · 인접 통지 = `Alerting::pushEvent` + `notification_channel` SSOT(Alerting.php:911 `min_severity`) | `LEGACY_ADAPTER`(배선만) |
| 15 | status | 부재(정책) · 인접 = 대상 행의 status(`pending`/`failed`/`done` AdAdapters:1217,:1220 · `retry`/`failed` OpenPlatform:465) — **정책의 status 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 16 | evidence | **부재** · 인접 = `last_error`(AdAdapters:1223-1224 `mb_substr(...,0,500)`) · `error`(OpenPlatform:469 `substr(...,0,250)`) — **잘린 문자열**, 증거 봉투 아님 | `LEGACY_ADAPTER` |

**실측 개수: 16 / 16 전사**(목록 끝 `evidence` 포함 — 누락 없음). 커버리지 = 부재 10 · 어댑터 5 · 도메인 상이 1.

## 2. 규칙

- ✅ **백오프 공식 = `AdAdapters.php:1221` 채택 강제** — `min(86400, 600 * 2^attempts)` · `maxAttempts=5`(:1187) · `next_retry_at` 게이트(:1193). 🔴 **4번째 공식 신설 금지.** 3공식 병존은 이미 결함이다.
- ✅ **jitter 는 결번 신설** — 원문 `EXPONENTIAL_WITH_JITTER`·`jitter 여부`는 현행 grep 0이다. 승인 알림/집행이 동시 실패하면 지터 없이 **동일 시각 재시도(thundering herd)** 가 된다. 단 **기존 3경로에 지터를 소급 주입하지 마라**(별도 세션·회귀 위험).
- 🔴 **★`defer ≠ 실패` 규율 보존 강제.** Omnichannel.php:349-352(`quiet_hours_defer`)·:362-364(`sto_defer`)는 **`attempts` 를 증가시키지 않는다**(283차 P1 주석 자인: "실패가 아니므로 attempts 미증가·재큐(3회 재시도 소진 방지)"). 승인 워크플로의 **대기·보류·정책 미충족**을 실패로 계수하면 **정상 대기가 재시도 소진으로 죽는다**. `attempt count`(§47) 증가는 **진짜 실패에만**.
- 🔴 **★`honest pending` 규율 보존 강제.** ChannelSync.php:6173 · Catalog.php:1712 — **어댑터/자격증명 부재는 재시도를 소모하지 않는다**. 승인도 **집행 어댑터 미배선 = pending(정직)** 이지 failed가 아니다. 이를 실패로 계수하면 **288차가 잡은 "가짜 녹색"의 거울상(가짜 적색)** 이다.
- 🔴 **`non-retryable`을 코드 분기로 암묵 처리하지 마라** — 원문은 **에러 코드 목록의 선언**을 요구한다. Omnichannel:367-369 의 `unavailable` 판정은 **원리로는 옳으나 선언이 아니다**(호출 지점 인라인). 5-3-2는 **선언 축을 신설**하되, 이 원리를 계승하라.
- ✅ **에러 코드 체계 = 신설 금지·공용 추출.** `AdminGrowth::fail`(:181-184)이 `code`+`detail`+`meta` 봉투를 구현하고 **승인 경로 `approvalDecide`(:1322/:1326/:1327)에 실배선**되어 있다 → `VALIDATED_LEGACY`. 🔴 **"에러 코드 체계 부재"는 오탐이다(재플래그 금지)** — 믿었다면 두 번째 에러 봉투를 신설할 뻔했다.
- 🔴 **★Financial Execution Task 무조건 Retry 금지**(원문 §46 명시). 현행에 **외부 Idempotency 확인 수단이 없다**(`idempotency_key` grep 0). 리베이트/예산 집행 재시도는 **외부 멱등 확인이 선결**이며, 없으면 **중복 집행**이다. 확인 수단 부재 상태에서 재시도를 켜지 마라 — **fail-closed**.
- ✅ **집행 재시도는 킬스위치·결제수단 게이트 재확인 필수** — AdAdapters:1213 이 `executionEnabled()` + `BillingMethod::hasActiveMethod()` 를 **재시도 성공 경로에서 다시 확인**하는 것이 정본이다(실광고비 안전). 승인 집행 재시도도 동일하게 게이트를 **재확인**하라(최초 승인 시점의 게이트 통과를 재사용 금지).
- 🔴 **`alert threshold` 는 통지 인프라 신설 금지·배선만** — `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497)은 **완비**다. ⚠️282차 트랩 주의: 정책은 `slack.enabled`만 보고 URL은 다른 테이블에서 읽어 **무발송**이 됐다 — 임계 통지 배선 시 **실발송 검증** 필수.

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
