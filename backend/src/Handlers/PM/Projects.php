<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Projects Handler — N-152-F §4 endpoint #1-#5 + projects/{id}/tasks/gantt/kpi (skeleton).
 *
 * spec: docs/spec/n152f_pm_features_spec.md §4.1
 */
final class Projects extends Shared
{
    /** GET /v425/pm/projects */
    public static function list(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        [$limit, $offset] = self::clampLimit($req);

        $q = $req->getQueryParams();
        $where = ['tenant_id = ?'];
        $params = [$g['tenant']];
        if (!empty($q['status'])) {
            $where[] = 'status = ?';
            $params[] = (string)$q['status'];
        }
        $sql = 'SELECT * FROM pm_projects WHERE ' . implode(' AND ', $where)
             . ' ORDER BY updated_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
        $stmt = $g['pdo']->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($resp, [
            'items'   => $rows,
            '_tenant' => $g['tenant'],
            '_env'    => $g['isDemo'] ? 'demo' : 'production',
        ]);
    }

    /** POST /v425/pm/projects */
    public static function create(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];

        $body = (array)$req->getParsedBody();
        $name = trim((string)($body['name'] ?? ''));
        if ($name === '' || strlen($name) > 255) {
            return self::json($resp, ['error' => 'invalid_name'], 422);
        }
        $id = self::genId('proj');
        $g['pdo']->prepare(
            'INSERT INTO pm_projects
             (id, tenant_id, name, description, status, start_date, target_date,
              owner_user_id, budget_amount, budget_currency, metadata_json)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $g['tenant'], $name,
            $body['description'] ?? null,
            $body['status'] ?? 'planning',
            $body['start_date'] ?? null,
            $body['target_date'] ?? null,
            $body['owner_user_id'] ?? $g['user_id'],
            $body['budget_amount'] ?? null,
            $body['budget_currency'] ?? 'KRW',
            isset($body['metadata']) ? json_encode($body['metadata'], JSON_UNESCAPED_UNICODE) : null,
        ]);

        self::auditLog($g['pdo'], [
            'tenant_id'     => $g['tenant'],
            'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'],
            'entity_type'   => 'project',
            'entity_id'     => $id,
            'action'        => 'create',
            'diff'          => ['name' => $name],
            'ip'            => self::clientIp($req),
            'ua'            => self::userAgent($req),
        ]);

        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    /** GET /v425/pm/projects/{id} */
    public static function get(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $stmt = $g['pdo']->prepare('SELECT * FROM pm_projects WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $g['tenant']]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return self::json($resp, ['error' => 'not_found'], 404);
        return self::json($resp, $row);
    }

    /** PATCH /v425/pm/projects/{id} */
    public static function patch(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);

        $body = (array)$req->getParsedBody();
        $updates = [];
        $params = [];
        foreach (['name', 'description', 'status', 'start_date', 'target_date',
                  'owner_user_id', 'budget_amount', 'budget_currency'] as $col) {
            if (array_key_exists($col, $body)) {
                $updates[] = "$col = ?";
                $params[] = $body[$col];
            }
        }
        if (!$updates) return self::json($resp, ['error' => 'no_changes'], 422);
        $params[] = $id;
        $params[] = $g['tenant'];

        $g['pdo']->prepare('UPDATE pm_projects SET ' . implode(', ', $updates)
                          . ' WHERE id = ? AND tenant_id = ?')->execute($params);

        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'project',
            'entity_id' => $id, 'action' => 'update', 'diff' => $body,
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);

        return self::json($resp, ['ok' => true]);
    }

    /** DELETE /v425/pm/projects/{id} — soft delete (archived) */
    public static function delete(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'admin');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $g['pdo']->prepare('UPDATE pm_projects SET status = "archived" WHERE id = ? AND tenant_id = ?')
                 ->execute([$id, $g['tenant']]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'project',
            'entity_id' => $id, 'action' => 'delete', 'diff' => null,
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['ok' => true]);
    }

    /** GET /v425/pm/projects/{id}/tasks — project 의 task tree (skeleton) */
    public static function listTasks(Request $req, Response $resp, array $args): Response
    {
        return Tasks::listByProject($req, $resp, $args);
    }
}
