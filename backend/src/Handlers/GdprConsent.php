<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * GDPR / PIPA 개인정보 동의 관리
 *
 * Routes:
 *   POST /api/gdpr/consent          — 동의 저장
 *   GET  /api/gdpr/consent          — 내 동의 조회
 *   DELETE /api/gdpr/consent        — 동의 철회
 *   GET  /api/gdpr/stats            — 플랫폼 동의 통계
 */
final class GdprConsent
{
    private static function ensureTables(): void
    {
        // 204차 P1: SQLite 전용 DDL(INTEGER PK AUTOINCREMENT)이 MySQL 주backend 에서 throw → 전 /api/gdpr/* 500.
        //   WhatsApp/CRM/Pixel/Kakao 패턴과 동일하게 드라이버 분기.
        $pdo = Db::pdo();
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS gdpr_consents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(64),
                session_id VARCHAR(64),
                ip VARCHAR(64),
                user_agent TEXT,
                necessary TINYINT DEFAULT 1,
                analytics TINYINT DEFAULT 0,
                marketing TINYINT DEFAULT 0,
                personalization TINYINT DEFAULT 0,
                consented_at VARCHAR(32),
                withdrawn_at VARCHAR(32),
                is_active TINYINT DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS gdpr_consents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                session_id TEXT,
                ip TEXT,
                user_agent TEXT,
                necessary INTEGER DEFAULT 1,
                analytics INTEGER DEFAULT 0,
                marketing INTEGER DEFAULT 0,
                personalization INTEGER DEFAULT 0,
                consented_at TEXT,
                withdrawn_at TEXT,
                is_active INTEGER DEFAULT 1
            )");
        }
    }

    /**
     * [현 차수 P1 보안] 익명 방문자 식별자 = 서버 발급 HMAC 서명 httpOnly 쿠키(gdpr_aid).
     *   과거엔 클라가 보낸 consent_id(body/query/header)를 그대로 session_id 로 신뢰 →
     *   공격자가 피해자의 consent_id 를 추측/탈취하면 타 방문자 동의기록을 비활성화·사칭·조회
     *   가능(무인증 save/get/withdraw). 레거시 폴백 md5(UA+날짜)도 예측 가능.
     *   이제 식별자는 서버가 서명한 쿠키에서만 도출 → 위조 불가(서명키 없이 타인 id 위조 불가).
     *   클라가 보내던 consent_id 는 더 이상 신원으로 신뢰하지 않는다.
     */
    private static function signSecret(): string
    {
        static $s = null;
        if ($s !== null) return $s;
        $env = getenv('GDPR_SIGN_SECRET');
        if (is_string($env) && $env !== '') return $s = $env;
        try {
            $pdo = Db::pdo();
            // Crypto 키와 동일 패턴: app_setting(skey/svalue)에 1회 생성·영속(안정 서명키).
            Db::ensureAppSetting($pdo); // SSOT: 전역 KV 스토어 단일 정의(Db::ensureAppSetting)
            $sel = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey='gdpr_sign_secret' LIMIT 1");
            $sel->execute();
            $v = $sel->fetchColumn();
            if ($v) return $s = (string)$v;
            $gen = base64_encode(random_bytes(32));
            if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $pdo->prepare("INSERT INTO app_setting(skey,svalue,updated_at) VALUES('gdpr_sign_secret',?,?) ON DUPLICATE KEY UPDATE svalue=svalue")->execute([$gen, gmdate('c')]);
            } else {
                $pdo->prepare("INSERT OR IGNORE INTO app_setting(skey,svalue,updated_at) VALUES('gdpr_sign_secret',?,?)")->execute([$gen, gmdate('c')]);
            }
            $sel->execute();
            return $s = (string)($sel->fetchColumn() ?: $gen);
        } catch (\Throwable $e) {
            return $s = 'gdpr-' . (getenv('GENIE_DB_NAME') ?: 'geniego_roi');
        }
    }

    private static function sign(string $id): string
    {
        return hash_hmac('sha256', $id, self::signSecret());
    }

    /**
     * 서명 쿠키(gdpr_aid="id.hmac")에서 익명 식별자 도출. 없거나 서명 불일치면 새 id 발급 +
     * 쿠키 set(httpOnly·SameSite=Lax·Secure). 응답이 바뀌므로 [id, Response] 튜플 반환.
     */
    private static function anonId(Request $req, Response $res): array
    {
        $cookie = (string)($req->getCookieParams()['gdpr_aid'] ?? '');
        if ($cookie !== '' && strpos($cookie, '.') !== false) {
            [$id, $sig] = explode('.', $cookie, 2);
            $id = (string)preg_replace('/[^a-f0-9]/', '', $id);
            if ($id !== '' && hash_equals(self::sign($id), $sig)) {
                return [$id, $res]; // 검증된 기존 식별자
            }
        }
        // 신규 발급(위조 불가 — 서버 서명)
        $id  = bin2hex(random_bytes(16));
        $val = $id . '.' . self::sign($id);
        $https = ($req->getUri()->getScheme() === 'https') || strtolower($req->getHeaderLine('X-Forwarded-Proto')) === 'https';
        $set = 'gdpr_aid=' . $val . '; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax' . ($https ? '; Secure' : '');
        return [$id, $res->withAddedHeader('Set-Cookie', $set)];
    }

    /** 인증 세션 토큰 → user_id(없거나 만료/데모면 null). */
    private static function authUserId(Request $req, PDO $pdo): ?string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m) && $m[1] !== 'demo-token' && !str_starts_with($m[1], 'demo')) {
            try {
                $s = $pdo->prepare('SELECT user_id FROM user_session WHERE token = ? AND expires_at>? LIMIT 1');
                $s->execute([UserAuth::hashToken($m[1]), gmdate('Y-m-d\TH:i:s\Z')]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                return $r ? (string)$r['user_id'] : null;
            } catch (\Throwable) {}
        }
        return null;
    }

    // POST /api/gdpr/consent
    public static function save(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo  = Db::pdo();
        $body = (array)($req->getParsedBody() ?? []);
        $now  = gmdate('c');
        $consents = (array)($body['consents'] ?? []);

        $userId = self::authUserId($req, $pdo);
        [$anon, $res] = self::anonId($req, $res);

        // [현 차수 P1] 기존 동의 비활성화 — 인증=user_id 스코프, 익명=서명쿠키 스코프(타 방문자·
        //   타 계정 행 미접근). 과거 'session_id=? OR user_id=?' 는 위조 session_id 로 교차 비활성화 가능했다.
        if ($userId !== null) {
            $pdo->prepare("UPDATE gdpr_consents SET is_active=0 WHERE user_id=?")->execute([$userId]);
        } else {
            $pdo->prepare("UPDATE gdpr_consents SET is_active=0 WHERE session_id=? AND (user_id IS NULL OR user_id='')")->execute([$anon]);
        }

        $pdo->prepare("INSERT INTO gdpr_consents(user_id,session_id,ip,user_agent,necessary,analytics,marketing,personalization,consented_at,is_active) VALUES(?,?,?,?,?,?,?,?,?,1)")
            ->execute([
                $userId, $anon,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $req->getHeaderLine('User-Agent'),
                1,
                (int)($consents['analytics'] ?? false),
                (int)($consents['marketing'] ?? false),
                (int)($consents['personalization'] ?? false),
                $now,
            ]);

        return TemplateResponder::respond($res, ['ok' => true, 'consented_at' => $now]);
    }

    // GET /api/gdpr/consent
    public static function get(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = Db::pdo();
        $userId = self::authUserId($req, $pdo);
        [$anon, $res] = self::anonId($req, $res);

        if ($userId !== null) {
            $stmt = $pdo->prepare("SELECT * FROM gdpr_consents WHERE user_id=? AND is_active=1 ORDER BY consented_at DESC LIMIT 1");
            $stmt->execute([$userId]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM gdpr_consents WHERE session_id=? AND (user_id IS NULL OR user_id='') AND is_active=1 ORDER BY consented_at DESC LIMIT 1");
            $stmt->execute([$anon]);
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return TemplateResponder::respond($res, ['ok' => true, 'consent' => $row ?: null]);
    }

    // DELETE /api/gdpr/consent
    public static function withdraw(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo = Db::pdo();
        $now = gmdate('c');
        $userId = self::authUserId($req, $pdo);
        [$anon, $res] = self::anonId($req, $res);

        if ($userId !== null) {
            $pdo->prepare("UPDATE gdpr_consents SET is_active=0, withdrawn_at=? WHERE user_id=? AND is_active=1")->execute([$now, $userId]);
        } else {
            $pdo->prepare("UPDATE gdpr_consents SET is_active=0, withdrawn_at=? WHERE session_id=? AND (user_id IS NULL OR user_id='') AND is_active=1")->execute([$now, $anon]);
        }

        return TemplateResponder::respond($res, ['ok' => true, 'withdrawn_at' => $now]);
    }

    // GET /api/gdpr/stats
    public static function stats(Request $req, Response $res, array $args): Response
    {
        // 212차 #6(P2): 플랫폼 전체 동의 집계는 admin 전용. /gdpr/* 는 동의배너용 public bypass 라
        //   라우트 미들웨어 인증이 없으므로 핸들러에서 직접 세션 admin 게이트(GdprAdmin 만 호출, 토큰 전송).
        if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
        self::ensureTables();
        $pdo = Db::pdo();

        // 209차 P2: 가짜 폴백(?: 3842 등) 제거 — COUNT(*)는 빈 테이블서 '0'(falsy)을 반환해
        //   `?:`가 오히려 날조 통계를 노출하던 운영 오염. 실집계만(빈=0).
        $total     = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=1")->fetchColumn();
        $analytics = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=1 AND analytics=1")->fetchColumn();
        $marketing = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=1 AND marketing=1")->fetchColumn();
        $withdrawn = (int)$pdo->query("SELECT COUNT(*) FROM gdpr_consents WHERE is_active=0 AND withdrawn_at IS NOT NULL")->fetchColumn();

        return TemplateResponder::respond($res, [
            'ok' => true,
            'stats' => [
                'total'             => $total,
                'opted_in'          => $total,
                'analytics'         => $analytics,
                'marketing'         => $marketing,
                'withdrawn'         => $withdrawn,
                'analytics_rate'    => $total > 0 ? round($analytics/$total*100, 1) : 0,
                'marketing_rate'    => $total > 0 ? round($marketing/$total*100, 1) : 0,
            ],
        ]);
    }
}
