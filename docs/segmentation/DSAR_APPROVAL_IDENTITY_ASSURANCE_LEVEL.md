# DSAR — Identity / Authentication Assurance Level (06-A-03-02-03-03 · §12)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §12.

## 1. 원문 전사 (Canonical Contract)

§12 Assurance Level Model (원문 전사·5축):
- **Identity Proofing** `IPL0` ~ `IPL4`
- **Authentication** `AAL0` ~ `AAL4` — `NONE` / `SINGLE_FACTOR` / `MULTI_FACTOR` / `PHISHING_RESISTANT` / `HARDWARE_BOUND_REF`
- **Credential** `CAL0` ~ `CAL4`
- **Session** `SAL0` ~ `SAL4` — `STANDARD` / `REAUTHENTICATED` / `STEP_UP` / `HIGH_ASSURANCE_REF`
- **Device** `DAL0` ~ `DAL4` — `IDENTIFIED` / `TRUSTED` / `ATTESTED_REF` / `MANAGED_HARDWARE_REF`

**원문 제약**: `내부 Level ≠ External Level(Versioned Mapping).`

의미: Assurance Level Model은 신원증명(IPL)·인증(AAL)·자격(CAL)·세션(SAL)·디바이스(DAL) 5축을 각각 0~4 등급으로 표준화하고, 내부 등급과 외부(IdP/NIST 등) 등급을 **버전화된 매핑**으로 연결한다. §5.10(Assurance ↔ Action Risk)·§10 Definition의 minimum assurance가 참조하는 척도다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **assurance level 모델(IPL/AAL/CAL/SAL/DAL 등급·매핑)은 부재** — 5축 등급을 데이터로 산출·저장·매핑하는 구조체 전무.
- 실존하는 **등급 산출의 원시 재료 substrate**(등급 아님):
  - **AAL 재료(factor 수)** — 로그인 bcrypt `UserAuth.php:730`(단일요소=SINGLE_FACTOR 재료)·TOTP `:3459-3484`·SMS OTP `:3970-3976`·이메일 OTP `:3924-3934`(2요소=MULTI_FACTOR 재료)·복구코드 `:3491-3527`. **factor는 실재하나 AAL 등급으로 계산·기록되지 않음.**
  - **SAL 재료(세션 상태)** — 세션 발급 `UserAuth.php:964-970`·검증 `:229-318`·유휴 자동로그아웃 `:282-286`·revocation(logout `:1765`·revoke-others `:4173`). STANDARD 세션은 실재하나 REAUTHENTICATED/STEP_UP 등급 구분 없음.
  - **CAL 재료(자격 강도)** — api_key sha256 `Db.php:942-955`·MFA 정책 `UserAuth.php:3638-3660`. 자격은 실재하나 CAL 등급 아님.
  - **PHISHING_RESISTANT 재료** — SSO OIDC(RS256/JWKS+state+nonce) `EnterpriseAuth.php:206-244`·SAML(서명검증+replay 방어) `:247-298`. phishing-resistant 후보이나 AAL3 등급으로 표기 안 됨.
  - **DAL 재료 = ABSENT** — Device/Fingerprint/Trusted Device grep 무(마케팅 cross-device·mTLS/Client Cert 부재). IDENTIFIED조차 없음.
- `IPL`(신원증명 등급 자체가 개념 부재)·`AAL/CAL/SAL/DAL 등급 산출·저장`·`내부↔External Versioned Mapping` → **no hits**.

## 3. 판정 (Verdict)

- Verdict: **PARTIAL (PRESENT-substrate)** — AAL(factor 수)·SAL(세션 상태)·CAL(자격)·일부 PHISHING_RESISTANT(SSO) **재료는 실재**하나, 5축을 0~4 등급으로 산출·저장·매핑하는 모델은 **ABSENT**. IPL·DAL은 재료조차 부재.
- 선행 의존: Level Model은 §10 Definition(minimum assurance)·§16~§18 Actor Resolution(AAL 계산)·§55 Commit-time Revalidation의 척도. Device 축(DAL)은 §35 Device Identity Registry(ABSENT) 선행. Decision 결합은 §3.3 부재로 **BLOCKED_PREREQUISITE**.
- cover: **부분** — AAL(SINGLE/MULTI_FACTOR 재료)·SAL(STANDARD)·CAL·PHISHING_RESISTANT(SSO)가 재료로 실재(위 §2), 등급 산출·IPL·DAL·Versioned Mapping은 전무.

## 4. 확장/구현 방향 (설계)

- 순신규 `identity_assurance_level` 모델 — IPL/AAL/CAL/SAL/DAL 5축 0~4 등급 산출기 + 내부↔External Versioned Mapping.
- **Golden Rule=Extend**: 등급 산출을 **기존 인증 결과에서 파생** — factor 수(`UserAuth.php:730`+MFA `:3459-3484`)→AAL·SSO(`EnterpriseAuth.php:206-298`)→PHISHING_RESISTANT(AAL3)·세션 상태(`:229-318,282-286`)→SAL·api_key(`Db.php:942-955`)→CAL. 신규 인증수단 발명 금지·기존 결과의 **등급 라벨링**만.
- **Mandatory Control(원문·§5.10)**: `내부 Level ≠ External Level`을 Versioned Mapping으로 강제(IdP가 주장한 AAL을 그대로 신뢰 금지·내부 척도로 정규화). 高위험 Action에 minimum AAL/SAL 요구(§10 Definition 결합).
- **실위험**: 등급 부재로 현재 **모든 인증이 동등**(bcrypt 단일요소 로그인과 MFA가 승인에서 구별 안 됨) → §61 "Assurance 없는 Auth Context". Level Model이 factor/phishing-resistance/session-state를 등급화하여 §55 Commit-time Revalidation의 "AAL 충분성" 판정 근거를 제공. **DAL은 §35 Device Registry 신설 전까지 IDENTIFIED조차 산출 불가**(재료 부재 명시).

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_ASSURANCE_DEFINITION]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_PROFILE]] · [[DSAR_APPROVAL_PRINCIPAL_REGISTRY]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]] · [[project_n237_session_auth_gaps]].
