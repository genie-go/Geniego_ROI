# CANONICAL DSAR — Authorization Policy & Decision (Policy·Version·Rule·Condition·Request·Decision·Obligation·Conflict·Reconciliation·Lint/Guard·기존구현 분류)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md`](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md)(Subject/Resource/Action/Permission/Role/Attribute/Scope/Context) + 본 문서.
> ADR: [`../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md`](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md).
> **범위**: Policy·Decision **Contract** 만 — 실 PDP/PEP 인프라=**5-6** · Audit/Access Review=**5-7** · 전체 Lint/Golden/Certification=**5-8**(본 블록은 **최소** Lint/Guard 계약만).

---

## 0. 실측 요약 — Policy·Decision 계층

| 스펙 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **중앙 Policy 클래스** | △ **부분 REAL** — **`PlanPolicy`**(`const RANK` 플랜 위계 · **기능키 → 최소 요구 플랜 매핑**·[PlanPolicy.php:16-24](../../backend/src/PlanPolicy.php)·`rank()` :41) | **VALIDATED_LEGACY → Policy Registry 기반(재사용)** |
| **Deny-by-default(§4.1)** | ✅ **부분 REAL** — api_key 미들웨어: 공개 bypass 목록 외 **전 경로 Bearer 필수**(index.php) · 미달 시 403 | **재사용** · **★핸들러 self-auth 경로는 개별 확인 필요(5-6)** |
| **Explicit Deny 우선(§4.2)** | ❌ **부재** — Allow/Deny 충돌 개념 없음(단일 게이트 통과/차단) | **NOT_APPLICABLE → 신설(§33)** |
| **Scope 게이트** | ✅ **REAL** — `admin:keys`(/v421/keys) · `write:*` · `write:ingest` + rank fallback([index.php:562-575](../../backend/public/index.php)) · **★192차 보안 P0**: `/api` 별칭 우회 차단(권한상승) | **VALIDATED_LEGACY → 재사용** |
| **Tenant Isolation** | ✅ **REAL(강력)** — `auth_tenant` 서버 주입(위조불가·index.php:97-100) · `authedTenant` **64 핸들러** · `tenant_id=?` row-level · **IDOR 차단**(action_request·Alerting.php:580-582·208차 P0) | **VALIDATED_LEGACY → 재사용** |
| **Policy Version / Immutable Hash** | ❌ **부재** | **NOT_APPLICABLE → 신설(§22)** |
| **Authorization Decision 기록** | ❌ **부재** — 판정 근거·Policy Version·Reason 미기록 | **NOT_APPLICABLE → 신설(§29)** |
| **Obligation**(masking·row limit·step-up·approval) | ❌ **부재** | **NOT_APPLICABLE → 신설(§30)** |
| **Policy Conflict 해소** | ❌ **부재** | **NOT_APPLICABLE → 신설(§33)** |
| **★중앙 PDP / PEP 분리** | ❌ **부재** — PDP·PEP 혼재 · 판정 **100+ 지점 분산**(authedTenant 64 · requirePro/requirePlan 56(호출부 **351**) · requireMasterAdmin2 5 · 미들웨어 1) | **NOT_APPLICABLE → 5-6**(본 블록=Contract만) |
| **UI·API 권한 일관성(§4.8)** | △ **위험** — **`PlanPolicy` ↔ 프론트 `planMenuPolicy.js` 수동 동기화**("변경 시 양쪽 동시 갱신"·PlanPolicy.php:14) | **★Reconciliation 대상(UI_API_MISMATCH)** |
| **Authorization Reconciliation** | ❌ **부재** | **NOT_APPLICABLE → 신설(§41)** |
| **CI 가드(인가 회귀)** | ✅ **REAL(선례)** — `tools/guard_headerless_getjson.mjs`(**275차: 헤더리스 getJson 401 회귀 2차 재발 → CI 가드로 클래스 제거**) · `npm run e2e` smoke(266차) | **재사용(§44 Lint 기반)** |

**★결론(정직)**: **Policy·Decision 계층은 대부분 부재**(Foundation 계층이 REAL 이었던 것과 대조). 특히 **중앙 PDP·Decision 기록·Policy Version·Obligation·Conflict·Reconciliation 전무**. 실 인접=`PlanPolicy`(유일한 중앙 정책 클래스)·scope 게이트·tenant isolation·CI 가드 선례. **★본 블록은 Contract 만 — 실 PDP 구현은 5-6**(중복 구현 금지).

