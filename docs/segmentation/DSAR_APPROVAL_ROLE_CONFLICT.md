# DSAR — Approval Role Conflict (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Conflict)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Role Conflict는 스펙 §18이 정의하는 `APPROVAL_ROLE_CONFLICT` 엔티티로, 두 Role이 동시에 한 Subject/Composite에 결합될 수 없거나 결합 시 위험을 유발하는 관계를 정형화한다. **전체 SoD(Segregation of Duties) Governance는 후속 Part**이나, **Critical Conflict는 이번 Part에서 Composite 활성화·Runtime Resolution 차단** 대상으로 명시된다(§18 원문).

## 2. Canonical 필드

`APPROVAL_ROLE_CONFLICT`(스펙 §18 필수 필드 원문):

| 필드 | 의미 |
|---|---|
| `conflict_id` | 식별자(PK) |
| `role_a_definition_id` / `role_a_version_id` | 충돌 대상 A |
| `role_b_definition_id` / `role_b_version_id` | 충돌 대상 B |
| `conflict_type` | §3 Conflict Type |
| `severity` | 심각도(Critical 여부가 활성화/Runtime 차단 판단 기준) |
| `same_tenant_only` | 동일 테넌트 내에서만 충돌 판정 여부 |
| `same_scope_only` | 동일 Scope 내에서만 충돌 판정 여부 |
| `cross_scope_behavior` | Scope가 다를 때의 처리 |
| `actor_type_behavior` | Actor Type별 처리(§6.9 Human↔Machine 경계와 연계) |
| `composition_blocked` | Composite Role 구성 시 차단 여부 |
| `runtime_blocked` | Runtime Effective Role Resolution 차단 여부 |
| `sod_rule_reference` | 선택 — 전체 SoD Governance(후속 Part) 참조 |
| `resolution_policy_reference` | 충돌 해소 정책 참조 |
| `valid_from` / `valid_to` / `status` / `immutable_digest` / `evidence` | 공통 거버넌스 필드 |

## 3. 열거형 / 타입

- **Conflict Type**(§18): `MUTUALLY_EXCLUSIVE` · `TOXIC_COMBINATION_REFERENCE` · `REQUESTER_APPROVER_CONFLICT` · `CREATOR_APPROVER_CONFLICT` · `OPERATOR_AUDITOR_CONFLICT` · `ADMIN_AUDITOR_CONFLICT` · `HUMAN_MACHINE_CONFLICT` · `PERMISSION_CONFLICT` · `EXPLICIT_DENY_CONFLICT` · `SCOPE_CONFLICT` · `ACTOR_ELIGIBILITY_CONFLICT` · `LIFECYCLE_CONFLICT` · `CUSTOM`.
- **범위 경계**: 전체 SoD Governance(정책 수립·심사 프로세스)는 후속 Part. 이번 Part는 **Critical Conflict의 Composite 활성화·Runtime Resolution 차단**만 담당(§18 원문).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Conflict(Role↔Role 배타 관계) | **ABSENT** | 전수조사 §4: "Role Conflict / Exclusion / Dependency / **Compatibility**(SoD 방향) = 전무" |
| `REQUESTER_APPROVER_CONFLICT`/`CREATOR_APPROVER_CONFLICT` 등 구체 SoD 유형 | **ABSENT** | isManager/isApprover/Job Title 등 판정 기반 자체가 Part 3-1 §4에서 부재 확인(본 ADR §6 인용) |
| `HUMAN_MACHINE_CONFLICT` | **ABSENT**(단 근접 경계 원칙은 실재) | Actor Eligibility 교집합 원칙(§6.9)은 설계 명세로 존재하나, Role Conflict 엔티티로서의 탐지·차단 substrate는 없음 |

★근접 substrate 없음. 전수조사 §5 근접 패턴 표 7종에 Role Conflict/SoD 판정에 대응하는 항목 없음(반날조 원칙 — 지어내지 않음).

## 5. 설계 원칙

1. **Critical Conflict = 이번 Part에서 차단, 전체 SoD는 후속**(§18 원문 명시 경계) — 과잉 구현(전체 SoD 엔진) 금지.
2. **Composite 활성화·Runtime Resolution 양쪽 차단**(`composition_blocked`/`runtime_blocked`) — 설계 시점 차단만으로 불충분, Runtime 재검증 필요(§69 Runtime Guard "Permission Conflict"·"Human·Machine Role Conflict" 항목과 연계).
3. **Human↔Machine 교집합 원칙과 결합**(§6.9·§27 Composite Role Actor Eligibility) — `HUMAN_MACHINE_CONFLICT` Type은 이 원칙의 위반을 탐지하는 구체화.
4. **Conflict ≠ Exclusion**(§19) — Conflict는 "동시 결합 시 위험"(정책적 판단·severity 축), Exclusion(§19)은 "구조적 상호배타"(단순 존재 배제). 별도 엔티티 유지.
5. **Golden Rule** — SoD 판정 기반(isManager/isApprover 등) 부재를 Part 3-1이 이미 확인했으므로, Role Conflict는 그 위에 세울 순신설 계층이며 기존 substrate 재해석으로 대체 불가.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Conflict 탐지·Composition/Runtime 차단 실 강제는 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `APPROVAL_ROLE_CONFLICT` 테이블·13종 Conflict Type·severity 판정 로직 전부 순신설.
- **Gap-2**: SoD 판정 기반 자체 부재(Part 3-1 §4 재확인) — Conflict Type 중 Requester/Approver·Creator/Approver·Operator/Auditor·Admin/Auditor 유형은 선행 Job Title/isManager/isApprover 개념 신설이 별도 전제.
- **정직 부재**: 근접 패턴 없음(§4) — 날조 금지. 전체 SoD Governance는 명시적으로 후속 Part 범위(이번 문서 범위 아님).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
