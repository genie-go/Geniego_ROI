# DSAR — Actor Identity Assurance: Runtime Guards (§63)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Runtime Guard는 전량 신규(현행 승인경로 런타임 신원/인증 가드 부재). fail-closed 원칙(§5.11) · IdP 장애 시 고위험 Fail Open 금지(§71).

## 1. 원문 전사 (Canonical Contract)

§63 Runtime Guard(차단) 원문 전사: Principal/Canonical Subject Not Found · Ambiguous Binding · Principal Inactive · Account Disabled/Locked · Subject Suspended · Employment Terminated · Tenant/Legal Entity/Organization Membership Invalid · Role/Position Invalid · Delegation Identity Invalid · Impersonation/Service Account/System Actor Prohibited · Auth Context/Session Missing · Session Expired/Revoked/Compromised · Token Revoked/Replay · Nonce Reuse · Assurance Too Low · Step-up Missing · Device/Client Binding Invalid · Channel Invalid · Slot/Action/Resource/Command Digest Mismatch · Identity/Authentication Drift · Snapshot/Evidence Failure · Kill Switch Active.

의미: Runtime Guard는 실행 시점(Actor Resolution·Auth Context 결합·Commit)에 신원/인증 위반을 감지해 **차단(fail-closed)**한다. Static Lint(코드 정적)와 달리 데이터·세션 상태·동시성 위반을 런타임에 방어하며, 특히 Commit 직전 재검증(§55)과 IdP 장애 Fail-closed가 핵심이다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §63 가드 | 현행 존재 여부 | 근거(GROUND_TRUTH) |
|---|---|---|
| Principal/Canonical Subject Not Found | **부재** | Principal Registry/Canonical Subject Binding 자체 부재(app_user 단일·`UserAuth.php:229-264`) |
| Ambiguous Binding | **부재** | Binding 개념 부재 |
| Principal Inactive / Account Disabled/Locked | **부분(약함)** | `is_active=1` 게이트만(`UserAuth.php:248,260`)·locked/disabled 세분·commit 시점 재검증 없음 |
| Subject Suspended | **부재** | Subject 상태모델 부재 |
| Employment Terminated | **부재** | 고용/직위 개념 없음(team_role만·`TeamPermissions.php:120-136`) |
| Tenant Membership Invalid | **부분(양호 substrate)** | tenant 강제 주입(`index.php:590-600`)·X-Act-As-Tenant 단일값(`UserAuth.php:398`) — 위조 차단은 실재하나 승인 commit 결합 없음 |
| Legal Entity/Organization/Role/Position Invalid | **부재** | 해당 도메인 부재 |
| Delegation Identity Invalid | **부재** | Delegation 부재 |
| Impersonation/Service/System Actor Prohibited | **부재(위험)** | member impersonation 승인 구별 없음(`UserAdmin.php:472-534`)·System Actor 정책 부재 |
| Auth Context/Session Missing | **부분** | 세션 검증은 실재(`UserAuth.php:229-318`)하나 승인 커맨드에 Auth Context 결합 없음 |
| Session Expired/Revoked | **부분(양호 substrate)** | expires_at>now·유휴폐기(`UserAuth.php:282-286`)·revocation(`:1765,4173`) 실재 — 단 승인 commit-time 재검증 없음 |
| Session Compromised | **부재** | Compromise 상태·hijack 탐지 부재 |
| Token Revoked/Replay · Nonce Reuse | **부분** | nonce 1회소비는 SSO/OAuth/phone/DSAR 국한(`EnterpriseAuth.php:194`·`OAuth.php:219`·`index.php:147`)·**승인 커맨드/세션 경로엔 부재**·JTI 없음 |
| Assurance Too Low / Step-up Missing | **부재** | AAL/Step-up 개념 부재·MFA는 로그인만 결합(`UserAuth.php:3459-3484`) |
| Device/Client Binding Invalid | **부재** | Device/Fingerprint 전무·client binding 부재 |
| Channel Invalid | **부재** | Channel Binding 부재 |
| Slot/Action/Resource/Command Digest Mismatch | **부재** | `Alerting::executeAction`(`:601-665`) command digest·slot 결합 없음 |
| Identity/Authentication Drift | **부재** | Validation↔Commit drift 탐지 부재 |
| Snapshot/Evidence Failure | **부재** | 승인=문자열 actor(`Mapping.php:56-58`)·snapshot/evidence 부재 |
| Kill Switch Active | **부재** | Kill Switch 부재 |

