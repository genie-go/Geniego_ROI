<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * Paddle Billing v2 Handler
 *
 * Design principles:
 * 1. Webhook is the authoritative source of truth — NOT frontend redirect.
 * 2. Idempotent: duplicate events (same notification_id) are silently skipped.
 * 3. occurred_at ordering: stale events skipped if newer event already processed.
 * 4. Sandbox / Live split via PADDLE_ENV env var.
 * 5. All raw payloads stored in paddle_events for audit / replay.
 * 6. Webhook signature: HMAC-SHA256 (Paddle Billing v2 standard).
 * 7. User plan activated/deactivated in app_user on subscription events.
 *
 * Environment variables:
 *   PADDLE_ENV            = sandbox | live
 *   PADDLE_SECRET_KEY     = pdl_seck_xxx  (server-side, for API calls)
 *   PADDLE_CLIENT_TOKEN   = test_xxx      (client-side, returned to frontend)
 *   PADDLE_WEBHOOK_SECRET = pdch_xxx      (from Paddle > Notifications > endpoint)
 *
 * Paddle Billing v2 API base: https://api.paddle.com (live) | https://sandbox-api.paddle.com (sandbox)
 */
class Paddle
{
    // ── Config ────────────────────────────────────────────────────────────────

    private static function env(): string
    {
        return getenv('PADDLE_ENV') ?: 'sandbox';
    }

    private static function secretKey(): string
    {
        return (string)(getenv('PADDLE_SECRET_KEY') ?: '');
    }

    private static function clientToken(): string
    {
        return (string)(getenv('PADDLE_CLIENT_TOKEN') ?: '');
    }

    private static function webhookSecret(): string
    {
        return (string)(getenv('PADDLE_WEBHOOK_SECRET') ?: '');
    }

    private static function apiBase(): string
    {
        return self::env() === 'live'
            ? 'https://api.paddle.com'
            : 'https://sandbox-api.paddle.com';
    }

    // ── DB helper (reuse central Db.php) ──────────────────────────────────────

    private static function db(): \PDO
    {
        return Db::pdo();
    }

