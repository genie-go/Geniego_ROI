# DSAR — Authentication Simulation (06-A-03-02-03-03 · §60)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§60 **Authentication Simulation** (SPEC 원문):

시뮬레이션 시나리오(17종) — `VALID_SESSION` · `EXPIRED_SESSION` · `REVOKED_SESSION` · `LOW_ASSURANCE` · `STEP_UP_REQUIRED` · `STEP_UP_EXPIRED` · `TOKEN_REPLAY` · `NONCE_REUSE` · `DEVICE_CHANGE` · `UNTRUSTED_DEVICE` · `CLIENT_MISMATCH` · `CHANNEL_MISMATCH` · `DECISION_SLOT_MISMATCH` · `ACTION_MISMATCH` · `RESOURCE_MISMATCH` · `IMPERSONATION_PROHIBITED` · `CUSTOM`.

★ 강행규정: **실제 Session 변경 금지** — 가정된 인증상태로 Guard/Binding 판정을 예측만 하고 실제 세션·토큰·nonce를 조작하지 않는다.

연계: §22 Authentication Binding·§30 Commit Binding·§49 Authentication Conflict·§51 Authentication Drift·§52 Session Replay·§63 Runtime Guard의 예측 실행.

의미: 승인 인증 게이트가 만료/폐기 세션·낮은 AAL·Step-up 요구/만료·토큰 재생·Nonce 재사용·디바이스/클라이언트/채널/슬롯/액션/리소스 불일치·임퍼소네이션 금지 상황에서 어떤 판정을 낼지를 **실제 세션을 바꾸지 않고** 사전 검증·회귀할 수 있게 한다.

## 2. 기존 구현 대조

- **인증 시뮬레이션(가정 인증상태 주입 후 판정 예측) 계층은 전무 — 순신규.**
  - 실재하는 인증검사(세션 검증 `UserAuth.php:229-318`·revocation `:1765,:4173`·MFA `:3459-3527`·SSO nonce `EnterpriseAuth.php:194,534`)는 전부 **실제 상태에 대한 실검사**이지, 가정 상태를 주입해 예측하는 시뮬레이션이 아니다.
- **시뮬레이션이 예측해야 할 판정 원천의 다수가 부재**:
  - EXPIRED/REVOKED_SESSION의 원천(만료 `UserAuth.php:965`·revocation `:1765,:4173`)은 실재하나 이를 **가정 입력으로 받는 예측 함수**가 없다.
  - STEP_UP_REQUIRED/EXPIRED·LOW_ASSURANCE·TOKEN_REPLAY·DEVICE_CHANGE·UNTRUSTED_DEVICE·CLIENT/CHANNEL/SLOT/ACTION/RESOURCE_MISMATCH: Step-up·AAL·session↔command 결합·Device/Client Binding·Command Digest가 전부 `ABSENT`(§2 GROUND_TRUTH; `Alerting.php:601-665` 미결합, Device/mTLS `grep 무`).
  - NONCE_REUSE: one-time nonce 패턴은 SSO/OAuth/phone/DSAR 국한(`OAuth.php:219`·`UserAuth.php:2641-2656`·`index.php:147`)이며 승인 커맨드 Nonce 부재.
- IMPERSONATION_PROHIBITED: impersonation은 실재(`UserAdmin.php:472-534`)하나 승인 금지 정책·Original Principal 보존이 부재하여 "금지 판정"을 산출할 규칙이 없다.

## 3. 판정

- Verdict: **ABSENT** (순신규 — 실 session 변경 없는 인증 예측 계층 전무).
- cover: **0.** 가정 인증상태를 주입해 Binding/Guard 판정을 예측하는 시뮬레이션이 부재하며, 예측 대상(§22/§30/§63)과 다수 시나리오 원천(Step-up·AAL·Device/Client·승인 Nonce·Command Digest)도 부재. 실재하는 세션/MFA/revocation은 실검사로, §60 강행규정(실 session 변경 금지)의 예측 계층으로 계상 불가.
- 선행 의존: §22 Authentication Binding·§30 Commit Binding·§63 Guard ABSENT → **BLOCKED_PREREQUISITE**. EXPIRED/REVOKED_SESSION 시나리오는 세션 만료/revocation 실재로 예측함수 신설 시 우선 커버 가능.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authentication_simulation` — 17종 시나리오별로 가정 인증상태(session 상태·AAL·Step-up·token/nonce·device/client/channel·slot/action/resource digest)를 순수 입력으로 Authentication Binding(§22)·Commit Binding(§30)·Guard(§63)에 주입, 예상 판정(PASS/BLOCK+conflict code §49)을 산출. 세션 발급·토큰 생성·nonce 소비 **일절 없음**(강행규정 §60).
- Golden Rule=Extend: 인증검사 로직을 **부작용 없는 순수 판정함수**로 설계하여 실경로(commit-time revalidation §55)와 시뮬레이션이 동일 로직 공유. 세션 상태 판정은 기존 검증 규약(`UserAuth.php:229-318` `expires_at>now`·revocation), Nonce 소비 규약은 기존 one-time nonce 패턴을 참조하되 시뮬레이션은 가정값 주입.
- 용도: §72 Security 회귀(Session/Token Replay·Nonce Reuse·Expired Session·Low Assurance·Step-up/Device/Client Bypass·Impersonation Hidden)를 실제 세션 조작 없이 재현.
- 무회귀: 시뮬레이션 API는 실 세션/토큰/nonce에 접근·변경하지 않으므로 로그인/세션/MFA/SSO에 영향 0. 예측 결과가 실 Guard 경로로 유입되지 않도록 격리.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_IDENTITY_SIMULATION]] · [[DSAR_APPROVAL_AUTHENTICATION_RECONCILIATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]
