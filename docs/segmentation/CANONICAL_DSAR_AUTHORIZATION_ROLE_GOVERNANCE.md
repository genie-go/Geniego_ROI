# CANONICAL DSAR — Authorization Role Governance (Role Registry 통합 · Custom Role · Lifecycle · Assignment · Privilege Escalation 방지 · Reconciliation · Lint/Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 승인)**: 본 파트의 상세 스펙은 **제공되지 않았다**(파트 번호·이름만 5-1 §1 에 명시). 구조·Entity·분류는 **실측 + 5-1 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합**.
> 정본 쌍: [`CANONICAL_DSAR_AUTHORIZATION_ORGANIZATION_TENANT_SCOPE.md`](CANONICAL_DSAR_AUTHORIZATION_ORGANIZATION_TENANT_SCOPE.md)(조직·Scope) + 본 문서(Role).
> ADR: [`../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_TENANT_SCOPE_GOVERNANCE.md`](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_TENANT_SCOPE_GOVERNANCE.md).
> 선행: **5-1 §15~§18**(Role Foundation · Role 3계통 **CONSOLIDATION_REQUIRED** 위임 수령).
> **범위**: Role 거버넌스만 — Approval Workflow=5-3 · **Maker-Checker/SoD/Delegation/Impersonation=5-4** · **JIT/Time-bound=5-5** · Runtime PDP=5-6 · Access Review=5-7 · Certification=5-8.

---

## 0. 실측 요약 — ★5-1이 남긴 최대 과제: Role 3계통

| Role 계통 | 위계 | 대상 | 저장 | 근거 |
|---|---|---|---|---|
| **① team_role** | **owner > manager > member**(고정 3종) | 인간(테넌트 내부) | app_user 컬럼 · `team` 테이블 | [TeamPermissions.php:13](../../backend/src/Handlers/TeamPermissions.php)/17/145 |
| **② api_key role** | **viewer 0 < connector 1 < analyst 2 < admin 3** + **scopes**(`admin:keys`/`write:*`/`write:ingest`) | **API_CLIENT** | `api_key.role` · `scopes_json` | [index.php:554](../../backend/public/index.php)/562-575 · [Db.php:947-949](../../backend/src/Db.php) |
| **③ admin master/sub** | **master > sub** | 플랫폼 관리자 | (관리자 판정 로직) | `requireMasterAdmin2`(**5 핸들러**) · `requireSubAdminMenu`(286차) |
| (부수) **plan rank** | `PlanPolicy::RANK`(5단계) | 기능 접근 | app_user.plan | [PlanPolicy.php:19](../../backend/src/PlanPolicy.php) · requirePro/requirePlan(**호출부 351**) |

| 항목 | 실측 | 분류 |
|---|---|---|
| **Custom Role** | ❌ **부재(grep 0)** — `custom_role`/`role_code` 없음 · **team_role 은 고정 3종**(owner/manager/member) | **NOT_APPLICABLE → 신설** |
| **Role Registry(테이블)** | ❌ **부재** — Role 이 **enum·상수·컬럼값**으로 산재(위 3계통) | **NOT_APPLICABLE → 신설(통합)** |
| **Role-Permission Binding** | ✅ **REAL** — `acl_permission`(메뉴 × 8동작 매트릭스) | **VALIDATED_LEGACY(재사용)** |
| **Role Assignment 이력/승인/만료** | ❌ **부재** — assigned_by·reason·approval·valid_to 없음 | **NOT_APPLICABLE → 신설** |
| **Role Inheritance** | ❌ 부재(고정 위계만) | **신설(순환 차단)** |
| **Privilege Escalation 방지** | △ **부분 REAL** — **★192차 P0**: `/v421/keys` 게이트 **`/api` 별칭 우회**로 일반 `write:*` 키가 **admin 키 발급** 가능했던 **권한상승 차단**(index.php:562-567) · **admin:keys scope 또는 rank≥3 요구** | **VALIDATED_LEGACY(재사용·영구 규칙)** |
| **★team_role fail-open** | ⚠️ **REAL 위험** — "fail-open: team_role 미설정=레거시 단독회원=**owner**"([AdminMenu.php:52-54](../../backend/src/Handlers/AdminMenu.php)) | **MIGRATION_REQUIRED(본 문서 §5 판정)** |
| **sub-admin 스코프 강제** | ✅ **REAL** — 286차: `requireMasterAdmin2`=메뉴트리/부여/요금/DB/쿠폰쓰기 **master 전용** · `requireSubAdminMenu`=growth/site-intro/legal-docs/plan-pricing **부여경로만** · **키=ADMIN_MENU it.to 정합 오차단 0** | **VALIDATED_LEGACY(재사용)** |

