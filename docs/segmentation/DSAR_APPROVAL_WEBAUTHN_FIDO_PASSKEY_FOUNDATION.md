# DSAR — WebAuthn/FIDO2/Passkey Foundation (06-A-03-02-03-03 · §33)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§33 WebAuthn/FIDO2/Passkey Foundation**(Reference만) — 피싱 저항·하드웨어 바운드 인증수단의 참조 계약. 필수 필드:
`credential id digest`(자격증명 ID 다이제스트) · `relying party` · `user handle ref` · `authenticator type` · `attestation ref` · `sign count ref` · `challenge` · `user verification` · `phishing-resistant`(피싱 저항 여부) · `device-bound` · `backup eligibility / state` · `assertion verified_at` · `AAL`.

★ **Private Credential Material 저장 금지.** WebAuthn/Passkey의 private key·raw credential은 절대 저장하지 않으며, `credential id digest`·검증 결과·sign count 참조만 보존. 이 수단은 최고 AAL(PHISHING_RESISTANT/HARDWARE_BOUND)의 근거가 된다(§12·§19 `WEBAUTHN_REF`/`FIDO2_REF`/`PASSKEY_REF`).

## 2. 기존 구현 대조

- **완전 부재(순신규)** — GROUND_TRUTH §2 인증표: Device/Fingerprint/Trusted **ABSENT**(grep 무), mTLS/Client Cert **ABSENT**(grep 무). WebAuthn/FIDO2/Passkey 관련 `credential id digest`·`attestation`·`sign count`·`user verification` 코드·테이블 no hits.
- **현행 최고 인증수단은 TOTP/SSO** — MFA는 TOTP(`UserAuth.php:3459-3484`)·SMS/email OTP(`UserAuth.php:3970,3924`), SSO는 OIDC(`EnterpriseAuth.php:206-244`)·SAML(`EnterpriseAuth.php:247-298,568-619`)에 그친다. 이들은 phishing-resistant/hardware-bound 수단이 아니다 → 현재 달성 가능한 AAL 상한이 낮다.
- **piggyback 가능한 challenge/nonce 패턴은 부분 실재** — OIDC nonce/state(`EnterpriseAuth.php:194,534`)·SAML replay 방어(`:271-283`)·phone nonce(`UserAuth.php:2641-2656`)·DSAR nonce(`index.php:147`)의 1회 소비·재사용 차단 패턴은 WebAuthn challenge 관리의 참고 substrate가 되나, WebAuthn 자체 구현은 아니다.

## 3. 판정

- **Verdict: ABSENT(완전 부재·순신규)** — WebAuthn/FIDO2/Passkey 구현 전무. credential id digest·attestation·user verification·sign count 어느 축도 없다.
- **선행 의존**: §3.2 Authentication Foundation의 WebAuthn Provider 부재 + §3.3 Decision Binding ABSENT.
- **cover: 0** — WebAuthn/FIDO2/Passkey 관련 커버 없음. challenge 관리 패턴만 인접 substrate(`EnterpriseAuth.php:194,534`·`UserAuth.php:2641-2656`·`index.php:147`).

## 4. 확장·구현 방향 (설계)

- **순신규 WebAuthn/FIDO2/Passkey Foundation** — `credential id digest`·`relying party`·`user handle ref`·`authenticator type`·`attestation ref`·`sign count ref`·`challenge`·`user verification`·`phishing-resistant`·`device-bound`·`backup eligibility/state`·`assertion verified_at`·`AAL`를 Reference 모델로 신설. Method Registry(§19)에 `WEBAUTHN_REF`/`FIDO2_REF`/`PASSKEY_REF` 등록, minimum AAL=PHISHING_RESISTANT.
- ★ **Private Credential Material 비저장 Mandatory Control** — private key·raw credential 절대 저장 금지(§5.7·§62 Lint). digest·검증 결과·sign count 참조만.
- **challenge 관리는 기존 nonce 패턴 재사용(Golden Rule=Extend)** — OIDC/phone/DSAR의 1회 소비·재사용 차단(`EnterpriseAuth.php:194,534`·`UserAuth.php:2641-2656`·`index.php:147`)을 WebAuthn challenge에 확장. sign count 역행 탐지로 replay/clone 방어.
- **AAL 최상위 근거로 Step-up(§31)·MFA Binding(§32)에 연결** — 고위험 승인의 required assurance를 WebAuthn으로 충족.
- **선행 필수**: WebAuthn Provider + Decision Binding 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_MFA_BINDING_FOUNDATION]] · [[DSAR_APPROVAL_CERTIFICATE_IDENTITY_FOUNDATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
