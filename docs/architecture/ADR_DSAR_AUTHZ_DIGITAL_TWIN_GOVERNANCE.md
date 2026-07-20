# ADR — Authorization Digital Twin & Predictive Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-22
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-21 전체 — Twin이 복제/예측할 통제(Fabric 3-16·Federation 3-18·Compliance 3-17·AI Gov 3-15·Control Plane 3-19·Self-Healing 3-20). KG(3-21)가 twin 상태모델 기반

---

## 1. Context

Part 3-22는 Authorization Platform 전체를 실시간 복제하는 **Enterprise Authorization Digital Twin(EADT)** 을 구축해 미래 정책/권한/규제 변경의 운영 영향을 사전 예측·검증하는 **Predictive Governance Framework** 를 구현한다(Real-time Mirror·Predictive Governance·What-if·Capacity Forecast·Policy Impact/Risk/Compliance/Failure Prediction·AI Forecast·Scenario Planning). Twin은 Production과 논리 분리·**Read-only 데이터 복제 + Event Replay**·운영 무영향.

**★현 실측(2 스레드 상호검증·GT①②)**: authz Digital Twin 엔진은 **전면 부재(그린필드·grep 0)**. 재사용 원자만 존재: SecurityAudit 해시체인(evidence+replay 소스 `:27`·`:56-67`)·auth_audit_log event stream(`UserAuth.php:4165`)·guardTeamWrite write-PEP(`:1167`)·dual-PDO env(`Db.php:20-21`)·SystemMetrics capacity baseline(`:32`)·ClaudeAI AI infra(`:18`). ★메시지 브로커(Kafka/Pulsar/EventBridge) composer.json 부재. ★demo 형제 env·AdminPlans 미러=**인접(별개 라이브 env·config 미러·read-only twin 아님)**.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **Evidence/Replay 소스 PARTIAL**: SecurityAudit 해시체인(`SecurityAudit.php:27`·`:56-67`)·auth_audit_log(`UserAuth.php:4165`·시간순·replay 엔진 없음).
- **Write-PEP PARTIAL**: guardTeamWrite(`UserAuth.php:1167`).
- **env plumbing PARTIAL**: dual-PDO(`Db.php:20-21`·`:63-87`).
- **Capacity baseline PARTIAL**: SystemMetrics(`SystemMetrics.php:32`).
- **AI infra PARTIAL**: ClaudeAI(`ClaudeAI.php:18`·forecast 로직 없음).

### 2.2 거버넌스 계층 (GT②)
Twin Registry/Instance/State·Synchronization·Data Pipeline(브로커)·Event Replay·Runtime State Mirror·Predictive Governance·What-if·Capacity/Policy Impact/Risk/Compliance/Failure Predictor(authz)·Behavior Model·AI Forecast·Scenario Comparison·Snapshot/Evidence(native)/Digest/Analytics/Drift/Revalidation/Reconciliation·Guard/Lint = **grep 0**. ★KEEP_SEPARATE: demo env·마케팅 forecast(DemandForecast/Mmm)·ML risk(Risk)·ModelMonitor drift·price 시뮬(PriceOpt)·attribution event·CCTV/PM/config snapshot·정산 reconcil·OIDC anti-replay.

### 2.3 종합
**판정 = ABSENT-greenfield / PARTIAL(evidence·event stream·write-PEP·env·capacity baseline·AI infra) / 인접-NOT-twin(demo env·미러) / 대량 KEEP_SEPARATE(마케팅/ML/CCTV/PM/정산).**

## 3. Decision

### D-1. Event Replay는 SecurityAudit/auth_audit_log를 소스로 신설 (Extend)
§6 Event Replay Engine(Historical/Timeline/Decision Replay)은 SecurityAudit 해시체인(`SecurityAudit.php:27`·시간순·`:56-67` verify)·auth_audit_log(`UserAuth.php:4165`) event stream을 replay 소스로 소비. ★현 event는 display/SIEM만 소비 — replay/timeline/speed control/branch replay 엔진은 순신설. 메시지 브로커(§5) 신설.

### D-2. Twin Evidence/Snapshot은 SecurityAudit 확장
§19 Evidence(Replay/Prediction Evidence·AI Explanation·Scenario Result)·§18 Snapshot·§30 Immutable Replay History는 SecurityAudit 해시체인(`SecurityAudit.php:27`·`:56-67`) 확장. ★현 감사를 point-in-time twin 상태 스냅샷으로 확장은 순신설.

### D-3. Twin Write-guard는 guardTeamWrite 확장 (Read-only 강제)
§25 Runtime Guard(Twin Write Attempt/Production Mutation/Unauthorized Replay/Cross-Tenant Replay)는 write-PEP(`UserAuth.php:1167`·403) 확장. ★Twin은 read-only·Production mutation 절대 차단(운영 무영향 원칙)·Twin write attempt 차단.

### D-4. Capacity Forecast는 SystemMetrics baseline 확장
§10 Capacity Forecast(TPS/Sessions/Cache/Memory/CPU/Storage/Event Volume)는 SystemMetrics 실측(`SystemMetrics.php:32`) baseline에 projection 계층 신설. ★현 실측 metrics를 미래 projection으로 확장은 순신설.

