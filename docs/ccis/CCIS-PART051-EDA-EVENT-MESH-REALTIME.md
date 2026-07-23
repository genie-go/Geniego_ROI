# GeniegoROI Claude Code Implementation Specification

# CCIS Part051 — Enterprise Event-Driven Architecture (EDA), Event Mesh & Real-Time Integration Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise EDA·Event Mesh·Real-Time Integration 표준을 수립한다.

> ★**성격(대응물 스택 — DB 이벤트 큐/webhook 실재·형식 Event Broker/Mesh/Sourcing/CQRS 부재)**: 본 Part 는 **CCIS
> Part018(Queue/Event)·028(Webhook)·032(워크플로·Saga 부재)·041(Streaming)와 중복**되며 그 판정을 승계한다.
> 이 저장소는 이벤트 통신을 **DB-backed 아웃박스+webhook**으로 실현하지 **형식 Event 스택(Kafka/이벤트 소싱)**이
> 아니다. 명세가 다루는 **형식 Event Broker(Kafka/RabbitMQ/Pulsar/NATS)·Event Mesh(multi-cluster/cross-region)·
> Event Sourcing(event store/aggregate replay)·CQRS(command/query 분리/projection)·형식 Schema Registry·Stream
> Processing·Saga Orchestration**은 **부재**한다(grep 0). ★결함이 아니라 대응물+단일 모놀리스 적합(Part025)·
> 정직한 비적용. ★**실재 축(이벤트 substrate)**: **`omni_outbox`**(**transactional-outbox 유사 DB 이벤트 큐**·
> attempts+backoff·**DLQ replay** `/v39x/admin/dlq/replay`·Part028)·**`EventNorm`/Unified Data Model**(이벤트
> 정규화·**immutable `raw_vendor_event`**)·**webhook**(`Webhooks` HMAC 검증 inbound·`OpenPlatform::emit`
> outbound)·**pixel**(`PixelTracking`)·**cron 이벤트 워커 34종**·**`RuleEngine` 트리거**·**DB 트랜잭션**(Saga
> 대신·단일 모놀리스) 는 실재한다. ★★**오흡수 차단**: **`SecurityAudit`/`pm_audit`/`raw_vendor_event`=
> append-only 이벤트 로그이지 Event Sourcing(상태를 이벤트로 재구성)이 아님** · **`omni_outbox`=아웃박스
> 패턴이지 Kafka event broker 아님**. Part001 §4 에 따라 실측 → Broker/Mesh/Sourcing/CQRS 부재증명 →
> omni_outbox+webhook+EventNorm 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 이벤트 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| EDA Architecture | Producer→Broker→Mesh→Consumers | **부분(대응물)** — Producer→`omni_outbox`/webhook→cron 워커/consumer. Broker/Mesh 계층 아님 |
| Event Model | Event ID/Type/Aggregate/Version/Immutable | **부분** — `raw_vendor_event`(immutable)·`omni_outbox`(id/type/status)·pixel. Aggregate/Version 부분 |
| Event Broker | Kafka/RabbitMQ/Pulsar/NATS | **부재** — 브로커 없음. **DB-backed `omni_outbox`**(Part018) |
| Event Mesh | Multi-Cluster/Cross-Region/Federation | **부재(out of scope)** — 단일 서버(멀티클러스터 아님·Part045) |
| Event Streaming | Real-Time/Window/Stateful | **부재** — 스트림 처리 없음. cron 배치·SSE/폴링(준실시간·Part041) |
| Event Sourcing | Event Store/Aggregate Replay/Snapshot | **부재(대응물 아님)** — ★**append-only 로그(`raw_vendor_event`/`SecurityAudit`/`pm_audit`)는 이벤트 로그이지 상태 재구성 소싱 아님** |
| CQRS Integration | Command/Query/Projection/Read Model | **부재** — CQRS 분리 없음. 단일 모델·rollup(읽기 최적화 유사) |
| Publish/Subscribe | Topic/Queue/Broadcast/Consumer Group | **부분(대응물)** — `omni_outbox`(큐)·`OpenPlatform::emit`(webhook publish)·Line broadcast. 형식 pub/sub 아님 |
| Schema Registry | Event Schema/Version/Compatibility | **부분(대응물)** — `EventNorm`/Unified Data Model·`Mapping`. 형식 versioned Registry 아님(Part041) |
| Event Governance | Catalog/Ownership/Naming/Lifecycle | **부분** — `EventNorm` 표준 이벤트·출처 기록. 형식 Event Catalog 부분 |
| Event Replay | Full/Partial/Time-Based/Aggregate | **부분(DLQ)** — `omni_outbox` DLQ replay(`/v39x/admin/dlq/replay`·`replay_bulk`)·재수집. Aggregate Replay 아님 |
| Dead Letter Queue(DLQ) | Failed/Retry/Manual Recovery | ★**실재** — `omni_outbox`(attempts+backoff·실패 관리)·DLQ replay 관리 라우트 |
| Saga Orchestration | Distributed Tx/Compensation | **부재** — Saga 없음. **DB 트랜잭션**(단일 모놀리스·Part032). 보상=도메인 환불/정정 |
| Real-Time Integration | ERP/TMS/WMS/AI 연계 | **부분(적재형)** — cron sync·webhook·pixel. 실시간 이벤트 연계 부분 |
| Event Analytics | Throughput/Processing/Consumer Lag | **부분** — `omni_outbox` 상태·cron·`SystemMetrics`. Consumer Lag 대상 없음 |
| Monitoring | Broker/Queue Depth/Latency/DLQ | **부분** — outbox depth·cron 상태·`Alerting`. Broker 대상 없음 |
| Logging | Event/Aggregate/Topic/Trace | **부분** — `omni_outbox`·출처 기록·`SecurityAudit`. Trace ID 부재 |
| Security(TLS/Event Encrypt/RBAC/Topic Perm/격리) | 이벤트 보안 | ★**준수** — TLS·webhook HMAC·`Crypto`·RBAC·**테넌트 격리 절대**·PII 미저장(pixel=해시) |
| Compliance(GDPR) | 이벤트 데이터 정책 | ★**부분 준수** — `Dsar`·PII 미저장·`SecurityAudit` |
| Disaster Recovery | Event Store/Broker/DLQ/Replay 복구 | **부분** — DB 백업·`omni_outbox` 재큐·DLQ replay·재수집 |
| Performance(Batch/Consumer Scaling/Compression/Partition) | 이벤트 처리량 | **부분** — 배치(OMNI_BATCH 500)·cron. Partition/Compression 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Event First/Loose Coupling/Async/Immutable Event/Schema Controlled/Replay Ready/Tenant Isolated/Reliable Delivery) | **부분(대응물축)** | ★Loose Coupling·Async(`omni_outbox`)·Immutable(`raw_vendor_event`)·Replay Ready(DLQ)·Tenant Isolated·Reliable(retry). Schema Controlled 부분 |
| §4 EDA Architecture | **부분(대응물)** | Producer→`omni_outbox`/webhook→cron. Broker/Mesh 아님 |
| §5 Event Model | **부분** | `raw_vendor_event`(immutable)·`omni_outbox`. Aggregate/Version 부분 |
| §6 Event Broker | **부재** | 브로커 없음. DB `omni_outbox` |
| §7 Event Mesh | **부재(out of scope)** | 단일 서버 |
| §8 Event Streaming | **부재** | 스트림 처리 없음. cron·SSE/폴링 |
| §9 Event Sourcing | **부재(오흡수 경계)** | ★append-only 로그≠Event Sourcing(상태 재구성 아님) |
| §10 CQRS | **부재** | CQRS 분리 없음. rollup(읽기 최적화 유사) |
| §11 Pub/Sub | **부분(대응물)** | `omni_outbox`·`OpenPlatform::emit`·broadcast |
| §12 Schema Registry | **부분(대응물)** | `EventNorm`/Unified Model·`Mapping`. versioned Registry 아님 |
| §13 Event Governance | **부분** | `EventNorm` 표준·출처. Catalog 부분 |
| §14 Event Replay | **부분(DLQ)** | `omni_outbox` DLQ replay·재수집. Aggregate Replay 아님 |
| §15 DLQ | **★실재** | `omni_outbox`(attempts+backoff)·DLQ replay 라우트 |
| §16 Saga Orchestration | **부재** | Saga 없음. DB 트랜잭션(단일 모놀리스)·도메인 보상 |
| §17 Real-Time Integration | **부분(적재형)** | cron sync·webhook·pixel |
| §18 Event Analytics | **부분** | outbox 상태·`SystemMetrics` |
| §19 Monitoring | **부분** | outbox depth·cron·`Alerting` |
| §20 Logging | **부분** | `omni_outbox`·출처·`SecurityAudit` |
| §21 Security | **★준수** | TLS·webhook HMAC·`Crypto`·RBAC·테넌트 격리·PII 미저장 |
| §22 Compliance | **부분 준수** | `Dsar`·PII 미저장·`SecurityAudit` |
| §23 Disaster Recovery | **부분** | DB 백업·outbox 재큐·DLQ replay·재수집 |
| §24 Performance | **부분** | 배치(500)·cron. Partition/Compression 없음 |
| §25~§26 PHP/Claude(Publisher/Consumer/Schema Registry/Saga Coordinator/Replay Service) | **부분** | ★`omni_outbox`·webhook·`EventNorm`·cron. Broker Adapter/Saga/CQRS 부재 |
| §27~§28 검증(event:health/event:schema/saga:status/dlq:status) | **대상 없음** | artisan 없음. `omni_outbox`·DLQ replay·`EventNorm` 로 대체 |

