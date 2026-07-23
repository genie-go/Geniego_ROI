# GeniegoROI Claude Code Implementation Specification

# CCIS Part018 — Queue, Event-Driven Architecture & Asynchronous Processing Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Queue·Event-Driven·비동기 처리 표준을 수립한다.

> ★**성격(Part001~017 과 동일)**: 사용자가 Part018 명세(Kafka/RabbitMQ/Redis Queue·Event Bus·Domain
> Event·Consumer Group·Partition·Saga·Outbox/Inbox·Symfony Messenger)를 제공했으나 **그대로 따르지
> 않았다.** 실측 결과 **메시지 브로커(Kafka/RabbitMQ/Redis Queue)·Event Bus·Domain Event 클래스는
> 부재**하나, **DB 기반 작업큐(`status='queued'` 테이블) + cron 워커 33개** 모델이 정본이며 **DLQ·
> Retry/Backoff·Idempotency(COALESCE)·SSE** 까지 실재한다. Part001 §4 에 따라 **실측 → 브로커 부재
> 증명 → 실 DB-cron 비동기 모델 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 비동기/큐 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| 메시지 브로커 | Kafka/RabbitMQ/Redis Queue | **부재**(kafka/amqp/predis 0) |
| Event Bus/Dispatcher | Publish/Subscribe | **부재**(0·Part007) |
| Domain/Integration Event 클래스 | 과거형 이벤트 | **0개**(transaction-script) |
| 비동기 실행 | Consumer/Worker | ★**DB 작업큐 + cron 워커 33개**(`bin/*_cron.php`) — email_queue·sms_queue·kakao_queue·omni_dispatch·webhook_dispatch·shipment_confirm·journey·rule_engine·writeback·pg_settlement 등 |
| 큐 저장 | Topic/Partition | ★**DB 테이블 status 컬럼**(`'queued'` 91·`WHERE status` 26) — cron 이 폴링·처리 |
| Consumer Group/Partition/Ordering | 병렬·순서 | **N/A** — 단일 cron 폴러(파티셔닝 없음). 순서=DB `id ASC` |
| DLQ | Dead Letter Queue | ★**실재** — **`ad_dlq_cron.php` 워커** + dlq refs 26 |
| Retry | 백오프 | ★**retry/backoff 177**(외부연동 재시도) |
| Idempotency | Idempotency-Key | ★**`COALESCE` dedup 363**(재수집이 수기 안 덮음·290차) + 웹훅 서명/토큰. Idempotency-Key 헤더 부재(1) |
| Outbox/Inbox | 트랜잭션-발행 일관성 | **유사 34**(부분 — 일부 발행/처리기록 테이블) |
| Saga | 분산 트랜잭션 | **부재**(0) — 핸들러 내 트랜잭션 |
| 실시간 푸시 | — | ★**SSE(text/event-stream) 2** + 프론트 **BroadcastChannel**(크로스탭)·폴링 |
| Monitoring(Lag/DLQ) | Kafka Lag | **부분** — DLQ 워커·SystemMetrics 프로브 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(At Least Once/Idempotent/Retry/Fail Independently) | **부분 준수** | cron 재실행(at-least-once)·COALESCE(idempotent)·retry·워커 독립 실패. Event First 는 아님 |
| §4~§8 EDA/Event 종류/Domain·Integration Event/Event Bus | **미적용** | Event Bus/Domain Event 클래스 0. 서비스간=직접 호출/DB 큐 |
| §9~§12 Kafka/RabbitMQ/Redis Queue | **미적용(대응물)** | 브로커 없음. ★**DB 작업큐 + cron** 이 대응 |
| §13~§14 Producer/Consumer | **부분(대응물)** | Producer=핸들러가 `status='queued'` INSERT. Consumer=cron 워커(idempotent) |
| §15 Consumer Group | **미적용** | 단일 폴러. 병렬=워커별 도메인 분리 |
| §16~§18 Topic/Partition/Ordering | **상이** | Topic=테이블·status. 순서=`id ASC`. 파티션 없음 |
| §19 Retry(Validation 재시도 금지) | **★준수** | 외부연동 retry 177. 검증/비즈니스 오류 재시도 안 함 |
| §20 DLQ | **★실재** | `ad_dlq_cron.php` + dlq 26 |
| §21 Idempotency | **★대응물(COALESCE)** | COALESCE dedup 363·웹훅 토큰. Idempotency-Key 헤더 아님 |
| §22~§23 Outbox/Inbox | **부분** | 유사 발행/처리기록 34. 정식 Outbox 테이블 아님 |
| §24 Saga | **미적용** | 핸들러 트랜잭션(단일 DB). 분산 트랜잭션 부재 |
| §25~§26 Event Versioning/Serialization | **상이** | 큐 payload=JSON(테이블 컬럼). Avro/Protobuf/Schema Registry 아님. API 는 `/v{NNN}` 버전 |
| §27 Event Replay | **부분** | 큐 행 재처리·재수집(COALESCE 안전). Kafka replay 아님 |
| §28~§29 Monitoring/장애복구 | **부분** | DLQ 워커·retry·워커 재실행(cron). Kafka Lag 아님 |
| §30 PHP(Symfony Messenger/Kafka Client) | **미적용** | 부재. cron + PDO 정본 |
| §31 Claude(Event 민감정보 금지·순서 Partition) | **부분 준수** | 민감정보 payload 금지·큐 순서 id ASC. traceId/correlation 부재(Part013) |
| §32~§33 검증(kafka-topics/rabbitmqctl) | **대상 없음** | 브로커 CLI 없음. cron 실행·DB 큐 조회 |