## 3. 판정

- **Verdict: 전량 신규(Identity Assurance Governance 부재 전제).** 실 세션 검증(`UserAuth.php:229-318`)·tenant 강제(`index.php:590-600`)·revocation(`:1765,4173`)이 **로그인/조회 시점** 방어를 제공하나, 이는 **승인 Commit 시점 신원/인증 재검증이 아니다**(§55 미달). `Alerting::executeAction`(`:601-665`)은 status·재인증·approver≠executor·command digest 확인 없이 dispatch → Commit Binding(§30)·Revalidation(§55) 전무.
- **★리스크 재확인**: ① `Alerting::actor()`(`:33-36`) client-passed actor 신뢰 → Runtime Guard "Request Body Actor" 차단 필요. ② impersonation 승인 무구별(`UserAdmin.php:472-534`) → "Impersonation Prohibited" 가드 필요. ③ 승인 경로 nonce/replay 부재 → Token Replay/Nonce Reuse 가드 신규.
- cover: **부분** — Session Expired/Revoked·Tenant Membership·Account Inactive 검출 로직이 **로그인 substrate로** 실재(확장), 나머지 다수 가드는 결합 대상(Auth Context/Binding/Snapshot) 부재로 신규.
- 선행: 대상 Principal Registry/Auth Context/Command Binding/Snapshot 부재 → 대부분 가드는 결합 대상 없음(BLOCKED_PREREQUISITE). ★단 Alerting actor/executeAction 가드는 선행 무관 자립 적용 가능. 이번 차수=가드 명세.

## 4. 확장·구현 방향 (설계)

- **fail-closed 전환(무후퇴 예외=개선)**: `Alerting::executeAction`(`:601-665`)에 (a)status='approved' 강제 (b)approver≠executor (c)commit-time 세션 Active·revocation 재조회 (d)command digest 일치 삽입. `Alerting::actor()`(`:33-36`)를 canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`)로 교체해 Request Body Actor 가드 실집행.
- **가드 계층화**: (a)Resolution 시점 — Principal/Canonical Subject Found·Binding Unambiguous·Account/Subject Active·Actor Type·Membership/Role/Position 유효(§17 Pipeline). (b)Auth Context 결합 시점 — Session Missing/Expired/Revoked·Token Replay·Nonce Reuse·Assurance/Step-up·Device/Client/Channel Binding. (c)Commit 시점(§55 27항) — 전 축 재검증 + Slot/Action/Resource/Command Digest Match + Snapshot 생성. (d)전역 — Impersonation/Service/System Actor Prohibited·Identity/Authentication Drift·Kill Switch.
- **양호 substrate 확장**: 세션 Active·revocation(`UserAuth.php:282-286,1765,4173`)·tenant 강제(`index.php:590-600`)를 승인 Commit-time 가드에 결합 — 로그인 방어를 승인 커맨드 방어로 확대(Cross-Tenant Session 차단·§28).
- **IdP 장애 Fail-closed**: SSO/OIDC(`EnterpriseAuth.php:206-244`) 제공자 장애 시 고위험 Decision Commit을 Fail Open 금지 — Circuit Breaker + Manual Review(§71).
- **무후퇴 보장**: 로그인·세션·MFA·SSO 런타임 동작 불변. 가드는 승인 경로에만 추가.
- **실 구현은 선행 Decision Core 신설 후 별도 승인세션**(Alerting 자립 가드는 선행 가능).

관련: [[DSAR_APPROVAL_IDENTITY_STATIC_LINT]] · [[DSAR_APPROVAL_IDENTITY_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
