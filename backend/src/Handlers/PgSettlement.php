<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\Crypto;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v427 — PG(결제 게이트웨이) 정산 실어댑터
 *
 * PG 채널을 "죽은 폼"에서 실연동으로 승격 — 결제·정산 거래를 수집해 P&L/매출 분석에 연동한다.
 *   • Stripe  — Balance Transactions API(Bearer secret_key) : 거래·수수료·순액(net).
 *   • 토스페이먼츠 — Settlements API(Basic secret_key:) : 정산 내역.
 *   • PayPal  — OAuth2(client_id/secret) → Transactions(reporting) : 거래 내역.
 *   • 그 외(이니시스/KCP/카카오페이/네이버페이) — 가맹점 키 등록 시 확장(현재 정직 pending).
 *
 * 격리: tenant = UserAuth::authedTenant(익명/데모→'demo'), pg_settlement 테넌트 컬럼 격리.
 *   DB = Db::pdo()(GENIE_ENV 운영/데모 물리 분리). 데모는 실 외부호출 없이 샘플/pending(오염 차단).
 * 자격증명: channel_credential(tenant) — stripe:secret_key, tosspayments/toss:secret_key,
 *   paypal:client_id+client_secret. 미설정 시 정직 pending(가짜 매출 미주입).
 *
 * Routes(/api strip + index bypass + $register):
 *   GET  /v427/pg/providers      지원 PG + 연동상태
 *   GET  /v427/pg/settlements    내 정산/거래 목록 + 요약
 *   POST /v427/pg/sync           {provider} 결제·정산 수집(upsert)
 */
