# DSAR — Task Attempt (§40)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §40 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_TASK_ATTEMPT` 엔티티 | `task_attempt` **grep 0** — 승인 시도 이력 개념 전무 | `NOT_APPLICABLE`(부재 → 신설) |
| ★재시도 이력(잡) | **`ad_delivery_dlq`** = 레포 유일 DLQ 테이블 — `attempts`·`last_error`·`next_retry_at`·`status`(AdAdapters.php:1193,1221-1225) | `LEGACY_ADAPTER`(**Attempt 패턴 정본**) |
| ★백오프 | **`AdAdapters::retryDeliveryDlq`**(:1187-1228) — `maxAttempts=5`(:1187) · **`$backoff = (int)min(86400, 600 * (2 ** $attempts))`**(:1221 주석 "지수 백오프(최대 24h)") · `next_retry_at` 컬럼 영속(:1222-1224) | `LEGACY_ADAPTER`(**공식 정본**) |
| 🔴 백오프 3공식 병존 | `AdAdapters`:1221 `min(86400, 600*2^n)` · `OpenPlatform`:466-471 `min(60, 2^n)`분 · `Omnichannel`:365 `attempts<3` **백오프 없음** | 통일 필요 |
| ★defer≠실패 규율 | **`Omnichannel`** — `quiet_hours_defer`(:350 `self::mark($pdo,$obId,'queued',null,'quiet_hours_defer',$now,(int)$row['attempts'])` · 주석 :349 "발송 보류(재큐, **attempts 미증가**)") · `sto_defer`(:363 · 주석 :362 "**실패가 아니므로 attempts 미증가**·재큐(3회 재시도 소진 방지)") | `VALIDATED_LEGACY`(**규율 확립 — 계승 강제**) |
| ★honest pending | **`ChannelSync`**:6173(주석 6172 "honest pending — 어댑터 미보유. **재시도 카운트를 소모하지 않는다**") · **`Catalog`**:1712(동일 취지 · "재고 전용 어댑터가 없는 채널은 pending → **큐 보존**(done 금지)") | `VALIDATED_LEGACY`(**규율 확립 — 계승 강제**) |
| 🔴 idempotency key | `idempotency_key` **grep 0**. `idempotency` 전체 히트 = **Paddle.php:343 주석 1건뿐**("UNIQUE constraint on notification_id = idempotency guard") | `NOT_APPLICABLE`(**5-3-2 가 채울 결번**) |
| 멱등 현행 3패턴 | ① 자연키 선점 `JourneyBuilder::claimSendOnce`(:450-461 UNIQUE INSERT) ② 수신 dedup `paddle_events.notification_id` UNIQUE(Paddle.php:343 · **`processed=1`일 때만 skip**) ③ 원천 dedup `uq_rve_dedup`(Db.php:1017-1034) | `LEGACY_ADAPTER` |
| 🔴 heartbeat | 히트 = `WmsCctv`(:1107-1109 브리지 장비 생존 신호) · `LiveCommerce`(:32 SSE 20s) — **둘 다 장비/연결 생존이지 작업자 진행 신호 아님** | `KEEP_SEPARATE_WITH_REASON` |
| execution id | **grep 0** | `NOT_APPLICABLE` |
| 에러 봉투 | **`AdminGrowth::fail`**(:181-184 `code`+`detail`+`meta`) + **승인 경로 실배선**(`approvalDecide`:1322,1326,1327) | `VALIDATED_LEGACY`(공용 추출·확장) |

**★축 주의 — 잡 재시도 ≠ Task Attempt.** `ad_delivery_dlq`·`omni_outbox`·`channel_shipment_job`·`catalog_writeback_job` 의 `attempts` 는 **워커가 외부 API 호출을 재시도한 횟수**다. 원문 §40 은 **Task 수행 시도**이며 `actor or worker`(:1730)가 명시하듯 **사람의 시도도 포함**한다. **형태 유사를 커버로 계산하면 역산**이다 → 필드 판정은 `NOT_APPLICABLE`/`LEGACY_ADAPTER` 이며, **`VALIDATED_LEGACY` 는 defer≠실패·honest pending 2개 규율뿐**이다(이 둘은 필드가 아니라 **원문이 `retryable 여부` 로 요구하는 판정 규율의 현행 충족분**이다).

**★부재증명은 능력으로.** `idempotency_key` grep 0 을 "멱등 부재"로 읽으면 8회차의 BPMN 오판(이름 grep 0 → 엔진 부재 → JourneyBuilder 로 뒤집힘)을 반복한다. 능력으로 대조하면 **멱등은 3패턴으로 실재**한다. 부재한 것은 **"호출자가 키를 제시하고 서버가 그 키로 중복을 판정하는" 계약**이다 — 현행 3패턴은 전부 **서버가 자연키를 스스로 도출**한다.

