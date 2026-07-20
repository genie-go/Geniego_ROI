# ADR — Self-Healing Authorization & Continuous Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-20
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-19 전체 — self-healing이 복구할 통제(Fabric 3-16·Federation 3-18·Compliance 3-17·AI Gov 3-15·Zero Trust 3-13·Control Plane 3-19)

---

## 1. Context

Part 3-20은 GeniegoROI Authorization Platform에 **Self-Healing(자가 복구)** + **Continuous Governance(지속 거버넌스)** 를 적용해 운영자 개입 없이 이상 탐지·정책 허용 범위 내 자동 복구한다(Health Assessment·Continuous Governance·Drift/Anomaly Detection·Auto-Remediation(안전장치)·Safe Recovery Planner·Recovery Workflow 8단계·Recovery Approval/Rollback·Governance Health Score·AI Recovery Advisor). 모든 자동 복구는 승인 Governance Rule + Safety Guardrail 준수(정책/역할/Compliance/SoD 자동삭제 금지·§7).

**★현 실측(2 스레드 상호검증·GT①②)**: **authz self-healing 엔진은 부재(그린필드·grep 0)**. 실재는 infra health-probe(`SystemMetrics.php:60`·`Health.php:27`·ok/degraded/down·authz health 아님)·maker-checker 정족수(`Mapping.php:240`)·SecurityAudit evidence(`SecurityAudit.php:14-68`)·migrate schema rollback(`Migrate.php:310`)·AccessReview expired 탐지(`AccessReview.php:87`)·ClaudeAI LLM(`ClaudeAI.php:70`)·Compliance readiness(`Compliance.php:120`)뿐. ★Alerting executeAction은 **producer 없는 죽은 스켈레톤(광고 actuation)**·authz auto-remediation 아님.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **Health Assessment PRESENT baseline**: SystemMetrics/Health infra probe(`SystemMetrics.php:60`·`Health.php:27`).
- **Recovery Approval substrate**: maker-checker(`Mapping.php:240`·`:268-271`·producer `:209`).
- **Evidence PRESENT**: SecurityAudit 해시체인(`SecurityAudit.php:14-68`).
- **Rollback PARTIAL**: migrate schema rollback(`Migrate.php:310`·`migrate.php:34-38`).
- **Expired detection PARTIAL**: AccessReview classify(`AccessReview.php:87`)·inline session GC(`UserAuth.php:989`).
- **AI Advisor infra / Health Score 인접**: ClaudeAI(`ClaudeAI.php:70`)·Compliance readiness(`Compliance.php:120`).

### 2.2 거버넌스 계층 (GT②)
Self-Healing Registry·Health Assessment(authz)·Continuous Governance·Drift/Anomaly(authz)·Auto-Remediation·Safe Recovery Planner·Consistency Validator·Config Healing·Compliance Recovery·Recovery Workflow/Approval(authz)/Rollback(authz state)·Snapshot/Digest/Analytics(MTTD/MTTR)/Simulation/Revalidation/Reconciliation·Governance Health Score(authz)·Guard/Lint = **grep 0**. ★KEEP_SEPARATE: DB 스키마 self-heal(`Db.php:308`)·AnomalyDetection SPC(`AnomalyDetection.php:3`)·ModelMonitor drift(`ModelMonitor.php:221`)·**Alerting 죽은 스켈레톤(광고 actuation·producer 없음)**·커머스/재무 recovery(`Wms.php:2160`·`PgSettlement.php:215`)·MFA recovery codes(`UserAuth.php:2501-2530`)·connector_health·SQL 롤백.

### 2.3 종합
**판정 = ABSENT-greenfield / PARTIAL(infra probe·expired 탐지·session GC·schema rollback) / PRESENT(SecurityAudit·maker-checker·ClaudeAI·tenant 격리) / 대량 KEEP_SEPARATE(스키마/ML/SPC/죽은 스켈레톤/재무/MFA).**

## 3. Decision

### D-1. Health Assessment는 SystemMetrics/Health를 authz-도메인으로 확장 (Extend)
infra probe(`SystemMetrics.php:60`·`Health.php:27`·ok/degraded/down)를 §3 Health Assessment(Authorization Service/PDP/PEP/PIP/Policy/Role/Permission Engine → Healthy/Warning/Degraded/Critical/Recovery Required)로 확장. ★현 infra health를 authz-도메인 health(권한 anomaly·policy drift·SoD posture)로 신설·infra probe 재사용.

### D-2. Recovery Approval은 maker-checker 정족수 확장 (Golden Rule)
§16 Recovery Approval(Global Policy Rollback·Region Isolation·Federation Disconnect·Critical Config Restore·Compliance Override)은 maker-checker(`Mapping.php:240`·self-approval 차단 `:268-271`·정족수 `:287`)를 recovery 도메인으로 확장. ★Alerting `action_request` 죽은 스켈레톤은 재사용하되 producer 신설 필요(현 orphan)·광고 actuation과 분리.

### D-3. Recovery Evidence/Snapshot은 SecurityAudit 확장
§19 Evidence(Detection/Approval/Execution/Validation Evidence)·§31 Immutable Recovery History·§18 Snapshot은 SecurityAudit 해시체인(`SecurityAudit.php:14-68`·verify) 확장. ★현 감사를 recovery 이벤트 불변기록으로 확장은 순신설.

### D-4. Rollback Recovery는 migrate rollback를 authz state로 확장
§17 Rollback Recovery(Policy/Configuration/Snapshot/Region/Tenant Rollback)는 schema rollback(`Migrate.php:310`·`migrate.php:34-38`)을 authz 정책/config/snapshot 상태로 확장. ★현 schema만 → policy/role 변경을 이전 양호 상태로 되돌리는 authz-state rollback은 순신설.

