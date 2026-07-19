# DSAR — Role Hierarchy Index & Performance (EPIC 06-A-03-02-03-04 Part 3-2 · Role Hierarchy & Composite Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) + Role Registry Version Binding(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · 무후퇴 · 성능 이유로 Cycle Detection/Deny/Tenant Isolation/Scope Guard/Version Binding 제거 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만 인용·없으면 ABSENT) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지

---

## 1. 목적

§73(Database 제약조건)·§74(Index Strategy)·§75(Performance 원칙)의 **Role Hierarchy/Composite/Graph 데이터 무결성 제약·인덱스·성능 전략**을 정의한다. 제약은 Cycle·Cross-Tenant·Retired 사용 등 잘못된 상태를 스키마 레벨에서 원천 차단하고, 인덱스/성능은 Role 해석 핫패스(Ancestor/Descendant/Composite Flattening)를 감당하되 **무결성 검증을 성능 이유로 제거하지 않는다**(§75 명시). 현행 저장소는 위계 유사 substrate 3종(roleRank/parent_user_id/menu_tree)만 있고 Role Graph 전용 제약·인덱스가 부재하다(순신규).

## 2. Canonical 필드

- **Constraint Category** — Uniqueness(Code+Registry+Tenant) / Structural(Source≠Target·Component≠Composite) / Temporal(Valid From<Valid To·Overlap 방지) / Lifecycle(Retired/Invalid Transition 방지) / Immutability(Version/Snapshot/Evidence/Audit Update 방지) / Cross-Tenant FK 차단
- **Index Category** — Registry/Code Lookup · Active Version Projection · Node/Edge Traversal(Source/Target) · Composite Component Lookup · Path/Closure Lookup · Conflict/Dependency/Exclusion Lookup · Drift/Migration/Audit Lookup
- **Performance Pattern** — Adjacency List+Closure Projection / Materialized Path / Flattening Projection / Cache(Version-keyed·Tenant-partitioned) / Batch Analysis

## 3. 열거형 / 타입

### 3.1 §73 Database 제약조건

| 제약 |
|---|
| Hierarchy Code + Registry + Tenant **Unique** |
| Hierarchy Version Number + Hierarchy **Unique** |
| Composite Code + Registry + Tenant **Unique** |
| Composite Version Number + Composite **Unique** |
| Graph Version Number + Graph **Unique** |
| **Source Node ≠ Target Node**(Self-reference 차단) |
| **Component Role ≠ Composite Role**(자기포함 차단) |
| **Cross-Tenant FK 차단** |
| **Active Version Overlap 방지**(동시 활성 1) |
| **Valid From < Valid To** |
| **Maximum Depth > 0** |
| **Duplicate Edge/Component 방지** |
| **Retired Role Active Edge/Component 방지** |
| **Missing Role/Permission Version 방지** |
| **Immutable Version/Snapshot/Evidence/Audit Update 방지**(트리거/권한) |
| **Cycle Activation 방지** |
| **Invalid Lifecycle Transition 방지**(허용 전이표 외 금지) |
| **Logical Deletion Policy** |

★**Cycle은 DB Constraint만으로 불충분** → Transactional Domain Validation·Activation Gate 병행 필수(§73 명시 원칙).

### 3.2 §74 Index Strategy

| 인덱스 |
|---|
| Hierarchy Registry (Tenant, Code) |
| Hierarchy (Tenant, Code) |
| Hierarchy Active Version |
| Hierarchy Version (Hierarchy, Number) |
| Hierarchy Node (Version, Role) |
| Hierarchy Edge (Version, Source) |
| Hierarchy Edge (Version, Target) |
| Hierarchy Edge (Source, Target, Type) |
| Composite (Tenant, Code) |
| Composite Active Version |
| Composite Version (Composite, Number) |
| Composite Component (Version, Role) |
| Component (Role, Status) |
| Graph (Tenant, Code) |
| Graph Active Version |
| Graph Version (Graph, Number) |
| Graph Node (Version, Role) |
| Graph Edge (Version, Source) |
| Graph Edge (Version, Target) |
| Role Path (Version, Source, Target) |
| Effective Inherited Set (Source Role) |
| Effective Composite Set (Composite Version) |
| Conflict (Role A, Role B) |
| Dependency (Source, Required) |
| Exclusion (Source, Excluded) |
| Drift (Hierarchy, Type) |
| Migration (Source System, Source Hierarchy) |
| Audit (Event Type, Occurred At) |

### 3.3 §75 Performance 원칙

