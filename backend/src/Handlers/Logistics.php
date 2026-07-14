<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\Crypto;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v427 — Logistics(배송추적) 실어댑터
 *
 * 물류/택배 채널을 "죽은 폼"(자격증명 저장만)에서 실연동으로 승격한다.
 *   • 국내 택배(CJ·롯데·한진·로젠·우체국택배) — 스마트택배(sweettracker) 통합 추적 API(t_key 1개로 전 택배사).
 *   • 국제 특송(DHL) — DHL Unified Tracking API(DHL-API-Key).
 *   • 그 외(FedEx/UPS/TNT/EMS/OCL/풀필먼트) — 전용 API 키 등록 시 확장(현재 정직하게 pending).
 *
 * 격리: tenant = UserAuth::authedTenant(익명/데모→'demo'), shipment_tracking 테넌트 컬럼 격리.
 *   DB = Db::pdo()(GENIE_ENV 운영/데모 물리 분리). 데모는 실 외부호출 없이 샘플/pending(오염 차단).
 * 자격증명: 통합 추적 키는 channel_credential(channel='smarttracker', key_name='api_key') 또는
 *   각 택배사 채널의 api_key, 또는 env SMARTTRACKER_KEY. DHL 은 channel='dhl' api_key / env DHL_API_KEY.
 *
 * Routes(/api strip 위해 /api 없이 등록 + index bypass + $register):
 *   GET  /v427/logistics/carriers           지원 택배사 목록(코드)
 *   GET  /v427/logistics/shipments          내 추적 목록
 *   POST /v427/logistics/track              {carrier,tracking_no} 등록+즉시 조회
 *   POST /v427/logistics/refresh            진행중 송장 일괄 재조회(cron)
 *   DELETE /v427/logistics/shipments/{id}   추적 삭제
 */
final class Logistics
{
    /** 국내 택배사 → 스마트택배(sweettracker) t_code. (우체국택배=01) */
    private const KR_CODE = [
        'epost' => '01',   // 우체국택배 (Korea Post)
        'cj'    => '04',   // CJ대한통운
        'hanjin'=> '05',   // 한진택배
        'logen' => '06',   // 로젠택배
        'lotte' => '08',   // 롯데글로벌로지스(롯데택배)
    ];
    /** 국제 특송 — 전용 API 보유(현재 DHL 실구현). */
    private const INTL = ['dhl', 'fedex', 'ups', 'tnt', 'cj_intl'];

