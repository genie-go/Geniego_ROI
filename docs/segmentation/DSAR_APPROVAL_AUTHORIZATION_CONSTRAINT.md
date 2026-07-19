# DSAR — Authorization Constraint (06-A-03-02-03-04 Part 1 · §29)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★인용은 GROUND_TRUTH([DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract)

§29 CONSTRAINT (Permit 범위 제한) — 원문 전사:
- 유형(16종): `MAX_AMOUNT` / `ALLOWED_CURRENCIES` / `RESOURCE_TYPES` / `FIELDS` / `DENIED_FIELDS` / `READ_ONLY` / `TIME_WINDOW` / `ORGANIZATION_SCOPE` / `LEGAL_ENTITY_SCOPE` / `TENANT_SCOPE` / `CHANNEL_SCOPE` / `CLIENT_SCOPE` / `DEVICE_SCOPE` / `COUNT` / `EXPORT_LIMIT` / `CUSTOM`.
- **위반 시 Permit 재사용 금지.**

의미: Constraint는 Permit을 **취소하지 않고 그 유효범위를 좁히는** 조건이다. 예: "허용하되 ₩N 이하·특정 조직 하위·읽기전용·특정 시간창·특정 필드만"으로 Permit의 적용 경계를 규정한다. Advice(§28·권고, 이행 무관 Permit 유효)와 달리 Constraint는 **경계를 벗어나면 그 Permit을 재사용할 수 없다**(§40 VALIDITY의 `constraint 위반 없음`·§39 COMMIT_BINDING의 `Constraint 위반 없음` 게이트와 결합). Decision Snapshot(§34)의 `constraints` 슬롯에 불변 기록되고, Constraint 위반은 Drift(§48)/재평가(§47) 트리거가 된다.

## 2. 기존 구현 대조

- **Permit에 부착되는 범위제한(Constraint) 선언 구조체는 부재** — "허용하되 이 범위 안에서만" 을 데이터로 선언·검증·기록하는 모델이 없다.
- ★가장 근접한 실 substrate(범위한정 idiom이나 Constraint 모델 아님):
  - **ABAC data_scope 행필터**(`TeamPermissions.php:236-322`) — `effectiveScope`/`scopeSql`이 subject의 데이터 접근을 행 단위로 좁힌다. `ORGANIZATION_SCOPE`/`TENANT_SCOPE`류 범위제한과 의미가 유사하나, 이는 **정적 ACL 기반 상시 필터**이지 특정 Authorization Decision의 Permit에 부착되어 그 결정에 종속되는 Constraint가 아니다. DENY_SCOPE fail-closed(`TeamPermissions.php:234`)로 미해결 시 차단.
  - **위임 상한 검증**(`TeamPermissions.php:615-647`) — `assignableMap` 교집합·`DELEGATION_EXCEEDED`로 부여 가능한 권한 상한을 좁힌다. `COUNT`/scope류 제한과 유사 발상이나, 이는 RBAC 부여상한이지 Permit 범위 Constraint가 아니다(GROUND_TRUTH: DELEGATION_EXCEEDED는 RBAC 부여상한 오탐 주의).
  - **tenant 강제주입**(`index.php:590-593,600`) — X-Tenant-Id 무조건 덮어쓰기로 `TENANT_SCOPE`를 사실상 강제하나, 이는 IDOR 방어 전역 격리이지 결정단위 Constraint가 아니다.
  - `subjectScope` catch→null(`TeamPermissions.php:211,224`)는 조회실패 시 빈값으로 상위서 무제한 가능(effectiveScope `:251` DENY_SCOPE로 부분보완) — Constraint 모델이라면 fail-closed로 강제됐어야 할 지점.
- `MAX_AMOUNT`/`ALLOWED_CURRENCIES`/`FIELDS`/`DENIED_FIELDS`/`READ_ONLY`/`TIME_WINDOW`/`EXPORT_LIMIT`를 Permit에 부착하는 필드 → **no hits**. 금액 상한·필드 마스킹·시간창·수출한도를 인가결정 범위제한으로 선언하는 구조 전무.

## 3. 판정

- Verdict: **ABSENT (Constraint 모델 부재) · PARTIAL-substrate**
- substrate 태그: `data_scope 행필터`(`TeamPermissions.php:236-322`)·`위임상한`(`TeamPermissions.php:615-647`)·`tenant 강제주입`(`index.php:590-593,600`) = **CANDIDATE(범위한정 원시재료)**. 단 이들은 상시 필터/부여상한/전역격리이지 결정종속 Constraint가 아니므로 Constraint 엔티티로 직접 대체 불가.
- 선행 의존: Constraint는 Decision(§24)·Permit Effect(§23)에 부착 — 상위 Decision Foundation 부재로 BLOCKED_PREREQUISITE.
- cover: **부분(범위한정 substrate 실재, 결정부착 Constraint 모델 0)**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_constraint` — Authorization Decision의 Permit에 부착되어 그 유효범위를 좁히는 조건. 필드: `constraint_id`·`decision_id`·`constraint_type`(16종)·`parameters`(amount/currency/fields/time window/scope subtree/count/export limit)·`sequence`·`captured_at`. **위반 시 Permit 재사용 금지 불변식**을 §39 Commit Binding·§40 Validity·§49 Cache 무효화에 배선.
- Golden Rule=Extend: `TeamPermissions` ABAC(`TeamPermissions.php:236-322`)의 `effectiveScope`/`scopeSql`을 `ORGANIZATION_SCOPE`/`TENANT_SCOPE`/`LEGAL_ENTITY_SCOPE` Constraint의 **평가·집행 엔진 substrate로 재사용**하되, Constraint는 그 위에서 특정 Decision에 종속된 스코프를 표현(상시 ACL 필터와 KEEP_SEPARATE). 위임상한(`TeamPermissions.php:615-647`)은 `COUNT` Constraint가 아니라 RBAC 부여상한으로 명명분리 유지.
- ★fail-closed 승격 대상: `subjectScope` catch→null(`TeamPermissions.php:211,224`)은 Constraint 도입 시 "조회실패→무제한"이 아니라 "조회실패→DENY_SCOPE"로 통일(§5.2 Default Deny·§45 Fail-Closed). 현재 부분보완을 전역화.
- `FIELDS`/`DENIED_FIELDS`/`READ_ONLY` Constraint는 Obligation(§27)의 MASK/LIMIT_FIELDS와 구분: Constraint는 Permit 범위 자체를 정의(범위 밖 데이터는 애초에 허용 안 됨), Obligation은 허용된 데이터에 후속 마스킹 강제. 두 층을 Policy(§10)에서 명시 분리.
- 실 배선/수정(data_scope fail-closed 전역화 포함)은 후속 enforcement Part. 이번 Part=Canonical Constraint Contract·substrate 재사용 방향만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_ADVICE]] · [[DSAR_APPROVAL_AUTHORIZATION_DENIAL]] · [[DSAR_AUTHORIZATION_SCOPE]] · [[DSAR_AUTHORIZATION_OBLIGATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[project_n231_team_permission_rbac]].
