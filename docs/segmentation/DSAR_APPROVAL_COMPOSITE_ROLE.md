# DSAR — Approval Composite Role (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Composite Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Composite Role은 스펙 §21이 정의하는 `APPROVAL_COMPOSITE_ROLE` 엔티티로, **여러 Role Definition을 조합한 Role**이다. §6.3 핵심 원칙: **Composite Role은 Permission Group이 아니다** — Permission Group은 Permission 묶음이고 Composite Role은 여러 Role Definition을 조합한 Role이다. 이 구분은 ADR D-1·전수조사 §2가 명시적으로 검증한 지점이다: 현행 team_role→acl_permission 매핑(`TeamPermissions.php:152`)은 "Role→Permission 묶음"이지 "여러 Role Definition을 조합한 Composite Role"이 아니다.

## 2. Canonical 필드

`APPROVAL_COMPOSITE_ROLE`(스펙 §21 필수 필드 원문):

| 필드 | 의미 |
|---|---|
| `composite_role_id` | 식별자(PK) |
| `tenant_id` / `registry_id` | 소속 테넌트·Registry |
| `role_definition_id` | Composite 자체도 하나의 Role Definition(§7 Node로 참조 가능) |
| `composite_code` / `composite_name` / `description` | 식별·표시 |
| `composition_type` | §3 Composition Type |
| `mandatory_component_count` | 필수 Component 수 |
| `optional_component_supported` / `excluded_component_supported` | 선택/배제 Component 지원 여부 |
| `nested_composite_allowed` / `maximum_nesting_depth` | 중첩 Composite 허용·최대 깊이(§24 Nested Composite Role) |
| `actor_eligibility_policy` | §27 Composite Role Actor Eligibility 정책 |
| `scope_aggregation_policy` / `permission_aggregation_policy` / `deny_aggregation_policy` / `risk_aggregation_policy` | §25·§26·§28 Aggregation 전략 |
| `conflict_policy` | §18 Role Conflict 연계 정책 |
| `assignment_allowed` | Part 3-3 Subject Assignment 대상 허용 여부 |
| `current_version_id` | §22 Composite Role Version 참조 |
| `business_owner_id` / `technical_owner_id` / `security_owner_id` | 소유자 3역 |
| `valid_from` / `valid_to` / `status` / `immutable_digest` / `evidence` | 공통 거버넌스 필드 |

## 3. 열거형 / 타입

- **Composition Type**(§21): `FUNCTIONAL` · `BUSINESS_PROCESS` · `APPROVAL` · `ADMINISTRATIVE` · `SECURITY` · `DATA_ACCESS` · `SERVICE` · `SYSTEM` · `API_CLIENT` · `MIGRATION` · `CUSTOM`.
- **Component Type**(§23, Composite Role Component에 결합): `MANDATORY` · `OPTIONAL` · `EXCLUDED` · `CONDITIONAL_REFERENCE` · `BASE` · `SPECIALIZATION` · `RESTRICTION` · `CUSTOM`.

## 4. 실 substrate 매핑 (§5.2) — ★§6.3 구분 필수

| Canonical | §5.2 태그 | 실 substrate (file:line) | Composite Role 여부 |
|---|---|---|---|
| Composite Role(Role Definition 조합) | **ABSENT → 신설** | 백엔드 PHP grep 0건(composite 등 15개 키워드, 전수조사 §3) | — |
| team_role→acl_permission(menu×action) | **Permission Group Candidate(묶음)** | `TeamPermissions.php:152` | **✗ Composite Role 아님**(§6.3·ADR D-1) — Role→Permission 매핑이지 여러 Role Definition 조합이 아님 |
| `ORG_PRESET`(15 팀유형별 기본 권한셋) | **Role 묶음 프리셋(팀 템플릿)** | `TeamPermissions.php:706-722` | **✗ Composite Role 아님**(전수조사 §5 "혼동 금지"·본 요청 지시사항 명시) — 팀 온보딩 시 초기 권한 세팅 템플릿이지 Role Definition을 조합해 새 Role을 만드는 구조가 아님 |
| SSO group→team_role(평면 1-hop) | IAM Group Nesting Candidate(Adapter) | `EnterpriseAuth.php:78-88` | **✗ Composite Role 아님** — nested group 상속도 아니고 Role 조합도 아닌 평면 매핑(§48 Cross-Registry Adapter로 유지) |

★**team_role→acl_permission(Permission Group Candidate)과 ORG_PRESET(팀 템플릿) 둘 다 Composite Role이 아니다**(요청 지시사항 §6.3 명시 구분 준수). 실 Composite Role은 "여러 Role Definition을 조합" 개념 자체가 부재하므로 순신설.

## 5. 설계 원칙

1. **Composite Role ≠ Permission Group**(§6.3 원문·ADR D-1) — team_role→acl_permission을 Composite Role로 재정의 금지. Composite의 Component는 반드시 Role Definition(§23 `component_role_definition_id`)이어야 하며 Permission이 아니다.
2. **Composite Role ≠ ORG_PRESET**(전수조사 §5 명시 혼동 금지) — ORG_PRESET은 팀 유형별 초기 권한 프리셋(1회성 seed)이지, Version 관리되는 Role 조합 실체가 아니다.
3. **Permission Aggregation = Deduplicated Restricted Union**(§25) — 단순 Union 금지. Explicit Deny Always Propagate·Excluded Remove·Critical 명시 Inclusion.
4. **Actor Eligibility 교집합**(§6.9·§27) — Human-only + Machine-only 조합 기본 차단.
5. **Risk 하향 금지**(§6.10·§28) — Composite Risk가 구성 Role 최대 Risk보다 낮아지지 않게.
6. **Golden Rule** — 실 Composite Role substrate 부재를 grep 0건으로 실증(전수조사 §3) → "부분 미비 보완"이 아니라 제로 신설이며, 근접해 보이는 두 substrate(Permission Group·ORG_PRESET)를 흡수하지 않고 분리 유지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Composite Role Aggregation(Permission/Deny/Scope/Risk/Actor) 실 강제는 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `APPROVAL_COMPOSITE_ROLE` 테이블·10종 Composition Type·8종 Aggregation 정책 전부 순신설.
- **Gap-2**: Permission Group 자체도 정형 실체로는 부재(Part 2 Permission Engine 설계 단계·코드 0, 전수조사 §2) — Composite Role이 참조할 Permission Group도 함께 신설 필요.
- **정직 부재**: team_role→acl_permission·ORG_PRESET을 Composite Role로 승격하는 지름길은 §6.3 위반이므로 채택 불가. 289차 P1~P4(writeGuard·featurePlan·admin폐기·SSOT) 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
