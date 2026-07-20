# DSAR — Approval Dynamic Role Type (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Type)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN은 Permit하지 않음(fail-closed) · Dynamic ≠ 정적 role · 마케팅 Rule Engine 오흡수 금지(KEEP_SEPARATE) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Dynamic Role Type은 스펙 §3이 열거한 10개 Dynamic Role 유형의 분류 체계다. Dynamic Role Definition(자매편)의 `role_type` 필드가 참조하는 고정 enum이며, 각 유형이 서로 다른 활성화 트리거·수명주기를 갖는다는 것을 문서화하는 것이 목적이다. 유형별 상세 substrate는 Runtime Role·Session Role·Context Role 3종에 한해 별도 per-entity 문서(`DSAR_APPROVAL_DYNAMIC_RUNTIME_ROLE.md`·`DSAR_APPROVAL_DYNAMIC_SESSION_ROLE.md`·`DSAR_APPROVAL_DYNAMIC_CONTEXT_ROLE.md`)로 분리 기술한다.

## 2. Canonical 필드

스펙 §3 근거 설계 필드(코드 0·미확정):

- `role_type_code`(PK, enum) · `label` · `lifecycle_trigger_ref`(→ 스펙 §10 Activation Trigger 목록) · `expiration_trigger_ref`(→ 스펙 §11 Expiration 목록) · `is_readonly`(Read-only Context Role 전용 플래그) · `is_temporary`(Temporary Context Role 전용 플래그)

## 3. 열거형 / 타입

스펙 §3 원문 10유형(그대로 인용, 순서 보존):

1. Runtime Role — 요청/세션 시점 계산(자매편 `DSAR_APPROVAL_DYNAMIC_RUNTIME_ROLE.md`)
2. Session Role — 세션 스코프 한정(자매편 `DSAR_APPROVAL_DYNAMIC_SESSION_ROLE.md`)
3. Conditional Role — 조건(Time/Device/Project/Region/Client/Network/Risk/Authentication, §13) 충족 시 활성
4. Attribute Role — Attribute Source(§4) 값 기반
5. Rule Role — Rule Engine(§6) 평가 결과 기반
6. Calculated Role — 파생 연산 결과 기반
7. Context Role — Runtime Context(§5) 기반(자매편 `DSAR_APPROVAL_DYNAMIC_CONTEXT_ROLE.md`)
8. Emergency Context Role — 비상 상황 한정
9. Read-only Context Role — 읽기 전용 제약 결합
10. Temporary Context Role — 시한부 활성

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **10유형 전부 ABSENT**: `dynamic/runtime/session/conditional/context role` grep 0(전수조사 §1) — Attribute Role/Rule Role/Calculated Role/Emergency·Read-only·Temporary Context Role을 포함한 명칭 매치 전무.
- **근접 substrate(유형 결정 입력 후보, 유형 자체는 아님)**: ABAC `effectiveScope`(`TeamPermissions.php:236-265`)는 Attribute Role의 결정 입력 후보(전수조사 §3 "attribute=scope_type/scope_values로 행단위 접근 결정=ABAC 최근접이나 단일목적 축소판")이나 그 자체가 "Role 유형 인스턴스"는 아니다. Require MFA 게이트(`UserAuth.php:929-1036,3719-3760`)는 Conditional Role의 조건 후보(§13 Authentication)이나 role 활성 로직과 미연결(전수조사 §8).
- **마케팅 automation 오분류 방지**: `RuleEngine.php`(`:12,24,32,34,194-220`)의 IF-THEN은 Rule Role과 명칭이 유사하지만 대상이 role/permission이 아니므로(channel_roas/sku_stock) Dynamic Role Type의 Rule Role 인스턴스가 아니다(ADR D-4·중복 감사 D-1).

## 5. 설계 원칙

- **유형은 상호 배타적 분류축**: 하나의 Dynamic Role Definition은 정확히 1개 `role_type`을 가지며, 복수 유형 특성이 필요하면 Rule Composition(스펙 §6 Nested Rule/Rule Group)으로 조합한다(유형 자체를 다중 선택으로 만들지 않음).
- **Context Role vs Conditional Role vs Runtime Role 경계 명시**: Runtime Role은 "언제 계산되는가"(요청/세션 시점) 축, Conditional Role은 "어떤 조건이 충족되어야 하는가"(§13) 축, Context Role은 "어떤 Runtime Context 값을 참조하는가"(§5) 축으로 서로 직교(orthogonal) — 설계 시 혼용 금지.
- **Emergency/Read-only/Temporary Context Role은 Context Role의 특수 파라미터화**로 취급(별도 최상위 유형이 아니라 Context Role + 제약 플래그 조합으로 구현 가능성 검토 대상, 확정은 Part 3-6+에서).

## 6. Gap / BLOCKED_PREREQUISITE

- 10유형 전부 코드 0 — 우선순위는 ADR 다음 추천 순서(§37)에 따라 Runtime Role·Session Role·Context Role 3종이 본 Part 3-5 per-entity 우선 대상, 나머지 7유형(Conditional/Attribute/Rule/Calculated/Emergency/Read-only/Temporary)은 후속 Part에서 세분화 예정.
- **BLOCKED_PREREQUISITE(RP-002)**: 유형별 Activation Trigger(§10)·Expiration(§11)이 참조할 Runtime Guard(§28)·Static Lint(§29)가 미설계.