---

## 1. Authorization 모델 조합 (§5) ★경쟁 아닌 조합

- **RBAC**: Role→Permission→Subject. **현행 REAL**: team_role(owner/manager/member) · api_key role(viewer<connector<analyst<admin) · admin master/sub.
- **ABAC**: Subject·Resource·Environment·Context 속성 평가. **현행 부분 REAL**: tenant_id 일치(REAL) · plan rank(REAL) · **legal_entity/country/device/risk/session_age = 부재**.
- **PBAC**: 중앙 Policy 가 Role·Attribute·Context·Risk 를 조합. **현행 부분 REAL**: `PlanPolicy`(기능키→최소플랜)만.
**★RBAC·ABAC·PBAC 를 경쟁 모델로 만들지 말고 조합 가능한 단일 Canonical Contract 로 구축**(스펙 §5 명시). 현행 3계통 Role + PlanPolicy 를 **대체하지 않고 편입**.

## 2. Policy (§21) · Version (§22) · Rule (§23) · Condition (§24)

- **Policy(§21)**: authorization_policy_id · **policy_code · policy_name · policy_type · target_resource_types · target_actions · policy_effect · priority · tenant_scope · environment_scope · default_deny · active_version · owner** · status · valid_from/to · evidence. **Type(17)**: ACCESS_CONTROL · DATA_ACCESS · **FINANCIAL_CONTROL** · **ENVIRONMENT_CONTROL** · **TENANT_ISOLATION** · **LEGAL_ENTITY_CONTROL** · PROVIDER_ACCESS · **CREDENTIAL_ACCESS** · FIELD_MASKING · EXPORT_CONTROL · RISK_BASED · TIME_BASED · LOCATION_BASED · INCIDENT_CONTROL · EMERGENCY_CONTROL · COMPOSITE · CUSTOM.
- **Version(§22)**: authorization_policy_version_id · policy_id · **version_number · previous_version · change_summary · rule_references · effective_from · effective_to · created_at · approved_at · activated_at · immutable_hash · rollback_version** · status · evidence. **★현재 Policy 로 과거 Authorization Decision 의 근거를 덮어쓰지 마라**(4-5-3-1-4 §38 Historical Binding·§4.3 계승). **Approved Version = Immutable Hash 필수**.
- **Rule(§23)**: policy_rule_id · policy_version · **rule_name · rule_priority · subject_selector · resource_selector · action_selector · condition_references · effect · obligation_references · denial_reason_code** · valid_from/to · status · evidence. **Effect(8)**: ALLOW · **DENY** · CONDITIONAL_ALLOW · **REQUIRE_APPROVAL** · **REQUIRE_STEP_UP_AUTH** · **MASK_FIELDS** · RESTRICT_EXPORT · MANUAL_REVIEW.
- **Condition(§24)**: policy_condition_id · policy_rule · **left_operand · operator · right_operand · data_type · null_behavior · stale_behavior · failure_effect** · evidence. **Operator(25)**: EQUALS·NOT_EQUALS·IN·NOT_IN·CONTAINS·INTERSECTS·GREATER_THAN(_OR_EQUAL)·LESS_THAN(_OR_EQUAL)·BETWEEN·EXISTS·NOT_EXISTS·MATCHES·**SAME_TENANT**·**SAME_WORKSPACE**·**SAME_LEGAL_ENTITY**·SAME_COUNTRY·**SAME_ENVIRONMENT**·WITHIN_SCOPE·WITHIN_TIME_WINDOW·**AUTH_LEVEL_AT_LEAST**·**RISK_BELOW**·**AMOUNT_BELOW**·**APPROVAL_PRESENT**·CUSTOM.
**★`null_behavior`·`stale_behavior`·`failure_effect` 필수** — 속성 부재/신선도 미달/평가 실패 시 **기본 DENY(fail-closed)**. **현행 반례(§0 관찰)**: `team_role` 미설정 → **owner 로 fail-open**(AdminMenu.php:52-54) = **본 계약과 상충** → 5-2 에서 정책 판정.
**★Operator 화이트리스트 강제·임의 표현식/eval 금지** — 현행 정본 재사용: RuleEngine 이 미등록 op 를 **422 거부**(RuleEngine.php:120-121).

