# DSAR — Authentication Method Version (06-A-03-02-03-03 · §19/§11)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용 규율: file:line은 [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§19/§11 METHOD_VERSION (원문 전사):

- Authentication Method Registry(§19)의 각 method는 **version**으로 관리되며, `method + version`이 §20 Session·§21 Context·§43 Snapshot에 함께 봉인된다.
- Version 필드(§11 준용): `version type`(INITIAL / AUTHENTICATION_ASSURANCE_CHANGE / SECURITY_HARDENING / CORRECTION / MIGRATION 등) · `deprecated` · `sunset_at` · immutable digest · `created/reviewed/approved by`.
- 의미: 인증수단의 알고리즘·파라미터·강도가 시간에 따라 바뀌어도(예: OTP 자릿수 변경·해시 알고리즘 상향·TOTP window 조정), 과거 Decision이 "당시 method version"으로 재현되도록 버전을 불변 봉인한다. §5.6(Immutable Snapshot)·§57/§58 Reconciliation의 기준이다.

## 2. 기존 구현 대조

- **인증수단 버전 관리는 전면 부재** — method에 version 개념이 없다. `method + version`을 세션·컨텍스트·스냅샷에 봉인하는 구조가 전무하다.
- **각 method는 단일 현행 구현만 존재(버전 미기록)**:
  - TOTP: RFC6238 ±1 window 상수(`UserAuth.php:3459-3484`) — window·step이 코드 상수일 뿐 버전값이 아님.
  - SMS/email OTP: 6자리 5분(`UserAuth.php:3970-3976`·`3924-3934`) — 자릿수·TTL이 하드코딩, 변경 시 과거 재현 불가.
  - 세션 토큰: `bin2hex(random_bytes(32))` 64-hex(`UserAuth.php:964-970`) — 생성 방식 버전 미기록.
  - API 키: `genie_key_`+random_bytes(16)·sha256(`UserAuth.php:4240-4246`) — 포맷 버전 없음.
- **deprecated/sunset 부재** — 인증수단 폐기 수명주기를 데이터로 선언하지 않는다. 카카오 OTP는 stub(`UserAuth.php:3978-3979`)이나 이를 "deprecated" 상태로 표기하는 게 아니라 런타임 예외(`provider_not_implemented`)로만 존재.
- **version type·immutable digest·approver 부재** — SECURITY_HARDENING/CORRECTION 같은 변경 사유를 승인·불변 기록하는 경로가 없다. SecurityAudit 불변체인(`SecurityAudit.php:14-33`)은 감사트레일이지 method 버전 원장이 아님.
- **API 인증 자체는 v421 등 대버전 접두**(라우팅 버전)로 관리되나, 이는 REST 경로 버전이지 인증 method 버전이 아니다.

## 3. 판정

- Verdict: **ABSENT** (인증수단 version·deprecated·sunset·version type·immutable digest 전무).
- cover: **0** (각 method의 현행 파라미터가 코드 상수로만 존재 · 버전 봉인·수명주기 선언 구조 부재).
- 선행 의존: Method Version은 §19 Method Registry(별도 DSAR, PARTIAL)의 하위 버전 축 — Registry 신설에 종속. 봉인 대상인 §20 Session·§43 Snapshot도 미완이므로 완전 구현은 BLOCKED_PREREQUISITE.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_auth_method_version` — Method Registry 행마다 version 이력을 부여하고 `method + version`을 §20 Session·§21 Context·§43 Snapshot에 봉인. Golden Rule=Extend: 실재 method(`UserAuth.php:3459-3484,3970-3976,3924-3934`)의 현행 파라미터(OTP 자릿수·TTL·TOTP window·해시 알고리즘)를 `INITIAL` 버전으로 스냅샷.
- version type: OTP 자릿수/TTL 변경=SECURITY_HARDENING, 해시 상향=AUTHENTICATION_ASSURANCE_CHANGE, 오류정정=CORRECTION. 각 전이는 immutable digest + approver 기록(§11).
- deprecated/sunset: 카카오 stub(`UserAuth.php:3978-3979`)은 미구현이므로 미등록 유지. 향후 약한 수단(예: SMS_OTP) 폐기 시 sunset_at로 예고 후 Method Registry에서 차단.
- Digest 정책: `method + version` 봉인은 앞 단계 Canonical Crypto/Hash Policy(SecurityAudit `SecurityAudit.php:27` SHA-256 패턴) 재사용 — 별도 해시 엔진 신설 금지.
- 무후퇴: 버전 도입 전 발급된 세션·키는 `legacy` version으로 백필(§72 Migration) — 임의 재해석 금지, 과거 Decision은 당시 version으로 재현.

관련: [[DSAR_APPROVAL_AUTHENTICATION_METHOD_REGISTRY]] · [[DSAR_APPROVAL_AUTHENTICATION_SESSION]] · [[DSAR_APPROVAL_AUTHENTICATION_ASSURANCE_LEVEL]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
