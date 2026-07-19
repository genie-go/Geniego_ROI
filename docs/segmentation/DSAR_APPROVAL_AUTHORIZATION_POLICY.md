# DSAR — Authorization Policy (§10)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§10 `APPROVAL_AUTHORIZATION_POLICY` 필수 필드 (원문 전사):

- `registry` · `tenant` · `code` · `name` · `type` · `purpose`
- `applicable scope`
- `subject selector` / `resource selector` / `action selector` / `environment selector`
- `condition` · **`effect`** · `priority`
- **`combining behavior`** · **`default behavior`**
- `required context fields` / `required evidence fields` · `required assurance`
- `challenge policy` · `obligation policy` · `advice policy` · `exception policy` · `override policy`
- `cache policy` · `revalidation policy` · `expiration policy` · `failure policy`
- `version` · `valid` · `owner` · `status` · `digest`

**TYPE enum (17종)**: `BASE_ACCESS` / `APPROVAL_ACTION` / `RESOURCE_ACCESS` / `DATA_ACCESS` / `ADMINISTRATIVE` / `HIGH_RISK_ACTION` / `DENY` / `RESTRICTION` / `CHALLENGE` / `OBLIGATION` / `EXCEPTION` / `OVERRIDE` / `TEMPORARY` / `EMERGENCY` / `SYSTEM_ACTOR` / `SERVICE_ACCOUNT` / `CUSTOM`.

의미: Policy는 **하나의 인가 규칙**을 subject/resource/action/environment selector + condition + `effect`(PERMIT/DENY)로 데이터 선언하고, `version`·`combining behavior`·`default behavior`·failure/cache/revalidation policy를 부착한 **버전화된 정책 단위**다. Policy Set(§11)이 이를 Combining Algorithm으로 결합한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **버전화된 선언적 Policy 구조체는 부재** — GROUND_TRUTH §1 **Versioned Policy = ABSENT**(`인가규칙=코드 상수(하드코딩)`)·**Policy Set/Combining Algorithm = ABSENT**(주석만 `UserAuth.php:332-333`).
- **★인가 규칙이 코드 상수로 분산 실재**(정책의 실 semantic — 데이터화 대상):
  - **roleRank 상수 맵** = `index.php:554`(viewer0/connector1/analyst2/admin3) — write effect 규칙(`index.php:568-578`)·admin:keys 규칙(`index.php:564-567`)이 코드 조건문으로 하드코딩. 이것이 곧 BASE_ACCESS/ADMINISTRATIVE Policy의 코드형 표현.
  - **acl_permission 매트릭스** = `TeamPermissions.php:39,152-159,325-336`(subject_type×menu×8action·manage 슈퍼셋) — RESOURCE_ACCESS/DATA_ACCESS Policy의 실 데이터 형태(단, effect/version/combining 미부착).
  - **DENY idiom** = DENY_SCOPE(`TeamPermissions.php:234`)·__anon__ — DENY effect가 코드 관용구로만 존재, 선언적 DENY Policy 부재.
  - **HIGH_RISK_ACTION/APPROVAL_ACTION** = Maker-Checker(`Mapping.php:238-292`·`Alerting.php:598-658` 정족수·자기승인차단)·master/sub 상승차단(`UserAdmin.php:65-68,273,287,358,395`).
  - **하드코딩 plan==='admin' 분포**(ADMINISTRATIVE Policy 코드형·SSOT 부재) = `UserAuth.php:72,104,3668,3712,3738,4208`·`UserAdmin.php:273,306,321,437,458`·`Compliance.php:203`·`Pnl.php:522`·`Keys.php:191,206`·`SystemMetrics.php:50`.
  - **SYSTEM_ACTOR/SERVICE_ACCOUNT** = api_key scopes 화이트리스트(`Keys.php:99-113,198-206`·`UserAuth.php:4204-4290`)·SSO group→role(`EnterpriseAuth.php:70,78-88,476-480`).
- `effect`(PERMIT/DENY 명시)·`combining behavior`·`default behavior`·`version`·`priority`·`digest`·`condition`(데이터 술어) → **no hits**. 정책이 데이터 아닌 흩어진 코드 분기.

## 3. 판정

- **Verdict: ABSENT** (선언적/버전화 Policy 구조체 부재). 단, **정책 semantic이 코드 상수·acl_permission 데이터로 대량 실재**(PARTIAL-substrate) — Policy 데이터화의 1차 흡수 표면.
- **선행 의존**: Policy는 §8 Scope·§11 Policy Set·§13 Version·§22 Evaluation에 결속 — 버전화/Combining 부재로 정책 결합·버전화가 **BLOCKED_PREREQUISITE**. 코드 규칙·acl_permission만 substrate PRESENT.
- **cover: 0** (버전화·선언적 Policy 전무). 코드 상수·매트릭스는 흡수 대상 substrate(대체 아님).

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_policy` — 17종 TYPE·selector·`effect`·`version`을 데이터 선언. **★코드 상수 규칙을 데이터화 흡수**: `index.php:554` roleRank 맵→BASE_ACCESS/ADMINISTRATIVE Policy, write 게이트(`index.php:568-578`)→APPROVAL_ACTION/HIGH_RISK Policy, acl_permission(`TeamPermissions.php:39,152-159,325-336`)→RESOURCE/DATA_ACCESS Policy, 하드코딩 plan=='admin' 15개소→단일 ADMINISTRATIVE Policy로 SSOT화. **중복 정책 로직 신설 금지 — 기존 규칙을 Policy row로 이관.**
- **Mandatory Control**: `effect`를 PERMIT/DENY 명시(모호 "접근가능" 금지·§5.6)·`default behavior`=DENY(§5.2)·DENY Policy 선언체 도입(§5.3 Explicit Deny 우선) — 현재 DENY는 DENY_SCOPE(`TeamPermissions.php:234`) 관용구만.
- **실위험**: ① `requireFeaturePlan` fail-open(`UserAuth.php:64-84` `:68,72,82-84` plan null→allow·catch→allow)은 Policy `default behavior`=DENY·`failure policy`=fail-closed 위반 → 정책엔진 편입 시 fail-closed 전환(설계). ② 정책 semantic이 15+개소 하드코딩 plan=='admin'으로 흩어져 드리프트 위험 → 단일 Policy로 통합. ③ FE writeGuard(`writeGuard.js:13,61-90`) UI-only는 Policy의 서버 selector로 대체돼야 함(§5.4). 실 배선/수정은 후속 enforcement Part.

관련: [[DSAR_APPROVAL_AUTHORIZATION_POLICY_SET]] · [[DSAR_APPROVAL_AUTHORIZATION_REGISTRY]] · [[DSAR_APPROVAL_AUTHORIZATION_DEFINITION]] · [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
