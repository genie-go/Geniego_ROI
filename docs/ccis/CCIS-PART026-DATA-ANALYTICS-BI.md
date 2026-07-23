# GeniegoROI Claude Code Implementation Specification

# CCIS Part026 — Data Analytics, BI, Data Warehouse & Reporting Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Data Analytics·BI·Data Warehouse·Reporting 표준을 수립한다.

> ★**성격(강한 스택·핵심 역량)**: 데이터 인텔리전스는 이 저장소의 **핵심 경쟁력**(헌법
> `DATA_INTELLIGENCE_CONSTITUTION`·V3 Data Trust Intelligence Engine). 명세의 **Single Source of
> Truth·Quality by Design·Metadata/Lineage·Incremental Loading·AI Analytics·Audit Everything** 은
> **강하게 준수**한다. 실측 결과 **형식 DWH/Data Lake/OLAP/ETL 도구(Snowflake/Airflow/dbt)는 부재**하나,
> 분석 실체는 **MySQL rollup 집계(fact/aggregate 테이블) + cron sync ETL + V3 Trust 품질엔진 + 출처
> lineage 기록 + Rollup/Mmm/AttributionEngine 분석**으로 강하게 실재한다. Part001 §4 에 따라 실측 →
> DW 도구 부재 증명 → 실 분석 스택 성문화했다. ★"**수집≠사용**"(Trust First — 신뢰도 미달은 AI/자동화
> 제외)·정직 미산출은 이 저장소의 문화다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 분석 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| DWH/Data Lake | Snowflake/Redshift/BigQuery | **형식 도구 부재**(38=주석/문자열 오탐). ★**MySQL rollup 집계 테이블(560)** 이 de-facto DWH |
| Fact/Aggregate Table | Fact/Dimension | ★**`performance_metrics`·`channel_orders`·`*_agg`·`*_daily`** — 사전집계(fact 유사) |
| ETL/ELT | Airflow/dbt | ★**cron sync 워커 7종**(`analytics_sync`·`commerce_sync`·`connectors_sync`·`cs_sync`·`esp_sync`·`sns_live_sync`·`stock_sync`) |
| Incremental Loading | CDC/Timestamp | ★**`synced_at`/last_id 증분**(Part019·전체 재적재 아님) |
| 분석 엔진 | OLAP/BI | ★**`Rollup`(P&L/KPI)·`Mmm`(마케팅믹스·ROI frontier)·`AttributionEngine`(markov)·`Decisioning`·`DemandForecast`·`DataPlatform`** |
| Data Quality | Null/Dup/Range/Consistency | ★**V3 Trust Intelligence(`READY`/`WARNING`/`BLOCKED` 143)·`AnomalyDetection`·Cross Validation**(헌법 핵심경쟁력) |
| Metadata/Lineage | Catalog/흐름추적 | ★**출처 기록(Source/Credential/Sync/Quality/Trust·145)** — DATA 헌법 "모든 데이터 출처 기록" |
| KPI/Dashboard | Role-Based | **프론트 역할별 대시보드**(Executive/Marketing/Logistics/AI/Ops·frontend) + rollup |
| Report Engine | PDF/Excel/CSV | **`DataExport`(csv/xlsx·36)**·`ReportBuilder`(프론트·사용자 메트릭/쿼리) |
| AI Analytics | 예측/이상탐지/추천 | ★**Mmm(ROI 예측·frontier)·PriceOpt·DemandForecast·CustomerAI·Decisioning·AnomalyDetection** |
| Real-Time | Kafka/Redis Streams | **부분** — SSE·크로스탭·rollup 폴링(Kafka 아님·Part018) |
| SSOT | 단일 진실원천 | ★**강함** — 값 단일소스 실시간 일체화·가짜값 금지·정직 미산출(null+사유) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Data First/SSOT/Quality by Design/Metadata/Incremental/Audit) | **★강하게 준수** | ★SSOT·Trust(Quality by Design)·출처 lineage·synced_at 증분·SecurityAudit. Immutable Raw 부분 |
| §4~§5 Architecture/DWH(운영 분리) | **부분** | 형식 DWH 없음. ★rollup 집계=분석용(운영 테이블과 논리 분리). 물리 분리 아님 |
| §6~§7 Data Lake/Mart | **부분(대응물)** | Data Lake 없음. Mart=도메인별 rollup(Sales/Marketing/Logistics=performance_metrics/channel_orders) |
| §8~§9 ETL/ELT | **대응물** | cron sync 워커(Extract→Transform→Load=집계 upsert). Airflow/dbt 아님 |
| §10 Incremental Loading | **★준수** | synced_at/last_id 증분(CDC 유사) |
| §11~§13 Star/Snowflake/Fact/Dimension | **부분** | fact 유사(집계 테이블). 형식 dimensional modeling 아님 |
| §14 KPI | **★준수** | ROI/전환율/Retention/AI Usage 등·rollup. KPI 정의는 코드/대시보드 |
| §15 Dashboard(Role-Based) | **★준수** | 역할별 대시보드(프론트)·RBAC |
| §16 Report Engine | **부분 준수** | DataExport(csv/xlsx)·ReportBuilder. 템플릿/데이터 분리 부분 |
| §17 Real-Time | **부분** | SSE/폴링/rollup. Kafka/Redis Streams 아님(Part017/018) |
| §18 Batch Analytics | **★준수** | cron 배치(일/월 통계·정산·AI 데이터)·Scheduler 연계(Part019) |
| §19 Data Quality | **★강하게 준수(핵심경쟁력)** | ★V3 Trust(READY/WARNING/BLOCKED)·AnomalyDetection·Cross Validation·**수집≠사용**(신뢰도 미달=AI/자동화 제외) |
| §20~§21 Metadata/Lineage | **★준수** | 출처(Source/Credential/Sync/Quality/Trust) 기록·DATA 헌법 |
| §22 AI Analytics | **★강하게 준수** | Mmm(ROI frontier)·Attribution(markov)·Decisioning·DemandForecast·CustomerAI. ★근거/신뢰도 표시(V4 Explainable) |
| §23 Security | **★준수** | RBAC·PII 미저장(집계 코호트)·Masking·SecurityAudit |
| §24~§25 Monitoring/Logging | **부분** | SystemMetrics·cron 상태·error_log. Data Quality Score 부분·traceId 부재 |
| §26 Backup/Recovery | **부분** | 수동 DB 백업(Part015). Warehouse 전용 아님 |
| §27 성능(Partition/MatView/Aggregate/Cache) | **부분 준수** | ★Aggregate Table(rollup)·복합 인덱스. Partition/MatView 부재(Part009) |
| §28~§29 PHP/Claude(ETL Worker/Quality/Lineage/Raw 불변) | **★대체로 준수** | cron ETL·Trust 품질·출처 기록·가짜값 금지. Repository/OTel 미적용 |
| §30~§31 검증(etl:status 등) | **대상 없음** | artisan 없음. cron·Trust·rollup·`make quality` |

