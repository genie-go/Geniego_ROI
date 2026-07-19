# DSAR — Authentication Evidence (06-A-03-02-03-03 · §47)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §47.

## 1. 원문 전사 (Canonical Contract)

**§47 Authentication Evidence** — Actor가 "어떤 인증수단·세션·assurance로 그 Decision을 제출했는가"를 사후 재현하는 인증 증거 레코드. 필수 참조(원문 전사):
- `session ref` · `method ref` · `provider event ref`
- `token binding ref` · `nonce binding ref` · `device binding ref` · `client binding ref`
- `step-up ref` · `MFA result ref`
- `assurance result`(authentication/credential/session/device AAL)
- `session status` · `revocation status` · `replay status`
- `authentication snapshot`(§43) · `authentication digest`(§45)
- `immutable digest`
- ★**Raw Credential 저장 금지**(§5.7): Password·OTP원문·TOTP Secret·Refresh Token·Access Token 전체·Session Cookie·Private Key → Reference/Masked/Digest/Verification Result만.

의미: Authentication Evidence는 §43 Authentication Snapshot + §45 Authentication Context Digest를 묶어 session↔method↔assurance↔token/nonce/device/client binding 결선을 불변 증거로 고정한다. 핵심 계약: **원문 자격증명은 어떤 형태로도 증거에 담기지 않으며**(token id digest·nonce result·verification result만), assurance result와 revocation/replay status를 포함해 "커밋 시점 인증이 유효했음"을 반박불가로 남긴다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인증 증거 레코드(session↔method↔assurance↔binding 결선)는 부재** — `session ref`/`method ref`/`token·nonce·device·client binding ref`/`assurance result`/`immutable digest`를 한 증거체로 묶는 구조 전무. 특히 **session↔Decision Command 결합 자체가 ABSENT**(`Alerting.php:562,572-599,601-665` — decideAction 단일 approved·executeAction 재인증/MFA 없음) → 인증상태를 승인에 결선할 대상 미형성.
- **실존하는 재사용 substrate**(인증방식은 대량 실재·증거로 결선되지 않음):
  - **세션** — 발급 `UserAuth.php:964-970`(`bin2hex(random_bytes(32))` 64-hex opaque)·검증 `:229-318`·만료/유휴 `:965,282-286`·revocation logout `:1765`/revoke-others `:4173`/deprovision `EnterpriseAuth.php:400,413`/DELETE `:1381,1617,1631`. `session ref`·`revocation status`의 실 재료.
  - **method** — bcrypt 로그인 `UserAuth.php:730`·TOTP `:3459-3484`·SMS OTP `:3970-3976`·이메일 OTP `:3924-3934`·복구코드 `:3491-3527`·MFA 정책 `:3638-3660`·SSO OIDC `EnterpriseAuth.php:206-244`·SAML `:247-298,568-619`·SCIM `:315-434`. `method ref`·`provider event ref`의 실 재료이나 **전부 로그인 시점 국한·승인 미결합**.
  - **nonce** — OIDC `EnterpriseAuth.php:194,534`·state `:214`,`OAuth.php:219`·SAML `:271-283`·phone `UserAuth.php:2641-2656`·DSAR `index.php:147`. `nonce binding ref` 패턴 실재이나 **로그인·SSO 국한, 승인 커맨드에는 부재**.
  - **불변 감사체인** — `SecurityAudit.php:14-33`(`:27` prev_hash). `immutable digest`·`authentication digest`의 CANONICAL 저장 substrate.
- **★Raw Credential 실위험(§5.7 경계/위반)**: `user_session.token` **평문 저장**(`UserAuth.php:969` — 해시 없이 `WHERE token=?`)·`mfa_secret`(TOTP) **평문 base32 저장**(`UserAuth.php:3421,3771`). → 인증 증거를 이 값들에서 파생하면 안 되며, evidence는 token id **digest**·verification result만 담아야 함.
- **★현재 승인 감사=비체인 audit_log 문자열**(`Alerting.php:28`·`Mapping.php:60`) → 인증 assurance/session/revocation status를 담은 불변 인증 증거 없음. Device/Fingerprint/Trusted(**ABSENT**)·mTLS(**ABSENT**)로 `device binding ref`/`client binding ref` 대상 미존재.

## 3. 판정 (Verdict)

- Verdict: **ABSENT(인증 증거 결선체) · PARTIAL-substrate(인증 스택 대량 실재)**. Evidence Verdict 규율상 **ABSENT/PARTIAL**: 승인 인증 evidence는 비체인 audit_log 문자열이며 §43 snapshot·§45 digest·불변 저장·session↔command 결선이 없다.
- 선행 의존: §47은 §43 Authentication Snapshot·§45 Digest·§20 Session·§22 Authentication Binding(session↔command)·§32 MFA Binding을 참조 — session↔command 결합·MFA-decision 결합·step-up 전부 부재. 승인 결합부 **BLOCKED_PREREQUISITE**.
- cover: **0**(인증 증거 결선 전무). 저장 substrate=`SecurityAudit`, 세션/MFA/SSO/nonce 재료 실재 → 실 엔진은 "발명 아닌 조립". **단 평문 token/mfa_secret 2건은 §5.7 위반으로 evidence 파생 전 선(先)교정 대상**(BLOCKED_SECURITY, 별도 수정세션).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authentication_evidence` — Decision commit 트랜잭션 내에서 §43 snapshot + §45 digest + session/method/provider event/token digest/nonce result/device/client binding + assurance result + session/revocation/replay status를 **한 증거체로 원자적 append**. 저장은 `SecurityAudit`(`SecurityAudit.php:14-33`) 불변체인으로 승격(비체인 `Alerting.php:28`·`Mapping.php:60`에서 이전).
- **★Raw Credential 비저장 강제(§5.7)**: evidence에는 **token id digest·nonce verification result·assurance result만**. `user_session.token`(`UserAuth.php:969`)·`mfa_secret`(`UserAuth.php:3421,3771`) 평문은 증거원천에서 배제하고, 두 평문 저장 자체를 별도 세션에서 해시/Crypto로 교정(§62 Lint: Raw Access Token·OTP·TOTP Secret 저장 차단).
- **Golden Rule=Extend**: 새 세션/MFA/SSO 발명 금지. `method ref`는 실재 TOTP/SMS/email/OIDC/SAML(위 §2 citation)을 참조만; `nonce binding ref`는 실재 one-time nonce 패턴(OIDC `:194,534`·phone `UserAuth.php:2641-2656`·DSAR `index.php:147`)을 **로그인에서 승인 커맨드로 확장**(§24). `session ref`/`revocation status`는 실재 revocation(`:1765,4173`·`EnterpriseAuth.php:400,413`)을 결선.
- **commit-time 결선**: `Alerting::executeAction`(`Alerting.php:601-665`)의 미재검증 집행을 §30 Commit Binding·§55 Revalidation로 대체해, evidence가 "커밋 시점 session active·token 미폐기·assurance 충분"을 담게 함. 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_EVIDENCE]] · [[DSAR_APPROVAL_AUTHENTICATION_CONFLICT]] · [[DSAR_APPROVAL_AUTHENTICATION_DRIFT]] · [[DSAR_APPROVAL_SESSION_REPLAY_DETECTION]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
