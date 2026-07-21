# ADR — MEA Part 046 Enterprise Observability, Monitoring & AIOps Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part046 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 046은 Observability, Monitoring & AIOps. ★**알림/이상탐지/AI 모니터링/헬스/AIOps seed는 실재이나 Distributed Tracing/중앙 로그/Metrics 플랫폼은 부재**: 실재=`Alerting`(alert_policies·threshold·escalation·actionPresets·audit·GT①)·`AnomalyDetection`(이상·GT①)·`ModelMonitor`(drift·Part 017·GT①)·`Health`(/health·render.mjs 무음 사망 281차·GT①)·`Rollup`(Business Metrics)·`SecurityAudit`(tamper-evident Audit Log)·`DemandForecast`(Capacity Forecast·AIOps)·`SupplyChain`(risk). ★부재(부재증명 완료·opentelemetry/prometheus/grafana/elk grep 0)=Distributed Tracing/중앙 로그/Metrics 플랫폼. 본 Part는 Developer(Part 041~045)/ROI(017)/Data(006) 상속(재정의 금지).

## 결정
- **D-1 (Part 041~045/017/006 재정의 금지):** DevSecOps(Part 043)·Service Mesh(Part 045·부재)·Forecast(Part 017)·DQM(Part 006)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (Alert Management = Alerting 승격·★중복 알림 절대 금지):** Alert Management = `Alerting`(alert_policies·/v418/alert_policies·threshold·escalation·actionPresets·audit). ★알림 정책 정본(289차 anon 차단·재구현 금지). ★중복 알림 신설 절대 금지(값 분산=회귀). 형식 Alert Management Service=`Alerting` 승격.
- **D-3 (Anomaly/AI Monitoring/AIOps = AnomalyDetection/ModelMonitor 승격):** Anomaly=`AnomalyDetection`·AI Monitoring=`ModelMonitor`(drift·Part 017/027)·Capacity Forecast=`DemandForecast`·Risk=`SupplyChain`·Predictive Failure=`ModelMonitor`. ★AIOps 정본(중복 이상탐지/예측 금지·Part 017 정합). 형식 AIOps Engine=승격(중복 엔진 금지).
- **D-4 (Distributed Tracing/중앙 로그/Metrics 플랫폼 = 부재·순신설):** ★Distributed Tracing(Trace/Span/Trace ID)=모놀리식·Part 045 mesh 부재로 tracing 대상 없음·**부재·순신설**·Centralized Log(ELK/Structured JSON)=순신설·Metrics Platform(Prometheus/Grafana)=순신설(부재증명 완료). ★현재 서버 로그/`Rollup` 사전집계는 형식 Metrics/Log 플랫폼 아님(오흡수 금지·과대주장 금지). Audit Log=`SecurityAudit`(구조화·tamper-evident).
- **D-5 (Security/AI = 헌법·No-PII 정합):** Tenant=`Db.php`·RBAC=`index.php`·★No-PII 집계(v418.1·로그 민감정보 배제)·Audit=`SecurityAudit`·자격증명 평문노출 회피. AI(장애 원인/이상/용량/SLA)=감사 세션/`AnomalyDetection`/`DemandForecast`/`SupplyChain`·Explainability=헌법 V4·★AI 운영 시스템 자동 재시작/서비스 정책 자동 변경 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Developer/ROI/Data Platform/헌법 상속·재정의 금지·Alert(`Alerting`)·Anomaly(`AnomalyDetection`)·AI Monitoring(`ModelMonitor`)·Health(`/health`)·Business Metrics(`Rollup`)·Audit Log(`SecurityAudit`)·Capacity(`DemandForecast`)·`SecurityAudit` 재사용(★중복 알림/이상탐지/AI 모니터링/감사로그 절대 금지·정본 재구현 금지·No-PII)·형식 Distributed Tracing/중앙 로그(ELK)/Metrics 플랫폼(Prometheus)/Incident Management만 신설(부재·모놀리식·마이크로서비스 전환 시·과대주장 금지). 실행은 tracing/log/metrics 플랫폼 도입 결정 종속.
