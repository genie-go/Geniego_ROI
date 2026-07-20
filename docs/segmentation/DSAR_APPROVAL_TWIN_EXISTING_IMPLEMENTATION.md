# DSAR — Authorization Digital Twin & Predictive Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> 본 문서는 Part 3-22 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/bin/`·`backend/src/routes.php`·`backend/composer.json`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: AdminPlans/Db/SecurityAudit/UserAuth/SystemMetrics/ClaudeAI 정독 + twin/mirror/replay/forecast/prediction/scenario/kafka grep. 2 Explore 스레드(42 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**authz Digital Twin 엔진(twin registry·sync pipeline·event-replay·predictive governance·what-if·capacity/AI forecast·twin snapshot)은 전면 부재(그린필드·grep 0)다.** 재사용 가능 원자만 존재: (a) SecurityAudit 해시체인(evidence + replay 소스)·(b) auth_audit_log 시간순 event stream·(c) guardTeamWrite write-PEP(twin write-guard 확장)·(d) dual-PDO env(Db)·(e) SystemMetrics(capacity baseline)·(f) ClaudeAI LLM(AI forecast infra). ★메시지 브로커(Kafka/Pulsar/EventBridge) composer.json **부재**. ★demo 형제 env·AdminPlans 미러=인접(별개 라이브 env·config 미러·**read-only event-replay twin 아님**·GT②).

- **★§19 Evidence PARTIAL = SecurityAudit**(`SecurityAudit.php:27`·`:56-67`·해시체인·twin snapshot 없음).
- **★§6 Replay 소스 PARTIAL = auth_audit_log/security_audit_log**(`UserAuth.php:4165`·시간순·append-only·replay 엔진 없음).
- **★§25 Twin Write-guard = guardTeamWrite**(`UserAuth.php:1167`·write-PEP).
- **★§10 Capacity baseline = SystemMetrics**(`SystemMetrics.php:32`·forecast 없음).
- **★§16 AI Forecast infra = ClaudeAI**(`ClaudeAI.php:18`·glossary만·forecast 로직 없음).

## 2. 실존 substrate 카탈로그

### A. Sibling/Mirror env (PARTIAL 인접 — 별개 라이브 env·twin 아님)

| 파일:라인 | 심볼 | 설명 | Part3-22 매핑 |
|---|---|---|---|
| `AdminPlans.php:53` · `:58` · `:64-69` · `:157` · `:180` · `:209` · `:539` · `:717` · `:50-51` | mirrorPlanTablesToSibling(plan_config/plan_period_pricing/plan_menu_access 풀테이블 DELETE+INSERT prod↔demo) | product-config 미러(runtime state 아님) | Twin Sync(§4·인접·twin 아님) |
| `Db.php:20-21` · `:27-29` · `:35-38` · `:43-48` · `:56-61` · `:63` · `:71` · `:81-84` · `:63-87` · `:116-166` | pdoProd/pdoDemo·env 스위치·envLabel·contamination 가드·buildPdo(MySQL+SQLite) | 이중 env 배선(별개 DB) | env plumbing(재사용) |
| `UserAuth.php:735-738` | `_demo` sibling DB 사용자 존재확인 | sibling 조회 | 인접 |

★demo=**물리 격리 데이터 별개 라이브 env**(config 3테이블만 파괴적 미러)·runtime state mirror·event-sourced sync·time-travel 없음·read-only twin 아님.

### B. Event log (Replay 소스 PARTIAL — 시간순 append-only·replay 엔진 없음)

| 파일:라인 | 심볼 | 설명 | Part3-22 매핑 |
|---|---|---|---|
| `SecurityAudit.php:8` · `:27` · `:28-31` · `:48-52` · `:56-67` · `:59-67` · `:71` · `:118-153` | 해시체인 log(prev→sha256)·INSERT-only·verify(id ASC)·recent 시간순 | tamper-evident 시간순 event | Event Replay 소스(§6)·Evidence(§19) |
| `UserAuth.php:4165` · `:4166` · `:4190` · `:4200` · `:4217-4220` | auth_audit_log DDL(ip/ua/risk)·time 인덱스·logAudit·at DESC | 인증 감사 event stream | Replay 소스(§6) |
| `Db.php:434-440` · `:540-546` · `AdminMenu.php:128` · `:182-218` · `Compliance.php:133-151` · `:267` | audit_log(ops)·menu_audit_log 해시체인·collectAuditEvents UNION 정규화 | ops/메뉴 event·정규화 선례 | Event Normalizer(§5) 선례 |

★replayable 원천이나 **display/SIEM export만 소비**·replay/timeline/decision-replay 엔진 부재.

### C. Forecast/Prediction·AI·Metrics·Write-PEP (PARTIAL — authz 아님/infra)

| 파일:라인 | 심볼 | 설명 | Part3-22 매핑 |
|---|---|---|---|
| `SystemMetrics.php:14-30` · `:22-30` · `:32` · `:36-45` | 실측 모듈 status/latency/rpm/uptime/error_rate·미측정 null·세션게이트 | infra metrics baseline(forecast 없음) | Capacity Forecast(§10·baseline) |
| `ClaudeAI.php:18` · `:174` · `:177` · `:299` · `:309` · `Db.php:365-381` | class ClaudeAI·explain/confidence(용어설명 프롬프트)·ai_settings | LLM infra(forecast explainability 아님) | AI Forecast(§16·infra) |
| `UserAuth.php:1167` · `:1173` · `:1179-1181` · `:1182` · `:1188` | guardTeamWrite(read-only member write 차단 403·demo bypass·owner/manager pass) | write-PEP | Twin Write-guard(§25·확장 대상) |
| `SecurityAudit.php:27` · `:56-67` | 해시체인·verify | 불변 evidence 원자(twin snapshot 없음) | Twin Snapshot/Evidence(§18·§19·§30) |

## 3. 종합 판정

**Authorization Digital Twin = ABSENT-greenfield(Digital Twin Registry·Twin Instance/State·Twin Synchronization·Data Pipeline(Kafka/Pulsar/EventBridge)·Event Replay Engine·Runtime State Mirror·Predictive Governance·What-if Scenario·Capacity Forecast·Policy Impact/Risk/Compliance/Failure Predictor(authz)·Authorization Behavior Model·AI Forecast·Scenario Comparison·Twin Snapshot/Evidence(native)/Digest/Analytics/Drift/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규) / PARTIAL(SecurityAudit evidence·auth_audit_log event stream·guardTeamWrite write-PEP·dual-PDO env·SystemMetrics capacity baseline·ClaudeAI AI infra) / 인접-NOT-twin(demo sibling env·AdminPlans 미러).** 재활용(흡수 아님·확장): SecurityAudit→Twin Evidence + Replay 소스·auth_audit_log→Event stream·guardTeamWrite→Twin Write-guard·dual-PDO→env plumbing·SystemMetrics→Capacity baseline·ClaudeAI→AI Forecast infra. ★메시지 브로커 부재(신설). ★demo env·마케팅 forecast/prediction/scenario·ML risk·ModelMonitor drift·price 시뮬·정산 reconciliation·CCTV/PM/config snapshot(GT②)은 **흡수·오판 금지**.
