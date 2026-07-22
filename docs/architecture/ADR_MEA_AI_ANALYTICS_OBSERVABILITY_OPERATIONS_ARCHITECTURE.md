# ADR — MEA Part 057 Enterprise AI Analytics, AI Observability & AI Operations Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(**단어경계 `\b` 적용**)·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 046(Observability) 판정 상속·재판정 금지** — 본 Part는 그 위의 **AI 전용 계층**만 판정한다(056 cross-cutting 규율 승계).

## Context
MEA Part 057은 AI 서비스·ML·GenAI·Agent의 운영 상태를 실시간 분석·모니터링·운영하려 한다. GeniegoROI에는 **플랫폼 축 관측이 실제로 동작**한다: `SystemMetrics`가 모듈별 **status(ok/degraded/down)·latency_ms·rpm·uptime·error_rate**를 실측(:26·:78~110)하고 **프로브 8종**(database:127·phpRuntime:155·opcache:177·apcu:219·disk:261·tenants:292·migrations:323·self:353)+**cron 헬스**(:372)를 집계하며, `Health::check`가 memory·deploy marker·**DB connect_ms**·latest_migration을 반환한다(:27~37·:50~52·:84~87). **SIEM 포워딩**(Splunk HEC/Datadog/범용 HTTPS·5포맷·realtime opt-in+min_severity·**SSRF 가드**:405~425·**오너 전용 쓰기**:330~334)이 감사 이벤트를 외부 관측 스택으로 전달하고, `connector_health`/`ingestion_run_log`(`Db`:469~490)가 데이터 파이프라인 운영 상태를 남긴다. **AI 축**에서는 `ai_usage_quota`(calls/tokens/img_calls·053)·`ai_analyses`/`ai_generate_log`(053)·`ml_model_metrics`+건강도 집계(052)가 부분 관측을 제공한다.
반면 **AI 전용 관측·분석·장애·용량 계층은 전면 부재**: AI 스코프 Canonical Entity 15종 중 14종·Distributed Tracing·SLO/Error Budget·Incident Registry·AI Capacity·Telemetry Repository·API 8종·Event 8종(전부 grep 0·부재증명 완료).

## D-1 ★★핵심 공백 — `SystemMetrics`가 AI를 프로브하지 않는다
**결정**: 본 Part 최대 발견은 부재 목록이 아니라 **경계의 위치**다. `SystemMetrics`의 **프로브 8종에 AI 모듈이 없다** — `ClaudeAI`·LLM API·`ai_usage_quota`·모델을 프로브하지 않으므로 **AI 호출의 latency·error rate·가용성이 어디에도 집계되지 않는다**(`ai_analyses.status`/`error_msg`는 **2경로만**이고 집계 계층이 없다).
★즉 **플랫폼은 관측되나 AI 서비스는 관측 대상이 아니다**. 명세 §8 "모든 AI 서비스는 Observability 표준을 준수해야 한다"는 **미충족**이다.
★**이는 056에서 확정한 "AI 활동 추적의 구멍"과 같은 뿌리**이며, 053에서 확인된 **텍스트 LLM 호출 경로 2개 병존**이 근인이다 — 통과점이 여럿이면 계측 지점도 여럿이 되어 어느 것도 완전하지 않다.
★**정본 해결 경로**: ⓐ **`SystemMetrics`에 AI 프로브(모듈)를 추가**한다(별도 수집기 신설 금지=두 개의 진실) ⓑ **053 ADR D-2 Gateway 일원화가 이뤄지면 단일 통과점에서 latency/error/토큰이 자동 계측**된다(구조적 해결·056 D-4와 동일 결론).

## D-2 ★목데이터 금지 원칙은 저장소 최고 선례 — AI 지표에 그대로 승계
**결정**: `SystemMetrics`는 **"가상/목 데이터 절대 금지 — 측정 불가 값은 null 반환"**·"모든 모듈 status/latency는 실측만"·"rpm/uptime/errorRate 미측정 인프라에서는 null"을 **코드 주석에 원칙으로 명문화**(:15~19)하고 실제로 null을 반환한다(:141·:149·:166·:185·:196).
★이는 [[feedback_real_value_autoderive]]의 **저장소 내 최고 준수 사례**다. 신규 AI 지표(latency·error rate·adoption·capacity)에 **동일 원칙을 강제**한다.
★**특히 측정 불가 시 0이 아니라 null을 반환할 것** — **0은 "정상"으로 오독되어 장애를 은폐**한다(에러율 0%·지연 0ms는 "완벽"으로 읽힌다). Dashboard도 null을 "측정 불가"로 렌더해야 하며 0으로 대체 금지.

