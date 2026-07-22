# MEA Part 057 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 057 SPEC/ADR. ★부재증명 완료·과대주장 금지·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·정직 표기(**플랫폼 관측 실재 / AI 관측 부재**).
> ★**Part 046(Enterprise Observability) 판정 상속·재판정 금지**: "PARTIAL / ABSENT-formal(Distributed Tracing·중앙 로그·Metrics 플랫폼)". 본 Part는 그 위의 **AI 전용 계층**만 판정한다.
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★단어경계 `\b` 적용** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, `i18n/**`·`*.json` 제외): `ai_metric`/`ai_log`/`ai_trace`/`ai_health`/`ai_incident`/`ai_alert`/`ai_performance`/`ai_capacity`/`ai_observation`/`ai_operation`/`ai_baseline`/`ai_slo`/`ai_analytics`/`opentelemetry`/`otel`/`prometheus`/`grafana`/`jaeger`/`trace_id`/`span_id`/`distributed_trac`/`slo_`/`error_budget`/`incident_registry`/`postmortem`/`root_cause`/`capacity_planning`/`auto_scaling`/`aiops` = **전부 0**.
② **실 substrate 판독**: **`SystemMetrics`**(플랫폼 실측 메트릭·프로브 8·cronHealth)·**`Health::check`**·**`Compliance` SIEM 포워딩**·`connector_health`/`ingestion_run_log`(`Db`)·053 확정분(`ai_usage_quota`·`ai_analyses`·`ai_generate_log`)·052 확정분(`ModelMonitor` `ml_model_metrics`·건강도 집계)·046 확정분(`Alerting`·`AnomalyDetection`·`SecurityAudit`)·`backend/bin` cron **36개 파일**.
③ **동음이의 배제(오흡수 방지)**: `ai_event` 1히트=`tools/resolver_consumer_manifest.json`의 **i18n 키 참조**(`operations.ai_eventType`)이지 AI_EVENT 엔티티 아님 · `telemetry` 3히트=`frontend/src/auth/plans.js`(:7·:156·:207) **주석 내 "audit hook으로 telemetry 가능"**(가능성 언급이지 구현 아님) · `datadog` 4히트=**SIEM 포워딩 대상 벤더 나열**(`routes.php`:1112·`Compliance`:324·:401·`Audit.jsx`:320)이지 Datadog APM 연동 아님 · `connector_health`/`ingestion_run_log`=**데이터 커넥터 파이프라인 운영 상태**이지 **AI** Service Health 아님 · `/health`=**앱 헬스**이지 AI Health Monitoring 아님.

## 실존 substrate

### A. 플랫폼 관측·운영 (★실재 강함 · 단 AI 스코프 아님 · 046 상속)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **Metrics Collection(플랫폼)** | 모듈별 status(ok/degraded/down)·latency_ms·rpm·uptime·error_rate | `SystemMetrics`(:26·:78~110) | PARTIAL-strong |
| **★목데이터 금지 원칙(명문)** | "가상/목 데이터 절대 금지 — **측정 불가 값은 null 반환**"·"모든 모듈 status/latency는 실측만" | `SystemMetrics`(:15~19) | PARTIAL-strong |
| 프로브 8종 | database·phpRuntime·opcache·apcu·disk·tenants·migrations·self | `SystemMetrics`(:127·:155·:177·:219·:261·:292·:323·:353) | PARTIAL |
| **rpm/uptime/error_rate 실측** | APCu 카운터 기반(있을 때만·없으면 null) | `SystemMetrics::enrichWithCounters`(:423·:78) | PARTIAL |
| **cron 헬스** | 자동화 파이프라인 실행 가시화 | `SystemMetrics::cronHealth`(:372)·`backend/bin`(36 파일) | PARTIAL |
| 집계 요약 | ok_count·total·avg_latency_ms·total_rpm·error_rate | `SystemMetrics`(:88~105) | PARTIAL |
| **관측 API(공개+인증 분리)** | 무인증엔 민감정보 편집(회원·테넌트수·DB버전·cron상세·raw예외) | `SystemMetrics`(:33~40 isAuthed·:107~110)·`routes.php`(:1049~1050) | PARTIAL-strong |
| **Health Check** | status·memory(usage/peak/limit)·deploy marker·**DB probe connect_ms**·latest_migration | `Health::check`(:27~37·:50~52·:60~68·:84~87)·`routes.php`(:1032~1038) | PARTIAL-strong |
| **Log Collection(외부 전달)** | SIEM 포워딩 Splunk HEC/Datadog/범용 HTTPS·**5포맷**(ndjson/cef/leef/syslog/splunk_hec) | `Compliance::siemConfig`(:324)·`siemPush`(:401)·`routes.php`(:1113~1118) | PARTIAL |
| 실시간 포워딩(opt-in) | `realtime=1`+`min_severity`(기본 high)만 전송·비차단 best-effort | `Compliance`(:395~396·주석) | PARTIAL |
| **SIEM SSRF 가드** | https 강제·사설/예약 IP·메타데이터·`.local`/`.internal` 차단·**TOCTOU 재검사** | `Compliance::isSafeSiemUrl`(:405~425) | PARTIAL-strong |
| **SIEM 쓰기 권한 하드닝** | plan 게이트만으론 팀원이 감사로그 유출 가능 → **오너/플랫폼 admin 전용** | `Compliance`(:330~334) | PARTIAL-strong |
| 데이터 파이프라인 운영 로그 | `connector_health`(status·last_run_at·**failed_runs_24h**)·`ingestion_run_log`(started/ended·rows_ingested·error) | `Db`(:469~490)·`Risk`(:221·:244) | PARTIAL |
| 알림·이상탐지·불변감사 | `Alerting`·`AnomalyDetection`·`SecurityAudit` | (046 확정·재판정 금지) | PARTIAL |