---

## 4. 확립된 표준 (신규 비동기 코드가 따를 정본)

- **큐 = DB 테이블 + cron 워커**. Producer=핸들러가 작업행 INSERT(`status='queued'`·`tenant_id`). Consumer=`bin/{도메인}_cron.php` 가 폴링(`WHERE status='queued' … ORDER BY id ASC`)·처리·`status` 전이. **브로커(Kafka/RabbitMQ/Redis Queue) 신설 금지**.
- **Idempotency**: **`COALESCE(?, 기존값)`**(재수집이 수기 입력 덮지 않음)·유니크/상태로 중복 처리 방지. 웹훅=서명(`hash_hmac`)+토큰.
- **Retry**: 외부연동만·백오프. 검증/비즈니스 오류 재시도 금지. 초과분은 **DLQ**(`ad_dlq` 패턴) — 운영자 분석용 보존.
- **순서**: 동일 대상 이벤트는 `id ASC` 순차. 파티셔닝 없음.
- **실시간**: SSE(`text/event-stream`)·프론트 BroadcastChannel(크로스탭)·폴링. Event Bus 아님.
- **트랜잭션 일관성**: 작업행 INSERT 는 비즈니스 트랜잭션과 함께(핸들러 내). ★**외부 API 호출은 트랜잭션 밖·루프 내 N+1 금지**(285차).
- **민감정보**: 큐 payload/로그에 비번/토큰/PII 금지(Part012/013).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Kafka/RabbitMQ/Redis Queue·Event Bus·Domain Event 클래스·Consumer Group/Partition** — 안 함. 브로커 인프라 부재(Part006). DB 작업큐+cron 이 정본. 브로커 도입=인프라 추가 + Part007/008 위반.
2. **Saga Pattern·2PC** — 안 함. 단일 DB·핸들러 트랜잭션. 분산 트랜잭션 요구 없음.
3. **Outbox/Inbox 정식 테이블·Avro/Protobuf/Schema Registry** — 안 함. COALESCE dedup·웹훅 토큰·JSON payload 로 대응.
4. **Symfony Messenger/Laravel Queue** — 안 함(Slim). cron+PDO 정본.
5. **Kafka Replay/Event Versioning** — 안 함. 큐 행 재처리·`/v{NNN}` API 버전.

★**준수하는 실 원칙**: At-Least-Once(cron 재실행)·**Idempotent(COALESCE)**·**Retry+DLQ**(ad_dlq)·워커 독립 실패·순서(id ASC)·민감정보 payload 금지·외부 API 트랜잭션 밖.

---

## 6. Claude Code 구현 규칙

1. 비동기=**DB 작업큐(`status='queued'`+`tenant_id`) + cron 워커**(`bin/{도메인}_cron.php`). 브로커/Event Bus 신설 금지.
2. Consumer(cron)는 **Idempotent**(COALESCE/상태 중복차단). 재실행 안전.
3. Retry=외부연동만·백오프. 초과=DLQ 보존(ad_dlq 패턴). 검증/비즈니스 오류 재시도 금지.
4. ★**외부 API 는 트랜잭션 밖·루프 내 N+1 금지**(285차 502). 작업행 순서=`id ASC`.
5. 큐 payload/로그에 민감정보 금지. 실시간=SSE/BroadcastChannel/폴링.
6. Kafka/RabbitMQ/Saga/Outbox/Schema Registry 를 "명세에 있다"는 이유로 이식하지 않는다(브로커=인프라 결정).

---

## 7. Completion Criteria

- [x] 비동기/큐 **실측**(브로커 0·Event Bus 0·cron 워커 33·DB 큐 status·DLQ ad_dlq·retry 177·COALESCE 363·SSE 2)
- [x] 명세 §3~§33 **섹션별 매핑·판정**(Kafka/RabbitMQ/Event Bus/Domain Event/Saga 부재 증명)
- [x] 실 DB-cron 큐 모델(Producer INSERT·cron Consumer·DLQ·retry·COALESCE idempotency·SSE) 성문화(§4)
- [x] At-Least-Once·Idempotent(COALESCE)·Retry+DLQ·순서(id ASC)·외부 API 트랜잭션 밖 준수 명시
- [x] 의도적 미적용 + 사유(§5) — 브로커/Event Bus/Saga/Outbox
- [x] Claude Code 규칙(§6) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 DB 작업큐 + cron 워커(+DLQ/retry/COALESCE) 비동기 모델의 성문화이지 Kafka/Event Bus 이식이 아니다.

---

## 다음 Part

**CCIS Part019 — Scheduler, Batch & Workflow** — ★사전 경고: 실 스케줄러=**cron 워커 33개**(`bin/*_cron.php`·본 Part 실측)·Quartz/Laravel Scheduler 부재. Workflow=`JourneyBuilder`(여정 캔버스)·`RuleEngine`. 배치=LIMIT 분할. Part019 도 실측→매핑→cron+JourneyBuilder+RuleEngine 성문화(스케줄러 프레임워크 이식 금지).
