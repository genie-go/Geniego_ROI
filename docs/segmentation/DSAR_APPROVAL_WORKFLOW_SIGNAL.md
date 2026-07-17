# DSAR — Workflow Signal (§44)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §44 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 시그널 **엔티티**(`workflow_signal`·`signal_name`) | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| **범용 이벤트 버스 / in-process dispatcher / 구독 기전** | 🔴 **grep 0** — 내부 도메인 간 통신은 **전부 직접 static 호출** | `NOT_APPLICABLE` |
| 유일한 "emit" | `OpenPlatform::emit(tenantId, eventType, payload)` (OpenPlatform.php:311-328) | `KEEP_SEPARATE_WITH_REASON` |
| ↳ emit 의 실체 | :316 `SELECT ... FROM webhook_endpoint WHERE tenant_id=? AND is_active=1` → :322 `insertDelivery` = **외부 HTTP 웹훅 발신 전용**. 내부 수신자 개념 없음 | — |
| ↳ 화이트리스트 | :314 `!isset(self::EVENTS[$eventType])` → 미등록 타입 **조용히 return**(에러 아님) | `VALIDATED_LEGACY`(발신 한정) |
| ↳ 구독 0 | :319-321 매칭 endpoint 없으면 **no-op** | — |
| ↳ 🔴**예외 절대 미전파** | :324-327 `catch (\Throwable) { error_log }` — **삼킴**. 주석 자인: "웹훅 발신 실패가 주문/정산 흐름을 깨면 안 됨" | ★§2 규칙 참조 |
| 시그널 **수신/소비**(`consumed_at`) | **grep 0** — 소비 마커 개념 전무 | `NOT_APPLICABLE` |
| 인바운드 수신(범용) | `Webhooks.php:22-27` — **opt-in 서명검증**: 시크릿 미설정 벤더는 **수신 허용 + `verified=false`** | `LEGACY_ADAPTER`(§45 상술) |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 — 이름 grep 0 ≠ 능력 부재. 그러나 여기서는 능력도 부재다.** 8회차에 `BPMN`/`Temporal` grep 0을 "워크플로 엔진 부재"로 확대 해석했다가 **JourneyBuilder라는 실 엔진의 존재로 뒤집혔다**. 그래서 이 축은 **이름이 아니라 능력("무엇을 하는가")** 으로 대조했다:
- **능력 질문**: "어떤 컴포넌트가 낸 사건을, 다른 컴포넌트가 *구독하여* 받아, 대기 중인 인스턴스를 깨울 수 있는가?"
- **실측 답**: `OpenPlatform::emit`은 **밖으로 HTTP를 쏘는 것**(:316,:322)이지 안에서 받는 것이 아니다. `webhook_endpoint`의 구독자는 **외부 URL**이지 워크플로 인스턴스가 아니다. **내부 수신·재개 능력 = 0.**
- ⚠️ 따라서 `emit`은 **형태(이름)가 Signal과 가장 닮았으나 능력이 반대 방향(outbound)** 이다. 이를 Signal 커버로 계산하면 역산이다 → `KEEP_SEPARATE_WITH_REASON`.

**★두 번째 함정 — 예외 미전파(:325)는 Signal 의미론과 정면 충돌한다.** `emit`은 실패해도 호출자에게 알리지 않는다(설계 의도: 주문/정산 보호). 승인 도메인의 `CANCEL`/`EXTERNAL_REJECTED` 시그널이 이 경로를 타면 **"보냈는데 아무 일도 안 일어났고 아무도 모른다"** 가 된다 — 282차 "알림 통지 죽음"과 동형이다. **재사용 시 이 삼킴을 반드시 되돌려야 하므로, `emit` 재사용은 권고하지 않는다.**

## 1. 원문 전사 + 판정 — Signal Type **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | RESUME | 부재 — 재개는 시그널이 아니라 **cron 폴링**(§43 · JourneyBuilder.php:565-570) | `NOT_APPLICABLE` |
| 2 | CANCEL | 부재 — 인스턴스 취소 시그널 grep 0 | `NOT_APPLICABLE` |
| 3 | RESOURCE_UPDATED | 부재 · 인접 = `OpenPlatform::emit` 화이트리스트 이벤트(:314 `self::EVENTS`)는 **외부 발신용 도메인 이벤트**(주문/정산) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | POLICY_UPDATED | 부재 — 정책이 코드 상수라 갱신 사건 자체가 없음 | `NOT_APPLICABLE` |
| 5 | ROLE_UPDATED | 부재 — 역할 변경 사건 발신 grep 0 | `NOT_APPLICABLE` |
| 6 | EXTERNAL_APPROVED | 부재 — 외부 승인 수신 경로 0 | `NOT_APPLICABLE` |
| 7 | EXTERNAL_REJECTED | 부재 | `NOT_APPLICABLE` |
| 8 | INCIDENT_OPENED | 부재(시그널) · 인접 = `Alerting::pushEvent` 통지(Alerting.php:471-497 폴백 체인) — **사람에게 알리는 것**이지 워크플로를 깨우는 것이 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | INCIDENT_RESOLVED | 부재 | `NOT_APPLICABLE` |
| 10 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 부재 7 · 형태유사·방향/도메인 상이(매핑 금지) 3. **원문 Signal Type을 충족하는 현행 = 0.**

