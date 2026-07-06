<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class Mapping {

    /** [P1 보안] 테넌트 격리 — 미들웨어 auth_tenant(위조불가) 강제. 미해결은 demo 격리(fail-closed). */
    private static function tenantId(Request $request): string {
        $auth = (string)($request->getAttribute('auth_tenant') ?? '');
        if ($auth !== '') return $auth;
        $t = UserAuth::authedTenant($request);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function actor(Request $request): string {
        $a = $request->getHeaderLine('X-User-Email');
        return $a !== '' ? $a : 'unknown';
    }

    private static function audit(PDO $pdo, string $actor, string $action, array $details): void {
        $pdo->prepare("INSERT INTO audit_log(actor,action,details_json,created_at) VALUES(?,?,?,?)")
            ->execute([$actor,$action,json_encode($details, JSON_UNESCAPED_UNICODE),gmdate('c')]);
    }

    public static function listMappings(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $qp = $request->getQueryParams();
        $platform = $qp["platform"] ?? null;
        $field = $qp["field"] ?? null;

        $sql = "SELECT * FROM mapping_entry WHERE tenant_id=?";
        $params = [$tenant];
        if ($platform !== null) { $sql .= " AND platform=?"; $params[] = $platform; }
        if ($field !== null) { $sql .= " AND field=?"; $params[] = $field; }
        $sql .= " ORDER BY id DESC LIMIT 500";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                "id" => (int)$r["id"],
                "platform" => $r["platform"],
                "field" => $r["field"],
                "raw_value" => $r["raw_value"],
                "canonical_value" => $r["canonical_value"],
                "note" => $r["note"],
                "created_at" => $r["created_at"],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function upsertMapping(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];

        $platform = (string)($body["platform"] ?? "");
        $field = (string)($body["field"] ?? "");
        $raw = (string)($body["raw_value"] ?? "");
        $canon = (string)($body["canonical_value"] ?? "");
        $note = (string)($body["note"] ?? "");
        $now = gmdate('c');

        $stmt = $pdo->prepare("SELECT id FROM mapping_entry WHERE tenant_id=? AND platform=? AND field=? AND raw_value=? LIMIT 1");
        $stmt->execute([$tenant,$platform,$field,$raw]);
        $id = $stmt->fetchColumn();

        if ($id) {
            $pdo->prepare("UPDATE mapping_entry SET canonical_value=?, note=? WHERE id=? AND tenant_id=?")
                ->execute([$canon, $note, $id, $tenant]);
            $mid = (int)$id;
        } else {
            $pdo->prepare("INSERT INTO mapping_entry(tenant_id,platform,field,raw_value,canonical_value,note,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant,$platform,$field,$raw,$canon,$note,$now]);
            $mid = (int)$pdo->lastInsertId();
        }

        self::audit($pdo, $actor, "mapping_upsert", ["id"=>$mid,"platform"=>$platform,"field"=>$field,"raw_value"=>$raw,"canonical_value"=>$canon]);

        return TemplateResponder::respond($response, [
            "id"=>$mid,"platform"=>$platform,"field"=>$field,"raw_value"=>$raw,"canonical_value"=>$canon,"note"=>$note,"created_at"=>$now
        ]);
    }

    public static function updateMapping(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $id = (int)($args["mapping_id"] ?? 0);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];

        $canon = $body["canonical_value"] ?? null;
        $note = $body["note"] ?? null;

        $stmt = $pdo->prepare("SELECT * FROM mapping_entry WHERE id=? AND tenant_id=?");
        $stmt->execute([$id,$tenant]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $response->getBody()->write(json_encode(["detail"=>"mapping not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }

        $newCanon = $canon !== null ? (string)$canon : (string)$row["canonical_value"];
        $newNote = $note !== null ? (string)$note : (string)($row["note"] ?? "");

        $pdo->prepare("UPDATE mapping_entry SET canonical_value=?, note=? WHERE id=? AND tenant_id=?")->execute([$newCanon,$newNote,$id,$tenant]);

        self::audit($pdo, $actor, "mapping_update", ["id"=>$id]);

        return TemplateResponder::respond($response, [
            "id"=>$id,
            "platform"=>$row["platform"],
            "field"=>$row["field"],
            "raw_value"=>$row["raw_value"],
            "canonical_value"=>$newCanon,
            "note"=>$newNote,
            "created_at"=>$row["created_at"],
        ]);
    }

    public static function deleteMapping(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $id = (int)($args["mapping_id"] ?? 0);
        $pdo->prepare("DELETE FROM mapping_entry WHERE id=? AND tenant_id=?")->execute([$id,$tenant]);
        self::audit($pdo, $actor, "mapping_delete", ["id"=>$id]);
        return TemplateResponder::respond($response, ["deleted"=>true]);
    }

    public static function propose(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];

        $platform = (string)($body["platform"] ?? "");
        $field = (string)($body["field"] ?? "");
        $raw = (string)($body["raw_value"] ?? "");
        $canon = (string)($body["canonical_value"] ?? "");
        $note = (string)($body["note"] ?? "");
        $now = gmdate('c');

        // basic validation
        [$ok, $errs] = self::validateValue($pdo, $tenant, $field, $canon);
        if (!$ok) {
            $response->getBody()->write(json_encode(["detail"=>implode(", ", $errs)], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(400)->withHeader('Content-Type','application/json');
        }

        $pdo->prepare("INSERT INTO mapping_change_request(tenant_id,platform,field,raw_value,canonical_value,note,status,requested_by,approvals_json,required_approvals,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
            ->execute([$tenant,$platform,$field,$raw,$canon,$note,"pending",$actor,json_encode([], JSON_UNESCAPED_UNICODE),2,$now]);
        $id = (int)$pdo->lastInsertId();

        self::audit($pdo, $actor, "mapping_propose", ["id"=>$id]);

        return TemplateResponder::respond($response, self::getChangeRequest($pdo, $tenant, $id));
    }

    public static function listProposals(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $qp = $request->getQueryParams();
        $status = $qp["status"] ?? null;

        $sql = "SELECT * FROM mapping_change_request WHERE tenant_id=?";
        $params = [$tenant];
        if ($status !== null) { $sql .= " AND status=?"; $params[] = $status; }
        $sql .= " ORDER BY id DESC LIMIT 500";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $r) $out[] = self::rowToChangeRequest($r);
        return TemplateResponder::respond($response, $out);
    }

    public static function approve(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $id = (int)($args["req_id"] ?? 0);

        $row = $pdo->prepare("SELECT * FROM mapping_change_request WHERE id=? AND tenant_id=?");
        $row->execute([$id,$tenant]);
        $r = $row->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            $response->getBody()->write(json_encode(["detail"=>"proposal not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }

        $approvals = $r["approvals_json"] ? json_decode($r["approvals_json"], true) : [];
        if (!is_array($approvals)) $approvals = [];
        $approvals[] = ["user"=>$actor, "ts"=>gmdate('c')];

        $status = count($approvals) >= (int)$r["required_approvals"] ? "approved" : "pending";
        $pdo->prepare("UPDATE mapping_change_request SET approvals_json=?, status=? WHERE id=? AND tenant_id=?")
            ->execute([json_encode($approvals, JSON_UNESCAPED_UNICODE), $status, $id, $tenant]);

        self::audit($pdo, $actor, "mapping_approve", ["id"=>$id,"status"=>$status]);

        return TemplateResponder::respond($response, self::getChangeRequest($pdo, $tenant, $id));
    }

    public static function apply(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $id = (int)($args["req_id"] ?? 0);

        $row = $pdo->prepare("SELECT * FROM mapping_change_request WHERE id=? AND tenant_id=?");
        $row->execute([$id,$tenant]);
        $r = $row->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            $response->getBody()->write(json_encode(["detail"=>"proposal not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }
        if ($r["status"] !== "approved") {
            $response->getBody()->write(json_encode(["detail"=>"proposal not approved"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(400)->withHeader('Content-Type','application/json');
        }

        // Apply to registry (upsert) — 동일 테넌트 스코프로만 적용/갱신
        $now = gmdate('c');
        $stmt = $pdo->prepare("SELECT id FROM mapping_entry WHERE tenant_id=? AND platform=? AND field=? AND raw_value=? LIMIT 1");
        $stmt->execute([$tenant,$r["platform"],$r["field"],$r["raw_value"]]);
        $mid = $stmt->fetchColumn();
        if ($mid) {
            $pdo->prepare("UPDATE mapping_entry SET canonical_value=?, note=? WHERE id=? AND tenant_id=?")
                ->execute([$r["canonical_value"], $r["note"], $mid, $tenant]);
        } else {
            $pdo->prepare("INSERT INTO mapping_entry(tenant_id,platform,field,raw_value,canonical_value,note,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant,$r["platform"],$r["field"],$r["raw_value"],$r["canonical_value"],$r["note"],$now]);
        }

        $pdo->prepare("UPDATE mapping_change_request SET status=? WHERE id=? AND tenant_id=?")->execute(["applied",$id,$tenant]);
        self::audit($pdo, $actor, "mapping_apply", ["id"=>$id]);

        return TemplateResponder::respond($response, self::getChangeRequest($pdo, $tenant, $id));
    }

    public static function impactPreview(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $platform = (string)($body["platform"] ?? "");
        $field = (string)($body["field"] ?? "");
        $raw = (string)($body["raw_value"] ?? "");
        $newCanon = (string)($body["new_canonical"] ?? "");

        // [266차] 스텁 제거 — 정규화 정본 테이블(normalized_activity_event)에서 이 raw_value 를 쓰는
        //   실제 행수를 테넌트 스코프로 카운트(재캐노니컬라이즈 영향 추정). field 는 SQL 주입 차단 위해 화이트리스트.
        $tenant = (string)($request->getAttribute('auth_tenant') ?? '');
        $COLMAP = [ // 매핑 field → normalized_activity_event 실컬럼
            'vendor'=>'vendor', 'channel'=>'channel', 'campaign'=>'campaign_name', 'campaign_name'=>'campaign_name',
            'adset'=>'adset_name', 'adset_name'=>'adset_name', 'keyword'=>'keyword',
            'audience'=>'audience_segment', 'audience_segment'=>'audience_segment', 'sku'=>'sku',
        ];
        $col = $COLMAP[strtolower($field)] ?? null;
        $rows = 0; $note = "정규화 정본(normalized_activity_event) 기준 추정";
        if ($col !== null && $tenant !== '' && $raw !== '') {
            try {
                $st = $pdo->prepare("SELECT COUNT(*) FROM normalized_activity_event WHERE tenant_id=? AND $col=?");
                $st->execute([$tenant, $raw]);
                $rows = (int)$st->fetchColumn();
            } catch (\Throwable $e) { $note = "카운트 불가(스키마/권한) — 적용은 가능"; }
        } elseif ($col === null) {
            $note = "지원하지 않는 필드(vendor/channel/campaign/adset/keyword/audience/sku) — 영향 추정 생략";
        }
        $out = [
            "platform"=>$platform,
            "field"=>$field,
            "raw_value"=>$raw,
            "new_canonical"=>$newCanon,
            "estimated_impacted_rows"=>$rows,
            "notes"=>[$note],
        ];
        return TemplateResponder::respond($response, $out);
    }

    public static function validate(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $field = (string)($body["field"] ?? "");
        $canon = (string)($body["canonical_value"] ?? "");

        [$ok, $errs] = self::validateValue($pdo, $tenant, $field, $canon);
        return TemplateResponder::respond($response, ["ok"=>$ok, "errors"=>$errs]);
    }

    private static function validateValue(PDO $pdo, string $tenant, string $field, string $canon): array {
        $stmt = $pdo->prepare("SELECT * FROM mapping_validation_rule WHERE tenant_id=? AND field=? AND enabled=1 ORDER BY id DESC");
        $stmt->execute([$tenant,$field]);
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $errors = [];

        foreach ($rules as $r) {
            $type = $r["rule_type"];
            if ($type === "allowed_values") {
                $allowed = $r["allowed_values_json"] ? json_decode($r["allowed_values_json"], true) : [];
                if (is_array($allowed) && count($allowed) > 0 && !in_array($canon, $allowed, true)) {
                    $errors[] = "Value not in allowed set";
                }
            }
            if ($type === "regex" && $r["regex_pattern"]) {
                $pattern = (string)$r["regex_pattern"];
                if (@preg_match('/'.$pattern.'/', '') === false) {
                    // invalid regex stored; skip
                } else {
                    if (!preg_match('/'.$pattern.'/', $canon)) $errors[] = "Value does not match regex";
                }
            }
        }

        return [count($errors)===0, $errors];
    }

    // Validation rules CRUD
    public static function listRules(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $field = $request->getQueryParams()["field"] ?? null;
        $sql = "SELECT * FROM mapping_validation_rule WHERE tenant_id=?";
        $params = [$tenant];
        if ($field !== null) { $sql .= " AND field=?"; $params[] = $field; }
        $sql .= " ORDER BY id DESC LIMIT 500";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                "id" => (int)$r["id"],
                "field" => $r["field"],
                "rule_type" => $r["rule_type"],
                "allowed_values" => $r["allowed_values_json"] ? json_decode($r["allowed_values_json"], true) : null,
                "regex_pattern" => $r["regex_pattern"],
                "description" => $r["description"],
                "enabled" => (bool)$r["enabled"],
                "created_at" => $r["created_at"],
            ];
        }
        return TemplateResponder::respond($response, $out);
    }

    public static function createRule(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $field = (string)($body["field"] ?? "");
        $type = (string)($body["rule_type"] ?? "allowed_values");
        $allowed = $body["allowed_values"] ?? null;
        $regex = $body["regex_pattern"] ?? null;
        $desc = $body["description"] ?? null;
        $enabled = (bool)($body["enabled"] ?? true);
        $now = gmdate('c');

        $pdo->prepare("INSERT INTO mapping_validation_rule(tenant_id,field,rule_type,allowed_values_json,regex_pattern,description,enabled,created_at) VALUES(?,?,?,?,?,?,?,?)")
            ->execute([$tenant,$field,$type, is_null($allowed)? null : json_encode($allowed, JSON_UNESCAPED_UNICODE), $regex, $desc, $enabled ? 1 : 0, $now]);
        $id = (int)$pdo->lastInsertId();

        self::audit($pdo, $actor, "rule_create", ["id"=>$id,"field"=>$field]);

        return TemplateResponder::respond($response, [
            "id"=>$id,"field"=>$field,"rule_type"=>$type,"allowed_values"=>$allowed,"regex_pattern"=>$regex,"description"=>$desc,"enabled"=>$enabled,"created_at"=>$now
        ]);
    }

    public static function updateRule(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $id = (int)($args["rule_id"] ?? 0);
        $patch = $request->getParsedBody();
        if (!is_array($patch)) $patch = [];

        $row = $pdo->prepare("SELECT * FROM mapping_validation_rule WHERE id=? AND tenant_id=?");
        $row->execute([$id,$tenant]);
        $r = $row->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            $response->getBody()->write(json_encode(["detail"=>"rule not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }

        $field = (string)($patch["field"] ?? $r["field"]);
        $type = (string)($patch["rule_type"] ?? $r["rule_type"]);
        $allowed = array_key_exists("allowed_values", $patch) ? $patch["allowed_values"] : ($r["allowed_values_json"] ? json_decode($r["allowed_values_json"], true) : null);
        $regex = array_key_exists("regex_pattern", $patch) ? $patch["regex_pattern"] : $r["regex_pattern"];
        $desc = array_key_exists("description", $patch) ? $patch["description"] : $r["description"];
        $enabled = array_key_exists("enabled", $patch) ? (bool)$patch["enabled"] : (bool)$r["enabled"];

        $pdo->prepare("UPDATE mapping_validation_rule SET field=?, rule_type=?, allowed_values_json=?, regex_pattern=?, description=?, enabled=? WHERE id=? AND tenant_id=?")
            ->execute([$field,$type,is_null($allowed)? null: json_encode($allowed, JSON_UNESCAPED_UNICODE), $regex, $desc, $enabled?1:0, $id, $tenant]);

        self::audit($pdo, $actor, "rule_update", ["id"=>$id]);

        return TemplateResponder::respond($response, [
            "id"=>$id,"field"=>$field,"rule_type"=>$type,"allowed_values"=>$allowed,"regex_pattern"=>$regex,"description"=>$desc,"enabled"=>$enabled,"created_at"=>$r["created_at"]
        ]);
    }

    public static function deleteRule(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $tenant = self::tenantId($request);
        $actor = self::actor($request);
        $id = (int)($args["rule_id"] ?? 0);
        $pdo->prepare("DELETE FROM mapping_validation_rule WHERE id=? AND tenant_id=?")->execute([$id,$tenant]);
        self::audit($pdo, $actor, "rule_delete", ["id"=>$id]);
        return TemplateResponder::respond($response, ["ok"=>true]);
    }

    private static function getChangeRequest(PDO $pdo, string $tenant, int $id): array {
        $stmt = $pdo->prepare("SELECT * FROM mapping_change_request WHERE id=? AND tenant_id=?");
        $stmt->execute([$id,$tenant]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? self::rowToChangeRequest($r) : [];
    }

    private static function rowToChangeRequest(array $r): array {
        return [
            "id" => (int)$r["id"],
            "platform" => $r["platform"],
            "field" => $r["field"],
            "raw_value" => $r["raw_value"],
            "canonical_value" => $r["canonical_value"],
            "note" => $r["note"],
            "status" => $r["status"],
            "requested_by" => $r["requested_by"],
            "approvals" => $r["approvals_json"] ? json_decode($r["approvals_json"], true) : [],
            "required_approvals" => (int)$r["required_approvals"],
            "created_at" => $r["created_at"],
        ];
    }
}
