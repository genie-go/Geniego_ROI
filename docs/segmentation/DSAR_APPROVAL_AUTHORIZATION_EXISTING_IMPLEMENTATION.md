# DSAR — Authorization Registry Foundation: 기존 구현 전수조사 (ⓑ · GROUND_TRUTH)

> EPIC **06-A-03-02-03-04 Part 1** · 289차 후속 · **능력 기반 재실증**(이름·주석 아닌 코드 정독) · 2 에이전트(서버측 enforcement + 역할/권한/UI) 병렬 · 읽기 전용 · 코드 변경 0.
> ★ **이 문서의 file:line 인용목록 = 하위 per-entity DSAR·ADR의 유일 허용 인용원(GROUND_TRUTH allowlist).** 여기 없는 새 file:line 인용 금지.
> ★이 블록은 실 authorization 코드가 대량 실재 → per-entity 판정 다수 PARTIAL/PRESENT-substrate/LEGACY.

## 0. 결론 (Verdict up front)

1. **★중앙 RBAC 게이트 실재 = `index.php:553-603`** — roleRank(`:554` viewer0/connector1/analyst2/admin3)·admin:keys scope(`:564-567`)·write 메서드 게이트(`:568-578`)·**tenant 강제주입**(`:600` X-Tenant-Id 무조건 덮어쓰기·위조 원천차단)·auth_tenant/role attach(`:590-593`). 인증 실패=401/403 fail-closed.
2. **★가장 Registry에 근접한 substrate = `TeamPermissions.php`** — RBAC 서열(owner>manager>member `:120-136`)·**acl_permission 매트릭스**(subject_type×menu×8action·manage 슈퍼셋 `:39,152-159,325-336`)·**ABAC data_scope 행필터**(effectiveScope/scopeSql `:236-322`·DENY_SCOPE fail-closed `:234`)·위임상한(`:615-647` DELEGATION_EXCEEDED). → Policy/Definition/Scope 정형화의 1차 흡수 대상.
3. **★Maker-Checker 실재**(승인권한 substrate) — Mapping approve(`:238-292` 자기승인차단/dedup/정족수/fail-closed actor)·Alerting decideAction(`:598-658` 정족수2·방금 수정). n-of-m/four-eyes 일반화 substrate.
4. **★진짜 부재(순신규)** — Authorization Registry/Policy/Definition 선언 구조체·Policy 버전화·Policy Set·Combining Algorithm·선언적 Default/Explicit Deny·Authorization Decision/Snapshot/Evidence/Digest/Ledger 결합·SoD/COI/Dual-Control(Maker-Checker 외).
5. **★위험/BLOCKED**: ① FE `writeGuard.js` **UI-only·fail-open**(서버 requireTeamWrite는 11개소뿐 → 116페이지 mutating 대다수가 member read-only를 UI로만 방어·§5.4) ② `requireFeaturePlan` 3중 fail-open(`UserAuth.php:72,82-84`) ③ `admin_roles/user_roles` **DORMANT**(저장·할당되나 런타임 미소비·죽은 RBAC) ④ isAdmin/requireAdmin/team_role **3~4중 중복 미러**(정책 드리프트).
6. **★중대 긍정**: 하드코딩 user-id/email 기반 권한부여 **부재**(admin 판정 전부 DB plan/plans/admin_level 컬럼 기반). §53 "Hardcoded User ID Allow"·"Email Authorization"=해당없음.
7. 선행 §3.2 Decision Foundation·§3.3 Governance(Resource Version/Approval Definition) 상당수 부재 → 정책 데이터화의 상위 결합 대상 일부 부재. 실 엔진=선행 신설 후 별도 승인세션·이번 차수 설계 명세(코드 0).

## 1. 서버측 enforcement GROUND_TRUTH 표

