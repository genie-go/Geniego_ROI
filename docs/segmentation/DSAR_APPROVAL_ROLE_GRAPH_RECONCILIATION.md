# DSAR — Approval Role Graph Reconciliation (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Graph Reconciliation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Role Graph(Part 3-2 본체) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Revalidation/Reconciliation은 기존 Result 수정 금지 · Legacy 자동활성화 금지 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§61 Role Graph Reconciliation은 Registry↔Definition, Definition↔Active Version, Version↔Node/Edge, Composite Role↔Active Composite Version, Graph Closure↔Current Edge Set, Graph Digest↔Stored Digest, **IAM/ERP/Workflow Hierarchy↔Canonical Hierarchy**, Existing Assignment Reference↔Retired Role, Legacy Composite↔Canonical Composite 등을 상호 비교해 정합성을 검증하는 절차다. 비교의 한쪽 축(Canonical Role Graph)이 통째 ABSENT이며, 다른 한쪽 축(IAM/ERP/Workflow nested hierarchy adapter)도 GROUND_TRUTH §4에서 "전무"로 확인됐다 — 즉 **비교할 두 대상이 모두 없다.** 유일하게 실재하는 것은 SSO group→role **평면(1-hop) 매핑**뿐이며 이는 Nested Hierarchy가 아니다. 본 문서는 §61 비교 목록을 이 저장소 실측과 대조해 정직하게 등재한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| reconciliation id | Reconciliation Result PK |
| comparison type | 아래 Comparison Type enum |
| left reference / right reference | 비교 대상 두 축(예: Graph Closure vs Current Edge Set) |
| left digest / right digest | 각 축의 다이제스트 |
| match result | MATCH / MISMATCH / PARTIAL |
| mismatch detail | 불일치 상세(누락 Node·Edge·Version 등) |
| severity | 심각도 |
| affected role count | 영향 Role 수 |
| detected at | 탐지 시각 |
| status | 처리 상태 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Comparison Type**: `REGISTRY_VS_DEFINITION · DEFINITION_VS_ACTIVE_VERSION · VERSION_VS_NODES · VERSION_VS_EDGES · NODE_ROLE_VERSION_VS_ACTIVE_ROLE_VERSION · EDGE_TENANT_VS_NODE_TENANT · COMPOSITE_VS_ACTIVE_COMPOSITE_VERSION · COMPOSITE_VERSION_VS_COMPONENTS · COMPONENT_ROLE_VS_ROLE_REGISTRY · COMPONENT_ROLE_VERSION_VS_ACTIVE_VERSION · ROLE_PERMISSION_PROJECTION_VS_PERMISSION_REGISTRY · EXPLICIT_DENY_PROJECTION_VS_PERMISSION_DENY · SCOPE_PROPAGATION_VS_SCOPE_REQUIREMENT · ACTOR_ELIGIBILITY_RESULT_VS_ROLE_ELIGIBILITY · CONFLICT_RESULT_VS_CONFLICT_METADATA · DEPENDENCY_RESULT_VS_DEPENDENCY_METADATA · GRAPH_CLOSURE_VS_CURRENT_EDGE_SET · GRAPH_DIGEST_VS_STORED_DIGEST · IAM_COMPOSITE_VS_CANONICAL_COMPOSITE · ERP_HIERARCHY_VS_CANONICAL_HIERARCHY · WORKFLOW_HIERARCHY_VS_CANONICAL_HIERARCHY · SNAPSHOT_VS_CURRENT_VERSION_REFERENCE · EXISTING_ASSIGNMENT_REFERENCE_VS_RETIRED_ROLE · LEGACY_COMPOSITE_VS_CANONICAL_COMPOSITE`

## 4. 실 substrate 매핑 (§5.2)

