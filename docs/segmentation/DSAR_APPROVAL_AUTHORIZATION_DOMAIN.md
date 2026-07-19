# DSAR — Authorization Domain (§9)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§9 `APPROVAL_AUTHORIZATION_DOMAIN` 필수 필드 (원문 전사):

- `parent domain` · `hierarchy path`
- `resource type registry` · `action type registry`
- **`risk classification`**
- **`default profile`**(§14 Profile 연결)

**DOMAIN enum (20종)**: `APPROVAL_DECISION` / `ASSIGNMENT` / `DELEGATION` / `ADMINISTRATION` / `PAYMENT` / `SETTLEMENT` / `REBATE` / `CLAIM` / `CONTRACT` / `LEGAL` / `COMPLIANCE` / `SECURITY` / `DATA_ACCESS` / `REPORTING` / `EXPORT` / `FILE_ACCESS` / `USER_ADMINISTRATION` / `SYSTEM_CONFIGURATION` / `INTEGRATION` / `CUSTOM`.

의미: Domain은 인가 대상을 **비즈니스 위험 도메인으로 분류**하고(계층 path·부모 domain), 도메인별 `risk classification`과 `default profile`(§14)을 부여해 하위 Policy/Definition의 위험 기본값·Combining Algorithm·Fail-Closed 강도를 결정하는 분류축이다. 고위험 도메인(PAYMENT/SETTLEMENT/CONTRACT/LEGAL/SECURITY)은 DENY_OVERRIDES·Fail-Closed 강제와 연결(§11·§45).

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 도메인 분류 구조체(risk classification·default profile·hierarchy path)는 부재** — GROUND_TRUTH 전 표에서 도메인별 위험분류·프로파일을 데이터로 선언하는 자산 → **no hits**.
- 실존하는 **암묵적 도메인 경계**(코드 분산, 분류축 아님):
  - **ADMINISTRATION/USER_ADMINISTRATION 도메인 경계** = admin 게이트(`UserAdmin.php:33-62` 세션→plan='admin' DB 재검증)·master/sub 권한상승 차단(`UserAdmin.php:65-68,273,287,358,395`)·requireAdminUser(`UserAuth.php:2920`). 도메인이 코드 게이트로 존재하나 `risk classification`/`default profile` 미부여.
  - **DATA_ACCESS 도메인** = ABAC data_scope(`TeamPermissions.php:236-322`)·acl_permission 8action(`TeamPermissions.php:39,152-159,325-336`) — 데이터 접근 도메인의 실 enforcement이나 분류 선언 아님.
  - **APPROVAL_DECISION 도메인** = Maker-Checker(Mapping approve `Mapping.php:238-292` 자기승인차단/정족수·Alerting decideAction `Alerting.php:598-658` 정족수2) — 승인 도메인 substrate.
  - **SECURITY/COMPLIANCE 경계** = `Compliance.php:203`·`tenant_security_policy`(`UserAuth.php:3580`)·SecurityAudit 배선(`UserAuth.php:4046`·`Compliance.php:162`).
- `risk classification`·`default profile`·`parent domain`·`hierarchy path`·`resource type registry`/`action type registry` → **no hits**. 도메인별 위험 기본값·프로파일 연결 전무.

## 3. 판정

- **Verdict: ABSENT** (도메인 분류·위험 선언체 부재). 다수 도메인 경계가 **코드 게이트로 암묵 실재**(PARTIAL-substrate: ADMINISTRATION·DATA_ACCESS·APPROVAL_DECISION·SECURITY).
- **선행 의존**: Domain은 §14 Profile·§11 Policy Set(Combining Algorithm)·§45 Fail-Closed에 결속 — Profile/Policy Set 선언체 부재로 `default profile` 결속이 **BLOCKED_PREREQUISITE**. 도메인 경계 코드만 substrate PRESENT.
- **cover: 0** (도메인별 risk classification·default profile 데이터 선언 전무). 암묵 경계는 흡수 대상이지 분류 대체 아님.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_domain` — 20종 도메인을 `hierarchy path`·`risk classification`·`default profile`로 선언. **암묵 코드 도메인 경계를 데이터화 흡수** — ADMINISTRATION←`UserAdmin.php:33-62`·DATA_ACCESS←`TeamPermissions.php:236-322`·APPROVAL_DECISION←Maker-Checker(`Mapping.php:238-292`·`Alerting.php:598-658`)·SECURITY←`tenant_security_policy`(`UserAuth.php:3580`). 도메인 신규 열거가 아닌 기존 경계의 분류 부여.
- **Mandatory Control**: 고위험 도메인(PAYMENT/SETTLEMENT/CONTRACT/LEGAL/SECURITY)에 `default profile`=고위험(§14)·DENY_OVERRIDES(§11)·Fail-Closed(§45) 자동결속 — 현재 도메인별 위험 차등화 전무(admin 게이트는 boolean 단일 강도).
- **실위험**: ① `admin_roles/user_roles` DORMANT(`UserAdmin.php:627-641`)로 USER_ADMINISTRATION 도메인의 커스텀롤이 런타임 미소비 → 도메인 profile 연결 시 실 소비. ② isAdmin/requireAdmin 3~4중 중복(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`·FE `App.jsx:377`)이 ADMINISTRATION 도메인에서 정책 드리프트 → 도메인 단위 canonical 판정으로 SSOT화(설계만, 배선 후속).

관련: [[DSAR_APPROVAL_AUTHORIZATION_REGISTRY]] · [[DSAR_APPROVAL_AUTHORIZATION_POLICY_SET]] · [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
