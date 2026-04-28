<?php
/**
 * db_restore.php — DB 스키마 백업 내보내기 + 원격 복원 스크립트
 *
 * 사용법:
 *   [로컬] http://localhost:8000/db_restore.php?action=export&token=genie_restore_2026
 *          → geniego_roi DB의 전체 스키마+데이터를 SQL 파일로 다운로드
 *
 *   [로컬] http://localhost:8000/db_restore.php?action=schema&token=genie_restore_2026
 *          → 스키마(CREATE TABLE)만 SQL 파일로 다운로드 (데이터 제외)
 *
 *   [원격서버] https://roi.genie-go.com/db_restore.php?action=restore&token=genie_restore_2026
 *          → 업로드된 SQL 파일을 원격 MySQL에 적용
 *          → POST: multipart sql_file 또는 ?from_url=<export URL>
 *
 *   [원격서버] https://roi.genie-go.com/db_restore.php?action=status&token=genie_restore_2026
 *          → 원격 DB 연결 상태 및 테이블 목록 확인
 */

declare(strict_types=1);

// ── 보안 토큰 ────────────────────────────────────────────────────────────────
define('RESTORE_TOKEN', 'genie_restore_2026');

// ── 도메인 감지 ───────────────────────────────────────────────────────────────
$httpHost   = strtolower(explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]);
$serverName = strtolower($_SERVER['SERVER_NAME'] ?? '');
$isProd     = in_array('roi.genie-go.com', [$httpHost, $serverName], true);

// ── DB 설정: roi.genie-go.com → 로컬 MySQL / 그 외 → 환경변수 → localhost fallback ──
if ($isProd) {
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'geniego_roi');
    define('DB_USER', 'root');
    define('DB_PASS', 'wms@Genie!61');
    define('DB_PORT', '3306');
} else {
    define('DB_HOST', getenv('GENIE_DB_HOST') ?: 'localhost');
    define('DB_NAME', getenv('GENIE_DB_NAME') ?: 'genie_roi');
    define('DB_USER', getenv('GENIE_DB_USER') ?: 'root');
    define('DB_PASS', getenv('GENIE_DB_PASS') ?: '');
    define('DB_PORT', getenv('GENIE_DB_PORT') ?: '3306');
}

// ── 인증 ─────────────────────────────────────────────────────────────────────
header('Content-Type: text/plain; charset=utf-8');

function authCheck(): void {
    $token = $_GET['token'] ?? $_POST['token'] ?? '';
    if ($token !== RESTORE_TOKEN) {
        http_response_code(403);
        die("[ERROR] 403 Forbidden — 올바른 token을 지정하세요.\n예: ?token=" . RESTORE_TOKEN . "\n");
    }
}

// ── PDO 연결 ──────────────────────────────────────────────────────────────────
function getPdo(): PDO {
    return new PDO(
        "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER, DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, time_zone='+00:00'",
        ]
    );
}

/**
 * SQL 문자열을 안전하게 개별 구문(statement)으로 분리합니다.
 * 문자열 리터럴 안의 세미콜론은 구분자로 처리하지 않습니다.
 * 순수 주석 행은 건너뜁니다.
 *
 * @return string[]
 */
function splitSql(string $sql): array {
    $statements = [];
    $current    = '';
    $inString   = false;
    $strChar    = '';
    $len        = strlen($sql);

    for ($i = 0; $i < $len; $i++) {
        $ch = $sql[$i];

        // 문자열 내부 이스케이프 처리
        if ($inString) {
            if ($ch === '\\') {
                $current .= $ch . ($sql[++$i] ?? '');
                continue;
            }
            if ($ch === $strChar) {
                $inString = false;
            }
            $current .= $ch;
            continue;
        }

        // 문자열 시작
        if ($ch === "'" || $ch === '"' || $ch === '`') {
            $inString = true;
            $strChar  = $ch;
            $current .= $ch;
            continue;
        }

        // 인라인 주석 (-- ...) 건너뜀
        if ($ch === '-' && ($sql[$i + 1] ?? '') === '-') {
            while ($i < $len && $sql[$i] !== "\n") $i++;
            continue;
        }

        // 블록 주석 (/* ... */) 건너뜀
        if ($ch === '/' && ($sql[$i + 1] ?? '') === '*') {
            $i += 2;
            while ($i < $len - 1 && !($sql[$i] === '*' && $sql[$i + 1] === '/')) $i++;
            $i += 2;
            continue;
        }

        // 구문 구분자
        if ($ch === ';') {
            $stmt = trim($current);
            if ($stmt !== '') {
                $statements[] = $stmt;
            }
            $current = '';
            continue;
        }

        $current .= $ch;
    }

    // 마지막 구문 (세미콜론 없이 끝날 경우)
    $stmt = trim($current);
    if ($stmt !== '') {
        $statements[] = $stmt;
    }

    return $statements;
}

