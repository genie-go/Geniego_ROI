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
        // [228차] 글로벌 결제 전문 PG — 자격증명 등록·인식(정산 실수집 어댑터는 추후, 현재 honest pending).
        'paddle'       => ['label' => 'Paddle', 'creds' => ['paddle'], 'live' => false],
        // [228차] Adyen 실 정산 수집 어댑터 구현(Settlement Detail Report CSV).
        'adyen'        => ['label' => 'Adyen', 'creds' => ['adyen'], 'live' => true],
        'square'       => ['label' => 'Square', 'creds' => ['square'], 'live' => false],
        'braintree'    => ['label' => 'Braintree', 'creds' => ['braintree'], 'live' => false],
        'checkout'     => ['label' => 'Checkout.com', 'creds' => ['checkout'], 'live' => false],
        'mollie'       => ['label' => 'Mollie', 'creds' => ['mollie'], 'live' => false],
        'razorpay'     => ['label' => 'Razorpay', 'creds' => ['razorpay'], 'live' => false],
        'klarna'       => ['label' => 'Klarna', 'creds' => ['klarna'], 'live' => false],
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
        // [225차 P1-15] summary 는 표시용 300행이 아닌 전체 행 SUM(거래 300건 초과 테넌트 과소집계 해소).
        $sumSt = $pdo->prepare("SELECT COUNT(*) AS cnt, COALESCE(SUM(gross),0) AS g, COALESCE(SUM(fee),0) AS f, COALESCE(SUM(net),0) AS n FROM pg_settlement WHERE tenant_id=?");
        $sumSt->execute([$tenant]);
        $agg = $sumSt->fetch(PDO::FETCH_ASSOC) ?: ['cnt' => 0, 'g' => 0, 'f' => 0, 'n' => 0];
        return self::json($response, ['ok' => true, 'settlements' => $rows, 'summary' => [
            'count' => (int)$agg['cnt'], 'gross' => round((float)$agg['g'], 2), 'fee' => round((float)$agg['f'], 2), 'net' => round((float)$agg['n'], 2),
            'shown' => count($rows),
        ]]);
    }

    // ── POST /v427/pg/sync ──────────────────────────────────────────────────
    public static function sync(Request $request, Response $response, array $args): Response
    {
        // [227차 감사 P0] 익명 쓰기 차단 — 공개 bypass 라우트라 익명이 demo 버킷 PG정산을 주입할 수 있었음(Logistics 정합).
        if (UserAuth::authedTenant($request) === null) {
            return self::json($response, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        }
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

    /**
     * [227차 Tier2] 자격증명 채널 키 → PG provider 역매핑.
     *   사용자가 'toss'/'tosspayments'/'stripe' 등 어느 별칭으로 자격증명을 저장하든 canonical provider 로 해석.
     *   PG provider 가 아니면 null.
     */
    public static function providerForChannel(string $channel): ?string
    {
        $c = strtolower(trim($channel));
        if ($c === '') return null;
        if (isset(self::PROVIDERS[$c])) return $c; // canonical provider 키 그대로
        foreach (self::PROVIDERS as $prov => $meta) {
            if (in_array($c, $meta['creds'], true)) return $prov; // 별칭(toss→tosspayments 등)
        }
        return null;
    }

    /**
     * [227차 Tier2] 자격증명 저장 직후 백엔드 자동 정산 수집(ChannelCreds::upsert 에서 호출).
     *   광고/커머스 채널처럼 PG 채널도 "자격증명 등록 → 즉시 자동 연동"이 되도록 한다.
     *   live=true provider(stripe/tosspayments/paypal)만 실제 fetch, 그 외(미구현)는 no-op.
     *   데모/익명 테넌트는 호출부에서 이미 차단. 반환=['ok','synced'|'note'].
     */
    public static function syncForTenant(PDO $pdo, string $tenant, string $provider): array
    {
        $provider = strtolower(trim($provider));
        if (!isset(self::PROVIDERS[$provider]) || empty(self::PROVIDERS[$provider]['live'])) {
            return ['ok' => false, 'note' => 'no-live-adapter'];
        }
        self::ensureTables($pdo);
        $res = self::fetchLive($pdo, $tenant, $provider);
        if (empty($res['ok'])) return ['ok' => false, 'configured' => $res['configured'] ?? false, 'note' => $res['note'] ?? '연동 실패'];
        foreach ($res['rows'] as $r) self::upsert($pdo, $tenant, $provider, $r);
        return ['ok' => true, 'provider' => $provider, 'synced' => count($res['rows'])];
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
        if ($provider === 'adyen') {
            $ak = self::loadCred($pdo, $tenant, $creds, 'api_key');
            $ma = self::loadCred($pdo, $tenant, $creds, 'merchant_account');
            if ($ak === '' || $ma === '') return ['ok' => false, 'configured' => false, 'note' => 'Adyen API 키/Merchant Account 미등록 — 등록 후 자동 수집됩니다.'];
            $bs = self::loadCred($pdo, $tenant, $creds, 'batch_start');
            return self::fetchAdyen($pdo, $tenant, $ak, $ma, $bs);
        }
        return ['ok' => false, 'configured' => false, 'note' => "[{$provider}] 정산 API 연동 예정입니다."];
    }

    /**
     * [228차] Adyen 정산 실 수집 — Settlement Detail Report(CSV)를 X-API-Key로 다운로드·파싱.
     *   Adyen 은 Stripe 류의 'recent transactions' JSON 리스트가 없고, 정산은 배치별 상세 리포트(CSV)가 정본이다.
     *   배치번호 커서(app_setting pg_adyen_batch_<tenant>)부터 전진 스캔 → 신규 배치 누적 수집.
     *   ★시작 배치는 cred batch_start(미설정 시 커서). 첫 수집은 batch_start 필요(Customer Area에서 최근 배치번호 확인).
     *   라이브 검증은 실 Adyen 가맹·API 키(Merchant report download role) 필요.
     */
    private static function fetchAdyen(PDO $pdo, string $tenant, string $apiKey, string $merchantAccount, string $batchStart): array
    {
        $skey   = 'pg_adyen_batch_' . $tenant;
        $cursor = (int)(self::settingGet($pdo, $skey) ?? 0);
        $start  = $cursor > 0 ? $cursor + 1 : ((int)$batchStart > 0 ? (int)$batchStart : 0);
        if ($start <= 0) {
            return ['ok' => false, 'configured' => true,
                'note' => 'Adyen 정산 첫 수집에는 시작 배치번호가 필요합니다 — Customer Area > Reports/Settlement details의 최근 settlement batch 번호를 [등록]의 batch_start 에 입력하세요.'];
        }
        $rows = [];
        $lastOk = $cursor;
        $maxScan = 30; // 런당 배치 상한(따라잡기 bound)
        $miss = 0;
        for ($b = $start; $b < $start + $maxScan; $b++) {
            $url = 'https://ca-live.adyen.com/reports/download/MerchantAccount/' . rawurlencode($merchantAccount)
                 . '/settlement_detail_report_batch_' . $b . '.csv';
            [$code, $csv, $err] = self::httpGetRaw($url, ['X-API-Key' => $apiKey]);
            if ($code === 200 && trim((string)$csv) !== '') {
                foreach (self::parseAdyenSettlementCsv((string)$csv, $b) as $r) $rows[] = $r;
                $lastOk = $b; $miss = 0;
            } elseif ($code === 404 || $code === 422) {
                if (++$miss >= 2) break; // 연속 2회 미존재 → 따라잡기 완료
            } elseif ($code === 401 || $code === 403) {
                return ['ok' => false, 'configured' => true, 'note' => "Adyen 인증/권한 오류(HTTP {$code}) — API 키의 Merchant report download role 을 확인하세요."];
            } else {
                if ($b === $start) return ['ok' => false, 'configured' => true, 'note' => "Adyen 리포트 다운로드 실패(HTTP {$code})" . ($err ? " {$err}" : '')];
                break; // 일시적 오류 — 다음 cron 재시도
            }
        }
        if ($lastOk > $cursor) self::settingSet($pdo, $skey, (string)$lastOk);
        return ['ok' => true, 'rows' => $rows, 'note' => "Adyen 정산 배치 {$start}~{$lastOk} 수집(" . count($rows) . "행)"];
    }

    /** [228차] Adyen Settlement Detail Report CSV → 정규화 행. 컬럼명 헤더 매핑(버전별 컬럼 차이 흡수). */
    private static function parseAdyenSettlementCsv(string $csv, int $batch): array
    {
        $lines = preg_split('/\r\n|\n|\r/', trim($csv));
        if (!is_array($lines) || count($lines) < 2) return [];
        $head = str_getcsv((string)array_shift($lines));
        $idx  = array_flip($head);
        $col  = function (array $r, string $name) use ($idx) { return isset($idx[$name]) && isset($r[$idx[$name]]) ? (string)$r[$idx[$name]] : ''; };
        $num  = fn($v) => (float)str_replace([',', ' '], '', (string)$v);
        $rows = [];
        foreach ($lines as $ln) {
            if (trim((string)$ln) === '') continue;
            $r = str_getcsv((string)$ln);
            $psp  = $col($r, 'Psp Reference');
            $mod  = $col($r, 'Modification Reference');
            $type = $col($r, 'Type');
            $netCur   = strtoupper($col($r, 'Net Currency') ?: $col($r, 'Gross Currency'));
            $gross    = $num($col($r, 'Gross Credit (GC)')) - $num($col($r, 'Gross Debit (GC)'));
            $net      = $num($col($r, 'Net Credit (NC)')) - $num($col($r, 'Net Debit (NC)'));
            $fee      = $num($col($r, 'Commission (NC)')) + $num($col($r, 'Markup (NC)')) + $num($col($r, 'Scheme Fees (NC)')) + $num($col($r, 'Interchange (NC)'));
            $id = ($psp !== '' ? $psp : 'adyen') . '-' . ($mod !== '' ? $mod : ($type !== '' ? $type : 'row')) . '-b' . $batch;
            $rows[] = [
                'txn_id'   => $id,
                'type'     => $type !== '' ? $type : 'Settled',
                'gross'    => round($gross, 2),
                'fee'      => round($fee, 2),
                'net'      => round($net, 2),
                'currency' => $netCur,
                'status'   => $type !== '' ? $type : 'settled',
                'txn_at'   => $col($r, 'Creation Date'),
            ];
        }
        return $rows;
    }

    /** app_setting(skey/svalue) 단순 get. */
    private static function settingGet(PDO $pdo, string $key): ?string
    {
        try { $s = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $s->execute([$key]); $v = $s->fetchColumn(); return $v === false ? null : (string)$v; }
        catch (\Throwable $e) { return null; }
    }

    /** app_setting set — UPDATE 후 미적중 시 INSERT(유니크 제약 가정 없이 안전). */
    private static function settingSet(PDO $pdo, string $key, string $val): void
    {
        try {
            $u = $pdo->prepare("UPDATE app_setting SET svalue=? WHERE skey=?");
            $u->execute([$val, $key]);
            if ($u->rowCount() === 0) { $pdo->prepare("INSERT INTO app_setting(skey,svalue) VALUES(?,?)")->execute([$key, $val]); }
        } catch (\Throwable $e) { /* app_setting 미존재 등 무시 */ }
    }

    /** CSV 등 raw 본문 다운로드(JSON 디코드 안 함). 반환 [code, raw, err]. */
    private static function httpGetRaw(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        $hdr = []; foreach ($headers as $k => $v) $hdr[] = "{$k}: {$v}";
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_HTTPHEADER => $hdr ?: ['Accept: text/csv'], CURLOPT_SSL_VERIFYPEER => true, CURLOPT_USERAGENT => 'Geniego-ROI/v427']);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch) ?: null; curl_close($ch);
        return [$code, $err === null ? (string)$raw : '', $err];
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
