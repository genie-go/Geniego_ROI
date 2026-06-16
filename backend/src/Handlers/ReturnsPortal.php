<?php
namespace Genie\Handlers;
use Psr\Http\Message\{ResponseInterface as Response, ServerRequestInterface as Request};

/**
 * ReturnsPortal — 반품 자동화 포탈 Backend API
 * - SQLite: returns, returns_settings, returns_automation
 *
 * ★ 201차 P0-2 보안수정:
 *   - (격리) 전 테넌트가 단일 returns.sqlite3 를 공유하며 tenant_id 필터가 전무 →
 *     인증된 아무 키가 타 계정 반품 데이터를 R/W/D 하던 교차테넌트 유출 차단.
 *     모든 테이블에 tenant_id 추가 + 전 query WHERE tenant_id=? 강제(멱등 마이그레이션 포함).
 *   - (인젝션) toggleAutomation 의 "...WHERE id=$id"(요청 body 보간) → prepared statement.
 */
class ReturnsPortal
{
    private static ?\PDO $db = null;

    private static function db(): \PDO
    {
        if (self::$db) return self::$db;
        $dir = __DIR__ . '/../../data';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $pdo = new \PDO('sqlite:' . $dir . '/returns.sqlite3');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        $pdo->exec("CREATE TABLE IF NOT EXISTS returns (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id   TEXT NOT NULL DEFAULT '',
            return_id   TEXT UNIQUE NOT NULL,
            order_id    TEXT NOT NULL DEFAULT '',
            sku         TEXT NOT NULL DEFAULT '',
            name        TEXT NOT NULL DEFAULT '',
            channel     TEXT NOT NULL DEFAULT '',
            qty         INTEGER NOT NULL DEFAULT 1,
            reason      TEXT NOT NULL DEFAULT '',
            status      TEXT NOT NULL DEFAULT 'pending',
            req_date    TEXT NOT NULL DEFAULT '',
            track_no    TEXT NOT NULL DEFAULT '',
            refund_amt  REAL NOT NULL DEFAULT 0,
            defective   INTEGER NOT NULL DEFAULT 0,
            wms_linked  INTEGER NOT NULL DEFAULT 0,
            note        TEXT NOT NULL DEFAULT '',
            created_at  TEXT NOT NULL
        )");
        self::ensureCol($pdo, 'returns', 'tenant_id', "TEXT NOT NULL DEFAULT ''");

        // returns_settings — 테넌트별 (tenant_id,key) 유니크. 구 UNIQUE(key) 스키마면 재생성 마이그레이션.
        $pdo->exec("CREATE TABLE IF NOT EXISTS returns_settings (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL DEFAULT '',
            key       TEXT NOT NULL,
            value     TEXT NOT NULL DEFAULT '',
            UNIQUE(tenant_id, key)
        )");
        if (!self::hasCol($pdo, 'returns_settings', 'tenant_id')) {
            $pdo->exec("ALTER TABLE returns_settings RENAME TO returns_settings_old");
            $pdo->exec("CREATE TABLE returns_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT '',
                key TEXT NOT NULL, value TEXT NOT NULL DEFAULT '', UNIQUE(tenant_id, key))");
            $pdo->exec("INSERT INTO returns_settings (tenant_id,key,value) SELECT '', key, value FROM returns_settings_old");
            $pdo->exec("DROP TABLE returns_settings_old");
        }

        $pdo->exec("CREATE TABLE IF NOT EXISTS returns_automation (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL DEFAULT '',
            label     TEXT NOT NULL,
            enabled   INTEGER NOT NULL DEFAULT 0
        )");
        self::ensureCol($pdo, 'returns_automation', 'tenant_id', "TEXT NOT NULL DEFAULT ''");

        // No seed data — real user data only

        self::$db = $pdo;
        return $pdo;
    }

    private static function hasCol(\PDO $pdo, string $table, string $col): bool
    {
        foreach ($pdo->query("PRAGMA table_info(" . $table . ")")->fetchAll(\PDO::FETCH_ASSOC) as $c) {
            if (($c['name'] ?? '') === $col) return true;
        }
        return false;
    }

    private static function ensureCol(\PDO $pdo, string $table, string $col, string $decl): void
    {
        if (!self::hasCol($pdo, $table, $col)) {
            try { $pdo->exec("ALTER TABLE " . $table . " ADD COLUMN " . $col . " " . $decl); } catch (\Throwable $e) {}
        }
    }

