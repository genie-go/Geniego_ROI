# OrderHub Aggregator API Spec v3 (165차, migration 기반 자동 동기화)

> **작성일**: 2026-05-26
> **세션**: 165차 백엔드 트랙
> **버전**: v3 (v2 기반 + U-165-C L2 schema migration 도입)
> **저장 위치 (canonical)**: `docs/spec/backend_orderhub_aggregator_165_v3.md`
> **v2 대비 변경**: §13 신설 (migration 인프라) + §5/§10 보정 (ensureSchema 제거)

---

## 0. 사용자 원칙 (최상위)

- **U-165-A**: 데모 데이터 운영 유입 절대 금지 (격리)
- **U-165-C 신규**: 운영 고도화/기능 추가 시 데모 버전 자동 동기화 (코드 L1 / schema L2 / seed L3 의 3 레벨)
- **U-165-B 신규**: 데모 격리 점진적 적용 트랙 (기존 41 handler 별도 트랙)

본 spec v3 = U-165-A (v2 유지) + **U-165-C L2 (schema migration)** 적용. L3 (seed) + U-165-B 점진 = 별도 트랙.

---

## 1. v2 대비 변경 요약

| 항목 | v2 | v3 |
|---|---|---|
| schema 적용 방식 | handler 내 `ensureSchema` lazy auto-CREATE | **migration runner 일괄 적용** |
| 적용 환경 | demo 만 (운영은 `GENIE_ALLOW_AUTO_SCHEMA=0`) | **운영 + demo 양쪽 자동** |
| 운영-demo 동기화 | 수동 (별도 인프라 작업) | **deploy 시 자동** (U-165-C 충족) |
| OrderHub `ensureSchema` | 환경 분기 lazy | **삭제** (migration 으로 이전) |
| GENIE_ALLOW_AUTO_SCHEMA | 운영 auto-CREATE 차단 flag | **제거** (불필요) |

---

## 2. 신규 endpoint 정의 (v1/v2 동일)

§2.1 ~ §2.3 = v1 그대로. 응답 schema 변경 없음.

---

## 3. DB 스키마 (v1/v2 동일, 적용 방식만 변경)

§3.1 `channel_orders` = 기존, 변경 없음.
§3.2 `orderhub_claims` = v1 DDL 그대로.
§3.3 `orderhub_settlements` = v1 DDL 그대로.

**★ 변경**: 적용 위치가 **handler 내 `ensureSchema`** 가 아닌 **`backend/migrations/` SQL 파일** + migration runner.

---

## 4. 환경 분리 (v2 동일)

§4.1 `GENIE_ENV` / `GENIE_DB_NAME` / `GENIE_DEMO_DB_NAME` = v2 그대로.
§4.2 `Db::pdoFor(bool)` / `Db::env()` = v2 그대로 (CC 적용 완료).

**★ 변경**: `.env.example` 의 `GENIE_ALLOW_AUTO_SCHEMA` 제거.

---

## 5. Handler 클래스 사양 (★ v2 대비 보정)

### 5.1 핵심 변경

- `ensureSchema()` 메서드 **삭제** → migration 이 담당
- `claims()` / `settlements()` 진입부의 `self::ensureSchema($pdo, $isDemo)` 호출 **삭제**
- 나머지 (gate / guardEnv / isDemoTenant / tenantContext / orders / claims / settlements 본체) = v2 그대로

### 5.2 클래스 구조 (v2 §5.2 보정)

```php
final class OrderHub
{
    // 유지 (v2 그대로)
    private static function tenantContext(Request $req): ?array { ... }
    private static function isDemoTenant(string $tenant): bool { ... }
    private static function guardEnv(bool $isDemo): ?array { ... }
    private static function pdo(bool $isDemo): \PDO { ... }
    private static function json(Response $resp, array $payload, int $status = 200): Response { ... }
    private static function clampLimit(Request $req): array { ... }
    private static function gate(Request $req, Response $resp): array { ... }

    // ★ 삭제
    // private static function ensureSchema(\PDO $pdo, bool $isDemo): void { ... }

    public static function orders(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        // ... v2 그대로
    }

    public static function claims(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        // ★ self::ensureSchema($pdo, $isDemo);  ← 삭제
        [$limit, $offset] = self::clampLimit($req);
        // ... v2 그대로
    }

    public static function settlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        // ★ self::ensureSchema($pdo, $isDemo);  ← 삭제
        [$limit, $offset] = self::clampLimit($req);
        // ... v2 그대로
    }
}
```

---

## 6. routes.php 등록 (v1 적용 완료, 변경 없음)

---

## 7. 인증 / Bypass 정책 (v2 동일)

---

## 8. Frontend 연동 (별도 작업, v1/v2 동일)

---

## 9. 검증 절차 (★ migration 검증 추가)