    /** [237차] 물류/배송추적 채널 여부 — 내장 택배사(KR/INTL/smarttracker/ems/fulfillment) + 레지스트리
     *  (sync_kind in tracking/logistics). ChannelCreds 저장 직후 자동 refresh 트리거가 하드코딩 리터럴 대신
     *  이 SSOT 를 사용(registry 추가 택배사 대칭 — P1-2). 레지스트리 부재/오류 시 내장 목록만. */
    public static function isLogisticsChannel(\PDO $pdo, string $channel): bool
    {
        $c = strtolower(trim($channel));
        if ($c === '') return false;
        if (isset(self::KR_CODE[$c]) || in_array($c, self::INTL, true)
            || in_array($c, ['smarttracker', 'ems', 'fulfillment'], true)) return true;
        try {
            $st = $pdo->prepare("SELECT 1 FROM channel_registry WHERE is_active=1 AND channel_key=? AND sync_kind IN ('tracking','logistics') LIMIT 1");
            $st->execute([$channel]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    private static function tenant(Request $request): string
    {
        $t = UserAuth::authedTenant($request);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function json(Response $response, array $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function body(Request $request): array
    {
        $p = $request->getParsedBody();
        if (is_array($p) && count($p)) return $p;
        $raw = (string)$request->getBody();
        $d = $raw !== '' ? json_decode($raw, true) : null;
        return is_array($d) ? $d : [];
    }

    private static function ensureTables(PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS shipment_tracking (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL,
                    carrier VARCHAR(40) NOT NULL,
                    tracking_no VARCHAR(80) NOT NULL,
                    order_ref VARCHAR(120) NULL,
                    status VARCHAR(40) NULL,
                    status_text VARCHAR(255) NULL,
                    level INT NULL,
                    recipient VARCHAR(120) NULL,
                    last_event_at VARCHAR(40) NULL,
                    last_synced_at VARCHAR(40) NULL,
                    delivered TINYINT DEFAULT 0,
                    detail_json MEDIUMTEXT NULL,
                    created_at VARCHAR(40) NULL,
                    UNIQUE KEY uq_ship (tenant_id, carrier, tracking_no)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS shipment_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL, carrier TEXT NOT NULL, tracking_no TEXT NOT NULL,
                    order_ref TEXT, status TEXT, status_text TEXT, level INTEGER,
                    recipient TEXT, last_event_at TEXT, last_synced_at TEXT, delivered INTEGER DEFAULT 0,
                    detail_json TEXT, created_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_ship ON shipment_tracking(tenant_id,carrier,tracking_no)"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) { /* 이미 존재 */ }
    }

    /** 테넌트 자격증명에서 키 로드(복호화). channel 우선순위 폴백. */
    private static function loadKey(PDO $pdo, string $tenant, array $channels, string $keyName = 'api_key'): string
    {
        foreach ($channels as $ch) {
            try {
                $st = $pdo->prepare("SELECT key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND key_name=? AND is_active=1 LIMIT 1");
                $st->execute([$tenant, $ch, $keyName]);
                $v = $st->fetchColumn();
                if ($v) { $dec = Crypto::decrypt((string)$v); if ($dec !== '') return $dec; }
            } catch (\Throwable $e) {}
        }
        return '';
    }

    // ── GET /v427/logistics/carriers ────────────────────────────────────────
    public static function carriers(Request $request, Response $response, array $args): Response
    {
        $kr = [];
        foreach (self::KR_CODE as $k => $code) $kr[] = ['key' => $k, 'code' => $code, 'region' => 'domestic'];
        $intl = [];
        foreach (self::INTL as $k) $intl[] = ['key' => $k, 'region' => 'international', 'live' => in_array($k, ['dhl', 'fedex', 'ups'], true)];
        return self::json($response, ['ok' => true, 'domestic' => $kr, 'international' => $intl]);
    }

    // ── GET /v427/logistics/shipments ───────────────────────────────────────
    public static function shipments(Request $request, Response $response, array $args): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $tenant = self::tenant($request);
        $st = $pdo->prepare("SELECT id,carrier,tracking_no,order_ref,status,status_text,level,recipient,last_event_at,last_synced_at,delivered,created_at FROM shipment_tracking WHERE tenant_id=? ORDER BY id DESC LIMIT 200");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        $inTransit = 0; $done = 0;
        foreach ($rows as $r) { if ((int)$r['delivered'] === 1) $done++; else $inTransit++; }
        return self::json($response, ['ok' => true, 'shipments' => $rows, 'summary' => ['total' => count($rows), 'in_transit' => $inTransit, 'delivered' => $done]]);
    }

    // ── POST /v427/logistics/track ──────────────────────────────────────────
    public static function track(Request $request, Response $response, array $args): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        // [225차 P1-18] 익명(무세션) 쓰기 차단 — 과거 익명 호출이 tenant='demo' 폴백으로 공유 데모 버킷에
        //   임의 송장을 적재해 오염시켰다. 인증 세션(데모 사용자는 tenant='demo' 세션 보유)만 허용.
        if (UserAuth::authedTenant($request) === null) {
            return self::json($response, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        }
        $tenant = self::tenant($request);
        $b = self::body($request);
        $carrier = strtolower(trim((string)($b['carrier'] ?? '')));
        $invoice = preg_replace('/[^0-9A-Za-z\-]/', '', (string)($b['tracking_no'] ?? ''));
        $orderRef = trim((string)($b['order_ref'] ?? ''));
        if ($carrier === '' || $invoice === '') {
            return self::json($response, ['ok' => false, 'error' => 'carrier 와 tracking_no 가 필요합니다'], 422);
        }

        // 데모: 외부호출 없이 샘플(오염 차단). 운영만 실 조회.
        if ($tenant === 'demo') {
            $res = ['ok' => true, 'demo' => true, 'status' => 'in_transit', 'status_text' => '간선상차 (데모)', 'level' => 3, 'delivered' => false, 'events' => []];
            self::upsert($pdo, $tenant, $carrier, $invoice, $orderRef, $res);
            return self::json($response, $res + ['carrier' => $carrier, 'tracking_no' => $invoice]);
        }

        $res = self::fetchLive($pdo, $tenant, $carrier, $invoice);
        // 조회 성공/미설정 무관, 등록은 보존(미설정이면 status=pending 으로 저장 → 키 등록 후 refresh).
        self::upsert($pdo, $tenant, $carrier, $invoice, $orderRef, $res);

        // ── [283차 GAP-2] 송장 등록 → 채널 발송처리(송장 전송) 자동 진입 ──────────────────────────
        //   배경: 송장을 등록해도 그것이 **판매 채널로 돌아가지 않아** 구매자 주문은 계속 "배송준비중"이었다.
        //   order_ref 가 채널 주문으로 해석될 때만 큐에 적재한다(자체몰/오프라인 송장은 skip = 정직).
        //   ★비차단 — 발송처리 큐 적재 실패가 배송추적 등록(본 API 의 계약)을 깨지 않는다.
        //   ★어댑터 미보유 채널은 큐에서 honest pending 으로 남는다(가짜 성공 0).
        $shipJob = 0;
        if ($orderRef !== '') {
            try {
                $shipJob = \Genie\Handlers\ChannelSync::enqueueShipment($tenant, [
                    'order_ref' => $orderRef, 'carrier' => $carrier, 'tracking_no' => $invoice,
                ]);
            } catch (\Throwable $e) { error_log('[Logistics.track.enqueueShipment] ' . $e->getMessage()); }
        }
        return self::json($response, $res + ['carrier' => $carrier, 'tracking_no' => $invoice, 'shipment_job' => $shipJob], 200);
    }

    // ── POST /v427/logistics/refresh ────────────────────────────────────────
    public static function refresh(Request $request, Response $response, array $args): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $tenant = self::tenant($request);
        if ($tenant === 'demo') return self::json($response, ['ok' => true, 'demo' => true, 'refreshed' => 0]);
        return self::json($response, ['ok' => true, 'refreshed' => self::refreshTenant($pdo, $tenant)]);
    }

    /** 진행중(미배송) 송장 일괄 재조회 — HTTP 핸들러/cron 공용. */
    public static function refreshTenant(PDO $pdo, string $tenant): int
    {
        self::ensureTables($pdo);
        $st = $pdo->prepare("SELECT carrier,tracking_no,order_ref FROM shipment_tracking WHERE tenant_id=? AND delivered=0 LIMIT 300");
        $st->execute([$tenant]);
        $n = 0;
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            try {
                $res = self::fetchLive($pdo, $tenant, (string)$r['carrier'], (string)$r['tracking_no']);
                if (!empty($res['ok'])) { self::upsert($pdo, $tenant, (string)$r['carrier'], (string)$r['tracking_no'], (string)($r['order_ref'] ?? ''), $res); $n++; }
            } catch (\Throwable $e) {}
        }
        return $n;
    }

    // ── DELETE /v427/logistics/shipments/{id} ───────────────────────────────
    public static function remove(Request $request, Response $response, array $args): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        // [227차 감사] 익명 쓰기(삭제) 차단 — track() 과 동일 가드(remove 에 누락). 공유 데모 버킷 임의삭제 방지.
        if (UserAuth::authedTenant($request) === null) {
            return self::json($response, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        }
        $tenant = self::tenant($request);
        $id = (int)($args['id'] ?? 0);
        $st = $pdo->prepare("DELETE FROM shipment_tracking WHERE id=? AND tenant_id=?");
        $st->execute([$id, $tenant]);
        return self::json($response, ['ok' => $st->rowCount() > 0, 'deleted_id' => $id]);
    }

    // ── 실 조회 디스패치 ─────────────────────────────────────────────────────
    private static function fetchLive(PDO $pdo, string $tenant, string $carrier, string $invoice): array
    {
        if (isset(self::KR_CODE[$carrier])) {
            $key = self::loadKey($pdo, $tenant, [$carrier, 'smarttracker', 'sweettracker'], 'api_key');
            if ($key === '') $key = (string)(getenv('SMARTTRACKER_KEY') ?: '');
            if ($key === '') return ['ok' => false, 'configured' => false, 'status' => 'pending', 'note' => '통합 택배 추적 키(스마트택배 t_key) 미등록 — 등록 후 자동 조회됩니다.'];
            return self::fetchKorean($key, self::KR_CODE[$carrier], $invoice);
        }
        if ($carrier === 'dhl') {
            $key = self::loadKey($pdo, $tenant, ['dhl'], 'api_key');
            if ($key === '') $key = (string)(getenv('DHL_API_KEY') ?: '');
            if ($key === '') return ['ok' => false, 'configured' => false, 'status' => 'pending', 'note' => 'DHL API 키 미등록 — 등록 후 자동 조회됩니다.'];
            return self::fetchDHL($key, $invoice);
        }
        // [232차] FedEx/UPS 실 추적(OAuth2 client_credentials). 자격증명 등록 시 즉시 조회.
        if ($carrier === 'fedex') return self::fetchFedex($pdo, $tenant, $invoice);
        if ($carrier === 'ups')   return self::fetchUps($pdo, $tenant, $invoice);
        // TNT/EMS/CJ국제특송/OCL/풀필먼트 — 전용 API 연동 예정(정직).
        return ['ok' => false, 'configured' => false, 'status' => 'pending', 'note' => "[{$carrier}] 전용 추적 API 연동 예정입니다(송장은 저장됨)."];
    }

    /** [232차] FedEx Track API(OAuth2 → track/v1/trackingnumbers). */
    private static function fetchFedex(PDO $pdo, string $tenant, string $invoice): array
    {
        $key = self::loadKey($pdo, $tenant, ['fedex'], 'api_key');
        $sec = self::loadKey($pdo, $tenant, ['fedex'], 'api_secret');
        if ($key === '' || $sec === '') return ['ok' => false, 'configured' => false, 'status' => 'pending', 'note' => 'FedEx API 키/시크릿 미등록 — 등록 후 자동 조회됩니다.'];
        [$tc, $tb] = self::httpPost('https://apis.fedex.com/oauth/token',
            'grant_type=client_credentials&client_id=' . rawurlencode($key) . '&client_secret=' . rawurlencode($sec),
            ['Content-Type' => 'application/x-www-form-urlencoded']);
        $tok = (string)($tb['access_token'] ?? '');
        if ($tok === '') return ['ok' => false, 'configured' => true, 'status' => 'error', 'note' => "FedEx 토큰 발급 실패(HTTP {$tc})"];
        $payload = json_encode(['includeDetailedScans' => true, 'trackingInfo' => [['trackingNumberInfo' => ['trackingNumber' => $invoice]]]]);
        [$code, $body] = self::httpPost('https://apis.fedex.com/track/v1/trackingnumbers', $payload,
            ['Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/json']);
        $tr = $body['output']['completeTrackResults'][0]['trackResults'][0] ?? null;
        if ($code !== 200 || !$tr) return ['ok' => false, 'configured' => true, 'status' => 'error', 'note' => "FedEx HTTP {$code}"];
        $lsd = $tr['latestStatusDetail'] ?? [];
        $delivered = strtoupper((string)($lsd['derivedCode'] ?? $lsd['code'] ?? '')) === 'DL';
        $events = [];
        foreach (($tr['scanEvents'] ?? []) as $e) $events[] = ['time' => $e['date'] ?? '', 'where' => ($e['scanLocation']['city'] ?? ''), 'kind' => $e['eventDescription'] ?? ''];
        return ['ok' => true, 'configured' => true, 'status' => $delivered ? 'delivered' : 'in_transit',
            'status_text' => (string)($lsd['description'] ?? $lsd['statusByLocale'] ?? ''), 'level' => $delivered ? 6 : 3,
            'recipient' => (string)($tr['deliveryDetails']['receivedByName'] ?? ''), 'last_event_at' => (string)($tr['scanEvents'][0]['date'] ?? ''),
            'delivered' => $delivered, 'events' => $events];
    }

    /** [232차] UPS Track API(OAuth2 → api/track/v1/details). */
    private static function fetchUps(PDO $pdo, string $tenant, string $invoice): array
    {
        $cid  = self::loadKey($pdo, $tenant, ['ups'], 'client_id');
        $csec = self::loadKey($pdo, $tenant, ['ups'], 'client_secret');
        if ($cid === '' || $csec === '') return ['ok' => false, 'configured' => false, 'status' => 'pending', 'note' => 'UPS Client ID/Secret 미등록 — 등록 후 자동 조회됩니다.'];
        [$tc, $tb] = self::httpPost('https://onlinetools.ups.com/security/v1/oauth/token', 'grant_type=client_credentials',
            ['Authorization' => 'Basic ' . base64_encode($cid . ':' . $csec), 'Content-Type' => 'application/x-www-form-urlencoded']);
        $tok = (string)($tb['access_token'] ?? '');
        if ($tok === '') return ['ok' => false, 'configured' => true, 'status' => 'error', 'note' => "UPS 토큰 발급 실패(HTTP {$tc})"];
        [$code, $body] = self::httpGet('https://onlinetools.ups.com/api/track/v1/details/' . rawurlencode($invoice),
            ['Authorization' => 'Bearer ' . $tok, 'transId' => uniqid('gg'), 'transactionSrc' => 'geniego']);
        $pkg = $body['trackResponse']['shipment'][0]['package'][0] ?? null;
        if ($code !== 200 || !$pkg) return ['ok' => false, 'configured' => true, 'status' => 'error', 'note' => "UPS HTTP {$code}"];
        $cs = $pkg['currentStatus'] ?? [];
        $delivered = (string)($cs['code'] ?? '') === '011' || stripos((string)($cs['description'] ?? ''), 'delivered') !== false;
        $events = [];
        foreach (($pkg['activity'] ?? []) as $a) $events[] = ['time' => trim(($a['date'] ?? '') . ' ' . ($a['time'] ?? '')), 'where' => ($a['location']['address']['city'] ?? ''), 'kind' => $a['status']['description'] ?? ''];
        return ['ok' => true, 'configured' => true, 'status' => $delivered ? 'delivered' : 'in_transit',
            'status_text' => (string)($cs['description'] ?? ''), 'level' => $delivered ? 6 : 3,
            'recipient' => (string)($pkg['deliveryInformation']['receivedBy'] ?? ''), 'last_event_at' => (string)($pkg['activity'][0]['date'] ?? ''),
            'delivered' => $delivered, 'events' => $events];
    }

    /** [232차] POST(form/json) — FedEx/UPS OAuth·추적용. */
    private static function httpPost(string $url, string $body, array $headers = []): array
    {
        $ch = curl_init($url);
        $hdr = []; foreach ($headers as $k => $v) $hdr[] = "{$k}: {$v}";
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_HTTPHEADER => $hdr, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_USERAGENT => 'Geniego-ROI/v427']);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch) ?: null; curl_close($ch);
        $b = ($err === null && $raw) ? json_decode((string)$raw, true) : null;
        return [$code, is_array($b) ? $b : [], $err];
    }

