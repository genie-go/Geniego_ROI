<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * Referral — [282차 R3 신규] 구독플랜 추천인 제도.
 *
 * 정책(사용자 지시):
 *  - 신규 회원이 "이미 구독플랜 회원(유료 티어·활성 구독)"인 기업/개인의 추천코드로 **구독플랜 가입**을 하면,
 *    추천인에게 **1개월 PRO 무료쿠폰을 자동 지급**한다. 쿠폰은 **추천일로부터 1년간 유효**하다.
 *  - **절대 중복 금지**: 피추천자(referred) 1명당 정확히 1회만 보상(referral_signup.referred_user_id UNIQUE + 멱등).
 *
 * 중복구현 회피: 쿠폰 발급/사용은 기존 SSOT(free_coupons + CouponRedeem)를 그대로 재사용한다.
 *   본 클래스는 (1) 추천코드 발급/조회 (2) 가입 시 추천 기록 (3) 보상쿠폰 자동발급 트리거만 담당한다.
 *
 * Endpoints:
 *  - GET /auth/referral/my-code   : 현재 로그인 사용자(구독회원)의 추천코드 조회/발급
 *  - GET /auth/referral/stats     : 내 추천 실적(추천 가입 수·발급 보상 수)
 *  - POST /auth/referral/validate : 추천코드 유효성 미리보기(가입 폼용, 공개)
 */
final class Referral
{
    private const PAID_TIERS = ['starter', 'growth', 'pro', 'enterprise'];
    private const REWARD_PLAN = 'pro';
    private const REWARD_DAYS = 30;       // 1개월 PRO(부여 구독 길이)
    private const VALID_DAYS  = 365;      // 추천일로부터 1년 유효(사용 마감)
    private const RETAIN_DAYS = 30;       // 먹튀방지: 피추천 회원 1개월 유지 후 잠금해제(usable_from)

