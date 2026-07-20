# DSAR — Authorization Knowledge Graph & Semantic Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> 본 문서는 Part 3-21 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`backend/src/routes.php`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`.
- 방법: TeamPermissions/UserAuth/EnterpriseAuth/AgencyPortal/AdminMenu/SecurityAudit 정독 + graph/node/edge/ontology/semantic/reasoning/lineage/centrality grep. 2 Explore 스레드(41 tool-use) 상호검증. 라인 실측.

## 1. 핵심 판정 요약

**authz KG의 SOURCE 관계 데이터(RBAC/ABAC/위임/위계/정책 테이블)는 실재·풍부**(그래프 빌더가 ingest할 노드/엣지 원천)하나, **GRAPH/ontology/semantic-reasoning/lineage-over-authz 엔진은 부재(그린필드)**. 유일 graph 엔진=`GraphScore.php`(마케팅 attribution·authz 의미 0). 저장소=MySQL PDO(SQLite 폴백)·**graph DB 없음**.

- **★SOURCE PRESENT = TeamPermissions**(`TeamPermissions.php:39` ACTIONS·`:41` DATA_SCOPES·`:55-82` MENU_CATALOG·`:152-159` acl_permission=SUBJECT→actions→MENU 엣지·`:393-421` effectiveForUser·`:737-753` ORG_PRESET). 노드/엣지 원천.
- **★위계 SOURCE PRESENT = parent_user_id/menu_tree**(`UserAuth.php:186-188` app_user 위계·`AdminMenu.php:107-117` menu_tree).
- **★GRAPH 엔진 ABSENT**: `graph_node`/`graph_edge` 테이블 실재하나 **마케팅 GraphScore**(`GraphScore.php:12-30`·influencer→creative→sku→order·authz 노드타입 없음)·GT②. authz graph PRESENT 오판 금지.
- **★Evidence PARTIAL = SecurityAudit**(`SecurityAudit.php:25-31`·해시체인·graph snapshot 없음).
- **★Reasoning infra PARTIAL = ClaudeAI**(`ClaudeAI.php:70`·LLM 챗봇·graph reasoning 아님).

## 2. 실존 substrate 카탈로그

### A. RBAC/ABAC SOURCE 관계 데이터 (PRESENT — 노드/엣지 원천·그래프 엔진 아님)

| 파일:라인 | 심볼 | 설명 | Part3-21 매핑 |
|---|---|---|---|
| `TeamPermissions.php:39` · `:41` · `:44-49` · `:55-82` | ACTIONS(8동사)·DATA_SCOPES(9)·TEAM_TYPES·MENU_CATALOG(26 resource 노드) | 노드/엣지 어휘(SSOT) | Graph Node Model(§3)·Edge(§4) 원천 |
| `TeamPermissions.php:152-159` · `:169-170` · `:160-166` · `:171-172` · `:145-151` | acl_permission(subject→actions→menu_key)·data_scope(ABAC scope)·team DDL | 권한/스코프 엣지 테이블 | HAS_PERMISSION/CONSTRAINS 엣지 |
| `TeamPermissions.php:202-213` · `:215-225` · `:236-265` · `:286-322` · `:234` | subjectPerms·subjectScope·effectiveScope·scopeSql·DENY_SCOPE fail-closed | 엣지 읽기·ABAC 행필터 | Graph Sync(§8) 원천 |
| `TeamPermissions.php:393-421` · `:695-701` · `:381-387` · `:704-712` · `:356-373` | effectiveForUser·effectivePermissions·assignableMap(위임상한)·assignablePermissions·scopeWithinCap(집합포함 추론) | 권한 해석·위임 | Relationship(§5)·Reasoning(§15) 원천 |
| `TeamPermissions.php:194-198` · `:423-429` · `:737-753` · `:756-784` | clampActions/actionsCover(manage superset·전이적 포함)·ORG_PRESET(role→resource→action→scope·15팀)·seedOrg | 액션 포함·역할 프리셋 | Ontology(§5) 원천 |
| `TeamPermissions.php:599-621` · `:642-692` · `:325-336` · `:337-346` · `:497` · `:615` · `:686` · `:714-731` | putTeamPermissions·putMemberPermissions(DELEGATION_EXCEEDED)·replacePerms/Scope·logAudit·teamAudit | 엣지 변경·감사 | Graph Update(§25 guard 대상) |
| `TeamPermissions.php:120-131` · `:132` · `:134` · `:136` | roleOf(owner\|manager\|member fail-closed)·isAdmin·isOwnerAdmin·isManagerAdmin | 역할 순서(암묵 술어·rank 테이블 없음) | Role rank(PARTIAL) |

