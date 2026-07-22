# MEA Part 057 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = AI Analytics/Observability/Operations 계층 신설이 기존 **플랫폼 관측**(`SystemMetrics`·`Health`)·**로그 외부전달**(`Compliance` SIEM)·**알림/이상탐지**(`Alerting`·`AnomalyDetection`)·**불변 감사**(`SecurityAudit`)·**모델 모니터링**(`ModelMonitor`)·**사용량 미터링**(`ai_usage_quota`)·**파이프라인 운영로그**(`connector_health`·`ingestion_run_log`)·**cron 36**과 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4 단일 Intelligence Layer. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 046(Observability) 판정 상속·재판정 금지** — 본 Part는 **AI 전용 계층**만 다룬다(056 cross-cutting 규율 승계).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| **Observability 정본**(Metrics·Log·Alert·Health·Audit) | ★**MEA Part 046**(`Alerting`·`AnomalyDetection`·`ModelMonitor`·`/health`·`Rollup`·`SecurityAudit`) | ★**재정의 금지·재판정 금지** |
| GPU/클러스터/분산컴퓨팅 인프라 | ★MEA Part 051(**부재 확정**) | ★재판정 금지(§9/§11 GPU는 **인프라 선행 종속**) |
| 모델 드리프트·재학습·ml_model_metrics | ★MEA Part 052(`ModelMonitor`) | ★재정의 금지·재사용 |
| 토큰 미터링·quota·AI 실행 로그 | ★MEA Part 053(`ai_usage_quota`·`ai_analyses`·`ai_generate_log`) | ★재정의 금지·재사용 |
| cron 37종·워크플로 엔진 | ★MEA Part 054(`backend/bin`·`JourneyBuilder`) | ★재정의 금지(cron≠AI Operations) |
| **AI 감사·거버넌스·Trust** | ★MEA Part 056(`SecurityAudit` 확장·AI_AUDIT) | ★재정의 금지(**AI 관측 로그와 감사 체인 분리**) |
| 가용성·인프라·SLA | ★MEA Part 044/045/050 | ★재정의 금지(99.99% 미보증 승계) |
| 테넌트·RBAC·암호화 | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |
| API Gateway | ★MEA Part 042 | ★재정의 금지 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 관측/알림/감사 엔진 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Metrics Collection | 플랫폼 실측 메트릭 | `SystemMetrics`(:26·:78~110) | ★재사용·승격·★오흡수 금지(**플랫폼 축≠AI 축**) |
| **목데이터 금지 원칙** | "측정 불가 값은 null 반환" | `SystemMetrics`(:15~19) | ★**재사용(모범 선례·AI 지표에도 동일 적용 필수)** |
| Health Monitoring | 앱 헬스·DB probe | `Health::check`(:27~37·:84~87) | ★재사용·★오흡수 금지(앱 헬스≠AI Health) |
| AI_HEALTH | 모델 건강도 집계 | `ModelMonitor`(:126·:134~136·052) | ★재사용(중복 모델 감시 금지) |
| Log Collection | SIEM 포워딩(Splunk/Datadog/HTTPS·5포맷) | `Compliance`(:324·:401·`routes.php`:1113~1118) | ★재사용(중복 포워더 금지) |
| APM 연동 | `datadog` 4히트 | `routes.php`(:1112)·`Compliance`(:324·:401)·`Audit.jsx`(:320) | ★**오흡수 금지**(SIEM 대상 **벤더 나열**이지 APM 계측 아님) |
| Telemetry | `plans.js` 주석 | `frontend/src/auth/plans.js`(:7·:156·:207) | ★**오흡수 금지**("telemetry **가능**" = 가능성 언급·구현 0) |
| AI_EVENT | i18n 키 참조 | `tools/resolver_consumer_manifest.json`(:4732 `operations.ai_eventType`) | ★**오흡수 금지**(라벨 키≠이벤트 엔티티) |
| AI_USAGE / Token Analytics | `ai_usage_quota`(calls·tokens·img_calls) | (053·:529~539·:564~589) | ★재사용·승격(중복 사용량 테이블 금지) |
| Cost Analytics | 일일 캡·env 오버라이드·BYO 비대상 | (053·:519~527·:592) | ★재사용·★오흡수 금지(**비용 통제≠비용 분석 엔진**) |
| AI_PERFORMANCE | `ml_model_metrics` drift 시계열 | (052·`ModelMonitor`:49~58) | ★재사용 |
| AI Service Health | `connector_health`(status·failed_runs_24h) | `Db`(:469~478)·`Risk`(:221) | ★**오흡수 금지**(데이터 커넥터 상태≠AI 서비스 상태) |
| Operations 실행 로그 | `ingestion_run_log`(started/ended·rows·error) | `Db`(:480~490)·`Risk`(:244) | ★재사용·★오흡수 금지(수집 파이프라인≠AI 오퍼레이션) |
| AI_ALERT | 마케팅 성과 알림 | `Alerting`(046 확정) | ★재사용·★오흡수 금지(성과 알림≠AI 운영 알림) |
| AI_INCIDENT | 데이터 이상 탐지 | `AnomalyDetection`(046 확정) | ★오흡수 금지(데이터 이상≠AI 장애) |
| AI Operations Automation | cron 36개 파일 | `backend/bin`·`SystemMetrics::cronHealth`(:372) | ★재사용·★오흡수 금지(배치 스케줄≠AIOps 자동화) |
| Immutable Audit | 해시체인 정본 | `SecurityAudit`(046/056 확정) | ★재사용(정본 하나·중복 체인 금지) |
| Telemetry 암호화 | `Crypto` AES-256-GCM | (049) | ★재사용 |
| 관측 API 노출 통제 | 무인증 민감정보 편집 | `SystemMetrics`(:33~40·:107~110) | ★재사용(**신규 AI 관측 API에 동일 적용 필수**) |

