# DSAR — Actor Identity Assurance: Static Lint (§62)

> EPIC **06-A-03-02-03-03** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Static Lint는 Identity Assurance Governance 부재 전제 위 신규 차단 규칙. 현행 실 위반은 마이그레이션 후 게이트로 승격 · 현행 무위반 규칙은 회귀방지 예방(오탐 계상 금지).

## 1. 원문 전사 (Canonical Contract)

§62 Static Lint(차단) 원문 전사: Email Primary Key · Display Name Reference · Request Body Actor ID 신뢰 · Original Principal 없는 Impersonation · Effective Actor 없는 Delegation · Raw Access/Refresh Token · Password · OTP · API Key 원문 저장 · Session 없는 Approval Token · Session Binding 없는 Command · Tenant 없는 Session · Assurance 없는 Auth Context · Service/System Actor Human Mapping · Impersonation/Support Approval 기본 허용 · Authentication Snapshot Setter · Identity Snapshot Update Repository · 고객 Feature Flag Revalidation 제거 · 중복 Principal/Session/Device Registry.

의미: Static Lint는 CI/코드리뷰 단계에서 위 안티패턴을 **정적 차단**한다. 각 규칙은 "현행 실 위반(마이그레이션 대상) / 예방(현행 위반 없음) / 부재 개념 예방" 셋 중 하나로 분류되어야 하며, 오탐(현행에 없는데 P0로 계상, 또는 canonical actor 정본을 위반으로 계상) 금지.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §62 규칙 | 현행 위반 여부 | 근거(GROUND_TRUTH) |
|---|---|---|
| Email Primary Key | **부분(승격 대상)** | canonical actor가 `user:{email}` 문자열(`Mapping.php:36-53`) — Canonical Subject id로 승격 필요(email≠PK). 단 클라이언트 email 신뢰는 아님 |
| Display Name Reference | **위반 0(예방)** | actor 문자열은 email/apikey 안정식별자(`Mapping.php:36-53`)·display name 참조 없음 |
| Request Body Actor ID 신뢰 | **★실 위반** | `Alerting::actor()`(`Alerting.php:33-36`) X-User-Email 헤더/`?actor=` 쿼리 신뢰 → decideAction 기록(`:574,591,593,597`) |
| Original Principal 없는 Impersonation | **★실 위반** | member impersonation `_impersonated` payload만·이중보존 없음(`UserAdmin.php:472-534` `:493-497`) |
| Effective Actor 없는 Delegation | **위반 0(부재)** | Delegation 도메인 자체 부재(`Onsite.php:86`=A/B) — 예방 규칙 |
| Raw Access/Refresh Token 저장 | **★실 위반** | `user_session.token` 평문(`UserAuth.php:969` `WHERE token=?`)·해시 없음 |
| Password 원문 저장 | **위반 0(양호)** | bcrypt(`UserAuth.php:730`) |
| OTP 원문 저장 | **위반 0(양호)** | SMS/email OTP bcrypt(`UserAuth.php:3970-3976,3924-3934`)·복구코드 sha256(`:3491-3527`) |
| API Key 원문 저장 | **위반 0(양호)** | sha256 저장·raw 1회 발급(`index.php:483-493`·`UserAuth.php:4240-4246`) |
| TOTP Secret 원문 저장 | **★실 위반** | `mfa_secret` 평문 base32(`UserAuth.php:3421,3771`) |
| Session 없는 Approval Token | **★실 위반** | Alerting 승인이 세션 아닌 헤더 actor 기반(`Alerting.php:33-36,82,127,171,189,603`) |
| Session Binding 없는 Command | **★실 위반** | decideAction/executeAction 세션↔커맨드 결합 부재(`Alerting.php:572-599,601-665`) |
| Tenant 없는 Session | **위반 0(양호)** | tenant 강제 주입(`index.php:590-600`)·session은 tenant 스코프 |
| Assurance 없는 Auth Context | **실 부재** | Auth Context/AAL 구조 자체 부재(신규) |
| Service/System Actor Human Mapping | **부분(위반 창)** | `apikey:{id}`·`'system'`·`'admin'` 혼재·Actor Type 미분류 |
| Impersonation/Support Approval 기본 허용 | **★실 위반** | member impersonation이 승인 구별 없이 실 세션 발급(`UserAdmin.php:472-534`) |
| Authentication Snapshot Setter | **위반 0(예방)** | Auth Snapshot 저장소 자체 부재(신규 시 immutable) |
| Identity Snapshot Update Repository | **위반 0(예방)** | Identity Snapshot 저장소 부재(신규 시 append-only) |
| 고객 Feature Flag Revalidation 제거 | **위반 0(예방)** | 해당 flag 부재(§5.12 명문화) |
| 중복 Principal/Session/Device Registry | **위반 0(양호)** | app_user·user_session 각 단일 SoT·Device Registry 부재 → 중복 없음 |

