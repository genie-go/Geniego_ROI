# DSAR — Approval Role Graph Impact Analysis (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Graph Impact Analysis)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Role Graph(Part 3-2 본체) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Impact Analysis는 산출뿐·자동 변경 금지 · Legacy 자동활성화 금지 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§63 Role Graph Impact Analysis는 Graph 변경이 발생하기 전/후에 Directly/Transitively Affected Roles, Affected Composite Roles, Affected Permission/Deny Projections, Affected Scope Requirements, **Affected Existing Assignment References**, Affected Sessions Reference, Affected Authorization Cache Reference, Risk/Permission/Scope Expansion, Compliance Impact, SoD Impact Reference, Migration Requirement, Rollback Feasibility를 계산하는 절차다. 스펙 §110·§111(Affected Subject Reference Foundation·Affected Assignment Reference Foundation)이 이 Impact Analysis가 재사용할 선행 Foundation으로 지정돼 있으나, Part 3-3 Role Assignment Governance 자체가 아직 설계 전 단계이므로 "Affected Assignment Reference"가 가리킬 실 Assignment 레코드가 없다. 본 문서는 §63 계산 항목을 정형화하고, `parent_user_id`/`menu_tree.required_role`처럼 실제 "영향 범위 계산 없이 변경되어 사고를 유발할 수 있는" substrate를 반증 사례로 인용한다(수정 아님·필요성 근거로만).

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| impact analysis id | Result PK |
| target change reference | 분석 대상이 된 변경(Simulation 또는 실 변경 제안) |
| directly affected roles / transitively affected roles | 계산 항목 |
| affected composite roles | 계산 항목 |
| affected permission projections / affected deny projections | 계산 항목 |
| affected scope requirements / affected actor eligibility | 계산 항목 |
| affected existing assignment references | 계산 항목(§111 Foundation 재사용 대상·Part 3-3 Assignment 실체화 이후 채워짐) |
| affected sessions reference | 계산 항목 |
| affected authorization cache reference | 계산 항목 |
| risk increase / permission expansion / scope expansion | 계산 항목 |
| compliance impact / sod impact reference | 계산 항목 |
| migration requirement | 계산 항목 |
| rollback feasibility | 계산 항목 |
| computed at | 계산 시각 |
| status | 처리 상태 |

## 3. 열거형 / 타입

Impact Analysis는 별도 열거형 없이 §63 계산 항목 자체가 산출 필드 목록이다(위 §2). 심각도 등급만 별도 채택: **Impact Severity**: `NONE · LOW · MEDIUM · HIGH · CRITICAL`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| Affected Roles/Composite/Permission Projections 계산 | ABSENT(순신규) | Role Graph 부재로 계산 대상 자체가 없음 |
| Affected Existing Assignment Reference(§111 Foundation) | **BLOCKED_PREREQUISITE(선행)** | Part 3-3 Role Assignment Governance 미설계(코드 0) — Assignment 레코드가 없어 "영향받는 Assignment"를 지정할 대상이 없음 |
| **영향 범위 계산 없는 변경이 실제 사고를 유발한 반증 사례**(수정 아님·근거 인용만) | 실재 결함(DUPLICATE_AUDIT §D-8) | `menu_tree.required_role` 쓰기측 ROLE_ENUM(`AdminMenu.php:247,401`) ↔ 읽기측 rank(`AdminMenu.php:338,343-346`) 데드락 — `required_role='super_admin'\|'moderator'` 저장 시 admin(rank3)조차 영구 비노출. **Impact Analysis 없이 값이 변경되면 이런 결과가 난다는 실증 사례**이며, 이번 차수 수정 대상 아님 |
| **부분 배선으로 인한 실질 무영향 사례**(수정 아님·근거 인용만) | 실재 결함(DUPLICATE_AUDIT §D-8) | SSO group→role(`EnterpriseAuth.php:78-91`)이 OIDC(`:240`)·SAML(`:294`) 경로에서는 groups 미전달로 `default_role` 폴백 — 관리자가 IdP 그룹 매핑을 바꿔도 Impact가 실질적으로 발생하지 않는(SCIM 경로만 실효) 역설적 사례. Affected Roles 계산이 있었다면 "이 변경은 SCIM 경로에만 영향"이라고 미리 드러났을 것 |
| Affected Sessions Reference / Authorization Cache Reference | ABSENT(순신규) | 세션·캐시를 Role 변경과 연결하는 계약 부재 |

## 5. 설계 원칙

- Impact Analysis는 계산·보고만 하고 **자동으로 Graph를 변경하거나 Rollback을 실행하지 않는다**(Simulation §62와 동일 불변 원칙 공유).
- Affected Existing Assignment Reference(§111)는 Part 3-3이 Assignment 실체를 신설하기 전까지 필드는 정의하되 값은 항상 비어 있음(구조만 준비)으로 설계한다 — 거짓 채움 금지.
- `AdminMenu.php:247,338,343-346`의 required_role 데드락과 `EnterpriseAuth.php:78-91,240,294,374-375`의 SSO 부분배선은 **"Impact Analysis가 왜 필요한가"의 실증 근거로만 인용**하고, 본 설계 문서에서 코드 수정을 하지 않는다(수정은 별도 fix 세션 승인 필요·DUPLICATE_AUDIT §D-8과 동일 규율).
- Rollback Feasibility 계산은 Historical Graph 불변 보존(§6.15)을 전제로 하며, Historical Version을 직접 수정해 되돌리는 방식은 금지.

## 6. Gap / BLOCKED_PREREQUISITE

Impact Analysis의 대부분 계산 항목이 Role Graph 부재로 **ABSENT**이며, Affected Existing Assignment Reference는 Part 3-3 Role Assignment Governance 미설계로 **BLOCKED_PREREQUISITE**. 실 결함 2건(`AdminMenu.php:247,338,343-346` 데드락·`EnterpriseAuth.php:78-91,240,294,374-375` 부분배선)은 Impact Analysis 부재의 실증 사례로만 인용하며 이번 차수 수정하지 않는다(DUPLICATE_AUDIT §D-8 재확인·재플래그 아님). 실 구현은 Role Graph + Part 3-3 Assignment 실 신설 이후 별도 승인세션(RP-002). NOT_CERTIFIED.
