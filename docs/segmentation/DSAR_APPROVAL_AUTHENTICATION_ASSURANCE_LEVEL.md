# DSAR — Authentication / Identity Assurance Level Model (06-A-03-02-03-03 · §12)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§12 Assurance Level Model (원문 전사):

- **Identity Proofing Level** — `IPL0` / `IPL1` / `IPL2` / `IPL3` / `IPL4`.
- **Authentication Assurance Level(AAL)** — `AAL0=NONE` / `AAL1=SINGLE_FACTOR` / `AAL2=MULTI_FACTOR` / `AAL3=PHISHING_RESISTANT` / `AAL4=HARDWARE_BOUND_REF`.
- **Credential Assurance Level** — `CAL0` / `CAL1` / `CAL2` / `CAL3` / `CAL4`.
- **Session Assurance Level(SAL)** — `SAL0=STANDARD` / `SAL1=REAUTHENTICATED` / `SAL2=STEP_UP` / `SAL3` / `SAL4=HIGH_ASSURANCE_REF`.
- **Device Assurance Level(DAL)** — `DAL0=IDENTIFIED` / `DAL1=TRUSTED` / `DAL2` / `DAL3=ATTESTED_REF` / `DAL4=MANAGED_HARDWARE_REF`.
- **내부 Level ≠ External(IdP/Provider) Level** — Versioned Mapping으로 상호 환산.

의미: Assurance Level Model은 "얼마나 확신하는가"를 5개 축(IPL/AAL/CAL/SAL/DAL)으로 **데이터로 산출·저장**하는 척도 체계다. §5.10(Assurance ↔ Action Risk 연결)의 근거값이며, §30 Commit Binding·§55 Revalidation이 "AAL 충분/Auth Age 이내/Step-up 충족"을 판정할 때 소비하는 정량 기준이다. 단순히 "MFA 켜짐/꺼짐" boolean이 아니라, 각 Decision에 대해 요구 Level과 달성 Level을 비교 가능한 등급으로 고정한다.

## 2. 기존 구현 대조

- **Assurance Level을 등급값으로 산출·저장하는 모델은 부재** — IPL/AAL/CAL/SAL/DAL 어느 축도 데이터로 선언·계산되지 않는다. 인증은 "성공/실패" 이진값이며, 승인 Decision에 인증 강도 등급이 첨부되지 않는다.
- **AAL2 달성 substrate는 대량 실재(등급 미산출)**:
  - 1-factor(AAL1 상당): bcrypt 비밀번호 `password_verify`(`UserAuth.php:730`).
  - 2-factor(AAL2 상당): TOTP RFC6238(`UserAuth.php:3459-3484`)·SMS OTP(`UserAuth.php:3970-3976`)·이메일 OTP(`UserAuth.php:3924-3934`)·복구코드(`UserAuth.php:3491-3527`)·MFA 정책 off/admin/all(`UserAuth.php:3638-3660`). → 기술적으로 AAL2를 **달성할 수 있으나 그 사실을 Level 값으로 표기하지 않는다.**
  - PHISHING_RESISTANT(AAL3) substrate 부재 — WebAuthn/FIDO2/Passkey·mTLS/Client Cert grep 무(GROUND_TRUTH §2 Device/mTLS ABSENT). → 현재 최대 실 달성치는 AAL2에서 상한.
- **SAL(세션 등급) 부재** — 서버측 세션(`UserAuth.php:964-970`)·유휴폐기(`UserAuth.php:282-286`)는 실재하나, STANDARD/REAUTHENTICATED/STEP_UP 구분이 없다. 재인증(REAUTHENTICATED)·Step-up(STEP_UP) 개념 자체가 부재 → SAL은 단일 STANDARD에 고정된 것과 동치.
- **DAL(디바이스 등급) 부재** — Device/Fingerprint/Trusted Device substrate 자체가 ABSENT.
- **IPL(신원증명 등급) 부재** — Person↔Account 분리·신원증명 절차 없음(app_user 단일 테이블).
- **결정적 갭: MFA는 로그인 게이트에서만 소비되고 승인 Decision에 미결합** — TOTP/SMS/email 모두 "미결합(로그인만)"으로 GROUND_TRUTH §2 명기. 즉 AAL2를 달성해도 그 등급이 승인 커맨드로 전달·비교되지 않는다.

## 3. 판정

- Verdict: **ABSENT (Level 모델 데이터 선언)** · **substrate PARTIAL (MFA로 AAL2 달성가능·등급 미산출)**.
- cover: **0** (IPL/AAL/CAL/SAL/DAL를 등급값으로 계산·저장하는 구조 전무. MFA 스택은 AAL2 달성 substrate로 KEEP_SEPARATE — 등급 산출기가 아님).
- 선행 의존: Assurance Level은 §16 Resolution Context·§21 Authentication Context가 산출한 인증 상태를 입력으로 등급화한다. 그 상위 컨테이너인 §7 Registry/§9 Policy/§10 Definition이 "이 Decision에 요구 AAL"을 선언해야 비교가 성립 → 선행 부재로 BLOCKED_PREREQUISITE. 단 AAL1/AAL2 달성 인증수단은 실재하므로 실 엔진은 "발명 아닌 등급화".

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_assurance_level` 산출 계층 — 5축(IPL/AAL/CAL/SAL/DAL) 각각을 정수 등급 + enum 라벨로 계산해 §21 Authentication Context·§42/§43 Snapshot에 봉인. Golden Rule=Extend: 기존 MFA 스택(`UserAuth.php:3459-3484,3924-3934,3970-3976,3638-3660`)의 성공 결과를 **AAL 등급 산출 입력**으로 재사용하되, 인증수단 자체는 재구현 금지.
- AAL 매핑(현 substrate 기준): 비밀번호 단독=AAL1, 비밀번호+TOTP/SMS/email OTP=AAL2, WebAuthn/FIDO2/Passkey/mTLS(순신규)=AAL3, 하드웨어 바운드=AAL4. 현재 상한 AAL2를 정직하게 표기(과대선언 금지).
- §5.10 연결: `approval_action_type`별 요구 AAL을 §10 Definition에 선언(고액/결제/정산/계약/법률/보안/관리자취소에 AAL2+ 요구). §31 Step-up Foundation이 요구 AAL 미달 시 재인증 Challenge를 트리거하도록 SAL(STEP_UP) 축과 연결.
- 내부↔외부 Level Versioned Mapping: SSO OIDC/SAML(`EnterpriseAuth.php:206-244,247-298`)이 제공하는 `acr`/provider assurance claim을 내부 AAL로 환산하는 버전드 매핑 테이블 신설.
- 무후퇴 주의: 현재 승인(`Mapping.php:246-250,287` 정족수 2)은 AAL 게이트 없이 동작 — Level 도입 시 기존 승인 경로에 요구 AAL 미선언=AAL0 통과(회귀 방지)로 시작하고, Definition에서 점진 강제.

관련: [[DSAR_APPROVAL_ACTOR_AUTHENTICATION_CONTEXT]] · [[DSAR_APPROVAL_ACTOR_AUTHENTICATION_BINDING]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
