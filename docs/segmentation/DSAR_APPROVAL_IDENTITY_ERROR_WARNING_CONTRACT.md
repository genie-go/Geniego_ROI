# DSAR — Actor Identity Assurance: Error & Warning Contract (§64/§65)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Error/Warning Contract는 전량 신규(현행 신원/인증 오류 코드 체계 부재). Error=차단(fail-closed), Warning=비차단 관찰. 고위험 Decision의 Disabled/Terminated/Revoked/Assurance 위반을 Warning 강등 금지(§5.11).

## 1. 원문 전사 (Canonical Contract)

### §64 Error Contract (40여종, 원문 전사)

REGISTRY/POLICY/DEFINITION/VERSION_NOT_FOUND · VERSION_INACTIVE · PRINCIPAL/CANONICAL_SUBJECT_NOT_FOUND · SUBJECT_BINDING_AMBIGUOUS · PRINCIPAL_INACTIVE · ACCOUNT_DISABLED/LOCKED · SUBJECT_SUSPENDED · EMPLOYMENT_TERMINATED · TENANT/LEGAL_ENTITY/ORGANIZATION_MEMBERSHIP_INVALID · ROLE/POSITION_INVALID · DELEGATED_ACTOR_INVALID · IMPERSONATION/SUPPORT_ACCESS/SERVICE_ACCOUNT/SYSTEM_ACTOR_PROHIBITED · AUTHENTICATION_CONTEXT_MISSING · METHOD_NOT_ALLOWED · SESSION_NOT_FOUND/EXPIRED/REVOKED/COMPROMISED · TOKEN_REVOKED/REPLAY · NONCE_REUSED · ASSURANCE_TOO_LOW · STEP_UP_REQUIRED/EXPIRED · DEVICE/CLIENT_BINDING_INVALID · CHANNEL_INVALID · DECISION_SLOT/ACTION/RESOURCE_MISMATCH · COMMAND_DIGEST_MISMATCH · IDENTITY/AUTHENTICATION_DRIFT_DETECTED · SNAPSHOT/EVIDENCE_FAILED · RUNTIME_BLOCKED.

### §65 Warning Contract (15종, 원문 전사)

ACTOR_IDENTITY_WARNING · IDENTITY/AUTHENTICATION_ASSURANCE_WARNING · SESSION_EXPIRING_WARNING · DEVICE_TRUST_WARNING · RECENT_PRIVILEGE_ELEVATION_WARNING · DELEGATED_IDENTITY_WARNING · IMPERSONATION_WARNING · SERVICE_ACCOUNT_WARNING · SYSTEM_ACTOR_WARNING · IDENTITY/AUTHENTICATION_DRIFT_WARNING · IDENTITY/AUTHENTICATION_RECONCILIATION_WARNING · MANUAL_REVIEW_REQUIRED_WARNING.

의미: Error는 처리를 중단(fail-closed)하고 응답에 안정적 코드를 제공한다. Warning은 처리를 계속하되 관찰·감사·후속 검토를 트리거한다. Critical(고액/결제/정산/계약/법률/보안/관리자취소)의 ACCOUNT_DISABLED·EMPLOYMENT_TERMINATED·SESSION_REVOKED·ASSURANCE_TOO_LOW·IMPERSONATION_PROHIBITED는 Warning 강등 금지(§5.11).

## 2. 기존 구현 대조 (GROUND_TRUTH)

| 계열 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| REGISTRY/POLICY/DEFINITION/VERSION_* | **부재** | Registry/Policy/Definition/Version 구조 자체 부재 |
| PRINCIPAL/CANONICAL_SUBJECT_NOT_FOUND · SUBJECT_BINDING_AMBIGUOUS | **부재** | Principal Registry/Canonical Subject Binding 부재(app_user 단일·`UserAuth.php:229-264`) |
| PRINCIPAL_INACTIVE · ACCOUNT_DISABLED/LOCKED | **부분(우회)** | `is_active=1` 실패는 안정 코드 아닌 로그인/조회 거부(`UserAuth.php:248,260`)·locked/disabled 세분 없음 |
| SUBJECT_SUSPENDED · EMPLOYMENT_TERMINATED · ROLE/POSITION_INVALID | **부재** | Subject 상태·고용·직위 개념 부재(team_role만·`TeamPermissions.php:120-136`) |
| TENANT_MEMBERSHIP_INVALID | **부분(양호)** | tenant 강제(`index.php:590-600`) — 위조 차단은 실재하나 승인 error code 아님 |
| LEGAL_ENTITY/ORGANIZATION_MEMBERSHIP_INVALID | **부재** | 해당 도메인 부재 |
| DELEGATED_ACTOR_INVALID | **부재** | Delegation 부재 |
| IMPERSONATION/SUPPORT/SERVICE/SYSTEM_ACTOR_PROHIBITED | **부재(위험)** | member impersonation 승인 무구별(`UserAdmin.php:472-534`)·차단 코드 없음 |
| AUTHENTICATION_CONTEXT_MISSING · METHOD_NOT_ALLOWED | **부재** | Auth Context/Method Registry 부재 |
| SESSION_NOT_FOUND/EXPIRED/REVOKED | **부분(우회)** | 세션 검증 실패는 401 거부(`UserAuth.php:229-318`)·유휴폐기(`:282-286`)·revocation(`:1765,4173`) — 안정 error taxonomy 아님 |
| SESSION_COMPROMISED · TOKEN_REVOKED/REPLAY · NONCE_REUSED | **부분/부재** | nonce 재사용 차단은 SSO/OAuth/phone/DSAR 국한(`EnterpriseAuth.php:194`·`OAuth.php:219`·`index.php:147`)·승인 커맨드 경로 없음·JTI 없음 |
| ASSURANCE_TOO_LOW · STEP_UP_REQUIRED/EXPIRED | **부재** | AAL/Step-up 개념 부재 |
| DEVICE/CLIENT_BINDING_INVALID · CHANNEL_INVALID | **부재** | Device/Client/Channel Binding 부재 |
| DECISION_SLOT/ACTION/RESOURCE_MISMATCH · COMMAND_DIGEST_MISMATCH | **부재** | `Alerting::executeAction`(`:601-665`) command digest 결합 없음 |
| IDENTITY/AUTHENTICATION_DRIFT_DETECTED · SNAPSHOT/EVIDENCE_FAILED | **부재** | Drift/Snapshot/Evidence 계층 부재 |
| RUNTIME_BLOCKED | **부재** | Runtime Guard 부재(별도 문서) |
| §65 Warning 전 15종 | **부재** | Warning 체계·Assurance/Impersonation/Drift/Reconciliation Warning 전무 |

