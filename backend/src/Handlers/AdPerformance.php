<?php
namespace Handlers;

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
        return in_array($this->userPlan, ['free', 'growth']); // free/growth get demo only
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

}
?>
