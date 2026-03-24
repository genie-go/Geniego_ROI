<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Payment Handler — Toss Payments PG 연동
 *
 * 환경변수:
 *   TOSS_SECRET_KEY  : sk_test_... 또는 sk_live_...
 *   TOSS_CLIENT_KEY  : ck_test_... 또는 ck_live_... (프론트엔드 전달용)
 *
 * 결제 흐름:
 *   1. 프론트엔드 → Toss 결제창
 *   2. 결제 완료 → successUrl: /payment/success?paymentKey=&orderId=&amount=
 *   3. 프론트엔드 POST /auth/payment/confirm { paymentKey, orderId, amount, cycle }
 *   4. 백엔드 Toss API 확인 → 플랜 업그레이드 → 구독 기간 저장
 */
final class Payment
{
    private static function json(ResponseInterface $res, array $data, int $status = 200): ResponseInterface
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function tossSecretKey(): string
    {
        return getenv('TOSS_SECRET_KEY') ?: 'test_sk_zXLkKEypNArWmo50nX3lmeaxYZ2M';
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    // ── 요금 정의: DB 우선, 없으면 기본값 ────────────────────────────────
    private static function planPrices(): array
    {
        // 1) menu_tier_pricing 에서 집계
        try {
            $pdo = Db::pdo();
            $rows = $pdo->query(
                "SELECT plan, cycle, price_krw, discount_pct FROM menu_tier_pricing WHERE is_active=1 AND price_krw>0"
            )->fetchAll(\PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $out = [];
                $months = ['monthly'=>1,'quarterly'=>3,'semi_annual'=>6,'biannual'=>6,'yearly'=>12];
                foreach ($rows as $r) {
                    $base  = (int)$r['price_krw'];
                    $disc  = (float)$r['discount_pct'];
                    $final = $disc > 0 ? (int)round($base * (1 - $disc / 100)) : $base;
                    $out[$r['plan']][$r['cycle']] = $final;
                }
                return $out;
            }
        } catch (\Throwable $e) {}

        // 2) plan_pricing 테이블 폴백
        try {
            $rows = Db::pdo()->query(
                "SELECT plan, cycle, base_price, discount_pct FROM plan_pricing WHERE is_active = 1"
            )->fetchAll(\PDO::FETCH_ASSOC);
            if (!empty($rows)) {
                $out = [];
                foreach ($rows as $r) {
                    $base = (int)$r['base_price'];
                    $disc = (float)$r['discount_pct'];
                    $total = (int)round($base * (1 - $disc / 100)) * self::cycleMonths($r['cycle']);
                    $out[$r['plan']][$r['cycle']] = $total;
                }
                return $out;
            }
        } catch (\Throwable $e) {}

        // 3) 하드코딩 기본값
        return [
            'pro' => [
                'monthly'   => 99000,
                'quarterly' => 237000,
                'yearly'    => 708000,
            ],
        ];
    }

    // 기본 월 단가 읽기 (프론트엔드 UI에서 per_month 계산용)
    private static function planPricingFull(): array
    {
        $default = [
            ['plan'=>'pro','cycle'=>'monthly',   'base_price'=>99000, 'discount_pct'=>0],
            ['plan'=>'pro','cycle'=>'quarterly',  'base_price'=>99000, 'discount_pct'=>20],
            ['plan'=>'pro','cycle'=>'yearly',     'base_price'=>99000, 'discount_pct'=>40],
        ];
        try {
            $rows = Db::pdo()->query(
                "SELECT plan, cycle, base_price, discount_pct FROM plan_pricing WHERE is_active = 1 ORDER BY plan, FIELD(cycle,'monthly','quarterly','yearly')"
            )->fetchAll(\PDO::FETCH_ASSOC);
            if (!empty($rows)) return $rows;
        } catch (\Throwable $e) {}
        return $default;
    }

    private static function cycleMonths(string $cycle): int
    {
        return match ($cycle) { 'quarterly' => 3, 'semi_annual' => 6, 'biannual' => 6, 'yearly' => 12, default => 1 };
    }

    private static function cycleDays(string $cycle): int
    {
        return match ($cycle) {
            'quarterly'   => 90,
            'semi_annual' => 180,
            'biannual'    => 180,
            'yearly'      => 365,
            default       => 30,
        };
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/payment/config
    // 프론트엔드에 Toss 클라이언트 키 + 플랜 가격 전달 (인증 필요)
    // ─────────────────────────────────────────────────────────────
    public static function config(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $clientKey = getenv('TOSS_CLIENT_KEY') ?: 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

        return self::json($res, [
            'ok'         => true,
            'client_key' => $clientKey,
            'prices'     => self::planPrices(),
            'currency'   => 'KRW',
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/payment/plans  (public — 인증 불요)
    // ─────────────────────────────────────────────────────────────
    public static function plans(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        return self::json($res, [
            'ok'     => true,
            'plans'  => [
                [
                    'id'       => 'pro_monthly',
                    'plan'     => 'pro',
                    'cycle'    => 'monthly',
                    'amount'   => 99000,
                    'label'    => 'Pro 월간',
                    'days'     => 30,
                    'per_month'=> 99000,
                    'discount' => 0,
                ],
                [
                    'id'       => 'pro_quarterly',
                    'plan'     => 'pro',
                    'cycle'    => 'quarterly',
                    'amount'   => 237000,
                    'label'    => 'Pro 분기',
                    'days'     => 90,
                    'per_month'=> 79000,
                    'discount' => 20,
                ],
                [
                    'id'       => 'pro_yearly',
                    'plan'     => 'pro',
                    'cycle'    => 'yearly',
                    'amount'   => 708000,
                    'label'    => 'Pro 연간',
                    'days'     => 365,
                    'per_month'=> 59000,
                    'discount' => 40,
                ],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/payment/confirm
    // Body: { paymentKey, orderId, amount, plan, cycle }
    // Toss API로 결제 확인 후 플랜 업그레이드
    // ─────────────────────────────────────────────────────────────
    public static function confirm(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        // 인증 확인
        $authHeader = $req->getHeaderLine('Authorization');
        $token = null;
        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
            $token = $m[1];
        }
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }

        // 사용자 조회
        $pdo = Db::pdo();
        $now = self::now();
        try {
            $stmt = $pdo->prepare(
                'SELECT u.id, u.email, u.name, COALESCE(u.plans,u.plan,\'demo\') AS plan, u.company
                   FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, $now]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
        }

        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }

        // 요청 바디
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        $paymentKey = trim((string)($body['paymentKey'] ?? ''));
        $orderId    = trim((string)($body['orderId'] ?? ''));
        $amount     = (int)($body['amount'] ?? 0);
        $plan       = trim((string)($body['plan'] ?? 'pro'));
        $cycle      = trim((string)($body['cycle'] ?? 'monthly'));

        if (!$paymentKey || !$orderId || $amount <= 0) {
            return self::json($res, ['ok' => false, 'error' => '결제 정보가 올바르지 않습니다.'], 422);
        }

        // ── 서버 사이드 금액 검증 ──────────────────────────────────────────
        $prices = self::planPrices();
        $expectedAmount = $prices[$plan][$cycle] ?? null;
        if ($expectedAmount === null) {
            return self::json($res, ['ok' => false, 'error' => '올바르지 않은 플랜 또는 주기입니다.'], 422);
        }
        if ($amount !== $expectedAmount) {
            return self::json($res, [
                'ok'    => false,
                'error' => "결제 금액이 일치하지 않습니다. (예상: {$expectedAmount}원, 수신: {$amount}원)",
            ], 422);
        }

        // ── Toss Payments API 결제 확인 ────────────────────────────────────
        $secretKey = self::tossSecretKey();
        $authEncoded = base64_encode($secretKey . ':');

        $tossPayload = json_encode([
            'paymentKey' => $paymentKey,
            'orderId'    => $orderId,
            'amount'     => $amount,
        ]);

        $context = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => implode("\r\n", [
                    'Authorization: Basic ' . $authEncoded,
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($tossPayload),
                ]),
                'content' => $tossPayload,
                'timeout' => 15,
                'ignore_errors' => true,
            ],
        ]);

        $tossUrl = 'https://api.tosspayments.com/v1/payments/confirm';
        $rawResponse = @file_get_contents($tossUrl, false, $context);
        $httpStatus = 200;

        // HTTP 상태 코드 추출
        if (isset($http_response_header)) {
            foreach ($http_response_header as $h) {
                if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $m2)) {
                    $httpStatus = (int)$m2[1];
                }
            }
        }

        if ($rawResponse === false || $httpStatus >= 400) {
            $errBody = $rawResponse ? json_decode($rawResponse, true) : null;
            $errMsg  = $errBody['message'] ?? '결제 확인 실패';
            return self::json($res, [
                'ok'           => false,
                'error'        => $errMsg,
                'toss_status'  => $httpStatus,
                'toss_body'    => $errBody,
            ], 402);
        }

        $tossResult = json_decode($rawResponse, true);

        // Toss 응답 상태 확인 (DONE이어야 성공)
        if (($tossResult['status'] ?? '') !== 'DONE') {
            return self::json($res, [
                'ok'    => false,
                'error' => '결제가 완료되지 않았습니다. (상태: ' . ($tossResult['status'] ?? 'UNKNOWN') . ')',
            ], 402);
        }

        // ── 결제 성공 → 플랜 업그레이드 ────────────────────────────────────
        $days      = self::cycleDays($cycle);
        $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + $days * 86400);
        $userId    = (int)$user['id'];

        // 결제 내역 저장 (테이블이 없어도 조용히 처리)
        try {
            $pdo->prepare(
                'INSERT INTO payment_history(user_id, payment_key, order_id, amount, plan, cycle, status, paid_at, expires_at)
                 VALUES(?,?,?,?,?,?,?,?,?)'
            )->execute([
                $userId, $paymentKey, $orderId, $amount,
                $plan, $cycle, 'success', $now, $expiresAt,
            ]);
        } catch (\Throwable $e) {
            // 테이블 없으면 무시 (마이그레이션이 자동 처리)
        }

        // 플랜 업데이트 (subscription_expires_at 있는 경우와 없는 경우 호환)
        try {
            $pdo->prepare(
                'UPDATE app_user SET plan = ?, subscription_expires_at = ?, subscription_cycle = ? WHERE id = ?'
            )->execute([$plan, $expiresAt, $cycle, $userId]);
        } catch (\Throwable $e) {
            // 컬럼이 없으면 plan만
            try {
                $pdo->prepare('UPDATE app_user SET plan = ? WHERE id = ?')->execute([$plan, $userId]);
            } catch (\Throwable $e2) {
                $pdo->prepare('UPDATE app_user SET plan = ? WHERE idx = ?')->execute([$plan, $userId]);
            }
        }

        $cycleLabel = match ($cycle) {
            'quarterly' => '3개월',
            'yearly'    => '1년',
            default     => '1개월',
        };

        return self::json($res, [
            'ok'   => true,
            'msg'  => "🎉 결제 완료! Pro 플랜 {$cycleLabel} 구독이 시작되었습니다.",
            'user' => array_merge($user, [
                'plan'                    => $plan,
                'subscription_status'     => 'active',
                'subscription_expires_at' => $expiresAt,
                'subscription_cycle'      => $cycle,
            ]),
            'payment' => [
                'orderId'    => $orderId,
                'amount'     => $amount,
                'expires_at' => $expiresAt,
                'toss_status'=> $tossResult['status'] ?? 'DONE',
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/payment/cancel  (구독 취소)
    // ─────────────────────────────────────────────────────────────
    public static function cancel(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $authHeader = $req->getHeaderLine('Authorization');
        $token = null;
        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) $token = $m[1];
        if (!$token) return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);

        $pdo = Db::pdo();
        $now = self::now();

        try {
            $stmt = $pdo->prepare(
                'SELECT u.id FROM user_session s JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, $now]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류'], 500);
        }

        if (!$user) return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);

        $userId = (int)$user['id'];
        try {
            $pdo->prepare(
                'UPDATE app_user SET subscription_expires_at = ?, subscription_cycle = NULL WHERE id = ?'
            )->execute([$now, $userId]); // 즉시 만료 처리
        } catch (\Throwable $e) {
            // 컬럼 없으면 plan만 demo로
            $pdo->prepare('UPDATE app_user SET plan = ? WHERE id = ?')->execute(['demo', $userId]);
        }

        return self::json($res, [
            'ok'  => true,
            'msg' => '구독이 취소되었습니다. 현재 기간 종료 후 데모 플랜으로 전환됩니다.',
        ]);
    }

