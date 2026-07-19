# DSAR — Approval Role Dependency (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Dependency)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Role Dependency는 스펙 §17이 정의하는 `APPROVAL_ROLE_DEPENDENCY` 엔티티로, 한 Role이 다른 Role의 선행 보유를 요구하는 관계를 정형화한다. 스펙 예시: APPROVER requires VIEWER · EXPORTER requires REPORT_VIEWER · CONFIGURATOR requires MODULE_VIEWER. Missing Required Dependency는 Composite Role 활성화 및 Effective Resolution을 차단한다(§17 원문).

## 2. Canonical 필드

`APPROVAL_ROLE_DEPENDENCY`(스펙 §17 필수 필드 원문):

| 필드 | 의미 |
|---|---|
| `dependency_id` | 식별자(PK) |
| `source_role_definition_id` / `source_role_version_id` | 의존을 갖는 Role(예: APPROVER) |
| `required_role_definition_id` / `required_role_version_id` | 선행 요구되는 Role(예: VIEWER) |
| `dependency_type` | §3 Dependency Type |
| `transitive 여부` | 간접 의존(A requires B requires C) 포함 여부 |
| `scope_compatibility_required` | Scope 호환성 요구 여부 |
| `actor_compatibility_required` | Actor Eligibility 호환성 요구 여부 |
| `version_compatibility_required` | Role Version 호환성 요구 여부 |
| `failure_behavior` | 의존 미충족 시 동작(활성화/Resolution 차단) |
| `priority` | 다중 의존 시 순위 |
| `valid_from` / `valid_to` / `status` / `immutable_digest` / `evidence` | 공통 거버넌스 필드 |

## 3. 열거형 / 타입

- **Dependency Type**(§17): `REQUIRED` · `RECOMMENDED` · `CONDITIONAL_REFERENCE` · `PRECONDITION` · `CUSTOM`.
- **Missing Required Dependency 처리**: Composite Role 활성화 차단·Effective Role Resolution 차단(§17 원문 필수 규칙). `RECOMMENDED`는 경고만(§71 Warning Contract `_DEPENDENCY_WARNING`), `REQUIRED`는 Error(§70 `APPROVAL_ROLE_DEPENDENCY_MISSING`).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Role Dependency(선행 Role 요구) | **ABSENT** | 전수조사 §4: "Role Conflict / Exclusion / **Dependency** / Compatibility(SoD 방향) = 전무" — grep 0건 대상에 포함 |
| Permission Dependency(Role과 무관) | **ABSENT**(Permission Engine 영역) | Part 2 Permission Engine 설계 단계·코드 0(선행 ADR 참조) |

★근접 substrate 없음. 전수조사 §5 근접 패턴 표 7종(cycle detection·effective resolver·preset·rank·silo RBAC·snapshot·audit chain·admin SSOT) 중 Role Dependency에 대응하는 항목은 없다 — 있지도 않은 "선행 요구 Role" 로직을 근접으로 지어내지 않는다(반날조 원칙).

## 5. 설계 원칙

1. **Missing Required Dependency = 활성화/Resolution 차단**(§17 원문·§70 Error Contract `APPROVAL_ROLE_DEPENDENCY_MISSING`).
2. **Dependency ≠ Conflict/Exclusion** — Dependency는 "필요"(positive) 관계, Conflict(§18)/Exclusion(§19)은 "배타"(negative) 관계. 별도 엔티티로 분리 유지.
3. **Transitive Dependency 지원 시 Cycle 위험** — A requires B requires A 형태는 §44 Circular Hierarchy Detection의 "Dependency Cycle" 항목으로 별도 차단 대상(순환 참조 금지 원칙과 연계).
4. **Version/Scope/Actor 호환성 요구 플래그** — 단순 "Role 존재"가 아니라 Version Binding·Scope·Actor Eligibility 호환까지 검증(§14 Role Inheritance 원칙과 동형 엄격도).
5. **Golden Rule** — 실·근접 substrate 모두 부재 확인 → 순신설. 기존 team_role→acl_permission 매핑(`TeamPermissions.php:152`)이나 SSO group→role(`EnterpriseAuth.php:78-88`)을 Dependency로 오해석 금지(이들은 §6.3/§48 별개 분류).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Dependency 검증(Missing Required→차단)은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `APPROVAL_ROLE_DEPENDENCY` 테이블·Dependency Type enum·failure_behavior 강제 로직 전부 순신설.
- **Gap-2**: Dependency Cycle Detection(§44)도 Role Dependency 자체가 없으므로 전제 조건 부재.
- **정직 부재**: 근접 패턴조차 없음(§4) — 날조 금지. Part 3-1 결론(5 role 어휘 산재이나 상호 요구관계 없음)과 정합.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
