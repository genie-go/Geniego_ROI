# DSAR — Step-up Authentication Foundation (06-A-03-02-03-03 · §31)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**§31 Step-up Foundation** — 승인/집행 시점에 기준 인증보다 높은 assurance를 재요구하는 재인증 계약. Step-up 조건(18종):
High Amount · Payment · Settlement · Contract · Legal · Security · Administrative Cancel · Correction · Supersession · Untrusted · New Device · Dormant Account · Long-lived Session · Recent Password Reset · Recent Privilege Elevation · Impersonation · Risk Signal · Custom.

필수 필드: `required assurance level`(요구 AAL/SAL) · `allowed methods`(허용 재인증 수단) · `challenge ref`(챌린지 참조) · `requested_at` / `expires_at` / `completed_at` · `result`.

원칙 계약(§5.10·§29·§30 파생): Assurance Level ↔ Action Risk 결합. Step-up은 **특정 Decision Slot·Action·Resource·Amount에 고정**되어 다른 Action/Resource에 **재사용 금지**(§29). Commit 직전 Step-up 충족 여부를 재검증(§30). 로그인 시 MFA를 통과했다는 사실만으로는 고위험 승인의 Step-up을 대체하지 못한다.

## 2. 기존 구현 대조

- **MFA substrate는 실재하나 로그인 단계에만 결합** — TOTP(`UserAuth.php:3459-3484`)·SMS OTP(`UserAuth.php:3970`)·이메일 OTP(`UserAuth.php:3924`)·복구코드(`UserAuth.php:3491`)와 정책 off/admin/all(`UserAuth.php:3638-3660`)이 모두 실동작한다. 그러나 이들은 **로그인 인증 흐름에서만 호출**되며, 승인/집행 시점의 재인증(Step-up)에는 **어디에도 결합돼 있지 않다**(GROUND_TRUTH §2 "TOTP … **미결합**(로그인만)").
- **승인 경로에 재인증 요구 전무** — maker-checker 승인(`Mapping.php:186-190,210,246-250,268,279,287`)은 자기승인 차단(`:268`)·정족수 2(`:287`)를 강제하나, 승인자에게 **Step-up 챌린지를 요구하지 않는다**. `Alerting::executeAction`(`Alerting.php:601-665`)은 status 확인·재인증·MFA·approver≠executor 없이 곧바로 AdAdapters로 집행한다 — 금액/결제/정산 Action에도 Step-up 게이트가 없다.
- **`required assurance level` / `challenge ref` / `expires_at` 데이터 모델 자체가 부재** — Step-up을 Decision Slot·Action·Resource·Amount에 고정하는 구조체 no hits. 기존 `mfa_secret`은 챌린지 결과가 아니라 로그인용 시크릿이다.
- ★ **break-glass 마스터 로그인은 MFA를 우회**(`UserAuth.php:777-798`·`:925`) — 최상위 예외경로가 Step-up의 반대 방향으로 열려 있어, Step-up Foundation 설계 시 이 경로를 명시적 고위험 감사·decision 결합 예외로 봉인해야 한다.

## 3. 판정

- **Verdict: ABSENT (승인 Step-up)** — MFA 수단은 PRESENT-substrate이나 **승인/집행의 Step-up 재인증은 전무**. 현재 어떤 승인 판정·집행에도 재인증을 요구하지 않는다(MFA는 로그인만).
- **선행 의존**: §3.3 Decision Foundation·Commit Binding(§30) ABSENT — Step-up을 고정할 Decision Slot/Command/Commit 대상이 없다 → 승인 결합부 BLOCKED_PREREQUISITE.
- **cover: 부분(수단만)** — 재인증 primitive(TOTP/SMS/email/복구코드·정책)는 `UserAuth.php:3459-3484,3970,3924,3491,3638-3660`으로 커버. Step-up 조건 18종·challenge 고정·commit 재검증은 0.

## 4. 확장·구현 방향 (설계)

- **기존 MFA 스택을 Step-up 챌린지 엔진으로 승격(Golden Rule=Extend)** — `UserAuth.php:3459-3484`(TOTP)·`:3970`(SMS)·`:3924`(email)·`:3491`(복구)를 재사용하되, 로그인 전용에서 **Decision Slot·Action·Resource·Amount에 바인딩된 챌린지**로 확장. 신설 `required assurance level`·`allowed methods`·`challenge ref`·`requested/expires/completed_at`·`result` 필드로 결과만 봉인(OTP 원문 금지 — §32와 연동).
- **Step-up 조건 18종을 Definition(§10) 데이터로 선언** — High Amount/Payment/Settlement/Contract/Legal/Security/Administrative Cancel/Correction/Supersession/Untrusted/New Device/Dormant/Long-lived Session/Recent Password Reset/Recent Privilege Elevation/Impersonation/Risk Signal/Custom을 Action Risk ↔ required AAL 매핑으로 규약화.
- **재사용 금지·commit 재검증 강제** — 한 Step-up 결과를 다른 Action/Resource에 재사용 금지(§29), Commit 직전 Step-up 충족·미만료 재검증(§30·§55). Mandatory Control.
- ★ **break-glass(`UserAuth.php:777-798,925`) 예외경로는 Step-up 우회로 남지 않도록** 별도 고위험 감사 + decision 결합 예외 정책으로 봉인.
- **선행 필수**: §3.3 Decision Core·Commit Binding 실구현 — 별도 승인세션. 이번 차수=설계 명세, 코드 변경 0.

관련: [[SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_MFA_BINDING_FOUNDATION]] · [[DSAR_APPROVAL_DECISION_ACTOR_RESOLUTION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
