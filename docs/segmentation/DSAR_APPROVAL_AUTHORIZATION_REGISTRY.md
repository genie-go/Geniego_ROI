# DSAR — Authorization Registry (§7)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · 인용원=GROUND_TRUTH([`DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION.md)) 전용.

## 1. 원문 전사 (Canonical Contract)

§7 `APPROVAL_AUTHORIZATION_REGISTRY` 필수 필드 (원문 전사):

- `registry id` · `tenant` · `code` · `name`
- `type` · `authoritative source`
- `applicable domains` / `subject type` / `resource type` / `action type`
- `supported policy types` / `supported combining algorithms`
- `default effect`
- **`explicit deny supported`** · **`default deny enforced`**
- `override supported` · `exception supported` · `simulation supported` · `reconciliation supported`
- `snapshot required` · `evidence required` · `audit required` · `commit revalidation required` · **`fail closed required`**
- `owner org` · `business owner` · `technical owner` · `security owner`
- `active version` · `valid` · `status` · `immutable digest` · `evidence`

**TYPE enum (17종)**: `PLATFORM` / `TENANT` / `LEGAL_ENTITY` / `ORGANIZATION` / `APPROVAL` / `FINANCIAL` / `PAYMENT` / `SETTLEMENT` / `CONTRACT` / `CLAIM` / `REBATE` / `SECURITY` / `COMPLIANCE` / `ADMINISTRATION` / `DATA_ACCESS` / `INTEGRATION` / `CUSTOM`.

**STATUS enum (8종)**: `DRAFT` / `REVIEW` / `APPROVED` / `ACTIVE` / `SUSPENDED` / `DEPRECATED` / `RETIRED` / `ARCHIVED`.

의미: Authorization Registry는 테넌트·도메인 단위로 **어떤 인가 등록소가 존재하며 그 authoritative source·지원 Policy Type/Combining Algorithm·default effect·`default deny enforced`·`explicit deny supported`·`fail closed required`·snapshot/evidence/audit/commit-revalidation 강제 여부를 데이터로 선언**하는 최상위 등록소다. Policy(§10)·Policy Set(§11)·Definition(§12)·Version(§13)·Profile(§14)의 상위 루트이자 실 Authorization Decision(§24)의 소속 컨테이너다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **인가 등록소(정본 데이터 선언)는 부재** — `registry id`/`code`/`type`/`authoritative source`/`default deny enforced`/`fail closed required`/`active version`을 데이터로 선언하는 구조체 전무. GROUND_TRUTH §1 표에서 **Authorization Registry/Definition = ABSENT**(`정책 데이터 선언 구조체 부재`).
- 실존하는 유사 substrate(코드 상수 기반 enforcement, 등록소 아님):
  - **중앙 RBAC 게이트** = `index.php:553-603` — roleRank 하드코딩 맵(`index.php:554` viewer0/connector1/analyst2/admin3)·admin:keys scope(`index.php:564-567`)·write 메서드 게이트(`index.php:568-578`)·**tenant 강제주입**(`index.php:600`)·auth_tenant/role attach(`index.php:590-593`). 인증 실패=401/403 fail-closed이나, 규칙이 데이터 아닌 **코드 상수**로 열거·조회 불가.
  - **acl_permission 매트릭스**(`TeamPermissions.php:39,152-159,325-336`)·**ABAC data_scope 행필터**(`TeamPermissions.php:236-322`·DENY_SCOPE fail-closed `TeamPermissions.php:234`) — 권한/스코프가 DB 테이블로 실재하나, 이는 팀 단위 ACL이지 **등록소 type/status/version/default-deny를 선언하는 registry가 아니다.**
- `type`/`authoritative source`/`supported policy types`/`supported combining algorithms`/`default effect`/`default deny enforced`/`explicit deny supported`/`fail closed required` 를 데이터로 선언하는 등록소 → **no hits**.
- `active version`/`valid`/`status`(등록소 버전·상태) → **no hits**. 인가규칙 버전화 전무(GROUND_TRUTH §1 **Versioned Policy = ABSENT**).
- **★중대 긍정**: 하드코딩 user-id/email 기반 authz **부재**(GROUND_TRUTH §2·§0.6 — admin 판정 전부 DB plan/plans/admin_level). §53 "Hardcoded User ID Allow"·"Email Authorization"=해당없음.

## 3. 판정

- **Verdict: ABSENT** (선언적 등록소 부재). 단, **PRESENT-substrate 대량 실재** — index.php 중앙 RBAC·TeamPermissions RBAC/ABAC는 Registry가 흡수·정형화할 실 데이터/enforcement 지점.
- **선행 의존**: Registry는 인가 전 군의 상위 루트 — 선행 §3.2 Decision Foundation·§3.3 Governance(Approval Definition/Resource Version) 상당수 부재로 하위 Definition(§12)·Version(§13)·Decision(§24) 상위결합 일부 공회전(BLOCKED_PREREQUISITE). §3.1 Actor Identity Foundation(직전 블록)만 Subject Contract substrate로 부분 PRESENT.
- **cover: 0** (인가 등록소 데이터 선언 전무). index.php RBAC·TeamPermissions는 registry 대체가 아니라 **흡수 대상 substrate** — KEEP_SEPARATE로 계상하지 않고 Registry 하위 Policy 데이터로 이관.

## 4. 확장/구현 방향 (설계)

- **Golden Rule=Extend**: 순신규 `approval_authorization_registry` 등록소 — 테넌트·도메인 단위로 `type`(17종)·`status`(8종)와 `default deny enforced`·`explicit deny supported`·`fail closed required`·snapshot/evidence/audit/commit-revalidation 강제를 **데이터로 선언**. 중복 Authorization Engine 신설 금지 — **index.php 중앙 RBAC(`index.php:553-603`)와 TeamPermissions RBAC/ABAC(`TeamPermissions.php:120-322`)를 Registry가 관장하는 Policy 데이터로 흡수**(하드코딩 roleRank 맵→`supported policy types`·acl_permission/data_scope→Scope §8·Policy §10 데이터화).
- **Mandatory Control(고객 비활성 불가·§5.15)**: `default deny enforced`·`fail closed required`를 Registry에서 선언하고 §45 Fail-Closed·§55 Runtime Guard로 실집행 — 현재 `index.php:600` tenant 강제주입은 실재하나 default-deny/fail-closed는 **플래그도 선언도 전무**(idiom만: DENY_SCOPE `TeamPermissions.php:234`·__anon__).
- **실위험(후속 enforcement Part에서 수정)**: ① FE `writeGuard.js:13,61-90` **UI-only·fail-open**(서버 requireTeamWrite는 `UserAuth.php:1088-1127` 11개소뿐) → Registry `fail closed required`가 서버 전역 재검증을 강제하도록 설계, 실 배선은 후속. ② `requireFeaturePlan` fail-open(`UserAuth.php:64-84` `:68,72,82-84` plan null→allow·catch→allow) → Registry `default effect`=DENY로 정형화 대상. ③ `admin_roles/user_roles` DORMANT(`UserAdmin.php:627-641,788-812` 저장·할당되나 런타임 미소비) → Registry 편입 시 실 소비 배선. Part 1은 Canonical Contract 통합 방향만 설계, 실 수정은 후속.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_POLICY]] · [[DSAR_APPROVAL_AUTHORIZATION_DEFINITION]] · [[project_n231_team_permission_rbac]].