## 1-2. 원문 전사 + 판정 — 필수 필드 **원문 17개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_signal_id | 부재 | `NOT_APPLICABLE` |
| 2 | signal type | 부재 · 인접 = `webhook_delivery.event_type`(OpenPlatform.php:332) — **아웃바운드 이벤트 타입** | `KEEP_SEPARATE_WITH_REASON` |
| 3 | signal name | 부재 | `NOT_APPLICABLE` |
| 4 | source system | **부재** — 발신 주체 기록 없음(`emit`은 호출자를 남기지 않음 :311-328) | `NOT_APPLICABLE` |
| 5 | source subject | **부재** — 위조불가 신원은 승인 경로에만 존재(`Mapping::actorId` — `apikey:{id}`/`user:{email}`) · 시그널 경로 0 | `NOT_APPLICABLE` |
| 6 | tenant_id | 부재(시그널) · 인접 = `emit` 첫 인자 + `webhook_endpoint.tenant_id`(:316) = **테넌트 스코프 REAL** | `LEGACY_ADAPTER` |
| 7 | workflow instance reference | 부재 — 인스턴스 개념 자체가 승인 도메인에 없음 | `NOT_APPLICABLE` |
| 8 | correlation key | **부재**(grep 0) | `NOT_APPLICABLE` |
| 9 | payload reference | 부재 · 인접 = `webhook_delivery.payload_json`(:332) — **참조가 아니라 인라인 본문** | `LEGACY_ADAPTER` |
| 10 | payload hash | **부재** — 해시 기록 0 | `NOT_APPLICABLE` |
| 11 | received_at | 부재(수신 개념 없음) · 인접 = `webhook_delivery.created_at`(:332) = **발신 시각** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | authenticated 여부 | 부재(시그널) · 🔴**인접 선례가 opt-in**: `Webhooks.php:22-27` — 시크릿 미설정 벤더는 **수신 허용 + `verified=false`** | `LEGACY_ADAPTER`(§2 금지 참조) |
| 13 | authorized 여부 | **부재** — 인증(authn)과 인가(authz) **미분화**. `verified` 플래그 1개뿐 | `NOT_APPLICABLE` |
| 14 | consumed_at | **부재** — 소비 마커 grep 0 · 인접 원리 = `claimSendOnce(enrollment_id,node_id)`(JourneyBuilder.php:672) 자연키 선점 | `LEGACY_ADAPTER`(패턴만) |
| 15 | duplicate 여부 | 부재(시그널) · 인접 = Paddle `notification_id` UNIQUE(Paddle.php:101,:108,:346) | `LEGACY_ADAPTER`(§45 상술) |
| 16 | status | 부재(시그널) · 인접 = `webhook_delivery.status`(:333 `pending`) — 전이 규칙 선언 0 | `NOT_APPLICABLE` |
| 17 | evidence | **부재** | `NOT_APPLICABLE` |

**실측 개수: 17 / 17 전사**(목록 끝 `evidence` 포함 — 누락 없음). 커버리지 = 부재 10 · 어댑터 4 · 도메인/방향 상이 3.

## 2. 규칙

- 🔴 **`OpenPlatform::emit`(:311-328)을 Signal 수신 기전으로 재사용 금지.** 방향이 **반대**다(outbound HTTP 발신 · 구독자 = 외부 URL). 승인 인스턴스를 깨우는 능력이 **없다**.
- 🔴 **`emit`의 예외 삼킴(:324-327)을 승인 시그널에 상속시키지 마라.** 승인 도메인의 `CANCEL`/`EXTERNAL_REJECTED`가 조용히 사라지면 **282차 "알림 통지 죽음"의 재현**이다. 삼킴은 주문/정산 보호를 위한 **의도된 설계**이므로 그 경로를 건드리지도 말고, **승인 시그널을 그 경로에 태우지도 마라**(=신설 필요의 근거).
- 🔴 **화이트리스트 조용한 return(:314) 상속 금지.** 미등록 시그널 타입이 no-op으로 사라지면 **가짜 녹색**이다. 승인 시그널은 **미등록 = 명시적 오류**여야 한다(fail-closed).
- 🔴 **opt-in 인증 상속 절대 금지.** `Webhooks.php:22-27`은 하위호환을 위해 **시크릿 미설정 벤더의 수신을 허용**한다(`verified=false`). 승인 시그널(`EXTERNAL_APPROVED`/`EXTERNAL_REJECTED`)이 이 규율을 물려받으면 **미인증 외부 요청으로 승인이 성립**한다. 승인 경로는 **`Mapping::actorId`의 fail-closed 규율**(위조불가 신원만 인정 · 미확인 null → 403)과 정합해야 한다.
- 🔴 **`authenticated`와 `authorized`를 한 플래그로 합치지 마라.** 현행은 `verified` 1개로 미분화되어 있고, 원문은 **2필드로 분리**를 요구한다. 합치면 **"인증됐으니 인가됐다"** 가 되어 §20 Maker-Checker가 무너진다(🟠 `actor_type` 부재로 **API 키 2개가 정족수를 채우는 기존 결함**과 동형 확대).
- ✅ **`consumed_at` 는 `claimSendOnce`(JourneyBuilder.php:672) 자연키 선점 마커 패턴 채택 권고** — 커밋 전 크래시 시 재소비 차단(277차 확립). 멱등은 5-3-2가 채울 결번(`idempotency_key` grep 0)이다.
- ✅ **테넌트 스코프는 처음부터 필수 컬럼.** `paddle_events`가 **tenant_id 없이**(Paddle.php:99-108) 만들어진 전례를 반복하지 마라 — 시그널은 tenant 검증 없이 인스턴스를 깨울 수 있어선 안 된다.
- 🔴 **10종 Signal Type을 "있다고 가정"하고 배선 금지.** 전부 부재다.

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
