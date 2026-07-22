# MEA Part 057 — Enterprise AI Analytics, AI Observability & AI Operations Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(grep 0·**단어경계 적용**)·정직 표기(**플랫폼 관측 실재 / AI 관측 부재**·"미달"과 "측정 불가" 구분)·과대주장 금지·**부재 축소 금지**·오흡수 금지. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 046(Observability) 판정 상속·재판정 금지** — 본 Part는 **AI 전용 계층**만 판정(056 cross-cutting 규율 승계).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART057_AI_ANALYTICS_OBSERVABILITY_OPERATIONS_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19(verbatim) |
| 2 | ADR | `docs/architecture/ADR_MEA_AI_ANALYTICS_OBSERVABILITY_OPERATIONS_ARCHITECTURE.md` | 결정 D-1~D-7 |
| 3 | GT① EXISTING | `docs/data/MEA_PART057_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART057_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART057_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART057_GOVERNANCE_MECHANISMS.md` | §7~§17 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART057_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-weak (플랫폼 관측·운영은 실재[046 상속] / ★AI 전용 관측·분석·장애·용량 계층 = 전면 ABSENT).**
★★**본 Part 최대 발견(ADR D-1)**: 부재 목록이 아니라 **경계의 위치** — **`SystemMetrics`의 프로브 8종**(database:127·phpRuntime:155·opcache:177·apcu:219·disk:261·tenants:292·migrations:323·self:353)**에 AI 모듈이 없다**. `ClaudeAI`·LLM API·`ai_usage_quota`·모델을 프로브하지 않으므로 **AI 호출의 latency·error rate·가용성이 어디에도 집계되지 않는다**(`ai_analyses.status`/`error_msg`는 2경로만·집계 계층 없음). 즉 **플랫폼은 관측되나 AI 서비스는 관측 대상이 아니다** → 명세 §8 "모든 AI 서비스는 Observability 표준을 준수해야 한다" **미충족**. ★**056의 "AI 활동 추적 구멍"과 같은 뿌리**이며 근인은 **053의 텍스트 LLM 호출 경로 2개 병존**(통과점이 여럿이면 계측 지점도 여럿) → **053 ADR D-2 Gateway 일원화 시 단일 통과점에서 자동 계측**(구조적 해결).
★**실재(정직 인정·평가절하 금지)** — **플랫폼 축**: ① `SystemMetrics` 모듈별 **status(ok/degraded/down)·latency_ms·rpm·uptime·error_rate 실측**(:26·:78~110)+프로브 8종+**cron 헬스**(:372)+집계 요약(ok_count·avg_latency_ms·total_rpm·error_rate:88~105) ② **★★목데이터 금지 원칙 명문화** — **"가상/목 데이터 절대 금지 — 측정 불가 값은 null 반환"**·"모든 모듈 status/latency는 실측만"(:15~19)이 **코드 주석에 원칙으로 박혀 있고 실제 null이 반환된다**(:141·:149·:166·:185·:196) = [[feedback_real_value_autoderive]] **저장소 내 최고 준수 사례** ③ **무인증 민감정보 편집**(회원수·테넌트수·DB server_version·cron 상세·raw 예외 — 259차 확정·:33~40·:107~110) ④ `Health::check`(status·memory usage/peak/limit·deploy marker·**DB connect_ms**·latest_migration :27~37·:50~52·:60~68·:84~87·`routes.php`:1032~1038) ⑤ **SIEM 포워딩**(Splunk HEC/Datadog/범용 HTTPS·**5포맷** ndjson/cef/leef/syslog/splunk_hec·realtime opt-in+min_severity·**SSRF 가드** https 강제/사설·예약 IP/메타데이터/`.local`·`.internal` 차단/**TOCTOU 재검사**:405~425(280차)·**오너·플랫폼 admin 전용 쓰기**:330~334(283차 R2 P0-1: plan 게이트만 두면 팀원이 SIEM 주소를 바꿔 **조직 감사로그 전량 유출** 가능했음)) ⑥ `connector_health`(status·last_run_at·**failed_runs_24h**)/`ingestion_run_log`(started/ended·rows_ingested·error)(`Db`:469~490) ⑦ `Alerting`·`AnomalyDetection`·`SecurityAudit`(046 정본)·cron 36. — **AI 축**: ⑧ **`ai_usage_quota`**(tenant×date·**calls·tokens·img_calls**·053:529~539·:564~589)=AI_USAGE 실질 대응 ⑨ 토큰 원자료(input+output 누적 053:637~639·레코드별 tokens_used) ⑩ 비용 통제(일일 캡 3종+env·BYO 비대상 053:519~527·:592) ⑪ `ml_model_metrics` drift 시계열+건강도 집계(052:49~58·:126·:134~136).
★**ABSENT(grep 0·부재증명 완료·축소 금지)**: **AI 스코프 Canonical Entity 15종 중 14종**(AI_METRIC·AI_EVENT·**AI_TRACE**·AI_HEALTH(형식)·**AI_INCIDENT**·AI_ALERT(형식)·AI_PERFORMANCE(형식)·**AI_CAPACITY**·AI_OBSERVATION·AI_OPERATION(형식)·**AI_BASELINE**·**AI_SLO**·AI_ANALYTICS — **AI_USAGE만 실질 대응**) · **Distributed Tracing·Trace/Span**(046 승계·grep 0: trace_id/span_id/opentelemetry/jaeger) · Service Dependency Mapping · **SLO Monitoring/Error Budget** · **AI Incident Management 전면**(★"모든 장애는 **Incident Registry**에 기록" → **Registry 자체 부재** · RCA·Auto Classification·Escalation·Recovery Tracking·**Postmortem**) · **AI Capacity 전면** · AI Adoption/Executive Analytics·실시간+장기추세 분석기 · Operations Policy 6종·Compliance Validation · **Enterprise Telemetry Repository**(§6 근간 미충족) · **장기 보존/Archive** · Runtime 3규칙(Trace 생성·AI Metric 수집·AI Event 생성) · **API 5종·Event 8종** · §17 AI 기능 7종 · 성능 SLA(§18).
★**정직 구분 2건**: ⓐ **§7 "장기 분석 가능"·§6 Telemetry Repository 미충족** — `SystemMetrics`는 **요청 시점 즉석 계산(pull) 스냅샷만 반환하고 시계열을 적재하지 않는다**(예외=`ai_usage_quota` 일별 누적·`ml_model_metrics` drift 시계열)·보존 정책/아카이브 부재. 따라서 **§18 "Metrics 수집 ≤10초"·"Log 수집 지연 ≤5초"는 미달이 아니라 측정 기반 자체가 부재**(수집 주기 개념 없음). ⓑ **§9 GPU Utilization·§11 GPU Capacity Planning·Auto Scaling은 "기능 미구현"이 아니라 "인프라 선행 종속"** — GPU/클러스터/분산컴퓨팅 부재(051 확정)·단일호스트(044/045/050 승계).
★**오흡수 금지(동음이의 실측)**: `SystemMetrics`/`Health`(**플랫폼** 관측)≠**AI** Observability · `connector_health`/`ingestion_run_log`(**데이터 커넥터** 파이프라인)≠AI Service Health · `Alerting`(**마케팅 성과** 알림·046)≠AI_ALERT/AI_INCIDENT · `AnomalyDetection`(**데이터** 이상·046)≠AI 장애 탐지 · cron 36≠AI Operations Automation · **`ai_usage_quota` 비용 캡(통제)≠Cost Analytics 엔진**(원자료는 있으나 추세·리포트 계층 없음) · **`DemandForecast`(Holt-Winters 상품 수요 예측)≠인프라 Capacity Forecasting**(046이 AIOps seed로 기술했으나 **축이 다름**) · **플랫폼 disk/memory 프로브≠AI Capacity Management** · **`datadog` 4히트=SIEM 포워딩 대상 벤더 나열**(`routes.php`:1112·`Compliance`:324·:401·`Audit.jsx`:320)**≠APM 연동** · **`telemetry` 3히트=`frontend/src/auth/plans.js`(:7·:156·:207) 주석 내 "audit hook으로 telemetry 가능"**(가능성 언급·**구현 0**) · **`ai_event` 1히트=`tools/resolver_consumer_manifest.json`(:4732) i18n 키 참조**(`operations.ai_eventType`) · `/health`(앱 헬스)≠AI Health Monitoring · HTTP 응답·DB write≠이벤트 버스.
★**강점 정직 기술(후퇴 금지)**: 명세 §17 "AI는 **승인 없이 운영 환경을 자동 변경**하거나 **장애 대응 정책을 임의로 수정**하지 않는다"는 **현행이 구조적으로 충족** — ⓐ**관측 계층이 읽기 전용**(`SystemMetrics`·`Health`는 조회만·쓰기 경로 없음) ⓑAI 액션은 **제안-only+HITL+기본 approval+킬스위치 종속**(054 D-2·056 D-7) ⓒ장애 대응 정책이 **코드/문서**라 AI가 수정할 대상이 없다. 코드 변경 0.

## ★★핵심 설계 제약 5종 (구현 착수 시 필수)
1. **수집기 이원화 금지**(D-1·D-3) — AI 메트릭은 **`SystemMetrics`에 AI 프로브 추가**. 별도 수집기=두 개의 진실.
2. **포워더 이원화 금지**(D-3) — AI 로그 외부 전달은 **`Compliance` SIEM 재사용**. 별도 포워더는 **SSRF 가드·오너 전용 쓰기를 재구현해야 하고 누락 시 감사로그 유출**(283차가 막은 사고).
3. **감사 체인에 고빈도 관측 로그 유입 금지**(D-4) — **스코프 분리**(감사=보안/거버넌스 저빈도, 관측=메트릭/로그 고빈도) + **주기적 체크섬/앵커링**. 체인 정본은 하나([[reference_menu_audit_log_not_tamper_evident]]).
4. **측정 불가 시 0이 아니라 null**(D-2) — **0은 "정상"으로 오독되어 장애를 은폐**(에러율 0%·지연 0ms=완벽으로 읽힘). Dashboard도 null을 "측정 불가"로 렌더·0 대체 금지.
5. **신규 관측 API도 `/v424/system/metrics` 수준 보장**(D-7) — public bypass 경로면 **핸들러가 직접 세션 검증**(:33~40)+무인증 민감정보 편집(:107~110). 미보장 시 **테넌트 비용·에러율 무인증 노출**·`/api` 변형 동시 등재.
※ 부가: Telemetry Repository 신설 시 **기존 일별 누적 테이블 파괴 금지**(상위 집계로 편입·무회귀). Retention은 비용·성능 직결이므로 정책 선행.

## 상속·다음
- **상속**: **Part 046(Observability 정본·재판정 금지)** + **051~056 전체**(051 GPU 부재·052 ModelMonitor·053 quota/로그·054 cron/워크플로·056 감사/거버넌스) + 헌법 V4/V5 + `CHANGE_GATE` + Security(047~049) + 가용성(044/045/050) + API GW(042) + EPIC 06-A.
- **다음**: **MEA Part 058 — Enterprise AI Decision Intelligence & Autonomous Business Architecture**(명세 지정). ★예상 조사 후보=`Decisioning`(v418.1 집계·HITL·No-PII)·`AutoRecommend`·`AutoCampaign`·`Mmm`(frontier)·`RuleEngine`·`JourneyBuilder`(054 확정)·`agent_mode`(054/056 확정). ★**부재 예상은 반드시 grep 부재증명 후 판정**(053 선례 — 가설이 대부분 틀렸음). ★오흡수 사전 주의: `Decisioning`(광고 세그먼트 추천)≠Enterprise Decision Intelligence 플랫폼 · `AutoCampaign`(캠페인 자동화)≠Autonomous Business · `RuleEngine` 임계값≠Decision Model.

## ★AI Platform 진행 (Part 051~057)
Part 051 AI Foundation(PARTIAL) · 052 ML & MLOps(ABSENT-heavy) · 053 GenAI/LLM/Prompt(PARTIAL·**호출경로 2개 병존=Gateway 1순위 통합**) · 054 AI Agent(PARTIAL-strong·AI 시리즈 실재도 최고) · 055 Knowledge/Vector/RAG(PARTIAL-weak·**선행조건=테넌트 격리+Knowledge ACL**) · 056 AI Governance/Responsible AI/Model Risk(PARTIAL-weak·**"규범은 문서에 있고 기계 집행이 없다"**·**AI 활동 추적 구멍**) · **057 AI Analytics/Observability/Operations(★PARTIAL-weak — 플랫폼 관측 실재[목데이터 금지 원칙=최고 선례]·SIEM 포워딩·사용량 미터링 / ★★`SystemMetrics`가 AI를 프로브하지 않아 AI latency·error·가용성 미집계 / Tracing·SLO·Incident Registry·Capacity 전면 부재)** → 다음 **058 AI Decision Intelligence & Autonomous Business**.
★**AI 시리즈 3회 연속 동일 결론**: 053(Gateway 부재) → 056(AI 활동 추적 구멍) → 057(AI 미프로브)는 **모두 같은 뿌리**다. **053 ADR D-2 Gateway 일원화 + 감사·계측 통일**이 AI 시리즈 전체에서 **가장 반복적으로 지목된 단일 부채**이며 실 구현 1순위다.