## ★★신설 시 발생할 내부 중복 — 사전 차단
1. **메트릭 수집기 이원화 금지**: AI 메트릭을 별도 수집기로 만들면 `SystemMetrics`와 두 개의 진실. **`SystemMetrics`에 AI 프로브(모듈)를 추가**하는 것이 정본 경로(현재 프로브 8종에 AI 없음).
2. **로그 포워더 이원화 금지**: AI 로그 외부 전달은 **`Compliance` SIEM 포워딩 재사용**(5포맷·SSRF 가드·오너 전용 쓰기 이미 완비). 별도 포워더 신설 시 **SSRF/권한 하드닝을 다시 구현해야 하고 누락하면 감사로그 유출**.
3. **알림 경로 이원화 금지**: AI_ALERT는 `Alerting` 확장(046 정본). 중복 알림 엔진 신설 금지.
4. **감사 체인 이원화 금지**: 운영 로그(§13 "위변조 방지")는 **`SecurityAudit` 정본 하나**(056 D-3와 동일 결정). ★단 **관측 로그(대용량·고빈도)를 감사 체인에 넣으면 체인이 붕괴**하므로 **스코프 분리**(감사=보안/거버넌스 이벤트, 관측=메트릭/로그) 후 참조로 연결.
5. **사용량 테이블 이원화 금지**: AI Analytics는 `ai_usage_quota`·`ai_analyses`·`ai_generate_log`·`ml_model_metrics` **파생**. 새 집계 테이블은 **머티리얼라이즈드 뷰 성격**으로만.

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. 플랫폼 관측·로그 포워딩·알림·이상탐지·감사·모델 모니터링·사용량 미터링 substrate가 **전부 실재** → **중복 신설 금지·기존 심화**. 헌법 V4.
- ★★[[feedback_real_value_autoderive]]: **`SystemMetrics`의 "가상/목 데이터 절대 금지 — 측정 불가 값은 null"(:15~19)은 본 저장소 최고 수준의 준수 선례**다. **신규 AI 지표(latency·error rate·adoption·capacity)에도 동일 원칙을 강제**하고, 측정 불가 시 **0이 아니라 null**을 반환할 것(0은 "정상"으로 오독됨).
- ★[[feedback_minimize_new_menus]]: AI Performance/Executive Dashboard는 신규 사이드바가 아니라 **기존 관리자 운영 콘솔**(`Admin.jsx`·`/v424/system/metrics` 소비처) 편입 우선.
- ★[[feedback_no_regression_value_unification]]: **목데이터 금지 원칙·무인증 정보 편집·SIEM SSRF 가드·오너 전용 쓰기·quota 캡**은 약화 시 즉시 회귀. **후퇴 금지 자산.**
- ★[[feedback_competitive_gap_verify]]: Tracing·SLO·Incident Registry·Capacity·Event 8종 부재=grep 0 부재증명 완료. **동시에 실측 메트릭·헬스·SIEM 포워딩·사용량 미터링은 실재분으로 인정**(뭉뚱그린 감점 금지).
- ★[[feedback_audit_reference_past_fixes]]: `SystemMetrics` 무인증 편집(259차)·SIEM 오너 전용(283차 R2 P0-1)·SIEM SSRF 가드(280차 P2)·`retrain()` mt_rand(052)=**확정/수정 완료분** — 상태 기술만·재플래그 금지.
- ★[[reference_platform_growth_actas_tenant_hijack]]: AI 관측 데이터는 **테넌트 격리 절대**(테넌트별 토큰/비용/에러가 교차 노출되면 영업 정보 유출).
- ★[[reference_api_prefix_routing]]·053 D-5: 신규 관측 API는 `/api` 접두 동시 등재 + **인증 필수 접두 배치**(★`/v424/system/metrics`는 public bypass라 **핸들러가 직접 세션 검증**하는 방식:33~40 — 신규 API도 동일 수준 보장 필요).
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI는 승인 없이 운영 환경을 자동 변경하거나 장애 대응 정책을 임의 수정 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: **AI 메트릭=`SystemMetrics`에 AI 프로브 추가**(정본 경로) · AI 로그 외부전달=`Compliance` SIEM 재사용 · AI_ALERT=`Alerting` · AI_HEALTH(모델)=`ModelMonitor` · AI_USAGE/Token/Cost=`ai_usage_quota`+`ai_analyses`+`ai_generate_log` 파생 · AI_PERFORMANCE=`ml_model_metrics` · 운영 실행로그=`ingestion_run_log` 패턴 · cron 헬스=`SystemMetrics::cronHealth` · 불변 감사=`SecurityAudit`(스코프 분리) · 암호화=`Crypto` · 테넌트/RBAC=`Db`/`index.php`.
- **순신설(부재·grep 0)**: ★AI 스코프 Canonical Entity(AI_METRIC/EVENT/LOG/**TRACE**/HEALTH/**INCIDENT**/ALERT/PERFORMANCE/**CAPACITY**/OBSERVATION/OPERATION/**BASELINE**/**SLO**/ANALYTICS)·**Distributed Tracing**(046 부재 승계)·Service Dependency Mapping·**SLO/Error Budget**·**Incident Registry·RCA·Auto Classification·Escalation·Recovery Tracking·Postmortem**·**AI Capacity(Auto Scaling Recommendation·Forecasting)**·AI Adoption/Executive Analytics·Operations Policy 6종·**Enterprise Telemetry Repository**·장기 보존/Archive·Runtime 5규칙·**API 8종·Event 8종**·§17 AI 기능 7종.

