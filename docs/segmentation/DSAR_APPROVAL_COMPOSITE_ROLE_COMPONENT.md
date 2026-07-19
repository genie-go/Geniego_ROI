# DSAR — Composite Role Component (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002(선행 Permission Engine(Part 2)·Decision Core 실구현 후 별도 승인세션)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(§6.1~6.3) · Golden Rule(Extend not Replace·중복 신설 금지) · 반날조(코드 인용은 상위 ADR·GROUND_TRUTH 2편에 실제 등장하는 것만·직접 grep 금지·없으면 ABSENT)

---

## 1. 목적

Composite Role(§21)을 구성하는 개별 Component(=Role Definition 참조 단위)의 canonical 명세. Composite Role Version(§22)에 속한 각 Component가 어떤 역할(MANDATORY/OPTIONAL/EXCLUDED/CONDITIONAL_REFERENCE/BASE/SPECIALIZATION/RESTRICTION)을 하는지 및 Permission/Deny/Scope/Constraint/Actor Eligibility/Validity Propagation Policy를 명시한다. §6.3(Composite Role은 Permission Group이 아니다)의 실행 단위 — Component는 **Role Definition**이지 Permission 묶음이 아니다. Optional Component는 자동 활성화하지 않으며, Conditional Component는 명시 Rule 없이 활성화하지 않는다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `component_id` | Component 식별자 |
| `composite_version_id` | 소속 Composite Role Version(§22) |
| `component_role_definition_id` | 참조 Role Definition |
| `component_role_version_id` | 참조 Role Definition Version(Version Binding) |
| `component_type` | §3 열거형 |
| `required_여부` | 필수 Component 여부(§17 Role Dependency와 연동) |
| `sequence` | 결합 순서 |
| `priority` | 충돌 시 우선순위 |
| `permission_propagation_policy` | Permission 전파 정책 |
| `deny_propagation_policy` | Deny 전파 정책 |
| `scope_propagation_policy` | Scope 전파 정책 |
| `constraint_propagation_policy` | Constraint 전파 정책 |
| `actor_eligibility_policy` | Actor Eligibility 정책(component 단위) |
| `validity_propagation_policy` | 유효기간 전파 정책 |
| `condition_reference_optional` | Conditional Component 활성 조건 참조 |
| `valid_from` / `valid_to` | 유효기간 |
| `status` | 상태 |
| `immutable_digest` | 불변 다이제스트 |
| `evidence` | 근거 |

## 3. 열거형 / 타입

**Component Type**: `MANDATORY` · `OPTIONAL` · `EXCLUDED` · `CONDITIONAL_REFERENCE` · `BASE` · `SPECIALIZATION` · `RESTRICTION` · `CUSTOM`.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Composite Role Component | (해당 없음) | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite 등) — `DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION` §4 |
| 근접(혼동 금지) — Role→Permission 묶음 | team_role→acl_permission | Permission Group Candidate(묶음)·Composite Role Component 아님(§6.3) | `TeamPermissions.php:152` |
| 근접(혼동 금지) — Role 묶음 프리셋 | `ORG_PRESET`(15 팀유형별 기본 권한셋·팀 템플릿) | §21 Composite Role과 혼동 금지(§6.3) | `TeamPermissions.php:706-722` |

★**정직**: `component_id`~`immutable_digest` 전 필드 = 순신규 ABSENT. team_role→acl_permission·ORG_PRESET은 **여러 Role Definition을 조합한 Composite**가 아니라 각각 "Role→Permission 매핑"·"팀 템플릿"이므로 Component 실체와 무관(전수조사 §2·중복감사 D-3).

## 5. 설계 원칙

- Optional Component는 자동 활성화하지 않는다(스펙 §23 요구 사항).
- Conditional Component는 `condition_reference_optional`이 존재하고 평가를 통과하지 않는 한 활성화하지 않는다.
- Required Component는 §17 Role Dependency와 결합 — Missing Required Dependency는 Composite 활성화를 차단한다(§17).
- Component는 Role Definition 참조이지 Permission 묶음이 아니다(§6.3) — team_role→acl_permission·ORG_PRESET을 Component로 오흡수 금지.
- Golden Rule: 기존 매핑을 재사용하는 것이 아니라 Composite Role Component를 제로에서 신설하고, 기존 substrate와의 경계를 명시한다(D-3).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Composite Role/Component/Version 전부 ABSENT(grep 0건).
- **BLOCKED_PREREQUISITE(RP-002)**: `component_role_version_id` Version Binding은 선행 Role Definition Version(Part 3-1)·Permission Engine(Part 2) 실구현 필요로 공회전.
- team_role→acl_permission·ORG_PRESET을 Composite Role Component로 재정의·중복 신설 금지(중복감사 D-3). 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.