    /**
     * [현 차수] 보편 채널 동기화(단방향 자동진입): 채널 동기화가 감지한 반품(channel_orders event_type='return')을
     * 반품관리 포탈(returns 테이블)에 멱등 자동 진입시킨다. 그동안 채널 반품과 반품 포탈이 분리돼 불일치였던
     * 갭 해소. return_id='CR-{channel}-{order_id}' 로 멱등(재폴링/중복 호출 시 1건만). tenant 격리.
     * @return bool 신규 생성 시 true, 이미 존재/거부 시 false (best-effort, 예외 비전파).
     */
    public static function ingestChannelReturn(string $tenant, array $r): bool
    {
        $tenant = trim($tenant);
        if ($tenant === '' || strtolower($tenant) === 'demo' || strtolower($tenant) === 'unknown') return false;
        try {
            $pdo = self::db();
            $orderId  = (string)($r['order_id'] ?? '');
            $channel  = (string)($r['channel'] ?? '');
            if ($orderId === '') return false;
            $returnId = 'CR-' . $channel . '-' . $orderId;
            $chk = $pdo->prepare("SELECT 1 FROM returns WHERE tenant_id=? AND return_id=? LIMIT 1");
            $chk->execute([$tenant, $returnId]);
            if ($chk->fetchColumn()) return false; // 멱등: 이미 진입됨
            $now = gmdate('c');
            $pdo->prepare(
                "INSERT INTO returns (tenant_id,return_id,order_id,sku,name,channel,qty,reason,status,req_date,refund_amt,note,created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
            )->execute([
                $tenant, $returnId, $orderId,
                (string)($r['sku'] ?? ''), (string)($r['name'] ?? ''), $channel,
                (int)($r['qty'] ?? 1), (string)($r['reason'] ?? '채널 반품'),
                'pending', $now, (float)($r['refund_amt'] ?? 0), 'channel_sync', $now,
            ]);
            return true;
        } catch (\Throwable $e) {
            error_log('[ReturnsPortal.ingestChannelReturn] ' . $e->getMessage());
            return false;
        }
    }

    /** 인증 미들웨어 주입 tenant. 미해결 시 '' → 호출부가 빈 결과/거부. */
    private static function tenant(Request $request): string
    {
        // [227차 감사] raw X-Tenant-Id 폴백 제거(auth_tenant만 신뢰) — 향후 bypass 추가 시 헤더 위조 차단(227 #4 패턴 정합).
        $t = $request->getAttribute('auth_tenant');
        $t = trim((string)$t);
        return ($t === '' || strtolower($t) === 'unknown') ? '' : $t;
    }

