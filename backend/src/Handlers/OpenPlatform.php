<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Handlers\UserAuth;

/**
 * OpenPlatform — 오픈 API·아웃바운드 웹훅·이벤트 카탈로그 (P1 신규).
 *
 * 외부 개발자/파트너가 GeniegoROI 도메인 이벤트(주문·정산·전환·어트리뷰션)를
 * 구독하면 발생 시 등록 URL 로 HMAC 서명된 POST 를 발신한다.
 *
 * ★중복 0 원칙 (전수 탐색 근거):
 *   - 인바운드 웹훅 수신/서명검증은 Webhooks(v402-v404 벤더/esign)·WhatsApp·EmailMarketing·
 *     Paddle 에 이미 존재. 부재였던 것은 "아웃바운드 발신 인프라"뿐이라 그것만 신설(클래스 분리).
 *   - 인증/테넌트 격리 → UserAuth::requirePro + authedTenant 재사용(CRM/catalog 동일 패턴,
 *     /v429/ 는 index.php 에서 세션 self-auth bypass). 공개 카탈로그(events/openapi)는 무인증.
 *   - 서명 컨벤션 → EmailMarketing 바운스(hash_hmac sha256)와 동일 알고리즘, Stripe 식
 *     타임스탬프 헤더(리플레이 방어)로 강화.
 *
 * ★자격증명→자동동작 원칙: 구독 엔드포인트가 0개면 emit() 은 graceful no-op(거짓 success 없음).
 * ★비차단 원칙: emit() 은 pending delivery 행만 빠르게 INSERT → 실제 전달/재시도는
 *   webhook_dispatch_cron 이 비동기 처리. 호출 도메인 흐름(주문 생성 등)을 절대 막지 않는다.
 *
 * 라우트(/v429 + /api 변형):
 *   GET    /v429/webhooks/endpoints              구독 목록(secret 마스킹)
 *   POST   /v429/webhooks/endpoints              구독 등록 → secret 1회 반환
 *   PUT    /v429/webhooks/endpoints/{id}         활성/이벤트 갱신
 *   DELETE /v429/webhooks/endpoints/{id}         구독 삭제
 *   POST   /v429/webhooks/endpoints/{id}/test    테스트 핑(동기 전달)
 *   GET    /v429/webhooks/deliveries             전달 로그(관측성)
 *   GET    /v429/webhooks/events                 [공개] 이벤트 카탈로그
 *   GET    /v429/openapi.json                    [공개] OpenAPI 3.0 스펙
 */
final class OpenPlatform
{
    private const SIG_HEADER = 'X-Genie-Signature';   // t=<unixts>,v1=<hmac>
    private const MAX_ATTEMPTS = 6;                    // 재시도 상한
    private const DELIVER_TIMEOUT = 8;                 // 초

    /** 발신 가능한 도메인 이벤트 카탈로그 (type → 설명/샘플 페이로드). */
    private const EVENTS = [
        'order.created' => [
            'desc' => '신규 주문이 생성되었을 때 (전 채널/라이브커머스 공통).',
            'sample' => ['order_id' => 'ord_123', 'channel' => 'shopify', 'amount' => 49000, 'currency' => 'KRW', 'qty' => 1, 'occurred_at' => '2026-06-26T00:00:00Z'],
        ],
        'order.cancelled' => [
            'desc' => '주문이 취소/환불되었을 때.',
            'sample' => ['order_id' => 'ord_123', 'channel' => 'shopify', 'amount' => 49000, 'currency' => 'KRW', 'reason' => 'customer', 'occurred_at' => '2026-06-26T00:00:00Z'],
        ],
        'settlement.created' => [
            'desc' => '정산 라인이 확정되었을 때 (PG/오픈마켓 정산 수집).',
            'sample' => ['settlement_id' => 'stl_77', 'period_start' => '2026-06-01', 'period_end' => '2026-06-15', 'net_amount' => 1240000, 'currency' => 'KRW'],
        ],
        'conversion.recorded' => [
            'desc' => '전환 이벤트가 정규화 파이프라인에 기록되었을 때.',
            'sample' => ['channel' => 'meta', 'campaign' => 'cmp_summer', 'value' => 49000, 'currency' => 'KRW', 'occurred_at' => '2026-06-26T00:00:00Z'],
        ],
        'attribution.computed' => [
            'desc' => '주문에 대한 어트리뷰션 기여도가 산출되었을 때.',
            'sample' => ['order_id' => 'ord_123', 'attributed_channel' => 'meta', 'model' => 'markov', 'confidence' => 0.82],
        ],
        'webhook.ping' => [
            'desc' => '엔드포인트 연결 검증용 테스트 이벤트(수동 발신).',
            'sample' => ['message' => 'pong', 'ts' => '2026-06-26T00:00:00Z'],
        ],
    ];