## 1. 원문 전사 + 판정 — **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | task_attempt_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_task_id | 부재(§36 Task 자체 부재) | `NOT_APPLICABLE` |
| 3 | attempt number | 부재(Task) · 형태 유사 = `ad_delivery_dlq.attempts`(AdAdapters.php:1202) · `omni_outbox.attempts`(Omnichannel.php:350) · `channel_shipment_job.attempt`(ChannelSync.php:6157) · `catalog_writeback_job.attempt`(Catalog.php:1694) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | actor or worker | 부재 — **워커 시도에 신원 없음**(익명 `claim_id`). 사람 시도 개념도 없음. 인접 = `Mapping::actorId`(:36-50) | `LEGACY_ADAPTER`(신원 해석 위임) |
| 5 | execution id | **grep 0** | `NOT_APPLICABLE` |
| 6 | input hash | 부재 — 입력 해시 grep 0. 인접 = `settings_json` 원문 보관(AdAdapters.php:1199) = **해시 아닌 원문** | `NOT_APPLICABLE` |
| 7 | idempotency key | **grep 0** — 현행 3패턴은 전부 **서버 도출 자연키**(호출자 제시 키 아님) | `NOT_APPLICABLE`(**5-3-2 가 채울 결번**) |
| 8 | started_at | 부재(Attempt) · 인접 = `claimed_at`(Omnichannel.php:397) · `last_run_at`(JourneyBuilder.php:411) | `KEEP_SEPARATE_WITH_REASON` |
| 9 | heartbeat_at | 부재(작업자 진행) · 이름 유사 = `WmsCctv` 브리지 heartbeat(:1107-1109) · `LiveCommerce` SSE(:32) — **장비/연결 생존** | `KEEP_SEPARATE_WITH_REASON` |
| 10 | completed_at | 부재(Attempt) · 인접 = `updated_at`(AdAdapters.php:1217,1224) — **완료 시각 전용 컬럼 아님** | `NOT_APPLICABLE` |
| 11 | outcome | 부재(Attempt) · 형태 유사 = 잡 `status` `done`/`failed`/`pending`(AdAdapters.php:1217,1220) | `KEEP_SEPARATE_WITH_REASON` |
| 12 | error code | 부재(Attempt) · **인접 실자산 = `AdminGrowth::fail`(:181-184) `code`+`detail`+`meta` 봉투 — 승인 경로 `approvalDecide` 실배선**(:1322,1326,1327). 잡 측은 `last_error` **자유 문자열 500자 절단**(AdAdapters.php:1224 `mb_substr(...,0,500)`) = 코드 아님 | `VALIDATED_LEGACY`(봉투 공용 추출) |
| 13 | retryable 여부 | 부재(플래그) · **규율은 REAL** = defer≠실패(Omnichannel.php:349-350,362-363) · honest pending(ChannelSync.php:6172-6173 · Catalog.php:1712) — **"재시도 무의미/미해당"을 attempts 미소모로 표현** | `VALIDATED_LEGACY`(**규율 계승 강제**) |
| 14 | retry scheduled at | 부재(Task) · **인접 실자산 = `ad_delivery_dlq.next_retry_at`**(AdAdapters.php:1193 조회 가드 · :1222-1224 영속) — **레포 유일의 예약 재시도 컬럼** | `LEGACY_ADAPTER`(**패턴 재사용**) |
| 15 | status | 부재(Attempt) — Attempt 행 자체가 없음 | `NOT_APPLICABLE` |
| 16 | evidence | 부재 · 인접 감사 = `journey_node_logs`(JourneyBuilder.php:50,69) · `Db::audit`(ChannelSync.php:6169) · `Mapping::audit`(:292) | `LEGACY_ADAPTER`(감사 기록 위임) |

**실측 개수: 16 / 16 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 6 · 형태유사 분리(`KEEP_SEPARATE_WITH_REASON`) 5 · 인접 위임(`LEGACY_ADAPTER`) 3 · **현행 충족(`VALIDATED_LEGACY`) 2**(`error code` 봉투 · `retryable 여부` 규율).

## 2. 규칙