// ─────────────────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? 'status';
authCheck();

// ══ ACTION: status ════════════════════════════════════════════════════════════
if ($action === 'status') {
    try {
        $pdo    = getPdo();
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        echo "=== DB 연결 상태 ===\n";
        echo "HOST  : " . DB_HOST . "\n";
        echo "PORT  : " . DB_PORT . "\n";
        echo "DB    : " . DB_NAME . "\n";
        echo "USER  : " . DB_USER . "\n";
        echo "도메인: $httpHost\n";
        echo "모드  : " . ($isProd ? "[프로덕션] roi.genie-go.com" : "[개발] 환경변수/localhost") . "\n\n";
        echo "=== 테이블 목록 (" . count($tables) . "개) ===\n";
        foreach ($tables as $t) {
            $cnt = (int)$pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
            printf("  %-45s %6d rows\n", $t, $cnt);
        }
        echo "\n총 테이블: " . count($tables) . "개\n";
    } catch (\Exception $e) {
        http_response_code(500);
        echo "[ERROR] DB 연결 실패: " . $e->getMessage() . "\n";
        echo "HOST=" . DB_HOST . " DB=" . DB_NAME . " USER=" . DB_USER . "\n";
    }
    exit;
}

// ══ ACTION: schema (스키마만, 데이터 제외) ═══════════════════════════════════
if ($action === 'schema') {
    try {
        $pdo    = getPdo();
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        $filename = 'geniego_roi_schema_' . date('Ymd_His') . '.sql';
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        echo "-- ============================================================\n";
        echo "-- GENIE ROI Schema-Only Backup\n";
        echo "-- Database  : " . DB_NAME . "\n";
        echo "-- Host      : " . DB_HOST . "\n";
        echo "-- Generated : " . date('Y-m-d H:i:s T') . "\n";
        echo "-- Tables    : " . count($tables) . "\n";
        echo "-- ============================================================\n\n";
        echo "SET FOREIGN_KEY_CHECKS=0;\n";
        echo "SET NAMES utf8mb4;\n";
        echo "SET time_zone='+00:00';\n\n";
        echo "CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n";
        echo "USE `" . DB_NAME . "`;\n\n";

        foreach ($tables as $table) {
            $createRow = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_ASSOC);
            $createSql = $createRow['Create Table'] ?? $createRow[array_key_last($createRow)] ?? '';
            echo "-- ── TABLE: $table ──────────────────────────────────────────\n";
            echo "DROP TABLE IF EXISTS `$table`;\n";
            echo $createSql . ";\n\n";
        }

        echo "SET FOREIGN_KEY_CHECKS=1;\n";
        echo "-- ============================================================\n";
        echo "-- Schema backup complete. Total tables: " . count($tables) . "\n";
        echo "-- ============================================================\n";

    } catch (\Exception $e) {
        http_response_code(500);
        echo "\n[ERROR] Schema export 실패: " . $e->getMessage() . "\n";
    }
    exit;
}

// ══ ACTION: export (스키마 + 데이터 전체) ════════════════════════════════════
if ($action === 'export') {
    try {
        $pdo    = getPdo();
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        $filename = 'geniego_roi_full_' . date('Ymd_His') . '.sql';
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        echo "-- ============================================================\n";
        echo "-- GENIE ROI Full DB Backup (Schema + Data)\n";
        echo "-- Database  : " . DB_NAME . "\n";
        echo "-- Host      : " . DB_HOST . "\n";
        echo "-- Generated : " . date('Y-m-d H:i:s T') . "\n";
        echo "-- Tables    : " . count($tables) . "\n";
        echo "-- ============================================================\n\n";
        echo "SET FOREIGN_KEY_CHECKS=0;\n";
        echo "SET NAMES utf8mb4;\n";
        echo "SET time_zone='+00:00';\n\n";
        echo "CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n";
        echo "USE `" . DB_NAME . "`;\n\n";

        foreach ($tables as $table) {
            // 스키마 (CREATE TABLE)
            $createRow = $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_ASSOC);
            $createSql = $createRow['Create Table'] ?? $createRow[array_key_last($createRow)] ?? '';
            echo "-- ── TABLE: $table ──────────────────────────────────────────\n";
            echo "DROP TABLE IF EXISTS `$table`;\n";
            echo $createSql . ";\n\n";

            // 데이터 (INSERT 100행씩)
            $rows = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
            if (empty($rows)) {
                echo "-- (no data in $table)\n\n";
                continue;
            }

            $cols   = '`' . implode('`, `', array_keys($rows[0])) . '`';
            $chunks = array_chunk($rows, 100);
            foreach ($chunks as $chunk) {
                $values = [];
                foreach ($chunk as $row) {
                    $escaped = array_map(
                        fn($v) => $v === null ? 'NULL' : $pdo->quote((string)$v),
                        $row
                    );
                    $values[] = '(' . implode(', ', $escaped) . ')';
                }
                echo "INSERT INTO `$table` ($cols) VALUES\n";
                echo implode(",\n", $values) . ";\n";
            }
            echo "\n";
        }

        echo "SET FOREIGN_KEY_CHECKS=1;\n";
        echo "-- ============================================================\n";
        echo "-- Backup complete. Total tables: " . count($tables) . "\n";
        echo "-- ============================================================\n";

    } catch (\Exception $e) {
        http_response_code(500);
        echo "\n[ERROR] Export 실패: " . $e->getMessage() . "\n";
    }
    exit;
}

