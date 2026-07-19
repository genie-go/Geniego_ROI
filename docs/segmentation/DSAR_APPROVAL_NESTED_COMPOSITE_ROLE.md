# DSAR — Nested Composite Role (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002(선행 Permission Engine(Part 2)·Decision Core 실구현 후 별도 승인세션)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(§6.1~6.3) · Golden Rule(Extend not Replace·중복 신설 금지) · 반날조(코드 인용은 상위 ADR·GROUND_TRUTH 2편에 실제 등장하는 것만·직접 grep 금지·없으면 ABSENT)

---

## 1. 목적

Composite Role이 다른 Composite Role을 Component로 포함하는 **Nested Composite Role**의 canonical 명세(§24). Nested는 지원하되 다음을 강제한다: Maximum Nesting Depth · Circular Reference Detection · Duplicate Component Detection · Version Binding · Tenant Isolation · Actor Eligibility Compatibility · Scope Intersection · Explicit Deny Propagation · Conflict Detection · Risk Escalation · Cache Invalidation · Graph Digest 갱신. Runtime마다 무제한 재귀를 금지하고, **Versioned Flattening Projection**(버전 고정 평탄화 스냅샷)을 제공한다.

## 2. Canonical 필드

스펙 §24는 전용 필드 테이블이 아닌 강제 통제 목록으로 서술된다. Nested 구조는 Composite Role(§21)의 `nested composite allowed`·`maximum nesting depth` 필드와 Composite Role Component(§23)의 Component가 다시 다른 Composite Role Version을 참조하는 구조로 표현된다.

| 필드 | 출처 | 설명 |
|---|---|---|
| `nested_composite_allowed` | §21 Composite Role | Nested 허용 여부 |
| `maximum_nesting_depth` | §21 Composite Role | 최대 중첩 깊이 |
| `component_role_version_id`(다른 composite version 참조 가능) | §23 Composite Role Component | Nested edge 실체 |
| `flattening_projection_digest` | 신규(§24 취지) | Versioned Flattening Projection 다이제스트 |
| `nesting_depth_reached` | 신규(§24 취지) | 평가 시 도달 깊이 |
| `circular_detected_flag` | 신규(§24 취지) | Direct/Indirect Cycle 탐지 결과 |
| `duplicate_component_detected_flag` | 신규(§24 취지) | 중복 Component 탐지 결과 |

## 3. 열거형 / 타입

전용 열거형 없음(§24는 강제 통제 목록으로 서술). Component Type(§23: MANDATORY/OPTIONAL/EXCLUDED/CONDITIONAL_REFERENCE/BASE/SPECIALIZATION/RESTRICTION)이 Nested 조합에도 그대로 적용된다.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Nested Composite Role / Circular Detection(role 대상) / Closure | (해당 없음) | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite·circular·closure 등) |
| 근접(role 아님·참조만) — Cycle Detection(조상체인 walk+self-ref+depth guard) | `menu_tree` `wouldCycle`(id===newParent 즉시차단·depth<100) | §44 Circular Detection 참조 패턴(메뉴 대상·role 아님) | `AdminMenu.php:540-555` |
| 근접(role 아님·참조만) — Cycle Detection(DFS 도달가능성) | PM 태스크 의존성 cycle 검출 주석 | §44 참조(태스크 그래프·role 아님) | `PM/Dependencies.php:10` |
| 근접(role 아님·참조만) — Effective 계산(resolver/flatten 동형) | `effectiveForUser`(owner/admin→full·manager→team acl·member→team cap 클램프) | Versioned Flattening Projection 알고리즘 참조(role→permission 묶음이지 role 상속 아님) | `TeamPermissions.php:366-394` |

★**정직**: Nested Composite Role 자체의 Circular/Duplicate Detection·Flattening Projection = 순신규 ABSENT. 위 3개 substrate는 **role 대상이 아닌** 메뉴/태스크/팀권한 도메인의 동형 알고리즘일 뿐이며, 실 엔진은 이를 알고리즘 참조로만 재사용하고 대상(메뉴/태스크)을 Role Graph로 흡수하지 않는다.

## 5. 설계 원칙

- Max Nesting Depth 강제(무제한 재귀 금지) — `wouldCycle`의 depth guard(`AdminMenu.php:540-555`)를 알고리즘 패턴으로만 참조하되, 대상은 Role Graph로 별도 조립한다.
- Circular/Duplicate Component Detection은 Direct와 Indirect를 모두 포함한다(§6.6).
- Runtime마다 재귀 평가하지 않고 Versioned Flattening Projection(버전 고정 스냅샷)을 제공한다(§24).
- Tenant Isolation·Cross-Tenant Edge 차단(§6.14)과 결합 — Nested Component가 다른 Tenant의 Composite Role을 참조하는 것을 금지한다.
- Explicit Deny Always Propagate + Excluded Remove가 중첩 여러 겹에도 유지된다(§6.8·§25).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Nested Composite Role 개념·Circular/Duplicate Detection·Flattening Projection = 순신규(grep 0건).
- **BLOCKED_PREREQUISITE(RP-002)**: Composite Role Version(§22)·Role Graph(§29) 선행 실구현 필요.
- `menu_tree` `wouldCycle`·`PM/Dependencies.php`는 근접 알고리즘 참조일 뿐 role 대상이 아니다 — Role Graph로 오흡수 금지(중복감사 D-1 경계). 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.