## 3. Request (§28) · Decision (§29) · Obligation (§30) · Reason (§31)

- **Request(§28)**: authorization_request_id · subject · resource · action · requested_scopes · authorization_context · **request_source · API_endpoint_reference · UI_feature_reference · service_reference** · requested_at · evaluation_deadline · status · evidence.
- **★Decision(§29)**: authorization_decision_id · authorization_request · subject · resource · action · **applicable_roles · applicable_permissions · applicable_policies · policy_versions · matched_conditions · unmatched_conditions · explicit_deny_result · scope_result · field_access_result · authentication_result · risk_result · final_effect · denial_reason · obligations · evaluated_at · decision_latency · cache_reference** · evidence. **Final Effect(9)**: ALLOW · DENY · CONDITIONAL_ALLOW · REQUIRE_APPROVAL · REQUIRE_STEP_UP_AUTH · MASK_FIELDS · RESTRICT_EXPORT · MANUAL_REVIEW · ERROR.
**★§4.10 Decision 은 추론 가능해야 한다** — 누가·어떤 Resource 에·어떤 Action 을·어떤 Context 에서·**어떤 Policy 와 Role 로**·왜 허용/거부되었는지 설명 가능(헌법 Vol4 Explainable·근거 없는 결론 금지). **현행 부재** — 판정 근거를 남기는 구조 없음(신설).
- **Obligation(§30, 17)**: LOG_ACCESS · **LOG_SENSITIVE_ACCESS** · **MASK_FIELDS** · TOKENIZE_FIELDS · **LIMIT_ROWS** · **LIMIT_AMOUNT** · REDACT_EXPORT · REQUIRE_WATERMARK · REQUIRE_REASON · REQUIRE_TICKET · **REQUIRE_APPROVAL** · **REQUIRE_MFA** · REQUIRE_REAUTHENTICATION · REQUIRE_CUSTOMER_NOTICE · REQUIRE_POST_ACTION_REVIEW · **DISABLE_CACHE** · CUSTOM.
- **Reason(§31, 28)**: ROLE_PERMISSION_MATCH · ATTRIBUTE_MATCH · POLICY_ALLOW · **EXPLICIT_DENY** · **NO_ALLOW_POLICY** · **TENANT_MISMATCH** · WORKSPACE_MISMATCH · **LEGAL_ENTITY_MISMATCH** · COUNTRY_MISMATCH · **ENVIRONMENT_MISMATCH** · **PROGRAM_SCOPE_MISMATCH** · PROVIDER_ACCOUNT_MISMATCH · DATA_CLEARANCE_INSUFFICIENT · **FINANCIAL_CLEARANCE_INSUFFICIENT** · **MFA_REQUIRED** · AUTH_ASSURANCE_INSUFFICIENT · SESSION_EXPIRED · DEVICE_UNTRUSTED · NETWORK_RESTRICTED · **RISK_TOO_HIGH** · REQUEST_AMOUNT_EXCEEDED · EXPORT_LIMIT_EXCEEDED · **PROGRAM_NOT_ACTIVE** · **VERSION_NOT_ACTIVE** · POLICY_CONFLICT · **POLICY_DATA_STALE** · MANUAL_REVIEW_REQUIRED · OTHER.

## 4. Evaluation 순서 (§32) · Policy Conflict (§33)

- **★평가 순서(18)**: ①Subject 활성 ②**Authentication Assurance** ③**Tenant Isolation** ④**Environment Isolation** ⑤Resource 상태 ⑥**Explicit Deny** ⑦Subject-Role Binding ⑧Role-Permission Binding ⑨Subject Scope ⑩Resource Scope ⑪ABAC Conditions ⑫PBAC Composite ⑬**Field-level Access** ⑭**Financial Threshold** ⑮Risk·Incident ⑯Approval·Step-up ⑰Obligation 생성 ⑱Final Decision. **★Tenant/Environment Isolation 을 Role 평가보다 먼저**(§4.5·§4.6).
- **Conflict(§33)**: conflict_id · authorization_request · **conflicting_policies · conflicting_effects · priority_comparison · scope_comparison · resolution_strategy · resolved_effect · severity** · detected_at · status · evidence. **Strategy(7)**: **EXPLICIT_DENY_WINS** · HIGHEST_PRIORITY · MOST_SPECIFIC_SCOPE · **RESTRICTIVE_EFFECT_WINS** · REQUIRE_APPROVAL · MANUAL_REVIEW · BLOCK. **★Production 에서 해결되지 않은 Critical Conflict 는 접근 차단**.

