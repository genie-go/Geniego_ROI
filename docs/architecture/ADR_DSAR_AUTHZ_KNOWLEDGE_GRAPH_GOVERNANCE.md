# ADR — Authorization Knowledge Graph & Semantic Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-21
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-20 전체 — KG가 그래프化할 통제(RBAC/ABAC/JIT/SoD/Federation 3-18·Compliance 3-17·AI Gov 3-15). KG는 3-22 Digital Twin·Predictive의 기반 데이터모델

---

## 1. Context

Part 3-21은 Authorization Platform의 모든 객체(user/role/permission/policy/scope/resource/tenant/…)를 **Knowledge Graph(KG)** 로 연결해 **Semantic Authorization Governance**(관계분석·lineage·impact/dependency/root-cause·semantic search·graph reasoning·explainable authorization)를 구축한다. KG는 AI Governance·Digital Twin·Predictive Governance의 기반 데이터모델.

**★현 실측(2 스레드 상호검증·GT①②)**: authz KG의 **SOURCE 관계 데이터는 실재·풍부**(TeamPermissions RBAC/ABAC `:39`·`:152-159`·`:393-421`·`:737-753`·위계 `UserAuth.php:186-188`·`AdminMenu.php:107-117`·정책 테이블). 그러나 **GRAPH/ontology/semantic-reasoning/lineage-over-authz 엔진은 부재(grep 0·그린필드)**. 저장소=순수 MySQL(`Db.php:126-127`·graph DB 없음). ★유일 graph 엔진=`GraphScore.php`(마케팅 attribution·`graph_node`/`graph_edge` 테이블·authz 의미 0).

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **SOURCE PRESENT**: TeamPermissions(ACTIONS/DATA_SCOPES/MENU_CATALOG/acl_permission/ORG_PRESET `:39`~`:753`)·위계(`UserAuth.php:186-188`·`AdminMenu.php:107-117`)·정책 테이블(api_key `Db.php:942-955`·sso_group_role_map `EnterpriseAuth.php:70`·agency_client_link `AgencyPortal.php:64`·plan_menu_access `AdminPlans.php:393`).
- **Evidence PARTIAL**: SecurityAudit 해시체인(`SecurityAudit.php:25-64`).
- **Reasoning infra PARTIAL**: ClaudeAI LLM(`ClaudeAI.php:70`).
- **순환탐지 PARTIAL**: menu wouldCycle(`AdminMenu.php:551-566`·menu tree만).

### 2.2 거버넌스 계층 (GT②)
Knowledge Graph Registry·Graph Node/Edge 엔진·Ontology·Semantic Model·Graph Builder·Sync·Semantic Search·Relationship Discovery·Dependency Analyzer·Lineage·Impact·Root Cause·Graph Reasoning·Semantic Recommendation·Snapshot/Evidence(native)/Digest/Analytics(centrality)/Drift/Simulation/Revalidation/Reconciliation·Guard/Lint = **grep 0**. ★KEEP_SEPARATE: GraphScore 마케팅 attribution(`GraphScore.php:12-30`·graph_node/graph_edge 테이블)·AttributionEngine markov·GeniegoKnowledge 챗봇 KB·DataPlatform 데이터 lineage·product affinity·PM DAG·XML-DSig.

### 2.3 종합
**판정 = SOURCE-PRESENT / GRAPH-ABSENT-greenfield / PARTIAL(evidence·reasoning infra·menu DFS·role rank 암묵·순수 MySQL) / 대량 KEEP_SEPARATE(마케팅 graph/attribution/KB/lineage/affinity).**

## 3. Decision

### D-1. Graph Builder는 TeamPermissions SOURCE를 ingest (Extend·재구현 금지)
§7 Authorization Graph Builder는 TeamPermissions 관계 데이터(`:152-159` acl_permission=SUBJECT→actions→MENU·`:393-421` effectiveForUser·`:737-753` ORG_PRESET·위계 `UserAuth.php:186-188`·`AdminMenu.php:107-117`·정책 테이블)를 **읽어 노드/엣지로 변환·ingest**. ★SOURCE는 SSOT 유지·그래프는 파생 뷰(무후퇴)·권한 결정 재구현 금지(중복 금지).

### D-2. Graph Node/Edge Model은 SOURCE 어휘를 매핑
§3 Node(User/Role/Permission/Policy/Scope/Resource/Tenant/…)·§4 Edge(HAS_ROLE/HAS_PERMISSION/INHERITS/MEMBER_OF/CONSTRAINS/…)는 SOURCE 어휘(`TeamPermissions.php:39` ACTIONS·`:41` DATA_SCOPES·`:55-82` MENU_CATALOG·parent_user_id INHERITS·team_id MEMBER_OF)를 매핑. ★순신설 그래프 스토어이나 노드/엣지 의미는 SOURCE에서 도출.

### D-3. Graph Evidence/Snapshot은 SecurityAudit 확장
§18 Evidence(Relationship/Dependency Proof·Reasoning Result·Graph Integrity)·§17 Snapshot·§30 Immutable Graph Version은 SecurityAudit 해시체인(`SecurityAudit.php:25-64`) 확장. ★현 generic 감사를 graph-version 불변 스냅샷으로 확장은 순신설.

