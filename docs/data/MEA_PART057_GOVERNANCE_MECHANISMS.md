# MEA Part 057 — Governance Mechanisms (§7~§17 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★`SystemMetrics`(실측 메트릭·프로브 8·cronHealth·**목데이터 금지 원칙**)·`Health::check`·`Compliance`(SIEM 포워딩·SSRF 가드·오너 전용)·`Alerting`/`AnomalyDetection`/`SecurityAudit`(046 정본)·`ModelMonitor`(052)·`ai_usage_quota`/`ai_analyses`/`ai_generate_log`(053)·`connector_health`/`ingestion_run_log`·cron 36·`Crypto`/`index.php` 재사용(★중복 수집기·포워더·알림·감사체인·사용량 테이블 신설 절대 금지=헌법 V4)·AI 스코프 엔티티/Tracing/SLO/Incident/Capacity 순신설·오흡수 금지·과대주장 금지·**부재 축소 금지**·**★★마케팅 AI/dev AI KEEP_SEPARATE**·Part 042/044/045/**046**/047~049/**050~056**·EPIC 06-A 상속.
> ★**Part 046(Observability) 판정 상속·재판정 금지** — 본 Part는 **AI 전용 계층**만 다룬다(056 cross-cutting 규율 승계).

## §7 AI Operations Lifecycle 거버넌스
Data Collection→Metric Aggregation→Health Analysis→Alert Detection→Incident Response→RCA→Performance Optimization→Capacity Planning→Continuous Improvement→Archive. 현행=**Data Collection 부분**(요청 시 프로브 8종 `SystemMetrics`:127~353·APCu 카운터 `enrichWithCounters`:423·`ingestion_run_log` 수집 실행 기록 `Db`:480~490)·**Metric Aggregation 부분**(summary ok_count/total/avg_latency_ms/total_rpm/error_rate :88~105)·**Health Analysis 부분**(status ok/degraded/down·`ModelMonitor` 건강도 052:134~136)·**Alert Detection 부분**(`Alerting` 046 정본). ★**Incident Response·RCA·Performance Optimization·Capacity Planning·Continuous Improvement·Archive**=순신설.
★★**§7 핵심 미충족**: "모든 운영 데이터는 **장기 분석이 가능**해야 한다" → **미충족**. `SystemMetrics`는 **요청 시점 스냅샷만 반환하고 시계열을 적재하지 않는다**(예외=`ai_usage_quota` 일별 누적·`ml_model_metrics` drift 시계열). **보존 정책·아카이브 부재**. ★Telemetry Repository 신설 시 **기존 일별 누적 테이블을 파괴하지 말고 상위 집계로 편입**(무회귀).

## §8 AI Observability 거버넌스
Metrics·Log·Trace Collection·Distributed Tracing·Service Dependency Mapping·Health Monitoring·SLO Monitoring·Real-time Dashboard. 현행=**Metrics Collection(플랫폼)**(:26·:78~110)·**Health Monitoring**(`Health::check` status/memory/deploy marker/**DB connect_ms**/latest_migration :27~37·:50~52·:84~87 + `SystemMetrics` 모듈 status/latency)·**Log Collection(외부 전달)**(SIEM Splunk HEC/Datadog/범용 HTTPS·**5포맷** ndjson/cef/leef/syslog/splunk_hec `Compliance`:324·:401·`routes.php`:1113~1118)·**Real-time Dashboard 부분**(`/v424/system/metrics`:1049~1050). ★**Trace Collection·Distributed Tracing·Service Dependency Mapping·SLO Monitoring**=순신설(046 부재 승계·grep 0).
★★**"모든 AI 서비스는 Observability 표준을 준수해야 한다" → 미충족(핵심 공백)**: **`SystemMetrics` 프로브 8종**(database:127·phpRuntime:155·opcache:177·apcu:219·disk:261·tenants:292·migrations:323·self:353)**에 AI 모듈이 없다** — `ClaudeAI`·LLM API·`ai_usage_quota`·모델이 관측 대상이 아니므로 **AI 호출의 latency·error rate·가용성이 어디에도 집계되지 않는다**.
★**정본 확장 경로**: **AI 메트릭 수집기를 새로 만들지 말고 `SystemMetrics`에 AI 프로브(모듈)를 추가**한다(별도 수집기=두 개의 진실). ★그때 **`SystemMetrics`의 무인증 정보 편집 패턴**(:33~40·:107~110)을 AI 지표에도 적용(테넌트 토큰·비용은 영업 정보).