**★결론(정직)**: **Role Registry 자체가 없다** — Role 이 3계통에 **enum/상수/컬럼값으로 산재**하고, **Custom Role·Assignment 이력·승인·만료가 전무**하다. 반면 **Role-Permission Binding(acl_permission)·권한상승 차단(192차)·sub-admin 스코프 강제(286차)는 REAL**. → **Canonical Role Registry 로 통합하되 3계통의 실효 동작 보존**(Legacy Equivalence=5-8) · **★Role 을 4번째로 늘리지 말 것**(5-1 §51).

---

## 1. Canonical Entity (14) — 자율 설계

ROLE_REGISTRY · ROLE_CATEGORY · ROLE_VERSION · CUSTOM_ROLE_DEFINITION · ROLE_INHERITANCE · ROLE_ASSIGNMENT · ASSIGNMENT_APPROVAL_REFERENCE · ASSIGNMENT_HISTORY · ROLE_TEMPLATE · PRIVILEGE_ESCALATION_GUARD · ROLE_RECONCILIATION · ROLE_CANDIDATE · ROLE_EVIDENCE · ROLE_AUDIT_EVENT.
**현행 실체**: Role-Permission Binding(acl_permission) · 권한상승 차단(192차) · sub-admin 스코프(286차) = **REAL 재사용**. 나머지 = **신설**.

## 2. Role Registry 통합 (§1) — 3계통 매핑

- **Registry(§1)**: authorization_role_id · **role_code · role_name · role_category · legacy_system**(TEAM/API_KEY/ADMIN/PLAN) · **legacy_value**(owner|manager|member / viewer|connector|analyst|admin / master|sub) · system_defined · **custom_role** · tenant_id · organization_id · default_scope · **privilege_level · sensitive_role · production_role · assignable · delegable · approval_required** · valid_from/to · version · status · evidence.
- **★통합 원칙**: 3계통을 **legacy_system + legacy_value 로 매핑 보존**하고 Canonical role_code 를 부여 — **기존 값·의미·판정 코드를 바꾸지 않는다**(회귀 0). 예: `TEAM/owner` → `TENANT_OWNER` · `API_KEY/analyst` → `API_WRITER` · `ADMIN/master` → `PLATFORM_MASTER_ADMIN`.
- **★대량 회귀 위험(실측)**: `requirePro` **호출부 351개**(286차 rank 맵 붕괴 실사례) · `authedTenant` **64 핸들러** · `requireMasterAdmin2` **5 핸들러** → **의미 변경 금지 · 매핑만**.

## 3. Custom Role (§2) · Role Version (§3) · Inheritance (§4)

- **Custom Role(§2)**: custom_role_definition_id · tenant_id · **base_role_template · granted_permissions · denied_permissions · scope_limitation · max_privilege_level · created_by · approval_reference** · valid_from/to · status · evidence. **★부재→신설**(현행 team_role 은 고정 3종). **★고객사가 자체 Role 을 만드는 멀티테넌트 요구의 핵심** — 단 **max_privilege_level 상한 강제**(Custom Role 로 플랫폼 관리자 권한 획득 금지=**권한상승**).
- **Role Version(§3)**: role_version_id · role_id · version_number · **change_summary · permission_diff · effective_from/to · approved_at · immutable_hash · rollback_version** · evidence. **★현재 Role 정의로 과거 Authorization Decision 근거 덮어쓰기 금지**(5-1 §22 · 1-4 §38 Historical Binding 계승).
- **Inheritance(§4)**: parent_role · child_role · inherited_permissions · **override_permissions · depth** · evidence. **★순환 관계 차단 · depth 상한 · 제한적 지원**(5-1 §17). **상속으로 sensitive/production Role 이 자동 획득되지 않도록 차단**.

