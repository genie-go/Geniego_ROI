# DSAR — Actor Identity Assurance: Index & Performance (§69/§71)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: **IdP 장애 시 고위험 Decision Fail Open 금지(§71).** Commit Revalidation 최소 Path · tenant-first 복합인덱스(Cross-Tenant 조회 방지).

## 1. 원문 전사 (Canonical Contract)

### §69 Index (원문 전사)

Provider Subject/Canonical Subject/Principal/Account ID · Actor Type · Membership · Role · Position · Active/Expiration/Revocation Session · Token Digest · Nonce · Device · Client · Command/Slot Binding · Effective Actor · Original Principal · Delegation · Impersonation · Service/System Actor · Drift · Reconciliation Mismatch.

### §71 Performance (원문 전사)

Resolution Cache · Binding Index · Active Membership/Role/Position Projection · Session Fast Lookup · Revocation List Index · Token Digest/Nonce Index · Device Trust/Client Cache · Commit Revalidation 최소 Path · IdP Circuit Breaker · Snapshot 비동기 금지 · Evidence Transaction Binding · High-risk 강한 일관성. **IdP 장애 시 고위험 Decision Fail Open 금지.**

의미: 신원/인증 검증은 Resolution(Principal→Subject)·Session Lookup·Revocation·Commit Revalidation을 매 요청/커밋마다 수행하므로 인덱스와 Fast Lookup·Projection이 필수다. Commit-time 경로는 최소 오버헤드로 유지하되 IdP 장애 시에도 고위험 Decision을 Fail Open 하지 않고(Circuit Breaker + Manual Review) Snapshot/Evidence는 동기 트랜잭션에 결합한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §69/§71 항목 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| Provider Subject/Canonical Subject Index | **부재** | Provider Subject/Canonical Subject 구조 부재(app_user 단일·`UserAuth.php:229-264`) |
| Principal/Account ID Index | **부분** | app_user·user_session JOIN(`Db.php:942`)·token 조회 실재하나 Principal Registry 인덱스 아님 |
| Actor Type/Membership/Role/Position Index | **부재/부분** | Actor Type·Employment·Position 부재·team_role(`TeamPermissions.php:120-136`)만 |
| Active/Expiration/Revocation Session Index | **부분(약함)** | 세션 조회 `WHERE token AND expires_at>now AND is_active=1`(`UserAuth.php:229-264`)·revocation(`:1765,4173`) 실재하나 인덱스 전략 미명시 |
| Token Digest Index | **부재(위험)** | `user_session.token` 평문·`WHERE token=?`(`UserAuth.php:969`) — digest 인덱스 아님 |
| **api_key Index** | **PRESENT(양호)** | `idx_api_key_tenant` 실재(`Db.php:942-955`)·sha256 조회(`index.php:483-493`) |
| Nonce Index | **부분** | nonce는 SSO/OAuth/phone/DSAR 국한(`EnterpriseAuth.php:194`·`OAuth.php:219`·`index.php:147`)·전용 인덱스 미명시 |
| Device/Client Binding Index | **부재** | Device/Client Binding 부재 |
| Command/Slot Binding · Effective Actor · Original Principal Index | **부재** | 해당 구조 부재(`Alerting::executeAction` command binding 없음·`:601-665`) |
| Delegation/Impersonation/Service·System Actor Index | **부재** | 해당 도메인 부재 |
| Drift/Reconciliation Mismatch Index | **부재** | Drift/Reconciliation 계층 부재 |
| Session Fast Lookup / Revocation List Index | **부분** | 매 요청 DB 조회(opaque stateful·`UserAuth.php:229-318`)·revocation은 DELETE 방식 |
| Commit Revalidation 최소 Path | **부재** | Commit-time revalidation 자체 부재(`Alerting.php:601-665`) |
| IdP Circuit Breaker / Fail Open 금지 | **부재(리스크)** | SSO/OIDC(`EnterpriseAuth.php:206-244`) 장애 시 고위험 Decision 처리 정책 부재 |
| tenant 격리 | **PRESENT(양호)** | tenant 강제(`index.php:590-600`)·idx_api_key_tenant tenant-first |