### 9.1 PHP syntax

```bash
php -l backend/src/Db.php
php -l backend/src/Handlers/OrderHub.php
php -l backend/src/Migrate.php   # ★ 신규
```

### 9.2 routes 등록 검증 (v1 적용 완료)

### 9.3 migration 적용 검증 (★ 신규)

```bash
# 운영 환경
php backend/bin/migrate.php

# demo 환경
GENIE_ENV=demo php backend/bin/migrate.php

# 양쪽 모두에 동일 schema 적용 확인
mysql -e "DESCRIBE geniego_roi.orderhub_claims;"
mysql -e "DESCRIBE geniego_roi_demo.orderhub_claims;"
```

### 9.4 smoke test (v2 §9.3 동일, 5 시나리오)

---

## 10. 본 spec v3 적용 범위

- ✅ `OrderHub.php` 보정 (ensureSchema 삭제 + 호출 제거, 약 -30 라인)
- ✅ `Db.php` 마이그레이션 runner 메서드 추가 (`Db::runMigrations()`)
- ✅ `backend/Migrate.php` 신규 (또는 `Db::runMigrations()` 내장)
- ✅ `backend/migrations/` 디렉터리 신규
- ✅ `backend/migrations/20260526_165_001_create_orderhub_claims.sql` 신규
- ✅ `backend/migrations/20260526_165_002_create_orderhub_settlements.sql` 신규
- ✅ `backend/bin/migrate.php` CLI runner 신규
- ✅ `schema_migrations` 테이블 (auto-CREATE on first run, migration runner 책임)
- ✅ `.env.example` 보정 (`GENIE_ALLOW_AUTO_SCHEMA` 제거)
- ❌ Frontend 변경 (별도)
- ❌ demo DB 물리 분리 (인프라, 별도)
- ❌ 41 handler 점진 migration 화 (U-165-B 트랙)
- ❌ L3 (demo seed) 인프라 (별도 트랙)
- ❌ CI 자동 migration 실행 (별도 트랙, deploy hook)

---

## 11. 격리 방어선 매핑 (v2 §11 동일)

| 방어선 | v3 적용 |
|---|:---:|
| 1. 환경 분리 (env 변수) | ✅ (v2 적용) |
| 2. middleware auth_tenant 신뢰 | ✅ (v2 적용) |
| 3. 환경 ↔ tenant cross-check | ✅ (v2 적용) |
| 4. DB 물리 분리 | (코드 준비됨, 인프라 별도) |
| 5. auto-CREATE 조건부 | **migration 으로 대체** ✅ |
| 6. demo 키 권한 강등 | 별도 작업 |

---

## 12. 알려진 한계 (v2 + 추가)

1. 방어선 4 (DB 물리 분리) 미적용 시 동일 (v2 §12.1)
2. `isDemoTenant` prefix 규칙 동일 (v2 §12.2)
3. `_env / _isDemo` 디버그 필드 (v2 §12.3)
4. **★ 신규**: migration runner 가 운영 DB + demo DB 양쪽에 동시 실행되지 않으면 schema drift 발생. CI/deploy hook 에서 양쪽 명시 실행 의무.
5. **★ 신규**: migration SQL 의 down (rollback) 미지원. forward-only. rollback 필요 시 새 migration 작성.

---

## 13. Migration 인프라 (★ 신규 §)

### 13.1 디렉터리 구조

```
backend/
├── migrations/                          # SQL 파일 디렉터리
│   ├── 20260526_165_001_create_orderhub_claims.sql
│   ├── 20260526_165_002_create_orderhub_settlements.sql
│   └── (이후 작업이 timestamp_prefix 로 추가)
├── bin/
│   └── migrate.php                      # CLI runner
└── src/
    └── Migrate.php                      # runner 클래스 (Db.php 가 위임)
```

### 13.2 파일 명명 규칙

```
{YYYYMMDD}_{sessionNumber}_{seq}_{description}.sql
```

예:
- `20260526_165_001_create_orderhub_claims.sql`
- `20260526_165_002_create_orderhub_settlements.sql`

### 13.3 `schema_migrations` 테이블

migration runner 가 처음 실행 시 auto-CREATE:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64) DEFAULT NULL
);
```

SQLite fallback:
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  checksum TEXT
);
```

### 13.4 `Migrate.php` 스켈레톤