## 4. Role Assignment Governance (§5) — 부재→신설

- **Assignment(§5)**: subject_role_id · subject · role · **tenant_id · workspace_id · organization_id · legal_entity_id · environment · program_scope · provider_account_scope · assigned_by · assignment_reason · approval_reference · valid_from · valid_to** · status · evidence(5-1 §18 계승).
- **★현행 부재 확정**: 누가·언제·왜·누구 승인으로 Role 을 부여했는지 **기록 구조가 없다**(team_role 은 단순 컬럼값). → **Assignment History Append-only 신설**.
- **★규칙**: **assigned_by · reason · approval_reference · Evidence 없는 부여 금지** · **valid_to 경과 = 즉시 차단**(`AUTHORIZATION_ROLE_ASSIGNMENT_EXPIRED`) · **Expired/Revoked 로 접근 지속 = Critical**(5-1 §43) · **sensitive_role/production_role 은 Time-bound 필수**(상세=5-5 JIT).
- **자기 부여 금지**: assigned_by == subject 인 **자기 권한 상향 금지**(Maker-Checker 상세=5-4).

## 5. ★Privilege Escalation Guard (§6) — 192차 정본 + fail-open 판정

- **Guard(§6)**: escalation_guard_id · **guard_type · 검사 대상 · 차단 조건 · 위반 시 효과** · evidence. **Type(8)**: **SCOPE_GATE_BYPASS**(별칭 경로 우회) · **SELF_ASSIGNMENT**(자기 부여) · **CUSTOM_ROLE_OVERREACH**(max_privilege 초과) · **INHERITANCE_ESCALATION**(상속으로 sensitive 획득) · **FAIL_OPEN_ATTRIBUTE**(속성 부재→고권한) · **CROSS_TENANT_ROLE**(타 테넌트 Role) · **ENVIRONMENT_ESCALATION**(Sandbox→Production) · **APPROVAL_BYPASS**.
- **★현행 정본 재사용(SCOPE_GATE_BYPASS)**: **192차 보안 P0** — `/v421/keys` 게이트가 **`/api` 별칭**(`/api/v421/keys`)으로 **우회**되어 일반 `write:*` 키가 **admin 키를 발급**할 수 있었다 → **bypass 리스트와 동일하게 `/api` 변형도 매칭**(index.php:562-567). **★영구 규칙: 신규 권한 게이트 작성 시 `/api` 별칭 변형 동시 매칭 필수**(미매칭 = 권한상승).
- **★FAIL_OPEN_ATTRIBUTE — `team_role` fail-open 판정(5-1 §0-3 위임 수령)**:
  - **실측**: "테넌트 owner 만 super 로 인정(**fail-open: team_role 미설정=레거시 단독회원=owner**)"(AdminMenu.php:52-54).
  - **판정(자율·미확정)**: **의도적 설계로 보인다** — 레거시 단독회원(팀 개념 이전 가입자)에게 team_role 컬럼이 없어 owner 로 해석하지 않으면 **자기 테넌트에서 잠김**. 즉 **가용성 보호 목적**.
  - **그러나 Canonical 계약(5-1 §4.1 Deny-by-default · §24 null_behavior=DENY)과는 상충**한다. **권장 해소**: fail-open 을 없애는 대신 **부재 시 owner 로 "명시적 backfill"**(1회 마이그레이션)하고 이후 **null=DENY 로 전환** → 가용성 보존 + 계약 정합.
  - **★본 세션 미수정**(비파괴·코드변경 0) · **FP 레지스트리 규약상 PM 코드 재증명 전 P0 단정 금지** · **실 전환은 별도 승인 세션**(회귀 위험: 레거시 단독회원 전원 잠김 가능 → backfill 선행 필수).

