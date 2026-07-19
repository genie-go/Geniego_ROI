# DSAR — Authorization Expiration (§41)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§41 `APPROVAL_AUTHORIZATION_EXPIRATION` 원문 전사:

만료 대상:
- `Request` 만료
- `Context` 만료
- `Decision` 만료
- `Challenge` 만료
- `Exception` 만료
- `Override` 만료
- `Cache` 만료
- (`Simulation` · `Reconciliation` 만료)

핵심 규칙: **고위험 Permit 장기 재사용 금지.**

의미: Expiration은 인가 수명주기 각 산출물(Request·Context·Decision·Challenge·Exception·Override·Cache·Simulation·Reconciliation)의 **만료 시점**을 규정한다. §40 Validity가 재사용 범위·무효화 트리거를 담당한다면, Expiration은 시간 축의 강제 소멸을 담당한다. 특히 고위험 Permit은 짧은 만료로 장기 재사용을 원천 차단한다(§5.14 Override/Break-glass는 Expiration 필수·§61 DB 제약 Override/Exception Expiration Not Null).

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 산출물 만료 규정은 부재** — Request/Context/Decision/Challenge/Exception/Override/Cache에 만료를 부여하는 구조체 전무(GROUND_TRUTH §1 **Authorization Decision/Snapshot/Evidence/Digest = ABSENT**·§53 Critical Gap "Expiration 없음"·"Exception 무기한"·"Override 일반 Allow 기록").
- 실존하는 유사 substrate(★인가 만료 아님):
  - **api_key scopes 화이트리스트**(`Keys.php:99-113,198-206`·`UserAuth.php:4204-4290`) — scope 화이트리스트+역할상한이나 인가 판정 자체의 만료가 아니라 키 권한 범위.
  - `admin_roles/user_roles` **DORMANT**(`UserAdmin.php:627-641,788-812`) — 저장·할당되나 런타임 미소비. 만료 필드도 소비 로직도 없음.
- **Exception/Override 만료 = no hits(가장 위험)**: Break-glass/Emergency Override·Exception이 후속 Part 순신규이므로 현재 `valid until`/`max use count`/`post-review deadline` 개념 전무. 도입 시 만료 강제(§61 Not Null) 없으면 무기한 Override=Critical Gap.
- **Challenge 만료 = no hits**(§31 Challenge Foundation 부재·MFA/step-up challenge 미도입).
- **Cache 만료 = no hits**(§49 Cache Foundation 부재 — 현재 매요청 재평가라 판정 캐시 자체가 없음).

## 3. 판정

- **Verdict: ABSENT** (인가 산출물 만료 규정 전무). 현재 **매요청 재평가**라 stale Decision/Cache 재사용 위험은 낮으나, Exception/Override/Challenge/Cache 도입 시 만료 부재는 §53 Critical Gap(무기한 Exception·Override 일반 Allow·장기 재사용).
- **선행 의존: BLOCKED_PREREQUISITE** — 만료 대상(Decision/Challenge/Exception/Override/Cache/Simulation/Reconciliation) 대부분이 순신규·후속 Part 기능이라 만료 부여 대상 자체가 아직 없음. §40 Validity와 짝을 이루는 시간축 규정.
- **cover: 0** (인가 만료 데이터 전무). api_key scope·admin_roles는 KEEP_SEPARATE(권한 범위·DORMANT 롤)로 인가 판정 만료 대체 아님.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_expiration` 규정 — Request/Context/Decision/Challenge/Exception/Override/Cache/Simulation/Reconciliation 각 산출물에 만료 시점 부여. §40 Validity의 `valid until`·`max age`와 정합, §39 Commit Binding의 `미만료` 재검증이 이를 소비.
- **★고위험 Permit 장기 재사용 금지(핵심 규칙)**: 고위험 Approval Permit·Exception·Override는 짧은 만료+`post-review deadline` 강제(§5.14). §61 DB 제약 `Override/Exception Expiration Not Null`을 스키마로 강제해 무기한 Exception/Override 원천 차단 — 현재 Exception/Override 부재이므로 도입 시점에 만료 필수를 계약으로 못박음.
- **DORMANT 롤 소비 시 만료 배선**: `admin_roles/user_roles`(`UserAdmin.php:627-641,788-812`)를 런타임 소비로 활성화할 때, 임시/긴급 롤은 Expiration으로 자동 소멸하도록 설계(현재 저장만·만료 미소비). Cache 도입 시 §49 Cache 만료·즉시 Invalidation(Kill Switch/Policy 변경)과 연계.
- **무후퇴**: 매요청 재평가의 fail-closed 특성을 후퇴시키지 않고, Expiration은 캐싱/재사용 도입 시 stale 방어선으로만 추가. 실 배선은 후속 Part(Challenge/Exception/Override/Cache) 신설 후 별도 승인세션. Part 1=만료 계약 설계만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_VALIDITY]] · [[DSAR_APPROVAL_AUTHORIZATION_COMMIT_BINDING]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_BINDING]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
