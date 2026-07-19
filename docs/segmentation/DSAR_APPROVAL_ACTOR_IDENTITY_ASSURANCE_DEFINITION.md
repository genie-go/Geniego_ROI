# DSAR — Actor Identity Assurance Definition (06-A-03-02-03-03 · §10)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §10.

## 1. 원문 전사 (Canonical Contract)

§10 DEFINITION 필수 필드 (원문 전사):
- `applicable decision definitions` · `applicable action types` · `applicable actor types`
- `minimum identity assurance` · `minimum authentication assurance`
- `required auth methods` · `prohibited auth methods`
- `step-up conditions`
- `session age limit` · `device trust` requirement · `network condition`
- `impersonation prohibition` · `service account prohibition`

의미: Definition은 Policy(§9)의 추상 규칙을 **"어떤 Decision Definition·Action Type·Actor Type에 대해 최소 어떤 Identity/Authentication Assurance를 요구하고, 어떤 auth method를 강제/금지하며, 어떤 조건에서 step-up을 트리거하는가"로 구체 바인딩**하는 실행 정의다. §5.10(Assurance Level ↔ Action Risk)의 데이터 표현이다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **assurance definition(결정정의별 최소 assurance 바인딩)은 부재** — `applicable decision definitions`/`action types`·`minimum identity/authentication assurance`·`step-up conditions`를 데이터로 정의하는 구조체 전무.
- 실존하는 **재료**(정의객체 아님):
  - **MFA 정책** — `UserAuth.php:3638-3660`(off/admin/all·전역+테넌트 max). 그러나 이는 **로그인 게이트**용 전역 정책이지, Decision Definition·Action Type별 minimum authentication assurance 바인딩이 아님.
  - **auth method 재료**(required/prohibited의 대상) — TOTP `UserAuth.php:3459-3484`·SMS OTP `:3970-3976`·이메일 OTP `:3924-3934`·복구코드 `:3491-3527`. method는 실재하나 정의에서 "이 결정엔 phishing-resistant만 허용" 같은 바인딩 없음.
  - **승인 정족수** — `Mapping.php:287`(`count >= required_approvals`)은 Maker-Checker 게이트이나 **assurance 축이 아님**(누가 몇 명 승인했나이지, 어떤 AAL로 승인했나 아님).
  - **RBAC/scope** — `index.php:553-587`은 role/scope 게이트이나 authentication assurance 요구가 아님(인증성공≠승인권한, §5.3).
- `minimum identity/authentication assurance`·`step-up conditions`·`session age limit`·`device trust requirement`·`network condition`·`impersonation/service account prohibition` (정의별) → **no hits**.

## 3. 판정 (Verdict)

- Verdict: **ABSENT(정의 객체 자체) · PARTIAL-substrate(MFA·auth method·정족수 재료 실재하나 결정정의별 바인딩 아님)**
- 선행 의존: Definition의 `applicable decision definitions`·`applicable action types`는 **§3.3 Decision Foundation(Decision Command Envelope·Decision Slot) 부재**로 바인딩 대상 없음 → **BLOCKED_PREREQUISITE**. `minimum authentication assurance`는 §12 Assurance Level Model(역시 ABSENT) 선행 필요. `step-up conditions`는 §31 Step-up Foundation(ABSENT) 선행.
- cover: **0**(결정정의별 assurance 바인딩 전무). MFA 정책·auth method는 재사용 substrate.

## 4. 확장/구현 방향 (설계)

- 순신규 `actor_identity_assurance_definition` — Decision Definition·Action Type·Actor Type별 minimum IPL/AAL(§12)·required/prohibited method·step-up 조건을 데이터로 바인딩.
- **Golden Rule=Extend**: `UserAuth.php:3638-3660` MFA 정책을 **로그인 게이트에서 decision-scoped assurance requirement로 확장 재사용** — 신규 MFA 엔진 신설 금지. required/prohibited method는 이미 실재하는 method 레지스트리(§19가 열거할 TOTP/SMS/OIDC/SAML)를 참조.
- **Mandatory Control(§5.10)**: 高액/결제/정산/계약/법률/보안/관리자취소/Correction/Supersession Action에 높은 AAL 요구·step-up 트리거를 정의에서 강제. `impersonation prohibition`/`service account prohibition`을 高위험 결정정의에 기본 ON.
- **실위험**: 정의 부재로 현재 **API 키 2개로 Maker-Checker 정족수 충족 가능**(actor_type·assurance 미구분, `Mapping.php:285-287` 동등 계수) — Definition이 `applicable actor types`+`minimum authentication assurance`로 이를 차단하는 데이터 근거를 제공. 단 실집행은 선행 Decision Core·§12 Level Model 신설 후.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_POLICY]] · [[DSAR_APPROVAL_IDENTITY_ASSURANCE_LEVEL]] · [[DSAR_APPROVAL_ACTOR_TYPE_REGISTRY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