- 🔴 **★defer ≠ 실패. 이것은 레포에 이미 확립된 규율이며 승인 Attempt 가 계승해야 한다.** `Omnichannel` 은 **보류를 시도 실패로 세지 않는다**: `quiet_hours_defer`(:350)·`sto_defer`(:363) 모두 `status='queued'` 로 재큐하되 **`(int)$row['attempts']` 를 그대로 넘겨 attempts 를 증가시키지 않는다**(:362 주석 "실패가 아니므로 attempts 미증가·재큐(**3회 재시도 소진 방지**)"). **승인 Task 에서 이를 어기면**: 승인자가 부재중이거나 결재 조건이 아직 아닌 "대기" 상태가 **재시도 소진 → `failed`** 로 귀결되어 **승인이 조용히 죽는다.** §40 `retryable 여부` 는 이 규율의 명시적 표현이다.
- 🔴 **★honest pending 계승 강제.** `ChannelSync`:6172-6173 · `Catalog`:1712 — **처리 수단이 없으면 `done` 도 `failed` 도 찍지 않고 `pending` 으로 큐를 보존하며 재시도 카운트를 소모하지 않는다**(수단이 생기면 자동 처리). 승인 Attempt 도 **결정 불가 상태를 `failed` 로 위장 금지**. 이것은 288차 "가짜녹색 systemic"(하드 실패를 `ok=>true` 로 위장한 14채널 18개소)의 **정반대 규율**이며, 반대 방향 위장(대기를 실패로)도 같은 병이다.
- 🔴 **백오프는 `AdAdapters`:1221 공식 채택 — 네 번째 공식 신설 금지.** 현행 **3공식 병존**(`min(86400, 600*2^n)` AdAdapters:1221 · `min(60,2^n)`분 OpenPlatform:466-471 · **백오프 없음** Omnichannel:365). 신설분은 **`min(86400, 600 * 2^attempts)` + `maxAttempts=5`**(AdAdapters.php:1187,1221)를 따른다 — **상한(24h)·영속 컬럼(`next_retry_at`)·조회 가드(`next_retry_at <= now`:1193)가 모두 갖춰진 유일 구현**이다.
- 🔴 **`retry scheduled at` 은 `ad_delivery_dlq.next_retry_at` 패턴 재사용.** 타이머 서비스·지연큐가 **레포에 부재**하고 **스케줄링 수단은 OS cron 단일**이므로, 예약 재시도는 **DB 컬럼 + cron 폴링**이 유일하게 성립하는 구현이다(`journey_enrollments.resume_at`:80-82 · `sms_campaigns.scheduled_at` 도 동일 형태). **다른 스케줄링 기전 도입 금지.**
- 🔴 **`idempotency key` = 5-3-2 가 채울 결번이나, 현행 3패턴 중 자연키 선점을 택하라.** `JourneyBuilder::claimSendOnce`(:450-461)의 **`(tenant, enrollment_id, node_id)` UNIQUE INSERT = 성공이 곧 소유권**이 승인 결정에 가장 정합하다 — **행위 전에 선점**하므로(주석 :452-453 "발송 **전에** 선점하므로 발송-커밋 사이 크래시에도 재발송되지 않는다") 승인-집행 사이 크래시에도 **이중 집행이 없다**.
  ⚠️ **동반 책임**: `releaseSendOnce`(:463-471 · 주석 "해제하지 않으면 **영구 미발송**"). **선점 마커를 두면 모든 비-완료 경로에서 해제 책임이 생긴다.** defer 경로에서 해제를 빠뜨리면 **승인이 영구 스턱**된다 — defer≠실패 규율과 반드시 함께 구현하라.
- 🔴 **`error code` 는 두 번째 봉투 신설 금지.** `AdminGrowth::fail`(:181-184)이 `code`+`detail`+`meta` 봉투를 구현하고 **승인 경로 `approvalDecide` 에 이미 실배선**(:1322,1326,1327)되어 있다 → **공용 추출·확장**. ("에러 코드 체계 부재"는 과장된 진단이며, 믿었다면 두 번째 봉투를 신설할 뻔했다.) 잡 측 `last_error`(AdAdapters.php:1224 자유 문자열 500자 절단)를 **모델로 삼지 마라** — 코드가 아니다.
- 🔴 **`heartbeat_at` 을 `WmsCctv`/`LiveCommerce` heartbeat 로 매핑 금지.** 이름 일치 ≠ 능력 일치 — 장비/SSE 연결 생존 신호이지 **Task 수행자의 진행 신호**가 아니다.
- **`actor or worker` 는 사람과 워커를 **구분**해 기록하라.** 원문이 `actor or worker` 로 병기한 것은 두 주체가 **다르게 취급**됨을 뜻한다. 현행 워커 시도는 익명(`claim_id` 랜덤 8바이트)이고 사람 시도는 개념 자체가 없다 — 🟠 `actor_type` 부재로 `apikey:`/`user:` 가 정족수에 동등 계수되는 결번(스펙 §20 위배)이 **여기서도 재발할 자리**다.
- 🔴 **6종 "있다고 가정"하고 배선 금지.**
- ⚠️ **`evidence` 는 부록이 아니다.** 원문 필드 목록의 **마지막 항목**이며 16번째 필수 필드다.