    // ───────────────────────────────────────────────────── 스키마

    private static function ensureTables(\PDO $pdo): void
    {
        $drv = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $AI = ($drv === 'mysql') ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

        // 구독 엔드포인트. ★MySQL: TEXT 는 DEFAULT 불가 → 상태성 컬럼은 VARCHAR.
        $pdo->exec("CREATE TABLE IF NOT EXISTS webhook_endpoint (
            id $AI,
            tenant_id VARCHAR(64),
            url TEXT, secret VARCHAR(80),
            events_json TEXT, description TEXT,
            is_active INTEGER DEFAULT 1,
            failure_count INTEGER DEFAULT 0,
            last_status VARCHAR(20),
            last_delivery_at TEXT,
            created_at TEXT, updated_at TEXT
        )");

        // 전달 로그 + 재시도 큐.
        $pdo->exec("CREATE TABLE IF NOT EXISTS webhook_delivery (
            id $AI,
            tenant_id VARCHAR(64),
            endpoint_id INTEGER DEFAULT 0,
            event_type VARCHAR(60),
            payload_json TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            http_code INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            error TEXT,
            next_retry_at TEXT,
            created_at TEXT, delivered_at TEXT
        )");
    }

    // ───────────────────────────────────────────────────── 헬퍼

    private static function json(Response $res, array $data, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json; charset=utf-8')->withStatus($code);
    }

    private static function maskSecret(string $secret): string
    {
        if ($secret === '') return '';
        return substr($secret, 0, 8) . '••••' . substr($secret, -4);
    }

    private static function nowIso(): string { return gmdate('c'); }

    // ───────────────────────────────────────────────────── 관리 엔드포인트