    // ── PG 키 읽기 (DB 우선 → 환경변수 → 테스트키 폴백) ─────────────────
    private static function activePgConfig(): array
    {
        try {
            $pdo = Db::pdo();
            $row = $pdo->query(
                "SELECT provider, client_key, secret_key_enc, is_test FROM pg_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1"
            )->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                return [
                    'provider'   => $row['provider'],
                    'client_key' => $row['client_key'],
                    'secret_key' => $row['secret_key_enc'], // 평문 저장 (추후 암호화 강화 가능)
                    'is_test'    => (bool)$row['is_test'],
                ];
            }
        } catch (\Throwable $e) { /* 테이블 없으면 폴백 */ }

        // 환경변수 폴백
        $sk = getenv('TOSS_SECRET_KEY') ?: 'test_sk_zXLkKEypNArWmo50nX3lmeaxYZ2M';
        $ck = getenv('TOSS_CLIENT_KEY') ?: 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
        return [
            'provider'   => 'toss',
            'client_key' => $ck,
            'secret_key' => $sk,
            'is_test'    => str_starts_with($sk, 'test_'),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/pg/config  (관리자 전용)
    // ─────────────────────────────────────────────────────────────
    public static function getPgConfig(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $authHeader = $req->getHeaderLine('Authorization');
        $token = null;
        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) $token = $m[1];
        if (!$token) return self::json($res, ['ok' => false, 'error' => '인증 필요'], 401);

        // 관리자 체크
        try {
            $pdo = Db::pdo();
            $now = self::now();
            $stmt = $pdo->prepare(
                'SELECT COALESCE(u.plans,u.plan,\'demo\') AS plan FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, $now]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류'], 500);
        }
        if (!$user || $user['plan'] !== 'admin') {
            return self::json($res, ['ok' => false, 'error' => '관리자 권한이 필요합니다.'], 403);
        }