## 5. Rebate Policy 예시 (§34) · Data Classification (§35) · Production (§36)

- **Program 조회**: Tenant 일치 + Workspace Scope + Program Scope + `REBATE_PROGRAM_READ`.
- **Program 수정**: Draft/Configuring 상태 + `REBATE_PROGRAM_UPDATE` + Tenant·Workspace Scope + **Production Version 직접 수정 금지**(4-5-3-1-4 §4.3 계승).
- **Funding 변경**: `REBATE_FUNDING_MANAGE` + **Program Legal Entity Scope 일치** + Financial Clearance + **변경 금액이 개인 Threshold 이하**(초과 시 REQUIRE_APPROVAL).
- **Program 활성화**: `REBATE_PROGRAM_ACTIVATE` + **Version Approved** + **Activation Gate 23 통과**(4-5-3-1-4 §20) + **작성자≠활성화 담당자 분리 Hook**(상세=5-4) + **Production MFA**.
- **Payout 조회**: `REBATE_PAYOUT_READ` + Financial Clearance + **Beneficiary PII 는 별도 Field Permission** + Tenant·Legal Entity Scope.
- **Provider Credential 사용**: `REBATE_PROVIDER_CREDENTIAL_USE` + 지정 Provider Account Scope + **Production Credential 은 Step-up Auth** + **Credential Secret 직접 조회 금지**.
- **Data Classification(§35, 11)**: PUBLIC·INTERNAL·CONFIDENTIAL·RESTRICTED·HIGHLY_RESTRICTED·**FINANCIAL**·**PII**·**SENSITIVE_PII**·CONTRACT_CONFIDENTIAL·SECURITY_SENSITIVE·**CREDENTIAL_REFERENCE**. 정책: INTERNAL=Tenant Member+ · CONFIDENTIAL=Program Role+Scope · FINANCIAL=Financial Clearance · PII=PII Clearance+Purpose(헌법 No-PII 정합) · **SENSITIVE_PII=Masking 기본** · **CREDENTIAL_REFERENCE=Metadata 만** · SECURITY_SENSITIVE=Security Role.
- **Production(§36, 13)**: 활성 Subject · **Production Environment Scope** · 강화 Authentication Assurance · **MFA** · 신뢰 Session · Risk Threshold 이하 · Sensitive Role 유효 · Time-bound Hook · Approval Hook · **Audit Logging** · No Critical Policy Conflict · No Incident Lockdown · No Kill Switch Conflict. **★Sandbox Role 로 Production 작업 금지**(§4.6). **현행**: Production/Sandbox 권한 분리 **부재**(GENIE_ENV 는 데이터 격리용·`Db::envLabel()` 278차 트랩) → **신설**.

## 6. Service Account (§37) · API Client·OAuth (§38) · Provider Credential (§39)

- **Service Account/Machine Identity(§37, 16)**: 인간 User 와 **별도 Subject Type** · Owner · Purpose · Tenant/Environment/Provider Account Scope · Allowed Actions · Credential Reference · **Token Audience · Token Expiry · Rotation Policy** · Network Restriction · Workload Identity · 미사용 시 비활성 · **Human Login 금지** · **Impersonation 금지** · Audit Correlation.
- **API Client·OAuth(§38)**: Client ID Reference · Tenant · Owner · Environment · OAuth Scopes · **Rebate Resource Scopes** · Grant Type · Redirect Reference · Token Audience/Lifetime · Secret·Certificate Reference · **IP·Network Restriction** · Rate Limit · **Export Limit** · Financial Action 지원 여부 · status · evidence. **★OAuth Scope 만으로 최종 Authorization 결정 금지 — Resource·Tenant·Policy 추가 평가**. **현행 REAL**: api_key(scopes_json·expires_at·is_active·use_count·**key_hash SHA-256**·Db.php:942-955) = **API_CLIENT Subject 정본** · 전역 레이트리밋(282차).
- **Provider Account·Credential(§39)**: **접근을 분리** — Provider Program Metadata 조회 / Provider Account Configuration 조회 / **Credential Metadata 조회** / **Credential 사용** / **Rotation** / Disable. **★Credential Secret 원문 사용자 노출 금지 · Secret 사용은 Tokenized Runtime Reference 로**. **현행 REAL 인접**: channel_credential **at-rest AES-256-GCM**(267차 Crypto fail-closed) · ChannelCreds 마스킹 · 자격증명 게이트(`no_credentials`·AdAdapters.php:19). → **재사용 + Permission 분리 신설**.

