<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * CouponAdmin — 172차 P0-C 초고도화.
 *
 * 관리자 쿠폰 발행 + 룰 관리 + 사용 현황. 사용자 명시: "admin 자율로 플랜·기간 자유 발행".
 *
 * Endpoints (모두 admin RBAC):
 *  - GET  /v424/admin/coupons/overview        — 통합 (rules + stats + recent)
 *  - PUT  /v424/admin/coupons/rules/{name}    — 룰 update (is_active/plan/duration/note)
 *  - POST /v424/admin/coupons/issue           — 수동 발급 (admin이 plan + duration_days 자유 설정)
 *  - GET  /v424/admin/coupons/list            — 발급 목록 (pagination, filter)
 *  - POST /v424/admin/coupons/{code}/revoke   — 쿠폰 revoke
 */
final class CouponAdmin
{
    /**
     * GET /v424/admin/coupons/overview
     * 한 번 호출로 admin UI 가 필요한 데이터 다 받음.
     */
    public static function overview(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $pdo = Db::pdo();

        // 1) rules
        $rules = $pdo->query(
            'SELECT id, trigger_name, is_active, plan, duration_days, max_uses, note, updated_at
             FROM coupon_rules ORDER BY id'
        )->fetchAll(\PDO::FETCH_ASSOC);

        // 2) stats
        $stats = [
            'total_coupons'   => 0,
            'active_coupons'  => 0,
            'redeemed'        => 0,
            'revoked'         => 0,
            'by_trigger'      => [],
            'by_plan'         => [],
        ];
        try {
            $total = $pdo->query('SELECT COUNT(*) FROM free_coupons')->fetchColumn();
            $stats['total_coupons'] = (int)$total;
            $stats['active_coupons'] = (int)$pdo->query(
                "SELECT COUNT(*) FROM free_coupons WHERE is_revoked = 0 AND (redeemed_at IS NULL OR redeemed_at = 0)"
            )->fetchColumn();
            $stats['redeemed'] = (int)$pdo->query(
                "SELECT COUNT(*) FROM free_coupons WHERE redeemed_at IS NOT NULL AND redeemed_at != 0"
            )->fetchColumn();
            $stats['revoked'] = (int)$pdo->query(
                "SELECT COUNT(*) FROM free_coupons WHERE is_revoked = 1"
            )->fetchColumn();

            // group by note pattern → trigger
            $byTrig = $pdo->query(
                "SELECT
                    CASE
                      WHEN note LIKE '[auto:signup]%' THEN 'signup'
                      WHEN note LIKE '[auto:upgrade]%' THEN 'upgrade'
                      WHEN note LIKE '[auto:renewal]%' THEN 'renewal'
                      ELSE 'manual'
                    END AS trigger_kind,
                    COUNT(*) AS cnt
                 FROM free_coupons GROUP BY trigger_kind"
            )->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($byTrig as $r) $stats['by_trigger'][$r['trigger_kind']] = (int)$r['cnt'];

            $byPlan = $pdo->query(
                'SELECT plan, COUNT(*) AS cnt FROM free_coupons GROUP BY plan'
            )->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($byPlan as $r) $stats['by_plan'][$r['plan']] = (int)$r['cnt'];
        } catch (\Throwable $e) { /* graceful */ }

        // 3) recent 20 coupons
        $recent = [];
        try {
            $recent = $pdo->query(
                'SELECT id, code, plan, duration_days, max_uses, use_count,
                        issued_to_user_id, issued_to_email, note, is_revoked,
                        redeemed_at, redeemed_by_user_id, created_at
                 FROM free_coupons ORDER BY id DESC LIMIT 20'
            )->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { /* graceful */ }

        return self::json($res, [
            'ok'     => true,
            'rules'  => $rules,
            'stats'  => $stats,
            'recent' => $recent,
        ]);
    }

    /**
     * PUT /v424/admin/coupons/rules/{name}
     * Body: { is_active?, plan?, duration_days?, max_uses?, note? }
     */
    public static function updateRule(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $name = (string)($args['name'] ?? '');
        if (!in_array($name, ['signup', 'upgrade', 'renewal'], true)) {
            return self::json($res, ['error' => 'invalid_trigger'], 422);
        }
        $body = (array)$req->getParsedBody();
        $pdo = Db::pdo();

        // 이미 룰이 없으면 생성, 있으면 update
        $fields = [];
        $params = [];
        if (isset($body['is_active']))     { $fields[] = 'is_active = ?';     $params[] = (int)!empty($body['is_active']); }
        if (isset($body['plan']))          { $fields[] = 'plan = ?';          $params[] = (string)$body['plan']; }
        if (isset($body['duration_days'])) { $fields[] = 'duration_days = ?'; $params[] = (int)$body['duration_days']; }
        if (isset($body['max_uses']))      { $fields[] = 'max_uses = ?';      $params[] = (int)$body['max_uses']; }
        if (isset($body['note']))          { $fields[] = 'note = ?';          $params[] = (string)$body['note']; }
        if (!$fields) return self::json($res, ['error' => 'no_fields'], 422);

        $params[] = $name;
        $pdo->prepare(
            'UPDATE coupon_rules SET ' . implode(', ', $fields) . ' WHERE trigger_name = ?'
        )->execute($params);

        // 없으면 INSERT
        $exists = $pdo->prepare('SELECT id FROM coupon_rules WHERE trigger_name = ?');
        $exists->execute([$name]);
        if (!$exists->fetchColumn()) {
            $pdo->prepare(
                'INSERT INTO coupon_rules (trigger_name, is_active, plan, duration_days, max_uses, note)
                 VALUES (?, ?, ?, ?, ?, ?)'
            )->execute([
                $name,
                (int)!empty($body['is_active']),
                (string)($body['plan'] ?? 'starter'),
                (int)($body['duration_days'] ?? 7),
                (int)($body['max_uses'] ?? 1),
                (string)($body['note'] ?? ''),
            ]);
        }
        return self::json($res, ['ok' => true, 'name' => $name]);
    }

    /**
     * POST /v424/admin/coupons/issue
     * 수동 발급 — admin이 plan + duration_days 자유 설정.
     * Body: { plan, duration_days, max_uses?, issued_to_email?, note?, quantity? }
     * quantity > 1 이면 다수 발급 (배치 코드 생성).
     */
    public static function issue(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $body = (array)$req->getParsedBody();
        $plan = (string)($body['plan'] ?? 'starter');
        $duration = max(1, min(365, (int)($body['duration_days'] ?? 7)));
        $maxUses = max(1, min(10000, (int)($body['max_uses'] ?? 1)));
        $email = trim((string)($body['issued_to_email'] ?? ''));
        $note = (string)($body['note'] ?? '[manual] 관리자 수동 발급');
        $quantity = max(1, min(100, (int)($body['quantity'] ?? 1)));
        $actor = substr((string)($req->getAttribute('auth_key') ?? 'admin'), 0, 64);

        // plan validation
        if (!preg_match('/^[a-z0-9_-]{1,30}$/i', $plan)) {
            return self::json($res, ['error' => 'invalid_plan'], 422);
        }

        $pdo = Db::pdo();
        $issued = [];
        try {
            $ins = $pdo->prepare(
                'INSERT INTO free_coupons
                   (code, plan, duration_days, max_uses, use_count,
                    issued_to_user_id, issued_to_email, note, issued_by,
                    is_revoked, created_at)
                 VALUES (?, ?, ?, ?, 0, NULL, ?, ?, NULL, 0, NOW())'
            );
            for ($i = 0; $i < $quantity; $i++) {
                $code = 'GENIE-' . strtoupper(bin2hex(random_bytes(5)));
                $ins->execute([$code, $plan, $duration, $maxUses, $email ?: null, $note]);
                $issued[] = [
                    'id'   => (int)$pdo->lastInsertId(),
                    'code' => $code,
                ];
            }
        } catch (\Throwable $e) {
            return self::json($res, ['error' => 'issue_failed', 'detail' => $e->getMessage()], 500);
        }
        return self::json($res, [
            'ok'        => true,
            'quantity'  => count($issued),
            'plan'      => $plan,
            'duration'  => $duration,
            'max_uses'  => $maxUses,
            'coupons'   => $issued,
        ]);
    }

    /**
     * GET /v424/admin/coupons/list?status=all|active|redeemed|revoked&q=...&limit=50
     */
    public static function listCoupons(Request $req, Response $res): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $qs = $req->getQueryParams();
        $status = (string)($qs['status'] ?? 'all');
        $q = trim((string)($qs['q'] ?? ''));
        $limit = max(1, min(500, (int)($qs['limit'] ?? 100)));

        $where = []; $params = [];
        if ($status === 'active')   $where[] = 'is_revoked = 0 AND (redeemed_at IS NULL OR redeemed_at = 0)';
        if ($status === 'redeemed') $where[] = 'redeemed_at IS NOT NULL AND redeemed_at != 0';
        if ($status === 'revoked')  $where[] = 'is_revoked = 1';
        if ($q !== '') {
            $where[] = '(code LIKE ? OR issued_to_email LIKE ? OR note LIKE ?)';
            $params[] = "%$q%"; $params[] = "%$q%"; $params[] = "%$q%";
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $params[] = $limit;
        $stmt = Db::pdo()->prepare(
            "SELECT id, code, plan, duration_days, max_uses, use_count,
                    issued_to_user_id, issued_to_email, note, is_revoked,
                    redeemed_at, redeemed_by_user_id, created_at
             FROM free_coupons $whereSql
             ORDER BY id DESC LIMIT ?"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($res, ['ok' => true, 'coupons' => $rows, 'count' => count($rows)]);
    }

    /** POST /v424/admin/coupons/{code}/revoke */
    public static function revoke(Request $req, Response $res, array $args): Response
    {
        $gate = UserAuth::requirePlan($req, $res, 'admin');
        if ($gate !== null) return $gate;
        $code = (string)($args['code'] ?? '');
        if ($code === '') return self::json($res, ['error' => 'invalid_code'], 422);
        Db::pdo()->prepare(
            'UPDATE free_coupons SET is_revoked = 1 WHERE code = ?'
        )->execute([$code]);
        return self::json($res, ['ok' => true, 'code' => $code]);
    }

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
