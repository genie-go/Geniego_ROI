# DSAR — Workflow Event Definition (§20)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §20 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

원문 엔티티명: `APPROVAL_WORKFLOW_EVENT_DEFINITION`

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 이벤트 **정의 테이블**(`workflow_event_*`) | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 범용 이벤트 버스 / in-process dispatcher / 구독 기전 | **grep 0** — 내부 도메인 간 통신은 **전부 직접 static 호출** | `NOT_APPLICABLE` |
| `OpenPlatform::emit`(OpenPlatform.php:311-328) | 화이트리스트 `EVENTS`(:46) 대조 → `webhook_endpoint` 구독 조회(:316) → `insertDelivery`(:322). **구독 0이면 no-op**(:319 루프 미진입) · **예외 절대 미전파**(:324-327 삼킴) | `KEEP_SEPARATE_WITH_REASON` — **아웃바운드 웹훅 발신 전용** |
| 이벤트 카탈로그(`EVENTS` 상수 :46-) | `order.created`·`order.cancelled`·`settlement.created` … **코드 상수**(desc/sample 포함) · 외부 구독자용 | `LEGACY_ADAPTER`(발신 축만) |
| 인바운드 수신 | `Webhooks.php:22-27` **opt-in**(시크릿 미설정 벤더 수신 허용 + `verified=false`) · Paddle HMAC 서명(:1073) | `LEGACY_ADAPTER` |
| 멱등키 | `idempotency_key` **grep 0** · 인접 3패턴 = `dedup_key` 자연키 UNIQUE(Db.php:257-281·`uq_rve_dedup` :1034) · Paddle `notification_id` UNIQUE(**`processed=1`일 때만 skip**) · `claimSendOnce` 자연키 선점(JourneyBuilder.php:450) | `NOT_APPLICABLE`(결번 → 5-3-2가 채움) |
| 테넌트 검증 | `emit`은 `tenantId` 필수(:314) **REAL** ↔ `paddle_events`는 **tenant_id 컬럼 자체 없음**(:99) | 혼재 — 신설분은 fail-closed 강제 |

**★축 주의 — 이름 grep 0 ≠ 능력 부재, 그러나 능력 대조에서도 부재다.** `emit` 이라는 **이름은 존재**하나, 그 **능력은 "테넌트의 웹훅 구독자에게 HTTP 전달"** 하나뿐이다. 원문 §20이 요구하는 능력 — **내부 노드를 깨우는 correlation·재시도·인증/인가 게이트를 갖춘 이벤트 정의** — 은 어느 것도 수행하지 않는다. 특히 **구독 0이면 no-op + 예외 삼킴**(:319·:325)은 **"이벤트가 소실되어도 정상"** 이라는 정반대 계약이다. 승인 이벤트를 여기에 태우면 **소실이 무음으로 정상 처리**된다 → 커버로 계산 금지.

**★축 주의 2 — `journeys`의 `wait` event-mode는 이벤트 수신이 아니라 폴링이다.** `eventOccurred`(JourneyBuilder.php:874-885)는 `crm_activities`/이메일 오픈·클릭 컬럼을 **cron 주기마다 SELECT**(:556)한다. 발행-구독이 아니라 **상태 조회**다. 도메인도 마케팅이다 → `KEEP_SEPARATE_WITH_REASON`. 단 **재폴링 패턴(:565-570) 자체는 실행 프리미티브로 인용 가능**.

