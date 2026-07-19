# DSAR — Authorization Denial (06-A-03-02-03-04 Part 1 · §30)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★인용은 GROUND_TRUTH([DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract)

§30 DENIAL — 원문 전사 필드:
- `denial type` / `denial code`
- `primary policy` / `conflicting policy`
- `explicit deny` / `default deny` 구분
- `failed conditions` · `missing context fields`
- `retry allowed` / `challenge allowed` / `exception allowed` / `override allowed` / `manual review allowed`
- `user message key`
- `operator detail reference` / `security detail reference`
- `denied at` · `immutable digest`

의미: Denial은 Authorization Decision이 DENY(§23 Effect)로 확정될 때 산출되는 **거부 사유의 구조화 레코드**다. 핵심은 ① **Explicit Deny(정책이 명시적으로 금지) vs Default Deny(정책 부재·Context 불완전·엔진 장애로 기본 거부, §5.2)** 구분, ② 거부 후 어떤 회복 경로가 허용되는지(retry/challenge/exception/override/manual review) 선언, ③ **사용자 메시지(`user message key`)와 운영자/보안 상세(`operator/security detail reference`)를 분리**(§26 REASON "민감 내부 Rule을 사용자 메시지로 노출 금지"와 정합)하여 내부 정책 로직 유출 차단, ④ `immutable digest`로 불변 봉인.

## 2. 기존 구현 대조

- **구조화된 Denial 레코드는 부재** — 거부를 `denial type/code`·explicit vs default·failed conditions·회복경로·user/security 분리·digest로 기록하는 모델이 없다. 현재 거부는 HTTP 상태코드+단문 메시지로 끝난다.
- 실존하는 거부 idiom(구조화 아님):
  - **중앙 RBAC fail-closed 401/403**(`index.php:553-603`) — roleRank(`index.php:554`)·write 게이트(`index.php:568-578`)·admin:keys(`index.php:564-567`) 미충족 시 거부. 그러나 이는 이진 거부이지 explicit/default 구분·회복경로·security detail 분리가 없다. 키조회 예외→401(`index.php:490-493`)도 fail-closed idiom.
  - **DENY_SCOPE fail-closed**(`TeamPermissions.php:234`) — ABAC data_scope 미해결 시 행 차단. `default deny` 성격의 idiom이나 Denial 레코드로 산출·저장되지 않는다.
  - **roleOf fail-closed**(`TeamPermissions.php:120-131` `:127`) — 미해결→member로 강등(권한상승 벡터 제거). Default-deny 방향 idiom.
  - **agency 위임 fail-closed**(`index.php:74-104`) — `agency_client_link.status='approved'` 재검증 실패 시 거부.
- ★fail-open 위험(거부여야 할 지점이 허용):
  - `requireFeaturePlan` 3중 fail-open(`UserAuth.php:64-84` `:68,72,82-84`) — plan null→allow·catch→allow·admin bypass. Default Deny(§5.2)에 정면 위배.
  - FE `writeGuard.js` UI-only·fail-open(`writeGuard.js:13,61-90,73`) — 서버 미배선 시 거부가 클라이언트에서만 걸림.
  - `subjectScope` catch→null(`TeamPermissions.php:211,224`) — 조회실패 시 상위서 무제한 가능.
- `denial type/code`·`explicit/default deny` 플래그·`retry/challenge/exception/override/manual review allowed`·`operator/security detail reference`·거부 `immutable digest` → **no hits**.

## 3. 판정

- Verdict: **ABSENT (구조화 Denial 모델 부재) · idiom-substrate**
- substrate 태그: fail-closed 거부 idiom(`index.php:553-603`·`TeamPermissions.php:234,120-131`·`index.php:74-104`) = **CANDIDATE**(거부 발생점은 실재). 단 explicit/default 구분·회복경로·user/security 분리·digest는 전무.
- ★위험 등재: `requireFeaturePlan` fail-open(`UserAuth.php:64-84`)·writeGuard UI-only(`writeGuard.js:13`)·subjectScope null(`TeamPermissions.php:211,224`) = **FAIL_OPEN_RISK** — Denial/Default-Deny 도입 시 fail-closed 전환 대상.
- 선행 의존: Denial은 Decision(§24)·Effect(§23 DENY)·Reason(§26)에 종속 — 상위 Decision Foundation 부재로 BLOCKED_PREREQUISITE.
- cover: **부분(거부 발생점 idiom 실재, 구조화 Denial 레코드 0)**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_denial` — DENY 결정의 구조화 레코드. 필드: `denial_id`·`decision_id`·`denial_type`·`denial_code`·`primary_policy_ref`(+version)·`conflicting_policy_ref`·`is_explicit_deny`·`is_default_deny`·`failed_conditions`·`missing_context_fields`·`retry_allowed`·`challenge_allowed`·`exception_allowed`·`override_allowed`·`manual_review_allowed`·`user_message_key`·`operator_detail_ref`·`security_detail_ref`·`denied_at`·`immutable_digest`.
- **user vs security detail 분리 불변식**(§5.9·§26): 사용자에게는 `user_message_key`(로컬라이즈드·비민감)만, 내부 정책 매칭·conflicting policy·failed condition 상세는 `operator/security detail reference`로 격리. 민감 내부 Rule 사용자 노출 금지를 스키마·API(§60 `Sensitive Redaction`)에서 강제.
- **Explicit vs Default Deny 강제 구분**(§5.2·§5.3): Policy Set(§11) Combining Algorithm이 DENY_OVERRIDES로 명시 거부한 경우=Explicit; Registry/Policy/Version 누락·Context 불완전·엔진 장애=Default Deny. 고위험 Approval/Payment/Security는 Default Deny 시 절대 Permit 전환 금지(§45).
- ★fail-open 시정(후속 enforcement Part): `requireFeaturePlan`(`UserAuth.php:64-84`)의 null→allow·catch→allow를 Default Deny로, `subjectScope` catch→null(`TeamPermissions.php:211,224`)을 DENY_SCOPE로, writeGuard(`writeGuard.js:13`)를 서버 requireTeamWrite 전역배선으로 전환. 이번 Part는 위험 등재+Denial Contract 설계까지, 실 수정은 후속.
- 회복경로 라우팅: Denial의 `challenge_allowed`→Challenge(§31), `exception_allowed`→Exception(§32), `override_allowed`→Override(§33), `manual_review_allowed`→Decision Result MANUAL_REVIEW_REQUIRED(§25)로 연결.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CHALLENGE]] · [[DSAR_APPROVAL_AUTHORIZATION_EXCEPTION_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_OVERRIDE_FOUNDATION]] · [[DSAR_AUTHORIZATION_DECISION_REASON]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