## 3. 판정

- **Verdict: 인덱스·성능 전략 대부분 신규 · api_key 경로는 양호.** 세션은 매 요청 opaque DB 조회(`UserAuth.php:229-318`)로 Fast Lookup은 있으나 **Token Digest 인덱스가 아닌 평문 `WHERE token=?`(`:969`)** — 유출 위험 + digest 인덱스 부재. Resolution(Principal→Subject)·Commit Revalidation·Binding·Drift 인덱스는 대상 구조 부재로 0.
- **★양호 substrate**: **`idx_api_key_tenant` 실재(`Db.php:942-955`)·sha256 조회(`index.php:483-493`)·tenant 강제(`index.php:590-600`)** — tenant-first 인덱스·해시 조회 패턴이 실재해 신규 Session/Token Digest/Nonce 인덱스의 조립 재료. 오탐 금지 — api_key 인덱스는 위반 아닌 모범.
- **★리스크 재확인**: (a)세션 token 평문 인덱스 → digest 인덱스로 전환 필요. (b)IdP Circuit Breaker 부재 → 고위험 Decision Fail Open 창(§71 위배). (c)Commit Revalidation 최소 Path 부재(경로 자체 없음).
- cover: **부분** — 세션 Fast Lookup·revocation·**api_key tenant 인덱스**·tenant 강제가 substrate. Resolution/Binding/Commit Revalidation 전용 인덱스는 0.
- 선행: 대상 Principal Registry/Auth Context/Command Binding/Snapshot 부재 → 인덱스 대상 테이블 없음(BLOCKED_PREREQUISITE).

## 4. 확장·구현 방향 (설계)

- **인덱스 카탈로그(신규)**: (tenant, provider, provider_subject) unique(§13)·(tenant, canonical_subject)·(tenant, principal)·(tenant, actor_type)·Active Membership/Role/Position 부분인덱스·(tenant, session, expires_at, status) Active/Revocation·**Token Digest**(평문 아닌 sha256·`idx_api_key_tenant` 패턴 준용)·Nonce(tenant, nonce, consumed)·Device·Client·(command_digest, decision_slot) Binding·Effective Actor·Original Principal·Delegation·Impersonation·Drift·Reconciliation Mismatch. 전부 tenant-first 복합키(Cross-Tenant 조회 방지·§28).
- **Fast Lookup·Projection**: Session Fast Lookup(실 opaque 조회 `UserAuth.php:229-264` 확장)·Revocation List Index(DELETE 방식→revocation 목록 인덱스)·Active Membership/Role/Position Projection(materialized)·Resolution Cache(→[[DSAR_APPROVAL_IDENTITY_CACHE_POLICY]]).
- **Token Digest 전환(무후퇴 예외=개선)**: `user_session.token` 평문 `WHERE token=?`(`:969`)를 sha256 digest 조회로 전환 + digest 인덱스 — api_key sha256(`index.php:483-493`)과 동일 패턴으로 통일.
- **Commit Revalidation 최소 Path**: Commit-time(§55)은 Principal/Session Active·Token 미폐기·AAL·Command Digest만 인라인(인덱스 hit), 전체 Membership/Role 재조회는 Projection 캐시 활용. **Snapshot/Evidence는 동기 트랜잭션 결합**(비동기 금지·§71) — 실 트랜잭션 substrate 재사용.
- **★IdP Fail-closed**: SSO/OIDC(`EnterpriseAuth.php:206-244`) 장애 시 Circuit Breaker + 고위험 Decision Manual Review(**Fail Open 금지**). 저위험만 캐시된 Assurance로 제한 진행.
- **무후퇴 보장**: 세션·api_key·SSO 조회 동작 불변, 인덱스/digest 전환은 성능·보안 개선(회귀 없음).
- **실 구현은 선행 Decision Core 신설 후 별도 승인세션**(token digest 전환은 자립 가능).

관련: [[DSAR_APPROVAL_IDENTITY_CACHE_POLICY]] · [[DSAR_APPROVAL_IDENTITY_API_CONTRACT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
