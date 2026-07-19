# DSAR — Authorization Decision Result (06-A-03-02-03-04 Part 1 · §25)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용은 GROUND_TRUTH([[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract · §25)

`APPROVAL_AUTHORIZATION_DECISION_RESULT` code enum (24종·원문 전사):
`AUTHORIZED` / `AUTHORIZED_WITH_OBLIGATIONS` / `AUTHORIZED_WITH_CONSTRAINTS` / `DENIED` / `EXPLICITLY_DENIED` / `DEFAULT_DENIED` / `NOT_APPLICABLE` / `INDETERMINATE` / `CHALLENGE_REQUIRED` / `STEP_UP_REQUIRED` / `MANUAL_REVIEW_REQUIRED` / `EXCEPTION_REQUIRED` / `OVERRIDE_REQUIRED` / `POLICY_NOT_FOUND` / `POLICY_VERSION_MISMATCH` / `CONTEXT_INCOMPLETE` / `SUBJECT_INVALID` / `RESOURCE_INVALID` / `ACTION_INVALID` / `TENANT_MISMATCH` / `RESOURCE_VERSION_MISMATCH` / `AUTHORIZATION_EXPIRED` / `ENGINE_ERROR` / `KILL_SWITCH_BLOCKED`.

의미: Decision Result는 Effect(§23·8종 판정값)를 넘어 **판정의 구체적 귀결 사유를 코드화**한 결과 분류다. Effect=PERMIT을 AUTHORIZED / _WITH_OBLIGATIONS / _WITH_CONSTRAINTS로, Effect=DENY를 EXPLICITLY_DENIED(§5.3) / DEFAULT_DENIED(§5.2)로 세분하고, 판정 불성립 사유(POLICY_NOT_FOUND·VERSION_MISMATCH·CONTEXT_INCOMPLETE·TENANT_MISMATCH·ENGINE_ERROR·KILL_SWITCH_BLOCKED 등)를 명시 코드로 구분해 Error/Warning Contract(§56-57)·감사와 결합한다.

## 2. 기존 구현 대조

- **선언적 Decision Result 코드체는 부재(ABSENT)**. 현재 판정 귀결은 HTTP status(401/403)와 detail 문자열로만 표현된다: 키조회 예외→401(`index.php:490-493`)·write 권한 미달→403(`index.php:568-578`)·admin:keys 미달→403(`index.php:564-567`)·strict no-tenant→403(`index.php:585-587`). 24종의 구조화된 result code로 귀결 사유를 구분하지 않는다.
- **AUTHORIZED_WITH_OBLIGATIONS/CONSTRAINTS 부재**: Obligation(§27)·Constraint(§29)가 없어 "의무/제약을 동반한 허용" 결과가 없다. 통과는 단순 통과다.
- **EXPLICITLY_DENIED vs DEFAULT_DENIED 미구분**: 현행은 명시적 Deny 선언체가 없고 idiom(DENY_SCOPE `TeamPermissions.php:234`·roleOf 미해결→member `TeamPermissions.php:120-131`·__anon__)만 있어(GROUND_TRUTH §1) "명시적으로 거부"와 "기본거부"가 동일 403으로 뭉개진다.
- **부분적 유사 result substrate**:
  - `TENANT_MISMATCH` ≈ tenant 강제주입(`index.php:590-593,600`)이 위조를 차단하나 이는 덮어쓰기이지 mismatch를 result code로 반환하지 않음.
  - `CHALLENGE_REQUIRED`/`STEP_UP_REQUIRED` ≈ MFA/재인증 substrate가 인증 도메인엔 있으나(선행 06-A-03-02-03-03 Actor Identity) 인가 result로 결합되지 않음.
  - `EXCEPTION_REQUIRED`/`OVERRIDE_REQUIRED` ≈ Maker-Checker(Mapping approve·Alerting decideAction·GROUND_TRUTH §0-3)가 승인요구 상태를 갖지만 authorization result code가 아님.
- `POLICY_NOT_FOUND`/`POLICY_VERSION_MISMATCH`/`RESOURCE_VERSION_MISMATCH`/`AUTHORIZATION_EXPIRED`/`KILL_SWITCH_BLOCKED` → policy 버전화·resource version·expiration·kill switch 부재(§10·§16·§41·§46 ABSENT)로 result code 자체가 성립 불가.

## 3. 판정

- Verdict: **ABSENT** (24종 result code 순신규). 현행=HTTP status(401/403)+detail 문자열.
- cover: **0** — 구조화 result code 전무. tenant 강제주입·MFA·Maker-Checker는 PRESENT-substrate(부분 사유)이나 result code로 소비되지 않음.
- 선행 의존: Effect(§23)·Policy Version(§10)·Resource Version(§16)·Expiration(§41)·Kill Switch(§46) ABSENT로 다수 result code(POLICY_VERSION_MISMATCH·RESOURCE_VERSION_MISMATCH·AUTHORIZATION_EXPIRED·KILL_SWITCH_BLOCKED)가 성립 불가(BLOCKED_PREREQUISITE).

## 4. 확장/구현 방향 (설계)

- 순신규 24종 Decision Result enum을 Decision(§24)의 `result` 필드 값으로 정의하고, Effect(§23)→Result 매핑을 확정: PERMIT→AUTHORIZED/_WITH_OBLIGATIONS/_WITH_CONSTRAINTS, DENY→EXPLICITLY_DENIED/DEFAULT_DENIED, 나머지 Effect·오류상황→각 result code. Error Contract(§56)의 `APPROVAL_AUTHORIZATION_*` 접두 오류코드와 1:1 정합.
- Golden Rule=Extend: 현행 401/403 분기(`index.php:490-493,564-567,568-578,585-587`)를 result code 산출로 정형화 — 즉시 HTTP 반환 대신 Decision.result에 코드를 기록한 뒤 HTTP 매핑. DENY_SCOPE(`TeamPermissions.php:234`)·roleOf fail-closed(`TeamPermissions.php:120-131`)를 DEFAULT_DENIED substrate로, 향후 Explicit Deny Policy(§10)를 EXPLICITLY_DENIED로 분리.
- **Fail-closed result 우선**: ENGINE_ERROR·CONTEXT_INCOMPLETE·POLICY_NOT_FOUND·INDETERMINATE는 절대 AUTHORIZED로 변환 금지(§5.2·§5.13·§45) → 고위험은 DEFAULT_DENIED 귀결. `requireFeaturePlan` fail-open(`UserAuth.php:64-84`)을 정책엔진 도입 시 ENGINE_ERROR→DEFAULT_DENIED로 전환.
- TENANT_MISMATCH는 tenant 강제주입(`index.php:600`) idiom을 result code로 명시화, KILL_SWITCH_BLOCKED는 §46 Kill Switch 신설 후 결합(후속).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EFFECT]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION]] · [[DSAR_APPROVAL_AUTHORIZATION_REASON]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
