# ADR — Authorization Control Plane Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-19
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-18 전체 — Control Plane이 중앙 조율할 통제(Fabric 3-16·Federation 3-18·Compliance 3-17·AI Gov 3-15·Zero Trust 3-13)

---

## 1. Context

Part 3-19는 지금까지 구축한 모든 Authorization 구성요소를 하나의 **Autonomous Authorization Control Plane(AACP·Control Tower)** 으로 통합해 중앙 자동 운영·제어한다(Global Orchestrator·Authorization Scheduler·Config Registry/Distribution·Policy Publisher·Rollout/Rollback·Feature Flag·Coordinator 계열·Snapshot/Evidence/Analytics/Drift/Simulation). Control Plane은 Data Plane과 완전 분리·Stateless.

**★현 실측(2 스레드 상호검증·GT①②)**: **Authorization Control Plane은 부재(grep 0)**. 라이브 authz는 **단일 PHP/MySQL Slim 모놀리스**(`composer.json:2-12`·`index.php:23`·`Db.php:18`)로 Control Plane과 Data Plane이 **미분리**·RBAC 집행이 front controller에 inline(`index.php:69-88`). 실재 substrate=flat KV(app_setting `Db.php:308-321`)·product-config 미러(`AdminPlans.php:53-72`)·SecurityAudit evidence(`SecurityAudit.php:14-64`)·schema 버전/롤백(`migrate.php:9-15`)·Data-Plane PDP/PEP(`TeamPermissions.php:695-701`·`index.php:69-88`)뿐.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **Config Registry PARTIAL**: app_setting flat KV(`Db.php:308-321`·version/owner/approval 없음).
- **Config Distribution proto**: AdminPlans 미러(`AdminPlans.php:53-72`·product config).
- **Evidence PRESENT**: SecurityAudit 해시체인(`SecurityAudit.php:14-64`)·Health deploy 마커(`Health.php:56-67`).
- **Version/Rollback PARTIAL**: `Db.php:157-162`·`migrate.php:9-15`(schema만).
- **Data-Plane PRESENT**: TeamPermissions PDP(`:695-701`)·index.php PEP(`:69-88`).
- **Publisher 선례**: FeedTemplate publish(`routes.php:757`·`:764`)·AccessReview decision(`AccessReview.php:176-225`).

### 2.2 거버넌스 계층 (GT②)
Control Plane Registry·Global Orchestrator·Authorization Scheduler·Policy Publisher(authz)·Config Distribution(authz)·Runtime/Decision Coordination·Coordinator 계열·Service Discovery·Version Coordinator(authz)·Rollout/Rollback(authz)·Feature Flag Manager·Snapshot/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint = **grep 0**. ★KEEP_SEPARATE: 마케팅 orchestration(AutoCampaign/JourneyBuilder/Decisioning/RuleEngine)·ML deploy(ModelMonitor)·code deploy(deploy.*)·커머스/메시징 cron·재무 reconciliation·죽은 terraform(blue-green/autoscaling)·도메인 config(sso_config 등).

### 2.3 종합
**판정 = ABSENT-controlplane(단일 모놀리스·Control/Data 미분리) / PARTIAL(app_setting·AdminPlans 미러·SecurityAudit·schema 버전/롤백) / PRESENT-dataplane / KEEP_SEPARATE(마케팅·ML·code deploy·cron·죽은 terraform).**

## 3. Decision

### D-1. 단일노드 inline RBAC를 Control/Data Plane으로 분리 (Extend, 대체 아님)
현 inline PEP(`index.php:69-88`)+PDP(`TeamPermissions.php:695-701`·요청마다 재계산)를 **Stateless Control Plane(오케스트레이션/배포/조율)** 과 **Data Plane(런타임 결정·집행)** 로 분리 신설. 현 집행 경로 유지·병행(무후퇴)·Data Plane 첫 노드로 편입.

### D-2. app_setting을 governed Config Registry로 확장
flat KV(`Db.php:308-321`)를 §17 Config Registry(Configuration Version/Owner/Approval/Activation/Expiration)로 확장. ★현 skey/svalue를 버전/승인/오너 컬럼으로 승격·신규 registry 난립 금지.

### D-3. AdminPlans 미러를 Config Distribution의 proto로 (product→authz 신설)
`AdminPlans::mirrorPlanTablesToSibling`(`:53-72`)를 §6 Config Distribution Engine(Policy/Role/Permission/Dynamic Rule/Trust Rule/AI Model Ref/Compliance Rule 분배)의 **개념 proto**로만 참조. ★현행은 product config 미러(canary/ack/version 없음)이므로 authz 정책 분배·canary/blue-green은 순신설. 미러 로직 흡수·개명 금지.

### D-4. Policy Publisher는 FeedTemplate/AccessReview 선례로 신설
§5 Policy Publisher(draft→review→approve→publish→canary→blue-green→rollback)는 FeedTemplate publish(`routes.php:757`·`:764`·product 선례)·AccessReview decision(`AccessReview.php:176-225`·approve/revoke+evidence 선례) 패턴을 authz 정책으로 신설. ★선례는 product/access이므로 authz policy publish는 순신규.

