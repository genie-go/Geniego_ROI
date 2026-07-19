# DSAR — Role Assignment 기존 구현 전수조사 (EPIC 06-A-03-02-03-04 Part 3-3 · ⓑ GROUND_TRUTH)

- **상태**: 전수조사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **방법**: 능력 기반 전수조사 — grep/read 코드 정독(백엔드 PHP 전역+FE+migrations+bin cron) · 2 Explore 스레드 병행 + 핵심 인용 firsthand 재검증. 모든 발견 `파일:라인`. **반날조: 없는 것을 있다고, 있는 것을 없다고 하지 않음. ★실재 과신(있으니 완성)·부재 과장(거버넌스 없으니 할당 없음) 양방향 회피.**
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **선행(재사용)**: Part 3-1 [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md) · Part 3-2 [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md)

---

## 0. 총평 (한 줄)

**Part 3-2(전건 순신규)와 대조 — Role Assignment는 즉시쓰기 substrate가 5개 자원에 실재(PARTIAL).** 그러나 그 위의 거버넌스 계층(Version·Approval·Lifecycle 상태머신·Snapshot·Digest·Evidence·Drift·Effective 버전기준 Resolution)은 전 구간 부재(순신규). ★한 차례 role-부여 API(admin_roles/user_roles)가 시도되었으나 "인가 게이트 미소비 DORMANT"로 289차 폐기(`c1646bc`) — 신규 거버넌스는 반드시 실제 인가에 소비되는 role/permission에만 적용해야 함(장식화 재발 방지).

---

## 1. 실존 Assignment 실행 substrate (5개 자원 · PARTIAL — 즉시쓰기 실재·거버넌스 부재)

### 1.1 team_role 직접 할당 (`UserAuth.php` · 가장 핵심)
- **팀원 생성+role 부여**: `createTeamMember`(`:1281-1366`)·INSERT team_role(`:1334`/`:1342`·memberRole `:1299`, 화이트리스트 manager/member).
- **역할 변경**: `updateTeamMember`(`:1369-1423`)·UPDATE `team_role=?`(`:1392`·`in_array(['manager','member'])`)·owner 대상 변경 차단(`:1384-1386`).
- **소프트삭제(정지 대용)**: `deleteTeamMember`(`:1426-1451`)·UPDATE `is_active=0`(`:1445`)·세션 폐기(`:1446`)·role 값 자체는 불변.
- **owner 부여/영속**: 신규가입 INSERT owner(`:691`)·UPDATE owner(`:589-593`).
- **sub-admin 발급**: `createSubAdmin`(`:1561-1658`)·신규 INSERT `admin_level='sub',team_role='member'`(`:1639-1648`)·기존회원 승격 UPDATE(`:1613-1621`)·권한상승 차단 `admin_level='sub'` 강제(`:1352-1353`).
- **★소유권 이전(ownership transfer)=부재(grep 0)**. owner는 모든 변경대상에서 명시 배제(`:1384`·`:1441`·`EnterpriseAuth.php:405,418`).

### 1.2 SSO/SCIM provisionUser 할당 (`EnterpriseAuth.php`)
- `provisionUser`(`:483-511`)=OIDC/SAML/SCIM 3프로토콜 공용. 신규 INSERT `team_role=$role`(`:507-509`·mappedRole 우선 `:504`)·기존 UPDATE 동기화(`:492-497`)·**owner 강등 금지**(`:495`). `roleForGroups`(`:78-91`·sso_group_role_map·manager 우선). OIDC groups(`:241,243`)·SAML groups/memberOf(`:298-299,301`·★서명 서브트리만·XSW 방지·현 세션 배선). scimUpdateUser는 team_role 변경 불가(active/name만·`:388-410`).

### 1.3 api_key.role 할당 (★2중 병렬 구현)
- **`/v421/keys`(Keys.php)**: create(`:81-133`·validRoles `:95-98`·scope 상한 `allowedScopesForRole` `:101-114,201-210`)·revoke(`:135-148`·is_active=0)·rotate(`:150-187`). **감사 0(grep 0·파일 전체)**.
- **`/auth/api-keys`(UserAuth.php:4300-4399)**: apiKeysCreate/Revoke/Rotate(INSERT `:4356`·**audit `:4360,4375,4398`**). scope 상한검증 미러 안 됨(default 고정이라 우회는 없으나 divergent).
- → 동일 자원(api_key.role)에 **감사여부가 진입경로에 따라 비대칭**.

### 1.4 wms_permissions 할당 (`Wms.php` · 최소 통제)
- `savePermission`(`:505-517`)=**항상 INSERT만**(`:514`·멱등성 부재·재호출=행 누적)·**role 화이트리스트 없음**(`:515` 임의 문자열)·**UNIQUE 없음**(`:72-76,114`). `deletePermission`(`:519-526`)=하드 DELETE(is_active/status 컬럼 없음). **감사 0**(파일 내 6 audit는 전부 재고이벤트).