| 개념 | 판정 | file:line | 내용 | 서버강제/버전화/불변 |
|---|---|---|---|---|
| 중앙 RBAC roleRank | PRESENT | `index.php:554` | viewer0/connector1/analyst2/admin3 하드코딩 맵 | 강제 O·버전 X·snapshot X |
| admin:keys scope 게이트 | PRESENT | `index.php:564-567` | `/v421/keys`(+`/api` 별칭) admin:keys 또는 rank≥3 | 강제 O·버전 X |
| write 메서드 게이트 | PRESENT | `index.php:568-578` | POST/PUT/PATCH/DELETE에 write:* 또는 ingest→write:ingest/connector+ 또는 analyst rank≥2 | 강제 O·버전 X |
| strict no-tenant deny | PARTIAL | `index.php:585-587` | GENIE_STRICT_AUTH=1일 때만 무테넌트 키 403(기본 OFF) | opt-in fail-closed |
| tenant 강제주입(IDOR방어) | PRESENT | `index.php:590-593,600` | 인증키 tenant_id로 X-Tenant-Id 무조건 덮어쓰기·auth_tenant/role attach | 강제 O·불변 X |
| 키조회 예외→401 | PRESENT(양호) | `index.php:490-493` | fail-closed | — |
| 레이트리밋 catch→통과 | LEGACY(저위험) | `index.php:550` | 의도적 fail-open·인증 통과 후라 무권한노출 아님 | — |
| agency agt_ 위임 격리 | PRESENT | `index.php:74-104` | agency_client_link.status='approved' 매요청 재검증·읽기전용 write 차단 | 강제 O·fail-closed |
| basePath /api strip | PRESENT | `index.php:32-33` | setBasePath('/api')·Slim SPA catch-all 없음 | — |
| admin 게이트(세션) | PRESENT | `UserAdmin.php:33-62` | 세션→plan='admin' OR plans='admin' DB 재검증 | 강제 O |
| master/sub 권한상승 차단 | PRESENT | `UserAdmin.php:65-68,273,287,358,395` | admin_level!=='sub'=master·sub의 admin발급/대행 차단 | 강제 O |
| requireAdminUser | PRESENT | `UserAuth.php:2920`(호출 :2931~:3254)·master :2951 | plan='admin' 재검증 | 강제 O |
| 팀 RBAC 서열 | PRESENT | `TeamPermissions.php:120-136` | roleOf/isAdmin/isOwnerAdmin/isManagerAdmin·owner>manager>member | 강제 O·버전 X |
| roleOf fail-closed | PRESENT | `TeamPermissions.php:120-131` `:127` | 미해결→member·parent_user_id 키존재+빈값만 owner(권한상승 벡터 제거) | 강제 O |
| ABAC data_scope 행필터 | PRESENT(substrate) | `TeamPermissions.php:236-322` `:234` | effectiveScope/scopeSql·DENY_SCOPE fail-closed | 강제 O·버전 X |
| acl_permission 매트릭스 | PRESENT(substrate) | `TeamPermissions.php:39,152-159,325-336` | subject_type×menu×8action·manage 슈퍼셋 | 강제 O·버전 X |
| 위임 상한 검증 | PRESENT | `TeamPermissions.php:615-647` | assignableMap 교집합·DELEGATION_EXCEEDED | 강제 O |
| requireTeamWrite | PARTIAL | `UserAuth.php:1088-1127`(11개소만) | member read-only 서버강제·전역 아님 | 강제 O(부분) |
| SSO group→role | PRESENT | `EnterpriseAuth.php:70,78-88,476-480` | sso_group_role_map·manager>member·owner 미승격 | 강제 O |
| api_key scopes 화이트리스트 | PRESENT | `Keys.php:99-113,198-206`·`UserAuth.php:4204-4290` | scope 화이트리스트+역할상한·owner-only CRUD | 강제 O |
| sub-admin 메뉴제한 | PRESENT | `UserAuth.php:170,1433,1465-1489`·`AdminMenu.php:361` | subMenuAllowed | 강제 O |
| **Policy Set/Combining Algorithm** | **ABSENT** | 주석만 `UserAuth.php:332-333` | 선언적 정책결합 부재 | — |
| **Versioned Policy** | **ABSENT** | — | 인가규칙=코드 상수(하드코딩) | — |
| **Explicit/Default Deny 선언체** | **ABSENT** | idiom만(DENY_SCOPE·__anon__) | 정책 데이터로서 Deny 선언 없음 | — |
| **Authorization Decision/Snapshot/Evidence/Digest** | **ABSENT** | — | 판정결과 불변저장/evidence/ledger 결합 부재(audit append만) | — |
| **Authorization Registry/Definition** | **ABSENT** | — | 정책 데이터 선언 구조체 부재 | — |