## §9 AI Analytics 거버넌스
Performance·Usage·Cost·Token·GPU Utilization·Model Utilization·AI Adoption·Executive Dashboard. 현행=**Usage/Token Analytics 원자료 실재**(`ai_usage_quota` tenant×date·calls·tokens·img_calls 053:529~539·input+output 누적 :637~639·레코드별 tokens_used)·**Cost Analytics 통제측**(일일 캡 3종+env 오버라이드 :519~527·BYO 비대상 :592)·Model Utilization 원자료(`risk_prediction` model_version별 행 056·`ml_model_metrics` 052:49~58). ★**Performance Analytics(AI)·AI Adoption Analytics·Executive Dashboard·실시간+장기추세 분석기**=순신설.
★**GPU Utilization Analysis**=**GPU/클러스터 인프라 자체가 부재**(051 확정) → "미구현 기능"이 아니라 **인프라 선행 종속**으로 기술한다(정직 표기·부재 축소 금지·과대주장 금지 동시).
★★**설계 제약(최우선)**: 신규 AI 지표는 **`SystemMetrics`의 목데이터 금지 원칙**(:15~19 "가상/목 데이터 절대 금지 — **측정 불가 값은 null 반환**")을 **그대로 승계**한다. 특히 **측정 불가 시 0이 아니라 null**을 반환할 것 — **0은 "정상"으로 오독**되어 장애를 은폐한다([[feedback_real_value_autoderive]]). ★오흡수 금지: **비용 캡(통제)≠Cost Analytics(분석 엔진)** — 원자료는 있으나 추세·리포트 계층이 없다.

## §10 AI Incident Management 거버넌스
Alert Management·Incident Detection·RCA·Auto Classification·Escalation·Recovery Tracking·Dashboard·Postmortem. 현행=**전무**(grep 0: incident_registry/postmortem/root_cause). ★전 항목 순신설.
★★"**모든 장애는 Incident Registry에 기록**한다" → **Registry 자체 부재**.
★**설계 원칙(중복 차단)**: ⓐ 알림 경로는 **`Alerting` 재사용**(046 정본·중복 알림 엔진 신설 금지) ⓑ 승인이 필요한 대응(자동 복구·정책 변경)은 **`action_request` 정족수 재사용**(056 D-5) ⓒ Incident Registry는 **`SecurityAudit`과 스코프 분리** — **고빈도 관측 로그를 해시체인에 넣으면 체인이 붕괴**하므로 감사=보안/거버넌스 이벤트, 관측=메트릭/로그로 나누고 **참조로 연결**(056 D-3 정합).
★**오흡수 금지**: `Alerting`(마케팅 성과 알림)≠AI 운영 알림 · `AnomalyDetection`(데이터 이상)≠AI 장애 탐지 · `ingestion_run_log.error`(수집 실패)≠AI_INCIDENT.