    public static function listEndpoints(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);

        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT * FROM webhook_endpoint WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) {
            $r['secret_masked'] = self::maskSecret((string)($r['secret'] ?? ''));
            unset($r['secret']);                          // 평문 노출 금지(생성 시 1회만)
            $r['events'] = json_decode((string)($r['events_json'] ?? '[]'), true) ?: [];
            unset($r['events_json']);
        }
        return self::json($res, ['ok' => true, 'endpoints' => $rows]);
    }

    public static function createEndpoint(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);

        $body = (array)($req->getParsedBody() ?? []);
        $url  = trim((string)($body['url'] ?? ''));
        $desc = substr(trim((string)($body['description'] ?? '')), 0, 250);
        $events = is_array($body['events'] ?? null) ? array_values(array_unique(array_map('strval', $body['events']))) : [];

        // 검증: 공개 https URL 강제(SSRF 차단 — 내부/사설/메타데이터 IP 거부), 이벤트는 카탈로그 부분집합.
        if ($url === '' || !preg_match('#^https://#i', $url)) {
            return self::json($res, ['ok' => false, 'error' => 'url 은 https:// 로 시작해야 합니다.'], 422);
        }
        if (!self::isPublicHttpsUrl($url)) {
            return self::json($res, ['ok' => false, 'error' => '공개 호스트로 해석되는 https URL 만 허용됩니다(내부/사설/메타데이터 주소 차단).'], 422);
        }
        if (empty($events)) {
            return self::json($res, ['ok' => false, 'error' => '구독할 이벤트를 1개 이상 선택하세요.', 'available' => array_keys(self::EVENTS)], 422);
        }
        $unknown = array_values(array_diff($events, array_keys(self::EVENTS)));
        if (!empty($unknown)) {
            return self::json($res, ['ok' => false, 'error' => '알 수 없는 이벤트 타입', 'rejected' => $unknown, 'available' => array_keys(self::EVENTS)], 422);
        }

        $secret = 'whsec_' . bin2hex(random_bytes(24));
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $now = self::nowIso();
        $st = $pdo->prepare("INSERT INTO webhook_endpoint(tenant_id,url,secret,events_json,description,is_active,failure_count,created_at,updated_at)
                             VALUES(?,?,?,?,?,1,0,?,?)");
        $st->execute([$tenant, $url, $secret, json_encode($events), $desc, $now, $now]);
        $id = (int)$pdo->lastInsertId();

        return self::json($res, [
            'ok' => true,
            'id' => $id,
            'url' => $url,
            'events' => $events,
            'secret' => $secret,                          // ★1회만 반환
            'signing' => 'HMAC-SHA256 over "<timestamp>.<rawBody>", header ' . self::SIG_HEADER . ': t=<ts>,v1=<hex>',
            'warning' => '이 서명 시크릿은 다시 표시되지 않습니다. 안전하게 보관하세요.',
        ]);
    }

    public static function updateEndpoint(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $id = (int)($args['id'] ?? 0);

        $pdo = Db::pdo(); self::ensureTables($pdo);
        $cur = $pdo->prepare("SELECT * FROM webhook_endpoint WHERE id=? AND tenant_id=?");
        $cur->execute([$id, $tenant]);
        $row = $cur->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return self::json($res, ['ok' => false, 'error' => '엔드포인트를 찾을 수 없습니다.'], 404);

        $body = (array)($req->getParsedBody() ?? []);
        $events = $row['events_json'];
        if (is_array($body['events'] ?? null)) {
            $ev = array_values(array_unique(array_map('strval', $body['events'])));
            $unknown = array_values(array_diff($ev, array_keys(self::EVENTS)));
            if (!empty($unknown)) return self::json($res, ['ok' => false, 'error' => '알 수 없는 이벤트 타입', 'rejected' => $unknown], 422);
            $events = json_encode($ev);
        }
        $isActive = array_key_exists('is_active', $body) ? (int)(bool)$body['is_active'] : (int)$row['is_active'];
        $desc = array_key_exists('description', $body) ? substr(trim((string)$body['description']), 0, 250) : $row['description'];

        $up = $pdo->prepare("UPDATE webhook_endpoint SET events_json=?, is_active=?, description=?, updated_at=? WHERE id=? AND tenant_id=?");
        $up->execute([$events, $isActive, $desc, self::nowIso(), $id, $tenant]);
        return self::json($res, ['ok' => true, 'id' => $id, 'is_active' => $isActive, 'events' => json_decode((string)$events, true)]);
    }

    public static function deleteEndpoint(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $id = (int)($args['id'] ?? 0);

        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("DELETE FROM webhook_endpoint WHERE id=? AND tenant_id=?");
        $st->execute([$id, $tenant]);
        if ($st->rowCount() === 0) return self::json($res, ['ok' => false, 'error' => '엔드포인트를 찾을 수 없습니다.'], 404);
        return self::json($res, ['ok' => true, 'deleted_id' => $id]);
    }

    public static function testEndpoint(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $id = (int)($args['id'] ?? 0);

        $pdo = Db::pdo(); self::ensureTables($pdo);
        $cur = $pdo->prepare("SELECT * FROM webhook_endpoint WHERE id=? AND tenant_id=?");
        $cur->execute([$id, $tenant]);
        $ep = $cur->fetch(\PDO::FETCH_ASSOC);
        if (!$ep) return self::json($res, ['ok' => false, 'error' => '엔드포인트를 찾을 수 없습니다.'], 404);

        // pending 행 생성 후 즉시 동기 전달(테스트는 즉답 피드백 제공).
        $payload = ['message' => 'pong', 'ts' => self::nowIso(), 'tenant' => $tenant];
        $delId = self::insertDelivery($pdo, $tenant, $id, 'webhook.ping', $payload);
        $del = ['id' => $delId, 'event_type' => 'webhook.ping', 'payload_json' => json_encode($payload), 'attempts' => 0];
        $result = self::attemptDelivery($pdo, $del, $ep);

        return self::json($res, [
            'ok' => $result['ok'],
            'delivery_id' => $delId,
            'http_code' => $result['http_code'],
            'error' => $result['error'],
            'note' => $result['ok'] ? '테스트 이벤트가 전달되었습니다.' : '전달 실패 — URL/서명 검증을 확인하세요(재시도는 cron 이 자동 수행).',
        ], 200);
    }

    public static function listDeliveries(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);

        $pdo = Db::pdo(); self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT id,endpoint_id,event_type,status,http_code,attempts,error,created_at,delivered_at
                             FROM webhook_delivery WHERE tenant_id=? ORDER BY id DESC LIMIT 100");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        return self::json($res, ['ok' => true, 'deliveries' => $rows]);
    }

    // ───────────────────────────────────────────────────── 공개 카탈로그

    public static function eventCatalog(Request $req, Response $res): Response
    {
        $events = [];
        foreach (self::EVENTS as $type => $meta) {
            $events[] = ['type' => $type, 'description' => $meta['desc'], 'sample_payload' => $meta['sample']];
        }
        return self::json($res, [
            'ok' => true,
            'version' => 'v429',
            'signing' => [
                'algorithm' => 'HMAC-SHA256',
                'signed_content' => '<timestamp>.<rawBody>',
                'header' => self::SIG_HEADER . ': t=<unix_ts>,v1=<hmac_hex>',
                'verify' => 'hash_hmac("sha256", t + "." + rawBody, your_endpoint_secret) === v1',
                'tolerance_seconds' => 300,
            ],
            'delivery' => ['method' => 'POST', 'content_type' => 'application/json', 'retries' => self::MAX_ATTEMPTS, 'backoff' => 'exponential'],
            'events' => $events,
        ]);
    }

    public static function openapi(Request $req, Response $res): Response
    {
        $spec = self::buildOpenApi();
        return self::json($res, $spec);
    }

    // ───────────────────────────────────────────────────── 발신 엔진(공개 static)

    /**
     * 도메인 이벤트 발신 진입점. 호출 도메인(주문/정산 등)에서 사용.
     * ★절대 예외를 전파하지 않는다(핵심 흐름 보호). 구독 0개면 no-op.
     */
    public static function emit(string $tenantId, string $eventType, array $payload): void
    {
        try {
            if ($tenantId === '' || !isset(self::EVENTS[$eventType])) return;
            $pdo = Db::pdo(); self::ensureTables($pdo);
            $st = $pdo->prepare("SELECT id, events_json FROM webhook_endpoint WHERE tenant_id=? AND is_active=1");
            $st->execute([$tenantId]);
            $eps = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            foreach ($eps as $ep) {
                $events = json_decode((string)($ep['events_json'] ?? '[]'), true) ?: [];
                if (!in_array($eventType, $events, true)) continue;
                self::insertDelivery($pdo, $tenantId, (int)$ep['id'], $eventType, $payload);
            }
        } catch (\Throwable $e) {
            // 삼킴 — 웹훅 발신 실패가 주문/정산 흐름을 깨면 안 됨.
            error_log('[openplatform emit] ' . $e->getMessage());
        }
    }

    private static function insertDelivery(\PDO $pdo, string $tenant, int $epId, string $type, array $payload): int
    {
        $st = $pdo->prepare("INSERT INTO webhook_delivery(tenant_id,endpoint_id,event_type,payload_json,status,attempts,next_retry_at,created_at)
                             VALUES(?,?,?,?, 'pending', 0, ?, ?)");
        $now = self::nowIso();
        $st->execute([$tenant, $epId, $type, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $now, $now]);
        return (int)$pdo->lastInsertId();
    }

    /**
     * pending/실패 전달을 드레인(cron 진입점). 전달 시도 + 지수 백오프 재시도.
     * @return array{processed:int,delivered:int,failed:int}
     */
    public static function drainPending(int $max = 100): array
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $now = self::nowIso();
        // next_retry_at <= now 인 pending/retry 행. ISO8601 문자열은 사전식=시간순 정렬 가능(MySQL/SQLite 공통).
        $st = $pdo->prepare("SELECT * FROM webhook_delivery
                             WHERE status IN ('pending','retry') AND (next_retry_at IS NULL OR next_retry_at<=?)
                             ORDER BY id ASC LIMIT ?");
        $st->bindValue(1, $now);
        $st->bindValue(2, $max, \PDO::PARAM_INT);
        $st->execute();
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];

        $delivered = 0; $failed = 0;
        foreach ($rows as $del) {
            $ep = $pdo->prepare("SELECT * FROM webhook_endpoint WHERE id=? AND is_active=1");
            $ep->execute([(int)$del['endpoint_id']]);
            $epRow = $ep->fetch(\PDO::FETCH_ASSOC);
            if (!$epRow) {
                $pdo->prepare("UPDATE webhook_delivery SET status='dropped', error='endpoint inactive/removed' WHERE id=?")->execute([(int)$del['id']]);
                continue;
            }
            $r = self::attemptDelivery($pdo, $del, $epRow);
            if ($r['ok']) $delivered++; else $failed++;
        }
        return ['processed' => count($rows), 'delivered' => $delivered, 'failed' => $failed];
    }

    private static function sign(string $secret, string $ts, string $body): string
    {
        return hash_hmac('sha256', $ts . '.' . $body, $secret);
    }

    /**
     * SSRF 방어 — URL 이 공개 https 호스트로 해석되는지 검증.
     *   ★멀티테넌트 SaaS: 테넌트가 등록한 URL 로 서버가 서명 페이로드를 POST 하므로 내부/사설/메타데이터
     *   주소(169.254.169.254·127.0.0.1·10.x·localhost 등) 차단 필수. 등록 시점 + 전달 시점 양쪽 호출
     *   (DNS rebinding 대비 — 등록 때 공개였다가 전달 때 내부로 재해석되는 공격 차단).
     */
    private static function isPublicHttpsUrl(string $url): bool
    {
        $p = parse_url($url);
        if (!$p || (($p['scheme'] ?? '') !== 'https')) return false;
        $host = (string)($p['host'] ?? '');
        if ($host === '') return false;
        $lh = strtolower($host);
        if (in_array($lh, ['localhost', 'metadata.google.internal'], true)) return false;
        if (substr($lh, -6) === '.local' || substr($lh, -9) === '.internal') return false;

        // 해석된 모든 IP 가 공개 범위(사설/예약 제외)여야 한다. 169.254.169.254(메타데이터)=link-local=예약 → 거부.
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            $ips = [$host];
        } else {
            $recs = @dns_get_record($host, DNS_A | DNS_AAAA);
            if (is_array($recs)) {
                foreach ($recs as $r) {
                    if (!empty($r['ip']))   $ips[] = $r['ip'];
                    if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
                }
            }
            if (!$ips) { $h = @gethostbyname($host); if ($h && $h !== $host) $ips[] = $h; }
        }
        if (!$ips) return false; // 해석 불가 → 안전측 거부.
        foreach ($ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
        }
        return true;
    }

    /** 단일 전달 시도 + 상태/재시도 갱신. */
    private static function attemptDelivery(\PDO $pdo, array $del, array $ep): array
    {
        $attempts = (int)($del['attempts'] ?? 0) + 1;
        $body = (string)($del['payload_json'] ?? '{}');
        $ts = (string)time();
        $sig = self::sign((string)($ep['secret'] ?? ''), $ts, $body);
        $url = (string)($ep['url'] ?? '');

        $httpCode = 0; $err = null; $ok = false;
        if (!self::isPublicHttpsUrl($url)) {
            // DNS rebinding/사후 변조 방어 — 전달 직전 재검증. 비공개로 해석되면 전달 차단.
            $err = 'blocked: url resolves to non-public host';
        } elseif (!function_exists('curl_init')) {
            $err = 'curl extension unavailable';
        } else {
            try {
                $ch = curl_init($url);
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_POSTFIELDS => $body,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => self::DELIVER_TIMEOUT,
                    CURLOPT_CONNECTTIMEOUT => 5,
                    CURLOPT_FOLLOWLOCATION => false,            // 내부로의 리다이렉트 우회 차단
                    CURLOPT_PROTOCOLS => defined('CURLPROTO_HTTPS') ? CURLPROTO_HTTPS : 2, // https 만(file/gopher 등 차단)
                    CURLOPT_HTTPHEADER => [
                        'Content-Type: application/json',
                        self::SIG_HEADER . ': t=' . $ts . ',v1=' . $sig,
                        'X-Genie-Event: ' . (string)($del['event_type'] ?? ''),
                        'X-Genie-Delivery: ' . (string)($del['id'] ?? ''),
                        'User-Agent: GeniegoROI-Webhooks/1.0',
                    ],
                ]);
                $resp = curl_exec($ch);
                $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                if ($resp === false) $err = curl_error($ch);
                curl_close($ch);
                $ok = ($httpCode >= 200 && $httpCode < 300);
            } catch (\Throwable $e) {
                $err = $e->getMessage();
            }
        }

        $now = self::nowIso();
        if ($ok) {
            $pdo->prepare("UPDATE webhook_delivery SET status='delivered', http_code=?, attempts=?, error=NULL, delivered_at=?, next_retry_at=NULL WHERE id=?")
                ->execute([$httpCode, $attempts, $now, (int)$del['id']]);
            $pdo->prepare("UPDATE webhook_endpoint SET failure_count=0, last_status='delivered', last_delivery_at=? WHERE id=?")
                ->execute([$now, (int)$ep['id']]);
        } else {
            $exhausted = $attempts >= self::MAX_ATTEMPTS;
            $status = $exhausted ? 'failed' : 'retry';
            // 지수 백오프: 2^attempts 분 (최대 ~60분).
            $delayMin = min(60, (int)pow(2, $attempts));
            $nextRetry = $exhausted ? null : gmdate('c', time() + $delayMin * 60);
            $pdo->prepare("UPDATE webhook_delivery SET status=?, http_code=?, attempts=?, error=?, next_retry_at=? WHERE id=?")
                ->execute([$status, $httpCode, $attempts, substr((string)$err, 0, 250), $nextRetry, (int)$del['id']]);
            $pdo->prepare("UPDATE webhook_endpoint SET failure_count=failure_count+1, last_status=?, last_delivery_at=? WHERE id=?")
                ->execute([$status, $now, (int)$ep['id']]);
        }
        return ['ok' => $ok, 'http_code' => $httpCode, 'error' => $err];
    }

    // ───────────────────────────────────────────────────── OpenAPI 카탈로그

    private static function buildOpenApi(): array
    {
        $eventTypes = array_keys(self::EVENTS);
        return [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'GeniegoROI Open API',
                'version' => '1.0.0',
                'description' => 'GeniegoROI 파트너/개발자용 공개 REST + 아웃바운드 웹훅 카탈로그. 인증: `Authorization: Bearer <api_key>` (v421 키 관리에서 발급). RBAC 스코프: read:* / write:* / write:ingest / admin:keys.',
            ],
            'servers' => [['url' => 'https://roi.genie-go.com/api', 'description' => 'production']],
            'components' => [
                'securitySchemes' => [
                    'ApiKeyAuth' => ['type' => 'http', 'scheme' => 'bearer', 'description' => 'v421 API 키. SHA-256 해시 대조.'],
                ],
            ],
            'security' => [['ApiKeyAuth' => []]],
            'tags' => [
                ['name' => 'Keys', 'description' => 'API 키 관리 (admin:keys)'],
                ['name' => 'Ingest', 'description' => '광고/전환 지표 수집 (write:ingest)'],
                ['name' => 'Webhooks', 'description' => '아웃바운드 웹훅 구독'],
            ],
            'paths' => [
                '/v421/keys' => [
                    'get' => ['tags' => ['Keys'], 'summary' => '테넌트 API 키 목록', 'responses' => ['200' => ['description' => 'OK']]],
                    'post' => ['tags' => ['Keys'], 'summary' => '신규 API 키 발급(1회 노출)', 'responses' => ['200' => ['description' => 'OK']]],
                ],
                '/v421/keys/{id}' => [
                    'delete' => ['tags' => ['Keys'], 'summary' => '키 폐기', 'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]], 'responses' => ['200' => ['description' => 'OK']]],
                ],
                '/v424/connectors/ad-metrics' => [
                    'post' => ['tags' => ['Ingest'], 'summary' => '광고/전환 지표 무코드 수집(push)', 'responses' => ['200' => ['description' => 'OK']]],
                ],
                '/v429/webhooks/endpoints' => [
                    'get' => ['tags' => ['Webhooks'], 'summary' => '구독 엔드포인트 목록', 'responses' => ['200' => ['description' => 'OK']]],
                    'post' => [
                        'tags' => ['Webhooks'], 'summary' => '웹훅 구독 등록',
                        'requestBody' => ['content' => ['application/json' => ['schema' => [
                            'type' => 'object', 'required' => ['url', 'events'],
                            'properties' => [
                                'url' => ['type' => 'string', 'format' => 'uri', 'example' => 'https://example.com/hooks/genie'],
                                'events' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => $eventTypes]],
                                'description' => ['type' => 'string'],
                            ],
                        ]]]],
                        'responses' => ['200' => ['description' => 'secret 1회 반환'], '422' => ['description' => '검증 실패']],
                    ],
                ],
                '/v429/webhooks/events' => [
                    'get' => ['tags' => ['Webhooks'], 'summary' => '발신 이벤트 카탈로그(공개)', 'security' => [], 'responses' => ['200' => ['description' => 'OK']]],
                ],
            ],
            'x-webhooks' => [
                'events' => $eventTypes,
                'signing' => self::SIG_HEADER . ': t=<ts>,v1=HMAC-SHA256(ts + "." + body, secret)',
            ],
        ];
    }
}
