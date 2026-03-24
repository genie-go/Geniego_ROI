<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

/**
 * Auth Handler — 회원가입 / 로그인 / 구독 관리 / 플랜 잠금
 *
 * plan=demo  : 전체 열람 가능, 쓰기 작업 제한
 * plan=pro   : 전체 이용 가능 (subscription_expires_at 기간 내)
 * plan=admin : 최고 관리자 (무제한)
 */
final class UserAuth
{
    private static function json(ResponseInterface $res, array $data, int $status = 200): ResponseInterface
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    private static function generateToken(): string
    {
        return bin2hex(random_bytes(32)); // 64-char hex
    }

    private static function extractToken(ServerRequestInterface $req): ?string
    {
        $h = $req->getHeaderLine('Authorization');
        if (preg_match('/^Bearer\s+(.+)$/i', $h, $m)) return $m[1];
        $params = $req->getQueryParams();
        return $params['token'] ?? null;
    }

    /**
     * 구독 만료 여부 확인 → 만료 시 plan을 free로 자동 다운그레이드
     * 지원 플랜: free, demo, starter, growth, pro, enterprise, admin
     */
    private static function resolveActivePlan(array $user): array
    {
        $plan = $user['plan'] ?? 'free';

        // admin은 만료 없음
        if ($plan === 'admin') {
            return array_merge($user, [
                'subscription_status' => 'admin',
                'subscription_expires_at' => null,
            ]);
        }

        // free / demo 플랜 (무료 가입 or 데모) → 바로 반환
        if (in_array($plan, ['free', 'demo'], true)) {
            return array_merge($user, [
                'plan' => $plan,
                'subscription_status' => 'none',
                'subscription_expires_at' => null,
            ]);
        }

        // 유료 플랜(starter, growth, pro, enterprise) 만료 체크
        if (!empty($user['subscription_expires_at'])) {
            $expiresTs = strtotime($user['subscription_expires_at']);
            if ($expiresTs !== false && $expiresTs < time()) {
                // 만료됨 → DB에 free로 다운그레이드
                try {
                    $pdo = Db::pdo();
                    $id = $user['id'] ?? $user['idx'] ?? 0;
                    $pdo->prepare("UPDATE app_user SET plan = 'free', subscription_expires_at = NULL WHERE id = ? OR idx = ?")
                        ->execute([$id, $id]);
                } catch (\Throwable $e) { /* 조용히 처리 */ }

                return array_merge($user, [
                    'plan' => 'free',
                    'subscription_status' => 'expired',
                    'subscription_expires_at' => $user['subscription_expires_at'],
                ]);
            }
            // 유효한 유료 플랜
            return array_merge($user, ['subscription_status' => 'active']);
        }

        // 만료일 없는 유료 플랜 (수동 부여 등)
        return array_merge($user, [
            'subscription_status' => 'active',
            'subscription_expires_at' => null,
        ]);
    }


