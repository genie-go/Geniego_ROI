# CANONICAL DSAR — Authorization Foundation (Subject·Resource·Action·Permission·Role·Attribute·Scope·Context)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Subject/Resource/Action/Permission/Role/Attribute/Scope/Context) + [`CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md`](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md)(Policy/Version/Rule/Condition/Decision/Obligation/Conflict/Reconciliation/Lint/Guard/기존구현 분류).
> ADR: [`../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md`](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md).
> 선행: Rebate Program Master(4-5-3-1-1)·Type(1-2)·Funding(1-3)·**Lifecycle/Version(1-4 §18 Approval Reference·Enforcement Hook 위임 수령)**.
> **범위**: Authorization **Foundation**만 — 상세 Role/Org/Scope Governance=**5-2**·Approval Workflow=**5-3**·Maker-Checker/Delegation=**5-4**·Break Glass/JIT=**5-5**·Runtime Enforcement/PDP 인프라=**5-6**·Audit/Access Review=**5-7**·Lint/Golden/Certification=**5-8**. **중복 구현 금지·Reference Contract만 준비.**

---

## 0. 실측 요약 — ★이 도메인은 "부재"가 아니라 "존재·분산"이다

**앞선 Rebate 파트(1-1~1-4)와 결정적으로 다르다.** Rebate 엔진은 grep 0(부재)이었으나, **Authorization 은 실 구현이 대량 존재**한다. 따라서 본 블록의 정직한 성격은 **신설이 아니라 통합(Canonical Foundation 승격)**이다.