### D-5. Auto-Remediation은 AccessReview 탐지+안전장치로 신설 (자동삭제 금지)
§7 Auto-Remediation(Cache Rebuild/Config Reload/Policy Revalidation/Session Cleanup/Expired Assignment Cleanup/Cert Reload/Trust Cache Refresh/Metadata Sync)은 AccessReview expired 탐지(`AccessReview.php:87`)·inline session GC(`UserAuth.php:989`)를 스케줄 GC로 확장. ★**Safety Guardrail 절대 준수**: Critical Policy/Role/Compliance Rule/SoD Rule/Global Permission 자동삭제·변경 금지(§7·V5 헌법 안전자동화). AI Recovery Advisor(§14)는 plan 생성만·자동승인 금지.

### D-6. Drift/Anomaly Detection·Governance Health Score는 순신설 (마케팅 흡수 금지)
§5 Drift(authz policy/role/permission/assignment)·§6 Anomaly(비정상 권한증가/정책변경/승인실패/cross-tenant)·§22 Governance Health Score(authz)는 순신설. ClaudeAI(`ClaudeAI.php:70`)·Compliance readiness(`Compliance.php:120`) 패턴 재사용. ★마케팅 AnomalyDetection SPC·ModelMonitor drift 흡수·개명 금지.

### D-7. Part 1~3-19와의 관계 (복구 대상·무중복)
Self-Healing은 Fabric(3-16)·Federation(3-18)·Compliance(3-17)·AI Gov(3-15)·Zero Trust(3-13)·Control Plane(3-19) 통제를 **탐지·복구**한다. 각 통제 엔진 재구현 금지(중복 금지). Self-Healing은 health/drift/recovery만·정책 결정/집행은 기존 통제·Observability(3-14) 이벤트가 탐지원.

### D-8. ★스키마/ML/광고 actuation/재무/MFA 흡수 절대 금지 (KEEP_SEPARATE)
DB 스키마 self-heal(`Db.php:308`)·AnomalyDetection SPC·ModelMonitor drift·**Alerting 죽은 스켈레톤(광고 actuation·producer 없음)**·커머스/재무 recovery/reconciliation(`Wms.php:2160`·`PgSettlement.php:215`)·MFA recovery codes(`UserAuth.php:2501-2530`)·connector_health·SQL 롤백은 authz self-healing으로 **흡수·개명 금지**. ★특히 Alerting `action_request` 파이프라인은 작동 remediation으로 취급 금지(producer 부재 orphan).

### D-9. 정직 분리
- **실재 과신 회피**: SystemMetrics/Health=infra probe(authz health 아님)·maker-checker=비-authz 도메인·migrate rollback=schema만·Alerting=죽은 스켈레톤·Compliance readiness=인접. authz self-healing 없음.
- **부재 과장 회피**: infra probe·maker-checker·SecurityAudit·schema rollback·AccessReview 탐지·ClaudeAI는 실재(재활용). authz self-healing 골격만 grep 0.
- **오흡수 회피**: 스키마/ML/SPC/광고 actuation/재무/MFA/SQL 롤백은 authz self-healing 아님.

## 4. Consequences

- **긍정**: 무인 이상탐지·안전 자동복구·지속 거버넌스·Governance Health Score·MTTD/MTTR·AI 보조. 플랫폼 지속 건강 유지.
- **비용**: 대규모 신규(Self-Healing Registry·Health Assessment(authz)·Continuous Governance·Drift/Anomaly(authz)·Auto-Remediation·Safe Recovery Planner·Consistency Validator·Config Healing·Compliance Recovery·Recovery Workflow/Approval/Rollback·Snapshot/Digest/Analytics/Simulation/Reconciliation·Governance Health Score·Guard/Lint). Alerting producer 신설.
- **선행 의존**: Part 1~3-19 인증 후 실 구현(BLOCKED_PREREQUISITE). Observability(3-14) 탐지원·Control Plane(3-19) 복구 집행.
- **무후퇴**: SystemMetrics/Health·maker-checker·SecurityAudit·migrate·AccessReview·ClaudeAI·스키마 self-heal·마케팅 ML 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Health Assessment≤10초·Drift≤5초·Auto-Remediation Start≤3초·Recovery Plan≤30초·Governance Health Refresh≤60초·Recovery Success≥99%)·Self-Healing Validation(ISO27001/ISO22301/SOC2/NIST 800-53/CIS)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Self-Healing Authorization & Continuous Governance = ABSENT-greenfield(Self-Healing Registry·Health Assessment(authz)·Continuous Governance·Drift/Anomaly(authz)·Auto-Remediation·Safe Recovery Planner·Consistency Validator·Config Healing·Compliance Recovery·Recovery Workflow/Approval(authz)/Rollback(authz)·Snapshot/Digest/Analytics/Simulation/Reconciliation·Governance Health Score(authz)·Guard/Lint 순신규) / PARTIAL(infra probe·expired 탐지·session GC·schema rollback) / PRESENT(SecurityAudit evidence·maker-checker·ClaudeAI·tenant 격리). Extend: SystemMetrics/Health→Health Assessment·maker-checker→Recovery Approval·SecurityAudit→Evidence·migrate rollback→authz Rollback·AccessReview→Expired detection·ClaudeAI→AI Advisor·Compliance readiness→Governance Health Score·Part1~3-19 복구(무중복). 코드0·NOT_CERTIFIED·선행의존. **★DB 스키마 self-heal·마케팅 SPC/ML drift·Alerting 죽은 스켈레톤·재무 recovery·MFA codes 흡수·PRESENT 오판 금지·Safety Guardrail(정책/역할/SoD 자동삭제 금지).**
