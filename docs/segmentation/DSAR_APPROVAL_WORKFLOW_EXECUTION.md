# DSAR — Workflow Execution (§32)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §32 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

원문 정의: **"Instance 내 Worker 또는 Engine 실행 시도를 기록한다."**

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 실행 **시도** 기록 테이블 | `execution_id`·`worker_identity`·`engine_version` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 최근접 = `journey_node_logs` | `JourneyBuilder.php:48-52` — `enrollment_id`·`journey_id`·`node_id`·`node_type`·`action`·`result`·`executed_at` | `LEGACY_ADAPTER`(**결과 로그**이지 시도 기록 아님) |
| 🔴 **시도(attempt) 축** | `journey_node_logs` 에 `attempt`/`started_at`/`completed_at` **컬럼 없음** — `executed_at` **단일 시각**만 기록 | `NOT_APPLICABLE` |
| Worker 신원 | **grep 0** · 인접 = `omni_outbox.claim_id`(Omnichannel.php:97,:392 `bin2hex(random_bytes(8))`) — **익명 1회용 클레임 ID**(워커 신원 아님) | `LEGACY_ADAPTER` |
| Engine 참조/버전 | **grep 0** — 실행 엔진이 `JourneyBuilder` 정적 메서드라 참조 대상 자체가 없음 | `NOT_APPLICABLE` |
| Heartbeat | 승인/잡 도메인 **부재** · 인접 = **리스 만료 회수**(Omnichannel.php:394-399 `claimed_at < now-900s → status='queued'` 복귀) · `WmsCctv::heartbeatBridge`(:1107-1109)·`LiveCommerce::heartbeat`(:901-902)는 **타 도메인**(브리지 생존·시청자 presence) | `KEEP_SEPARATE_WITH_REASON` |
| 재시도 스케줄 | `webhook_delivery.next_retry_at`(OpenPlatform.php:104,:332) + `attempts`(:102) — **레포에서 유일하게 §32에 근접한 실 구현** | `VALIDATED_LEGACY` |
| trace id | 내부 `trace_id`/`correlation_id` **grep 0** · `WM_QOS.CORRELATION_ID`(ChannelSync.php:1705 등)는 **Walmart 외부 API 헤더** | `NOT_APPLICABLE` |
| input/output hash | **grep 0** | `NOT_APPLICABLE` |
| 에러 참조 | `AdminGrowth::fail`(:181-184) `code`+`detail`+`meta` 봉투 — **승인 경로 실배선**(:1322/:1326/:1327) | `VALIDATED_LEGACY`(공용 추출) |

**★축 주의 — `journey_node_logs` 는 Execution 이 아니다.** `logNode(...)`(:541,:556,:562,:617)는 **일어난 일의 결과**를 한 행 남긴다. §32 가 요구하는 것은 **시도**(attempt number · started_at → heartbeat_at → completed_at 수명 · retry scheduled at)다. 결과 로그를 시도 기록으로 계산하면 **실패한 시도·진행 중인 시도·좀비 워커가 전부 관측 불가능**한 채 커버리지만 오른다 = 역산.

### ★재사용 강제 — 오탐 주의

- 🔴 **"에러 코드 체계 부재"는 과장이다.** `AdminGrowth::fail`(:181-184)이 `code`+`detail`+`meta` 봉투를 구현하고 **승인 경로 `approvalDecide` 에 실배선**(:1322/:1326/:1327)돼 있다 → `error reference` 는 `VALIDATED_LEGACY`(공용 추출·확장)다. **믿었다면 두 번째 에러 봉투를 신설할 뻔했다.**
- 🔴 **`Alerting::executeAction`(Alerting.php:601-660)을 Execution 참조 구현으로 삼지 마라** — `:612` 가 `status` 를 SELECT 하고 **어디서도 판독하지 않아**(죽은 읽기) `pending`·`rejected` 도 `AdAdapters::pause`(:631)/`updateBudget`(:634) 를 **실집행**한다. `INSERT INTO action_request` **grep 0 → 생산자 전무 → 현재 `VACUOUS`** 이나 **생산자 배선 시 즉시 활성 결함**이다. (미수정·별도 세션.)