## D-3 ★수집기·포워더·알림 이원화 금지 (기존 정본 확장)
**결정**: ⓐ **메트릭 수집기**=`SystemMetrics` 확장(신설 금지) ⓑ **로그 외부 전달**=`Compliance` SIEM 재사용(신설 금지) — 별도 포워더를 만들면 **SSRF 가드**(:405~425 https 강제·사설/예약 IP·메타데이터·`.local`/`.internal` 차단·**TOCTOU 재검사**)와 **오너 전용 쓰기**(:330~334)를 **다시 구현해야 하고, 누락하면 조직 감사로그가 유출**된다(283차 R2 P0-1이 정확히 그 사고를 막은 수정) ⓒ **알림**=`Alerting` 확장(046 정본·중복 알림 엔진 금지) ⓓ **사용량 집계**=`ai_usage_quota`/`ai_analyses`/`ai_generate_log` **파생**(새 테이블은 머티리얼라이즈드 뷰 성격으로만).
★근거: 헌법 V4 단일 Intelligence Layer·[[feedback_no_duplicate_features]]·값 분산=회귀.

## D-4 ★감사 체인에 고빈도 관측 로그를 넣지 않는다 (스코프 분리)
**결정**: 명세 §13 "운영 로그는 **위변조 방지 정책**을 적용한다"의 패턴은 `SecurityAudit` **append-only 해시체인**(056 D-3 정본)이다. **그러나 그대로 적용하면 안 된다** — 관측 로그는 **고빈도·대용량**이라 해시체인에 유입되면 **체인 검증 비용이 폭증하고 사실상 붕괴**한다.
★**결정**: **스코프 분리** — 감사 체인=보안/거버넌스 이벤트(저빈도·고가치), 관측 저장소=메트릭/로그(고빈도)로 나누고 **참조로 연결**하며, 관측 로그의 무결성은 **주기적 체크섬/앵커링**(구간 해시를 감사 체인에 1건으로 앵커)으로 보장한다.
★**중복 감사 체인 신설은 여전히 금지**([[reference_menu_audit_log_not_tamper_evident]] — 체인 정본은 하나).

## D-5 ★"장기 분석 가능" 미충족 — 현행은 pull 스냅샷이지 시계열이 아니다
**결정**: 명세 §7 "모든 운영 데이터는 **장기 분석이 가능**해야 한다"·§6 "모든 운영 데이터는 **Enterprise Telemetry Repository**에서 관리"는 **미충족**이다. `SystemMetrics`는 **요청 시점 즉석 계산(pull) 스냅샷만 반환하고 시계열을 적재하지 않는다**(예외=`ai_usage_quota` 일별 누적·`ml_model_metrics` drift 시계열). **보존 정책·아카이브도 부재**.
★따라서 §18 성능 요구("Metrics 수집 ≤10초"·"Log 수집 지연 ≤5초")는 **미달이 아니라 측정 기반 자체가 부재**하다(수집 주기 개념이 없음) — **"미달"과 "측정 불가"를 구분해 기술**한다(정직 표기).
★Telemetry Repository 신설 시 **기존 일별 누적 테이블을 파괴하지 말고 상위 집계로 편입**한다(무회귀). **Retention은 비용·성능에 직결**되므로 정책을 먼저 정한다(`MediaHost::gc` 055는 **자산 회수**이지 관측 보존이 아님 — 패턴만 참조).

## D-6 ★AI Capacity·GPU는 "미구현"이 아니라 "인프라 선행 종속" (정직 구분)
**결정**: §9 GPU Utilization Analysis·§11 GPU Capacity Planning·Auto Scaling Recommendation은 **GPU/클러스터/분산컴퓨팅 인프라 자체가 부재**(051 확정)하고 **단일호스트**(044/045/050 승계)라서 성립하지 않는다. 이를 **"기능 미구현"으로 기술하면 부정확**하며 **"인프라 선행 종속"**으로 기술한다(부재 축소 금지 + 과대주장 금지 동시).
★**오흡수 금지**: `SystemMetrics`의 disk(:261)/memory(`Health`:50~52) 프로브는 **플랫폼 축**이지 AI Capacity가 아니다. **`DemandForecast`(Holt-Winters)는 상품 수요 예측**이지 **인프라 용량 예측**이 아니다(046이 AIOps seed로 기술했으나 축이 다름 — 알고리즘만 참조 가능).

