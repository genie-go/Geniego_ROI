# TEAM_PERMISSION_ARCHITECTURE

GeniegoROI 초엔터프라이즈 팀·권한 관리(RBAC/ABAC) 아키텍처 — 231차 신설/초고도화.

## 1. 설계 원칙

- **기존 구조 확장(중복 신설 금지)**: 기존 `app_user`(tenant/team_role), `/auth/team/members` CRUD, `auth_audit_log`, `plan_menu_access`, `wms_permissions` 를 재사용·확장한다. 신규는 "팀 엔터티화 + 메뉴×8동작 매트릭스 + 데이터 범위 + 위임 한계 강제"에 한정.
- **3축 직교 권한 모델**:
  1. **plan(요금제)** → 메뉴/기능 접근 폭 (`planMenuPolicy.js` + `plan_menu_access`). 기존.
  2. **team_role(owner>manager>member)** → 테넌트 내 쓰기 위계 (`teamRolePolicy.js` + `requireTeamWrite`). 기존.
  3. **fine-grained ACL/ABAC** → 팀·멤버별 메뉴×동작 + 데이터 범위 (`acl_permission` + `data_scope`). **231차 신설**.
- **테넌트 격리**: 모든 쿼리는 `tenant_id` 로 격리(`UserAuth::authedUser`/`authedTenant`). 위조 `X-Tenant-Id` 헤더 무신뢰.
- **Backward compatible**: 신규 테이블은 `IF NOT EXISTS`, `app_user.team_id` 는 additive `ALTER ... ADD COLUMN`. DROP/컬럼삭제 0. `team_role` 미설정 레거시 회원은 owner 로 fail-open(기존 단독 회원 쓰기 보존).

## 2. 도메인 모델

```
tenant (= 구독 회원, app_user.tenant_id)
 ├─ team[]                       (team 테이블; status=active|disabled|archived)
 │   ├─ manager_user_id          (팀관리자 = team_role 'manager' 로 승격)
 │   ├─ team_permission          (acl_permission subject_type='team')   메뉴→동작[]
 │   └─ team_data_scope          (data_scope  subject_type='team')      scope_type+values
 └─ app_user[] (구성원)
     ├─ team_role: owner | manager | member
     ├─ team_id → team.id        (소속; UserAuth::updateTeamMember 가 동기화)
     ├─ member_permission        (acl_permission subject_type='member') 메뉴→동작[]
     └─ member_data_scope        (data_scope  subject_type='member')
```

### 동작 단위(8)
`view · create · update · delete · approve · export · execute · manage`
- 어떤 동작이든 부여되면 `view` 자동 포함.
- `manage` = 해당 메뉴 전 동작 슈퍼셋(검사 시 모든 동작 충족으로 간주).

### 데이터 접근 범위(ABAC, 8종)
`company · brand · team · campaign · product · warehouse · partner · own`
- `company`/`own` 외에는 `scope_values[]`(대상 ID 목록)로 한정.

### 조직/역할 유형(team_type)
내부: `internal_super, brand, marketing(+global/domestic), sales(+global/domestic/enterprise/channel), logistics, finance`
외부 파트너: `partner_agency, partner_live, partner_supplier, partner_distribution`, 그 외 `custom`.

## 3. 권한 위임(Delegation) 규칙 — 핵심 보안 불변식

| 행위자 | 위임 가능 상한 |
|---|---|
| Super Admin(plan=admin) / owner | 무제한 (전 메뉴 × 전 동작, 전 데이터 범위) |
| Team Manager | **본인 팀(team_id)의 팀 권한 범위 이내**에서만 팀원에게 위임 |
| Team Member | 위임 불가 (부여받은 메뉴·동작·데이터만 접근) |

- 서버 강제: `putMemberPermissions` 에서 manager 요청을 `assignableMap`(=팀 권한)과 교집합 검증 → 초과 시 **403 `DELEGATION_EXCEEDED`** + 위반 목록 반환.
- 팀 권한 축소 시 소속 멤버의 명시권한을 새 상한으로 자동 재클램프(`reclampTeamMembers`) → 권한 초과 잔존 방지.

## 4. 유효 권한(Effective) 계산

```
effectiveForUser(user):
  admin | owner          → full (전 메뉴 manage, scope=company)
  manager                → 팀 권한(team_id) ∪ 팀 데이터범위(fallback: team)
  member                 → 본인 명시권한 ∩ 팀 상한, 데이터범위(member→team→own)
```

프론트는 `GET /auth/team/effective-permissions` 로 받아 메뉴 가시성/동작 게이트에 활용(AuthContext 의 plan/team_role 게이트와 병행).

## 5. 컴포넌트 맵

| 계층 | 파일 | 역할 |
|---|---|---|
| Backend Handler | `backend/src/Handlers/TeamPermissions.php` | 팀 CRUD·매트릭스·범위·위임·감사 (신설) |
| Backend (확장) | `backend/src/Handlers/UserAuth.php` | `team_id` 컬럼·멤버 team 배정·`logAudit` 공개 래퍼 |
| Routes | `backend/src/routes.php` | `/auth/team/*` 13개 ($custom+$register 쌍) |
| DB | `team`, `acl_permission`, `data_scope` (+ `app_user.team_id`) | 신규 3테이블 (MySQL/SQLite 양립) |
| Frontend Service | `frontend/src/services/teamApi.js` | API 클라이언트 + 데모 시뮬레이션 |
| Frontend Page | `frontend/src/pages/TeamMembers.jsx` | 4탭 콘솔(팀원/팀/매트릭스/감사) + 파트너 |
| Frontend SSOT(재사용) | `auth/teamRolePolicy.js`, `auth/planMenuPolicy.js`, `layout/sidebarManifest.js` | 기존 정책/메뉴 정본 |

## 6. 감사(Audit)

모든 팀 생성/수정/보관/복구/하드삭제, 팀·멤버 권한 설정은 `UserAuth::logAudit` → `auth_audit_log`(단일 SSOT)에 기록.
- action: `team_create|team_update|team_archive|team_restore|team_hard_delete|team_permissions_set|member_permissions_set`
- risk: 권한 설정·하드삭제 = `high`, 그 외 = `medium`.
- 조회: `GET /auth/team/audit`(팀/권한 한정) 및 기존 `GET /auth/audit-logs`(전체).