| 전략 |
|---|
| Adjacency List + Closure Projection |
| Precomputed Transitive Closure |
| Versioned Materialized Path |
| Ancestor/Descendant Projection |
| Composite Flattening Projection |
| Effective Permission/Deny Projection |
| Role Path Cache |
| **Cycle Detection at Write Time** |
| **Maximum Depth Guard** |
| Incremental Graph Rebuild |
| Event-driven Cache Invalidation |
| Batch Impact Analysis |
| Bulk Ancestor/Descendant Lookup |
| Bulk Composite Resolution |
| Tenant-partitioned Graph |
| Immutable Version Cache |
| Graph Digest Fast Verification |
| Conflict/Compatibility Precomputation |
| Permission/Scope Similarity Projection |

★**성능 이유로 Cycle Detection·Explicit Deny·Tenant Isolation·Scope Guard·Version Binding 제거 금지**(§75 명시 원칙).

## 4. 실 substrate 매핑 (§5.2)

| Canonical 제약/인덱스축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| roleRank 선형 rank(제약·버전 없음) | **PARTIAL → 정규화 대상** | `index.php:573,592-595` |
| parent_user_id tenant 상속(FK성 격리) | **Organization Hierarchy Candidate(Role Graph 밖·§6.1)** | `UserAuth.php:176,316,423-426` |
| menu_tree parent_id + `idx_menu_tree_parent` | **근접 인덱스 패턴(메뉴 도메인·Role Graph 아님)** | `AdminMenu.php:108,117,268` |
| menu_tree cycle guard(Write-time 차단 패턴) | **근접 알고리즘 패턴(§75 Cycle Detection at Write Time 참조)** | `AdminMenu.php:540-555` |
| team_role→acl_permission(묶음·인덱스 미지정) | **Permission Group Candidate(Composite 아님)** | `TeamPermissions.php:152` |
| Role Hierarchy/Composite/Graph 전용 제약·인덱스 | **ABSENT → 신설** | 없음(도메인 순신규) |
| Immutable Snapshot/Evidence/Audit 제약 | **ABSENT** | `menu_audit_log` hash_chain은 append만·tamper-evident 아님(`AdminMenu.php:123-131,169-219`) — Role Graph Immutability 정본으로 재사용 금지 |
| Permission Version FK | **BLOCKED_PREREQUISITE** | Part 2 이후 |

## 5. 설계 원칙

1. **무결성 제약을 성능 이유로 제거 금지** — Cycle Detection/Explicit Deny/Tenant Isolation/Scope Guard/Version Binding은 캐시·프로젝션 최적화 하류가 아니라 스키마 제약+Write-time 검증으로 강제(§75 명시 원칙).
2. **Cycle은 DB Constraint 단독 불충분** — Transactional Domain Validation·Activation Gate 병행(§73). menu_tree `wouldCycle`(Write-time walk)이 알고리즘 패턴 참조이나 Role 전용 재구현 필요(직접 재사용 금지·§6.1).
3. **Unique로 값충돌 원천 차단** — Hierarchy/Composite/Graph Code+Registry+Tenant Unique가 roleRank 3중복 리터럴(`index.php:573`·`AdminMenu.php:74,338` — Duplicate Audit D-6) 같은 산재를 재유입하지 않도록 스키마 레벨 차단.
4. **Cross-Tenant FK 차단은 데이터 행필터와 별개축** — 기존 tenant 격리(TeamPermissions data_scope·parent_user_id)는 데이터 행 필터이지 Role Graph 정의 자체의 FK 격리가 아님. 별도 강제 필요.
5. **Immutable = 스키마·권한으로 봉인** — Snapshot/Evidence/Audit/Historical Version은 UPDATE 트리거/권한 회수로 물리적 수정 불가(Append-only). `menu_audit_log`를 정본으로 재사용 금지.
6. **Tenant-partitioned Cache + Graph Digest Fast Verification** — 캐시 키에 tenant+Graph Version 필수(Cross-Tenant Cache Poisoning 방지·§69 가드와 정합).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Version FK·Effective Permission/Deny Projection은 Part 2 이후. Node/Edge Role Version 결합은 Part 3-1 이후.
- **Gap(순신규)**: Hierarchy/Composite/Graph 전용 Unique/Overlap/Valid-range/Immutable/Lifecycle 제약·28개 Index·18개 Performance 전략 전무.
- **근접패턴(재사용 아닌 참조)**: menu_tree adjacency+cycle guard·index(`AdminMenu.php:108,117,268,540-555`)는 메뉴 도메인 — Role Graph가 직접 흡수 금지.
- **판정**: NOT_CERTIFIED · 실 DDL/인덱스/캐시 = Registry/Graph 신설 + Part 2/3-1 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_HIERARCHY_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_TEST_STRATEGY]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE]]