| 스펙 요구(§6 Canonical Entity) | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **AUTHORIZATION_ACTION** | ✅ **REAL** — `TeamPermissions::ACTIONS = ['view','create','update','delete','approve','export','execute','manage']`(**8종**·[TeamPermissions.php:39](../../backend/src/Handlers/TeamPermissions.php)) | **VALIDATED_LEGACY → 재사용·확장**(Rebate Action 등록) |
| **AUTHORIZATION_SCOPE** | ✅ **REAL** — `TeamPermissions::DATA_SCOPES = ['company','brand','team','campaign','product','channel','warehouse','partner','own']`(**9 Dimension**·[:41](../../backend/src/Handlers/TeamPermissions.php)) + `TEAM_TYPES`(:44) | **VALIDATED_LEGACY → 재사용·확장**(legal_entity/environment/provider_account 추가) |
| **AUTHORIZATION_PERMISSION** | ✅ **REAL** — **`acl_permission` = 메뉴 × 8동작 매트릭스**(TeamPermissions.php:15) | **VALIDATED_LEGACY → 재사용**(Rebate Resource×Action 등록) |
| **AUTHORIZATION_ROLE** | ✅ **REAL 3계통** — ①`team_role`(**owner > manager > member**·TeamPermissions.php:17·team 엔터티+manager_user_id) ②**api_key `role`**(`$roleRank = ['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]`·[index.php:554](../../backend/public/index.php)) ③admin **master/sub**(`requireMasterAdmin2` 5핸들러·`requireSubAdminMenu`) | **CONSOLIDATION_REQUIRED**(3 Role 체계 병존·§51) |
| **AUTHORIZATION_SUBJECT** | ✅ **REAL 다계통** — app_user(team_role/parent_user_id/tenant_id·TeamPermissions.php:13) · **api_key**(tenant_id·key_prefix·**key_hash SHA-256**·role·**scopes_json**·is_active·**expires_at**·use_count·[Db.php:942-955](../../backend/src/Db.php)) · agency token(`agt_`·index.php:97-100) · partner_session(index.php:196) | **CONSOLIDATION_REQUIRED → Canonical Subject 승격** |
| **Permission Scope(OAuth류)** | ✅ **REAL** — `scopes_json`: **`admin:keys`·`write:*`·`write:ingest`**(index.php:554-575) · **★192차 보안 P0**: `/api` 별칭 우회로 일반 write 키가 admin 키 발급하던 **권한상승 차단**(:562-567) | **VALIDATED_LEGACY → 재사용** |
| **AUTHORIZATION_POLICY(중앙)** | △ **부분 REAL** — **`PlanPolicy`**(`const RANK` 플랜 위계 · **기능키 → 최소 요구 플랜 매핑**·[PlanPolicy.php:16-24](../../backend/src/PlanPolicy.php)) = **유일한 중앙 정책 클래스** | **VALIDATED_LEGACY → Policy Registry 기반** |
| **Tenant Isolation(§4.5)** | ✅ **REAL** — `auth_tenant` 주입(index.php) · **`authedTenant` 세션 해석 64 핸들러** · `tenant_id=?` row-level 전역 · action_request **IDOR 차단**(Alerting.php:580-582·208차 P0) | **VALIDATED_LEGACY(강력) → 재사용** |
| **Environment Isolation(§4.6)** | △ GENIE_ENV/IS_DEMO · **`Db::envLabel()`**(278차 트랩: `Db::env()`는 데모에서도 production 반환) | **재사용 + ★Production/Sandbox 권한 분리는 부재(신설)** |
| **Authentication(≠Authorization·§4.7)** | ✅ **REAL** — UserAuth(세션 `genie_token`) · **MFA `mfa_policy`**(UserAuth) · **EnterpriseAuth(SAML/OIDC/SCIM)** · OAuth.php | **KEEP_SEPARATE**(인증≠인가·§4.7 정합) |
| **Field Masking** | △ **REAL·산재** — AttributionEngine · ChannelCreds · UserAuth 등 **개별 구현** | **CONSOLIDATION_REQUIRED**(Field Access Profile 부재) |
| **Impersonation** | ✅ **REAL** — UserAdmin(회원 세션 대행)·routes.php · **★286차 사고**: platform_growth act-as 전역 tenant 하이재킹(자동ON+localStorage 고착→전 메뉴 공백) | **VALIDATED_LEGACY + 위험 이력** → 상세=**5-4** |
| **Break Glass / Emergency Access** | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 5-5** |
| **Access Review** | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 5-7** |
| **★중앙 Policy Decision Point(PDP)** | ❌ **부재(grep 0)** — 판정이 **미들웨어 1 + 핸들러 N 으로 분산** | **NOT_APPLICABLE → 5-6**(본 블록=Decision **Contract** 만) |
| **Authorization Decision 기록** | ❌ **부재** — 판정 근거/Policy Version/Reason 을 남기는 구조 없음 | **NOT_APPLICABLE → 신설(§29)** |
| **Policy Version / Immutable Hash** | ❌ **부재** | **NOT_APPLICABLE → 신설** |
| **ABAC Context**(device trust·network zone·risk score·session age) | ❌ **부재** | **NOT_APPLICABLE → 신설(§27)** |

**★결론(정직)**: **Authorization 은 부재가 아니라 "존재하되 분산·비통합"**. **VALIDATED_LEGACY 6종**(TeamPermissions ACTIONS/DATA_SCOPES/acl_permission · api_key RBAC+scopes · PlanPolicy · tenant isolation)을 **Canonical Foundation 으로 승격·통합**하고, **부재 5종**(중앙 PDP · Decision 기록 · Policy Version · ABAC Context · Field Access Profile)만 신설한다. **★새 IAM 프레임워크 신설 금지**(§51 · 헌법 Golden Rule=Extend).

### ★인접 관찰 — 실측된 구조적 위험 3건 (본 세션 코드변경 0·근거 기록만)

