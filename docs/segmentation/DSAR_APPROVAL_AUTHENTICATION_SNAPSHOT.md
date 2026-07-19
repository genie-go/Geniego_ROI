# DSAR — Authentication Snapshot (06-A-03-02-03-03 · §43)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §43.

## 1. 원문 전사 (Canonical Contract)

**§43 AUTHENTICATION_SNAPSHOT** — Decision 시점 인증 상태의 불변 스냅샷. 필수 필드(원문):
- `session` · `method + version`
- `auth time` · `reauth time`
- `authentication AAL` · `credential AAL` · `session AAL` · `device AAL`
- `provider` · `client` · `device` · `token id digest ref` · `nonce result`
- `impersonation state` · `delegation state`
- `session expiry` · `captured_at` · `immutable digest`

원칙 계약(§5.6·§5.7·§43): 인증 Context를 Decision 시점에 **불변 봉인**하며 과거 Decision에 현재 세션 재조회·재해석 금지(§5.6). Raw Credential 저장 금지 — Token은 `token id digest ref`만(§5.7). Impersonation/Delegation 상태를 명시 캡처.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Authentication Snapshot = 부재.** 승인 경로에 인증 상태를 캡처·봉인하는 구조체 없음 → **no hits**. GROUND_TRUTH §2 마지막 행: `commit-time 재검증·session↔command 결합` **ABSENT** — `Alerting.php:572-599,601-665`(`:562`)은 단일 approved 상수만 확인하고 재인증/MFA/approver≠executor/session 확인 없음.
- 캡처 대상 재료는 실재하나 **스냅샷화되지 않음**: 세션(`UserAuth.php:229-318`)·MFA method(TOTP `:3459-3484`·SMS `:3970-3976`·email `:3924-3934`)·SSO provider(`EnterpriseAuth.php:206-244,247-298`). 그러나 승인 시점의 `method+version`·`AAL`·`session expiry`·`nonce result`를 고정하는 계층 부재.
- **AAL 개념 자체 부재**: GROUND_TRUTH에 IPL/AAL/CAL/SAL/DAL assurance level 모델 없음 → `authentication/credential/session/device AAL` 4축 전무.
- **Raw Credential 경계 위반 실재(§5.7)**: `user_session.token` **평문 저장**(`UserAuth.php:969`, `WHERE token=?`)·`mfa_secret` TOTP **평문 base32**(`UserAuth.php:3421,3771`) — Snapshot의 `token id digest ref` 원칙(digest만)과 정면 배치. Device/Fingerprint·mTLS는 **ABSENT**(GROUND_TRUTH §2) → `device`/`device AAL` 대상 없음.

## 3. 판정 (Verdict)

- Verdict: **ABSENT**
- 근거: 승인 시점 인증상태를 불변 캡처하는 Snapshot 전무·AAL 모델 부재·session↔command 결합 부재(§30·§55 미충족). 나아가 캡처해야 할 token/mfa_secret가 **평문 저장**되어 있어 그대로 Snapshot화하면 §5.7 위반 상속.
- cover: **0**. 재사용 substrate = 세션/MFA/SSO 인증 스택(위 citation)·digest primitive(`SecurityAudit.php:27`)이나, Snapshot Aggregate·AAL·digest ref 계층은 부재.

## 4. 확장·구현 방향 (설계)

- **순신규** `APPROVAL_AUTHENTICATION_SNAPSHOT` — §43 필드를 Decision 시점 캡처·불변 저장. `token id digest ref`=원문이 아닌 **digest**(§5.7). `impersonation state`=§39 세션(`UserAdmin.php:472-534`) 연동·`delegation state`=§38 연동. `captured_at`=Trusted Time·`immutable digest`=§45 Authentication Context Digest.
- **Golden Rule=Extend**: `session`은 기존 user_session(`UserAuth.php:229-318`)·`method`는 실재 MFA/SSO(TOTP/SMS/email/OIDC/SAML) 열거만 — 재구현 금지. AAL은 이들 method의 factor 특성으로 **파생 계산**(신규 인증수단 추가 아님).
- **Mandatory Control(§5.7·§62)**: Snapshot에는 digest ref만. **선행 BLOCKED_SECURITY 정합** — `user_session.token` 평문(`UserAuth.php:969`)·`mfa_secret` 평문(`UserAuth.php:3421,3771`)은 Snapshot 이전에 해시/암호화로 시정되어야 digest ref 원칙 충족(별도 수정세션). Authentication Snapshot Setter 금지(불변).
- **선행 필수(BLOCKED)**: 불변 Decision Record(§3.3)·session↔command Binding(§22)·AAL 모델(§12) 실구현이 선행. 이번 차수=설계 명세.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_SNAPSHOT]] · [[DSAR_APPROVAL_AUTHENTICATION_CONTEXT_DIGEST]] · [[DSAR_APPROVAL_IMPERSONATION_SESSION_GOVERNANCE]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