```php
<?php
declare(strict_types=1);

namespace Genie;

final class Migrate
{
    /**
     * 단일 PDO 에 대해 미실행 migration 을 timestamp 순서로 적용.
     * @return array{applied: string[], skipped: string[]}
     */
    public static function run(\PDO $pdo, ?string $dir = null): array
    {
        $dir = $dir ?: __DIR__ . '/../migrations';
        if (!is_dir($dir)) {
            throw new \RuntimeException("Migration dir not found: $dir");
        }

        self::ensureTable($pdo);

        $applied = [];
        $skipped = [];

        $files = glob($dir . '/*.sql') ?: [];
        sort($files);  // 파일명 = timestamp_prefix → lexicographic = chronological

        foreach ($files as $path) {
            $basename = basename($path);

            $stmt = $pdo->prepare("SELECT 1 FROM schema_migrations WHERE filename = ?");
            $stmt->execute([$basename]);
            if ($stmt->fetchColumn()) {
                $skipped[] = $basename;
                continue;
            }

            $sql = file_get_contents($path);
            if ($sql === false || trim($sql) === '') {
                throw new \RuntimeException("Empty/unreadable migration: $basename");
            }

            $checksum = hash('sha256', $sql);

            try {
                $pdo->beginTransaction();
                // 다중 statement 지원: ; 단위 split (단순 경우만, 복잡 케이스는 별도 처리)
                foreach (self::splitStatements($sql) as $stmt) {
                    if (trim($stmt) !== '') {
                        $pdo->exec($stmt);
                    }
                }
                $ins = $pdo->prepare("INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)");
                $ins->execute([$basename, $checksum]);
                $pdo->commit();
                $applied[] = $basename;
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw new \RuntimeException("Migration failed: $basename — " . $e->getMessage(), 0, $e);
            }
        }

        return ['applied' => $applied, 'skipped' => $skipped];
    }

    /**
     * 운영 + demo 양쪽 동시 실행 — U-165-C 자동 동기화 핵심.
     */
    public static function runBoth(?string $dir = null): array
    {
        $prod = self::run(Db::pdoFor(false), $dir);
        $demo = self::run(Db::pdoFor(true), $dir);
        return ['production' => $prod, 'demo' => $demo];
    }

    private static function ensureTable(\PDO $pdo): void
    {
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS schema_migrations (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                checksum VARCHAR(64) DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS schema_migrations (
                filename TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (datetime('now')),
                checksum TEXT
            )");
        }
    }

    /**
     * 단순 SQL split. 다중 statement 지원.
     * 주의: 문자열 리터럴 내 ; 가 있으면 오작동. 본 spec 의 migration 은 simple DDL 만 가정.
     */
    private static function splitStatements(string $sql): array
    {
        // 주석 제거 후 ; 단위 split
        $sql = preg_replace('!/\*.*?\*/!s', '', $sql);  // /* ... */
        $sql = preg_replace('!^--.*$!m', '', $sql);     // -- ...
        $parts = preg_split('/;\s*(\r?\n|$)/', $sql) ?: [];
        return array_filter(array_map('trim', $parts), fn($s) => $s !== '');
    }
}
```

### 13.5 `bin/migrate.php` CLI runner

```php
#!/usr/bin/env php
<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Migrate;

$mode = $argv[1] ?? 'both';  // 'both' | 'production' | 'demo' | 'current'

try {
    if ($mode === 'both') {
        $result = Migrate::runBoth();
        echo "=== Production ===\n";
        echo "Applied: " . count($result['production']['applied']) . "\n";
        foreach ($result['production']['applied'] as $f) echo "  + $f\n";
        echo "Skipped: " . count($result['production']['skipped']) . "\n";
        echo "\n=== Demo ===\n";
        echo "Applied: " . count($result['demo']['applied']) . "\n";
        foreach ($result['demo']['applied'] as $f) echo "  + $f\n";
        echo "Skipped: " . count($result['demo']['skipped']) . "\n";
    } elseif ($mode === 'production') {
        $r = Migrate::run(Db::pdoFor(false));
        echo "Applied: " . implode(', ', $r['applied']) . "\n";
        echo "Skipped: " . count($r['skipped']) . "\n";
    } elseif ($mode === 'demo') {
        $r = Migrate::run(Db::pdoFor(true));
        echo "Applied: " . implode(', ', $r['applied']) . "\n";
        echo "Skipped: " . count($r['skipped']) . "\n";
    } elseif ($mode === 'current') {
        $r = Migrate::run(Db::pdo());
        echo "Env: " . Db::env() . "\n";
        echo "Applied: " . implode(', ', $r['applied']) . "\n";
    } else {
        fwrite(STDERR, "Usage: migrate.php [both|production|demo|current]\n");
        exit(2);
    }
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[migrate] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
```

### 13.6 첫 2 migration SQL

**`backend/migrations/20260526_165_001_create_orderhub_claims.sql`**:

