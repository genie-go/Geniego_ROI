<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * Admin/User 메뉴 가시성 토글 Handler — N-152-F F2/F3 (T3 트랙) 자체 구현.
 *
 * spec: docs/spec/n152f_consolidated_pm_track.md §4
 * 출처: T3_BACKEND_API_REQUEST.md §4 (의뢰서)
 *
 * 보안 baseline (N-152-A):
 *  - 모든 mutation 에 audit_log 기록 + hash_chain (tamper-evident)
 *  - input enum 화이트리스트 + prepared statement
 *  - required_role 변경 / reset 은 super_admin scope (admin:menu_super)
 *  - rate limit 은 nginx / reverse-proxy 단에서 별도 적용
 *
 * RBAC (현 v421 middleware 호환):
 *  - viewer/connector  : GET /v425/menu-tree (visibility+권한 통과만)
 *  - admin             : GET /v425/admin/menu-tree, PATCH (단 required_role 제외), POST /reorder, GET /audit-log
 *  - admin:menu_super  : 추가 — PATCH required_role 변경, POST /reset
 *
 * 멀티테넌트:
 *  메뉴 트리 = 시스템 글로벌 1 트리 (테넌트별 트리 없음). T3 의뢰서 §2.1 그대로.
 *  운영 DB (geniego_roi) 에만 적용. demo DB 는 동일 트리 공유.
 */
final class AdminMenu
{
    /* ──────────────────────────────────────────────────────────────────
     * 공통 진입 가드
     * ────────────────────────────────────────────────────────────────── */

    private static function gate(Request $req, Response $resp, string $minRole = 'viewer'): array
    {
        // 170차 P0 #1 — admin endpoint (/v425/admin/*) 는 bearer token + plan='admin' 기반.
        // index.php middleware 가 v424/v425/admin 을 bypass 하므로 attribute 미설정 → token gate 사용.
        // viewer 용 /v425/menu-tree 는 기존 v421 middleware attribute 패턴 유지.
        if ($minRole === 'admin') {
            $gate = UserAuth::requirePlan($req, $resp, 'admin');
            if ($gate !== null) {
                return ['error' => $gate];
            }
            $pdo = Db::pdoFor(false);
            self::ensureTables($pdo); // [현 차수] 219#신규: 데모/신규 백엔드 menu_tree 부재 500 해소(자동 생성)
            // [225차 P2-6] is_super 하드코딩 true 제거 — plan='admin' 테넌트의 팀원(member/manager)도
            //   슈퍼 전용 작업(메뉴트리 reset·required_role 변경=전역 메뉴 영향)을 수행할 수 있었다.
            //   테넌트 owner 만 super 로 인정(fail-open: team_role 미설정=레거시 단독회원=owner).
            $au = UserAuth::authedUser($req);
            $teamRole = strtolower((string)($au['team_role'] ?? 'owner'));
            return [
                'tenant'   => 'default',
                'role'     => 'admin',
                'scope'    => 'admin:*',
                'pdo'      => $pdo,
                'user_id'  => (string)($au['id'] ?? 'admin'),
                'is_super' => $teamRole === 'owner',
            ];
        }

        // viewer/connector/analyst — v421 middleware attribute 기반 (legacy path)
        $role  = (string)($req->getAttribute('auth_role') ?? '');
        $scope = (string)($req->getAttribute('auth_scope') ?? '');
        $tenant = (string)($req->getAttribute('auth_tenant') ?? '');

        if ($tenant === '') {
            return ['error' => self::json($resp, ['error' => 'tenant_required'], 401)];
        }

        $rank = ['viewer' => 0, 'connector' => 1, 'analyst' => 2, 'admin' => 3];
        $cur = $rank[$role] ?? -1;
        $need = $rank[$minRole] ?? 99;
        if ($cur < $need) {
            return ['error' => self::json($resp, [
                'error'    => 'insufficient_role',
                'required' => $minRole,
                'current'  => $role,
            ], 403)];
        }

        $pdo = Db::pdoFor(false);
        self::ensureTables($pdo); // [현 차수] 219#신규: menu_tree 부재 시 자동 생성(viewer 경로도 500 방지)
        return [
            'tenant'   => $tenant,
            'role'     => $role,
            'scope'    => $scope,
            'pdo'      => $pdo,
            'user_id'  => $tenant,
            'is_super' => self::isSuper($role, $scope),
        ];
    }