## 2. 역할/권한/테이블 GROUND_TRUTH 표

| 개념 | 판정 | file:line | 비고 |
|---|---|---|---|
| isAdmin(plan) | PRESENT | `TeamPermissions.php:132` | plan==='admin'||plans==='admin'·roleOf와 직교 상위 |
| isOwnerAdmin/isManagerAdmin | PRESENT | `TeamPermissions.php:134,136` | isAdmin∨owner / isAdmin∨{owner,manager} |
| normTeamRole/teamCanWrite(서버미러) | PRESENT | `UserAuth.php:1099-1111` | member=read-only·manager=TEAM_OWNER_ONLY 제외·owner=전체 |
| FE writeGuard(member 쓰기차단) | **UI_ONLY(위험)** | `frontend/src/services/writeGuard.js:13,61-90,73` | apiClient 인터셉터·fail-open·"Phase3b 후속" 자인 |
| 하드코딩 plan==='admin' 분포 | PRESENT(다수) | `UserAuth.php:72,104,3668,3712,3738,4208`·`UserAdmin.php:273,306,321,437,458`·`Compliance.php:203`·`Pnl.php:522`·`Keys.php:191,206`·`SystemMetrics.php:50` | SSOT 부재·Registry 통합 리팩터 표면 |
| 하드코딩 user-id/email authz | **ABSENT(긍정)** | — | 전부 DB plan/plans/admin_level 기반·소스 리터럴 authz 부재 |
| admin_roles/user_roles 커스텀롤 | **DORMANT** | `UserAdmin.php:627-641,788-812` | permissions 저장/할당되나 런타임 접근판정 미소비(죽은 RBAC) |
| SoD/COI/four-eyes/n-of-m | **ABSENT** | — | Maker-Checker 외 부재(후속 Part) |
| requireFeaturePlan fail-open | **위험** | `UserAuth.php:64-84` `:68,72,82-84` | plan null→allow·catch→allow·admin bypass(과금게이트·정책엔진 도입 시 fail-closed 전환 필요) |
| subjectScope catch→null | **조건부 fail-open** | `TeamPermissions.php:211,224` | ACL 조회실패 시 빈값·상위서 무제한 가능(effectiveScope :251 DENY_SCOPE로 부분보완) |

**실재 권한/정책 테이블**: `acl_permission`·`data_scope`·`team`(`TeamPermissions.php:152-172`)·`api_key`(scopes_json·`Db.php:942`)·`alert_policy`(`Db.php:558`)·`tenant_security_policy`(`UserAuth.php:3580`)·`sso_group_role_map`(`EnterpriseAuth.php:70`)·`admin_roles`/`user_roles`(`UserAdmin.php:634-638`·DORMANT)·`wms_permissions`(`Wms.php:72,114`)·`plan_menu_access`(`AdminPlans.php:393`)·`team_channel_mapping`(`Db.php:712`).

## 3. ★중복 authorization 유틸 (§59 중복감사 근거)

- **isAdmin 정의 4개**: `TeamPermissions.php:132`·`SystemMetrics.php:50`·`UserAdmin.php:65`(isMaster)·FE `App.jsx:377`.
- **requireAdmin 정의 3개**: `UserAdmin.php:33`·`DbAdmin.php:42`·`EventPopup.php:96` + `UserAuth.php:2920`(requireAdminUser).
- **team_role 정규화 3중 미러**: `TeamPermissions.php:120`(roleOf) ↔ `UserAuth.php:1099`(normTeamRole) ↔ FE `teamRolePolicy.js`(주석 "정합 미러" 자인 `writeGuard.js:15`).
- **role==='admin' scope 유틸 중복**: `Keys.php:191,206` ↔ `UserAuth.php:4208`.
- **isMaster/admin_level 분산**: `UserAdmin.php:65-68` ↔ `UserAuth.php:807,1049,1465,2643`.

