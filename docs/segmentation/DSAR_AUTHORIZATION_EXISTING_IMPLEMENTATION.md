# DSAR — 기존 구현 분류 (§50)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.**

## 분류 결과 (전부 실측 file:line)

| 현행 구현 | 분류 | 근거 |
|---|---|---|
| **TeamPermissions::ACTIONS**(view/create/update/delete/**approve**/export/**execute**/manage) | **CANONICAL_AUTHORIZATION_ACTION**(승격·재사용) | TeamPermissions.php:39 |
| **TeamPermissions::DATA_SCOPES**(company/brand/team/campaign/product/channel/warehouse/partner/own) | **CANONICAL_AUTHORIZATION_SCOPE**(승격·재사용) | TeamPermissions.php:41 |
| **`acl_permission`**(메뉴 × 8동작 매트릭스) | **CANONICAL_AUTHORIZATION_PERMISSION**(승격·재사용) | TeamPermissions.php:15 |
| **team_role**(owner>manager>member) + team 엔터티 + manager_user_id | **CANONICAL_AUTHORIZATION_ROLE**(1/3 계통) | TeamPermissions.php:13/17 |
| **api_key RBAC**(roleRank viewer0<connector1<analyst2<admin3) | **CANONICAL_AUTHORIZATION_ROLE**(2/3·API_CLIENT) | index.php:554 |
| **api_key 스키마**(tenant_id·key_prefix·**key_hash SHA-256**·role·**scopes_json**·is_active·last_used_at·use_count·**expires_at**·idx(tenant_id,is_active)) | **CANONICAL_AUTHORIZATION_SUBJECT(API_CLIENT)**(재사용) | Db.php:942-955 |
| **scope 게이트**(`admin:keys`/`write:*`/`write:ingest`) + **★192차 `/api` 별칭 권한상승 차단** | **VALIDATED_LEGACY**(재사용·**영구 규칙: 신규 게이트도 `/api` 변형 동시 매칭**) | index.php:562-575 |
| **admin master/sub**(requireMasterAdmin2 5핸들러 · requireSubAdminMenu) | **CANONICAL_AUTHORIZATION_ROLE**(3/3) · **CONSOLIDATION_REQUIRED** | 286차 |
| **PlanPolicy**(`const RANK` · 기능키→최소 요구 플랜 · `rank()`) | **CANONICAL_AUTHORIZATION_POLICY**(기반·재사용) | PlanPolicy.php:19-24/41 |
| **requirePro / requirePlan**(호출부 **351**) | **VALIDATED_LEGACY** + **CONSOLIDATION_REQUIRED** | UserAuth.php:327-345 |
| **Tenant Isolation**(agency 토큰 **서버바인딩 tenant 주입·위조불가**+최소권한 role) | **VALIDATED_LEGACY**(강력·재사용) | index.php:97-100 |
| **`authedTenant`**(세션 테넌트 자체해석·**64 핸들러**) · `tenant_id=?` RLS 전역 | **VALIDATED_LEGACY** + **CONSOLIDATION_REQUIRED**(PEP 분산) | 64 핸들러 |
| **action_request IDOR 차단**(타 테넌트 승인/거부 차단·208차 P0) + 승인 워크플로(decision/approvals_json/status) | **VALIDATED_LEGACY**(Approval 정본·재사용) | Alerting.php:545-546/578-582 |
| **`tools/guard_headerless_getjson.mjs`**(275차 인가 회귀 ~~CI 가드~~ → **pre-commit 가드(로컬)**·**289차 G15 배선**) | **VALIDATED_LEGACY**(Lint 기반) · `is_effective=true`(289차부터) | 275차 신설 / **289차 배선** |
| channel_credential **AES-256-GCM**(267차 fail-closed) · ChannelCreds 마스킹 · **`no_credentials` 게이트** | **VALIDATED_LEGACY**(Credential Access 기반) | 267차 · AdAdapters.php:19 |
| EnterpriseAuth(SAML/OIDC/SCIM) · UserAuth 세션(genie_token) · **MFA(mfa_policy)** · OAuth.php | **KEEP_SEPARATE_WITH_REASON**(**인증 ≠ 인가**·§4.7) | — |
| audit_log 12파일(도메인별) | **KEEP_SEPARATE_WITH_REASON**(스키마 상이) | AdminGrowth.php:157 · AdminMenu.php:123 · Dsar.php:213 |
| Field Masking(AttributionEngine · ChannelCreds · UserAuth **산재**) | **CONSOLIDATION_REQUIRED**(단일 Field Access Profile) | 3+ 곳 |
| Impersonation(UserAdmin 회원 대행) | **VALIDATED_LEGACY + 위험 이력**(286차 platform_growth act-as tenant 하이재킹) → **5-4** | UserAdmin.php · routes.php |
| **`team_role` fail-open**("미설정=레거시 단독회원=owner") | **★MIGRATION_REQUIRED** — §4.1 Deny-by-default 상충 · **레거시 호환 의도로 보임** · **PM 코드 재증명 전 P0 단정 금지** · **5-2 판정** | AdminMenu.php:52-54 |
| **PlanPolicy ↔ 프론트 planMenuPolicy.js 수동 동기화** | **★MIGRATION_REQUIRED**(UI_API_MISMATCH · 286차 rank 맵 붕괴로 드리프트 실현) → **5-6** | PlanPolicy.php:14 · UserAuth.php:330 |
| **중앙 PDP · Decision 기록 · Policy Version · Obligation · Conflict · Reconciliation · ABAC Context(device/network/risk/session_age/amount) · Field Access Profile · Break Glass · Access Review · Production/Sandbox 권한 분리 · Financial/Data Clearance** | **NOT_APPLICABLE(부재·grep 0 → 신설)** | — |

## 규칙
**VALIDATED_LEGACY 는 재사용 강제**(헌법 Golden Rule = Replace 가 아니라 Extend). **NOT_APPLICABLE 을 "있다고 가정"하고 배선 금지**(287차 죽은 스켈레톤 교훈). **MIGRATION_REQUIRED 2건은 본 세션 미수정**(비파괴 · 별도 판정 세션).
