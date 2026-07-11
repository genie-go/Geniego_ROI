<?php
/**
 * WorkspaceState — 테넌트 스코프 범용 워크스페이스 상태 저장(JSON KV). [266차 신설]
 *
 * 배경: ContentCalendar(calendar_events)·FeedbackCenter(feedback_entries)·CatalogSync 보조탭
 *   (catalog_sync_settings)·Approvals 설정탭(approval_cfg) 이 운영에서 localStorage/컴포넌트 state
 *   전용이라 새로고침 시 소실·서버 미인지였다(전수스윕 LOW 백로그).
 * 설계:
 *   - app_setting 은 전역(skey PK·tenant 없음)이며 cred_enc_key/admin_access_key_hash 등 민감 시스템설정
 *     보관 → 클라 범용 쓰기로 재사용하면 시스템 키 오염 위험. ∴ 테넌트 격리 전용 tenant_kv 신설(중복 아님).
 *   - 세션 self-auth(authedTenant) + tenant_id 격리 + key 화이트리스트(임의 키 저장 차단) + 크기 캡(512KB).
 *   - 데모 테넌트는 write skip(프론트가 데모모드서 localStorage 사용 — 운영 오염 차단 belt-and-suspenders).
 * 라우트: GET /v429/workspace?key=..  ·  POST /v429/workspace {key,value}. api_key 미들웨어 bypass(세션토큰 호출).
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class WorkspaceState
{
    /** 허용 키(시스템 설정 오염 차단). 신규 페이지 편입 시 여기에 추가. */
    private const KEYS = [
        'calendar_events', 'feedback_entries', 'approval_cfg',
        'catalog_price_rules', 'catalog_inventory', 'catalog_schedules', 'catalog_category_map',
        // [279차 감사 E-P1] 그간 localStorage/컴포넌트 state 전용(새로고침·타기기 소실)이던 운영 데이터를 서버 영속.
        'wms_combine', 'wms_bundle', 'wms_toll', 'orderhub_routing_rules', 'reviews_escalated',
    ];
    private const MAX_BYTES = 524288; // 키당 512KB 캡(폭주 방지)

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /** 세션 인증 테넌트(미들웨어 주입 우선, 세션 self-auth 폴백). '' = 미인증. */
    private static function tenant(Request $req): string
    {
        $t = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($t === '') { $t = UserAuth::authedTenant($req) ?? ''; }
        return $t;
    }

    private static function isDemo(string $t): bool
    {
        return strtolower($t) === 'demo' || strncmp(strtolower($t), 'demo', 4) === 0;
    }

    private static function ensure(PDO $pdo): void
    {
        $my = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($my) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_kv (tenant_id VARCHAR(64) NOT NULL, skey VARCHAR(64) NOT NULL, sval MEDIUMTEXT, updated_at VARCHAR(32), PRIMARY KEY(tenant_id, skey))");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_kv (tenant_id TEXT NOT NULL, skey TEXT NOT NULL, sval TEXT, updated_at TEXT, PRIMARY KEY(tenant_id, skey))");
        }
    }

    private static function body(Request $req): array
    {
        $b = $req->getParsedBody();
        if (is_array($b)) return $b;
        $j = json_decode((string)$req->getBody(), true);
        return is_array($j) ? $j : [];
    }

    /** GET /v429/workspace?key=calendar_events */
    public static function get(Request $req, Response $res): Response
    {
        $t = self::tenant($req);
        if ($t === '' || strtolower($t) === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        $key = (string)($req->getQueryParams()['key'] ?? '');
        if (!in_array($key, self::KEYS, true)) return self::json($res, ['ok' => false, 'error' => 'invalid_key'], 422);
        try {
            $pdo = Db::pdo();
            self::ensure($pdo);
            $st = $pdo->prepare("SELECT sval FROM tenant_kv WHERE tenant_id=? AND skey=?");
            $st->execute([$t, $key]);
            $raw = $st->fetchColumn();
            $val = ($raw === false || $raw === null) ? null : json_decode((string)$raw, true);
            return self::json($res, ['ok' => true, 'key' => $key, 'value' => $val]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** POST /v429/workspace {key, value} */
    public static function put(Request $req, Response $res): Response
    {
        $t = self::tenant($req);
        if ($t === '' || strtolower($t) === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        if (self::isDemo($t)) return self::json($res, ['ok' => true, 'skipped' => 'demo']); // 데모=로컬 유지(운영 오염 차단)
        $d = self::body($req);
        $key = (string)($d['key'] ?? '');
        if (!in_array($key, self::KEYS, true)) return self::json($res, ['ok' => false, 'error' => 'invalid_key'], 422);
        if (!array_key_exists('value', $d)) return self::json($res, ['ok' => false, 'error' => 'no_value'], 422);
        $enc = json_encode($d['value'], JSON_UNESCAPED_UNICODE);
        if ($enc === false) return self::json($res, ['ok' => false, 'error' => 'encode_failed'], 422);
        if (strlen($enc) > self::MAX_BYTES) return self::json($res, ['ok' => false, 'error' => 'too_large'], 413);
        try {
            $pdo = Db::pdo();
            self::ensure($pdo);
            $now = gmdate('c');
            $my = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
            $sql = $my
                ? "INSERT INTO tenant_kv(tenant_id,skey,sval,updated_at) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE sval=VALUES(sval),updated_at=VALUES(updated_at)"
                : "INSERT INTO tenant_kv(tenant_id,skey,sval,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,skey) DO UPDATE SET sval=excluded.sval,updated_at=excluded.updated_at";
            $pdo->prepare($sql)->execute([$t, $key, $enc, $now]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