---

## 4. 확립된 표준 (신규 이벤트 코드가 따를 정본)

- ★**이벤트 큐/DLQ 정본 = `omni_outbox`**(**transactional-outbox 유사**·attempts+backoff·DLQ replay·Part018/028). 신규 비동기 이벤트는 이 아웃박스 경유. ★**Kafka/RabbitMQ/Pulsar 이식 금지**(DB-backed 큐 유지·단일 모놀리스 적합).
- ★**이벤트 정규화/스키마 = `EventNorm`/Unified Data Model**(표준 이벤트·**immutable `raw_vendor_event`**·Part041). ★**채널 나열 금지 → 표준 정규화**. 형식 Schema Registry 신설 금지(정규화 계층 확장).
- ★**webhook = `Webhooks`(HMAC 검증 inbound)+`OpenPlatform::emit`(outbound)**(Part028). 서명 없는 수신 금지·재시도=`omni_outbox`.
- ★**Replay = `omni_outbox` DLQ replay**(`/v39x/admin/dlq/replay`·`replay_bulk`)+재수집. ★**Event Sourcing(aggregate replay) 신설 금지**(상태 재구성 소싱 부재).
- ★★**오흡수 차단**: **`SecurityAudit`/`pm_audit`/`raw_vendor_event`=append-only 이벤트 로그이지 Event Sourcing 아님**(상태를 이벤트로 재구성하지 않음) · **`omni_outbox`=아웃박스이지 Event Broker 아님** · **rollup=읽기 집계이지 CQRS projection 아님**. 혼동 금지.
- ★**Saga 대신 DB 트랜잭션**(단일 모놀리스·Part032). 분산 트랜잭션 Saga/Compensation 신설 금지. 보상=도메인 환불/정정.
- ★**테넌트 격리·PII 미저장·정직 미산출**: 이벤트도 위조 불가 권위 tenant·pixel 해시(PII 없음)·거짓 트리거 0(`RuleEngine` 실데이터).

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 다중 Part 중복 + 형식 EDA 부재)