### 1.5 pm_task_assignees 할당 (`PM/Assignees.php` · 유일하게 감사 내장)
- ROLE_ENUM owner/contributor/reviewer/observer(`:14`). add(`:17-49`·INSERT `:31-34`·UNIQUE 409 `:36-38`·**auditLog `:41-47`→pm_audit_log**)·remove(`:52-72`·DELETE·**audit `:65-70`**). 역할변경 PATCH 부재(remove+add). team_role과 별개 네임스페이스(과제 단위).

## 2. 할당 라이프사이클 실재 여부 (is_active 이진 토글이 유일 근접)

| 자원 | revoke | suspend | expire | restore |
|---|---|---|---|---|
| team_role(팀원) | soft-delete만(`UserAuth.php:1445` is_active=0)·role값 유지·restore 경로 없음 | is_active=0이 유일 | **부재(grep 0)**·role_expires 컬럼 없음 | 부재 |
| sub-admin | **DELETE 라우트 부재** | `updateSubAdmin`(`:1679-1682`) is_active 토글 | 부재 | is_active=1 재토글 |
| api_key | `Keys.php:135-148`/`UserAuth.php:4364-4377` is_active=0 | revoke=suspend 미구분 | **실재**·`expires_at`(`Keys.php:119,170`)+요청시점 강제(`index.php:518-520`·firsthand 확인)·단 자동 revoke 워커 없음 | 부재 |
| wms_permissions | 하드 DELETE(`Wms.php:519-526`)·is_active 없음 | **부재** | **부재** | 부재 |
| pm_task_assignees | 하드 DELETE(`Assignees.php:52-72`) | 부재 | 부재(assigned_at만) | 부재 |

★**role/permission 만료 cron 부재**(bin 34 스크립트 전수 0). 유일 시간기반 실효=api_key `expires_at` 게이트-체크(워커 아님).

## 3. 할당 승인 게이트 = 부재 (직접 write) · assignableMap ≠ role 부여상한

- **승인 workflow 부재(전수 grep 0)**: `pending_approval`/`approveQueue`/two-eyes/maker-checker 매치는 전부 캠페인/가격 도메인(`AdminGrowth.php:1063` 등)·role 부여와 무관. 5경로 전부 caller 권한검증 통과 즉시 단일 트랜잭션 직접 반영.
- **assignableMap/DELEGATION_EXCEEDED=acl_permission(메뉴권한) 위임상한이지 team_role 부여 아님**: `assignableMap`(`TeamPermissions.php:354-360`·firsthand 확인·owner=null 무제한·manager=팀 acl맵·member=빈맵)·`DELEGATION_EXCEEDED` 즉시 403(`:644-647`). ★team_role 세팅(`createTeamMember`/`updateTeamMember`)엔 미적용 — role 부여상한은 값 화이트리스트(`['manager','member']`)로만 제한. "역할 부여" vs "권한(acl) 위임"의 상한 강제가 분리됨.

## 4. Subject 유형 커버리지

| Subject | 실체 | 근거 |
|---|---|---|
| Human(테넌트 사용자) | app_user+team_role | §1.1 |
| API Client | api_key(viewer/connector/analyst/admin) | §1.3·`Keys.php:95` |
| Service Account/System Actor/Robot | **부재** | grep 매치는 Google GCP 외부 자격증명(내부 role Subject 아님)·cron=시스템권한 직접 DB(RBAC 미경유) |
| Employee/External/Partner/Vendor | **Team 차원만**(`TeamPermissions::TEAM_TYPES` `:44-49` partner_*)·Subject 차원 플래그/차등 없음 | partner 멤버도 동일 team_role 3값·role 부여 로직에 위험차등 0 |
| pm 담당자 | pm_task_assignees(4역할·독립 네임스페이스) | §1.5 |
| acl_permission subject | `'team'`\|`'member'`만(`TeamPermissions.php:154,162`) | api_key/service-account는 acl_permission subject 불가 |

★**역사적 반례**: `admin_roles/user_roles` + `PATCH .../role`(assignRole)·`DELETE .../roles`(revokeRole)가 289차 P3(`c1646bc`)에 **"인가 게이트 미소비 DORMANT(장식) RBAC"로 폐기**. 현재 읽기/쓰기 함수 0(grep 0·고아 테이블 유지). 신규 거버넌스=실제 인가 소비 role에만 적용(재장식화 방지).

## 5. 감사 비일관 (단일 SSOT 아님)

- **감사 있음**: sub-admin(`UserAuth.php:1626,1656,1708`)·apiKeys(`:4360,4375,4398`)·TeamPermissions team CRUD/acl 위임(`:470,502,527,531,548,588,655,747`·`UserAuth::logAudit`)·PM assignee(`Assignees.php:41-47,65-70`→pm_audit_log).
- **감사 없음(고빈도 일상경로)**: 팀원 초대/역할변경/비활성(`createTeamMember`/`updateTeamMember`/`deleteTeamMember`)·SSO/SCIM provisionUser·`/v421/keys`·wms_permissions.
- **2중 audit 테이블 병존**: `auth_audit_log`(SSOT 표방·`TeamPermissions.php:19`)+`pm_audit_log`(PM 별도·`Shared.php:129-148`) → 완전 SSOT 아님.