## 1. 원문 전사 + 판정 — **원문 21종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_execution_id | **grep 0** | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재 · 인접 = `journey_node_logs.enrollment_id`(:50) | `LEGACY_ADAPTER` |
| 3 | execution type | 부재 · 인접 = `journey_node_logs.node_type`(:50) — **노드 종류**이지 실행 종류 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 4 | worker identity | 부재 · 인접 = `omni_outbox.claim_id`(Omnichannel.php:392) **익명 1회용** | `LEGACY_ADAPTER` |
| 5 | engine reference | **grep 0**(정적 메서드 = 참조 대상 없음) | `NOT_APPLICABLE` |
| 6 | engine version | **grep 0** | `NOT_APPLICABLE` |
| 7 | node reference | `journey_node_logs.node_id`(:50) | `LEGACY_ADAPTER` |
| 8 | task reference | Task 개념 grep 0(§36) | `NOT_APPLICABLE` |
| 9 | token reference | **Token 개념 grep 0**(§33) | `NOT_APPLICABLE` |
| 10 | attempt number | 부재(여정) · 인접 = `webhook_delivery.attempts`(OpenPlatform.php:102,:416) · `omni_outbox.attempts`(Omnichannel.php:563) | `LEGACY_ADAPTER` |
| 11 | input hash | **grep 0** | `NOT_APPLICABLE` |
| 12 | output hash | **grep 0** | `NOT_APPLICABLE` |
| 13 | started_at | 부재 — `journey_node_logs.executed_at`(:51)은 **완료 시각 단일점** | `NOT_APPLICABLE` |
| 14 | heartbeat_at | 부재 · 인접 = `omni_outbox.claimed_at` + **stale lease 900s 회수**(Omnichannel.php:394-399) — **갱신 없는 리스**(heartbeat 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 15 | completed_at | 인접 = `executed_at`(:51) · `webhook_delivery.delivered_at`(OpenPlatform.php:269) | `LEGACY_ADAPTER` |
| 16 | execution result | `journey_node_logs.action`+`result`(:50-51) | `LEGACY_ADAPTER` |
| 17 | error reference | `AdminGrowth::fail`(:181-184) `code`/`detail`/`meta` **승인 경로 실배선**(:1322) | `VALIDATED_LEGACY` |
| 18 | retry scheduled at | `webhook_delivery.next_retry_at`(OpenPlatform.php:104,:332,:349) **실배선** | `VALIDATED_LEGACY` |
| 19 | trace id | 내부 **grep 0**(Walmart 헤더는 외부) | `NOT_APPLICABLE` |
| 20 | status | 인접 = `webhook_delivery.status`(`pending`/`retry`/`delivered`) OpenPlatform.php:349,:459 | `LEGACY_ADAPTER` |
| 21 | evidence | 부재 · `journey_node_logs` 전체가 유사 역할 | `LEGACY_ADAPTER` |

**실측 개수: 21 / 21 전사.** 커버리지 = 부재 9 · `LEGACY_ADAPTER` 8 · `VALIDATED_LEGACY` 2 · `KEEP_SEPARATE_WITH_REASON` 2.

★ **`VALIDATED_LEGACY` 2건은 여정이 아니라 `OpenPlatform`/`AdminGrowth` 에서 나왔다.** 실행 엔진(`JourneyBuilder`)은 §32 를 **거의 충족하지 않는다** — 재시도·백오프·에러 봉투가 전부 **다른 핸들러**에 있다. Execution 신설은 **엔진 확장이 아니라 세 자산의 접합**이다.

## 2. 규칙

- 🔴 **`journey_node_logs` 를 Execution 테이블로 재사용 금지.** 결과 로그(단일 `executed_at`)와 시도 기록(started→heartbeat→completed 수명)은 다른 것이다. **`journey_node_logs` 는 존치하고**(무후퇴) Execution 은 별 테이블로 신설한다.
- 🔴 **`heartbeat_at` 을 리스 만료로 대체 금지.** `Omnichannel::claimBatch`(:394-399)는 `claimed_at < now-900s` 면 무조건 회수한다 — **워커가 살아 있어도 900초 넘는 작업은 강제 회수·중복 실행**된다. 승인 실행이 900s 를 넘길 수 있다면(외부 API·대량 정산) **heartbeat 갱신이 실제 결번**이다. 리스 재사용 시 **TTL 을 최대 실행시간보다 길게** 잡거나 heartbeat 를 신설하라 — 이 선택은 원문이 판단 근거를 주지 않으므로 **미확정으로 남긴다**.
- 🔴 **`attempt number` 증가 시 `defer ≠ 실패` 규율 승계**(Omnichannel.php:349,362 quiet_hours/sto_defer 는 attempts 미증가 · ChannelSync:6173·Catalog:1712 **honest pending** — 어댑터 부재 시 재시도 미소모). 대기를 실패로 세면 정상 승인이 재시도 소진으로 DLQ 에 떨어진다.
- 🔴 **`retry scheduled at` 백오프는 `AdAdapters::retryDeliveryDlq`(:1221) 공식 채택**(`600*2^n` · **86400s 캡** · maxAttempts 5). 현행 **백오프 3공식 병존**(AdAdapters `600*2^n` · OpenPlatform `min(60,2^n)`분 :467 · Omnichannel **백오프 없음** :365) — 네 번째 공식 신설 금지.
- 🔴 **`worker identity` 를 `claim_id` 로 대체 금지.** `claim_id`(:392)는 `bin2hex(random_bytes(8))` **익명 1회용**이라 "어느 워커가 반복 실패시키는가"를 물을 수 없다. 단 **`claim_id` 자체는 유지**하라 — 소유권 검증(:418 `AND claim_id=:cid`)의 실자산이다.
- 🔴 **`engine version` 없이 `MIGRATION`/`REPLAY` 실행 타입 배선 금지** — 어느 버전으로 리플레이하는지 물을 수 없다. (§32 Execution Type 참조: [DSAR_APPROVAL_WORKFLOW_EXECUTION_TYPE.md](DSAR_APPROVAL_WORKFLOW_EXECUTION_TYPE.md))
- `error reference` 는 **`AdminGrowth::fail`(:181-184) 공용 추출**로 충족한다 — 신규 에러 봉투 신설 금지(오탐 주의 항목).