### D-5. Rollback/Version은 migrate --rollback를 authz로 확장
§20 Rollback Manager·§18 Version Coordinator는 schema rollback(`migrate.php:9-15`·`Db.php:157-162`)을 authz 정책/config 버전으로 확장. ★현 schema만 → authz config rollout/rollback·semantic version·compatibility matrix는 순신설.

### D-6. Control Evidence/Immutable Deployment History는 SecurityAudit 확장
§23 Evidence(Deployment/Rollout/Approval/Rollback Evidence)·§35 Immutable Deployment History·§22 Snapshot은 SecurityAudit 해시체인(`SecurityAudit.php:14-64`)·Health 마커(`Health.php:56-67`) 확장. ★현 감사를 정책/config publish 이벤트 불변기록으로 확장은 순신설.

### D-7. Part 1~3-18과의 관계 (조율 대상·무중복)
Control Plane은 Fabric(3-16)·Federation(3-18)·Compliance(3-17)·AI Gov(3-15)·Zero Trust(3-13) 통제를 **중앙 조율·배포·롤아웃**한다(§9~§13 Coordinator). 각 통제 엔진 재구현 금지(중복 금지). Control Plane은 오케스트레이션/배포/조율만·결정/집행은 Data Plane·기존 통제.

### D-8. ★마케팅/ML/code deploy/죽은 infra 흡수 절대 금지 (KEEP_SEPARATE)
마케팅 orchestration(AutoCampaign/JourneyBuilder/Decisioning/RuleEngine)·ML deploy(ModelMonitor)·code deploy(deploy.ps1/sh/yml)·커머스/메시징 cron·재무 reconciliation(PgSettlement/Wms)·도메인 config(sso_config)는 authz control plane으로 **흡수·개명 금지**. ★**죽은 terraform**(`infra/aws/terraform/*` blue-green/autoscaling)은 라이브 무연결이므로 Control Plane/Multi-Region/Rollout PRESENT 근거로 **절대 인용 금지**.

### D-9. 정직 분리
- **실재 과신 회피**: app_setting=flat KV(governed registry 아님)·AdminPlans 미러=product config·SecurityAudit=단일노드·migrate rollback=schema만·PDP/PEP=미조율. Control Plane 없음.
- **부재 과장 회피**: KV·미러·evidence·schema 버전/롤백·PDP/PEP는 실재(재활용). control plane 골격만 grep 0.
- **오흡수 회피**: 마케팅/ML/code deploy/cron/재무/죽은 terraform은 authz control plane 아님.

## 4. Consequences

- **긍정**: 중앙 자동 운영·정책 배포·rollout/rollback·feature flag·drift/simulation·DR·고가용성. Control Tower.
- **비용**: 대규모 신규(Control Plane Registry·Global Orchestrator·Scheduler·Policy Publisher·Config Distribution·Runtime/Decision Coordination·Coordinator 계열·Service Discovery·Config Registry·Version Coordinator·Rollout/Rollback·Feature Flag·Snapshot/Digest/Analytics/Drift/Simulation/Reconciliation·Guard/Lint). 단일노드→Control/Data 분리 대개편.
- **선행 의존**: Part 1~3-18 인증 후 실 구현(BLOCKED_PREREQUISITE). Fabric(3-16)·Federation(3-18) 통합층 선행.
- **무후퇴**: app_setting·AdminPlans·SecurityAudit·migrate·PDP/PEP·마케팅/ML/code deploy 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Config Publish≤30초·Region Sync≤10초·Failover≤30초·Rollback≤60초·Availability≥99.999%)·Global Control Plane Validation(ISO27001/NIST 800-53/SOC2/PCI/CIS)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Authorization Control Plane = ABSENT-controlplane(단일 모놀리스·Control/Data Plane 미분리·Global Orchestrator·Scheduler·Policy Publisher·Config Distribution(authz)·Runtime/Decision Coordination·Coordinator 계열·Service Discovery·Version Coordinator(authz)·Rollout/Rollback(authz)·Feature Flag·Snapshot/Digest/Analytics/Drift/Simulation/Reconciliation·Guard/Lint 순신규) / PARTIAL(app_setting KV·AdminPlans 미러·SecurityAudit evidence·Health 마커·schema 버전/롤백) / PRESENT-dataplane(TeamPermissions PDP·index.php PEP). Extend: inline RBAC→Control/Data Plane 분리·app_setting→governed Config Registry·AdminPlans 미러→Config Distribution proto·SecurityAudit→Control Evidence·migrate rollback→authz Rollback·FeedTemplate/AccessReview→Publisher 선례·Part1~3-18 조율(무중복). 코드0·NOT_CERTIFIED·선행의존. **★마케팅 orchestration·ML deploy·code deploy·커머스 cron·죽은 terraform 흡수·PRESENT 오판 금지.**
