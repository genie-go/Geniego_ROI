<?php
/**
 * Promotion — 머천트 자체 스토어 마케팅 프로모션(할인코드) 백엔드.
 *
 * [265차] OperationsHub PromoTab 의 프로모션(SUMMER20 등 자사 스토어 할인 캠페인)이 운영에서
 *   로컬 state 로만 존재해 새로고침 시 소실되고, 활성화가 백엔드 없이 라벨만 뒤집는 가짜였다.
 *   → 테넌트 스코프 전용 영속 백엔드 신설.
 *   ★도메인 구분: 이 프로모션은 머천트가 자기 커머스 채널(shopify/naver 등)에서 자기 고객에게 거는
 *     할인 캠페인이다. CouponAdmin/free_coupons(플랫폼 구독 쿠폰=GenieGo 요금할인, admin RBAC)와는
 *     전혀 다른 도메인 → 재사용 불가(오배선 방지). 세션 self-auth(requirePro + authedTenant) + tenant_id 격리.
 *   /v429/ 접두는 index.php 에서 이미 세션 self-auth bypass. /api 접두로 nginx 프록시 도달.
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class Promotion
{
    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t === '') { $t = UserAuth::authedTenant($req) ?? ''; }
        return $t;
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    private static function clean(string $s, int $max = 120): string
    {
        $s = (string)preg_replace('/[<>\x00-\x1f]/', '', $s);
        return trim(mb_substr($s, 0, $max));
    }

    private static function ensure(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $AI = $isMy ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS merchant_promotion (
                id $AI, tenant_id VARCHAR(100) NOT NULL,
                name VARCHAR(160) NOT NULL, ptype VARCHAR(20) DEFAULT 'percent',
                value DECIMAL(12,2) DEFAULT 0, code VARCHAR(60) DEFAULT NULL,
                max_use INT DEFAULT 0, used INT DEFAULT 0,
                channels_json TEXT, budget DECIMAL(14,2) DEFAULT 0,
                start_date VARCHAR(20) DEFAULT NULL, end_date VARCHAR(20) DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'draft',
                created_at VARCHAR(32), updated_at VARCHAR(32)
            )");
        } catch (\Throwable $e) { /* graceful */ }
    }

    /** 저장 status 위에 기간 만료를 얹어 효과적 상태 산출(정직: end_date 지나면 ended 표시). */
    private static function effectiveStatus(array $r): string
    {
        $st = (string)($r['status'] ?? 'draft');
        if ($st === 'active') {
            $end = (string)($r['end_date'] ?? '');
            if ($end !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $end) && $end < gmdate('Y-m-d')) return 'ended';
        }
        return $st;
    }

    private static function mapRow(array $r): array
    {
        $ch = [];
        $raw = (string)($r['channels_json'] ?? '');
        if ($raw !== '') { $d = json_decode($raw, true); if (is_array($d)) $ch = array_values(array_filter(array_map('strval', $d))); }
        return [
            'id'        => 'PROMO-' . str_pad((string)$r['id'], 3, '0', STR_PAD_LEFT),
            '_pk'       => (int)$r['id'],
            'name'      => (string)($r['name'] ?? ''),
            'type'      => (string)($r['ptype'] ?? 'percent'),
            'value'     => (float)($r['value'] ?? 0),
            'code'      => (string)($r['code'] ?? ''),
            'maxUse'    => (int)($r['max_use'] ?? 0),
            'used'      => (int)($r['used'] ?? 0),
            'channels'  => $ch,
            'budget'    => (float)($r['budget'] ?? 0),
            'startDate' => (string)($r['start_date'] ?? ''),
            'endDate'   => (string)($r['end_date'] ?? ''),
            'status'    => self::effectiveStatus($r),
        ];
    }

    /** GET /v429/promotions — 테넌트 프로모션 목록. */
    public static function list(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $st = $pdo->prepare("SELECT * FROM merchant_promotion WHERE tenant_id=? ORDER BY id DESC LIMIT 500");
        $st->execute([$t]);
        $rows = array_map([self::class, 'mapRow'], $st->fetchAll(PDO::FETCH_ASSOC) ?: []);
        return self::json($res, ['ok' => true, 'promotions' => $rows]);
    }

    private static function readBody(Request $req): array
    {
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        return $body;
    }

    private static function normType(string $t): string
    {
        $t = strtolower(trim($t));
        return in_array($t, ['percent', 'amount', 'bogo'], true) ? $t : 'percent';
    }

    private static function channelsJson($v): string
    {
        $ch = is_array($v) ? array_values(array_filter(array_map(fn($x) => self::clean((string)$x, 40), (array)$v))) : [];
        return json_encode(array_slice($ch, 0, 20), JSON_UNESCAPED_UNICODE);
    }

    /** POST /v429/promotions — 프로모션 생성(draft). */
    public static function create(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $b = self::readBody($req);
        $name = self::clean((string)($b['name'] ?? ''), 160);
        if ($name === '') return self::json($res, ['ok' => false, 'error' => 'name 필요'], 422);
        $now = self::now();
        $pdo->prepare("INSERT INTO merchant_promotion (tenant_id,name,ptype,value,code,max_use,used,channels_json,budget,start_date,end_date,status,created_at,updated_at)
                       VALUES (?,?,?,?,?,?,0,?,?,?,?,'draft',?,?)")
            ->execute([
                $t, $name, self::normType((string)($b['type'] ?? 'percent')), (float)($b['value'] ?? 0),
                self::clean((string)($b['code'] ?? ''), 60), max(0, (int)($b['maxUse'] ?? 0)),
                self::channelsJson($b['channels'] ?? []), (float)($b['budget'] ?? 0),
                self::clean((string)($b['startDate'] ?? ''), 20), self::clean((string)($b['endDate'] ?? ''), 20),
                $now, $now,
            ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /** PATCH /v429/promotions/{id} — 편집(이름/필드/상태 activate·pause). */
    public static function update(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $cur = $pdo->prepare("SELECT * FROM merchant_promotion WHERE id=? AND tenant_id=? LIMIT 1");
        $cur->execute([$id, $t]);
        $row = $cur->fetch(PDO::FETCH_ASSOC);
        if (!$row) return self::json($res, ['ok' => false, 'error' => 'not_found'], 404);
        $b = self::readBody($req);
        $name = array_key_exists('name', $b) ? (self::clean((string)$b['name'], 160) ?: (string)$row['name']) : (string)$row['name'];
        $type = array_key_exists('type', $b) ? self::normType((string)$b['type']) : (string)($row['ptype'] ?? 'percent');
        $value = array_key_exists('value', $b) ? (float)$b['value'] : (float)($row['value'] ?? 0);
        $code = array_key_exists('code', $b) ? self::clean((string)$b['code'], 60) : (string)($row['code'] ?? '');
        $maxUse = array_key_exists('maxUse', $b) ? max(0, (int)$b['maxUse']) : (int)($row['max_use'] ?? 0);
        $budget = array_key_exists('budget', $b) ? (float)$b['budget'] : (float)($row['budget'] ?? 0);
        $startDate = array_key_exists('startDate', $b) ? self::clean((string)$b['startDate'], 20) : (string)($row['start_date'] ?? '');
        $endDate = array_key_exists('endDate', $b) ? self::clean((string)$b['endDate'], 20) : (string)($row['end_date'] ?? '');
        $chJson = array_key_exists('channels', $b) ? self::channelsJson($b['channels']) : (string)($row['channels_json'] ?? '[]');
        // status: draft/active/ended/paused 만 허용
        $status = (string)($row['status'] ?? 'draft');
        if (array_key_exists('status', $b)) {
            $s = strtolower(trim((string)$b['status']));
            if (in_array($s, ['draft', 'active', 'ended', 'paused'], true)) $status = $s;
        }
        $pdo->prepare("UPDATE merchant_promotion SET name=?, ptype=?, value=?, code=?, max_use=?, budget=?, start_date=?, end_date=?, channels_json=?, status=?, updated_at=? WHERE id=? AND tenant_id=?")
            ->execute([$name, $type, $value, $code, $maxUse, $budget, $startDate, $endDate, $chJson, $status, self::now(), $id, $t]);
        return self::json($res, ['ok' => true]);
    }

    /** DELETE /v429/promotions/{id}. */
    public static function remove(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $pdo = Db::pdo(); self::ensure($pdo);
        $t = self::tenant($req);
        if ($t === '') return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $id = (int)($args['id'] ?? 0);
        $pdo->prepare("DELETE FROM merchant_promotion WHERE id=? AND tenant_id=?")->execute([$id, $t]);
        return self::json($res, ['ok' => true]);
    }
}
