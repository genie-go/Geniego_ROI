<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Gantt Handler — N-152-F §5.4 CPM critical-path 계산 (skeleton).
 *
 * 본 skeleton 은 task + dep 조회 + 기본 slack=0 표시. 실 forward/backward pass + critical path
 * 계산은 169차 본체 구현.
 */
final class Gantt extends Shared
{
    /** GET /v425/pm/projects/{id}/gantt */
    public static function view(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $projectId = (string)($args['id'] ?? '');
        if (!self::validId($projectId)) return self::json($resp, ['error' => 'invalid_id'], 422);

        $stmt = $g['pdo']->prepare(
            'SELECT id, title, start_date, due_date, status, progress_pct, parent_task_id
             FROM pm_tasks
             WHERE tenant_id = ? AND project_id = ? AND archived_at IS NULL
             ORDER BY position_idx, id'
        );
        $stmt->execute([$g['tenant'], $projectId]);
        $tasks = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $taskIds = array_column($tasks, 'id');

        $deps = [];
        if ($taskIds) {
            $place = implode(',', array_fill(0, count($taskIds), '?'));
            $stmt = $g['pdo']->prepare(
                'SELECT predecessor_id, successor_id, dep_type, lag_days
                 FROM pm_task_dependencies
                 WHERE tenant_id = ? AND (predecessor_id IN (' . $place . ') OR successor_id IN (' . $place . '))'
            );
            $stmt->execute(array_merge([$g['tenant']], $taskIds, $taskIds));
            $deps = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        // Skeleton: forward/backward pass + critical path = 169차 구현.
        // 현재는 slack=null 로 응답 + on_critical_path=false default.
        $enriched = array_map(function ($t) {
            return $t + [
                'es' => $t['start_date'] ?? null,
                'ef' => $t['due_date'] ?? null,
                'ls' => $t['start_date'] ?? null,
                'lf' => $t['due_date'] ?? null,
                'slack_days' => null,
                'on_critical_path' => false,
            ];
        }, $tasks);

        return self::json($resp, [
            'project_id'            => $projectId,
            'tasks'                 => $enriched,
            'dependencies'          => $deps,
            'critical_path_ids'     => [],
            'project_duration_days' => null,
            'computed_at'           => date('c'),
            '_skeleton'             => true,
        ]);
    }
}
