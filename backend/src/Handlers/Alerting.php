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

    public static function actionPresets(Request $request, Response $response, array $args): Response {
        $presets = json_decode(self::PRESETS_JSON, true);
        if (!is_array($presets)) $presets = [];
        return TemplateResponder::respond($response, $presets);
    }

    public static function listPolicies(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $rows = $pdo->query("SELECT * FROM alert_policy ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
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
        $pdo->prepare("INSERT INTO alert_policy(name,is_enabled,dimension,severity,metric,operator,threshold,policy_json,notify_slack,slack_channel,slack_webhook_url,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
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

        $pdo->prepare("UPDATE alert_policy SET name=?, is_enabled=?, dimension=?, severity=?, metric=?, operator=?, threshold=?, policy_json=?, notify_slack=?, slack_channel=?, slack_webhook_url=? WHERE id=?")
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
                $id
            ]);

        self::audit($pdo, $actor, "policy_update", ["policy_id"=>$id, "name"=>$name]);
        return TemplateResponder::respond($response, ["ok"=>true, "id"=>$id]);
    }

    public static function deletePolicy(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["policy_id"] ?? 0);
        $pdo->prepare("DELETE FROM alert_policy WHERE id=?")->execute([$id]);
        self::audit($pdo, $actor, "policy_delete", ["policy_id"=>$id]);
        return TemplateResponder::respond($response, ["ok"=>true]);
    }

    public static function evaluate(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $qp = $request->getQueryParams();
        $window = (string)($qp["window"] ?? "daily");
        $rows = $pdo->query("SELECT * FROM alert_policy WHERE is_enabled=1 ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);

        $created = [];
        foreach ($rows as $p) {
            $payload = $p["policy_json"] ? json_decode($p["policy_json"], true) : [];
            $key = (string)($payload["key"] ?? $p["name"]);
            $triggered = gmdate('c');
            $instPayload = [
                "policy" => [
                    "id" => (int)$p["id"],
                    "name" => $p["name"],
                    "dimension" => $p["dimension"],
                    "severity" => $payload["severity"] ?? ($p["severity"] ?? "medium"),
                ],
                "window" => $window,
                "note" => "stub evaluation (no metric computation in PHP port)",
            ];

            $pdo->prepare("INSERT INTO alert_instance(policy_id,window,status,payload_json,created_at) VALUES(?,?,?,?,?)")
                ->execute([(int)$p["id"], $window, "open", json_encode($instPayload, JSON_UNESCAPED_UNICODE), $triggered]);
            $aid = (int)$pdo->lastInsertId();

            $created[] = [
                "id" => $aid,
                "policy_id" => (int)$p["id"],
                "key" => $key,
                "window" => $window,
                "triggered_at" => $triggered,
                "payload" => $instPayload,
            ];
        }

        self::audit($pdo, $actor, "alerts_evaluate", ["window"=>$window, "created"=>count($created)]);
        return TemplateResponder::respond($response, $created);
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
    private static function buildSlackBlocks(array $policy, string $window, string $severity): array
    {
        $emojiMap = ['critical' => '🚨', 'high' => '⚠️', 'medium' => '⚡', 'low' => 'ℹ️'];
        $emoji = $emojiMap[$severity] ?? '⚡';
        $color = ['critical' => '#FF0000', 'high' => '#FF6600', 'medium' => '#FFAA00', 'low' => '#0099FF'][$severity] ?? '#888888';

        return [
            [
                'type' => 'header',
                'text' => ['type' => 'plain_text', 'text' => "{$emoji} Geniego-ROI 알림: {$policy['name']}"],
            ],
            [
                'type' => 'section',
                'fields' => [
                    ['type' => 'mrkdwn', 'text' => "*심각도*\n{$severity}"],
                    ['type' => 'mrkdwn', 'text' => "*집계 주기*\n{$window}"],
                    ['type' => 'mrkdwn', 'text' => "*정책 ID*\n#{$policy['id']}"],
                    ['type' => 'mrkdwn', 'text' => "*발생 시각*\n" . date('Y-m-d H:i:s')],
                ],
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
    private static function buildEmailHtml(array $policy, string $window, string $severity): string
    {
        $color = ['critical' => '#c0392b', 'high' => '#e67e22', 'medium' => '#f39c12', 'low' => '#2980b9'][$severity] ?? '#555';
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
        <tr><td style="color:#666;padding:8px 0">발생 시각</td><td>{$_SERVER['REQUEST_TIME'] ? date('Y-m-d H:i:s') : gmdate('Y-m-d H:i:s')}</td></tr>
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
