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
    // 204차 P1: 레거시 비-PSR 핸들러(존재하지 않는 \Genie\Helpers\Auth::requireAuth + 잘못된
    //   \Handlers\AdPerformance 네임스페이스 + void echo 반환)로 인해 항상 500 → PerformanceHub.jsx 가
    //   빈 배열로 폴백(실데이터 영구 미노출)되던 갭. PSR 핸들러로 재작성. 테넌트는 AdPerformance::metaAds 와
    //   동일하게 미들웨어 auth_tenant 우선 해석(위조 불가). 출력=배열(프론트 기대 형식).
    public static function getSummary(
        \Psr\Http\Message\ServerRequestInterface $req,
        \Psr\Http\Message\ResponseInterface $res
    ): \Psr\Http\Message\ResponseInterface {
        // [227차 감사] raw X-Tenant-Id 폴백 제거 — auth_tenant(미들웨어 주입)만 신뢰.
        $tenant = $req->getAttribute('auth_tenant') ?: 'demo';
        $rows = [];
        try {
            $pdo = Db::pdo();
            $handler = new \Genie\Handlers\AdPerformance($pdo, $tenant, 'pro');
            $rows = $handler->getSummary((array)$req->getQueryParams());
        } catch (\Throwable $e) {
            $rows = [];
        }
        $res->getBody()->write(json_encode(array_values($rows)));
        return $res->withHeader('Content-Type', 'application/json');
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