1. **[관찰] 인가 판정이 100+ 지점에 분산 — 중앙 PDP 부재**: `authedTenant` **64 핸들러** · `requirePro/requirePlan` **56 핸들러(호출부 351개**·UserAuth.php:329 주석) · `requireMasterAdmin2` **5 핸들러** · api_key 미들웨어 1(index.php). **§4.8(UI·API 동일 Decision Contract)의 구조적 위험** — 한 곳을 고쳐도 나머지가 남는다. 실제로 **275차에 "헤더리스 getJson 4페이지 401 회귀"가 2차 재발**해 `tools/guard_headerless_getjson.mjs` CI 가드로 클래스 제거한 이력이 있다. → **5-6(Runtime Authorization·PDP 인프라)에서 통합**.
2. **[관찰·미확정] `PlanPolicy` ↔ 프론트 `planMenuPolicy.js` 수동 동기화**: 코드 주석이 명시 — **"프론트 PLAN_TIER_RANK / MENU_MIN_PLAN 과 정합 유지(변경 시 양쪽 동시 갱신)"**(PlanPolicy.php:14). **UI·API 권한이 별도 소스로 관리**되어 §4.8 위반 위험(드리프트 시 UI 허용/API 거부 또는 그 반대). **286차에 rank 맵이 starter=growth=pro=1 로 붕괴**해 requirePro 가 사실상 'starter+'로 동작하던 실 사고(UserAuth.php:330) → **Reconciliation(UI_API_MISMATCH·§41) 대상**.
3. **[관찰·미확정] `team_role` fail-open**: **"fail-open: team_role 미설정=레거시 단독회원=owner"**(AdminMenu.php:52-54) — 속성 부재 시 **최고 권한으로 해석**. **§4.1 Deny-by-default 와 상충**하나, 레거시 단독회원 호환을 위한 **의도적 설계**로 보인다. **FP 레지스트리 규약상 PM 코드 재증명 전 P0 단정 금지** · 본 세션 비파괴 미수정 → **5-2(Role/Org Governance)에서 정책 판정**(`MIGRATION_REQUIRED` 후보).

---

## 1. Canonical Entity (28) — §6

AUTHORIZATION_SUBJECT · SUBJECT_BINDING · RESOURCE · RESOURCE_TYPE · ACTION · PERMISSION · ROLE · ROLE_PERMISSION · SUBJECT_ROLE · ATTRIBUTE · ATTRIBUTE_VALUE · POLICY · POLICY_VERSION · POLICY_RULE · POLICY_CONDITION · POLICY_EFFECT · SCOPE · SCOPE_BINDING · CONTEXT · REQUEST · DECISION · DECISION_REASON · POLICY_CONFLICT · PERMISSION_CANDIDATE · RECONCILIATION · EVIDENCE · AUDIT_EVENT.
**본 문서**=Subject/Binding/Resource/Type/Action/Permission/Role/Role-Permission/Subject-Role/Attribute/Value/Scope/Binding/Context. **짝 문서**=Policy/Version/Rule/Condition/Effect/Request/Decision/Reason/Conflict/Candidate/Reconciliation/Evidence/Audit/Lint/Guard/분류.
**★Rebate 전용 Entity 복제 금지** — 공통 Authorization Foundation 을 구축한 뒤 **Rebate Resource·Action·Policy 를 등록**(§6 스펙 명시).

## 2. Subject (§7) · Binding (§8) ★인증≠인가