1. **형식 Event Broker(Kafka/RabbitMQ/Pulsar/NATS)·Event Mesh** — 안 함(Part018/041). **DB-backed `omni_outbox`**(attempts+backoff·DLQ)가 대응물·단일 모놀리스 적합. Broker=인프라 도입.
2. **Event Sourcing(event store/aggregate replay/snapshot)·CQRS(command/query/projection)** — 안 함. ★append-only 로그(`raw_vendor_event`/audit)는 **이벤트 로그이지 상태 재구성 소싱 아님**(오흡수 금지). rollup=읽기 집계이지 CQRS 아님.
3. **Saga Orchestration(분산 트랜잭션/Compensation)** — 안 함(Part032). **단일 모놀리스 DB 트랜잭션**·도메인 보상(환불/정정)이 대응물.
4. **Stream Processing(Window/Stateful/Watermark)·형식 Schema Registry(Confluent)** — 안 함. cron 배치·SSE/폴링·`EventNorm` 정규화가 대응물.
5. **Part018/028/032/041 와 중복되는 Queue/Webhook/Saga/Streaming** — 각 Part 정본(재판정 금지). 본 Part 는 EDA/Event Mesh/Sourcing 관점만.
6. **artisan `event:*`/`saga:status`/`event:dlq` 명령** — 없음(Slim). `omni_outbox`·DLQ replay·`EventNorm` 로 대체.

