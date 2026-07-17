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

    /**
     * [289차 G-01 P1] 행위자 신원 — **서버 인증 컨텍스트에서만** 도출한다(위조불가). 미확인 시 null.
     *
     * 종전: `$request->getHeaderLine('X-User-Email')` — **클라이언트가 보내는 헤더를 그대로 신뢰**했다.
     *   ㉠ 헤더값만 바꾸면 다른 승인자가 된다 → **actor 별 dedup 은 actor 가 신뢰 가능할 때만 성립**하므로
     *      중복 제거만 넣는 것은 무의미했다(재증명 전 최초 진단이 틀렸던 지점).
     *   ㉡ 더 나쁨: **프론트는 이 헤더를 아예 보내지 않았다**(전수 grep 0) → 실경로에서 actor 는 **항상 'unknown'**
     *      → 한 사람이 두 번 눌러도 서로 다른 승인으로 집계돼 **정족수 2 충족**(스푸핑조차 불필요)
     *      → `audit_log.actor='unknown'` 으로 **누가 승인했는지 감사로 알 수 없었다**.
     *   근거: docs/segmentation/PROOF_G01_G02_APPROVAL_QUORUM_REPROOF.md
     *
     * 정본 패턴은 이 클래스에 이미 있었다 — 바로 위 `tenantId()` 가 미들웨어 `auth_tenant`(위조불가)를 쓴다.
     *   `actor` 만 클라이언트 헤더를 읽고 있었다.
     */
    private static function actorId(Request $request): ?string {
        // ① API 키 경로 — /v418 은 미들웨어가 Bearer api_key 를 요구한다(index.php bypass 미등재).
        //    auth_key = api_key 행(위조불가·서버 조회). 키 신원이 이 경로의 실 행위자다.
        $k = $request->getAttribute('auth_key');
        if (is_array($k) && isset($k['id']) && (int)$k['id'] > 0) {
            return 'apikey:' . (int)$k['id'];
        }
        // ② 세션 사용자 경로(/api 별칭 등) — user_session JOIN app_user 로 서버측 도출.
        $u = UserAuth::authedUser($request);
        if (is_array($u)) {
            $email = trim((string)($u['email'] ?? ''));
            if ($email !== '') return 'user:' . $email;
            $uid = (int)($u['id'] ?? 0);
            if ($uid > 0) return 'user:#' . $uid;
        }
        // ③ 신원 미확인 → 승인 경로는 fail-closed(호출측이 403). 'unknown' 으로 얼버무리지 않는다.
        return null;
    }

    /** 감사 표기용 — 미확인이어도 로그는 남긴다(무회귀). 승인 판정에는 쓰지 말 것(→ actorId()). */
    private static function actor(Request $request): string {
        return self::actorId($request) ?? 'unknown';
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

        // [289차 G-01] 제안자도 위조불가 신원이어야 한다 — 이 값이 approve() 의 자기승인 차단 기준(requested_by)이다.
        //   종전엔 제안자·승인자가 **같은 클라이언트 헤더**에서 나왔으므로, 자기승인 차단을 넣어도
        //   헤더만 바꿔 우회할 수 있었다. 양쪽을 같은 신뢰 소스로 올려야 차단이 성립한다.
        $actor = self::actorId($request);
        if ($actor === null) {
            $response->getBody()->write(json_encode(["detail"=>"requester identity unresolved"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(403)->withHeader('Content-Type','application/json');
        }

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
        $id = (int)($args["req_id"] ?? 0);

        // [289차 G-01] ★행위자 미확인이면 승인 불가(fail-closed).
        //   종전엔 'unknown' 으로 진행돼 **익명 승인 2회 = 정족수 충족**이었다. Maker-Checker 는
        //   "서로 다른 두 사람"을 전제하므로, 사람을 특정할 수 없으면 셀 수도 없다.
        $actor = self::actorId($request);
        if ($actor === null) {
            $response->getBody()->write(json_encode(["detail"=>"approver identity unresolved"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(403)->withHeader('Content-Type','application/json');
        }

        $row = $pdo->prepare("SELECT * FROM mapping_change_request WHERE id=? AND tenant_id=?");
        $row->execute([$id,$tenant]);
        $r = $row->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            $response->getBody()->write(json_encode(["detail"=>"proposal not found"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(404)->withHeader('Content-Type','application/json');
        }

        // [289차 G-01] 이미 처리된 건에 승인 누적 금지(approved 재승인·applied 후 승인).
        $curStatus = (string)($r["status"] ?? "");
        if ($curStatus !== "pending") {
            $response->getBody()->write(json_encode(["detail"=>"proposal is not pending (status={$curStatus})"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(409)->withHeader('Content-Type','application/json');
        }

        // [289차 G-01] ★자기 승인 차단 — 제안자==승인자면 Maker-Checker 가 성립하지 않는다.
        if ((string)($r["requested_by"] ?? "") === $actor) {
            $response->getBody()->write(json_encode(["detail"=>"self-approval is not allowed (maker-checker)"], JSON_UNESCAPED_UNICODE));
            return $response->withStatus(403)->withHeader('Content-Type','application/json');
        }

        $approvals = $r["approvals_json"] ? json_decode($r["approvals_json"], true) : [];
        if (!is_array($approvals)) $approvals = [];

        // [289차 G-01] ★동일 행위자 재승인 차단(dedup) — 한 사람이 두 번 눌러 정족수를 채우던 경로.
        //   ※ 이 dedup 은 위 actorId() 가 위조불가일 때만 의미가 있다(그래서 actor 수정이 선행).
        foreach ($approvals as $a) {
            if (is_array($a) && (string)($a["user"] ?? "") === $actor) {
                $response->getBody()->write(json_encode(["detail"=>"already approved by this approver"], JSON_UNESCAPED_UNICODE));
                return $response->withStatus(409)->withHeader('Content-Type','application/json');
            }
        }

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
        // [현 차수] 다른 메서드와 동일하게 self::tenantId 로 통일 — 종전 raw auth_tenant 단독(폴백 없음)이라
        //   세션인증 경로(미들웨어 미주입)에서 tenant='' → 영향행 0 으로 단락, apply() 가 실제 재작성하는데 미리보기가 과소보고.
        $tenant = self::tenantId($request);
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
