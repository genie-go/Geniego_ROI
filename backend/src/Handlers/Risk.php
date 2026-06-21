<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class Risk {

    /**
     * [P0 보안] 은행급 테넌트 격리 — 미들웨어 주입 auth_tenant(api_key 의 tenant_id, 위조불가)만 신뢰.
     *   body/query 의 raw tenant_id 는 클라이언트 위조 가능 → 교차테넌트 read/write 통로이므로 절대 신뢰 금지.
     *   라우트는 $register(api_key 미들웨어) 경유라 auth_tenant 가 항상 채워진다. 세션토큰 폴백 후 미해결은
     *   demo 격리버킷으로 fail-closed.
     */
    private static function tenantId(Request $request): string {
        $auth = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($auth !== '') return $auth;
        $t = UserAuth::authedTenant($request);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function sigmoid(float $x): float {
        return 1.0 / (1.0 + exp(-$x));
    }

    private static function predict(array $features, ?array $weights = null): array {
        $w = [
            "neg_review_density" => 1.4,
            "policy_findings_high" => 1.2,
            "policy_repeat_count" => 0.8,
            "account_health_warnings" => 0.9,
            "oos_rate" => 0.6,
            "price_instability" => 0.4,
            "base" => -2.0,
        ];
        if (is_array($weights)) {
            foreach ($weights as $k => $v) $w[$k] = (float)$v;
        }

        $score = (float)$w["base"];
        $contrib = [];
        foreach ($features as $k => $v) {
            if ($k === "base") continue;
            if (array_key_exists($k, $w)) {
                $c = (float)$w[$k] * (float)$v;
                $contrib[$k] = $c;
                $score += $c;
            }
        }
        $prob = self::sigmoid($score);

        uasort($contrib, fn($a,$b) => abs($b) <=> abs($a));
        $top = [];
        $i = 0;
        foreach ($contrib as $k => $v) {
            $top[] = ["feature" => $k, "contribution" => (float)$v];
            $i++;
            if ($i >= 5) break;
        }

        return [(float)$prob, ["score" => (float)$score, "top_drivers" => $top]];
    }

    public static function predictSingle(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $payload = $request->getParsedBody();
        if (!is_array($payload)) $payload = [];

        $tenantId = self::tenantId($request); // [P0] body tenant_id 신뢰 제거 — auth_tenant 강제
        $entityType = (string)($payload["entity_type"] ?? "amazon_listing");
        $entityId = (string)($payload["entity_id"] ?? "UNKNOWN");
        $features = $payload["features"] ?? [];
        if (!is_array($features)) $features = [];

        // latest deployed model
        $stmt = $pdo->query("SELECT model_version FROM risk_model_registry WHERE is_deployed=1 ORDER BY id DESC LIMIT 1");
        $modelVersion = $stmt->fetchColumn();
        if (!$modelVersion) $modelVersion = "v0";

        $numeric = [];
        foreach ($features as $k => $v) $numeric[$k] = (float)$v;

        [$prob, $meta] = self::predict($numeric);

        $now = gmdate('c');
        $ins = $pdo->prepare("INSERT INTO risk_prediction(tenant_id,entity_type,entity_id,model_version,probability,drivers_json,predicted_at) VALUES(?,?,?,?,?,?,?)");
        $ins->execute([$tenantId,$entityType,$entityId,(string)$modelVersion,(float)$prob,json_encode($meta, JSON_UNESCAPED_UNICODE),$now]);

        $out = [
            "tenant_id" => $tenantId,
            "entity_type" => $entityType,
            "entity_id" => $entityId,
            "model_version" => (string)$modelVersion,
            "probability" => (float)$prob,
            "drivers" => $meta,
            "predicted_at" => $now,
        ];
        return TemplateResponder::respond($response, $out);
    }

    public static function batchRun(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $payload = $request->getParsedBody();
        if (!is_array($payload)) $payload = [];

        $tenantId = self::tenantId($request); // [P0] body tenant_id 신뢰 제거 — auth_tenant 강제
        $entities = $payload["entities"] ?? [];
        if (!is_array($entities)) {
            $response->getBody()->write(json_encode(["detail"=>"entities must be a list"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(400)->withHeader('Content-Type','application/json');
        }

        $stmt = $pdo->query("SELECT model_version FROM risk_model_registry WHERE is_deployed=1 ORDER BY id DESC LIMIT 1");
        $modelVersion = $stmt->fetchColumn();
        if (!$modelVersion) $modelVersion = "v0";

        $created = 0;
        $results = [];
        $ins = $pdo->prepare("INSERT INTO risk_prediction(tenant_id,entity_type,entity_id,model_version,probability,drivers_json,predicted_at) VALUES(?,?,?,?,?,?,?)");
        foreach ($entities as $e) {
            if (!is_array($e)) continue;
            $entityId = (string)($e["entity_id"] ?? "");
            $entityType = (string)($e["entity_type"] ?? "amazon_listing");
            $features = $e["features"] ?? [];
            if (!is_array($features)) $features = [];
            $numeric = [];
            foreach ($features as $k => $v) $numeric[$k] = (float)$v;
            [$prob, $meta] = self::predict($numeric);
            $now = gmdate('c');
            $ins->execute([$tenantId,$entityType,$entityId,(string)$modelVersion,(float)$prob,json_encode($meta, JSON_UNESCAPED_UNICODE),$now]);
            $created++;
            $results[] = ["entity_id"=>$entityId, "probability"=>(float)$prob, "model_version"=>(string)$modelVersion];
        }

        return TemplateResponder::respond($response, ["tenant_id"=>$tenantId, "created"=>$created, "results"=>$results]);
    }

    public static function seed(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $now = gmdate('c');

        // Ensure one deployed model
        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM risk_model_registry")->fetchColumn();
        if ($cnt === 0) {
            $ins = $pdo->prepare("INSERT INTO risk_model_registry(model_name,model_version,is_deployed,metrics_json,training_range_json,created_at) VALUES(?,?,?,?,?,?)");
            $ins->execute(["risk_stub","v0",1,json_encode(["auc"=>0.72], JSON_UNESCAPED_UNICODE), json_encode(["start"=>"2025-01-01","end"=>"2025-12-31"], JSON_UNESCAPED_UNICODE),$now]);
        }

        // Demo connector health + ingestion runs
        $pdo->prepare("INSERT INTO connector_health(tenant_id,connector,status,last_run_at,failed_runs_24h,details_json,created_at) VALUES(?,?,?,?,?,?,?)")
            ->execute(["demo","meta_ads","ok",$now,0,json_encode(["note"=>"seed"], JSON_UNESCAPED_UNICODE),$now]);

        $pdo->prepare("INSERT INTO ingestion_run_log(tenant_id,connector,status,started_at,ended_at,rows_ingested,error,created_at) VALUES(?,?,?,?,?,?,?,?)")
            ->execute(["demo","meta_ads","success",$now,$now,123,null,$now]);

        // Subscription
        $subCnt = (int)$pdo->query("SELECT COUNT(*) FROM tenant_subscription WHERE tenant_id='demo'")->fetchColumn();
        if ($subCnt === 0) {
            $pdo->prepare("INSERT INTO tenant_subscription(tenant_id,plan_code,status,started_at,ends_at) VALUES(?,?,?,?,?)")
                ->execute(["demo","demo","active",$now,null]);
        }

        return TemplateResponder::respond($response, ["ok"=>true, "seeded_at"=>$now]);
    }

    public static function adminModels(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $rows = $pdo->query("SELECT * FROM risk_model_registry ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                "model_name" => $r["model_name"],
                "model_version" => $r["model_version"],
                "is_deployed" => (bool)$r["is_deployed"],
                "metrics" => $r["metrics_json"] ? json_decode($r["metrics_json"], true) : null,
                "training_range" => $r["training_range_json"] ? json_decode($r["training_range_json"], true) : null,
                "created_at" => $r["created_at"],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function adminPredictions(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $qp = $request->getQueryParams();
        $tenantId = self::tenantId($request); // [P0] query tenant_id 신뢰 제거 — auth_tenant 강제
        $limit = (int)($qp["limit"] ?? 50);
        if ($limit < 1) $limit = 50;
        $stmt = $pdo->prepare("SELECT * FROM risk_prediction WHERE tenant_id=? ORDER BY id DESC LIMIT ?");
        $stmt->bindValue(1, $tenantId, PDO::PARAM_STR);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                "entity_type" => $r["entity_type"],
                "entity_id" => $r["entity_id"],
                "model_version" => $r["model_version"],
                "probability" => (float)$r["probability"],
                "drivers" => $r["drivers_json"] ? json_decode($r["drivers_json"], true) : null,
                "predicted_at" => $r["predicted_at"],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function adminConnectorHealth(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $qp = $request->getQueryParams();
        $tenantId = self::tenantId($request); // [P0] query tenant_id 신뢰 제거 — auth_tenant 강제
        $stmt = $pdo->prepare("SELECT * FROM connector_health WHERE tenant_id=? ORDER BY id DESC");
        $stmt->execute([$tenantId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                "connector" => $r["connector"],
                "status" => $r["status"],
                "last_run_at" => $r["last_run_at"],
                "failed_runs_24h" => (int)$r["failed_runs_24h"],
                "details" => $r["details_json"] ? json_decode($r["details_json"], true) : null,
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function adminIngestionRuns(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $qp = $request->getQueryParams();
        $tenantId = self::tenantId($request); // [P0] query tenant_id 신뢰 제거 — auth_tenant 강제
        $limit = (int)($qp["limit"] ?? 50);
        if ($limit < 1) $limit = 50;
        $stmt = $pdo->prepare("SELECT * FROM ingestion_run_log WHERE tenant_id=? ORDER BY id DESC LIMIT ?");
        $stmt->bindValue(1, $tenantId, PDO::PARAM_STR);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                "connector" => $r["connector"],
                "status" => $r["status"],
                "started_at" => $r["started_at"],
                "ended_at" => $r["ended_at"],
                "rows_ingested" => (int)$r["rows_ingested"],
                "error" => $r["error"],
                "created_at" => $r["created_at"],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function adminBilling(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        // [P0 보안] tenant_subscription 전 테넌트 덤프 차단 — 호출 테넌트 구독만 노출.
        //   (플랫폼 admin 의 전 테넌트 뷰는 세션 기반 admin 게이트 /v423~426/admin/* 가 담당.)
        $tenantId = self::tenantId($request);
        $plans = $pdo->query("SELECT * FROM billing_plan ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
        $subStmt = $pdo->prepare("SELECT * FROM tenant_subscription WHERE tenant_id=? ORDER BY id DESC");
        $subStmt->execute([$tenantId]);
        $subs = $subStmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [
            "plans" => array_map(fn($p) => [
                "code"=>$p["code"],
                "name"=>$p["name"],
                "limits"=>$p["limits_json"] ? json_decode($p["limits_json"], true) : null,
                "is_active" => (bool)$p["is_active"],
                "created_at" => $p["created_at"],
            ], $plans),
            "subscriptions" => array_map(fn($s) => [
                "tenant_id"=>$s["tenant_id"],
                "plan_code"=>$s["plan_code"],
                "status"=>$s["status"],
                "started_at"=>$s["started_at"],
                "ends_at"=>$s["ends_at"],
            ], $subs),
        ];
        return TemplateResponder::respond($response, $out);
    }
}