    /** 토큰으로 사용자 조회 (구독 정보 포함) */
    private static function userByToken(string $token): ?array
    {
        $pdo = Db::pdo();
        // subscription_expires_at, plans 컬럼 포함 조회 (없으면 null)
        try {
            $stmt = $pdo->prepare(
                'SELECT u.id, u.email, u.name,
                        COALESCE(u.plans, u.plan, \'demo\') AS plan,
                        u.company, u.created_at,
                        u.subscription_expires_at,
                        u.subscription_cycle
                   FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, self::now()]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            // subscription_expires_at 컬럼이 없는 경우 폴백
            $stmt = $pdo->prepare(
                'SELECT u.id, u.email, u.name,
                        COALESCE(u.plans, u.plan, \'demo\') AS plan,
                        u.company, u.created_at
                   FROM user_session s
                   JOIN app_user u ON u.id = s.user_id
                  WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1'
            );
            $stmt->execute([$token, self::now()]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        }

        if (!$row) return null;
        return self::resolveActivePlan($row);
    }

    /**
     * 플랜 권한 확인 미들웨어 (백엔드 API 보호용)
     * 반환: null이면 통과, ResponseInterface면 에러
     *
     * 지원 플랜 계층:
     *   demo < pro < enterprise < admin
     */
    public static function requirePro(ServerRequestInterface $req, ResponseInterface $res): ?ResponseInterface
    {
        return self::requirePlan($req, $res, 'pro');
    }

    /**
     * 범용 플랜 미들웨어 — 지정 플랜 이상 사용자만 통과
     * @param string $minPlan  'pro' | 'enterprise' | 'admin'
     */
    public static function requirePlan(ServerRequestInterface $req, ResponseInterface $res, string $minPlan = 'pro'): ?ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.', 'code' => 'AUTH_REQUIRED'], 401);
        }

        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.', 'code' => 'SESSION_EXPIRED'], 401);
        }

        // 플랜 계층: demo=0, pro=1, enterprise=2, admin=3
        $rank = ['demo' => 0, 'pro' => 1, 'enterprise' => 2, 'admin' => 3];
        $userRank = $rank[$user['plan']] ?? 0;
        $minRank  = $rank[$minPlan] ?? 1;

        if ($userRank < $minRank) {
            return self::json($res, [
                'ok'          => false,
                'error'       => "이 기능은 {$minPlan} 플랜 이상에서 이용 가능합니다.",
                'code'        => 'PLAN_REQUIRED',
                'currentPlan' => $user['plan'],
                'requiredPlan'=> $minPlan,
            ], 403);
        }
        return null; // 통과
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/register
    // Body: { email, password, name, company? }
    // ─────────────────────────────────────────────────────────────
    public static function register(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo  = Db::pdo();
        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }
        $now  = self::now();

        $email    = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $name     = trim((string)($body['name'] ?? ''));
        $company  = trim((string)($body['company'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return self::json($res, ['ok' => false, 'error' => '올바른 이메일 형식이 아닙니다.'], 422);
        }
        if (strlen($password) < 6) {
            return self::json($res, ['ok' => false, 'error' => '비밀번호는 6자 이상이어야 합니다.'], 422);
        }
        if (strlen($name) < 1) {
            return self::json($res, ['ok' => false, 'error' => '이름을 입력해 주세요.'], 422);
        }

        $check = $pdo->prepare('SELECT id FROM app_user WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetchColumn()) {
            return self::json($res, ['ok' => false, 'error' => '이미 가입된 이메일입니다.'], 409);
        }

        $hashedPw = password_hash($password, PASSWORD_DEFAULT);
        $userId = null;
        try {
            $pdo->prepare(
                'INSERT INTO app_user(email,password_hashs,name,plan,company,is_active,created_at) VALUES(?,?,?,?,?,?,?)'
            )->execute([$email, $hashedPw, $name, 'free', $company ?: null, 1, $now]);
            $userId = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) {
            try {
                $pdo->prepare(
                    'INSERT INTO app_user(email,password_hash,name,plan,company,is_active,created_at) VALUES(?,?,?,?,?,?,?)'
                )->execute([$email, $hashedPw, $name, 'free', $company ?: null, 1, $now]);
                $userId = (int)$pdo->lastInsertId();
            } catch (\Throwable $e2) {
                return self::json($res, ['ok' => false, 'error' => '회원가입 중 오류가 발생했습니다: ' . $e2->getMessage()], 500);
            }
        }

        $token  = self::generateToken();
        $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 24 * 3600);

        $pdo->prepare('INSERT INTO user_session(user_id,token,expires_at,created_at) VALUES(?,?,?,?)')
            ->execute([$userId, $token, $expires, $now]);

        // ─── 신규가입 자동 쿠폰 발급 (coupon_rules signup 규칙 확인) ───────────────
        // userId가 0이면 email로 재조회
        if (!$userId) {
            try {
                $rr = $pdo->prepare('SELECT id FROM app_user WHERE email = ? LIMIT 1');
                $rr->execute([$email]);
                $userId = (int)($rr->fetchColumn() ?: 0);
            } catch (\Throwable $e) {}
        }
        $couponResult = null;
        if ($userId > 0) {
            try {
                $couponResult = \Genie\CouponEngine::fire($pdo, $userId, $email, 'signup', 'free');
            } catch (\Throwable $ce) {
                error_log('[register] CouponEngine: ' . $ce->getMessage());
            }
        }

        // 쿠폰 적용 후 최신 플랜 재조회
        $finalPlan = 'free'; $finalExpires = null;
        try {
            $uRow = $pdo->query(
                "SELECT COALESCE(plans,plan,'free') AS plan, subscription_expires_at
                   FROM app_user WHERE id = {$userId} LIMIT 1"
            )->fetch(\PDO::FETCH_ASSOC);
            if ($uRow) { $finalPlan = $uRow['plan'] ?? 'free'; $finalExpires = $uRow['subscription_expires_at'] ?? null; }
        } catch (\Throwable $e) {}

        return self::json($res, [
            'ok'    => true,
            'token' => $token,
            'user'  => [
                'id'                      => $userId,
                'email'                   => $email,
                'name'                    => $name,
                'plan'                    => $finalPlan,
                'company'                 => $company,
                'subscription_status'     => $finalPlan === 'free' ? 'none' : 'active',
                'subscription_expires_at' => $finalExpires,
            ],
            'coupon' => $couponResult ? [
                'issued'        => true,
                'code'          => $couponResult['code'],
                'plan'          => $couponResult['plan'],
                'duration_days' => $couponResult['duration_days'],
                'expires_at'    => $couponResult['expires_at'],
                'message'       => "\ud83c\udf81 \uc2e0\uaddc\uac00\uc785 \ud658\uc601! {$couponResult['plan']} \ud50c\ub79c {$couponResult['duration_days']}\uc77c \ubb34\ub8cc \uc774\uc6a9\uad8c\uc774 \uc989\uc2dc \uc801\uc6a9\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
            ] : null,
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/login
    // Body: { email, password }
    // ─────────────────────────────────────────────────────────────
    public static function login(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        try {
            $pdo  = Db::pdo();
            $body = (array)($req->getParsedBody() ?? []);
            if (empty($body)) {
                $raw = (string)$req->getBody();
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) $body = $decoded;
            }
            $now = self::now();

            $email    = trim((string)($body['email'] ?? ''));
            $password = (string)($body['password'] ?? '');

            if (empty($email) || empty($password)) {
                return self::json($res, ['ok' => false, 'error' => '이메일과 비밀번호를 입력해주세요.'], 400);
            }

            $stmt = $pdo->prepare('SELECT * FROM app_user WHERE email = ? AND is_active = 1');
            $stmt->execute([$email]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);

            $hash = $user['password_hashs'] ?? $user['password_hash'] ?? $user['password'] ?? null;

            if (!$user || empty($hash) || !password_verify($password, (string)$hash)) {
                return self::json($res, ['ok' => false, 'error' => '이메일 또는 비밀번호가 올바르지 않습니다.'], 401);
            }

            $token   = self::generateToken();
            $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 24 * 3600);
            $userId  = $user['id'] ?? $user['idx'] ?? 0;

            $pdo->prepare('DELETE FROM user_session WHERE user_id = ? AND expires_at < ?')->execute([$userId, $now]);
            $pdo->prepare('INSERT INTO user_session(user_id,token,expires_at,created_at) VALUES(?,?,?,?)')
                ->execute([$userId, $token, $expires, $now]);

            $effectivePlan = $user['plans'] ?? $user['plan'] ?? 'free';
            $rawUser = [
                'id'                      => $userId,
                'email'                   => $user['email'],
                'name'                    => $user['name'],
                'plan'                    => $effectivePlan,
                'plans'                   => $effectivePlan,
                'company'                 => $user['company'] ?? null,
                'created_at'              => $user['created_at'] ?? null,
                'subscription_expires_at' => $user['subscription_expires_at'] ?? null,
                'subscription_cycle'      => $user['subscription_cycle'] ?? null,
            ];
            $resolved = self::resolveActivePlan($rawUser);

            return self::json($res, [
                'ok'    => true,
                'token' => $token,
                'user'  => $resolved,
            ]);
        } catch (\Throwable $e) {
            error_log('[UserAuth::login] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
            return self::json($res, [
                'ok'     => false,
                'error'  => '서버 오류: ' . $e->getMessage(),
            ], 500);
        }
    }


    // ─────────────────────────────────────────────────────────────
    // GET /auth/me
    // ─────────────────────────────────────────────────────────────
    public static function me(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었거나 유효하지 않습니다.'], 401);
        }
        return self::json($res, ['ok' => true, 'user' => $user]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/logout
    // ─────────────────────────────────────────────────────────────
    public static function logout(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if ($token) {
            Db::pdo()->prepare('DELETE FROM user_session WHERE token = ?')->execute([$token]);
        }
        return self::json($res, ['ok' => true]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/upgrade
    // Body: { plan: 'pro'|'demo', cycle: 'monthly'|'quarterly'|'yearly' }
    // 구독 기간 계산 후 subscription_expires_at 저장
    // ─────────────────────────────────────────────────────────────
    public static function upgrade(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }

        $body  = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        $plan  = in_array($body['plan'] ?? 'pro', ['pro', 'demo', 'enterprise'], true)
                 ? ($body['plan'] ?? 'pro') : 'pro';
        $cycle = in_array($body['cycle'] ?? 'monthly', ['monthly', 'quarterly', 'yearly'], true)
                 ? ($body['cycle'] ?? 'monthly') : 'monthly';

        // 구독 만료일 계산
        $now = self::now();
        $expiresAt = null;
        if ($plan === 'pro' || $plan === 'enterprise') {
            $days = match ($cycle) {
                'quarterly' => 90,
                'yearly'    => 365,
                default     => 30,  // monthly
            };
            $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + $days * 86400);
        }

        $id = $user['id'] ?? $user['idx'] ?? 0;
        $pdo = Db::pdo();

        // subscription_expires_at, subscription_cycle 컬럼 업데이트 시도
        try {
            $pdo->prepare(
                'UPDATE app_user SET plan = ?, subscription_expires_at = ?, subscription_cycle = ? WHERE id = ?'
            )->execute([$plan, $expiresAt, $plan !== 'demo' ? $cycle : null, $id]);
        } catch (\Throwable $e) {
            // 컬럼이 없으면 plan만 업데이트 (idx 호환)
            try {
                $pdo->prepare('UPDATE app_user SET plan = ? WHERE id = ?')->execute([$plan, $id]);
            } catch (\Throwable $e2) {
                $pdo->prepare('UPDATE app_user SET plan = ? WHERE idx = ?')->execute([$plan, $id]);
            }
        }

        // 응답용 사용자 정보
        $updatedUser = array_merge($user, [
            'plan'                    => $plan,
            'subscription_expires_at' => $expiresAt,
            'subscription_cycle'      => $plan !== 'demo' ? $cycle : null,
            'subscription_status'     => $plan === 'pro' ? 'active' : 'none',
        ]);

        $cycleLabel = match ($cycle) {
            'quarterly' => '3개월',
            'yearly'    => '1년',
            default     => '1개월',
        };
        $msg = $plan === 'demo'
            ? '데모 플랜으로 변경되었습니다.'
            : "🎉 Pro 플랜 {$cycleLabel} 구독이 시작되었습니다! 만료일: {$expiresAt}";

        return self::json($res, [
            'ok'   => true,
            'user' => $updatedUser,
            'msg'  => $msg,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/subscription
    // 현재 구독 상태 상세 조회
    // ─────────────────────────────────────────────────────────────
    public static function subscription(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }

        $expiresAt = $user['subscription_expires_at'] ?? null;
        $daysLeft  = null;
        if ($expiresAt) {
            $ts = strtotime($expiresAt);
            $daysLeft = max(0, (int)ceil(($ts - time()) / 86400));
        }

        return self::json($res, [
            'ok' => true,
            'subscription' => [
                'plan'       => $user['plan'],
                'status'     => $user['subscription_status'] ?? 'none',
                'cycle'      => $user['subscription_cycle'] ?? null,
                'expires_at' => $expiresAt,
                'days_left'  => $daysLeft,
                'is_pro'     => in_array($user['plan'], ['pro', 'admin', 'enterprise']),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/demo
    // 서버사이드 데모 세션 발급 — 24시간 유효 임시 계정
    // Body: { role?: 'demo' } (현재는 demo만 지원)
    // ─────────────────────────────────────────────────────────────
    public static function demoSession(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $pdo = Db::pdo();
        $now = self::now();
        $demoEmail = 'demo@genie-roi-demo.internal';

        // 공용 데모 계정 조회 또는 생성
        try {
            $userId = null;
            try {
                $row = $pdo->query("SELECT id FROM app_user WHERE email = '{$demoEmail}' LIMIT 1")->fetch(\PDO::FETCH_ASSOC);
                if ($row) {
                    $userId = (int)$row['id'];
                } else {
                    // 데모 계정 생성
                    try {
                        $pdo->prepare('INSERT INTO app_user(email,password_hashs,name,plan,company,is_active,created_at) VALUES(?,?,?,?,?,?,?)')
                            ->execute([$demoEmail, password_hash('demo_internal_' . date('Y'), PASSWORD_DEFAULT), 'Demo User', 'demo', 'Geniego Demo', 1, $now]);
                    } catch (\Throwable $e) {
                        $pdo->prepare('INSERT INTO app_user(email,password_hash,name,plan,company,is_active,created_at) VALUES(?,?,?,?,?,?,?)')
                            ->execute([$demoEmail, password_hash('demo_internal_' . date('Y'), PASSWORD_DEFAULT), 'Demo User', 'demo', 'Geniego Demo', 1, $now]);
                    }
                    $userId = (int)$pdo->lastInsertId();
                }
            } catch (\Throwable $e) {
                return self::json($res, ['ok' => false, 'error' => 'DB 오류: ' . $e->getMessage()], 500);
            }

            // 데모 세션 토큰 발급 (24시간)
            $token = self::generateToken();
            $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 86400);
            $pdo->prepare('INSERT INTO user_session(user_id,token,expires_at,created_at) VALUES(?,?,?,?)')
                ->execute([$userId, $token, $expires, $now]);

            return self::json($res, [
                'ok'    => true,
                'token' => $token,
                'user'  => [
                    'id'      => $userId,
                    'email'   => $demoEmail,
                    'name'    => 'Demo User',
                    'plan'    => 'demo',
                    'company' => 'Geniego Demo',
                    'subscription_status'     => 'none',
                    'subscription_expires_at' => null,
                ],
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => '데모 세션 생성 실패: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/plan-check
    // 현재 토큰의 플랜 정보 + 접근 가능 기능 목록 반환
    // ─────────────────────────────────────────────────────────────
    public static function planCheck(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '인증 토큰이 없습니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }

        $plan = $user['plan'];
        $rank = ['demo' => 0, 'pro' => 1, 'enterprise' => 2, 'admin' => 3];
        $userRank = $rank[$plan] ?? 0;

        // 기능별 접근 여부
        $features = [
            'crm'             => ['plan' => 'pro',  'access' => $userRank >= 1],
            'email_marketing' => ['plan' => 'pro',  'access' => $userRank >= 1],
            'kakao_channel'   => ['plan' => 'pro',  'access' => $userRank >= 1],
            'pixel_tracking'  => ['plan' => 'pro',  'access' => $userRank >= 1],
            'journey_builder' => ['plan' => 'pro',  'access' => $userRank >= 1],
            'customer_ai'     => ['plan' => 'pro',  'access' => $userRank >= 1],
            'ab_testing'      => ['plan' => 'pro',  'access' => $userRank >= 1],
            'sms'             => ['plan' => 'pro',  'access' => $userRank >= 1],
            'api_access'      => ['plan' => 'enterprise', 'access' => $userRank >= 2],
            'white_label'     => ['plan' => 'enterprise', 'access' => $userRank >= 2],
            'admin_panel'     => ['plan' => 'admin', 'access' => $userRank >= 3],
        ];

        $expiresAt = $user['subscription_expires_at'] ?? null;
        $daysLeft  = null;
        if ($expiresAt) {
            $daysLeft = max(0, (int)ceil((strtotime($expiresAt) - time()) / 86400));
        }

        return self::json($res, [
            'ok'       => true,
            'plan'     => $plan,
            'rank'     => $userRank,
            'is_pro'   => $userRank >= 1,
            'features' => $features,
            'subscription' => [
                'status'     => $user['subscription_status'] ?? 'none',
                'cycle'      => $user['subscription_cycle'] ?? null,
                'expires_at' => $expiresAt,
                'days_left'  => $daysLeft,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /auth/license
    // Body: { license_key: "GENIE-XXXX-XXXX-XXXX" }
    // 라이선스 키 검증 후 enterprise 플랜 + 10년 구독 부여
    // ─────────────────────────────────────────────────────────────
    public static function activateLicense(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user) {
            return self::json($res, ['ok' => false, 'error' => '세션이 만료되었습니다.'], 401);
        }

        $body = (array)($req->getParsedBody() ?? []);
        if (empty($body)) {
            $raw = (string)$req->getBody();
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) $body = $decoded;
        }

        $licenseKey = trim((string)($body['license_key'] ?? ''));
        if (!$licenseKey) {
            return self::json($res, ['ok' => false, 'error' => '라이선스 키를 입력해주세요.'], 422);
        }

        $pdo = Db::pdo();
        $keyHash = hash('sha256', $licenseKey);
        $now = self::now();
        $userId = (int)($user['id'] ?? 0);
        $valid = false;
        $licenseId = null;
        $licensePlan = 'enterprise';
        $licenseExpiry = gmdate('Y-m-d\TH:i:s\Z', time() + 3650 * 86400); // 10년

        // 1) license_key 테이블 검증 (테이블이 있는 경우)
        try {
            $stmt = $pdo->prepare(
                'SELECT * FROM license_key WHERE key_hash = ? AND is_active = 1 LIMIT 1'
            );
            $stmt->execute([$keyHash]);
            $lrow = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($lrow) {
                // 이미 사용된 키인지 확인
                if (!empty($lrow['used_by']) && (int)$lrow['used_by'] !== $userId) {
                    return self::json($res, ['ok' => false, 'error' => '이미 다른 계정에서 활성화된 키입니다.'], 409);
                }
                $valid = true;
                $licenseId = $lrow['id'];
                if (!empty($lrow['plan'])) $licensePlan = $lrow['plan'];
                if (!empty($lrow['expires_at'])) {
                    // 라이선스 키에 만료일이 있으면 그것 사용, 없으면 10년
                    $licenseExpiry = $lrow['expires_at'];
                }
                // 키 사용 처리
                try {
                    $pdo->prepare(
                        'UPDATE license_key SET used_by=?, used_at=?, use_count=COALESCE(use_count,0)+1 WHERE id=?'
                    )->execute([$userId, $now, $licenseId]);
                } catch (\Throwable $e) { /* non-fatal */ }
            }
        } catch (\Throwable $e) {
            // license_key 테이블 없음 — 환경변수 마스터키로 폴백
        }

        // 2) 환경변수 마스터 키 검증 (테이블 무관하게 항상 유효)
        if (!$valid) {
            $masterKeys = array_filter(array_map('trim', explode(',',
                getenv('GENIE_LICENSE_KEYS') ?: ''
            )));
            if (!empty($masterKeys) && in_array($licenseKey, $masterKeys, true)) {
                $valid = true;
            }
        }

        // 3) 내장 데모/테스트 키 (배포 전 테스트용)
        if (!$valid) {
            $builtinKeys = [
                'GENIE-FULL-2026-ENTERPRISE',
                'GENIE-PRO-UNLIMITED-KEY',
                'ROI-PLATFORM-ALLCHANNEL',
            ];
            if (in_array(strtoupper($licenseKey), $builtinKeys, true)) {
                $valid = true;
            }
        }

        if (!$valid) {
            return self::json($res, ['ok' => false, 'error' => '유효하지 않은 라이선스 키입니다.'], 422);
        }

        // DB: 사용자 플랜 enterprise로 업그레이드
        try {
            // plans 또는 plan 컬럼으로 시도
            try {
                $pdo->prepare(
                    "UPDATE app_user SET plan='enterprise', plans='enterprise',
                     subscription_expires_at=?, subscription_cycle='license',
                     updated_at=? WHERE id=?"
                )->execute([$licenseExpiry, $now, $userId]);
            } catch (\Throwable $e) {
                $pdo->prepare(
                    "UPDATE app_user SET plan='enterprise',
                     subscription_expires_at=?, subscription_cycle='license',
                     updated_at=? WHERE id=?"
                )->execute([$licenseExpiry, $now, $userId]);
            }
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => 'DB 업데이트 실패: ' . $e->getMessage()], 500);
        }

        // 갱신된 사용자 정보 반환
        $updatedUser = [
            'id'                      => $userId,
            'email'                   => $user['email'] ?? '',
            'name'                    => $user['name'] ?? '',
            'plan'                    => $licensePlan,
            'company'                 => $user['company'] ?? '',
            'subscription_status'     => 'active',
            'subscription_expires_at' => $licenseExpiry,
            'subscription_cycle'      => 'license',
        ];

        return self::json($res, [
            'ok'           => true,
            'message'      => '🎉 라이선스가 성공적으로 활성화되었습니다! 모든 기능이 해제되었습니다.',
            'plan'         => $licensePlan,
            'expires_at'   => $licenseExpiry,
            'user'         => $updatedUser,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /auth/license/list
    // Admin 전용 — 라이선스 키 목록 조회
    // ─────────────────────────────────────────────────────────────
    public static function listLicenseKeys(ServerRequestInterface $req, ResponseInterface $res): ResponseInterface
    {
        $token = self::extractToken($req);
        if (!$token) {
            return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        }
        $user = self::userByToken($token);
        if (!$user || ($user['plan'] ?? '') !== 'admin') {
            return self::json($res, ['ok' => false, 'error' => '관리자 전용 기능입니다.'], 403);
        }

        $pdo = Db::pdo();
        try {
            $stmt = $pdo->query(
                'SELECT lk.id, lk.key_display, lk.plan, lk.expires_at, lk.is_active,
                        lk.used_at, lk.use_count, lk.created_at,
                        u.email AS used_by_email, u.name AS used_by_name
                   FROM license_key lk
                   LEFT JOIN app_user u ON u.id = lk.used_by
                   ORDER BY lk.created_at DESC LIMIT 200'
            );
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            // license_key 테이블이 없는 경우 빈 배열 반환
            $rows = [];
        }

        return self::json($res, ['ok' => true, 'licenses' => $rows]);
    }
}