- **Subject(§7)**: authorization_subject_id · canonical_identity_id · **subject_type** · tenant_id · organization_id · workspace_ids · legal_entity_ids · home_country · employment_status_reference · **authentication_assurance_level · MFA_status_reference · risk_profile_reference · data_clearance_level · financial_clearance_level · contract_access_level** · active · valid_from/to · status · evidence.
- **Subject Type(21)**: USER · CUSTOMER_ADMIN · TENANT_ADMIN · WORKSPACE_ADMIN · ORGANIZATION_MEMBER · EMPLOYEE · CONTRACTOR · PARTNER_USER · VENDOR_USER · MERCHANT_USER · AUDITOR · SUPPORT_AGENT · **SERVICE_ACCOUNT** · **MACHINE_IDENTITY** · **API_CLIENT** · OAUTH_CLIENT · WORKLOAD_IDENTITY · AUTOMATION_AGENT · SYSTEM_PROCESS · EMERGENCY_OPERATOR · OTHER.
- **★현행 매핑(CONSOLIDATION_REQUIRED)**: USER/TENANT_ADMIN=`app_user`(tenant_id·parent_user_id·**team_role**·team_name·TeamPermissions.php:13) · **API_CLIENT=`api_key`**(tenant_id·key_prefix·**key_hash SHA-256**·role·scopes_json·is_active·**expires_at**·use_count·Db.php:942-955) · PARTNER_USER=`partner_session`(index.php:196) · (대행사)=`agt_` 토큰(**서버바인딩 tenant 주입·위조불가**·index.php:97-100). → **4계통을 Canonical Subject 로 통합**(중복 Identity Store 신설 금지).
- **Binding(§8)**: subject_binding_id · authorization_subject_id · **binding_type**(Tenant/Workspace/Team/Department/Organization/Legal Entity/Brand/Store/Merchant/Vendor/Partner/Country/Region/**Environment**/**Provider Account**/Contract/**Rebate Program**) · canonical_entity_id · binding_role · source · primary · inherited · valid_from/to · status · evidence.
**★§4.7 Authentication≠Authorization** — 현행 인증(UserAuth 세션·MFA·EnterpriseAuth SAML/OIDC/SCIM·OAuth)은 **KEEP_SEPARATE**. **로그인 성공/유효 토큰만으로 Rebate Resource 접근 허용 금지**.

## 3. Resource Type (§9) · Resource (§10)

- **Rebate Resource Type(40)**: **Program Foundation**(REBATE_PROGRAM·PROGRAM_VERSION·PROGRAM_SCOPE·CLASSIFICATION·LIFECYCLE·CHANGE_SET·MIGRATION) · **Funding·Financial**(SPONSOR·FUNDING_PARTY·FUNDING_AGREEMENT·FUNDING_ALLOCATION·FUNDING_COMMITMENT·BUDGET·LIABILITY·ACCOUNTING_REFERENCE) · **Operational**(RULE·ELIGIBILITY·CLAIM·CLAIM_EVIDENCE·ACCRUAL·APPROVAL·SETTLEMENT·CREDIT_MEMO·DEBIT_MEMO·PAYOUT·RECOVERY·DISPUTE) · **Infrastructure**(PROVIDER·PROVIDER_ACCOUNT·CREDENTIAL_REFERENCE·EXPORT·REPORT·AUDIT·POLICY·FEATURE_FLAG·INCIDENT).
- **Resource(§10)**: authorization_resource_id · resource_type · canonical_resource_id · **tenant_id · workspace_id · organization_id · brand_id · store_id · merchant_id · vendor_id · partner_id · legal_entity_id · country · region · environment · provider_id · provider_account_id · rebate_program_id · rebate_program_version_id · contract_reference · data_classification · financial_sensitivity · PII_sensitivity · operational_criticality** · status · valid_from/to · evidence.
**★Resource Attribute 는 실 Canonical Entity 에서 파생하되 Decision 시점 Snapshot 생성**(현재 값으로 과거 Decision 근거 덮어쓰기 금지·4-5-3-1-4 §38 Historical Binding 정합).
**현행 인접**: 메뉴 단위 권한(`acl_permission` 메뉴×동작)은 **Resource≈메뉴** 수준 → **Rebate 는 Resource Type 40 + Instance Level 필요**(§13 Granularity).

## 4. Action Registry (§11) ★현행 8동작 확장

- **★현행 정본 재사용**: `TeamPermissions::ACTIONS = ['view','create','update','delete','approve','export','execute','manage']`(**8종**·TeamPermissions.php:39) — **Canonical Action 의 기반**.
- **Canonical Action(확장)**: **공통**(DISCOVER·LIST·SEARCH·**READ**(≈view)·READ_METADATA·READ_DETAIL·**CREATE**·**UPDATE**·**DELETE**·ARCHIVE·RESTORE·DUPLICATE·**EXPORT**·IMPORT·SYNC) · **Program**(CONFIGURE·VALIDATE·SUBMIT_FOR_REVIEW·SUBMIT_FOR_APPROVAL·**APPROVE**·REJECT·SCHEDULE·ACTIVATE·PAUSE·RESUME·SUSPEND·**EMERGENCY_DISABLE**·TERMINATE·SUPERSEDE) · **Version·Migration**(CREATE_VERSION·UPDATE_DRAFT_VERSION·COMPARE_VERSION·APPROVE_VERSION·ROLLBACK_VERSION·CREATE_MIGRATION·**EXECUTE_MIGRATION**·VALIDATE_MIGRATION·ROLLBACK_MIGRATION) · **Funding·Finance**(VIEW_FUNDING·MANAGE_FUNDING·CHANGE_ALLOCATION·COMMIT_BUDGET·RESERVE_FUNDING·RELEASE_FUNDING·VIEW_LIABILITY·POST_ACCOUNTING_REFERENCE·ISSUE_CREDIT_MEMO·ISSUE_DEBIT_MEMO) · **Claim·Settlement·Payout**(VIEW_CLAIM·MANAGE_CLAIM·**VIEW_CLAIM_EVIDENCE**·APPROVE_CLAIM·REJECT_CLAIM·VIEW_ACCRUAL·ADJUST_ACCRUAL·VIEW_SETTLEMENT·APPROVE_SETTLEMENT·**EXECUTE_SETTLEMENT**·VIEW_PAYOUT·**APPROVE_PAYOUT**·**EXECUTE_PAYOUT**·RETRY_PAYOUT·REVERSE_PAYOUT) · **Security·Audit**(VIEW_AUDIT·EXPORT_AUDIT·MANAGE_POLICY·ASSIGN_ROLE·REVOKE_ROLE·VIEW_ACCESS·REVIEW_ACCESS·**VIEW_CREDENTIAL_METADATA**·**USE_PROVIDER_CREDENTIAL**·**ROTATE_CREDENTIAL**·IMPERSONATE·**BREAK_GLASS**).
**★APPROVE 와 EXECUTE 를 서로 다른 Action 으로 분리**(§43 "Financial Approval Permission 과 Execution Permission 결합"=Critical) — 현행 8동작에 `approve`·`execute` 가 **이미 분리**되어 있음(재사용 근거).

## 5. Permission (§12) · Granularity (§13) · Field Access (§14)

- **Permission(§12)**: authorization_permission_id · **permission_code · resource_type · action · scope_template · condition_template · field_access_profile · default_effect · risk_level · production_restricted · financial_approval_required · PII_clearance_required · MFA_required · deprecated** · valid_from/to · version · status · evidence. **Code 예**: `REBATE_PROGRAM_READ`·`REBATE_PROGRAM_ACTIVATE`·`REBATE_FUNDING_MANAGE`·`REBATE_CLAIM_EVIDENCE_READ`·`REBATE_PAYOUT_APPROVE`·`REBATE_PAYOUT_EXECUTE`·`REBATE_AUDIT_EXPORT`·`REBATE_PROVIDER_CREDENTIAL_USE`.
- **★현행 정본**: `acl_permission` = **메뉴 × 8동작 매트릭스**(TeamPermissions.php:15) → **Rebate Resource Type 40 × Action 을 동일 매트릭스에 등록**(중복 Permission Store 신설 금지). 기존 **scopes_json**(`admin:keys`/`write:*`/`write:ingest`)은 **API_CLIENT 용 Permission Bundle** 로 병행 유지(KEEP_SEPARATE).
- **Granularity(§13, 20)**: Resource Type · **Resource Instance** · Tenant · Workspace · **Program** · **Program Version** · Brand · Store · Merchant · Vendor · Country · Region · **Legal Entity** · **Environment** · **Provider Account** · Contract · **Financial Threshold** · **Field** · **Row** · Operation. **현행**: Tenant(REAL·전역 `tenant_id=?`) · Row(REAL) · 메뉴 Operation(REAL) → **Instance/Program/Legal Entity/Environment/Provider Account/Financial Threshold/Field = 신설**.
- **★Field Access Profile(§14)**: 대상(22) = Customer/Beneficiary/Claimant Identity · Email · Phone · Address · **Tax Identifier Reference** · **Bank Destination Reference** · Payout Recipient · Claim Evidence · **Contract Commercial Terms** · **Funding Percentage/Amount** · Accrual/Liability/Settlement/**Payout Amount** · Fraud Reference · Internal Risk Score · **Credential Metadata** · Audit Actor · Security Incident Reference. **Access Level(8)**: NONE · **MASKED** · **TOKENIZED_REFERENCE** · SUMMARY_ONLY · PARTIAL · FULL · EXPORT_RESTRICTED · APPROVAL_REQUIRED. **★현행 Field Masking 은 산재**(AttributionEngine·ChannelCreds·UserAuth 개별 구현) → **CONSOLIDATION_REQUIRED**(단일 Profile 로 통합·중복 Masking Engine 금지). **Sensitive Field 기본=MASKED 또는 TOKENIZED_REFERENCE**.

## 6. Role (§15·§16) · Role-Permission (§17) · Subject-Role (§18)

- **Role(§15)**: authorization_role_id · **role_code · role_name · role_category · system_defined · custom_role · tenant_id · organization_id · default_scope · privilege_level · sensitive_role · production_role · assignable · delegable · approval_required** · valid_from/to · version · status · evidence. **Category(16)**: SYSTEM·PLATFORM·TENANT·WORKSPACE·ORGANIZATION·FINANCE·OPERATIONS·PROGRAM·CLAIM·SETTLEMENT·PAYOUT·AUDIT·SECURITY·SUPPORT·PROVIDER·CUSTOM.
- **★현행 Role 3계통(CONSOLIDATION_REQUIRED·§51)**: ①**`team_role`**(owner>manager>member·TeamPermissions.php:17·**fail-open 관찰 §0-3**) ②**api_key `role`**(viewer0<connector1<analyst2<admin3·index.php:554) ③**admin master/sub**(`requireMasterAdmin2` 5핸들러·`requireSubAdminMenu`·286차 스코프 강제). → **Canonical Role 로 통합하되 3계통의 실효 동작 보존(Legacy Equivalence·5-8)**.
- **Rebate Role 후보(24)**: REBATE_VIEWER·ANALYST·PROGRAM_EDITOR·PROGRAM_MANAGER·**PROGRAM_APPROVER**·FUNDING_ANALYST·FUNDING_MANAGER·FINANCE_REVIEWER·CLAIM_ANALYST·**CLAIM_APPROVER**·SETTLEMENT_ANALYST·**SETTLEMENT_APPROVER**·**PAYOUT_OPERATOR**·**PAYOUT_APPROVER**·ACCOUNTING_OPERATOR·AUDITOR·SECURITY_ADMIN·ACCESS_ADMIN·SUPPORT_AGENT·MIGRATION_OPERATOR·INCIDENT_RESPONDER·READ_ONLY_ADMIN·TENANT_ADMIN·PLATFORM_ADMIN. **★Role 이름으로 권한 하드코딩 금지 — Role-Permission Binding 사용**(§44 Lint).
- **Role-Permission(§17)**: role_permission_id · role_id · permission_id · **effect · scope_limitation · condition_reference · field_access_profile · inherited · inherited_from_role** · valid_from/to · status · evidence. **Role Inheritance 는 제한적 지원·순환 관계 차단**.
- **Subject-Role(§18)**: subject_role_id · authorization_subject_id · role_id · **tenant_id · workspace_id · organization_id · legal_entity_id · environment · program_scope · provider_account_scope · assigned_by · assignment_reason · approval_reference** · valid_from/to · status · evidence. **상세 Assignment/Delegation/JIT = 5-4·5-5**.
**★§4.9 Role≠Scope** — `REBATE_PROGRAM_MANAGER` 를 보유해도 **허용된 Tenant·Workspace·Brand·Country·Legal Entity·Program Scope 에서만** 권한 행사.

## 7. Attribute (§19·§20) · Scope (§25·§26) · Context (§27)

- **Attribute(§19)**: **Subject**(subject_type·tenant_id·workspace_ids·organization_id·team_id·department_id·legal_entity_ids·country·employment_status·**clearance_level·financial_clearance·PII_clearance·authentication_assurance·MFA_state·risk_score·session_age·device_trust·network_zone**) · **Resource**(tenant_id·workspace_id·brand_id·merchant_id·vendor_id·legal_entity_id·country·region·environment·**program_status·program_version_status·funding_amount·payout_amount·data_classification·financial_sensitivity·PII_sensitivity**·provider_account·contract_type) · **Context**(request_time·request_channel·source_ip_zone·device_posture·authentication_time·risk_level·incident_state·change_window·approval_state·emergency_state·**requested_amount·export_volume**).
- **Attribute Value(§20)**: attribute_value_id · attribute_id · subject/resource/context reference · value · value_type · **source · source_timestamp · freshness · confidence** · effective_from/to · evidence. **★Stale Attribute 로 고위험 Decision 금지**(헌법 Vol3 Trust READY 정합·4-5-3-1-5 §28 comp_max_age_hours 패턴 계승).
- **★현행 실측**: Subject Attribute 중 **tenant_id/team_role/plan 은 REAL**(app_user·api_key) · **MFA_state REAL**(mfa_policy) · **clearance/risk_score/device_trust/network_zone/session_age = 부재(신설)**.
- **Scope(§25, 24 Dimension)**: TENANT·WORKSPACE·ORGANIZATION·TEAM·DEPARTMENT·**BRAND**·STORE·MERCHANT·SELLER·VENDOR·**PARTNER**·**LEGAL_ENTITY**·**PROGRAM**·**PROGRAM_VERSION**·CONTRACT·COUNTRY·REGION·**ENVIRONMENT**·PROVIDER·**PROVIDER_ACCOUNT**·DATA_CLASSIFICATION·**FINANCIAL_THRESHOLD**·FIELD·CUSTOM. **★현행 정본 재사용**: `TeamPermissions::DATA_SCOPES = ['company','brand','team','campaign','product','channel','warehouse','partner','own']`(**9종 REAL**·:41) → **legal_entity·environment·provider_account·program·financial_threshold·field 추가**(기존 9종 의미 변경 금지).
- **Scope Binding(§26)**: scope_binding_id · **binding_target_type**(Subject/Role/Permission/Policy/Resource) · binding_target_id · authorization_scope · effect · priority · inherited_from · override · valid_from/to · status · evidence.
- **Context(§27)**: authorization_context_id · **request_id · session_id · correlation_id** · tenant_id · workspace_id · environment · request_channel · source_network_zone · device_trust · **authentication_assurance · MFA_state** · current_risk_level · incident_state · request_time · timezone · **requested_financial_amount · export_row_estimate** · approval_reference · emergency_reference · feature_flag_reference · evidence. **★현행 부재(신설)** — 세션/MFA 는 REAL 이나 device/network/risk/incident/amount 는 Context 로 수집되지 않음.

## 8. Permission Matrix (§54) — 현행

| Role(현행) | Resource | Action | Tenant Scope | Legal Entity | Environment | Field Access | Effect | 근거 |
|---|---|---|---|---|---|---|---|---|
| (Rebate Role 24) | Rebate Resource 40 | Action(확장) | — | — | — | — | — | **NOT_APPLICABLE(등록 대상)** |
| **team_role**(owner/manager/member) | 메뉴 | **8동작**(view/create/update/delete/approve/export/execute/manage) | tenant_id | **부재** | **부재** | **부재** | acl_permission | TeamPermissions.php:15/17/39 |
| **api_key role**(viewer/connector/analyst/admin) | API 경로 | HTTP method + **scopes**(admin:keys·write:*·write:ingest) | tenant_id(주입) | **부재** | **부재** | **부재** | rank/scope 게이트 | index.php:554-575 |
| **admin master/sub** | admin 메뉴 | 부여/요금/DB/쿠폰 | 전역 | **부재** | **부재** | **부재** | requireMasterAdmin2/requireSubAdminMenu | 286차 |
| **plan gate** | 기능키 | requirePro/requirePlan(호출부 = **실측**: `node tools/measure_authz_surface.mjs` · ~~351~~ **289차 stale**) | tenant | **부재** | 데모 면제 | **부재** | PlanPolicy::RANK | UserAuth.php:327-345 · PlanPolicy.php:19-24 · [측정 SSOT](./AUTHZ_SURFACE_MEASUREMENT_SSOT.md) |
| (DATA_SCOPES 9종) | — | — | company/brand/team/campaign/product/channel/warehouse/partner/own | — | — | — | — | TeamPermissions.php:41 |