### D-4. Graph Reasoning/Semantic Search는 순신설 (ClaudeAI infra 재활용)
§15 Graph Reasoning(transitive/constraint/trust/policy inference)·§9 Semantic Search(NL/graph query)·§16 Semantic Recommendation(role merge/permission reduction)은 순신설. ClaudeAI LLM(`ClaudeAI.php:70`) infra 재활용(NL 인터페이스)·전이추론은 SOURCE의 clampActions/scopeWithinCap(`TeamPermissions.php:194-198`·`:356-373` 집합포함) 확장. ★explainable authorization=근거 그래프 경로 제시(V4 헌법 XAI).

### D-5. Circular/Static Lint은 menu wouldCycle 확장
§26 Static Lint(Orphan Node/Invalid Edge/Circular Dependency)의 순환탐지는 menu wouldCycle(`AdminMenu.php:551-566`·조상체인 DFS) 패턴을 role/permission 의존 그래프로 확장. ★현 menu tree만 → authz 의존 순환은 순신설.

### D-6. Part 1~3-20과의 관계 (그래프化 대상·무중복)
KG는 RBAC/ABAC/JIT/SoD/Federation(3-18)/Compliance(3-17)/AI Gov(3-15) 통제를 **노드/엣지로 그래프化·관계분석·추론**한다. 각 통제 엔진 재구현 금지(중복 금지). KG는 관계 모델·분석·추론만·권한 결정/집행은 기존 통제. KG는 3-22 Digital Twin 기반.

### D-7. ★마케팅 graph/attribution/KB/lineage/affinity 흡수 절대 금지 (KEEP_SEPARATE)
GraphScore 마케팅 attribution(`GraphScore.php:12-30`)·**graph_node/graph_edge 테이블(`Db.php:815-839`·마케팅)**·AttributionEngine markov·Attribution 확률 identity·JourneyBuilder journey graph·GeniegoKnowledge 챗봇 KB·DataPlatform 데이터 lineage·product affinity(CRM/Decisioning/CustomerAI/AutoRecommend)·PM DAG·XML-DSig node/digest·Mmm MCMC는 authz KG로 **흡수·개명 금지**. ★특히 `graph_node`/`graph_edge` 테이블을 authz 그래프 substrate로 **PRESENT 오판 절대 금지**(마케팅 attribution 전용)·authz 그래프는 별도 스토어 순신설.

### D-8. 정직 분리
- **실재 과신 회피**: SOURCE 관계 데이터는 실재하나 그래프/ontology/reasoning 엔진은 없음·SecurityAudit=generic(graph snapshot 아님)·ClaudeAI=챗봇(reasoning 아님)·menu DFS=menu만·role rank=암묵.
- **부재 과장 회피**: SOURCE 데이터·SecurityAudit·ClaudeAI·menu wouldCycle은 실재(재활용). authz KG 골격만 grep 0.
- **오흡수 회피**: 마케팅 graph/attribution/KB/데이터 lineage/affinity/PM DAG/XML-DSig는 authz KG 아님. graph_node/graph_edge=마케팅.

## 4. Consequences

- **긍정**: 관계 기반 semantic governance·lineage/impact/dependency/root-cause·전이추론·explainable authorization·3-22 Digital Twin 기반. RBAC/ABAC를 그래프로 통합 이해.
- **비용**: 대규모 신규(Graph Registry·Node/Edge 스토어·Ontology·Semantic Model·Graph Builder·Sync·Semantic Search·Relationship Discovery·Dependency Analyzer·Lineage·Impact·Root Cause·Reasoning·Recommendation·Snapshot/Evidence/Digest/Analytics/Drift/Simulation/Reconciliation·Guard/Lint). MySQL 관계형→그래프 뷰 신설(또는 graph DB 도입 검토).
- **선행 의존**: Part 1~3-20 인증 후 실 구현(BLOCKED_PREREQUISITE). SOURCE 통제 전부 선행.
- **무후퇴**: TeamPermissions SOURCE(SSOT)·SecurityAudit·ClaudeAI·menu tree·마케팅 GraphScore 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조·허용목록 밖 0).
- Completion Gate·Performance(Graph Build≤10분·Incremental≤5초·Semantic Search≤300ms·Reasoning≤1초·Impact≤2초·Availability≥99.999%)·Knowledge Graph Validation(ISO27001/NIST 800-53/SOC2/GDPR/ISO42001)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: Authorization Knowledge Graph & Semantic Governance = SOURCE-PRESENT(RBAC/ABAC 관계·위계·정책 노드/엣지 원천 풍부) / GRAPH-ABSENT-greenfield(Registry·Node/Edge 엔진·Schema·Ontology·Semantic Model·Graph Builder·Sync·Semantic Search·Relationship Discovery·Dependency Analyzer·Lineage·Impact·Root Cause·Reasoning·Recommendation·Snapshot/Evidence/Digest/Analytics/Drift/Simulation/Reconciliation·Guard/Lint 순신규) / PARTIAL(SecurityAudit evidence·ClaudeAI reasoning infra·menu-tree DFS·role rank 암묵·순수 MySQL). Extend: TeamPermissions SOURCE→Graph Builder ingest·위계→Graph Edge·SecurityAudit→Graph Evidence·ClaudeAI→Reasoning/Search infra·menu wouldCycle→circular lint·Part1~3-20 그래프化(무중복). 코드0·NOT_CERTIFIED·선행의존. **★GraphScore 마케팅 attribution·graph_node/graph_edge 테이블·챗봇 KB·데이터 lineage·affinity·PM DAG·XML-DSig 흡수·PRESENT 오판 금지.**
