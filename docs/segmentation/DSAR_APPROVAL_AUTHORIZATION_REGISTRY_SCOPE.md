# DSAR — Authorization Registry Scope (§8)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§8 `APPROVAL_AUTHORIZATION_REGISTRY_SCOPE` 필수 필드 (원문 전사):

- `registry`
- `tenant` · `legal entity` · `organization`(+`subtree` 포함 여부)
- `subject type` / `actor type`
- `resource type` · `resource id`
- `action type`
- `decision definition`(+`version`) · `approval case type`
- `channel` · `client` · `environment`
- `amount min` / `amount max` · `currency`
- `effective`(유효기간) · `priority`
- **`specificity score`**(구체성 점수)
- **`exclusion scope`**(제외/Deny 스코프)

핵심 규칙 (원문): **가장 구체적(specificity 최고) Scope를 선택**하며, **Explicit Deny Scope가 우선**한다(§5.3). Scope는 Tenant→Legal Entity→Organization subtree→Resource→Action→Amount Range 축으로 좁혀지며 §43 Policy Resolution 우선순위의 입력이다.

의미: Registry Scope는 하나의 Registry/Policy가 **어느 테넌트·법인·조직 서브트리·리소스·액션·금액대·채널에 적용되는지**를 데이터로 한정하고, 중첩 시 specificity로 결정론적으로 하나를 고르며 exclusion(Deny) scope를 우선시키는 적용범위 선언체다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **선언적 Scope 구조체(specificity·exclusion·amount range·legal entity·org subtree)는 부재** — GROUND_TRUTH §1 **Registry Scope 계열 = ABSENT**(선언적 Default/Explicit Deny 선언체 부재 `TeamPermissions.php` idiom만).
- 실존하는 **행 필터(Row Scope) substrate** — GROUND_TRUTH의 가장 근접 자산:
  - **ABAC data_scope 행필터** = `TeamPermissions.php:236-322` — effectiveScope/scopeSql로 subject의 데이터 접근 범위(행 단위)를 SQL 술어로 산출·**DENY_SCOPE fail-closed**(`TeamPermissions.php:234`). 이는 실 scope 축이나 **Registry/Policy에 결속된 선언적 scope가 아니라 팀 ACL의 런타임 행 필터**다.
  - `subjectScope catch→null`(`TeamPermissions.php:211,224`) — ACL 조회실패 시 빈값, 상위 effectiveScope(`TeamPermissions.php:251`)의 DENY_SCOPE로 부분보완(조건부 fail-open).
- **Tenant 축 강제**(scope의 최상위 축) 실재 = `index.php:600` — 인증키 tenant_id로 X-Tenant-Id 무조건 덮어쓰기(cross-tenant 위조 원천차단)·strict no-tenant deny(`index.php:585-587` GENIE_STRICT_AUTH=1 opt-in). Legal Entity/Org subtree/Amount Range/Resource Version scope 축은 **no hits**.
- `specificity score`·`priority`·`exclusion scope`·`amount min/max`·`effective`(scope 유효기간) → **no hits**. 중첩 Policy 결정론적 선택 메커니즘 전무 → §43 Ambiguous Resolution 대비책 부재.
- **채널/조직 매핑 테이블**(scope 흡수 대상): `team_channel_mapping`(`Db.php:712`)·`plan_menu_access`(`AdminPlans.php:393`)·`wms_permissions`(`Wms.php:72,114`)·sub-admin 메뉴제한(`UserAuth.php:170,1433,1465-1489`·`AdminMenu.php:361`) — 부분 scope 축이나 분산·비선언·비버전.

## 3. 판정

- **Verdict: ABSENT** (선언적 Scope 구조체 부재). Tenant 축(`index.php:600`)·행 필터 축(`TeamPermissions.php:236-322`)은 **PARTIAL-substrate**로 흡수 대상.
- **선행 의존**: Scope는 §3.3 Governance(Legal Entity·Organization Hierarchy·Resource Version·Approval Definition Version)에 결속 — 이들 상당수 부재로 legal-entity/org-subtree/resource-version scope 축이 **BLOCKED_PREREQUISITE**. Tenant/행필터 축만 substrate PRESENT.
- **cover: 부분(Tenant 축·행 필터 축)** — Registry/Policy에 결속된 선언적 scope·specificity·exclusion·amount range는 **0**. `TeamPermissions` data_scope는 KEEP_SEPARATE 아닌 흡수 대상.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_registry_scope` — Tenant/Legal Entity/Org subtree/Resource/Action/Amount Range/Channel 축과 `specificity score`·`exclusion scope`를 데이터로 선언. **TeamPermissions data_scope 행필터(`TeamPermissions.php:236-322`)의 effectiveScope/scopeSql·DENY_SCOPE 패턴을 CANONICAL scope-evaluation 엔진으로 재사용**하되, scope는 그 상위에서 Registry/Policy에 결속(중복 필터 엔진 신설 금지).
- **Mandatory Control**: `specificity score`로 가장 구체적 scope 결정론적 선택 + **`exclusion scope`(Explicit Deny) 우선**(§5.3·§43) — 현재 중첩 정책 결정 메커니즘 부재로 Ambiguous Resolution 시 임의선택 위험. §43 원문대로 Ambiguous→INDETERMINATE/DENY + Gap 기록하도록 설계.
- **실위험**: ① `subjectScope catch→null`(`TeamPermissions.php:211,224`) 조건부 fail-open — scope 조회 실패를 "무제한"으로 오독할 수 있어 Registry `default deny enforced` scope로 fail-closed 통일(effectiveScope `TeamPermissions.php:251` DENY_SCOPE를 canonical 기본값으로 승격). ② Tenant 축(`index.php:600`)은 강제되나 amount range/resource version scope 부재로 고액 승인의 금액대 분기 불가 → Amount Range Scope 신설로 §5.6 Resource·Action 명시성 확보. 실 배선/수정은 후속 Part.

관련: [[DSAR_APPROVAL_AUTHORIZATION_REGISTRY]] · [[DSAR_APPROVAL_AUTHORIZATION_POLICY]] · [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