    /** 스마트택배(sweettracker) 통합 조회 — t_key 1개로 국내 전 택배사. */
    private static function fetchKorean(string $tKey, string $tCode, string $invoice): array
    {
        $url = 'https://info.sweettracker.co.kr/api/v1/trackingInfo?' . http_build_query(['t_key' => $tKey, 't_code' => $tCode, 't_invoice' => $invoice]);
        [$code, $body, $err] = self::httpGet($url);
        if ($err) return ['ok' => false, 'status' => 'error', 'note' => "추적 조회 오류: {$err}"];
        if ($code !== 200 || !is_array($body)) return ['ok' => false, 'status' => 'error', 'note' => "추적 HTTP {$code}"];
        if (!empty($body['status']) && $body['status'] === false) {
            return ['ok' => false, 'status' => 'error', 'note' => (string)($body['msg'] ?? '조회 실패')];
        }
        $level = (int)($body['level'] ?? 0);
        $delivered = $level >= 6; // sweettracker level 6 = 배달완료
        $events = [];
        foreach (($body['trackingDetails'] ?? []) as $d) {
            $events[] = ['time' => $d['timeString'] ?? ($d['time'] ?? ''), 'where' => $d['where'] ?? '', 'kind' => $d['kind'] ?? ''];
        }
        $last = end($events) ?: [];
        return [
            'ok' => true, 'configured' => true,
            'status' => $delivered ? 'delivered' : 'in_transit',
            'status_text' => (string)($body['lastStateText'] ?? ($last['kind'] ?? '')),
            'level' => $level,
            'recipient' => (string)($body['receiverName'] ?? ''),
            'last_event_at' => (string)($last['time'] ?? ''),
            'delivered' => $delivered,
            'events' => $events,
        ];
    }

