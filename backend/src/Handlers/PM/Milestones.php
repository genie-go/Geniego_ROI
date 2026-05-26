<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Milestones Handler — N-152-F §4 (skeleton).
 */
final class Milestones extends Shared
{
    /** GET /v425/pm/milestones?project_id= */
    public static function list(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $q = $req->getQueryParams();
        $where = ['tenant_id = ?'];
        $params = [$g['tenant']];
        if (!empty($q['project_id']) && self::validId((string)$q['project_id'])) {
            $where[] = 'project_id = ?';
            $params[] = (string)$q['project_id'];
        }
        $stmt = $g['pdo']->prepare(
            'SELECT * FROM pm_milestones WHERE ' . implode(' AND ', $where)
            . ' ORDER BY target_date, position_idx, id'
        );
        $stmt->execute($params);
        return self::json($resp, ['items' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /v425/pm/milestones */
    public static function create(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $body = (array)$req->getParsedBody();
        $projectId = (string)($body['project_id'] ?? '');
        $title = trim((string)($body['title'] ?? ''));
        $targetDate = (string)($body['target_date'] ?? '');
        if (!self::validId($projectId) || $title === '' || $targetDate === '') {
            return self::json($resp, ['error' => 'invalid_input'], 422);
        }
        $id = self::genId('ms');
        $g['pdo']->prepare(
            'INSERT INTO pm_milestones
             (id, tenant_id, project_id, title, description, target_date, status, completion_criteria)
             VALUES (?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $g['tenant'], $projectId, $title,
            $body['description'] ?? null,
            $targetDate,
            $body['status'] ?? 'upcoming',
            $body['completion_criteria'] ?? null,
        ]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'milestone',
            'entity_id' => $id, 'action' => 'create', 'diff' => ['title' => $title],
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    /** PATCH /v425/pm/milestones/{id} */
    public static function patch(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $body = (array)$req->getParsedBody();
        $updates = [];
        $params = [];
        foreach (['title','description','target_date','achieved_at','status','completion_criteria','position_idx'] as $c) {
            if (array_key_exists($c, $body)) {
                $updates[] = "$c = ?";
                $params[] = $body[$c];
            }
        }
        if (!$updates) return self::json($resp, ['error' => 'no_changes'], 422);
        $params[] = $id;
        $params[] = $g['tenant'];
        $g['pdo']->prepare('UPDATE pm_milestones SET ' . implode(', ', $updates)
                          . ' WHERE id = ? AND tenant_id = ?')->execute($params);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'milestone',
            'entity_id' => $id, 'action' => 'update', 'diff' => $body,
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['ok' => true]);
    }

    /** DELETE /v425/pm/milestones/{id} */
    public static function delete(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $g['pdo']->prepare('DELETE FROM pm_milestones WHERE id = ? AND tenant_id = ?')
                 ->execute([$id, $g['tenant']]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'milestone',
            'entity_id' => $id, 'action' => 'delete', 'diff' => null,
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['ok' => true]);
    }
}
