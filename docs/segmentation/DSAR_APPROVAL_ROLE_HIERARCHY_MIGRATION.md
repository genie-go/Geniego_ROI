# DSAR — Approval Role Hierarchy Migration (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Migration)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Role Graph(Part 3-2 본체) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Legacy 자동활성화 금지 · 없는 legacy adapter를 있다고 날조 금지 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§64(Existing Hierarchy Migration·문서 코드 `APPROVAL_ROLE_HIERARCHY_MIGRATION`)는 기존 분산 Hierarchy 표현(DB parent 컬럼·IAM/Keycloak/LDAP/AD nested group·ERP/Workflow role hierarchy·JSON tree·하드코딩 include 등)을 Canonical Role Hierarchy Edge로 매핑하는 절차다. ★GROUND_TRUTH §4가 명시한 대로 **IAM/Keycloak/LDAP/AD/ERP/Workflow nested hierarchy adapter는 이 저장소에 전무(ABSENT)**하며, SSO group→role은 **평면(1-hop) 매핑**(`EnterpriseAuth.php:70-88`)일 뿐 nested group이 아니다. 따라서 이번 Migration DSAR는 "실제 마이그레이션할 legacy가 있다"고 서술하지 않고, **Legacy Source Type enum 각 값에 대해 이 저장소에 대응 substrate가 있는지 없는지를 정직하게 판정**하는 문서다.

## 2. Canonical 필드

migration id · source system · source type · source hierarchy code · source parent role · source child role · source direction · source permissions · source scope behavior · source deny behavior · source actor behavior · target hierarchy id · target hierarchy version id · target edge type · target source role version · target role version · semantic equivalence · direction equivalence · permission equivalence · scope equivalence · actor equivalence · conflict result · cycle risk · expansion risk · mapping confidence · automatic migration allowed(**기본 false**) · manual review required · status · immutable digest · evidence.

## 3. 열거형 / 타입

**Legacy Source Type**: `DATABASE_PARENT_ROLE · IAM_COMPOSITE_ROLE · KEYCLOAK_COMPOSITE · LDAP_NESTED_GROUP · AD_NESTED_GROUP · ERP_ROLE_HIERARCHY · WORKFLOW_ROLE_GROUP · JSON_ROLE_TREE · CONFIG_ROLE_INHERITANCE · HARDCODED_ROLE_INCLUDE · USER_TYPE_HIERARCHY · JOB_GRADE_HIERARCHY · ORGANIZATION_HIERARCHY_MISUSE · CUSTOM · UNKNOWN`

## 4. 실 substrate 매핑 (§5.2 · Legacy Source Type별 정직 판정)

