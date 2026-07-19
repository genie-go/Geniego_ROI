# DSAR — MFA Binding Foundation (06-A-03-02-03-03 · §32)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§32 MFA Binding Foundation**(결과 binding만) — MFA 챌린지의 **결과**를 특정 승인 결정에 결합하는 계약. 필수 필드:
`principal` · `session` · `method ref`(수단 참조) · `challenge ref`(챌린지 참조) · `issued_at` / `completed_at` · `assurance achieved`(달성 AAL) · `decision slot / action / resource binding`(결정 슬롯·액션·리소스 결합) · `replay protection ref` · `provider result ref`.

★ **OTP 원문 저장 금지.** MFA는 "누가 무엇을 언제 어떤 assurance로 통과했는가"의 **검증 결과와 참조만** 보존하며, OTP·시크릿·챌린지 원문은 저장하지 않는다(§5.7). MFA 통과는 특정 `decision slot/action/resource`에 고정되어야 하며, 재사용·타 결정 전용 금지.

## 2. 기존 구현 대조

- **MFA 수단 3종 실동작** — TOTP `hash_hmac('sha1')` RFC6238 ±1(`UserAuth.php:3459-3484`)·SMS OTP 6자리 5분(`UserAuth.php:3970`, bcrypt 저장)·이메일 OTP 6자리 5분(`UserAuth.php:3924`, bcrypt)·복구코드 sha256 1회 소비(`UserAuth.php:3491`)·정책 off/admin/all(`UserAuth.php:3638-3660`). OTP 자체는 bcrypt/sha256으로 저장돼 원문이 아니다.
- ★ **decision 미결합** — 이 MFA 결과 어디에도 `decision slot/action/resource binding`이 없다(GROUND_TRUTH §2: TOTP/SMS/email 모두 "미결합(로그인만)"). MFA 통과 사실이 승인 결정에 연결되지 않아, 승인자가 MFA를 통과했는지 여부가 결정 레코드에 남지 않는다.
- ★ **`mfa_secret`(TOTP) 평문 base32 저장**(`UserAuth.php:3421,3771`) — Crypto 미적용. §5.7 raw credential 비저장 원칙 위반이며 DB 유출 시 전 사용자 TOTP 재현 가능(BLOCKED_SECURITY). §32는 "OTP 원문 금지"이나 TOTP 시크릿 평문 저장은 그 상위 위험이다.
- **replay protection / provider result ref 부재** — 승인 경로에서 MFA 결과의 재사용 차단(§52)·nonce 소비 결합이 없다. `Alerting::executeAction`(`Alerting.php:601-665`)은 MFA 검증 자체를 요구하지 않는다.

## 3. 판정

- **Verdict: PARTIAL(수단 PRESENT·decision 미결합)** — MFA 챌린지/검증 primitive는 실재하나(`UserAuth.php:3459-3484,3970,3924,3491`), 그 결과를 `decision slot/action/resource`에 결합하는 Binding은 **전무**.
- **선행 의존**: §3.3 Decision Foundation·Decision Slot(§29) ABSENT — 결합 대상 결정 레코드 부재로 BLOCKED_PREREQUISITE.
- **cover: 부분** — MFA 검증 결과·assurance 달성 판정은 `UserAuth.php:3459-3484` 등으로 커버. decision binding·replay protection ref·provider result ref는 0. **`mfa_secret` 평문(`:3421,3771`)은 BLOCKED_SECURITY 봉합 필요.**

## 4. 확장·구현 방향 (설계)

- **MFA 결과를 Decision에 결합하는 순신규 Binding 레코드** — 기존 검증 로직(`UserAuth.php:3459-3484,3970,3924`)의 **결과(assurance achieved·completed_at)만** `principal·session·method ref·challenge ref·decision slot/action/resource·replay protection ref·provider result ref`로 봉인. OTP 원문·챌린지 원문 비저장(§5.7).
- ★ **`mfa_secret` 평문 저장(`UserAuth.php:3421,3771`) 암호화는 Mandatory Control** — 기존 Crypto(AES-256-GCM, SSO client_secret에 이미 적용)를 TOTP 시크릿에 확장. 이는 선행과 무관하게 자립 수정 가능한 BLOCKED_SECURITY 봉합 대상.
- **재사용 차단** — MFA Binding은 특정 decision에 1회 결합, 타 결정 전용 금지(§52 replay protection ref 연동). Step-up(§31)과 동일 챌린지 인프라 공유.
- **선행 필수**: §3.3 Decision Slot·Command Envelope 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_STEP_UP_AUTHENTICATION_FOUNDATION]] · [[DSAR_APPROVAL_WEBAUTHN_FIDO_PASSKEY_FOUNDATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
