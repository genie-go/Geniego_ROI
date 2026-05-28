<?php
// PSR-4 fix (166차): namespace Handlers → Genie\Handlers
namespace Genie\Handlers;

use PDO;
use Exception;

class AdPerformance {
    private $db;
    private $userPlan;
    private $userId;

    public function __construct(PDO $db, $userId, $userPlan) {
        $this->db = $db;
        $this->userId = $userId;
        $this->userPlan = $userPlan;
    }

    // Helper to determine if demo data should be used
    private function isDemo() {
        return false; // Demo removed // free/growth get demo only
    }

    // GET /api/v1/ad-performance
    public function getPerformance($filters) {
        $where = [];
        $params = [];
        if ($this->isDemo()) {
            $where[] = "tenant_id = 'demo'";
        } else {
            $where[] = "tenant_id = :tenant_id";
            $params[':tenant_id'] = $this->userId;
        }
        if (!empty($filters['team'])) {
            $where[] = "team = :team";
            $params[':team'] = $filters['team'];
        }
        if (!empty($filters['account'])) {
            $where[] = "account = :account";
            $params[':account'] = $filters['account'];
        }
        if (!empty($filters['channel'])) {
            $where[] = "channel = :channel";
            $params[':channel'] = $filters['channel'];
        }
        if (!empty($filters['date_from']) && !empty($filters['date_to'])) {
            $where[] = "date BETWEEN :date_from AND :date_to";
            $params[':date_from'] = $filters['date_from'];
            $params[':date_to'] = $filters['date_to'];
        }
        $sql = "SELECT * FROM performance_metrics" . (count($where) ? " WHERE " . implode(' AND ', $where) : "");
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // GET /api/v1/ad-performance/summary
    public function getSummary($filters) {
        $where = [];
        $params = [];
        if ($this->isDemo()) {
            $where[] = "tenant_id = 'demo'";
        } else {
            $where[] = "tenant_id = :tenant_id";
            $params[':tenant_id'] = $this->userId;
        }
        if (!empty($filters['team'])) {
            $where[] = "team = :team";
            $params[':team'] = $filters['team'];
        }
        if (!empty($filters['account'])) {
            $where[] = "account = :account";
            $params[':account'] = $filters['account'];
        }
        if (!empty($filters['channel'])) {
            $where[] = "channel = :channel";
            $params[':channel'] = $filters['channel'];
        }
        $sql = "SELECT team, channel, SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(conversions) AS conversions, SUM(spend) AS spend, SUM(revenue) AS revenue FROM performance_metrics" . (count($where) ? " WHERE " . implode(' AND ', $where) : "") . " GROUP BY team, channel";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // GET /api/v1/ad-performance/combined
    public function getCombined($filters) {
        $where = [];
        $params = [];
        if ($this->isDemo()) {
            $where[] = "tenant_id = 'demo'";
        } else {
            $where[] = "tenant_id = :tenant_id";
            $params[':tenant_id'] = $this->userId;
        }
        if (!empty($filters['team'])) {
            $where[] = "team = :team";
            $params[':team'] = $filters['team'];
        }
        if (!empty($filters['date_from']) && !empty($filters['date_to'])) {
            $where[] = "date BETWEEN :date_from AND :date_to";
            $params[':date_from'] = $filters['date_from'];
            $params[':date_to'] = $filters['date_to'];
        }
        $sql = "SELECT SUM(impressions) AS impressions, SUM(clicks) AS clicks, SUM(conversions) AS conversions, SUM(spend) AS spend, SUM(revenue) AS revenue FROM performance_metrics" . (count($where) ? " WHERE " . implode(' AND ', $where) : "");
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/performance/meta-ads  (175차 S3.3 — Slim handler)
    // Frontend: AccountPerformance.jsx 의 Meta 광고 campaign 데이터
    // Response: { ok, campaigns: [{ id, name, status, spend, roas, impressions, clicks, ctr, conv, budget, adsets, history }] }
    // ─────────────────────────────────────────────────────────────
    public static function metaAds(
        \Psr\Http\Message\ServerRequestInterface $req,
        \Psr\Http\Message\ResponseInterface $res
    ): \Psr\Http\Message\ResponseInterface {
        $tenant = $req->getAttribute('auth_tenant')
                  ?: $req->getHeaderLine('X-Tenant-Id')
                  ?: 'demo';

        $payload = ['ok' => true, 'campaigns' => []];

        try {
            $pdo = \Genie\Db::pdo();
            // performance_metrics 가 있고 channel='meta' 데이터가 있으면 campaign 단위 집계
            $stmt = $pdo->prepare(
                "SELECT
                   COALESCE(campaign_id, account || '_' || team) AS id,
                   COALESCE(campaign_name, account, team)        AS name,
                   COALESCE(status, 'active')                     AS status,
                   SUM(spend)                                     AS spend,
                   SUM(revenue)                                   AS revenue,
                   SUM(impressions)                               AS impressions,
                   SUM(clicks)                                    AS clicks,
                   SUM(conversions)                               AS conv
                 FROM performance_metrics
                 WHERE tenant_id = ? AND LOWER(channel) IN ('meta','meta_ads','facebook','instagram')
                 GROUP BY id, name, status
                 ORDER BY spend DESC
                 LIMIT 50"
            );
            $stmt->execute([$tenant]);
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as $r) {
                $spend = (float)($r['spend'] ?? 0);
                $rev   = (float)($r['revenue'] ?? 0);
                $imp   = (int)($r['impressions'] ?? 0);
                $clk   = (int)($r['clicks'] ?? 0);
                $payload['campaigns'][] = [
                    'id'          => (string)($r['id'] ?? ''),
                    'name'        => (string)($r['name'] ?? ''),
                    'status'      => (string)($r['status'] ?? 'active'),
                    'objective'   => 'Conversion',
                    'spend'       => $spend,
                    'roas'        => $spend > 0 ? round($rev / $spend, 2) : 0,
                    'impressions' => $imp,
                    'clicks'      => $clk,
                    'ctr'         => $imp > 0 ? round($clk * 100 / $imp, 2) : 0,
                    'conv'        => (int)($r['conv'] ?? 0),
                    'budget'      => $spend > 0 ? (int)($spend * 1.3) : 0,
                    'adsets'      => [],
                    'history'     => [],
                ];
            }
        } catch (\Throwable $e) {
            // 테이블 미존재 / 권한 등 — 빈 결과로 응답 (프론트 demo fallback 작동)
            $payload['note'] = 'no data: ' . substr($e->getMessage(), 0, 80);
        }

        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json');
    }

}
?>