### B. Identity/Org 위계 SOURCE 엣지 (PRESENT)

| 파일:라인 | 심볼 | 설명 | Part3-21 매핑 |
|---|---|---|---|
| `UserAuth.php:186-188` · `:175-177` · `:54` · `:217-234` · `:423-426` · `:216-243` · `:421-436` · `:316` | app_user tenant_id/parent_user_id/team_role·owner 판정·tenant 상속(부모엣지)·resolveTenantId·authedTenant | MEMBER_OF/위임 트리 엣지 | Graph Edge(§4·INHERITS/MEMBER_OF) |
| `AdminMenu.php:107-117` · `:133-134` · `:268-272` · `:551-566` · `:504-505` | menu_tree(id/parent_id 자기참조)·wouldCycle(조상체인 순환탐지·depth 100) | 메뉴 위계·순환탐지(authz-인접·KG 엔진 아님) | Static Lint(§26·circular) 원천 |
| `EnterpriseAuth.php:70` · `:72` · `:84` · `:448-462` · `:48-50` · `:87-88` | sso_group_role_map(IdP group→role)·sso_config default_role·SSO role 우선순위 | group→role 엣지 | Graph Edge(§4) |
| `AgencyPortal.php:64` · `:80` · `:301-402` | agency_client_link(agency↔client N:N·status/scope_json) | 조직간 위임 엣지 | FEDERATES_WITH/DELEGATES 엣지 |
| `AdminPlans.php:393` · `:488` · `:523-526` · `MenuPricingSync.php:59` · `:218` | plan_menu_access(plan→menu_key) | 플랜→메뉴 엣지 | Graph Node/Edge |
| `Db.php:942-955` · `:956` · `:948` · `:1004-1011` | api_key(role/scopes_json) DDL·role tier(viewer/analyst/admin) | 머신 identity 노드·역할 tier | Graph Node(§3) |

### C. Evidence / Reasoning infra / Store (PARTIAL — graph-native 아님)

| 파일:라인 | 심볼 | 설명 | Part3-21 매핑 |
|---|---|---|---|
| `SecurityAudit.php:25-31` · `:35-38` · `:51` · `:63-64` | 해시체인 log(prev→sha256)·lastHash·verify | tamper-evident 감사(graph snapshot 없음) | Graph Evidence(§18·PARTIAL)·Immutable Version(§30) |
| `ClaudeAI.php:18` · `:61` · `:70` · `:82` · `:120-322` | class ClaudeAI·complete/assistant·aiKeyConfigured·프롬프트 빌더 | LLM 챗봇(graph reasoning 아님) | Graph Reasoning(§15·infra만)·Semantic Search(§9) |
| `Db.php:126-127` · `:149` · `:170` | PDO mysql·SQLite 폴백·driver 체크 | 관계형 저장소(graph DB 없음) | Store(순수 MySQL) |

## 3. 종합 판정

**Authorization Knowledge Graph = SOURCE-PRESENT(RBAC/ABAC 관계·위계·정책 노드/엣지 원천 풍부) / GRAPH-ABSENT-greenfield(Knowledge Graph Registry·Graph Node/Edge 엔진(authz)·Graph Schema·Ontology Manager·Semantic Model·Entity Relationship Engine·Authorization Graph Builder·Graph Sync·Semantic Search·Relationship Discovery·Dependency Analyzer·Lineage·Impact Analysis·Root Cause·Graph Reasoning·Semantic Recommendation·Graph Snapshot/Evidence(native)/Digest/Analytics(centrality)/Drift/Simulation/Revalidation/Reconciliation·Runtime Guard/Static Lint 순신규) / PARTIAL(SecurityAudit evidence·ClaudeAI reasoning infra·menu-tree DFS·role rank 암묵·순수 MySQL).** 재활용(흡수 아님·확장): TeamPermissions SOURCE→Graph Builder ingest·위계 엣지→Graph Edge·SecurityAudit→Graph Evidence·ClaudeAI→Reasoning/Search infra·menu wouldCycle→circular lint 원천. ★`graph_node`/`graph_edge`(GraphScore 마케팅)·AttributionEngine markov·GeniegoKnowledge 챗봇 KB·DataPlatform 데이터 lineage·product affinity·PM DAG·XML-DSig node/digest(GT②)는 **흡수·오판 금지**.
