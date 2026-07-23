# GeniegoROI Claude Code Implementation Specification

# CCIS Part041 — Enterprise Data Lake, Lakehouse, Streaming & Real-Time Data Platform Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Data Lake·Lakehouse·Streaming·Real-Time Data Platform 표준을 수립한다.

> ★**성격(대응물 스택 — 형식 Lakehouse/Streaming 부재·rollup+cron ETL 실재)**: 데이터 플랫폼은 이 저장소의
> **핵심 경쟁력**(Part026)이나, **형식 빅데이터 스택**이 아니라 **MySQL 중심 집계 파이프라인**이다. 명세가
> 다루는 **형식 Data Lake/Lakehouse(Apache Iceberg/Delta Lake/Hudi·ACID/Time Travel/Snapshot)·이벤트
> 스트리밍(Kafka/Pulsar)·CDC(binlog/WAL/Change Stream)·형식 Schema Registry(Confluent)**는 **부재**한다
> (grep 0·Part026/018/034 승계). ★**실재 축(de-facto 데이터 플랫폼)**: **MySQL rollup 집계**(de-facto
> DWH·`performance_metrics`·`channel_orders`·`*_agg`)·**cron sync ETL 7종**(`analytics`/`connectors`/`cs`/
> `esp`/`sns_live`/`commerce`/`stock`_sync_cron)·**증분(`synced_at`/last_id)**·**`EventNorm`/Unified Data
> Model**(스키마 정규화)·**V3 Data Trust**(품질 게이트)·**`DataPlatform`**(Data Source Registry)·**`omni_outbox`**
> (이벤트 큐+DLQ·Part028)·**SSE/폴링**(준실시간)·**출처 lineage**(Source/Credential/Sync/Quality/Trust) 가
> 실재한다. Part001 §4 에 따라 실측 → Iceberg/Kafka/CDC 부재증명 → rollup+cron ETL+EventNorm 성문화했다. ★정본=
> **Part026(DWH/BI)·Part018(Queue/Event)·Part034(Data Governance)·Part017(캐시)** 승계·**"채널 나열 금지·표준
> 정규화"** 재확인. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 데이터 플랫폼 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Data Platform Architecture | CDC/API/IoT→Streaming→Lake→Lakehouse→AI | **부분(대응물)** — API/webhook→cron sync→rollup 집계→분석/AI. Streaming/Lakehouse 계층 아님 |
| Enterprise Data Lake(Zones) | Raw/Clean/Curated/Archive | **부분(대응물)** — `raw_vendor_event`(Raw)·`EventNorm` 정규화(Clean)·rollup(Curated). 형식 Zone/Object Lake 아님 |
| Data Lakehouse(ACID/Time Travel) | 분석·저장 통합 | **부재** — Lakehouse 없음. MySQL 트랜잭션·rollup 집계 |
| Apache Iceberg | Snapshot/Hidden Partition/Rollback | **부재** — Iceberg 없음(MySQL·Part009) |
| Delta Lake | Transaction Log/Merge | **부재** — Delta 없음 |
| Apache Hudi | Upsert/Incremental Query | **부분(대응물)** — Upsert=집계 upsert·Incremental=`synced_at` 증분. Hudi 아님 |
| Apache Kafka | Topic/Partition/Exactly Once | **부재** — Kafka 없음. 큐=`omni_outbox`(DB·Part018) |
| Apache Pulsar | Multi-Tenant/Geo Replication | **부재** — Pulsar 없음. 멀티테넌트=행 단위 tenant_id |
| Change Data Capture(CDC) | binlog/WAL/Change Stream | **부재(대응물)** — push CDC 없음. **pull 증분(`synced_at`/last_id)** 폴링 |
| Stream Processing | Window/Stateful/Watermark | **부재** — 스트림 처리 없음. cron 배치 집계 |
| Event Streaming | Publish/Subscribe/Replay/DLQ | ★**부분 준수** — `omni_outbox`(publish/재시도/**DLQ replay**)·`OpenPlatform::emit`·pixel. 형식 pub/sub 아님 |
| Data Ingestion(Batch/Stream/API/File) | 수집 표준화 | ★**실재** — cron sync 7종·API/webhook·CSV(`DataExport`). IoT=out of scope(Part037) |
| Schema Registry | Version/Compatibility/Evolution | **부분(대응물)** — `EventNorm`/Unified Data Model·`Mapping`(필드매핑). 형식 versioned Schema Registry 아님 |
| Data Pipeline(E/V/T/L/Quality) | 재시도/복구 | ★**실재** — cron sync(Extract→normalize→Transform→upsert Load)·**V3 Trust(Quality Check)**·재시도(cron/outbox) |
| Batch Processing | Daily/Hourly/Incremental/Backfill | ★**실재** — cron 배치(일/시간·**증분**)·backfill 스크립트. Scheduler=Part019 |
| Real-Time Analytics | Live Metrics/Event Analytics | **부분(준실시간)** — SSE·폴링·rollup·크로스탭. 형식 스트리밍 분석 아님 |
| Data Catalog Integration | Metadata/Discovery/Glossary/Lineage | ★**대응물** — `DataPlatform`(Data Source Registry)·`GeniegoGlossary`·출처 lineage(Part034) |
| Monitoring | Stream Lag/CDC Delay/Throughput | **부분** — cron 상태·`synced_at` 지연·`SystemMetrics`. Stream Lag 대상 없음 |
| Logging | Pipeline/Event/Schema Ver/Trace | **부분** — cron 로그·`SecurityAudit`·출처 기록. Trace ID 부재(Part023) |
| Security(Encrypt/RBAC/격리/Secret) | 파이프라인 보안 | ★**준수** — `Crypto` AES·RBAC·**테넌트 격리 절대**·PII 미저장·Masking |
| Compliance(GDPR/Data Governance) | 보존/삭제 | ★**부분 준수** — `Dsar`(삭제vs익명화·Part034)·DATA 헌법. ISO/SOC2 형식 아님 |
| Disaster Recovery | Kafka/Lakehouse/CDC Replay 복구 | **부분** — DB 백업·cron 재실행·`omni_outbox` 재큐·재수집. Lakehouse/CDC 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Data First/Streaming Native/Immutable/Schema Governed/Metadata Driven/Lineage Aware/Tenant Isolated) | **부분(집계축 강)** | ★Data First·Metadata Driven·Lineage Aware(출처)·Tenant Isolated. Streaming Native/Immutable Lakehouse 부재 |
| §4 Data Platform Architecture | **부분(대응물)** | cron sync→rollup→분석. Streaming/Lakehouse 계층 아님 |
| §5 Data Lake(Zones) | **부분(대응물)** | raw_vendor_event/정규화/rollup. 형식 Zone/Object Lake 아님 |
| §6 Lakehouse | **부재** | Lakehouse 없음(MySQL·rollup) |
| §7~§9 Iceberg/Delta/Hudi | **부재(Hudi 부분)** | Iceberg/Delta 없음. Upsert/증분=집계·`synced_at`(Hudi 유사) |
| §10~§11 Kafka/Pulsar | **부재** | 스트리밍 브로커 없음. 큐=`omni_outbox`(DB) |
| §12 CDC | **부재(대응물)** | push CDC 없음. pull 증분(`synced_at`) 폴링 |
| §13 Stream Processing | **부재** | 스트림 처리 없음. cron 배치 |
| §14 Event Streaming | **부분 준수** | `omni_outbox`(publish/재시도/DLQ)·`OpenPlatform::emit`·pixel |
| §15 Data Ingestion | **★실재** | cron sync 7종·API/webhook·CSV. IoT=out of scope |
| §16 Schema Registry | **부분(대응물)** | `EventNorm`/Unified Model·`Mapping`. versioned Registry 아님 |
| §17 Data Pipeline | **★실재** | cron sync(E/normalize/T/L)·V3 Trust(Quality)·재시도 |
| §18 Batch Processing | **★실재** | cron 배치(증분·backfill·Part019) |
| §19 Real-Time Analytics | **부분(준실시간)** | SSE·폴링·rollup·크로스탭. 스트리밍 분석 아님 |
| §20 Data Catalog | **★대응물** | `DataPlatform`·`GeniegoGlossary`·출처 lineage |
| §21 Monitoring | **부분** | cron 상태·`synced_at` 지연·`SystemMetrics`. Stream Lag 없음 |
| §22 Logging | **부분** | cron 로그·`SecurityAudit`·출처. Trace ID 부재 |
| §23 Security | **★준수** | `Crypto`·RBAC·테넌트 격리·PII 미저장·Masking |
| §24 Compliance | **부분 준수** | `Dsar`·DATA 헌법. ISO/SOC2 형식 아님 |
| §25 Disaster Recovery | **부분** | DB 백업·cron 재실행·outbox 재큐·재수집. Lakehouse/CDC 대상 없음 |
| §26~§27 PHP/Claude(Streaming Gateway/CDC Adapter/Schema Registry Client/Lakehouse Adapter) | **부분** | ★cron ETL·`EventNorm`·V3 Trust·`omni_outbox`·`DataPlatform`. Iceberg/Kafka/CDC Adapter 부재 |
| §28~§29 검증(stream:health/cdc:status/schema:registry) | **대상 없음** | artisan 없음. cron 상태·`synced_at`·`make quality`·V3 Trust 로 대체 |

---

## 4. 확립된 표준 (신규 데이터 플랫폼 코드가 따를 정본)

- ★**분석 저장 = MySQL rollup 집계**(de-facto DWH·`performance_metrics`·`channel_orders`·`*_agg`·Part026). 형식 Data Lake/Lakehouse(Iceberg/Delta/Hudi) 신설 금지. **가짜값 주입 금지**(실데이터 0행=빈 상태).
- ★**ETL = cron sync 워커**(7종·Part019). Extract→**`EventNorm` 정규화**→Transform→upsert Load. ★**증분(`synced_at`/last_id)**·전체 재적재 금지. ★**채널 나열 금지 → 표준모델 정규화**(Unified Data Model·DATA 헌법·Part034).
- ★**이벤트 큐/DLQ = `omni_outbox`**(publish/재시도 attempts+backoff/**DLQ replay**·Part018/028). Kafka/Pulsar 이식 금지(DB-backed 큐 유지). 준실시간=SSE/폴링.
- ★**품질 게이트 = V3 Data Trust**(READY/WARNING/BLOCKED·수집≠사용·Part034). 파이프라인 적재 전 품질검증·Cross Validation. 기존 `DataPlatform`/`AnomalyDetection` 확장(엔진 난립 금지).
- ★**스키마 거버넌스 = `EventNorm`/Unified Data Model + `Mapping`**(필드매핑). 형식 versioned Schema Registry 신설 금지(정규화 계층 확장).
- ★**Lineage/Catalog = 출처 기록(Source/Credential/Sync/Quality/Trust) + `DataPlatform` Data Source Registry**(Part034). 모든 데이터 출처 추적.
- ★**정직 미산출·테넌트 격리·PII 미저장**: 산출 불가=null+사유·값 단일소스 실시간 일체화·테넌트 격리 절대·집계 코호트.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식 Data Lake/Lakehouse(Apache Iceberg/Delta Lake/Hudi·ACID Table/Time Travel/Snapshot)** — 안 함. MySQL rollup 집계가 de-facto DWH(Part026). Lakehouse 도입=인프라 재설계.
2. **이벤트 스트리밍(Apache Kafka/Pulsar)** — 안 함(Part018). 큐=`omni_outbox`(DB-backed·attempts+backoff·DLQ replay). 단일 모놀리스에 적합.
3. **CDC(binlog/WAL/Change Stream)** — 안 함. **pull 증분(`synced_at`/last_id) 폴링**이 대응물(push CDC 아님). CDC=인프라·복제 도입.
4. **Stream Processing(Window/Stateful/Watermark)·형식 Real-Time Analytics** — 안 함. cron 배치 집계·SSE/폴링(준실시간)이 대응물.
5. **형식 Schema Registry(Confluent·versioned/compatibility)** — 안 함. `EventNorm`/Unified Data Model·`Mapping` 정규화가 대응물.
6. **OpenTelemetry/Trace ID·Stream Lag 지표** — 부분. cron 상태·`synced_at` 지연·`SystemMetrics`(정직 null·Part023).
7. **artisan `stream:*`/`cdc:*`/`schema:registry` 명령** — 없음(Slim). cron 상태·`make quality`·V3 Trust·`DataPlatform` API 로 대체.

★**준수하는 실 원칙(강함)**: **rollup 집계(de-facto DWH·가짜값 금지)·cron ETL 증분(synced_at·전체 재적재 금지)·EventNorm 정규화(채널 나열 금지)·V3 Trust 품질 게이트(수집≠사용)·omni_outbox 큐/DLQ·출처 lineage·DataPlatform Registry·정직 미산출·테넌트 격리·PII 미저장·단일 엔진(난립 금지)**.

---

## 6. Claude Code 구현 규칙

1. 분석 저장=rollup 집계 테이블 확장(Part026). Iceberg/Delta/Hudi/Data Lake 신설 금지·가짜값 주입 금지.
2. ETL=cron sync·**증분(`synced_at`)**·`EventNorm` 정규화(**채널 나열 금지**). 전체 재적재 금지·Raw 수정 금지.
3. 큐/이벤트=`omni_outbox`(재시도+DLQ replay·Part018/028). Kafka/Pulsar/CDC 이식 금지(pull 증분·DB 큐 유지).
4. ★품질=V3 Trust(READY/WARNING/BLOCKED·수집≠사용·Part034). 적재 전 검증·`DataPlatform`/`AnomalyDetection` 확장(난립 금지).
5. 스키마=`EventNorm`/Unified Model+`Mapping` 확장. Lineage=출처 기록+`DataPlatform` Registry.
6. ★정직 미산출(null+사유)·테넌트 격리 절대·PII 미저장(집계 코호트)·`Crypto`/Masking. Iceberg/Kafka/Lakehouse 를 "명세에 있다"는 이유로 이식하지 않는다(rollup+cron ETL+omni_outbox 로 커버).

---

## 7. Completion Criteria

- [x] 데이터 플랫폼 스택 **실측**(Iceberg/Delta/Hudi/Kafka/Pulsar/CDC/Schema Registry 부재·rollup DWH·cron ETL 7종·`EventNorm`·V3 Trust·`omni_outbox`·`DataPlatform` 실재)
- [x] 명세 §3~§29 **섹션별 매핑·판정**(Lakehouse/Streaming/CDC 부재 증명·집계 파이프라인 강함)
- [x] 실 플랫폼(rollup+cron ETL+EventNorm+V3 Trust+omni_outbox+DataPlatform) 성문화(§4)
- [x] ★rollup DWH(가짜값 금지)·증분 ETL(synced_at)·EventNorm 정규화(채널 나열 금지)·V3 Trust(수집≠사용)·omni_outbox DLQ·lineage·정직 미산출·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — Iceberg/Delta/Hudi/Kafka/Pulsar/CDC/Stream Processing/Schema Registry
- [x] Claude Code 규칙(§6) · cron sync·`EventNorm`·V3 Trust·`omni_outbox`·`DataPlatform` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **MySQL 집계 파이프라인**(rollup de-facto DWH + cron ETL
> 7종 증분 + `EventNorm` 정규화 + V3 Trust 품질 + `omni_outbox` 큐/DLQ + `DataPlatform` Registry)의 성문화이지
> Iceberg/Delta/Kafka/CDC/Lakehouse 이식이 아니다. ★데이터 인텔리전스=핵심 경쟁력(강함)이나 **형식 빅데이터
> 스택이 아니라 MySQL 중심 집계**로 실현한다(Part026/018/034 승계).

---

## 다음 Part

**CCIS Part042 — Enterprise AI Governance, Responsible AI, Explainable AI (XAI) & AI Risk Management** — ★사전 실측 예고: 형식 XAI 라이브러리(SHAP/LIME)·Bias/Fairness 도구·형식 AI Risk Framework 는 **부재**(MEA 056 AI Governance weak·`shap` grep 0)이나, AI 거버넌스 실체는 **V4 헌법(근거/신뢰도 표시 Explainable)·`action_request`+`agent_mode`(HITL 승인)·`ModelMonitor`(모델 감시)·V3 Trust(READY 데이터만 AI 사용)·`SecurityAudit`(AI 감사)·`ClaudeAI` Gateway(일원화·MEA 053)·Safety Rule(신뢰도/권한 부족→자동집행 금지)**로 부분~강 실재. Part042 도 실측→SHAP/LIME/Bias 도구 부재증명→V4 헌법+HITL+ModelMonitor+V3 Trust 성문화. ★MEA 053~058·헌법 V4/V5 승계·"AI는 READY 데이터만·근거없는 결론 금지".
