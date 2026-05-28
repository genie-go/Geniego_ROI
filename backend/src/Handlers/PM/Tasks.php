<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Tasks Handler — N-152-F §4 endpoint #7-#12 (skeleton).
 * spec: docs/spec/n152f_pm_features_spec.md §4.1
 */
final class Tasks extends Shared
{
    /** POST /v425/pm/tasks */
    public static function create(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];

        $body = (array)$req->getParsedBody();
        $projectId = (string)($body['project_id'] ?? '');
        $title = trim((string)($body['title'] ?? ''));
        if (!self::validId($projectId) || $title === '' || strlen($title) > 500) {
            return self::json($resp, ['error' => 'invalid_input'], 422);
        }
        $id = self::genId('task');
        $g['pdo']->prepare(
            'INSERT INTO pm_tasks
             (id, tenant_id, project_id, parent_task_id, title, description, status, priority,
              progress_pct, start_date, due_date, estimate_hours, milestone_id, labels_csv, created_by)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $id, $g['tenant'], $projectId,
            $body['parent_task_id'] ?? null,
            $title,
            $body['description'] ?? null,
            $body['status'] ?? 'todo',
            $body['priority'] ?? 'normal',
            (int)($body['progress_pct'] ?? 0),
            $body['start_date'] ?? null,
            $body['due_date'] ?? null,
            $body['estimate_hours'] ?? null,
            $body['milestone_id'] ?? null,
            $body['labels_csv'] ?? null,
            $g['user_id'],
        ]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'task',
            'entity_id' => $id, 'action' => 'create',
            'diff' => ['title' => $title, 'project_id' => $projectId],
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['id' => $id, 'ok' => true], 201);
    }

    /** GET /v425/pm/tasks/{id} — task + assignees + counts + dependencies */
    public static function get(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);

        $stmt = $g['pdo']->prepare('SELECT * FROM pm_tasks WHERE id = ? AND tenant_id = ?');
        $stmt->execute([$id, $g['tenant']]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return self::json($resp, ['error' => 'not_found'], 404);

        // 177차 enrich — assignees / counts / dependencies (단일 task)
        $stmt = $g['pdo']->prepare('SELECT user_id FROM pm_task_assignees WHERE tenant_id = ? AND task_id = ?');
        $stmt->execute([$g['tenant'], $id]);
        $row['assignees'] = array_column($stmt->fetchAll(\PDO::FETCH_ASSOC), 'user_id');

        $stmt = $g['pdo']->prepare('SELECT COUNT(*) FROM pm_task_comments WHERE tenant_id = ? AND task_id = ?');
        $stmt->execute([$g['tenant'], $id]);
        $row['comment_count'] = (int)$stmt->fetchColumn();

        $stmt = $g['pdo']->prepare('SELECT COUNT(*) FROM pm_attachments WHERE tenant_id = ? AND task_id = ?');
        $stmt->execute([$g['tenant'], $id]);
        $row['attachment_count'] = (int)$stmt->fetchColumn();

        $stmt = $g['pdo']->prepare(
            'SELECT predecessor_id, dep_type, lag_days FROM pm_task_dependencies
             WHERE tenant_id = ? AND successor_id = ?'
        );
        $stmt->execute([$g['tenant'], $id]);
        $row['predecessors'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $stmt = $g['pdo']->prepare(
            'SELECT successor_id, dep_type, lag_days FROM pm_task_dependencies
             WHERE tenant_id = ? AND predecessor_id = ?'
        );
        $stmt->execute([$g['tenant'], $id]);
        $row['successors'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return self::json($resp, $row);
    }

    /** PATCH /v425/pm/tasks/{id} */
    public static function patch(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);

        $body = (array)$req->getParsedBody();
        $updates = [];
        $params = [];
        $statusChanged = isset($body['status']);
        foreach (['title','description','status','priority','progress_pct','start_date','due_date',
                  'estimate_hours','actual_hours','milestone_id','labels_csv','parent_task_id'] as $col) {
            if (array_key_exists($col, $body)) {
                $updates[] = "$col = ?";
                $params[] = $body[$col];
            }
        }
        if (!$updates) return self::json($resp, ['error' => 'no_changes'], 422);
        $params[] = $id;
        $params[] = $g['tenant'];
        $g['pdo']->prepare('UPDATE pm_tasks SET ' . implode(', ', $updates)
                          . ' WHERE id = ? AND tenant_id = ?')->execute($params);

        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'task',
            'entity_id' => $id,
            'action' => $statusChanged ? 'status_change' : 'update',
            'diff' => $body, 'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['ok' => true]);
    }

    /** DELETE /v425/pm/tasks/{id} — soft delete (archived_at) */
    public static function delete(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'analyst');
        if (isset($g['error'])) return $g['error'];
        $id = (string)($args['id'] ?? '');
        if (!self::validId($id)) return self::json($resp, ['error' => 'invalid_id'], 422);
        $g['pdo']->prepare('UPDATE pm_tasks SET archived_at = NOW() WHERE id = ? AND tenant_id = ?')
                 ->execute([$id, $g['tenant']]);
        self::auditLog($g['pdo'], [
            'tenant_id' => $g['tenant'], 'actor_user_id' => $g['user_id'],
            'actor_api_key' => $g['api_key'], 'entity_type' => 'task',
            'entity_id' => $id, 'action' => 'delete', 'diff' => null,
            'ip' => self::clientIp($req), 'ua' => self::userAgent($req),
        ]);
        return self::json($resp, ['ok' => true]);
    }

    /** GET /v425/pm/projects/{id}/tasks — task list (위계 + assignees + counts + deps preload) */
    public static function listByProject(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $projectId = (string)($args['id'] ?? '');
        if (!self::validId($projectId)) return self::json($resp, ['error' => 'invalid_id'], 422);
        [$limit, $offset] = self::clampLimit($req);

        $stmt = $g['pdo']->prepare(
            'SELECT * FROM pm_tasks
             WHERE tenant_id = ? AND project_id = ? AND archived_at IS NULL
             ORDER BY COALESCE(parent_task_id, ""), position_idx, id
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $stmt->execute([$g['tenant'], $projectId]);
        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        if (!$rows) return self::json($resp, ['items' => [], 'total' => 0]);

        // 177차 enrich — bulk JOIN (N+1 회피)
        $ids = array_column($rows, 'id');
        $place = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $g['pdo']->prepare(
            "SELECT task_id, user_id FROM pm_task_assignees
             WHERE tenant_id = ? AND task_id IN ($place)"
        );
        $stmt->execute(array_merge([$g['tenant']], $ids));
        $assigneesByTask = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $assigneesByTask[$r['task_id']][] = $r['user_id'];
        }

        $stmt = $g['pdo']->prepare(
            "SELECT task_id, COUNT(*) AS cnt FROM pm_task_comments
             WHERE tenant_id = ? AND task_id IN ($place) GROUP BY task_id"
        );
        $stmt->execute(array_merge([$g['tenant']], $ids));
        $commentCount = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $commentCount[$r['task_id']] = (int)$r['cnt'];
        }

        $stmt = $g['pdo']->prepare(
            "SELECT task_id, COUNT(*) AS cnt FROM pm_attachments
             WHERE tenant_id = ? AND task_id IN ($place) GROUP BY task_id"
        );
        $stmt->execute(array_merge([$g['tenant']], $ids));
        $attachmentCount = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $attachmentCount[$r['task_id']] = (int)$r['cnt'];
        }

        $stmt = $g['pdo']->prepare(
            "SELECT predecessor_id, successor_id, dep_type, lag_days
             FROM pm_task_dependencies
             WHERE tenant_id = ?
               AND (predecessor_id IN ($place) OR successor_id IN ($place))"
        );
        $stmt->execute(array_merge([$g['tenant']], $ids, $ids));
        $depsBy = [];
        foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $depsBy[$r['successor_id']]['predecessors'][] = $r;
            $depsBy[$r['predecessor_id']]['successors'][] = $r;
        }

        foreach ($rows as &$t) {
            $tid = $t['id'];
            $t['assignees']        = $assigneesByTask[$tid] ?? [];
            $t['comment_count']    = $commentCount[$tid]    ?? 0;
            $t['attachment_count'] = $attachmentCount[$tid] ?? 0;
            $t['predecessors']     = $depsBy[$tid]['predecessors'] ?? [];
            $t['successors']       = $depsBy[$tid]['successors']   ?? [];
        }
        unset($t);

        return self::json($resp, ['items' => $rows, 'total' => count($rows)]);
    }
}
