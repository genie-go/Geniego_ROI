# ADR — Authorization Universal Governance Mesh Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-24
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-23 전체 — Fabric(3-16)·Federation(3-18)·Control Plane(3-19)·Digital Twin(3-22). Mesh는 최상위 분산 거버넌스 층

---

## 1. Context

Part 3-24는 Authorization Platform을 단일 시스템/클라우드를 넘어 **Global Universal Governance Mesh(UAGM)** 로 확장한다(Multi-Cloud/Hybrid/Edge/K8s/Service Mesh/Multi-Region/Cross-Org/Cross-Nation). 중앙 정책 유지 + 각 Local Enforcement Domain 자율성. Mesh Controller·Topology·Distributed Policy Distribution·Regional Node/Local Agent·Policy Sync Bus·Trust Fabric·Consensus·Routing·Federation Gateway.

**★현 실측(2 스레드 상호검증·GT①②)**: authz Governance Mesh는 **전면 부재(그린필드·grep 0)**. 라이브=단일 PHP 8.1 Slim + MySQL PDO 모놀리스(`Db.php:9`·`composer.json:6-13`)·**메시지버스/Kafka/k8s/service-mesh(Istio/Envoy)/분산 consensus 전무**. 단일서버 proto-primitive만: AdminPlans 미러(`:53-72`)·maker-checker quorum(`Mapping.php:287`)·SecurityAudit(`:27`)·index.php context(`:116-121`)·local PDP/PEP(`TeamPermissions.php:695-700`). ★죽은 terraform/ECS/Postgres/Redis(`infra/`)은 라이브 무연결.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **Policy Distribution proto**: AdminPlans 미러(`AdminPlans.php:53-72`·동일서버 push).
- **Consensus PARTIAL**: maker-checker quorum(`Alerting.php:644-650`·`Mapping.php:287`·approval only).
- **Evidence PARTIAL**: SecurityAudit(`SecurityAudit.php:27`·`:63-64`).
- **Context/PEP PARTIAL**: index.php 주입(`:116-121`·`:69`).
- **Local PDP PARTIAL**: TeamPermissions(`:695-700`).
- **Health/Trust PARTIAL**: SystemMetrics(`SystemMetrics.php:32`)·SSO(`EnterpriseAuth.php:43-53`)·agency(`AgencyPortal.php:64-71`).

### 2.2 거버넌스 계층 (GT②)
Governance Registry·Mesh Controller·Topology·Distributed Policy Distribution(remote)·Regional Node·Local Agent·Policy Sync Bus·Trust Fabric·Context Exchange(cross-node)·Cross-Domain Coordination·Mesh Health/Recovery/Consensus(BFT)·Routing·Federation Gateway·Snapshot/Evidence(native)/Digest/Analytics/Drift/Revalidation/Reconciliation·Guard/Lint = **grep 0**. ★KEEP_SEPARATE: 죽은 terraform/k8s·마케팅 ChannelSync/GraphScore node·geo region·ML consensus·approval quorum(≠BFT)·HTTP routing·menu-tree·agent·SSE.

### 2.3 종합
**판정 = ABSENT-greenfield(단일 모놀리스) / PARTIAL(미러·quorum·evidence·context·PDP/PEP·health·local trust) / DEAD-infra(terraform/ECS/Postgres/Redis).**

## 3. Decision

### D-1. Distributed Policy Distribution은 AdminPlans 미러를 remote로 확장 (Extend)
§6 Distributed Policy Distribution Engine(Push/Pull/Hybrid)은 AdminPlans 미러(`AdminPlans.php:53-72`·동일서버 push)를 **remote 노드 분배·delta sync·conflict resolution**으로 확장. ★현행은 동일 MySQL 크로스스키마 복사(remote/delta 없음)·메시지버스(§9) 신설. 미러 로직 흡수·개명 금지.

### D-2. Consensus는 maker-checker를 넘어 순신설 (approval quorum ≠ BFT)
§15 Mesh Consensus Engine(Majority/Weighted/Quorum/BFT)은 maker-checker approval quorum(`Alerting.php:644-650`·`Mapping.php:287`·인간 M-of-N)의 정족수 개념을 참조하되 **분산 replicated state machine/BFT/leader election은 순신설**. ★approval quorum을 분산 consensus로 오판·개명 금지.

### D-3. Mesh Evidence/Snapshot은 SecurityAudit 확장
§19 Evidence(Sync History/Policy Distribution/Trust Validation/Consensus Result/Recovery)·§18 Snapshot·§30 Immutable Topology/Sync History는 SecurityAudit 해시체인(`SecurityAudit.php:27`·`:63-64`) 확장. ★현 generic 감사를 topology/sync 이벤트 불변 ledger로 확장은 순신설.

### D-4. Regional Node/Local Agent는 로컬 PDP/PEP를 분산 확장 (재구현 금지)
§7 Regional Governance Node·§8 Local Governance Agent는 로컬 PDP(`TeamPermissions.php:695-700`)·PEP(`index.php:69`)·context 주입(`:116-121`)을 **원격 노드/에이전트(VM/Container/K8s/Edge)로 분산 확장**. 로컬 통제 재구현 금지(중복 금지). §11 Context Exchange는 index.php 주입을 cross-node 교환으로 확장(최소공개).