## 1. 원문 전사 + 판정 — **원문 필수 필드 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_event_definition_id | 부재 — 이벤트 정의 테이블 자체가 grep 0 | `NOT_APPLICABLE` |
| 2 | event code | 인접 = `EVENTS` 상수 키(`order.created` 등 OpenPlatform.php:46-) — **코드 상수·외부 웹훅 전용·DB 정의 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 3 | event type | 부재 — §20 Event Type 21종 축은 [DSAR_APPROVAL_WORKFLOW_EVENT_TYPE.md](DSAR_APPROVAL_WORKFLOW_EVENT_TYPE.md) 참조 | `NOT_APPLICABLE` |
| 4 | source | 부재 — 발신자 식별 개념 없음(`emit` 은 호출 도메인을 기록하지 않음 :311-328) | `NOT_APPLICABLE` |
| 5 | schema reference | 부재 — 인접 = `EVENTS['...']['sample']`(:49) **예시 JSON일 뿐 검증 스키마 아님** | `NOT_APPLICABLE` |
| 6 | correlation strategy | 부재 — `correlation_id` **grep 0**. `emit` 은 대상 인스턴스를 특정하지 않고 **구독 엔드포인트 전체에 브로드캐스트**(:319-323) | `NOT_APPLICABLE` |
| 7 | idempotency strategy | 부재(`idempotency_key` grep 0) · 인접 3패턴 존재 → **`claimSendOnce` 자연키 선점 마커**(JourneyBuilder.php:450·:679)가 승인 결정에 가장 정합 | `NOT_APPLICABLE`(신설 · 패턴은 재사용) |
| 8 | authentication requirement | 부재(이벤트 단위) · 인접 = Paddle HMAC(:1073) · `Webhooks.php:22-27` **opt-in = 미인증도 수신** | `LEGACY_ADAPTER`(인바운드만·opt-in 계약은 승인에 부적격) |
| 9 | authorization requirement | 부재 — 🔴 **`actor_type` 부재**로 `apikey:`/`user:` 가 정족수에 **동등 계수**(API 키 2개로 Maker-Checker 충족 가능) | `NOT_APPLICABLE` |
| 10 | tenant validation | 혼재 — `emit` 테넌트 필수 **REAL**(:314) ↔ `paddle_events` **tenant_id 없음**(:99) · `admin_growth_approval` **tenant_id 없음** | `NOT_APPLICABLE`(신설분 fail-closed 강제) |
| 11 | timeout | 부재(이벤트 단위) | `NOT_APPLICABLE` |
| 12 | retry policy | 인접 실자산 3공식 병존 — `AdAdapters::retryDeliveryDlq`(:1187-1228 · maxAttempts 5 · `600*2^n` **86400s 캡**) · `OpenPlatform`(:466-471 · `min(60,2^n)`분) · `Omnichannel`(:365 · attempts<3 · **백오프 없음**) | `VALIDATED_LEGACY`(확장) — 🔴 신설분은 **AdAdapters:1221 공식 채택** |
| 13 | status | 부재(이벤트 정의) — 🔴 **상태머신 자체가 없다**: `UPDATE ... SET status=` **155건/44파일** · **전이 규칙 선언 0**(전부 호출지점 인라인) · 전이 가드 4곳뿐(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `NOT_APPLICABLE` |
| 14 | evidence | 부재 — 인접 감사로그 = `journey_node_logs`(JourneyBuilder.php:50,:69) · `webhook_delivery`(OpenPlatform.php:81-105) | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재 11 · 어댑터 1 · 확장 1 · 도메인분리 1.

## 2. 규칙

- 🔴 **`OpenPlatform::emit` 을 승인 이벤트 버스로 재사용 금지.** 능력이 **아웃바운드 웹훅 발신 하나**이며, **구독 0 = no-op**(:319) + **예외 삼킴**(:325)이 **"소실되어도 정상"** 계약이다. 승인 이벤트는 소실 금지 → 계약 정면 충돌. 확장이 아니라 **별도 축 신설**이다.
- 🔴 **두 번째 웹훅 발신기 신설도 금지.** 외부 구독자에게 승인 결과를 알릴 필요가 생기면 **`emit` 의 `EVENTS` 화이트리스트(:46)에 이벤트 코드를 추가**하라(확장). 내부 깨우기와 외부 통지는 **다른 축**이다.
- **재시도는 `AdAdapters::retryDeliveryDlq`(:1187-1228) 공식으로 통일.** 4번째 백오프 공식 신설 금지.
- **멱등은 `claimSendOnce`(JourneyBuilder.php:450) 자연키 선점 마커 패턴 채택.** `dedup_key` UNIQUE(Db.php:257-281)는 **적재 중복 차단용**이라 "커밋 전 크래시 시 재실행 차단"을 못 한다. Paddle `notification_id` 패턴은 **`processed=0` 재처리 허용**이 승인 결정에는 위험(이중 결정).
- **통지는 신설 금지·배선만** — `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497·282차 수정분)은 **완비**되어 있고 **승인 이벤트↔통지 배선만 0**이다.
  ⚠️ 282차 트랩 재발 주의: 정책은 `slack.enabled` 만 보고 URL은 다른 테이블 → **무발송**.
- 🔴 **`Alerting::executeAction`(Alerting.php:601-660)을 이벤트 소비 참조 구현으로 삼지 마라**: `:612` 가 `status` 를 SELECT 하고 **어디서도 판독하지 않아** `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) 실집행한다. `INSERT INTO action_request` **grep 0 → 생산자 전무 → 현재 VACUOUS**이나 **생산자 배선 시 즉시 활성 결함**이다.
- **테넌트 검증은 fail-closed 필수.** `emit`(:314)이 REAL 선례 · `paddle_events`(:99)·`admin_growth_approval` 은 **반면교사**(tenant_id 부재 → 전역 노출).
- 🔴 14개 필드를 **"있다고 가정"하고 배선 금지.** 11종이 실제 부재다.
