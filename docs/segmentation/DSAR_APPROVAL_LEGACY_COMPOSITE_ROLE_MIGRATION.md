# DSAR — Approval Legacy Composite Role Migration (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Legacy Composite Role Migration)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Composite Role(Part 3-2 본체) 실 구현 부재
- **불변**: Composite Role ≠ Permission Group · Role ≠ Organization Hierarchy ≠ Permission Hierarchy · Golden Rule(Extend not Replace) · **Legacy Composite 자동 활성화 절대 금지** · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§65 Legacy Composite Migration 원칙은 "Legacy Composite 자동 활성화 금지"를 최상위 규율로 두고, Component Role 존재·Version·Permission Equivalence·Explicit Deny Preservation·Scope Equivalence·Actor Eligibility·Human·Machine Mixing·Conflict·Dependency·Cycle·Risk·Criticality·Validity·Owner·Lifecycle·Assignment Impact를 검증한 뒤에만 마이그레이션을 허용한다. ★GROUND_TRUTH §4가 명시한 대로 **Composite Role / Component / Nested Composite 자체가 이 저장소에 grep 0건(ABSENT)**이므로, "마이그레이션할 Legacy Composite" 자체가 존재하지 않는다. 본 문서는 이 사실을 정직하게 등재하고, 향후 실 Composite Role이 신설될 때 어떤 것이 "Legacy Composite로 오인되어서는 안 되는지"(team_role→acl_permission 묶음 등)를 경계로 확정한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| legacy composite migration id | Result PK |
| legacy composite reference | 원본 Legacy Composite(현재 ABSENT) |
| component role existence check | Component Role 존재 검증 결과 |
| component role version check | Component Role Version 검증 결과 |
| permission equivalence check | Permission 동등성 |
| explicit deny preservation check | Deny 보존 검증 |
| scope equivalence check | Scope 동등성 |
| actor eligibility check | Actor 적격성 |
| human machine mixing check | Human·Machine 혼합 검증 |
| conflict check / dependency check / cycle check | 무결성 검증 |
| risk check / criticality check / validity check | 등급 검증 |
| owner check / lifecycle check | 거버넌스 검증 |
| assignment impact | 영향 Assignment 참조(§111 Foundation 재사용) |
| automatic activation | **항상 false**(수동 승인 전 활성화 금지) |
| status | 처리 상태 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

Legacy Composite Role Migration은 별도 Type enum 없이 §2 Canonical 필드의 검증 항목 자체가 Validation Checklist다. 판정값은 공통으로 **PASS · FAIL · NOT_APPLICABLE · MANUAL_REVIEW_REQUIRED**.

## 4. 실 substrate 매핑 (§5.2)

| Canonical 검증 항목 | §5.2 태그 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| Legacy Composite 원본 자체 | **ABSENT(정직)** | Composite Role/Component/Nested Composite = 백엔드 PHP grep 0건(composite·hierarchy·circular·Tarjan·transitive·closure·ancestor·descendant·role_graph·role_bundle·role_set·role_group·effective_role·flatten_role·resolve_role·nested_role)(GROUND_TRUTH §4). **마이그레이션할 대상이 없음** |
| Component Role 존재/Version 검증 | ABSENT(순신규) | Component 개념 부재 |
| Permission Equivalence 검증 | **오인 경계(Composite 아님)** | team_role→acl_permission(`TeamPermissions.php:152`)은 **Role→Permission 묶음이지 여러 Role Definition을 조합한 Composite Role이 아님**(ADR D-1·D-2 §6.3). 이를 Legacy Composite로 오인해 마이그레이션 대상에 넣지 않는다 |
| Human·Machine Mixing 검증 | ABSENT(순신규) | Actor Type Eligibility 개념 부재. api_key role(programmatic·`Keys.php` 계열)과 team_role(human)이 분리축으로 미형식화(GROUND_TRUTH §1.1 참조 계열)이나 Composite 혼합 검증 대상 자체가 없음 |
| Conflict/Dependency/Cycle 검증 | ABSENT(순신규) | Role Conflict/Exclusion/Dependency = 전무(GROUND_TRUTH §4) |
| Assignment Impact(§111 Foundation) | **BLOCKED_PREREQUISITE(선행)** | Part 3-3 Role Assignment Governance 미설계 |

## 5. 설계 원칙

- **"자동 활성화 금지"는 마이그레이션할 Legacy Composite가 없는 지금도 유효한 최상위 규율**로 명문화한다 — 향후 어떤 형태로든 Legacy Composite 유사물이 발견되거나 신설되어도 자동 활성화 경로를 만들지 않는다.
- team_role→acl_permission(`TeamPermissions.php:152`)을 **Legacy Composite로 흡수·마이그레이션하지 않는다** — Permission Group Candidate이지 Composite Role이 아니므로(§6.3), 마이그레이션이 아니라 Part 2 Permission Engine의 Permission Group 설계로 별도 정형화한다.
- `ORG_PRESET`(15 팀유형별 기본 권한셋·`TeamPermissions.php:706-722`)도 "Role 조합"이 아니라 팀 템플릿이므로 Composite Role Migration 후보로 오인 금지(GROUND_TRUTH §5 "§21 Composite Role과 혼동 금지").
- Assignment Impact 필드는 Part 3-3 Assignment 신설 전까지 구조만 정의하고 항상 공란 — 거짓 채움 금지.

## 6. Gap / BLOCKED_PREREQUISITE

Legacy Composite Role 자체가 **완전 ABSENT**이므로 이번 차수는 "마이그레이션 대상이 없음을 확정하고, 향후 오인 후보(team_role→acl_permission, ORG_PRESET)를 경계로 지정"하는 설계만 수행한다. 실 Legacy Composite Migration 로직(및 그 전제가 되는 Composite Role 실체)은 Role Graph·Composite Role 실 신설 이후 별도 승인세션(RP-002). NOT_CERTIFIED.