| Legacy Source Type | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| `DATABASE_PARENT_ROLE` | **근접(단, Role 상속 아님)** | api_key `roleRank` 선형 rank(`index.php:573,592-595`)는 DB 컬럼이 아닌 하드코딩 배열이며, parent-child edge가 아니라 4단 정수 순서. 정확히는 DATABASE_PARENT_ROLE이 아닌 `HARDCODED_ROLE_INCLUDE`에 더 가까움(ADR D-1) |
| `IAM_COMPOSITE_ROLE` / `KEYCLOAK_COMPOSITE` / `LDAP_NESTED_GROUP` / `AD_NESTED_GROUP` | **ABSENT(정직)** | GROUND_TRUTH §4 "IAM/Keycloak/LDAP/AD nested group hierarchy adapter = 전무". 실재하는 것은 SSO group→role **평면 매핑**(`EnterpriseAuth.php:70-88`·`:78-88`)뿐이며 이는 Nested Group이 아니므로 이 4개 Source Type의 실체가 없음 — **없는 legacy를 있다고 날조 금지** |
| `ERP_ROLE_HIERARCHY` / `WORKFLOW_ROLE_GROUP` | **ABSENT(정직)** | GROUND_TRUTH §4 "ERP/Workflow role hierarchy adapter = 전무" |
| `JSON_ROLE_TREE` | **ABSENT(정직)** | Role 대상 JSON tree 부재. (참고: `menu_tree`는 실재 인접리스트+closure이나 대상이 메뉴이지 Role이 아니며 §6.1 오용 대상·`AdminMenu.php:108,117,268`) |
| `CONFIG_ROLE_INHERITANCE` | **ABSENT(정직)** | 설정 기반 Role 상속 개념 부재 |
| `HARDCODED_ROLE_INCLUDE` | **실재** | roleRank 리터럴이 3곳 하드코딩 중복(`index.php:573`·`AdminMenu.php:74`·`AdminMenu.php:338`·DUPLICATE_AUDIT D-6) — Role 순서 하드코딩의 실 사례. 단 "include"(포함 관계)가 아니라 "순서(rank)" |
| `USER_TYPE_HIERARCHY` | **ABSENT(정직)** | User Type 기반 Role 위계 부재 |
| `JOB_GRADE_HIERARCHY` | **ABSENT(정직)** | Job Grade/Title 기반 Role 위계 부재(Part 3-1 GROUND_TRUTH와 정합) |
| `ORGANIZATION_HIERARCHY_MISUSE` | **실재 위험(오용 경계)** | `parent_user_id` 계정 위계(owner→member·`UserAuth.php:176,316,423-426`)·`menu_tree.parent_id` 메뉴 트리(`AdminMenu.php:108,117,268`)가 Role Hierarchy로 오용될 **위험 substrate**(ADR D-1·§6.1). 이들 자체는 Migration 대상이 아니라 **Role Graph 밖 유지 대상**(ADR D-2) |
| `CUSTOM` / `UNKNOWN` | N/A | 해당 없음 |

## 5. 설계 원칙

- **IAM/ERP/Workflow Role Hierarchy Adapter(스펙 §114~§116)는 "Adapter Requirement"로만 등재**하고 지금 구현하지 않는다 — 매핑할 실 legacy nested hierarchy가 이 저장소에 없기 때문(ADR D-1 "IAM Group Nesting Candidate(Adapter)"는 SSO group→role 평면 매핑용이지 nested hierarchy 어댑터가 아님).
- `automatic migration allowed`는 **기본값 false**(§65 Legacy Composite 자동 활성화 금지와 동형 원칙). 어떤 Legacy Source Type도 자동 마이그레이션 허용하지 않는다.
- `ORGANIZATION_HIERARCHY_MISUSE` 판정된 `parent_user_id`/`menu_tree`는 **Migration 대상이 아니라 Role Graph 밖 유지 대상**임을 명확히 한다 — Migration으로 흡수하면 §6.1(Role Hierarchy ≠ Organization Hierarchy) 정면 위반.
- `HARDCODED_ROLE_INCLUDE`(roleRank 3곳 중복)는 유일하게 실 마이그레이션 후보이나, "포함(include)"이 아니라 "순서(rank)"이므로 Migration 시 Edge Type이 아닌 Role Category/Actor 축 Registry로 정규화(ADR D-1 결정과 동일).
- SSO group→role(`EnterpriseAuth.php:70-88`)은 Migration 대상이 아니라 **별도 Cross-Registry IAM Adapter**(§48)로 유지 — Role Graph 내부 edge로 흡수 금지.

## 6. Gap / BLOCKED_PREREQUISITE

Legacy Source Type 15종 중 **IAM/Keycloak/LDAP/AD/ERP/Workflow/JSON/Config/UserType/JobGrade 9종은 정직하게 ABSENT**. 유일 실재는 `HARDCODED_ROLE_INCLUDE`(roleRank 중복)이며, `ORGANIZATION_HIERARCHY_MISUSE`(parent_user_id/menu_tree)는 Migration 대상이 아닌 경계 유지 대상. §114~116 IAM/ERP/Workflow Adapter는 Adapter Requirement 설계만 등재하고 실 코드화하지 않는다. 실 Migration 엔진은 Role Graph 실 신설 이후 별도 승인세션(RP-002). NOT_CERTIFIED.
