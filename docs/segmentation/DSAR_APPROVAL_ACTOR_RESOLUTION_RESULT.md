# DSAR — Actor Resolution Result (06-A-03-02-03-03 · §18)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§18 RESOLUTION_RESULT (원문 전사):

RESULT enum(15종): `RESOLVED` / `RESOLVED_WITH_DELEGATION` / `RESOLVED_WITH_IMPERSONATION` / `RESOLVED_AS_SERVICE_ACCOUNT` / `RESOLVED_AS_SYSTEM_ACTOR` / `RESOLVED_WITH_WARNINGS` / `UNRESOLVED` / `AMBIGUOUS` / `DISABLED` / `EXPIRED` / `TENANT_MISMATCH` / `MEMBERSHIP_INVALID` / `EMPLOYMENT_INVALID` / `MANUAL_REVIEW_REQUIRED`.

필드: `principal` · `canonical subject` · `original principal` · `effective actor` · `actor type` · `identity AAL` · `authentication AAL` · `delegation result` · `impersonation result` · `tenant result` · `employment result` · `membership result` · `role result` · `position result` · `exclusion reasons` · `resolved_at` · `expires_at`.

의미: Resolution Result는 §17 Pipeline의 **출력 판정**이다. 단순히 "누구"가 아니라 "해석이 성공/모호/차단됐는가, 위임·대행·서비스계정·시스템액터 중 무엇인가, 어느 축(tenant/employment/membership/role/position)이 유효/무효인가"를 구조화된 결과로 반환한다. exclusion reasons로 거부 근거를 남겨 §63 Runtime Guard·Manual Review와 연결한다.

## 2. 기존 구현 대조

- **구조화된 Resolution Result는 부재** — 현재 actor 해석의 유일 출력은 `Mapping::actorId`(`Mapping.php:36-53`)의 **문자열 또는 null** 이진 결과다. 15종 enum·축별 결과·exclusion reasons를 담는 결과 객체가 없다.
  - 사실상 `RESOLVED`(문자열 반환) / `UNRESOLVED`(null) 2상태만 표현되며, 감사용 약칭 `actor()`는 null을 `'unknown'`으로 대체(`Mapping.php:56-58`)해 오히려 UNRESOLVED를 은폐한다.
- **effective actor는 실재·original principal 미보존** — effective actor(=actorId) substrate는 있으나 original principal은 저장되지 않는다(GROUND_TRUTH §1·§3-6). RESOLVED_WITH_IMPERSONATION/RESOLVED_WITH_DELEGATION을 판별할 근거가 없다.
- **actor type 결과 부재** — HUMAN/SERVICE_ACCOUNT/SYSTEM_ACTOR 구분이 없다. RESOLVED_AS_SERVICE_ACCOUNT/SYSTEM_ACTOR 표현 불가.
- **축별 result 부재** — tenant는 미들웨어 주입(`index.php:417,437`)·RBAC rank(`index.php:554`)·team_role(`TeamPermissions.php:120-136`)이 실재하나, employment/membership/role/position을 "결과값"으로 산출하지 않는다. Employment/Position 개념 자체 ABSENT(GROUND_TRUTH §1).
- **identity/authentication AAL 결과 부재** — §12 Assurance Level Model 미산출(별도 DSAR).
- **exclusion reasons·MANUAL_REVIEW_REQUIRED 부재** — 승인 fail-closed(`Mapping.php:268` 자기승인 차단·`:287` 정족수 2)는 실재하나, actor 해석 단계의 거부 사유 열거·수동검토 경로는 없다.

## 3. 판정

- Verdict: **PARTIAL(빈약)** — effective actor(RESOLVED) substrate만 실재 · 15종 중 나머지 13종·축별 result·exclusion reasons·AAL·original principal 전부 부재.
- cover: **부분(하한)** (RESOLVED/UNRESOLVED 이진값 = `Mapping.php:36-53,56-58` · 구조화 결과 객체 = 순신규).
- 선행 의존: Result는 §17 Pipeline 24단계의 출력이고, Pipeline이 employment/membership/delegation/impersonation을 해석하려면 §3.1 Canonical Identity·§3.4 Delegation Foundation이 선행 — 부재로 대부분 enum이 BLOCKED_PREREQUISITE. effective actor 실재로 실 엔진은 "이진 결과를 15종 판정으로 확장".

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_actor_resolution_result` 구조체 — §17 Pipeline 출력을 15종 enum + 축별 result + exclusion reasons로 반환. Golden Rule=Extend: effective actor는 `Mapping::actorId`(`Mapping.php:36-53`) 결과를 채택하고, null→UNRESOLVED로 정직 매핑(`actor()`의 `'unknown'` 마스킹은 결과객체에서 제거하고 로그 전용으로 격리).
- 축별 result 배선: tenant result=미들웨어 주입 tenant(`index.php:417,437`) 일치 검사, role result=RBAC rank(`index.php:554`)·team_role(`TeamPermissions.php:120-136`). employment/membership/position result는 §3.1 Foundation 신설 후 채움(그전엔 NOT_APPLICABLE + WARNING).
- original principal + impersonation result: `UserAdmin.php:472-534` impersonation 시 RESOLVED_WITH_IMPERSONATION + original=admin·effective=대상으로 반환(현재 은폐 결함 해소, §5.8 준수).
- exclusion reasons → §63 Guard/§64 Error Contract enum(DISABLED/EXPIRED/TENANT_MISMATCH 등)과 1:1 매핑. AMBIGUOUS/MANUAL_REVIEW_REQUIRED는 Legacy Email-only actor에 Mapping Confidence 미달 시 반환(§84 임의 Canonical 확정 금지).
- resolved_at/expires_at로 Result에 유효기간 부여 → §55 Commit-time Revalidation이 만료 결과 재사용을 차단.

관련: [[DSAR_APPROVAL_ACTOR_RESOLUTION_CONTEXT]] · [[DSAR_APPROVAL_ACTOR_RESOLUTION_PIPELINE]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
