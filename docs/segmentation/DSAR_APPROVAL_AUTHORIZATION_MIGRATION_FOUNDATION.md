# DSAR — Authorization Migration Foundation (06-A-03-02-03-04 Part 1 · §52)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist. 여기 없는 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§52 Migration Foundation 원문:

- **Legacy source 유형**: `Hardcoded Role/User ID Check` · `Is Admin Boolean` · `Manager/Department/Organization Check` · `UI Button/API Route Permission` · `JWT Scope` · `Database ACL` · `ERP/Workflow Role` · `Legacy Permission Table` · `Approval Authority Check` · `Feature Flag` · `Custom Script` · `Unknown`.
- 필드: `source rule id/representation` · `target registry/definition/policy` · `mapping confidence` · `semantic equivalence` · `behavior difference` · `risk` · `manual review required`.
- **금지**: **Legacy Rule 의미검증 없이 자동 Allow Policy 변환 금지.**

의미: 마이그레이션은 흩어진 레거시 인가 체크(하드코딩 admin·JWT scope·ACL·레거시 권한테이블)를 Canonical Policy로 옮기는 계층이되, **의미(semantic equivalence)를 검증하지 않고 자동으로 Allow 정책으로 바꾸면 안 된다**. 각 레거시 규칙은 mapping confidence·behavior difference·manual review 플래그와 함께 등재되고, 확신이 낮거나 의미가 다르면 수동 검토를 거친다.

## 2. 기존 구현 대조 (★Legacy source 실재)

- **★Hardcoded `plan==='admin'` 다수 실재**(GROUND_TRUTH §2) — `UserAuth.php:72,104,3668,3712,3738,4208`·`UserAdmin.php:273,306,321,437,458`·`Compliance.php:203`·`Pnl.php:522`·`Keys.php:191,206`·`SystemMetrics.php:50`. SSOT 부재로 동일 admin 판정이 소스 리터럴로 분산 → Migration의 최대 표면.
- **★roleRank 상수**(`index.php:554`) — viewer0/connector1/analyst2/admin3 하드코딩 서열맵. admin:keys scope 게이트(`index.php:564-567`)·write 메서드 게이트(`index.php:568-578`)가 이 상수에 의존 → `Hardcoded Role Check` 유형의 중앙 레거시 소스.
- **★Is Admin Boolean 4정의**(`TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65` isMaster·FE `App.jsx:377`)·requireAdmin 3정의(`UserAdmin.php:33`·`DbAdmin.php:42`·`EventPopup.php:96`)·requireAdminUser(`UserAuth.php:2920`). 동일 개념 다중 미러 → 각각 source rule로 등재·의미 대조 필요.
- **★admin_roles/user_roles DORMANT**(`UserAdmin.php:627-641,788-812`) — `Legacy Permission Table` 유형이나 런타임 미소비. **의미검증 없이 이 permissions를 Allow Policy로 자동 변환 금지**(할당은 됐으나 실제 집행 이력 부재 → behavior difference 큼·manual review required).
- **★JWT/api_key scope**(`Keys.php:99-113,198-206`·`UserAuth.php:4204-4290`) — scope 화이트리스트+역할상한. `JWT Scope`/`API Route Permission` 유형의 legacy source. SSO group→role(`EnterpriseAuth.php:70,78-88`)=`ERP/Workflow Role`에 근접.
- **Manager/Department/Organization Check**: 팀 RBAC 서열(`TeamPermissions.php:120-136` owner>manager>member)·data_scope 조직 행필터(`TeamPermissions.php:236-322`)=`Manager/Organization Check` 유형 substrate.
- **Approval Authority Check**: Maker-Checker(Mapping approve `:238-292`·Alerting decideAction `:598-658`)=승인권한 레거시 소스.
- **Feature Flag**: `requireFeaturePlan`(`UserAuth.php:64-84`) 3중 fail-open(`:68,72,82-84`)=`Feature Flag Authorization` 유형 — **fail-open이므로 그대로 Allow 변환하면 위험 승계**. 의미검증 시 fail-closed로 전환 필요.
- **UI Button Permission**: writeGuard(`writeGuard.js:13,61-90`)=`UI Button/API Route Permission` 유형이나 UI-only → Allow 근거로 신뢰 불가.
- **긍정**: `Hardcoded User ID/Email Check` 유형=**부재**. admin 판정 전부 DB plan/plans/admin_level 컬럼 기반(소스 리터럴 user-id/email authz 없음) → §52 Legacy source 중 이 유형만 mapping 대상에서 제외.

## 3. 판정

- Verdict: **ABSENT (Migration 계층 순신규) · Legacy source 다수 실재**.
- cover: **0** (Migration Foundation 자체는 전무). 단 변환 대상 legacy source는 위 §2와 같이 광범위 실재.
- 선행 의존: target registry/definition/policy(§7~§13 ABSENT)가 없어 현재는 mapping 목적지가 없음 → **BLOCKED_PREREQUISITE**. Registry/Policy 신설 후에만 매핑 가능.
- 위험 승계 주의: requireFeaturePlan fail-open·admin_roles DORMANT·writeGuard UI-only를 **의미검증 없이 Allow로 변환하면 현행 취약점을 Canonical에 그대로 승계**.

## 4. 확장/구현 방향 (설계)

- 순신규 `APPROVAL_AUTHORIZATION_MIGRATION`(§6 엔티티에 준함) — 각 legacy source를 `source rule id/representation`·`target policy`·`mapping confidence`·`semantic equivalence`·`behavior difference`·`risk`·`manual review required`로 등재.
- **의미검증 게이트(코드 강제)**: `semantic equivalence`가 검증되지 않은 source는 **자동 Allow Policy 변환 금지**. 특히 fail-open 소스(`requireFeaturePlan` `UserAuth.php:64-84`)·DORMANT 소스(`admin_roles` `UserAdmin.php:627-641`)·UI-only 소스(`writeGuard.js`)는 `manual review required=true` + `behavior difference` 명시 후에만 변환. 변환 시 fail-open→fail-closed로 **의도적 강화**(현행 위험 승계 금지).
- **mapping confidence 산정**: 서버강제+단일정의(예 `index.php:554` roleRank)는 HIGH, 분산·미러 다중(하드코딩 plan==='admin' 다수·isAdmin 4정의)은 MEDIUM(정합 대조 필요), DORMANT/UI-only/fail-open은 LOW(수동 검토 필수).
- **우선 마이그레이션 순서**: ① 중앙 RBAC(`index.php:553-603`)를 Canonical Policy Set으로 정형화 → ② TeamPermissions acl_permission/data_scope(`TeamPermissions.php:39,152-159,236-322`)를 Policy/Scope로 흡수 → ③ 분산 하드코딩 plan==='admin'을 단일 Canonical Policy 참조로 수렴 → ④ DORMANT admin_roles는 소비 여부 확정 후 별도 결정.
- 마이그레이션은 **탐지·매핑 제안만**(자동 적용 금지). 실 변환·배선은 승인 세션. Part 1은 Migration Contract·legacy source 인벤토리·confidence 규칙 정의만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_RECONCILIATION_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_CRITICAL_GAP_POLICY]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
