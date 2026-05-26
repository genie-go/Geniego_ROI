<?php
declare(strict_types=1);

namespace Genie\Handlers\PM;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * PM KPI Handler — N-152-F §4.1 /projects/{id}/kpi.
 *
 * 절대원칙 §4 (데이터 기반 의사결정) — task 총/완료/지연/위험 4 tile.
 */
final class Kpi extends Shared
{
    /** GET /v425/pm/projects/{id}/kpi */
    public static function projectKpi(Request $req, Response $resp, array $args): Response
    {
        $g = self::gate($req, $resp, 'viewer');
        if (isset($g['error'])) return $g['error'];
        $projectId = (string)($args['id'] ?? '');
        if (!self::validId($projectId)) return self::json($resp, ['error' => 'invalid_id'], 422);

        $today = date('Y-m-d');

        // 단일 쿼리 — sum/count 집계
        $sql = 'SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = "done" THEN 1 ELSE 0 END) AS done_count,
                SUM(CASE WHEN status IN ("todo","in_progress","review","blocked") THEN 1 ELSE 0 END) AS active_count,
                SUM(CASE WHEN status NOT IN ("done","cancelled") AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END) AS overdue_count,
                SUM(CASE WHEN status = "blocked" THEN 1 ELSE 0 END) AS blocked_count,
                SUM(CASE WHEN status NOT IN ("done","cancelled") AND priority IN ("high","urgent") THEN 1 ELSE 0 END) AS at_risk_count
                FROM pm_tasks
                WHERE tenant_id = ? AND project_id = ? AND archived_at IS NULL';
        $stmt = $g['pdo']->prepare($sql);
        $stmt->execute([$today, $g['tenant'], $projectId]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];

        $kpi = [
            'project_id'    => $projectId,
            'total'         => (int)($row['total'] ?? 0),
            'done'          => (int)($row['done_count'] ?? 0),
            'active'        => (int)($row['active_count'] ?? 0),
            'overdue'       => (int)($row['overdue_count'] ?? 0),
            'blocked'       => (int)($row['blocked_count'] ?? 0),
            'at_risk'       => (int)($row['at_risk_count'] ?? 0),
            'completion_pct'=> ((int)($row['total'] ?? 0)) > 0
                                ? round(((int)($row['done_count'] ?? 0)) / ((int)$row['total']) * 100, 1)
                                : 0,
            'computed_at'   => date('c'),
        ];
        return self::json($resp, $kpi);
    }
}
