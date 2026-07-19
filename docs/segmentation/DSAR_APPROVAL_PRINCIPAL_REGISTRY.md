# DSAR — Principal Registry (06-A-03-02-03-03 · §13)

> EPIC 06-A-03-02-03-03 · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §13.
> **★app_user·api_key는 principal source로 실재 — 상위표준화(KEEP·확장) 대상이지 부재가 아니다.**

## 1. 원문 전사 (Canonical Contract)

§13 PRINCIPAL_REGISTRY 필수 필드 (원문 전사):
- `principal id` · `tenant` · `type`
- `provider id` · `provider subject id` · `canonical subject id` · `account id` · `client id` · `service account id`
- `assurance profile` · `last_verified_at` · `expires_at`

Principal Type enum(원문 전사·12종): `USER_ACCOUNT` / `EXTERNAL_IDENTITY` / `SERVICE_PRINCIPAL` / `API_CLIENT` / `SYSTEM_PROCESS` / `WORKFLOW_ENGINE` / `ERP_INTEGRATION` / `MOBILE_APPLICATION` / `WEB_APPLICATION` / `SUPPORT_OPERATOR` / `ADMINISTRATOR` / `CUSTOM`.

**원문 제약**: `Provider Subject ID는 Tenant+Provider Scope 내 Unique.`

의미: Principal Registry는 **인증된 주체(Principal)를 provider·provider subject·canonical subject·account·client·service account로 연결**하는 등록소다. §5.1(Principal≠Actor)·§5.2(Account≠Person)의 하부 저장소로, 로그인 주체가 어느 canonical subject에 귀속되는지를 결정한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **통합 Principal Registry(provider subject id·canonical subject id 연결)는 부재** — 여러 인증 소스가 **산재**하며 하나의 principal 표준으로 정규화되지 않음.
- 실존하는 **principal source substrate**(등록소 아님·상위표준화 대상):
  - **app_user(USER_ACCOUNT source)** — `UserAuth.php:229-264`(user_session JOIN app_user WHERE token AND expires_at>now AND is_active=1)·`Db.php:942`. 단일 User 저장소. 원문 **#1 `USER_ACCOUNT`**의 provider subject.
  - **api_key(API_CLIENT/SERVICE_PRINCIPAL source)** — `Db.php:942-955`(sha256 저장·role·scopes_json·expires_at·idx_api_key_tenant)·발급 `UserAuth.php:4240-4246`·인증 `index.php:483-493`. 원문 **#4 `API_CLIENT`**/**#3 `SERVICE_PRINCIPAL`**. `expires_at`은 §13 `expires_at`에 부분 대응.
  - **SSO IdP(EXTERNAL_IDENTITY source)** — OIDC `EnterpriseAuth.php:206-244`(id_token subject)·SAML `:247-298`(assertion subject)·SCIM `:315-434`. 원문 **#2 `EXTERNAL_IDENTITY`**의 provider subject id 재료가 실재(IdP subject).
  - **tenant/role/key 주입** — `index.php:417,437`(auth_tenant)·`:100,418,441`(auth_role/key). api_key 행에서 위조불가 주입 = principal tenant 재료.
- `principal id`(통합)·`provider subject id`(정규화)·`canonical subject id` 연결·`assurance profile`·`last_verified_at` → **no hits**. **Tenant+Provider Scope 내 Provider Subject Unique 제약** → 미선언.
- **계정 상태**: `UserAuth.php:248,260`(`is_active=1`)만 — active/비활성만·locked/disabled 세분 없음.

## 3. 판정 (Verdict)

- Verdict: **PARTIAL (PRESENT-substrate)** — app_user·api_key·SSO IdP가 각각 principal source로 **실재**하나, provider subject id를 canonical subject id로 연결하는 **통합 Principal Registry·정규화·Unique 제약 부재**.
- 선행 의존: Principal의 `canonical subject id` 연결은 §14 Canonical Subject Binding(별도 문서·PARTIAL)에 종속. 승인 결합(어느 principal이 어느 Decision을 냈나)은 §3.3 Decision Foundation 부재로 **BLOCKED_PREREQUISITE**.
- cover: **부분** — 12종 중 USER_ACCOUNT·API_CLIENT/SERVICE_PRINCIPAL·EXTERNAL_IDENTITY 3계열이 source substrate로 실재(위 §2), 나머지(SYSTEM_PROCESS/WORKFLOW_ENGINE/ERP_INTEGRATION/MOBILE/WEB/SUPPORT_OPERATOR/ADMINISTRATOR)는 미분류. `provider subject id`·`canonical subject id`·`assurance profile` 필드는 부재.

## 4. 확장/구현 방향 (설계)

- 순신규 `principal_registry` — **app_user/api_key/SSO IdP를 principal source로 상위표준화**(KEEP·확장). 각 source의 provider(local/oidc/saml)·provider subject id(email/key id/IdP sub)를 `principal id`로 정규화하고 `canonical subject id`(§14)로 연결.
- **Golden Rule=Extend**: 기존 저장소를 **삭제·재구현 금지**. `UserAuth::userByToken`(`UserAuth.php:229-264`)·api_key 조회(`index.php:483-493`)·SSO subject 도출(`EnterpriseAuth.php:206-298`)을 Principal Registry의 provider adapter로 재사용. 중복 User/Session 저장소 신설 금지(§67).
- **Mandatory Control(원문)**: `Provider Subject ID는 Tenant+Provider Scope 내 Unique` 제약을 인덱스로 강제. 계정 상태를 `is_active`(`UserAuth.php:248,260`)에서 locked/disabled/suspended/terminated 세분으로 확장(§63 Guard 대상).
- **실위험**: principal 정규화 부재로 동일 사람이 로컬 계정·SSO·api_key로 **다중 principal**을 가지되 canonical subject로 묶이지 않음 → 중복 Identity SoT(§61) 위험. Principal Registry가 provider subject를 canonical subject로 fan-in하여 이를 해소. **assurance profile**은 §12 Level Model 참조(선행 필요).

관련: [[DSAR_APPROVAL_CANONICAL_SUBJECT_BINDING]] · [[DSAR_APPROVAL_ACTOR_TYPE_REGISTRY]] · [[DSAR_APPROVAL_ACTOR_IDENTITY_PROFILE]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
