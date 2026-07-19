# DSAR — Authentication Context Digest (06-A-03-02-03-03 · §45)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §45.

## 1. 원문 전사 (Canonical Contract)

**§45 Authentication Context Digest** — Authentication Snapshot(§43)의 독립 Digest. 필수 Canonical 입력(원문):
- `principal` · `canonical subject` · `original principal` · `effective actor`
- `session` · `method + version`
- `auth time` · `reauth time` · `AAL들`(authentication/credential/session/device)
- `provider` · `client` · `device` · `channel` · `token ref digest` · `nonce ref`
- `impersonation state` · `delegation state`
- `expiry` · `captured time`

원칙 계약(§45·§5.7·§84): Digest는 위 입력만 대상으로 하며 **앞 단계 Canonical Crypto Policy 사용.** Token은 `token ref digest`로만(Raw Credential 금지·§5.7). Impersonation/Delegation 상태를 입력에 포함해 은닉 불가.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Authentication Context Digest = 부재.** 인증 스냅샷(§43)이 ABSENT이므로 그 digest 대상도 없음 → **no hits**. 승인 경로에 인증상태가 봉인되지 않음(GROUND_TRUTH §2: session↔command 결합·commit-time 재검증 ABSENT).
- **digest primitive 실재·입력 재료 산재**: sha256 체인(`SecurityAudit.php:14-33,:27,:56-68`)·세션(`UserAuth.php:229-318`)·`method`(TOTP/SMS/email/OIDC/SAML citation)·`impersonation state`(`imp_` 세션 `UserAdmin.php:472-534`)·`X-Act-As-Tenant`(`UserAuth.php:398`). 그러나 이를 **하나의 Canonical Auth Context로 묶어 digest화하는 계층 부재**.
- **§5.7 경계 위반(디지털 봉인 이전 시정 필요)**: `token ref digest` 원칙과 달리 `user_session.token`은 **평문 저장**(`UserAuth.php:969`)·`mfa_secret` **평문 base32**(`UserAuth.php:3421,3771`). `AAL들`·`device`·`channel` 축은 AAL 모델·Device Registry 부재(GROUND_TRUTH §2)로 대상 없음. `original principal`/`effective actor` 이중값도 미보존(§39 BLOCKED).

## 3. 판정 (Verdict)

- Verdict: **BLOCKED_PREREQUISITE(digest 대상 Snapshot 부재) · PRESENT-substrate(sha256 primitive·인증재료 실재)**
- 근거: 소스 Aggregate(§43 Authentication Snapshot)가 ABSENT → 봉인 대상 없음. AAL/Device/Original-Effective 축은 선행 부재로 입력 불가. digest 알고리즘(`SecurityAudit.php:27`)만 PRESENT하나 Canonical 정규화 계층은 앞 블록에서도 부재.
- cover: **0**. 산재한 인증재료는 재사용 대상이나 Context Digest 대체물로 계상 금지.

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_AUTHENTICATION_CONTEXT_DIGEST` — 입력=§45 열거 필드(§43 Snapshot의 Canonical Projection). `token ref digest`=digest만(§5.7)·`impersonation/delegation state` 필수 포함(은닉 불가)·`original principal`+`effective actor` 이중값(§39·§38 연동).
- **Golden Rule=Extend**: 해시는 `SecurityAudit.php:27` sha256 + verify(`:56-68`) 패턴 재사용. **★preimage는 앞 블록(06-A-03-02-03-02) Canonical Crypto Policy**(Digest Envelope·Hash Algorithm Policy·Canonical JSON/정규화)를 §44 Actor Identity Digest와 **동일 정책으로** 선적용 — 두 digest가 같은 Crypto Policy 버전을 참조해 상호 정합.
- **Mandatory Control(§5.7)**: **선행 BLOCKED_SECURITY 정합** — `user_session.token`(`UserAuth.php:969`)·`mfa_secret`(`UserAuth.php:3421,3771`) 평문은 digest ref 원칙 전에 해시/암호화로 시정(별도 수정세션). AAL/Device는 선행 모델 없이 부분 입력으로 digest 확정 금지.
- **선행 필수(BLOCKED)**: §43 Authentication Snapshot·AAL 모델(§12)·앞 블록 Canonical Crypto Policy가 선행. 이번 차수=설계 명세.

관련: [[DSAR_APPROVAL_AUTHENTICATION_SNAPSHOT]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_DIGEST]] · [[DSAR_APPROVAL_ON_BEHALF_OF_CHAIN]] · [[DSAR_APPROVAL_DIGEST_ENVELOPE]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