## §11 AI Capacity Management 거버넌스
Resource Monitoring·GPU Capacity Planning·CPU/Memory/Storage/Network·Auto Scaling Recommendation·Cost Optimization. 현행=**Resource Monitoring 부분(플랫폼 축)**(disk `SystemMetrics`:261·memory `Health`:50~52·opcache:177·apcu:219)·Cost Optimization 부분(quota 캡·프롬프트 캐싱 053). ★**GPU Capacity Planning**(GPU 부재·051)·**Auto Scaling Recommendation**·**Capacity Forecasting**·AI 워크로드 축 자원 관측=순신설.
★★"AI 인프라는 **예측 기반으로 용량을 관리**한다" → **미충족**(단일호스트·Part 044/045/050 승계·예측 계층 없음). ★**오흡수 금지**: 플랫폼 disk/memory 프로브≠AI Capacity Management · **`DemandForecast`(Holt-Winters 상품 수요 예측)≠인프라 Capacity Forecasting**(046이 AIOps seed로 기술했으나 **축이 다름** — 재사용 시 알고리즘만 참조).

## §12 AI Operations Governance
Monitoring/Alert/Incident/Capacity/SLO/Retention Policy·Compliance Validation·Audit Trail. 현행=Audit Trail 부분(`SecurityAudit` 046/056)·Alert 임계 설정 부분(`Alerting` 046). ★**Policy 객체 6종·Compliance Validation**=순신설.
★**Retention Policy 주의**: 관측 데이터는 **고빈도·대용량**이라 보존 정책이 **비용·성능에 직결**된다. `MediaHost::gc`(055 자산 GC)는 **자산 회수**이지 관측 보존이 아니므로 재사용 대상이 아니며, 별도 설계가 필요하다(단 **GC 패턴은 참조 가능**).
★**SLO Policy**: `error_budget`·`slo_` grep 0 — SLO 도입 시 **§18 성능 요구(Metrics ≤10s·Log ≤5s·Trace ≤500ms·Alert ≤10s)를 SLO 정의의 출발점**으로 삼되, **현행은 수집 주기 개념 자체가 없어**(요청 시 pull) 측정 기반부터 신설해야 한다.

## §13 Data Security 거버넌스
Tenant Isolation·RBAC·Telemetry Encryption·Secure Log Storage·Immutable Audit Log·Audit Logging. 현행=**Tenant Isolation**(`connector_health`/`ingestion_run_log`/`ai_usage_quota` 전부 tenant 키·fail-closed 테넌트 해석 `Risk` 056:15~18)·**RBAC**(서버측 전역 writeGuard `index.php` 056:72~75)·**관측 API 노출 통제**(무인증 시 회원수·테넌트수·DB server_version·cron 상세·raw 예외 **편집** `SystemMetrics`:33~40·:107~110 — **259차 확정분**)·**Immutable Audit Log**(`SecurityAudit` 해시체인·056 확정)·**Secure Log Storage(외부 전달)**(SIEM **https 강제·사설/예약 IP·메타데이터·`.local`/`.internal` 차단·TOCTOU 재검사** `Compliance::isSafeSiemUrl`:405~425 — **280차 P2 확정분** / **오너·플랫폼 admin 전용 쓰기**:330~334 — **283차 R2 P0-1 확정분**: plan 게이트만 두면 팀원이 SIEM 엔드포인트를 공격자 주소로 바꿔 **조직 감사로그 전량 유출** 가능했음). ★**Telemetry Encryption**=`Crypto`(049) 재사용 가능하나 Telemetry 저장소 부재로 미적용·순신설.
★★"운영 로그는 **위변조 방지 정책**을 적용한다" → **패턴은 존재**(`SecurityAudit`)하나 **관측 로그에는 미적용**이며, **그대로 적용하면 안 된다**(고빈도 데이터가 해시체인에 유입되면 체인 검증 비용 폭증·붕괴). **스코프 분리 + 주기적 체크섬/앵커링** 방식으로 설계할 것.
★**테넌트 격리 절대**: AI 관측 데이터(테넌트별 토큰·비용·에러율)는 **교차 노출 시 영업 정보 유출**([[reference_platform_growth_actas_tenant_hijack]]).

