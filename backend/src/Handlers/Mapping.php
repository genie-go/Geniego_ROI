<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class Mapping {

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
        $qp = $request->getQueryParams();
        $platform = $qp["platform"] ?? null;
        $field = $qp["field"] ?? null;

        $sql = "SELECT * FROM mapping_entry WHERE 1=1";
        $params = [];
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
        $actor = self::actor($request);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];

        $platform = (string)($body["platform"] ?? "");
        $field = (string)($body["field"] ?? "");
        $raw = (string)($body["raw_value"] ?? "");
        $canon = (string)($body["canonical_value"] ?? "");
        $note = (string)($body["note"] ?? "");
        $now = gmdate('c');

        $stmt = $pdo->prepare("SELECT id FROM mapping_entry WHERE platform=? AND field=? AND raw_value=? LIMIT 1");
        $stmt->execute([$platform,$field,$raw]);
        $id = $stmt->fetchColumn();

        if ($id) {
            $pdo->prepare("UPDATE mapping_entry SET canonical_value=?, note=? WHERE id=?")
                ->execute([$canon, $note, $id]);
            $mid = (int)$id;
        } else {
            $pdo->prepare("INSERT INTO mapping_entry(platform,field,raw_value,canonical_value,note,created_at) VALUES(?,?,?,?,?,?)")
                ->execute([$platform,$field,$raw,$canon,$note,$now]);
            $mid = (int)$pdo->lastInsertId();
        }

        self::audit($pdo, $actor, "mapping_upsert", ["id"=>$mid,"platform"=>$platform,"field"=>$field,"raw_value"=>$raw,"canonical_value"=>$canon]);

        return TemplateResponder::respond($response, [
            "id"=>$mid,"platform"=>$platform,"field"=>$field,"raw_value"=>$raw,"canonical_value"=>$canon,"note"=>$note,"created_at"=>$now
        ]);
    }

    public static function updateMapping(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["mapping_id"] ?? 0);
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];

        $canon = $body["canonical_value"] ?? null;
        $note = $body["note"] ?? null;

        $stmt = $pdo->prepare("SELECT * FROM mapping_entry WHERE id=?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $response->getBody()->write(json_encode(["detail"=>"mapping not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }

        $newCanon = $canon !== null ? (string)$canon : (string)$row["canonical_value"];
        $newNote = $note !== null ? (string)$note : (string)($row["note"] ?? "");

        $pdo->prepare("UPDATE mapping_entry SET canonical_value=?, note=? WHERE id=?")->execute([$newCanon,$newNote,$id]);

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
        $actor = self::actor($request);
        $id = (int)($args["mapping_id"] ?? 0);
        $pdo->prepare("DELETE FROM mapping_entry WHERE id=?")->execute([$id]);
        self::audit($pdo, $actor, "mapping_delete", ["id"=>$id]);
        return TemplateResponder::respond($response, ["deleted"=>true]);
    }

    public static function propose(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
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
        [$ok, $errs] = self::validateValue($pdo, $field, $canon);
        if (!$ok) {
            $response->getBody()->write(json_encode(["detail"=>implode(", ", $errs)], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(400)->withHeader('Content-Type','application/json');
        }

        $pdo->prepare("INSERT INTO mapping_change_request(platform,field,raw_value,canonical_value,note,status,requested_by,approvals_json,required_approvals,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
            ->execute([$platform,$field,$raw,$canon,$note,"pending",$actor,json_encode([], JSON_UNESCAPED_UNICODE),2,$now]);
        $id = (int)$pdo->lastInsertId();

        self::audit($pdo, $actor, "mapping_propose", ["id"=>$id]);

        return TemplateResponder::respond($response, self::getChangeRequest($pdo, $id));
    }

    public static function listProposals(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $qp = $request->getQueryParams();
        $status = $qp["status"] ?? null;

        $sql = "SELECT * FROM mapping_change_request";
        $params = [];
        if ($status !== null) { $sql .= " WHERE status=?"; $params[] = $status; }
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
        $actor = self::actor($request);
        $id = (int)($args["req_id"] ?? 0);

        $row = $pdo->prepare("SELECT * FROM mapping_change_request WHERE id=?");
        $row->execute([$id]);
        $r = $row->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            $response->getBody()->write(json_encode(["detail"=>"proposal not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }

        $approvals = $r["approvals_json"] ? json_decode($r["approvals_json"], true) : [];
        if (!is_array($approvals)) $approvals = [];
        $approvals[] = ["user"=>$actor, "ts"=>gmdate('c')];

        $status = count($approvals) >= (int)$r["required_approvals"] ? "approved" : "pending";
        $pdo->prepare("UPDATE mapping_change_request SET approvals_json=?, status=? WHERE id=?")
            ->execute([json_encode($approvals, JSON_UNESCAPED_UNICODE), $status, $id]);

        self::audit($pdo, $actor, "mapping_approve", ["id"=>$id,"status"=>$status]);

        return TemplateResponder::respond($response, self::getChangeRequest($pdo, $id));
    }

    public static function apply(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["req_id"] ?? 0);

        $row = $pdo->prepare("SELECT * FROM mapping_change_request WHERE id=?");
        $row->execute([$id]);
        $r = $row->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            $response->getBody()->write(json_encode(["detail"=>"proposal not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }
        if ($r["status"] !== "approved") {
            $response->getBody()->write(json_encode(["detail"=>"proposal not approved"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(400)->withHeader('Content-Type','application/json');
        }

        // Apply to registry (upsert)
        $now = gmdate('c');
        $stmt = $pdo->prepare("SELECT id FROM mapping_entry WHERE platform=? AND field=? AND raw_value=? LIMIT 1");
        $stmt->execute([$r["platform"],$r["field"],$r["raw_value"]]);
        $mid = $stmt->fetchColumn();
        if ($mid) {
            $pdo->prepare("UPDATE mapping_entry SET canonical_value=?, note=? WHERE id=?")
                ->execute([$r["canonical_value"], $r["note"], $mid]);
        } else {
            $pdo->prepare("INSERT INTO mapping_entry(platform,field,raw_value,canonical_value,note,created_at) VALUES(?,?,?,?,?,?)")
                ->execute([$r["platform"],$r["field"],$r["raw_value"],$r["canonical_value"],$r["note"],$now]);
        }

        $pdo->prepare("UPDATE mapping_change_request SET status=? WHERE id=?")->execute(["applied",$id]);
        self::audit($pdo, $actor, "mapping_apply", ["id"=>$id]);

        return TemplateResponder::respond($response, self::getChangeRequest($pdo, $id));
    }

    public static function impactPreview(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $platform = (string)($body["platform"] ?? "");
        $field = (string)($body["field"] ?? "");
        $raw = (string)($body["raw_value"] ?? "");
        $newCanon = (string)($body["new_canonical"] ?? "");

        // In the Python code this estimates impacted events/rollups; in this repo it's best-effort.
        $out = [
            "platform"=>$platform,
            "field"=>$field,
            "raw_value"=>$raw,
            "new_canonical"=>$newCanon,
            "estimated_impacted_rows"=>0,
            "notes"=>["stub preview"],
        ];
        return TemplateResponder::respond($response, $out);
    }

    public static function validate(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $body = $request->getParsedBody();
        if (!is_array($body)) $body = [];
        $field = (string)($body["field"] ?? "");
        $canon = (string)($body["canonical_value"] ?? "");

        [$ok, $errs] = self::validateValue($pdo, $field, $canon);
        return TemplateResponder::respond($response, ["ok"=>$ok, "errors"=>$errs]);
    }

    private static function validateValue(PDO $pdo, string $field, string $canon): array {
        $stmt = $pdo->prepare("SELECT * FROM mapping_validation_rule WHERE field=? AND enabled=1 ORDER BY id DESC");
        $stmt->execute([$field]);
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
        $field = $request->getQueryParams()["field"] ?? null;
        $sql = "SELECT * FROM mapping_validation_rule";
        $params = [];
        if ($field !== null) { $sql .= " WHERE field=?"; $params[] = $field; }
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

        $pdo->prepare("INSERT INTO mapping_validation_rule(field,rule_type,allowed_values_json,regex_pattern,description,enabled,created_at) VALUES(?,?,?,?,?,?,?)")
            ->execute([$field,$type, is_null($allowed)? null : json_encode($allowed, JSON_UNESCAPED_UNICODE), $regex, $desc, $enabled ? 1 : 0, $now]);
        $id = (int)$pdo->lastInsertId();

        self::audit($pdo, $actor, "rule_create", ["id"=>$id,"field"=>$field]);

        return TemplateResponder::respond($response, [
            "id"=>$id,"field"=>$field,"rule_type"=>$type,"allowed_values"=>$allowed,"regex_pattern"=>$regex,"description"=>$desc,"enabled"=>$enabled,"created_at"=>$now
        ]);
    }

    public static function updateRule(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["rule_id"] ?? 0);
        $patch = $request->getParsedBody();
        if (!is_array($patch)) $patch = [];

        $row = $pdo->prepare("SELECT * FROM mapping_validation_rule WHERE id=?");
        $row->execute([$id]);
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

        $pdo->prepare("UPDATE mapping_validation_rule SET field=?, rule_type=?, allowed_values_json=?, regex_pattern=?, description=?, enabled=? WHERE id=?")
            ->execute([$field,$type,is_null($allowed)? null: json_encode($allowed, JSON_UNESCAPED_UNICODE), $regex, $desc, $enabled?1:0, $id]);

        self::audit($pdo, $actor, "rule_update", ["id"=>$id]);

        return TemplateResponder::respond($response, [
            "id"=>$id,"field"=>$field,"rule_type"=>$type,"allowed_values"=>$allowed,"regex_pattern"=>$regex,"description"=>$desc,"enabled"=>$enabled,"created_at"=>$r["created_at"]
        ]);
    }

    public static function deleteRule(Request $request, Response $response, array $args): Response {
        $pdo = Db::pdo();
        $actor = self::actor($request);
        $id = (int)($args["rule_id"] ?? 0);
        $pdo->prepare("DELETE FROM mapping_validation_rule WHERE id=?")->execute([$id]);
        self::audit($pdo, $actor, "rule_delete", ["id"=>$id]);
        return TemplateResponder::respond($response, ["ok"=>true]);
    }

    private static function getChangeRequest(PDO $pdo, int $id): array {
        $stmt = $pdo->prepare("SELECT * FROM mapping_change_request WHERE id=?");
        $stmt->execute([$id]);
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