## 7. Reconciliation (§41·§42) · Critical Gap (§43)

- **비교 대상(§41, 17)**: IdP Role↔Internal Role · Tenant Membership↔Subject Binding · Workspace Membership↔Scope · Organization Role↔Program Role · **Legal Entity Scope↔Resource Legal Entity** · Provider Permission↔Internal Permission · **OAuth Scope↔Internal Permission** · **UI Feature Access↔API Authorization** · API Gateway Decision↔Service Decision · Service Decision↔**Database RLS** · **Policy Store Version↔Runtime Policy Version** · Subject Role Assignment↔Actual Access · **Revoked Role↔Active Session** · **Expired Assignment↔Cached Decision** · Production Permission↔Environment Scope · **Field Masking Policy↔Returned Data** · Audit Log↔Authorization Decision.
- **Status(§42, 20)**: MATCH · IDP_ROLE_MISMATCH · TENANT_BINDING_MISMATCH · WORKSPACE_SCOPE_MISMATCH · ORGANIZATION_ROLE_MISMATCH · LEGAL_ENTITY_SCOPE_MISMATCH · PROVIDER_PERMISSION_MISMATCH · OAUTH_SCOPE_MISMATCH · **UI_API_MISMATCH** · GATEWAY_SERVICE_MISMATCH · SERVICE_DATABASE_MISMATCH · **POLICY_VERSION_MISMATCH** · ROLE_ASSIGNMENT_MISMATCH · **REVOKED_ACCESS_STILL_ACTIVE** · **EXPIRED_ACCESS_STILL_ACTIVE** · ENVIRONMENT_SCOPE_MISMATCH · FIELD_MASKING_MISMATCH · AUDIT_DECISION_MISMATCH · MANUAL_REVIEW · BLOCKED.
**★UI_API_MISMATCH 는 현행 실 위험**: `PlanPolicy` ↔ 프론트 `planMenuPolicy.js` **수동 동기화**(PlanPolicy.php:14) · **286차 rank 맵 붕괴 사고**(starter=growth=pro=1 → requirePro 가 사실상 'starter+'·UserAuth.php:330) = **드리프트 실현 사례**.
- **★Critical Gap(§43, 18)**: **Cross-Tenant Program Access** · **Wrong Legal Entity Funding Access** · **Sandbox Role 의 Production 접근** · **UI 차단인데 API 직접 호출 허용** · API Gateway↔Service Decision 불일치 · **Provider Credential Secret 노출** · **Revoked Role 로 Session 지속** · **Expired Assignment 로 접근 지속** · Payout·Bank Data 무단 조회 · **Financial Approval Permission 과 Execution Permission 결합** · 동일 사용자에게 고위험 권한 집중 · Masking Policy 미적용 · **Explicit Deny 무시** · Unknown Policy Version 으로 Production 결정 · **Policy Cache 가 만료 권한 허용** · **Service Account 가 Human Login 가능** · Cross-Environment Credential 사용 · **Authorization Decision Audit 누락**. → **Access Review 차단**(상세 Access Review=5-7).

## 8. 최소 Static Lint (§44) · Runtime Guard (§45) · Error/Warning (§46·§47)