    /** DHL Unified Tracking API. */
    private static function fetchDHL(string $apiKey, string $tracking): array
    {
        $url = 'https://api-eu.dhl.com/track/shipments?' . http_build_query(['trackingNumber' => $tracking]);
        [$code, $body, $err] = self::httpGet($url, ['DHL-API-Key' => $apiKey, 'Accept' => 'application/json']);
        if ($err) return ['ok' => false, 'status' => 'error', 'note' => "DHL 조회 오류: {$err}"];
        if ($code !== 200 || empty($body['shipments'][0])) return ['ok' => false, 'status' => 'error', 'note' => "DHL HTTP {$code}"];
        $s = $body['shipments'][0];
        $statusCode = strtolower((string)($s['status']['statusCode'] ?? ''));
        $delivered = $statusCode === 'delivered';
        $events = [];
        foreach (($s['events'] ?? []) as $e) {
            $events[] = ['time' => $e['timestamp'] ?? '', 'where' => $e['location']['address']['addressLocality'] ?? '', 'kind' => $e['description'] ?? ($e['status'] ?? '')];
        }
        return [
            'ok' => true, 'configured' => true,
            'status' => $delivered ? 'delivered' : 'in_transit',
            'status_text' => (string)($s['status']['description'] ?? $s['status']['status'] ?? ''),
            'level' => $delivered ? 6 : 3,
            'recipient' => (string)($s['details']['receiver']['name'] ?? ''),
            'last_event_at' => (string)($s['status']['timestamp'] ?? ''),
            'delivered' => $delivered,
            'events' => $events,
        ];
    }