// ══ ACTION: restore ═══════════════════════════════════════════════════════════
if ($action === 'restore') {
    $sqlContent = '';

    if (!empty($_FILES['sql_file']['tmp_name'])) {
        // multipart 파일 업로드
        $sqlContent = file_get_contents($_FILES['sql_file']['tmp_name']);
    } elseif (!empty($_POST['sql'])) {
        $sqlContent = $_POST['sql'];
    } elseif (!empty($_GET['from_url'])) {
        // 원격 URL에서 직접 다운로드 (예: 로컬 export 결과를 원격에서 pull)
        $exportUrl  = $_GET['from_url'];
        $sqlContent = @file_get_contents($exportUrl);
        if ($sqlContent === false) {
            http_response_code(400);
            die("[ERROR] URL에서 SQL 다운로드 실패: $exportUrl\n");
        }
    }

    if (empty($sqlContent)) {
        http_response_code(400);
        echo "[ERROR] SQL 내용이 없습니다.\n\n";
        echo "사용법:\n";
        echo "  1. multipart/form-data POST: sql_file 필드에 .sql 파일 첨부\n";
        echo "  2. POST 파라미터: sql=<SQL 내용>\n";
        echo "  3. GET 파라미터: from_url=<export URL>\n\n";
        echo "예시 (from_url 방식):\n";
        echo "  ?action=restore&token=" . RESTORE_TOKEN . "&from_url=" .
             urlencode("http://localhost:8000/db_restore.php?action=export&token=" . RESTORE_TOKEN) . "\n";
        exit;
    }

    try {
        $pdo = getPdo();

        echo "=== DB 복원 시작 ===\n";
        echo "HOST  : " . DB_HOST . "\n";
        echo "DB    : " . DB_NAME . "\n";
        echo "시각  : " . date('Y-m-d H:i:s') . "\n\n";

        $pdo->exec("SET FOREIGN_KEY_CHECKS=0");

        // 안전한 SQL 파서로 구문 분리
        $statements = splitSql($sqlContent);
        $total   = count($statements);
        $success = 0;
        $fail    = 0;
        $errors  = [];

        foreach ($statements as $stmt) {
            $preview = substr($stmt, 0, 60);
            try {
                $pdo->exec($stmt);
                $success++;
            } catch (\PDOException $e) {
                $fail++;
                $errors[] = "[!] " . str_replace("\n", " ", $preview) . "... → " . $e->getMessage();
                if ($fail >= 20) {
                    $errors[] = "... (오류 20개 초과, 나머지 생략)";
                    break;
                }
            }
        }

        $pdo->exec("SET FOREIGN_KEY_CHECKS=1");

        // 복원 후 테이블 현황
        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        echo "=== 복원 결과 ===\n";
        printf("전체 구문: %d\n", $total);
        printf("성공     : %d\n", $success);
        printf("실패     : %d\n\n", $fail);
        echo "=== 복원 후 테이블 (" . count($tables) . "개) ===\n";
        foreach ($tables as $t) {
            $cnt = (int)$pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
            printf("  %-45s %6d rows\n", $t, $cnt);
        }
        if (!empty($errors)) {
            echo "\n=== 오류 목록 ===\n";
            foreach ($errors as $err) echo "  $err\n";
        }
        echo "\n복원 완료: " . date('Y-m-d H:i:s') . "\n";

    } catch (\Exception $e) {
        http_response_code(500);
        echo "[ERROR] 복원 실패: " . $e->getMessage() . "\n";
        echo "HOST=" . DB_HOST . " DB=" . DB_NAME . " USER=" . DB_USER . "\n";
    }
    exit;
}

// ── 알 수 없는 action ─────────────────────────────────────────────────────────
http_response_code(400);
echo "[ERROR] 알 수 없는 action: $action\n";
echo "사용 가능한 action: status | schema | export | restore\n";
