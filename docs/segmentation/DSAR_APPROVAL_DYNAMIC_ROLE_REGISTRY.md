# DSAR — Approval Dynamic Role Registry (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Registry)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN은 Permit하지 않음(fail-closed) · Dynamic ≠ 정적 role · 마케팅 Rule Engine 오흡수 금지(KEEP_SEPARATE) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Dynamic Role Registry는 시스템이 선언한 모든 Dynamic Role 정의를 담는 최상위 카탈로그 엔티티다(스펙 §1-1 "Dynamic Role Registry"·§2 Canonical Entity `APPROVAL_DYNAMIC_ROLE_REGISTRY`). 현행 4곳에 산재한 정적 rank/게이트 저장소(ABAC scope·index.php RBAC·PlanPolicy rank·AdminMenu rank)를 **단일 Policy Decision Point로 수렴시키는 등록 지점**을 제공하는 것이 목적이며(ADR D-1 CONSOLIDATION·중복 감사 D-2), 그 자체가 Rule Evaluation이나 Permission 계산을 수행하지는 않는다(등록/조회 전용).

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§33(Database Constraint)·§34(Index) 근거의 설계 명세 필드(코드 0·미확정):

- `registry_id`(PK) · `tenant_id`(Tenant Isolation) · `dynamic_role_key`(고유 식별키) · `role_type_ref`(→ Dynamic Role Type, §3) · `status`(active/deprecated/retired) · `current_version_ref`(→ Dynamic Role Version, Immutable Version Binding) · `digest`(Digest Validation) · `owner_domain`(RBAC 전용 태그 — 마케팅 도메인과 분리 식별용, KEEP_SEPARATE 강제) · `created_at`/`created_by` · `updated_at`

## 3. 열거형 / 타입

- `status`: `active` | `deprecated` | `retired` (스펙 §29 Static Lint "Missing Version" 방지용 상태 축)
- `owner_domain`: `rbac`(Canonical Dynamic Role 전용) | 그 외 도메인은 등록 대상 아님 — 마케팅 automation(RuleEngine.php 등)은 이 Registry에 등록되지 않는다(ADR D-4·중복 감사 D-1 KEEP_SEPARATE).

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **통합 Registry = ABSENT**: `dynamic/runtime/session/conditional/context role` grep 0(전수조사 §1). "역할 정의를 등록하는 단일 카탈로그" 개념 자체가 존재하지 않는다.
- **근접 substrate = 무통합 정적 rank 4곳 산재(D-2, 중복 감사)**: ① ABAC scope `effectiveScope`(`TeamPermissions.php:236-265`, DATA_SCOPES 9차원 `:41`) ② `effectiveForUser`(`TeamPermissions.php:366-394`, 3단 위계 owner/manager/member) ③ index.php RBAC(`index.php:572-598` roleRank·`:82-89` guardTeamWrite 이진 게이트) ④ `PlanPolicy.php:19-22`(plan tier 정적 rank) ⑤ `AdminMenu.php:337-356`(required_role/rank 별도 명명). 각각 **독립 스토어·독립 문법**이며 단일 등록 지점으로 수렴되어 있지 않다(중복 감사 D-2 "각자 독립 스토어·독립 문법·단일 Policy Decision Point로 미수렴").
- **정적 role 소스(대조 substrate)**: `team_role`(`UserAuth.php:1019` 로그인 시 세션 스냅샷)·`admin_level`(`UserAuth.php:191,1022`)·`api_key.role`(`Db.php:942-955` 생성 시 고정) — 이들은 Registry가 관리하는 대상이 아니라 Registry가 흡수해야 할 산재 정적 저장소다.

## 5. 설계 원칙

- **Golden Rule — 제로 신설 + 조립**: Canonical Dynamic Role Registry를 신설하되, 4곳 정적 rank/게이트를 각각 **결정 입력(adapter)**으로 등록·참조한다(직접 대체 아님). 마케팅 RuleEngine.php 등은 이 Registry에 등록 대상이 아니다(KEEP_SEPARATE, ADR D-4).
- **Tenant Isolation 강제**: 4곳 정적 substrate 중 PlanPolicy/AdminMenu는 tenant 개념이 약함 — Registry 필드 설계 시 tenant_id를 필수화해 일관성 확보.
- **Version Binding 선결합**: `current_version_ref`는 Dynamic Role Version(별도 엔티티, 본 문서 자매편) 확정 전에는 채울 수 없다 — BLOCKED_PREREQUISITE.
- **Static Lint 대상 명시**: 중복 감사 D-3의 하드코딩 role/plan 비교 37+개소(백엔드 ~15·프론트 ~22)는 Registry 도입 후 no-literal-role-compare 린트 대상으로 봉인 예정 — Registry 자체 구현 범위는 아님(참조만).

## 6. Gap / BLOCKED_PREREQUISITE

- Dynamic Role Registry 테이블/엔티티 = grep 0(순신규). 통합 PDP 부재로 4곳 산재 rank의 **등록 통합** 자체가 선행 미완.
- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine(Part 2)·Role Registry(Part 3-1) 실 구현 없이는 Dynamic Role Registry가 참조할 정적 Role Registry 기반이 없다 — Part 3-1 자체도 설계 명세(코드 0) 단계.
- Digest Validation·Immutable Version Binding은 Dynamic Role Version 엔티티 확정 후 순차 설계 필요(순서: Registry → Definition → Version).
