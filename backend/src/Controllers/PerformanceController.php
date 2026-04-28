<?php
declare(strict_types=1);

namespace Genie\Controllers;

use Genie\Db;
use PDO;

class PerformanceController {
    // GET /api/performance?team=US&channel=Meta&account=account1
    public static function getMetrics(): void {
        $auth = \Genie\Helpers\Auth::requireAuth();
        $tenantId = $auth['tenant_id']; 

        $team = $_GET['team'] ?? null;
        $channel = $_GET['channel'] ?? null;
        $account = $_GET['account'] ?? null;

        $pdo = Db::pdo();
        $sql = "SELECT * FROM ad_insight_agg WHERE tenant_id = :tenant";
        $params = [':tenant' => $tenantId];
        if ($team) { $sql .= " AND region = :team"; $params[':team'] = $team; }
        if ($channel) { $sql .= " AND platform = :channel"; $params[':channel'] = $channel; }
        if ($account) { $sql .= " AND account_id = :account"; $params[':account'] = $account; }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        header('Content-Type: application/json');
        echo json_encode($rows);
    }

    // GET /api/v1/ad-performance/summary
    public static function getSummary(): void {
        $pdo = Db::pdo();
        // Determine tenant and plan from session/auth
        // For simplicity in this demo environment, we'll try to get user from session
        $auth = \Genie\Helpers\Auth::requireAuth(); $userId = $auth['tenant_id'];
        $userPlan = $auth['plan'] ?? 'pro';

        // In a real app, we'd use:
        // $auth = Auth::requireAuth();
        // $userId = $auth['tenant_id'];
        // $userPlan = $auth['plan'];

        $handler = new \Handlers\AdPerformance($pdo, $userId, $userPlan);
        $filters = $_GET;
        $summary = $handler->getSummary($filters);
        
        header('Content-Type: application/json');
        echo json_encode($summary);
    }

    // POST /api/performance (ingest metrics)
    public static function ingestMetrics(): void {

        $auth = \Genie\Helpers\Auth::requireAuth();
        $tenantId = $auth['tenant_id'];
        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON payload']);
            return;
        }
        // Expect fields: team, channel, account, date, impressions, clicks, spend, conversions, revenue, extra_json
        $pdo = Db::pdo();
        $stmt = $pdo->prepare(
            "INSERT INTO performance_metrics (tenant_id, team, channel, account, date, impressions, clicks, spend, conversions, revenue, extra_json) VALUES (:tenant, :team, :channel, :account, :date, :impressions, :clicks, :spend, :conversions, :revenue, :extra_json)"
        );
        $data = [
            ':tenant' => $tenantId,
            ':team' => $input['team'] ?? '',
            ':channel' => $input['channel'] ?? '',
            ':account' => $input['account'] ?? '',
            ':date' => $input['date'] ?? date('Y-m-d'),
            ':impressions' => $input['impressions'] ?? 0,
            ':clicks' => $input['clicks'] ?? 0,
            ':spend' => $input['spend'] ?? 0.0,
            ':conversions' => $input['conversions'] ?? 0,
            ':revenue' => $input['revenue'] ?? 0.0,
            ':extra_json' => isset($input['extra']) ? json_encode($input['extra']) : null,
        ];
        $stmt->execute($data);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'ok']);
    }


    // POST /api/performance/recommendations
    public static function getRecommendations(): void {
        $auth = \Genie\Helpers\Auth::requireAuth();
        $tenantId = $auth['tenant_id'];

        $input = json_decode(file_get_contents('php://input'), true);
        // Simple mock recommendation based on spend
        $recommendations = [];
        if (isset($input['spend'])) {
            $spend = $input['spend'];
            if ($spend > 10000) {
                $recommendations[] = ['action' => 'Scale up', 'reason' => 'High spend with good ROI'];
            } else {
                $recommendations[] = ['action' => 'Optimize', 'reason' => 'Consider reducing budget'];
            }
        }
        header('Content-Type: application/json');
        echo json_encode(['recommendations' => $recommendations]);
    }
}
?>