final class PgSettlement
{
    /** provider → 자격증명 채널 키(폴백 포함). */
    private const PROVIDERS = [
        'stripe'       => ['label' => 'Stripe', 'creds' => ['stripe'], 'live' => true],
        'tosspayments' => ['label' => '토스페이먼츠', 'creds' => ['tosspayments', 'toss'], 'live' => true],
        'paypal'       => ['label' => 'PayPal', 'creds' => ['paypal'], 'live' => true],
        'inicis'       => ['label' => 'KG이니시스', 'creds' => ['inicis'], 'live' => false],
        'kcp'          => ['label' => 'NHN KCP', 'creds' => ['kcp'], 'live' => false],
        'kakaopay'     => ['label' => '카카오페이', 'creds' => ['kakaopay'], 'live' => false],
        'naverpay'     => ['label' => '네이버페이', 'creds' => ['naverpay'], 'live' => false],
    ];

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
                $pdo->exec("CREATE TABLE IF NOT EXISTS pg_settlement (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL,
                    provider VARCHAR(40) NOT NULL,
                    txn_id VARCHAR(120) NOT NULL,
                    type VARCHAR(40) NULL,
                    gross DECIMAL(16,2) DEFAULT 0,
                    fee DECIMAL(16,2) DEFAULT 0,
                    net DECIMAL(16,2) DEFAULT 0,
                    currency VARCHAR(10) NULL,
                    status VARCHAR(40) NULL,
                    txn_at VARCHAR(40) NULL,
                    created_at VARCHAR(40) NULL,
                    UNIQUE KEY uq_pg (tenant_id, provider, txn_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS pg_settlement (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL, provider TEXT NOT NULL, txn_id TEXT NOT NULL,
                    type TEXT, gross REAL DEFAULT 0, fee REAL DEFAULT 0, net REAL DEFAULT 0,
                    currency TEXT, status TEXT, txn_at TEXT, created_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_pg ON pg_settlement(tenant_id,provider,txn_id)"); } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) {}
    }

    private static function loadCred(PDO $pdo, string $tenant, array $channels, string $keyName): string
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

    // ── GET /v427/pg/providers ──────────────────────────────────────────────
    public static function providers(Request $request, Response $response, array $args): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $tenant = self::tenant($request);
        $out = [];
        foreach (self::PROVIDERS as $key => $p) {
            $connected = false;
            if ($tenant !== 'demo') {
                $kn = $key === 'paypal' ? 'client_id' : 'secret_key';
                $connected = self::loadCred($pdo, $tenant, $p['creds'], $kn) !== '';
            }
            $out[] = ['key' => $key, 'label' => $p['label'], 'live' => $p['live'], 'connected' => $connected];
        }
        return self::json($response, ['ok' => true, 'providers' => $out]);
    }

    // ── GET /v427/pg/settlements ────────────────────────────────────────────
    public static function settlements(Request $request, Response $response, array $args): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $tenant = self::tenant($request);
        $st = $pdo->prepare("SELECT id,provider,txn_id,type,gross,fee,net,currency,status,txn_at FROM pg_settlement WHERE tenant_id=? ORDER BY txn_at DESC, id DESC LIMIT 300");
        $st->execute([$tenant]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        $gross = 0.0; $fee = 0.0; $net = 0.0;
        foreach ($rows as $r) { $gross += (float)$r['gross']; $fee += (float)$r['fee']; $net += (float)$r['net']; }
        return self::json($response, ['ok' => true, 'settlements' => $rows, 'summary' => [
            'count' => count($rows), 'gross' => round($gross, 2), 'fee' => round($fee, 2), 'net' => round($net, 2),
        ]]);
    }

    // ── POST /v427/pg/sync ──────────────────────────────────────────────────
    public static function sync(Request $request, Response $response, array $args): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $tenant = self::tenant($request);
        $provider = strtolower(trim((string)(self::body($request)['provider'] ?? '')));
        if (!isset(self::PROVIDERS[$provider])) return self::json($response, ['ok' => false, 'error' => '지원하지 않는 PG'], 422);

        if ($tenant === 'demo') {
            $rows = self::demoRows($provider);
            foreach ($rows as $r) self::upsert($pdo, $tenant, $provider, $r);
            return self::json($response, ['ok' => true, 'demo' => true, 'provider' => $provider, 'synced' => count($rows)]);
        }

        $res = self::fetchLive($pdo, $tenant, $provider);
        if (empty($res['ok'])) return self::json($response, ['ok' => false, 'provider' => $provider, 'configured' => $res['configured'] ?? false, 'note' => $res['note'] ?? '연동 실패']);
        foreach ($res['rows'] as $r) self::upsert($pdo, $tenant, $provider, $r);
        return self::json($response, ['ok' => true, 'provider' => $provider, 'synced' => count($res['rows'])]);
    }