## 3. 판정

- **Verdict: 전량 신규.** 실 세션/계정 검증(`UserAuth.php:229-318,248,260`)이 로그인/조회 시점에 401/거부로 실패를 표현하나, 이는 **안정적 Error Contract 코드가 아니다**(HTTP 거부·boolean·error taxonomy 부재). §64 40여종·§65 15종 코드 체계 전무.
- **★정직 기술**: TENANT_MEMBERSHIP_INVALID·SESSION_REVOKED·PRINCIPAL_INACTIVE는 현행에 **검출 로직(tenant 강제·revocation·is_active)이 실재**하나 안정 코드로 노출되지 않는다 — 신규 Contract는 이를 코드화(교정 아닌 표면화). ROLE/POSITION·EMPLOYMENT·LEGAL_ENTITY·DELEGATED_ACTOR·ASSURANCE·STEP_UP·DEVICE 계열은 대상 도메인 부재로 **예방적 코드**(현행 발화 대상 없음) — 오탐 방지.
- **★fail-open 위험 표면화**: `Alerting::actor()` 위조 actor(`:33-36`)·`executeAction` 미승인 집행(`:601-665`)은 IMPERSONATION/COMMAND_DIGEST/SESSION error를 표면화하지 않고 통과 → 신규 Contract에서 fail-closed error로 승격.
- cover: **부분** — 세션/tenant/is_active 검출 로직만 부분 근거. Error/Warning taxonomy는 0.
- 선행: 대상 Registry/Principal/Auth Context/Command Binding 부재 → 다수 코드는 결합 대상 없음(BLOCKED_PREREQUISITE).

## 4. 확장·구현 방향 (설계)

- **Error taxonomy 신규**: §64 40여종을 안정적 문자열 코드로 정의. 각 코드에 severity·차단범위(Resolution/Auth Context/Commit)·복구 절차(재인증/Step-up/Manual Review) 매핑. Critical Profile의 ACCOUNT_DISABLED·EMPLOYMENT_TERMINATED·SESSION_REVOKED·ASSURANCE_TOO_LOW·IMPERSONATION_PROHIBITED는 Error 고정(§5.11 Warning 강등 금지).
- **Warning taxonomy 신규**: §65 15종. Warning은 처리 계속 + Identity Audit(§46)·Manual Review 트리거. SESSION_EXPIRING·RECENT_PRIVILEGE_ELEVATION·DELEGATED_IDENTITY·IMPERSONATION Warning은 Step-up/Reconciliation과 결합.
- **실 검출 승격(무후퇴 예외=개선)**: 세션 revocation(`UserAuth.php:1765,4173`)·유휴폐기(`:282-286`)·tenant 강제(`index.php:590-600`)·is_active(`:248,260`)를 SESSION_REVOKED/EXPIRED·TENANT_MEMBERSHIP_INVALID·ACCOUNT_DISABLED error code로 매핑(HTTP 거부를 승인 경로 안정 코드로). `Alerting` 위조 actor·미승인 집행을 IMPERSONATION_PROHIBITED·COMMAND_DIGEST_MISMATCH·AUTHENTICATION_CONTEXT_MISSING로 표면화.
- **민감정보 비노출**: error/warning 응답에 raw token·mfa_secret·session cookie 미포함(§5.7·§68) — 코드·masked ref만.
- **무후퇴 보장**: 기존 401/로그인 거부 동작 유지하되 승인 경로 error code는 부가(계약 확장·회귀 없음).
- **실 구현은 선행 Decision Core 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_IDENTITY_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_IDENTITY_API_CONTRACT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