- **Lint(§44, 17)**: Permission 없는 Action Handler · Resource Type 없는 Authorization Check · **Tenant Scope 없는 Rebate Permission** · Environment Scope 없는 Production Permission · **Role 이름으로 직접 권한 판정** · **UI 에서만 Permission Check** · **API Endpoint Authorization Hook 누락** · Database RLS 정책 누락 · **Explicit Deny 처리 누락** · **Deny-by-default 미적용** · **Wildcard Production Permission** · **Credential Secret Read Permission** · Field-level Sensitive 정책 누락 · **Subject·Resource Tenant 비교 누락** · **Policy Version 없는 Decision** · Evidence 없는 Manual Allow · **기존 Authorization Registry 중복 생성**. **★재사용 가능한 현행 CI 가드**: `tools/guard_headerless_getjson.mjs`(275차·**인가 회귀 클래스 제거 선례**) · `npm run e2e` smoke · route check.
- **Guard(§45, 23)**: Unauthenticated · Inactive Subject · **Tenant Mismatch** · Workspace Mismatch · **Legal Entity Mismatch** · **Environment Mismatch** · **Program Scope Mismatch** · Provider Account Mismatch · **Explicit Deny** · Permission Missing · **Policy Version Invalid** · Role Assignment Expired · Subject Binding Expired · Data Clearance Insufficient · **Financial Clearance Insufficient** · **MFA Required** · Risk Too High · **Program Not Active** · **Version Not Active** · **Field Access Denied** · Export Limit Exceeded · **Policy Conflict** · Kill Switch 활성. **★재사용**: auth_tenant 주입(위조불가) · IDOR 검증(Alerting.php:580-582) · scope 게이트 + **/api 별칭 동시 매칭**(192차 P0 교훈 — **bypass 리스트와 동일하게 `/api` 변형도 매칭**).
- **Error(§46, 25)**: `AUTHORIZATION_` 접두 — SUBJECT_NOT_FOUND · SUBJECT_INACTIVE · RESOURCE_NOT_FOUND · ACTION_NOT_REGISTERED · PERMISSION_NOT_FOUND · ROLE_NOT_FOUND · **ROLE_ASSIGNMENT_EXPIRED** · POLICY_NOT_FOUND · **POLICY_VERSION_INVALID** · **EXPLICIT_DENY** · **TENANT_MISMATCH** · WORKSPACE_MISMATCH · **LEGAL_ENTITY_MISMATCH** · **ENVIRONMENT_MISMATCH** · PROGRAM_SCOPE_MISMATCH · PROVIDER_ACCOUNT_MISMATCH · DATA_CLEARANCE_INSUFFICIENT · **FINANCIAL_CLEARANCE_INSUFFICIENT** · **MFA_REQUIRED** · RISK_TOO_HIGH · **FIELD_ACCESS_DENIED** · EXPORT_RESTRICTED · **POLICY_CONFLICT** · MANUAL_REVIEW_REQUIRED · RUNTIME_BLOCKED.
- **Warning(§47, 15)**: ATTRIBUTE_STALE · ROLE · SCOPE · POLICY_VERSION · POLICY_CONFLICT · FIELD_MASKING · FINANCIAL_THRESHOLD · SESSION_AGE · DEVICE_TRUST · RISK · CACHE · PROVIDER_PERMISSION · **UI_API_DRIFT** · AUDIT · MANUAL_REVIEW_REQUIRED.
- **Evidence(§48)**: **Token·Password·Credential Secret·Bank Account 원문·불필요 개인정보 저장 금지**(헌법 No-PII) → Reference+hash·attribute/scope snapshot·matched/denied rules·policy versions·result hash·lineage.
- **Audit Event(§49, 24)**: SUBJECT_REGISTERED/DISABLED · RESOURCE_REGISTERED · ACTION_REGISTERED · PERMISSION_CREATED/UPDATED · ROLE_CREATED/UPDATED · ROLE_PERMISSION_BOUND · **ROLE_ASSIGNED/REVOKED** · POLICY_CREATED · POLICY_VERSION_CREATED · POLICY_ACTIVATED · POLICY_ROLLED_BACK · **ACCESS_ALLOWED/DENIED** · CONDITIONAL_ACCESS_ALLOWED · STEP_UP_REQUIRED · FIELD_MASKING_APPLIED · EXPORT_RESTRICTED · **POLICY_CONFLICT_DETECTED** · **AUTHORIZATION_DRIFT_DETECTED** · MANUAL_REVIEW_REQUESTED. **현행 재사용**: audit_log 12파일(도메인별 KEEP_SEPARATE).

## 9. 기존 구현 분류 (§50) · 중복 감사 (§51)