    // ── 실 수집 디스패치 ─────────────────────────────────────────────────────
    private static function fetchLive(PDO $pdo, string $tenant, string $provider): array
    {
        $creds = self::PROVIDERS[$provider]['creds'];
        if ($provider === 'stripe') {
            $sk = self::loadCred($pdo, $tenant, $creds, 'secret_key');
            if ($sk === '') return ['ok' => false, 'configured' => false, 'note' => 'Stripe Secret Key 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchStripe($sk);
        }
        if ($provider === 'tosspayments') {
            $sk = self::loadCred($pdo, $tenant, $creds, 'secret_key');
            if ($sk === '') return ['ok' => false, 'configured' => false, 'note' => '토스페이먼츠 Secret Key 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchToss($sk);
        }
        if ($provider === 'paypal') {
            $cid = self::loadCred($pdo, $tenant, $creds, 'client_id');
            $sec = self::loadCred($pdo, $tenant, $creds, 'client_secret');
            if ($cid === '' || $sec === '') return ['ok' => false, 'configured' => false, 'note' => 'PayPal Client ID/Secret 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchPaypal($cid, $sec);
        }
        return ['ok' => false, 'configured' => false, 'note' => "[{$provider}] 정산 API 연동 예정입니다."];
    }

    /** Stripe Balance Transactions(Bearer secret_key). 금액은 최소단위(cents) → 주단위 변환. */
    private static function fetchStripe(string $sk): array
    {
        [$code, $body, $err] = self::httpGet('https://api.stripe.com/v1/balance_transactions?limit=100', ['Authorization' => 'Bearer ' . $sk]);
        if ($err) return ['ok' => false, 'note' => "Stripe 오류: {$err}"];
        if ($code !== 200 || !isset($body['data'])) return ['ok' => false, 'note' => 'Stripe HTTP ' . $code . ' ' . ($body['error']['message'] ?? '')];
        $rows = [];
        foreach ($body['data'] as $d) {
            $div = 100.0; // 대부분 통화 2자리(JPY 등 0자리 예외는 별도 처리 가능)
            $rows[] = [
                'txn_id' => (string)($d['id'] ?? ''), 'type' => (string)($d['type'] ?? ''),
                'gross' => round(((float)($d['amount'] ?? 0)) / $div, 2),
                'fee' => round(((float)($d['fee'] ?? 0)) / $div, 2),
                'net' => round(((float)($d['net'] ?? 0)) / $div, 2),
                'currency' => strtoupper((string)($d['currency'] ?? '')),
                'status' => (string)($d['status'] ?? ''),
                'txn_at' => isset($d['created']) ? gmdate('c', (int)$d['created']) : '',
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** 토스페이먼츠 Settlements(Basic base64(secret_key:)). */
    private static function fetchToss(string $sk): array
    {
        $end = date('Y-m-d'); $start = date('Y-m-d', strtotime('-30 days'));
        $url = 'https://api.tosspayments.com/v1/settlements?' . http_build_query(['startDate' => $start, 'endDate' => $end, 'size' => 100]);
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => 'Basic ' . base64_encode($sk . ':')]);
        if ($err) return ['ok' => false, 'note' => "토스 오류: {$err}"];
        if ($code !== 200 || !is_array($body)) return ['ok' => false, 'note' => '토스 HTTP ' . $code];
        $list = isset($body[0]) ? $body : ($body['settlements'] ?? []);
        $rows = [];
        foreach ($list as $d) {
            $rows[] = [
                'txn_id' => (string)($d['paymentKey'] ?? $d['transactionKey'] ?? uniqid('toss_')),
                'type' => (string)($d['method'] ?? 'payment'),
                'gross' => (float)($d['amount'] ?? $d['totalAmount'] ?? 0),
                'fee' => (float)($d['fee'] ?? 0),
                'net' => (float)($d['payOutAmount'] ?? (($d['amount'] ?? 0) - ($d['fee'] ?? 0))),
                'currency' => 'KRW', 'status' => (string)($d['status'] ?? 'settled'),
                'txn_at' => (string)($d['soldDate'] ?? $d['settlementDate'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** PayPal OAuth2 → Transactions(reporting). */
    private static function fetchPaypal(string $cid, string $sec): array
    {
        [$tc, $tb] = self::httpPost('https://api-m.paypal.com/v1/oauth2/token', 'grant_type=client_credentials',
            ['Authorization' => 'Basic ' . base64_encode($cid . ':' . $sec), 'Content-Type' => 'application/x-www-form-urlencoded']);
        $token = (string)($tb['access_token'] ?? '');
        if ($token === '') return ['ok' => false, 'note' => 'PayPal 토큰 발급 실패(HTTP ' . $tc . ')'];
        $end = gmdate('Y-m-d\TH:i:s-0000'); $start = gmdate('Y-m-d\TH:i:s-0000', time() - 30 * 86400);
        $url = 'https://api-m.paypal.com/v1/reporting/transactions?' . http_build_query(['start_date' => $start, 'end_date' => $end, 'fields' => 'transaction_info', 'page_size' => 100]);
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => 'Bearer ' . $token]);
        if ($err) return ['ok' => false, 'note' => "PayPal 오류: {$err}"];
        if ($code !== 200 || !isset($body['transaction_details'])) return ['ok' => false, 'note' => 'PayPal HTTP ' . $code];
        $rows = [];
        foreach ($body['transaction_details'] as $d) {
            $ti = $d['transaction_info'] ?? [];
            $amt = (float)($ti['transaction_amount']['value'] ?? 0);
            $fee = (float)($ti['fee_amount']['value'] ?? 0);
            $rows[] = [
                'txn_id' => (string)($ti['transaction_id'] ?? uniqid('pp_')),
                'type' => (string)($ti['transaction_event_code'] ?? 'payment'),
                'gross' => round($amt, 2), 'fee' => round(abs($fee), 2), 'net' => round($amt + $fee, 2),
                'currency' => strtoupper((string)($ti['transaction_amount']['currency_code'] ?? 'USD')),
                'status' => (string)($ti['transaction_status'] ?? ''),
                'txn_at' => (string)($ti['transaction_initiation_date'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    private static function demoRows(string $provider): array
    {
        $cur = $provider === 'stripe' || $provider === 'paypal' ? 'USD' : 'KRW';
        $out = [];
        for ($i = 1; $i <= 5; $i++) {
            $g = $cur === 'KRW' ? 50000 * $i : 50 * $i;
            $f = round($g * 0.029 + ($cur === 'KRW' ? 0 : 0.3), 2);
            $out[] = ['txn_id' => 'DEMO-' . strtoupper($provider) . '-' . $i, 'type' => 'payment', 'gross' => $g, 'fee' => $f, 'net' => round($g - $f, 2), 'currency' => $cur, 'status' => 'settled', 'txn_at' => gmdate('c', time() - $i * 86400)];
        }
        return $out;
    }

    private static function upsert(PDO $pdo, string $tenant, string $provider, array $r): void
    {
        if (($r['txn_id'] ?? '') === '') return;
        $now = gmdate('c');
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $sql = $isMy
            ? "INSERT INTO pg_settlement(tenant_id,provider,txn_id,type,gross,fee,net,currency,status,txn_at,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE type=VALUES(type),gross=VALUES(gross),fee=VALUES(fee),net=VALUES(net),currency=VALUES(currency),status=VALUES(status),txn_at=VALUES(txn_at)"
            : "INSERT INTO pg_settlement(tenant_id,provider,txn_id,type,gross,fee,net,currency,status,txn_at,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(tenant_id,provider,txn_id) DO UPDATE SET type=excluded.type,gross=excluded.gross,fee=excluded.fee,net=excluded.net,currency=excluded.currency,status=excluded.status,txn_at=excluded.txn_at";
        try {
            $pdo->prepare($sql)->execute([
                $tenant, $provider, (string)$r['txn_id'], (string)($r['type'] ?? ''),
                (float)($r['gross'] ?? 0), (float)($r['fee'] ?? 0), (float)($r['net'] ?? 0),
                (string)($r['currency'] ?? ''), (string)($r['status'] ?? ''), (string)($r['txn_at'] ?? ''), $now,
            ]);
        } catch (\Throwable $e) { error_log('[PgSettlement.upsert] ' . $e->getMessage()); }
    }

    private static function httpGet(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        $hdr = []; foreach ($headers as $k => $v) $hdr[] = "{$k}: {$v}";
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_HTTPHEADER => $hdr ?: ['Accept: application/json'], CURLOPT_SSL_VERIFYPEER => true, CURLOPT_USERAGENT => 'Geniego-ROI/v427']);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch) ?: null; curl_close($ch);
        $body = ($err === null && $raw) ? json_decode((string)$raw, true) : null;
        return [$code, is_array($body) ? $body : [], $err];
    }

    private static function httpPost(string $url, string $payload, array $headers = []): array
    {
        $ch = curl_init($url);
        $hdr = []; foreach ($headers as $k => $v) $hdr[] = "{$k}: {$v}";
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => $hdr, CURLOPT_SSL_VERIFYPEER => true]);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        $body = json_decode((string)$raw, true);
        return [$code, is_array($body) ? $body : []];
    }
}
