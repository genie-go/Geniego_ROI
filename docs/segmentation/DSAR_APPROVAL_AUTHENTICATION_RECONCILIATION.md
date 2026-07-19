# DSAR — Authentication Reconciliation (06-A-03-02-03-03 · §58)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§58 **Authentication Reconciliation** (SPEC 원문):

정합 대조 대상 — `Session vs IdP Session/Token` · `Token vs Client/Device/Tenant` · `Auth Event vs Session` · `MFA vs Step-up` · `Nonce vs Consumption` · `Command vs Auth Binding` · `Commit vs Session State` · `Auth Snapshot vs Provider Event` · `Ledger Auth Digest vs Snapshot` · `Revocation vs Decision Time` · `Impersonation vs Audit` · `Support vs Ticket` · `API Client vs OAuth Registration`.

연계: §49 Authentication Conflict(불일치 분류) · §51 Authentication Drift · §52 Session Replay · §65 WARNING.

의미: 승인 인증 컨텍스트(세션·토큰·MFA·Step-up·Nonce·임퍼소네이션·API Client)가 IdP/Provider/OAuth 등록·티켓·원장 인증 digest와 **대조·정합**되어, 폐기·재사용·미등록·해지시각 역전 같은 어긋남을 탐지한다. 특히 `Revocation vs Decision Time`은 폐기된 세션/토큰으로 Commit이 이뤄졌는지를 사후 재현한다.

## 2. 기존 구현 대조

- **세션·토큰·MFA·Nonce·OAuth Client 원천은 실재하나, 승인 인증 컨텍스트와의 reconcile은 부재.**
  - 세션: opaque stateful(`UserAuth.php:229-318`·JWT 아님·JTI/refresh 부재)·revocation DB DELETE(logout `:1765`·revoke-others `:4173`·deprovision `EnterpriseAuth.php:400,413`·DELETE `:1381,1617,1631`). `Revocation vs Decision Time` 대조의 원천은 있으나 **승인 원장과 시각 대조하는 루틴 없음.**
  - MFA: TOTP(`UserAuth.php:3459-3484`)·SMS OTP(`:3970-3976`)·이메일 OTP(`:3924-3934`)·복구코드(`:3491-3527`)·정책(`:3638-3660`) 실재하나 **로그인만 결합·승인/Step-up 미결합** → `MFA vs Step-up` 대조 상대(Step-up)가 없다.
  - Nonce: SSO/OAuth/phone/DSAR 국한(`EnterpriseAuth.php:194,534`·`OAuth.php:219`·`UserAuth.php:2641-2656`·`index.php:147`) 1회 소비·재사용 차단. 승인 커맨드 Nonce는 부재 → `Nonce vs Consumption`의 승인축 대조불가.
  - API Client vs OAuth Registration: 커넥터 OAuth(`OAuth.php:41-61,190-244` `:219` 아웃바운드·state CSRF)는 실재하나 **비-사용자 인증**이며 승인 인증과 무관.
- **부재 축**: `Command vs Auth Binding`·`Commit vs Session State`·`Auth Snapshot vs Provider Event`·`Ledger Auth Digest vs Snapshot`은 session↔command 결합·Authentication Snapshot·Auth Binding이 전부 `ABSENT`(§2 GROUND_TRUTH `commit-time 재검증·session↔command 결합 ABSENT`; `Alerting.php:601-665` 미결합).
- **Impersonation vs Audit / Support vs Ticket**: Member impersonation(`UserAdmin.php:472-534` `:493-497,499,525`)은 발급시 audit는 남기나 **Original Principal 미보존**이라 대행 승인이 본인 승인과 구별 불가 → 대조 기준이 붕괴. Support Access governance(Ticket)는 `ABSENT`.
- **Token vs Client/Device**: Device/Client Binding·mTLS 전부 `ABSENT`(`grep 무`) → 토큰↔디바이스 대조 불가.

## 3. 판정

- Verdict: **ABSENT** (reconcile 계층 부재 · 세션/MFA/Nonce/OAuth substrate PRESENT).
- cover: **인증 원천 실재이나 승인 인증 컨텍스트 reconcile = 0.** 세션 revocation·MFA·SSO Nonce·OAuth Client는 실재하나 Session↔IdP Session·Token↔Client/Device·MFA↔Step-up·Command↔Auth Binding·Revocation↔Decision Time 대조가 전무하며, 대조 상대(Auth Binding·Auth Snapshot·Step-up·Support Ticket·Original Principal)가 부재.
- 선행 의존: §22 Authentication Binding·§43 Authentication Snapshot·§40 Support Access ABSENT → **BLOCKED_PREREQUISITE**. `Revocation vs Decision Time`은 revocation 경로+SecurityAudit 실재로 우선 착수 가능.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authentication_reconciliation` — 항목별 결과(MATCH/DRIFT/CONFLICT)를 §49 Authentication Conflict로 분류·§65 WARNING 라우팅. **실 session/token을 변경하지 않는 관측 전용.**
- Golden Rule=Extend: 세션 상태·revocation은 기존 경로(`UserAuth.php:229-318`·`:1765,:4173`) 재사용, MFA는 기존 스택(`UserAuth.php:3459-3527,3638-3660`) 재사용, Nonce 패턴은 기존 SSO/OAuth/phone/DSAR one-time nonce(`EnterpriseAuth.php:194,534`·`OAuth.php:219`·`UserAuth.php:2641-2656`·`index.php:147`) 재사용. Ledger 대조 정본=`SecurityAudit` 해시체인(`SecurityAudit.php:14-33`).
- 착수 순서: ① Revocation vs Decision Time(revocation+SecurityAudit 有) → ② Nonce vs Consumption(one-time nonce 패턴 有, 승인 Nonce 신설 후) → ③ Command vs Auth Binding·Commit vs Session State(§22 Auth Binding·§55 결합 신설 후).
- 무후퇴: 대조·경보만 수행 — 기존 세션검증·revocation·MFA·SSO 로그인 동작 불변.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_IDENTITY_RECONCILIATION]] · [[DSAR_APPROVAL_AUTHENTICATION_SIMULATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]
