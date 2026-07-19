# DSAR — Approval Role Graph Revalidation (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Graph Revalidation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Role Graph(Part 3-2 본체) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Revalidation은 기존 Result 수정 금지·새 Result만 생성 · Legacy 자동활성화 금지 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§60 Role Graph Revalidation은 Role/Permission/Hierarchy/Composite Version 변경, Component 변경, Conflict/Dependency/Exclusion Metadata 변경, Scope Requirement/Actor Eligibility 변경, Organization Hierarchy Version 변경, 수동 요청, 사고, Tamper 탐지, Kill Switch 등 Trigger가 발생했을 때 **기존 Revalidation Result를 In-place 수정하지 않고 새 Result를 생성**하는 재검증 절차다. Revalidation의 대상이 되어야 할 Role Hierarchy/Composite/Graph 자체가 ADR D-5·GROUND_TRUTH §4에서 확정된 대로 저장소에 완전 부재(ABSENT·순신규)이므로, 지금은 "재검증할 Graph 인스턴스"가 없다. 본 문서는 §60 Trigger 목록을 정형화하고, 유일하게 실재하는 위계 유사 substrate 3종(roleRank·parent_user_id·menu_tree)에 Revalidation이 오적용되지 않도록 경계를 설계한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| revalidation id | Revalidation Result PK |
| hierarchy id / composite id / graph id | 대상 |
| hierarchy version id / composite version id / graph version id | 재검증 시점 버전 |
| trigger type | 아래 Trigger Type enum |
| trigger source reference | 변경을 유발한 원 이벤트 참조 |
| previous result reference | 직전 Revalidation Result 참조(수정 대상 아님·읽기 전용) |
| new result id | 이번 Revalidation이 생성하는 새 Result |
| previous digest / current digest | Role Graph Digest(§54) 전후 값 |
| affected role count / affected assignment reference count | 영향 범위 |
| severity | 심각도 |
| runtime blocked | 즉시 런타임 차단 여부 |
| manual review required | 수동 검토 필요 여부 |
| status | 진행 상태 |
| detected at / resolved at | 시점 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Trigger Type**: `ROLE_VERSION_CHANGED · ROLE_SUSPENDED · ROLE_RETIRED · PERMISSION_VERSION_CHANGED · PERMISSION_RETIRED · HIERARCHY_VERSION_CHANGED · COMPOSITE_VERSION_CHANGED · COMPONENT_CHANGED · CONFLICT_METADATA_CHANGED · DEPENDENCY_METADATA_CHANGED · EXCLUSION_METADATA_CHANGED · SCOPE_REQUIREMENT_CHANGED · ACTOR_ELIGIBILITY_CHANGED · ORGANIZATION_HIERARCHY_VERSION_CHANGED · MANUAL_REQUEST · INCIDENT · TAMPER_DETECTION · KILL_SWITCH`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Revalidation Result 자체 | ABSENT(순신규) | Role Graph 부재이므로 재검증 대상 자체가 없음(GROUND_TRUTH §4) |
| ORGANIZATION_HIERARCHY_VERSION_CHANGED Trigger 대상 | Organization Hierarchy Candidate | `parent_user_id`(`UserAuth.php:176,316,423-426`)·`menu_tree.parent_id`(`AdminMenu.php:108,117,268`) 모두 **Version 개념 자체가 없어** 이 Trigger가 지금은 발동 불가(§4·§6.1 오용 대상이지 Role Graph 아님) |
| TAMPER_DETECTION Trigger의 Evidence 후보 오인용 경계 | 감사 해시체인(tamper-evident 아님) | `menu_audit_log` hash_chain(append만·`appendAudit`/`lastHash`)(`AdminMenu.php:123-131,169-219`) — GROUND_TRUTH §5가 명시한 대로 **정본 append-only 해시체인이 아님**. 정본은 `SecurityAudit::verify`(GROUND_TRUTH §5 인용·file:line 미제시)뿐이며, 신규 Revalidation Evidence가 menu_audit_log를 tamper-evident로 오인용 금지 |
| HIERARCHY_VERSION_CHANGED / COMPOSITE_VERSION_CHANGED 대상 | ABSENT(순신규) | Hierarchy/Composite Version 스키마 부재 |
| PERMISSION_VERSION_CHANGED 대상 | BLOCKED_PREREQUISITE | Part 2 Permission Engine 설계 단계·코드 0 |

## 5. 설계 원칙

- Revalidation은 **기존 Result를 수정하지 않고 새 Result만 생성**한다(§60 원문 불변 규율). In-place Update는 §6.5 Versioned Graph 원칙 위반.
- 대상 Role Graph/Hierarchy/Composite가 통째로 ABSENT이므로 이번 차수는 Trigger 분류·Canonical 필드 설계만 수행하고, 실제 재검증 로직은 Role Graph 실 신설 이후로 이연한다.
- ORGANIZATION_HIERARCHY_VERSION_CHANGED Trigger를 `parent_user_id`/`menu_tree`에 지금 연결하지 않는다 — 이들은 Role Graph 밖(ADR D-2)이며 Version 개념이 없어 Trigger 소스가 될 수 없다.
- TAMPER_DETECTION Trigger의 Evidence는 실 append-only 체인(`SecurityAudit::verify`류)만 채택하고, 장식적 해시체인(`menu_audit_log`)을 근거로 사용하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Graph Revalidation의 대상(Hierarchy/Composite/Graph 인스턴스)이 저장소에 전무하여 실 재검증 로직을 지금 구현할 수 없다(**ABSENT·순신규**). 유일하게 근접한 substrate 3종(roleRank/parent_user_id/menu_tree)은 각기 Version/Edge 개념이 없어 Trigger 소스로 사용 불가하며, 그대로 Role Graph 밖에 유지한다(ADR D-1·D-2). 실 구현은 선행 Role Graph·Permission Engine 실 코드화 이후 별도 승인세션(RP-002)에서 진행한다. NOT_CERTIFIED.