| 현행 구현 | 분류 | 근거 |
|---|---|---|
| **TeamPermissions** ACTIONS(8)·DATA_SCOPES(9)·acl_permission(메뉴×8동작)·team_role(owner>manager>member) | **CANONICAL_AUTHORIZATION_ACTION / SCOPE / PERMISSION**(승격·재사용) | TeamPermissions.php:15/17/39/41/44 |
| **api_key RBAC**(roleRank 4 + scopes_json admin:keys/write:*/write:ingest + key_hash SHA-256 + expires_at) | **CANONICAL_AUTHORIZATION_ROLE(API_CLIENT)**(재사용) · **★192차 `/api` 별칭 권한상승 차단 보존** | index.php:554-575 · Db.php:942-955 |
| **PlanPolicy**(RANK · 기능키→최소플랜) | **CANONICAL_AUTHORIZATION_POLICY**(기반·재사용) · **★UI 수동 동기화=MIGRATION_REQUIRED**(5-6) | PlanPolicy.php:14/19-24/41 |
| **Tenant isolation**(auth_tenant 주입·authedTenant 64·tenant_id=? RLS·IDOR 차단) | **VALIDATED_LEGACY**(재사용·강력) | index.php:97-100 · Alerting.php:580-582 |
| requireMasterAdmin2(5) / requireSubAdminMenu | **CONSOLIDATION_REQUIRED**(admin Role 3계통 중 1) | 286차 |
| requirePro / requirePlan(호출부 = **실측 필수**: `node tools/measure_authz_surface.mjs` · ~~351~~ **289차 stale 확인**) | **VALIDATED_LEGACY + CONSOLIDATION_REQUIRED** | UserAuth.php:327-345 · [측정 SSOT](./AUTHZ_SURFACE_MEASUREMENT_SSOT.md) |
| **team_role fail-open**(미설정=owner) | **★MIGRATION_REQUIRED**(§4.1 Deny-by-default 상충 · **PM 재증명 전 P0 단정 금지** · 5-2 판정) | AdminMenu.php:52-54 |
| EnterpriseAuth(SAML/OIDC/SCIM) · UserAuth 세션 · MFA(mfa_policy) · OAuth.php | **KEEP_SEPARATE_WITH_REASON**(**인증≠인가**·§4.7) | — |
| Field Masking(AttributionEngine·ChannelCreds·UserAuth 산재) | **CONSOLIDATION_REQUIRED**(단일 Field Access Profile) | — |
| Impersonation(UserAdmin 회원 대행) | **VALIDATED_LEGACY + 위험 이력**(286차 act-as tenant 하이재킹) → **5-4** | UserAdmin.php · routes.php |
| channel_credential AES-256-GCM · ChannelCreds 마스킹 · `no_credentials` 게이트 | **VALIDATED_LEGACY**(Credential Access 기반) | 267차 · AdAdapters.php:19 |
| `tools/guard_headerless_getjson.mjs`(275차 인가 회귀 ~~CI 가드~~ → **pre-commit 가드(로컬)**·**289차 G15 배선**) | **VALIDATED_LEGACY**(Lint 기반) · `is_effective=true`(289차부터) | 275차 신설 / **289차 배선** |
| **중앙 PDP · Decision 기록 · Policy Version · Obligation · Conflict · Reconciliation · ABAC Context · Field Access Profile · Break Glass · Access Review · Production/Sandbox 권한 분리** | **NOT_APPLICABLE(부재→신설)** | grep 0 |

**중복 감사(§51) 결과**: **여러 Role Registry=3**(team_role·api_key role·admin master/sub → **CONSOLIDATION_REQUIRED**) · **여러 Permission Registry=2**(acl_permission·scopes_json → **KEEP_SEPARATE**(인간 vs API_CLIENT)+Canonical 상위 통합) · **여러 Policy Store=1**(PlanPolicy) · **여러 Scope Model=2**(DATA_SCOPES 9 · tenant/plan → 통합) · **여러 PEP=100+**(미들웨어 1 + authedTenant 64 + plan gate 56 + master 5 → **★5-6 에서 통합**) · **여러 PDP=중앙 부재**(분산) · **여러 UI Permission Engine=1**(planMenuPolicy.js → **수동 동기화 위험**) · **여러 Field Masking Engine=3+**(**CONSOLIDATION_REQUIRED**) · Rebate 전용 중복 IAM=**0**(미착수·**신설 금지**) · ERP/CRM/Admin UI별 독립 권한 모델=0.
**★결론: 중복 위험의 실체 = "Rebate 전용 IAM 을 새로 만드는 것" + "이미 3계통인 Role 을 4번째로 늘리는 것"** → **TeamPermissions/api_key/PlanPolicy 재사용 강제**(헌법 Golden Rule=Extend · `feedback_no_duplicate_features`).