## 3. 판정

- **Verdict: Identity Assurance Governance 부재 전제 위 신규 Static Lint 규칙 설계.** 규칙은 세 부류.
  - **현행 실 위반(마이그레이션 대상 → 게이트 승격)**: Request Body Actor ID 신뢰(`Alerting.php:33-36`)·Original Principal 없는 Impersonation(`UserAdmin.php:472`)·Raw Session Token(`UserAuth.php:969`)·TOTP Secret 원문(`:3421,3771`)·Session 없는 Approval Token·Session Binding 없는 Command(`Alerting.php:572-665`)·Impersonation Approval 기본 허용. 정본=Alerting·UserAdmin·user_session·mfa_secret.
  - **예방(현행 위반 0)**: Display Name Reference·Effective Actor 없는 Delegation·Password/OTP/API Key 원문·Tenant 없는 Session·Snapshot Setter·Update Repository·Feature Flag Revalidation·중복 Registry. ★이들은 현행에 없으므로 **회귀 방지 예방 규칙**(정직 기술) — P0 위반으로 계상 금지.
  - **부분/승격**: Email Primary Key(email→Canonical Subject id 승격)·Service/System Actor Human Mapping(Actor Type Registry 분류).
- cover: **부분** — canonical actor 서버도출·tenant 강제·비저장 원칙(password/otp/apikey)이 실 substrate. Lint 규칙셋·enforcement CI는 0.
- 선행: 실 코드 lint 적용은 Principal Registry/Auth Context 신규 후 — BLOCKED_PREREQUISITE. ★단 Alerting actor·평문 저장 2종·impersonation 규칙은 선행 무관 자립 적용 가능. 이번 차수=규칙 명세.

## 4. 확장·구현 방향 (설계)

- **차단 규칙 카탈로그(신규)**: 위 19종을 CI 정적 규칙으로 정의. 승인/신원 경로(Approval Command·Actor Resolution·Session Verify) AST에서만 발화하도록 스코프 한정 — SSO/OAuth nonce(`EnterpriseAuth.php:194`·`OAuth.php:219`)·bcrypt OTP·sha256 apikey는 allowlist 예외로 오탐 차단.
- **핵심 검출 규칙**: ① 승인 경로에서 `$_SERVER['HTTP_X_USER_EMAIL']`/`?actor=` 등 client-passed actor를 승인자로 사용하면 차단 → canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`) 참조 강제. ② Impersonation 세션 발급 시 Original Principal 필드 미기록 차단. ③ 세션 토큰/TOTP secret을 raw로 INSERT하는 write 차단(해시/Crypto 강제). ④ Approval Command에 session/auth-context binding 없는 dispatch 차단.
- **마이그레이션 대상 승격**: 실 위반 7종은 Principal Registry/Auth Context/Snapshot 신규 완료 후 `Alerting`·`UserAdmin`·`user_session`·`mfa_secret` 교정과 동시에 lint를 fail 게이트로 승격(무후퇴 예외=개선).
- **중복 방지**: "중복 Principal/Session/Device Registry" lint는 app_user·user_session 외 신규 사용자/세션 저장소 도입을 차단(실존 확장 강제·§67).
- **정직 기술 유지**: canonical actor 정본·tenant 강제·password/otp/apikey 비저장은 현행 안전 속성 — 신규 시 보존해야 할 기준이지 교정 대상 아님.
- **실 구현은 선행 Decision Core 신설 후 별도 승인세션**(자립 3종은 선행 가능).

관련: [[DSAR_APPROVAL_IDENTITY_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_IDENTITY_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_IDENTITY_DUPLICATE_IMPLEMENTATION_AUDIT]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
