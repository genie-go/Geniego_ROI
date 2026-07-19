# DSAR — Approval Authentication Device Binding (06-A-03-02-03-03 · §26)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원 = [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]](GROUND_TRUTH allowlist).

## 1. 원문 전사 (Canonical Contract)

**§26 Device Binding** — 승인 세션을 디바이스에 결합하는 필드:
`session` · `principal` · `device` · `registry version` · `device AAL` · `trusted 여부` · `attestation ref` · `fingerprint digest` · `platform` · `application` · `first/last seen` · `verified/expires`.

★ **Fingerprint 원문 저장 금지**(§5.7·§62) — Digest·Verification Result 만. Device AAL(DAL0~DAL4: IDENTIFIED/TRUSTED/ATTESTED_REF/MANAGED_HARDWARE_REF)은 Action Risk 와 연결.

## 2. 기존 구현 대조

- **★완전 부재.** GROUND_TRUTH "Device/Fingerprint/Trusted" 행: **grep 무**(마케팅 cross-device·Snowflake JWT 만 존재하고 인증/승인용 디바이스 신원은 없음). "Device Identity Registry"·"Trusted Device"·"fingerprint digest"·"attestation" 어느 것도 인증 스택에 없다.
- 세션 발급/검증(`UserAuth.php:964-970`·`:229-318`)은 **디바이스 정보를 수집·결합하지 않는다** — 순수 opaque 토큰만으로 세션을 식별. 동일 토큰이 임의 디바이스에서 재사용돼도 이를 구분할 device fingerprint/trusted 여부가 없다.
- MFA 스택(TOTP `UserAuth.php:3459-3484`·SMS `:3970-3976`·email `:3924-3934`)도 디바이스 바인딩이 없다 — WebAuthn/FIDO2/Passkey(device-bound authenticator)는 GROUND_TRUTH 상 부재.
- mTLS/Client Cert 역시 **grep 무**(GROUND_TRUTH "mTLS/Client Cert: ABSENT") → 하드웨어/인증서 기반 device attestation 경로 없음.
- 승인 레코드(`mapping_change_request` `Db.php:623-634`·`action_request`)에 device 축 컬럼 없음.

## 3. 판정

- **Verdict: ABSENT(완전 부재)**.
  - Device Identity Registry·Trusted Device·fingerprint digest·attestation·device AAL·session↔device 결합 = 전부 부재(GROUND_TRUTH grep 무).
- **선행 의존**: 디바이스 신뢰를 고위험 승인에 요구하려면 Device Registry(§35)·WebAuthn/FIDO2/Passkey(§33)·Cert(§34) 신설이 선행 — 모두 순신규.
- **cover: 0**.

## 4. 확장/구현 방향 (설계)

- **Device Identity Registry(§35) 순신규**: `device id`·tenant·type(DESKTOP/LAPTOP/MOBILE/…/HARDWARE_TOKEN_REF)·platform·OS ref·owner subject·managed/trusted·enrolled/verified·trust expires·compromise status·**fingerprint digest**(원문 금지)·attestation ref. 재사용 substrate 없음 → 완전 신규 설계.
- **Session↔Device 결합**: 세션 발급 시 device fingerprint digest·platform·application 을 수집해 세션에 결속하고, 재사용 시 device 변경을 §53 Session Hijack Detection 신호로 수집.
- **Device AAL ↔ Action Risk**: 고액/결제/정산/계약/관리자취소 등 고위험 승인에 최소 DAL(TRUSTED/ATTESTED)을 요구(§10·§31 Step-up New Device 조건). 미신뢰 디바이스는 step-up 유발.
- **Attestation/WebAuthn 은 Reference 만 저장**(§33·§34): Private Credential Material·Private Key·Biometric 저장 금지 — credential id digest·attestation ref·verification result 만.
- **Fingerprint 는 반드시 Digest**: 원문 fingerprint 저장 금지(§5.7). Digest 화 후 Snapshot(§43)에 동결.
- 실 구현 = 별도 승인 세션(외부 device risk provider 는 후속 §14 유지 범위). 코드변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_CLIENT_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_CHANNEL_BINDING]] · [[DSAR_APPROVAL_AUTHENTICATION_COMMIT_BINDING]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