## 4. Part 1 착수 판정

- **실·재사용(확장·재생성 금지)**: **TeamPermissions RBAC/ABAC 엔진**(`:120-322`·acl_permission+data_scope·fail-closed)=Registry/Policy/Scope 흡수 substrate · **index.php 중앙 RBAC**(`:553-603`)=Policy 데이터화 1차 대상 · **Maker-Checker**(Mapping/Alerting)=Authority/Dual-Control substrate · api_key scopes(`Keys.php:99-113`) · SSO group→role(`EnterpriseAuth.php:78`) · agency 위임(`index.php:74-104`) · tenant 강제주입(`index.php:600`).
- **진짜 부재(순신규 설계)**: Authorization Registry/Registry Scope/Domain/Policy/Policy Set/Definition/Version/Profile · Subject/Resource/Action/Environment Contract · Context/Snapshot · Request/Evaluation/Decision/Result/Effect · Reason/Obligation/Advice/Constraint/Denial/Challenge · Exception/Override Foundation · Decision Snapshot/Evidence/Audit/Digest · Decision/Commit Binding · Validity/Expiration · Revalidation/Drift/Cache/Simulation/Reconciliation/Migration Foundation · Kill Switch · 선언적 Default/Explicit Deny · Policy 버전화/Combining Algorithm.
- **구현 판정 = 대부분 ABSENT/PARTIAL-substrate/BLOCKED_PREREQUISITE** — 정책 데이터 선언체·판정결과 불변저장은 순신규, 선행 Decision/Resource Version 부재로 상위결합 일부 공회전. 실 substrate 실재로 실 엔진은 "TeamPermissions/index.php RBAC를 Canonical Registry/Policy로 정형화 + Decision 결합" 조립. 이번 차수=설계 명세(코드 0).
- **★위험 등재(후속 enforcement Part)**: writeGuard UI-only(서버 전역 미배선)·requireFeaturePlan fail-open·admin_roles DORMANT·중복 유틸 SSOT화 — Part 1은 Canonical Contract로 통합 방향만 설계, 실 배선/수정은 후속.

## 5. 크로스블록 substrate (Authorization Digest/Audit/Snapshot가 재사용하는 선행 블록 정본 — 인용 허용)

Authorization Digest(§37)·Audit(§36)·Decision Snapshot(§34)·Override(§33)는 **선행 03-02 Cryptographic Hash Chain 블록의 검증된 정본**을 재사용한다(순신규 crypto 발명 금지). 아래는 그 블록 GROUND_TRUTH에서 이미 file:line 검증된 실 substrate로, 본 블록 per-entity DSAR이 개념 재사용으로 인용할 수 있다(신규 authorization 인용원 아님·계상은 KEEP_SEPARATE):

- `SecurityAudit.php:24,27,39,48-68`(`:8` INSERT/SELECT만) — 유일 실 append-only SHA-256 해시체인 + verify. Authorization Digest의 Crypto Policy·Audit의 tamper-evident 기록 매체(단 감사트레일≠authorization decision).
- `MediaHost.php:93` — 내용주소 CAS(Evidence 저장 substrate).
- `media_gc_cron.php:35,43` — append-only 로그 90일 물리 DELETE(불변성 위협·retention은 payload만). Authorization Decision/Snapshot 불변성 설계 시 대상 제외.
- 장식 오인 금지(03-02 정정 계승): `menu_audit_log.hash_chain` verify()=0([[reference_menu_audit_log_not_tamper_evident]]).

정본 결정=[[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]]. 중복감사=[[DSAR_APPROVAL_AUTHORIZATION_DUPLICATE_IMPLEMENTATION_AUDIT]]. per-entity=§67 DSAR 세트(ⓒ). 관련 [[project_n231_team_permission_rbac]]·[[project_n183_phase3_team_rbac]] · 크로스블록 [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]].
