# DSAR — Authorization Error / Warning Contract (§56 / §57)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

**§56 Error Contract (전부 `APPROVAL_AUTHORIZATION_` 접두, 50여종)**:

- 등록소/스코프: `REGISTRY_NOT_FOUND` · `REGISTRY_INACTIVE` · `REGISTRY_SCOPE_MISMATCH`
- 정책: `POLICY_NOT_FOUND` · `POLICY_INACTIVE` · `POLICY_AMBIGUOUS` · `POLICY_VERSION_MISMATCH` · `POLICY_SET_NOT_FOUND`
- 정의/버전: `DEFINITION_NOT_FOUND` · `DEFINITION_INACTIVE` · `DEFINITION_VERSION_NOT_FOUND` · `DEFINITION_VERSION_INACTIVE`
- 컨텍스트: `CONTEXT_MISSING` · `CONTEXT_INVALID` · `CONTEXT_EXPIRED`
- 주체/행위자: `SUBJECT_MISSING` · `SUBJECT_INVALID` · `EFFECTIVE_ACTOR_MISMATCH`
- 리소스/액션: `RESOURCE_MISSING` · `RESOURCE_INVALID` · `RESOURCE_VERSION_MISMATCH` · `ACTION_MISSING` · `ACTION_INVALID`
- 테넌트/조직: `TENANT_MISMATCH` · `LEGAL_ENTITY_MISMATCH` · `ORGANIZATION_MISMATCH` · `ENVIRONMENT_INVALID`
- 판정: `EXPLICITLY_DENIED` · `DEFAULT_DENIED` · `INDETERMINATE`
- 챌린지/의무/제약: `CHALLENGE_REQUIRED` · `CHALLENGE_INCOMPLETE` · `OBLIGATION_INCOMPLETE` · `CONSTRAINT_VIOLATED`
- 예외/오버라이드: `EXCEPTION_INVALID` · `EXCEPTION_EXPIRED` · `OVERRIDE_INVALID` · `OVERRIDE_EXPIRED`
- 결정/바인딩: `DECISION_EXPIRED` · `COMMIT_BINDING_MISMATCH` · `REVALIDATION_REQUIRED` · `DRIFT_DETECTED`
- 무결성/엔진: `DIGEST_MISMATCH` · `CACHE_INVALID` · `ENGINE_TIMEOUT` · `ENGINE_ERROR` · `KILL_SWITCH_ACTIVE` · `TAMPER_DETECTED` · `RUNTIME_BLOCKED`

**§57 Warning Contract (전부 `APPROVAL_AUTHORIZATION_` 접두, 15종)**:

`POLICY_DEPRECATION` · `POLICY_VERSION_WARNING` · `CONTEXT_EXPIRING` · `DECISION_EXPIRING` · `CACHE_WARNING` · `OBLIGATION_WARNING` · `CONSTRAINT_WARNING` · `CHALLENGE_WARNING` · `EXCEPTION_WARNING` · `OVERRIDE_WARNING` · `DRIFT_WARNING` · `REVALIDATION_WARNING` · `RECONCILIATION_WARNING` · `MIGRATION_WARNING` · `MANUAL_REVIEW_REQUIRED`.

의미: Error는 **인가 판정을 Deny/차단으로 종결**시키는 코드(§45 Fail-Closed·§55 Runtime Guard와 1:1 대응), Warning은 판정을 종결하지 않되 **후속 조치·만료 임박·품질저하를 통지**하는 코드다. 접두 `APPROVAL_AUTHORIZATION_`는 도메인 네임스페이스로 다른 승인 계열 Error(예: `APPROVAL_DECISION_*`·`APPROVAL_AUTHENTICATION_*`)와 코드공간을 분리한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **선언적 인가 Error/Warning 코드 계약은 부재** — 인가 실패가 표준 코드 enum으로 열거·반환되지 않는다. GROUND_TRUTH §1 표에서 **Authorization Decision/Snapshot/Evidence·Versioned Policy·Policy Set/Combining Algorithm = ABSENT**이므로 그 판정결과를 명명하는 Error 계약도 부재.
- 실존하는 유사 실패신호(HTTP status·불리언·문자열, 표준 코드 아님):
  - **중앙 RBAC 게이트**의 401/403 fail-closed(`index.php:490-493` 키조회 예외→401·`index.php:553-603` roleRank/scope 미달→403) — HTTP status로만 표현되고 `APPROVAL_AUTHORIZATION_*` 코드로 분류되지 않는다.
  - **위임 상한 초과** = `TeamPermissions.php:615-647`의 `DELEGATION_EXCEEDED` — 문자열 신호는 실재하나 인가 Error 네임스페이스에 편입되지 않은 지역 코드(RBAC 부여상한 검증용).
  - **DENY_SCOPE fail-closed**(`TeamPermissions.php:234`) — ABAC 행필터가 조회 실패 시 빈 결과를 강제하는 idiom이나, `DEFAULT_DENIED`/`INDETERMINATE` 같은 명시 코드로 표면화되지 않는다.