    /** shipment_tracking upsert(테넌트 격리). */
    private static function upsert(PDO $pdo, string $tenant, string $carrier, string $invoice, string $orderRef, array $res): void
    {
        $now = gmdate('c');
        $detail = json_encode(['events' => $res['events'] ?? [], 'note' => $res['note'] ?? null], JSON_UNESCAPED_UNICODE);
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO shipment_tracking(tenant_id,carrier,tracking_no,order_ref,status,status_text,level,recipient,last_event_at,last_synced_at,delivered,detail_json,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE status=VALUES(status),status_text=VALUES(status_text),level=VALUES(level),recipient=VALUES(recipient),last_event_at=VALUES(last_event_at),last_synced_at=VALUES(last_synced_at),delivered=VALUES(delivered),detail_json=VALUES(detail_json),order_ref=IF(VALUES(order_ref)='',order_ref,VALUES(order_ref))"
            : "INSERT INTO shipment_tracking(tenant_id,carrier,tracking_no,order_ref,status,status_text,level,recipient,last_event_at,last_synced_at,delivered,detail_json,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(tenant_id,carrier,tracking_no) DO UPDATE SET status=excluded.status,status_text=excluded.status_text,level=excluded.level,recipient=excluded.recipient,last_event_at=excluded.last_event_at,last_synced_at=excluded.last_synced_at,delivered=excluded.delivered,detail_json=excluded.detail_json,order_ref=CASE WHEN excluded.order_ref='' THEN order_ref ELSE excluded.order_ref END";
        try {
            $pdo->prepare($sql)->execute([
                $tenant, $carrier, $invoice, $orderRef,
                (string)($res['status'] ?? 'pending'), (string)($res['status_text'] ?? ''), (int)($res['level'] ?? 0),
                (string)($res['recipient'] ?? ''), (string)($res['last_event_at'] ?? ''), $now,
                !empty($res['delivered']) ? 1 : 0, $detail, $now,
            ]);
        } catch (\Throwable $e) { error_log('[Logistics.upsert] ' . $e->getMessage()); }
    }

    private static function httpGet(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        $hdr = [];
        foreach ($headers as $k => $v) $hdr[] = "{$k}: {$v}";
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_HTTPHEADER => $hdr ?: ['Accept: application/json'], CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'Geniego-ROI/v427',
        ]);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch) ?: null;
        curl_close($ch);
        $body = ($err === null && $raw) ? json_decode((string)$raw, true) : null;
        return [$code, is_array($body) ? $body : [], $err];
    }
}
