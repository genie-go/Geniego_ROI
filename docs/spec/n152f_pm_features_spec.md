# N-152-F PM 기능 확장 spec (Task / Milestone / Gantt)

> **작성일**: 2026-05-26
> **세션**: 168차 (드래프트, 사용자 승인 전)
> **트랙 ID**: **N-152-F** ("PM 본 작업급" — 165차 commit `5898046` 명명)
> **저장 위치 (canonical)**: `docs/spec/n152f_pm_features_spec.md`
> **선행 spec**: `docs/spec/backend_orderhub_aggregator_165_v3.md` (migration 인프라 재사용)
> **상태**: 드래프트 — backend API 골격 + frontend 연동 spec. 구현은 사용자 승인 후 단계 진입.

---

## 0. 최상위 의무 (작업 전 cross-check)

본 spec 은 **9개 절대 원칙** (memory `feedback_absolute_principles.md`) 의 하위 실행 사양. 모든 항목은 다음 매핑을 충족해야 한다.

| 절대 원칙 | 본 spec 매핑 |
|---|---|
| §1 초엔터프라이즈급 | 데이터 모델 7 테이블 + 감사 로그 + 실시간 SSE + 의존성 그래프 (단순 to-do 수준 X) |
| §2 기존 안정성 | 신규 `pm_*` 테이블 + `/v425/pm/*` route — 기존 OrderHub / V423 미접촉 |
| §3 PM·에이전시 책임 | spec 작성 → 사용자 승인 → backend → frontend 단계 진입 (§13 절차) |
| §4 데이터·AI 중심 | 모든 변경 audit 로그 + KPI 집계 endpoint (`/v425/pm/kpi`) + ML 예측 hook (지연 위험 예측 v2 트랙) |
| §5 글로벌 플랫폼 / 은행급 보안 | RBAC (viewer/analyst/admin), tenant 격리, 전 endpoint api_key + audit, 첨부 SHA-256 + 서명 URL |
| §6 기능 누락 보고 | §11 알려진 한계 + §12 미적용 트랙 (사용자 승인 의무) |
| §7 경쟁 (사방넷 이상) | Gantt critical-path + 의존성 FS/SS/FF/SF + 다중 담당자 + 메뉴 절대 동기화 |
| §8 개발 수행 | 모듈화 (PM handler 분리) + 재사용 (OrderHub Migrate 패턴) + 문서화 (본 spec) |
| §9 최종 목표 | AI hook 인터페이스 (지연 예측, 자동 우선순위) — 본 spec 인터페이스만, 구현 별도 트랙 |

또한 U-prefix 운영원칙 (memory `feedback_pm_operational_rules.md`):

- **U-166-D**: GitHub Actions 미사용 → 본 spec 의 deploy 절차 = `cc plink + pscp` (166차 §1.4 표준)
- **U-166-E**: 초엔터프라이즈급 — 단순 to-do 금지
- **U-166-F**: **메뉴 간 절대 동기화** — 본 spec 의 §8 SSE 채널이 이를 충족
- **U-166-G**: 한글 설명
- **U-166-H**: credentials 평문 노출 회피
- **U-164-A**: i18n 동결 유지 — 본 spec §9 의 `pm.*` 키 추가는 **승인 후 일괄 적용** (15 locale 동시)

---

## 1. 트랙 범위 + 3축

### 1.1 본 spec 범위

- **Task**: 위계 (parent/child) + 상태 + 담당자 + 의존성 + 첨부 + 코멘트 + 감사 로그
- **Milestone**: 프로젝트 단위 마일스톤 + 완료 기준 + 연결 task
- **Gantt**: task + dependencies 기반 timeline 뷰 (critical path 계산 포함)

### 1.2 범위 외 (별도 트랙)

| 항목 | 별도 트랙 | 비고 |
|---|---|---|
| AI 지연 예측 모델 | N-152-F2 | 본 spec 은 hook interface 만 정의 |
| 자원 (인적 / 비용) 평준화 | N-152-F3 | resource leveling = ML 트랙 |
| 외부 PM 도구 연동 (Jira/Asana/Notion) | N-152-G | 별도 connector 트랙 |
| 모바일 PM 앱 | N-152-H | 별도 RN/PWA 트랙 |

---

## 2. 데이터 모델 (DB 스키마)

### 2.1 테이블 카탈로그 (7 + audit)

| 테이블 | 역할 | 키 격리 |
|---|---|---|
| `pm_projects` | 프로젝트 컨테이너 | `tenant_id` |
| `pm_tasks` | task 본체 (self-ref 위계) | `tenant_id`, `project_id` |
| `pm_milestones` | 마일스톤 | `tenant_id`, `project_id` |
| `pm_task_dependencies` | task 간 의존성 (FS/SS/FF/SF) | `tenant_id` |
| `pm_task_assignees` | task ↔ user (many-to-many) | `tenant_id` |
| `pm_task_comments` | 코멘트 / 활동 | `tenant_id`, `task_id` |
| `pm_attachments` | 첨부 메타 (SHA-256 + 서명 URL) | `tenant_id` |
| `pm_audit_log` | 모든 mutation 감사 (9원칙 §4) | `tenant_id` |

