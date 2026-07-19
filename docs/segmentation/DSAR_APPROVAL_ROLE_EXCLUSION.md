# DSAR — Approval Role Exclusion (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Exclusion)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Role Exclusion은 스펙 §19가 정의하는 `APPROVAL_ROLE_EXCLUSION` 엔티티로, 한 Role이 다른 Role과 구조적으로 상호배타함을 정형화한다. 스펙 예시: READ_ONLY excludes EDITOR · SUPPORT excludes APPROVER · SERVICE_EXECUTOR excludes MANUAL_OVERRIDE · AUDITOR excludes TRANSACTION_CREATOR. 핵심 원칙은 **Exclusion이 Inclusion(§13)·Implication(§12 IMPLIES)보다 우선**한다는 것이다(§19 원문).

## 2. Canonical 필드

`APPROVAL_ROLE_EXCLUSION`(스펙 §19 필수 필드 원문):

| 필드 | 의미 |
|---|---|
| `exclusion_id` | 식별자(PK) |
| `source_role_version_id` | 배제를 가하는 Role |
| `excluded_role_version_id` | 배제되는 Role |
| `exclusion_direction` | 방향성(단방향/양방향) |
| `scope_behavior` | Scope 겹침 시 처리 |
| `permission_behavior` | Permission 겹침 시 처리 |
| `actor_behavior` | Actor Type 겹침 시 처리 |
| `severity` | 심각도 |
| `runtime_enforcement` | Runtime 강제 여부 |
| `status` / `evidence` | 공통 거버넌스 필드 |

## 3. 열거형 / 타입

- 스펙 §19는 별도 Type enum을 명시하지 않고 예시(READ_ONLY excludes EDITOR 등)와 필드·우선순위 원칙만 제공한다. Exclusion의 **방향성**(`exclusion_direction`)은 §12 Edge 공통 개념(`INHERITANCE_DIRECTION`: `PARENT_INHERITS_CHILD`·`CHILD_INHERITS_PARENT`·`EXPLICIT_EDGE_DIRECTION_ONLY`)과 동일 값공간을 재사용한다(스펙에 별도 Exclusion 전용 Direction enum 없음 — §9 Direction과 구조적으로 동형이라는 것이지 §19 원문이 별도 정의한 것은 아님을 명시).
- **우선순위**(§19 원문): Exclusion > Inclusion(§13 INCLUDES) · Exclusion > Implication(§12 IMPLIES).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Exclusion(구조적 상호배타) | **ABSENT** | 전수조사 §4: "Role Conflict / **Exclusion** / Dependency / Compatibility(SoD 방향) = 전무" |
| `Role_Permission_Precedence` 내 `Role Exclusion`(7순위) | **ABSENT**(§38 전체가 순신설) | §38 Precedence 14단계 자체가 신규 — 현행 `TeamPermissions.php:152`는 우선순위 없는 단순 조회 |

★근접 substrate 없음. READ_ONLY/EDITOR/APPROVER 유사 명칭 자체는 Part 3-1 전수조사의 5개 role 어휘(team_role owner/manager/member 등)와 값공간이 다르며, 상호배타 관계로 인코딩된 바 없다.

## 5. 설계 원칙

1. **Exclusion이 Inclusion·Implication보다 우선**(§19 원문) — Effective Role Set 계산 시 Exclusion 적용이 Include/Imply 결과를 override.
2. **Exclusion ≠ Conflict**(§18) — Exclusion은 구조적/무조건 배타(예: READ_ONLY와 EDITOR는 정의상 양립 불가), Conflict는 severity·scope 조건부 위험 판정. 별도 엔티티 유지.
3. **Runtime Enforcement 플래그 필수** — 설계 시점 배제만이 아니라 Runtime Guard(§69 "Excluded Role Included")에서 재검증.
4. **Composite Role Component Type과 연계** — §23 Composite Role Component의 `EXCLUDED` Component Type(§21 excluded component supported)이 이 Exclusion 관계를 실제 조합 시점에 반영하는 지점.
5. **Golden Rule** — 근접 substrate 부재 확인 → 순신설. `wms_permissions` 등 별도 도메인 mini-RBAC(`Wms.php:114`)을 Exclusion 판정 근거로 오용 금지(전수조사 §5 "Silo mini-RBAC" — Role Graph 밖 별도 도메인).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Exclusion Runtime 강제(§69 "Excluded Role Included" 차단)는 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `APPROVAL_ROLE_EXCLUSION` 테이블·Exclusion>Inclusion/Implication 우선순위 강제 로직 전부 순신설.
- **Gap-2**: §38 Role Permission Precedence(Exclusion=7순위 포함 14단계) 전체가 순신설.
- **정직 부재**: 근접 패턴 없음(§4) — 날조 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
