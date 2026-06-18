# IMPLEMENTED_TEAM_PERMISSION_UPGRADES

231차 실제 구현/초고도화 내역.

## 백엔드

### 신규: `backend/src/Handlers/TeamPermissions.php`
- 상수: `ACTIONS`(8), `DATA_SCOPES`(8), `TEAM_TYPES`(17), `MENU_CATALOG`(26 메뉴, group/ko/en).
- 스키마: `team`, `acl_permission`, `data_scope` (MySQL/SQLite 양립, IF NOT EXISTS) + `app_user.team_id` 안전망.
- 팀 CRUD: `listTeams`(멤버수/권한수/관리자명 집계), `createTeam`, `updateTeam`(명/설명/유형/상태/관리자), `deleteTeam`(기본 archive, `?hard=1`+admin 만 하드삭제), `restoreTeam`.
- 권한 매트릭스: `getTeamPermissions`/`putTeamPermissions`(owner/admin), `getMemberPermissions`/`putMemberPermissions`(owner/manager, 위임 상한 검증).
- 위임/유효: `assignableMap`(owner/admin=무제한, manager=팀권한), `effectiveForUser`, `effectivePermissions`, `assignablePermissions`.
- 데이터 범위: `replaceScope`/`subjectScope` (subject=team|member).
- 무결성: `reclampTeamMembers`(팀권한 축소 시 멤버 재클램프), `promoteManager`(팀관리자→manager 승격).
- 감사: 전 변경 → `UserAuth::logAudit`. 조회 `teamAudit`.
- 응답 표준: `{success,data,message,error,meta{request_id,timestamp,version}}` (+ 레거시 `ok`).

### 확장: `backend/src/Handlers/UserAuth.php`
- `ensureTenantColumns` 에 `team_id INTEGER NULL` 추가(additive).
- `updateTeamMember` 가 `team_id` 수용 + `team_name` 라벨 자동 동기화(team 테이블 조인).
- `logAudit()` 공개 래퍼 추가(private `audit` 위임 — 외부 핸들러 단일 SSOT 기록).

### 라우트: `backend/src/routes.php` (13개, $custom + $register 쌍)
`GET /auth/team/menu-catalog`, `GET/POST /auth/team/teams`, `PATCH/DELETE /auth/team/teams/{id}`, `POST /auth/team/teams/{id}/restore`, `GET/PUT /auth/team/teams/{id}/permissions`, `GET/PUT /auth/team/members/{id}/permissions`, `GET /auth/team/effective-permissions`, `GET /auth/team/assignable-permissions`, `GET /auth/team/audit`.

## 프론트엔드

### 신규: `frontend/src/services/teamApi.js`
- 백엔드 연동 + 데모(localStorage) 시뮬레이션 양립(데모=운영 동등 체험).
- 헬퍼/상수 export: `MENU_CATALOG, ACTIONS, DATA_SCOPES, TEAM_TYPES, normActions, actionsCover`.

### 초고도화: `frontend/src/pages/TeamMembers.jsx` (`/team-members`)
- 단일 페이지 4탭: **팀원 / 팀 관리 / 권한 매트릭스 / 감사 로그** + 파트너 계정 섹션 보존.
- 팀원 탭: 기존 CRUD 유지 + **소속 팀 배정 드롭다운**(team_id).
- 팀 관리 탭: 추가/수정/유형/관리자 지정/비활성(archive)/복구/하드삭제(확인 다이얼로그가 멤버수·권한수 표시).
- 권한 매트릭스 탭: 팀/팀원 선택 → 메뉴(그룹별)×8동작 체크박스 + **위임 상한 초과 셀 비활성(회색)** + view 의존성(동작 부여 시 view 자동, view 해제 시 전체 해제) + 데이터 범위 선택 + 접근가능 메뉴 미리보기.
- 감사 로그 탭: 팀/권한 변경 이력(위험도 색상).
- 읽기전용 멤버 배너 보존.

## i18n
- 마케팅 AI디자인/크리에이티브 스튜디오 라벨 23키 × 15개국(230차 인계 #2, 별도 완료).
- 팀·권한 콘솔 신규 라벨 120키 × 15개국(`teamMembers.*`, `teamPerms.*`).
