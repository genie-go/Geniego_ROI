<?php
/**
 * BillingMethod — 광고비 결제수단(카드) 관리 + 관리형 지출 월렛(빌링키 청구).
 *
 * 모델: 사용자가 재무·정산 메뉴에서 카드를 Toss 빌링키로 토큰화 등록(카드번호 비저장, PCI-safe).
 *       마케팅 자동화가 광고를 집행하면, 당월 집행 광고비를 그 카드로 **월 예산 한도 내에서만** 청구하고
 *       ad_spend_ledger 에 원장 기록한다. 당월 누적 청구(MTD)는 설정한 월 예산을 절대 넘지 않는다.
 *
 * 보안/격리: 테넌트는 인증된 세션(user_session) 또는 api_key 미들웨어(auth_tenant)로만 해석.
 *           데모 테넌트는 실 카드 등록·청구 불가(명시 메시지). 빌링키는 Genie\Crypto(AES-256-GCM)로 암호화 저장.
 *
 * 실청구 활성: Toss 빌링 시크릿(TOSS_SECRET_KEY) + 유효 빌링키가 있을 때만 실제 카드 청구.
 *            미설정 시 원장은 'pending'으로 정직 기록(실청구 0). (레포 graceful drop-in 패턴)
 */

declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\Crypto;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

final class BillingMethod
{
    private const TOSS_BILLING_BASE = 'https://api.tosspayments.com/v1/billing';

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
    private static function ym(): string { return gmdate('Y-m'); }

    private static function tossSecretKey(): string
    {
        $k = getenv('TOSS_SECRET_KEY');
        return ($k !== false && $k !== '') ? (string)$k : '';
    }

    private static function tossClientKey(): string
    {
        $k = getenv('TOSS_CLIENT_KEY');
        return ($k !== false && $k !== '') ? (string)$k : '';
    }

    /* ── 테넌트 해석: 미들웨어 auth_tenant > 세션(Bearer/쿠키) > 'demo' (ChannelCreds 정합) ── */
    private static function tenantId(Request $request): string
    {
        $attr = $request->getAttribute('auth_tenant', '');
        if ($attr !== '') return (string)$attr;
        $st = self::sessionTenant($request);
        return $st !== '' ? $st : 'demo';
    }

