<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Task Comments Handler — N-152-F §4.1 (skeleton).
 */
final class Comments extends Shared
{
    /** POST /v425/pm/tasks/{id}/comments */
    public static function create(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $taskId = (string)($args['id'] ?? '');
        if (!self::validId($taskId)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $body = (array)$req->getParsedBody();
        $text = trim((string)($body['body'] ?? ''));
        if ($text === '' || strlen($text) > 10000) {
            return self::json($resp, ['error' => 'invalid_body'], 422);
        }
        $id = self::genId('cmt');
        $g['pdo']->prepare(
            'INSERT INTO pm_task_comments (id, tenant_id, task_id, author_id, body, mentions_csv)
             VALUES (?,?,?,?,?,?)'
        )->execute([
            $id, $g['tenant'], $taskId, $g['user_id'], $text,
            $body['mentions_csv'] ?? null,
        ]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'comment',
            'entity_id' => $id, 'action' => 'create',
            'diff' => ['task' => $taskId, 'body_len' => strlen($text)],
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    /** GET /v425/pm/tasks/{id}/comments */
    public static function listByTask(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $taskId = (string)($args['id'] ?? '');
        if (!self::validId($taskId)) return self::json($resp, ['error' => 'invalid_id'], 422);
        [$limit, $offset] = self::clampLimit($req);
        $stmt = $g['pdo']->prepare(
            'SELECT * FROM pm_task_comments
             WHERE tenant_id = ? AND task_id = ?
             ORDER BY created_at DESC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $stmt->execute([$g['tenant'], $taskId]);
        return self::json($resp, ['items' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }
}
