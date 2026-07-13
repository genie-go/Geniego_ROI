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
        // [현 차수 P3-1] 국내 PG 4종 정산 실수집 신용게이트 — 자격증명 등록 시 즉시 동작(라이브 응답으로 매핑 최종확정).
        'inicis'       => ['label' => 'KG이니시스', 'creds' => ['inicis'], 'live' => true],
        'kcp'          => ['label' => 'NHN KCP', 'creds' => ['kcp'], 'live' => true],
        'kakaopay'     => ['label' => '카카오페이', 'creds' => ['kakaopay'], 'live' => true],
        'naverpay'     => ['label' => '네이버페이', 'creds' => ['naverpay'], 'live' => true],
        // [228차] 글로벌 결제 전문 PG — 자격증명 등록·인식(정산 실수집 어댑터는 추후, 현재 honest pending).
        'paddle'       => ['label' => 'Paddle', 'creds' => ['paddle'], 'live' => true],
        // [228차] Adyen 실 정산 수집 어댑터 구현(Settlement Detail Report CSV).
        'adyen'        => ['label' => 'Adyen', 'creds' => ['adyen'], 'live' => true],
        'square'       => ['label' => 'Square', 'creds' => ['square'], 'live' => true],
        'braintree'    => ['label' => 'Braintree', 'creds' => ['braintree'], 'live' => false],
        'checkout'     => ['label' => 'Checkout.com', 'creds' => ['checkout'], 'live' => true],
        'mollie'       => ['label' => 'Mollie', 'creds' => ['mollie'], 'live' => true],
        'razorpay'     => ['label' => 'Razorpay', 'creds' => ['razorpay'], 'live' => true],
        'klarna'       => ['label' => 'Klarna', 'creds' => ['klarna'], 'live' => true],
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
            // [254차 초고도화] 결제대사(PG↔주문 매칭)용 — PG가 제공하는 주문참조(merchant order ref). 미제공 시 빈값(금액·일자 퍼지매칭).
            try { $pdo->exec("ALTER TABLE pg_settlement ADD COLUMN order_ref " . ($isMy ? "VARCHAR(190)" : "TEXT") . " DEFAULT NULL"); } catch (\Throwable $e) {}
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
        // [225차 P1-15 + 233차 감사 P0] summary 는 표시용 300행이 아닌 전체 행 SUM. ★통화별로 분리 집계 후 각 통화를
        //   실 환율로 KRW 정규화해 합산한다. 기존엔 USD+KRW 등 혼합통화를 그냥 SUM → P&L 'PG 수령액'이 의미 없는
        //   혼합단위(달러+원) 숫자였다(예: $50 + ₩50,000 = 50,050). by_currency 원본도 함께 노출(정직).
        $sumSt = $pdo->prepare("SELECT currency, COUNT(*) AS cnt, COALESCE(SUM(gross),0) AS g, COALESCE(SUM(fee),0) AS f, COALESCE(SUM(net),0) AS n FROM pg_settlement WHERE tenant_id=? GROUP BY currency");
        $sumSt->execute([$tenant]);
        $gKrw = 0.0; $fKrw = 0.0; $nKrw = 0.0; $cnt = 0; $byCurrency = [];
        foreach ($sumSt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $cur = strtoupper((string)($r['currency'] ?? '')) ?: 'KRW';
            $gKrw += Connectors::fxToKrw((float)$r['g'], $cur);
            $fKrw += Connectors::fxToKrw((float)$r['f'], $cur);
            $nKrw += Connectors::fxToKrw((float)$r['n'], $cur);
            $cnt += (int)$r['cnt'];
            $byCurrency[] = ['currency' => $cur, 'count' => (int)$r['cnt'], 'gross' => round((float)$r['g'], 2), 'fee' => round((float)$r['f'], 2), 'net' => round((float)$r['n'], 2)];
        }
        return self::json($response, ['ok' => true, 'settlements' => $rows, 'summary' => [
            'count' => $cnt, 'gross' => round($gKrw, 2), 'fee' => round($fKrw, 2), 'net' => round($nKrw, 2),
            'currency' => 'KRW', 'by_currency' => $byCurrency, 'shown' => count($rows),
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
    /**
     * [254차 초고도화] 결제 대사(PG 정산 ↔ 주문 매칭) — "출하한 만큼 정산받았나·수수료 불일치" 탐지.
     *   매칭: ①order_ref 정확(PG 제공 시) ②금액(round)±1 버킷 + 일자 윈도(±N일) 퍼지. 그리디 1:1.
     *   산출: matched(유효수수료%)·미정산 주문(정산 누락 후보)·고아 정산(주문 없는 페이아웃)·고수수료(>8%) 의심.
     *   ★중복0: 광고축 roasReconciliation(매체↔주문)과 다른 결제축 대사. 외부 핸들러 비의존(자기완결).
     */
    public static function reconcile(PDO $pdo, string $tenant, int $windowDays = 7): array
    {
        self::ensureTables($pdo);
        $settles = [];
        try {
            // [현 차수 감사] as-of 대사 진단은 최근 거래가 더 유의미 → 5000 캡 시 오래된순(ASC)이 아닌 최신순(DESC)으로
            //   로드해 >5000건 테넌트에서 최신분 누락을 방지(매칭은 로드셋 내 ref/금액·시간창 페어링이라 순서 무관).
            $st = $pdo->prepare("SELECT id,provider,txn_id,type,gross,fee,net,currency,status,txn_at,order_ref FROM pg_settlement WHERE tenant_id=? AND gross > 0 ORDER BY txn_at DESC, id DESC LIMIT 5000");
            $st->execute([$tenant]); $settles = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}
        $orders = [];
        try {
            $st = $pdo->prepare("SELECT id, channel, channel_order_id, order_no, total_price, ordered_at, status FROM channel_orders WHERE tenant_id=? AND COALESCE(event_type,'order') NOT IN ('cancel','return') AND total_price > 0 ORDER BY ordered_at DESC, id DESC LIMIT 5000");
            $st->execute([$tenant]); $orders = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {}
        // 인덱스: order_ref(채널주문ID/주문번호) 및 금액버킷(round).
        $byRef = []; $byAmt = [];
        foreach ($orders as $i => $o) {
            foreach ([(string)$o['channel_order_id'], (string)$o['order_no']] as $k) { $k = trim($k); if ($k !== '') $byRef[$k][] = $i; }
            $byAmt[(int)round((float)$o['total_price'])][] = $i;
        }
        $used = array_fill(0, count($orders), false);
        $win = max(1, $windowDays) * 86400;
        $matched = []; $feeMismatch = []; $orphan = []; $matchGross = 0.0; $matchFee = 0.0;
        foreach ($settles as $s) {
            $g = (float)$s['gross']; $ref = trim((string)($s['order_ref'] ?? '')); $sts = strtotime((string)$s['txn_at']) ?: 0;
            // [현 차수 P1] 외화 정산을 KRW 정규화 후 금액매칭 — channel_orders.total_price 는 KRW 인데
            //   기존엔 정산 원통화(USD/EUR/JPY) $g 로 버킷/거리비교해 해외 PG 전건이 거짓-고아였다.
            $gk = Connectors::fxToKrw($g, (string)($s['currency'] ?? 'KRW'));
            $mi = -1;
            if ($ref !== '' && isset($byRef[$ref])) { foreach ($byRef[$ref] as $idx) if (!$used[$idx]) { $mi = $idx; break; } }
            if ($mi < 0) {
                $gr = (int)round($gk); $best = PHP_INT_MAX;
                for ($b = $gr - 1; $b <= $gr + 1; $b++) {
                    if (!isset($byAmt[$b])) continue;
                    foreach ($byAmt[$b] as $idx) {
                        if ($used[$idx]) continue;
                        $ots = strtotime((string)$orders[$idx]['ordered_at']) ?: 0;
                        if ($sts && $ots && abs($sts - $ots) > $win) continue;
                        $d = abs((float)$orders[$idx]['total_price'] - $gk) + ($sts && $ots ? abs($sts - $ots) / 86400.0 : 0);
                        if ($d < $best) { $best = $d; $mi = $idx; }
                    }
                }
            }
            if ($mi >= 0) {
                // [259차] 대사 요약(match_gross/match_fee/effective_fee_pct)을 KRW 정규화(리스트 요약 :154 와 동일 fxToKrw). 과거 원통화 그대로 합산해 다통화 테넌트서 '달러+원 혼합'이었음(단일통화=무변환·무영향).
                $used[$mi] = true; $o = $orders[$mi]; $matchGross += Connectors::fxToKrw($g, (string)$s['currency']); $matchFee += Connectors::fxToKrw((float)$s['fee'], (string)$s['currency']);
                $feePct = $g > 0 ? round((float)$s['fee'] / $g * 100, 2) : 0.0;
                $rec = ['settle_id'=>(int)$s['id'],'provider'=>$s['provider'],'order_id'=>(int)$o['id'],'channel'=>$o['channel'],'gross'=>$g,'order_total'=>(float)$o['total_price'],'fee'=>(float)$s['fee'],'fee_pct'=>$feePct,'currency'=>$s['currency']];
                $matched[] = $rec;
                if ($feePct > 8.0) $feeMismatch[] = $rec;
            } else {
                $orphan[] = ['settle_id'=>(int)$s['id'],'provider'=>$s['provider'],'txn_id'=>$s['txn_id'],'type'=>$s['type'],'gross'=>$g,'currency'=>$s['currency'],'txn_at'=>$s['txn_at']];
            }
        }
        $unsettled = []; $unsettledAmt = 0.0;
        foreach ($orders as $idx => $o) {
            if ($used[$idx]) continue; $unsettledAmt += (float)$o['total_price'];
            if (count($unsettled) < 200) $unsettled[] = ['order_id'=>(int)$o['id'],'channel'=>$o['channel'],'channel_order_id'=>$o['channel_order_id'],'total_price'=>(float)$o['total_price'],'ordered_at'=>$o['ordered_at'],'status'=>$o['status']];
        }
        // [현 차수 P1] 고아 정산 합계도 KRW 정규화(원통화 혼합 합산 방지).
        $orphanAmt = array_sum(array_map(fn($x) => Connectors::fxToKrw((float)$x['gross'], (string)($x['currency'] ?? 'KRW')), $orphan));
        return [
            'as_of' => gmdate('c'), 'window_days' => $windowDays,
            'summary' => [
                'orders_total' => count($orders), 'settlements_total' => count($settles),
                'matched' => count($matched), 'match_gross' => round($matchGross, 2), 'match_fee' => round($matchFee, 2),
                'effective_fee_pct' => $matchGross > 0 ? round($matchFee / $matchGross * 100, 2) : 0,
                'unsettled_orders' => count($orders) - count($matched), 'unsettled_amount' => round($unsettledAmt, 2),
                'orphan_settlements' => count($orphan), 'orphan_amount' => round($orphanAmt, 2),
                'fee_mismatch' => count($feeMismatch),
            ],
            'unsettled_sample' => $unsettled,
            'orphan_sample' => array_slice($orphan, 0, 200),
            'fee_mismatch_sample' => array_slice($feeMismatch, 0, 100),
        ];
    }

    /** GET /v427/pg/reconciliation?window_days=7 — 결제 대사 리포트. */
    public static function reconciliation(Request $request, Response $response, array $args): Response
    {
        $tenant = self::tenant($request);
        $pdo = Db::pdo();
        $q = $request->getQueryParams();
        $win = max(1, min(60, (int)($q['window_days'] ?? 7)));
        try { $r = self::reconcile($pdo, $tenant, $win); }
        catch (\Throwable $e) { return self::json($response, ['ok' => false, 'error' => $e->getMessage()], 200); }
        return self::json($response, array_merge(['ok' => true], $r));
    }

    public static function providerForChannel(string $channel, ?\PDO $pdo = null): ?string
    {
        $c = strtolower(trim($channel));
        if ($c === '') return null;
        if (isset(self::PROVIDERS[$c])) return $c; // canonical provider 키 그대로
        foreach (self::PROVIDERS as $prov => $meta) {
            if (in_array($c, $meta['creds'], true)) return $prov; // 별칭(toss→tosspayments 등)
        }
        // [266차] admin UI 로 추가한 레지스트리 PG 채널(sync_kind='pg')도 대칭 인식(258차 의도 완성).
        //   syncForTenant 는 PROVIDERS 미등재 provider 를 'no-live-adapter' 로 self-guard(:308) → 정직 pending.
        //   $pdo 미제공(=구 호출부) 시 기존 동작 불변.
        if ($pdo !== null) {
            try {
                $st = $pdo->prepare("SELECT 1 FROM channel_registry WHERE is_active=1 AND channel_key=? AND sync_kind='pg' LIMIT 1");
                $st->execute([$channel]);
                if ($st->fetchColumn()) return $c;
            } catch (\Throwable $e) { /* 레지스트리 부재 → 기존 동작(null) */ }
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
        // [232차] 글로벌 PG 실 정산수집 4종 — 공개 Bearer/Basic API. 자격증명 등록 시 즉시 자동수집.
        if ($provider === 'paddle') {
            $ak = self::loadCred($pdo, $tenant, $creds, 'api_key');
            if ($ak === '') return ['ok' => false, 'configured' => false, 'note' => 'Paddle API 키 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchPaddle($ak);
        }
        if ($provider === 'square') {
            $tok = self::loadCred($pdo, $tenant, $creds, 'access_token');
            if ($tok === '') return ['ok' => false, 'configured' => false, 'note' => 'Square Access Token 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchSquare($tok);
        }
        if ($provider === 'mollie') {
            $ak = self::loadCred($pdo, $tenant, $creds, 'api_key');
            if ($ak === '') return ['ok' => false, 'configured' => false, 'note' => 'Mollie API 키 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchMollie($ak);
        }
        if ($provider === 'razorpay') {
            $kid = self::loadCred($pdo, $tenant, $creds, 'key_id');
            $ksec = self::loadCred($pdo, $tenant, $creds, 'key_secret');
            if ($kid === '' || $ksec === '') return ['ok' => false, 'configured' => false, 'note' => 'Razorpay Key ID/Secret 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchRazorpay($kid, $ksec);
        }
        if ($provider === 'klarna') {
            $u = self::loadCred($pdo, $tenant, $creds, 'username');
            $p = self::loadCred($pdo, $tenant, $creds, 'password');
            $rg = strtolower(self::loadCred($pdo, $tenant, $creds, 'region') ?: 'eu');
            if ($u === '' || $p === '') return ['ok' => false, 'configured' => false, 'note' => 'Klarna API Username/Password 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchKlarna($u, $p, $rg);
        }
        if ($provider === 'checkout') {
            $sk = self::loadCred($pdo, $tenant, $creds, 'secret_key');
            if ($sk === '') return ['ok' => false, 'configured' => false, 'note' => 'Checkout.com Secret Key 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchCheckout($sk);
        }
        // [현 차수 P3-1] 국내 PG 4종 — 자격증명 등록 시 즉시 실 API 시도(라이브 응답으로 필드매핑 최종확정).
        if ($provider === 'naverpay') {
            $cid = self::loadCred($pdo, $tenant, $creds, 'client_id');
            $sec = self::loadCred($pdo, $tenant, $creds, 'client_secret');
            $pid = self::loadCred($pdo, $tenant, $creds, 'partner_id');
            if ($cid === '' || $sec === '') return ['ok' => false, 'configured' => false, 'note' => '네이버페이 Client ID/Secret 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchNaverPay($cid, $sec, $pid);
        }
        if ($provider === 'kakaopay') {
            $sk = self::loadCred($pdo, $tenant, $creds, 'secret_key') ?: self::loadCred($pdo, $tenant, $creds, 'admin_key');
            $cid = self::loadCred($pdo, $tenant, $creds, 'cid');
            if ($sk === '') return ['ok' => false, 'configured' => false, 'note' => '카카오페이 Secret Key(또는 Admin Key) 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchKakaoPay($sk, $cid);
        }
        if ($provider === 'inicis') {
            $mid = self::loadCred($pdo, $tenant, $creds, 'mid');
            $sign = self::loadCred($pdo, $tenant, $creds, 'sign_key') ?: self::loadCred($pdo, $tenant, $creds, 'api_key');
            if ($mid === '' || $sign === '') return ['ok' => false, 'configured' => false, 'note' => 'KG이니시스 MID/SignKey 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchInicis($mid, $sign);
        }
        if ($provider === 'kcp') {
            $site = self::loadCred($pdo, $tenant, $creds, 'site_cd');
            // [280차 P2] ★UI(ApiKeys.jsx)는 'site_key'로 저장하는데 백엔드는 api_key/key 만 읽어, 사용자가
            //   매뉴얼대로 입력해도 KCP 정산이 영구 "미등록"이었다(등록해도 미작동 = 겉보기 정상·실제 사망).
            //   'site_key' 폴백 추가(기존 저장분 호환·무회귀).
            $key = self::loadCred($pdo, $tenant, $creds, 'api_key') ?: self::loadCred($pdo, $tenant, $creds, 'key') ?: self::loadCred($pdo, $tenant, $creds, 'site_key');
            if ($site === '' || $key === '') return ['ok' => false, 'configured' => false, 'note' => 'NHN KCP Site Code/Key 미등록 — 등록 후 자동 수집됩니다.'];
            return self::fetchKcp($site, $key);
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

    /** [233차 감사 P1] 통화 최소단위→주단위 divisor. JPY/KRW 등 ISO-4217 0-decimal 통화는 이미 주단위(÷1), 그 외 ÷100.
     *   기존 $div=100 고정은 ¥10,000(0자리)을 ¥100 으로 100× 과소집계했다(Stripe/Square/Paddle/Razorpay/Klarna/Checkout 공통). */
    private static function minorUnitDivisor(string $currency): float
    {
        static $zd = ['JPY','KRW','VND','CLP','BIF','DJF','GNF','KMF','MGA','PYG','RWF','UGX','VUV','XAF','XOF','XPF'];
        return in_array(strtoupper(trim($currency)), $zd, true) ? 1.0 : 100.0;
    }

    /** Stripe Balance Transactions(Bearer secret_key). 금액은 최소단위(cents) → 주단위 변환. */
    private static function fetchStripe(string $sk): array
    {
        [$code, $body, $err] = self::httpGet('https://api.stripe.com/v1/balance_transactions?limit=100', ['Authorization' => 'Bearer ' . $sk]);
        if ($err) return ['ok' => false, 'note' => "Stripe 오류: {$err}"];
        if ($code !== 200 || !isset($body['data'])) return ['ok' => false, 'note' => 'Stripe HTTP ' . $code . ' ' . ($body['error']['message'] ?? '')];
        $rows = [];
        foreach ($body['data'] as $d) {
            $div = self::minorUnitDivisor((string)($d['currency'] ?? '')); // 0자리 통화(JPY/KRW 등)=÷1
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
                'txn_id' => (string)($d['paymentKey'] ?? $d['transactionKey'] ?? ('toss_' . substr(hash('sha256', json_encode($d)), 0, 24))),
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
                'txn_id' => (string)($ti['transaction_id'] ?? ('pp_' . substr(hash('sha256', json_encode($d)), 0, 24))),
                'type' => (string)($ti['transaction_event_code'] ?? 'payment'),
                'gross' => round($amt, 2), 'fee' => round(abs($fee), 2), 'net' => round($amt + $fee, 2),
                'currency' => strtoupper((string)($ti['transaction_amount']['currency_code'] ?? 'USD')),
                'status' => (string)($ti['transaction_status'] ?? ''),
                'txn_at' => (string)($ti['transaction_initiation_date'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** [232차] Paddle Billing v2 Transactions(Bearer api_key). 금액은 최소단위 문자열 → 주단위. */
    private static function fetchPaddle(string $ak): array
    {
        $url = 'https://api.paddle.com/transactions?per_page=100&order_by=created_at[DESC]';
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => 'Bearer ' . $ak]);
        if ($err) return ['ok' => false, 'note' => "Paddle 오류: {$err}"];
        if ($code !== 200 || !isset($body['data'])) return ['ok' => false, 'note' => 'Paddle HTTP ' . $code . ' ' . ($body['error']['detail'] ?? '')];
        $rows = [];
        foreach ($body['data'] as $d) {
            $t = $d['details']['totals'] ?? [];
            $div = self::minorUnitDivisor((string)($t['currency_code'] ?? ''));
            $rows[] = [
                'txn_id' => (string)($d['id'] ?? ''), 'type' => (string)($d['origin'] ?? 'transaction'),
                'gross' => round(((float)($t['grand_total'] ?? 0)) / $div, 2),
                'fee' => round(((float)($t['fee'] ?? 0)) / $div, 2),
                'net' => round(((float)($t['earnings'] ?? 0)) / $div, 2),
                'currency' => strtoupper((string)($t['currency_code'] ?? '')),
                'status' => (string)($d['status'] ?? ''),
                'txn_at' => (string)($d['created_at'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** [232차] Square Payments(Bearer access_token). 금액 cents → 주단위. 수수료=processing_fee 합. */
    private static function fetchSquare(string $tok): array
    {
        $begin = gmdate('Y-m-d\TH:i:s\Z', time() - 30 * 86400);
        $url = 'https://connect.squareup.com/v2/payments?' . http_build_query(['begin_time' => $begin, 'limit' => 100, 'sort_order' => 'DESC']);
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => 'Bearer ' . $tok, 'Square-Version' => '2024-07-17']);
        if ($err) return ['ok' => false, 'note' => "Square 오류: {$err}"];
        if ($code !== 200 || !isset($body['payments'])) return ['ok' => false, 'note' => 'Square HTTP ' . $code . ' ' . ($body['errors'][0]['detail'] ?? '')];
        $rows = [];
        foreach ($body['payments'] as $d) {
            $div = self::minorUnitDivisor((string)($d['amount_money']['currency'] ?? ''));
            $gross = ((float)($d['amount_money']['amount'] ?? 0)) / $div;
            $fee = 0.0; foreach (($d['processing_fee'] ?? []) as $pf) $fee += ((float)($pf['amount_money']['amount'] ?? 0)) / $div;
            $rows[] = [
                'txn_id' => (string)($d['id'] ?? ''), 'type' => (string)($d['source_type'] ?? 'payment'),
                'gross' => round($gross, 2), 'fee' => round($fee, 2), 'net' => round($gross - $fee, 2),
                'currency' => strtoupper((string)($d['amount_money']['currency'] ?? '')),
                'status' => (string)($d['status'] ?? ''),
                'txn_at' => (string)($d['created_at'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** [232차] Mollie Payments(Bearer live_ api_key). settlementAmount=net, fee=gross-net. */
    private static function fetchMollie(string $ak): array
    {
        [$code, $body, $err] = self::httpGet('https://api.mollie.com/v2/payments?limit=100', ['Authorization' => 'Bearer ' . $ak]);
        if ($err) return ['ok' => false, 'note' => "Mollie 오류: {$err}"];
        if ($code !== 200 || !isset($body['_embedded']['payments'])) return ['ok' => false, 'note' => 'Mollie HTTP ' . $code . ' ' . ($body['detail'] ?? '')];
        $rows = [];
        foreach ($body['_embedded']['payments'] as $d) {
            $gross = (float)($d['amount']['value'] ?? 0);
            $net = isset($d['settlementAmount']['value']) ? (float)$d['settlementAmount']['value'] : $gross;
            $rows[] = [
                'txn_id' => (string)($d['id'] ?? ''), 'type' => (string)($d['method'] ?? 'payment'),
                'gross' => round($gross, 2), 'fee' => round(max(0, $gross - $net), 2), 'net' => round($net, 2),
                'currency' => strtoupper((string)($d['amount']['currency'] ?? '')),
                'status' => (string)($d['status'] ?? ''),
                'txn_at' => (string)($d['createdAt'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** [232차] Razorpay Payments(Basic key_id:key_secret). 금액 paise → 주단위. */
    private static function fetchRazorpay(string $kid, string $ksec): array
    {
        $from = time() - 30 * 86400;
        $url = 'https://api.razorpay.com/v1/payments?' . http_build_query(['count' => 100, 'from' => $from]);
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => 'Basic ' . base64_encode($kid . ':' . $ksec)]);
        if ($err) return ['ok' => false, 'note' => "Razorpay 오류: {$err}"];
        if ($code !== 200 || !isset($body['items'])) return ['ok' => false, 'note' => 'Razorpay HTTP ' . $code . ' ' . ($body['error']['description'] ?? '')];
        $rows = [];
        foreach ($body['items'] as $d) {
            $div = self::minorUnitDivisor((string)($d['currency'] ?? ''));
            $gross = ((float)($d['amount'] ?? 0)) / $div;
            $fee = ((float)($d['fee'] ?? 0)) / $div;
            $rows[] = [
                'txn_id' => (string)($d['id'] ?? ''), 'type' => (string)($d['method'] ?? 'payment'),
                'gross' => round($gross, 2), 'fee' => round($fee, 2), 'net' => round($gross - $fee, 2),
                'currency' => strtoupper((string)($d['currency'] ?? '')),
                'status' => (string)($d['status'] ?? ''),
                'txn_at' => isset($d['created_at']) ? gmdate('c', (int)$d['created_at']) : '',
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** [232차] Klarna Settlements Transactions(Basic username:password, region host). 금액 minor → 주단위. */
    private static function fetchKlarna(string $u, string $p, string $region): array
    {
        $host = ['na' => 'https://api-na.klarna.com', 'oc' => 'https://api-oc.klarna.com'][$region] ?? 'https://api.klarna.com';
        [$code, $body, $err] = self::httpGet($host . '/settlements/v1/transactions?size=100', ['Authorization' => 'Basic ' . base64_encode($u . ':' . $p)]);
        if ($err) return ['ok' => false, 'note' => "Klarna 오류: {$err}"];
        if ($code !== 200 || !isset($body['transactions'])) return ['ok' => false, 'note' => 'Klarna HTTP ' . $code . ' ' . ($body['error_messages'][0] ?? '')];
        $rows = [];
        foreach ($body['transactions'] as $d) {
            $div = self::minorUnitDivisor((string)($d['currency_code'] ?? $d['currency'] ?? '')); $amt = ((float)($d['amount'] ?? 0)) / $div;
            $type = (string)($d['type'] ?? 'SALE');
            $isFee = stripos($type, 'fee') !== false || stripos($type, 'commission') !== false;
            $rows[] = [
                'txn_id' => (string)($d['transaction_id'] ?? $d['capture_id'] ?? ('kl_' . substr(hash('sha256', json_encode($d)), 0, 24))),
                'type' => $type,
                'gross' => $isFee ? 0.0 : round($amt, 2),
                'fee' => $isFee ? round(abs($amt), 2) : 0.0,
                'net' => round($amt, 2),
                'currency' => strtoupper((string)($d['currency_code'] ?? $d['currency'] ?? '')),
                'status' => (string)($d['type'] ?? 'settled'),
                'txn_at' => (string)($d['capture_date'] ?? $d['date'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** [232차] Checkout.com Reconciliation(Bearer sk_). 리스트의 breakdown 으로 gross/fee/net 산출. */
    private static function fetchCheckout(string $sk): array
    {
        $from = gmdate('Y-m-d\TH:i:s\Z', time() - 30 * 86400); $to = gmdate('Y-m-d\TH:i:s\Z');
        $url = 'https://api.checkout.com/reporting/payments?' . http_build_query(['from' => $from, 'to' => $to, 'limit' => 100]);
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => 'Bearer ' . $sk]);
        if ($err) return ['ok' => false, 'note' => "Checkout 오류: {$err}"];
        if ($code !== 200 || !isset($body['data'])) return ['ok' => false, 'note' => 'Checkout HTTP ' . $code . ' ' . ($body['error_type'] ?? '')];
        $rows = [];
        foreach ($body['data'] as $d) {
            $gross = 0.0; $fee = 0.0; $net = 0.0; $cur = strtoupper((string)($d['payout_currency'] ?? $d['processing_currency'] ?? ''));
            foreach ((array)($d['breakdown'] ?? []) as $b) {
                $t = strtolower((string)($b['type'] ?? '')); $amt = (float)($b['payout_amount'] ?? $b['processing_amount'] ?? $b['amount'] ?? 0);
                if (strpos($t, 'fee') !== false || strpos($t, 'scheme') !== false || strpos($t, 'interchange') !== false) $fee += abs($amt);
                elseif (strpos($t, 'capture') !== false || strpos($t, 'sale') !== false || strpos($t, 'payment') !== false || strpos($t, 'presentment') !== false) $gross += $amt;
                $net += $amt;
            }
            if ($gross == 0.0) $gross = (float)($d['amount'] ?? 0) / self::minorUnitDivisor($cur); // 폴백
            $rows[] = [
                'txn_id' => (string)($d['id'] ?? $d['payment_id'] ?? ('ck_' . substr(hash('sha256', json_encode($d)), 0, 24))),
                'type' => (string)($d['breakdown_type'] ?? $d['action_type'] ?? 'payment'),
                'gross' => round($gross, 2), 'fee' => round($fee, 2), 'net' => round($net !== 0.0 ? $net : ($gross - $fee), 2),
                'currency' => $cur, 'status' => (string)($d['response_code'] ?? $d['status'] ?? 'settled'),
                'txn_at' => (string)($d['requested_on'] ?? $d['processed_on'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /* ════════ [현 차수 P3-1] 국내 PG 4종 정산 수집 — 자격증명 등록 시 즉시 동작, 방어적 다중후보 매핑(라이브 응답으로 최종확정). ════════ */

    /** 네이버페이 정산내역 — Partner API(client_id/secret 헤더). KRW. 방어적 매핑. */
    private static function fetchNaverPay(string $cid, string $sec, string $pid): array
    {
        $start = gmdate('Ymd', time() - 30 * 86400); $end = gmdate('Ymd');
        $url = 'https://apis.naver.com/' . ($pid !== '' ? rawurlencode($pid) . '/' : '') . 'naverpay-partner/naverpay/payments/v2.2/settlements?'
            . http_build_query(['startDate' => $start, 'endDate' => $end]);
        [$code, $body, $err] = self::httpGet($url, ['X-Naver-Client-Id' => $cid, 'X-Naver-Client-Secret' => $sec, 'Content-Type' => 'application/json']);
        if ($err) return ['ok' => false, 'note' => "네이버페이 오류: {$err} (라이브 검증 시 매핑 최종확정)"];
        if ($code >= 400) return ['ok' => false, 'note' => '네이버페이 HTTP ' . $code . ' (자격증명/권한 확인)'];
        $list = $body['body']['list'] ?? $body['data'] ?? $body['settlements'] ?? (is_array($body) ? $body : []);
        $rows = [];
        foreach ((array)$list as $d) {
            if (!is_array($d)) continue;
            $gross = (float)($d['totalPaymentAmount'] ?? $d['paymentAmount'] ?? $d['amount'] ?? 0);
            $fee = (float)($d['payCommissionAmount'] ?? $d['commissionAmount'] ?? $d['fee'] ?? 0);
            $rows[] = [
                'txn_id' => (string)($d['paymentId'] ?? $d['merchantPayKey'] ?? ('npay_' . substr(hash('sha256', json_encode($d)), 0, 24))),
                'type' => (string)($d['admissionType'] ?? 'payment'), 'gross' => $gross, 'fee' => $fee,
                'net' => (float)($d['settleAmount'] ?? $d['payOutAmount'] ?? ($gross - $fee)),
                'currency' => 'KRW', 'status' => (string)($d['settleStatus'] ?? $d['admissionState'] ?? 'settled'),
                'txn_at' => (string)($d['settleExpectDate'] ?? $d['admissionYmdt'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** 카카오페이 — 지급(정산) 내역. Authorization: SECRET_KEY/KakaoAK. KRW. 방어적 매핑. */
    private static function fetchKakaoPay(string $sk, string $cid): array
    {
        $auth = (strncmp($sk, 'SECRET', 6) === 0 || strncmp($sk, 'DEV', 3) === 0) ? ('SECRET_KEY ' . $sk) : ('KakaoAK ' . $sk);
        $url = 'https://open-api.kakaopay.com/online/v1/payment/settlement?' . http_build_query(['cid' => ($cid ?: 'TC0ONETIME'), 'from' => gmdate('Ymd', time() - 30 * 86400), 'to' => gmdate('Ymd')]);
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => $auth, 'Content-Type' => 'application/json']);
        if ($err) return ['ok' => false, 'note' => "카카오페이 오류: {$err} (라이브 검증 시 매핑 최종확정)"];
        if ($code >= 400) return ['ok' => false, 'note' => '카카오페이 HTTP ' . $code . ' (정산 권한/CID 확인)'];
        $list = $body['settlements'] ?? $body['list'] ?? $body['data'] ?? (is_array($body) ? $body : []);
        $rows = [];
        foreach ((array)$list as $d) {
            if (!is_array($d)) continue;
            $gross = (float)($d['amount']['total'] ?? $d['total_amount'] ?? $d['amount'] ?? 0);
            $fee = (float)($d['commission'] ?? $d['fee'] ?? 0);
            $rows[] = [
                'txn_id' => (string)($d['tid'] ?? $d['aid'] ?? ('kakaopay_' . substr(hash('sha256', json_encode($d)), 0, 24))),
                'type' => (string)($d['payment_method_type'] ?? 'payment'), 'gross' => $gross, 'fee' => $fee,
                'net' => (float)($d['settlement_amount'] ?? ($gross - $fee)), 'currency' => 'KRW',
                'status' => (string)($d['status'] ?? 'settled'), 'txn_at' => (string)($d['settlement_date'] ?? $d['approved_at'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** KG이니시스 — INIAPI 정산/거래 조회(mid + SHA256 sign). 방어적 매핑. */
    private static function fetchInicis(string $mid, string $sign): array
    {
        $ts = (string)(time() * 1000);
        $data = ['mid' => $mid, 'type' => 'settle', 'from' => gmdate('Ymd', time() - 30 * 86400), 'to' => gmdate('Ymd'), 'timestamp' => $ts];
        $hashData = hash('sha512', $sign . $mid . $ts);
        [$code, $body] = self::httpPost('https://iniapi.inicis.com/api/v1/settlement', http_build_query(array_merge($data, ['hashData' => $hashData])), ['Content-Type' => 'application/x-www-form-urlencoded']);
        if ($code >= 400 || $code === 0) return ['ok' => false, 'note' => '이니시스 HTTP ' . $code . ' (MID/SignKey 확인·라이브 검증 시 매핑 최종확정)'];
        $list = $body['data'] ?? $body['list'] ?? $body['settleList'] ?? (is_array($body) ? $body : []);
        $rows = [];
        foreach ((array)$list as $d) {
            if (!is_array($d)) continue;
            $gross = (float)($d['price'] ?? $d['amount'] ?? $d['paySum'] ?? 0);
            $fee = (float)($d['fee'] ?? $d['commission'] ?? 0);
            $rows[] = [
                'txn_id' => (string)($d['tid'] ?? $d['MOID'] ?? ('inicis_' . substr(hash('sha256', json_encode($d)), 0, 24))),
                'type' => (string)($d['payMethod'] ?? 'payment'), 'gross' => $gross, 'fee' => $fee,
                'net' => (float)($d['settleAmt'] ?? ($gross - $fee)), 'currency' => 'KRW',
                'status' => (string)($d['status'] ?? 'settled'), 'txn_at' => (string)($d['settleDate'] ?? $d['applDate'] ?? ''),
            ];
        }
        return ['ok' => true, 'rows' => $rows];
    }

    /** NHN KCP — 정산/거래내역 조회(site_cd + key). 방어적 매핑. */
    private static function fetchKcp(string $site, string $key): array
    {
        $data = ['site_cd' => $site, 'kcp_api_key' => $key, 'req_tx' => 'settle_list', 'st_date' => gmdate('Ymd', time() - 30 * 86400), 'en_date' => gmdate('Ymd')];
        [$code, $body] = self::httpPost('https://spl.kcp.co.kr/gw/enc/v1/payment', http_build_query($data), ['Content-Type' => 'application/x-www-form-urlencoded']);
        if ($code >= 400 || $code === 0) return ['ok' => false, 'note' => 'KCP HTTP ' . $code . ' (Site Code/Key 확인·라이브 검증 시 매핑 최종확정)'];
        $list = $body['data'] ?? $body['list'] ?? $body['settle_list'] ?? (is_array($body) ? $body : []);
        $rows = [];
        foreach ((array)$list as $d) {
            if (!is_array($d)) continue;
            $gross = (float)($d['amount'] ?? $d['tot_amount'] ?? $d['good_mny'] ?? 0);
            $fee = (float)($d['fee'] ?? $d['commission'] ?? 0);
            $rows[] = [
                'txn_id' => (string)($d['tno'] ?? $d['order_no'] ?? ('kcp_' . substr(hash('sha256', json_encode($d)), 0, 24))),
                'type' => (string)($d['pay_method'] ?? 'payment'), 'gross' => $gross, 'fee' => $fee,
                'net' => (float)($d['settle_amount'] ?? ($gross - $fee)), 'currency' => 'KRW',
                'status' => (string)($d['status'] ?? 'settled'), 'txn_at' => (string)($d['settle_date'] ?? $d['app_time'] ?? ''),
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
            ? "INSERT INTO pg_settlement(tenant_id,provider,txn_id,type,gross,fee,net,currency,status,txn_at,order_ref,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE type=VALUES(type),gross=VALUES(gross),fee=VALUES(fee),net=VALUES(net),currency=VALUES(currency),status=VALUES(status),txn_at=VALUES(txn_at),order_ref=VALUES(order_ref)"
            : "INSERT INTO pg_settlement(tenant_id,provider,txn_id,type,gross,fee,net,currency,status,txn_at,order_ref,created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(tenant_id,provider,txn_id) DO UPDATE SET type=excluded.type,gross=excluded.gross,fee=excluded.fee,net=excluded.net,currency=excluded.currency,status=excluded.status,txn_at=excluded.txn_at,order_ref=excluded.order_ref";
        try {
            $pdo->prepare($sql)->execute([
                $tenant, $provider, (string)$r['txn_id'], (string)($r['type'] ?? ''),
                (float)($r['gross'] ?? 0), (float)($r['fee'] ?? 0), (float)($r['net'] ?? 0),
                (string)($r['currency'] ?? ''), (string)($r['status'] ?? ''), (string)($r['txn_at'] ?? ''),
                (string)($r['order_ref'] ?? ''), $now,
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