    private static function json(Response $res, mixed $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    // ── Schema migration ──────────────────────────────────────────────────────

    public static function migrate(Request $req, Response $res): Response
    {
        $db     = self::db();
        $driver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        $isMySQL = $driver === 'mysql';

        if ($isMySQL) {
            $db->exec("
                CREATE TABLE IF NOT EXISTS paddle_events (
                    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    notification_id  VARCHAR(100) NOT NULL,
                    event_type       VARCHAR(100) NOT NULL,
                    occurred_at      VARCHAR(32)  NOT NULL,
                    payload          LONGTEXT     NOT NULL,
                    processed        TINYINT(1)   NOT NULL DEFAULT 0,
                    error            TEXT         NULL,
                    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_notification_id (notification_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS paddle_subscriptions (
                    id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_email             VARCHAR(255) NOT NULL,
                    paddle_subscription_id VARCHAR(100) NOT NULL,
                    paddle_customer_id     VARCHAR(100) NULL,
                    price_id               VARCHAR(100) NOT NULL DEFAULT '',
                    product_id             VARCHAR(100) NOT NULL DEFAULT '',
                    plan_name              VARCHAR(100) NOT NULL DEFAULT '',
                    status                 VARCHAR(50)  NOT NULL DEFAULT 'active',
                    billing_cycle          VARCHAR(20)  NOT NULL DEFAULT 'monthly',
                    current_period_end     VARCHAR(32)  NULL,
                    currency               VARCHAR(10)  NOT NULL DEFAULT 'USD',
                    unit_price             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    cancelled_at           VARCHAR(32)  NULL,
                    last_event_at          VARCHAR(32)  NOT NULL,
                    updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_subscription_id (paddle_subscription_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS paddle_audit_log (
                    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    ref_id      VARCHAR(100) NOT NULL,
                    action      VARCHAR(100) NOT NULL,
                    detail      TEXT         NULL,
                    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        } else {
            // SQLite
            $db->exec("
                CREATE TABLE IF NOT EXISTS paddle_events (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    notification_id TEXT    NOT NULL UNIQUE,
                    event_type      TEXT    NOT NULL,
                    occurred_at     TEXT    NOT NULL,
                    payload         TEXT    NOT NULL,
                    processed       INTEGER NOT NULL DEFAULT 0,
                    error           TEXT,
                    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
                );
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS paddle_subscriptions (
                    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_email             TEXT NOT NULL,
                    paddle_subscription_id TEXT NOT NULL UNIQUE,
                    paddle_customer_id     TEXT,
                    price_id               TEXT NOT NULL DEFAULT '',
                    product_id             TEXT NOT NULL DEFAULT '',
                    plan_name              TEXT NOT NULL DEFAULT '',
                    status                 TEXT NOT NULL DEFAULT 'active',
                    billing_cycle          TEXT NOT NULL DEFAULT 'monthly',
                    current_period_end     TEXT,
                    currency               TEXT NOT NULL DEFAULT 'USD',
                    unit_price             REAL NOT NULL DEFAULT 0.0,
                    cancelled_at           TEXT,
                    last_event_at          TEXT NOT NULL,
                    updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
                    created_at             TEXT NOT NULL DEFAULT (datetime('now'))
                );
            ");
            $db->exec("
                CREATE TABLE IF NOT EXISTS paddle_audit_log (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    ref_id     TEXT NOT NULL,
                    action     TEXT NOT NULL,
                    detail     TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            ");
        }

        return self::json($res, [
            'ok'     => true,
            'tables' => ['paddle_events', 'paddle_subscriptions', 'paddle_audit_log'],
            'driver' => $driver,
        ]);
    }

    // ── Public config endpoint (called by frontend to get client token) ────────

    /**
     * GET /v423/paddle/config
     * Returns: { env, clientToken }
     * Safe to expose — client token is NOT a secret.
     */
    public static function config(Request $req, Response $res): Response
    {
        return self::json($res, [
            'ok'          => true,
            'env'         => self::env(),
            'clientToken' => self::clientToken(),
        ]);
    }

    // ── Plans ─────────────────────────────────────────────────────────────────

    public static function plans(Request $req, Response $res): Response
    {
        $plans = [
            [
                'id'               => 'starter',
                'name'             => 'Starter',
                'price_usd'        => 49,
                'price_annual_usd' => 39,   // ~20% off
                'price_id_monthly' => getenv('PADDLE_PRICE_STARTER_MONTHLY') ?: '',
                'price_id_annual'  => getenv('PADDLE_PRICE_STARTER_ANNUAL')  ?: '',
                'features'         => [
                    '3 sales channels',
                    'Basic WMS (1 warehouse)',
                    'Marketing analytics',
                    'Email support (48h)',
                    '10,000 API calls/month',
                ],
                'limits' => ['warehouses' => 1, 'channels' => 3, 'users' => 2],
            ],
            [
                'id'               => 'pro',
                'name'             => 'Pro',
                'price_usd'        => 149,
                'price_annual_usd' => 119,
                'price_id_monthly' => getenv('PADDLE_PRICE_PRO_MONTHLY') ?: '',
                'price_id_annual'  => getenv('PADDLE_PRICE_PRO_ANNUAL')  ?: '',
                'features'         => [
                    'Unlimited channels',
                    'Full WMS (unlimited warehouses)',
                    'AI Marketing Intelligence',
                    'Influencer evaluation engine',
                    'Commercial invoice auto-generation',
                    'Priority support (8h)',
                    '500,000 API calls/month',
                ],
                'limits' => ['warehouses' => -1, 'channels' => -1, 'users' => 10],
            ],
            [
                'id'               => 'enterprise',
                'name'             => 'Enterprise',
                'price_usd'        => null,
                'price_annual_usd' => null,
                'price_id_monthly' => '',
                'price_id_annual'  => '',
                'features'         => [
                    'Everything in Pro',
                    'Custom AI model training',
                    'Dedicated account manager',
                    'SLA 99.9% uptime',
                    'Custom integrations & webhooks',
                    'Unlimited API calls',
                    'On-premise deployment option',
                ],
                'limits' => ['warehouses' => -1, 'channels' => -1, 'users' => -1],
            ],
        ];

        return self::json($res, ['ok' => true, 'plans' => $plans, 'env' => self::env()]);
    }

    // ── Current subscription ──────────────────────────────────────────────────

    public static function subscription(Request $req, Response $res): Response
    {
        $user  = $req->getAttribute('user') ?? [];
        $email = $user['email'] ?? '';
        if (!$email) return self::json($res, ['ok' => false, 'error' => 'Unauthenticated'], 401);

        $stmt = self::db()->prepare(
            "SELECT * FROM paddle_subscriptions WHERE user_email = ? ORDER BY created_at DESC LIMIT 1"
        );
        $stmt->execute([$email]);
        $sub = $stmt->fetch(\PDO::FETCH_ASSOC);

        return self::json($res, ['ok' => true, 'subscription' => $sub ?: null]);
    }

    // ── Cancel subscription ───────────────────────────────────────────────────

    public static function cancel(Request $req, Response $res): Response
    {
        $user  = $req->getAttribute('user') ?? [];
        $email = $user['email'] ?? '';
        if (!$email) return self::json($res, ['ok' => false, 'error' => 'Unauthenticated'], 401);

        $db   = self::db();
        $stmt = $db->prepare(
            "SELECT * FROM paddle_subscriptions WHERE user_email = ? AND status = 'active' LIMIT 1"
        );
        $stmt->execute([$email]);
        $sub = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!$sub) return self::json($res, ['ok' => false, 'error' => 'No active subscription'], 404);

        // Paddle Billing v2 cancel: POST /subscriptions/{id}/cancel
        $result = self::paddleApiV2(
            'POST',
            "/subscriptions/{$sub['paddle_subscription_id']}/cancel",
            ['effective_from' => 'next_billing_period']
        );

        if (isset($result['error'])) {
            self::auditLog($sub['paddle_subscription_id'], 'cancel_failed', json_encode($result));
            return self::json($res, ['ok' => false, 'error' => 'Paddle API error', 'detail' => $result], 502);
        }

        self::auditLog($sub['paddle_subscription_id'], 'cancel_requested', "by=$email");
        return self::json($res, ['ok' => true, 'message' => 'Cancellation requested. Confirmation via webhook.']);
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    /**
     * POST /v423/paddle/webhook
     *
     * Paddle Billing v2 sends JSON with header:
     *   Paddle-Signature: ts=<timestamp>;h1=<hmac_sha256_hex>
     *
     * Verify by: HMAC-SHA256(ts + ":" + rawBody, webhookSecret)
     */
    public static function webhook(Request $req, Response $res): Response
    {
        // 1. Read raw body
        $rawBody = (string)$req->getBody();

        // 2. Verify HMAC-SHA256 signature (Paddle Billing v2)
        if (!self::verifySignature($req, $rawBody)) {
            error_log('[Paddle] Invalid webhook signature');
            return self::json($res, ['ok' => false, 'error' => 'Invalid signature'], 400);
        }

        // 3. Parse JSON payload
        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return self::json($res, ['ok' => false, 'error' => 'Invalid JSON body'], 400);
        }

        // 4. Extract Billing v2 fields
        $notificationId = $payload['notification_id'] ?? ($payload['id'] ?? '');
        $eventType      = $payload['event_type']      ?? 'unknown';
        $occurredAt     = $payload['occurred_at']     ?? date('Y-m-d\TH:i:s\Z');
        $data           = $payload['data']            ?? [];

        if (!$notificationId) {
            return self::json($res, ['ok' => false, 'error' => 'Missing notification_id'], 400);
        }

        $db = self::db();

        // 5. Store raw payload (UNIQUE constraint on notification_id = idempotency guard)
        try {
            $db->prepare(
                "INSERT INTO paddle_events (notification_id, event_type, occurred_at, payload, processed)
                 VALUES (?, ?, ?, ?, 0)"
            )->execute([$notificationId, $eventType, $occurredAt, $rawBody]);
        } catch (\Exception $e) {
            if (str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate entry')) {
                return self::json($res, ['ok' => true, 'message' => 'Duplicate notification, skipped']);
            }
            error_log('[Paddle] Store error: ' . $e->getMessage());
            return self::json($res, ['ok' => false, 'error' => 'DB error'], 500);
        }

        // 6. Process event
        try {
            self::processEvent($db, $notificationId, $eventType, $occurredAt, $data);
            $db->prepare("UPDATE paddle_events SET processed = 1 WHERE notification_id = ?")->execute([$notificationId]);
        } catch (\Exception $e) {
            $db->prepare("UPDATE paddle_events SET error = ? WHERE notification_id = ?")
               ->execute([substr($e->getMessage(), 0, 1000), $notificationId]);
            error_log('[Paddle] Process error: ' . $e->getMessage());
        }

        // Always return 200 to Paddle
        return self::json($res, ['ok' => true]);
    }

    // ── Event processor ───────────────────────────────────────────────────────

    private static function processEvent(
        \PDO   $db,
        string $notificationId,
        string $eventType,
        string $occurredAt,
        array  $data
    ): void {
        // 173차 — occurred_at ordering: subscription.* + transaction.* + adjustment.* 모두 stale skip
        // subscription.* : data.id 가 sub id
        // transaction.*  : data.subscription_id 가 sub id (없으면 일회성 결제)
        // adjustment.*   : data.subscription_id (refund 등)
        $subIdForOrdering = '';
        if (str_starts_with($eventType, 'subscription.')) {
            $subIdForOrdering = (string)($data['id'] ?? '');
        } elseif (str_starts_with($eventType, 'transaction.') || str_starts_with($eventType, 'adjustment.')) {
            $subIdForOrdering = (string)($data['subscription_id'] ?? '');
        }

        if ($subIdForOrdering) {
            $stmt = $db->prepare(
                "SELECT last_event_at FROM paddle_subscriptions WHERE paddle_subscription_id = ? LIMIT 1"
            );
            $stmt->execute([$subIdForOrdering]);
            $existing = $stmt->fetch(\PDO::FETCH_ASSOC);

            if ($existing && $existing['last_event_at'] >= $occurredAt) {
                self::auditLog($notificationId, 'skipped_stale',
                    "type=$eventType existing:{$existing['last_event_at']} incoming:$occurredAt");
                return;
            }
        }

        match ($eventType) {
            'subscription.created',
            'subscription.activated'       => self::onSubscriptionActivated($db, $data, $occurredAt),
            'subscription.updated'         => self::onSubscriptionUpdated($db, $data, $occurredAt),
            'subscription.canceled'        => self::onSubscriptionCanceled($db, $data, $occurredAt),
            'subscription.paused'          => self::onSubscriptionPaused($db, $data, $occurredAt),
            'transaction.completed'        => self::onTransactionCompleted($db, $data, $occurredAt),
            'transaction.payment_failed'   => self::onPaymentFailed($db, $data, $occurredAt),
            'transaction.refunded',
            'adjustment.created',
            'adjustment.updated'           => self::onRefunded($db, $data, $occurredAt),
            default                        => self::auditLog($notificationId, 'unhandled_event', $eventType),
        };
    }

    // ── Event handlers (Paddle Billing v2 payload shape) ─────────────────────

    private static function onSubscriptionActivated(\PDO $db, array $d, string $at): void
    {
        $subId    = $d['id']                    ?? '';
        $email    = $d['customer_id']           ?? '';   // resolved below
        $custId   = $d['customer_id']           ?? '';
        $priceId  = $d['items'][0]['price']['id']      ?? '';
        $prodId   = $d['items'][0]['price']['product_id'] ?? '';
        $planName = $d['items'][0]['price']['name']    ?? '';
        $cycle    = $d['billing_cycle']['interval']    ?? 'month';
        $currency = $d['currency_code']                ?? 'USD';
        $amount   = (float)($d['items'][0]['price']['unit_price']['amount'] ?? 0) / 100;
        $periodEnd = $d['current_billing_period']['ends_at'] ?? null;

        // Resolve email from customer metadata or custom_data
        $email = $d['custom_data']['user_email']
              ?? $d['custom_data']['email']
              ?? '';

        // Determine app plan name
        $appPlan = self::resolveAppPlan($priceId, $prodId);

        // [현 차수] 219 검증: ON DUPLICATE KEY 는 MySQL 전용 → SQLite 폴백 백엔드에서 webhook 적재 실패.
        //   driver-aware upsert(SQLite=ON CONFLICT(paddle_subscription_id)). uq_subscription_id 정합.
        $pdriver = $db->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($pdriver === 'mysql') {
            $upsertSql = "
            INSERT INTO paddle_subscriptions
                (user_email, paddle_subscription_id, paddle_customer_id, price_id, product_id,
                 plan_name, status, billing_cycle, current_period_end, currency, unit_price, last_event_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
                user_email=VALUES(user_email), paddle_customer_id=VALUES(paddle_customer_id),
                price_id=VALUES(price_id), product_id=VALUES(product_id),
                plan_name=VALUES(plan_name), status=VALUES(status),
                billing_cycle=VALUES(billing_cycle), current_period_end=VALUES(current_period_end),
                currency=VALUES(currency), unit_price=VALUES(unit_price),
                last_event_at=VALUES(last_event_at), updated_at=CURRENT_TIMESTAMP";
        } else {
            $upsertSql = "
            INSERT INTO paddle_subscriptions
                (user_email, paddle_subscription_id, paddle_customer_id, price_id, product_id,
                 plan_name, status, billing_cycle, current_period_end, currency, unit_price, last_event_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(paddle_subscription_id) DO UPDATE SET
                user_email=excluded.user_email, paddle_customer_id=excluded.paddle_customer_id,
                price_id=excluded.price_id, product_id=excluded.product_id,
                plan_name=excluded.plan_name, status=excluded.status,
                billing_cycle=excluded.billing_cycle, current_period_end=excluded.current_period_end,
                currency=excluded.currency, unit_price=excluded.unit_price,
                last_event_at=excluded.last_event_at, updated_at=CURRENT_TIMESTAMP";
        }
        $db->prepare($upsertSql)->execute([
            $email, $subId, $custId, $priceId, $prodId,
            $planName, 'active',
            str_contains($cycle, 'year') ? 'annual' : 'monthly',
            $periodEnd, $currency, $amount, $at,
        ]);

        // Activate user plan in app_user
        if ($email) {
            // 유료전 현재 플랜 조회
            $prevPlanRow = null;
            try {
                $stmt2 = $db->prepare("SELECT COALESCE(plans,plan,'free') AS plan FROM app_user WHERE email=? LIMIT 1");
                $stmt2->execute([$email]);
                $prevPlanRow = $stmt2->fetch(\PDO::FETCH_ASSOC);
            } catch (\Throwable $e) {}
            $prevPlan = $prevPlanRow['plan'] ?? 'free';

            self::setUserPlan($db, $email, $appPlan, $periodEnd);

            // ─── 유료 전환 자동 쿠폰 발급 (trigger=upgrade) ──────────────────
            try {
                $userRow = $db->query("SELECT id FROM app_user WHERE email = '" . addslashes($email) . "' LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
                if ($userRow) {
                    \Genie\CouponEngine::fire($db, (int)$userRow['id'], $email, 'upgrade', $prevPlan);
                }
            } catch (\Throwable $ce) {
                error_log('[Paddle] CouponEngine upgrade: ' . $ce->getMessage());
            }
        }

        self::auditLog($subId, 'subscription_activated', "email=$email plan=$appPlan");
    }

    private static function onSubscriptionUpdated(\PDO $db, array $d, string $at): void
    {
        $subId     = $d['id']              ?? '';
        $status    = $d['status']          ?? 'active';
        $priceId   = $d['items'][0]['price']['id']      ?? '';
        $prodId    = $d['items'][0]['price']['product_id'] ?? '';
        $planName  = $d['items'][0]['price']['name']    ?? '';
        $cycle     = $d['billing_cycle']['interval']    ?? 'month';
        $periodEnd = $d['current_billing_period']['ends_at'] ?? null;
        $email     = $d['custom_data']['user_email'] ?? $d['custom_data']['email'] ?? '';

        $db->prepare("
            UPDATE paddle_subscriptions SET
                price_id=?, product_id=?, plan_name=?, status=?,
                billing_cycle=?, current_period_end=?, last_event_at=?, updated_at=CURRENT_TIMESTAMP
            WHERE paddle_subscription_id=?
        ")->execute([
            $priceId, $prodId, $planName, $status,
            str_contains($cycle, 'year') ? 'annual' : 'monthly',
            $periodEnd, $at, $subId,
        ]);

        // Sync user plan
        if ($email && $status === 'active') {
            $appPlan = self::resolveAppPlan($priceId, $prodId);
            self::setUserPlan($db, $email, $appPlan, $periodEnd);
        }

        self::auditLog($subId, 'subscription_updated', "status=$status plan=$planName");
    }

    private static function onSubscriptionCanceled(\PDO $db, array $d, string $at): void
    {
        $subId = $d['id'] ?? '';
        $email = $d['custom_data']['user_email'] ?? $d['custom_data']['email'] ?? '';

        $db->prepare("
            UPDATE paddle_subscriptions SET
                status='canceled', cancelled_at=?, last_event_at=?, updated_at=CURRENT_TIMESTAMP
            WHERE paddle_subscription_id=?
        ")->execute([$at, $at, $subId]);

        // Downgrade user to demo
        if ($email) {
            self::setUserPlan($db, $email, 'demo', null);
        }

        self::auditLog($subId, 'subscription_canceled', "email=$email at=$at");
    }

    private static function onSubscriptionPaused(\PDO $db, array $d, string $at): void
    {
        $subId = $d['id'] ?? '';
        $db->prepare("
            UPDATE paddle_subscriptions SET status='paused', last_event_at=?, updated_at=CURRENT_TIMESTAMP
            WHERE paddle_subscription_id=?
        ")->execute([$at, $subId]);
        self::auditLog($subId, 'subscription_paused', "at=$at");
    }

    private static function onTransactionCompleted(\PDO $db, array $d, string $at): void
    {
        $subId     = $d['subscription_id'] ?? '';
        $periodEnd = $d['billing_period']['ends_at'] ?? null;
        $amount    = $d['details']['totals']['total'] ?? 0;
        $currency  = $d['currency_code'] ?? 'USD';
        $email     = $d['custom_data']['user_email'] ?? $d['custom_data']['email'] ?? '';

        if ($subId) {
            $db->prepare("
                UPDATE paddle_subscriptions SET
                    status='active', current_period_end=?, last_event_at=?, updated_at=CURRENT_TIMESTAMP
                WHERE paddle_subscription_id=?
            ")->execute([$periodEnd, $at, $subId]);
        }

        // Re-confirm user plan active
        if ($email) {
            // Look up plan from subscription
            $stmt = $db->prepare("SELECT price_id, product_id FROM paddle_subscriptions WHERE paddle_subscription_id=? LIMIT 1");
            $stmt->execute([$subId]);
            $sub = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($sub) {
                $appPlan = self::resolveAppPlan($sub['price_id'], $sub['product_id']);
                self::setUserPlan($db, $email, $appPlan, $periodEnd);

                // ─── 갱신/연장 자동 쿠폰 발급 (trigger=renewal) ────────────────
                try {
                    $userRow = $db->query("SELECT id FROM app_user WHERE email = '" . addslashes($email) . "' LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
                    if ($userRow) {
                        \Genie\CouponEngine::fire($db, (int)$userRow['id'], $email, 'renewal', $appPlan);
                    }
                } catch (\Throwable $ce) {
                    error_log('[Paddle] CouponEngine renewal: ' . $ce->getMessage());
                }
            }
        }

        self::auditLog($subId ?: 'txn', 'transaction_completed',
            "amount=$amount $currency email=$email");
    }

    private static function onPaymentFailed(\PDO $db, array $d, string $at): void
    {
        $subId = $d['subscription_id'] ?? '';
        if ($subId) {
            $db->prepare("
                UPDATE paddle_subscriptions SET status='past_due', last_event_at=?, updated_at=CURRENT_TIMESTAMP
                WHERE paddle_subscription_id=?
            ")->execute([$at, $subId]);
        }
        self::auditLog($subId ?: 'unknown', 'payment_failed', "at=$at");
    }

    /**
     * 173차 보강 — Refund / Chargeback / Adjustment 처리.
     *
     * Paddle Billing v2 의 환불은 두 가지 형태로 도착:
     *  (a) transaction.refunded  — 단순 환불 알림 (구식 payload, totals 가 details.totals 에 위치)
     *  (b) adjustment.created    — 신식 (action: full | partial | chargeback)
     *
     * full / chargeback → user plan 'demo' 로 즉시 다운그레이드 + paddle_subscriptions.status='refunded'
     * partial          → 감사 로그만 (서비스 유지)
     *
     * 환불 후 user plan 유지를 막아 사기 / 분쟁 시 매출 보호.
     */
    private static function onRefunded(\PDO $db, array $d, string $at): void
    {
        $adjId  = (string)($d['id']              ?? '');
        $txnId  = (string)($d['transaction_id']  ?? '');
        $subId  = (string)($d['subscription_id'] ?? '');
        $action = (string)($d['action']          ?? 'full');  // full | partial | chargeback
        // amount: adjustment payload 는 totals.total, legacy transaction.refunded 는 details.totals.total
        $amount = (string)($d['totals']['total']             ?? $d['details']['totals']['total'] ?? '0');
        $curr   = (string)($d['currency_code']               ?? 'USD');

        // Lookup user_email (subscription_id 또는 custom_data 경로)
        $email = (string)($d['custom_data']['user_email'] ?? $d['custom_data']['email'] ?? '');
        if ($subId && !$email) {
            try {
                $stmt = $db->prepare(
                    "SELECT user_email FROM paddle_subscriptions WHERE paddle_subscription_id=? LIMIT 1"
                );
                $stmt->execute([$subId]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                $email = (string)($row['user_email'] ?? '');
            } catch (\Throwable $e) { /* graceful */ }
        }

        // full refund 또는 chargeback → 즉시 다운그레이드
        $isFull = in_array($action, ['full', 'chargeback'], true);

        if ($isFull) {
            if ($subId) {
                try {
                    $db->prepare("
                        UPDATE paddle_subscriptions SET
                            status='refunded', last_event_at=?, updated_at=CURRENT_TIMESTAMP
                        WHERE paddle_subscription_id=?
                    ")->execute([$at, $subId]);
                } catch (\Throwable $e) { /* graceful */ }
            }
            if ($email) {
                self::setUserPlan($db, $email, 'demo', null);
            }
            self::auditLog($adjId ?: ($txnId ?: 'unknown'),
                "refunded_$action",
                "txn=$txnId sub=$subId email=$email amount=$amount $curr"
            );
        } else {
            // partial: 서비스 유지, 감사만
            self::auditLog($adjId ?: ($txnId ?: 'unknown'),
                'refunded_partial',
                "txn=$txnId sub=$subId email=$email amount=$amount $curr"
            );
        }
    }

    // ── User plan activation (app_user table) ─────────────────────────────────

    /**
     * Map Paddle price/product IDs → app plan name.
     *
     * 173차 보강 — 우선순위:
     *  1. plan_period_pricing.paddle_price_id 직접 lookup (1/3/6/12 매트릭스 지원)
     *  2. plan_config.price_id_monthly / price_id_annual lookup (legacy 2종)
     *  3. .env PADDLE_PRICE_* 환경변수 lookup (구식 4종)
     *  4. priceId/prodId 문자열 heuristic
     *  5. fallback 'pro'
     */
    private static function resolveAppPlan(string $priceId, string $prodId): string
    {
        if ($priceId !== '') {
            // 1. plan_period_pricing 매트릭스 (173차 cycle 1/3/6/12 지원)
            try {
                $stmt = self::db()->prepare(
                    "SELECT plan_id FROM plan_period_pricing
                     WHERE paddle_price_id = ? AND is_active = 1 LIMIT 1"
                );
                $stmt->execute([$priceId]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($row && !empty($row['plan_id'])) return (string)$row['plan_id'];
            } catch (\Throwable $e) { /* graceful */ }

            // 2. plan_config legacy 2종 (price_id_monthly / annual)
            try {
                $stmt = self::db()->prepare(
                    "SELECT plan_id FROM plan_config
                     WHERE (price_id_monthly = ? OR price_id_annual = ?) AND is_active = 1
                     LIMIT 1"
                );
                $stmt->execute([$priceId, $priceId]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($row && !empty($row['plan_id'])) return (string)$row['plan_id'];
            } catch (\Throwable $e) { /* graceful */ }
        }

        // 3. .env 구식 4종
        $starterMonthly = getenv('PADDLE_PRICE_STARTER_MONTHLY') ?: '';
        $starterAnnual  = getenv('PADDLE_PRICE_STARTER_ANNUAL')  ?: '';
        $proMonthly     = getenv('PADDLE_PRICE_PRO_MONTHLY')     ?: '';
        $proAnnual      = getenv('PADDLE_PRICE_PRO_ANNUAL')      ?: '';

        if ($priceId && in_array($priceId, [$starterMonthly, $starterAnnual], true)) return 'starter';
        if ($priceId && in_array($priceId, [$proMonthly, $proAnnual], true))         return 'pro';

        // 4. heuristic
        $lower = strtolower($priceId . $prodId);
        if (str_contains($lower, 'enterprise')) return 'enterprise';
        if (str_contains($lower, 'pro'))        return 'pro';
        if (str_contains($lower, 'starter'))    return 'starter';

        // 5. fallback
        return 'pro';
    }

    /**
     * Update app_user plan and subscription_expires_at.
     */
    private static function setUserPlan(\PDO $db, string $email, string $plan, ?string $expiresAt): void
    {
        if (!$email) return;

        try {
            // Try with subscription_expires_at column
            $db->prepare(
                "UPDATE app_user SET plan = ?, subscription_expires_at = ?, plans = ?
                 WHERE email = ?"
            )->execute([$plan, $expiresAt, $plan, $email]);
        } catch (\Throwable $e) {
            try {
                $db->prepare("UPDATE app_user SET plan = ? WHERE email = ?")->execute([$plan, $email]);
            } catch (\Throwable $e2) {
                error_log("[Paddle] setUserPlan failed for $email: " . $e2->getMessage());
            }
        }

        self::auditLog($email, 'user_plan_updated', "plan=$plan expires=$expiresAt");
    }

    // ── Paddle Billing v2 API helper ──────────────────────────────────────────

    private static function paddleApiV2(string $method, string $path, array $body = []): array
    {
        $url    = self::apiBase() . $path;
        $secret = self::secretKey();

        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $secret,
                'Content-Type: application/json',
            ],
        ];

        if ($method === 'POST') {
            $opts[CURLOPT_POST]       = true;
            $opts[CURLOPT_POSTFIELDS] = json_encode($body);
        } elseif ($method === 'PATCH') {
            $opts[CURLOPT_CUSTOMREQUEST] = 'PATCH';
            $opts[CURLOPT_POSTFIELDS]    = json_encode($body);
        }

        curl_setopt_array($ch, $opts);
        $raw    = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode((string)$raw, true) ?? [];
        if ($status >= 400) {
            error_log("[Paddle API v2] $method $path => $status: $raw");
        }
        return $data;
    }

    // ── Webhook signature verification (Billing v2 HMAC-SHA256) ──────────────

    /**
     * Paddle Billing v2 header:
     *   Paddle-Signature: ts=<unix_timestamp>;h1=<hex_hmac_sha256>
     *
     * Signed payload: "<ts>:<rawBody>"
     */
    private static function verifySignature(Request $req, string $rawBody): bool
    {
        // 191차 보안(fail-closed): 명시적 dev 우회(PADDLE_SKIP_VERIFY=true)만 허용.
        if (getenv('PADDLE_SKIP_VERIFY') === 'true') {
            return true; // 명시적 dev 우회(운영 미설정)
        }
        // secret 미설정 시 과거엔 return true(fail-OPEN) → 무서명 위조 webhook 수용(구독 활성화 등
        //   결제이벤트 위조 가능). 공개 webhook 라우트라 악용 표면 → fail-CLOSED 로 전환(거부).
        //   Paddle 활성화 시 PADDLE_WEBHOOK_SECRET 필수(미설정=검증불가=거부가 정답).
        $secret = self::webhookSecret();
        if (!$secret) {
            error_log('[Paddle] PADDLE_WEBHOOK_SECRET 미설정 — 서명검증 불가로 webhook 거부(fail-closed)');
            return false;
        }

        $header = $req->getHeaderLine('Paddle-Signature');
        if (!$header) return false;

        // Parse ts and h1
        $parts = [];
        foreach (explode(';', $header) as $part) {
            [$k, $v] = array_pad(explode('=', $part, 2), 2, '');
            $parts[trim($k)] = trim($v);
        }

        $ts = $parts['ts'] ?? '';
        $h1 = $parts['h1'] ?? '';
        if (!$ts || !$h1) return false;

        // Optional: replay attack guard (5-minute window)
        if (abs(time() - (int)$ts) > 300) {
            error_log('[Paddle] Webhook timestamp too old: ' . $ts);
            return false;
        }

        $expected = hash_hmac('sha256', "$ts:$rawBody", $secret);
        return hash_equals($expected, $h1);
    }

    // ── Audit log ─────────────────────────────────────────────────────────────

    private static function auditLog(string $refId, string $action, string $detail = ''): void
    {
        try {
            self::db()->prepare(
                "INSERT INTO paddle_audit_log (ref_id, action, detail) VALUES (?,?,?)"
            )->execute([$refId, $action, $detail]);
        } catch (\Exception $e) {
            error_log('[Paddle] Audit log error: ' . $e->getMessage());
        }
    }
}