```sql
-- 165차 spec: docs/spec/backend_orderhub_aggregator_165_v3.md §3.2
-- OrderHub claims aggregator table

CREATE TABLE IF NOT EXISTS orderhub_claims (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  buyer VARCHAR(128) DEFAULT NULL,
  channel VARCHAR(32) DEFAULT NULL,
  type ENUM('return','cancel','exchange') NOT NULL DEFAULT 'return',
  reason VARCHAR(255) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount DECIMAL(14,2) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_tenant_status (tenant_id, status),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**`backend/migrations/20260526_165_002_create_orderhub_settlements.sql`**:

```sql
-- 165차 spec: docs/spec/backend_orderhub_aggregator_165_v3.md §3.3
-- OrderHub settlements aggregator table

CREATE TABLE IF NOT EXISTS orderhub_settlements (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  period VARCHAR(7) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  gross_sales DECIMAL(14,2) DEFAULT 0,
  net_payout DECIMAL(14,2) DEFAULT 0,
  platform_fee DECIMAL(14,2) DEFAULT 0,
  ad_fee DECIMAL(14,2) DEFAULT 0,
  coupon_discount DECIMAL(14,2) DEFAULT 0,
  return_fee DECIMAL(14,2) DEFAULT 0,
  orders_count INT DEFAULT 0,
  returns_count INT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_tenant_period (tenant_id, period),
  UNIQUE KEY uniq_tenant_period_channel (tenant_id, period, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 13.7 SQLite fallback 처리

migration SQL 은 MySQL 표준 DDL. SQLite 환경에서는 runner 가 driver 감지 후 변환:
- `ENGINE=InnoDB ...` → 무시
- `ENUM(...)` → `TEXT CHECK (col IN (...))`
- `ON UPDATE CURRENT_TIMESTAMP` → 무시 (SQLite 미지원)
- `KEY idx_x (cols)` → `CREATE INDEX IF NOT EXISTS` 별도 statement

**본 spec 적용 시점**: SQLite 변환 로직은 `Migrate::splitStatements` 다음 단계에서 driver 감지 후 정규식 변환으로 처리. 본 spec 범위 내 구현. (간단 케이스만, 복잡한 SQL 은 별도 SQLite migration 파일 권장)

또는 더 안전한 방식: migration 디렉터리를 driver 별로 분리:
- `backend/migrations/mysql/`
- `backend/migrations/sqlite/`

본 spec 은 **단일 디렉터리 + runner 내 변환** 채택. 변환 실패 시 명시적 driver 별 디렉터리로 전환 가능.

### 13.8 자동 실행 시점 (U-165-C 핵심)

| 시점 | 실행 주체 | 명령 |
|---|---|---|
| 로컬 개발 | 개발자 | `php backend/bin/migrate.php both` |
| **deploy 시** | CI/CD | `php backend/bin/migrate.php both` (deploy hook, 별도 트랙) |
| 긴급 수동 | 운영자 | `php backend/bin/migrate.php production` 또는 `demo` |

**deploy hook 통합** = 별도 트랙 (CI 변경 작업). 본 spec 은 명령 정의까지.

### 13.9 검증

```bash
# 두 환경 동시 적용
php backend/bin/migrate.php both

# 기대 출력:
# === Production ===
# Applied: 2
#   + 20260526_165_001_create_orderhub_claims.sql
#   + 20260526_165_002_create_orderhub_settlements.sql
# Skipped: 0
#
# === Demo ===
# Applied: 2
#   + 20260526_165_001_create_orderhub_claims.sql
#   + 20260526_165_002_create_orderhub_settlements.sql
# Skipped: 0

# 재실행 시 모두 skipped
php backend/bin/migrate.php both
# Applied: 0, Skipped: 2 (각 환경)

# schema 동기화 확인
mysql -e "SELECT filename FROM geniego_roi.schema_migrations;"
mysql -e "SELECT filename FROM geniego_roi_demo.schema_migrations;"
# 두 결과가 동일해야 함 = U-165-C L2 동기화 달성
```

---

## 14. 작업 순서 (CC 구현 명령 가이드)

1. spec v2 (현 위치 `docs/spec/docs/spec/`) → canonical `docs/spec/` 로 이동 (mv)
2. spec v3 (본 파일) `docs/spec/` 에 추가
3. `backend/migrations/` 디렉터리 생성
4. `backend/migrations/20260526_165_001_create_orderhub_claims.sql` 생성
5. `backend/migrations/20260526_165_002_create_orderhub_settlements.sql` 생성
6. `backend/src/Migrate.php` 생성 (§13.4 그대로)
7. `backend/bin/migrate.php` 생성 (§13.5 그대로)
8. `backend/src/Handlers/OrderHub.php` 보정: `ensureSchema()` 메서드 삭제 + `claims()` / `settlements()` 의 `self::ensureSchema(...)` 호출 라인 삭제
9. `backend/.env.example` 보정: `GENIE_ALLOW_AUTO_SCHEMA` 라인 삭제
10. 정합성 검증 (php -l, brace balance, migration dry-run via SQLite if MySQL 부재)

---

**문서 종결.**