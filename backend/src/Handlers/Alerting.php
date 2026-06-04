<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class Alerting {

    /**
     * Keep presets as JSON so we don't accidentally introduce PHP array syntax errors
     * when syncing from the upstream (often JSON-shaped) registry.
     */
    private const PRESETS_JSON = '[
      {"id":"meta.pause_campaign","platform":"meta","action":"pause_campaign","http":{"method":"POST","path":"/{campaign_id}","query":{"status":"PAUSED"}},"placeholders":["campaign_id"],"notes":"Set campaign status to PAUSED via Marketing API campaign node."},
      {"id":"meta.budget_change","platform":"meta","action":"budget_change","http":{"method":"POST","path":"/{adset_id}","body":{"daily_budget":"{daily_budget}"}},"placeholders":["adset_id","daily_budget"],"notes":"Update ad set daily_budget (often ad set level)."},
      {"id":"google_ads.pause_campaign","platform":"google_ads","action":"pause_campaign","rpc":{"service":"CampaignService","method":"MutateCampaigns","update":{"status":"PAUSED"}},"placeholders":["customer_id","campaign_resource_name"],"notes":"Mutate campaign status to PAUSED."},
      {"id":"tiktok.pause_campaign","platform":"tiktok","action":"pause_campaign","http":{"method":"POST","path":"/open_api/v1.3/campaign/update/","body":{"campaign_id":"{campaign_id}","operation_status":"DISABLE"}},"placeholders":["campaign_id"],"notes":"Disable campaign delivery (operation_status)."},
      {"id":"amazon_ads.pause_campaign","platform":"amazon_ads","action":"pause_campaign","http":{"method":"PUT","path":"/{ad_type}/campaigns","body":[{"campaignId":"{campaign_id}","state":"paused"}]},"placeholders":["ad_type","campaign_id"],"notes":"Set campaign state paused (varies by sponsored ad type)."},
      {"id":"naver_searchad.pause_campaign","platform":"naver_searchad","action":"pause_campaign","http":{"method":"PUT","path":"/ncc/campaigns/{campaign_id}","body":{"userLock":true}},"placeholders":["campaign_id"],"notes":"Lock campaign (userLock) to pause delivery in SearchAd."},
      {"id":"coupang.modify_product","platform":"coupang","action":"modify_product","http":{"method":"PUT","path":"/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/{sellerProductId}","body":"{full_product_json}"},"placeholders":["sellerProductId","full_product_json"],"notes":"Modify product requires sending the full JSON body returned by query API."}
    ]';

    private static function audit(PDO $pdo, string $actor, string $action, array $details): void {
        $pdo->prepare("INSERT INTO audit_log(actor,action,details_json,created_at) VALUES(?,?,?,?)")
            ->execute([$actor,$action,json_encode($details, JSON_UNESCAPED_UNICODE),gmdate('c')]);
    }

    private static function actor(Request $request): string {
        $a = $request->getHeaderLine('X-User-Email');
        return $a !== '' ? $a : (string)($request->getQueryParams()['actor'] ?? 'unknown');
    }

    /** 요청에서 테넌트 식별 (auth 미들웨어 속성 > 헤더 > 기본). */
    private static function tenantOf(Request $request): string {
        $t = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($t === '') $t = $request->getHeaderLine('X-Tenant-Id');
        if ($t === '') $t = $request->getHeaderLine('X-Tenant-ID');
        return $t !== '' ? $t : 'demo';
    }

    public static function actionPresets(Request $request, Response $response, array $args): Response {
        $presets = json_decode(self::PRESETS_JSON, true);
        if (!is_array($presets)) $presets = [];
        return TemplateResponder::respond($response, $presets);
    }

    public static function listPolicies(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantOf($request);
        // 테넌트 격리: 본인 테넌트 + 레거시 NULL/'' (테넌트 도입 전 정책) 하위호환 노출
        $stmt = $pdo->prepare("SELECT * FROM alert_policy WHERE tenant_id = ? OR tenant_id IS NULL OR tenant_id = '' ORDER BY id DESC");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $p) {
            $payload = $p["policy_json"] ? json_decode($p["policy_json"], true) : [];
            $out[] = [
                "id" => (int)$p["id"],
                "name" => $p["name"],
                "is_enabled" => (bool)$p["is_enabled"],
                "dimension" => $p["dimension"],
                "severity" => $payload["severity"] ?? ($p["severity"] ?? "medium"),
                "condition_tree" => $payload["condition_tree"] ?? ["op"=>"AND","children"=>[["metric"=>$p["metric"],"op"=>$p["operator"],"threshold"=>(float)($p["threshold"] ?? 0)]]],
                "scope" => $payload["scope"] ?? new \stdClass(),
                "slack" => $payload["slack"] ?? ["enabled" => (bool)$p["notify_slack"], "channel" => $p["slack_channel"], "webhook_url" => $p["slack_webhook_url"]],
                "writeback" => $payload["writeback"] ?? ["enabled"=>false],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function createPolicy(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];

        $name = (string)($body["name"] ?? "Untitled");
        $enabled = (bool)($body["is_enabled"] ?? true);
        $dimension = (string)($body["dimension"] ?? "campaign");
        $severity = (string)($body["severity"] ?? "medium");

        // derive first condition for legacy fields
        $metric = null; $op = null; $thr = null;
        $ct = $body["condition_tree"] ?? null;
        $first = self::findFirstCondition($ct);
        if (is_array($first)) {
            $metric = $first["metric"] ?? null;
            $op = $first["op"] ?? null;
            $thr = $first["threshold"] ?? null;
        }

        $now = gmdate('c');
        $tenant = self::tenantOf($request);
        $pdo->prepare("INSERT INTO alert_policy(name,is_enabled,dimension,severity,metric,operator,threshold,policy_json,notify_slack,slack_channel,slack_webhook_url,tenant_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([
                $name,
                $enabled ? 1 : 0,
                $dimension,
                $severity,
                $metric,
                $op,
                is_null($thr) ? null : (float)$thr,
                json_encode($body, JSON_UNESCAPED_UNICODE),
                !empty(($body["slack"]["enabled"] ?? false)) ? 1 : 0,
                (string)($body["slack"]["channel"] ?? ""),
                (string)($body["slack"]["webhook_url"] ?? ""),
                $tenant,
                $now
            ]);
        $id = (int)$pdo->lastInsertId();
        self::audit($pdo, $actor, "policy_create", ["policy_id"=>$id, "name"=>$name]);

        return TemplateResponder::respond($response, ["ok"=>true, "id"=>$id]);
    }

    public static function updatePolicy(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["policy_id"] ?? 0);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];

        $name = (string)($body["name"] ?? "Untitled");
        $enabled = (bool)($body["is_enabled"] ?? true);
        $dimension = (string)($body["dimension"] ?? "campaign");
        $severity = (string)($body["severity"] ?? "medium");

        $metric = null; $op = null; $thr = null;
        $first = self::findFirstCondition($body["condition_tree"] ?? null);
        if (is_array($first)) {
            $metric = $first["metric"] ?? null;
            $op = $first["op"] ?? null;
            $thr = $first["threshold"] ?? null;
        }

        $tenant = self::tenantOf($request);
        // 테넌트 격리: 본인 테넌트 또는 레거시 NULL 정책만 수정 가능(수정 시 본인 테넌트로 귀속)
        $pdo->prepare("UPDATE alert_policy SET name=?, is_enabled=?, dimension=?, severity=?, metric=?, operator=?, threshold=?, policy_json=?, notify_slack=?, slack_channel=?, slack_webhook_url=?, tenant_id=? WHERE id=? AND (tenant_id=? OR tenant_id IS NULL OR tenant_id='')")
            ->execute([
                $name,
                $enabled ? 1 : 0,
                $dimension,
                $severity,
                $metric,
                $op,
                is_null($thr) ? null : (float)$thr,
                json_encode($body, JSON_UNESCAPED_UNICODE),
                !empty(($body["slack"]["enabled"] ?? false)) ? 1 : 0,
                (string)($body["slack"]["channel"] ?? ""),
                (string)($body["slack"]["webhook_url"] ?? ""),
                $tenant,
                $id,
                $tenant
            ]);

        self::audit($pdo, $actor, "policy_update", ["policy_id"=>$id, "name"=>$name]);
        return TemplateResponder::respond($response, ["ok"=>true, "id"=>$id]);
    }

    public static function deletePolicy(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["policy_id"] ?? 0);
        $tenant = self::tenantOf($request);
        $pdo->prepare("DELETE FROM alert_policy WHERE id=? AND (tenant_id=? OR tenant_id IS NULL OR tenant_id='')")
            ->execute([$id, $tenant]);
        self::audit($pdo, $actor, "policy_delete", ["policy_id"=>$id]);
        return TemplateResponder::respond($response, ["ok"=>true]);
    }

    /**
     * POST /v4xx/alerts/evaluate?window=daily|weekly
     * 활성 정책별로 실제 메트릭(performance_metrics)을 집계하여 condition_tree 임계조건을
     * 평가하고, 위반(breach)한 엔티티에 대해서만 alert_instance 를 생성한다. 위반 정책은
     * Slack/Email 로 통지한다. (스텁 — 무조건 alert 생성 — 을 대체)
     */
    public static function evaluate(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $tenant = self::tenantOf($request);
        $qp = $request->getQueryParams();
        $window = (string)($qp["window"] ?? "daily");

        $result = self::runEvaluation($pdo, $tenant, $window);

        self::audit($pdo, $actor, "alerts_evaluate", [
            "tenant" => $tenant,
            "window" => $window,
            "policies_evaluated" => $result["evaluated"],
            "created" => count($result["created"]),
            "notified" => $result["notified"],
        ]);
        return TemplateResponder::respond($response, $result["created"]);
    }

    /**
     * 핵심 평가 엔진 — HTTP 핸들러와 CLI cron(bin/alerts_cron.php)에서 공유.
     * @return array{created: array, evaluated: int, notified: int, window_from: string, window_to: string}
     */
    public static function runEvaluation(PDO $pdo, ?string $tenant, string $window): array {
        $tenant = ($tenant !== null && $tenant !== '') ? $tenant : 'demo';
        [$from, $to] = self::windowRange($pdo, $tenant, $window);

        // 본인 테넌트 + 레거시 NULL 정책(테넌트 도입 전)
        $stmt = $pdo->prepare("SELECT * FROM alert_policy WHERE is_enabled=1 AND (tenant_id=? OR tenant_id IS NULL OR tenant_id='') ORDER BY id DESC");
        $stmt->execute([$tenant]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $created = [];
        $notified = 0;

        foreach ($rows as $p) {
            $payload = $p["policy_json"] ? json_decode($p["policy_json"], true) : [];
            if (!is_array($payload)) $payload = [];
            $severity = (string)($payload["severity"] ?? ($p["severity"] ?? "medium"));
            $dimension = (string)($p["dimension"] ?? "channel");

            // condition_tree: policy_json 우선, 없으면 레거시 컬럼으로 단일 조건 합성
            $tree = $payload["condition_tree"] ?? null;
            if (!is_array($tree) || empty($tree)) {
                if ($p["metric"] === null || $p["metric"] === "") continue; // 평가할 조건 없음
                $tree = ["op"=>"AND","children"=>[[
                    "metric"=>(string)$p["metric"],
                    "op"=>(string)($p["operator"] ?? ">"),
                    "threshold"=>(float)($p["threshold"] ?? 0),
                ]]];
            }

            // 차원별 엔티티 메트릭 집계
            $agg = self::aggregateMetrics($pdo, $tenant, $from, $to, $dimension);

            foreach ($agg as $entity => $m) {
                $breaches = [];
                if (!self::evalConditionTree($tree, $m, $breaches)) continue; // 임계 미충족 → alert 없음

                // dedup: 동일 정책·엔티티·평가구간(to)에 이미 open alert 존재 시 skip
                if (self::hasOpenInstance($pdo, (int)$p["id"], (string)$entity, $to)) continue;

                $triggered = gmdate('c');
                $instPayload = [
                    "policy" => [
                        "id" => (int)$p["id"],
                        "name" => $p["name"],
                        "dimension" => $dimension,
                        "severity" => $severity,
                    ],
                    "tenant" => $tenant,
                    "entity" => (string)$entity,
                    "window" => $window,
                    "window_from" => $from,
                    "window_to" => $to,
                    "metrics" => self::roundMetrics($m),
                    "breaches" => $breaches,
                ];

                $pdo->prepare("INSERT INTO alert_instance(policy_id,`window`,status,payload_json,tenant_id,entity,created_at) VALUES(?,?,?,?,?,?,?)")
                    ->execute([(int)$p["id"], $window, "open", json_encode($instPayload, JSON_UNESCAPED_UNICODE), $tenant, (string)$entity, $triggered]);
                $aid = (int)$pdo->lastInsertId();

                // 통지 발송 (Slack / Email)
                $sent = self::dispatchNotifications($p, $payload, $window, (string)$entity, $severity, $breaches);
                if ($sent) { $notified++; }

                $created[] = [
                    "id" => $aid,
                    "policy_id" => (int)$p["id"],
                    "key" => (string)($payload["key"] ?? $p["name"]),
                    "entity" => (string)$entity,
                    "window" => $window,
                    "triggered_at" => $triggered,
                    "notified" => $sent,
                    "payload" => $instPayload,
                ];
            }
        }

        return [
            "created" => $created,
            "evaluated" => count($rows),
            "notified" => $notified,
            "window_from" => $from,
            "window_to" => $to,
        ];
    }

    /** 평가 기간 [from,to] (YYYY-MM-DD). 데이터의 최신 일자를 앵커로 삼아 윈도우를 산정. */
    private static function windowRange(PDO $pdo, string $tenant, string $window): array {
        // 테넌트 데이터의 최신 일자(시드/과거 데이터 대응). 없으면 오늘(UTC).
        $anchor = null;
        try {
            $st = $pdo->prepare("SELECT MAX(date) FROM performance_metrics WHERE tenant_id=?");
            $st->execute([$tenant]);
            $anchor = $st->fetchColumn();
        } catch (\Throwable $e) { $anchor = null; }
        if (!$anchor || !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$anchor)) {
            $anchor = gmdate('Y-m-d');
        }
        $days = ($window === 'weekly') ? 6 : (($window === 'monthly') ? 29 : 0);
        // UTC 일관 계산 (서버 로컬 TZ 와 무관하게 날짜 경계 고정)
        $anchorTs = strtotime((string)$anchor . ' 00:00:00 UTC');
        $from = gmdate('Y-m-d', $anchorTs - $days * 86400);
        $to   = gmdate('Y-m-d', $anchorTs);
        return [$from, $to];
    }

    /** 차원(dimension)별 엔티티 → 합산 메트릭 맵. */
    private static function aggregateMetrics(PDO $pdo, string $tenant, string $from, string $to, string $dimension): array {
        $colMap = [
            "channel"  => "channel",
            "team"     => "team",
            "account"  => "account",
            "campaign" => "account", // performance_metrics 엔 campaign_id 없음 → account 프록시
        ];
        $groupCol = $colMap[$dimension] ?? null;

        if ($groupCol === null) {
            // 차원 미지정/미지원 → 테넌트 전체 단일 집계
            $sql = "SELECT 'ALL' AS entity,
                      SUM(impressions) AS impressions, SUM(clicks) AS clicks,
                      SUM(spend) AS spend, SUM(conversions) AS conversions, SUM(revenue) AS revenue
                    FROM performance_metrics
                    WHERE tenant_id=? AND date BETWEEN ? AND ?";
            $st = $pdo->prepare($sql);
            $st->execute([$tenant, $from, $to]);
        } else {
            $sql = "SELECT {$groupCol} AS entity,
                      SUM(impressions) AS impressions, SUM(clicks) AS clicks,
                      SUM(spend) AS spend, SUM(conversions) AS conversions, SUM(revenue) AS revenue
                    FROM performance_metrics
                    WHERE tenant_id=? AND date BETWEEN ? AND ?
                    GROUP BY {$groupCol}";
            $st = $pdo->prepare($sql);
            $st->execute([$tenant, $from, $to]);
        }

        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $entity = (string)($r["entity"] ?? 'ALL');
            if ($entity === '') $entity = 'ALL';
            $out[$entity] = self::deriveMetrics([
                "impressions" => (float)($r["impressions"] ?? 0),
                "clicks"      => (float)($r["clicks"] ?? 0),
                "spend"       => (float)($r["spend"] ?? 0),
                "conversions" => (float)($r["conversions"] ?? 0),
                "revenue"     => (float)($r["revenue"] ?? 0),
            ]);
        }
        return $out;
    }

    /** 원시 합산값에서 파생 메트릭(roas/ctr/cpa/cpc/aov/cvr) 계산. */
    private static function deriveMetrics(array $b): array {
        $imp = $b["impressions"]; $clk = $b["clicks"]; $spd = $b["spend"];
        $cnv = $b["conversions"]; $rev = $b["revenue"];
        $b["roas"] = $spd > 0 ? $rev / $spd : 0.0;             // 광고수익률
        $b["ctr"]  = $imp > 0 ? ($clk / $imp) * 100 : 0.0;     // 클릭률(%)
        $b["cpa"]  = $cnv > 0 ? $spd / $cnv : 0.0;             // 전환당비용
        $b["cpc"]  = $clk > 0 ? $spd / $clk : 0.0;             // 클릭당비용
        $b["aov"]  = $cnv > 0 ? $rev / $cnv : 0.0;             // 객단가
        $b["cvr"]  = $clk > 0 ? ($cnv / $clk) * 100 : 0.0;     // 전환율(%)
        return $b;
    }

    private static function roundMetrics(array $m): array {
        $out = [];
        foreach ($m as $k => $v) { $out[$k] = is_float($v) ? round($v, 4) : $v; }
        return $out;
    }

    /** condition_tree 재귀 평가. 위반한 leaf 는 $breaches 에 누적. */
    private static function evalConditionTree($node, array $m, array &$breaches): bool {
        if (!is_array($node)) return false;

        // leaf: metric 키 보유
        if (array_key_exists("metric", $node)) {
            $metric = (string)$node["metric"];
            $op = (string)($node["op"] ?? $node["operator"] ?? ">");
            $thr = (float)($node["threshold"] ?? 0);
            if (!array_key_exists($metric, $m)) return false; // 알 수 없는 메트릭 → 미충족
            $val = (float)$m[$metric];
            $hit = self::compareOp($val, $op, $thr);
            if ($hit) {
                $breaches[] = ["metric"=>$metric, "op"=>$op, "threshold"=>$thr, "value"=>round($val, 4)];
            }
            return $hit;
        }

        // branch: AND/OR + children
        $logic = strtoupper((string)($node["op"] ?? $node["logic"] ?? "AND"));
        $children = $node["children"] ?? [];
        if (!is_array($children) || empty($children)) return false;

        if ($logic === "OR") {
            $any = false;
            foreach ($children as $c) { if (self::evalConditionTree($c, $m, $breaches)) $any = true; }
            return $any;
        }
        // 기본 AND: 모든 자식 충족해야 true (단, breach 기록은 충족 leaf만)
        foreach ($children as $c) {
            if (!self::evalConditionTree($c, $m, $breaches)) return false;
        }
        return true;
    }

    /** 비교 연산자 정규화 후 평가. */
    private static function compareOp(float $val, string $op, float $thr): bool {
        $map = ['lt'=>'<','lte'=>'<=','gt'=>'>','gte'=>'>=','eq'=>'==','ne'=>'!=',
                'less_than'=>'<','greater_than'=>'>','='=>'=='];
        $op = $map[$op] ?? $op;
        switch ($op) {
            case '<':  return $val <  $thr;
            case '<=': return $val <= $thr;
            case '>':  return $val >  $thr;
            case '>=': return $val >= $thr;
            case '==': return abs($val - $thr) < 1e-9;
            case '!=': return abs($val - $thr) >= 1e-9;
            default:   return false;
        }
    }

    /** 동일 정책·엔티티·평가구간(window_to)에 이미 open alert 존재 여부(dedup). */
    private static function hasOpenInstance(PDO $pdo, int $policyId, string $entity, string $windowTo): bool {
        try {
            $st = $pdo->prepare("SELECT payload_json FROM alert_instance WHERE policy_id=? AND status='open' AND entity=? ORDER BY id DESC LIMIT 20");
            $st->execute([$policyId, $entity]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $pj = $r["payload_json"] ? json_decode($r["payload_json"], true) : [];
                if (is_array($pj) && (string)($pj["window_to"] ?? '') === $windowTo) return true;
            }
        } catch (\Throwable $e) { /* entity 컬럼 부재 등 → dedup 생략 */ }
        return false;
    }

    /** 정책 통지 설정에 따라 Slack/Email 발송. 하나라도 성공 시 true. */
    private static function dispatchNotifications(array $p, array $payload, string $window, string $entity, string $severity, array $breaches): bool {
        $sent = false;
        $policyMeta = ["id"=>(int)$p["id"], "name"=>(string)$p["name"]];
        $extraFields = self::breachFields($entity, $breaches);

        // Slack — policy_json.slack 우선, 레거시 컬럼 fallback
        $slackCfg = is_array($payload["slack"] ?? null) ? $payload["slack"] : [];
        $slackEnabled = (bool)($slackCfg["enabled"] ?? ((int)($p["notify_slack"] ?? 0) === 1));
        $webhook = (string)($slackCfg["webhook_url"] ?? ($p["slack_webhook_url"] ?? ""));
        if ($slackEnabled && $webhook !== '') {
            $text = "🚨 [{$p['name']}] {$entity} — 임계 초과 (" . count($breaches) . "건)";
            if (self::sendSlack($webhook, $text, self::buildSlackBlocks($policyMeta, $window, $severity, $extraFields))) {
                $sent = true;
            }
        }

        // Email — policy_json.email.{enabled,to}
        $emailCfg = is_array($payload["email"] ?? null) ? $payload["email"] : [];
        $emailTo = (string)($emailCfg["to"] ?? "");
        if ((bool)($emailCfg["enabled"] ?? false) && $emailTo !== '') {
            $subject = "[Geniego-ROI] 알림: {$p['name']} ({$entity})";
            if (self::sendEmail($emailTo, $subject, self::buildEmailHtml($policyMeta, $window, $severity, $extraFields))) {
                $sent = true;
            }
        }
        return $sent;
    }

    /** breach 목록을 Slack/Email 표시용 필드 배열로 변환. */
    private static function breachFields(string $entity, array $breaches): array {
        $fields = [["label"=>"대상", "value"=>$entity]];
        foreach ($breaches as $b) {
            $fields[] = [
                "label" => (string)($b["metric"] ?? "metric"),
                "value" => self::fmtNum($b["value"] ?? 0) . " (기준 " . (string)($b["op"] ?? "") . " " . self::fmtNum($b["threshold"] ?? 0) . ")",
            ];
        }
        return $fields;
    }

    private static function fmtNum($n): string {
        $f = (float)$n;
        return (abs($f - round($f)) < 1e-9) ? (string)(int)round($f) : (string)round($f, 2);
    }

    public static function listAlerts(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $rows = $pdo->query("SELECT * FROM alert_instance ORDER BY id DESC LIMIT 500")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $payload = $r["payload_json"] ? json_decode($r["payload_json"], true) : [];
            $key = (string)($payload["policy"]["name"] ?? "alert");
            $out[] = [
                "id" => (int)$r["id"],
                "policy_id" => (int)$r["policy_id"],
                "key" => $key,
                "window" => $r["window"],
                "triggered_at" => $r["created_at"],
                "payload" => $payload,
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function listActionRequests(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $limit = (int)($request->getQueryParams()["limit"] ?? 500);
        if ($limit < 1) $limit = 500;
        $stmt = $pdo->prepare("SELECT * FROM action_request ORDER BY id DESC LIMIT ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $action = $r["action_json"] ? json_decode($r["action_json"], true) : [];
            $approvals = $r["approvals_json"] ? json_decode($r["approvals_json"], true) : [];
            $out[] = [
                "id" => (int)$r["id"],
                "alert_instance_id" => (int)($action["alert_instance_id"] ?? 0),
                "policy_id" => (int)($r["policy_id"] ?? 0),
                "status" => $r["status"],
                "action_type" => (string)($action["type"] ?? ($action["action_type"] ?? "writeback")),
                "payload" => $action,
                "required_approvals" => 2,
                "approvals" => is_array($approvals) ? $approvals : [],
                "dry_run_diff" => $action["dry_run_diff"] ?? null,
                "rollback_plan" => $action["rollback_plan"] ?? null,
                "created_at" => $r["created_at"],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function decideAction(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["id"] ?? 0);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $decision = (string)($body["decision"] ?? "approve");

        $row = $pdo->prepare("SELECT approvals_json, status FROM action_request WHERE id=?");
        $row->execute([$id]);
        $r = $row->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            $response->getBody()->write(json_encode(["detail"=>"action_request not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }
        $approvals = $r["approvals_json"] ? json_decode($r["approvals_json"], true) : [];
        if (!is_array($approvals)) $approvals = [];
        $approvals[] = ["actor"=>$actor, "decision"=>$decision, "ts"=>gmdate('c')];

        $status = $decision === "approve" ? "approved" : "rejected";
        $pdo->prepare("UPDATE action_request SET approvals_json=?, status=? WHERE id=?")
            ->execute([json_encode($approvals, JSON_UNESCAPED_UNICODE), $status, $id]);

        self::audit($pdo, $actor, "action_decide", ["id"=>$id, "decision"=>$decision]);
        return TemplateResponder::respond($response, ["ok"=>true, "id"=>$id, "status"=>$status]);
    }

    public static function executeAction(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["id"] ?? 0);

        $pdo->prepare("UPDATE action_request SET status=? WHERE id=?")->execute(["executed",$id]);
        self::audit($pdo, $actor, "action_execute", ["id"=>$id]);

        return TemplateResponder::respond($response, ["ok"=>true, "id"=>$id, "status"=>"executed"]);
    }

    public static function auditLogs(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $limit = (int)($request->getQueryParams()["limit"] ?? 800);
        if ($limit < 1) $limit = 800;
        $stmt = $pdo->prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                "id" => (int)$r["id"],
                "actor" => $r["actor"],
                "action" => $r["action"],
                "details" => $r["details_json"] ? json_decode($r["details_json"], true) : null,
                "created_at" => $r["created_at"],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    private static function findFirstCondition(mixed $node): ?array {
        if (is_array($node) && array_key_exists("metric", $node)) return $node;
        if (is_array($node) && isset($node["children"]) && is_array($node["children"])) {
            foreach ($node["children"] as $c) {
                $r = self::findFirstCondition($c);
                if ($r) return $r;
            }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    //  알림 발송 — Slack Webhook + 이메일
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Slack Webhook 발송
     * $webhookUrl: https://hooks.slack.com/services/...
     * $blocks: Slack Block Kit 배열 또는 null (text fallback)
     */
    private static function sendSlack(string $webhookUrl, string $text, array $blocks = []): bool
    {
        if ($webhookUrl === '') return false;

        $payload = ['text' => $text];
        if (!empty($blocks)) {
            $payload['blocks'] = $blocks;
        }

        $ch = curl_init($webhookUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        return $err === '' && $code === 200;
    }

    /**
     * Slack Block Kit 메시지 생성
     */
    private static function buildSlackBlocks(array $policy, string $window, string $severity, array $extraFields = []): array
    {
        $emojiMap = ['critical' => '🚨', 'high' => '⚠️', 'medium' => '⚡', 'low' => 'ℹ️'];
        $emoji = $emojiMap[$severity] ?? '⚡';
        $color = ['critical' => '#FF0000', 'high' => '#FF6600', 'medium' => '#FFAA00', 'low' => '#0099FF'][$severity] ?? '#888888';

        $fields = [
            ['type' => 'mrkdwn', 'text' => "*심각도*\n{$severity}"],
            ['type' => 'mrkdwn', 'text' => "*집계 주기*\n{$window}"],
            ['type' => 'mrkdwn', 'text' => "*정책 ID*\n#{$policy['id']}"],
            ['type' => 'mrkdwn', 'text' => "*발생 시각*\n" . date('Y-m-d H:i:s')],
        ];
        // 위반 메트릭/대상 등 동적 필드 (Slack section fields 최대 10개)
        foreach (array_slice($extraFields, 0, 6) as $f) {
            $label = (string)($f['label'] ?? '');
            $value = (string)($f['value'] ?? '');
            $fields[] = ['type' => 'mrkdwn', 'text' => "*{$label}*\n{$value}"];
        }

        return [
            [
                'type' => 'header',
                'text' => ['type' => 'plain_text', 'text' => "{$emoji} Geniego-ROI 알림: {$policy['name']}"],
            ],
            [
                'type' => 'section',
                'fields' => $fields,
            ],
            [
                'type' => 'actions',
                'elements' => [[
                    'type' => 'button',
                    'text' => ['type' => 'plain_text', 'text' => '대응 화면 열기'],
                    'url'  => 'https://roi.genie-go.com/alert-policies',
                    'style' => 'danger',
                ]],
            ],
        ];
    }

    /**
     * 이메일 발송 (PHP mail() — 서버에 sendmail/postfix 필요)
     * SMTP 환경변수: SMTP_FROM (발신자 이메일)
     */
    private static function sendEmail(string $to, string $subject, string $html): bool
    {
        if ($to === '') return false;
        $from = (string)(getenv('SMTP_FROM') ?: 'noreply@roi.genie-go.com');
        $headers  = "From: Geniego-ROI <{$from}>\r\n";
        $headers .= "Reply-To: {$from}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        return @mail($to, $subject, $html, $headers);
    }

    /**
     * HTML 이메일 본문 생성
     */
    private static function buildEmailHtml(array $policy, string $window, string $severity, array $extraFields = []): string
    {
        $color = ['critical' => '#c0392b', 'high' => '#e67e22', 'medium' => '#f39c12', 'low' => '#2980b9'][$severity] ?? '#555';
        // heredoc 내부는 복합식(삼항) 불가 → 발생시각을 미리 계산해 단순 변수로 보간
        $occurredAt = !empty($_SERVER['REQUEST_TIME']) ? date('Y-m-d H:i:s') : gmdate('Y-m-d H:i:s');
        // 위반 메트릭/대상 동적 행 (XSS 방지: htmlspecialchars)
        $extraRows = '';
        foreach ($extraFields as $f) {
            $label = htmlspecialchars((string)($f['label'] ?? ''), ENT_QUOTES, 'UTF-8');
            $value = htmlspecialchars((string)($f['value'] ?? ''), ENT_QUOTES, 'UTF-8');
            $extraRows .= "<tr><td style=\"color:#666;padding:8px 0\">{$label}</td><td style=\"font-weight:bold\">{$value}</td></tr>";
        }
        return <<<HTML
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:{$color};color:white;padding:20px">
      <h2 style="margin:0">⚠️ Geniego-ROI 알림 발생</h2>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#666;padding:8px 0">정책명</td><td style="font-weight:bold">{$policy['name']}</td></tr>
        <tr><td style="color:#666;padding:8px 0">심각도</td><td><span style="background:{$color};color:white;padding:2px 8px;border-radius:4px">{$severity}</span></td></tr>
        <tr><td style="color:#666;padding:8px 0">집계 주기</td><td>{$window}</td></tr>
        <tr><td style="color:#666;padding:8px 0">발생 시각</td><td>{$occurredAt}</td></tr>
        {$extraRows}
      </table>
      <div style="margin-top:24px">
        <a href="https://roi.genie-go.com/alert-policies" style="background:#667eea;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">대응 화면 열기</a>
      </div>
    </div>
  </div>
</body>
</html>
HTML;
    }

    /**
     * POST /v423/alerts/test-notify
     * Body: { policy_id, channel: "slack"|"email", target: "웹훅URL 또는 이메일" }
     * 테스트 알림 발송
     */
    public static function testNotify(Request $request, Response $response, array $args): Response {
        $body    = (array)($request->getParsedBody() ?? []);
        $channel = (string)($body['channel'] ?? 'slack');
        $target  = (string)($body['target']  ?? '');
        $policyId = (int)($body['policy_id'] ?? 0);

        $mockPolicy = ['id' => $policyId ?: 0, 'name' => '테스트 알림 정책'];
        $ok = false; $detail = '';

        if ($channel === 'slack') {
            if ($target === '') {
                return TemplateResponder::respond($response->withStatus(422), ['error' => 'target(webhook_url) required']);
            }
            $ok = self::sendSlack(
                $target,
                '✅ Geniego-ROI 알림 테스트 — 정상 수신되었습니다!',
                self::buildSlackBlocks($mockPolicy, 'daily', 'medium')
            );
            $detail = $ok ? 'Slack 메시지 발송 성공' : 'Slack 발송 실패 (웹훅 URL 확인)';
        } elseif ($channel === 'email') {
            if ($target === '') {
                return TemplateResponder::respond($response->withStatus(422), ['error' => 'target(email) required']);
            }
            $ok = self::sendEmail(
                $target,
                '[Geniego-ROI] 알림 테스트 이메일',
                self::buildEmailHtml($mockPolicy, 'daily', 'medium')
            );
            $detail = $ok ? '이메일 발송 성공' : '이메일 발송 실패 (서버 메일 설정 확인)';
        } else {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'channel must be slack or email']);
        }

        return TemplateResponder::respond($response, [
            'ok'     => $ok,
            'channel'=> $channel,
            'target' => substr($target, 0, 30) . (strlen($target) > 30 ? '...' : ''),
            'detail' => $detail,
        ]);
    }
}
