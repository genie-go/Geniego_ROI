# DSAR — Authorization Migration Foundation (§52 / §66)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

**§52 Migration Foundation — Legacy Source(분류)**: Hardcoded Role/User ID Check · Is Admin Boolean · Manager/Department/Organization Check · UI Button/API Route Permission · JWT Scope · Database ACL · ERP/Workflow Role · Legacy Permission Table · Approval Authority Check · Feature Flag · Custom Script · Unknown.

**필드**: source rule id · source representation · target registry/definition/policy · **mapping confidence** · semantic equivalence · behavior difference · risk · **manual review required**.

**절대 규율(§52)**: **Legacy Rule을 의미검증 없이 자동 Allow Policy로 변환 금지.**

**§66 구현 순서(20단계)**: ①Inventory ②Canonical Terminology ③Registry ④Policy/Policy Set ⑤Definition/Version ⑥Contract ⑦Context ⑧Evaluation Pipeline ⑨Decision/Reason/Obligation/Constraint ⑩Snapshot/Evidence/Digest ⑪Decision/Commit Binding ⑫Validity/Expiration/Cache ⑬Exception/Override ⑭Kill Switch/Fail-closed ⑮Revalidation/Drift Hook ⑯Simulation/Reconciliation ⑰**Migration** ⑱Static Lint/Runtime Guard ⑲Test/Regression ⑳문서/ADR/History.

의미: 마이그레이션은 흩어진 하드코딩 규칙(roleRank 상수·plan==='admin'·writeGuard·requireFeaturePlan·admin_roles DORMANT)을 Canonical Policy로 **의미 등가성을 검증하며** 이관하고, 각 매핑에 confidence·behavior difference·manual review를 부여한다. Fail-open/Default-allow legacy를 그대로 Allow로 옮기는 것을 금지한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Legacy → Canonical 매핑 구조는 부재** — mapping confidence·semantic equivalence를 기록하는 이관체 전무(Canonical Registry/Policy 자체가 ABSENT). 아래는 **이관 대상 Legacy Source 인벤토리(GROUND_TRUTH 실측)**:
  - **Hardcoded Role Check(roleRank 상수)**: `index.php:554` viewer0/connector1/analyst2/admin3 맵 → target Policy `supported policy types`/Combining으로 데이터화.
  - **Is Admin Boolean(다수 미러)**: `plan==='admin'` 분포 = `UserAuth.php:72,3668,3712,3738,4208`·`UserAdmin.php:273,306,321,437,458`·`Compliance.php:203`·`Pnl.php:522`·`Keys.php:191,206`·`SystemMetrics.php:50` — SSOT 부재, ADMINISTRATIVE/SYSTEM_ACTOR Policy로 정직화. isAdmin 정의 4개(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`·FE `App.jsx:377`)·requireAdmin 3개(`UserAdmin.php:33`·`DbAdmin.php:42`·`EventPopup.php:96`)는 CONSOLIDATION_REQUIRED.
  - **Database ACL / Legacy Permission Table**: `acl_permission`(`TeamPermissions.php:39,152-159,325-336`)·`data_scope`(`TeamPermissions.php:236-322`)·`wms_permissions`(`Wms.php:72,114`)·`plan_menu_access`(`AdminPlans.php:393`)·`sso_group_role_map`(`EnterpriseAuth.php:70`) → Registry Scope/Policy로 이관.
  - **JWT/API Scope**: api_key scopes(`Keys.php:99-113,198-206`·`index.php:564-578`) → Registry scope 모델.
  - **UI Button/API Route Permission**: FE writeGuard(`writeGuard.js:13,61-90` UI-only·fail-open) → §5.4 위반, 서버측 정본으로 강등·이관.
  - **Feature Flag**: `requireFeaturePlan`(`UserAuth.php:64-84` `:68,72,82-84` 3중 fail-open) → §45 Fail-closed·Default Deny로 전환 대상.
  - **Approval Authority Check**: Maker-Checker(Mapping `Mapping.php:238-292`·Alerting `Alerting.php:598-658`) → Authority(Part5)/Dual-Control(Part8)로 일반화.
- **★DORMANT(죽은 RBAC)**: `admin_roles`/`user_roles`(`UserAdmin.php:627-641,788-812`) — permissions 저장·할당되나 런타임 미소비. "RBAC 구현 존재"로 오계상 금지(GROUND_TRUTH §2) → DEPRECATION_CANDIDATE 또는 Part3 RBAC에서 실배선.
- **★중대 긍정(음성 인벤토리)**: Hardcoded **User ID/Email** Authorization = **부재**(GROUND_TRUTH §2·§0.6) — §52 "Hardcoded User ID Check" 이관 대상 없음. admin 판정 전부 DB 컬럼 기반.

## 3. 판정

- **Verdict: ABSENT** (Legacy 매핑 이관체 부재). 이관 대상 Legacy Source는 **다수 PRESENT-substrate로 실재**(roleRank/plan==='admin'/acl/scope/feature flag/writeGuard) — 매핑·의미검증 대상.
- **선행 의존**: Migration은 §66 17단계 — Registry(③)~Runtime Guard(⑱)가 선행 완성돼야 실행 가능. 상위 Foundation ABSENT이므로 Part 1은 인벤토리·매핑 confidence 설계까지만(BLOCKED_PREREQUISITE for 실 이관).
- **cover: 0** (이관 매핑 전무). Legacy substrate는 이관 원천이지 마이그레이션 구현 대체 아님.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 Migration 매핑 레지스트리 — 각 Legacy Source(위 인벤토리)에 `source rule id`·`source representation`·`target policy`·`mapping confidence`·`semantic equivalence`·`behavior difference`·`risk`·`manual review required`를 기록. 기존 하드코딩은 **삭제가 아니라 Canonical Policy로 의미등가 이관 후 Adapter 위임**(Replace 금지·Extend).
- **★의미검증 강제(§52)**: roleRank 상수(`index.php:554`)·plan==='admin' 다수·acl_permission·api_key scope를 Canonical Policy로 옮길 때 **행동 등가성을 회귀로 증명한 뒤에만** 활성화. Fail-open legacy(`requireFeaturePlan` `UserAuth.php:64-84`·writeGuard `writeGuard.js:13,61-90`)는 **그대로 Allow로 변환 금지** — Default Deny/Fail-closed로 전환하되 mapping confidence=LOW·manual review required=true.
- **DORMANT 처리**: `admin_roles`/`user_roles`(`UserAdmin.php:627-641`)는 이관 인벤토리에서 "구현됨"으로 계상 금지(런타임 미소비). Part3 RBAC 실배선 시점에 target으로 편입하거나 DEPRECATION.
- **SSOT 통합**: isAdmin 4개·requireAdmin 3개·team_role 3중 미러(`TeamPermissions.php:120`↔`UserAuth.php:1099`↔FE)를 단일 Canonical Subject Contract로 SSOT화 — 각 유틸은 Adapter. 이관 후 정책 드리프트 제거.
- **음성 인벤토리 명시**: Hardcoded User ID/Email authz 부재는 이관 대상 없음으로 명기(허위 이관 항목 생성 금지).
- Part 1은 인벤토리·매핑 필드·confidence 설계만·실 이관/Adapter 배선은 후속 승인세션.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DUPLICATE_IMPLEMENTATION_AUDIT]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_AUTHORIZATION_TEST_STRATEGY]].