---

## 4. 확립된 표준 (신규 분석 코드가 따를 정본)

- **분석 저장 = MySQL rollup 집계 테이블**(`performance_metrics`·`channel_orders`·`*_agg`). 형식 DWH/Data Lake 신설 금지. **가짜값 주입 금지**(실데이터 0행=빈 상태 유지·208차).
- **ETL = cron sync 워커**(`*_sync_cron`)·**증분(`synced_at`/last_id)**. 전체 재적재 금지.
- ★**Data Quality = V3 Trust**(READY/WARNING/BLOCKED)·`AnomalyDetection`·**Cross Validation**(단일채널 불신·다소스 교차). ★**수집≠사용**(Fake/Bot/Spam/Fraud/Duplicate/Anomaly 검증 + Quality/Trust/Confidence 후에만 AI/자동화). 기존 `DataPlatform`/`AnomalyDetection`/`ModelMonitor` 확장(엔진 난립 금지).
- **Lineage/Metadata = 출처 기록**(Source/Credential/Sync/Quality/Trust·DATA 헌법). 모든 데이터 출처 추적.
- ★**정직 미산출**: 산출 불가=**null+사유**(0/임의값 금지·오독 방지·Mmm frontier `optimized:false`+사유·PriceOpt null/422). **SSOT 파생**(값 단일소스 실시간 일체화).
- **AI Analytics**: `Mmm`(ROI)·`AttributionEngine`·`Decisioning`·`DemandForecast` 확장(중복 엔진 금지). ★**근거/신뢰도 표시**(V4 Explainable·근거없는 결론 금지).
- **KPI/Report**: 역할별 대시보드·`DataExport`(csv/xlsx). PII 미저장(집계 코호트).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식 DWH/Data Lake(Snowflake/Redshift/BigQuery)·OLAP Cube·Airflow/dbt ETL** — 안 함. MySQL rollup 집계 + cron sync 가 정본. DW 도입=인프라 재설계.
2. **Star/Snowflake Schema·Dimension Table 형식 모델링** — 안 함. 집계 테이블(fact 유사)·Row-Level tenant 격리.
3. **Partition/Materialized View** — 안 함(Part009). rollup 테이블·복합 인덱스.
4. **Real-Time(Kafka/Redis Streams)·Data Lineage 시각화 도구** — 안 함. SSE/폴링·출처 기록(텍스트).
5. **OpenTelemetry/Data Quality Score 대시보드** — 부분. SystemMetrics·Trust 상태.