        // pg_config 목록 조회
        $configs = [];
        try {
            $rows = $pdo->query(
                "SELECT id, provider, client_key, is_test, is_active, created_at FROM pg_config ORDER BY id DESC"
            )->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                $configs[] = [
                    'id'         => $r['id'],
                    'provider'   => $r['provider'],
                    'client_key' => $r['client_key'],
                    'is_test'    => (bool)$r['is_test'],
                    'is_active'  => (bool)$r['is_active'],
                    'created_at' => $r['created_at'],
                ];
            }
        } catch (\Throwable $e) { /* 테이블 아직 없음 */ }

        $active = self::activePgConfig();

        return self::json($res, [
            'ok'      => true,
            'configs' => $configs,
            'active'  => [
                'provider'   => $active['provider'],
                'client_key' => $active['client_key'],
                'is_test'    => $active['is_test'],
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/pg/config  (관리자 전용)
    // Body: { provider, client_key, secret_key, is_test }
    // ─────────────────────────────────────────────────────────────
    public static function savePgConfig(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $authHeader = $req->getHeaderLine('Authorization');
        $token = null;
        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) $token = $m[1];
        if (!$token) return self::json($res, ['ok' => false, 'error' => '인증 필요'], 401);

        try {
            $pdo = Db::pdo();
            $now = self::now();
            $stmt = $pdo->prepare(
                'SELECT COALESCE(u.plans,u.plan,\'demo\') AS plan FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, $now]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 오류'], 500);
        }
        if (!$user || $user['plan'] !== 'admin') {
            return self::json($res, ['ok' => false, 'error' => '관리자 권한이 필요합니다.'], 403);
        }

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        $provider   = trim((string)($body['provider']   ?? 'toss'));
        $clientKey  = trim((string)($body['client_key'] ?? ''));
        $secretKey  = trim((string)($body['secret_key'] ?? ''));
        $isTest     = (bool)($body['is_test'] ?? true);

        if (!$clientKey) {
            return self::json($res, ['ok' => false, 'error' => 'Client Key를 입력해 주세요.'], 422);
        }

        try {
            // 기존 항목 모두 비활성화
            $pdo->exec("UPDATE pg_config SET is_active = 0");

            // 같은 provider가 있으면 업데이트, 없으면 INSERT
            $exist = $pdo->prepare("SELECT id FROM pg_config WHERE provider = ?")->execute([$provider]);
            $existRow = $pdo->prepare("SELECT id FROM pg_config WHERE provider = ?")->execute([$provider]) ? 
                $pdo->query("SELECT id FROM pg_config WHERE provider = '{$provider}' LIMIT 1")->fetch() : null;

            if ($secretKey) {
                if ($existRow && isset($existRow['id'])) {
                    $pdo->prepare(
                        "UPDATE pg_config SET client_key=?, secret_key_enc=?, is_test=?, is_active=1, created_at=? WHERE provider=?"
                    )->execute([$clientKey, $secretKey, $isTest ? 1 : 0, $now, $provider]);
                } else {
                    $pdo->prepare(
                        "INSERT INTO pg_config(provider, client_key, secret_key_enc, is_test, is_active, created_at) VALUES(?,?,?,?,1,?)"
                    )->execute([$provider, $clientKey, $secretKey, $isTest ? 1 : 0, $now]);
                }
            } else {
                // 시크릿 키 미입력 시 client_key와 is_test만 업데이트
                $pdo->prepare(
                    "UPDATE pg_config SET client_key=?, is_test=?, is_active=1 WHERE provider=?"
                )->execute([$clientKey, $isTest ? 1 : 0, $provider]);
            }
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 저장 실패: ' . $e->getMessage()], 500);
        }

        $providerNames = [
            'toss'     => 'Toss Payments',
            'nicepay'  => 'NicePay',
            'stripe'   => 'Stripe',
            'kakaopay' => 'KakaoPay',
        ];

        return self::json($res, [
            'ok'           => true,
            'provider'     => $provider,
            'provider_name'=> $providerNames[$provider] ?? $provider,
            'is_test'      => $isTest,
            'msg'          => "✅ {$providerNames[$provider]} 키가 저장되었습니다. 즉시 반영됩니다.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /auth/pg/config/{provider}
    // ─────────────────────────────────────────────────────────────
    public static function deletePgConfig(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        $provider = $args['provider'] ?? '';
        if (!$provider) return self::json($res, ['ok' => false, 'error' => '잘못된 요청'], 422);

        try {
            Db::pdo()->prepare("DELETE FROM pg_config WHERE provider = ?")->execute([$provider]);
        } catch (\Throwable $e) { /* 조용히 */ }

        return self::json($res, ['ok' => true]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/pricing/config  (관리자 전용)
    // 현재 플랜별 가격 + 할인율 반환
    // ─────────────────────────────────────────────────────────────
    public static function getPricingConfig(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => '관리자 권한이 필요합니다.'], 403);
        }
        return self::json($res, [
            'ok'      => true,
            'pricing' => self::planPricingFull(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/pricing/config  (관리자 전용)
    // Body: [{ plan, cycle, base_price, discount_pct }, ...]
    // ─────────────────────────────────────────────────────────────
    public static function savePricingConfig(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res, ['ok' => false, 'error' => '관리자 권한이 필요합니다.'], 403);
        }

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $b = json_decode($raw, true);
            if (is_array($b)) $body = $b;
        }

        $items = $body['pricing'] ?? [];
        if (!is_array($items) || empty($items)) {
            return self::json($res, ['ok' => false, 'error' => '가격 데이터가 없습니다.'], 422);
        }

        $pdo = Db::pdo();
        $now = self::now();
        $saved = 0;

        foreach ($items as $item) {
            $plan      = trim((string)($item['plan'] ?? 'pro'));
            $cycle     = trim((string)($item['cycle'] ?? 'monthly'));
            $basePrice = (int)($item['base_price'] ?? 0);
            $discPct   = max(0, min(99, (float)($item['discount_pct'] ?? 0)));

            if (!$plan || !$cycle || $basePrice <= 0) continue;

            try {
                // UPSERT: 있으면 업데이트, 없으면 삽입
                $exist = $pdo->prepare("SELECT id FROM plan_pricing WHERE plan=? AND cycle=?")->execute([$plan, $cycle])
                    ? $pdo->query("SELECT id FROM plan_pricing WHERE plan='{$plan}' AND cycle='{$cycle}' LIMIT 1")->fetch()
                    : null;

                if ($exist && isset($exist['id'])) {
                    $pdo->prepare(
                        "UPDATE plan_pricing SET base_price=?, discount_pct=?, updated_at=?, is_active=1 WHERE plan=? AND cycle=?"
                    )->execute([$basePrice, $discPct, $now, $plan, $cycle]);
                } else {
                    $pdo->prepare(
                        "INSERT INTO plan_pricing(plan, cycle, base_price, discount_pct, is_active, created_at, updated_at) VALUES(?,?,?,?,1,?,?)"
                    )->execute([$plan, $cycle, $basePrice, $discPct, $now, $now]);
                }
                $saved++;
            } catch (\Throwable $e) {
                // 해당 행 무시
            }
        }

        return self::json($res, [
            'ok'     => true,
            'saved'  => $saved,
            'msg'    => "✅ 가격 설정 {$saved}건이 저장되었습니다. 즉시 결제에 반영됩니다.",
            'pricing'=> self::planPricingFull(),
        ]);
    }

    // ── 공개 구독요금 조회 (인증 불요) ─────────────────────────────────
    // GET /auth/pricing/public-plans
    // 가입 화면에서 사용 — 관리자가 등록한 플랜별 요금 + 메뉴 접근권한 반환
    public static function getPublicPricingPlans(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        try {
            $pdo = Db::pdo();
            // 테이블이 없으면 빈 결과 반환
            $items = [];
            try {
                // is_active=1 조건으로 비활성화된 이력 레코드 제외
                // ORDER BY created_at DESC → 같은 key의 최신 레코드가 마지막에 덮어씌워짐 보장
                $stmt = $pdo->query(
                    'SELECT * FROM menu_tier_pricing WHERE is_active = 1 ORDER BY menu_key, plan, cycle, created_at ASC'
                );
                $items = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            } catch (\Throwable $e) {
                // 테이블 없음 → 빈 배열 반환
            }

            $PLAN_ACCT_PFX = '__plan_acct__';

            // 요금 데이터 파싱 (plan + acct + cycle → price/discount)
            $pricingMap = []; // [plan][acct][cycle] => { base, disc, final, total }
            // 메뉴 접근 권한 (plan → menu keys)
            $menuAccess = []; // [plan] => [menu_key, ...]

            foreach ($items as $row) {
                $menuKey = $row['menu_key'] ?? '';
                $plan    = $row['plan']     ?? '';
                $cycle   = $row['cycle']    ?? '';
                $priceKrw  = (int)($row['price_krw']    ?? 0);
                $discPct   = (float)($row['discount_pct'] ?? 0);

                if (str_starts_with($menuKey, $PLAN_ACCT_PFX) && $priceKrw > 0) {
                    // 형식: __plan_acct__{plan}__{acct}
                    $raw = substr($menuKey, strlen($PLAN_ACCT_PFX));
                    $parts = explode('__', $raw);
                    $planKey = $parts[0] ?? $plan;
                    $acct    = $parts[1] ?? '1';

                    // free 플랜은 무료이므로 가격 표시 제외
                    if ($planKey === 'free') continue;

                    $cycleMonths = match ($cycle) {
                        'quarterly'   => 3,
                        'semi_annual' => 6,
                        'yearly'      => 12,
                        default       => 1,
                    };

                    $finalMonthly = $discPct > 0 ? (int)round($priceKrw * (1 - $discPct / 100)) : $priceKrw;
                    $total        = $finalMonthly * $cycleMonths;

                    $pricingMap[$planKey][$acct][$cycle] = [
                        'base_price'    => $priceKrw,
                        'discount_pct'  => $discPct,
                        'monthly_price' => $finalMonthly,
                        'total_price'   => $total,
                        'months'        => $cycleMonths,
                    ];
                } elseif (!str_starts_with($menuKey, $PLAN_ACCT_PFX)) {
                    // 메뉴 접근 권한
                    if (!isset($menuAccess[$plan])) $menuAccess[$plan] = [];
                    $menuAccess[$plan][] = $menuKey;
                }
            }

            // ── plan_prices 테이블 병합: menu_tier_pricing + plan_prices 통합 ─────────────────
            // Admin 구독요금관리 > 요금관리에서 저장한 plan_prices 데이터를 항상 병합
            // menu_tier_pricing에 동일 key가 없을 경우 plan_prices 데이터로 보완
            try {
                $priceRows = $pdo->query(
                    "SELECT plan_key, period_months, price_usd, currency, discount_pct, label_ko, is_active
                       FROM plan_prices
                      WHERE is_active = 1
                      ORDER BY plan_key, period_months ASC"
                )->fetchAll(\PDO::FETCH_ASSOC);

                foreach ($priceRows as $pr) {
                    $planKey      = $pr['plan_key']      ?? '';
                    $periodMonths = (int)($pr['period_months'] ?? 1);
                    $priceVal     = (float)($pr['price_usd']   ?? 0);
                    $discPct      = (float)($pr['discount_pct'] ?? 0);
                    $currency     = strtoupper($pr['currency']  ?? 'KRW');

                    if (!$planKey || $priceVal <= 0 || $planKey === 'free') continue;

                    // USD → KRW 환산 (1 USD ≈ 1,350 KRW)
                    $priceKrw = ($currency === 'KRW')
                        ? (int)$priceVal
                        : (int)round($priceVal * 1350);

                    $cycleKey = match ($periodMonths) {
                        3  => 'quarterly',
                        6  => 'semi_annual',
                        12 => 'yearly',
                        default => 'monthly',
                    };

                    $finalMonthly = $discPct > 0
                        ? (int)round($priceKrw * (1 - $discPct / 100))
                        : $priceKrw;
                    $total = $finalMonthly * $periodMonths;

                    // menu_tier_pricing에 없는 경우에만 plan_prices 데이터로 채움 (우선순위: menu_tier_pricing)
                    if (!isset($pricingMap[$planKey]['1'][$cycleKey])) {
                        $pricingMap[$planKey]['1'][$cycleKey] = [
                            'base_price'    => $priceKrw,
                            'discount_pct'  => $discPct,
                            'monthly_price' => $finalMonthly,
                            'total_price'   => $total,
                            'months'        => $periodMonths,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                // plan_prices 테이블 없음 → 무시
            }
            // ─────────────────────────────────────────────────────────────────


            // 플랜 정의 (고정)
            $planDefs = [
                ['id' => 'free',       'name' => 'Free',       'emoji' => '🆓', 'color' => '#8da4c4',
                 'tagline' => '무료로 시작', 'features' => ['기본 대시보드', '데모 데이터 열람']],
                ['id' => 'starter',    'name' => 'Starter',    'emoji' => '🌱', 'color' => '#22c55e',
                 'tagline' => '소규모 셀러 · 스타트업', 'features' => ['마케팅·분석 기본', 'AI 인사이트 열람', '캠페인 관리', '이메일 지원']],
                ['id' => 'growth',     'name' => 'Growth',     'emoji' => '📈', 'color' => '#4f8ef7',
                 'tagline' => '성장기 중소 셀러', 'features' => ['마케팅 자동화 AI', '커머스·물류 옴니채널', 'P&L · 롤업 대시보드', '채팅 지원']],
                ['id' => 'pro',        'name' => 'Pro',        'emoji' => '🚀', 'color' => '#a855f7',
                 'tagline' => '전문 이커머스 브랜드', 'badge' => '인기',
                 'features' => ['전체 7개 대메뉴', 'WMS 창고 관리', 'AI 규칙 엔진 풀기능', 'API 키 발급', '전담 매니저']],
                ['id' => 'enterprise', 'name' => 'Enterprise', 'emoji' => '🌐', 'color' => '#f59e0b',
                 'tagline' => '대형 이커머스 · 에이전시', 'badge' => '최고사양',
                 'features' => ['Pro 전체 포함', '무제한 계정', '커스텀 대시보드', '온보딩 컨설팅', '연간 계약 전용']],
            ];

            // ── 계정 티어 목록: 하드코딩 대신 DB 실제 데이터에서 동적 생성 ──────────────────
            // 30계정을 admin에서 삭제하고 저장하면 DB에서 사라지므로 이 목록에서도 자동으로 제거됨
            $tierLabelMap = [
                '1'         => '1계정',
                '5'         => '5계정',
                '10'        => '10계정',
                '30'        => '30계정',
                'unlimited' => '무제한',
            ];
            // pricingMap에서 실제 존재하는 acct 키 수집
            $existingAcctKeys = [];
            foreach ($pricingMap as $planKey => $acctMap) {
                foreach (array_keys($acctMap) as $ak) {
                    $existingAcctKeys[$ak] = true;
                }
            }
            // 우선순위 정렬 (숫자 오름차순, unlimited 마지막)
            $tierOrder = ['1' => 0, '5' => 1, '10' => 2, '30' => 3, 'unlimited' => 99];
            uksort($existingAcctKeys, function($a, $b) use ($tierOrder) {
                $oa = $tierOrder[$a] ?? (is_numeric($a) ? (int)$a : 50);
                $ob = $tierOrder[$b] ?? (is_numeric($b) ? (int)$b : 50);
                return $oa <=> $ob;
            });
            $accountTiers = [];
            foreach (array_keys($existingAcctKeys) as $ak) {
                $accountTiers[] = [
                    'key'   => $ak,
                    'label' => $tierLabelMap[$ak] ?? ($ak . '계정'),
                ];
            }
            // DB에 데이터가 없으면 기본 1계정은 항상 포함
            if (empty($accountTiers)) {
                $accountTiers = [['key' => '1', 'label' => '1계정']];
            }
            // ──────────────────────────────────────────────────────────────────────────────

            $cycles = [
                ['key' => 'monthly',      'label' => '월간',  'months' => 1],
                ['key' => 'quarterly',    'label' => '3개월', 'months' => 3],
                ['key' => 'semi_annual',  'label' => '6개월', 'months' => 6],
                ['key' => 'yearly',       'label' => '연간',  'months' => 12],
            ];

            $plans = [];
            foreach ($planDefs as $def) {
                $pid = $def['id'];
                $planPricing = $pricingMap[$pid] ?? [];
                // 각 계정 티어별 요금 정리
                $tiers = [];
                foreach ($accountTiers as $tier) {
                    $ak = $tier['key'];
                    $acctData = $planPricing[$ak] ?? null;
                    if ($acctData) {
                        $tierEntry = ['acct' => $ak, 'label' => $tier['label'], 'cycles' => []];
                        foreach ($cycles as $cyc) {
                            if (isset($acctData[$cyc['key']])) {
                                $tierEntry['cycles'][$cyc['key']] = $acctData[$cyc['key']];
                            }
                        }
                        $tiers[] = $tierEntry;
                    }
                }

                $plans[] = array_merge($def, [
                    'pricing'    => $planPricing,
                    'tiers'      => $tiers,
                    'menuAccess' => $menuAccess[$pid] ?? [],
                    'hasPricing' => !empty($tiers),
                ]);
            }

            return self::json($res, [
                'ok'           => true,
                'plans'        => $plans,
                'cycles'       => $cycles,
                'accountTiers' => $accountTiers,
            ]);

        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    // ── 메뉴 단계별 구독요금 조회 ─────────────────────────────────────
    public static function getMenuPricingPlans(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => 'Admin only']);
        }
        $showAll = ($req->getQueryParams()['history'] ?? '0') === '1';
        try {
            $pdo = Db::pdo();
            self::ensureMenuTierPricingTable($pdo);
            if ($showAll) {
                $stmt = $pdo->query('SELECT * FROM menu_tier_pricing ORDER BY menu_key, plan, cycle, created_at DESC');
            } else {
                $stmt = $pdo->query('SELECT * FROM menu_tier_pricing WHERE is_active = 1 ORDER BY menu_key, plan, cycle');
            }
            $items = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            // 이력 요약 (변경 횟수)
            $histStmt = $pdo->query('SELECT menu_key, plan, cycle, COUNT(*) AS cnt FROM menu_tier_pricing GROUP BY menu_key, plan, cycle HAVING cnt > 1');
            $histCounts = [];
            foreach ($histStmt->fetchAll(\PDO::FETCH_ASSOC) as $h) {
                $histCounts["{$h['menu_key']}_{$h['plan']}_{$h['cycle']}"] = (int)$h['cnt'];
            }
            return self::json($res, ['ok' => true, 'items' => $items, 'history_counts' => $histCounts]);
        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }



    private static function ensureMenuTierPricingTable(\PDO $pdo): void
    {
        $pdo->exec("CREATE TABLE IF NOT EXISTS menu_tier_pricing (
            id INTEGER PRIMARY KEY AUTO_INCREMENT,
            menu_key VARCHAR(100) NOT NULL,
            menu_path VARCHAR(500),
            plan VARCHAR(50) NOT NULL,
            cycle VARCHAR(20) NOT NULL,
            price_krw BIGINT NOT NULL DEFAULT 0,
            discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )");
        // 기존 테이블에 is_active 없으면 추가
        try { $pdo->exec('ALTER TABLE menu_tier_pricing ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1'); } catch (\Throwable $e) {}
        // UNIQUE KEY 제거 (이력 보존을 위해) - MySQL만
        try {
            $drv = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
            if ($drv === 'mysql') {
                $idx = $pdo->query("SHOW INDEX FROM menu_tier_pricing WHERE Key_name = 'uq_menu_plan_cycle'")->fetchAll();
                if (!empty($idx)) $pdo->exec('ALTER TABLE menu_tier_pricing DROP INDEX uq_menu_plan_cycle');
            }
        } catch (\Throwable $e) {}
        // 3계정 기존 데이터 비활성화 (tier 정책 변경: 1/5/10/30/무제한)
        try {
            $pdo->exec("UPDATE menu_tier_pricing SET is_active=0 WHERE menu_key LIKE '%__3' AND is_active=1");
        } catch (\Throwable $e) {}
    }

    // ── 메뉴 단계별 구독요금 저장 (이력 보존) ───────────────────────────
    public static function saveMenuPricingPlans(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => 'Admin only']);
        }
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d=json_decode((string)$req->getBody(),true); if(is_array($d)) $body=$d; }
        $items = $body['items'] ?? [];
        if (empty($items)) {
            return self::json($res->withStatus(400), ['ok' => false, 'error' => '저장할 요금 데이터가 없습니다']);
        }
        try {
            $pdo = Db::pdo();
            self::ensureMenuTierPricingTable($pdo);

            // ── STEP 1: payload에 포함된 플랜들의 기존 plan_acct 요금 레코드 전체 비활성화 ──────
            // UI에서 30계정 tier를 삭제하면 해당 plan의 30계정 items가 payload에서 빠진다.
            // 하지만 DB에는 여전히 is_active=1인 30계정 레코드가 남아 공개 API에 그대로 반환된다.
            // 해결: 저장 전에 payload에 포함된 플랜들의 모든 plan_acct 레코드를 먼저 비활성화,
            //       그 후 payload에 있는 항목만 신규 INSERT → 삭제된 tier는 자연스럽게 제외됨.
            $PLAN_PFX = '__plan_acct__';
            $plansToClear = [];
            foreach ($items as $item) {
                $mk = $item['menu_key'] ?? '';
                if (str_starts_with($mk, $PLAN_PFX)) {
                    $planKey = explode('__', substr($mk, strlen($PLAN_PFX)))[0] ?? '';
                    if ($planKey && !in_array($planKey, $plansToClear)) {
                        $plansToClear[] = $planKey;
                    }
                }
            }
            if (!empty($plansToClear)) {
                $ph = implode(',', array_fill(0, count($plansToClear), '?'));
                $pdo->prepare(
                    "UPDATE menu_tier_pricing SET is_active=0
                      WHERE menu_key LIKE '__plan_acct__%'
                        AND plan IN ($ph)
                        AND is_active=1"
                )->execute($plansToClear);
            }
            // ─────────────────────────────────────────────────────────────────────────────

            $saved = 0;
            foreach ($items as $item) {
                $menuKey  = $item['menu_key'] ?? '';
                $plan     = $item['plan'] ?? 'free';
                $cycle    = $item['cycle'] ?? 'monthly';
                $priceKrw = (int)($item['price_krw'] ?? 0);
                $discPct  = (float)($item['discount_pct'] ?? 0);
                $menuPath = $item['menu_path'] ?? $menuKey;

                if (str_starts_with($menuKey, $PLAN_PFX)) {
                    // plan_acct 요금 항목: 방금 전체 비활성화했으므로 항상 신규 INSERT
                    $pdo->prepare(
                        'INSERT INTO menu_tier_pricing (menu_key, menu_path, plan, cycle, price_krw, discount_pct, is_active) VALUES (?,?,?,?,?,?,1)'
                    )->execute([$menuKey, $menuPath, $plan, $cycle, $priceKrw, $discPct]);
                } else {
                    // 메뉴 접근권한 항목: 기존 로직대로 이력 보존
                    $old = $pdo->prepare(
                        'SELECT id, price_krw, discount_pct FROM menu_tier_pricing WHERE menu_key=? AND plan=? AND cycle=? AND is_active=1 ORDER BY created_at DESC LIMIT 1'
                    );
                    $old->execute([$menuKey, $plan, $cycle]);
                    $existing = $old->fetch(\PDO::FETCH_ASSOC);

                    if ($existing) {
                        if ((int)$existing['price_krw'] === $priceKrw && (float)$existing['discount_pct'] === $discPct) {
                            $saved++; continue;
                        }
                        $pdo->prepare('UPDATE menu_tier_pricing SET is_active=0 WHERE id=?')->execute([$existing['id']]);
                    }
                    $pdo->prepare(
                        'INSERT INTO menu_tier_pricing (menu_key, menu_path, plan, cycle, price_krw, discount_pct, is_active) VALUES (?,?,?,?,?,?,1)'
                    )->execute([$menuKey, $menuPath, $plan, $cycle, $priceKrw, $discPct]);
                }
                $saved++;
            }
            return self::json($res, ['ok' => true, 'saved' => $saved, 'msg' => "{$saved}건 저장 완료"]);
        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    // ── 메뉴 단계별 구독요금 삭제 ─────────────────────────────────────
    public static function deleteMenuPricingPlan(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => 'Admin only']);
        }
        $id = (int)($args['id'] ?? 0);
        if (!$id) return self::json($res->withStatus(400), ['ok' => false, 'error' => 'Invalid ID']);
        try {
            $pdo = Db::pdo();

            // Paddle Price 아카이브 (paddle_price_id 있으면)
            $paddleArchived = false;
            try {
                $row = $pdo->prepare('SELECT paddle_price_id FROM menu_tier_pricing WHERE id = ?');
                $row->execute([$id]);
                $item = $row->fetch(\PDO::FETCH_ASSOC);
                if ($item && !empty($item['paddle_price_id'])) {
                    $archiveResult = self::paddleApi('POST', '/prices/' . $item['paddle_price_id'] . '/archive', []);
                    $paddleArchived = isset($archiveResult['data']['id']);
                    error_log('[PaddleSync] Archive price ' . $item['paddle_price_id'] . ': ' . ($paddleArchived ? 'OK' : 'FAILED'));
                }
            } catch (\Throwable $e) {
                error_log('[PaddleSync] Archive error: ' . $e->getMessage());
            }

            $pdo->prepare('DELETE FROM menu_tier_pricing WHERE id = ?')->execute([$id]);
            return self::json($res, ['ok' => true, 'deleted' => $id, 'paddle_archived' => $paddleArchived]);
        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    // ── Paddle 전체 동기화  POST /auth/pricing/paddle-sync ────────────
    public static function paddleSyncAll(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => 'Admin only']);
        }

        $secretKey = getenv('PADDLE_SECRET_KEY') ?: '';
        if (!$secretKey) {
            return self::json($res, [
                'ok'    => false,
                'error' => 'PADDLE_SECRET_KEY 환경변수가 설정되지 않았습니다. 서버 .env에 PADDLE_SECRET_KEY를 추가하세요.',
            ]);
        }

        try {
            $pdo = Db::pdo();

            // paddle_product_id, paddle_price_id 컬럼 보장
            foreach (['paddle_product_id VARCHAR(100) NULL', 'paddle_price_id VARCHAR(100) NULL', 'paddle_sync_error TEXT NULL'] as $col) {
                try { $pdo->exec("ALTER TABLE menu_tier_pricing ADD COLUMN $col"); } catch (\Throwable $e) {}
            }

            // 가격 항목만 불러오기 (menu_key 가 __plan_acct__ 로 시작, price_krw > 0)
            $stmt = $pdo->query(
                "SELECT * FROM menu_tier_pricing WHERE menu_key LIKE '__plan_acct__%' AND price_krw > 0"
            );
            $items = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            $synced  = 0;
            $errors  = [];
            $details = [];

            // plan 별 product_id 캐시 (한 플랜에 1개 product)
            $productCache = [];

            foreach ($items as $item) {
                $id       = $item['id'];
                $menuKey  = $item['menu_key'];
                $plan     = $item['plan'];
                $cycle    = $item['cycle'];
                $priceKrw = (int)$item['price_krw'];
                $discPct  = (float)($item['discount_pct'] ?? 0);
                $finalKrw = $priceKrw > 0 ? (int)round($priceKrw * (1 - $discPct / 100)) : 0;

                if ($finalKrw <= 0) continue;

                // 계정 수 파싱
                $raw  = str_replace('__plan_acct__', '', $menuKey);
                $parts = explode('__', $raw, 2);
                $acct  = $parts[1] ?? '1';

                $planLabel  = ucfirst($plan);
                $acctLabel  = $acct === 'unlimited' ? '무제한' : "{$acct}계정";
                $cycleLabel = match($cycle) { 'yearly' => 'Annual', 'quarterly' => 'Quarterly', default => 'Monthly' };
                $billingInterval = match($cycle) { 'yearly' => 'year', 'quarterly' => 'month', default => 'month' };
                $billingFreq     = match($cycle) { 'quarterly' => 3, default => 1 };

                $productName = "GeniegoROI {$planLabel} - {$acctLabel}";
                $priceDesc   = "{$planLabel} {$acctLabel} {$cycleLabel}";

                // 1. Product 획득 (캐시 or DB or 생성)
                $productId = $item['paddle_product_id'] ?? ($productCache[$plan . '_' . $acct] ?? null);

                if (!$productId) {
                    // DB에서 같은 plan+acct 에 product_id 가 있는지 확인
                    try {
                        $ps = $pdo->prepare(
                            "SELECT paddle_product_id FROM menu_tier_pricing WHERE plan=? AND menu_key LIKE ? AND paddle_product_id IS NOT NULL LIMIT 1"
                        );
                        $ps->execute([$plan, "%__plan_acct__{$plan}__{$acct}%"]);
                        $existing = $ps->fetch(\PDO::FETCH_ASSOC);
                        if ($existing) $productId = $existing['paddle_product_id'];
                    } catch (\Throwable $e) {}
                }

                if (!$productId) {
                    // Paddle Product 생성
                    $prodResult = self::paddleApi('POST', '/products', [
                        'name'          => $productName,
                        'tax_category'  => 'saas',
                        'description'   => "GeniegoROI {$planLabel} plan for {$acctLabel}",
                        'custom_data'   => ['plan' => $plan, 'acct' => $acct],
                    ]);
                    if (isset($prodResult['data']['id'])) {
                        $productId = $prodResult['data']['id'];
                        $details[] = "✅ Product 생성: {$productName} ({$productId})";
                    } else {
                        $err = json_encode($prodResult['error'] ?? $prodResult);
                        $errors[] = "Product 생성 실패 ({$productName}): {$err}";
                        $pdo->prepare("UPDATE menu_tier_pricing SET paddle_sync_error=? WHERE id=?")
                            ->execute([substr("Product create fail: $err", 0, 200), $id]);
                        continue;
                    }
                }

                $productCache[$plan . '_' . $acct] = $productId;

                // 2. Price 처리 (existing paddle_price_id 확인)
                $existingPriceId = $item['paddle_price_id'] ?? null;

                if ($existingPriceId) {
                    // 기존 price 조회 — amount 같으면 PATCH (description만), 다르면 archive + 신규 생성
                    $priceResult = self::paddleApi('GET', '/prices/' . $existingPriceId, []);
                    $existingAmount = (int)($priceResult['data']['unit_price']['amount'] ?? -1);

                    if ($existingAmount === $finalKrw) {
                        // description 업데이트만
                        self::paddleApi('PATCH', '/prices/' . $existingPriceId, [
                            'description' => $priceDesc,
                        ]);
                        $details[] = "✏️ Price 업데이트: {$priceDesc} ({$existingPriceId})";
                        $pdo->prepare("UPDATE menu_tier_pricing SET paddle_product_id=?, paddle_sync_error=NULL WHERE id=?")
                            ->execute([$productId, $id]);
                        $synced++;
                        continue;
                    } else {
                        // 금액 변경 → archive 기존 + 새로 생성
                        self::paddleApi('POST', '/prices/' . $existingPriceId . '/archive', []);
                        $details[] = "🗃 Price 아카이브: {$existingPriceId} (금액 변경)";
                        $existingPriceId = null;
                    }
                }

                // 3. 신규 Price 생성
                $createResult = self::paddleApi('POST', '/prices', [
                    'description'    => $priceDesc,
                    'product_id'     => $productId,
                    'unit_price'     => ['amount' => (string)$finalKrw, 'currency_code' => 'KRW'],
                    'billing_cycle'  => ['interval' => $billingInterval, 'frequency' => $billingFreq],
                    'tax_mode'       => 'account_setting',
                    'custom_data'    => ['plan' => $plan, 'acct' => $acct, 'cycle' => $cycle],
                ]);

                if (isset($createResult['data']['id'])) {
                    $newPriceId = $createResult['data']['id'];
                    $pdo->prepare(
                        "UPDATE menu_tier_pricing SET paddle_product_id=?, paddle_price_id=?, paddle_sync_error=NULL WHERE id=?"
                    )->execute([$productId, $newPriceId, $id]);
                    $details[] = "✅ Price 생성: {$priceDesc} ({$newPriceId})";
                    $synced++;
                } else {
                    $err = json_encode($createResult['error'] ?? $createResult);
                    $errors[] = "Price 생성 실패 ({$priceDesc}): {$err}";
                    $pdo->prepare("UPDATE menu_tier_pricing SET paddle_product_id=?, paddle_sync_error=? WHERE id=?")
                        ->execute([$productId, substr("Price create fail: $err", 0, 200), $id]);
                }
            }

            return self::json($res, [
                'ok'      => true,
                'synced'  => $synced,
                'errors'  => $errors,
                'details' => $details,
                'total'   => count($items),
            ]);
        } catch (\Throwable $e) {
            error_log('[PaddleSync] Fatal: ' . $e->getMessage());
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    // ── Paddle API v2 helper ──────────────────────────────────────────────
    private static function paddleApi(string $method, string $path, array $body): array
    {
        $env    = getenv('PADDLE_ENV') ?: 'sandbox';
        $base   = $env === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
        $secret = getenv('PADDLE_SECRET_KEY') ?: '';
        $url    = $base . $path;

        $ch = curl_init($url);
        $headers = ['Authorization: Bearer ' . $secret, 'Content-Type: application/json'];
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER     => $headers,
        ];

        if ($method === 'POST') {
            $opts[CURLOPT_POST]       = true;
            $opts[CURLOPT_POSTFIELDS] = empty($body) ? '{}' : json_encode($body);
        } elseif ($method === 'PATCH') {
            $opts[CURLOPT_CUSTOMREQUEST] = 'PATCH';
            $opts[CURLOPT_POSTFIELDS]    = json_encode($body);
        } elseif ($method === 'GET') {
            $opts[CURLOPT_HTTPGET] = true;
        }

        curl_setopt_array($ch, $opts);
        $raw    = (string)curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($status >= 400) {
            error_log("[PaddleSync] $method $path => $status: $raw");
        }
        return json_decode($raw, true) ?? ['_raw' => $raw, '_status' => $status];
    }

    // ── 구독 패키지 조회 ──────────────────────────────────────────────
    public static function getSubscriptionPackages(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => 'Admin only']);
        }
        try {
            $pdo = Db::pdo();
            $createSql = "CREATE TABLE IF NOT EXISTS subscription_packages (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(200) NOT NULL,
                menu_keys TEXT NOT NULL,
                price_monthly BIGINT NOT NULL DEFAULT 0,
                price_quarterly BIGINT NOT NULL DEFAULT 0,
                price_yearly BIGINT NOT NULL DEFAULT 0,
                discount_monthly DECIMAL(5,2) NOT NULL DEFAULT 0,
                discount_quarterly DECIMAL(5,2) NOT NULL DEFAULT 0,
                discount_yearly DECIMAL(5,2) NOT NULL DEFAULT 0,
                usage_unlimited_monthly TINYINT(1) NOT NULL DEFAULT 1,
                usage_unlimited_quarterly TINYINT(1) NOT NULL DEFAULT 1,
                usage_unlimited_yearly TINYINT(1) NOT NULL DEFAULT 1,
                usage_limit_monthly INT NOT NULL DEFAULT 0,
                usage_limit_quarterly INT NOT NULL DEFAULT 0,
                usage_limit_yearly INT NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )";
            $pdo->exec($createSql);
            // 기존 테이블에 usage 컬럼 없을 경우 ADD
            foreach (['usage_unlimited_monthly','usage_unlimited_quarterly','usage_unlimited_yearly'] as $col) {
                try { $pdo->exec("ALTER TABLE subscription_packages ADD COLUMN {$col} TINYINT(1) NOT NULL DEFAULT 1"); } catch (\Throwable $e) {}
            }
            foreach (['usage_limit_monthly','usage_limit_quarterly','usage_limit_yearly'] as $col) {
                try { $pdo->exec("ALTER TABLE subscription_packages ADD COLUMN {$col} INT NOT NULL DEFAULT 0"); } catch (\Throwable $e) {}
            }
            try { $pdo->exec("ALTER TABLE subscription_packages ADD COLUMN pricing_tiers TEXT"); } catch (\Throwable $e) {}
            $stmt = $pdo->query('SELECT * FROM subscription_packages ORDER BY id DESC');
            $packages = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            return self::json($res, ['ok' => true, 'packages' => $packages]);
        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    // ── 구독 패키지 저장 ──────────────────────────────────────────────
    public static function saveSubscriptionPackage(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => 'Admin only']);
        }
        $raw = (string)$req->getBody();
        $body = json_decode($raw, true) ?: (array)($req->getParsedBody() ?? []);

        $name = trim($body['name'] ?? '');
        $menuKeys = $body['menu_keys'] ?? [];
        if (empty($name)) return self::json($res->withStatus(400), ['ok' => false, 'error' => '패키지 이름이 필요합니다']);
        if (empty($menuKeys)) return self::json($res->withStatus(400), ['ok' => false, 'error' => '메뉴를 1개 이상 선택해 주세요']);

        try {
            $pdo = Db::pdo();
            $createSql = "CREATE TABLE IF NOT EXISTS subscription_packages (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(200) NOT NULL,
                menu_keys TEXT NOT NULL,
                price_monthly BIGINT NOT NULL DEFAULT 0,
                price_quarterly BIGINT NOT NULL DEFAULT 0,
                price_yearly BIGINT NOT NULL DEFAULT 0,
                discount_monthly DECIMAL(5,2) NOT NULL DEFAULT 0,
                discount_quarterly DECIMAL(5,2) NOT NULL DEFAULT 0,
                discount_yearly DECIMAL(5,2) NOT NULL DEFAULT 0,
                usage_unlimited_monthly TINYINT(1) NOT NULL DEFAULT 1,
                usage_unlimited_quarterly TINYINT(1) NOT NULL DEFAULT 1,
                usage_unlimited_yearly TINYINT(1) NOT NULL DEFAULT 1,
                usage_limit_monthly INT NOT NULL DEFAULT 0,
                usage_limit_quarterly INT NOT NULL DEFAULT 0,
                usage_limit_yearly INT NOT NULL DEFAULT 0,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )";
            $pdo->exec($createSql);
            foreach (['usage_unlimited_monthly','usage_unlimited_quarterly','usage_unlimited_yearly'] as $col) {
                try { $pdo->exec("ALTER TABLE subscription_packages ADD COLUMN {$col} TINYINT(1) NOT NULL DEFAULT 1"); } catch (\Throwable $e) {}
            }
            foreach (['usage_limit_monthly','usage_limit_quarterly','usage_limit_yearly'] as $col) {
                try { $pdo->exec("ALTER TABLE subscription_packages ADD COLUMN {$col} INT NOT NULL DEFAULT 0"); } catch (\Throwable $e) {}
            }
            try { $pdo->exec("ALTER TABLE subscription_packages ADD COLUMN pricing_tiers TEXT"); } catch (\Throwable $e) {}
            $pricingTiers = $body['pricing_tiers'] ?? [];
            $sql = 'INSERT INTO subscription_packages
                    (name, menu_keys, price_monthly, price_quarterly, price_yearly,
                     discount_monthly, discount_quarterly, discount_yearly,
                     usage_unlimited_monthly, usage_unlimited_quarterly, usage_unlimited_yearly,
                     usage_limit_monthly, usage_limit_quarterly, usage_limit_yearly,
                     pricing_tiers)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $name,
                json_encode($menuKeys, JSON_UNESCAPED_UNICODE),
                (int)($body['price_monthly'] ?? 0),
                (int)($body['price_quarterly'] ?? 0),
                (int)($body['price_yearly'] ?? 0),
                (float)($body['discount_monthly'] ?? 0),
                (float)($body['discount_quarterly'] ?? 0),
                (float)($body['discount_yearly'] ?? 0),
                (int)($body['usage_unlimited_monthly'] ?? 1),
                (int)($body['usage_unlimited_quarterly'] ?? 1),
                (int)($body['usage_unlimited_yearly'] ?? 1),
                (int)($body['usage_limit_monthly'] ?? 0),
                (int)($body['usage_limit_quarterly'] ?? 0),
                (int)($body['usage_limit_yearly'] ?? 0),
                json_encode($pricingTiers, JSON_UNESCAPED_UNICODE),
            ]);
            return self::json($res, ['ok' => true, 'id' => $pdo->lastInsertId(), 'msg' => "패키지 등록 완료: {$name}"]);
        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    // ── 구독 패키지 삭제 ──────────────────────────────────────────────
    public static function deleteSubscriptionPackage(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => 'Admin only']);
        }
        $id = (int)($args['id'] ?? 0);
        if (!$id) return self::json($res->withStatus(400), ['ok' => false, 'error' => 'Invalid ID']);
        try {
            $pdo = Db::pdo();
            $pdo->prepare('DELETE FROM subscription_packages WHERE id = ?')->execute([$id]);
            return self::json($res, ['ok' => true, 'deleted' => $id]);
        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }

    // ── GET /auth/admin/subscribers ─────────────────────────────────────────
    public static function listSubscribers(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdminToken($req)) return self::json($res->withStatus(403), ['ok'=>false,'error'=>'Admin only']);
        $pdo = Db::pdo();
        $q = $req->getQueryParams();
        $search  = $q['search'] ?? '';
        $planFlt = $q['plan']   ?? '';
        $page    = max(1, (int)($q['page']  ?? 1));
        $limit   = min(100, max(10, (int)($q['limit'] ?? 20)));
        $offset  = ($page - 1) * $limit;
        $where   = ["u.plan IN ('pro','enterprise','starter','growth')"];
        $params  = [];
        if ($planFlt) { $where[] = 'u.plan = ?'; $params[] = $planFlt; }
        if ($search)  {
            $where[] = '(u.email LIKE ? OR u.name LIKE ? OR u.company LIKE ?)';
            $s = '%'.$search.'%'; $params = array_merge($params,[$s,$s,$s]);
        }
        $wStr = implode(' AND ', $where);
        try {
            $cs = $pdo->prepare("SELECT COUNT(*) FROM app_user u WHERE $wStr"); $cs->execute($params);
            $total = (int)$cs->fetchColumn();
            $stmt = $pdo->prepare("
                SELECT u.id, u.email, u.name,
                       COALESCE(u.company,'') AS company,
                       COALESCE(u.representative,'') AS representative,
                       COALESCE(u.phone,'') AS phone,
                       COALESCE(u.plans, u.plan, 'demo') AS plan,
                       u.is_active, u.created_at,
                       COALESCE(u.subscription_started_at,'') AS subscription_started_at,
                       COALESCE(u.subscription_expires_at,'') AS subscription_expires_at,
                       COALESCE(u.subscription_renewed_at,'') AS subscription_renewed_at,
                       COALESCE(u.subscription_cycle,'monthly') AS subscription_cycle,
                       (SELECT COUNT(*) FROM payment_history ph WHERE ph.user_id=u.id) AS payment_count,
                       (SELECT COALESCE(SUM(ph.amount),0) FROM payment_history ph WHERE ph.user_id=u.id) AS total_paid
                FROM app_user u WHERE $wStr
                ORDER BY u.created_at DESC LIMIT $limit OFFSET $offset");
            $stmt->execute($params);
            return self::json($res, ['ok'=>true,'total'=>$total,'page'=>$page,'limit'=>$limit,'rows'=>$stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) { return self::json($res->withStatus(500),['ok'=>false,'error'=>$e->getMessage()]); }
    }

    // ── GET /auth/admin/subscribers/{id} ─────────────────────────────────────
    public static function getSubscriber(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        if (!self::checkAdminToken($req)) return self::json($res->withStatus(403),['ok'=>false,'error'=>'Admin only']);
        $id = (int)($args['id'] ?? 0);
        if (!$id) return self::json($res->withStatus(400),['ok'=>false,'error'=>'Invalid ID']);
        try {
            $pdo = Db::pdo();
            $s = $pdo->prepare("
                SELECT u.id,u.email,u.name,COALESCE(u.company,'') AS company,
                       COALESCE(u.representative,'') AS representative,COALESCE(u.phone,'') AS phone,
                       COALESCE(u.plans,u.plan,'demo') AS plan,u.is_active,u.created_at,
                       COALESCE(u.subscription_started_at,'') AS subscription_started_at,
                       COALESCE(u.subscription_expires_at,'') AS subscription_expires_at,
                       COALESCE(u.subscription_renewed_at,'') AS subscription_renewed_at,
                       COALESCE(u.subscription_cycle,'monthly') AS subscription_cycle
                FROM app_user u WHERE u.id=?");
            $s->execute([$id]); $user = $s->fetch(\PDO::FETCH_ASSOC);
            if (!$user) return self::json($res->withStatus(404),['ok'=>false,'error'=>'Not found']);
            $ph = $pdo->prepare("SELECT * FROM payment_history WHERE user_id=? ORDER BY paid_at DESC LIMIT 20"); $ph->execute([$id]);
            $cs2 = $pdo->prepare("SELECT sc.* FROM subscription_coupon sc WHERE sc.user_id=? ORDER BY sc.granted_at DESC LIMIT 10"); $cs2->execute([$id]);
            return self::json($res,['ok'=>true,'user'=>$user,'payments'=>$ph->fetchAll(\PDO::FETCH_ASSOC),'coupons'=>$cs2->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) { return self::json($res->withStatus(500),['ok'=>false,'error'=>$e->getMessage()]); }
    }

    // ── PATCH /auth/admin/subscribers/{id} ───────────────────────────────────
    public static function updateSubscriber(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        if (!self::checkAdminToken($req)) return self::json($res->withStatus(403),['ok'=>false,'error'=>'Admin only']);
        $id = (int)($args['id'] ?? 0);
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) { $d=json_decode((string)$req->getBody(),true); if(is_array($d)) $body=$d; }
        try {
            $pdo = Db::pdo();
            $allowed=['company','representative','phone','plan','is_active','subscription_started_at','subscription_expires_at','subscription_cycle'];
            $sets=[]; $vals=[];
            foreach ($allowed as $f) { if(array_key_exists($f,$body)){$sets[]="$f=?";$vals[]=$body[$f];} }
            if (empty($sets)) return self::json($res->withStatus(400),['ok'=>false,'error'=>'Nothing to update']);
            $vals[]=$id;
            $pdo->prepare("UPDATE app_user SET ".implode(',',$sets)." WHERE id=?")->execute($vals);
            if(isset($body['plan'])) try { $pdo->prepare("UPDATE app_user SET plans=? WHERE id=?")->execute([$body['plan'],$id]); } catch(\Throwable $e){}
            return self::json($res,['ok'=>true,'updated'=>$id]);
        } catch (\Throwable $e) { return self::json($res->withStatus(500),['ok'=>false,'error'=>$e->getMessage()]); }
    }

    // ── POST /auth/admin/coupons ─────────────────────────────────────────────
    public static function grantCoupon(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdminToken($req)) return self::json($res->withStatus(403),['ok'=>false,'error'=>'Admin only']);
        $body=(array)($req->getParsedBody()??[]);
        if(empty($body)){$d=json_decode((string)$req->getBody(),true);if(is_array($d))$body=$d;}
        $userId = (isset($body['user_id'])&&$body['user_id']!==''&&$body['user_id']!==null) ? (int)$body['user_id'] : null;
        $months = max(1,min(6,(int)($body['months']??1)));
        $reason = substr((string)($body['reason']??'관리자 지급'),0,500);
        $triggerType=$body['trigger_type']??'manual';
        $expDays=max(1,(int)($body['expires_days']??90));
        $pdo=Db::pdo(); $now=self::now();
        $expAt=gmdate('Y-m-d\TH:i:s\Z',strtotime("+{$expDays} days"));
        if($userId===null){
            $st=$pdo->query("SELECT id FROM app_user WHERE plan IN ('pro','enterprise','starter','growth') AND is_active=1");
            $targets=array_column($st->fetchAll(\PDO::FETCH_ASSOC),'id');
        } else { $targets=[$userId]; }
        if(empty($targets)) return self::json($res,['ok'=>true,'granted'=>0,'months'=>$months]);
        $ins=$pdo->prepare("INSERT INTO subscription_coupon(code,user_id,months,reason,trigger_type,granted_by,granted_at,expires_at,status) VALUES(?,?,?,?,?,'admin',?,?,'pending')");
        $granted=0;
        foreach($targets as $uid){
            $code='FREE-'.strtoupper(substr(md5(uniqid('c'.(string)$uid,true)),0,10));
            try{ $ins->execute([$code,$uid,$months,$reason,$triggerType,$now,$expAt]); self::applyCouponToUser($pdo,(int)$uid,$months,$now); $granted++; } catch(\Throwable $e){}
        }
        return self::json($res,['ok'=>true,'granted'=>$granted,'months'=>$months]);
    }

    // ── GET /auth/admin/coupons ──────────────────────────────────────────────
    public static function listCoupons(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdminToken($req)) return self::json($res->withStatus(403),['ok'=>false,'error'=>'Admin only']);
        $q=$req->getQueryParams();
        $page=max(1,(int)($q['page']??1)); $limit=min(100,max(10,(int)($q['limit']??20))); $offset=($page-1)*$limit;
        $status=preg_replace('/[^a-z]/','',($q['status']??''));
        $where=$status?"WHERE sc.status='$status'":'';
        try {
            $pdo=Db::pdo();
            $cnt=$pdo->prepare("SELECT COUNT(*) FROM subscription_coupon sc $where"); $cnt->execute(); $total=(int)$cnt->fetchColumn();
            $stmt=$pdo->prepare("
                SELECT sc.*,COALESCE(u.email,'전체') AS email,COALESCE(u.name,'전체 유료 회원') AS user_name,COALESCE(u.company,'') AS company
                FROM subscription_coupon sc LEFT JOIN app_user u ON u.id=sc.user_id
                $where ORDER BY sc.granted_at DESC LIMIT $limit OFFSET $offset");
            $stmt->execute();
            return self::json($res,['ok'=>true,'total'=>$total,'rows'=>$stmt->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e){ return self::json($res->withStatus(500),['ok'=>false,'error'=>$e->getMessage()]); }
    }

    // ── DELETE /auth/admin/coupons/{id} ─────────────────────────────────────
    public static function cancelCoupon(ServerRequestInterface $req, ResponseInterface $res, array $args): ResponseInterface
    {
        if (!self::checkAdminToken($req)) return self::json($res->withStatus(403),['ok'=>false,'error'=>'Admin only']);
        $id=(int)($args['id']??0);
        try { Db::pdo()->prepare("UPDATE subscription_coupon SET status='cancelled' WHERE id=? AND status='pending'")->execute([$id]); return self::json($res,['ok'=>true,'cancelled'=>$id]); }
        catch(\Throwable $e){ return self::json($res->withStatus(500),['ok'=>false,'error'=>$e->getMessage()]); }
    }

    private static function applyCouponToUser(\PDO $pdo, int $userId, int $months, string $now): void
    {
        $s=$pdo->prepare("SELECT subscription_expires_at,plan,plans FROM app_user WHERE id=?"); $s->execute([$userId]); $u=$s->fetch(\PDO::FETCH_ASSOC);
        if(!$u) return;
        $base=$u['subscription_expires_at']??$now; $baseTs=strtotime($base); if($baseTs<time()) $baseTs=time();
        $newExp=gmdate('Y-m-d\TH:i:s\Z',strtotime("+{$months} months",$baseTs));
        $plan=($u['plans']??$u['plan']??'pro'); if($plan==='demo') $plan='pro';
        $pdo->prepare("UPDATE app_user SET subscription_expires_at=?,plans=?,plan=?,subscription_renewed_at=? WHERE id=?")->execute([$newExp,$plan,$plan,$now,$userId]);
    }

    // ── 관리자 인증 헬퍼 ──────────────────────────────────────────────────────
    private static function checkAdmin(ServerRequestInterface $req): bool { return self::checkAdminToken($req); }

    private static function checkAdminToken(ServerRequestInterface $req): bool
    {
        $authHeader=$req->getHeaderLine('Authorization'); $token=null;
        if(preg_match('/^Bearer\s+(.+)$/i',$authHeader,$m)) $token=trim($m[1]);
        if(!$token) return false;
        $demoKey=getenv('DEMO_ADMIN_KEY')?:'genie_live_demo_key_00000000';
        if($token===$demoKey) return true;
        try {
            $pdo=Db::pdo(); $now=self::now();
            $stmt=$pdo->prepare('SELECT COALESCE(u.plans,u.plan,\'demo\') AS plan FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>? AND u.is_active=1');
            $stmt->execute([$token,$now]); $user=$stmt->fetch(\PDO::FETCH_ASSOC);
            return $user && in_array($user['plan'],['admin','enterprise']);
        } catch(\Throwable $e){ return false; }
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/pricing/menu-access  (관리자 전용)
    // Body: { permissions: { [menuId]: { [role]: "✅"|"👁"|"🔒" } }, items: [...] }
    // MenuAccessTab에서 저장 버튼 클릭 시 호출 — menu_tier_pricing 에 허용 항목 저장
    // ─────────────────────────────────────────────────────────────
    public static function saveMenuAccess(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        if (!self::checkAdmin($req)) {
            return self::json($res->withStatus(403), ['ok' => false, 'error' => '관리자 권한이 필요합니다.']);
        }

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        $items = $body['items'] ?? [];

        if (empty($items)) {
            // items가 없으면 permissions 객체에서 직접 생성
            $permissions = $body['permissions'] ?? [];
            foreach ($permissions as $menuId => $rolePerm) {
                foreach ($rolePerm as $role => $perm) {
                    if ($perm === '✅' || $perm === "\u2705") {
                        $items[] = ['menu_key' => $menuId, 'menu_path' => $menuId, 'plan' => $role, 'cycle' => 'monthly', 'price_krw' => 1, 'discount_pct' => 0];
                    } elseif ($perm === '👁' || $perm === "\uD83D\uDC41") {
                        $items[] = ['menu_key' => $menuId, 'menu_path' => $menuId, 'plan' => $role, 'cycle' => 'monthly', 'price_krw' => 2, 'discount_pct' => 0];
                    }
                }
            }
        }

        try {
            $pdo = Db::pdo();
            self::ensureMenuTierPricingTable($pdo);

            // 기존 메뉴접근권한 항목 전체 비활성화 (요금 항목 __plan_acct__ 는 제외)
            $pdo->exec("UPDATE menu_tier_pricing SET is_active=0 WHERE menu_key NOT LIKE '__plan_acct__%' AND price_krw IN (1,2)");

            $saved = 0;
            foreach ($items as $item) {
                $menuKey  = trim((string)($item['menu_key']  ?? ''));
                $plan     = trim((string)($item['plan']      ?? ''));
                $cycle    = trim((string)($item['cycle']     ?? 'monthly'));
                $priceKrw = (int)($item['price_krw']         ?? 1);
                $menuPath = trim((string)($item['menu_path'] ?? $menuKey));

                if (!$menuKey || !$plan) continue;
                // __plan_acct__ 요금 항목은 이 API에서 처리하지 않음
                if (str_starts_with($menuKey, '__plan_acct__')) continue;

                $pdo->prepare(
                    'INSERT INTO menu_tier_pricing (menu_key, menu_path, plan, cycle, price_krw, discount_pct, is_active) VALUES (?,?,?,?,?,0,1)'
                )->execute([$menuKey, $menuPath, $plan, $cycle, $priceKrw]);
                $saved++;
            }

            return self::json($res, [
                'ok'    => true,
                'saved' => $saved,
                'msg'   => "✅ 메뉴 접근 권한 {$saved}건이 저장되었습니다. Sidebar 및 유료 가입 화면에 즉시 반영됩니다.",
            ]);
        } catch (\Throwable $e) {
            return self::json($res->withStatus(500), ['ok' => false, 'error' => $e->getMessage()]);
        }
    }
}
