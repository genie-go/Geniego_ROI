# EXISTING_PERMISSION_FEATURE_MAP

231차 팀·권한 작업 착수 전, **이미 존재하던** 권한/회원/RBAC 인프라 전수 매핑 (중복 신설 방지 근거).

## 백엔드

| 영역 | 위치 | 내용 |
|---|---|---|
| 멤버 컬럼 | `UserAuth::ensureTenantColumns` (app_user) | `tenant_id, parent_user_id, team_role(owner/manager/member), team_name, admin_level(master/sub), admin_menus(JSON {path:view\|edit}), agent_mode, photo` |
| 팀원 CRUD | `UserAuth::listTeamMembers/createTeamMember/updateTeamMember/deleteTeamMember` | `/auth/team/members` GET/POST/PATCH/DELETE — 하위계정 발급, 소프트 삭제+세션 폐기 |
| 팀 RBAC 가드 | `UserAuth::teamManager / callerTenant / normTeamRole / teamCanWrite / requireTeamWrite` | `TEAM_OWNER_ONLY`(billing/subscription/plan_change/account_delete/team_owner_change/api_keys). member=읽기전용, manager=owner전용 제외 쓰기 |
| 하위 관리자 | `UserAuth::listSubAdmins/createSubAdmin/updateSubAdmin` | `/auth/admin/sub-admins` — master admin 이 sub-admin 발급(plan=admin, admin_menus 경로별 view/edit) |
| API Key RBAC | `public/index.php` 미들웨어 | roles `viewer<connector<analyst<admin` + scopes(`write:*`, `write:ingest`, `admin:keys`); `api_key` 테이블 |
| 플랜 메뉴 접근 | `AdminPlans` + `plan_config`/`plan_menu_access` | `GET /v424/admin/plans-menu-access`, `PUT /v424/admin/plans/{id}/menu-access` |
| 창고 권한 | `Wms` + `wms_permissions` | `/api/wms/permissions` — user_email × warehouses(JSON) 격리 |
| 감사 로그 | `UserAuth::audit/auditLogs` + `auth_audit_log` | `GET /auth/audit-logs` (admin=전체, 그 외=본인) |
| 메뉴 트리 감사 | `AdminMenu` + `menu_tree`/`menu_audit_log` | 해시체인 변경이력 |
| 세션/MFA | `UserAuth` + `user_session`/`mfa_*` | 세션 목록·타기기 로그아웃·TOTP/OTP |

## 프론트엔드

| 영역 | 위치 | 내용 |
|---|---|---|
| 팀 역할 정책 | `auth/teamRolePolicy.js` | `TEAM_ROLES`, `OWNER_ONLY_ACTIONS`, `canWrite/normalizeTeamRole/isReadOnlyRole` |
| 플랜 메뉴 정책 | `auth/planMenuPolicy.js` | `MENU_MIN_PLAN`, `PLAN_TIER_RANK`, `requiredPlanForMenu/menuAllowedByTier/pathToMenuKey/recommendMenuAccess` |
| 탭 게이팅 | `auth/tabPlanPolicy.js` | `TAB_MIN_PLAN`, `tabAllowedByPlan` |
| 쓰기 가드 | `services/writeGuard.js` | `guardWrite` — member POST/PUT/PATCH/DELETE 차단 |
| 인증 컨텍스트 | `auth/AuthContext.jsx` | `user.team_role/tenant_id/admin_level/admin_menus`, `canTeamWrite/hasMenuAccess/isSubAdmin/subMenuAllowed` |
| 훅 | `auth/useTeamRole.js`, `auth/useAdminReadOnly.js` | 역할/읽기전용 판정 |
| 메뉴 매니페스트 | `layout/sidebarManifest.js` | `MEMBER_MENU/ADMIN_MENU/ADMIN_ONLY_MENU_KEYS`, `collectMenuKeys/buildMenuKeyIndex` |
| 라우트 가드 | `App.jsx` `MenuAccessGuard` | sub-admin 경로 + plan menuKey 게이트 |
| 관리 페이지 | `TeamMembers`(/team-members), `SubAdminManager`(/admin/sub-admins), `MenuAccessManager`(/menu-access-manager), `PlanPricing`, `UserManagement` | 기존 |

## 결론
- **팀은 엔터티가 아니었음** — `team_name` 자유 텍스트만 존재(팀 CRUD/유형/관리자/비활성 없음).
- **메뉴×동작(8) 매트릭스 부재** — sub-admin `admin_menus` 는 `view|edit` 2단계뿐, 일반 팀원 대상 fine-grained 권한 없음.
- **데이터 접근 범위(ABAC) 부재**.
- **위임 한계 강제 부재** — manager 는 team_role 로 포괄 쓰기였을 뿐, "본인 권한 범위 내 위임" 제약 없음.
→ 231차는 위 4개 공백만 신설하고 나머지는 전부 재사용.
