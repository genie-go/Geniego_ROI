# DSAR — Composite Permission Aggregation (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002(선행 Permission Engine(Part 2)·Decision Core 실구현 후 별도 승인세션)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(§6.1~6.3) · Golden Rule(Extend not Replace·중복 신설 금지) · 반날조(코드 인용은 상위 ADR·GROUND_TRUTH 2편에 실제 등장하는 것만·직접 grep 금지·없으면 ABSENT)

---

## 1. 목적

Composite Role의 구성 Component들이 가진 Permission을 병합하는 canonical 규칙(§25). Strategy enum과 기본 권장(Deduplicated Restricted Union · Explicit Deny=Always Propagate · Excluded=Remove from Effective Allow · Conflicting=Deny/Manual Review · Critical=Explicit Inclusion Required · UI Hint=Server Permission과 분리)을 정의한다. **단순 Union으로 구현하지 않는다.**

## 2. Canonical 필드

스펙 §25는 필드 테이블이 아닌 Strategy+규칙으로 서술된다. Composite Role Version(§22)·Composite Role(§21)·Effective Composite Role Set(§35)의 관련 필드로 구현한다.

| 필드 | 출처 | 설명 |
|---|---|---|
| `permission_aggregation_policy` | §21 Composite Role | 채택 Strategy |
| `permission_aggregation_snapshot` | §22 Composite Role Version | 버전별 스냅샷 |
| `effective_permission_digest` | §22 Composite Role Version | 결과 다이제스트 |
| `effective_permission_set` | §35 Effective Composite Role Set | 실 병합 결과 |
| `critical_permission_explicit_inclusion_flag` | 신규(§25 취지) | Critical Permission 명시 포함 여부 |

## 3. 열거형 / 타입

**Strategy**: `DENY_OVERRIDES_UNION` · `RESTRICTED_UNION` · `INTERSECTION` · `MANDATORY_COMPONENT_UNION` · `EXPLICIT_POLICY` · `CUSTOM`.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Composite Permission Aggregation | (해당 없음) | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite 등) |
| 근접(혼동 금지) — Effective 계산(단일 role→permission 묶음) | `effectiveForUser`(owner/admin→full·manager→team acl·member→team cap 클램프) | §34 Effective Inherited Set·§36 Permission Merge 참조(role→permission 묶음이지 role 상속/조합 아님) | `TeamPermissions.php:366-394` |
| 근접(혼동 금지) — Role→Permission 묶음 | team_role→acl_permission | Permission Group Candidate(묶음)·Aggregation 대상 Composite 아님(§6.3) | `TeamPermissions.php:152` |

★**정직**: Permission Aggregation Strategy·Effective Permission Set = 순신규 ABSENT. `effectiveForUser`는 **단일 team_role의 permission 산출**이지 **여러 Role Definition을 조합한 Composite의 Aggregation**이 아니다(§6.3·중복감사 D-3).

## 5. 설계 원칙

- 기본 전략=Deduplicated Restricted Union(단순 Union 금지 — 스펙 §25 명시).
- Explicit Deny=Always Propagate(§6.8과 연동, 상세 규칙은 별도 Deny Aggregation 엔티티로 분리 관리).
- Excluded Component(§23 EXCLUDED)의 Permission은 Effective Allow에서 제거된다.
- Critical Permission은 암묵 상속이 아닌 명시 Inclusion을 요구한다.
- UI Hint(화면 표시용)와 Server Permission(서버 강제)을 분리 관리한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Permission Aggregation Strategy·Effective Permission Set = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Permission Engine(Part 2)의 Permission Definition/Grant/Deny 실구현이 선행되지 않아 병합 대상 Permission 실체 자체가 설계 단계 — 공회전.
- `effectiveForUser`를 Composite Permission Aggregation의 실 구현으로 오인 금지(단일 role 매핑). 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.