- **★fail-open 위험 (Error가 있어야 할 자리에 Allow)**: `requireFeaturePlan`(`UserAuth.php:64-84` `:68,72,82-84`)은 plan null→allow·catch→allow — §56 `POLICY_NOT_FOUND`/`ENGINE_ERROR`가 반환돼야 할 지점에서 **오히려 통과**시킨다(§45 위반). FE `writeGuard.js:13,61-90`은 UI-only·fail-open으로 서버측 `RUNTIME_BLOCKED` 신호가 없다.
- `POLICY_VERSION_MISMATCH`/`RESOURCE_VERSION_MISMATCH`/`DRIFT_DETECTED`/`DIGEST_MISMATCH`/`KILL_SWITCH_ACTIVE`/`TAMPER_DETECTED` → **no hits**(버전화·Drift·Kill Switch·Digest 개념 자체 부재).

## 3. 판정

- **Verdict: ABSENT** (표준 Error/Warning 코드 계약 부재). 단 401/403·`DELEGATION_EXCEEDED`·`DENY_SCOPE` 등 **점(点) 신호는 PRESENT-substrate** — 표준 코드로 흡수·정규화할 대상.
- **선행 의존**: Error 계약은 §23 Effect·§25 Decision Result·§30 Denial·§45 Fail-Closed·§55 Runtime Guard의 종속 산출물 — 이들 상위 판정체가 ABSENT/BLOCKED_PREREQUISITE이므로 Error 코드도 순신규 설계.
- **cover: 0** (인가 Error/Warning 코드 데이터 선언 전무). HTTP status·지역 문자열 신호는 코드 계약 대체가 아니며, Error Contract 하위 매핑으로 이관.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `APPROVAL_AUTHORIZATION_*` Error/Warning enum(§56 50여종·§57 15종)을 단일 코드공간으로 선언. 중복 신설 금지 — 기존 401/403(`index.php:553-603`)·`DELEGATION_EXCEEDED`(`TeamPermissions.php:615-647`)·`DENY_SCOPE`(`TeamPermissions.php:234`)를 이 코드로 **매핑**(HTTP status는 표현 계층으로 유지, 코드는 payload로 병기).
- **Error↔Guard 1:1 대응**: §55 Runtime Guard 차단 사유마다 대응 Error 코드를 부여(예: Registry Missing→`REGISTRY_NOT_FOUND`·Resource Version Mismatch→`RESOURCE_VERSION_MISMATCH`·Engine Timeout→`ENGINE_TIMEOUT`). 판정 종결 코드는 반드시 §30 Denial·§45 Fail-Closed를 경유해 **Deny로만** 귀결(Permit 변환 금지, §23).
- **Warning은 비종결**: `*_EXPIRING`·`*_DEPRECATION`·`MANUAL_REVIEW_REQUIRED`는 판정을 막지 않되 §36 Audit Event·§57 통지로 기록. Warning을 Error로 승격하거나 Error를 Warning으로 강등하는 것은 Profile(§14) 정책으로만.
- **민감정보 분리(§26·§30)**: 사용자 메시지는 `localized message key`만, 내부 rule/policy id 등 `operator/security detail reference`는 별도 필드로 — 민감 내부 Rule을 Error 메시지로 노출 금지.
- **실위험 정정 방향(후속 enforcement Part)**: `requireFeaturePlan` fail-open(`UserAuth.php:64-84`)은 `POLICY_NOT_FOUND`/`ENGINE_ERROR` 반환+Default Deny로 전환 설계(과금·정책 게이트), FE writeGuard(`writeGuard.js:13,61-90`)의 부재 신호는 서버 `RUNTIME_BLOCKED`로 대체. Part 1은 코드 계약 정의만·실 배선/수정은 후속.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_API_CONTRACT]] · [[DSAR_APPROVAL_AUTHORIZATION_FUNCTION_REGRESSION_GATE]].
