<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Task Assignees Handler — N-152-F §4.1 (skeleton).
 */
final class Assignees extends Shared
{
    private const ROLE_ENUM = ['owner','contributor','reviewer','observer'];

    /** POST /v425/pm/tasks/{id}/assignees */
    public static function add(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $taskId = (string)($args['id'] ?? '');
        if (!self::validId($taskId)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $body = (array)$req->getParsedBody();
        $userId = (string)($body['user_id'] ?? '');
        $role = (string)($body['role'] ?? 'contributor');
        if (!self::validId($userId) || !in_array($role, self::ROLE_ENUM, true)) {
            return self::json($resp, ['error' => 'invalid_input'], 422);
        }
        $id = self::genId('asg');
        try {
            $g['pdo']->prepare(
                'INSERT INTO pm_task_assignees (id, tenant_id, task_id, user_id, role)
                 VALUES (?,?,?,?,?)'
            )->execute([$id, $g['tenant'], $taskId, $userId, $role]);
        } catch (\PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) {
                return self::json($resp, ['error' => 'already_assigned'], 409);
            }
            throw $e;
        }
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'assignee',
            'entity_id' => $id, 'action' => 'assign',
            'diff' => ['task' => $taskId, 'user' => $userId, 'role' => $role],
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    /** DELETE /v425/pm/tasks/{id}/assignees/{userId} */
    public static function remove(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $taskId = (string)($args['id'] ?? '');
        $userId = (string)($args['userId'] ?? '');
        if (!self::validId($taskId) || !self::validId($userId)) {
            return self::json($resp, ['error' => 'invalid_id'], 422);
        }
        $g['pdo']->prepare(
            'DELETE FROM pm_task_assignees
             WHERE tenant_id = ? AND task_id = ? AND user_id = ?'
        )->execute([$g['tenant'], $taskId, $userId]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'assignee',
            'entity_id' => $taskId . ':' . $userId, 'action' => 'unassign', 'diff' => null,
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['ok' => true]);
    }
}
