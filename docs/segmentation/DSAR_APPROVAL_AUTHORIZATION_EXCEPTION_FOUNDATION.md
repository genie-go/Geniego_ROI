# DSAR — Authorization Exception Foundation (06-A-03-02-03-04 Part 1 · §32)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★인용은 GROUND_TRUTH([DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract)

§32 EXCEPTION Foundation — 원문 전사 필드:
- `policy` · `subject scope` / `resource scope` / `action scope`
- `reason` · `business justification`
- `requested by` / `approved by`
- `valid from` / `valid until` · `max use count`
- `evidence required` · `audit level` · `revocable` · `revoked`
- **불변식: Policy 자체 변경 안 함 · Time/Scope/Subject/Resource/Action-bound.**

의미: Exception은 특정 Policy가 거부/제한하는 상황에 대해 **정책 자체를 바꾸지 않고**, 한정된 주체·리소스·액션·기간에 대해서만 예외적 허용을 부여하는 구조다. 핵심 불변식은 ① **Policy 원문 불변**(§5.7 Policy Versioned·raw policy 수정 금지) — 예외는 정책을 우회하는 별도 승인체이지 정책 개정이 아니다, ② **모든 경계 bound**(Time/Scope/Subject/Resource/Action) — 무제한·무기한 예외 금지(§53 "Exception 무기한" Critical Gap), ③ `evidence required`·`audit level`·`revocable`로 추적·회수 가능, ④ `business justification`·`requested/approved by`로 사유·책임 귀속. Decision Snapshot(§34)의 `exception` 슬롯·§39 Commit Binding의 `Exception 유효` 게이트와 결합.

## 2. 기존 구현 대조

- **Authorization Exception 선언체는 부재** — 정책을 변경하지 않고 한정범위·한정기간 예외허용을 부여·추적·회수하는 구조가 전무. 현재 시스템에서 "예외 허용"은 코드 분기(admin bypass 등)로 처리될 뿐 데이터로 선언·감사되지 않는다.
- 인접 자산(예외 아님·오히려 통제되지 않은 우회):
  - `requireFeaturePlan` admin bypass(`UserAuth.php:64-84` `:68,72,82-84`) — admin은 과금게이트 통과. 이는 **예외 선언체가 아니라 하드코딩 bypass**(§53 "Hardcoded Admin Bypass")로, valid until·max use·evidence·revocable 없이 무기한 우회. Exception이 있었다면 이런 우회가 bound·audited됐어야 할 지점.
  - `admin_roles`/`user_roles` 커스텀롤(`UserAdmin.php:627-641,788-812`) — permissions 저장/할당되나 런타임 미소비(DORMANT·죽은 RBAC). 예외 권한 부여의 데이터 저장소가 될 수 있었으나 미배선.
  - master/sub 권한상승 차단(`UserAdmin.php:65-68,273,287,358,395`) — sub의 admin발급/대행 차단은 통제이지 예외부여가 아니다.
- ★중대 긍정(GROUND_TRUTH): 하드코딩 user-id/email 기반 예외허용 **부재** — admin 판정 전부 DB plan/plans/admin_level 기반(`TeamPermissions.php:132`·`UserAdmin.php:65`). "특정 사용자만 예외 허용" 류 소스 리터럴 예외 없음.
- `valid from/until`·`max use count`·`business justification`·`revocable/revoked`·`evidence required`(예외 대상) → **no hits**.

## 3. 판정

- Verdict: **ABSENT (순신규)**
- substrate 태그: 없음(무의미 수준). admin bypass(`UserAuth.php:64-84`)는 예외 substrate가 아니라 **통제되지 않은 우회(FAIL_OPEN_RISK·HARDCODED_AUTHORIZATION)** — 오히려 Exception 도입으로 bound·audited 대상. DORMANT 커스텀롤(`UserAdmin.php:627-641`)은 저장소 재사용 후보이나 예외 semantics 부재.
- 선행 의존: Exception은 Policy(§10)·Decision(§24)·Evidence(§35)에 종속 — 상위 Policy/Decision Foundation 부재로 BLOCKED_PREREQUISITE.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_exception` — 정책 불변 전제의 한정 예외허용. 필드: `exception_id`·`policy_ref`(변경 대상 아님·참조만)·`subject_scope`·`resource_scope`·`action_scope`·`reason`·`business_justification`·`requested_by`·`approved_by`·`valid_from`·`valid_until`(NOT NULL·§61)·`max_use_count`·`current_use_count`·`evidence_required`·`audit_level`·`revocable`·`revoked`·`immutable_digest`.
- **불변식 강제**: ① Policy 원문 불변 — Exception은 policy를 참조만 하고 절대 수정하지 않음(§5.7·§54 Lint "Exception without Expiration" 차단). ② 전 경계 bound — valid_until·scope 없는 예외 생성 거부(§61 `Override/Exception Expiration Not Null`). ③ max_use_count 소진·valid_until 경과 시 자동 무효(§40 Validity·§41 Expiration). ④ revocable·revoked로 즉시 회수(§49 Cache 즉시 무효화).
- ★우회→예외 전환(후속 enforcement Part): `requireFeaturePlan` admin bypass(`UserAuth.php:64-84`)처럼 현재 무기한·무감사 우회를 Exception 선언체로 흡수해 bound·audited화. DORMANT `admin_roles`/`user_roles`(`UserAdmin.php:627-641`)은 예외 권한 저장소로 재활성 검토(죽은 RBAC 정리·§59).
- Exception(§32) vs Override(§33) 분리: Exception=정책 불변·사전 승인·한정범위 통상 예외; Override=긴급/break-glass·사후검토·비상. 동일 상황에 오용 금지(§33 "일반 Permit 기록 금지"·Exception도 통상 Permit과 분리). 실 배선은 후속.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_OVERRIDE_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DENIAL]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_SNAPSHOT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
