<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * DbAdmin — phpMyAdmin 스타일 DB 관리 API
 *
 * GET  /v423/dbadmin/tables              — 테이블 목록 + 행수 + 크기
 * GET  /v423/dbadmin/tables/{table}      — 테이블 구조 (컬럼, 인덱스)
 * GET  /v423/dbadmin/tables/{table}/rows — 페이지네이션 데이터
 * POST /v423/dbadmin/query               — SQL 실행
 * POST /v423/dbadmin/tables/{table}/truncate — 테이블 비우기 (admin only)
 * DELETE /v423/dbadmin/tables/{table}/rows/{id} — 행 삭제
 */
final class DbAdmin
{
    private static function json(ResponseInterface $res, array $data, int $status = 200): ResponseInterface
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function err(ResponseInterface $res, string $msg, int $status = 400): ResponseInterface
    {
        return self::json($res, ['ok' => false, 'error' => $msg], $status);
    }

    /** GET /v423/dbadmin/tables */
    public static function tables(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo = Db::pdo();

        // 테이블 목록 + information_schema 에서 크기/행수 가져오기
        $stmt = $pdo->query(
            "SELECT
                TABLE_NAME        AS `table_name`,
                TABLE_ROWS        AS `row_estimate`,
                DATA_LENGTH       AS `data_bytes`,
                INDEX_LENGTH      AS `index_bytes`,
                AUTO_INCREMENT    AS `auto_increment`,
                CREATE_TIME       AS `created_at`,
                TABLE_COMMENT     AS `comment`
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME ASC"
        );
        $tables = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // 정확한 COUNT (소규모 DB이므로 허용)
        foreach ($tables as &$t) {
            try {
                $name = $t['table_name'];
                $cnt  = $pdo->query("SELECT COUNT(*) FROM `{$name}`")->fetchColumn();
                $t['row_count']    = (int)$cnt;
                $t['data_bytes']   = (int)$t['data_bytes'];
                $t['index_bytes']  = (int)$t['index_bytes'];
                $t['total_bytes']  = $t['data_bytes'] + $t['index_bytes'];
            } catch (\Throwable $e) {
                $t['row_count'] = 0;
            }
        }
        unset($t);

        return self::json($res, ['ok' => true, 'tables' => $tables, 'count' => count($tables)]);
    }

    /** GET /v423/dbadmin/tables/{table} — 컬럼 구조 + 인덱스 */
    public static function tableStructure(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $table = preg_replace('/[^a-zA-Z0-9_]/', '', $args['table'] ?? '');
        if (!$table) return self::err($res, 'Invalid table name');

        $pdo = Db::pdo();

        // 컬럼 정보
        $cols = $pdo->query("SHOW FULL COLUMNS FROM `{$table}`")->fetchAll(\PDO::FETCH_ASSOC);

        // 인덱스 정보
        $indexes = $pdo->query("SHOW INDEX FROM `{$table}`")->fetchAll(\PDO::FETCH_ASSOC);

        // CREATE TABLE DDL
        $ddl = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(\PDO::FETCH_ASSOC);
        $ddlSql = $ddl['Create Table'] ?? '';

        // 행 수
        $rowCount = (int)$pdo->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();

        return self::json($res, [
            'ok'         => true,
            'table'      => $table,
            'row_count'  => $rowCount,
            'columns'    => $cols,
            'indexes'    => $indexes,
            'create_sql' => $ddlSql,
        ]);
    }

