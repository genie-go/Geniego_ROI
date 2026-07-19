# DSAR — Approval Role Inclusion (INCLUDES Edge) (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Inclusion)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Inclusion은 `INCLUDES` Edge Type(§12)의 의미론을 규정한다. Source Role이 Target Role의 기능을 포함함을 뜻하되(스펙 §13), **단순히 모든 Permission의 Union으로 구현하는 것을 명시적으로 금지**한다 — 전파 방향·Scope 결합·Deny 전파·Actor Eligibility 결합·Validity 결합·Risk 상향을 각각 규정해야 한다. 저장소에는 Role→Role 포함 관계 자체가 없다. 가장 근접한 것은 team_role→acl_permission 매핑(`TeamPermissions.php:152`)이나, 이는 Role이 다른 Role을 포함하는 것이 아니라 **Role→Permission 묶음**이라 Role Inclusion과 범주가 다르다(§6.3).

## 2. Canonical 필드

Role Inclusion은 독립 엔티티가 아니라 `APPROVAL_ROLE_HIERARCHY_EDGE`(§12)에서 `edge_type = INCLUDES`인 레코드의 의미론 계약이다.

| 필드(§12 상속) | Inclusion 맥락에서의 의미 |
|---|---|
| edge type = `INCLUDES` | Source Role이 Target Role 기능을 포함 |
| inheritance direction | 어느 방향으로 Permission이 전파되는가(§9 Direction과 정합) |
| permission propagation policy | Target의 Permission이 Source로 전파되는 방식(단순 Union 금지) |
| deny propagation policy | Target의 Explicit Deny가 Source에서도 유지되는 방식(§6.8) |
| scope propagation policy | 두 Role의 Scope가 결합되는 방식(기본 Intersection·§6.7) |
| actor eligibility policy | 두 Role의 Actor Eligibility가 결합되는 방식(교집합 기본·§6.9) |
| validity propagation policy | 두 Role의 유효기간이 결합되는 방식 |
| (파생) risk aggregation | Risk가 어떻게 상향되는가(§6.10 — Inclusion으로 Risk가 낮아지지 않음) |

## 3. 열거형 / 타입

Role Inclusion 고유 enum은 없다. `APPROVAL_ROLE_HIERARCHY_EDGE`의 **Edge Type** 중 `INCLUDES` 값 하나를 사용한다(§12 enum 전체: `INCLUDES · INHERITS · SPECIALIZES · RESTRICTS · DEPENDS_ON · EXCLUDES · IMPLIES · COMPOSES · CUSTOM`).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| INCLUDES Edge(Role이 다른 Role을 포함) | ABSENT(순신규) | Role↔Role 포함 관계 전무(GROUND_TRUTH §4 "Composite/Nested Role 전무") |
| 포함 관계로 오인 위험(실제는 Role→Permission 묶음) | Role Inclusion 아님·Permission Group Candidate(묶음) | team_role→acl_permission(`TeamPermissions.php:152`) — GROUND_TRUTH §2 명시: "이 매핑들은 Role→Permission 묶음이지 여러 Role Definition을 조합한 Composite Role이 아니다"(§6.3). Role Inclusion(Role↔Role)과 범주가 다름 |
| SSO group→role 평면 매핑(단순 Union 오인 위험) | IAM Group Nesting Candidate(Adapter·평면 매핑) | `EnterpriseAuth.php:78-88` roleForGroups — group이 role 하나에 평면 매핑될 뿐 여러 Role을 포함(Union)하는 관계가 아님(GROUND_TRUTH §1.1 재확인). Cross-registry Adapter로 유지, INCLUDES Edge로 흡수 금지(ADR D-1) |
| Permission Union 자체(단순 합집합 반례 경고 대상) | ABSENT(근접 substrate 없음) | `effectiveForUser`(`TeamPermissions.php:366-394`)가 owner/admin→full, manager→team acl로 permission을 합성하나 이는 **Role→Permission Effective 계산**(§34/§36 참조 패턴)이지 Role↔Role INCLUDES Edge가 아님(GROUND_TRUTH §5) |

## 5. 설계 원칙

- `INCLUDES`를 단순히 모든 Permission의 Union으로 구현하지 않는다(스펙 §13 명시 금지 사항).
- 다음을 반드시 명시한다: 어느 방향으로 Permission이 전파되는가·Scope가 어떻게 결합되는가·Deny가 어떻게 전파되는가·Actor Eligibility가 어떻게 결합되는가·Validity가 어떻게 결합되는가·Risk가 어떻게 상향되는가.
- Explicit Deny는 INCLUDES 전파 중에도 소실되지 않는다(§6.8) — Target의 Deny가 Source에서 사라지면 안 된다.
- Scope는 기본적으로 Intersection이며 INCLUDES로 자동 확대되지 않는다(§6.7).
- team_role→acl_permission(`TeamPermissions.php:152`)은 Role Inclusion의 예시나 대체물이 아니다 — 이는 Permission Group Candidate(묶음)로 별도 분류하며, Composite Role Component(§26)와도 혼동하지 않는다(§6.3·ADR D-3).
- SSO group→role(`EnterpriseAuth.php:78-88`)의 평면 매핑을 nested INCLUDES 관계로 오해석하지 않는다 — IAM Adapter(§114)로 유지한다(§48 Cross-Registry Edge Governance).

## 6. Gap / BLOCKED_PREREQUISITE

Role Inclusion(`INCLUDES` Edge)은 **완전 ABSENT(순신규)** 판정이다. 근접해 보이는 team_role→acl_permission(`TeamPermissions.php:152`)은 Role↔Role 포함이 아니라 Role→Permission 묶음이므로 재사용 불가(§6.3 정면 구분). Permission Union 반례로 참조 가능한 `effectiveForUser`(`TeamPermissions.php:366-394`)도 role 상속이 아닌 permission merge 로직이다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
