# DSAR — Actor Identity Assurance: Cache Policy (§70)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Revocation/Disable/Termination 즉시 Invalidation · Sensitive Credential Cache 금지 · Commit Revalidation은 캐시 우회(강한 일관성).

## 1. 원문 전사 (Canonical Contract)

§70 Cache Key(원문 전사): tenant · principal · canonical subject · profile/account/employment/membership/role/position version · session · session generation · method version · assurance · device · device trust version · client · delegation/impersonation version · decision slot · action · effective timestamp. Revocation/Disable/Termination/Membership/Role/Position/Delegation/Device Trust/Client Disable 시 즉시 Invalidation · Critical Drift 시 우회 · Commit Revalidation 강한 일관성.

의미: 캐시 키는 tenant·principal·canonical subject·모든 version 축(profile/account/employment/membership/role/position/method/device trust/delegation/impersonation)·session generation·assurance·decision 좌표를 포함해 **버전 인지·테넌트 격리**를 보장한다. 신원/인증 상태 변경(revocation/disable/termination 등) 시 즉시 무효화하고, Commit-time Revalidation(§55)은 캐시가 stale identity로 disabled/terminated actor를 통과시키지 못하도록 **강한 일관성(캐시 우회)**으로 수행한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §70 항목 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| Cache Key(tenant·principal·subject·version축·session generation·assurance·slot·action) | **부재** | 신원/인증 캐시 계층 자체 부재. 세션은 매 요청 DB 조회(`UserAuth.php:229-318`) |
| Tenant-isolated | **PRESENT(양호 substrate)** | tenant 강제 주입(`index.php:590-600`) — 캐시 키 tenant-first 조립 재료 |
| principal/canonical subject 좌표 | **부재** | Principal Registry/Canonical Subject 부재(app_user 단일) |
| profile/account/employment/membership/role/position version | **부재** | 해당 version 개념 부재·team_role(`TeamPermissions.php:120-136`)만·version 없음 |
| session / session generation | **부분** | 세션 opaque·매 요청 DB 재조회(캐시 아님·`UserAuth.php:229-264`)·generation 개념 없음 |
| method version / assurance / device trust version | **부재** | AAL/Method version/Device 부재 |
| delegation/impersonation version | **부재/부분** | Delegation 부재·impersonation(`UserAdmin.php:472-534`) version 없음 |
| Revocation 즉시 Invalidation | **부분(우회)** | revocation은 DB DELETE(`UserAuth.php:1765,4173`)·매 요청 재조회라 캐시 stale 문제는 없으나 캐시 계층 자체 없음 |
| Disable/Termination 즉시 Invalidation | **부분** | is_active(`UserAuth.php:248,260`) 매 조회 반영·employment termination 개념 없음 |
| Sensitive Credential Cache 금지 | **미명문(리스크)** | session token 평문(`UserAuth.php:969`)·mfa_secret 평문(`:3421,3771`) — 캐시 금지 정책 부재 |
| Commit Revalidation 강한 일관성 | **부재** | Commit-time revalidation 자체 부재(`Alerting.php:601-665`) |

## 3. 판정

- **Verdict: 신원/인증 캐시 계층 전량 신규 · 현행은 무캐시(매 요청 DB 조회).** 실 세션 검증(`UserAuth.php:229-318`)은 캐시 없이 매 요청 DB 순회 — 캐시 부재는 정확성(revocation/disable 즉시 반영)엔 안전하나 고빈도 Resolution·Commit Revalidation에서 비효율. Version 인지 캐시 키·Invalidation 트리거 체계는 0.
- **★양호 substrate·리스크 병존**: (a)tenant 강제(`index.php:590-600`)는 캐시 키 tenant-first 격리의 실 재료(양호). (b)매 요청 재조회 + is_active/revocation 즉시 반영은 **stale-identity 위험이 현재 낮음**(정직 기술) — 캐시 도입 시 이 안전성을 Invalidation으로 유지해야 함. (c)그러나 session token/mfa_secret 평문(`:969,3421,3771`)은 어떤 캐시에도 raw로 저장 금지 명문화 필요.
- cover: **부분** — tenant 격리·매 요청 정확성이 substrate. Version 인지 캐시·Invalidation·Commit 강한 일관성 정책은 0.
- 선행: 캐시 대상 Principal/Subject/Auth Context/Assurance 구조 부재 → BLOCKED_PREREQUISITE.

## 4. 확장·구현 방향 (설계)

- **Cache Key 설계(신규)**: `{tenant · principal · canonical_subject · profile/account/employment/membership/role/position_version · session · session_generation · method_version · assurance · device · device_trust_version · client · delegation/impersonation_version · decision_slot · action · effective_timestamp}` 복합. Tenant-first로 격리 강제(`index.php:590-600` 패턴 준용·§28) — Cross-Tenant Identity 혼입 차단.
- **Resolution Cache**: Principal→Canonical Subject·Active Membership/Role/Position Projection 캐시(version 축 포함) — 매 요청 전체 재조회(`UserAuth.php:229-318`)를 version 인지 캐시로 단축(§71 연계).
- **Invalidation 트리거(신규)**: Session Revocation(`UserAuth.php:1765,4173`)·Account Disable(is_active `:248,260`)·Employment Termination·Membership/Role/Position 변경·Delegation Revoke·Device Trust 변경·Client Disable 시 즉시 무효화. 실 revocation DELETE 이벤트를 캐시 무효화 hook에 결선.
- **금지 명문화(신규)**: ① session token·mfa_secret·OTP·private key 등 **raw credential 캐시 금지**(digest/reference만·§5.7) — 현행 평문 저장(`:969,3421,3771`)이 캐시로 전파되지 않도록. ② 권한 없는 사용자 대상 내부 Identity/Session 캐시 응답 금지.
- **★Commit Revalidation 강한 일관성**: Commit-time(§55)은 **캐시 우회** — disabled/terminated/revoked actor를 stale 캐시가 통과시키지 못하도록 Session Active·Account/Employment·Revocation을 원본 재조회. Critical Drift(§50) 시 캐시 우회 필수. 저위험 Resolution만 캐시 히트 허용.
- **무후퇴 보장**: 캐시는 부가 계층 — 실 세션·is_active·revocation 동작 불변, 캐시 미스는 항상 DB 재조회로 안전 폴백(현행 무캐시 정확성 유지).
- **실 구현은 선행 Decision Core 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_IDENTITY_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_IDENTITY_API_CONTRACT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
