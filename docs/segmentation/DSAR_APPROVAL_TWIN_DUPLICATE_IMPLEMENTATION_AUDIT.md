# DSAR — Authorization Digital Twin & Predictive Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`.
> (A) authz twin 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(demo env·마케팅 forecast/ML risk/price 시뮬·정산 reconcil·CCTV/PM/config snapshot).

---

## 1. 핵심 판정 — **authz digital twin/replay/predictive governance 전면 그린필드**

`DigitalTwin|TwinRegistry|TwinState|EventReplay|ReplayEngine|PredictiveGovernance|WhatIf|CapacityForecast|PolicyImpact|BehaviorModel|StateMirror` **authz 매치 0건**. 유일 authz "replay"=OIDC anti-replay(`EnterpriseAuth.php:20`·CSRF/토큰 재생 방어·event-replay 아님). 메시지 브로커(Kafka/Pulsar/EventBridge/amqp) composer.json **부재**(`composer.json:5-13`). 모든 twin/mirror/replay/forecast/prediction/scenario 히트는 demo env·마케팅/ML·CCTV/PM/config snapshot·정산 reconcil 동음이의.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Digital Twin Registry / Instance / State | **ABSENT(grep 0)** | authz twin 전무 |
| Twin Synchronization / Data Pipeline(Kafka/Pulsar/EventBridge) | **ABSENT** | 브로커 부재(`composer.json:5-13`)·cron/outbox만(`backend/bin/*_cron.php`) |
| Event Replay Engine | **ABSENT(소스 PARTIAL)** | 원천=SecurityAudit/auth_audit_log(GT① §B)·replay 엔진 없음·유일 replay=OIDC anti-replay(`EnterpriseAuth.php:20`) |
| Runtime State Mirror(≤5s) | **ABSENT** | session/policy/decision cache mirror 없음 |
| Predictive Governance / What-if / Policy Impact / Risk / Compliance / Failure Predictor(authz) | **ABSENT(grep 0)** | 마케팅/ML만(§B) |
| Authorization Behavior Model | **ABSENT** | user/approval/decision behavior 모델 없음 |
| AI Forecast(confidence+explainability) | **ABSENT(infra만)** | ClaudeAI explain/confidence=용어설명(`ClaudeAI.php:174`·`:299`)·forecast 아님 |
| Scenario Comparison / Twin Snapshot/Digest/Analytics/Drift/Revalidation/Reconciliation | **ABSENT** | 마케팅 scenario/sim(§B)·twin snapshot 없음 |
| Runtime Guard / Static Lint | **ABSENT(grep 0)** | twin write/replay 가드 없음 |
| Evidence(불변) | **PARTIAL** | SecurityAudit 해시체인(`SecurityAudit.php:27`·`:56-67`) |
| Capacity baseline | **PARTIAL** | SystemMetrics(`SystemMetrics.php:32`·forecast 없음) |
| Write-PEP | **PARTIAL** | guardTeamWrite(`UserAuth.php:1167`) |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **SecurityAudit 해시체인** — `SecurityAudit.php:27`·`:56-67`. Twin Evidence(§19)·Replay 소스(§6).
2. **auth_audit_log** — `UserAuth.php:4165`. Event stream(§6).
3. **guardTeamWrite** — `UserAuth.php:1167`. Twin Write-guard(§25).
4. **dual-PDO env** — `Db.php:20-21`·`:63-87`. env plumbing.
5. **SystemMetrics** — `SystemMetrics.php:32`. Capacity baseline(§10).
6. **ClaudeAI** — `ClaudeAI.php:18`. AI Forecast infra(§16).

## 4. ★KEEP_SEPARATE — authz twin 아님 (demo env·마케팅/ML·CCTV/PM/config snapshot·정산)

### B-1. demo 환경 (★twin/mirror 최대 혼동 — 별개 라이브 env)
- `Db.php:20-21`·`:63-86`(pdoProd/pdoDemo·별개 MySQL)·`AdminPlans.php:53`·`:157`·`:180`·`:209`(mirrorPlanTablesToSibling·config 3테이블 파괴적 미러)·`UserAuth.php:735-738`. **물리 격리 데이터 별개 라이브 env**·runtime authz-decision state mirror 아님·read-only event-replay twin 아님.

### B-2. 마케팅 demand/media forecast (forecast/scenario 동음이의)
- `DemandForecast.php:18`·`:21`·`:99-132`·`:167-170`(SKU 판매 Holt-Winters). 판매/수요·authz capacity 아님.
- `Mmm.php:118-129`(MMM 반응곡선 predict). 미디어믹스·authz 아님.
- `AutoRecommend.php:363-481`(채널 effectiveness). 마케팅 ROAS·policy effectiveness 아님.

