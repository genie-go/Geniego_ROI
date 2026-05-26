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
}