### 2.2 핵심 컬럼 사양

#### 2.2.1 `pm_projects`

```sql
CREATE TABLE IF NOT EXISTS pm_projects (
  id            VARCHAR(64) PRIMARY KEY,
  tenant_id     VARCHAR(64) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT DEFAULT NULL,
  status        ENUM('planning','active','on_hold','completed','archived') NOT NULL DEFAULT 'planning',
  start_date    DATE DEFAULT NULL,
  target_date   DATE DEFAULT NULL,
  completed_at  DATETIME DEFAULT NULL,
  owner_user_id VARCHAR(64) DEFAULT NULL,
  budget_amount DECIMAL(14,2) DEFAULT NULL,
  budget_currency VARCHAR(8) DEFAULT 'KRW',
  metadata_json JSON DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_tenant_status (tenant_id, status),
  KEY idx_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.2.2 `pm_tasks`

```sql
CREATE TABLE IF NOT EXISTS pm_tasks (
  id              VARCHAR(64) PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL,
  project_id      VARCHAR(64) NOT NULL,
  parent_task_id  VARCHAR(64) DEFAULT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT DEFAULT NULL,
  status          ENUM('todo','in_progress','review','done','blocked','cancelled') NOT NULL DEFAULT 'todo',
  priority        ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  progress_pct    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  start_date      DATE DEFAULT NULL,
  due_date        DATE DEFAULT NULL,
  estimate_hours  DECIMAL(8,2) DEFAULT NULL,
  actual_hours    DECIMAL(8,2) DEFAULT NULL,
  milestone_id    VARCHAR(64) DEFAULT NULL,
  labels_csv      VARCHAR(500) DEFAULT NULL,
  position_idx    INT NOT NULL DEFAULT 0,
  archived_at     DATETIME DEFAULT NULL,
  created_by      VARCHAR(64) DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant_project (tenant_id, project_id),
  KEY idx_tenant_status (tenant_id, status),
  KEY idx_project_parent (project_id, parent_task_id),
  KEY idx_milestone (milestone_id),
  KEY idx_due (tenant_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.2.3 `pm_milestones`

```sql
CREATE TABLE IF NOT EXISTS pm_milestones (
  id            VARCHAR(64) PRIMARY KEY,
  tenant_id     VARCHAR(64) NOT NULL,
  project_id    VARCHAR(64) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT DEFAULT NULL,
  target_date   DATE NOT NULL,
  achieved_at   DATETIME DEFAULT NULL,
  status        ENUM('upcoming','in_progress','achieved','missed','cancelled') NOT NULL DEFAULT 'upcoming',
  completion_criteria TEXT DEFAULT NULL,
  position_idx  INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant_project (tenant_id, project_id),
  KEY idx_tenant_target (tenant_id, target_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.2.4 `pm_task_dependencies`

```sql
CREATE TABLE IF NOT EXISTS pm_task_dependencies (
  id              VARCHAR(64) PRIMARY KEY,
  tenant_id       VARCHAR(64) NOT NULL,
  predecessor_id  VARCHAR(64) NOT NULL,
  successor_id    VARCHAR(64) NOT NULL,
  dep_type        ENUM('FS','SS','FF','SF') NOT NULL DEFAULT 'FS',
  lag_days        INT NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dep (tenant_id, predecessor_id, successor_id, dep_type),
  KEY idx_pred (predecessor_id),
  KEY idx_succ (successor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`dep_type` 의미 (PMI 표준):

- `FS` (finish→start) — A 완료 후 B 시작 (기본)
- `SS` (start→start) — A 시작 후 B 시작
- `FF` (finish→finish) — A 완료 후 B 완료
- `SF` (start→finish) — A 시작 후 B 완료 (희귀)

cycle 검출은 application layer (§5.3 `PM::validateDependency`) 에서 DFS 로 수행.

#### 2.2.5 `pm_task_assignees`

```sql
CREATE TABLE IF NOT EXISTS pm_task_assignees (
  id            VARCHAR(64) PRIMARY KEY,
  tenant_id     VARCHAR(64) NOT NULL,
  task_id       VARCHAR(64) NOT NULL,
  user_id       VARCHAR(64) NOT NULL,
  role          ENUM('owner','contributor','reviewer','observer') NOT NULL DEFAULT 'contributor',
  assigned_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assign (tenant_id, task_id, user_id),
  KEY idx_user (user_id),
  KEY idx_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.2.6 `pm_task_comments`

```sql
CREATE TABLE IF NOT EXISTS pm_task_comments (
  id          VARCHAR(64) PRIMARY KEY,
  tenant_id   VARCHAR(64) NOT NULL,
  task_id     VARCHAR(64) NOT NULL,
  author_id   VARCHAR(64) NOT NULL,
  body        TEXT NOT NULL,
  mentions_csv VARCHAR(500) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  edited_at   DATETIME DEFAULT NULL,
  KEY idx_task_created (task_id, created_at),
  KEY idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.2.7 `pm_attachments`

```sql
CREATE TABLE IF NOT EXISTS pm_attachments (
  id            VARCHAR(64) PRIMARY KEY,
  tenant_id     VARCHAR(64) NOT NULL,
  task_id       VARCHAR(64) DEFAULT NULL,
  comment_id    VARCHAR(64) DEFAULT NULL,
  filename      VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(128) DEFAULT NULL,
  size_bytes    BIGINT UNSIGNED NOT NULL,
  sha256_hex    CHAR(64) NOT NULL,
  storage_key   VARCHAR(500) NOT NULL,
  uploaded_by   VARCHAR(64) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_task (task_id),
  KEY idx_sha (sha256_hex),
  KEY idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 2.2.8 `pm_audit_log`

```sql
CREATE TABLE IF NOT EXISTS pm_audit_log (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     VARCHAR(64) NOT NULL,
  actor_user_id VARCHAR(64) DEFAULT NULL,
  actor_api_key VARCHAR(64) DEFAULT NULL,
  entity_type   ENUM('project','task','milestone','dependency','assignee','comment','attachment') NOT NULL,
  entity_id     VARCHAR(64) NOT NULL,
  action        ENUM('create','update','delete','restore','status_change','assign','unassign') NOT NULL,
  diff_json     JSON DEFAULT NULL,
  ip_addr       VARCHAR(45) DEFAULT NULL,
  user_agent    VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tenant_time (tenant_id, created_at),
  KEY idx_entity (entity_type, entity_id),
  KEY idx_actor (actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

본 테이블은 **append-only**. UPDATE / DELETE 권한은 application 에서 거부 (DB GRANT 차원 추가 가능, §11.4).

### 2.3 SQLite fallback

`Db.php` 의 SQLite 변환 패턴 (V424 OrderHub 사례) 을 그대로 적용 — `ENUM` → `TEXT CHECK(... IN ...)`, `DECIMAL` → `REAL`, `JSON` → `TEXT`, `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TEXT NOT NULL DEFAULT (datetime('now'))`.

---

## 3. Migration SQL (165 runner 재사용)

### 3.1 파일 명명

165 spec §13.2 명명 규칙 그대로:

```
backend/migrations/
├── 20260526_168_001_create_pm_projects.sql
├── 20260526_168_002_create_pm_tasks.sql
├── 20260526_168_003_create_pm_milestones.sql
├── 20260526_168_004_create_pm_task_dependencies.sql
├── 20260526_168_005_create_pm_task_assignees.sql
├── 20260526_168_006_create_pm_task_comments.sql
├── 20260526_168_007_create_pm_attachments.sql
└── 20260526_168_008_create_pm_audit_log.sql
```

각 파일 끝에 `-- @rollback` / `-- @end-rollback` 블록 (167차 `5cf30ee` 의 `Migrate::rollback()` 호환):

```sql
-- @rollback
DROP TABLE IF EXISTS pm_projects;
-- @end-rollback
```

### 3.2 적용 절차 (cc plink 표준, U-166-D)

```powershell
# 1) backend tar (migrations + src/Handlers/PM.php + routes.php diff 포함)
tar -czf /tmp/backend.tgz --exclude=backend/.env --exclude=backend/vendor `
  --exclude=backend/data --exclude=backend/logs --exclude=backend/.my.cnf* backend/

# 2) pscp + plink (NEXT_SESSION.md §1.4 그대로)
# 3) 운영 호스트에서:
#    mysqldump 백업 → tar 해제 → composer install → migrate.php both --dry-run → migrate.php both → reload
```

---

## 4. Backend API endpoint 카탈로그

### 4.1 endpoint 표 (versioned `/v425/pm/*` + alias `/api/v425/pm/*`)

| Method | Path | 권한 | 응답 요지 |
|---|---|---|---|
| `GET`    | `/v425/pm/projects` | viewer | tenant 의 project 목록 (status 필터) |
| `POST`   | `/v425/pm/projects` | analyst | project 생성 |
| `GET`    | `/v425/pm/projects/{id}` | viewer | project 상세 |
| `PATCH`  | `/v425/pm/projects/{id}` | analyst | project 부분 수정 |
| `DELETE` | `/v425/pm/projects/{id}` | admin | project 아카이브 (soft delete = `archived_at`) |
| `GET`    | `/v425/pm/projects/{id}/tasks` | viewer | project 의 task tree |
| `GET`    | `/v425/pm/projects/{id}/gantt` | viewer | Gantt 뷰 (task + dep + critical path) |
| `GET`    | `/v425/pm/projects/{id}/kpi` | viewer | KPI 집계 (총/완료/지연/위험) |
| `POST`   | `/v425/pm/tasks` | analyst | task 생성 |
| `GET`    | `/v425/pm/tasks/{id}` | viewer | task 상세 (담당자 + 코멘트 헤더 + 의존성) |
| `PATCH`  | `/v425/pm/tasks/{id}` | analyst | task 부분 수정 (status_change 별도 audit) |
| `DELETE` | `/v425/pm/tasks/{id}` | analyst | task 아카이브 |
| `POST`   | `/v425/pm/tasks/{id}/assignees` | analyst | 담당자 추가 |
| `DELETE` | `/v425/pm/tasks/{id}/assignees/{userId}` | analyst | 담당자 제거 |
| `POST`   | `/v425/pm/tasks/{id}/comments` | analyst | 코멘트 추가 |
| `GET`    | `/v425/pm/tasks/{id}/comments` | viewer | 코멘트 목록 |
| `POST`   | `/v425/pm/dependencies` | analyst | 의존성 생성 (cycle 검출) |
| `DELETE` | `/v425/pm/dependencies/{id}` | analyst | 의존성 삭제 |
| `GET`    | `/v425/pm/milestones?project_id=` | viewer | milestone 목록 |
| `POST`   | `/v425/pm/milestones` | analyst | milestone 생성 |
| `PATCH`  | `/v425/pm/milestones/{id}` | analyst | milestone 수정 |
| `DELETE` | `/v425/pm/milestones/{id}` | admin | milestone 삭제 |
| `POST`   | `/v425/pm/attachments/sign` | analyst | 서명 URL 발급 (S3-compat 또는 local) |
| `POST`   | `/v425/pm/attachments` | analyst | 첨부 메타 등록 (업로드 완료 후) |
| `GET`    | `/v425/pm/events/stream?project_id=` | viewer | **SSE** 실시간 채널 (§8) |
| `GET`    | `/v425/pm/audit?entity_type=&entity_id=` | admin | 감사 로그 조회 |

총 25 endpoint (versioned + `/api/v425/pm/*` alias 포함 시 50 routes 등록).

### 4.2 응답 포맷 (공통)

OrderHub v3 패턴 그대로:

```json
{
  "items": [ ... ],
  "next_cursor": "opaque-string-or-null",
  "_env": "production",
  "_tenant": "demo-tenant-001",
  "_request_id": "req_01H..."
}
```

mutation 응답:

```json
{
  "id": "task_01H...",
  "ok": true,
  "audit_id": 12345,
  "event": { "type": "task.created", "task_id": "task_01H..." }
}
```

### 4.3 페이지네이션

- `limit`: default 50, max 200 (OrderHub `clampLimit` 패턴)
- cursor 기반 (`?cursor=<base64>`) — offset 기반은 대용량에서 비효율, 글로벌 플랫폼 기준 (절대원칙 §5)

---

## 5. Handler 클래스 사양 (`Genie\Handlers\PM`)

### 5.1 파일 분리 (모듈화, 절대원칙 §8)

단일 `PM.php` 가 25 endpoint 를 처리하면 1000+ 라인. 다음과 같이 분리:

```
backend/src/Handlers/PM/
├── Projects.php       # 4 endpoint
├── Tasks.php          # 7 endpoint
├── Milestones.php     # 4 endpoint
├── Dependencies.php   # 2 endpoint (+ cycle 검출 로직)
├── Assignees.php      # 2 endpoint
├── Comments.php       # 2 endpoint
├── Attachments.php    # 2 endpoint
├── Events.php         # 1 endpoint (SSE)
├── Audit.php          # 1 endpoint
├── Gantt.php          # 1 endpoint (critical path 계산)
└── Kpi.php            # 1 endpoint
```

`backend/src/Handlers/PM/Shared.php` 에 공통 helper (gate / tenantContext / pdo / clampLimit / auditLog) — OrderHub Shared 패턴 재사용.

### 5.2 공통 gate (OrderHub 패턴 재사용)

```php
namespace Genie\Handlers\PM;

abstract class Shared
{
    protected static function gate(Request $req, Response $resp): array
    {
        $ctx = self::tenantContext($req);
        if (!$ctx) return ['error' => self::json($resp, ['error' => 'tenant_required'], 400)];
        [$tenant, $isDemo] = [$ctx['tenant'], $ctx['isDemo']];
        $pdo = \Genie\Db::pdoFor($isDemo);
        return compact('tenant', 'isDemo', 'pdo');
    }

    protected static function auditLog(\PDO $pdo, array $r): void
    {
        $stmt = $pdo->prepare(
            "INSERT INTO pm_audit_log
             (tenant_id, actor_user_id, actor_api_key, entity_type, entity_id, action, diff_json, ip_addr, user_agent)
             VALUES (?,?,?,?,?,?,?,?,?)"
        );
        $stmt->execute([
            $r['tenant_id'], $r['user_id'] ?? null, $r['api_key'] ?? null,
            $r['entity_type'], $r['entity_id'], $r['action'],
            isset($r['diff']) ? json_encode($r['diff'], JSON_UNESCAPED_UNICODE) : null,
            $r['ip'] ?? null, $r['ua'] ?? null,
        ]);
    }
}
```

### 5.3 Dependencies cycle 검출

```php
public static function validateDependency(\PDO $pdo, string $tenant, string $predId, string $succId): bool
{
    if ($predId === $succId) return false;
    // DFS: succId 에서 predId 까지 도달하면 cycle
    $visited = [];
    $stack = [$succId];
    while ($stack) {
        $cur = array_pop($stack);
        if (isset($visited[$cur])) continue;
        $visited[$cur] = true;
        if ($cur === $predId) return false; // cycle
        $stmt = $pdo->prepare("SELECT successor_id FROM pm_task_dependencies WHERE tenant_id=? AND predecessor_id=?");
        $stmt->execute([$tenant, $cur]);
        foreach ($stmt->fetchAll(\PDO::FETCH_COLUMN) as $next) {
            $stack[] = $next;
        }
    }
    return true;
}
```

### 5.4 Gantt critical-path 계산

CPM (Critical Path Method) 표준:

1. forward pass: ES (earliest start), EF (earliest finish)
2. backward pass: LS (latest start), LF (latest finish)
3. slack = LS - ES; slack=0 인 path = critical path

응답 예:

```json
{
  "project_id": "proj_01H...",
  "tasks": [
    { "id": "t1", "title": "...", "start": "2026-06-01", "end": "2026-06-05",
      "es": "2026-06-01", "ef": "2026-06-05", "ls": "2026-06-01", "lf": "2026-06-05",
      "slack_days": 0, "on_critical_path": true, "progress_pct": 30 }
  ],
  "dependencies": [ { "pred": "t1", "succ": "t2", "type": "FS", "lag": 0 } ],
  "critical_path_ids": ["t1","t2","t5","t9"],
  "project_duration_days": 42,
  "computed_at": "2026-05-26T10:30:00Z"
}
```

대용량 (task > 500) 시 backend 캐시 (`pm_gantt_cache` 테이블, mutation 시 invalidate) — **본 spec 범위 외, 별도 트랙 N-152-F4**.

---

## 6. RBAC + Tenant 격리 (절대원칙 §5)

### 6.1 권한 매트릭스

| 작업 | viewer | connector | analyst | admin |
|---|:-:|:-:|:-:|:-:|
| read (own assigned tasks) | ✅ | ✅ | ✅ | ✅ |
| read (all project tasks)  | ✅ | ✅ | ✅ | ✅ |
| write task / comment | | | ✅ | ✅ |
| create project / milestone | | | ✅ | ✅ |
| delete project / milestone | | | | ✅ |
| audit log read | | | | ✅ |
| SSE stream | ✅ | ✅ | ✅ | ✅ |
| attachments sign upload | | | ✅ | ✅ |

`connector` 는 ingest 전용이므로 PM 권한 = viewer 동일. RBAC 분기는 `index.php` 의 기존 middleware 가 처리 (v421 spec).

### 6.2 Tenant 격리

- 모든 query 에 `WHERE tenant_id = :tenant` 강제
- `tenantContext()` 에서 `auth_tenant` (middleware 가 setAttribute) 사용
- demo tenant prefix (`demo-`, `demo_`) → `geniego_roi_demo` DB pool (방어선 4 적용 시) 또는 동일 DB + tenant 필터 (현재)

### 6.3 audit 의무

모든 mutation endpoint 는 응답 전 `auditLog()` 호출. 다음 정보 필수:

- `actor_user_id` 또는 `actor_api_key` 중 1개 이상
- `entity_type`, `entity_id`, `action`
- `diff_json` (UPDATE 의 경우 before/after)
- `ip_addr`, `user_agent`

`pm_audit_log` 는 append-only — UPDATE/DELETE 시도 시 application 차원에서 400.

---

## 7. Frontend 페이지 구조

### 7.1 페이지 추가 + chunk

`vite.config.js` 의 `manualChunks` 에 신규 그룹:

```js
if (id.includes('/pages/PM') || id.includes('/pages/pm-')) {
  return 'pages-pm';
}
```

신규 페이지 (`frontend/src/pages/`):

| 파일 | 경로 (Route) | 역할 |
|---|---|---|
| `PMOverview.jsx` | `/pm` | 프로젝트 카드 그리드 + KPI |
| `PMProjectDetail.jsx` | `/pm/projects/:id` | 프로젝트 헤더 + 탭 (Tasks/Gantt/Milestones/Activity) |
| `PMTaskBoard.jsx` | `/pm/projects/:id/board` | Kanban 뷰 (status 컬럼) |
| `PMTaskTable.jsx` | `/pm/projects/:id/table` | 표 뷰 (정렬/필터) |
| `PMGanttView.jsx` | `/pm/projects/:id/gantt` | Gantt (frappe-gantt or custom) |
| `PMMilestones.jsx` | `/pm/projects/:id/milestones` | 마일스톤 timeline |
| `PMTaskDetail.jsx` | `/pm/tasks/:id` | task 모달 또는 페이지 |
| `PMActivity.jsx` | `/pm/projects/:id/activity` | audit feed |
| `PMSettings.jsx` | `/pm/projects/:id/settings` | 프로젝트 설정 (멤버/권한) |

총 9 페이지 — `App.jsx` 의 `React.lazy()` import + Route 등록 의무.

### 7.2 컴포넌트 재사용

`frontend/src/components/pm/`:

```
TaskCard.jsx           # Kanban / table 공유
TaskStatusBadge.jsx
TaskPriorityBadge.jsx
TaskAssigneeAvatars.jsx
GanttBar.jsx
GanttDependencyArrow.jsx
MilestoneNode.jsx
ProjectStatusPill.jsx
PMHeader.jsx           # 프로젝트 헤더 (탭 전환)
PMKpiTiles.jsx         # KPI 4-tile (총/완료/지연/위험)
PMRealtimeIndicator.jsx # SSE 연결 상태 dot (U-166-F 시각화)
```

### 7.3 Gantt 라이브러리 선택

| 후보 | 라이선스 | 평가 |
|---|---|---|
| `frappe-gantt` | MIT | 가볍고 React wrapper 존재, custom dep arrow 가능 |
| `react-gantt-task` | MIT | TypeScript 기본, 무거움 (~150KB gz) |
| `dhtmlx-gantt` | proprietary (community 무료) | 기능 풍부, 라이선스 검토 필요 |
| custom SVG | n/a | 가장 가벼움, 구현비용 큼 |

**권장**: `frappe-gantt` (MIT, ~30KB gz, custom 의존선 그릴 수 있음). 라이선스 우려 회피 + chunk 부담 최소.

대안 (사용자 결정 필요): custom SVG (절대원칙 §1 초엔터프라이즈급 시 vendor lock-in 회피).

### 7.4 routing 추가

`App.jsx`:

```jsx
const PMOverview = React.lazy(() => import('./pages/PMOverview'));
const PMProjectDetail = React.lazy(() => import('./pages/PMProjectDetail'));
// ... 9 페이지 동일 패턴

<Route path="/pm" element={<PMOverview />} />
<Route path="/pm/projects/:id" element={<PMProjectDetail />} />
<Route path="/pm/projects/:id/board" element={<PMTaskBoard />} />
<Route path="/pm/projects/:id/gantt" element={<PMGanttView />} />
{/* ... */}
```

`Sidebar` / `MobileSidebar` 에 PM 메뉴 그룹 추가 — 별도 spec 패치 (§13.4).

---

## 8. 메뉴 간 절대 동기화 (U-166-F)

### 8.1 SSE 채널 (1차 선택)

`GET /v425/pm/events/stream?project_id=...` 가 SSE stream 을 반환:

```
event: task.updated
data: {"task_id":"t1","old":{"status":"todo"},"new":{"status":"in_progress"},"actor":"u123"}

event: dependency.created
data: {"id":"d1","pred":"t1","succ":"t2","type":"FS"}

event: kpi.delta
data: {"project_id":"p1","completed_delta":1,"overdue_delta":-1}
```

backend 구현: long-polling 또는 nginx `X-Accel-Buffering: no` + PHP `ob_flush(); flush();` 루프. 30s heartbeat (`event: ping`).

frontend 구독: `EventSource('/api/v425/pm/events/stream?project_id=...')` → `GlobalDataContext` 의 `pmEventsReducer` → 모든 PM 페이지 컴포넌트가 자동 reflect.

### 8.2 polling fallback

SSE 미지원 환경 (구형 brower, 일부 corporate proxy): 5초 간격 `GET /v425/pm/projects/{id}?since=<ts>` polling 으로 자동 degrade. `apiClient.js` 에서 EventSource 가용성 감지.

### 8.3 동기화 범위

| 영역 | 동기화 대상 |
|---|---|
| Task board ↔ Gantt | task.status, task.dates, task.progress |
| Project list ↔ Project detail | project.kpi |
| Sidebar 알림 dot | task.assigned, comment.mentioned |
| Dashboard KPI tile (다른 메뉴) | pm.overdue_count, pm.due_today |

**Dashboard 메뉴의 KPI tile 까지 동기화** — 절대원칙 §4 (데이터 흐름 추적 가능) + U-166-F (절대 동기화) 충족.

### 8.4 SSE 권한

stream endpoint 도 `auth_tenant` + RBAC 검증 (gate). project 멤버 외 구독 불가.

### 8.5 backpressure

SSE 연결당 메모리 (PHP-FPM worker) 점유 — long stream 은 PHP-FPM worker 부족 위험. **본 spec 의 한계**: nginx 단에서 connection limit (worker_connections) + 연결당 max 5분 hard cap + 클라이언트 자동 재연결. 대안 (Redis Pub/Sub 기반 별도 service)은 N-152-F5 트랙.

---

## 9. i18n + 다국어 (U-164-A 동결 인지)

### 9.1 키 네임스페이스

`pm.*` 신규 namespace. 예:

```json
{
  "pm": {
    "title": "프로젝트 관리",
    "overview": { "header": "전체 프로젝트", "kpi": { "total": "전체", "done": "완료", "overdue": "지연" } },
    "task": {
      "status": { "todo": "할 일", "in_progress": "진행 중", "review": "검토", "done": "완료", "blocked": "막힘", "cancelled": "취소" },
      "priority": { "low": "낮음", "normal": "보통", "high": "높음", "urgent": "긴급" },
      "actions": { "create": "task 생성", "assign": "담당자 지정", "comment": "코멘트", "archive": "보관" }
    },
    "milestone": { "status": { "upcoming": "예정", "achieved": "달성", "missed": "지연" } },
    "gantt": { "critical_path": "주공정선", "slack_days": "여유 (일)" },
    "audit": { "actions": { "create": "생성", "update": "수정", "delete": "삭제" } }
  }
}
```

신규 키 추산: **약 120-180 leaves** (전체 트리에 영향).

### 9.2 15-locale 동기화 의무

- 한국어 (`ko.js`) 가 source of truth
- 영어 (`en.js`) 는 동시 작성 의무 (CI Phase 1 가드)
- 나머지 13 locale (`ja, zh, zh-TW, de, th, vi, id, ar, es, fr, hi, pt, ru`) 는 영어 fallback 으로 일괄 추가 후 점진 번역

### 9.3 본 spec 의 i18n 적용 시점

**구현 spec 승인 직후, 첫 backend handler 작성 전에** ko/en 키 추가 → 나머지 13 placeholder. 동결 (U-164-A) 해제 트리거는 사용자 승인 필요.

---

## 10. 검증 + 수용 기준

### 10.1 PHP syntax

```bash
php -l backend/src/Handlers/PM/Projects.php
php -l backend/src/Handlers/PM/Tasks.php
# ... 11 파일 전체
```

### 10.2 routes 등록 검증

```bash
php backend/tools/audit_routes.php   # 167차 ec139ed 도구
```

기대: 50 routes (versioned 25 + alias 25) 등록 + `$register` 누락 0.

### 10.3 migration dry-run + 적용

```bash
php backend/bin/migrate.php both --dry-run   # 8 Pending 표시
php backend/bin/migrate.php both             # 8 적용
mysql -e "SHOW TABLES LIKE 'pm\\_%';"        # 8 + audit_log = 8
```

### 10.4 smoke test (7 시나리오)

1. project 생성 → tenant_id, status='planning' 확인
2. task 생성 (parent 없음) → status='todo' 확인
3. sub-task 생성 → parent_task_id 확인
4. dependency 생성 (t1 → t2 FS) → 200
5. dependency cycle 시도 (t2 → t1 FS) → 400 `cycle_detected`
6. task status 변경 → audit_log 1행 추가 + SSE event 발행
7. 첨부 업로드 (서명 URL 발급 → 업로드 → metadata POST) → SHA-256 일치 확인

### 10.5 동기화 검증 (U-166-F)

- 브라우저 2개 탭으로 동일 project 열기 → 1번 탭에서 task status 변경 → 2번 탭에서 3초 이내 반영 (SSE)
- 대시보드 메뉴에서 PM KPI tile 표시 → task 완료 → tile 카운터 즉시 갱신

### 10.6 RBAC 검증

- viewer key 로 POST /v425/pm/tasks → 403
- analyst key 로 DELETE /v425/pm/projects/{id} → 403 (admin 필요)
- demo tenant key 로 다른 tenant 의 task GET → 404 (tenant 격리)

---

## 11. 알려진 한계 + 절대원칙 §6 보고

### 11.1 본 spec 의 의도적 미포함

| 항목 | 사유 | 별도 트랙 |
|---|---|---|
| AI 지연 예측 | spec 범위 (interface 만 정의) | N-152-F2 |
| 자원 평준화 | ML 필요 | N-152-F3 |
| Gantt 캐시 | 대용량 트랙 | N-152-F4 |
| Redis SSE bus | 인프라 | N-152-F5 |
| 외부 PM 연동 | Connector 트랙 | N-152-G |
| 모바일 앱 | RN/PWA | N-152-H |
| Time tracking (start/stop timer) | UX 트랙 | N-152-F6 |
| 부담량 (workload heatmap) | UX 트랙 | N-152-F7 |
| 자동 우선순위 (AI) | ML | N-152-F8 |

### 11.2 SSE PHP-FPM worker 점유

- 본 spec 의 SSE 는 PHP-FPM worker 를 long-poll 동안 점유 → 동시 사용자 200+ 환경에서 worker 부족 위험
- 대안: nginx + Node.js SSE service (Redis pub/sub) — N-152-F5 트랙

### 11.3 동기화 latency

- SSE 평균 latency 0.5~3s (PHP heartbeat 주기 의존)
- polling fallback 5s
- "실시간 주식 변동값" (U-166-F) 수준에 비해 1-2s 지연 — 본 spec 수용

### 11.4 audit_log append-only

- application 차원 강제 (PM/Audit handler 에서 PATCH/DELETE 거부)
- DB 차원 강제는 별도 USER + GRANT 분리 필요 — 운영 권한 정책 사용자 결정 필요 (절대원칙 §3 PM 책임)

### 11.5 GENIE_DEMO_DB_NAME 미설정 환경

- 현재 demo tenant 가 prod DB 와 schema 공유 — `pm_*` 테이블이 양쪽 모두 동일 row 누적 시 격리 불완전
- 방어선 4 트랙 (N-158-B) 적용 전까지 본 spec 의 `tenantContext().isDemo` 분기만 의존 — 사용자 보고 (절대원칙 §6)

---

## 12. 본 spec 적용 범위 (구현 단계 매트릭스)

| 단계 | 산출 | 사용자 승인 |
|---|---|---|
| 1. spec lint | 본 파일 review + 절대원칙 매핑 표 확인 | **필요** (다음 단계 진입) |
| 2. migration SQL | 8 sql 파일 (§3.1) | 필요 |
| 3. handler skeleton | `PM/Shared.php` + 11 sub-handler 파일 (signature 만) | 필요 |
| 4. handler 본체 + routes.php 등록 | 25 endpoint 구현 + 50 route line | 필요 |
| 5. i18n ko/en 추가 + 13 locale placeholder | 약 120-180 leaves | **필요** (U-164-A 동결 해제) |
| 6. frontend page skeleton + chunk | 9 페이지 + components/pm/* | 필요 |
| 7. SSE 채널 + 동기화 | events/stream + EventSource client | 필요 |
| 8. 운영 deploy + smoke test | cc plink 표준 | **필요** (배포 승인) |
| 9. handoff 인계서 | NEXT_SESSION.md 갱신 | **필요** (handoff 승인) |

각 단계 = 별도 PR 또는 commit 묶음. 1 단계 종료 → 사용자 보고 → 승인 → 다음 단계.

---

## 13. 절차 (절대원칙 §3 + U-166-B)

### 13.1 spec 승인 → 구현 진입

본 spec lint 후 사용자 승인 시 §12 단계 1 종결. 단계 2 (migration SQL) 진입.

### 13.2 변경 발견 시

구현 중 spec 변경 필요 → 본 파일 patch + 사용자 보고 → 승인 후 진행 (절대원칙 §6).

### 13.3 commit 메시지 패턴

```
feat(pm): N-152-F §X — <짧은 요지>
docs(spec): N-152-F §X 패치 — <변경 요지>
```

### 13.4 사이드바 메뉴 추가

`frontend/src/components/Sidebar.jsx` 에 PM 메뉴 그룹 (i18n 키: `sidebar.pm.*`) — §6 frontend skeleton 단계에서 동시 적용.

### 13.5 인계서 작성

각 단계 commit 묶음 종료 시 NEXT_SESSION.md 갱신. **사용자 명시 승인 후에만** (memory `feedback_handoff_approval.md`).

---

## 14. 부록: 비교 (사방넷 / Jira / Asana / Notion)

절대원칙 §7 (경쟁 플랫폼 이상) 충족 매트릭스:

| 기능 | 사방넷 | Jira | Asana | Notion | **본 spec** |
|---|:-:|:-:|:-:|:-:|:-:|
| 위계 task (parent/sub) | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| 의존성 FS/SS/FF/SF | ❌ | ✅ | ⚠️ FS only | ❌ | ✅ |
| Gantt + critical path | ❌ | ✅ (plugin) | ✅ | ❌ | ✅ |
| 다중 담당자 + role | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| 첨부 SHA-256 + 서명 URL | ❌ | ⚠️ | ⚠️ | ⚠️ | ✅ |
| audit log (append-only) | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| 실시간 동기화 (SSE/WS) | ❌ | ✅ | ✅ | ✅ | ✅ (SSE) |
| 메뉴 간 절대 동기화 (KPI tile) | ❌ | ⚠️ | ⚠️ | ❌ | ✅ |
| RBAC (viewer/analyst/admin) | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| tenant 격리 | ⚠️ | ✅ (cloud) | ✅ (cloud) | ⚠️ | ✅ |
| i18n 15 언어 | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| AI 지연 예측 hook | ❌ | ⚠️ | ⚠️ | ❌ | ⚠️ (interface 만) |

본 spec = **사방넷 초과** + Jira / Asana 와 동급 + 메뉴 절대 동기화는 본 플랫폼 강점.

---

## 15. 변경 이력

| 버전 | 일자 | 변경 |
|---|---|---|
| v1 (draft) | 2026-05-26 | 본 파일 신규 (168차 작성) |

본 spec 은 사용자 승인 + commit 후 canonical 로 진입. 승인 전까지 draft 상태.
