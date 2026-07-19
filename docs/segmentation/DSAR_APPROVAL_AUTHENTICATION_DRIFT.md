# DSAR — Authentication Drift (06-A-03-02-03-03 · §51)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §51.

## 1. 원문 전사 (Canonical Contract)

**§51 Authentication Drift** — Validation 시점과 Commit 시점 **사이**에 인증 전제가 바뀌는 사건 17종(원문 전사):
1. Session Expired · 2. Session Revoked · 3. Session Generation Changed · 4. Token Revoked · 5. Token Reused · 6. Token Family Compromised · 7. Nonce Reused · 8. Auth Age Exceeded · 9. Step-up Expired · 10. Device Trust Revoked · 11. Device Changed · 12. Client Disabled · 13. Provider Session Invalidated · 14. Assurance Reduced · 15. Method Deprecated · 16. Network Risk Change · 17. Impersonation State Changed.

★핵심 계약: **Validation↔Commit 사이 인증 Drift 시 Commit 차단**(§55 Commit-time Auth Revalidation과 짝). 특히 Session Revoked·Token Revoked/Reused·Step-up Expired는 커밋 직전 재검증으로 잡아야 하며, 검증 후 인증상태의 무기한 재사용 금지.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Authentication Drift = ABSENT.** commit-time 재검증·session↔command 결합이 **ABSENT**(`Alerting.php:562,572-599,601-665` — executeAction이 status='approved' 확인·재인증·MFA·approver≠executor 없이 집행)이라, "검증 후 커밋 사이 세션이 폐기됐는가"를 물을 지점이 없다.
- **★revocation 실재·commit 미결합(핵심 판정)**:
  - **세션 revocation은 실동작** — logout `UserAuth.php:1765`·revoke-others `:4173`·deprovision `EnterpriseAuth.php:400,413`·DELETE `:1381,1617,1631`(DB DELETE). 즉 `Session Revoked`(2)를 만들 능력은 **실재**한다.
  - 그러나 revocation 효과는 **다음 요청의 세션 검증**(`UserAuth.php:229-318` — user_session JOIN·expires_at>now·is_active=1)에서만 반영된다. 승인 검증↔커밋 사이에 세션이 폐기돼도 **그 드리프트를 재검증하는 커밋 게이트가 없어** 미결합. → drift 탐지에 revocation이 연결되지 않음.
  - `Session Expired`(1)·`Auth Age Exceeded`(8)의 재료(만료 `:965`·유휴 `:282-286`)도 요청 진입 게이트일 뿐 commit-time 재검증 아님.
- **탐지 대상 축의 부재**:
  - **Token Revoked/Reused/Family Compromised(4/5/6)·Session Generation(3)** — 세션토큰 opaque(`UserAuth.php:964-970`)·JTI/refresh/token family/generation **부재** → 토큰 계열 drift 대상 미존재.
  - **Step-up/Device/Client(9/10/11/12) = ABSENT** — step-up·Device/Fingerprint/Trusted·mTLS/Client Cert 전무.
  - **Assurance Reduced(14)·Method Deprecated(15)** — AAL 모델·method version registry 부재.
  - **Nonce Reused(7)** — 승인 커맨드에 nonce 부재(one-time nonce는 SSO/phone/DSAR 국한: OIDC `EnterpriseAuth.php:194,534`·phone `UserAuth.php:2641-2656`·DSAR `index.php:147`).
  - **Impersonation State Changed(17)** — `imp_` 2h 세션(`UserAdmin.php:472-534`)은 만료되나 Original Principal 미보존·승인 결선 없음.

## 3. 판정 (Verdict)

- Verdict: **ABSENT.** 17종 auth drift 탐지 전무. commit-time 재검증·session↔command 결합 부재로 재검증 지점 없음.
- 선행 의존: §51은 §22 Authentication Binding·§55 Commit-time Auth Revalidation·§43 Authentication Snapshot·§20 Session에 종속. **★단 §55의 핵심 원료인 세션 revocation은 실재**(`:1765,4173`·`EnterpriseAuth.php:400,413`)하므로, drift 결합부만 신설하면 되는 PARTIAL-substrate.
- cover: **0(drift 탐지) · PARTIAL-substrate(revocation 실재·commit 미결합)**. `Session Revoked`를 만들 능력은 있으나 그 상태를 커밋 직전 재검증에 결합하는 축이 없다.

## 4. 확장/구현 방향 (설계)

- Authentication Drift는 **파생 축** — §26 Validation Result에 §45 Authentication Digest를 남기고, §55 Commit-time Auth Revalidation에서 Session Active·Token 미폐기·Auth Age·Step-up·Assurance를 **재평가**하는 구조가 선행돼야 감지. 선행 신설 전 착수 시 BLOCKED_PREREQUISITE.
- **★revocation↔commit 결합(핵심 확장)**: 실재 세션 revocation(logout `:1765`·revoke-others `:4173`·deprovision `EnterpriseAuth.php:400,413`)을 **커밋 직전 세션 재조회**(`UserAuth.php:229-318` 패턴)로 재사용해 `Session Revoked`/`Session Expired`를 drift로 차단. 새 revocation 메커니즘 발명 금지 — 실재 DELETE 경로를 commit gate에 결선만.
- **Golden Rule=Extend**: `Auth Age Exceeded`는 실재 만료/유휴(`:965,282-286`)를 재사용; Token 계열 drift(3/4/5/6)는 선행으로 token id digest·token family(§23) 신설이 필요(현재 opaque·JTI 없음).
- **fail-closed·가짜녹색 금지**: Critical Auth Drift(Session Revoked·Token Reused·Step-up Expired) 시 §63 Guard로 Commit 차단·§64 Error(`SESSION_REVOKED`·`TOKEN_REPLAY`·`STEP_UP_EXPIRED`·`AUTHENTICATION_DRIFT_DETECTED`). `Alerting::executeAction`(`:601-665`)의 무재검증 집행을 §55로 대체. 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_EVIDENCE]] · [[DSAR_APPROVAL_AUTHENTICATION_CONFLICT]] · [[DSAR_APPROVAL_IDENTITY_DRIFT]] · [[DSAR_APPROVAL_SESSION_REPLAY_DETECTION]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