    private static function sessionTenant(Request $request): string
    {
        $token = '';
        $auth  = $request->getHeaderLine('Authorization');
        if (strpos($auth, 'Bearer ') === 0) {
            $t = substr($auth, 7);
            if ($t !== '' && !str_starts_with($t, 'local_demo_')) $token = $t;
        }
        if ($token === '') {
            $cookies = $request->getCookieParams();
            $token   = $cookies['genie_session'] ?? '';
        }
        if ($token === '') return '';
        try {
            $pdo  = Db::pdo();
            $now  = self::now();
            $stmt = $pdo->prepare(
                'SELECT u.id, u.tenant_id, u.parent_user_id FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1 LIMIT 1'
            );
            $stmt->execute([$token, $now]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return '';
            $tid = trim((string)($row['tenant_id'] ?? ''));
            if ($tid !== '') return $tid;
            $pid = (int)($row['parent_user_id'] ?? 0);
            if ($pid > 0) {
                $ps = $pdo->prepare('SELECT tenant_id FROM app_user WHERE id = ? LIMIT 1');
                $ps->execute([$pid]);
                $ptid = trim((string)($ps->fetchColumn() ?: ''));
                return $ptid !== '' ? $ptid : ('acct_' . $pid);
            }
            return 'acct_' . (int)$row['id'];
        } catch (\Throwable $e) {
            return '';
        }
    }

    private static function isDemoTenant(string $tenant): bool
    {
        return $tenant === '' || $tenant === 'demo' || $tenant === 'unknown' || str_starts_with($tenant, 'demo');
    }

    /** 테넌트별 안정적 customerKey (Toss requestBillingAuth ↔ authorize 동일 키 요구). PII 비포함. */
    private static function customerKeyFor(string $tenant): string
    {
        return 'gr_' . substr(hash('sha256', 'billing_cust|' . $tenant), 0, 40);
    }

    /* ── 스키마: billing_method(카드 토큰), ad_spend_ledger(청구 원장) ── */
    public static function ensureTables(\PDO $pdo): void
    {
        $isMy = (stripos((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME), 'mysql') !== false);
        if ($isMy) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS billing_method (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                provider VARCHAR(32) NOT NULL DEFAULT 'toss',
                billing_key TEXT NULL,
                customer_key VARCHAR(120) NULL,
                card_last4 VARCHAR(8) NULL,
                card_issuer VARCHAR(60) NULL,
                card_type VARCHAR(30) NULL,
                owner_name VARCHAR(120) NULL,
                is_default TINYINT(1) NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at VARCHAR(40) NULL,
                updated_at VARCHAR(40) NULL,
                INDEX idx_bm_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $pdo->exec("CREATE TABLE IF NOT EXISTS ad_spend_ledger (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL,
                ym VARCHAR(7) NOT NULL,
                campaign_id BIGINT NOT NULL DEFAULT 0,
                channel VARCHAR(60) NULL,
                amount BIGINT NOT NULL DEFAULT 0,
                billing_method_id BIGINT NOT NULL DEFAULT 0,
                payment_key VARCHAR(120) NULL,
                order_id VARCHAR(120) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reason VARCHAR(255) NULL,
                created_at VARCHAR(40) NULL,
                INDEX idx_asl_tenant_ym (tenant_id, ym)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS billing_method (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                provider TEXT NOT NULL DEFAULT 'toss',
                billing_key TEXT,
                customer_key TEXT,
                card_last4 TEXT,
                card_issuer TEXT,
                card_type TEXT,
                owner_name TEXT,
                is_default INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT,
                updated_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS ad_spend_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                ym TEXT NOT NULL,
                campaign_id INTEGER NOT NULL DEFAULT 0,
                channel TEXT,
                amount INTEGER NOT NULL DEFAULT 0,
                billing_method_id INTEGER NOT NULL DEFAULT 0,
                payment_key TEXT,
                order_id TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                reason TEXT,
                created_at TEXT
            )");
        }
    }

    private static function maskCard(array $card): array
    {
        $num = (string)($card['number'] ?? '');
        $last4 = '';
        if ($num !== '') { $digits = preg_replace('/\D/', '', $num); $last4 = substr($digits, -4); }
        return [
            'last4'  => $last4,
            'issuer' => (string)($card['issuerCode'] ?? $card['company'] ?? $card['acquirerCode'] ?? ''),
            'type'   => (string)($card['cardType'] ?? ''),
            'owner'  => (string)($card['ownerType'] ?? ''),
        ];
    }

    /* ── Toss HTTP (Basic secretKey:) ── */
    private static function tossPost(string $url, array $body): array
    {
        $sk = self::tossSecretKey();
        if ($sk === '') return ['ok' => false, 'needs_config' => true, 'error' => 'Toss 빌링 시크릿(TOSS_SECRET_KEY) 미설정'];
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => [
                'Authorization: Basic ' . base64_encode($sk . ':'),
                'Content-Type: application/json',
            ],
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($raw === false) return ['ok' => false, 'error' => 'Toss 연결 실패: ' . $err];
        $data = json_decode((string)$raw, true);
        if (!is_array($data)) return ['ok' => false, 'error' => 'Toss 응답 파싱 실패', 'http' => $code];
        if ($code >= 200 && $code < 300) return ['ok' => true, 'data' => $data];
        return ['ok' => false, 'http' => $code, 'error' => (string)($data['message'] ?? 'Toss 오류'), 'code' => (string)($data['code'] ?? '')];
    }

    /* ─────────────────────────── 엔드포인트 ─────────────────────────── */

    /** GET /v427/billing/customer-key — 프론트 requestBillingAuth 용 안정 customerKey + Toss 클라이언트 키·설정여부. */
    public static function customerKey(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        $configured = self::tossClientKey() !== '' && self::tossSecretKey() !== '';
        if (self::isDemoTenant($tenant)) {
            return self::json($res, ['ok' => true, 'demo' => true, 'customer_key' => '', 'client_key' => '', 'configured' => $configured]);
        }
        return self::json($res, ['ok' => true, 'customer_key' => self::customerKeyFor($tenant),
            'client_key' => self::tossClientKey(), 'configured' => $configured]);
    }

    /** GET /v427/billing/methods — 등록된 카드(마스킹) 목록. */
    public static function methods(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        try {
            $pdo = Db::pdo();
            self::ensureTables($pdo);
            if (self::isDemoTenant($tenant)) {
                // 데모: 가상 카드 1장(읽기 전용, 실청구 불가)
                return self::json($res, ['ok' => true, 'demo' => true, 'methods' => [[
                    'id' => 0, 'card_last4' => '4242', 'card_issuer' => '체험카드', 'card_type' => '신용',
                    'is_default' => 1, 'status' => 'active', 'created_at' => self::now(),
                ]]]);
            }
            $st = $pdo->prepare("SELECT id, provider, card_last4, card_issuer, card_type, owner_name, is_default, status, created_at FROM billing_method WHERE tenant_id=? AND status<>'deleted' ORDER BY is_default DESC, id DESC");
            $st->execute([$tenant]);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            return self::json($res, ['ok' => true, 'methods' => $rows]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /** POST /v427/billing/methods/issue — Toss 빌링키 발급(authKey→billingKey) 후 저장. */
    public static function issue(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        if (self::isDemoTenant($tenant)) {
            return self::json($res, ['ok' => false, 'demo' => true,
                'message' => '체험 데모 모드에서는 결제수단을 등록할 수 없습니다. 실제 운영 계정(구독 플랜)으로 로그인 후 등록해 주세요.'], 200);
        }
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $body = $d; }
        $authKey = trim((string)($body['authKey'] ?? ''));
        $customerKey = trim((string)($body['customerKey'] ?? ''));
        if ($authKey === '' || $customerKey === '') {
            return self::json($res, ['ok' => false, 'error' => 'authKey/customerKey 누락'], 400);
        }
        if (!hash_equals(self::customerKeyFor($tenant), $customerKey)) {
            return self::json($res, ['ok' => false, 'error' => 'customerKey 불일치'], 403);
        }
        // Toss 빌링키 발급
        $r = self::tossPost(self::TOSS_BILLING_BASE . '/authorizations/' . rawurlencode($authKey), ['customerKey' => $customerKey]);
        if (empty($r['ok'])) {
            $msg = !empty($r['needs_config'])
                ? '결제 게이트웨이(Toss)가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.'
                : ('카드 등록 실패: ' . (string)($r['error'] ?? ''));
            return self::json($res, ['ok' => false, 'needs_config' => !empty($r['needs_config']), 'error' => $msg], 200);
        }
        $data = (array)$r['data'];
        $billingKey = (string)($data['billingKey'] ?? '');
        if ($billingKey === '') return self::json($res, ['ok' => false, 'error' => '빌링키 미수신'], 200);
        $card = self::maskCard((array)($data['card'] ?? []));
        $now = self::now();
        try {
            $pdo = Db::pdo();
            self::ensureTables($pdo);
            // 기존 default 해제 → 신규를 default
            $pdo->prepare("UPDATE billing_method SET is_default=0 WHERE tenant_id=?")->execute([$tenant]);
            $enc = Crypto::encrypt($billingKey);
            $st = $pdo->prepare("INSERT INTO billing_method(tenant_id,provider,billing_key,customer_key,card_last4,card_issuer,card_type,owner_name,is_default,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,1,'active',?,?)");
            $st->execute([$tenant, 'toss', $enc, $customerKey, $card['last4'], $card['issuer'], $card['type'], $card['owner'], $now, $now]);
            $id = (int)$pdo->lastInsertId();
            return self::json($res, ['ok' => true, 'id' => $id, 'card_last4' => $card['last4'], 'card_issuer' => $card['issuer']]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /** POST /v427/billing/methods/{id}/default — 기본 결제수단 지정. */
    public static function setDefault(Request $req, Response $res, array $args): Response
    {
        $tenant = self::tenantId($req);
        if (self::isDemoTenant($tenant)) return self::json($res, ['ok' => false, 'demo' => true, 'message' => '체험 데모 모드에서는 변경할 수 없습니다.'], 200);
        $id = (int)($args['id'] ?? 0);
        try {
            $pdo = Db::pdo(); self::ensureTables($pdo);
            $chk = $pdo->prepare("SELECT id FROM billing_method WHERE id=? AND tenant_id=? AND status='active'");
            $chk->execute([$id, $tenant]);
            if (!$chk->fetchColumn()) return self::json($res, ['ok' => false, 'error' => '결제수단을 찾을 수 없습니다.'], 404);
            $pdo->prepare("UPDATE billing_method SET is_default=0 WHERE tenant_id=?")->execute([$tenant]);
            $pdo->prepare("UPDATE billing_method SET is_default=1, updated_at=? WHERE id=? AND tenant_id=?")->execute([self::now(), $id, $tenant]);
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /** DELETE /v427/billing/methods/{id} — 결제수단 삭제(soft). */
    public static function remove(Request $req, Response $res, array $args): Response
    {
        $tenant = self::tenantId($req);
        if (self::isDemoTenant($tenant)) return self::json($res, ['ok' => false, 'demo' => true, 'message' => '체험 데모 모드에서는 삭제할 수 없습니다.'], 200);
        $id = (int)($args['id'] ?? 0);
        try {
            $pdo = Db::pdo(); self::ensureTables($pdo);
            $st = $pdo->prepare("UPDATE billing_method SET status='deleted', is_default=0, billing_key=NULL, updated_at=? WHERE id=? AND tenant_id=?");
            $st->execute([self::now(), $id, $tenant]);
            // default 가 사라졌으면 최신 active 를 default 승격
            $cnt = $pdo->prepare("SELECT COUNT(*) FROM billing_method WHERE tenant_id=? AND is_default=1 AND status='active'");
            $cnt->execute([$tenant]);
            if ((int)$cnt->fetchColumn() === 0) {
                $nx = $pdo->prepare("SELECT id FROM billing_method WHERE tenant_id=? AND status='active' ORDER BY id DESC LIMIT 1");
                $nx->execute([$tenant]);
                $nid = (int)($nx->fetchColumn() ?: 0);
                if ($nid > 0) $pdo->prepare("UPDATE billing_method SET is_default=1 WHERE id=?")->execute([$nid]);
            }
            return self::json($res, ['ok' => true]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /** GET /v427/billing/budget-status — 당월 청구 누적(MTD) vs 월 예산 한도 + 카드 등록 여부. */
    public static function budgetStatus(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        $demo = self::isDemoTenant($tenant);
        try {
            $pdo = Db::pdo(); self::ensureTables($pdo);
            $ym = self::ym();
            $hasMethod = $demo ? true : self::hasActiveMethod($pdo, $tenant);
            $budget = self::monthlyBudget($pdo, $tenant);
            $charged = self::mtdCharged($pdo, $tenant, $ym);
            $remaining = max(0, $budget - $charged);
            return self::json($res, ['ok' => true, 'demo' => $demo, 'ym' => $ym,
                'has_method' => $hasMethod, 'monthly_budget' => $budget,
                'mtd_charged' => $charged, 'remaining' => $remaining,
                'cap_hit' => ($budget > 0 && $charged >= $budget)]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /** GET /v427/billing/ledger — 당월 청구 원장(최근). */
    public static function ledger(Request $req, Response $res): Response
    {
        $tenant = self::tenantId($req);
        if (self::isDemoTenant($tenant)) return self::json($res, ['ok' => true, 'demo' => true, 'rows' => []]);
        try {
            $pdo = Db::pdo(); self::ensureTables($pdo);
            $st = $pdo->prepare("SELECT id, ym, campaign_id, channel, amount, status, reason, payment_key, created_at FROM ad_spend_ledger WHERE tenant_id=? ORDER BY id DESC LIMIT 100");
            $st->execute([$tenant]);
            return self::json($res, ['ok' => true, 'rows' => $st->fetchAll(\PDO::FETCH_ASSOC) ?: []]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }
    }

    /* ─────────────────────── 내부 헬퍼(AutoCampaign 연동) ─────────────────────── */

    public static function hasActiveMethod(\PDO $pdo, string $tenant): bool
    {
        try {
            self::ensureTables($pdo);
            $st = $pdo->prepare("SELECT 1 FROM billing_method WHERE tenant_id=? AND status='active' AND billing_key IS NOT NULL LIMIT 1");
            $st->execute([$tenant]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    /** 당월 등록된 활성 캠페인 예산 합(=월 마케팅 예산 한도). monthly 캠페인 기준. */
    private static function monthlyBudget(\PDO $pdo, string $tenant): int
    {
        try {
            $st = $pdo->prepare("SELECT COALESCE(SUM(budget),0) FROM auto_campaign WHERE tenant_id=? AND status IN('active','pending','running') AND period='monthly'");
            $st->execute([$tenant]);
            return (int)$st->fetchColumn();
        } catch (\Throwable $e) { return 0; }
    }

    /** 당월 카드 청구 누적(charged+pending = 약정 금액). */
    private static function mtdCharged(\PDO $pdo, string $tenant, string $ym): int
    {
        try {
            $st = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM ad_spend_ledger WHERE tenant_id=? AND ym=? AND status IN('charged','pending')");
            $st->execute([$tenant, $ym]);
            return (int)$st->fetchColumn();
        } catch (\Throwable $e) { return 0; }
    }

    /**
     * 관리형 지출 정산: 당월 집행 광고비($mtdSpend)를 카드로 청구하되, 누적 청구가 월 예산($budget)을
     * 절대 넘지 않도록 캡. delta = min(spend, budget) - alreadyCharged 만 신규 청구.
     * Toss 빌링키 미설정/청구 실패 시 원장 'pending' 으로 정직 기록(실청구 0). 절대 throw 안 함.
     * @return array{charged:int, status:string}
     */
    public static function settleManagedSpend(\PDO $pdo, string $tenant, float $mtdSpend, int $budget, int $campaignId = 0, string $channel = ''): array
    {
        try {
            if (self::isDemoTenant($tenant) || $budget <= 0) return ['charged' => 0, 'status' => 'skip'];
            self::ensureTables($pdo);
            $ym = self::ym();
            $target = (int)min((float)$budget, max(0.0, $mtdSpend));   // 캡: 예산 초과 금지
            $already = self::mtdCharged($pdo, $tenant, $ym);
            $delta = $target - $already;
            if ($delta < 1000) return ['charged' => 0, 'status' => 'noop']; // 1000원 미만 변동 무시(노이즈)

            // 기본 결제수단
            $bm = $pdo->prepare("SELECT id, billing_key, customer_key FROM billing_method WHERE tenant_id=? AND status='active' AND billing_key IS NOT NULL ORDER BY is_default DESC, id DESC LIMIT 1");
            $bm->execute([$tenant]);
            $method = $bm->fetch(\PDO::FETCH_ASSOC);
            $now = self::now();
            $orderId = 'ADS-' . substr(hash('sha256', $tenant . '|' . $ym . '|' . microtime(true)), 0, 24);

            if (!$method) {
                // 카드 미등록 → 원장 pending(미청구). 집행 게이트가 별도 차단.
                self::insertLedger($pdo, $tenant, $ym, $campaignId, $channel, $delta, 0, '', $orderId, 'pending', '결제수단 미등록(미청구)', $now);
                return ['charged' => 0, 'status' => 'no_method'];
            }

            $billingKey = Crypto::decrypt((string)$method['billing_key']);
            $customerKey = (string)$method['customer_key'];
            if ($billingKey === '' || self::tossSecretKey() === '') {
                self::insertLedger($pdo, $tenant, $ym, $campaignId, $channel, $delta, (int)$method['id'], '', $orderId, 'pending', 'Toss 빌링 미설정(미청구 약정)', $now);
                return ['charged' => 0, 'status' => 'pending'];
            }

            // 실제 카드 청구
            $r = self::tossPost(self::TOSS_BILLING_BASE . '/' . rawurlencode($billingKey), [
                'customerKey' => $customerKey,
                'amount' => $delta,
                'orderId' => $orderId,
                'orderName' => 'GeniegoROI 광고비 ' . $ym,
            ]);
            if (!empty($r['ok'])) {
                $pk = (string)(($r['data']['paymentKey'] ?? '') ?: '');
                self::insertLedger($pdo, $tenant, $ym, $campaignId, $channel, $delta, (int)$method['id'], $pk, $orderId, 'charged', '관리형 광고비 청구', $now);
                return ['charged' => $delta, 'status' => 'charged'];
            }
            self::insertLedger($pdo, $tenant, $ym, $campaignId, $channel, $delta, (int)$method['id'], '', $orderId, 'failed', '청구 실패: ' . mb_substr((string)($r['error'] ?? ''), 0, 180), $now);
            return ['charged' => 0, 'status' => 'failed'];
        } catch (\Throwable $e) {
            return ['charged' => 0, 'status' => 'error'];
        }
    }

    private static function insertLedger(\PDO $pdo, string $tenant, string $ym, int $campaignId, string $channel, int $amount, int $methodId, string $paymentKey, string $orderId, string $status, string $reason, string $now): void
    {
        try {
            $pdo->prepare("INSERT INTO ad_spend_ledger(tenant_id,ym,campaign_id,channel,amount,billing_method_id,payment_key,order_id,status,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$tenant, $ym, $campaignId, mb_substr($channel, 0, 60), $amount, $methodId, $paymentKey, $orderId, $status, mb_substr($reason, 0, 255), $now]);
        } catch (\Throwable $e) {}
    }
}
