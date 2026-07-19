# DSAR — Authentication Method Registry (06-A-03-02-03-03 · §19)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§19 METHOD_REGISTRY (원문 전사):

METHOD enum(20종): `PASSWORD` / `PASSWORD_PLUS_OTP` / `TOTP` / `SMS_OTP_REF` / `EMAIL_OTP_REF` / `PUSH_MFA_REF` / `OIDC_SSO` / `SAML_SSO` / `ENTERPRISE_SSO` / `WEBAUTHN_REF` / `FIDO2_REF` / `PASSKEY_REF` / `CLIENT_CERTIFICATE_REF` / `MTLS` / `API_KEY_REF` / `OAUTH_CLIENT_CREDENTIALS` / `MAGIC_LINK_REF` / `DEVICE_BOUND_TOKEN_REF` / `SYSTEM_TRUST_REF` / `CUSTOM`.

필드: `factor count` · `factor types` · `phishing resistance` · `replay resistance` · `device binding` · `hardware binding` · `interactive` · `human actor allowed` · `service actor allowed` · `minimum AAL` · `prohibited action types` · `deprecated` · `sunset_at`.

의미: Method Registry는 시스템이 인정하는 인증수단을 **데이터로 열거**하고 각 수단의 강도(factor/phishing/replay/device/hardware)·허용 액터·최소 AAL·금지 액션·폐기예정을 선언한다. §12 AAL 산출·§30 Commit Binding("허용 method인가")·§10 Definition("required/prohibited auth methods")이 참조하는 표준 목록이다.

## 2. 기존 구현 대조

- **인증수단을 데이터로 선언하는 Registry는 부재** — 각 method가 코드에 개별 구현돼 있을 뿐, method·강도·허용액터·최소 AAL을 행으로 열거·조회하는 등록소가 없다.
- **실재 method substrate(등록소 밖, 코드 기반)**:
  - `PASSWORD`: bcrypt `password_verify`(`UserAuth.php:730`).
  - `TOTP`: RFC6238 `hash_hmac('sha1')` ±1(`UserAuth.php:3459-3484`).
  - `SMS_OTP_REF`: 6자리 5분·bcrypt(`UserAuth.php:3970-3976`).
  - `EMAIL_OTP_REF`: 6자리 5분·bcrypt(`UserAuth.php:3924-3934`).
  - `OIDC_SSO`: Auth Code+id_token RS256/JWKS+state+nonce(`EnterpriseAuth.php:206-244`).
  - `SAML_SSO`/`ENTERPRISE_SSO`: ds:Signature C14N+RSA-SHA256·XSW/replay 방어(`EnterpriseAuth.php:247-298`).
  - `API_KEY_REF`: sha256 조회·is_active(`index.php:483-493`)·발급 `genie_key_`+random_bytes(16)(`UserAuth.php:4240-4246`).
  - `OAUTH_CLIENT_CREDENTIALS`: 커넥터 아웃바운드 state CSRF 1회성(`OAuth.php:41-61,190-244`) — 단 비-사용자auth.
  - 복구코드: 8개·sha256·1회 소비(`UserAuth.php:3491-3527`) — MAGIC_LINK/PUSH_MFA와 별개.
- **부재 method**:
  - `WEBAUTHN_REF`/`FIDO2_REF`/`PASSKEY_REF`/`CLIENT_CERTIFICATE_REF`/`MTLS`: grep 무(GROUND_TRUTH §2 Device/mTLS ABSENT). → phishing-resistant(AAL3) 수단 전무.
  - `PUSH_MFA_REF`/`DEVICE_BOUND_TOKEN_REF`/`SYSTEM_TRUST_REF`: 부재. `카카오 OTP`는 stub(`UserAuth.php:3978-3979` `provider_not_implemented`).
- **강도 메타데이터·최소 AAL·prohibited action·deprecated/sunset 부재** — 각 method의 factor count·phishing/replay resistance·허용 액터를 선언하는 필드가 없다. MFA 정책(`UserAuth.php:3638-3660`)은 off/admin/all 스위치일 뿐 method별 메타가 아니다.
- **결정적 갭: 모든 method가 로그인 게이트에서만 소비·승인 decision 미결합** — GROUND_TRUTH §2에서 TOTP/SMS/email/SSO 전부 "미결합".

## 3. 판정

- Verdict: **PARTIAL** — 20종 중 7종(PASSWORD/TOTP/SMS_OTP/EMAIL_OTP/OIDC_SSO/SAML_SSO/API_KEY) 실 구현 substrate 존재 · Registry(데이터 선언)·강도 메타·최소 AAL·deprecated·phishing-resistant 4종(WEBAUTHN/FIDO2/PASSKEY/mTLS) 부재.
- cover: **부분** (7 method 코드 = 재사용 substrate · Registry 등록소 = 순신규. method 구현은 있으나 "등록·조회 가능한 표준 목록"이 아님).
- 선행 의존: Registry는 §12 AAL·§10 Definition의 상위 참조원 — 그 자체는 자립 신설 가능하나, 승인 decision 결합은 §22 Binding 부재로 BLOCKED_PREREQUISITE.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_auth_method_registry` 등록소 — 20종 enum + 강도 메타 + 최소 AAL + prohibited action + deprecated/sunset을 데이터로 선언. Golden Rule=Extend: 실재 7종은 기존 구현(`UserAuth.php:730,3459-3484,3924-3934,3970-3976`·`EnterpriseAuth.php:206-244,247-298`·`index.php:483-493`)을 CANONICAL 어댑터로 등록(재구현 금지)하고 메타만 부여.
- AAL 매핑: PASSWORD=AAL1, TOTP/SMS_OTP/EMAIL_OTP(2FA 조합)=AAL2, WEBAUTHN/FIDO2/PASSKEY/mTLS(순신규)=AAL3. phishing/replay resistance 필드로 §12·§30이 정량 비교.
- 부재 method는 등록소에 `deprecated=false·구현 없음` 대신 **미등록**으로 정직 표기(장식 금지) — WEBAUTHN 등은 구현 시 등록.
- prohibited action types: `API_KEY_REF`·`OAUTH_CLIENT_CREDENTIALS`는 비대화형/서비스 액터 → 고위험 승인 액션 금지로 선언(§5.9·§36 Service Account). `SYSTEM_TRUST_REF`는 §37 System Actor 전용.
- deprecated/sunset로 method 폐기 수명주기 관리(§11 Method Version과 연동). 카카오 stub(`UserAuth.php:3978-3979`)은 미구현으로 미등록 유지.

관련: [[DSAR_APPROVAL_AUTHENTICATION_METHOD_VERSION]] · [[DSAR_APPROVAL_AUTHENTICATION_ASSURANCE_LEVEL]] · [[DSAR_APPROVAL_AUTHENTICATION_SESSION]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
