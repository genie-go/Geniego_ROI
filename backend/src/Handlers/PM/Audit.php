<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Audit Log Handler — N-152-F §4.1 audit endpoint (admin only).
 *
 * pm_audit_log 는 application 차원 append-only. UPDATE/DELETE 미지원.
 */
final class Audit extends Shared
{
    /** GET /v425/pm/audit?entity_type=&entity_id= */
    public static function list(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $q = $req->getQueryParams();
        [$limit, $offset] = self::clampLimit($req);

        $where = ['tenant_id = ?'];
        $params = [$g['tenant']];
        if (!empty($q['entity_type'])) {
            $where[] = 'entity_type = ?';
            $params[] = (string)$q['entity_type'];
        }
        if (!empty($q['entity_id']) && self::validId((string)$q['entity_id'])) {
            $where[] = 'entity_id = ?';
            $params[] = (string)$q['entity_id'];
        }
        if (!empty($q['actor_user_id'])) {
            $where[] = 'actor_user_id = ?';
            $params[] = (string)$q['actor_user_id'];
        }
        if (!empty($q['action'])) {
            $where[] = 'action = ?';
            $params[] = (string)$q['action'];
        }

        $sql = 'SELECT * FROM pm_audit_log WHERE ' . implode(' AND ', $where)
             . ' ORDER BY id DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
        $stmt = $g['pdo']->prepare($sql);
        $stmt->execute($params);

        return self::json($resp, ['items' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }
}