### D-5. Trust Fabric·Routing·Topology는 순신설
§10 Global Trust Fabric(cross-region/federation trust chain)은 SSO(`EnterpriseAuth.php:43-53`)·agency 위임(`AgencyPortal.php:64-71`) local trust를 넘어 순신설. §16 Governance Routing·§5 Topology Manager(node/cluster/region·dynamic join/discovery)·§17 Federation Gateway는 단일노드(`Db.php:63-87`)·정적 HTTP 라우트(`routes.php:759-764`)를 넘어 순신설(service mesh 도입).

### D-6. Part 1~3-23과의 관계 (분산 통합 대상·무중복)
Mesh는 Fabric(3-16)·Federation(3-18)·Control Plane(3-19)·Compliance(3-17)·전 통제를 **분산 노드로 통합·조율**한다. 각 통제 엔진 재구현 금지(중복 금지). Mesh는 topology·distribution·consensus·routing만·결정/집행은 로컬 노드·기존 통제.

### D-7. ★죽은 infra/마케팅/geo/ML/approval/HTTP/agent 흡수 금지 (KEEP_SEPARATE)
죽은 terraform/ECS/Postgres/Redis(`infra/`)·마케팅 ChannelSync(`ChannelSync.php:12`)·GraphScore node(`GraphScore.php:19`)·geo region·ML consensus(`AttributionEngine.php:1560`)·approval quorum(≠BFT)·HTTP routing(`routes.php`)·menu-tree·ModelMonitor drift·정산 reconciliation·user-agent/AI-agent·SSE는 authz mesh로 **흡수·개명 금지**. ★특히 **죽은 terraform/k8s를 Mesh/Multi-Region/Cluster/Consensus PRESENT 근거로 절대 인용 금지**(라이브 무연결).

### D-8. 정직 분리
- **실재 과신 회피**: AdminPlans 미러=동일서버 복사·maker-checker=approval quorum(BFT 아님)·SecurityAudit=generic·PDP/PEP=모놀리스 로컬·SSO/agency=local trust. authz mesh 없음.
- **부재 과장 회피**: 미러·quorum·evidence·context·PDP/PEP·health·local trust는 실재(재활용·단일노드). mesh 골격만 grep 0.
- **오흡수 회피**: 죽은 infra·마케팅·geo·ML·approval·HTTP·agent는 authz mesh 아님.

## 4. Consequences

- **긍정**: 멀티클라우드/리전/edge 통합 거버넌스·중앙정책+로컬자율·분산 consensus·routing·고가용성.
- **비용**: 대규모 신규(Governance Registry·Mesh Controller·Topology·Distributed Policy Distribution·Regional Node·Local Agent·Policy Sync Bus(브로커)·Trust Fabric·Context Exchange·Coordination·Health/Recovery/Consensus·Routing·Federation Gateway·Snapshot/Evidence/Digest/Analytics/Drift/Reconciliation·Guard/Lint). 단일노드→분산 전환·service mesh/브로커 도입.
- **선행 의존**: Part 1~3-23 인증 후 실 구현(BLOCKED_PREREQUISITE). Fabric(3-16)·Federation(3-18)·Control Plane(3-19) 선행.
- **무후퇴**: AdminPlans 미러·maker-checker·SecurityAudit·index.php·TeamPermissions·SystemMetrics·SSO/agency 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Node Registration≤5초·Policy Distribution≤10초·Region Sync≤5초·Consensus≤2초·Availability≥99.999%)·Universal Governance Mesh Validation(ISO27001/NIST 800-207/SOC2/PCI/CSA CCM)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Universal Governance Mesh = ABSENT-greenfield(Governance Registry·Mesh Controller·Topology Manager·Distributed Policy Distribution(remote)·Regional Node·Local Agent·Policy Sync Bus·Global Trust Fabric·Universal Context Exchange(cross-node)·Cross-Domain Coordination·Mesh Health/Recovery/Consensus(BFT)·Governance Routing·Federation Gateway·Snapshot/Evidence/Digest/Analytics/Drift/Reconciliation·Guard/Lint 순신규) / PARTIAL(AdminPlans 미러·maker-checker quorum·SecurityAudit evidence·index.php context·local PDP/PEP·SystemMetrics health·SSO/agency local trust) / DEAD-infra(terraform/ECS/Postgres/Redis·PRESENT 금지). Extend: AdminPlans 미러→Policy Distribution·maker-checker→Consensus(approval)·SecurityAudit→Mesh Evidence·index.php→Context Exchange·PDP/PEP→Regional Node/Local Agent·SystemMetrics→Health·SSO/agency→Trust·Part1~3-23 분산 통합(무중복). 코드0·NOT_CERTIFIED·선행의존. **★죽은 terraform/k8s(Mesh/Multi-Region/Consensus PRESENT 금지)·마케팅 sync·node/geo region/ML consensus/approval quorum(≠BFT)/HTTP routing/menu/agent 흡수 금지.**