## 판정
**중복 위험 高(플랫폼 관측·로그포워딩·알림·이상탐지·감사·모델 모니터링·사용량 미터링 substrate 전부 실재) + ★신설 시 발생할 내부 중복 5종 사전 차단.** ★핵심=**`SystemMetrics`**(실측 메트릭·프로브 8·cronHealth·**목데이터 금지 원칙**·무인증 정보 편집)·**`Health::check`**·**`Compliance` SIEM 포워딩**(5포맷·SSRF 가드·오너 전용)·`Alerting`/`AnomalyDetection`/`SecurityAudit`(046 정본)·`ModelMonitor`(052)·`ai_usage_quota`/`ai_analyses`/`ai_generate_log`(053)·`connector_health`/`ingestion_run_log`·cron 36·`Crypto`/`index.php`는 **재사용/승격**(★중복 수집기·포워더·알림·감사체인·사용량 테이블 신설 절대 금지=헌법 V4·정본 재구현 금지). 헌법 V4/V5·Part 042/044/045/**046**/047/048/049/**050~056**·EPIC 06-A **재정의 금지·재판정 금지**. 본 Part 고유 순신설=★AI 스코프 엔티티 15종·Distributed Tracing·SLO/Error Budget·Incident Registry/RCA/Postmortem·AI Capacity/Auto Scaling·AI Adoption/Executive Analytics·Telemetry Repository·Runtime 5규칙·API/Event 각 8종뿐(부재·grep 0·부재증명 완료). ★★**최우선 통합 경로**=**`SystemMetrics` 프로브 8종에 AI 모듈 추가**(현재 AI 미프로브 → AI latency·error·가용성 미집계) + **053 Gateway 일원화 시 단일 통과점 자동 계측**(056 D-4와 동일 뿌리·구조적 해결). ★오흡수 금지(**`datadog` 4히트=SIEM 벤더 나열≠APM 연동** · **`telemetry` 3히트=`plans.js` 주석 "telemetry 가능"≠구현** · **`ai_event` 1히트=i18n 키 참조** · `SystemMetrics`/`Health`(플랫폼)≠AI Observability · `connector_health`(커넥터)≠AI Service Health · `Alerting`(마케팅 알림)≠AI_INCIDENT · `AnomalyDetection`(데이터 이상)≠AI 장애 탐지 · cron 36≠AIOps 자동화 · quota 캡(비용 통제)≠Cost Analytics 엔진 · disk/memory 프로브(플랫폼 축)≠AI Capacity). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★AI의 운영 환경 자동 변경·장애 대응 정책 임의 수정 불가(V5+CHANGE_GATE).
