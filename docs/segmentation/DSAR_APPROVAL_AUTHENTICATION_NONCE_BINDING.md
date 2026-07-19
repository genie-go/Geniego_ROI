# DSAR — Approval Authentication Nonce Binding (06-A-03-02-03-03 · §24)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist).

## 1. 원문 전사 (Canonical Contract)

**§24 Nonce Binding** — nonce type 9종:
`LOGIN` · `OIDC` · `MFA_CHALLENGE` · `DECISION_COMMAND` · `MAGIC_LINK` · `WEBAUTHN_CHALLENGE_REF` · `STEP_UP` · `API_REQUEST` · `CUSTOM`.

검증: **Tenant/Principal/Session/Decision Slot/Action 일치 · 미사용 · 미만료 · 성공 후 소비 · 재사용 차단**(§52 Session Replay Detection 과 연동, "동일 One-time Token/Nonce 재사용 차단").

## 2. 기존 구현 대조

- **★one-time nonce 패턴은 실재하나 로그인 세션·승인 커맨드에는 미적용.** GROUND_TRUTH "Nonce/state/replay" 행이 명시: 1회 소비·재사용 차단이 **SSO/OAuth 국한**이다.
  - **OIDC**: id_token `nonce` 검증(`EnterpriseAuth.php:194,534`) + `state` 1회성 CSRF(`:214`).
  - **커넥터 OAuth**: `state` CSRF 1회성(`OAuth.php:219`).
  - **phone(SMS OTP)**: 1회 소비 nonce/코드(`UserAuth.php:2641-2656`).
  - **DSAR**: 요청 nonce(`index.php:147`).
  - SAML: assertion 1회 소비+NotOnOrAfter(`EnterpriseAuth.php:271-283`).
- **★부재 구간이 §24 의 핵심**: 위 패턴은 **연합 로그인/외부 링크/전화 검증** 경로에만 있고 — **일반 로그인 세션 발급(`UserAuth.php:964-970`)에는 nonce 가 없으며**, **승인 커맨드(`Mapping.php:186-190` propose/approve·`Alerting.php:572-599` decideAction)에는 `DECISION_COMMAND`·`STEP_UP` nonce 가 전혀 결합되지 않는다**. 동일 승인 요청을 재전송해도 이를 차단할 one-time nonce 가 승인경로에 없다.
- **MFA_CHALLENGE nonce**: TOTP(`UserAuth.php:3459-3484`)·SMS(`:3970-3976`)·email OTP(`:3924-3934`)·복구코드(`:3491-3527`)는 존재하나 **로그인에만 결합**(GROUND_TRUTH "미결합"). MFA 결과를 특정 decision slot/action 에 묶는 nonce 는 없다.
- **9종 중 실 매핑**: `OIDC`=실재 · `API_REQUEST`(OAuth state)=실재 · `MAGIC_LINK`(DSAR/phone 링크성)=부분 실재 · `MFA_CHALLENGE`=존재하나 미결합 · **`LOGIN`·`DECISION_COMMAND`·`STEP_UP`·`WEBAUTHN_CHALLENGE_REF`=부재**.

## 3. 판정

- **Verdict: PARTIAL(패턴 실재·승인 미적용)**.
  - PRESENT: OIDC nonce/state(`EnterpriseAuth.php:194,534,214`)·OAuth state(`OAuth.php:219`)·phone(`UserAuth.php:2641-2656`)·DSAR(`index.php:147`)·SAML assertion 1회(`:271-283`) — one-time·재사용 차단 실동작.
  - ABSENT: `LOGIN`·`DECISION_COMMAND`·`STEP_UP`·`WEBAUTHN` nonce, 그리고 nonce↔Session/Decision Slot/Action 결합.
- **선행 의존**: `DECISION_COMMAND`·`STEP_UP` nonce 는 §3.3 Decision Foundation·Command Envelope 부재로 BLOCKED_PREREQUISITE.
- **cover: 부분** — 연합/외부링크/전화 nonce 는 커버. 승인 커맨드 replay 방지용 nonce 0.

## 4. 확장/구현 방향 (설계)

- **기존 one-time 패턴을 CANONICAL substrate 로 재사용**(Golden Rule=Extend): OIDC `state/nonce`(`EnterpriseAuth.php:214,194`)·OAuth state(`OAuth.php:219`)·phone(`UserAuth.php:2641-2656`)의 "생성→저장→성공 후 소비→재사용 차단" 로직을 nonce 서비스로 일반화. 새 nonce 엔진 발명 금지 — 동일 소비/차단 원리 확장.
- **`DECISION_COMMAND` nonce 신설(승인 replay 봉합)**: 승인 제출 시 tenant/principal/session/decision slot/action 에 바인딩된 one-time nonce 를 요구하고, 성공 후 소비·재전송 차단. `mapping_change_request`(`Db.php:623-634`)의 재승인 dedup(`Mapping.php:279`)은 논리적 중복만 막으므로 nonce 는 전송레벨 replay 를 별도로 차단(KEEP_SEPARATE).
- **`STEP_UP` nonce**: 고위험 승인(고액/결제/정산/관리자취소)에서 재인증 챌린지를 특정 decision slot/action 에 결속해 타 액션 재사용(§29·§60 TOKEN_REPLAY/NONCE_REUSE) 차단.
- **`MFA_CHALLENGE` nonce 를 decision 에 결합**: 현재 로그인 전용인 MFA 결과(`UserAuth.php:3459-3484`)를 §32 MFA Binding Foundation 을 통해 decision slot 에 묶고, OTP 원문 아닌 nonce/verification result 만 저장.
- 실 구현 = 별도 승인 세션(선행 Decision Core 후). 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_TOKEN_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_SCOPE_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_COMMIT_BINDING]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