### B. AI 전용 관측 (★부분적·매우 좁음)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **AI_USAGE(사용량 미터링)** | `ai_usage_quota`(tenant×date·**calls·tokens·img_calls**) | (053 확정·:529~539·:564~589) | PARTIAL-strong |
| **Token Analytics(원자료)** | input+output 토큰 누적·레코드별 tokens_used | (053 확정·:637~639·:662)·`ai_analyses`·`ai_generate_log` | PARTIAL |
| **Cost Analytics(통제측)** | 테넌트 일일 캡 3종+env 오버라이드·BYO 비대상 | (053 확정·:519~527·:592) | PARTIAL |
| AI 실행 성패 기록 | `ai_analyses.status`·`error_msg`·`model` | (053 확정·:469~502) | PARTIAL-weak |
| **AI_PERFORMANCE(모델측)** | `ml_model_metrics`(drift_score 시계열) | (052 확정·`ModelMonitor`:49~58) | PARTIAL-weak |
| **AI_HEALTH 유사(모델측)** | healthy/drifted/retraining 집계·needs_retrain | (052 확정·`ModelMonitor`:126·:134~136) | PARTIAL |
| Model Utilization 원자료 | `risk_prediction`(model_version별 예측 행) | (056 확정·`Db`:458~466) | PARTIAL-weak |

## 부재(ABSENT — 부재증명 완료·grep 0)
★**Canonical Entity 15종 중 AI 스코프 엔티티 전량**: AI_METRIC·AI_EVENT·AI_LOG·**AI_TRACE**·AI_HEALTH·**AI_INCIDENT**·**AI_ALERT**·AI_PERFORMANCE(형식)·**AI_CAPACITY**·AI_OBSERVATION·AI_OPERATION·**AI_BASELINE**·**AI_SLO**·AI_ANALYTICS(AI_USAGE만 실질 대응).
★**AI Observability(§8) 대부분**: **Distributed Tracing·Trace/Span**(046 확정 부재 승계·grep 0: trace_id/span_id/opentelemetry/jaeger)·**Service Dependency Mapping**·**SLO Monitoring**(grep 0: slo_/error_budget)·AI 전용 Real-time Dashboard.
★★**AI 관측의 근본 공백(핵심)**: **`SystemMetrics`의 프로브 8종에 AI 모듈이 없다**(database/phpRuntime/opcache/apcu/disk/tenants/migrations/self — `ClaudeAI`·LLM API·`ai_usage_quota`·모델 프로브 **전무**). 즉 **플랫폼은 관측되나 AI 서비스는 관측 대상이 아니다** — AI 호출의 **latency·error rate·가용성이 어디에도 집계되지 않는다**(`ai_analyses.status`는 2경로만·집계 없음).
★**AI Analytics(§9)**: Performance Analytics(AI)·**AI Adoption Analytics**·Model Utilization Analysis(형식)·**Executive Dashboard**·실시간+장기추세 분석기.
★**GPU 관련(§9 GPU Utilization·§11 GPU Capacity Planning)**: **GPU/클러스터/분산컴퓨팅 인프라 자체가 부재**(051 확정) — 미구현 기능이 아니라 **인프라 선행 종속**(정직 표기).
★**AI Incident Management(§10) 전면**: **Incident Registry**(★"모든 장애는 Incident Registry에 기록한다" **미충족**)·Incident Detection(AI)·**Root Cause Analysis**·Auto Classification·**Incident Escalation**·Recovery Tracking·Incident Dashboard·**Postmortem Management**(grep 0 전량).
★**AI Capacity Management(§11) 전면**: Resource Monitoring(AI)·CPU/Memory/Storage/Network를 **AI 워크로드 축으로** 보는 계층·**Auto Scaling Recommendation**·Capacity Forecasting(★단일호스트·`SystemMetrics`의 disk/memory 프로브는 **플랫폼 축**).
★**AI Operations Governance(§12)**: Monitoring/Alert/Incident/Capacity/SLO/Retention **Policy 객체**·Compliance Validation·AI 운영 Audit Trail(형식).
★**Runtime 규칙(§14)**: **Trace 생성**·AI Metric 수집·AI Health Check·AI Alert 평가·AI Event 생성 — 전부 부재.
★**API 표준(§15) 8종 전량**(Query AI Metrics/Logs/Traces·Register Incident·Query AI Health/Capacity/Analytics/Audit)·**Event 표준(§16) 8종 전량**(MetricCollected/HealthChecked/AlertTriggered/IncidentCreated/CapacityExceeded/PerformanceDegraded/RecoveryCompleted/OperationsAudited).
★**§17 AI 기능**: Predictive Incident Detection·**Intelligent Alert Correlation**·Capacity Forecasting·**Root Cause Recommendation**·Auto Scaling Recommendation·Performance Optimization(자동)·AI Operations Analytics.
★**Enterprise Telemetry Repository**(§6 "모든 운영 데이터는 Enterprise Telemetry Repository에서 관리" **근간 미충족**)·**장기 보존/Archive**(§7 "모든 운영 데이터는 장기 분석이 가능해야 한다" — `ai_usage_quota`는 일별 누적이나 **보존 정책·아카이브 없음**).
★**성능 SLA(§18)**: Metrics ≤10s·Log ≤5s·**Trace ≤500ms**·Alert ≤10s·**99.99% 가용성**=측정·보증 장치 부재(단일호스트·Part 044/045/050 승계).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ `SystemMetrics`의 **무인증 정보 편집**(:107~110)은 **259차 보안 확정분**이며 본 Part는 상태 기술만. ⓑ SIEM **오너 전용 쓰기**(:330~334)는 **283차 R2 P0-1 확정·수정 완료분**. ⓒ SIEM **SSRF 가드**(:405~425)는 **280차 P2 확정분**. ⓓ `ModelMonitor::retrain()` mt_rand 시뮬레이션=**052 확정·정직 표기분**.