★**준수하는 실 원칙(강함)**: **SSOT·V3 Trust(수집≠사용)·출처 lineage·정직 미산출(null+사유)·증분 ETL·AI Analytics(Explainable)·가짜값 금지·PII 미저장(집계 코호트)·Cross Validation·단일 엔진(난립 금지)**.

---

## 6. Claude Code 구현 규칙

1. 분석=rollup 집계 테이블 확장. 형식 DWH/Data Lake/OLAP 신설 금지. **가짜값 주입 금지**(0행=빈 상태).
2. ETL=cron sync·**증분(synced_at)**. Raw 데이터 수정 금지·출처(Source/Credential/Sync/Quality/Trust) 기록.
3. ★**Data Quality=V3 Trust**(READY/WARNING/BLOCKED)·Cross Validation. **수집≠사용**(신뢰검증 후에만 AI/자동화). 기존 DataPlatform/AnomalyDetection 확장.
4. ★**정직 미산출=null+사유**(0/임의값 금지). SSOT 파생·값 단일소스 실시간 일체화.
5. AI 분석=Mmm/AttributionEngine/Decisioning 확장(중복 엔진 금지)·**근거/신뢰도 표시**(Explainable)·근거없는 결론 금지.
6. Snowflake/Airflow/dbt/OLAP/Star Schema 를 "명세에 있다"는 이유로 이식하지 않는다(rollup+Trust 유지).

---

## 7. Completion Criteria

- [x] 분석 스택 **실측**(DW도구 0·rollup 집계 560·cron ETL 7·V3 Trust 143·lineage 145·AI 분석 엔진)
- [x] 명세 §3~§31 **섹션별 매핑·판정**(DWH/Data Lake/OLAP/Airflow/dbt 부재 증명)
- [x] 실 분석(rollup·cron ETL·V3 Trust·lineage·정직 미산출·AI Analytics) 성문화(§4)
- [x] ★SSOT·Data Quality(V3 Trust·수집≠사용)·Lineage·AI Analytics(Explainable) 강준수 명시
- [x] 의도적 미적용 + 사유(§5) — DWH/OLAP/Airflow/Star Schema/Real-Time
- [x] Claude Code 규칙(§6) · `make quality` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 rollup 집계 + cron ETL + V3 Trust 품질 + 출처 lineage + 정직 미산출 분석 스택의 성문화이지 Snowflake/Airflow 이식이 아니다.

---

## 다음 Part

**CCIS Part027 — AI Model Lifecycle, MLOps & Model Governance** — ★사전 경고: 자체 ML 학습/MLOps(Feature Store/Model Registry/Drift/재학습) **부재**(MEA 057 AI Observability weak). AI=**외부 LLM(ClaudeAI gateway·053)** + 통계 모델(`Mmm` frontier·`AttributionEngine` markov·`DemandForecast`)·`ModelMonitor`(정본)·V3 Trust. Part027 도 실측→MLOps 부재증명→ClaudeAI gateway+통계모델+ModelMonitor 성문화(MLOps 이식 금지).