## §14 Runtime 규칙 거버넌스
Metric 수집·Log 수집·Trace 생성·Health Check·Alert 평가·Event 생성·Audit 기록. 현행=**Metric 수집 부분**(요청 시 프로브·APCu 카운터)·**Log 수집 부분**(SIEM realtime opt-in·min_severity high)·**Health Check**(`Health::check`)·**Alert 평가 부분**(`Alerting` 046)·**Audit 기록 부분**(`SecurityAudit`). ★**Trace 생성·AI Metric 수집·AI Event 생성**=순신설.
★★**정직 표기**: 현행 메트릭은 **요청 시 즉석 계산(pull)**이며 **상시 수집(push)·시계열 적재가 아니다**. 따라서 §18 "Metrics 수집 ≤10초"·"Log 수집 지연 ≤5초"는 **수집 주기 개념 자체가 없어 현재 측정 불가**(미달이 아니라 **측정 기반 부재**·정직 구분).
★**후퇴 금지 자산**: 목데이터 금지 원칙(:15~19)·무인증 정보 편집(:107~110)·SIEM SSRF 가드(:405~425)·SIEM 오너 전용 쓰기(:330~334)·quota 캡(053)·테넌트 격리.

## §15 API 거버넌스 (8)
Query AI Metrics/Logs/Traces·Register Incident·Query AI Health/Capacity/Analytics Dashboard/Audit. 현행=Query AI Health 유사=**플랫폼 헬스**(`/v424/health`·`/health` `routes.php`:1032~1038)·Query Analytics Dashboard 유사=**플랫폼 메트릭**(`/v424/system/metrics`:1049~1050)·Query AI Audit 유사=`SecurityAudit`(056). ★나머지 5종=순신설.
★★**보안 주의(053 D-5 교훈 승계)**: `/v424/system/metrics`는 **index.php public bypass 경로**라 **핸들러가 직접 세션 토큰을 검증**하고(:33~40) 무인증에는 민감 정보를 편집한다(:107~110). **신규 AI 관측 API도 동일 수준을 보장**해야 하며, 아무 검증 없이 bypass 접두에 얹으면 **테넌트 비용·에러율이 무인증 노출**된다. `/api` 접두 변형 동시 등재 필수([[reference_api_prefix_routing]]).

## §16 Event 거버넌스 (8)
MetricCollected·HealthChecked·AlertTriggered·IncidentCreated·CapacityExceeded·PerformanceDegraded·RecoveryCompleted·OperationsAudited. 현행=HealthChecked 유사=`Health::check` 호출(**동기 응답**)·AlertTriggered 유사=`Alerting`(046). ★**Event 표준 8종 전부 순신설**(★HTTP 응답·DB write≠이벤트 버스 오흡수 금지·Part 046 Observability 정합·중복 이벤트 파이프라인 신설 금지).

