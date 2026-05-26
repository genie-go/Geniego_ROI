<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Task Dependencies Handler — N-152-F §5.3 (cycle 검출 포함).
 */
final class Dependencies extends Shared
{
    private const DEP_TYPES = ['FS','SS','FF','SF'];

    /** POST /v425/pm/dependencies */
    public static function create(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $body = (array)$req->getParsedBody();
        $pred = (string)($body['predecessor_id'] ?? '');
        $succ = (string)($body['successor_id'] ?? '');
        $type = (string)($body['dep_type'] ?? 'FS');
        $lag  = (int)($body['lag_days'] ?? 0);
        if (!self::validId($pred) || !self::validId($succ) || !in_array($type, self::DEP_TYPES, true)) {
            return self::json($resp, ['error' => 'invalid_input'], 422);
        }
        if ($pred === $succ) {
            return self::json($resp, ['error' => 'self_dependency'], 422);
        }
        if (!self::validateDependency($g['pdo'], $g['tenant'], $pred, $succ)) {
            return self::json($resp, ['error' => 'cycle_detected'], 422);
        }
        $id = self::genId('dep');
        try {
            $g['pdo']->prepare(
                'INSERT INTO pm_task_dependencies
                 (id, tenant_id, predecessor_id, successor_id, dep_type, lag_days)
                 VALUES (?,?,?,?,?,?)'
            )->execute([$id, $g['tenant'], $pred, $succ, $type, $lag]);
        } catch (\PDOException $e) {
            if (str_contains($e->getMessage(), 'Duplicate')) {
                return self::json($resp, ['error' => 'dependency_exists'], 409);
            }
            throw $e;
        }
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'dependency',
            'entity_id' => $id, 'action' => 'create',
            'diff' => ['pred' => $pred, 'succ' => $succ, 'type' => $type, 'lag' => $lag],
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    /** DELETE /v425/pm/dependencies/{id} */
    public static function delete(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $g['pdo']->prepare('DELETE FROM pm_task_dependencies WHERE id = ? AND tenant_id = ?')
                 ->execute([$id, $g['tenant']]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'dependency',
            'entity_id' => $id, 'action' => 'delete', 'diff' => null,
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['ok' => true]);
    }

    /**
     * cycle 검출 — successor 에서 predecessor 까지 DFS 도달 가능하면 cycle.
     */
    public static function validateDependency(\PDO $pdo, string $tenant, string $predId, string $succId): bool
    {
        $visited = [];
        $stack = [$succId];
        $depth = 0;
        while ($stack && $depth < 10000) {
            $cur = array_pop($stack);
            if (isset($visited[$cur])) continue;
            $visited[$cur] = true;
            if ($cur === $predId) return false;
            $stmt = $pdo->prepare(
                'SELECT successor_id FROM pm_task_dependencies
                 WHERE tenant_id = ? AND predecessor_id = ?'
            );
            $stmt->execute([$tenant, $cur]);
            foreach ($stmt->fetchAll(\PDO::FETCH_COLUMN) as $next) {
                $stack[] = $next;
            }
            $depth++;
        }
        return true;
    }
}