## 6. Substrate ↔ Governance 경계 요약 (판정)

- **실재(PARTIAL)**: 5자원 즉시쓰기·is_active 정지(3/5)·api_key expires_at(유일 만료)·acl 위임상한(team_role엔 미적용)·감사 일부.
- **부재(순신규)**: Assignment Registry/Definition 구조체·Version(변경이력 diff)·Approval workflow·Lifecycle 상태머신(Requested~Archived 12상태)·Snapshot/Digest/Evidence·Drift/Revalidation/Reconciliation·Effective **버전기준** Resolution·Conflict/SoD·Temporary/Scheduled/Emergency/Break-glass/Delegated Assignment·Assignment Cache/Runtime Guard(전용)·Simulation.
- **정직 판정 = PARTIAL-substrate/ABSENT-governance/BLOCKED_PREREQUISITE**. 실 엔진="5 분산 즉시쓰기 경로를 Canonical Assignment Registry로 통합 + Version/Approval/Lifecycle/Snapshot 거버넌스 신설". 선행 Permission Engine·Role Registry/Hierarchy·Decision Core 실구현 후 RP-002. 이번 차수 코드 0.

## 7. 거버넌스 계층 근접 substrate 3종 (전부 assignment 미적용 · DSAR wave 인용원)

거버넌스 계층(§6 부재 목록)은 대부분 순신규이나, **비-assignment 도메인에 근접 패턴이 실재**한다. per-entity DSAR는 이 목록만 근접 substrate로 인용 가능·전부 "assignment에 미적용" 명시.

| 능력 | 근접 substrate(위치) | file:line | assignment 적용 여부 |
|---|---|---|---|
| **Effective Resolution** | `effectiveForUser`(owner/admin=full·manager=팀 acl·member=clamp)·`effectiveScope`(fail-closed DENY_SCOPE) | `TeamPermissions.php:366-394`·`:236-265` | ★근접(유효권한 계산)이나 **assignment 엔티티/version 무참조·매 요청 라이브 재계산·캐시 없음** |
| **Immutable Evidence(tamper-evident)** | `SecurityAudit::verify`(해시체인 재계산·GENESIS·broken_at) | `SecurityAudit.php:56-68`(firsthand 확인) | ★**유일 실 tamper-evident 체인이나 role assignment 이벤트 미기록**(TeamPermissions에 SecurityAudit 문자열 0). 실 소비=auth.login/breakglass/plan.* 등 |
| **변경 이력(mutable)** | `auth_audit_log`(append만·해시체인/verify 없음) | `UserAuth.php:4165,4174-4197` | 근접이나 mutable·비일관(§5)·구조화 diff 아닌 detail 문자열 |
| **Runtime Guard** | `writeGuard.js`+`guardTeamWrite`(member 쓰기 403·중앙 미들웨어) | `UserAuth.php:1167`·`index.php:72-85`·`teamRolePolicy.js:50-55` | ★근접이나 **정적 team_role 값 게이트지 assignment 생애주기(만료/정지/취소) guard 아님**(status/expiry 개념 부재) |
| **Snapshot/baseline(비-Role)** | `menu_defaults` snapshot·`menu_audit_log` hash_chain(★verify 없음=tamper-evident 아님) | `AdminMenu.php:119-138,294-311`·`:123,199-219` | 메뉴트리 전용·role/acl 미재사용([[reference_menu_audit_log_not_tamper_evident]]) |
| **권한 위임상한(≠role 위임)** | `assignableMap`(owner=null·team acl맵)·`clampActions`·`DELEGATION_EXCEEDED` | `TeamPermissions.php:354-360,396-402,644-647`(firsthand 확인) | acl_permission 위임상한이지 team_role 부여 아님(289차 06-A-01 정합) |
| **대행(≠role 부여)** | `UserAdmin::impersonate`(user_session.impersonated_by) | `UserAdmin.php:451,478-489` | proxy auth 세션 대행이지 새 role 발급 아님 |
| **인증우회(≠role 부여)** | break-glass(`GENIE_BREAKGLASS_*`·MFA 우회·auth.breakglass→SecurityAudit) | `UserAuth.php:790-801,929-935,995-999` | 로그인 인증 우회지 임시 role 발급·자동만료 아님(289차 break-glass MFA=BLOCKED_SECURITY 계열) |
| **권한 전체교체(version 소실)** | `replacePerms`/`replaceScope`(DELETE→INSERT) | `TeamPermissions.php:324-336,337-346`(firsthand 확인) | in-place 교체·이전 상태 보존 안 됨(version 부재의 실증) |

★위 근접 패턴은 전부 **assignment governance(version/approval/lifecycle/snapshot 기준)에 미적용**. 실 엔진은 조립 참조로만 재사용하고 대상(메뉴/세션/로그인/acl)을 Assignment 엔티티로 오흡수하지 않는다.