    /** GET /v423/dbadmin/tables/{table}/rows?page=1&limit=50&search=&order_by=id&order_dir=DESC */
    public static function tableRows(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $table = preg_replace('/[^a-zA-Z0-9_]/', '', $args['table'] ?? '');
        if (!$table) return self::err($res, 'Invalid table name');

        $pdo    = Db::pdo();
        $params = $req->getQueryParams();
        $page   = max(1, (int)($params['page'] ?? 1));
        $limit  = min(200, max(10, (int)($params['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;
        $search = trim($params['search'] ?? '');
        $orderBy  = preg_replace('/[^a-zA-Z0-9_]/', '', $params['order_by'] ?? 'id');
        $orderDir = strtoupper($params['order_dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

        // 컬럼 목록 확인 (order_by 유효성)
        $colNames = array_column(
            $pdo->query("SHOW COLUMNS FROM `{$table}`")->fetchAll(\PDO::FETCH_ASSOC),
            'Field'
        );
        if (!in_array($orderBy, $colNames, true)) {
            $orderBy = $colNames[0] ?? 'id';
        }

        // 검색 조건 (TEXT 컬럼 대상 LIKE)
        $where = '';
        $bind  = [];
        if ($search !== '') {
            $textCols = array_filter(
                $pdo->query("SHOW COLUMNS FROM `{$table}`")->fetchAll(\PDO::FETCH_ASSOC),
                fn($c) => stripos($c['Type'], 'char') !== false || stripos($c['Type'], 'text') !== false
            );
            $clauses = [];
            foreach ($textCols as $col) {
                $clauses[] = "`{$col['Field']}` LIKE ?";
                $bind[]    = "%{$search}%";
            }
            if ($clauses) {
                $where = ' WHERE ' . implode(' OR ', $clauses);
            }
        }

        $total = (int)$pdo->prepare("SELECT COUNT(*) FROM `{$table}`{$where}")
                          ->execute($bind) ? 0 : 0;
        $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM `{$table}`{$where}");
        $cntStmt->execute($bind);
        $total = (int)$cntStmt->fetchColumn();

        $bind[] = $limit;
        $bind[] = $offset;
        $rowStmt = $pdo->prepare(
            "SELECT * FROM `{$table}`{$where} ORDER BY `{$orderBy}` {$orderDir} LIMIT ? OFFSET ?"
        );
        $rowStmt->execute($bind);
        $rows = $rowStmt->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($res, [
            'ok'       => true,
            'table'    => $table,
            'total'    => $total,
            'page'     => $page,
            'limit'    => $limit,
            'pages'    => (int)ceil($total / $limit),
            'columns'  => $colNames,
            'rows'     => $rows,
        ]);
    }

    /** POST /v423/dbadmin/query — SQL 실행 */
    public static function runQuery(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $body = (array)($req->getParsedBody() ?? []);
        $sql  = trim($body['sql'] ?? '');

        if ($sql === '') return self::err($res, 'SQL is required');
        if (strlen($sql) > 8000) return self::err($res, 'SQL too long (max 8000 chars)');

        // 위험 명령어 차단 (DROP DATABASE, DROP TABLE 제외한 DML/DDL 허용)
        $upper = strtoupper(preg_replace('/\s+/', ' ', $sql));
        $blocked = ['DROP DATABASE', 'DROP SCHEMA', 'SHUTDOWN', 'LOAD DATA', 'INTO OUTFILE', 'INTO DUMPFILE'];
        foreach ($blocked as $b) {
            if (strpos($upper, $b) !== false) {
                return self::err($res, "SQL contains blocked keyword: {$b}", 403);
            }
        }

        $pdo   = Db::pdo();
        $start = microtime(true);

        try {
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $elapsed = round((microtime(true) - $start) * 1000, 2);

            $isSelect = stripos(ltrim($sql), 'SELECT') === 0 || stripos(ltrim($sql), 'SHOW') === 0 || stripos(ltrim($sql), 'DESCRIBE') === 0 || stripos(ltrim($sql), 'EXPLAIN') === 0;

            if ($isSelect) {
                $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
                $cols = $rows ? array_keys($rows[0]) : [];
                return self::json($res, [
                    'ok'       => true,
                    'type'     => 'SELECT',
                    'columns'  => $cols,
                    'rows'     => $rows,
                    'count'    => count($rows),
                    'elapsed_ms' => $elapsed,
                ]);
            }

            $affected = $stmt->rowCount();
            $lastId   = 0;
            try { $lastId = (int)$pdo->lastInsertId(); } catch (\Throwable $_) {}

            return self::json($res, [
                'ok'          => true,
                'type'        => 'WRITE',
                'affected'    => $affected,
                'last_insert_id' => $lastId,
                'elapsed_ms'  => $elapsed,
            ]);
        } catch (\PDOException $e) {
            return self::err($res, 'SQL error: ' . $e->getMessage());
        }
    }

    /** POST /v423/dbadmin/tables/{table}/truncate */
    public static function truncateTable(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $table = preg_replace('/[^a-zA-Z0-9_]/', '', $args['table'] ?? '');
        if (!$table) return self::err($res, 'Invalid table name');

        // 시드 테이블 보호
        $protected = ['api_key', 'billing_plan', 'app_user', 'user_session'];
        if (in_array($table, $protected, true)) {
            return self::err($res, "Table '{$table}' is protected from truncation", 403);
        }

        $pdo = Db::pdo();
        $pdo->exec("TRUNCATE TABLE `{$table}`");
        return self::json($res, ['ok' => true, 'message' => "Table '{$table}' truncated."]);
    }

    /** DELETE /v423/dbadmin/tables/{table}/rows/{id} */
    public static function deleteRow(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $table = preg_replace('/[^a-zA-Z0-9_]/', '', $args['table'] ?? '');
        $id    = (int)($args['id'] ?? 0);
        if (!$table || $id <= 0) return self::err($res, 'Invalid table or id');

        $pdo  = Db::pdo();
        $stmt = $pdo->prepare("DELETE FROM `{$table}` WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        return self::json($res, ['ok' => true, 'deleted' => $stmt->rowCount()]);
    }
}
