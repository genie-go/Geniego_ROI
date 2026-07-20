# DSAR — Approval Dynamic Role Definition (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Definition)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN은 Permit하지 않음(fail-closed) · Dynamic ≠ 정적 role · 마케팅 Rule Engine 오흡수 금지(KEEP_SEPARATE) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Dynamic Role Definition은 Registry에 등록된 개별 Dynamic Role의 정의체다(스펙 §1-2·§2 Canonical Entity `APPROVAL_DYNAMIC_ROLE`). "이 Role은 어떤 조건(Rule)에서 어떤 Permission/Scope/Constraint을 부여하는가"를 선언하는 단위이며, 현행 **정적으로 고정된 role 정의**(team_role/admin_level/api_key.role)와 대비되는 개념이다 — 핵심 차이는 정의 자체에 조건(Attribute/Rule/Context) 참조가 내장된다는 점(ADR D-3 "Dynamic Role ≠ 정적 role · Context가 role을 결정").

## 2. Canonical 필드

스펙 §2·§7(Rule Expression 예시: "IF Department=Finance AND MFA=TRUE AND BusinessHours=TRUE THEN Activate Finance Approver Role")·§14(Runtime Permission Projection) 근거 설계 필드(코드 0·미확정):

- `role_definition_id`(PK) · `registry_ref`(→ Dynamic Role Registry) · `role_type`(→ Dynamic Role Type, §3) · `display_name` · `rule_ref`(→ Rule Engine 표현식, 활성 조건) · `attribute_refs[]`(→ Attribute Source) · `static_permission_base`(정적 Permission과의 결합 기준점) · `runtime_scope_projection_ref` · `runtime_constraint_ref` · `version_ref`(Immutable) · `tenant_id`

## 3. 열거형 / 타입

- `role_type`: Runtime | Session | Conditional | Attribute | Rule | Calculated | Context | Emergency Context | Read-only Context | Temporary Context (스펙 §3, 10유형 — 상세는 자매편 `DSAR_APPROVAL_DYNAMIC_ROLE_TYPE.md`)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Dynamic Role Definition = ABSENT**: `dynamic/runtime/session/conditional/context role` grep 0(전수조사 §1). "조건부로 활성화되는 role 정의"라는 개념 자체가 코드베이스에 없다.
- **정적 role 정의 대조 substrate(전수조사 §1)**: `team_role`(`UserAuth.php:1019` 로그인 시 세션 스냅샷·원본은 DB persisted·변경은 팀배정 관리작업 `TeamPermissions.php:774`에서만) · `admin_level`(`UserAuth.php:191,1022`, 컨텍스트 재평가 없음) · `api_key.role`(생성 시 고정 `Db.php:942-955`, 요청마다 재계산 없음·rank 순위화만 `index.php:573-576`) · FE `teamRolePolicy.js:8,21-27`(고정 3단계). 이들은 **정의에 조건식이 없고 값 자체가 고정**된다는 점에서 Dynamic Role Definition과 근본적으로 다르다.
- **Rule Expression 입력 후보(근접, 결정 입력용)**: ABAC `effectiveScope`(`TeamPermissions.php:236-265`)의 `scope_type`/`scope_values` 속성값 및 Require MFA 게이트(`UserAuth.php:929-1036,3719-3760`)는 스펙 §7 예시(`Department=Finance AND MFA=TRUE`)의 attribute 항 후보이나, 이를 소비해 "Role을 활성화"하는 Definition·Rule Evaluation 로직은 전무(전수조사 §4 "role 활성 입력? = ✗" 전항목).

## 5. 설계 원칙

- **정의와 정적 role의 관계 = 결합, 대체 아님**: Dynamic Role Definition은 `static_permission_base`로 기존 team_role/admin_level 정적 정의를 참조·확장한다(신규 정적 role 체계 병행 신설 금지, Golden Rule).
- **마케팅 Rule 오흡수 금지**: `RuleEngine.php`(`:12,24,32,34,194-220` — channel_roas/sku_stock 대상 IF-THEN)는 대상 도메인이 role/permission이 아니므로 Dynamic Role Definition의 `rule_ref`가 참조할 Rule Engine과 **별개**(ADR D-4·중복 감사 D-1).
- **CONDITIONAL Component Rule Reference 빈자리 충족**: Part 3-2 스펙 문서에 `CONDITIONAL` enum명만 존재(전수조사 §9, `EPIC_06A_PART3_2_..._SPEC.md:331`)하고 이를 평가할 Rule Reference Interface가 없다 — 본 Definition 엔티티의 `rule_ref`가 이 빈자리를 채우는 Adapter 지점이 된다(ADR §3 Adapter).

## 6. Gap / BLOCKED_PREREQUISITE

- Rule Evaluation 엔진(TRUE/FALSE/UNKNOWN/ERROR, 스펙 §9) 자체가 순신규 — Definition의 `rule_ref`가 가리킬 대상이 아직 없다.
- **BLOCKED_PREREQUISITE(RP-002)**: `static_permission_base`가 참조할 정적 Permission Engine(Part 2)·Role Registry(Part 3-1)가 설계 명세(코드 0) 단계 — Definition과 정적 Role의 결합 설계는 그 확정 후 순차 진행.
- Attribute Source 필드(§4 Attribute Source: Position/Department/Employment Status 등)는 전수조사 §4에서 대부분 grep 0(부재)로 확인 — Definition이 참조할 attribute 자체가 컬럼 수준에서 없는 경우 다수(BLOCKED, 별도 스키마 신설 필요).
