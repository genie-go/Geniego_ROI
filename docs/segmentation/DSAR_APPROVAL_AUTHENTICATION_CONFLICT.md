# DSAR — Authentication Conflict (06-A-03-02-03-03 · §49)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §49.

## 1. 원문 전사 (Canonical Contract)

**§49 Authentication Conflict** — 인증 컨텍스트와 Decision Command 결선이 모순되는 정적 충돌 21종(원문 전사):
1. `SESSION_PRINCIPAL_MISMATCH` · 2. `SESSION_ACTOR_MISMATCH` · 3. `TOKEN_SESSION_MISMATCH` · 4. `TOKEN_CLIENT_MISMATCH` · 5. `TOKEN_DEVICE_MISMATCH` · 6. `TOKEN_TENANT_MISMATCH` · 7. `NONCE_REUSED` · 8. `SESSION_EXPIRED` · 9. `SESSION_REVOKED` · 10. `SESSION_COMPROMISED` · 11. `AUTHENTICATION_TOO_OLD` · 12. `ASSURANCE_TOO_LOW` · 13. `STEP_UP_MISSING` · 14. `DEVICE_UNTRUSTED` · 15. `CLIENT_NOT_ALLOWED` · 16. `CHANNEL_NOT_ALLOWED` · 17. `DECISION_SLOT_BINDING_MISMATCH` · 18. `ACTION_BINDING_MISMATCH` · 19. `RESOURCE_BINDING_MISMATCH` · 20. `IMPERSONATION_PROHIBITED` · 21. `CUSTOM`.

의미: Authentication Conflict는 §21~§30 Authentication/Command Binding이 session↔principal↔token↔client↔device↔tenant↔nonce↔assurance↔slot/action/resource를 대조할 때 **양립불가한 인증 결선**을 탐지·차단한다. Session↔Decision Command 결합(§5.5)·타세션 Token 재사용 차단·Step-up/Assurance 부족·Impersonation 승인금지(§5.8/§39)가 핵심.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Authentication Conflict 탐지 축 = 부재** — 21종 conflict 코드·session↔command 대조 로직 전무. **session↔Decision Command 결합 자체가 ABSENT**(`Alerting.php:562,572-599,601-665` — decideAction 단일 approved·executeAction 재인증/MFA/approver≠executor/status 확인 없음) → 인증-커맨드 결선 미형성이라 대조 성립 안 됨.
- **대조 대상 축의 실재/부재**:
  - **세션 상태** — 검증 `UserAuth.php:229-318`(expires_at>now·is_active=1)·만료/유휴 `:965,282-286`·revocation `:1765,4173`·`EnterpriseAuth.php:400,413`·`:1381,1617,1631`. `SESSION_EXPIRED/REVOKED`의 실 재료이나 **로그인 게이트 국한, 승인 결선 대조 없음**.
  - **nonce** — one-time nonce 실재하나 SSO/OAuth/phone/DSAR 국한(OIDC `EnterpriseAuth.php:194,534`·`OAuth.php:219`·SAML `:271-283`·phone `UserAuth.php:2641-2656`·DSAR `index.php:147`). **승인 커맨드에 nonce 부재** → `NONCE_REUSED` 대조 대상 없음.
  - **assurance/step-up/device/client = ABSENT** — AAL 모델·step-up·Device/Fingerprint/Trusted·mTLS/Client Cert 전무 → `ASSURANCE_TOO_LOW`·`STEP_UP_MISSING`·`DEVICE_UNTRUSTED`·`CLIENT_NOT_ALLOWED` 탐지 축 미존재. MFA(TOTP/SMS/email, `UserAuth.php:3459-3484,3970-3976,3924-3934`)는 실재하나 **로그인만·승인 미결합**.
  - **token↔session/client/tenant** — 세션토큰 opaque(`UserAuth.php:964-970`)·JTI/refresh/token family **부재** → `TOKEN_SESSION/CLIENT/DEVICE/TENANT_MISMATCH` 대조 축 없음.
  - **slot/action/resource binding = ABSENT** → `DECISION_SLOT/ACTION/RESOURCE_BINDING_MISMATCH` 대상 없음.
- **★IMPERSONATION_PROHIBITED 정면 위험**: `Alerting::actor()`(`Alerting.php:33-36`) X-User-Email/`?actor=` 위조를 `decideAction`(`:574,591,593,597`)·policy ops(`:82,127,171,189,603`)가 신뢰·정족수 없이 단일 approved → 인증 conflict의 정반대(위조 actor를 통과). §5.11·§61 위반(BLOCKED_SECURITY).

## 3. 판정 (Verdict)

- Verdict: **ABSENT.** 21종 conflict 탐지 전무. session↔command 결합·assurance/step-up/device/client·slot/action/resource binding 부재로 대조 두 축 미성립.
- 선행 의존: §49는 §21 Authentication Context·§22 Authentication Binding·§23~§30 Token/Nonce/Device/Client/Slot/Action/Resource Binding·§31 Step-up·§32 MFA Binding에 종속 — 전부 미형성. **다중 BLOCKED_PREREQUISITE.**
- cover: **0.** 세션 상태·MFA·nonce 재료는 실재(PARTIAL-substrate)하나 승인 결선 대조로 통합 안 됨. **`Alerting` actor 위조·미재검증 집행은 conflict 탐지의 정반대로 작동하는 실결함**(BLOCKED_SECURITY, 자립 수정 가능).

## 4. 확장/구현 방향 (설계)

- Authentication Conflict는 **파생 축** — §22 Authentication Binding(session↔command)·§30 Commit Binding이 결선된 뒤라야 21종 대조 성립. 선행 신설 전 착수 시 BLOCKED_PREREQUISITE.
- **Golden Rule=Extend**: `SESSION_EXPIRED/REVOKED`는 실재 세션검증(`UserAuth.php:229-318`)·revocation(`:1765,4173`)을 conflict 축으로 통합; `NONCE_REUSED`는 실재 one-time nonce 패턴(OIDC `:194,534`·phone `:2641-2656`)을 **승인 커맨드로 확장**(§24). 새 세션/MFA/nonce 발명 금지.
- **★BLOCKED_SECURITY 선(先)교정**: `Alerting::actor()` 위조(`Alerting.php:33-36`)·`decideAction` 단일 approved(`:574,591,593,597`)·`executeAction` 미재검증 집행(`:601-665`)은 §49의 `IMPERSONATION_PROHIBITED`·`SESSION_ACTOR_MISMATCH`가 막아야 할 바로 그 경로. 선행 무관하게 자립 수정 가능(§5.11 Client 전달 Actor ID 인증 없이 신뢰 금지)—별도 배포승인 세션 후보.
- **fail-closed**: assurance/step-up/device/slot 불일치 시 §63 Guard·§64 Error(`ASSURANCE_TOO_LOW`·`STEP_UP_REQUIRED`·`DEVICE_BINDING_INVALID` 등)로 Commit 차단. IdP 장애 시 고위험 Fail Open 금지(§71). 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_AUTHENTICATION_EVIDENCE]] · [[DSAR_APPROVAL_IDENTITY_CONFLICT]] · [[DSAR_APPROVAL_AUTHENTICATION_DRIFT]] · [[DSAR_APPROVAL_SESSION_REPLAY_DETECTION]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
