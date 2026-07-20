# DSAR — Approval Context Role (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Context Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN은 Permit하지 않음(fail-closed) · Dynamic ≠ 정적 role · 마케팅 Rule Engine 오흡수 금지(KEEP_SEPARATE) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Context Role은 Runtime Context(스펙 §5: Current User·Session·Device·Network·IP·Region·Organization·Project·Environment·Time·Authentication Context)의 현재 값을 직접 조건으로 삼아 활성/비활성되는 Role이다(스펙 §3 유형 목록 7번). Runtime Role(자매편)이 "언제 재계산되는가"에 초점을 둔다면, Context Role은 "어떤 Runtime Context 값이 조건인가"에 초점을 둔다 — 두 축은 직교(orthogonal)하며 함께 조합되어 실제 Dynamic Role Definition을 구성한다.

## 2. Canonical 필드

스펙 §5(Runtime Context 11개 항목)·§3(Context Role·Emergency/Read-only/Temporary Context Role 파생) 근거 설계 필드(코드 0·미확정):

- `context_role_id` · `role_definition_ref` · `context_dimension`(§5 11항목 중 1개 이상: user/session/device/network/ip/region/organization/project/environment/time/authentication) · `context_condition`(예: `region = 'KR'`, `environment = 'production'`) · `activation_mode`(standard/emergency/read-only/temporary — §3 파생 3유형과 연결)

## 3. 열거형 / 타입

- `context_dimension`: Current User | Current Session | Current Device | Current Network | Current IP | Current Region | Current Organization | Current Project | Current Environment | Current Time | Authentication Context (스펙 §5, 그대로 인용)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Context Role = ABSENT**: `dynamic/runtime/session/conditional/context role` grep 0(전수조사 §1). Runtime Context 값을 조건으로 role을 활성화하는 로직이 코드베이스에 없다.
- **Runtime Context 값 자체는 부분 실재하나 표시/기록 전용(전수조사 §5)**: `user_session`(`Db.php:1111-1117`)·ALTER `ip/ua/last_seen`(`UserAuth.php:4237`)·`recordSessionMeta`(`UserAuth.php:4243-4251`)·`listSessions`(`UserAuth.php:4254-4281`). 전수조사 §5 명시: "Runtime Context가 role 결정 로직 입력으로 연결된 지점 없음." `authedUser`/`authedTenant`는 정적 team_role/plan을 반환할 뿐 context 값(region/environment/time 등)을 role 산출에 사용하지 않는다.
- **environment 축은 `Db::envLabel()`로 실재하나 role과 무관**: 전수조사 §4 표 "environment" 행 — `Db.php:56-61`, "role 활성 입력?"=✗(배포라벨·OTP 개발모드 게이트 전용, `UserAuth.php:966`).
- **Device/Network 축은 컬럼 수준 부재**: 전수조사 §4 명시 "device/network = 부재(컬럼 없음·user_session.ip/ua만 표시용)". Organization/Project/Cost Center 등 Attribute Source(§4) 다수도 grep 0(부재).
- **Region/Country/Language은 Context Role 조건 후보로 검토 가능하나 role 연결 지점 grep 0**(ground-truth 문서에 별도 file:line 언급 없음 — ABSENT로 판정, 지어내지 않음).

## 5. 설계 원칙

- **직교 축 준수**: Context Role은 Runtime Role(재계산 시점)·Conditional Role(조건 충족 여부)과 개념적으로 겹치므로, 실 구현 시 3유형을 동일 Rule Evaluation 엔진 위에서 서로 다른 "조건 소스"로만 구분(엔진 3중 신설 금지).
- **Emergency/Read-only/Temporary Context Role은 `activation_mode` 파라미터로 흡수**: 별도 최상위 유형 테이블을 만들지 않고 Context Role + `activation_mode` 조합으로 표현(Dynamic Role Type 자매편 §5 원칙과 일치).
- **environment 축은 `Db::envLabel()`을 결정 입력 후보로 등록**하되 직접 수정하지 않음(읽기 전용 참조, ADR §3 Canonical Interface Adapter 원칙).
- **Device/Network처럼 컬럼이 부재한 축은 "조건 불가" 상태로 명시**: 존재하지 않는 속성을 조건으로 거는 Context Role 정의는 Rule Evaluation에서 `ATTRIBUTE_NOT_FOUND`(스펙 §30 Error Contract)로 fail-closed 처리(UNKNOWN 취급, Permit 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- Region/Country/Language/Organization/Project/Device/Network/Cost Center 등 다수 Attribute Source가 컬럼 수준에서 부재(전수조사 §4) — Context Role이 참조할 데이터 소스 자체가 스키마 신설 대상.
- **BLOCKED_PREREQUISITE(RP-002)**: Context Role이 산출할 Runtime Scope Projection(스펙 §15: Tenant/Organization/Project/Dataset/API)이 선행 Scoped Role Governance(Part 3-4, 코드 0) 확정 후에만 결합 설계 가능.
- Emergency Context Role의 "비상 상황" 판정 기준(누가/무엇이 트리거하는가)이 스펙에 세부 정의 없음 — 후속 세부 설계 필요(Part 3-6+ 또는 별도 승인세션).
