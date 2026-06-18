# PERMISSION_DB_MIGRATION_NOTES

231차 DB 변경 — **Backward compatible only**. DROP TABLE / 컬럼 삭제 / 데이터 파괴 0.
모든 DDL 은 핸들러 부팅 시 `IF NOT EXISTS` 로 idempotent 생성(`TeamPermissions::ensureSchema`). MySQL/SQLite 양립.

## 신규 테이블

### `team`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | INT AUTO_INCREMENT / INTEGER PK AUTOINCREMENT | PK |
| tenant_id | VARCHAR(100) | 격리 경계, default 'demo' |
| name | VARCHAR(160) | 팀명 |
| description | TEXT | 설명 |
| team_type | VARCHAR(48) | default 'custom' |
| manager_user_id | INT NULL | 팀관리자(app_user.id) |
| status | VARCHAR(20) | active \| disabled \| archived (default active) |
| created_by | INT NULL | 생성자 |
| created_at / updated_at | VARCHAR(32) | ISO |
- 인덱스: `idx_team_tenant(tenant_id)`, `idx_team_status(tenant_id,status)`

### `acl_permission` (팀·멤버 메뉴×동작 매트릭스)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | PK | |
| tenant_id | VARCHAR(100) | |
| subject_type | VARCHAR(10) | 'team' \| 'member' |
| subject_id | INT | team.id 또는 app_user.id |
| menu_key | VARCHAR(120) | MENU_CATALOG 키 |
| actions | VARCHAR(255) | CSV (view,create,…,manage) |
| updated_at | VARCHAR(32) | |
- UNIQUE: `uq_acl(tenant_id, subject_type, subject_id, menu_key)`
- 인덱스: `idx_acl_subject(tenant_id, subject_type, subject_id)`

### `data_scope` (ABAC 데이터 접근 범위)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | PK | |
| tenant_id | VARCHAR(100) | |
| subject_type | VARCHAR(10) | 'team' \| 'member' |
| subject_id | INT | |
| scope_type | VARCHAR(30) | company/brand/team/campaign/product/warehouse/partner/own |
| scope_values | TEXT | JSON 배열(대상 ID) |
| updated_at | VARCHAR(32) | |
- UNIQUE: `uq_scope(tenant_id, subject_type, subject_id)`

## 컬럼 추가(additive)
- `app_user.team_id` `INT/INTEGER NULL` — 멤버 소속 팀. NULL=미배정(레거시 무후퇴).
  - `UserAuth::ensureTenantColumns` 와 `TeamPermissions::ensureSchema` 양쪽에서 `ALTER TABLE ... ADD COLUMN` try/catch(이미 존재 시 무시).

## 삭제 정책(무결성)
- 팀 삭제 기본 = **soft(status='archived')** — 멤버/권한/이력 보존.
- 하드 삭제(`?hard=1`, admin 전용): ① `app_user.team_id` → NULL ② 팀 acl_permission/data_scope 삭제 ③ team 행 삭제. 감사(`team_hard_delete`, risk=high) 기록.
- 팀 권한 축소 시 멤버 권한을 새 상한으로 재클램프(고아 초과권한 제거).

## 롤백
- 신규 테이블/컬럼은 미사용 시 무해(기존 코드 경로 비참조). 필요 시 수동 `DROP TABLE team, acl_permission, data_scope;` (운영 데이터 영향 없음 — 신규 격리 테이블).