### D-5. AI Forecast는 ClaudeAI infra 재활용·순신설 (confidence+explainability 필수)
§16 AI Forecast(Trend/Anomaly/Optimization/Resource/Governance Forecast)는 ClaudeAI LLM(`ClaudeAI.php:18`) infra 재활용·forecast 로직 순신설. ★**AI 예측은 Confidence Score + Explainability 필수(§16·V4 헌법 XAI)**·근거없는 예측 금지. Predictive Governance/What-if/Policy Impact는 KG(3-21) 상태모델 기반 순신설.

### D-6. Part 1~3-21과의 관계 (복제/예측 대상·무중복)
Twin은 Fabric(3-16)·Federation(3-18)·Compliance(3-17)·AI Gov(3-15)·Control Plane(3-19)·Self-Healing(3-20) 통제를 **read-only 복제·예측**한다. KG(3-21)가 twin 상태모델 기반. 각 통제 엔진 재구현 금지(중복 금지). Twin은 복제·예측·what-if만·실제 결정/집행은 기존 통제(운영 무영향).

### D-7. ★demo env/마케팅/ML/CCTV/PM/정산 흡수 절대 금지 (KEEP_SEPARATE)
demo 형제 env(별개 라이브 env·config 미러)·마케팅 forecast(DemandForecast/Mmm/AutoRecommend)·ML risk(Risk/AnomalyDetection)·ModelMonitor drift·price/campaign 시뮬(PriceOpt/AdminGrowth)·attribution event(JourneyBuilder)·CCTV/PM/config/memory snapshot·정산 reconciliation·OIDC anti-replay는 authz twin으로 **흡수·개명 금지**. ★특히 demo env를 Digital Twin으로 오판 절대 금지(demo=격리 데이터 별개 라이브 env·read-only event-replay mirror 아님).

### D-8. 정직 분리
- **실재 과신 회피**: SecurityAudit/auth_audit_log=event 소스(replay 엔진 아님)·SystemMetrics=실측(forecast 아님)·ClaudeAI=용어설명(forecast 아님)·demo=별개 env(twin 아님)·guardTeamWrite=일반 write-PEP. authz twin 없음.
- **부재 과장 회피**: event 소스·write-PEP·env·metrics·AI infra는 실재(재활용). twin 골격만 grep 0.
- **오흡수 회피**: demo env·마케팅 forecast/ML risk/price 시뮬/CCTV snapshot/정산 reconcil은 authz twin 아님.

## 4. Consequences

- **긍정**: read-only twin·미래 영향 사전 예측·what-if·capacity/AI forecast·executive decision support·운영 무영향 검증.
- **비용**: 대규모 신규(Twin Registry·Sync/Data Pipeline·메시지 브로커·Event Replay·Runtime State Mirror·Predictive Governance·What-if·Capacity/Policy Impact/Risk/Compliance/Failure Predictor·Behavior Model·AI Forecast·Scenario Comparison·Snapshot/Evidence/Digest/Analytics/Drift/Reconciliation·Guard/Lint). 브로커 도입.
- **선행 의존**: Part 1~3-21 인증 후 실 구현(BLOCKED_PREREQUISITE). KG(3-21) 상태모델·Observability(3-14) event 소스 선행.
- **무후퇴**: SecurityAudit·auth_audit_log·guardTeamWrite·dual-PDO·SystemMetrics·ClaudeAI·demo env·마케팅 forecast 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Twin Sync≤5초·Scenario≤30초·Replay Start≤3초·Prediction≤10초·Availability≥99.999%)·Digital Twin Validation(ISO27001/ISO42001/SOC2/NIST AI RMF/GDPR)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Authorization Digital Twin & Predictive Governance = ABSENT-greenfield(Twin Registry/Instance/State·Synchronization·Data Pipeline(브로커)·Event Replay·Runtime State Mirror·Predictive Governance·What-if·Capacity/Policy Impact/Risk/Compliance/Failure Predictor(authz)·Behavior Model·AI Forecast·Scenario Comparison·Snapshot/Evidence/Digest/Analytics/Drift/Reconciliation·Guard/Lint 순신규) / PARTIAL(SecurityAudit evidence+replay 소스·auth_audit_log event stream·guardTeamWrite write-PEP·dual-PDO env·SystemMetrics capacity baseline·ClaudeAI AI infra) / 인접-NOT-twin(demo sibling env·AdminPlans 미러). Extend: SecurityAudit→Twin Evidence+Replay 소스·auth_audit_log→Event stream·guardTeamWrite→Twin Write-guard·SystemMetrics→Capacity baseline·ClaudeAI→AI Forecast infra·Part1~3-21 복제/예측(무중복·KG 상태모델 기반). 코드0·NOT_CERTIFIED·선행의존. **★demo env·마케팅 forecast/ML risk/price 시뮬/CCTV snapshot/정산 reconcil 흡수·twin 오판 금지·AI 예측 Confidence+Explainability 필수·운영 무영향(read-only).**
