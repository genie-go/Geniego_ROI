# DSAR — Composite Scope Aggregation (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002(선행 Permission Engine(Part 2)·Decision Core 실구현 후 별도 승인세션)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(§6.1~6.3) · Golden Rule(Extend not Replace·중복 신설 금지) · 반날조(코드 인용은 상위 ADR·GROUND_TRUTH 2편에 실제 등장하는 것만·직접 grep 금지·없으면 ABSENT)

---

## 1. 목적

Composite Role 구성 시 Component들의 Scope(적용 범위)를 결합하는 canonical 규칙(§26). 기본값은 `INTERSECTION`/`MOST_RESTRICTIVE`(자동 확대 금지·§6.7과 정합). Union이 필요한 경우 Scope Expansion Simulation과 승인 Hook을 요구한다.

## 2. Canonical 필드

Composite Role(§21)·Composite Role Version(§22)·Effective Composite Role Set(§35)의 Scope 관련 필드 + Composite Role Component(§23)의 Component 단위 Scope Propagation Policy로 구현한다.

| 필드 | 출처 | 설명 |
|---|---|---|
| `scope_aggregation_policy` | §21 Composite Role | 채택 Strategy |
| `scope_propagation_policy` | §23 Composite Role Component | Component 단위 전파 정책 |
| `scope_policy_snapshot` | §22 Composite Role Version | 버전별 스냅샷 |
| `effective_scope_digest` | §22 Composite Role Version | 결과 다이제스트 |
| `effective_scope_requirements` | §35 Effective Composite Role Set | 실 Scope 요구 집합 |
| `scope_expansion_detected` | §22 Composite Role Version | 확대 탐지 플래그(이미 존재) |
| `scope_expansion_simulation_reference` | 신규(§26 취지) | Union 시 시뮬레이션 참조 |
| `approval_hook_reference` | 신규(§26 취지) | Union 시 승인 Hook 참조 |

## 3. 열거형 / 타입

**Strategy**: `INTERSECTION` · `MOST_RESTRICTIVE` · `COMPONENT_SPECIFIC` · `EXPLICIT_MAPPING` · `CUSTOM`(기본값=`INTERSECTION`/`MOST_RESTRICTIVE`).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Composite Scope Aggregation | (해당 없음) | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite 등) |
| 근접(참조만) — fail-closed Scope 계산 | `effectiveScope`(owner=null·상속·실패 시 DENY_SCOPE) | §39 Scope Propagation 참조(ground-truth §5에서 유일하게 태그된 근접 substrate) | `TeamPermissions.php:236-265` |

★**정직**: Composite Scope Aggregation Strategy·Expansion Simulation·Approval Hook = 순신규 ABSENT. `effectiveScope`는 **단일 team_role의 scope 계산**(owner→null 상속·실패 시 DENY_SCOPE)이지, **여러 Component의 Scope를 Intersection/Union으로 조합**하는 Composite Scope Aggregation이 아니다.

## 5. 설계 원칙

- 기본 전략=`INTERSECTION`/`MOST_RESTRICTIVE`(§6.7 "Scope 상속 자동 확대 금지"와 정합).
- Union이 필요한 경우 Scope Expansion Simulation과 승인 Hook을 필수로 요구한다(임의 확대 금지).
- Component별 Scope Propagation Policy를 명시한다(§23 필드) — 암묵 상속 금지.
- `effectiveScope`의 fail-closed 사상(실패 시 DENY_SCOPE)을 Composite Scope Aggregation 실패 시에도 원칙으로 채택한다(모호하면 최소 권한).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Scope Aggregation Strategy·Expansion Simulation·Approval Hook = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Scope 정의 자체가 Permission Engine(Part 2)·Authorization Context 선행 실구현에 종속되어 공회전.
- `effectiveScope`를 Composite Scope Aggregation의 실 구현으로 오인 금지(단일 role scope 계산). 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.
