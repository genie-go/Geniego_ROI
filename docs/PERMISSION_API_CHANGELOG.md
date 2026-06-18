# PERMISSION_API_CHANGELOG

231차 팀·권한 API 변경 이력. 모든 신규 엔드포인트는 `/auth/*` blanket bypass(api_key 미들웨어 우회) 하에서 **세션 토큰(genie_token) self-auth** + `tenant_id` 격리.

## 응답 표준
성공 `{ "success": true, "data": {...}, "message": "", "error": null, "meta": {request_id,timestamp,version} }` (+ 레거시 `ok:true`)
실패 `{ "success": false, "data": null, "message": "...", "error": {code,detail}, "meta": {...} }` (+ `ok:false`)

## 신규 엔드포인트 (TeamPermissions)

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/auth/team/menu-catalog` | 인증 | 메뉴(26)·동작(8)·데이터범위(8)·팀유형(17) 메타 |
| GET | `/auth/team/teams` | 인증 | 테넌트 팀 목록(+멤버수/권한수/관리자/상태) |
| POST | `/auth/team/teams` | owner/admin | 팀 생성 `{name, team_type?, description?, manager_user_id?}` → `{id}` |
| PATCH | `/auth/team/teams/{id}` | owner/admin | 명/설명/유형/상태(active\|disabled\|archived)/관리자 변경 |
| DELETE | `/auth/team/teams/{id}` | owner/admin | 기본 soft(archived). `?hard=1` + **admin 전용** 하드삭제(멤버 team_id 해제) |
| POST | `/auth/team/teams/{id}/restore` | owner/admin | 보관/비활성 팀 복구(active) |
| GET | `/auth/team/teams/{id}/permissions` | 인증 | 팀 권한 매트릭스 + 데이터범위 + 소속 멤버 |
| PUT | `/auth/team/teams/{id}/permissions` | owner/admin | 팀 권한·범위 설정 `{menus:{menu_key:[actions]}, scope:{scope_type,values}}` |
| GET | `/auth/team/members/{id}/permissions` | 인증 | 멤버 명시권한+유효권한+위임상한(assignable) |
| PUT | `/auth/team/members/{id}/permissions` | owner/manager/admin | 멤버 권한 위임. **manager 는 assignable 초과 시 403 `DELEGATION_EXCEEDED`** |
| GET | `/auth/team/effective-permissions` | 인증 | 호출자 유효 권한(메뉴/동작/범위/role) |
| GET | `/auth/team/assignable-permissions` | owner/manager/admin | 호출자 위임 가능 상한(`unlimited` 또는 맵) |
| GET | `/auth/team/audit` | 인증 | 팀/권한 감사 이벤트(admin=전체, 그외=테넌트) |

## 오류 코드
`UNAUTHENTICATED(401)`, `FORBIDDEN(403)`, `NOT_FOUND(404)`, `INVALID(422)`, `DELEGATION_EXCEEDED(403)`, `DB_ERROR(500)`.

## 확장(기존 호환)
- `PATCH /auth/team/members/{id}` — `team_id` 필드 수용(팀 배정). 미전송 시 기존 동작 불변.

## 비변경
기존 `/auth/team/members`, `/auth/admin/sub-admins`, `/auth/audit-logs`, `/v424/admin/plans-menu-access` 시그니처/동작 무변경.
