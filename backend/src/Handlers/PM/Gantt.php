<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM Gantt Handler — N-152-F §5.4 CPM critical-path 계산.
 *
 * 169차 본체 구현 (168차 skeleton 대체):
 *  - duration: due_date - start_date 우선, fallback estimate_hours/8, 최소 1일
 *  - topological sort (Kahn) + cycle detection
 *  - forward pass: ES/EF — FS/SS/FF/SF + lag_days 지원
 *  - backward pass: LS/LF
 *  - slack = LS - ES (일 단위)
 *  - critical path: slack == 0
 *
 * dep_type semantics (lag = days, 양수 지연 / 음수 선행):
 *  - FS: successor.ES ≥ predecessor.EF + lag       (기본)
 *  - SS: successor.ES ≥ predecessor.ES + lag
 *  - FF: successor.EF ≥ predecessor.EF + lag
 *  - SF: successor.EF ≥ predecessor.ES + lag
 */
final class Gantt extends Shared
{
    private const SEC_PER_DAY = 86400;

    /** GET /v425/pm/projects/{id}/gantt */
    public static function view(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $projectId = (string)($args['id'] ?? '');
        if (!self::validId($projectId)) return self::json($resp, ['error' => 'invalid_id'], 422);

        $stmt = $g['pdo']->prepare(
            'SELECT id, title, start_date, due_date, status, progress_pct, parent_task_id, estimate_hours
             FROM pm_tasks
             WHERE tenant_id = ? AND project_id = ? AND archived_at IS NULL
             ORDER BY position_idx, id'
        );
        $stmt->execute([$g['tenant'], $projectId]);
        $tasks = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        if (!$tasks) {
            return self::json($resp, [
                'project_id'            => $projectId,
                'tasks'                 => [],
                'dependencies'          => [],
                'critical_path_ids'     => [],
                'project_duration_days' => 0,
                'computed_at'           => date('c'),
            ]);
        }

        $taskIds = array_column($tasks, 'id');
        $place = implode(',', array_fill(0, count($taskIds), '?'));
        $stmt = $g['pdo']->prepare(
            'SELECT predecessor_id, successor_id, dep_type, lag_days
             FROM pm_task_dependencies
             WHERE tenant_id = ? AND (predecessor_id IN (' . $place . ') OR successor_id IN (' . $place . '))'
        );
        $stmt->execute(array_merge([$g['tenant']], $taskIds, $taskIds));
        $deps = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // duration days helper
        $duration = static function (array $t): int {
            if (!empty($t['start_date']) && !empty($t['due_date'])) {
                $d = (strtotime($t['due_date']) - strtotime($t['start_date'])) / self::SEC_PER_DAY;
                if ($d > 0) return (int)ceil($d);
            }
            if (!empty($t['estimate_hours'])) return max(1, (int)ceil(((float)$t['estimate_hours']) / 8));
            return 1;
        };

        // project start = min(task.start_date), fallback today
        $projectStart = null;
        foreach ($tasks as $t) {
            if (!empty($t['start_date'])) {
                $ts = strtotime($t['start_date']);
                if ($projectStart === null || $ts < $projectStart) $projectStart = $ts;
            }
        }
        if ($projectStart === null) $projectStart = strtotime(date('Y-m-d'));

        // build dep graph
        $taskMap = [];
        $predOf  = [];
        $succOf  = [];
        foreach ($tasks as $t) {
            $taskMap[$t['id']] = $t + ['dur' => $duration($t)];
            $predOf[$t['id']]  = [];
            $succOf[$t['id']]  = [];
        }
        foreach ($deps as $d) {
            if (isset($taskMap[$d['successor_id']], $taskMap[$d['predecessor_id']])) {
                $succOf[$d['predecessor_id']][] = $d;
                $predOf[$d['successor_id']][]   = $d;
            }
        }

        // topological sort (Kahn)
        $indeg = [];
        foreach ($taskMap as $id => $_) $indeg[$id] = count($predOf[$id]);
        $queue = [];
        foreach ($indeg as $id => $d) if ($d === 0) $queue[] = $id;
        $topo = [];
        while ($queue) {
            $id = array_shift($queue);
            $topo[] = $id;
            foreach ($succOf[$id] as $dep) {
                $sid = $dep['successor_id'];
                $indeg[$sid]--;
                if ($indeg[$sid] === 0) $queue[] = $sid;
            }
        }
        $hasCycle = count($topo) !== count($taskMap);
        if ($hasCycle) {
            // 사이클 발생 — 부분 결과만 반환, cycle warning 포함
            foreach ($taskMap as $id => $_) {
                if (!in_array($id, $topo, true)) $topo[] = $id; // 나머지도 best-effort
            }
        }

        // forward pass
        $es = []; $ef = [];
        foreach ($topo as $id) {
            $t = $taskMap[$id];
            $durSec = $t['dur'] * self::SEC_PER_DAY;
            $minES = !empty($t['start_date']) ? strtotime($t['start_date']) : $projectStart;
            foreach ($predOf[$id] as $dep) {
                $pid    = $dep['predecessor_id'];
                $lag    = (int)($dep['lag_days'] ?? 0) * self::SEC_PER_DAY;
                $type   = $dep['dep_type'] ?? 'FS';
                if (!isset($es[$pid]) || !isset($ef[$pid])) continue;
                $candidate = match ($type) {
                    'SS'    => $es[$pid] + $lag,
                    'FF'    => $ef[$pid] + $lag - $durSec,
                    'SF'    => $es[$pid] + $lag - $durSec,
                    default => $ef[$pid] + $lag, // FS
                };
                if ($candidate > $minES) $minES = $candidate;
            }
            $es[$id] = $minES;
            $ef[$id] = $minES + $durSec;
        }

        // project end
        $projectEnd = $ef ? max($ef) : $projectStart;

        // backward pass (reverse topological)
        $ls = []; $lf = [];
        foreach (array_reverse($topo) as $id) {
            $t = $taskMap[$id];
            $durSec = $t['dur'] * self::SEC_PER_DAY;
            if (empty($succOf[$id])) {
                $maxLF = $ef[$id] ?? $projectEnd;
            } else {
                $maxLF = PHP_INT_MAX;
                foreach ($succOf[$id] as $dep) {
                    $sid  = $dep['successor_id'];
                    $lag  = (int)($dep['lag_days'] ?? 0) * self::SEC_PER_DAY;
                    $type = $dep['dep_type'] ?? 'FS';
                    if (!isset($ls[$sid]) || !isset($lf[$sid])) continue;
                    $candidate = match ($type) {
                        'SS'    => $ls[$sid] - $lag + $durSec,
                        'FF'    => $lf[$sid] - $lag,
                        'SF'    => $lf[$sid] - $lag + $durSec,
                        default => $ls[$sid] - $lag, // FS
                    };
                    if ($candidate < $maxLF) $maxLF = $candidate;
                }
                if ($maxLF === PHP_INT_MAX) $maxLF = $ef[$id] ?? $projectEnd;
            }
            $lf[$id] = $maxLF;
            $ls[$id] = $maxLF - $durSec;
        }

        // enrichment + critical path
        $enriched = [];
        $criticalPathIds = [];
        foreach ($tasks as $t) {
            $id = $t['id'];
            $slack = (isset($ls[$id], $es[$id]))
                ? (int)round(($ls[$id] - $es[$id]) / self::SEC_PER_DAY)
                : null;
            $onCp = ($slack === 0);
            if ($onCp) $criticalPathIds[] = $id;
            $enriched[] = $t + [
                'es'               => isset($es[$id]) ? date('Y-m-d', (int)$es[$id]) : null,
                'ef'               => isset($ef[$id]) ? date('Y-m-d', (int)$ef[$id]) : null,
                'ls'               => isset($ls[$id]) ? date('Y-m-d', (int)$ls[$id]) : null,
                'lf'               => isset($lf[$id]) ? date('Y-m-d', (int)$lf[$id]) : null,
                'duration_days'    => $taskMap[$id]['dur'] ?? null,
                'slack_days'       => $slack,
                'on_critical_path' => $onCp,
            ];
        }

        $projectDurationDays = (int)round(($projectEnd - $projectStart) / self::SEC_PER_DAY);

        $payload = [
            'project_id'            => $projectId,
            'tasks'                 => $enriched,
            'dependencies'          => $deps,
            'critical_path_ids'     => $criticalPathIds,
            'project_duration_days' => $projectDurationDays,
            'computed_at'           => date('c'),
        ];
        if ($hasCycle) $payload['warning'] = 'cycle_detected_in_dependencies';

        return self::json($resp, $payload);
    }
}
