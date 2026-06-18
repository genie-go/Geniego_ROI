# DUPLICATE_PERMISSION_AUDIT

"중복 구현 금지" 원칙 검증 — 231차 신설 항목이 기존과 중복되지 않음을 항목별로 확인.

## 중복 회피 판정표

| 신설 후보 | 기존 유사물 | 판정 | 처리 |
|---|---|---|---|
| 팀원 계정 CRUD | `UserAuth::*TeamMember` (`/auth/team/members`) | **중복** | 신설 안 함. 기존 재사용(+`team_id` 컬럼만 확장) |
| 팀 엔터티 CRUD | 없음(`team_name` 자유 텍스트뿐) | 신규 | `team` 테이블 + `TeamPermissions::createTeam` 등 신설 |
| 메뉴×동작 매트릭스 | sub-admin `admin_menus`(view\|edit) / plan_menu_access(플랜축) | 부분 중복(축 다름) | 일반 팀/멤버용 `acl_permission`(8동작) 신설. admin_menus/plan_menu_access 는 그대로 존속(직교축) |
| 데이터 접근 범위 | `wms_permissions.warehouses`(창고 한정) | 부분 | 범용 `data_scope`(8 scope_type) 신설. wms_permissions 는 창고 도메인 전용으로 존속 |
| 감사 로그 | `auth_audit_log` + `UserAuth::audit` | **중복** | 신설 안 함. `UserAuth::logAudit` 공개 래퍼로 동일 테이블 기록 |
| 권한 관리 페이지 | `/team-members`(TeamMembers), `MenuAccessManager`, `SubAdminManager` | 부분 | **신규 페이지 만들지 않음**. 기존 `/team-members` 를 4탭 콘솔로 초고도화 |
| 역할 정책 SSOT | `teamRolePolicy.js` / `planMenuPolicy.js` | **중복** | 재사용. 메뉴 목록은 `sidebarManifest.js` 정합 |
| API 키/스코프 | `api_key` RBAC | 무관 | 손대지 않음 |
| 토큰/세션 인증 | `UserAuth::authedUser/authedTenant` | **중복** | 재사용(신규 핸들러가 호출) |

## 중복 0 확인
- 신규 라우트는 모두 `/auth/team/*` 하위 — 기존 `/auth/team/members` 와 경로 충돌 없음(서로 다른 suffix).
- 신규 테이블 3종(`team`, `acl_permission`, `data_scope`)은 기존 테이블명과 충돌 없음(grep 확인).
- 신규 메뉴/사이드바 항목 추가 0 — `/team-members` 기존 메뉴 항목 그대로 사용.
- 핸들러 메서드명은 `TeamPermissions::` 네임스페이스로 분리 — UserAuth 와 메서드 충돌 없음.

## 확장(비신설) 항목
- `app_user.team_id` 컬럼(additive).
- `UserAuth::updateTeamMember` 에 `team_id` 수용(기존 메서드 시그니처 유지).
- `UserAuth::logAudit` 공개 래퍼(기존 private `audit` 위임).
