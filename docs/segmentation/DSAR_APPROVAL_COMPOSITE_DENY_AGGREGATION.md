# DSAR — Composite Deny Aggregation (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002(선행 Permission Engine(Part 2)·Decision Core 실구현 후 별도 승인세션)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(§6.1~6.3) · Golden Rule(Extend not Replace·중복 신설 금지) · 반날조(코드 인용은 상위 ADR·GROUND_TRUTH 2편에 실제 등장하는 것만·직접 grep 금지·없으면 ABSENT)

---

## 1. 목적

Composite Role 구성 시 Child/Component Role의 **Explicit Deny가 소실되지 않도록** 하는 canonical 규칙(§6.8·§25 "Explicit Deny=Always Propagate"). Role Restriction(§16, RESTRICTS Edge)·Role Exclusion(§19, EXCLUDES)의 우선순위 원칙과 결합한다.

## 2. Canonical 필드

Composite Role(§21)·Composite Role Version(§22)·Effective Composite Role Set(§35)의 Deny 관련 필드 + Composite Role Component(§23)의 Component 단위 Deny Propagation Policy로 구현한다.

| 필드 | 출처 | 설명 |
|---|---|---|
| `deny_aggregation_policy` | §21 Composite Role | 채택 Strategy |
| `deny_aggregation_snapshot` | §22 Composite Role Version | 버전별 스냅샷 |
| `effective_deny_digest` | §22 Composite Role Version | 결과 다이제스트 |
| `effective_deny_set` | §35 Effective Composite Role Set | 실 Deny 집합 |
| `deny_propagation_policy` | §23 Composite Role Component | Component 단위 전파 정책 |
| `excluded_component_deny_removal_flag` | 신규(§25 취지) | Excluded Component의 Deny 유지 여부 표식 |

## 3. 열거형 / 타입

Strategy(§25 Permission Aggregation과 동일 enum 계열): `DENY_OVERRIDES_UNION` · `RESTRICTED_UNION` · `INTERSECTION` · `MANDATORY_COMPONENT_UNION` · `EXPLICIT_POLICY` · `CUSTOM`. Component Type(§23) `EXCLUDED`가 Deny 처리와 직접 연동. Edge Type(§12) `RESTRICTS`·`EXCLUDES`가 Deny 발생원.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Composite Deny Aggregation | (해당 없음) | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite 등) |
| 근접(혼동 금지) — fail-closed Scope 반환 | `effectiveScope`(owner=null·상속·실패 시 DENY_SCOPE) | §39 Scope Propagation 참조(scope 대상·permission deny 전용 아님) | `TeamPermissions.php:236-265` |
| 근접(혼동 금지) — fail-closed 판정 | `roleOf`(권한 판정 실패 시 deny 유사 반환) | §34 Effective Inherited Set 참조(단일 role 판정) | `TeamPermissions.php:120-131` |

★**정직**: Explicit Deny Aggregation/전파 메커니즘 = 순신규 ABSENT. `effectiveScope`의 fail-closed(DENY_SCOPE)는 **scope 계산 실패 시 안전 반환**이지, **여러 Component의 Explicit Deny를 조합·전파**하는 Composite Deny Aggregation이 아니다.

## 5. 설계 원칙

- Explicit Deny는 Composite 과정에서 항상 전파된다(§6.8 필수 통제·§6.16 고객 설정으로 비활성화 불가).
- Excluded Component(§23 EXCLUDED)는 Effective Allow에서 제거되지만, 그 Component가 지닌 Deny는 유지된다(Exclude≠Deny 소실).
- RESTRICTS(§16)·EXCLUDES(§19)가 INCLUDES/IMPLIES보다 우선한다(Restriction·Exclusion이 Allow보다 우선).
- Deny Propagation Policy는 Component 단위로 명시한다(§23 필드) — 묵시적 Union으로 Deny를 누락시키지 않는다.
- `effectiveScope`의 fail-closed 사상(모호하면 최소 권한)을 참조 원칙으로만 채택하되, 실 Deny Aggregation은 별도 신설한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Deny Aggregation·Explicit Deny 전파 메커니즘 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Permission Deny 실체 자체(Part 2 Permission Engine)가 설계 단계라 병합 대상이 공회전.
- `effectiveScope`의 DENY_SCOPE를 Composite Deny Aggregation의 실 구현으로 오인 금지(scope fail-closed 참조일 뿐). 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.
