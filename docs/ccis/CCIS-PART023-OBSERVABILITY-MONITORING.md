# GeniegoROI Claude Code Implementation Specification

# CCIS Part023 — Observability, Monitoring, Telemetry & Operations Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Observability·Monitoring·Telemetry·운영 표준을 수립한다.

> ★**성격(Part001~022 과 동일)**: 사용자가 Part023 명세(OpenTelemetry·Prometheus·Grafana·Loki·Jaeger/
> Tempo·Alertmanager·SLI/SLO/SLA·Distributed Tracing)를 제공했으나 **그대로 따르지 않았다.** 실측 결과
> **OTel/Prometheus/Grafana/Loki/Jaeger 는 부재**하나, 실 관측은 **`SystemMetrics`(정직 미산출 null+사유)
> + `Compliance` SIEM 포워더 + `Alerting` + Health(`/healthz`) + `error_log` + rollup 비즈니스 지표**로
> 실재한다. ★명세 §3 "**Metrics Before Guessing·Everything is Measurable**"은 이 저장소의 **정직 미산출
> 문화**(측정 불가 시 0/임의값 아닌 null+사유)와 정합한다. Part001 §4 에 따라 **실측 → OTel 부재 증명
> → 실 관측 스택 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 Observability 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| OpenTelemetry | Trace/Metrics/Log Exporter | **부재**(0) |
| Prometheus/Grafana/Loki/Jaeger/Tempo | 수집·시각화·추적 | **전부 부재**(0) |
| Metrics(System) | 시계열 | ★**`SystemMetrics`(9 프로브·probeAi 등)** — ★**정직 미산출**(측정 불가=`{measurable:false, reason}`·null·0 아님) |
| Business Metrics | Reward/ROI/AI 등 | ★**rollup/KPI 집계(423)** — `performance_metrics`·`channel_orders` 대시보드(비즈니스 관측) |
| Logs | Structured JSON | **`error_log()`**(Part013·JSON 아님)·SIEM 포워딩 |
| SIEM | 중앙 로그 | ★**`Compliance` SIEM 포워더(64)** — 로그 전달 |
| Alerting | Actionable Alert | ★**`Alerting`**(executeAction·`action_request` 14·289차 실집행 배선). `NotifyEngine`·`Notification` |
| Health Check | Liveness/Readiness/Dependency | ★**`/healthz`·`/health`(200)** — 본 세션 curl 확인. Db 폴백 포함 |
| Trace/Span/Distributed Tracing | Trace ID 전파 | **미미**(traceId/correlation 6). 분산 추적 부재 |
| SLI/SLO/SLA | 지표·계약 | **부분** — availability/uptime 표시(UI·498은 대부분 대시보드 문구). 형식 SLO 인프라 아님 |
| Incident/Runbook/Postmortem | 운영 | **`NEXT_SESSION.md`(세션 인계·사후분석)·CLAUDE.md 트랩·docs**. 형식 Runbook 부분 |
| Synthetic Monitoring | 사용자관점 테스트 | ★**E2E smoke**(login+엔드포인트·Part014)·본 세션 playwright 라이브 검증 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Observability First/Metrics Before Guessing/Measurable/Actionable Alert/Low Noise) | **★부분 준수(문화 정합)** | ★Metrics Before Guessing·Everything Measurable=**정직 미산출**(null+사유)·SSOT·근본원인 분석(285차). Distributed Tracing·Correlation 은 미흡 |
| §4~§5 Observability Architecture/Telemetry(3-pillar) | **부분** | OTel 3-pillar 아님. Metrics(SystemMetrics)·Logs(error_log)·Traces(미미) 분리·비연결 |
| §6~§8 Metrics/App/Business | **부분 준수** | SystemMetrics(system)·rollup(business). 시계열 DB 아님(DB 집계) |
| §9 Structured Logging(JSON/Trace ID) | **미적용** | error_log 자유형식·JSON 0·traceId 미미(Part013) |
| §10~§11 Trace/Span | **미적용** | 분산 추적 부재 |
| §12~§13 OpenTelemetry/Collector | **미적용** | 부재 |
| §14~§17 Prometheus/Grafana/Loki/Jaeger | **미적용(대응물)** | 전부 부재. rollup 대시보드·SystemMetrics·Compliance SIEM 이 부분 대응 |
| §18 Health Check | **★준수** | `/healthz`·`/health`(200)·Db 폴백. Liveness/Readiness 구분은 없음(k8s 미사용·Part016) |
| §19 Synthetic Monitoring | **★부분 준수** | E2E smoke·라이브 playwright(본 세션 401 게이트 검증) |
| §20~§21 Alerting/Alertmanager | **부분 준수** | `Alerting`(executeAction·289차)·Slack/Webhook 부분. Alertmanager 아님 |
| §22~§24 SLI/SLO/SLA | **부분** | availability 표시·부분. 형식 SLO/에러버짓 아님 |
| §25~§26 Incident/Runbook | **부분(대응물)** | NEXT_SESSION 인계·사후분석·CLAUDE.md 트랩 레지스트리·memory FP 레지스트리. 형식 Runbook 부분 |
| §27 Dashboard | **부분 준수** | 역할별 대시보드(Executive/Ops/AI/Business·프론트). Grafana 아님 |
| §28~§29 PHP/Claude(OTel SDK/Monolog/traceId/Health) | **부분** | Health·SystemMetrics. OTel/Monolog/traceId 미적용(Part013) |
| §30~§31 검증(otelcol/promtool) | **대상 없음** | OTel/Prometheus 없음. Health curl·SystemMetrics·make quality |