### B-3. ML risk 예측 / model drift (risk/prediction/drift 동음이의)
- `Risk.php:27`·`:31`·`:34-35`·`:69`·`:75`·`:88`·`:91`·`:124`·`:128`·`:133`·`:197`·`Db.php:448-456`·`:458`·`:458-467`(sigmoid/predict·risk_prediction·drivers=Amazon 리스팅 정책·churn/fraud). ★"policy"=Amazon 마켓플레이스 리스팅 정책·authz 정책 아님.
- `AnomalyDetection.php:3`·`:49`(SPC 광고이상). 마케팅·authz failure 아님.
- `ModelMonitor.php:18-19`·`:42-43`·`:201-337`(ML drift_score/retrain). ML ops·authz twin drift 아님.

### B-4. 마케팅 decisioning / price·campaign 시뮬 (scenario/simulate 동음이의)
- `Decisioning.php:12`·`:307`(decisioning score). 광고·authz decision replay 아님.
- `PriceOpt.php:105`·`:870`·`:926-949`·`:927`·`:939-948`·`:971`·`:1003`(po_simulations·price 탄력성 scenario). 가격 시뮬·policy what-if 아님.
- `AdminGrowth.php:81`·`:853`·`:1147-1151`·`:1239`(campaign simulate·demo_scenario 카피)·`CustomerAI.php:100`·`:228`(mode=simulated mock). 마케팅·authz 아님.

### B-4b. read-only 게이트 (read-only 동음이의 — twin write-guard 아님)
- `ChannelSync.php:5872`(demo_readonly 차단)·`AccessReview.php:32`·`:124`(read-only review 큐)·`CRM.php:769`(read-only). demo/큐 일반 read-only 게이트·Twin Write-guard(§25·twin=read-only 강제) 아님.

### B-5. attribution event / CCTV·PM·config snapshot / 정산 reconcil (event/snapshot/reconciliation 동음이의)
- `JourneyBuilder.php:330`·`:361-371`·`:567-575`·`:1185`(pixel_events·Thompson forgetting). 마케팅 이벤트/밴딧·authz decision event 아님.
- `WmsCctv.php`(CCTV snapshot=JPEG 프레임)·`AdminMenu.php:120`·`:139`·`:308`·`:595-652`(menu_defaults.snapshot_data config 백업)·`ClaudeAI.php:474`·`:490`(data_snapshot AI 입력 캐시)·`Health.php:35`·`:47`(memorySnapshot). snapshot 동음이의·twin snapshot 아님.
- `PgSettlement.php:294-295`·`:743`·`Connectors.php:896-902`·`KrChannel.php:415-419`(정산/ROAS reconciliation). 재무 대사·twin reconciliation 아님.

## 5. 종합

**authz Digital Twin & Predictive Governance = ABSENT-greenfield(Twin Registry/Instance/State·Synchronization·Data Pipeline·Event Replay·Runtime State Mirror·Predictive Governance·What-if·Capacity/Policy Impact/Risk/Compliance/Failure Predictor(authz)·Behavior Model·AI Forecast·Scenario Comparison·Snapshot/Evidence/Digest/Analytics/Drift/Revalidation/Reconciliation·Guard/Lint 순신규) / PARTIAL(SecurityAudit evidence·auth_audit_log event stream·guardTeamWrite write-PEP·dual-PDO env·SystemMetrics capacity baseline·ClaudeAI AI infra) / 인접-NOT-twin(demo sibling env·AdminPlans 미러).** 재활용(흡수 아님·확장): SecurityAudit→Twin Evidence+Replay 소스·auth_audit_log→Event stream·guardTeamWrite→Twin Write-guard·dual-PDO→env·SystemMetrics→Capacity baseline·ClaudeAI→AI Forecast infra. **★KEEP_SEPARATE=demo env(별개 라이브 env·twin 아님)·마케팅 forecast(DemandForecast/Mmm/AutoRecommend)·ML risk(Risk/AnomalyDetection)·ModelMonitor drift·price/campaign 시뮬(PriceOpt/AdminGrowth)·attribution event(JourneyBuilder)·CCTV/PM/config/memory snapshot·정산 reconciliation·OIDC anti-replay.** authz twin≠demo env/마케팅 forecast/ML risk/price 시뮬/CCTV snapshot/정산 reconcil.