## D-7 ★운영 자동 변경 금지는 현행이 구조적으로 충족 (정직 기술·후퇴 금지)
**결정**: 명세 §17 말미 "AI는 **승인 없이 운영 환경을 자동 변경**하거나 **장애 대응 정책을 임의로 수정**하지 않는다"는 **현행 설계가 구조적으로 충족**한다: ⓐ **관측 계층이 읽기 전용**이다(`SystemMetrics`·`Health`는 조회만·쓰기 경로 없음) ⓑ AI 액션은 **제안-only + HITL + 기본 approval + 킬스위치 종속**(054 D-2·056 D-7) ⓒ 장애 대응 정책이 **코드/문서**라 AI가 수정할 대상이 없다.
★**후퇴 금지 자산**. 향후 **Auto Scaling·자동 복구·자동 롤백·자동 알림정책 조정**을 도입한다면 **승인 게이트를 반드시 앞에 둔다**([[feedback_deploy_approval_mandatory]]).
★**API 보안**: `/v424/system/metrics`는 **index.php public bypass 경로**라 **핸들러가 직접 세션을 검증**하고(:33~40) 무인증에는 민감 정보를 편집한다(:107~110·259차 확정). **신규 AI 관측 API도 동일 수준을 보장**해야 하며, 검증 없이 bypass 접두에 얹으면 **테넌트 비용·에러율이 무인증 노출**된다(053 D-5 교훈)·`/api` 변형 동시 등재([[reference_api_prefix_routing]]).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL-weak** — 플랫폼 관측·운영은 실재(046 상속)하나 **AI 전용 관측·분석·장애·용량 계층은 전면 부재**.
- ★중복 금지 재사용: `SystemMetrics`(수집기 정본)·`Health::check`·`Compliance` SIEM(포워더 정본)·`Alerting`/`AnomalyDetection`/`SecurityAudit`(046 정본)·`ModelMonitor`(052)·`ai_usage_quota`/`ai_analyses`/`ai_generate_log`(053)·`connector_health`/`ingestion_run_log`·cron 36·`Crypto`/`index.php`.
- ★순신설: AI 스코프 엔티티 15종 중 14종·Distributed Tracing·Service Dependency Mapping·**SLO/Error Budget**·**Incident Registry·RCA·Auto Classification·Escalation·Recovery Tracking·Postmortem**·AI Capacity(인프라 선행)·AI Adoption/Executive Analytics·Operations Policy 6종·**Enterprise Telemetry Repository**·장기 보존/Archive·Runtime 3규칙·**API 5종·Event 8종**·§17 AI 기능 7종.
- ★오흡수 금지: `SystemMetrics`/`Health`(플랫폼)≠**AI** Observability · `connector_health`/`ingestion_run_log`(데이터 커넥터)≠AI Service Health · `Alerting`(마케팅 성과 알림)≠AI_ALERT/AI_INCIDENT · `AnomalyDetection`(데이터 이상)≠AI 장애 탐지 · cron 36≠AI Operations Automation · **quota 캡(비용 통제)≠Cost Analytics 엔진** · **`DemandForecast`(수요 예측)≠인프라 Capacity Forecasting** · 플랫폼 disk/memory 프로브≠AI Capacity · **`datadog` 4히트=SIEM 포워딩 대상 벤더 나열≠APM 연동** · **`telemetry` 3히트=`plans.js`(:7·:156·:207) 주석 내 "telemetry 가능"≠구현** · **`ai_event` 1히트=`resolver_consumer_manifest.json`(:4732) i18n 키 참조** · `/health`(앱 헬스)≠AI Health Monitoring · HTTP 응답·DB write≠이벤트 버스.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·AI의 운영 환경 자동 변경·장애 대응 정책 임의 수정 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 042/044/045/**046**/047/048/049/**050~056**·EPIC 06-A 상속·**재판정 금지**·재감사 금지(259차 무인증 편집·280차 SIEM SSRF·283차 SIEM 오너전용·052 retrain mt_rand 확정분).