★**준수하는 실 원칙**: **transactional-outbox(`omni_outbox`·attempts+backoff·DLQ replay)·이벤트 정규화(`EventNorm`·immutable raw·채널 나열 금지)·webhook HMAC(in/out)·pixel(해시)·cron 워커·`RuleEngine` 트리거(거짓 트리거 0)·DB 트랜잭션(Saga 대신)·테넌트 격리·PII 미저장**. ★**오흡수 차단**: audit 로그≠Event Sourcing·outbox≠Broker·rollup≠CQRS. ★**out of scope**: Event Mesh 는 단일 서버 범위 밖.

---

## 6. Claude Code 구현 규칙

1. 비동기 이벤트=`omni_outbox`(아웃박스·attempts+backoff·DLQ replay·Part018/028) 경유. Kafka/RabbitMQ/Pulsar 이식 금지.
2. 이벤트 정규화=`EventNorm`/Unified Data Model(immutable raw·**채널 나열 금지**). webhook=`Webhooks`(HMAC in)/`OpenPlatform::emit`(out)·서명 없는 수신 금지.
3. Replay=`omni_outbox` DLQ replay+재수집. ★Event Sourcing(aggregate replay)/CQRS(projection) 신설 금지.
4. ★★**오흡수 금지**: `SecurityAudit`/`pm_audit`/`raw_vendor_event`(append-only 로그)를 Event Sourcing 으로·`omni_outbox`를 Event Broker 로·rollup 을 CQRS 로 표기하지 않는다.
5. 분산 트랜잭션=DB 트랜잭션(단일 모놀리스). Saga/Compensation 신설 금지·보상=도메인 환불/정정. 테넌트 격리·PII 미저장·거짓 트리거 0.
6. Event Broker/Mesh/Sourcing/CQRS/Saga 를 "명세에 있다"는 이유로 이식하지 않는다(`omni_outbox`+webhook+`EventNorm` 로 커버). Queue/Webhook/Saga 판정=Part018/028/032 정본(재판정 금지).

---

## 7. Completion Criteria

- [x] 이벤트 스택 **실측**(Event Broker/Mesh/Sourcing/CQRS/Saga/Schema Registry 부재·`omni_outbox` DLQ·`EventNorm` immutable·webhook HMAC·cron 워커·`RuleEngine` 트리거 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 EDA 부재 증명·DB 아웃박스/webhook 실재·Part018/028/032/041 중복)
- [x] 실 이벤트(omni_outbox+EventNorm+webhook+DLQ replay+DB 트랜잭션) 성문화(§4)
- [x] ★transactional-outbox·이벤트 정규화(채널 나열 금지)·★★오흡수 차단(audit≠Sourcing·outbox≠Broker·rollup≠CQRS)·Saga 대신 DB 트랜잭션·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — Event Broker/Mesh/Sourcing/CQRS/Saga/Stream Processing/Schema Registry
- [x] Claude Code 규칙(§6) · `omni_outbox`·`EventNorm`·`Webhooks`/`OpenPlatform`·DLQ replay 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **DB-backed 이벤트 substrate**(`omni_outbox` 아웃박스+DLQ +
> `EventNorm` immutable 정규화 + webhook HMAC + cron 워커 + `RuleEngine` 트리거)의 성문화이지 Kafka/Event
> Sourcing/CQRS/Saga 이식이 아니다. ★★**오흡수 차단**: **append-only 감사 로그는 Event Sourcing 이 아니고,
> `omni_outbox` 는 Event Broker 가 아니며, rollup 은 CQRS projection 이 아니다**. ★Saga 대신 **단일 모놀리스 DB
> 트랜잭션**(Part032). Queue/Webhook 판정=Part018/028 정본.

---

## 다음 Part

**CCIS Part052 — Enterprise Identity Governance Administration (IGA), PAM & Zero Trust Security** — ★사전 실측 예고: ★**Part030(IAM/SSO)·Part040(SecOps)와 중복** — 형식 IGA/PAM 솔루션(SailPoint/CyberArk)·Password Vault·Session Recording·Just-In-Time 승격은 **부재**이나, 거버넌스 실체는 **`AccessReview`(휴면키 접근검토·access certification)·RBAC+Scope·MFA(TOTP)·세션 hash-only·`SecurityAudit`·writeGuard·high-value 게이트·Zero Trust 컨트롤·SoD 부분(action_request maker-checker)**로 부분~강 실재(Part030/040 승계). Part052 도 실측→IGA/PAM/Vault/Session Recording 부재증명→AccessReview+RBAC+MFA+Zero Trust 성문화. ★Part030/040 중복 명시·형식 PAM 부재(Part030 이미 판정)·SecurityAudit 재오염 금지.