---

## 4. 확립된 표준 (신규 관측 코드가 따를 정본)

- **Metrics = `SystemMetrics` 프로브**(단일 정본·중복 신설 금지). ★**측정 불가 시 `{measurable:false, reason}`·null**(0/임의값 금지 — 0은 "정상"으로 오독). 정직 미산출 5+연속 승계(057·058·059).
- **Business 관측 = rollup 집계**(`performance_metrics`·`channel_orders`·대시보드). 가짜값 주입 금지(실데이터 0행이면 빈 상태 유지).
- **Logs = `error_log()`** + `Compliance` SIEM 포워딩. ★민감정보 로그 금지(Part012/013).
- **Alert = `Alerting`**(executeAction·`action_request` 생산·289차 실집행)·`NotifyEngine`. ★가짜 집행 금지(action_request 생산자 실재 확인·287차).
- **Health = `/healthz`·`/health`**(200·Db 폴백). 배포 후 확인.
- **Synthetic = E2E smoke + 라이브 playwright**(캐시버스터·본 세션 정합).
- **Incident/Runbook = `NEXT_SESSION.md`**(인계·사후분석)·CLAUDE.md 트랩·memory 레지스트리(FP/구현이력).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **OpenTelemetry·Prometheus·Grafana·Loki·Jaeger·Alertmanager·Distributed Tracing** — 안 함. 관측 인프라 부재(Part016 서버직접). SystemMetrics·SIEM·Alerting·rollup·Health 로 대응. 도입=인프라 재설계.
2. **traceId/Correlation ID·JSON 구조화 로깅** — 안 함(Part013). error_log·상태 컬럼.
3. **형식 SLI/SLO/SLA·에러버짓** — 안 함. availability 표시 부분. 형식 SLO 미도입.
4. **형식 Runbook·Postmortem 템플릿** — 부분. NEXT_SESSION 인계·트랩/FP 레지스트리로 대응.

★**준수하는 실 원칙(강함)**: ★**Metrics Before Guessing·Everything Measurable=정직 미산출**(null+사유)·SSOT·근본원인 분석(285차)·Health·Synthetic(E2E/라이브)·Alert 실집행(가짜 금지)·rollup 실데이터(가짜값 금지).

---

## 6. Claude Code 구현 규칙

1. Metrics=`SystemMetrics` 확장(중복 신설 금지). ★**측정 불가=null+사유**(0/임의값 금지·오독 방지).
2. Business=rollup 집계·**실데이터 0행이면 빈 상태 유지**(가짜값 주입 금지·208차).
3. Alert=`Alerting`(executeAction 실집행·action_request 생산자 확인·가짜 집행 금지·287차). 민감정보 로그 금지.
4. Health=`/healthz`. 배포 후 확인. Synthetic=E2E smoke·라이브 playwright(캐시버스터).
5. 관측 변경은 근본원인 실측(285차식)·추측 금지(Metrics Before Guessing).
6. OTel/Prometheus/Grafana/traceId/SLO 인프라를 "명세에 있다"는 이유로 이식하지 않는다(인프라 결정).

---

## 7. Completion Criteria

- [x] Observability **실측**(OTel 0·SystemMetrics 9 프로브 정직 미산출·Compliance SIEM 64·Alerting·Health·rollup 423)
- [x] 명세 §3~§31 **섹션별 매핑·판정**(OTel/Prometheus/Grafana/Loki/Jaeger/SLO 부재 증명)
- [x] 실 관측(SystemMetrics 정직 미산출·SIEM·Alerting·Health·rollup·Synthetic) 성문화(§4)
- [x] ★Metrics Before Guessing=정직 미산출 문화 정합·Health·Synthetic·Alert 실집행 준수 명시
- [x] 의도적 미적용 + 사유(§5) — OTel/Prometheus/traceId/SLO
- [x] Claude Code 규칙(§6) · `make quality` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 SystemMetrics(정직 미산출)+SIEM+Alerting+Health+rollup 관측의 성문화이지 OTel/Prometheus 이식이 아니다.

---

## 다음 Part

**CCIS Part024 — Multi-Tenant Architecture & SaaS** — ★사전 경고: ★멀티테넌트=이 저장소 **최강 원칙**(헌법 "테넌트 격리 절대"·`tenant_id` 3094·`X-Tenant-Id`·전 쿼리 격리). 격리=**Row-Level(앱레벨 WHERE)**(RLS/Schema/DB-level 아님·Part009). Subscription/Billing=`PlanPolicy`·Paddle·`api_key`. ★act-as tenant 하이재킹 트랩 주의. Part024 는 실측→매핑→실 갭 있으면 수정(격리는 게이트 가치 최상).
