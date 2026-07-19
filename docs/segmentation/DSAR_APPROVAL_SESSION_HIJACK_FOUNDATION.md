# DSAR — Session Hijack Detection Foundation (06-A-03-02-03-03 · §53)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §53.

## 1. 원문 전사 (Canonical Contract)

**§53 Session Hijack Detection Foundation** — 세션 탈취 의심 신호를 **수집하고 정책 Hook으로 연결**하는 축(Signal 수집+정책 Hook, 고급 Fraud Scoring은 후속). 신호(원문 전사):
- Device Change · Client Change · Token Family Anomaly · Session Generation Mismatch
- Concurrent Distant Session · Sudden Assurance Downgrade · Reauthentication Bypass
- Impersonation State Mismatch · High-risk Action after Session Change · Custom

★핵심 계약: 본 Foundation은 **판정(Fraud Scoring)이 아니라 신호 수집+정책 Hook**이다. Device/Client 변화·Token Family 이상·동시 원거리 세션·급격한 assurance 하락·재인증 우회·고위험 Action 직전 세션 변화를 **신호로 축적**하고, §54 Privilege Escalation·§55 Commit Revalidation·Step-up 정책이 소비할 Hook을 제공한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Session Hijack Detection = 부재(★전면 ABSENT)** — 신호 수집 자체가 전무. 세션 탈취 의심을 나타낼 Device/Client/Token Family/Generation/Concurrent/Assurance 신호를 축적·조회하는 구조 no hits.
- **신호 원천 축의 부재**:
  - **Device/Fingerprint/Trusted = ABSENT**(grep 무·마케팅 cross-device·Snowflake JWT만, GT 표 `:59`) → `Device Change` 신호 원천 없음.
  - **Client 식별 = ABSENT** — mTLS/Client Cert 부재(GT 표 `:60`)·registered client binding 없음 → `Client Change` 신호 없음.
  - **Token Family/Generation = 부재** — opaque 세션토큰(`UserAuth.php:964-970`)·JTI/refresh/token family 없음(GT 표 `:62`) → `Token Family Anomaly`·`Session Generation Mismatch` 축 미존재.
  - **Assurance 모델 = ABSENT** → `Sudden Assurance Downgrade` 대상 없음. MFA(TOTP/SMS/email `UserAuth.php:3459-3484,3970-3976,3924-3934`)는 실재하나 로그인만·assurance 등급/추적 없음.
- **부분 재료(신호로 통합 안 됨)**:
  - 세션 검증이 매 요청 DB 조회(`UserAuth.php:229-318`)·유휴 자동로그아웃(`:282-286`)·revocation(`:1765,4173`·`EnterpriseAuth.php:400,413`)은 실재하나, 이는 **정상 세션 수명 관리**이지 탈취 신호 수집이 아니다.
  - **Impersonation State Mismatch** 신호 원천 — member impersonation(`UserAdmin.php:472-534` `:493-497,499,525`)은 `imp_` 2h 세션 발급·발급시 audit이나 **Original Principal 미보존** → Impersonation 상태 불일치를 신호로 잡을 이중축 부재.
  - **Reauthentication Bypass** — break-glass 마스터 로그인 MFA 우회(env `GENIE_BREAKGLASS_PW`·`UserAuth.php:777-798`·`:925 !isMasterAuth`)는 재인증 우회 경로가 실존하나 신호로 수집·Hook 연결 안 됨.

## 3. 판정 (Verdict)

- Verdict: **ABSENT.** §53의 9개 신호 전부 수집 축 부재. Device/Client/Token Family/Generation/Assurance 원천이 없어 신호 자체가 발생하지 않는다. 태스크 규율 명시대로 **Session Hijack/Privilege Escalation Signal = 부재**.
- 선행 의존: §53은 §26 Device Binding·§27 Client Binding·§23 Token Binding(family/generation)·§12 Assurance Level·§43 Authentication Snapshot에 종속 — 전부 미형성. 순신규.
- cover: **0.** 세션 수명 관리(검증/유휴/revocation)는 실재하나 탈취 신호 수집이 아님. Device/Client/Token Family 원천 전무로 substrate조차 얇음(순신규 설계 비중 최대).

## 4. 확장/구현 방향 (설계)

- Session Hijack Detection은 **신호 수집 Foundation** — 판정 엔진이 아니라, §26 Device Binding·§27 Client Binding·§23 Token Family/Generation(선행 신설)을 전제로 Device/Client 변화·Token Family 이상·Generation 불일치를 **불변 신호로 축적**하고 §54/§55/Step-up이 소비할 Hook만 제공. 고급 Fraud Scoring은 §14 후속.
- **Golden Rule=Extend**: 새 세션 저장소 발명 금지 — 실재 세션 검증(`UserAuth.php:229-318`)·유휴(`:282-286`)·revocation(`:1765,4173`)에 Device/Client/Generation 컬럼을 확장해 신호 원천을 만든다. Impersonation 신호는 §41 On-behalf-of Chain으로 Original Principal 보존(`UserAdmin.php:472-534` 교정)한 뒤 `Impersonation State Mismatch`를 수집.
- **Reauthentication Bypass 신호**: break-glass 경로(`UserAuth.php:777-798`·`:925`)를 신호로 명시 수집·감사 결선(예외경로가 조용히 통과하지 않도록). §5.11·§39 Impersonation 승인 기본금지와 정합.
- **정책 Hook·가짜녹색 금지**: 신호 축적만으로 통과 금지 — 고위험 Action 직전 세션 변화·급격한 assurance 하락 시 §31 Step-up·§55 Commit Revalidation·§65 Warning으로 연결. 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_SESSION_REPLAY_DETECTION]] · [[DSAR_APPROVAL_AUTHENTICATION_DRIFT]] · [[DSAR_APPROVAL_AUTHENTICATION_CONFLICT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
