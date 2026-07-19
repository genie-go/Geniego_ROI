# DSAR — Session Replay Detection Foundation (06-A-03-02-03-03 · §52)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §52.

## 1. 원문 전사 (Canonical Contract)

**§52 Session Replay Detection Foundation** — 동일 인증 아티팩트의 재사용을 탐지·차단하는 축. 필수 필드(원문 전사):
- `session` · `token family` · `token id digest` · `nonce`
- `request digest` · `decision slot` · `action` · `device` · `client`
- `first used` · `last used` · `use count`
- `replay status` · `conflicting request refs`

★핵심 계약: **동일 One-time Token/Nonce 재사용 차단**. token id digest·nonce·use count로 one-time 자산의 재제출을 탐지하고, 동일 decision slot/action에 대한 중복 request digest를 conflicting refs로 묶어 replay status를 판정한다. §24 Nonce Binding(성공 후 소비·재사용 차단)과 §23 Token Binding(token family/generation)의 결합 축.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **승인 경로 Session Replay 탐지 = ABSENT** — token family·token id digest·nonce·use count·replay status를 승인 커맨드에 결선하는 구조 전무. `Alerting::decideAction`(`Alerting.php:574`)은 단일 approved만·request digest/use count 없음.
- **★SSO/OAuth one-time 실재·로그인/승인 미적용(핵심 판정)**:
  - **one-time nonce/state 방어는 실재하나 인증 진입 국한** — OIDC state+nonce `EnterpriseAuth.php:194,534`·state `:214`·OAuth state CSRF 1회성 `OAuth.php:219`·SAML assertion 1회+NotOnOrAfter+XSW/replay 방어 `EnterpriseAuth.php:271-283`·phone OTP nonce `UserAuth.php:2641-2656`·DSAR nonce `index.php:147`. 즉 **재사용 차단 패턴 자체는 프로덕션급으로 실재**한다.
  - 그러나 이 one-time 소비는 **SSO 로그인·아웃바운드 OAuth·전화인증·DSAR에 국한**되고, **로그인 세션 발급 자체와 승인 커맨드에는 부재**(GT 표 `:61` "로그인 세션·승인 커맨드에는 부재"). 승인 Decision에 nonce/token id digest/use count가 결선되지 않아 replay를 탐지할 대상이 없다.
  - **세션 모델** — opaque stateful(`UserAuth.php:964-970`)·JWT 아님·**JTI/refresh/token family 부재**(GT 표 `:62`) → `token family`·`token id digest`·`Session Generation` 축 미존재. 매 요청 DB 조회이나 use count/first-last used 추적 없음.
- **request digest/decision slot/action binding = ABSENT** → 동일 커맨드 재제출을 conflicting request refs로 묶을 축 없음. `user_session.token` 평문(`UserAuth.php:969`)은 재생 시 즉시 세션 탈취 위험(§5.7 경계)이나 replay **탐지**와는 별개.

## 3. 판정 (Verdict)

- Verdict: **ABSENT(승인 경로 replay 탐지) · PARTIAL-substrate(one-time nonce 패턴 실재)**. 재사용 차단 로직은 SSO/OAuth/phone/DSAR에서 프로덕션급으로 실재하나 로그인 세션·승인 커맨드에 미적용.
- 선행 의존: §52는 §23 Token Binding(token family/generation)·§24 Nonce Binding(승인 커맨드 nonce)·§22 Authentication Binding(request digest↔slot/action)에 종속. token family/JTI·승인 nonce·request digest 전부 미형성 → BLOCKED_PREREQUISITE.
- cover: **0(승인 replay 탐지).** 단 one-time nonce 소비/재사용 차단 패턴(OIDC `:194,534`·OAuth `:219`·SAML `:271-283`·phone `:2641-2656`·DSAR `index.php:147`)은 **CANONICAL 재사용 재료로 실재**.

## 4. 확장/구현 방향 (설계)

- Session Replay Detection은 **파생 축** — §24 Nonce Binding을 승인 커맨드에 도입(LOGIN/DECISION_COMMAND/STEP_UP nonce)하고, §23 Token Binding에 token family/id digest/generation을 두어야 use count·conflicting refs 판정이 성립. 선행 신설 전 착수 시 BLOCKED_PREREQUISITE.
- **★Golden Rule=Extend(핵심)**: one-time 재사용 차단을 **발명 금지** — 실재 SSO/OAuth/phone/DSAR nonce 소비 패턴(OIDC `EnterpriseAuth.php:194,534`·`OAuth.php:219`·SAML `:271-283`·phone `UserAuth.php:2641-2656`·DSAR `index.php:147`)을 **로그인 세션·승인 커맨드로 확장 적용**. 동일 성공-후-소비·재사용 차단 규약을 Decision slot/action에 결선.
- **request digest·use count**: 승인 커맨드에 request digest(§22)를 두고 first/last used·use count를 추적해 동일 커맨드 재제출을 replay status로 판정·§63 Guard로 차단(§64 `TOKEN_REPLAY`·`NONCE_REUSED`).
- **평문 세션토큰 선(先)교정**: `user_session.token` 평문(`UserAuth.php:969`)은 재생 시 세션 즉시 탈취 → token id **digest** 저장으로 교정(§5.7)한 뒤 replay 축의 `token id digest`로 재사용. 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_DRIFT]] · [[DSAR_APPROVAL_SESSION_HIJACK_FOUNDATION]] · [[DSAR_APPROVAL_AUTHENTICATION_CONFLICT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