    public static function ensureTables(\PDO $pdo): void
    {
        static $done = [];
        $oid = spl_object_id($pdo);
        if (isset($done[$oid])) return;
        try {
            $isMy = ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql');
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS referral_code (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
                    code VARCHAR(32) NOT NULL UNIQUE,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_ref_code(code)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                $pdo->exec("CREATE TABLE IF NOT EXISTS referral_signup (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    referred_user_id BIGINT UNSIGNED NOT NULL UNIQUE,
                    referred_email VARCHAR(255) NULL,
                    referrer_user_id BIGINT UNSIGNED NOT NULL,
                    code VARCHAR(32) NOT NULL,
                    reward_coupon_id BIGINT UNSIGNED NULL,
                    reward_status VARCHAR(24) NOT NULL DEFAULT 'granted',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_referrer(referrer_user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS referral_code (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
                    code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
                $pdo->exec("CREATE TABLE IF NOT EXISTS referral_signup (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, referred_user_id INTEGER NOT NULL UNIQUE,
                    referred_email TEXT NULL, referrer_user_id INTEGER NOT NULL, code TEXT NOT NULL,
                    reward_coupon_id INTEGER NULL, reward_status TEXT NOT NULL DEFAULT 'granted',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')))");
            }
            $done[$oid] = true;
        } catch (\Throwable $e) { error_log('[Referral.ensureTables] ' . $e->getMessage()); }
    }

    /** 사용자가 "구독플랜 회원"(추천 자격)인지 — 유료 티어 + 활성 구독 + 무료데모 체험이 아님. */
    private static function isSubscriber(array $u): bool
    {
        $plan = strtolower((string)($u['plan'] ?? ''));
        if (!in_array($plan, self::PAID_TIERS, true)) return false;
        // 활성 구독: 만료일 없음(enterprise/무기한) 또는 미래.
        $exp = (string)($u['subscription_expires_at'] ?? '');
        if ($exp !== '' && strtotime($exp) <= time()) return false;
        // 무료 데모 자동-PRO 체험(결제 안 함)은 "구독회원" 아님 → 추천 자격 제외.
        $extra = json_decode((string)($u['extra_data'] ?? '{}'), true) ?: [];
        if (($extra['trial_source'] ?? '') === 'free_demo_pro' && ($extra['pending_plan'] ?? '') === 'free') return false;
        return true;
    }

    private static function loadUser(\PDO $pdo, int $userId): ?array
    {
        $st = $pdo->prepare('SELECT id, email, plan, company, subscription_expires_at, extra_data FROM app_user WHERE id=? LIMIT 1');
        $st->execute([$userId]);
        return $st->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    private static function genCode(\PDO $pdo): string
    {
        // 사람이 옮겨적기 쉬운 코드(혼동문자 제외). 충돌 시 재시도.
        $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        for ($try = 0; $try < 8; $try++) {
            $c = 'REF-';
            for ($i = 0; $i < 8; $i++) $c .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            $chk = $pdo->prepare('SELECT 1 FROM referral_code WHERE code=? LIMIT 1');
            $chk->execute([$c]);
            if (!$chk->fetchColumn()) return $c;
        }
        return 'REF-' . strtoupper(bin2hex(random_bytes(4)));
    }

    /** 사용자의 추천코드 조회(없으면 발급). 구독회원만 발급 가능. */
    private static function codeForUser(\PDO $pdo, int $userId): ?string
    {
        $st = $pdo->prepare('SELECT code FROM referral_code WHERE user_id=? LIMIT 1');
        $st->execute([$userId]);
        $existing = $st->fetchColumn();
        if ($existing) return (string)$existing;
        $code = self::genCode($pdo);
        try {
            $pdo->prepare('INSERT INTO referral_code(user_id, code, created_at) VALUES(?,?,?)')
                ->execute([$userId, $code, gmdate('Y-m-d H:i:s')]);
            return $code;
        } catch (\Throwable $e) {
            // 동시성: 이미 생성됐으면 재조회.
            $st->execute([$userId]);
            $again = $st->fetchColumn();
            return $again ? (string)$again : null;
        }
    }

    /** Bearer 토큰 → user_id (/auth/* 는 api_key 미들웨어 bypass 라 attribute 미설정 → 직접 해석). */
    private static function resolveUserId(Request $req): int
    {
        $uid = (int)($req->getAttribute('auth_user_id') ?? 0);
        if ($uid > 0) return $uid;
        $auth = $req->getHeaderLine('Authorization');
        if (!preg_match('/Bearer\s+([a-f0-9]{64})/i', $auth, $m)) return 0;
        try {
            $pdo = Db::pdo();
            $st = $pdo->prepare('SELECT user_id, expires_at FROM user_session WHERE token=? LIMIT 1');
            $st->execute([$m[1]]);
            $row = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return 0;
            $exp = (string)($row['expires_at'] ?? '');
            if ($exp !== '' && strtotime($exp) <= time()) return 0;
            return (int)$row['user_id'];
        } catch (\Throwable $e) { return 0; }
    }

    // ── GET /auth/referral/my-code ───────────────────────────────────────────
    public static function myCode(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $userId = self::resolveUserId($req);
        $u = $userId > 0 ? self::loadUser($pdo, $userId) : null;
        if (!$u) return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        if (!self::isSubscriber($u)) {
            return self::json($res, ['ok' => false, 'eligible' => false,
                'message' => '추천코드는 구독플랜(유료) 회원만 발급됩니다. 플랜 구독 후 이용해 주세요.'], 200);
        }
        $code = self::codeForUser($pdo, $userId);
        if (!$code) return self::json($res, ['ok' => false, 'error' => 'code_issue_failed'], 500);
        return self::json($res, ['ok' => true, 'eligible' => true, 'code' => $code,
            'reward' => ['plan' => self::REWARD_PLAN, 'days' => self::REWARD_DAYS, 'valid_days' => self::VALID_DAYS]]);
    }

    // ── GET /auth/referral/stats ─────────────────────────────────────────────
    public static function stats(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $userId = self::resolveUserId($req);
        if ($userId <= 0) return self::json($res, ['ok' => false, 'error' => 'unauthorized'], 401);
        $cnt = $pdo->prepare('SELECT COUNT(*) FROM referral_signup WHERE referrer_user_id=?');
        $cnt->execute([$userId]);
        $rewarded = $pdo->prepare("SELECT COUNT(*) FROM referral_signup WHERE referrer_user_id=? AND reward_coupon_id IS NOT NULL");
        $rewarded->execute([$userId]);
        return self::json($res, ['ok' => true,
            'referred_count' => (int)$cnt->fetchColumn(),
            'rewarded_count' => (int)$rewarded->fetchColumn()]);
    }

    // ── POST /auth/referral/validate (공개, 가입폼 미리보기) ──────────────────
    public static function validate(Request $req, Response $res): Response
    {
        $pdo = Db::pdo(); self::ensureTables($pdo);
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        $code = self::normCode((string)($b['code'] ?? ''));
        if ($code === '') return self::json($res, ['ok' => false, 'valid' => false, 'reason' => 'empty']);
        $ref = self::resolveReferrer($pdo, $code);
        if (!$ref) return self::json($res, ['ok' => true, 'valid' => false, 'reason' => 'not_found',
            'message' => '유효하지 않은 추천코드입니다.']);
        // 회사명만 마스킹 노출(개인정보 최소화).
        $company = (string)($ref['company'] ?? '');
        return self::json($res, ['ok' => true, 'valid' => true,
            'referrer_company' => $company !== '' ? $company : '구독회원',
            'message' => '추천코드가 확인되었습니다. 구독플랜 가입 시 추천인에게 1개월 PRO 혜택이 지급됩니다.']);
    }

    private static function normCode(string $raw): string
    {
        $c = strtoupper(trim($raw));
        return preg_match('/^[A-Z0-9\-]{4,32}$/', $c) ? $c : '';
    }

    /** 추천코드 → 추천인 user 행(구독회원 자격 포함). 무효/비구독이면 null. */
    private static function resolveReferrer(\PDO $pdo, string $code): ?array
    {
        $st = $pdo->prepare('SELECT user_id FROM referral_code WHERE code=? LIMIT 1');
        $st->execute([$code]);
        $uid = (int)($st->fetchColumn() ?: 0);
        if ($uid <= 0) return null;
        $u = self::loadUser($pdo, $uid);
        if (!$u || !self::isSubscriber($u)) return null;
        return $u;
    }

    /**
     * [핵심] 가입 완료 후 호출 — 추천코드가 있으면 검증 후 추천 기록 + 보상쿠폰 자동발급.
     * register() 가 유료 구독가입(isPaidSignup) 성공 직후 호출한다. 비치명(예외 삼킴·가입 흐름 보호).
     *
     * @return array{applied:bool, reason?:string, reward_coupon?:string}
     */
    public static function applyOnSignup(\PDO $pdo, int $referredUserId, string $referredEmail, string $rawCode, bool $isPaidSignup): array
    {
        try {
            $code = self::normCode($rawCode);
            if ($code === '') return ['applied' => false, 'reason' => 'no_code'];
            self::ensureTables($pdo);
            // 정책: 신규 가입이 "구독플랜 가입"일 때만 보상(무료가입은 대상 아님).
            if (!$isPaidSignup) return ['applied' => false, 'reason' => 'not_paid_signup'];
            $ref = self::resolveReferrer($pdo, $code);
            if (!$ref) return ['applied' => false, 'reason' => 'invalid_or_non_subscriber'];
            $referrerId = (int)$ref['id'];
            // 자기추천 금지.
            if ($referrerId === $referredUserId) return ['applied' => false, 'reason' => 'self_referral'];

            // ★절대 중복 금지 — referred_user_id UNIQUE 선점(INSERT 실패 = 이미 처리됨).
            try {
                $pdo->prepare('INSERT INTO referral_signup(referred_user_id, referred_email, referrer_user_id, code, reward_status, created_at) VALUES(?,?,?,?,?,?)')
                    ->execute([$referredUserId, $referredEmail !== '' ? $referredEmail : null, $referrerId, $code, 'granted', gmdate('Y-m-d H:i:s')]);
            } catch (\Throwable $dup) {
                return ['applied' => false, 'reason' => 'already_rewarded']; // UNIQUE 위반 = 중복 차단
            }
            $signupId = (int)$pdo->lastInsertId();

            // 보상쿠폰 자동발급 — 기존 free_coupons SSOT 재사용(1개월 PRO·1년 유효·추천인 지정).
            Db::ensureCouponTables($pdo);
            $couponCode = self::genRewardCouponCode($pdo);
            $now = time();
            $validUntil = gmdate('Y-m-d H:i:s', $now + self::VALID_DAYS * 86400);       // 추천일+1년: 사용 마감
            // ★먹튀방지: 피추천 회원이 1개월(=RETAIN_DAYS) 무료사용 후에도 유지될 때만 사용 가능.
            //   발급 즉시는 잠금(usable_from=가입+30일). 30일 경과 시점에 피추천이 여전히 활성구독이면 리딤 가능해진다
            //   (CouponRedeem 이 usable_from + 피추천 활성 여부를 이중 검증 → 1개월만 쓰고 탈퇴하면 영구 잠금).
            $usableFrom = gmdate('Y-m-d H:i:s', $now + self::RETAIN_DAYS * 86400);
            $note = '[referral] referred_user_id=' . $referredUserId . ' email=' . ($referredEmail ?: '-');
            $couponId = 0;
            try {
                $pdo->prepare(
                    'INSERT INTO free_coupons(code, plan, duration_days, max_uses, use_count, issued_to_user_id, issued_by, note, is_revoked, valid_until, usable_from, created_at)
                     VALUES(?,?,?,?,0,?,0,?,0,?,?,?)'
                )->execute([$couponCode, self::REWARD_PLAN, self::REWARD_DAYS, 1, $referrerId, $note, $validUntil, $usableFrom, gmdate('Y-m-d H:i:s')]);
                $couponId = (int)$pdo->lastInsertId();
            } catch (\Throwable $e) {
                error_log('[Referral.applyOnSignup coupon] ' . $e->getMessage());
                return ['applied' => true, 'reason' => 'signup_recorded_coupon_failed'];
            }
            // 발급 쿠폰 id 연결.
            try { $pdo->prepare('UPDATE referral_signup SET reward_coupon_id=? WHERE id=?')->execute([$couponId, $signupId]); } catch (\Throwable $e) {}

            // 추천인에게 알림(비치명).
            try {
                \Genie\Handlers\Alerting::pushEvent('acct_' . $referrerId, 'low', '🎁 추천 보상 지급',
                    '추천하신 회원이 구독플랜에 가입했습니다. 1개월 PRO 무료쿠폰(1년 유효)이 지급되었습니다: ' . $couponCode);
            } catch (\Throwable $e) {}

            return ['applied' => true, 'reward_coupon' => $couponCode, 'referrer_user_id' => $referrerId];
        } catch (\Throwable $e) {
            error_log('[Referral.applyOnSignup] ' . $e->getMessage());
            return ['applied' => false, 'reason' => 'error'];
        }
    }

    /**
     * [먹튀방지 게이트] 추천 보상쿠폰인지 판별 + 피추천 회원 유지 여부.
     *   반환: null = 추천 보상쿠폰 아님(일반 쿠폰). true = 피추천 회원이 여전히 활성 구독(사용 가능).
     *   false = 피추천 회원이 탈퇴/구독만료(1개월만 쓰고 이탈) → 보상 잠금 유지.
     *   CouponRedeem 이 usable_from(30일 잠금)과 함께 이중검증한다.
     */
    public static function referredRetained(\PDO $pdo, int $couponId): ?bool
    {
        try {
            self::ensureTables($pdo);
            $st = $pdo->prepare('SELECT referred_user_id FROM referral_signup WHERE reward_coupon_id=? LIMIT 1');
            $st->execute([$couponId]);
            $refUid = (int)($st->fetchColumn() ?: 0);
            if ($refUid <= 0) return null; // 추천 보상쿠폰 아님
            $u = self::loadUser($pdo, $refUid);
            if (!$u) return false;
            // 피추천 회원이 "계속 유지" = 여전히 활성 구독회원(유료티어·미만료·비-무료데모).
            return self::isSubscriber($u);
        } catch (\Throwable $e) { error_log('[Referral.referredRetained] ' . $e->getMessage()); return null; }
    }

    private static function genRewardCouponCode(\PDO $pdo): string
    {
        for ($try = 0; $try < 8; $try++) {
            $c = 'GENIE-REF-' . strtoupper(bin2hex(random_bytes(4)));
            $chk = $pdo->prepare('SELECT 1 FROM free_coupons WHERE code=? LIMIT 1');
            $chk->execute([$c]);
            if (!$chk->fetchColumn()) return $c;
        }
        return 'GENIE-REF-' . strtoupper(bin2hex(random_bytes(6)));
    }

    private static function json(Response $res, array $body, int $code = 200): Response
    {
        $res->getBody()->write(json_encode($body, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($code)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }
}