| Comparison Type | §5.2 태그 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| REGISTRY_VS_DEFINITION / DEFINITION_VS_ACTIVE_VERSION / VERSION_VS_NODES / VERSION_VS_EDGES | ABSENT(순신규) | Registry·Definition·Version·Node·Edge 스키마 전무(GROUND_TRUTH §4) |
| COMPOSITE_VS_ACTIVE_COMPOSITE_VERSION / COMPOSITE_VERSION_VS_COMPONENTS | ABSENT(순신규) | Composite Role/Component/Nested = grep 0건(GROUND_TRUTH §4) |
| ROLE_PERMISSION_PROJECTION_VS_PERMISSION_REGISTRY | PARTIAL(정형화 대상) | team_role→acl_permission 매핑(`TeamPermissions.php:152`)은 실재하나 이는 **Role→Permission 묶음이지 Composite Projection이 아님**(ADR D-2 §6.3). Permission Registry(Part 2)도 설계 단계 |
| GRAPH_CLOSURE_VS_CURRENT_EDGE_SET / GRAPH_DIGEST_VS_STORED_DIGEST | ABSENT(순신규) | Closure/Digest 개념 전무 |
| IAM_COMPOSITE_VS_CANONICAL_COMPOSITE / ERP_HIERARCHY_VS_CANONICAL_HIERARCHY / WORKFLOW_HIERARCHY_VS_CANONICAL_HIERARCHY | **양변 ABSENT** | GROUND_TRUTH §4 "IAM/Keycloak/LDAP/AD nested group·ERP/Workflow role hierarchy adapter = 전무". 유일 실재는 SSO group→role **평면 매핑**(`EnterpriseAuth.php:70-88`·`:78-88`)뿐이며 이는 Nested Composite/Hierarchy가 아니므로 이 Comparison Type의 좌변 자체가 없음(반날조: 없는 IAM Composite를 있다고 서술 금지) |
| EXISTING_ASSIGNMENT_REFERENCE_VS_RETIRED_ROLE | ABSENT(순신규) | Assignment(Part 3-3)·Retired Lifecycle 모두 미신설 |
| LEGACY_COMPOSITE_VS_CANONICAL_COMPOSITE | **양변 ABSENT** | Legacy Composite 자체 부재(§65 참조) |

## 5. 설계 원칙

- 비교의 **좌변(Canonical Role Graph)과 우변(IAM/ERP/Workflow adapter)이 모두 ABSENT**임을 정직하게 등재한다 — "중복이 발견되지 않음"이 아니라 "비교할 두 대상 자체가 없음"으로 구분(DUPLICATE_AUDIT §0 동형 판정).
- SSO group→role(`EnterpriseAuth.php:70-88`)을 IAM_COMPOSITE_VS_CANONICAL_COMPOSITE의 근거로 오인용 금지 — 이는 1-hop 평면 매핑이며 Nested Composite가 아니다(ADR D-1 "IAM Group Nesting Candidate(Adapter)").
- ROLE_PERMISSION_PROJECTION_VS_PERMISSION_REGISTRY만 유일하게 편측 실재(`TeamPermissions.php:152`)하나, 이는 Composite Projection이 아니라 별도 Role→Permission 묶음이므로 Reconciliation 좌변으로 흡수 금지.
- Reconciliation 결과는 자동 수정(auto-fix) 금지 — Drift(§58·§59) 등재 및 Manual Review로만 처리.

## 6. Gap / BLOCKED_PREREQUISITE

23개 Comparison Type 중 대다수가 양변 ABSENT(비교 불능), ROLE_PERMISSION_PROJECTION_VS_PERMISSION_REGISTRY만 편측 실재(BLOCKED_PREREQUISITE·Permission Registry 미신설). IAM/ERP/Workflow Comparison은 어댑터 자체가 전무하므로 §114-116(IAM/ERP/Workflow Role Hierarchy Adapter)이 실 구현된 이후에만 의미를 가진다. 실 Reconciliation 로직은 Canonical Role Graph 신설 + 선행 Permission Engine 실구현 이후 별도 승인세션(RP-002). NOT_CERTIFIED.
