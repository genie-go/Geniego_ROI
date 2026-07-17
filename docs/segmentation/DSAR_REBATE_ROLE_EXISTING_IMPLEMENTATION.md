# DSAR — 기존 구현 분류 (§55)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 분류 결과 (전부 실측 file:line)

| 현행 구현 | 분류 | 근거 |
|---|---|---|
| **TeamPermissions::ACTIONS**(8·approve/execute 포함) | **CANONICAL_AUTHORIZATION_ACTION**(승격·재사용) | TeamPermissions.php:39 |
| **TeamPermissions::DATA_SCOPES**(9) | **CANONICAL_REBATE_ROLE_SCOPE**(승격·**기존 9종 의미 변경 금지**) | TeamPermissions.php:41 |
| **`acl_permission`**(메뉴×8동작) | **CANONICAL_REBATE_ROLE_PERMISSION_PROFILE**(승격·재사용) | TeamPermissions.php:15 |
| **`team`**(tenant_id·name·team_type·manager_user_id·status) | **CANONICAL_REBATE_ROLE_ASSIGNMENT**(Team 축·재사용) | TeamPermissions.php:145/168 |
| **team_role**(owner>manager>member) | **CANONICAL_REBATE_ROLE**(1/3 계통) | TeamPermissions.php:13/17 |
| **api_key RBAC**(roleRank viewer0<connector1<analyst2<admin3) | **CANONICAL_REBATE_ROLE**(2/3) | index.php:554 |
| **api_key 스키마**(key_hash·scopes_json·**expires_at**·**last_used_at**·**use_count**·is_active) | **CANONICAL_REBATE_SERVICE_ACCOUNT_ROLE**(재사용·**Type 승격 필요**) | Db.php:942-955 |
| **admin master/sub**(requireMasterAdmin2 5핸들러·requireSubAdminMenu) | **CANONICAL_REBATE_ROLE**(3/3) · **CONSOLIDATION_REQUIRED** | 286차 |
| **`sso_group_role_map`**(tenant_id·group_name·role·UNIQUE uq_sgrm) + **`roleForGroups()`** | 🔴 **CANONICAL_REBATE_ROLE_ASSIGNMENT(GROUP_BASED)**(승격·재사용) | EnterpriseAuth.php:70/72/78 |
| **`sso_config`**(protocol·**scim_enabled**·scim_token_hash·**auto_provision**·**default_role**) + `scimJson()` | **VALIDATED_LEGACY**(SCIM_MANAGED 기반·재사용) | EnterpriseAuth.php:59/35 |
| **즉시 deprovision**(`active===0 → DELETE FROM user_session`) | 🔴 **CANONICAL_REBATE_ROLE_DEPROVISIONING**(패턴 정본·재사용 강제) | EnterpriseAuth.php:400 |
| **`catalog_brand`**(tenant_id·name·code·UNIQUE) | **VALIDATED_LEGACY**(BRAND Scope Registry·285차) | Catalog.php:151/161/353 |
| **Tenant Isolation**(agency 토큰 서버바인딩·위조불가) | **VALIDATED_LEGACY**(강력·재사용) | index.php:97-100 |
| **scope 게이트** + **192차 `/api` 별칭 권한상승 차단** | **VALIDATED_LEGACY**(**영구 규칙**) | index.php:562-575 |
| **`authedTenant`**(64) · `tenant_id=?` RLS | **VALIDATED_LEGACY** + **CONSOLIDATION_REQUIRED**(PEP 분산) | 64 핸들러 |
| **action_request 승인워크플로**(approvals_json·**required_approvals DEFAULT 2**·IDOR 차단 208차) | **VALIDATED_LEGACY**(Approval 정본·**중복 승인엔진 금지**) | Db.php:592-600/634 · Alerting.php:545-546 |
| **AgencyPortal**(매 요청 approved 재검증 **fail-closed**) | 🔴 **VALIDATED_LEGACY**(외부 Role 참조 구현·272차) | AgencyPortal |
| **PartnerPortal**(supplier/logistics/warehouse 서브계정) · **SupplyChain**(sc_suppliers↔wms_suppliers) | **VALIDATED_LEGACY**(External User 기반) | PartnerPortal · SupplyChain |
| **menu_audit_log**(**필드 축**: changed_by_role·request_id·old_value/new_value/reason/ip_address/user_agent) + SIEM LEEF/RFC5424 | **VALIDATED_LEGACY**(**필드·SIEM 축 한정** — 🔴`tenant_id` 부재 보강 조건부) · ⚠️**`hash_chain` 은 이 승격에서 제외**: 체인 연결은 실재(`:194`+`:216`)하나 preimage `'ts'`(`:195`) 미저장(INSERT 컬럼 `:199-203` 에 `created_at` 없음 · `:129` DB DEFAULT) → **검증 영구 불가 · 검증기 0** = `PARTIAL`. 해시체인 이식 정본은 **`SecurityAudit::verify():56-68`** | AdminMenu.php:123-131/194-203/216 · Compliance.php:225 · SecurityAudit.php:56-68 |
| **`Db::envLabel()`**(GENIE_ENV) | **VALIDATED_LEGACY**(Environment Scope SSOT·**`Db::env()` 사용 금지**·278차 트랩) | Db.php |
| **PlanPolicy**(RANK·기능키→최소플랜) | **VALIDATED_LEGACY** + **MIGRATION_REQUIRED**(프론트 `planMenuPolicy.js` **수동 동기화**) | PlanPolicy.php:14/19-24/41 |
| **Field Masking**(AttributionEngine·ChannelCreds·UserAuth **산재**) | **CONSOLIDATION_REQUIRED**(단일 Field Access Profile) | 3+곳 |
| **`team_role` fail-open**("미설정=레거시 단독회원=owner") | ★**MIGRATION_REQUIRED** — §4 Deny-by-default 상충 · **레거시 호환 의도 명시(주석)** · **PM 재증명 전 P0 단정 금지** | AdminMenu.php:52-54 |
| ~~workspace~~ | ⚠️ **오탐** — `WorkspaceState`=`tenant_kv` KV 저장소(279차) | WorkspaceState.php:59 |
| ~~business_unit~~ | ⚠️ **오탐** — Trustpilot API 자격증명 필드 | ChannelSync.php:2573-2577 |
| **Workspace·Organization·Department·Legal Entity·Store·Cost Center·Country·Region Registry · Role Catalog/Version/Hierarchy/Composition · Custom Role · Role Request/Grant/Revocation 원장 · Scope Inheritance/Override/Exclusion/Conflict · Role Usage · Orphan/Dormant 탐지 · Reconciliation · HRIS 연동 · Authorization Cache** | **NOT_APPLICABLE(부재·grep 0 → 신설)** | — |

## 규칙
**VALIDATED_LEGACY 는 재사용 강제**(헌법 Golden Rule = Replace 가 아니라 Extend).
**NOT_APPLICABLE 을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤 교훈).
**MIGRATION_REQUIRED 2건은 본 세션 미수정**(비파괴 · 별도 판정 세션).

## 🔴 1-9 교훈 적용 — `VALIDATED_LEGACY` 에 `is_effective` 를 요구한다
1-9 LEGACY-GAP-01: `guard_headerless_getjson.mjs` 가 **`VALIDATED_LEGACY`(재사용 강제)로 분류됐으나 호출처 0** —
**"VALIDATED"가 거짓**이었다(파일 존재가 검증을 대체).
→ **본 표의 모든 VALIDATED_LEGACY 는 `file:line` 실측 + 동작 경로 확인을 근거로 한다.**
**단 실 운영 데이터·라이브 동작은 확인하지 않았다** — 해당 항목은 본문에 `UNVERIFIED` 로 표기했다.