    private static function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function body(Request $request): array
    {
        $parsed = $request->getParsedBody();
        if (is_array($parsed) && count($parsed)) return $parsed;
        $raw = (string)$request->getBody();
        if ($raw === '') return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /** GET /v420/returns/list */
    public static function list(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => true, 'returns' => []]);
        $db = self::db();
        $stmt = $db->prepare("SELECT * FROM returns WHERE tenant_id=? ORDER BY id DESC");
        $stmt->execute([$t]);
        return self::json($response, ['ok' => true, 'returns' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /v420/returns — create */
    public static function create(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => false, 'error' => 'tenant required'], 403);
        $db = self::db();
        $b = self::body($request);
        $cnt = $db->prepare("SELECT COUNT(*)+1 FROM returns WHERE tenant_id=?");
        $cnt->execute([$t]);
        $rid = 'RT-' . date('Y') . '-' . str_pad((int)$cnt->fetchColumn(), 4, '0', STR_PAD_LEFT);
        $now = gmdate('c');
        $ins = $db->prepare("INSERT INTO returns (tenant_id, return_id, order_id, sku, name, channel, qty, reason, status, req_date, track_no, refund_amt, defective, wms_linked, note, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $ins->execute([
            $t, $rid,
            $b['order_id'] ?? '', $b['sku'] ?? '', $b['name'] ?? '', $b['channel'] ?? '',
            (int)($b['qty'] ?? 1), $b['reason'] ?? '', 'pending',
            $b['req_date'] ?? date('Y-m-d'), $b['track_no'] ?? '',
            (float)($b['refund_amt'] ?? 0), (int)($b['defective'] ?? 0), 0,
            $b['note'] ?? '', $now
        ]);
        return self::json($response, ['ok' => true, 'return_id' => $rid]);
    }

    /** POST /v420/returns/{id}/status */
    public static function updateStatus(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => false, 'error' => 'tenant required'], 403);
        $db = self::db();
        $b = self::body($request);
        $id = (int)$args['id'];
        $status = $b['status'] ?? 'pending';
        $allowed = ['pending','inspecting','approved','rejected','refunded','restocked'];
        if (!in_array($status, $allowed, true)) return self::json($response, ['ok' => false, 'error' => 'Invalid status'], 400);
        // [227차 감사 P0] restocked 진입 시 물리재고 복원 — 기존엔 status 만 바뀌고 WMS 무영향(반품 승인이 재고 미복원).
        //   전이 전 현재 상태/품목 조회 → reflectChannelRestock(원판매 Outbound 있을 때만·차감분 초과/이중복원 방지,
        //   채널 자동경로와 동일 restockRef=CHR-{channel}-{order_id} 로 전역 dedup). order_id 불일치 시 대칭가드로 안전 no-op.
        $cur = null;
        try { $q = $db->prepare("SELECT status, sku, name, qty, order_id, channel, COALESCE(wms_linked,0) AS wl FROM returns WHERE id=? AND tenant_id=?"); $q->execute([$id, $t]); $cur = $q->fetch(\PDO::FETCH_ASSOC) ?: null; } catch (\Throwable $e) {}
        $db->prepare("UPDATE returns SET status=? WHERE id=? AND tenant_id=?")->execute([$status, $id, $t]);
        $restored = false;
        if ($status === 'restocked' && $cur && (int)($cur['wl'] ?? 0) !== 1 && (string)($cur['sku'] ?? '') !== '') {
            try {
                $ref = (string)($cur['channel'] ?? '') . '-' . (string)($cur['order_id'] ?? '');
                $restored = \Genie\Handlers\Wms::reflectChannelRestock($t, (string)$cur['sku'], (string)($cur['name'] ?? ''), (float)($cur['qty'] ?? 0), 'CHS-' . $ref, 'CHR-' . $ref);
                $db->prepare("UPDATE returns SET wms_linked=1 WHERE id=? AND tenant_id=?")->execute([$id, $t]);
            } catch (\Throwable $e) {}
        }
        return self::json($response, ['ok' => true, 'restored' => $restored]);
    }

    /** POST /v420/returns/{id}/wms-link */
    public static function wmsLink(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => false, 'error' => 'tenant required'], 403);
        $db = self::db();
        $id = (int)$args['id'];
        $db->prepare("UPDATE returns SET wms_linked=1 WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($response, ['ok' => true]);
    }

    /** DELETE /v420/returns/{id} */
    public static function delete(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => false, 'error' => 'tenant required'], 403);
        $db = self::db();
        $id = (int)$args['id'];
        $db->prepare("DELETE FROM returns WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($response, ['ok' => true]);
    }

    /** GET /v420/returns/summary */
    public static function summary(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => true, 'total' => 0, 'pending' => 0, 'defective' => 0, 'totalRefund' => 0, 'wmsLinked' => 0, 'refundRate' => 0]);
        $db = self::db();
        $one = function (string $sql) use ($db, $t) { $s = $db->prepare($sql); $s->execute([$t]); return $s->fetchColumn(); };
        $total = (int)$one("SELECT COUNT(*) FROM returns WHERE tenant_id=?");
        $pending = (int)$one("SELECT COUNT(*) FROM returns WHERE tenant_id=? AND status='pending'");
        $defective = (int)$one("SELECT COUNT(*) FROM returns WHERE tenant_id=? AND defective=1");
        $totalRefund = (float)$one("SELECT COALESCE(SUM(refund_amt),0) FROM returns WHERE tenant_id=?");
        $wmsLinked = (int)$one("SELECT COUNT(*) FROM returns WHERE tenant_id=? AND wms_linked=1");
        $processed = (int)$one("SELECT COUNT(*) FROM returns WHERE tenant_id=? AND status IN ('refunded','restocked')");
        $refundRate = $total > 0 ? round($processed / $total * 100) : 0;

        return self::json($response, [
            'ok' => true,
            'total' => $total, 'pending' => $pending, 'defective' => $defective,
            'totalRefund' => $totalRefund, 'wmsLinked' => $wmsLinked, 'refundRate' => $refundRate
        ]);
    }

    /** GET /v420/returns/settings */
    public static function getSettings(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => true, 'settings' => new \stdClass(), 'automation' => []]);
        $db = self::db();
        $s = $db->prepare("SELECT key, value FROM returns_settings WHERE tenant_id=?");
        $s->execute([$t]);
        $rows = $s->fetchAll(\PDO::FETCH_KEY_PAIR);
        $a = $db->prepare("SELECT * FROM returns_automation WHERE tenant_id=? ORDER BY id");
        $a->execute([$t]);
        return self::json($response, ['ok' => true, 'settings' => $rows ?: new \stdClass(), 'automation' => $a->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /v420/returns/settings */
    public static function saveSettings(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => false, 'error' => 'tenant required'], 403);
        $db = self::db();
        $b = self::body($request);
        $ins = $db->prepare("INSERT OR REPLACE INTO returns_settings (tenant_id, key, value) VALUES (?,?,?)");
        foreach ($b as $k => $v) { $ins->execute([$t, (string)$k, (string)$v]); }
        return self::json($response, ['ok' => true]);
    }

    /** POST /v420/returns/automation/toggle */
    public static function toggleAutomation(Request $request, Response $response, array $args): Response
    {
        $t = self::tenant($request);
        if ($t === '') return self::json($response, ['ok' => false, 'error' => 'tenant required'], 403);
        $db = self::db();
        $b = self::body($request);
        $id = (int)($b['id'] ?? 0);
        // ★ 인젝션 수정: 정수 캐스트 + prepared statement + tenant 스코프
        $db->prepare("UPDATE returns_automation SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE id=? AND tenant_id=?")
           ->execute([$id, $t]);
        return self::json($response, ['ok' => true]);
    }
}