    /**
     * [현 차수] 219#신규: menu_tree/menu_defaults/menu_audit_log 자동 생성(driver-aware).
     *   운영엔 수동 생성돼 있으나 데모/신규 백엔드엔 부재해 admin menu-tree 가 500 이었다(코드에 DDL 부재).
     *   CREATE TABLE IF NOT EXISTS 라 기존 테이블 무영향. 빈 테이블=빈 트리(200, 운영 0행과 동일).
     */
    private static function ensureTables(\PDO $pdo): void
    {
        try {
            $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            if ($driver === 'mysql') {
                $pdo->exec("CREATE TABLE IF NOT EXISTS menu_tree (
                    id VARCHAR(255) NOT NULL, parent_id VARCHAR(255) DEFAULT NULL,
                    label_key VARCHAR(255) NOT NULL, icon VARCHAR(64) DEFAULT NULL,
                    route VARCHAR(255) DEFAULT NULL, menu_key VARCHAR(255) DEFAULT NULL,
                    display_order INT NOT NULL DEFAULT 0,
                    visibility VARCHAR(16) NOT NULL DEFAULT 'visible',
                    required_plan VARCHAR(32) DEFAULT NULL, required_role VARCHAR(32) DEFAULT NULL,
                    is_admin_only TINYINT(1) NOT NULL DEFAULT 0,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), KEY idx_menu_tree_parent (parent_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS menu_defaults (
                    id VARCHAR(255) NOT NULL, snapshot_data JSON NOT NULL, version VARCHAR(32) NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS menu_audit_log (
                    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, menu_id VARCHAR(255) NOT NULL,
                    action VARCHAR(32) NOT NULL, old_value JSON DEFAULT NULL, new_value JSON DEFAULT NULL,
                    changed_by VARCHAR(255) NOT NULL, changed_by_role VARCHAR(32) NOT NULL,
                    reason TEXT, ip_address VARCHAR(45) DEFAULT NULL, user_agent VARCHAR(500) DEFAULT NULL,
                    request_id VARCHAR(64) DEFAULT NULL, hash_chain CHAR(64) DEFAULT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id), KEY idx_audit_menu (menu_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS menu_tree (
                    id TEXT PRIMARY KEY, parent_id TEXT, label_key TEXT NOT NULL, icon TEXT,
                    route TEXT, menu_key TEXT, display_order INTEGER NOT NULL DEFAULT 0,
                    visibility TEXT NOT NULL DEFAULT 'visible', required_plan TEXT, required_role TEXT,
                    is_admin_only INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS menu_defaults (
                    id TEXT PRIMARY KEY, snapshot_data TEXT NOT NULL, version TEXT NOT NULL, created_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS menu_audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, menu_id TEXT NOT NULL, action TEXT NOT NULL,
                    old_value TEXT, new_value TEXT, changed_by TEXT NOT NULL, changed_by_role TEXT NOT NULL,
                    reason TEXT, ip_address TEXT, user_agent TEXT, request_id TEXT, hash_chain TEXT, created_at TEXT)");
            }
        } catch (\Throwable $e) { error_log('[AdminMenu.ensureTables] ' . $e->getMessage()); }
    }

    private static function isSuper(string $role, string $scope): bool
    {
        if ($role !== 'admin') return false;
        return str_contains($scope, 'admin:menu_super') || str_contains($scope, 'admin:*');
    }

    /* ──────────────────────────────────────────────────────────────────
     * 응답 helper
     * ────────────────────────────────────────────────────────────────── */

    private static function json(Response $resp, array $payload, int $status = 200): Response
    {
        $resp->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $resp->withStatus($status)
                    ->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    /* ──────────────────────────────────────────────────────────────────
     * audit_log + hash_chain (N-152-A tamper-evident)
     * ────────────────────────────────────────────────────────────────── */

    private static function appendAudit(
        \PDO $pdo,
        string $menuId,
        string $action,
        ?array $oldValue,
        ?array $newValue,
        string $changedBy,
        string $changedByRole,
        ?string $reason,
        ?string $ip,
        ?string $ua,
        ?string $requestId
    ): int {
        $prevHash = self::lastHash($pdo);
        $payload = json_encode([
            'menu_id' => $menuId,
            'action'  => $action,
            'old'     => $oldValue,
            'new'     => $newValue,
            'by'      => $changedBy,
            'role'    => $changedByRole,
            'reason'  => $reason,
            'ip'      => $ip,
            'ua'      => $ua,
            'rid'     => $requestId,
            'prev'    => $prevHash,
            'ts'      => date('c'),
        ], JSON_UNESCAPED_UNICODE);
        $hash = hash('sha256', (string)$payload);

        $stmt = $pdo->prepare(
            'INSERT INTO menu_audit_log
             (menu_id, action, old_value, new_value, changed_by, changed_by_role,
              reason, ip_address, user_agent, request_id, hash_chain)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $menuId, $action,
            $oldValue ? json_encode($oldValue, JSON_UNESCAPED_UNICODE) : null,
            $newValue ? json_encode($newValue, JSON_UNESCAPED_UNICODE) : null,
            $changedBy, $changedByRole, $reason, $ip, $ua, $requestId, $hash,
        ]);
        return (int)$pdo->lastInsertId();
    }

    private static function lastHash(\PDO $pdo): ?string
    {
        $row = $pdo->query('SELECT hash_chain FROM menu_audit_log ORDER BY id DESC LIMIT 1')
                   ->fetch(\PDO::FETCH_ASSOC);
        return $row ? ($row['hash_chain'] ?? null) : null;
    }

    private static function clientIp(Request $req): ?string
    {
        $server = $req->getServerParams();
        return $server['HTTP_X_FORWARDED_FOR']
            ?? $server['HTTP_X_REAL_IP']
            ?? $server['REMOTE_ADDR']
            ?? null;
    }

    private static function userAgent(Request $req): ?string
    {
        $ua = $req->getServerParams()['HTTP_USER_AGENT'] ?? null;
        return $ua ? substr((string)$ua, 0, 500) : null;
    }

    private static function requestId(Request $req): ?string
    {
        $rid = $req->getHeaderLine('X-Request-Id');
        return $rid !== '' ? substr($rid, 0, 64) : null;
    }

    /* ──────────────────────────────────────────────────────────────────
     * input validation
     * ────────────────────────────────────────────────────────────────── */

    private const VISIBILITY_ENUM = ['visible', 'hidden', 'disabled'];
    private const ROLE_ENUM = ['admin', 'super_admin', 'moderator'];
    private const PLAN_ENUM = ['free', 'demo', 'starter', 'growth', 'pro', 'enterprise', 'admin'];

    private static function validId(string $id): bool
    {
        // 172차 PHASE 2-D — 확장 키 (__section:/__leaf:/__subtab:) 지원
        // : | / 추가 허용. 기존 home||dashboard 호환 + __subtab:/path::id 호환.
        if ($id === '' || strlen($id) > 255) return false;
        return (bool)preg_match('/^[a-zA-Z0-9._:|\/-]+$/', $id);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Endpoint #1 — GET /v425/admin/menu-tree (admin)
     * ────────────────────────────────────────────────────────────────── */

    public static function getAdminTree(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];

        $stmt = $g['pdo']->query(
            'SELECT id, parent_id, label_key, icon, route, menu_key, display_order,
                    visibility, required_plan, required_role, is_admin_only,
                    created_at, updated_at
             FROM menu_tree
             ORDER BY COALESCE(parent_id, ""), display_order, id'
        );
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $lastMod = null;
        foreach ($rows as $r) {
            if ($lastMod === null || ($r['updated_at'] ?? '') > $lastMod) {
                $lastMod = $r['updated_at'];
            }
        }
        // [282차 R2 MED] "공장 기본값 복원(reset)" 항상 404 근본수정 — menu_defaults 에 스냅샷을 기록하는 코드가
        //   어디에도 없어(CREATE+SELECT 만 존재) defaultsAvailable 이 늘 false·reset 이 항상 404 였다.
        //   최초 admin 조회 시점의 현 menu_tree 를 baseline 스냅샷으로 1회 캡처 → 이후 롤백 지점 제공(seed-if-empty).
        self::seedDefaultsIfEmpty($g['pdo'], $rows);

        return self::json($resp, [
            'tree'              => $rows,
            'total_count'       => count($rows),
            'defaults_available'=> self::defaultsAvailable($g['pdo']),
            'last_modified'     => $lastMod,
        ]);
    }

    /** [282차 R2] menu_defaults 가 비어있고 현 트리에 행이 있으면 baseline 스냅샷 1회 캡처(reset 롤백 지점). */
    private static function seedDefaultsIfEmpty(\PDO $pdo, array $rows): void
    {
        try {
            if (empty($rows) || self::defaultsAvailable($pdo)) return;
            $snap = array_map(static function ($r) {
                return [
                    'id'=>$r['id'] ?? null, 'parent_id'=>$r['parent_id'] ?? null, 'label_key'=>$r['label_key'] ?? '',
                    'icon'=>$r['icon'] ?? '', 'route'=>$r['route'] ?? '', 'menu_key'=>$r['menu_key'] ?? '',
                    'display_order'=>(int)($r['display_order'] ?? 0), 'visibility'=>$r['visibility'] ?? 'visible',
                    'required_plan'=>$r['required_plan'] ?? '', 'required_role'=>$r['required_role'] ?? '',
                    'is_admin_only'=>(int)($r['is_admin_only'] ?? 0),
                ];
            }, $rows);
            $pdo->prepare("INSERT INTO menu_defaults(id, snapshot_data, version, created_at) VALUES(?,?,?,?)")
                ->execute(['baseline-' . gmdate('YmdHis'), json_encode($snap, JSON_UNESCAPED_UNICODE), 'baseline', gmdate('c')]);
        } catch (\Throwable $e) { error_log('[AdminMenu.seedDefaultsIfEmpty] ' . $e->getMessage()); }
    }

    private static function defaultsAvailable(\PDO $pdo): bool
    {
        $row = $pdo->query('SELECT COUNT(*) FROM menu_defaults')->fetch(\PDO::FETCH_NUM);
        return ((int)($row[0] ?? 0)) > 0;
    }

    /* ──────────────────────────────────────────────────────────────────
     * Endpoint #2 — GET /v425/menu-tree (viewer+)
     * ────────────────────────────────────────────────────────────────── */

    public static function getTree(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];

        $stmt = $g['pdo']->query(
            'SELECT id, parent_id, label_key, icon, route, menu_key, display_order,
                    required_plan, required_role, is_admin_only
             FROM menu_tree
             WHERE visibility = "visible"
             ORDER BY COALESCE(parent_id, ""), display_order, id'
        );
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $userRole = $g['role'];
        $rank = ['viewer' => 0, 'connector' => 1, 'analyst' => 2, 'admin' => 3];
        $userRank = $rank[$userRole] ?? 0;

        $filtered = array_values(array_filter($rows, function ($r) use ($userRole, $userRank, $rank) {
            if ($r['is_admin_only'] && $userRole !== 'admin') return false;
            if (!empty($r['required_role'])) {
                $need = $rank[$r['required_role']] ?? 99;
                if ($userRank < $need) return false;
            }
            return true;
        }));

        return self::json($resp, ['tree' => $filtered]);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Endpoint #3 — PATCH /v425/admin/menu-tree/{menu_id} (admin)
     * ────────────────────────────────────────────────────────────────── */

    public static function patch(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];

        $menuId = (string)($args['menu_id'] ?? '');
        if (!self::validId($menuId)) {
            return self::json($resp, ['error' => 'invalid_menu_id'], 422);
        }

        $body = (array)$req->getParsedBody();
        $updates = [];
        $params = [];

        if (array_key_exists('visibility', $body)) {
            $v = (string)$body['visibility'];
            if (!in_array($v, self::VISIBILITY_ENUM, true)) {
                return self::json($resp, ['error' => 'invalid_visibility'], 422);
            }
            $updates[] = 'visibility = ?';
            $params[] = $v;
        }
        if (array_key_exists('display_order', $body)) {
            $updates[] = 'display_order = ?';
            $params[] = (int)$body['display_order'];
        }
        if (array_key_exists('required_plan', $body)) {
            $p = $body['required_plan'];
            if ($p !== null && !in_array((string)$p, self::PLAN_ENUM, true)) {
                return self::json($resp, ['error' => 'invalid_plan'], 422);
            }
            $updates[] = 'required_plan = ?';
            $params[] = $p;
        }
        if (array_key_exists('required_role', $body)) {
            if (!$g['is_super']) {
                return self::json($resp, [
                    'error'    => 'insufficient_role',
                    'required' => 'super_admin',
                    'note'     => 'required_role 변경은 admin:menu_super scope 필요',
                ], 403);
            }
            $r = $body['required_role'];
            if ($r !== null && !in_array((string)$r, self::ROLE_ENUM, true)) {
                return self::json($resp, ['error' => 'invalid_role'], 422);
            }
            $updates[] = 'required_role = ?';
            $params[] = $r;
        }

        if (!$updates) {
            return self::json($resp, ['error' => 'no_changes'], 422);
        }

        $reason = isset($body['reason']) ? substr((string)$body['reason'], 0, 1000) : null;

        $pdo = $g['pdo'];

        // 기존 값 조회 (audit)
        $stmt = $pdo->prepare('SELECT * FROM menu_tree WHERE id = ?');
        $stmt->execute([$menuId]);
        $oldRow = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$oldRow) {
            return self::json($resp, ['error' => 'menu_not_found'], 404);
        }

        $sql = 'UPDATE menu_tree SET ' . implode(', ', $updates) . ' WHERE id = ?';
        $params[] = $menuId;
        $pdo->prepare($sql)->execute($params);

        // 갱신된 값 조회
        $stmt = $pdo->prepare('SELECT * FROM menu_tree WHERE id = ?');
        $stmt->execute([$menuId]);
        $newRow = $stmt->fetch(\PDO::FETCH_ASSOC);

        $action = isset($body['required_role'])
            ? 'role_change'
            : (isset($body['required_plan'])
                ? 'plan_change'
                : (isset($body['display_order'])
                    ? 'order_change'
                    : 'visibility_change'));

        $auditId = self::appendAudit(
            $pdo, $menuId, $action,
            $oldRow, $newRow,
            $g['user_id'], $g['role'], $reason,
            self::clientIp($req), self::userAgent($req), self::requestId($req)
        );

        return self::json($resp, [
            'node'          => $newRow,
            'audit_log_id'  => $auditId,
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Endpoint #4 — POST /v425/admin/menu-tree/reorder (admin)
     * ────────────────────────────────────────────────────────────────── */

    public static function reorder(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];

        $body = (array)$req->getParsedBody();
        $changes = $body['changes'] ?? null;
        if (!is_array($changes) || !$changes) {
            return self::json($resp, ['error' => 'changes_required'], 422);
        }
        if (count($changes) > 500) {
            return self::json($resp, ['error' => 'too_many_changes', 'max' => 500], 422);
        }
        $reason = isset($body['reason']) ? substr((string)$body['reason'], 0, 1000) : null;

        $pdo = $g['pdo'];
        $pdo->beginTransaction();
        $updated = [];
        $auditIds = [];

        try {
            foreach ($changes as $ch) {
                $id = (string)($ch['menu_id'] ?? '');
                if (!self::validId($id)) {
                    throw new \RuntimeException("invalid_menu_id: $id");
                }
                $newOrder = (int)($ch['new_order'] ?? 0);

                $hasParent = array_key_exists('new_parent_id', $ch);
                $newParent = $hasParent ? $ch['new_parent_id'] : null;
                if ($newParent !== null && !self::validId((string)$newParent)) {
                    throw new \RuntimeException("invalid_parent_id: $newParent");
                }

                if ($hasParent && self::wouldCycle($pdo, $id, (string)$newParent)) {
                    throw new \RuntimeException("cycle_detected: $id -> $newParent");
                }

                $stmt = $pdo->prepare('SELECT * FROM menu_tree WHERE id = ?');
                $stmt->execute([$id]);
                $oldRow = $stmt->fetch(\PDO::FETCH_ASSOC);
                if (!$oldRow) throw new \RuntimeException("menu_not_found: $id");

                if ($hasParent) {
                    $pdo->prepare('UPDATE menu_tree SET display_order = ?, parent_id = ? WHERE id = ?')
                        ->execute([$newOrder, $newParent, $id]);
                } else {
                    $pdo->prepare('UPDATE menu_tree SET display_order = ? WHERE id = ?')
                        ->execute([$newOrder, $id]);
                }

                $stmt = $pdo->prepare('SELECT * FROM menu_tree WHERE id = ?');
                $stmt->execute([$id]);
                $newRow = $stmt->fetch(\PDO::FETCH_ASSOC);
                $updated[] = $newRow;

                $auditIds[] = self::appendAudit(
                    $pdo, $id, 'order_change',
                    $oldRow, $newRow,
                    $g['user_id'], $g['role'], $reason,
                    self::clientIp($req), self::userAgent($req), self::requestId($req)
                );
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::json($resp, [
                'error'   => 'reorder_failed',
                'message' => $e->getMessage(),
            ], 422);
        }

        return self::json($resp, [
            'updated'       => $updated,
            'audit_log_ids' => $auditIds,
        ]);
    }

    /**
     * cycle 검출 — id 를 newParent 의 하위로 옮기면 id 의 조상 체인에 newParent 가 등장하는지 확인.
     */
    private static function wouldCycle(\PDO $pdo, string $id, string $newParent): bool
    {
        if ($id === $newParent) return true;
        $cur = $newParent;
        $depth = 0;
        while ($cur !== null && $depth < 100) {
            if ($cur === $id) return true;
            $stmt = $pdo->prepare('SELECT parent_id FROM menu_tree WHERE id = ?');
            $stmt->execute([$cur]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return false;
            $cur = $row['parent_id'];
            $depth++;
        }
        return false;
    }

    /* ──────────────────────────────────────────────────────────────────
     * Endpoint #5 — POST /v425/admin/menu-tree/reset (super_admin)
     * ────────────────────────────────────────────────────────────────── */

    public static function reset(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        if (!$g['is_super']) {
            return self::json($resp, [
                'error'    => 'insufficient_role',
                'required' => 'super_admin',
                'note'     => 'reset 은 admin:menu_super scope 필요',
            ], 403);
        }

        $body = (array)$req->getParsedBody();
        if (($body['confirm'] ?? null) !== 'RESET_MENU_TREE') {
            return self::json($resp, ['error' => 'confirm_mismatch'], 422);
        }
        $reason = (string)($body['reason'] ?? '');
        if ($reason === '') {
            return self::json($resp, ['error' => 'reason_required'], 422);
        }

        $pdo = $g['pdo'];
        $stmt = $pdo->query('SELECT snapshot_data, version FROM menu_defaults ORDER BY created_at DESC LIMIT 1');
        $snapshot = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$snapshot) {
            return self::json($resp, ['error' => 'no_defaults_available'], 404);
        }

        $rows = json_decode((string)$snapshot['snapshot_data'], true);
        if (!is_array($rows)) {
            return self::json($resp, ['error' => 'invalid_snapshot'], 500);
        }

        $pdo->beginTransaction();
        $restored = 0;
        try {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
            $pdo->exec('TRUNCATE TABLE menu_tree');
            $ins = $pdo->prepare(
                'INSERT INTO menu_tree
                 (id, parent_id, label_key, icon, route, menu_key, display_order,
                  visibility, required_plan, required_role, is_admin_only)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)'
            );
            foreach ($rows as $r) {
                $ins->execute([
                    $r['id'] ?? null,
                    $r['parent_id'] ?? null,
                    $r['label_key'] ?? '',
                    $r['icon'] ?? null,
                    $r['route'] ?? null,
                    $r['menu_key'] ?? null,
                    (int)($r['display_order'] ?? 0),
                    $r['visibility'] ?? 'visible',
                    $r['required_plan'] ?? null,
                    $r['required_role'] ?? null,
                    (int)($r['is_admin_only'] ?? 0),
                ]);
                $restored++;
            }
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            $auditId = self::appendAudit(
                $pdo, '*', 'reset',
                null, ['restored_count' => $restored, 'snapshot_version' => $snapshot['version']],
                $g['user_id'], $g['role'], $reason,
                self::clientIp($req), self::userAgent($req), self::requestId($req)
            );
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::json($resp, [
                'error'   => 'reset_failed',
                'message' => $e->getMessage(),
            ], 500);
        }

        return self::json($resp, [
            'restored_count'   => $restored,
            'audit_log_id'     => $auditId,
            'snapshot_version' => $snapshot['version'],
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Endpoint #6 — GET /v425/admin/menu-tree/audit-log (admin)
     * ────────────────────────────────────────────────────────────────── */

    public static function auditLog(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];

        $q = $req->getQueryParams();
        $where = [];
        $params = [];

        if (!empty($q['from'])) {
            $where[] = 'created_at >= ?';
            $params[] = (string)$q['from'];
        }
        if (!empty($q['to'])) {
            $where[] = 'created_at <= ?';
            $params[] = (string)$q['to'];
        }
        if (!empty($q['menu_id']) && self::validId((string)$q['menu_id'])) {
            $where[] = 'menu_id = ?';
            $params[] = (string)$q['menu_id'];
        }
        if (!empty($q['action'])) {
            $where[] = 'action = ?';
            $params[] = (string)$q['action'];
        }
        if (!empty($q['changed_by'])) {
            $where[] = 'changed_by = ?';
            $params[] = (string)$q['changed_by'];
        }

        $page     = max(1, (int)($q['page'] ?? 1));
        $pageSize = max(1, min(200, (int)($q['page_size'] ?? 50)));
        $offset   = ($page - 1) * $pageSize;

        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $cntStmt = $g['pdo']->prepare("SELECT COUNT(*) FROM menu_audit_log $whereSql");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        $sql = "SELECT id, menu_id, action, old_value, new_value, changed_by, changed_by_role,
                       reason, ip_address, user_agent, request_id, hash_chain, created_at
                FROM menu_audit_log
                $whereSql
                ORDER BY id DESC
                LIMIT $pageSize OFFSET $offset";
        $stmt = $g['pdo']->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($resp, [
            'logs'      => $logs,
            'total'     => $total,
            'page'      => $page,
            'page_size' => $pageSize,
            'has_more'  => ($offset + count($logs)) < $total,
        ]);
    }
}