## 6. Role Reconciliation (§7) · Lint/Guard (§8) · Error (§9)

- **Reconciliation(§7, 8)**: team_role ↔ Canonical Role · api_key role ↔ Canonical · admin master/sub ↔ Canonical · **Role Assignment ↔ 실 접근**(5-1 §41) · **Revoked Role ↔ Active Session** · **Expired Assignment ↔ Cached Decision** · Custom Role ↔ max_privilege · **IdP Role ↔ Internal Role**(EnterpriseAuth SCIM).
- **Lint(§8, 10)**: **Role 이름 하드코딩**(`if role=='owner'` 등) · Role Registry 미등록 Role 사용 · **Custom Role max_privilege 미설정** · Assignment 에 valid_to 없는 sensitive/production Role · assigned_by/reason 없는 Assignment · **자기 부여 허용** · 순환 Inheritance · **권한 게이트에 `/api` 별칭 미매칭**(192차 클래스) · **fail-open 속성 판정** · 기존 Role Registry 중복 생성.
- **Guard(§8b, 9)**: Role 미등록 · Assignment Expired/Revoked · Cross-Tenant Role · Environment Escalation · Custom Role Overreach · Self Assignment · Approval Bypass · Inheritance Escalation · **Scope Gate Bypass**.
- **Error(§9, 10)**: `AUTHORIZATION_ROLE_NOT_REGISTERED` · `ROLE_ASSIGNMENT_EXPIRED` · `ROLE_ASSIGNMENT_REVOKED` · `CUSTOM_ROLE_OVERREACH` · `SELF_ASSIGNMENT_BLOCKED` · `INHERITANCE_CYCLE` · `CROSS_TENANT_ROLE` · `ENVIRONMENT_ESCALATION` · `APPROVAL_REQUIRED` · `PRIVILEGE_ESCALATION_BLOCKED`.

## 7. Role Matrix — 현행

| Canonical Role(예) | legacy_system | legacy_value | Permission 원천 | Scope | 승인 | 만료 | 근거 |
|---|---|---|---|---|---|---|---|
| TENANT_OWNER | TEAM | **owner** | acl_permission | tenant | ❌ | ❌ | TeamPermissions.php:17 · **★fail-open**(AdminMenu.php:52) |
| TEAM_MANAGER | TEAM | manager | acl_permission | team | ❌ | ❌ | TeamPermissions.php:17 |
| TEAM_MEMBER | TEAM | member | acl_permission | team/own | ❌ | ❌ | — |
| API_READER | API_KEY | **viewer(0)** | scopes/rank | tenant | ❌ | **✅ expires_at** | index.php:554 · Db.php:947 |
| API_CONNECTOR | API_KEY | connector(1) | `write:ingest` | tenant | ❌ | ✅ | index.php:568-575 |
| API_WRITER | API_KEY | analyst(2) | `write:*` | tenant | ❌ | ✅ | — |
| API_ADMIN | API_KEY | **admin(3)** | **`admin:keys`** | tenant | ❌ | ✅ | **★192차 `/api` 우회 차단** :562-567 |
| PLATFORM_MASTER_ADMIN | ADMIN | **master** | 메뉴트리/부여/요금/DB/쿠폰쓰기 | 전역 | ❌ | ❌ | requireMasterAdmin2(5) · 286차 |
| PLATFORM_SUB_ADMIN | ADMIN | sub | growth/site-intro/legal-docs/plan-pricing **부여경로만** | 부여 범위 | ❌ | ❌ | requireSubAdminMenu · 286차 |
| (Custom Role) | — | — | — | — | — | — | **부재→신설** |