## §17 AI Integration 거버넌스
Predictive Incident Detection·Intelligent Alert Correlation·Capacity Forecasting·Root Cause Recommendation·Auto Scaling Recommendation·Cost Optimization·Performance Optimization·AI Operations Analytics. 현행=**Cost Optimization 부분**(quota 캡·BYO 비대상·프롬프트 캐싱 053)·예측 알고리즘 seed(`DemandForecast` Holt-Winters — ★**상품 수요 예측**이지 인프라 용량 예측 아님·오흡수 주의). ★나머지 전부 순신설.
★★명세 §17 말미 **"AI는 승인 없이 운영 환경을 자동 변경하거나 장애 대응 정책을 임의로 수정하지 않는다" → 현행이 구조적으로 충족**: ⓐ**운영 환경을 변경하는 AI 경로 자체가 없다**(관측 계층은 **읽기 전용** — `SystemMetrics`/`Health`는 조회만·쓰기 없음) ⓑAI 액션은 **제안-only + HITL + 기본 approval + 킬스위치 종속**(054 D-2·056 D-7) ⓒ장애 대응 정책이 **코드/문서**라 AI가 수정할 대상이 없다. ★헌법 V5+`CHANGE_GATE`+배포 승인([[feedback_deploy_approval_mandatory]]). **★후퇴 금지 자산** — 향후 **Auto Scaling·자동 복구·자동 롤백·자동 알림정책 조정**을 도입한다면 **승인 게이트를 반드시 앞에 둔다**(무게이트 자동 운영 변경=명세 §17 + 헌법 V5 동시 위반).

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★**실 운영·관측 거버넌스**=**플랫폼 축**: `SystemMetrics`(모듈 status/latency/rpm/uptime/error_rate 실측·프로브 8종·cronHealth·집계 요약·**★목데이터 금지 원칙 명문화**·무인증 민감정보 편집)+`Health::check`(memory·deploy marker·**DB connect_ms**·latest_migration)+**SIEM 포워딩**(Splunk HEC/Datadog/범용 HTTPS·5포맷·realtime opt-in+min_severity·**SSRF 가드**·**오너 전용 쓰기**)+`connector_health`/`ingestion_run_log`+`Alerting`/`AnomalyDetection`/`SecurityAudit`(046 정본)+cron 36. **AI 축**: `ai_usage_quota`(calls/tokens/img_calls 미터링)+`ai_analyses`/`ai_generate_log`(실행 로그)+`ml_model_metrics`/건강도 집계(052)=**후퇴 금지 자산**. ★**AI 스코프 엔티티 15종 중 14종·Distributed Tracing·Service Dependency Mapping·SLO/Error Budget·Incident Registry/RCA/Auto Classification/Escalation/Recovery/Postmortem·AI Capacity(GPU·Auto Scaling·Forecasting)·AI Adoption/Executive Analytics·Operations Policy 6종·Enterprise Telemetry Repository·장기 보존/Archive·Runtime 3규칙·API 5종·Event 8종·§17 AI 기능 7종=순신설**(부재·grep 0·부재증명 완료·GPU/단일호스트 인프라 선행 종속=Part 044/045/050/051 승계). ★★**최우선 통합 경로**=**`SystemMetrics` 프로브 8종에 AI 모듈 추가**(현재 AI 미프로브 → AI latency·error·가용성 미집계) + **053 Gateway 일원화 시 단일 통과점 자동 계측**(056 D-4와 **같은 뿌리**·구조적 해결). ★★**설계 제약**=ⓐ**수집기 이원화 금지**(`SystemMetrics` 확장) ⓑ**포워더 이원화 금지**(`Compliance` SIEM 재사용·SSRF/권한 하드닝 재구현 시 누락 위험) ⓒ**알림 이원화 금지**(`Alerting`) ⓓ**감사 체인에 고빈도 관측 로그 유입 금지**(스코프 분리+앵커링) ⓔ**측정 불가 시 0이 아니라 null**(0은 정상으로 오독). ★오흡수 금지(`SystemMetrics`/`Health`(플랫폼)≠AI Observability·`connector_health`(커넥터)≠AI Service Health·`Alerting`(마케팅 알림)≠AI_ALERT/AI_INCIDENT·`AnomalyDetection`(데이터 이상)≠AI 장애·cron 36≠AIOps 자동화·**quota 캡(통제)≠Cost Analytics 엔진**·**`DemandForecast`(수요 예측)≠인프라 Capacity Forecasting**·플랫폼 disk/memory≠AI Capacity·**`datadog`=SIEM 벤더 나열≠APM**·**`telemetry`=`plans.js` 주석 "가능"≠구현**·**`ai_event`=i18n 키 참조**·`/health`≠AI Health·HTTP 응답≠이벤트 버스). 헌법 Volume 4/5·Part 042/044/045/**046**/047/048/049/**050~056**·EPIC 06-A 상속·**재판정 금지**·재감사 금지(259차 무인증 편집·280차 SSRF·283차 SIEM 오너전용·052 retrain mt_rand 확정분)·★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★AI의 운영 환경 자동 변경·장애 대응 정책 임의 수정 불가(V5+CHANGE_GATE).
