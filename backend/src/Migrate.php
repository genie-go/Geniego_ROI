<?php
declare(strict_types=1);

namespace Genie;

/**
 * Migration runner (165차 spec v3 §13.4).
 *
 * - timestamp-prefixed `backend/migrations/*.sql` 을 lexicographic = chronological 순서로 적용
 * - `schema_migrations` 테이블로 idempotent 보장 (재실행 시 skip)
 * - 단일 PDO 적용 `run()` + 운영/데모 동시 `runBoth()` (U-165-C L2 동기화 핵심)
 * - SQLite driver 자동 변환 (§13.7): ENGINE/CHARSET/ENUM/ON UPDATE/KEY 등 MySQL 전용 구문 처리
 */
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
        sort($files);

        foreach ($files as $path) {
            $basename = basename($path);

            $check = $pdo->prepare("SELECT 1 FROM schema_migrations WHERE filename = ?");
            $check->execute([$basename]);
            if ($check->fetchColumn()) {
                $skipped[] = $basename;
                continue;
            }

            $sql = file_get_contents($path);
            if ($sql === false || trim($sql) === '') {
                throw new \RuntimeException("Empty/unreadable migration: $basename");
            }

            $checksum = hash('sha256', $sql);
            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);

            try {
                $pdo->beginTransaction();
                foreach (self::splitStatements($sql) as $stmt) {
                    if (trim($stmt) === '') continue;
                    $resolved = ($driver === 'mysql') ? [$stmt] : self::convertForSqlite($stmt);
                    foreach ($resolved as $exec) {
                        if (trim($exec) === '') continue;
                        $pdo->exec($exec);
                    }
                }
                $ins = $pdo->prepare("INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)");
                $ins->execute([$basename, $checksum]);
                // MySQL DDL implicit commit 으로 트랜잭션 무효화 가능 → inTransaction 체크 (166차 fix)
                if ($pdo->inTransaction()) $pdo->commit();
                $applied[] = $basename;
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw new \RuntimeException("Migration failed: $basename — " . $e->getMessage(), 0, $e);
            }
        }

        return ['applied' => $applied, 'skipped' => $skipped];
    }

    /**
     * [현 차수] 지정한 마이그레이션 파일만 적용 — 핸들러 런타임 자가치유(ensure*)용.
     *
     * 배경: 배포 파이프라인(deploy.ps1/deploy.sh/deploy.yml)이 `bin/migrate.php` 를 호출하지 않아
     *   마이그레이션은 수동 실행에만 의존한다. 그 결과 마이그레이션-전용 테이블(pm_* 8종)은
     *   신규 프로비저닝·DR 복원·SQLite 폴백 환경에서 부재하고, PM 핸들러의 무가드 INSERT 가 500 을 낸다.
     *   run() 은 디렉터리 전체를 적용해 운영 DB 에 부작용 위험이 있으므로, 도메인별 파일만 적용한다.
     *
     * 안전성: 대상 DDL 은 전부 `CREATE TABLE IF NOT EXISTS` → 이미 존재하면 no-op(운영 무영향).
     *   schema_migrations 기록도 run() 과 동일하게 남겨 이후 run() 이 재적용하지 않는다.
     *
     * @param string[] $paths 절대 경로 .sql 목록
     */
    public static function applyFiles(\PDO $pdo, array $paths): array
    {
        self::ensureTable($pdo);
        $applied = [];

        foreach ($paths as $path) {
            if (!is_file($path)) continue;
            $basename = basename($path);

            $check = $pdo->prepare("SELECT 1 FROM schema_migrations WHERE filename = ?");
            $check->execute([$basename]);
            if ($check->fetchColumn()) continue;

            $sql = file_get_contents($path);
            if ($sql === false || trim($sql) === '') continue;

            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            try {
                foreach (self::splitStatements($sql) as $stmt) {
                    if (trim($stmt) === '') continue;
                    $resolved = ($driver === 'mysql') ? [$stmt] : self::convertForSqlite($stmt);
                    foreach ($resolved as $exec) {
                        if (trim($exec) === '') continue;
                        $pdo->exec($exec);
                    }
                }
                $ins = $pdo->prepare("INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)");
                $ins->execute([$basename, hash('sha256', $sql)]);
                $applied[] = $basename;
            } catch (\Throwable $e) {
                // 자가치유는 best-effort — 실패해도 호출자를 죽이지 않는다(기존 동작 유지).
                error_log('[Migrate.applyFiles] ' . $basename . ' failed: ' . $e->getMessage());
            }
        }

        return $applied;
    }

    /**
     * 운영 + 데모 양쪽 동시 실행 — U-165-C 자동 동기화 핵심.
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
     * 단순 SQL split — 주석 제거 + ; 단위 분할.
     * 주의: 문자열 리터럴 내 ; 가 있으면 오작동. 본 spec 의 migration 은 simple DDL 만 가정.
     */
    private static function splitStatements(string $sql): array
    {
        // 168차 deploy 발견 버그: @rollback ... @end-rollback 블록을 forward apply 시 strip.
        // 기존: -- 라인만 제거하여 그 사이 DROP TABLE statement 가 살아남아 CREATE 직후 DROP.
        $sql = preg_replace('/^\s*--\s*@rollback\s*$.*?^\s*--\s*@end-rollback\s*$/ms', '', $sql) ?? $sql;

        $sql = preg_replace('!/\*.*?\*/!s', '', $sql) ?? $sql;
        $sql = preg_replace('!^\s*--.*$!m', '', $sql) ?? $sql;
        $parts = preg_split('/;\s*(\r?\n|$)/', $sql) ?: [];
        return array_values(array_filter(array_map('trim', $parts), fn($s) => $s !== ''));
    }

    /**
     * §13.7 SQLite driver 변환.
     * 단일 MySQL CREATE TABLE statement 를 받아 SQLite 호환 statement 리스트 반환.
     * 비-CREATE TABLE statement 는 best-effort 통과 (변환 대상 없음).
     *
     * 처리:
     *   - VARCHAR(N) → TEXT
     *   - DECIMAL(N,M) → REAL
     *   - DATETIME → TEXT
     *   - INT (단독) → INTEGER
     *   - ENUM('a','b','c') → TEXT CHECK(col IN ('a','b','c'))   ← 동일 라인 컬럼명 추출
     *   - ON UPDATE CURRENT_TIMESTAMP → 제거
     *   - ENGINE=... CHARSET=... COLLATE=... 테이블 옵션 → 제거
     *   - KEY / UNIQUE KEY 인라인 → 별도 CREATE INDEX statement (테이블명 prefix 로 충돌 방지)
     */
    private static function convertForSqlite(string $stmt): array
    {
        if (!preg_match('/^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(/i', $stmt, $tm)) {
            // CREATE INDEX 등 단순 statement 는 그대로 통과 (이미 SQLite 호환 가능 케이스)
            return [$stmt];
        }
        $tableName = $tm[1];

        // 1) 테이블 옵션 제거 (ENGINE/CHARSET/COLLATE)
        $stmt = preg_replace('/\)\s*ENGINE\s*=\s*\w+[^;]*$/i', ')', $stmt) ?? $stmt;
        $stmt = preg_replace('/\bDEFAULT\s+CHARSET\s*=\s*\w+/i', '', $stmt) ?? $stmt;
        $stmt = preg_replace('/\bCOLLATE\s*=\s*[\w_]+/i', '', $stmt) ?? $stmt;

        // 2) ON UPDATE CURRENT_TIMESTAMP 제거 (SQLite 미지원)
        $stmt = preg_replace('/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/i', '', $stmt) ?? $stmt;

        // 3) 타입 매핑 (단순 substitution)
        $stmt = preg_replace('/\bVARCHAR\s*\(\d+\)/i', 'TEXT', $stmt) ?? $stmt;
        $stmt = preg_replace('/\bDECIMAL\s*\(\d+\s*,\s*\d+\)/i', 'REAL', $stmt) ?? $stmt;
        $stmt = preg_replace('/\bDATETIME\b/i', 'TEXT', $stmt) ?? $stmt;
        $stmt = preg_replace('/\bMEDIUMTEXT\b/i', 'TEXT', $stmt) ?? $stmt;
        $stmt = preg_replace('/\bDOUBLE\b/i', 'REAL', $stmt) ?? $stmt;
        // INT → INTEGER (단독 토큰만; INTEGER, INT(N) 보호)
        $stmt = preg_replace('/\bINT\b(?!\s*\()/i', 'INTEGER', $stmt) ?? $stmt;
        $stmt = preg_replace('/\bTINYINT\s*\(\d+\)/i', 'INTEGER', $stmt) ?? $stmt;

        // 4) ENUM 변환: `col ENUM('a','b') NOT NULL DEFAULT 'a'` → `col TEXT NOT NULL DEFAULT 'a' CHECK(col IN ('a','b'))`
        $stmt = preg_replace_callback(
            '/(\w+)\s+ENUM\s*\(([^)]+)\)(\s+NOT\s+NULL)?(\s+DEFAULT\s+\'[^\']*\')?/i',
            function ($m) {
                $col = $m[1];
                $values = $m[2];
                $notNull = $m[3] ?? '';
                $default = $m[4] ?? '';
                return "{$col} TEXT{$notNull}{$default} CHECK({$col} IN ({$values}))";
            },
            $stmt
        ) ?? $stmt;

        // 5) KEY / UNIQUE KEY 인라인 추출 → 별도 CREATE INDEX statement 생성
        // 패턴: ",  KEY idx_name (col1, col2)" or "UNIQUE KEY uniq_name (...)"
        $indexStatements = [];
        $stmt = preg_replace_callback(
            '/,\s*(UNIQUE\s+)?KEY\s+(\w+)\s*\(([^)]+)\)/i',
            function ($m) use ($tableName, &$indexStatements) {
                $unique = !empty(trim($m[1])) ? 'UNIQUE ' : '';
                $idxName = $tableName . '_' . $m[2];  // 테이블명 prefix 로 SQLite 전역 namespace 충돌 회피
                $cols = preg_replace('/\s+/', ' ', trim($m[3]));
                $indexStatements[] = "CREATE {$unique}INDEX IF NOT EXISTS {$idxName} ON {$tableName}({$cols})";
                return '';
            },
            $stmt
        ) ?? $stmt;

        // 6) 빈 라인 / 잔여 콤마 정리
        $stmt = preg_replace('/,\s*\)/', ')', $stmt) ?? $stmt;
        $stmt = preg_replace('/\n\s*\n/', "\n", $stmt) ?? $stmt;

        // 결과: CREATE TABLE + 추출된 인덱스들
        $out = [trim($stmt)];
        foreach ($indexStatements as $idx) $out[] = $idx;
        return $out;
    }

    /**
     * Dry-run: 적용 예정 migration 식별. DB 변경 없음.
     * schema_migrations 테이블만 idempotent CREATE — 실제 migration DDL 은 실행하지 않음.
     * @return array{pending: string[], skipped: string[]}
     */
    public static function dryRun(\PDO $pdo, ?string $dir = null): array
    {
        $dir = $dir ?: __DIR__ . '/../migrations';
        if (!is_dir($dir)) {
            throw new \RuntimeException("Migration dir not found: $dir");
        }

        self::ensureTable($pdo);

        $pending = [];
        $skipped = [];

        $files = glob($dir . '/*.sql') ?: [];
        sort($files);

        foreach ($files as $path) {
            $basename = basename($path);

            $check = $pdo->prepare("SELECT 1 FROM schema_migrations WHERE filename = ?");
            $check->execute([$basename]);
            if ($check->fetchColumn()) {
                $skipped[] = $basename;
                continue;
            }

            $sql = file_get_contents($path);
            if ($sql === false || trim($sql) === '') {
                throw new \RuntimeException("Empty/unreadable migration: $basename");
            }
            $pending[] = $basename;
        }

        return ['pending' => $pending, 'skipped' => $skipped];
    }

    /**
     * Dry-run 양쪽 동시 — runBoth() 와 동형, DB 변경 없음.
     */
    public static function dryRunBoth(?string $dir = null): array
    {
        return [
            'production' => self::dryRun(Db::pdoFor(false), $dir),
            'demo'       => self::dryRun(Db::pdoFor(true), $dir),
        ];
    }

    /**
     * Rollback: schema_migrations 의 마지막 $steps 개 record 의 @rollback 블록 SQL 적용 후 record DELETE.
     *
     * Convention: migration 파일은 `-- @rollback` 마커 이후 reverse DDL 을 포함해야 함.
     * 옵션으로 `-- @end-rollback` 종료 마커 지원 (생략 시 파일 끝까지).
     *
     * @return array{reverted: string[], errors: string[]}
     */
    public static function rollback(\PDO $pdo, int $steps = 1, ?string $dir = null): array
    {
        $dir = $dir ?: __DIR__ . '/../migrations';
        if (!is_dir($dir)) {
            throw new \RuntimeException("Migration dir not found: $dir");
        }
        $steps = max(1, $steps);

        self::ensureTable($pdo);

        $stmt = $pdo->query("SELECT filename FROM schema_migrations ORDER BY applied_at DESC, filename DESC LIMIT " . $steps);
        $targets = $stmt ? $stmt->fetchAll(\PDO::FETCH_COLUMN) : [];

        $reverted = [];
        $errors = [];

        foreach ($targets as $basename) {
            $path = $dir . '/' . $basename;
            if (!is_file($path)) {
                throw new \RuntimeException("Migration file missing for rollback: $basename");
            }
            $sql = (string)file_get_contents($path);
            $block = self::extractRollbackBlock($sql);
            if ($block === null) {
                throw new \RuntimeException("No @rollback block in: $basename — rollback requires '-- @rollback' marker convention");
            }

            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            try {
                $pdo->beginTransaction();
                foreach (self::splitStatements($block) as $s) {
                    if (trim($s) === '') continue;
                    $resolved = ($driver === 'mysql') ? [$s] : self::convertForSqlite($s);
                    foreach ($resolved as $exec) {
                        if (trim($exec) === '') continue;
                        $pdo->exec($exec);
                    }
                }
                $del = $pdo->prepare("DELETE FROM schema_migrations WHERE filename = ?");
                $del->execute([$basename]);
                if ($pdo->inTransaction()) $pdo->commit();
                $reverted[] = $basename;
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                throw new \RuntimeException("Rollback failed: $basename — " . $e->getMessage(), 0, $e);
            }
        }

        return ['reverted' => $reverted, 'errors' => $errors];
    }

    /**
     * Dry-run rollback: 적용 예정 reverse 식별. DB 변경 없음.
     * @return array{planned: string[], missing_rollback: string[]}
     */
    public static function dryRunRollback(\PDO $pdo, int $steps = 1, ?string $dir = null): array
    {
        $dir = $dir ?: __DIR__ . '/../migrations';
        if (!is_dir($dir)) {
            throw new \RuntimeException("Migration dir not found: $dir");
        }
        $steps = max(1, $steps);

        self::ensureTable($pdo);

        $stmt = $pdo->query("SELECT filename FROM schema_migrations ORDER BY applied_at DESC, filename DESC LIMIT " . $steps);
        $targets = $stmt ? $stmt->fetchAll(\PDO::FETCH_COLUMN) : [];

        $planned = [];
        $missing = [];

        foreach ($targets as $basename) {
            $path = $dir . '/' . $basename;
            if (!is_file($path)) {
                $missing[] = "$basename (file missing)";
                continue;
            }
            $sql = (string)file_get_contents($path);
            if (self::extractRollbackBlock($sql) === null) {
                $missing[] = "$basename (no @rollback block)";
            } else {
                $planned[] = $basename;
            }
        }

        return ['planned' => $planned, 'missing_rollback' => $missing];
    }

    /**
     * Rollback 양쪽 동시 — runBoth() 와 동형.
     */
    public static function rollbackBoth(int $steps = 1, ?string $dir = null): array
    {
        return [
            'production' => self::rollback(Db::pdoFor(false), $steps, $dir),
            'demo'       => self::rollback(Db::pdoFor(true), $steps, $dir),
        ];
    }

    /**
     * Dry-run rollback 양쪽 동시.
     */
    public static function dryRunRollbackBoth(int $steps = 1, ?string $dir = null): array
    {
        return [
            'production' => self::dryRunRollback(Db::pdoFor(false), $steps, $dir),
            'demo'       => self::dryRunRollback(Db::pdoFor(true), $steps, $dir),
        ];
    }

    /**
     * @rollback 블록 추출. `-- @rollback` 라인 이후 부터 `-- @end-rollback` (선택) 까지.
     * 마커 없으면 null 반환.
     */
    private static function extractRollbackBlock(string $sql): ?string
    {
        if (!preg_match('/^\s*--\s*@rollback\s*$/mi', $sql, $m, PREG_OFFSET_CAPTURE)) {
            return null;
        }
        $start = $m[0][1] + strlen($m[0][0]);
        $rest = substr($sql, $start);
        if (preg_match('/^\s*--\s*@end-rollback\s*$/mi', $rest, $em, PREG_OFFSET_CAPTURE)) {
            $rest = substr($rest, 0, $em[0][1]);
        }
        $rest = trim($rest);
        return $rest === '' ? null : $rest;
    }
}
