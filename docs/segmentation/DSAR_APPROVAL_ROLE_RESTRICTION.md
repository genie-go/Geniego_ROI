# DSAR — Approval Role Restriction (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Restriction)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Role Restriction은 스펙 §16이 정의하는 `RESTRICTS` Edge 관계로, Source/Target Role의 Permission/Scope를 제한한다. 지원 범위: Permission Exclusion · Explicit Deny 추가 · Resource Type/Instance 제한 · Organization/Legal Entity 제한 · Field/Data Category 제한 · Channel/Client 제한 · Time 제한 · Actor Type 제한. 핵심 원칙은 **Restriction이 Allow보다 우선**한다는 것이며(§38 Role Permission Precedence의 상위 순위 다수가 Restriction/Deny 계열), Role Specialization(§15 SPECIALIZES·Scope 축소이되 Base 기능 유지)과 달리 Restriction은 명시적 **금지/차단**을 추가하는 관계다.

## 2. Canonical 필드

Restriction도 `APPROVAL_ROLE_HIERARCHY_EDGE`(§12)의 `edge_type=RESTRICTS` 인스턴스로 표현된다:

| 필드 | 의미 |
|---|---|
| `edge_id` / `hierarchy_version_id` | Edge 식별자·소속 Version |
| `source_node_id` / `target_node_id` | Restriction을 가하는 Role → 제한 대상 Role |
| `source_role_version_id` / `target_role_version_id` | 버전 결합 |
| `edge_type` | 고정값 `RESTRICTS` |
| `permission_propagation_policy` | Permission Exclusion 반영 |
| `deny_propagation_policy` | Explicit Deny 추가·전파(§6.8 Explicit Deny 보존과 결합 — Restriction이 Deny의 주 발생원) |
| `scope_propagation_policy` | Resource/Organization/Legal Entity/Field/Data Category/Channel/Client/Time 제한 반영 |
| `constraint_propagation_policy` | Actor Type 제한 등 |
| `priority` | §38 Precedence 순위 결합(Role Restriction Deny=3순위) |
| `valid_from` / `valid_to` / `status` / `immutable_digest` / `evidence` | 공통 거버넌스 필드 |

## 3. 열거형 / 타입

- **Edge Type**(§12): `RESTRICTS`.
- **Restriction 지원 범위**(§16 원문 열거): Permission Exclusion · Explicit Deny 추가 · Resource Type/Instance 제한 · Organization/Legal Entity 제한 · Field/Data Category 제한 · Channel/Client 제한 · Time 제한 · Actor Type 제한.
- **Role Permission Precedence**(§38, Restriction 관련 상위 순위): 1 Platform Security Explicit Deny · 2 Tenant Security Explicit Deny · 3 **Role Restriction Deny** · 4 Composite Excluded Permission · 5 Component Explicit Deny · 6 Inherited Explicit Deny · 7 Role Exclusion · 8 More Specific Scoped Allow · ... 14 Default Deny.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| `RESTRICTS` Edge | **ABSENT → 신설** | Role↔Role 제한 관계 개념 부재(전수조사 §4 Role Conflict/Exclusion/Dependency/Compatibility 계열과 함께 "전무") |
| Explicit Deny(Role 계층) | **ABSENT** | 전수조사·중복감사 어디에도 Role Explicit Deny 개념 substrate 언급 없음 |
| Permission Exclusion/Field/Channel/Time 제한(Role 결합) | **ABSENT** | 없음 |

★근접 substrate: 전수조사 §5 근접 패턴 표에는 Restriction/Explicit Deny에 대응하는 항목이 없다(cycle detection·effective resolver·preset·rank·silo RBAC·snapshot·audit chain·admin SSOT 7종뿐). 따라서 Role Restriction은 **참조할 비-Role 근접 패턴조차 없는 순수 신설 영역**이며, 없는 것을 있다고 인용하지 않는다(반날조 원칙).

## 5. 설계 원칙

1. **Restriction이 Allow보다 우선**(스펙 §16 원문) — §38 Precedence에서 Role Restriction Deny(3순위)가 Direct/Inherited Role Permission(9·12순위)보다 상위.
2. **Explicit Deny 보존**(§6.8) — Restriction으로 추가된 Deny는 Composite/Inheritance 과정에서 소실 금지.
3. **8종 제한 범위 명시**(§16) — Permission/Resource/Organization/Legal Entity/Field/Channel/Time/Actor Type. 범위 밖 임의 확장 금지.
4. **RESTRICTS ≠ EXCLUDES**(§19) — Restriction은 Permission/Scope 제한, Exclusion(§19)은 Role 자체의 상호배타. 두 Edge Type은 별개 엔티티(본 문서와 `DSAR_APPROVAL_ROLE_EXCLUSION` 분리).
5. **Golden Rule** — 근접 substrate조차 부재 확인(§4) → 순신설이며 기존 오용 위험 substrate(roleRank/parent_user_id/menu_tree)를 Restriction Edge로 흡수 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: `RESTRICTS` Edge·Explicit Deny 전파 실 강제는 선행 Permission Engine(Part 2) Explicit Deny 개념 실구현 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `RESTRICTS` Edge Type·Role 수준 Explicit Deny·8종 제한 범위 전부 순신설.
- **Gap-2**: §38 Role Permission Precedence 14단계 전체가 순신설(현행 role→permission 매핑은 `TeamPermissions.php:152` 단순 조회이며 우선순위 계층 없음).
- **정직 부재**: 근접 알고리즘조차 참조 대상 없음(§4) — 날조 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