## 판정
**PARTIAL-weak (플랫폼 관측·운영은 실재[046 상속] / ★AI 전용 관측·분석·장애·용량 계층 = 전면 ABSENT).**
★**실재(정직 인정·평가절하 금지)**: **플랫폼 축**에서는 `SystemMetrics`가 **모듈별 status/latency/rpm/uptime/error_rate를 실측**(:26·:78~110)하고 **프로브 8종**(:127~353)+**cron 헬스**(:372)를 집계하며, 무엇보다 **"가상/목 데이터 절대 금지 — 측정 불가 값은 null"**(:15~19)을 **코드 주석에 원칙으로 명문화**하고 실제로 null을 반환한다(★[[feedback_real_value_autoderive]] 준수 모범 사례). `Health::check`는 memory/deploy marker/**DB connect_ms**/latest_migration을 반환하고(:27~37·:84~87), **SIEM 포워딩**(Splunk HEC/Datadog/범용 HTTPS·5포맷·realtime opt-in·**SSRF 가드**:405~425·**오너 전용 쓰기**:330~334)이 감사 이벤트를 외부 관측 스택으로 실제 전달한다. `connector_health`/`ingestion_run_log`(`Db`:469~490)가 데이터 파이프라인 운영 상태를 남긴다. **AI 축**에서는 `ai_usage_quota`(calls/tokens/img_calls·053)가 **실 사용량·토큰 미터링**을 수행하고 `ml_model_metrics`·`ModelMonitor` 건강도 집계(052)가 모델 상태를 부분 관측한다.
★**부재(grep 0·부재증명 완료·축소 금지)**: **AI 스코프 Canonical Entity 전량**·Distributed Tracing/Trace·Service Dependency Mapping·**SLO/Error Budget**·**Incident Registry·RCA·Postmortem·Escalation**·**AI Capacity(Auto Scaling·Forecasting)**·AI Adoption/Executive Analytics·Operations Policy 객체·Runtime 5규칙·**API 8종·Event 8종**·Enterprise Telemetry Repository·장기 보존/Archive·성능 SLA.
★★**핵심 공백(정직 기술)**: **`SystemMetrics` 프로브 8종에 AI 모듈이 없다** — `ClaudeAI`·LLM API·`ai_usage_quota`·모델을 프로브하지 않으므로 **AI 호출의 latency·error rate·가용성이 어디에도 집계되지 않는다**. 이는 **056에서 확정한 "AI 활동 추적의 구멍"과 같은 뿌리**이며, **053 ADR D-2 Gateway 일원화가 이뤄지면 단일 통과점에서 자동 계측**된다(구조적 해결).
★**오흡수 금지**: `SystemMetrics`/`Health`(플랫폼 관측)≠**AI** Observability · `connector_health`/`ingestion_run_log`(데이터 커넥터 파이프라인)≠**AI** Service Health · `Alerting`(마케팅 성과 알림·046)≠AI 운영 알림/AI_INCIDENT · `AnomalyDetection`(데이터 이상·046)≠AI 장애 탐지 · cron 36개≠AI Operations Automation · `ai_usage_quota`(비용 캡)≠AI Analytics 엔진 · **`datadog` 4히트=SIEM 포워딩 대상 벤더 나열이지 APM 연동 아님** · **`telemetry` 3히트=`plans.js` 주석 내 "telemetry 가능"(가능성 언급·구현 아님)** · **`ai_event` 1히트=i18n 키 참조**(`operations.ai_eventType`) · `/health`(앱 헬스)≠AI Health Monitoring · `SystemMetrics` disk/memory 프로브(플랫폼 축)≠AI Capacity Management. 코드 변경 0.
